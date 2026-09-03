/**
 * 再来一局 — dealing the same table another game.
 *
 * A rematch is not a new room. The seats, the bots, the names, the settings and
 * the join code all stay exactly where they are; what changes is which *game*
 * of the room everybody is playing, and that is one number — `ROUND_KEY`, in
 * the settings every seat is already subscribed to.
 *
 * Three things hang off that number and all three have to be right or "again"
 * is worse than nothing:
 *
 *  * THE DEAL. The room's stored seed does not move, so a second game dealt
 *    from it is the first game again — identical hands, identical order,
 *    everyone already knowing everyone's cards. `gameSeed` mixes the round in.
 *  * THE WIRE. Two games of one room would otherwise ride one Realtime topic,
 *    and an envelope still in flight from the game that just ended carries the
 *    same `roomId` as the one that just started. Nothing downstream could tell
 *    them apart.
 *  * THE GUEST. The bump has to reach every tab, not just the host's. That half
 *    lives in `src/net/__tests__/backplane.test.ts`, against the real database
 *    and a second client's own subscription, because it is the half a
 *    one-human test cannot see.
 *
 * What this file cannot reach is `RoomPage`'s effects — this repo has no DOM
 * for React to render into and no test has ever run one. The browser walk is
 * what covers that.
 */
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../contract/manifest';
import type { Envelope } from '../../contract/protocol';
import { MainThreadLuaClient } from '../../engine/luaClient';
import { InProcessLuaHost } from '../../engine/luaHost';
import { bundle, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support';
import { Assets } from '../../room/assets/assets';
import { DialogHost } from '../../room/dialogs/DialogHost';
import { LtkLua } from '../../room/ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../room/RoomContext';
import { RoomStore } from '../../room/state/store';
import { createRoomTransport } from '../../net/transport';
import { createLocalApi } from '../api/local';
import { ROUND_KEY, roundOf } from '../api/types';
import { loopbackTransport } from '../api/transport';
import { gameSeed, startHostRunner, type HostSeat } from '../hostRunner';
import { retainNotifications } from '../retainingClient';

const LONG = 300_000;
const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/* ------------------------------------------------------------------ the deal */

describe('the seed a rematch is dealt from', () => {
  it('leaves the first game of a room exactly as it was', () => {
    // Round 0 must be the stored seed untouched, or every game this build has
    // ever dealt — and every recorded log replayed against it — moves.
    for (const seed of [1, 20260828, 2147483646]) {
      expect(gameSeed(seed, 0)).toBe(seed);
      expect(gameSeed(seed, -1)).toBe(seed);
    }
  });

  it('gives every later game of the same room its own deal', () => {
    const seed = 20260828;
    const seeds = Array.from({ length: 9 }, (_, r) => gameSeed(seed, r));
    expect(new Set(seeds).size).toBe(seeds.length);
    for (const s of seeds) {
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      // `math.randomseed` gets this (`lua/web/host.lua`), and the stored seeds
      // are 31-bit; a seed outside that range is a seed the engine cannot use.
      expect(s).toBeLessThan(2147483647);
    }
  });

  it('is a name for a deal, not a coin flip', () => {
    // Deterministic, so a logged game stays replayable from `(room, round)`
    // alone. A random reroll would make the second game of a room reproducible
    // from nothing.
    expect(gameSeed(20260828, 3)).toBe(gameSeed(20260828, 3));
    expect(gameSeed(20260828, 3)).not.toBe(gameSeed(20260829, 3));
  });
});

/* ------------------------------------------------------------------ the wire */

/** Just enough Supabase to see which topics a transport joins. */
function channelSpy() {
  const joined: string[] = [];
  const sb = {
    channel(name: string) {
      joined.push(name);
      const ch = {
        subscribe(cb?: (s: string) => void) { cb?.('SUBSCRIBED'); return ch; },
        on() { return ch; },
        send: async () => {},
        unsubscribe: async () => {},
      };
      return ch;
    },
    removeChannel: async () => {},
  };
  return { sb: sb as never, joined };
}

describe('two games of one room never share a topic', () => {
  it('puts the first game on the bare room id, byte for byte as before', async () => {
    const { sb, joined } = channelSpy();
    const tx = createRoomTransport('room-1', sb, 0);
    await tx.ready([2]);
    expect(joined).toEqual(['room:room-1', 'room:room-1:p:2']);
  });

  it('suffixes every later game with its round', async () => {
    const { sb, joined } = channelSpy();
    const tx = createRoomTransport('room-1', sb, 2);
    await tx.ready([2]);
    expect(joined).toEqual(['room:room-1#2', 'room:room-1#2:p:2']);
    // The database keys stay the room, not the game: RLS, the seed and the
    // command log all hang off the uuid.
    expect(joined.every((n) => n.includes('room-1'))).toBe(true);
  });
});

/* --------------------------------------------------------------- the backplane */

describe('the local backplane', () => {
  /**
   * The local API is what a reviewer with no Supabase credentials plays on, and
   * what two tabs on one machine talk through. A rematch has to work there too.
   */
  function api() {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    });
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.stubGlobal('addEventListener', () => {});
    vi.stubGlobal('window', { addEventListener: () => {} });
    return createLocalApi();
  }

  it('keeps every seat and bumps the round', async () => {
    const a = api();
    await a.signIn('房主', 'caocao');
    const room = await a.createRoom({
      name: '房', capacity: 8, bundleSha: 'sha',
      settings: { gameMode: 'aaa_role_mode', generalTimeout: 30, luckTime: 5 },
    });
    await a.addBot(room.summary.id, 2);
    await a.startGame(room.summary.id);

    const before = (await a.getRoom(room.summary.id))!;
    expect(roundOf(before.summary.settings)).toBe(0);

    await a.playAgain(room.summary.id);
    const after = (await a.getRoom(room.summary.id))!;

    expect(roundOf(after.summary.settings)).toBe(1);
    expect(after.summary.status).toBe('playing');
    // Nobody rejoined and nobody re-added a bot. That is the feature.
    expect(after.members.map((m) => m.seat)).toEqual([1, 2]);
    expect(after.members.map((m) => m.isBot)).toEqual([false, true]);
    // A patch: the settings the room was created with are still there.
    expect(after.summary.settings.gameMode).toBe('aaa_role_mode');
    expect(after.summary.settings.luckTime).toBe(5);

    await a.playAgain(room.summary.id);
    expect(roundOf((await a.getRoom(room.summary.id))!.summary.settings)).toBe(2);
  });

  it('pushes the bump to everything watching the room', async () => {
    const a = api();
    await a.signIn('房主', 'caocao');
    const room = await a.createRoom({
      name: '房', capacity: 8, bundleSha: 'sha', settings: { gameMode: 'aaa_role_mode' },
    });
    const seen: number[] = [];
    const off = a.watchRoom(room.summary.id, (d) => {
      if (d) seen.push(roundOf(d.summary.settings));
    });
    await a.playAgain(room.summary.id);
    off();
    // A watcher that never hears about the bump is a tab left in a dead game.
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
  });

  it('reads a room that has never had a rematch as round zero', () => {
    expect(roundOf(undefined)).toBe(0);
    expect(roundOf({})).toBe(0);
    expect(roundOf({ [ROUND_KEY]: 'nonsense' })).toBe(0);
    expect(roundOf({ [ROUND_KEY]: 3 })).toBe(3);
  });
});

