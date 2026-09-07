import type { SpriteRect } from '../core/app.ts';
import type { ObjectKind, PlotState, Season } from '../core/types.ts';
import { STRIDE, T, type Atlas } from './atlas.ts';
import { BUSHES, DETAIL, PROPS, TREES, type TileRef } from './catalogue.ts';
import { cropSprite } from './crops.ts';
import { flowerSprite } from './tiles.ts';
import { ctx2d, makeCanvas, OUTLINE, Painter } from './pixel.ts';

/** World objects → sprites. Anything the sheet lacks (well, board, bench, lantern post, animals, ripples) is drawn here. */

const baked = new Map<string, HTMLCanvasElement>();

function drawn(key: string, w: number, h: number, draw: (p: Painter, g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let c = baked.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    const g = ctx2d(c);
    draw(new Painter(g), g);
    baked.set(key, c);
  }
  return c;
}

const rect = (img: HTMLCanvasElement, oy = 0, ox = 0): SpriteRect => ({ img, sx: 0, sy: 0, sw: img.width, sh: img.height, oy, ox });

function blit(atlas: Atlas, g: CanvasRenderingContext2D, r: TileRef, x: number, y: number, season: Season = 'spring'): void {
  g.drawImage(atlas.seasons[season], r[0] * STRIDE, r[1] * STRIDE, T, T, x, y, T, T);
}

/* ------------------------------------------------------------------ drawn props */

function well(): HTMLCanvasElement {
  return drawn('well', 16, 24, (p) => {
    const st = '#9a9aa8', sd = '#6a6a78', wood = '#8a5a2e', wd = '#5a3a1e';
    // roof
    p.rect(3, 1, 10, 1, wd); p.rect(2, 2, 12, 1, '#a0522d'); p.rect(1, 3, 14, 1, '#a0522d'); p.rect(1, 4, 14, 1, '#7a3a1d');
    p.rect(7, 0, 2, 1, wd);
    // posts
    p.rect(2, 5, 2, 10, wood); p.rect(12, 5, 2, 10, wood); p.rect(3, 5, 1, 10, wd); p.rect(13, 5, 1, 10, wd);
    // crossbar + rope + bucket
    p.rect(4, 7, 8, 1, wd); p.rect(8, 8, 1, 4, '#c8b080'); p.rect(6, 12, 4, 3, '#6a4a2a'); p.rect(6, 12, 4, 1, '#8a6a3a');
    // stone ring
    p.rect(2, 15, 12, 7, st); p.rect(1, 16, 14, 6, st); p.rect(1, 21, 14, 1, sd); p.rect(2, 22, 12, 1, sd);
    p.rect(4, 16, 8, 2, '#3a6a88'); p.rect(5, 16, 2, 1, '#6fb0d8');
    for (const [x, y] of [[2, 18], [5, 19], [9, 18], [12, 19], [7, 21]]) p.px(x, y, sd);
    p.rect(1, 15, 1, 1, OUTLINE); p.rect(14, 15, 1, 1, OUTLINE);
  });
}

function board(): HTMLCanvasElement {
  return drawn('board', 16, 20, (p) => {
    const wood = '#8a5a2e', wd = '#5a3a1e';
    p.rect(2, 0, 12, 1, wd); p.rect(1, 1, 14, 1, '#a0522d');
    p.rect(1, 2, 14, 11, wood); p.frame(1, 2, 14, 11, wd);
    p.rect(2, 3, 12, 9, '#c9a86a');
    p.rect(3, 4, 4, 4, '#f4ecd0'); p.rect(8, 4, 5, 3, '#f0e0a0'); p.rect(3, 9, 5, 2, '#f4ecd0'); p.rect(9, 8, 4, 3, '#e8d8f0');
    p.px(4, 4, '#d84040'); p.px(10, 4, '#3070c0'); p.px(4, 9, '#d84040'); p.px(10, 8, '#3070c0');
    p.rect(4, 6, 2, 1, '#8a8a8a'); p.rect(9, 5, 3, 1, '#8a8a8a'); p.rect(4, 10, 3, 1, '#8a8a8a'); p.rect(10, 9, 2, 1, '#8a8a8a');
    p.rect(3, 13, 2, 7, wood); p.rect(11, 13, 2, 7, wood); p.rect(4, 13, 1, 7, wd); p.rect(12, 13, 1, 7, wd);
  });
}

