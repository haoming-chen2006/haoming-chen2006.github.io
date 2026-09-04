import * as THREE from 'three';
import type { BuildingDef, Look, Team } from '../game/types.ts';
import { TEAM_HEX, boxGeo, buildWeapon, coneGeo, cylGeo, mat, attach, mergeByMaterial, mesh, rboxGeo, sphereGeo, toon, torusGeo, type UnitMat } from './model_kit.ts';
import { buildBeast, buildBrute, buildDragon, buildFlyer, buildHumanoid, buildWraith, type UnitParts } from './models_units.ts';
import { bannerTexture, stoneTexture } from './textures.ts';

export { TEAM_HEX, buildWeapon, mat, toon };
export type { UnitMat, UnitParts };

export interface UnitModel {
  root: THREE.Group;
  body: THREE.Group;
  parts: UnitParts;
  mats: UnitMat[];
  height: number;
  eyeHeight: number;
  ring: THREE.Mesh;
  hover: number;
  kind: Look['shape'];
  /** Per-instance idle phase offset and size multiplier (from the seed). */
  phase: number;
  scaleMul: number;
  heroMarker?: THREE.Group;
}

const ringGeos = new Map<number, THREE.RingGeometry>();
function teamRing(r: number, team: Team): THREE.Mesh {
  const key = Math.round(r * 100);
  let geo = ringGeos.get(key);
  if (!geo) { geo = new THREE.RingGeometry(r * 0.82, r * 1.1, 28); ringGeos.set(key, geo); }
  const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: TEAM_HEX[team], transparent: true, opacity: 0.55, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  return ring;
}

const seedRand = (seed: number, k: number): number => { const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };

export function buildUnitModel(look: Look, team: Team, seed = 0): UnitModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  let built;
  switch (look.shape) {
    case 'humanoid': built = buildHumanoid(look, team); break;
    case 'skeleton': built = buildHumanoid(look, team, { bone: true }); break;
    case 'brute': built = buildBrute(look, team); break;
    case 'flyer': built = buildFlyer(look, team); break;
    case 'dragon': built = buildDragon(look, team); break;
    case 'beast': built = buildBeast(look, team); break;
    case 'wraith': built = buildWraith(look, team); break;
    case 'building': built = buildHumanoid(look, team); break;
  }
  body.add(built.grp);
  optimizeUnit(built.parts);
  // subtle per-instance variety so a horde doesn't look cloned: size ±6%, brightness ±6%, idle phase
  const scaleMul = seed ? 0.94 + seedRand(seed, 1) * 0.12 : 1;
  const phase = seed ? seedRand(seed, 2) * 6.28 : 0;
  if (seed) { const b = 0.94 + seedRand(seed, 3) * 0.12; for (const m of built.mats) if ((m as THREE.MeshToonMaterial).isMeshToonMaterial) m.color.multiplyScalar(b); }
  body.scale.setScalar(scaleMul);
  const ring = teamRing(Math.max(0.35, look.size * 1.2), team);
  root.add(ring);
  return { root, body, parts: built.parts, mats: built.mats, height: built.height * scaleMul, eyeHeight: built.eye * scaleMul, ring, hover: built.hover, kind: look.shape, phase, scaleMul };
}

/** Floating crown marker so champions read from the commander camera (gold = player, crimson = enemy). */
export function setHeroLook(m: UnitModel, on: boolean, team: Team): void {
  if (!on) { if (m.heroMarker) { m.root.remove(m.heroMarker); m.heroMarker = undefined; } return; }
  if (m.heroMarker) return;
  const col = team === 0 ? 0xffd54a : 0xff4d4d;
  const gm = mat(col, { metalness: 0.6, roughness: 0.35, emissive: col, emissiveIntensity: 0.9, flat: false });
  m.mats.push(gm);
  const g = new THREE.Group();
  const r = 0.22;
  attach(g, mesh(torusGeo(r, 0.035, Math.PI * 2, 18), gm)).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(mesh(coneGeo(0.045, 0.16, 4), gm, Math.cos(a) * r, 0.1, Math.sin(a) * r)); }
  g.position.y = m.height + m.hover + 0.35;
  g.userData.baseY = g.position.y;
  m.root.add(g);
  m.heroMarker = g;
}

