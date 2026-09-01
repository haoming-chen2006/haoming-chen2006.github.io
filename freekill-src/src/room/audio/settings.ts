/**
 * What the player chose, and where it is kept.
 *
 * Persisted exactly the way the language toggle is persisted — one JSON blob in
 * `localStorage`, every access wrapped, a bad value falling back to the default
 * rather than throwing. `localStorage` does not merely return null in a
 * sandboxed iframe or with site data blocked; the getter itself throws, and a
 * game that will not boot because it could not remember a volume is a worse
 * failure than a game that starts at 50%.
 *
 * THE DEFAULT IS SILENCE, AND THAT IS THE POINT. `enabled` starts false. Not
 * "starts true and waits for a gesture" — false. A browser's autoplay policy
 * would stop the music either way, but it stops nothing on the *second* visit,
 * once the origin has earned a gesture, and a site that starts playing music at
 * a person who never asked for it is the thing the policy exists to prevent
 * rather than a clever way around it. So sound is opt-in, once, from a visible
 * control; after that the choice is remembered and the first real gesture of
 * the session unlocks the context.
 *
 * Music and effects carry separate volumes rather than one master and two
 * mutes, because the honest split is not on/off: a lot of people want the card
 * sounds at full and the music at a whisper, and that is two faders.
 */

const STORAGE_KEY = 'fk.audio';

export interface AudioSettings {
  /** The player has asked for sound. Nothing is ever heard while this is false. */
  readonly enabled: boolean;
  /** 0..1, the music bed. */
  readonly music: number;
  /** 0..1, everything the table does. */
  readonly effects: number;
  /**
   * Recorded general voice lines.
   *
   * Off, and off for a licensing reason rather than a taste one — see
   * `provenance.json`. Turning it on in a build that shipped no voice bank does
   * nothing at all: every voice cue carries a synthesised fallback, so the game
   * sounds complete either way.
   */
  readonly voice: boolean;
}

/**
 * Effects lead; music sits under them.
 *
 * Two switches live here, and both are one line, because the question of
 * whether this game wants music at all is still open:
 *
 *   music only when asked for   `music: 0`     — the bed never starts, the
 *                                                fader still brings it back
 *   no music in the build       empty `PLAYLIST` in `runtime.ts` — the
 *                                                rotation has nothing to play
 *                                                and the fader disappears from
 *                                                nobody's way
 *
 * Neither is needed for the effects to work: they are on their own bus, their
 * own fader, and their own code path.
 */
export const DEFAULT_SETTINGS: AudioSettings = {
  enabled: false,
  music: 0.3,
  effects: 0.8,
  voice: false,
};

const clamp01 = (n: unknown, fallback: number): number => {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
};

export function readSettings(): AudioSettings {
  let raw: string | null = null;
  try { raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null; } catch { /* blocked */ }
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const p = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      enabled: p.enabled === true,
      music: clamp01(p.music, DEFAULT_SETTINGS.music),
      effects: clamp01(p.effects, DEFAULT_SETTINGS.effects),
      voice: p.voice === true,
    };
  } catch {
    // A corrupt blob is not worth a broken boot, and it is not worth keeping.
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(s: AudioSettings): void {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* blocked */ }
}

export function resetSettings(): void {
  try { globalThis.localStorage?.removeItem(STORAGE_KEY); } catch { /* blocked */ }
}
