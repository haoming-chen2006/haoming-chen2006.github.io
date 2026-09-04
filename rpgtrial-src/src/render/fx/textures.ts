// Procedural sprite atlas for particles/VFX (no image assets). 4x3 cells of 256px.
import * as THREE from 'three';

export const ATLAS_COLS = 4, ATLAS_ROWS = 3, CELL = 256;
/** Atlas cell indices. */
export const SPRITE = { glow: 0, flame: 1, smokeA: 2, smokeB: 3, leaf: 4, spark: 5, ring: 6, rune: 7, reticle: 8, d20: 9, circle: 10, mote: 11 } as const;

let atlas: THREE.CanvasTexture | null = null;

const hash = (x: number, y: number) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 0x2545f491; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const fade = (t: number) => t * t * (3 - 2 * t);
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = fade(xf), v = fade(yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
function fbm(x: number, y: number, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.1; } return s / n; }

type Painter = (px: number, py: number) => number; // returns alpha 0..1 for cell-local coords in [-1, 1]

function paintCell(img: ImageData, cell: number, fn: Painter, rgb: (px: number, py: number, a: number) => [number, number, number] = () => [255, 255, 255]) {
  const cx = (cell % ATLAS_COLS) * CELL, cy = Math.floor(cell / ATLAS_COLS) * CELL; const W = img.width;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const px = ((x + 0.5) / CELL) * 2 - 1, py = 1 - ((y + 0.5) / CELL) * 2;
    let a = fn(px, py); a = a < 0 ? 0 : a > 1 ? 1 : a;
    // 1px transparent border to avoid bleeding
    if (x === 0 || y === 0 || x === CELL - 1 || y === CELL - 1) a = 0;
    const [r, g, b] = rgb(px, py, a); const i = ((cy + y) * W + cx + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = Math.round(a * 255);
  }
}

