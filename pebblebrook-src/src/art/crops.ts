import type { SpriteRect } from '../core/app.ts';
import { CROP_BY_ID } from '../core/items.ts';
import { ctx2d, makeCanvas, Painter, shade } from './pixel.ts';

/**
 * Crop stage sprites, drawn in code (the Kenney sheet has no crops). Each crop gets `stages` frames;
 * tall crops (corn, sunflower) are 16×32 and draw one tile up. Stage 0 = just planted.
 */

interface CropStyle { leaf: string; tall?: boolean; ripe: (p: Painter, x: number, baseY: number) => void; flowerAt?: number }

const G1 = '#5fa83c', G2 = '#3f7f2a', G3 = '#7cc24f';

const STYLES: Record<string, CropStyle> = {
  turnip: { leaf: G3, ripe: (p, x, y) => { p.rect(x + 5, y - 3, 6, 3, '#f0eae0'); p.rect(x + 5, y - 4, 6, 1, '#b76bb0'); p.px(x + 10, y - 2, '#d8d0c4'); } },
  potato: { leaf: G2, ripe: (p, x, y) => { p.px(x + 4, y - 9, '#fff'); p.px(x + 9, y - 10, '#fff'); p.px(x + 12, y - 8, '#fff'); p.px(x + 5, y - 1, '#c9a06a'); p.px(x + 10, y - 1, '#c9a06a'); } },
  strawberry: { leaf: G1, ripe: (p, x, y) => { for (const [dx, dy] of [[3, -3], [8, -2], [12, -4]]) { p.rect(x + dx, y + dy, 2, 2, '#e04040'); p.px(x + dx, y + dy - 1, '#3f7f2a'); } } },
  corn: { leaf: '#6fb043', tall: true, ripe: (p, x, y) => { p.rect(x + 4, y - 12, 2, 4, '#f2d24a'); p.rect(x + 10, y - 15, 2, 4, '#f2d24a'); p.px(x + 4, y - 13, '#8fbf4f'); p.px(x + 11, y - 16, '#8fbf4f'); } },
  tomato: { leaf: G2, ripe: (p, x, y) => { for (const [dx, dy] of [[3, -5], [9, -8], [11, -3]]) { p.rect(x + dx, y + dy, 3, 3, '#e04a3a'); p.px(x + dx + 1, y + dy - 1, '#3f7f2a'); p.px(x + dx, y + dy, '#f07a6a'); } } },
  wheat: { leaf: '#c9b04a', ripe: (p, x, y) => { for (let i = 0; i < 5; i++) { const px = x + 3 + i * 2; p.rect(px, y - 12 + (i % 2), 1, 4, '#e6c85a'); p.px(px - 1, y - 11 + (i % 2), '#e6c85a'); p.px(px + 1, y - 10 + (i % 2), '#e6c85a'); } } },
  sunflower: { leaf: '#5fa83c', tall: true, ripe: (p, x, y) => { p.disc(x + 8, y - 20, 4, '#f2c62a'); p.disc(x + 8, y - 20, 2, '#6b4a1a'); p.px(x + 8, y - 21, '#4a3010'); } },
  pumpkin: { leaf: G2, ripe: (p, x, y) => { p.rect(x + 4, y - 5, 8, 5, '#e88a2a'); p.rect(x + 3, y - 4, 10, 3, '#e88a2a'); p.rect(x + 7, y - 6, 2, 1, '#5a7a2a'); p.rect(x + 6, y - 4, 1, 3, '#c9701e'); p.rect(x + 9, y - 4, 1, 3, '#c9701e'); } },
  cabbage: { leaf: '#8fc86a', ripe: (p, x, y) => { p.disc(x + 8, y - 4, 4, '#b8dc8a'); p.disc(x + 8, y - 4, 2, '#d8ecb8'); p.px(x + 6, y - 6, '#8fc86a'); p.px(x + 10, y - 6, '#8fc86a'); } },
};

function drawStage(p: Painter, id: string, stage: number, stages: number, x: number, baseY: number): void {
  const st = STYLES[id] ?? STYLES.turnip;
  const t = stages <= 1 ? 1 : stage / (stages - 1); // 0..1
  const leaf = st.leaf, dark = shade(leaf, -0.3);
  if (stage === 0) { // sprout
    p.rect(x + 7, baseY - 2, 1, 2, dark); p.px(x + 6, baseY - 3, leaf); p.px(x + 8, baseY - 3, leaf);
    return;
  }
  const h = st.tall ? Math.round(4 + t * 18) : Math.round(3 + t * 6);
  if (st.tall) {
    // stalk with alternating leaves
    p.rect(x + 7, baseY - h, 2, h, dark);
    for (let i = 2; i < h; i += 3) {
      const side = (i / 3) % 2 === 0 ? -1 : 1;
      const lx = side < 0 ? x + 4 : x + 9;
      p.rect(lx, baseY - i, 3, 1, leaf);
      p.px(side < 0 ? x + 3 : x + 12, baseY - i - 1, leaf);
    }
  } else {
    // bushy: overlapping leaf blobs, wider with growth
    const w = Math.round(4 + t * 8);
    const cx = x + 8;
    p.rect(cx - w / 2, baseY - Math.ceil(h / 2), w, Math.ceil(h / 2), leaf);
    p.rect(cx - w / 2 + 1, baseY - h, w - 2, h - Math.ceil(h / 2), leaf);
    p.rect(cx - w / 2 + 1, baseY - 1, w - 2, 1, dark);
    p.px(cx - w / 2, baseY - h + 1, dark); p.px(cx + w / 2 - 1, baseY - 2, dark);
    // leaf highlights
    for (let i = 0; i < w; i += 3) p.px(cx - w / 2 + i + 1, baseY - h + 1 + (i % 2), shade(leaf, 0.25));
  }
  if (stage === stages - 1) st.ripe(p, x, baseY);
  else if (stage === stages - 2 && st.flowerAt !== undefined) p.px(x + 8, baseY - h, '#fff');
}

