/**
 * The layer a card effect crosses the table on.
 *
 * WHY A SECOND STAGE EXISTS. The per-seat stages are children of `.fk-photo`,
 * which is 1/8th of the table and clipped to its own corner of it. A 杀 that
 * travels from the attacker to the victim, a 铁索连环 that snaps taut between
 * two seats, and a 万箭齐发 that rains on all of them are all one shape spanning
 * the whole ring, and none of them can be drawn inside a seat. Direction is
 * most of what makes an effect legible on an eight-seat table — a burst on a
 * portrait says *something happened here*, and a streak arriving from the far
 * side of the table says *he did it to her* — so the geometry is worth a layer.
 *
 * WHY IT IS NOT A REACT COMPONENT. The room lane owns `RoomView.tsx` and
 * `Photo.tsx`; this lane owns `anim/`. The layer is created on demand as the
 * last child of `.fk-ring`, which React never reorders and never reads, exactly
 * as the sprite nodes are appended to a stage today. It is `pointer-events:
 * none`, it has no content of its own, and it goes away with `.fk-ring` on
 * unmount and with `dispose()` before that.
 *
 * WHY MEASURE RATHER THAN RECOMPUTE. `SeatRing` places seats from a ring
 * formula and `useRingMetrics` resizes them against the container, so the only
 * thing that knows where a seat actually is at this instant is the seat.
 * `Indicators.tsx` reads the same rectangles for the same reason. Measuring
 * happens once when an effect is built and never again while it runs.
 */

export interface Point { readonly x: number; readonly y: number }

const LAYER_CLASS = 'fk-fx-table';

/**
 * The table layer, made if it is not there yet.
 *
 * Takes any registered seat host rather than a container of its own, because
 * the seat is the only handle this module is given and `.fk-ring` is its
 * positioned ancestor — the same box every seat percentage already resolves
 * against, so a point measured against it needs no further correction.
 */
export function tableLayer(seatHost: HTMLElement): HTMLElement | null {
  const ring = seatHost.closest<HTMLElement>('.fk-ring');
  if (!ring) return null;
  const found = ring.querySelector<HTMLElement>(`:scope > .${LAYER_CLASS}`);
  if (found) return found;
  const layer = document.createElement('div');
  layer.className = LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  ring.appendChild(layer);
  return layer;
}

export function dropTableLayer(seatHost: HTMLElement | undefined): void {
  const ring = seatHost?.closest<HTMLElement>('.fk-ring');
  ring?.querySelector<HTMLElement>(`:scope > .${LAYER_CLASS}`)?.remove();
}

/** Where a seat sits inside the layer's own coordinates. */
export function pointOf(el: HTMLElement, layer: HTMLElement): Point | null {
  const box = layer.getBoundingClientRect();
  if (box.width <= 0) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0) return null;
  return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
}

/** Length of the run from `a` to `b`, in px. */
export function spanOf(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Bearing from `a` to `b`, in degrees, screen axes — 0 is right, 90 is down. */
export function bearing(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}
