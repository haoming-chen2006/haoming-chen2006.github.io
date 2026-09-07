/**
 * Designed heroes: where they live in a browser, and how they reach a room.
 *
 * ── WHY TWO SHAPES ───────────────────────────────────────────────────────────
 *
 * `SavedHero` is what the designer keeps for its author: the spec (so the
 * blocks can be re-opened), the compiled Lua, the engine's verdict, a small
 * portrait. It lives in this browser's `localStorage` under `fk.designer.heroes`
 * — the designer page and the game are the same origin, so the room can read
 * what the designer wrote without a server in between.
 *
 * `RoomHero` is what a room carries: id, printed name, Lua, and the portrait if
 * it is small. It goes into the room's settings row (`customHeroes`), which is
 * the one channel a host can write and every guest already reads — the row
 * itself in the waiting room, and `EnterRoom`'s echo of the settings once the
 * game starts. Nothing about that channel is new; the spec is not sent because
 * a guest's engine has no use for it.
 *
 * ── WHY NOT THE ACCOUNT ──────────────────────────────────────────────────────
 *
 * `user_metadata` is embedded in every access token, so ten heroes' worth of
 * Lua would ride inside the JWT on every request. A table needs a migration
 * nobody can apply from here. So heroes are per-browser, with export/import as
 * the way to move them, and `[[freekill-hero-designer]]` records the follow-up.
 *
 * ── THE GAME SIDE ────────────────────────────────────────────────────────────
 *
 * `packages/custom/init.lua` lists `packages/custom/generals/` at load with
 * `FileIO.ls`, and the VM's file system is populated from the bundle's keys,
 * so adding `packages/custom/generals/<id>.lua` to the bundle object before
 * `createLuaVm` is the whole mechanism. `withHeroFiles` returns the very same
 * object when a room has no heroes: the common case is byte-identical to
 * before this file existed.
 *
 * Both sides must add the same files. The host's server VM (the worker) and
 * every seat's client VM read them off the same settings, keyed on
 * `heroKeyOf`, which is why the client VM in `RoomPage` re-boots when the set
 * changes in the waiting room — it is cheap there, and there is no game to lose.
 */
import { useCallback, useEffect, useState } from 'react';

/** What a room carries per hero. Small on purpose: it rides in every resync. */
export interface RoomHero {
  readonly id: string;
  readonly name: string;
  readonly lua: string;
  /** A small data URL, or absent. See `MAX_ART_CHARS`. */
  readonly art?: string;
}

/** What the designer keeps. `spec` is opaque here so the game never imports the designer. */
export interface SavedHero extends RoomHero {
  readonly title: string;
  readonly kingdom: string;
  readonly spec: Record<string, unknown>;
  readonly test?: { ok: boolean; fired: boolean | null; log: string[] };
  /** ISO time of the last save. */
  readonly at: string;
}

export const CUSTOM_HEROES_SETTING = 'customHeroes';
export const SAVED_HEROES_KEY = 'fk.designer.heroes';
export const SAVED_HEROES_EVENT = 'fk:heroes';

/**
 * The pack every designed hero belongs to: `packages/custom`, `Package:new("custom")`.
 *
 * It is a pack like any other to the engine, which is what makes "off by
 * default" one line: `disabledPack` in the room's settings becomes
 * `room.disabled_packs` (lunarltk/server/room.lua:71), and
 * `Engine:canUseGeneral` keeps a general out of the pile when its package is
 * listed. The heroes are still merged into every VM — the files are there,
 * the names translate, a seat that somehow holds one renders — they are just
 * not dealt until the host switches the pack on.
 */
export const CUSTOM_PACK = 'custom';

