/**
 * Nothing a seat was sent may be thrown away on the way in.
 *
 * `liveTable` keeps a set of the envelopes it has already applied, because the
 * public topic and a seat's private topic are independent and a flush the
 * resync snapshot already contains can still turn up afterwards. Applying that
 * twice would move the same cards twice, so the set is not optional.
 *
 * Its key used to be `batch:to`, which is a claim: that one flush produces at
 * most one envelope per recipient. `engine/routing.ts` stopped working that way
 * when it started splitting at public/private transitions — it emits a *run* of
 * public messages as one envelope and the private run after it as another, in
 * the engine's own order, so that a seat cannot be told `ArrangeSeats` before it
 * knows who is sitting where. A batch that alternates therefore has two
 * envelopes with the same `(batch, to)`, and the second was dropped.
 *
 * Runs alternate rarely, which is why this survived: measured below, a full
 * 8-seat bot game and a two-human game without luck cards lose nothing at all.
 * 手气卡 is what makes it common — the redraw loop runs inside one resume and
 * alternates private hand / public pile per seat, many times per batch.
 *
 * So the check is the property rather than the key: replay a real game's routed
 * output through the real dedupe and compare, seat by seat, against the stream
 * the engine actually addressed to that seat. Anything missing is a message a
 * player was told and never saw.
 */
import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol';
import { MainThreadLuaClient } from '../../engine/luaClient';
import { InProcessLuaHost, allBotSeats } from '../../engine/luaHost';
import { RoomSession } from '../../engine/roomSession';
import { PlayerState } from '../../engine/types';
import { bundle, SEED, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support';
import { routeFlush } from '../../engine/routing';
import type { AddressedMessage } from '../../engine/types';
import { envelopeKey } from '../liveTable';

const LONG = 600_000;
const HUMANS = [1, 2] as const;

/** `UpdateRequestUI` accumulator — enough to press what the scene enabled. */
class Scene {
  items = new Map<string, Map<string, { enabled?: boolean; selected?: boolean }>>();
  apply(data: unknown): void {
    const d = data as Record<string, unknown>;
    for (const [t, list] of Object.entries(d)) {
      if (!Array.isArray(list)) continue;
      let b = this.items.get(t);
      if (!b) { b = new Map(); this.items.set(t, b); }
      for (const raw of list as Record<string, unknown>[]) {
        const id = String(raw.id);
        b.set(id, { ...(b.get(id) ?? {}), ...raw });
      }
    }
  }
  reset(): void { this.items.clear(); }
  enabled(t: string): string[] {
    return [...(this.items.get(t) ?? new Map()).entries()]
      .filter(([, v]) => v.enabled && !v.selected).map(([k]) => k);
  }
  isEnabled(t: string, id: string): boolean {
    return this.items.get(t)?.get(id)?.enabled === true;
  }
}

const SCENE_REQUESTS = new Set([
  'PlayCard', 'AskForUseCard', 'AskForResponseCard', 'AskForUseActiveSkill',
]);

/**
 * What a seat would end up applying, given the dedupe the room really uses.
 * Returns the commands it dropped — the messages the engine addressed to it and
 * the table never rendered.
 */
function lostBy(session: RoomSession, connId: number): string[] {
  const applied = new Set<string>();
  const got: string[] = [];
  for (const e of session.allEnvelopes) {
    if (e.to !== null && e.to !== connId) continue;
    const key = envelopeKey(e);
    if (applied.has(key)) continue;
    applied.add(key);
    for (const m of e.messages) got.push(m.command);
  }
  const want = session.streamOf(connId).map((m) => m.command);
  const lost: string[] = [];
  let i = 0;
  for (const command of want) {
    if (got[i] === command) i += 1;
    else lost.push(command);
  }
  return lost;
}

/** Play the opening of a room with two people in it, answering what is offered. */
async function playOpening(luckTime: number): Promise<RoomSession> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const clients = await Promise.all(HUMANS.map((s) =>
    MainThreadLuaClient.create(bundle(), { playerId: s, screenName: `p${s}` })));
  const scenes = HUMANS.map(() => new Scene());
  const pending: (null | { command: string; data: unknown })[] = HUMANS.map(() => null);

  clients.forEach((c, i) => c.onNotifyUI((cmd, data) => {
    if (cmd === 'UpdateRequestUI') scenes[i].apply(data);
    else if (cmd === 'CancelRequest') { pending[i] = null; scenes[i].reset(); }
    else if (cmd === 'ReplyToServer') pending[i] = null;
    else if (cmd === 'PlayCard' || String(cmd).startsWith('AskFor')) {
      pending[i] = { command: String(cmd), data };
    }
  }));

  const seats = allBotSeats(8).map((s) =>
    (HUMANS.includes(s.playerId as 1 | 2) ? { ...s, state: PlayerState.Online as 1 } : s));
  const session = await RoomSession.start(host, {
    roomId: `envkey-${luckTime}`, seed: SEED, seats, ownerId: 1, timeout: 15,
    settings: { gameMode: 'aaa_role_mode', luckTime, ...STANDARD_ROSTER_ONLY },
  }, {
    onEnvelope: (e: Envelope) => {
      HUMANS.forEach((s, i) => { if (e.to === null || e.to === s) clients[i].deliverEnvelope(e); });
    },
  });

  for (let step = 0; step < 400; step += 1) {
    const res = await session.advance();
    if (res.over || res.err) break;
    let answered = false;
    for (const [i, p] of pending.entries()) {
      if (!p) continue;
      pending[i] = null;
      const c = clients[i];
      const sc = scenes[i];
      if (!SCENE_REQUESTS.has(p.command)) {
        if (p.command === 'AskForGeneral') {
          const [generals, n] = p.data as [string[], number];
          c.replyToServer('AskForGeneral', generals.slice(0, n ?? 1));
        } else if (p.command === 'AskForSkillInvoke'
          && (p.data as [string?])[0] === 'AskForLuckCard') {
          // "Yes" — `ReqInvoke:doOKButton`'s own payload — which for 手气卡
          // means "throw this hand back and deal me another".
          c.replyToServer('ReplyToServer', '1');
        } else {
          // Declining is always a legal human answer; the engine substitutes
          // the request's own default, exactly as a timeout would.
          c.replyToServer('ReplyToServer', '');
        }
      } else if (sc.isEnabled('Button', 'OK')) {
        c.interact({ elemType: 'Button', id: 'OK', action: 'click' });
      } else {
        // Click what the scene enabled, the way a person would — a card, then a
        // target, then OK. The test never decides what is legal.
        const card = sc.enabled('CardItem')[0];
        let sent = false;
        if (card !== undefined) {
          c.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: true } });
          if (sc.isEnabled('Button', 'OK')) {
            c.interact({ elemType: 'Button', id: 'OK', action: 'click' });
            sent = true;
          } else {
            const target = sc.enabled('Photo')[0];
            if (target !== undefined) {
              c.interact({ elemType: 'Photo', id: Number(target), action: 'click', data: { selected: true } });
              if (sc.isEnabled('Button', 'OK')) {
                c.interact({ elemType: 'Button', id: 'OK', action: 'click' });
                sent = true;
              }
            }
          }
        }
        if (!sent && sc.isEnabled('Button', 'End')) {
          c.interact({ elemType: 'Button', id: 'End', action: 'click' });
        } else if (!sent) {
          c.interact({ elemType: 'Button', id: 'Cancel', action: 'click' });
        }
      }
      for (const o of c.drainOutbound()) {
        if (o.kind === 'reply') await host.pushReplyRaw(HUMANS[i], o.payload);
      }
      answered = true;
    }
    if (!answered && res.stopped === 'input') break;
  }

  host.dispose();
  for (const c of clients) c.dispose();
  return session;
}

