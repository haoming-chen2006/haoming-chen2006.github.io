import type { Vec } from '../engine/math.ts';
import { cardById } from './cards.ts';
import type { Simulation } from './sim.ts';
import type {
  Building, BuildingDef, CardDef, Effect, Entity, MatchResult, PlayerState, Projectile, SpellDef, Team, Tower, TroopDef, Unit, Zone,
} from './types.ts';
import type { PendingSpell, World } from './world.ts';

/**
 * A plain-JSON picture of an entire simulation at one tick, so a peer can be brought into lockstep
 * from the exact state another browser is in. Everything is data: no class instances, no Sets, and
 * card definitions are referenced by id. Every field of `World` (bar the transient `events`) plus the
 * simulation's own accumulators are included; the types below are derived from the live types so a
 * field added to `Unit` or `PlayerState` is a compile error here until it is serialised.
 */
export interface SimSnapshot {
  v: 1;
  time: number;
  timeLeft: number;
  phase: World['phase'];
  countdown: number;
  elixirRate: number;
  result: MatchResult | null;
  entities: EntitySnap[];
  projectiles: ProjectileSnap[];
  effects: EffectSnap[];
  zones: Zone[];
  pendingSpells: PendingSpellSnap[];
  players: [PlayerSnap, PlayerSnap];
  rng: number;
  nextId: number;
  announced: World['announced'];
  acc: number;
  countdownStep: number;
}

export type UnitSnap = Omit<Unit, 'def' | 'dashHits'> & { def: string; dashHits: number[] };
export type BuildingSnap = Omit<Building, 'def'> & { def: string };
export type TowerSnap = Tower;
export type EntitySnap = UnitSnap | BuildingSnap | TowerSnap;
export type ProjectileSnap = Omit<Projectile, 'hitIds'> & { hitIds: number[] };
export type EffectSnap = Effect;
export interface PendingSpellSnap { def: string; team: Team; pos: Vec; t: number }
export type PlayerSnap = Omit<PlayerState, 'deck' | 'hand' | 'queue'> & { deck: string[]; hand: string[]; queue: string[] };

const vec = (v: Vec): Vec => ({ x: v.x, y: v.y });
const vecOrNull = (v: Vec | null): Vec | null => (v ? vec(v) : null);

export function takeSnapshot(sim: Simulation): SimSnapshot {
  const w = sim.w;
  const internals = sim.internals;
  return {
    v: 1,
    time: w.time,
    timeLeft: w.timeLeft,
    phase: w.phase,
    countdown: w.countdown,
    elixirRate: w.elixirRate,
    result: w.result ? snapResult(w.result) : null,
    entities: w.entities.map(snapEntity),
    projectiles: w.projectiles.map(snapProjectile),
    effects: w.effects.map(snapEffect),
    zones: w.zones.map(snapZone),
    pendingSpells: w.pendingSpells.map((s) => ({ def: s.def.id, team: s.team, pos: vec(s.pos), t: s.t })),
    players: [snapPlayer(w.players[0]), snapPlayer(w.players[1])],
    rng: w.rng.state,
    nextId: w.nextEntityId,
    announced: { double: w.announced.double, overtime: w.announced.overtime },
    acc: internals.acc,
    countdownStep: internals.countdownStep,
  };
}

/**
 * Overwrite `sim`'s state with the snapshot. The World instance (and its `players`, `rng`, `byId` and
 * `announced` objects) keep their identity so anything holding a reference to them keeps working;
 * every array and every object inside them is rebuilt fresh, sharing nothing with `snap`.
 */
