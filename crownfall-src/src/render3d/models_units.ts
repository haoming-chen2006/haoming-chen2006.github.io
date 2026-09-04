import * as THREE from 'three';
import type { Look, Team, WeaponKind } from '../game/types.ts';
import { SKIN, TEAM_HEX, boxGeo, buildWeapon, coneGeo, cylGeo, hex, attach, mesh, outline, rboxGeo, shade, sphereGeo, tetraGeo, toon, torusGeo, wingGeo, type UnitMat } from './model_kit.ts';

export interface UnitParts {
  legL?: THREE.Object3D; legR?: THREE.Object3D; armL?: THREE.Object3D; armR?: THREE.Object3D; elbowL?: THREE.Object3D; elbowR?: THREE.Object3D;
  head?: THREE.Object3D; torso?: THREE.Object3D; weapon?: THREE.Object3D; wingL?: THREE.Object3D; wingR?: THREE.Object3D;
  tail?: THREE.Object3D; tailSegs?: THREE.Object3D[]; mount?: THREE.Object3D; rider?: THREE.Object3D; eyes?: THREE.Mesh[]; legs?: THREE.Object3D[];
  cape?: THREE.Object3D; orb?: THREE.Object3D; shards?: THREE.Object3D[]; jaw?: THREE.Object3D; neck?: THREE.Object3D; flaps?: THREE.Object3D[]; ranged?: boolean; twoHanded?: boolean;
}

export interface BuiltUnit { grp: THREE.Group; parts: UnitParts; mats: UnitMat[]; height: number; eye: number; hover: number }

type HeadGear = 'helm' | 'hornhelm' | 'hood' | 'hat' | 'tricorn' | 'halo' | 'bandana' | 'cap' | 'goblincap';
type Armor = 'plate' | 'leather' | 'robe' | 'cloth';
type Prop = 'quiver' | 'satchel' | 'bombbag' | 'bandolier' | 'pouches' | 'none';
interface Kit { gear: HeadGear; armor: Armor; cape: boolean; prop: Prop; shield: boolean; ranged: boolean; twoHanded: boolean }

const KITS: Record<WeaponKind, Kit> = {
  sword: { gear: 'helm', armor: 'plate', cape: true, prop: 'none', shield: true, ranged: false, twoHanded: false },
  axe: { gear: 'hornhelm', armor: 'plate', cape: false, prop: 'none', shield: false, ranged: false, twoHanded: true },
  hammer: { gear: 'helm', armor: 'leather', cape: false, prop: 'none', shield: false, ranged: false, twoHanded: false },
  lance: { gear: 'helm', armor: 'plate', cape: true, prop: 'none', shield: false, ranged: false, twoHanded: false },
  dagger: { gear: 'bandana', armor: 'leather', cape: false, prop: 'pouches', shield: false, ranged: false, twoHanded: false },
  bow: { gear: 'hood', armor: 'leather', cape: false, prop: 'quiver', shield: false, ranged: true, twoHanded: true },
  spear: { gear: 'goblincap', armor: 'cloth', cape: false, prop: 'quiver', shield: false, ranged: true, twoHanded: false },
  rifle: { gear: 'tricorn', armor: 'leather', cape: false, prop: 'bandolier', shield: false, ranged: true, twoHanded: true },
  staff: { gear: 'hat', armor: 'robe', cape: false, prop: 'satchel', shield: false, ranged: true, twoHanded: false },
  orb: { gear: 'hood', armor: 'robe', cape: true, prop: 'none', shield: false, ranged: true, twoHanded: false },
  book: { gear: 'halo', armor: 'robe', cape: false, prop: 'satchel', shield: false, ranged: true, twoHanded: false },
  scythe: { gear: 'hood', armor: 'robe', cape: false, prop: 'none', shield: false, ranged: false, twoHanded: true },
  bomb: { gear: 'bandana', armor: 'leather', cape: false, prop: 'bombbag', shield: false, ranged: true, twoHanded: false },
  shield: { gear: 'helm', armor: 'plate', cape: false, prop: 'none', shield: false, ranged: false, twoHanded: false },
  none: { gear: 'cap', armor: 'cloth', cape: false, prop: 'none', shield: false, ranged: false, twoHanded: false },
};

interface Palette { body: number; accent: number; team: number; dark: number; metal: number; leather: number; boot: number }

function face(headG: THREE.Group, s: number, skinM: UnitMat, opts: { angry?: boolean; glow?: number } = {}): THREE.Mesh[] {
  const eyes: THREE.Mesh[] = [];
  const whiteM = toon(0xffffff), pupilM = opts.glow !== undefined ? toon(opts.glow, { emissive: opts.glow, emissiveIntensity: 2.5 }) : toon(0x1a1a22), browM = toon(0x2a1e14);
  for (const side of [-1, 1]) {
    const white = mesh(sphereGeo(s * 0.105, 8), whiteM, s * 0.36, s * 0.47, side * s * 0.16); white.scale.set(0.45, 1.15, 1); headG.add(white);
    const pupil = mesh(sphereGeo(s * 0.055, 6), pupilM, s * 0.43, s * 0.46, side * s * 0.16); eyes.push(pupil); headG.add(pupil);
    const brow = mesh(boxGeo(s * 0.06, s * 0.045, s * 0.18), browM, s * 0.4, s * 0.62, side * s * 0.16);
    brow.rotation.x = side * (opts.angry ? -0.45 : 0.1); headG.add(brow);
  }
  headG.add(mesh(boxGeo(s * 0.04, s * 0.035, s * 0.16), browM, s * 0.42, s * 0.27, 0)); // mouth
  void skinM;
  return eyes;
}

