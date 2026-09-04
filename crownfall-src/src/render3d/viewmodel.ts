import * as THREE from 'three';
import type { Look, Team, WeaponKind } from '../game/types.ts';
import { SKIN, TEAM_HEX, buildWeapon, coneGeo, cylGeo, hex, mesh, rboxGeo, shade, sphereGeo, toon, torusGeo, type UnitMat } from './model_kit.ts';

/**
 * First-person "viewmodel": the champion's own hands, weapon or snout, built in camera space
 * (+x right, +y up, -z forward) and attached as a child of the camera. Transform hierarchies only.
 */
export interface ViewmodelState { dt: number; time: number; moving: boolean; attackAnim: number; abilityT: number; dashing: boolean }
export interface Viewmodel { group: THREE.Group; animate(state: ViewmodelState): void; dispose(): void }

const ZAXIS = new THREE.Vector3(0, 0, 1);
const tmpQ = new THREE.Quaternion();

/** Attack curve shared with the world models: windup back, fast strike, recover. */
function strikeCurve(ph: number): number {
  if (ph < 0.3) return -0.9 * (ph / 0.3);
  if (ph < 0.55) return -0.9 + 2.6 * ((ph - 0.3) / 0.25);
  return 1.7 * (1 - (ph - 0.55) / 0.45);
}
const strikeOf = (attackAnim: number): { c: number; amt: number } => {
  const ph = attackAnim > 0 ? 1 - attackAnim : -1;
  return { c: ph >= 0 ? strikeCurve(ph) : 0, amt: ph >= 0 ? Math.sin(Math.min(1, ph / 0.55) * Math.PI) : 0 };
};

interface ArmStyle { sleeve: number; glove: number; skin: number; team: number; bone?: boolean; shadow?: boolean; scale?: number; plate?: boolean }
interface Arm { pivot: THREE.Group; hand: THREE.Group; base: THREE.Quaternion; rest: THREE.Vector3; len: number }