const cache = new Map<string, SpriteRect>();

export function cropSprite(id: string, stage: number): SpriteRect {
  const def = CROP_BY_ID[id];
  const stages = def?.stages ?? 4;
  const s = Math.max(0, Math.min(stages - 1, Math.floor(stage)));
  const key = `${id}|${s}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tall = STYLES[id]?.tall ?? false;
  const c = makeCanvas(16, tall ? 32 : 16);
  const p = new Painter(ctx2d(c));
  drawStage(p, id, s, stages, 0, tall ? 30 : 14);
  const rect: SpriteRect = { img: c, sx: 0, sy: 0, sw: 16, sh: c.height, oy: tall ? -1 : 0 };
  cache.set(key, rect);
  return rect;
}

/** the harvested produce, for item icons */
export function produceIcon(id: string, p: Painter, x: number, y: number): boolean {
  switch (id) {
    case 'turnip': p.rect(x + 5, y + 6, 6, 6, '#f2ece2'); p.rect(x + 4, y + 7, 8, 3, '#f2ece2'); p.rect(x + 5, y + 5, 6, 2, '#b76bb0'); p.rect(x + 7, y + 2, 2, 3, '#5fa83c'); p.px(x + 6, y + 3, '#5fa83c'); p.px(x + 9, y + 3, '#5fa83c'); return true;
    case 'potato': p.rect(x + 4, y + 6, 8, 5, '#c9a06a'); p.rect(x + 5, y + 5, 6, 7, '#c9a06a'); p.px(x + 6, y + 7, '#a8814e'); p.px(x + 9, y + 9, '#a8814e'); return true;
    case 'strawberry': p.rect(x + 5, y + 6, 6, 5, '#e04040'); p.rect(x + 6, y + 11, 4, 1, '#e04040'); p.rect(x + 7, y + 12, 2, 1, '#c03030'); p.rect(x + 5, y + 5, 6, 1, '#3f7f2a'); p.px(x + 7, y + 4, '#3f7f2a'); p.px(x + 6, y + 8, '#f8d0d0'); p.px(x + 9, y + 9, '#f8d0d0'); return true;
    case 'corn': p.rect(x + 6, y + 3, 4, 10, '#f2d24a'); p.rect(x + 5, y + 4, 1, 8, '#8fbf4f'); p.rect(x + 10, y + 4, 1, 8, '#8fbf4f'); p.px(x + 7, y + 5, '#e0b830'); p.px(x + 8, y + 8, '#e0b830'); return true;
    case 'tomato': p.disc(x + 8, y + 8, 4, '#e04a3a'); p.px(x + 6, y + 6, '#f07a6a'); p.rect(x + 7, y + 3, 2, 2, '#3f7f2a'); p.px(x + 6, y + 4, '#3f7f2a'); p.px(x + 9, y + 4, '#3f7f2a'); return true;
    case 'pumpkin': p.rect(x + 3, y + 6, 10, 6, '#e88a2a'); p.rect(x + 4, y + 5, 8, 8, '#e88a2a'); p.rect(x + 6, y + 5, 1, 7, '#c9701e'); p.rect(x + 9, y + 5, 1, 7, '#c9701e'); p.rect(x + 7, y + 3, 2, 2, '#5a7a2a'); return true;
    case 'wheat': for (let i = 0; i < 3; i++) { const px = x + 5 + i * 3; p.rect(px, y + 3 + i, 1, 10 - i, '#c9b04a'); p.rect(px - 1, y + 3 + i, 3, 4, '#e6c85a'); } return true;
    case 'cabbage': p.disc(x + 8, y + 8, 5, '#8fc86a'); p.disc(x + 8, y + 8, 3, '#b8dc8a'); p.px(x + 7, y + 7, '#d8ecb8'); return true;
    case 'sunflower': p.disc(x + 8, y + 7, 5, '#f2c62a'); p.disc(x + 8, y + 7, 2, '#6b4a1a'); p.rect(x + 7, y + 12, 2, 3, '#5fa83c'); return true;
    default: return false;
  }
}
