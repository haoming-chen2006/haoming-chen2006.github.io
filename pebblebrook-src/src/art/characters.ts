import type { CharacterSprites, SpriteRect } from '../core/app.ts';
import type { Dir, Villager } from '../core/types.ts';
import { ctx2d, luma, makeCanvas, mix, OUTLINE, Painter, shade } from './pixel.ts';

/**
 * Character generator. Every villager is composed in code so they can walk in four directions:
 * body (skin, build, height) + hair (11 styles) + outfit (colour, accent) + hat + profession details.
 * Frames are 16×28 (feet at the bottom row minus one, one pixel of headroom for the outline).
 */

export type Look = Villager['look'];
export const FRAME_W = 16, FRAME_H = 28;
const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const FRAMES = 5; // 0 idle, 1..4 walk

interface Anatomy {
  H: number; y0: number; hairTop: number; headX: number; headY: number; headW: number; headH: number;
  neckY: number; torsoX: number; torsoY: number; torsoW: number; torsoH: number; legY: number; legH: number; feetY: number; armW: number;
}

function anatomy(look: Look): Anatomy {
  const H = Math.max(21, Math.min(26, Math.round(look.height || 24)));
  const hairTop = H >= 24 ? 2 : 1;
  const legH = H >= 25 ? 6 : 5;
  const torsoH = H >= 26 ? 8 : 7;
  const headH = 8;
  const torsoW = look.build === 'slim' ? 6 : look.build === 'broad' ? 10 : 8;
  const armW = look.build === 'slim' ? 1 : 2;
  const y0 = FRAME_H - 1 - H; // top row of the sprite (leaves a 1 px outline margin at the bottom)
  const headY = y0 + hairTop;
  const neckY = headY + headH;
  const torsoY = neckY + 1;
  const legY = torsoY + torsoH;
  const feetY = legY + legH;
  return { H, y0, hairTop, headX: 4, headY, headW: 8, headH, neckY, torsoX: 8 - torsoW / 2, torsoY, torsoW, torsoH, legY, legH, feetY, armW };
}

interface Palette { skin: string; skinDark: string; hair: string; hairDark: string; outfit: string; outfitDark: string; accent: string; pants: string; shoes: string; eye: string }

function palette(look: Look): Palette {
  const outfit = look.outfit || '#6a7a9a';
  return {
    skin: look.skin, skinDark: shade(look.skin, -0.18),
    hair: look.hair, hairDark: shade(look.hair, -0.28),
    outfit, outfitDark: shade(outfit, -0.28),
    accent: look.accent || '#e0c070',
    pants: mix(outfit, '#3a2a20', 0.55),
    shoes: '#4a3222',
    eye: '#2a1e1a',
  };
}

/** per-frame pose deltas */
interface Pose { bob: number; leftLeg: number; rightLeg: number; leftArm: number; rightArm: number; stride: number }
function pose(frame: number): Pose {
  switch (frame) {
    case 1: return { bob: -1, leftLeg: 0, rightLeg: 1, leftArm: 1, rightArm: -1, stride: 1 };
    case 2: return { bob: 0, leftLeg: 0, rightLeg: 0, leftArm: 0, rightArm: 0, stride: 0 };
    case 3: return { bob: -1, leftLeg: 1, rightLeg: 0, leftArm: -1, rightArm: 1, stride: -1 };
    case 4: return { bob: 0, leftLeg: 0, rightLeg: 0, leftArm: 0, rightArm: 0, stride: 0 };
    default: return { bob: 0, leftLeg: 0, rightLeg: 0, leftArm: 0, rightArm: 0, stride: 0 };
  }
}

