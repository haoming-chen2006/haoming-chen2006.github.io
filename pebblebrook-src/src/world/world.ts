import { bus as globalBus, type Bus } from '../core/bus.ts';
import { CROP_BY_ID } from '../core/items.ts';
import { SeededRng } from '../core/rng.ts';
import type { ItemId, ObjectId, ObjectKind, Place, PlaceId, PlaceKind, PlotState, Season, TileKind, Vec, WeatherKind, WeatherState, World, WorldObject, WorldTime } from '../core/types.ts';
import { Clock, FESTIVALS, isWet } from './clock.ts';
import { Grid, KINDS } from './grid.ts';
import { buildLayout, MAP_H, MAP_W, type Building } from './layout.ts';
import { nearestWalkableOn, Pathfinder, walkableNeighboursOf } from './path.ts';
import { FORAGE, type ForageArea } from './tables.ts';

/** What `describeTile` returns: everything the renderer needs without decoding variant bits. */
export interface TileInfo {
  kind: TileKind;
  variant: number;
  /** building style 0..3 for wall/door tiles, roof colour 0..3 for roof tiles, otherwise 0 */
  style: number;
  /** true for the bottom (eave) row of a roof */
  roofEdge: boolean;
  /** true for the top (ridge) row of a roof */
  roofRidge: boolean;
  /** left/right end of a wall or roof row */
  edgeLeft: boolean;
  edgeRight: boolean;
  /** a wall tile that should show a window */
  window: boolean;
  /** the interior anchor of a building (hidden villagers stand here) */
  interior: boolean;
  placeId: PlaceId | undefined;
}

/** Extra API beyond core's `World`, for modules that want the richer helpers. */
export interface WorldExtras {
  describeTile(x: number, y: number): TileInfo;
  walkableNeighbours(pos: Vec): Vec[];
  /** the building's interior tile is walkable only for whoever is "inside": true when (x, y) is one */
  isInterior(x: number, y: number): boolean;
  /** plant a seed/crop id in a tilled or empty plot; returns false if the crop is unknown or out of season */
  plant(objId: ObjectId, cropOrSeed: ItemId, owner?: PlotState['owner']): boolean;
  water(objId: ObjectId): boolean;
  /** till an empty plot, or clear a withered one back to tilled soil */
  till(objId: ObjectId): boolean;
  /** reset a plot to bare earth */
  clear(objId: ObjectId): boolean;
  /** harvest a grown plot: returns the yield, or null when not ready; regrowing crops stay planted */
  harvest(objId: ObjectId): { item: ItemId; qty: number } | null;
  /** true when the plot's crop is fully grown */
  harvestable(objId: ObjectId): boolean;
  /** chop one unit of wood from a tree (or apples from an apple tree via `pickFruit`) */
  chop(objId: ObjectId): { item: ItemId; qty: number } | null;
  pickFruit(objId: ObjectId): { item: ItemId; qty: number } | null;
  /** hit a rock; returns what came loose when it breaks, null otherwise */
  mine(objId: ObjectId): { item: ItemId; qty: number; broke: boolean } | null;
  /** gather a forage spot; returns null when it is empty today */
  gather(objId: ObjectId): { item: ItemId; qty: number } | null;
  /** force the weather for the rest of the day (or `hours`), for events */
  forceWeather(kind: WeatherKind, intensity?: number, hours?: number): void;
  /** the calendar: every festival with its season/day/hour */
  festivals(): { id: string; name: string; season: Season; day: number; hour: number; place: PlaceId }[];
  /** true when it has rained or snowed at any point today */
  rainedToday(): boolean;
  /** buildings by id, with style/roof/door/interior, for renderers and UI */
  building(id: PlaceId): Building | undefined;
  /** the grid, read-only, for renderers that want bulk access */
  readonly grid: Grid;
  /** the seeded RNG for the world's own daily rolls (forage, weather is separate); the sim has its own */
  readonly rng: SeededRng;
}

export type PebbleWorld = World & WorldExtras;

interface SavedWorld {
  v: 1;
  seed: number;
  clock: ReturnType<Clock['save']>;
  rng: number;
  objects: Record<ObjectId, Record<string, unknown>>;
}

