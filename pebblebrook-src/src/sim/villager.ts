/**
 * Live villagers: creation from the cast spec, need decay shaped by personality, mood, status flags,
 * skills and day plans.
 */
import { clamp } from '../core/index.ts';
import type { DayPlan, Needs, Rng, ScheduleEntry, SkillName, StatusFlag, Villager, World } from '../core/types.ts';
import { SCHEDULES, type VillagerSpec } from '../core/villagers.ts';
import type { VillagerRuntime } from './core.ts';

export const SKILLS: SkillName[] = ['farming', 'fishing', 'mining', 'cooking', 'crafting', 'charm', 'lore', 'medicine'];

export function createVillager(spec: VillagerSpec, world: World): Villager {
  const home = world.place(spec.home);
  const pos = home?.interior ?? home?.anchor ?? { x: 1, y: 1 };
  const skills = Object.fromEntries(SKILLS.map((s) => [s, spec.skills[s] ?? 0])) as Record<SkillName, number>;
  const v: Villager = {
    id: spec.id, name: spec.name, profession: spec.profession, home: spec.home, workplace: spec.workplace,
    pos: { ...pos }, facing: 'down', inside: home ? spec.home : undefined,
    needs: { energy: 88, hunger: 55, social: 60, fun: 55, comfort: 80, purpose: 55 },
    mood: 0.1, money: spec.money,
    inventory: spec.inventory.map(([id, qty]) => ({ id, qty })),
    skills, health: 95, personality: { ...spec.personality, traits: [...spec.personality.traits], likes: [...spec.personality.likes], dislikes: [...spec.personality.dislikes] },
    relationships: {}, memory: [], goals: [], plan: null, action: null, queue: [], status: [],
    look: { ...spec.look }, brain: 'local', birthday: { ...spec.birthday }, stats: {},
  };
  return v;
}

export function createRuntime(id: string): VillagerRuntime {
  return {
    id, pending: false, idleSince: 0, longestIdle: 0, effects: [], rates: {}, suspended: null, decisionsThisTick: 0,
    conversation: null, moodBoost: 0, sleptAtHome: {}, reflectedDay: 0, flagUntil: {}, moneyAtDawn: 0, todayTools: [],
    recentTools: [], lastReason: '', lastHourDecision: -1, lastConversationAt: -999, travelRetries: 0, wakeHour: 6, asleep: false, greeted: {}, then: null, travel: null, pendingSince: 0, lastFail: null,
  };
}

/** Base need change per hour while awake, before the action's own rates. */
export function baseRates(v: Villager, world: World, asleep: boolean): Partial<Needs> {
  const p = v.personality;
  if (asleep) {
    return { energy: 11, hunger: -1.5, social: 0, fun: 0, comfort: v.inside ? 3 : -2, purpose: 0 };
  }
  const t = world.time;
  const late = t.hour >= 23 || t.hour < 5;
  const r: Partial<Needs> = {
    energy: -(2.6 + (late ? 3 : 0) + (v.status.includes('sick') ? 1.5 : 0)),
    hunger: -(3.8 + (v.look.build === 'broad' ? 0.8 : 0)),
    social: -(1.2 + 3 * p.extraversion),
    fun: -(1.3 + 2 * p.openness),
    comfort: -0.6,
    purpose: -(0.8 + 2.4 * p.conscientiousness),
  };
  const w = world.weather.kind;
  if (!v.inside) {
    if (w === 'rain') r.comfort! -= 5;
    else if (w === 'storm') r.comfort! -= 9;
    else if (w === 'snow') r.comfort! -= 4;
    else if (w === 'fog') r.comfort! -= 1;
    else if (w === 'sunny' && p.likes.includes('sunny')) r.comfort! += 1;
  } else {
    r.comfort! += 1.6;
  }
  return r;
}

export function applyRates(v: Villager, rates: Partial<Needs>, minutes: number): void {
  const h = minutes / 60;
  for (const k of Object.keys(rates) as (keyof Needs)[]) {
    const d = rates[k];
    if (d) v.needs[k] = clamp(v.needs[k] + d * h, 0, 100);
  }
}

const WEATHER_WORDS: Record<string, string[]> = {
  sunny: ['sunny', 'sun'], rain: ['rain'], storm: ['storm'], fog: ['fog'], snow: ['snow', 'winter'], cloudy: ['clouds'],
};