describe('the envelopes a seat applies', () => {
  /**
   * The regression, on the router itself, so it can never go vacuous.
   *
   * Three messages in one batch — public, private to seat 1, public — is the
   * alternation `routeOneBatch` exists to preserve, and it produces two
   * envelopes addressed to `null`. Under `batch:to` the second is
   * indistinguishable from the first and seat 1 never sees `UpdateDrawPile`.
   */
  it('keeps both halves of a batch that alternates public and private', () => {
    const messages: AddressedMessage[] = [
      msg(1, 1, 'MoveCards'), msg(1, 2, 'MoveCards'),   // identical for both -> public
      msg(2, 1, 'MoveCards', 'private-to-1'),           // only seat 1 -> private
      msg(3, 1, 'UpdateDrawPile'), msg(3, 2, 'UpdateDrawPile'), // public again
    ];
    const [flush] = routeFlush(messages, [1, 2], 'r');
    const envelopes = flush.envelopes as unknown as Envelope[];

    // The premise, asserted rather than assumed: one batch, two envelopes for
    // the same recipient.
    const naive = envelopes.filter((e) => e.to === null).map((e) => `${e.batch}:all`);
    expect(naive).toHaveLength(2);
    expect(new Set(naive).size).toBe(1);

    // And the key the room dedupes on tells them apart.
    expect(new Set(envelopes.map(envelopeKey)).size).toBe(envelopes.length);

    const applied = new Set<string>();
    const seen: string[] = [];
    for (const e of envelopes) {
      if (e.to !== null && e.to !== 1) continue;
      const key = envelopeKey(e);
      if (applied.has(key)) continue;
      applied.add(key);
      for (const m of e.messages) seen.push(m.command);
    }
    expect(seen).toEqual(['MoveCards', 'MoveCards', 'UpdateDrawPile']);
  });

  /**
   * And the same property over a real game with two people in it and 手气卡
   * on, which is the arrangement that made the router alternate often enough
   * for anyone to notice: every message the engine addressed to a seat has to
   * survive the dedupe.
   */
  it('loses nothing a real game addressed to a seat, luck cards on', async () => {
    const session = await playOpening(5);
    for (const seat of HUMANS) {
      expect(lostBy(session, seat), `seat ${seat}`).toEqual([]);
    }
  }, LONG);

  it('loses nothing in a room with no luck cards either', async () => {
    const session = await playOpening(0);
    for (const seat of HUMANS) {
      expect(lostBy(session, seat), `seat ${seat}`).toEqual([]);
    }
  }, LONG);
});

/** One addressed message, as `routeFlush` takes them. */
function msg(seq: number, connId: number, command: string, tag = ''): AddressedMessage {
  const payload = `${command}${tag}`;
  return {
    batch: 1, seq, connId, kind: 'notify', command, payload, bytes: payload.length,
  } as AddressedMessage;
}
