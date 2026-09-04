/**
 * A `HeroSpec` becomes one Lua file: `packages/custom/generals/<id>.lua`.
 *
 * The file is written in the only style the shipped packs use — `fk.CreateSkill`
 * for the skeleton, one `addEffect` per event, `General:new(...):addSkills{...}`
 * — because the older `fk.CreateTriggerSkill` family appears zero times across
 * all thirteen packs (`vocabulary/index.ts`), so there is no compatibility
 * branch to carry and no reason to invent one.
 *
 * It emits a function rather than running at load, so `packages/custom/init.lua`
 * can hand each general the one `Package` they all share:
 *
 *     return function(extension) … end
 *
 * WHAT IS NOT EMITTED, DELIBERATELY. No `addTest`. The content packs' luaunit
 * suites are collected by walking every skeleton's `tests`
 * (`test/lua/cpp_run_skill.lua:22`) and `src/engine/__tests__/luaunit.test.ts`
 * pins the total at 53, so a generated test would read as a regression in a
 * suite that is about the engine. The generated general is tested from the
 * outside instead, by `compile/__tests__/`.
 */
import {
  ID_PATTERN, KINGDOMS, PHASES, validateSpec,
  type EffectSpec, type HeroSpec, type SkillSpec,
} from '../spec.ts';
import { ACTIONS, CONDITIONS, closeCost, emitAction, emitCondition } from './blocks.ts';
import {
  CompileError, HELPERS, TRIGGERS, indent, oneOf, q, type Ctx,
} from './emit.ts';

export { CompileError } from './emit.ts';

/**
 * What this compiler can currently turn into Lua.
 *
 * Read off the emitter tables rather than written down beside them, so the
 * agent's system prompt, the README and the panel cannot describe a subset the
 * compiler does not have. Adding a block is one entry in one table.
 */
export const SUPPORTED = {
  triggers: Object.keys(TRIGGERS),
  conditions: Object.keys(CONDITIONS),
  actions: Object.entries(ACTIONS).map(([id, a]) => ({ id, cost: a.cost === true, use: a.use === true })),
};

export interface CompileResult {
  lua: string;
  /** Things that compile but probably are not what the designer meant. */
  warnings: string[];
}

/** Reserved words a skill id could collide with once it becomes a Lua local. */
const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'goto', 'if',
  'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while',
]);

/**
 * The animation the client plays. Cosmetic, but a skill with none looks broken
 * next to the shipped ones, and `readUsableSpecToSkill` takes it off the spec.
 */
const ANIM_FOR: Record<string, string> = {
  draw: 'drawcard',
  obtain: 'drawcard',
  damage: 'offensive',
  'lose-hp': 'offensive',
  'change-max-hp': 'negative',
  recover: 'support',
  throw: 'negative',
  swap: 'control',
};

const varFor = (skillId: string): string => (LUA_KEYWORDS.has(skillId) ? `_${skillId}` : skillId);

/* -------------------------------------------------------------------------- */
/* One effect                                                                  */
/* -------------------------------------------------------------------------- */

