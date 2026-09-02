/**
 * What an arrange panel lets a player do with a card — and nothing about what
 * the game allows, which stays the engine's answer.
 *
 * `GuanxingBox.qml` and `ArrangeCardsBox.qml` are one widget with one rule, and
 * the rule is `updateCardReleased`:
 *
 *     if (j !== movepos[0] && result[movepos[0]].length === areaCapacities[movepos[0]]) {
 *       result[j][i] = result[movepos[0]][movepos[1]];      // they trade places
 *       result[movepos[0]][movepos[1]] = _card;
 *     } else {
 *       result[j].splice(i, 1);                             // lifted out…
 *       result[movepos[0]].splice(movepos[1], 0, _card);    // …and spliced in
 *     }
 *
 * So a card dropped on a slot in ANOTHER zone that is already at capacity
 * EXCHANGES with the card in that slot; everywhere else it is a plain move.
 * Both operations are offered by the same drag, and which one you get is
 * decided by the destination's capacity, never refused for it.
 *
 * THAT SECOND BRANCH WAS THE WHOLE OF `ArrangeBox.move()`, and it is why 星魂
 * could not be played. `Room:askToArrangeCards` defaults `max_limit` to the row
 * sizes it was handed (`lua/lunarltk/server/room.lua:1695`), and 神姜维 hands it
 * two rows — five cards off the draw pile, and his whole hand
 * (`packages/mobile/pkg/mobile_shiji/skills/xinghun.lua:26-34`). Both are at
 * capacity from the moment the box opens, so "refuse any destination at
 * capacity" refused every cross-zone move there was, and the skill's one
 * instruction — 「用任意张手牌与其中等量牌进行交换」, swap hand cards for an
 * equal number of the cards on top of the deck — could not be given. The same
 * arithmetic disabled `AskForExchange` outright: `RoomLogic.js:901` maps every
 * pile to a zone whose capacity is that pile's own length, so an exchange is
 * the only move that box has ever had.
 *
 * An exchange is also why "just drop the capacity check" is not the fix. It is
 * capacity-neutral — one card each way — where a move is not, so the check
 * still has to hold for the move branch or a seat could hand the engine a
 * six-card top row and 星魂 would put six cards back on a five-card deck.
 */

/** Where a card is: which zone, and where in that zone. */
export interface Slot {
  readonly zone: number;
  readonly index: number;
}

/**
 * `areaCapacities[j]`, absent meaning unbounded.
 *
 * `askToArrangeCards` always sends one per row, but `askToGuanxing` collapses a
 * zero-capacity half away (`RoomLogic.js:876`) and `ExchangeBox` builds its own,
 * so a short array is a shape the panel has to survive rather than assume away.
 */
const capacityOf = (capacities: readonly number[], zone: number): number =>
  capacities[zone] ?? Number.MAX_SAFE_INTEGER;

/** Whether zone `z` could take one more card. */
export function hasRoom(
  zones: readonly (readonly number[])[],
  capacities: readonly number[],
  z: number,
): boolean {
  const zone = zones[z];
  return zone !== undefined && zone.length < capacityOf(capacities, z);
}

/**
 * The next zone after `from` that can take one more card, or `null` when every
 * other zone is at capacity — in which case the only cross-zone operation left
 * is an exchange, and the ⇄ button has nowhere to send this card on its own.
 *
 * Searched cyclically from `from`, which is what the old `(zi + 1) % n` did for
 * the two-zone case and stays right for the n-zone one.
 */
export function zoneWithRoom(
  zones: readonly (readonly number[])[],
  capacities: readonly number[],
  from: number,
): number | null {
  for (let step = 1; step < zones.length; step++) {
    const z = (from + step) % zones.length;
    if (hasRoom(zones, capacities, z)) return z;
  }
  return null;
}

/**
 * Put the card at `from` on the slot at `onto`, by the rule above.
 *
 * Returns the whole arrangement afresh, or `null` when the drop changes
 * nothing — a card onto its own slot, a slot that holds no card, a zone that
 * does not exist. Nothing here consults the pattern, the poxi filter or
 * `is_free`: those decide which cards may be picked up at all, which is a
 * question for the engine and not for this function.
 */
