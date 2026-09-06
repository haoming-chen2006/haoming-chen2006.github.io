// env-dressing: shared toolkit for hand-placed set dressing — PBR materials, a pooled point-light
// system with flicker, model spawning, and procedural builders (ruin walls, arches, coffins, flames...).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assets } from './assets.ts';
import { terrainHeight } from '../sim/terrain.ts';
import { detectQuality } from './quality.ts';

// ---------------------------------------------------------------- rng (cosmetic only)
export class Rand {
  constructor(public s = 1) {}
  next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; }
  range(a: number, b: number) { return a + (b - a) * this.next(); }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
}
export const groundY = (x: number, z: number) => terrainHeight(x, z);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- PBR materials
export interface PBROpts { color?: number; roughness?: number; metalness?: number; normalScale?: number; envMapIntensity?: number; aoIntensity?: number; side?: THREE.Side; tint?: THREE.Color }
const matCache = new Map<string, Promise<THREE.MeshStandardMaterial>>();
/** Poly Haven texture set at textures/<id>/<id>_{diff,nor_gl,arm}_1k.jpg. Geometry supplies metre-scaled UVs. */
export function pbrMaterial(id: string, opts: PBROpts = {}): Promise<THREE.MeshStandardMaterial> {
  const key = id + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, (async () => {
    const [map, nor, arm] = await Promise.all([
      assets.texture(`textures/${id}/${id}_diff_1k.jpg`, { srgb: true, aniso: 8 }),
      assets.texture(`textures/${id}/${id}_nor_gl_1k.jpg`, { aniso: 8 }),
      assets.texture(`textures/${id}/${id}_arm_1k.jpg`, { aniso: 8 }),
    ]);
    const m = new THREE.MeshStandardMaterial({
      map, normalMap: nor, roughnessMap: arm, metalnessMap: arm, aoMap: arm, aoMapIntensity: opts.aoIntensity ?? 1,
      roughness: opts.roughness ?? 1, metalness: opts.metalness ?? 1, color: opts.color ?? 0xffffff, side: opts.side ?? THREE.FrontSide,
      envMapIntensity: opts.envMapIntensity ?? 0.6,
    });
    m.normalScale.setScalar(opts.normalScale ?? 1);
    return m;
  })());
  return matCache.get(key)!;
}
/** Plain (untextured) materials used for iron, cloth, bone, embers... */
export const MAT = {
  iron: () => new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.55, metalness: 0.85 }),
  rustIron: () => new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 0.8, metalness: 0.6 }),
  darkWood: () => new THREE.MeshStandardMaterial({ color: 0x4a3627, roughness: 0.85 }),
  bone: () => new THREE.MeshStandardMaterial({ color: 0xd9cdb4, roughness: 0.7 }),
  cloth: (c = 0x7a6a52) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide }),
  rope: () => new THREE.MeshStandardMaterial({ color: 0x8b7a55, roughness: 0.95 }),
  ember: () => new THREE.MeshStandardMaterial({ color: 0x1a0d08, roughness: 0.9, emissive: 0xff4a10, emissiveIntensity: 2.5 }),
  charcoal: () => new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.95 }),
  void: () => new THREE.MeshBasicMaterial({ color: 0x000000 }),
};

