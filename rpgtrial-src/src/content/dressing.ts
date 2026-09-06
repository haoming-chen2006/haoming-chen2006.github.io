// env-dressing: layout data shared by the sim (colliders/lights in level.ts) and the render layer (props.ts / crypt.ts).
// Pure data + tiny math. NO three.js, NO DOM. Takes LANDMARKS as an argument to avoid an import cycle with level.ts.
import type { AnyCollider, BoxCollider, Collider } from '../sim/types.ts';

export interface Frame { cx: number; cz: number; yaw: number }
/** Point in a frame: `along` is forward (yaw=0 → +Z), `across` is to the right. */
export const frameAt = (f: Frame, along: number, across: number) => {
  const s = Math.sin(f.yaw), c = Math.cos(f.yaw);
  return { x: f.cx + s * along + c * across, z: f.cz + c * along - s * across };
};
export interface Seg { x0: number; z0: number; x1: number; z1: number; h: number; thick: number; tag: string; seed: number; ruin?: number }
export interface LightSpec { kind: 'torch' | 'candle' | 'fire' | 'magic'; x: number; y: number; z: number; color: number; intensity: number; range: number }
export interface Landmarks {
  wreck: { x: number; z: number }; sword: { x: number; z: number }; cache: { x: number; z: number };
  camp: { x: number; z: number }; chest: { x: number; z: number; yaw: number }; boulder: { x: number; z: number };
  chapel: { x: number; z: number }; chapelAltar: { x: number; z: number }; graves: readonly { x: number; z: number }[];
  gate: { x: number; z: number; yaw: number }; crypt: { x: number; z: number }; cryptEntrance: { x: number; z: number }; cryptBoss: { x: number; z: number }; cryptExit: { x: number; z: number };
}

const seg = (f: Frame, a0: number, c0: number, a1: number, c1: number, h: number, thick: number, tag: string, seed: number, ruin = 0.25): Seg => {
  const p = frameAt(f, a0, c0), q = frameAt(f, a1, c1); return { x0: p.x, z0: p.z, x1: q.x, z1: q.z, h, thick, tag, seed, ruin };
};
const segBox = (s: Seg): BoxCollider => {
  const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
  return { kind: 'box', x: (s.x0 + s.x1) / 2, z: (s.z0 + s.z1) / 2, w: Math.hypot(dx, dz), d: s.thick, yaw: Math.atan2(dz, dx), tag: s.tag };
};
const circle = (x: number, z: number, r: number, tag: string): Collider => ({ kind: 'circle', x, z, r, tag });
const box = (x: number, z: number, w: number, d: number, yaw: number, tag: string): BoxCollider => ({ kind: 'box', x, z, w, d, yaw, tag });

