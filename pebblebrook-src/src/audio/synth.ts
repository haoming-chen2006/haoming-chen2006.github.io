/**
 * WebAudio synthesis toolkit shared by the music, the sound effects and the ambience.
 * Everything is procedural: oscillator voices with envelopes and filters, shaped noise, FM bells,
 * music-box tines, Karplus-Strong plucked strings rendered into cached buffers, and a small set of
 * soft percussion (frame drum, brush, shaker, wood block, tambourine). A voice pool refuses
 * low-priority sounds under load so nothing spams the mixer.
 */
export type Ctx = BaseAudioContext;

export const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Small fast PRNG (mulberry32) so buffers and humanisation are reproducible when seeded. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tracks live sources so we can refuse low-priority sounds under load. */
export class VoicePool {
  active = 0;
  max: number;
  constructor(max = 160) { this.max = max; }
  can(priority = 1): boolean { return this.active < this.max * (priority >= 2 ? 1 : priority >= 1 ? 0.85 : 0.6); }
  track(src: AudioScheduledSourceNode): void {
    this.active++;
    let done = false;
    const release = () => { if (!done) { done = true; this.active = Math.max(0, this.active - 1); } };
    src.addEventListener('ended', release);
    setTimeout(release, 20000);
  }
}
export const pool = new VoicePool(180);

/* ------------------------------------------------------------------ buffers */

/** Pink-tinted white noise, `seconds` long, stereo. */
export function makeNoise(ctx: Ctx, seconds = 2, seed = 1234): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const rnd = makeRng(seed);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = w * 0.55 + (b0 + b1 + b2) * 0.09;
    }
  }
  return buf;
}

/** Reverb impulse: a few early reflections then a smooth tail. */
export function makeImpulse(ctx: Ctx, seconds: number, decay: number, preDelay = 0.01, seed = 99): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const pd = Math.floor(ctx.sampleRate * preDelay);
  const rnd = makeRng(seed);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = pd; i < len; i++) {
      const t = (i - pd) / (len - pd);
      const early = i - pd < ctx.sampleRate * 0.08 && ((i - pd) % 977 === 0 || (i - pd) % 1361 === 0) ? 0.6 : 0;
      d[i] = ((rnd() * 2 - 1) * Math.pow(1 - t, decay) * 0.6 + early) * (ch ? 0.93 : 1);
    }
  }
  return buf;
}

/* ------------------------------------------------------------------- voices */

export interface Env { attack?: number; decay?: number; sustain?: number; release?: number }
export interface NoteOpts {
  t: number;
  freq: number;
  /** time the key is held; release follows */
  dur: number;
  wave?: OscillatorType;
  unison?: number;
  /** total spread in cents */
  detune?: number;
  gain?: number;
  env?: Env;
  filter?: { type?: BiquadFilterType; cutoff: number; envAmount?: number; q?: number; decay?: number; keyTrack?: number };
  vibrato?: { rate: number; depth: number; delay?: number };
  /** amplitude wobble (accordion reeds, fiddle bow pressure) */
  tremolo?: { rate: number; depth: number };
  pan?: number;
  /** sine an octave down, relative gain */
  sub?: number;
  /** frequency multipliers */
  pitchEnv?: { from: number; to: number; time: number };
  /** add a copy an octave up at this gain */
  octaveLayer?: number;
  priority?: number;
}

