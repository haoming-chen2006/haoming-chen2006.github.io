/**
 * The table's sound bank, synthesised.
 *
 * WHY SYNTHESISED. The plan was to ship the engine's own effects. Checking their
 * licence before deploying them found a live third-party copyright notice inside
 * the set that had been cleared as safe, and an identical transcode fingerprint
 * across the sets that had been cleared and the sets that had been flagged — so
 * there was never a line between them to draw. `provenance.json` has the
 * evidence and the commands to reproduce it. Nothing from that tree ships.
 *
 * What is left is to make the sounds. Fifteen patches, an oscillator and a noise
 * buffer each, costing no bytes and owing nothing to anyone: a card lands, a
 * blade rings, a judgement chimes up or down, a chain rattles, paper riffles off
 * the draw pile. It is a smaller sound than a recording studio's, and it is a
 * sound this project is entitled to make.
 *
 * HOW A PATCH IS CHOSEN. By the engine's own categories, never by a card table.
 * The engine says which element a point of damage was, which subtype of
 * equipment went on, whether a sound was a card use or an equipment proc firing;
 * `cues.ts` reads those off the wire. Within a category the timbre comes from a
 * hash of the name the engine sent, so 杀 and 桃 are reliably different, 杀 is
 * the same 杀 every time, and a card that does not exist yet still gets a sound.
 *
 * EVERY PATCH IS SCHEDULED, NOT TRIGGERED. Nodes are started against
 * `AudioContext.currentTime` and stopped at a known time, so a burst of six
 * effects arriving in one engine flush lands as six sounds at six offsets rather
 * than one smear — and so nothing depends on a main thread that is running a Lua
 * VM. Every node stops itself; nothing here is ever disconnected by hand.
 *
 * NOTHING HERE READS THE GAME. A patch is a noise. It is handed a category and a
 * number.
 */
import type { SoundCue } from './cues';

/* --------------------------------------------------------------- primitives */

/** One second of white noise, made once per context and reused by every patch. */
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const hit = noiseCache.get(ctx);
  if (hit) return hit;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate), ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i += 1) ch[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, buf);
  return buf;
}

/** Where a patch draws. `at` is context time, `gain` the cue's own level. */
export interface Voice {
  readonly ctx: AudioContext;
  readonly dest: AudioNode;
  readonly at: number;
  readonly gain: number;
}

/**
 * A percussive envelope.
 *
 * Linear up, exponential down, because that is what a struck thing does and
 * because `exponentialRampToValueAtTime` cannot reach zero — the floor is 1e-4
 * and the node is stopped just after it, which is inaudible and avoids the
 * click a linear ramp to silence leaves behind.
 */
function envelope(ctx: AudioContext, at: number, attack: number, decay: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

interface ToneOpts {
  readonly type?: OscillatorType;
  readonly from: number;
  /** Swept to over the decay when given. A body that falls reads as weight. */
  readonly to?: number;
  readonly attack?: number;
  readonly decay: number;
  readonly peak: number;
  readonly delay?: number;
}

function tone(v: Voice, o: ToneOpts): void {
  const at = v.at + (o.delay ?? 0);
  const osc = v.ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, at);
  if (o.to !== undefined && o.to > 0) osc.frequency.exponentialRampToValueAtTime(o.to, at + o.decay);
  const attack = o.attack ?? 0.004;
  const g = envelope(v.ctx, at, attack, o.decay, o.peak * v.gain);
  osc.connect(g).connect(v.dest);
  osc.start(at);
  osc.stop(at + attack + o.decay + 0.02);
}

interface NoiseOpts {
  readonly type?: BiquadFilterType;
  readonly from: number;
  /** Swept to over the decay. A rising band is a whoosh; a falling one is dust. */
  readonly to?: number;
  readonly q?: number;
  readonly attack?: number;
  readonly decay: number;
  readonly peak: number;
  readonly delay?: number;
}

function noise(v: Voice, o: NoiseOpts): void {
  const at = v.at + (o.delay ?? 0);
  const src = v.ctx.createBufferSource();
  src.buffer = noiseBuffer(v.ctx);
  // Start somewhere random in the second so two bursts in one beat are not the
  // same eighty milliseconds of noise twice.
  const offset = Math.random() * 0.9;
  const f = v.ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.from, at);
  if (o.to !== undefined && o.to > 0) f.frequency.exponentialRampToValueAtTime(o.to, at + o.decay);
  f.Q.value = o.q ?? 1;
  const attack = o.attack ?? 0.002;
  const g = envelope(v.ctx, at, attack, o.decay, o.peak * v.gain);
  src.connect(f).connect(g).connect(v.dest);
  const dur = attack + o.decay + 0.02;
  src.start(at, offset, dur);
  src.stop(at + dur);
}