// ---------------------------------------------------------------- flame sprites
let flameTex: THREE.CanvasTexture | null = null;
function getFlameTexture() {
  if (flameTex) return flameTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')!;
  g.clearRect(0, 0, 64, 128);
  // teardrop: stack of soft ellipses, hot core
  for (let i = 0; i < 40; i++) {
    const t = i / 40; const y = 118 - t * 108; const r = (1 - t * 0.85) * 22 * (0.6 + 0.4 * Math.sin(t * Math.PI));
    const a = 0.09 * (1 - t * 0.6);
    const grad = g.createRadialGradient(32, y, 0, 32, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${a * 1.4})`); grad.addColorStop(0.35, `rgba(255,220,140,${a})`); grad.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = grad; g.beginPath(); g.ellipse(32, y, r, r * 1.35, 0, 0, Math.PI * 2); g.fill();
  }
  flameTex = new THREE.CanvasTexture(c); flameTex.colorSpace = THREE.SRGBColorSpace; return flameTex;
}
export interface Flame { group: THREE.Group; seed: number; base: number }
/** Two crossed additive planes with a soft flame texture; animated by FlameSet.update. */
export class FlameSet {
  flames: Flame[] = [];
  add(parent: THREE.Object3D, pos: THREE.Vector3, size = 0.35, color: THREE.ColorRepresentation = new THREE.Color(2.6, 1.5, 0.55), aspect = 1.9) {
    const mat = new THREE.MeshBasicMaterial({ map: getFlameTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const geo = new THREE.PlaneGeometry(size, size * aspect); geo.translate(0, size * aspect * 0.42, 0);
    const g = new THREE.Group(); g.position.copy(pos);
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(geo, mat); m.rotation.y = (i * Math.PI) / 3; g.add(m); }
    parent.add(g);
    const f = { group: g, seed: Math.random() * 100, base: size }; this.flames.push(f); return f;
  }
  update(t: number) {
    for (const f of this.flames) {
      const s = 1 + 0.12 * Math.sin(t * 9 + f.seed) + 0.08 * Math.sin(t * 15.7 + f.seed * 2.1) + 0.05 * Math.sin(t * 31 + f.seed * 0.7);
      f.group.scale.set(1 + (s - 1) * 0.6, s, 1 + (s - 1) * 0.6);
      f.group.rotation.y = Math.sin(t * 2.3 + f.seed) * 0.25;
      f.group.rotation.z = Math.sin(t * 6.1 + f.seed) * 0.06;
    }
  }
}

// ---------------------------------------------------------------- pooled point lights
export interface LightSource { pos: THREE.Vector3; color: THREE.Color; intensity: number; range: number; flicker: number; shadow: boolean; seed: number; enabled: boolean; group: 'outdoor' | 'crypt' }
/**
 * three.js evaluates every visible point light for every fragment, so we keep a fixed pool of lights
 * (constant shader light count => no recompiles) and hand them to the nearest virtual sources each frame.
 */
export class LightPool {
  private static inst: LightPool | null = null;
  static get(scene: THREE.Scene) { if (!this.inst) this.inst = new LightPool(scene); return this.inst; }
  lights: THREE.PointLight[] = []; shadowLights: THREE.PointLight[] = [];
  sources: LightSource[] = [];
  private stamp = -1; time = 0;
  constructor(public scene: THREE.Scene, plain = 10) {
    const q = detectQuality(); let nShadow = q === 'low' ? 0 : q === 'medium' ? 2 : 3;
    try { const p = new URLSearchParams(location.search).get('lights'); if (p) { plain = Math.max(1, Number(p)); nShadow = Math.min(nShadow, 1); } } catch { /* no DOM */ }
    for (let i = 0; i < plain; i++) this.lights.push(this.mk(false));
    for (let i = 0; i < nShadow; i++) this.shadowLights.push(this.mk(true));
  }
  private mk(shadow: boolean) {
    const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.position.set(0, -1000, 0);
    if (shadow) { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.004; l.shadow.normalBias = 0.02; l.shadow.radius = 3; l.shadow.camera.near = 0.15; }
    this.scene.add(l); return l;
  }
  add(s: Partial<LightSource> & { pos: THREE.Vector3 }): LightSource {
    const src: LightSource = { color: new THREE.Color(0xffa040), intensity: 20, range: 12, flicker: 0.15, shadow: false, seed: Math.random() * 100, enabled: true, group: 'outdoor', ...s };
    this.sources.push(src); return src;
  }
  update(dt: number, camPos: THREE.Vector3) {
    const now = performance.now(); if (now - this.stamp < 1) return; this.stamp = now; this.time += dt;
    const t = this.time;
    const scored = this.sources.filter((s) => s.enabled).map((s) => ({ s, d: s.pos.distanceTo(camPos) })).filter((e) => e.d < 70).sort((a, b) => a.d - b.d);
    const usedShadow = new Set<LightSource>();
    let si = 0;
    for (const e of scored) { if (si >= this.shadowLights.length) break; if (e.s.shadow) { this.apply(this.shadowLights[si++], e.s, e.d, t); usedShadow.add(e.s); } }
    for (let i = si; i < this.shadowLights.length; i++) this.park(this.shadowLights[i]);
    let li = 0;
    for (const e of scored) { if (li >= this.lights.length) break; if (usedShadow.has(e.s)) continue; this.apply(this.lights[li++], e.s, e.d, t); }
    for (let i = li; i < this.lights.length; i++) this.park(this.lights[i]);
  }
  private apply(l: THREE.PointLight, s: LightSource, d: number, t: number) {
    const fl = 1 + s.flicker * (0.55 * Math.sin(t * 8.1 + s.seed) + 0.3 * Math.sin(t * 17.3 + s.seed * 1.7) + 0.15 * Math.sin(t * 41 + s.seed * 0.3) + (Math.random() - 0.5) * 0.25);
    const fade = 1 - smooth(45, 68, d);
    l.position.copy(s.pos); l.color.copy(s.color); l.intensity = s.intensity * fl * fade; l.distance = s.range;
    if (l.castShadow) { l.shadow.camera.far = s.range; }
  }
  private park(l: THREE.PointLight) { l.intensity = 0; l.position.set(0, -1000, 0); }
}

// ---------------------------------------------------------------- model spawning
export interface Place { x: number; z: number; y?: number; yaw?: number; pitch?: number; roll?: number; scale?: number | [number, number, number]; sink?: number; onGround?: boolean }
const gltfCache = new Map<string, Promise<THREE.Group>>();
/** Load a glb once and return a shadow-enabled template; spawn() clones it. */
export function loadTemplate(path: string, tweak?: (root: THREE.Group) => void): Promise<THREE.Group> {
  if (!gltfCache.has(path)) gltfCache.set(path, assets.gltf(path).then((g) => {
    const root = g.scene as THREE.Group;
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; const mat = m.material as THREE.MeshStandardMaterial; if (mat?.isMeshStandardMaterial) { mat.envMapIntensity = 0.6; if (mat.map) mat.map.anisotropy = 8; } } });
    tweak?.(root); return root;
  }));
  return gltfCache.get(path)!;
}
export function applyPlace(o: THREE.Object3D, p: Place) {
  const gy = p.onGround === false ? 0 : groundY(p.x, p.z);
  o.position.set(p.x, gy + (p.y ?? 0) - (p.sink ?? 0), p.z);
  o.rotation.set(0, 0, 0); o.rotation.order = 'YXZ';
  o.rotation.y = p.yaw ?? 0; o.rotation.x = p.pitch ?? 0; o.rotation.z = p.roll ?? 0;
  if (p.scale !== undefined) { if (typeof p.scale === 'number') o.scale.setScalar(p.scale); else o.scale.set(...p.scale); }
  return o;
}
export async function spawn(parent: THREE.Object3D, path: string, p: Place, tweak?: (root: THREE.Group) => void): Promise<THREE.Group> {
  const tpl = await loadTemplate(path, tweak);
  const o = tpl.clone(true); applyPlace(o, p); parent.add(o); return o;
}
export const propPath = (id: string) => `models/props/${id}/${id}.glb`;
export const dungeonPath = (id: string) => `models/dungeon/${id}.glb`;
/** World-space bounding box of an object (after placement). */
export const bboxOf = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);

/**
 * Merge every static KayKit mesh under `root` (they all share one palette material) into as few meshes as possible.
 * Objects for which `keep(o)` is true (or any of their ancestors) are left alone (doors, animated bits).
 * Returns the merged meshes; originals are removed from the graph.
 */
export function mergeKayKit(root: THREE.Object3D, keep: (o: THREE.Object3D) => boolean = () => false): THREE.Mesh[] {
  root.updateMatrixWorld(true);
  const found: THREE.Mesh[] = []; let mat: THREE.MeshStandardMaterial | null = null;
  root.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh || !m.visible) return;
    const mm = m.material as THREE.MeshStandardMaterial; if (Array.isArray(mm) || !mm?.isMeshStandardMaterial || mm.name !== 'texture' || !mm.map) return;
    let p: THREE.Object3D | null = o; while (p && p !== root) { if (keep(p) || !p.visible) return; p = p.parent; }
    found.push(m); if (!mat) mat = mm;
  });
  if (!found.length) return [];
  const geos: THREE.BufferGeometry[] = [];
  for (const m of found) {
    let g = m.geometry.clone(); if (!g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    g.applyMatrix4(m.matrixWorld); geos.push(g);
    m.parent?.remove(m);
  }
  const out: THREE.Mesh[] = []; const CHUNK = 60000; let acc: THREE.BufferGeometry[] = []; let verts = 0;
  const flush = () => { if (!acc.length) return; const merged = mergeGeometries(acc.map((g) => g.index ? g : g.toNonIndexed()), false)!; for (const g of acc) g.dispose(); const mesh = new THREE.Mesh(merged, mat!); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'kaykit-merged'; root.add(mesh); out.push(mesh); acc = []; verts = 0; };
  for (const g of geos) { acc.push(g); verts += g.attributes.position.count; if (verts > CHUNK) flush(); }
  flush();
  return out;
}

// ---------------------------------------------------------------- geometry helpers
/** Assign metre-scaled UVs by projecting along the dominant normal axis (in the geometry's local frame). */
export function boxProjectUV(geo: THREE.BufferGeometry, texSize = 2, offset = 0) {
  const pos = geo.attributes.position as THREE.BufferAttribute; const nor = geo.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let u: number, v: number;
    if (ny >= nx && ny >= nz) { u = x; v = z; } else if (nx >= nz) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / texSize + offset; uv[i * 2 + 1] = v / texSize + offset;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
export function transformGeo(geo: THREE.BufferGeometry, x: number, y: number, z: number, yaw = 0, pitch = 0, roll = 0, s = 1) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), new THREE.Vector3(s, s, s));
  geo.applyMatrix4(m); return geo;
}

export interface WallOpts {
  x0: number; z0: number; x1: number; z1: number;
  /** height in metres at t∈[0,1] along the wall (ruin profile) */
  height: number | ((t: number) => number);
  thick?: number; blockLen?: number; blockH?: number; seed?: number; jitter?: number; texSize?: number;
  /** base y at (x,z); defaults to terrain height */
  baseY?: (x: number, z: number) => number;
  /** absolute base y (overrides baseY) */
  y?: number;
  missing?: number;   // probability a block is missing in the top two rows
  buried?: number;    // metres the bottom row sinks below the base
}
/** A wall made of individual stone blocks with a jagged (ruined) top edge. Returns a merged geometry with metre UVs. */
export function blockWallGeometry(o: WallOpts): THREE.BufferGeometry {
  const rnd = new Rand(o.seed ?? 7); const thick = o.thick ?? 0.7, bl = o.blockLen ?? 0.95, bh = o.blockH ?? 0.42, jit = o.jitter ?? 0.03;
  const dx = o.x1 - o.x0, dz = o.z1 - o.z0; const len = Math.hypot(dx, dz); const yaw = Math.atan2(dx, dz) + Math.PI / 2; // wall runs along local +X
  const hAt = (t: number) => (typeof o.height === 'number' ? o.height : o.height(Math.min(1, Math.max(0, t))));
  const base = (t: number) => { const x = o.x0 + dx * t, z = o.z0 + dz * t; return o.y ?? (o.baseY ? o.baseY(x, z) : groundY(x, z)); };
  let minBase = Infinity; for (let i = 0; i <= 10; i++) minBase = Math.min(minBase, base(i / 10));
  const parts: THREE.BufferGeometry[] = []; const texSize = o.texSize ?? 2.2;
  const rows = Math.ceil((hAt(0.5) + 3) / bh) + 2;
  const y0 = minBase - (o.buried ?? 0.35);
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * bh; const off = (r % 2) * bl * 0.5;
    for (let x = -off; x < len; x += bl) {
      const bw = Math.min(bl, len - x) - 0.02; if (bw < 0.2) continue;
      const cx = x + bw / 2; const t = cx / len; const top = base(t) + hAt(t);
      if (y + bh * 0.5 > top) continue;
      const nearTop = y + bh * 2.2 > top;
      if (nearTop && rnd.next() < (o.missing ?? 0.25)) continue;
      const hh = bh - 0.02, tt = thick * rnd.range(0.94, 1.06);
      const g = new THREE.BoxGeometry(bw, hh, tt);
      const jy = nearTop ? rnd.range(-0.06, 0.02) : 0;
      transformGeo(g, cx + rnd.range(-jit, jit), y + hh / 2 + jy, rnd.range(-jit, jit), rnd.range(-0.02, 0.02) * (nearTop ? 3 : 1), nearTop ? rnd.range(-0.03, 0.03) : 0, nearTop ? rnd.range(-0.04, 0.04) : 0);
      boxProjectUV(g, texSize, rnd.range(0, 1));
      parts.push(g);
    }
  }
  const merged = mergeGeometries(parts, false)!; for (const p of parts) p.dispose();
  transformGeo(merged, o.x0, 0, o.z0, yaw);
  merged.computeBoundingSphere(); return merged;
}

/** A pointed (gothic) arch of voussoir blocks over two block piers. Local frame: opening centred at origin, wall runs along X, faces ±Z. */
export function gothicArchGeometry(span = 2.6, springH = 2.4, thick = 0.8, depth = 0.8, seed = 3, texSize = 2.2): THREE.BufferGeometry {
  const rnd = new Rand(seed); const parts: THREE.BufferGeometry[] = [];
  const pierW = thick;
  // piers
  const bh = 0.42; const rows = Math.ceil(springH / bh);
  for (const side of [-1, 1]) for (let r = 0; r < rows; r++) {
    const g = new THREE.BoxGeometry(pierW - 0.02, bh - 0.02, depth * rnd.range(0.95, 1.05));
    transformGeo(g, side * (span / 2 + pierW / 2) + rnd.range(-0.02, 0.02), r * bh + bh / 2, rnd.range(-0.02, 0.02), rnd.range(-0.02, 0.02));
    boxProjectUV(g, texSize, rnd.range(0, 1)); parts.push(g);
  }
  // voussoirs along an equilateral pointed arch (radius = span + pierW, centred on the opposite springing point)
  const R = span + pierW * 0.5; const n = 9; const vs = thick;
  for (const side of [-1, 1]) {
    const cx = -side * (span / 2); // centre of the arc for this half is the opposite springing point
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * (Math.PI / 3), a1 = ((i + 1) / n) * (Math.PI / 3); const a = (a0 + a1) / 2;
      const ang = side > 0 ? Math.PI - a : a; // right half sweeps from 0..60°, left mirrored
      const px = cx + Math.cos(ang) * (R - vs / 2 + pierW * 0.25), py = springH + Math.sin(ang) * (R - vs / 2 + pierW * 0.25);
      const arc = (a1 - a0) * R - 0.02;
      const g = new THREE.BoxGeometry(vs, arc, depth * rnd.range(0.95, 1.05));
      transformGeo(g, px, py, rnd.range(-0.015, 0.015), 0, 0, ang);
      boxProjectUV(g, texSize, rnd.range(0, 1)); parts.push(g);
    }
  }
  // keystone closes the apex
  const Rc = R - vs / 2 + pierW * 0.25; const key = new THREE.BoxGeometry(vs * 1.15, vs * 0.9, depth * 1.04);
  transformGeo(key, 0, springH + Math.sin(Math.PI / 3) * Rc + vs * 0.1, 0); boxProjectUV(key, texSize, 0.5); parts.push(key);
  const merged = mergeGeometries(parts, false)!; for (const p of parts) p.dispose(); return merged;
}

/** Cobblestone floor patch: a disc with metre UVs for the map and a radial alpha fade in uv channel 1. */
export function floorPatchGeometry(r = 3, texSize = 2.5, seed = 1) {
  const rnd = new Rand(seed);
  const geo = new THREE.CircleGeometry(r, 28); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute; const uv = new Float32Array(pos.count * 2), uv1 = new Float32Array(pos.count * 2);
  const ox = rnd.range(0, 3), oz = rnd.range(0, 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const wob = 1 + 0.18 * Math.sin(Math.atan2(z, x) * 3 + seed) + 0.1 * Math.sin(Math.atan2(z, x) * 7 + seed * 2);
    pos.setX(i, x * wob); pos.setZ(i, z * wob);
    uv[i * 2] = (x * wob + ox) / texSize; uv[i * 2 + 1] = (z * wob + oz) / texSize;
    uv1[i * 2] = 0.5 + (x * wob) / (2 * r); uv1[i * 2 + 1] = 0.5 + (z * wob) / (2 * r);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2)); geo.computeVertexNormals();
  return geo;
}
let radialAlpha: THREE.CanvasTexture | null = null;
export function radialAlphaTexture() {
  if (radialAlpha) return radialAlpha;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64); grad.addColorStop(0, '#fff'); grad.addColorStop(0.55, '#fff'); grad.addColorStop(1, '#000');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  radialAlpha = new THREE.CanvasTexture(c); radialAlpha.channel = 1; return radialAlpha;
}
export function floorPatchMaterial(base: THREE.MeshStandardMaterial) {
  const m = base.clone(); m.alphaMap = radialAlphaTexture(); m.transparent = true; m.depthWrite = false; m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; return m;
}

/** Coffin (tapered hexagonal box). Local: lies along +Z, floor at y=0. Returns { body, lid } meshes. */
export function coffin(mat: THREE.Material, len = 2.0, w = 0.75, h = 0.5, wall = 0.06): { body: THREE.Mesh; lid: THREE.Mesh } {
  const outline = (L: number, W: number) => { const s = new THREE.Shape(); const hw = W / 2, sw = W * 0.34, tw = W * 0.4; const L2 = L / 2;
    s.moveTo(-sw, -L2); s.lineTo(sw, -L2); s.lineTo(hw, -L2 + L * 0.3); s.lineTo(tw, L2); s.lineTo(-tw, L2); s.lineTo(-hw, -L2 + L * 0.3); s.closePath(); return s; };
  const bodyGeo = new THREE.ExtrudeGeometry(outline(len, w), { depth: h, bevelEnabled: false }); bodyGeo.rotateX(-Math.PI / 2);
  boxProjectUV(bodyGeo, 1.2, 0.3);
  const body = new THREE.Mesh(bodyGeo, mat); body.castShadow = body.receiveShadow = true;
  // hollow: a dark inner block so the inside reads as a cavity
  const inner = new THREE.Mesh(new THREE.ExtrudeGeometry(outline(len - wall * 2, w - wall * 2), { depth: h - wall, bevelEnabled: false }).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 }));
  inner.position.y = wall + 0.001; inner.scale.y = 1; body.add(inner);
  const lidGeo = new THREE.ExtrudeGeometry(outline(len + 0.04, w + 0.04), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); lidGeo.rotateX(-Math.PI / 2);
  boxProjectUV(lidGeo, 1.2, 0.7);
  const lid = new THREE.Mesh(lidGeo, mat); lid.castShadow = lid.receiveShadow = true; lid.position.y = h;
  return { body, lid };
}

/** Stone sarcophagus with a chamfered lid. Local: along +Z, floor y=0. */
export function sarcophagus(mat: THREE.Material, len = 2.5, w = 1.15, h = 1.0): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(w + 0.2, 0.18, len + 0.2), 1.6, 0.1), mat); base.position.y = 0.09; g.add(base);
  const body = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(w, h - 0.18, len), 1.6, 0.4), mat); body.position.y = 0.18 + (h - 0.18) / 2; g.add(body);
  // carved panels (slightly proud)
  for (const s of [-1, 1]) { const p = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(0.04, h * 0.5, len * 0.8), 1.6, 0.8), mat); p.position.set(s * (w / 2), h * 0.55, 0); g.add(p); }
  const lidShape = new THREE.Shape(); const hw = w / 2 + 0.06, hl = len / 2 + 0.06;
  lidShape.moveTo(-hw, -hl); lidShape.lineTo(hw, -hl); lidShape.lineTo(hw, hl); lidShape.lineTo(-hw, hl); lidShape.closePath();
  const lidGeo = new THREE.ExtrudeGeometry(lidShape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.09, bevelSegments: 2 }); lidGeo.rotateX(-Math.PI / 2);
  boxProjectUV(lidGeo, 1.6, 0.2);
  const lid = new THREE.Mesh(lidGeo, mat); lid.position.y = h + 0.09; lid.name = 'lid'; g.add(lid);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}

/** Hanging chain of alternating torus links. Local: hangs down from origin. */
export function chain(len = 2, link = 0.12, mat = MAT.iron()): THREE.InstancedMesh {
  const n = Math.max(1, Math.round(len / (link * 0.78)));
  const geo = new THREE.TorusGeometry(link * 0.45, link * 0.11, 6, 10);
  const im = new THREE.InstancedMesh(geo, mat, n); const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler();
  for (let i = 0; i < n; i++) { e.set(0, (i % 2) * Math.PI / 2, 0); q.setFromEuler(e); m.compose(new THREE.Vector3(0, -i * link * 0.78, 0), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m); }
  im.castShadow = true; return im;
}
/** Rope slung between two points (catenary sag). */
export function rope(a: THREE.Vector3, b: THREE.Vector3, sag = 0.3, r = 0.025, mat = MAT.rope()): THREE.Mesh {
  const pts: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * Math.sin(t * Math.PI), 0))); }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 5, false); const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m;
}

// ---------------------------------------------------------------- cobwebs
let webTex: THREE.CanvasTexture | null = null;
function cobwebTexture() {
  if (webTex) return webTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.2;
  const cx = 4, cy = 4, R = 250; const spokes = 11;
  for (let i = 0; i <= spokes; i++) { const a = (i / spokes) * (Math.PI / 2); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
  for (let k = 1; k <= 12; k++) { const r = (k / 12) * R * (0.95 + 0.05 * Math.sin(k)); g.beginPath();
    for (let i = 0; i <= spokes; i++) { const a = (i / spokes) * (Math.PI / 2); const rr = r * (1 - 0.06 * ((i + k) % 2)); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i === 0) g.moveTo(x, y); else { const am = ((i - 0.5) / spokes) * (Math.PI / 2); g.quadraticCurveTo(cx + Math.cos(am) * rr * 0.93, cy + Math.sin(am) * rr * 0.93, x, y); } }
    g.stroke(); }
  webTex = new THREE.CanvasTexture(c); return webTex;
}
/** Corner cobweb: a quarter-web plane whose corner sits at the origin, spanning +X and -Y (hang it in a wall/ceiling corner). */
export function cobweb(size = 1.2, opacity = 0.55): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ map: cobwebTexture(), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, color: 0xd8d8d0 });
  const geo = new THREE.PlaneGeometry(size, size); geo.translate(size / 2, -size / 2, 0);
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 5; return m;
}

// ---------------------------------------------------------------- glint sprite (pickup readability)
let starTex: THREE.CanvasTexture | null = null;
function starTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.12, 'rgba(255,255,255,0.55)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.06)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
  for (const [dx, dy] of [[1, 0], [0, 1], [0.7, 0.7], [0.7, -0.7]]) { const lg = g.createLinearGradient(64 - dx * 60, 64 - dy * 60, 64 + dx * 60, 64 + dy * 60); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = lg; g.lineWidth = dx === 1 || dy === 1 ? 2.5 : 1.2; g.beginPath(); g.moveTo(64 - dx * 60, 64 - dy * 60); g.lineTo(64 + dx * 60, 64 + dy * 60); g.stroke(); }
  starTex = new THREE.CanvasTexture(c); return starTex;
}
/** Additive twinkling star sprite; call `glintUpdate` with time to pulse. */
export function glint(size = 0.5, color: THREE.ColorRepresentation = new THREE.Color(1.6, 1.8, 2.2)): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: starTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.setScalar(size); s.userData.base = size; return s;
}
export function glintUpdate(s: THREE.Sprite, t: number) { const k = 0.7 + 0.3 * Math.sin(t * 2.4) + 0.15 * Math.sin(t * 7.1); s.scale.setScalar(s.userData.base * k); s.material.rotation = t * 0.4; (s.material as THREE.SpriteMaterial).opacity = 0.55 + 0.45 * k; }

// ---------------------------------------------------------------- light shafts
const shaftMat = () => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(0.55, 0.75, 0.9) }, uStrength: { value: 0.18 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.4); float a = uStrength * edge * smoothstep(0.0,0.25,vUv.y) * (1.0 - smoothstep(0.55,1.0,vUv.y)); gl_FragColor = vec4(uColor * a, a); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
/** A soft additive cone from `top` pointing down `dir` (default straight down); reads as dusty light through a crack. */
export function lightShaft(top: THREE.Vector3, len = 6, r0 = 0.25, r1 = 1.2, color?: THREE.Color, strength = 0.18): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r1, r0, len, 16, 1, true); // uv.y = 0 at bottom, 1 at top
  const m = shaftMat(); if (color) (m.uniforms.uColor.value as THREE.Color).copy(color); m.uniforms.uStrength.value = strength;
  const mesh = new THREE.Mesh(geo, m); mesh.position.copy(top).add(new THREE.Vector3(0, -len / 2, 0)); mesh.renderOrder = 4; return mesh;
}

// ---------------------------------------------------------------- misc small props
/** Iron brazier: a bowl on three legs. Flame/light are added by the caller. Local: floor y=0, rim at ~1.0 m. */
export function brazier(mat = MAT.rustIron(), emberColor?: THREE.Color): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector2[] = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.12 + 0.3 * Math.sin(t * Math.PI * 0.5), 0.62 + t * 0.36)); }
  pts.push(new THREE.Vector2(0.4, 1.0), new THREE.Vector2(0.36, 0.98), new THREE.Vector2(0.1, 0.72));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat); g.add(bowl);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.75, 6), mat); leg.position.set(Math.cos(a) * 0.22, 0.36, Math.sin(a) * 0.22); leg.rotation.z = Math.cos(a) * 0.18; leg.rotation.x = -Math.sin(a) * 0.18; g.add(leg); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 20), mat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  const emberMat = MAT.ember(); if (emberColor) { emberMat.emissive.copy(emberColor); emberMat.emissiveIntensity = 1.6; }
  const coals = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), emberMat); coals.scale.y = 0.35; coals.position.y = 0.9; g.add(coals);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  return g;
}
/** Wall torch bracket (iron) with a wooden torch; flame added by caller at (0, 0.55, 0.12). Local: mount point at origin, torch leans out along +Z. */
export function wallTorch(): THREE.Group {
  const g = new THREE.Group(); const iron = MAT.iron();
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.05), iron); bracket.position.set(0, 0, 0.025); g.add(bracket);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), iron); ringM.rotation.x = Math.PI / 2; ringM.position.set(0, 0.12, 0.09); g.add(ringM);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.55, 7), MAT.darkWood()); stick.position.set(0, 0.28, 0.12); stick.rotation.x = -0.25; g.add(stick);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.14, 8), MAT.charcoal()); head.position.set(0, 0.55, 0.19); g.add(head);
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), MAT.ember()); ember.position.set(0, 0.62, 0.2); g.add(ember);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  return g;
}
/** Bone pile: a skull and scattered long bones. Local: floor y=0. */
export function bonePile(seed = 1, count = 7): THREE.Group {
  const rnd = new Rand(seed); const g = new THREE.Group(); const bone = MAT.bone();
  for (let i = 0; i < count; i++) {
    const L = rnd.range(0.25, 0.45); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, L, 3, 6), bone);
    b.position.set(rnd.range(-0.45, 0.45), 0.03, rnd.range(-0.45, 0.45)); b.rotation.set(Math.PI / 2 + rnd.range(-0.2, 0.2), 0, rnd.range(0, Math.PI)); b.rotation.order = 'YXZ'; b.rotation.y = rnd.range(0, Math.PI * 2); g.add(b);
  }
  const skull = new THREE.Group(); const cr = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), bone); cr.scale.set(1, 0.92, 1.12); skull.add(cr);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.1), bone); jaw.position.set(0, -0.06, 0.03); skull.add(jaw);
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 })); eye.position.set(s * 0.04, 0.005, 0.095); skull.add(eye); }
  skull.position.set(rnd.range(-0.2, 0.2), 0.09, rnd.range(-0.2, 0.2)); skull.rotation.set(rnd.range(-0.3, 0.3), rnd.range(0, Math.PI * 2), rnd.range(-0.3, 0.3)); g.add(skull);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
/** Gravestone: rounded-top slab (or cross) in stone. Local: floor y=0, faces +Z. */
export function gravestone(mat: THREE.Material, kind: 'round' | 'cross' | 'slab' = 'round', seed = 1): THREE.Mesh {
  const rnd = new Rand(seed); let geo: THREE.BufferGeometry;
  if (kind === 'cross') {
    const a = new THREE.BoxGeometry(0.18, 1.1, 0.12); a.translate(0, 0.55, 0); const b = new THREE.BoxGeometry(0.6, 0.16, 0.12); b.translate(0, 0.8, 0);
    const base = new THREE.BoxGeometry(0.5, 0.14, 0.34); base.translate(0, 0.07, 0);
    geo = mergeGeometries([a, b, base].map((g) => g.toNonIndexed()), false)!;
  } else if (kind === 'slab') {
    geo = new THREE.BoxGeometry(0.8, 0.14, 1.9); geo.translate(0, 0.07, 0);
  } else {
    const w = rnd.range(0.55, 0.7), h = rnd.range(0.8, 1.05), t = 0.14;
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
    geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }); geo.translate(0, 0, -t / 2);
    const base = new THREE.BoxGeometry(w + 0.2, 0.1, t + 0.25); base.translate(0, 0.05, 0);
    geo = mergeGeometries([geo.toNonIndexed(), base.toNonIndexed()], false)!;
  }
  boxProjectUV(geo, 1.0, rnd.range(0, 1));
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.rotation.z = rnd.range(-0.08, 0.08); m.rotation.x = rnd.range(-0.1, 0.05); return m;
}
/** Small dirt mound (grave) — a squashed hemisphere. */
export function mound(mat: THREE.Material, len = 1.9, w = 0.8, h = 0.22): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); geo.scale(w / 2, h, len / 2); boxProjectUV(geo, 1.5);
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = true; return m;
}
/** Emissive rune circle for the boss arena (canvas-drawn sigil). Local: lies flat at y=0. */
export function runeCircle(r = 4, color = new THREE.Color(0.25, 1.4, 1.1)): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.clearRect(0, 0, 512, 512); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 6;
  const cx = 256, cy = 256;
  for (const rr of [246, 232, 150, 60]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 7; i++) { const a = (i * 3 / 7) * Math.PI * 2; const x = cx + Math.cos(a) * 150, y = cy + Math.sin(a) * 150; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.closePath(); g.stroke();
  g.font = 'bold 26px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; g.save(); g.translate(cx + Math.cos(a) * 192, cy + Math.sin(a) * 192); g.rotate(a + Math.PI / 2); g.fillText(runes[i % runes.length], 0, 0); g.restore(); }
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, color, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.9 });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 3; return m;
}
