// env-dressing: every hand-placed outdoor thing — shore wreck & jetty, camp, boulder, ruined chapel + graveyard, crypt gate.
// Positions come from content/dressing.ts (shared with the sim colliders). Lights go through the pooled LightPool.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANDMARKS } from '../content/level.ts';
import { chapelLayout, gateLayout, campLayout, shoreLayout, boulderLayout, frameAt, type Seg } from '../content/dressing.ts';
import { fbm } from '../sim/terrain.ts';
import {
  Rand, groundY, lerp, pbrMaterial, MAT, FlameSet, LightPool, spawn, applyPlace, propPath, dungeonPath, loadTemplate,
  blockWallGeometry, gothicArchGeometry, boxProjectUV, transformGeo, floorPatchGeometry, floorPatchMaterial,
  brazier, wallTorch, bonePile, gravestone, mound, rope, chain, glint, glintUpdate, mergeKayKit, type LightSource,
} from './structures.ts';

interface Tween { t: number; dur: number; fn: (k: number) => void; done?: () => void }
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k: number) => k * k * (3 - 2 * k);

export class PropsView {
  group = new THREE.Group();
  colliderMeshes: THREE.Object3D[] = [];
  pool: LightPool; flames = new FlameSet();
  private tweens: Tween[] = []; private time = 0;
  private chestLid: THREE.Object3D | null = null; private boulder: THREE.Object3D | null = null;
  private gateLeaves: THREE.Object3D[] = []; private lanternSwing: THREE.Object3D[] = [];
  private fireLight: LightSource | null = null; private swordGlint: THREE.Sprite | null = null;
  chestOpen = false; boulderPushed = false; gateOpen = false;
  private stone!: THREE.MeshStandardMaterial; private blocks!: THREE.MeshStandardMaterial; private cobble!: THREE.MeshStandardMaterial; private planks!: THREE.MeshStandardMaterial; private brick!: THREE.MeshStandardMaterial;

  constructor(public scene: THREE.Scene) { this.group.name = 'props'; scene.add(this.group); this.pool = LightPool.get(scene); }

  async load() {
    [this.stone, this.blocks, this.cobble, this.planks, this.brick] = await Promise.all([
      pbrMaterial('mossy_rock', { roughness: 1, normalScale: 1.1 }), pbrMaterial('medieval_blocks_06', { roughness: 1 }),
      pbrMaterial('cobblestone_floor_08', { roughness: 1 }), pbrMaterial('old_planks_02', { roughness: 0.95 }), pbrMaterial('castle_brick_07', { roughness: 1 }),
    ]);
    await Promise.all([this.buildShore(), this.buildCamp(), this.buildBoulder(), this.buildChapel(), this.buildGate()]);
    mergeKayKit(this.group);
  }

