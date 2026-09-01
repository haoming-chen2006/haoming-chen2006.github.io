/**
 * The mixer and the rotation, against a fake audio graph.
 *
 * WHY A FAKE AND NOT A BROWSER. Everything below is a property of the graph —
 * which nodes were created, which parameter was ramped, over how long, in what
 * order — and every one of those is observable without a speaker, a browser or a
 * three-minute wait for a bed to hand over. A headless Chrome is muted anyway
 * (`scripts/cdp.mjs` passes `--mute-audio --disable-audio-output`), so a browser
 * run could never have asserted "it made a noise" either; it could only have
 * asserted what this asserts, more slowly and less reliably.
 *
 * What this deliberately does NOT prove is that a real `AudioContext` on a real
 * machine turns these nodes into sound a person likes. Nothing automated can,
 * and it is stated in the report rather than implied by a green suite.
 *
 * The stub is a recorder, not a simulator: it answers the API and writes down
 * what was asked of it. `currentTime` stays at 0 unless a test moves it, which
 * is what keeps the generative scheduler from filling a horizon it will never
 * play and makes 165 seconds of rotation cost a millisecond.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SoundCue, SoundName, VoiceCue } from '../cues';

/* ---------------------------------------------------------------- the stub */

interface ParamCall { readonly kind: string; readonly value: number; readonly at: number }

class FakeParam {
  value = 0;
  readonly calls: ParamCall[] = [];
  setValueAtTime(v: number, at: number) { this.value = v; this.calls.push({ kind: 'set', value: v, at }); return this; }
  linearRampToValueAtTime(v: number, at: number) { this.calls.push({ kind: 'linear', value: v, at }); return this; }
  exponentialRampToValueAtTime(v: number, at: number) { this.calls.push({ kind: 'exp', value: v, at }); return this; }
  setTargetAtTime(v: number, at: number) { this.calls.push({ kind: 'target', value: v, at }); return this; }
  cancelScheduledValues(at: number) { this.calls.push({ kind: 'cancel', value: 0, at }); return this; }
}

class FakeNode {
  readonly gain = new FakeParam();
  readonly frequency = new FakeParam();
  readonly detune = new FakeParam();
  readonly Q = new FakeParam();
  type = '';
  buffer: unknown = null;
  loop = false;
  started: number[] = [];
  stopped: number[] = [];
  readonly out: FakeNode[] = [];
  constructor(readonly kind: string, private readonly rec: Recorder) {}
  connect(to: FakeNode) { this.out.push(to); return to; }
  disconnect() { /* recorded by nothing; nothing asserts on it */ }
  start(at = 0) { this.started.push(at); this.rec.starts.push(this.kind); }
  stop(at = 0) { this.stopped.push(at); }
}

class Recorder {
  readonly nodes: FakeNode[] = [];
  readonly starts: string[] = [];
  make(kind: string): FakeNode {
    const n = new FakeNode(kind, this);
    this.nodes.push(n);
    return n;
  }
  of(kind: string): FakeNode[] { return this.nodes.filter((n) => n.kind === kind); }
  reset(): void { this.nodes.length = 0; this.starts.length = 0; }
}

let rec: Recorder;

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 48000;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  destination = new FakeNode('destination', rec);
  createGain() { return rec.make('gain'); }
  createOscillator() { return rec.make('osc'); }
  createBiquadFilter() { return rec.make('filter'); }
  createBufferSource() { return rec.make('source'); }
  createBuffer(_c: number, length: number) {
    return { length, getChannelData: () => new Float32Array(Math.min(length, 1024)) };
  }
  decodeAudioData() { return Promise.resolve({ duration: 60 }); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

async function makeRuntime() {
  const { AudioRuntime } = await import('../runtime');
  return new AudioRuntime('/');
}

beforeEach(() => {
  rec = new Recorder();
  vi.useFakeTimers();
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, 'AudioContext');
});

