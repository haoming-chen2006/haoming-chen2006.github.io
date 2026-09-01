/**
 * The vocabulary the translation layer is built out of.
 *
 * `Language` is deliberately the same union the room already uses
 * (`src/room/fixture/luaData.ts`): this layer extends that plumbing, it does not
 * introduce a second notion of what a language is.
 */

export const LANGUAGES = ['zh_CN', 'en_US'] as const;
export type Language = (typeof LANGUAGES)[number];

/** What the toggle shows, and what `<html lang>` is set to. */
export const LANGUAGE_LABELS: Readonly<Record<Language, { native: string; htmlLang: string }>> = {
  zh_CN: { native: '中文', htmlLang: 'zh-CN' },
  en_US: { native: 'English', htmlLang: 'en-US' },
};

export const DEFAULT_LANGUAGE: Language = 'zh_CN';

export function isLanguage(v: unknown): v is Language {
  return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v);
}

/** An engine i18n table: key -> rendered string. Keys are the engine's own. */
export type TranslationTable = Readonly<Record<string, string>>;

/**
 * Where a given English string came from. A native speaker reviewing this work
 * needs to read the `authored`, `override` and `mobile` sets; `upstream` is the
 * engine's own text and is not ours to second-guess.
 *
 * `mobile` is kept apart from `authored` rather than folded into it because it
 * is a different review job: `authored` is the missing half of a table upstream
 * half-translated, and its size is asserted key-for-key against that table,
 * while `mobile` is a 249-character pack upstream never translated at all.
 */
export type Provenance = 'upstream' | 'authored' | 'override' | 'mobile';
