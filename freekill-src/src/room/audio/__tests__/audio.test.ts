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
  animateCues, cueFor, gameOverCues, logEventCues, moveCues, readPath, soundKey,
  type Cue, type CueContext, type SoundCue,
} from '../cues';
import { CLIPS } from '../clips';
import { DEFAULT_SETTINGS, readSettings, resetSettings, writeSettings } from '../settings';
import { RoomAudio, type SoundSource } from '../bus';

const sound = (cues: readonly Cue[]): SoundCue => {
  const hit = cues.find((c): c is SoundCue => c.kind === 'sound');
  if (!hit) throw new Error(`no sound cue in ${JSON.stringify(cues)}`);
  return hit;
};

const CTX: CueContext = { general: (id) => (id === 3 ? 'caocao' : ''), myRole: () => 'loyalist' };

/* ------------------------------------------------------------- the licence */

describe('the licence, which is the reason any of this is synthesised', () => {
  /**
   * The audio lane was briefed to ship the engine's music and effects. Checking
   * before deploying found a live third-party copyright notice inside the set
   * that had been cleared as safe, and the same transcode fingerprint across the
   * cleared and the flagged sets. `provenance.json` has the evidence.
   *
   * This test is the guard on that decision. A future `build-audio.mjs --pack`
   * pointed at a FreeKill checkout would repopulate the index, and the diff that
   * did it would look like a build artefact rather than a licensing change.
   */
  it('ships no audio file at all', () => {
    expect(CLIPS).toEqual([]);
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
    expect(readPath('audio/card/common/horse')).toMatchObject({ sound: 'equip', variant: 'horse' });
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
    // `RoomLogic.js:1381` — `damageNum > 1` reaches for a different recording.
    const light = sound(logEventCues({ type: 'Damage', to: 2, damageType: 'fire_damage', damageNum: 1 }));
    expect(light).toMatchObject({ sound: 'damage', variant: 'fire', heavy: false });

    const heavy = sound(logEventCues({ type: 'Damage', to: 2, damageType: 'thunder_damage', damageNum: 2 }));
    expect(heavy).toMatchObject({ sound: 'damage', variant: 'thunder', heavy: true });

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
    const [cue] = logEventCues({ type: 'PlaySkillSound', name: 'fankui', i: 2, general: 'simayi', deputy: 'zhangliao' });
    expect(cue).toMatchObject({
      kind: 'voice',
      bank: 'skill',
      names: ['fankui_simayi', 'fankui_zhangliao', 'fankui'],
      index: 2,
    });
    // And the sound the public build actually makes, since it has no bank.
    expect(cue.kind === 'voice' && cue.then).toMatchObject({ sound: 'skill' });
  });

  it('asks the room which general died', () => {
    const [cue] = logEventCues({ type: 'Death', to: 3 }, CTX);
    expect(cue).toMatchObject({ kind: 'voice', bank: 'death', names: ['caocao'] });
  });

  it('is silent for a LogEvent that is not a sound', () => {
    expect(logEventCues({ type: 'Judge' })).toEqual([]);
    expect(logEventCues(null)).toEqual([]);
    expect(logEventCues({})).toEqual([]);
  });
});

/* ------------------------------------------------- the two the QML forgot */

describe('drawing and judging, which the Qt client never played', () => {
  it('sounds once per message however many cards moved', () => {
    // The opening deal is four cards to eight seats in one `MoveCards`.
    const cues = moveCues({
      merged: [
        { fromArea: 6, toArea: 1, ids: [1, 2, 3, 4] },
        { fromArea: 6, toArea: 1, ids: [5, 6, 7, 8] },
      ],
    });
    expect(cues).toHaveLength(1);
    expect(sound(cues).sound).toBe('draw');
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
});

/* ------------------------------------------------------------- game start */

describe('the ends of the game', () => {
  it('starts the table music with the game', () => {
    const cues = cueFor('StartGame', null);
    expect(cues.some((c) => c.kind === 'music' && c.scene === 'table')).toBe(true);
    expect(sound(cues).sound).toBe('gamestart');
  });

  it('tells a win from a loss the way GameOverBox does', () => {
    // `GameOverBox.qml:180` — `winner.split("+").includes(role)`.
    const asLoyalist: CueContext = { general: () => '', myRole: () => 'loyalist' };
    expect(sound(gameOverCues('lord+loyalist', asLoyalist)).sound).toBe('win');
    expect(sound(gameOverCues('rebel', asLoyalist)).sound).toBe('lose');
  });

  it('gives a draw and an observer no sting, only the music standing down', () => {
    // Upstream plays `audio/system/draw` on a drawn game, which is the *card*
    // draw sound. Not copied.
    const drawn = gameOverCues('', { general: () => '', myRole: () => 'rebel' });
    expect(drawn).toEqual([{ kind: 'music', scene: 'over' }]);

    const observing = gameOverCues('lord', { general: () => '', myRole: () => '' });
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

  it('starts silent', () => {
    expect(readSettings().enabled).toBe(false);
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('remembers a choice and clamps a nonsense one', () => {
    writeSettings({ enabled: true, music: 0.3, effects: 0.9, voice: false });
    expect(readSettings()).toEqual({ enabled: true, music: 0.3, effects: 0.9, voice: false });

    globalThis.localStorage.setItem('fk.audio', JSON.stringify({ enabled: true, music: 40, effects: -3 }));
    expect(readSettings()).toMatchObject({ enabled: true, music: 1, effects: 0 });
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

  it('falls through to the synthesised patch while voices are off', () => {
    const audio = new RoomAudio();
    expect(audio.get().voice).toBe(false);
    const store = fakeStore();
    audio.attach(store);
    store.onSound?.({ type: 'PlaySkillSound', name: 'rende', i: -1, general: 'liubei', deputy: '' });
    // Logged as the voice cue it was; resolved as the bell it became, which in
    // this build is every time.
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
    expect(audio.log.at(-1)).toMatchObject({ cue: 'voice/death' });
  });

  it('is silent, and does not throw, on a payload shaped like nothing', () => {
    const audio = new RoomAudio();
    audio.attach(fakeStore());
    expect(() => audio.notify('MoveCards', { merged: 'not an array' })).not.toThrow();
    expect(() => audio.notify('Animate', undefined)).not.toThrow();
    expect(() => audio.notify('SomethingNew', { a: 1 })).not.toThrow();
    expect(audio.log).toHaveLength(0);
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