/** Schedule one synthesised note into `dest`. Returns the stop time. */
export function note(ctx: Ctx, dest: AudioNode, o: NoteOpts): number {
  if (!pool.can(o.priority ?? 1)) return o.t;
  const env = { attack: 0.01, decay: 0.08, sustain: 0.7, release: 0.15, ...(o.env ?? {}) };
  const t0 = o.t;
  const holdEnd = t0 + Math.max(0.01, o.dur);
  const end = holdEnd + env.release;
  const amp = ctx.createGain();
  const peak = o.gain ?? 0.2;
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(peak, t0 + env.attack);
  amp.gain.setTargetAtTime(peak * env.sustain, t0 + env.attack, Math.max(0.005, env.decay / 3));
  amp.gain.setTargetAtTime(0.0001, holdEnd, Math.max(0.005, env.release / 4));
  let chain: AudioNode = amp;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter.type ?? 'lowpass';
    f.Q.value = o.filter.q ?? 0.8;
    const base = Math.min(18000, o.filter.cutoff + (o.filter.keyTrack ?? 0) * o.freq);
    const envAmt = o.filter.envAmount ?? 0;
    f.frequency.setValueAtTime(clamp(base + envAmt, 20, 20000), t0);
    if (envAmt !== 0) f.frequency.setTargetAtTime(clamp(base, 20, 20000), t0, Math.max(0.01, o.filter.decay ?? 0.2) / 3);
    f.connect(amp);
    chain = f;
  }
  let out: AudioNode = amp;
  if (o.tremolo) {
    const tg = ctx.createGain(); tg.gain.value = 1 - o.tremolo.depth * 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = o.tremolo.rate;
    const lg = ctx.createGain(); lg.gain.value = o.tremolo.depth * 0.5;
    lfo.connect(lg); lg.connect(tg.gain); lfo.start(t0); lfo.stop(end + 0.05);
    amp.connect(tg); out = tg;
  }
  if (o.pan !== undefined && o.pan !== 0) {
    const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1);
    out.connect(p); out = p;
  }
  out.connect(dest);
  const n = Math.max(1, o.unison ?? 1);
  const spread = o.detune ?? 0;
  let vg: GainNode | null = null;
  if (o.vibrato) {
    const vib = ctx.createOscillator(); vib.frequency.value = o.vibrato.rate;
    vg = ctx.createGain(); vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(o.vibrato.depth, t0 + (o.vibrato.delay ?? 0.15));
    vib.connect(vg); vib.start(t0); vib.stop(end + 0.05);
  }
  let tracked = false;
  const startOsc = (freq: number, gainMul: number, wave: OscillatorType, det: number) => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq * (o.pitchEnv ? o.pitchEnv.from : 1), t0);
    if (o.pitchEnv) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * o.pitchEnv.to), t0 + o.pitchEnv.time);
    osc.detune.value = det;
    if (vg) vg.connect(osc.detune);
    const g = ctx.createGain(); g.gain.value = gainMul;
    osc.connect(g); g.connect(chain);
    osc.start(t0); osc.stop(end + 0.05);
    if (!tracked) { tracked = true; pool.track(osc); }
  };
  for (let i = 0; i < n; i++) {
    const det = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
    startOsc(o.freq, 1 / Math.sqrt(n), o.wave ?? 'sawtooth', det);
  }
  if (o.sub) startOsc(o.freq / 2, o.sub, 'sine', 0);
  if (o.octaveLayer) startOsc(o.freq * 2, o.octaveLayer, o.wave ?? 'sawtooth', spread * 0.3);
  return end;
}

export interface NoiseOpts {
  t: number;
  dur: number;
  gain?: number;
  attack?: number;
  filter?: { type?: BiquadFilterType; freq: number; to?: number; q?: number };
  filter2?: { type?: BiquadFilterType; freq: number; q?: number };
  pan?: number;
  rate?: number;
  /** decay shape: 1 = linear-ish, >1 faster */
  curve?: number;
  priority?: number;
  /** hold at peak for this long before decaying (default 0) */
  hold?: number;
}