  // ------------------------------------------------------------------ helpers
  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material, collide = false) {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; this.group.add(m); if (collide) this.colliderMeshes.push(m); return m;
  }
  private wallProfile(s: Seg) { const r = new Rand(s.seed); const ruin = s.ruin ?? 0.25; const p = r.range(0, 6), q = r.range(0, 6); return (t: number) => Math.max(0.5, s.h * (1 - ruin * (0.5 + 0.5 * Math.sin(t * 6.2 + p))) + 0.25 * Math.sin(t * 17 + q)); }
  private wallsMesh(segs: Seg[], mat: THREE.Material, blockLen = 0.95, blockH = 0.42) {
    const geos = segs.map((s) => blockWallGeometry({ x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z1, height: this.wallProfile(s), thick: s.thick, seed: s.seed, blockLen, blockH, missing: (s.ruin ?? 0.25) * 0.8 }));
    const merged = mergeGeometries(geos, false)!; for (const g of geos) g.dispose();
    return this.mesh(merged, mat, true);
  }
  /** Scattered fallen blocks (rubble) around a point. */
  private rubbleGeometry(x: number, z: number, n: number, seed: number, spread = 2.2) {
    const r = new Rand(seed); const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const bx = r.range(0.35, 0.9), by = r.range(0.25, 0.42), bz = r.range(0.4, 0.75); const g = new THREE.BoxGeometry(bx, by, bz);
      const px = x + r.range(-spread, spread), pz = z + r.range(-spread, spread);
      transformGeo(g, px, groundY(px, pz) + by * 0.3, pz, r.range(0, Math.PI), r.range(-0.4, 0.4), r.range(-0.5, 0.5)); boxProjectUV(g, 2.2, r.range(0, 1)); parts.push(g);
    }
    const m = mergeGeometries(parts, false)!; for (const p of parts) p.dispose(); return m;
  }
  private light(pos: THREE.Vector3, o: Partial<LightSource>) { return this.pool.add({ pos, ...o }); }
  private tween(dur: number, fn: (k: number) => void, done?: () => void) { this.tweens.push({ t: 0, dur, fn, done }); }
  private pillar(x: number, z: number, h: number, r: number, mat: THREE.Material) { const g = new THREE.CylinderGeometry(r, r * 1.15, h, 8); boxProjectUV(g, 1.5); g.translate(0, h / 2, 0); const m = this.mesh(g, mat); m.position.set(x, groundY(x, z) - 0.2, z); return m; }

  // ------------------------------------------------------------------ shore
  private async buildShore() {
    const S = shoreLayout(LANDMARKS);
    // wrecked ship: hull + rigging, no sails, heeled over and sunk into the sand
    const ship = await spawn(this.group, propPath('dutch_ship_medium'), { x: S.wreck.x, z: S.wreck.z, y: 0.45, yaw: S.wreck.yaw, roll: S.wreck.roll, pitch: S.wreck.pitch, scale: S.wreck.scale });
    ship.getObjectByName('dutch_ship_medium_sails')!.visible = false;
    this.colliderMeshes.push(ship);
    // the longsword, point-down in the sand, catching the sky
    const sword = await spawn(this.group, propPath('antique_estoc'), { x: S.sword.x, z: S.sword.z, y: 0.86, yaw: 0.6, pitch: Math.PI - 0.32, roll: 0.12 });
    sword.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mat = (m.material as THREE.MeshStandardMaterial).clone(); mat.envMapIntensity = 1.6; mat.metalness = Math.max(mat.metalness, 0.6); m.material = mat; } });
    sword.name = 'sword';
    this.swordGlint = glint(0.55); this.swordGlint.position.set(S.sword.x + 0.05, groundY(S.sword.x, S.sword.z) + 1.0, S.sword.z + 0.02); this.group.add(this.swordGlint);
    // splintered planks and a broken spar around the stern
    const r = new Rand(21); const parts: THREE.BufferGeometry[] = []; const wf = { cx: S.wreck.x, cz: S.wreck.z, yaw: S.wreck.yaw - Math.PI / 2 };
    for (let i = 0; i < 14; i++) {
      const p = frameAt(wf, r.range(-9, -3), r.range(-4.5, 4.5)); const L = r.range(0.9, 2.2), W = r.range(0.18, 0.3);
      const g = new THREE.BoxGeometry(L, 0.05, W); transformGeo(g, p.x, groundY(p.x, p.z) + r.range(-0.02, 0.05), p.z, r.range(0, Math.PI), r.range(-0.15, 0.15), r.range(-0.4, 0.4)); boxProjectUV(g, 1.5, r.range(0, 1)); parts.push(g);
    }
    this.mesh(mergeGeometries(parts, false)!, this.planks);
    const spar = new THREE.CylinderGeometry(0.11, 0.16, 3.6, 9); spar.rotateZ(Math.PI / 2); boxProjectUV(spar, 1.2);
    const sparM = this.mesh(spar, this.planks); applyPlace(sparM, { x: 8.6, z: 19.6, y: 0.1, yaw: 0.9, roll: 0.03 });
    // cargo: barrels, a crate, lanterns
    await spawn(this.group, propPath('wooden_barrels_01'), { x: S.barrels.x, z: S.barrels.z, yaw: S.barrels.yaw, sink: 0.08, roll: 0.06 });
    await spawn(this.group, propPath('wine_barrel_01'), { x: S.barrelWater.x, z: S.barrelWater.z, y: 0.36, yaw: S.barrelWater.yaw, roll: Math.PI / 2 - 0.15, sink: 0.05 });
    await spawn(this.group, propPath('wooden_crate_02'), { x: S.crate.x, z: S.crate.z, yaw: S.crate.yaw, roll: 0.22, sink: 0.06 });
    await spawn(this.group, propPath('wooden_lantern_01'), { x: S.lanternGround.x, z: S.lanternGround.z, y: 0.1, yaw: 1.1, roll: Math.PI / 2 - 0.2 });
    const lit = await spawn(this.group, propPath('wooden_lantern_01'), { x: S.lanternLit.x, z: S.lanternLit.z, yaw: -0.4, roll: 0.08 });
    this.flames.add(lit, new THREE.Vector3(0, 0.14, 0), 0.12, new THREE.Color(2.2, 1.3, 0.5), 1.6);
    this.light(new THREE.Vector3(S.lanternLit.x, groundY(S.lanternLit.x, S.lanternLit.z) + 0.4, S.lanternLit.z), { color: new THREE.Color(0xffb060), intensity: 5, range: 8, flicker: 0.12 });
    // hidden cache: a mossy outcrop
    for (const c of S.cache) { const o = await spawn(this.group, propPath(c.model), { x: c.x, z: c.z, yaw: c.yaw, scale: c.s, sink: 0.15 }); this.colliderMeshes.push(o); }
    // jetty into the lake + extra piles down to the lake bed
    const jetty = await spawn(this.group, propPath('modular_wooden_pier'), { x: S.jetty.x, z: S.jetty.z, y: -2.3, yaw: S.jetty.yaw });
    jetty.getObjectByName('modular_wooden_pier_section_05')!.visible = false;
    this.colliderMeshes.push(jetty);
    const jf = { cx: S.jetty.x, cz: S.jetty.z, yaw: S.jetty.yaw + Math.PI }; // model runs along -z
    for (const [a, c] of [[3.5, -1.05], [3.5, 1.05], [7.5, -1.05], [7.5, 1.05], [11.5, -1.05], [11.5, 1.05]] as const) {
      const p = frameAt(jf, a, c); const bed = groundY(p.x, p.z); const top = 1.3; const g = new THREE.CylinderGeometry(0.11, 0.13, top - bed + 0.6, 8); boxProjectUV(g, 1); g.translate(0, (top + bed - 0.6) / 2, 0);
      const m = this.mesh(g, this.planks); m.position.set(p.x, 0, p.z);
    }
    // a lit lantern at the end of the jetty
    const jl = frameAt(jf, 11.2, 0.9);
    const jlan = await spawn(this.group, propPath('Lantern_01'), { x: jl.x, z: jl.z, y: 1.34, yaw: 0.3, onGround: false, scale: 1.3 });
    this.flames.add(jlan, new THREE.Vector3(0, 0.08, 0), 0.08, new THREE.Color(2.2, 1.3, 0.5), 1.6);
    this.light(new THREE.Vector3(jl.x, 1.55, jl.z), { color: new THREE.Color(0xffb060), intensity: 4, range: 8, flicker: 0.12 });
    // driftwood + pebbles along the waterline
    await spawn(this.group, propPath('dead_tree_trunk'), { x: S.driftwood.x, z: S.driftwood.z, yaw: S.driftwood.yaw, sink: 0.08, roll: 0.05 });
    const pr = new Rand(5);
    for (let i = 0; i < 14; i++) { const x = pr.range(-14, 14), z = 13.2 + pr.range(-0.8, 2.5); if (groundY(x, z) < 0.1) continue; await spawn(this.group, propPath(pr.next() < 0.4 ? 'rock_07' : 'rock_09'), { x, z, yaw: pr.range(0, 6), scale: pr.range(3, 7), sink: 0.03 }); }
  }

  // ------------------------------------------------------------------ camp
  private async buildCamp() {
    const C = campLayout(LANDMARKS); const fx = C.fire.x, fz = C.fire.z, fy = groundY(fx, fz);
    // fire pit
    await spawn(this.group, propPath('stone_fire_pit'), { x: fx, z: fz, sink: 0.14, yaw: 0.4 });
    const logs = new THREE.Group(); logs.position.set(fx, fy + 0.02, fz); this.group.add(logs);
    const rr = new Rand(3);
    for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.85, 7), i < 3 ? MAT.charcoal() : MAT.darkWood()); l.rotation.z = Math.PI / 2 - 0.35; l.rotation.y = (i / 5) * Math.PI * 2 + rr.range(-0.2, 0.2); l.position.y = 0.12 + i * 0.03; l.castShadow = true; logs.add(l); }
    const embers = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.ember()); embers.scale.y = 0.3; embers.position.y = 0.06; logs.add(embers);
    this.flames.add(logs, new THREE.Vector3(0, 0.18, 0), 0.62, new THREE.Color(2.8, 1.5, 0.55), 1.9);
    this.flames.add(logs, new THREE.Vector3(0.16, 0.14, -0.1), 0.42, new THREE.Color(2.6, 1.2, 0.4), 2.1);
    this.flames.add(logs, new THREE.Vector3(-0.14, 0.12, 0.12), 0.36, new THREE.Color(2.8, 1.6, 0.6), 1.7);
    this.fireLight = this.light(new THREE.Vector3(fx, fy + 0.75, fz), { color: new THREE.Color(0xff8a3c), intensity: 60, range: 20, flicker: 0.32, shadow: true });
    // cooking tripod + hanging pot
    const iron = MAT.rustIron();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; const bx = fx + Math.cos(a) * 0.85, bz = fz + Math.sin(a) * 0.85; const by = groundY(bx, bz);
      const top = new THREE.Vector3(fx, fy + 1.7, fz), bot = new THREE.Vector3(bx, by, bz); const len = top.distanceTo(bot);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, len, 6), MAT.darkWood()); s.position.copy(bot).lerp(top, 0.5); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize()); s.castShadow = true; this.group.add(s); }
    const ch = chain(0.55, 0.09, iron); ch.position.set(fx, fy + 1.66, fz); this.group.add(ch);
    await spawn(this.group, propPath('brass_pot_01'), { x: fx, z: fz, y: 0.82, yaw: 0.3 });
    // log bench, stumps (one with a hatchet), tent, bedroll
    await spawn(this.group, propPath('dead_tree_trunk'), { x: C.bench.x, z: C.bench.z, yaw: C.bench.yaw, y: 0.03, sink: 0.04 });
    await spawn(this.group, propPath('tree_stump_02'), { x: C.stumpSeat.x, z: C.stumpSeat.z, yaw: C.stumpSeat.yaw, sink: 0.05 });
    await spawn(this.group, propPath('tree_stump_01'), { x: C.stumpAxe.x, z: C.stumpAxe.z, yaw: C.stumpAxe.yaw, sink: 0.05 });
    await spawn(this.group, propPath('wooden_axe_02'), { x: C.stumpAxe.x + 0.1, z: C.stumpAxe.z - 0.05, y: 0.62, yaw: 1.2, pitch: -0.55, roll: 0.1 });
    this.buildTent(C.tent.x, C.tent.z, C.tent.yaw);
    this.buildBedroll(C.bedroll.x, C.bedroll.z, C.bedroll.yaw);
    // lantern post
    const px = C.lanternPost.x, pz = C.lanternPost.z, py = groundY(px, pz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.1, 8), MAT.darkWood()); post.position.set(px, py + 1.0, pz); post.castShadow = true; this.group.add(post);
    const toFire = Math.atan2(fx - px, fz - pz);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), MAT.darkWood()); arm.position.set(px + Math.sin(toFire) * 0.25, py + 2.02, pz + Math.cos(toFire) * 0.25); arm.rotation.y = toFire; arm.castShadow = true; this.group.add(arm);
    const hook = new THREE.Vector3(px + Math.sin(toFire) * 0.48, py + 1.99, pz + Math.cos(toFire) * 0.48);
    const swing = new THREE.Group(); swing.position.copy(hook); this.group.add(swing); this.lanternSwing.push(swing);
    const lan = await spawn(swing, propPath('Lantern_01'), { x: 0, z: 0, y: -0.36, onGround: false, yaw: toFire, scale: 1.25 });
    this.flames.add(lan, new THREE.Vector3(0, 0.07, 0), 0.09, new THREE.Color(2.2, 1.3, 0.5), 1.6);
    const hookM = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 10), iron); hookM.position.set(0, -0.02, 0); swing.add(hookM);
    this.light(new THREE.Vector3(hook.x, hook.y - 0.22, hook.z), { color: new THREE.Color(0xffc070), intensity: 7, range: 9, flicker: 0.1 });
    // supplies
    const c1 = await spawn(this.group, propPath('wooden_crate_01'), { x: C.crates.x, z: C.crates.z, yaw: C.crates.yaw, sink: 0.02 });
    await spawn(this.group, propPath('wooden_crate_01'), { x: C.crates.x + 0.08, z: C.crates.z - 0.05, y: 0.34, yaw: C.crates.yaw + 0.35 });
    await spawn(this.group, propPath('jug_01'), { x: C.crates.x + 0.15, z: C.crates.z + 0.05, y: 0.69, yaw: 1.0 });
    await spawn(this.group, propPath('wooden_crate_02'), { x: C.crates.x + 1.1, z: C.crates.z + 0.5, yaw: C.crates.yaw + 1.4, sink: 0.02 });
    await spawn(this.group, propPath('wooden_barrels_01'), { x: C.barrels.x, z: C.barrels.z, yaw: C.barrels.yaw, sink: 0.03 });
    await spawn(this.group, propPath('wooden_bucket_01'), { x: C.bucket.x, z: C.bucket.z, yaw: 0.7, sink: 0.01 });
    await spawn(this.group, propPath('wooden_bowl_01'), { x: fx + 1.35, z: fz + 0.9, yaw: 0.2 });
    await spawn(this.group, propPath('ceramic_pot'), { x: C.tent.x + 1.6, z: C.tent.z - 0.6, yaw: 2.2 });
    void c1;
    // stones ringing the pit + a few around the clearing
    const sr = new Rand(9);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.2; await spawn(this.group, propPath('rock_07'), { x: fx + Math.cos(a) * 1.05, z: fz + Math.sin(a) * 1.05, yaw: sr.range(0, 6), scale: sr.range(2.4, 3.6), sink: 0.05 }); }
    // treasure chest (lid animates on openChest)
    const chest = await spawn(this.group, propPath('treasure_chest'), { x: C.chest.x, z: C.chest.z, yaw: C.chest.yaw, sink: 0.01 });
    const lid = chest.getObjectByName('treasure_chest_lid')!; const lock = chest.getObjectByName('treasure_chest_lock');
    const pivot = new THREE.Group(); pivot.position.set(0, 0.42, -0.26); chest.add(pivot);
    for (const o of [lid, lock]) if (o) { chest.remove(o); o.position.set(0, -0.42, 0.26); pivot.add(o); }
    this.chestLid = pivot;
    // a chest-side flat rock as a "table" with a bowl on it
    await spawn(this.group, propPath('namaqualand_boulder_02'), { x: fx + 2.2, z: fz - 1.9, yaw: 0.9, scale: 0.7, sink: 0.25 });
  }
  private buildTent(x: number, z: number, yaw: number) {
    const f = { cx: x, cz: z, yaw }; const y0 = groundY(x, z);
    const cloth = MAT.cloth(0x8a7a5c); cloth.roughness = 1;
    const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = yaw; this.group.add(g);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.7, 7), MAT.darkWood()); p.position.set(s * 1.35, 0.85, 1.25); p.rotation.z = s * 0.06; p.castShadow = true; g.add(p); }
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.9, 6), MAT.darkWood()); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, 1.66, 1.25); ridge.castShadow = true; g.add(ridge);
    // tarp: from the ridge down to the ground behind, with a little sag
    const tarp = new THREE.PlaneGeometry(2.9, 3.05, 8, 8); const pos = tarp.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) { const u = pos.getX(i), v = pos.getY(i); const t = (v + 1.525) / 3.05; pos.setXYZ(i, u, 0.06 + t * 1.6 - Math.sin(t * Math.PI) * 0.12 * (1 - Math.abs(u) / 1.45), 1.25 - (1 - t) * 2.6); }
    tarp.computeVertexNormals(); const tm = new THREE.Mesh(tarp, cloth); tm.castShadow = true; tm.receiveShadow = true; g.add(tm);
    for (const s of [-1, 1]) { g.add(rope(new THREE.Vector3(s * 1.4, 1.62, 1.25), new THREE.Vector3(s * 1.75, 0.02, 2.4), 0.06)); const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 5), MAT.darkWood()); peg.position.set(s * 1.75, 0.05, 2.4); peg.rotation.x = -0.4; g.add(peg); }
    this.colliderMeshes.push(g);
  }
  private buildBedroll(x: number, z: number, yaw: number) {
    const g = new THREE.Group(); g.position.set(x, groundY(x, z), z); g.rotation.y = yaw; this.group.add(g);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 1.95), MAT.cloth(0x5c4c3a)); mat.position.y = 0.035; mat.receiveShadow = true; mat.castShadow = true; g.add(mat);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 1.2), MAT.cloth(0x7a2f2a)); blanket.position.set(0.02, 0.1, -0.2); blanket.rotation.y = 0.03; blanket.castShadow = true; g.add(blanket);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.78, 12), MAT.cloth(0x6b5a45)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.21, 0.82); roll.castShadow = true; g.add(roll);
  }

  // ------------------------------------------------------------------ boulder
  private async buildBoulder() {
    const B = boulderLayout(LANDMARKS);
    this.boulder = await spawn(this.group, propPath('namaqualand_boulder_04'), { x: B.start.x, z: B.start.z, yaw: 0.6, sink: 0.3 });
    this.colliderMeshes.push(this.boulder);
    const rock = await spawn(this.group, propPath('rock_face_02'), { x: B.uphillRock.x, z: B.uphillRock.z, yaw: 2.1, scale: 1.25, sink: 0.55 });
    this.colliderMeshes.push(rock);
    await spawn(this.group, propPath('rock_07'), { x: B.start.x + 1.9, z: B.start.z - 1.4, yaw: 1.0, scale: 3.2, sink: 0.05 });
  }

  // ------------------------------------------------------------------ chapel
  private async buildChapel() {
    const Ch = chapelLayout(LANDMARKS); const f = Ch.frame;
    this.wallsMesh([...Ch.nave, ...Ch.apse], this.stone, 0.8, 0.36);
    this.wallsMesh(Ch.yard, this.stone, 0.8, 0.32);
    // entrance arch
    const arch = this.mesh(gothicArchGeometry(2.6, 2.5, 0.8, 0.8, 4), this.stone, true); arch.position.set(Ch.arch.x, groundY(Ch.arch.x, Ch.arch.z) - 0.1, Ch.arch.z); arch.rotation.y = f.yaw;
    // rubble near the collapsed sections
    const rub: THREE.BufferGeometry[] = [];
    for (const [a, c, n, s] of [[-2.5, -5.6, 7, 1], [-2.7, 5.8, 5, 2], [5, 5.9, 6, 3], [14.2, 0, 9, 4], [11.5, -3.5, 4, 5], [-8.6, 3.6, 4, 6]] as const) { const p = frameAt(f, a, c); rub.push(this.rubbleGeometry(p.x, p.z, n, s + 100, 1.6)); }
    this.mesh(mergeGeometries(rub, false)!, this.stone);
    // cobbled floor patches along the nave
    const patchMat = floorPatchMaterial(this.cobble);
    for (const [a, c, r, s] of [[-5.5, 0.3, 3.4, 1], [-0.5, -0.6, 3.8, 2], [4.5, 0.4, 3.6, 3], [9, -0.5, 3.2, 4], [13, 0, 2.4, 5]] as const) {
      const p = frameAt(f, a, c); const m = new THREE.Mesh(floorPatchGeometry(r, 2.6, s), patchMat); m.position.set(p.x, groundY(p.x, p.z) + 0.03, p.z); m.rotation.y = s; m.receiveShadow = true; m.renderOrder = 1; this.group.add(m);
    }
    // altar: stone block with a slab top, candles, a shield, bones
    const A = Ch.altar; const ay = groundY(A.x, A.z);
    const altar = new THREE.Group(); altar.position.set(A.x, ay, A.z); altar.rotation.y = A.yaw; this.group.add(altar);
    const step = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(3.0, 0.16, 1.9), 1.6, 0.2), this.blocks); step.position.y = 0.08; altar.add(step);
    const block = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(2.0, 0.85, 0.9), 1.6, 0.5), this.blocks); block.position.y = 0.16 + 0.425; altar.add(block);
    const slab = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(2.25, 0.14, 1.1), 1.6, 0.8), this.blocks); slab.position.y = 1.01 + 0.07; altar.add(slab);
    altar.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    this.colliderMeshes.push(altar);
    const holders = await spawn(altar, propPath('brass_candleholders'), { x: 0.35, z: 0, y: 1.08, onGround: false, yaw: 0.4, scale: 1.1 });
    holders.updateMatrixWorld(true);
    // candle flames on the three holders (heights measured from the model: tallest ~0.84)
    for (const [dx, dz, h] of [[-0.2, -0.16, 0.86], [0.05, 0.1, 0.62], [0.22, -0.06, 0.5]] as const) this.flames.add(altar, new THREE.Vector3(0.35 + dx, 1.08 + h, dz), 0.075, new THREE.Color(2.4, 1.5, 0.6), 1.9);
    this.light(new THREE.Vector3(A.x, ay + 1.95, A.z), { color: new THREE.Color(0xffc070), intensity: 6, range: 8, flicker: 0.12 });
    await spawn(altar, propPath('kite_shield'), { x: -0.55, z: 0.62, y: 0.72, onGround: false, yaw: 0.25, pitch: -0.28 });
    await spawn(altar, propPath('marble_bust_01'), { x: -0.62, z: -0.05, y: 1.15, onGround: false, yaw: -0.4 });
    const bones = bonePile(4, 6); bones.position.set(1.6, 0.16, 0.5); altar.add(bones);
    // statue in the apse on a plinth, facing the nave
    const st = Ch.statue; const sy = groundY(st.x, st.z);
    const plinth = this.mesh(boxProjectUV(new THREE.BoxGeometry(1.9, 0.7, 1.9), 1.6, 0.3), this.blocks, true); plinth.position.set(st.x, sy + 0.3, st.z); plinth.rotation.y = f.yaw;
    await spawn(this.group, propPath('gothic_statue'), { x: st.x, z: st.z, y: 0.65, yaw: f.yaw + Math.PI });
    // braziers + torches
    for (const [i, b] of Ch.braziers.entries()) {
      const br = brazier(); br.position.set(b.x, groundY(b.x, b.z), b.z); this.group.add(br);
      this.flames.add(br, new THREE.Vector3(0, 0.92, 0), 0.5, new THREE.Color(2.8, 1.5, 0.55), 1.8);
      this.light(new THREE.Vector3(b.x, groundY(b.x, b.z) + 1.35, b.z), { color: new THREE.Color(0xff8a3c), intensity: 30, range: 16, flicker: 0.3, shadow: i === 0 });
    }
    for (const t of Ch.torches) {
      const wt = wallTorch(); wt.position.set(t.x, groundY(t.x, t.z) + 2.0, t.z); wt.rotation.y = f.yaw + Math.PI; this.group.add(wt);
      this.flames.add(wt, new THREE.Vector3(0, 0.62, 0.2), 0.26, new THREE.Color(2.6, 1.4, 0.5), 1.9);
      this.light(new THREE.Vector3(t.x, groundY(t.x, t.z) + 2.75, t.z), { color: new THREE.Color(0xff9040), intensity: 16, range: 12, flicker: 0.25 });
    }
    // collapsed roof timbers
    const beam = (a0: number, c0: number, y0: number, a1: number, c1: number, y1: number, w = 0.3) => {
      const p = frameAt(f, a0, c0), q = frameAt(f, a1, c1); const P = new THREE.Vector3(p.x, groundY(p.x, p.z) + y0, p.z), Q = new THREE.Vector3(q.x, groundY(q.x, q.z) + y1, q.z);
      const len = P.distanceTo(Q); const g = new THREE.BoxGeometry(w, w, len); boxProjectUV(g, 1.4); const m = this.mesh(g, this.planks);
      m.position.copy(P).lerp(Q, 0.5); m.lookAt(Q); return m;
    };
    beam(0.5, 4.9, 4.2, -1.2, -1.5, 0.15); beam(2.5, 4.9, 4.3, 0.3, -0.8, 0.15); beam(6, -1.8, 0.15, 4, 3.6, 0.15, 0.28); beam(-6.5, -4.9, 3.4, -5.2, 1.0, 0.18, 0.26);
    // banners on the tallest wall pieces
    for (const [a, c, yaw, name] of [[1.2, 4.62, f.yaw + Math.PI, 'banner_patternA_red'], [7.2, -4.62, f.yaw, 'banner_thin_red'], [-8, 3.5, f.yaw + Math.PI / 2, 'banner_shield_red']] as const) {
      const p = frameAt(f, a, c); await spawn(this.group, dungeonPath(name), { x: p.x, z: p.z, y: 0.0, yaw, scale: 0.85 });
    }
    // graveyard: landmark graves (skeletons rise here) + extra stones
    const dirt = new THREE.MeshStandardMaterial({ color: 0x3a2d21, roughness: 1 });
    for (const [i, g] of Ch.graves.entries()) {
      const m = mound(dirt); m.position.set(g.x, groundY(g.x, g.z) - 0.02, g.z); m.rotation.y = g.yaw; this.group.add(m);
      const sp = frameAt({ cx: g.x, cz: g.z, yaw: g.yaw }, -1.15, 0); const gs = gravestone(this.blocks, i === 1 ? 'cross' : 'round', 30 + i); gs.position.set(sp.x, groundY(sp.x, sp.z) - 0.05, sp.z); gs.rotation.y = g.yaw; this.group.add(gs);
    }
    for (const [i, g] of Ch.extraGraves.entries()) { const gs = gravestone(this.blocks, g.kind, 50 + i); gs.position.set(g.x, groundY(g.x, g.z) - 0.06, g.z); gs.rotation.y = g.yaw; this.group.add(gs); if (g.kind !== 'slab') { const m = mound(dirt, 1.7, 0.7, 0.14); const mp = frameAt({ cx: g.x, cz: g.z, yaw: g.yaw }, 1.1, 0); m.position.set(mp.x, groundY(mp.x, mp.z) - 0.02, mp.z); m.rotation.y = g.yaw; this.group.add(m); } }
    const bp = frameAt(f, -3.2, 8.2); const pile = bonePile(7, 8); pile.position.set(bp.x, groundY(bp.x, bp.z), bp.z); this.group.add(pile);
    // bits of clutter: a broken cart wheel? no — a toppled column drum and a crate
    const drum = this.mesh(boxProjectUV(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 12), 1.6), this.blocks); const dp = frameAt(f, -4.2, -7.2); drum.position.set(dp.x, groundY(dp.x, dp.z) + 0.3, dp.z); drum.rotation.set(Math.PI / 2, 0, f.yaw + 0.4);
    const cp = frameAt(f, 3.5, -6.5); await spawn(this.group, propPath('wooden_crate_02'), { x: cp.x, z: cp.z, yaw: f.yaw + 0.8, roll: 0.3, sink: 0.1 });
    const lp = frameAt(f, -7.2, 2.3); await spawn(this.group, propPath('wooden_lantern_01'), { x: lp.x, z: lp.z, yaw: 0.5 });
  }

  // ------------------------------------------------------------------ crypt gate
  private async buildGate() {
    const G = gateLayout(LANDMARKS); const f = G.frame; const gy = groundY(G.gate.x, G.gate.z);
    this.wallsMesh(G.facade, this.brick, 1.0, 0.44);
    // arch + tympanum above the gate
    const arch = this.mesh(gothicArchGeometry(3.8, 3.0, 0.9, 1.4, 8), this.brick, true); arch.position.set(G.gate.x, gy - 0.1, G.gate.z); arch.rotation.y = f.yaw;
    const tymp = this.mesh(boxProjectUV(new THREE.BoxGeometry(4.2, 3.4, 0.9), 1.6, 0.4), this.blocks); const tp = frameAt(f, -0.15, 0); tymp.position.set(tp.x, gy + 3.7 + 1.7, tp.z); tymp.rotation.y = f.yaw;
    // skull relief over the arch
    const skull = bonePile(1, 0).children[0]; skull.position.set(0, -0.35, 0.47); skull.rotation.set(0.1, 0, 0); skull.scale.setScalar(2.4); tymp.add(skull);
    // iron gate (two leaves on hinge pivots)
    const gate = await spawn(this.group, propPath('large_iron_gate'), { x: G.gate.x, z: G.gate.z, yaw: f.yaw, scale: 1.25, sink: 0.02 });
    for (const [name, hx] of [['large_iron_gate_left_door', -1.43], ['large_iron_gate_right_door', 1.43]] as const) {
      const leaf = gate.getObjectByName(name)!; const pivot = new THREE.Group(); pivot.position.set(hx, 0, 0); gate.add(pivot); gate.remove(leaf); leaf.position.set(-hx, 0, 0); pivot.add(leaf); this.gateLeaves.push(pivot);
    }
    const bolt = gate.getObjectByName('large_iron_gate_bolt'); if (bolt) { gate.remove(bolt); this.gateLeaves[1].add(bolt); bolt.position.set(-1.43, 0, 0); }
    this.colliderMeshes.push(gate);
    // threshold slab
    const thr = this.mesh(boxProjectUV(new THREE.BoxGeometry(4.2, 0.06, 1.6), 1.6, 0.6), this.blocks); thr.position.set(G.gate.x, gy + 0.01, G.gate.z); thr.rotation.y = f.yaw;
    // tunnel behind the gate: walls, ceiling, steps down into darkness
    this.wallsMesh(G.tunnel, this.brick, 1.0, 0.44);
    const tun = new THREE.Group(); tun.position.set(G.gate.x, gy, G.gate.z); tun.rotation.y = f.yaw; this.group.add(tun);
    const ceil = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(5.0, 0.6, 7.5), 1.6), this.blocks); ceil.position.set(0, 4.3, -3.6); ceil.castShadow = true; ceil.receiveShadow = true; tun.add(ceil);
    const floor = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(3.8, 0.1, 2.4), 1.6), this.blocks); floor.position.set(0, -0.05, -1.5); floor.receiveShadow = true; tun.add(floor);
    for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(3.8, 0.28, 0.42), 1.6, i * 0.1), this.blocks); s.position.set(0, -0.14 - i * 0.28, -2.9 - i * 0.42); s.receiveShadow = true; s.castShadow = true; tun.add(s); }
    const dark = new THREE.Mesh(new THREE.BoxGeometry(5.2, 9, 0.2), MAT.void()); dark.position.set(0, 1, -7.3); tun.add(dark);
    const darkFloor = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 4), MAT.void()); darkFloor.position.set(0, -2.4, -6.6); tun.add(darkFloor);
    // the hill the crypt is dug into: a noisy rock mass behind the facade + big rocks
    // local +Z is the facade side: the front is flattened so the mass never pokes through the arch opening
    const blob = new THREE.SphereGeometry(1, 56, 32); const pos = blob.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)); const n = fbm(v.x * 2.1 + 5, v.z * 2.1 + v.y * 1.7, 4); const s = 1 + 0.3 * n + 0.09 * fbm(v.x * 7, v.y * 7 + v.z * 5, 2);
      const zf = v.z > 0 ? 0.55 : 1; pos.setXYZ(i, v.x * s * 13, v.y * s * 9, v.z * s * 8.5 * zf);
    }
    blob.computeVertexNormals(); boxProjectUV(blob, 4.5);
    const hp = frameAt(f, -9.5, 0);
    const hill = this.mesh(blob, this.stone, true); hill.position.set(hp.x, groundY(G.hill.x, G.hill.z) - 2.6, hp.z); hill.rotation.y = f.yaw;
    for (const r of G.rocks) { const o = await spawn(this.group, propPath(r.model), { x: r.x, z: r.z, yaw: r.yaw, scale: r.s, sink: 0.35 * r.s }); this.colliderMeshes.push(o); }
    for (const [a, c, m, s, yw] of [[-6, -3.5, 'namaqualand_boulder_04', 1.4, 0.3], [-7, 3, 'namaqualand_boulder_02', 1.7, 1.4], [-4.5, 0.5, 'rock_face_02', 1.5, 2.6]] as const) {
      const p = frameAt(f, a, c); await spawn(this.group, propPath(m), { x: p.x, z: p.z, y: 4.2, yaw: yw, scale: s });
    }
    // torches either side of the arch, skulls on stakes flanking the approach
    for (const t of G.torches) {
      const wt = wallTorch(); wt.position.set(t.x, groundY(t.x, t.z) + 2.15, t.z); wt.rotation.y = f.yaw; this.group.add(wt);
      this.flames.add(wt, new THREE.Vector3(0, 0.62, 0.2), 0.28, new THREE.Color(2.6, 1.4, 0.5), 1.9);
      this.light(new THREE.Vector3(t.x, groundY(t.x, t.z) + 2.85, t.z), { color: new THREE.Color(0xff9040), intensity: 18, range: 13, flicker: 0.25, shadow: true });
    }
    for (const s of [-1, 1]) {
      const p = frameAt(f, 3.2, s * 4.6); const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.5, 6), MAT.darkWood()); stake.position.set(p.x, groundY(p.x, p.z) + 0.7, p.z); stake.rotation.z = s * 0.08; stake.castShadow = true; this.group.add(stake);
      const sk = bonePile(2 + s, 0).children[0]; sk.position.set(p.x, groundY(p.x, p.z) + 1.5, p.z); sk.rotation.set(0.2, f.yaw + s * 0.4, 0); this.group.add(sk);
    }
    const cr = frameAt(f, 4.5, -4.2); await spawn(this.group, propPath('wooden_crate_02'), { x: cr.x, z: cr.z, yaw: f.yaw + 0.5, sink: 0.05 });
    const cbp = frameAt(f, 2.6, 5.4); const pile = bonePile(11, 9); pile.position.set(cbp.x, groundY(cbp.x, cbp.z), cbp.z); this.group.add(pile);
  }

  // ------------------------------------------------------------------ public API
  /** Hide the longsword prop + glint once the player picks it up. */
  takeSword() { const s = this.group.getObjectByName('sword'); if (s) s.visible = false; if (this.swordGlint) this.swordGlint.visible = false; }
  /** Animate the treasure chest lid open (idempotent). */
  openChest() {
    if (this.chestOpen || !this.chestLid) return; this.chestOpen = true; const lid = this.chestLid;
    this.tween(0.9, (k) => { lid.rotation.x = -easeOut(k) * 1.75 + Math.sin(k * Math.PI) * 0.1; });
  }
  /** Roll the boulder ~4.6 m off the path (downhill, toward the lake) over 1.5 s. The lead removes the 'boulder' collider. */
  pushBoulder() {
    if (this.boulderPushed || !this.boulder) return; this.boulderPushed = true; const B = boulderLayout(LANDMARKS); const b = this.boulder;
    const from = b.position.clone(); const dir = new THREE.Vector3(B.end.x - B.start.x, 0, B.end.z - B.start.z); const dist = dir.length(); dir.normalize();
    const axis = new THREE.Vector3(0, 1, 0).cross(dir).normalize(); const q0 = b.quaternion.clone(); const sink = 0.3;
    this.tween(1.5, (k) => {
      const e = easeInOut(k); const d = dist * e;
      const x = from.x + dir.x * d, z = from.z + dir.z * d;
      b.position.set(x, groundY(x, z) - sink + Math.sin(k * Math.PI) * 0.12, z);
      b.quaternion.copy(q0).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, d / 1.25));
    });
  }
  /** Swing both gate leaves inward. The lead removes the 'gate' collider. */
  openGate() {
    if (this.gateOpen || this.gateLeaves.length < 2) return; this.gateOpen = true; const [l, r] = this.gateLeaves;
    this.tween(1.8, (k) => { const a = easeOut(k) * 1.75; l.rotation.y = a; r.rotation.y = -a; });
  }

  update(dt: number, camPos: THREE.Vector3) {
    this.time += dt; const t = this.time;
    this.pool.update(dt, camPos); this.flames.update(t);
    for (let i = this.tweens.length - 1; i >= 0; i--) { const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { tw.done?.(); this.tweens.splice(i, 1); } }
    for (const [i, s] of this.lanternSwing.entries()) { s.rotation.z = Math.sin(t * 1.7 + i) * 0.06; s.rotation.x = Math.sin(t * 1.1 + i * 2) * 0.04; }
    if (this.swordGlint) glintUpdate(this.swordGlint, t);
    if (this.fireLight) this.fireLight.pos.y = groundY(this.fireLight.pos.x, this.fireLight.pos.z) + 0.75 + Math.sin(t * 3.1) * 0.05;
  }
}
