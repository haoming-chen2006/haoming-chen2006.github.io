import type { SpriteRect } from '../core/app.ts';
import type { Season, TileKind } from '../core/types.ts';
import type { Atlas } from '../art/atlas.ts';
import { BUILDING_PIECE, DETAIL, E, GROUND, N, NE, NW, S, SE, SW, W } from '../art/catalogue.ts';
import { ctx2d, makeCanvas } from '../art/pixel.ts';
import { bridgeSprite, buildingPiece, doorSprite, fenceSprite, mineMouth, roofSetForColour, tileSprite, wallSetForStyle, windowSprite } from '../art/tiles.ts';
import type { WallSet } from '../art/catalogue.ts';
import { STRIDE, T } from '../art/atlas.ts';
import { describe, hash2, inBounds, TILE, type TileInfo, type WorldExt } from './common.ts';

/**
 * Ground layer cache. The map is split into 16×16-tile chunks; each chunk is baked once (per season)
 * into a 256×256 canvas holding terrain, details, walls, doors, fences and bridges. Roofs, windows,
 * chimneys and water tiles are recorded as lists so the frame loop can draw them separately
 * (overhead pass, night-lit windows, smoke emitters, animated water).
 */

export const CHUNK = 16;

export interface RoofTile { x: number; y: number; sprite: SpriteRect; placeId?: string }
export interface WindowTile { x: number; y: number; set: WallSet }
export interface Chimney { x: number; y: number; placeId?: string }
export interface WaterTile { x: number; y: number; kind: 'water' | 'deepwater'; mask: number; variant: number }

export interface Chunk {
  cx: number; cy: number;
  canvas: HTMLCanvasElement;
  season: Season;
  roofs: RoofTile[];
  windows: WindowTile[];
  chimneys: Chimney[];
  water: WaterTile[];
  /** lit glows at night (smithy forge etc.) found while baking */
  dirty: boolean;
}

const BUILDING: Set<string> = new Set(['wall', 'roof', 'door']);

let chimneyCanvas: HTMLCanvasElement | null = null;
/** a small stone chimney drawn at the top-right of a roof tile (transparent elsewhere) */
function chimneySprite(): SpriteRect {
  if (!chimneyCanvas) {
    chimneyCanvas = makeCanvas(TILE, TILE);
    const g = ctx2d(chimneyCanvas);
    g.fillStyle = '#5a5560'; g.fillRect(10, 1, 4, 7);
    g.fillStyle = '#7a7480'; g.fillRect(10, 1, 3, 1); g.fillRect(10, 2, 1, 5);
    g.fillStyle = '#3a3640'; g.fillRect(9, 0, 6, 1); g.fillRect(13, 2, 1, 6);
    g.fillStyle = '#2f2a30'; g.fillRect(11, 1, 2, 1);
  }
  return { img: chimneyCanvas, sx: 0, sy: 0, sw: TILE, sh: TILE };
}
const WATERY: Set<string> = new Set(['water', 'deepwater', 'bridge']);
const DIRTY: Set<string> = new Set(['dirt', 'path', 'bridge', 'door', 'stone']);
const STONY: Set<string> = new Set(['stone', 'path', 'bridge', 'door', 'floor', 'rock', 'prop']);
const SANDY: Set<string> = new Set(['sand', 'water', 'deepwater']);
const GRASS_UNDER: Set<string> = new Set(['grass', 'flower', 'tree', 'bush', 'fence', 'farmland', 'path', 'dirt', 'stone', 'sand', 'water', 'deepwater', 'bridge', 'rock', 'prop']);

function joins(kind: TileKind, other: TileKind): boolean {
  switch (kind) {
    case 'water': case 'deepwater': return WATERY.has(other);
    case 'dirt': case 'path': return DIRTY.has(other);
    case 'stone': return STONY.has(other);
    case 'sand': return SANDY.has(other);
    case 'farmland': return other === 'farmland';
    case 'fence': return other === 'fence';
    case 'rock': return other === 'rock' || other === 'prop';
    case 'bridge': return WATERY.has(other);
    default: return other === kind;
  }
}

export class GroundCache {
  private atlas: Atlas;
  private world: WorldExt;
  private chunks = new Map<string, Chunk>();
  /** tiles holding a tree/rock object (the object draws it, the chunk must not) */
  private occupied = new Map<number, string>();
  private occupiedCount = -1;
  /** chunks (re)baked this frame, to spread work */
  bakedThisFrame = 0;
  maxBakesPerFrame = 3;

  constructor(atlas: Atlas, world: WorldExt) { this.atlas = atlas; this.world = world; }

