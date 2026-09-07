/**
 * Sound effects. Every sound is a recipe of oscillators, shaped noise, bells, tines and plucked
 * strings scheduled at play time. `Sfx.play(name, { pos })` attenuates and pans by the distance from
 * the listener set with `setListener()`. Variants (`animal:cow`, `ui:open`, `emote:happy`, ...) are
 * picked with `opts.variant`, or at random when a recipe has variants and none is given.
 *
 * Bus `sfx` names produced by the sim, the player and the renderer are all recipes here; see
 * specs/NOTES-audio.md for the full list and how to add one.
 */
import type { Vec } from '../core/types.ts';
import { bell, clamp, frameDrum, glock, makeNoise, makeRng, midi, noise, note, pluck, tine, woodblock, type Ctx } from './synth.ts';

export interface PlayOpts {
  volume?: number;
  pos?: Vec;
  variant?: string;
  /** frequency multiplier (talk blips per villager, animal size, ...) */
  pitch?: number;
  pan?: number;
}

/** What a recipe gets: a context, an output already scaled/panned, the start time and a seeded rng. */
export interface S {
  ctx: Ctx;
  out: AudioNode;
  nb: AudioBuffer;
  t: number;
  variant: string;
  pitch: number;
  rnd(): number;
}

type Recipe = (s: S) => void;

/* --------------------------------------------------------------- helpers */

const seq = (s: S, n: number, gap: number, fn: (i: number, at: number) => void): void => { for (let i = 0; i < n; i++) fn(i, s.t + i * gap); };
const pick = <T>(s: S, arr: readonly T[]): T => arr[Math.floor(s.rnd() * arr.length)];
const jit = (s: S, amount: number): number => 1 + (s.rnd() - 0.5) * 2 * amount;

/** Bird chirp species, shared with the ambience. */
export type Bird = 'robin' | 'sparrow' | 'blackbird' | 'finch' | 'dove' | 'rooster' | 'wren' | 'crow' | 'gull';
export const BIRDS: Bird[] = ['robin', 'sparrow', 'blackbird', 'finch', 'dove', 'rooster', 'wren', 'crow', 'gull'];

function chirp(s: S, species: Bird): void {
  const { ctx, out, t } = s;
  const p = s.pitch;
  const tone = (at: number, f: number, dur: number, gain: number, extra: Partial<Parameters<typeof note>[2]> = {}) =>
    note(ctx, out, { t: at, freq: f * p, dur, wave: 'sine', gain, env: { attack: 0.008, decay: 0.02, sustain: 0.85, release: 0.02 }, priority: 0, ...extra });
  switch (species) {
    case 'robin': { const n = 3 + Math.floor(s.rnd() * 3); const f0 = 3000 * jit(s, 0.15); seq(s, n, 0.075, (i, at) => tone(at, f0 * (1 - i * 0.07), 0.045, 0.05, { pitchEnv: { from: 1.15, to: 0.92, time: 0.045 } })); break; }
    case 'sparrow': { const f0 = 2600 * jit(s, 0.2); seq(s, 2, 0.11, (_i, at) => tone(at, f0, 0.05, 0.045, { pitchEnv: { from: 0.85, to: 1.12, time: 0.05 } })); break; }
    case 'blackbird': { const f0 = 1900 * jit(s, 0.1); const line = [1, 1.19, 1.06, 1.33]; seq(s, 3 + Math.floor(s.rnd() * 2), 0.13, (i, at) => tone(at, f0 * line[i % 4], 0.1, 0.05, { vibrato: { rate: 18, depth: 25, delay: 0.02 }, pitchEnv: { from: 1.03, to: 0.98, time: 0.1 } })); break; }
    case 'finch': { const f0 = 3100 * jit(s, 0.1); seq(s, 6 + Math.floor(s.rnd() * 5), 0.038, (i, at) => tone(at, f0 * (i % 2 ? 1.12 : 1), 0.02, 0.04)); break; }
    case 'wren': { const f0 = 3600 * jit(s, 0.1); seq(s, 8, 0.05, (i, at) => tone(at, f0 * (1 - (i % 3) * 0.06), 0.03, 0.035, { pitchEnv: { from: 1.2, to: 0.9, time: 0.03 } })); break; }
    case 'dove': { seq(s, 2, 0.5, (i, at) => note(ctx, out, { t: at, freq: 470 * p * (i ? 0.94 : 1), dur: i ? 0.4 : 0.28, wave: 'sine', gain: 0.07, env: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.1 }, tremolo: { rate: 11, depth: 0.55 }, pitchEnv: { from: 0.96, to: 1.02, time: 0.2 }, priority: 0 })); break; }
    case 'crow': { seq(s, 2 + Math.floor(s.rnd() * 2), 0.32, (_i, at) => note(ctx, out, { t: at, freq: 520 * p * jit(s, 0.08), dur: 0.16, wave: 'sawtooth', gain: 0.08, env: { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.05 }, filter: { type: 'bandpass', cutoff: 1300, q: 1.6 }, pitchEnv: { from: 1.1, to: 0.9, time: 0.16 }, priority: 0 })); break; }
    case 'gull': { note(ctx, out, { t, freq: 1250 * p, dur: 0.35, wave: 'sawtooth', gain: 0.05, env: { attack: 0.06, decay: 0.1, sustain: 0.9, release: 0.1 }, filter: { type: 'bandpass', cutoff: 2200, q: 2 }, pitchEnv: { from: 0.8, to: 1.15, time: 0.3 }, vibrato: { rate: 9, depth: 30, delay: 0.1 }, priority: 0 }); break; }
    case 'rooster': {
      const seg = (at: number, f0: number, f1: number, dur: number, gain: number) => note(ctx, out, { t: at, freq: f0 * p, dur, wave: 'sawtooth', unison: 2, detune: 9, gain, env: { attack: 0.03, decay: 0.05, sustain: 0.9, release: 0.06 }, filter: { type: 'bandpass', cutoff: 1400, q: 1.3 }, pitchEnv: { from: 1, to: f1 / f0, time: dur }, vibrato: { rate: 7, depth: 20, delay: 0.1 }, priority: 1 });
      seg(t, 620, 760, 0.22, 0.1); seg(t + 0.26, 780, 920, 0.26, 0.11); seg(t + 0.56, 900, 1000, 0.42, 0.12); seg(t + 1.02, 820, 560, 0.5, 0.1);
      break;
    }
  }
}

