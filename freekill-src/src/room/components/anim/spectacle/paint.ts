/**
 * Getting a `Burst` onto the table, and off it again.
 *
 * WHY THERE IS A LAYER ABOVE THE SEAT. `EffectStage` puts its sprite layer
 * inside `.fk-photo`, and `.fk-photo` is `overflow: hidden` because it clips
 * the portrait to the frame's rounded corners. Everything drawn in that layer
 * is therefore clipped to the portrait however `overflow: visible` the layer
 * itself is — the shipped 杀 is drawn 15% wider than the seat and loses that
 * 15% on every edge. Nothing that is supposed to spill can spill.
 *
 * So the big moments are drawn on a layer of the room's own, positioned over
 * the seat from its measured rectangle, and the clipped layer is kept for the
 * things that *want* clipping: a corrosion vignette that should stop at the
 * frame, a recoil, the colour draining out of a portrait. Two surfaces, chosen
 * per part, rather than one surface that is wrong for half of them.
 *
 * The layer is created lazily on the first effect and never by React. It is a
 * child of `.fk-room` at `z-index: 30` — above the seat ring and the dashboard,
 * below `.fk-modal` at 40 — and every node in it is `pointer-events: none`, so
 * the audit's hit test at a control's centre point still finds the control.
 * `document.elementFromPoint` does not see a layer that cannot be pointed at.
 */
import type { Burst } from './plan';

/**
 * Effects alive on the layer at once. Past this the oldest goes, not the
 * newest: the newest is the one describing what is happening now.
 *
 * Twelve because the layer is the whole table's, not one seat's. An opening
 * deal is eight seats drawing inside one beat, and a busy beat can put a turn
 * opening and a judgement verdict on top of that. It was eight, and the ninth
 * simultaneous effect silently evicted the first — which is exactly what a
 * nine-up of the nine categories looks like when one of them is missing.
 */
const MAX_LIVE = 12;

/** How long a measured rectangle is trusted. Seats do not move between beats;
 *  they move on a window resize, which invalidates the cache outright. */
const RECT_MS = 500;

interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/**
 * Where a burst is drawn, plus where it came from and how big that was.
 *
 * `ox`/`oy` is the invoking seat's centre and `sw`/`sh` its size, which a
 * room-filling effect still needs: a slay's blade goes through the seat that
 * fell rather than through the middle of the felt, and its shards are sized
 * against that seat rather than against the room.
 */
interface Box extends Rect {
  readonly ox: number; readonly oy: number;
  readonly sw: number; readonly sh: number;
}

export class Sky {
  private room: HTMLElement | null = null;
  private layer: HTMLElement | null = null;
  private live: HTMLElement[] = [];
  private readonly rects = new Map<HTMLElement, { rect: Rect; at: number }>();
  /** Live `data-fk-spec` tokens per host, each with its own expiry. */
  private readonly accents = new Map<HTMLElement, Map<string, number>>();
  private reduced: boolean | null = null;
  private onResize: (() => void) | null = null;

  /**
   * Draw one burst. `host` is the seat's `.fk-photo`; it is both what a `seat`
   * burst is positioned over and what a host accent is applied to. A `table` or
   * `sky` burst does not need one, and passing it anyway only tells the effect
   * which seat it came from.
   *
   * Silent about failure by design. A seat that has unmounted, a room that is
   * not on the page, a layout that has not happened yet — none of those are
   * worth an exception on the notify path.
   */
  play(burst: Burst, host?: HTMLElement | null): void {
    if (burst.ms <= 0) return;
    const layer = this.ensure(host);
    if (!layer) return;

    const box = this.place(burst, host);
    if (!box) return;

    const el = document.createElement('div');
    el.className = burst.cls;
    el.style.setProperty('--fk-spec-x', `${box.x}px`);
    el.style.setProperty('--fk-spec-y', `${box.y}px`);
    el.style.setProperty('--fk-spec-w', `${box.w}px`);
    el.style.setProperty('--fk-spec-h', `${box.h}px`);
    el.style.setProperty('--fk-spec-ox', `${box.ox}px`);
    el.style.setProperty('--fk-spec-oy', `${box.oy}px`);
    el.style.setProperty('--fk-spec-sw', `${box.sw}px`);
    el.style.setProperty('--fk-spec-sh', `${box.sh}px`);
    for (const [k, v] of Object.entries(burst.vars)) el.style.setProperty(k, v);

    for (const part of burst.parts) {
      const n = part.n ?? 1;
      // Under `prefers-reduced-motion` a repeated part is one node, not
      // eighteen with 1 ms animations on them. The CSS shortens what is left.
      const count = this.quiet() ? Math.min(n, 1) : n;
      for (let i = 0; i < count; i += 1) el.appendChild(this.node(part, i, count));
    }

    while (this.live.length >= MAX_LIVE) this.live.shift()?.remove();
    this.live.push(el);

    const done = (e?: AnimationEvent) => {
      // `animationend` bubbles: a spark finishing is not the burst finishing.
      if (e && e.target !== el) return;
      el.remove();
      this.live = this.live.filter((x) => x !== el);
    };
    el.addEventListener('animationend', done as EventListener);
    // A backgrounded tab never fires `animationend`, and the node would sit on
    // the layer until the room unmounted.
    window.setTimeout(() => done(), burst.ms + 500);
    layer.appendChild(el);

    if (burst.host && host) this.accent(host, burst.host, burst.ms);
  }

