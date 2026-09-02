/**
 * The table's tempo.
 *
 * `liveTable.test.ts` proves the driver plays a real game; this proves it plays
 * one at a speed a person can follow, and — just as important — that it does
 * not do so by lying to the engine or by making a human wait.
 *
 * The host here is a stub rather than a Lua VM on purpose. What is under test
 * is a scheduling decision the driver makes from `AdvanceResult`, and a stub
 * lets that decision be checked in milliseconds against an exact script of
 * engine answers, including the two cases a real game makes rare and awkward to
 * reach: a beat that ends waiting on a human, and a beat the engine wanted
 * shorter than the cap.
 */
import { describe, expect, it } from 'vitest';
import type { DecisionRecord, RoomSpec } from '../../contract/engine.ts';
import type { Envelope } from '../../contract/protocol.ts';
import type { AdvanceOptions, AdvanceResult } from '../../engine/types.ts';
import { loopbackTransport } from '../api/transport.ts';
import { startHostRunner, type GameHost, type HostSeat } from '../hostRunner.ts';
import { resolvePaceMs } from '../liveTable.ts';
import { DEFAULT_PACE_MS } from '../hostRunner.ts';

const SEATS: HostSeat[] = [
  { seat: 1, displayName: 'me', avatar: 'caocao', isBot: false, connection: 'online' },
  { seat: 2, displayName: 'bot', avatar: 'guojia', isBot: true, connection: 'online' },
];

/** One scripted answer from the engine, and what it costs to produce. */
type Beat = Partial<AdvanceResult>;

interface Recorded {
  /** Milliseconds since the runner started, when this `advance` was called. */
  at: number;
  opts: AdvanceOptions;
}

/**
 * An engine that answers from a script and records when it was asked.
 *
 * Every field the driver reads is scripted; the beat after the script runs out
 * ends the game, so a test can never hang on a runner that stopped pacing.
 */
function scriptedHost(beats: Beat[]): { host: GameHost; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const t0 = Date.now();
  let i = 0;
  const host: GameHost = {
    async createRoom() {},
    async advance(opts: AdvanceOptions = {}) {
      calls.push({ at: Date.now() - t0, opts });
      const beat = beats[i++];
      if (!beat) return { over: true, resumes: 1, waitingOn: [], delayMs: 0, stopped: 'over' };
      return {
        over: false,
        resumes: 1,
        waitingOn: [],
        delayMs: 0,
        stopped: 'budget',
        ...beat,
      } as AdvanceResult;
    },
    async submitReply() {},
    onOutput(_h: (e: Envelope) => void) { return () => {}; },
    onDecision(_h: (d: DecisionRecord) => void) { return () => {}; },
    async joinPreamble() { return []; },
    async resyncPayload() { return ''; },
    async pendingInput() { return []; },
    dispose() {},
  };
  return { host, calls };
}

async function play(beats: Beat[], paceMs?: number): Promise<Recorded[]> {
  const { host, calls } = scriptedHost(beats);
  const faults: string[] = [];
  let over = false;
  const runner = await startHostRunner({
    roomId: 'pace-test',
    seats: SEATS,
    hostSeat: 1,
    settings: {},
    transport: loopbackTransport('pace-test'),
    paceMs,
    createHost: async () => host,
    onLocalEnvelope: () => {},
    onFault: (m) => faults.push(m),
    onGameOver: () => { over = true; },
  });
  const deadline = Date.now() + 10_000;
  while (!over && Date.now() < deadline) await new Promise((r) => setTimeout(r, 5));
  runner.stop();
  expect(faults).toEqual([]);
  expect(over).toBe(true);
  return calls;
}

/** Wall time between consecutive `advance` calls. */
const gaps = (calls: Recorded[]): number[] =>
  calls.slice(1).map((c, i) => c.at - calls[i].at);

const bot = (delayMs: number): Beat => ({ delayMs, stopped: 'budget' });

