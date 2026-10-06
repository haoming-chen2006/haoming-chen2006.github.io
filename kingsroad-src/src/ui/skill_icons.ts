import type { AbilityDef, AbilityKind } from '../game/types.ts';
import type { ItemDef } from '../game/items.ts';
import { packHas, packUrl } from '../render3d/hokpack.ts';

/**
 * Painted skill icons: a dark disc with a radial glow in the skill's colour and a glyph for its kind, drawn once per
 * skill and cached as a data URL. Official icons from the sponsor pack (icons/skills/<hero>_<n>.png) take precedence.
 */
const cache = new Map<string, string>();

function glyph(ctx: CanvasRenderingContext2D, kind: AbilityKind, r: number): void {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = r * 0.11;
  const s = r * 0.52;
  switch (kind) {
    case 'lineShot': case 'globalShot': // an arrow
      ctx.beginPath(); ctx.moveTo(-s, s * 0.6); ctx.lineTo(s * 0.9, -s * 0.9); ctx.moveTo(s * 0.9, -s * 0.9); ctx.lineTo(s * 0.2, -s * 0.9); ctx.moveTo(s * 0.9, -s * 0.9); ctx.lineTo(s * 0.9, -s * 0.2); ctx.stroke(); break;
    case 'spreadShot': // fan of three
      for (const a of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.5); ctx.lineTo(-s * 0.6 + Math.cos(-Math.PI / 2 + a) * s * 1.5, s * 0.5 + Math.sin(-Math.PI / 2 + a) * s * 1.5); ctx.stroke(); }
      break;
    case 'aoeAim': case 'aoeSelf': // burst
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.35, Math.sin(a) * s * 0.35); ctx.lineTo(Math.cos(a) * s * (i % 2 ? 0.75 : 1.05), Math.sin(a) * s * (i % 2 ? 0.75 : 1.05)); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill(); break;
    case 'cone': // fan
      ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.6); ctx.arc(-s * 0.7, s * 0.6, s * 1.6, -1.1, -0.1); ctx.closePath(); ctx.fill(); break;
    case 'dashStrike': case 'leap': // chevrons
      for (const dx of [-s * 0.5, s * 0.2]) { ctx.beginPath(); ctx.moveTo(dx - s * 0.3, -s * 0.7); ctx.lineTo(dx + s * 0.3, 0); ctx.lineTo(dx - s * 0.3, s * 0.7); ctx.stroke(); }
      break;
    case 'blink': // dotted hop
      ctx.beginPath(); ctx.arc(-s * 0.7, s * 0.4, s * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(s * 0.7, s * 0.4, s * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([s * 0.12, s * 0.16]); ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.1); ctx.quadraticCurveTo(0, -s * 1.0, s * 0.5, s * 0.1); ctx.stroke(); break;
    case 'spin': // swirl
      ctx.beginPath(); for (let a = 0; a < Math.PI * 2.5; a += 0.15) { const rr = s * 0.15 + a * s * 0.13; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); break;
    case 'selfBuff': case 'multiStrike': // upward arrows
      for (const dx of [-s * 0.45, s * 0.45]) { ctx.beginPath(); ctx.moveTo(dx, s * 0.8); ctx.lineTo(dx, -s * 0.6); ctx.moveTo(dx - s * 0.35, -s * 0.2); ctx.lineTo(dx, -s * 0.7); ctx.lineTo(dx + s * 0.35, -s * 0.2); ctx.stroke(); }
      break;
    case 'healBurst': // cross
      ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.8); ctx.stroke(); break;
    case 'chain': // zigzag bolt
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 1.0); ctx.lineTo(s * 0.2, -s * 0.1); ctx.lineTo(-s * 0.25, s * 0.05); ctx.lineTo(s * 0.3, s * 1.0); ctx.stroke(); break;
    default: ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function skillIcon(a: AbilityDef, size = 96): string {
  const key = `${a.name}:${a.kind}:${a.color}:${size}`;
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  const col = a.color ?? '#ffffff';
  const bg = g.createRadialGradient(r * 0.75, r * 0.7, r * 0.1, r, r, r);
  bg.addColorStop(0, col); bg.addColorStop(0.55, shade(col, 0.45)); bg.addColorStop(1, '#0a0c12');
  g.fillStyle = bg; g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2); g.fill();
  g.translate(r, r);
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = size * 0.06;
  glyph(g, a.kind, r);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.shadowBlur = 0;
  const rim = g.createLinearGradient(0, 0, 0, size); rim.addColorStop(0, 'rgba(255,255,255,0.35)'); rim.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.strokeStyle = rim; g.lineWidth = size * 0.05; g.beginPath(); g.arc(r, r, r - size * 0.03, 0, Math.PI * 2); g.stroke();
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** Resolve the icon for a hero's skill slot (p/1/2/3): official pack image when present, painted glyph otherwise. */
export async function skillIconFor(heroId: string, slot: 'p' | 1 | 2 | 3, a: AbilityDef | undefined): Promise<string> {
  const path = `icons/skills/${heroId}_${slot}.png`;
  if (await packHas(path)) return packUrl(path);
  return a ? skillIcon(a) : '';
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

const itemCache = new Map<string, string>();
/** Painted 装备 icon: diamond plate in the item's colour with a category glyph (sword / staff / shield / wing / boot). */
export function itemIcon(it: ItemDef, size = 72): string {
  const key = `${it.id}:${size}`;
  const hit = itemCache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  const bg = g.createLinearGradient(0, 0, size, size); bg.addColorStop(0, it.color); bg.addColorStop(1, shade(it.color, 0.35));
  g.fillStyle = bg; g.beginPath(); g.roundRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88, size * 0.16); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.roundRect(size * 0.14, size * 0.14, size * 0.72, size * 0.72, size * 0.12); g.fill();
  g.translate(r, r);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.fillStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = size * 0.07; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = size * 0.05;
  const s2 = r * 0.5;
  switch (it.category) {
    case 'attack': // sword
      g.beginPath(); g.moveTo(-s2 * 0.9, s2 * 0.9); g.lineTo(s2 * 0.8, -s2 * 0.8); g.moveTo(-s2 * 0.25, s2 * 0.25); g.lineTo(-s2 * 0.75, -s2 * 0.25); g.moveTo(-s2 * 0.25, s2 * 0.25); g.lineTo(s2 * 0.25, s2 * 0.75); g.stroke(); break;
    case 'magic': // orb on a staff
      g.beginPath(); g.moveTo(-s2 * 0.7, s2 * 1.0); g.lineTo(s2 * 0.3, -s2 * 0.3); g.stroke(); g.beginPath(); g.arc(s2 * 0.5, -s2 * 0.55, s2 * 0.42, 0, Math.PI * 2); g.fill(); break;
    case 'defense': // shield
      g.beginPath(); g.moveTo(0, -s2 * 1.0); g.lineTo(s2 * 0.9, -s2 * 0.6); g.lineTo(s2 * 0.75, s2 * 0.4); g.lineTo(0, s2 * 1.05); g.lineTo(-s2 * 0.75, s2 * 0.4); g.lineTo(-s2 * 0.9, -s2 * 0.6); g.closePath(); g.fill(); break;
    case 'support': // wings
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, s2 * 0.6); g.quadraticCurveTo(sd * s2 * 0.9, s2 * 0.2, sd * s2 * 1.0, -s2 * 0.9); g.quadraticCurveTo(sd * s2 * 0.4, -s2 * 0.3, 0, -s2 * 0.1); g.closePath(); g.fill(); }
      break;
    case 'boots': // boot
      g.beginPath(); g.moveTo(-s2 * 0.4, -s2 * 1.0); g.lineTo(s2 * 0.3, -s2 * 1.0); g.lineTo(s2 * 0.3, s2 * 0.2); g.lineTo(s2 * 1.0, s2 * 0.7); g.lineTo(s2 * 1.0, s2 * 1.0); g.lineTo(-s2 * 0.4, s2 * 1.0); g.closePath(); g.fill(); break;
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = size * 0.035; g.beginPath(); g.roundRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88, size * 0.16); g.stroke();
  const url = c.toDataURL('image/png');
  itemCache.set(key, url);
  return url;
}