/** A general id, a skill id: what Lua and the translation table are keyed by. */
export const HERO_ID = /^[a-z][a-z0-9_]{0,63}$/;
/** More than this and the room row stops being a row. The newest go first. */
export const MAX_ROOM_HEROES = 12;
export const MAX_LUA_CHARS = 64_000;
/** A 160×224 JPEG at quality 0.6 is ~6-9 KB; this is the ceiling for the wire. */
export const MAX_ART_CHARS = 16_000;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** One entry as the wire may carry it, or nothing. Junk is dropped, never repaired. */
export function asRoomHero(raw: unknown): RoomHero | null {
  if (!isRecord(raw)) return null;
  const { id, name, lua, art } = raw;
  if (typeof id !== 'string' || !HERO_ID.test(id)) return null;
  if (typeof lua !== 'string' || !lua.trim() || lua.length > MAX_LUA_CHARS) return null;
  const hero: { id: string; name: string; lua: string; art?: string } = {
    id,
    name: typeof name === 'string' && name ? name : id,
    lua,
  };
  if (typeof art === 'string' && art.startsWith('data:image/') && art.length <= MAX_ART_CHARS) hero.art = art;
  return hero;
}

/** The heroes a room's settings carry: validated, de-duplicated by id, capped. */
export function roomHeroesOf(settings: Readonly<Record<string, unknown>> | null | undefined): RoomHero[] {
  const raw = settings?.[CUSTOM_HEROES_SETTING];
  if (!Array.isArray(raw)) return [];
  const out: RoomHero[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const hero = asRoomHero(entry);
    if (!hero || seen.has(hero.id)) continue;
    seen.add(hero.id);
    out.push(hero);
    if (out.length >= MAX_ROOM_HEROES) break;
  }
  return out;
}

/** FNV-1a, enough to tell one Lua text from another in a dependency key. */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * A primitive that changes exactly when the room's hero set changes.
 *
 * `RoomPage` re-creates the client VM on this and on nothing else about the
 * settings object, because that object is a fresh identity on every chat line
 * and heartbeat, and a VM torn down mid-hand is a game lost.
 */
export function heroKeyOf(settings: Readonly<Record<string, unknown>> | null | undefined): string {
  return roomHeroesOf(settings).map((h) => `${h.id}@${fnv(h.lua)}`).join(',');
}

export const heroPath = (id: string): string => `packages/custom/generals/${id}.lua`;

/** The bundle entries a room's heroes add. Empty when there are none. */
export function heroFilesOf(settings: Readonly<Record<string, unknown>> | null | undefined): Record<string, string> {
  const files: Record<string, string> = {};
  for (const h of roomHeroesOf(settings)) files[heroPath(h.id)] = h.lua;
  return files;
}

/**
 * The bundle a room boots on. The SAME object when there is nothing to add —
 * the memoised base bundle is shared and must never be mutated — and a shallow
 * copy with the hero files laid over it otherwise.
 */
export function withHeroFiles<T extends Record<string, string>>(
  bundle: T,
  settings: Readonly<Record<string, unknown>> | null | undefined,
): Record<string, string> {
  const files = heroFilesOf(settings);
  return Object.keys(files).length ? { ...bundle, ...files } : bundle;
}

/** Portraits a room's heroes brought along: general id -> data URL. */
export function heroArtOf(settings: Readonly<Record<string, unknown>> | null | undefined): Record<string, string> {
  const art: Record<string, string> = {};
  for (const h of roomHeroesOf(settings)) if (h.art) art[h.id] = h.art;
  return art;
}

/** What a saved hero contributes to a room. The spec and the log stay home. */
export function toRoomHero(h: SavedHero): RoomHero {
  const hero: { id: string; name: string; lua: string; art?: string } = { id: h.id, name: h.name, lua: h.lua };
  if (h.art && h.art.length <= MAX_ART_CHARS) hero.art = h.art;
  return hero;
}

/**
 * Everything this browser has, as a room carries it: every hero that passed
 * its probe, newest first, up to the cap. A hero whose probe failed is not
 * a hero anybody wants dealt to a stranger, so it stays home.
 */
export function roomHeroesFromSaved(saved: readonly SavedHero[]): RoomHero[] {
  return saved.filter((h) => h.test?.ok !== false).slice(0, MAX_ROOM_HEROES).map(toRoomHero);
}

/** The pack list a room's settings carry, as the engine reads it. */
export function disabledPacksOf(settings: Readonly<Record<string, unknown>> | null | undefined): string[] {
  const raw = settings?.disabledPack;
  return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : [];
}

/** Whether the room deals designed heroes. Off unless the host switched it on. */
export function customPackEnabled(settings: Readonly<Record<string, unknown>> | null | undefined): boolean {
  return !disabledPacksOf(settings).includes(CUSTOM_PACK);
}

