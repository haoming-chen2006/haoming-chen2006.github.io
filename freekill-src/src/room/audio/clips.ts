/**
 * Turning what the engine said into where the file is. No data, no fetching.
 *
 * A port of the addressing half of `Fk/Base/SkinBank.qml`. The engine names a
 * sound in one of two ways and this understands both:
 *
 *   by path      `LogEvent{PlaySound}` carries a whole path the Lua built —
 *                `./packages/standard_cards/audio/card/male/slash`
 *   by name      `LogEvent{PlaySkillSound}` carries a skill and two generals,
 *                and the client is expected to look under `audio/skill/`
 *
 * THE PACKAGE PREFIX IS DROPPED, AND THAT IS THE ENGINE'S OWN BEHAVIOUR.
 * `SkinBank.getAudio(name, extension, type)` is handed one extension to search,
 * but `searchAudioResourceWithExtension` falls through to every other package
 * when that one misses — which is why a skill line for a `mobile` general can
 * live in `standard` and still be found. Flattening the pack the same way
 * (`build-audio.mjs`) turns 2,015 files into 2,015 distinct names with no
 * collisions, so a clip's URL is a pure function of its key and no filename map
 * is needed anywhere.
 *
 * WHY THIS FILE HOLDS NOTHING. It used to hold the index. `GameAudio` is
 * mounted at the app root (`main.tsx:110`) and imports from here, so anything
 * exported here is in the first-paint bundle — which was fine for 89 rows and
 * is not fine for 2,015. The index moved to `public/audio/index.json`, fetched
 * by `bank.ts` the first time a cue needs one; what is left here is arithmetic
 * on strings, which is free.
 */
import { PACK } from './clips.generated';

/** What a clip is for. Decides its bus, its level and whether it may be cut. */
export type ClipRole =
  /** The bed. Crossfaded, never cut, on the music fader. */
  | 'music'
  /** Foley — a hit, a chain, a riffle. On the effects fader. */
  | 'sfx'
  /** Somebody saying a card's name. Short, and its own channel. */
  | 'line'
  /** A general speaking: a skill line, a death line, a victory line. */
  | 'voice';

/** One playable recording. Built from the index; never stored. */
export interface Clip {
  /** The engine's own key, package stripped: `audio/skill/fankui1`. */
  readonly key: string;
  /** Ready to fetch, stamped so a rebuilt pack is never served stale. */
  readonly url: string;
  readonly role: ClipRole;
  readonly seconds: number;
}

/** The three banks addressed by name rather than by path. */
export type VoiceBank = 'skill' | 'death' | 'win';

/**
 * `packages/standard/audio/skill/fankui1` -> `audio/skill/fankui1`.
 *
 * Also accepts a key that is already package-free, so a caller never has to
 * know which of the two shapes it is holding.
 */
export function tailOf(key: string): string {
  const m = /^packages\/[^/]+\/(audio\/.+)$/.exec(key);
  return m ? m[1] : key;
}

/**
 * The engine's sound paths as they arrive, normalised.
 *
 * Lua builds them by concatenation, so they come with a leading `./` and
 * sometimes with the extension and sometimes without — `broadcastPlaySound`
 * takes the path `usecard.lua` built with no `.mp3`, while a package writing one
 * by hand may include it. Both normalise here rather than at every reader.
 */
export function soundKey(path: unknown): string | undefined {
  if (typeof path !== 'string') return undefined;
  const clean = path.trim().replace(/^\.?\//, '').replace(/\.(mp3|ogg|wav)$/i, '');
  return clean && !clean.includes('..') ? clean : undefined;
}

/**
 * What kind of thing a key names.
 *
 * Mirrors `roleFor` in `build-audio.mjs`, which decides the bitrate the file was
 * written at; they must agree, and `__tests__/pack.test.ts` asserts they do
 * against the real index. `audio/card/<gender>/` is a `line` rather than an
 * `sfx` because `usecard.lua:43` picks that directory off `player.gender` —
 * sound effects do not have a gender, and these are recordings of a person
 * saying the card's name.
 */
export function roleOf(key: string): ClipRole {
  const tail = tailOf(key);
  if (tail === 'audio/system/bgm') return 'music';
  if (/^audio\/(skill|death|win)\//.test(tail)) return 'voice';
  if (/^audio\/card\/(male|female)\//.test(tail)) return 'line';
  return 'sfx';
}

/**
 * The filenames one line resolves to, in take order.
 *
 * `QmlBackend::playSound` (`src/ui/qmlbackend.cpp:271`) counts `<name><i>.mp3`
 * upward from 1 and plays `<name>.mp3` when there are none, so a line is either
 * a single unnumbered file or a contiguous numbered run. The index stores a
 * number for the first shape and an array for the second; this is the only
 * place that distinction is turned back into filenames.
 */
export function takeNames(name: string, takes: number | readonly number[]): readonly string[] {
  if (typeof takes === 'number') return [name];
  return takes.map((_, i) => `${name}${i + 1}`);
}

/**
 * One take. `index` is the engine's `data.i`: -1 means whichever, and a real
 * index is 1-based because that is how the files are numbered.
 */
export function pickTake<T>(takes: readonly T[], index: number, rand = Math.random): T | undefined {
  if (!takes.length) return undefined;
  if (index > 0 && index <= takes.length) return takes[index - 1];
  return takes[Math.floor(rand() * takes.length)];
}

/** A stable small integer from a name, so one card always gets the same patch. */
export function hashName(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 65536;
}

export { PACK };
export type { PackSummary } from './clips.generated';

/**
 * True when this build shipped recorded performances.
 *
 * Read off the 1.6 kB summary module rather than by scanning an index:
 * `GameAudio` asks this at the app root to decide whether to draw a voice
 * fader, and the index is a 39 kB fetch a visitor who never turns sound on must
 * never pay for.
 */
export const HAS_VOICE_BANK = (PACK?.roles.voice?.n ?? 0) > 0;

/** Everything the pack holds, recordings of every kind. */
export const CLIP_COUNT = PACK?.clips ?? 0;
