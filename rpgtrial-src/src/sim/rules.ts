// D&D rules glue: skill/ability checks, saving throws, passive perception, XP & levels, rests.
import type { World } from './world.ts';
import type { Actor, SkillKey, AbilityKey } from './types.ts';
import { SKILL_ABILITY } from './types.ts';
import { bus, type RollResult } from '../core/events.ts';
import { d20, mod, profBonus, type Advantage } from './dice.ts';
import { getClass, FEATS } from '../content/classes.ts';
import { getItem } from '../content/items.ts';
import { healActor } from './combat.ts';

export interface CheckOpts { label?: string; bonusDice?: { label: string; expr: string }[]; advantage?: Advantage }

/** XP needed to *be* level N (index N-1). Level 2 at 300, level 3 at 900. */
export const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000];
export const xpForLevel = (level: number) => XP_THRESHOLDS[level - 1] ?? Infinity;

const SKILL_NAMES: Record<SkillKey, string> = {
  athletics: 'Athletics', acrobatics: 'Acrobatics', sleightOfHand: 'Sleight of Hand', stealth: 'Stealth', arcana: 'Arcana', history: 'History',
  investigation: 'Investigation', nature: 'Nature', religion: 'Religion', animalHandling: 'Animal Handling', insight: 'Insight', medicine: 'Medicine',
  perception: 'Perception', survival: 'Survival', deception: 'Deception', intimidation: 'Intimidation', performance: 'Performance', persuasion: 'Persuasion',
};
const ABILITY_NAMES: Record<AbilityKey, string> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

export const hitDieOf = (a: Actor) => (a.classId ? getClass(a.classId)?.hitDie : undefined) ?? 8;

const normAdv = (v: CheckOpts['advantage']): Advantage => v ?? null;
/** Guidance (1d4) is consumed by the next check. */
function consumeGuidance(a: Actor, dice: { label: string; expr: string }[]) {
  if (a.conditions.guidance) { dice.push({ label: 'Guidance', expr: '1d4' }); delete a.conditions.guidance; bus.emit('condition', { actorId: a.id, condition: 'guidance', on: false }); }
}
const ringSaves = (w: World, a: Actor) => (a.id === w.playerId && w.equipment.ring ? getItem(w.equipment.ring)?.ring?.saves ?? 0 : 0);

export function skillBonus(w: World, a: Actor, skill: SkillKey): number {
  const ab = SKILL_ABILITY[skill];
  let b = mod(a.abilities[ab]);
  if (a.skillProfs.includes(skill)) b += a.prof;
  if (a.expertise?.includes(skill)) b += a.prof;
  return b;
}
export function skillCheck(w: World, a: Actor, skill: SkillKey, dc: number, opts: CheckOpts = {}): RollResult {
  const dice = [...(opts.bonusDice ?? [])]; consumeGuidance(a, dice);
  let adv = normAdv(opts.advantage);
  if (skill === 'stealth' && a.id === w.playerId && w.equipment.armor && getItem(w.equipment.armor)?.armor?.stealthDis) adv = adv === 'adv' ? null : 'dis';
  const roll = d20(w.rng, { kind: 'check', label: opts.label ?? `${SKILL_NAMES[skill] ?? skill} check`, bonus: skillBonus(w, a, skill), dc, advantage: adv, bonusDice: dice });
  bus.emit('check', { roll, pos: { x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z }, actorId: a.id });
  return roll;
}
export function abilityCheck(w: World, a: Actor, ability: AbilityKey, dc: number, opts: CheckOpts = {}): RollResult {
  const dice = [...(opts.bonusDice ?? [])]; consumeGuidance(a, dice);
  const roll = d20(w.rng, { kind: 'check', label: opts.label ?? `${ABILITY_NAMES[ability]} check`, bonus: mod(a.abilities[ability]), dc, advantage: normAdv(opts.advantage), bonusDice: dice });
  bus.emit('check', { roll, pos: { x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z }, actorId: a.id });
  return roll;
}
/** Saving throw without an event (combat emits attackRoll with it; the content API emits check). */
export function rollSave(w: World, a: Actor, ability: AbilityKey, dc: number, opts: CheckOpts = {}): RollResult {
  let bonus = mod(a.abilities[ability]) + (a.saveProfs.includes(ability) ? a.prof : 0) + ringSaves(w, a);
  let adv = normAdv(opts.advantage);
  if (ability === 'dex' && a.state === 'stagger') adv = adv === 'adv' ? null : 'dis';
  if (a.conditions.raging && ability === 'str') adv = adv === 'dis' ? null : 'adv';
  return d20(w.rng, { kind: 'save', label: opts.label ?? `${ABILITY_NAMES[ability]} save`, bonus, dc, advantage: adv, bonusDice: opts.bonusDice });
}
export function savingThrow(w: World, a: Actor, ability: AbilityKey, dc: number, opts: CheckOpts = {}): RollResult {
  const roll = rollSave(w, a, ability, dc, opts);
  bus.emit('check', { roll, pos: { x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z }, actorId: a.id });
  return roll;
}
export const passivePerception = (a: Actor) => 10 + mod(a.abilities.wis) + (a.skillProfs.includes('perception') ? a.prof : 0) + (a.expertise?.includes('perception') ? a.prof : 0);

