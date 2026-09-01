/**
 * The audio lane's public surface.
 *
 * Two things leave this directory, and the whole wiring is those two:
 *
 *   <GameAudio/>   mounted once at the app root. Owns the control, the first
 *                  gesture, and the lobby-versus-table signal it reads off the
 *                  hash route. Everything that makes a noise is behind a dynamic
 *                  import inside it, so a visitor who leaves sound off pays for
 *                  a button.
 *
 *   roomAudio      the singleton the table talks to.
 *                    `roomAudio.attach(store)`  -> the store's `onSound` hook,
 *                                                  which is every `LogEvent`.
 *                    `roomAudio.notify(cmd, d)` -> the rest of the stream, for
 *                                                  drawing, judging, seats
 *                                                  filling and the two ends of
 *                                                  the game.
 *
 * Everything else here is internal. `provenance.json` is not internal: it says
 * what the 2,015 recordings in `public/audio/` are, where the evidence about
 * them stands, and whose decision it was to ship them. Read it before changing
 * what this build carries.
 */
export { GameAudio } from './GameAudio';
export { RoomAudio, roomAudio } from './bus';
export type { AudioStatus, SoundSource } from './bus';
export {
  cueFor, logEventCues, moveCues, animateCues, gameOverCues, presentCues, readPath, soundKey,
  RANK_ORDER,
} from './cues';
export type { Beatmark, Cue, CueContext, Scene, SoundCue, SoundName, VoiceCue, VoiceRank } from './cues';
export { DEFAULT_SETTINGS, readSettings, writeSettings, resetSettings } from './settings';
export type { AudioSettings } from './settings';
export { CLIP_COUNT, HAS_VOICE_BANK, PACK } from './clips';
export type { Clip, ClipRole, VoiceBank } from './clips';
