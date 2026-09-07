import { PLACES } from '../core/places.ts';
import { SeededRng } from '../core/rng.ts';
import { timeFromMinute } from '../core/time.ts';
import type { ConversationTurn, Emote, ItemStack, Memory, ObjectId, ObjectKind, Place, PlaceId, PlaceKind, PlayerState, PlotState, Relationship, Request, Season, SimView, TileKind, Vec, Villager, VillagerId, WeatherKind, WeatherState, World, WorldObject, WorldTime } from '../core/types.ts';
import { PLAYER_LOOK, VILLAGERS } from '../core/villagers.ts';
import type { TileInfo, WorldExt } from './common.ts';

/**
 * A hand-made demo village implementing `World` + `SimView`, for the render preview and for judging
 * the look without the real world generator. Buildings encode wall style / roof colour in the tile
 * variant (style = variant & 3), and `describeTile` reports placeId for roofs.
 */

export interface FakeOptions { hour?: number; season?: Season; weather?: WeatherKind; intensity?: number; seed?: number }

const W = 84, H = 64;

export class FakeWorld implements WorldExt {
  readonly seed: number;
  readonly width = W;
  readonly height = H;
  readonly places: Place[] = [];
  readonly objects: WorldObject[] = [];
  time: WorldTime;
  weather: WeatherState;
  speed = 1;
  paused = false;
  season: Season;
  private tiles: TileKind[] = new Array(W * H).fill('grass');
  private variants = new Uint8Array(W * H);
  private placeOf: (string | undefined)[] = new Array(W * H).fill(undefined);
  private walk: Uint8Array = new Uint8Array(W * H);
  private plots = new Map<ObjectId, PlotState>();
  private minute: number;
  private rng: SeededRng;

  constructor(opts: FakeOptions = {}) {
    this.seed = opts.seed ?? 7;
    this.rng = new SeededRng(this.seed);
    const season = opts.season ?? 'spring';
    const seasonIndex = ['spring', 'summer', 'autumn', 'winter'].indexOf(season);
    const hour = opts.hour ?? 12;
    this.minute = seasonIndex * 28 * 1440 + 4 * 1440 + hour * 60;
    this.time = timeFromMinute(this.minute);
    this.season = this.time.season;
    this.weather = { kind: opts.weather ?? 'sunny', intensity: opts.intensity ?? 0.7, forecast: 'sunny', temperature: 18 };
    this.build();
  }

