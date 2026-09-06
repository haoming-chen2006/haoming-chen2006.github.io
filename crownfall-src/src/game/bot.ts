import { dist, type Vec } from '../engine/math.ts';
import { ARENA_H, ARENA_W, LANE_X, RIVER_BOT, RIVER_MID, RIVER_TOP } from './constants.ts';
import { canDeploy, deployCard } from './deploy.ts';
import { other, type CardDef, type Entity, type SpellDef, type Team, type TroopDef, type Unit } from './types.ts';
import { World } from './world.ts';

export type Difficulty = 'easy' | 'normal' | 'hard';
export interface DifficultyConfig {
  name: string;
  elixirMult: number;
  reaction: number;
  noise: number;
  aggression: number;
  label: string;
  /** How eagerly the bot possesses a troop (0 = never). */
  possessChance: number;
  possessCooldown: number;
  heroReaction: number;
  heroAimJitter: number;
}
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { name: 'Squire Bot', elixirMult: 0.65, reaction: 2.8, noise: 2.5, aggression: 0.3, label: 'Easy', possessChance: 0, possessCooldown: 999, heroReaction: 1.0, heroAimJitter: 1.2 },
  normal: { name: 'Captain Bot', elixirMult: 0.85, reaction: 1.4, noise: 1.0, aggression: 0.55, label: 'Normal', possessChance: 0.3, possessCooldown: 32, heroReaction: 0.8, heroAimJitter: 0.9 },
  hard: { name: 'Warlord Bot', elixirMult: 1.12, reaction: 0.45, noise: 0.35, aggression: 1.0, label: 'Hard', possessChance: 0.9, possessCooldown: 12, heroReaction: 0.2, heroAimJitter: 0.15 },
};

interface Threat { units: Unit[]; lane: 0 | 1; centroid: Vec; hp: number; dps: number; count: number; hasAir: boolean; allAir: boolean; tank: boolean; hero: boolean }
interface Followup { cardId: string; pos: Vec; at: number }

/** Scripted opponent: defends threats with sensible counters, builds pushes when rich, uses spells for value. */
export class Bot {
  readonly team: Team;
  private nextThink: number;
  private followups: Followup[] = [];
  private lastPushLane: 0 | 1 = 0;
  private cfg: DifficultyConfig;
  private opened = false;

  constructor(team: Team, cfg: DifficultyConfig) {
    this.team = team;
    this.cfg = cfg;
    this.nextThink = 2.5;
  }

  update(w: World, dt: number): void {
    this.nextThink -= dt;
    // scheduled follow-ups (support behind a tank, etc.)
    if (this.followups.length) {
      const due = this.followups.filter((f) => f.at <= w.time);
      this.followups = this.followups.filter((f) => f.at > w.time);
      for (const f of due) this.playById(w, f.cardId, f.pos);
    }
    if (this.nextThink > 0) return;
    if (!this.opened) {
      // vary the opening so no two matches start alike
      this.opened = true;
      this.lastPushLane = w.rng.chance(0.5) ? 0 : 1;
      this.nextThink = 1 + w.rng.next() * 3;
      return;
    }
    this.nextThink = this.cfg.reaction * (0.7 + w.rng.next() * 0.6);
    this.think(w);
  }

  private forward(y: number): number { return this.team === 1 ? y : ARENA_H - y; } // bot-relative -> world (bot at top by default)
  private laneOf(x: number): 0 | 1 { return x < ARENA_W / 2 ? 0 : 1; }
  private onMySide(e: Entity): boolean { return this.team === 1 ? e.pos.y < RIVER_MID + 1.5 : e.pos.y > RIVER_MID - 1.5; }

  private think(w: World): void {
    const p = w.players[this.team];
    const enemy = other(this.team);
    const threats = this.assessThreats(w, enemy);
    // 1. Spells for value or lethal
    if (this.trySpell(w, threats)) return;
    // 2. Defend
    const biggest = threats.sort((a, b) => b.hp * (1 + b.dps / 100) - a.hp * (1 + a.dps / 100))[0];
    if (biggest && (biggest.hp > 250 || biggest.count >= 3 || biggest.hero) && this.defend(w, biggest)) return;
    // 3. Build a push when rich or when the opponent is overextended
    const enemyUnitsOnMySide = threats.reduce((s, t) => s + t.count, 0);
    const richThreshold = 9.5 - this.cfg.aggression * 1.5;
    if (p.elixir >= richThreshold && enemyUnitsOnMySide === 0) { if (this.push(w)) return; }
    // 4. Counterpush / support units already on the way
    if (p.elixir >= 6 && this.support(w)) return;
    // 5. Quick punish: fast wincon when enemy is low on elixir-equivalent presence
    if (p.elixir >= 7 && w.rng.chance(0.3 * this.cfg.aggression) && this.push(w)) return;
    // 6. Cycle at full elixir
    if (p.elixir >= 9.8) this.cycle(w);
  }