/** Forearm along +Z from the shoulder pivot; the hand group sits at z = len. */
function buildArm(st: ArmStyle, mats: UnitMat[], len = 0.36): Arm {
  const k = st.scale ?? 1;
  const pivot = new THREE.Group();
  const sleeveM = st.shadow ? toon(st.sleeve, { transparent: true, opacity: 0.85 }) : toon(st.sleeve);
  const gloveM = toon(st.glove), skinM = st.bone ? toon(0xe6e2d6) : st.shadow ? toon(0x1a1024) : toon(st.skin);
  const teamM = toon(st.team, { emissive: st.team, emissiveIntensity: 0.12 });
  const metalM = toon(0xb8c0cc);
  mats.push(sleeveM, gloveM, skinM, teamM, metalM);
  if (st.bone) {
    for (const off of [-0.012, 0.012]) pivot.add(mesh(cylGeo(0.014 * k, 0.017 * k, len * 0.62, 6), skinM, off * k, 0, len * 0.31)).rotation.x = Math.PI / 2;
    pivot.add(mesh(sphereGeo(0.028 * k, 8), skinM, 0, 0, len * 0.02));
  } else {
    // upper sleeve, elbow pad, forearm, cuff
    pivot.add(mesh(rboxGeo(0.082 * k, 0.082 * k, len * 0.5, 0.025 * k), sleeveM, 0, 0, len * 0.25));
    if (st.plate) pivot.add(mesh(sphereGeo(0.052 * k, 10), metalM, 0, 0.01 * k, len * 0.02));
    pivot.add(mesh(rboxGeo(0.07 * k, 0.07 * k, len * 0.36, 0.02 * k), st.plate ? metalM : sleeveM, 0, 0, len * 0.66));
    const cuff = mesh(cylGeo(0.05 * k, 0.056 * k, 0.05 * k, 10), teamM, 0, 0, len * 0.5); cuff.rotation.x = Math.PI / 2; pivot.add(cuff);
  }
  const hand = new THREE.Group();
  hand.position.z = len;
  pivot.add(hand);
  if (st.bone) {
    hand.add(mesh(rboxGeo(0.055 * k, 0.03 * k, 0.06 * k, 0.008 * k), skinM, 0, 0, 0.015 * k));
    for (let i = -1; i <= 1; i++) { const f = mesh(cylGeo(0.008 * k, 0.01 * k, 0.06 * k, 5), skinM, i * 0.018 * k, -0.01 * k, 0.07 * k); f.rotation.x = Math.PI / 2 - 0.5; hand.add(f); }
    const th = mesh(cylGeo(0.009 * k, 0.011 * k, 0.045 * k, 5), skinM, 0.035 * k, 0.005 * k, 0.035 * k); th.rotation.z = -1.2; th.rotation.x = 1.0; hand.add(th);
  } else {
    const palm = mesh(rboxGeo(0.078 * k, 0.048 * k, 0.085 * k, 0.014 * k), gloveM, 0, 0, 0.02 * k); hand.add(palm);
    for (let i = -1; i <= 1; i++) {
      const f = mesh(rboxGeo(0.02 * k, 0.02 * k, 0.062 * k, 0.007 * k), gloveM, i * 0.024 * k, -0.012 * k, 0.075 * k);
      f.rotation.x = -0.75; hand.add(f);
    }
    const th = mesh(rboxGeo(0.02 * k, 0.02 * k, 0.05 * k, 0.007 * k), gloveM, 0.045 * k, 0.004 * k, 0.03 * k);
    th.rotation.z = -1.1; th.rotation.x = 0.9; hand.add(th);
    if (st.plate) hand.add(mesh(rboxGeo(0.084 * k, 0.03 * k, 0.07 * k, 0.01 * k), metalM, 0, 0.026 * k, 0.015 * k));
  }
  if (st.shadow) for (let i = 0; i < 4; i++) { const w = mesh(sphereGeo(0.012 * k + i * 0.004, 6), toon(0x6b3fb0, { emissive: 0x9b5cff, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 }), (i - 1.5) * 0.02 * k, 0.03 * k, len * 0.25 + i * 0.06); pivot.add(w); }
  return { pivot, hand, base: new THREE.Quaternion(), rest: new THREE.Vector3(), len };
}

/** Place an arm so its forearm runs from `from` to `to` (camera space). */
function placeArm(arm: Arm, from: THREE.Vector3, to: THREE.Vector3): void {
  const dir = to.clone().sub(from).normalize();
  arm.base.setFromUnitVectors(ZAXIS, dir);
  arm.rest.copy(from);
  arm.pivot.position.copy(from);
  arm.pivot.quaternion.copy(arm.base);
}

/** Apply an animation rotation (euler) on top of the arm's base orientation. */
function poseArm(arm: Arm, rx: number, ry: number, rz: number, dx = 0, dy = 0, dz = 0): void {
  tmpQ.setFromEuler(new THREE.Euler(rx, ry, rz));
  arm.pivot.quaternion.copy(arm.base).multiply(tmpQ);
  arm.pivot.position.set(arm.rest.x + dx, arm.rest.y + dy, arm.rest.z + dz);
}

/** Weapons come out of buildWeapon along +Y with the grip at the origin; orient them in the hand. */
function gripWeapon(kind: WeaponKind, w: THREE.Group): void {
  switch (kind) {
    case 'sword': w.rotation.set(-0.55, 0, 0.12); break;
    case 'dagger': w.rotation.set(-0.7, 0, 0.25); break;
    case 'axe': w.rotation.set(-0.45, 0.2, -0.1); break;
    case 'hammer': w.rotation.set(-0.4, 0, -0.15); break;
    case 'scythe': w.rotation.set(-0.5, 0.3, 0.65); w.position.y -= 0.02; break;
    case 'staff': w.rotation.set(-0.12, 0, -0.08); w.position.y -= 0.12; break;
    case 'spear': w.rotation.set(-1.25, 0, 0); w.position.y += 0.01; break;
    case 'lance': w.rotation.set(-1.4, 0, 0); w.position.y += 0.02; break;
    case 'rifle': w.rotation.set(-1.42, 0, 0); w.position.set(0.0, 0.015, 0.02); break;
    case 'bow': w.rotation.set(0.05, Math.PI / 2, 0); w.position.y -= 0.35; break;
    case 'orb': w.rotation.set(0, 0, 0); w.position.y += 0.02; break;
    case 'book': w.rotation.set(-1.0, 0.3, 0.2); w.position.y += 0.0; break;
    case 'bomb': w.rotation.set(0.2, 0, 0); w.position.y += 0.0; break;
    default: break;
  }
}