/** A shaped burst of the shared noise buffer. */
export function noise(ctx: Ctx, dest: AudioNode, buf: AudioBuffer, o: NoiseOpts): void {
  if (!pool.can(o.priority ?? 1)) return;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  src.loopStart = ((o.t * 7.31) % 1.5);
  src.playbackRate.value = o.rate ?? 1;
  const g = ctx.createGain();
  const peak = o.gain ?? 0.2;
  const atk = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(peak, o.t + atk);
  g.gain.setTargetAtTime(0.0001, o.t + atk + (o.hold ?? 0), Math.max(0.004, o.dur / (3 * (o.curve ?? 1))));
  let node: AudioNode = src;
  if (o.filter) {
    const f = ctx.createBiquadFilter(); f.type = o.filter.type ?? 'lowpass'; f.Q.value = o.filter.q ?? 0.7;
    f.frequency.setValueAtTime(o.filter.freq, o.t);
    if (o.filter.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.filter.to), o.t + o.dur);
    node.connect(f); node = f;
  }
  if (o.filter2) {
    const f = ctx.createBiquadFilter(); f.type = o.filter2.type ?? 'highpass'; f.Q.value = o.filter2.q ?? 0.7; f.frequency.value = o.filter2.freq;
    node.connect(f); node = f;
  }
  node.connect(g);
  let out: AudioNode = g;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); out = p; }
  out.connect(dest);
  src.start(o.t); src.stop(o.t + atk + (o.hold ?? 0) + o.dur + 0.3);
  pool.track(src);
}

/* ------------------------------------------------------------ mallets/bells */

/** Bell-like FM tone (chapel bell, chimes). */
export function bell(ctx: Ctx, dest: AudioNode, t: number, freq: number, dur: number, gain = 0.2, ratio = 2.76, pan = 0): void {
  if (!pool.can(1)) return;
  const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = freq;
  const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * ratio;
  const mg = ctx.createGain(); mg.gain.setValueAtTime(freq * 1.6, t); mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.8);
  mod.connect(mg); mg.connect(car.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  car.connect(g);
  if (pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(dest); } else g.connect(dest);
  car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  pool.track(car);
}

/** Music-box tine: a sine with two fast-decaying inharmonic partials. */
export function tine(ctx: Ctx, dest: AudioNode, t: number, freq: number, gain = 0.2, opts: { dur?: number; pan?: number; bright?: number } = {}): void {
  if (!pool.can(1)) return;
  const dur = opts.dur ?? 1.4;
  const bright = opts.bright ?? 1;
  const out = ctx.createGain(); out.gain.value = 1;
  let dest2: AudioNode = out;
  if (opts.pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(opts.pan, -1, 1); out.connect(p); p.connect(dest); dest2 = out; } else out.connect(dest);
  const partials: [number, number, number][] = [[1, 1, dur], [4.02, 0.28 * bright, dur * 0.25], [7.15, 0.09 * bright, dur * 0.1], [2.0, 0.08, dur * 0.6]];
  let tracked = false;
  for (const [ratio, g, d] of partials) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * ratio;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(gain * g, t + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, d));
    o.connect(og); og.connect(dest2); o.start(t); o.stop(t + d + 0.05);
    if (!tracked) { tracked = true; pool.track(o); }
  }
}

/** Glockenspiel / bar chime: bar partials at 2.76 and 5.4. */
export function glock(ctx: Ctx, dest: AudioNode, t: number, freq: number, gain = 0.2, pan = 0): void {
  if (!pool.can(1)) return;
  let d: AudioNode = dest;
  if (pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(dest); d = p; }
  for (const [ratio, g, dur] of [[1, 1, 1.1], [2.76, 0.32, 0.5], [5.4, 0.12, 0.2]] as const) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * ratio;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(gain * g, t + 0.002); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(og); og.connect(d); o.start(t); o.stop(t + dur + 0.05);
    if (ratio === 1) pool.track(o);
  }
}

/* --------------------------------------------------------------- plucked */

export type PluckTimbre = 'nylon' | 'steel' | 'harp' | 'muted' | 'banjo';

const pluckCache = new Map<string, AudioBuffer>();

/**
 * Karplus-Strong string rendered once per (note, timbre) and cached: a burst of noise fed through a
 * delay line of one period with a two-point average (the damping lowpass) and a loss factor chosen for
 * a given ring time. Sounds like a plucked nylon/steel string, a harp or a palm-muted note.
 */