function drawLegs(p: Painter, a: Anatomy, pal: Palette, dir: Dir, po: Pose): void {
  const legW = a.torsoW >= 8 ? 3 : 2;
  const lx = a.torsoX + (a.torsoW === 10 ? 1 : 0) + (a.torsoW === 6 ? 0 : 1);
  const rx = a.torsoX + a.torsoW - legW - (a.torsoW === 10 ? 1 : 0) - (a.torsoW === 6 ? 0 : 1);
  const bottom = a.feetY; // shoes row
  if (dir === 'down' || dir === 'up') {
    const lh = a.legH - po.leftLeg, rh = a.legH - po.rightLeg;
    p.rect(lx, a.legY + po.bob, legW, lh, pal.pants);
    p.rect(rx, a.legY + po.bob, legW, rh, pal.pants);
    p.rect(lx, bottom - po.leftLeg, legW, 1, pal.shoes);
    p.rect(rx, bottom - po.rightLeg, legW, 1, pal.shoes);
  } else {
    const face = dir === 'right' ? 1 : -1;
    const cx = 8 - legW;
    // back leg (darker) and front leg, split by stride
    const bx = cx - po.stride * face, fx = cx + 1 + po.stride * face;
    p.rect(bx, a.legY + po.bob, legW, a.legH, shade(pal.pants, -0.2));
    p.rect(bx, bottom, legW, 1, shade(pal.shoes, -0.2));
    p.rect(fx, a.legY + po.bob, legW, a.legH, pal.pants);
    p.rect(fx, bottom, legW + (po.stride !== 0 ? 1 : 0), 1, pal.shoes);
  }
}

function drawTorso(p: Painter, a: Anatomy, pal: Palette, dir: Dir, po: Pose, prof: string): void {
  const y = a.torsoY + po.bob;
  p.rect(a.torsoX, y, a.torsoW, a.torsoH, pal.outfit);
  p.rect(a.torsoX + a.torsoW - 1, y, 1, a.torsoH, pal.outfitDark);
  p.rect(a.torsoX, y + a.torsoH - 1, a.torsoW, 1, pal.outfitDark);
  if (dir !== 'up') {
    // collar and belt
    p.rect(8 - 1, y, 2, 1, pal.accent);
    p.rect(a.torsoX, y + a.torsoH - 2, a.torsoW, 1, pal.accent);
    p.px(8, y + a.torsoH - 2, shade(pal.accent, -0.4));
  } else {
    p.rect(a.torsoX, y + a.torsoH - 2, a.torsoW, 1, pal.accent);
  }
  // profession overlays on the front
  if (dir !== 'up') {
    if (prof === 'baker') { p.rect(a.torsoX + 1, y + 2, a.torsoW - 2, a.torsoH - 2, '#f4efe3'); p.rect(a.torsoX + 1, y + a.torsoH - 1, a.torsoW - 2, 1, '#d8d0c0'); p.rect(7, y + 1, 2, 1, '#f4efe3'); }
    if (prof === 'blacksmith') { p.rect(a.torsoX + 1, y + 1, a.torsoW - 2, a.torsoH - 1, '#5a3a22'); p.rect(a.torsoX + 1, y + a.torsoH - 1, a.torsoW - 2, 1, '#3e2716'); p.rect(7, y, 2, 1, '#5a3a22'); }
    if (prof === 'doctor') { p.rect(7, y + 2, 2, 3, '#e04848'); p.rect(6, y + 3, 4, 1, '#e04848'); }
    if (prof === 'shopkeeper') { p.rect(a.torsoX, y, 2, a.torsoH - 2, pal.accent); p.rect(a.torsoX + a.torsoW - 2, y, 2, a.torsoH - 2, pal.accent); p.rect(8 - 1, y + 1, 2, 2, '#b0342a'); }
    if (prof === 'innkeeper') { p.rect(a.torsoX + 1, y + 1, 2, a.torsoH - 3, shade(pal.outfit, -0.35)); p.rect(a.torsoX + a.torsoW - 3, y + 1, 2, a.torsoH - 3, shade(pal.outfit, -0.35)); }
    if (prof === 'carpenter') { p.rect(a.torsoX, y + a.torsoH - 2, a.torsoW, 1, '#6b4a2b'); p.rect(a.torsoX + 1, y + a.torsoH - 2, 2, 2, '#8a6a3a'); }
    if (prof === 'miner') { p.rect(a.torsoX, y + 1, a.torsoW, 1, shade(pal.outfit, -0.2)); p.rect(a.torsoX + 1, y + 3, 1, 1, shade(pal.outfit, -0.4)); }
    if (prof === 'farmer') { p.rect(a.torsoX + 1, y + 1, 1, a.torsoH - 3, pal.accent); p.rect(a.torsoX + a.torsoW - 2, y + 1, 1, a.torsoH - 3, pal.accent); }
    if (prof === 'fisher') { p.rect(a.torsoX + 1, y + 2, a.torsoW - 2, 1, shade(pal.outfit, 0.25)); p.rect(a.torsoX + 1, y + 4, a.torsoW - 2, 1, shade(pal.outfit, 0.25)); }
    if (prof === 'librarian') { p.rect(7, y + 1, 2, a.torsoH - 3, pal.accent); }
  }
}

