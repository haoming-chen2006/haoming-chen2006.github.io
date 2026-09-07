import type { SpriteRect } from '../core/app.ts';
import type { Season } from '../core/types.ts';
import { AUTOTILES, E, FOLIAGE_REGIONS, GROUND_REGIONS, N, NE, NW, S, SE, SHEET, SW, W, type AutotileName, type AutotileSet, type TileRef } from './catalogue.ts';
import { ctx2d, hslToRgb, makeCanvas, rgbToHsl } from './pixel.ts';

/**
 * The loaded sheet: one canvas per season (recoloured grass/foliage), the animated water frames and
 * baked autotile canvases (256 neighbour masks per set, per season, per water frame).
 */
export interface Atlas {
  base: HTMLCanvasElement;
  seasons: Record<Season, HTMLCanvasElement>;
  /** three frames of the water region, per season */
  water: Record<Season, HTMLCanvasElement[]>;
  autotile(name: AutotileName | 'deep', mask: number, season: Season, frame?: number): SpriteRect;
  ref(r: TileRef, season?: Season): SpriteRect;
  tall(top: TileRef, bottom: TileRef, season?: Season): SpriteRect;
}

export const T = SHEET.tile, M = SHEET.margin, STRIDE = SHEET.tile + SHEET.margin;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`art: failed to load ${src}`));
    img.src = src;
  });
}

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

function inRegions(col: number, row: number, regions: { c0: number; r0: number; c1: number; r1: number }[]): boolean {
  for (const r of regions) if (col >= r.c0 && col <= r.c1 && row >= r.r0 && row <= r.r1) return true;
  return false;
}

/** Hue/sat/light adjustments applied to green pixels per season. */
const GROUND_TRANSFORM: Record<Season, (h: number, s: number, l: number) => [number, number, number]> = {
  spring: (h, s, l) => [h, s, l],
  summer: (h, s, l) => [h - 6, Math.min(1, s * 1.08), l * 0.93],
  autumn: (h, s, l) => [h - 28, s * 0.85, l * 0.97],
  winter: (_h, s, l) => [205, 0.18 + s * 0.1, 0.78 + l * 0.2],
};
const FOLIAGE_TRANSFORM: Record<Season, (h: number, s: number, l: number) => [number, number, number]> = {
  spring: (h, s, l) => [h, s, l],
  summer: (h, s, l) => [h - 8, Math.min(1, s * 1.1), l * 0.9],
  autumn: (h, s, l) => [h - 62, Math.min(1, s * 1.15), l * 1.02],
  winter: (_h, s, l) => [205, 0.12 + s * 0.08, 0.72 + l * 0.24],
};

/** Is this pixel "plant green" (grass, leaves)? Water is teal (~185°) and stays untouched. */
function isGreen(h: number, s: number, l: number): boolean {
  return h >= 58 && h <= 165 && s > 0.18 && l > 0.12 && l < 0.9;
}

function recolourSheet(base: HTMLCanvasElement, season: Season): HTMLCanvasElement {
  const out = makeCanvas(base.width, base.height);
  const g = ctx2d(out);
  g.drawImage(base, 0, 0);
  if (season === 'spring') return out;
  const img = g.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const ground = GROUND_TRANSFORM[season], foliage = FOLIAGE_TRANSFORM[season];
  for (let y = 0; y < out.height; y++) {
    const row = Math.floor(y / STRIDE);
    for (let x = 0; x < out.width; x++) {
      const i = (y * out.width + x) * 4;
      if (d[i + 3] === 0) continue;
      const col = Math.floor(x / STRIDE);
      const isGround = inRegions(col, row, GROUND_REGIONS);
      const isFoliage = !isGround && inRegions(col, row, FOLIAGE_REGIONS);
      if (!isGround && !isFoliage) continue;
      const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (!isGreen(h, s, l)) continue;
      const [nh, ns, nl] = (isGround ? ground : foliage)(h, s, l);
      const [r, gg, b] = hslToRgb(nh, Math.max(0, Math.min(1, ns)), Math.max(0, Math.min(1, nl)));
      d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    }
  }
  g.putImageData(img, 0, 0);
  return out;
}

/**
 * Animated water: the sparkles in the water tiles (cols 0..4, rows 0..5) drift diagonally. Returns
 * three copies of the whole sheet region (cheap: only the water block differs) as separate canvases.
 */