// ---------------------------------------------------------------- chapel
/** Nave axis runs SW (path entrance) → NE (collapsed apse / exit toward the gate). */
export function chapelLayout(L: Landmarks) {
  const f: Frame = { cx: L.chapel.x, cz: L.chapel.z, yaw: Math.atan2(0.524, -0.852) };
  const nave: Seg[] = [
    // left wall (across -5)
    seg(f, -8, -5, -3.5, -5, 3.6, 0.7, 'chapelWall', 11), seg(f, -1.5, -5, 3, -5, 2.0, 0.7, 'chapelWall', 12, 0.4), seg(f, 4.5, -5, 10, -5, 4.2, 0.7, 'chapelWall', 13),
    // right wall (across +5)
    seg(f, -8, 5, -4, 5, 2.6, 0.7, 'chapelWall', 14, 0.4), seg(f, -1.5, 5, 4, 5, 4.4, 0.7, 'chapelWall', 15), seg(f, 6, 5, 10, 5, 3.2, 0.7, 'chapelWall', 16),
    // entrance end wall, either side of the arch
    seg(f, -8, -5.2, -8, -1.9, 3.2, 0.7, 'chapelWall', 17), seg(f, -8, 1.9, -8, 5.2, 4.6, 0.7, 'chapelWall', 18),
    // chancel step walls into the apse
    seg(f, 10, -5.2, 10, -3.4, 3.4, 0.7, 'chapelWall', 19), seg(f, 10, 3.4, 10, 5.2, 3.0, 0.7, 'chapelWall', 20),
  ];
  // apse: arc R=3.6 centred at along 10.5, open at the apex (the path exits through the collapse)
  const R = 3.6, C = 10.5; const apse: Seg[] = [];
  const arc = (phi0: number, phi1: number, n: number, seed: number) => {
    for (let i = 0; i < n; i++) { const p0 = phi0 + ((phi1 - phi0) * i) / n, p1 = phi0 + ((phi1 - phi0) * (i + 1)) / n;
      apse.push(seg(f, C + R * Math.sin(p0), R * Math.cos(p0), C + R * Math.sin(p1), R * Math.cos(p1), 3.0 - i * 0.35, 0.7, 'chapelWall', seed + i, 0.35)); }
  };
  arc(0, (55 * Math.PI) / 180, 3, 30); arc(Math.PI, (125 * Math.PI) / 180, 3, 40);
  // churchyard wall: low ruined ring r=14.5, open at the SW entrance and the NE exit
  const yard: Seg[] = []; const n = 20, YR = 14.5;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; const am = (a0 + a1) / 2;
    const along = Math.cos(am) * YR, across = Math.sin(am) * YR;
    if (Math.abs(across) < 3.2 && Math.abs(along) > 10) continue; // gaps on the axis
    yard.push(seg(f, Math.cos(a0) * YR, Math.sin(a0) * YR, Math.cos(a1) * YR, Math.sin(a1) * YR, 1.0 + 0.35 * Math.sin(i * 2.1), 0.5, 'yardWall', 60 + i, 0.5));
  }
  const arch = frameAt(f, -8, 0);
  const altar = { x: L.chapelAltar.x, z: L.chapelAltar.z, yaw: f.yaw };
  const statue = frameAt(f, 12.6, 0);
  const braziers = [frameAt(f, 8.2, -3.2), frameAt(f, 8.2, 3.2)];
  const torches = [frameAt(f, -8.55, -1.75), frameAt(f, -8.55, 1.75)];
  // extra decorative gravestones in the side yards (deterministic)
  const extraGraves = [[-6.5, 8.5, 'round'], [-3, 10.5, 'cross'], [2.5, 9.5, 'round'], [6, 8, 'slab'], [-4.5, -9.5, 'round'], [1, -10.5, 'cross'], [5.5, -9, 'round'], [-1.5, -12, 'slab'], [7.5, -6.8, 'round']].map(([a, c, kind], i) => ({ ...frameAt(f, a as number, c as number), yaw: f.yaw + (i % 3 - 1) * 0.3 + ((i % 2) ? Math.PI : 0), kind: kind as 'round' | 'cross' | 'slab' }));
  const graves = L.graves.map((g, i) => ({ x: g.x, z: g.z, yaw: f.yaw + (i - 1) * 0.35 }));
  return { frame: f, nave, apse, yard, arch, altar, statue, braziers, torches, graves, extraGraves };
}

// ---------------------------------------------------------------- crypt gate
export function gateLayout(L: Landmarks) {
  const f: Frame = { cx: L.gate.x, cz: L.gate.z, yaw: L.gate.yaw }; // yaw faces the approaching path (SW); behind = -along
  const facade: Seg[] = [
    seg(f, 0, -7, 0, -1.9, 5.2, 1.4, 'gateWall', 70, 0.15), seg(f, 0, 1.9, 0, 7, 5.2, 1.4, 'gateWall', 71, 0.15),
  ];
  const tunnel: Seg[] = [seg(f, -0.5, -1.9, -7, -1.9, 4.5, 0.8, 'gateWall', 72, 0), seg(f, -0.5, 1.9, -7, 1.9, 4.5, 0.8, 'gateWall', 73, 0)];
  const hill = frameAt(f, -8, 0);
  const torches = [frameAt(f, 0.75, -2.8), frameAt(f, 0.75, 2.8)];
  const rocks = [
    { ...frameAt(f, -3, -8.5), s: 2.2, yaw: 0.4, model: 'rock_face_01' }, { ...frameAt(f, -3.5, 8.2), s: 2.4, yaw: 2.4, model: 'rock_face_02' },
    { ...frameAt(f, -9, -6), s: 1.8, yaw: 1.2, model: 'namaqualand_boulder_04' }, { ...frameAt(f, -10, 5.5), s: 1.6, yaw: 2.9, model: 'namaqualand_boulder_02' },
    { ...frameAt(f, 1.5, -8.2), s: 1.3, yaw: 1.9, model: 'namaqualand_boulder_02' }, { ...frameAt(f, 2, 8.6), s: 1.2, yaw: 0.2, model: 'rock_moss_set_02' },
  ];
  return { frame: f, facade, tunnel, hill, torches, rocks, gate: { x: L.gate.x, z: L.gate.z, yaw: L.gate.yaw, width: 3.6 } };
}

