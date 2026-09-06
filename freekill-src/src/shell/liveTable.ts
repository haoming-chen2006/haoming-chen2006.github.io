/**
 * One tab's connection to a game in progress.
 *
 * Every seat runs this. It plugs the tab's client VM into the room's traffic:
 * envelopes in, replies out. Exactly one of them — the host's — additionally
 * starts the authoritative engine and becomes the thing everyone else is
 * talking to.
 *
 * The status it reports is the other half of the fix. Before this existed the
 * room mounted a table, connected a socket, said "已连接" and then showed
 * nothing forever, because nothing was ever going to arrive. A table with no
 * game in it is now a state with a name — and if it stays in that state, it
 * says why.
 */
import type { LuaClient } from '../contract/engine';
import type { Envelope, WireCommand } from '../contract/protocol';
import { getGameTransport, type GameTransport } from './api/transport';
import type { RetainingClient } from './retainingClient';
import {
  DEFAULT_PACE_MS, errorText, startHostRunner, type HostRunner, type HostSeat,
} from './hostRunner';
import { getLanguage, t } from '../i18n';
import type { UiKey } from '../i18n';

const tr = (key: UiKey, vars?: Record<string, string | number>) => t(key, getLanguage(), vars);

export type TablePhase = 'connecting' | 'dealing' | 'live' | 'over' | 'failed';

/** Envelopes a joining seat will hold while it waits for its snapshot. */
const HELD_LIMIT = 2000;

/**
 * How long an envelope may wait for a sibling on the other topic before it is
 * released anyway.
 *
 * Both topics ride the same websocket and are fanned out by the same Realtime
 * server, so a flush's two halves land within a millisecond or two of each
 * other; a frame is generous. What the cap is really for is the case the
 * watermark cannot rule out and that never resolves — a seat whose private
 * topic says nothing for a whole round — where waiting for proof would stall
 * the table instead of ordering it.
 */
const ORDER_HOLD_MS = 16;

/**
 * The table's tempo, and where a person can change it.
 *
 * `hostRunner` explains what the number means; this is only the question of who
 * gets to pick it, and the answer has to be "whoever is looking at the table",
 * not "whoever last built the bundle". The site is static files on GitHub
 * Pages, so a constant in the source would make "try 400 instead of 800" a
 * rebuild and a deploy before anyone can tell whether 400 feels better. It
 * should be a reload.
 *
 * Three overrides, most immediate first, all of them live:
 *
 *   window.__fkPace = 0            in the console, for the next room
 *   #/room/abc?pace=400           in the link — `parseHash` already drops the
 *                                  query, so this routes unchanged
 *   localStorage['fk.pace'] = 250  sticky across reloads
 *
 * `0` is off, and it is a first-class setting rather than a debug flag. A
 * watchable table costs 2.5-4x the wall time of an instant one, so anything
 * that plays whole games back to back has to turn it off. For the audit suite
 * that is the positional URL, not `--url`:
 *
 *   npm run audit -- --games=1 'http://127.0.0.1:4173/freekill/?pace=0'
 *
 * Two details of `scripts/audit/run.mjs` are why it reads the way it does, and
 * both are worth knowing before changing this. Its flag parser is
 * `hit.split('=')[1]`, so `--url=…?pace=0` silently loses everything from the
 * second `=` and arrives as `…?pace`; the positional argument bypasses that.
 * And it normalises the URL by appending `/`, which lands inside the query as
 * `?pace=0/` — hence the trailing slash this tolerates. A switch that only
 * works when nobody normalises the URL is not a switch the one caller that
 * needs it can reach.
 *
 * Nothing else about the harness is known here. The app behaves identically
 * whether or not it is being watched, which is the whole point of auditing it —
 * a table that quietly played differently under observation would make every
 * timing the suite reports a fiction.
 *
 * Anything unparseable is ignored rather than treated as zero — a typo should
 * not silently make the game unwatchable — and the value is clamped to five
 * seconds so a stray `80000` cannot wedge a room that a person then has to work
 * out how to unwedge.
 */
const MAX_PACE_MS = 5_000;

