/**
 * Two heroes, written the way the panel and the agent both have to write them.
 *
 * They are here to be run, not to be read: `compile/__tests__/compile.test.ts`
 * boots the engine on both, and the designer server's `--selftest` uses them as
 * the fixture for its own endpoints. So a change to the spec shape that these
 * survive is a change the compiler survives.
 *
 * The pair is chosen to cover the split that the engine enforces and that a
 * designer gets wrong first. 坚壁 is a 锁定技 with no cost at all — the trigger
 * fires and the effect runs. 舍得 pays before it gains, and the payment is an
 * ask that can be cancelled, which is exactly the case that goes wrong when the
 * discard is written into `on_use`: a player who cancels still draws two.
 */
import type { HeroSpec } from './spec.ts';

/** 锁定技，当你受到伤害后，你摸一张牌。 */
export const JIANBI: HeroSpec = {
  id: 'dsgn_jianbi',
  name: '坚壁客',
  title: '受创而立',
  kingdom: 'wei',
  hp: 4,
  gender: 'male',
  skills: [
    {
      id: 'dsgn_jianbi_skill',
      name: '坚壁',
      description: '锁定技，当你受到伤害后，你摸一张牌。',
      compulsory: true,
      effects: [
        {
          trigger: { block: 'fk.Damaged', params: {} },
          // The engine's default `triggerable` is already `target == player`,
          // but `can_trigger` REPLACES it rather than extending it
          // (skill_skeleton.lua:274), so the compiler has to emit the check and
          // the spec has to ask for it.
          conditions: [{ block: 'self-is-subject', params: {} }],
          actions: [{ block: 'draw', params: { who: 'self', count: 1 } }],
        },
      ],
    },
  ],
};

/** 结束阶段开始时，你可以弃置一张手牌，然后摸两张牌。 */
export const SHEDE: HeroSpec = {
  id: 'dsgn_shede',
  name: '舍得子',
  title: '损之又损',
  kingdom: 'qun',
  hp: 3,
  maxHp: 4,
  gender: 'female',
  skills: [
    {
      id: 'dsgn_shede_skill',
      name: '舍得',
      description: '结束阶段开始时，你可以弃置一张手牌，然后摸两张牌。',
      effects: [
        {
          trigger: { block: 'fk.EventPhaseStart', params: { phase: 'Finish' } },
          conditions: [
            { block: 'self-is-subject', params: {} },
            { block: 'has-handcards', params: {} },
          ],
          // Cost, not action. `TriggerSkill:doCost` (trigger.lua:70) runs this
          // first and only runs the draw if it returned true.
          cost: [{ block: 'ask-discard', params: { who: 'self', min: 1, max: 1 } }],
          actions: [{ block: 'draw', params: { who: 'self', count: 2 } }],
        },
      ],
    },
  ],
};

export const EXAMPLES: HeroSpec[] = [JIANBI, SHEDE];