export function place(
  zones: readonly (readonly number[])[],
  capacities: readonly number[],
  from: Slot,
  onto: Slot,
): number[][] | null {
  const source = zones[from.zone];
  const target = zones[onto.zone];
  if (!source || !target) return null;
  const cid = source[from.index];
  if (cid === undefined) return null;

  const next = zones.map((z) => [...z]);

  // Within one zone the drag is always a reorder — QML never trades places with
  // a neighbour, it lifts the card out and splices it back in at the index it
  // was dropped on.
  if (from.zone === onto.zone) {
    const to = clamp(onto.index, source.length - 1);
    if (to === from.index) return null;
    next[from.zone].splice(from.index, 1);
    next[from.zone].splice(to, 0, cid);
    return next;
  }

  // A full destination: the two cards trade places, which keeps both zones at
  // exactly the length they were.
  if (target.length >= capacityOf(capacities, onto.zone)) {
    const partner = target[onto.index];
    if (partner === undefined) return null;
    next[from.zone][from.index] = partner;
    next[onto.zone][onto.index] = cid;
    return next;
  }

  // A destination with room: a plain move, inserted where it was dropped.
  next[from.zone].splice(from.index, 1);
  next[onto.zone].splice(clamp(onto.index, next[onto.zone].length), 0, cid);
  return next;
}

const clamp = (i: number, max: number): number => Math.min(Math.max(i, 0), Math.max(max, 0));

/* ------------------------------------------------------- the panel's clicks */

/**
 * Everything the box remembers between clicks: the arrangement, and the card
 * the player has picked up and not yet put down.
 *
 * The three functions below are the whole of what the panel can do, and they
 * live here rather than inside the component so that the gesture can be
 * measured without a browser — `src/engine/__tests__/xinghun.test.ts` plays the
 * clicks against a real 星魂 request and hands the engine what they produce.
 */
export interface ArrangeState {
  readonly zones: readonly (readonly number[])[];
  /** Card id, not slot: a card keeps its identity as the zones move under it. */
  readonly picked: number | null;
}

const slotOf = (zones: readonly (readonly number[])[], cid: number): Slot | null => {
  for (let zone = 0; zone < zones.length; zone++) {
    const index = zones[zone].indexOf(cid);
    if (index >= 0) return { zone, index };
  }
  return null;
};

/**
 * Click a card to pick it up; click a second to put the first one there.
 *
 * That pair is the drag: the first click is the grab, the second is the drop,
 * and `place` reads the destination exactly as `updateCardReleased` reads
 * `movepos`. Clicking the picked card again puts it back down.
 */
export function tap(state: ArrangeState, capacities: readonly number[], cid: number): ArrangeState {
  if (state.picked === null) return { ...state, picked: cid };
  if (state.picked === cid) return { ...state, picked: null };
  const from = slotOf(state.zones, state.picked);
  const onto = slotOf(state.zones, cid);
  const next = from && onto ? place(state.zones, capacities, from, onto) : null;
  return { zones: next ?? state.zones, picked: null };
}

/** ⇄ — put the card at the end of a zone that has room for it. */
export function moveOut(
  state: ArrangeState,
  capacities: readonly number[],
  cid: number,
  to: number,
): ArrangeState {
  const from = slotOf(state.zones, cid);
  const next = from ? place(state.zones, capacities, from, { zone: to, index: state.zones[to].length }) : null;
  return { zones: next ?? state.zones, picked: null };
}

/** ◀ ▶ — trade places with the neighbour, which is ordering and never a move. */
export function shift(state: ArrangeState, cid: number, delta: number): ArrangeState {
  const from = slotOf(state.zones, cid);
  if (!from) return state;
  const j = from.index + delta;
  const zone = state.zones[from.zone];
  if (j < 0 || j >= zone.length) return { ...state, picked: null };
  const next = state.zones.map((z) => [...z]);
  [next[from.zone][from.index], next[from.zone][j]] = [next[from.zone][j], next[from.zone][from.index]];
  return { zones: next, picked: null };
}