export function resolvePaceMs(): number {
  const read = (raw: unknown): number | null => {
    if (raw === null || raw === undefined) return null;
    const text = String(raw).trim().replace(/\/+$/, '');
    if (text === '') return null;
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.min(MAX_PACE_MS, Math.round(n));
  };
  try {
    const fromWindow = read((window as { __fkPace?: unknown }).__fkPace);
    if (fromWindow !== null) return fromWindow;
    const { search, hash } = window.location;
    const query = new URLSearchParams(search);
    const fromSearch = read(query.get('pace'));
    if (fromSearch !== null) return fromSearch;
    const q = hash.indexOf('?');
    if (q >= 0) {
      const fromHash = read(new URLSearchParams(hash.slice(q + 1)).get('pace'));
      if (fromHash !== null) return fromHash;
    }
    const stored = read(window.localStorage?.getItem('fk.pace'));
    if (stored !== null) return stored;
  } catch {
    // A sandboxed iframe throws on `localStorage`, and a non-browser caller has
    // no `window` at all. Neither is a reason to have no tempo.
  }
  return DEFAULT_PACE_MS;
}

/** The order the host published in: flush index, then the engine's own counter. */
const firstSeq = (e: Envelope): number => e.messages[0]?.seq ?? 0;
const byWireOrder = (a: Envelope, b: Envelope): number =>
  a.batch - b.batch || firstSeq(a) - firstSeq(b);

/**
 * Does this message mean there is a table worth showing? Exported so the gate
 * can be tested without booting a VM — see `engine/__tests__/curtain.test.ts`
 * for why the list must include a *dealing* message and not only the seating.
 */
export const curtainLifts = (m: { command: string }): boolean =>
  m.command === 'ArrangeSeats' || m.command === 'Observe'
  || m.command === 'StartGame' || m.command === 'MoveCards';

/** Once envelopes are flowing, the curtain never outlives this. */
export const CURTAIN_GRACE_MS = 6_000;

/**
 * One envelope, one key — and the key has to name the envelope, not the flush.
 *
 * `${batch}:${to}` assumed one envelope per flush per recipient. That stopped
 * being true when `routeFlush` began splitting at public/private transitions
 * (`ecdc247`): a batch that alternates emits two envelopes to the same seat,
 * and under the old key the second was thrown away as a duplicate. In a
 * three-human 斗地主 the opening does exactly that, and the seat that lost its
 * second private run never received its hand — it sat at 0 cards with no
 * request while the engine waited on it and the other two watched a frozen
 * log. "We can't play a card, we have to refresh" — the refresh works because a
 * resync re-delivers the whole table.
 *
 * Within a batch the runs are contiguous and disjoint, so every envelope starts
 * at a different seq — the same value `byWireOrder` sorts on — while a genuine
 * redelivery still collides on all three fields and is still dropped, which is
 * the property this set exists for.
 */
export const envelopeKey = (e: Envelope): string =>
  `${e.batch}:${e.to ?? 'all'}:${e.messages[0]?.seq ?? 0}`;

export interface Reassembly {
  /** Take one envelope off the wire. */
  receive(env: Envelope): void;
  stop(): void;
}

/**
 * Put a seat's two topics back into one ordered stream. See the long note at
 * its use site for why this is needed at all.
 *
 * Exported for its own test: this is ordering logic, and ordering logic that
 * can only be exercised through a live Realtime connection is ordering logic
 * nobody checks.
 */
export function reassemble(
  mySeat: number,
  emit: (env: Envelope) => void,
  holdMs: number = ORDER_HOLD_MS,
  now: () => number = () => Date.now(),
): Reassembly {
  /** Highest batch seen on each topic. Each topic is FIFO within itself. */
  let publicThrough = -1;
  let privateThrough = -1;
  const queue: { env: Envelope; at: number }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const drain = (): void => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (stopped) return;
    const t = now();
    const provable = Math.min(publicThrough, privateThrough);
    while (queue.length > 0) {
      const head = queue[0];
      const waited = t - head.at;
      if (head.env.batch > provable && waited < holdMs) {
        timer = setTimeout(drain, holdMs - waited);
        return;
      }
      queue.shift();
      emit(head.env);
    }
  };

  return {
    receive(env) {
      if (stopped) return;
      // A resync carries a negative batch and is the gate the held buffer opens
      // on, so it is never queued behind anything: `deliver` owns its rules.
      if (env.batch < 0) { emit(env); return; }
      if (env.to === null) publicThrough = Math.max(publicThrough, env.batch);
      else if (env.to === mySeat) privateThrough = Math.max(privateThrough, env.batch);
      // Insert from the back: envelopes arrive nearly sorted, so this is a
      // couple of comparisons, and it keeps the queue a plain array.
      let i = queue.length;
      while (i > 0 && byWireOrder(queue[i - 1].env, env) > 0) i -= 1;
      queue.splice(i, 0, { env, at: now() });
      drain();
    },
    stop() {
      stopped = true;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      queue.length = 0;
    },
  };
}