function drawArms(p: Painter, a: Anatomy, pal: Palette, dir: Dir, po: Pose, prof: string, back: boolean): void {
  const y = a.torsoY + po.bob + 1;
  const h = a.torsoH - 2;
  const sleeve = prof === 'innkeeper' ? 2 : 0; // rolled sleeves show skin
  const arm = (x: number, dy: number, dark: boolean) => {
    const col = dark ? pal.outfitDark : pal.outfit;
    p.rect(x, y + dy, a.armW, h - sleeve, col);
    if (sleeve) p.rect(x, y + dy + h - sleeve, a.armW, sleeve, dark ? pal.skinDark : pal.skin);
    p.rect(x, y + dy + h, a.armW, 1, dark ? pal.skinDark : pal.skin); // hand
  };
  if (dir === 'down' || dir === 'up') {
    if (back) return;
    arm(a.torsoX - a.armW, po.leftArm, false);
    arm(a.torsoX + a.torsoW, po.rightArm, true);
  } else {
    const face = dir === 'right' ? 1 : -1;
    if (back) { arm(8 - 1 - po.stride * face - (face > 0 ? a.armW : 0), 0, true); return; }
    arm(8 - (face > 0 ? 0 : a.armW) + po.stride * face, 0, false);
  }
}

function drawHead(p: Painter, a: Anatomy, pal: Palette, dir: Dir, po: Pose, look: Look, prof: string): void {
  const y = a.headY + po.bob;
  const x = a.headX + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
  // neck
  p.rect(7, a.neckY + po.bob, 2, 1, pal.skinDark);
  // head
  p.rect(x, y, a.headW, a.headH, pal.skin);
  p.rect(x + a.headW - 1, y + 1, 1, a.headH - 1, pal.skinDark);
  p.rect(x + 1, y + a.headH - 1, a.headW - 2, 1, pal.skinDark);
  // ears
  if (dir === 'down' || dir === 'up') { p.px(x - 1, y + 4, pal.skin); p.px(x + a.headW, y + 4, pal.skinDark); }
  // face
  if (dir === 'down') {
    p.px(x + 2, y + 4, pal.eye); p.px(x + 5, y + 4, pal.eye);
    p.px(x + 2, y + 5, shade(pal.skin, -0.08)); p.px(x + 5, y + 5, shade(pal.skin, -0.08));
    p.rect(x + 3, y + 6, 2, 1, shade(pal.skin, -0.25)); // mouth
    if (prof === 'librarian') { const gl = '#4a4a5a'; p.hline(x + 1, x + 3, y + 5, gl); p.hline(x + 4, x + 6, y + 5, gl); p.px(x + 1, y + 4, gl); p.px(x + 6, y + 4, gl); p.px(x + 2, y + 4, pal.eye); p.px(x + 5, y + 4, pal.eye); }
  } else if (dir === 'left' || dir === 'right') {
    const ex = dir === 'left' ? x + 1 : x + a.headW - 2;
    p.px(ex, y + 4, pal.eye);
    p.px(dir === 'left' ? x - 1 : x + a.headW, y + 5, pal.skin); // nose
    p.px(dir === 'left' ? x : x + a.headW - 1, y + 6, shade(pal.skin, -0.25)); // mouth
    if (prof === 'librarian') { const gl = '#4a4a5a'; p.hline(ex - 1, ex + 1, y + 5, gl); p.px(dir === 'left' ? ex - 1 : ex + 1, y + 4, gl); p.px(ex, y + 4, pal.eye); }
  }
  // beard (style 5) on the front/sides
  if (look.hairStyle === 5 && dir !== 'up') {
    if (dir === 'down') { p.rect(x + 1, y + 6, a.headW - 2, 2, pal.hair); p.rect(x + 2, y + 8, a.headW - 4, 1, pal.hair); p.rect(x + 3, y + 6, 2, 1, shade(pal.skin, -0.25)); }
    else { const bx = dir === 'left' ? x - 1 : x + a.headW - 3; p.rect(bx, y + 6, 4, 2, pal.hair); p.rect(bx + 1, y + 8, 2, 1, pal.hair); }
  }
}

