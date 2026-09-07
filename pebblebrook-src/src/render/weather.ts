import type { WeatherKind } from '../core/types.ts';
import { ctx2d, makeCanvas } from '../art/pixel.ts';
import type { View } from './common.ts';

/** Screen-space weather: rain streaks + splashes, snow, fog sheets, storm flashes. Units are source pixels. */

interface Drop { x: number; y: number; vy: number; len: number; life: number }
interface Splash { x: number; y: number; t: number }
interface Flake { x: number; y: number; vy: number; phase: number; size: number }

export class WeatherFx {
  quality: 'high' | 'low' = 'high';
  private drops: Drop[] = [];
  private splashes: Splash[] = [];
  private flakes: Flake[] = [];
  private fogCanvas = makeCanvas(1, 1);
  private fogT = 0;
  flash = 0;
  private nextFlash = 5;
  private thunderIn = -1;
  onThunder: (() => void) | null = null;
  private rng = 1234567;

  private rand(): number { this.rng = (this.rng * 1664525 + 1013904223) >>> 0; return this.rng / 4294967296; }

  update(dt: number, kind: WeatherKind, intensity: number, view: View): void {
    const w = view.W / view.scale, h = view.H / view.scale;
    const raining = (kind === 'rain' || kind === 'storm') && this.quality === 'high';
    const snowing = kind === 'snow' && this.quality === 'high';
    const targetDrops = raining ? Math.round((w * h) / (kind === 'storm' ? 900 : 1500) * (0.5 + intensity)) : 0;
    while (this.drops.length < targetDrops) this.drops.push({ x: this.rand() * (w + 40) - 20, y: this.rand() * h, vy: 240 + this.rand() * 120, len: 5 + this.rand() * 5, life: 1 });
    if (this.drops.length > targetDrops) this.drops.length = targetDrops;
    const wind = kind === 'storm' ? 80 : 25;
    for (const d of this.drops) {
      d.y += d.vy * dt; d.x += wind * dt;
      if (d.y > h) { d.y = -10 - this.rand() * 20; d.x = this.rand() * (w + 40) - 20; if (this.rand() < 0.35) this.splashes.push({ x: this.rand() * w, y: this.rand() * h, t: 0 }); }
      if (d.x > w + 20) d.x -= w + 40;
    }
    for (const s of this.splashes) s.t += dt * 6;
    this.splashes = this.splashes.filter((s) => s.t < 1);
    if (this.splashes.length > 120) this.splashes.splice(0, this.splashes.length - 120);
    const targetFlakes = snowing ? Math.round((w * h) / 1200 * (0.4 + intensity)) : 0;
    while (this.flakes.length < targetFlakes) this.flakes.push({ x: this.rand() * w, y: this.rand() * h, vy: 14 + this.rand() * 16, phase: this.rand() * 6.28, size: this.rand() < 0.3 ? 2 : 1 });
    if (this.flakes.length > targetFlakes) this.flakes.length = targetFlakes;
    for (const f of this.flakes) {
      f.y += f.vy * dt; f.phase += dt * 1.4; f.x += Math.sin(f.phase) * 12 * dt + 4 * dt;
      if (f.y > h) { f.y = -4; f.x = this.rand() * w; }
      if (f.x > w) f.x -= w; if (f.x < 0) f.x += w;
    }
    this.fogT += dt;
    // storm flashes
    if (kind === 'storm') {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flash = 1; this.nextFlash = 5 + this.rand() * 9; this.thunderIn = 0.4 + this.rand() * 1.2; }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
    if (this.thunderIn >= 0) { this.thunderIn -= dt; if (this.thunderIn < 0) { this.thunderIn = -1; this.onThunder?.(); } }
  }

  draw(g: CanvasRenderingContext2D, view: View, kind: WeatherKind, intensity: number): void {
    const s = view.scale;
    if (this.drops.length) {
      g.strokeStyle = kind === 'storm' ? 'rgba(200,220,255,0.55)' : 'rgba(190,215,245,0.5)';
      g.lineWidth = Math.max(1, s * 0.6);
      g.beginPath();
      const slope = kind === 'storm' ? 0.3 : 0.1;
      for (const d of this.drops) { g.moveTo(d.x * s, d.y * s); g.lineTo((d.x + d.len * slope) * s, (d.y + d.len) * s); }
      g.stroke();
      g.strokeStyle = 'rgba(220,235,255,0.5)';
      g.lineWidth = Math.max(1, s * 0.5);
      for (const sp of this.splashes) {
        const r = (1 + sp.t * 4) * s;
        g.globalAlpha = 1 - sp.t;
        g.beginPath(); g.ellipse(sp.x * s, sp.y * s, r, r * 0.45, 0, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = 1;
    }
    if (this.flakes.length) {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (const f of this.flakes) g.fillRect(Math.round(f.x) * s, Math.round(f.y) * s, f.size * s, f.size * s);
    }
    if (kind === 'fog') this.drawFog(g, view, intensity);
    if (this.flash > 0.01) { g.fillStyle = `rgba(255,255,255,${(this.flash * 0.55).toFixed(3)})`; g.fillRect(0, 0, view.W, view.H); }
  }

  private drawFog(g: CanvasRenderingContext2D, view: View, intensity: number): void {
    const lw = Math.ceil(view.W / view.scale / 2), lh = Math.ceil(view.H / view.scale / 2);
    if (this.fogCanvas.width !== lw || this.fogCanvas.height !== lh) { this.fogCanvas.width = lw; this.fogCanvas.height = lh; }
    const fg = ctx2d(this.fogCanvas);
    fg.clearRect(0, 0, lw, lh);
    const t = this.fogT;
    const blobs = 7;
    for (let i = 0; i < blobs; i++) {
      const cx = ((i * 137 + t * (6 + i * 1.5)) % (lw + 120)) - 60;
      const cy = ((i * 89 + Math.sin(t * 0.3 + i) * 20 + lh * 0.5) % (lh + 80)) - 40 + (i % 3) * lh * 0.3;
      const r = lw * (0.25 + (i % 3) * 0.1);
      const grad = fg.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(226,232,238,${(0.22 + intensity * 0.18).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(226,232,238,0)');
      fg.fillStyle = grad;
      fg.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    g.imageSmoothingEnabled = true;
    g.drawImage(this.fogCanvas, 0, 0, lw, lh, 0, 0, view.W, view.H);
    g.imageSmoothingEnabled = false;
  }
}
