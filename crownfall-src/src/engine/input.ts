import type { Vec } from './math.ts';

/**
 * Keyboard + pointer state for the game canvas. Keys are stored by `KeyboardEvent.code`
 * so WASD works regardless of layout-specific characters.
 */
export class Input {
  readonly down = new Set<string>();
  private pressed = new Set<string>();
  mouse: Vec = { x: 0, y: 0 };
  mouseDown = false;
  private mouseClicked = false;
  private mouseReleased = false;
  private rightClicked = false;
  mouseInCanvas = false;
  wheel = 0;
  /** Accumulated relative mouse motion this frame (pointer lock or not). */
  lookDx = 0;
  lookDy = 0;
  private wantLock = false;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
    window.addEventListener('blur', () => { this.down.clear(); this.mouseDown = false; });
    canvas.addEventListener('pointermove', (e) => { this.updateMouse(e); this.lookDx += e.movementX; this.lookDy += e.movementY; });
    document.addEventListener('pointerlockchange', () => { if (!this.isLocked() && this.wantLock) this.wantLock = false; });
    document.addEventListener('pointerlockerror', () => { this.wantLock = false; });
    canvas.addEventListener('pointerdown', (e) => {
      this.updateMouse(e);
      if (e.button === 0) { this.mouseDown = true; this.mouseClicked = true; }
      if (e.button === 2) this.rightClicked = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', (e) => { this.updateMouse(e); if (e.button === 0) { this.mouseDown = false; this.mouseReleased = true; } });
    canvas.addEventListener('pointerenter', () => { this.mouseInCanvas = true; });
    canvas.addEventListener('pointerleave', () => { this.mouseInCanvas = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  private updateMouse(e: PointerEvent): void {
    if (this.isLocked()) return; // position is meaningless under pointer lock
    const r = this.canvas.getBoundingClientRect();
    this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  isLocked(): boolean { return document.pointerLockElement === this.canvas; }

  /** Request pointer lock; must be called from a user gesture. Safe to call repeatedly. */
  requestLock(): void {
    if (this.isLocked() || this.wantLock || !('requestPointerLock' in this.canvas)) return;
    this.wantLock = true;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true } as unknown as undefined) as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') p.catch(() => { this.wantLock = false; });
    } catch { this.wantLock = false; }
  }

  releaseLock(): void {
    this.wantLock = false;
    if (this.isLocked()) document.exitPointerLock();
  }

  isDown(code: string): boolean { return this.down.has(code); }
  /** True on the first frame a key is held. Consumed at end of frame. */
  wasPressed(code: string): boolean { return this.pressed.has(code); }
  clicked(): boolean { return this.mouseClicked; }
  released(): boolean { return this.mouseReleased; }
  rightClick(): boolean { return this.rightClicked; }

  /** WASD / arrow movement vector, normalised. */
  moveAxis(): Vec {
    let x = 0, y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  /** Call once per frame after update logic has run. */
  endFrame(): void { this.pressed.clear(); this.mouseClicked = false; this.mouseReleased = false; this.rightClicked = false; this.wheel = 0; this.lookDx = 0; this.lookDy = 0; }
}
