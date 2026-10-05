import { Rng } from '../engine/rng.ts';
import type { Vec } from '../engine/math.ts';
import { dist } from '../engine/math.ts';
import { COUNTDOWN_TIME, LEVEL_XP, MAX_LEVEL, START_GOLD, TOWER_LAYOUT, TOWER_STATS, mirrorPos, type LaneId } from './constants.ts';
import { ROLE_LANE, heroDef } from './heroes.ts';
import { sumItems } from './items.ts';
import { crystalPos, inBush, lanePath, setObstacles, spawnPoint } from './map.ts';
import {
  NEUTRAL, newStats, type Effect, type Entity, type GameEvent, type MatchPhase, type MatchResult, type PlayerState, type Projectile,
  type Seat, type Side, type Status, type Team, type Tower, type Unit, type UnitDef, type Zone,
} from './types.ts';

export interface SeatConfig { heroId: string; isBot: boolean; name: string }
export interface TeamConfig { name: string; seats: SeatConfig[] }

const freshStatus = (): Status => ({ stun: 0, freeze: 0, rage: 0, rageSpeed: 1, rageAttack: 1, burnT: 0, burnDps: 0, slowT: 0, slow: 0, blueT: 0, redT: 0, tyrantT: 0, overlordT: 0, invulnT: 0 });

/** Effective combat stats of a unit at its level with its items and buffs. */
export interface Derived { maxHp: number; attack: number; power: number; armor: number; resist: number; hitSpeed: number; speed: number; lifesteal: number; spellvamp: number; cooldown: number; crit: number; maxMana: number; hpRegen: number; manaRegen: number }

export class World {
  time = 0;
  timeLeft = 99999;
  phase: MatchPhase = 'countdown';
  countdown = COUNTDOWN_TIME;
  elixirRate = 1;
  result: MatchResult | null = null;
  entities: Entity[] = [];
  byId = new Map<number, Entity>();
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  zones: Zone[] = [];
  events: GameEvent[] = [];
  players: [PlayerState, PlayerState];
  rng: Rng;
  private nextId = 1;
  announced = { double: false, overtime: false, firstBlood: false };
  waveNo = 0;
  nextWaveAt = 0;
  campT = new Map<string, number>(); // camp id -> time of next spawn (-1 while alive)
  derived = new Map<number, Derived>();
  mode: '5v5' | '3v3' | '1v1' = '5v5';
  /** Lanes that spawn minions and keep their towers (1v1 closes top and bot). */
  lanesOpen: LaneId[] = [0, 1, 2];

  constructor(cfg: [TeamConfig, TeamConfig], seed = 1) {
    this.rng = new Rng(seed);
    this.players = [this.makeTeam(0, cfg[0]), this.makeTeam(1, cfg[1])];
    for (const team of [0, 1] as Team[]) {
      for (const spec of TOWER_LAYOUT) {
        const pos = team === 0 ? { ...spec.pos } : mirrorPos(spec.pos);
        this.spawnTower(team, spec.tier, spec.lane, pos);
      }
    }
    for (const p of this.players) for (const s of p.seats) this.spawnHero(s);
    this.refreshObstacles();
  }

  /** Tell the pathfinder where the standing structures are. */
  refreshObstacles(): void { setObstacles(this.entities.filter((e): e is Tower => e.kind === 'tower' && !e.dead).map((t) => ({ x: t.pos.x, y: t.pos.y, r: t.radius }))); }

  private makeTeam(team: Team, cfg: TeamConfig): PlayerState {
    const seats: Seat[] = cfg.seats.map((s, index) => {
      const def = heroDef(s.heroId);
      return {
        team, index, heroDefId: s.heroId, heroId: -1, isBot: s.isBot, name: s.name, stats: newStats(), respawnT: 0, level: 1, xp: 0, gold: START_GOLD,
        items: [], skillRank: [0, 0, 0], skillPoints: 1, role: def.role, lane: ROLE_LANE[def.role], streak: 0, kills: 0, deaths: 0, assists: 0, autoBuy: true,
      };
    });
    // spread lanes: one jungler, one top, one mid, two bot
    const want: (LaneId | 3)[] = [0, 1, 2, 2, 3];
    const taken = new Set<number>();
    for (const s of seats) { const i = want.indexOf(s.lane); if (i >= 0 && !taken.has(i)) taken.add(i); else s.lane = -1 as never; }
    for (const s of seats) if ((s.lane as number) === -1) { const i = want.findIndex((_, k) => !taken.has(k)); taken.add(i); s.lane = want[i]; }
    const human = seats.find((s) => !s.isBot);
    return {
      team, name: cfg.name, isBot: !human, heroId: -1, seats, stats: newStats(), towersLost: 0, kills: 0, crowns: 0, possessCd: 0, streak: 0, streakT: -100,
      objectiveT: { tyrant: 0, overlord: 0 },
    };
  }

