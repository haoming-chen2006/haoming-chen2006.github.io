import type { SpriteRect } from '../core/app.ts';
import { CROP_BY_SEED, item as itemDef } from '../core/items.ts';
import type { Atlas } from './atlas.ts';
import { ITEM_SPRITES, PROPS } from './catalogue.ts';
import { produceIcon } from './crops.ts';
import { ctx2d, makeCanvas, OUTLINE, Painter, shade } from './pixel.ts';

/** Item, place, weather and skill icons: from the sheet where it has one, otherwise drawn here. */

const INK = OUTLINE;

const DRAWN: Record<string, (p: Painter) => void> = {
  berries: (p) => { for (const [x, y] of [[5, 6], [9, 5], [7, 9], [11, 9]]) { p.disc(x, y, 1, '#5a3a8a'); p.px(x - 1, y - 1, '#8a6ab8'); } p.rect(4, 3, 3, 1, '#4f8f2a'); p.rect(9, 12, 3, 1, '#4f8f2a'); },
  apple: (p) => { p.disc(8, 8, 4, '#d8402a'); p.px(6, 6, '#f08070'); p.rect(8, 3, 1, 2, '#5a3a1a'); p.rect(9, 3, 2, 1, '#4f8f2a'); },
  trout: (p) => fish(p, '#8fb0c8', '#e07a7a'),
  perch: (p) => fish(p, '#8fa860', '#d8b040'),
  carp: (p) => fish(p, '#c9a060', '#a07a40'),
  salmon: (p) => fish(p, '#e88a7a', '#c05a4a'),
  catfish: (p) => { fish(p, '#7a7a6a', '#5a5a4a'); p.px(2, 8, '#5a5a4a'); p.px(2, 6, '#5a5a4a'); },
  iron_ore: (p) => { p.rect(4, 6, 8, 6, '#7a7a88'); p.rect(5, 5, 6, 8, '#7a7a88'); p.px(6, 7, '#b8b8c8'); p.px(9, 9, '#b8b8c8'); p.px(7, 10, '#5a5a68'); },
  copper_bar: (p) => bar(p, '#d0783a', '#f0a060'),
  iron_bar: (p) => bar(p, '#8a8a98', '#c0c0cc'),
  milk: (p) => { p.rect(5, 4, 6, 9, '#f4f4f0'); p.rect(6, 2, 4, 2, '#e0e0d8'); p.rect(5, 8, 6, 1, '#6fa0d8'); p.px(6, 5, '#ffffff'); },
  egg: (p) => { p.disc(8, 8, 3, '#f4ecd8'); p.rect(7, 4, 2, 1, '#f4ecd8'); p.px(7, 6, '#ffffff'); },
  wool: (p) => { p.disc(8, 8, 4, '#f0ece4'); p.px(5, 6, '#d8d4cc'); p.px(9, 5, '#ffffff'); p.px(10, 9, '#d8d4cc'); p.px(6, 10, '#d8d4cc'); },
  cloth: (p) => { p.rect(3, 5, 10, 7, '#c86a7a'); p.rect(3, 5, 10, 1, '#e08a9a'); p.rect(4, 12, 9, 1, '#a04a5a'); p.px(5, 8, '#e08a9a'); p.px(9, 9, '#e08a9a'); },
  bread: (p) => { p.rect(3, 6, 10, 5, '#d8a050'); p.rect(4, 5, 8, 7, '#d8a050'); p.rect(4, 5, 8, 1, '#e8c080'); p.px(6, 7, '#b8802a'); p.px(9, 8, '#b8802a'); },
  sweet_roll: (p) => { p.disc(8, 8, 4, '#d8a050'); p.disc(8, 8, 2, '#c08030'); p.px(7, 6, '#fff0d0'); p.px(9, 7, '#fff0d0'); p.px(8, 9, '#fff0d0'); },
  berry_pie: (p) => { p.rect(3, 7, 10, 4, '#d8a050'); p.rect(2, 8, 12, 2, '#d8a050'); p.rect(4, 6, 8, 1, '#7a3a8a'); p.rect(5, 5, 6, 1, '#e8c080'); p.px(7, 7, '#7a3a8a'); },
  bandage: (p) => { p.rect(4, 6, 8, 4, '#f4f0e8'); p.rect(5, 5, 6, 6, '#f4f0e8'); p.rect(7, 5, 2, 6, '#e0d8c8'); p.px(5, 7, '#e04040'); },
  hoe: (p) => { p.rect(9, 2, 1, 11, '#8a5a2a'); p.rect(4, 3, 6, 2, '#8a8a98'); p.rect(4, 5, 2, 2, '#8a8a98'); },
  watering_can: (p) => { p.rect(5, 6, 7, 6, '#6a9ad8'); p.rect(6, 5, 5, 1, '#6a9ad8'); p.rect(3, 4, 2, 3, '#6a9ad8'); p.px(2, 3, '#6a9ad8'); p.rect(11, 4, 1, 2, '#4a7ab8'); p.px(6, 7, '#9ac0f0'); },
  fishing_rod: (p) => { for (let i = 0; i < 10; i++) p.px(3 + i, 12 - i, '#8a5a2a'); p.rect(12, 3, 1, 6, '#c0c0c0'); p.px(12, 9, '#e04040'); },
  pickaxe: (p) => { for (let i = 0; i < 8; i++) p.px(4 + i, 12 - i, '#8a5a2a'); p.rect(8, 3, 6, 2, '#8a8a98'); p.px(7, 4, '#8a8a98'); p.px(13, 5, '#8a8a98'); p.px(13, 6, '#8a8a98'); },
  axe: (p) => { for (let i = 0; i < 9; i++) p.px(3 + i, 12 - i, '#8a5a2a'); p.rect(9, 3, 4, 4, '#8a8a98'); p.rect(11, 2, 3, 1, '#8a8a98'); p.px(12, 4, '#c0c0cc'); },
  horseshoe: (p) => { const c = '#8a8a98'; p.rect(5, 4, 6, 1, c); p.rect(4, 5, 1, 6, c); p.rect(11, 5, 1, 6, c); p.px(5, 11, c); p.px(10, 11, c); p.px(6, 5, '#c0c0cc'); },
  pearl: (p) => { p.disc(8, 8, 3, '#f0eef8'); p.px(7, 7, '#ffffff'); p.px(9, 9, '#d8d0e8'); p.rect(4, 12, 8, 1, '#6a8aa0'); },
  scarf: (p) => { p.rect(4, 4, 8, 3, '#c85a5a'); p.rect(5, 7, 3, 6, '#c85a5a'); p.rect(6, 7, 1, 6, '#e0c060'); p.rect(4, 4, 8, 1, '#e0c060'); p.px(5, 12, '#e0c060'); p.px(7, 12, '#e0c060'); },
  nails: (p) => { p.rect(4, 5, 8, 8, '#b08a5a'); p.rect(5, 4, 6, 1, '#b08a5a'); p.rect(6, 6, 1, 5, '#a0a0a8'); p.rect(9, 7, 1, 5, '#a0a0a8'); p.px(6, 5, '#d0d0d8'); p.px(9, 6, '#d0d0d8'); },
  seed: (p) => { p.rect(4, 3, 8, 10, '#e8dcb8'); p.rect(4, 3, 8, 2, '#c85a3a'); p.rect(5, 6, 6, 5, '#f8f0e0'); p.px(7, 8, '#5a3a1a'); p.px(9, 9, '#5a3a1a'); p.px(6, 9, '#5a3a1a'); },
  gem: (p) => { p.rect(6, 4, 4, 1, '#8ae0f0'); p.rect(5, 5, 6, 2, '#4ab8e0'); p.rect(6, 7, 4, 2, '#3a98c8'); p.rect(7, 9, 2, 2, '#2a78a8'); p.px(6, 5, '#d0f8ff'); },
  coin: (p) => { p.disc(8, 8, 4, '#e0b040'); p.disc(8, 8, 2, '#f8d868'); p.px(7, 7, '#fff0b0'); },
  toy_boat: (p) => { p.rect(3, 9, 10, 3, '#8a5a2a'); p.rect(4, 12, 8, 1, '#5a3a1a'); p.rect(8, 3, 1, 6, '#5a3a1a'); p.rect(9, 4, 3, 4, '#f0e8d8'); },
  candle: (p) => { p.rect(6, 6, 4, 7, '#f0e8c8'); p.px(8, 4, '#f6c34a'); p.px(8, 3, '#f88a30'); p.rect(5, 13, 6, 1, '#c8a040'); },
  lantern: (p) => { p.rect(6, 3, 4, 1, '#5a5a68'); p.rect(5, 4, 6, 7, '#5a5a68'); p.rect(6, 5, 4, 5, '#ffd868'); p.rect(7, 11, 2, 1, '#5a5a68'); p.px(8, 2, '#5a5a68'); },
  book: (p) => { p.rect(4, 3, 8, 10, '#a04a4a'); p.rect(5, 4, 7, 8, '#c86a5a'); p.rect(5, 3, 1, 10, '#6a2a2a'); p.rect(7, 6, 4, 1, '#f0d890'); },
};

