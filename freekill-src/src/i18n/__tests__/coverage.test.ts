/**
 * Coverage. An untranslated string must fail the build, not reach a player.
 *
 * The engine's `translate` returns the key unchanged when it misses, so a gap is
 * invisible in code review and shows up in the game as `#luoshen_1_trig` on a
 * skill badge. This file closes that: every key the shipped packages define has
 * to resolve in both languages, in English out of `../engine`, and the per-
 * category counts are asserted with real numbers so that adding a package
 * without translating it fails here rather than in front of a player.
 *
 * The key universe is the engine's own dump (`src/room/dev/data/lua-data.json`),
 * which `src/room/__tests__/i18n.test.ts` already treats as the source of truth.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import raw from '../../room/dev/data/lua-data.json';
import { AUTHORED_EN_US, EN_US, OVERRIDE_EN_US, PROVENANCE, UPSTREAM_EN_US } from '../engine';
import { UI, UI_KEYS } from '../ui';
import { LANGUAGES, type Language } from '../types';
import { engineTr, interpolate, seatLabel, t, withLanguage } from '../translate';
import { localize } from '../localized';

const HERE = dirname(fileURLToPath(import.meta.url));

interface RawGeneral { kingdom: string; hidden?: boolean; skills: { name: string }[] }
const data = raw as unknown as {
  cards: { name: string; suit: string; type: number; subtype: string }[];
  generals: Record<string, RawGeneral>;
  skills: Record<string, unknown>;
  translations: Record<Language, Record<string, string>>;
};

const zh = data.translations.zh_CN;
const zhKeys = Object.keys(zh);

/** CJK ideographs and kana. Full-width punctuation (：，) is left alone: several
 *  upstream English log lines use it and that is upstream's business. */
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;

const CARDS = [...new Set(data.cards.map((c) => c.name))];
/** The playable roster: `hidden` generals are debug fixtures, `anjiang` is the
 *  face-down placeholder, and neither is ever offered to a player. */
const GENERALS = Object.entries(data.generals)
  .filter(([name, g]) => !g.hidden && name !== 'anjiang')
  .map(([name]) => name);
const GENERAL_SKILLS = [...new Set(
  GENERALS.flatMap((n) => data.generals[n].skills.map((s) => s.name)),
)];

/* ------------------------------------------------------------------ totals */

describe('engine key coverage', () => {
  it('resolves every key the packages define, in both languages', () => {
    // "Resolves" means the English was written down, not that it happens to
    // differ from the key: `OK` and `Menu` are their own translation, and the
    // engine's return-the-key fallback is indistinguishable from a real answer.
    // So the assertion is membership in the table, which fallback can never fake.
    const missing = zhKeys.filter((k) => !(k in EN_US));
    expect(missing, `keys with no English: ${missing.slice(0, 20).join(', ')}`).toEqual([]);
    for (const k of zhKeys) expect(typeof EN_US[k], k).toBe('string');
  });

  it('covers all 1,368 keys with 681 upstream + 691 authored', () => {
    expect(zhKeys).toHaveLength(1368);
    expect(Object.keys(UPSTREAM_EN_US)).toHaveLength(681);
    expect(Object.keys(AUTHORED_EN_US)).toHaveLength(691);
    expect(Object.keys(EN_US).length).toBeGreaterThanOrEqual(1368);
  });

  it('keeps the authored and upstream key sets disjoint', () => {
    const overlap = Object.keys(AUTHORED_EN_US).filter((k) => k in UPSTREAM_EN_US);
    expect(overlap, 'authored a key upstream already covers').toEqual([]);
  });

  it('only overrides keys upstream actually ships', () => {
    const orphan = Object.keys(OVERRIDE_EN_US).filter((k) => !(k in UPSTREAM_EN_US));
    expect(orphan, 'override with nothing to override').toEqual([]);
  });

  it('leaves no Chinese in the English table', () => {
    const chinese = Object.keys(EN_US).filter((k) => CJK.test(EN_US[k]));
    expect(chinese, `English entries still in Chinese: ${chinese.join(', ')}`).toEqual([]);
  });

  it('keeps every log placeholder the Chinese template has', () => {
    const PLACEHOLDER = /%(?:from|to|src|dest|card|arg\d?|s|\d)/g;
    const broken: string[] = [];
    for (const k of Object.keys(AUTHORED_EN_US)) {
      const want = [...(zh[k] ?? '').matchAll(PLACEHOLDER)].map((m) => m[0]).sort().join(',');
      const got = [...AUTHORED_EN_US[k].matchAll(PLACEHOLDER)].map((m) => m[0]).sort().join(',');
      if (want !== got) broken.push(`${k}: zh[${want}] en[${got}]`);
    }
    expect(broken).toEqual([]);
  });
});