function bench(): HTMLCanvasElement {
  return drawn('bench', 16, 16, (p) => {
    const wood = '#a06a3a', wd = '#6a4020';
    p.rect(1, 6, 14, 2, wood); p.rect(1, 8, 14, 1, wd);
    p.rect(1, 3, 14, 2, wood); p.rect(1, 5, 14, 1, wd);
    p.rect(2, 9, 2, 4, wd); p.rect(12, 9, 2, 4, wd);
    p.rect(2, 1, 2, 2, wd); p.rect(12, 1, 2, 2, wd);
  });
}

function lanternPost(atlas: Atlas, lit: boolean): HTMLCanvasElement {
  return drawn(`lantern|${lit}`, 16, 24, (p, g) => {
    const iron = '#4a4a58', id = '#2e2e38';
    p.rect(7, 8, 2, 14, iron); p.rect(8, 8, 1, 14, id);
    p.rect(5, 22, 6, 2, iron); p.rect(5, 23, 6, 1, id);
    p.rect(6, 7, 4, 1, iron);
    blit(atlas, g, lit ? PROPS.lanternLit : PROPS.lanternDark, 0, -2);
  });
}

function tilled(watered: boolean): HTMLCanvasElement {
  return drawn(`tilled|${watered}`, 16, 16, (p) => {
    // furrows run across plot boundaries (no side margin) so a field reads as one tilled area
    if (watered) p.rect(0, 0, 16, 16, 'rgba(50,28,14,0.30)');
    const line = watered ? '#5a381e' : '#8a5c34', lo = watered ? '#4a2c16' : '#7a4e2a';
    for (let y = 3; y < 16; y += 5) { p.rect(0, y, 16, 1, line); p.rect(0, y + 1, 16, 1, lo); }
    for (const [x, y] of [[3, 1], [11, 6], [6, 11], [13, 12]]) p.px(x, y, lo);
  });
}

function ripple(frame: number): HTMLCanvasElement {
  return drawn(`ripple|${frame}`, 16, 16, (p) => {
    const c = 'rgba(230,250,255,0.85)', c2 = 'rgba(200,240,255,0.45)';
    const r = 2 + frame * 2;
    for (let a = 0; a < 24; a++) {
      const x = Math.round(8 + Math.cos((a / 24) * Math.PI * 2) * r), y = Math.round(8 + Math.sin((a / 24) * Math.PI * 2) * r * 0.55);
      p.px(x, y, frame === 2 ? c2 : c);
    }
    if (frame > 0) for (let a = 0; a < 16; a++) {
      const x = Math.round(8 + Math.cos((a / 16) * Math.PI * 2) * (r - 3)), y = Math.round(8 + Math.sin((a / 16) * Math.PI * 2) * (r - 3) * 0.55);
      p.px(x, y, c2);
    }
    p.px(8, 8, '#ffffff');
  });
}

function oreRock(atlas: Atlas, ore: string, size: string): HTMLCanvasElement {
  return drawn(`rock|${ore}|${size}`, 16, 16, (p, g) => {
    const base = size === 'small' ? PROPS.rockGreySmall : size === 'big' ? PROPS.rockGreyBig : PROPS.rockGreyMed;
    blit(atlas, g, base, 0, 0);
    const col: Record<string, string> = { copper: '#e08a3a', iron: '#b0b8d0', gold: '#f6d34a', gem: '#7ae0f0', stone: '' };
    const c = col[ore] ?? '';
    if (!c) return;
    const spots = size === 'small' ? [[7, 9], [9, 11]] : [[6, 8], [9, 7], [8, 11], [11, 10]];
    for (const [x, y] of spots) { p.px(x, y, c); p.px(x + 1, y, c); p.px(x, y + 1, c); p.px(x + 1, y - 1, '#ffffff'); }
  });
}

function applePile(): HTMLCanvasElement {
  return drawn('applepile', 16, 16, (p) => { for (const [x, y] of [[5, 11], [9, 12], [7, 8], [11, 9]]) { p.disc(x, y, 1, '#d8402a'); p.px(x - 1, y - 1, '#f08070'); p.px(x, y - 2, '#5a3a1a'); } });
}

function ashes(): HTMLCanvasElement {
  return drawn('ashes', 16, 16, (p) => { p.rect(4, 11, 8, 3, '#4a4a4a'); p.rect(3, 12, 10, 2, '#3a3a3a'); p.rect(2, 12, 3, 2, '#6a4a2a'); p.rect(11, 12, 3, 2, '#6a4a2a'); p.px(7, 11, '#8a6a6a'); });
}