  private refreshOccupied(): void {
    const objs = this.world.objects;
    if (objs.length === this.occupiedCount) return;
    this.occupied.clear();
    for (const o of objs) if (o.kind === 'tree' || o.kind === 'rock') this.occupied.set(o.pos.y * this.world.width + o.pos.x, o.kind);
    this.occupiedCount = objs.length;
  }

  invalidate(x?: number, y?: number, w = 1, h = 1): void {
    this.occupiedCount = -1;
    if (x === undefined || y === undefined) { for (const c of this.chunks.values()) c.dirty = true; return; }
    const cx0 = Math.floor((x - 1) / CHUNK), cy0 = Math.floor((y - 1) / CHUNK), cx1 = Math.floor((x + w) / CHUNK), cy1 = Math.floor((y + h) / CHUNK);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const c = this.chunks.get(`${cx},${cy}`); if (c) c.dirty = true; }
  }

  beginFrame(): void { this.bakedThisFrame = 0; }

  /** the chunk if it is baked (or can be baked within this frame's budget), else null */
  get(cx: number, cy: number, season: Season, force = false): Chunk | null {
    const key = `${cx},${cy}`;
    let c = this.chunks.get(key);
    if (c && !c.dirty && c.season === season) return c;
    if (!force && this.bakedThisFrame >= this.maxBakesPerFrame) return c && c.season === season ? c : null;
    this.bakedThisFrame++;
    if (!c) { c = { cx, cy, canvas: makeCanvas(CHUNK * TILE, CHUNK * TILE), season, roofs: [], windows: [], chimneys: [], water: [], dirty: true }; this.chunks.set(key, c); }
    this.refreshOccupied();
    this.bake(c, season);
    return c;
  }

  /** neighbour mask of tiles joining `kind` around (x,y); off-map counts as joining */
  mask(x: number, y: number, kind: TileKind): number {
    const w = this.world;
    const same = (nx: number, ny: number) => !inBounds(w, nx, ny) || joins(kind, w.tile(nx, ny));
    let m = 0;
    if (same(x, y - 1)) m |= N; if (same(x + 1, y - 1)) m |= NE; if (same(x + 1, y)) m |= E; if (same(x + 1, y + 1)) m |= SE;
    if (same(x, y + 1)) m |= S; if (same(x - 1, y + 1)) m |= SW; if (same(x - 1, y)) m |= W; if (same(x - 1, y - 1)) m |= NW;
    return m;
  }

  private blit(g: CanvasRenderingContext2D, s: SpriteRect | null, px: number, py: number): void {
    if (!s) return;
    g.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, px + (s.ox ?? 0) * TILE, py + (s.oy ?? 0) * TILE, s.sw, s.sh);
  }

  private bake(c: Chunk, season: Season): void {
    const w = this.world, atlas = this.atlas;
    const g = ctx2d(c.canvas);
    g.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.roofs = []; c.windows = []; c.chimneys = []; c.water = [];
    c.season = season; c.dirty = false;
    const tx0 = c.cx * CHUNK, ty0 = c.cy * CHUNK;
    const kindAt = (x: number, y: number): TileKind => (inBounds(w, x, y) ? w.tile(x, y) : 'void');
    for (let j = 0; j < CHUNK; j++) {
      for (let i = 0; i < CHUNK; i++) {
        const x = tx0 + i, y = ty0 + j;
        const px = i * TILE, py = j * TILE;
        if (!inBounds(w, x, y)) { g.fillStyle = '#101614'; g.fillRect(px, py, TILE, TILE); continue; }
        const info = describe(w, x, y);
        const kind = info.kind;
        const variant = info.variant | 0;
        const h = hash2(x, y);
        // 1. ground under everything
        if (kind === 'void') { g.fillStyle = '#101614'; g.fillRect(px, py, TILE, TILE); continue; }
        if (kind === 'rock' || kind === 'prop') { this.blit(g, tileSprite(atlas, 'grass', Math.floor(h * 10), season, 255, 0), px, py); this.blit(g, tileSprite(atlas, 'stone', 0, season, this.mask(x, y, 'rock') , 0), px, py); }
        else if (GRASS_UNDER.has(kind)) this.blit(g, tileSprite(atlas, 'grass', Math.floor(h * 10), season, 255, 0), px, py);
        else if (kind === 'floor') this.blit(g, atlas.ref(GROUND.floorWood[variant % 5]), px, py);
        else if (BUILDING.has(kind)) { this.blit(g, atlas.ref(GROUND.floorWood[variant % 5]), px, py); g.fillStyle = 'rgba(20,12,8,0.55)'; g.fillRect(px, py, TILE, TILE); }
        // 2. the tile itself
        switch (kind) {
          case 'grass': {
            this.decorate(g, x, y, px, py, season);
            break;
          }
          case 'water': case 'deepwater': {
            const mask = this.mask(x, y, kind);
            const depthDeep = kind === 'deepwater' || (info.depth ?? 0) > 0.6;
            this.blit(g, tileSprite(atlas, 'water', variant, season, mask, 0), px, py);
            if (depthDeep) this.blit(g, atlas.autotile('deep', this.mask(x, y, 'deepwater'), season), px, py);
            c.water.push({ x, y, kind: depthDeep ? 'deepwater' : 'water', mask, variant });
            break;
          }
          case 'tree':
            if (this.occupied.get(y * w.width + x) !== 'tree') this.blit(g, tileSprite(atlas, 'tree', variant, season, 255, 0), px, py);
            break;
          case 'rock':
            if (this.occupied.get(y * w.width + x) !== 'rock') this.blit(g, tileSprite(atlas, 'rock', variant, season, Math.floor(h * 3), 0), px, py);
            break;
          case 'prop': {
            const hasW = kindAt(x - 1, y) === 'prop', hasE = kindAt(x + 1, y) === 'prop';
            this.blit(g, mineMouth(hasW && hasE ? 1 : hasE ? 0 : hasW ? 2 : 1), px, py);
            break;
          }
          case 'dirt': case 'path': case 'stone': case 'sand': case 'farmland':
            this.blit(g, tileSprite(atlas, kind, variant, season, this.mask(x, y, kind), 0), px, py);
            if (kind === 'path' && season === 'autumn' && h < 0.08) this.blit(g, atlas.ref(DETAIL.leaf[Math.floor(h * 100) % 2]), px, py);
            break;
          case 'bridge': {
            const wm = this.mask(x, y, 'water');
            const runsEW = variant !== 1;
            const startEnd = runsEW ? (kindAt(x - 1, y) !== 'bridge' ? 'start' : kindAt(x + 1, y) !== 'bridge' ? 'finish' : 'none') : (kindAt(x, y - 1) !== 'bridge' ? 'start' : kindAt(x, y + 1) !== 'bridge' ? 'finish' : 'none');
            this.blit(g, tileSprite(atlas, 'water', variant, season, wm | (runsEW ? E | W : N | S), 0), px, py);
            this.blit(g, bridgeSprite(atlas, runsEW, startEnd), px, py);
            break;
          }
          case 'fence': this.blit(g, fenceSprite(atlas, this.mask(x, y, 'fence')), px, py); break;
          case 'flower': this.blit(g, tileSprite(atlas, 'flower', variant || Math.floor(h * 3), season, 255, 0), px, py); break;
          case 'floor': break;
          case 'wall': case 'door': this.bakeWall(g, c, info, x, y, px, py); break;
          case 'roof': this.bakeRoof(c, info, x, y); break;
          default: this.blit(g, tileSprite(atlas, kind, variant, season, 255, 0), px, py); break;
        }
      }
    }
  }

  private decorate(g: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, season: Season): void {
    const h = hash2(x, y, 7), h2 = hash2(x, y, 11);
    const atlas = this.atlas;
    if (season === 'winter') { if (h < 0.03) this.blit(g, atlas.ref(GROUND.grassStones[0], season), px, py); return; }
    if (season === 'autumn' && h < 0.07) { this.blit(g, atlas.ref(DETAIL.fallenLeaves[Math.floor(h2 * 8)]), px, py); return; }
    if (h < 0.05) this.blit(g, atlas.ref(DETAIL.sprout[Math.floor(h2 * 2)], season), px, py);
    else if (h < 0.06) this.blit(g, atlas.ref(DETAIL.leaf[Math.floor(h2 * 2)], season), px, py);
    else if (h < (season === 'summer' ? 0.09 : season === 'spring' ? 0.085 : 0.07)) {
      const flowers = season === 'summer' ? [DETAIL.flowerSingleRed, DETAIL.flowerSingleBlue, DETAIL.flowerSinglePurple] : [DETAIL.flowerSingleWhite, DETAIL.flowerSingleBlue, DETAIL.flowerSingleRed];
      this.blit(g, atlas.ref(flowers[Math.floor(h2 * 3)][0], season), px, py);
    } else if (h < 0.078 && season !== 'summer') this.blit(g, atlas.ref(DETAIL.mushroomBrown[Math.floor(h2 * 4)]), px, py);
  }

  private wallSet(info: TileInfo): WallSet { return wallSetForStyle((info.style ?? info.variant) & 3); }
  private roofSet(info: TileInfo): WallSet { return roofSetForColour((info.colour ?? info.style ?? info.variant) & 3); }

  private isBuilding(x: number, y: number): boolean { return inBounds(this.world, x, y) && BUILDING.has(this.world.tile(x, y)); }
  private isWallish(x: number, y: number): boolean { if (!inBounds(this.world, x, y)) return false; const k = this.world.tile(x, y); return k === 'wall' || k === 'door'; }

  private bakeWall(g: CanvasRenderingContext2D, c: Chunk, info: TileInfo, x: number, y: number, px: number, py: number): void {
    const atlas = this.atlas;
    const set = this.wallSet(info);
    const bottom = !this.isBuilding(x, y + 1);
    const wallRows = this.isWallish(x, y - 1) || this.isWallish(x, y + 1) ? 2 : 1;
    const underRoof = inBounds(this.world, x, y - 1) && this.world.tile(x, y - 1) === 'roof';
    // a beam row right under the eave when the wall is two rows tall; plank walls for the wooden set
    const piece = underRoof && !bottom ? 'wallBand' : set === 'brown' ? 'wallColumns' : (hash2(x, y, 5) < 0.5 ? 'wallPlain' : 'wallPlain2');
    this.blit(g, buildingPiece(atlas, set, piece), px, py);
    if (info.kind === 'door') { this.blit(g, doorSprite(atlas, set), px, py); return; }
    // windows: on the upper wall row of two-row walls, or the only row; every other column, never beside a door
    const windowRow = wallRows === 2 ? !bottom : bottom;
    let hasWindow = info.window === true;
    if (!hasWindow && info.window === undefined && windowRow) {
      // find the start of this wall run for a stable alternation
      let x0 = x; while (this.isWallish(x0 - 1, y)) x0--;
      let x1 = x; while (this.isWallish(x1 + 1, y)) x1++;
      const runLen = x1 - x0 + 1;
      const idx = x - x0;
      // on the ground row keep clear of the door and its neighbours; on the upper row only the door column itself
      const nearDoor = bottom
        ? [x - 1, x, x + 1].some((nx) => inBounds(this.world, nx, y) && this.world.tile(nx, y) === 'door')
        : inBounds(this.world, x, y + 1) && this.world.tile(x, y + 1) === 'door';
      hasWindow = runLen >= 3 && idx > 0 && idx < runLen - 1 && idx % 2 === 1 && !nearDoor;
    }
    if (hasWindow) { this.blit(g, windowSprite(atlas, set, false), px, py); c.windows.push({ x, y, set }); }
  }

  private bakeRoof(c: Chunk, info: TileInfo, x: number, y: number): void {
    const atlas = this.atlas;
    const set = this.roofSet(info);
    const w = this.world;
    const isRoof = (nx: number, ny: number) => inBounds(w, nx, ny) && w.tile(nx, ny) === 'roof';
    const top = info.roofRidge ?? !isRoof(x, y - 1), bottom = (typeof info.roofEdge === 'boolean' ? info.roofEdge : undefined) ?? !isRoof(x, y + 1);
    const left = info.edgeLeft ?? !isRoof(x - 1, y), right = info.edgeRight ?? !isRoof(x + 1, y);
    let piece: keyof typeof BUILDING_PIECE;
    if (top) piece = left && right ? 'roofPeak' : left ? 'roofSlopeL' : right ? 'roofSlopeR' : (hash2(x, y, 9) < 0.5 ? 'roofBody' : 'roofBody2');
    else if (bottom) piece = 'roofFlatLine';
    else piece = hash2(x, y, 9) < 0.5 ? 'roofBody' : 'roofBody2';
    const placeId = info.placeId ?? w.placeAt({ x, y })?.id;
    c.roofs.push({ x, y, sprite: buildingPiece(atlas, set, piece), placeId });
    // chimney on the top row, second tile from the right of the run (homes and workshops only)
    if (top && !right && isRoof(x + 1, y) && !isRoof(x + 2, y) && !bottom) {
      c.chimneys.push({ x, y, placeId });
      c.roofs.push({ x, y, sprite: chimneySprite(), placeId });
    }
  }

  /** draw a sheet tile directly (used by the frame loop for water overlays) */
  drawSheet(g: CanvasRenderingContext2D, img: HTMLCanvasElement, col: number, row: number, dx: number, dy: number, size: number): void {
    g.drawImage(img, col * STRIDE, row * STRIDE, T, T, dx, dy, size, size);
  }
}
