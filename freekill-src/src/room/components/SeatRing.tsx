/**
 * Where the seats go.
 *
 * WHAT WAS WRONG. This used to be a table of eight hand-picked (column, row)
 * slots on a seven-column grid, mapped from the Qt client's `arrangePhotos()`.
 * Two of those slots — the viewer's and the seat after it — shared column 6 and
 * were placed 0.30 and 0.575 of the ring's height apart. At any realistic ring
 * height that gap is smaller than a photo is tall, so the two right-hand seats
 * overlapped, permanently, in every eight-player game. The rest of the table
 * was bunched into the top-left because the four `ROW_FRACTION` steps crowded
 * three of their four values into the upper 30% of the ring, and the whole
 * lower half held nothing at all.
 *
 * WHAT IT DOES NOW. Seats are placed by arc length along a U — up the right
 * edge, across the top, down the left — with the viewer at the bottom-right
 * corner and the last seat at the bottom-left. Two properties follow from that
 * and neither did before:
 *
 *  * Spacing is uniform. Every seat is `perimeter / (n - 1)` from its
 *    neighbours no matter how many are playing.
 *  * The layout is symmetric. The two ends of the arc are the two bottom
 *    corners, so a table looks the same reflected, and both halves are used.
 *
 * Distributing by arc length rather than by slot index is what makes the wide
 * top edge take the seats it should: on a 1280x590 ring the top is 67% of the
 * perimeter and takes four of eight seats, while the short vertical edges take
 * two each. A fixed slot table cannot adapt to the room's shape, and the room's
 * shape is exactly what changes between a landscape tablet and a desktop.
 *
 * A SEAT IS TALLER THAN ITS PHOTO. The equipment strip, the judge chips and the
 * marks are laid out under the portrait and are not in the slot's own box.
 * Sizing the ring to the photo alone is what made a left-column seat draw its
 * 的卢 and 玄剑 through the portrait below it, and what let the bottom two seats
 * have their equipment clipped off by `.fk-seats { overflow: hidden }`. Every
 * measurement here is of the whole seat.
 */

/** Photo box height. `room.css` derives `--fk-photo-h` from the same ratio. */
export const photoHeight = (photoW: number): number => photoW * 1.33;

/**
 * Room under the portrait for the rows that hang below it, as a share of the
 * photo width: up to four equipment rows at 17px, a judge row, and a mark row.
 */
export const seatExtras = (photoW: number): number => Math.round(photoW * 0.46);

/** The whole seat, portrait and the rows under it. */
export const seatHeight = (photoW: number): number => photoHeight(photoW) + seatExtras(photoW);

export interface SeatMetrics {
  readonly width: number;
  readonly height: number;
  readonly photoW: number;
  readonly gutter: number;
}

export interface SeatBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The seat's box in the ring.
 *
 * `index` is the player's distance from the viewer in seat order — the store
 * rotates `ArrangeSeats` so the viewer is always 0 — which is what puts you at
 * the bottom-right and walks the rest of the table around the U in the order
 * play passes between them.
 */
export function seatBox(playerNum: number, index: number, m: SeatMetrics): SeatBox {
  const n = Math.max(1, playerNum);
  // Horizontal breathing room comes from the gutter the columns already imply;
  // vertical is a small fixed margin. Using the gutter for both cost real
  // portrait size: the gutter grows as the photo shrinks, so a wide window
  // spent 24px of the ring's height on padding and then had to shrink the photo
  // again to make the seats fit inside what was left.
  const padX = Math.max(6, m.gutter);
  const padY = 8;
  const sh = seatHeight(m.photoW);

  const xLeft = padX;
  const xRight = Math.max(xLeft, m.width - m.photoW - padX);
  const yTop = padY;
  const yBottom = Math.max(yTop, m.height - sh - padY);

  const vSpan = yBottom - yTop;
  const hSpan = xRight - xLeft;
  const perimeter = vSpan * 2 + hSpan;

  // 0 at the bottom-right, 1 at the bottom-left, so the two ends of the walk
  // are the two bottom corners and the table reads symmetrically.
  const t = n === 1 ? 0 : Math.min(1, Math.max(0, index / (n - 1)));
  const along = t * perimeter;

  let left: number;
  let top: number;
  if (along <= vSpan) {
    left = xRight;
    top = yBottom - along;
  } else if (along <= vSpan + hSpan) {
    left = xRight - (along - vSpan);
    top = yTop;
  } else {
    left = xLeft;
    top = yTop + Math.min(vSpan, along - vSpan - hSpan);
  }

  return { left: Math.round(left), top: Math.round(top), width: m.photoW, height: Math.round(sh) };
}

export function seatStyle(playerNum: number, index: number, m: SeatMetrics): React.CSSProperties {
  const box = seatBox(playerNum, index, m);
  return {
    width: box.width,
    left: box.left,
    top: box.top,
    // Lower seats draw over higher ones, so an equipment strip is never hidden
    // under the seat below it.
    zIndex: 2 + Math.round((box.top / Math.max(1, m.height)) * 20),
  };
}

/**
 * Do any two seats collide at this size?
 *
 * This is the check `useRingMetrics` sizes the photo against, and it is why the
 * ring has no overlapping configuration rather than merely not having the one
 * that was reported. Uniform arc spacing guarantees equal *gaps*, not that a
 * gap is bigger than a seat: on a short ring the two seats in a column are
 * spaced by less than a seat is tall, and the only fix is a smaller photo.
 * Asking the question directly beats deriving a ratio that has to be re-derived
 * every time the seat grows a row.
 */
export function seatsCollide(playerNum: number, m: SeatMetrics): boolean {
  const boxes: SeatBox[] = [];
  for (let i = 0; i < playerNum; i++) boxes.push(seatBox(playerNum, i, m));
  // A few pixels of touching is not a collision; a portrait through a portrait is.
  const SLACK = 4;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const ox = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
      const oy = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
      if (ox > SLACK && oy > SLACK) return true;
    }
  }
  return false;
}

/**
 * How much of the ring's width the seats occupy on each side.
 *
 * The processing pile used to be `width: min(68%, 900px)` centred, which on a
 * narrow ring reached under the left and right seats and drew cards across
 * their equipment rows. The table now gets the space between the columns and
 * nothing more.
 */
export function tableInset(m: SeatMetrics): number {
  return Math.round(m.photoW + Math.max(6, m.gutter) * 2);
}

/**
 * The top of the band the processing pile may use, measured from the ring's
 * top: below the tallest seat on the top edge, with a little air.
 *
 * Centring the pile vertically put it through the equipment row of whichever
 * seat sat above it — 152px of overlap, measured in a live game.
 */
export function tableTop(m: SeatMetrics): number {
  return Math.round(seatHeight(m.photoW) + 20);
}
