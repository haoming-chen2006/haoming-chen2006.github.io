/**
 * One question, one answer.
 *
 * An audited run sent 70 of its 270 replies twice — identical payload, inside
 * the same millisecond — and every one of them was an `AskForAG`. The cause was
 * two click handlers on one amazing-grace slot, but the reason it mattered is
 * further downstream: `waitForReply` pops whatever is queued for a connection
 * (`lua/web/fkhost.lua`), so a copy that outlives its question is not discarded,
 * it becomes the answer to that seat's *next* one.
 *
 * `hostRunner.submit` refuses a reply from a seat with no open question, and
 * that guard does not help here: both copies leave inside the same click, while
 * the request is still open, so both are forwarded and both are queued. The
 * room is the first place that knows the question is over, which is why the
 * check belongs here — and why it is checked here.
 */
import { describe, expect, it } from 'vitest';
import type { LtkLua } from '../../ltk/LtkLua';
import { RoomStore } from '../../state/store';
import { makeReply } from '../reply';

function seat() {
  const sent: unknown[] = [];
  const finished: number[] = [];
  const lua = {
    replyToServer: (v: unknown) => { sent.push(v); },
    finishRequestUI: () => { finished.push(1); },
  } as unknown as LtkLua;
  const store = new RoomStore(1);
  return { store, lua, sent, finished, reply: makeReply(store, lua) };
}

/** The wire, as an amazing-grace board reaches one seat. */
function agBoard(store: RoomStore): void {
  store.applyNotify('FillAG', [[11, 12, 13], []]);
  store.applyNotify('AskForAG', [[11, 12, 13], false, 'amazing_grace_skill']);
}

describe('answering a dialog', () => {
  it('sends the answer once, however many handlers the click ran through', () => {
    const s = seat();
    agBoard(s.store);

    // Two calls in a row is exactly what one click on a slot used to produce:
    // the card's handler and then the slot's, in the same event dispatch,
    // before React has re-rendered anything.
    s.reply(12);
    s.reply(12);

    expect(s.sent).toEqual([12]);
    expect(s.store.outbound.filter((o) => o.command === 'reply')).toHaveLength(1);
  });

  it('closes the question it answered', () => {
    const s = seat();
    agBoard(s.store);
    expect(s.store.state.request.kind).toBe('dialog');

    s.reply(12);

    expect(s.store.state.request.kind).toBe('none');
    // `Room.qml`'s `notactive` transition ends with `Ltk.finishRequestUI()`;
    // without it the client VM keeps the answered handler live.
    expect(s.finished).toHaveLength(1);
  });

  it('sends nothing at all when there is no question open', () => {
    const s = seat();
    // A click already in flight when the engine gave up on this seat, or a
    // stray one on a board that is only showing who took what. Neither has a
    // question to answer, and forwarding either poisons the next one.
    s.store.applyNotify('CancelRequest', undefined);

    s.reply(12);

    expect(s.sent).toEqual([]);
    expect(s.store.outbound).toHaveLength(0);
  });

  it('answers the next question normally after the first was doubled', () => {
    const s = seat();
    agBoard(s.store);
    s.reply(12);
    s.reply(12);

    // The nullification the engine asks next, for the next target of the same
    // 五谷丰登. A leftover copy of the AG answer is what would have answered
    // this one instead.
    s.store.applyNotify('AskForChoice', [['yes', 'no'], ['yes', 'no'], 'sk', '#p']);
    s.reply('yes');

    expect(s.sent).toEqual([12, 'yes']);
  });
});