/* --------------------------------------------------------------- the cards */

describe('cards', () => {
  it('names and describes all 43', () => {
    expect(CARDS).toHaveLength(43);
    for (const name of CARDS) {
      expect(engineTr(name, 'en_US'), name).not.toBe(name);
      expect(engineTr(`:${name}`, 'en_US'), `:${name}`).not.toBe(`:${name}`);
    }
  });

  it('names every suit, type and subtype the deck uses', () => {
    for (const suit of new Set(data.cards.map((c) => c.suit))) {
      expect(engineTr(suit, 'en_US'), suit).not.toBe(suit);
    }
    for (const key of ['basic', 'trick', 'equip', 'weapon', 'armor', 'treasure',
      'delayed_trick', 'defensive_ride', 'offensive_ride']) {
      expect(engineTr(key, 'en_US'), key).not.toBe(key);
    }
  });
});

/* ------------------------------------------------------------ the generals */

describe('generals', () => {
  it('names, subtitles and credits all 25', () => {
    expect(GENERALS).toHaveLength(25);
    for (const g of GENERALS) {
      expect(engineTr(g, 'en_US'), g).not.toBe(g);
      expect(engineTr(`#${g}`, 'en_US'), `#${g}`).not.toBe(`#${g}`);
      expect(engineTr(`illustrator:${g}`, 'en_US'), `illustrator:${g}`).toBe('KayaK');
      expect(engineTr(`~${g}`, 'en_US'), `~${g}`).not.toBe(`~${g}`);
    }
  });

  it('names every kingdom a general belongs to', () => {
    for (const k of new Set(Object.values(data.generals).map((g) => g.kingdom))) {
      if (k === 'unknown') continue; // anjiang's placeholder kingdom
      expect(engineTr(k, 'en_US'), k).not.toBe(k);
    }
    expect(engineTr('wei', 'en_US')).toBe('Wei');
  });
});

/* -------------------------------------------------------------- the skills */

