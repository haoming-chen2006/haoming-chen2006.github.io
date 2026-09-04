/**
 * The spec, and the eleven things a click can do to it.
 *
 * One reducer over one `HeroSpec` rather than a field per widget, because the
 * whole panel is a view of that object and three separate lanes write it: the
 * blocks, the agent's reply, and 「我的武将」 re-opening a general that already
 * shipped. If any of those wrote into a different shape there would be a
 * conversion, and a conversion is where a round trip loses the 锁定技 flag
 * nobody notices until the general is in a game.
 *
 * So `loadSpec` is the same door for all three, and the blocks are the single
 * source of truth: the AI does not hold a draft of its own that the canvas
 * mirrors — it hands the canvas a spec and stops owning it.
 */
import type {
  BlockRef,
  EffectSpec,
  Gender,
  HeroSpec,
  Kingdom,
  ParamValue,
  SkillSpec,
} from '../spec';
import { normalizeSpec } from '../spec';
import { defaultParams } from './labels';
import { LANE_KIND, type Lane } from './palette';

/** An uploaded portrait, held as the base64 the create endpoint takes. */
export interface HeroImage {
  mime: string;
  base64: string;
}

export interface Selection {
  skill: number;
  effect: number;
}

export interface DesignerState {
  spec: HeroSpec;
  image: HeroImage | null;
  selected: Selection;
}

export const emptyEffect = (): EffectSpec => ({
  trigger: { block: '', params: {} },
  conditions: [],
  cost: [],
  actions: [],
});

export const emptySkill = (n: number): SkillSpec => ({
  id: `skill${n}`,
  name: '',
  description: '',
  effects: [emptyEffect()],
});

export const emptySpec = (): HeroSpec => ({
  id: '',
  name: '',
  title: '',
  kingdom: 'wei',
  hp: 4,
  gender: 'male',
  skills: [emptySkill(1)],
});

export const initialState = (): DesignerState => ({
  spec: emptySpec(),
  image: null,
  selected: { skill: 0, effect: 0 },
});

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export type Action =
  | { type: 'hero'; patch: Partial<HeroSpec> }
  | { type: 'select'; at: Selection }
  | { type: 'add-skill' }
  | { type: 'remove-skill'; skill: number }
  | { type: 'skill'; skill: number; patch: Partial<SkillSpec> }
  | { type: 'add-effect'; skill: number }
  | { type: 'remove-effect'; skill: number; effect: number }
  | { type: 'add-block'; lane: Lane; block: string }
  | { type: 'remove-block'; lane: Exclude<Lane, 'trigger'>; index: number }
  | { type: 'clear-trigger' }
  | { type: 'param'; lane: Lane; index: number; name: string; value: ParamValue }
  | { type: 'move-block'; lane: Exclude<Lane, 'trigger'>; from: number; to: number }
  | { type: 'load'; spec: unknown }
  | { type: 'image'; image: HeroImage | null }
  | { type: 'reset' };

/* -------------------------------------------------------------------------- */
/* Lens helpers                                                                */
/* -------------------------------------------------------------------------- */

const replaceAt = <T,>(list: T[], index: number, value: T): T[] =>
  list.map((item, i) => (i === index ? value : item));

/** Every effect keeps its optional lanes as real arrays while it is being edited. */
const filled = (effect: EffectSpec): Required<Pick<EffectSpec, 'conditions' | 'cost'>> & EffectSpec => ({
  ...effect,
  conditions: effect.conditions ?? [],
  cost: effect.cost ?? [],
});

const mapEffect = (
  state: DesignerState,
  change: (effect: EffectSpec) => EffectSpec,
): DesignerState => {
  const { skill, effect } = state.selected;
  const target = state.spec.skills[skill];
  if (!target || !target.effects[effect]) return state;
  const effects = replaceAt(target.effects, effect, change(filled(target.effects[effect])));
  return {
    ...state,
    spec: {
      ...state.spec,
      skills: replaceAt(state.spec.skills, skill, { ...target, effects }),
    },
  };
};

const laneOf = (effect: EffectSpec, lane: Exclude<Lane, 'trigger'>): BlockRef[] =>
  (lane === 'conditions' ? effect.conditions : lane === 'cost' ? effect.cost : effect.actions) ?? [];

const withLane = (
  effect: EffectSpec,
  lane: Exclude<Lane, 'trigger'>,
  blocks: BlockRef[],
): EffectSpec => ({ ...effect, [lane]: blocks });

/** The selection, clamped onto a spec that may have fewer skills or effects. */
const clamp = (spec: HeroSpec, at: Selection): Selection => {
  const skill = Math.min(Math.max(at.skill, 0), Math.max(spec.skills.length - 1, 0));
  const effects = spec.skills[skill]?.effects.length ?? 0;
  return { skill, effect: Math.min(Math.max(at.effect, 0), Math.max(effects - 1, 0)) };
};

/* -------------------------------------------------------------------------- */
/* The reducer                                                                 */
/* -------------------------------------------------------------------------- */

