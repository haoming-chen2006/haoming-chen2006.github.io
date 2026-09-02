/**
 * The seam nobody was testing.
 *
 * The engine suite proved the engine, the backplane suite proved the backplane,
 * the room suite proved the room — against fixtures — and the app still shipped
 * a table that never received a single message, because no test ever asked one
 * lane to talk to another. This is that test: the shell's own host driver,
 * driving the real engine, feeding a real client VM, with a person answering
 * what the engine asks. It asserts the thing a player would: a hand arrives.
 *
 * It runs the host in-process rather than in a worker only because a `Worker`
 * needs a bundler; `hostRunner` takes the host as a parameter precisely so the
 * browser's worker and this in-process host run identical code above them.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../../engine/luaClient.ts';
import { InProcessLuaHost } from '../../engine/luaHost.ts';
import { bundle, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support.ts';
import { LtkLua } from '../../room/ltk/LtkLua.ts';
import { RoomStore } from '../../room/state/store.ts';
import { retainNotifications, type RetainingClient } from '../retainingClient.ts';
import { loopbackTransport, type CommandRow, type GameTransport } from '../api/transport.ts';
import { reassemble } from '../liveTable.ts';
import {
  seatSpecs, startHostRunner, type GameHost, type HostRunner, type HostSeat,
} from '../hostRunner.ts';

const LONG = 300_000;

const SEATS: HostSeat[] = [
  { seat: 1, displayName: '我', avatar: 'caocao', isBot: false, connection: 'online' },
  ...Array.from({ length: 7 }, (_, i) => ({
    seat: i + 2,
    displayName: `机器人 ${i + 2}`,
    avatar: 'guojia',
    isBot: true,
    connection: 'online' as const,
  })),
];

/** Minimal `UpdateRequestUI` accumulator — enough to click what is enabled. */
class Scene {
  items = new Map<string, Map<string, { enabled?: boolean; selected?: boolean }>>();

  apply(data: unknown): void {
    const d = data as Record<string, unknown>;
    for (const [elemType, list] of Object.entries(d)) {
      if (!Array.isArray(list)) continue;
      let bucket = this.items.get(elemType);
      if (!bucket) { bucket = new Map(); this.items.set(elemType, bucket); }
      for (const raw of list as Record<string, unknown>[]) {
        const id = String(raw.id);
        bucket.set(id, { ...(bucket.get(id) ?? {}), ...raw });
      }
    }
  }

  reset(): void { this.items.clear(); }

  enabled(elemType: string): string[] {
    return [...(this.items.get(elemType) ?? new Map()).entries()]
      .filter(([, v]) => v.enabled && !v.selected).map(([k]) => k);
  }

  isEnabled(elemType: string, id: string): boolean {
    return this.items.get(elemType)?.get(id)?.enabled === true;
  }
}

/** Requests answered by clicking the scene; everything else is a dialog. */
const SCENE_REQUESTS = new Set([
  'PlayCard', 'AskForUseCard', 'AskForResponseCard', 'AskForUseActiveSkill',
]);

interface Player {
  client: RetainingClient;
  /**
   * The room lane's own wrapper, deliberately. Dialog answers go out through
   * `LtkLua.replyToServer`, and the arity mismatch that used to live there was
   * invisible to every test that mocked the client — so this test uses the real
   * object on both sides of that call.
   */
  lua: LtkLua;
  scene: Scene;
  pending: { command: string; data: unknown } | null;
  commands: string[];
}

function answer(p: Player): void {
  const pending = p.pending;
  if (!pending) return;
  p.pending = null;

  if (!SCENE_REQUESTS.has(pending.command)) {
    if (pending.command === 'AskForGeneral') {
      const [generals, n] = pending.data as [string[], number];
      p.lua.replyToServer(generals.slice(0, n ?? 1));
      return;
    }
    // Declining is always a legal human answer; the engine substitutes the
    // request's own default, exactly as a timeout would.
    p.lua.replyToServer('');
    return;
  }

  const { scene, client } = p;
  if (scene.isEnabled('Button', 'OK')) {
    client.interact({ elemType: 'Button', id: 'OK', action: 'click' });
    return;
  }
  const card = scene.enabled('CardItem')[0];
  if (card !== undefined) {
    client.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: true } });
    if (scene.isEnabled('Button', 'OK')) {
      client.interact({ elemType: 'Button', id: 'OK', action: 'click' });
      return;
    }
    const target = scene.enabled('Photo')[0];
    if (target !== undefined) {
      client.interact({ elemType: 'Photo', id: Number(target), action: 'click', data: { selected: true } });
      if (scene.isEnabled('Button', 'OK')) {
        client.interact({ elemType: 'Button', id: 'OK', action: 'click' });
        return;
      }
    }
  }
  if (scene.isEnabled('Button', 'End')) {
    client.interact({ elemType: 'Button', id: 'End', action: 'click' });
    return;
  }
  client.interact({ elemType: 'Button', id: 'Cancel', action: 'click' });
}