  /* ------------------------------------------------------------ building the map */
  private idx(x: number, y: number): number { return y * W + x; }
  private set(x: number, y: number, k: TileKind, v = 0): void { if (x < 0 || y < 0 || x >= W || y >= H) return; this.tiles[this.idx(x, y)] = k; this.variants[this.idx(x, y)] = v; }
  private fill(x0: number, y0: number, w: number, h: number, k: TileKind, v = 0): void { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, k, v); }
  private blob(cx: number, cy: number, rx: number, ry: number, k: TileKind, wobble = 0.15): void {
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      const n = 1 + (Math.sin(x * 1.7 + y * 0.9) + Math.cos(y * 1.3 - x * 0.6)) * wobble;
      if (dx * dx + dy * dy <= n) this.set(x, y, k);
    }
  }
  private obj(kind: ObjectKind, x: number, y: number, data: Record<string, unknown> = {}, place?: PlaceId): WorldObject {
    const o: WorldObject = { id: `${kind}_${this.objects.length}`, kind, pos: { x, y }, data, place };
    this.objects.push(o);
    return o;
  }
  private building(id: PlaceId, name: string, kind: PlaceKind, x: number, y: number, w: number, h: number, style: number, roofRows = 2, owner?: VillagerId): Place {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const isRoof = j < roofRows;
      this.set(x + i, y + j, isRoof ? 'roof' : 'wall', style);
      this.placeOf[this.idx(x + i, y + j)] = id;
    }
    const door = { x: x + Math.floor(w / 2), y: y + h - 1 };
    this.set(door.x, door.y, 'door', style);
    const tiles: Vec[] = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) tiles.push({ x: x + i, y: y + j });
    const p: Place = { id, name, kind, tiles, anchor: { x: door.x, y: door.y + 1 }, door, interior: { x: door.x, y: door.y - 1 }, owner, open: [8, 18], facilities: [] };
    this.places.push(p);
    return p;
  }
  private area(id: PlaceId, name: string, kind: PlaceKind, x: number, y: number, w: number, h: number): Place {
    const tiles: Vec[] = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { tiles.push({ x: x + i, y: y + j }); if (!this.placeOf[this.idx(x + i, y + j)]) this.placeOf[this.idx(x + i, y + j)] = id; }
    const p: Place = { id, name, kind, tiles, anchor: { x: x + Math.floor(w / 2), y: y + Math.floor(h / 2) }, facilities: [] };
    this.places.push(p);
    return p;
  }
  private road(x0: number, y0: number, x1: number, y1: number, k: TileKind = 'path'): void {
    const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
    let x = x0, y = y0;
    for (;;) {
      this.set(x, y, k);
      if (dx && dy) this.set(x + dx, y, k);
      if (x === x1 && y === y1) break;
      if (x !== x1) x += dx; if (y !== y1) y += dy;
    }
  }

  private build(): void {
    const r = this.rng;
    // river down the east side with a bend, and a lake in the south-west
    for (let y = 0; y < H; y++) {
      const cx = 60 + Math.round(Math.sin(y * 0.11) * 4 + Math.sin(y * 0.31) * 1.5);
      for (let x = cx - 2; x <= cx + 2; x++) this.set(x, y, Math.abs(x - cx) <= 0 ? 'deepwater' : 'water');
    }
    this.blob(16, 44, 8, 5, 'water');
    this.blob(16, 44, 3, 2, 'deepwater');
    for (let y = 37; y <= 51; y++) for (let x = 6; x <= 27; x++) if (this.tiles[this.idx(x, y)] === 'grass') {
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.tiles[this.idx(x + dx, y + dy)] === 'water');
      if (near && x > 14 && y > 44) this.set(x, y, 'sand');
    }
    // roads
    this.road(2, 28, 78, 28);
    this.road(34, 4, 34, 60);
    this.road(34, 28, 62, 14);
    this.road(12, 28, 12, 50);
    this.road(34, 46, 66, 46);
    this.road(20, 12, 34, 12);
    // bridges over the river on the main road and the south road
    for (let y = 0; y < H; y++) for (let x = 56; x <= 66; x++) if ((y === 28 || y === 46) && (this.tiles[this.idx(x, y)] === 'water' || this.tiles[this.idx(x, y)] === 'deepwater')) this.set(x, y, 'bridge');
    // village square: cobbles, well, board, benches, lanterns
    this.fill(28, 22, 13, 12, 'stone');
    this.area(PLACES.square, 'Village Square', 'public', 28, 22, 13, 12);
    this.obj('well', 34, 27, {}, PLACES.well);
    this.obj('board', 30, 24, {}, PLACES.board);
    this.obj('bench', 31, 31); this.obj('bench', 37, 31);
    this.obj('lantern', 29, 23); this.obj('lantern', 39, 23); this.obj('lantern', 29, 32); this.obj('lantern', 39, 32);
    this.obj('flowerbed', 30, 30, { colour: 'red' }); this.obj('flowerbed', 38, 30, { colour: 'blue' });
    this.obj('sign', 35, 30, { dir: 'right' });
    // buildings (style = wall style / roof colour index)
    this.building(PLACES.bakery, 'Bakery', 'shop', 22, 17, 5, 4, 0, 2, 'cerys');
    this.obj('decoration', 27, 20, { kind: 'awning' }); this.obj('barrel', 21, 20); this.obj('crate', 21, 19);
    this.building(PLACES.smithy, 'Smithy', 'workplace', 42, 17, 5, 4, 2, 2, 'bram');
    this.obj('decoration', 47, 20, { kind: 'anvil' }); this.obj('barrel', 41, 20, { variant: 1 }); this.obj('decoration', 47, 19, { kind: 'crates' });
    this.building(PLACES.store, 'General Store', 'shop', 22, 35, 6, 4, 1, 2, 'hal');
    this.obj('decoration', 28, 38, { kind: 'awningGreen' }); this.obj('crate', 21, 37); this.obj('crate', 21, 38, { variant: 1 }); this.obj('decoration', 21, 36, { kind: 'sacks' });
    this.building(PLACES.tavern, 'The Drowsy Owl', 'shop', 42, 35, 7, 5, 3, 3, 'finn');
    this.obj('lantern', 41, 39); this.obj('barrel', 49, 38); this.obj('barrel', 49, 39, { variant: 1 }); this.obj('bench', 44, 40);
    this.building(PLACES.clinic, 'Clinic', 'workplace', 14, 8, 5, 4, 0, 2, 'elin');
    this.obj('flowerbed', 13, 11, { colour: 'white' }); this.obj('flowerbed', 19, 11, { colour: 'white' });
    this.building(PLACES.library, 'Library', 'public', 44, 6, 6, 5, 2, 3, 'ines');
    this.obj('decoration', 43, 10, { kind: 'hedge' }); this.obj('decoration', 50, 10, { kind: 'hedge' });
    this.building(PLACES.carpenter, "Carpenter's Yard", 'workplace', 44, 48, 5, 4, 1, 2, 'jory');
    this.obj('decoration', 49, 50, { kind: 'logs' }); this.obj('decoration', 49, 51, { kind: 'logAxe' }); this.obj('stump', 43, 51);
    this.building(PLACES.chapel, 'Chapel', 'landmark', 26, 4, 5, 5, 2, 3);
    this.obj('shrine', 28, 10);
    // homes
    const homes: [PlaceId, string, number, number, number, VillagerId][] = [
      [PLACES.home_ada, "Ada's House", 68, 32, 0, 'ada'], [PLACES.home_bram, "Bram's House", 48, 22, 2, 'bram'], [PLACES.home_cerys, "Cerys' House", 16, 20, 3, 'cerys'],
      [PLACES.home_dov, "Dov's Hut", 8, 34, 1, 'dov'], [PLACES.home_elin, "Elin's House", 8, 14, 0, 'elin'], [PLACES.home_finn, "Finn's House", 50, 40, 3, 'finn'],
      [PLACES.home_greta, "Greta's House", 70, 52, 2, 'greta'], [PLACES.home_hal, "Hal's House", 16, 34, 1, 'hal'], [PLACES.home_ines, "Ines' House", 52, 4, 0, 'ines'],
      [PLACES.home_jory, "Jory's House", 38, 52, 1, 'jory'], [PLACES.home_player, 'Your Cottage', 26, 52, 0, 'player'],
    ];
    for (const [id, name, x, y, style, owner] of homes) {
      this.building(id, name, 'home', x, y, 4, 4, style, 2, owner);
      if (r.chance(0.6)) this.obj('flowerbed', x - 1, y + 3, { colour: r.pick(['red', 'white', 'blue']) });
      if (r.chance(0.5)) this.obj('lantern', x + 4, y + 3);
      if (r.chance(0.4)) this.obj('decoration', x + 4, y + 2, { kind: 'bush', variant: 'small' });
    }
    // farm: fenced field of plots, barn, animals
    const farm = this.area(PLACES.farm, 'Thornfield Farm', 'farm', 64, 34, 14, 10);
    void farm;
    this.fill(66, 36, 8, 4, 'farmland');
    const crops = ['turnip', 'potato', 'strawberry', 'corn', 'tomato', 'wheat', 'sunflower', 'pumpkin', 'cabbage'];
    let pi = 0;
    for (let y = 36; y < 40; y++) for (let x = 66; x < 74; x++) {
      const crop = crops[pi % crops.length];
      const stages = { turnip: 4, potato: 5, strawberry: 5, corn: 5, tomato: 5, wheat: 4, sunflower: 4, pumpkin: 5, cabbage: 4 }[crop] ?? 4;
      const stage = pi % stages;
      const state: PlotState = pi % 7 === 6 ? { state: 'tilled', growth: 0, watered: pi % 2 === 0, daysSincePlant: 0, stage: 0 } : { state: 'planted', crop, growth: stage / (stages - 1), watered: pi % 3 !== 0, daysSincePlant: stage, stage };
      const o = this.obj('plot', x, y, state as unknown as Record<string, unknown>, PLACES.farm);
      this.plots.set(o.id, state);
      pi++;
    }
    for (let x = 65; x <= 74; x++) { this.set(x, 35, 'fence'); this.set(x, 40, 'fence'); }
    for (let y = 35; y <= 40; y++) { this.set(65, y, 'fence'); this.set(74, y, 'fence'); }
    this.set(69, 40, 'path');
    this.building(PLACES.barn, 'Barn', 'farm', 70, 41, 5, 3, 1, 1, 'ada');
    this.obj('animal', 66, 42, { kind: 'cow', name: 'Buttercup' }); this.obj('animal', 68, 43, { kind: 'cow', name: 'Clover', facing: 'left' });
    this.obj('animal', 76, 36, { kind: 'sheep' }); this.obj('animal', 77, 38, { kind: 'sheep', facing: 'left' });
    this.obj('animal', 75, 42, { kind: 'hen' }); this.obj('animal', 76, 43, { kind: 'hen', facing: 'left' }); this.obj('animal', 77, 41, { kind: 'hen' });
    this.obj('decoration', 76, 44, { kind: 'hay' }); this.obj('decoration', 65, 44, { kind: 'hay' });
    // orchard + hives
    this.area(PLACES.orchard, 'Orchard', 'nature', 66, 18, 10, 6);
    for (let y = 18; y < 24; y += 2) for (let x = 66; x < 76; x += 2) this.obj('tree', x, y, { kind: (x + y) % 4 === 0 ? 'appleFull' : 'apple' }, PLACES.orchard);
    // forest in the north-west, with forage and a campfire clearing
    this.area(PLACES.forest, 'Old Forest', 'nature', 1, 1, 12, 12);
    for (let y = 1; y < 12; y++) for (let x = 1; x < 12; x++) if (r.chance(0.55) && !(x > 4 && x < 8 && y > 4 && y < 8)) this.obj('tree', x, y, { kind: r.pick(['oak', 'pine', 'dark', 'oak', 'pine']) }, PLACES.forest);
    this.obj('campfire', 6, 6, { lit: true }); this.obj('stump', 5, 7); this.obj('decoration', 7, 5, { kind: 'tent' });
    for (let i = 0; i < 8; i++) this.obj('forage', 2 + r.int(0, 10), 12 + r.int(0, 4), { item: r.pick(['berries', 'mushroom', 'herbs', 'wildflower']), variant: r.int(0, 3) });
    // scattered trees and bushes everywhere else
    for (let i = 0; i < 160; i++) {
      const x = r.int(1, W - 2), y = r.int(1, H - 2);
      if (this.tiles[this.idx(x, y)] !== 'grass' || this.placeOf[this.idx(x, y)]) continue;
      if (this.objects.some((o) => Math.abs(o.pos.x - x) < 2 && Math.abs(o.pos.y - y) < 2)) continue;
      if (r.chance(0.7)) this.obj('tree', x, y, { kind: r.pick(['oak', 'oak', 'pine', 'dark']) });
      else this.obj('decoration', x, y, { kind: 'bush', variant: r.pick(['green', 'dark', 'small', 'berries']) });
    }
    // meadow flowers
    this.area(PLACES.meadow, 'Meadow', 'nature', 2, 54, 20, 8);
    for (let i = 0; i < 24; i++) this.set(2 + r.int(0, 19), 54 + r.int(0, 7), 'flower', r.int(0, 2));
    // graveyard
    this.area(PLACES.graveyard, 'Graveyard', 'landmark', 52, 54, 8, 6);
    for (let x = 52; x < 60; x++) { this.set(x, 54, 'fence'); this.set(x, 59, 'fence'); }
    for (let y = 54; y < 60; y++) { this.set(52, y, 'fence'); this.set(59, y, 'fence'); }
    this.set(55, 54, 'path');
    for (let y = 56; y < 59; y += 2) for (let x = 53; x < 59; x += 2) this.obj('decoration', x, y, { kind: 'grave', variant: r.int(0, 4) });
    this.obj('tree', 58, 57, { kind: 'dead' });
    // mine: stone ground with rocks in the south-east
    this.area(PLACES.mine, 'Mine', 'workplace', 70, 54, 12, 8);
    this.fill(70, 54, 12, 8, 'stone');
    for (let i = 0; i < 14; i++) this.obj('rock', 70 + r.int(0, 11), 55 + r.int(0, 6), { ore: r.pick(['stone', 'stone', 'copper', 'iron', 'gold', 'gem']), size: r.pick(['small', 'medium', 'big']) }, PLACES.mine);
    this.obj('decoration', 78, 54, { kind: 'cartOre' }); this.obj('lantern', 71, 58);
    // dock + fish spots
    this.area(PLACES.dock, 'Fish Dock', 'workplace', 10, 40, 6, 4);
    this.fill(10, 41, 5, 1, 'bridge');
    this.set(15, 42, 'bridge', 1); this.set(15, 43, 'bridge', 1);
    this.obj('decoration', 9, 41, { kind: 'boat' }); this.obj('barrel', 10, 40); this.obj('crate', 11, 40);
    this.obj('fishspot', 15, 42, { lily: true }); this.obj('fishspot', 20, 45); this.obj('fishspot', 12, 47, { lily: true });
    this.obj('fishspot', 59, 20); this.obj('fishspot', 61, 36);
    this.obj('decoration', 18, 41, { kind: 'lilypad' }); this.obj('decoration', 21, 43, { kind: 'lily' }); this.obj('decoration', 14, 46, { kind: 'waterrock', variant: 1 });
    // festival grounds
    this.area(PLACES.festival_grounds, 'Festival Grounds', 'public', 36, 4, 7, 6);
    this.obj('decoration', 38, 6, { kind: 'tentBeige' }); this.obj('decoration', 41, 8, { kind: 'banner' }); this.obj('campfire', 38, 9, { lit: true });
    // walkability
    for (let i = 0; i < W * H; i++) {
      const k = this.tiles[i];
      this.walk[i] = k === 'water' || k === 'deepwater' || k === 'wall' || k === 'roof' || k === 'tree' || k === 'rock' || k === 'fence' || k === 'void' ? 0 : 1;
    }
    for (const o of this.objects) if (o.kind === 'tree' || o.kind === 'rock' || o.kind === 'well' || o.kind === 'board' || o.kind === 'shrine') this.walk[this.idx(o.pos.x, o.pos.y)] = 0;
    for (const p of this.places) if (p.door) this.walk[this.idx(p.door.x, p.door.y)] = 1;
    this.area(PLACES.river, 'River', 'nature', 56, 0, 10, H);
    this.area(PLACES.lake, 'Lake', 'nature', 8, 38, 16, 12);
  }

  /* ------------------------------------------------------------ World */
  tile(x: number, y: number): TileKind { return x < 0 || y < 0 || x >= W || y >= H ? 'void' : this.tiles[this.idx(x, y)]; }
  tileVariant(x: number, y: number): number { return x < 0 || y < 0 || x >= W || y >= H ? 0 : this.variants[this.idx(x, y)]; }
  describeTile(x: number, y: number): TileInfo | undefined {
    if (x < 0 || y < 0 || x >= W || y >= H) return undefined;
    const kind = this.tiles[this.idx(x, y)];
    const v = this.variants[this.idx(x, y)];
    return { kind, variant: v, style: v & 3, colour: v & 3, placeId: this.placeOf[this.idx(x, y)] };
  }
  walkable(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < W && y < H && this.walk[this.idx(x, y)] === 1; }
  place(id: PlaceId): Place | undefined { return this.places.find((p) => p.id === id); }
  placeAt(pos: Vec): Place | undefined { const id = this.placeOf[this.idx(Math.floor(pos.x), Math.floor(pos.y))]; return id ? this.place(id) : undefined; }
  placesOfKind(kind: PlaceKind): Place[] { return this.places.filter((p) => p.kind === kind); }
  object(id: ObjectId): WorldObject | undefined { return this.objects.find((o) => o.id === id); }
  objectsNear(pos: Vec, radius: number, kind?: ObjectKind): WorldObject[] { return this.objects.filter((o) => (!kind || o.kind === kind) && Math.hypot(o.pos.x - pos.x, o.pos.y - pos.y) <= radius); }
  objectsAt(place: PlaceId, kind?: ObjectKind): WorldObject[] { return this.objects.filter((o) => o.place === place && (!kind || o.kind === kind)); }
  findPath(from: Vec, to: Vec): Vec[] | null {
    // simple BFS, good enough for the preview walkers
    const start = { x: Math.floor(from.x), y: Math.floor(from.y) }, goal = { x: Math.floor(to.x), y: Math.floor(to.y) };
    const prev = new Map<number, number>();
    const q: number[] = [this.idx(start.x, start.y)];
    prev.set(q[0], -1);
    while (q.length) {
      const cur = q.shift()!;
      if (cur === this.idx(goal.x, goal.y)) break;
      const cx = cur % W, cy = Math.floor(cur / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.walkable(nx, ny)) continue;
        const ni = this.idx(nx, ny);
        if (prev.has(ni)) continue;
        prev.set(ni, cur); q.push(ni);
      }
      if (prev.size > 20000) return null;
    }
    const gi = this.idx(goal.x, goal.y);
    if (!prev.has(gi)) return null;
    const path: Vec[] = [];
    for (let i = gi; i !== -1; i = prev.get(i)!) path.push({ x: i % W, y: Math.floor(i / W) });
    return path.reverse();
  }
  nearestWalkable(pos: Vec, radius = 4): Vec {
    for (let r = 0; r <= radius; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(pos.x) + dx, y = Math.floor(pos.y) + dy; if (this.walkable(x, y)) return { x, y }; }
    return pos;
  }
  tick(minutes: number): void { this.minute += minutes; this.time = timeFromMinute(this.minute); this.season = this.time.season; }
  festivalToday(): { id: string; name: string; hour: number } | null { return null; }
  plot(objId: ObjectId): PlotState | undefined { return this.plots.get(objId); }
  setPlot(objId: ObjectId, state: PlotState): void { this.plots.set(objId, state); const o = this.object(objId); if (o) o.data = state as unknown as Record<string, unknown>; }
  save(): unknown { return { minute: this.minute }; }
  load(): void { /* preview only */ }
}

