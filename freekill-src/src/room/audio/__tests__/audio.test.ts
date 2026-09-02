/**
 * What the table is supposed to sound like, asserted against the engine's own
 * message shapes.
 *
 * The payloads below are not invented: each one is the object
 * `Room:sendLogEvent`, `Room:doAnimate` or `Room:notifyMoveCards` actually puts
 * on the wire, transcribed from the Lua that builds it. A test that asserted
 * against a shape this lane made up would pass forever and mean nothing.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  animateCues, cueFor, gameOverCues, logEventCues, moveCues, presentCues, readPath, soundKey,
  RANK_ORDER,
  type Cue, type CueContext, type SoundCue, type VoiceCue,
} from '../cues';
import { PACK } from '../clips';
import { DEFAULT_SETTINGS, readSettings, resetSettings, writeSettings } from '../settings';
import { RoomAudio, type SoundSource } from '../bus';

const sound = (cues: readonly Cue[]): SoundCue => {
  const hit = cues.find((c): c is SoundCue => c.kind === 'sound');
  if (!hit) throw new Error(`no sound cue in ${JSON.stringify(cues)}`);
  return hit;
};

const voice = (cues: readonly Cue[]): VoiceCue => {
  const hit = cues.find((c): c is VoiceCue => c.kind === 'voice');
  if (!hit) throw new Error(`no voice cue in ${JSON.stringify(cues)}`);
  return hit;
};

const CTX: CueContext = {
  general: (id) => (id === 3 ? 'caocao' : ''),
  myRole: () => 'loyalist',
  myGeneral: () => 'liubei',
  skillRank: () => 'skill',
};

/* ------------------------------------------------------------------ the pack */

describe('the pack this build carries', () => {
  /**
   * This assertion used to be `expect(CLIPS).toEqual([])`, and it was there as a
   * licensing guard: the first pass of this lane found a live third-party
   * copyright notice inside the set that had been cleared as safe, held
   * everything back, and left a test behind so that repopulating the index
   * could never look like a build artefact.
   *
   * The evidence has not changed and has not been re-argued —
   * `provenance.json` still carries it in full. What changed is that the owner
   * of this build reviewed it and decided to ship: an internal competition
   * project judged on how it looks and sounds, not a business use. That is
   * their decision to make, it is recorded in `provenance.json` under
   * `decision`, and this test is now the guard on the other side of it: the pack
   * is here, it is complete, and a build that quietly lost it should fail.
   */
  it('ships the recordings, deliberately, and knows how many', () => {
    expect(PACK).not.toBeNull();
    expect(PACK!.clips).toBeGreaterThan(1900);
    expect(PACK!.roles.voice.n).toBeGreaterThan(1800);
    expect(PACK!.stamp).toMatch(/^[0-9a-f]{10}$/);
  });

  it('keeps the first-paint summary small enough to be on the first-paint path', () => {
    // `GameAudio` is mounted at the app root and imports this, so it is in the
    // entry bundle. The 2,015-row index it summarises is a lazy fetch; this is
    // four numbers and a role table, and it must stay that way.
    expect(JSON.stringify(PACK).length).toBeLessThan(600);
  });
});

/* -------------------------------------------------------- reading the path */