export function restoreSnapshot(sim: Simulation, snap: SimSnapshot): void {
  if (snap.v !== 1) throw new Error(`unsupported snapshot version ${String(snap.v)}`);
  const w = sim.w;
  w.time = snap.time;
  w.timeLeft = snap.timeLeft;
  w.phase = snap.phase;
  w.countdown = snap.countdown;
  w.elixirRate = snap.elixirRate;
  w.result = snap.result ? snapResult(snap.result) : null;
  w.entities = snap.entities.map(restoreEntity);
  w.byId.clear();
  for (const e of w.entities) w.byId.set(e.id, e);
  w.projectiles = snap.projectiles.map(restoreProjectile);
  w.effects = snap.effects.map(snapEffect);
  w.zones = snap.zones.map(snapZone);
  w.events = [];
  w.pendingSpells = snap.pendingSpells.map((s): PendingSpell => ({ def: spellDef(s.def), team: s.team, pos: vec(s.pos), t: s.t }));
  for (const team of [0, 1] as const) Object.assign(w.players[team], restorePlayer(snap.players[team]));
  w.rng.state = snap.rng;
  w.nextEntityId = snap.nextId;
  w.announced.double = snap.announced.double;
  w.announced.overtime = snap.announced.overtime;
  sim.restoreInternals({ acc: snap.acc, countdownStep: snap.countdownStep });
}

// --- entities -------------------------------------------------------------------------------------

/** The `EntityBase` fields, copied with fresh nested objects. Shared by both directions. */
function copyBase<E extends Entity | EntitySnap>(e: E) {
  return {
    id: e.id, team: e.team, pos: vec(e.pos), radius: e.radius, hp: e.hp, maxHp: e.maxHp, dead: e.dead, flying: e.flying,
    status: { ...e.status }, targetId: e.targetId, attackCd: e.attackCd, facing: e.facing, hitFlash: e.hitFlash,
    attackAnim: e.attackAnim, shield: e.shield, bornAt: e.bornAt,
  };
}

/** The `Unit` fields beyond the base and the two that change representation (`def`, `dashHits`). */
function copyUnitFields<U extends Unit | UnitSnap>(u: U) {
  return {
    kind: 'unit' as const, deployT: u.deployT, possessed: u.possessed, soulbound: u.soulbound, moveT: u.moveT, charging: u.charging,
    abilityCd: u.abilityCd, dashCd: u.dashCd, abilityT: u.abilityT, abilityTick: u.abilityTick, abilityDir: vec(u.abilityDir),
    dashVel: vecOrNull(u.dashVel), dashT: u.dashT, dashDamage: u.dashDamage, dashStun: u.dashStun, dashKnockback: u.dashKnockback,
    dashBuildingMult: u.dashBuildingMult, dashKind: u.dashKind, buffT: u.buffT, buffSpeed: u.buffSpeed, buffAttack: u.buffAttack,
    critNext: u.critNext, lane: u.lane, vel: vec(u.vel), bobT: u.bobT, heroAttackHeld: u.heroAttackHeld, lastPos: vec(u.lastPos),
    stuckT: u.stuckT, waypoint: vecOrNull(u.waypoint), fromSpawner: u.fromSpawner,
  };
}

function snapEntity(e: Entity): EntitySnap {
  switch (e.kind) {
    case 'unit': return { ...copyBase(e), ...copyUnitFields(e), def: e.def.id, dashHits: [...e.dashHits] };
    case 'building': return { ...copyBase(e), kind: 'building', def: e.def.id, deployT: e.deployT, lifetime: e.lifetime, spawnT: e.spawnT };
    case 'tower': return snapTower(e);
  }
}

function restoreEntity(s: EntitySnap): Entity {
  switch (s.kind) {
    case 'unit': return { ...copyBase(s), ...copyUnitFields(s), def: troopDef(s.def), dashHits: new Set(s.dashHits) };
    case 'building': return { ...copyBase(s), kind: 'building', def: buildingDef(s.def), deployT: s.deployT, lifetime: s.lifetime, spawnT: s.spawnT };
    case 'tower': return snapTower(s);
  }
}

function snapTower(t: Tower): Tower {
  return { ...copyBase(t), kind: 'tower', towerType: t.towerType, side: t.side, active: t.active, damage: t.damage, hitSpeed: t.hitSpeed, range: t.range };
}

// --- projectiles, effects, zones ------------------------------------------------------------------

