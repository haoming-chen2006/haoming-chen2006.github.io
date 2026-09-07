import type { Season, WeatherKind } from '../core/types.ts';
import { TILE, type View } from './common.ts';

/**
 * World-space ambient particles: chimney smoke, falling autumn leaves, summer fireflies, birds.
 * Positions are in tiles; drawing converts through the view.
 */

interface Puff { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }
interface Leaf { x: number; y: number; vx: number; vy: number; phase: number; life: number; colour: string }
interface Firefly { x: number; y: number; phase: number; speed: number; ax: number; ay: number }
interface Bird { x: number; y: number; vx: number; phase: number; members: { dx: number; dy: number }[] }

export interface AmbientCtx {
  season: Season;
  weather: WeatherKind;
  hour: number;
  night: number;
  /** chimneys currently smoking, in tiles (the top of the chimney) */
  chimneys: { x: number; y: number }[];
  /** tree tiles in view, for leaves */
  trees: { x: number; y: number }[];
  /** grass tiles in view for fireflies (sampled) */
  grass: { x: number; y: number }[];
  daylight: boolean;
}

export class AmbientFx {
  quality: 'high' | 'low' = 'high';
  private puffs: Puff[] = [];
  private leaves: Leaf[] = [];
  private flies: Firefly[] = [];
  private birds: Bird[] = [];
  /** seconds until the next flock (public so a debug harness can force one) */
  nextBird = 12;
  private smokeAcc = 0;
  private leafAcc = 0;
  private rng = 987654;
  private rand(): number { this.rng = (this.rng * 1664525 + 1013904223) >>> 0; return this.rng / 4294967296; }