function headgear(headG: THREE.Group, s: number, gear: HeadGear, pal: Palette, mats: UnitMat[]): number {
  const accM = toon(pal.accent), teamM = toon(pal.team, { emissive: pal.team, emissiveIntensity: 0.15 }), metalM = toon(pal.metal), darkM = toon(pal.dark);
  mats.push(accM, teamM, metalM, darkM);
  let extra = 0;
  switch (gear) {
    case 'helm': {
      const helm = outline(mesh(sphereGeo(s * 0.5, 14), metalM, 0, s * 0.55, 0)); helm.scale.set(1.02, 0.9, 1.02); headG.add(helm);
      headG.add(mesh(rboxGeo(s * 0.34, s * 0.22, s * 0.98, s * 0.05), metalM, s * 0.3, s * 0.42, 0));
      headG.add(mesh(boxGeo(s * 0.3, s * 0.05, s * 0.75), toon(0x0d1014), s * 0.4, s * 0.45, 0));
      headG.add(mesh(boxGeo(s * 0.05, s * 0.4, s * 0.06), metalM, s * 0.48, s * 0.4, 0)); // nasal
      const plume = mesh(coneGeo(s * 0.11, s * 0.55, 6), teamM, -s * 0.2, s * 1.2, 0); plume.rotation.z = 0.7; headG.add(plume);
      headG.add(mesh(sphereGeo(s * 0.07, 6), toon(0xe9c46a), 0, s * 1.02, 0));
      extra = s * 0.5;
      break;
    }
    case 'hornhelm': {
      const helm = outline(mesh(sphereGeo(s * 0.5, 14), metalM, 0, s * 0.55, 0)); helm.scale.set(1.02, 0.85, 1.02); headG.add(helm);
      headG.add(mesh(boxGeo(s * 0.08, s * 0.45, s * 0.06), metalM, s * 0.47, s * 0.4, 0));
      for (const side of [-1, 1]) { const horn = mesh(coneGeo(s * 0.11, s * 0.55, 6), toon(0xf1e7d0), 0, s * 0.85, side * s * 0.5); horn.rotation.x = side * -1.1; horn.rotation.z = 0.2; headG.add(horn); }
      extra = s * 0.4;
      break;
    }
    case 'hood': {
      const hood = outline(mesh(sphereGeo(s * 0.54, 14), accM, -s * 0.08, s * 0.55, 0)); hood.scale.set(0.98, 0.92, 1.05); headG.add(hood);
      headG.add(mesh(boxGeo(s * 0.55, s * 0.09, s * 1.08), accM, s * 0.22, s * 0.8, 0));
      const back = mesh(coneGeo(s * 0.35, s * 0.6, 7), accM, -s * 0.35, s * 0.5, 0); back.rotation.z = 1.6; headG.add(back);
      extra = s * 0.3;
      break;
    }
    case 'hat': {
      headG.add(mesh(cylGeo(s * 0.78, s * 0.85, s * 0.09, 14), accM, 0, s * 0.86, 0));
      const cone = mesh(coneGeo(s * 0.44, s * 1.25, 9), accM, -s * 0.04, s * 1.45, 0); cone.rotation.z = 0.28; headG.add(cone);
      const tip = mesh(coneGeo(s * 0.12, s * 0.35, 6), accM, -s * 0.3, s * 2.05, 0); tip.rotation.z = 1.1; headG.add(tip);
      headG.add(mesh(cylGeo(s * 0.47, s * 0.47, s * 0.14, 14), teamM, 0, s * 0.95, 0));
      headG.add(mesh(sphereGeo(s * 0.07, 6), toon(0xe9c46a), s * 0.45, s * 0.95, 0));
      extra = s * 1.3;
      break;
    }
    case 'tricorn': {
      attach(headG, mesh(cylGeo(s * 0.72, s * 0.8, s * 0.1, 3), darkM, 0, s * 0.88, 0)).rotation.y = Math.PI / 6;
      const dome = mesh(sphereGeo(s * 0.5, 12), darkM, 0, s * 0.7, 0); dome.scale.set(1, 0.75, 1); headG.add(dome);
      headG.add(mesh(boxGeo(s * 0.3, s * 0.12, s * 0.06), teamM, s * 0.35, s * 0.95, s * 0.3));
      extra = s * 0.45;
      break;
    }
    case 'halo': {
      const halo = mesh(torusGeo(s * 0.38, s * 0.045, Math.PI * 2, 20), toon(0xffd54a, { emissive: 0xffc107, emissiveIntensity: 2.6 }), 0, s * 1.2, 0);
      halo.rotation.x = Math.PI / 2; headG.add(halo);
      const hair = mesh(sphereGeo(s * 0.5, 12), accM, -s * 0.05, s * 0.6, 0); hair.scale.set(1, 0.7, 1); headG.add(hair);
      headG.add(mesh(cylGeo(s * 0.48, s * 0.48, s * 0.08, 12), teamM, 0, s * 0.78, 0));
      extra = s * 0.6;
      break;
    }
    case 'bandana': {
      headG.add(mesh(cylGeo(s * 0.5, s * 0.5, s * 0.2, 14), accM, 0, s * 0.75, 0));
      const hair = mesh(sphereGeo(s * 0.48, 12), darkM, -s * 0.04, s * 0.62, 0); hair.scale.set(1, 0.55, 1); headG.add(hair);
      const tail = mesh(boxGeo(s * 0.55, s * 0.09, s * 0.16), accM, -s * 0.6, s * 0.72, s * 0.15); tail.rotation.z = 0.35; headG.add(tail);
      extra = s * 0.25;
      break;
    }
    case 'goblincap': {
      const cap = mesh(sphereGeo(s * 0.5, 12), accM, -s * 0.02, s * 0.66, 0); cap.scale.set(1, 0.6, 1); headG.add(cap);
      for (const side of [-1, 1]) { const ear = mesh(coneGeo(s * 0.12, s * 0.45, 5), toon(pal.body), -s * 0.05, s * 0.5, side * s * 0.55); ear.rotation.x = side * -1.4; headG.add(ear); }
      extra = s * 0.2;
      break;
    }
    case 'cap': {
      const hair = mesh(sphereGeo(s * 0.5, 12), accM, -s * 0.03, s * 0.62, 0); hair.scale.set(1, 0.65, 1); headG.add(hair);
      extra = s * 0.25;
      break;
    }
  }
  return extra;
}

