import { clamp, damp, lerp, type Vec } from './math.ts';

/** World units are arena tiles. The camera maps tiles to canvas pixels. */
export class Camera {
  center: Vec;
  zoom: number; // pixels per tile
  private targetCenter: Vec;
  private targetZoom: number;
  shake = 0;
  private shakeOff: Vec = { x: 0, y: 0 };
  viewW = 800;
  viewH = 600;
  /** Screen pixels reserved at the top (HUD bar) when framing the whole arena. */
  topMargin = 40;

  private worldW: number;
  private worldH: number;

  constructor(worldW: number, worldH: number) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.center = { x: worldW / 2, y: worldH / 2 };
    this.targetCenter = { ...this.center };
    this.zoom = 20; this.targetZoom = 20;
  }

  /** Zoom at which the whole arena fits the viewport with some padding. */
  fitZoom(): number {
    return Math.max(4, Math.min((this.viewW - 24) / this.worldW, (this.viewH - 24 - this.topMargin) / this.worldH));
  }

  setView(w: number, h: number): void { this.viewW = w; this.viewH = h; }

  /** Overview: whole arena, centered. */
  lookOverview(): void {
    const z = this.fitZoom();
    this.targetZoom = z;
    this.targetCenter = { x: this.worldW / 2, y: this.worldH / 2 - this.topMargin / 2 / z };
  }

  /** Follow a hero with a zoom multiplier; keeps the view inside the arena where possible. */
  lookFollow(p: Vec, mult: number): void {
    const z = this.fitZoom() * mult;
    this.targetZoom = z;
    const halfW = this.viewW / z / 2, halfH = this.viewH / z / 2;
    const cx = halfW * 2 >= this.worldW ? this.worldW / 2 : clamp(p.x, halfW, this.worldW - halfW);
    const cy = halfH * 2 >= this.worldH ? this.worldH / 2 : clamp(p.y, halfH, this.worldH - halfH);
    this.targetCenter = { x: cx, y: cy };
  }

  snap(): void { this.center = { ...this.targetCenter }; this.zoom = this.targetZoom; }

  update(dt: number, rng: () => number): void {
    const k = damp(6, dt);
    this.center.x = lerp(this.center.x, this.targetCenter.x, k);
    this.center.y = lerp(this.center.y, this.targetCenter.y, k);
    this.zoom = lerp(this.zoom, this.targetZoom, damp(5, dt));
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 18);
      this.shakeOff = { x: (rng() - 0.5) * this.shake, y: (rng() - 0.5) * this.shake };
    } else this.shakeOff = { x: 0, y: 0 };
  }

  addShake(px: number): void { this.shake = Math.min(28, this.shake + px); }

  toScreen(p: Vec): Vec {
    return {
      x: (p.x - this.center.x) * this.zoom + this.viewW / 2 + this.shakeOff.x,
      y: (p.y - this.center.y) * this.zoom + this.viewH / 2 + this.shakeOff.y,
    };
  }
  toWorld(s: Vec): Vec {
    return {
      x: (s.x - this.viewW / 2 - this.shakeOff.x) / this.zoom + this.center.x,
      y: (s.y - this.viewH / 2 - this.shakeOff.y) / this.zoom + this.center.y,
    };
  }
  /** Apply the world transform to a 2D context. */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, this.viewW / 2 - this.center.x * this.zoom + this.shakeOff.x, this.viewH / 2 - this.center.y * this.zoom + this.shakeOff.y);
  }
}