/* --------------------------------------------------------------- recipes */

export const VARIANTS: Record<string, string[]> = {
  step: ['grass', 'path', 'stone', 'wood', 'sand', 'snow', 'water', 'floor'],
  door: ['open', 'close', 'knock'],
  animal: ['cow', 'hen', 'sheep', 'dog', 'cat'],
  thunder: ['near', 'far'],
  coin: ['one', 'purse'],
  ui: ['click', 'open', 'close', 'hover', 'error', 'tab'],
  talk: ['normal', 'angry', 'sad', 'happy', 'player'],
  emote: ['happy', 'sad', 'angry', 'love', 'question', 'idea', 'sleepy', 'music', 'sweat', 'exclaim', 'sick'],
  bell: ['shop', 'hour', 'festival', 'dinner'],
  notify: ['info', 'good', 'warn'],
  quest: ['accept', 'complete', 'posted'],
  birds: BIRDS,
  weather: ['rainstart', 'gust', 'snow'],
};

export const RECIPES: Record<string, Recipe> = {
  step(s) {
    const { ctx, out, nb, t } = s;
    const v = s.variant;
    if (v === 'water') { noise(ctx, out, nb, { t, dur: 0.12, gain: 0.14, attack: 0.01, filter: { type: 'bandpass', freq: 1400 * jit(s, 0.2), q: 1 }, filter2: { freq: 400 }, curve: 1 }); return; }
    if (v === 'snow') { noise(ctx, out, nb, { t, dur: 0.09, gain: 0.12, attack: 0.02, filter: { type: 'bandpass', freq: 2600 * jit(s, 0.15), q: 0.8 }, filter2: { freq: 900 }, curve: 0.9 }); return; }
    if (v === 'wood' || v === 'floor') {
      note(ctx, out, { t, freq: 150 * jit(s, 0.12), dur: 0.025, wave: 'triangle', gain: 0.16, env: { attack: 0.001, decay: 0.03, sustain: 0.15, release: 0.05 }, pitchEnv: { from: 1.5, to: 0.8, time: 0.03 }, priority: 0 });
      noise(ctx, out, nb, { t, dur: 0.04, gain: 0.07, filter: { freq: 900 }, curve: 1.4, priority: 0 });
      return;
    }
    const cut = v === 'stone' || v === 'path' ? 2200 : v === 'sand' ? 1400 : 900;
    noise(ctx, out, nb, { t, dur: 0.05 + s.rnd() * 0.02, gain: v === 'stone' || v === 'path' ? 0.1 : 0.12, attack: 0.004, filter: { freq: cut * jit(s, 0.2), q: 0.8 }, filter2: { freq: v === 'grass' ? 120 : 260 }, curve: 1.4, priority: 0 });
    if (v === 'stone' || v === 'path') noise(ctx, out, nb, { t, dur: 0.012, gain: 0.08, filter: { type: 'highpass', freq: 3000 }, priority: 0 });
    else note(ctx, out, { t, freq: 95 * jit(s, 0.15), dur: 0.02, wave: 'sine', gain: 0.05, env: { attack: 0.002, decay: 0.03, sustain: 0.2, release: 0.03 }, priority: 0 });
  },
  door(s) {
    const { ctx, out, nb, t } = s;
    if (s.variant === 'knock') { RECIPES.knock(s); return; }
    const close = s.variant === 'close';
    if (!close) {
      noise(ctx, out, nb, { t, dur: 0.02, gain: 0.12, filter: { type: 'bandpass', freq: 2500, q: 1 } });
      note(ctx, out, { t: t + 0.01, freq: 300 * jit(s, 0.1), dur: 0.17, wave: 'sawtooth', gain: 0.045, env: { attack: 0.04, decay: 0.1, sustain: 0.6, release: 0.06 }, filter: { cutoff: 900, q: 3, envAmount: 600, decay: 0.15 }, pitchEnv: { from: 0.9, to: 1.14, time: 0.17 } });
    }
    const at = close ? t : t + 0.2;
    note(ctx, out, { t: at, freq: 140, dur: 0.05, wave: 'triangle', gain: 0.22, env: { attack: 0.002, decay: 0.05, sustain: 0.3, release: 0.08 }, pitchEnv: { from: 1.4, to: 0.8, time: 0.06 } });
    noise(ctx, out, nb, { t: at, dur: 0.07, gain: 0.16, filter: { freq: 500 }, curve: 1.1 });
  },
  knock(s) {
    const { ctx, out, nb } = s;
    seq(s, 3, 0.17, (_i, at) => {
      note(ctx, out, { t: at, freq: 170 * jit(s, 0.05), dur: 0.03, wave: 'triangle', gain: 0.3, env: { attack: 0.001, decay: 0.04, sustain: 0.1, release: 0.06 }, pitchEnv: { from: 1.5, to: 0.8, time: 0.04 } });
      noise(ctx, out, nb, { t: at, dur: 0.03, gain: 0.15, filter: { freq: 900 }, curve: 1.3 });
    });
  },
  hoe(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.12, gain: 0.2, filter: { freq: 700, to: 300 }, filter2: { freq: 120 } });
    note(ctx, out, { t, freq: 80, dur: 0.04, wave: 'sine', gain: 0.25, env: { attack: 0.002, decay: 0.04, sustain: 0.3, release: 0.06 }, pitchEnv: { from: 1.5, to: 0.7, time: 0.05 } });
    noise(ctx, out, nb, { t: t + 0.03, dur: 0.1, gain: 0.06, filter: { type: 'bandpass', freq: 1800 * jit(s, 0.2), q: 1.5 } });
  },
  till(s) { RECIPES.hoe(s); },
  water(s) {
    const { ctx, out, nb } = s;
    seq(s, 6, 0.06, (_i, at) => noise(ctx, out, nb, { t: at, dur: 0.08, gain: 0.07, attack: 0.02, filter: { type: 'bandpass', freq: 1500 + s.rnd() * 900, q: 1.2 }, filter2: { freq: 600 } }));
    seq(s, 3, 0.09, (_i, at) => note(ctx, out, { t: at + s.rnd() * 0.05, freq: 900 * jit(s, 0.3), dur: 0.03, wave: 'sine', gain: 0.03, pitchEnv: { from: 1, to: 1.7, time: 0.04 }, env: { attack: 0.004, decay: 0.02, sustain: 0.5, release: 0.02 }, priority: 0 }));
  },
  plant(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.09, gain: 0.08, filter: { type: 'bandpass', freq: 1400, q: 0.8 } });
    note(ctx, out, { t: t + 0.02, freq: 520, dur: 0.04, wave: 'sine', gain: 0.12, pitchEnv: { from: 1, to: 0.5, time: 0.05 }, env: { attack: 0.003, decay: 0.03, sustain: 0.3, release: 0.03 } });
    tine(ctx, out, t + 0.1, 880 * s.pitch, 0.05, { dur: 0.5 });
  },
  harvest(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.1, gain: 0.1, filter: { type: 'bandpass', freq: 1600, q: 0.7 } });
    noise(ctx, out, nb, { t: t + 0.05, dur: 0.015, gain: 0.18, filter: { type: 'highpass', freq: 2500 } });
    pluck(ctx, out, { t: t + 0.08, midi: 76, gain: 0.12, dur: 0.25 });
    pluck(ctx, out, { t: t + 0.16, midi: 83, gain: 0.12, dur: 0.4 });
  },
  chop(s) {
    const { ctx, out, nb, t } = s;
    note(ctx, out, { t, freq: 210 * jit(s, 0.08), dur: 0.05, wave: 'triangle', gain: 0.35, env: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.1 }, pitchEnv: { from: 1.6, to: 0.7, time: 0.05 } });
    noise(ctx, out, nb, { t, dur: 0.06, gain: 0.3, filter: { type: 'bandpass', freq: 1100, q: 0.8 } });
    noise(ctx, out, nb, { t, dur: 0.1, gain: 0.15, filter: { freq: 400 } });
    note(ctx, out, { t: t + 0.005, freq: 640 * jit(s, 0.05), dur: 0.05, wave: 'sine', gain: 0.04, env: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.05 } });
  },
  mine(s) {
    const { ctx, out, nb, t } = s;
    for (const f of [2300, 3400]) bell(ctx, out, t, f * jit(s, 0.05), 0.18, 0.11, 3.4);
    noise(ctx, out, nb, { t, dur: 0.04, gain: 0.2, filter: { type: 'bandpass', freq: 4000, q: 1 } });
    note(ctx, out, { t, freq: 120, dur: 0.03, wave: 'sine', gain: 0.25, pitchEnv: { from: 1.5, to: 0.8, time: 0.04 }, env: { attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.05 } });
    seq(s, 3, 0.045, (_i, at) => noise(ctx, out, nb, { t: at + 0.05, dur: 0.02, gain: 0.04, filter: { freq: 1500 * jit(s, 0.3) }, priority: 0 }));
  },
  splash(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.25, gain: 0.35, attack: 0.01, filter: { type: 'bandpass', freq: 1300, to: 500, q: 0.7 }, filter2: { freq: 300 } });
    note(ctx, out, { t, freq: 180, dur: 0.06, wave: 'sine', gain: 0.15, pitchEnv: { from: 1.3, to: 0.9, time: 0.06 }, env: { attack: 0.003, decay: 0.05, sustain: 0.3, release: 0.05 } });
    seq(s, 4, 0.07, (_i, at) => note(ctx, out, { t: at + 0.12, freq: 1200 + s.rnd() * 1200, dur: 0.03, wave: 'sine', gain: 0.04, pitchEnv: { from: 1, to: 1.6, time: 0.03 }, env: { attack: 0.003, decay: 0.02, sustain: 0.5, release: 0.02 }, priority: 0 }));
  },
  pickup(s) {
    const { ctx, out, t } = s;
    note(ctx, out, { t, freq: 660 * s.pitch, dur: 0.05, wave: 'square', gain: 0.08, filter: { cutoff: 1800, q: 0.7 }, env: { attack: 0.003, decay: 0.03, sustain: 0.6, release: 0.04 } });
    note(ctx, out, { t: t + 0.07, freq: 990 * s.pitch, dur: 0.07, wave: 'square', gain: 0.08, filter: { cutoff: 2200, q: 0.7 }, env: { attack: 0.003, decay: 0.03, sustain: 0.6, release: 0.06 } });
  },
  animal(s) {
    const { ctx, out, nb, t } = s;
    const v = s.variant || pick(s, ['cow', 'hen', 'sheep']);
    const p = s.pitch;
    switch (v) {
      case 'cow':
        note(ctx, out, { t, freq: 105 * p, dur: 0.55, wave: 'sawtooth', unison: 2, detune: 12, gain: 0.22, env: { attack: 0.08, decay: 0.2, sustain: 0.8, release: 0.15 }, filter: { type: 'bandpass', cutoff: 420, q: 2.5, envAmount: 300, decay: 0.4 }, vibrato: { rate: 6, depth: 15, delay: 0.15 }, pitchEnv: { from: 0.9, to: 1.05, time: 0.3 } });
        note(ctx, out, { t, freq: 105 * p, dur: 0.5, wave: 'sawtooth', gain: 0.08, env: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.15 }, filter: { type: 'bandpass', cutoff: 900, q: 3 }, pitchEnv: { from: 0.9, to: 1.05, time: 0.3 } });
        break;
      case 'hen':
        seq(s, 4, 0.09, (_i, at) => note(ctx, out, { t: at + s.rnd() * 0.02, freq: (1000 + s.rnd() * 300) * p, dur: 0.035, wave: 'square', gain: 0.07, pitchEnv: { from: 1.3, to: 0.7, time: 0.05 }, filter: { cutoff: 1800, q: 1.5 }, env: { attack: 0.003, decay: 0.03, sustain: 0.4, release: 0.03 } }));
        note(ctx, out, { t: t + 0.42, freq: 900 * p, dur: 0.1, wave: 'square', gain: 0.08, pitchEnv: { from: 1.2, to: 0.75, time: 0.1 }, filter: { cutoff: 1600, q: 1.5 }, env: { attack: 0.005, decay: 0.04, sustain: 0.6, release: 0.04 } });
        break;
      case 'sheep':
        note(ctx, out, { t, freq: 230 * p, dur: 0.45, wave: 'sawtooth', gain: 0.18, tremolo: { rate: 7, depth: 0.7 }, filter: { type: 'bandpass', cutoff: 950, q: 2 }, env: { attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.1 }, pitchEnv: { from: 1.05, to: 0.95, time: 0.4 } });
        note(ctx, out, { t, freq: 230 * p, dur: 0.45, wave: 'sawtooth', gain: 0.06, tremolo: { rate: 7, depth: 0.7 }, filter: { type: 'bandpass', cutoff: 1900, q: 3 }, env: { attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.1 } });
        break;
      case 'dog':
        seq(s, 2, 0.22, (_i, at) => { note(ctx, out, { t: at, freq: 380 * p, dur: 0.09, wave: 'sawtooth', gain: 0.14, filter: { type: 'bandpass', cutoff: 1100, q: 1.4, envAmount: 600, decay: 0.08 }, env: { attack: 0.01, decay: 0.04, sustain: 0.6, release: 0.04 }, pitchEnv: { from: 1.25, to: 0.85, time: 0.09 } }); noise(ctx, out, nb, { t: at, dur: 0.05, gain: 0.06, filter: { type: 'bandpass', freq: 1500, q: 1 } }); });
        break;
      case 'cat':
        note(ctx, out, { t, freq: 620 * p, dur: 0.5, wave: 'sawtooth', gain: 0.07, filter: { type: 'bandpass', cutoff: 1800, q: 2.2 }, env: { attack: 0.08, decay: 0.1, sustain: 0.8, release: 0.12 }, pitchEnv: { from: 0.85, to: 1.2, time: 0.25 }, vibrato: { rate: 6, depth: 25, delay: 0.2 } });
        break;
    }
  },
  thunder(s) {
    const { ctx, out, nb, t } = s;
    const near = s.variant ? s.variant === 'near' : s.rnd() < 0.4;
    if (near) noise(ctx, out, nb, { t, dur: 0.12, gain: 0.5, attack: 0.002, filter: { type: 'highpass', freq: 1200 }, curve: 1.2, priority: 2 });
    noise(ctx, out, nb, { t: t + (near ? 0.08 : 0.3), dur: 2.6, gain: near ? 0.7 : 0.4, attack: near ? 0.15 : 0.6, hold: 0.4, filter: { freq: near ? 160 : 110, to: 60, q: 0.9 }, curve: 0.5, priority: 2 });
    noise(ctx, out, nb, { t: t + 1.2, dur: 2.0, gain: 0.35, attack: 0.5, filter: { freq: 110, to: 50 }, curve: 0.5, priority: 1 });
    note(ctx, out, { t: t + 0.05, freq: 42, dur: 1.4, wave: 'sine', gain: near ? 0.4 : 0.2, env: { attack: 0.1, decay: 0.6, sustain: 0.5, release: 0.8 }, tremolo: { rate: 9, depth: 0.6 }, priority: 2 });
  },
  wind(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 2.2, gain: 0.25, attack: 0.6, hold: 0.3, filter: { freq: 500, to: 900, q: 1.2 }, filter2: { freq: 150 }, curve: 0.5 });
  },
  rain(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 3, gain: 0.25, attack: 0.5, hold: 1.5, filter: { type: 'bandpass', freq: 4000, q: 0.4 }, filter2: { freq: 1200 }, curve: 0.6 });
    seq(s, 8, 0.3, (_i, at) => RECIPES.drip({ ...s, t: at + s.rnd() * 0.25 }));
  },
  drip(s) {
    const { ctx, out, t } = s;
    note(ctx, out, { t, freq: (1500 + s.rnd() * 1500) * s.pitch, dur: 0.03, wave: 'sine', gain: 0.05, pitchEnv: { from: 0.8, to: 1.6, time: 0.035 }, env: { attack: 0.002, decay: 0.02, sustain: 0.5, release: 0.03 }, priority: 0 });
  },
  fire(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 1.2, gain: 0.12, attack: 0.2, hold: 0.4, filter: { freq: 900, q: 0.6 }, curve: 0.6 });
    seq(s, 6, 0.16, (_i, at) => RECIPES.crackle({ ...s, t: at + s.rnd() * 0.12 }));
  },
  crackle(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.012 + s.rnd() * 0.02, gain: 0.08 + s.rnd() * 0.12, filter: { type: 'highpass', freq: 1800 + s.rnd() * 2500 }, curve: 1.5, priority: 0 });
  },
  coin(s) {
    const { ctx, out, t } = s;
    bell(ctx, out, t, 2600 * s.pitch, 0.35, 0.18, 3.1);
    bell(ctx, out, t + 0.04, 3500 * s.pitch, 0.3, 0.1, 3.1);
    if (s.variant === 'purse') seq(s, 3, 0.06, (i, at) => bell(ctx, out, at + 0.1, (2200 + i * 500) * jit(s, 0.05), 0.25, 0.07, 3.1));
  },
  buy(s) {
    const { ctx, out, nb, t } = s;
    woodblock(ctx, out, t, 0.6, 600); noise(ctx, out, nb, { t, dur: 0.04, gain: 0.1, filter: { freq: 1200 } });
    RECIPES.coin({ ...s, t: t + 0.07 });
  },
  sell(s) {
    const { ctx, out, t } = s;
    bell(ctx, out, t, 3200 * s.pitch, 0.3, 0.15, 3.1);
    bell(ctx, out, t + 0.07, 2400 * s.pitch, 0.35, 0.15, 3.1);
    tine(ctx, out, t + 0.16, 1046, 0.07, { dur: 0.6 });
  },
  ui(s) {
    const { ctx, out, nb, t } = s;
    const v = s.variant || 'click';
    const blip = (at: number, f: number, dur = 0.03, gain = 0.07) => note(ctx, out, { t: at, freq: f, dur, wave: 'square', gain, filter: { cutoff: 1400, q: 0.6 }, env: { attack: 0.003, decay: 0.02, sustain: 0.6, release: 0.03 } });
    switch (v) {
      case 'click': noise(ctx, out, nb, { t, dur: 0.012, gain: 0.15, filter: { type: 'highpass', freq: 2000 } }); note(ctx, out, { t, freq: 1400, dur: 0.012, wave: 'sine', gain: 0.08, env: { attack: 0.001, decay: 0.01, sustain: 0.3, release: 0.01 } }); break;
      case 'hover': noise(ctx, out, nb, { t, dur: 0.008, gain: 0.06, filter: { type: 'highpass', freq: 3000 } }); break;
      case 'open': blip(t, 520); blip(t + 0.05, 780, 0.05); break;
      case 'close': blip(t, 780); blip(t + 0.05, 520, 0.05); break;
      case 'tab': blip(t, 660, 0.025, 0.05); break;
      case 'error': blip(t, 220, 0.06, 0.08); blip(t + 0.1, 200, 0.08, 0.08); break;
    }
  },
  talk(s) {
    const { ctx, out, t } = s;
    const v = s.variant || 'normal';
    const base = 260 * s.pitch;
    const n = 2 + Math.floor(s.rnd() * 2);
    const wave: OscillatorType = v === 'angry' ? 'sawtooth' : 'triangle';
    for (let i = 0; i < n; i++) {
      const dir = v === 'sad' ? 1 - i * 0.06 : v === 'happy' ? 1 + i * 0.07 : 1;
      note(ctx, out, { t: t + i * 0.075, freq: base * (0.92 + s.rnd() * 0.2) * dir, dur: 0.045, wave, gain: v === 'angry' ? 0.1 : 0.11, env: { attack: 0.006, decay: 0.03, sustain: 0.5, release: 0.03 }, filter: { cutoff: v === 'angry' ? 900 : 1200, q: 1.2, keyTrack: 2 }, octaveLayer: wave === 'triangle' ? 0.15 : 0, pitchEnv: { from: 1.08, to: 0.96, time: 0.05 }, priority: 0 });
    }
  },
  emote(s) {
    const { ctx, out, nb, t } = s;
    const v = s.variant || 'happy';
    const tn = (at: number, f: number, g = 0.11, dur = 1) => tine(ctx, out, at, f, g, { dur });
    switch (v) {
      case 'happy': tn(t, 1046); tn(t + 0.08, 1318); tn(t + 0.16, 1568, 0.12, 1.2); break;
      case 'sad': tn(t, 660, 0.1, 1.2); tn(t + 0.24, 587, 0.09, 1.2); tn(t + 0.5, 523, 0.09, 1.6); note(ctx, out, { t, freq: 262, dur: 0.9, wave: 'triangle', gain: 0.04, env: { attack: 0.2, decay: 0.2, sustain: 0.6, release: 0.3 }, filter: { cutoff: 800 } }); break;
      case 'love': tn(t, 1318); tn(t + 0.12, 1760); glock(ctx, out, t + 0.26, 2637, 0.06); note(ctx, out, { t, freq: 440, dur: 0.5, wave: 'sine', gain: 0.05, env: { attack: 0.15, decay: 0.2, sustain: 0.7, release: 0.3 } }); break;
      case 'angry': note(ctx, out, { t, freq: 110, dur: 0.12, wave: 'sawtooth', gain: 0.18, filter: { type: 'bandpass', cutoff: 600, q: 2 }, env: { attack: 0.005, decay: 0.05, sustain: 0.7, release: 0.04 } }); noise(ctx, out, nb, { t, dur: 0.05, gain: 0.1, filter: { type: 'highpass', freq: 1500 } }); note(ctx, out, { t: t + 0.14, freq: 98, dur: 0.14, wave: 'sawtooth', gain: 0.18, filter: { type: 'bandpass', cutoff: 520, q: 2 }, env: { attack: 0.005, decay: 0.05, sustain: 0.7, release: 0.05 } }); break;
      case 'idea': glock(ctx, out, t, 2093, 0.14); note(ctx, out, { t, freq: 880, dur: 0.18, wave: 'sine', gain: 0.06, pitchEnv: { from: 1, to: 2, time: 0.18 }, env: { attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.1 } }); break;
      case 'question': note(ctx, out, { t, freq: 520, dur: 0.22, wave: 'sine', gain: 0.08, pitchEnv: { from: 1, to: 1.5, time: 0.22 }, vibrato: { rate: 6, depth: 10 }, env: { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.08 }, octaveLayer: 0.1 }); break;
      case 'sleepy': seq(s, 3, 0.25, (i, at) => note(ctx, out, { t: at, freq: [523, 440, 349][i], dur: 0.3, wave: 'sine', gain: 0.06, env: { attack: 0.08, decay: 0.1, sustain: 0.7, release: 0.15 } })); break;
      case 'music': seq(s, 4, 0.09, (i, at) => tn(at, [784, 988, 1175, 1568][i], 0.09, 0.9)); break;
      case 'sweat': RECIPES.drip({ ...s, pitch: 0.7 }); noise(ctx, out, nb, { t, dur: 0.03, gain: 0.04, filter: { type: 'bandpass', freq: 3000, q: 1 } }); break;
      case 'exclaim': note(ctx, out, { t, freq: 880, dur: 0.05, wave: 'square', gain: 0.1, filter: { cutoff: 2000 }, pitchEnv: { from: 1, to: 1.25, time: 0.05 }, env: { attack: 0.003, decay: 0.02, sustain: 0.7, release: 0.03 } }); note(ctx, out, { t: t + 0.06, freq: 1175, dur: 0.07, wave: 'square', gain: 0.1, filter: { cutoff: 2400 }, env: { attack: 0.003, decay: 0.02, sustain: 0.7, release: 0.04 } }); break;
      case 'sick': note(ctx, out, { t, freq: 300, dur: 0.35, wave: 'sine', gain: 0.08, vibrato: { rate: 5, depth: 40, delay: 0.02 }, pitchEnv: { from: 1, to: 0.85, time: 0.35 }, env: { attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.1 } }); break;
    }
  },
  bell(s) {
    const { ctx, out, t } = s;
    const v = s.variant || 'shop';
    switch (v) {
      case 'shop': bell(ctx, out, t, 2200 * s.pitch, 0.5, 0.15, 2.4); bell(ctx, out, t + 0.12, 2800 * s.pitch, 0.5, 0.12, 2.4); break;
      case 'hour': bell(ctx, out, t, 392, 2.6, 0.28, 2.76); bell(ctx, out, t + 0.01, 587, 1.6, 0.08, 3.5); break;
      case 'dinner': seq(s, 4, 0.14, (i, at) => bell(ctx, out, at, i % 2 ? 1760 : 1480, 0.5, 0.13, 2.4)); break;
      case 'festival': seq(s, 3, 0.6, (i, at) => { bell(ctx, out, at, [392, 494, 587][i], 2.6, 0.28, 2.76); bell(ctx, out, at + 0.01, [392, 494, 587][i] * 1.5, 1.6, 0.08, 3.5); }); break;
    }
  },
  sleep(s) {
    const { ctx, out, t } = s;
    seq(s, 3, 0.3, (i, at) => tine(ctx, out, at, [880, 660, 440][i], 0.1, { dur: 1.2 }));
    note(ctx, out, { t, freq: 220, dur: 1.5, wave: 'sine', gain: 0.05, env: { attack: 0.3, decay: 0.3, sustain: 0.7, release: 0.5 } });
  },
  notify(s) {
    const { ctx, out, t } = s;
    const v = s.variant || 'info';
    if (v === 'info') tine(ctx, out, t, 1318, 0.1, { dur: 0.8 });
    else if (v === 'good') { tine(ctx, out, t, 1046, 0.1, { dur: 0.8 }); tine(ctx, out, t + 0.09, 1568, 0.11, { dur: 1 }); }
    else seq(s, 2, 0.1, (_i, at) => note(ctx, out, { t: at, freq: 330, dur: 0.06, wave: 'square', gain: 0.08, filter: { cutoff: 900 }, env: { attack: 0.003, decay: 0.02, sustain: 0.7, release: 0.03 } }));
  },
  quest(s) {
    const { ctx, out, t } = s;
    const v = s.variant || 'accept';
    const chord = (freqs: number[], at: number, dur: number, gain: number) => { for (const f of freqs) note(ctx, out, { t: at, freq: f, dur, wave: 'sine', gain, env: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.3 }, priority: 0 }); };
    if (v === 'accept') { seq(s, 3, 0.1, (i, at) => tine(ctx, out, at, [784, 988, 1175][i], 0.12, { dur: 1 })); chord([392, 494, 587], t, 0.6, 0.03); }
    else if (v === 'complete') { seq(s, 4, 0.09, (i, at) => tine(ctx, out, at, [1046, 1318, 1568, 2093][i], 0.12, { dur: 1.2 })); glock(ctx, out, t + 0.42, 2637, 0.08); chord([523, 659, 784], t + 0.1, 0.9, 0.035); }
    else { RECIPES.write(s); tine(ctx, out, t + 0.25, 1568, 0.06, { dur: 0.6 }); }
  },
  owl(s) {
    const { ctx, out, t } = s;
    const p = s.pitch;
    note(ctx, out, { t, freq: 390 * p, dur: 0.22, wave: 'sine', gain: 0.14, env: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.1 }, pitchEnv: { from: 1.04, to: 0.97, time: 0.2 }, filter: { cutoff: 700, q: 1 }, octaveLayer: 0.05 });
    note(ctx, out, { t: t + 0.38, freq: 370 * p, dur: 0.32, wave: 'sine', gain: 0.12, env: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.12 }, pitchEnv: { from: 1.03, to: 0.95, time: 0.3 }, filter: { cutoff: 700, q: 1 }, octaveLayer: 0.05 });
  },
  birds(s) { chirp(s, (VARIANTS.birds.includes(s.variant) ? s.variant : pick(s, ['robin', 'sparrow', 'blackbird', 'finch', 'wren'])) as Bird); },
  crickets(s) {
    const { ctx, out } = s;
    const f = 4300 * s.pitch;
    seq(s, 2, 0.55, (_j, phrase) => seq({ ...s, t: phrase }, 12, 0.028, (_i, at) => note(ctx, out, { t: at, freq: f, dur: 0.012, wave: 'sine', gain: 0.05, env: { attack: 0.003, decay: 0.005, sustain: 0.8, release: 0.004 }, priority: 0 })));
  },
  frog(s) {
    const { ctx, out, t } = s;
    note(ctx, out, { t, freq: 130 * s.pitch, dur: 0.18, wave: 'sawtooth', gain: 0.1, tremolo: { rate: 24, depth: 0.8 }, filter: { type: 'bandpass', cutoff: 500, q: 2 }, env: { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.05 }, pitchEnv: { from: 0.9, to: 1.08, time: 0.18 } });
  },
  hammer(s) {
    const { ctx, out, nb, t } = s;
    bell(ctx, out, t, 2900 * jit(s, 0.03), 0.5, 0.2, 3.7);
    bell(ctx, out, t, 4100 * jit(s, 0.03), 0.3, 0.08, 2.1);
    noise(ctx, out, nb, { t, dur: 0.03, gain: 0.25, filter: { type: 'highpass', freq: 3000 } });
    note(ctx, out, { t, freq: 180, dur: 0.04, wave: 'sine', gain: 0.2, pitchEnv: { from: 1.4, to: 0.9, time: 0.04 }, env: { attack: 0.001, decay: 0.04, sustain: 0.2, release: 0.05 } });
  },
  oven(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.5, gain: 0.2, attack: 0.08, filter: { freq: 700, to: 250 }, curve: 0.8 });
    seq(s, 4, 0.12, (_i, at) => RECIPES.crackle({ ...s, t: at + 0.1 + s.rnd() * 0.1 }));
    note(ctx, out, { t: t + 0.45, freq: 150, dur: 0.05, wave: 'triangle', gain: 0.15, pitchEnv: { from: 1.3, to: 0.8, time: 0.05 }, env: { attack: 0.002, decay: 0.05, sustain: 0.3, release: 0.08 } });
  },
  gift(s) {
    const { ctx, out, nb, t } = s;
    seq(s, 3, 0.07, (i, at) => tine(ctx, out, at, [1568, 1976, 2349][i], 0.09, { dur: 1 }));
    noise(ctx, out, nb, { t, dur: 0.15, gain: 0.05, attack: 0.03, filter: { type: 'bandpass', freq: 3000, q: 0.8 } });
  },
  laugh(s) {
    const { ctx, out, nb } = s;
    const p = s.pitch;
    seq(s, 4, 0.11, (i, at) => {
      note(ctx, out, { t: at, freq: 330 * (1 - i * 0.04) * p, dur: 0.07, wave: 'sawtooth', gain: 0.08, filter: { type: 'bandpass', cutoff: 900, q: 1.6 }, env: { attack: 0.01, decay: 0.03, sustain: 0.7, release: 0.03 }, pitchEnv: { from: 1.15, to: 0.95, time: 0.07 } });
      noise(ctx, out, nb, { t: at, dur: 0.05, gain: 0.03, filter: { type: 'bandpass', freq: 1500, q: 1 }, priority: 0 });
    });
  },
  argue(s) {
    const { ctx, out, nb } = s;
    const p = s.pitch;
    seq(s, 2, 0.16, (i, at) => {
      note(ctx, out, { t: at, freq: (i ? 150 : 170) * p, dur: 0.11, wave: 'sawtooth', gain: 0.1, filter: { type: 'bandpass', cutoff: 700, q: 2 }, env: { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.03 }, pitchEnv: { from: 1.1, to: 0.9, time: 0.1 } });
      noise(ctx, out, nb, { t: at, dur: 0.04, gain: 0.05, filter: { type: 'bandpass', freq: 1200, q: 1 }, priority: 0 });
    });
  },
  eat(s) {
    const { ctx, out, nb, t } = s;
    seq(s, 2, 0.16, (_i, at) => noise(ctx, out, nb, { t: at, dur: 0.06 * jit(s, 0.3), gain: 0.18, filter: { type: 'bandpass', freq: 1700 * jit(s, 0.2), q: 0.8 }, filter2: { freq: 500 } }));
    note(ctx, out, { t: t + 0.35, freq: 200, dur: 0.1, wave: 'sine', gain: 0.03, env: { attack: 0.03, decay: 0.05, sustain: 0.7, release: 0.05 } });
  },
  drink(s) {
    const { ctx, out, t } = s;
    bell(ctx, out, t, 3200, 0.15, 0.06, 3.1);
    seq(s, 2, 0.22, (_i, at) => note(ctx, out, { t: at + 0.05, freq: 260, dur: 0.06, wave: 'sine', gain: 0.15, pitchEnv: { from: 1, to: 0.5, time: 0.06 }, env: { attack: 0.005, decay: 0.03, sustain: 0.6, release: 0.03 } }));
  },
  music(s) {
    const { ctx, out, t } = s;
    [55, 62, 67, 71].forEach((m, i) => pluck(ctx, out, { t: t + i * 0.02, midi: m, gain: 0.12, timbre: 'steel' }));
    [57, 64, 69, 72].forEach((m, i) => pluck(ctx, out, { t: t + 0.35 + i * 0.02, midi: m, gain: 0.12, timbre: 'steel' }));
  },
  write(s) {
    const { ctx, out, nb } = s;
    seq(s, 3, 0.07, (_i, at) => noise(ctx, out, nb, { t: at, dur: 0.05 * jit(s, 0.4), gain: 0.07, filter: { type: 'highpass', freq: 3500 }, filter2: { type: 'peaking', freq: 5000, q: 2 } }));
  },
  heal(s) {
    const { ctx, out, t } = s;
    note(ctx, out, { t, freq: 660, dur: 0.35, wave: 'sine', gain: 0.06, pitchEnv: { from: 1, to: 1.5, time: 0.3 }, env: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.15 } });
    tine(ctx, out, t + 0.25, 1318, 0.08, { dur: 1 });
    glock(ctx, out, t + 0.35, 2637, 0.05);
  },
  cheer(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.3, gain: 0.2, attack: 0.03, filter: { type: 'bandpass', freq: 900, q: 0.5 } });
    seq(s, 4, 0.03, (_i, at) => note(ctx, out, { t: at, freq: 280 + s.rnd() * 140, dur: 0.22, wave: 'sawtooth', gain: 0.05, filter: { type: 'bandpass', cutoff: 850, q: 1.5 }, env: { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.06 }, pitchEnv: { from: 0.9, to: 1.1, time: 0.2 }, priority: 0 }));
    note(ctx, out, { t: t + 0.1, freq: 2200, dur: 0.25, wave: 'sine', gain: 0.03, pitchEnv: { from: 1, to: 1.27, time: 0.25 }, env: { attack: 0.03, decay: 0.05, sustain: 0.8, release: 0.05 } });
  },
  clink(s) {
    const { ctx, out, t } = s;
    bell(ctx, out, t, 3600 * jit(s, 0.08), 0.35, 0.07, 3.1);
    bell(ctx, out, t + 0.02, 5200 * jit(s, 0.08), 0.2, 0.03, 2.2);
  },
  mumble(s) {
    const { ctx, out } = s;
    const base = (140 + s.rnd() * 160) * s.pitch;
    seq(s, 3 + Math.floor(s.rnd() * 4), 0.09, (_i, at) => note(ctx, out, { t: at + s.rnd() * 0.02, freq: base * (0.9 + s.rnd() * 0.25), dur: 0.06, wave: 'sawtooth', gain: 0.035, filter: { type: 'bandpass', cutoff: 700 + s.rnd() * 500, q: 1.5 }, env: { attack: 0.02, decay: 0.03, sustain: 0.6, release: 0.03 }, priority: 0 }));
  },
  leaves(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 0.5, gain: 0.08, attack: 0.15, filter: { type: 'bandpass', freq: 2600 * jit(s, 0.2), q: 0.6 }, filter2: { freq: 1200 }, curve: 0.8, priority: 0 });
  },
  gust(s) {
    const { ctx, out, nb, t } = s;
    noise(ctx, out, nb, { t, dur: 1.4, gain: 0.14, attack: 0.5, hold: 0.2, filter: { freq: 600, to: 1100, q: 1.4 }, filter2: { freq: 200 }, curve: 0.6, priority: 0 });
  },
  weather(s) {
    const { ctx, out, nb, t } = s;
    const v = s.variant || 'gust';
    if (v === 'gust') RECIPES.gust(s);
    else if (v === 'rainstart') noise(ctx, out, nb, { t, dur: 2.5, gain: 0.18, attack: 1.2, filter: { type: 'bandpass', freq: 3500, q: 0.4 }, filter2: { freq: 1000 }, curve: 0.6 });
    else noise(ctx, out, nb, { t, dur: 2, gain: 0.08, attack: 0.8, filter: { freq: 300 }, curve: 0.6 });
  },
  sting(s) {
    // a generic in-place chime (music.ts has the in-key stings)
    const { ctx, out } = s;
    seq(s, 3, 0.08, (i, at) => tine(ctx, out, at, [880, 1109, 1319][i], 0.1, { dur: 1.2 }));
  },
  drum(s) { frameDrum(s.ctx, s.out, s.t, 85, 0.8); },
  strum(s) {
    const { ctx, out, t } = s;
    const root = 48 + Math.floor(s.rnd() * 12);
    [0, 7, 12, 16].forEach((iv, i) => pluck(ctx, out, { t: t + i * 0.018, midi: root + iv, gain: 0.14, timbre: 'nylon' }));
  },
  pluck(s) { pluck(s.ctx, s.out, { t: s.t, midi: 60 + Math.floor(s.rnd() * 24), gain: 0.2, timbre: 'nylon' }); },
  tine(s) { tine(s.ctx, s.out, s.t, midi(72 + Math.floor(s.rnd() * 24)), 0.15); },
};

