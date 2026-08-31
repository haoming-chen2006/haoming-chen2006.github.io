/**
 * Where the seats go.
 *
 * The same U-shaped ring `arrangePhotos()` builds in `RoomLogic.js:82` — seven
 * columns, the viewer at the bottom of the rightmost one, everyone else running
 * up the right side, across the top and down the left. `regularSeatIndex` maps a
 * table of n players onto that ring exactly as the Qt client does, so a 5-player
 * table looks the same here as it does there.
 *
 * Expressed as percentages so the whole table scales; the Qt client hard-codes
 * pixels because its window does not reflow.
 */
export interface RingSlot {
  /** Column 0 (left) .. 6 (right). */
  readonly col: number;
  /** 0 = top edge, 1 = one step down, 2 = two steps, 3 = bottom (the viewer). */
  readonly row: 0 | 1 | 2 | 3;
}

export const RING: readonly RingSlot[] = [
  { col: 6, row: 3 }, // 0 — the viewer
  { col: 6, row: 2 },
  { col: 5, row: 1 },
  { col: 4, row: 0 },
  { col: 3, row: 0 },
  { col: 2, row: 0 },
  { col: 1, row: 1 },
  { col: 0, row: 2 },
];

/** `RoomLogic.js:110`. Which ring slots an n-player table uses. */
export const REGULAR_SEAT_INDEX: readonly (readonly number[])[] = [
  [0],
  [0, 4],
  [0, 3, 5],
  [0, 1, 4, 7],
  [0, 1, 3, 5, 7],
  [0, 1, 3, 4, 5, 7],
  [0, 1, 2, 3, 5, 6, 7],
  [0, 1, 2, 3, 4, 5, 6, 7],
];

/** Vertical steps: top edge, one step down, two steps, and the viewer's row. */
const ROW_FRACTION = [0.015, 0.115, 0.30, 0.575];

export function seatStyle(
  playerNum: number,
  index: number,
  m: { photoW: number; gutter: number; height: number },
): React.CSSProperties {
  const table = REGULAR_SEAT_INDEX[Math.min(playerNum, 8) - 1] ?? REGULAR_SEAT_INDEX[7];
  const ringSlot = RING[table[index] ?? index % 8];
  return {
    width: m.photoW,
    left: Math.round(m.gutter + ringSlot.col * (m.photoW + m.gutter)),
    top: Math.round(ROW_FRACTION[ringSlot.row] * m.height),
    // Lower rows draw over higher ones, so an equipment strip never disappears
    // under the seat below it.
    zIndex: 2 + ringSlot.row,
  };
}