function waterFrames(sheet: HTMLCanvasElement): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const g0 = ctx2d(sheet);
  const src = g0.getImageData(0, 0, 5 * STRIDE, 6 * STRIDE);
  const isWater = (i: number) => { const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2]; return src.data[i + 3] > 0 && b > 170 && g > 150 && r < 200; };
  const isSparkle = (i: number) => isWater(i) && src.data[i] > 150;
  for (let f = 0; f < 3; f++) {
    const c = makeCanvas(sheet.width, sheet.height);
    const g = ctx2d(c);
    g.drawImage(sheet, 0, 0);
    if (f === 0) { frames.push(c); continue; }
    const out = g.getImageData(0, 0, 5 * STRIDE, 6 * STRIDE);
    const shift = f * 3;
    for (let ty = 0; ty < 6; ty++) for (let tx = 0; tx < 5; tx++) {
      const ox = tx * STRIDE, oy = ty * STRIDE;
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const i = ((oy + y) * src.width + ox + x) * 4;
        if (!isWater(i)) continue;
        if (isSparkle(i)) { // erase: paint the base water colour (the darker teal neighbour)
          out.data[i] = 0x63; out.data[i + 1] = 0xc7; out.data[i + 2] = 0xd9;
        }
      }
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const i = ((oy + y) * src.width + ox + x) * 4;
        if (!isSparkle(i)) continue;
        const nx = (x + shift) % T, ny = (y + shift) % T;
        const j = ((oy + ny) * src.width + ox + nx) * 4;
        if (!isWater(j)) continue;
        out.data[j] = src.data[i]; out.data[j + 1] = src.data[i + 1]; out.data[j + 2] = src.data[i + 2];
      }
    }
    g.putImageData(out, 0, 0);
    frames.push(c);
  }
  return frames;
}

/** quadrant order: 0 = TL, 1 = TR, 2 = BL, 3 = BR */
function pieceForQuadrant(set: AutotileSet, q: number, mask: number): TileRef {
  const has = (bit: number) => (mask & bit) !== 0;
  let v: boolean, h: boolean, d: boolean;
  switch (q) {
    case 0: v = has(N); h = has(W); d = has(NW); break;
    case 1: v = has(N); h = has(E); d = has(NE); break;
    case 2: v = has(S); h = has(W); d = has(SW); break;
    default: v = has(S); h = has(E); d = has(SE); break;
  }
  if (!v && !h) return q === 0 ? set.tl : q === 1 ? set.tr : q === 2 ? set.bl : set.br;
  if (!v) return q < 2 ? set.top : set.bottom;
  if (!h) return q === 0 || q === 2 ? set.left : set.right;
  if (!d) return q === 0 ? set.itl : q === 1 ? set.itr : q === 2 ? set.ibl : set.ibr;
  return set.center;
}

/** Bake all 256 masks of a set into a 16×16-tile canvas (index = mask). */
function bakeAutotile(sheet: HTMLCanvasElement, set: AutotileSet): HTMLCanvasElement {
  const c = makeCanvas(16 * T, 16 * T);
  const g = ctx2d(c);
  const half = T / 2;
  for (let mask = 0; mask < 256; mask++) {
    const dx = (mask % 16) * T, dy = Math.floor(mask / 16) * T;
    for (let q = 0; q < 4; q++) {
      const [pc, pr] = pieceForQuadrant(set, q, mask);
      const qx = (q & 1) * half, qy = (q >> 1) * half;
      g.drawImage(sheet, pc * STRIDE + qx, pr * STRIDE + qy, half, half, dx + qx, dy + qy, half, half);
    }
  }
  return c;
}

/**
 * A synthetic 13-piece set for deep water: a translucent dark blob with rounded corners, laid out on
 * a 17 px-stride sheet like the Kenney pieces (blob at cols 2..4 rows 0..2, notches at cols 0..1 rows 1..2).
 */
