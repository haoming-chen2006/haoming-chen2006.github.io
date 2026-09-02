/**
 * The four generals the game stops for.
 *
 * WHAT IS WORTH ASSERTING HERE, given that "the scene looks good" is not a
 * thing a test can hold. Two properties, and both of them are the ones that
 * cost something when they break:
 *
 *   IT FIRES ON A CHANGE, NEVER ON AN ARRIVAL. Every trigger is a value that
 *   the engine re-broadcasts constantly — a general on every reconnect, a mark
 *   forty times a second from the status poll. A trigger that reads "the seat
 *   IS m_shi2__weiyan" instead of "the seat BECAME m_shi2__weiyan" would take
 *   over the screen of everybody who refreshed the page, which is the whole of
 *   the risk in this feature and is invisible until it happens to somebody.
 *
 *   IT NEVER WRITES SOMETHING IT DID NOT MEAN TO. The portrait is the first
 *   value in this lane that reaches a stylesheet, through a `url()` in a custom
 *   property, so `faceUrl` is checked against the shapes that would escape it.
 *
 * The plan layer is testable at all because it decides what an effect looks
 * like in plain objects; there is no jsdom in this project. See `plan.ts`.
 */
import { describe, expect, it } from 'vitest';
import { budgetMs } from '../budget';
import {
  CUTSCENES, CUTSCENE_GENERALS, DAOXIN_MARK, DAOXIN_MAX, DAOXIN_STEPS,
  WATCHED_MARKS, XIONGZI_MARK, afterPortraits, invoked, marked, transformed,
} from '../cutscene';
import { PALETTES } from '../motif';
import { cutsceneBurst, faceUrl } from '../plan';
import { SIGNATURES } from '../signatures';

const scene = (key: string) => {
  const c = CUTSCENES[key];
  if (!c) throw new Error(`no cutscene ${key}`);
  return c;
};

const burst = (key: string, extra: Partial<Parameters<typeof cutsceneBurst>[0]> = {}) =>
  cutsceneBurst({
    scene: scene(key),
    title: '忠傲',
    gained: '狂骨',
    line: '此番斩将得胜，只是连捷之始！',
    mark: '蜀',
    kingdom: 'shu',
    ms: 2600,
    ...extra,
  });

describe('which four, and on what', () => {
  it('covers exactly the four generals and no others', () => {
    expect([...CUTSCENE_GENERALS].sort()).toEqual([
      'm_shi__weiyan', 'm_shi__zhouyu', 'mobile__caomao', 'mobile__godjiangwei',
    ]);
  });

  it('names a skill the roster has art direction for', () => {
    // A scene prints its skill's own name as the title and is coloured to match
    // that skill's seat-scale signature, which the same moment also draws. A
    // scene naming a skill with no signature would be a takeover sitting on top
    // of a generic category seal.
    for (const c of Object.values(CUTSCENES)) {
      expect(SIGNATURES, c.key).toHaveProperty([c.skill]);
    }
  });

  it('colours every scene out of the shared palette', () => {
    // Not a style rule. `hue` names one of `motif.ts`'s twenty-eight pairs, so
    // a cutscene and the signature it sits over cannot drift into two different
    // reds. A name that is not in the table would be `undefined.rgb` at paint.
    for (const c of Object.values(CUTSCENES)) {
      expect(PALETTES, c.key).toHaveProperty([c.hue]);
      expect(PALETTES, c.key).toHaveProperty([c.hue2]);
    }
  });

  it('gives each of the four its own music', () => {
    const themed = Object.values(CUTSCENES).filter((c) => c.theme);
    expect(themed).toHaveLength(Object.keys(CUTSCENES).length);
    // Six scenes, six themes: 势魏延's two outcomes and 势周瑜's two forms are
    // separate pieces of music in the game they come from, and collapsing
    // either pair would lose exactly the thing the fork is for.
    expect(new Set(themed.map((c) => c.theme)).size).toBe(themed.length);
  });
});

