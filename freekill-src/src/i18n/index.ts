/**
 * The translation layer's public surface.
 *
 * Adoption is three imports at most:
 *   `useT()`            — UI chrome, `t('lobby.title')`
 *   `withLanguage()`    — wrap the room's LuaClient once; the whole table follows
 *   `<LanguageToggle/>` — the 中文 / English switch
 *   `localize()`        — text the engine already rendered, in both languages
 *
 * Everything else here is for tests and tooling.
 */
export { LANGUAGES, LANGUAGE_LABELS, DEFAULT_LANGUAGE, isLanguage } from './types';
export type { Language, TranslationTable, Provenance } from './types';

export { localize, asLocalized } from './localized';
export type { Localized } from './localized';

export { UI, UI_KEYS } from './ui';
export type { UiKey } from './ui';

export {
  EN_US, PROVENANCE, COUNTS,
  UPSTREAM_EN_US, AUTHORED_EN_US, OVERRIDE_EN_US,
} from './engine';

export {
  t, engineTr, interpolate, seatLabel, createTranslator, withLanguage,
} from './translate';
export type { Translator, BaseTranslate } from './translate';

export {
  LanguageProvider, useLanguage, useLanguageState, useT, useTranslator,
  getLanguage, setLanguage, resetLanguage,
} from './LanguageProvider';

export { LanguageToggle } from './LanguageToggle';
export type { LanguageToggleProps } from './LanguageToggle';
