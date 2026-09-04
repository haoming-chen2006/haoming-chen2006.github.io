/**
 * What the designer says, and what a click actually does to the spec.
 *
 * There is no DOM in this suite, on purpose and for the same reason
 * `room/dialogs/__tests__/skill-panels.test.tsx` has none: the repo ships no
 * jsdom, every component test here renders through `renderToStaticMarkup`, and
 * adding a browser-shaped test runner to check that a `<select>` is a `<select>`
 * would be a dependency bought for very little. So the split is deliberate.
 *
 *   * The REDUCER is where a click ends up, so the "click a block, it lands in
 *     the stack with its parameters filled" claims are made against `reduce`
 *     directly. That is not a proxy for the behaviour; it is the behaviour.
 *   * The MARKUP is checked for what a player has to be able to read: Chinese
 *     on every block, the four palette tabs, the card's fields.
 *   * The real clicking — pointer down on a palette chip, a number typed into a
 *     block, `window.__designerSpec` changing — is covered end to end by the
 *     browser pass described in the report, against the real page.
 *
 * The one thing worth stating outright: nothing here re-implements validation.
 * `problemsOf` runs `spec.ts`'s `validateSpec`, the same function the create
 * endpoint runs, so a test that says 「这个 spec 合法」 is saying the server
 * would agree.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateSpec, type HeroSpec } from '../../spec';
import { forPanel, VOCABULARY } from '../../vocabulary/index';
import { App } from '../App';
import { Canvas } from '../components/Canvas';
import { blockLabel, defaultParams } from '../labels';
import { PALETTE, paletteBlock, sectionsFor, search } from '../palette';
import { problemsOf } from '../problems';
import {
  DRAFT_KEY,
  initialState,
  loadDraft,
  reduce,
  saveDraft,
  type Action,
  type DesignerState,
} from '../state';

/* -------------------------------------------------------------------------- */
/* The vocabulary reaches the panel, in Chinese                                */
/* -------------------------------------------------------------------------- */

