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
 *
 * THE RETURNED FUNCTION HAS A STABLE IDENTITY, AND THAT IS THE POINT. It reads
 * the language when it is *called*, not when it is created — the same rule
 * `withLanguage` follows for the room's `LuaClient`, and for the same reason.
 *
 * A `t` whose identity moved on every toggle was a live bug, not a theoretical
 * one. `useT` subscribes to the language, so the component re-renders on a
 * switch either way; the only thing a fresh identity ever did was invalidate
 * whatever hook listed `t` as a dependency. `RoomPage` listed it on the two
 * effects that own the player's Lua VM and the live table, so toggling to
 * English mid-game tore down the VM (`vm.close()` frees the wasm heap), booted
 * a replacement that had never seen the game, and re-dealt: photos, hand, log
 * and draw pile all to zero behind the dealing curtain, while the still-running
 * table kept feeding the freed VM and wasmoon answered `memory access out of
 * bounds`. Nothing about a language belongs in a VM's lifecycle, and with a
 * stable `t` nothing about a language can reach one.
 *
 * The corollary for callers: `t` is no longer a signal that the language moved.
 * A `useMemo` that *caches translated output* must depend on `useLanguage()`,
 * not on `t`. Nothing in the tree does that today — every `t` in a dependency
 * array is called inside the hook, never baked into a memoized string.
 *
 * `Pinned` is read directly rather than through `useLanguage()` so that the
 * identity depends only on the test-only pin, which is `undefined` in the app
 * and therefore constant for the life of the component.
 */
export function useT(): (key: UiKey, vars?: Readonly<Record<string, string | number>>) => string {
  const pinned = useContext(Pinned);
  useLanguage();
  return useCallback((key, vars) => t(key, pinned ?? getLanguage(), vars), [pinned]);
}

/**
 * The full translator, bound to the current language and (optionally) to the
 * engine's own `Translate` for the Chinese side.
 */
export function useTranslator(base?: BaseTranslate): Translator {
  const lang = useLanguage();
  return useMemo(() => createTranslator(lang, base), [lang, base]);
}