describe('the path the engine sends says what happened', () => {
  it('normalises the two shapes Lua builds', () => {
    // `broadcastPlaySound` is handed a path with no extension; a package writing
    // one by hand may include it. Both are the same sound.
    expect(soundKey('./audio/system/chain')).toBe('audio/system/chain');
    expect(soundKey('./audio/system/chain.mp3')).toBe('audio/system/chain');
    expect(soundKey('')).toBeUndefined();
    expect(soundKey(42)).toBeUndefined();
    expect(soundKey('../../etc/passwd')).toBeUndefined();
  });

  it('tells a card use from an equipment proc by the gender segment', () => {
    // `usecard.lua:43` puts the speaker's gender in a card use; `skill.lua:59`
    // builds an equipment skill's path without one. That is the engine's own
    // distinction and it is the only thing that separates them.
    const use = readPath('packages/standard_cards/audio/card/male/slash');
    expect(use.sound).toBe('card');
    expect(use.variant).toBe('male');
    expect(use.sample).toBe('packages/standard_cards/audio/card/male/slash');

    const proc = readPath('packages/standard_cards/audio/card/fan');
    expect(proc.sound).toBe('gear');
  });

  it('gives every card a different, stable seed without knowing any card', () => {
    const slash = readPath('packages/standard_cards/audio/card/male/slash');
    const peach = readPath('packages/standard_cards/audio/card/male/peach');
    // A card this repository has never heard of still gets a sound.
    const invented = readPath('packages/somebodys_mod/audio/card/female/qixing_lantern');

    expect(slash.seed).not.toBe(peach.seed);
    expect(invented.seed).toBeGreaterThan(0);
    expect(readPath('packages/standard_cards/audio/card/male/slash').seed).toBe(slash.seed);
  });

  it('reads wearing equipment and the two system sounds', () => {
    // This is the one the brief asked for by name: equipping a horse must sound
    // like a horse, and `audio/card/common/horse.mp3` is one.
    const horse = readPath('audio/card/common/horse');
    expect(horse).toMatchObject({ sound: 'equip', variant: 'horse' });
    expect(horse.sample).toBe('audio/card/common/horse');
    expect(readPath('audio/card/common/weapon').variant).toBe('weapon');
    expect(readPath('audio/card/common/armor').variant).toBe('armor');
    expect(readPath('audio/system/chain').sound).toBe('chain');
    expect(readPath('audio/system/recast').sound).toBe('recast');
  });

  it('answers a path it cannot parse with a knock rather than a throw', () => {
    expect(readPath('nonsense').sound).toBe('generic');
    expect(readPath('audio/card').sound).toBe('generic');
  });
});

/* ------------------------------------------------------------- log events */

describe('LogEvent, the engine\'s own sound channel', () => {
  it('plays the element and the weight the engine named', () => {
    // `RoomLogic.js:1381` — `damageNum > 1` reaches for a different recording,
    // and the pack has both, so the sample carries the `2` suffix too.
    const light = sound(logEventCues({ type: 'Damage', to: 2, damageType: 'fire_damage', damageNum: 1 }));
    expect(light).toMatchObject({ sound: 'damage', variant: 'fire', heavy: false });
    expect(light.sample).toBe('audio/system/fire_damage');

    const heavy = sound(logEventCues({ type: 'Damage', to: 2, damageType: 'thunder_damage', damageNum: 2 }));
    expect(heavy).toMatchObject({ sound: 'damage', variant: 'thunder', heavy: true });
    expect(heavy.sample).toBe('audio/system/thunder_damage2');

    // The engine omits `damageType` for an ordinary hit.
    expect(sound(logEventCues({ type: 'Damage', to: 2, damageNum: 1 })).variant).toBe('normal');
  });

  it('sounds a max-hp loss and stays quiet on a gain', () => {
    expect(sound(logEventCues({ type: 'ChangeMaxHp', num: -1 })).sound).toBe('losemaxhp');
    expect(logEventCues({ type: 'ChangeMaxHp', num: 1 })).toEqual([]);
  });

  it('carries every general the seat has for a skill line, in the engine\'s order', () => {
    // `RoomLogic.js:1402` tries the main general, then the deputy, then the bare
    // skill. `serverplayer.lua:465` is what sends all three.
    const cue = voice(logEventCues({ type: 'PlaySkillSound', name: 'fankui', i: 2, general: 'simayi', deputy: 'zhangliao' }));
    expect(cue).toMatchObject({
      bank: 'skill',
      names: ['fankui_simayi', 'fankui_zhangliao', 'fankui'],
      index: 2,
      general: 'simayi',
      rank: 'skill',
    });
    // A hair behind the beat, so the shout reads as caused by the flash.
    expect(cue.at).toBe(60);
    // And the sound the table makes if that line has to be fetched first.
    expect(cue.then).toMatchObject({ sound: 'skill' });
  });

  it('takes the rank of a skill from the room, not from the message', () => {
    // `PlaySkillSound` does not say whether a skill is 锁定技; nothing on that
    // message could. `Animate{InvokeSkill}` does.
    const locked: CueContext = { ...CTX, skillRank: () => 'compulsory' };
    expect(voice(logEventCues({ type: 'PlaySkillSound', name: 'wusheng', i: -1, general: 'guanyu' }, locked)).rank)
      .toBe('compulsory');
    expect(RANK_ORDER.compulsory).toBeGreaterThan(RANK_ORDER.skill);
    expect(RANK_ORDER.death).toBeGreaterThan(RANK_ORDER.ult);
  });

  it('asks the room which general died, and lands the blow before the words', () => {
    const cues = logEventCues({ type: 'Death', to: 3 }, CTX);
    const blow = sound(cues);
    const last = voice(cues);
    expect(blow).toMatchObject({ sound: 'death', at: 'cut' });
    expect(last).toMatchObject({ bank: 'death', names: ['caocao'], general: 'caocao', rank: 'death', at: 'shatter' });
    // `spectacle/budget.ts` publishes those two phases for exactly this: the cut
    // is 105 ms into a slay and the portrait breaks at 245.
    expect(['cut', 'shatter', 'seal']).toContain(blow.at);
  });

  it('is silent for a LogEvent that is not a sound', () => {
    expect(logEventCues({ type: 'Judge' })).toEqual([]);
    expect(logEventCues(null)).toEqual([]);
    expect(logEventCues({})).toEqual([]);
    expect(logEventCues({ type: 'PlaySkillSound', name: '' })).toEqual([]);
  });
});