function drawHair(p: Painter, a: Anatomy, pal: Palette, dir: Dir, po: Pose, look: Look): void {
  const y = a.headY + po.bob;
  const x = a.headX + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
  const w = a.headW;
  const top = y - a.hairTop;
  const h = pal.hair, hd = pal.hairDark;
  const back = dir === 'up';
  const side = dir === 'left' || dir === 'right';
  const style = look.hairStyle;
  // base cap: rows above the head + top two rows of the head
  const cap = (extra: number) => { p.rect(x - extra, top, w + extra * 2, a.hairTop + 2, h); p.rect(x + w - 1 + extra, top + 1, 1, a.hairTop + 1, hd); };
  switch (style) {
    case 0: // short crop
      cap(0); p.rect(x, y + 2, 1, 2, h); p.rect(x + w - 1, y + 2, 1, 2, hd);
      if (back) p.rect(x, y + 2, w, 2, h);
      break;
    case 1: // bob
      cap(1); p.rect(x - 1, y + 2, 2, 5, h); p.rect(x + w - 1, y + 2, 2, 5, hd);
      if (!back && !side) p.rect(x + 1, y + 2, 2, 1, h);
      if (back) p.rect(x, y + 2, w, 5, h);
      if (side) p.rect(x, y + 2, w, 1, h);
      break;
    case 2: // bun / tied back
      cap(0); p.rect(x, y + 2, 1, 1, h); p.rect(x + w - 1, y + 2, 1, 1, hd);
      if (back) { p.rect(x, y + 2, w, 2, h); p.rect(x + 2, top - 1, 4, 2, h); p.rect(x + 2, top - 1, 4, 1, hd); }
      if (side) { const bx = dir === 'left' ? x + w - 1 : x - 2; p.rect(bx, top + 1, 3, 3, h); p.px(bx + 1, top + 1, hd); }
      if (dir === 'down') p.rect(x + 2, top - 1, 4, 1, h);
      break;
    case 3: // messy spikes
      cap(0); p.px(x + 1, top - 1, h); p.px(x + 4, top - 1, h); p.px(x + 6, top - 1, h); p.px(x - 1, top + 1, h); p.px(x + w, top + 1, hd);
      p.rect(x, y + 2, 1, 2, h); p.rect(x + w - 1, y + 2, 1, 2, hd);
      if (back) p.rect(x, y + 2, w, 3, h);
      break;
    case 4: // long straight
      cap(1); p.rect(x - 1, y + 2, 2, a.headH, h); p.rect(x + w - 1, y + 2, 2, a.headH, hd);
      if (back) p.rect(x, y + 2, w, a.headH + 1, h);
      if (side) { const bx = dir === 'left' ? x + w - 2 : x - 1; p.rect(bx, y + 2, 3, a.headH, dir === 'left' ? hd : h); }
      if (!back) p.rect(x + (dir === 'right' ? 1 : 0), y + 2, 3, 1, h);
      break;
    case 5: // receding + beard (beard drawn with the head)
      p.rect(x, top + a.hairTop, w, 2, h); p.rect(x + 2, top + a.hairTop, w - 4, 1, pal.skin); p.rect(x + w - 1, top + a.hairTop, 1, 2, hd);
      if (back) p.rect(x, top + a.hairTop, w, 4, h);
      break;
    case 6: // big curly
      cap(2); p.rect(x - 2, y + 2, 2, 4, h); p.rect(x + w, y + 2, 2, 4, hd);
      p.px(x - 2, top, h); p.px(x + w + 1, top, hd); p.px(x - 1, top - 1, h); p.px(x + 3, top - 1, h); p.px(x + w, top - 1, hd);
      p.px(x - 2, y + 6, h); p.px(x + w + 1, y + 6, hd);
      if (back) p.rect(x - 1, y + 2, w + 2, 5, h);
      break;
    case 7: // braid
      cap(0); p.rect(x, y + 2, 1, 1, h); p.rect(x + w - 1, y + 2, 1, 1, hd);
      if (back) { p.rect(x, y + 2, w, 2, h); for (let i = 0; i < 6; i++) p.rect(7 + (i % 2), y + 4 + i, 2, 1, i % 2 ? hd : h); }
      if (side) { const bx = dir === 'left' ? x + w - 1 : x - 1; for (let i = 0; i < 6; i++) p.rect(bx + (dir === 'left' ? (i % 2) : -(i % 2)), y + 3 + i, 1, 1, i % 2 ? hd : h); }
      break;
    case 8: // slick side part
      cap(0); p.rect(x + 2, top + a.hairTop - 1, 1, 2, shade(h, 0.25)); p.rect(x, y + 2, 1, 2, h); p.rect(x + w - 1, y + 2, 1, 3, hd);
      if (back) p.rect(x, y + 2, w, 2, h);
      break;
    case 9: // long wavy
      cap(1);
      for (let i = 0; i < a.headH; i++) { p.rect(x - 1 - (i % 2 === 0 ? 1 : 0), y + 2 + i, 2, 1, h); p.rect(x + w - 1 + (i % 2 === 0 ? 1 : 0), y + 2 + i, 2, 1, hd); }
      if (back) p.rect(x, y + 2, w, a.headH + 1, h);
      if (side) { const bx = dir === 'left' ? x + w - 2 : x - 1; p.rect(bx, y + 2, 3, a.headH, dir === 'left' ? hd : h); }
      if (!back) p.rect(x + (dir === 'right' ? 2 : 0), y + 2, 3, 1, h);
      break;
    default: // 10: shaggy mid-length
      cap(1); p.rect(x - 1, y + 2, 2, 3, h); p.rect(x + w - 1, y + 2, 2, 3, hd); p.px(x - 1, y + 5, h); p.px(x + w, y + 5, hd);
      p.rect(x + 1, y + 2, 1, 1, h); p.rect(x + 4, y + 2, 2, 1, h);
      if (back) p.rect(x, y + 2, w, 4, h);
      break;
  }
}

