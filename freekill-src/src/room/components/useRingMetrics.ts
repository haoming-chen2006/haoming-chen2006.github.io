import { useEffect, useState } from 'react';
import { seatsCollide, type SeatMetrics } from './SeatRing';

/**
 * Seat sizing, measured rather than guessed — and then checked.
 *
 * `arrangePhotos()` in `RoomLogic.js:82` lays seven columns across the room and
 * derives the spacing from the room's own width. Doing the same in CSS with
 * viewport units gets it wrong the moment the room is not the whole window —
 * inside the harness, next to the log panel, or beside the shell — and the
 * seats start overlapping. So the ring is measured and the numbers are
 * published as custom properties.
 *
 * The second half is the part a ratio cannot do. `SeatRing` spaces seats evenly
 * by arc length, which guarantees equal gaps but not that a gap is larger than
 * a seat: on a short ring the two seats sharing a column are spaced by less
 * than a seat is tall, and they overlap for a reason that has nothing to do
 * with the width the photo was sized against. So the photo is not computed, it
 * is *chosen*: the largest size at which `seatsCollide` says no two seats
 * touch. That makes non-overlap a property of the layout rather than a
 * consequence of numbers that happened to work at one window size.
 */
export interface RingMetrics extends SeatMetrics {
  readonly width: number;
  readonly height: number;
  readonly photoW: number;
  readonly gutter: number;
}

const COLUMNS = 7;
const MIN_PHOTO = 84;
const MAX_PHOTO = 168;
const MIN_GAP = 6;
const STEP = 2;

function at(width: number, height: number, photoW: number): RingMetrics {
  const gutter = Math.max(MIN_GAP, (width - COLUMNS * photoW) / (COLUMNS + 1));
  return { width, height, photoW, gutter };
}

export function ringMetrics(width: number, height: number, playerNum = 8): RingMetrics {
  const byWidth = Math.floor((width - (COLUMNS + 1) * MIN_GAP) / COLUMNS);
  const start = Math.max(MIN_PHOTO, Math.min(MAX_PHOTO, byWidth));
  const seats = Math.max(1, Math.min(playerNum, 12));

  for (let w = start; w > MIN_PHOTO; w -= STEP) {
    const m = at(width, height, w);
    if (!seatsCollide(seats, m)) return m;
  }
  // Nothing fits. Draw the smallest seat rather than no seat: a cramped table
  // is playable and a blank one is not, and the alternative is an empty ring
  // on a window nobody expected.
  return at(width, height, MIN_PHOTO);
}

export function useRingMetrics(el: HTMLElement | null, playerNum = 8): RingMetrics {
  const [m, setM] = useState<RingMetrics>(() => ringMetrics(1200, 700, playerNum));
  useEffect(() => {
    if (!el) return;
    const measure = () => setM(ringMetrics(el.clientWidth || 1200, el.clientHeight || 700, playerNum));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, playerNum]);
  return m;
}