export const SFX_NAMES: string[] = Object.keys(RECIPES);

/* -------------------------------------------------------------- the player */

const MIN_GAP: Record<string, number> = { step: 0.1, talk: 0.09, notify: 0.25, mumble: 0.05, crackle: 0.01, drip: 0.02, birds: 0.05, ui: 0.03, door: 0.15, coin: 0.05 };

export class Sfx {
  ctx: Ctx | null = null;
  out: GainNode | null = null;
  nb: AudioBuffer | null = null;
  listener: Vec | null = null;
  /** tiles beyond which positioned sounds are inaudible */
  range = 22;
  private last = new Map<string, number>();
  private rnd = makeRng(7);

  attach(ctx: Ctx, dest: AudioNode): void {
    if (this.ctx === ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain(); this.out.gain.value = 1;
    this.out.connect(dest);
    this.nb = makeNoise(ctx, 2.5, 4242);
  }

  setListener(pos: Vec): void { this.listener = { x: pos.x, y: pos.y }; }

  /** Attenuation and pan for a world position, or null when out of range. */
  spatial(pos?: Vec): { gain: number; pan: number } | null {
    if (!pos || !this.listener) return { gain: 1, pan: 0 };
    const dx = pos.x - this.listener.x, dy = pos.y - this.listener.y;
    const d = Math.hypot(dx, dy);
    if (d > this.range) return null;
    let gain = 1 / (1 + (d / 7) * (d / 7));
    const fadeFrom = this.range * 0.8;
    if (d > fadeFrom) gain *= 1 - (d - fadeFrom) / (this.range - fadeFrom);
    return { gain, pan: clamp(dx / 10, -1, 1) * 0.75 };
  }

  has(name: string): boolean { return name in RECIPES; }

  /** Play a named sound now. Returns false when unknown, throttled, out of range or not attached. */
  play(name: string, opts: PlayOpts = {}): boolean {
    const ctx = this.ctx, out = this.out, nb = this.nb;
    if (!ctx || !out || !nb) return false;
    let recipe = RECIPES[name];
    let variant = opts.variant ?? '';
    if (!recipe && name.includes(':')) { const [n, v] = name.split(':'); recipe = RECIPES[n]; variant = variant || v; name = n; }
    if (!recipe) return false;
    const now = ctx.currentTime;
    const gap = MIN_GAP[name] ?? 0.02;
    const prev = this.last.get(name) ?? -1;
    if (now - prev < gap) return false;
    this.last.set(name, now);
    const sp = this.spatial(opts.pos);
    if (!sp) return false;
    const g = ctx.createGain();
    g.gain.value = (opts.volume ?? 1) * sp.gain;
    const pan = clamp((opts.pan ?? 0) + sp.pan, -1, 1);
    if (pan !== 0) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out);
    const rnd = this.rnd;
    recipe({ ctx, out: g, nb, t: now + 0.005, variant, pitch: opts.pitch ?? 1, rnd });
    // free the per-play gain after the longest recipe could have finished
    setTimeout(() => { try { g.disconnect(); } catch { /* detached */ } }, 8000);
    return true;
  }

  /** Talk-blip pitch multiplier for a villager id: stable, spread over ~1.3 octaves. */
  static voicePitch(id: string): number {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    const u = ((h >>> 0) % 1000) / 1000;
    return 0.65 + u * 0.9;
  }
}
