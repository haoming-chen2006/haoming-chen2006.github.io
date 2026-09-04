import { ARENA_H, ARENA_W } from '../game/constants.ts';
import type { CardDef, Entity, Team, Unit } from '../game/types.ts';
import type { World } from '../game/world.ts';
import type { CameraRig, ViewMode } from './camera3d.ts';
import type { Entities3D } from './entities3d.ts';

export interface OverlayState {
  mode: ViewMode;
  heroId: number;
  hover: Unit | null;
  selectedCard: CardDef | null;
  reticle: { pos: { x: number; y: number }; ok: boolean; radius: number } | null;
  hitMarkerT: number; // seconds since last hero hit landed
  paused: boolean;
  locked: boolean;
}

const TEAM_COLOR: Record<Team, string> = { 0: '#4da3ff', 1: '#ff5a5a' };

/** Crisp 2D layer drawn over the WebGL canvas: bars, numbers, crosshair, minimap. */
export class Overlay {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('overlay 2d context');
    this.ctx = ctx;
  }

  resize(w: number, h: number, dpr: number): void {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr); this.canvas.height = Math.floor(h * dpr);
  }

  clear(): void { this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.ctx.clearRect(0, 0, this.w, this.h); }

  draw(world: World, rig: CameraRig, ents: Entities3D, st: OverlayState, time: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const fp = st.mode === 'first';
    // health bars
    for (const e of world.alive()) {
      if (e.kind === 'unit' && e.id === st.heroId && fp) continue;
      const showBar = e.kind !== 'unit' || e.hp < e.maxHp || e.id === st.heroId || e.shield > 0 || st.hover === e || (!fp && st.mode !== 'commander' && e.team !== 0) || (fp && e.team !== 0);
      if (!showBar) continue;
      const top = ents.headHeight(e);
      const p = rig.project(e.pos.x, top, e.pos.y, this.w, this.h);
      if (!p.visible) continue;
      const scale = Math.max(0.55, Math.min(1.4, 1.6 - p.depth * 0.7));
      const barW = (e.kind === 'tower' ? 72 : e.kind === 'building' ? 46 : 34 + e.radius * 20) * scale;
      this.bar(p.x, p.y, barW, 6 * scale, e.hp / e.maxHp, e.team, e.shield / e.maxHp, e.kind === 'tower' ? Math.round(e.hp) : null, e.id === st.heroId);
    }
    // floating text
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const e of world.effects) {
      if (e.type !== 'text' || !e.text) continue;
      const prog = Math.min(1, e.t / e.dur);
      const p = rig.project(e.pos.x, 1.3, e.pos.y, this.w, this.h);
      if (!p.visible) continue;
      const px = Math.max(11, (e.size ?? 0.5) * 30 * Math.max(0.6, 1.5 - p.depth * 0.6));
      ctx.globalAlpha = prog < 0.6 ? 1 : (1 - prog) / 0.4;
      ctx.font = `800 ${px}px "Segoe UI", system-ui, sans-serif`;
      ctx.lineWidth = Math.max(2, px * 0.18); ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineJoin = 'round';
      const y = p.y - prog * 42;
      ctx.strokeText(e.text, p.x, y); ctx.fillStyle = e.color; ctx.fillText(e.text, p.x, y);
    }
    ctx.globalAlpha = 1;
    // possess prompt
    if (st.hover && st.mode === 'commander' && !st.selectedCard) {
      const u = st.hover;
      const p = rig.project(u.pos.x, ents.headHeight(u) + 0.5, u.pos.y, this.w, this.h);
      if (p.visible) this.label(p.x, p.y - 12, `Possess ${u.def.name}`, 'F', '#ffe27a');
    }
    // reticle for card placement
    if (st.reticle) {
      const r = st.reticle;
      const col = r.ok ? 'rgba(120,255,160,0.95)' : 'rgba(255,90,90,0.95)';
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; const p = rig.project(r.pos.x + Math.cos(a) * r.radius, 0.05, r.pos.y + Math.sin(a) * r.radius, this.w, this.h); pts.push(p); }
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -time * 30;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]);
      const c = rig.project(r.pos.x, 0.05, r.pos.y, this.w, this.h);
      ctx.beginPath(); ctx.moveTo(c.x - 8, c.y); ctx.lineTo(c.x + 8, c.y); ctx.moveTo(c.x, c.y - 8); ctx.lineTo(c.x, c.y + 8); ctx.stroke();
      if (st.selectedCard) this.label(c.x, c.y - 26, st.selectedCard.name, String(st.selectedCard.cost), r.ok ? '#8dff9a' : '#ff8f8f');
    }
    // crosshair (tinted when an enemy sits under it)
    if (st.mode !== 'commander') {
      let onTarget = false;
      const cx = this.w / 2, cy = this.h / 2;
      for (const e of world.alive()) {
        if (e.team === 0) continue;
        const p = rig.project(e.pos.x, ents.headHeight(e) * 0.5, e.pos.y, this.w, this.h);
        if (!p.visible) continue;
        const size = Math.max(10, (e.radius * 60) / Math.max(0.05, p.depth + 1.001 - 1)) ;
        const tol = Math.min(80, Math.max(14, size * 0.25));
        if (Math.abs(p.x - cx) < tol && Math.abs(p.y - cy) < tol * 2.2) { onTarget = true; break; }
      }
      this.crosshair(st, time, onTarget);
    }
    if (st.mode !== 'commander') this.minimap(world, rig, st);
  }

  private bar(x: number, y: number, w: number, h: number, frac: number, team: Team, shield: number, text: number | null, hero: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = hero ? '#ffd86b' : TEAM_COLOR[team]; ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, frac)), h);
    if (shield > 0) { ctx.fillStyle = 'rgba(255,240,180,0.95)'; ctx.fillRect(x - w / 2, y - 3, w * Math.min(1, shield), 2.5); }
    if (text !== null) {
      ctx.font = `700 ${Math.max(9, h * 1.7)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(String(text), x, y - 2); ctx.fillStyle = '#fff'; ctx.fillText(String(text), x, y - 2);
    }
  }

  private label(x: number, y: number, text: string, key: string, color: string): void {
    const ctx = this.ctx;
    ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const w = tw + 34, h = 22;
    const x0 = x - w / 2;
    ctx.fillStyle = 'rgba(10,14,20,0.8)'; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 6); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x0 + 4, y - 8, 18, 16, 4); ctx.fill();
    ctx.fillStyle = '#1a1200'; ctx.textAlign = 'center'; ctx.fillText(key, x0 + 13, y + 1);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(text, x0 + 27, y + 1);
  }

  private crosshair(st: OverlayState, time: number, onTarget = false): void {
    const ctx = this.ctx;
    const cx = this.w / 2, cy = this.h / 2;
    ctx.strokeStyle = onTarget ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = onTarget ? 2.5 : 2; ctx.lineCap = 'round';
    const gap = 6, len = 9;
    ctx.beginPath();
    ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy);
    ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len);
    ctx.stroke();
    ctx.fillStyle = onTarget ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, onTarget ? 2.4 : 1.8, 0, Math.PI * 2); ctx.fill();
    if (st.hitMarkerT < 0.25) {
      const p = st.hitMarkerT / 0.25;
      ctx.strokeStyle = `rgba(255,230,120,${1 - p})`; ctx.lineWidth = 3;
      const r0 = 10 + p * 10, r1 = r0 + 8;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(cx + sx * r0, cy + sy * r0); ctx.lineTo(cx + sx * r1, cy + sy * r1); }
      ctx.stroke();
    }
    if (!st.locked && st.mode !== 'commander') {
      ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 4) * 0.2})`;
      ctx.fillText('Click to capture the mouse for free look', cx, cy + 26);
    }
  }

  private minimap(world: World, rig: CameraRig, st: OverlayState): void {
    const ctx = this.ctx;
    const mw = 100, mh = mw * (ARENA_H / ARENA_W);
    const x0 = 16, y0 = this.h - mh - 16;
    const sx = mw / ARENA_W, sy = mh / ARENA_H;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(10,14,20,0.7)'; ctx.beginPath(); ctx.roundRect(x0 - 5, y0 - 5, mw + 10, mh + 10, 6); ctx.fill();
    ctx.fillStyle = '#4f8a42'; ctx.fillRect(x0, y0, mw, mh);
    ctx.fillStyle = '#3f7fbf'; ctx.fillRect(x0, y0 + 15 * sy, mw, 2 * sy);
    ctx.fillStyle = '#b08a52'; ctx.fillRect(x0 + 2.5 * sx, y0 + 15 * sy, 2 * sx, 2 * sy); ctx.fillRect(x0 + 13.5 * sx, y0 + 15 * sy, 2 * sx, 2 * sy);
    for (const e of world.alive() as Iterable<Entity>) {
      ctx.fillStyle = e.kind === 'unit' && e.id === st.heroId ? '#ffe27a' : TEAM_COLOR[e.team];
      const r = e.kind === 'tower' ? (e.towerType === 'king' ? 5 : 4) : e.kind === 'building' ? 3 : 2;
      ctx.beginPath(); ctx.arc(x0 + e.pos.x * sx, y0 + e.pos.y * sy, r, 0, Math.PI * 2); ctx.fill();
    }
    // view cone
    const hero = world.hero(0);
    if (hero) {
      const f = rig.forward();
      const hx = x0 + hero.pos.x * sx, hy = y0 + hero.pos.y * sy;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.moveTo(hx, hy);
      const a = Math.atan2(f.y, f.x);
      ctx.arc(hx, hy, 22, a - 0.6, a + 0.6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