describe('a bot turn a person can follow', () => {
  /**
   * The bug, stated as a test: five actions in one frame.
   *
   * Left to itself the driver asks the engine for the next step the instant the
   * last one returned, so a whole bot turn arrives in one flush. Nothing about
   * that is wrong for a headless game, which is why it stayed — and it is why
   * the default has to be no pacing at all.
   */
  it('runs flat out when nobody asked for a tempo', async () => {
    const calls = await play([bot(800), bot(800), bot(800), bot(800)]);
    expect(calls.length).toBeGreaterThanOrEqual(4);
    // Every step within a frame or two of the last, exactly as before.
    for (const g of gaps(calls).slice(0, 4)) expect(g).toBeLessThan(50);
    // And the engine's own loop is left alone: no step budget is imposed.
    for (const c of calls) expect(c.opts.maxResumes).toBeUndefined();
  });

  /**
   * The fix. The engine asked for 800ms after the AI answered; the driver is
   * capped at 60, so each beat costs 60ms of real time and the next step is
   * taken one at a time rather than in one burst.
   */
  it('spends the delay the engine asked for, up to the cap', async () => {
    const calls = await play([bot(800), bot(800), bot(800), bot(800)], 60);
    expect(calls.length).toBeGreaterThanOrEqual(4);
    for (const g of gaps(calls).slice(0, 4)) expect(g).toBeGreaterThanOrEqual(50);
    // One resume per beat, or `advance` would run the bot's whole turn before
    // the driver ever got the chance to pause.
    for (const c of calls) expect(c.opts.maxResumes).toBe(1);
  });

  /**
   * A cap, not a metronome. The engine asks for 50ms in turn flow and 400ms at
   * a judge reveal, and those beats are meant to be short — scaling everything
   * to the cap would flatten a rhythm the game was designed with.
   */
  it('leaves a beat the engine wanted short short', async () => {
    const calls = await play([bot(30), bot(30), bot(30), bot(30)], 400);
    for (const g of gaps(calls).slice(0, 4)) expect(g).toBeLessThan(150);
  });

  /**
   * The rule that matters most: a person is never made to wait.
   *
   * The engine can finish a bot's beat and open a question to a human in the
   * same resume, which reports both a delay and `stopped: 'input'`. Spending
   * the delay there would buy nothing — the question has already been published
   * — and would cost that person up to a full beat before their answer is even
   * submitted. So the pause is skipped outright whenever the room came back
   * waiting on someone.
   */
  it('never spends a beat while the room is waiting on a seat', async () => {
    const asking: Beat = { delayMs: 2_000, stopped: 'input', waitingOn: [1] };
    const calls = await play([asking, asking, asking], 2_000);
    expect(calls.length).toBeGreaterThanOrEqual(3);
    // What is left is `POLL_MS`, the nap that nudges the clock while a seat
    // thinks — 400ms. A beat spent here would make it 2.4 seconds.
    for (const g of gaps(calls).slice(0, 3)) expect(g).toBeLessThan(900);
  });

  /**
   * The engine parks a delay on a `delay_done` resume reason and accepts
   * anything on the rest. Saying `delay_done` once the beat has actually been
   * spent is the truthful answer, and `request_timer` — which would drop every
   * human from the open ask on the spot — is never said at all.
   */
  it('tells the engine the truth about why it woke up', async () => {
    const calls = await play([bot(800), bot(800), bot(0), bot(800)], 40);
    expect(calls[0].opts.reason).toBeNull();
    expect(calls[1].opts.reason).toBe('delay_done');
    expect(calls[2].opts.reason).toBe('delay_done');
    // Beat 3 asked for nothing, so nothing was spent, so there is nothing to
    // report as done.
    expect(calls[3].opts.reason).toBeNull();
    for (const c of calls) expect(c.opts.reason).not.toBe('request_timer');
  });

  /** A stopped room must not sit out its last beat before letting go. */
  it('lets go of a beat the moment the room is torn down', async () => {
    const { host, calls } = scriptedHost([bot(800), bot(800), bot(800)]);
    const runner = await startHostRunner({
      roomId: 'pace-stop',
      seats: SEATS,
      hostSeat: 1,
      settings: {},
      transport: loopbackTransport('pace-stop'),
      paceMs: 4_000,
      createHost: async () => host,
      onLocalEnvelope: () => {},
      onFault: () => {},
    });
    await new Promise((r) => setTimeout(r, 50));
    const t0 = Date.now();
    runner.stop();
    await new Promise((r) => setTimeout(r, 50));
    expect(Date.now() - t0).toBeLessThan(1_000);
    const settled = calls.length;
    await new Promise((r) => setTimeout(r, 100));
    expect(calls.length).toBe(settled);
  });
});