/* -------------------------------------------------------- a second real game */

const SEATS: HostSeat[] = [
  { seat: 1, displayName: '房主', avatar: 'caocao', isBot: false, connection: 'online' },
  { seat: 2, displayName: '客人', avatar: 'liubei', isBot: false, connection: 'online' },
  ...Array.from({ length: 6 }, (_, i) => ({
    seat: i + 3,
    displayName: `机器人 ${i + 3}`,
    avatar: 'guojia',
    isBot: true,
    connection: 'online' as const,
  })),
];

interface Dealt {
  /** Seat 1's opening hand, and seat 2's — the guest's. */
  hands: Record<number, number[]>;
  /** Which seats were actually asked to choose a character. */
  asked: number[];
}

/**
 * Play one game of a room far enough to see what everybody was dealt, through
 * the shell's own driver and two real human seats.
 *
 * `roomId` and `round` are what a rematch changes and nothing else does, so
 * calling this twice with the same room and a different round is exactly what
 * pressing the button does.
 */
async function dealOnce(roomId: string, round: number): Promise<Dealt> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const vms = await Promise.all([1, 2].map((seat) =>
    MainThreadLuaClient.create(bundle(), { playerId: seat, screenName: `p${seat}` })));
  const clients = vms.map(retainNotifications);
  const pending: (null | { command: string; data: unknown })[] = [null, null];
  const asked = new Set<number>();

  const hands: Record<number, number[]> = {};
  clients.forEach((c, i) => {
    c.onNotifyUI((command, data) => {
      if (command === 'CancelRequest' || command === 'ReplyToServer') pending[i] = null;
      else if (String(command).startsWith('AskFor')) {
        if (command === 'AskForGeneral') asked.add(i + 1);
        pending[i] = { command: String(command), data };
      }
      /*
       * THE OPENING HAND, caught as it lands.
       *
       * Sampled on the notify rather than on the polling loop's tick: a hand is
       * spent, and by the time a 20 ms tick looks the seat may already have
       * drawn its turn-one two and be holding six. `DrawInitial` deals exactly
       * four in one `MoveCards`, so the first moment this seat holds four is
       * the deal and nothing else.
       */
      const seat = i + 1;
      if (hands[seat]) return;
      const h = c.call<number[]>('GetPlayerHandcards', seat);
      /*
       * The first hand this seat is ever observed holding.
       *
       * Deliberately not "the four cards `DrawInitial` dealt": whether the
       * viewer's VM has been told who it is by the time the deal lands varies,
       * so the first non-empty reading is sometimes the deal and sometimes the
       * deal plus that seat's first draw. Both are a pure function of the seed,
       * which is the only thing the round is being asked to change, and pinning
       * a card count here would be pinning a delivery race instead.
       */
      if (h.length > 0) hands[seat] = h;
    });
  });

  // ONE transport, shared. Seat 1 is the host and is fed in-process; seat 2 is
  // the "guest" and hears the game only through what the runner publishes,
  // which is the arrangement a second machine is in.
  const transport = loopbackTransport(roomId);
  const off = transport.onEnvelope(2, (e) => clients[1].deliverEnvelope(e));

  const runner = await startHostRunner({
    roomId,
    seats: SEATS,
    hostSeat: 1,
    round,
    settings: {
      gameMode: 'aaa_role_mode', generalNum: 3, generalTimeout: 30, luckTime: 0,
      ...STANDARD_ROSTER_ONLY,
    },
    transport,
    createHost: async () => host,
    onLocalEnvelope: (e: Envelope) => clients[0].deliverEnvelope(e),
    onFault: (m, fatal) => { if (fatal) throw new Error(m); },
  });

  const luas = clients.map((c) => new LtkLua(c));
  clients.forEach((c, i) => c.onReply((_cmd, reply) => runner.submit(i + 1, reply)));

  for (let i = 0; i < 200 && Object.keys(hands).length < 2; i++) {
    for (const [idx, p] of pending.entries()) {
      if (p?.command === 'AskForGeneral') {
        const [generals, n] = p.data as [string[], number];
        pending[idx] = null;
        luas[idx].replyToServer(generals.slice(0, n ?? 1));
      }
    }
    await new Promise((r) => setTimeout(r, 20));
  }

  off();
  runner.stop();
  for (const c of clients) c.dispose();
  host.dispose();
  return { hands, asked: [...asked].sort() };
}