/** Full humanoid with class kit; used by humanoid/skeleton-like units and mounted riders. */
export function buildHumanoid(look: Look, team: Team, opts: { scale?: number; rider?: boolean; bone?: boolean; glowEyes?: number } = {}): BuiltUnit {
  const s = look.size * (opts.scale ?? 1);
  const mats: UnitMat[] = [];
  const kit = KITS[look.weapon];
  const pal: Palette = { body: hex(look.color), accent: hex(look.accent), team: TEAM_HEX[team], dark: shade(hex(look.color), 0.5), metal: 0x9aa5b1, leather: 0x6d4a2b, boot: 0x3a2a1e };
  const bone = !!opts.bone;
  const bodyM = toon(bone ? 0xe8e4d8 : pal.body), accM = toon(pal.accent), skinM = toon(bone ? 0xe8e4d8 : SKIN), teamM = toon(pal.team, { emissive: pal.team, emissiveIntensity: 0.15 });
  const darkM = toon(bone ? 0xbdb7a8 : pal.dark), bootM = toon(pal.boot), metalM = toon(pal.metal), leatherM = toon(pal.leather), goldM = toon(0xe9c46a);
  mats.push(bodyM, accM, skinM, teamM, darkM, bootM, metalM, leatherM, goldM);
  const grp = new THREE.Group();
  const parts: UnitParts = { ranged: kit.ranged, twoHanded: kit.twoHanded };
  const legH = s * 0.98, hip = legH;
  // legs
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(0, hip, side * s * 0.28);
    if (bone) {
      piv.add(mesh(cylGeo(s * 0.09, s * 0.08, legH * 0.5, 7), bodyM, 0, -legH * 0.25, 0));
      piv.add(mesh(sphereGeo(s * 0.12, 7), bodyM, 0, -legH * 0.5, 0));
      piv.add(mesh(cylGeo(s * 0.08, s * 0.09, legH * 0.45, 7), bodyM, 0, -legH * 0.75, 0));
      piv.add(mesh(rboxGeo(s * 0.3, s * 0.1, s * 0.3, s * 0.03), bodyM, s * 0.08, -legH * 0.97, 0));
    } else {
      piv.add(mesh(rboxGeo(s * 0.34, legH * 0.68, s * 0.34), darkM, 0, -legH * 0.34, 0));
      piv.add(mesh(rboxGeo(s * 0.42, legH * 0.3, s * 0.4, s * 0.06), bootM, s * 0.07, -legH * 0.86, 0));
      piv.add(mesh(boxGeo(s * 0.44, s * 0.06, s * 0.42), bootM, s * 0.08, -legH * 0.73, 0)); // cuff
    }
    grp.add(piv);
    if (side < 0) parts.legL = piv; else parts.legR = piv;
  }
  if (!bone) grp.add(mesh(rboxGeo(s * 0.8, s * 0.3, s * 1.05, s * 0.08), darkM, 0, hip + s * 0.02, 0)); // hips
  else grp.add(mesh(rboxGeo(s * 0.55, s * 0.22, s * 0.75, s * 0.05), bodyM, 0, hip + s * 0.02, 0)); // pelvis
  // torso
  const torsoH = s * 1.12;
  const torso = new THREE.Group();
  torso.position.y = hip + s * 0.1;
  const chest = outline(mesh(rboxGeo(s * 0.82, torsoH, s * 1.16, s * 0.12), bone ? bodyM : bodyM, 0, torsoH / 2, 0));
  torso.add(chest);
  if (bone) {
    for (let i = 0; i < 4; i++) torso.add(mesh(boxGeo(s * 0.9, s * 0.05, s * 1.0), toon(0x6f6a5f), 0, s * 0.3 + i * s * 0.2, 0));
    torso.add(mesh(cylGeo(s * 0.06, s * 0.06, torsoH, 6), darkM, -s * 0.3, torsoH / 2, 0));
  }
  if (kit.armor === 'plate') {
    torso.add(outline(mesh(rboxGeo(s * 0.9, torsoH * 0.62, s * 1.24, s * 0.1), metalM, s * 0.02, torsoH * 0.66, 0)));
    torso.add(mesh(boxGeo(s * 0.06, torsoH * 0.5, s * 0.08), goldM, s * 0.48, torsoH * 0.66, 0)); // chest ridge
  } else if (kit.armor === 'leather') {
    torso.add(mesh(rboxGeo(s * 0.86, torsoH * 0.5, s * 1.2, s * 0.08), leatherM, s * 0.01, torsoH * 0.36, 0));
    for (const side of [-1, 1]) torso.add(mesh(boxGeo(s * 0.07, torsoH * 0.55, s * 0.12), leatherM, s * 0.42, torsoH * 0.65, side * s * 0.35)); // straps
  } else if (kit.armor === 'robe') {
    torso.add(outline(mesh(cylGeo(s * 0.62, s * 0.95, s * 1.05, 12), bodyM, 0, -s * 0.45, 0)));
    torso.add(mesh(cylGeo(s * 0.64, s * 0.66, s * 0.12, 12), goldM, 0, s * 0.02, 0)); // trim
  }
  // belt + buckle, tabard stripe front/back in team colour
  torso.add(mesh(rboxGeo(s * 0.9, s * 0.18, s * 1.24, s * 0.05), teamM, 0, s * 0.16, 0));
  torso.add(mesh(boxGeo(s * 0.12, s * 0.14, s * 0.16), goldM, s * 0.46, s * 0.16, 0));
  torso.add(mesh(boxGeo(s * 0.05, torsoH * 0.85, s * 0.4), teamM, s * 0.44, torsoH * 0.52, 0));
  torso.add(mesh(boxGeo(s * 0.05, torsoH * 0.6, s * 0.4), teamM, -s * 0.44, torsoH * 0.55, 0));
  // pauldrons
  for (const side of [-1, 1]) {
    const p = outline(mesh(sphereGeo(s * 0.31, 10), kit.armor === 'plate' ? metalM : accM, 0, torsoH - s * 0.02, side * s * 0.62));
    p.scale.set(1, 0.7, 1); torso.add(p);
    if (kit.armor === 'plate') attach(torso, mesh(torusGeo(s * 0.26, s * 0.035, Math.PI * 2, 12), goldM, 0, torsoH - s * 0.02, side * s * 0.62)).rotation.x = Math.PI / 2;
  }
  // cape
  if (kit.cape && !opts.rider) {
    const cape = new THREE.Group();
    cape.position.set(-s * 0.42, torsoH - s * 0.05, 0);
    const cloth = mesh(rboxGeo(s * 0.06, torsoH * 1.35, s * 1.05, s * 0.02), teamM, 0, -torsoH * 0.62, 0);
    cape.add(cloth);
    cape.add(mesh(boxGeo(s * 0.08, s * 0.1, s * 1.1), goldM, 0, -s * 0.02, 0));
    torso.add(cape);
    parts.cape = cape;
  }
  // props
  switch (kit.prop) {
    case 'quiver': {
      const q = mesh(cylGeo(s * 0.13, s * 0.15, s * 0.85, 8), leatherM, -s * 0.5, torsoH * 0.55, -s * 0.35); q.rotation.x = 0.35; q.rotation.z = 0.25; torso.add(q);
      for (let i = 0; i < 3; i++) { const a = mesh(cylGeo(s * 0.02, s * 0.02, s * 0.5, 4), toon(0xd9c8a0), -s * 0.55 - i * s * 0.03, torsoH * 0.55 + s * 0.6, -s * 0.5 + i * s * 0.08); a.rotation.x = 0.35; a.rotation.z = 0.25; torso.add(a); const f = mesh(coneGeo(s * 0.05, s * 0.12, 4), teamM, -s * 0.6 - i * s * 0.03, torsoH * 0.55 + s * 0.82, -s * 0.56 + i * s * 0.08); torso.add(f); }
      break;
    }
    case 'satchel': torso.add(mesh(rboxGeo(s * 0.3, s * 0.34, s * 0.42, s * 0.05), leatherM, -s * 0.1, s * 0.05, -s * 0.62)); attach(torso, mesh(boxGeo(s * 0.05, torsoH * 0.9, s * 0.08), leatherM, s * 0.05, torsoH * 0.55, s * 0.4)).rotation.x = -0.9; break;
    case 'bombbag': torso.add(outline(mesh(sphereGeo(s * 0.34, 10), leatherM, -s * 0.15, s * 0.15, -s * 0.7))); torso.add(mesh(sphereGeo(s * 0.12, 8), toon(0x1e2024), -s * 0.15, s * 0.5, -s * 0.72)); break;
    case 'bandolier': { const b = mesh(boxGeo(s * 0.09, torsoH * 1.1, s * 0.16), leatherM, s * 0.43, torsoH * 0.5, 0); b.rotation.x = 0.75; torso.add(b); for (let i = 0; i < 4; i++) torso.add(mesh(cylGeo(s * 0.035, s * 0.035, s * 0.1, 6), goldM, s * 0.48, torsoH * 0.25 + i * s * 0.2, -s * 0.28 + i * s * 0.19)); break; }
    case 'pouches': for (const side of [-1, 1]) torso.add(mesh(rboxGeo(s * 0.22, s * 0.22, s * 0.22, s * 0.05), leatherM, s * 0.15, s * 0.06, side * s * 0.58)); break;
    case 'none': break;
  }
  grp.add(torso);
  parts.torso = torso;
  // neck + head
  grp.add(mesh(cylGeo(s * 0.13, s * 0.15, s * 0.16, 8), skinM, 0, hip + s * 0.1 + torsoH + s * 0.05, 0));
  const headG = new THREE.Group();
  headG.position.y = hip + s * 0.1 + torsoH + s * 0.1;
  const head = outline(mesh(sphereGeo(s * 0.45, 14), skinM, 0, s * 0.42, 0));
  head.scale.set(0.98, 1.06, 0.98);
  headG.add(head);
  if (bone) {
    headG.add(mesh(rboxGeo(s * 0.34, s * 0.16, s * 0.42, s * 0.04), skinM, s * 0.18, s * 0.12, 0)); // jaw
    const sockM = toon(0x101014);
    for (const side of [-1, 1]) { const so = mesh(sphereGeo(s * 0.12, 8), sockM, s * 0.36, s * 0.5, side * s * 0.16); so.scale.set(0.5, 1.1, 1); headG.add(so); }
    parts.eyes = [];
    for (const side of [-1, 1]) { const e = mesh(sphereGeo(s * 0.045, 6), toon(opts.glowEyes ?? 0xff9a3a, { emissive: opts.glowEyes ?? 0xff9a3a, emissiveIntensity: 2.5 }), s * 0.42, s * 0.5, side * s * 0.16); parts.eyes.push(e); headG.add(e); }
    headG.add(mesh(boxGeo(s * 0.04, s * 0.03, s * 0.2), sockM, s * 0.42, s * 0.24, 0));
  } else parts.eyes = face(headG, s, skinM, { angry: kit.armor === 'plate' || look.weapon === 'axe', glow: opts.glowEyes });
  const gearH = headgear(headG, s, kit.gear, pal, mats);
  grp.add(headG);
  parts.head = headG;
  // arms with elbows
  const upperH = s * 0.48, foreH = s * 0.46;
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(0, hip + s * 0.1 + torsoH - s * 0.08, side * s * 0.78);
    if (bone) piv.add(mesh(cylGeo(s * 0.07, s * 0.065, upperH, 7), bodyM, 0, -upperH / 2, 0));
    else piv.add(mesh(rboxGeo(s * 0.28, upperH, s * 0.28, s * 0.06), kit.armor === 'plate' ? metalM : bodyM, 0, -upperH / 2, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -upperH;
    if (bone) { elbow.add(mesh(sphereGeo(s * 0.09, 7), bodyM, 0, 0, 0)); elbow.add(mesh(cylGeo(s * 0.06, s * 0.07, foreH, 7), bodyM, 0, -foreH / 2, 0)); elbow.add(mesh(sphereGeo(s * 0.11, 7), bodyM, 0, -foreH, 0)); }
    else {
      elbow.add(mesh(rboxGeo(s * 0.26, foreH, s * 0.26, s * 0.06), kit.armor === 'plate' ? metalM : kit.armor === 'robe' ? bodyM : accM, 0, -foreH / 2, 0));
      elbow.add(mesh(rboxGeo(s * 0.3, s * 0.16, s * 0.3, s * 0.05), kit.armor === 'plate' ? goldM : leatherM, 0, -foreH + s * 0.12, 0)); // bracer/cuff
      elbow.add(mesh(sphereGeo(s * 0.15, 8), skinM, 0, -foreH - s * 0.02, 0)); // hand
    }
    piv.add(elbow);
    grp.add(piv);
    if (side < 0) { parts.armL = piv; parts.elbowL = elbow; } else { parts.armR = piv; parts.elbowR = elbow; }
    piv.rotation.z = 0.05;
    elbow.rotation.z = 0.35;
  }
  if (!opts.rider && look.weapon !== 'none') {
    const w = buildWeapon(look.weapon, s, pal.accent, mats);
    w.position.set(s * 0.12, -foreH - s * 0.02, 0);
    w.rotation.z = kit.ranged ? -1.35 : -0.95;
    parts.elbowR!.add(w);
    parts.weapon = w;
    if (kit.shield) {
      const sh = buildWeapon('shield', s * 1.15, pal.accent, mats);
      sh.position.set(s * 0.05, -foreH * 0.55, -s * 0.05);
      sh.rotation.set(0, 0, 0.1);
      parts.elbowL!.add(sh);
    }
    if (kit.twoHanded) { parts.armL!.rotation.z = -0.55; parts.elbowL!.rotation.z = 1.05; parts.armR!.rotation.z = -0.5; parts.elbowR!.rotation.z = 0.7; w.rotation.z = kit.ranged ? -0.9 : -0.35; w.rotation.y = 0.35; }
  }
  const height = hip + s * 0.1 + torsoH + s * 0.1 + s * 0.9 + gearH * 0.6;
  return { grp, parts, mats, height, eye: hip + s * 0.1 + torsoH + s * 0.1 + s * 0.45, hover: 0 };
}