function copyProjectileFields<P extends Projectile | ProjectileSnap>(p: P) {
  const out = {
    id: p.id, team: p.team, pos: vec(p.pos), prev: vec(p.prev), style: p.style, speed: p.speed, damage: p.damage, mode: p.mode,
    targetId: p.targetId, dir: vec(p.dir), maxDist: p.maxDist, traveled: p.traveled, splash: p.splash, splashAir: p.splashAir,
    hitsAir: p.hitsAir, hitsGround: p.hitsGround, pierce: p.pierce, sourceId: p.sourceId, stun: p.stun, knockback: p.knockback,
    buildingMult: p.buildingMult, burn: p.burn, lobFrom: vec(p.lobFrom), lobTo: vec(p.lobTo), lobT: p.lobT, lobDur: p.lobDur,
    height: p.height, dead: p.dead, hero: p.hero, radius: p.radius,
  } as Omit<Projectile, 'hitIds'>;
  if (p.chain) out.chain = { ...p.chain };
  return out;
}

const snapProjectile = (p: Projectile): ProjectileSnap => ({ ...copyProjectileFields(p), hitIds: [...p.hitIds] });
const restoreProjectile = (s: ProjectileSnap): Projectile => ({ ...copyProjectileFields(s), hitIds: new Set(s.hitIds) });

/** Effects are already plain data; this copies them with fresh vectors and without `undefined` keys. */
function snapEffect(e: Effect): Effect {
  const out: Effect = { type: e.type, pos: vec(e.pos), t: e.t, dur: e.dur, radius: e.radius, color: e.color };
  if (e.to) out.to = vec(e.to);
  if (e.vel) out.vel = vec(e.vel);
  if (e.angle !== undefined) out.angle = e.angle;
  if (e.text !== undefined) out.text = e.text;
  if (e.size !== undefined) out.size = e.size;
  if (e.team !== undefined) out.team = e.team;
  if (e.arc !== undefined) out.arc = e.arc;
  return out;
}

const snapZone = (z: Zone): Zone => ({ kind: z.kind, pos: vec(z.pos), radius: z.radius, t: z.t, team: z.team, speed: z.speed, attack: z.attack });

function snapResult(r: MatchResult): MatchResult {
  const out: MatchResult = { winner: r.winner, reason: r.reason, crowns: [r.crowns[0], r.crowns[1]] };
  if (r.awards) out.awards = r.awards.map((a) => ({ title: a.title, desc: a.desc, team: a.team, value: a.value }));
  return out;
}

// --- players --------------------------------------------------------------------------------------

function copyPlayerFields<P extends PlayerState | PlayerSnap>(p: P) {
  return {
    team: p.team, elixir: p.elixir, elixirMult: p.elixirMult, crowns: p.crowns, stats: { ...p.stats }, possessCd: p.possessCd,
    heroId: p.heroId, isBot: p.isBot, name: p.name, lastDeployId: p.lastDeployId, streak: p.streak, streakT: p.streakT, harvested: p.harvested,
  };
}

const ids = (cards: CardDef[]): string[] => cards.map((c) => c.id);

function snapPlayer(p: PlayerState): PlayerSnap {
  return { ...copyPlayerFields(p), deck: ids(p.deck), hand: ids(p.hand), queue: ids(p.queue) };
}

function restorePlayer(s: PlayerSnap): PlayerState {
  return { ...copyPlayerFields(s), deck: s.deck.map(cardById), hand: s.hand.map(cardById), queue: s.queue.map(cardById) };
}

// --- card lookups ---------------------------------------------------------------------------------

function troopDef(id: string): TroopDef {
  const c = cardById(id);
  if (c.kind !== 'troop') throw new Error(`snapshot: ${id} is not a troop`);
  return c;
}

function buildingDef(id: string): BuildingDef {
  const c = cardById(id);
  if (c.kind !== 'building') throw new Error(`snapshot: ${id} is not a building`);
  return c;
}

function spellDef(id: string): SpellDef {
  const c = cardById(id);
  if (c.kind !== 'spell') throw new Error(`snapshot: ${id} is not a spell`);
  return c;
}
