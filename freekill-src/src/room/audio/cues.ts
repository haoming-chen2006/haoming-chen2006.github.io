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
 * The events, and where each one actually comes from:
 *
 *   card use      LogEvent{PlaySound}       `./packages/<pkg>/audio/card/<sex>/<card>`
 *   equip worn    LogEvent{PlaySound}       `./audio/card/common/<weapon|armor|horse>`
 *   equip proc    LogEvent{PlaySound}       `./packages/<pkg>/audio/card/<equip>`
 *   skill invoke  LogEvent{PlaySkillSound}  name + general + deputy + take
 *   damage        LogEvent{Damage}          damageType, damageNum
 *   death         LogEvent{Death}           the seat; the general comes from the store
 *   draw          MoveCards                 DrawPile -> PlayerHand
 *   judgement     Animate{Emotion}          `judgegood` / `judgebad`, is_card
 *   victory       GameOver                  the winning roles
 *
 * The last three are not `LogEvent`s and never were: the Qt client draws a
 * judgement from `Room:setCardEmotion(cid, "judgegood")` (`events/judge.lua:98`)
 * and plays no sound for either, while `audio/system/draw.mp3` has sat in the
 * engine since the first commit with not one call site in the whole `Fk/` tree.
 * They are here because a table where drawing and judging are silent is a table
 * where the two most frequent things that happen to you make no sound.
 *
 * A CUE NAMES A SOUND AND A MOMENT.
 *
 *   `sample` / `pick`  the engine's own path, which the pack is keyed by. When
 *                      the build shipped that recording it plays; when it did
 *                      not, the category and the seed synthesise one.
 *   `at`               when, relative to the message. Most things are `now`.
 *                      A death lands on the slay animation's own phases, which
 *                      `spectacle/budget.ts` publishes for exactly this; a
 *                      present lands on the arc `Presents.tsx` is drawing.
 *
 * Naming the moment here rather than in the runtime is what keeps the timing
 * model in one readable place. Resolving it — turning `shatter` into 245 ms at
 * the table's current pace — happens in `runtime.ts`, because that is behind
 * the dynamic import and this file is not: `bus.ts` imports it at the app root,
 * and pulling the animation lane's budget table onto the first-paint path to
 * multiply two numbers would be a poor trade.
 *
 * NOTHING HERE DECIDES ANYTHING. A cue is a request to make a noise. It reads no
 * game state beyond asking the room what a seat's general is called, it never
 * looks at legality, and a payload it cannot parse is silence rather than a
 * throw — these objects are assembled in Lua and a package can put anything in
 * them.
 */
import { hashName, soundKey, type VoiceBank } from './clips';

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
  /** A flower or an egg crossing the table. Not an engine event — see
   *  `presentCues` for where it comes from. */
  | 'present'
  /** A path the engine sent that parses as none of the above. */
  | 'generic';

/**
 * When a cue wants to be heard, relative to the message that produced it.
 *
 * A number is milliseconds. The three names are the slay animation's own
 * phases, published by `src/room/components/anim/spectacle/budget.ts` for a
 * sound lane to land on: at the default 800 ms pace the cut is 105 ms after the
 * flash, the portrait breaks at 245 and the role seal stamps at 490. They are
 * names rather than numbers because the table's pace is a URL parameter and the
 * animation lane owns the arithmetic.
 */
export type Beatmark = number | 'cut' | 'shatter' | 'seal';

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
  /** The engine's own audio path. Played in place of the patch when the pack
   *  has it, which is nearly always. */
  readonly sample?: string;
  /** Several paths, one chosen per play. `fly1`/`fly2`, the way the QML does. */
  readonly pick?: readonly string[];
  readonly gain?: number;
  /** Collapses a burst: at most one cue per tag per window. */
  readonly tag?: string;
  /** When to play it. Absent is immediately. */
  readonly at?: Beatmark;
}

/**
 * What it costs to interrupt a line, and what it may interrupt.
 *
 * Two seats speaking over each other is the single ugliest thing this lane can
 * do, so only one general talks at a time and the ladder decides who. It is not
 * a loudness order: a compulsory skill outranks an ordinary one because a 锁定技
 * announces itself in no other way — the engine fires it with no prompt, no
 * choice and, until `lua/web/skillwire.lua` put `compulsory` on the wire, no
 * signal a client could read. For those, the voice line is the whole tell.
 *
 * `chat` IS THE ONLY RANK THAT IS NOT THE GAME TALKING. A quick chat is a
 * *player* being funny while a game is going on (`chat/quickchat.ts`), so it
 * sits below everything the engine can say: it may never cut a skill, and any
 * skill may cut it. It also cannot cut another quick chat, since `claim` only
 * yields to a strictly higher rank — which is what actually bounds a table
 * where four people spam at once to one voice at a time, whatever the per-sender
 * budget let through.
 */