function hay(): HTMLCanvasElement {
  return drawn('hay', 16, 16, (p) => { p.rect(2, 6, 12, 8, '#d8b858'); p.rect(3, 5, 10, 1, '#e8cc70'); p.rect(2, 13, 12, 1, '#a88838'); p.rect(2, 9, 12, 1, '#b89848'); for (const [x, y] of [[4, 7], [8, 8], [11, 7], [6, 11], [10, 12]]) p.px(x, y, '#f0dc88'); });
}

function stage(): HTMLCanvasElement {
  return drawn('stage', 16, 16, (p) => {
    const wood = '#a06a3a', wd = '#6a4020', wl = '#c08a50';
    p.rect(0, 4, 16, 9, wood); p.rect(0, 4, 16, 1, wl); p.rect(0, 12, 16, 1, wd);
    for (let x = 3; x < 16; x += 4) p.rect(x, 5, 1, 7, wd);
    p.rect(1, 13, 2, 3, wd); p.rect(13, 13, 2, 3, wd); p.rect(7, 13, 2, 3, wd);
  });
}
function maypole(): HTMLCanvasElement {
  return drawn('maypole', 16, 32, (p) => {
    p.rect(7, 2, 2, 28, '#c8a060'); p.rect(8, 2, 1, 28, '#8a6a3a');
    p.disc(8, 2, 2, '#e04040'); p.px(8, 1, '#f6d34a');
    const cols = ['#e04040', '#f6d34a', '#4a90e0', '#7ab84a', '#d66f8a'];
    for (let i = 0; i < 5; i++) { const dir = i % 2 ? 1 : -1; for (let k = 0; k < 10; k++) p.px(8 + dir * Math.round(k * 0.6 + i * 0.4) % 7, 4 + k * 2 + i, cols[i]); }
    p.rect(5, 29, 6, 2, '#6a4a2a');
  });
}
function scarecrow(): HTMLCanvasElement {
  return drawn('scarecrow', 16, 24, (p) => {
    p.rect(7, 4, 2, 19, '#8a6a3a'); p.rect(2, 9, 12, 2, '#8a6a3a');
    p.rect(5, 2, 6, 5, '#d8b858'); p.rect(4, 3, 8, 1, '#a08838'); p.px(6, 4, OUTLINE); p.px(9, 4, OUTLINE); p.rect(6, 6, 4, 1, '#4a3a2a');
    p.rect(4, 0, 8, 2, '#5a3a1a'); p.rect(3, 2, 10, 1, '#5a3a1a');
    p.rect(4, 8, 8, 8, '#6a5a9a'); p.rect(3, 9, 10, 3, '#6a5a9a'); p.rect(4, 15, 8, 1, '#3a2a5a'); p.px(6, 11, '#d8b858'); p.px(10, 13, '#d8b858');
    p.rect(1, 9, 3, 2, '#d8b858'); p.rect(12, 9, 3, 2, '#d8b858');
  });
}
function trough(): HTMLCanvasElement {
  return drawn('trough', 16, 16, (p) => { p.rect(1, 6, 14, 7, '#8a5a2e'); p.rect(2, 7, 12, 4, '#3a6a88'); p.rect(3, 7, 4, 1, '#6fb0d8'); p.rect(1, 13, 2, 2, '#5a3a1e'); p.rect(13, 13, 2, 2, '#5a3a1e'); p.rect(1, 5, 14, 1, '#a07040'); });
}
function sawhorse(): HTMLCanvasElement {
  return drawn('sawhorse', 16, 16, (p) => { p.rect(2, 6, 12, 2, '#a06a3a'); p.rect(2, 8, 12, 1, '#6a4020'); for (let i = 0; i < 6; i++) { p.px(3 + i, 8 + i, '#6a4020'); p.px(12 - i, 8 + i, '#6a4020'); } p.rect(4, 3, 8, 3, '#c8a878'); p.rect(4, 5, 8, 1, '#a08858'); });
}
function beehive(): HTMLCanvasElement {
  return drawn('beehive', 16, 16, (p) => { p.rect(4, 3, 8, 10, '#e8d8a8'); p.rect(3, 5, 10, 6, '#e8d8a8'); p.rect(3, 2, 10, 1, '#8a5a2e'); p.rect(2, 1, 12, 1, '#a07040'); p.rect(5, 7, 6, 2, '#5a3a1e'); p.rect(4, 13, 8, 2, '#6a4a2a'); for (const [x, y] of [[2, 6], [13, 4], [1, 10], [14, 9]]) p.px(x, y, '#f6d34a'); });
}
function nets(): HTMLCanvasElement {
  return drawn('nets', 16, 16, (p) => { p.rect(2, 3, 2, 12, '#8a5a2e'); p.rect(12, 3, 2, 12, '#8a5a2e'); for (let y = 4; y < 14; y += 2) for (let x = 4; x < 12; x += 2) { p.px(x, y, '#c8b898'); p.px(x + 1, y + 1, '#c8b898'); } p.rect(2, 3, 12, 1, '#c8b898'); });
}
function mailbox(): HTMLCanvasElement {
  return drawn('mailbox', 16, 16, (p) => { p.rect(7, 7, 2, 9, '#6a4a2a'); p.rect(3, 3, 10, 5, '#5b8fc9'); p.rect(3, 2, 10, 1, '#3f6fb0'); p.rect(4, 4, 3, 2, '#dce8f8'); p.rect(12, 1, 1, 3, '#e04040'); p.px(13, 1, '#e04040'); });
}