  player(team: Team): PlayerState { return this.players[team]; }
  seatOf(u: Unit): Seat | undefined { for (const p of this.players) for (const s of p.seats) if (s.heroId === u.id) return s; return undefined; }
  seatByHero(id: number): Seat | undefined { for (const p of this.players) for (const s of p.seats) if (s.heroId === id) return s; return undefined; }
  humanSeat(team: Team): Seat | undefined { return this.players[team].seats.find((s) => !s.isBot); }
  humanSeats(): Seat[] { return [...this.players[0].seats, ...this.players[1].seats].filter((s) => !s.isBot); }

  /** 1v1: only the mid lane is contested. Side-lane towers vanish and their lanes stop spawning. */
  closeSideLanes(): void {
    this.lanesOpen = [1];
    for (const e of this.entities) if (e.kind === 'tower' && (e.lane === 0 || e.lane === 2)) { e.dead = true; }
    for (const p of this.players) for (const s of p.seats) s.lane = 1;
    this.sweep();
    this.refreshObstacles();
  }

  emit(ev: GameEvent): void { this.events.push(ev); }
  addEffect(e: Omit<Effect, 't'>): void { this.effects.push({ ...e, t: 0 }); }
  text(pos: Vec, text: string, color: string, size = 0.55): void {
    this.effects.push({ type: 'text', pos: { x: pos.x + (this.rng.next() - 0.5) * 0.4, y: pos.y + (this.rng.next() - 0.5) * 0.3 }, t: 0, dur: 0.9, radius: 0, color, text, size });
  }

  private base(team: Side, pos: Vec, radius: number, hp: number, flying: boolean, armor = 0, resist = 0) {
    return {
      id: this.nextId++, team, pos: { ...pos }, radius, hp, maxHp: hp, dead: false, flying, status: freshStatus(),
      targetId: -1, attackCd: 0, facing: team === 0 ? -Math.PI / 4 : (3 * Math.PI) / 4, hitFlash: 0, attackAnim: 0, shield: 0, bornAt: this.time, armor, resist,
    };
  }

  private unitShell(def: UnitDef, team: Side, pos: Vec, isHero: boolean): Unit {
    return {
      ...this.base(team, pos, def.radius, def.hp, def.flying, def.armor, def.resist), kind: 'unit', def, isHero,
      deployT: 0, possessed: false, soulbound: false, moveT: 0, charging: false,
      skillCd: [0, 0, 0], skillRank: [0, 0, 0], abilityCd: 0, dashCd: 0, flashCd: 0, abilityT: 0, abilityTick: 0, abilityDir: { x: 0, y: -1 }, activeSkill: -1,
      dashVel: null, dashT: 0, dashHits: new Set(), dashDamage: 0, dashStun: 0, dashKnockback: 0, dashBuildingMult: 1, dashKind: 'none', dashExecute: 0, dashType: 'physical',
      buffT: 0, buffSpeed: 1, buffAttack: 1, critNext: 1, lane: 1, laneIndex: 0, vel: { x: 0, y: 0 }, bobT: this.rng.next() * 10, heroAttackHeld: false,
      lastPos: { ...pos }, stuckT: 0, waypoint: null, path: [], pathT: 0, fromSpawner: false,
      level: 1, xp: 0, mana: def.mana, maxMana: def.mana, items: [], gold: 0, recallT: 0, respawnT: 0, kills: 0, deaths: 0, assists: 0, streak: 0,
      lastHurtBy: [], damageTaken: 0, inBush: false, camp: null, home: null, leashT: 0, owner: -1, autoBuy: true, skillPoints: 0, lastAttackT: -10, crown: 0, crowned: false, stormN: 0, voidMarks: 0,
    };
  }