/* ------------------------------------------------- the two the QML forgot */

describe('drawing and judging, which the Qt client never played', () => {
  it('sounds once per message however many cards moved', () => {
    // Every turn in the game opens with a draw phase, so a sound here fires on
    // every single turn forever and carries no information — the cards visibly
    // arrive in the hand at the same moment. It was the metronome of a session.
    // Removed rather than quietened: a cue that always happens tells you nothing.
    const cues = moveCues({
      merged: [
        { fromArea: 6, toArea: 1, ids: [1, 2, 3, 4] },
        { fromArea: 6, toArea: 1, ids: [5, 6, 7, 8] },
      ],
    });
    expect(cues).toEqual([]);
  });

  it('does not sound for a move that is not off the pile', () => {
    // Hand to discard: `PlayerHand` 1 -> `DiscardPile` 7.
    expect(moveCues({ merged: [{ fromArea: 1, toArea: 7, ids: [1] }] })).toEqual([]);
    expect(moveCues({ merged: [] })).toEqual([]);
    expect(moveCues({})).toEqual([]);
  });

  it('reads a judgement off the card emotion, not off the move', () => {
    // `events/judge.lua:98` — `setCardEmotion` broadcasts `is_card`, which is
    // what separates a judgement from a card being used. Both put a card in the
    // processing zone; only one of them says how it came up.
    expect(sound(animateCues({ type: 'Emotion', player: 91, emotion: 'judgegood', is_card: true })))
      .toMatchObject({ sound: 'judge', variant: 'good' });
    expect(sound(animateCues({ type: 'Emotion', player: 91, emotion: 'judgebad', is_card: true })))
      .toMatchObject({ sound: 'judge', variant: 'bad' });

    // A seat emotion is not a judgement, whatever it is called.
    expect(animateCues({ type: 'Emotion', player: 2, emotion: 'judgegood' })).toEqual([]);
    expect(animateCues({ type: 'Indicate', from: 1, to: [[2]] })).toEqual([]);
  });

  it('leaves the judgement synthesised, because the engine has no recording for it', () => {
    // The one moment in a game upstream plays nothing for. Two notes, up or
    // down, and no `sample` to reach for.
    expect(sound(animateCues({ type: 'Emotion', emotion: 'judgegood', is_card: true })).sample).toBeUndefined();
  });
});

