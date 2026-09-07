// Snapshot round-trip test for online duels: serialise one simulation, restore it into another, and
// check the two stay in lockstep. Run: node scripts/snapshot_test.ts
declare const process: { exitCode?: number };
import { Simulation } from '../src/game/sim.ts';
import { idleCommand, type HeroCommand } from '../src/game/hero.ts';
import { PRESET_DECKS, cardsFromIds } from '../src/game/cards.ts';
import { TICK } from '../src/game/constants.ts';
import { applyAction } from '../src/game/actions.ts';
import { hashWorld } from '../src/game/hash.ts';
import { restoreSnapshot, takeSnapshot, type SimSnapshot } from '../src/game/snapshot.ts';
import type { Team } from '../src/game/types.ts';

const SEED = 42;
const SNAP_TICK = 2500;
const END_TICK = 6000;
const OTHER_TICK = 1000; // how far the "already running" third simulation gets before being overwritten

const makeSim = () => new Simulation({
  playerDeck: cardsFromIds(PRESET_DECKS.Swarm), botDeck: cardsFromIds(PRESET_DECKS.Siege),
  difficulty: 'normal', seed: SEED, duel: { names: ['A', 'B'] },
});

/** Scripted inputs for one tick, a pure function of the tick index so every simulation sees the same thing. */
function driveTick(sim: Simulation, tick: number): void {
  const w = sim.w;
  if (tick % 90 === 0) {
    const n = tick / 90;
    const x = 2 + ((n * 7) % 15);
    for (const team of [0, 1] as Team[]) {
      const y = team === 0 ? 22 + (n % 6) : 5 + (n % 6);
      applyAction(w, team, { k: 'deploy', h: 0, x, y });
    }
  }
  if (tick > 600) {
    for (const team of [0, 1] as Team[]) {
      const p = w.players[team];
      if (p.heroId < 0 && p.lastDeployId >= 0) applyAction(w, team, { k: 'possess', id: p.lastDeployId });
    }
  }
  const cmd = (team: Team): HeroCommand => (w.hero(team)
    ? { move: { x: 0, y: team === 0 ? -1 : 1 }, aim: { x: 9, y: 16 }, attack: true, ability: tick % 200 === 0, dash: tick % 300 === 0, release: false }
    : idleCommand());
  sim.step(TICK, [cmd(0), cmd(1)]);
  w.events.length = 0;
}

let failures = 0;
const fail = (msg: string) => { failures++; console.log(`FAIL: ${msg}`); };
const hex = (h: number) => h.toString(16).padStart(8, '0');

/** Path of the first difference between two JSON-ish values, or null when they are deep-equal. */
function firstDiff(a: unknown, b: unknown, path = '$'): string | null {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
  if (Array.isArray(ao) !== Array.isArray(bo)) return `${path}: array/object mismatch`;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) { const d = firstDiff(ao[k], bo[k], Array.isArray(ao) ? `${path}[${k}]` : `${path}.${k}`); if (d) return d; }
  return null;
}

/** Every leaf must be something JSON carries losslessly. */
function checkPlainJson(v: unknown, path: string): void {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) fail(`${path} is ${v}, which JSON cannot carry`);
    if (Object.is(v, -0)) fail(`${path} is -0, which JSON turns into 0`);
    return;
  }
  if (typeof v !== 'object') { fail(`${path} is a ${typeof v}`); return; }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== Array.prototype) { fail(`${path} is a ${proto?.constructor?.name ?? 'exotic object'}, not plain data`); return; }
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (x === undefined) fail(`${path}.${k} is undefined, which JSON drops`);
    else checkPlainJson(x, Array.isArray(v) ? `${path}[${k}]` : `${path}.${k}`);
  }
}

/** Run a set of simulations in lockstep from `from` to `to`, reporting the first tick where any hash diverges from sims[0]. */
function lockstep(sims: { name: string; sim: Simulation }[], from: number, to: number): boolean {
  for (let tick = from; tick <= to; tick++) {
    for (const s of sims) driveTick(s.sim, tick);
    const h0 = hashWorld(sims[0].sim.w);
    for (const s of sims.slice(1)) {
      const h = hashWorld(s.sim.w);
      if (h !== h0) {
        fail(`${sims[0].name} vs ${s.name} diverged at tick ${tick}: ${hex(h0)} != ${hex(h)}`);
        const d = firstDiff(takeSnapshot(sims[0].sim), takeSnapshot(s.sim));
        console.log(`  first differing field: ${d ?? '(none in snapshot; hash inputs differ elsewhere)'}`);
        return false;
      }
    }
  }
  return true;
}