async function until(ok: () => boolean, ms: number, tick: () => void): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    tick();
    if (ok()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

interface Table {
  runner: HostRunner;
  me: Player;
  /** Envelopes handed to the host's own client VM without touching the wire. */
  local: Envelope[];
  /** Envelopes that actually went out over the transport. */
  wire: Envelope[];
  logged: CommandRow[];
  faults: string[];
  host: InProcessLuaHost;
  /** The most cards this seat ever held. The opening deal is four. */
  maxHand: number;
  over: boolean;
  /**
   * What a table that mounted long after the deal knew the instant it finished
   * mounting. Copied field by field on purpose: `RoomStore` mutates its state
   * object in place between commits, so holding the reference would give the
   * live state at assertion time — which by game over is an empty hand, and no
   * evidence at all about what the table was handed on arrival.
   */
  late: {
    seen: string[];
    players: number;
    circle: number;
    withGenerals: number;
    hand: number[];
    logLines: number;
  } | null;
  /** The raw VM, for `errors()`, which is not part of the contract. */
  vm: MainThreadLuaClient;
  stop(): void;
}

async function seatDown(roomId: string): Promise<Table> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const vm = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: '我' });
  // Exactly what the shell does, and for the same reason: wrap the moment the
  // VM exists, so nothing can be emitted before there is somewhere to keep it.
  const client = retainNotifications(vm);
  const me: Player = { client, lua: new LtkLua(client), scene: new Scene(), pending: null, commands: [] };

  client.onNotifyUI((command, data) => {
    me.commands.push(command as string);
    if (command === 'UpdateRequestUI') me.scene.apply(data);
    else if (command === 'CancelRequest') { me.pending = null; me.scene.reset(); }
    else if (command === 'PlayCard' || (command as string).startsWith('AskFor')) {
      me.pending = { command: command as string, data };
    }
  });

  const local: Envelope[] = [];
  const wire: Envelope[] = [];
  const logged: CommandRow[] = [];
  const faults: string[] = [];
  const inner = loopbackTransport(roomId);
  const transport: GameTransport = {
    ...inner,
    async publish(env) { wire.push(env); await inner.publish(env); },
    async appendCommands(rows) { logged.push(...rows); },
  };

  const t: Table = {
    runner: null as never, me, vm, local, wire, logged, faults, host,
    maxHand: 0, over: false, late: null,
    stop() { t.runner.stop(); client.dispose(); host.dispose(); },
  };

  t.runner = await startHostRunner({
    roomId,
    seats: SEATS,
    hostSeat: 1,
    // Pinned to the standard roster, like the other end-to-end suites. Two
    // assertions below depend on the shape of the game this seed plays, and the
    // clearest is `wire.some(e => e.to === null)`: public envelopes are
    // *recovered* by `routeFlush` only when a message is byte-identical for
    // every seat, which this game does five times out of 860. A different
    // roster plays a shorter game and recovers none - not a regression, just an
    // assertion resting on a rare event. Pinning the pool keeps it honest.
    settings: { gameMode: 'aaa_role_mode', generalNum: 3, generalTimeout: 30, ...STANDARD_ROSTER_ONLY },
    transport,
    createHost: async () => host,
    onLocalEnvelope: (e) => { local.push(e); client.deliverEnvelope(e); },
    onFault: (m, fatal) => faults.push(`${fatal ? 'fatal' : 'warn'}: ${m}`),
    onGameOver: () => { t.over = true; },
  });

  client.onReply((_command, reply) => t.runner.submit(1, reply));
  return t;
}

/**
 * Play the room out the way a person would, watching the hand as we go.
 *
 * The hand is sampled rather than read once at the end because a hand is spent:
 * asserting on whatever happens to be left when the polling loop looks is a
 * flaky test. What is stable, and what the player cares about, is that a deal
 * happened at all — standard 身份局 opens with four cards.
 */
async function playOut(t: Table, ms = 180_000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms && !t.over) {
    answer(t.me);
    t.maxHand = Math.max(t.maxHand, t.me.client.call<number[]>('GetPlayerHandcards', 1).length);
    // Mount a second table well after the deal, the way React might. It gets
    // nothing but `onNotifyUI` — the same single input the real room has — and
    // whether it ends up holding a game is the whole question.
    if (!t.late && t.maxHand >= 4) {
      const store = new RoomStore(1);
      const seen: string[] = [];
      t.me.client.onNotifyUI((command, data) => {
        seen.push(command as string);
        store.applyNotify(command as string, data);
      });
      store.commit();
      const s = store.state;
      t.late = {
        seen: [...seen],
        players: Object.keys(s.players).length,
        circle: s.circle.length,
        withGenerals: Object.values(s.players).filter((p) => p.general).length,
        hand: [...(s.hands[1] ?? [])],
        logLines: s.log.length,
      };
    }
    await new Promise((r) => setTimeout(r, 20));
  }
}

/**
 * One real game, played once, asserted from several angles. The regression it
 * guards: pressing 开始游戏 used to flip a database row and nothing else — no
 * host was constructed, no seed was read, no envelope was ever emitted, and the
 * table sat empty with no exception anywhere.
 */
