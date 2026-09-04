import { Rng } from '../engine/rng.ts';
import type { Vec } from '../engine/math.ts';
import { dist } from '../engine/math.ts';
import { COUNTDOWN_TIME, KING_TOWER, MAX_ELIXIR, PRINCESS_TOWER, REGULATION_TIME, START_ELIXIR, TOWER_LAYOUT, mirrorPos } from './constants.ts';
import {
  newStats, type Building, type BuildingDef, type CardDef, type Effect, type Entity, type GameEvent, type MatchPhase, type MatchResult,
  type PlayerState, type Projectile, type SpellDef, type Status, type Team, type Tower, type TroopDef, type Unit, type Zone,
} from './types.ts';

export interface PendingSpell { def: SpellDef; team: Team; pos: Vec; t: number }

export interface PlayerConfig { deck: CardDef[]; isBot: boolean; name: string; elixirMult?: number }

const freshStatus = (): Status => ({ stun: 0, freeze: 0, rage: 0, rageSpeed: 1, rageAttack: 1, burnT: 0, burnDps: 0 });

export class World {
  time = 0;
  timeLeft = REGULATION_TIME;
  phase: MatchPhase = 'countdown';
  /** Seconds left in the pre-match countdown. */
  countdown = COUNTDOWN_TIME;
  elixirRate = 1;
  result: MatchResult | null = null;
  entities: Entity[] = [];
  byId = new Map<number, Entity>();
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  zones: Zone[] = [];
  events: GameEvent[] = [];
  pendingSpells: PendingSpell[] = [];
  players: [PlayerState, PlayerState];
  rng: Rng;
  private nextId = 1;
  announced = { double: false, overtime: false };

  constructor(cfg: [PlayerConfig, PlayerConfig], seed = 1) {
    this.rng = new Rng(seed);
    this.players = [this.makePlayer(0, cfg[0]), this.makePlayer(1, cfg[1])];
    for (const team of [0, 1] as Team[]) {
      for (const spec of TOWER_LAYOUT) {
        const pos = team === 0 ? { ...spec.pos } : mirrorPos(spec.pos);
        this.spawnTower(team, spec.type, spec.side, pos, spec.radius);
      }
    }
  }

  private makePlayer(team: Team, cfg: PlayerConfig): PlayerState {
    const deck = this.rng.shuffle([...cfg.deck]);
    return {
      team, elixir: START_ELIXIR, elixirMult: cfg.elixirMult ?? 1, deck, hand: deck.slice(0, 4), queue: deck.slice(4),
      crowns: 0, stats: newStats(), possessCd: 0, heroId: -1, isBot: cfg.isBot, name: cfg.name, lastDeployId: -1,
      streak: 0, streakT: -100, harvested: 0,
    };
  }

  player(team: Team): PlayerState { return this.players[team]; }

  /** Move a played card from the hand to the back of the queue and draw the next one. */
  cycleCard(p: PlayerState, handIndex: number): void {
    const played = p.hand[handIndex];
    const next = p.queue.shift();
    if (next) p.hand[handIndex] = next;
    p.queue.push(played);
  }

  nextCard(p: PlayerState): CardDef | undefined { return p.queue[0]; }

  addElixir(p: PlayerState, amount: number): void { p.elixir = Math.min(MAX_ELIXIR, p.elixir + amount); }

  emit(ev: GameEvent): void { this.events.push(ev); }
  addEffect(e: Omit<Effect, 't'>): void { this.effects.push({ ...e, t: 0 }); }
  text(pos: Vec, text: string, color: string, size = 0.55): void {
    this.effects.push({ type: 'text', pos: { x: pos.x + (this.rng.next() - 0.5) * 0.4, y: pos.y + (this.rng.next() - 0.5) * 0.3 }, t: 0, dur: 0.9, radius: 0, color, text, size });
  }

  private base(team: Team, pos: Vec, radius: number, hp: number, flying: boolean) {
    return {
      id: this.nextId++, team, pos: { ...pos }, radius, hp, maxHp: hp, dead: false, flying, status: freshStatus(),
      targetId: -1, attackCd: 0, facing: team === 0 ? -Math.PI / 2 : Math.PI / 2, hitFlash: 0, attackAnim: 0, shield: 0, bornAt: this.time,
    };
  }