function fish(p: Painter, body: string, fin: string): void {
  p.rect(5, 6, 7, 4, body); p.rect(4, 7, 9, 2, body); p.rect(12, 6, 1, 1, fin); p.rect(12, 9, 1, 1, fin);
  p.rect(13, 5, 1, 6, fin); p.px(6, 7, '#ffffff'); p.px(6, 7, INK); p.px(8, 5, fin); p.px(8, 10, fin);
}
function bar(p: Painter, c: string, hi: string): void { p.rect(3, 7, 10, 4, c); p.rect(4, 6, 10, 1, hi); p.rect(13, 7, 1, 4, shade(c, -0.3)); p.px(5, 8, hi); }

const canvasCache = new Map<string, HTMLCanvasElement>();

function drawnItem(id: string): HTMLCanvasElement | null {
  const key = `item|${id}`;
  const hit = canvasCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(16, 16);
  const p = new Painter(ctx2d(c));
  let ok = true;
  if (DRAWN[id]) DRAWN[id](p);
  else if (produceIcon(id, p, 0, 0)) ok = true;
  else if (CROP_BY_SEED[id]) { DRAWN.seed(p); const crop = CROP_BY_SEED[id]; p.rect(4, 3, 8, 2, crop.id === 'pumpkin' ? '#e88a2a' : crop.id === 'strawberry' ? '#e04040' : crop.id === 'sunflower' ? '#f2c62a' : '#5fa83c'); }
  else ok = false;
  if (!ok) return null;
  canvasCache.set(key, c);
  return c;
}