export type VoiceRank = 'chat' | 'skill' | 'compulsory' | 'ult' | 'win' | 'death';

export const RANK_ORDER: Readonly<Record<VoiceRank, number>> = {
  chat: 10, skill: 20, compulsory: 26, ult: 32, win: 38, death: 44,
};

export interface VoiceCue {
  readonly kind: 'voice';
  readonly bank: VoiceBank;
  /** Candidates in `RoomLogic.js:1402`'s order: general, deputy, bare skill. */
  readonly names: readonly string[];
  /** `data.i`; -1 means any take. */
  readonly index: number;
  /** Who is speaking, so a synthesised stand-in can be pitched as them. */
  readonly general: string;
  readonly rank: VoiceRank;
  readonly at?: Beatmark;
  /**
   * What the table sounds like if nobody spoke.
   *
   * Not an error path. It is played *under* a line that has to be fetched
   * first, and *instead of* one for the 37 skill-general pairs the packs never
   * recorded — quietly in the first case, at full in the second.
   */
  readonly then: SoundCue;
}

/**
 * The soundtrack stepping aside for one moment's own music.
 *
 * `scene` in a `music` cue is where the game is; this is not that. It does not
 * change the scene, it displaces whatever the scene is playing for `ms` and
 * then hands it back — which is what makes it the right shape for the four
 * cutscenes and the wrong one for anything else.
 */
export interface ThemeCue {
  readonly kind: 'theme';
  /** A key into `themes.ts`. Unknown names are silence, not a throw. */
  readonly theme: string;
  /** How long to hold it, in ms, before the soundtrack comes back. */
  readonly ms: number;
}

export type Cue =
  | SoundCue | VoiceCue | ThemeCue
  | { readonly kind: 'music'; readonly scene: Scene };

/** What a cue needs to know that only the live room knows. */
export interface CueContext {
  /** The general on a seat, for a death line. `''` when unknown. */
  general(playerId: number): string;
  /** The viewer's role, so a game over can tell a win from a loss. `''` if none. */
  myRole(): string;
  /** The viewer's own general, for the victory line. `''` if none. */
  myGeneral(): string;
  /**
   * 锁定技 / 限定技, remembered off `Animate{InvokeSkill}`.
   *
   * `PlaySkillSound` does not carry it — `serverplayer.lua:465` sends four
   * fields and none of them is the skill's tags. `Animate{InvokeSkill}` does,
   * since `lua/web/skillwire.lua` started stamping `compulsory` on it, and
   * `events/skill.lua:81-82` sends the two back to back in one flush. So the
   * rank of a skill is known by the time its line is due, and certainly by the
   * second time the skill fires.
   */
  skillRank(skill: string): VoiceRank;
}

export const NO_CONTEXT: CueContext = {
  general: () => '',
  myRole: () => '',
  myGeneral: () => '',
  skillRank: () => 'skill',
};

/* ----------------------------------------------------------------- helpers */

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
    // The three sounds a piece of equipment makes going on, and the reason the
    // brief's example works: `audio/card/common/horse.mp3` is a horse.
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
 * An array because several things genuinely happen at once — a game ending is a
 * sting, a change of music and possibly a victory line — and because an empty
 * array is the honest answer for the two thousand messages of a game that are
 * not a sound.
 */
export function cueFor(command: string, data: unknown, ctx: CueContext = NO_CONTEXT): readonly Cue[] {
  switch (command) {
    case 'LogEvent': return logEventCues(data, ctx);
    case 'MoveCards': return moveCues(data);
    case 'Animate': return animateCues(data);
    case 'StartGame': return [
      { kind: 'sound', sound: 'gamestart', sample: 'audio/system/gamestart', tag: 'gamestart' },
      { kind: 'music', scene: 'table' },
    ];
    case 'GameOver': return gameOverCues(data, ctx);
    case 'Present': return presentCues(data);
    case 'QuickChat': return quickChatCues(data);
    case 'Cutscene': return cutsceneCues(data);
    default: return [];
  }
}

