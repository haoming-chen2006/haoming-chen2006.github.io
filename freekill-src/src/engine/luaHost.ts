import type { DecisionRecord, LuaHost, RoomSpec } from '../contract/engine.ts';
import type { Envelope, WireCommand } from '../contract/protocol.ts';
import type { LuaBundle } from './bundle.ts';
import { routeFlush } from './routing.ts';
import {
  PlayerState,
  type AddressedMessage,
  type AdvanceOptions,
  type AdvanceResult,
  type HostStats,
  type ReplayStatus,
  type ResumeResult,
} from './types.ts';
import { createLuaVm, type LuaVm, type VmOptions } from './vm.ts';

/** Raw shape `FKHost.flush()` returns: payloads deduped, messages referencing them. */
interface FlushJson {
  payloads: string[];
  data?: unknown[];
  msgs: { s: number; b: number; k: 'n' | 'r'; c: number; m: WireCommand; p: number; n: number }[];
}

export interface HostOptions extends VmOptions {
  /** Safety valve for `advance()`. A full 8-player game takes ~365 resumes. */
  maxResumes?: number;
  /**
   * Also hand back the CBOR-decoded payload on each `WireMessage.data`.
   * Costs a decode and roughly doubles the envelope's JSON size; the client VM
   * does not need it, because it is fed the raw payload. Fixtures, debugging
   * and anything that inspects traffic do.
   */
  decodeData?: boolean;
  /**
   * Coalesce `SetCardUseHistory` / `SetSkillUseHistory` /
   * `SetSkillBranchUseHistory` within a flush.
   *
   * OFF by default, against `protocol.ts`'s recommendation, because the
   * measurement does not support it. Those three commands really are ~70% of
   * the message count, but they are not redundant: `Room` resets them per
   * player per scope (`lua/lunarltk/server/room.lua:3660`), so within a flush
   * almost every one carries a distinct (player, name, scope) key. Measured
   * over a full game: 35 of 12,523 messages removed (0.28%), for 5.4s of extra
   * CBOR decoding. The batching win is real and comes from `Envelope` instead -
   * 12,523 messages become 860 envelopes.
   */
  coalesce?: boolean;
}

/**
 * The authoritative server VM.
 *
 * In production this runs inside a Web Worker; `src/worker` wraps exactly this
 * class and adds a message port. There is therefore one implementation of the
 * rules-facing behaviour, and the headless tests drive the same one the browser
 * does.
 */
export class InProcessLuaHost implements LuaHost {
  private vm: LuaVm;
  private opts: HostOptions;
  private roomId = '';
  private internalRoomId = 1;
  private seats: readonly number[] = [];
  private decisionCursor = 1;
  private outputHandlers = new Set<(e: Envelope) => void>();
  private rawHandlers = new Set<(m: readonly AddressedMessage[]) => void>();
  private decisionHandlers = new Set<(d: DecisionRecord) => void>();
  private disposed = false;

  private constructor(vm: LuaVm, opts: HostOptions) {
    this.vm = vm;
    this.opts = opts;
  }

  static async create(bundle: LuaBundle, opts: HostOptions = {}): Promise<InProcessLuaHost> {
    const vm = await createLuaVm(bundle, opts);
    vm.lua.doStringSync(`dofile('lua/web/host.lua')`);
    if (vm.lua.doStringSync(`return FKHost.boot()`) !== true) {
      throw new Error('FKHost.boot() did not return true');
    }
    return new InProcessLuaHost(vm, opts);
  }

  /** Escape hatch for tests that need to poke the VM. Not part of `LuaHost`. */
  get lua() {
    return this.vm.lua;
  }

  get seatIds(): readonly number[] {
    return this.seats;
  }

  private str(expr: string): string {
    return String(this.vm.lua.doStringSync(`return ${expr}`));
  }

  private json<T>(expr: string): T {
    return JSON.parse(this.str(expr)) as T;
  }

  private set(name: string, value: string): void {
    this.vm.lua.global.set(name, value);
  }

  /* ------------------------------------------------------------- contract */

  async createRoom(spec: RoomSpec): Promise<void> {
    this.roomId = spec.roomId;
    this.seats = spec.seats.map((s) => s.connId);
    this.set('__fk_spec', JSON.stringify({ ...spec, id: this.internalRoomId }));
    if (this.vm.lua.doStringSync(`return FKHost.createRoom(__fk_spec)`) !== true) {
      throw new Error('FKHost.createRoom failed');
    }
    await this.pump();
  }

  /**
   * One `ResumeRoom`. Returns whether the game is over.
   *
   * The clock is the whole of determinism: the engine's only time source is the
   * host's virtual clock, and it moves exactly as far as the caller says. In
   * headless mode that is the delay the engine itself asked for, so a game
   * replays identically and runs at full speed.
   */
  async resume(reason?: string): Promise<boolean> {
    const res = await this.resumeRaw(reason ?? null, 0);
    if (res.err) throw new Error(`ResumeRoom: ${res.err}`);
    await this.pump();
    return res.over;
  }