  update(dt: number, ctx: AmbientCtx, view: View): void {
    if (this.quality === 'low') { this.puffs.length = 0; this.leaves.length = 0; this.flies.length = 0; this.birds.length = 0; return; }
    const tx0 = (0 - view.ox) / (TILE * view.scale), ty0 = (0 - view.oy) / (TILE * view.scale);
    const tx1 = (view.W - view.ox) / (TILE * view.scale), ty1 = (view.H - view.oy) / (TILE * view.scale);
    // smoke
    this.smokeAcc += dt;
    if (this.smokeAcc > 0.35) {
      this.smokeAcc = 0;
      for (const c of ctx.chimneys) if (this.rand() < 0.8) this.puffs.push({ x: c.x + 0.5 + (this.rand() - 0.5) * 0.1, y: c.y, vx: 0.25 + this.rand() * 0.2, vy: -0.55 - this.rand() * 0.3, life: 0, max: 2.6 + this.rand() * 1.2, r: 1.2 + this.rand() });
    }
    for (const p of this.puffs) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 0.985; p.r += dt * 1.4; }
    this.puffs = this.puffs.filter((p) => p.life < p.max);
    // leaves
    if (ctx.season === 'autumn' && ctx.weather !== 'storm' && ctx.trees.length) {
      this.leafAcc += dt;
      if (this.leafAcc > 0.4 && this.leaves.length < 40) {
        this.leafAcc = 0;
        const t = ctx.trees[Math.floor(this.rand() * ctx.trees.length)];
        const cols = ['#e0842a', '#d8a838', '#c25a2a', '#e8c040'];
        this.leaves.push({ x: t.x + this.rand(), y: t.y - 0.8, vx: 0.3 + this.rand() * 0.4, vy: 0.5 + this.rand() * 0.4, phase: this.rand() * 6.28, life: 0, colour: cols[Math.floor(this.rand() * cols.length)] });
      }
    }
    for (const l of this.leaves) { l.life += dt; l.phase += dt * 3; l.x += (l.vx + Math.sin(l.phase) * 0.6) * dt; l.y += l.vy * dt; }
    this.leaves = this.leaves.filter((l) => l.life < 4.5);
    // fireflies
    const fireflyTime = ctx.season === 'summer' && ctx.night > 0.6 && (ctx.hour >= 19.5 || ctx.hour < 3) && (ctx.weather === 'sunny' || ctx.weather === 'cloudy');
    const wantFlies = fireflyTime ? Math.min(60, Math.floor(ctx.grass.length / 3)) : 0;
    while (this.flies.length < wantFlies && ctx.grass.length) { const gt = ctx.grass[Math.floor(this.rand() * ctx.grass.length)]; this.flies.push({ x: gt.x + this.rand(), y: gt.y + this.rand(), phase: this.rand() * 6.28, speed: 0.6 + this.rand() * 0.8, ax: this.rand() * 6.28, ay: this.rand() * 6.28 }); }
    if (this.flies.length > wantFlies) this.flies.length = wantFlies;
    for (const f of this.flies) {
      f.phase += dt * f.speed; f.ax += dt * 0.7; f.ay += dt * 0.9;
      f.x += Math.cos(f.ax) * 0.25 * dt; f.y += Math.sin(f.ay) * 0.2 * dt;
      if (f.x < tx0 - 1 || f.x > tx1 + 1 || f.y < ty0 - 1 || f.y > ty1 + 1) { const gt = ctx.grass[Math.floor(this.rand() * ctx.grass.length)]; if (gt) { f.x = gt.x; f.y = gt.y; } }
    }
    // birds
    this.nextBird -= dt;
    if (this.nextBird <= 0) {
      this.nextBird = 18 + this.rand() * 30;
      if (ctx.daylight && ctx.season !== 'winter' && (ctx.weather === 'sunny' || ctx.weather === 'cloudy')) {
        const dir = this.rand() < 0.5 ? 1 : -1;
        const n = 3 + Math.floor(this.rand() * 3);
        const members: { dx: number; dy: number }[] = [];
        for (let i = 0; i < n; i++) members.push({ dx: -i * 0.7 * dir, dy: (i % 2 ? 1 : -1) * i * 0.35 });
        this.birds.push({ x: dir > 0 ? tx0 - 3 : tx1 + 3, y: ty0 + 1 + this.rand() * (ty1 - ty0) * 0.5, vx: dir * (2.6 + this.rand()), phase: 0, members });
      }
    }
    for (const b of this.birds) { b.x += b.vx * dt; b.phase += dt * 9; }
    this.birds = this.birds.filter((b) => b.x > tx0 - 6 && b.x < tx1 + 6);
  }

  /** draw everything that sits behind the lighting pass (smoke, leaves, birds) */
  drawScene(g: CanvasRenderingContext2D, view: View): void {
    const s = view.scale;
    for (const p of this.puffs) {
      const a = 0.35 * (1 - p.life / p.max);
      g.fillStyle = `rgba(200,200,210,${a.toFixed(3)})`;
      const r = p.r * s, cx = view.ox + p.x * TILE * s, cy = view.oy + p.y * TILE * s;
      g.fillRect(Math.round(cx - r), Math.round(cy - r), Math.round(r * 2), Math.round(r * 2));
    }
    for (const l of this.leaves) {
      g.fillStyle = l.colour;
      const cx = view.ox + l.x * TILE * s, cy = view.oy + l.y * TILE * s;
      const w = Math.sin(l.phase) > 0 ? 2 : 1;
      g.fillRect(Math.round(cx), Math.round(cy), w * s, s);
    }
    for (const b of this.birds) {
      g.fillStyle = '#2f2a2a';
      for (const m of b.members) {
        const cx = view.ox + (b.x + m.dx) * TILE * s, cy = view.oy + (b.y + m.dy) * TILE * s;
        const up = Math.sin(b.phase + m.dx) > 0;
        g.fillRect(Math.round(cx) - s, Math.round(cy) + (up ? -s : 0), s, s);
        g.fillRect(Math.round(cx), Math.round(cy), s, s);
        g.fillRect(Math.round(cx) + s, Math.round(cy) + (up ? -s : 0), s, s);
      }
    }
  }

  /** fireflies as tiny additive lights */
  drawLights(g: CanvasRenderingContext2D, view: View): void {
    if (!this.flies.length) return;
    const s = view.scale;
    g.globalCompositeOperation = 'lighter';
    for (const f of this.flies) {
      const a = Math.max(0, Math.sin(f.phase)) ** 2;
      if (a < 0.05) continue;
      const cx = view.ox + f.x * TILE * s, cy = view.oy + f.y * TILE * s;
      g.fillStyle = `rgba(216,255,112,${(a * 0.9).toFixed(3)})`;
      g.fillRect(Math.round(cx), Math.round(cy), s, s);
      g.fillStyle = `rgba(216,255,112,${(a * 0.25).toFixed(3)})`;
      g.fillRect(Math.round(cx) - s, Math.round(cy) - s, s * 3, s * 3);
    }
    g.globalCompositeOperation = 'source-over';
  }
}
