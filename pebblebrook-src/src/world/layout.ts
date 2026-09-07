/**
 * The hand-designed map of Pebblebrook with seeded variation. Coordinates are tiles on a 96×72 grid,
 * y grows downward. Every building has its door on the south side; villages "read" as rows of houses
 * along east–west lanes. See specs/NOTES-world.md for the map at a glance.
 */
import { PLACES } from '../core/places.ts';
import type { SeededRng } from '../core/rng.ts';
import type { ItemId, Place, PlaceId, PlaceKind, PlotState, Season, TileKind, Vec, WorldObject } from '../core/types.ts';
import { Grid, KIND_INDEX } from './grid.ts';
import { ANIMALS, FISH_TABLES, GRAVES, SIGNS, TREE_VARIANT, type ForageArea, type TreeType } from './tables.ts';

export const MAP_W = 96;
export const MAP_H = 72;

/* ------------------------------------------------------------ buildings */

export interface BuildingSpec {
  id: PlaceId;
  name: string;
  kind: PlaceKind;
  /** top-left of the roof */
  x: number; y: number;
  w: number;
  wallRows: number;
  roofRows: number;
  /** door column offset from x */
  doorDx: number;
  /** tiles of path painted south of the door */
  stub: number;
  owner?: string;
  open?: [number, number];
  facilities: string[];
  /** fixed style/roof colour; otherwise seeded */
  style?: number;
  roof?: number;
}

export interface Building {
  spec: BuildingSpec;
  style: number;
  roof: number;
  door: Vec;
  interior: Vec;
  tiles: Vec[];
}

const HOME = ['bed', 'kitchen'];

export const BUILDINGS: BuildingSpec[] = [
  // hill
  { id: PLACES.library, name: 'Library', kind: 'workplace', x: 32, y: 5, w: 4, wallRows: 3, roofRows: 2, doorDx: 2, stub: 1, owner: 'ines', open: [9, 17], facilities: ['books', 'desk'], style: 1 },
  { id: PLACES.home_ines, name: "Ines's cottage", kind: 'home', x: 38, y: 6, w: 3, wallRows: 2, roofRows: 2, doorDx: 1, stub: 1, owner: 'ines', facilities: HOME },
  { id: PLACES.chapel, name: 'Chapel', kind: 'public', x: 44, y: 4, w: 4, wallRows: 3, roofRows: 3, doorDx: 2, stub: 1, facilities: ['altar', 'benches'], style: 2, roof: 3 },
  // north lane
  { id: PLACES.home_elin, name: "Elin's house", kind: 'home', x: 29, y: 16, w: 3, wallRows: 3, roofRows: 2, doorDx: 1, stub: 1, owner: 'elin', facilities: HOME },
  { id: PLACES.clinic, name: 'Clinic', kind: 'workplace', x: 34, y: 16, w: 4, wallRows: 3, roofRows: 2, doorDx: 2, stub: 1, owner: 'elin', open: [8, 18], facilities: ['clinic', 'kitchen'], style: 0 },
  { id: PLACES.home_hal, name: "Hal's house", kind: 'home', x: 39, y: 16, w: 3, wallRows: 3, roofRows: 2, doorDx: 1, stub: 1, owner: 'hal', facilities: HOME },
  { id: PLACES.home_cerys, name: "Cerys's house", kind: 'home', x: 47, y: 16, w: 3, wallRows: 3, roofRows: 2, doorDx: 1, stub: 1, owner: 'cerys', facilities: HOME },
  { id: PLACES.home_greta, name: "Greta's house", kind: 'home', x: 57, y: 13, w: 3, wallRows: 2, roofRows: 2, doorDx: 1, stub: 1, owner: 'greta', facilities: HOME, style: 3 },
  // square, north row
  { id: PLACES.home_bram, name: "Bram's house", kind: 'home', x: 29, y: 26, w: 3, wallRows: 2, roofRows: 2, doorDx: 1, stub: 1, owner: 'bram', facilities: HOME },
  { id: PLACES.smithy, name: 'Smithy', kind: 'shop', x: 33, y: 25, w: 4, wallRows: 3, roofRows: 2, doorDx: 2, stub: 1, owner: 'bram', open: [8, 18], facilities: ['forge', 'workbench', 'counter'], style: 3, roof: 0 },
  { id: PLACES.store, name: 'General Store', kind: 'shop', x: 39, y: 25, w: 4, wallRows: 3, roofRows: 2, doorDx: 2, stub: 1, owner: 'hal', open: [8, 18], facilities: ['counter', 'storage'] },
  { id: PLACES.bakery, name: 'Bakery', kind: 'shop', x: 45, y: 25, w: 4, wallRows: 3, roofRows: 2, doorDx: 2, stub: 1, owner: 'cerys', open: [6, 16], facilities: ['oven', 'kitchen', 'counter'], roof: 2 },
  // east of the square
  { id: PLACES.tavern, name: 'The Drowsy Owl', kind: 'shop', x: 53, y: 31, w: 4, wallRows: 3, roofRows: 2, doorDx: 2, stub: 1, owner: 'finn', open: [12, 24], facilities: ['bar', 'kitchen', 'counter', 'tables'], roof: 1 },
  { id: PLACES.home_finn, name: "Finn's rooms", kind: 'home', x: 58, y: 31, w: 3, wallRows: 2, roofRows: 2, doorDx: 1, stub: 2, owner: 'finn', facilities: HOME },
  { id: PLACES.carpenter, name: "Carpenter's yard", kind: 'workplace', x: 53, y: 39, w: 4, wallRows: 2, roofRows: 2, doorDx: 2, stub: 1, owner: 'jory', open: [9, 17], facilities: ['workbench', 'storage'], style: 1 },
  { id: PLACES.home_jory, name: "Jory's house", kind: 'home', x: 58, y: 44, w: 3, wallRows: 2, roofRows: 2, doorDx: 1, stub: 1, owner: 'jory', facilities: HOME },
  // south
  { id: PLACES.home_dov, name: "Dov's hut", kind: 'home', x: 52, y: 50, w: 3, wallRows: 2, roofRows: 2, doorDx: 1, stub: 1, owner: 'dov', facilities: HOME, style: 1 },
  { id: PLACES.home_player, name: 'Your house', kind: 'home', x: 26, y: 42, w: 3, wallRows: 3, roofRows: 2, doorDx: 1, stub: 1, facilities: HOME },
  // farm
  { id: PLACES.barn, name: 'Barn', kind: 'workplace', x: 76, y: 14, w: 4, wallRows: 3, roofRows: 2, doorDx: 2, stub: 1, owner: 'ada', open: [6, 20], facilities: ['animals', 'storage'], style: 3, roof: 0 },
  { id: PLACES.home_ada, name: "Ada's farmhouse", kind: 'home', x: 74, y: 30, w: 3, wallRows: 2, roofRows: 2, doorDx: 1, stub: 2, owner: 'ada', facilities: HOME },
];