  /** (Re)spawn a seat's hero at its base with the seat's persistent progression. */
  spawnHero(seat: Seat): Unit {
    const def = heroDef(seat.heroDefId);
    const u = this.unitShell(def, seat.team, spawnPoint(seat.team), true);
    u.level = seat.level; u.xp = seat.xp; u.items = [...seat.items]; u.gold = seat.gold; u.skillRank = [...seat.skillRank]; u.skillPoints = seat.skillPoints;
    u.kills = seat.kills; u.deaths = seat.deaths; u.assists = seat.assists; u.streak = seat.streak; u.autoBuy = seat.autoBuy;
    u.lane = seat.lane === 3 ? 1 : seat.lane;
    u.possessed = !seat.isBot;
    u.owner = seat.team;
    this.add(u);
    const d = this.refreshDerived(u);
    u.hp = u.maxHp = d.maxHp; u.mana = u.maxMana = d.maxMana;
    u.status.invulnT = 1.5;
    seat.heroId = u.id;
    if (!seat.isBot) this.players[seat.team].heroId = u.id;
    return u;
  }

  spawnUnit(def: UnitDef, team: Side, pos: Vec, opts: { lane?: LaneId; camp?: string; level?: number } = {}): Unit {
    const u = this.unitShell(def, team, pos, false);
    u.level = opts.level ?? 1;
    if (opts.lane !== undefined) u.lane = opts.lane;
    if (opts.camp) { u.camp = opts.camp; u.home = { ...pos }; }
    this.add(u);
    const d = this.refreshDerived(u);
    u.hp = u.maxHp = d.maxHp;
    return u;
  }

  spawnTower(team: Team, tier: Tower['tier'], lane: LaneId | -1, pos: Vec): Tower {
    const spec = TOWER_STATS[tier];
    const t: Tower = {
      ...this.base(team, pos, spec.radius, spec.hp, false, spec.armor, spec.armor), kind: 'tower', towerType: tier, tier, lane, side: 'center',
      active: tier === 'outer' || tier === 'crystal', damage: spec.damage, hitSpeed: spec.hitSpeed, range: spec.range, heat: 0, crownT: 0, aggroId: -1, aggroT: 0,
    };
    this.add(t);
    return t;
  }

  private add(e: Entity): void { this.entities.push(e); this.byId.set(e.id, e); }

  /** Recompute a unit's effective stats from level, items and buffs. */
  refreshDerived(u: Unit): Derived {
    const d = u.def, L = u.level - 1;
    const it = sumItems(u.items);
    const blue = u.status.blueT > 0, red = u.status.redT > 0, tyrant = u.status.tyrantT > 0, over = u.status.overlordT > 0;
    const der: Derived = {
      maxHp: d.hp + d.hpGrowth * L + it.hp,
      attack: (d.damage + d.damageGrowth * L + it.damage) * (tyrant ? 1.1 : 1),
      power: (d.power + d.powerGrowth * L + it.power) * (tyrant ? 1.1 : 1),
      armor: d.armor + d.armorGrowth * L + it.armor + (over ? 60 : 0),
      resist: d.resist + d.resistGrowth * L + it.resist + (over ? 60 : 0),
      hitSpeed: d.hitSpeed / (1 + d.attackSpeedGrowth * L + it.attackSpeed + (red ? 0.15 : 0)),
      speed: d.speed + it.speed + (blue ? 0.3 : 0),
      lifesteal: it.lifesteal, spellvamp: it.spellvamp, cooldown: Math.min(0.4, it.cooldown + (blue ? 0.15 : 0)), crit: it.crit,
      maxMana: d.mana + (u.isHero ? 60 * L : 0) + (u.items.includes('sage_tome') ? 400 : 0),
      hpRegen: d.hpRegen + (u.isHero ? 1.2 * L : 0) + (u.items.includes('red_crystal') ? 15 : 0),
      manaRegen: d.manaRegen * (blue ? 2.5 : 1) + (u.isHero ? 0.4 * L : 0),
    };
    const old = this.derived.get(u.id);
    if (old && old.maxHp !== der.maxHp) { const ratio = u.maxHp > 0 ? u.hp / u.maxHp : 1; u.maxHp = der.maxHp; u.hp = Math.min(der.maxHp, Math.max(u.hp, ratio * der.maxHp)); }
    else u.maxHp = der.maxHp;
    u.maxMana = der.maxMana;
    u.armor = der.armor; u.resist = der.resist;
    this.derived.set(u.id, der);
    return der;
  }

  stats(u: Unit): Derived { return this.derived.get(u.id) ?? this.refreshDerived(u); }

  /** XP needed to go from `level` to the next. */
  static xpToNext(level: number): number { return level >= MAX_LEVEL ? Infinity : LEVEL_XP[level] - LEVEL_XP[level - 1]; }

  get(id: number): Entity | undefined { const e = this.byId.get(id); return e && !e.dead ? e : undefined; }
  getUnit(id: number): Unit | undefined { const e = this.get(id); return e && e.kind === 'unit' ? e : undefined; }