describe('a transformation fires on the change, not on the value', () => {
  it('reads which portrait the engine said the seat now has', () => {
    expect(transformed('m_shi__weiyan', 'm_shi2__weiyan')?.key).toBe('weiyan-rise');
    expect(transformed('m_shi__weiyan', 'm_shi3__weiyan')?.key).toBe('weiyan-fall');
    expect(transformed('mobile__caomao', 'mobile2__caomao')?.key).toBe('caomao-juejin');
  });

  it('does not fire when a seat is simply dealt the transformed general', () => {
    // `PropertyUpdate[id, "general", …]` is broadcast at the top of the game and
    // again on every reconnect. Without the previous value, opening the page
    // would play somebody's 使命 resolution at them.
    expect(transformed(undefined, 'm_shi2__weiyan')).toBeUndefined();
    expect(transformed('', 'm_shi3__weiyan')).toBeUndefined();
    expect(transformed('m_shi2__weiyan', 'm_shi2__weiyan')).toBeUndefined();
    // A different general arriving at the same seat is not Wei Yan's mission.
    expect(transformed('zhangfei', 'm_shi2__weiyan')).toBeUndefined();
  });

  it('leaves 雄姿 to the mark, because the portrait cannot say which form', () => {
    // Both branches of 雄姿 write the same portrait. Reading it would give a
    // scene that is right half the time about which of two commanders he became.
    expect(transformed('m_shi__zhouyu', 'm_shi2__zhouyu')).toBeUndefined();
  });

  it('survives anything a package can put on the wire', () => {
    expect(transformed(null, 42)).toBeUndefined();
    expect(transformed({}, [])).toBeUndefined();
  });
});

describe('雄姿 forks on the branch the engine wrote down', () => {
  it('reads the mark, and gets the option numbering the right way round', () => {
    // `xiongzi.lua` offers `{ "xiongzi_2", "xiongzi_1" }` and translates
    // `xiongzi_2` as 选项一. So the mark reading `xiongzi_2` is the FIRST
    // option, which is the one where all three skills are fire damage.
    expect(marked(XIONGZI_MARK, undefined, 'xiongzi_2')?.key).toBe('zhouyu-fire');
    expect(marked(XIONGZI_MARK, undefined, 'xiongzi_1')?.key).toBe('zhouyu-water');
    expect(CUTSCENES['zhouyu-fire'].hue).toBe('flame');
    expect(CUTSCENES['zhouyu-water'].hue).toBe('azure');
  });

  it('ignores the poll resending a mark it has already seen', () => {
    // The mark is `-noclear` and the status poll resends every visible `@` mark
    // on every living seat five times a second. Only the first arrival is a
    // choice being made.
    expect(marked(XIONGZI_MARK, 'xiongzi_2', 'xiongzi_2')).toBeUndefined();
    expect(marked(XIONGZI_MARK, 'xiongzi_1', 'xiongzi_2')).toBeUndefined();
  });

  it('ignores a value the package did not define', () => {
    expect(marked(XIONGZI_MARK, undefined, 'xiongzi_3')).toBeUndefined();
    expect(marked(XIONGZI_MARK, undefined, 1)).toBeUndefined();
  });

  it('watches that mark and nothing else', () => {
    expect(WATCHED_MARKS).toEqual([XIONGZI_MARK]);
    // 潜龙's counter is drawn as a gauge, not fired as a scene: nothing
    // published describes an effect at 25, 50 or 75, and 99 arrives as 决进,
    // which is a transformation.
    expect(marked(DAOXIN_MARK, 20, 99)).toBeUndefined();
    expect(DAOXIN_STEPS).toEqual([25, 50, 75, 99]);
    expect(DAOXIN_MAX).toBe(99);
  });
});

describe('神霈 rides the engine’s own pause', () => {
  it('answers the limited-skill animation for 神霈 alone', () => {
    expect(invoked('shenpeij')?.key).toBe('jiangwei-shenpei');
    // 雄姿 and 决进 are limited too and both send this message. Their scenes are
    // the transformation that follows, so answering here as well would play two
    // takeovers for one moment.
    expect(invoked('xiongzi')).toBeUndefined();
    expect(invoked('juejin')).toBeUndefined();
    expect(invoked(undefined)).toBeUndefined();
  });
});