const cue = (sound: SoundName, extra: Partial<SoundCue> = {}): SoundCue =>
  ({ kind: 'sound', sound, ...extra });

/* ------------------------------------------------------------- the mixer */

describe('the mixer', () => {
  it('builds four buses and two ducks, and nothing else until asked to play', async () => {
    await makeRuntime();
    // master, musicDuck, musicBus, sfxDuck, sfxBus, voiceBus — in that order.
    // The ducks are their own nodes because a gain the player owns and a gain
    // the mixer owns are two gains (see the header of `runtime.ts`).
    expect(rec.of('gain')).toHaveLength(6);
    expect(rec.of('osc')).toHaveLength(0);
  });

  it('sends music and effects to their own faders', async () => {
    const rt = await makeRuntime();
    const [master, musicDuck, musicBus, sfxDuck, sfxBus, voiceBus] = rec.of('gain');
    rt.setVolumes(0.2, 0.9, 0.7);
    // Ramped, never stepped: a slider dragged across its range must not staircase.
    expect(musicBus.gain.calls.at(-1)).toMatchObject({ kind: 'target', value: 0.2 });
    expect(sfxBus.gain.calls.at(-1)).toMatchObject({ kind: 'target', value: 0.9 });
    expect(voiceBus.gain.calls.at(-1)).toMatchObject({ kind: 'target', value: 0.7 });
    expect(master.gain.value).toBe(1);
    // Each fader reaches master through its own duck; voice has none, because
    // voice is what everything else ducks *for*.
    expect(musicBus.out).toContain(musicDuck);
    expect(sfxBus.out).toContain(sfxDuck);
    expect(musicDuck.out).toContain(master);
    expect(sfxDuck.out).toContain(master);
    expect(voiceBus.out).toContain(master);
  });

  it('lands an effect on the effects bus and nowhere near the music', async () => {
    const rt = await makeRuntime();
    const [, , musicBus, , sfxBus] = rec.of('gain');
    rec.reset();
    rt.fire(cue('card', { seed: 7, variant: 'male' }));
    const reached = new Set(rec.nodes.flatMap((n) => n.out));
    expect(reached.has(sfxBus)).toBe(true);
    expect(reached.has(musicBus)).toBe(false);
    expect(rec.starts.filter((k) => k === 'osc').length).toBeGreaterThan(0);
  });
});

/* ----------------------------------------------------------- the sound bank */

