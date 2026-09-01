/** One piece of alternate artwork for one general. */
export interface SkinEntry {
  /** Absolute URL on a third-party host. `.jpg` is a still, `.mp4` is animated. */
  readonly url: string;
  /** The pack's display name for the skin, when it registered one. */
  readonly label?: string;
}

/**
 * How much third-party artwork the player has agreed to load.
 *
 * `off` is the default, and deliberately so -- see README.md. Skins pull every
 * viewer's browser to a host we do not run, and the video tier is ~10x the
 * bytes of a still. Both are the player's call to make, not ours.
 */
export type SkinMode = 'off' | 'static' | 'all';

export const SKIN_MODES: readonly SkinMode[] = ['off', 'static', 'all'];

export function isSkinMode(v: unknown): v is SkinMode {
  return typeof v === 'string' && (SKIN_MODES as readonly string[]).includes(v);
}

/** What a resolved skin is, once a mode and a general have been applied. */
export interface ResolvedSkin extends SkinEntry {
  readonly kind: 'image' | 'video';
}

export function skinKind(url: string): ResolvedSkin['kind'] {
  return url.endsWith('.mp4') ? 'video' : 'image';
}
