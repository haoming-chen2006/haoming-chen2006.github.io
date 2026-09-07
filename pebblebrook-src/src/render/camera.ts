import type { Camera } from '../core/app.ts';
import type { Vec, World } from '../core/types.ts';
import { clamp, TILE } from './common.ts';

/** Smooth-following camera in tile units, clamped so the map edge never shows (when the map is bigger than the view). */
export class CameraCtl implements Camera {
  x = 0;
  y = 0;
  zoom = 3;
  /** snap on the next update (teleports, new game) */
  snap = true;
  private vx = 0;
  private vy = 0;

  update(dt: number, target: Vec | null, world: World, viewTilesW: number, viewTilesH: number): void {
    if (target) {
      // target the centre of the tile the entity stands on, a little ahead of the feet
      const tx = target.x + 0.5, ty = target.y + 0.2;
      if (this.snap) { this.x = tx; this.y = ty; this.snap = false; this.vx = this.vy = 0; }
      else {
        // critically damped spring: smooth without lag on long walks
        const k = 1 - Math.exp(-dt * 7);
        this.vx = (tx - this.x) * k;
        this.vy = (ty - this.y) * k;
        this.x += this.vx;
        this.y += this.vy;
        if (Math.abs(tx - this.x) < 0.002) this.x = tx;
        if (Math.abs(ty - this.y) < 0.002) this.y = ty;
      }
    }
    const halfW = viewTilesW / 2, halfH = viewTilesH / 2;
    if (world.width > viewTilesW) this.x = clamp(this.x, halfW, world.width - halfW);
    else this.x = world.width / 2;
    if (world.height > viewTilesH) this.y = clamp(this.y, halfH, world.height - halfH);
    else this.y = world.height / 2;
  }

  /** move the free camera by a tile delta (free mode) */
  pan(dx: number, dy: number): void { this.x += dx; this.y += dy; }

  /** device-px origin of tile (0,0) for a canvas of W×H device px at `scale` device px per source px */
  origin(W: number, H: number, scale: number): [number, number] {
    const ox = Math.round(W / 2 - this.x * TILE * scale);
    const oy = Math.round(H / 2 - this.y * TILE * scale);
    return [ox, oy];
  }
}