/* ------------------------------------------------------------------ animals */

function animalCanvas(kind: string, frame: number, flip: boolean): HTMLCanvasElement {
  return drawn(`animal|${kind}|${frame}|${flip}`, 16, 16, (p, g) => {
    if (flip) { g.translate(16, 0); g.scale(-1, 1); }
    const eye = '#2a1e1a';
    if (kind === 'cow') {
      const b = '#f4f0e8', k = '#3a3230';
      p.rect(2, 6, 12, 6, b); p.rect(3, 5, 10, 1, b); p.rect(3, 12, 10, 1, '#d8d0c8');
      p.rect(4, 7, 3, 3, k); p.rect(9, 6, 3, 2, k); p.px(11, 9, k);
      p.rect(11, 4 + (frame ? 1 : 0), 4, 4, b); p.rect(12, 7 + (frame ? 1 : 0), 3, 2, '#f0b0a8'); // head + muzzle
      p.px(12, 5 + (frame ? 1 : 0), eye); p.px(11, 3 + (frame ? 1 : 0), '#c8c0b8'); p.px(14, 3 + (frame ? 1 : 0), '#c8c0b8');
      p.rect(3, 13, 2, 2, k); p.rect(7, 13, 2, 2, k); p.rect(11, 13, 2, 2, k);
      p.px(1, 7, k); p.px(1, 8, k);
    } else if (kind === 'hen') {
      const b = '#f4ece0', comb = '#d83a3a', beak = '#e8a030';
      p.rect(5, 8, 7, 5, b); p.rect(4, 9, 9, 3, b); p.rect(9, 5 + (frame ? 1 : 0), 4, 4, b);
      p.px(10, 4 + (frame ? 1 : 0), comb); p.px(11, 4 + (frame ? 1 : 0), comb); p.px(13, 7 + (frame ? 1 : 0), beak); p.px(11, 6 + (frame ? 1 : 0), eye);
      p.px(12, 9 + (frame ? 1 : 0), comb); p.rect(3, 8, 2, 2, '#d8c8b0'); p.rect(6, 10, 3, 1, '#d8c8b0');
      p.rect(7, 13, 1, 2, beak); p.rect(10, 13, 1, 2, beak);
    } else { // sheep
      const w = '#f6f2ea', k = '#2e2a2a';
      p.rect(2, 6, 12, 6, w); p.rect(3, 5, 10, 1, w); p.rect(3, 12, 10, 1, '#d8d4cc');
      p.px(2, 5, w); p.px(13, 5, w); p.px(4, 4, w); p.px(9, 4, w);
      p.rect(11, 6 + (frame ? 1 : 0), 4, 4, k); p.px(13, 7 + (frame ? 1 : 0), '#ffffff'); p.px(10, 5 + (frame ? 1 : 0), k); p.px(15, 5 + (frame ? 1 : 0), k);
      p.rect(4, 13, 2, 2, k); p.rect(10, 13, 2, 2, k);
    }
  });
}

export function animalSprite(kind: string, frame: number, flip = false): SpriteRect { return rect(animalCanvas(kind, frame & 1, flip)); }