const DEEP_SET: AutotileSet = { center: [3, 1], top: [3, 0], left: [2, 1], right: [4, 1], bottom: [3, 2], tl: [2, 0], tr: [4, 0], bl: [2, 2], br: [4, 2], itl: [1, 2], itr: [0, 2], ibl: [1, 1], ibr: [0, 1], opaque: false };
function deepSheet(): HTMLCanvasElement {
  const sheet = makeCanvas(5 * STRIDE, 3 * STRIDE);
  const g = ctx2d(sheet);
  const tint = 'rgba(12, 54, 108, 0.34)';
  const blob = makeCanvas(T * 3, T * 3);
  const bg = ctx2d(blob);
  bg.fillStyle = tint;
  const r = 6;
  bg.beginPath();
  bg.moveTo(r, 0); bg.lineTo(T * 3 - r, 0); bg.arcTo(T * 3, 0, T * 3, r, r); bg.lineTo(T * 3, T * 3 - r); bg.arcTo(T * 3, T * 3, T * 3 - r, T * 3, r);
  bg.lineTo(r, T * 3); bg.arcTo(0, T * 3, 0, T * 3 - r, r); bg.lineTo(0, r); bg.arcTo(0, 0, r, 0, r); bg.closePath(); bg.fill();
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) g.drawImage(blob, i * T, j * T, T, T, (2 + i) * STRIDE, j * STRIDE, T, T);
  // notches: a full tile with a small quarter-disc cleared at one corner
  const notch = (col: number, row: number, cx: number, cy: number) => {
    const c = makeCanvas(T, T); const cg = ctx2d(c);
    cg.fillStyle = tint; cg.fillRect(0, 0, T, T);
    cg.globalCompositeOperation = 'destination-out';
    cg.beginPath(); cg.arc(cx, cy, 5, 0, Math.PI * 2); cg.fill();
    g.drawImage(c, col * STRIDE, row * STRIDE);
  };
  notch(0, 1, T, T); notch(1, 1, 0, T); notch(0, 2, T, 0); notch(1, 2, 0, 0);
  return sheet;
}

export async function loadAtlas(url: string): Promise<Atlas> {
  const img = await loadImage(url);
  const base = makeCanvas(img.width, img.height);
  ctx2d(base).drawImage(img, 0, 0);
  const seasons = {} as Record<Season, HTMLCanvasElement>;
  const water = {} as Record<Season, HTMLCanvasElement[]>;
  const baked = new Map<string, HTMLCanvasElement>();
  for (const s of SEASONS) {
    seasons[s] = recolourSheet(base, s);
    water[s] = waterFrames(seasons[s]);
  }
  const deep = deepSheet();
  const key = (name: string, season: Season, frame: number) => `${name}|${season}|${frame}`;
  const getBaked = (name: AutotileName | 'deep', season: Season, frame: number): HTMLCanvasElement => {
    const k = name === 'deep' ? 'deep' : key(name, season, name === 'water' || name === 'pool' ? frame : 0);
    let c = baked.get(k);
    if (!c) {
      if (name === 'deep') c = bakeAutotile(deep, DEEP_SET);
      else {
        const sheet = name === 'water' || name === 'pool' ? water[season][frame] : seasons[season];
        c = bakeAutotile(sheet, AUTOTILES[name]);
      }
      baked.set(k, c);
    }
    return c;
  };
  const ref = (r: TileRef, season: Season = 'spring'): SpriteRect => ({ img: seasons[season], sx: r[0] * STRIDE, sy: r[1] * STRIDE, sw: T, sh: T });
  return {
    base, seasons, water,
    autotile: (name, mask, season, frame = 0) => {
      const c = getBaked(name, season, frame);
      return { img: c, sx: (mask % 16) * T, sy: Math.floor(mask / 16) * T, sw: T, sh: T };
    },
    ref,
    tall: (top, bottom, season = 'spring') => {
      // trees are stacked vertically on the sheet only sometimes; compose into a cached 16×32 canvas
      const k = `tall|${top}|${bottom}|${season}`;
      let c = baked.get(k);
      if (!c) {
        c = makeCanvas(T, T * 2);
        const g = ctx2d(c);
        g.drawImage(seasons[season], top[0] * STRIDE, top[1] * STRIDE, T, T, 0, 0, T, T);
        g.drawImage(seasons[season], bottom[0] * STRIDE, bottom[1] * STRIDE, T, T, 0, T, T, T);
        baked.set(k, c);
      }
      return { img: c, sx: 0, sy: 0, sw: T, sh: T * 2, oy: -1 };
    },
  };
}