export function buildBrute(look: Look, team: Team): BuiltUnit {
  const s = look.size;
  const mats: UnitMat[] = [];
  const body = hex(look.color), accent = hex(look.accent), teamC = TEAM_HEX[team];
  const bodyM = toon(body), accM = toon(accent), skinM = toon(SKIN), teamM = toon(teamC, { emissive: teamC, emissiveIntensity: 0.15 }), darkM = toon(shade(body, 0.5)), metalM = toon(0x7a5a3a), ironM = toon(0x3c4149), wrapM = toon(0x4a3524);
  mats.push(bodyM, accM, skinM, teamM, darkM, metalM, ironM, wrapM);
  const grp = new THREE.Group();
  const parts: UnitParts = {};
  const legH = s * 0.85, hip = legH;
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(0, hip, side * s * 0.42);
    piv.add(mesh(rboxGeo(s * 0.55, legH * 0.7, s * 0.55, s * 0.12), darkM, 0, -legH * 0.35, 0));
    piv.add(mesh(rboxGeo(s * 0.62, legH * 0.32, s * 0.6, s * 0.1), wrapM, s * 0.08, -legH * 0.84, 0));
    grp.add(piv);
    if (side < 0) parts.legL = piv; else parts.legR = piv;
  }
  const torsoH = s * 1.5;
  const torso = new THREE.Group();
  torso.position.y = hip;
  const chest = outline(mesh(rboxGeo(s * 1.25, torsoH, s * 1.85, s * 0.25), bodyM, 0, torsoH / 2, 0)); torso.add(chest);
  torso.add(outline(mesh(rboxGeo(s * 1.34, torsoH * 0.55, s * 1.95, s * 0.2), ironM, s * 0.02, torsoH * 0.7, 0))); // iron chest plate
  torso.add(mesh(rboxGeo(s * 1.36, torsoH * 0.4, s * 1.98, s * 0.15), darkM, 0, torsoH * 0.2, 0)); // skirt
  torso.add(mesh(rboxGeo(s * 1.4, s * 0.26, s * 2.0, s * 0.06), teamM, 0, torsoH * 0.44, 0)); // belt
  torso.add(mesh(sphereGeo(s * 0.18, 8), toon(0xe9c46a), s * 0.7, torsoH * 0.44, 0)); // buckle
  torso.add(mesh(boxGeo(s * 0.08, torsoH * 0.5, s * 0.5), teamM, s * 0.66, torsoH * 0.72, 0)); // tabard mark
  // rivets on the chest plate
  for (const side of [-1, 1]) for (let k = 0; k < 2; k++) torso.add(mesh(sphereGeo(s * 0.06, 6), toon(0xe9c46a), s * 0.7, torsoH * (0.55 + k * 0.3), side * s * 0.6));
  // shoulder plates with rims + chains
  for (const side of [-1, 1]) {
    const p = outline(mesh(sphereGeo(s * 0.55, 12), metalM, 0, torsoH + s * 0.02, side * s * 0.95)); p.scale.set(1, 0.7, 1); torso.add(p);
    attach(torso, mesh(torusGeo(s * 0.5, s * 0.06, Math.PI * 2, 14), ironM, 0, torsoH + s * 0.02, side * s * 0.95)).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) torso.add(mesh(coneGeo(s * 0.08, s * 0.25, 5), ironM, Math.cos(i * 1.2 - 1.2) * s * 0.4, torsoH + s * 0.35, side * s * 0.95 + Math.sin(i * 1.2 - 1.2) * s * 0.4));
  }
  const chain = mesh(torusGeo(s * 0.95, s * 0.05, Math.PI, 14), ironM, s * 0.6, torsoH * 0.95, 0); chain.rotation.set(Math.PI / 2, 0, Math.PI); chain.scale.set(1, 1, 0.5); torso.add(chain);
  for (let i = 0; i < 5; i++) attach(torso, mesh(torusGeo(s * 0.06, s * 0.02, Math.PI * 2, 8), ironM, s * 0.66, torsoH * 0.95 - Math.sin(i / 4 * Math.PI) * s * 0.25, -s * 0.9 + i * s * 0.45)).rotation.y = i % 2 ? Math.PI / 2 : 0;
  grp.add(torso);
  parts.torso = torso;
  // head: small, sunken, horned cap
  const headG = new THREE.Group();
  headG.position.y = hip + torsoH - s * 0.05;
  const head = outline(mesh(sphereGeo(s * 0.46, 12), skinM, s * 0.15, s * 0.42, 0)); headG.add(head);
  parts.eyes = face(headG, s * 0.95, skinM, { angry: true });
  for (const e of parts.eyes) e.position.x += s * 0.12;
  const cap = mesh(sphereGeo(s * 0.44, 12), accM, s * 0.12, s * 0.6, 0); cap.scale.set(1, 0.6, 1); headG.add(cap);
  headG.add(mesh(boxGeo(s * 0.32, s * 0.1, s * 0.16), toon(0x6b4a2b), s * 0.5, s * 0.22, 0)); // beard block
  grp.add(headG);
  parts.head = headG;
  // huge arms
  const upperH = s * 0.7, foreH = s * 0.7;
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(0, hip + torsoH - s * 0.15, side * s * 1.05);
    piv.add(mesh(rboxGeo(s * 0.55, upperH, s * 0.55, s * 0.14), skinM, 0, -upperH / 2, 0));
    const elbow = new THREE.Group(); elbow.position.y = -upperH;
    elbow.add(mesh(rboxGeo(s * 0.6, foreH, s * 0.6, s * 0.14), wrapM, 0, -foreH / 2, 0));
    elbow.add(mesh(torusGeo(s * 0.34, s * 0.05, Math.PI * 2, 12), ironM, 0, -foreH * 0.5, 0));
    const fist = outline(mesh(sphereGeo(s * 0.4, 10), wrapM, 0, -foreH - s * 0.15, 0)); elbow.add(fist);
    for (let k = 0; k < 3; k++) elbow.add(mesh(rboxGeo(s * 0.16, s * 0.14, s * 0.14, s * 0.04), skinM, s * 0.3, -foreH - s * 0.05 - k * s * 0.02, (k - 1) * s * 0.17));
    elbow.add(mesh(torusGeo(s * 0.42, s * 0.05, Math.PI * 2, 12), ironM, 0, -foreH - s * 0.15, 0)); // knuckle band
    piv.add(elbow);
    grp.add(piv);
    if (side < 0) { parts.armL = piv; parts.elbowL = elbow; } else { parts.armR = piv; parts.elbowR = elbow; }
    piv.rotation.z = 0.25; elbow.rotation.z = 0.5;
  }
  const height = hip + torsoH + s * 0.95;
  return { grp, parts, mats, height, eye: hip + torsoH + s * 0.3, hover: 0 };
}