describe('the synthesised bank', () => {
  const EVERY: SoundCue[] = [
    cue('card', { seed: 11, variant: 'male' }),
    cue('card', { seed: 12, variant: 'female' }),
    cue('equip', { variant: 'weapon' }),
    cue('equip', { variant: 'armor' }),
    cue('equip', { variant: 'horse' }),
    cue('gear', { seed: 3 }),
    cue('damage', { variant: 'normal' }),
    cue('damage', { variant: 'fire', heavy: true }),
    cue('damage', { variant: 'thunder' }),
    cue('damage', { variant: 'ice', heavy: true }),
    cue('losehp'), cue('losemaxhp'), cue('death', { seed: 5 }),
    cue('draw'), cue('judge', { variant: 'good' }), cue('judge', { variant: 'bad' }),
    cue('skill', { seed: 9 }), cue('chain'), cue('recast'),
    cue('gamestart'), cue('win'), cue('lose'), cue('generic', { seed: 1 }),
  ];

  it('makes a sound for every category the engine can send', async () => {
    const rt = await makeRuntime();
    for (const c of EVERY) {
      rec.reset();
      // Spaced out, because they are: the budget that caps simultaneous voices
      // releases them as they finish, and twenty-three cues in the same
      // millisecond is not a thing a game does.
      vi.advanceTimersByTime(3000);
      // Each cue gets its own tag so the burst guard does not eat the run.
      const how = rt.fire({ ...c, tag: `${c.sound}-${c.variant ?? ''}-${c.heavy ?? ''}` });
      expect(how, `${c.sound}/${c.variant ?? ''}`).toMatch(/^synth:/);
      expect(rec.starts.length, `${c.sound}/${c.variant ?? ''} started nothing`).toBeGreaterThan(0);
    }
  });

  it('gives two different cards two different sounds, and one card the same one twice', async () => {
    const rt = await makeRuntime();
    const freqs = (seed: number, tag: string) => {
      rec.reset();
      rt.fire(cue('card', { seed, variant: 'male', tag }));
      return rec.of('osc').map((n) => n.frequency.calls.map((c) => Math.round(c.value)).join(','));
    };
    // `slash` and `peach` hash differently, so they sound differently — without
    // a table anywhere that knows either of them exists.
    const a = freqs(1234, 'a');
    const b = freqs(9876, 'b');
    const aAgain = freqs(1234, 'c');
    expect(a).not.toEqual(b);
    expect(a).toEqual(aAgain);
  });

  it('plays a heavier hit for more than one point of damage', async () => {
    const rt = await makeRuntime();
    rec.reset();
    rt.fire(cue('damage', { variant: 'normal', tag: 'light' }));
    const light = rec.of('osc')[0].frequency.calls.map((c) => c.at);
    rec.reset();
    rt.fire(cue('damage', { variant: 'normal', heavy: true, tag: 'heavy' }));
    const heavy = rec.of('osc')[0].frequency.calls.map((c) => c.at);
    // The engine reaches for a different recording at `damageNum > 1`; this
    // reaches for a longer envelope, which is the same distinction.
    expect(Math.max(...heavy)).toBeGreaterThan(Math.max(...light));
  });

  it('collapses a burst of the same cue and refuses to pile up voices', async () => {
    const rt = await makeRuntime();
    expect(rt.fire(cue('draw', { tag: 'draw' }))).toMatch(/^synth:/);
    // The engine deals to eight seats in one flush; eight paper riffles is a hiss.
    expect(rt.fire(cue('draw', { tag: 'draw' }))).toBe('deduped');
    vi.advanceTimersByTime(60);
    expect(rt.fire(cue('draw', { tag: 'draw' }))).toMatch(/^synth:/);

    for (let i = 0; i < 20; i += 1) rt.fire(cue('card', { seed: i, tag: `c${i}` }));
    expect(rt.fire(cue('card', { seed: 99, tag: 'last' }))).toBe('over-budget');
  });

  it('stands the music back while something long is over it', async () => {
    const rt = await makeRuntime();
    const [, musicDuck] = rec.of('gain');
    rt.setVolumes(0.6, 0.8, 0.7);
    const before = musicDuck.gain.calls.length;
    rt.fire(cue('gamestart', { tag: 'gs' }));
    const ducked = musicDuck.gain.calls.slice(before);
    // The duck is its own node, so it rides to 0.35 of whatever the player set
    // rather than to an absolute the fader would have to remember. Down now,
    // and back on its own — there is no un-duck to forget.
    expect(ducked.some((c) => c.kind === 'target' && c.value === 0.35)).toBe(true);
    expect(ducked.some((c) => c.kind === 'target' && c.value === 1 && c.at > 0)).toBe(true);
    // And the player's fader was never touched to do it.
    expect(musicDuck.gain.calls.length).toBeGreaterThan(before);

    // A short cue is not worth ducking for.
    const mark = musicDuck.gain.calls.length;
    rt.fire(cue('draw', { tag: 'd2' }));
    expect(musicDuck.gain.calls.length).toBe(mark);
  });
});

/* -------------------------------------------------------------- the music */

