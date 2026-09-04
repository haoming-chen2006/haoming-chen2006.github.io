// Procedural sound design on top of the engine: layered noise + filters + oscillators, all scheduled
// on the AudioContext clock. Used as sweeteners under recorded samples and as full sounds where no
// recording exists (spells, owl, whispers, wind gusts, UI ticks, the exploration pad).
import type { Vec3 } from '../core/math.ts';
import { AudioEngine, dB, rand, pick, type Bus } from './engine.ts';

export interface SynthOut { pos?: Vec3 | null; bus?: Bus; volume?: number; send?: number; delay?: number; refDistance?: number; maxDistance?: number }

type NoiseColor = 'white' | 'pink' | 'brown';

export class Synth {
  private noise: Partial<Record<NoiseColor, AudioBuffer>> = {};
  constructor(public e: AudioEngine) {}
  get ctx() { return this.e.ctx; }
  get now() { return this.e.ctx.currentTime; }

  // ------------------------------------------------------------- plumbing
  /** Output stage: gain -> [panner] -> bus (+ reverb send). Returns the input node and a cleanup. */
  out(o: SynthOut = {}, life = 2): { input: GainNode; t0: number; end(t: number): void } {
    const c = this.ctx, t0 = this.now + (o.delay ?? 0);
    const input = c.createGain(); input.gain.value = o.volume ?? 1;
    let node: AudioNode = input;
    if (o.pos) {
      const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
      p.refDistance = o.refDistance ?? 2.5; p.maxDistance = o.maxDistance ?? 80; p.rolloffFactor = 1.1;
      if (p.positionX) { p.positionX.value = o.pos.x; p.positionY.value = o.pos.y; p.positionZ.value = o.pos.z; } else (p as any).setPosition(o.pos.x, o.pos.y, o.pos.z);
      node.connect(p); node = p;
    }
    const bus = o.bus ?? 'sfx';
    node.connect(this.e.buses[bus]);
    let send = o.send ?? (bus === 'ui' ? 0.06 : bus === 'amb' ? 0.15 : 0.2);
    if (o.pos && o.send == null) send = Math.min(0.5, send + this.e.distanceTo(o.pos) * 0.008);
    if (send > 0) { const sg = c.createGain(); sg.gain.value = send; node.connect(sg); sg.connect(this.e.reverbIn.small); sg.connect(this.e.reverbIn.large); }
    const end = (t: number) => { setTimeout(() => { try { input.disconnect(); node.disconnect(); } catch { /* */ } }, Math.max(0, (t - this.now) * 1000) + life * 1000); };
    return { input, t0, end };
  }
  noiseBuffer(color: NoiseColor): AudioBuffer {
    if (this.noise[color]) return this.noise[color]!;
    const sr = this.ctx.sampleRate, n = sr * 2, b = this.ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'white') d[i] = w;
      else if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25; }
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    this.noise[color] = b; return b;
  }
  /** A noise source playing from a random offset (so repeated hits don't sound identical). */
  noiseSrc(color: NoiseColor, t0: number, dur: number): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuffer(color); s.loop = true;
    s.start(t0, rand(0, 1.5)); s.stop(t0 + dur + 0.05); return s;
  }
  osc(type: OscillatorType, freq: number, t0: number, dur: number): OscillatorNode {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); o.start(t0); o.stop(t0 + dur + 0.05); return o;
  }
  filt(type: BiquadFilterType, f: number, q = 1): BiquadFilterNode { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  /** Gain with an AR/ADSR envelope (exponential decay). */
  env(t0: number, a: number, d: number, peak = 1, s = 0, r = 0, hold = 0): GainNode {
    const g = this.ctx.createGain(); const p = g.gain;
    p.setValueAtTime(0.0001, t0); p.linearRampToValueAtTime(peak, t0 + a);
    if (s > 0) { p.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t0 + a + d); p.setValueAtTime(Math.max(0.0001, peak * s), t0 + a + d + hold); p.exponentialRampToValueAtTime(0.0001, t0 + a + d + hold + r); }
    else p.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    return g;
  }

  // ------------------------------------------------------------- movement / melee
  whoosh(o: SynthOut & { heavy?: boolean; dur?: number } = {}) {
    const heavy = !!o.heavy, dur = o.dur ?? (heavy ? 0.34 : 0.2);
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * (heavy ? 0.7 : 0.45) });
    const n = this.noiseSrc(heavy ? 'pink' : 'white', t0, dur);
    const bp = this.filt('bandpass', heavy ? 900 : 2200, 1.4);
    bp.frequency.setValueAtTime(heavy ? 1100 : 2600, t0); bp.frequency.exponentialRampToValueAtTime(heavy ? 220 : 600, t0 + dur);
    const g = this.env(t0, dur * 0.3, dur * 0.7, 1);
    n.connect(bp).connect(g).connect(input);
    if (heavy) { // low body sweep
      const s = this.osc('sine', 160, t0, dur); s.frequency.exponentialRampToValueAtTime(55, t0 + dur);
      const sg = this.env(t0, 0.02, dur * 0.8, 0.35); s.connect(sg).connect(input);
    }
    end(t0 + dur);
  }
  /** Transient + body impact. kind: body | metal | bone | stone | wood */
  impact(o: SynthOut & { kind?: 'body' | 'metal' | 'bone' | 'stone' | 'wood'; power?: number } = {}) {
    const kind = o.kind ?? 'body', pw = o.power ?? 1;
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.8 });
    // click transient
    const click = this.noiseSrc('white', t0, 0.03); const cg = this.env(t0, 0.001, 0.02, 0.8 * pw);
    const chp = this.filt('highpass', kind === 'metal' ? 2500 : 900, 0.7); click.connect(chp).connect(cg).connect(input);
    // body thump
    const thump = this.osc('sine', kind === 'stone' ? 70 : 95, t0, 0.25);
    thump.frequency.setValueAtTime(kind === 'stone' ? 90 : 140, t0); thump.frequency.exponentialRampToValueAtTime(38, t0 + 0.18);
    const tg = this.env(t0, 0.003, 0.16 + 0.1 * pw, 0.9 * pw); thump.connect(tg).connect(input);
    // material layer
    if (kind === 'metal') {
      for (const r of [1, 2.76, 5.4, 8.93]) { const f = rand(520, 700) * r; const s = this.osc('sine', f, t0, 0.5); const g = this.env(t0, 0.002, 0.12 + 0.35 / r, 0.28 / r); s.connect(g).connect(input); }
    } else if (kind === 'bone') {
      const n = this.noiseSrc('white', t0, 0.12); const bp = this.filt('bandpass', rand(2200, 3800), 3); const g = this.env(t0, 0.002, 0.07, 0.6); n.connect(bp).connect(g).connect(input);
    } else if (kind === 'wood' || kind === 'stone') {
      const n = this.noiseSrc('pink', t0, 0.14); const bp = this.filt('bandpass', kind === 'wood' ? 600 : 1500, 2); const g = this.env(t0, 0.002, 0.1, 0.7); n.connect(bp).connect(g).connect(input);
    } else {
      const n = this.noiseSrc('brown', t0, 0.14); const lp = this.filt('lowpass', 900, 0.8); const g = this.env(t0, 0.002, 0.1, 0.9); n.connect(lp).connect(g).connect(input);
    }
    end(t0 + 0.6);
  }
  footstep(surface: 'grass' | 'stone' | 'water' | 'wood' | 'dirt', o: SynthOut & { running?: boolean } = {}) {
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * (o.running ? 0.5 : 0.35) });
    const dur = surface === 'water' ? 0.22 : 0.09;
    const n = this.noiseSrc(surface === 'stone' ? 'white' : 'pink', t0, dur);
    let f: BiquadFilterNode;
    if (surface === 'grass') f = this.filt('bandpass', rand(900, 1500), 0.9);
    else if (surface === 'stone') f = this.filt('highpass', 1800, 0.7);
    else if (surface === 'wood') f = this.filt('bandpass', rand(320, 520), 2.5);
    else if (surface === 'water') f = this.filt('bandpass', rand(2500, 4500), 1.2);
    else f = this.filt('lowpass', rand(1200, 1800), 0.8);
    const g = this.env(t0, 0.004, dur, 1); n.connect(f).connect(g).connect(input);
    // heel thump
    const th = this.osc('sine', surface === 'wood' ? 110 : 75, t0, 0.1); th.frequency.exponentialRampToValueAtTime(40, t0 + 0.08);
    const tg = this.env(t0, 0.002, 0.07, surface === 'water' ? 0.15 : surface === 'wood' ? 0.5 : 0.35); th.connect(tg).connect(input);
    end(t0 + 0.3);
  }
  /** Granular bone clicks: n short band-passed bursts with random spacing. */
  boneRattle(o: SynthOut & { n?: number; spread?: number } = {}) {
    const n = o.n ?? 6, { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.5 });
    let t = t0;
    for (let i = 0; i < n; i++) {
      const src = this.noiseSrc('white', t, 0.02); const bp = this.filt('bandpass', rand(1800, 5200), 6);
      const g = this.env(t, 0.001, rand(0.012, 0.03), Math.pow(0.85, i) * rand(0.6, 1)); src.connect(bp).connect(g).connect(input);
      t += rand(0.012, o.spread ?? 0.05);
    }
    end(t + 0.1);
  }
  cloth(o: SynthOut = {}) {
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.3 });
    const n = this.noiseSrc('pink', t0, 0.25); const bp = this.filt('bandpass', 1800, 0.8); bp.frequency.exponentialRampToValueAtTime(700, t0 + 0.22);
    const g = this.env(t0, 0.03, 0.2, 1); n.connect(bp).connect(g).connect(input); end(t0 + 0.4);
  }
  /** Rising tension for charged attacks / telegraphs. */
  riser(o: SynthOut & { dur?: number; dark?: boolean } = {}) {
    const dur = o.dur ?? 0.6, { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.5 });
    const n = this.noiseSrc('pink', t0, dur); const bp = this.filt('bandpass', 300, 2); bp.frequency.exponentialRampToValueAtTime(o.dark ? 900 : 2400, t0 + dur);
    const g = this.env(t0, dur * 0.85, dur * 0.15, 0.8); n.connect(bp).connect(g).connect(input);
    const s = this.osc('sawtooth', 70, t0, dur); s.frequency.exponentialRampToValueAtTime(o.dark ? 110 : 220, t0 + dur);
    const lp = this.filt('lowpass', 500, 1); const sg = this.env(t0, dur * 0.8, dur * 0.2, 0.35); s.connect(lp).connect(sg).connect(input);
    end(t0 + dur + 0.2);
  }

  // ------------------------------------------------------------- spells
  fire(o: SynthOut & { phase?: 'cast' | 'release' | 'impact'; size?: number } = {}) {
    const phase = o.phase ?? 'impact', size = o.size ?? 1;
    const dur = phase === 'cast' ? 0.5 : phase === 'release' ? 0.35 : 0.6 * size;
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.6 });
    // crackle: brown noise with random amplitude modulation, band-passed
    const n = this.noiseSrc('brown', t0, dur); const bp = this.filt('bandpass', 1200, 0.6);
    const am = this.ctx.createGain(); am.gain.value = 0.6; const lfo = this.osc('square', rand(18, 40), t0, dur); const lg = this.ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg).connect(am.gain);
    const g = phase === 'cast' ? this.env(t0, dur * 0.7, dur * 0.3, 0.8) : this.env(t0, 0.01, dur, 1);
    n.connect(bp).connect(am).connect(g).connect(input);
    // low body
    const s = this.osc('sine', phase === 'impact' ? 110 : 80, t0, dur); s.frequency.exponentialRampToValueAtTime(phase === 'impact' ? 42 : 60, t0 + dur);
    const sg = phase === 'cast' ? this.env(t0, dur * 0.7, dur * 0.3, 0.3) : this.env(t0, 0.005, dur * 0.7, 0.7 * size); s.connect(sg).connect(input);
    if (phase === 'release') this.whoosh({ ...o, heavy: false, dur: 0.25, volume: (o.volume ?? 1) * 0.6 });
    end(t0 + dur + 0.2);
  }
  frost(o: SynthOut & { phase?: 'cast' | 'release' | 'impact' } = {}) {
    const phase = o.phase ?? 'impact', dur = phase === 'cast' ? 0.6 : phase === 'release' ? 0.5 : 0.7;
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.45 });
    // high shimmer: detuned sine partials
    for (let i = 0; i < 6; i++) {
      const f = rand(2800, 7800); const s = this.osc('sine', f, t0, dur); s.detune.setValueAtTime(rand(-30, 30), t0);
      if (phase === 'impact') s.frequency.exponentialRampToValueAtTime(f * 0.6, t0 + dur);
      const g = phase === 'cast' ? this.env(t0 + i * 0.02, dur * 0.6, dur * 0.4, 0.12) : this.env(t0 + i * 0.01, 0.01, dur * rand(0.4, 1), 0.16); s.connect(g).connect(input);
    }
    const n = this.noiseSrc('white', t0, dur); const hp = this.filt('highpass', 5500, 0.7); const ng = phase === 'cast' ? this.env(t0, dur * 0.7, dur * 0.3, 0.35) : this.env(t0, 0.005, dur * 0.8, 0.5); n.connect(hp).connect(ng).connect(input);
    if (phase === 'impact') { // shatter: fast granular clicks
      let t = t0; for (let i = 0; i < 9; i++) { const c = this.noiseSrc('white', t, 0.02); const bp = this.filt('bandpass', rand(3000, 9000), 8); const g = this.env(t, 0.001, rand(0.01, 0.03), 0.5 * Math.pow(0.88, i)); c.connect(bp).connect(g).connect(input); t += rand(0.008, 0.03); }
      const s = this.osc('sine', 220, t0, 0.3); s.frequency.exponentialRampToValueAtTime(70, t0 + 0.25); const g = this.env(t0, 0.003, 0.22, 0.5); s.connect(g).connect(input);
    }
    end(t0 + dur + 0.3);
  }
  radiant(o: SynthOut & { phase?: 'cast' | 'release' | 'impact' } = {}) {
    const phase = o.phase ?? 'impact', dur = phase === 'cast' ? 0.8 : phase === 'release' ? 0.6 : 0.9;
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.4, send: 0.35 });
    if (phase !== 'impact') { // choir-ish pad: detuned oscillators through vowel formants
      const root = phase === 'cast' ? 220 : 293.66;
      for (const [ratio, type] of [[1, 'sawtooth'], [1.5, 'triangle'], [2, 'sawtooth'], [2.5, 'triangle']] as [number, OscillatorType][]) {
        for (let k = 0; k < 2; k++) {
          const s = this.osc(type, root * ratio, t0, dur); s.detune.setValueAtTime(rand(-12, 12), t0);
          const f1 = this.filt('bandpass', 700, 4), f2 = this.filt('bandpass', 1250, 4);
          const g = this.env(t0, dur * 0.45, dur * 0.55, 0.06); s.connect(f1).connect(g); s.connect(f2).connect(g); g.connect(input);
        }
      }
    }
    // bell / shimmer burst
    const strength = phase === 'impact' ? 1 : 0.5;
    for (const r of [1, 2.0, 3.01, 4.2, 5.4]) { const s = this.osc('sine', 587.33 * r, t0, dur); const g = this.env(t0, 0.005, dur / (1 + r * 0.6), 0.22 * strength / r); s.connect(g).connect(input); }
    const n = this.noiseSrc('white', t0, dur * 0.5); const hp = this.filt('highpass', 6000, 0.7); const ng = this.env(t0, 0.005, dur * 0.4, 0.2 * strength); n.connect(hp).connect(ng).connect(input);
    end(t0 + dur + 0.4);
  }
  force(o: SynthOut & { phase?: 'cast' | 'release' | 'impact'; n?: number } = {}) {
    const phase = o.phase ?? 'impact', { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.5 });
    const n = o.n ?? 1; let t = t0;
    for (let i = 0; i < n; i++) {
      const dur = phase === 'cast' ? 0.5 : 0.22;
      const s = this.osc('sine', phase === 'impact' ? 900 : 180, t, dur);
      if (phase === 'impact') s.frequency.exponentialRampToValueAtTime(140, t + dur); else s.frequency.exponentialRampToValueAtTime(phase === 'cast' ? 700 : 1400, t + dur);
      const g = phase === 'cast' ? this.env(t, dur * 0.8, dur * 0.2, 0.5) : this.env(t, 0.004, dur, 0.7); s.connect(g).connect(input);
      const nz = this.noiseSrc('white', t, dur); const bp = this.filt('bandpass', 1800, 2); bp.frequency.exponentialRampToValueAtTime(phase === 'impact' ? 400 : 3500, t + dur);
      const ng = this.env(t, 0.005, dur * 0.8, 0.35); nz.connect(bp).connect(ng).connect(input);
      t += 0.11;
    }
    end(t + 0.5);
  }
  thunder(o: SynthOut & { phase?: 'cast' | 'release' | 'impact' } = {}) {
    const phase = o.phase ?? 'release', { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.9 });
    if (phase === 'cast') { this.riser({ ...o, dur: 0.7, dark: true }); end(t0 + 1); return; }
    const s = this.osc('sine', 75, t0, 1.0); s.frequency.exponentialRampToValueAtTime(28, t0 + 0.9); const sg = this.env(t0, 0.005, 0.9, 1); s.connect(sg).connect(input);
    const n = this.noiseSrc('brown', t0, 1.2); const lp = this.filt('lowpass', 500, 0.7); lp.frequency.exponentialRampToValueAtTime(120, t0 + 1.0); const ng = this.env(t0, 0.01, 1.0, 1); n.connect(lp).connect(ng).connect(input);
    const c = this.noiseSrc('white', t0, 0.08); const cg = this.env(t0, 0.001, 0.05, 0.7); c.connect(cg).connect(input);
    end(t0 + 1.4);
  }
  necrotic(o: SynthOut & { phase?: 'cast' | 'release' | 'impact' } = {}) {
    const phase = o.phase ?? 'impact', dur = phase === 'cast' ? 0.7 : 0.6, { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.45, send: 0.4 });
    for (const f of [98, 103.8, 146.8, 155.6]) { const s = this.osc('sawtooth', f, t0, dur); const lp = this.filt('lowpass', 600, 2); const g = phase === 'cast' ? this.env(t0, dur * 0.8, dur * 0.2, 0.12) : this.env(t0, 0.01, dur, 0.14); s.connect(lp).connect(g).connect(input); }
    const n = this.noiseSrc('pink', t0, dur); const bp = this.filt('bandpass', 400, 1.5); bp.frequency.exponentialRampToValueAtTime(phase === 'cast' ? 1600 : 150, t0 + dur);
    const g = phase === 'cast' ? this.env(t0, dur * 0.85, dur * 0.15, 0.5) : this.env(t0, 0.01, dur, 0.5); n.connect(bp).connect(g).connect(input);
    end(t0 + dur + 0.3);
  }
  heal(o: SynthOut = {}) {
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.35, send: 0.4 });
    const notes = [587.33, 739.99, 880, 1174.66]; let t = t0;
    for (const f of notes) { for (const r of [1, 2.01, 3.0]) { const s = this.osc('sine', f * r, t, 0.9); const g = this.env(t, 0.01, 0.7 / r, 0.25 / r); s.connect(g).connect(input); } t += 0.09; }
    const n = this.noiseSrc('white', t0, 0.8); const hp = this.filt('highpass', 7000, 0.7); const ng = this.env(t0, 0.2, 0.6, 0.12); n.connect(hp).connect(ng).connect(input);
    end(t + 1.2);
  }
  /** Generic "buff" sparkle (rage, hunter's mark, guidance...). */
  sparkle(o: SynthOut & { dark?: boolean } = {}) {
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.3, send: 0.35 });
    const base = o.dark ? 220 : 660;
    for (let i = 0; i < 5; i++) { const f = base * Math.pow(2, pick([0, 3, 7, 10, 12]) / 12) * (i % 2 ? 2 : 1); const s = this.osc(o.dark ? 'triangle' : 'sine', f, t0 + i * 0.05, 0.6); const g = this.env(t0 + i * 0.05, 0.01, 0.5, 0.25); s.connect(g).connect(input); }
    end(t0 + 1);
  }

  // ------------------------------------------------------------- ui
  tick(o: SynthOut & { freq?: number; dur?: number } = {}) {
    const { input, t0, end } = this.out({ ...o, bus: o.bus ?? 'ui', volume: (o.volume ?? 1) * 0.3, send: 0 });
    const s = this.osc('sine', o.freq ?? 2400, t0, 0.03); const g = this.env(t0, 0.001, o.dur ?? 0.02, 1); s.connect(g).connect(input);
    end(t0 + 0.1);
  }
  /** Bell-ish chime playing a sequence of frequencies. */
  chime(freqs: number[], o: SynthOut & { spacing?: number; decay?: number } = {}) {
    const { input, t0, end } = this.out({ ...o, bus: o.bus ?? 'ui', volume: (o.volume ?? 1) * 0.35, send: o.send ?? 0.3 });
    let t = t0; const sp = o.spacing ?? 0.12, dec = o.decay ?? 0.9;
    for (const f of freqs) { for (const r of [1, 2.0, 2.99, 4.1]) { const s = this.osc('sine', f * r, t, dec + 0.2); const g = this.env(t, 0.003, dec / (1 + r * 0.5), 0.3 / r); s.connect(g).connect(input); } t += sp; }
    end(t + dec + 0.3);
  }
  thud(o: SynthOut = {}) {
    const { input, t0, end } = this.out({ ...o, bus: o.bus ?? 'ui', volume: (o.volume ?? 1) * 0.6, send: 0.1 });
    const s = this.osc('sine', 120, t0, 0.3); s.frequency.exponentialRampToValueAtTime(45, t0 + 0.25); const g = this.env(t0, 0.004, 0.25, 1); s.connect(g).connect(input);
    const n = this.noiseSrc('brown', t0, 0.1); const lp = this.filt('lowpass', 400, 0.7); const ng = this.env(t0, 0.002, 0.08, 0.5); n.connect(lp).connect(ng).connect(input);
    end(t0 + 0.5);
  }
  /** Soft swell for dialogue start/end. */
  swell(o: SynthOut & { down?: boolean } = {}) {
    const { input, t0, end } = this.out({ ...o, bus: o.bus ?? 'ui', volume: (o.volume ?? 1) * 0.18, send: 0.5 });
    const root = o.down ? 220 : 293.66;
    for (const r of [1, 1.5, 2, 3]) { const s = this.osc('triangle', root * r, t0, 1.6); s.detune.setValueAtTime(rand(-6, 6), t0); const lp = this.filt('lowpass', 1800, 0.5); const g = this.env(t0, o.down ? 0.1 : 0.7, o.down ? 1.2 : 0.8, 0.25 / r); s.connect(lp).connect(g).connect(input); }
    end(t0 + 2);
  }

  // ------------------------------------------------------------- ambience one-shots
  owl(o: SynthOut = {}) {
    const { input, t0, end } = this.out({ ...o, bus: 'amb', volume: (o.volume ?? 1) * 0.5, send: 0.45 });
    let t = t0; const f0 = rand(380, 460);
    for (const [len, gap, drop] of [[0.28, 0.16, 0.9], [0.5, 0, 0.82]]) {
      const s = this.osc('sine', f0, t, len + 0.05); s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f0 * drop, t + len);
      const vib = this.osc('sine', 5.5, t, len); const vg = this.ctx.createGain(); vg.gain.value = 6; vib.connect(vg).connect(s.frequency);
      const bp = this.filt('bandpass', f0 * 1.2, 1.5); const g = this.env(t, 0.06, len - 0.06, 0.9); s.connect(bp).connect(g).connect(input);
      const br = this.noiseSrc('pink', t, len); const bbp = this.filt('bandpass', 700, 2); const bg = this.env(t, 0.05, len - 0.05, 0.08); br.connect(bbp).connect(bg).connect(input);
      t += len + gap;
    }
    end(t + 0.5);
  }
  /** Breathy formant-swept noise: the crypt's whispers. */
  whisper(o: SynthOut & { dur?: number } = {}) {
    const dur = o.dur ?? rand(1.5, 3.5), { input, t0, end } = this.out({ ...o, bus: 'amb', volume: (o.volume ?? 1) * 0.35, send: 0.6 });
    const n = this.noiseSrc('white', t0, dur);
    const f1 = this.filt('bandpass', 900, 9), f2 = this.filt('bandpass', 2100, 12);
    const steps = Math.floor(dur / 0.12); let t = t0;
    for (let i = 0; i < steps; i++) { f1.frequency.setTargetAtTime(rand(500, 1400), t, 0.05); f2.frequency.setTargetAtTime(rand(1600, 3200), t, 0.05); t += 0.12; }
    const am = this.ctx.createGain(); am.gain.value = 0.5; const lfo = this.osc('sine', rand(4, 9), t0, dur); const lg = this.ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg).connect(am.gain);
    const g = this.env(t0, dur * 0.4, dur * 0.6, 1);
    n.connect(f1).connect(am); n.connect(f2).connect(am); am.connect(g).connect(input);
    end(t0 + dur + 0.5);
  }
  windGust(o: SynthOut & { dur?: number } = {}) {
    const dur = o.dur ?? rand(3, 7), { input, t0, end } = this.out({ ...o, bus: 'amb', volume: (o.volume ?? 1) * 0.5, send: 0.1 });
    const n = this.noiseSrc('pink', t0, dur); const lp = this.filt('lowpass', 500, 0.8);
    lp.frequency.setValueAtTime(400, t0); lp.frequency.exponentialRampToValueAtTime(rand(900, 1600), t0 + dur * 0.45); lp.frequency.exponentialRampToValueAtTime(350, t0 + dur);
    const g = this.env(t0, dur * 0.45, dur * 0.55, 1); n.connect(lp).connect(g).connect(input);
    end(t0 + dur + 0.2);
  }
  drip(o: SynthOut = {}) {
    const { input, t0, end } = this.out({ ...o, bus: 'amb', volume: (o.volume ?? 1) * 0.3, send: 0.7 });
    const f = rand(1500, 3200); const s = this.osc('sine', f, t0, 0.12); s.frequency.exponentialRampToValueAtTime(f * 0.45, t0 + 0.05);
    const g = this.env(t0, 0.002, 0.09, 1); s.connect(g).connect(input); end(t0 + 0.4);
  }
  /** Distant rumble (boulder, gate mechanism). */
  rumble(o: SynthOut & { dur?: number } = {}) {
    const dur = o.dur ?? 1.4, { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.8 });
    const n = this.noiseSrc('brown', t0, dur); const lp = this.filt('lowpass', 180, 1); const g = this.env(t0, 0.15, dur - 0.15, 1); n.connect(lp).connect(g).connect(input);
    const s = this.osc('sine', 48, t0, dur); const sg = this.env(t0, 0.1, dur - 0.1, 0.6); s.connect(sg).connect(input);
    end(t0 + dur + 0.3);
  }
  /** Potion gulps: three short lowpassed bursts with a rising pitch. */
  gulps(o: SynthOut = {}) {
    const { input, t0, end } = this.out({ ...o, volume: (o.volume ?? 1) * 0.5 });
    let t = t0 + 0.15;
    for (let i = 0; i < 3; i++) { const s = this.osc('sine', 180 + i * 40, t, 0.12); s.frequency.exponentialRampToValueAtTime(90, t + 0.1); const g = this.env(t, 0.01, 0.1, 0.7); s.connect(g).connect(input); const n = this.noiseSrc('brown', t, 0.08); const lp = this.filt('lowpass', 600, 1); const ng = this.env(t, 0.005, 0.07, 0.4); n.connect(lp).connect(ng).connect(input); t += 0.24; }
    end(t + 0.3);
  }
  breath(o: SynthOut = {}) {
    const { input, t0, end } = this.out({ ...o, bus: 'voice', volume: (o.volume ?? 1) * 0.35, send: 0.05 });
    let t = t0;
    for (let i = 0; i < 2; i++) { const n = this.noiseSrc('pink', t, 0.5); const bp = this.filt('bandpass', 1100, 1.2); bp.frequency.setValueAtTime(800, t); bp.frequency.linearRampToValueAtTime(1500, t + 0.25); bp.frequency.linearRampToValueAtTime(700, t + 0.5); const g = this.env(t, 0.18, 0.32, 1); n.connect(bp).connect(g).connect(input); t += 0.6; }
    end(t + 0.4);
  }
}