/* ------------------------------------------------------------------ objects */

const TREE_ALIAS: Record<string, string> = { birch: 'teal', oak: 'oak', pine: 'pine', apple: 'apple', dark: 'dark', teal: 'teal', dead: 'dead', appleFull: 'appleFull' };

function treeSprite(atlas: Atlas, data: Record<string, unknown>, season: Season): SpriteRect {
  let kindName = TREE_ALIAS[String(data.kind ?? data.type ?? 'oak')] ?? 'oak';
  if (data.stump || data.wood === 0) return atlas.ref(PROPS.stump);
  if (kindName === 'apple' && typeof data.fruit === 'number' && data.fruit > 0) kindName = 'appleFull';
  const tree = TREES[kindName] ?? TREES.oak;
  const useAutumn = season === 'autumn' && tree.autumn;
  const refs = useAutumn ? tree.autumn! : tree;
  // `single` = the object stands on a tree tile (the world's forests are one tile per tree)
  const small = data.single || data.size === 'small' || data.stage === 0 || data.sapling;
  if (small) return atlas.ref(refs.single, season);
  return atlas.tall(refs.top, refs.bottom, season);
}

const ORE_ALIAS: Record<string, string> = { stone: 'stone', copper: 'copper', iron: 'iron', gold: 'gold', gem: 'gem', copper_ore: 'copper', iron_ore: 'iron', gold_ore: 'gold' };
const FLOWERBED_COLOURS = ['red', 'white', 'blue', 'red'];

