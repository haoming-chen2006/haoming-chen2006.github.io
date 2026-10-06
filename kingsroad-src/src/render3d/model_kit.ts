import * as THREE from 'three';
import { teamHex } from './perspective.ts';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WeaponKind } from '../game/types.ts';

export type UnitMat = THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
/** Resolved against the viewer's side: blue is always "mine". See perspective.ts. */
export const TEAM_HEX: Record<number, number> = { get 0() { return teamHex(0); }, get 1() { return teamHex(1); }, get 2() { return teamHex(2); } };
export const SKIN = 0xf1c9a5;
export const OUTLINES = false;

let gradientMap: THREE.DataTexture | null = null;
/** Three-band gradient for cel shading. */
export function toonGradient(): THREE.DataTexture {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([90, 160, 235, 255]);
  gradientMap = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
export function g<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let geo = geoCache.get(key);
  if (!geo) { geo = make(); geoCache.set(key, geo); }
  return geo as T;
}
const r3 = (n: number) => Math.round(n * 1000) / 1000;
export const boxGeo = (w: number, h: number, d: number) => g(`box${r3(w)},${r3(h)},${r3(d)}`, () => new THREE.BoxGeometry(w, h, d));
export const rboxGeo = (w: number, h: number, d: number, r?: number) => g(`rbox${r3(w)},${r3(h)},${r3(d)},${r3(r ?? Math.min(w, h, d) * 0.3)}`, () => new RoundedBoxGeometry(w, h, d, 3, r ?? Math.min(w, h, d) * 0.3));
export const sphereGeo = (r: number, s = 12) => g(`sph${r3(r)},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, Math.round(s * 0.75))));
export const cylGeo = (rt: number, rb: number, h: number, s = 12) => g(`cyl${r3(rt)},${r3(rb)},${r3(h)},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const coneGeo = (r: number, h: number, s = 8) => g(`cone${r3(r)},${r3(h)},${s}`, () => new THREE.ConeGeometry(r, h, s));
export const torusGeo = (r: number, t: number, arc = Math.PI * 2, seg = 16) => g(`tor${r3(r)},${r3(t)},${r3(arc)},${seg}`, () => new THREE.TorusGeometry(r, t, 6, seg, arc));
export const capsuleGeo = (r: number, len: number) => g(`cap${r3(r)},${r3(len)}`, () => new THREE.CapsuleGeometry(r, len, 3, 10));
export const tetraGeo = (r: number) => g(`tet${r3(r)}`, () => new THREE.TetrahedronGeometry(r, 0));

/** Flat triangular fan (wings, capes, cloth) in the XY plane, pointing +X. */
export function wingGeo(key: string, pts: [number, number][]): THREE.BufferGeometry {
  return g(`wing${key}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    return geo;
  });
}

export function mat(color: number | string, opts: { emissive?: number; emissiveIntensity?: number; roughness?: number; metalness?: number; transparent?: boolean; opacity?: number; flat?: boolean; side?: THREE.Side } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.7, metalness: opts.metalness ?? 0.05, flatShading: false,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1, transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
}

/** Cel-shaded material used for characters so they read clearly against the environment. */
export function toon(color: number | string, opts: { emissive?: number; emissiveIntensity?: number; transparent?: boolean; opacity?: number; side?: THREE.Side; roughness?: number; metalness?: number } = {}): THREE.MeshStandardMaterial {
  // smooth, softly lit stylised shading (王者荣耀 look) — the cel gradient and outlines are gone
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.62, metalness: opts.metalness ?? 0.0, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide, envMapIntensity: 0.5,
  });
}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x12141c, side: THREE.BackSide });

/** `parent.add(child)` returns the parent in Three.js; this returns the child so it can be posed inline. */
export function attach<T extends THREE.Object3D>(parent: THREE.Object3D, child: T): T {
  parent.add(child);
  return child;
}

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true;
  me.receiveShadow = false;
  return me;
}

/** Inverted-hull outline for the big readable parts of a character. */
export function outline(m: THREE.Mesh, scale = 1.07): THREE.Mesh {
  if (!OUTLINES) return m;
  const o = new THREE.Mesh(m.geometry, outlineMat);
  o.scale.setScalar(scale);
  o.castShadow = false;
  m.add(o);
  return m;
}

/**
 * Bake every static mesh under `parent` that shares a material into one mesh per material,
 * cutting draw calls for decor and structures. Subtrees in `keep` (animated parts) are untouched.
 */
export function mergeByMaterial(parent: THREE.Object3D, keep: Set<THREE.Object3D> = new Set()): void {
  parent.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const groups = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  const visit = (o: THREE.Object3D): void => {
    if (keep.has(o)) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && !Array.isArray(m.material) && !(m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) {
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      const rec = groups.get(m.material) ?? { geos: [], meshes: [] };
      rec.geos.push(geo); rec.meshes.push(m); groups.set(m.material, rec);
    }
    for (const c of [...o.children]) visit(c);
  };
  for (const c of [...parent.children]) visit(c);
  for (const [material, rec] of groups) {
    if (rec.geos.length < 2) { for (const g of rec.geos) g.dispose(); continue; }
    const merged = mergeGeometries(rec.geos, false);
    for (const g of rec.geos) g.dispose();
    if (!merged) continue;
    const first = rec.meshes[0];
    for (const m of rec.meshes) m.removeFromParent();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
    mesh.userData.ownGeo = true; // merged geometry belongs to this instance: dispose with it
    parent.add(mesh);
  }
  // prune groups left empty
  const prune = (o: THREE.Object3D): void => { for (const c of [...o.children]) { prune(c); if (!(c as THREE.Mesh).isMesh && c.children.length === 0 && !keep.has(c)) c.removeFromParent(); } };
  prune(parent);
}

export function shade(hex: number, f: number): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}

export const hex = (s: string): number => parseInt(s.slice(1), 16);

/** Weapons are built along +Y (blade pointing up) with the grip at the origin. */
export function buildWeapon(kind: WeaponKind, s: number, accent: number, mats: UnitMat[]): THREE.Group {
  const grp = new THREE.Group();
  const steel = toon(0xdde3ea, { metalness: 0.9, roughness: 0.28 }), dark = toon(0x2a2d33, { metalness: 0.6, roughness: 0.4 }), wood = toon(0x7a5230, { roughness: 0.7 }), acc = toon(accent, { emissive: accent, emissiveIntensity: 0.12, roughness: 0.4 }), gold = toon(0xe9c46a, { metalness: 0.9, roughness: 0.3 });
  mats.push(steel, dark, wood, acc, gold);
  const add = (m: THREE.Mesh) => { grp.add(m); return m; };
  switch (kind) {
    case 'sword': {
      const lacquer = toon(0x7a1b1b, { roughness: 0.3 }); mats.push(lacquer);
      add(mesh(cylGeo(s * 0.05, s * 0.06, s * 0.36, 12), lacquer, 0, s * 0.12, 0));
      for (let i = 0; i < 4; i++) attach(grp, mesh(torusGeo(s * 0.06, s * 0.012, 6, 12), gold, 0, s * 0.02 + i * s * 0.08, 0)).rotation.x = Math.PI / 2;
      add(mesh(sphereGeo(s * 0.07, 12), gold, 0, -s * 0.06, 0));
      const guard = mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(s * 0.28, s * 0.03), new THREE.Vector2(s * 0.22, s * 0.09), new THREE.Vector2(0, s * 0.1)], 14), gold, 0, s * 0.3, 0); guard.scale.z = 0.35; add(guard);
      const bl = mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(s * 0.11, 0), new THREE.Vector2(s * 0.09, s * 1.1), new THREE.Vector2(0, s * 1.45)], 4), steel, 0, s * 0.38, 0); bl.scale.z = 0.25; bl.rotation.y = Math.PI / 4; add(bl);
      add(mesh(boxGeo(s * 0.02, s * 1.0, s * 0.06), toon(0x9aa5b1, { metalness: 0.9, roughness: 0.2 }), 0, s * 0.95, 0));
      break;
    }
      break;
    case 'dagger':
      add(mesh(cylGeo(s * 0.05, s * 0.06, s * 0.3, 8), wood, 0, s * 0.08, 0));
      add(mesh(boxGeo(s * 0.28, s * 0.06, s * 0.1), dark, 0, s * 0.24, 0));
      add(mesh(boxGeo(s * 0.12, s * 0.6, s * 0.035), steel, 0, s * 0.55, 0));
      add(mesh(coneGeo(s * 0.06, s * 0.16, 4), steel, 0, s * 0.93, 0)).rotation.y = Math.PI / 4;
      break;
    case 'spear':
      add(mesh(cylGeo(s * 0.045, s * 0.05, s * 2.3, 7), wood, 0, s * 0.7, 0));
      add(mesh(cylGeo(s * 0.07, s * 0.07, s * 0.12, 7), gold, 0, s * 1.8, 0));
      add(mesh(coneGeo(s * 0.13, s * 0.5, 4), steel, 0, s * 2.1, 0)).rotation.y = Math.PI / 4;
      for (let i = 0; i < 2; i++) add(mesh(boxGeo(s * 0.03, s * 0.25, s * 0.03), toon(0xd94a4a), s * 0.06 * (i ? 1 : -1), s * 1.72, 0));
      break;
    case 'lance':
      add(mesh(cylGeo(s * 0.035, s * 0.16, s * 2.8, 10), toon(0xe9dfbf), 0, s * 1.1, 0));
      add(mesh(cylGeo(s * 0.34, s * 0.34, s * 0.06, 12), acc, 0, s * 0.15, 0));
      add(mesh(coneGeo(s * 0.05, s * 0.3, 6), steel, 0, s * 2.6, 0));
      for (let i = 0; i < 3; i++) add(mesh(cylGeo(s * 0.1 - i * s * 0.02, s * 0.1 - i * s * 0.02, s * 0.12, 10), i % 2 ? acc : toon(0x2f3e5c), 0, s * 0.55 + i * s * 0.5, 0));
      break;
    case 'bow': {
      const lacq = toon(0x8a2a1a, { roughness: 0.3 }); mats.push(lacq);
      const bow = add(mesh(torusGeo(s * 0.75, s * 0.04, Math.PI * 1.25, 20), lacq, 0, s * 0.4, 0));
      bow.rotation.z = -Math.PI * 0.625 + Math.PI / 2;
      add(mesh(cylGeo(s * 0.06, s * 0.06, s * 0.3, 12), toon(0x3a2a1e), 0, s * 0.4, 0));
      add(mesh(cylGeo(s * 0.008, s * 0.008, s * 1.4, 4), toon(0xf5f5f5), s * 0.33, s * 0.4, 0));
      add(mesh(sphereGeo(s * 0.05, 8), gold, 0, s * 0.4, 0));
      break;
    }
    case 'rifle': {
      const bronze = toon(0xb9842e, { metalness: 0.85, roughness: 0.3 }); mats.push(bronze);
      add(mesh(new THREE.CapsuleGeometry(s * 0.09, s * 0.5, 4, 12), wood, 0, s * 0.25, 0));
      add(mesh(cylGeo(s * 0.11, s * 0.13, s * 0.5, 14), dark, 0, s * 0.75, 0));
      add(mesh(cylGeo(s * 0.08, s * 0.1, s * 1.3, 14), bronze, 0, s * 1.4, 0));
      for (let i = 0; i < 3; i++) attach(grp, mesh(torusGeo(s * 0.11, s * 0.02, 6, 16), gold, 0, s * 0.9 + i * s * 0.4, 0)).rotation.x = Math.PI / 2;
      add(mesh(cylGeo(s * 0.13, s * 0.1, s * 0.16, 14), bronze, 0, s * 2.08, 0));
      add(mesh(sphereGeo(s * 0.06, 10), mat(accent, { emissive: accent, emissiveIntensity: 2.5, flat: false }), 0, s * 2.12, 0));
      break;
    }
    case 'staff': {
      const lacq = toon(0x3b2a5a, { roughness: 0.35 }); mats.push(lacq);
      add(mesh(cylGeo(s * 0.05, s * 0.065, s * 2.1, 14), lacq, 0, s * 0.85, 0));
      for (let i = 0; i < 3; i++) attach(grp, mesh(torusGeo(s * 0.07, s * 0.015, 6, 14), gold, 0, s * 0.3 + i * s * 0.7, 0)).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const claw = mesh(new THREE.CapsuleGeometry(s * 0.025, s * 0.3, 4, 8), gold, Math.cos(i * 2.1) * s * 0.14, s * 1.98, Math.sin(i * 2.1) * s * 0.14); claw.rotation.z = -Math.cos(i * 2.1) * 0.45; claw.rotation.x = Math.sin(i * 2.1) * 0.45; add(claw); }
      add(mesh(sphereGeo(s * 0.2, 18), mat(accent, { emissive: accent, emissiveIntensity: 2.4, flat: false, roughness: 0.2, metalness: 0.1 }), 0, s * 2.1, 0));
      attach(grp, mesh(torusGeo(s * 0.26, s * 0.015, 6, 24), gold, 0, s * 2.1, 0)).rotation.x = Math.PI / 2;
      break;
    }
    case 'axe': {
      // 程咬金 / 典韦 great axe: lacquered haft, crescent blades with a gold spine
      const lacq = toon(0x5a1a1a, { roughness: 0.3 }); mats.push(lacq);
      add(mesh(cylGeo(s * 0.055, s * 0.07, s * 1.7, 14), lacq, 0, s * 0.65, 0));
      for (let i = 0; i < 3; i++) attach(grp, mesh(torusGeo(s * 0.075, s * 0.014, 6, 14), gold, 0, s * 0.1 + i * s * 0.45, 0)).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        const blade = mesh(new THREE.CylinderGeometry(s * 0.5, s * 0.5, s * 0.05, 24, 1, false, 0, Math.PI * 0.9), steel, side * s * 0.08, s * 1.25, 0);
        blade.rotation.x = Math.PI / 2; blade.rotation.z = side > 0 ? -Math.PI * 0.45 : Math.PI * 0.55; add(blade);
      }
      add(mesh(cylGeo(s * 0.11, s * 0.11, s * 0.5, 12), gold, 0, s * 1.25, 0));
      add(mesh(new THREE.ConeGeometry(s * 0.05, s * 0.3, 10), gold, 0, s * 1.65, 0));
      break;
    }
    case 'hammer': {
      const bronze = toon(0x9a7a3a, { metalness: 0.85, roughness: 0.35 }); mats.push(bronze);
      add(mesh(cylGeo(s * 0.06, s * 0.075, s * 1.5, 14), toon(0x3a2a1e, { roughness: 0.6 }), 0, s * 0.55, 0));
      for (let i = 0; i < 3; i++) attach(grp, mesh(torusGeo(s * 0.08, s * 0.015, 6, 14), gold, 0, s * 0.2 + i * s * 0.35, 0)).rotation.x = Math.PI / 2;
      const head = mesh(cylGeo(s * 0.26, s * 0.26, s * 0.95, 16), bronze, 0, s * 1.3, 0); head.rotation.z = Math.PI / 2; add(head);
      for (const side of [-1, 1]) { attach(grp, mesh(torusGeo(s * 0.26, s * 0.035, 8, 20), gold, side * s * 0.4, s * 1.3, 0)).rotation.y = Math.PI / 2; add(mesh(sphereGeo(s * 0.12, 10), dark, side * s * 0.52, s * 1.3, 0)); }
      add(mesh(sphereGeo(s * 0.09, 10), mat(accent, { emissive: accent, emissiveIntensity: 1.8, flat: false }), 0, s * 1.3, s * 0.27));
      break;
    }
    case 'scythe': {
      add(mesh(cylGeo(s * 0.045, s * 0.05, s * 2.4, 7), toon(0x3a2a2a), 0, s * 0.9, 0));
      const blade = add(mesh(torusGeo(s * 0.7, s * 0.06, Math.PI * 0.75, 12), steel, s * 0.6, s * 2.0, 0));
      blade.rotation.z = Math.PI * 0.95; blade.scale.set(1, 0.6, 0.35);
      add(mesh(boxGeo(s * 0.9, s * 0.16, s * 0.04), steel, s * 0.5, s * 2.0, 0)).rotation.z = -0.35;
      break;
    }
    case 'orb': {
      add(mesh(sphereGeo(s * 0.24, 20), mat(accent, { emissive: accent, emissiveIntensity: 2.2, flat: false, roughness: 0.15, metalness: 0.05 }), 0, s * 0.5, 0));
      add(mesh(sphereGeo(s * 0.3, 20), mat(accent, { emissive: accent, emissiveIntensity: 0.8, flat: false, transparent: true, opacity: 0.3 }), 0, s * 0.5, 0));
      attach(grp, mesh(torusGeo(s * 0.4, s * 0.025, 8, 28), gold, 0, s * 0.5, 0)).rotation.x = Math.PI / 2.5;
      attach(grp, mesh(torusGeo(s * 0.36, s * 0.02, 8, 28), gold, 0, s * 0.5, 0)).rotation.set(Math.PI / 2, 0.9, 0);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; add(mesh(new THREE.OctahedronGeometry(s * 0.05, 0), gold, Math.cos(a) * s * 0.42, s * 0.5, Math.sin(a) * s * 0.42)); }
      break;
    }
    case 'bomb':
      add(mesh(sphereGeo(s * 0.34, 10), toon(0x1e2024), 0, s * 0.34, 0));
      add(mesh(cylGeo(s * 0.09, s * 0.09, s * 0.12, 8), toon(0x555a60), 0, s * 0.7, 0));
      add(mesh(cylGeo(s * 0.025, s * 0.025, s * 0.28, 5), toon(0xb08a52), s * 0.06, s * 0.88, 0)).rotation.z = -0.4;
      add(mesh(sphereGeo(s * 0.06, 6), mat(0xffb347, { emissive: 0xff8c00, emissiveIntensity: 3.5 }), s * 0.12, s * 1.0, 0));
      break;
    case 'book':
      add(mesh(rboxGeo(s * 0.62, s * 0.78, s * 0.16, s * 0.02), acc, 0, s * 0.38, 0));
      add(mesh(boxGeo(s * 0.5, s * 0.66, s * 0.18), toon(0xfff8e0), 0, s * 0.38, 0));
      add(mesh(boxGeo(s * 0.2, s * 0.24, s * 0.02), gold, 0, s * 0.42, s * 0.09));
      break;
    case 'shield':
      add(mesh(cylGeo(s * 0.55, s * 0.55, s * 0.07, 8), acc, 0, s * 0.4, 0));
      add(mesh(cylGeo(s * 0.44, s * 0.44, s * 0.03, 8), toon(0xdde3ea), 0, s * 0.4, s * 0.05));
      add(mesh(sphereGeo(s * 0.1, 8), gold, 0, s * 0.4, s * 0.06));
      break;
    case 'none':
      break;
  }
  return grp;
}
