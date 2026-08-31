import type { DecisionRecord, RoomSpec } from '../contract/engine.ts';
import type { Envelope } from '../contract/protocol.ts';
import {
  headerFromSpec,
  specFromHeader,
  type CommandLogSink,
  type RoomLog,
} from './commandLog.ts';
import type { InProcessLuaHost } from './luaHost.ts';
import { streamFor } from './routing.ts';
import type { AddressedMessage, AdvanceOptions, AdvanceResult } from './types.ts';

export interface SessionOptions {
  log?: CommandLogSink;
  bundleSha?: string;
  onEnvelope?: (e: Envelope) => void;
  onDecision?: (d: DecisionRecord) => void;
  /**
   * Also keep every message with its recipient attached, so a test can check
   * the public/private split against what the engine actually addressed. Costs
   * a copy of the whole game's traffic; off outside tests.
   */
  keepRaw?: boolean;
}

/**
 * One room, wired up: engine in, log out, envelopes routed.
 *
 * This is the piece the shell and the worker both sit on. It keeps two
 * invariants that everything downstream depends on. Every envelope the engine
 * produces is recorded in arrival order, so a test can reconstruct exactly what
 * any one seat received. And every accepted decision is appended to the log
 * before anything else observes it, so a host that dies mid-flush leaves a log
 * that is still replayable.
 */
export class RoomSession {
  readonly host: InProcessLuaHost;
  readonly spec: RoomSpec;
  private opts: SessionOptions;
  private envelopes: Envelope[] = [];
  private raw = new Map<number, AddressedMessage[]>();
  private decisions: DecisionRecord[] = [];
  private unsubscribe: (() => void)[] = [];

  private constructor(host: InProcessLuaHost, spec: RoomSpec, opts: SessionOptions) {
    this.host = host;
    this.spec = spec;
    this.opts = opts;
  }

  private wire(): void {
    this.unsubscribe.push(
      this.host.onOutput((e) => {
        this.envelopes.push(e);
        this.opts.onEnvelope?.(e);
      }),
    );
    if (this.opts.keepRaw) {
      this.unsubscribe.push(
        this.host.onRaw((messages) => {
          for (const m of messages) {
            const list = this.raw.get(m.connId);
            if (list) list.push(m);
            else this.raw.set(m.connId, [m]);
          }
        }),
      );
    }
    this.unsubscribe.push(
      this.host.onDecision((d) => {
        this.decisions.push(d);
        this.opts.onDecision?.(d);
        void this.opts.log?.append([d]);
      }),
    );
  }

  static async start(
    host: InProcessLuaHost,
    spec: RoomSpec,
    opts: SessionOptions = {},
  ): Promise<RoomSession> {
    const s = new RoomSession(host, spec, opts);
    await opts.log?.open(headerFromSpec(spec, opts.bundleSha ?? ''));
    s.wire();
    await host.createRoom(spec);
    return s;
  }

  /**
   * Host migration: rebuild from the log in a fresh VM, then keep playing.
   *
   * Everything after this call is an ordinary live room. The returned session's
   * `decisions` holds the replayed history, so a caller can compare it boundary
   * by boundary against the original - which is the only honest way to prove a
   * replay is faithful. A final-state match hides divergence that self-corrects.
   */
  static async resume(
    host: InProcessLuaHost,
    log: RoomLog,
    opts: SessionOptions = {},
  ): Promise<RoomSession> {
    const spec = specFromHeader(log.header);
    const s = new RoomSession(host, spec, { ...opts, log: undefined });
    s.wire();
    await host.replay(spec, log.records);
    s.opts = opts;
    if (opts.log) {
      await opts.log.open(log.header);
      await opts.log.append(log.records);
    }
    return s;
  }

  /** Online / Trust / Offline. Trust keeps a dropped seat's room moving. */
  setPlayerState(playerId: number, state: number): Promise<void> {
    return this.host.setPlayerState(playerId, state);
  }

  advance(opts: AdvanceOptions = {}): Promise<AdvanceResult> {
    return this.host.advance(opts);
  }

  /** Everything the engine emitted, in arrival order, already routed. */
  get allEnvelopes(): readonly Envelope[] {
    return this.envelopes;
  }

  get allDecisions(): readonly DecisionRecord[] {
    return this.decisions;
  }

  /** Per-connection truth: what the engine addressed to whom, in order. */
  get rawByConn(): ReadonlyMap<number, readonly AddressedMessage[]> {
    return this.raw;
  }

  /** Exactly what one connection received over the room's whole life. */
  streamOf(connId: number) {
    return streamFor(this.envelopes, connId);
  }

  /** Bring a fresh or reloaded client up to date: preamble, then a full snapshot. */
  async resyncMessages(playerId: number) {
    const preamble = await this.host.joinPreamble(playerId);
    const snapshot = await this.host.resyncPayload(playerId);
    return [
      ...preamble.map((m) => ({ ...m, isRequest: false })),
      { command: 'Observe' as const, payload: snapshot, isRequest: false },
    ];
  }

  dispose(): void {
    for (const u of this.unsubscribe) u();
    this.unsubscribe = [];
  }
}
