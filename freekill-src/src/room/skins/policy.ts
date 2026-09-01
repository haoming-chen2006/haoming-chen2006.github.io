/**
 * Whether this player wants third-party artwork at all, and how much of it.
 *
 * The default is `off`, and that is a considered position rather than caution
 * for its own sake. Turning skins on has two costs that are not ours to accept
 * on someone else's behalf:
 *
 *  * **It sends their browser to a host we do not run.** Every portrait becomes
 *    a request to `cdn.jsdelivr.net` or `cnb.cool` carrying their IP, their
 *    User-Agent, and a Referer identifying this site. Nobody who loaded a
 *    Sanguosha page agreed to that.
 *
 *  * **The video tier is ~10x the bytes of the still tier** (769 KB median
 *    against 73 KB, p90 1.77 MB against 98 KB). On a metered connection an
 *    eight-seat table can be several megabytes of portraits before a card is
 *    played. `static` exists so that "I want nicer art" and "I want to spend
 *    2 MB per seat on it" stay separate answers.
 *
 * Reading the stored value is wrapped because `localStorage` throws outright in
 * a sandboxed frame and in Safari's private mode -- not returns null, throws --
 * and a cosmetic preference must never be able to take the room down with it.
 */
import { isSkinMode, type SkinMode } from './types';

export const SKIN_MODE_KEY = 'fk.skins.mode';
export const DEFAULT_SKIN_MODE: SkinMode = 'off';

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