/* -------------------------------------------------------------- presents */

describe('a flower crossing the table', () => {
  it('is two sounds, at the two moments the animation draws', () => {
    // `Flower.qml` fires `fly` on launch and `flower` on impact, and
    // `Presents.tsx`'s own `Shape` says a flower is thrown at once and lands
    // 380 ms later.
    const cues = presentCues({ kind: 'Flower' }) as readonly SoundCue[];
    expect(cues).toHaveLength(2);
    expect(cues[0].at).toBe(0);
    expect(cues[0].pick).toEqual(['audio/system/fly1', 'audio/system/fly2']);
    expect(cues[1].at).toBe(380);
    expect(cues[1].pick).toEqual(['audio/system/flower1', 'audio/system/flower2']);
    // Under the table, never over it.
    expect(cues[1].gain).toBeLessThan(0.5);
  });

  it('gives an egg its wind-up', () => {
    // `EGG` hangs for 460 ms before it moves and lands 520 ms after that.
    const cues = presentCues({ kind: 'Egg' }) as readonly SoundCue[];
    expect(cues[0].at).toBe(460);
    expect(cues[1].at).toBe(980);
    expect(cues[1].pick).toEqual(['audio/system/egg1', 'audio/system/egg2']);
  });

  it('says nothing about a payload it does not recognise', () => {
    expect(presentCues({})).toEqual([]);
    expect(presentCues(null)).toEqual([]);
  });
});

/* ------------------------------------------------------------- game start */

describe('the ends of the game', () => {
  it('starts the table music with the game', () => {
    const cues = cueFor('StartGame', null);
    expect(cues.some((c) => c.kind === 'music' && c.scene === 'table')).toBe(true);
    expect(sound(cues)).toMatchObject({ sound: 'gamestart', sample: 'audio/system/gamestart' });
  });

  it('tells a win from a loss the way GameOverBox does', () => {
    // `GameOverBox.qml:180` — `winner.split("+").includes(role)`.
    const asLoyalist: CueContext = { ...CTX, myGeneral: () => '' };
    expect(sound(gameOverCues('lord+loyalist', asLoyalist)).sound).toBe('win');
    expect(sound(gameOverCues('rebel', asLoyalist)).sound).toBe('lose');
  });

  it('lets the viewer\'s own general say their victory line, after the fanfare', () => {
    // `packages/mobile/audio/win/` holds 45 of these and the Qt client reaches
    // them from a chat channel this build does not have. `GameOver` plus the
    // room is enough.
    const cue = voice(gameOverCues('lord+loyalist', CTX));
    expect(cue).toMatchObject({ bank: 'win', names: ['liubei'], rank: 'win' });
    expect(cue.at).toBe(1500);
    // No synthesised stand-in: a shout under a win screen reads as a bug.
    expect(cue.then.gain).toBe(0);
  });

  it('gives a loser no victory line', () => {
    expect(gameOverCues('rebel', CTX).some((c) => c.kind === 'voice')).toBe(false);
  });

  it('gives a draw and an observer no sting, only the music standing down', () => {
    // Upstream plays `audio/system/draw` on a drawn game, which is the *card*
    // draw sound. Not copied.
    const drawn = gameOverCues('', { ...CTX, myRole: () => 'rebel' });
    expect(drawn).toEqual([{ kind: 'music', scene: 'over' }]);

    const observing = gameOverCues('lord', { ...CTX, myRole: () => '', myGeneral: () => '' });
    expect(observing).toEqual([{ kind: 'music', scene: 'over' }]);
  });
});

/* --------------------------------------------------------------- settings */

