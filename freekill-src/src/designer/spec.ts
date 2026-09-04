/**
 * The hero a designer describes, before it is Lua.
 *
 * Two lanes write one of these and one lane reads it: the block panel builds it
 * by clicking, the agent lane gets it back from OpenAI as structured output,
 * and `compile/` turns it into a `packages/custom/generals/<id>.lua`. So the
 * shape is the contract between all three, and every `block` in it is an id out
 * of `vocabulary.generated.json` — never a name somebody typed.
 *
 * That last rule is the whole point. The engine resolves a method at the call,
 * not at load, and swallows what a skill raises, so a spec naming a block that
 * does not exist compiles to a general whose card prints a skill that does
 * nothing and never says why. `validateSpec` is what stops that, and it runs
 * before the compiler in every path — panel, agent, and the create endpoint.
 *
 * ---------------------------------------------------------------------------
 * TWO SHAPES, ONE MEANING
 *
 * `params` is canonically a record: `{ count: 1 }`. But OpenAI's structured
 * output in strict mode rejects an object whose keys are not enumerated ahead
 * of time — every object needs `additionalProperties: false` and a `required`
 * listing every key — and the keys here depend on which block was picked. So
 * `HERO_SPEC_SCHEMA` describes params as a list of `{ name, value }` pairs,
 * which strict mode does accept, and `normalizeSpec` folds either shape into
 * the record. The model gets a schema it cannot violate; everybody else writes
 * the natural thing.
 */
import { VOCABULARY } from './vocabulary/index.ts';

export const KINGDOMS = ['wei', 'shu', 'wu', 'qun', 'jin'] as const;
export type Kingdom = (typeof KINGDOMS)[number];

export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

/** A general id, a skill id: what Lua and the translation table are keyed by. */
export const ID_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Anything a block parameter can be. Deliberately scalar — the wire form comes
 * back as strings and the compiler coerces per parameter, because the
 * vocabulary names a block's parameters without typing them.
 */
export type ParamValue = string | number | boolean;

/** One picked block and what was filled into it. */
export interface BlockRef {
  /** An id from `vocabulary.generated.json` — a trigger, condition or effect. */
  block: string;
  /** Keyed by the block's own `params`. `{}` when the block takes none. */
  params: Record<string, ParamValue>;
}

/**
 * One `addEffect` on the skeleton.
 *
 * The split is the engine's, not a presentation choice: `TriggerSkill:doCost`
 * (skill_type/trigger.lua:70) runs the cost and only runs the effect if it
 * returned true, so "discard one, then draw two" must be `cost` then `actions`
 * or a player who cancels the discard still draws.
 */
export interface EffectSpec {
  /** The event this hangs off, e.g. `fk.Damaged`. Phase events take a `phase`. */
  trigger: BlockRef;
  /** Guards, ANDed, compiled into `can_trigger`. */
  conditions?: BlockRef[];
  /** What the player pays or is asked, compiled into `on_cost`. */
  cost?: BlockRef[];
  /** What happens, compiled into `on_use`. */
  actions: BlockRef[];
}

export interface SkillSpec {
  id: string;
  /** The printed name, e.g. 「奋励」. */
  name: string;
  /** The rules text as a player reads it. */
  description: string;
  /** 锁定技: the default cost auto-accepts instead of asking (skill.lua:30). */
  compulsory?: boolean;
  /** One per event. There is no "fires on A or B" spec — add two effects. */
  effects: EffectSpec[];
}

export interface HeroSpec {
  id: string;
  /** The printed name, e.g. 「张春华」. */
  name: string;
  /** The title above it, e.g. 「德威兼济」. */
  title: string;
  kingdom: Kingdom;
  hp: number;
  /** Defaults to `hp`. */
  maxHp?: number;
  gender?: Gender;
  /** File name under the generals asset directory, set by the create endpoint. */
  image?: string;
  skills: SkillSpec[];
}

/* -------------------------------------------------------------------------- */
/* What a parameter may say                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Who a `who` / `from` / `to` / `a` / `b` parameter means.
 *
 * A trigger effect is called with four things (`skill_type/trigger.lua:37-41`)
 * and every player a block can reach is one of them or is derived from the
 * room, so this list is closed and the compiler resolves each to one Lua
 * expression. `chosen` is the pair to `ask-choose-players`: the cost stashes
 * its pick with `event:setCostData(self, { tos = … })` and the effect reads it
 * back, which is how all 159 shipped skills that target from a cost do it.
 */
export const PLAYER_REFS = ['self', 'target', 'source', 'chosen', 'current', 'others', 'all'] as const;
export type PlayerRef = (typeof PLAYER_REFS)[number];

