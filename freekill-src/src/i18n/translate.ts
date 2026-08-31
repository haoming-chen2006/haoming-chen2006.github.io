/**
 * The lookup. Two tables, two functions, no state.
 *
 * `t()` answers UI-chrome keys out of `./ui.ts`; `engineTr()` answers engine
 * i18n keys, English out of `./engine`, Chinese out of the engine itself.
 *
 * Neither function reads a store. The language is always a parameter, which is
 * what makes them usable from a test, a worker, or a render pass that already
 * knows the language — see `./LanguageProvider.tsx` for the React binding.
 */
import { EN_US } from './engine';
import { UI, type UiKey } from './ui';
import { DEFAULT_LANGUAGE, type Language } from './types';

/** `{name}` -> `vars.name`. An unmatched placeholder is left alone, never
 *  rendered as "undefined": a missing variable is a bug to see, not to hide. */
export function interpolate(text: string, vars?: Readonly<Record<string, string | number>>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = vars[name];
    return v === undefined ? whole : String(v);
  });
}

/** A UI-chrome string. The key is checked at compile time. */
export function t(
  key: UiKey,
  lang: Language = DEFAULT_LANGUAGE,
  vars?: Readonly<Record<string, string | number>>,
): string {
  const entry = UI[key];
  return interpolate(entry[lang] ?? entry[DEFAULT_LANGUAGE], vars);
}

/** How `engineTr` reaches Chinese: the engine's own `Translate`. */
export type BaseTranslate = (key: string) => string;

/**
 * An engine i18n key.
 *
 * `zh_CN` is the engine's answer, unchanged — the engine loads in Chinese and
 * stays there (see `./engine/index.ts` for why). `en_US` is this layer's table,
 * and falls back to the engine only for keys the table has never seen, which
 * the coverage test makes impossible for anything the shipped packages define.
 */
export function engineTr(key: string, lang: Language, base?: BaseTranslate): string {
  if (!key) return '';
  if (lang === 'en_US') {
    const hit = EN_US[key];
    if (hit !== undefined) return hit;
  }
  return base ? base(key) : key;
}

/** Seat labels. `prompt.ts` spells these out in Chinese numerals; English counts. */
const SEAT_CHARS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

export function seatLabel(seat: number, lang: Language): string {
  if (lang === 'zh_CN') return SEAT_CHARS[seat - 1] ?? String(seat);
  return String(seat);
}

/**
 * Everything a component needs, bound to one language.
 *
 * `tr` is deliberately `(key: string) => string`, the same shape as `LtkLua.tr`,
 * so it drops into `RoomContext`'s `useTr` and into `processPrompt` unchanged.
 */
export interface Translator {
  readonly lang: Language;
  /** UI chrome. */
  t(key: UiKey, vars?: Readonly<Record<string, string | number>>): string;
  /** Engine i18n key. */
  tr(key: string): string;
  seat(seat: number): string;
}

export function createTranslator(lang: Language, base?: BaseTranslate): Translator {
  return {
    lang,
    t: (key, vars) => t(key, lang, vars),
    tr: (key) => engineTr(key, lang, base),
    seat: (seat) => seatLabel(seat, lang),
  };
}

/**
 * The one-line adoption for the room lane.
 *
 * The room reaches translation through exactly one door — `LtkLua.tr`, which is
 * `client.call('Translate', key)`. Wrapping the `LuaClient` before it is handed
 * to `RoomView` therefore translates the entire table, the log, every dialog and
 * every skill tooltip, without a single edit inside `src/room/**`.
 *
 * PASS A GETTER, NOT A LANGUAGE, FOR A LIVE ROOM. `RoomView` rebuilds its whole
 * `RoomStore` when the client's *identity* changes
 * (`const store = useMemo(() => new RoomStore(meId), [client])`), so a wrapper
 * that is recreated on every language change would wipe the table mid-game.
 * Given a getter the wrapper is created once per client and reads the language
 * at call time, so switching is free and the game state survives:
 *
 *   const wrapped = useMemo(() => withLanguage(client, getLanguage), [client]);
 *
 * Passing a literal `Language` is fine for a mount-time choice — a screenshot
 * harness, a test — and returns the client untouched for `zh_CN`.
 *
 * Every other member passes straight through, bound to the real client, so the
 * wrapper never becomes the `this` of a method that mutates instance state
 * (`FixtureLuaClient.cursor`, the engine client's handler sets).
 *
 * IT ALSO KEEPS THE VM'S OWN LANGUAGE IN STEP. A handful of prompts are not
 * key-shaped by the time they reach us: `chooseGeneralPrompt`, `poxiPrompt` and
 * friends run a Lua `prompt()` that calls `Fk:translate` and returns a finished
 * sentence (`packages/standard/aux_choose_general.lua:15`). Nothing on the JS
 * side can translate that, so the VM is told which language to render in —
 * once per change, not per call. `lua/web/client.lua` has the complete `en_US`
 * table, so switching it is safe; `Config.language` decides no rules, and the
 * authoritative host VM is a different VM entirely.
 */
export function withLanguage<C extends object>(
  client: C,
  lang: Language | (() => Language),
): C {
  if (lang === 'zh_CN') return client;
  const current = typeof lang === 'function' ? lang : () => lang;
  let vmLang: Language | null = null;
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'call') {
        return <T = unknown>(fn: string, ...args: unknown[]): T => {
          const call = Reflect.get(target, 'call', target) as
            (fn: string, ...a: unknown[]) => unknown;
          const now = current();
          if (now !== vmLang) {
            vmLang = now;
            // Older bundles have no such global; the VM answers with an error
            // object and everything else carries on in Chinese.
            try { call.call(target, 'FkWebSetLanguage', now); } catch { /* not fatal */ }
          }
          if (fn === 'Translate') {
            const key = String(args[0] ?? '');
            return engineTr(key, now, (k) => String(call.call(target, 'Translate', k))) as T;
          }
          return call.call(target, fn, ...args) as T;
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  });
}