const RIGHT_FROM = new THREE.Vector3(0.46, -0.44, -0.3);
const RIGHT_TO = new THREE.Vector3(0.2, -0.2, -0.52);
const LEFT_FROM = new THREE.Vector3(-0.46, -0.44, -0.3);

/** Clamp weapon glow so it never blooms out an inch from the camera. */
function tameGlow(mats: UnitMat[], max = 1.4): void { for (const m of mats) if (m.emissiveIntensity > max) m.emissiveIntensity = max; }

interface Rig {
  arms: Arm[];
  right?: Arm; left?: Arm;
  weapon?: THREE.Group;
  glow: THREE.Mesh[];
  jaw?: THREE.Group; snout?: THREE.Group; throat?: THREE.Mesh;
  mountHead?: THREE.Group; ears: THREE.Object3D[]; reins: THREE.Mesh[];
  wisps: THREE.Object3D[];
  bomb?: THREE.Object3D;
  mode: 'melee' | 'thrust' | 'rifle' | 'bow' | 'book' | 'orb' | 'bomb' | 'fists' | 'claws' | 'dragon' | 'beast';
}

function findGlow(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => { const m = o as THREE.Mesh; const mm = m.material as UnitMat | undefined; if (m.isMesh && mm && (mm as THREE.MeshStandardMaterial).emissiveIntensity > 0.9) out.push(m); });
  return out;
}

