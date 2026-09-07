/**
 * A small fake World for headless tests: every place from core/places laid out on an 84×60 grid, buildings
 * with doors and interiors, farm plots, trees, rocks, fish spots, forage, animals, a BFS pathfinder, the
 * clock, simple weather and crops. Used by scripts/sim.ts with --fake and whenever generateWorld throws.
 */
import { bus } from '../core/bus.ts';
import { CROP_BY_ID } from '../core/items.ts';
import { ALL_PLACE_IDS } from '../core/places.ts';
import { SeededRng } from '../core/rng.ts';
import { DAYS_PER_SEASON, START_MINUTE, timeFromMinute } from '../core/time.ts';
import type { ObjectId, ObjectKind, Place, PlaceId, PlaceKind, PlotState, Season, TileKind, Vec, WeatherKind, WeatherState, World, WorldObject, WorldTime } from '../core/types.ts';
import { VILLAGERS } from '../core/villagers.ts';

const W = 84, H = 60;

interface Building { id: PlaceId; name: string; kind: PlaceKind; x: number; y: number; w: number; h: number; owner?: string; open?: [number, number]; facilities: string[] }
interface Area { id: PlaceId; name: string; kind: PlaceKind; x: number; y: number; w: number; h: number; facilities: string[]; open?: [number, number] }

const BUILDINGS: Building[] = [
  ...VILLAGERS.map((v, i) => ({ id: v.home, name: `${v.short}'s house`, kind: 'home' as PlaceKind, x: 2 + i * 8, y: 3, w: 5, h: 4, owner: v.id, facilities: ['bed', 'kitchen', 'chair'] })),
  { id: 'home_player', name: 'Your cottage', kind: 'home', x: 2, y: 12, w: 5, h: 4, owner: 'player', facilities: ['bed', 'kitchen'] },
  { id: 'barn', name: 'The Barn', kind: 'farm', x: 22, y: 27, w: 6, h: 4, owner: 'ada', facilities: ['animals'] },
  { id: 'smithy', name: 'The Smithy', kind: 'shop', x: 30, y: 12, w: 6, h: 4, owner: 'bram', open: [8, 18], facilities: ['forge', 'counter', 'workbench'] },
  { id: 'bakery', name: 'The Bakery', kind: 'shop', x: 38, y: 12, w: 6, h: 4, owner: 'cerys', open: [6, 17], facilities: ['oven', 'kitchen', 'counter'] },
  { id: 'store', name: 'The General Store', kind: 'shop', x: 46, y: 12, w: 6, h: 4, owner: 'hal', open: [8, 19], facilities: ['counter'] },
  { id: 'tavern', name: 'The Drowsy Owl', kind: 'shop', x: 54, y: 12, w: 8, h: 5, owner: 'finn', open: [11, 24.5], facilities: ['bar', 'kitchen', 'chair', 'counter', 'music'] },
  { id: 'clinic', name: 'The Clinic', kind: 'shop', x: 64, y: 12, w: 6, h: 4, owner: 'elin', open: [8, 18], facilities: ['clinic', 'kitchen', 'counter', 'bed'] },
  { id: 'library', name: 'The Library', kind: 'shop', x: 72, y: 12, w: 7, h: 4, owner: 'ines', open: [9, 18], facilities: ['books', 'chair', 'counter'] },
  { id: 'carpenter', name: "The Carpenter's Yard", kind: 'shop', x: 56, y: 20, w: 7, h: 4, owner: 'jory', open: [9, 17], facilities: ['workbench', 'counter'] },
  { id: 'chapel', name: 'The Chapel', kind: 'public', x: 30, y: 36, w: 6, h: 5, facilities: ['shrine', 'chair'] },
];