  async submitReply(playerId: number, reply: unknown): Promise<void> {
    this.set('__fk_reply', JSON.stringify(reply ?? null));
    this.vm.lua.doStringSync(`FKHost.pushReplyValue(${playerId}, __fk_reply)`);
  }

  onOutput(handler: (envelope: Envelope) => void): () => void {
    this.outputHandlers.add(handler);
    return () => this.outputHandlers.delete(handler);
  }

  onDecision(handler: (d: DecisionRecord) => void): () => void {
    this.decisionHandlers.add(handler);
    return () => this.decisionHandlers.delete(handler);
  }

  /**
   * Everything the engine emitted with its recipient still attached, before
   * routing. Not part of `LuaHost`: it exists so the routing test can invert
   * the split and check it against the truth rather than against itself.
   */
  onRaw(handler: (messages: readonly AddressedMessage[]) => void): () => void {
    this.rawHandlers.add(handler);
    return () => this.rawHandlers.delete(handler);
  }

  /**
   * Rebuild a room from seed + log, then continue live. Host migration.
   *
   * Nothing about a resumed room is special afterwards. The log is forced in at
   * the one place a decision is accepted (`Request:_checkReply`), so the AI is
   * never consulted for a decision the log already holds — which is also why
   * the AI's own ordering sensitivity cannot break migration.
   */
  async replay(spec: RoomSpec, log: readonly DecisionRecord[]): Promise<void> {
    this.set('__fk_replaylog', JSON.stringify(log));
    this.vm.lua.doStringSync(`FKHost.setReplayLog(__fk_replaylog)`);
    await this.createRoom(spec);
    const res = await this.advance({ maxResumes: this.opts.maxResumes, stopWhenLogExhausted: true });
    const status = await this.replayStatus();
    if (status.divergence) throw new Error(`replay diverged: ${status.divergence}`);
    if (res.err) throw new Error(`replay: ${res.err}`);
    if (status.applied !== log.length) {
      throw new Error(`replay applied ${status.applied} of ${log.length} decisions`);
    }
    this.vm.lua.doStringSync(`FKHost.clearReplayLog()`);
  }

  async stateDigest(): Promise<string> {
    return this.str(`FKHost.digest(${this.internalRoomId})`);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.vm.close();
  }

  /* ----------------------------------------------------------- extensions */

  private async resumeRaw(reason: string | null, advanceUs: number): Promise<ResumeResult> {
    this.set('__fk_reason', reason ?? '');
    const r = this.json<Partial<ResumeResult>>(
      `FKHost.resume(${this.internalRoomId}, __fk_reason, ${Math.max(0, Math.floor(advanceUs))})`,
    );
    return { over: r.over ?? false, delayMs: r.delayMs ?? 0, requestTimerMs: r.requestTimerMs, err: r.err };
  }

  /**
   * Resume until the room is waiting on a human, ends, or runs out of budget.
   * Bot decisions and animation delays are progress; a seat that is online and
   * burning its timer with nothing queued is not.
   */
  async advance(opts: AdvanceOptions = {}): Promise<AdvanceResult> {
    const max = opts.maxResumes ?? this.opts.maxResumes ?? 200_000;
    let reason = opts.reason ?? null;
    let advanceUs = Math.max(0, Math.floor(opts.advanceUs ?? 0));
    let last = opts.realtime ? performance.now() : 0;

    for (let i = 1; i <= max; i++) {
      const res = await this.resumeRaw(reason, advanceUs);
      await this.pump();
      if (res.err) return { over: true, resumes: i, waitingOn: [], stopped: 'error', err: res.err };
      if (res.over) return { over: true, resumes: i, waitingOn: [], stopped: 'over' };

      if (opts.stopWhenLogExhausted && this.logExhausted()) {
        return { over: false, resumes: i, waitingOn: [], stopped: 'log' };
      }

      const waiting = await this.pendingInput();
      if (waiting.length > 0) return { over: false, resumes: i, waitingOn: waiting, stopped: 'input' };

      reason = 'delay_done';
      if (opts.realtime) {
        const now = performance.now();
        advanceUs = Math.max(0, Math.round((now - last) * 1000));
        last = now;
      } else {
        advanceUs = res.delayMs * 1000;
      }
    }
    return { over: false, resumes: max, waitingOn: [], stopped: 'budget' };
  }

  /** Drain the engine's output and its decisions, and notify the handlers. */
  private async pump(): Promise<void> {
    const messages = this.drainRaw();
    if (messages.length > 0) {
      for (const h of this.rawHandlers) h(messages);
      for (const flush of routeFlush(messages, this.seats, this.roomId)) {
        for (const env of flush.envelopes) {
          for (const h of this.outputHandlers) h(env);
        }
      }
    }
    if (this.decisionHandlers.size > 0) {
      for (const d of this.decisionsFrom(this.decisionCursor)) {
        this.decisionCursor = d.seq + 1;
        for (const h of this.decisionHandlers) h(d);
      }
    } else {
      this.decisionCursor = this.decisionCount() + 1;
    }
  }