/** 0..1 from a seed and a channel, so one seed drives several choices. */
function unit(seed: number, channel: number): number {
  let h = (seed ^ (channel * 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12);

/** 宫 pentatonic. Every pitched cue lands in it, so nothing ever clashes with
 *  the music — which is in the same family of modes by construction. */
const SCALE = [0, 2, 4, 7, 9];

function pentatonic(seed: number, channel: number, low: number, span: number): number {
  const step = Math.floor(unit(seed, channel) * span);
  return midi(low + 12 * Math.floor(step / SCALE.length) + SCALE[step % SCALE.length]);
}

/* ------------------------------------------------------------- the patches */

/**
 * A card resolving.
 *
 * The one patch that has to cover forty-three cards and every card a package
 * adds later, so all of its character comes from the seed: where the transient
 * sits in the spectrum, how long the body rings, and whether it reads as a cut
 * or as a landing. A female speaker's path shifts the whole thing up a little,
 * because the engine went to the trouble of telling us which it was.
 */
function card(v: Voice, cue: SoundCue): void {
  const seed = cue.seed ?? 0;
  const up = cue.variant === 'female' ? 1.18 : 1;
  const cut = unit(seed, 1) > 0.45;
  const band = (900 + unit(seed, 2) * 2600) * up;
  const body = (120 + unit(seed, 3) * 150) * up;

  if (cut) {
    // A blade: the band sweeps down through the transient, which is what makes
    // a swish a swish rather than a click.
    noise(v, { from: band * 1.8, to: band * 0.55, q: 1.1, decay: 0.13, peak: 0.5 });
    tone(v, { type: 'triangle', from: body * 1.4, to: body * 0.7, decay: 0.14, peak: 0.28 });
  } else {
    noise(v, { from: band, to: band * 0.7, q: 2.2, decay: 0.09, peak: 0.42 });
    tone(v, { type: 'sine', from: body, to: body * 0.55, decay: 0.2, peak: 0.34 });
  }
  // A short ring a few milliseconds late, pitched in the mode: the difference
  // between a noise and a card.
  tone(v, {
    type: 'triangle', from: pentatonic(seed, 4, 72, 12),
    attack: 0.002, decay: 0.22, peak: 0.1, delay: 0.02,
  });
}

/** Wearing a piece of equipment. The engine says which of the three. */
function equip(v: Voice, cue: SoundCue): void {
  switch (cue.variant) {
    case 'armor':
      tone(v, { type: 'sine', from: 150, to: 70, decay: 0.24, peak: 0.4 });
      noise(v, { type: 'lowpass', from: 900, to: 300, decay: 0.16, peak: 0.3 });
      break;
    case 'horse':
      // Two clops. The second is quieter and a hair late, which is the whole
      // difference between a horse and a knock.
      for (let i = 0; i < 2; i += 1) {
        noise(v, { type: 'lowpass', from: 520, to: 200, decay: 0.07, peak: 0.42 - i * 0.14, delay: i * 0.1 });
        tone(v, { type: 'sine', from: 190, to: 90, decay: 0.08, peak: 0.2 - i * 0.07, delay: i * 0.1 });
      }
      break;
    default:
      // Steel. Two inharmonic partials is enough to stop it sounding like a bell.
      tone(v, { type: 'triangle', from: 1380, decay: 0.34, peak: 0.16 });
      tone(v, { type: 'triangle', from: 2090, decay: 0.26, peak: 0.1, delay: 0.006 });
      noise(v, { from: 3200, to: 1800, q: 0.8, decay: 0.1, peak: 0.3 });
  }
}

/** An equipment skill firing. `skill.lua:59` — a bright ping, pitched by name. */
function gear(v: Voice, cue: SoundCue): void {
  const f = pentatonic(cue.seed ?? 0, 5, 79, 10);
  tone(v, { type: 'triangle', from: f, decay: 0.4, peak: 0.16 });
  tone(v, { type: 'sine', from: f * 2.01, decay: 0.22, peak: 0.08 });
  noise(v, { from: f * 3, to: f * 1.6, q: 1.6, decay: 0.07, peak: 0.22 });
}

/**
 * Damage, in the engine's four elements.
 *
 * `heavy` is `damageNum > 1`. Upstream that picks a different recording, so it
 * is a different patch here too — longer, lower, and with more of the body —
 * rather than the same sound turned up.
 */
function damage(v: Voice, cue: SoundCue): void {
  const heavy = cue.heavy === true;
  const scale = heavy ? 1.45 : 1;
  const lift = heavy ? 1.2 : 1;

  switch (cue.variant) {
    case 'fire':
      noise(v, { from: 420, to: 2400, q: 0.7, attack: 0.02, decay: 0.42 * scale, peak: 0.4 * lift });
      noise(v, { type: 'lowpass', from: 700, to: 180, decay: 0.3 * scale, peak: 0.34 * lift });
      tone(v, { type: 'sawtooth', from: 110, to: 42, decay: 0.26 * scale, peak: 0.2 * lift });
      break;
    case 'thunder':
      // The crack first, the rumble under it. Reversing those reads as a bomb.
      noise(v, { type: 'highpass', from: 2600, to: 1200, decay: 0.09, peak: 0.55 * lift });
      noise(v, { type: 'lowpass', from: 420, to: 90, attack: 0.01, decay: 0.6 * scale, peak: 0.3 * lift });
      tone(v, { type: 'square', from: 74, to: 38, decay: 0.3 * scale, peak: 0.16 * lift });
      break;
    case 'ice':
      tone(v, { type: 'sine', from: 2640, decay: 0.38 * scale, peak: 0.16 * lift });
      tone(v, { type: 'sine', from: 3960, decay: 0.26 * scale, peak: 0.1 * lift, delay: 0.01 });
      noise(v, { type: 'highpass', from: 5200, to: 2600, decay: 0.3 * scale, peak: 0.22 * lift });
      tone(v, { type: 'sine', from: 150, to: 60, decay: 0.18, peak: 0.2 * lift });
      break;
    default:
      tone(v, { type: 'sine', from: 168 / lift, to: 46, decay: 0.2 * scale, peak: 0.48 * lift });
      noise(v, { from: 950, to: 380, q: 1.3, decay: 0.1 * scale, peak: 0.4 * lift });
  }
}

/** Losing hp with no damage behind it. Quieter than a hit, and it falls. */
function losehp(v: Voice): void {
  tone(v, { type: 'sine', from: 300, to: 176, attack: 0.01, decay: 0.3, peak: 0.24 });
  noise(v, { type: 'lowpass', from: 700, to: 260, decay: 0.2, peak: 0.14 });
}

/** Losing max hp. The same shape a fifth lower, with a beat in it. */
function losemaxhp(v: Voice): void {
  tone(v, { type: 'sine', from: 200, to: 104, attack: 0.012, decay: 0.5, peak: 0.26 });
  tone(v, { type: 'sine', from: 203, to: 106, attack: 0.012, decay: 0.5, peak: 0.2 });
}

/** A seat going down. The longest thing the table does, and the lowest. */
function death(v: Voice, cue: SoundCue): void {
  const seed = cue.seed ?? 0;
  tone(v, { type: 'triangle', from: 232 + unit(seed, 6) * 40, to: 62, attack: 0.02, decay: 1.1, peak: 0.3 });
  tone(v, { type: 'sine', from: 116, to: 40, attack: 0.03, decay: 1.3, peak: 0.22 });
  noise(v, { type: 'lowpass', from: 1400, to: 200, attack: 0.05, decay: 0.9, peak: 0.16 });
}

/** Cards off the pile. Three small riffles, high and quiet — it happens a lot. */
function draw(v: Voice): void {
  for (let i = 0; i < 3; i += 1) {
    noise(v, {
      type: 'highpass', from: 2400 + i * 500, to: 1600,
      decay: 0.045, peak: 0.3 - i * 0.07, delay: i * 0.028,
    });
  }
}

/** A judgement. Up a major third for good, down a minor third for bad. */
function judge(v: Voice, cue: SoundCue): void {
  const good = cue.variant === 'good';
  const root = good ? midi(76) : midi(69);
  const second = good ? midi(81) : midi(64);
  tone(v, { type: 'triangle', from: root, attack: 0.003, decay: 0.24, peak: 0.2 });
  tone(v, { type: 'triangle', from: second, attack: 0.003, decay: 0.42, peak: 0.2, delay: 0.11 });
  tone(v, { type: 'sine', from: second * 2, attack: 0.003, decay: 0.2, peak: 0.07, delay: 0.11 });
}

/**
 * A skill firing.
 *
 * This is the one the table hears most after `card`, and the one the voice lines
 * would have covered. A bell in the mode, its note picked from the skill's name,
 * so a general's signature skill has a signature note across every game.
 */
function skill(v: Voice, cue: SoundCue): void {
  const seed = cue.seed ?? 0;
  const f = pentatonic(seed, 7, 69, 15);
  tone(v, { type: 'triangle', from: f, attack: 0.004, decay: 0.5, peak: 0.17 });
  // A struck bar is not harmonic. 2.76x is roughly where the first overtone of
  // one actually sits, and it is what stops this sounding like a sine beep.
  tone(v, { type: 'sine', from: f * 2.76, attack: 0.004, decay: 0.3, peak: 0.07 });
  tone(v, { type: 'sine', from: f * 5.4, attack: 0.003, decay: 0.13, peak: 0.035 });
  noise(v, { from: f * 4, to: f * 2, q: 2, decay: 0.05, peak: 0.14 });
}

/** The chain toggling. Four links, falling, none of them in tune. */
function chain(v: Voice): void {
  for (let i = 0; i < 4; i += 1) {
    noise(v, { from: 3400 - i * 520, q: 5 + i, decay: 0.09, peak: 0.26 - i * 0.04, delay: i * 0.042 });
    tone(v, { type: 'square', from: 1700 - i * 240, decay: 0.05, peak: 0.05, delay: i * 0.042 });
  }
}

/** A recast. Something leaves and something arrives: one sweep up. */
function recast(v: Voice): void {
  noise(v, { from: 500, to: 4200, q: 0.8, attack: 0.03, decay: 0.24, peak: 0.3 });
  tone(v, { type: 'triangle', from: midi(69), to: midi(81), attack: 0.02, decay: 0.24, peak: 0.12 });
}

/** The game starting. A low gong, and the only patch allowed to take a second. */
function gamestart(v: Voice): void {
  noise(v, { type: 'bandpass', from: 1800, to: 400, q: 0.6, decay: 0.5, peak: 0.26 });
  tone(v, { type: 'sine', from: 92, attack: 0.008, decay: 2.2, peak: 0.34 });
  tone(v, { type: 'sine', from: 138, attack: 0.01, decay: 1.6, peak: 0.2 });
  tone(v, { type: 'triangle', from: 231, attack: 0.01, decay: 1.1, peak: 0.1 });
}

/** Winning. Three notes up the mode, struck like small bells. */
function win(v: Voice): void {
  const notes = [72, 76, 79, 84];
  notes.forEach((n, i) => {
    tone(v, { type: 'triangle', from: midi(n), attack: 0.004, decay: 0.9 - i * 0.1, peak: 0.2, delay: i * 0.13 });
    tone(v, { type: 'sine', from: midi(n) * 2.76, attack: 0.004, decay: 0.4, peak: 0.06, delay: i * 0.13 });
  });
}

/** Losing. Two notes down, over a drone that outlasts them. */
function lose(v: Voice): void {
  tone(v, { type: 'sine', from: midi(45), attack: 0.05, decay: 1.8, peak: 0.24 });
  tone(v, { type: 'triangle', from: midi(69), attack: 0.006, decay: 0.7, peak: 0.16 });
  tone(v, { type: 'triangle', from: midi(64), attack: 0.006, decay: 1.1, peak: 0.16, delay: 0.22 });
}

/** A path that parsed as nothing known. A soft knock, pitched by the name. */
function generic(v: Voice, cue: SoundCue): void {
  const f = 180 + unit(cue.seed ?? 0, 8) * 260;
  tone(v, { type: 'sine', from: f, to: f * 0.6, decay: 0.16, peak: 0.3 });
  noise(v, { from: f * 6, to: f * 3, q: 1.5, decay: 0.06, peak: 0.2 });
}

/* --------------------------------------------------------------- the bank */

/**
 * Play one cue.
 *
 * Every patch is wrapped: a synthesiser that throws takes down the notify
 * handler it was called from, and no sound is worth that. A browser that has
 * `AudioContext` but not one of the node types used here — and they exist —
 * should lose that effect, not the game.
 */
export function play(cue: SoundCue, v: Voice): void {
  try {
    switch (cue.sound) {
      case 'card': return card(v, cue);
      case 'equip': return equip(v, cue);
      case 'gear': return gear(v, cue);
      case 'damage': return damage(v, cue);
      case 'losehp': return losehp(v);
      case 'losemaxhp': return losemaxhp(v);
      case 'death': return death(v, cue);
      case 'draw': return draw(v);
      case 'judge': return judge(v, cue);
      case 'skill': return skill(v, cue);
      case 'chain': return chain(v);
      case 'recast': return recast(v);
      case 'gamestart': return gamestart(v);
      case 'win': return win(v);
      case 'lose': return lose(v);
      default: return generic(v, cue);
    }
  } catch {
    // An effect is never worth a broken table.
  }
}

/**
 * Roughly how long a patch rings, in seconds.
 *
 * Used for two things and nothing else: keeping the music ducked while a long
 * cue is under it, and deciding whether a repeat of the same cue should be
 * dropped rather than layered. It does not have to be exact and is not.
 */
export function lengthOf(cue: SoundCue): number {
  switch (cue.sound) {
    case 'gamestart': return 2.3;
    case 'win': return 1.4;
    case 'lose': return 1.9;
    case 'death': return 1.4;
    case 'damage': return cue.heavy ? 0.7 : 0.4;
    case 'skill': return 0.55;
    case 'judge': return 0.55;
    default: return 0.3;
  }
}