describe('picking a tempo without a rebuild', () => {
  const withWindow = <T>(patch: Record<string, unknown>, fn: () => T): T => {
    const g = globalThis as { window?: unknown };
    const had = 'window' in g;
    const before = g.window;
    g.window = {
      location: { search: '', hash: '' },
      localStorage: { getItem: () => null },
      ...patch,
    };
    try { return fn(); } finally {
      if (had) g.window = before; else delete g.window;
    }
  };

  it('falls back to the default when nothing says otherwise', () => {
    expect(withWindow({}, resolvePaceMs)).toBe(DEFAULT_PACE_MS);
  });

  it('takes a number off the query string, the hash or storage', () => {
    expect(withWindow({ location: { search: '?pace=250', hash: '' } }, resolvePaceMs)).toBe(250);
    expect(withWindow({ location: { search: '', hash: '#/room/abc?pace=900' } }, resolvePaceMs))
      .toBe(900);
    expect(withWindow(
      { location: { search: '', hash: '' }, localStorage: { getItem: () => '120' } },
      resolvePaceMs,
    )).toBe(120);
  });

  /** The setting a harness that plays whole games wants. */
  it('accepts zero, which is off', () => {
    expect(withWindow({ location: { search: '?pace=0', hash: '' } }, resolvePaceMs)).toBe(0);
  });

  /**
   * `scripts/audit/run.mjs` normalises `--url` by appending a slash, which
   * lands inside the query. A switch that only survives an unnormalised URL is
   * not a switch the one caller that needs it can actually reach.
   */
  it('reads the value past the slash the audit harness appends', () => {
    expect(withWindow({ location: { search: '?pace=0/', hash: '' } }, resolvePaceMs)).toBe(0);
    expect(withWindow({ location: { search: '?pace=250/', hash: '' } }, resolvePaceMs)).toBe(250);
  });

  it('prefers the most immediate source it is given', () => {
    expect(withWindow(
      { __fkPace: 30, location: { search: '?pace=250', hash: '' } },
      resolvePaceMs,
    )).toBe(30);
  });

  /**
   * A typo must not silently make the table unwatchable, and a stray zero too
   * many must not wedge a room that a person then has to work out how to
   * unwedge.
   */
  it('ignores nonsense and clamps the absurd', () => {
    expect(withWindow({ location: { search: '?pace=soon', hash: '' } }, resolvePaceMs)).toBe(DEFAULT_PACE_MS);
    expect(withWindow({ location: { search: '?pace=-5', hash: '' } }, resolvePaceMs)).toBe(DEFAULT_PACE_MS);
    expect(withWindow({ location: { search: '?pace=80000', hash: '' } }, resolvePaceMs)).toBe(5_000);
  });

  /** No `window` at all — a node caller — is not a reason to have no tempo. */
  it('survives having no browser to ask', () => {
    const g = globalThis as { window?: unknown };
    const had = 'window' in g;
    const before = g.window;
    delete g.window;
    try { expect(resolvePaceMs()).toBe(DEFAULT_PACE_MS); } finally { if (had) g.window = before; }
  });
});
