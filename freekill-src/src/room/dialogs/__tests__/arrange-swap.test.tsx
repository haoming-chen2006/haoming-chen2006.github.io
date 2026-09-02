/**
 * Moving a card from one row of an arrange box to the other.
 *
 * `ArrangeCardsBox.qml` and `GuanxingBox.qml` share `updateCardReleased`, and it
 * has two branches: a card dropped in another zone that is already at capacity
 * TRADES PLACES with the card it lands on, and everywhere else it is lifted out
 * and spliced in. `ArrangeBox.move()` only ever had the second one, guarded by
 *
 *     if (zones[to].length >= (capacities[to] ?? 99)) return;
 *
 * which is the exact case the first branch exists for. `Room:askToArrangeCards`
 * defaults `max_limit` to the rows it was handed (`room.lua:1695`), so 神姜维's
 * 星魂 — five cards off the draw pile in one row, his whole hand in the other
 * (`mobile_shiji/skills/xinghun.lua:26-34`) — opens with both rows at capacity
 * and every cross-row move refused. The skill's one instruction is 「用任意张手
 * 牌与其中等量牌进行交换」: trade hand cards for the same number of cards on top
 * of the deck. There was no way to do it.
 *
 * The rule is checked below as the rule, and the panel is rendered through the
 * real store in the style of `poxi-visibility` / `card-chosen-target` to check
 * that what a seat is offered matches it. `src/engine/__tests__/xinghun.test.ts`
 * then plays the clicks against a real 星魂 request in a real room.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { DialogHost } from '../DialogHost';
import { moveOut, place, shift, tap, zoneWithRoom, type ArrangeState } from '../arrange';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

const stubLua = {
  tr: (key: string) => key,
  getCardData: (cid: number) => ({ cid, name: 'slash', suit: 'spade', number: 7, known: true }),
  getGeneralData: () => null,
  getIllustrator: () => '',
} as unknown as LtkLua;

/**
 * The wire 星魂 puts out: five cards off the draw pile, the hand, and a capacity
 * per row equal to that row's own length. `free_arrange` is the skill's own.
 */
const XINGHUN = {
  cards: [[1, 2, 3, 4, 5], [11, 12, 13, 14]],
  names: ['Top', '$Hand'],
  prompt: '#xinghun-exchange',
  size: 7,
  capacities: [5, 4],
  limits: [0, 0],
  is_free: true,
  pattern: '.',
  poxi_type: '',
  cancelable: false,
};

/** 观星: three cards, a top row that holds them and an empty bottom row. */
const GUANXING = {
  prompt: '',
  is_free: true,
  cards: [[1, 2, 3]],
  min_top_cards: 0, max_top_cards: 3,
  min_bottom_cards: 0, max_bottom_cards: 3,
  top_area_name: 'Top', bottom_area_name: 'Bottom',
};

function draw(command: string, data: unknown): string {
  const store = new RoomStore(1);
  store.applyNotify(command, data);
  store.commit();
  const services: RoomServices = {
    store, lua: stubLua, assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: 1,
    naming: makeNaming(store),
  };
  return renderToStaticMarkup(
    <RoomProvider value={services}>
      <DialogHost onReply={() => {}} interactive />
    </RoomProvider>,
  );
}

const start = (zones: number[][]): ArrangeState => ({ zones, picked: null });

/* ------------------------------------------------------------------ the rule */

