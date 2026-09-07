// Two lockstep drivers, two simulations, one fake network with latency, jitter and duplicated
// packets. Both seats press random buttons; the worlds must hash identically every second.
//
//   node scripts/lockstep_test.ts [seed] [ms latency]
import { PRESET_DECKS, cardsFromIds } from '../src/game/cards.ts';
import { hashWorld } from '../src/game/hash.ts';
import { idleCommand } from '../src/game/hero.ts';
import { Simulation } from '../src/game/sim.ts';
import { restoreSnapshot, takeSnapshot, type SimSnapshot } from '../src/game/snapshot.ts';
import { Rng } from '../src/engine/rng.ts';
import { LockstepDriver, type LocalInput, type LockstepLink } from '../src/net/lockstep.ts';
import type { PeerMsg } from '../src/net/protocol.ts';
import type { Team } from '../src/game/types.ts';

declare const process: { argv: string[]; exit(code: number): never };
(globalThis as unknown as { performance: Performance }).performance ??= { now: () => Date.now() } as Performance;

const seed = Number(process.argv[2] ?? 7);
const latencyMs = Number(process.argv[3] ?? 120);
const rng = new Rng(seed);

/** A pair of links joined by delayed queues. Time is simulated: `pump(now)` delivers what is due. */
class FakeNet {
  queues: { to: 0 | 1; at: number; msg: PeerMsg }[] = [];
  listeners: [Set<(m: PeerMsg) => void>, Set<(m: PeerMsg) => void>] = [new Set(), new Set()];
  sent = 0;
  now = 0;
  link(side: 0 | 1): LockstepLink {
    return {
      send: (m) => {
        this.sent++;
        const jitter = rng.range(0, latencyMs * 0.6);
        this.queues.push({ to: side === 0 ? 1 : 0, at: this.now + latencyMs + jitter, msg: JSON.parse(JSON.stringify(m)) });
        if (rng.chance(0.05)) this.queues.push({ to: side === 0 ? 1 : 0, at: this.now + latencyMs * 2, msg: JSON.parse(JSON.stringify(m)) }); // duplicate
      },
      onMessage: (fn) => { this.listeners[side].add(fn); return () => this.listeners[side].delete(fn); },
    };
  }
  pump(now: number): void {
    this.now = now;
    const due = this.queues.filter((q) => q.at <= now).sort((a, b) => a.at - b.at);
    this.queues = this.queues.filter((q) => q.at > now);
    for (const q of due) for (const fn of this.listeners[q.to]) fn(q.msg);
  }
}

function makeSim(): Simulation {
  return new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS.Vanguard), botDeck: cardsFromIds(PRESET_DECKS.Nightfall), difficulty: 'normal', seed: 4242, duel: { names: ['A', 'B'] } });
}

function randomInput(sim: Simulation, team: Team, tick: number): LocalInput {
  const w = sim.w;
  const cmd = idleCommand();
  const acts: LocalInput['acts'] = [];
  const p = w.players[team];
  if (tick % 45 === 0 && p.elixir >= 4) acts.push({ k: 'deploy', h: rng.int(0, 3), x: rng.range(2, 16), y: team === 0 ? rng.range(21, 27) : rng.range(5, 11) });
  if (tick % 200 === 100 && p.heroId < 0 && p.lastDeployId >= 0) acts.push({ k: 'possess', id: p.lastDeployId });
  if (p.heroId >= 0) {
    cmd.move = { x: rng.range(-1, 1), y: team === 0 ? -rng.range(0, 1) : rng.range(0, 1) };
    cmd.aim = { x: rng.range(0, 18), y: rng.range(0, 32) };
    cmd.attack = rng.chance(0.6); cmd.ability = rng.chance(0.05); cmd.dash = rng.chance(0.02); cmd.release = rng.chance(0.002);
  }
  return { cmd, acts };
}