/** Wave the cloth banners on a tower (call every frame). */
export function animateTowerFlags(model: TowerModel, time: number): void {
  if (!model.flags) return;
  for (let i = 0; i < model.flags.length; i++) {
    const f = model.flags[i];
    const pos = f.geometry.attributes.position as THREE.BufferAttribute;
    const w = (f.geometry as THREE.PlaneGeometry).parameters.width;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v), y = pos.getY(v);
      pos.setZ(v, Math.sin(time * 3.2 + x * 3.5 + i * 1.7) * 0.07 * (x + w / 2) + Math.sin(time * 5 + y * 4) * 0.015);
    }
    pos.needsUpdate = true;
  }
}

/** Merge the static meshes inside each animated pivot so a unit costs ~half the draw calls. */
function optimizeUnit(p: UnitParts): void {
  const keep = new Set<THREE.Object3D>();
  for (const o of [p.cape, p.elbowL, p.elbowR, p.wingL, p.wingR, p.tail, p.neck, p.jaw, p.head, p.mount, p.rider, p.legL, p.legR, p.armL, p.armR, p.orb, ...(p.legs ?? []), ...(p.shards ?? []), ...(p.flaps ?? []), ...(p.tailSegs ?? [])]) if (o) keep.add(o);
  const targets = [p.torso, p.head, p.legL, p.legR, p.armL, p.armR, p.elbowL, p.elbowR, p.mount, p.neck, ...(p.legs ?? []), ...(p.tailSegs ?? [])];
  for (const t of targets) if (t) mergeByMaterial(t, keep);
}

export interface UnitAnim {
  moving: boolean; speed: number; attackAnim: number; time: number; stunned: boolean; frozen: boolean; deployProgress: number; hover: number; hero: boolean;
}

const easeOutBack = (t: number): number => { const c = Math.min(1, Math.max(0, t)); const s = 1.70158; return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2); };

/** Attack curve: windup back, fast strike forward, recover. `ph` runs 0..1 over the swing. */
function strikeCurve(ph: number): number {
  if (ph < 0.3) return -0.9 * (ph / 0.3);
  if (ph < 0.55) return -0.9 + 2.6 * ((ph - 0.3) / 0.25);
  return 1.7 * (1 - (ph - 0.55) / 0.45);
}