/** `Player.Start` … `Player.Finish` (player.lua:46-56), minus the two never scheduled. */
export const PHASES = ['Start', 'Judge', 'Draw', 'Play', 'Discard', 'Finish'] as const;
export type Phase = (typeof PHASES)[number];

/** The card zones `Player:getCardIds` takes (h hand, e equip, j judgement). */
export const ZONES = ['h', 'e', 'j'] as const;

/** Comparisons a numeric condition may make. */
export const COMPARISONS = ['>', '>=', '==', '<=', '<', '~='] as const;

export interface SpecError {
  /** A JSON-pointer-ish path into the spec, e.g. `skills[0].effects[0].trigger`. */
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: SpecError[];
}

// SPEC-STABLE

/* -------------------------------------------------------------------------- */
/* The vocabulary, indexed                                                     */
/* -------------------------------------------------------------------------- */

const byId = <T extends { id: string }>(blocks: readonly T[]) =>
  new Map(blocks.map((b) => [b.id, b]));

export const TRIGGERS = byId(VOCABULARY.triggers);
export const CONDITIONS = byId(VOCABULARY.conditions);
export const EFFECTS = byId(VOCABULARY.effects);

/**
 * The parameters a block takes.
 *
 * Triggers carry no `params` in the vocabulary because an event has none — but
 * the two phase events are generic and discriminate on `data.phase`
 * (gameflow.lua:389), which the vocabulary records as `phaseParam`. So a
 * trigger that has one takes `phase`, and that is read off the data rather than
 * hardcoded here.
 */
export const paramsOf = (kind: BlockKind, id: string): string[] | null => {
  if (kind === 'trigger') {
    const t = TRIGGERS.get(id);
    if (!t) return null;
    return t.phaseParam ? ['phase'] : [];
  }
  const b = (kind === 'condition' ? CONDITIONS : EFFECTS).get(id);
  return b ? (b.params ?? []) : null;
};

export type BlockKind = 'trigger' | 'condition' | 'effect';

/**
 * Parameters a spec may leave out, and what the engine does then.
 *
 * The vocabulary lists the parameter names it observed across the shipped
 * skills; whether one of them has a default is a fact about the engine's
 * signature, not something the observation can tell you. `Room:drawCards`
 * (movecard.lua:424) takes `fromPlace` fifth and treats nil as the top of the
 * pile, so demanding one of every spec would be inventing a requirement the
 * engine does not have — and on the agent path an invented requirement is a
 * revision round spent for nothing.
 *
 * Everything not listed here is required, because leaving it out would compile
 * to a call the author did not mean.
 */
export const DEFAULTED_PARAMS: Record<string, readonly string[]> = {
  // Room:drawCards(player, num, skillName, fromPlace, moveMark) — nil is the top.
  draw: ['fromPlace'],
  // Room:throwCard(ids, skillName, who, thrower) — thrower defaults to the owner.
  throw: ['thrower'],
  // Room:obtainCard(player, card, visible, …) — a gain is face-down by default.
  obtain: ['visible'],
  // DamageDataSpec.from is optional (hp.lua:60-73) and damageType defaults normal.
  damage: ['from', 'damageType'],
  // Room:askToSkillInvoke's prompt is optional; the client falls back to the name.
  'ask-yes-no': ['prompt'],
  // The candidate pool defaults to every other living player.
  'ask-choose-players': ['targets'],
  // A nil pattern in askToCards/askToDiscard means any card.
  'ask-cards': ['pattern'],
  'ask-discard': ['zone', 'skip', 'pattern'],
  // Room:addPlayerMark(player, mark, count) — count defaults to 1.
  'add-mark': ['count'],
  'move-card-to': ['reason'],
  swap: ['zone'],
};

/** The parameters a spec must fill in for this block. */
export const requiredParamsOf = (kind: BlockKind, id: string): string[] | null => {
  const all = paramsOf(kind, id);
  if (all === null) return null;
  const defaulted = DEFAULTED_PARAMS[id];
  return defaulted ? all.filter((p) => !defaulted.includes(p)) : all;
};

/* -------------------------------------------------------------------------- */
/* Normalising                                                                 */
/* -------------------------------------------------------------------------- */

type WirePair = { name?: unknown; value?: unknown };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const scalar = (v: unknown): ParamValue | undefined => {
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  return undefined;
};

/** Either shape of `params` into the record shape, dropping what is not scalar. */
const normalizeParams = (raw: unknown): Record<string, ParamValue> => {
  const out: Record<string, ParamValue> = {};
  if (Array.isArray(raw)) {
    for (const entry of raw as WirePair[]) {
      if (!isObject(entry)) continue;
      const name = entry.name;
      const value = scalar(entry.value);
      if (typeof name === 'string' && value !== undefined) out[name] = value;
    }
  } else if (isObject(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      const value = scalar(v);
      if (value !== undefined) out[k] = value;
    }
  }
  return out;
};

