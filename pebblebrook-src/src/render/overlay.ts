import type { SpriteRect } from '../core/app.ts';
import type { Vec } from '../core/types.ts';
import { TILE, type View } from './common.ts';

/** Screen-space overlays: speech bubbles, emotes, labels, the highlight tile and the vignette. */

const FONT = "600 12px 'Nunito', 'Segoe UI', system-ui, sans-serif";
const FONT_SMALL = "600 10px 'Nunito', 'Segoe UI', system-ui, sans-serif";

export function wrapText(g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** A speech bubble whose tail points at device px (px,py) (the top of a head). alpha 0..1. */
export function drawBubble(g: CanvasRenderingContext2D, view: View, px: number, py: number, text: string, alpha: number, tone?: string): void {
  const d = view.dpr;
  g.save();
  g.globalAlpha = alpha;
  g.font = FONT.replace('12px', `${Math.round(12 * d)}px`);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  const maxW = 150 * d;
  const lines = wrapText(g, text, maxW);
  const lineH = 15 * d;
  const pad = 6 * d;
  let w = 0;
  for (const l of lines) w = Math.max(w, g.measureText(l).width);
  w += pad * 2;
  const h = lines.length * lineH + pad * 2 - 2 * d;
  let x = Math.round(px - w / 2), y = Math.round(py - h - 8 * d);
  x = Math.max(4 * d, Math.min(view.W - w - 4 * d, x));
  if (y < 4 * d) y = 4 * d;
  const fill = tone === 'angry' ? '#ffe4dc' : tone === 'flirty' ? '#ffe6f0' : tone === 'sad' ? '#e6ecf6' : '#fffaf0';
  g.fillStyle = fill;
  g.strokeStyle = '#2f2216';
  g.lineWidth = 1.5 * d;
  roundRect(g, x, y, w, h, 5 * d);
  g.fill(); g.stroke();
  // tail
  const tx = Math.max(x + 8 * d, Math.min(x + w - 8 * d, px));
  g.beginPath(); g.moveTo(tx - 5 * d, y + h); g.lineTo(tx, y + h + 6 * d); g.lineTo(tx + 5 * d, y + h); g.closePath();
  g.fill();
  g.beginPath(); g.moveTo(tx - 5 * d, y + h); g.lineTo(tx, y + h + 6 * d); g.lineTo(tx + 5 * d, y + h); g.stroke();
  g.fillStyle = fill; g.fillRect(tx - 5 * d + 1, y + h - 2 * d, 10 * d - 2, 3 * d);
  g.fillStyle = '#2b2118';
  for (let i = 0; i < lines.length; i++) g.fillText(lines[i], x + pad, y + pad - 1 * d + i * lineH);
  g.restore();
}

export function drawLabel(g: CanvasRenderingContext2D, view: View, px: number, py: number, text: string, opts: { small?: boolean; icon?: SpriteRect | null; colour?: string; below?: boolean } = {}): void {
  const d = view.dpr;
  g.save();
  g.font = (opts.small ? FONT_SMALL : FONT).replace(/(\d+)px/, (_m, n) => `${Math.round(Number(n) * d)}px`);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const iconW = opts.icon ? 14 * d : 0;
  const tw = g.measureText(text).width + iconW + (opts.icon ? 4 * d : 0);
  const h = (opts.small ? 15 : 18) * d, w = tw + 10 * d;
  const x = Math.round(px - w / 2), y = Math.round(opts.below ? py : py - h);
  g.fillStyle = 'rgba(25,20,15,0.78)';
  roundRect(g, x, y, w, h, 4 * d);
  g.fill();
  if (opts.icon) { g.imageSmoothingEnabled = false; g.drawImage(opts.icon.img, opts.icon.sx, opts.icon.sy, opts.icon.sw, opts.icon.sh, x + 4 * d, y + (h - 14 * d) / 2, 14 * d, 14 * d); }
  g.fillStyle = opts.colour ?? '#f3e6c8';
  g.fillText(text, x + 5 * d + iconW + (opts.icon ? 3 * d : 0), y + h / 2 + 0.5 * d);
  g.restore();
}

export function drawHighlight(g: CanvasRenderingContext2D, view: View, tile: Vec, t: number): void {
  const s = view.scale;
  const x = view.ox + tile.x * TILE * s, y = view.oy + tile.y * TILE * s, w = TILE * s;
  const pulse = 0.6 + 0.4 * Math.sin(t * 5);
  g.save();
  g.globalAlpha = pulse;
  g.strokeStyle = '#fff2a0';
  g.lineWidth = s;
  g.strokeRect(x + s / 2, y + s / 2, w - s, w - s);
  g.fillStyle = 'rgba(255,242,160,0.15)';
  g.fillRect(x, y, w, w);
  g.restore();
}

export function drawVignette(g: CanvasRenderingContext2D, view: View, strength: number): void {
  if (strength <= 0) return;
  const cx = view.W / 2, cy = view.H / 2;
  const r = Math.hypot(cx, cy);
  const grad = g.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.05);
  grad.addColorStop(0, 'rgba(10,8,6,0)');
  grad.addColorStop(1, `rgba(10,8,6,${strength.toFixed(3)})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, view.W, view.H);
}