/* ------------------------------------------------------------------ fake sim */

interface WalkerState { path: Vec[]; i: number; t: number; wait: number; lines: string[] }

const LINES: Record<string, string[]> = {
  ada: ['Turnips are in. Come by the farm.', 'Rain tomorrow, mark my words.', 'Bram, the hoe blade is loose again.'],
  bram: ['Hm.', 'Anvil rings true today.', 'Need more iron. Greta?'],
  cerys: ['Fresh sweet rolls! Still warm!', 'Did you hear about Jory and the fence?!', 'Oh! You must taste this.'],
  dov: ['River is quiet.', 'Caught a perch. Let it go.', 'Storm on the wind.'],
  elin: ['Please, get some rest.', 'I worry about Finn\'s liver.', 'Have you been drinking water?'],
  finn: ['First round is on the house!', 'Ha! You should have seen it!', 'Sing with me, friends!'],
  greta: ['Touch wood. Found gold. Touch wood.', 'The deep shaft creaks at night.', 'Race you to the mine!'],
  hal: ['Everything on the ledger. Everything.', 'Finn still owes me forty coins.', 'Lovely day for commerce.'],
  ines: ['There\'s a chapter on the old bridge...', 'The stars were bright last night.', 'Oh — sorry, I was reading.'],
  jory: ['Nap first, fence later.', 'Whittled you a little bird.', 'Cerys laughed at my joke!'],
};
const EMOTES: Emote[] = ['happy', 'sad', 'angry', 'love', 'question', 'idea', 'sleepy', 'music', 'sweat', 'exclaim', 'sick'];