  spawnUnit(def: TroopDef, team: Team, pos: Vec, opts: { deployTime?: number; fromSpawner?: boolean } = {}): Unit {
    const u: Unit = {
      ...this.base(team, pos, def.radius, def.hp, def.flying), kind: 'unit', def,
      deployT: opts.deployTime ?? def.deployTime, possessed: false, soulbound: false, moveT: 0, charging: false,
      abilityCd: 0, dashCd: 0, abilityT: 0, abilityTick: 0, abilityDir: { x: 0, y: -1 }, dashVel: null, dashT: 0, dashHits: new Set(),
      dashDamage: 0, dashStun: 0, dashKnockback: 0, dashBuildingMult: 1, dashKind: 'none', buffT: 0, buffSpeed: 1, buffAttack: 1, critNext: 1,
      lane: pos.x < 9 ? 0 : 1, vel: { x: 0, y: 0 }, bobT: this.rng.next() * 10, heroAttackHeld: false, lastPos: { ...pos }, stuckT: 0,
      waypoint: null, fromSpawner: opts.fromSpawner ?? false,
    };
    this.add(u);
    return u;
  }

  spawnBuilding(def: BuildingDef, team: Team, pos: Vec): Building {
    const b: Building = {
      ...this.base(team, pos, def.radius, def.hp, false), kind: 'building', def, deployT: def.deployTime, lifetime: def.lifetime,
      spawnT: def.spawn ? def.spawn.initialDelay + def.deployTime : 0,
    };
    this.add(b);
    return b;
  }

  spawnTower(team: Team, type: 'king' | 'princess', side: 'left' | 'right' | 'center', pos: Vec, radius: number): Tower {
    const spec = type === 'king' ? KING_TOWER : PRINCESS_TOWER;
    const t: Tower = {
      ...this.base(team, pos, radius, spec.hp, false), kind: 'tower', towerType: type, side, active: type === 'princess',
      damage: spec.damage, hitSpeed: spec.hitSpeed, range: spec.range,
    };
    this.add(t);
    return t;
  }

  private add(e: Entity): void { this.entities.push(e); this.byId.set(e.id, e); }

  get(id: number): Entity | undefined { const e = this.byId.get(id); return e && !e.dead ? e : undefined; }
  getUnit(id: number): Unit | undefined { const e = this.get(id); return e && e.kind === 'unit' ? e : undefined; }

  newProjectileId(): number { return this.nextId++; }

  *alive(): IterableIterator<Entity> { for (const e of this.entities) if (!e.dead) yield e; }
  *units(team?: Team): IterableIterator<Unit> { for (const e of this.entities) if (!e.dead && e.kind === 'unit' && (team === undefined || e.team === team)) yield e; }
  *enemiesOf(team: Team): IterableIterator<Entity> { for (const e of this.entities) if (!e.dead && e.team !== team) yield e; }
  *alliesOf(team: Team): IterableIterator<Entity> { for (const e of this.entities) if (!e.dead && e.team === team) yield e; }
  towers(team: Team): Tower[] { return this.entities.filter((e): e is Tower => e.kind === 'tower' && e.team === team && !e.dead); }
  king(team: Team): Tower | undefined { return this.towers(team).find((t) => t.towerType === 'king'); }
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

  /** Remove dead entities from the arrays. */
  sweep(): void {
    if (this.entities.some((e) => e.dead)) {
      for (const e of this.entities) if (e.dead) this.byId.delete(e.id);
      this.entities = this.entities.filter((e) => !e.dead);
    }
    if (this.projectiles.some((p) => p.dead)) this.projectiles = this.projectiles.filter((p) => !p.dead);
  }
}

export const isTroop = (e: Entity): e is Unit => e.kind === 'unit';
export const isStructure = (e: Entity): e is Building | Tower => e.kind !== 'unit';
export const canTarget = (targets: TroopDef['targets'], e: Entity): boolean => {
  switch (targets) {
    case 'buildings': return e.kind !== 'unit';
    case 'ground': return !e.flying;
    case 'air': return e.flying;
    case 'both': return true;
  }
};
export const frozen = (e: Entity): boolean => e.status.stun > 0 || e.status.freeze > 0;
export const speedMult = (u: Unit): number => u.status.rageSpeed * u.buffSpeed * (u.charging && u.def.charge ? u.def.charge.speedMult : 1);
export const attackSpeedMult = (e: Entity): number => e.status.rageAttack * (e.kind === 'unit' ? e.buffAttack : 1);