/** Mood is derived every tick: needs + recent memory valence + weather taste + status flags, swung by neuroticism. */
export function computeMood(v: Villager, world: World, rt: VillagerRuntime): number {
  const p = v.personality, n = v.needs;
  const w = (need: number, weight: number) => ((need - 50) / 50) * weight;
  const weights = 1 + 1.2 + (0.8 + p.extraversion * 0.6) + (0.8 + p.openness * 0.4) + 0.7 + (0.6 + p.conscientiousness * 0.8);
  let base = (w(n.energy, 1) + w(n.hunger, 1.2) + w(n.social, 0.8 + p.extraversion * 0.6) + w(n.fun, 0.8 + p.openness * 0.4) + w(n.comfort, 0.7) + w(n.purpose, 0.6 + p.conscientiousness * 0.8)) / weights;
  base = base * 0.9 + rt.moodBoost;
  const words = WEATHER_WORDS[world.weather.kind] ?? [];
  if (words.some((x) => p.likes.includes(x))) base += 0.12;
  if (words.some((x) => p.dislikes.includes(x))) base -= 0.12;
  for (const s of v.status) {
    switch (s) {
      case 'sick': base -= 0.25; break;
      case 'injured': base -= 0.2; break;
      case 'tired': base -= 0.08; break;
      case 'wet': base -= 0.1; break;
      case 'angry': base -= 0.25; break;
      case 'grieving': base -= 0.4; break;
      case 'inLove': base += 0.15; break;
      case 'celebrating': base += 0.2; break;
      case 'inspired': base += 0.12; break;
      case 'drunk': base += 0.05; break;
    }
  }
  if (p.traits.includes('cheerful')) base += 0.06;
  if (p.traits.includes('grumpy') || p.traits.includes('gruff')) base -= 0.05;
  const swing = 0.9 + p.neuroticism * 0.6;
  return clamp(Math.tanh(base * swing), -1, 1);
}

export function decayMoodBoost(rt: VillagerRuntime, minutes: number): void {
  // half-life ~ 5 hours
  rt.moodBoost *= Math.pow(0.5, minutes / 300);
  if (Math.abs(rt.moodBoost) < 0.001) rt.moodBoost = 0;
}

export function hasFlag(v: Villager, f: StatusFlag): boolean { return v.status.includes(f); }
export function setFlag(v: Villager, f: StatusFlag, on: boolean): boolean {
  const has = v.status.includes(f);
  if (on && !has) { v.status.push(f); return true; }
  if (!on && has) { v.status.splice(v.status.indexOf(f), 1); return true; }
  return false;
}

/** Refresh the derived status flags (temporary flags expire through rt.flagUntil). */
export function updateStatus(v: Villager, world: World, rt: VillagerRuntime, now: number): StatusFlag[] {
  const changed: StatusFlag[] = [];
  const t = world.time;
  const late = (t.hour >= 23 || t.hour < 4) && !rt.asleep && v.profession !== 'innkeeper';
  if (setFlag(v, 'tired', v.needs.energy < 22 || (late && v.needs.energy < 60))) changed.push('tired');
  const outdoorsInRain = !v.inside && (world.weather.kind === 'rain' || world.weather.kind === 'storm');
  if (outdoorsInRain) rt.flagUntil.wet = now + 90;
  if (setFlag(v, 'wet', (rt.flagUntil.wet ?? 0) > now)) changed.push('wet');
  if (v.health < 45) { if (setFlag(v, 'sick', true)) changed.push('sick'); }
  else if (v.health > 72 && (rt.flagUntil.sick ?? 0) <= now) { if (setFlag(v, 'sick', false)) changed.push('sick'); }
  for (const f of ['drunk', 'angry', 'inspired', 'celebrating', 'injured'] as StatusFlag[]) {
    const until = rt.flagUntil[f];
    if (until !== undefined && until <= now) { if (setFlag(v, f, false)) changed.push(f); delete rt.flagUntil[f]; }
  }
  const love = Object.values(v.relationships).some((r) => r.romance >= 40);
  if (setFlag(v, 'inLove', love)) changed.push('inLove');
  return changed;
}

export function addSkill(v: Villager, skill: SkillName, xp: number): boolean {
  const s = v.skills[skill] ?? 0;
  const before = Math.floor(s);
  v.skills[skill] = Math.min(10, s + xp / (1 + s));
  return Math.floor(v.skills[skill]) > before;
}

/* ------------------------------------------------------------------ day plans */

const BLOCK_PLACE: Record<string, (v: Villager) => string | undefined> = {
  sleep: (v) => v.home, breakfast: (v) => v.home, work: (v) => v.workplace, lunch: () => undefined, dinner: (v) => v.home,
  social: () => 'tavern', free: () => undefined, chores: (v) => v.home, errand: () => 'store',
};

