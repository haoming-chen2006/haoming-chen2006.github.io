import { ARENA_H, ARENA_W, LANE_PATHS, OBJECTIVES } from '../game/constants.ts';
import { dist } from '../engine/math.ts';
import { BUSHES, WALLS } from '../game/map.ts';
import { NEUTRAL, type Side, type Unit, type UnitDef } from '../game/types.ts';
import type { World } from '../game/world.ts';
import { CANVAS_FONT, cardName, t, tSim } from '../i18n.ts';
import type { CameraRig, ViewMode } from './camera3d.ts';
import { getViewTeam, isMine, teamCss } from './perspective.ts';
import type { Entities3D } from './entities3d.ts';

export interface OverlayState {
  mode: ViewMode;
  heroId: number;
  hover: Unit | null;
  selectedCard: UnitDef | null;
  reticle: { pos: { x: number; y: number }; ok: boolean; radius: number } | null;
  hitMarkerT: number;
  paused: boolean;
  locked: boolean;
  /** Big map toggle (M). */
  bigMap?: boolean;
  /** World point under the crosshair (for skill range rings). */
  aim?: { x: number; y: number } | null;
  aimRange?: number;
}

/** Crisp 2D layer drawn over the WebGL canvas: bars, numbers, crosshair, minimap. */
export class Overlay {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private canvas: HTMLCanvasElement;
  private mapCache: HTMLCanvasElement | null = null;
  private mapCacheSize = 0;
  /** Set by the HUD when the pointer hovers the minimap (click-to-ping later). */
  minimapRect = { x: 0, y: 0, w: 0, h: 0 };

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
    const me = getViewTeam();
    const myHero = st.heroId >= 0 ? world.getUnit(st.heroId) : undefined;
    // bars
    for (const e of world.alive()) {
      if (e.kind === 'unit' && e.id === st.heroId && fp) continue;
      if (e.kind === 'unit' && !world.canSee(me, e, myHero?.pos)) continue;
      if (e.kind === 'tower' && !e.active && e.hp >= e.maxHp && isMine(e.team)) continue;
      const isHero = e.kind === 'unit' && e.isHero;
      const showBar = e.kind !== 'unit' || isHero || e.hp < e.maxHp || e.shield > 0 || st.hover === e;
      if (!showBar) continue;
      const top = ents.headHeight(e);
      const p = rig.project(e.pos.x, top, e.pos.y, this.w, this.h);
      if (!p.visible) continue;
      if (!p.visible || p.depth > 0.9995 && !isHero && e.kind !== 'tower') continue;
      if (myHero) { const far = dist(myHero.pos, e.pos); if (far > (e.kind === 'tower' ? 26 : isHero ? 30 : 18)) continue; }
      const scale = Math.max(0.5, Math.min(1.4, 1.6 - p.depth * 0.7));
      const barW = (e.kind === 'tower' ? 76 : isHero ? 64 : 30 + e.radius * 20) * scale;
      const nearMe = myHero ? dist(myHero.pos, e.pos) < 13 : true;
      const hpText = (e.kind === 'tower' && nearMe) || isHero ? Math.round(e.hp) : null;
      this.bar(p.x, p.y, barW, (isHero ? 7 : 5.5) * scale, e.hp / e.maxHp, e.team, e.shield / e.maxHp, hpText, e.id === st.heroId, isHero ? e.mana / Math.max(1, e.maxMana) : -1);
      if (isHero) {
        const seat = world.seatOf(e);
        ctx.font = `800 ${Math.round(12 * scale)}px ${CANVAS_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        const name = `${seat?.name ?? cardName(e.def)}`;
        ctx.strokeText(name, p.x, p.y - 4 * scale); ctx.fillStyle = e.id === st.heroId ? '#ffe27a' : teamCss(e.team); ctx.fillText(name, p.x, p.y - 4 * scale);
        // level badge
        const bx = p.x - barW / 2 - 9 * scale, by = p.y + 3 * scale;
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(bx, by, 8 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = teamCss(e.team); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(10 * scale)}px ${CANVAS_FONT}`; ctx.textBaseline = 'middle'; ctx.fillText(String(e.level), bx, by + 0.5);
      }
      if (e.kind === 'tower' && e.aggroT > 0 && e.aggroId === st.heroId) {
        ctx.font = `800 11px ${CANVAS_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#ff6b6b';
        ctx.fillText(t('overlay.towerAggro'), p.x, p.y - 4);
      }
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
      ctx.font = `800 ${px}px ${CANVAS_FONT}`;
      ctx.lineWidth = Math.max(2, px * 0.18); ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineJoin = 'round';
      const y = p.y - prog * 42;
      const label = tSim(e.text);
      ctx.strokeText(label, p.x, y); ctx.fillStyle = e.color; ctx.fillText(label, p.x, y);
    }
    ctx.globalAlpha = 1;
    // skill range ring under the crosshair point
    if (st.aim && st.aimRange && myHero) {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 2; const p = rig.project(myHero.pos.x + Math.cos(a) * st.aimRange, 0.05, myHero.pos.y + Math.sin(a) * st.aimRange, this.w, this.h); pts.push(p); }
      ctx.strokeStyle = 'rgba(255,226,122,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -time * 20;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]);
    }
    // crosshair (tinted when an enemy sits under it)
    if (st.mode !== 'commander') {
      let onTarget = false;
      const cx = this.w / 2, cy = this.h / 2;
      for (const e of world.alive()) {
        if (isMine(e.team) || (e.kind === 'tower' && !e.active)) continue;
        if (e.kind === 'unit' && !world.canSee(me, e, myHero?.pos)) continue;
        const p = rig.project(e.pos.x, ents.headHeight(e) * 0.5, e.pos.y, this.w, this.h);
        if (!p.visible) continue;
        const size = Math.max(10, (e.radius * 60) / Math.max(0.05, p.depth + 1.001 - 1));
        const tol = Math.min(80, Math.max(14, size * 0.25));
        if (Math.abs(p.x - cx) < tol && Math.abs(p.y - cy) < tol * 2.2) { onTarget = true; break; }
      }
      this.crosshair(st, time, onTarget);
    }
    this.minimap(world, rig, st, !!st.bigMap);
  }

  private bar(x: number, y: number, w: number, h: number, frac: number, team: Side, shield: number, text: number | null, hero: boolean, mana: number): void {
    // 王者荣耀-style bars: rounded dark frame, health segmented every 1000 (heroes) / 25% (others), slim mana strip, gold shield overlay
    const ctx = this.ctx;
    const mh = mana >= 0 ? h * 0.42 : 0;
    const x0 = x - w / 2, r = Math.min(3, h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath(); ctx.roundRect(x0 - 2, y - 2, w + 4, h + mh + 4, r + 1.5); ctx.fill();
    ctx.fillStyle = '#1b2029'; ctx.beginPath(); ctx.roundRect(x0, y, w, h, r); ctx.fill();
    const f = Math.max(0, Math.min(1, frac));
    const col = hero ? (team === 0 ? ['#58d36a', '#2f9a44'] : ['#ff6b6b', '#c23b3b']) : team === NEUTRAL ? ['#e0c070', '#a3843a'] : team === 0 ? ['#6fb4ff', '#2f7fd6'] : ['#ff8a7a', '#d63b3b'];
    const grad = ctx.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, col[0]); grad.addColorStop(1, col[1]);
    ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(x0, y, w * f, h, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x0, y, w * f, Math.max(1, h * 0.3));
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    if (hero && text !== null) { const max = text / Math.max(0.001, f); for (let v = 1000; v < max; v += 1000) ctx.fillRect(x0 + (w * v) / max, y, 1, h); }
    else for (let i = 1; i < 4; i++) ctx.fillRect(x0 + (w * i) / 4, y, 1, h);
    if (mana >= 0) { ctx.fillStyle = '#152238'; ctx.fillRect(x0, y + h + 1, w, mh - 1); ctx.fillStyle = '#5fb0ff'; ctx.fillRect(x0, y + h + 1, w * Math.max(0, Math.min(1, mana)), mh - 1); }
    if (shield > 0) { ctx.fillStyle = 'rgba(255,230,150,0.95)'; ctx.beginPath(); ctx.roundRect(x0, y - 3.5, w * Math.min(1, shield), 2.5, 1); ctx.fill(); }
    if (text !== null) {
      ctx.font = `800 ${Math.max(8, h * 1.3)}px ${CANVAS_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(String(text), x, y + h / 2); ctx.fillStyle = '#fff'; ctx.fillText(String(text), x, y + h / 2);
    }
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
      ctx.font = `600 12px ${CANVAS_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 4) * 0.2})`;
      ctx.fillText(t('overlay.captureMouse'), cx, cy + 26);
    }
  }