describe('the palette', () => {
  it('offers the common and occasional blocks and nothing rarer', () => {
    expect(PALETTE.trigger).toHaveLength(forPanel(VOCABULARY.triggers).length);
    expect(PALETTE.conditions).toHaveLength(forPanel(VOCABULARY.conditions).length);
    expect(PALETTE.actions).toHaveLength(forPanel(VOCABULARY.effects).length);
    expect(PALETTE.trigger.every((b) => b.band === 'common' || b.band === 'occasional')).toBe(true);
  });

  /**
   * The 代价 tab is not a fourth kind of block: it is the effects the shipped
   * roster actually pays with. `ask-yes-no` is there 184 times, which is the
   * whole reason the tab exists — and `draw` is not, because nobody pays a
   * draw.
   */
  it('fills 代价 from the effects that appear in on_cost', () => {
    const ids = PALETTE.cost.map((b) => b.id);
    expect(ids).toContain('ask-yes-no');
    expect(ids).toContain('ask-discard');
    expect(ids).toContain('ask-choose-players');
    expect(ids).not.toContain('draw');
    expect(ids).not.toContain('damage');
    expect(PALETTE.cost.every((b) => (b.asCost ?? 0) > 0)).toBe(true);
    // Sorted by how often it is a cost, so the ask everybody wants is first.
    expect(PALETTE.cost[0].id).toBe('ask-yes-no');
  });

  it('names every block it offers in Chinese', () => {
    const han = /[一-鿿]/;
    const unnamed: string[] = [];
    for (const lane of ['trigger', 'conditions', 'actions'] as const) {
      for (const block of PALETTE[lane]) {
        if (!han.test(block.label)) unnamed.push(`${lane}:${block.id}`);
      }
    }
    expect(unnamed).toEqual([]);
  });

  it('carries the citation and the real example skills into the tooltip', () => {
    const draw = PALETTE.actions.find((b) => b.id === 'draw');
    expect(draw?.citation).toContain('drawCards');
    expect(draw?.examples.length).toBeGreaterThan(0);
    const damaged = PALETTE.trigger.find((b) => b.id === 'fk.Damaged');
    expect(damaged?.citation).toContain('fk.Damaged');
    expect(damaged?.examples).toContain('beige');
  });

  it('groups triggers by event family and the rest by band', () => {
    const triggerSections = sectionsFor('trigger').map((s) => s.title);
    expect(triggerSections).toContain('流程');
    expect(triggerSections).toContain('伤害');
    expect(sectionsFor('conditions').map((s) => s.title)).toEqual(['常用', '偶尔用到']);
  });

  it('searches by Chinese, by English and by id', () => {
    expect(search(PALETTE.actions, '摸牌').map((b) => b.id)).toContain('draw');
    expect(search(PALETTE.actions, 'discard').map((b) => b.id)).toContain('throw');
    expect(search(PALETTE.trigger, 'fk.Damaged').map((b) => b.id)).toEqual(['fk.Damaged']);
  });

  /**
   * A spec from the agent lane may name a `rare` block the panel does not
   * offer. The canvas has to draw it anyway — `validateSpec` is what says
   * whether it is real, not the palette's inventory.
   */
  it('still describes a block it does not offer', () => {
    const rare = paletteBlock('actions', 'kill-or-revive');
    expect(rare.label).toBe('杀死或复活角色');
    const unknown = paletteBlock('actions', 'not-a-block');
    expect(unknown.label).toBe('not-a-block');
  });

  it('gives the phase events a phase dropdown and other triggers none', () => {
    expect(defaultParams('trigger', 'fk.EventPhaseStart')).toEqual({ phase: 'Play' });
    expect(defaultParams('trigger', 'fk.Damaged')).toEqual({});
  });

  it('reads a block face in Chinese for every kind', () => {
    expect(blockLabel('trigger', 'fk.EventPhaseStart')).toBe('阶段开始时');
    expect(blockLabel('trigger', 'fk.Damaged')).toBe('受到伤害后');
    expect(blockLabel('effect', 'draw')).toBe('摸牌');
    expect(blockLabel('effect', 'throw')).toBe('弃牌');
    expect(blockLabel('condition', 'in-phase')).toBe('当前是某阶段');
  });
});

/* -------------------------------------------------------------------------- */
/* What a click does                                                           */
/* -------------------------------------------------------------------------- */

const run = (actions: Action[], from: DesignerState = initialState()): DesignerState =>
  actions.reduce(reduce, from);

/** A hero with everything filled but the blocks — so a test can add only those. */
const named = (): Action[] => [
  { type: 'hero', patch: { id: 'zhang_chunhua', name: '张春华', title: '德威兼济', kingdom: 'wei', hp: 3 } },
  { type: 'skill', skill: 0, patch: { id: 'jueqing', name: '绝情', description: '当你受到伤害后，你可以摸一张牌。' } },
];