const net = new FakeNet();
const simA = makeSim(), simB = makeSim();
const delay = Math.ceil((latencyMs * 0.8 + 25) / 16.67) + 1;
const A = new LockstepDriver(simA, 0, net.link(0), { delay, sendEvery: 1 });
const B = new LockstepDriver(simB, 1, net.link(1), { delay, sendEvery: 3 });
let desyncs = 0;
A.onDesync = () => { desyncs++; };
B.onDesync = () => { desyncs++; };
// snapshot path: host answers, guest restores
A.onSnapshotRequest = () => net.link(0).send({ k: 'snap', t: A.tick, d: takeSnapshot(simA) });
B.onSnapshot = (t, d) => { restoreSnapshot(simB, d as SimSnapshot); B.resyncTo(t); };

const hashesA = new Map<number, number>(), hashesB = new Map<number, number>();
let now = 0, frames = 0, maxWaitA = 0, maxWaitB = 0;
const frameMs = 1000 / 60;
const TARGET = 60 * 150;
while ((A.tick < TARGET || B.tick < TARGET) && frames < 60 * 600) {
  // uneven frame pacing: A runs slightly fast, B stutters now and then
  const dtA = frameMs * (rng.chance(0.02) ? 3 : 1), dtB = frameMs * (rng.chance(0.03) ? 4 : 0.95);
  now += frameMs; frames++;
  net.pump(now);
  const sa = A.advance(dtA / 1000, randomInput(simA, 0, A.tick));
  const sb = B.advance(dtB / 1000, randomInput(simB, 1, B.tick));
  maxWaitA = Math.max(maxWaitA, sa.waitMs); maxWaitB = Math.max(maxWaitB, sb.waitMs);
  for (const [t, h] of A.debugHashes) hashesA.set(t, h);
  for (const [t, h] of B.debugHashes) hashesB.set(t, h);
}
// deliver stragglers
net.pump(now + 5000);

let compared = 0, mismatches = 0;
for (const [t, h] of hashesA) { const hb = hashesB.get(t); if (hb === undefined) continue; compared++; if (hb !== h) { mismatches++; if (mismatches < 4) console.log(`mismatch at tick ${t}: ${h.toString(16)} vs ${hb.toString(16)}`); } }
console.log(`latency ${latencyMs}ms delay ${delay} ticks · A tick ${A.tick} B tick ${B.tick} · frames ${frames} · packets ${net.sent}`);
console.log(`hashes compared ${compared}, mismatches ${mismatches}, desync reports ${desyncs}, max stall A ${maxWaitA.toFixed(0)}ms B ${maxWaitB.toFixed(0)}ms`);
console.log(`crowns A ${simA.w.players[0].crowns}-${simA.w.players[1].crowns} · entities ${simA.w.entities.length} · heroes ${simA.w.players[0].heroId}/${simA.w.players[1].heroId}`);
if (compared < 100 || mismatches > 0 || desyncs > 0) { console.log('LOCKSTEP TEST FAILED'); process.exit(1); }

// --- forced desync: corrupt the guest and make sure the snapshot path heals it ---
simB.w.players[0].elixir += 1;
let healed = false;
B.onDesync = () => { desyncs++; };
const before = B.tick;
let resyncedAt = -1;
const prevOnSnapshot = B.onSnapshot;
B.onSnapshot = (t, d) => { prevOnSnapshot(t, d); resyncedAt = t; };
for (let i = 0; i < 60 * 12; i++) {
  now += frameMs; net.pump(now);
  A.advance(frameMs / 1000, randomInput(simA, 0, A.tick));
  B.advance(frameMs / 1000, randomInput(simB, 1, B.tick));
  if (resyncedAt < 0) continue;
  // healed once the drivers' own per-second hashes agree on a tick after the restore
  const hb = new Map(B.debugHashes);
  const common = A.debugHashes.filter(([t]) => t > resyncedAt + 60 && hb.has(t));
  if (common.length >= 2) { healed = common.every(([t, h]) => hb.get(t) === h); break; }
}
console.log(`resync landed at tick ${resyncedAt}; final hash A ${hashWorld(simA.w).toString(16)} B ${hashWorld(simB.w).toString(16)} (ticks ${A.tick}/${B.tick})`);
console.log(`forced desync: reported ${desyncs} time(s), guest ${healed ? 'healed via snapshot' : 'NOT healed'} (ticks ${before} → ${B.tick})`);
if (!healed) process.exit(1);
console.log('lockstep: all checks passed');
