/**
 * What the game sounds like, decided from what the engine said happened.
 *
 * WHERE THE SIGNAL COMES FROM. Every branch below is a message the server
 * already broadcasts to every client, and the mapping is a port of
 * `Fk/Pages/LunarLTK/RoomLogic.js:1374-1440` — the Qt client's `LogEvent`
 * switch — plus the four moments that switch does not cover because the QML
 * played them from somewhere else. There is no table of cards here, no list of
 * skills, and no lookup keyed on a general's name.
 *
 * The six events the brief asked for, and where each one actually comes from:
 *
 *   card use      LogEvent{PlaySound}       `./packages/<pkg>/audio/card/<sex>/<card>`
 *   skill invoke  LogEvent{PlaySkillSound}  name + general + deputy + take
 *   damage        LogEvent{Damage}          damageType, damageNum
 *   death         LogEvent{Death}           the seat; the general comes from the store
 *   draw          MoveCards                 DrawPile -> PlayerHand
 *   judgement     Animate{Emotion}          `judgegood` / `judgebad`, is_card
 *
 * The last two are not `LogEvent`s and never were: the Qt client draws a
 * judgement from `Room:setCardEmotion(cid, "judgegood")` (`events/judge.lua:98`)
 * and plays no sound for either, while `audio/system/draw.mp3` has sat in the
 * engine since the first commit with not one call site in the whole `Fk/` tree.
 * They are here because a table where drawing and judging are silent is a table
 * where the two most frequent things that happen to you make no sound.
 *
 * WHY A CUE NAMES A CATEGORY AND NOT A FILE. The deployed build ships no audio
 * files at all — see `provenance.json`, and the header of
 * `src/room/assets/audio/build-audio.mjs`, for why the premise that it could
 * changed. So a cue cannot be "play this mp3". It is "this kind of thing
 * happened, and here is what the engine said about it": the category, the
 * element, and a seed derived from whatever name the engine used. `sfx.ts`
 * synthesises from that, and a build that *does* have a licensed clip for the
 * engine's own path plays that instead — `sample` carries the path for exactly
 * that case.
 *
 * That is also what keeps the promise not to build a per-card map. The
 * categories are the engine's own — it tells us the damage element, the
 * equipment subtype, whether a sound is a card use or an equipment proc — and
 * within a category the timbre comes from a hash of the name on the wire. A card
 * nobody has written yet gets a sound, deterministically, and no file here ever
 * has to learn that it exists.
 *
 * NOTHING HERE DECIDES ANYTHING. A cue is a request to make a noise. It reads no
 * game state beyond asking the store what a seat's general is called, it never
 * looks at legality, and a payload it cannot parse is silence rather than a
 * throw — these objects are assembled in Lua and a package can put anything in
 * them.
 */

/** Which bed is playing. Coarse on purpose: the music is not a state machine. */
export type Scene = 'lobby' | 'table' | 'over';

/**
 * The engine's own categories, which is all a cue is allowed to know.
 *
 * `card` is a card resolving, `equip` is a piece of equipment going on, `gear`
 * is an equipment skill firing — three different code paths in the engine
 * (`usecard.lua:31`, `usecard.lua:36`, `skill.lua:59`) that arrive as three
 * different path shapes, which is why they are three sounds.
 */
export type SoundName =
  | 'card' | 'equip' | 'gear'
  | 'damage' | 'losehp' | 'losemaxhp' | 'death'
  | 'draw' | 'judge' | 'skill'
  | 'chain' | 'recast' | 'gamestart' | 'win' | 'lose'
  /** A flower or an egg thrown across the table. Not an engine event — see
   *  `presentCues` below for where it comes from and why it has no sample. */
  | 'present'
  /** A path the engine sent that parses as none of the above. */
  | 'generic';

