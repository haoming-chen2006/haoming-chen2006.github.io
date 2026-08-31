/**
 * Answering a dialog-shaped request: once, and only once.
 *
 * Nothing else takes a dialog down. A dialog reply never comes back through the
 * notify stream — the client VM puts it straight on the wire — so the room has
 * to close its own question, which is what `RoomLogic.js:141-142` does: reply,
 * then `notactive`.
 *
 * The guard is the part that had to be added. 70 of 270 replies in an audited
 * run went out twice, identical payload, inside the same millisecond, and every
 * one of them was an `AskForAG`: the amazing-grace slot wired a click handler on
 * the slot *and* on the card inside it, so one click bubbled through both. A
 * second reply is not a harmless repeat. `waitForReply` pops whatever is queued
 * for that connection (`lua/web/fkhost.lua`), so a copy that outlives its
 * question becomes the answer to the seat's *next* one — a card id answering a
 * "do you want to nullify", with nobody at the table able to see why.
 *
 * `hostRunner.submit` already refuses a reply from a seat with no open
 * question, but that is the wrong place to catch this and it does not catch it:
 * both copies leave in the same click, while the request is still open, so both
 * are forwarded. The room knows first, and the room's own record of the open
 * request — cleared here, by `CancelRequest`, and by `GameOver` — is the same
 * bit `AG.qml:41` drops before it calls `replyToServer`.
 *
 * Written as a factory rather than inline in `RoomView` so it can be tested for
 * what it promises: two clicks, one answer.
 */
import type { LtkLua } from '../ltk/LtkLua';
import type { RoomStore } from '../state/store';

export function makeReply(store: RoomStore, lua: LtkLua): (value: unknown) => void {
  return (value: unknown): void => {
    // Read the store rather than a rendered snapshot: the second click of a
    // double is dispatched from the same event, before React has re-rendered
    // anything, so a snapshot would still say the question is open.
    if (store.state.request.kind === 'none') return;
    lua.replyToServer(value);
    store.outbound.push({ command: 'reply', payload: value });
    store.closeRequest();
    // `Room.qml`'s transition to `notactive` ends with `Ltk.finishRequestUI()`.
    // Without it the client VM keeps the answered handler as
    // `current_request_handler`, and any later `UpdateRequestUI` runs
    // `doOKButton` on it again and sends the host one more reply.
    try { lua.finishRequestUI(); } catch { /* engine gone */ }
    store.commit();
  };
}