const AREAS: Area[] = [
  { id: 'farm', name: 'Thornfield Farm', kind: 'farm', x: 2, y: 20, w: 18, h: 12, facilities: ['plots'] },
  { id: 'player_farm', name: 'Your plot', kind: 'farm', x: 8, y: 12, w: 8, h: 6, facilities: ['plots'] },
  { id: 'square', name: 'The Square', kind: 'public', x: 36, y: 20, w: 12, h: 9, facilities: ['bench', 'well'] },
  { id: 'well', name: 'The Well', kind: 'landmark', x: 41, y: 24, w: 2, h: 2, facilities: ['well'] },
  { id: 'board', name: 'The Notice Board', kind: 'landmark', x: 44, y: 21, w: 2, h: 2, facilities: ['board'] },
  { id: 'dock', name: 'The Dock', kind: 'workplace', x: 66, y: 40, w: 8, h: 4, facilities: ['fishing', 'counter'], open: [6, 19] },
  { id: 'mine', name: 'The Mine', kind: 'workplace', x: 2, y: 44, w: 10, h: 8, facilities: ['rocks'] },
  { id: 'festival_grounds', name: 'The Festival Grounds', kind: 'public', x: 48, y: 30, w: 14, h: 8, facilities: ['campfire', 'stage'] },
  { id: 'forest', name: 'The Forest', kind: 'nature', x: 2, y: 34, w: 24, h: 9, facilities: ['trees', 'forage'] },
  { id: 'lake', name: 'The Lake', kind: 'nature', x: 62, y: 46, w: 20, h: 12, facilities: ['water', 'fishing'] },
  { id: 'river', name: 'The River', kind: 'nature', x: 30, y: 44, w: 26, h: 4, facilities: ['water', 'fishing'] },
  { id: 'orchard', name: 'The Orchard', kind: 'nature', x: 22, y: 50, w: 12, h: 8, facilities: ['trees', 'hives'] },
  { id: 'graveyard', name: 'The Graveyard', kind: 'public', x: 38, y: 51, w: 8, h: 6, facilities: [] },
  { id: 'meadow', name: 'The Meadow', kind: 'nature', x: 38, y: 32, w: 9, h: 10, facilities: ['forage', 'flowers'] },
  { id: 'hill', name: 'Library Hill', kind: 'nature', x: 72, y: 20, w: 10, h: 8, facilities: ['view'] },
  { id: 'bridge_west', name: 'The West Bridge', kind: 'landmark', x: 36, y: 44, w: 2, h: 4, facilities: [] },
  { id: 'bridge_east', name: 'The East Bridge', kind: 'landmark', x: 50, y: 44, w: 2, h: 4, facilities: [] },
];

export interface TestWorldOptions { seed?: number; startMinute?: number }