  /** Static map background (terrain, lanes, river, walls, bushes) cached at the current size. */
  private mapBackground(size: number): HTMLCanvasElement {
    if (this.mapCache && this.mapCacheSize === size) return this.mapCache;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * this.dpr);
    const g = c.getContext('2d')!;
    g.scale((size * this.dpr) / ARENA_W, (size * this.dpr) / ARENA_H);
    g.fillStyle = '#3f7a35'; g.fillRect(0, 0, ARENA_W, ARENA_H);
    // river
    g.strokeStyle = '#3f8fcf'; g.lineWidth = 3.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(7, 7); g.lineTo(ARENA_W - 7, ARENA_H - 7); g.stroke();
    // lanes
    g.strokeStyle = '#b8a070'; g.lineWidth = 2.6; g.lineJoin = 'round';
    for (const path of LANE_PATHS) { g.beginPath(); path.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); }
    // walls
    g.fillStyle = '#6a6f62';
    for (const b of WALLS) g.fillRect(b.x, b.y, b.w, b.h);
    // bushes
    g.fillStyle = '#2f6b2a';
    for (const b of BUSHES) { g.beginPath(); g.arc(b.pos.x, b.pos.y, b.r, 0, Math.PI * 2); g.fill(); }
    // objective pits
    g.strokeStyle = '#4a4440'; g.lineWidth = 0.8;
    for (const o of OBJECTIVES) { g.beginPath(); g.arc(o.pos.x, o.pos.y, 3, 0, Math.PI * 2); g.stroke(); }
    this.mapCache = c; this.mapCacheSize = size;
    return c;
  }

  private minimap(world: World, rig: CameraRig, st: OverlayState, big: boolean): void {
    const ctx = this.ctx;
    const size = big ? Math.min(this.w, this.h) * 0.7 : Math.min(190, this.w * 0.16);
    // 王者荣耀 keeps the 小地图 top-left
    const x0 = big ? (this.w - size) / 2 : 14, y0 = big ? (this.h - size) / 2 : 14;
    this.minimapRect = { x: x0, y: y0, w: size, h: size };
    const s = size / ARENA_W;
    const me = getViewTeam();
    const flip = me === 1;
    const px = (x: number) => x0 + (flip ? ARENA_W - x : x) * s, py = (y: number) => y0 + (flip ? ARENA_H - y : y) * s;
    const myHero = st.heroId >= 0 ? world.getUnit(st.heroId) : undefined;
    ctx.save();
    ctx.globalAlpha = big ? 0.96 : 0.9;
    ctx.fillStyle = 'rgba(10,14,20,0.75)'; ctx.beginPath(); ctx.roundRect(x0 - 5, y0 - 5, size + 10, size + 10, 8); ctx.fill();
    const bg = this.mapBackground(size);
    ctx.save();
    if (flip) { ctx.translate(x0 + size, y0 + size); ctx.scale(-1, -1); ctx.drawImage(bg, 0, 0, size, size); }
    else ctx.drawImage(bg, x0, y0, size, size);
    ctx.restore();
    // towers
    for (const e of world.alive()) {
      if (e.kind !== 'tower') continue;
      const r = (e.tier === 'crystal' ? 5 : 3.4) * (big ? 1.8 : 1);
      ctx.fillStyle = teamCss(e.team);
      ctx.beginPath(); ctx.moveTo(px(e.pos.x), py(e.pos.y) - r); ctx.lineTo(px(e.pos.x) + r, py(e.pos.y) + r * 0.8); ctx.lineTo(px(e.pos.x) - r, py(e.pos.y) + r * 0.8); ctx.closePath(); ctx.fill();
      if (!e.active) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // units: minions as dots, monsters as diamonds, heroes as rings with the level
    for (const e of world.alive()) {
      if (e.kind !== 'unit') continue;
      if (!world.canSee(me, e, myHero?.pos) && !isMine(e.team)) continue;
      const mine = e.id === st.heroId;
      ctx.fillStyle = mine ? '#ffe27a' : teamCss(e.team);
      const x = px(e.pos.x), y = py(e.pos.y);
      if (e.isHero) {
        const r = (big ? 9 : 5.5);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        if (big) { ctx.fillStyle = '#111'; ctx.font = `800 9px ${CANVAS_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(e.level), x, y + 0.5); }
      } else if (e.def.kind === 'monster') {
        const r = big ? 4 : 2.6;
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
      } else { ctx.beginPath(); ctx.arc(x, y, big ? 2.4 : 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    // view cone
    const hero = myHero;
    if (hero) {
      const f = rig.forward();
      const hx = px(hero.pos.x), hy = py(hero.pos.y);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.moveTo(hx, hy);
      const a = Math.atan2(f.y, f.x) + (flip ? Math.PI : 0);
      ctx.arc(hx, hy, big ? 40 : 20, a - 0.55, a + 0.55); ctx.closePath(); ctx.fill();
    }
    // pings
    for (const e of world.effects) {
      if (e.type !== 'ring' || e.radius < 5) continue; // map pings are big rings
      const p = e.t / e.dur;
      ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px(e.pos.x), py(e.pos.y), 4 + p * 12, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