const normalizeBlock = (raw: unknown): BlockRef => {
  const o = isObject(raw) ? raw : {};
  return { block: typeof o.block === 'string' ? o.block : '', params: normalizeParams(o.params) };
};

const normalizeBlocks = (raw: unknown): BlockRef[] =>
  Array.isArray(raw) ? raw.map(normalizeBlock) : [];

/**
 * Whatever came off the wire, in the shape the rest of the designer reads.
 *
 * Missing and mistyped fields survive as their empty value rather than
 * throwing, because the caller is about to run `validateSpec` and a list of
 * paths is a far better error than a stack trace — and on the agent path that
 * list is what gets fed back to the model.
 */
export const normalizeSpec = (raw: unknown): HeroSpec => {
  const o = isObject(raw) ? raw : {};
  const spec: HeroSpec = {
    id: typeof o.id === 'string' ? o.id : '',
    name: typeof o.name === 'string' ? o.name : '',
    title: typeof o.title === 'string' ? o.title : '',
    kingdom: o.kingdom as Kingdom,
    hp: typeof o.hp === 'number' ? o.hp : Number.NaN,
    skills: (Array.isArray(o.skills) ? o.skills : []).map((s): SkillSpec => {
      const so = isObject(s) ? s : {};
      return {
        id: typeof so.id === 'string' ? so.id : '',
        name: typeof so.name === 'string' ? so.name : '',
        description: typeof so.description === 'string' ? so.description : '',
        ...(so.compulsory === true ? { compulsory: true } : {}),
        effects: (Array.isArray(so.effects) ? so.effects : []).map((e): EffectSpec => {
          const eo = isObject(e) ? e : {};
          const conditions = normalizeBlocks(eo.conditions);
          const cost = normalizeBlocks(eo.cost);
          return {
            trigger: normalizeBlock(eo.trigger),
            ...(conditions.length ? { conditions } : {}),
            ...(cost.length ? { cost } : {}),
            actions: normalizeBlocks(eo.actions),
          };
        }),
      };
    }),
  };
  if (typeof o.maxHp === 'number') spec.maxHp = o.maxHp;
  if (o.gender === 'male' || o.gender === 'female') spec.gender = o.gender;
  if (typeof o.image === 'string' && o.image) spec.image = o.image;
  return spec;
};

/* -------------------------------------------------------------------------- */
/* Validating                                                                  */
/* -------------------------------------------------------------------------- */

const checkBlock = (
  ref: BlockRef,
  kind: BlockKind,
  path: string,
  errors: SpecError[],
): void => {
  if (!ref.block) {
    errors.push({ path, message: `no ${kind} block chosen` });
    return;
  }
  const params = paramsOf(kind, ref.block);
  if (params === null) {
    errors.push({
      path,
      message: `unknown ${kind} block "${ref.block}" — it is not in vocabulary.generated.json`,
    });
    return;
  }
  for (const name of requiredParamsOf(kind, ref.block) ?? []) {
    const v = ref.params[name];
    if (v === undefined || v === '') {
      errors.push({ path: `${path}.params.${name}`, message: `"${ref.block}" needs a ${name}` });
    }
  }
  for (const name of Object.keys(ref.params)) {
    if (!params.includes(name)) {
      errors.push({
        path: `${path}.params.${name}`,
        message: `"${ref.block}" takes no ${name} (it takes ${params.length ? params.join(', ') : 'nothing'})`,
      });
    }
  }
};

/**
 * Everything checkable before the compiler runs: the shape, and that every
 * block exists with its parameters filled.
 *
 * What it deliberately does not check is whether the compiler supports the
 * block — that is `compileHero`'s answer to give, because the supported subset
 * grows and a spec that is merely ahead of the compiler is still a valid spec.
 */