// ---------------------------------------------------------------- camp / shore / boulder
export function campLayout(L: Landmarks) {
  const c = L.camp;
  return {
    fire: { x: c.x, z: c.z },
    chest: { x: L.chest.x, z: L.chest.z, yaw: L.chest.yaw },
    bench: { x: c.x + 0.3, z: c.z + 2.7, yaw: 0.12 },
    tent: { x: c.x - 4.2, z: c.z + 4.6, yaw: Math.atan2(c.x - (c.x - 4.2), c.z - (c.z + 4.6)) },
    bedroll: { x: c.x - 3.6, z: c.z + 3.9, yaw: 0.45 },
    lanternPost: { x: c.x + 3.4, z: c.z + 2.6 },
    crates: { x: c.x - 3.6, z: c.z - 2.2, yaw: 0.5 },
    barrels: { x: c.x - 2.4, z: c.z - 3.1, yaw: 1.1 },
    stumpAxe: { x: c.x + 3.9, z: c.z - 1.5, yaw: 0.8 },
    stumpSeat: { x: c.x - 2.3, z: c.z - 0.2, yaw: 2.0 },
    bucket: { x: c.x + 1.9, z: c.z + 1.5 },
  };
}
export function shoreLayout(L: Landmarks) {
  return {
    wreck: { x: L.wreck.x, z: L.wreck.z - 2.2, yaw: Math.atan2(0.8, -0.6), scale: 0.5, roll: 0.42, pitch: 0.06 },
    sword: { x: L.sword.x, z: L.sword.z },
    cache: [{ x: L.cache.x, z: L.cache.z, model: 'rock_moss_set_01', s: 1.15, yaw: 0.6 }, { x: L.cache.x - 2.4, z: L.cache.z - 1.4, model: 'rock_moss_set_02', s: 1.0, yaw: 2.2 }, { x: L.cache.x - 1.2, z: L.cache.z + 2.3, model: 'boulder_01', s: 1.1, yaw: 1.4 }],
    jetty: { x: -5.5, z: 16.8, yaw: 0.08 },
    driftwood: { x: -2.2, z: 15.2, yaw: 1.2 },
    barrels: { x: 9.2, z: 21.2, yaw: 0.7 },
    barrelWater: { x: 1.6, z: 14.6, yaw: 0.9 },
    crate: { x: 8.4, z: 23.0, yaw: -0.4 },
    lanternGround: { x: 7.4, z: 20.2 },
    lanternLit: { x: 7.9, z: 17.9 },
  };
}
export function boulderLayout(L: Landmarks) {
  // roll away from the path toward the lake (perpendicular to the (40,22)→(50,10) segment)
  const n = { x: -0.768, z: -0.64 };
  return { start: { x: L.boulder.x, z: L.boulder.z }, end: { x: L.boulder.x + n.x * 4.6, z: L.boulder.z + n.z * 4.6 }, r: 1.3, uphillRock: { x: L.boulder.x + 3.4 * 0.768, z: L.boulder.z + 3.4 * 0.64 } };
}