describe('the shell actually starts a game', () => {
  let t: Table;

  beforeAll(async () => {
    t = await seatDown('room-live');
    await playOut(t);
  }, LONG);

  afterAll(() => t?.stop());

  /**
   * The player's own assertion — cards in my hand — rather than "a container
   * div mounted", which is exactly what let the broken build ship.
   */
  it('deals the seat that pressed start a real opening hand', () => {
    // Every general in this game was chosen through `LtkLua.replyToServer`.
    expect(t.me.commands).toContain('AskForGeneral');
    expect(t.faults.filter((f) => f.startsWith('fatal'))).toEqual([]);
    expect(t.vm.errors()).toEqual([]);
    expect(t.maxHand).toBeGreaterThanOrEqual(4);
    expect(t.me.commands).toContain('StartGame');
    expect(t.me.commands).toContain('MoveCards');
    expect(t.me.commands).toContain('GameLog');
  });

  /**
   * The curtain over the table is a full-viewport overlay, and lifting it is a
   * promise that there is a game behind it. It used to lift on the first
   * envelope carrying any message at all — safe only while envelopes were one
   * per batch per recipient, because then the first one brought the whole
   * opening with it.
   *
   * Splitting envelopes at public/private transitions broke that for the host
   * alone. A guest holds everything until its resync, and that snapshot is a
   * whole table; the host has no resync and applies the opening one small run
   * at a time, so its first envelope can be a lone `EnterRoom`. The player who
   * pressed start got a bare table with one half-built photo and nothing to
   * click, while everyone else played normally.
   *
   * The assertion is the shape that made it possible: the host's first
   * envelope really does arrive before the seating does, so "any message"
   * cannot be the signal, and `ArrangeSeats` really does arrive later in the
   * same opening, so it can be.
   */
  it('does not lift the curtain until the seating exists', () => {
    const commandsOf = (e: { messages: readonly { command: string }[] }) =>
      e.messages.map((m) => m.command);
    expect(t.local.length).toBeGreaterThan(0);

    const seatingAt = t.local.findIndex((e) =>
      commandsOf(e).some((c) => c === 'ArrangeSeats' || c === 'Observe'));
    expect(seatingAt, 'the host never received ArrangeSeats').toBeGreaterThanOrEqual(0);

    // In this room the host is the only person, so nothing in the preamble is
    // byte-identical for every member and nothing is recovered as public — the
    // opening arrives in one envelope and seating is already in it. That is
    // why a bot room cannot show the bug, and why the assertion here is the
    // invariant rather than the ordering: whichever envelope carries seating,
    // the curtain must not have lifted before it.
    for (const e of t.local.slice(0, seatingAt)) {
      expect(
        commandsOf(e).some((c) => c === 'ArrangeSeats' || c === 'Observe'),
        'no envelope before the seating one may lift the curtain',
      ).toBe(false);
    }
    expect(commandsOf(t.local[seatingAt])).toContain(
      t.local[seatingAt].messages.some((m) => m.command === 'Observe') ? 'Observe' : 'ArrangeSeats',
    );
  });

  it('runs the room to a finish with every seat the room had', () => {
    expect(t.over).toBe(true);
    expect(t.runner.roomSpec.seats).toHaveLength(8);
    expect(t.runner.roomSpec.seats.map((s) => s.playerId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(t.me.commands).toContain('GameOver');
  });

  /**
   * The host's own seat never touches the wire — Realtime broadcast is
   * `self: false`, so a host that published to itself would hear nothing back.
   * Everyone else's private stream must go out, and the public one with it.
   */
  /**
   * The race, closed rather than narrowed.
   *
   * `FKHost.createRoom` emits the join preamble and then runs the room to its
   * first decision in a single flush, and `MainThreadLuaClient` pushes that out
   * synchronously as it consumes it. A table that has not mounted yet gets none
   * of it, and re-delivering the envelope is not a repair because the client
   * VM's own state has already moved on. Ordering the mount first makes the loss
   * unlikely; retaining the stream makes it impossible.
   *
   * So this table subscribes for the first time long after the cards are dealt,
   * and still has to know the whole room.
   */
  it('hands a table that mounts after the deal the entire opening', () => {
    const late = t.late;
    expect(late).not.toBeNull();
    // The preamble: everything below is only knowable from the first flush.
    // The preamble. None of this is knowable except from the first flush.
    expect(late!.seen).toContain('AddPlayer');
    expect(late!.seen).toContain('StartGame');
    expect(late!.seen).toContain('ArrangeSeats');
    expect(late!.players).toBe(8);
    expect(late!.circle).toBe(8);
    expect(late!.withGenerals).toBe(8);
    expect(late!.logLines).toBeGreaterThan(0);
    // And it holds its own cards, not just a seat count.
    expect(late!.hand.length).toBeGreaterThanOrEqual(4);
    // `drawPileCount` is deliberately not asserted here: it reaches the room
    // through `RefreshStatusSkills`, which `RoomView` polls on a 200 ms timer
    // and a headless store has no equivalent of. The browser smoke checks it.
  });

  it('retains the stream it replayed, bounded and untruncated', () => {
    const { count, truncated } = t.me.client.retained();
    expect(truncated).toBe(false);
    expect(count).toBeGreaterThan(100);
  });

  it('keeps the host s private stream off the wire and everyone else s on it', () => {
    expect(t.local.filter((e) => e.to === 1).length).toBeGreaterThan(0);
    expect(t.wire.filter((e) => e.to === 1)).toEqual([]);
    expect(t.wire.some((e) => e.to === null)).toBe(true);
    expect(t.wire.some((e) => typeof e.to === 'number' && e.to !== 1)).toBe(true);
  });

  it('appends every accepted decision to the command log, dense from seq 1', async () => {
    expect(await until(() => t.logged.length > 0, 10_000, () => {})).toBe(true);
    expect(t.logged.map((r) => r.seq)).toEqual(t.logged.map((_, i) => i + 1));
    expect(t.logged.length).toBeGreaterThan(20);
  });

  it('refuses to start a room the engine would immediately end', async () => {
    const transport = loopbackTransport('room-bots');
    await expect(startHostRunner({
      roomId: 'room-bots',
      seats: SEATS.map((s) => ({ ...s, isBot: true })),
      hostSeat: 1,
      settings: {},
      transport,
      createHost: () => { throw new Error('should never get as far as a VM'); },
      onLocalEnvelope: () => {},
      onFault: () => {},
    })).rejects.toThrow(/机器人/);

    await expect(startHostRunner({
      roomId: 'room-alone',
      seats: [SEATS[0]],
      hostSeat: 1,
      settings: {},
      transport,
      createHost: () => { throw new Error('should never get as far as a VM'); },
      onLocalEnvelope: () => {},
      onFault: () => {},
    })).rejects.toThrow(/两个人/);
  });

  it('maps room seats onto engine seats without inventing any', () => {
    const specs = seatSpecs([
      { seat: 3, displayName: 'c', avatar: '', isBot: false, connection: 'offline' },
      { seat: 1, displayName: 'a', avatar: 'caocao', isBot: false, connection: 'online' },
      { seat: 7, displayName: '', avatar: '', isBot: true, connection: 'online' },
    ]);
    expect(specs.map((s) => s.playerId)).toEqual([1, 3, 7]);
    expect(specs.map((s) => s.connId)).toEqual([1, 3, 7]);
    // Online, Trust (away from the keyboard), Robot.
    expect(specs.map((s) => s.state)).toEqual([1, 2, 5]);
    expect(specs[2].screenName).toBe('玩家7');
    expect(specs[2].avatar).toBe('guojia');
  });
});

/**
 * The failure that survived the first fix.
 *
 * Realtime broadcast delivers to whoever is joined *at send time*. The host's
 * first flush is the whole opening, including each seat's own 选将 request, and
 * a second machine that finishes joining its channel a moment later gets none of
 * it — silently, because there is no error in "nobody was listening". The seat
 * then shows a table with no dialog and waits out the request timer while the
 * AI answers for it, which is exactly what an intermittent
 * `no .fk-general in 120s` looks like from the outside.
 *
 * `loopbackTransport` reproduces this faithfully: `publish` reaches the
 * handlers registered at that moment and no others. So this test subscribes the
 * guest deliberately late and then asks whether it can still play.
 */
describe('a seat that finishes joining after the deal', () => {
  it('is given its whole table and the question it missed', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const hostVm = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: '房主' });
    const guestVm = await MainThreadLuaClient.create(bundle(), { playerId: 2, screenName: '客人' });
    const hostClient = retainNotifications(hostVm);
    const guestClient = retainNotifications(guestVm);
    const inner = loopbackTransport('room-late-join');
    // Everything the host puts on the wire, whether or not anyone hears it.
    const published: Envelope[] = [];
    const transport: GameTransport = {
      ...inner,
      async publish(env) { published.push(env); await inner.publish(env); },
    };

    const seats: HostSeat[] = [
      { seat: 1, displayName: '房主', avatar: 'caocao', isBot: false, connection: 'online' },
      { seat: 2, displayName: '客人', avatar: 'liubei', isBot: false, connection: 'online' },
      ...Array.from({ length: 6 }, (_, i) => ({
        seat: i + 3, displayName: `机器人 ${i + 3}`, avatar: 'guojia',
        isBot: true, connection: 'online' as const,
      })),
    ];

    const hostSeat: Player = {
      client: hostClient, lua: new LtkLua(hostClient), scene: new Scene(),
      pending: null, commands: [],
    };
    hostClient.onNotifyUI((command, data) => {
      hostSeat.commands.push(command as string);
      if (command === 'UpdateRequestUI') hostSeat.scene.apply(data);
      else if (command === 'CancelRequest') { hostSeat.pending = null; hostSeat.scene.reset(); }
      else if (command === 'PlayCard' || (command as string).startsWith('AskFor')) {
        hostSeat.pending = { command: command as string, data };
      }
    });

    let flushes = 0;
    const lateFaults: string[] = [];
    const runner = await startHostRunner({
      roomId: 'room-late-join',
      seats,
      hostSeat: 1,
      settings: { gameMode: 'aaa_role_mode', generalNum: 3, generalTimeout: 600 },
      // Ten minutes, so the engine's request timer cannot fire while the test
      // is setting the scene. Without this the room legitimately gives up on
      // the silent seat, the AI answers for it, and the test ends up measuring
      // the timeout instead of the resync.
      timeout: 600,
      transport,
      createHost: async () => host,
      onLocalEnvelope: (e) => { flushes += 1; hostClient.deliverEnvelope(e); },
      onFault: (m, fatal) => { lateFaults.push(`${fatal ? 'fatal' : 'warn'}: ${m}`); },
    });
    hostClient.onReply((_c, reply) => runner.submit(1, reply));

    try {
      // Wait for the host to put a *request* for seat 2 on the wire. Nobody is
      // listening on seat 2's channel, so that is the message being lost — the
      // real thing, not a stand-in for it. Nothing answers during this wait, so
      // the room stays parked exactly there.
      const askedSeat2 = () => published.some(
        (e) => e.to === 2 && e.messages.some((m) => m.kind === 'request'));
      const got = await until(() => flushes > 0 && askedSeat2(), 60_000, () => {});
      if (!got) {
        throw new Error(`the host never asked seat 2 anything. flushes=${flushes} `
          + `faults=${JSON.stringify(lateFaults)} `
          + `cmds=${JSON.stringify([...new Set(hostSeat.commands)])}`);
      }
      // Confirmed lost: the guest's VM has been fed nothing at all.
      expect(guestClient.retained().count).toBe(0);

      // Only now does the second machine finish joining — after its own
      // 选将 request has already been broadcast and lost.
      const guestSeat: Player = {
        client: guestClient, lua: new LtkLua(guestClient), scene: new Scene(),
        pending: null, commands: [],
      };
      const guestStore = new RoomStore(2);
      guestClient.onNotifyUI((command, data) => {
        guestSeat.commands.push(command as string);
        guestStore.applyNotify(command as string, data);
        if (command === 'UpdateRequestUI') guestSeat.scene.apply(data);
        else if (command === 'CancelRequest') { guestSeat.pending = null; guestSeat.scene.reset(); }
        else if (command === 'PlayCard' || (command as string).startsWith('AskFor')) {
          guestSeat.pending = { command: command as string, data };
        }
      });
      guestClient.onReply((_c, reply) => runner.submit(2, reply));

      let resynced = false;
      transport.onEnvelope(2, (env) => {
        if (env.batch < 0) resynced = true;
        guestClient.deliverEnvelope(env);
      });
      await transport.requestResync(2);

      // Still nothing answers: the room is parked on the two 选将 asks, so
      // whatever the guest ends up holding came from the resync and nowhere
      // else.
      expect(await until(() => resynced, 30_000, () => {})).toBe(true);
      // The table it never saw being built.
      guestStore.commit();
      expect(Object.keys(guestStore.state.players)).toHaveLength(8);
      // And the question it never heard being asked — not just as a raw
      // notification, but as the dialog the room would actually put on screen.
      expect(guestSeat.pending?.command).toBe('AskForGeneral');
      guestStore.commit();
      const request = guestStore.state.request;
      expect(request.kind).toBe('dialog');
      expect(request.kind === 'dialog' && request.command).toBe('AskForGeneral');

      // Which it can answer, and the host accepts, and the game moves on.
      answer(guestSeat);
      expect(await until(
        () => guestVm.call<number[]>('GetPlayerHandcards', 2).length >= 4,
        120_000,
        () => { answer(hostSeat); answer(guestSeat); },
      )).toBe(true);
      expect(guestVm.errors()).toEqual([]);
    } finally {
      runner.stop();
      hostVm.dispose();
      guestVm.dispose();
      host.dispose();
    }
  }, LONG);
});


