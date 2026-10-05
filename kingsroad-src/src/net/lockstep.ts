import { TICK } from '../game/constants.ts';
import { hashWorld } from '../game/hash.ts';
import { idleCommand, type HeroCommand } from '../game/hero.ts';
import type { Simulation } from '../game/sim.ts';
import { decodeCmd, encodeCmd, type NetMsg, type WireFrame } from './protocol.ts';
import type { Room } from './room.ts';

export interface LockstepStats { tick: number; waitMs: number; desynced: boolean; rtt: number; behind: number }

/**
 * Deterministic lockstep over the room's broadcast channel, as a mesh: every human seat publishes its
 * input frames to everyone; a tick is stepped only once every human seat's input for it is known.
 * Inputs are scheduled `delay` ticks ahead so the network has time to deliver them. A seat that stops
 * sending is dropped by the host (broadcast), after which the bot drives that hero on every machine.
 */
export class Lockstep {
  tick = 0;
  desynced = false;
  private acc = 0;
  private frames = new Map<string, Map<number, HeroCommand>>();
  private dropped = new Map<string, number>(); // seat -> tick from which it is bot-driven
  private outbox: WireFrame[] = [];
  private lastSentTick = -1;
  private hashes = new Map<number, Map<string, number>>();
  private waitSince = 0;
  private rtt = 0;
  private pingN = 0;
  private pingSent = new Map<number, number>();
  private lastPingT = 0;
  private unsub: () => void;
  advanceStats: LockstepStats | null = null;
  onDesync: () => void = () => {};
  onDrop: (seat: string) => void = () => {};
  onLeave: (seat: string) => void = () => {};
  onChat: (name: string, text: string) => void = () => {};

  constructor(
    private sim: Simulation,
    private room: Room,
    readonly mySeat: string,
    readonly humanSeats: string[],
    readonly delay: number,
    readonly sendEvery: number,
  ) {
    for (const s of humanSeats) this.frames.set(s, new Map());
    this.unsub = room.onEvent((e) => {
      if (e.type === 'chat') this.onChat(e.name, e.text);
      if (e.type === 'msg') this.receive(e.msg);
    });
    // ticks before the first delayed input are idle for everyone
    for (const s of humanSeats) for (let t = 0; t < delay; t++) this.frames.get(s)!.set(t, idleCommand());
  }

  destroy(): void { this.unsub(); }

  private receive(m: NetMsg): void {
    switch (m.k) {
      case 'in': {
        const map = this.frames.get(m.seat);
        if (!map) return;
        for (const f of m.f) if (!map.has(f.t)) map.set(f.t, decodeCmd(f.c));
        break;
      }
      case 'hash': {
        let row = this.hashes.get(m.t);
        if (!row) { row = new Map(); this.hashes.set(m.t, row); }
        row.set(m.seat, m.h);
        this.checkHashes(m.t);
        break;
      }
      case 'drop': this.dropped.set(m.seat, Math.max(m.t, this.dropped.get(m.seat) ?? 0)); this.onDrop(m.seat); break;
      case 'leave': { const at = (m as { t?: number }).t ?? this.tick; this.dropped.set(m.seat, Math.max(at, this.dropped.get(m.seat) ?? 0)); this.onLeave(m.seat); break; }
      case 'ping': void this.room.sendMsg({ k: 'pong', n: m.n, s: m.s, to: '' }); break;
      case 'pong': { const s = this.pingSent.get(m.n); if (s !== undefined) { this.rtt = performance.now() - s; this.pingSent.delete(m.n); } break; }
      default: break;
    }
  }

  private checkHashes(t: number): void {
    const row = this.hashes.get(t);
    if (!row || this.desynced) return;
    const vals = [...row.values()];
    if (vals.length >= 2 && vals.some((v) => v !== vals[0])) { this.desynced = true; this.onDesync(); }
    for (const k of [...this.hashes.keys()]) if (k < t - 600) this.hashes.delete(k);
  }

