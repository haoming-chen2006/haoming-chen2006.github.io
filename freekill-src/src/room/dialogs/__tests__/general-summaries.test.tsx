/**
 * The plain-language summaries, and the switch between them and the rules text.
 *
 * Two separate promises are checked here.
 *
 * THE DATA. Every general the build can put in front of a player has a summary,
 * in both languages, in at most two sentences. "Every" is read off
 * `public/overview.json` — the same 274 `scripts/build-overview.mjs` extracts
 * from a booted VM — rather than off a number written down here, so a package
 * that adds a general fails this test until someone writes it up. That is the
 * intended way to find out.
 *
 * THE BOX. The toggle hides and shows the engine's rules text and nothing else:
 * the summary is drawn either way, the skill names are drawn either way, and
 * `readSkills` is untouched by it. A summary is prose and the room may never
 * compute one — `__tests__/no-rules.test.ts` is the standing guard on that, and
 * nothing here reaches into a skill to decide anything.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { LANGUAGES, LanguageProvider, type Language } from '../../../i18n';
import { Assets } from '../../assets/assets';
import { GENERAL_SUMMARIES, generalSummary } from '../../../i18n/generalSummaries';
import { GeneralDetail, resetSkillView, setSkillView } from '../GeneralDetail';
import type { GeneralDetail as GeneralDetailData } from '../../ltk/types';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';

const HERE = dirname(fileURLToPath(import.meta.url));
const OVERVIEW = join(HERE, '..', '..', '..', '..', 'public', 'overview.json');

interface Overview {
  readonly generals: readonly { readonly name: string }[];
  readonly translations: Readonly<Record<string, string>>;
}

const overview: Overview = JSON.parse(readFileSync(OVERVIEW, 'utf8'));

/** A sentence ends at one of these and nowhere else; the summaries are written
 *  to avoid decimals and abbreviations so that this stays true. */
const ENDINGS: Readonly<Record<Language, RegExp>> = {
  zh_CN: /[。！？]/g,
  en_US: /[.!?]/g,
};

function sentences(text: string, lang: Language): number {
  return (text.match(ENDINGS[lang]) ?? []).length;
}