// ------------------------------------------------------------------ XP / levels
export function grantXp(w: World, amount: number) {
  const p = w.player; if (!p || amount <= 0) return;
  p.xp += amount;
  bus.emit('xp', { amount, total: p.xp });
  while (p.level < XP_THRESHOLDS.length && p.xp >= xpForLevel(p.level + 1)) levelUp(w, p);
}
function levelUp(w: World, p: Actor) {
  p.level += 1; p.prof = profBonus(p.level);
  p.maxHitDice += 1; p.hitDice = Math.min(p.maxHitDice, p.hitDice + 1);
  const gain = Math.max(1, w.rng.int(1, hitDieOf(p)) + mod(p.abilities.con) + (p.feats?.includes('tough') ? 2 : 0));
  p.maxHp += gain; p.hp += gain;
  p.pendingLevelUps = (p.pendingLevelUps ?? 0) + 1;
  // level 2 unlocks the rogue's second sneak die at 3 (5e: 2d6 at level 3)
  if (p.classId === 'rogue') p.sneakDice = p.level >= 3 ? '2d6' : '1d6';
  bus.emit('levelUp', { actorId: p.id, level: p.level });
  bus.emit('toast', { text: `Level ${p.level}! +${gain} HP`, kind: 'xp' });
}
export function chooseLevelUp(w: World, id: string): boolean {
  const p = w.player; if (!p) return false;
  const feat = FEATS[id];
  if (!feat) { console.warn('[sim] chooseLevelUp: unknown feat', id); return false; }
  if ((p.pendingLevelUps ?? 0) <= 0) { console.warn('[sim] chooseLevelUp: no pending level-up'); return false; }
  if (p.feats?.includes(id)) { bus.emit('toast', { text: `You already have ${feat.name}.`, kind: 'warn' }); return false; }
  p.pendingLevelUps! -= 1;
  (p.feats ??= []).push(id);
  if (feat.ability) p.abilities[feat.ability] = Math.min(20, p.abilities[feat.ability] + 1);
  if (feat.hpPerLevel) { const g = feat.hpPerLevel * p.level; p.maxHp += g; p.hp += g; }
  w.recomputeStats();
  bus.emit('toast', { text: `Learned ${feat.name}`, kind: 'xp' });
  return true;
}

// ------------------------------------------------------------------ rests
export function rest(w: World, kind: 'short' | 'long') {
  const p = w.player; if (!p) return;
  const cls = p.classId ? getClass(p.classId) : undefined;
  if (kind === 'short') {
    // spend hit dice until healthy (1d{hitDie} + Con each)
    let guard = 0;
    while (p.hp < p.maxHp && p.hitDice > 0 && guard++ < 20) { p.hitDice -= 1; healActor(w, p, p, Math.max(1, w.rng.int(1, hitDieOf(p)) + mod(p.abilities.con))); }
    if (cls) { for (const r of ['secondWind', 'actionSurge'] as const) if (cls.resources[r] !== undefined) p.resources[r] = cls.resources[r]; }
    if (p.classId === 'wizard' && (p.resources.arcaneRecovery ?? 0) > 0 && (p.resources.spellSlots1 ?? 0) < (cls?.resources.spellSlots1 ?? 2)) {
      p.resources.arcaneRecovery -= 1; p.resources.spellSlots1 = (p.resources.spellSlots1 ?? 0) + 1;
      bus.emit('toast', { text: 'Arcane Recovery: a spell slot returns.', kind: 'info' });
    }
  } else {
    p.hp = p.maxHp; p.tempHp = 0; p.hitDice = p.maxHitDice; p.stamina = p.maxStamina;
    if (cls) for (const k in cls.resources) p.resources[k] = cls.resources[k];
    for (const k in p.cooldowns) p.cooldowns[k] = 0;
    for (const k of Object.keys(p.conditions)) { delete p.conditions[k]; bus.emit('condition', { actorId: p.id, condition: k, on: false }); }
    w.timeOfDay = (w.timeOfDay + 8) % 24;
    w.checkpoint = { ...p.pos };
  }
  for (const a of w.actors.values()) if (a.kind === 'companion') { if (kind === 'long') a.hp = a.maxHp; if (a.ai) a.ai.healedThisEncounter = false; for (const k in a.cooldowns) a.cooldowns[k] = 0; }
  bus.emit('rest', { kind });
}