// ---------------------------------------------------------------------------------------------
/** Procedural exploration bed: a slow D-dorian pad with sparse harp/bell notes. Tempo-free. */
export class ProceduralPad {
  private out: GainNode;
  private level = 0;
  private running = false;
  private nextChord = 0;
  private nextNote = 0;
  private chordIdx = 0;
  private voices: { osc: OscillatorNode; g: GainNode }[] = [];
  private lp: BiquadFilterNode;
  // D dorian: D E F G A B C. Chords: Dm7, Fmaj7, G6, Am7, Cmaj7, Em7
  private chords = [[146.83, 174.61, 220, 261.63], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 329.63], [220, 261.63, 329.63, 392], [130.81, 164.81, 196, 246.94], [164.81, 196, 246.94, 293.66]];
  private scale = [587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.5, 1396.9];
  constructor(private s: Synth) {
    const c = s.ctx;
    this.out = c.createGain(); this.out.gain.value = 0;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 900; this.lp.Q.value = 0.4;
    this.lp.connect(this.out); this.out.connect(s.e.buses.music);
    const send = c.createGain(); send.gain.value = 0.45; this.out.connect(send); send.connect(s.e.reverbIn.small); send.connect(s.e.reverbIn.large);
  }
  setLevel(level: number, fade = 3) {
    this.level = level; const t = this.s.now;
    this.out.gain.cancelScheduledValues(t); this.out.gain.setTargetAtTime(level, t, fade / 3);
    if (level > 0 && !this.running) this.start();
  }
  private start() {
    this.running = true; const c = this.s.ctx, t = this.s.now;
    for (let i = 0; i < 4; i++) {
      const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = this.chords[0][i];
      const g = c.createGain(); g.gain.value = 0;
      o.connect(g).connect(this.lp); o.start(t);
      // slow detune LFO for movement
      const lfo = c.createOscillator(); lfo.frequency.value = rand(0.05, 0.12); const lg = c.createGain(); lg.gain.value = rand(3, 6); lfo.connect(lg).connect(o.detune); lfo.start(t);
      this.voices.push({ osc: o, g });
    }
    this.nextChord = t; this.nextNote = t + 2;
  }
  update() {
    if (!this.running) return; const t = this.s.now;
    if (this.level <= 0.0001) return;
    if (t >= this.nextChord) {
      const ch = this.chords[this.chordIdx]; this.chordIdx = (this.chordIdx + 1 + Math.floor(Math.random() * 2)) % this.chords.length;
      this.voices.forEach((v, i) => {
        v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 1.5);
        v.osc.frequency.setTargetAtTime(ch[i] * (i === 0 ? 0.5 : 1), t + 3, 0.5);
        v.g.gain.setTargetAtTime(i === 0 ? 0.08 : 0.05, t + 3.5, 2.5);
      });
      this.nextChord = t + rand(11, 17);
    }
    if (t >= this.nextNote) {
      const f = pick(this.scale);
      this.s.chime([f], { bus: 'music', volume: rand(0.15, 0.3) * this.level * 2.5, decay: rand(1.2, 2.2), send: 0.5 });
      this.nextNote = t + (Math.random() < 0.3 ? rand(0.3, 0.6) : rand(2.5, 7));
    }
  }
}