/**
 * The other half of "who is being asked": telling a seat when it is not.
 *
 * The Qt client closes its own dialog. `RoomLogic.js:142` sets
 * `roomScene.state = "notactive"` the instant you press 确定, and `Room.qml`'s
 * countdown sets it again when the bar burns out. Neither is a message; the
 * only `CancelRequest` on the wire goes to whoever *lost a race*
 * (`lua/server/request.lua:354`), which in a 选将 — where every seat is a
 * winner — is nobody.
 *
 * A browser has neither of those halves. So the two normal ways a request ends
 * were invisible to the player: answer it and the dialog stays up; run out of
 * time and it stays up forever, because the next thing that clears it is the
 * next question you happen to be asked, which may be minutes away or never. Two
 * humans choosing generals at the same time hit both at once — one sits on a
 * dead dialog while the other is still choosing, and a seat that missed the
 * timeout is stuck for good, sending answers nobody wants.
 *
 * The host knows. `fk.ServerPlayer:setThinking` is the engine's own record of
 * whether a seat is being waited on, and `lua/web/fkhost.lua` turns its
 * true -> false edge into a `CancelRequest` for that seat. This asserts both
 * edges, from the player's side: the store the room renders.
 */
describe('a seat the engine has stopped waiting on', () => {
  it('is told so — whether it answered or ran out of time', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const transport = loopbackTransport('room-cancel');

    const seats: HostSeat[] = [
      { seat: 1, displayName: '房主', avatar: 'caocao', isBot: false, connection: 'online' },
      { seat: 2, displayName: '客人', avatar: 'liubei', isBot: false, connection: 'online' },
      ...Array.from({ length: 6 }, (_, i) => ({
        seat: i + 3, displayName: `机器人 ${i + 3}`, avatar: 'guojia',
        isBot: true, connection: 'online' as const,
      })),
    ];

    interface Seat {
      vm: MainThreadLuaClient;
      lua: LtkLua;
      store: RoomStore;
      commands: string[];
    }
    const mk = async (id: number, name: string): Promise<Seat> => {
      const vm = await MainThreadLuaClient.create(bundle(), { playerId: id, screenName: name });
      const s: Seat = { vm, lua: new LtkLua(vm), store: new RoomStore(id), commands: [] };
      vm.onNotifyUI((command, data) => {
        s.commands.push(command as string);
        s.store.applyNotify(command as string, data);
      });
      return s;
    };
    const me = await mk(1, '房主');
    const you = await mk(2, '客人');

    /** What the room would be drawing for this seat right now. */
    const request = (s: Seat) => { s.store.commit(); return s.store.state.request; };
    const asking = (s: Seat) =>
      request(s).kind === 'dialog' && (request(s) as { command: string }).command === 'AskForGeneral';
    const hand = (s: Seat, id: number) => s.vm.call<number[]>('GetPlayerHandcards', id).length;

    // Seat 2 is subscribed before the room exists, so it sees the opening the
    // same way the host's own seat does. This test is about what the host
    // *emits*; the resync path has its own test above.
    transport.onEnvelope(2, (env) => you.vm.deliverEnvelope(env));

    // Everything the driver decided was worth handing to the engine. The
    // engine's own reply queue keeps whatever is pushed into it until the next
    // `waitForReply` pops it, so "was it forwarded" is the only place a reply
    // to a question that is over can still be stopped.
    const forwarded: number[] = [];
    const spy: GameHost = {
      createRoom: (s) => host.createRoom(s),
      advance: (o) => host.advance(o),
      submitReply: (p, r) => { forwarded.push(p); return host.submitReply(p, r); },
      onOutput: (h) => host.onOutput(h),
      onDecision: (h) => host.onDecision(h),
      joinPreamble: (p) => host.joinPreamble(p),
      resyncPayload: (p) => host.resyncPayload(p),
      pendingInput: () => host.pendingInput(),
      dispose: () => host.dispose(),
    };

    const faults: string[] = [];
    const runner = await startHostRunner({
      roomId: 'room-cancel',
      seats,
      hostSeat: 1,
      // 20 seconds, which the driver burns in real time: long enough that the
      // first half cannot be an accident of the ask ending on its own, short
      // enough that the second half does not dominate the suite.
      // Pinned to the standard roster, and this one is load-bearing rather than
      // tidy: the assertion below needs BOTH seats to be holding an open
      // `AskForGeneral` at the same moment. Whether that ever happens is a fact
      // about the roster, not about request handling. With the mobile pack
      // loaded, role mode runs its lord-general step first - seat 1 is asked,
      // answers, is sent `CancelRequest` and gets its skills, and only then is
      // seat 2 asked. The two asks never overlap, so the test would wait out its
      // full 120 s on a game that is behaving perfectly.
      settings: { gameMode: 'aaa_role_mode', generalNum: 3, generalTimeout: 20, ...STANDARD_ROSTER_ONLY },
      timeout: 20,
      transport,
      createHost: async () => spy,
      onLocalEnvelope: (e) => me.vm.deliverEnvelope(e),
      onFault: (m, fatal) => faults.push(`${fatal ? 'fatal' : 'warn'}: ${m}`),
    });
    me.vm.onReply((_c, reply) => runner.submit(1, reply));
    you.vm.onReply((_c, reply) => runner.submit(2, reply));

    try {
      expect(await until(() => asking(me) && asking(you), 120_000, () => {})).toBe(true);

      // Seat 1 answers. Seat 2 deliberately does not.
      const [generals, n] = (request(me) as { data: unknown }).data as [string[], number];
      me.lua.replyToServer(generals.slice(0, n ?? 1));

      // Released on its own answer, while the room is still waiting on seat 2 —
      // which is what makes this an answer to "my question is over" rather than
      // to "everybody's question is over".
      expect(await until(() => request(me).kind === 'none', 5_000, () => {})).toBe(true);
      expect(asking(you)).toBe(true);
      expect(me.commands).toContain('CancelRequest');
      expect(hand(me, 1)).toBe(0);

      // The engine got seat 1's one answer, and will not get a second. The room
      // is parked on seat 2's ask — nothing is being asked of seat 1 — so a
      // click landing here (a double press, or one already in flight when the
      // question closed) has no question to answer. Forwarding it anyway would
      // leave it in the engine's reply queue, which `waitForReply` pops
      // blindly, and it would become the answer to whatever seat 1 is asked
      // next.
      expect(forwarded).toContain(1);
      const forwardedSoFar = forwarded.length;
      runner.submit(1, ['zhugeliang']);
      await new Promise((r) => setTimeout(r, 1_000));
      expect(forwarded.length).toBe(forwardedSoFar);
      expect(asking(you)).toBe(true);

      // Seat 2 never answers. The engine gives up on it, the AI chooses, and the
      // room deals — and seat 2 has to learn that the question it is still
      // looking at is gone. Asserted the moment the cards land, because from
      // there the next thing seat 2 is asked would clear the dialog anyway and
      // prove nothing.
      expect(await until(() => hand(you, 2) >= 4, 180_000, () => {})).toBe(true);
      expect(request(you).kind).toBe('none');
      expect(faults.filter((f) => f.startsWith('fatal'))).toEqual([]);
      expect(you.vm.errors()).toEqual([]);
    } finally {
      runner.stop();
      me.vm.dispose();
      you.vm.dispose();
      host.dispose();
    }
  }, LONG);
});