/* ------------------------------------------------------------ regions */

export interface Rect { x0: number; y0: number; x1: number; y1: number }
const R = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });
const inRect = (r: Rect, x: number, y: number): boolean => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

export const REGIONS = {
  square: R(37, 30, 49, 38),
  festival: R(24, 31, 35, 39),
  meadow: R(8, 26, 23, 50),
  hill: R(26, 3, 42, 14),
  graveyard: R(50, 3, 56, 9),
  mine: R(57, 0, 67, 10),
  orchard: R(57, 19, 64, 28),
  farm: R(72, 12, 93, 48),
  animalField: R(82, 13, 92, 21),
  playerFarm: R(23, 41, 35, 47),
  forestNW: R(0, 0, 25, 24),
  forestW: R(0, 0, 7, 71),
  forestSW: R(0, 50, 22, 71),
  forestS: R(0, 62, 58, 71),
  ridgeNE: R(72, 0, 95, 11),
  carpenterYard: R(57, 39, 61, 43),
};

/** river centreline x by y (linear between keys) */
const RIVER_KEYS: [number, number][] = [[0, 71], [10, 70], [16, 68], [24, 66], [32, 65], [40, 65], [44, 66], [48, 68], [54, 69], [60, 70]];

function riverCentre(y: number, jitter: number[]): number {
  let i = 0;
  while (i < RIVER_KEYS.length - 2 && RIVER_KEYS[i + 1][0] < y) i++;
  const [y0, x0] = RIVER_KEYS[i], [y1, x1] = RIVER_KEYS[i + 1];
  const t = (y - y0) / (y1 - y0);
  return x0 + (x1 - x0) * t + jitter[y];
}

/* -------------------------------------------------------------- output */

export interface LayoutResult {
  places: Place[];
  objects: WorldObject[];
  buildings: Map<PlaceId, Building>;
  /** the tile a villager must stand on to be "inside" (interior anchors), by place */
  seasonPlantedAt: Season;
}

/* ----------------------------------------------------------- generator */