describe('building a skill by clicking', () => {
  it('drops a trigger into the hat and an action into the green band', () => {
    const state = run([
      ...named(),
      { type: 'add-block', lane: 'trigger', block: 'fk.Damaged' },
      { type: 'add-block', lane: 'actions', block: 'draw' },
    ]);
    const effect = state.spec.skills[0].effects[0];
    expect(effect.trigger.block).toBe('fk.Damaged');
    expect(effect.actions).toHaveLength(1);
    expect(effect.actions[0].block).toBe('draw');
  });

  /**
   * A block that lands already saying 「摸 1 张」 rather than 「摸 — 张」 is the
   * difference between a panel that teaches and a panel that nags. What it does
   * NOT guess is a mark's name, and that is exactly what the validator asks for.
   */
  it('fills in what it can guess and leaves the rest for the validator to ask about', () => {
    const state = run([...named(), { type: 'add-block', lane: 'actions', block: 'draw' }]);
    expect(state.spec.skills[0].effects[0].actions[0].params).toEqual({ who: 'self', count: 1 });

    const marked = run([...named(), { type: 'add-block', lane: 'actions', block: 'set-mark' }]);
    const params = marked.spec.skills[0].effects[0].actions[0].params;
    expect(params.who).toBe('self');
    expect(params.value).toBe(1);
    expect(params.mark).toBeUndefined();
  });

  /**
   * The parameters the ENGINE defaults are left out, however obvious a value
   * for them looks from here. `DamageDataSpec.from` is optional and its absence
   * means the damage has no source: pre-filling 「由 你」 would make the hero
   * the origin of every damage this block deals, and 反馈 and 死谏 would start
   * firing off a skill that never said anything about a source. Same for
   * `ask-discard`'s `skip`, where the engine's `false` is what makes a cost
   * actually throw the cards.
   */
  it('leaves an engine-defaulted parameter empty rather than inventing one', () => {
    const damage = run([{ type: 'add-block', lane: 'actions', block: 'damage' }]);
    const params = damage.spec.skills[0].effects[0].actions[0].params;
    expect(params).toEqual({ to: 'target', amount: 1 });
    expect(params.from).toBeUndefined();
    expect(params.damageType).toBeUndefined();

    const ask = run([{ type: 'add-block', lane: 'cost', block: 'ask-discard' }]);
    const cost = ask.spec.skills[0].effects[0].cost?.[0].params ?? {};
    expect(cost).toEqual({ who: 'self', min: 1, max: 1 });
    expect(cost.skip).toBeUndefined();

    // …and none of that is an error, because `requiredParamsOf` agrees.
    expect(problemsOf(damage.spec).under('skills[0].effects[0].actions[0]')).toEqual([]);
    expect(problemsOf(ask.spec).under('skills[0].effects[0].cost[0]')).toEqual([]);
  });

  it('replaces the trigger rather than stacking a second one', () => {
    const state = run([
      { type: 'add-block', lane: 'trigger', block: 'fk.Damaged' },
      { type: 'add-block', lane: 'trigger', block: 'fk.EventPhaseStart' },
    ]);
    expect(state.spec.skills[0].effects[0].trigger.block).toBe('fk.EventPhaseStart');
    expect(state.spec.skills[0].effects[0].trigger.params).toEqual({ phase: 'Play' });
  });

  it('adds a block to whichever stack is selected', () => {
    const state = run([
      ...named(),
      { type: 'add-block', lane: 'trigger', block: 'fk.Damaged' },
      { type: 'add-effect', skill: 0 },
      { type: 'add-block', lane: 'trigger', block: 'fk.TurnStart' },
    ]);
    expect(state.selected).toEqual({ skill: 0, effect: 1 });
    expect(state.spec.skills[0].effects.map((e) => e.trigger.block)).toEqual([
      'fk.Damaged',
      'fk.TurnStart',
    ]);
  });

  it('edits a parameter in place', () => {
    const state = run([
      { type: 'add-block', lane: 'actions', block: 'draw' },
      { type: 'param', lane: 'actions', index: 0, name: 'count', value: 3 },
      { type: 'param', lane: 'trigger', index: 0, name: 'phase', value: 'Finish' },
    ]);
    expect(state.spec.skills[0].effects[0].actions[0].params.count).toBe(3);
    expect(state.spec.skills[0].effects[0].trigger.params.phase).toBe('Finish');
  });

  it('reorders a stack and removes from it', () => {
    const three: Action[] = [
      { type: 'add-block', lane: 'actions', block: 'draw' },
      { type: 'add-block', lane: 'actions', block: 'recover' },
      { type: 'add-block', lane: 'actions', block: 'damage' },
    ];
    const moved = run([...three, { type: 'move-block', lane: 'actions', from: 2, to: 0 }]);
    expect(moved.spec.skills[0].effects[0].actions.map((a) => a.block)).toEqual([
      'damage',
      'draw',
      'recover',
    ]);
    const removed = run([...three, { type: 'remove-block', lane: 'actions', index: 1 }]);
    expect(removed.spec.skills[0].effects[0].actions.map((a) => a.block)).toEqual(['draw', 'damage']);
    // An out-of-range move is a no-op, not a crash: the drag can end anywhere.
    expect(run([...three, { type: 'move-block', lane: 'actions', from: 0, to: 9 }])).toEqual(
      run(three),
    );
  });

  it('caps skills at three and never deletes the last one', () => {
    const many = run([{ type: 'add-skill' }, { type: 'add-skill' }, { type: 'add-skill' }]);
    expect(many.spec.skills).toHaveLength(3);
    const bare = run([{ type: 'remove-skill', skill: 0 }]);
    expect(bare.spec.skills).toHaveLength(1);
  });

  it('keeps the selection pointing at something after a deletion', () => {
    const state = run([
      { type: 'add-skill' },
      { type: 'add-effect', skill: 1 },
      { type: 'remove-skill', skill: 1 },
    ]);
    expect(state.selected).toEqual({ skill: 0, effect: 0 });
  });
});

