/**
 * Shared WebAudio synthesis toolkit for the soundtrack and the sound effects.
 * Everything is procedural: oscillator voices with envelopes and filters, drum synths,
 * generated noise/impulse buffers, a chorus, and a voice budget so nothing spams the mixer.
 */
export type Ctx = BaseAudioContext;

export const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

/** Tracks live sources so we can refuse low-priority sounds under load. */
export class VoicePool {
  active = 0;
  max: number;
  constructor(max = 64) { this.max = max; }
  can(priority = 1): boolean { return this.active < this.max * (priority >= 2 ? 1 : priority >= 1 ? 0.85 : 0.6); }
  track(src: AudioScheduledSourceNode): void {
    this.active++;
    let done = false;
    const release = () => { if (!done) { done = true; this.active = Math.max(0, this.active - 1); } };
    src.addEventListener('ended', release);
    // safety net in case 'ended' never fires (e.g. context suspended)
    setTimeout(release, 20000);
  }
}
export const pool = new VoicePool(220);

export function makeNoise(ctx: Ctx, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      // slightly pink-tinted white noise: less harsh than pure white
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (w * 0.55 + (b0 + b1 + b2) * 0.09);
    }
  }
  return buf;
}

export function makeImpulse(ctx: Ctx, seconds: number, decay: number, preDelay = 0.01): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const pd = Math.floor(ctx.sampleRate * preDelay);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = pd; i < len; i++) {
      const t = (i - pd) / (len - pd);
      // a few early reflections then a smooth tail
      const early = i - pd < ctx.sampleRate * 0.08 && ((i - pd) % 977 === 0 || (i - pd) % 1361 === 0) ? 0.6 : 0;
      d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.6 + early) * (ch ? 0.93 : 1);
    }
  }
  return buf;
}

export interface Chorus { input: GainNode; output: GainNode }
export function makeChorus(ctx: Ctx, rate = 0.35, depth = 0.0035, mix = 0.35): Chorus {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 1 - mix * 0.5;
  input.connect(dry); dry.connect(output);
  for (const [r, off, pan] of [[rate, 0.021, -0.6], [rate * 1.31, 0.027, 0.6]] as const) {
    const delay = ctx.createDelay(0.1);
    delay.delayTime.value = off;
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = r;
    const lg = ctx.createGain(); lg.gain.value = depth;
    lfo.connect(lg); lg.connect(delay.delayTime); lfo.start();
    const wet = ctx.createGain(); wet.gain.value = mix;
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    input.connect(delay); delay.connect(wet); wet.connect(panner); panner.connect(output);
  }
  return { input, output };
}

export interface Env { attack?: number; decay?: number; sustain?: number; release?: number }
export interface NoteOpts {
  t: number;
  freq: number;
  dur: number; // time the key is held; release follows
  wave?: OscillatorType;
  unison?: number; // number of detuned oscillators
  detune?: number; // total spread in cents
  gain?: number;
  env?: Env;
  filter?: { type?: BiquadFilterType; cutoff: number; envAmount?: number; q?: number; decay?: number; keyTrack?: number };
  vibrato?: { rate: number; depth: number; delay?: number };
  pan?: number;
  sub?: number; // sine an octave down, relative gain
  pitchEnv?: { from: number; to: number; time: number }; // frequency multipliers
  octaveLayer?: number; // add a copy an octave up at this gain
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
  if (o.pan !== undefined && o.pan !== 0) {
    const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1);
    amp.connect(p); out = p;
  }
  out.connect(dest);
  const n = Math.max(1, o.unison ?? 1);
  const spread = o.detune ?? 0;
  let vib: OscillatorNode | null = null, vg: GainNode | null = null;
  if (o.vibrato) {
    vib = ctx.createOscillator(); vib.frequency.value = o.vibrato.rate;
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
  curve?: number; // decay shape: 1 = linear-ish, >1 faster
  priority?: number;
}

/** A shaped burst of the shared noise buffer. */
export function noise(ctx: Ctx, dest: AudioNode, buf: AudioBuffer, o: NoiseOpts): void {
  if (!pool.can(o.priority ?? 1)) return;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  src.loopStart = Math.random() * 1.5;
  src.playbackRate.value = o.rate ?? 1;
  const g = ctx.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(peak, o.t + (o.attack ?? 0.004));
  g.gain.setTargetAtTime(0.0001, o.t + (o.attack ?? 0.004), Math.max(0.004, o.dur / (3 * (o.curve ?? 1))));
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
  src.start(o.t); src.stop(o.t + o.dur + 0.3);
  pool.track(src);
}

/* ---------------- drums ---------------- */