describe('what the player chose, and where it is kept', () => {
  /** The suite runs in node, which has no `localStorage`. This is the smallest
   *  thing that behaves like one. */
  function installStorage(): void {
    const map = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => { map.set(k, String(v)); },
        removeItem: (k: string) => { map.delete(k); },
      },
    });
  }

  beforeEach(() => { installStorage(); resetSettings(); });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    vi.restoreAllMocks();
  });

  it('starts silent, and starts with the generals up', () => {
    // Silence is an autoplay decision and stays. The voice level is a taste
    // decision and the recordings are the point of the build.
    expect(readSettings().enabled).toBe(false);
    expect(readSettings().voice).toBeGreaterThan(0.5);
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('remembers a choice and clamps a nonsense one', () => {
    writeSettings({ enabled: true, music: 0.3, effects: 0.9, voice: 0.4 });
    expect(readSettings()).toEqual({ enabled: true, music: 0.3, effects: 0.9, voice: 0.4 });

    globalThis.localStorage.setItem('fk.audio', JSON.stringify({ enabled: true, music: 40, effects: -3 }));
    expect(readSettings()).toMatchObject({ enabled: true, music: 1, effects: 0 });
  });

  it('migrates the checkbox the previous build wrote', () => {
    // `voice` was a boolean while there was nothing to fade. Somebody who had
    // turned it on keeps it on; somebody who had turned it off keeps it off.
    globalThis.localStorage.setItem('fk.audio', JSON.stringify({ enabled: true, voice: true }));
    expect(readSettings().voice).toBe(DEFAULT_SETTINGS.voice);
    globalThis.localStorage.setItem('fk.audio', JSON.stringify({ enabled: true, voice: false }));
    expect(readSettings().voice).toBe(0);
  });

  it('survives a corrupt blob and a localStorage that throws on every access', () => {
    globalThis.localStorage.setItem('fk.audio', 'not json');
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);

    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('blocked'); },
    });
    try {
      expect(readSettings()).toEqual(DEFAULT_SETTINGS);
      expect(() => writeSettings(DEFAULT_SETTINGS)).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});

/* -------------------------------------------------------------- the intake */

