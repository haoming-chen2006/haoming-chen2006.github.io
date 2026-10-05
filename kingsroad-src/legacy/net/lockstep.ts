import { TICK } from '../game/constants.ts';
import { applyAction, type Action } from '../game/actions.ts';
import { hashWorld } from '../game/hash.ts';
import { idleCommand, type HeroCommand } from '../game/hero.ts';
import type { Simulation } from '../game/sim.ts';
import { other, type Team } from '../game/types.ts';
import { decodeCmd, encodeCmd, type PeerMsg, type WireFrame } from './protocol.ts';

/**
 * Deterministic lockstep.
 *
 * Both browsers run the same simulation from the same seed. Each tick needs one input frame per
 * seat; a frame produced now is stamped for tick `now + delay`, sent to the other side and kept
 * locally, and the simulation only steps a tick once it holds both seats' frames for it. Nothing
 * but inputs crosses the wire, so the guest sees every effect, sound and first-person view from
 * its own copy of the world. Every second the two worlds are hashed and compared; a mismatch is
 * reported so the match can resync from the host's snapshot or be voided rather than silently
 * playing two different games.
 */
export interface LocalInput { cmd: HeroCommand; acts: Action[] }

export interface LockstepStats {
  /** ms the simulation has been waiting on the remote seat this frame (0 when running). */
  waitMs: number;
  delay: number;
  /** Ticks of remote input already buffered beyond the current tick. */
  remoteAhead: number;
  tick: number;
  desynced: boolean;
}

export interface LockstepLink {
  send(m: PeerMsg): void;
  onMessage(fn: (m: PeerMsg) => void): () => void;
}

const HASH_EVERY = 60;
const MAX_CATCHUP = 12;
/** Ticks of input history kept on both sides, so a snapshot restore can replay from a little way back. */
const HISTORY = 600;

export class LockstepDriver {
  tick = 0;
  readonly me: Team;
  readonly foe: Team;
  delay: number;
  sendEvery: number;
  desynced = false;
  onDesync: (tick: number) => void = () => {};
  onRemoteLeft: (reason: string) => void = () => {};
  onChat: (text: string) => void = () => {};
  onSnapshotRequest: (tick: number) => void = () => {};
  onSnapshot: (tick: number, data: unknown) => void = () => {};
  private local = new Map<number, WireFrame>();
  private remote = new Map<number, WireFrame>();
  private localHashes = new Map<number, number>();
  private remoteHashes = new Map<number, number>();
  private lastLocalTick = -1;
  private outbox: WireFrame[] = [];
  private acc = 0;
  private waitSince = -1;
  private lastResend = 0;
  private pendingActs: Action[] = [];
  private edge = { dash: false, release: false };
  private unsub: () => void;
  /** The last few [tick, hash] pairs this side computed, for play-tests that compare two browsers. */
  readonly debugHashes: [number, number][] = [];
  private sim: Simulation;
  private link: LockstepLink;

  constructor(sim: Simulation, me: Team, link: LockstepLink, opts: { delay: number; sendEvery: number }) {
    this.sim = sim; this.link = link;
    this.me = me; this.foe = other(me);
    this.delay = Math.max(1, Math.floor(opts.delay));
    this.sendEvery = Math.max(1, Math.floor(opts.sendEvery));
    this.unsub = link.onMessage((m) => this.receive(m));
  }

  private receive(m: PeerMsg): void {
    switch (m.k) {
      case 'in': for (const f of m.f) if (f && typeof f.t === 'number' && f.t >= this.tick - HISTORY && !this.remote.has(f.t)) this.remote.set(f.t, f); break;
      case 'hash': this.remoteHashes.set(m.t, m.h); this.compareHashes(m.t); break;
      case 'leave': this.onRemoteLeft(m.reason ?? 'left'); break;
      case 'chat': this.onChat(m.text); break;
      case 'snapreq': this.onSnapshotRequest(m.t); break;
      case 'snap': this.onSnapshot(m.t, m.d); break;
      default: break;
    }
  }

  private compareHashes(t: number): void {
    const a = this.localHashes.get(t), b = this.remoteHashes.get(t);
    if (a === undefined || b === undefined) return;
    this.localHashes.delete(t); this.remoteHashes.delete(t);
    if (a !== b && !this.desynced) {
      this.desynced = true;
      this.onDesync(t);
      // The host is the authority: the guest asks it for the world as it stands now.
      if (this.me === 1) this.link.send({ k: 'snapreq', t: this.tick });
    }
  }

  /** Buffer edge-triggered buttons and actions so a frame that arrives during a stall is never lost. */
  private absorb(input: LocalInput): void {
    if (input.cmd.dash) this.edge.dash = true;
    if (input.cmd.release) this.edge.release = true;
    if (input.acts.length) this.pendingActs.push(...input.acts);
  }

  private scheduleLocal(input: LocalInput): void {
    const target = this.tick + this.delay;
    if (target <= this.lastLocalTick) return;
    for (let t = this.lastLocalTick + 1; t <= target; t++) {
      const first = t === this.lastLocalTick + 1;
      const cmd: HeroCommand = { ...input.cmd, dash: first && this.edge.dash, release: first && this.edge.release };
      const frame: WireFrame = { t, c: encodeCmd(cmd) };
      if (first && this.pendingActs.length) { frame.x = this.pendingActs.splice(0); }
      this.local.set(t, frame);
      this.outbox.push(frame);
    }
    this.edge.dash = false; this.edge.release = false;
    this.lastLocalTick = target;
    if (this.outbox.length >= this.sendEvery) this.flush();
  }