export function buildLayout(grid: Grid, rng: SeededRng, season: Season): LayoutResult {
  const g = grid;
  const objects: WorldObject[] = [];
  const counters: Record<string, number> = {};
  const occupied = new Set<number>();
  const BLOCKING = new Set(['well', 'board', 'bench', 'lantern', 'sign', 'flowerbed', 'campfire', 'shrine', 'barrel', 'crate', 'decoration', 'stump']);
  const obj = (kind: WorldObject['kind'], x: number, y: number, data: Record<string, unknown>, place?: PlaceId): WorldObject => {
    const n = (counters[kind] = (counters[kind] ?? 0) + 1);
    const o: WorldObject = { id: `${kind}_${String(n).padStart(3, '0')}`, kind, pos: { x, y }, data, ...(place ? { place } : {}) };
    objects.push(o);
    occupied.add(g.idx(x, y));
    if (kind !== 'tree' && kind !== 'rock') { const k = g.get(x, y); if (k === 'tree' || k === 'bush' || k === 'rock') g.set(x, y, 'grass', 0); }
    if (BLOCKING.has(kind)) g.block(x, y);
    return o;
  };

  /* -- 1. grass base with seeded variety */
  const grassVar = (): number => { const r = rng.next(); return r < 0.6 ? 0 : r < 0.8 ? 1 : r < 0.92 ? 2 : 3; };
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) g.set(x, y, 'grass', grassVar());

  /* -- 2. mountains, forests, hill, mine */
  for (let x = 0; x < MAP_W; x++) { g.set(x, 0, 'rock', 0); g.set(x, 1, 'rock', 0); if (rng.chance(0.6)) g.set(x, 2, 'rock', 0); }
  for (let x = 66; x <= 72; x++) for (let y = 0; y <= 11; y++) g.set(x, y, 'rock', 0);

  const treeType = (): TreeType => { const r = rng.next(); return r < 0.55 ? 'oak' : r < 0.85 ? 'pine' : 'birch'; };
  const plantable = (x: number, y: number): boolean => { const k = g.get(x, y); return k === 'grass' || k === 'flower' || k === 'bush'; };
  const plantTree = (x: number, y: number, type: TreeType = treeType()): void => { if (plantable(x, y)) g.set(x, y, 'tree', TREE_VARIANT[type]); };
  const forestFill = (r: Rect, density: (x: number, y: number) => number): void => {
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      if (g.get(x, y) !== 'grass') continue;
      if (rng.chance(density(x, y))) plantTree(x, y);
      else if (rng.chance(0.06)) g.set(x, y, 'bush', rng.int(0, 3));
    }
  };
  forestFill(REGIONS.forestNW, (x, y) => 0.92 - 0.5 * Math.max(0, (x + y - 20) / 30));
  forestFill(REGIONS.forestW, () => 0.9);
  forestFill(REGIONS.forestSW, (x, y) => 0.88 - 0.4 * Math.max(0, (x - 8) / 14) + 0.2 * Math.max(0, (y - 60) / 11));
  forestFill(REGIONS.forestS, (_x, y) => 0.55 + 0.4 * ((y - 62) / 9));
  forestFill(R(23, 52, 45, 61), () => 0.12);
  forestFill(R(0, 25, 7, 49), () => 0.9);
  forestFill(REGIONS.ridgeNE, (_x, y) => (y < 4 ? 0.98 : 0.75));
  for (let x = 94; x < MAP_W; x++) for (let y = 0; y < MAP_H; y++) if (g.get(x, y) === 'grass') plantTree(x, y);
  for (let x = 72; x < MAP_W; x++) for (let y = 0; y < 3; y++) g.set(x, y, 'rock', 0);

  // clearings in the forest for the forest anchor and forage
  const clearings: Rect[] = [R(11, 12, 15, 16), R(6, 18, 9, 21), R(9, 58, 12, 61), R(16, 6, 19, 9), R(30, 56, 34, 59)];
  for (const c of clearings) for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) g.set(x, y, 'grass', grassVar());

  // the hill: a plateau ringed by outcrops and bushes, with a stepped path
  {
    const h = REGIONS.hill;
    for (let x = h.x0; x <= h.x1; x++) { g.set(x, h.y1, rng.chance(0.55) ? 'rock' : 'bush', rng.int(0, 3)); g.set(x, h.y0, rng.chance(0.7) ? 'rock' : 'tree', 0); }
    for (let y = h.y0; y <= h.y1; y++) { g.set(h.x0, y, rng.chance(0.5) ? 'rock' : 'bush', rng.int(0, 3)); }
    for (let x = h.x0 + 1; x < h.x1; x++) for (let y = h.y0 + 1; y < h.y1; y++) if (rng.chance(0.04)) g.set(x, y, 'rock', 0);
    for (let x = 26; x <= 29; x++) for (let y = 4; y <= 8; y++) if (rng.chance(0.5)) plantTree(x, y, 'pine');
  }

  // the mine: rock everywhere, a stone floor pocket, a dark mouth
  {
    const m = REGIONS.mine;
    for (let y = m.y0; y <= m.y1; y++) for (let x = m.x0; x <= m.x1; x++) g.set(x, y, 'rock', 0);
    for (let y = 5; y <= 9; y++) for (let x = 59; x <= 64; x++) g.set(x, y, 'stone', rng.int(0, 3));
    g.set(58, 9, 'stone', 0); g.set(58, 10, 'stone', 0); g.set(65, 8, 'stone', 1);
    for (let x = 60; x <= 62; x++) g.set(x, 4, 'prop', 0);
    // rock outcrops that hold ore
    g.set(60, 8, 'rock', 0); g.set(63, 6, 'rock', 0);
  }

  /* -- 3. water */
  const jitter: number[] = new Array(MAP_H).fill(0);
  { const ph = rng.range(0, 6.28), ph2 = rng.range(0, 6.28); for (let y = 0; y < MAP_H; y++) jitter[y] = Math.round(0.9 * Math.sin(y * 0.28 + ph) + 0.5 * Math.sin(y * 0.11 + ph2)); }
  const riverHalf = (y: number): number => (y < 42 ? 1 : 2);
  const riverAt = (x: number, y: number): 'none' | 'water' | 'deep' => {
    const c = riverCentre(y, jitter), hw = riverHalf(y), d = Math.abs(x - c);
    if (d > hw + 0.5) return 'none';
    return d < hw - 0.5 ? 'deep' : 'water';
  };
  const lake = { cx: 75, cy: 62, rx: 16, ry: 8.5, p1: rng.range(0, 6.28), p2: rng.range(0, 6.28) };
  const lakeE = (x: number, y: number): number => {
    const dx = (x - lake.cx) / lake.rx, dy = (y - lake.cy) / lake.ry;
    const a = Math.atan2(dy, dx);
    const rr = 1 + 0.09 * Math.sin(a * 3 + lake.p1) + 0.06 * Math.sin(a * 5 + lake.p2);
    return (dx * dx + dy * dy) / rr;
  };
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const r = riverAt(x, y);
    const e = lakeE(x, y);
    if (e < 0.5) g.set(x, y, 'deepwater', 1);
    else if (e < 1) g.set(x, y, 'water', 0);
    else if (r === 'deep') g.set(x, y, 'deepwater', 1);
    else if (r === 'water') g.set(x, y, 'water', 0);
  }
  // sand shore around the lake and a few river beaches
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const k = g.get(x, y);
    if (k === 'water' || k === 'deepwater') continue;
    const e = lakeE(x, y);
    const nearWater = g.get(x - 1, y) === 'water' || g.get(x + 1, y) === 'water' || g.get(x, y - 1) === 'water' || g.get(x, y + 1) === 'water';
    if (e < 1.3 || (e < 1.6 && nearWater)) g.set(x, y, 'sand', rng.int(0, 3));
    else if (nearWater && y > 8 && y < 52 && ((y >= 26 && y <= 30) || (y >= 50)) ) g.set(x, y, 'sand', rng.int(0, 3));
  }

  /* -- 4. areas */
  const sq = REGIONS.square;
  g.fill(sq.x0, sq.y0, sq.x1, sq.y1, 'stone', () => rng.int(0, 3));
  // meadow flowers
  for (let y = REGIONS.meadow.y0; y <= REGIONS.meadow.y1; y++) for (let x = REGIONS.meadow.x0; x <= REGIONS.meadow.x1; x++) {
    if (g.get(x, y) !== 'grass') continue;
    const r = rng.next();
    if (r < 0.3) g.set(x, y, 'flower', rng.int(0, 3));
    else if (r < 0.32) g.set(x, y, 'bush', rng.int(0, 3));
    else if (r < 0.335) plantTree(x, y, 'birch');
  }
  // orchard: apple trees in rows, hives between
  const orchardTrees: Vec[] = [];
  for (let y = 20; y <= 26; y += 3) for (let x = 58; x <= 64; x += 3) { plantTree(x, y, 'apple'); orchardTrees.push({ x, y }); }
  // graveyard
  {
    const gy = REGIONS.graveyard;
    for (let x = gy.x0; x <= gy.x1; x++) { g.set(x, gy.y0, 'fence'); g.set(x, gy.y1, 'fence'); }
    for (let y = gy.y0; y <= gy.y1; y++) { g.set(gy.x0, y, 'fence'); g.set(gy.x1, y, 'fence'); }
    for (let y = gy.y0 + 1; y < gy.y1; y++) for (let x = gy.x0 + 1; x < gy.x1; x++) g.set(x, y, 'grass', grassVar());
    g.set(54, gy.y1, 'path', 0); // gate

  }
  // farm: fence, farmland, lanes
  {
    const f = REGIONS.farm;
    for (let x = f.x0; x <= f.x1; x++) { g.set(x, f.y0, 'fence'); g.set(x, f.y1, 'fence'); }
    for (let y = f.y0; y <= f.y1; y++) { g.set(f.x0, y, 'fence'); g.set(f.x1, y, 'fence'); }
    for (let y = f.y0 + 1; y < f.y1; y++) for (let x = f.x0 + 1; x < f.x1; x++) if (g.get(x, y) !== 'grass') g.set(x, y, 'grass', grassVar());
    const af = REGIONS.animalField;
    for (let x = af.x0; x <= af.x1; x++) { g.set(x, af.y0, 'fence'); g.set(x, af.y1, 'fence'); }
    for (let y = af.y0; y <= af.y1; y++) { g.set(af.x0, y, 'fence'); g.set(af.x1, y, 'fence'); }
    for (let y = af.y0 + 1; y < af.y1; y++) for (let x = af.x0 + 1; x < af.x1; x++) g.set(x, y, 'grass', rng.chance(0.3) ? 1 : 0);
    g.set(af.x0, 18, 'dirt', 0); // gate
    // a few trees in the south field
    plantTree(86, 41, 'oak'); plantTree(90, 44, 'oak'); plantTree(80, 45, 'birch'); plantTree(75, 40, 'pine');
    for (let x = 84; x <= 90; x += 2) g.set(x, 38, 'flower', rng.int(0, 3));
  }
  // player farm: a low fence on the north side and the lane side
  {
    const p = REGIONS.playerFarm;
    for (let x = p.x0; x <= p.x1; x++) g.set(x, p.y0, 'fence');
    for (let y = p.y0; y <= p.y1; y++) { g.set(p.x0, y, 'fence'); g.set(p.x1, y, 'fence'); }
  }
  // carpenter's yard fence
  {
    const c = REGIONS.carpenterYard;
    for (let x = c.x0; x <= c.x1; x++) { g.set(x, c.y0, 'fence'); g.set(x, c.y1, 'fence'); }
    for (let y = c.y0; y <= c.y1; y++) g.set(c.x1, y, 'fence');
    g.set(c.x0, c.y1, 'grass', 0);
  }

  /* -- 5. roads */
  const jit = (p: Vec, a = 1): Vec => ({ x: p.x + rng.int(-a, a), y: p.y + rng.int(-a, a) });
  const isWater = (x: number, y: number): boolean => { const k = g.get(x, y); return k === 'water' || k === 'deepwater'; };
  const paintLine = (pts: Vec[], width: number, kind: TileKind, variant = () => 0): void => {
    const brush = (x: number, y: number): void => {
      for (let dy = 0; dy < width; dy++) for (let dx = 0; dx < width; dx++) {
        const px = x + dx, py = y + dy;
        if (!g.inBounds(px, py) || isWater(px, py) || g.get(px, py) === 'bridge') continue;
        g.set(px, py, kind, variant());
      }
    };
    for (let i = 0; i < pts.length - 1; i++) {
      let x = pts[i].x, y = pts[i].y;
      const tx = pts[i + 1].x, ty = pts[i + 1].y;
      const dx = Math.abs(tx - x), dy = Math.abs(ty - y), sx = Math.sign(tx - x), sy = Math.sign(ty - y);
      let err = dx - dy;
      brush(x, y);
      while (x !== tx || y !== ty) {
        const e2 = 2 * err;
        let moved = false;
        if (e2 > -dy && x !== tx) { err -= dy; x += sx; brush(x, y); moved = true; }
        if (e2 < dx && y !== ty) { err += dx; y += sy; brush(x, y); }
        if (!moved && x === tx && y === ty) break;
      }
    }
  };
  const path = (pts: Vec[], width = 1): void => paintLine(pts, width, 'path', () => rng.int(0, 3));
  const dirt = (pts: Vec[], width = 1): void => paintLine(pts, width, 'dirt', () => rng.int(0, 3));

  // main east–west road (2 wide) through the square to the river; continues as a farm lane
  path([{ x: 37, y: 36 }, { x: 63, y: 36 }], 2);
  // west road: leaves the square's south-west corner and runs along the festival field to the forest
  path([{ x: 36, y: 38 }, { x: 36, y: 40 }, { x: 24, y: 40 }]);
  dirt([{ x: 66, y: 36 }, { x: 76, y: 36 }, { x: 88, y: 36 }], 2);
  // north–south road: hill lane → north lane → square → south lane, gently winding
  path([{ x: 43, y: 10 }, jit({ x: 42, y: 14 }), { x: 44, y: 18 }, { x: 43, y: 21 }, { x: 43, y: 28 }], 2);
  path([{ x: 43, y: 39 }, { x: 43, y: 48 }], 2);
  // lanes (1 wide)
  path([{ x: 30, y: 10 }, { x: 55, y: 10 }]);
  path([{ x: 28, y: 21 }, { x: 53, y: 21 }]);
  path([{ x: 29, y: 30 }, { x: 37, y: 30 }]);
  path([{ x: 46, y: 43 }, { x: 55, y: 43 }]);
  path([{ x: 22, y: 48 }, { x: 60, y: 48 }]);
  path([{ x: 44, y: 48 }, jit({ x: 47, y: 51 }), { x: 50, y: 54 }, { x: 53, y: 55 }, { x: 61, y: 55 }, { x: 62, y: 55 }]);
  // to the mine
  dirt([{ x: 55, y: 10 }, { x: 57, y: 9 }, { x: 59, y: 7 }]);
  dirt([{ x: 53, y: 21 }, jit({ x: 55, y: 17 }), { x: 55, y: 13 }, { x: 55, y: 10 }]);
  dirt([{ x: 58, y: 17 }, { x: 55, y: 17 }]);
  // forest tracks
  dirt([{ x: 24, y: 40 }, jit({ x: 19, y: 36 }), jit({ x: 13, y: 30 }), { x: 9, y: 22 }, { x: 8, y: 19 }, { x: 11, y: 15 }, { x: 13, y: 14 }]);
  dirt([{ x: 28, y: 21 }, jit({ x: 23, y: 18 }), { x: 17, y: 15 }, { x: 14, y: 14 }]);
  dirt([{ x: 22, y: 48 }, jit({ x: 17, y: 53 }), { x: 13, y: 57 }, { x: 10, y: 59 }]);
  dirt([{ x: 43, y: 48 }, jit({ x: 38, y: 53 }), { x: 32, y: 57 }]);
  // farm lanes
  dirt([{ x: 77, y: 19 }, { x: 77, y: 35 }], 2);
  dirt([{ x: 76, y: 28 }, { x: 86, y: 28 }]);
  dirt([{ x: 72, y: 46 }, { x: 76, y: 46 }, { x: 76, y: 38 }], 2);
  dirt([{ x: 82, y: 18 }, { x: 79, y: 18 }]);
  // farm gates
  g.set(72, 36, 'dirt', 0); g.set(72, 37, 'dirt', 0); g.set(72, 46, 'dirt', 0); g.set(72, 47, 'dirt', 0);
  // bridge_east approach on the village side
  path([{ x: 61, y: 46 }, { x: 61, y: 47 }], 2);
  // plots (after lanes so lanes never eat them)
  const farmPlots: Vec[] = [];
  for (const row of [26, 27, 30, 31]) for (let x = 79; x <= 84; x++) { g.set(x, row, 'farmland', 0); farmPlots.push({ x, y: row }); }
  const playerPlots: Vec[] = [];
  for (const row of [45, 46]) for (let x = 30; x <= 33; x++) { g.set(x, row, 'farmland', 0); playerPlots.push({ x, y: row }); }

  /* -- 6. bridges and the dock */
  const bridgeTiles: Record<string, Vec[]> = { [PLACES.bridge_west]: [], [PLACES.bridge_east]: [] };
  const paintBridge = (id: PlaceId, rows: number[]): void => {
    let lo = Infinity, hi = -Infinity;
    for (const y of rows) { const c = riverCentre(y, jitter), hw = riverHalf(y); lo = Math.min(lo, Math.floor(c - hw - 0.5)); hi = Math.max(hi, Math.ceil(c + hw + 0.5)); }
    for (const y of rows) for (let x = lo - 1; x <= hi + 1; x++) { g.set(x, y, 'bridge', 0); bridgeTiles[id].push({ x, y }); }
  };
  paintBridge(PLACES.bridge_west, [36, 37]);
  paintBridge(PLACES.bridge_east, [46, 47]);
  const dockTiles: Vec[] = [];
  {
    let y0 = 56;
    while (!isWater(61, y0) && !isWater(62, y0) && y0 < 66) y0++;
    for (let y = y0 - 1; y <= y0 + 3; y++) for (const x of [61, 62]) { g.set(x, y, 'bridge', 1); dockTiles.push({ x, y }); }
  }

  /* -- 7. buildings */
  const buildings = new Map<PlaceId, Building>();
  const styleBag = rng.shuffle([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]);
  const roofBag = rng.shuffle([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]);
  BUILDINGS.forEach((spec, bi) => {
    const style = spec.style ?? styleBag[bi], roof = spec.roof ?? roofBag[bi];
    const tiles: Vec[] = [];
    for (let r = 0; r < spec.roofRows; r++) {
      const y = spec.y + r;
      for (let x = spec.x; x < spec.x + spec.w; x++) {
        const v = roof | (r === spec.roofRows - 1 ? 4 : 0) | (r === 0 ? 8 : 0) | (x === spec.x ? 16 : 0) | (x === spec.x + spec.w - 1 ? 32 : 0);
        g.set(x, y, 'roof', v); tiles.push({ x, y });
      }
    }
    const doorY = spec.y + spec.roofRows + spec.wallRows - 1;
    const door = { x: spec.x + spec.doorDx, y: doorY };
    for (let r = 0; r < spec.wallRows; r++) {
      const y = spec.y + spec.roofRows + r;
      for (let x = spec.x; x < spec.x + spec.w; x++) {
        const dx = x - spec.x;
        const window = dx !== spec.doorDx && (dx + r) % 2 === 0 ? 4 : 0;
        const v = style | window | (dx === 0 ? 8 : 0) | (dx === spec.w - 1 ? 16 : 0);
        g.set(x, y, 'wall', v); tiles.push({ x, y });
      }
    }
    g.set(door.x, door.y, 'door', style);
    const interior = { x: door.x, y: door.y - 1 };
    g.interior[g.idx(interior.x, interior.y)] = 1;
    for (let s = 1; s <= spec.stub; s++) {
      const k = g.get(door.x, door.y + s);
      if (k === 'grass' || k === 'flower' || k === 'bush' || k === 'tree' || k === 'sand') g.set(door.x, door.y + s, 'path', rng.int(0, 3));
    }
    buildings.set(spec.id, { spec, style, roof, door, interior, tiles });
  });

  /* -- 8. fences: connectivity variants (N=1, E=2, S=4, W=8) */
  const F = KIND_INDEX.fence;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (g.kind[g.idx(x, y)] !== F) continue;
    const v = (g.is(x, y - 1, 'fence') ? 1 : 0) | (g.is(x + 1, y, 'fence') ? 2 : 0) | (g.is(x, y + 1, 'fence') ? 4 : 0) | (g.is(x - 1, y, 'fence') ? 8 : 0);
    g.setVariant(x, y, v);
  }

  /* -- 9. scattered trees and bushes on open town grass, away from paths and doors */
  const reserved: Rect[] = [REGIONS.square, REGIONS.festival, REGIONS.playerFarm, REGIONS.animalField, REGIONS.graveyard, REGIONS.carpenterYard, REGIONS.orchard, R(74, 13, 82, 22), R(76, 24, 87, 33), R(59, 55, 64, 61), R(58, 8, 66, 12)];
  const clearAround = (x: number, y: number, rad: number): boolean => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const k = g.get(x + dx, y + dy);
      if (k === 'path' || k === 'door' || k === 'wall' || k === 'roof' || k === 'farmland' || k === 'stone' || k === 'bridge' || k === 'dirt') return false;
    }
    return true;
  };
  for (let y = 3; y < MAP_H - 1; y++) for (let x = 8; x < 94; x++) {
    if (g.get(x, y) !== 'grass') continue;
    if (reserved.some((r) => inRect(r, x, y))) continue;
    if (!clearAround(x, y, 1)) continue;
    const r = rng.next();
    if (r < 0.035) plantTree(x, y);
    else if (r < 0.06) g.set(x, y, 'bush', rng.int(0, 3));
    else if (r < 0.075) g.set(x, y, 'flower', rng.int(0, 3));
  }

  g.recomputeWalk();

  const nearestOf = (x0: number, y0: number, pred: (k: TileKind, x: number, y: number) => boolean, radius = 6): Vec => {
    let best: Vec = { x: x0, y: y0 }, bestD = Infinity;
    for (let y = y0 - radius; y <= y0 + radius; y++) for (let x = x0 - radius; x <= x0 + radius; x++) {
      if (!g.inBounds(x, y) || !pred(g.get(x, y), x, y)) continue;
      const d = (x - x0) ** 2 + (y - y0) ** 2;
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
    return best;
  };
  const shoreNear = (x: number, y: number): Vec => nearestOf(x, y, (k, px, py) => k === 'sand' && g.walkable(px, py) && (isWater(px + 1, py) || isWater(px - 1, py) || isWater(px, py + 1) || isWater(px, py - 1)));
  const lakeAnchor = shoreNear(64, 55);
  const lakeBench = nearestOf(66, 54, (k, px, py) => k === 'sand' && g.walkable(px, py) && !(px === lakeAnchor.x && py === lakeAnchor.y));

  /* -- 10. places */
  const places: Place[] = [];
  const tilesOf = (r: Rect, pred: (k: TileKind, x: number, y: number) => boolean = () => true): Vec[] => {
    const out: Vec[] = [];
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (pred(g.get(x, y), x, y)) out.push({ x, y });
    return out;
  };
  const isTreeOrClear = (k: TileKind): boolean => k === 'tree' || k === 'grass' || k === 'dirt' || k === 'bush' || k === 'flower';
  const forestTiles = [...tilesOf(REGIONS.forestNW, isTreeOrClear), ...tilesOf(R(0, 25, 7, 49), isTreeOrClear), ...tilesOf(REGIONS.forestSW, isTreeOrClear), ...tilesOf(R(23, 62, 58, 71), isTreeOrClear)];
  const area = (id: PlaceId, name: string, kind: PlaceKind, tiles: Vec[], anchor: Vec, facilities: string[], extra: Partial<Place> = {}): Place => {
    const p: Place = { id, name, kind, tiles, anchor, facilities, ...extra };
    places.push(p);
    return p;
  };
  const wetOrShore = (k: TileKind): boolean => k === 'water' || k === 'deepwater' || k === 'sand' || k === 'bridge';
  area(PLACES.forest, 'Old Wood', 'nature', forestTiles, { x: 13, y: 14 }, ['trees', 'forage']);
  area(PLACES.meadow, 'Wren Meadow', 'nature', tilesOf(REGIONS.meadow), { x: 15, y: 38 }, ['flowers', 'forage', 'bench']);
  area(PLACES.hill, 'Library Hill', 'nature', tilesOf(REGIONS.hill), { x: 29, y: 11 }, ['view', 'bench']);
  area(PLACES.river, 'Pebble River', 'nature', tilesOf(R(60, 0, 74, 53), wetOrShore), { x: 62, y: 38 }, ['fishing']);
  area(PLACES.lake, 'Stillwater Lake', 'nature', tilesOf(R(56, 52, 95, 71), (k, x, y) => wetOrShore(k) && lakeE(x, y) < 1.7), lakeAnchor, ['fishing', 'bench']);
  area(PLACES.orchard, 'The Orchard', 'nature', tilesOf(REGIONS.orchard), { x: 60, y: 24 }, ['apples', 'beehives']);
  area(PLACES.graveyard, 'Graveyard', 'public', tilesOf(REGIONS.graveyard), { x: 54, y: 7 }, ['graves']);
  area(PLACES.festival_grounds, 'Festival Grounds', 'public', tilesOf(REGIONS.festival), { x: 30, y: 33 }, ['campfire', 'stage', 'maypole']);
  area(PLACES.square, 'Village Square', 'public', tilesOf(REGIONS.square), { x: 41, y: 35 }, ['benches', 'well', 'board']);
  area(PLACES.farm, 'Thornfield Farm', 'farm', tilesOf(REGIONS.farm), { x: 81, y: 28 }, ['plots', 'water', 'animals'], { owner: 'ada', open: [5, 20] });
  area(PLACES.player_farm, 'Your farm', 'farm', tilesOf(REGIONS.playerFarm), { x: 31, y: 44 }, ['plots']);
  area(PLACES.mine, 'Pebblebrook Mine', 'workplace', tilesOf(REGIONS.mine), { x: 61, y: 7 }, ['ore'], { owner: 'greta', open: [7, 17], door: { x: 61, y: 5 }, interior: { x: 61, y: 4 } });
  g.interior[g.idx(61, 4)] = 1;
  area(PLACES.bridge_west, 'West Bridge', 'landmark', bridgeTiles[PLACES.bridge_west], bridgeTiles[PLACES.bridge_west][Math.floor(bridgeTiles[PLACES.bridge_west].length / 4)], []);
  area(PLACES.bridge_east, 'East Bridge', 'landmark', bridgeTiles[PLACES.bridge_east], bridgeTiles[PLACES.bridge_east][Math.floor(bridgeTiles[PLACES.bridge_east].length / 4)], []);
  area(PLACES.dock, 'Fish Dock', 'workplace', dockTiles, dockTiles[dockTiles.length - 2], ['fishing', 'boat'], { owner: 'dov', open: [5, 20] });
  const wellPos = { x: 43, y: 34 }, boardPos = { x: 46, y: 31 };
  area(PLACES.well, 'The Well', 'landmark', [wellPos], { x: wellPos.x, y: wellPos.y + 1 }, ['water']);
  area(PLACES.board, 'Notice Board', 'landmark', [boardPos], { x: boardPos.x, y: boardPos.y + 1 }, ['board']);
  for (const b of buildings.values()) {
    area(b.spec.id, b.spec.name, b.spec.kind, b.tiles, { x: b.door.x, y: b.door.y }, b.spec.facilities,
      { door: b.door, interior: b.interior, ...(b.spec.owner ? { owner: b.spec.owner } : {}), ...(b.spec.open ? { open: b.spec.open } : {}) });
  }
  places.forEach((p, i) => { for (const t of p.tiles) if (g.inBounds(t.x, t.y)) g.placeIdx[g.idx(t.x, t.y)] = i; });

  /* -- 11. objects. Blocking kinds close their tile immediately so later placements see them. */
  const plotState = (owner: PlotState['owner']): PlotState => ({ state: 'empty', growth: 0, watered: false, daysSincePlant: 0, stage: 0, owner });
  // farm plots: Ada's field is already half planted so the farm looks alive
  const seasonal: Record<Season, ItemId[]> = { spring: ['turnip', 'potato', 'strawberry'], summer: ['corn', 'tomato', 'wheat', 'sunflower'], autumn: ['pumpkin', 'wheat', 'corn', 'cabbage'], winter: ['cabbage'] };
  farmPlots.forEach((p, i) => {
    const st = plotState('ada');
    if (i < 12) { st.state = 'planted'; st.crop = seasonal[season][i % seasonal[season].length]; st.daysSincePlant = rng.int(0, 2); st.growth = Math.min(0.6, st.daysSincePlant * 0.2); st.stage = Math.floor(st.growth * 3); }
    else if (i < 18) st.state = 'tilled';
    obj('plot', p.x, p.y, st as unknown as Record<string, unknown>, PLACES.farm);
  });
  for (const p of playerPlots) obj('plot', p.x, p.y, plotState('player') as unknown as Record<string, unknown>, PLACES.player_farm);

  // landmarks and furniture
  obj('well', wellPos.x, wellPos.y, { name: 'The Well' }, PLACES.square);
  obj('board', boardPos.x, boardPos.y, { name: 'Notice Board' }, PLACES.square);
  obj('bench', 39, 32, { facing: 'down' }, PLACES.square); obj('bench', 47, 32, { facing: 'down' }, PLACES.square); obj('bench', 39, 35, { facing: 'right' }, PLACES.square); obj('bench', 47, 35, { facing: 'left' }, PLACES.square);
  obj('bench', 29, 12, { facing: 'down', view: 'village' }, PLACES.hill);
  obj('bench', lakeBench.x, lakeBench.y, { facing: 'down', view: 'lake' }, PLACES.lake);
  obj('bench', 14, 35, { facing: 'down', view: 'meadow' }, PLACES.meadow);
  obj('bench', 26, 33, { facing: 'right' }, PLACES.festival_grounds);
  obj('campfire', 30, 35, { lit: false }, PLACES.festival_grounds);
  obj('decoration', 30, 32, { kind: 'stage' }, PLACES.festival_grounds);
  obj('decoration', 34, 35, { kind: 'maypole' }, PLACES.festival_grounds);
  obj('shrine', 49, 8, { name: 'Wayside shrine', offerings: 0 }, PLACES.chapel);
  obj('flowerbed', 49, 7, { colour: 2 }, PLACES.chapel);
  for (const [x, y] of [[38, 31], [48, 31], [39, 38], [48, 38]] as [number, number][]) obj('flowerbed', x, y, { colour: rng.int(0, 3) }, PLACES.square);
  for (const [x, y] of [[37, 31], [49, 31], [38, 38], [49, 38]] as [number, number][]) obj('lantern', x, y, { lit: false }, PLACES.square);
  for (const [x, y] of [[25, 32], [35, 32], [25, 39], [35, 39]] as [number, number][]) obj('lantern', x, y, { lit: false, festival: true }, PLACES.festival_grounds);
  obj('lantern', 60, 54, { lit: false }, PLACES.dock); obj('lantern', 63, 54, { lit: false }, PLACES.lake);
  // signs
  obj('sign', 36, 36, { text: SIGNS.square }, PLACES.square);
  obj('sign', 73, 35, { text: SIGNS.farm }, PLACES.farm);
  obj('sign', 58, 8, { text: SIGNS.mine }, PLACES.mine);
  obj('sign', 60, 56, { text: SIGNS.dock }, PLACES.dock);
  obj('sign', 23, 35, { text: SIGNS.forest }, PLACES.forest);
  obj('sign', 45, 22, { text: SIGNS.hill });
  obj('sign', 54, 11, { text: SIGNS.graveyard }, PLACES.graveyard);
  obj('sign', 24, 46, { text: SIGNS.player }, PLACES.player_farm);
  obj('sign', 36, 41, { text: SIGNS.festival }, PLACES.festival_grounds);
  obj('sign', 57, 22, { text: SIGNS.orchard }, PLACES.orchard);
  obj('sign', 10, 27, { text: SIGNS.meadow }, PLACES.meadow);
  // barrels and crates near shops and the dock
  obj('barrel', 37, 29, { contents: 'water' }, PLACES.smithy); obj('crate', 32, 29, { contents: 'coal' }, PLACES.smithy);
  obj('decoration', 32, 28, { kind: 'anvil' }, PLACES.smithy);
  obj('crate', 38, 28, { contents: 'goods' }, PLACES.store); obj('barrel', 38, 29, { contents: 'apples' }, PLACES.store);
  obj('barrel', 49, 29, { contents: 'flour' }, PLACES.bakery); obj('crate', 49, 28, { contents: 'bread' }, PLACES.bakery);
  obj('barrel', 52, 35, { contents: 'ale' }, PLACES.tavern); obj('barrel', 57, 35, { contents: 'ale' }, PLACES.tavern); obj('decoration', 57, 34, { kind: 'table' }, PLACES.tavern);
  obj('crate', 64, 55, { contents: 'fish' }, PLACES.dock); obj('barrel', 59, 54, { contents: 'bait' }, PLACES.dock);
  obj('decoration', 63, 60, { kind: 'boat' }, PLACES.dock);
  obj('crate', 75, 19, { contents: 'hay' }, PLACES.barn); obj('decoration', 80, 19, { kind: 'haybale' }, PLACES.barn); obj('decoration', 81, 20, { kind: 'haybale' }, PLACES.barn);
  obj('decoration', 86, 29, { kind: 'scarecrow' }, PLACES.farm);
  obj('decoration', 79, 33, { kind: 'trough' }, PLACES.farm);
  obj('decoration', 88, 17, { kind: 'trough' }, PLACES.barn);
  obj('crate', 58, 40, { contents: 'planks' }, PLACES.carpenter); obj('decoration', 60, 42, { kind: 'logs' }, PLACES.carpenter); obj('decoration', 60, 40, { kind: 'sawhorse' }, PLACES.carpenter);
  obj('stump', 58, 42, { seat: true }, PLACES.carpenter);
  obj('decoration', 59, 27, { kind: 'beehive', honey: 1 }, PLACES.orchard); obj('decoration', 62, 27, { kind: 'beehive', honey: 1 }, PLACES.orchard);
  obj('decoration', 64, 7, { kind: 'minecart' }, PLACES.mine); obj('crate', 64, 9, { contents: 'ore' }, PLACES.mine);
  obj('decoration', 55, 54, { kind: 'nets' }, PLACES.home_dov);
  obj('decoration', 29, 46, { kind: 'mailbox' }, PLACES.player_farm);
  obj('flowerbed', 30, 43, { colour: 1 }, PLACES.player_farm);
  obj('flowerbed', 33, 20, { colour: 3 }, PLACES.clinic); obj('flowerbed', 38, 20, { colour: 0 }, PLACES.clinic);
  obj('flowerbed', 46, 20, { colour: 2 }, PLACES.home_cerys); obj('flowerbed', 50, 20, { colour: 1 }, PLACES.home_cerys);
  obj('flowerbed', 28, 29, { colour: 1 }, PLACES.home_bram);
  obj('flowerbed', 73, 33, { colour: 2 }, PLACES.home_ada);
  // graves: odd columns, even rows, so every stone has a walkable side and the gate column (54) stays clear
  GRAVES.forEach((name, i) => obj('decoration', 51 + (i % 3) * 2, 4 + Math.floor(i / 3) * 2, { kind: 'gravestone', name }, PLACES.graveyard));
  // animals in the field
  const afr = REGIONS.animalField;
  const animalSpots = rng.shuffle(tilesOf(R(afr.x0 + 2, afr.y0 + 1, afr.x1 - 1, afr.y1 - 1), (k, x, y) => k === 'grass' && !occupied.has(g.idx(x, y))));
  const herd: Vec[] = [];
  for (const a of ANIMALS) {
    const p = animalSpots.find((c) => !herd.some((h) => Math.abs(h.x - c.x) + Math.abs(h.y - c.y) < 2) && !occupied.has(g.idx(c.x, c.y))) ?? animalSpots[herd.length];
    herd.push(p);
    obj('animal', p.x, p.y, { species: a.species, name: a.name, produce: a.produce, fed: false, mood: 1, home: { x: p.x, y: p.y } }, PLACES.barn);
  }
  // counters and beds parked on interior tiles, so tools can find them by place
  for (const b of buildings.values()) {
    if (b.spec.kind === 'home') obj('bed', b.interior.x, b.interior.y, { owner: b.spec.owner ?? 'player' }, b.spec.id);
    else if (b.spec.facilities.includes('counter')) obj('counter', b.interior.x, b.interior.y, { shop: b.spec.id }, b.spec.id);
  }
  // lanterns along the roads
  {
    let n = 0;
    for (let y = 4; y < MAP_H - 2 && n < 22; y++) for (let x = 2; x < MAP_W - 2 && n < 22; x++) {
      if (g.get(x, y) !== 'path' || ((x * 7 + y * 13) % 29) !== 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const lx = x + dx, ly = y + dy;
        if (g.get(lx, ly) !== 'grass' || occupied.has(g.idx(lx, ly))) continue;
        if (g.get(lx, ly + 1) === 'door' || g.get(lx, ly - 1) === 'door' || g.get(lx + 1, ly) === 'door' || g.get(lx - 1, ly) === 'door') continue;
        // never narrow a 1-wide lane: the lantern tile must not be the only link between two walkable tiles
        obj('lantern', lx, ly, { lit: false }); n++; break;
      }
    }
  }

  /* -- 12. reachability from the square: nature objects only where a villager can actually get to */
  const reach = new Uint8Array(MAP_W * MAP_H);
  {
    const q: number[] = [g.idx(41, 35)];
    reach[q[0]] = 1;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % MAP_W, y = (i - x) / MAP_W;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (!g.inBounds(nx, ny)) continue;
        const j = g.idx(nx, ny);
        if (!reach[j] && g.walk[j]) { reach[j] = 1; q.push(j); }
      }
    }
  }
  const reachableNeighbour = (x: number, y: number): boolean =>
    (g.inBounds(x - 1, y) && reach[g.idx(x - 1, y)] === 1) || (g.inBounds(x + 1, y) && reach[g.idx(x + 1, y)] === 1) ||
    (g.inBounds(x, y - 1) && reach[g.idx(x, y - 1)] === 1) || (g.inBounds(x, y + 1) && reach[g.idx(x, y + 1)] === 1);

  // outdoor anchors must be reachable; nudge any that a bush or crate ended up on
  for (const p of places) {
    if (p.door) continue;
    if (reach[g.idx(p.anchor.x, p.anchor.y)]) continue;
    let best: Vec | null = null, bestD = Infinity;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = p.anchor.x + dx, y = p.anchor.y + dy;
      if (!g.inBounds(x, y) || !reach[g.idx(x, y)]) continue;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
    if (best) p.anchor = best;
  }

  // trees that can be reached become objects with wood
  const T = KIND_INDEX.tree;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (g.kind[g.idx(x, y)] !== T || !reachableNeighbour(x, y)) continue;
    const v = g.getVariant(x, y);
    const type = (Object.keys(TREE_VARIANT) as TreeType[]).find((t) => TREE_VARIANT[t] === v) ?? 'oak';
    const inOrchard = inRect(REGIONS.orchard, x, y);
    const place = inOrchard ? PLACES.orchard : g.placeIdx[g.idx(x, y)] >= 0 ? places[g.placeIdx[g.idx(x, y)]].id : undefined;
    const data: Record<string, unknown> = { type, wood: rng.int(3, 6), maxWood: 6, regrow: 0 };
    if (type === 'apple') { data.fruit = season === 'autumn' || season === 'summer' ? rng.int(1, 3) : 0; data.maxFruit = 3; data.choppable = false; }
    obj('tree', x, y, data, place);
  }
  // ore rocks in and around the mine pocket, plus boulders on the ridge
  const RK = KIND_INDEX.rock;
  const rollOre = (): { ore: string; hp: number } => {
    const r = rng.next();
    const ore = r < 0.45 ? 'stone' : r < 0.75 ? 'copper_ore' : r < 0.93 ? 'iron_ore' : 'gold_ore';
    return { ore, hp: ore === 'stone' ? 2 : ore === 'gold_ore' ? 5 : rng.int(3, 4) };
  };
  const oreVariant: Record<string, number> = { stone: 0, copper_ore: 1, iron_ore: 2, gold_ore: 3 };
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (g.kind[g.idx(x, y)] !== RK || !reachableNeighbour(x, y)) continue;
    const inMine = inRect(REGIONS.mine, x, y);
    if (!inMine && !rng.chance(0.25)) continue;
    const o = inMine ? rollOre() : { ore: 'stone', hp: 2 };
    g.setVariant(x, y, oreVariant[o.ore]);
    obj('rock', x, y, { ore: o.ore, hp: o.hp, maxHp: o.hp, depleted: false }, inMine ? PLACES.mine : undefined);
  }
  // fish spots: reachable shore tiles next to water, spaced out
  {
    const spots: Vec[] = [];
    const far = (x: number, y: number, d: number): boolean => spots.every((s) => Math.abs(s.x - x) + Math.abs(s.y - y) >= d);
    for (let y = 4; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
      const i = g.idx(x, y);
      if (!reach[i] || occupied.has(i) || g.get(x, y) === 'bridge') continue;
      const nearWater = isWater(x - 1, y) || isWater(x + 1, y) || isWater(x, y - 1) || isWater(x, y + 1);
      if (!nearWater || !far(x, y, 6) || !rng.chance(0.6)) continue;
      const isLake = lakeE(x, y) < 1.8;
      spots.push({ x, y });
      obj('fishspot', x, y, { water: isLake ? 'lake' : 'river', table: FISH_TABLES[isLake ? 'lake' : 'river'] }, isLake ? PLACES.lake : PLACES.river);
    }
    // the end of the dock is the best spot
    const end = dockTiles[dockTiles.length - 1];
    obj('fishspot', end.x, end.y, { water: 'lake', table: FISH_TABLES.lake, bonus: 1.2 }, PLACES.dock);
  }
  // forage spots
  {
    const spots: Vec[] = [];
    const far = (x: number, y: number, d: number): boolean => spots.every((s) => Math.abs(s.x - x) + Math.abs(s.y - y) >= d);
    const areas: [Rect, ForageArea, number, PlaceId][] = [
      [REGIONS.forestNW, 'forest', 12, PLACES.forest], [REGIONS.forestSW, 'forest', 8, PLACES.forest], [R(23, 52, 58, 71), 'forest', 6, PLACES.forest],
      [REGIONS.meadow, 'meadow', 10, PLACES.meadow], [REGIONS.hill, 'hill', 6, PLACES.hill], [REGIONS.orchard, 'orchard', 4, PLACES.orchard],
      [R(56, 52, 92, 71), 'shore', 4, PLACES.lake],
    ];
    for (const [r, kind, count, place] of areas) {
      const cands = rng.shuffle(tilesOf(r, (k, x, y) => (k === 'grass' || k === 'flower' || k === 'sand') && reach[g.idx(x, y)] === 1 && !occupied.has(g.idx(x, y)) && clearAround(x, y, 1)));
      let placed = 0;
      for (const c of cands) {
        if (placed >= count) break;
        if (!far(c.x, c.y, 3)) continue;
        spots.push(c); placed++;
        obj('forage', c.x, c.y, { area: kind, item: null, qty: 0 }, place);
      }
    }
  }

  return { places, objects, buildings, seasonPlantedAt: season };
}
