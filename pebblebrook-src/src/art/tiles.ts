import type { SpriteRect } from '../core/app.ts';
import type { Season } from '../core/types.ts';
import { STRIDE, T, type Atlas } from './atlas.ts';
import { BUILDING_PIECE, BUSHES, DETAIL, DOOR_FOR_SET, E, GROUND, N, PROPS, ROOF_COLOURS, S, TREES, W, WALL_SET_COLS, WALL_STYLES, WINDOW_FOR_SET, type TileRef, type WallSet } from './catalogue.ts';
import { ctx2d, makeCanvas, rgbToHsl } from './pixel.ts';

/** Terrain, building pieces, doors/windows, fences and bridges as SpriteRects. */

const baked = new Map<string, HTMLCanvasElement>();

function pick<Tv>(arr: readonly Tv[], variant: number): Tv { return arr[((variant % arr.length) + arr.length) % arr.length]; }

export function wallSetForStyle(style: number): WallSet { return pick(WALL_STYLES, style); }
export function roofSetForColour(colour: number): WallSet { return pick(ROOF_COLOURS, colour); }

export function buildingPiece(atlas: Atlas, set: WallSet, piece: keyof typeof BUILDING_PIECE, season: Season = 'spring'): SpriteRect {
  const [dc, dr] = BUILDING_PIECE[piece] ?? BUILDING_PIECE.wallPlain;
  return atlas.ref([WALL_SET_COLS[set] + dc, dr], season);
}

export function doorSprite(atlas: Atlas, set: WallSet): SpriteRect { return atlas.ref(DOOR_FOR_SET[set]); }
export function windowSprite(atlas: Atlas, set: WallSet, lit: boolean): SpriteRect { const w = WINDOW_FOR_SET[set]; return atlas.ref(lit ? w.night : w.day); }

/** deep water: the plain water tile darkened, per season and water frame */
function deepWater(atlas: Atlas, season: Season, frame: number, variant: number): SpriteRect {
  const key = `deep|${season}|${frame}|${variant % 2}`;
  let c = baked.get(key);
  if (!c) {
    c = makeCanvas(T, T);
    const g = ctx2d(c);
    const r = pick(GROUND.waterPlain ?? [[0, 0], [1, 0]], variant) as TileRef;
    g.drawImage(atlas.water[season][frame], r[0] * STRIDE, r[1] * STRIDE, T, T, 0, 0, T, T);
    g.fillStyle = 'rgba(16, 60, 120, 0.28)';
    g.fillRect(0, 0, T, T);
    baked.set(key, c);
  }
  return { img: c, sx: 0, sy: 0, sw: T, sh: T };
}

/** a bridge tile: planks with rails; `horizontal` = the bridge runs east-west */
export function bridgeSprite(atlas: Atlas, horizontal: boolean, end: 'none' | 'start' | 'finish' = 'none'): SpriteRect {
  const key = `bridge|${horizontal}|${end}`;
  let c = baked.get(key);
  if (!c) {
    c = makeCanvas(T, T);
    const g = ctx2d(c);
    const planks = horizontal ? GROUND.planks[0] : GROUND.planksWide[0];
    g.drawImage(atlas.base, planks[0] * STRIDE, planks[1] * STRIDE, T, T, 0, 0, T, T);
    g.fillStyle = '#5a3a1e';
    if (horizontal) { g.fillRect(0, 0, T, 2); g.fillRect(0, T - 2, T, 2); g.fillStyle = '#8a5a2e'; g.fillRect(0, 1, T, 1); g.fillRect(0, T - 2, T, 1); }
    else { g.fillRect(0, 0, 2, T); g.fillRect(T - 2, 0, 2, T); g.fillStyle = '#8a5a2e'; g.fillRect(1, 0, 1, T); g.fillRect(T - 2, 0, 1, T); }
    // posts at the ends
    g.fillStyle = '#3e2a17';
    if (end !== 'none') {
      if (horizontal) { const x = end === 'start' ? 0 : T - 2; g.fillRect(x, 0, 2, 3); g.fillRect(x, T - 3, 2, 3); }
      else { const y = end === 'start' ? 0 : T - 2; g.fillRect(0, y, 3, 2); g.fillRect(T - 3, y, 3, 2); }
    }
    baked.set(key, c);
  }
  return { img: c, sx: 0, sy: 0, sw: T, sh: T };
}