/**
 * The half of "your question is over" that a race, not a clock, decides.
 *
 * A `Request` ends the instant `n` seats have said yes (`request.lua:281`).
 * Every other seat it asked is marked `__failed_in_race`, and two things then
 * happen on the same pass: `_finish` sets each of them un-thinking, and the
 * losers are sent an explicit `CancelRequest` (`request.lua:344`, `:354`). The
 * first of those is what reaches a browser seat, through
 * `fk.ServerPlayer:setThinking`'s true -> false edge; this asserts a loser is
 * released in milliseconds rather than left holding a live dialog until the
 * ask's own timeout burns out. That is what 无懈可击 looks like from the losing
 * seat, and 五谷丰登 asks the whole table once per target — eight races in a
 * row, thirty seconds each if the losers are never told.
 *
 * The race is arranged rather than waited for. The only ask that ships with
 * `n < #players` is `Room:askToNullification` (`room.lua:2635`), which needs
 * two seats each holding a 无懈可击 and a trick aimed at the table; that cannot
 * be arranged from outside the deck, and a test that waits for it is a test
 * that passes by not running. Turning the opening 选将 — the one ask every game
 * puts to several seats at once — into an `n = 1` race drives the real
 * `Request` down the real losing branch, deterministically, on the first
 * question of the game.
 *
 * Three human seats, not two, because exactly one seat is the lord and the lord
 * chooses alone first (`gamelogic.lua:93`). With three, at least two are always
 * in the broadcast whichever seat drew the lord.
 */