  private ready(t: number): string | null {
    for (const s of this.humanSeats) {
      if (s === this.mySeat) continue;
      const d = this.dropped.get(s);
      if (d !== undefined && t >= d) continue;
      if (!this.frames.get(s)!.has(t)) return s;
    }
    return null;
  }

  /** Called every frame with this frame's local command; steps as many ticks as inputs allow. */
  advance(dt: number, cmd: HeroCommand): LockstepStats {
    this.acc += Math.min(dt, 0.25);
    // schedule my input for tick+delay (one command per tick; the same command repeats until the next frame)
    const my = this.frames.get(this.mySeat)!;
    const target = this.tick + this.delay;
    if (!my.has(target)) {
      const wire = encodeCmd(cmd);
      const decoded = decodeCmd(wire);
      // fill any gap (frames skipped while the sim was waiting) with the same command, consuming one-shot buttons once
      for (let t = this.lastSentTick + 1; t <= target; t++) {
        if (my.has(t)) continue;
        const c = t === target ? decoded : { ...decoded, skill: -1, dash: false, flash: false, recall: false, buy: null, levelSkill: -1 };
        my.set(t, c);
        this.outbox.push({ t, c: t === target ? wire : encodeCmd(c) });
      }
      this.lastSentTick = target;
    }
    if (this.outbox.length && (this.outbox[this.outbox.length - 1].t % this.sendEvery === 0 || this.outbox.length >= this.sendEvery * 2)) {
      const batch = this.outbox.slice(-this.sendEvery * 3); // resend a little history to survive a lost packet
      void this.room.sendMsg({ k: 'in', seat: this.mySeat, f: batch });
      this.outbox = this.outbox.slice(-this.sendEvery * 2);
    }
    let steps = 0;
    let waitingFor: string | null = null;
    while (this.acc >= TICK && steps < 8) {
      waitingFor = this.ready(this.tick);
      if (waitingFor) break;
      const cmds = new Map<string, HeroCommand>();
      for (const s of this.humanSeats) {
        const d = this.dropped.get(s);
        if (d !== undefined && this.tick >= d) continue;
        const c = this.frames.get(s)!.get(this.tick);
        if (c) cmds.set(s, c);
      }
      this.sim.step(TICK, cmds);
      this.tick++;
      this.acc -= TICK;
      steps++;
      if (this.tick % 60 === 0) {
        const h = hashWorld(this.sim.w);
        let row = this.hashes.get(this.tick); if (!row) { row = new Map(); this.hashes.set(this.tick, row); }
        row.set(this.mySeat, h);
        void this.room.sendMsg({ k: 'hash', seat: this.mySeat, t: this.tick, h });
        this.checkHashes(this.tick);
        for (const map of this.frames.values()) for (const k of [...map.keys()]) if (k < this.tick - 120) map.delete(k);
      }
    }
    const now = performance.now();
    if (waitingFor) {
      if (!this.waitSince) this.waitSince = now;
      // the host drops a seat that has been silent for a long time
      if (this.room.isHost && now - this.waitSince > 8000) { this.dropped.set(waitingFor, this.tick); void this.room.sendMsg({ k: 'drop', seat: waitingFor, t: this.tick }); this.onDrop(waitingFor); this.waitSince = 0; }
    } else this.waitSince = 0;
    if (now - this.lastPingT > 3000) { this.lastPingT = now; this.pingN++; this.pingSent.set(this.pingN, now); void this.room.sendMsg({ k: 'ping', n: this.pingN, s: now }); }
    if (this.acc > TICK * 20) this.acc = TICK * 20; // never try to catch up more than a third of a second
    this.advanceStats = { tick: this.tick, waitMs: waitingFor ? now - this.waitSince : 0, desynced: this.desynced, rtt: this.rtt, behind: Math.floor(this.acc / TICK) };
    return this.advanceStats;
  }

  /** Tell everyone this seat is gone; its hero becomes a bot. */
  async leave(reason?: string): Promise<void> { await this.room.sendMsg({ k: 'leave', seat: this.mySeat, reason, t: this.lastSentTick + 1 } as NetMsg); }
}
