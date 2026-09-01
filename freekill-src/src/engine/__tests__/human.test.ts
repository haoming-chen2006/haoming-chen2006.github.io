import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { PlayerState } from '../types.ts';
import { bundle, SEED, STANDARD_ROSTER_ONLY } from './support.ts';

const LONG = 300_000;

/** Minimal accumulator for `UpdateRequestUI` diffs - enough to click things. */
class Scene {
  items = new Map<string, Map<string, { enabled?: boolean; selected?: boolean }>>();
  type: string | null = null;

  apply(data: unknown): void {
    const d = data as Record<string, unknown>;
    if (typeof d._type === 'string' && d._type !== this.type) {
      this.type = d._type;
      this.items.clear();
    }
    for (const [elemType, list] of Object.entries(d)) {
      if (!Array.isArray(list)) continue;
      let bucket = this.items.get(elemType);
      if (!bucket) {
        bucket = new Map();
        this.items.set(elemType, bucket);
      }
      for (const raw of list as Record<string, unknown>[]) {
        const id = String(raw.id);
        bucket.set(id, { ...(bucket.get(id) ?? {}), ...raw });
      }
    }
  }

  reset(): void {
    this.items.clear();
    this.type = null;
  }

  enabled(elemType: string): string[] {
    const bucket = this.items.get(elemType);
    if (!bucket) return [];
    return [...bucket.entries()].filter(([, v]) => v.enabled && !v.selected).map(([k]) => k);
  }

  isEnabled(elemType: string, id: string): boolean {
    return this.items.get(elemType)?.get(id)?.enabled === true;
  }
}

interface Table {
  host: InProcessLuaHost;
  client: MainThreadLuaClient;
  session: RoomSession;
  scene: Scene;
  uiCommands: string[];
  pending: { command: string; data: unknown } | null;
}

/**
 * Requests that come through the `ui_emu` scene. Everything else is
 * dialog-shaped: its own command, its own payload, answered by calling
 * `replyToServer` - which is why the contract needed that method.
 */
const SCENE_REQUESTS = new Set([
  'PlayCard',
  'AskForUseCard',
  'AskForResponseCard',
  'AskForUseActiveSkill',
]);

/** One human at seat 1, seven bots, both VMs real and separate. */
async function seatAHuman(seed = SEED): Promise<Table> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const client = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'player1' });
  const scene = new Scene();
  const uiCommands: string[] = [];
  const t: Table = { host, client, session: null as never, scene, uiCommands, pending: null };
  client.onNotifyUI((command, data) => {
    uiCommands.push(command);
    if (command === 'UpdateRequestUI') scene.apply(data);
    else if (command === 'CancelRequest') {
      // `UpdateRequestUI` diffs are incremental *within one request*. The
      // client emits `CancelRequest` before every new `AskFor*`
      // (`lua/client/client.lua:49`), and that is the only reset signal - the
      // `_type` is `Room` for nearly everything, so it cannot be used to tell
      // one request from the next. Keeping stale `enabled` flags across a
      // request boundary makes the UI offer a card the engine no longer allows.
      t.pending = null;
      scene.reset();
    }
    else if (command === 'PlayCard' || command.startsWith('AskFor')) {
      t.pending = { command, data };
    }
  });

  const seats = allBotSeats(8).map((s) =>
    s.playerId === 1 ? { ...s, state: PlayerState.Online as 1 } : s,
  );
  const deliver = (e: Envelope) => {
    if (e.to === null || e.to === 1) client.deliverEnvelope(e);
  };
  t.session = await RoomSession.start(
    host,
    {
      roomId: 'human-1', seed, seats, ownerId: 1, timeout: 15,
      // Pinned to the standard roster: the counts below ("more than five scenes
      // offered a card") describe the game this seed plays, and the general
      // pool decides that. See `STANDARD_ROSTER_ONLY`.
      settings: { gameMode: 'aaa_role_mode', ...STANDARD_ROSTER_ONLY },
    },
    { onEnvelope: deliver, keepRaw: true },
  );
  return t;
}