/** Drive the per-frame pose of a unit model (transform hierarchy only, no skinning). */
export function animateUnit(m: UnitModel, a: UnitAnim): void {
  const t = a.time + m.phase;
  const p = m.parts;
  const dp = a.deployProgress;
  m.body.scale.setScalar((dp < 1 ? 0.15 + 0.85 * easeOutBack(dp) : 1) * m.scaleMul);
  if (m.heroMarker) { m.heroMarker.rotation.y = t * 1.6; m.heroMarker.position.y = (m.heroMarker.userData.baseY as number) + Math.sin(t * 2.6) * 0.06; }
  (m.ring.material as THREE.MeshBasicMaterial).opacity = a.hero ? 0.9 : 0.5;
  if (a.frozen) return; // frozen units keep their last pose
  const walkF = 6.5 + a.speed * 3.2;
  const swing = a.moving ? Math.sin(t * walkF) : 0;
  const bob = a.moving ? Math.abs(Math.sin(t * walkF)) * 0.07 : Math.sin(t * 2.1) * 0.02;
  const hoverBob = m.hover > 0 ? Math.sin(t * 3.2 + m.root.id * 0.7) * 0.14 : 0;
  const ph = a.attackAnim > 0 ? 1 - a.attackAnim : -1;
  const strike = ph >= 0 ? strikeCurve(ph) : 0;
  const strikeAmt = ph >= 0 ? Math.sin(Math.min(1, ph / 0.55) * Math.PI) : 0;
  m.body.position.y = bob + m.hover + hoverBob;

  switch (m.kind) {
    case 'humanoid': case 'skeleton': case 'building': case 'brute': {
      if (p.legL && p.legR) { p.legL.rotation.z = swing * 0.75; p.legR.rotation.z = -swing * 0.75; }
      const restR = p.weapon ? -0.35 : 0.1, restL = p.twoHanded ? 0.6 : 0.1;
      if (p.armR) p.armR.rotation.z = restR - swing * 0.45 + (p.ranged ? strikeAmt * 1.4 : strike);
      if (p.armL) p.armL.rotation.z = restL + swing * 0.45 + (p.twoHanded ? (p.ranged ? strikeAmt * 1.2 : strike * 0.8) : -strikeAmt * 0.3);
      if (p.elbowR) p.elbowR.rotation.z = 0.35 + (p.ranged ? -strikeAmt * 0.3 : Math.max(0, -strike) * 0.9 + Math.max(0, strike) * 0.2);
      if (p.elbowL) p.elbowL.rotation.z = (p.twoHanded ? 1.2 : 0.35) + swing * 0.15;
      if (p.torso) {
        p.torso.rotation.z = (a.moving ? -0.07 : 0) - strike * 0.12;
        p.torso.rotation.y = -strike * 0.18 + (a.moving ? swing * 0.05 : 0);
        p.torso.scale.y = 1 + (a.moving ? 0 : Math.sin(t * 2.1) * 0.015);
      }
      if (p.head) { p.head.rotation.y = a.stunned ? Math.sin(t * 12) * 0.45 : (a.moving ? -swing * 0.06 : Math.sin(t * 0.8) * 0.08); p.head.rotation.z = a.stunned ? Math.sin(t * 9) * 0.15 : 0; }
      if (p.cape) p.cape.rotation.z = -(a.moving ? 0.45 + Math.sin(t * walkF * 0.5) * 0.12 : 0.08 + Math.sin(t * 1.7) * 0.05);
      if (a.stunned && p.torso) p.torso.rotation.x = Math.sin(t * 9) * 0.1;
      break;
    }
    case 'flyer': {
      const flap = Math.sin(t * 20) * 0.75;
      if (p.wingL) p.wingL.rotation.x = -flap - 0.2;
      if (p.wingR) p.wingR.rotation.x = flap + 0.2;
      if (p.torso) { p.torso.rotation.z = (a.moving ? -0.25 : Math.sin(t * 2) * 0.05) - strikeAmt * 0.5; p.torso.rotation.x = Math.sin(t * 3) * 0.05; }
      if (p.tailSegs) p.tailSegs.forEach((s, i) => { s.rotation.y = Math.sin(t * 5 - i * 0.8) * 0.35; });
      if (p.legs) p.legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 4 + i) * 0.2 + 0.3; });
      break;
    }
    case 'dragon': {
      const flap = Math.sin(t * 8) * 0.55;
      if (p.wingL) p.wingL.rotation.x = -flap - 0.15;
      if (p.wingR) p.wingR.rotation.x = flap + 0.15;
      if (p.torso) { p.torso.rotation.z = Math.sin(t * 2) * 0.04 + (a.moving ? -0.1 : 0) - strikeAmt * 0.15; }
      if (p.neck) p.neck.rotation.z = Math.sin(t * 1.5) * 0.06 - strikeAmt * 0.35;
      if (p.jaw) p.jaw.rotation.z = strikeAmt * 0.6;
      if (p.tailSegs) p.tailSegs.forEach((s, i) => { s.rotation.y = Math.sin(t * 3 - i * 0.7) * 0.28; s.rotation.z = Math.sin(t * 1.8 - i * 0.5) * 0.08; });
      if (p.legs) p.legs.forEach((l, i) => { l.rotation.z = 0.35 + Math.sin(t * 2 + i) * 0.1; });
      break;
    }
    case 'beast': {
      const gallop = a.moving ? Math.sin(t * walkF) : 0;
      if (p.legs) p.legs.forEach((l, i) => { const front = i < 2; l.rotation.z = (front ? 1 : -1) * gallop * 0.7 + (i % 2 ? 0.1 : -0.1) * gallop; });
      if (p.mount) { p.mount.position.y = a.moving ? Math.abs(Math.sin(t * walkF)) * 0.1 : 0; p.mount.rotation.z = a.moving ? -gallop * 0.06 : 0; }
      if (p.head) { p.head.rotation.z = (a.moving ? gallop * 0.12 : Math.sin(t * 1.5) * 0.06) - strikeAmt * 0.3; }
      if (p.tail) p.tail.rotation.y = Math.sin(t * 6) * 0.4;
      if (p.rider) p.rider.position.y = (p.rider.userData.baseY ??= p.rider.position.y) + (a.moving ? Math.abs(Math.sin(t * walkF + 0.5)) * 0.08 : 0);
      if (p.armR) p.armR.rotation.z = -0.5 + strike * 1.1;
      if (p.elbowR) p.elbowR.rotation.z = 0.5 + Math.max(0, -strike) * 0.6;
      if (p.armL) p.armL.rotation.z = -0.6 + Math.sin(t * 2) * 0.05;
      if (p.elbowL) p.elbowL.rotation.z = 1.1;
      if (p.cape) p.cape.rotation.z = -(a.moving ? 0.5 + Math.sin(t * walkF * 0.5) * 0.15 : 0.1);
      break;
    }
    case 'wraith': {
      if (p.torso) { p.torso.rotation.y = Math.sin(t * 1.6) * 0.12; p.torso.rotation.z = (a.moving ? -0.18 : Math.sin(t * 2.3) * 0.04) - strikeAmt * 0.2; }
      if (p.flaps) p.flaps.forEach((f, i) => { f.rotation.x = Math.sin(t * 3 + i * 0.9) * 0.35 + (a.moving ? 0.5 : 0.15); });
      if (p.shards) p.shards.forEach((sh, i) => { const ang = t * 1.6 + (i / p.shards!.length) * Math.PI * 2; const r = 0.9 + Math.sin(t * 2 + i) * 0.15; sh.position.set(Math.cos(ang) * r, 1.3 + Math.sin(t * 2.5 + i * 1.3) * 0.3, Math.sin(ang) * r); sh.rotation.set(t * 2 + i, t * 1.5, 0); });
      if (p.armR) p.armR.rotation.z = 0.3 + strike * 1.3;
      if (p.armL) p.armL.rotation.z = 0.3 + Math.sin(t * 2) * 0.1 - strikeAmt * 0.4;
      if (p.head) p.head.rotation.y = a.stunned ? Math.sin(t * 12) * 0.4 : Math.sin(t * 0.9) * 0.1;
      break;
    }
  }
}