const MUTABLE_KINDS: ObjectKind[] = ['plot', 'tree', 'rock', 'forage', 'animal', 'campfire', 'lantern', 'shrine'];
const CELL = 8;

export function createWorld(seed: number, opts: { bus?: Bus } = {}): PebbleWorld {
  const bus = opts.bus ?? globalBus;
  const rootRng = new SeededRng(seed);
  const genRng = rootRng.fork(1);
  const dailyRng = rootRng.fork(2);
  const grid = new Grid(MAP_W, MAP_H);
  const clock = new Clock(seed, bus);
  const layout = buildLayout(grid, genRng, clock.time.season);
  const places = layout.places;
  const objects = layout.objects;
  const placeById = new Map<PlaceId, Place>(places.map((p) => [p.id, p]));
  const objectById = new Map<ObjectId, WorldObject>(objects.map((o) => [o.id, o]));
  const objectsByPlace = new Map<PlaceId, WorldObject[]>();
  for (const o of objects) if (o.place) { let l = objectsByPlace.get(o.place); if (!l) objectsByPlace.set(o.place, (l = [])); l.push(o); }
  // spatial buckets for objectsNear
  const cellsX = Math.ceil(MAP_W / CELL), cellsY = Math.ceil(MAP_H / CELL);
  const buckets: WorldObject[][] = Array.from({ length: cellsX * cellsY }, () => []);
  for (const o of objects) buckets[Math.floor(o.pos.y / CELL) * cellsX + Math.floor(o.pos.x / CELL)].push(o);
  const pathfinder = new Pathfinder(grid);
  const squareAnchor = placeById.get('square')!.anchor;

  /* ---------------------------------------------------------- plots */
  type PlotData = PlotState & { withered?: boolean; regrowIn?: number; grown?: number } & Record<string, unknown>;
  const plotOf = (id: ObjectId): (WorldObject & { data: PlotData }) | undefined => {
    const o = objectById.get(id);
    return o && o.kind === 'plot' ? (o as WorldObject & { data: PlotData }) : undefined;
  };
  const syncPlotTile = (o: WorldObject): void => {
    const d = o.data as unknown as PlotState;
    grid.setVariant(o.pos.x, o.pos.y, d.state === 'empty' ? 0 : d.watered ? 2 : 1);
  };
  const cropDef = (cropOrSeed: ItemId) => CROP_BY_ID[cropOrSeed] ?? Object.values(CROP_BY_ID).find((c) => c.seed === cropOrSeed);

  const growPlots = (rainedYesterday: boolean, season: Season): void => {
    for (const o of objects) {
      if (o.kind !== 'plot') continue;
      const d = o.data as unknown as PlotState & { withered?: boolean; regrowIn?: number; grown?: number };
      if (d.state === 'planted' && d.crop) {
        const def = CROP_BY_ID[d.crop];
        if (!def) continue;
        d.daysSincePlant += 1;
        if (!def.seasons.includes(season)) { d.withered = true; }
        else if (!d.withered && (d.watered || rainedYesterday)) {
          d.grown = (d.grown ?? 0) + 1;
          if (d.regrowIn !== undefined && d.regrowIn > 0) { d.regrowIn -= 1; if (d.regrowIn === 0) d.growth = 1; }
          else d.growth = Math.min(1, d.grown / def.days);
          d.stage = Math.min(def.stages - 1, Math.floor(d.growth * (def.stages - 1) + 1e-6));
        }
      }
      d.watered = isWet(clock.weather.kind);
      syncPlotTile(o);
    }
  };

  /* --------------------------------------------------------- nature */
  const spawnForage = (season: Season): void => {
    const table = FORAGE[season];
    for (const o of objects) {
      if (o.kind !== 'forage') continue;
      const area = (o.data.area as ForageArea) ?? 'forest';
      if (dailyRng.chance(table.chance)) {
        const items = table.items[area];
        let total = 0; for (const [, w] of items) total += w;
        let r = dailyRng.next() * total; let pick: ItemId = items[items.length - 1][0];
        for (const [it, w] of items) { r -= w; if (r <= 0) { pick = it; break; } }
        o.data.item = pick; o.data.qty = dailyRng.chance(0.25) ? 2 : 1;
      } else { o.data.item = null; o.data.qty = 0; }
    }
  };
  const regrowTrees = (season: Season): void => {
    for (const o of objects) {
      if (o.kind !== 'tree') continue;
      const d = o.data as { wood: number; maxWood: number; regrow: number; type: string; fruit?: number; maxFruit?: number };
      if (d.wood < d.maxWood) { d.regrow += 1; if (d.regrow >= 3) { d.wood += 1; d.regrow = 0; } }
      if (d.type === 'apple' && d.fruit !== undefined && (season === 'summer' || season === 'autumn') && d.fruit < (d.maxFruit ?? 3) && dailyRng.chance(0.5)) d.fruit += 1;
      if (d.type === 'apple' && season === 'winter') d.fruit = 0;
    }
  };
  const respawnRocks = (): void => {
    for (const o of objects) {
      if (o.kind !== 'rock' || !(o.data.depleted || (typeof o.data.hp === 'number' && o.data.hp <= 0))) continue;
      const r = dailyRng.next();
      const ore = r < 0.45 ? 'stone' : r < 0.75 ? 'copper_ore' : r < 0.93 ? 'iron_ore' : 'gold_ore';
      const hp = ore === 'stone' ? 2 : ore === 'gold_ore' ? 5 : dailyRng.int(3, 4);
      o.data.ore = ore; o.data.hp = hp; o.data.maxHp = hp; o.data.depleted = false;
      grid.setVariant(o.pos.x, o.pos.y, ({ stone: 0, copper_ore: 1, iron_ore: 2, gold_ore: 3 } as Record<string, number>)[ore]);
    }
  };
  const resetAnimals = (): void => { for (const o of objects) if (o.kind === 'animal') { o.data.fed = false; o.data.produced = false; } };

  clock.onNewDay = (_dayIndex, rainedYesterday) => {
    const season = clock.time.season;
    growPlots(rainedYesterday, season);
    spawnForage(season);
    regrowTrees(season);
    if (clock.time.weekday === 0) respawnRocks();
    resetAnimals();
  };
  // rain waters everything the moment it starts
  clock.onWeather = (w) => { if (isWet(w.kind)) for (const o of objects) if (o.kind === 'plot') { (o.data as unknown as PlotState).watered = true; syncPlotTile(o); } };

  spawnForage(clock.time.season);
  for (const o of objects) if (o.kind === 'plot') syncPlotTile(o);

  /* ---------------------------------------------------------- world */
  const world: PebbleWorld = {
    seed,
    width: MAP_W,
    height: MAP_H,
    places,
    objects,
    grid,
    rng: dailyRng,
    get time(): WorldTime { return clock.time; },
    get weather(): WeatherState { return clock.weather; },
    get speed(): number { return clock.speed; },
    set speed(v: number) { clock.speed = v; },
    get paused(): boolean { return clock.paused; },
    set paused(v: boolean) { clock.paused = v; },
    get season(): Season { return clock.time.season; },

    tile: (x, y) => grid.get(x, y),
    tileVariant: (x, y) => grid.getVariant(x, y),
    walkable: (x, y) => grid.walkable(x, y),
    isInterior: (x, y) => grid.inBounds(x, y) && grid.interior[grid.idx(x, y)] === 1,
    describeTile(x, y): TileInfo {
      const kind = grid.get(x, y), variant = grid.getVariant(x, y);
      const pi = grid.inBounds(x, y) ? grid.placeIdx[grid.idx(x, y)] : -1;
      const info: TileInfo = { kind, variant, style: 0, roofEdge: false, roofRidge: false, edgeLeft: false, edgeRight: false, window: false, interior: world.isInterior(x, y), placeId: pi >= 0 ? places[pi].id : undefined };
      if (kind === 'wall') { info.style = variant & 3; info.window = (variant & 4) !== 0; info.edgeLeft = (variant & 8) !== 0; info.edgeRight = (variant & 16) !== 0; }
      else if (kind === 'roof') { info.style = variant & 3; info.roofEdge = (variant & 4) !== 0; info.roofRidge = (variant & 8) !== 0; info.edgeLeft = (variant & 16) !== 0; info.edgeRight = (variant & 32) !== 0; }
      else if (kind === 'door') info.style = variant & 3;
      return info;
    },

    place: (id) => placeById.get(id),
    placeAt(pos) {
      const x = Math.round(pos.x), y = Math.round(pos.y);
      if (!grid.inBounds(x, y)) return undefined;
      const i = grid.placeIdx[grid.idx(x, y)];
      return i >= 0 ? places[i] : undefined;
    },
    placesOfKind: (kind: PlaceKind) => places.filter((p) => p.kind === kind),
    building: (id) => layout.buildings.get(id),

    object: (id) => objectById.get(id),
    objectsNear(pos, radius, kind) {
      const out: WorldObject[] = [];
      const r2 = radius * radius;
      const cx0 = Math.max(0, Math.floor((pos.x - radius) / CELL)), cx1 = Math.min(cellsX - 1, Math.floor((pos.x + radius) / CELL));
      const cy0 = Math.max(0, Math.floor((pos.y - radius) / CELL)), cy1 = Math.min(cellsY - 1, Math.floor((pos.y + radius) / CELL));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        for (const o of buckets[cy * cellsX + cx]) {
          if (kind && o.kind !== kind) continue;
          const dx = o.pos.x - pos.x, dy = o.pos.y - pos.y;
          if (dx * dx + dy * dy <= r2) out.push(o);
        }
      }
      out.sort((a, b) => (a.pos.x - pos.x) ** 2 + (a.pos.y - pos.y) ** 2 - ((b.pos.x - pos.x) ** 2 + (b.pos.y - pos.y) ** 2));
      return out;
    },
    objectsAt(place, kind) {
      const l = objectsByPlace.get(place) ?? [];
      return kind ? l.filter((o) => o.kind === kind) : l.slice();
    },

    findPath: (from, to, opts) => pathfinder.find(from, to, opts?.maxNodes ?? 6000),
    nearestWalkable: (pos, radius = 8) => nearestWalkableOn(grid, pos, radius, squareAnchor),
    walkableNeighbours: (pos) => walkableNeighboursOf(grid, pos),

    tick: (minutes) => clock.tick(minutes),
    festivalToday: () => clock.festivalToday(),
    festivals: () => FESTIVALS.map((f) => ({ id: f.id, name: f.name, season: f.season, day: f.day, hour: f.hour, place: f.place })),
    forceWeather: (kind, intensity, hours) => clock.forceWeather(kind, intensity, hours),
    rainedToday: () => clock.rainedToday,

    plot(objId) { const o = plotOf(objId); return o ? (o.data as unknown as PlotState) : undefined; },
    setPlot(objId, state) {
      const o = plotOf(objId);
      if (!o) return;
      const keep = o.data as Record<string, unknown>;
      for (const k of Object.keys(keep)) delete keep[k];
      Object.assign(keep, state);
      syncPlotTile(o);
    },
    till(objId) {
      const o = plotOf(objId); if (!o) return false;
      const d = o.data;
      if (d.state === 'tilled') return false;
      if (d.state === 'planted' && !d.withered) return false;
      d.state = 'tilled'; d.growth = 0; d.stage = 0; d.daysSincePlant = 0; delete d.crop; delete d.withered; delete d.regrowIn; delete d.grown;
      syncPlotTile(o); return true;
    },
    clear(objId) {
      const o = plotOf(objId); if (!o) return false;
      const d = o.data;
      d.state = 'empty'; d.growth = 0; d.stage = 0; d.daysSincePlant = 0; d.watered = false; delete d.crop; delete d.withered; delete d.regrowIn; delete d.grown;
      syncPlotTile(o); return true;
    },
    plant(objId, cropOrSeed, owner) {
      const o = plotOf(objId); if (!o) return false;
      const def = cropDef(cropOrSeed); if (!def) return false;
      const d = o.data;
      if (d.state === 'planted') return false;
      if (!def.seasons.includes(clock.time.season)) return false;
      d.state = 'planted'; d.crop = def.id; d.growth = 0; d.stage = 0; d.daysSincePlant = 0; d.grown = 0; delete d.withered; delete d.regrowIn;
      if (owner) d.owner = owner;
      syncPlotTile(o); return true;
    },
    water(objId) {
      const o = plotOf(objId); if (!o) return false;
      if (o.data.state === 'empty') return false;
      o.data.watered = true; syncPlotTile(o); return true;
    },
    harvestable(objId) {
      const o = plotOf(objId); if (!o) return false;
      const d = o.data;
      return d.state === 'planted' && !d.withered && d.growth >= 1;
    },
    harvest(objId) {
      const o = plotOf(objId); if (!o || !world.harvestable(objId)) return null;
      const d = o.data;
      const def = CROP_BY_ID[d.crop!];
      const out = { item: def.id, qty: def.yieldQty };
      if (def.regrowDays) { d.growth = 0.75; d.regrowIn = def.regrowDays; d.stage = Math.max(0, def.stages - 2); }
      else { d.state = 'tilled'; delete d.crop; d.growth = 0; d.stage = 0; d.daysSincePlant = 0; delete d.grown; }
      syncPlotTile(o); return out;
    },
    chop(objId) {
      const o = objectById.get(objId); if (!o || o.kind !== 'tree') return null;
      const d = o.data as { wood: number };
      if (d.wood <= 0) return null;
      d.wood -= 1; return { item: 'wood', qty: 1 };
    },
    pickFruit(objId) {
      const o = objectById.get(objId); if (!o || o.kind !== 'tree') return null;
      const d = o.data as { type: string; fruit?: number };
      if (d.type !== 'apple' || !d.fruit) return null;
      const qty = d.fruit; d.fruit = 0; return { item: 'apple', qty };
    },
    mine(objId) {
      const o = objectById.get(objId); if (!o || o.kind !== 'rock') return null;
      const d = o.data as { ore: string; hp: number; depleted: boolean };
      if (d.depleted || d.hp <= 0) return null;
      d.hp -= 1;
      if (d.hp > 0) return { item: 'stone', qty: 0, broke: false };
      d.depleted = true;
      const gem = d.ore === 'gold_ore' && dailyRng.chance(0.25);
      return gem ? { item: 'gem', qty: 1, broke: true } : { item: d.ore, qty: d.ore === 'stone' ? 2 : 1, broke: true };
    },
    gather(objId) {
      const o = objectById.get(objId); if (!o || o.kind !== 'forage') return null;
      const item = o.data.item as ItemId | null, qty = (o.data.qty as number) ?? 0;
      if (!item || qty <= 0) return null;
      o.data.item = null; o.data.qty = 0;
      return { item, qty };
    },

    save(): SavedWorld {
      const saved: Record<ObjectId, Record<string, unknown>> = {};
      for (const o of objects) if (MUTABLE_KINDS.includes(o.kind)) saved[o.id] = JSON.parse(JSON.stringify(o.data)) as Record<string, unknown>;
      return { v: 1, seed, clock: clock.save(), rng: dailyRng.state, objects: saved };
    },
    load(data) {
      const s = data as Partial<SavedWorld> | null;
      if (!s || typeof s !== 'object') return;
      if (s.clock) clock.load(s.clock);
      if (typeof s.rng === 'number') dailyRng.state = s.rng;
      if (s.objects) {
        for (const [id, d] of Object.entries(s.objects)) {
          const o = objectById.get(id);
          if (!o) continue;
          for (const k of Object.keys(o.data)) delete o.data[k];
          Object.assign(o.data, d);
          if (o.kind === 'plot') syncPlotTile(o);
          if (o.kind === 'rock') grid.setVariant(o.pos.x, o.pos.y, ({ stone: 0, copper_ore: 1, iron_ore: 2, gold_ore: 3 } as Record<string, number>)[String(o.data.ore)] ?? 0);
        }
      }
    },
  };
  return world;
}

export { KINDS };
