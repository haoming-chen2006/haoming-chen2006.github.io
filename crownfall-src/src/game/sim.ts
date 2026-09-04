import { Bot, DIFFICULTIES, type Difficulty } from './bot.ts';
import { BotHero } from './bot_hero.ts';
import { COMEBACK_ELIXIR_MULT, DOUBLE_ELIXIR_AT, ELIXIR_PER_SEC, MAX_ELIXIR, OVERTIME_TIME, TICK } from './constants.ts';
import { resolvePendingSpells, updateZones } from './deploy.ts';
import { updateHero, type HeroCommand } from './hero.ts';
import { updateBuildings, updateTowers } from './structures.ts';
import { updateProjectiles } from './combat.ts';
import { updateUnits } from './unit_ai.ts';
import type { Award, CardDef, Stats, Team } from './types.ts';
import { World } from './world.ts';

export interface SimConfig {
  playerDeck: CardDef[];
  botDeck: CardDef[];
  difficulty: Difficulty;
  seed: number;
  playerName?: string;
  /** Make both sides bots (used by the headless simulation and the menu demo). */
  botVsBot?: boolean;
}

export class Simulation {
  readonly w: World;
  readonly bots: Bot[] = [];
  readonly botHeroes: BotHero[] = [];
  readonly difficulty: Difficulty;
  private acc = 0;
  private countdownStep = 4;

  constructor(cfg: SimConfig) {
    const d = DIFFICULTIES[cfg.difficulty];
    this.difficulty = cfg.difficulty;
    this.w = new World([
      { deck: cfg.playerDeck, isBot: !!cfg.botVsBot, name: cfg.playerName ?? 'You' },
      { deck: cfg.botDeck, isBot: true, name: d.name, elixirMult: d.elixirMult },
    ], cfg.seed);
    this.bots.push(new Bot(1, d));
    this.botHeroes.push(new BotHero(1, d));
    if (cfg.botVsBot) { this.bots.push(new Bot(0, DIFFICULTIES.normal)); this.botHeroes.push(new BotHero(0, DIFFICULTIES.normal)); }
  }

  /** Jump straight into the fight (tests and background demos). */
  skipCountdown(): void {
    const w = this.w;
    if (w.phase !== 'countdown') return;
    w.countdown = 0;
    w.phase = 'regulation';
    this.countdownStep = 0;
  }

  /** Advance the simulation by wall-clock `elapsed` seconds using fixed ticks. */
  advance(elapsed: number, cmd: HeroCommand): void {
    this.acc += Math.min(elapsed, 0.25);
    while (this.acc >= TICK) { this.step(TICK, cmd); this.acc -= TICK; }
  }

  step(dt: number, cmd: HeroCommand): void {
    const w = this.w;
    if (w.phase === 'ended') return;
    if (w.phase === 'countdown') {
      if (this.countdownStep === 4) { this.countdownStep = 3; w.emit({ type: 'countdown', text: '3' }); }
      w.countdown -= dt;
      const step = Math.ceil(w.countdown);
      if (step < this.countdownStep && step >= 1) { this.countdownStep = step; w.emit({ type: 'countdown', text: String(step) }); }
      if (w.countdown <= 0) { w.countdown = 0; w.phase = 'regulation'; this.countdownStep = 0; w.emit({ type: 'countdown', text: 'Fight!', big: true }); }
      // keep the visuals alive, but nothing moves
      this.updateEffects(dt);
      return;
    }
    w.time += dt;
    w.timeLeft -= dt;
    if (w.phase === 'regulation') {
      if (w.timeLeft <= DOUBLE_ELIXIR_AT && !w.announced.double) { w.announced.double = true; w.elixirRate = 2; w.emit({ type: 'doubleElixir', text: 'Double Elixir!' }); }
      if (w.timeLeft <= 0) this.endRegulation();
    } else if (w.phase === 'overtime' && w.timeLeft <= 0) { this.tiebreak(); }
    if (w.result) return;
    for (const p of w.players) {
      const behind = p.crowns < w.players[p.team === 0 ? 1 : 0].crowns ? COMEBACK_ELIXIR_MULT : 1;
      p.elixir = Math.min(MAX_ELIXIR, p.elixir + ELIXIR_PER_SEC * w.elixirRate * p.elixirMult * behind * dt);
      if (p.possessCd > 0) p.possessCd -= dt;
      if (p.heroId >= 0 && !p.isBot) p.stats.heroTime += dt;
    }
    if (!w.players[0].isBot) updateHero(w, 0, cmd, dt);
    for (const b of this.bots) b.update(w, dt);
    for (const bh of this.botHeroes) updateHero(w, bh.team, bh.update(w, dt), dt);
    updateUnits(w, dt);
    updateBuildings(w, dt);
    updateTowers(w, dt);
    updateProjectiles(w, dt);
    resolvePendingSpells(w, dt);
    updateZones(w, dt);
    this.updateEffects(dt);
    w.sweep();
    this.checkVictory();
  }

