/**
 * Getting a spritesheet onto the page, once, when it is first needed.
 *
 * `sheets.generated.ts` is metadata — 37 rows of integers, a couple of kB, and
 * it ships with the room. The pixels are 3.3 MB across 37 files in
 * `public/anim/` and none of them are fetched until something actually plays.
 *
 * Loading is deliberately not `background-image` on its own. A background is
 * fetched when the element is first painted, so the first 杀 of a game would
 * play its 450 ms as an empty box and then pop. Here the image is decoded
 * first and the animation starts on the decoded frame; the caller gets `null`
 * back if the sheet is not ready yet, and a miss is simply a beat with no
 * effect rather than a stutter.
 */
import { ANIM_BY_NAME, type AnimSheet } from '../../assets/anim/sheets.generated';
import { animationsOff } from './timing';

const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export function sheetUrl(sheet: AnimSheet): string {
  return `${BASE}anim/${sheet.file}`;
}

/**
 * The engine names an effect three different ways and all three arrive here.
 *
 *   `slash`                                        a bare `image/anim` name
 *   `./packages/standard_cards/image/anim/slash`   what `setEmotion` sends for
 *                                                  a card, built from the card's
 *                                                  own name and package
 *   `skillInvoke/offensive`                        composed here from the
 *                                                  `skill_type` on `InvokeSkill`
 *
 * Only the last path segment identifies the effect, and `skillInvoke/` is the
 * one case where two segments do. Resolving by name rather than by a table of
 * cards is what makes this work for a pack nobody has written yet: a new card
 * that ships an `image/anim/<its name>` folder animates without a code change,
 * exactly as it does in the Qt client.
 */
export function resolveSheet(engineName: string): AnimSheet | undefined {
  if (!engineName) return undefined;
  const direct = ANIM_BY_NAME.get(engineName);
  if (direct) return direct;
  const parts = engineName.replace(/\/+$/, '').split('/');
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && parts[parts.length - 2] === 'skillInvoke') {
    return ANIM_BY_NAME.get(`skillInvoke/${last}`);
  }
  return ANIM_BY_NAME.get(last);
}

/** `skill_type` on an `InvokeSkill`, or the client-side default. `RoomLogic.js`
 *  falls back to `special` when the payload omits it, and several skills do. */
export function skillSheet(skillType: unknown): AnimSheet | undefined {
  const type = typeof skillType === 'string' && skillType ? skillType : 'special';
  return ANIM_BY_NAME.get(`skillInvoke/${type}`)
    // `paoxiao` passes its own name as `skill_type`, and a package may do the
    // same. An unknown category is not a reason to show nothing.
    ?? ANIM_BY_NAME.get('skillInvoke/special');
}

/* ------------------------------------------------------------------ loading */

const enum State { Loading, Ready, Failed }

interface Entry { state: State; promise?: Promise<void>; tries: number }

const cache = new Map<string, Entry>();

/**
 * How many sheets may be in flight at once.
 *
 * A browser allows six connections per host, and the table is competing for
 * them with portraits, card faces and — if a player has turned skins on — video
 * that runs to megabytes per seat. Firing every effect's sheet at the network
 * the moment it is first seen puts them all in one queue behind that, and a
 * queued request that misses its deadline looks exactly like a broken asset.
 * The skins lane wrote off two healthy hosts that way. Two at a time keeps
 * sheets out of everyone else's way; they are not urgent, and an effect that
 * misses one beat plays on the next.
 */
const MAX_IN_FLIGHT = 2;
let inFlight = 0;
const waiting: (() => void)[] = [];

/** Ready to draw right now, without a fetch. */
export function isReady(sheet: AnimSheet): boolean {
  return cache.get(sheet.file)?.state === State.Ready;
}

/**
 * Fetch and decode a sheet. Safe to call repeatedly; the work happens once.
 *
 * `decode()` rather than `onload` because a decode on the main thread at the
 * moment the animation starts is exactly the hitch this is meant to avoid —
 * `img.decode()` does it off-thread and resolves when the bitmap is ready.
 *
 * A failure is not final. An error is the server's answer and a timeout is
 * usually a statement about how busy the client is, and the two are
 * indistinguishable here — so a failed sheet becomes eligible again after a
 * backoff rather than being written off for the rest of the game. Three
 * attempts is enough to ride out a congested opening deal and few enough that a
 * genuinely missing file stops costing requests.
 */
const MAX_TRIES = 3;
const RETRY_MS = 4000;

export function loadSheet(sheet: AnimSheet): Promise<void> {
  const hit = cache.get(sheet.file);
  if (hit?.state === State.Ready) return Promise.resolve();
  if (hit?.promise) return hit.promise;
  if (hit?.state === State.Failed && hit.tries >= MAX_TRIES) return Promise.resolve();

  const tries = (hit?.tries ?? 0) + 1;
  const promise = acquire().then(() => {
    const img = new Image();
    img.src = sheetUrl(sheet);
    return (img.decode ? img.decode() : loaded(img))
      .then(() => { cache.set(sheet.file, { state: State.Ready, tries }); })
      .catch(() => {
        cache.set(sheet.file, { state: State.Failed, tries });
        // Eligible again shortly. A beat without an effect is the cost of a
        // miss; a table that never animates again is not.
        if (tries < MAX_TRIES) {
          setTimeout(() => {
            const now = cache.get(sheet.file);
            if (now?.state === State.Failed) cache.set(sheet.file, { state: State.Failed, tries });
          }, RETRY_MS);
        }
      })
      .finally(release);
  });
  cache.set(sheet.file, { state: State.Loading, promise, tries });
  return promise;
}

function acquire(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) { inFlight += 1; return Promise.resolve(); }
  return new Promise<void>((resolve) => waiting.push(() => { inFlight += 1; resolve(); }));
}

function release(): void {
  inFlight -= 1;
  waiting.shift()?.();
}

function loaded(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('sheet failed'));
  });
}

/**
 * The handful of effects a game of any length is certain to play.
 *
 * Not a card-to-art mapping — every effect still resolves by name at play time,
 * and this list changes nothing about what can animate. It is a warm-up: 杀, 闪
 * and 桃 are the three most-played cards in the game and `damage` fires on every
 * point of damage, so fetching them while the browser is idle turns the first
 * one of each from "loads, then plays next time" into "plays".
 *
 * ~330 kB, after first paint, at idle, and only in a table that is actually
 * being played.
 */
const WARM = ['slash', 'jink', 'peach', 'damage'];

export function warmCommonSheets(): void {
  // At `pace=0` nothing will ever be played, and the audit harness plays whole
  // games that way. Fetching 330 kB it cannot use is not a warm-up.
  if (animationsOff()) return;
  const idle = (window as unknown as {
    requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
  }).requestIdleCallback;
  const run = () => {
    for (const name of WARM) {
      const sheet = ANIM_BY_NAME.get(name);
      if (sheet) void loadSheet(sheet);
    }
  };
  if (idle) idle(run, { timeout: 5000 });
  else setTimeout(run, 2000);
}