  /**
   * Mark the portrait itself for the duration of the effect — a recoil, a
   * corrosion, the colour draining out of it.
   *
   * ON `data-fk-spec` RATHER THAN A CLASS. `Photo` computes its `className`
   * from props and React writes the whole attribute whenever that string
   * changes, which would silently drop an accent class mid-animation — and the
   * table commits five times a second on `refreshStatusSkills`, so the window
   * for that is not theoretical. React never writes `data-fk-spec`, because
   * nothing in the component tree knows it exists. Tokens are space separated
   * and matched with `[data-fk-spec~="…"]`, so two accents can hold at once and
   * each expires on its own clock.
   *
   * Re-setting an attribute to the value it already has does not replay a CSS
   * animation, so a repeat has to clear it, force a reflow and set it again.
   * Without that, a seat hit twice inside one beat shakes once.
   */
  accent(host: HTMLElement, tokens: string, ms: number): void {
    if (ms <= 0) return;
    const names = tokens.split(' ').filter(Boolean);
    if (!names.length) return;

    let held = this.accents.get(host);
    if (!held) { held = new Map(); this.accents.set(host, held); }
    for (const name of names) {
      const previous = held.get(name);
      if (previous !== undefined) window.clearTimeout(previous);
      held.set(name, window.setTimeout(() => {
        held.delete(name);
        this.flush(host, held);
      }, ms));
    }

    // The duration the accent's keyframes run for, so the portrait's reaction
    // keeps time with the burst above it at any pace.
    host.style.setProperty('--fk-spec-host-ms', `${ms}ms`);
    host.removeAttribute('data-fk-spec');
    void host.offsetWidth;
    this.flush(host, held);
  }

  private flush(host: HTMLElement, held: Map<string, number>): void {
    if (held.size) {
      host.setAttribute('data-fk-spec', [...held.keys()].join(' '));
      return;
    }
    host.removeAttribute('data-fk-spec');
    // The duration goes with the attribute. Leaving it behind put an inline
    // custom property on every seat that had ever been hit and never took it
    // off — harmless to render, but it is an inline style on an element React
    // owns, and this lane's whole claim is that it does not fight React for one.
    host.style.removeProperty('--fk-spec-host-ms');
    this.accents.delete(host);
  }