  private assessThreats(w: World, enemy: Team): Threat[] {
    const lanes: [Unit[], Unit[]] = [[], []];
    for (const u of w.units(enemy)) if (this.onMySide(u)) lanes[this.laneOf(u.pos.x)].push(u);
    const out: Threat[] = [];
    for (const lane of [0, 1] as const) {
      const units = lanes[lane];
      if (!units.length) continue;
      const c = units.reduce((s, u) => ({ x: s.x + u.pos.x / units.length, y: s.y + u.pos.y / units.length }), { x: 0, y: 0 });
      out.push({
        units, lane, centroid: c, count: units.length,
        hp: units.reduce((s, u) => s + u.hp, 0),
        dps: units.reduce((s, u) => s + u.def.damage / u.def.hitSpeed, 0),
        hasAir: units.some((u) => u.flying), allAir: units.every((u) => u.flying),
        tank: units.some((u) => u.hp >= 1200), hero: units.some((u) => u.possessed),
      });
    }
    return out;
  }

  private trySpell(w: World, threats: Threat[]): boolean {
    const p = w.players[this.team];
    const enemy = other(this.team);
    for (let i = 0; i < p.hand.length; i++) {
      const card = p.hand[i];
      if (card.kind !== 'spell' || p.elixir < card.cost) continue;
      // lethal on a tower?
      if (card.damage > 0) {
        for (const t of w.towers(enemy)) {
          if (t.hp <= card.damage * card.towerMult && (t.towerType === 'princess' || t.active)) { deployCard(w, this.team, i, t.pos); return true; }
        }
      }
      if (card.effect === 'frenzy') {
        // buff a push of ours on the enemy side (or our own champion when it is fighting)
        const mine = [...w.units(this.team)].filter((u) => !this.onMySide(u) && u.deployT <= 0);
        const hero = w.hero(this.team);
        if (mine.length >= 3 && p.elixir >= card.cost + 2) { const c = mine[0].pos; deployCard(w, this.team, i, c); return true; }
        if (hero && !this.onMySide(hero) && p.elixir >= card.cost + 3 && w.rng.chance(0.3)) { deployCard(w, this.team, i, hero.pos); return true; }
        continue;
      }
      // the enemy champion is a priority target for stuns and freezes
      const enemyHero = w.hero(enemy);
      if (enemyHero && (card.effect === 'shock' || card.effect === 'frost') && this.onMySide(enemyHero) && enemyHero.hp < card.damage * 3 + 400 && w.rng.chance(0.6)) {
        deployCard(w, this.team, i, enemyHero.pos);
        return true;
      }
      // value: cluster of enemy units worth more than the spell
      let best: { pos: Vec; value: number } | null = null;
      const candidates = [...w.units(enemy)].filter((u) => u.deployT <= 0);
      for (const u of candidates) {
        let value = 0, count = 0;
        for (const o of candidates) {
          if (dist(o.pos, u.pos) > card.radius) continue;
          const kills = o.hp <= card.damage;
          value += kills ? o.def.cost / o.def.count + 0.3 : (o.def.cost / o.def.count) * 0.4 * Math.min(1, card.damage / o.hp);
          if (o.possessed) value += 1.0;
          count++;
        }
        if (card.effect === 'frost' && count >= 2) value += 1.5;
        if (!best || value > best.value) best = { pos: u.pos, value };
      }
      const needed = card.cost * (0.9 + this.cfg.noise * 0.25);
      if (best && best.value >= needed) {
        // lead the target slightly towards our towers (units keep walking during the delay)
        const lead = card.delay * 0.8;
        const pos = { x: best.pos.x, y: best.pos.y + (this.team === 1 ? -lead : lead) };
        deployCard(w, this.team, i, pos);
        return true;
      }
      void threats;
    }
    return false;
  }

  private scoreCounter(card: CardDef, t: Threat): number {
    if (card.kind === 'spell') return -100;
    let s = 0;
    if (card.kind === 'building') {
      s += t.tank ? 2.5 : 0.4;
      if (t.allAir && card.targets === 'ground') s -= 10;
      if (card.targets === 'both') s += t.hasAir ? 1.5 : 0.3;
      if (card.damage <= 0) s -= 3;
      return s;
    }
    const c: TroopDef = card;
    const canAir = c.targets === 'both' || c.targets === 'air';
    if (t.allAir && !canAir) return -10;
    if (t.hasAir && canAir) s += 2;
    if (t.count >= 4 && (c.splash > 0 || c.count >= 3)) s += 3;
    if (t.count >= 6 && c.splash > 0) s += 2;
    if (t.tank) { s += (c.damage / c.hitSpeed) / 120; if (c.role === 'dps') s += 1.5; }
    if (c.targets === 'buildings') s -= 6;
    if (c.role === 'tank' && t.dps > 200) s += 1;
    if (c.role === 'support') s -= 1;
    if (t.hero) {
      // a human-driven champion is best answered by things it can't kite: swarms, splash, stuns
      if (c.role === 'swarm' || c.count >= 3) s += 1.5;
      if (c.splash > 0) s += 1;
      if (c.chain) s += 1;
      if (c.role === 'tank') s -= 0.5;
    }
    // efficiency: prefer cheap answers to small threats
    const threatValue = t.hp / 400 + t.dps / 150;
    s -= Math.max(0, c.cost - threatValue) * 0.5;
    return s;
  }