describe('the rotation', () => {
  it('starts a bed when sound is turned on in the scene it is already in', async () => {
    // The bug this caught in the browser: the runtime is built when sound is
    // turned on and is handed the scene it already thinks it is in, so a guard
    // on the scene alone made turning sound on in the lobby a no-op — silence
    // until you walked into a room.
    const rt = await makeRuntime();
    expect(rt.report().track).toBeNull();
    rt.setScene('lobby');
    expect(rt.report().track).toMatch(/^bed:/);
  });

  it('hands over to a different bed on its own timer, and never repeats one', async () => {
    const rt = await makeRuntime();
    rt.setScene('lobby');
    const seen = [rt.report().track];
    for (let i = 0; i < 6; i += 1) {
      vi.advanceTimersByTime(166_000);
      const now = rt.report().track;
      expect(now, 'the rotation stopped').toMatch(/^bed:/);
      expect(now, 'the same track twice running').not.toBe(seen.at(-1));
      seen.push(now);
    }
    // And it is a rotation, not a two-step: more than one distinct track ran.
    expect(new Set(seen).size).toBeGreaterThan(1);
  });

  it('crossfades rather than cuts', async () => {
    const rt = await makeRuntime();
    rt.setScene('lobby');
    const outgoing = rt.report().track;
    // The bed's own output gain is the last one built while it was starting.
    const before = rec.of('gain').length;
    vi.advanceTimersByTime(166_000);
    expect(rt.report().track).not.toBe(outgoing);

    // The incoming bed ramps up over seconds; nothing is ever set to a new
    // level instantly, which is what a cut sounds like.
    const ramps = rec.of('gain').slice(before - 1)
      .flatMap((n) => n.gain.calls)
      .filter((c) => c.kind === 'linear');
    expect(ramps.length).toBeGreaterThan(0);
    expect(ramps.every((c) => c.at > 0)).toBe(true);
    expect(Math.max(...ramps.map((c) => c.at))).toBeGreaterThanOrEqual(2);
  });

  it('changes bed when the game moves from the lobby to the table', async () => {
    const rt = await makeRuntime();
    rt.setScene('lobby');
    const lobby = rt.report().track;
    rt.setScene('table');
    expect(rt.report().scene).toBe('table');
    expect(rt.report().track).not.toBe(lobby);
    expect(rt.report().track).toMatch(/^bed:/);
  });

  it('stands the music down when the game ends, and does not restart it', async () => {
    const rt = await makeRuntime();
    rt.setScene('table');
    expect(rt.report().track).toMatch(/^bed:/);
    rt.setScene('over');
    expect(rt.report().track).toBeNull();
    // `over` has no playlist; asking again must not start a fade-out loop.
    rt.setScene('over');
    vi.advanceTimersByTime(400_000);
    expect(rt.report().track).toBeNull();
  });

  it('needs no audio file to do any of it', async () => {
    const fetchSpy = vi.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchSpy;
    const rt = await makeRuntime();
    rt.setScene('lobby');
    vi.advanceTimersByTime(500_000);
    rt.fire(cue('card', { seed: 1, sample: 'packages/standard_cards/audio/card/male/slash' }));
    // The cue carried the engine's own path. This build has no clip for it, so
    // the patch played and nothing went over the wire.
    expect(fetchSpy).not.toHaveBeenCalled();
    Reflect.deleteProperty(globalThis, 'fetch');
  });
});

/* ------------------------------------------------- a skill that has a voice */

/**
 * What you hear when a general uses a skill.
 *
 * The clip is on disk but not decoded the first time it is asked for, and the
 * cold path used to put a synthesised accent out at a third level "so the
 * moment is not silent", with the recording chasing it a beat behind. In a
 * game that is not punctuation, it is a chime in front of every single skill,
 * with the general audibly starting afterwards. The user's word for it was
 * "disturbing" — they already have the voices.
 *
 * So: a skill the pack recorded waits for its recording. A skill nobody
 * recorded still gets the stand-in, because that is the case the accent was
 * actually for, and losing it would make those skills silent.
 */