export function kick(ctx: Ctx, dest: AudioNode, t: number, vel = 1, opts: { tone?: number; long?: boolean } = {}): void {
  if (!pool.can(2)) return;
  const o = ctx.createOscillator(); o.type = 'sine';
  const tone = opts.tone ?? 1;
  o.frequency.setValueAtTime(165 * tone, t);
  o.frequency.exponentialRampToValueAtTime(48 * tone, t + 0.09);
  o.frequency.exponentialRampToValueAtTime(38 * tone, t + 0.3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(1.0 * vel, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.35 * vel, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.long ? 0.55 : 0.32));
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = (i / 127.5) - 1; curve[i] = Math.tanh(x * 1.8); }
  shaper.curve = curve;
  o.connect(g); g.connect(shaper); shaper.connect(dest);
  o.start(t); o.stop(t + 0.6);
  pool.track(o);
  // click transient
  const c = ctx.createOscillator(); c.type = 'square'; c.frequency.setValueAtTime(900, t); c.frequency.exponentialRampToValueAtTime(200, t + 0.02);
  const cg = ctx.createGain(); cg.gain.setValueAtTime(0.25 * vel, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  c.connect(cg); cg.connect(dest); c.start(t); c.stop(t + 0.05);
}

export function snare(ctx: Ctx, dest: AudioNode, buf: AudioBuffer, t: number, vel = 1, tight = false): void {
  noise(ctx, dest, buf, { t, dur: tight ? 0.11 : 0.19, gain: 0.55 * vel, filter: { type: 'bandpass', freq: 2200, q: 0.6 }, filter2: { type: 'highpass', freq: 500 }, priority: 2 });
  if (!pool.can(2)) return;
  for (const [f, g] of [[196, 0.5], [262, 0.25]] as const) {
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f * 1.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    const og = ctx.createGain(); og.gain.setValueAtTime(g * vel, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.16);
  }
}

export function hat(ctx: Ctx, dest: AudioNode, buf: AudioBuffer, t: number, vel = 1, open = false): void {
  noise(ctx, dest, buf, { t, dur: open ? 0.28 : 0.045, gain: (open ? 0.22 : 0.16) * vel, filter: { type: 'highpass', freq: 7600, q: 0.5 }, filter2: { type: 'peaking', freq: 10500, q: 1.2 }, curve: open ? 0.8 : 1.4, priority: 0 });
}

export function tom(ctx: Ctx, dest: AudioNode, t: number, freq: number, vel = 1): void {
  if (!pool.can(1)) return;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.8, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06); o.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.3);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.4);
  pool.track(o);
}

export function clap(ctx: Ctx, dest: AudioNode, buf: AudioBuffer, t: number, vel = 1): void {
  for (let i = 0; i < 3; i++) noise(ctx, dest, buf, { t: t + i * 0.011, dur: i < 2 ? 0.02 : 0.16, gain: 0.35 * vel, filter: { type: 'bandpass', freq: 1500, q: 0.9 }, priority: 1 });
}

export function ride(ctx: Ctx, dest: AudioNode, buf: AudioBuffer, t: number, vel = 1): void {
  if (!pool.can(0)) return;
  for (const f of [523 * 3.17, 523 * 4.11, 523 * 5.43]) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.045 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    o.connect(hp); hp.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.5);
  }
  noise(ctx, dest, buf, { t, dur: 0.3, gain: 0.08 * vel, filter: { type: 'highpass', freq: 9000 }, priority: 0 });
}


export function crash(ctx: Ctx, dest: AudioNode, buf: AudioBuffer, t: number, vel = 1): void {
  noise(ctx, dest, buf, { t, dur: 1.4, gain: 0.35 * vel, filter: { type: 'highpass', freq: 4500, q: 0.4 }, curve: 0.5, priority: 2 });
  noise(ctx, dest, buf, { t, dur: 0.9, gain: 0.2 * vel, filter: { type: 'bandpass', freq: 6800, q: 0.7 }, curve: 0.7, priority: 1 });
}

export function timpani(ctx: Ctx, dest: AudioNode, t: number, freq: number, vel = 1): void {
  if (!pool.can(2)) return;
  for (const [mul, g] of [[1, 0.9], [1.5, 0.25], [2.02, 0.12]] as const) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * mul * 1.25, t); o.frequency.exponentialRampToValueAtTime(freq * mul, t + 0.05);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(g * vel, t + 0.006); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(og); og.connect(dest); o.start(t); o.stop(t + 1);
  }
}

/** Bell-like FM tone (stingers, chimes). */
export function bell(ctx: Ctx, dest: AudioNode, t: number, freq: number, dur: number, gain = 0.2, ratio = 2.76): void {
  if (!pool.can(1)) return;
  const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = freq;
  const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * ratio;
  const mg = ctx.createGain(); mg.gain.setValueAtTime(freq * 1.6, t); mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.8);
  mod.connect(mg); mg.connect(car.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  car.connect(g); g.connect(dest);
  car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  pool.track(car);
}