/** fence piece from a 4-neighbour mask (N/E/S/W bits of the catalogue mask) */
export function fenceSprite(atlas: Atlas, mask: number): SpriteRect {
  const n = (mask & N) !== 0, e = (mask & E) !== 0, s = (mask & S) !== 0, w = (mask & W) !== 0;
  let r: TileRef;
  if (e && w) r = n || s ? PROPS.fenceHPost : PROPS.fenceHMid;
  else if (e) r = PROPS.fenceHLeftEnd;
  else if (w) r = PROPS.fenceHRightEnd;
  else if (n || s) r = PROPS.fenceV;
  else r = PROPS.fenceH;
  return atlas.ref(r);
}

/**
 * The terrain sprite for a tile kind. `mask` is the 8-neighbour "same material" mask (255 = fully
 * surrounded) and `frame` the water animation frame. Returns null for kinds the renderer composes
 * itself (wall/roof/door need building context) or that draw nothing (void).
 */
export function tileSprite(atlas: Atlas, kind: string, variant: number, season: Season, mask: number, frame: number): SpriteRect | null {
  switch (kind) {
    case 'grass': {
      const v = variant & 15;
      if (v >= 14) return atlas.ref(pick(GROUND.grassTufts, v), season);
      return atlas.ref(pick(GROUND.grass, v), season);
    }
    case 'dirt':
    case 'path':
      return atlas.autotile('dirt', mask, season);
    case 'stone': return atlas.autotile('stone', mask, season);
    case 'sand': return atlas.autotile('sand', mask, season);
    case 'water': {
      if (mask === 255) {
        const r = pick(AUTO_WATER_PLAIN, variant);
        return { img: atlas.water[season][frame], sx: r[0] * STRIDE, sy: r[1] * STRIDE, sw: T, sh: T };
      }
      return atlas.autotile('water', mask, season, frame);
    }
    case 'deepwater': return deepWater(atlas, season, frame, variant);
    case 'floor': return atlas.ref(pick(GROUND.floorWood, variant));
    case 'farmland': return atlas.autotile('dirt', mask, season);
    case 'bridge': return bridgeSprite(atlas, variant !== 1);
    case 'flower': return flowerSprite(atlas, variant, season);
    case 'tree': return treeTile(atlas, variant, season);
    case 'rock': return rockTile(atlas, variant, mask);
    case 'bush': return atlas.ref(pick([BUSHES.green, BUSHES.dark, BUSHES.small], variant), season);
    case 'fence': return fenceSprite(atlas, mask);
    case 'prop': return atlas.ref(pick([PROPS.barrel, PROPS.crate, PROPS.pot, PROPS.stump], variant));
    case 'wall': return buildingPiece(atlas, wallSetForStyle(variant & 3), 'wallPlain');
    case 'roof': return buildingPiece(atlas, roofSetForColour(variant & 3), 'roofFlat');
    case 'door': return buildingPiece(atlas, wallSetForStyle(variant & 3), 'wallBase');
    default: return null;
  }
}

const AUTO_WATER_PLAIN: TileRef[] = [[0, 0], [1, 0], [3, 1]];

/** tree tile: variant = species (0 oak, 1 pine, 2 apple, 3 birch), single-tile trees like Kenney's forests */
export const TREE_SPECIES = ['oak', 'pine', 'apple', 'teal'] as const;
export function treeTile(atlas: Atlas, variant: number, season: Season): SpriteRect {
  const t = TREES[TREE_SPECIES[variant & 3]] ?? TREES.oak;
  const refs = season === 'autumn' && t.autumn ? t.autumn : t;
  return atlas.ref(refs.single, season);
}