export const reduce = (state: DesignerState, action: Action): DesignerState => {
  switch (action.type) {
    case 'hero':
      return { ...state, spec: { ...state.spec, ...action.patch } };

    case 'select':
      return { ...state, selected: clamp(state.spec, action.at) };

    case 'add-skill': {
      // Three is the roster's own ceiling: no shipped general prints more, and
      // a card with four skill boxes does not fit the frame the game draws.
      if (state.spec.skills.length >= 3) return state;
      const skills = [...state.spec.skills, emptySkill(state.spec.skills.length + 1)];
      return {
        ...state,
        spec: { ...state.spec, skills },
        selected: { skill: skills.length - 1, effect: 0 },
      };
    }

    case 'remove-skill': {
      if (state.spec.skills.length <= 1) return state;
      const skills = state.spec.skills.filter((_, i) => i !== action.skill);
      const spec = { ...state.spec, skills };
      return { ...state, spec, selected: clamp(spec, state.selected) };
    }

    case 'skill': {
      const target = state.spec.skills[action.skill];
      if (!target) return state;
      return {
        ...state,
        spec: {
          ...state.spec,
          skills: replaceAt(state.spec.skills, action.skill, { ...target, ...action.patch }),
        },
      };
    }

    case 'add-effect': {
      const target = state.spec.skills[action.skill];
      if (!target) return state;
      const effects = [...target.effects, emptyEffect()];
      return {
        ...state,
        spec: {
          ...state.spec,
          skills: replaceAt(state.spec.skills, action.skill, { ...target, effects }),
        },
        selected: { skill: action.skill, effect: effects.length - 1 },
      };
    }

    case 'remove-effect': {
      const target = state.spec.skills[action.skill];
      if (!target || target.effects.length <= 1) return state;
      const effects = target.effects.filter((_, i) => i !== action.effect);
      const spec = {
        ...state.spec,
        skills: replaceAt(state.spec.skills, action.skill, { ...target, effects }),
      };
      return { ...state, spec, selected: clamp(spec, state.selected) };
    }

    case 'add-block': {
      const { lane, block } = action;
      const params = defaultParams(LANE_KIND[lane], block);
      if (lane === 'trigger') {
        return mapEffect(state, (effect) => ({ ...effect, trigger: { block, params } }));
      }
      return mapEffect(state, (effect) =>
        withLane(effect, lane, [...laneOf(effect, lane), { block, params }]),
      );
    }

    case 'remove-block':
      return mapEffect(state, (effect) =>
        withLane(effect, action.lane, laneOf(effect, action.lane).filter((_, i) => i !== action.index)),
      );

    case 'clear-trigger':
      return mapEffect(state, (effect) => ({ ...effect, trigger: { block: '', params: {} } }));

    case 'param': {
      const { lane, index, name, value } = action;
      const set = (ref: BlockRef): BlockRef => ({ ...ref, params: { ...ref.params, [name]: value } });
      if (lane === 'trigger') {
        return mapEffect(state, (effect) => ({ ...effect, trigger: set(effect.trigger) }));
      }
      return mapEffect(state, (effect) =>
        withLane(
          effect,
          lane,
          laneOf(effect, lane).map((ref, i) => (i === index ? set(ref) : ref)),
        ),
      );
    }

    case 'move-block': {
      const { lane, from, to } = action;
      return mapEffect(state, (effect) => {
        const blocks = [...laneOf(effect, lane)];
        if (from < 0 || from >= blocks.length || to < 0 || to >= blocks.length || from === to) {
          return effect;
        }
        const [moved] = blocks.splice(from, 1);
        blocks.splice(to, 0, moved);
        return withLane(effect, lane, blocks);
      });
    }

    case 'load': {
      // Through `normalizeSpec` on purpose: this is the door the agent's reply
      // and a stored draft both come in by, and neither is trusted to be the
      // right shape. A spec with no skills would otherwise crash the canvas.
      const spec = normalizeSpec(action.spec);
      const skills = spec.skills.length ? spec.skills : [emptySkill(1)];
      const fixed: HeroSpec = {
        ...spec,
        hp: Number.isFinite(spec.hp) ? spec.hp : 4,
        kingdom: spec.kingdom ?? 'wei',
        skills: skills.map((s) => ({
          ...s,
          effects: s.effects.length ? s.effects.map(filled) : [emptyEffect()],
        })),
      };
      return { ...state, spec: fixed, selected: clamp(fixed, { skill: 0, effect: 0 }) };
    }

    case 'image':
      return { ...state, image: action.image };

    case 'reset':
      return initialState();

    default:
      return state;
  }
};

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

export const DRAFT_KEY = 'fk.designer.draft';

/**
 * The draft, saved and restored around everything storage can do.
 *
 * Private browsing throws on `setItem` rather than returning false, and a quota
 * error here would take the whole panel down mid-edit; a player who cannot
 * persist should still be able to design. The portrait rides along because it
 * is already base64 and losing it on a reload is the most annoying loss of the
 * lot — but it is what makes a draft big, so a portrait over the quota is
 * dropped and the text is saved without it.
 */
export const saveDraft = (state: DesignerState): void => {
  const write = (payload: unknown) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  };
  try {
    write({ spec: state.spec, image: state.image });
  } catch {
    try {
      write({ spec: state.spec, image: null });
    } catch {
      /* no storage at all: the draft lives for this page load only */
    }
  }
};

export const loadDraft = (): Partial<DesignerState> | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { spec?: unknown; image?: HeroImage | null };
    if (!parsed || typeof parsed !== 'object' || !parsed.spec) return null;
    const loaded = reduce(initialState(), { type: 'load', spec: parsed.spec });
    return { ...loaded, image: parsed.image ?? null };
  } catch {
    return null;
  }
};

export const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
};

/* -------------------------------------------------------------------------- */
/* Small conveniences the components share                                     */
/* -------------------------------------------------------------------------- */

export const KINGDOM_NAMES: Record<Kingdom, string> = {
  wei: '魏',
  shu: '蜀',
  wu: '吴',
  qun: '群',
  jin: '晋',
};

export const GENDER_NAMES: Record<Gender, string> = { male: '男', female: '女' };
