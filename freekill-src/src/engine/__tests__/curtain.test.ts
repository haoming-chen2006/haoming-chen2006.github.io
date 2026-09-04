/**
 * When may the room lift the curtain off the table?
 *
 * The curtain is a full-viewport overlay and lifting it is a promise that
 * there is a game behind it. `liveTable` used to lift it on the first envelope
 * that carried any message at all. That held only while `routeFlush` emitted
 * one envelope per batch per recipient: whatever the first one was, the whole
 * opening came with it.
 *
 * Splitting envelopes at public/private transitions — which is what stopped an
 * all-human room being told to arrange seats before it knew who was playing —
 * broke that assumption, and broke it for the host alone:
 *
 *   - a guest never applies a live envelope first. It holds everything until
 *     its resync arrives, and that snapshot is `[...preamble, Observe]`, a
 *     whole table. Its curtain always lifted on something worth seeing.
 *   - the host has no resync (`liveTable`'s `resyncs` is false for it) and its
 *     envelopes are handed to it in-process one run at a time, so it applies
 *     the opening in pieces. The first piece can be a lone public `EnterRoom`.
 *
 * The player who pressed start then got a bare table with a half-built photo
 * on it and nothing to click, while everyone else played normally.
 *
 * This tests the routing shape the fix rests on, with no engine: given the
 * preamble the host emits for a room of people, does seating arrive later than
 * the first envelope? If it does, "any message" cannot be the signal.
 */
import { describe, expect, it } from 'vitest';
import { routeFlush } from '../routing.ts';
import type { AddressedMessage } from '../types.ts';
import type { WireCommand } from '../../contract/protocol.ts';
import { curtainLifts, CURTAIN_GRACE_MS } from '../../shell/liveTable.ts';

/** What `liveTable` now treats as "there is a table to look at". */
const rendersATable = (c: string): boolean => c === 'ArrangeSeats' || c === 'Observe';

/**
 * The join preamble, as the host emits it: `EnterRoom` and `RoomOwner` are the
 * same bytes for every seat, each `AddPlayer` is that seat's own, and
 * `ArrangeSeats` comes last so the seating exists before anyone is arranged.
 */
function preamble(members: readonly number[]): AddressedMessage[] {
  const out: AddressedMessage[] = [];
  let seq = 0;
  const push = (command: WireCommand, connId: number, payload: string) =>
    out.push({ seq: seq++, batch: 0, kind: 'notify', command, connId, payload, bytes: payload.length });

  for (const c of members) push('EnterRoom', c, '["room",8]');
  for (const c of members) push('RoomOwner', c, '[1]');
  // A seat is told about the *others*, never itself, so the recipient set for
  // any one `AddPlayer` is every member but one — which is what keeps it off
  // the public channel while `EnterRoom` goes on it.
  for (const c of members) {
    for (const who of members) if (who !== c) push('AddPlayer', c, `[${who},"p${who}"]`);
  }
  for (const c of members) push('ArrangeSeats', c, `[${members.join(',')}]`);
  return out;
}

const commandsOf = (e: { messages: readonly { command: string }[] }) =>
  e.messages.map((m) => m.command);

describe('the curtain over a table that is still being built', () => {
  it('would have lifted on an empty table in a room of people', () => {
    // Four people, which is what the user actually sits down to.
    const members = [1, 2, 3, 4];
    const [flush] = routeFlush(preamble(members), members, 'room');
    const envelopes = flush.envelopes;

    // The public/private split is real here: `EnterRoom` is identical for
    // everyone and travels once, `AddPlayer` is per-seat.
    expect(envelopes.length).toBeGreaterThan(1);
    expect(commandsOf(envelopes[0])).toContain('EnterRoom');

    // THE REGRESSION. The first envelope carries messages, so the old
    // `messages.length > 0` test fired — but there is no seating in it, so
    // there was nothing on screen behind the curtain it lifted.
    expect(envelopes[0].messages.length).toBeGreaterThan(0);
    expect(commandsOf(envelopes[0]).some(rendersATable)).toBe(false);

    // And seating really does arrive, later, so the new signal exists.
    const seatingAt = envelopes.findIndex((e) => commandsOf(e).some(rendersATable));
    expect(seatingAt).toBeGreaterThan(0);
  });

  it('lifts on the first envelope in a room of one person and seven robots', () => {
    // Robots are members but are sent nothing, so no message is byte-identical
    // for every member, nothing is recovered as public, and the whole preamble
    // travels as one private envelope. Old and new behave identically here —
    // which is exactly why every bot-only suite stayed green through the bug.
    const members = [1];
    const [flush] = routeFlush(preamble(members), members, 'room');
    expect(flush.envelopes).toHaveLength(1);
    expect(commandsOf(flush.envelopes[0]).some(rendersATable)).toBe(true);
  });
});

/**
 * THE 斗地主 TRAP. The first gate lifted on exactly two names, `ArrangeSeats`
 * and `Observe`. Three-player 斗地主 (`packages/webmodes`) overrides
 * `assignRoles` and `chooseGenerals`, so its opening is composed differently,
 * and the host — which has no resync and so never sees `Observe` — sat under
 * the curtain for an entire game with zero live controls while both guests
 * played. Reproduced with three real browsers on production: 150 seconds,
 * cards dealt, log advancing, host frozen.
 *
 * What every mode has in common is that it DEALS. So a dealing message must
 * lift the curtain, and a seat must never be trapped indefinitely whatever the
 * opening looks like.
 */
describe('what lifts the curtain', () => {
  it('lifts on a dealt hand, not only on the seating message', () => {
    expect(curtainLifts({ command: 'MoveCards' })).toBe(true);
    expect(curtainLifts({ command: 'StartGame' })).toBe(true);
  });
  it('still lifts on the messages the role game sends first', () => {
    expect(curtainLifts({ command: 'ArrangeSeats' })).toBe(true);
    expect(curtainLifts({ command: 'Observe' })).toBe(true);
  });
  it('does not lift on a bare room-entry message', () => {
    expect(curtainLifts({ command: 'EnterRoom' })).toBe(false);
    expect(curtainLifts({ command: 'RoomOwner' })).toBe(false);
  });
  it('frees a seat within a bounded time even if no dealing message is ever seen', () => {
    // A gate that can be wrong is a gate that can trap someone; the backstop
    // has to be short enough that a player would not give up and refresh.
    expect(CURTAIN_GRACE_MS).toBeGreaterThan(0);
    expect(CURTAIN_GRACE_MS).toBeLessThanOrEqual(10_000);
  });
});
