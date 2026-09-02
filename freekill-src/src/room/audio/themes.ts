/**
 * The music that belongs to one moment rather than to the room.
 *
 * WHAT THIS IS FOR. Four generals in this roster have a signature moment big
 * enough that the mobile game they come from swaps the battle music for it, and
 * two of them swap it per FORM — 势魏延's success and failure states have
 * separate loops, and 势周瑜's fire and water forms have separate loops, which
 * is well enough attested that the community rips them as named chapters
 * (「势魏延三形态BGM纯享版」, 「势周瑜三形态BGM纯享版」). `spectacle/cutscene.ts`
 * decides when one of those moments happened; this decides what it sounds like.
 *
 * WHY THESE ARE SYNTHESISED AND NOT THE REAL TRACKS. The originals are Yoka
 * Games' — 势魏延's theme song 《狂骨》 is 信's, 势周瑜's 《千古风流》 is
 * 娄艺潇's, both commercially released — and there is no source for the battle
 * loops but a rip of somebody's screen capture. `provenance.json` is this
 * repository's record of what happened the last time audio was taken on the
 * assumption that a repository-level GPL covered somebody else's recording, and
 * the answer was that it did not cover any of it. A theme is also a hard shape
 * to borrow even when you may: it has to be recognisable inside two and a half
 * seconds, start on its first sample with no intro to miss, and get out again
 * without a fade that outlives the scene. A two-minute loop cut off at 2 600 ms
 * is four bars of somebody else's introduction.
 *
 * So each theme is a `BedSpec` — the same pentatonic pad-and-pluck engine that
 * already plays this game's fallback music, given a mode, a root, a tempo and a
 * colour chosen for the character. That makes them free in bytes, unambiguous
 * in licence, instant to start, and, most usefully, *four seeds apart from each
 * other*: 势魏延 in a low 羽 with a war drum under it and 神姜维 in a high 羽
 * with no pulse at all are not the same music in a different key.
 *
 * IF THE REAL TRACKS ARE EVER LICENSED, `clip` is the seam. Put the file where
 * the pack indexes it, name it here, and the runtime prefers it; the bed stays
 * as the fallback for a build that ships no audio, exactly the way
 * `audio/system/bgm` and the four rotation beds already relate.
 */
import type { BedSpec } from './generative';

export interface Theme {
  /**
   * A shipped recording, if this build has one. Preferred over the bed when the
   * pack's index holds it; ignored, silently, when it does not.
   */
  readonly clip?: string;
  /** The bed played otherwise. Always present: a theme must always sound. */
  readonly bed: BedSpec;
}

/**
 * The five, keyed by `Cutscene.theme`.
 *
 * Modes, following `generative.ts`: 宫 [0 2 4 7 9] is the bright one, 徵
 * [0 2 5 7 9] the open one, 羽 [0 3 5 7 10] the minor one. Roots stay in the
 * 45..54 range for the same reason the rotation beds do — this sits under a
 * game, and a theme that competes with a voice line has taken the moment away
 * from the character it belongs to.
 */
export const THEMES: Readonly<Record<string, Theme>> = {
  /**
   * 忠傲 succeeded. 饮战形态 — 此番斩将得胜，只是连捷之始.
   *
   * The fastest and lowest of the five, 羽 with the drum on every downbeat.
   * 势魏延's entrance music is the one piece of this general's audio the
   * community describes rather than merely rips — 自带音响进场, he walks in with
   * his own sound system — and what they are describing is a march.
   */
  'oath-kept': {
    bed: {
      name: 'oath-kept',
      root: 45, scale: [0, 3, 5, 7, 10], bpm: 88, density: 0.34,
      colour: 620, pulse: true, seed: 0x9e17,
    },
  },

  /**
   * 忠傲 failed. 退守形态 — 一时得失何须挂怀.
   *
   * The same mode and the same root a fourth up, at two thirds the tempo, with
   * the drum kept and the filter closed. He has not lost; he has stopped
   * advancing, and his own failure lines are consolation to the rest of the
   * table. Slower and darker, never smaller.
   */
  'oath-broken': {
    bed: {
      name: 'oath-broken',
      root: 50, scale: [0, 3, 5, 7, 10], bpm: 58, density: 0.19,
      colour: 470, pulse: true, seed: 0x4c62,
    },
  },

  /**
   * 雄姿, first option — 火形态. 以吾一人心火，焚汝百万庸贼.
   *
   * 徵, the open mode, bright and quick, with the pulse. All three of his
   * skills are fire damage in this form and nothing else.
   */
  'river-fire': {
    bed: {
      name: 'river-fire',
      root: 49, scale: [0, 2, 5, 7, 9], bpm: 76, density: 0.30,
      colour: 1180, pulse: true, seed: 0x2fa5,
    },
  },

  /**
   * 雄姿, second option — 水形态. 纵有波汹浪涌，岂阻江海奔流.
   *
   * The same mode a semitone down, slow, dense, and with no drum at all: this
   * form draws cards and turns seats sideways, and it never sets anything on
   * fire. Its density is the highest of the five, which at this tempo is water
   * rather than urgency.
   */
  'river-tide': {
    bed: {
      name: 'river-tide',
      root: 48, scale: [0, 2, 5, 7, 9], bpm: 50, density: 0.36,
      colour: 820, pulse: false, seed: 0x71b3,
    },
  },

  /**
   * 决进. 朕宁拼一死，逆贼安敢一战！
   *
   * The one theme here whose original is named in a source rather than merely
   * ripped: 曹髦's 武将主题曲 is 《道心无畏》 — 纵然我，血染长袍，命如蓬草，我心
   * 亦桀骜。剑出鞘，壮志不倒，死又何足道 — and the dev-facing feature says the
   * battle music switches to it the moment the table enters 向死存魏.
   *
   * 宫, the bright one, rooted low and marching: this is a throne, and 曹髦 got
   * up off it with a sword and made it as far as the street. The only theme of
   * the six that is louder at the end than at the start, which is 决进 — every
   * player at 1 hp and the 桃 taken out of the game.
   */
  daoxin: {
    bed: {
      name: 'daoxin',
      root: 47, scale: [0, 2, 4, 7, 9], bpm: 68, density: 0.28,
      colour: 980, pulse: true, seed: 0x1d43,
    },
  },

  /**
   * 神霈. 雄山峻壑终踏过，须信寒过总是春.
   *
   * 羽 again but an octave of feeling away from 势魏延's: high root, slowest
   * tempo, no pulse, the most open filter of the six. 霈 is a downpour and
   * 万民承霖 is rain arriving for people who were owed it.
   *
   * THE ONE THEME HERE WITH NOTHING BEHIND IT BUT THE CHARACTER. 神姜维 has no
   * published 武将主题曲 that a search could find, and unlike the other three
   * generals nobody has ripped a battle loop for him either. That is a gap in
   * the sources rather than a finding, so this is written from the lore and
   * says so, rather than pretending to stand in for a track that may not exist.
   */
  'rain-owed': {
    bed: {
      name: 'rain-owed',
      root: 54, scale: [0, 3, 5, 7, 10], bpm: 42, density: 0.33,
      colour: 700, pulse: false, seed: 0x6ad9,
    },
  },
};

export function themeOf(name: unknown): Theme | undefined {
  return typeof name === 'string' ? THEMES[name] : undefined;
}
