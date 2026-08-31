import { useEffect, useState } from 'react';

/**
 * Seat sizing, measured rather than guessed.
 *
 * `arrangePhotos()` in `RoomLogic.js:82` lays seven columns across the room and
 * derives the spacing from the room's own width. Doing the same in CSS with
 * viewport units gets it wrong the moment the room is not the whole window —
 * inside the harness, next to the log panel, or beside lane 4's shell — and the
 * seats start overlapping. So the ring is measured and the two numbers are
 * published as custom properties.
 */
export interface RingMetrics {
  readonly width: number;
  readonly height: number;
  readonly photoW: number;
  readonly gutter: number;
}

const COLUMNS = 7;
const MIN_PHOTO = 92;
const MAX_PHOTO = 168;
const MIN_GAP = 6;

export function ringMetrics(width: number, height: number): RingMetrics {
  const fit = (width - (COLUMNS + 1) * MIN_GAP) / COLUMNS;
  const photoW = Math.max(MIN_PHOTO, Math.min(MAX_PHOTO, Math.floor(fit)));
  const gutter = (width - COLUMNS * photoW) / (COLUMNS + 1);
  return { width, height, photoW, gutter };
}

export function useRingMetrics(el: HTMLElement | null): RingMetrics {
  const [m, setM] = useState<RingMetrics>(() => ringMetrics(1200, 700));
  useEffect(() => {
    if (!el) return;
    const measure = () => setM(ringMetrics(el.clientWidth || 1200, el.clientHeight || 700));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return m;
}
