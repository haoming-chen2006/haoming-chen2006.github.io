/**
 * The music that costs nothing.
 *
 * WHY THIS EXISTS. The brief asks for background music that rotates rather than
 * looping one track forever. The engine ships exactly one piece of music —
 * `audio/system/bgm.mp3`, 110 seconds, and `Room.qml:46` plays it on
 * `MediaPlayer.Infinite` — so a rotation needs material that is not in the
 * checkout. The three ways to get it are: license tracks and ship the megabytes,
 * rehost something of uncertain origin (which the provenance rule forbids
 * outright), or generate it. Generating it is the only one that is free in
 * bytes, unambiguous in licence, and never repeats.
 *
 * So: four beds, played by an oscillator graph, seeded so a bed sounds like
 * itself every time and never plays the same 150 seconds twice. Total shipped
 * weight, all four, forever: this file.
 *
 * WHAT IT PLAYS. A pentatonic mode — 宫 / 徵 / 羽, the three that carry most of
 * the guqin repertoire — held as a slow sus2 pad with a breathing filter, with
 * plucked notes falling on a loose grid above it and a filtered noise floor
 * underneath. The pluck is a triangle through a bandpass with a 900 ms decay,
 * which is about as close to a plucked string as two nodes get. `table` adds a
 * low drum on the downbeat; `lobby` does not, because a lobby with a pulse is a
 * lobby that makes people hurry.
 *
 * WHY A LOOKAHEAD SCHEDULER. Notes are scheduled against `AudioContext.
 * currentTime`, a clock that does not drift and is not affected by the main
 * thread, from a `setInterval` that runs far ahead of them. `setTimeout`-per-note
 * would put every note on the main thread's jitter, and this main thread is
 * running a Lua VM. The pattern is the standard one; the numbers are the usual
 * ones: wake every 250 ms, schedule the next 1.2 s.
 *
 * NOTHING HERE READS THE GAME. A bed knows its own seed and nothing else.
 */

/** A named bed. `seed` makes it reproducible; nothing else varies between runs. */
export interface BedSpec {
  readonly name: string;
  /** MIDI note of the mode's first degree. */
  readonly root: number;
  /** Semitone offsets. Five of them: these are pentatonic modes. */
  readonly scale: readonly number[];
  readonly bpm: number;
  /** Chance a sixteenth carries a pluck, 0..1. */
  readonly density: number;
  /** Lowpass corner for the pad, Hz. The bed's colour, more than the notes are. */
  readonly colour: number;
  /** A low drum on the downbeat. */
  readonly pulse: boolean;
  readonly seed: number;
}

/**
 * 宫 [0 2 4 7 9] is the bright one, 徵 [0 2 5 7 9] the open one, 羽 [0 3 5 7 10]
 * the minor one. Roots are low — 48..53 — because these sit under a game.
 */
export const BEDS: readonly BedSpec[] = [
  {
    name: 'courtyard',
    root: 53, scale: [0, 2, 4, 7, 9], bpm: 56, density: 0.16,
    colour: 780, pulse: false, seed: 0x51a0,
  },
  {
    name: 'rain',
    root: 50, scale: [0, 3, 5, 7, 10], bpm: 48, density: 0.13,
    colour: 620, pulse: false, seed: 0x2b17,
  },
  {
    name: 'march',
    root: 48, scale: [0, 2, 5, 7, 9], bpm: 72, density: 0.22,
    colour: 940, pulse: true, seed: 0x7c33,
  },
  {
    name: 'embers',
    root: 51, scale: [0, 3, 5, 7, 10], bpm: 60, density: 0.18,
    colour: 700, pulse: true, seed: 0x1e6d,
  },
];

export const BED_BY_NAME: ReadonlyMap<string, BedSpec> = new Map(BEDS.map((b) => [b.name, b]));

/** mulberry32. Small, fast, and the same everywhere, which is the whole point. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** Sixteen bars of pad, then the chord moves. Degrees of the mode, not chords. */
const PROGRESSION = [0, 3, 4, 2, 0, 1, 4, 3];

/** Scheduler cadence. See the header — this is the standard WebAudio lookahead. */
const TICK_MS = 250;
const HORIZON = 1.2;

/**
 * One bed, playing.
 *
 * Owns everything it created and takes itself apart on `stop()`: an
 * `AudioContext` that accumulates orphaned oscillators across a few hours of
 * rotation is a leak that shows up as a click and then as a crackle.
 */
export class Bed {
  readonly out: GainNode;
  private readonly rand: () => number;
  private readonly pad: OscillatorNode[] = [];
  private readonly padGain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly lfo: OscillatorNode;
  private readonly air: AudioBufferSourceNode | null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private next = 0;
  private step = 0;
  private stopped = false;

