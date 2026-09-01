/**
 * A voice for the generals nobody recorded.
 *
 * 260 of 274 generals speak from the pack. Fourteen do not, 37 skill-general
 * pairs have no take anywhere, 19 generals have no death line and 236 have no
 * victory line. Those gaps are not evenly spread — they cluster on the newest
 * 手杀 packages, which is to say on exactly the characters a player is most
 * likely to be meeting for the first time. A silent skill is the same silence
 * as a bug.
 *
 * WHAT WAS TRIED FIRST, AND WHY IT IS NOT HERE.
 *
 * `window.speechSynthesis` is the obvious answer and it is the wrong one, for
 * three reasons that are not matters of taste:
 *
 *   1. It cannot be routed. There is no way to get a `SpeechSynthesisUtterance`
 *      into an `AudioContext` — no `MediaStream`, no `AudioNode`, nothing. It
 *      plays at the operating system's volume, past the effects fader, past the
 *      voice fader, past the duck, and over the top of whatever the table is
 *      doing. Everything else in this lane is a node on a bus for a reason.
 *   2. There may be no voice. `getVoices()` on a headless or freshly imaged
 *      machine routinely returns nothing for `zh-CN`, and it populates
 *      asynchronously, so "is there a Chinese voice" is not a question that can
 *      be answered before the moment the line is needed.
 *   3. It would say the wrong thing. What the client knows at that moment is a
 *      skill's *name* — 反馈, 遗计 — not the line a voice actor performed. A
 *      screen reader reading a skill's name in the middle of a fight is not a
 *      voice line; it is a caption being read aloud.
 *
 * The measurements behind (2) are in the report; the API is left alone.
 *
 * WHAT THIS IS INSTEAD. A formant synthesiser: a glottal pulse train through
 * three parallel bandpass filters, gated into syllables, with a Mandarin tone
 * contour on each. It is a stylised utterance, not speech, and that is the
 * point — it reads as *this character making a sound*, sits on the voice bus
 * with everything else, ducks with everything else, and can never mispronounce
 * anything because it is not pronouncing anything.
 *
 * Everything about one utterance is a function of the seed: how many syllables,
 * which vowels, which tones, and where the pitch sits. So a general's skill
 * sounds like that skill every time, a different skill on the same general
 * sounds different, and the same skill on two generals differs by their pitch
 * alone — which is what a voice is.
 */
import type { Voice } from './sfx';

/**
 * Vowel formants in Hz, measured male values.
 *
 * The classic Peterson–Barney centres. Only the first three formants are
 * synthesised: F1 and F2 carry the whole vowel identity and F3 is what stops it
 * sounding like a filter sweep.
 */
const VOWELS: readonly (readonly [number, number, number])[] = [
  [730, 1090, 2440], // a
  [270, 2290, 3010], // i
  [300, 870, 2240],  // u
  [530, 1840, 2480], // e
  [570, 840, 2410],  // o
  [440, 1020, 2240], // ɤ, the 'e' of 特
];

/**
 * The four tones, as multipliers on the syllable's base pitch across its length.
 *
 * 阴平 level, 阳平 rising, 上声 dipping, 去声 falling. Sampled rather than
 * interpolated because a `setValueCurveAtTime` over four points is one call and
 * a chain of ramps is four.
 */
const TONES: readonly (readonly number[])[] = [
  [1.00, 1.01, 1.00, 0.99],
  [0.88, 0.94, 1.04, 1.14],
  [0.98, 0.86, 0.88, 1.02],
  [1.16, 1.04, 0.90, 0.80],
];

