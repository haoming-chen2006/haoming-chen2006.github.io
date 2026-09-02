/**
 * Whether this player wants third-party artwork at all, and how much of it.
 *
 * The default is `all`. That is the operator's decision, taken with the
 * licensing paragraph in `index.ts` in hand, and it is a change of answer rather
 * than a change of question: the two costs below are exactly what they were, and
 * the setting exists so that a player who does not want to pay them does not
 * have to.
 *
 *  * **It sends their browser to a host we do not run.** Every portrait becomes
 *    a request to `cdn.jsdelivr.net` or `cnb.cool` carrying their IP, their
 *    User-Agent, and a Referer identifying this site. Nobody who loaded a
 *    Sanguosha page agreed to that, so `off` has to stay one click away and has
 *    to keep working — see `SkinPicker.tsx`, which puts all three tiers in the
 *    same panel as the artwork they buy.
 *
 *  * **The video tier is ~10x the bytes of the still tier** (769 KB median
 *    against 73 KB, p90 1.77 MB against 98 KB). On a metered connection an
 *    eight-seat table can be several megabytes of portraits before a card is
 *    played. `static` exists so that "I want nicer art" and "I want to spend
 *    2 MB per seat on it" stay separate answers.
 *
 * WHY `all` AND NOT `static`. 138 of the 226 files are video, and 44 of the 110
 * generals have nothing else — defaulting to `static` would ship the feature
 * switched half off and leave those seats looking untouched, which reads as
 * broken rather than as thrifty. The bytes are real, so `static` keeps its place
 * in the panel as the answer for a metered connection; it is not the answer for
 * somebody who has not been asked yet.
 *
 * Reading the stored value is wrapped because `localStorage` throws outright in
 * a sandboxed frame and in Safari's private mode -- not returns null, throws --
 * and a cosmetic preference must never be able to take the room down with it.
 */
import { isSkinMode, type SkinMode } from './types';

export const SKIN_MODE_KEY = 'fk.skins.mode';
export const DEFAULT_SKIN_MODE: SkinMode = 'all';

export function readSkinMode(): SkinMode {
  try {
    const raw = globalThis.localStorage?.getItem(SKIN_MODE_KEY);
    return isSkinMode(raw) ? raw : DEFAULT_SKIN_MODE;
  } catch {
    return DEFAULT_SKIN_MODE;
  }
}

export function writeSkinMode(mode: SkinMode): void {
  try {
    globalThis.localStorage?.setItem(SKIN_MODE_KEY, mode);
  } catch {
    /* A preference we cannot persist is still a preference we can honour in-memory. */
  }
}