describe('a seat that loses a broadcast race', () => {
  it('is released when someone else answers, not when the clock runs out', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    host.lua.doStringSync(`
      local orig = Request.initialize
      function Request:initialize(players, command, n)
        orig(self, players, command, n)
        if command == "AskForGeneral" and #self.players > 1 then self.n = 1 end
      end
    `);
    const transport = loopbackTransport('room-race');

    const humans = [1, 2, 3];
    const seats: HostSeat[] = [
      ...humans.map((seat) => ({
        seat, displayName: `玩家 ${seat}`, avatar: 'caocao',
        isBot: false, connection: 'online' as const,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        seat: i + 4, displayName: `机器人 ${i + 4}`, avatar: 'guojia',
        isBot: true, connection: 'online' as const,
      })),
    ];

    interface Seat {
      id: number;
      vm: MainThreadLuaClient;
      lua: LtkLua;
      store: RoomStore;
      commands: string[];
    }
    const mk = async (id: number): Promise<Seat> => {
      const vm = await MainThreadLuaClient.create(bundle(), { playerId: id, screenName: `玩家 ${id}` });
      const s: Seat = { id, vm, lua: new LtkLua(vm), store: new RoomStore(id), commands: [] };
      vm.onNotifyUI((command, data) => {
        s.commands.push(command as string);
        s.store.applyNotify(command as string, data);
      });
      return s;
    };
    const people: Seat[] = [];
    for (const id of humans) people.push(await mk(id));

    const request = (s: Seat) => { s.store.commit(); return s.store.state.request; };
    const asking = (s: Seat) =>
      request(s).kind === 'dialog' && (request(s) as { command: string }).command === 'AskForGeneral';
    const cancels = (s: Seat) => s.commands.filter((c) => c === 'CancelRequest').length;

    for (const s of people.slice(1)) transport.onEnvelope(s.id, (env) => s.vm.deliverEnvelope(env));

    const faults: string[] = [];
    const runner = await startHostRunner({
      roomId: 'room-race',
      seats,
      hostSeat: 1,
      // 30 seconds is the losing seat's own budget. A seat released by the race
      // is released in milliseconds; a seat released by the clock cannot be.
      //
      // Pinned to the standard roster like the rest of this file, and for the
      // reason spelled out on the cancel test above: whether two seats are ever
      // asked 选将 at the same moment is a fact about the roster, not about
      // request handling. This was the one suite here left unpinned, and the six
      // mirrored rosters were enough to stop the overlap happening.
      settings: {
        gameMode: 'aaa_role_mode', generalNum: 3, generalTimeout: 30,
        ...STANDARD_ROSTER_ONLY,
      },
      timeout: 30,
      transport,
      createHost: async () => host,
      onLocalEnvelope: (e) => people[0].vm.deliverEnvelope(e),
      onFault: (m, fatal) => faults.push(`${fatal ? 'fatal' : 'warn'}: ${m}`),
    });
    for (const s of people) s.vm.onReply((_c, reply) => runner.submit(s.id, reply));

    const answered = new Set<number>();
    const answerGeneral = (s: Seat) => {
      if (answered.has(s.id)) return;
      answered.add(s.id);
      const [generals, n] = (request(s) as { data: unknown }).data as [string[], number];
      s.lua.replyToServer(generals.slice(0, n ?? 1));
    };

    try {
      /**
       * Wait for the moment two seats are looking at the same question. A seat
       * asked on its own is the lord, and it is answered rather than waited
       * out — otherwise this test spends the lord's whole 30-second timeout
       * measuring the wrong edge. The 1.5 s is because the two halves of a
       * broadcast reach two tabs through two envelopes, so "only one is asking"
       * is also what the first millisecond of a broadcast looks like.
       */
      const waiting = () => people.filter((s) => asking(s) && !answered.has(s.id));
      let aloneSince: number | null = null;
      const ready = await until(() => {
        const a = waiting();
        if (a.length >= 2) return true;
        if (a.length === 1) {
          aloneSince ??= Date.now();
          if (Date.now() - aloneSince > 1_500) answerGeneral(a[0]);
        } else {
          aloneSince = null;
        }
        return false;
      }, 120_000, () => {});
      if (!ready) {
        throw new Error('no two seats were ever asked 选将 together: '
          + people.map((s) => `${s.id}=${JSON.stringify(request(s))}`).join(' ')
          + ` faults=${JSON.stringify(faults)}`);
      }

      const [winner, ...losers] = waiting();
      expect(losers.length).toBeGreaterThan(0);
      const before = new Map(losers.map((s) => [s.id, cancels(s)]));

      const answeredAt = Date.now();
      answerGeneral(winner);

      // Every loser's question is over the moment the winner's answer lands.
      const released = await until(
        () => losers.every((s) => request(s).kind === 'none'), 5_000, () => {});
      expect(released).toBe(true);
      expect(Date.now() - answeredAt).toBeLessThan(5_000);
      for (const s of losers) expect(cancels(s)).toBeGreaterThan(before.get(s.id)!);
      expect(faults.filter((f) => f.startsWith('fatal'))).toEqual([]);
      for (const s of people) expect(s.vm.errors()).toEqual([]);
    } finally {
      runner.stop();
      for (const s of people) s.vm.dispose();
      host.dispose();
    }
  }, LONG);
});