// --- 1. Run the reference simulation to the snapshot tick and serialise it. ----------------------

const simA = makeSim();
for (let tick = 1; tick <= SNAP_TICK; tick++) driveTick(simA, tick);
const hashAtSnap = hashWorld(simA.w);
console.log(`tick ${SNAP_TICK}: phase=${simA.w.phase} time=${simA.w.time.toFixed(2)} entities=${simA.w.entities.length} projectiles=${simA.w.projectiles.length} effects=${simA.w.effects.length} heroes=${[0, 1].map((t) => simA.w.players[t].heroId).join('/')} hash=${hex(hashAtSnap)}`);
if (simA.w.entities.length <= 6) fail('scripted inputs deployed nothing; the test is not exercising units');

const snapLive = takeSnapshot(simA);
checkPlainJson(snapLive, 'snap');
const json = JSON.stringify(snapLive);
const bytes = new TextEncoder().encode(json).length;
console.log(`snapshot at tick ${SNAP_TICK}: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KiB)`);
const snap = JSON.parse(json) as SimSnapshot;
const rt = firstDiff(snapLive, snap);
if (rt) fail(`snapshot changed across JSON round trip: ${rt}`);

// The snapshot must not alias the live world.
const liveUnit = simA.w.entities.find((e) => e.kind === 'unit');
const snapUnit = snap.entities.find((e) => e.kind === 'unit');
if (liveUnit && snapUnit && (liveUnit.pos === (snapUnit.pos as object) || liveUnit.status === (snapUnit.status as object))) fail('snapshot shares objects with the live world');
if (hashWorld(simA.w) !== hashAtSnap) fail('takeSnapshot mutated the live world');

// --- 2. Restore into a fresh simulation and into one already partway through a different match. ---

const simB = makeSim();
restoreSnapshot(simB, snap);
if (hashWorld(simB.w) !== hashAtSnap) {
  fail(`fresh restore hash mismatch: ${hex(hashAtSnap)} != ${hex(hashWorld(simB.w))}`);
  console.log(`  first differing field: ${firstDiff(takeSnapshot(simA), takeSnapshot(simB))}`);
}
const rtB = firstDiff(snapLive, takeSnapshot(simB));
if (rtB) fail(`re-snapshot of the restored simulation differs: ${rtB}`);
if (simB.w.byId.size !== simB.w.entities.length || simB.w.entities.some((e) => simB.w.byId.get(e.id) !== e)) fail('byId was not rebuilt to match entities');
if (simB.w.events.length !== 0) fail('events should be empty after restore');

const simC = makeSim();
for (let tick = 1; tick <= OTHER_TICK; tick++) driveTick(simC, tick);
const worldC = simC.w;
if (hashWorld(simC.w) === hashAtSnap) fail('simC should be in a different state before restore');
restoreSnapshot(simC, snap);
if (simC.w !== worldC) fail('restore replaced the World instance');
if (hashWorld(simC.w) !== hashAtSnap) fail(`restore over a running simulation hash mismatch: ${hex(hashAtSnap)} != ${hex(hashWorld(simC.w))}`);

// The restored worlds must not alias the snapshot either: wrecking the snapshot must leave them untouched.
for (const e of snap.entities) { e.pos.x = -999; e.status.stun = 999; if (e.kind === 'unit') { e.vel.x = -999; e.abilityDir.y = -999; } }
for (const p of snap.projectiles) { p.pos.x = -999; p.lobFrom.y = -999; }
for (const e of snap.effects) e.pos.x = -999;
for (const z of snap.zones) z.pos.x = -999;
for (const s of snap.pendingSpells) s.pos.x = -999;
for (const p of snap.players) { p.stats.unitKills = 999; p.hand.length = 0; }
snap.announced.double = true;
for (const s of [simB, simC]) {
  const d = firstDiff(snapLive, takeSnapshot(s));
  if (d) fail(`restored world shares objects with the snapshot: ${d}`);
}

