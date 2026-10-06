import * as THREE from 'three';
import type { Look, Team } from '../game/types.ts';
import { SKIN, TEAM_HEX, attach, buildWeapon, mesh, sphereGeo, toon, type UnitMat } from './model_kit.ts';
import type { BuiltUnit, UnitParts } from './models_units.ts';

/**
 * Smooth stylised humanoid in the 王者荣耀 proportion (tall, slender, big expressive eyes): capsules and lathes
 * instead of blocks, painted anime faces, flowing hair, lacquered/metallic armour with real reflections.
 * Rig conventions match the old builder (faces +x, legs/arms swing on rotation.z) so animation code is unchanged.
 */
const hex = (c: string | number): number => (typeof c === 'number' ? c : parseInt(c.replace('#', ''), 16));
const shade = (c: number, k: number): number => { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); };
const capsule = (r: number, len: number, seg = 10): THREE.CapsuleGeometry => new THREE.CapsuleGeometry(r, len, 4, seg);
const lathe = (pts: [number, number][], seg = 18, phi = Math.PI * 2): THREE.LatheGeometry => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, 0, phi);

const faceCache = new Map<string, THREE.CanvasTexture>();
/** Painted anime face wrapped on the head sphere (face centred at u = 0.5 which is +x on SphereGeometry). */
function faceTexture(skin: number, eye: number, angry: boolean): THREE.CanvasTexture {
  const key = `${skin}:${eye}:${angry}`;
  const hit = faceCache.get(key); if (hit) return hit;
  const W = 512, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const sk = new THREE.Color(skin);
  g.fillStyle = `#${sk.getHexString()}`; g.fillRect(0, 0, W, H);
  // soft blush + cheek shading
  const blush = g.createRadialGradient(W * 0.5, H * 0.62, 4, W * 0.5, H * 0.62, 90);
  blush.addColorStop(0, 'rgba(255,140,150,0.28)'); blush.addColorStop(1, 'rgba(255,140,150,0)');
  g.fillStyle = blush; g.fillRect(0, 0, W, H);
  const eyeCol = new THREE.Color(eye);
  for (const side of [-1, 1]) {
    const ex = W * 0.5 + side * W * 0.058, ey = H * 0.52;
    // white
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex, ey, 17, 24, 0, 0, Math.PI * 2); g.fill();
    // iris with gradient
    const ir = g.createRadialGradient(ex, ey + 4, 2, ex, ey + 4, 15);
    ir.addColorStop(0, `#${eyeCol.clone().multiplyScalar(1.6).getHexString()}`); ir.addColorStop(0.7, `#${eyeCol.getHexString()}`); ir.addColorStop(1, `#${eyeCol.clone().multiplyScalar(0.45).getHexString()}`);
    g.fillStyle = ir; g.beginPath(); g.ellipse(ex, ey + 4, 13, 17, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#101018'; g.beginPath(); g.ellipse(ex, ey + 5, 6, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(ex - 5, ey - 4, 4.5, 5.5, 0, 0, Math.PI * 2); g.fill();
    // upper lid + lashes
    g.strokeStyle = '#2a1a1a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.ellipse(ex, ey - 2, 19, 25, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    // brow
    g.lineWidth = 4; g.beginPath();
    if (angry) { g.moveTo(ex - side * 18, ey - 42); g.lineTo(ex + side * 14, ey - 34); } else { g.moveTo(ex - 16, ey - 40); g.quadraticCurveTo(ex, ey - 46, ex + 16, ey - 40); }
    g.stroke();
  }
  // small mouth
  g.strokeStyle = '#8a3a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(W * 0.5 - 7, H * 0.71); g.quadraticCurveTo(W * 0.5, H * 0.74 + (angry ? -2 : 2), W * 0.5 + 7, H * 0.71); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  faceCache.set(key, t);
  return t;
}

