/**
 * The half of this lane that can be checked without a browser.
 *
 * There is no jsdom in this project — the `dialogs` suites render with
 * `renderToStaticMarkup` for exactly that reason — so `paint.ts` is not under
 * test here and the plan layer is. That split is why the plan layer exists: what
 * an effect looks like is decided in plain objects, and only turning those
 * objects into elements needs a document.
 *
 * What is worth asserting is not "the CSS is pretty". It is the two properties
 * the design rests on: that a category the engine invents still animates, and
 * that the nine categories are actually distinguishable rather than nine tints
 * of one thing.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { budgetMs, SLAY_PHASE } from '../budget';
import { motifParts } from '../compose';
import { FIGURES } from '../motif';
import { SIGNATURES, signatureOf } from '../signatures';
import { jitter } from '../paint';
import {
  CATEGORIES, ELEMENT_RGB, KINGDOM_BANNER, KINGDOMS, markOf, ROLES, ROLE_RITE,
  SIGNATURE, toCategory, toElement, toKingdom, toRole, toWeight,
} from '../palette';
import {
  drainBurst, drawBurst, equipBurst, hexBurst, mendBurst, openBurst,
  skillBurst, slayBurst, strikeBurst, ultBurst, verdictBurst, vigourBurst,
} from '../plan';

const skill = (category: (typeof CATEGORIES)[number], extra: Partial<Parameters<typeof skillBurst>[0]> = {}) =>
  skillBurst({ category, label: 'Raid', kingdom: 'wei', mark: 'W', ms: 620, ...extra });

describe('the nine categories', () => {
  it('covers exactly the set the engine enumerates', () => {
    // `lua/lunarltk/server/system_enum.lua:87`. `big` is the tenth value and is
    // not a category — it routes to `InvokeUltSkill` instead.
    expect([...CATEGORIES].sort()).toEqual([
      'control', 'defensive', 'drawcard', 'masochism', 'negative',
      'offensive', 'special', 'support', 'switch',
    ]);
  });

  it('animates a skill_type nobody has written yet', () => {
    // The whole reason this lane scales past 274 generals: a pack can ship any
    // string here and `RoomLogic.js` calls an unrecognised one `special`.
    // `paoxiao` really does send its own name.
    expect(toCategory('paoxiao')).toBe('special');
    expect(toCategory(undefined)).toBe('special');
    expect(toCategory('')).toBe('special');
    expect(toCategory(7)).toBe('special');
    expect(skill(toCategory('a_pack_from_2027')).parts.length).toBeGreaterThan(0);
  });

  it('gives every category its own direction of motion', () => {
    // The load-bearing claim of the design: direction is what the eye reads
    // first, so no two categories may share one. If this fails, two categories
    // have become the same effect in different colours.
    const moves = CATEGORIES.map((c) => SIGNATURE[c].move);
    expect(new Set(moves).size).toBe(CATEGORIES.length);
  });

  it('gives every category its own shape, not just its own tint', () => {
    // Two categories with the same set of part classes would be one effect
    // recoloured, which is precisely what the shipped sprite strips are.
    const shapes = CATEGORIES.map((c) => skill(c).parts.map((p) => p.cls).sort().join('|'));
    expect(new Set(shapes).size).toBe(CATEGORIES.length);
  });

  it('leaves the two categories that hold still holding still', () => {
    // `control` constricts a seat that does not move — the stillness IS the
    // effect — and `drawcard` is about the cards, not the player.
    expect(skill('control').host).toBeUndefined();
    expect(skill('drawcard').host).toBeUndefined();
    expect(skill('offensive').host).toBe('lunge');
  });

  it('gives defensive no particles at all', () => {
    // Every other category scatters. A guard that does not scatter is the one
    // reading that cannot be confused with any of the other eight.
    expect(SIGNATURE.defensive.motes).toBe(0);
    expect(skill('defensive').parts.some((p) => (p.n ?? 1) > 1 && p.cls.includes('spark'))).toBe(false);
  });
});

describe('masochism takes the colour of what hit it', () => {
  it('inherits the element of the damage that provoked it', () => {
    for (const el of ['fire', 'thunder', 'ice'] as const) {
      expect(skill('masochism', { element: el }).vars['--fk-spec-rgb']).toBe(ELEMENT_RGB[el]);
    }
  });

  it('keeps its own red for plain damage and for no damage at all', () => {
    expect(skill('masochism').vars['--fk-spec-rgb']).toBe(SIGNATURE.masochism.rgb);
    expect(skill('masochism', { element: 'normal' }).vars['--fk-spec-rgb']).toBe(SIGNATURE.masochism.rgb);
  });

  it('never lets an element leak into another category', () => {
    // Only masochism is provoked. An `offensive` skill fired by a player who
    // happened to be burned a moment ago is still offensive.
    expect(skill('offensive', { element: 'fire' }).vars['--fk-spec-rgb']).toBe(SIGNATURE.offensive.rgb);
  });

  it("reads the engine's four damage types and nothing else", () => {
    expect(toElement('fire_damage')).toBe('fire');
    expect(toElement('thunder_damage')).toBe('thunder');
    expect(toElement('ice_damage')).toBe('ice');
    expect(toElement('normal_damage')).toBe('normal');
    expect(toElement(undefined)).toBe('normal');
    expect(toElement('something_new_damage')).toBe('normal');
  });
});

describe('kingdom frames the name without touching the effect', () => {
  it('has a banner for every kingdom the engine can send', () => {
    for (const k of [...KINGDOMS, 'unknown' as const]) {
      expect(KINGDOM_BANNER[k].rim).toMatch(/^\d+, \d+, \d+$/);
      expect(KINGDOM_BANNER[k].seal).toMatch(/^\d+, \d+, \d+$/);
    }
  });

  it('takes the seal character from the engine rather than a table here', () => {
    // Writing the glyphs into this file put them outside the dictionary, out of
    // reach of translation, and — for the traditional forms it briefly used —
    // outside the committed font subset, which renders as an empty box.
    const zh = (k: string) => ({ wei: 'Wei-in-Chinese', shu: 'Shu-in-Chinese' }[k] ?? k);
    expect(markOf('wei', zh)).toBe('W');
    // An untranslated key comes back as itself and is still readable.
    expect(markOf('god', (k) => k)).toBe('G');
    // A translator that answers with nothing is a translator that said nothing:
    // the key stands in, rather than the seal going blank.
    expect(markOf('unknown', () => '')).toBe('U');
    expect(markOf('wu', () => '  ')).toBe('W');
  });

  it('falls back rather than dropping the banner on an unknown kingdom', () => {
    expect(toKingdom('wei')).toBe('wei');
    expect(toKingdom('wild')).toBe('wild');
    expect(toKingdom(null)).toBe('unknown');
    expect(toKingdom('atlantis')).toBe('unknown');
  });

  it('changes the plaque and nothing else between two kingdoms', () => {
    // Four players' `offensive` must look like one thing, not four. Only the
    // rim and the seal may differ.
    const wei = skill('offensive', { kingdom: 'wei' }).vars;
    const shu = skill('offensive', { kingdom: 'shu' }).vars;
    const differs = Object.keys(wei).filter((k) => wei[k] !== shu[k]);
    expect(differs.sort()).toEqual(['--fk-spec-rim', '--fk-spec-seal']);
  });
});

describe('how much damage that was', () => {
  it('reads damageNum, capped where the difference stops showing', () => {
    expect(toWeight(1)).toBe(1);
    expect(toWeight(2)).toBe(2);
    expect(toWeight(9)).toBe(3);
    expect(toWeight(undefined)).toBe(1);
    expect(toWeight('2')).toBe(2);
  });

  it('states the number and draws no second impact', () => {
    // The card lane authors the impact, per element. Two bursts on one hit is
    // worse than either alone; what it cannot say is how big the hit was.
    const three = strikeBurst({ element: 'fire', weight: 3, ms: 460 });
    expect(three.parts).toHaveLength(1);
    expect(three.parts[0].text).toBe('−−−');
    expect(strikeBurst({ element: 'normal', weight: 1, ms: 460 }).parts[0].text).toBe('−');
  });

  it('never writes the width variable it once collided with', () => {
    // `--fk-spec-w` is the seat's measured width. Setting it to a damage count
    // made a three-point hit three pixels wide.
    expect(strikeBurst({ element: 'ice', weight: 2, ms: 460 }).vars['--fk-spec-w']).toBeUndefined();
  });
});

describe('the slay', () => {
  const slay = (role: (typeof ROLES)[number] | 'unknown', extra = {}) =>
    slayBurst({ role, label: 'Lord', kingdom: 'shu', mark: 'S', ms: 1750, ...extra });

  it('gives each role its own sequence, not its own tint', () => {
    // The engine ships eight separate death stamps. Four roles that differed
    // only in colour would be throwing that away.
    const tempers = [...ROLES, 'unknown' as const].map((r) => ROLE_RITE[r].temper);
    expect(new Set(tempers).size).toBeGreaterThanOrEqual(4);
    expect(ROLE_RITE.lord.temper).toBe('sovereign');
    expect(ROLE_RITE.rebel.temper).toBe('savage');
    expect(ROLE_RITE.renegade.temper).toBe('unmasked');
  });

  it('takes the whole room for a lord and only the seat for anyone else', () => {
    expect(slay('lord').cls).toContain('fk-spec--room-wide');
    for (const r of ['loyalist', 'rebel', 'renegade', 'unknown'] as const) {
      expect(slay(r).cls).not.toContain('fk-spec--room-wide');
    }
  });

  it('fills the room rather than one seat', () => {
    expect(slay('rebel').scope).toBe('sky');
  });

  it("aims the blade down the engine's own indicator line when there was one", () => {
    expect(slay('rebel', { cut: 137 }).vars['--fk-slay-cut']).toBe('137deg');
    // With no line, the role's own angle stands and nothing looks wrong.
    expect(slay('rebel').vars['--fk-slay-cut']).toBe(`${ROLE_RITE.rebel.cut}deg`);
  });

  it('stamps a short role name vertically and a long one horizontally', () => {
    // 主公 is a vertical brush seal, the way `image/photo/death/lord.png` is.
    // "Renegade" stacked letter over letter would be eight rows tall.
    expect(slay('lord', { label: 'Wei' }).cls).toContain('fk-spec--seal-tall');
    expect(slay('renegade', { label: 'Renegade' }).cls).toContain('fk-spec--seal-wide');
  });

  it("marks the portrait with its role's own temper", () => {
    expect(slay('rebel').host).toBe('slain slain-savage');
    expect(slay('renegade').host).toBe('slain slain-unmasked');
  });

  it('names a role it was not given rather than guessing one', () => {
    expect(toRole('lord')).toBe('lord');
    expect(toRole('unknown')).toBe('unknown');
    // `victim.rest > 0` makes the engine log `unknown` and never set role_shown.
    expect(toRole(undefined)).toBe('unknown');
    expect(toRole('emperor')).toBe('unknown');
  });
});

describe('timing', () => {
  const BEATS = ['skill', 'ult', 'strike', 'slay', 'verdict', 'accent'] as const;

  it('draws nothing at all when the table is unpaced', () => {
    // The audit harness plays whole games at `pace=0`. Hundreds of overlapping
    // effects competing with the thing being measured is not "fast", and
    // degrading to instant is what keeps that run honest.
    for (const beat of BEATS) expect(budgetMs(beat, 0)).toBe(0);
  });

  it('keeps every ordinary effect inside the beat it lands in', () => {
    // The rule this lane runs on: the engine's next message must never land on
    // top of a running effect. The two exceptions are deliberate and licensed —
    // `ult` spends the 2000 ms the server itself pauses for, and `slay` is the
    // rarest and largest moment in a game.
    for (const pace of [120, 400, 800, 2000]) {
      for (const beat of BEATS) {
        if (beat === 'ult' || beat === 'slay') continue;
        expect(budgetMs(beat, pace), `${beat} at ${pace}`).toBeLessThan(pace);
      }
    }
  });

  it('scales with the pace and stops at its ceiling', () => {
    expect(budgetMs('skill', 200)).toBeLessThan(budgetMs('skill', 800));
    expect(budgetMs('skill', 100000)).toBe(budgetMs('skill', 5000));
  });

  it("publishes the slay's own phases in order, for the sound lane", () => {
    const phases = [SLAY_PHASE.flash, SLAY_PHASE.cut, SLAY_PHASE.shatter, SLAY_PHASE.seal];
    expect(phases).toEqual([...phases].sort((a, b) => a - b));
    expect(SLAY_PHASE.seal).toBeLessThan(1);
  });
});

describe('every effect is a well-formed plan', () => {
  const all = [
    skill('offensive'),
    ultBurst({ label: 'Dragon Heart', kingdom: 'shu', mark: 'S', ms: 1900 }),
    strikeBurst({ element: 'fire', weight: 2, ms: 460 }),
    drainBurst(320), mendBurst(320), vigourBurst(1, 460), vigourBurst(-1, 460),
    slayBurst({ role: 'lord', label: 'Lord', kingdom: 'wei', mark: 'W', ms: 1750 }),
    openBurst('wu', 'U', 320), drawBurst(3, 320), equipBurst(320), hexBurst(320),
    verdictBurst(true, 700), verdictBurst(false, 700),
  ];

  it('always states its own duration and colours', () => {
    for (const b of all) {
      expect(b.ms).toBeGreaterThan(0);
      expect(b.vars['--fk-spec-ms']).toBe(`${b.ms}ms`);
      expect(b.vars['--fk-spec-rgb']).toMatch(/^\d+, \d+, \d+$/);
      expect(b.parts.length).toBeGreaterThan(0);
    }
  });

  it('never puts engine text down the markup path', () => {
    // `text` is written with `textContent` and `svg` with `innerHTML`. A part
    // that carried both would be a way for a translated skill name to become
    // markup.
    for (const b of all) {
      for (const p of b.parts) expect(p.text !== undefined && p.svg !== undefined).toBe(false);
    }
  });

  it('asks for a sane number of nodes even at its largest', () => {
    // One effect is one paint. A hundred nodes on a seat is a frame drop.
    for (const b of all) {
      const nodes = b.parts.reduce((n, p) => n + (p.n ?? 1), 0);
      // The ult is the largest at 50 — two scrolling bands and eighteen speed
      // lines — and it fires at most once per player per game.
      expect(nodes).toBeLessThanOrEqual(56);
    }
  });

  it('clamps a draw of any size to something a seat can hold', () => {
    expect(drawBurst(40, 320).parts[0].n).toBe(5);
    expect(drawBurst(0, 320).parts[0].n).toBe(1);
  });

  it('says nothing about a max-hp change of nothing', () => {
    expect(vigourBurst(2, 460).parts.some((p) => p.text === '+2')).toBe(true);
    expect(vigourBurst(-3, 460).parts.some((p) => p.text === '−3')).toBe(true);
  });
});

describe('particle scatter', () => {
  it('is stable per index, so a particle does not jump mid-flight', () => {
    // `Math.random()` per read would re-scatter every time CSS re-evaluated the
    // custom property.
    expect(jitter(3)).toBe(jitter(3));
    expect(jitter(3)).not.toBe(jitter(4));
  });

  it('stays inside the range the keyframes assume', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(jitter(i)).toBeGreaterThanOrEqual(-1);
      expect(jitter(i)).toBeLessThanOrEqual(1);
    }
  });

  it('actually spreads rather than clustering', () => {
    const xs = Array.from({ length: 40 }, (_, i) => jitter(i));
    expect(Math.max(...xs)).toBeGreaterThan(0.6);
    expect(Math.min(...xs)).toBeLessThan(-0.6);
  });
});

/* -------------------------------------------------------------- signatures */

