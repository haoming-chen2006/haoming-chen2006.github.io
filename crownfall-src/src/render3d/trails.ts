import * as THREE from 'three';

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpSide = new THREE.Vector3(), tmpToCam = new THREE.Vector3();

/** Camera-facing ribbon trail built from a short history of positions. */
export class Trail {
  readonly mesh: THREE.Mesh;
  private readonly n: number;
  private pts: Float32Array;
  private count = 0;
  private verts: Float32Array;
  private alphas: Float32Array;
  private geo: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;
  width: number;
  fade = 1;

  constructor(n = 10, width = 0.15, color: THREE.Color | number = 0xffffff, additive = true) {
    this.n = n;
    this.width = width;
    this.pts = new Float32Array(n * 3);
    this.verts = new Float32Array(n * 2 * 3);
    this.alphas = new Float32Array(n * 2);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.verts, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    this.geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, fade: { value: 1 } },
      vertexShader: `attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 color; uniform float fade; varying float vA; void main(){ gl_FragColor = vec4(color, vA * fade); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 15;
    this.mesh.visible = false;
  }

  setColor(c: THREE.Color | number): void { (this.mat.uniforms.color.value as THREE.Color).set(c); }

  reset(): void { this.count = 0; this.mesh.visible = false; this.fade = 1; }

  /** Push a new head position. */
  push(x: number, y: number, z: number): void {
    const n = this.n;
    if (this.count > 0) {
      const dx = x - this.pts[0], dy = y - this.pts[1], dz = z - this.pts[2];
      if (dx * dx + dy * dy + dz * dz < 1e-6) return;
    }
    // shift history back by one
    for (let i = Math.min(this.count, n - 1); i > 0; i--) {
      this.pts[i * 3] = this.pts[(i - 1) * 3]; this.pts[i * 3 + 1] = this.pts[(i - 1) * 3 + 1]; this.pts[i * 3 + 2] = this.pts[(i - 1) * 3 + 2];
    }
    this.pts[0] = x; this.pts[1] = y; this.pts[2] = z;
    this.count = Math.min(n, this.count + 1);
  }

  /** Rebuild the strip so it faces the camera. */
  update(camPos: THREE.Vector3): void {
    const n = this.n, c = this.count;
    if (c < 2) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    this.mat.uniforms.fade.value = this.fade;
    for (let i = 0; i < n; i++) {
      const ii = Math.min(i, c - 1);
      const px = this.pts[ii * 3], py = this.pts[ii * 3 + 1], pz = this.pts[ii * 3 + 2];
      const prev = Math.max(0, ii - 1), next = Math.min(c - 1, ii + 1);
      tmpA.set(this.pts[next * 3] - this.pts[prev * 3], this.pts[next * 3 + 1] - this.pts[prev * 3 + 1], this.pts[next * 3 + 2] - this.pts[prev * 3 + 2]);
      if (tmpA.lengthSq() < 1e-8) tmpA.set(0, 0, 1);
      tmpToCam.set(camPos.x - px, camPos.y - py, camPos.z - pz);
      tmpSide.crossVectors(tmpA, tmpToCam);
      if (tmpSide.lengthSq() < 1e-8) tmpSide.set(1, 0, 0);
      tmpSide.normalize();
      const k = 1 - ii / Math.max(1, c - 1);
      const w = this.width * (0.25 + 0.75 * k);
      tmpB.copy(tmpSide).multiplyScalar(w);
      const o = i * 6;
      this.verts[o] = px + tmpB.x; this.verts[o + 1] = py + tmpB.y; this.verts[o + 2] = pz + tmpB.z;
      this.verts[o + 3] = px - tmpB.x; this.verts[o + 4] = py - tmpB.y; this.verts[o + 5] = pz - tmpB.z;
      const a = i < c ? k * k : 0;
      this.alphas[i * 2] = a; this.alphas[i * 2 + 1] = a;
    }
    (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('alpha') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void { this.geo.dispose(); this.mat.dispose(); }
}

/** Simple pool so trails are reused between projectiles. */
export class TrailPool {
  private free: Trail[] = [];
  private scene: THREE.Scene;
  constructor(scene: THREE.Scene) { this.scene = scene; }
  get(n: number, width: number, color: THREE.Color | number, additive = true): Trail {
    let t = this.free.pop();
    if (!t) { t = new Trail(n, width, color, additive); this.scene.add(t.mesh); }
    t.width = width;
    t.setColor(color);
    (t.mesh.material as THREE.ShaderMaterial).blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    t.reset();
    return t;
  }
  release(t: Trail): void { t.reset(); if (this.free.length < 96) this.free.push(t); else { this.scene.remove(t.mesh); t.dispose(); } }
}