describe('skills', () => {
  it('names and fully describes every skill a character carries', () => {
    expect(GENERAL_SKILLS).toHaveLength(40);
    for (const s of GENERAL_SKILLS) {
      expect(engineTr(s, 'en_US'), s).not.toBe(s);
      const desc = engineTr(`:${s}`, 'en_US');
      expect(desc, `:${s}`).not.toBe(`:${s}`);
      expect(desc.length, `:${s} is suspiciously short`).toBeGreaterThan(4);
    }
  });

  it('translates every derived trigger badge', () => {
    const badges = zhKeys.filter((k) => /^#{1,2}[a-z_&]+_\d+_[a-z]+$/.test(k));
    expect(badges.length).toBeGreaterThanOrEqual(100);
    for (const k of badges) expect(engineTr(k, 'en_US'), k).not.toBe(k);
  });

  it('has an English name for every skill in the engine', () => {
    for (const s of Object.keys(data.skills)) {
      if (!(s in zh)) continue; // internal skills the packages never name
      expect(engineTr(s, 'en_US'), s).not.toBe(s);
    }
  });
});

/* ---------------------------------------------------- modes, roles, phases */

describe('modes, roles and phases', () => {
  it('translates the role mode and its full rules text', () => {
    expect(engineTr('aaa_role_mode', 'en_US')).toBe('Role mode');
    const rules = engineTr(':aaa_role_mode', 'en_US');
    expect(rules).toContain('# Introduction to Role Mode');
    expect(rules).not.toContain('There should be some text');
    expect(rules.length).toBeGreaterThan(2000);
  });

  it('names every role, including the grouped labels', () => {
    for (const r of ['lord', 'loyalist', 'rebel', 'renegade', 'renegade', 'civilian',
      'rebel_chief', 'unknown', 'lord+loyalist+civilian', 'rebel+rebel_chief',
      'rebel+rebel_chief+civilian', 'renegade+civilian']) {
      expect(engineTr(r, 'en_US'), r).not.toBe(r);
    }
    expect(engineTr('lord', 'en_US')).toBe('Lord');
    expect(engineTr('renegade', 'en_US')).toBe('Renegade');
  });

  it('names every phase and timing window', () => {
    for (const p of zhKeys.filter((k) => k.startsWith('phase_'))) {
      expect(engineTr(p, 'en_US'), p).not.toBe(p);
    }
    expect(engineTr('phase_play', 'en_US')).toBe('Action phase');
    expect(engineTr('phase_judge', 'en_US')).toBe('Judge phase');
  });

  it('names the move reasons the log substitutes', () => {
    const reasons = zhKeys.filter((k) => k.startsWith('reason_'));
    expect(reasons.length).toBeGreaterThanOrEqual(13);
    for (const r of reasons) expect(engineTr(r, 'en_US'), r).not.toBe(r);
  });
});

/* ------------------------------------------------------------- the game log */

describe('game log', () => {
  it('translates every templated log line', () => {
    const templates = zhKeys.filter((k) => /^[#$]/.test(k) && /%(from|to|src|dest|arg|card|s|\d)/.test(zh[k]));
    expect(templates.length).toBeGreaterThanOrEqual(80);
    for (const k of templates) expect(engineTr(k, 'en_US'), k).not.toBe(k);
  });

  it('translates every voice-line subtitle', () => {
    const voice = zhKeys.filter((k) => /^\$[a-z]/.test(k));
    expect(voice.length).toBeGreaterThanOrEqual(120);
    for (const k of voice) {
      expect(engineTr(k, 'en_US'), k).not.toBe(k);
      expect(CJK.test(engineTr(k, 'en_US')), k).toBe(false);
    }
  });
});

/* ------------------------------------------------------------- the UI chrome */

describe('UI chrome dictionary', () => {
  it('has both languages for every key', () => {
    for (const key of UI_KEYS) {
      for (const lang of LANGUAGES) {
        const v = UI[key][lang];
        expect(typeof v, `${key}.${lang}`).toBe('string');
        expect(v.length, `${key}.${lang} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('leaves no Chinese in the English column', () => {
    const chinese = UI_KEYS.filter((k) => CJK.test(UI[k].en_US));
    expect(chinese).toEqual([]);
  });

  it('keeps the same placeholders in both languages', () => {
    const broken: string[] = [];
    for (const key of UI_KEYS) {
      const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
      if (ph(UI[key].zh_CN) !== ph(UI[key].en_US)) broken.push(key);
    }
    expect(broken).toEqual([]);
  });

  it('covers the hardcoded Chinese the shell ships', () => {
    // A floor, not a ceiling: the audit found 101 Chinese-bearing lines in
    // src/shell. Dropping below this means a string lost its dictionary entry.
    expect(UI_KEYS.length).toBeGreaterThanOrEqual(120);
  });
});

/* ------------------------------------------------------------- the plumbing */

describe('lookup', () => {
  it('falls back to the engine, then to the key', () => {
    expect(engineTr('no_such_key_at_all', 'en_US')).toBe('no_such_key_at_all');
    expect(engineTr('no_such_key_at_all', 'en_US', () => '中文兜底')).toBe('中文兜底');
    expect(engineTr('slash', 'zh_CN', (k) => zh[k] ?? k)).toBe('杀');
    expect(engineTr('', 'en_US')).toBe('');
  });

  it('interpolates, and leaves an unmatched placeholder visible', () => {
    expect(interpolate('{a}/{b}', { a: 1, b: 2 })).toBe('1/2');
    expect(interpolate('{a}/{b}', { a: 1 })).toBe('1/{b}');
  });

  it('translates UI keys in both languages', () => {
    expect(t('waiting.start', 'zh_CN')).toBe('开始游戏');
    expect(t('waiting.start', 'en_US')).toBe('Start game');
    expect(t('waiting.seated', 'en_US', { seated: 3, capacity: 8 })).toBe('3/8 seated');
  });

  it('spells seats out in Chinese and counts them in English', () => {
    expect(seatLabel(1, 'zh_CN')).toBe('一');
    expect(seatLabel(1, 'en_US')).toBe('1');
    expect(seatLabel(99, 'en_US')).toBe('99');
  });

  it('wraps a LuaClient without disturbing anything else', () => {
    class Fake {
      cursor = 0;
      seen: string[] = [];
      call<T>(fn: string, ...args: unknown[]): T {
        this.seen.push(fn);
        if (fn === 'Translate') return (zh[String(args[0])] ?? String(args[0])) as T;
        this.cursor += 1;
        return fn as T;
      }
    }
    const real = new Fake();
    expect(withLanguage(real, 'zh_CN')).toBe(real);

    const en = withLanguage(real, 'en_US');
    expect(en.call('Translate', 'slash')).toBe('Slash');
    expect(en.call('Translate', '#caocao')).toBe('Martial Emperor of Wei');
    expect(en.call('Translate', 'totally_unknown')).toBe('totally_unknown');
    expect(en.call('GetCardData', 1)).toBe('GetCardData');

    // The VM is told the language once, on the first call, not on every one:
    // a few prompts are rendered inside Lua and cannot be translated by key.
    expect(real.seen.filter((f) => f === 'FkWebSetLanguage')).toHaveLength(1);
    expect(real.seen[0]).toBe('FkWebSetLanguage');
    // Mutations landed on the real client, not on the wrapper: one forwarded
    // `GetCardData` plus the one language sync.
    expect(real.cursor).toBe(2);
  });

  it('keeps one stable wrapper when given a language getter', () => {
    class Fake {
      call<T>(fn: string, ...args: unknown[]): T {
        return (zh[String(args[0])] ?? String(args[0])) as T;
      }
    }
    let lang: Language = 'zh_CN';
    const live = withLanguage(new Fake(), () => lang);
    expect(live.call('Translate', 'slash')).toBe('杀');
    lang = 'en_US';
    // Same object, different answer: RoomView's `useMemo(..., [client])` store
    // is not rebuilt, so switching language mid-game keeps the table.
    expect(live.call('Translate', 'slash')).toBe('Slash');
  });

  /**
   * A VM that will not take the language is survivable and must be audible.
   *
   * This is the shape the live bug wore: the first call after a toggle reached
   * a Lua VM whose wasm heap had just been freed, wasmoon threw `memory access
   * out of bounds`, and an empty `catch` ate it — the table went blank and the
   * page reported no exception at all. Translation must carry on, and the
   * fault must reach both the log and the page's uncaught-error channel.
   */
  it('says so out loud when the VM refuses the language, and keeps translating', () => {
    class Broken {
      call<T>(fn: string, ...args: unknown[]): T {
        if (fn === 'FkWebSetLanguage') throw new Error('memory access out of bounds');
        return (zh[String(args[0])] ?? String(args[0])) as T;
      }
    }
    const logged: unknown[][] = [];
    const reported: unknown[] = [];
    const console_ = console.error;
    const report_ = (globalThis as { reportError?: unknown }).reportError;
    console.error = (...a: unknown[]) => { logged.push(a); };
    (globalThis as { reportError?: unknown }).reportError = (e: unknown) => { reported.push(e); };
    try {
      const en = withLanguage(new Broken(), 'en_US');
      // The table survives: the JS-side table still answers by key, and the
      // engine is still reachable for everything else.
      expect(en.call('Translate', 'slash')).toBe('Slash');
      expect(en.call('Translate', 'totally_unknown')).toBe('totally_unknown');
      // Once, not once per call — a table makes thousands of these.
      expect(en.call('Translate', 'slash')).toBe('Slash');
      expect(logged).toHaveLength(1);
      expect(String(logged[0][0])).toContain('en_US');
      expect(reported).toHaveLength(1);
      expect((reported[0] as Error).message).toContain('memory access out of bounds');
    } finally {
      console.error = console_;
      (globalThis as { reportError?: unknown }).reportError = report_;
    }
  });

  /** An older bundle with no such global is not a fault; it is a warning. */
  it('only warns when the build simply has no FkWebSetLanguage', () => {
    class Old {
      call<T>(fn: string, ...args: unknown[]): T {
        if (fn === 'FkWebSetLanguage') {
          throw new Error('Lua.call(FkWebSetLanguage): no such lua function: FkWebSetLanguage');
        }
        return (zh[String(args[0])] ?? String(args[0])) as T;
      }
    }
    const errors: unknown[][] = [];
    const warnings: unknown[][] = [];
    const reported: unknown[] = [];
    const error_ = console.error;
    const warn_ = console.warn;
    const report_ = (globalThis as { reportError?: unknown }).reportError;
    console.error = (...a: unknown[]) => { errors.push(a); };
    console.warn = (...a: unknown[]) => { warnings.push(a); };
    (globalThis as { reportError?: unknown }).reportError = (e: unknown) => { reported.push(e); };
    try {
      expect(withLanguage(new Old(), 'en_US').call('Translate', 'slash')).toBe('Slash');
      expect(warnings).toHaveLength(1);
      expect(errors).toHaveLength(0);
      expect(reported).toHaveLength(0);
    } finally {
      console.error = error_;
      console.warn = warn_;
      (globalThis as { reportError?: unknown }).reportError = report_;
    }
  });
});

/* ------------------------------------------------- no new hardcoded Chinese */

describe('the shell has no Chinese left in its source', () => {
  /**
   * Files that still write Chinese directly and have not adopted the dictionary
   * yet. Every one of them has its keys waiting in `../ui.ts`; this list is the
   * hand-off, and it may only ever shrink.
   *
   * The assertion below is a subset check on purpose. Adopting a file passes.
   * Adding a Chinese string to a file that has already adopted fails, which is
   * the point. Touching a file still on this list does not fail, because it is
   * someone else's lane while they are mid-change.
   */
  const PENDING = new Set<string>([
    // Empty, and it stays that way: the four files that were here adopted the
    // dictionary once the host lane settled, so a Chinese string reappearing
    // anywhere in the shell is now a failure rather than a note.
  ]);

  const SRC = join(HERE, '..', '..');
  const CJK_LITERAL = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

  /** Crude, and deliberately biased towards missing a violation rather than
   *  inventing one: comments are where the Chinese explanations live. */
  function stripComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => {
        const i = line.indexOf('//');
        if (i < 0) return line;
        const before = line.slice(0, i);
        // A `//` after a quote is probably inside a string (a URL).
        return /['"`]/.test(before) ? line : before;
      })
      .join('\n');
  }

  function sources(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === '__tests__' || name === 'dev' || name === 'i18n' || name === 'contract') continue;
        sources(p, out);
      } else if (/\.tsx?$/.test(name)) out.push(p);
    }
    return out;
  }

  it('only leaves Chinese in the files still waiting to adopt the dictionary', () => {
    const offenders = sources(SRC)
      .filter((f) => CJK_LITERAL.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => f.slice(SRC.length + 1))
      .filter((f) => !PENDING.has(f));
    expect(
      offenders,
      `hardcoded Chinese with no dictionary entry: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});

/* --------------------------------------------------------- the battle log */

describe('the game log keeps both renderings', () => {
  it('stores a two-language line and picks one at render time', async () => {
    const { RoomStore } = await import('../../room/state/store');
    const store = new RoomStore(1);
    store.applyNotify('GameLog', {
      zh_CN: '曹操 摸了 2 张牌',
      en_US: 'Cao Cao drew 2 cards',
    });
    store.commit();
    const [line] = store.state.log;
    expect(localize(line.html, 'zh_CN')).toBe('曹操 摸了 2 张牌');
    expect(localize(line.html, 'en_US')).toBe('Cao Cao drew 2 cards');
  });

  it('accepts a client that only sends one string, and says so honestly', async () => {
    const { RoomStore } = await import('../../room/state/store');
    const store = new RoomStore(1);
    store.applyNotify('GameLog', '== 游戏开始 ==');
    store.commit();
    // A recording made before the two-language log has nothing else to offer;
    // reporting the Chinese in both beats rendering an empty line.
    expect(localize(store.state.log[0].html, 'en_US')).toBe('== 游戏开始 ==');
  });

  it('localises card footnotes the same way', async () => {
    const { RoomStore } = await import('../../room/state/store');
    const store = new RoomStore(1);
    store.applyNotify('SetCardFootnote', [7, { zh_CN: '弃置', en_US: 'discard' }, false]);
    store.commit();
    expect(localize(store.state.cards[7]?.footnote, 'en_US')).toBe('discard');
    expect(localize(store.state.cards[7]?.footnote, 'zh_CN')).toBe('弃置');
  });
});

/* ------------------------------------------------- the copy pushed into Lua */

describe('the Lua side of the same table', () => {
  const lua = readFileSync(join(HERE, '..', '..', '..', 'lua', 'web', 'i18n_en_US.lua'), 'utf8');

  /** Reads the committed table back the way Lua would, escapes and all. */
  function parseLuaTable(src: string): Record<string, string> {
    const unescape = (s: string) => s
      .replace(/\\(\d{1,3}|.)/g, (_, esc: string) => {
        if (esc === 'n') return '\n';
        if (esc === 'r') return '\r';
        if (/^\d+$/.test(esc)) return String.fromCharCode(Number(esc));
        return esc;
      });
    const out: Record<string, string> = {};
    const ROW = /^ {2}\["((?:[^"\\]|\\.)*)"\] = "((?:[^"\\]|\\.)*)",$/gm;
    for (const m of src.matchAll(ROW)) out[unescape(m[1])] = unescape(m[2]);
    return out;
  }

  it('is in sync with src/i18n/engine', () => {
    // The battle log is rendered inside the client VM by `Client:parseMsg`, so
    // that VM needs the same English this module holds. Reading the file back
    // rather than re-running the generator checks the escaping too: a stale or
    // mis-quoted copy would show English everywhere except the log.
    expect(
      parseLuaTable(lua),
      'lua/web/i18n_en_US.lua is stale — regenerate it with `node scripts/build-i18n-lua.mjs`',
    ).toEqual({ ...EN_US });
  });

  it('carries the keys upstream never gave en_US', () => {
    // A derived skill badge and a card-effect label: neither exists in the
    // engine's own en_US table, and both appear in log lines.
    expect(lua).toContain('["#luoshen_1_trig"] = "Goddess Luo"');
    expect(lua).toContain('["#GameEventDamage"]');
    expect(lua).toContain('["reason_prey"]');
  });
});

/* -------------------------------------------------------------- provenance */

describe('provenance', () => {
  const record = JSON.parse(readFileSync(join(HERE, '..', 'provenance.json'), 'utf8')) as {
    counts: { upstream: number; authored: number; override: number; total: number };
    authored: string[];
    override: string[];
  };

  it('records who wrote every English string', () => {
    expect(Object.keys(PROVENANCE)).toHaveLength(Object.keys(EN_US).length);
    expect(PROVENANCE.slash).toBe('upstream');
    expect(PROVENANCE['#caocao']).toBe('authored');
    expect(PROVENANCE[':aaa_role_mode']).toBe('override');
  });

  it('matches the committed provenance.json', () => {
    expect(record.authored.slice().sort()).toEqual(Object.keys(AUTHORED_EN_US).sort());
    expect(record.override.slice().sort()).toEqual(Object.keys(OVERRIDE_EN_US).sort());
    expect(record.counts.authored).toBe(Object.keys(AUTHORED_EN_US).length);
    expect(record.counts.override).toBe(Object.keys(OVERRIDE_EN_US).length);
    expect(record.counts.total).toBe(Object.keys(EN_US).length);
  });
});