describe('a rematch is a different game', () => {
  /**
   * The assertion the whole seed argument exists for. Same room, same seats,
   * same settings, one round apart — and a different hand, for both a host and
   * a guest. Without the round in the seed these two are the same four cards.
   */
  it('deals different cards to the same room the second time', async () => {
    const first = await dealOnce('rematch-room', 0);
    const second = await dealOnce('rematch-room', 1);

    for (const [label, d] of [['first', first], ['second', second]] as const) {
      expect(d.hands[1], `${label} game, host`).toBeTruthy();
      expect(d.hands[2], `${label} game, guest`).toBeTruthy();
      expect(d.hands[1].length, `${label} game, host`).toBeGreaterThan(0);
      expect(d.hands[2].length, `${label} game, guest`).toBeGreaterThan(0);
    }

    expect(second.hands[1]).not.toEqual(first.hands[1]);
    expect(second.hands[2]).not.toEqual(first.hands[2]);

    // And the guest is a player in it, not a spectator of somebody else's
    // second game: it was asked to choose a character, same as the host.
    expect(second.asked).toEqual([1, 2]);
  }, LONG);

  it('deals the same room the same game when the round has not moved', async () => {
    // The negative control. A rematch changes the deal because the ROUND
    // changed, not because two runs of the engine differ.
    const a = await dealOnce('stable-room', 0);
    const b = await dealOnce('stable-room', 0);
    // Not vacuous: two missing results would also be equal.
    expect(a.hands[1]?.length).toBeGreaterThan(0);
    expect(a.hands[2]?.length).toBeGreaterThan(0);
    expect(b.hands[1]).toEqual(a.hands[1]);
    expect(b.hands[2]).toEqual(a.hands[2]);
  }, LONG);
});

/* ---------------------------------------------------------------- the button */

function gameOverHtml(over: { onPlayAgain?: () => void; onLeave?: () => void }): string {
  const store = new RoomStore(1);
  store.applyNotify('GameOver', 'lord+loyalist');
  store.commit();
  const services: RoomServices = {
    store,
    lua: { tr: (k: string) => k } as unknown as LtkLua,
    assets: new Assets(EMPTY_MANIFEST),
    mode: 'play',
    meId: 1,
    naming: makeNaming(store),
  };
  return renderToStaticMarkup(
    <RoomProvider value={services}>
      <DialogHost onReply={() => {}} interactive={false} {...over} />
    </RoomProvider>,
  );
}

describe('the results box', () => {
  it('offers the host another game and everyone the way out', () => {
    const html = gameOverHtml({ onPlayAgain: () => {}, onLeave: () => {} });
    expect(html).toContain('Continue Game');
    expect(html).toContain('Back To Lobby');
  });

  it('gives a guest no button that would start a game for seven other people', () => {
    // Host-only actions arrive undefined for everybody else — hide, do not
    // disable, which is this app's rule everywhere else too.
    const html = gameOverHtml({ onLeave: () => {} });
    expect(html).not.toContain('Continue Game');
    expect(html).toContain('Back To Lobby');
  });
});