// --- 3. Continue all three in lockstep and compare every tick. ------------------------------------

const sims = [{ name: 'A (original)', sim: simA }, { name: 'B (fresh restore)', sim: simB }, { name: 'C (restore over running sim)', sim: simC }];
const t0 = performance.now();
const ok = lockstep(sims, SNAP_TICK + 1, END_TICK);
const dt = ((performance.now() - t0) / 1000).toFixed(2);
if (ok) console.log(`lockstep ${SNAP_TICK + 1}..${END_TICK}: all hashes equal every tick (${dt}s)`);

const finalA = JSON.stringify(takeSnapshot(simA));
for (const s of sims.slice(1)) {
  const j = JSON.stringify(takeSnapshot(s.sim));
  if (j !== finalA) fail(`final snapshot of ${s.name} differs from A: ${firstDiff(JSON.parse(finalA), JSON.parse(j))}`);
}
console.log(`tick ${END_TICK}: phase=${simA.w.phase} time=${simA.w.time.toFixed(2)} entities=${simA.w.entities.length} crowns=${simA.w.players[0].crowns}-${simA.w.players[1].crowns} heroes=${[0, 1].map((t) => simA.w.players[t].heroId).join('/')} hash=${hex(hashWorld(simA.w))}`);

// --- 4. Snapshot and restore at many different ticks so more kinds of state get exercised. --------

const coverage: Record<string, number> = {};
const seen = (k: string, n: number) => { if (n > 0) coverage[k] = (coverage[k] ?? 0) + 1; };
const simD = makeSim();
for (let tick = 1; tick <= END_TICK; tick++) {
  driveTick(simD, tick);
  if (tick % 100 !== 0) continue;
  const s = JSON.parse(JSON.stringify(takeSnapshot(simD))) as SimSnapshot;
  const units = s.entities.filter((e) => e.kind === 'unit');
  seen('projectiles', s.projectiles.length);
  seen('projectiles.hitIds', s.projectiles.filter((p) => p.hitIds.length > 0).length);
  seen('projectiles.chain', s.projectiles.filter((p) => p.chain).length);
  seen('pendingSpells', s.pendingSpells.length);
  seen('zones', s.zones.length);
  seen('buildings', s.entities.filter((e) => e.kind === 'building').length);
  seen('units', units.length);
  seen('units.fromSpawner', units.filter((u) => u.fromSpawner).length);
  seen('units.dashVel', units.filter((u) => u.dashVel).length);
  seen('units.dashHits', units.filter((u) => u.dashHits.length > 0).length);
  seen('units.waypoint', units.filter((u) => u.waypoint).length);
  seen('units.possessed', units.filter((u) => u.possessed).length);
  seen('units.abilityT', units.filter((u) => u.abilityT > 0).length);
  seen('units.status', units.filter((u) => Object.values(u.status).some((x, i) => (i === 3 || i === 4 ? x !== 1 : x !== 0))).length);
  seen('effects.to', s.effects.filter((e) => e.to).length);
  seen('effects.vel', s.effects.filter((e) => e.vel).length);
  seen('effects.text', s.effects.filter((e) => e.text !== undefined).length);
  seen('deadTowers', 6 - s.entities.filter((e) => e.kind === 'tower').length);
  const simE = makeSim();
  restoreSnapshot(simE, s);
  if (hashWorld(simE.w) !== hashWorld(simD.w)) fail(`tick ${tick}: restore hash mismatch ${hex(hashWorld(simD.w))} != ${hex(hashWorld(simE.w))}`);
  const d = firstDiff(takeSnapshot(simD), takeSnapshot(simE));
  if (d) fail(`tick ${tick}: re-snapshot differs: ${d}`);
}
console.log(`state kinds seen across ${END_TICK / 100} snapshots: ${Object.entries(coverage).map(([k, n]) => `${k}=${n}`).join(' ')}`);
for (const k of ['projectiles', 'pendingSpells', 'buildings', 'units.possessed']) if (!coverage[k]) fail(`never snapshotted any ${k}; the script is not exercising that state`);

console.log(failures ? `FAILURES: ${failures}` : 'snapshot round trip passed');
process.exitCode = failures ? 1 : 0;