  newProjectileId(): number { return this.nextId++; }
  get nextEntityId(): number { return this.nextId; }
  set nextEntityId(v: number) { this.nextId = v; }

  *alive(): IterableIterator<Entity> { for (const e of this.entities) if (!e.dead) yield e; }
  *units(team?: Side): IterableIterator<Unit> { for (const e of this.entities) if (!e.dead && e.kind === 'unit' && (team === undefined || e.team === team)) yield e; }
  *heroes(team?: Team): IterableIterator<Unit> { for (const e of this.entities) if (!e.dead && e.kind === 'unit' && e.isHero && (team === undefined || e.team === team)) yield e; }
  *enemiesOf(team: Side): IterableIterator<Entity> { for (const e of this.entities) if (!e.dead && e.team !== team && (team === NEUTRAL || e.team !== NEUTRAL || true)) yield e; }
  *alliesOf(team: Side): IterableIterator<Entity> { for (const e of this.entities) if (!e.dead && e.team === team) yield e; }
  towers(team: Team): Tower[] { return this.entities.filter((e): e is Tower => e.kind === 'tower' && e.team === team && !e.dead); }
  crystal(team: Team): Tower | undefined { return this.towers(team).find((t) => t.tier === 'crystal'); }
  king(team: Team): Tower | undefined { return this.crystal(team); }
  /** The human-controlled hero of a team, if alive. */
  hero(team: Team): Unit | undefined { const id = this.players[team].heroId; return id >= 0 ? this.getUnit(id) : undefined; }

  /** Entities within radius of a point (edge-inclusive by their own radius). */
  within(pos: Vec, radius: number, filter: (e: Entity) => boolean): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities) {
      if (e.dead || !filter(e)) continue;
      if (dist(e.pos, pos) <= radius + e.radius) out.push(e);
    }
    return out;
  }

  /**
   * Can `viewerTeam` see entity `e`? Fog of war: an enemy unit is visible only within sight range of an
   * allied unit or tower, and a unit inside a bush only from inside/next to that bush.
   */
  canSee(viewerTeam: Side, e: Entity, viewerPos?: Vec): boolean {
    if (e.team === viewerTeam || e.kind !== 'unit') return true;
    if (viewerTeam === NEUTRAL) return true;
    const near = e.inBush ? 2.2 : 0;
    if (viewerPos && dist(viewerPos, e.pos) < (e.inBush ? near : 9)) return true;
    for (const a of this.alliesOf(viewerTeam)) {
      if (a.kind === 'tower') { if (!e.inBush && dist(a.pos, e.pos) <= a.range + 1.5) return true; continue; }
      if (a.kind !== 'unit') continue;
      const d = dist(a.pos, e.pos);
      if (e.inBush) { if (d < 3.2 && (a.inBush || d < 2.2)) return true; }
      else if (d <= a.def.sight) return true;
    }
    return false;
  }

  updateBushes(): void { for (const u of this.units()) u.inBush = inBush(u.pos); }

  laneFor(team: Team, lane: LaneId): Vec[] { return lanePath(lane, team); }
  crystalPos(team: Team): Vec { return crystalPos(team); }

  /** Remove dead entities from the arrays. */
  sweep(): void {
    if (this.entities.some((e) => e.dead)) {
      for (const e of this.entities) if (e.dead) { this.byId.delete(e.id); this.derived.delete(e.id); }
      this.entities = this.entities.filter((e) => !e.dead);
    }
    if (this.projectiles.some((p) => p.dead)) this.projectiles = this.projectiles.filter((p) => !p.dead);
  }
}

export const isTroop = (e: Entity): e is Unit => e.kind === 'unit';
export const isStructure = (e: Entity): e is Tower => e.kind !== 'unit';
export const isHero = (e: Entity): e is Unit => e.kind === 'unit' && e.isHero;
export const canTarget = (targets: UnitDef['targets'], e: Entity): boolean => {
  switch (targets) {
    case 'buildings': return e.kind !== 'unit';
    case 'ground': return !e.flying;
    case 'air': return e.flying;
    case 'both': return true;
  }
};
export const frozen = (e: Entity): boolean => e.status.stun > 0 || e.status.freeze > 0;
export const speedMult = (u: Unit): number => u.status.rageSpeed * u.buffSpeed * (1 - (u.status.slowT > 0 ? u.status.slow : 0));
export const attackSpeedMult = (e: Entity): number => e.status.rageAttack * (e.kind === 'unit' ? e.buffAttack : 1);
export const hostile = (a: Side, b: Side): boolean => a !== b;