/**
 * The roster the build actually ships, read the same way the contact sheet
 * reads it. A signature keyed to a skill no general has is a design nobody will
 * ever see, and the way that happens is a typo in a key nothing checks.
 *
 * A GENERAL'S `skills` IS WHAT HE STARTS WITH, NOT WHAT HE CAN FIRE. Seven
 * skills in this build are handed over during a game and appear on nobody's
 * character card: 忠傲 grants 狂骨, 潜龙 grants 清正, 酒诗, 放逐 and 决进 as its
 * counter climbs, and 神霈 grants 回天. All of them fire `InvokeSkill` under
 * their own names, so a signature for one is a design players do see — and the
 * roster alone would call it an orphan.
 *
 * So the check is against the roster PLUS the engine's own translation table,
 * which is the authority on whether a name is a skill at all. That is a
 * stronger typo guard than the roster was, not a weaker one: `juejin` passes
 * because the engine defines it, and `juejjn` would fail against either set.
 */
const ROSTER: { generals: { skills: string[] }[] } = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../../../public/overview.json'), 'utf8'),
);
const SHIPPED = new Set(ROSTER.generals.flatMap((g) => g.skills));

describe('the signature table', () => {
  it('is keyed to skills this build actually ships', async () => {
    const { EN_US } = await import('../../../../../i18n/engine');
    const known = (k: string) => SHIPPED.has(k) || Object.prototype.hasOwnProperty.call(EN_US, k);
    const orphans = Object.keys(SIGNATURES).filter((k) => !known(k));
    expect(orphans).toEqual([]);
  });

  it('has a design for every skill the four cutscene generals are handed', async () => {
    // The other half of the same fact. These are drawn on the seat immediately
    // after a scene names them, so a missing one is the takeover being followed
    // by a generic category seal for the skill it just announced.
    for (const k of [
      'm_shi__kuanggu',
      'mobile_qianlong__qingzheng', 'mobile_qianlong__jiushi',
      'mobile_qianlong__fangzhu', 'juejin',
      'huitian',
    ]) {
      expect(SIGNATURES, k).toHaveProperty([k]);
    }
    // 困奋 is the exception and it is the engine's, not this table's:
    // `zhongao.lua` hands it over by name, the package ships four voice
    // recordings for it, and it defines the skill nowhere. Nothing can fire
    // under that name in this build, so a design for it would be unreachable.
    const { EN_US } = await import('../../../../../i18n/engine');
    expect(EN_US).not.toHaveProperty(['kunfen']);
    expect(SIGNATURES).not.toHaveProperty(['kunfen']);
  });

  it('draws the engine\'s generated sub-skills as the skill they belong to', () => {
    // `SkillSkeleton:createTriggerSkill` names a trigger `#<parent>_<n>_trig`
    // and registers its translation as the parent's, so both fire `InvokeSkill`
    // under names a player never sees and both mean 咆哮. Without this the
    // designed effect appeared for some of a skill's invocations and the plain
    // category burst for the rest — 残势 fired 24 times as itself and 38 as
    // `#canshi_2_trig` in one pair of audited games.
    expect(signatureOf('paoxiao')).toBe(SIGNATURES.paoxiao);
    expect(signatureOf('#paoxiao_1_trig')).toBe(SIGNATURES.paoxiao);
    expect(signatureOf('paoxiao&')).toBe(SIGNATURES.paoxiao);
    expect(signatureOf('#paoxiao')).toBe(SIGNATURES.paoxiao);
    // And it never invents one. A name that strips to nothing known is a
    // fallback to the category, which is a real effect.
    expect(signatureOf('#not_a_skill_1_trig')).toBeUndefined();
    expect(signatureOf('nonesuch')).toBeUndefined();
  });

  it('never asks a seat for more nodes than one paint can hold', () => {
    // The same rule the plans above are held to, applied to every design in the
    // table at once: this is where a 537-row file would quietly grow a 60-node
    // effect that only shows up as a frame drop on somebody else's laptop.
    for (const [name, motif] of Object.entries(SIGNATURES)) {
      const parts = motifParts(motif, '牌');
      const nodes = parts.reduce((n, p) => n + (p.n ?? 1), 0);
      expect(nodes, name).toBeLessThanOrEqual(34);
    }
  });

  it('is a vocabulary rather than a house style', () => {
    // Twelve of these are looked at side by side on the contact sheet, and the
    // failure mode of a composed system is that everything drifts to the same
    // safe combination. No figure and no colour may own more than a tenth of
    // the roster, and every figure has to earn its CSS by being used.
    const share = (pick: (m: (typeof SIGNATURES)[string]) => string) => {
      const tally = new Map<string, number>();
      for (const m of Object.values(SIGNATURES)) {
        const k = pick(m);
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      return tally;
    };
    const total = Object.keys(SIGNATURES).length;
    const figures = share((m) => m.figure);
    const hues = share((m) => m.hue);
    for (const [k, n] of figures) expect(n / total, `figure ${k}`).toBeLessThan(0.1);
    for (const [k, n] of hues) expect(n / total, `hue ${k}`).toBeLessThan(0.1);
    for (const f of FIGURES) expect(figures.get(f) ?? 0, `figure ${f} unused`).toBeGreaterThan(0);
  });
});