export interface TableStatus {
  readonly phase: TablePhase;
  /** What the player is looking at, in a sentence. */
  readonly note: string;
  /** Non-fatal problems worth showing even while the game plays. */
  readonly warnings: readonly string[];
}

export interface LiveTableSpec {
  readonly roomId: string;
  readonly client: LuaClient;
  /** The seat this tab occupies. `null` for an observer. */
  readonly mySeat: number | null;
  readonly isHost: boolean;
  readonly seats: readonly HostSeat[];
  readonly settings: Readonly<Record<string, unknown>>;
  onStatus(status: TableStatus): void;
}

export interface LiveTable {
  stop(): void;
}

export async function startLiveTable(spec: LiveTableSpec): Promise<LiveTable> {
  const { client, mySeat, roomId } = spec;
  let stopped = false;
  let phase: TablePhase = 'connecting';
  let note = tr(spec.isHost ? 'table.starting' : 'table.waitingForHost');
  const warnings: string[] = [];
  const report = () => { if (!stopped) spec.onStatus({ phase, note, warnings: [...warnings] }); };
  const setPhase = (p: TablePhase, n: string) => {
    if (phase === 'failed' && p !== 'failed') return;
    phase = p;
    note = n;
    report();
  };
  const warn = (text: string) => {
    if (warnings.includes(text)) return;
    warnings.push(text);
    console.warn(`[table] ${text}`);
    report();
  };
  report();

  const transport: GameTransport = await getGameTransport(roomId);
  if (stopped) { void transport.close(); return { stop() {} }; }

  /**
   * Broadcast has no history and no delivery guarantee to a channel nobody had
   * joined yet, so a seat that subscribes a moment after the host's first flush
   * simply never sees it — and that flush is the entire opening, including that
   * seat's own 选将 request. Waiting to publish does not help: the host cannot
   * observe when someone else's channel joins.
   *
   * So a joining seat does not try to be early, it asks. Everything that
   * arrives before the answer is held rather than applied, because feeding a
   * client VM `StartGame` before its player table exists errors inside Lua
   * (`clientbase.lua:420`). When the snapshot lands it is applied first, then
   * the held envelopes that postdate it, in order. The host stamps the snapshot
   * with the batch it is current as of, which is what makes "postdates it"
   * answerable.
   *
   * The host itself never waits for any of this: its own envelopes are handed
   * over in-process, in order, and can never be missed.
   */
  const resyncs = !spec.isHost && mySeat !== null;
  const applied = new Set<string>();
  const held: Envelope[] = [];
  let resynced = !resyncs;
  /** The batch the snapshot was current as of. Everything at or below it is in. */
  let syncedThrough = -1;
  let dealt = false;

  /**
   * Is this the message that makes the table worth looking at?
   *
   * The curtain is a full-viewport overlay and lifting it is a promise that
   * there is a game behind it. This used to lift on the first envelope that
   * carried any message at all, which held only because envelopes used to be
   * one-per-batch-per-recipient: whatever the first one was, the whole opening
   * batch came with it.
   *
   * Splitting envelopes at public/private transitions broke that, and broke it
   * for the host alone. A guest never applies a live envelope first — it holds
   * everything until its resync lands, and that snapshot is `[...preamble,
   * Observe]`, a whole table. The host has no resync at all (`resyncs` is
   * false for it, and see the note above about its envelopes being handed over
   * in-process), so it applies the opening one small run at a time — and the
   * first of those can be a lone `EnterRoom`. Curtain up, nothing behind it:
   * a bare table with one half-built photo on it and no way to interact.
   *
   * IT TRAPPED THE HOST IN 斗地主. The first version of this gate lifted on
   * exactly two names, `ArrangeSeats` and `Observe`, and that held for the
   * eight-seat role game every audit plays. Three-player 斗地主 composes its
   * opening differently — `webmodes` overrides `assignRoles` and
   * `chooseGenerals` wholesale — and the host, which has no resync and so never
   * sees `Observe`, sat under the curtain for the entire game with zero live
   * controls while the two guests played. Reproduced with three real browsers
   * on production: 150 seconds, cards dealt, log advancing, host frozen.
   *
   * The lesson is that the gate must not be a list of message names, because
   * every mode is free to compose its opening its own way. What every mode has
   * in common is that it DEALS: a `MoveCards` means there is a hand on a table,
   * and `StartGame` means the engine considers the game begun. Those two are
   * added alongside the original pair, which are kept because they arrive
   * earlier in the modes that send them.
   *
   * And a backstop, because a gate that can be wrong is a gate that can trap
   * someone: once envelopes are flowing, the curtain does not outlive
   * `CURTAIN_GRACE_MS` whatever they contain. A seat looking at a slightly
   * under-built table can still play; a seat looking at a curtain cannot.
   */
  const rendersATable = curtainLifts;
  let firstEnvelopeAt: number | null = null;

  const readVmErrors = (): readonly string[] => {
    const read = (client as Partial<RetainingClient>).vmErrors;
    try { return typeof read === 'function' ? read.call(client) : []; } catch { return []; }
  };
  let vmErrorCount = readVmErrors().length;

  const apply = (env: Envelope): void => {
    // The public channel and this seat's private channel are separate topics
    // with no ordering guarantee between them, so a flush the snapshot already
    // contains can still turn up after it. Applying it again would move the
    // same cards twice.
    if (env.batch >= 0 && env.batch <= syncedThrough) return;
    const key = envelopeKey(env);
    if (applied.has(key)) return;
    applied.add(key);
    try {
      client.deliverEnvelope(env);
    } catch (e) {
      console.error('[table] the client VM rejected an envelope', e);
      warn(tr('table.warn.batch', { error: errorText(e) }));
      return;
    }
    // The engine's client Lua collects its errors instead of throwing, so a
    // stream it cannot make sense of produces a frozen table and total silence.
    // Reading them turns that into something the player and the console can see.
    const errs = readVmErrors();
    if (errs.length > vmErrorCount) {
      const latest = errs[errs.length - 1];
      vmErrorCount = errs.length;
      console.error(`[table] the client VM rejected game data: ${latest}`);
      warn(tr('table.warn.batch', { error: latest }));
    }
    if (!dealt && env.messages.length > 0) {
      firstEnvelopeAt ??= Date.now();
      const overdue = Date.now() - firstEnvelopeAt > CURTAIN_GRACE_MS;
      if (env.messages.some(rendersATable) || overdue) {
        if (overdue && !env.messages.some(rendersATable)) {
          console.warn('[table] lifting the curtain on the grace timer: no dealing message seen in',
            CURTAIN_GRACE_MS, 'ms of envelopes');
        }
        dealt = true;
        setPhase('live', '');
      }
    }
  };

  const deliver = (env: Envelope): void => {
    if (stopped || env.roomId !== roomId) return;
    if (env.batch >= 0) {
      if (!resynced) {
        // Bounded, and the oldest is the right thing to drop: anything the
        // snapshot predates is discarded on arrival anyway.
        held.push(env);
        if (held.length > HELD_LIMIT) held.shift();
        return;
      }
      apply(env);
      return;
    }
    // A resync.
    //
    // Only the first one counts. The request is retried until an answer lands,
    // so a slow answer produces two — and the second is a *newer* snapshot,
    // which is worse than useless: `Observe` reloads the room wholesale, so
    // applying it discards the request the first snapshot restored and the
    // dialog vanishes from under the player. Ignoring duplicates is not an
    // optimisation, it is the difference between recovering and appearing to.
    if (resynced) return;

    // `batch === -1 - asOf`.
    const asOf = -env.batch - 1;
    apply(env);
    resynced = true;
    syncedThrough = Math.max(syncedThrough, asOf);
    const catchUp = [...held].sort(byWireOrder);
    held.length = 0;
    for (const e of catchUp) apply(e);
  };

  const unsubs: (() => void)[] = [];
  let runner: HostRunner | null = null;
  const pendingReplies: { command: WireCommand; reply: unknown }[] = [];

  /**
   * The wire arrives on two topics; the game is one stream.
   *
   * A seated player subscribes `room:<id>` and `room:<id>:p:<seat>`, and those
   * are separate Realtime topics with no ordering guarantee between them. The
   * host's own send order is exact — `hostRunner` funnels every publish through
   * one promise chain for precisely this reason — but order at the sender is
   * not order at the receiver once two topics are involved.
   *
   * The damage is permanent rather than transient. Measured over 38 two-seat
   * games with the engine's own `event_id` on each move: the host seat, fed
   * in-process, had 0 inversions in 17,853 moves; the remote seat had 72 in
   * 17,808, in 21 of the 38 games. One of them, card 80: the truth was
   * `draw -> hand(2)` (private to seat 2) then `hand(2) -> processing`
   * (public). Seat 2 received the public one first. `removeFrom` on a card the
   * hand does not hold yet is a silent no-op, the later `addTo` appends it, and
   * the card is wedged in that hand for the rest of the game. The same
   * inversion has left a card in the equip zone and the hand at once.
   *
   * Not fixed by making the store idempotent: the same misordering also
   * reorders the battle log, the animations and the request lifecycle, and a
   * store that shrugged it off would hide all of those while leaving them
   * wrong.
   *
   * Not fixed by moving everything to one topic either — the private topic is
   * what keeps one seat's cards out of another seat's socket, which is the
   * privacy property `routing.ts` exists to guarantee.
   *
   * So the receiver reassembles. `batch` is a flush index, strictly increasing
   * per room, and within a flush `messages[0].seq` orders the public envelope
   * against this seat's private one — the same key `routing.ts` uses to rebuild
   * a seat's stream. An envelope is released the moment order is *provable*:
   * each topic is FIFO in itself, so seeing batch B on a topic proves every
   * earlier batch on that topic has already arrived, and an envelope at or
   * below both topics' high-water marks can have nothing outstanding before it.
   * Only when that cannot be shown does it wait, and then for at most
   * `ORDER_HOLD_MS` — the two topics ride one websocket and are fanned out by
   * the same server, so the skew is milliseconds; the cap is what keeps a quiet
   * private topic from stalling the table rather than a guess at the delay.
   *
   * Neither an observer nor the host pays for any of it. An observer has one
   * topic and no second stream to merge, and the host's own envelopes never
   * touch the wire at all — `onLocalEnvelope` hands them to `deliver` in the
   * order the engine produced them.
   */
  const inOrder = mySeat === null ? null : reassemble(mySeat, deliver);
  unsubs.push(() => inOrder?.stop());
  unsubs.push(transport.onEnvelope(mySeat, inOrder ? inOrder.receive : deliver));

  // Everything this seat decides goes back to whoever is authoritative: the
  // runner in this very tab if we are the host, the wire otherwise.
  unsubs.push(client.onReply((command, reply) => {
    if (stopped || mySeat === null) return;
    if (spec.isHost) {
      if (runner) runner.submit(mySeat, reply);
      else pendingReplies.push({ command, reply });
      return;
    }
    void transport.sendReply({ roomId, playerId: mySeat, command, reply })
      .catch((e: unknown) => warn(tr('table.warn.play', { error: errorText(e) })));
  }));

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    for (const off of unsubs) off();
    runner?.stop();
    void transport.close().catch(() => {});
  };

  if (spec.isHost) {
    if (mySeat === null) throw new Error(tr('table.error.hostNoSeat'));
    try {
      setPhase('dealing', tr('table.dealing'));
      runner = await startHostRunner({
        roomId,
        seats: spec.seats,
        hostSeat: mySeat,
        settings: spec.settings,
        transport,
        // Only the host paces, because only the host decides when the engine
        // takes its next step. Every other seat is watching the same beats
        // arrive over the wire.
        paceMs: resolvePaceMs(),
        onLocalEnvelope: deliver,
        onFault: (m, fatal) => {
          if (fatal) setPhase('failed', m);
          else warn(m);
        },
        onGameOver: () => setPhase('over', ''),
      });
      if (stopped) { runner.stop(); return { stop() {} }; }
      for (const r of pendingReplies) runner.submit(mySeat, r.reply);
      pendingReplies.length = 0;
    } catch (e) {
      setPhase('failed', tr('table.error.start', { error: errorText(e) }));
      console.error('[table] host runner failed to start', e);
      return { stop };
    }
  } else if (resyncs) {
    // Ask, and keep asking until the snapshot lands — not merely until *some*
    // envelope lands. A live envelope arriving first proves the channel works;
    // it proves nothing about the opening, which is the part that gets missed.
    void (async () => {
      await transport.ready(mySeat === null ? [] : [mySeat]).catch((e: unknown) => {
        warn(tr('table.warn.channel', { error: errorText(e) }));
      });
      for (let i = 0; i < 60 && !stopped && !resynced; i++) {
        if (mySeat !== null) {
          await transport.requestResync(mySeat).catch((e: unknown) => {
            warn(tr('table.warn.resync', { error: errorText(e) }));
          });
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
      if (!stopped && !resynced) {
        setPhase('failed', tr('table.error.hostSilent'));
      }
    })();
  }

  return { stop };
}