export function buildViewmodel(look: Look, team: Team): Viewmodel {
  const group = new THREE.Group();
  const mats: UnitMat[] = [];
  const color = hex(look.color), accent = hex(look.accent), teamHex = TEAM_HEX[team];
  const wk = look.weapon;
  const rig: Rig = { arms: [], glow: [], ears: [], reins: [], wisps: [], mode: 'melee' };
  const addArm = (st: ArmStyle, len?: number): Arm => { const a = buildArm(st, mats, len); rig.arms.push(a); group.add(a.pivot); return a; };
  const armWeapon = (hand: THREE.Group, kind: WeaponKind, s = 0.3): THREE.Group => {
    const wm: UnitMat[] = [];
    const w = buildWeapon(kind, s, accent, wm); tameGlow(wm); mats.push(...wm);
    gripWeapon(kind, w); hand.add(w); rig.glow.push(...findGlow(w));
    return w;
  };

  switch (look.shape) {
    case 'humanoid': case 'skeleton': case 'wraith': case 'building': {
      const bone = look.shape === 'skeleton', shadow = look.shape === 'wraith';
      const plate = wk === 'sword' || wk === 'lance' || wk === 'axe' || wk === 'hammer' || wk === 'shield';
      const st: ArmStyle = { sleeve: shadow ? color : plate ? shade(color, 0.85) : color, glove: shadow ? 0x1a1024 : plate ? 0x7c8592 : shade(accent, 0.85), skin: SKIN, team: teamHex, bone, shadow, plate };
      const right = addArm(st); rig.right = right;
      const twoHanded = wk === 'bow' || wk === 'rifle' || wk === 'axe' || wk === 'scythe' || wk === 'book' || wk === 'none' || wk === 'shield';
      const left = twoHanded ? addArm(st) : undefined; rig.left = left;
      switch (wk) {
        case 'bow':
          rig.mode = 'bow';
          rig.weapon = armWeapon(left!.hand, 'bow', 0.32);
          placeArm(left!, LEFT_FROM, new THREE.Vector3(-0.03, -0.1, -0.52));
          placeArm(right, new THREE.Vector3(0.44, -0.4, -0.22), new THREE.Vector3(0.12, -0.13, -0.32));
          break;
        case 'rifle':
          rig.mode = 'rifle';
          rig.weapon = armWeapon(right.hand, 'rifle', 0.3);
          placeArm(right, new THREE.Vector3(0.4, -0.44, -0.16), new THREE.Vector3(0.17, -0.2, -0.36));
          placeArm(left!, LEFT_FROM, new THREE.Vector3(0.08, -0.17, -0.64));
          break;
        case 'book':
          rig.mode = 'book';
          rig.weapon = armWeapon(left!.hand, 'book', 0.3);
          placeArm(left!, LEFT_FROM, new THREE.Vector3(-0.2, -0.2, -0.48));
          placeArm(right, RIGHT_FROM, new THREE.Vector3(0.24, -0.15, -0.5));
          break;
        case 'none': case 'shield':
          rig.mode = 'fists';
          placeArm(right, RIGHT_FROM, new THREE.Vector3(0.22, -0.22, -0.48));
          placeArm(left!, LEFT_FROM, new THREE.Vector3(-0.22, -0.22, -0.48));
          break;
        case 'staff':
          rig.mode = 'orb';
          rig.weapon = armWeapon(right.hand, 'staff', 0.3);
          placeArm(right, RIGHT_FROM, new THREE.Vector3(0.27, -0.26, -0.5));
          break;
        case 'orb':
          rig.mode = 'orb';
          rig.weapon = armWeapon(right.hand, 'orb', 0.32);
          placeArm(right, RIGHT_FROM, new THREE.Vector3(0.2, -0.24, -0.48));
          break;
        case 'bomb':
          rig.mode = 'bomb';
          rig.weapon = armWeapon(right.hand, 'bomb', 0.3);
          rig.bomb = rig.weapon;
          placeArm(right, RIGHT_FROM, new THREE.Vector3(0.22, -0.2, -0.48));
          break;
        case 'spear': case 'lance':
          rig.mode = 'thrust';
          rig.weapon = armWeapon(right.hand, wk, 0.3);
          placeArm(right, new THREE.Vector3(0.42, -0.42, -0.2), new THREE.Vector3(0.2, -0.22, -0.42));
          break;
        case 'axe': case 'scythe':
          rig.mode = 'melee';
          rig.weapon = armWeapon(right.hand, wk, 0.3);
          placeArm(right, RIGHT_FROM, RIGHT_TO);
          placeArm(left!, LEFT_FROM, new THREE.Vector3(0.0, -0.25, -0.5));
          break;
        default:
          rig.mode = 'melee';
          rig.weapon = armWeapon(right.hand, wk, 0.3);
          placeArm(right, RIGHT_FROM, RIGHT_TO);
      }
      if (shadow) for (let i = 0; i < 5; i++) { const w = mesh(sphereGeo(0.016 + i * 0.004, 6), toon(0x7b4fd0, { emissive: 0x9b5cff, emissiveIntensity: 0.9, transparent: true, opacity: 0.55 }), 0.3, -0.3, -0.45); group.add(w); rig.wisps.push(w); }
      break;
    }
    case 'brute': {
      rig.mode = 'fists';
      const st: ArmStyle = { sleeve: color, glove: 0xd9c9a8, skin: SKIN, team: teamHex, scale: 1.75 };
      const right = addArm(st, 0.4), left = addArm(st, 0.4); rig.right = right; rig.left = left;
      for (const a of [right, left]) for (let i = 0; i < 3; i++) { const band = mesh(torusGeo(0.058, 0.012, Math.PI * 2, 10), toon(0xc9b58f), 0, 0, 0.16 + i * 0.05); band.rotation.x = 0; a.pivot.add(band); }
      placeArm(right, new THREE.Vector3(0.5, -0.5, -0.2), new THREE.Vector3(0.24, -0.24, -0.5));
      placeArm(left, new THREE.Vector3(-0.5, -0.5, -0.2), new THREE.Vector3(-0.24, -0.24, -0.5));
      break;
    }
    case 'flyer': {
      rig.mode = 'claws';
      const st: ArmStyle = { sleeve: color, glove: shade(color, 0.75), skin: shade(color, 0.75), team: teamHex, scale: 0.85 };
      const right = addArm(st, 0.3), left = addArm(st, 0.3); rig.right = right; rig.left = left;
      const talonM = toon(accent); mats.push(talonM);
      for (const a of [right, left]) for (let i = -1; i <= 1; i++) { const t = mesh(coneGeo(0.009, 0.05, 5), talonM, i * 0.022, -0.012, 0.115); t.rotation.x = Math.PI / 2 - 0.9; a.hand.add(t); }
      placeArm(right, new THREE.Vector3(0.44, -0.42, -0.24), new THREE.Vector3(0.2, -0.2, -0.46));
      placeArm(left, new THREE.Vector3(-0.44, -0.42, -0.24), new THREE.Vector3(-0.2, -0.2, -0.46));
      break;
    }
    case 'dragon': {
      rig.mode = 'dragon';
      const hide = toon(color), belly = toon(accent), tooth = toon(0xf4efe4), nostril = toon(0x1a1410);
      const throat = toon(0xff8a2a, { emissive: 0xff5a1a, emissiveIntensity: 0.4 });
      mats.push(hide, belly, tooth, nostril, throat);
      const snout = new THREE.Group();
      snout.position.set(0, -0.2, -0.36);
      group.add(snout);
      // upper jaw: wide at the back, narrower at the tip
      const upperBack = mesh(rboxGeo(0.34, 0.1, 0.2, 0.03), hide, 0, 0.02, 0.02); snout.add(upperBack);
      const upperTip = mesh(rboxGeo(0.26, 0.085, 0.24, 0.03), hide, 0, 0.0, -0.18); snout.add(upperTip);
      for (const side of [-1, 1]) {
        snout.add(mesh(sphereGeo(0.02, 6), nostril, side * 0.07, 0.035, -0.28));
        snout.add(mesh(coneGeo(0.03, 0.09, 5), belly, side * 0.15, 0.09, -0.02)).rotation.x = -0.3;
        for (let i = 0; i < 3; i++) { const t = mesh(coneGeo(0.012, 0.045, 5), tooth, side * (0.05 + i * 0.035), -0.05, -0.29 + i * 0.05); t.rotation.x = Math.PI; snout.add(t); }
      }
      // lower jaw hinged at the back
      const jaw = new THREE.Group(); jaw.position.set(0, -0.05, 0.1); snout.add(jaw);
      jaw.add(mesh(rboxGeo(0.28, 0.07, 0.38, 0.03), belly, 0, -0.02, -0.19));
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const t = mesh(coneGeo(0.011, 0.04, 5), tooth, side * (0.05 + i * 0.035), 0.02, -0.36 + i * 0.05); jaw.add(t); }
      const th = mesh(sphereGeo(0.06, 8), throat, 0, 0.0, -0.1); th.scale.set(1.6, 0.5, 1.2); jaw.add(th);
      rig.jaw = jaw; rig.snout = snout; rig.throat = th;
      // the tips of our own horns at the top corners of the view
      for (const side of [-1, 1]) { const horn = mesh(coneGeo(0.05, 0.3, 6), belly, side * 0.38, 0.34, -0.42); horn.rotation.z = side * 0.6; horn.rotation.x = -0.5; group.add(horn); }
      break;
    }
    case 'beast': {
      rig.mode = 'beast';
      const boar = wk === 'hammer';
      const fur = toon(color), dark = toon(shade(color, 0.6)), leather = toon(0x5a3a22), tusk = toon(0xf1e7d0);
      mats.push(fur, dark, leather, tusk);
      const head = new THREE.Group(); head.position.set(0, -0.3, -0.5); group.add(head); rig.mountHead = head;
      const skull = mesh(rboxGeo(0.28, 0.18, 0.42, 0.05), fur, 0, 0, -0.1); head.add(skull);
      head.add(mesh(rboxGeo(0.2, 0.12, 0.16, 0.04), dark, 0, -0.03, -0.38)); // muzzle
      for (const side of [-1, 1]) {
        const ear = mesh(coneGeo(0.045, boar ? 0.14 : 0.2, 5), dark, side * 0.11, 0.13, 0.05); ear.rotation.z = side * -0.35; head.add(ear); rig.ears.push(ear);
        head.add(mesh(sphereGeo(0.022, 6), toon(0x111111), side * 0.11, 0.05, -0.28));
        if (boar) { const tk = mesh(coneGeo(0.02, 0.12, 5), tusk, side * 0.1, -0.08, -0.42); tk.rotation.x = -1.2; tk.rotation.z = side * 0.3; head.add(tk); }
      }
      for (let i = 0; i < 6; i++) { const m = mesh(coneGeo(0.03, 0.09, 4), dark, (i % 2 ? 0.04 : -0.04), 0.1, 0.1 - i * 0.03); m.rotation.x = -0.6; head.add(m); } // mane
      const st: ArmStyle = { sleeve: accent, glove: wk === 'lance' ? 0x7c8592 : shade(accent, 0.8), skin: SKIN, team: teamHex, plate: wk === 'lance' };
      const right = addArm(st); rig.right = right;
      rig.weapon = armWeapon(right.hand, wk, 0.3);
      if (wk === 'lance') placeArm(right, new THREE.Vector3(0.42, -0.4, -0.18), new THREE.Vector3(0.2, -0.2, -0.42));
      else placeArm(right, RIGHT_FROM, RIGHT_TO);
      const left = addArm(st); rig.left = left;
      placeArm(left, LEFT_FROM, new THREE.Vector3(-0.12, -0.22, -0.44));
      for (const side of [-1, 1]) { const r = mesh(cylGeo(0.006, 0.006, 0.34, 5), leather, side * 0.08, -0.25, -0.36); r.rotation.x = 1.1; r.rotation.z = side * 0.35; group.add(r); rig.reins.push(r); }
      break;
    }
  }
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });

  // smoothed motion state
  let bx = 0, by = 0, bz = 0, rx = 0, rz = 0, swing = 0;
  const animate = (st: ViewmodelState): void => {
    const t = st.time;
    const { c, amt } = strikeOf(st.attackAnim);
    const k = Math.min(1, st.dt * 14);
    const walkF = 8.5;
    const tx = (st.moving ? Math.cos(t * walkF * 0.5) * 0.012 : Math.sin(t * 1.1) * 0.003);
    const ty = (st.moving ? Math.abs(Math.sin(t * walkF)) * 0.014 : 0) + Math.sin(t * 1.7) * 0.004;
    const tz = st.dashing ? 0.07 : 0;
    const trx = st.dashing ? 0.14 : 0;
    const trz = st.moving ? Math.sin(t * walkF * 0.5) * 0.012 : 0;
    bx += (tx - bx) * k; by += (ty - by) * k; bz += (tz - bz) * k; rx += (trx - rx) * k; rz += (trz - rz) * k;
    swing += (amt - swing) * Math.min(1, st.dt * 30);
    group.position.set(bx, by, bz);
    group.rotation.set(rx, 0, rz);
    const ability = st.abilityT > 0;
    for (const g of rig.glow) { const m = g.material as THREE.MeshStandardMaterial; m.emissiveIntensity = Math.min(1.4, 0.9 + Math.sin(t * 6) * 0.25 + (ability ? 0.5 : 0)); g.scale.setScalar(1 + Math.sin(t * 6) * 0.05 + (ability ? 0.25 : 0)); }
    const R = rig.right, L = rig.left;
    switch (rig.mode) {
      case 'melee':
        if (R) poseArm(R, c * 0.32, -c * 0.28, -c * 0.6, -c * 0.12, c * 0.05, c * 0.06);
        if (L) poseArm(L, -c * 0.1, 0, c * 0.15, c * 0.02, 0, 0);
        break;
      case 'thrust':
        if (R) poseArm(R, -c * 0.06, 0, 0, 0, c * 0.02, -c * 0.17);
        break;
      case 'rifle':
        if (R) poseArm(R, -amt * 0.18, 0, 0, 0, amt * 0.01, amt * 0.06);
        if (L) poseArm(L, -amt * 0.12, 0, 0, 0, 0, amt * 0.06);
        break;
      case 'bow':
        if (R) poseArm(R, 0, 0, 0, -amt * 0.03, 0, amt * 0.14);
        if (L) poseArm(L, -amt * 0.05, 0, 0, 0, 0, 0);
        break;
      case 'book':
        if (R) poseArm(R, -amt * 0.3, 0, 0, 0, amt * 0.04, -amt * 0.12);
        if (L) poseArm(L, 0, 0, 0, 0, Math.sin(t * 2) * 0.004, 0);
        break;
      case 'orb':
        if (R) poseArm(R, -c * 0.12, 0, -c * 0.1, -c * 0.04, c * 0.02, -c * 0.1);
        break;
      case 'bomb':
        if (R) poseArm(R, -c * 0.95, 0, c * 0.15, 0, c * 0.12, -c * 0.1);
        if (rig.bomb) rig.bomb.visible = !(amt > 0.65);
        break;
      case 'fists':
        if (R) poseArm(R, -c * 0.1, 0, -c * 0.12, -c * 0.1, 0, -c * 0.15);
        if (L) poseArm(L, 0, 0, 0, 0, 0, c * 0.03 + (st.moving ? Math.sin(t * walkF) * 0.01 : 0));
        break;
      case 'claws':
        if (R) poseArm(R, c * 0.2, 0, -c * 0.7, -c * 0.16, 0, -c * 0.05);
        if (L) poseArm(L, c * 0.2, 0, c * 0.7, c * 0.16, 0, -c * 0.05);
        break;
      case 'dragon': {
        const open = swing * 0.5 + (ability ? 0.45 + Math.sin(t * 25) * 0.04 : 0);
        if (rig.jaw) rig.jaw.rotation.x = open;
        if (rig.snout) { rig.snout.position.y = -0.2 + (st.moving ? Math.sin(t * walkF * 0.5) * 0.012 : Math.sin(t * 1.4) * 0.006); rig.snout.rotation.z = st.moving ? Math.sin(t * walkF * 0.5) * 0.03 : 0; }
        if (rig.throat) { const m = rig.throat.material as THREE.MeshStandardMaterial; m.emissiveIntensity = ability ? 1.4 : 0.4 + swing * 0.6; }
        break;
      }
      case 'beast': {
        if (rig.mountHead) { rig.mountHead.position.y = -0.3 + (st.moving ? Math.abs(Math.sin(t * walkF * 0.7)) * 0.03 : Math.sin(t * 1.3) * 0.006); rig.mountHead.rotation.z = st.moving ? Math.sin(t * walkF * 0.7) * 0.04 : 0; }
        rig.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 3 + i * 2.1) * 0.18; });
        if (R) { if (look.weapon === 'lance') poseArm(R, -c * 0.05, 0, 0, 0, c * 0.02, -c * 0.16); else poseArm(R, c * 0.32, -c * 0.28, -c * 0.6, -c * 0.12, c * 0.05, c * 0.06); }
        if (L) poseArm(L, 0, 0, 0, 0, st.moving ? Math.abs(Math.sin(t * walkF * 0.7)) * 0.02 : 0, 0);
        break;
      }
    }
    rig.wisps.forEach((w, i) => { const a = t * 2 + i * 1.3; w.position.set(0.3 + Math.cos(a) * 0.08, -0.3 + Math.sin(a * 1.3) * 0.06, -0.45 + Math.sin(a) * 0.06); });
  };
  animate({ dt: 1, time: 0, moving: false, attackAnim: 0, abilityT: 0, dashing: false });
  return { group, animate, dispose: () => { for (const m of mats) m.dispose(); } };
}
