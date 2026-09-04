/** Fixed-step accumulator loop. `step` runs at STEP Hz, `render` at display rate. */
export const STEP = 1 / 60;
export class GameLoop {
  private acc = 0; private last = 0; private raf = 0; running = false;
  timeScale = 1;
  /** Max sim steps per frame; the test tier raises it so slow headless frames still advance sim time. */
  maxSteps = 5;
  constructor(private step: (dt: number) => void, private render: (dt: number, alpha: number) => void) {}
  start() {
    if (this.running) return; this.running = true; this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      let dt = Math.min(this.maxSteps > 5 ? 20 : 0.1, (now - this.last) / 1000); this.last = now;
      dt *= this.timeScale;
      this.acc += dt; let steps = 0;
      while (this.acc >= STEP && steps < this.maxSteps) { this.step(STEP); this.acc -= STEP; steps++; }
      if (steps === this.maxSteps) this.acc = 0;
      this.render(dt, this.acc / STEP);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
}