  private resendRecent(): void {
    const from = Math.max(0, this.tick - this.delay - 2);
    const frames: WireFrame[] = [];
    for (let t = from; t <= this.lastLocalTick; t++) { const f = this.local.get(t); if (f) frames.push(f); }
    if (frames.length) this.link.send({ k: 'in', f: frames });
  }

  private flush(): void {
    if (!this.outbox.length) return;
    // Send a little history with every packet so one lost relay message never stalls the match.
    const recent = this.outbox.splice(0);
    const from = Math.max(0, recent[0].t - 2 * this.sendEvery);
    const extra: WireFrame[] = [];
    for (let t = from; t < recent[0].t; t++) { const f = this.local.get(t); if (f) extra.push(f); }
    this.link.send({ k: 'in', f: [...extra, ...recent] });
  }

  private stepOne(): void {
    const t = this.tick;
    const lf = this.local.get(t)!, rf = this.remote.get(t)!;
    const frames: [WireFrame, WireFrame] = this.me === 0 ? [lf, rf] : [rf, lf];
    const w = this.sim.w;
    for (const team of [0, 1] as Team[]) for (const a of frames[team].x ?? []) applyAction(w, team, a);
    const cmds: [HeroCommand, HeroCommand] = [decodeCmd(frames[0].c), decodeCmd(frames[1].c)];
    this.sim.step(TICK, cmds);
    this.local.delete(t - HISTORY); this.remote.delete(t - HISTORY);
    this.tick = t + 1;
    if (this.tick % HASH_EVERY === 0) {
      const h = hashWorld(w);
      this.localHashes.set(this.tick, h);
      this.debugHashes.push([this.tick, h]); if (this.debugHashes.length > 40) this.debugHashes.shift();
      this.link.send({ k: 'hash', t: this.tick, h });
      this.compareHashes(this.tick);
      for (const k of this.localHashes.keys()) if (k < this.tick - 600) this.localHashes.delete(k);
      for (const k of this.remoteHashes.keys()) if (k < this.tick - 600) this.remoteHashes.delete(k);
    }
  }

  /**
   * One rendered frame. Schedules the local input, then runs every tick that is both due on the
   * clock and complete on inputs. Returns how long the world has been stalled on the other seat.
   */
  advance(dt: number, input: LocalInput): LockstepStats {
    this.absorb(input);
    this.scheduleLocal(input);
    if (this.sim.w.phase === 'ended') return this.stats(0);
    this.acc = Math.min(this.acc + dt, TICK * MAX_CATCHUP);
    let ran = 0;
    while (this.acc >= TICK && ran < MAX_CATCHUP) {
      if (!this.local.has(this.tick)) this.scheduleLocal(input);
      if (!this.remote.has(this.tick)) break;
      this.stepOne();
      this.acc -= TICK;
      ran++;
    }
    // Behind the other side by a lot (their frames are piling up): catch up faster than real time.
    let ahead = 0;
    while (this.remote.has(this.tick + ahead)) ahead++;
    if (ahead > this.delay * 2 && ran < MAX_CATCHUP) {
      let extra = 0;
      while (extra < 3 && this.remote.has(this.tick) && this.local.has(this.tick)) { this.stepOne(); extra++; }
    }
    const stalled = (this.sim.w.phase as string) !== 'ended' && this.acc >= TICK && !this.remote.has(this.tick);
    if (stalled) {
      const now = performance.now();
      if (this.waitSince < 0) this.waitSince = now;
      // Whatever we are waiting on, the other side may be waiting on us: a packet sent before its driver
      // existed, or one the relay dropped. Re-offer our recent frames until the stall clears.
      if (now - this.lastResend > 250) { this.lastResend = now; this.resendRecent(); }
    } else this.waitSince = -1;
    return this.stats(stalled ? performance.now() - this.waitSince : 0);
  }

  private stats(waitMs: number): LockstepStats {
    let ahead = 0;
    while (this.remote.has(this.tick + ahead)) ahead++;
    return { waitMs, delay: this.delay, remoteAhead: ahead, tick: this.tick, desynced: this.desynced };
  }

  /**
   * The world was just replaced by the host's snapshot taken at `tick`. Continue from there: frames
   * for earlier ticks are history, later ones (on both sides) are still buffered and get replayed.
   */
  resyncTo(tick: number): void {
    this.tick = tick;
    this.acc = 0;
    this.desynced = false;
    this.localHashes.clear(); this.remoteHashes.clear();
    for (const k of this.remote.keys()) if (k < tick) this.remote.delete(k);
    // The host can only have stepped ticks it held our frames for, so `tick` never exceeds lastLocalTick + 1.
  }

  /** Lengthen the input delay (never shorten it mid-match: shortening would need frames that were never made). */
  setDelay(d: number): void { this.delay = Math.max(this.delay, Math.floor(d)); }

  /** Blank local input for a frame where the player is not looking at the game (menu open, etc.). */
  static idle(): LocalInput { return { cmd: idleCommand(), acts: [] }; }

  sendChat(text: string): void { this.link.send({ k: 'chat', text }); }
  sendLeave(reason?: string): void { this.link.send({ k: 'leave', reason }); }

  destroy(): void { this.unsub(); this.local.clear(); this.remote.clear(); }
}