export function buildAnimeHumanoid(look: Look, team: Team, opts: { scale?: number; rider?: boolean; bone?: boolean; glowEyes?: number } = {}): BuiltUnit {
  const s = look.size * (opts.scale ?? 1);
  const mats: UnitMat[] = [];
  const grp = new THREE.Group();
  const parts: UnitParts = {};
  const body = hex(look.color), accent = hex(look.accent), teamHex = TEAM_HEX[team];
  const skinHex = look.skin ? hex(look.skin) : SKIN;
  const armor = look.armor ?? (look.weapon === 'sword' || look.weapon === 'lance' || look.weapon === 'axe' || look.weapon === 'shield' ? 'plate' : look.weapon === 'staff' || look.weapon === 'orb' || look.weapon === 'book' ? 'robe' : 'leather');
  const bodyM = toon(body, { roughness: 0.55 }), accM = toon(accent, { roughness: 0.5 }), skinM = toon(skinHex, { roughness: 0.75 });
  const darkM = toon(shade(body, 0.55), { roughness: 0.6 }), teamM = toon(teamHex, { emissive: teamHex, emissiveIntensity: 0.12, roughness: 0.5 });
  const metalM = toon(0xb9c2cc, { roughness: 0.28, metalness: 0.85 }), goldM = toon(0xe9c46a, { roughness: 0.3, metalness: 0.9, emissive: 0x3a2a05, emissiveIntensity: 0.15 });
  const leatherM = toon(0x6d4a2b, { roughness: 0.7 }), bootM = toon(0x3a2a1e, { roughness: 0.6 });
  const lacquerM = toon(shade(body, 0.85), { roughness: 0.3, metalness: 0.1 });
  mats.push(bodyM, accM, skinM, darkM, teamM, metalM, goldM, leatherM, bootM, lacquerM);
  const plate = armor === 'plate', robe = armor === 'robe';
  const ranged = look.weapon === 'bow' || look.weapon === 'rifle' || look.weapon === 'staff' || look.weapon === 'orb' || look.weapon === 'book' || look.weapon === 'bomb' || look.weapon === 'spear';
  const twoHanded = look.weapon === 'bow' || look.weapon === 'rifle' || look.weapon === 'axe' || look.weapon === 'scythe' || look.weapon === 'book' || look.weapon === 'none' || look.weapon === 'shield';
  parts.ranged = ranged; parts.twoHanded = twoHanded;

  // ---- legs (capsules), boots, hips
  const legH = s * 1.35, hip = legH;
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(0, hip, side * s * 0.24);
    piv.add(mesh(capsule(s * 0.15, legH * 0.55), darkM, 0, -legH * 0.35, 0));
    const shin = mesh(capsule(s * 0.13, legH * 0.42), plate ? metalM : darkM, 0, -legH * 0.74, 0); piv.add(shin);
    const boot = mesh(capsule(s * 0.15, s * 0.22), bootM, s * 0.09, -legH * 0.96, 0); boot.rotation.z = Math.PI / 2; piv.add(boot);
    if (robe) { /* the skirt hides the legs */ }
    grp.add(piv);
    if (side < 0) parts.legL = piv; else parts.legR = piv;
  }
  grp.add(mesh(lathe([[s * 0.3, 0], [s * 0.42, s * 0.08], [s * 0.4, s * 0.3], [s * 0.3, s * 0.4]]), darkM, 0, hip - s * 0.15, 0));

  // ---- torso: lathe with shoulders / waist / hips, then armour on top
  const torsoH = s * 1.2;
  const torso = new THREE.Group(); torso.position.y = hip + s * 0.2;
  const chestGeo = lathe([[s * 0.36, 0], [s * 0.34, torsoH * 0.35], [s * 0.44, torsoH * 0.72], [s * 0.46, torsoH * 0.9], [s * 0.3, torsoH]]);
  torso.add(mesh(chestGeo, plate ? metalM : robe ? bodyM : bodyM, 0, 0, 0));
  if (plate) {
    torso.add(mesh(lathe([[s * 0.38, torsoH * 0.3], [s * 0.5, torsoH * 0.62], [s * 0.5, torsoH * 0.88], [s * 0.34, torsoH * 0.96]], 20), lacquerM, 0, 0, 0)); // cuirass
    attach(torso, mesh(new THREE.TorusGeometry(s * 0.47, s * 0.035, 8, 24), goldM, 0, torsoH * 0.62, 0)).rotation.x = Math.PI / 2;
    torso.add(mesh(capsule(s * 0.05, torsoH * 0.5, 6), goldM, s * 0.47, torsoH * 0.62, 0)); // centre ridge
  } else if (robe) {
    torso.add(mesh(lathe([[s * 0.42, 0], [s * 0.44, torsoH * 0.5], [s * 0.4, torsoH * 0.95]], 20), accM, s * 0.02, 0, 0)); // inner robe layer
    torso.add(mesh(lathe([[s * 0.38, torsoH * 0.55], [s * 0.5, torsoH * 0.95], [s * 0.3, torsoH * 1.0]], 20), bodyM, 0, 0, 0)); // collar
  } else {
    torso.add(mesh(lathe([[s * 0.37, torsoH * 0.05], [s * 0.42, torsoH * 0.45], [s * 0.4, torsoH * 0.62]], 20), leatherM, 0, 0, 0)); // vest
    for (const side of [-1, 1]) torso.add(mesh(capsule(s * 0.04, torsoH * 0.6, 6), leatherM, s * 0.42, torsoH * 0.62, side * s * 0.3));
  }
  // sash / belt in team colour with a gold buckle
  attach(torso, mesh(new THREE.TorusGeometry(s * 0.37, s * 0.06, 8, 24), teamM, 0, torsoH * 0.12, 0)).rotation.x = Math.PI / 2;
  torso.add(mesh(sphereGeo(s * 0.08, 10), goldM, s * 0.4, torsoH * 0.12, 0));
  // pauldrons
  for (const side of [-1, 1]) {
    const p = mesh(sphereGeo(s * 0.26, 14), plate ? metalM : robe ? accM : leatherM, 0, torsoH - s * 0.02, side * s * 0.55);
    p.scale.set(1, 0.6, 1.1); torso.add(p);
    if (plate) attach(torso, mesh(new THREE.TorusGeometry(s * 0.22, s * 0.03, 8, 18), goldM, 0, torsoH - s * 0.02, side * s * 0.55)).rotation.x = Math.PI / 2;
  }
  // cape: a gently curved sheet
  if ((look.cape ?? plate) && !opts.rider) {
    const cape = new THREE.Group(); cape.position.set(-s * 0.4, torsoH - s * 0.02, 0);
    const sheet = mesh(lathe([[s * 0.55, 0], [s * 0.62, -torsoH * 0.5], [s * 0.72, -torsoH * 1.25], [s * 0.6, -torsoH * 1.35]], 10, Math.PI), teamM, s * 0.3, 0, 0);
    sheet.rotation.y = Math.PI; sheet.position.x = s * 0.1; sheet.material = toon(teamHex, { roughness: 0.7, side: THREE.DoubleSide }); mats.push(sheet.material as UnitMat);
    cape.add(sheet);
    cape.add(mesh(new THREE.TorusGeometry(s * 0.1, s * 0.03, 8, 14), goldM, s * 0.05, 0, 0));
    torso.add(cape); parts.cape = cape;
  }
  grp.add(torso); parts.torso = torso;

  // ---- neck + head with painted face
  grp.add(mesh(capsule(s * 0.09, s * 0.12, 8), skinM, 0, hip + s * 0.2 + torsoH + s * 0.04, 0));
  const headG = new THREE.Group(); headG.position.y = hip + s * 0.2 + torsoH + s * 0.1;
  const angry = plate || look.weapon === 'axe' || look.weapon === 'hammer';
  const faceM = new THREE.MeshStandardMaterial({ map: faceTexture(skinHex, opts.glowEyes ?? (look.hair ? hex(look.hair.color) : 0x3b2a6b), angry), roughness: 0.75 });
  mats.push(faceM);
  const head = mesh(new THREE.SphereGeometry(s * 0.42, 24, 18), faceM, 0, s * 0.4, 0); head.scale.set(0.95, 1.08, 0.98); headG.add(head);
  parts.eyes = [];
  headgear(look, s, headG, mats, { bodyM, accM, teamM, metalM, goldM, darkM });
  flourishes(look, s, grp, torso, headG, hip, torsoH, mats);
  grp.add(headG); parts.head = headG;

  // ---- arms: capsules with elbow pivots, gloves/bracers
  const upperH = s * 0.55, foreH = s * 0.52;
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(0, hip + s * 0.2 + torsoH - s * 0.1, side * s * 0.62);
    piv.add(mesh(capsule(s * 0.11, upperH * 0.8), plate ? metalM : robe ? bodyM : bodyM, 0, -upperH / 2, 0));
    const elbow = new THREE.Group(); elbow.position.y = -upperH;
    elbow.add(mesh(capsule(s * 0.1, foreH * 0.75), plate ? metalM : robe ? accM : skinM, 0, -foreH / 2, 0));
    elbow.add(mesh(capsule(s * 0.12, s * 0.12, 8), plate ? goldM : leatherM, 0, -foreH + s * 0.14, 0)); // bracer
    elbow.add(mesh(sphereGeo(s * 0.12, 10), skinM, 0, -foreH - s * 0.02, 0)); // hand
    piv.add(elbow); grp.add(piv);
    if (side < 0) { parts.armL = piv; parts.elbowL = elbow; } else { parts.armR = piv; parts.elbowR = elbow; }
    piv.rotation.z = 0.05; elbow.rotation.z = 0.35;
  }
  if (!opts.rider && look.weapon !== 'none') {
    const w = buildWeapon(look.weapon, s * 1.1, accent, mats);
    w.position.set(s * 0.12, -foreH - s * 0.02, 0);
    w.rotation.z = ranged ? -1.35 : -0.95;
    parts.elbowR!.add(w); parts.weapon = w;
  }
  const height = hip + s * 0.2 + torsoH + s * 0.95 + (look.gear === 'hat' ? s * 0.9 : 0);
  return { grp, parts, mats, height, eye: hip + s * 0.2 + torsoH + s * 0.5, hover: 0 };
}