// ---------------------------------------------------------------- crypt interior
export interface Room { x0: number; z0: number; x1: number; z1: number; h: number; name: string }
/** Rooms are axis-aligned boxes at y=0 (terrain is flat there). Door openings are listed separately so wall builders skip them. */
export function cryptLayout(L: Landmarks) {
  const ex = L.cryptEntrance.x, ez = L.cryptEntrance.z; const bx = L.cryptBoss.x, bz = L.cryptBoss.z;
  const hall: Room = { x0: ex - 6, z0: ez - 6, x1: ex + 6, z1: ez + 4, h: 4, name: 'hall' };            // z -486 .. -476
  const corr1: Room = { x0: ex - 2, z0: ez - 18, x1: ex + 2, z1: ez - 6, h: 4, name: 'corr1' };         // z -498 .. -486
  const ante: Room = { x0: ex - 7, z0: ez - 30, x1: ex + 7, z1: ez - 18, h: 4, name: 'ante' };          // z -510 .. -498
  const corr2: Room = { x0: ex - 2, z0: bz + 11, x1: ex + 2, z1: ez - 30, h: 4, name: 'corr2' };        // z -529 .. -510
  const boss: Room = { x0: bx - 11, z0: bz - 11, x1: bx + 11, z1: bz + 11, h: 8, name: 'boss' };        // z -551 .. -529
  const rooms = [hall, corr1, ante, corr2, boss];
  const exitDoor = { x: L.cryptExit.x, z: hall.z1, yaw: 0 };          // in the +z wall of the hall
  const dais = { x: bx, z: bz - 7.5, w: 7.5, d: 4.8, h: 0.5 };
  const sarcophagus = { x: bx, z: bz - 7.0, yaw: 0 };
  const statue = { x: bx, z: bz - 9.7, yaw: 0 };
  const shafts = [{ x: bx - 5.5, z: bz + 2.5 }, { x: bx + 6.5, z: bz - 1.5 }, { x: ex + 3.5, z: ez - 22 }];
  const coffins = [
    { x: boss.x0 + 1.3, z: bz - 5, yaw: Math.PI / 2 }, { x: boss.x0 + 1.3, z: bz + 3, yaw: Math.PI / 2 },
    { x: boss.x1 - 1.3, z: bz - 5, yaw: -Math.PI / 2 }, { x: boss.x1 - 1.3, z: bz + 3, yaw: -Math.PI / 2 },
    { x: ante.x0 + 1.2, z: ez - 24, yaw: Math.PI / 2 }, { x: ante.x1 - 1.2, z: ez - 24, yaw: -Math.PI / 2 },
  ];
  const pillars = [
    { x: bx - 6, z: bz - 6 }, { x: bx + 6, z: bz - 6 }, { x: bx - 6, z: bz + 6 }, { x: bx + 6, z: bz + 6 },
    { x: ante.x0 + 3, z: ez - 21 }, { x: ante.x1 - 3, z: ez - 21 }, { x: ante.x0 + 3, z: ez - 27 }, { x: ante.x1 - 3, z: ez - 27 },
  ];
  const colliders: AnyCollider[] = [];
  const wallT = 1.0;
  // room walls with openings where corridors join (openings are 4 m wide, centred on x=ex)
  const addWalls = (r: Room, openN: boolean, openS: boolean) => {
    // "N" = z1 side (toward the entrance / +z), "S" = z0 side (toward the boss / -z)
    const w = r.x1 - r.x0;
    if (openN) { colliders.push(box((r.x0 + ex - 2) / 2, r.z1 + wallT / 2, ex - 2 - r.x0, wallT, 0, 'cryptWall'), box((r.x1 + ex + 2) / 2, r.z1 + wallT / 2, r.x1 - ex - 2, wallT, 0, 'cryptWall')); }
    else colliders.push(box((r.x0 + r.x1) / 2, r.z1 + wallT / 2, w, wallT, 0, 'cryptWall'));
    if (openS) { colliders.push(box((r.x0 + ex - 2) / 2, r.z0 - wallT / 2, ex - 2 - r.x0, wallT, 0, 'cryptWall'), box((r.x1 + ex + 2) / 2, r.z0 - wallT / 2, r.x1 - ex - 2, wallT, 0, 'cryptWall')); }
    else colliders.push(box((r.x0 + r.x1) / 2, r.z0 - wallT / 2, w, wallT, 0, 'cryptWall'));
    colliders.push(box(r.x0 - wallT / 2, (r.z0 + r.z1) / 2, wallT, r.z1 - r.z0, 0, 'cryptWall'), box(r.x1 + wallT / 2, (r.z0 + r.z1) / 2, wallT, r.z1 - r.z0, 0, 'cryptWall'));
  };
  addWalls(hall, false, true); addWalls(ante, true, true); addWalls(boss, true, false);
  // corridors: only side walls (ends open into rooms)
  for (const c of [corr1, corr2]) colliders.push(box(c.x0 - wallT / 2, (c.z0 + c.z1) / 2, wallT, c.z1 - c.z0, 0, 'cryptWall'), box(c.x1 + wallT / 2, (c.z0 + c.z1) / 2, wallT, c.z1 - c.z0, 0, 'cryptWall'));
  colliders.push(box(exitDoor.x, exitDoor.z + 0.2, 4, 0.6, 0, 'cryptDoor'));
  for (const p of pillars) colliders.push(circle(p.x, p.z, 0.85, 'cryptPillar'));
  colliders.push(box(dais.x, dais.z, dais.w, dais.d, 0, 'dais'));
  for (const c of coffins) colliders.push(box(c.x, c.z, 0.9, 2.1, c.yaw, 'coffin'));
  const lights: LightSpec[] = [];
  const cand = (x: number, y: number, z: number, i = 4, r = 7) => lights.push({ kind: 'candle', x, y, z, color: 0xffb257, intensity: i, range: r });
  const torch = (x: number, y: number, z: number, i = 18, r = 12) => lights.push({ kind: 'torch', x, y, z, color: 0xff8f3a, intensity: i, range: r });
  const magic = (x: number, y: number, z: number, i = 22, r = 14) => lights.push({ kind: 'magic', x, y, z, color: 0x3fd8c8, intensity: i, range: r });
  // hall: torches by the exit door, candles on shelves
  torch(ex - 2.6, 2.4, hall.z1 - 0.55); torch(ex + 2.6, 2.4, hall.z1 - 0.55); cand(hall.x0 + 0.9, 1.15, ez - 2, 3, 6); cand(hall.x1 - 0.9, 1.15, ez - 3.5, 3, 6);
  // corridor 1: one torch
  torch(corr1.x1 - 0.5, 2.5, ez - 12, 14, 10);
  // antechamber: candle clusters + a magic brazier in the middle
  cand(ante.x0 + 1.2, 1.0, ez - 21.5, 5, 8); cand(ante.x1 - 1.2, 1.0, ez - 26.5, 5, 8); magic(ex, 1.3, ez - 24, 14, 12);
  torch(ante.x0 + 0.5, 2.5, ez - 24, 14, 10); torch(ante.x1 - 0.5, 2.5, ez - 24, 14, 10);
  // corridor 2
  torch(corr2.x0 + 0.5, 2.5, ez - 40, 14, 10);
  // boss chamber: two magic braziers flanking the dais, torches on the pillars, candles by the coffins, chandelier
  magic(bx - 4.2, 1.3, bz - 7.2, 28, 16); magic(bx + 4.2, 1.3, bz - 7.2, 28, 16);
  torch(bx - 6.9, 2.9, bz - 6, 16, 11); torch(bx + 6.9, 2.9, bz - 6, 16, 11); torch(bx - 6.9, 2.9, bz + 6, 16, 11); torch(bx + 6.9, 2.9, bz + 6, 16, 11);
  cand(boss.x0 + 1.4, 0.9, bz - 1.2, 6, 8); cand(boss.x1 - 1.4, 0.9, bz - 1.2, 6, 8); cand(bx, 3.2, bz - 8.6, 8, 10);
  lights.push({ kind: 'candle', x: bx, y: 5.4, z: bz, color: 0xffc078, intensity: 26, range: 18 });
  lights.push({ kind: 'magic', x: bx, y: 0.35, z: bz, color: 0x2fc8b8, intensity: 5, range: 7 });
  for (const s of shafts) lights.push({ kind: 'magic', x: s.x, y: 3.0, z: s.z, color: 0x9ec4ff, intensity: 5, range: 9 });
  return { hall, corr1, ante, corr2, boss, rooms, exitDoor, dais, sarcophagus, statue, shafts, coffins, pillars, colliders, lights, ex, ez, bx, bz };
}