function drawHat(p: Painter, a: Anatomy, pal: Palette, dir: Dir, po: Pose, look: Look): void {
  if (!look.hat) return;
  const y = a.headY + po.bob;
  const x = a.headX + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
  const top = y - a.hairTop;
  const w = a.headW;
  switch (look.hat) {
    case 1: { // straw wide-brim
      const s = '#d9b85a', sd = '#b8963f';
      p.rect(x - 2, top + 1, w + 4, 1, s); p.rect(x - 2, top + 2, w + 4, 1, sd);
      p.rect(x + 1, top - 1, w - 2, 2, s); p.rect(x + 1, top, w - 2, 1, pal.accent);
      break;
    }
    case 2: { // fisher's cap
      const c = shade(pal.outfit, -0.15);
      p.rect(x, top, w, a.hairTop + 1, c); p.rect(x + w - 1, top + 1, 1, a.hairTop, shade(c, -0.3));
      if (dir === 'down') p.rect(x - 1, top + a.hairTop + 1, w + 2, 1, shade(c, -0.3));
      else if (dir !== 'up') p.rect(dir === 'left' ? x - 2 : x + w - 1, top + a.hairTop + 1, 3, 1, shade(c, -0.3));
      break;
    }
    case 3: { // miner's helmet with lamp
      const c = '#c9a44f';
      p.rect(x, top, w, a.hairTop + 2, c); p.rect(x + 1, top - 1, w - 2, 1, c); p.rect(x + w - 1, top, 1, a.hairTop + 2, shade(c, -0.3));
      if (dir === 'down') { p.rect(x + 3, top, 2, 2, '#fff3a8'); p.rect(x - 1, top + a.hairTop + 2, w + 2, 1, shade(c, -0.3)); }
      if (dir === 'left') p.rect(x, top, 2, 2, '#fff3a8');
      if (dir === 'right') p.rect(x + w - 2, top, 2, 2, '#fff3a8');
      break;
    }
    case 4: { // flat cap
      const c = shade(pal.accent, -0.2);
      p.rect(x, top, w, a.hairTop + 1, c); p.rect(x + w - 1, top + 1, 1, a.hairTop, shade(c, -0.3));
      if (dir === 'down') p.rect(x - 1, top + a.hairTop + 1, w + 2, 1, shade(c, -0.3));
      if (dir === 'left') p.rect(x - 2, top + a.hairTop + 1, 3, 1, shade(c, -0.3));
      if (dir === 'right') p.rect(x + w - 1, top + a.hairTop + 1, 3, 1, shade(c, -0.3));
      break;
    }
    default: break;
  }
}

