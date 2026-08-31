/**
 * The host lane: the piece that was missing.
 *
 * `contract/engine.ts` describes an authoritative server VM in a worker,
 * `src/worker` implements it, and `src/net` can carry what it produces — but
 * nothing in the app ever constructed one. `startGame` flipped a row to
 * `playing`, every tab mounted a client VM, and no engine was ever asked to
 * deal a hand. That is why the table was empty and why nothing was logged:
 * there was no failure, there was an absence.
 *
 * This is the driver. Exactly one tab runs it — the room's current host — and
 * it owns the whole authoritative loop:
 *
 *   seed -> createRoom -> advance until someone has to decide
 *                          ^                             |
 *                          +---- reply (local or wire) <--+
 *
 * Two rules that are not obvious from the interfaces:
 *
 *  * A resume reason of `request_timer` makes `Request:ask` drop every human
 *    from the ask *immediately* (`lua/server/request.lua`), so it must never be
 *    sent early. Timeouts ride the virtual clock instead: every resume advances
 *    it by the wall time that actually elapsed, and the engine's own
 *    `os.time()` comparison expires the request on its own.
 *  * The host's own envelopes never go near the wire. Realtime broadcast is
 *    configured `self: false`, so a host publishing to itself would hear
 *    nothing back; its client VM is fed in-process instead.
 */
import type { DecisionRecord, RoomSpec, SeatSpec } from '../contract/engine';
import type { ClientReply, Envelope, WireCommand } from '../contract/protocol';
import type { AdvanceOptions, AdvanceResult, WirePayloadMessage } from '../engine/types';
import type { CommandRow, GameTransport } from './api/transport';
import { BASE } from './boot';
import { getLanguage, t } from '../i18n';
import type { UiKey } from '../i18n';

/** These strings reach the player through `onFault`, so they follow the toggle. */
const tr = (key: UiKey, vars?: Record<string, string | number>) => t(key, getLanguage(), vars);

/** `fk.Player_*`, per `contract/engine.ts`. */
const ONLINE = 1;
const TRUST = 2;
const ROBOT = 5;

/** How long the loop naps while a seat is thinking, before nudging the clock. */
const POLL_MS = 400;

/**
 * What the driver needs of a host VM. Both `WorkerLuaHost` and
 * `InProcessLuaHost` satisfy it structurally, which is what lets the browser
 * run a real worker while a node test drives the identical loop in-process.
 */
export interface GameHost {
  createRoom(spec: RoomSpec): Promise<void>;
  advance(opts?: AdvanceOptions): Promise<AdvanceResult>;
  submitReply(playerId: number, reply: unknown): Promise<void>;
  onOutput(handler: (envelope: Envelope) => void): () => void;
  onDecision(handler: (d: DecisionRecord) => void): () => void;
  joinPreamble(playerId: number): Promise<{ command: string; payload: string }[]>;
  resyncPayload(playerId: number): Promise<string>;
  /** Seats the engine is waiting on right now. Its own answer, not bookkeeping. */
  pendingInput(): Promise<number[]>;
  dispose(): void;
}

export interface HostSeat {
  readonly seat: number;
  readonly displayName: string;
  readonly avatar: string;
  readonly isBot: boolean;
  readonly connection: 'online' | 'offline' | 'left';
}

export interface HostRunnerSpec {
  readonly roomId: string;
  readonly seats: readonly HostSeat[];
  /** The host's own seat. Its envelopes are delivered in-process. */
  readonly hostSeat: number;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly transport: GameTransport;
  /** Seconds a seat gets to answer one request before the engine moves on. */
  readonly timeout?: number;
  /** Envelopes addressed to the host's own seat, or to everyone. */
  onLocalEnvelope(envelope: Envelope): void;
  /** Something went wrong. `fatal` means the room is not going to recover. */
  onFault(message: string, fatal: boolean): void;
  onGameOver?(): void;
  /** Injected by tests; the browser gets a real Web Worker. */
  createHost?(): Promise<GameHost>;
}

export interface HostRunner {
  /** A reply from a seat, however it arrived. */
  submit(playerId: number, reply: unknown): void;
  readonly roomSpec: RoomSpec;
  stop(): void;
}