  dispose(): void {
    for (const [host, held] of this.accents) {
      for (const t of held.values()) window.clearTimeout(t);
      host.removeAttribute('data-fk-spec');
      host.style.removeProperty('--fk-spec-host-ms');
    }
    this.accents.clear();
    for (const el of this.live) el.remove();
    this.live = [];
    this.layer?.remove();
    this.layer = null;
    this.room = null;
    this.rects.clear();
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
      this.onResize = null;
    }
  }

  /* ------------------------------------------------------------- internals */

  private node(part: Burst['parts'][number], i: number, n: number): HTMLElement {
    const el = document.createElement('i');
    el.className = part.cls;
    el.style.setProperty('--fk-i', String(i));
    el.style.setProperty('--fk-n', String(n));
    // A stable scatter. Evenly spaced particles read as a machine; the same
    // particles nudged by a hash of their index read as a burst, and a hash
    // stays put across the effect's life where `Math.random()` per frame would
    // not. `-1 .. 1`, to three places.
    el.style.setProperty('--fk-j', jitter(i).toFixed(3));
    if (part.vars) for (const [k, v] of Object.entries(part.vars)) el.style.setProperty(k, v);
    // Engine text goes through `textContent`; authored SVG is the only markup
    // that is ever parsed, and it is a constant from `plan.ts`.
    if (part.text !== undefined) el.textContent = part.text;
    else if (part.svg !== undefined) el.innerHTML = part.svg;
    return el;
  }

  /** Where the burst goes, in the room's own coordinates. */
  private place(burst: Burst, host?: HTMLElement | null): Box | null {
    const room = this.room;
    if (!room) return null;
    const base = this.rectOf(room);
    if (!base) return null;

    const centre = (el: HTMLElement | null | undefined): { x: number; y: number } | null => {
      if (!el) return null;
      const r = this.rectOf(el);
      return r ? { x: r.x - base.x + r.w / 2, y: r.y - base.y + r.h / 2 } : null;
    };

    const seat = host ? this.rectOf(host) : null;

    if (burst.scope === 'sky') {
      const from = centre(host) ?? { x: base.w / 2, y: base.h / 2 };
      return {
        x: base.w / 2, y: base.h / 2, w: base.w, h: base.h,
        ox: from.x, oy: from.y,
        sw: seat?.w ?? base.w, sh: seat?.h ?? base.h,
      };
    }

    const target = burst.scope === 'table'
      ? (room.querySelector<HTMLElement>('.fk-table') ?? host ?? null)
      : (host ?? null);
    if (!target) return null;
    const r = this.rectOf(target);
    const at = centre(target);
    if (!r || !at) return null;
    const from = centre(host) ?? at;
    return {
      x: at.x, y: at.y, w: r.w, h: r.h,
      ox: from.x, oy: from.y,
      sw: seat?.w ?? r.w, sh: seat?.h ?? r.h,
    };
  }

  /**
   * A measured rectangle, remembered for half a second.
   *
   * `getBoundingClientRect` forces layout, and effects arrive in bursts — the
   * opening deal is ten `MoveCards` inside one beat. Seats hold still between
   * beats, so measuring each one once per burst rather than once per effect
   * costs nothing and saves the rest.
   */
  private rectOf(el: HTMLElement): Rect | null {
    const now = Date.now();
    const hit = this.rects.get(el);
    if (hit && now - hit.at < RECT_MS) return hit.rect;
    if (!el.isConnected) { this.rects.delete(el); return null; }
    const box = el.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const rect: Rect = { x: box.left, y: box.top, w: box.width, h: box.height };
    this.rects.set(el, { rect, at: now });
    return rect;
  }

  /** The layer, built on first use and rebuilt if the room remounted. */
  private ensure(host?: HTMLElement | null): HTMLElement | null {
    if (this.layer?.isConnected && this.room?.isConnected) return this.layer;
    const room = host?.closest<HTMLElement>('.fk-room')
      ?? document.querySelector<HTMLElement>('.fk-room');
    if (!room) return null;
    this.layer?.remove();
    this.rects.clear();
    const layer = document.createElement('div');
    layer.className = 'fk-spec-sky';
    layer.setAttribute('aria-hidden', 'true');
    room.appendChild(layer);
    this.room = room;
    this.layer = layer;
    if (!this.onResize) {
      // Seats move when the window does, and a stale rectangle would put an
      // effect where the seat used to be for up to half a second.
      this.onResize = () => this.rects.clear();
      window.addEventListener('resize', this.onResize, { passive: true });
    }
    return layer;
  }

  private quiet(): boolean {
    if (this.reduced === null) {
      try {
        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        this.reduced = false;
      }
    }
    return this.reduced;
  }
}

/**
 * A deterministic `-1 .. 1` from a particle's index.
 *
 * Not randomness — the same index must give the same offset for the whole of an
 * effect's life, or a particle would jump every time CSS re-read the property.
 * A cheap integer hash is enough; this is scatter, not cryptography.
 */
export function jitter(i: number): number {
  let h = (i + 1) * 2654435761;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}