export function pluckBuffer(ctx: Ctx, midiNote: number, timbre: PluckTimbre = 'nylon'): AudioBuffer {
  const key = `${midiNote}:${timbre}:${ctx.sampleRate}`;
  const hit = pluckCache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const f = midi(midiNote);
  const N = Math.max(2, Math.round(sr / f));
  const ring = timbre === 'muted' ? 0.32 : timbre === 'nylon' ? 1.3 : timbre === 'banjo' ? 0.7 : 2.0;
  const seconds = Math.min(2.2, ring * 1.15 + 0.1);
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const rnd = makeRng(midiNote * 131 + timbre.length * 17);
  // excitation: white noise, pre-filtered for the softer timbres
  const soft = timbre === 'nylon' ? 0.55 : timbre === 'muted' ? 0.8 : timbre === 'harp' ? 0.35 : 0.1;
  let prev = 0;
  for (let i = 0; i < N; i++) { const w = rnd() * 2 - 1; prev = prev * soft + w * (1 - soft); d[i] = prev; }
  // per-sample loss so that the string decays ~60 dB over `ring` seconds regardless of pitch
  const loss = Math.pow(10, -3 / (f * ring));
  const blend = timbre === 'banjo' ? 0.42 : 0.5;
  for (let i = N; i < len; i++) d[i] = loss * (blend * d[i - N] + (1 - blend) * d[i - N - 1 < 0 ? 0 : i - N - 1]);
  // normalise
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  const s = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < len; i++) d[i] *= s;
  // tiny fade at the end so buffers never click
  const fade = Math.min(len, Math.floor(sr * 0.02));
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
  pluckCache.set(key, buf);
  return buf;
}

export interface PluckOpts { t: number; midi: number; gain?: number; /** hold before muting (default: let it ring) */ dur?: number; pan?: number; timbre?: PluckTimbre; priority?: number; /** lowpass cutoff (muted / distant) */ cutoff?: number }

export function pluck(ctx: Ctx, dest: AudioNode, o: PluckOpts): void {
  if (!pool.can(o.priority ?? 1)) return;
  const buf = pluckBuffer(ctx, Math.round(o.midi), o.timbre ?? 'nylon');
  const src = ctx.createBufferSource(); src.buffer = buf;
  // fractional pitch correction for non-integer midi values
  src.playbackRate.value = Math.pow(2, (o.midi - Math.round(o.midi)) / 12);
  const g = ctx.createGain();
  const peak = o.gain ?? 0.3;
  g.gain.setValueAtTime(peak, o.t);
  const end = o.dur ? o.t + o.dur : o.t + buf.duration;
  if (o.dur) g.gain.setTargetAtTime(0.0001, end, 0.03);
  let node: AudioNode = src;
  if (o.cutoff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.cutoff; f.Q.value = 0.5; node.connect(f); node = f; }
  node.connect(g);
  let out: AudioNode = g;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); out = p; }
  out.connect(dest);
  src.start(o.t); src.stop(end + 0.15);
  pool.track(src);
}

/* ------------------------------------------------------------ percussion */

/** Frame drum / bodhrán / soft kick: a sine with a fast pitch drop. */
export function frameDrum(ctx: Ctx, dest: AudioNode, t: number, freq = 85, vel = 1, long = false): void {
  if (!pool.can(1)) return;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq * 2.2, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.04); o.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.3);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + (long ? 0.5 : 0.28));
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.55);
  pool.track(o);
}

export function tom(ctx: Ctx, dest: AudioNode, t: number, freq: number, vel = 1): void {
  if (!pool.can(1)) return;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.8, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06); o.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.3);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.4);
  pool.track(o);
}

export function shaker(ctx: Ctx, dest: AudioNode, nb: AudioBuffer, t: number, vel = 1, pan = 0): void {
  noise(ctx, dest, nb, { t, dur: 0.035, gain: 0.16 * vel, attack: 0.008, filter: { type: 'highpass', freq: 6500, q: 0.6 }, filter2: { type: 'peaking', freq: 9000, q: 1.2 }, curve: 1.3, pan, priority: 0 });
}

