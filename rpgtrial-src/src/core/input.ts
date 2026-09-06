// Keyboard + mouse (pointer lock) input. Produces edge-triggered "pressed" flags per sim step.
export type Action =
  | 'forward' | 'back' | 'left' | 'right' | 'sprint' | 'dodge' | 'jump' | 'block' | 'interact'
  | 'lockOn' | 'potion' | 'inventory' | 'character' | 'journal' | 'map' | 'pause'
  | 'ability1' | 'ability2' | 'ability3' | 'ability4' | 'ability5' | 'ability6' | 'walk' | 'cameraToggle';

const KEYMAP: Record<string, Action> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'dodge', ControlLeft: 'jump', KeyC: 'character', KeyF: 'jump',
  KeyQ: 'block', KeyE: 'interact', Tab: 'lockOn', KeyR: 'potion', KeyI: 'inventory', KeyJ: 'journal', KeyM: 'map',
  Escape: 'pause', Digit1: 'ability1', Digit2: 'ability2', Digit3: 'ability3', Digit4: 'ability4', Digit5: 'ability5', Digit6: 'ability6',
  AltLeft: 'walk', KeyV: 'cameraToggle',
};

export class Input {
  down = new Set<Action>();
  private pressedQueue = new Set<Action>();
  pressed = new Set<Action>();       // actions pressed since last `endStep()`
  mouseDX = 0; mouseDY = 0; wheel = 0;
  lmbDown = false; rmbDown = false; mmbDown = false;
  lmbPressed = false; rmbPressed = false; mmbPressed = false;
  private lmbQ = false; private rmbQ = false; private mmbQ = false;
  lmbHeldFor = 0; rmbHeldFor = 0;   // seconds (updated by endStep)
  rmbReleased = false; private rmbRelQ = false;
  locked = false; enabled = true;
  /** When true, UI has focus: gameplay keys are ignored (but pause still works). */
  uiCapture = false;
  private canvas: HTMLElement;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (e.code === 'Tab' || e.code === 'Space' || e.code === 'AltLeft' || e.code === 'ControlLeft') e.preventDefault();
      if (!a) return;
      if (e.repeat) return;
      this.down.add(a); this.pressedQueue.add(a);
    });
    window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) this.down.delete(a); });
    window.addEventListener('blur', () => { this.down.clear(); this.lmbDown = this.rmbDown = this.mmbDown = false; });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.lmbDown = true; this.lmbQ = true; }
      if (e.button === 2) { this.rmbDown = true; this.rmbQ = true; }
      if (e.button === 1) { this.mmbDown = true; this.mmbQ = true; e.preventDefault(); }
      if (!this.locked && this.enabled && !this.uiCapture) this.requestLock();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.lmbDown = false;
      if (e.button === 2) { if (this.rmbDown) this.rmbRelQ = true; this.rmbDown = false; }
      if (e.button === 1) this.mmbDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX; this.mouseDY += e.movementY;
    });
    window.addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
  }
  requestLock() {
    try {
      const r = (this.canvas as any).requestPointerLock?.({ unadjustedMovement: true });
      if (r && typeof r.catch === 'function') r.catch(() => { try { const r2 = this.canvas.requestPointerLock() as any; r2?.catch?.(() => {}); } catch {} });
    } catch { try { (this.canvas.requestPointerLock() as any)?.catch?.(() => {}); } catch {} }
  }
  releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }
  isDown(a: Action) { return !this.uiCapture && this.down.has(a); }
  wasPressed(a: Action) { return this.pressed.has(a); }
  /** Call once per sim step, after reading input: promotes queued presses to `pressed` for the next step. */
  endStep(dt: number) {
    this.pressed = this.pressedQueue; this.pressedQueue = new Set();
    this.lmbPressed = this.lmbQ; this.rmbPressed = this.rmbQ; this.mmbPressed = this.mmbQ; this.rmbReleased = this.rmbRelQ;
    this.lmbQ = this.rmbQ = this.mmbQ = this.rmbRelQ = false;
    this.lmbHeldFor = this.lmbDown ? this.lmbHeldFor + dt : 0;
    this.rmbHeldFor = this.rmbDown ? this.rmbHeldFor + dt : 0;
  }
  /** Consume accumulated mouse delta (call once per render frame for the camera). */
  takeMouse() { const r = { dx: this.mouseDX, dy: this.mouseDY, wheel: this.wheel }; this.mouseDX = this.mouseDY = 0; this.wheel = 0; return r; }
}