/** a generic drawn icon for items without art: a labelled pouch tinted by item kind */
function fallbackItem(id: string): HTMLCanvasElement {
  const key = `fallback|${id}`;
  const hit = canvasCache.get(key);
  if (hit) return hit;
  const def = itemDef(id);
  const tint: Record<string, string> = { crop: '#7cc24f', seed: '#e8dcb8', food: '#e0a050', drink: '#6a9ad8', material: '#b08a5a', ore: '#7a7a88', tool: '#8a8a98', gift: '#d66f8a', book: '#a04a4a', furniture: '#8a5a2a', medicine: '#8ad0a0', fish: '#8fb0c8', misc: '#c0b090' };
  const c = makeCanvas(16, 16);
  const p = new Painter(ctx2d(c));
  const col = tint[def.kind] ?? '#c0b090';
  p.blob(3, 4, 10, 9, col, INK);
  p.rect(5, 3, 6, 2, shade(col, -0.3));
  p.rect(4, 6, 8, 1, shade(col, 0.3));
  const g = ctx2d(c);
  g.fillStyle = INK; g.font = 'bold 8px monospace'; g.textAlign = 'center';
  g.fillText(def.name.slice(0, 1).toUpperCase(), 8, 12);
  canvasCache.set(key, c);
  return c;
}

export function itemSprite(atlas: Atlas, id: string): SpriteRect {
  const drawn = drawnItem(id);
  if (drawn) return { img: drawn, sx: 0, sy: 0, sw: 16, sh: 16 };
  const ref = ITEM_SPRITES[id];
  if (ref) return atlas.ref(ref);
  const fb = fallbackItem(id);
  return { img: fb, sx: 0, sy: 0, sw: 16, sh: 16 };
}

const WEATHER: Record<string, (p: Painter) => void> = {
  sunny: (p) => { p.disc(8, 8, 4, '#f6c34a'); for (const [x, y] of [[8, 1], [8, 15], [1, 8], [15, 8], [3, 3], [13, 3], [3, 13], [13, 13]]) p.px(x, y, '#f6c34a'); p.px(7, 7, '#fff0b0'); },
  cloudy: (p) => { p.rect(3, 8, 10, 4, '#e8ecf0'); p.disc(6, 7, 3, '#e8ecf0'); p.disc(10, 6, 3, '#e8ecf0'); p.rect(3, 11, 10, 1, '#c8d0d8'); },
  rain: (p) => { WEATHER.cloudy(p); for (const [x, y] of [[4, 13], [7, 14], [10, 13], [13, 14]]) p.rect(x, y, 1, 2, '#5fb0ee'); },
  storm: (p) => { p.rect(3, 6, 10, 4, '#8a90a0'); p.disc(6, 5, 3, '#8a90a0'); p.disc(10, 4, 3, '#8a90a0'); p.px(8, 10, '#f6d34a'); p.px(7, 11, '#f6d34a'); p.px(8, 12, '#f6d34a'); p.px(7, 13, '#f6d34a'); p.px(6, 14, '#f6d34a'); },
  fog: (p) => { for (let i = 0; i < 4; i++) p.rect(2 + (i % 2) * 2, 4 + i * 3, 10, 1, '#d0d8dc'); },
  snow: (p) => { WEATHER.cloudy(p); for (const [x, y] of [[4, 13], [7, 14], [10, 13], [13, 14]]) p.px(x, y, '#ffffff'); },
};