export function setTint(m: UnitModel, emissive: number, intensity: number): void {
  for (const mm of m.mats) { mm.emissive.setHex(emissive); mm.emissiveIntensity = intensity; }
}

/** Dispose per-instance (merged) geometries under an object; shared cached geometries are left alone. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.userData.ownGeo && m.geometry) m.geometry.dispose();
  });
}

export function disposeModel(m: UnitModel): void {
  for (const mm of m.mats) mm.dispose();
  (m.ring.material as THREE.Material).dispose();
  disposeObject(m.root);
}

/* ---------- structures ---------- */

let stoneTex: THREE.Texture | null = null;
let stoneDarkTex: THREE.Texture | null = null;
const getStone = () => (stoneTex ??= stoneTexture(256, [172, 170, 168]));
const getStoneDark = () => (stoneDarkTex ??= stoneTexture(256, [120, 122, 128]));
const bannerCache = new Map<string, THREE.Texture>();
const getBanner = (team: Team) => { const k = String(team); let t = bannerCache.get(k); if (!t) { t = bannerTexture(team === 0 ? '#2f7fd6' : '#d63b3b'); bannerCache.set(k, t); } return t; };

export interface TowerModel { root: THREE.Group; turret: THREE.Object3D; crown?: THREE.Object3D; mats: UnitMat[]; top: number; height: number; flag?: THREE.Object3D; flags?: THREE.Mesh[] }

function bannerMesh(team: Team, w: number, h: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h, 6, 1);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: getBanner(team), side: THREE.DoubleSide, roughness: 0.9 }));
  m.castShadow = true;
  m.userData.ownGeo = true;
  return m;
}