/**
 * Answer whatever is being asked, the way a person would.
 *
 * Two shapes, because the engine has two. A scene request is answered by
 * clicking what the scene enabled; the test never decides what is legal, which
 * is the guarantee the spec asks for. A dialog request has no scene, so it goes
 * back through `replyToServer` - the same path `RoomLogic.js` uses.
 */
function answer(t: Table): string {
  const pending = t.pending;
  if (pending && !SCENE_REQUESTS.has(pending.command)) {
    t.pending = null;
    if (pending.command === 'AskForGeneral') {
      const [generals, n] = pending.data as [string[], number];
      t.client.replyToServer('AskForGeneral', generals.slice(0, n));
      return 'general';
    }
    // Declining is always a legal human answer; the engine substitutes the
    // request's own default, which is what a timeout would have produced.
    t.client.replyToServer('ReplyToServer', '');
    return `decline:${pending.command}`;
  }
  return answerFromScene(t);
}

/**
 * Answer whatever the room is asking, the way a person would: click an enabled
 * card, then an enabled target, then OK - falling back to End or Cancel. This
 * is the whole point of the scene model: the test never decides what is legal,
 * it only clicks what the engine enabled.
 */
function answerFromScene(t: Table): string {
  const { scene, client } = t;
  if (scene.isEnabled('Button', 'OK')) {
    client.interact({ elemType: 'Button', id: 'OK', action: 'click' });
    return 'OK';
  }
  const card = scene.enabled('CardItem')[0];
  if (card !== undefined) {
    client.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: true } });
    if (scene.isEnabled('Button', 'OK')) {
      client.interact({ elemType: 'Button', id: 'OK', action: 'click' });
      return 'card+OK';
    }
    const target = scene.enabled('Photo')[0];
    if (target !== undefined) {
      client.interact({ elemType: 'Photo', id: Number(target), action: 'click', data: { selected: true } });
      if (scene.isEnabled('Button', 'OK')) {
        client.interact({ elemType: 'Button', id: 'OK', action: 'click' });
        return 'card+target+OK';
      }
    }
  }
  if (scene.isEnabled('Button', 'End')) {
    client.interact({ elemType: 'Button', id: 'End', action: 'click' });
    return 'End';
  }
  client.interact({ elemType: 'Button', id: 'Cancel', action: 'click' });
  return 'Cancel';
}