export class FakeSim implements SimView {
  world: World;
  villagers: Villager[] = [];
  player: PlayerState;
  requests: Request[] = [];
  events = [];
  conversations = [];
  chronicle: SimView['chronicle'] = [];
  rng: SeededRng;
  private walkers = new Map<VillagerId, WalkerState>();
  private clock = 0;
  /** in-game minutes per real second */
  speed = 1;
  /** villagers walk their loops (false freezes them for screenshots) */
  walk = true;

  constructor(world: World, opts: { talk?: boolean; walk?: boolean } = {}) {
    this.world = world;
    this.walk = opts.walk !== false;
    this.rng = new SeededRng(world.seed + 99);
    const sq = world.place(PLACES.square)?.anchor ?? { x: 34, y: 30 };
    const player: PlayerState = { pos: { ...world.nearestWalkable(sq) }, facing: 'down', money: 100, inventory: [], skills: { farming: 1, fishing: 1, mining: 1, cooking: 1, crafting: 1, charm: 1, lore: 1, medicine: 1 }, energy: 100, name: 'You', hotbar: 0 };
    this.player = player;
    for (const spec of VILLAGERS) {
      const home = world.place(spec.home), work = world.place(spec.workplace);
      const start = home?.anchor ?? { x: 34, y: 30 };
      const v: Villager = {
        id: spec.id, name: spec.name, profession: spec.profession, home: spec.home, workplace: spec.workplace,
        pos: { ...world.nearestWalkable(start) }, facing: 'down', needs: { energy: 80, hunger: 70, social: 60, fun: 50, comfort: 70, purpose: 60 }, mood: 0.2, money: spec.money,
        inventory: spec.inventory.map(([id, qty]): ItemStack => ({ id, qty })), skills: { farming: 0, fishing: 0, mining: 0, cooking: 0, crafting: 0, charm: 0, lore: 0, medicine: 0, ...spec.skills },
        health: 100, personality: spec.personality, relationships: {}, memory: [], goals: [], plan: null,
        action: { tool: 'stroll', args: {}, startedAt: 0, endsAt: 0, label: 'strolling', thought: 'Nice day for a walk.', progress: 0 }, queue: [], status: [],
        look: spec.look, brain: 'local', birthday: spec.birthday, stats: {},
      };
      this.villagers.push(v);
      const targets = [work?.anchor, world.place(PLACES.square)?.anchor, home?.anchor, work?.anchor].filter((t): t is Vec => !!t);
      this.walkers.set(v.id, { path: [], i: 0, t: 0, wait: this.rng.range(0, 2), lines: LINES[v.id] ?? ['...'] });
      const ws = this.walkers.get(v.id)!;
      ws.path = this.loop(v.pos, targets);
    }
    if (opts.talk !== false) {
      // a few start out talking / emoting so screenshots show bubbles
      const now = world.time.minute;
      this.villagers[2].speech = { text: LINES.cerys[0], until: now + 3 };
      this.villagers[5].speech = { text: LINES.finn[0], until: now + 3 };
      this.villagers[5].emote = { kind: 'music', until: now + 3 };
      this.villagers[8].emote = { kind: 'idea', until: now + 3 };
      this.villagers[6].emote = { kind: 'exclaim', until: now + 3 };
    }
  }