export function buildFlyer(look: Look, team: Team): BuiltUnit {
  const s = look.size;
  const mats: UnitMat[] = [];
  const body = hex(look.color), accent = hex(look.accent), teamC = TEAM_HEX[team];
  const bodyM = toon(body), bellyM = toon(shade(body, 1.25)), accM = toon(accent, { emissive: accent, emissiveIntensity: 0.3 }), wingM = toon(shade(body, 0.55), { side: THREE.DoubleSide }), teamM = toon(teamC, { emissive: teamC, emissiveIntensity: 0.2 });
  mats.push(bodyM, bellyM, accM, wingM, teamM);
  const grp = new THREE.Group();
  const parts: UnitParts = {};
  const g2 = new THREE.Group();
  const bodyMesh = outline(mesh(sphereGeo(s * 0.85, 14), bodyM, 0, 0, 0)); bodyMesh.scale.set(1.05, 1, 0.95); g2.add(bodyMesh);
  const belly = mesh(sphereGeo(s * 0.6, 12), bellyM, s * 0.35, -s * 0.15, 0); belly.scale.set(0.8, 0.9, 0.9); g2.add(belly);
  attach(g2, mesh(torusGeo(s * 0.7, s * 0.06, Math.PI * 2, 16), teamM, 0, -s * 0.35, 0)).rotation.x = Math.PI / 2; // team collar-ish band
  const eyeM = toon(0xfff1a8, { emissive: 0xffd000, emissiveIntensity: 3 });
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const e = mesh(sphereGeo(s * 0.16, 8), eyeM, s * 0.7, s * 0.2, side * s * 0.32); eyes.push(e); g2.add(e);
    g2.add(mesh(sphereGeo(s * 0.06, 6), toon(0x1a1a22), s * 0.85, s * 0.2, side * s * 0.32));
    const brow = mesh(boxGeo(s * 0.12, s * 0.06, s * 0.3), toon(shade(body, 0.4)), s * 0.72, s * 0.42, side * s * 0.32); brow.rotation.x = side * -0.5; g2.add(brow);
    const horn = mesh(coneGeo(s * 0.13, s * 0.5, 6), accM, s * 0.15, s * 0.85, side * s * 0.38); horn.rotation.x = side * -0.5; horn.rotation.z = -0.25; g2.add(horn);
    const ear = mesh(coneGeo(s * 0.14, s * 0.4, 4), bodyM, -s * 0.1, s * 0.35, side * s * 0.85); ear.rotation.x = side * -1.3; g2.add(ear);
  }
  g2.add(mesh(boxGeo(s * 0.18, s * 0.08, s * 0.5), toon(0x1a1a1a), s * 0.82, -s * 0.12, 0)); // grin
  for (const side of [-1, 1]) attach(g2, mesh(coneGeo(s * 0.04, s * 0.12, 4), toon(0xffffff), s * 0.85, -s * 0.2, side * s * 0.15)).rotation.x = Math.PI;
  // bat wings
  const wing = wingGeo('bat', [[0, 0], [0.5, 0.55], [1.4, 0.75], [1.7, 0.25], [1.5, -0.1], [1.1, -0.35], [0.7, -0.2], [0.3, -0.3]]);
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(-s * 0.15, s * 0.35, side * s * 0.6);
    const w = new THREE.Mesh(wing, wingM); w.castShadow = true;
    w.scale.setScalar(s * 1.3);
    w.rotation.y = side * Math.PI / 2 * -1; // extend sideways along z
    w.rotation.x = 0;
    piv.add(w);
    for (let k = 0; k < 3; k++) { const spar = mesh(cylGeo(s * 0.03, s * 0.02, s * 1.5, 5), toon(shade(body, 0.35)), 0, s * 0.15 + k * s * 0.05, side * s * 0.75); spar.rotation.x = side * Math.PI / 2 + (k - 1) * 0.35; piv.add(spar); }
    g2.add(piv);
    if (side < 0) parts.wingL = piv; else parts.wingR = piv;
  }
  // tail + legs
  const tail = new THREE.Group(); tail.position.set(-s * 0.7, -s * 0.2, 0);
  const segs: THREE.Object3D[] = [];
  let parent: THREE.Object3D = tail;
  for (let i = 0; i < 3; i++) { const seg = new THREE.Group(); seg.position.x = i === 0 ? 0 : -s * 0.35; attach(seg, mesh(cylGeo(s * 0.06 - i * s * 0.012, s * 0.08 - i * s * 0.012, s * 0.38, 6), bodyM, -s * 0.18, 0, 0)).rotation.z = Math.PI / 2; parent.add(seg); segs.push(seg); parent = seg; }
  attach(parent, mesh(coneGeo(s * 0.14, s * 0.3, 4), accM, -s * 0.45, 0, 0)).rotation.z = Math.PI / 2;
  g2.add(tail); parts.tail = tail; parts.tailSegs = segs;
  const legs: THREE.Object3D[] = [];
  for (const side of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.1, -s * 0.7, side * s * 0.35); l.add(mesh(cylGeo(s * 0.07, s * 0.06, s * 0.4, 6), bodyM, 0, -s * 0.2, 0)); for (let k = 0; k < 2; k++) attach(l, mesh(coneGeo(s * 0.04, s * 0.14, 4), accM, s * 0.06, -s * 0.42, (k - 0.5) * s * 0.08)).rotation.z = -1.2; g2.add(l); legs.push(l); }
  parts.legs = legs;
  parts.eyes = eyes;
  parts.torso = g2;
  grp.add(g2);
  return { grp, parts, mats, height: s * 1.7, eye: s * 0.3, hover: 1.3 };
}