/** A brush sweep across a snare head. */
export function brush(ctx: Ctx, dest: AudioNode, nb: AudioBuffer, t: number, vel = 1, long = false): void {
  noise(ctx, dest, nb, { t, dur: long ? 0.32 : 0.12, gain: 0.13 * vel, attack: long ? 0.12 : 0.02, filter: { type: 'bandpass', freq: 3200, q: 0.5 }, filter2: { type: 'highpass', freq: 900 }, curve: long ? 0.7 : 1, priority: 0 });
}

export function woodblock(ctx: Ctx, dest: AudioNode, t: number, vel = 1, freq = 880): void {
  if (!pool.can(0)) return;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.3, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.012);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.45 * vel, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.12);
  pool.track(o);
}

export function tambourine(ctx: Ctx, dest: AudioNode, nb: AudioBuffer, t: number, vel = 1): void {
  noise(ctx, dest, nb, { t, dur: 0.1, gain: 0.14 * vel, attack: 0.004, filter: { type: 'highpass', freq: 7000, q: 0.5 }, curve: 0.9, priority: 0 });
  for (const [f, g] of [[5200, 0.06], [6900, 0.045], [8300, 0.03]] as const) {
    if (!pool.can(0)) return;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * (1 + ((t * 13) % 1) * 0.02);
    const og = ctx.createGain(); og.gain.setValueAtTime(g * vel, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
    o.connect(hp); hp.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.15);
  }
}

/** Timpani-ish thump for stings. */
export function thump(ctx: Ctx, dest: AudioNode, t: number, freq: number, vel = 1): void {
  if (!pool.can(2)) return;
  for (const [mul, g] of [[1, 0.9], [1.5, 0.25], [2.02, 0.12]] as const) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * mul * 1.25, t); o.frequency.exponentialRampToValueAtTime(freq * mul, t + 0.05);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(g * vel, t + 0.006); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(og); og.connect(dest); o.start(t); o.stop(t + 1);
  }
}

/* ------------------------------------------------------------------ loops */

export interface Loop { gain: GainNode; stop(): void }

/** A looping noise source through a filter, with optional slow LFO on the cutoff and level. */
export function noiseLoop(ctx: Ctx, dest: AudioNode, nb: AudioBuffer, o: { filter: { type?: BiquadFilterType; freq: number; q?: number }; filter2?: { type?: BiquadFilterType; freq: number; q?: number }; lfo?: { rate: number; depth: number }; wobble?: { rate: number; depth: number }; rate?: number; pan?: number }): Loop {
  const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; src.playbackRate.value = o.rate ?? 1;
  const f = ctx.createBiquadFilter(); f.type = o.filter.type ?? 'lowpass'; f.frequency.value = o.filter.freq; f.Q.value = o.filter.q ?? 0.7;
  let node: AudioNode = f;
  src.connect(f);
  if (o.filter2) { const f2 = ctx.createBiquadFilter(); f2.type = o.filter2.type ?? 'highpass'; f2.frequency.value = o.filter2.freq; f2.Q.value = o.filter2.q ?? 0.7; node.connect(f2); node = f2; }
  const inner = ctx.createGain(); inner.gain.value = 1;
  node.connect(inner);
  const stops: (() => void)[] = [];
  if (o.lfo) {
    const l = ctx.createOscillator(); l.frequency.value = o.lfo.rate; const lg = ctx.createGain(); lg.gain.value = o.lfo.depth; l.connect(lg); lg.connect(f.frequency); l.start();
    stops.push(() => l.stop());
  }
  if (o.wobble) {
    const l = ctx.createOscillator(); l.frequency.value = o.wobble.rate; const lg = ctx.createGain(); lg.gain.value = o.wobble.depth; l.connect(lg); lg.connect(inner.gain); l.start();
    stops.push(() => l.stop());
  }
  const gain = ctx.createGain(); gain.gain.value = 0;
  let out: AudioNode = inner;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); inner.connect(p); out = p; }
  out.connect(gain); gain.connect(dest);
  src.start();
  return { gain, stop: () => { try { src.stop(); } catch { /* already stopped */ } for (const s of stops) s(); setTimeout(() => { try { gain.disconnect(); } catch { /* */ } }, 100); } };
}