/** Draw one frame (no outline) into the painter's current offset. */
function drawFrame(p: Painter, look: Look, prof: string, dir: Dir, frame: number): void {
  const a = anatomy(look), pal = palette(look), po = pose(frame);
  drawArms(p, a, pal, dir, po, prof, true);
  drawLegs(p, a, pal, dir, po);
  drawTorso(p, a, pal, dir, po, prof);
  drawArms(p, a, pal, dir, po, prof, false);
  drawHead(p, a, pal, dir, po, look, prof);
  drawHair(p, a, pal, dir, po, look);
  drawHat(p, a, pal, dir, po, look);
}

/** silhouette-based 1 px outline: the frame is drawn 4 times offset in the outline colour, then on top */
function outlined(src: HTMLCanvasElement, outline: string): HTMLCanvasElement {
  const sil = makeCanvas(src.width, src.height);
  const sg = ctx2d(sil);
  sg.drawImage(src, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = outline;
  sg.fillRect(0, 0, sil.width, sil.height);
  const out = makeCanvas(src.width, src.height);
  const g = ctx2d(out);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(sil, dx, dy);
  g.drawImage(src, 0, 0);
  return out;
}

const cache = new Map<string, CharacterSprites>();

export function characterKey(look: Look, profession?: string): string {
  return JSON.stringify([look.skin, look.hair, look.hairStyle, look.outfit, look.accent, look.hat ?? 0, look.build, look.height, profession ?? '']);
}

export function buildCharacter(look: Look, profession?: string): CharacterSprites {
  const key = characterKey(look, profession);
  const hit = cache.get(key);
  if (hit) return hit;
  const prof = profession ?? '';
  const raw = makeCanvas(FRAME_W * FRAMES, FRAME_H * DIRS.length);
  const p = new Painter(ctx2d(raw));
  for (let d = 0; d < DIRS.length; d++) {
    for (let f = 0; f < FRAMES; f++) {
      p.dx = f * FRAME_W; p.dy = d * FRAME_H;
      drawFrame(p, look, prof, DIRS[d], f);
    }
  }
  const outline = luma(look.outfit) < 0.2 ? '#1a1410' : OUTLINE;
  const sheet = outlined(raw, outline);
  const frames = {} as Record<Dir, SpriteRect[]>;
  for (let d = 0; d < DIRS.length; d++) {
    frames[DIRS[d]] = [];
    for (let f = 0; f < FRAMES; f++) frames[DIRS[d]].push({ img: sheet, sx: f * FRAME_W, sy: d * FRAME_H, sw: FRAME_W, sh: FRAME_H, oy: -(FRAME_H - 16) / 16 });
  }
  // portrait: head and shoulders of the idle-down frame at 2×
  const portrait = makeCanvas(32, 32);
  const pg = ctx2d(portrait);
  const a = anatomy(look);
  const cropY = Math.max(0, a.y0 - 1);
  pg.drawImage(sheet, 0, cropY, 16, 16, 0, 0, 32, 32);
  const result: CharacterSprites = { frames, width: FRAME_W, height: FRAME_H, portrait };
  cache.set(key, result);
  return result;
}