export function buildDragon(look: Look, team: Team): BuiltUnit {
  const s = look.size;
  const mats: UnitMat[] = [];
  const body = hex(look.color), accent = hex(look.accent), teamC = TEAM_HEX[team];
  const bodyM = toon(body), bellyM = toon(accent), darkM = toon(shade(body, 0.6)), memM = toon(shade(body, 0.8), { side: THREE.DoubleSide, transparent: true, opacity: 0.92 }), teamM = toon(teamC, { emissive: teamC, emissiveIntensity: 0.2 }), hornM = toon(0xf1e7d0);
  mats.push(bodyM, bellyM, darkM, memM, teamM, hornM);
  const grp = new THREE.Group();
  const parts: UnitParts = {};
  const g2 = new THREE.Group();
  const torso = outline(mesh(sphereGeo(s * 1.0, 14), bodyM, 0, 0, 0)); torso.scale.set(1.55, 0.9, 1.05); g2.add(torso);
  for (let i = 0; i < 4; i++) g2.add(mesh(rboxGeo(s * 0.32, s * 0.12, s * 0.9 - i * s * 0.1, s * 0.04), bellyM, s * 0.9 - i * s * 0.45, -s * 0.72 + i * s * 0.02, 0));
  attach(g2, mesh(torusGeo(s * 0.95, s * 0.07, Math.PI * 2, 16), teamM, s * 0.35, 0, 0)).rotation.y = Math.PI / 2; // harness band
  for (let i = 0; i < 6; i++) { const spike = mesh(coneGeo(s * 0.11, s * 0.36, 4), bellyM, s * 1.0 - i * s * 0.42, s * 0.75 + Math.sin(i * 0.6) * s * 0.1, 0); spike.rotation.z = -0.3; g2.add(spike); }
  // neck (two segments) + head
  const neck = new THREE.Group(); neck.position.set(s * 1.25, s * 0.2, 0);
  const n1 = mesh(cylGeo(s * 0.32, s * 0.42, s * 0.9, 9), bodyM, s * 0.3, s * 0.3, 0); n1.rotation.z = -0.95; neck.add(n1);
  const n2 = mesh(cylGeo(s * 0.26, s * 0.32, s * 0.8, 9), bodyM, s * 0.75, s * 0.85, 0); n2.rotation.z = -1.2; neck.add(n2);
  const headG = new THREE.Group(); headG.position.set(s * 1.05, s * 1.1, 0);
  const skull = outline(mesh(sphereGeo(s * 0.48, 12), bodyM, 0, 0, 0)); skull.scale.set(1.1, 0.9, 1); headG.add(skull);
  headG.add(outline(mesh(rboxGeo(s * 0.7, s * 0.34, s * 0.55, s * 0.1), bodyM, s * 0.55, -s * 0.05, 0))); // snout
  const jaw = new THREE.Group(); jaw.position.set(s * 0.15, -s * 0.2, 0);
  jaw.add(mesh(rboxGeo(s * 0.68, s * 0.18, s * 0.5, s * 0.06), darkM, s * 0.32, -s * 0.06, 0));
  for (let k = 0; k < 3; k++) jaw.add(mesh(coneGeo(s * 0.035, s * 0.12, 4), toon(0xffffff), s * 0.15 + k * s * 0.2, s * 0.06, (k % 2 ? 1 : -1) * s * 0.18));
  headG.add(jaw); parts.jaw = jaw;
  for (let k = 0; k < 4; k++) attach(headG, mesh(coneGeo(s * 0.035, s * 0.12, 4), toon(0xffffff), s * 0.35 + k * s * 0.14, -s * 0.2, (k % 2 ? 1 : -1) * s * 0.2)).rotation.x = Math.PI;
  const eyeM = toon(0xffd54a, { emissive: 0xffb300, emissiveIntensity: 3 });
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const e = mesh(sphereGeo(s * 0.11, 8), eyeM, s * 0.3, s * 0.2, side * s * 0.36); eyes.push(e); headG.add(e);
    headG.add(mesh(sphereGeo(s * 0.045, 6), toon(0x101010), s * 0.39, s * 0.2, side * s * 0.36));
    const horn = mesh(coneGeo(s * 0.11, s * 0.7, 6), hornM, -s * 0.3, s * 0.35, side * s * 0.28); horn.rotation.z = 1.9; horn.rotation.x = side * -0.3; headG.add(horn);
    headG.add(mesh(sphereGeo(s * 0.04, 5), darkM, s * 0.88, s * 0.02, side * s * 0.14)); // nostril
    const frill = mesh(coneGeo(s * 0.12, s * 0.35, 4), bellyM, -s * 0.15, s * 0.05, side * s * 0.5); frill.rotation.x = side * -1.3; headG.add(frill);
  }
  neck.add(headG); g2.add(neck);
  parts.head = headG; parts.neck = neck; parts.eyes = eyes;
  // wings: membrane + spars
  const wing = wingGeo('drake', [[0, 0], [0.6, 0.7], [1.6, 1.0], [2.4, 0.65], [2.2, 0.15], [1.7, -0.25], [1.1, -0.35], [0.5, -0.25]]);
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(-s * 0.15, s * 0.45, side * s * 0.6);
    const w = new THREE.Mesh(wing, memM); w.castShadow = true; w.scale.setScalar(s * 1.25); w.rotation.y = -side * Math.PI / 2; piv.add(w);
    for (let k = 0; k < 4; k++) { const spar = mesh(cylGeo(s * 0.05, s * 0.025, s * 2.6, 5), darkM, 0, s * 0.05, side * s * 1.3); spar.rotation.x = side * Math.PI / 2 + (k - 1.5) * 0.28; piv.add(spar); }
    piv.add(mesh(sphereGeo(s * 0.16, 8), darkM, 0, 0, 0));
    g2.add(piv);
    if (side < 0) parts.wingL = piv; else parts.wingR = piv;
  }
  // legs
  const legs: THREE.Object3D[] = [];
  for (const fx of [0.55, -0.55]) for (const side of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * fx, -s * 0.55, side * s * 0.6);
    l.add(mesh(cylGeo(s * 0.14, s * 0.11, s * 0.6, 7), bodyM, 0, -s * 0.3, 0));
    for (let k = 0; k < 3; k++) attach(l, mesh(coneGeo(s * 0.05, s * 0.2, 4), hornM, s * 0.12, -s * 0.62, (k - 1) * s * 0.12)).rotation.z = -1.3;
    g2.add(l); legs.push(l);
  }
  parts.legs = legs;
  // tail: tapering segments with fin
  const tail = new THREE.Group(); tail.position.set(-s * 1.4, 0, 0);
  const segs: THREE.Object3D[] = [];
  let parent: THREE.Object3D = tail;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group(); seg.position.x = i === 0 ? 0 : -s * 0.55;
    const m = mesh(cylGeo(s * 0.28 - i * s * 0.06, s * 0.34 - i * s * 0.06, s * 0.6, 8), bodyM, -s * 0.28, 0, 0); m.rotation.z = Math.PI / 2; seg.add(m);
    seg.add(mesh(coneGeo(s * 0.08, s * 0.25, 4), bellyM, -s * 0.28, s * 0.3 - i * s * 0.05, 0));
    parent.add(seg); segs.push(seg); parent = seg;
  }
  const fin = new THREE.Mesh(wingGeo('fin', [[0, 0], [-0.5, 0.45], [-0.9, 0], [-0.5, -0.45]]), memM); fin.scale.setScalar(s * 0.7); fin.position.x = -s * 0.5; fin.castShadow = true; parent.add(fin);
  g2.add(tail); parts.tail = tail; parts.tailSegs = segs;
  parts.torso = g2;
  grp.add(g2);
  return { grp, parts, mats, height: s * 2.4, eye: s * 1.4, hover: 1.6 };
}