describe('the rule an arrange box moves cards by', () => {
  it('trades places when the destination zone is full', () => {
    // The first branch of `updateCardReleased`, and the only operation 星魂 has.
    const next = place(XINGHUN.cards, XINGHUN.capacities, { zone: 1, index: 0 }, { zone: 0, index: 2 });
    expect(next).toEqual([[1, 2, 11, 4, 5], [3, 12, 13, 14]]);
  });

  it('keeps every zone at its capacity when it trades', () => {
    const next = place(XINGHUN.cards, XINGHUN.capacities, { zone: 0, index: 4 }, { zone: 1, index: 1 });
    expect(next?.map((z) => z.length)).toEqual([5, 4]);
    // And the cards are conserved: nothing invented, nothing dropped.
    expect(next?.flat().slice().sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 11, 12, 13, 14]);
  });

  it('moves rather than trades when the destination has room', () => {
    // 观星's second row starts empty, which is the branch that always worked.
    const next = place([[1, 2, 3], []], [3, 3], { zone: 0, index: 1 }, { zone: 1, index: 0 });
    expect(next).toEqual([[1, 3], [2]]);
  });

  it('never overfills a zone, which is why the capacity check has to stay', () => {
    // Zone 0 is full and zone 1 has room, so this is the move branch one way
    // and the trade branch the other. Neither may leave zone 0 holding six.
    const zones = [[1, 2, 3, 4, 5], [11]];
    const capacities = [5, 4];
    expect(place(zones, capacities, { zone: 0, index: 0 }, { zone: 1, index: 0 })).toEqual([[2, 3, 4, 5], [1, 11]]);
    expect(place(zones, capacities, { zone: 1, index: 0 }, { zone: 0, index: 0 })?.[0]).toHaveLength(5);
  });

  it('reorders inside one zone instead of trading', () => {
    // QML splices within a zone whatever the capacity is — `movepos[0] === j`
    // never reaches the exchange branch.
    expect(place([[1, 2, 3]], [3], { zone: 0, index: 0 }, { zone: 0, index: 2 })).toEqual([[2, 3, 1]]);
  });

  it('says when no zone can take another card', () => {
    expect(zoneWithRoom(XINGHUN.cards, XINGHUN.capacities, 0)).toBeNull();
    expect(zoneWithRoom([[1, 2, 3], []], [3, 3], 0)).toBe(1);
  });
});

/* --------------------------------------------------------------- the clicks */

describe('the two clicks that make the trade', () => {
  it('picks a card up and puts it on one in the other row', () => {
    let s = start(XINGHUN.cards.map((z) => [...z]));
    s = tap(s, XINGHUN.capacities, 12);
    expect(s.picked).toBe(12);
    // Nothing has moved yet: one click is a grab, not an answer.
    expect(s.zones).toEqual(XINGHUN.cards);

    s = tap(s, XINGHUN.capacities, 3);
    expect(s.zones).toEqual([[1, 2, 12, 4, 5], [11, 3, 13, 14]]);
    expect(s.picked).toBeNull();
  });

  it('puts the card back down when it is clicked again', () => {
    let s = start(XINGHUN.cards.map((z) => [...z]));
    s = tap(s, XINGHUN.capacities, 12);
    s = tap(s, XINGHUN.capacities, 12);
    expect(s.picked).toBeNull();
    expect(s.zones).toEqual(XINGHUN.cards);
  });

  it('still moves a card outright when the far row has room', () => {
    const s = moveOut(start([[1, 2, 3], []]), [3, 3], 2, 1);
    expect(s.zones).toEqual([[1, 3], [2]]);
  });

  it('leaves ordering to the arrows', () => {
    expect(shift(start([[1, 2, 3]]), 1, 1).zones).toEqual([[2, 1, 3]]);
    expect(shift(start([[1, 2, 3]]), 1, -1).zones).toEqual([[1, 2, 3]]);
  });
});

/* ------------------------------------------------------------- what is drawn */

describe('the arrange panel a seat is looking at', () => {
  it('offers a way to move a card when every row is already full', () => {
    const html = draw('AskForArrangeCards', XINGHUN);
    // The panel is up with both rows of 星魂 on it.
    expect(html).toContain('fk-zone__slot');
    expect((html.match(/fk-zone\b/g) ?? []).length).toBeGreaterThanOrEqual(2);

    // ⇄ moves a card into a zone with room, and there is no such zone here, so
    // drawing it is drawing a button that cannot do anything — which is what
    // the box used to do on every one of these nine cards.
    expect(html).not.toContain('⇄');
    // What it offers instead is the pick, on every card in both rows.
    expect((html.match(/cursor:pointer/g) ?? []).length).toBe(9);
    // …and it says so, rather than leaving a seat to discover it.
    expect(html).toContain('Please click to move card');
  });

  it('still offers the one-click move when a row has room', () => {
    // 观星 is the common case and must not have been traded away for the fix:
    // its bottom row starts empty, so ⇄ is on every card.
    const html = draw('AskForGuanxing', GUANXING);
    expect((html.match(/⇄/g) ?? []).length).toBe(3);
  });
});