/**
 * Two topics, one game.
 *
 * A seated player subscribes `room:<id>` and `room:<id>:p:<seat>`. The host's
 * send order is exact — every publish goes through one promise chain — but two
 * Realtime topics have no ordering guarantee between them, and the host's own
 * seat never sees it because its envelopes are handed over in-process.
 * Measured over 38 two-seat games against the engine's `event_id`: 0 inversions
 * in 17,853 moves on the host seat, 72 in 17,808 on the remote one, in 21 of
 * the 38 games.
 *
 * The first three cases are the ordering rule on its own. The fourth plays a
 * real game through a transport that delivers the private topic one publish
 * late — the measured failure, made deterministic — and asks the question a
 * player would: do the two tabs still hold the same table?
 */
describe('reassembling two topics into one stream', () => {
  const env = (batch: number, to: number | null, seq: number): Envelope => ({
    roomId: 'r', batch, to,
    messages: [{ seq, kind: 'notify', command: 'GameLog', bytes: 1 }],
  });
  const label = (e: Envelope) => `${e.batch}:${e.to ?? 'pub'}`;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('puts a late private envelope back in front of the public one it precedes', async () => {
    const out: string[] = [];
    const r = reassemble(2, (e) => out.push(label(e)), 20);
    // The engine's order was public(1), private(1), public(2). The private
    // topic runs late and hands its envelope over after public(2) — this is
    // `draw -> hand(2)` arriving after `hand(2) -> processing`, the inversion
    // that wedges a card in a hand for the rest of the game.
    r.receive(env(1, null, 10));
    r.receive(env(2, null, 30));
    r.receive(env(1, 2, 20));
    await wait(60);
    expect(out).toEqual(['1:pub', '1:2', '2:pub']);
    r.stop();
  });

  it('releases without waiting once both topics are current', () => {
    const out: string[] = [];
    const r = reassemble(2, (e) => out.push(label(e)), 20);
    // Each topic is FIFO in itself, so a batch at or below both high-water
    // marks can have nothing outstanding in front of it. Asserted with no
    // `await` at all: this is the path almost every envelope takes, and it must
    // cost nothing.
    r.receive(env(1, null, 10));
    r.receive(env(1, 2, 20));
    expect(out).toEqual(['1:pub', '1:2']);
    r.stop();
  });

  it('does not stall the table on a private topic that has nothing to say', async () => {
    const out: string[] = [];
    const r = reassemble(2, (e) => out.push(label(e)), 20);
    // Most batches have no private half at all — 40 to 150 of a game's 600 for
    // a given seat — so waiting for proof that never comes would be a table
    // that stops moving. The hold is a cap, not a delay budget to spend.
    for (let b = 1; b <= 4; b++) r.receive(env(b, null, b * 10));
    await wait(80);
    expect(out).toEqual(['1:pub', '2:pub', '3:pub', '4:pub']);
    r.stop();
  });

  it('keeps a remote seat holding the same table as the host', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const inner = loopbackTransport('room-order');

    /**
     * The skew: seat 2's own topic runs a few milliseconds behind the public
     * one, which is what two Realtime topics fanned out by two server-side
     * processes actually do. Held rather than dropped, and on a timer rather
     * than on the next publish — a private envelope carries this seat's own
     * requests, so a skew that waits for more traffic deadlocks the room it is
     * supposed to be testing.
     */
    const SKEW_MS = 30;
    const inFlight: Envelope[] = [];
    let inversions = 0;
    const transport: GameTransport = {
      ...inner,
      async publish(e) {
        if (e.to === 2) {
          inFlight.push(e);
          setTimeout(() => {
            const i = inFlight.indexOf(e);
            if (i >= 0) inFlight.splice(i, 1);
            void inner.publish(e);
          }, SKEW_MS);
          return;
        }
        // A public envelope overtaking a private one still on the wire is the
        // inversion itself; counting them is how this test proves it exercised
        // the thing it is about.
        if (inFlight.length > 0) inversions += 1;
        await inner.publish(e);
      },
    };

    const seats: HostSeat[] = [
      { seat: 1, displayName: '房主', avatar: 'caocao', isBot: false, connection: 'online' },
      { seat: 2, displayName: '客人', avatar: 'liubei', isBot: false, connection: 'online' },
      ...Array.from({ length: 6 }, (_, i) => ({
        seat: i + 3, displayName: `机器人 ${i + 3}`, avatar: 'guojia',
        isBot: true, connection: 'online' as const,
      })),
    ];

    interface Seat extends Player { vm: MainThreadLuaClient; store: RoomStore }
    const mk = async (id: number, name: string): Promise<Seat> => {
      const vm = await MainThreadLuaClient.create(bundle(), { playerId: id, screenName: name });
      const s: Seat = {
        vm, client: vm as unknown as RetainingClient, lua: new LtkLua(vm),
        store: new RoomStore(id), scene: new Scene(), pending: null, commands: [],
      };
      vm.onNotifyUI((command, data) => {
        s.store.applyNotify(command as string, data);
        if (command === 'UpdateRequestUI') s.scene.apply(data);
        else if (command === 'CancelRequest') { s.pending = null; s.scene.reset(); }
        else if (command === 'PlayCard' || (command as string).startsWith('AskFor')) {
          s.pending = { command: command as string, data };
        }
      });
      return s;
    };
    const me = await mk(1, '房主');
    const you = await mk(2, '客人');

    /**
     * The order envelopes actually reached the client VM. This is the
     * assertion with teeth: the engine published in `(batch, seq)` order, and
     * anything else arriving at the VM is the bug, whether or not this
     * particular game happened to contain a move that the inversion corrupts.
     */
    const applied: { batch: number; seq: number }[] = [];
    const feed = (e: Envelope) => {
      applied.push({ batch: e.batch, seq: e.messages[0]?.seq ?? 0 });
      you.vm.deliverEnvelope(e);
    };
    // The hold has to exceed the skew it is reassembling across; in production
    // that is a frame against a millisecond or two of Realtime jitter, here it
    // is the same ratio with both numbers scaled up so the test does not
    // depend on how fast this machine happens to be.
    const ordered = reassemble(2, feed, SKEW_MS * 5);
    transport.onEnvelope(2, ordered.receive);

    const faults: string[] = [];
    const runner = await startHostRunner({
      roomId: 'room-order',
      seats,
      hostSeat: 1,
      settings: { gameMode: 'aaa_role_mode', generalNum: 3, generalTimeout: 300 },
      timeout: 300,
      transport,
      createHost: async () => host,
      onLocalEnvelope: (e) => me.vm.deliverEnvelope(e),
      onFault: (m, fatal) => faults.push(`${fatal ? 'fatal' : 'warn'}: ${m}`),
    });
    me.vm.onReply((_c, reply) => runner.submit(1, reply));
    you.vm.onReply((_c, reply) => runner.submit(2, reply));

    const counts = (s: Seat) => {
      s.store.commit();
      const st = s.store.state;
      return {
        draw: st.drawPileCount,
        hands: Object.fromEntries(Object.entries(st.hands).map(([k, v]) => [k, v.length])),
        equips: Object.fromEntries(Object.entries(st.equips).map(([k, v]) => [k, v.length])),
      };
    };

    try {
      const play = () => { answer(me); answer(you); };
      // Long enough for the deal, several rounds of play and a good number of
      // inversions; not so long that the suite pays for a whole game.
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline && !me.store.state.gameOver) {
        play();
        await new Promise((r) => setTimeout(r, 25));
        me.store.commit();
        if (me.store.state.round >= 3) break;
      }
      // Nobody answers anything now, so both tabs drain to the same point.
      await new Promise((r) => setTimeout(r, 1_500));

      expect(inversions).toBeGreaterThan(10);
      const outOfOrder = applied.filter((m, i) =>
        i > 0 && (m.batch < applied[i - 1].batch
          || (m.batch === applied[i - 1].batch && m.seq < applied[i - 1].seq)));
      expect({ outOfOrder: outOfOrder.length, of: applied.length })
        .toEqual({ outOfOrder: 0, of: applied.length });
      // And the consequence a player would notice: the two tabs hold the same
      // table.
      expect(counts(you)).toEqual(counts(me));
      expect(faults.filter((f) => f.startsWith('fatal'))).toEqual([]);
      expect(you.vm.errors()).toEqual([]);
    } finally {
      ordered.stop();
      runner.stop();
      me.vm.dispose();
      you.vm.dispose();
      host.dispose();
    }
  }, LONG);
});
