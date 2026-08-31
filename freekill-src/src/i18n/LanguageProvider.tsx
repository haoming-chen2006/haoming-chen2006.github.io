/**
 * The language the app is currently in, and how it survives a reload.
 *
 * Deliberately a module-level store rather than "just useState at the top of
 * App": the shell renders under `<StrictMode>`, the room renders under its own
 * provider, and `main.tsx` paints a boot screen before either exists. One store,
 * one subscription, `useSyncExternalStore` — which is also what `src/room` uses
 * for its own state, so this is the house pattern rather than a new one.
 *
 * There is no <LanguageProvider> requirement: `useLanguage()` works anywhere,
 * including outside React (`getLanguage()` / `setLanguage()`), which is what the
 * boot screen and the lobby API's thrown errors need. A provider is exported
 * anyway for tests that want to pin a language without touching localStorage.
 */
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createTranslator, t, type BaseTranslate, type Translator } from './translate';
import { DEFAULT_LANGUAGE, LANGUAGE_LABELS, isLanguage, type Language } from './types';
import type { UiKey } from './ui';

const STORAGE_KEY = 'fk.lang';

/** The harness already writes `fk.lang`; reusing it means the two agree. */
function readStored(): Language {
  try {
    const url = new URLSearchParams(globalThis.location?.search ?? '').get('lang');
    if (isLanguage(url)) return url;
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* private mode, or no DOM at all (node tests) */
  }
  return DEFAULT_LANGUAGE;
}

let current: Language = readStored();
const listeners = new Set<() => void>();

function applyDocumentLang(lang: Language): void {
  try {
    globalThis.document?.documentElement?.setAttribute('lang', LANGUAGE_LABELS[lang].htmlLang);
  } catch { /* no DOM */ }
}
applyDocumentLang(current);

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  if (lang === current) return;
  current = lang;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  applyDocumentLang(lang);
  for (const l of [...listeners]) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** For tests: drop back to the default and forget the stored choice. */
export function resetLanguage(): void {
  try { globalThis.localStorage?.removeItem(STORAGE_KEY); } catch { /* private mode */ }
  setLanguage(DEFAULT_LANGUAGE);
}

/** An override for a subtree; `undefined` means "use the global store". */
const Pinned = createContext<Language | undefined>(undefined);

/** Optional. Pins a language for a subtree — used by tests and screenshots. */
export function LanguageProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  return <Pinned.Provider value={lang}>{children}</Pinned.Provider>;
}

/** The current language, re-rendering the caller when it changes. */
export function useLanguage(): Language {
  const pinned = useContext(Pinned);
  const live = useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE);
  return pinned ?? live;
}

/** `[language, setLanguage]`, for the toggle and anything else that switches. */
export function useLanguageState(): [Language, (lang: Language) => void] {
  return [useLanguage(), setLanguage];
}

/**
 * The UI-chrome translator. The common case:
 *
 *   const t = useT();
 *   <button>{t('waiting.start')}</button>
 *   <p>{t('waiting.seated', { seated, capacity })}</p>
 */
export function useT(): (key: UiKey, vars?: Readonly<Record<string, string | number>>) => string {
  const lang = useLanguage();
  return useCallback((key, vars) => t(key, lang, vars), [lang]);
}

/**
 * The full translator, bound to the current language and (optionally) to the
 * engine's own `Translate` for the Chinese side.
 */
export function useTranslator(base?: BaseTranslate): Translator {
  const lang = useLanguage();
  return useMemo(() => createTranslator(lang, base), [lang, base]);
}