/**
 * Somebody picked one of the 23 canned lines.
 *
 * THE THIRD COMMAND HERE THAT NO SERVER SENDS — see `presentCues` and
 * `cutsceneCues`. A quick chat travels as a chat line (`chat/quickchat.ts`), so
 * the room's own chat watcher calls `roomAudio.notify('QuickChat', …)`, which is
 * why the name is not in `OBSERVED_WIRE_COMMANDS` and never will be.
 *
 * The recording is `audio/skill/fastchat_m<idx>` — a real line in the pack's
 * skill bank, 23 takes deep, addressed exactly as any skill line is, which is
 * why this is a `VoiceCue` and not a `sample` path. `bank` and `idx` come off
 * the wire rather than being recomputed here: the sender's client chose the
 * reading, and the text every receiver shows is chosen the same way, so audio
 * and caption cannot disagree.
 *
 * `general` is only ever used to pitch a stand-in, and there is deliberately no
 * stand-in: a `then` with no gain resolves to `voice-none` (`runtime.standIn`),
 * so a build whose pack lost the 46 files shows the sentence and says nothing.
 * A synthesised approximation of a joke is not a joke.
 */
export function quickChatCues(data: unknown): readonly Cue[] {
  const d = (data ?? {}) as { bank?: unknown; idx?: unknown; general?: unknown };
  const bank = str(d.bank);
  if (bank !== 'fastchat_m' && bank !== 'fastchat_f') return [];
  const idx = num(d.idx);
  if (!Number.isInteger(idx) || idx < 1) return [];
  return [{
    kind: 'voice',
    bank: 'skill',
    names: [bank],
    index: idx,
    general: str(d.general),
    rank: 'chat',
    then: { kind: 'sound', sound: 'generic', seed: 0, gain: 0, tag: 'quickchat' },
  }];
}

/**
 * One of the four generals whose signature moment has its own music.
 *
 * NOT AN ENGINE COMMAND, and the second one here that is not — see
 * `presentCues`. The moment is a general transforming, a 使命技 resolving or a
 * counter crossing 99, and working that out needs a memory of what the seat was
 * one message ago, which a pure function of one message does not have. The
 * animation lane already keeps that memory in order to draw the scene, so it
 * calls `roomAudio.notify('Cutscene', …)` itself rather than making this file
 * derive the same thing a second time and risk deriving it differently.
 *
 * The music moves and nothing else does. The character is already speaking —
 * `PlaySkillSound` fires for 忠傲, 雄姿 and 神霈 on the beat before this — and a
 * sting under a voice line is a sting over a voice line.
 */
export function cutsceneCues(data: unknown): readonly Cue[] {
  const d = (data ?? {}) as { theme?: unknown; ms?: unknown };
  const theme = str(d.theme);
  const ms = num(d.ms);
  return theme && ms > 0 ? [{ kind: 'theme', theme, ms }] : [];
}

/**
 * Somebody threw a flower or an egg.
 *
 * The one cue here that is not an engine message. A present travels over the
 * chat channel, not the wire (`components/present.ts`), so `Presents.tsx`
 * calls `roomAudio.notify('Present', …)` itself — which is why the command name
 * is not in `OBSERVED_WIRE_COMMANDS` and never will be.
 *
 * TWO SOUNDS, NOT ONE, BECAUSE IT IS TWO MOMENTS. `Flower.qml` and `Egg.qml`
 * each fire `audio/system/fly<1|2>` when the sprite launches and
 * `audio/system/{flower,egg}<1|2>` when it lands, and the whole joke is the gap
 * between them. `Presents.tsx` publishes the arc it draws — a flower is thrown
 * at once and lands 380 ms later, an egg hangs for 460 ms and lands at 980 —
 * so the impact is scheduled against those, not guessed.
 *
 * The takes are two-deep upstream and picked per throw, which is why `pick`
 * exists at all: two people throwing eggs in the same second should not be the
 * same forty milliseconds of noise twice.
 */