/* -------------------------------------------------------------------------- */
/* Validation, against the real validator                                      */
/* -------------------------------------------------------------------------- */

describe('what the canvas objects to', () => {
  it('asks for a trigger and an action before anything else', () => {
    const problems = problemsOf(run(named()).spec);
    const paths = problems.errors.map((e) => e.path);
    expect(paths).toContain('skills[0].effects[0].trigger');
    expect(paths).toContain('skills[0].effects[0].actions');
    expect(problems.at('skills[0].effects[0].actions')[0]).toContain('at least one action');
  });

  it('points at the unfilled parameter by name so the block can mark the hole', () => {
    const state = run([
      ...named(),
      { type: 'add-block', lane: 'trigger', block: 'fk.Damaged' },
      { type: 'add-block', lane: 'actions', block: 'set-mark' },
    ]);
    const problems = problemsOf(state.spec);
    expect(problems.at('skills[0].effects[0].actions[0].params.mark')).toHaveLength(1);
    // …and the block-level lookup finds it, which is what draws the red ring.
    expect(problems.under('skills[0].effects[0].actions[0]')).toHaveLength(1);
  });

  it('goes green on a hero that is actually buildable', () => {
    const state = run([
      ...named(),
      { type: 'add-block', lane: 'trigger', block: 'fk.Damaged' },
      { type: 'add-block', lane: 'cost', block: 'ask-yes-no' },
      { type: 'add-block', lane: 'actions', block: 'draw' },
    ]);
    const problems = problemsOf(state.spec);
    expect(problems.errors).toEqual([]);
    expect(problems.ok).toBe(true);
    expect(validateSpec(state.spec).ok).toBe(true);
  });

  it('counts the problems under a skill, for the badge on its header', () => {
    const problems = problemsOf(run([...named(), { type: 'add-skill' }]).spec);
    expect(problems.under('skills[1]').length).toBeGreaterThan(0);
    expect(problems.under('skills[0]').length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* The round trip the AI lane depends on                                       */
/* -------------------------------------------------------------------------- */

const AGENT_SPEC: HeroSpec = {
  id: 'wo_de_jiang',
  name: '我的将',
  title: '试作',
  kingdom: 'wu',
  hp: 4,
  gender: 'female',
  skills: [
    {
      id: 'shiyan',
      name: '试验',
      description: '当你受到伤害后，你可以弃置一张牌，然后摸两张牌。',
      compulsory: true,
      effects: [
        {
          trigger: { block: 'fk.Damaged', params: {} },
          conditions: [{ block: 'is-alive', params: {} }],
          cost: [{ block: 'ask-discard', params: { who: 'self', min: 1, max: 1 } }],
          actions: [{ block: 'draw', params: { who: 'self', count: 2 } }],
        },
      ],
    },
  ],
};

describe('loading a spec somebody else wrote', () => {
  it('puts every block on the canvas and keeps 锁定技', () => {
    const state = run([{ type: 'load', spec: AGENT_SPEC }]);
    expect(state.spec.name).toBe('我的将');
    expect(state.spec.skills[0].compulsory).toBe(true);
    const effect = state.spec.skills[0].effects[0];
    expect(effect.trigger.block).toBe('fk.Damaged');
    expect(effect.conditions?.[0].block).toBe('is-alive');
    expect(effect.cost?.[0].params.min).toBe(1);
    expect(effect.actions[0].params.count).toBe(2);
    expect(problemsOf(state.spec).ok).toBe(true);
  });

  it('is still editable afterwards — the blocks, not the reply, are the truth', () => {
    const state = run([
      { type: 'load', spec: AGENT_SPEC },
      { type: 'param', lane: 'actions', index: 0, name: 'count', value: 3 },
      { type: 'add-block', lane: 'actions', block: 'recover' },
    ]);
    expect(state.spec.skills[0].effects[0].actions.map((a) => a.block)).toEqual(['draw', 'recover']);
    expect(state.spec.skills[0].effects[0].actions[0].params.count).toBe(3);
  });

  /**
   * The agent's structured output comes back with `params` as `{name, value}`
   * pairs — strict mode cannot express an open record — and with nulls where a
   * field was optional. `normalizeSpec` is the door, and `load` goes through
   * it, so the canvas never has to know.
   */
  it('takes the wire shape the model actually emits', () => {
    const state = run([
      {
        type: 'load',
        spec: {
          id: 'x', name: '测试将', title: '试作', kingdom: 'shu', hp: 4, maxHp: null, gender: null,
          skills: [
            {
              id: 's', name: '试技', description: '这是一个用来测试的技能。', compulsory: null,
              effects: [
                {
                  trigger: { block: 'fk.EventPhaseStart', params: [{ name: 'phase', value: 'Play' }] },
                  conditions: [],
                  cost: [],
                  actions: [{ block: 'draw', params: [{ name: 'count', value: '2' }] }],
                },
              ],
            },
          ],
        },
      },
    ]);
    expect(state.spec.skills[0].effects[0].trigger.params).toEqual({ phase: 'Play' });
    expect(state.spec.skills[0].effects[0].actions[0].params).toEqual({ count: '2' });
    expect(state.spec.gender).toBeUndefined();
  });

  it('survives a reply with nothing usable in it', () => {
    const empty = run([{ type: 'load', spec: { skills: [] } }]);
    expect(empty.spec.skills).toHaveLength(1);
    expect(empty.spec.skills[0].effects).toHaveLength(1);
    expect(empty.spec.hp).toBe(4);
    expect(empty.selected).toEqual({ skill: 0, effect: 0 });
    expect(run([{ type: 'load', spec: null }]).spec.skills).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/* The draft                                                                   */
/* -------------------------------------------------------------------------- */

describe('the saved draft', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('comes back with the blocks and the portrait', () => {
    const state = run([
      ...named(),
      { type: 'add-block', lane: 'trigger', block: 'fk.Damaged' },
      { type: 'add-block', lane: 'actions', block: 'draw' },
      { type: 'image', image: { mime: 'image/png', base64: 'AAAA' } },
    ]);
    saveDraft(state);
    const back = loadDraft();
    expect(back?.spec?.name).toBe('张春华');
    expect(back?.spec?.skills[0].effects[0].actions[0].block).toBe('draw');
    expect(back?.image).toEqual({ mime: 'image/png', base64: 'AAAA' });
  });

  /**
   * A quota error is what a big portrait produces, and it must not cost the
   * player the twenty blocks they just placed. The text is retried without the
   * image rather than the whole save being abandoned.
   */
  it('keeps the blocks when the portrait will not fit', () => {
    let refuseImages = true;
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (refuseImages && v.includes('base64')) throw new Error('QuotaExceededError');
        store.set(k, v);
      },
      removeItem: (k: string) => void store.delete(k),
    });
    const state = run([...named(), { type: 'image', image: { mime: 'image/png', base64: 'big' } }]);
    saveDraft(state);
    refuseImages = false;
    expect(loadDraft()?.spec?.name).toBe('张春华');
    expect(loadDraft()?.image).toBeNull();
  });

  it('is silent when there is no storage at all', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => saveDraft(initialState())).not.toThrow();
    expect(loadDraft()).toBeNull();
  });

  it('ignores a draft that is not a draft', () => {
    store.set(DRAFT_KEY, 'not json');
    expect(loadDraft()).toBeNull();
    store.set(DRAFT_KEY, '{"nope":1}');
    expect(loadDraft()).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* What is on screen                                                           */
/* -------------------------------------------------------------------------- */

describe('the panel as rendered', () => {
  it('draws the three columns, in Chinese', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('武将设计器');
    // The card.
    expect(html).toContain('武将名');
    expect(html).toContain('称号');
    expect(html).toContain('势力');
    expect(html).toContain('体力');
    for (const k of ['魏', '蜀', '吴', '群', '晋']) expect(html).toContain(`>${k}<`);
    // The palette, its four tabs and a common block from each.
    expect(html).toContain('阶段开始时');
    expect(html).toContain('积木库');
    expect(html).toContain('AI 设计');
    expect(html).toContain('我的武将');
    // The canvas, and the hint about why several triggers is normal.
    expect(html).toContain('再加一个触发时机');
    expect(html).toContain('引擎里一个技能挂在一个时机上');
    // The actions.
    expect(html).toContain('创建武将');
    expect(html).toContain('校验');
  });

  it('says what is missing before anything has been placed', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('必须先从右边「触发」里选一个时机');
    expect(html).toContain('从右边「效果」里点一块放进来');
  });

  it('draws a placed block with its parameters on its face', () => {
    const state = run([
      ...named(),
      { type: 'add-block', lane: 'trigger', block: 'fk.EventPhaseStart' },
      { type: 'add-block', lane: 'cost', block: 'ask-discard' },
      { type: 'add-block', lane: 'actions', block: 'draw' },
    ]);
    const html = renderToStaticMarkup(
      <Canvas state={state} problems={problemsOf(state.spec)} dispatch={() => {}} />,
    );
    expect(html).toContain('阶段开始时');
    expect(html).toContain('令其弃置牌');
    expect(html).toContain('摸牌');
    // The phase dropdown, with the engine's own phase on it.
    expect(html).toContain('出牌阶段');
    // The lanes are distinguishable by colour class, which is how a cost is
    // told from an effect at a glance.
    expect(html).toContain('fk-hd-block--trigger');
    expect(html).toContain('fk-hd-block--cost');
    expect(html).toContain('fk-hd-block--actions');
    // And a complete stack draws no error text.
    expect(html).not.toContain('fk-hd-block--bad');
  });

  it('marks the block whose parameter is empty, not the whole skill', () => {
    const state = run([
      ...named(),
      { type: 'add-block', lane: 'trigger', block: 'fk.Damaged' },
      { type: 'add-block', lane: 'actions', block: 'draw' },
      { type: 'add-block', lane: 'actions', block: 'set-mark' },
    ]);
    const html = renderToStaticMarkup(
      <Canvas state={state} problems={problemsOf(state.spec)} dispatch={() => {}} />,
    );
    expect(html).toContain('fk-hd-param--bad');
    expect(html.match(/fk-hd-block--bad/g) ?? []).toHaveLength(1);
  });
});