export function buildBeast(look: Look, team: Team): BuiltUnit {
  const s = look.size;
  const mats: UnitMat[] = [];
  const fur = hex(look.color), accent = hex(look.accent), teamC = TEAM_HEX[team];
  const furM = toon(fur), darkM = toon(shade(fur, 0.55)), maneM = toon(shade(fur, 0.35)), teamM = toon(teamC, { emissive: teamC, emissiveIntensity: 0.2 }), tuskM = toon(0xf5f0e1), hoofM = toon(0x2a2220), leatherM = toon(0x5a3a1e);
  mats.push(furM, darkM, maneM, teamM, tuskM, hoofM, leatherM);
  const grp = new THREE.Group();
  const parts: UnitParts = {};
  const mount = new THREE.Group();
  const bodyH = s * 1.2, bodyY = s * 1.0;
  const bodyMesh = outline(mesh(rboxGeo(s * 2.3, bodyH, s * 1.35, s * 0.3), furM, 0, bodyY + bodyH / 2, 0)); mount.add(bodyMesh);
  mount.add(mesh(rboxGeo(s * 1.6, bodyH * 0.5, s * 1.4, s * 0.2), darkM, s * 0.1, bodyY + bodyH * 0.25, 0)); // belly
  for (let i = 0; i < 6; i++) { const tuft = mesh(coneGeo(s * 0.14, s * 0.35, 4), maneM, s * 1.0 - i * s * 0.32, bodyY + bodyH + s * 0.1, (i % 2 ? 0.08 : -0.08) * s); tuft.rotation.z = -0.5; mount.add(tuft); }
  // head
  const headG = new THREE.Group(); headG.position.set(s * 1.35, bodyY + bodyH * 0.75, 0);
  headG.add(outline(mesh(rboxGeo(s * 0.9, s * 0.85, s * 0.95, s * 0.2), darkM, 0, 0, 0)));
  headG.add(outline(mesh(rboxGeo(s * 0.5, s * 0.42, s * 0.5, s * 0.12), toon(0x2a2a2a), s * 0.6, -s * 0.15, 0))); // snout
  for (const side of [-1, 1]) {
    const tusk = mesh(coneGeo(s * 0.09, s * 0.5, 5), tuskM, s * 0.55, -s * 0.1, side * s * 0.32); tusk.rotation.z = 1.0; tusk.rotation.x = side * 0.5; headG.add(tusk);
    headG.add(mesh(sphereGeo(s * 0.1, 7), toon(0x111111), s * 0.4, s * 0.2, side * s * 0.36));
    headG.add(mesh(sphereGeo(s * 0.04, 5), toon(0xffffff), s * 0.46, s * 0.24, side * s * 0.36));
    const ear = mesh(coneGeo(s * 0.16, s * 0.4, 4), darkM, -s * 0.15, s * 0.5, side * s * 0.35); ear.rotation.x = side * -0.5; headG.add(ear);
  }
  for (let i = 0; i < 3; i++) { const tuft = mesh(coneGeo(s * 0.12, s * 0.3, 4), maneM, -s * 0.2 + i * s * 0.25, s * 0.5, 0); tuft.rotation.z = -0.4; headG.add(tuft); }
  mount.add(headG); parts.head = headG;
  // legs with hooves
  const legs: THREE.Object3D[] = [];
  for (const fx of [-0.8, 0.8]) for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * fx, bodyY + s * 0.1, side * s * 0.48);
    piv.add(mesh(rboxGeo(s * 0.34, s * 0.85, s * 0.34, s * 0.08), darkM, 0, -s * 0.42, 0));
    piv.add(mesh(cylGeo(s * 0.19, s * 0.21, s * 0.18, 8), hoofM, 0, -s * 0.95, 0));
    mount.add(piv); legs.push(piv);
  }
  parts.legs = legs;
  // tail
  const tail = new THREE.Group(); tail.position.set(-s * 1.15, bodyY + bodyH * 0.7, 0);
  attach(tail, mesh(cylGeo(s * 0.04, s * 0.05, s * 0.5, 5), darkM, -s * 0.25, -s * 0.1, 0)).rotation.z = 1.2;
  tail.add(mesh(sphereGeo(s * 0.12, 6), maneM, -s * 0.5, -s * 0.3, 0));
  mount.add(tail); parts.tail = tail;
  // saddle with straps + horn
  mount.add(outline(mesh(rboxGeo(s * 1.1, s * 0.22, s * 1.2, s * 0.08), teamM, -s * 0.1, bodyY + bodyH + s * 0.05, 0)));
  mount.add(mesh(rboxGeo(s * 0.22, s * 0.3, s * 0.3, s * 0.06), leatherM, s * 0.45, bodyY + bodyH + s * 0.25, 0));
  attach(mount, mesh(torusGeo(s * 0.7, s * 0.05, Math.PI * 2, 16), leatherM, -s * 0.1, bodyY + bodyH * 0.5, 0)).rotation.y = Math.PI / 2;
  for (const side of [-1, 1]) mount.add(mesh(rboxGeo(s * 0.35, s * 0.45, s * 0.12, s * 0.03), leatherM, -s * 0.1, bodyY + bodyH * 0.35, side * s * 0.75)); // stirrups
  parts.mount = mount;
  grp.add(mount);
  // rider
  const riderLook: Look = { ...look, size: s * 0.72, color: look.accent, accent: look.color };
  const r = buildHumanoid(riderLook, team, { scale: 1, rider: true });
  r.grp.position.set(-s * 0.15, bodyY + bodyH - s * 0.3, 0);
  grp.add(r.grp);
  parts.rider = r.grp; parts.armR = r.parts.armR; parts.armL = r.parts.armL; parts.elbowR = r.parts.elbowR; parts.elbowL = r.parts.elbowL; parts.eyes = r.parts.eyes; parts.torso = r.parts.torso; parts.cape = r.parts.cape;
  r.parts.legL!.rotation.x = 1.0; r.parts.legR!.rotation.x = -1.0; r.parts.legL!.rotation.z = 0.5; r.parts.legR!.rotation.z = 0.5;
  const w = buildWeapon(look.weapon, s * 0.72, accent, mats);
  w.position.set(s * 0.72 * 0.12, -s * 0.72 * 0.48, 0);
  w.rotation.z = look.weapon === 'lance' ? -1.5 : -1.2;
  r.parts.elbowR!.add(w); parts.weapon = w;
  mats.push(...r.mats);
  return { grp, parts, mats, height: bodyY + bodyH - s * 0.3 + r.height, eye: bodyY + bodyH - s * 0.3 + r.eye, hover: 0 };
}