const compileEffect = (
  skill: SkillSpec, effect: EffectSpec, path: string, helpers: Set<string>, warnings: string[],
): string[] => {
  const trigger = effect.trigger.block;
  const info = TRIGGERS[trigger];
  if (!info) {
    throw new CompileError(`${path}.trigger`, `the compiler does not support the "${trigger}" trigger yet`);
  }

  const skillVar = varFor(skill.id);
  const ctx: Ctx = {
    skillVar, trigger, info, path, warnings, helpers,
    stash: { tos: false, cards: false },
    discardThrew: false,
  };

  const guards = [`player:hasSkill(${skillVar}.name)`];
  if (info.phase) {
    const phase = oneOf(effect.trigger, 'phase', `${path}.trigger`, PHASES);
    guards.push(`player.phase == Player.${phase}`);
  }

  const named = new Set((effect.conditions ?? []).map((c) => c.block));
  if (info.subject && !named.has('self-is-subject') && !named.has('someone-else-is-subject')) {
    warnings.push(
      `${path}: nothing says whose ${trigger} this is, so the skill fires on every player's`
      + ` — add self-is-subject unless that is meant`,
    );
  }
  if (info.moves && !named.has('move-involves-me')) {
    warnings.push(`${path}: this fires on every card move in the game — add move-involves-me unless that is meant`);
  }

  // The cost runs first and may stash a pick, so it is compiled first: that is
  // what makes `chosen` and `cards = "cost"` resolvable in the actions.
  const costLines = (effect.cost ?? []).flatMap((c, i) =>
    emitAction(ctx, c, `${path}.cost[${i}]`, 'cost'));
  const useLines = effect.actions.flatMap((a, i) =>
    emitAction(ctx, a, `${path}.actions[${i}]`, 'use'));

  (effect.conditions ?? []).forEach((c, i) => {
    guards.push(emitCondition(ctx, c, `${path}.conditions[${i}]`));
  });

  const anim = ANIM_FOR[effect.actions[0]?.block ?? ''] ?? 'special';
  // Only when something actually reads it back: `ask-discard` stashes the cards
  // it threw whether or not the effect wants them, and an unused local reads
  // like a bug in a file a person is meant to be able to check.
  const readsCost = useLines.some((l) => l.includes('cost.'));

  const out = [
    `${skillVar}:addEffect(${trigger}, {`,
    `  anim_type = ${q(anim)},`,
    '  can_trigger = function(self, event, target, player, data)',
    `    return ${guards.join('\n      and ')}`,
    '  end,',
  ];
  if (costLines.length) {
    out.push(
      '  on_cost = function(self, event, target, player, data)',
      '    local room = player.room',
      ...indent(closeCost(ctx, costLines), '    '),
      '  end,',
    );
  }
  out.push(
    '  on_use = function(self, event, target, player, data)',
    '    local room = player.room',
    ...(readsCost ? ['    local cost = event:getCostData(self)'] : []),
    ...indent(useLines, '    '),
    '  end,',
    '})',
  );
  return out;
};

/* -------------------------------------------------------------------------- */
/* One hero                                                                    */
/* -------------------------------------------------------------------------- */

export const compileHero = (spec: HeroSpec): CompileResult => {
  const { ok, errors } = validateSpec(spec);
  if (!ok) {
    throw new CompileError(errors[0].path, `the spec does not validate: ${errors[0].message}`);
  }
  if (!ID_PATTERN.test(spec.id) || !KINGDOMS.includes(spec.kingdom)) {
    throw new CompileError('id', 'the hero needs a lower_snake_case id and a known kingdom');
  }

  const warnings: string[] = [];
  const helpers = new Set<string>();
  const body: string[] = [];
  const translations: string[] = [
    `  [${q(spec.id)}] = ${q(spec.name)},`,
    `  [${q(`#${spec.id}`)}] = ${q(spec.title)},`,
    `  [${q(`illustrator:${spec.id}`)}] = ${q('自制')},`,
  ];

  for (const [i, skill] of spec.skills.entries()) {
    const skillVar = varFor(skill.id);
    body.push(
      `local ${skillVar} = fk.CreateSkill {`,
      `  name = ${q(skill.id)},`,
      ...(skill.compulsory ? ['  tags = { Skill.Compulsory },'] : []),
      '}',
      '',
    );
    for (const [j, effect] of skill.effects.entries()) {
      body.push(...compileEffect(skill, effect, `skills[${i}].effects[${j}]`, helpers, warnings), '');
    }
    translations.push(
      `  [${q(skill.id)}] = ${q(skill.name)},`,
      `  [${q(`:${skill.id}`)}] = ${q(skill.description)},`,
    );
  }

  const gender = spec.gender === 'female' ? 'General.Female' : 'General.Male';
  const maxHp = spec.maxHp ?? spec.hp;

  const lines = [
    '-- SPDX-License-Identifier: GPL-3.0-or-later',
    '--',
    `-- ${spec.name} · ${spec.title} — 由 hero designer 生成。`,
    '--',
    '-- 不要手改：下一次 create 会整份覆盖。要改就改 spec 再重新生成。',
    '',
    ...[...helpers].sort().flatMap((h) => [...HELPERS[h], '']),
    'return function(extension)',
    '',
    ...body,
    `extension:loadSkillSkels { ${spec.skills.map((s) => varFor(s.id)).join(', ')} }`,
    '',
    `General:new(extension, ${q(spec.id)}, ${q(spec.kingdom)}, ${spec.hp}, ${maxHp}, ${gender})`,
    `  :addSkills { ${spec.skills.map((s) => q(s.id)).join(', ')} }`,
    '',
    'Fk:loadTranslationTable {',
    ...translations,
    '}',
    '',
    'end',
    '',
  ];

  return { lua: lines.join('\n'), warnings };
};