type Pal = { bodyM: UnitMat; accM: UnitMat; teamM: UnitMat; metalM: UnitMat; goldM: UnitMat; darkM: UnitMat };

function headgear(look: Look, s: number, headG: THREE.Group, mats: UnitMat[], p: Pal): void {
  const gear = look.gear ?? 'cap';
  switch (gear) {
    case 'helm': {
      const helm = mesh(lathe([[s * 0.0, s * 0.95], [s * 0.42, s * 0.8], [s * 0.46, s * 0.5], [s * 0.44, s * 0.3]], 20), p.metalM, 0, 0, 0); headG.add(helm);
      attach(headG, mesh(new THREE.TorusGeometry(s * 0.45, s * 0.03, 8, 24), p.goldM, 0, s * 0.3, 0)).rotation.x = Math.PI / 2;
      const plume = mesh(capsule(s * 0.08, s * 0.5, 8), p.teamM, -s * 0.15, s * 1.15, 0); plume.rotation.z = 0.6; headG.add(plume);
      break;
    }
    case 'hornhelm': {
      headG.add(mesh(lathe([[0, s * 0.95], [s * 0.42, s * 0.8], [s * 0.46, s * 0.5], [s * 0.44, s * 0.3]], 20), p.metalM, 0, 0, 0));
      const hornM = toon(0xf1e7d0, { roughness: 0.5 }); mats.push(hornM);
      for (const side of [-1, 1]) { const horn = mesh(new THREE.ConeGeometry(s * 0.1, s * 0.55, 10), hornM, 0, s * 0.85, side * s * 0.48); horn.rotation.x = side * -1.0; horn.rotation.z = 0.2; headG.add(horn); }
      break;
    }
    case 'hood': { const hood = mesh(lathe([[0, s * 1.0], [s * 0.5, s * 0.75], [s * 0.55, s * 0.3], [s * 0.5, 0]], 20), p.accM, -s * 0.05, 0, 0); headG.add(hood); break; }
    case 'hat': {
      headG.add(mesh(new THREE.CylinderGeometry(s * 0.82, s * 0.9, s * 0.07, 24), p.accM, 0, s * 0.86, 0));
      const cone = mesh(new THREE.ConeGeometry(s * 0.42, s * 1.25, 20), p.accM, -s * 0.05, s * 1.45, 0); cone.rotation.z = 0.22; headG.add(cone);
      attach(headG, mesh(new THREE.TorusGeometry(s * 0.44, s * 0.05, 8, 24), p.teamM, 0, s * 0.9, 0)).rotation.x = Math.PI / 2;
      break;
    }
    case 'tricorn': { const brim = mesh(new THREE.CylinderGeometry(s * 0.72, s * 0.8, s * 0.08, 3), p.darkM, 0, s * 0.86, 0); brim.rotation.y = Math.PI / 6; headG.add(brim); const dome = mesh(sphereGeo(s * 0.48, 16), p.darkM, 0, s * 0.72, 0); dome.scale.set(1, 0.7, 1); headG.add(dome); break; }
    case 'halo': { const halo = mesh(new THREE.TorusGeometry(s * 0.36, s * 0.035, 8, 28), toon(0xffd54a, { emissive: 0xffc107, emissiveIntensity: 2.2 }), 0, s * 1.15, 0); halo.rotation.x = Math.PI / 2; headG.add(halo); break; }
    case 'bandana': { attach(headG, mesh(new THREE.TorusGeometry(s * 0.42, s * 0.07, 8, 24), p.accM, 0, s * 0.68, 0)).rotation.x = Math.PI / 2; const tail = mesh(capsule(s * 0.05, s * 0.5, 6), p.accM, -s * 0.52, s * 0.62, s * 0.12); tail.rotation.z = 0.5; headG.add(tail); break; }
    default: break;
  }
}

