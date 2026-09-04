// Weapon trail: a Catmull-Rom smoothed ribbon between two points (hilt/tip) sampled each frame; additive, fades by age.
import * as THREE from 'three';
import { FX_LAYER } from './common.ts';

const MAX_SAMPLES = 24, SUBDIV = 4;

export class WeaponTrail {
  mesh: THREE.Mesh;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array; private uvs: Float32Array;
  private hilts: THREE.Vector3[] = []; private tips: THREE.Vector3[] = [];
  private mat: THREE.ShaderMaterial;
  active = false; fade = 1;
  private segs = (MAX_SAMPLES - 1) * SUBDIV + 1;
  constructor(color: THREE.ColorRepresentation, intensity = 2.6) {
    const n = this.segs;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); this.uvs = new Float32Array(n * 2 * 2);
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    this.geo.setIndex(idx);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uFade: { value: 1 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uIntensity; uniform float uFade; varying vec2 vUv;
        void main(){
          float age = vUv.x;                      // 0 = newest
          float along = pow(1.0 - age, 1.6);
          float edge = pow(sin(vUv.y * 3.14159), 0.55);
          float core = pow(max(0.0, 1.0 - abs(vUv.y - 0.5) * 2.6), 2.0);
          vec3 col = mix(uColor, vec3(1.0), core * 0.7 + 0.15) * uIntensity;
          float a = along * edge * uFade;
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.frustumCulled = false; this.mesh.layers.set(FX_LAYER); this.mesh.renderOrder = 8; this.mesh.visible = false;
    this.mesh.matrixAutoUpdate = false;
  }
  begin() { this.hilts.length = 0; this.tips.length = 0; this.active = true; this.fade = 1; this.mesh.visible = true; }
  end() { this.active = false; }
  push(hilt: THREE.Vector3, tip: THREE.Vector3) {
    this.hilts.unshift(hilt.clone()); this.tips.unshift(tip.clone());
    if (this.hilts.length > MAX_SAMPLES) { this.hilts.pop(); this.tips.pop(); }
    this.rebuild();
  }
  private cr(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3) {
    const t2 = t * t, t3 = t2 * t;
    out.x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
    out.y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
    out.z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
    return out;
  }
  private rebuild() {
    const n = this.hilts.length; if (n < 2) { this.geo.setDrawRange(0, 0); return; }
    const h = this.hilts, tp = this.tips; const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
    let v = 0; const total = (n - 1) * SUBDIV + 1;
    for (let i = 0; i < n - 1; i++) {
      const i0 = Math.max(0, i - 1), i1 = i, i2 = i + 1, i3 = Math.min(n - 1, i + 2);
      const steps = i === n - 2 ? SUBDIV + 1 : SUBDIV;
      for (let s = 0; s < steps; s++) {
        const t = s / SUBDIV;
        this.cr(h[i0], h[i1], h[i2], h[i3], t, tmpA); this.cr(tp[i0], tp[i1], tp[i2], tp[i3], t, tmpB);
        const age = (i + t) / (n - 1);
        this.pos[v * 6] = tmpA.x; this.pos[v * 6 + 1] = tmpA.y; this.pos[v * 6 + 2] = tmpA.z;
        this.pos[v * 6 + 3] = tmpB.x; this.pos[v * 6 + 4] = tmpB.y; this.pos[v * 6 + 5] = tmpB.z;
        this.uvs[v * 4] = age; this.uvs[v * 4 + 1] = 0; this.uvs[v * 4 + 2] = age; this.uvs[v * 4 + 3] = 1;
        v++;
      }
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true; (this.geo.attributes.uv as THREE.BufferAttribute).needsUpdate = true;
    this.geo.setDrawRange(0, (Math.min(v, total) - 1) * 6);
  }
  /** Returns false when fully faded (safe to hide). */
  update(dt: number) {
    if (!this.active) { this.fade = Math.max(0, this.fade - dt * 7); this.mat.uniforms.uFade.value = this.fade; if (this.fade <= 0) { this.mesh.visible = false; return false; } }
    return true;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}
