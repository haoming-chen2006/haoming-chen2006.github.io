/**
 * Which artwork this browser has pinned, for whom.
 *
 * `policy.ts` answers "how much third-party artwork do you want"; this answers
 * "and which one". They are kept apart because they are different decisions with
 * different costs -- the mode is a privacy and bandwidth answer, a pin is a
 * taste answer -- and because the mode has to keep working when there is nothing
 * pinned at all, which is the overwhelmingly common case.
 *
 * ── IT IS A VIEWER PREFERENCE, NOT GAME STATE ────────────────────────────────
 *
 * Nothing here reaches the engine, the store, or the wire, and that is the whole
 * design constraint rather than an implementation detail. A pin changes what one
 * browser draws over a portrait it was already drawing; the seat's general, its
 * hp, its hand and every rule that touches them are untouched, and the other
 * seven seats never learn that anything happened. `skins.test.ts` asserts that
 * no file under `src/room/skins/` so much as mentions the client, because the
 * cheapest way for this to become a bug is for someone to make it "shared".
 *
 * ── KEYED BY GENERAL, NOT BY SEAT ────────────────────────────────────────────
 *
 * A seat is a slot that changes general (国战 alone does it mid-game); a general
 * is the thing the artwork is *of*. Keying by general means a choice survives a
 * new game, a reconnect and a reseat, and it means picking 甄姬's 洛水神韵 once
 * is picking it for 甄姬 -- including on the rare table where somebody else is
 * playing her, which is the reading a player expects from "this is what she
 * looks like to me".
 *
 * Storage discipline is `policy.ts`'s: every access wrapped, because
 * `localStorage` throws rather than returning null in a sandboxed frame and in
 * Safari's private mode, and a cosmetic preference must never take the room down
 * with it. A corrupt blob is dropped rather than repaired.
 *
 * The hook lives here rather than in a file of its own because it is the same
 * seven-line idea as the storage it reads -- and it needs the same two events
 * `useSkinMode` needs, for the same two reasons: `storage` for another tab, and
 * a same-document event because `storage` deliberately does not fire in the tab
 * that made the change.
 */
import { useCallback, useEffect, useState } from 'react';

export const SKIN_CHOICE_KEY = 'fk.skins.choice';
export const SKIN_CHOICE_EVENT = 'fk:skinchoice';

/** general id -> the URL that general should wear. */
export type SkinChoices = Readonly<Record<string, string>>;

const NONE: SkinChoices = {};

/**
 * The last blob parsed, and what it parsed to.
 *
 * Not a performance micro-optimisation: `Photo` is memoised on props and there
 * are eight of it, so a hook that hands back a fresh object every time it is
 * asked would defeat that memo on every render of the table -- which happens
 * five times a second whether or not the game moved. Returning the same object
 * for the same bytes keeps every seat bailing out of reconciliation until a pin
 * actually changes. The empty case, which is almost every player, never
 * allocates at all.
 */
let cachedRaw: string | null = null;
let cachedChoices: SkinChoices = NONE;

export function readSkinChoices(): SkinChoices {
  let raw: string | null = null;
  try {
    raw = globalThis.localStorage?.getItem(SKIN_CHOICE_KEY) ?? null;
  } catch {
    // A store that throws is a store that will also never fire a `storage`
    // event, so this document's own copy is the whole truth -- and returning it
    // is what keeps a pin working in a sandboxed frame for the page's lifetime
    // instead of applying in the picker and nowhere else.
    return cachedChoices;
  }
  if (raw === cachedRaw) return cachedChoices;
  cachedRaw = raw;
  cachedChoices = raw ? parse(raw) : NONE;
  return cachedChoices;
}

function parse(raw: string): SkinChoices {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NONE;
    const out: Record<string, string> = {};
    for (const [general, url] of Object.entries(parsed as Record<string, unknown>)) {
      // A pin is only ever a string. Anything else is a blob from a future
      // version or a corrupted one, and neither is worth guessing at.
      if (typeof url === 'string' && url) out[general] = url;
    }
    return out;
  } catch {
    return NONE;
  }
}

/**
 * Pin `url` for `general`, or clear it with `undefined`.
 *
 * Clearing is not the same as pinning the pack's first entry: it means "whatever
 * the catalogue and my mode say", so a later mode change or a dead host moves
 * the seat on rather than stranding it on a URL that no longer resolves.
 */
export function writeSkinChoice(general: string, url: string | undefined): SkinChoices {
  const next: Record<string, string> = { ...readSkinChoices() };
  if (url) next[general] = url;
  else delete next[general];
  const json = JSON.stringify(next);
  try { globalThis.localStorage?.setItem(SKIN_CHOICE_KEY, json); } catch { /* blocked */ }
  // Write through to the cache above rather than letting the next read re-parse
  // its way to an equal-but-different object: every hook in the document has to
  // settle on ONE object or `Photo`'s memo misses on all eight seats.
  cachedRaw = json;
  cachedChoices = next;
  return next;
}

/** Test seam, and the way out for a player whose pins have gone stale. */
export function clearSkinChoices(): void {
  cachedRaw = null;
  cachedChoices = NONE;
  try { globalThis.localStorage?.removeItem(SKIN_CHOICE_KEY); } catch { /* blocked */ }
}

export function useSkinChoices(): [SkinChoices, (general: string, url: string | undefined) => void] {
  const [choices, setChoices] = useState<SkinChoices>(readSkinChoices);

  useEffect(() => {
    const sync = () => setChoices(readSkinChoices());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SKIN_CHOICE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SKIN_CHOICE_EVENT, sync);
    // A tab restored from the bfcache can have missed a `storage` event entirely.
    sync();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SKIN_CHOICE_EVENT, sync);
    };
  }, []);

  const choose = useCallback((general: string, url: string | undefined) => {
    setChoices(writeSkinChoice(general, url));
    window.dispatchEvent(new Event(SKIN_CHOICE_EVENT));
  }, []);

  return [choices, choose];
}