export function buildWraith(look: Look, team: Team): BuiltUnit {
  const s = look.size;
  const mats: UnitMat[] = [];
  const body = hex(look.color), accent = hex(look.accent), teamC = TEAM_HEX[team];
  const robeM = toon(body), hoodM = toon(shade(body, 0.7)), eyeM = toon(accent, { emissive: accent, emissiveIntensity: 3.2 }), flapM = toon(shade(body, 0.85), { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), teamM = toon(teamC, { emissive: teamC, emissiveIntensity: 0.25 }), shardM = toon(accent, { emissive: accent, emissiveIntensity: 1.8 });
  mats.push(robeM, hoodM, eyeM, flapM, teamM, shardM);
  const grp = new THREE.Group();
  const parts: UnitParts = {};
  const g2 = new THREE.Group();
  g2.add(outline(mesh(cylGeo(s * 0.5, s * 0.9, s * 1.7, 10), robeM, 0, s * 0.85, 0)));
  g2.add(mesh(cylGeo(s * 0.55, s * 0.5, s * 0.18, 10), teamM, 0, s * 1.45, 0)); // sash ring
  const sash = mesh(boxGeo(s * 0.06, s * 1.3, s * 0.28), teamM, s * 0.5, s * 0.95, s * 0.05); sash.rotation.x = 0.35; g2.add(sash);
  // tattered flaps
  const flapGeo = wingGeo('flap', [[0, 0], [0.4, -0.9], [0.0, -1.35], [-0.4, -0.9]]);
  const flaps: THREE.Object3D[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const piv = new THREE.Group(); piv.position.set(Math.cos(a) * s * 0.85, s * 0.05, Math.sin(a) * s * 0.85); piv.rotation.y = -a + Math.PI / 2;
    const f = new THREE.Mesh(flapGeo, flapM); f.scale.setScalar(s * 0.7); f.castShadow = true; piv.add(f);
    piv.rotation.x = 0.25;
    g2.add(piv); flaps.push(piv);
  }
  parts.flaps = flaps;
  const headG = new THREE.Group(); headG.position.y = s * 1.7;
  headG.add(outline(mesh(coneGeo(s * 0.62, s * 1.2, 9), hoodM, 0, s * 0.5, 0)));
  headG.add(mesh(sphereGeo(s * 0.4, 10), toon(0x08080f), s * 0.12, s * 0.2, 0));
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) { const e = mesh(sphereGeo(s * 0.09, 6), eyeM, s * 0.42, s * 0.27, side * s * 0.15); e.scale.set(0.6, 1, 1.4); eyes.push(e); headG.add(e); }
  g2.add(headG); parts.head = headG; parts.eyes = eyes;
  const armH = s * 0.9;
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(0, s * 1.5, side * s * 0.55);
    piv.add(mesh(cylGeo(s * 0.14, s * 0.22, armH, 8), robeM, 0, -armH / 2, 0));
    const elbow = new THREE.Group(); elbow.position.y = -armH;
    elbow.add(mesh(sphereGeo(s * 0.14, 8), toon(0x1a1024), 0, 0, 0));
    piv.add(elbow);
    g2.add(piv);
    if (side < 0) { parts.armL = piv; parts.elbowL = elbow; } else { parts.armR = piv; parts.elbowR = elbow; }
    piv.rotation.z = 0.3;
  }
  const w = buildWeapon(look.weapon, s, accent, mats);
  w.position.set(s * 0.1, -s * 0.02, 0); w.rotation.z = -1.2;
  parts.elbowR!.add(w); parts.weapon = w;
  // orbiting shards
  const shards: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) { const ang = (i / 4) * Math.PI * 2; const sh = mesh(tetraGeo(s * 0.16), shardM, Math.cos(ang) * 0.9, 1.3 + Math.sin(i * 1.3) * 0.3, Math.sin(ang) * 0.9); sh.rotation.set(i, i * 1.5, 0); g2.add(sh); shards.push(sh); }
  parts.shards = shards;
  parts.torso = g2;
  grp.add(g2);
  return { grp, parts, mats, height: s * 3.0, eye: s * 2.05, hover: 0.3 };
}