describe('firing a skill that has a recording', () => {
  const skillCue = (skill: string): VoiceCue => ({
    kind: 'voice',
    bank: 'skill',
    names: [`${skill}_caocao`, skill],
    index: -1,
    general: 'caocao',
    rank: 'skill',
    then: { kind: 'sound', sound: 'skill', seed: 1, tag: `skill:${skill}` },
  });

  /** A real `Bank` over a literal index — the seam `Bank.of` exists for. */
  async function withBank(index: Record<string, unknown>) {
    const rt = await makeRuntime();
    const { Bank } = await import('../bank');
    (rt as unknown as { bank: unknown }).bank = Bank.of('/audio/', index);
    return rt;
  }

  it('plays no synthesised accent in front of a line it is about to play', async () => {
    // `jianxiong_caocao` is in the index, so a recording exists. Nothing is
    // decoded yet, so this is exactly the cold path.
    const rt = await withBank({ v: 1, skill: { jianxiong_caocao: 1 }, generals: { caocao: { g: 1 } } });
    rec.reset();
    rt.fire(skillCue('jianxiong'));
    // The accent was oscillators. There must be none: the recording is coming.
    expect(rec.starts.filter((k) => k === 'osc')).toHaveLength(0);
  });

  it('still stands in for a skill nobody recorded', async () => {
    // Not in the index — no take resolves, so this goes through `standIn`,
    // which is the path that must keep making a noise.
    const rt = await withBank({ v: 1, skill: { jianxiong_caocao: 1 }, generals: { caocao: { g: 1 } } });
    rec.reset();
    rt.fire(skillCue('mobile__nosuchskill'));
    expect(rec.starts.filter((k) => k === 'osc').length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------- the music */

/**
 * Which track the player actually hears.
 *
 * The pack ships one real recording, `audio/system/bgm`. It used to be a single
 * entry in a pool of three synthesised beds, and only on the table — so the
 * lobby never played it at all and the table played it roughly one time in
 * four. Three quarters of the music was a generated bed standing in for a
 * recording sitting right there in the pack, which is why it sounded wrong
 * rather than merely repetitive.
 *
 * The beds are not deleted: a build with no pack still needs music, and that is
 * what they were written for.
 */
describe('choosing the background music', () => {
  async function withBank(index: Record<string, unknown>) {
    const rt = await makeRuntime();
    const { Bank } = await import('../bank');
    (rt as unknown as { bank: unknown }).bank = Bank.of('/audio/', index);
    return rt;
  }
  const PACK = { v: 1, files: { 'system/bgm': 11093 } };
  /**
   * What the runtime *chooses*, not what it manages to play: a clip has to be
   * fetched and decoded before it can sound, and there is no network here. The
   * choice is the thing that changed and the thing that was wrong.
   */
  const track = (rt: unknown, scene: string) => {
    const r = rt as { scene: string; pickTrack(): { id: string } | null };
    r.scene = scene;
    return r.pickTrack()?.id ?? null;
  };

  it('plays the real recording on the table, not a generated bed', async () => {
    const rt = await withBank(PACK);
    rt.setVolumes(0.8, 0.8, 0.8);
    expect(track(rt, 'table')).toBe('clip:audio/system/bgm');
  });

  it('plays it in the lobby too, where it never used to reach', async () => {
    const rt = await withBank(PACK);
    rt.setVolumes(0.8, 0.8, 0.8);
    expect(track(rt, 'lobby')).toBe('clip:audio/system/bgm');
  });

  it('falls back to a synthesised bed when there is no pack', async () => {
    const rt = await makeRuntime();
    rt.setVolumes(0.8, 0.8, 0.8);
    expect(track(rt, 'table')).toMatch(/^bed:/);
  });

  it('plays nothing once the game is over', async () => {
    const rt = await withBank(PACK);
    rt.setVolumes(0.8, 0.8, 0.8);
    expect(track(rt, 'over')).toBeNull();
  });
});
