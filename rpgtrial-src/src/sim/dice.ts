import { Rng } from './rng.ts';
import type { RollResult } from '../core/events.ts';

export type Advantage = 'adv' | 'dis' | null;

/** Roll NdS, returns individual dice. */
export function rollDice(rng: Rng, n: number, sides: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rng.int(1, sides));
  return out;
}
/** Parse "2d6+3", "1d8", "d4", "3" into {n, sides, mod}. */
export function parseDice(expr: string): { n: number; sides: number; mod: number } {
  const m = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(expr);
  if (!m) { const v = Number(expr); return { n: 0, sides: 0, mod: isNaN(v) ? 0 : v }; }
  return { n: m[1] ? Number(m[1]) : 1, sides: Number(m[2]), mod: m[3] ? Number(m[3].replace(/\s/g, '')) : 0 };
}
export function rollExpr(rng: Rng, expr: string, extraDiceMultiplier = 1): { total: number; dice: number[]; mod: number } {
  const { n, sides, mod } = parseDice(expr);
  const dice = n ? rollDice(rng, n * extraDiceMultiplier, sides) : [];
  return { total: dice.reduce((a, b) => a + b, 0) + mod, dice, mod };
}
export const avgExpr = (expr: string) => { const { n, sides, mod } = parseDice(expr); return n * (sides + 1) / 2 + mod; };

/** A d20 test: attack roll, saving throw or ability check. */
export function d20(rng: Rng, opts: {
  kind: RollResult['kind']; label: string; bonus: number; dc?: number; advantage?: Advantage;
  bonusDice?: { label: string; expr: string }[];
}): RollResult {
  let a = rng.int(1, 20);
  if (opts.advantage) {
    const b = rng.int(1, 20);
    a = opts.advantage === 'adv' ? Math.max(a, b) : Math.min(a, b);
  }
  const bonusDice = (opts.bonusDice ?? []).map((d) => ({ label: d.label, value: rollExpr(rng, d.expr).total }));
  const extra = bonusDice.reduce((s, d) => s + d.value, 0);
  const total = a + opts.bonus + extra;
  const crit: RollResult['crit'] = a === 20 ? 'hit' : a === 1 ? 'miss' : null;
  let success: boolean | undefined;
  if (opts.dc !== undefined) success = crit === 'hit' ? true : crit === 'miss' && opts.kind === 'attack' ? false : total >= opts.dc;
  return { kind: opts.kind, label: opts.label, d20: a, bonus: opts.bonus + extra, total, dc: opts.dc, success, crit, advantage: opts.advantage ?? null, bonusDice };
}
export const mod = (score: number) => Math.floor((score - 10) / 2);
export const profBonus = (level: number) => 2 + Math.floor((level - 1) / 4);