/** The `disabledPack` value that turns the pack on or off, leaving every other pack as it was. */
export function withCustomPack(disabledPack: readonly string[], on: boolean): string[] {
  const rest = disabledPack.filter((p) => p !== CUSTOM_PACK);
  return on ? rest : [...rest, CUSTOM_PACK];
}

/* -------------------------------------------------------------------------- */
/* This browser's heroes                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Storage discipline is `room/skins/policy.ts`'s: every access wrapped, because
 * `localStorage` throws rather than returning null in a sandboxed frame and in
 * Safari's private mode, and a designer's list must never take the room down.
 */
function parseSaved(raw: string | null): SavedHero[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SavedHero[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      const hero = asSavedHero(entry);
      if (hero && !seen.has(hero.id)) { seen.add(hero.id); out.push(hero); }
    }
    return out;
  } catch {
    return [];
  }
}

export function asSavedHero(raw: unknown): SavedHero | null {
  const base = asRoomHero(raw);
  if (!base || !isRecord(raw)) return null;
  const { title, kingdom, spec, test, at } = raw;
  const t = isRecord(test) && typeof test.ok === 'boolean'
    ? {
        ok: test.ok,
        fired: typeof test.fired === 'boolean' ? test.fired : null,
        log: Array.isArray(test.log) ? test.log.filter((l): l is string => typeof l === 'string') : [],
      }
    : undefined;
  return {
    ...base,
    title: typeof title === 'string' ? title : '',
    kingdom: typeof kingdom === 'string' ? kingdom : '',
    spec: isRecord(spec) ? spec : {},
    ...(t ? { test: t } : {}),
    at: typeof at === 'string' ? at : new Date(0).toISOString(),
  };
}

export function readSavedHeroes(): SavedHero[] {
  try {
    return parseSaved(globalThis.localStorage?.getItem(SAVED_HEROES_KEY) ?? null);
  } catch {
    return [];
  }
}

function writeSavedHeroes(list: readonly SavedHero[]): void {
  try {
    globalThis.localStorage?.setItem(SAVED_HEROES_KEY, JSON.stringify(list));
  } catch {
    /* A list we cannot persist is still the list on screen until reload. */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SAVED_HEROES_EVENT));
}

/** Save or replace by id. Newest first, so the one just made is on top. */
export function upsertSavedHero(hero: SavedHero): SavedHero[] {
  const next = [hero, ...readSavedHeroes().filter((h) => h.id !== hero.id)];
  writeSavedHeroes(next);
  return next;
}

export function deleteSavedHero(id: string): SavedHero[] {
  const next = readSavedHeroes().filter((h) => h.id !== id);
  writeSavedHeroes(next);
  return next;
}

/** Merge a list somebody exported; theirs win on an id clash, because they chose to import. */
export function importSavedHeroes(raw: unknown): { added: number; total: number } {
  const incoming = Array.isArray(raw) ? raw.map(asSavedHero).filter((h): h is SavedHero => h !== null) : [];
  const ids = new Set(incoming.map((h) => h.id));
  const next = [...incoming, ...readSavedHeroes().filter((h) => !ids.has(h.id))];
  writeSavedHeroes(next);
  return { added: incoming.length, total: next.length };
}

/** Test seam. */
export function clearSavedHeroes(): void {
  try { globalThis.localStorage?.removeItem(SAVED_HEROES_KEY); } catch { /* blocked */ }
}

/**
 * The saved list as React state, kept in step with the designer page in
 * another tab (`storage`) and with this document (`SAVED_HEROES_EVENT`), for
 * the same two reasons `room/skins/useSkinMode.ts` gives.
 */
export function useSavedHeroes(): [SavedHero[], () => void] {
  const [heroes, setHeroes] = useState<SavedHero[]>(readSavedHeroes);
  const refresh = useCallback(() => setHeroes(readSavedHeroes()), []);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SAVED_HEROES_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SAVED_HEROES_EVENT, refresh);
    refresh();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SAVED_HEROES_EVENT, refresh);
    };
  }, [refresh]);
  return [heroes, refresh];
}