export function createTestWorld(seed = 1, opts: TestWorldOptions = {}): World {
  const rng = new SeededRng(seed);
  const tiles: TileKind[] = new Array(W * H).fill('grass');
  const walk: boolean[] = new Array(W * H).fill(true);
  const idx = (x: number, y: number) => y * W + x;
  const set = (x: number, y: number, k: TileKind, w = true) => { if (x >= 0 && y >= 0 && x < W && y < H) { tiles[idx(x, y)] = k; walk[idx(x, y)] = w; } };
  const places: Place[] = [];
  const objects: WorldObject[] = [];
  let oid = 0;
  const obj = (kind: ObjectKind, pos: Vec, place: PlaceId | undefined, data: Record<string, unknown>, blocks = false): WorldObject => { const o: WorldObject = { id: `${kind}_${(oid++).toString(36)}`, kind, pos, place, data }; objects.push(o); if (blocks) set(pos.x, pos.y, kind === 'tree' ? 'tree' : kind === 'rock' ? 'rock' : 'prop', false); return o; };

  // areas first (ground)
  for (const a of AREAS) {
    const ts: Vec[] = [];
    for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) {
      ts.push({ x, y });
      if (a.id === 'lake') { const edge = x === a.x || y === a.y || x === a.x + a.w - 1 || y === a.y + a.h - 1; set(x, y, edge ? 'sand' : 'water', edge); }
      else if (a.id === 'river') { const bridge = (x >= 36 && x <= 37) || (x >= 50 && x <= 51); set(x, y, bridge ? 'bridge' : 'water', bridge); }
      else if (a.id === 'square') set(x, y, 'path');
      else if (a.id === 'mine') set(x, y, 'stone');
      else if (a.id === 'farm' || a.id === 'player_farm') set(x, y, 'dirt');
      else if (a.id === 'graveyard') set(x, y, 'dirt');
      else if (a.id === 'dock') set(x, y, 'bridge');
    }
    const anchor = { x: a.x + Math.floor(a.w / 2), y: a.y + Math.floor(a.h / 2) };
    if (a.id === 'lake') anchor.y = a.y;
    if (a.id === 'river') { anchor.x = 36; anchor.y = a.y - 1; }
    places.push({ id: a.id, name: a.name, kind: a.kind, tiles: ts.filter((t) => walk[idx(t.x, t.y)]), anchor, facilities: a.facilities, open: a.open });
  }
  // a road through the middle
  for (let x = 0; x < W; x++) { set(x, 9, 'path'); set(x, 10, 'path'); set(x, 19, 'path'); }
  for (let y = 0; y < H; y++) { set(42, y, tiles[idx(42, y)] === 'water' ? 'bridge' : 'path'); }
  for (let y = 9; y < 44; y++) set(20, y, tiles[idx(20, y)] === 'water' ? 'bridge' : 'path');
  for (let y = 9; y < 46; y++) set(64, y, tiles[idx(64, y)] === 'water' ? 'bridge' : 'path');

  // buildings
  for (const b of BUILDINGS) {
    const ts: Vec[] = [];
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      const wall = x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1;
      set(x, y, wall ? 'wall' : 'floor', !wall);
      if (!wall) ts.push({ x, y });
    }
    const door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    set(door.x, door.y, 'door', true);
    const interior = { x: door.x, y: door.y - 1 };
    const anchor = { x: b.x + Math.floor(b.w / 2), y: b.y + Math.floor(b.h / 2) };
    places.push({ id: b.id, name: b.name, kind: b.kind, tiles: ts, anchor, door, interior, owner: b.owner, open: b.open, facilities: b.facilities });
    if (b.facilities.includes('bed')) obj('bed', { x: b.x + 1, y: b.y + 1 }, b.id, {});
    if (b.facilities.includes('counter')) obj('counter', { x: anchor.x, y: anchor.y }, b.id, {});
    if (b.id === 'chapel') obj('shrine', { x: anchor.x, y: b.y + 1 }, b.id, {});
    if (b.id === 'barn') { obj('animal', { x: b.x + 1, y: b.y + 1 }, b.id, { kind: 'cow' }); obj('animal', { x: b.x + 2, y: b.y + 1 }, b.id, { kind: 'cow' }); obj('animal', { x: b.x + 3, y: b.y + 1 }, b.id, { kind: 'hen' }); obj('animal', { x: b.x + 4, y: b.y + 1 }, b.id, { kind: 'hen' }); obj('animal', { x: b.x + 4, y: b.y + 2 }, b.id, { kind: 'sheep' }); }
  }
  // clear a strip below every door
  for (const p of places) if (p.door) set(p.door.x, p.door.y + 1, 'path', true);

  // objects: plots, trees, rocks, fish spots, forage, furniture
  const plots = new Map<ObjectId, PlotState>();
  const farm = places.find((p) => p.id === 'farm')!;
  for (let i = 0; i < 24; i++) { const o = obj('plot', { x: farm.anchor.x - 6 + (i % 8) * 2, y: farm.anchor.y - 3 + Math.floor(i / 8) * 2 }, 'farm', {}); plots.set(o.id, { state: 'empty', growth: 0, watered: false, daysSincePlant: 0, stage: 0 }); }
  const pf = places.find((p) => p.id === 'player_farm')!;
  for (let i = 0; i < 6; i++) { const o = obj('plot', { x: pf.anchor.x - 2 + (i % 3) * 2, y: pf.anchor.y - 1 + Math.floor(i / 3) * 2 }, 'player_farm', {}); plots.set(o.id, { state: 'empty', growth: 0, watered: false, daysSincePlant: 0, stage: 0, owner: 'player' }); }
  for (let i = 0; i < 14; i++) obj('tree', { x: 3 + (i % 7) * 3 + (i > 6 ? 1 : 0), y: 35 + Math.floor(i / 7) * 4 }, 'forest', { wood: 3 }, true);
  for (let i = 0; i < 8; i++) obj('tree', { x: 23 + (i % 4) * 3, y: 51 + Math.floor(i / 4) * 4 }, 'orchard', { wood: 2, fruit: 'apple' }, true);
  for (let i = 0; i < 9; i++) obj('rock', { x: 3 + (i % 3) * 3, y: 45 + Math.floor(i / 3) * 2 }, 'mine', { hp: 4, ore: rng.pick(['stone', 'copper_ore', 'copper_ore', 'iron_ore', 'iron_ore', 'gold_ore']) }, true);
  obj('fishspot', { x: 70, y: 43 }, 'dock', {}); obj('fishspot', { x: 72, y: 43 }, 'dock', {});
  obj('fishspot', { x: 34, y: 43 }, 'river', {}); obj('fishspot', { x: 46, y: 43 }, 'river', {});
  obj('fishspot', { x: 66, y: 46 }, 'lake', {}); obj('fishspot', { x: 76, y: 46 }, 'lake', {});
  const forageSpots: WorldObject[] = [];
  for (let i = 0; i < 8; i++) forageSpots.push(obj('forage', { x: 5 + i * 2 + (i % 2), y: 38 + (i % 3) }, 'forest', { item: rng.pick(['berries', 'mushroom', 'herbs', 'wildflower']), qty: 2 }));
  for (let i = 0; i < 5; i++) forageSpots.push(obj('forage', { x: 39 + i, y: 34 + (i % 4) }, 'meadow', { item: rng.pick(['wildflower', 'herbs', 'berries']), qty: 2 }));
  for (let i = 0; i < 3; i++) forageSpots.push(obj('forage', { x: 25 + i * 3, y: 53 + (i % 2) }, 'orchard', { item: 'apple', qty: 3 }));
  obj('well', { x: 41, y: 24 }, 'square', {}); obj('board', { x: 44, y: 21 }, 'square', {}); obj('bench', { x: 38, y: 27 }, 'square', {}); obj('bench', { x: 46, y: 27 }, 'square', {});
  obj('flowerbed', { x: 37, y: 21 }, 'square', { flowers: 2 }); obj('campfire', { x: 55, y: 34 }, 'festival_grounds', {}); obj('bench', { x: 76, y: 23 }, 'hill', {}); obj('lantern', { x: 43, y: 21 }, 'square', {});
  // make sure every object stands on walkable ground for the things that are walked to
  for (const o of objects) if (o.kind !== 'tree' && o.kind !== 'rock') walk[idx(o.pos.x, o.pos.y)] = true;
  for (const id of ALL_PLACE_IDS) if (!places.some((p) => p.id === id)) throw new Error(`test world missing place ${id}`);

  let minute = opts.startMinute ?? START_MINUTE;
  let time: WorldTime = timeFromMinute(Math.floor(minute));
  const weatherRng = rng.fork(7);
  const forecastFor = (dayIndex: number, season: Season): WeatherKind => { const r = new SeededRng((seed * 131 + dayIndex * 17) >>> 0).next(); if (season === 'winter') return r < 0.35 ? 'snow' : r < 0.55 ? 'cloudy' : r < 0.65 ? 'fog' : 'sunny'; if (r < 0.5) return 'sunny'; if (r < 0.7) return 'cloudy'; if (r < 0.87) return 'rain'; if (r < 0.93) return 'storm'; return 'fog'; };
  const weather: WeatherState = { kind: forecastFor(1, 'spring'), intensity: 0.5, forecast: forecastFor(2, 'spring'), temperature: 14 };
  void weatherRng;
  const festivals: Record<string, { id: string; name: string; hour: number }> = { 'spring-13': { id: 'bloom', name: 'Spring Bloom Fair', hour: 14 }, 'summer-14': { id: 'lantern', name: 'Midsummer Lantern Night', hour: 19 }, 'autumn-16': { id: 'harvest', name: 'Harvest Feast', hour: 15 }, 'winter-25': { id: 'star', name: 'Winter Star', hour: 18 } };

  const growCrops = () => {
    for (const [id, p] of plots) {
      if (p.state !== 'planted' || !p.crop) { p.watered = false; continue; }
      const crop = CROP_BY_ID[p.crop];
      if (!crop) continue;
      if (p.watered || weather.kind === 'rain' || weather.kind === 'storm') { p.daysSincePlant += 1; p.growth = Math.min(1, p.daysSincePlant / crop.days); p.stage = Math.min(crop.stages - 1, Math.floor(p.growth * (crop.stages - 1))); }
      p.watered = false;
      if (!crop.seasons.includes(time.season) && p.growth < 1) { p.state = 'tilled'; p.crop = undefined; p.growth = 0; }
      plots.set(id, p);
    }
  };
  const respawn = () => {
    for (const o of objects) {
      if (o.kind === 'tree' && typeof o.data.wood === 'number' && o.data.wood < 3) o.data.wood = (o.data.wood as number) + 1;
      if (o.kind === 'rock' && typeof o.data.hp === 'number' && o.data.hp < 4) { o.data.hp = (o.data.hp as number) + 2; o.data.ore = rng.pick(['stone', 'copper_ore', 'copper_ore', 'iron_ore', 'iron_ore', 'gold_ore']); }
      if (o.kind === 'forage') o.data.qty = Math.min(3, (typeof o.data.qty === 'number' ? o.data.qty : 0) + 2);
    }
  };

  const key = (x: number, y: number) => y * W + x;
  const findPath = (from: Vec, to: Vec, opts2?: { maxNodes?: number }): Vec[] | null => {
    const sx = Math.round(from.x), sy = Math.round(from.y), tx = Math.round(to.x), ty = Math.round(to.y);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H || tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
    if (!walk[key(tx, ty)]) return null;
    if (sx === tx && sy === ty) return [{ x: sx, y: sy }];
    const max = opts2?.maxNodes ?? 6000;
    const prev = new Int32Array(W * H).fill(-1);
    const q: number[] = [key(sx, sy)];
    prev[key(sx, sy)] = key(sx, sy);
    let head = 0, n = 0;
    while (head < q.length && n < max) {
      const cur = q[head++]; n++;
      const cx = cur % W, cy = Math.floor(cur / W);
      if (cx === tx && cy === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = key(nx, ny);
        if (prev[k] !== -1 || !walk[k]) continue;
        prev[k] = cur; q.push(k);
      }
    }
    const end = key(tx, ty);
    if (prev[end] === -1) return null;
    const out: Vec[] = [];
    let cur = end;
    while (cur !== key(sx, sy)) { out.push({ x: cur % W, y: Math.floor(cur / W) }); cur = prev[cur]; }
    out.push({ x: sx, y: sy });
    out.reverse();
    return out;
  };

  const world: World = {
    seed, width: W, height: H, places, objects,
    get time() { return time; },
    weather,
    tile: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 'void' : tiles[idx(x, y)]),
    tileVariant: () => 0,
    walkable: (x, y) => x >= 0 && y >= 0 && x < W && y < H && walk[idx(x, y)],
    place: (id) => places.find((p) => p.id === id),
    placeAt: (pos) => { const x = Math.round(pos.x), y = Math.round(pos.y); let best: Place | undefined; for (const p of places) { if (p.tiles.some((t) => t.x === x && t.y === y)) { if (!best || p.tiles.length < best.tiles.length) best = p; } } return best; },
    placesOfKind: (kind) => places.filter((p) => p.kind === kind),
    object: (id) => objects.find((o) => o.id === id),
    objectsNear: (pos, radius, kind) => objects.filter((o) => (!kind || o.kind === kind) && Math.hypot(o.pos.x - pos.x, o.pos.y - pos.y) <= radius),
    objectsAt: (place, kind) => objects.filter((o) => o.place === place && (!kind || o.kind === kind)),
    findPath,
    nearestWalkable: (pos, radius = 4) => {
      const cx = Math.round(pos.x), cy = Math.round(pos.y);
      if (world.walkable(cx, cy)) return { x: cx, y: cy };
      for (let r = 1; r <= radius; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (world.walkable(cx + dx, cy + dy)) return { x: cx + dx, y: cy + dy };
      return { x: 42, y: 24 };
    },
    tick(minutes) {
      const beforeDay = time.dayIndex, beforeHour = time.hour;
      minute += minutes;
      time = timeFromMinute(Math.floor(minute));
      (time as { minute: number }).minute = minute;
      if (time.dayIndex !== beforeDay) {
        growCrops(); respawn();
        weather.kind = forecastFor(time.dayIndex, time.season); weather.forecast = forecastFor(time.dayIndex + 1, timeFromMinute((time.dayIndex) * 1440).season);
        weather.temperature = time.season === 'summer' ? 24 : time.season === 'winter' ? 2 : 13;
        world.season = time.season;
        bus.emit({ type: 'newday', dayIndex: time.dayIndex });
        bus.emit({ type: 'weather', weather });
      }
      if (time.hour !== beforeHour) bus.emit({ type: 'hour', hour: time.hour });
    },
    speed: 1, paused: false,
    festivalToday: () => festivals[`${time.season}-${time.day}`] ?? null,
    season: time.season,
    plot: (id) => { const p = plots.get(id); return p ? { ...p } : undefined; },
    setPlot: (id, state) => { plots.set(id, { ...state }); },
    save: () => ({ minute, plots: [...plots.entries()], objects: objects.map((o) => ({ id: o.id, data: o.data })), weather: { ...weather } }),
    load: (data) => { const d = data as { minute?: number; plots?: [string, PlotState][]; objects?: { id: string; data: Record<string, unknown> }[]; weather?: WeatherState }; if (typeof d?.minute === 'number') { minute = d.minute; time = timeFromMinute(Math.floor(minute)); } if (d?.plots) for (const [id, p] of d.plots) plots.set(id, p); if (d?.objects) for (const o of d.objects) { const cur = objects.find((x) => x.id === o.id); if (cur) cur.data = o.data; } if (d?.weather) Object.assign(weather, d.weather); },
  };
  void DAYS_PER_SEASON;
  return world;
}