export interface SoundCue {
  readonly kind: 'sound';
  readonly sound: SoundName;
  /** Within a category, what the engine said it was: `fire`, `armor`, `good`. */
  readonly variant?: string;
  /** The engine's `damageNum > 1` — a different recording upstream, a heavier
   *  patch here. Not a volume trick. */
  readonly heavy?: boolean;
  /** Derived from the name on the wire, so one card always sounds like itself. */
  readonly seed?: number;
  /** The engine's own audio path. Played in place of the patch by a build that
   *  has a licensed clip for it; ignored by the public build, which has none. */
  readonly sample?: string;
  readonly gain?: number;
  /** Collapses a burst: at most one cue per tag per window. */
  readonly tag?: string;
}

export type Cue =
  | SoundCue
  /**
   * A recorded performance, if this build has a voice bank and the player asked
   * for one. `then` is not an error path: it is what the table sounds like when
   * nobody spoke, which in the public build is always.
   */
  | {
    readonly kind: 'voice';
    readonly bank: 'skill' | 'death';
    readonly names: readonly string[];
    /** `data.i`; -1 means any take. */
    readonly index: number;
    readonly then: SoundCue;
  }
  | { readonly kind: 'music'; readonly scene: Scene };

/** What a cue needs to know that only the live room knows. */
export interface CueContext {
  /** The general on a seat, for a death line. `''` when unknown. */
  general(playerId: number): string;
  /** The viewer's role, so a game over can tell a win from a loss. `''` if none. */
  myRole(): string;
}

export const NO_CONTEXT: CueContext = { general: () => '', myRole: () => '' };

/* ----------------------------------------------------------------- helpers */

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