describe('what gets drawn', () => {
  it('fills the room and takes no pointer event from anybody', () => {
    const b = burst('weiyan-rise');
    expect(b.scope).toBe('sky');
    // Nothing here may block a click: three of the six scenes arrive with no
    // engine pause behind them, on a seat that may owe the engine an answer.
    // `pointer-events: none` is in `spectacle.css` on `.fk-spec` and every part.
    expect(b.cls).toContain('fk-spec');
    expect(b.cls).toContain('fk-cut');
  });

  it('draws two plates only when the engine said the seat became somebody', () => {
    const turns = burst('weiyan-rise', { face: 'assets/a.webp', faceAfter: 'assets/b.webp' });
    expect(turns.cls).toContain('fk-cut--turns');
    expect(turns.parts.filter((p) => p.cls.includes('fk-cut__face'))).toHaveLength(2);
    expect(turns.vars['--fk-cut-face']).toBe('url("assets/a.webp")');
    expect(turns.vars['--fk-cut-face2']).toBe('url("assets/b.webp")');

    // 神霈 changes nothing about who is sitting there. One plate, and the class
    // that turns the wipe on is absent, so the seam never draws.
    const holds = burst('jiangwei-shenpei', { face: 'assets/a.webp' });
    expect(holds.cls).not.toContain('fk-cut--turns');
    expect(holds.parts.filter((p) => p.cls.includes('fk-cut__face'))).toHaveLength(1);
  });

  it('draws no plate at all rather than an empty frame', () => {
    // A dev page with no asset manifest, or a portrait the pipeline did not
    // ship. The scene is still a scene.
    const b = burst('weiyan-fall');
    expect(b.parts.some((p) => p.cls.includes('fk-cut__face'))).toBe(false);
    expect(b.vars['--fk-cut-face']).toBeUndefined();
  });

  it('prints only what it was given, and never a hole where prose should be', () => {
    const b = burst('weiyan-fall', { gained: '', line: '' });
    const text = b.parts.map((p) => p.text).filter(Boolean);
    // 困奋 has voice recordings upstream and no definition anywhere, so the
    // failure branch's subtitle can legitimately be empty. What it must not be
    // is the bare key `kunfen` in 26 px type — `Spectacle.prose` drops it, and
    // the part is not emitted at all.
    expect(b.parts.some((p) => p.cls.includes('fk-cut__gain'))).toBe(false);
    expect(b.parts.some((p) => p.cls.includes('fk-cut__line'))).toBe(false);
    expect(text).toContain('忠傲');
  });

  it('writes engine text as text and never as markup', () => {
    // The same rule the rest of the lane keeps: `svg` is the only thing
    // `paint.ts` ever puts through `innerHTML`, and it is a constant from
    // `plan.ts`. A cutscene prints three engine strings and must use none of it.
    const b = burst('zhouyu-fire', { face: 'assets/a.webp', faceAfter: 'assets/b.webp' });
    expect(b.parts.every((p) => p.svg === undefined)).toBe(true);
  });
});

describe('a portrait URL is the one string that reaches a stylesheet', () => {
  it('accepts what the asset pipeline actually emits', () => {
    expect(faceUrl('assets/f771cbbeeeac.webp')).toBe('assets/f771cbbeeeac.webp');
    expect(faceUrl('/freekill/assets/616bb5bf6eb6.webp')).toBe('/freekill/assets/616bb5bf6eb6.webp');
  });

  it('refuses anything that could end the url() or leave the deployment', () => {
    // `--fk-cut-face` is interpolated into `url("…")`. A quote, a paren or a
    // scheme would be a style injected from a value, which is the one thing
    // this lane has always refused to allow.
    for (const bad of [
      'a".webp',
      'a).webp',
      'a\\".webp',
      'assets/a b.webp',
      'https://example.com/a.webp',
      '//example.com/a.webp',
      'javascript:alert(1)',
      'data:image/svg+xml;base64,AAAA',
    ]) {
      expect(faceUrl(bad), bad).toBeUndefined();
    }
    expect(faceUrl(undefined)).toBeUndefined();
    expect(faceUrl('')).toBeUndefined();
  });
});

describe('what it costs the table', () => {
  it('is the longest thing in the lane, and still finishes', () => {
    // The two deliberate exceptions to the one-beat rule are a death and this.
    expect(budgetMs('cutscene', 800)).toBe(2600);
    expect(budgetMs('cutscene', 400)).toBe(1300);
  });

  it('draws nothing at all when the table is running unpaced', () => {
    // `?pace=0` is the audit playing a whole game in two minutes. Every budget
    // resolves to 0, nothing is created, and — because `AnimBus` asks for the
    // music only if something was drawn — the soundtrack does not lurch either.
    expect(budgetMs('cutscene', 0)).toBe(0);
  });

  it('holds its node count near what a limited skill already costs', () => {
    // `ultBurst` is 14 + 14 + 18 + 4 nodes and has been on the table since
    // before the freeze was fixed. A scene that cost several times that would
    // be a full-screen paint budget nobody measured.
    const nodes = (key: string) => burst(key, { face: 'a.webp', faceAfter: 'b.webp' })
      .parts.reduce((n, p) => n + (p.n ?? 1), 0);
    for (const key of Object.keys(CUTSCENES)) expect(nodes(key), key).toBeLessThanOrEqual(24);
  });
});

describe('the portraits are decoded before they are needed', () => {
  it('knows every face a general can turn into', () => {
    expect([...afterPortraits('m_shi__weiyan')].sort()).toEqual(['m_shi2__weiyan', 'm_shi3__weiyan']);
    expect(afterPortraits('m_shi__zhouyu')).toEqual(['m_shi2__zhouyu', 'm_shi2__zhouyu']);
    expect(afterPortraits('mobile__caomao')).toEqual(['mobile2__caomao']);
    // 神姜维 stays himself; there is nothing to warm.
    expect(afterPortraits('mobile__godjiangwei')).toEqual([]);
    expect(afterPortraits('zhangfei')).toEqual([]);
  });
});