const SKILL: Record<string, (p: Painter) => void> = {
  farming: (p) => { p.rect(7, 6, 2, 8, '#3f7f2a'); p.rect(4, 5, 3, 2, '#7cc24f'); p.rect(9, 3, 3, 2, '#7cc24f'); p.px(3, 4, '#7cc24f'); p.px(12, 2, '#7cc24f'); },
  fishing: (p) => fish(p, '#8fb0c8', '#e07a7a'),
  mining: (p) => DRAWN.pickaxe(p),
  cooking: (p) => { p.rect(4, 7, 8, 5, '#6a6a78'); p.rect(3, 6, 10, 1, '#8a8a98'); p.rect(6, 3, 1, 2, '#d0d0d8'); p.rect(9, 2, 1, 3, '#d0d0d8'); },
  crafting: (p) => { for (let i = 0; i < 8; i++) p.px(4 + i, 12 - i, '#8a5a2a'); p.rect(9, 2, 5, 4, '#8a8a98'); p.px(10, 3, '#c0c0cc'); },
  charm: (p) => { const r = '#e8405a'; p.rect(4, 4, 3, 2, r); p.rect(9, 4, 3, 2, r); p.rect(3, 5, 10, 3, r); p.rect(4, 8, 8, 1, r); p.rect(5, 9, 6, 1, r); p.rect(6, 10, 4, 1, r); p.rect(7, 11, 2, 1, r); },
  lore: (p) => DRAWN.book(p),
  medicine: (p) => { p.rect(6, 3, 4, 10, '#e04040'); p.rect(3, 6, 10, 4, '#e04040'); p.px(7, 4, '#f08080'); },
};

const PLACE: Record<string, (p: Painter) => void> = {
  home: (p) => { p.rect(3, 8, 10, 6, '#e8d8b8'); p.rect(2, 7, 12, 1, '#a0522d'); p.rect(3, 6, 10, 1, '#a0522d'); p.rect(4, 5, 8, 1, '#a0522d'); p.rect(5, 4, 6, 1, '#a0522d'); p.rect(6, 3, 4, 1, '#a0522d'); p.rect(7, 10, 2, 4, '#6a4a2a'); },
  shop: (p) => { PLACE.home(p); p.rect(2, 7, 12, 1, '#e08a3a'); p.rect(3, 8, 3, 1, '#f0f0e0'); p.rect(9, 8, 3, 1, '#f0f0e0'); },
  workplace: (p) => { PLACE.home(p); p.rect(10, 3, 2, 4, '#6a6a78'); },
  public: (p) => { p.rect(6, 2, 4, 9, '#8a8a98'); p.rect(4, 11, 8, 3, '#8a8a98'); p.rect(6, 4, 1, 5, '#b8b8c8'); },
  nature: (p) => { p.disc(8, 6, 4, '#5fa83c'); p.rect(7, 9, 2, 5, '#6b4a2b'); },
  farm: (p) => SKILL.farming(p),
  landmark: (p) => { p.rect(6, 4, 4, 8, '#c8b090'); p.rect(4, 12, 8, 2, '#a08868'); p.rect(5, 3, 6, 1, '#c8b090'); },
};

export function uiIcon(atlas: Atlas, kind: 'item' | 'place' | 'weather' | 'skill', id: string, size: number): HTMLCanvasElement {
  const key = `${kind}|${id}|${size}`;
  const hit = canvasCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(size, size);
  const g = ctx2d(c);
  if (kind === 'item') {
    const s = itemSprite(atlas, id);
    g.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, 0, 0, size, size);
  } else {
    const tmp = makeCanvas(16, 16);
    const p = new Painter(ctx2d(tmp));
    const table = kind === 'weather' ? WEATHER : kind === 'skill' ? SKILL : PLACE;
    const draw = table[id];
    if (draw) draw(p);
    else { const r = PROPS.signpost; ctx2d(tmp).drawImage(atlas.base, r[0] * 17, r[1] * 17, 16, 16, 0, 0, 16, 16); }
    g.drawImage(tmp, 0, 0, 16, 16, 0, 0, size, size);
  }
  canvasCache.set(key, c);
  return c;
}
