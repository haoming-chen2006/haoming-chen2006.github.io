// env-dressing: the crypt interior at CRYPT_ORIGIN — entrance hall, corridor, antechamber, corridor, boss chamber.
// Built from KayKit Dungeon Remastered modules (walls/floors/pillars/props) plus PBR ceilings, dais, sarcophagus and coffins.
// Everything is lit locally through the shared LightPool; ceilings cast shadows so the sun cannot leak in.
import * as THREE from 'three';
import { LANDMARKS } from '../content/level.ts';
import { cryptLayout, type Room } from '../content/dressing.ts';
import {
  Rand, pbrMaterial, MAT, FlameSet, LightPool, spawn, dungeonPath, propPath, loadTemplate, boxProjectUV, mergeKayKit,
  coffin, sarcophagus, chain, cobweb, lightShaft, brazier, bonePile, runeCircle, type LightSource,
} from './structures.ts';

interface Tween { t: number; dur: number; fn: (k: number) => void }
/** A group whose KayKit meshes were merged away has nothing left to raycast against. */
const isKayKitOrphan = (o: THREE.Object3D) => { let meshes = 0; o.traverse((c) => { if ((c as THREE.Mesh).isMesh) meshes++; }); return meshes === 0; };
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const WALL_TWEAK = (root: THREE.Group) => root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mat = m.material as THREE.MeshStandardMaterial; if (mat?.isMeshStandardMaterial) { mat.roughness = 0.82; mat.metalness = 0; mat.envMapIntensity = 0.35; } } });

export class CryptView {
  group = new THREE.Group();
  colliderMeshes: THREE.Object3D[] = [];
  pool: LightPool; flames = new FlameSet();
  private tweens: Tween[] = []; private time = 0;
  private exitDoor: THREE.Object3D | null = null; exitOpen = false;
  private chains: THREE.Object3D[] = []; private rune: THREE.Mesh | null = null; private runeLight: LightSource | null = null;
  private blocks!: THREE.MeshStandardMaterial; private planks!: THREE.MeshStandardMaterial;
  private L = cryptLayout(LANDMARKS);
  private rnd = new Rand(77);

  constructor(public scene: THREE.Scene) { this.group.name = 'crypt'; scene.add(this.group); this.pool = LightPool.get(scene); }

  /** True when a position is inside the crypt area (the lead can dim sun/sky and swap ambience). */
  isInside(p: { x: number; z: number }) { return Math.abs(p.z - LANDMARKS.crypt.z) < 120 && Math.abs(p.x - LANDMARKS.crypt.x) < 120; }

  async load() {
    [this.blocks, this.planks] = await Promise.all([pbrMaterial('medieval_blocks_06', { roughness: 1 }), pbrMaterial('old_planks_02', { roughness: 0.95 })]);
    // warm up the KayKit templates we use most
    await Promise.all(['wall', 'wall_cracked', 'wall_pillar', 'wall_half', 'wall_arched', 'wall_archedwindow_gated', 'wall_shelves', 'floor_tile_large', 'floor_tile_small', 'pillar', 'floor_tile_large_rocks', 'floor_tile_small_broken_A', 'floor_tile_small_broken_B', 'floor_dirt_small_A', 'floor_dirt_large'].map((n) => loadTemplate(dungeonPath(n), WALL_TWEAK)));
    const L = this.L;
    for (const r of L.rooms) await this.buildRoom(r);
    await Promise.all([this.buildHall(), this.buildAnte(), this.buildBoss(), this.buildCorridors()]);
    for (const s of L.lights) this.pool.add({ pos: new THREE.Vector3(s.x, s.y, s.z), color: new THREE.Color(s.color), intensity: s.intensity, range: s.range, flicker: s.kind === 'magic' ? 0.08 : s.kind === 'candle' ? 0.14 : 0.25, shadow: false, group: 'crypt' });
    // collapse the hundreds of static KayKit pieces into a handful of draw calls (the exit door stays separate)
    const merged = mergeKayKit(this.group, (o) => o.userData.dynamic === true);
    this.colliderMeshes = [...merged, ...this.colliderMeshes.filter((o) => o.parent && !(o.getObjectByProperty('name', 'kaykit-merged')) && !isKayKitOrphan(o))];
    // three shadow-casting sources: the two dais braziers and the chandelier
    for (const src of this.pool.sources) if (src.group === 'crypt' && ((src.intensity >= 26 && src.pos.z < L.bz - 5) || (src.pos.y > 5 && Math.abs(src.pos.x - L.bx) < 0.1))) src.shadow = true;
  }