  private loop(from: Vec, targets: Vec[]): Vec[] {
    const path: Vec[] = [];
    let cur = from;
    for (const t of targets) {
      const seg = this.world.findPath(cur, this.world.nearestWalkable(t));
      if (seg) { path.push(...seg); cur = seg[seg.length - 1]; }
    }
    const back = this.world.findPath(cur, from);
    if (back) path.push(...back);
    return path.length ? path : [from];
  }

  /** advance the preview: villagers walk their loops, chat and emote */
  update(dtSec: number): void {
    this.clock += dtSec;
    this.world.tick(dtSec * this.speed);
    const now = this.world.time.minute;
    if (!this.walk) return;
    for (const v of this.villagers) {
      const ws = this.walkers.get(v.id)!;
      if (ws.wait > 0) { ws.wait -= dtSec; if (ws.wait <= 0 && this.rng.chance(0.5)) { v.speech = { text: this.rng.pick(ws.lines), until: now + 2.5 }; v.emote = this.rng.chance(0.5) ? { kind: this.rng.pick(EMOTES), until: now + 2 } : undefined; } continue; }
      ws.t += dtSec * 3.2;
      while (ws.t >= 1) { ws.t -= 1; ws.i++; if (ws.i >= ws.path.length - 1) { ws.i = 0; ws.wait = this.rng.range(1.5, 4); } }
      const a = ws.path[ws.i], b = ws.path[Math.min(ws.i + 1, ws.path.length - 1)];
      v.pos.x = a.x + (b.x - a.x) * ws.t; v.pos.y = a.y + (b.y - a.y) * ws.t;
      if (b.x !== a.x) v.facing = b.x > a.x ? 'right' : 'left'; else if (b.y !== a.y) v.facing = b.y > a.y ? 'down' : 'up';
      if (v.action) v.action.label = ws.wait > 0 ? 'chatting' : `walking to ${v.workplace}`;
    }
  }

