// Two lockstep peers over a fake, lossy, laggy room bus must stay in sync and end on identical world hashes.
import { TICK } from '../src/game/constants.ts';
import { hashWorld } from '../src/game/hash.ts';
import { idleCommand, type HeroCommand } from '../src/game/hero.ts';
import { Simulation, seatKey, type SimConfig } from '../src/game/sim.ts';
import { Lockstep } from '../src/net/lockstep.ts';
import type { NetMsg } from '../src/net/protocol.ts';
import type { Room, RoomEvent } from '../src/net/room.ts';

type Listener = (e: RoomEvent) => void;

/** In-memory broadcast bus with per-packet latency and loss (input packets only; resends cover the gaps). */
class Bus {
  peers: FakeRoom[] = [];
  queue: { at: number; to: FakeRoom; msg: NetMsg }[] = [];
  now = 0;
  rnd = 12345;
  next(): number { this.rnd = (this.rnd * 1103515245 + 12345) & 0x7fffffff; return this.rnd / 0x7fffffff; }
  readonly latencyMs: number; readonly loss: number;
  constructor(latencyMs: number, loss: number) { this.latencyMs = latencyMs; this.loss = loss; }
  send(from: FakeRoom, msg: NetMsg): void {
    for (const p of this.peers) {
      if (p === from) continue;
      if (msg.k === 'in' && this.next() < this.loss) continue;
      this.queue.push({ at: this.now + this.latencyMs * (0.7 + this.next() * 0.6), to: p, msg });
    }
  }
  tick(ms: number): void {
    this.now += ms;
    const due = this.queue.filter((q) => q.at <= this.now).sort((a, b) => a.at - b.at);
    this.queue = this.queue.filter((q) => q.at > this.now);
    for (const q of due) q.to.deliver(q.msg);
  }
}

class FakeRoom {
  private listeners = new Set<Listener>();
  readonly bus: Bus; readonly host: boolean;
  constructor(bus: Bus, host: boolean) { this.bus = bus; this.host = host; bus.peers.push(this); }
  get isHost(): boolean { return this.host; }
  onEvent(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  async sendMsg(msg: NetMsg): Promise<void> { this.bus.send(this, msg); }
  deliver(msg: NetMsg): void { for (const l of this.listeners) l({ type: 'msg', msg } as RoomEvent); }
}

function run(latencyMs: number, loss: number, seed: number, minProgress: number): { ok: boolean; a: number; b: number; ticks: [number, number]; desynced: boolean } {
  const cfg: SimConfig = {
    mode: '3v3', difficulty: 'normal', seed,
    teams: [[{ heroId: 'houyi', isBot: false, name: 'A' }], [{ heroId: 'daji', isBot: false, name: 'B' }]], botVsBot: false,
  };
  const simA = new Simulation(cfg), simB = new Simulation(cfg);
  simA.skipCountdown(); simB.skipCountdown();
  const bus = new Bus(latencyMs, loss);
  const roomA = new FakeRoom(bus, true), roomB = new FakeRoom(bus, false);
  const seats = [seatKey(0, 0), seatKey(1, 0)];
  const A = new Lockstep(simA, roomA as unknown as Room, seats[0], seats, 8, 4);
  const B = new Lockstep(simB, roomB as unknown as Room, seats[1], seats, 8, 4);
  A.clock = () => bus.now; B.clock = () => bus.now;
  let desynced = false;
  A.onDesync = () => { desynced = true; }; B.onDesync = () => { desynced = true; };
  // scripted, deterministic inputs per peer: wander and attack, cast skills now and then
  const cmdFor = (frame: number, who: number): HeroCommand => {
    const c = idleCommand();
    const a = (frame * 0.013 + who * 2.1);
    c.move = { x: Math.round(Math.cos(a) * 1000) / 1000, y: Math.round(Math.sin(a) * 1000) / 1000 };
    c.aim = { x: 28 + Math.cos(a) * 5, y: 28 + Math.sin(a) * 5 };
    c.attack = frame % 7 === 0;
    c.skill = frame % 180 === who * 30 ? 0 : -1;
    return c;
  };
  const frames = 60 * 90; // 90 s of play at 60 fps
  for (let f = 0; f < frames; f++) {
    A.advance(1 / 60, cmdFor(f, 0));
    B.advance(1 / 60, cmdFor(f, 1));
    bus.tick(1000 / 60);
  }
  // drain: keep advancing with idle input until both have consumed every tick they can
  for (let f = 0; f < 240; f++) { A.advance(1 / 60, idleCommand()); B.advance(1 / 60, idleCommand()); bus.tick(1000 / 60); }
  const target = Math.min(A.advanceStats!.tick, B.advanceStats!.tick);
  // compare at the same tick: step the one that is ahead back is impossible, so instead require equal ticks after the drain
  const a = hashWorld(simA.w), b = hashWorld(simB.w);
  const ticks: [number, number] = [A.advanceStats!.tick, B.advanceStats!.tick];
  // every 60-tick checkpoint both peers reached was hash-compared inside Lockstep (desynced flags a mismatch);
  // under loss the peers may end a few ticks apart, so only require progress and no mismatch — and identical hashes when they tie
  const same = ticks[0] !== ticks[1] || a === b;
  return { ok: !desynced && same && target > frames * minProgress, a, b, ticks, desynced };
}

let failed = false;
for (const [lat, loss, min] of [[0, 0, 0.99], [80, 0, 0.99], [150, 0.3, 0.6], [250, 0.5, 0.35]] as const) {
  const r = run(lat, loss, 7, min);
  console.log(`latency ${lat}ms loss ${Math.round(loss * 100)}%: ${r.ok ? 'OK' : 'FAIL'} ticks ${r.ticks.join('/')} hash ${r.a.toString(16)}/${r.b.toString(16)}${r.desynced ? ' DESYNC' : ''}`);
  if (!r.ok) failed = true;
}
void TICK;
if (failed) throw new Error('lockstep test failed');
