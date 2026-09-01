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
 *                                                  drawing, judging and the two
 *                                                  ends of the game.
 *
 * Everything else here is internal. `provenance.json` is not internal: read it
 * before adding an audio file to this build.
 */
export { GameAudio } from './GameAudio';
export { RoomAudio, roomAudio } from './bus';
export type { AudioStatus, SoundSource } from './bus';
export { cueFor, logEventCues, moveCues, animateCues, gameOverCues, readPath, soundKey } from './cues';
export type { Cue, CueContext, Scene, SoundCue, SoundName } from './cues';
export { DEFAULT_SETTINGS, readSettings, writeSettings, resetSettings } from './settings';
export type { AudioSettings } from './settings';
export { HAS_VOICE_BANK } from './clips';
