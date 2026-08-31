/**
 * Text the engine renders for us, in every language at once.
 *
 * Most of the game is translated by key: the room asks `LtkLua.tr('slash')` and
 * the overlay answers. Three things are not, because the *engine* renders them
 * into finished markup before the room ever sees them — the battle log, the
 * toasts, and card footnotes. `Client:parseMsg` (lua/lunarltk/client/client.lua)
 * walks a `LogMessage`, translates its type key, its player names, its card
 * names and its arguments, and hands back one HTML string. There is no key left
 * to look up afterwards.
 *
 * Rather than re-implement `parseMsg` in TypeScript — which would be a second
 * source of truth for card names, virtual cards, suit colours and seat
 * disambiguation, exactly the thing this codebase refuses to have — the web
 * client VM renders each message once per language and sends both
 * (`lua/web/client.lua`). The room keeps both and picks at render time, so
 * scrollback retranslates on a toggle instead of freezing in the language it
 * happened to arrive in.
 *
 * A bare string still normalises cleanly: recorded fixtures predate this and
 * carry one pre-rendered Chinese string, which is honestly reported as the same
 * text in both languages rather than silently blanked.
 */
import { LANGUAGES, type Language } from './types';

export type Localized = Readonly<Record<Language, string>>;

/** What the viewer should read. Falls back through zh_CN, then to nothing.
 *  Tolerates null as well as undefined: this is a render path, and a missing
 *  footnote should draw nothing rather than throw the table away. */
export function localize(value: Localized | string | null | undefined, lang: Language): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.zh_CN ?? '';
}

/**
 * Normalises whatever arrived on the wire. `lua/web/client.lua` sends a map;
 * a plain string (older recordings, a client VM without the overlay) becomes
 * the same text in every language.
 */
export function asLocalized(value: unknown): Localized {
  if (typeof value === 'string') {
    return Object.fromEntries(LANGUAGES.map((l) => [l, value])) as Localized;
  }
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>;
    const zh = typeof src.zh_CN === 'string' ? src.zh_CN : '';
    return Object.fromEntries(
      LANGUAGES.map((l) => [l, typeof src[l] === 'string' ? (src[l] as string) : zh]),
    ) as Localized;
  }
  return Object.fromEntries(LANGUAGES.map((l) => [l, String(value ?? '')])) as Localized;
}