  constructor(private readonly ctx: AudioContext, private readonly spec: BedSpec) {
    this.rand = rng(spec.seed);
    this.out = ctx.createGain();
    this.out.gain.value = 0;

    /* ---- the pad: three voices a fifth and a ninth apart, gently detuned ---- */
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.Q.value = 0.7;
    this.padFilter.frequency.value = spec.colour;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.13;
    this.padFilter.connect(this.padGain).connect(this.out);

    // A slow sine on the filter is what stops a held chord sounding like a
    // synthesiser left switched on. 0.05 Hz is one breath every twenty seconds.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.05;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = spec.colour * 0.35;
    this.lfo.connect(lfoDepth).connect(this.padFilter.frequency);
    this.lfo.start();

    for (let i = 0; i < 3; i += 1) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.detune.value = (i - 1) * 6;
      o.connect(this.padFilter);
      o.start();
      this.pad.push(o);
    }
    this.setChord(0, ctx.currentTime);

    /* ---- the air: two seconds of noise, looped, almost entirely removed ---- */
    this.air = this.makeAir();
  }

  /** Fade in over `seconds`. Never a step: a bed appearing at full is a jolt. */
  fadeIn(target: number, seconds: number): void {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(target, t + seconds);
    if (!this.timer) {
      this.next = t + 0.1;
      this.timer = setInterval(() => this.schedule(), TICK_MS);
      this.schedule();
    }
  }

  fadeOut(seconds: number): void {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + seconds);
  }

  /** Everything this bed made, released. Safe to call twice. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const t = this.ctx.currentTime + 0.05;
    for (const o of this.pad) { try { o.stop(t); } catch { /* already stopped */ } }
    try { this.lfo.stop(t); } catch { /* already stopped */ }
    try { this.air?.stop(t); } catch { /* already stopped */ }
    setTimeout(() => { try { this.out.disconnect(); } catch { /* gone */ } }, 400);
  }

  /* ------------------------------------------------------------- internals */

  private makeAir(): AudioBufferSourceNode | null {
    try {
      const rate = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, rate * 2, rate);
      const ch = buf.getChannelData(0);
      // Brown-ish noise: white integrated and leaked. Hiss reads as a fault;
      // this reads as a room.
      let last = 0;
      for (let i = 0; i < ch.length; i += 1) {
        last = (last + (this.rand() * 2 - 1) * 0.02) * 0.996;
        ch[i] = last;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 340;
      const g = this.ctx.createGain();
      g.gain.value = 0.5;
      src.connect(f).connect(g).connect(this.out);
      src.start();
      return src;
    } catch {
      // An implementation that will not make a buffer still gets the pad.
      return null;
    }
  }

  private setChord(degree: number, at: number): void {
    const { root, scale } = this.spec;
    // Root, fifth, ninth. No third, so the mode stays open and two beds sharing
    // a root never fight over major and minor.
    const offsets = [0, 7, 14];
    for (let i = 0; i < this.pad.length; i += 1) {
      const note = root + scale[degree % scale.length] + offsets[i];
      // Eight seconds is slower than a portamento and faster than a fade; it is
      // the chord arriving rather than the chord switching.
      this.pad[i].frequency.setTargetAtTime(hz(note), at, 8);
    }
  }

  /** Fill the next `HORIZON` seconds of the grid, then return. */
  private schedule(): void {
    if (this.stopped) return;
    const beat = 60 / this.spec.bpm / 4;
    const until = this.ctx.currentTime + HORIZON;
    // A tab in the background throttles timers; catching up a minute of missed
    // sixteenths in one pass would fire a minute of notes at once.
    if (this.next < this.ctx.currentTime) this.next = this.ctx.currentTime + 0.05;
    while (this.next < until) {
      const at = this.next;
      const s = this.step;
      if (s % 64 === 0) this.setChord(PROGRESSION[(s / 64) % PROGRESSION.length], at);
      if (this.spec.pulse && s % 16 === 0) this.drum(at);
      // Downbeats get a better chance than offbeats, which is the difference
      // between a phrase and a sprinkle.
      const weight = s % 4 === 0 ? 1.6 : s % 2 === 0 ? 0.8 : 0.35;
      if (this.rand() < this.spec.density * weight) this.pluck(at);
      this.next += beat;
      this.step += 1;
    }
  }

  private pluck(at: number): void {
    const { root, scale } = this.spec;
    const octave = 12 * (2 + Math.floor(this.rand() * 2.2));
    const note = root + octave + scale[Math.floor(this.rand() * scale.length)];
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz(note);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hz(note) * 1.6;
    f.Q.value = 1.4;
    const g = this.ctx.createGain();
    const peak = 0.05 + this.rand() * 0.05;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
    o.connect(f).connect(g).connect(this.out);
    o.start(at);
    o.stop(at + 1.0);
  }

  private drum(at: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(96, at);
    o.frequency.exponentialRampToValueAtTime(44, at + 0.16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.16, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    o.connect(g).connect(this.out);
    o.start(at);
    o.stop(at + 0.55);
  }
}