  villager(id: VillagerId): Villager | undefined { return this.villagers.find((v) => v.id === id); }
  villagersNear(pos: Vec, radius: number): Villager[] { return this.villagers.filter((v) => Math.hypot(v.pos.x - pos.x, v.pos.y - pos.y) <= radius); }
  give(): void { /* preview */ }
  take(): boolean { return false; }
  has(): boolean { return false; }
  remember(_v: Villager, m: Omit<Memory, 'id' | 't'>): Memory { return { id: 'm', t: 0, ...m }; }
  adjustRelationship(): void { /* preview */ }
  say(v: Villager, text: string, to?: VillagerId | 'player', tone?: ConversationTurn['tone']): void { void tone; v.speech = { text, until: this.world.time.minute + 3, to }; }
  emote(v: Villager, kind: Emote): void { v.emote = { kind, until: this.world.time.minute + 2 }; }
  startConversation(): null { return null; }
  postRequest(by: VillagerId | 'player', text: string, reward: Request['reward'], needs: ItemStack[]): Request { return { id: 'r', by, text, reward, needs, postedAt: 0, expiresAt: 0 }; }
  shopStock(): ItemStack[] { return []; }
  priceOf(): number { return 1; }
  interrupt(): void { /* preview */ }
  log(): void { /* preview */ }
  relationshipOf(): Relationship | null { return null; }
}

export const PLAYER_PREVIEW_LOOK = PLAYER_LOOK;
