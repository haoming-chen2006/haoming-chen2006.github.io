/**
 * The catalogue is a claim about the build, so it has to be checked against it.
 *
 * `catalogue.generated.json` is committed because booting the engine and
 * walking 1852 Lua files takes about a minute, and both designer lanes want it
 * synchronously. A committed derivative goes stale silently — a pack lands, the
 * roster grows, and the block panel keeps offering a vocabulary measured
 * against a game that no longer exists. So the freshness check regenerates and
 * compares, the way `scripts/build.test.ts` checks the Lua bundle against the
 * on-disk tree.
 *
 * The invariants below are the ones the designer actually depends on, and each
 * is a thing that has to stay true rather than a number that happens to be
 * true today. "Every skill resolves to a kind" is safe to assert because the
 * kind comes from the booted engine. "1304 skills" is not asserted anywhere,
 * because the next pack would fail a test that is not about anything.
 */
import { describe, expect, it } from 'vitest';
import { VOCABULARY, forPanel, loadCatalogue } from '../src/designer/vocabulary/index.ts';
import { buildSkillCatalogue } from './build-skill-catalogue.mjs';

const LONG = 300_000;

/** The committed catalogue, through the same lazy loader the designer uses. */
const CATALOGUE = await loadCatalogue();

describe('the shipped skill catalogue', () => {
  it('matches what the engine currently loads', async () => {
    const { catalogue, vocab } = await buildSkillCatalogue();
    // Compared through JSON so the assertion is about the committed bytes, not
    // about object identity — a re-ordered key is a real diff for a file the
    // build writes and a human reads.
    expect(
      JSON.stringify(catalogue),
      'run `npm run build:catalogue` — the packs changed under the committed catalogue',
    ).toEqual(JSON.stringify(CATALOGUE));
    expect(JSON.stringify(vocab)).toEqual(JSON.stringify(VOCABULARY));
  }, LONG);

  it('classifies every shipped skill', () => {
    // Kind and trigger come off the booted engine, so a gap here is a bug in
    // the walk rather than a limit of the source scan.
    expect(CATALOGUE.counts.skills).toBeGreaterThan(500);
    expect(CATALOGUE.unclassified, 'skills with no source span in the bundle').toEqual([]);
    expect(VOCABULARY.coverage.skillsWithAKind).toBe(CATALOGUE.counts.skills);
    expect(VOCABULARY.coverage.skillsWithAnEffect).toBe(CATALOGUE.counts.skills);
    expect(VOCABULARY.coverage.effectsPairedToSource).toBe(VOCABULARY.coverage.effectsTotal);
    for (const s of CATALOGUE.skills) {
      expect(s.kinds.length, `${s.name} has no effect kind`).toBeGreaterThan(0);
      expect(s.file, `${s.name} has no source file`).toBeTruthy();
      expect(s.generals.length, `${s.name} is on no shipped general`).toBeGreaterThan(0);
    }
  });

  /**
   * The one fact that decides what the generator emits.
   *
   * Every shipped pack is on the `fk.CreateSkill` skeleton API; the older
   * `fk.CreateTriggerSkill` family appears nowhere. If a mirrored pack ever
   * arrives carrying the legacy style, the designer has to grow a second
   * emitter, and that is a decision to take deliberately rather than to
   * discover from a generated skill that will not load.
   */
  it('is entirely on the skeleton API', () => {
    const legacy = CATALOGUE.skills.filter((s) => s.api !== 'skeleton');
    expect(legacy.map((s) => `${s.name} (${s.file})`)).toEqual([]);
  });

  it('gives every block a citation into the engine', () => {
    // A block without a citation is a promise nobody checked. Triggers are
    // exempt: their id IS the engine constant.
    for (const b of [...VOCABULARY.conditions, ...VOCABULARY.effects]) {
      expect(b.citation, `block "${b.id}" cites no engine API`).toBeTruthy();
      expect(b.label, `block "${b.id}" has no label`).toBeTruthy();
    }
    for (const b of [...VOCABULARY.triggers, ...VOCABULARY.conditions, ...VOCABULARY.effects]) {
      expect(b.examples.length, `block "${b.id}" has no example`).toBeGreaterThan(0);
      for (const name of b.examples) {
        expect(CATALOGUE.skills.some((s) => s.name === name), `${b.id} cites ${name}`).toBe(true);
      }
    }
  });

  /**
   * The panel has to be able to build something worth building.
   *
   * The brief was that blocks cover the common 80% and the agent lane covers
   * the tail. This is that promise as an assertion: what `forPanel` keeps has
   * to reach most of the roster, or the block panel is a toy and the split is
   * wrong.
   */
  it('covers most of the roster with panel-sized blocks', () => {
    const panelTriggers = new Set(forPanel(VOCABULARY.triggers).map((t) => t.id));
    const panelEffects = new Set(forPanel(VOCABULARY.effects).map((e) => e.id));
    const reachable = CATALOGUE.skills.filter((s) =>
      (s.triggers.length === 0 || s.triggers.some((t) => panelTriggers.has(t)))
      && s.allEffects.some((e) => panelEffects.has(e)));
    expect(reachable.length / CATALOGUE.skills.length).toBeGreaterThan(0.8);
  });

  it('names a phase for the phase triggers, which say nothing on their own', () => {
    // `fk.EventPhaseStart` is the most-used trigger in the game and is generic
    // across all six phases (server/events/gameflow.lua:389); a block that
    // cannot name the phase is not a block.
    const start = VOCABULARY.triggers.find((t) => t.id === 'fk.EventPhaseStart');
    expect(start?.phaseParam, 'fk.EventPhaseStart carries no phase parameter').toBeTruthy();
    expect(Object.keys(start!.phaseParam!)).toContain('Play');
  });
});
