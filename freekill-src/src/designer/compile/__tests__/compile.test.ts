/**
 * The compiler's claim is that what it emits works in the real engine, so the
 * suite boots the real engine. Emitting Lua and eyeballing it proves nothing:
 * the two ways a generated general fails — a skill name the engine never
 * registered, and a `can_trigger` that is never true — both leave a file that
 * loads cleanly and a card that prints the skill.
 */
import { describe, expect, it } from 'vitest';
import { compileHero } from '../index.ts';
import { formatHeadless, testHero } from '../headless.ts';
import { JIANBI, SHEDE } from '../../spec.example.ts';
import { CompileError } from '../emit.ts';
import type { HeroSpec } from '../../spec.ts';

const LONG = 300_000;

/** The generated file, in the bundle, without touching the working tree. */
const asPackage = (spec: HeroSpec, lua: string) => ({
  [`packages/custom/generals/${spec.id}.lua`]: lua,
});

describe('a compiled hero, in the engine', () => {
  for (const spec of [JIANBI, SHEDE]) {
    it(`loads, resolves and fires: ${spec.id}`, async () => {
      const { lua, warnings } = compileHero(spec);
      expect(warnings).toEqual([]);
      const result = await testHero(spec, { files: asPackage(spec, lua) });
      expect(formatHeadless(result).join('\n')).toContain('ok  ');
      expect(result.checks.filter((c) => !c.ok)).toEqual([]);
      expect(result.drove?.fired, formatHeadless(result).join('\n')).toBe(true);
    }, LONG);
  }
});

describe('what the compiler refuses', () => {
  const withEffect = (trigger: string, actions: { block: string; params: Record<string, string | number> }[]) => ({
    ...JIANBI,
    id: 'dsgn_probe',
    skills: [{
      ...JIANBI.skills[0],
      id: 'dsgn_probe_skill',
      effects: [{ trigger: { block: trigger, params: {} }, actions }],
    }],
  }) as HeroSpec;

  it('names the block it does not support', () => {
    expect(() => compileHero(withEffect('fk.Damaged', [{ block: 'pindian', params: { from: 'self', tos: 'others' } }])))
      .toThrow(/does not support the "pindian" block/);
  });

  // `fk.Dying` is declared (events/death.lua:23) and fired from nowhere, so no
  // shipped skill uses it and it never entered the vocabulary. The refusal
  // therefore comes from `validateSpec`, one layer before the compiler — which
  // is the layer that should own it.
  it('refuses fk.Dying, which the engine never fires', () => {
    expect(() => compileHero(withEffect('fk.Dying', [{ block: 'draw', params: { who: 'self', count: 1 } }])))
      .toThrow(/unknown trigger block "fk\.Dying"/);
  });

  it('refuses a subject guard on an event that has no subject', () => {
    const spec = withEffect('fk.AfterCardsMove', [{ block: 'draw', params: { who: 'self', count: 1 } }]);
    spec.skills[0].effects[0].conditions = [{ block: 'self-is-subject', params: {} }];
    expect(() => compileHero(spec)).toThrow(/passes no subject/);
  });

  it('refuses to change damage after the hp has already moved', () => {
    expect(() => compileHero(withEffect('fk.Damaged', [{ block: 'change-damage', params: { delta: -1 } }])))
      .toThrow(/fk.DamageInflicted/);
  });

  it('refuses to throw cards ask-discard already threw', () => {
    const spec = withEffect('fk.Damaged', [{ block: 'throw', params: { cards: 'cost', who: 'self' } }]);
    spec.skills[0].effects[0].cost = [{ block: 'ask-discard', params: { who: 'self', min: 1, max: 1 } }];
    expect(() => compileHero(spec)).toThrow(/already threw those cards/);
  });

  it('reports where in the spec the trouble is', () => {
    try {
      compileHero(withEffect('fk.Damaged', [{ block: 'draw', params: { who: 'nobody', count: 1 } }]));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CompileError);
      expect((e as CompileError).path).toBe('skills[0].effects[0].actions[0]');
    }
  });
});

describe('what the compiler warns about', () => {
  it('says when a skill would fire on everybody\'s event', () => {
    const spec: HeroSpec = {
      ...JIANBI,
      skills: [{
        ...JIANBI.skills[0],
        effects: [{
          trigger: { block: 'fk.Damaged', params: {} },
          actions: [{ block: 'draw', params: { who: 'self', count: 1 } }],
        }],
      }],
    };
    expect(compileHero(spec).warnings.join('\n')).toMatch(/fires on every player's/);
  });
});
