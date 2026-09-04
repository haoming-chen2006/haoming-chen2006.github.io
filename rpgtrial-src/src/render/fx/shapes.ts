// Small mesh-based effect primitives (billboard sprites, ground rings, light columns, auras) on FX_LAYER.
import * as THREE from 'three';
import { FX_LAYER, hashNoiseGLSL } from './common.ts';
import { cellTexture, SPRITE } from './textures.ts';

export function makeSprite(cell: number, color: THREE.ColorRepresentation, size = 1, intensity = 2, blend: 'add' | 'alpha' = 'add'): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: cellTexture(cell), color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, depthTest: true, blending: blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false, toneMapped: false });
  const s = new THREE.Sprite(mat); s.scale.setScalar(size); s.layers.set(FX_LAYER); s.renderOrder = 6; return s;
}

/** Flat ring on the ground that expands and fades (shockwaves, heal rings, level-up). */
export class GroundRing {
  mesh: THREE.Mesh; age = 0;
  constructor(color: THREE.ColorRepresentation, public r0: number, public r1: number, public life: number, public intensity = 2.5, cell: number = SPRITE.ring) {
    const mat = new THREE.MeshBasicMaterial({ map: cellTexture(cell), color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); this.mesh.rotation.x = -Math.PI / 2; this.mesh.layers.set(FX_LAYER); this.mesh.renderOrder = 5;
  }
  /** returns false when finished */
  update(dt: number) {
    this.age += dt; const t = Math.min(1, this.age / this.life); const e = 1 - Math.pow(1 - t, 2.2);
    const r = this.r0 + (this.r1 - this.r0) * e; this.mesh.scale.setScalar(r);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - t, 1.3);
    return t < 1;
  }
  dispose() { this.mesh.parent?.remove(this.mesh); this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}

/** Vertical column of light (Sacred Flame, level-up). Open cylinder, additive, scrolling noise, fades at the top. */
export class LightColumn {
  mesh: THREE.Mesh; age = 0; mat: THREE.ShaderMaterial;
  constructor(color: THREE.ColorRepresentation, public radius: number, public height: number, public life: number, intensity = 2.2) {
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uT: { value: 0 }, uTime: { value: 0 }, uIntensity: { value: intensity } },
      vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uT; uniform float uTime; uniform float uIntensity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        ${hashNoiseGLSL}
        void main(){
          float rim = pow(abs(dot(normalize(vN), normalize(vV))), 1.2);
          float n = hm_noise(vec3(vUv.x * 6.0, vUv.y * 3.0 - uTime * 1.5, uTime * 0.3));
          float body = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
          float grow = smoothstep(0.0, 0.25, uT) * (1.0 - smoothstep(0.55, 1.0, uT));
          float a = body * rim * (0.55 + 0.6 * n) * grow;
          gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35 * n) * uIntensity, a);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, height, 24, 1, true), this.mat);
    this.mesh.position.y = height / 2; this.mesh.layers.set(FX_LAYER); this.mesh.renderOrder = 6; this.mesh.frustumCulled = false;
  }
  update(dt: number, time: number) { this.age += dt; const t = Math.min(1, this.age / this.life); this.mat.uniforms.uT.value = t; this.mat.uniforms.uTime.value = time; return t < 1; }
  dispose() { this.mesh.parent?.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}

/** Persistent glowing aura around a character (Rage). Two counter-rotating sprites + a soft light. */
export class Aura {
  group = new THREE.Group(); private a: THREE.Sprite; private b: THREE.Sprite; light: THREE.PointLight; age = 0; alive = true; fade = 0;
  constructor(color: THREE.ColorRepresentation, public size = 1.6, intensity = 1.6) {
    this.a = makeSprite(SPRITE.glow, color, size, intensity * 0.55); this.b = makeSprite(SPRITE.circle, color, size * 1.15, intensity);
    this.b.material.rotation = 0; this.group.add(this.a, this.b);
    this.light = new THREE.PointLight(color, 6, 6, 2); this.group.add(this.light);
  }
  update(dt: number) {
    this.age += dt; this.fade += ((this.alive ? 1 : 0) - this.fade) * Math.min(1, dt * 5);
    const pulse = 0.85 + 0.15 * Math.sin(this.age * 7);
    this.a.scale.setScalar(this.size * pulse * this.fade); this.b.scale.setScalar(this.size * 1.15 * (1.1 - 0.1 * pulse) * this.fade);
    this.b.material.rotation = this.age * 1.4; this.light.intensity = 6 * pulse * this.fade;
    return this.alive || this.fade > 0.02;
  }
  dispose() { this.group.parent?.remove(this.group); this.a.material.dispose(); this.b.material.dispose(); }
}
