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
 * THE DEFAULT IS SILENCE, AND THAT IS STILL THE POINT. `enabled` starts false.
 * Not "starts true and waits for a gesture" — false. A browser's autoplay policy
 * would stop the music either way, but it stops nothing on the *second* visit,
 * once the origin has earned a gesture, and a site that starts playing music at
 * a person who never asked for it is the thing the policy exists to prevent
 * rather than a clever way around it. So sound is opt-in, once, from a visible
 * control; after that the choice is remembered and the first real gesture of
 * the session unlocks the context.
 *
 * THREE FADERS, BECAUSE THERE ARE THREE ANSWERS. Music, the table, and the
 * generals. A lot of people want the card sounds at full and the music at a
 * whisper; a lot of people want a general to shout when they use a skill and a
 * lot of people find that exhausting by the third game. Those are not one
 * decision and they are not a checkbox: `voice` used to be a boolean, and a
 * boolean cannot say "yes, but quieter than the table".
 *
 * Old blobs carry the boolean and are migrated in place — `true` becomes 0.9,
 * `false` becomes 0 — so nobody's remembered choice is thrown away by the
 * change. The build before this one shipped no recordings at all and defaulted
 * that boolean to false; it now defaults to 0.9, because the recordings are
 * here and the owner of this build asked for them (`provenance.json`).
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
   * 0..1, the generals and the card calls.
   *
   * At zero every voice cue falls through to the synthesised patch it carries,
   * which is a complete game — the bell, the gong, the chime. Nothing is ever
   * missing because this is down.
   */
  readonly voice: number;
}

/**
 * Effects lead; the generals sit just under them; music sits under both.
 *
 * The voice default is the loud one on purpose. These recordings are the thing
 * the table was missing, they are ducked against everything else rather than
 * mixed over it, and a first impression of the game with the generals silent is
 * a first impression of a different game.
 */
export const DEFAULT_SETTINGS: AudioSettings = {
  enabled: false,
  music: 0.3,
  effects: 0.8,
  voice: 0.9,
};

const clamp01 = (n: unknown, fallback: number): number => {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
};

/** `voice` was a checkbox until the pack shipped. Read both shapes. */
function readVoice(v: unknown): number {
  if (v === true) return DEFAULT_SETTINGS.voice;
  if (v === false) return 0;
  return clamp01(v, DEFAULT_SETTINGS.voice);
}

export function readSettings(): AudioSettings {
  let raw: string | null = null;
  try { raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null; } catch { /* blocked */ }
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof AudioSettings, unknown>>;
    return {
      enabled: p.enabled === true,
      music: clamp01(p.music, DEFAULT_SETTINGS.music),
      effects: clamp01(p.effects, DEFAULT_SETTINGS.effects),
      voice: readVoice(p.voice),
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