  private defend(w: World, t: Threat): boolean {
    const p = w.players[this.team];
    let bestIdx = -1, bestScore = -Infinity;
    for (let i = 0; i < p.hand.length; i++) {
      const card = p.hand[i];
      if (p.elixir < card.cost) continue;
      const s = this.scoreCounter(card, t) + (w.rng.next() - 0.5) * this.cfg.noise;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
    if (bestIdx < 0 || bestScore < -1) return false;
    const card = p.hand[bestIdx];
    const towerY = this.forward(6.5);
    const tower: Vec = { x: LANE_X[t.lane], y: towerY };
    const dx = t.centroid.x - tower.x, dy = t.centroid.y - tower.y;
    const d = Math.hypot(dx, dy) || 1;
    const ranged = card.kind === 'troop' && card.range >= 3;
    const dep = card.kind === 'building' ? 1.5 : ranged ? 2.0 : Math.min(d - 1.2, 3.2);
    const pull = card.kind === 'building' ? { x: ARENA_W / 2, y: this.forward(9) } : null; // buildings go central to pull
    let pos: Vec = pull ?? { x: tower.x + (dx / d) * dep, y: tower.y + (dy / d) * dep };
    // keep it on our side of the river
    const riverEdge = this.team === 1 ? RIVER_TOP - 0.8 : RIVER_BOT + 0.8;
    if (this.team === 1) pos.y = Math.min(pos.y, riverEdge); else pos.y = Math.max(pos.y, riverEdge);
    return this.playAt(w, bestIdx, pos);
  }

  private push(w: World): boolean {
    const p = w.players[this.team];
    const enemy = other(this.team);
    // pick the lane with the weakest enemy tower
    const towers = w.towers(enemy).filter((t) => t.towerType === 'princess');
    let lane: 0 | 1 = this.lastPushLane;
    if (towers.length === 0) lane = w.rng.chance(0.5) ? 0 : 1;
    else if (towers.length === 1) lane = this.laneOf(towers[0].pos.x);
    else lane = towers[0].hp <= towers[1].hp ? this.laneOf(towers[0].pos.x) : this.laneOf(towers[1].pos.x);
    this.lastPushLane = lane;
    const order = (c: CardDef): number => (c.kind === 'troop' ? (c.role === 'tank' || c.role === 'wincon' ? 3 : c.role === 'dps' ? 2 : c.role === 'ranged' || c.role === 'splash' ? 1 : 0.5) : c.kind === 'building' && c.spawn ? 1.2 : -5);
    let bestIdx = -1, best = -Infinity;
    for (let i = 0; i < p.hand.length; i++) {
      const c = p.hand[i];
      if (p.elixir < c.cost) continue;
      const s = order(c) + c.cost * 0.15 + (w.rng.next() - 0.5) * this.cfg.noise * 0.5;
      if (s > best) { best = s; bestIdx = i; }
    }
    if (bestIdx < 0 || best < 0) return false;
    const c = p.hand[bestIdx];
    const fast = c.kind === 'troop' && c.speed >= 2;
    const slow = c.kind === 'troop' && (c.role === 'tank' || c.role === 'wincon') && !fast;
    const y = fast ? this.forward(13.4) : slow ? this.forward(3.8) : this.forward(9.5);
    const x = LANE_X[lane] + (w.rng.next() - 0.5) * 1.0;
    const pos = { x, y };
    if (!this.playAt(w, bestIdx, pos)) return false;
    // schedule support behind a tank
    if (slow) {
      const supp = p.hand.map((h, i) => ({ h, i })).filter(({ h }) => h.kind === 'troop' && (h.role === 'ranged' || h.role === 'splash' || h.role === 'support' || h.role === 'air'));
      const pick = supp[Math.floor(w.rng.next() * supp.length)];
      if (pick) this.followups.push({ cardId: pick.h.id, pos: { x, y: this.forward(2.6) }, at: w.time + 2.5 + w.rng.next() * 2 });
    }
    return true;
  }

  private support(w: World): boolean {
    const p = w.players[this.team];
    const hero = w.hero(this.team);
    if (hero && !this.onMySide(hero) && hero.hp > hero.maxHp * 0.4) {
      // reinforce our own champion right where it fights
      let bestIdx = -1, best = -Infinity;
      for (let i = 0; i < p.hand.length; i++) {
        const c = p.hand[i];
        if (p.elixir < c.cost || c.kind !== 'troop') continue;
        const s = (c.role === 'ranged' || c.role === 'splash' || c.role === 'support' ? 2 : c.role === 'swarm' ? 1.2 : 0.5) + (w.rng.next() - 0.5) * this.cfg.noise * 0.5;
        if (s > best) { best = s; bestIdx = i; }
      }
      if (bestIdx >= 0 && best >= 1 && this.playAt(w, bestIdx, { x: hero.pos.x, y: hero.pos.y - this.forward(1) + this.forward(0) + (this.team === 1 ? -1.5 : 1.5) })) return true;
    }
    const mine = [...w.units(this.team)].filter((u) => !u.fromSpawner && u.deployT <= 0 && u.def.role !== 'swarm');
    const front = mine.filter((u) => (this.team === 1 ? u.pos.y > 10 : u.pos.y < ARENA_H - 10));
    if (front.length === 0) return false;
    const lead = front.reduce((a, b) => ((this.team === 1 ? a.pos.y > b.pos.y : a.pos.y < b.pos.y) ? a : b));
    if (!(lead.def.role === 'tank' || lead.def.role === 'wincon' || lead.hp > 900)) return false;
    let bestIdx = -1, best = -Infinity;
    for (let i = 0; i < p.hand.length; i++) {
      const c = p.hand[i];
      if (p.elixir < c.cost || c.kind !== 'troop') continue;
      const s = (c.role === 'ranged' || c.role === 'splash' || c.role === 'air' ? 2 : c.role === 'support' ? 1.5 : 0) + (w.rng.next() - 0.5) * this.cfg.noise * 0.5;
      if (s > best) { best = s; bestIdx = i; }
    }
    if (bestIdx < 0 || best < 1) return false;
    const behind = { x: lead.pos.x, y: lead.pos.y + (this.team === 1 ? -2.2 : 2.2) };
    return this.playAt(w, bestIdx, behind);
  }

  private cycle(w: World): boolean {
    const p = w.players[this.team];
    let idx = -1, cost = Infinity;
    for (let i = 0; i < p.hand.length; i++) { const c = p.hand[i]; if (c.kind !== 'spell' && c.cost < cost) { cost = c.cost; idx = i; } }
    if (idx >= 0) return this.playAt(w, idx, { x: LANE_X[this.lastPushLane], y: this.forward(3.8) });
    // only spells in hand: chip the weakest enemy tower rather than sit at full elixir
    const enemy = other(this.team);
    const towers = w.towers(enemy).filter((t) => t.towerType === 'princess');
    const target = towers.sort((a, b) => a.hp - b.hp)[0] ?? w.king(enemy);
    if (!target) return false;
    let sIdx = -1, sCost = Infinity;
    for (let i = 0; i < p.hand.length; i++) { const c = p.hand[i]; if (c.kind === 'spell' && c.damage > 0 && c.cost < sCost) { sCost = c.cost; sIdx = i; } }
    return sIdx >= 0 ? deployCard(w, this.team, sIdx, target.pos) : false;
  }

  private playById(w: World, cardId: string, pos: Vec): boolean {
    const p = w.players[this.team];
    const idx = p.hand.findIndex((c) => c.id === cardId);
    if (idx < 0 || p.elixir < p.hand[idx].cost) return false;
    return this.playAt(w, idx, pos);
  }

  /** Deploy with a few fallback offsets so the placement survives water/tower footprints. */
  private playAt(w: World, idx: number, pos: Vec): boolean {
    const card = w.players[this.team].hand[idx];
    const tries: Vec[] = [pos, { x: pos.x + 1, y: pos.y }, { x: pos.x - 1, y: pos.y }, { x: pos.x, y: pos.y + (this.team === 1 ? -1 : 1) }, { x: pos.x, y: pos.y + (this.team === 1 ? -2 : 2) }, { x: pos.x + 2, y: pos.y + (this.team === 1 ? -1 : 1) }];
    for (const t of tries) {
      const c = { x: Math.min(ARENA_W - 0.6, Math.max(0.6, t.x)), y: Math.min(ARENA_H - 0.6, Math.max(0.6, t.y)) };
      if (canDeploy(w, this.team, card, c).ok) return deployCard(w, this.team, idx, c);
    }
    return false;
  }
}

export const isSpell = (c: CardDef): c is SpellDef => c.kind === 'spell';