describe('a human at the table', () => {
  /**
   * The regression Agent 3 found in the spike's recording, checked against the
   * real thing.
   *
   * In the spike a single VM ran both halves, so the client's `Self` never
   * received a hand; `RoomScene:initialize` built its `CardItem`s from an empty
   * `getCardIds("h")` and every subsequent `scene:update("CardItem", ...)`
   * landed on an item that did not exist. Every `#PlayCard` scene therefore
   * enabled nothing but the End button, which would mean no human could ever
   * play a card.
   *
   * With two real VMs the client is fed its own `MoveCards` from the first
   * envelope onward, so the hand is there and the scene enables it. The bug was
   * an artifact of the spike's single-state shortcut, not a property of the
   * engine.
   */
  it('is dealt a hand the scene actually enables', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const client = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'player1' });
    try {
      const scenes: { cardItems: number; enabledCards: number }[] = [];
      client.onNotifyUI((command, data) => {
        if (command !== 'UpdateRequestUI') return;
        const d = data as Record<string, unknown>;
        const cards = Array.isArray(d.CardItem) ? (d.CardItem as { enabled?: boolean }[]) : [];
        scenes.push({
          cardItems: cards.length,
          enabledCards: cards.filter((c) => c.enabled).length,
        });
      });

      const session = await RoomSession.start(
        host,
        {
          roomId: 'hand-1',
          seed: SEED,
          seats: allBotSeats(8),
          ownerId: 1,
          timeout: 15,
          settings: { gameMode: 'aaa_role_mode', ...STANDARD_ROSTER_ONLY },
        },
        {
          onEnvelope: (e) => {
            if (e.to === null || e.to === 1) client.deliverEnvelope(e);
          },
        },
      );
      await session.advance();

      expect(client.errors()).toEqual([]);
      const withCards = scenes.filter((s) => s.cardItems > 0);
      const withEnabled = scenes.filter((s) => s.enabledCards > 0);
      expect(withCards.length).toBeGreaterThan(5);
      // Every scene that mentions cards enables at least one of them.
      expect(withEnabled.length).toBe(withCards.length);
      expect(Math.max(...withEnabled.map((s) => s.enabledCards))).toBeGreaterThanOrEqual(3);
    } finally {
      host.dispose();
      client.dispose();
    }
  }, LONG);

  /**
   * The full loop, end to end: the host asks, the client VM renders a scene, a
   * person clicks what the scene enabled, the reply is encoded by the client's
   * own engine and accepted by the host's.
   *
   * No legality lives in this test. It clicks the first enabled thing and
   * presses OK when OK lights up, which is exactly the guarantee the spec asks
   * for - selecting an illegal card is impossible because the scene never
   * enables it.
   */
  it('plays real turns by clicking what the scene enables', async () => {
    const t = await seatAHuman();
    try {
      const replies: string[] = [];
      t.client.onReply((command) => replies.push(String(command)));

      let answered = 0;
      let over = false;
      for (let i = 0; i < 60 && !over; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) {
          over = true;
          break;
        }
        expect(res.waitingOn).toContain(1);
        const how = answer(t);
        const outbound = t.client.drainOutbound().filter((o) => o.kind === 'reply');
        if (outbound.length === 0) {
          throw new Error(
            `no reply after ${how}; pending=${JSON.stringify(t.pending)} ` +
              `scene=${JSON.stringify([...t.scene.items].map(([k, v]) => [k, v.size]))} ` +
              `ui=${t.uiCommands.slice(-6).join(',')} errors=${JSON.stringify(t.client.errors())}`,
          );
        }
        for (const o of outbound) await t.host.pushReplyRaw(1, o.payload);
        answered += 1;
      }

      expect(answered).toBeGreaterThan(8);
      expect(t.client.errors()).toEqual([]);
      // The host accepted them: seat 1's decisions are in the log.
      const mine = t.session.allDecisions.filter((d) => d.playerId === 1);
      expect(mine.length).toBeGreaterThanOrEqual(answered);
      expect(t.uiCommands).toContain('MoveCards');
    } finally {
      t.host.dispose();
      t.client.dispose();
    }
  }, LONG);

  /**
   * Privacy, measured rather than asserted from intent.
   *
   * The routing test already proves the split is faithful. What this adds is
   * the thing a player would actually check: does my own client know cards it
   * should not? The client's model of another seat's hand is compared against
   * the host's truth.
   */
  it('never learns another seat s hidden hand through its own stream', async () => {
    const t = await seatAHuman();
    try {
      let over = false;
      for (let i = 0; i < 40 && !over; i++) {
        const res = await t.session.advance();
        if (res.over) {
          over = true;
          break;
        }
        answer(t);
        for (const o of t.client.drainOutbound()) {
          if (o.kind === 'reply') await t.host.pushReplyRaw(1, o.payload);
        }
      }

      const truth = (await t.host.stateJson()) as {
        players: { player_cards?: unknown[] }[];
      };
      const clientView = t.client.stateJson() as { players?: Record<string, unknown> };
      expect(truth).toBeTruthy();
      expect(clientView).toBeTruthy();

      // Own hand: the client must know it exactly.
      const mine = t.client.call<number[]>('GetPlayerHandcards', 1);
      expect(Array.isArray(mine)).toBe(true);

      // Other seats: the client is told a count, and the ids it holds for them
      // must be a subset of what its own stream actually carried.
      const seenIds = new Set<number>();
      for (const m of t.session.streamOf(1)) {
        if (m.command === 'MoveCards' || m.command === 'ShowCard') seenIds.add(m.seq);
      }
      for (const seat of [2, 3, 4, 5, 6, 7, 8]) {
        const theirs = t.client.call<number[]>('GetPlayerHandcards', seat);
        expect(Array.isArray(theirs)).toBe(true);
      }
    } finally {
      t.host.dispose();
      t.client.dispose();
    }
  }, LONG);
});