/** rock tile: a boulder (variant = ore 0 stone, 1 copper, 2 iron, 3 gold); `salt` varies the shape */
export function rockTile(atlas: Atlas, variant: number, salt: number): SpriteRect {
  const ore = ['stone', 'copper', 'iron', 'gold'][variant & 3];
  const shape = salt % 3;
  const key = `rocktile|${ore}|${shape}`;
  let c = baked.get(key);
  if (!c) {
    c = makeCanvas(T, T);
    const g = ctx2d(c);
    const base = shape === 0 ? PROPS.boulderGrey : shape === 1 ? PROPS.rockGreyBig : PROPS.rockGreyMossBig;
    g.drawImage(atlas.base, base[0] * STRIDE, base[1] * STRIDE, T, T, 0, 0, T, T);
    const col: Record<string, string> = { copper: '#e08a3a', iron: '#b0b8d0', gold: '#f6d34a' };
    if (col[ore]) {
      g.fillStyle = col[ore];
      for (const [x, y] of [[5, 7], [9, 5], [8, 10], [11, 9]]) { g.fillRect(x, y, 2, 1); g.fillRect(x, y + 1, 1, 1); }
      g.fillStyle = '#ffffff'; g.fillRect(6, 6, 1, 1); g.fillRect(10, 4, 1, 1);
    }
    baked.set(key, c);
  }
  return { img: c, sx: 0, sy: 0, sw: T, sh: T };
}

/** the mine mouth: three prop tiles (part 0 left, 1 centre, 2 right) forming a dark arch with beams */
export function mineMouth(part: number): SpriteRect {
  const key = `mine|${part}`;
  let c = baked.get(key);
  if (!c) {
    c = makeCanvas(T, T);
    const g = ctx2d(c);
    const dark = '#1a1418', wood = '#7a5230', wd = '#4a3018', stone = '#6a6a78';
    if (part === 1) {
      g.fillStyle = dark; g.fillRect(0, 3, 16, 13);
      g.fillStyle = '#2a2430'; g.fillRect(2, 5, 12, 2);
      g.fillStyle = wood; g.fillRect(0, 1, 16, 2); g.fillStyle = wd; g.fillRect(0, 3, 16, 1);
    } else {
      const left = part === 0;
      g.fillStyle = stone; g.fillRect(0, 0, 16, 16);
      g.fillStyle = '#585866'; for (const [x, y] of [[2, 3], [9, 6], [4, 11], [11, 12]]) g.fillRect(x, y, 3, 2);
      g.fillStyle = dark; g.fillRect(left ? 10 : 0, 5, 6, 11);
      g.fillStyle = wood; g.fillRect(left ? 8 : 0, 1, left ? 8 : 8, 2); g.fillRect(left ? 8 : 6, 1, 2, 15);
      g.fillStyle = wd; g.fillRect(left ? 9 : 7, 3, 1, 13);
    }
    baked.set(key, c);
  }
  return { img: c, sx: 0, sy: 0, sw: T, sh: T };
}

/**
 * Flowers on grass: Kenney's flower tiles sit on a darker green than the plain grass tile, so they read
 * as squares. Knock the green out once and composite the petals over the season's grass instead.
 */
export function flowerSprite(atlas: Atlas, colour: number, season: Season): SpriteRect {
  const idx = ((colour % 3) + 3) % 3;
  const key = `flower|${idx}|${season}`;
  let c = baked.get(key);
  if (!c) {
    const okey = `flowerOverlay|${idx}`;
    let overlay = baked.get(okey);
    if (!overlay) {
      overlay = makeCanvas(T, T);
      const og = ctx2d(overlay);
      const r = [DETAIL.flowerRed[0], DETAIL.flowerWhite[0], DETAIL.flowerBlue[0]][idx];
      og.drawImage(atlas.base, r[0] * STRIDE, r[1] * STRIDE, T, T, 0, 0, T, T);
      const img = og.getImageData(0, 0, T, T);
      for (let i = 0; i < img.data.length; i += 4) {
        const [h, sat, l] = rgbToHsl(img.data[i], img.data[i + 1], img.data[i + 2]);
        if (h >= 70 && h <= 110 && sat > 0.35 && l > 0.28 && l < 0.5) img.data[i + 3] = 0;
      }
      og.putImageData(img, 0, 0);
      baked.set(okey, overlay);
    }
    c = makeCanvas(T, T);
    const g = ctx2d(c);
    const grass = GROUND.grass[0];
    g.drawImage(atlas.seasons[season], grass[0] * STRIDE, grass[1] * STRIDE, T, T, 0, 0, T, T);
    g.drawImage(overlay, 0, 0);
    baked.set(key, c);
  }
  return { img: c, sx: 0, sy: 0, sw: T, sh: T };
}

/** rubble left by a mined-out rock */
export function rubbleSprite(atlas: Atlas): SpriteRect { return atlas.ref(PROPS.rockGreySmall); }
