import { updateZones } from './abilities.ts';
import { BOT_NAMES, BotHero, DIFFICULTIES, type Difficulty } from './bot.ts';
import { updateProjectiles } from './combat.ts';
import { TICK } from './constants.ts';
import { HEROES, pickTeam } from './heroes.ts';
import { updateHero, updateSeats, type HeroCommand } from './hero.ts';
import { updateTowers } from './structures.ts';
import { other, type Award, type Seat, type Stats, type Team } from './types.ts';
import { updateUnits } from './unit_ai.ts';
import { updateSpawns } from './waves.ts';
import { World, type TeamConfig } from './world.ts';
import { Rng } from '../engine/rng.ts';

export type MatchMode = '5v5' | '3v3' | '1v1';
export const MODE_SIZE: Record<MatchMode, number> = { '5v5': 5, '3v3': 3, '1v1': 1 };

export interface SeatSetup { heroId: string; isBot: boolean; name: string; spell?: string }

export interface SimConfig {
  mode: MatchMode;
  difficulty: Difficulty;
  seed: number;
  /** Per team: the seats. Missing seats are filled with bots. */
  teams: [SeatSetup[], SeatSetup[]];
  teamNames?: [string, string];
  /** Make everyone a bot (headless tests, menu demo). */
  botVsBot?: boolean;
  /** 节日模式 twist layer on top of the faithful rules. */
  twists?: boolean;
}

export const seatKey = (team: Team, index: number): string => `${team}:${index}`;
/** Commands for the human seats this tick; bot seats are driven locally. */
export type SeatCommands = ReadonlyMap<string, HeroCommand>;

/** Simulation state that is not part of the World but must travel with a snapshot. */
export interface SimInternals { acc: number; countdownStep: number }

/** Fill a side up to the mode's size with bots, avoiding duplicate heroes. */
export function completeTeam(seats: SeatSetup[], size: number, rng: Rng, taken: Set<string>, teamIndex: number, takenNames = new Set<string>()): SeatSetup[] {
  const out = seats.slice(0, size).map((s) => ({ ...s }));
  for (const s of out) { taken.add(s.heroId); takenNames.add(s.name); }
  const wanted = pickTeam(out[0]?.heroId ?? null, rng, taken).filter((id) => !taken.has(id));
  let n = 0;
  while (out.length < size) {
    const id = wanted.shift() ?? HEROES.map((h) => h.id).find((h) => !taken.has(h)) ?? HEROES[0].id;
    taken.add(id);
    let name = BOT_NAMES[(teamIndex * 7 + n * 2 + Math.floor(rng.next() * 3)) % BOT_NAMES.length];
    while (out.some((o) => o.name === name) || takenNames.has(name)) name = BOT_NAMES[(BOT_NAMES.indexOf(name) + 1) % BOT_NAMES.length];
    takenNames.add(name);
    out.push({ heroId: id, isBot: true, name });
    n++;
  }
  return out;
}

export class Simulation {
  readonly w: World;
  readonly bots: BotHero[] = [];
  readonly difficulty: Difficulty;
  readonly mode: MatchMode;
  readonly cfg: SimConfig;
  private acc = 0;
  private countdownStep = 4;

  constructor(cfg: SimConfig) {
    this.cfg = cfg;
    this.difficulty = cfg.difficulty;
    this.mode = cfg.mode;
    const spec = DIFFICULTIES[cfg.difficulty];
    const size = MODE_SIZE[cfg.mode];
    const rng = new Rng(cfg.seed ^ 0x9e3779b9);
    const taken = new Set<string>();
    const takenNames = new Set<string>();
    const teams: [TeamConfig, TeamConfig] = [0, 1].map((t) => {
      const seats = completeTeam(cfg.teams[t], size, rng, taken, t, takenNames).map((s) => ({ ...s, isBot: cfg.botVsBot ? true : s.isBot }));
      return { name: cfg.teamNames?.[t] ?? (t === 0 ? '@team.blue' : '@team.red'), seats };
    }) as [TeamConfig, TeamConfig];
    this.w = new World(teams, cfg.seed);
    this.w.twists = !!cfg.twists;
    this.w.mode = cfg.mode;
    this.bots.push(new BotHero(0, spec), new BotHero(1, spec));
    if (cfg.mode === '1v1') this.w.closeSideLanes();
  }