function flourishes(look: Look, s: number, grp: THREE.Group, torso: THREE.Group, headG: THREE.Group, hip: number, torsoH: number, mats: UnitMat[]): void {
  const noScalp = look.gear === 'helm' || look.gear === 'hornhelm' || look.gear === 'hood';
  if (look.hair && !noScalp) {
    const hairM = toon(hex(look.hair.color), { roughness: 0.42 }); mats.push(hairM);
    // scalp: a slightly larger sphere cut at the brow line, with a sweeping fringe of capsules
    const scalp = mesh(lathe([[0, s * 0.92], [s * 0.3, s * 0.88], [s * 0.46, s * 0.7], [s * 0.5, s * 0.45], [s * 0.46, s * 0.3]], 22), hairM, -s * 0.02, 0, 0); headG.add(scalp);
    for (let i = 0; i < 7; i++) {
      const t = (i - 3) / 3; // -1..1 across the forehead
      const bang = mesh(capsule(s * 0.045, s * 0.26 + (1 - Math.abs(t)) * s * 0.1, 6), hairM, s * 0.3 * Math.cos(t * 0.9), s * 0.62 - Math.abs(t) * s * 0.06, Math.sin(t * 0.9) * s * 0.42);
      bang.rotation.y = -t * 0.9; bang.rotation.z = 0.12 + t * 0.08; bang.rotation.x = t * 0.15; headG.add(bang);
    }
    for (const side of [-1, 1]) { const lock = mesh(capsule(s * 0.06, s * 0.5, 6), hairM, s * 0.08, s * 0.22, side * s * 0.4); lock.rotation.x = side * 0.06; headG.add(lock); }
    switch (look.hair.style) {
      case 'long': headG.add(mesh(lathe([[s * 0.2, s * 0.45], [s * 0.42, s * 0.2], [s * 0.4, -s * 0.4], [s * 0.3, -s * 0.9], [0, -s * 1.0]], 16), hairM, -s * 0.16, 0, 0)); break;
      case 'pony': { const tail = mesh(capsule(s * 0.1, s * 0.9, 8), hairM, -s * 0.45, s * 0.2, 0); tail.rotation.z = 0.55; headG.add(tail); headG.add(mesh(new THREE.TorusGeometry(s * 0.13, s * 0.035, 8, 12), toon(0xe9c46a, { metalness: 0.9, roughness: 0.3 }), -s * 0.36, s * 0.62, 0)); break; }
      case 'bun': headG.add(mesh(sphereGeo(s * 0.2, 12), hairM, -s * 0.1, s * 1.02, 0)); attach(headG, mesh(capsule(s * 0.015, s * 0.6, 5), toon(0xe9c46a, { metalness: 0.9, roughness: 0.3 }), -s * 0.1, s * 1.06, 0)).rotation.x = 1.3; break;
      case 'twin': for (const side of [-1, 1]) { const t = mesh(capsule(s * 0.1, s * 0.8, 8), hairM, -s * 0.05, s * 0.15, side * s * 0.5); t.rotation.x = side * 0.3; headG.add(t); headG.add(mesh(sphereGeo(s * 0.08, 8), toon(hex(look.accent)), -s * 0.05, s * 0.58, side * s * 0.5)); } break;
      case 'topknot': headG.add(mesh(capsule(s * 0.12, s * 0.2, 8), hairM, -s * 0.05, s * 1.05, 0)); attach(headG, mesh(new THREE.TorusGeometry(s * 0.15, s * 0.03, 8, 12), toon(0xe9c46a, { metalness: 0.9, roughness: 0.3 }), -s * 0.05, s * 0.92, 0)).rotation.x = Math.PI / 2; break;
      default: break;
    }
  }
  if (look.ears === 'fox' || look.ears === 'cat') {
    const earM = toon(look.hair ? hex(look.hair.color) : hex(look.accent), { roughness: 0.5 }); mats.push(earM);
    for (const side of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(s * 0.13, s * 0.42, 12), earM, -s * 0.05, s * 0.98, side * s * 0.28); ear.rotation.x = side * -0.3; headG.add(ear); const inner = mesh(new THREE.ConeGeometry(s * 0.06, s * 0.24, 10), toon(0xffe6f0), s * 0.02, s * 0.95, side * s * 0.28); inner.rotation.x = side * -0.3; headG.add(inner); }
  }
  if (look.horns) { const hornM = toon(0xf1e7d0, { roughness: 0.5 }); mats.push(hornM); for (const side of [-1, 1]) { const horn = mesh(new THREE.ConeGeometry(s * 0.11, s * 0.6, 12), hornM, 0, s * 0.85, side * s * 0.46); horn.rotation.x = side * -1.0; horn.rotation.z = 0.25; headG.add(horn); } }
  if (look.beard) { const beardM = toon(look.hair ? hex(look.hair.color) : 0x2a1e14, { roughness: 0.5 }); mats.push(beardM); headG.add(mesh(lathe([[0, -s * 0.35], [s * 0.22, -s * 0.15], [s * 0.3, s * 0.15], [s * 0.1, s * 0.3]], 12), beardM, s * 0.26, 0, 0)); }
  if (look.tails === 'fox') {
    const tailM = toon(hex(look.accent), { roughness: 0.55 }), tipM = toon(0xfff4f8); mats.push(tailM, tipM);
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.4;
      const t = new THREE.Group(); t.position.set(-s * 0.4, hip + s * 0.05, 0); t.rotation.y = a; t.rotation.z = 0.95 + Math.abs(a) * 0.3;
      t.add(mesh(capsule(s * 0.14, s * 0.9, 10), tailM, 0, s * 0.5, 0)); t.add(mesh(sphereGeo(s * 0.17, 10), tipM, 0, s * 1.02, 0));
      grp.add(t);
    }
  } else if (look.tails === 'monkey') {
    const tailM = toon(hex(look.color), { roughness: 0.6 }); mats.push(tailM);
    const t = mesh(capsule(s * 0.06, s * 1.3, 8), tailM, -s * 0.6, hip + s * 0.35, 0); t.rotation.z = 1.1; grp.add(t);
  }
  if (look.skirt) {
    const skirtM = toon(hex(look.color), { roughness: 0.6, side: THREE.DoubleSide }); mats.push(skirtM);
    grp.add(mesh(lathe([[s * 0.4, s * 0.1], [s * 0.6, -s * 0.5], [s * 0.95, -s * 1.3]], 24), skirtM, 0, hip, 0));
    attach(grp, mesh(new THREE.TorusGeometry(s * 0.42, s * 0.05, 8, 24), toon(hex(look.accent)), 0, hip + s * 0.05, 0)).rotation.x = Math.PI / 2;
  }
  if (look.doll) {
    const bearM = toon(0xc98a4a, { roughness: 0.9 }); mats.push(bearM);
    const d = new THREE.Group(); d.position.set(-s * 0.5, torsoH * 0.45, -s * 0.45);
    d.add(mesh(sphereGeo(s * 0.2, 12), bearM, 0, 0, 0)); d.add(mesh(sphereGeo(s * 0.15, 12), bearM, 0, s * 0.28, 0));
    for (const side of [-1, 1]) d.add(mesh(sphereGeo(s * 0.06, 8), bearM, 0, s * 0.4, side * s * 0.12));
    torso.add(d);
  }
}