export const validateSpec = (input: unknown): ValidationResult => {
  const spec = normalizeSpec(input);
  const errors: SpecError[] = [];

  if (!ID_PATTERN.test(spec.id)) {
    errors.push({ path: 'id', message: `id must match ${ID_PATTERN.source} (got "${spec.id}")` });
  }
  if (!spec.name) errors.push({ path: 'name', message: 'name is required' });
  if (!spec.title) errors.push({ path: 'title', message: 'title is required' });
  if (!KINGDOMS.includes(spec.kingdom)) {
    errors.push({ path: 'kingdom', message: `kingdom must be one of ${KINGDOMS.join(', ')}` });
  }
  if (!Number.isInteger(spec.hp) || spec.hp < 1 || spec.hp > 12) {
    errors.push({ path: 'hp', message: 'hp must be a whole number from 1 to 12' });
  }
  if (spec.maxHp !== undefined) {
    if (!Number.isInteger(spec.maxHp) || spec.maxHp < 1 || spec.maxHp > 12) {
      errors.push({ path: 'maxHp', message: 'maxHp must be a whole number from 1 to 12' });
    } else if (Number.isInteger(spec.hp) && spec.maxHp < spec.hp) {
      errors.push({ path: 'maxHp', message: 'maxHp cannot be below hp' });
    }
  }

  const seen = new Set<string>();
  spec.skills.forEach((skill, i) => {
    const at = `skills[${i}]`;
    if (!ID_PATTERN.test(skill.id)) {
      errors.push({ path: `${at}.id`, message: `skill id must match ${ID_PATTERN.source}` });
    } else if (seen.has(skill.id)) {
      errors.push({ path: `${at}.id`, message: `duplicate skill id "${skill.id}"` });
    } else {
      seen.add(skill.id);
    }
    if (!skill.name) errors.push({ path: `${at}.name`, message: 'skill name is required' });
    if (!skill.description) {
      errors.push({ path: `${at}.description`, message: 'skill description is required' });
    }
    if (!skill.effects.length) {
      errors.push({ path: `${at}.effects`, message: 'a skill needs at least one effect' });
    }
    skill.effects.forEach((effect, j) => {
      const eat = `${at}.effects[${j}]`;
      checkBlock(effect.trigger, 'trigger', `${eat}.trigger`, errors);
      effect.conditions?.forEach((c, k) =>
        checkBlock(c, 'condition', `${eat}.conditions[${k}]`, errors));
      effect.cost?.forEach((c, k) => checkBlock(c, 'effect', `${eat}.cost[${k}]`, errors));
      if (!effect.actions.length) {
        errors.push({ path: `${eat}.actions`, message: 'an effect needs at least one action' });
      }
      effect.actions.forEach((a, k) => checkBlock(a, 'effect', `${eat}.actions[${k}]`, errors));
    });
  });

  return { ok: errors.length === 0, errors };
};

/* -------------------------------------------------------------------------- */
/* The schema OpenAI is handed                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Strict-mode structured output: every object closed, every key required, and
 * an optional field expressed as a nullable one. `normalizeSpec` drops the
 * nulls again.
 */
const nullable = (type: string) => ({ type: [type, 'null'] });

const PARAMS_SCHEMA = {
  type: 'array',
  description: 'The chosen block\'s parameters, one entry per name in its `params`.',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      value: { type: 'string', description: 'Numbers as digits, booleans as "true"/"false".' },
    },
    required: ['name', 'value'],
    additionalProperties: false,
  },
};

const blockSchema = (what: string) => ({
  type: 'object',
  properties: {
    block: { type: 'string', description: what },
    params: PARAMS_SCHEMA,
  },
  required: ['block', 'params'],
  additionalProperties: false,
});

export const HERO_SPEC_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'lower_snake_case, e.g. "zhang_chunhua".' },
    name: { type: 'string', description: 'The printed name, in Chinese.' },
    title: { type: 'string', description: 'The title above the name, in Chinese.' },
    kingdom: { type: 'string', enum: [...KINGDOMS] },
    hp: { type: 'integer', description: 'Starting health, 1 to 12.' },
    maxHp: nullable('integer'),
    gender: { type: ['string', 'null'], enum: [...GENDERS, null] },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'lower_snake_case, unique within the hero.' },
          name: { type: 'string', description: 'The printed skill name, in Chinese.' },
          description: { type: 'string', description: 'The rules text, in Chinese.' },
          compulsory: nullable('boolean'),
          effects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                trigger: blockSchema('A trigger block id, e.g. "fk.Damaged".'),
                conditions: {
                  type: 'array',
                  description: 'Guards, ANDed together. May be empty.',
                  items: blockSchema('A condition block id, e.g. "in-phase".'),
                },
                cost: {
                  type: 'array',
                  description: 'What the player is asked or pays. May be empty.',
                  items: blockSchema('An effect block id used as a cost, e.g. "ask-discard".'),
                },
                actions: {
                  type: 'array',
                  description: 'What happens. At least one.',
                  items: blockSchema('An effect block id, e.g. "draw".'),
                },
              },
              required: ['trigger', 'conditions', 'cost', 'actions'],
              additionalProperties: false,
            },
          },
        },
        required: ['id', 'name', 'description', 'compulsory', 'effects'],
        additionalProperties: false,
      },
    },
  },
  required: ['id', 'name', 'title', 'kingdom', 'hp', 'maxHp', 'gender', 'skills'],
  additionalProperties: false,
};