export function presentCues(data: unknown): readonly Cue[] {
  const kind = str((data as Record<string, unknown> | null | undefined)?.kind);
  if (!kind) return [];
  const flower = kind === 'Flower';
  // `Presents.tsx`'s own `Shape`: FLOWER lead 0 fly 380, EGG lead 460 fly 520.
  const lead = flower ? 0 : 460;
  const hit = lead + (flower ? 380 : 520);
  const impact = flower
    ? ['audio/system/flower1', 'audio/system/flower2']
    : ['audio/system/egg1', 'audio/system/egg2'];
  return [
    {
      kind: 'sound',
      sound: 'present',
      variant: flower ? 'flower' : 'egg',
      seed: hashName(flower ? 'flower' : 'egg'),
      pick: ['audio/system/fly1', 'audio/system/fly2'],
      // Under the table, not over it. A present is somebody being silly while a
      // game is going on; it must never be the loudest thing in the room.
      gain: 0.3,
      at: lead,
      tag: 'present-fly',
    },
    {
      kind: 'sound',
      sound: 'present',
      variant: flower ? 'flower' : 'egg',
      seed: hashName(flower ? 'flower' : 'egg'),
      pick: impact,
      gain: flower ? 0.34 : 0.42,
      at: hit,
      tag: 'present-hit',
    },
  ];
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
      const heavy = num(d.damageNum) > 1;
      return [{
        kind: 'sound', sound: 'damage', variant: element, heavy,
        sample: `audio/system/${str(d.damageType) || 'normal_damage'}${heavy ? '2' : ''}`,
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
        general: general || deputy,
        rank: ctx.skillRank(skill),
        // A little behind the beat: the skill banner flashes on `Animate`, and a
        // shout that lands a frame after the flash reads as caused by it, while
        // one that lands on it reads as a click.
        at: 60,
        // Pitched by skill name, so a general's signature skill has a signature
        // note. Under a line that is still loading; instead of one that does not
        // exist, alongside the synthesised utterance that stands in for it.
        then: { kind: 'sound', sound: 'skill', seed: hashName(skill), tag: `skill:${skill}` },
      }];
    }

    case 'Death': {
      const general = ctx.general(num(d.to));
      return [
        // The blow, on the frame the blade crosses the table.
        {
          kind: 'sound', sound: 'death', seed: hashName(general), tag: 'death', at: 'cut',
        },
        // The last words, as the portrait breaks. Landing them on the cut would
        // put a four-second line under a white flash; landing them on the seal
        // would leave 250 ms of nothing in the middle of the largest moment in
        // the game.
        {
          kind: 'voice',
          bank: 'death',
          names: general ? [general] : [],
          index: -1,
          general,
          rank: 'death',
          at: 'shatter',
          then: { kind: 'sound', sound: 'death', seed: hashName(general), tag: 'death-voice' },
        },
      ];
    }

    default:
      return [];
  }
}

/**
 * Drawing makes no sound.
 *
 * It used to: a paper riffle on any `DrawPile -> PlayerHand` move, one per
 * message rather than one per card. The trouble is that every turn in the game
 * opens with a draw phase, so at eight seats that sound is the metronome of the
 * whole session — it fires on every single turn, forever, and carries no
 * information, because the cards visibly arrive in the hand at the same moment.
 * The user's word for it was "annoying", and they are right: a cue that always
 * happens tells you nothing.
 *
 * Deliberately not "quieter" or "less often". A sound that survives at low gain
 * is still a sound the ear learns to expect; the honest fix for a cue with no
 * content is to remove it. Damage, judgement, deaths and skills still sound,
 * and those are the moments a player actually needs to hear.
 *
 * The function stays rather than the call site being deleted, because
 * `MoveCards` is exactly where a future card-specific cue would belong.
 */
export function moveCues(_data: unknown): readonly Cue[] {
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
 *
 * The one moment in a game with no recording anywhere in the engine — upstream
 * plays nothing for either verdict — so this is still the synthesised chime,
 * and it should stay one: a judgement wants a sound that is unmistakably up or
 * unmistakably down, which is two notes, not a performance.
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
 *
 * THE VICTORY LINE. `packages/mobile/audio/win/` holds 45 of them and the Qt
 * client reaches them from a chat message beginning `!` (`RoomPage.qml:633`) —
 * a channel this build does not have. `GameOver` does carry everything needed:
 * the winning roles, and, through the room, the viewer's own general. So the
 * viewer's general says their line if the packs recorded one, which is 38 of
 * 274 generals; everyone else gets the sting alone.
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
    const general = ctx.myGeneral();
    if (won && general) {
      cues.push({
        kind: 'voice',
        bank: 'win',
        names: [general],
        index: -1,
        general,
        rank: 'win',
        // After the sting has rung. `audio/system/win.mp3` runs about a second
        // and a half; talking over your own fanfare is not a victory.
        at: 1500,
        // No stand-in. A victory line is the one place silence is fine: the
        // fanfare already said it, and a synthesised shout under a win screen
        // reads as a bug rather than as a flourish.
        then: { kind: 'sound', sound: 'generic', seed: 0, gain: 0, tag: 'win-voice' },
      });
    }
  }
  cues.push({ kind: 'music', scene: 'over' });
  return cues;
}

export { hashName, soundKey };
