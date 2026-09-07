import type { SpriteRect } from '../core/app.ts';
import { ctx2d, makeCanvas, Painter } from './pixel.ts';

/** Emote bubbles: a 16×16 white speech bubble with a little tail and a glyph inside. */

const INK = '#2f2216';

function bubble(p: Painter): void {
  p.blob(1, 0, 14, 12, '#fffaf0', INK);
  p.rect(2, 1, 12, 10, '#fffaf0');
  p.px(6, 12, INK); p.px(5, 13, INK); p.px(6, 13, '#fffaf0'); p.px(7, 12, '#fffaf0');
  p.px(4, 14, INK);
}

const GLYPHS: Record<string, (p: Painter) => void> = {
  happy: (p) => { p.px(5, 4, INK); p.px(10, 4, INK); p.rect(5, 7, 6, 1, INK); p.px(4, 6, INK); p.px(11, 6, INK); p.px(6, 8, '#f0b0b0'); p.px(9, 8, '#f0b0b0'); },
  sad: (p) => { p.px(5, 4, INK); p.px(10, 4, INK); p.rect(6, 8, 4, 1, INK); p.px(5, 9, INK); p.px(10, 9, INK); p.px(11, 5, '#6fb0e8'); p.px(11, 6, '#6fb0e8'); },
  angry: (p) => { p.px(4, 3, INK); p.px(5, 4, INK); p.px(11, 3, INK); p.px(10, 4, INK); p.rect(5, 8, 6, 1, INK); p.rect(3, 2, 2, 1, '#e04040'); p.rect(11, 2, 2, 1, '#e04040'); },
  love: (p) => { const r = '#e8405a'; p.rect(4, 3, 3, 2, r); p.rect(9, 3, 3, 2, r); p.rect(3, 4, 10, 3, r); p.rect(4, 7, 8, 1, r); p.rect(5, 8, 6, 1, r); p.rect(6, 9, 4, 1, r); p.rect(7, 10, 2, 1, r); p.px(5, 4, '#ff9aa8'); },
  question: (p) => { p.rect(6, 2, 4, 1, INK); p.px(5, 3, INK); p.px(10, 3, INK); p.px(10, 4, INK); p.rect(8, 5, 2, 1, INK); p.px(8, 6, INK); p.px(8, 7, INK); p.px(8, 9, INK); },
  idea: (p) => { const y = '#f6d34a'; p.rect(6, 2, 4, 1, y); p.rect(5, 3, 6, 4, y); p.rect(6, 7, 4, 1, y); p.rect(6, 8, 4, 1, '#c9a24a'); p.rect(7, 9, 2, 1, '#8a7a5a'); p.px(3, 3, y); p.px(12, 3, y); p.px(8, 0, y); },
  sleepy: (p) => { const z = '#6a7fc0'; p.rect(7, 2, 4, 1, z); p.px(10, 3, z); p.px(9, 4, z); p.px(8, 5, z); p.rect(7, 6, 4, 1, z); p.rect(3, 6, 3, 1, z); p.px(5, 7, z); p.px(4, 8, z); p.rect(3, 9, 3, 1, z); },
  music: (p) => { const m = '#4a3a9a'; p.rect(8, 2, 1, 7, m); p.rect(9, 2, 3, 1, m); p.px(11, 3, m); p.rect(6, 8, 3, 2, m); p.px(5, 9, m); },
  sweat: (p) => { const b = '#5fb0ee'; p.px(8, 2, b); p.rect(7, 3, 3, 2, b); p.rect(6, 5, 5, 3, b); p.rect(7, 8, 3, 1, b); p.px(7, 5, '#c8e8ff'); },
  exclaim: (p) => { const r = '#d84030'; p.rect(7, 2, 2, 5, r); p.rect(7, 8, 2, 2, r); },
  sick: (p) => { const g = '#7ab84a'; p.rect(5, 3, 6, 1, g); p.px(4, 4, g); p.px(11, 4, g); p.rect(5, 5, 4, 1, g); p.px(9, 6, g); p.rect(6, 7, 4, 1, g); p.px(10, 8, g); p.rect(5, 9, 6, 1, g); },
};

const cache = new Map<string, SpriteRect>();

export function emoteSprite(kind: string): SpriteRect | null {
  const draw = GLYPHS[kind];
  if (!draw) return null;
  const hit = cache.get(kind);
  if (hit) return hit;
  const c = makeCanvas(16, 16);
  const p = new Painter(ctx2d(c));
  bubble(p);
  draw(p);
  const r: SpriteRect = { img: c, sx: 0, sy: 0, sw: 16, sh: 16 };
  cache.set(kind, r);
  return r;
}