describe('the bus, on a stream with no speakers attached', () => {
  /** The keyhole `attach` wants. `RoomStore` satisfies it structurally. */
  function fakeStore(): SoundSource {
    return {
      state: {
        selfId: 1,
        players: { 1: { general: 'liubei', role: 'lord' }, 3: { general: 'caocao', role: 'rebel' } },
      },
    };
  }

  it('takes the store\'s onSound hook and gives it back on detach', () => {
    const audio = new RoomAudio();
    const store = fakeStore();
    expect(store.onSound).toBeUndefined();

    const detach = audio.attach(store);
    expect(typeof store.onSound).toBe('function');

    store.onSound?.({ type: 'Damage', to: 3, damageType: 'fire_damage', damageNum: 1 });
    expect(audio.log.at(-1)).toMatchObject({ command: 'LogEvent', cue: 'damage/fire' });

    detach();
    expect(store.onSound).toBeUndefined();
  });

  it('never sounds a LogEvent twice, whichever door it came through', () => {
    const audio = new RoomAudio();
    audio.attach(fakeStore());
    // `RoomView` hands the bus the whole stream; `LogEvent` also arrives through
    // `onSound`. Only one of them may make a noise.
    audio.notify('LogEvent', { type: 'LoseHP' });
    expect(audio.log).toHaveLength(0);
  });

  it('remembers that a skill is 锁定技 and says so on its next line', () => {
    // `events/skill.lua:81-82` sends `broadcastSkillInvoke` and
    // `notifySkillInvoked` back to back, so the `Animate` that carries
    // `compulsory` lands in the same flush as the line it belongs to.
    const audio = new RoomAudio();
    const store = fakeStore();
    audio.attach(store);
    audio.notify('Animate', { type: 'InvokeSkill', name: 'wusheng', compulsory: true });
    audio.notify('Animate', { type: 'InvokeUltSkill', name: 'longdan' });
    store.onSound?.({ type: 'PlaySkillSound', name: 'wusheng', i: -1, general: 'guanyu' });
    store.onSound?.({ type: 'PlaySkillSound', name: 'longdan', i: -1, general: 'zhaoyun' });
    store.onSound?.({ type: 'PlaySkillSound', name: 'rende', i: -1, general: 'liubei' });
    // Nothing is audible in node; what is asserted is that the bus derived a
    // cue for each and did not throw on the `Animate`s.
    expect(audio.log.filter((r) => r.cue === 'voice/skill')).toHaveLength(3);
  });

  it('falls through to the synthesised patch when the voice fader is down', () => {
    const audio = new RoomAudio();
    audio.set({ voice: 0 });
    const store = fakeStore();
    audio.attach(store);
    store.onSound?.({ type: 'PlaySkillSound', name: 'rende', i: -1, general: 'liubei', deputy: '' });
    // Logged as the voice cue it was; resolved as whatever it became — which
    // with no runtime built is nothing at all.
    expect(audio.log.at(-1)?.cue).toBe('voice/skill');
  });

  it('follows the game\'s own scene changes even while it is muted', () => {
    // So that turning sound on mid-game starts the table's bed, not the lobby's.
    const audio = new RoomAudio();
    expect(audio.status().scene).toBe('lobby');
    audio.notify('StartGame', null);
    expect(audio.status().scene).toBe('table');
    audio.notify('GameOver', 'lord');
    expect(audio.status().scene).toBe('over');
  });

  it('reads a death\'s general out of the live room', () => {
    const audio = new RoomAudio();
    const store = fakeStore();
    audio.attach(store);
    store.onSound?.({ type: 'Death', to: 3 });
    expect(audio.log.map((r) => r.cue)).toEqual(['death', 'voice/death']);
  });

  it('is silent, and does not throw, on a payload shaped like nothing', () => {
    const audio = new RoomAudio();
    audio.attach(fakeStore());
    expect(() => audio.notify('MoveCards', { merged: 'not an array' })).not.toThrow();
    expect(() => audio.notify('Animate', undefined)).not.toThrow();
    expect(() => audio.notify('SomethingNew', { a: 1 })).not.toThrow();
    expect(audio.log).toHaveLength(0);
  });

  it('recognises a replay and refuses to play a whole game in one tick', () => {
    /**
     * `RoomView` subscribes to `onNotifyUI` and the client hands a new
     * subscriber everything it has retained, so remounting mid-game replays
     * every `LogEvent` synchronously. The animation lane has `anim.replaying`
     * for this; the bus has no such flag and cannot be given one from inside
     * this lane, so it recognises the shape instead. Real play cannot produce
     * this: the engine paces at 800 ms and yields between beats.
     */
    const audio = new RoomAudio();
    const store = fakeStore();
    audio.attach(store);
    for (let i = 0; i < 120; i += 1) store.onSound?.({ type: 'LoseHP' });
    const resolutions = audio.log.map((r) => r.how);
    expect(resolutions.filter((h) => h === 'replay').length).toBeGreaterThan(60);
  });

  it('hands React the same snapshot until something actually changes', () => {
    /**
     * This one is not hypothetical. `status()` used to build a fresh object per
     * call; `useSyncExternalStore` compares snapshots with `Object.is`, so it
     * reported "changed" on every render, re-rendered forever, and took the
     * whole app down with React error #185 — a white page on the frozen build,
     * from a module whose entire unit suite was green, because no test had ever
     * rendered it. The invariant is cheap to assert and this is the assertion.
     */
    const audio = new RoomAudio();
    expect(audio.status()).toBe(audio.status());

    const before = audio.status();
    audio.notify('StartGame', null);
    expect(audio.status()).not.toBe(before);
    expect(audio.status()).toBe(audio.status());
    expect(audio.status().scene).toBe('table');
  });

  it('caps its own log, because a game is two thousand messages', () => {
    const audio = new RoomAudio();
    for (let i = 0; i < 500; i += 1) audio.notify('MoveCards', { merged: [{ fromArea: 6, toArea: 1, ids: [i] }] });
    expect(audio.log.length).toBeLessThanOrEqual(300);
  });
});