export function getAtlas(): THREE.CanvasTexture {
  if (atlas) return atlas;
  const c = document.createElement('canvas'); c.width = ATLAS_COLS * CELL; c.height = ATLAS_ROWS * CELL;
  const ctx = c.getContext('2d')!; const img = ctx.createImageData(c.width, c.height);
  const len = (x: number, y: number) => Math.sqrt(x * x + y * y);
  // 0 soft glow
  paintCell(img, SPRITE.glow, (x, y) => { const d = len(x, y); return Math.pow(Math.max(0, 1 - d), 2.2) * (1 + 0.6 * Math.pow(Math.max(0, 1 - d * 1.6), 3)); });
  // 1 flame tongue: teardrop with noisy edges, brighter core
  paintCell(img, SPRITE.flame, (x, y) => {
    const yy = (y + 0.55) / 1.4; // 0 bottom .. 1 top
    const w = 0.62 * Math.sqrt(Math.max(0, 1 - Math.pow((yy - 0.25) / 0.85, 2))) * (1 - yy * 0.55);
    const n = fbm(x * 2.5 + 3.1, y * 2.2 - yy * 1.5, 4) - 0.5;
    const dx = Math.abs(x) + n * 0.28;
    const edge = 1 - dx / Math.max(w, 0.01);
    const core = Math.pow(Math.max(0, edge), 1.4);
    const vertical = (yy < 0 || yy > 1) ? 0 : Math.pow(Math.sin(Math.PI * Math.min(1, yy)), 0.5);
    return core * vertical;
  }, (x, y, a) => { const yy = (y + 0.55) / 1.4; const hot = Math.pow(a, 1.3) * (1 - yy * 0.6); return [255, Math.round(150 + 105 * hot), Math.round(30 + 200 * Math.pow(hot, 2.5))]; });
  // 2,3 smoke puffs
  for (const [cell, seed] of [[SPRITE.smokeA, 0], [SPRITE.smokeB, 17]] as const) {
    paintCell(img, cell, (x, y) => { const d = len(x, y); const n = fbm(x * 2.2 + seed, y * 2.2 + seed * 0.7, 5); const r = 0.55 + (n - 0.5) * 0.9; const e = 1 - d / Math.max(r, 0.05); return Math.pow(Math.max(0, e), 1.1) * (0.55 + 0.7 * n); });
  }
  // 4 leaf: pointed ellipse with a midrib
  paintCell(img, SPRITE.leaf, (x, y) => {
    const a = Math.atan2(y, x); const r = len(x, y); const rot = a - 0.7; const ex = Math.cos(rot) * r, ey = Math.sin(rot) * r;
    const half = 0.32 * Math.max(0, 1 - Math.pow(ex / 0.85, 2)) * (1 - Math.abs(ex) * 0.2);
    const inside = Math.abs(ey) < half && Math.abs(ex) < 0.85 ? 1 : 0;
    const rib = Math.abs(ey) < 0.02 ? 0.65 : 1;
    return inside * rib;
  }, (x, y) => { const n = fbm(x * 3, y * 3, 3); return [Math.round(215 + 40 * n), Math.round(150 + 60 * n), Math.round(40 + 40 * n)]; });
  // 5 spark: 4-point star + glow
  paintCell(img, SPRITE.spark, (x, y) => { const d = len(x, y); const star = Math.pow(Math.max(0, 1 - (Math.abs(x) + Math.abs(y)) * 1.15), 3) + Math.pow(Math.max(0, 1 - Math.abs(x) * 12), 2) * Math.max(0, 1 - Math.abs(y)) * 0.9 + Math.pow(Math.max(0, 1 - Math.abs(y) * 12), 2) * Math.max(0, 1 - Math.abs(x)) * 0.9; return Math.min(1, star + Math.pow(Math.max(0, 1 - d * 2.2), 3) * 0.8); });
  // 6 ring: thin soft circle
  paintCell(img, SPRITE.ring, (x, y) => { const d = len(x, y); return Math.pow(Math.max(0, 1 - Math.abs(d - 0.8) / 0.12), 1.5); });
  // 7 rune: arcane glyph — circle with inner triangle + ticks
  paintCell(img, SPRITE.rune, (x, y) => {
    const d = len(x, y); const a = Math.atan2(y, x);
    let v = Math.pow(Math.max(0, 1 - Math.abs(d - 0.86) / 0.05), 1.2);
    v = Math.max(v, Math.pow(Math.max(0, 1 - Math.abs(d - 0.62) / 0.035), 1.2));
    for (let k = 0; k < 3; k++) { // triangle edges
      const a0 = k * 2.094 + 1.571, a1 = a0 + 2.094; const x0 = Math.cos(a0) * 0.62, y0 = Math.sin(a0) * 0.62, x1 = Math.cos(a1) * 0.62, y1 = Math.sin(a1) * 0.62;
      const ex = x1 - x0, ey = y1 - y0; const t = Math.max(0, Math.min(1, ((x - x0) * ex + (y - y0) * ey) / (ex * ex + ey * ey))); const dd = len(x - (x0 + ex * t), y - (y0 + ey * t));
      v = Math.max(v, Math.pow(Math.max(0, 1 - dd / 0.04), 1.2));
    }
    const ticks = Math.pow(Math.max(0, Math.cos(a * 12)), 40) * (d > 0.72 && d < 0.8 ? 1 : 0);
    v = Math.max(v, ticks, Math.pow(Math.max(0, 1 - d / 0.12), 2));
    return v;
  });
  // 8 reticle: four arcs + ticks (lock-on)
  paintCell(img, SPRITE.reticle, (x, y) => {
    const d = len(x, y); const a = Math.atan2(y, x);
    const arcMask = Math.abs(((a + Math.PI / 4) % (Math.PI / 2)) - Math.PI / 4) < 0.55 ? 1 : 0;
    let v = Math.pow(Math.max(0, 1 - Math.abs(d - 0.78) / 0.07), 1.3) * arcMask;
    const tick = (Math.abs(x) < 0.05 && Math.abs(y) > 0.6 && Math.abs(y) < 0.98) || (Math.abs(y) < 0.05 && Math.abs(x) > 0.6 && Math.abs(x) < 0.98) ? 1 : 0;
    v = Math.max(v, tick, Math.pow(Math.max(0, 1 - d / 0.09), 2));
    return v;
  });
  // 9 d20: hexagon outline with inner triangle and "20"-ish glyph
  paintCell(img, SPRITE.d20, (x, y) => {
    const a = Math.atan2(y, x); const d = len(x, y);
    const hexR = 0.78 / Math.cos(((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6);
    let v = Math.pow(Math.max(0, 1 - Math.abs(d - hexR) / 0.06), 1.3);
    for (let k = 0; k < 3; k++) { const a0 = k * 2.094 + 1.571, a1 = a0 + 2.094; const x0 = Math.cos(a0) * 0.78, y0 = Math.sin(a0) * 0.78, x1 = Math.cos(a1) * 0.78, y1 = Math.sin(a1) * 0.78; const ex = x1 - x0, ey = y1 - y0; const t = Math.max(0, Math.min(1, ((x - x0) * ex + (y - y0) * ey) / (ex * ex + ey * ey))); const dd = len(x - (x0 + ex * t), y - (y0 + ey * t)); v = Math.max(v, Math.pow(Math.max(0, 1 - dd / 0.045), 1.2)); }
    for (let k = 0; k < 3; k++) { const a0 = k * 2.094 + 1.571; const x1 = Math.cos(a0) * 0.78, y1 = Math.sin(a0) * 0.78; const x0 = Math.cos(a0 + Math.PI) * 0.78 * 0.5, y0 = Math.sin(a0 + Math.PI) * 0.78 * 0.5; const ex = x1 - x0, ey = y1 - y0; const t = Math.max(0, Math.min(1, ((x - x0) * ex + (y - y0) * ey) / (ex * ex + ey * ey))); const dd = len(x - (x0 + ex * t), y - (y0 + ey * t)); v = Math.max(v, Math.pow(Math.max(0, 1 - dd / 0.035), 1.2) * 0.7); }
    v = Math.max(v, Math.pow(Math.max(0, 1 - d / 0.1), 2) * 0.9);
    return v;
  });
  // 10 magic circle: two rings + spokes
  paintCell(img, SPRITE.circle, (x, y) => {
    const d = len(x, y); const a = Math.atan2(y, x);
    let v = Math.pow(Math.max(0, 1 - Math.abs(d - 0.9) / 0.04), 1.2) + Math.pow(Math.max(0, 1 - Math.abs(d - 0.74) / 0.025), 1.2) + Math.pow(Math.max(0, 1 - Math.abs(d - 0.4) / 0.03), 1.2);
    v += Math.pow(Math.max(0, Math.cos(a * 8)), 60) * (d > 0.42 && d < 0.72 ? 0.8 : 0);
    v += Math.pow(Math.max(0, Math.cos(a * 16 + 0.2)), 30) * (d > 0.76 && d < 0.88 ? 0.8 : 0);
    return Math.min(1, v);
  });
  // 11 mote: soft blob with slight ring (dust in light)
  paintCell(img, SPRITE.mote, (x, y) => { const d = len(x, y); return Math.pow(Math.max(0, 1 - d), 3) * 0.9 + Math.pow(Math.max(0, 1 - Math.abs(d - 0.5) / 0.3), 2) * 0.35; });
  ctx.putImageData(img, 0, 0);
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace; atlas.minFilter = THREE.LinearMipmapLinearFilter; atlas.magFilter = THREE.LinearFilter; atlas.generateMipmaps = true; atlas.anisotropy = 4;
  atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
  return atlas;
}

/** UV rect for a cell: [u0, v0, u1, v1] with a small inset. */
export function cellUV(cell: number): [number, number, number, number] {
  const cx = cell % ATLAS_COLS, cy = Math.floor(cell / ATLAS_COLS); const inset = 1.5 / CELL;
  const u0 = cx / ATLAS_COLS + inset / ATLAS_COLS, u1 = (cx + 1) / ATLAS_COLS - inset / ATLAS_COLS;
  const v1 = 1 - cy / ATLAS_ROWS - inset / ATLAS_ROWS, v0 = 1 - (cy + 1) / ATLAS_ROWS + inset / ATLAS_ROWS;
  return [u0, v0, u1, v1];
}

/** A standalone texture of one atlas cell (for THREE.Sprite / MeshBasicMaterial maps). */
const cellTexCache = new Map<number, THREE.Texture>();
export function cellTexture(cell: number): THREE.Texture {
  let t = cellTexCache.get(cell); if (t) return t;
  const a = getAtlas(); t = a.clone(); t.needsUpdate = true;
  const [u0, v0, u1, v1] = cellUV(cell); t.offset.set(u0, v0); t.repeat.set(u1 - u0, v1 - v0);
  cellTexCache.set(cell, t); return t;
}