/** A stable small integer from a name, so one card always gets the same patch. */
export function hashName(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 65536;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** `RoomLogic.js:1381`. Four elements; anything else is a plain hit. */
const DAMAGE_ELEMENTS: Readonly<Record<string, string>> = {
  normal_damage: 'normal', fire_damage: 'fire', thunder_damage: 'thunder', ice_damage: 'ice',
};

/**
 * Reading a `PlaySound` path.
 *
 * The path says which of four things happened, and the engine draws the
 * distinction, not us. `usecard.lua:43` puts the speaker's gender in a card use
 * — `…/audio/card/male/duel` — while `skill.lua:59` builds an equipment skill's
 * path without one — `…/audio/card/fan`. `usecard.lua:31` sends wearing a piece
 * of equipment to `./audio/card/common/<subtype>`, and `serverplayer.lua:412`
 * and `movecard.lua:562` send the chain toggle and the recast to
 * `./audio/system/<name>`.
 *
 * Defensive because a package nobody has written yet may assemble these
 * slightly differently. An unreadable path is a generic knock, never a throw.
 */
export function readPath(key: string): SoundCue {
  const seg = key.split('/').filter(Boolean);
  const base = { kind: 'sound', sample: key, tag: key } as const;

  if (seg[0] === 'audio' && seg[1] === 'system' && seg[2]) {
    const name = seg[2];
    if (name === 'chain') return { ...base, sound: 'chain' };
    if (name === 'recast') return { ...base, sound: 'recast' };
    return { ...base, sound: 'generic', seed: hashName(name) };
  }

  const at = seg.indexOf('card');
  if (at < 1 || seg[at - 1] !== 'audio') return { ...base, sound: 'generic', seed: hashName(key) };
  const rest = seg.slice(at + 1);
  if (!rest.length) return { ...base, sound: 'generic', seed: hashName(key) };

  if (rest[0] === 'common') {
    const which = rest[1];
    return which === 'weapon' || which === 'armor' || which === 'horse'
      ? { ...base, sound: 'equip', variant: which }
      : { ...base, sound: 'generic', seed: hashName(key) };
  }
  // `…/card/<gender>/<name>` is a use; `…/card/<name>` is an equipment skill.
  if (rest.length >= 2 && (rest[0] === 'male' || rest[0] === 'female')) {
    return { ...base, sound: 'card', variant: rest[0], seed: hashName(rest[1]) };
  }
  return { ...base, sound: 'gear', seed: hashName(rest[0]) };
}

/* ---------------------------------------------------------------- the map */

/**
 * One notify message in, the noises it should make out.
 *
 * An array because two things genuinely happen at once — a game ending is a
 * sting *and* a change of music — and because an empty array is the honest
 * answer for the two thousand messages of a game that are not a sound.
 */
export function cueFor(command: string, data: unknown, ctx: CueContext = NO_CONTEXT): readonly Cue[] {
  switch (command) {
    case 'LogEvent': return logEventCues(data, ctx);
    case 'MoveCards': return moveCues(data);
    case 'Animate': return animateCues(data);
    case 'StartGame': return [
      { kind: 'sound', sound: 'gamestart', tag: 'gamestart' },
      { kind: 'music', scene: 'table' },
    ];
    case 'GameOver': return gameOverCues(data, ctx);
    case 'Present': return presentCues(data);
    default: return [];
  }
}

/**
 * Somebody threw a flower or an egg.
 *
 * The one cue here that is not an engine message. A present travels over the
 * chat channel, not the wire (`components/present.ts`), so `Presents.tsx`
 * calls `roomAudio.notify('Present', …)` itself — which is why the command name
 * is not in `OBSERVED_WIRE_COMMANDS` and never will be.
 *
 * It carries no `sample`, and that is deliberate rather than an omission. The
 * engine's own noises for this are `audio/system/{fly,flower,egg}{1,2}.mp3`,
 * and those six files are exactly the ones carrying an intact
 * `copyright=绯雨音乐` tag — the evidence that stopped this build shipping any
 * audio at all (`src/room/assets/audio/build-audio.mjs`). A `sample` path here
 * would be an invitation to a future build to play a file it has no right to,
 * so there is none: a present is synthesised or it is silent.
 *
 * The seed is what separates the two. `sfx.ts`'s `generic` patch derives its
 * pitch from it, so a flower rings high and an egg lands low, off the same
 * three lines of synthesis.
 */
export function presentCues(data: unknown): readonly Cue[] {
  const kind = str((data as Record<string, unknown> | null | undefined)?.kind);
  if (!kind) return [];
  const flower = kind === 'Flower';
  return [{
    kind: 'sound',
    sound: 'present',
    variant: flower ? 'flower' : 'egg',
    seed: hashName(flower ? 'flower' : 'egg'),
    // Under the table, not over it. A present is somebody being silly while a
    // game is going on; it must never be the loudest thing in the room.
    gain: flower ? 0.32 : 0.4,
    // Two people throwing at once is one noise. `runtime.ts` collapses by tag.
    tag: 'present',
  }];
}

/** `RoomLogic.js:1374`. The engine's own sound channel, and most of the game. */
export function logEventCues(data: unknown, ctx: CueContext = NO_CONTEXT): readonly Cue[] {
  const d = (data ?? {}) as Record<string, unknown>;
  switch (str(d.type)) {
    /* A card resolving, equipment going on, a chain toggling, a recast: four
       different engine paths, all arriving as one message with a path in it. */
    case 'PlaySound': {
      const key = soundKey(d.name);
      return key ? [readPath(key)] : [];
    }

    case 'Damage': {
      const element = DAMAGE_ELEMENTS[str(d.damageType)] ?? 'normal';
      return [{
        kind: 'sound', sound: 'damage', variant: element,
        heavy: num(d.damageNum) > 1,
        sample: `audio/system/${str(d.damageType) || 'normal_damage'}${num(d.damageNum) > 1 ? '2' : ''}`,
        tag: 'damage',
      }];
    }

    case 'LoseHP':
      return [{ kind: 'sound', sound: 'losehp', sample: 'audio/system/losehp', tag: 'losehp' }];

    case 'ChangeMaxHp':
      // Only losing max hp makes a sound upstream, and gaining it should not:
      // the good news already has a number moving on the seat.
      return num(d.num) < 0
        ? [{ kind: 'sound', sound: 'losemaxhp', sample: 'audio/system/losemaxhp', tag: 'losemaxhp' }]
        : [];

    /**
     * `ServerPlayer:broadcastSkillInvoke` (`serverplayer.lua:465`). The payload
     * names the skill, the take, and both of the seat's generals, so the whole
     * `SkinBank.getAudio` lookup is right here and needs no call into the VM.
     */
    case 'PlaySkillSound': {
      const skill = str(d.name);
      if (!skill) return [];
      const general = str(d.general);
      const deputy = str(d.deputy);
      const names = [
        general && `${skill}_${general}`,
        deputy && `${skill}_${deputy}`,
        skill,
      ].filter((n): n is string => !!n);
      return [{
        kind: 'voice',
        bank: 'skill',
        names,
        index: num(d.i) || -1,
        // Pitched by skill name, so a general's signature skill has a signature
        // note. This is the sound the public build actually makes for a skill.
        then: { kind: 'sound', sound: 'skill', seed: hashName(skill), tag: `skill:${skill}` },
      }];
    }

    case 'Death': {
      const general = ctx.general(num(d.to));
      return [{
        kind: 'voice',
        bank: 'death',
        names: general ? [general] : [],
        index: -1,
        then: { kind: 'sound', sound: 'death', seed: hashName(general), tag: 'death' },
      }];
    }

    default:
      return [];
  }
}

/**
 * Drawing.
 *
 * One sound per message, not one per card: the opening deal is four cards to
 * eight seats in a single `MoveCards`, and eight overlapping copies of a paper
 * sound is a hiss.
 */
export function moveCues(data: unknown): readonly Cue[] {
  const d = (data ?? {}) as { merged?: readonly { fromArea?: number; toArea?: number; ids?: readonly number[] }[] };
  const merged = Array.isArray(d.merged) ? d.merged : [];
  for (const move of merged) {
    // `CARD_AREA.DrawPile` is 6, `PlayerHand` is 1 — `ltk/types.ts`.
    if (num(move?.fromArea) === 6 && num(move?.toArea) === 1 && (move?.ids?.length ?? 0) > 0) {
      return [{ kind: 'sound', sound: 'draw', sample: 'audio/system/draw', gain: 0.5, tag: 'draw' }];
    }
  }
  return [];
}

/**
 * Judgement.
 *
 * `Room:setCardEmotion(cid, "judgegood"|"judgebad")` is broadcast as an
 * `Animate{Emotion}` carrying `is_card`, which is how the animation lane knows
 * the effect belongs on the card in the processing zone rather than on a seat.
 * It is also the only unambiguous "the judgement came up" on the wire: a card
 * moving into the processing zone looks exactly like a card being used.
 */
export function animateCues(data: unknown): readonly Cue[] {
  const d = (data ?? {}) as Record<string, unknown>;
  if (str(d.type) !== 'Emotion' || d.is_card !== true) return [];
  const emotion = str(d.emotion);
  if (emotion === 'judgegood') return [{ kind: 'sound', sound: 'judge', variant: 'good', tag: 'judge' }];
  if (emotion === 'judgebad') return [{ kind: 'sound', sound: 'judge', variant: 'bad', tag: 'judge' }];
  return [];
}

/**
 * `GameOverBox.qml:198`. The winner arrives as a role, or a `+`-joined list of
 * them because a rebel win is every surviving rebel, and the sting depends on
 * whether the viewer is in it. An observer is in neither and gets the draw case.
 *
 * Upstream plays `audio/system/draw` on a drawn game, which is the *card* draw
 * sound — a paper riffle for a stalemate. Not copied: a draw gets no sting, only
 * the music standing down.
 */
export function gameOverCues(data: unknown, ctx: CueContext = NO_CONTEXT): readonly Cue[] {
  const winners = str(data).split('+').map((s) => s.trim()).filter(Boolean);
  const mine = ctx.myRole();
  const cues: Cue[] = [];
  if (mine && winners.length) {
    const won = winners.includes(mine);
    cues.push({
      kind: 'sound',
      sound: won ? 'win' : 'lose',
      sample: won ? 'audio/system/win' : 'audio/system/lose',
      tag: 'gameover',
    });
  }
  cues.push({ kind: 'music', scene: 'over' });
  return cues;
}