  private updateEffects(dt: number): void {
    const w = this.w;
    for (const e of w.effects) {
      e.t += dt;
      if (e.vel) { e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt; }
    }
    w.effects = w.effects.filter((e) => e.t < e.dur);
    if (w.effects.length > 500) w.effects = w.effects.filter((e, i) => e.type === 'crater' || i > w.effects.length - 400);
  }

  private endRegulation(): void {
    const w = this.w;
    const [a, b] = w.players;
    if (a.crowns !== b.crowns) return this.finish(a.crowns > b.crowns ? 0 : 1, 'More crowns at the end of regulation');
    w.phase = 'overtime';
    w.timeLeft = OVERTIME_TIME;
    w.elixirRate = 3;
    w.announced.overtime = true;
    w.emit({ type: 'overtime', text: 'Overtime! Next tower wins' });
  }

  private tiebreak(): void {
    const w = this.w;
    const lowest = (team: Team) => Math.min(...w.towers(team).map((t) => t.hp));
    const l0 = lowest(0), l1 = lowest(1);
    if (Math.abs(l0 - l1) < 1) return this.finish(-1, 'Draw');
    this.finish(l0 > l1 ? 0 : 1, 'Tiebreaker: lowest tower health');
  }

  private checkVictory(): void {
    const w = this.w;
    const [a, b] = w.players;
    if (a.crowns >= 3) return this.finish(0, 'King tower destroyed');
    if (b.crowns >= 3) return this.finish(1, 'King tower destroyed');
    if (w.phase === 'overtime' && a.crowns !== b.crowns) return this.finish(a.crowns > b.crowns ? 0 : 1, 'First tower in overtime');
  }

  private finish(winner: Team | -1, reason: string): void {
    const w = this.w;
    if (w.phase === 'ended') return;
    w.phase = 'ended';
    w.result = { winner, reason, crowns: [w.players[0].crowns, w.players[1].crowns], awards: computeAwards(w.players[0].stats, w.players[1].stats) };
    for (const team of [0, 1] as Team[]) { const h = w.hero(team); if (h) h.possessed = false; w.players[team].heroId = -1; }
    w.emit({ type: 'end', team: winner === -1 ? undefined : winner, text: reason });
  }
}

/** Post-match awards: one line per notable achievement, for either side. */
export function computeAwards(s0: Stats, s1: Stats): Award[] {
  const out: Award[] = [];
  const both: [Stats, Stats] = [s0, s1];
  const top = (key: keyof Stats, title: string, desc: (v: number) => string, min = 1) => {
    const v0 = both[0][key], v1 = both[1][key];
    if (Math.max(v0, v1) < min) return;
    if (v0 === v1) return;
    const team: Team = v0 > v1 ? 0 : 1;
    out.push({ title, desc: desc(Math.round(both[team][key])), team, value: both[team][key] });
  };
  top('heroDamage', 'Champion', (v) => `${v} damage dealt in person`);
  top('towerDamage', 'Warlord', (v) => `${v} damage to towers`);
  top('unitKills', 'Executioner', (v) => `${v} enemy troops defeated`, 3);
  top('possessions', 'Soul Harvester', (v) => `${v} possessions`, 2);
  top('bestStreak', 'Rampage', (v) => `Best streak: ${v} kills`, 3);
  top('elixirSpent', 'Big Spender', (v) => `${v} elixir spent`);
  for (const team of [0, 1] as Team[]) {
    const s = both[team];
    if (s.possessions > 0 && s.heroDeaths === 0) out.push({ title: 'Untouchable', desc: 'Possessed and never fell', team, value: s.possessions });
    if (s.heroTime >= 60) out.push({ title: 'Frontline General', desc: `${Math.round(s.heroTime)}s spent as a champion`, team, value: s.heroTime });
  }
  return out.slice(0, 8);
}