  get internals(): SimInternals { return { acc: this.acc, countdownStep: this.countdownStep }; }
  restoreInternals(s: SimInternals): void { this.acc = s.acc; this.countdownStep = s.countdownStep; }

  skipCountdown(): void {
    const w = this.w;
    if (w.phase !== 'countdown') return;
    w.countdown = 0; w.phase = 'regulation'; this.countdownStep = 0;
  }

  /** Advance the simulation by wall-clock `elapsed` seconds using fixed ticks. */
  advance(elapsed: number, cmds: SeatCommands | HeroCommand): void {
    this.acc += Math.min(elapsed, 0.25);
    while (this.acc >= TICK) { this.step(TICK, cmds); this.acc -= TICK; }
  }

  forfeit(loser: Team, reason: string): void { this.finish(other(loser), reason); }

  step(dt: number, cmds: SeatCommands | HeroCommand): void {
    const w = this.w;
    const map: SeatCommands = cmds instanceof Map ? cmds : new Map(w.humanSeats().map((s) => [seatKey(s.team, s.index), cmds as HeroCommand]));
    if (w.phase === 'ended') return;
    if (w.phase === 'countdown') {
      if (this.countdownStep === 4) { this.countdownStep = 3; w.emit({ type: 'countdown', text: '3' }); }
      w.countdown -= dt;
      const step = Math.ceil(w.countdown);
      if (step < this.countdownStep && step >= 1) { this.countdownStep = step; w.emit({ type: 'countdown', text: String(step) }); }
      if (w.countdown <= 0) { w.countdown = 0; w.phase = 'regulation'; this.countdownStep = 0; w.emit({ type: 'countdown', text: '@countdown.fight', big: true }); }
      this.updateEffects(dt);
      return;
    }
    w.time += dt;
    if (w.result) return;
    // passive gold
    for (const p of w.players) for (const s of p.seats) { s.gold += 3 * dt; const h = w.getUnit(s.heroId); if (h) h.gold = s.gold; }
    updateSeats(w, dt);
    w.updateBushes();
    for (const p of w.players) for (const s of p.seats) {
      const h = w.getUnit(s.heroId);
      if (!h) continue;
      // a human seat without a command this tick (e.g. a dropped player) is driven by the bot
      const cmd: HeroCommand = (s.isBot ? undefined : map.get(seatKey(s.team, s.index))) ?? this.bots[s.team].command(w, s, h, dt);
      updateHero(w, h, cmd, dt);
    }
    updateUnits(w, dt);
    updateTowers(w, dt);
    updateProjectiles(w, dt);
    updateZones(w, dt);
    updateSpawns(w, dt);
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
    if (w.effects.length > 600) w.effects = w.effects.filter((e, i) => e.type === 'crater' || i > w.effects.length - 450);
  }

  private checkVictory(): void {
    const w = this.w;
    if (!w.crystal(1)) return this.finish(0, '@result.crystal');
    if (!w.crystal(0)) return this.finish(1, '@result.crystal');
  }

  private finish(winner: Team | -1, reason: string): void {
    const w = this.w;
    if (w.phase === 'ended') return;
    w.phase = 'ended';
    w.result = { winner, reason, crowns: [w.players[0].kills, w.players[1].kills], awards: computeAwards(w), duration: w.time };
    w.emit({ type: 'end', team: winner === -1 ? undefined : winner, text: reason, big: true });
  }
}

/** Post-match awards: the best seat for each category. */
export function computeAwards(w: World): Award[] {
  const seats: Seat[] = [...w.players[0].seats, ...w.players[1].seats];
  const out: Award[] = [];
  const top = (title: string, key: keyof Stats, min = 1) => {
    let best: Seat | undefined, bv = -Infinity;
    for (const s of seats) { const v = s.stats[key]; if (v > bv) { bv = v; best = s; } }
    if (!best || bv < min) return;
    out.push({ title, team: best.team, value: Math.round(bv), seat: best.name });
  };
  top('@award.champion', 'heroDamage');
  top('@award.warlord', 'towerDamage');
  top('@award.executioner', 'heroKills', 2);
  top('@award.farmer', 'minionKills', 20);
  top('@award.guardian', 'healing', 500);
  top('@award.rampage', 'bestStreak', 3);
  top('@award.bigSpender', 'goldEarned');
  top('@award.objectives', 'objectives', 1);
  return out.slice(0, 8);
}