describe('the general summaries', () => {
  it('covers every general the build can offer', () => {
    const names = overview.generals.map((g) => g.name);
    expect(names.length).toBeGreaterThan(250);

    const missing = names.filter((n) => !generalSummary(n));
    expect(missing, `${missing.length} general(s) with no summary`).toEqual([]);

    // And nothing here that the build does not ship: a stale entry is a summary
    // nobody will ever read, and a name nobody can check.
    const known = new Set(names);
    expect(Object.keys(GENERAL_SUMMARIES).filter((n) => !known.has(n))).toEqual([]);
  });

  it('says something in both languages, in at most two sentences', () => {
    const tooLong: string[] = [];
    const empty: string[] = [];
    for (const [name, summary] of Object.entries(GENERAL_SUMMARIES)) {
      for (const lang of LANGUAGES) {
        const text = summary[lang];
        const n = sentences(text, lang);
        if (!text.trim()) empty.push(`${name}/${lang}`);
        // At least one, so a summary cannot be a fragment; at most two, which is
        // the whole point of the feature.
        if (n < 1 || n > 2) tooLong.push(`${name}/${lang}: ${n} sentences — ${text}`);
      }
    }
    expect(empty).toEqual([]);
    expect(tooLong).toEqual([]);
  });

  it('keeps the two languages actually separate', () => {
    // A zh_CN string copied into en_US is the failure mode that looks fine in a
    // diff and is useless on screen. English carries no Han characters, and the
    // two are never the same string.
    const wrong: string[] = [];
    for (const [name, summary] of Object.entries(GENERAL_SUMMARIES)) {
      if (/[㐀-䶿一-鿿]/.test(summary.en_US)) wrong.push(`${name}: en_US has Han characters`);
      if (summary.zh_CN === summary.en_US) wrong.push(`${name}: both languages are the same string`);
    }
    expect(wrong).toEqual([]);
  });

  it('leads with a role, in the register the request asked for', () => {
    // "attack, attack, defensive, blah blah" — the first word is what a player
    // scanning three candidates reads. Held to a closed set so that 274 entries
    // written in one sitting cannot drift into 274 different openings.
    const ZH = ['进攻型', '防守型', '防守反击型', '辅助型', '摸牌型', '干扰型',
      '控场型', '爆发型', '成长型', '治疗型', '综合型', '特殊型'];
    const EN = ['Aggressive', 'Defensive', 'Support', 'Card draw', 'Disruptive',
      'Control', 'Late-game', 'Healer', 'Utility', 'Unusual'];
    const odd: string[] = [];
    for (const [name, summary] of Object.entries(GENERAL_SUMMARIES)) {
      if (!ZH.some((r) => summary.zh_CN.startsWith(`${r}。`))) odd.push(`${name}: zh_CN lead — ${summary.zh_CN}`);
      if (!EN.some((r) => summary.en_US.startsWith(`${r}.`))) odd.push(`${name}: en_US lead — ${summary.en_US}`);
    }
    expect(odd).toEqual([]);
  });

  it('only claims a skill is untranslated when this build really has no text for it', () => {
    // `missing` is the honest gap: skills a general GAINS whose package is not
    // in `packages/`, so `Fk:getDescription` answers with the bare key. If a
    // later package brings one in, `:<skill>` starts resolving in the overview
    // payload and this fails — which is the signal to drop the flag rather than
    // keep telling a player something is unreadable when it is not.
    const wrong: string[] = [];
    for (const [name, summary] of Object.entries(GENERAL_SUMMARIES)) {
      for (const key of summary.missing ?? []) {
        if (overview.translations[`:${key}`]) wrong.push(`${name}: ${key} now has text`);
      }
    }
    expect(wrong).toEqual([]);

    // And the flag is used where it is needed. Nine generals reach a skill this
    // build cannot describe; the count is asserted so that silently losing the
    // flag on one of them is a failure rather than a quieter box.
    const flagged = Object.entries(GENERAL_SUMMARIES).filter(([, s]) => s.missing?.length);
    expect(flagged.map(([n]) => n)).toEqual([
      'guansuo', 'm_ex__jiangwei', 'm_liuyi__zhouyu', 'm_shi__weiyan', 'm_sp__caocao',
      'mobile__caoying', 'mobile__godsimayi', 'mobile__heqi', 'mobile__wangyuanji',
    ]);
  });

  it('answers a general it has never heard of with nothing, not with filler', () => {
    expect(generalSummary('no_such_general')).toBeUndefined();
    // Not `Object.prototype`: a general called `constructor` would otherwise
    // come back as a function.
    expect(generalSummary('constructor')).toBeUndefined();
    expect(generalSummary('toString')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

const RULES = '锁定技，出牌阶段，你使用【杀】无次数限制。';

const DETAIL: GeneralDetailData = {
  package: 'standard', extension: 'standard', kingdom: 'shu',
  hp: 4, maxHp: 4, shield: 0, gender: 1,
  skill: [{ name: 'paoxiao', description: RULES, is_related_skill: false }],
  companions: [],
};

function stub(): LtkLua {
  return {
    tr: (key: string) => key,
    getGeneralData: () => ({ extension: 'standard', hp: 4, maxHp: 4, kingdom: 'shu', package: 'standard', shield: 0 }),
    getGeneralDetail: () => DETAIL,
    getIllustrator: () => 'KayaK',
  } as unknown as LtkLua;
}

function draw(node: React.ReactNode, lang: Language = 'zh_CN'): string {
  const store = new RoomStore(1);
  const services: RoomServices = {
    store, lua: stub(), assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: 1, naming: makeNaming(store),
  };
  store.commit();
  return renderToStaticMarkup(
    <LanguageProvider lang={lang}>
      <RoomProvider value={services}>{node}</RoomProvider>
    </LanguageProvider>,
  );
}

describe('the 简明 / 详细 toggle', () => {
  afterEach(() => { resetSkillView(); });

  it('shows the summary and the full rules text by default', () => {
    // The default is the box as it was: nothing is taken away from a player who
    // never touches the toggle, and the summary is added above it.
    const html = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);
    expect(html).toContain(GENERAL_SUMMARIES.zhangfei.zh_CN);
    expect(html).toContain(RULES);
    expect(html).toContain('fk-detail__view');
  });

  it('drops the rules text in 简明 and keeps the summary and the skill names', () => {
    setSkillView('simple');
    const html = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);
    expect(html).not.toContain(RULES);
    expect(html).toContain(GENERAL_SUMMARIES.zhangfei.zh_CN);
    // The name survives: it is how a player recognises the skill when it fires.
    expect(html).toContain('paoxiao');
  });

  it('comes back to the rules text when switched back', () => {
    setSkillView('simple');
    expect(draw(<GeneralDetail name="zhangfei" onClose={() => {}} />)).not.toContain(RULES);
    setSkillView('full');
    expect(draw(<GeneralDetail name="zhangfei" onClose={() => {}} />)).toContain(RULES);
  });

  it('follows the language the way the rest of the box does', () => {
    // The summary is this repo's own prose rather than an engine key, so it is
    // selected by `useLanguage()` and not by `lua.tr`. Both have to move on a
    // toggle, and this is the half that is not the engine's.
    const zh = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />, 'zh_CN');
    const en = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />, 'en_US');
    expect(zh).toContain(GENERAL_SUMMARIES.zhangfei.zh_CN);
    expect(en).toContain(GENERAL_SUMMARIES.zhangfei.en_US);
    expect(en).not.toContain(GENERAL_SUMMARIES.zhangfei.zh_CN);
    // The toggle's own two words move with it.
    expect(zh).toContain('简明');
    expect(en).toContain('Simple');
  });

  it('says so, in both modes, when a general has no summary', () => {
    // A blank line where the summary should be reads as "this one does nothing"
    // — the same lie the untranslated-skill dash exists to avoid.
    for (const view of ['simple', 'full'] as const) {
      setSkillView(view);
      const html = draw(<GeneralDetail name="not_a_general" onClose={() => {}} />);
      expect(html).toContain('fk-detail__summary');
      expect(html).toContain('暂无简明介绍');
    }
  });

  it('names the skills this build ships no text for', () => {
    const html = draw(<GeneralDetail name="guansuo" onClose={() => {}} />);
    expect(html).toContain('fk-detail__gap');
    expect(html).toContain('dangxian');
    expect(html).toContain('zhiman');
    // A general with nothing missing gets no such line.
    expect(draw(<GeneralDetail name="zhangfei" onClose={() => {}} />)).not.toContain('fk-detail__gap');
  });
});