export function objectSprite(atlas: Atlas, kind: ObjectKind, data: Record<string, unknown>, season: Season, frame: number): SpriteRect | SpriteRect[] | null {
  switch (kind) {
    case 'plot': {
      const plot = data as unknown as Partial<PlotState>;
      if (!plot.state || plot.state === 'empty') return null;
      const soil = rect(tilled(!!plot.watered));
      if (plot.state === 'tilled' || !plot.crop) return soil;
      return [soil, cropSprite(plot.crop, plot.stage ?? Math.floor((plot.growth ?? 0) * 4))];
    }
    case 'tree': return treeSprite(atlas, data, season);
    case 'rock': {
      if (data.depleted || (typeof data.hp === 'number' && data.hp <= 0)) return atlas.ref(PROPS.rockGreySmall);
      const ore = ORE_ALIAS[String(data.ore ?? 'stone')] ?? 'stone';
      const size = String(data.size ?? (ore === 'stone' ? 'medium' : 'big'));
      return rect(oreRock(atlas, ore, size));
    }
    case 'fishspot': {
      const parts: SpriteRect[] = [rect(ripple(frame % 3))];
      if (data.lily) parts.unshift(atlas.ref(DETAIL.lilypad[0]));
      return parts;
    }
    case 'forage': {
      if (data.qty === 0 || data.item === null) return null;
      const item = String(data.item ?? 'berries');
      if (item === 'berries') return atlas.ref(BUSHES.berries, season);
      if (item === 'mushroom') return atlas.ref(DETAIL.mushroomRed[(Number(data.variant) || 0) % 2]);
      if (item === 'herbs') return atlas.ref(DETAIL.sprout[0], season);
      if (item === 'wildflower') return atlas.ref([DETAIL.flowerSingleRed, DETAIL.flowerSingleBlue, DETAIL.flowerSinglePurple, DETAIL.flowerSingleWhite][(Number(data.variant) || 0) % 4][0]);
      if (item === 'apple') return rect(applePile());
      return atlas.ref(DETAIL.sprout[1], season);
    }
    case 'bench': return rect(bench());
    case 'well': return rect(well(), -0.5);
    case 'board': return rect(board(), -0.25);
    case 'counter': return atlas.ref(data.goods ? PROPS.shelfGoods : PROPS.counter);
    case 'bed': return atlas.ref(PROPS.bedHeadOrange);
    case 'lantern': return rect(lanternPost(atlas, data.lit !== false), -0.5);
    case 'sign': return atlas.ref(data.dir === 'left' ? PROPS.signLeft : data.dir === 'right' ? PROPS.signRight : PROPS.signpost);
    case 'flowerbed': {
      const raw = data.colour ?? data.color ?? 'red';
      const colour = typeof raw === 'number' ? FLOWERBED_COLOURS[raw & 3] : String(raw);
      return flowerSprite(atlas, colour === 'white' ? 1 : colour === 'blue' ? 2 : 0, season);
    }
    case 'stump': return atlas.ref(PROPS.stump);
    case 'campfire': return data.lit === false ? rect(ashes()) : atlas.ref(frame % 2 ? PROPS.campfireLow : PROPS.campfire);
    case 'shrine': return atlas.tall(PROPS.statueTop, PROPS.statueBottom);
    case 'barrel': return atlas.ref(data.variant === 1 ? PROPS.barrelBanded : PROPS.barrel);
    case 'crate': return atlas.ref(data.variant === 1 ? PROPS.crateGrey : PROPS.crate);
    case 'animal': return animalSprite(String(data.kind ?? data.species ?? 'hen'), frame, data.facing === 'left');
    case 'decoration': {
      const name = String(data.kind ?? data.name ?? 'pot');
      switch (name) {
        case 'tent': return [{ ...atlas.ref(PROPS.tentGreenTL), oy: -1 }, { ...atlas.ref(PROPS.tentGreenTR), ox: 1, oy: -1 }, atlas.ref(PROPS.tentGreenBL), { ...atlas.ref(PROPS.tentGreenBR), ox: 1 }];
        case 'tentBeige': return [{ ...atlas.ref(PROPS.tentBeigeTL), oy: -1 }, { ...atlas.ref(PROPS.tentBeigeTR), ox: 1, oy: -1 }, atlas.ref(PROPS.tentBeigeBL), { ...atlas.ref(PROPS.tentBeigeBR), ox: 1 }];
        case 'awning': return [{ ...atlas.ref(PROPS.awningOrangeTop), oy: -2 }, { ...atlas.ref(PROPS.awningOrangeMid), oy: -1 }, atlas.ref(PROPS.awningOrangeBottom)];
        case 'awningGreen': return [{ ...atlas.ref(PROPS.awningGreenTop), oy: -2 }, { ...atlas.ref(PROPS.awningGreenMid), oy: -1 }, atlas.ref(PROPS.awningGreenBottom)];
        case 'hedge': return atlas.tall(BUSHES.hedgeTop, BUSHES.hedgeBottom, season);
        case 'hedgeDark': return atlas.tall(BUSHES.hedgeDarkTop, BUSHES.hedgeDarkBottom, season);
        case 'bush': return atlas.ref(BUSHES[String(data.variant ?? 'green')] ?? BUSHES.green, season);
        case 'grave': return atlas.ref([PROPS.gravestone, PROPS.gravestoneRound, PROPS.graveCross, PROPS.graveSlab, PROPS.graveCrossWood][(Number(data.variant) || 0) % 5]);
        case 'hay': case 'haybale': return rect(hay());
        case 'minecart': return atlas.ref(PROPS.cartOre);
        case 'gravestone': return atlas.ref([PROPS.gravestone, PROPS.gravestoneRound, PROPS.graveCross, PROPS.graveSlab][String(data.name ?? '').length % 4]);
        case 'stage': return rect(stage());
        case 'maypole': return rect(maypole(), -1);
        case 'scarecrow': return rect(scarecrow(), -0.5);
        case 'trough': return rect(trough());
        case 'sawhorse': return rect(sawhorse());
        case 'beehive': return rect(beehive());
        case 'nets': return rect(nets());
        case 'mailbox': return rect(mailbox());
        case 'lilypad': return atlas.ref(DETAIL.lilypad[0]);
        case 'lily': return atlas.ref(DETAIL.lily[0]);
        case 'mushroom': return atlas.ref(DETAIL.mushroomBrown[(Number(data.variant) || 0) % 4]);
        case 'deadtree': return atlas.tall(TREES.dead.top, TREES.dead.bottom);
        case 'rocks': return atlas.ref([PROPS.rockBrownSmall, PROPS.rockBrownMed, PROPS.rockBrownBig][(Number(data.variant) || 0) % 3]);
        case 'waterrock': return atlas.ref(DETAIL.rockWaterGrey[(Number(data.variant) || 0) % 3]);
        case 'crates': return atlas.ref(PROPS.crateGreyBig);
        case 'sacks': return atlas.ref(PROPS.sackGrain);
        default: {
          const r = PROPS[name];
          return r ? atlas.ref(r) : atlas.ref(PROPS.pot);
        }
      }
    }
    default: return null;
  }
}
