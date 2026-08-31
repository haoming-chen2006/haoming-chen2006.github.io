/**
 * The amazing-grace board, and the thing it must never do: stop the seat
 * playing.
 *
 * 五谷丰登 is the one card that puts a box on every seat's screen and leaves it
 * there. `FillAG` goes to all eight players before the first target resolves
 * (`amazing_grace.lua:26`), `CloseAG` goes out only after the last one has
 * taken a card, and in between the engine asks each target's table whether
 * anybody wants to nullify — once per target, `#AskForNullification::<to>`,
 * eight times over. A seat holding a 无懈可击 is asked all eight times while
 * the board is up.
 *
 * Drawing that board as a modal made all eight unanswerable. The audit's own
 * record of one game, seat p2:
 *
 *   20:26:46.859  take-ag                                    (reply sent, 137ms)
 *   20:26:46.861  #AskForNullification::5:amazing_grace      modal=true
 *   20:27:16.330  #AskForNullification::6:amazing_grace      modal=true
 *   20:27:46.340  #AskForNullification::4:amazing_grace      modal=true
 *   20:28:17.632  #AskForNullification::7:snatch             modal=false → answered in 1.1s
 *
 * Three consecutive 30-second timeouts, each one a click that landed on the
 * overlay instead of the card. The checks below are that log turned into
 * assertions: the board does not cover the table, it leaves the seat able to
 * answer what is asked while it is up, it stops offering cards the moment this
 * seat answers, and it does not hide another dialog behind itself.
 *
 * Rendered rather than reasoned about: `renderToStaticMarkup` runs the real
 * component tree over a real `RoomStore` fed real notify messages, so what is
 * asserted is what the room would put on screen.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { DialogHost } from '../DialogHost';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/**
 * Everything the dialogs ask the engine for, answered locally. None of it is
 * under test — `tr` is a translation table and `getCardData` is a card face —
 * and a real client VM would only make the run slower and the failure noisier.
 */
const stubLua = {
  tr: (key: string) => key,
  getCardData: (cid: number) => ({ cid, name: 'slash', suit: 'spade', number: 7, known: true }),
  getGeneralData: () => null,
  getIllustrator: () => '',
} as unknown as LtkLua;

function room(selfId = 1): { store: RoomStore; draw: () => string } {
  const store = new RoomStore(selfId);
  const services: RoomServices = {
    store,
    lua: stubLua,
    assets: new Assets(EMPTY_MANIFEST),
    mode: 'play',
    meId: selfId,
    naming: makeNaming(store),
  };
  const draw = () => {
    store.commit();
    return renderToStaticMarkup(
      <RoomProvider value={services}>
        <DialogHost onReply={() => {}} interactive />
      </RoomProvider>,
    );
  };
  return { store, draw };
}

/** The wire, as `amazing_grace.lua` puts it out, from this seat's point of view. */
const AG_IDS = [11, 12, 13];
function fillBoard(store: RoomStore): void {
  store.applyNotify('FillAG', [AG_IDS, []]);
}
function askBoard(store: RoomStore): void {
  store.applyNotify('AskForAG', [AG_IDS, false, 'amazing_grace_skill']);
}

/** `.fk-modal` is the full-screen overlay; its presence is the bug. */
const covered = (html: string) => html.includes('fk-modal');
const board = (html: string) => html.includes('fk-ag__slot');
const pickable = (html: string) => (html.match(/fk-card--enabled/g) ?? []).length;

describe('the amazing-grace board', () => {
  it('does not cover the table it is asking about', () => {
    const { store, draw } = room();
    fillBoard(store);
    askBoard(store);

    const html = draw();
    expect(board(html)).toBe(true);
    // The board is up and offering all three cards...
    expect(pickable(html)).toBe(3);
    // ...over a table the seat can still reach. This is the assertion the three
    // 30-second nullifications above would have failed.
    expect(covered(html)).toBe(false);
    // And it says so in the markup, not just by not having the overlay class:
    // the frame around the box passes clicks through to whatever is under it.
    expect(html).toMatch(/pointer-events:\s*none/);
  });

  it('leaves the seat able to answer a question asked while it is up', () => {
    const { store, draw } = room();
    fillBoard(store);
    askBoard(store);
    // Taken. From here the board is a scoreboard, not a question.
    store.closeRequest();
    store.applyNotify('TakeAG', [1, 12]);

    // The nullification the engine asks next, for the next target of the same
    // 五谷丰登. It is a scene request: the seat answers it from the dashboard,
    // which is exactly what the board was sitting on top of.
    store.applyNotify('AskForUseCard', ['nullification', 'nullification',
      '#AskForNullification::5:amazing_grace', true, {}, []]);

    const html = draw();
    expect(board(html)).toBe(true);
    expect(covered(html)).toBe(false);
    // Nothing on the board is clickable any more — this seat has taken its card
    // and the question it is being asked now is somewhere else.
    expect(pickable(html)).toBe(0);
  });

  it('stops offering cards the moment this seat answers, not when TakeAG lands', () => {
    const { store, draw } = room();
    fillBoard(store);
    askBoard(store);
    expect(pickable(draw())).toBe(3);

    // What `RoomView.reply` does on the click, before anything comes back:
    // `AG.qml:41` drops `interactive` on the click itself for the same reason.
    // `TakeAG` deliberately does not follow here — in one measured game it was
    // 60 seconds behind, and every one of those seconds showed three cards that
    // looked takeable and would have sent a second answer.
    store.closeRequest();

    const html = draw();
    expect(board(html)).toBe(true);
    expect(pickable(html)).toBe(0);
  });

  it('does not hide a dialog the engine put up behind it', () => {
    const { store, draw } = room();
    fillBoard(store);
    // A choice box while the board is still on screen — 五谷丰登 resolving into
    // a skill that asks something. Returning the board as the room's only
    // dialog swallowed this outright, and the seat saw a board it had already
    // answered while the engine waited for a choice it was never shown.
    store.applyNotify('AskForChoice', [['yes', 'no'], ['yes', 'no'], 'test_skill', '#test-prompt']);

    const html = draw();
    expect(board(html)).toBe(true);
    expect(html).toContain('#test-prompt');
    // The choice really is the modal one: it is the question, the board is not.
    expect(covered(html)).toBe(true);
  });
});