const workerModules = import.meta.glob<Record<string, unknown>>('../worker/index.ts');

async function defaultHost(): Promise<GameHost> {
  const entry = Object.values(workerModules)[0];
  if (!entry) throw new Error(tr('host.error.missingWorker'));
  const mod = await entry();
  const start = mod.startHostWorker as
    | ((init: Record<string, unknown>) => Promise<GameHost>)
    | undefined;
  if (typeof start !== 'function') throw new Error(tr('host.error.noExport'));
  // The worker fetches the 1.6 MB bundle itself; handing it over postMessage
  // would copy the whole thing across the boundary for nothing.
  return start({ bundleUrl: `${BASE}lua-bundle.json`, wasmUri: `${BASE}glue.wasm` });
}

export function seatSpecs(seats: readonly HostSeat[]): SeatSpec[] {
  return [...seats]
    .sort((a, b) => a.seat - b.seat)
    .map((s) => ({
      playerId: s.seat,
      connId: s.seat,
      screenName: s.displayName || tr('host.playerName', { seat: s.seat }),
      avatar: s.avatar || 'guojia',
      // A seat that is not at the keyboard plays on autopilot rather than
      // holding the room hostage for its whole timeout on every single ask.
      state: (s.isBot ? ROBOT : s.connection === 'online' ? ONLINE : TRUST) as 1 | 2 | 5,
    }));
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function startHostRunner(spec: HostRunnerSpec): Promise<HostRunner> {
  const seed = await spec.transport.readSeed();
  if (seed === null) {
    // RLS hands a non-host zero rows rather than an error, so this is the one
    // place where "no rows" has to be read as "you are not the host".
    throw new Error(tr('host.error.noSeed'));
  }

  const seats = seatSpecs(spec.seats);
  if (seats.length < 2) throw new Error(tr('host.error.tooFewSeats', { n: seats.length }));
  if (!seats.some((s) => s.state !== ROBOT)) {
    throw new Error(tr('host.error.allBots'));
  }

  const roomSpec: RoomSpec = {
    roomId: spec.roomId,
    seed,
    seats,
    ownerId: spec.hostSeat,
    timeout: spec.timeout ?? 30,
    settings: { ...spec.settings },
  };

  const host = await (spec.createHost ?? defaultHost)();

  let stopped = false;
  let wake: (() => void) | null = null;
  const inbox: { playerId: number; reply: unknown }[] = [];
  const seatIds = new Set(seats.map((s) => s.playerId));

  /**
   * The question each seat is being asked right now, and nothing else.
   *
   * Two jobs, both of which need the same fact. A resync has to carry the
   * outstanding request, because a room snapshot does not contain one: a player
   * who missed their own 选将 and is handed a beautiful table with no dialog
   * sits there until the request times out. And a reply may only be forwarded
   * while its question is still open — `waitForReply` pops whatever is queued
   * for that connection (`lua/web/fkhost.lua`), so a reply that arrives after
   * its request ended is not discarded by the engine, it becomes the answer to
   * that seat's *next* question, which the player never saw. A click already in
   * flight when the timer expired is enough to do that.
   *
   * Filled from the requests the engine emits, emptied by the `CancelRequest`
   * it emits when it stops waiting on a seat. Both edges come from the engine,
   * so this is a record rather than a guess.
   */
  let lastBatch = 0;
  const outstanding = new Map<number, WirePayloadMessage>();

  const submit = (playerId: number, reply: unknown): void => {
    if (stopped || !seatIds.has(playerId)) return;
    if (!outstanding.has(playerId)) return;
    inbox.push({ playerId, reply });
    wake?.();
  };

  /* ------------------------------------------------------------- outbound */

  // One chain, so envelopes reach the wire in the order the engine produced
  // them. Two concurrent `publish` calls would race, and a client applying a
  // later flush before an earlier one is a corrupted table.
  let wire: Promise<void> = Promise.resolve();
  let wireFailed = false;
  const enqueue = (fn: () => Promise<void>): void => {
    wire = wire.then(fn).catch((e: unknown) => {
      if (wireFailed) return;
      wireFailed = true;
      spec.onFault(tr('host.fault.send', { error: errorText(e) }), false);
    });
  };

  // `lastBatch` stamps a resync snapshot, so its recipient can tell which of
  // its buffered envelopes the snapshot already contains. `outstanding` is
  // declared with `submit`, above.
  const offOutput = host.onOutput((env) => {
    if (env.batch > lastBatch) lastBatch = env.batch;
    for (const m of env.messages) {
      // `CancelRequest` is the engine saying "that seat is no longer being
      // asked". Forgetting the question there — rather than only checking
      // `pendingInput()` when a resync is served — means a seat can never be
      // handed a dialog it has already answered, however the two are timed.
      if (m.command === 'CancelRequest') {
        if (env.to === null) outstanding.clear();
        else outstanding.delete(env.to);
        continue;
      }
      if (m.kind !== 'request') continue;
      const msg = m as WirePayloadMessage;
      if (env.to === null) for (const s of seatIds) outstanding.set(s, msg);
      else outstanding.set(env.to, msg);
    }
    if (env.to === null || env.to === spec.hostSeat) {
      try { spec.onLocalEnvelope(env); } catch (e) { console.error('[host] local deliver failed', e); }
    }
    // The host's private stream has exactly one recipient, and it is this tab.
    if (env.to === spec.hostSeat) return;
    enqueue(() => spec.transport.publish(env));
  });

  // Decisions are the durability story, not the play story: a failure here
  // costs host migration, not the game in progress, so it is reported once and
  // the room keeps going. Its own chain, so a slow insert never stalls a flush.
  let log: Promise<void> = Promise.resolve();
  let logFailed = false;
  let rows: CommandRow[] = [];
  let logTimer: ReturnType<typeof setTimeout> | null = null;
  const flushLog = (): void => {
    if (logTimer) { clearTimeout(logTimer); logTimer = null; }
    if (rows.length === 0 || logFailed) return;
    const batch = rows;
    rows = [];
    log = log.then(() => spec.transport.appendCommands(batch)).catch((e: unknown) => {
      if (logFailed) return;
      logFailed = true;
      spec.onFault(tr('host.fault.log', { error: errorText(e) }), false);
    });
  };
  const offDecision = host.onDecision((d) => {
    rows.push({
      seq: d.seq, playerId: d.playerId, command: d.command, reply: d.reply, digest: d.digest,
    });
    logTimer ??= setTimeout(flushLog, 500);
  });

  /* -------------------------------------------------------------- inbound */

  const offReply = spec.transport.onReply((r: ClientReply) => {
    if (r.roomId !== spec.roomId) return;
    submit(r.playerId, r.reply);
  });

  /**
   * Resyncs are served between advances, never during one.
   *
   * The stamp on a snapshot is a promise: "everything up to batch N is already
   * in here". Reading `lastBatch` around an `await` cannot keep that promise —
   * the driver is advancing the room concurrently, so a snapshot taken after
   * the stamp contains flushes the recipient will then also apply from its
   * buffer, and one taken before it leaves a gap. Both are silent corruption.
   * Serving from inside the driver loop makes the two atomic, because `pump()`
   * only runs inside `advance`.
   */
  const resyncQueue: number[] = [];
  const serveResync = async (playerId: number): Promise<void> => {
    try {
      await sendResync(playerId);
    } catch (e) {
      // A seat that cannot be caught up is a bad seat, not a bad room.
      spec.onFault(tr('host.fault.resyncSeat', { seat: playerId, error: errorText(e) }), false);
    }
  };

  const sendResync = async (playerId: number): Promise<void> => {
    const asOf = lastBatch;
    // Whether the engine is still waiting on this seat is the engine's question
    // to answer. Tracking it from `advance` results looked equivalent and was
    // not: the opening request is emitted inside `createRoom`, before the first
    // `advance` has returned anything.
    const waiting = new Set(await host.pendingInput());
    const ask = waiting.has(playerId) ? outstanding.get(playerId) : undefined;
    const messages = await resyncMessages(host, playerId, ask);
    enqueue(() => spec.transport.publish({
      roomId: spec.roomId,
      // Negative marks a resync; the magnitude carries the batch it is current
      // as of, so the recipient knows which of its buffered envelopes are
      // already accounted for. Two resyncs at the same batch are the same
      // snapshot, and dedupe on `batch:to` is then exactly right.
      batch: -1 - asOf,
      to: playerId,
      messages,
    }));
  };

  /** Set once the room can no longer flush, so resyncs can be served inline. */
  let quiescent = false;
  const drainResyncs = async (): Promise<void> => {
    while (resyncQueue.length > 0) await serveResync(resyncQueue.shift()!);
  };

  const offResync = spec.transport.onResyncRequest((playerId) => {
    if (stopped || !seatIds.has(playerId) || playerId === spec.hostSeat) return;
    if (quiescent) { void serveResync(playerId); return; }
    // One pending catch-up per seat: a seat retrying while its answer is still
    // being built does not need two of them.
    if (!resyncQueue.includes(playerId)) resyncQueue.push(playerId);
    wake?.();
  });

  /* --------------------------------------------------------------- driver */

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    wake?.();
    offOutput(); offDecision(); offReply(); offResync();
    flushLog();
    void Promise.allSettled([wire, log]).then(() => host.dispose());
  };

  await spec.transport.ready(seats.map((s) => s.connId)).catch((e: unknown) => {
    // Not fatal on its own — the host can still play its own seat, and
    // broadcast falls back to HTTP. But remote seats may see nothing, and that
    // must not be silent.
    spec.onFault(tr('host.fault.channel', { error: errorText(e) }), false);
  });

  await host.createRoom(roomSpec);

  const napUntilReply = (): Promise<void> => new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      wake = null;
      resolve();
    };
    const timer = setTimeout(finish, POLL_MS);
    wake = finish;
  });

  void (async () => {
    let lastResumeAt = now();
    try {
      for (;;) {
        if (stopped) return;
        // Between advances is the only safe moment: nothing can flush here.
        await drainResyncs();
        if (stopped) return;
        while (inbox.length > 0) {
          const r = inbox.shift()!;
          await host.submitReply(r.playerId, r.reply);
        }
        const at = now();
        const advanceUs = Math.max(0, Math.round((at - lastResumeAt) * 1000));
        lastResumeAt = at;

        // Never `request_timer`: see the note at the top of this file.
        const res = await host.advance({ advanceUs, realtime: true });
        if (stopped) return;
        if (res.err) throw new Error(res.err);
        if (res.over) {
          flushLog();
          // The room will never flush again, so a resync can be served the
          // moment it is asked for.
          quiescent = true;
          await drainResyncs();
          spec.onGameOver?.();
          return;
        }
        if (res.stopped === 'input' && inbox.length === 0) await napUntilReply();
      }
    } catch (e) {
      if (stopped) return;
      spec.onFault(tr('host.fault.engine', { error: errorText(e) }), true);
      stop();
    }
  })();

  return { submit, roomSpec, stop };
}

/**
 * The engine's own answer to "catch this seat up": the join preamble it would
 * have received on entry, then one `Observe` snapshot taken from that seat's
 * point of view. `rejoin.test.ts` proves a fresh VM fed exactly this ends up
 * holding the same hand as the VM it replaced — plus, if the engine is still
 * waiting on this seat, the request it is waiting on.
 */
async function resyncMessages(
  host: GameHost, playerId: number, outstandingAsk?: WirePayloadMessage,
): Promise<WirePayloadMessage[]> {
  const preamble = await host.joinPreamble(playerId);
  const snapshot = await host.resyncPayload(playerId);
  const messages: WirePayloadMessage[] = [...preamble, { command: 'Observe', payload: snapshot }]
    .map((m, i) => ({
      seq: i,
      kind: 'notify' as const,
      command: m.command as WireCommand,
      bytes: m.payload.length,
      payload: m.payload,
    }));
  // The snapshot is the room, not the conversation. If the engine is still
  // waiting on this seat, the question goes back out with it.
  if (outstandingAsk) messages.push({ ...outstandingAsk, seq: messages.length });
  return messages;
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