  /** Everything emitted since the last drain, with recipients intact. */
  drainRaw(): AddressedMessage[] {
    const decode = this.opts.decodeData ?? false;
    const coalesce = this.opts.coalesce ?? false;
    const raw = this.json<FlushJson>(`FKHost.flush(${decode}, ${coalesce})`);
    const out: AddressedMessage[] = new Array(raw.msgs.length);
    for (let i = 0; i < raw.msgs.length; i++) {
      const m = raw.msgs[i];
      out[i] = {
        seq: m.s,
        batch: m.b,
        kind: m.k === 'r' ? 'request' : 'notify',
        command: m.m,
        connId: m.c,
        payload: raw.payloads[m.p - 1],
        data: decode ? raw.data?.[m.p - 1] : undefined,
        bytes: m.n,
      };
    }
    this.vm.lua.doStringSync(`FKHost.trimStream()`);
    return out;
  }

  /** Every accepted decision from `from` (1-based). This plus the seed is the log. */
  decisionsFrom(from: number): DecisionRecord[] {
    return this.json<DecisionRecord[]>(`FKHost.decisionsFrom(${Math.max(1, from)})`);
  }

  decisionCount(): number {
    return Number(this.vm.lua.doStringSync(`return FKHost.decisionCount()`));
  }

  /** True once a replay has consumed its whole log and parked at the handover. */
  logExhausted(): boolean {
    return this.vm.lua.doStringSync(`return FKHost.logExhausted == true`) === true;
  }

  async replayStatus(): Promise<ReplayStatus> {
    const r = this.json<Partial<ReplayStatus>>(`FKHost.replayStatus()`);
    // Lua's json encoder drops nil fields, so an absent divergence arrives as
    // undefined; normalise it, because "no divergence" is a result, not a gap.
    return {
      applied: r.applied ?? 0,
      total: r.total ?? 0,
      divergence: r.divergence ?? null,
      exhausted: r.exhausted ?? false,
    };
  }

  /** `room:serialize()` in a portable projection, as canonical JSON. Tests only. */
  async stateJson(): Promise<unknown> {
    return JSON.parse(this.str(`FKHost.stateJson(${this.internalRoomId})`));
  }

  /** `HandleRequest("<roomId>,<playerId>,<command>")` — reconnect/observe/leave/surrender. */
  async request(playerId: number, command: string): Promise<void> {
    this.set('__fk_req', `${this.internalRoomId},${playerId},${command}`);
    const res = this.json<{ error?: string }>(`FKHost.handleRequest(__fk_req)`);
    if (res.error) throw new Error(`HandleRequest(${command}): ${res.error}`);
    await this.pump();
  }

  /** Queue a reply as raw bytes — the client VM's own CBOR, never re-encoded. */
  async pushReplyRaw(connId: number, payloadB64: string): Promise<void> {
    this.set('__fk_reply_raw', payloadB64);
    this.vm.lua.doStringSync(`FKHost.pushReplyRaw(${connId}, __fk_reply_raw)`);
  }

  /** The three messages a joining client needs before any game traffic. */
  async joinPreamble(playerId: number): Promise<{ command: WireCommand; payload: string }[]> {
    return this.json(`FKHost.joinPreamble(${this.internalRoomId}, ${playerId})`);
  }

  /** A full room snapshot from one seat's view, for reconnect and observe. */
  async resyncPayload(playerId: number): Promise<string> {
    return this.str(`FKHost.resyncPayload(${this.internalRoomId}, ${playerId})`);
  }

  async addObserver(connId: number, playerId: number, name?: string, avatar?: string): Promise<void> {
    this.set('__fk_obs_name', name ?? `obs${playerId}`);
    this.set('__fk_obs_avatar', avatar ?? 'guojia');
    this.vm.lua.doStringSync(
      `FKHost.addObserverSeat(${this.internalRoomId}, ${connId}, ${playerId}, __fk_obs_name, __fk_obs_avatar)`,
    );
    this.seats = [...this.seats, connId];
    await this.request(playerId, 'observe');
  }

  async removeObserver(playerId: number): Promise<void> {
    await this.request(playerId, 'leave');
    this.vm.lua.doStringSync(`FKHost.removeObserverSeat(${this.internalRoomId}, ${playerId})`);
    this.seats = this.seats.filter((c) => c !== playerId);
  }

  async setPlayerState(playerId: number, state: number): Promise<void> {
    this.vm.lua.doStringSync(`FKHost.setPlayerState(${this.internalRoomId}, ${playerId}, ${state})`);
  }

  async pendingInput(): Promise<number[]> {
    return this.json<number[]>(`FKHost.pendingInput(${this.internalRoomId})`);
  }

  async stats(): Promise<HostStats> {
    return this.json<HostStats>(`FKHost.stats()`);
  }
}

/** Eight seats, one of them a trusteed human — the shape a bot game needs. */
export function allBotSeats(n = 8, humanSeat = 1) {
  return Array.from({ length: n }, (_, i) => ({
    playerId: i + 1,
    connId: i + 1,
    screenName: `player${i + 1}`,
    avatar: 'guojia',
    // `ServerRoomBase:checkNoHuman` ends any room whose seats are all Robot.
    state: (i + 1 === humanSeat ? PlayerState.Trust : PlayerState.Robot) as 1 | 2 | 5,
  }));
}