  // ------------------------------------------------------------------ structural
  private k(name: string, x: number, z: number, yaw = 0, y = 0, scale?: number | [number, number, number]) {
    return spawn(this.group, dungeonPath(name), { x, z, y, yaw, onGround: false, scale }, WALL_TWEAK);
  }
  /** Fill a straight edge with wall modules. `along` is the unit direction, pieces are centred on the edge line. */
  private async wallRun(x0: number, z0: number, x1: number, z1: number, gap: [number, number] | null, y = 0, variants = true, tall = false) {
    const dx = x1 - x0, dz = z1 - z0; const len = Math.hypot(dx, dz); const ux = dx / len, uz = dz / len; const yaw = Math.atan2(ux, -uz) + Math.PI / 2; // wall module spans local X
    const spans: [number, number][] = [];
    if (gap) { spans.push([0, gap[0]]); spans.push([gap[1], len]); } else spans.push([0, len]);
    const place = async (name: string, s: number, e: number, sx = 1) => {
      const c = (s + e) / 2; const o = await this.k(name, x0 + ux * c, z0 + uz * c, yaw, y, sx === 1 ? undefined : [sx, 1, 1]); o.receiveShadow = true; this.colliderMeshes.push(o);
      if (tall) { const nm = this.rnd.next() < 0.35 ? 'wall_arched' : 'wall'; const o2 = await this.k(nm, x0 + ux * c, z0 + uz * c, yaw, y + 4, sx === 1 ? undefined : [sx, 1, 1]); this.colliderMeshes.push(o2); }
    };
    for (const [s, e] of spans) {
      let p = s; let L = e - s;
      while (L >= 4 - 1e-3) { const nm = !variants ? 'wall' : this.rnd.pick(['wall', 'wall', 'wall', 'wall', 'wall_cracked', 'wall_pillar', 'wall_pillar', 'wall_shelves', 'wall_archedwindow_gated'] as const); await place(nm, p, p + 4); p += 4; L -= 4; }
      while (L >= 2 - 1e-3) { await place('wall_half', p, p + 2); p += 2; L -= 2; }
      if (L > 0.05) await place('wall_half', p, p + L, L / 2);
    }
  }
  private async buildRoom(r: Room) {
    const L = this.L; const ex = L.ex;
    const w = r.x1 - r.x0, d = r.z1 - r.z0; const tall = r.h > 4;
    // floor tiles (top at y=0)
    for (let x = r.x0; x < r.x1 - 1e-3; x += 4) for (let z = r.z0; z < r.z1 - 1e-3; z += 4) {
      const tw = Math.min(4, r.x1 - x), td = Math.min(4, r.z1 - z);
      if (tw >= 4 && td >= 4) { const v = this.rnd.next(); await this.k(v < 0.75 ? 'floor_tile_large' : v < 0.88 ? 'floor_tile_large_rocks' : 'floor_dirt_large', x + 2, z + 2, Math.floor(this.rnd.next() * 4) * Math.PI / 2, -0.05); }
      else for (let sx = x; sx < r.x1 - 1e-3; sx += 2) for (let sz = z; sz < r.z1 - 1e-3; sz += 2) { const v = this.rnd.next(); await this.k(v < 0.7 ? 'floor_tile_small' : v < 0.85 ? 'floor_tile_small_broken_A' : 'floor_tile_small_broken_B', Math.min(sx + 1, r.x1 - 1), Math.min(sz + 1, r.z1 - 1), 0, -0.05); }
    }
    // walls: X edges extended by the wall thickness so corners close; openings are corridor joins
    const isCorr = r.name.startsWith('corr');
    const opN = r.name === 'ante' || r.name === 'boss'; const opS = r.name === 'hall' || r.name === 'ante';
    if (!isCorr) {
      const gapN: [number, number] | null = opN ? [ex - 2 - (r.x0 - 0.5), ex + 2 - (r.x0 - 0.5)] : null;
      const gapS: [number, number] | null = opS ? [ex - 2 - (r.x0 - 0.5), ex + 2 - (r.x0 - 0.5)] : null;
      const doorGap: [number, number] | null = r.name === 'hall' ? [L.exitDoor.x - 2 - (r.x0 - 0.5), L.exitDoor.x + 2 - (r.x0 - 0.5)] : gapN;
      await this.wallRun(r.x0 - 0.5, r.z1 + 0.5, r.x1 + 0.5, r.z1 + 0.5, doorGap, 0, true, tall);
      await this.wallRun(r.x0 - 0.5, r.z0 - 0.5, r.x1 + 0.5, r.z0 - 0.5, gapS, 0, true, tall);
      await this.wallRun(r.x0 - 0.5, r.z0 + 0.5, r.x0 - 0.5, r.z1 - 0.5, null, 0, true, tall);
      await this.wallRun(r.x1 + 0.5, r.z0 + 0.5, r.x1 + 0.5, r.z1 - 0.5, null, 0, true, tall);
    } else {
      await this.wallRun(r.x0 - 0.5, r.z0, r.x0 - 0.5, r.z1, null, 0, false);
      await this.wallRun(r.x1 + 0.5, r.z0, r.x1 + 0.5, r.z1, null, 0, false);
    }
    // ceiling (PBR stone, faces down, blocks the sun)
    // corridors keep their ceiling inside the room ceilings so nothing overlaps at the junctions
    const cw = isCorr ? w + 2.0 : w + 2.0, cd = isCorr ? d - 1.2 : d + 2.0;
    const cg = new THREE.PlaneGeometry(cw, cd); cg.rotateX(Math.PI / 2); boxProjectUV(cg, 2.0, this.rnd.range(0, 1));
    const ceil = new THREE.Mesh(cg, this.blocks); ceil.position.set((r.x0 + r.x1) / 2, r.h - 0.01, (r.z0 + r.z1) / 2); ceil.receiveShadow = true; ceil.castShadow = true; this.group.add(ceil);
    // a solid slab above the ceiling so sun shadows are unambiguous even at grazing angles
    const cap = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.5, cd), MAT.void()); cap.position.set((r.x0 + r.x1) / 2, r.h + 0.3, (r.z0 + r.z1) / 2); cap.castShadow = true; this.group.add(cap);
    // ceiling beams in corridors / rooms
    if (isCorr) for (let z = r.z0 + 2; z < r.z1; z += 4) { const b = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(w + 1, 0.28, 0.28), 1.4), this.planks); b.position.set((r.x0 + r.x1) / 2, r.h - 0.16, z); b.castShadow = true; b.receiveShadow = true; this.group.add(b); }
    // cobwebs in the upper corners
    for (const [cx, cz, yaw] of [[r.x0, r.z0, 0], [r.x1, r.z0, -Math.PI / 2], [r.x1, r.z1, Math.PI], [r.x0, r.z1, Math.PI / 2]] as const) {
      if (this.rnd.next() < 0.3) continue;
      const web = cobweb(this.rnd.range(1.0, 1.8), 0.5); web.position.set(cx, r.h - 0.02, cz); web.rotation.y = yaw; this.group.add(web);
      const web2 = cobweb(this.rnd.range(0.8, 1.3), 0.4); web2.position.set(cx, r.h - 0.02, cz); web2.rotation.y = yaw + Math.PI / 2; web2.rotation.x = 0; this.group.add(web2);
    }
  }

  // ------------------------------------------------------------------ rooms
  private async buildHall() {
    const L = this.L; const r = L.hall; const ex = L.ex, ez = L.ez;
    // exit door in the +z wall, with stairs climbing into darkness behind it
    const door = await this.k('wall_doorway', L.exitDoor.x, r.z1 + 0.5, Math.PI, 0); door.userData.dynamic = true;
    this.exitDoor = door.getObjectByName('wall_doorway_door') ?? null; this.colliderMeshes.push(door);
    await this.k('stairs', L.exitDoor.x, r.z1 + 1.2, 0, 0);
    const dark = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 0.3), MAT.void()); dark.position.set(L.exitDoor.x, 4, r.z1 + 5.4); this.group.add(dark);
    const darkSides = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 5), MAT.void()); darkSides.position.set(L.exitDoor.x, 9.5, r.z1 + 3); this.group.add(darkSides);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 12, 5), MAT.void()); w.position.set(L.exitDoor.x + s * 3.2, 4, r.z1 + 3); this.group.add(w); }
    // torches flanking the door, candles on shelves, storage clutter
    for (const s of [-1, 1]) { const t = await this.k('torch_mounted', ex + s * 2.6, r.z1 + 0.05, Math.PI, 1.9); this.flames.add(t, new THREE.Vector3(0, 0.62, 0.36), 0.24, new THREE.Color(2.6, 1.4, 0.5), 1.9); }
    const sh1 = await this.k('shelf_small_candles', r.x0 + 0.05, ez - 2, Math.PI / 2, 1.0); this.candleFlames(sh1, [[0, 0.32, 0.25], [0.18, 0.28, 0.2], [-0.15, 0.3, 0.3]]);
    const sh2 = await this.k('shelf_small_candles', r.x1 - 0.05, ez - 3.5, -Math.PI / 2, 1.0); this.candleFlames(sh2, [[0, 0.32, 0.25], [0.18, 0.28, 0.2]]);
    await this.k('crates_stacked', r.x0 + 1.5, r.z0 + 1.6, 0.3, 0, 0.7); await this.k('barrel_small_stack', r.x1 - 1.6, r.z0 + 1.7, -0.4, 0, 0.8); await this.k('keg', r.x1 - 1.4, r.z1 - 1.5, 0.9, 0, 0.6);
    const tbl = await this.k('table_small_decorated_A', r.x0 + 2.2, r.z1 - 1.8, 0.6); this.candleFlames(tbl, [[0.1, 0.95, 0.1]]);
    await this.k('bottle_B_brown', r.x0 + 1.9, r.z1 - 1.6, 0, 0.95); await this.k('banner_patternB_blue', r.x0 + 0.5, ez - 0.5, Math.PI / 2, 0, 0.9); await this.k('banner_thin_red', r.x1 - 0.5, ez + 1.5, -Math.PI / 2, 0, 0.9);
    await this.k('rubble_half', r.x1 - 2.5, r.z0 + 1.2, 1.2, 0, 0.4); await this.k('floor_dirt_small_A', ex - 3, ez - 1, 0, -0.05);
    const bones = bonePile(21, 6); bones.position.set(r.x0 + 1.2, 0, ez + 1.5); this.group.add(bones);
    this.hangChain(ex - 3.5, r.h, ez - 4.5, 1.6); this.hangChain(ex + 4, r.h, ez + 1, 2.2);
  }
  private async buildCorridors() {
    const L = this.L; const ex = L.ex, ez = L.ez;
    // corridor 1: a torch, a grate in the floor, rubble; corridor 2: torch, dirt, bones, a barrier
    const t1 = await this.k('torch_mounted', L.corr1.x1 - 0.05, ez - 12, -Math.PI / 2, 1.9); this.flames.add(t1, new THREE.Vector3(0, 0.62, 0.36), 0.24, new THREE.Color(2.6, 1.4, 0.5), 1.9);
    await this.k('floor_tile_grate', ex, ez - 9, 0, -0.05);
    const t2 = await this.k('torch_mounted', L.corr2.x0 + 0.05, ez - 40, Math.PI / 2, 1.9); this.flames.add(t2, new THREE.Vector3(0, 0.62, 0.36), 0.24, new THREE.Color(2.6, 1.4, 0.5), 1.9);
    await this.k('floor_dirt_small_A', ex + 1, ez - 36, 0, -0.05); await this.k('floor_dirt_small_weeds', ex - 1, ez - 44, Math.PI / 2, -0.05);
    const b = bonePile(31, 5); b.position.set(L.corr2.x1 - 0.7, 0, ez - 47); this.group.add(b);
    await this.k('barrier_half', L.corr2.x0 + 1, ez - 33, 0.2); this.hangChain(ex + 1.2, 4, ez - 38, 1.4);
    for (const z of [ez - 8, ez - 15, ez - 35, ez - 44]) { const c = await this.k('candle_melted', ex + (this.rnd.next() < 0.5 ? -1.6 : 1.6), z, this.rnd.range(0, 6)); void c; }
  }
  private async buildAnte() {
    const L = this.L; const r = L.ante; const ex = L.ex, ez = L.ez;
    for (const p of L.pillars.filter((p) => p.z > r.z0 && p.z < r.z1)) { const o = await this.k('pillar', p.x, p.z, 0); this.colliderMeshes.push(o); }
    // magic brazier in the centre, candle clusters, coffins in the side niches, banners, chest
    const br = brazier(MAT.rustIron(), new THREE.Color(0.25, 1.6, 1.3)); br.position.set(ex, 0, ez - 24); this.group.add(br);
    this.flames.add(br, new THREE.Vector3(0, 0.92, 0), 0.42, new THREE.Color(0.5, 2.4, 2.0), 1.8);
    const c1 = await this.k('candle_triple', r.x0 + 1.2, ez - 21.5, 0.4); this.candleFlames(c1, [[0, 0.87, 0], [0.16, 0.7, 0.05], [-0.05, 0.62, 0.1]]);
    const c2 = await this.k('candle_triple', r.x1 - 1.2, ez - 26.5, 2.2); this.candleFlames(c2, [[0, 0.87, 0], [0.16, 0.7, 0.05], [-0.05, 0.62, 0.1]]);
    for (const s of [-1, 1]) { const t = await this.k('torch_mounted', s < 0 ? r.x0 + 0.05 : r.x1 - 0.05, ez - 24, s < 0 ? Math.PI / 2 : -Math.PI / 2, 1.9); this.flames.add(t, new THREE.Vector3(0, 0.62, 0.36), 0.24, new THREE.Color(2.6, 1.4, 0.5), 1.9); }
    for (const c of L.coffins.filter((c) => c.z > r.z0 && c.z < r.z1)) this.placeCoffin(c.x, c.z, c.yaw, true);
    await this.k('banner_red', ex - 2, r.z0 + 0.5, 0, 0, 0.9); await this.k('banner_red', ex + 2.5, r.z0 + 0.5, 0, 0, 0.9);
    await this.k('banner_patternA_red', r.x0 + 0.5, ez - 20, Math.PI / 2, 0, 0.9);
    await this.k('chest', r.x1 - 1.4, r.z0 + 1.4, -2.4, 0, 0.6); await this.k('rubble_large', r.x0 + 2.5, r.z1 - 1.6, 0.8, 0, 0.35);
    await this.k('sword_shield_broken', r.x1 - 0.06, ez - 21, -Math.PI / 2, 2.1); await this.k('trunk_medium_A', r.x0 + 1.3, r.z1 - 1.4, 1.5);
    const bp = bonePile(41, 8); bp.position.set(r.x1 - 1.6, 0, ez - 20.2); this.group.add(bp);
    this.hangChain(ex - 3, r.h, ez - 22, 2.4); this.hangChain(ex + 2.6, r.h, ez - 27, 1.9);
    this.shaft(L.shafts[2].x, r.h, L.shafts[2].z, r.h - 0.2);
  }
  private async buildBoss() {
    const L = this.L; const r = L.boss; const bx = L.bx, bz = L.bz;
    // pillars, stacked two high for the 8 m hall
    for (const p of L.pillars.filter((p) => p.z > r.z0 && p.z < r.z1)) { const o = await this.k('pillar', p.x, p.z, 0); const o2 = await this.k('pillar', p.x, p.z, Math.PI / 2, 4); this.colliderMeshes.push(o, o2); }
    // dais + sarcophagus (lid ajar) + statue
    const D = L.dais; const dg = new THREE.Group(); dg.position.set(D.x, 0, D.z); this.group.add(dg);
    const s1 = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(D.w, 0.25, D.d), 1.6, 0.1), this.blocks); s1.position.y = 0.125; dg.add(s1);
    const s2 = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(D.w - 1.2, 0.25, D.d - 1.0), 1.6, 0.6), this.blocks); s2.position.y = 0.375; dg.add(s2);
    dg.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); this.colliderMeshes.push(dg);
    const sarc = sarcophagus(this.blocks); sarc.position.set(L.sarcophagus.x, D.h, L.sarcophagus.z); this.group.add(sarc);
    const lid = sarc.getObjectByName('lid')!; lid.position.x += 0.42; lid.position.z -= 0.3; lid.rotation.z = -0.28; lid.rotation.y = 0.08; lid.position.y += 0.18;
    const plinth = new THREE.Mesh(boxProjectUV(new THREE.BoxGeometry(2.0, 0.5, 2.0), 1.6, 0.3), this.blocks); plinth.position.set(L.statue.x, D.h + 0.25, L.statue.z); plinth.castShadow = plinth.receiveShadow = true; this.group.add(plinth);
    await spawn(this.group, propPath('gothic_statue'), { x: L.statue.x, z: L.statue.z, y: D.h + 0.5, yaw: Math.PI, onGround: false });
    // blue-green braziers flanking the dais
    for (const s of [-1, 1]) { const br = brazier(MAT.rustIron(), new THREE.Color(0.25, 1.6, 1.3)); br.position.set(bx + s * 4.2, 0, bz - 7.2); br.scale.setScalar(1.25); this.group.add(br); this.flames.add(br, new THREE.Vector3(0, 0.92, 0), 0.52, new THREE.Color(0.5, 2.4, 2.0), 1.8); }
    // rune circle where the boss stands
    this.rune = runeCircle(4.2); this.rune.position.set(bx, 0.03, bz); this.group.add(this.rune);
    // coffins along the side walls (minions lie here), skulls, rubble, banners, torches on pillars, chandelier
    for (const c of L.coffins.filter((c) => c.z > r.z0 && c.z < r.z1)) this.placeCoffin(c.x, c.z, c.yaw, true);
    for (const p of L.pillars.filter((p) => p.z > r.z0 && p.z < r.z1)) { const s = Math.sign(p.x - bx) || 1; const t = await this.k('torch_mounted', p.x - s * 0.8, p.z, s > 0 ? -Math.PI / 2 : Math.PI / 2, 2.3); this.flames.add(t, new THREE.Vector3(0, 0.62, 0.36), 0.24, new THREE.Color(2.6, 1.4, 0.5), 1.9); }
    const ch = chain(2.2, 0.13); ch.position.set(bx, r.h - 0.05, bz); this.group.add(ch);
    const chand = await spawn(this.group, propPath('lantern_chandelier_01'), { x: bx, z: bz, y: r.h - 2.2, onGround: false, scale: 1.6 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.flames.add(chand, new THREE.Vector3(Math.cos(a) * 0.22, -0.32, Math.sin(a) * 0.22), 0.07, new THREE.Color(2.4, 1.5, 0.6), 1.8); }
    for (const [x, z, yaw, name] of [[r.x0 + 0.5, bz + 2, Math.PI / 2, 'banner_patternA_red'], [r.x1 - 0.5, bz + 2, -Math.PI / 2, 'banner_patternA_red'], [bx - 3.5, r.z0 + 0.5, 0, 'banner_triple_red'], [bx + 3.5, r.z0 + 0.5, 0, 'banner_triple_red'], [bx - 8, r.z1 + 0.5, Math.PI, 'banner_shield_red'], [bx + 8, r.z1 + 0.5, Math.PI, 'banner_shield_red']] as const) await this.k(name, x, z, yaw, 0, 1.1);
    for (const [x, z, seed] of [[r.x0 + 1.6, r.z0 + 1.6, 51], [r.x1 - 1.8, r.z0 + 2.2, 52], [r.x0 + 2.2, r.z1 - 1.8, 53], [bx + 2.6, bz - 5.2, 54], [bx - 3.2, bz - 5.6, 55]] as const) { const b = bonePile(seed, 7); b.position.set(x, 0, z); this.group.add(b); }
    await this.k('rubble_large', r.x1 - 3, r.z1 - 2.2, -0.5, 0, 0.4); await this.k('rubble_half', r.x0 + 3, r.z0 + 3.5, 2.0, 0, 0.45);
    await this.k('coin_stack_medium', bx + 3.1, bz - 6.4, 0.3, D.h, 0.7); await this.k('coin_stack_small', bx - 2.9, bz - 6.1, 1.3, D.h, 0.7); await this.k('chest_gold', bx - 2.9, bz - 8.6, 0.5, D.h, 0.6);
    await this.k('candle_lit', bx - 2.2, bz - 5.6, 0, D.h); await this.k('candle_lit', bx + 2.2, bz - 5.6, 0, D.h); await this.k('candle_triple', bx + 1.2, bz - 8.9, 0.4, D.h);
    for (const [x, z] of [[bx - 2.2, bz - 5.6], [bx + 2.2, bz - 5.6]] as const) this.flames.add(this.group, new THREE.Vector3(x, D.h + 1.07, z), 0.08, new THREE.Color(2.4, 1.5, 0.6), 1.8);
    for (const [dx, dz, h] of [[0, 0, 0.87], [0.16, 0.05, 0.7], [-0.05, 0.1, 0.62]] as const) this.flames.add(this.group, new THREE.Vector3(bx + 1.2 + dx, D.h + h, bz - 8.9 + dz), 0.075, new THREE.Color(2.4, 1.5, 0.6), 1.8);
    const cs1 = await this.k('candle_triple', r.x0 + 1.4, bz - 1.2, 0.6); this.candleFlames(cs1, [[0, 0.87, 0], [0.16, 0.7, 0.05], [-0.05, 0.62, 0.1]]);
    const cs2 = await this.k('candle_triple', r.x1 - 1.4, bz - 1.2, 2.8); this.candleFlames(cs2, [[0, 0.87, 0], [0.16, 0.7, 0.05], [-0.05, 0.62, 0.1]]);
    for (const [x, z] of [[r.x0 + 1, bz + 7], [r.x1 - 1, bz + 7]] as const) await this.k('floor_dirt_small_weeds', x, z, this.rnd.range(0, 6), -0.05);
    this.hangChain(bx - 7.5, r.h, bz + 3, 3.2); this.hangChain(bx + 8, r.h, bz - 2, 2.6); this.hangChain(bx - 4, r.h, bz + 8, 2.0);
    for (const s of L.shafts.slice(0, 2)) this.shaft(s.x, r.h, s.z, r.h - 0.3);
    // extra cobwebs on the pillars' tops
    for (const p of L.pillars.filter((p) => p.z > r.z0 && p.z < r.z1)) { const w = cobweb(1.1, 0.45); w.position.set(p.x + 0.75, r.h - 0.02, p.z + 0.75); w.rotation.y = Math.PI * 0.75; this.group.add(w); }
    this.runeLight = this.pool.sources.find((s) => s.group === 'crypt' && Math.abs(s.pos.x - bx) < 0.1 && Math.abs(s.pos.z - bz) < 0.1 && s.pos.y < 1) ?? null;
  }

  // ------------------------------------------------------------------ small helpers
  private candleFlames(parent: THREE.Object3D, offs: readonly (readonly [number, number, number])[]) { for (const [x, y, z] of offs) this.flames.add(parent, new THREE.Vector3(x, y, z), 0.075, new THREE.Color(2.4, 1.5, 0.6), 1.9); }
  private placeCoffin(x: number, z: number, yaw: number, open: boolean) {
    const { body, lid } = coffin(this.planks); const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.add(body);
    if (open) { lid.position.set(0.55, 0.62, -0.1); lid.rotation.set(0, 0.15, -1.25); g.add(lid); } else g.add(lid);
    this.group.add(g); this.colliderMeshes.push(g);
  }
  private hangChain(x: number, y: number, z: number, len: number) { const c = chain(len, 0.1); c.position.set(x, y, z); this.group.add(c); this.chains.push(c); }
  private shaft(x: number, y: number, z: number, len: number) {
    const s = lightShaft(new THREE.Vector3(x, y, z), len, 0.28, 1.5, new THREE.Color(0.5, 0.7, 0.95), 0.16); this.group.add(s);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 3.2, 4.0), toneMapped: false })); crack.position.set(x, y - 0.03, z); crack.rotation.y = this.rnd.range(0, 3); this.group.add(crack);
  }

  // ------------------------------------------------------------------ public API
  /** Swing the exit door open (boss defeated). The lead removes the 'cryptDoor' collider. */
  openCryptExit() {
    if (this.exitOpen || !this.exitDoor) return; this.exitOpen = true; const d = this.exitDoor;
    this.tweens.push({ t: 0, dur: 1.4, fn: (k) => { d.rotation.y = -easeOut(k) * 1.9; } });
  }
  update(dt: number, camPos: THREE.Vector3) {
    this.time += dt; const t = this.time;
    this.pool.update(dt, camPos); this.flames.update(t);
    for (let i = this.tweens.length - 1; i >= 0; i--) { const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) this.tweens.splice(i, 1); }
    for (const [i, c] of this.chains.entries()) { c.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.035; c.rotation.x = Math.sin(t * 0.7 + i) * 0.03; }
    if (this.rune) { const m = this.rune.material as THREE.MeshBasicMaterial; m.opacity = 0.75 + 0.25 * Math.sin(t * 1.3); this.rune.rotation.z = t * 0.03; }
    if (this.runeLight) this.runeLight.intensity = 5 + 2 * Math.sin(t * 1.3);
  }
}