export function buildTowerModel(type: 'king' | 'princess', team: Team, radius: number): TowerModel {
  const root = new THREE.Group();
  const mats: UnitMat[] = [];
  const h = type === 'king' ? 4.4 : 3.1;
  const stone = new THREE.MeshStandardMaterial({ map: getStone(), roughness: 0.92, metalness: 0 });
  stone.map!.repeat.set(3, 2);
  const stoneDark = new THREE.MeshStandardMaterial({ map: getStoneDark(), roughness: 0.95 });
  stoneDark.map!.repeat.set(2, 1);
  const trim = mat(0x6b6f76, { flat: false });
  const teamM = mat(TEAM_HEX[team], { emissive: TEAM_HEX[team], emissiveIntensity: 0.25, flat: false });
  const wood = mat(0x6b4a2b, { flat: false });
  const roofM = mat(team === 0 ? 0x2f5f9e : 0x8a2626, { flat: false });
  const slitM = mat(0x0f1216);
  mats.push(stone, stoneDark, trim, teamM, wood, roofM, slitM);
  const base = mesh(cylGeo(radius * 1.1, radius * 1.22, 0.55, 20), stoneDark, 0, 0.27, 0); base.receiveShadow = true; root.add(base);
  root.add(mesh(cylGeo(radius * 1.12, radius * 1.12, 0.12, 20), trim, 0, 0.6, 0));
  const shaft = mesh(cylGeo(radius * 0.94, radius * 1.02, h, 20), stone, 0, h / 2 + 0.6, 0); shaft.receiveShadow = true; root.add(shaft);
  // arrow slits + string course
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const slit = mesh(boxGeo(0.14, 0.75, 0.06), slitM, Math.cos(a) * radius * 0.97, h * 0.55 + 0.6, Math.sin(a) * radius * 0.97); slit.rotation.y = -a + Math.PI / 2; root.add(slit); }
  root.add(mesh(cylGeo(radius * 1.03, radius * 1.03, 0.16, 20), trim, 0, h * 0.35 + 0.6, 0));
  root.add(mesh(cylGeo(radius * 1.06, radius * 1.06, 0.28, 20), teamM, 0, h * 0.35 + 0.82, 0)); // team band
  // machicolation + battlement platform
  root.add(mesh(cylGeo(radius * 1.16, radius * 0.98, 0.5, 20), stoneDark, 0, h + 0.62, 0));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; root.add(mesh(boxGeo(0.18, 0.28, 0.18), trim, Math.cos(a) * radius * 1.05, h + 0.42, Math.sin(a) * radius * 1.05)); }
  const platform = mesh(cylGeo(radius * 1.16, radius * 1.16, 0.22, 20), trim, 0, h + 0.98, 0); root.add(platform);
  const n = type === 'king' ? 14 : 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = mesh(rboxGeo(0.4, 0.5, 0.42, 0.05), stoneDark, Math.cos(a) * radius * 1.02, h + 1.32, Math.sin(a) * radius * 1.02);
    c.rotation.y = -a; root.add(c);
  }
  const turret = new THREE.Group();
  turret.position.y = h + 1.1;
  root.add(turret);
  let crown: THREE.Object3D | undefined;
  const flags: THREE.Mesh[] = [];
  if (type === 'king') {
    // throne dome + crown + cannon
    const dome = mesh(sphereGeo(radius * 0.62, 18), roofM, 0, 0.1, 0); dome.scale.y = 0.75; attach(root, dome).position.y = h + 1.2;
    root.add(mesh(cylGeo(radius * 0.66, radius * 0.7, 0.2, 18), trim, 0, h + 1.2, 0));
    const gold = mat(0xffd54a, { metalness: 0.7, roughness: 0.3, emissive: 0xffb300, emissiveIntensity: 0.3, flat: false });
    mats.push(gold);
    const cg = new THREE.Group();
    cg.add(mesh(cylGeo(radius * 0.36, radius * 0.32, 0.3, 10), gold, 0, 0.15, 0));
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; cg.add(mesh(coneGeo(0.12, 0.55, 4), gold, Math.cos(a) * radius * 0.32, 0.5, Math.sin(a) * radius * 0.32)); cg.add(mesh(sphereGeo(0.06, 6), mat(0xff4d6d, { emissive: 0xff2050, emissiveIntensity: 1.5 }), Math.cos(a) * radius * 0.32, 0.3, Math.sin(a) * radius * 0.32)); }
    cg.position.y = h + 1.2 + radius * 0.48;
    root.add(cg);
    crown = cg;
    const cannon = new THREE.Group();
    attach(cannon, mesh(cylGeo(0.17, 0.22, 1.6, 10), mat(0x2b2f36, { metalness: 0.6, roughness: 0.4, flat: false }), 0.95, 0.4, 0)).rotation.z = -Math.PI / 2;
    attach(cannon, mesh(torusGeo(0.24, 0.05, Math.PI * 2, 12), mat(0xe9c46a, { metalness: 0.7, roughness: 0.3, flat: false }), 1.55, 0.4, 0)).rotation.y = Math.PI / 2;
    cannon.add(mesh(rboxGeo(0.5, 0.35, 0.6, 0.06), wood, 0.5, 0.18, 0));
    cannon.position.set(radius * 0.25, 0, 0);
    turret.add(cannon);
  } else {
    // roofed archer post
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; turret.add(mesh(cylGeo(0.07, 0.07, 1.5, 6), wood, Math.cos(a) * radius * 0.55, 0.75, Math.sin(a) * radius * 0.55)); }
    const roof = mesh(coneGeo(radius * 0.85, 0.9, 8), roofM, 0, 1.9, 0); turret.add(roof);
    turret.add(mesh(cylGeo(radius * 0.9, radius * 0.9, 0.08, 8), trim, 0, 1.48, 0));
    turret.add(mesh(sphereGeo(0.1, 6), mat(0xe9c46a, { metalness: 0.6, flat: false }), 0, 2.4, 0));
    const archer = buildHumanoid({ color: team === 0 ? '#3d9bff' : '#ff4d4d', accent: '#2a2a2a', shape: 'humanoid', weapon: 'bow', size: 0.34 }, team);
    turret.add(archer.grp);
    mats.push(...archer.mats);
  }
  // banner pole with cloth
  const pole = mesh(cylGeo(0.05, 0.05, 2.3, 6), wood, radius * 0.7, h + 2.1, radius * 0.7);
  root.add(pole);
  const flag = bannerMesh(team, 0.9, 0.6);
  flag.position.set(radius * 0.7 + 0.46, h + 3.0, radius * 0.7);
  root.add(flag);
  flags.push(flag);
  const keep = new Set<THREE.Object3D>([turret, flag]);
  if (crown) keep.add(crown);
  mergeByMaterial(root, keep);
  return { root, turret, crown, mats, top: h + 1.1, height: h + 1.5, flag, flags };
}