// ---------------------------------------------------------------- aggregate
export function dressingColliders(L: Landmarks): AnyCollider[] {
  const out: AnyCollider[] = [];
  const ch = chapelLayout(L); for (const s of [...ch.nave, ...ch.apse, ...ch.yard]) out.push(segBox(s));
  out.push(box(ch.altar.x, ch.altar.z, 2.1, 1.0, ch.altar.yaw, 'altar'), circle(ch.statue.x, ch.statue.z, 1.0, 'statue'));
  for (const b of ch.braziers) out.push(circle(b.x, b.z, 0.5, 'brazier'));
  for (const g of ch.graves) { const s = frameAt({ cx: g.x, cz: g.z, yaw: g.yaw }, -1.15, 0); out.push(circle(s.x, s.z, 0.4, 'gravestone')); }
  for (const g of ch.extraGraves) if (g.kind !== 'slab') out.push(circle(g.x, g.z, 0.35, 'gravestone'));
  const gt = gateLayout(L); for (const s of [...gt.facade, ...gt.tunnel]) out.push(segBox(s));
  out.push(box(gt.gate.x, gt.gate.z, gt.gate.width, 0.5, gt.frame.yaw + Math.PI / 2, 'gate'));
  out.push(circle(gt.hill.x, gt.hill.z, 7.0, 'hill'));
  for (const r of gt.rocks) out.push(circle(r.x, r.z, r.s * 0.9, 'rock'));
  for (const t of gt.torches) out.push(circle(t.x, t.z, 0.25, 'torch'));
  const cp = campLayout(L);
  out.push(circle(cp.fire.x, cp.fire.z, 1.0, 'campfire'), circle(cp.chest.x, cp.chest.z, 0.7, 'chest'), box(cp.bench.x, cp.bench.z, 3.0, 0.6, cp.bench.yaw, 'bench'),
    box(cp.tent.x, cp.tent.z, 2.8, 2.6, cp.tent.yaw, 'tent'), circle(cp.lanternPost.x, cp.lanternPost.z, 0.22, 'post'), circle(cp.crates.x, cp.crates.z, 0.7, 'crate'),
    circle(cp.barrels.x, cp.barrels.z, 0.65, 'barrel'), circle(cp.stumpAxe.x, cp.stumpAxe.z, 0.75, 'stump'), circle(cp.stumpSeat.x, cp.stumpSeat.z, 0.75, 'stump'));
  const sh = shoreLayout(L);
  out.push(box(sh.wreck.x, sh.wreck.z, 11.5, 3.4, Math.atan2(-0.8, -0.6), 'wreck'));
  for (const c of sh.cache) out.push(circle(c.x, c.z, c.s * 1.3, 'rock'));
  out.push(box(sh.jetty.x, sh.jetty.z - 5.6, 2.6, 12.6, Math.PI / 2 + sh.jetty.yaw, 'jetty'), circle(sh.barrels.x, sh.barrels.z, 0.6, 'barrel'), circle(sh.crate.x, sh.crate.z, 0.55, 'crate'), box(sh.driftwood.x, sh.driftwood.z, 3.0, 0.5, sh.driftwood.yaw, 'driftwood'));
  const bl = boulderLayout(L); out.push(circle(bl.start.x, bl.start.z, bl.r, 'boulder'), circle(bl.uphillRock.x, bl.uphillRock.z, 1.5, 'rock'));
  out.push(...cryptLayout(L).colliders);
  return out;
}
export function dressingLights(L: Landmarks): LightSpec[] {
  const out: LightSpec[] = [];
  const cp = campLayout(L); const ch = chapelLayout(L); const gt = gateLayout(L); const sh = shoreLayout(L);
  out.push({ kind: 'fire', x: cp.fire.x, y: 0.7, z: cp.fire.z, color: 0xff8a3c, intensity: 60, range: 20 });
  out.push({ kind: 'candle', x: cp.lanternPost.x, y: 1.6, z: cp.lanternPost.z, color: 0xffc070, intensity: 7, range: 9 });
  out.push({ kind: 'candle', x: sh.lanternLit.x, y: 0.55, z: sh.lanternLit.z, color: 0xffb060, intensity: 5, range: 8 });
  for (const b of ch.braziers) out.push({ kind: 'fire', x: b.x, y: 1.15, z: b.z, color: 0xff8a3c, intensity: 30, range: 16 });
  for (const t of ch.torches) out.push({ kind: 'torch', x: t.x, y: 2.55, z: t.z, color: 0xff9040, intensity: 16, range: 12 });
  out.push({ kind: 'candle', x: ch.altar.x, y: 1.45, z: ch.altar.z, color: 0xffc070, intensity: 6, range: 8 });
  for (const t of gt.torches) out.push({ kind: 'torch', x: t.x, y: 2.75, z: t.z, color: 0xff9040, intensity: 18, range: 13 });
  out.push(...cryptLayout(L).lights);
  return out;
}