/** 0..1 from a seed and a channel, so one seed drives every choice. */
function unit(seed: number, channel: number): number {
  let h = (seed ^ (channel * 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const pick = <T>(xs: readonly T[], seed: number, channel: number): T =>
  xs[Math.floor(unit(seed, channel) * xs.length) % xs.length];

export type Utterance = 'skill' | 'death' | 'win';

export interface SpeakSpec {
  /** Everything about the voice comes from this. Hash of general plus skill. */
  readonly seed: number;
  /** `General.Male` is 1, `General.Female` 2. Anything else picks off the seed. */
  readonly gender: number;
  readonly kind: Utterance;
  /** 0..1, folded into the envelope rather than applied after it. */
  readonly gain: number;
}

/** How many syllables each kind of line gets, and how it is shaped. */
const SHAPE: Readonly<Record<Utterance, {
  readonly syllables: readonly [number, number];
  readonly length: number;
  readonly lift: number;
  readonly fall: number;
}>> = {
  // A skill is a shout: short, two or three syllables, pitch rising into it.
  skill: { syllables: [2, 3], length: 0.19, lift: 1.06, fall: 0 },
  // A death is the longest thing anyone says, and it falls all the way down.
  death: { syllables: [3, 5], length: 0.26, lift: 0.96, fall: 0.34 },
  // A victory rises and holds.
  win: { syllables: [3, 4], length: 0.23, lift: 1.12, fall: 0 },
};

/** How long `speak` will run for a spec, without building anything. */
export function utteranceSeconds(spec: SpeakSpec): number {
  const s = SHAPE[spec.kind];
  const n = s.syllables[0] + Math.floor(unit(spec.seed, 1) * (s.syllables[1] - s.syllables[0] + 1));
  return n * s.length * 1.14 + 0.18;
}

/**
 * Speak.
 *
 * One `GainNode` comes back and everything hangs off it, so the caller can fade
 * it, duck it or cut it exactly as it would a recorded clip. Every node is
 * scheduled against `v.at` and stops itself; nothing is disconnected by hand
 * and nothing is left running if the caller loses interest.
 */
export function speak(v: Voice, spec: SpeakSpec): GainNode {
  const { ctx } = v;
  const out = ctx.createGain();
  out.gain.value = 1;
  out.connect(v.dest);

  try {
    build(ctx, out, v.at, spec, v.gain);
  } catch {
    // A browser missing one of these node types loses the utterance, not the
    // game. There is no partial cleanup to do: everything built so far is
    // downstream of `out` and stops on its own.
  }
  return out;
}

function build(ctx: AudioContext, out: GainNode, at: number, spec: SpeakSpec, gain: number): void {
  const shape = SHAPE[spec.kind];
  const female = spec.gender === 2 || (spec.gender !== 1 && unit(spec.seed, 0) > 0.5);

  // Where the voice sits. A tenth of an octave of jitter per general, so two
  // men do not speak in unison.
  const f0 = (female ? 196 : 112) * (0.9 + unit(spec.seed, 2) * 0.22);
  // Formants scale with vocal tract length, not with pitch. 1.17 is the usual
  // female/male ratio and is what stops a woman's voice sounding like a man's
  // played fast.
  const warp = female ? 1.17 : 1;

  const n = shape.syllables[0]
    + Math.floor(unit(spec.seed, 1) * (shape.syllables[1] - shape.syllables[0] + 1));
  const step = shape.length * 1.14;

  for (let i = 0; i < n; i += 1) {
    const t = at + i * step;
    const vowel = pick(VOWELS, spec.seed, 10 + i * 3);
    const tone = pick(TONES, spec.seed, 11 + i * 3);
    // The line's own arc across its syllables, on top of each syllable's tone.
    const arc = shape.fall
      ? 1 - shape.fall * (i / Math.max(1, n - 1))
      : shape.lift ** (i / Math.max(1, n - 1));
    const base = f0 * arc * (0.94 + unit(spec.seed, 12 + i * 3) * 0.14);
    syllable(ctx, out, t, shape.length, base, tone, vowel, warp, gain * (i === 0 ? 1 : 0.92));
  }
}

/**
 * One syllable: a plosive edge, a voiced body, a decay.
 *
 * The noise burst at the front is doing most of the work. A formant bank on its
 * own reads as a synthesiser pad however good the vowel is; 25 ms of filtered
 * noise in front of it reads as a mouth opening.
 */
function syllable(
  ctx: AudioContext,
  dest: AudioNode,
  at: number,
  len: number,
  f0: number,
  tone: readonly number[],
  vowel: readonly [number, number, number],
  warp: number,
  gain: number,
): void {
  /* The glottal source. A sawtooth is the standard stand-in for a pulse train:
     it has every harmonic, which is what the formant filters need to shape. */
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f0 * tone[0], at);
  const curve = new Float32Array(tone.length);
  for (let i = 0; i < tone.length; i += 1) curve[i] = f0 * tone[i];
  try {
    osc.frequency.setValueCurveAtTime(curve, at, len);
  } catch {
    // Safari has refused a curve that starts at a scheduled value before now.
    // Ramps are the same contour, four calls instead of one.
    for (let i = 1; i < tone.length; i += 1) {
      osc.frequency.linearRampToValueAtTime(f0 * tone[i], at + (len * i) / (tone.length - 1));
    }
  }

  /* The voiced envelope. Slow enough not to click, fast enough to be a syllable
     rather than a swell. */
  const voiced = ctx.createGain();
  voiced.gain.setValueAtTime(0.0001, at);
  voiced.gain.linearRampToValueAtTime(0.9 * gain, at + 0.03);
  voiced.gain.setValueAtTime(0.9 * gain, at + len * 0.62);
  voiced.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(voiced);

  /* Three formants in parallel, weighted the way a vowel actually is: F1 loud,
     F2 half, F3 a hint. Q rises with the formant so the top one is a resonance
     and not a shelf. */
  const bank = ctx.createGain();
  bank.gain.value = 1;
  const weights = [1, 0.5, 0.18];
  const qs = [7, 11, 15];
  for (let i = 0; i < 3; i += 1) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = Math.min(ctx.sampleRate / 2.2, vowel[i] * warp);
    f.Q.value = qs[i];
    const g = ctx.createGain();
    g.gain.value = weights[i];
    voiced.connect(f).connect(g).connect(bank);
  }
  // A little of the raw source under the bank keeps the low end; a pure formant
  // bank is thin because it throws away everything between the peaks.
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = 340 * warp;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.5;
  voiced.connect(body).connect(bodyGain).connect(bank);
  bank.connect(dest);

  osc.start(at);
  osc.stop(at + len + 0.03);

  /* The consonant. 25 ms of band-limited noise on the front edge. */
  const noise = ctx.createBufferSource();
  noise.buffer = burst(ctx);
  const nf = ctx.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = 1400 + vowel[1] * 0.55;
  nf.Q.value = 0.9;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, at);
  ng.gain.linearRampToValueAtTime(0.30 * gain, at + 0.006);
  ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  noise.connect(nf).connect(ng).connect(dest);
  noise.start(at, 0, 0.06);
  noise.stop(at + 0.07);
}

/** 200 ms of noise, made once per context. Consonants are all we need it for. */
const bursts = new WeakMap<BaseAudioContext, AudioBuffer>();

function burst(ctx: BaseAudioContext): AudioBuffer {
  const hit = bursts.get(ctx);
  if (hit) return hit;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.2)), ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i += 1) ch[i] = Math.random() * 2 - 1;
  bursts.set(ctx, buf);
  return buf;
}