export interface BuildingModel { root: THREE.Group; turret: THREE.Object3D; mats: UnitMat[]; height: number; orb?: THREE.Mesh }

export function buildBuildingModel(def: BuildingDef, team: Team): BuildingModel {
  const root = new THREE.Group();
  const mats: UnitMat[] = [];
  const r = def.radius;
  const teamM = mat(TEAM_HEX[team], { emissive: TEAM_HEX[team], emissiveIntensity: 0.25 });
  const stoneM = new THREE.MeshStandardMaterial({ map: getStoneDark(), roughness: 0.95 });
  const wood = mat(0x8a6d3b), woodDark = mat(0x5a3f26), metal = mat(0x2b2f36, { metalness: 0.6, roughness: 0.4 }), iron = mat(0x4a4f57, { metalness: 0.5 });
  mats.push(teamM, stoneM, wood, woodDark, metal, iron);
  const base = mesh(cylGeo(r * 1.1, r * 1.2, 0.3, 14), stoneM, 0, 0.15, 0); base.receiveShadow = true; root.add(base);
  root.add(mesh(cylGeo(r * 1.12, r * 1.12, 0.08, 14), teamM, 0, 0.32, 0));
  const turret = new THREE.Group();
  turret.position.y = 0.36;
  root.add(turret);
  let orb: THREE.Mesh | undefined;
  let height = 1.2;
  if (def.id === 'cannon') {
    // wooden carriage on two spoked wheels, iron-banded barrel
    for (const side of [-1, 1]) {
      attach(turret, mesh(rboxGeo(r * 1.5, r * 0.25, r * 0.14, 0.02), wood, 0, r * 0.45, side * r * 0.55)).rotation.z = 0.2;
      const wheel = mesh(cylGeo(r * 0.5, r * 0.5, 0.1, 12), woodDark, -r * 0.1, r * 0.5, side * r * 0.72); wheel.rotation.x = Math.PI / 2; turret.add(wheel);
      attach(turret, mesh(torusGeo(r * 0.5, 0.035, Math.PI * 2, 16), iron, -r * 0.1, r * 0.5, side * r * 0.72)).rotation.x = 0;
      for (let k = 0; k < 4; k++) { const spoke = mesh(boxGeo(0.05, r * 0.95, 0.05), wood, -r * 0.1, r * 0.5, side * r * 0.72); spoke.rotation.z = (k / 4) * Math.PI; turret.add(spoke); }
    }
    attach(turret, mesh(cylGeo(0.06, 0.06, r * 1.7, 8), iron, -r * 0.1, r * 0.5, 0)).rotation.x = Math.PI / 2;
    const barrel = mesh(cylGeo(r * 0.2, r * 0.27, r * 1.9, 12), metal, r * 0.55, r * 0.78, 0);
    barrel.rotation.z = -Math.PI / 2 + 0.18; turret.add(barrel);
    attach(turret, mesh(torusGeo(r * 0.27, 0.04, Math.PI * 2, 12), iron, r * 1.35, r * 0.93, 0)).rotation.y = Math.PI / 2 - 0.18;
    turret.add(mesh(sphereGeo(r * 0.24, 8), metal, -r * 0.4, r * 0.62, 0));
    height = r * 1.7;
  } else if (def.id === 'arctower') {
    const copper = mat(0xb87333, { metalness: 0.7, roughness: 0.35 });
    mats.push(copper);
    turret.add(mesh(cylGeo(r * 0.35, r * 0.5, 0.5, 10), stoneM, 0, 0.25, 0));
    turret.add(mesh(cylGeo(r * 0.22, r * 0.3, 1.5, 10), metal, 0, 1.2, 0));
    for (let i = 0; i < 5; i++) attach(turret, mesh(torusGeo(r * 0.36, 0.04, Math.PI * 2, 16), copper, 0, 0.7 + i * 0.22, 0)).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const fin = mesh(boxGeo(0.06, 0.6, 0.4), metal, Math.cos(a) * r * 0.5, 2.05, Math.sin(a) * r * 0.5); fin.rotation.y = -a; turret.add(fin); }
    turret.add(mesh(cylGeo(r * 0.25, r * 0.2, 0.25, 8), copper, 0, 2.05, 0));
    orb = mesh(sphereGeo(r * 0.48, 14), mat(0xbfe6ff, { emissive: 0x7ec8ff, emissiveIntensity: 3.5, flat: false }), 0, 2.55, 0);
    mats.push(orb.material as THREE.MeshStandardMaterial);
    turret.add(orb);
    attach(turret, mesh(torusGeo(r * 0.62, 0.03, Math.PI * 2, 20), copper, 0, 2.55, 0)).rotation.x = Math.PI / 2.4;
    height = 3.1;
  } else {
    // barracks: a striped canvas tent with an open flap, poles, a training dummy and a banner
    const cloth = mat(0xc9b48a), stripe = mat(TEAM_HEX[team]);
    mats.push(cloth, stripe);
    const tent = mesh(coneGeo(r * 1.2, r * 2.0, 8), cloth, 0, r * 1.0, 0); turret.add(tent);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 8; const st = mesh(boxGeo(0.06, r * 1.9, 0.18), stripe, Math.cos(a) * r * 0.6, r * 0.95, Math.sin(a) * r * 0.6); st.rotation.y = -a; st.rotation.z = -Math.cos(a) * 0.55; st.rotation.x = Math.sin(a) * 0.55; turret.add(st); }
    turret.add(mesh(cylGeo(0.05, 0.06, r * 2.9, 6), woodDark, 0, r * 1.45, 0));
    turret.add(mesh(boxGeo(0.55, 0.36, 0.04), teamM, 0.3, r * 2.75, 0));
    turret.add(mesh(boxGeo(r * 0.6, r * 0.9, 0.05), mat(0x3a2a1a), r * 1.0, r * 0.45, 0)); // dark doorway
    // training dummy beside the tent
    const dummy = new THREE.Group(); dummy.position.set(-r * 1.0, 0, r * 0.9);
    dummy.add(mesh(cylGeo(0.05, 0.06, 1.1, 6), woodDark, 0, 0.55, 0));
    dummy.add(mesh(boxGeo(0.6, 0.06, 0.06), woodDark, 0, 0.85, 0));
    dummy.add(mesh(sphereGeo(0.16, 8), cloth, 0, 1.2, 0));
    dummy.add(mesh(rboxGeo(0.3, 0.4, 0.2, 0.05), cloth, 0, 0.75, 0));
    turret.add(dummy);
    height = r * 2.9;
  }
  return { root, turret, mats, height, orb };
}
