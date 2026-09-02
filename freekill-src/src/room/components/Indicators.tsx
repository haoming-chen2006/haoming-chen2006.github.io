/**
 * The arrows that make a move legible: who is pointing at whom.
 *
 * `Fk/Components/LunarLTK/IndicatorLine.qml`, driven by `Animate` / `Indicate`.
 * Positions are measured off the live seat elements rather than recomputed from
 * the layout maths, so the arrows stay right at any window size.
 */
import { memo, useEffect, useState } from 'react';
import { useRoomState } from '../RoomContext';

export type SeatRefs = Map<number, HTMLElement | null>;

const LIFETIME_MS = 1200;

export const Indicators = memo(function Indicators(
  { seatRefs, container }: { seatRefs: SeatRefs; container: HTMLElement | null },
) {
  const state = useRoomState();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!state.indicators.length) return;
    const t = setInterval(() => tick((n) => n + 1), 120);
    return () => clearInterval(t);
  }, [state.indicators.length]);

  if (!container) return null;
  const now = Date.now();

  // MEASURE ONLY IF THERE IS SOMETHING TO DRAW. `getBoundingClientRect` is a
  // synchronous layout flush, and this one used to run above the early return —
  // inside React's render phase, on every committed burst, whether or not an
  // arrow existed. An arrow exists for about a second per card played; the
  // table commits thousands of times a game, so almost every one of those
  // flushes measured a ring in order to draw nothing. Together with the same
  // mistake in `Presents`, that made `getBoundingClientRect` the largest named
  // function in a CPU profile of the host seat.
  const live = state.indicators.filter((i) => now - i.at < LIFETIME_MS);
  if (!live.length) return null;

  const box = container.getBoundingClientRect();
  const centre = (pid: number): [number, number] | null => {
    const el = seatRefs.get(pid);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
  };

  return (
    <svg className="fk-indicators" width={box.width} height={box.height}>
      {live.flatMap((ind) => {
        const from = centre(ind.from);
        if (!from) return [];
        const age = (now - ind.at) / LIFETIME_MS;
        return ind.to.flatMap((to) => {
          const p = centre(to);
          if (!p) return [];
          // Inline, not the `opacity` attribute: a presentation attribute loses
          // to any stylesheet rule, and `.fk-indicators line` sets one — so the
          // arrows held full strength for their whole life and then blinked out.
          return [
            <line key={`${ind.id}-${to}`} x1={from[0]} y1={from[1]} x2={p[0]} y2={p[1]} style={{ opacity: 1 - age }} />,
            <circle key={`${ind.id}-${to}-d`} cx={p[0]} cy={p[1]} r={4} style={{ opacity: 1 - age }} />,
          ];
        });
      })}
    </svg>
  );
});
