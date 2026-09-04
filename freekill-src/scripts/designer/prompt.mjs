// The system prompt, built from the measurement rather than written down.
//
// Every block the model is offered comes out of `vocabulary.generated.json`
// with its citation and the three shipped skills that use it, so the prompt
// cannot describe a vocabulary the engine does not have — and cannot go stale
// when the packs change, because `npm run build:catalogue` rewrites the source
// it reads.
//
// It offers the COMPILER'S subset, not the whole vocabulary. Offering all 221
// blocks would spend the context describing 170 the compiler answers with "not
// supported yet", and every one of those is a wasted revision round: the model
// cannot know from a block's citation whether this compiler emits it. The tail
// of the vocabulary is what a future compiler covers, not what this prompt
// should advertise.
import { SUPPORTED } from '../../src/designer/compile/index.ts';
import { DEFAULTED_PARAMS, PHASES, PLAYER_REFS, ZONES } from '../../src/designer/spec.ts';
import { VOCABULARY } from '../../src/designer/vocabulary/index.ts';

const byId = (blocks) => new Map(blocks.map((b) => [b.id, b]));
const TRIGGERS = byId(VOCABULARY.triggers);
const CONDITIONS = byId(VOCABULARY.conditions);
const EFFECTS = byId(VOCABULARY.effects);

const line = (id, block, extra = '') => {
  const params = block?.params?.length
    ? ` params: ${block.params.map((p) => (DEFAULTED_PARAMS[id]?.includes(p) ? `${p}?` : p)).join(', ')}`
    : '';
  const eg = block?.examples?.length ? ` e.g. ${block.examples.slice(0, 3).join(', ')}` : '';
  const label = block?.label ? ` — ${block.label}` : '';
  return `- ${id}${label}${extra}${params}${eg}\n    ${block?.citation ?? ''}`.trimEnd();
};

/** The composition rules that change what a correct spec looks like. */
const RULES = `
HOW A SKILL IS PUT TOGETHER (from the engine, not from the rules text)

1. One skill is a SKELETON with one EFFECT per event. There is no "fires on A
   or B": to react to two events, give the skill two effects.
2. COST IS NOT EFFECT AND THE ENGINE ENFORCES IT. TriggerSkill:doCost
   (skill_type/trigger.lua:70) runs the cost and only runs the effect if the
   cost returned true. "Discard a card, then draw two" is cost = ask-discard,
   actions = draw. Put the discard in actions and a player who cancels still
   draws.
3. A non-compulsory skill ALREADY asks "do you want to use this?" by itself
   (trigger.lua:98). Do not add an ask-yes-no cost unless something else in the
   cost has to happen around it.
4. compulsory: true is 锁定技 — it fires without asking, and it must not have a
   cost that can be refused.
5. can_trigger REPLACES the engine's default guard rather than extending it, so
   an effect that means "when it happens to ME" must say so with the
   self-is-subject condition. Every condition you list is ANDed.
6. USE LIMITS ARE DECLARED, NOT COUNTED WITH MARKS. For "once per turn", use
   the times-used condition with scope = Turn and limit = 1.

WHO A PLAYER PARAMETER MAY NAME
  ${PLAYER_REFS.join(', ')}
  self = the skill's owner. target = who the event happened to (see each
  trigger below). source = who caused it. chosen = the players an
  ask-choose-players cost picked. others / all are SETS: an action on one
  repeats for each.

OTHER PARAMETER VALUES
  phase: ${PHASES.join(', ')}          zone: ${ZONES.join(', ')} (hand, equip, judgement)
  op: >, >=, ==, <=, <, ~=       scope: Phase, Turn, Round, Game
  A parameter written "name?" below has an engine default and may be left out.
`.trim();

const HOUSE_STYLE = `
WHAT TO WRITE

- id and every skill id: lower_snake_case, starting with a letter. Prefix them
  so they cannot collide with the 1304 skills already in the engine — e.g.
  hero id "dsgn_wenyang", skill id "dsgn_wenyang_dangxian".
- name, title and every skill name and description in Chinese, in the register
  a 三国杀 card uses. The description is the rules text as a player reads it,
  and it must match what the blocks actually do — a description promising more
  than the blocks deliver is the worst outcome here, because the player cannot
  tell.
- hp 3 or 4 for most heroes. Balance matters less than the description being
  true.
- Reply in the language the user wrote in. Keep the reply to a sentence or two
  saying what the hero does and what you had to leave out.
`.trim();

export function systemPrompt() {
  const notSupported = VOCABULARY.triggers.length + VOCABULARY.conditions.length
    + VOCABULARY.effects.length
    - (SUPPORTED.triggers.length + SUPPORTED.conditions.length + SUPPORTED.actions.length);

  return [
    'You design generals for FreeKill (三国杀). You answer with a hero spec built'
    + ' from a fixed vocabulary of blocks, and with nothing else — a block that is'
    + ' not listed below does not compile, and a skill that does not compile is a'
    + ' skill printed on a card that silently does nothing.',
    '',
    RULES,
    '',
    'TRIGGERS — the event an effect hangs off. `target` is what the engine passes'
    + ' as the subject of that event.',
    ...SUPPORTED.triggers.map((id) => {
      const t = TRIGGERS.get(id);
      const phase = t?.phaseParam ? ' params: phase' : '';
      return `- ${id}${phase}${t?.examples?.length ? ` e.g. ${t.examples.slice(0, 3).join(', ')}` : ''}`;
    }),
    '  fk.EventPhaseStart with phase = Finish is 结束阶段开始时; with phase = Play is'
    + ' 出牌阶段开始时. fk.Damaged fires on the player who TOOK the damage,'
    + ' fk.Damage on the one who dealt it. fk.AfterCardsMove has no subject at'
    + ' all — guard it with move-involves-me, never with self-is-subject.',
    '',
    'CONDITIONS — guards on can_trigger, ANDed together.',
    ...SUPPORTED.conditions.map((id) => line(id, CONDITIONS.get(id))),
    '',
    'ACTIONS — what happens. Those marked [cost] belong in `cost`; the rest in'
    + ' `actions`.',
    ...SUPPORTED.actions.map(({ id, cost }) => line(id, EFFECTS.get(id), cost ? ' [cost]' : '')),
    '',
    `Everything else in the vocabulary — ${notSupported} more blocks — exists in the`
    + ' engine but this compiler does not emit it yet. Do not use it: say in your'
    + ' reply that the idea needs a block that is not available, and design the'
    + ' nearest hero you can build from the list above.',
    '',
    HOUSE_STYLE,
  ].join('\n');
}

/** What a failed attempt tells the model, in the words it needs to fix it. */
export function failureMessage({ errors = [], compileError, testLog = [] }) {
  const parts = ['That spec did not work. Fix it and return the whole spec again.'];
  if (errors.length) {
    parts.push('Validation errors:', ...errors.map((e) => `- ${e.path}: ${e.message}`));
  }
  if (compileError) parts.push(`Compile error at ${compileError.path}: ${compileError.message}`);
  if (testLog.length) {
    parts.push('The engine was booted on the generated general and reported:', ...testLog.map((l) => `- ${l}`));
  }
  return parts.join('\n');
}