export function makeDayPlan(v: Villager, world: World, rng: Rng, goals: string[]): DayPlan {
  const t = world.time;
  const p = v.personality;
  const base = SCHEDULES[v.profession] ?? SCHEDULES.none;
  let shift = 0;
  if (p.traits.includes('early riser')) shift -= 0.5;
  if (p.traits.includes('lazy') || p.dislikes.includes('early mornings')) shift += 0.5;
  shift += rng.range(-0.25, 0.25);
  const festival = world.festivalToday();
  const weather = world.weather.kind;
  const sunday = t.weekday === 6;
  const dayOff = sunday && ['shopkeeper', 'blacksmith', 'carpenter', 'librarian', 'doctor'].includes(v.profession);
  const entries: ScheduleEntry[] = [];
  const stormy = weather === 'storm';
  const outdoorJob = ['farmer', 'fisher', 'miner', 'carpenter'].includes(v.profession);
  for (const e of base) {
    let block = e.block;
    let note: string | undefined;
    if (block === 'work' && dayOff) { block = 'free'; note = 'day off'; }
    if (block === 'work' && stormy && outdoorJob && e.hour >= 12) { block = 'chores'; note = 'storm - staying in'; }
    if (block === 'work' && weather === 'rain' && v.profession === 'fisher') note = 'rain - good fishing';
    const hour = clamp(e.hour + (block === 'sleep' ? shift * 0.5 : shift), 3.5, 24.5);
    entries.push({ hour: Math.round(hour * 4) / 4, block, place: BLOCK_PLACE[block]?.(v), note });
  }
  // festival: replace the afternoon/evening with the festival
  if (festival) {
    const fh = festival.hour;
    const kept = entries.filter((e) => e.hour < fh - 0.25 || e.block === 'sleep');
    kept.push({ hour: fh, block: 'festival', place: 'festival_grounds', note: festival.name });
    kept.sort((a, b) => a.hour - b.hour);
    entries.length = 0; entries.push(...kept);
    // sleep after the festival
    const sleep = entries.find((e) => e.block === 'sleep');
    if (sleep && sleep.hour < fh + 4) sleep.hour = Math.min(24.5, fh + 4.5);
  }
  // personal variation: an extra social evening for extraverts, an extra free block for the lazy
  if (p.extraversion > 0.7 && rng.chance(0.4)) {
    const f = entries.find((e) => e.block === 'free' && e.hour >= 14);
    if (f) { f.block = 'social'; f.place = rng.pick(['tavern', 'square']); f.note = 'feeling sociable'; }
  }
  if (p.traits.includes('lazy') && rng.chance(0.35)) {
    const w = entries.filter((e) => e.block === 'work');
    const last = w[w.length - 1];
    if (last) { last.block = 'free'; last.note = 'skiving off'; }
  }
  if (goals.length && rng.chance(0.6)) {
    const f = entries.find((e) => e.block === 'free' || e.block === 'social');
    if (f) f.note = goals[0];
  }
  entries.sort((a, b) => a.hour - b.hour);
  const wake = entries.find((e) => e.block !== 'sleep');
  const sleepE = entries.find((e) => e.block === 'sleep');
  const summary = summarise(v, entries, wake?.hour ?? 7, sleepE?.hour ?? 22, festival?.name, dayOff);
  return { day: t.dayIndex, entries, summary };
}

const fmtH = (h: number): string => { const hh = Math.floor(h) % 24, mm = Math.round((h % 1) * 60); return `${hh === 0 ? 12 : hh > 12 ? hh - 12 : hh}${mm ? ':' + String(mm).padStart(2, '0') : ''}${hh < 12 ? 'am' : 'pm'}`; };

function summarise(v: Villager, entries: ScheduleEntry[], wake: number, sleep: number, festival?: string, dayOff?: boolean): string {
  const work = entries.filter((e) => e.block === 'work');
  const social = entries.filter((e) => e.block === 'social');
  const parts = [`Up at ${fmtH(wake)}`];
  if (dayOff) parts.push('day off');
  else if (work.length) parts.push(`${v.profession === 'none' ? 'busy' : work.length > 1 ? 'work morning and afternoon' : 'work'}`);
  if (social.length) parts.push(`evening at ${social[0].place === 'square' ? 'the square' : 'the tavern'}`);
  if (festival) parts.push(festival);
  parts.push(`bed by ${fmtH(sleep)}`);
  const notes = entries.map((e) => e.note).filter((n): n is string => !!n && !n.includes('day off'));
  return parts.join(', ') + (notes.length ? ` (${notes[0]})` : '') + '.';
}

/** The schedule block active at hour `h` (fractional). Entries after the sleep entry wrap to the next morning. */
export function currentBlock(plan: DayPlan | null, h: number): ScheduleEntry {
  if (!plan || plan.entries.length === 0) return { hour: 0, block: h < 7 || h >= 22 ? 'sleep' : 'free' };
  let cur: ScheduleEntry | null = null;
  for (const e of plan.entries) if (e.hour <= h) cur = e;
  if (!cur) {
    // before the first entry: still asleep
    return { hour: 0, block: 'sleep', place: plan.entries[0].place };
  }
  return cur;
}

export function wakeHourOf(plan: DayPlan | null): number {
  if (!plan) return 7;
  const e = plan.entries.find((x) => x.block !== 'sleep');
  return e ? e.hour : 7;
}

export function sleepHourOf(plan: DayPlan | null): number {
  if (!plan) return 22;
  const e = plan.entries.find((x) => x.block === 'sleep');
  return e ? e.hour : 22;
}
