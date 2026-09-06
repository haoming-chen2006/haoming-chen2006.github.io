/**
 * Sound design. Every sound is synthesised from oscillators and shaped noise at play time:
 * per-card deploy calls, per-weapon impacts, spell anticipation + impact, possession sweeps,
 * tower collapses with sub-bass and debris, UI, footsteps, and scene ambiences.
 *
 * Public API: init(), setEnabled(), play(name, pos?), handle(event), startAmbience(scene?),
 * stopAmbience(), setAmbience(scene), listener {x,y,yaw,enabled}. See NAMES below.
 */
import type { GameEvent } from '../game/types.ts';
import { bell, clamp, crash, kick, makeImpulse, makeNoise, midi, noise as noiseBurst, note as synthNote, pool, snare, timpani, tom, type Ctx, type NoiseOpts, type NoteOpts } from './synth.ts';

export type AmbienceScene = 'menu' | 'battle';

/** Sound names accepted by play(). Event handling maps game events onto these. */
export const NAMES = [
  'ui', 'hover', 'select', 'back', 'deploy', 'deployBuilding', 'deploySpell', 'cardCycle', 'elixirFull', 'countdown', 'battleStart',
  'arrow', 'spear', 'bolt', 'fireball', 'flame', 'bomb', 'cannon', 'shadow', 'holy', 'ice', 'rock',
  'hitArrow', 'hitBolt', 'hitFire', 'hitBomb', 'hitCannon', 'hitShadow', 'hitHoly', 'hitIce', 'meleeHit', 'meleeHeavy', 'swing',
  'death', 'deathSkeleton', 'towerHit', 'towerDestroyed', 'kingHit', 'kingAwake',
  'spellCast', 'meteorIncoming', 'meteor', 'volley', 'shock', 'frost', 'frenzy',
  'possess', 'release', 'heroDeath', 'dash', 'summon', 'ability', 'hitmarker', 'hurt', 'lowHp', 'crit', 'step', 'elixir', 'invalid', 'overtime', 'doubleElixir', 'victory', 'defeat', 'fanfare', 'crowd',
  'shieldBash', 'rainOfArrows', 'spearFan', 'adrenaline', 'groundSlam', 'piercingShot', 'firestorm', 'whirlwind', 'infernoBreath', 'dive', 'stampede', 'lanceCharge', 'raiseDead', 'deathLeap', 'clusterBomb', 'sanctuary', 'shadowstep', 'thunderstorm',
  'callKnight', 'callArchers', 'callSpearlings', 'callRaiders', 'callColossus', 'callSharpshooter', 'callPyromancer', 'callBerserker', 'callDrake', 'callImps', 'callBoar', 'callLancer', 'callBonehorde', 'callReaper', 'callBombardier', 'callCleric', 'callWraith', 'callStormcaller', 'callCannon', 'callArctower', 'callBarracks',
] as const;
export type SoundName = (typeof NAMES)[number];

const ABILITY_SOUND: Record<string, SoundName> = {
  'Shield Bash': 'shieldBash', 'Rain of Arrows': 'rainOfArrows', 'Spear Fan': 'spearFan', 'Adrenaline': 'adrenaline', 'Ground Slam': 'groundSlam',
  'Piercing Shot': 'piercingShot', 'Firestorm': 'firestorm', 'Whirlwind': 'whirlwind', 'Inferno Breath': 'infernoBreath', 'Dive': 'dive',
  'Stampede': 'stampede', 'Lance Charge': 'lanceCharge', 'Raise Dead': 'raiseDead', 'Death Leap': 'deathLeap', 'Cluster Bomb': 'clusterBomb',
  'Sanctuary': 'sanctuary', 'Shadowstep': 'shadowstep', 'Thunderstorm': 'thunderstorm',
};
const CALL_SOUND: Record<string, SoundName> = {
  knight: 'callKnight', archers: 'callArchers', spearlings: 'callSpearlings', raiders: 'callRaiders', colossus: 'callColossus', sharpshooter: 'callSharpshooter',
  pyromancer: 'callPyromancer', berserker: 'callBerserker', drake: 'callDrake', imps: 'callImps', boar: 'callBoar', lancer: 'callLancer', bonehorde: 'callBonehorde',
  reaper: 'callReaper', bombardier: 'callBombardier', cleric: 'callCleric', wraith: 'callWraith', stormcaller: 'callStormcaller', cannon: 'callCannon', arctower: 'callArctower', barracks: 'callBarracks',
};

export class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = true;
  volume = 0.6;
  /** Listener position in arena units; used for attenuation/panning while possessed. */
  listener = { x: 9, y: 24, enabled: false, yaw: -Math.PI / 2 };
  private base: Ctx | null = null;
  private sfxBus: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastPlay = new Map<string, number>();
  private ambience: { nodes: AudioScheduledSourceNode[]; gain: GainNode; timer: number; scene: AmbienceScene } | null = null;
  private pendingSpells = new Map<string, number>();

  /** Create the AudioContext (must follow a user gesture). */
  init(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.setup(ctx);
  }

  /** Wire the mixer onto any BaseAudioContext (tests use an OfflineAudioContext). */
  setup(ctx: Ctx): void {
    this.base = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 4; limiter.ratio.value = 12; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(limiter); limiter.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.master);
    this.dry = ctx.createGain(); this.dry.connect(this.sfxBus);
    const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx, 1.7, 3.2, 0.012);
    this.wet = ctx.createGain(); this.wet.gain.value = 0.2; this.wet.connect(conv); conv.connect(this.sfxBus);
    this.noiseBuf = makeNoise(ctx, 2);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.master && this.base) this.master.gain.setTargetAtTime(on ? this.volume : 0, this.base.currentTime, 0.02);
  }

  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlay.get(key) ?? -1e9) < ms) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  /** Attenuation + pan for a world position relative to the listener (only while possessed). */
  private spatial(pos?: { x: number; y: number }): { v: number; pan: number } {
    if (!pos || !this.listener.enabled) return { v: 1, pan: 0 };
    const dx = pos.x - this.listener.x, dy = pos.y - this.listener.y;
    const d = Math.hypot(dx, dy);
    const v = clamp(1.2 - d / 18, 0.1, 1);
    const rel = Math.atan2(dy, dx) - this.listener.yaw;
    return { v, pan: Math.sin(rel) * Math.min(1, d / 3) * 0.8 };
  }

  /** Output node with pan + reverb send. */
  private out(pan = 0, wet = 0.35, gain = 1): GainNode {
    const ctx = this.base!;
    const g = ctx.createGain(); g.gain.value = gain;
    let node: AudioNode = g;
    if (pan !== 0) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); node = p; }
    node.connect(this.dry!);
    if (wet > 0) { const w = ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(this.wet!); }
    return g;
  }

  play(name: SoundName | string, pos?: { x: number; y: number }): void {
    if (!this.base || !this.enabled || !this.noiseBuf) return;
    const { v, pan } = this.spatial(pos);
    if (v < 0.12) return;
    const ctx = this.base, nb = this.noiseBuf, t = ctx.currentTime + 0.005;
    const dest = (wet = 0.35) => this.out(pan, wet, v);
    const T = (o: Omit<NoteOpts, 't'> & { t?: number; wet?: number }) => synthNote(ctx, dest(o.wet), { ...o, t: t + (o.t ?? 0) });
    const N = (o: Omit<NoiseOpts, 't'> & { t?: number; wet?: number }) => noiseBurst(ctx, dest(o.wet), nb, { ...o, t: t + (o.t ?? 0) });
    const B = (freq: number, dur: number, gain: number, at = 0, ratio = 2.76) => bell(ctx, dest(0.5), t + at, freq, dur, gain, ratio);
    const thr = (ms: number) => this.throttle(name, ms);
    switch (name as SoundName) {
      // ---------- UI ----------
      case 'ui': T({ freq: 720, dur: 0.05, wave: 'triangle', gain: 0.12, env: { attack: 0.003, release: 0.05 } }); T({ freq: 1080, dur: 0.06, wave: 'sine', gain: 0.07, t: 0.03, env: { release: 0.06 } }); break;
      case 'hover': T({ freq: 900, dur: 0.03, wave: 'sine', gain: 0.05, env: { attack: 0.002, release: 0.04 } }); break;
      case 'select': T({ freq: 520, dur: 0.05, wave: 'triangle', gain: 0.1, env: { release: 0.06 } }); T({ freq: 780, dur: 0.07, wave: 'sine', gain: 0.07, t: 0.05, env: { release: 0.08 } }); break;
      case 'back': T({ freq: 620, dur: 0.05, wave: 'triangle', gain: 0.09, env: { release: 0.05 } }); T({ freq: 410, dur: 0.07, wave: 'sine', gain: 0.07, t: 0.05, env: { release: 0.08 } }); break;
      case 'cardCycle': N({ dur: 0.05, gain: 0.08, filter: { type: 'bandpass', freq: 3000, q: 1 } }); T({ freq: 1400, dur: 0.03, wave: 'sine', gain: 0.04, env: { release: 0.04 } }); break;
      case 'elixirFull': B(midi(86), 0.5, 0.12); B(midi(93), 0.7, 0.1, 0.08); break;
      case 'elixir': T({ freq: 1200, dur: 0.06, wave: 'sine', gain: 0.05, env: { release: 0.08 } }); T({ freq: 1800, dur: 0.08, wave: 'sine', gain: 0.04, t: 0.05, env: { release: 0.1 } }); break;
      case 'countdown': T({ freq: 660, dur: 0.12, wave: 'square', gain: 0.08, filter: { cutoff: 2200, q: 0.7 }, env: { attack: 0.004, release: 0.08 } }); break;
      case 'battleStart': T({ freq: 880, dur: 0.35, wave: 'square', gain: 0.1, filter: { cutoff: 3000, q: 0.7 }, env: { attack: 0.004, release: 0.2 } }); T({ freq: 1320, dur: 0.4, wave: 'sawtooth', unison: 3, detune: 10, gain: 0.08, t: 0.02, filter: { cutoff: 2500 }, env: { release: 0.3 } }); crash(ctx, dest(0.6), nb, t, 0.6); break;
      case 'invalid': T({ freq: 150, dur: 0.14, wave: 'square', gain: 0.08, filter: { cutoff: 900, q: 0.8 }, env: { release: 0.05 } }); T({ freq: 112, dur: 0.14, wave: 'square', gain: 0.06, t: 0.02, filter: { cutoff: 700 } }); break;
      // ---------- deploys ----------
      case 'deploy': T({ freq: 300, dur: 0.14, wave: 'triangle', gain: 0.24, pitchEnv: { from: 1, to: 0.45, time: 0.14 }, env: { attack: 0.003, release: 0.08 } }); N({ dur: 0.12, gain: 0.12, filter: { freq: 1800, to: 300 } }); T({ freq: 85, dur: 0.2, wave: 'sine', gain: 0.22, pitchEnv: { from: 1, to: 0.55, time: 0.2 }, env: { release: 0.05 } }); break;
      case 'deployBuilding': for (let i = 0; i < 3; i++) N({ t: i * 0.09, dur: 0.06, gain: 0.16, filter: { type: 'lowpass', freq: 1200 } }); T({ freq: 110, dur: 0.3, wave: 'triangle', gain: 0.2, t: 0.2, pitchEnv: { from: 1, to: 0.7, time: 0.3 }, env: { release: 0.15 } }); break;
      case 'deploySpell': T({ freq: 520, dur: 0.35, wave: 'sine', gain: 0.12, pitchEnv: { from: 1, to: 2.3, time: 0.35 }, env: { attack: 0.02, release: 0.2 }, wet: 0.6 }); N({ dur: 0.35, gain: 0.06, filter: { type: 'highpass', freq: 3000 } }); break;
      // ---------- ranged fire by projectile style ----------
      case 'arrow': if (thr(45)) { T({ freq: 180, dur: 0.06, wave: 'triangle', gain: 0.08, pitchEnv: { from: 1.6, to: 0.9, time: 0.05 }, env: { attack: 0.002, release: 0.04 } }); N({ dur: 0.1, gain: 0.08, filter: { type: 'bandpass', freq: 5000, q: 0.8, to: 1500 } }); } break;
      case 'spear': if (thr(45)) N({ dur: 0.14, gain: 0.09, filter: { type: 'bandpass', freq: 2400, q: 1.2, to: 700 } }); break;
      case 'bolt': if (thr(55)) { T({ freq: 1800, dur: 0.09, wave: 'sawtooth', gain: 0.08, pitchEnv: { from: 1, to: 0.12, time: 0.09 }, filter: { cutoff: 4500 }, env: { attack: 0.001, release: 0.04 } }); N({ dur: 0.07, gain: 0.07, filter: { type: 'highpass', freq: 3500 } }); } break;
      case 'fireball': if (thr(70)) { N({ dur: 0.32, gain: 0.16, attack: 0.03, filter: { freq: 900, to: 250 }, curve: 0.8 }); T({ freq: 170, dur: 0.28, wave: 'triangle', gain: 0.09, pitchEnv: { from: 1, to: 0.4, time: 0.28 } }); } break;
      case 'flame': if (thr(70)) N({ dur: 0.25, gain: 0.12, attack: 0.04, filter: { freq: 1400, to: 400 }, curve: 0.7 }); break;
      case 'bomb': case 'cannon': if (thr(70)) { N({ dur: 0.16, gain: 0.24, filter: { freq: 700 } }); T({ freq: 96, dur: 0.22, wave: 'sine', gain: 0.28, pitchEnv: { from: 1, to: 0.45, time: 0.2 }, env: { release: 0.05 } }); } break;
      case 'shadow': if (thr(60)) T({ freq: 420, dur: 0.18, wave: 'sawtooth', unison: 2, detune: 30, gain: 0.07, pitchEnv: { from: 1.4, to: 0.7, time: 0.18 }, filter: { cutoff: 1200, q: 2 }, env: { release: 0.1 }, wet: 0.6 }); break;
      case 'holy': if (thr(60)) { B(midi(88), 0.35, 0.09); B(midi(95), 0.4, 0.06, 0.03); } break;
      case 'ice': if (thr(60)) { N({ dur: 0.12, gain: 0.08, filter: { type: 'highpass', freq: 6000 } }); B(midi(96), 0.3, 0.06, 0, 4.1); } break;
      case 'rock': if (thr(60)) N({ dur: 0.12, gain: 0.12, filter: { freq: 1200, to: 300 } }); break;
      // ---------- impacts ----------
      case 'hitArrow': if (thr(40)) { N({ dur: 0.05, gain: 0.12, filter: { freq: 2600, to: 600 } }); T({ freq: 260, dur: 0.04, wave: 'triangle', gain: 0.06, pitchEnv: { from: 1, to: 0.5, time: 0.04 } }); } break;
      case 'hitBolt': if (thr(40)) { N({ dur: 0.08, gain: 0.12, filter: { type: 'highpass', freq: 2500 } }); T({ freq: 2400, dur: 0.06, wave: 'square', gain: 0.05, pitchEnv: { from: 1, to: 0.3, time: 0.06 } }); } break;
      case 'hitFire': if (thr(60)) { N({ dur: 0.3, gain: 0.2, filter: { freq: 1600, to: 200 }, curve: 0.9 }); T({ freq: 90, dur: 0.25, wave: 'sine', gain: 0.22, pitchEnv: { from: 1, to: 0.5, time: 0.25 } }); } break;
      case 'hitBomb': case 'hitCannon': if (thr(60)) { N({ dur: 0.45, gain: 0.3, filter: { freq: 2200, to: 120 }, curve: 0.8 }); T({ freq: 70, dur: 0.4, wave: 'sine', gain: 0.35, pitchEnv: { from: 1.3, to: 0.4, time: 0.35 } }); N({ t: 0.05, dur: 0.3, gain: 0.1, filter: { type: 'bandpass', freq: 3000, q: 0.6 } }); } break;
      case 'hitShadow': if (thr(50)) T({ freq: 300, dur: 0.16, wave: 'sawtooth', unison: 2, detune: 40, gain: 0.08, pitchEnv: { from: 1, to: 0.4, time: 0.16 }, filter: { cutoff: 900 }, wet: 0.6 }); break;
      case 'hitHoly': if (thr(50)) B(midi(91), 0.25, 0.07); break;
      case 'hitIce': if (thr(50)) { N({ dur: 0.15, gain: 0.1, filter: { type: 'highpass', freq: 5000 } }); for (let i = 0; i < 3; i++) B(midi(96 + i * 4), 0.2, 0.04, i * 0.03, 4.1); } break;
      case 'meleeHit': if (thr(35)) { N({ dur: 0.07, gain: 0.14, filter: { freq: 1000, to: 300 } }); T({ freq: 160 + Math.random() * 60, dur: 0.06, wave: 'triangle', gain: 0.08, pitchEnv: { from: 1.3, to: 0.6, time: 0.06 } }); T({ freq: 2200 + Math.random() * 800, dur: 0.05, wave: 'sine', gain: 0.03 }); } break;
      case 'meleeHeavy': if (thr(60)) { N({ dur: 0.14, gain: 0.22, filter: { freq: 800, to: 150 } }); T({ freq: 75, dur: 0.18, wave: 'sine', gain: 0.24, pitchEnv: { from: 1.4, to: 0.5, time: 0.16 } }); } break;
      case 'swing': if (thr(50)) N({ dur: 0.13, gain: 0.14, filter: { type: 'bandpass', freq: 900, q: 0.7, to: 2200 } }); break;
      // ---------- deaths & towers ----------
      case 'death': if (thr(50)) { T({ freq: 380 + Math.random() * 80, dur: 0.24, wave: 'sawtooth', gain: 0.06, pitchEnv: { from: 1, to: 0.22, time: 0.24 }, filter: { cutoff: 1400 } }); N({ dur: 0.14, gain: 0.07, filter: { freq: 700 } }); } break;
      case 'deathSkeleton': if (thr(50)) for (let i = 0; i < 4; i++) N({ t: i * 0.04, dur: 0.03, gain: 0.14, filter: { type: 'bandpass', freq: 2500 + i * 400, q: 3 } }); break;
      case 'towerHit': if (thr(100)) { N({ dur: 0.11, gain: 0.16, filter: { freq: 500 } }); T({ freq: 72, dur: 0.16, wave: 'sine', gain: 0.16, pitchEnv: { from: 1, to: 0.6, time: 0.15 } }); N({ t: 0.02, dur: 0.05, gain: 0.05, filter: { type: 'highpass', freq: 3000 } }); } break;
      case 'towerDestroyed': {
        N({ dur: 1.2, gain: 0.5, filter: { freq: 900, to: 80 }, curve: 0.5 });
        T({ freq: 58, dur: 1.1, wave: 'sine', gain: 0.45, pitchEnv: { from: 1.2, to: 0.5, time: 1.0 } });
        for (let i = 0; i < 9; i++) N({ t: 0.12 + i * 0.11 + Math.random() * 0.05, dur: 0.07, gain: 0.22, filter: { freq: 1200 + Math.random() * 800, to: 200 }, pan: (Math.random() - 0.5) * 0.8 });
        this.play('crowd');
        break;
      }
      case 'kingHit': {
        N({ dur: 2.0, gain: 0.55, filter: { freq: 700, to: 50 }, curve: 0.45 });
        T({ freq: 48, dur: 1.8, wave: 'sine', gain: 0.5, pitchEnv: { from: 1.3, to: 0.45, time: 1.6 } });
        for (let i = 0; i < 14; i++) N({ t: 0.15 + i * 0.12 + Math.random() * 0.06, dur: 0.08, gain: 0.25, filter: { freq: 1000 + Math.random() * 900, to: 150 }, pan: (Math.random() - 0.5) });
        this.play('crowd');
        break;
      }
      case 'crowd': for (let i = 0; i < 3; i++) N({ t: i * 0.15, dur: 1.8, gain: 0.07, attack: 0.3, filter: { type: 'bandpass', freq: 900 + i * 300, q: 0.5 }, curve: 0.5, wet: 0.7, pan: (i - 1) * 0.5 }); break;
      case 'kingAwake': T({ freq: 220, dur: 0.8, wave: 'sawtooth', unison: 4, detune: 14, gain: 0.12, filter: { cutoff: 600, envAmount: 1800, decay: 0.4, q: 1 }, env: { attack: 0.03, release: 0.4 } }); T({ freq: 330, dur: 0.8, wave: 'sawtooth', unison: 3, detune: 12, gain: 0.08, t: 0.02, filter: { cutoff: 800, envAmount: 1500, decay: 0.4 } }); timpani(ctx, dest(0.5), t, 55, 0.9); break;
      // ---------- spells ----------
      case 'spellCast': T({ freq: 400, dur: 0.5, wave: 'sine', gain: 0.1, pitchEnv: { from: 1, to: 3, time: 0.5 }, env: { attack: 0.05, release: 0.2 }, wet: 0.6 }); N({ dur: 0.5, gain: 0.05, attack: 0.1, filter: { type: 'highpass', freq: 2500, to: 9000 } }); break;
      case 'meteorIncoming': N({ dur: 1.0, gain: 0.14, attack: 0.25, filter: { freq: 250, to: 5000 }, curve: 0.5, wet: 0.6 }); T({ freq: 180, dur: 1.0, wave: 'sawtooth', gain: 0.05, pitchEnv: { from: 1, to: 5, time: 1.0 }, filter: { cutoff: 1200 } }); break;
      case 'meteor': N({ dur: 1.0, gain: 0.45, filter: { freq: 3000, to: 90 }, curve: 0.55 }); T({ freq: 130, dur: 0.7, wave: 'sine', gain: 0.4, pitchEnv: { from: 1, to: 0.25, time: 0.6 } }); T({ freq: 55, dur: 0.9, wave: 'sine', gain: 0.3, t: 0.05, pitchEnv: { from: 1, to: 0.5, time: 0.8 } }); for (let i = 0; i < 6; i++) N({ t: 0.1 + i * 0.09, dur: 0.06, gain: 0.15, filter: { freq: 1500, to: 200 }, pan: (Math.random() - 0.5) }); break;
      case 'volley': N({ dur: 0.45, gain: 0.12, filter: { type: 'highpass', freq: 1800 } }); for (let i = 0; i < 8; i++) N({ t: 0.3 + i * 0.045, dur: 0.05, gain: 0.07, filter: { type: 'bandpass', freq: 2500 + Math.random() * 1500, q: 1 }, pan: (Math.random() - 0.5) }); break;
      case 'shock': T({ freq: 2400, dur: 0.2, wave: 'sawtooth', gain: 0.14, pitchEnv: { from: 1, to: 0.08, time: 0.2 }, filter: { cutoff: 6000 } }); N({ dur: 0.14, gain: 0.12, filter: { type: 'highpass', freq: 3500 } }); T({ freq: 90, dur: 0.14, wave: 'sine', gain: 0.1, pitchEnv: { from: 1, to: 0.4, time: 0.12 } }); break;
      case 'frost': N({ dur: 0.6, gain: 0.08, filter: { type: 'highpass', freq: 5000 }, wet: 0.7 }); for (let i = 0; i < 5; i++) B(midi(84 + [0, 4, 7, 11, 14][i]), 0.6, 0.06, i * 0.05, 4.1); T({ freq: 1300, dur: 0.6, wave: 'sine', gain: 0.05, pitchEnv: { from: 1, to: 1.6, time: 0.6 }, wet: 0.8 }); break;
      case 'frenzy': T({ freq: 180, dur: 0.5, wave: 'sawtooth', unison: 3, detune: 20, gain: 0.1, pitchEnv: { from: 1, to: 5, time: 0.5 }, filter: { cutoff: 1500 } }); T({ freq: 360, dur: 0.5, wave: 'square', gain: 0.04, t: 0.05, pitchEnv: { from: 1, to: 5, time: 0.5 }, filter: { cutoff: 2000 } }); break;
      // ---------- possession ----------
      case 'possess': {
        T({ freq: 220, dur: 0.6, wave: 'sine', gain: 0.22, pitchEnv: { from: 1, to: 4, time: 0.55 }, env: { attack: 0.02, release: 0.3 }, wet: 0.8 });
        T({ freq: 330, dur: 0.65, wave: 'triangle', gain: 0.1, t: 0.05, pitchEnv: { from: 1, to: 4, time: 0.55 }, wet: 0.8 });
        N({ dur: 0.55, gain: 0.08, attack: 0.1, filter: { type: 'highpass', freq: 2000, to: 500 } });
        for (let i = 0; i < 5; i++) B(midi(86 + [0, 3, 7, 10, 14][i]), 1.0, 0.07, 0.3 + i * 0.05);
        break;
      }
      case 'release': T({ freq: 880, dur: 0.5, wave: 'sine', gain: 0.16, pitchEnv: { from: 1, to: 0.25, time: 0.5 }, wet: 0.7 }); N({ dur: 0.4, gain: 0.05, filter: { type: 'highpass', freq: 2000 } }); break;
      case 'heroDeath': T({ freq: 600, dur: 0.75, wave: 'sine', gain: 0.22, pitchEnv: { from: 1, to: 0.18, time: 0.7 } }); T({ freq: 300, dur: 0.75, wave: 'triangle', gain: 0.12, t: 0.05, pitchEnv: { from: 1, to: 0.18, time: 0.7 } }); N({ dur: 0.5, gain: 0.15, filter: { freq: 800, to: 100 } }); for (let i = 0; i < 3; i++) B(midi(81 - i * 4), 0.9, 0.06, 0.2 + i * 0.25); break;
      case 'dash': N({ dur: 0.24, gain: 0.16, filter: { freq: 3500, to: 300 } }); T({ freq: 300, dur: 0.18, wave: 'sine', gain: 0.05, pitchEnv: { from: 1, to: 0.4, time: 0.18 } }); break;
      case 'summon': T({ freq: 300, dur: 0.28, wave: 'triangle', gain: 0.12, pitchEnv: { from: 1, to: 2.2, time: 0.25 } }); N({ dur: 0.2, gain: 0.05, filter: { type: 'highpass', freq: 3000 } }); break;
      case 'ability': T({ freq: 480, dur: 0.14, wave: 'square', gain: 0.08, pitchEnv: { from: 1, to: 2.3, time: 0.14 }, filter: { cutoff: 3000 } }); T({ freq: 720, dur: 0.3, wave: 'triangle', gain: 0.12, t: 0.04 }); N({ dur: 0.2, gain: 0.06, filter: { type: 'highpass', freq: 2500 } }); break;
      case 'hitmarker': T({ freq: 1500, dur: 0.035, wave: 'square', gain: 0.05, env: { release: 0.02 } }); N({ dur: 0.03, gain: 0.05, filter: { type: 'highpass', freq: 5000 } }); break;
      case 'hurt': N({ dur: 0.12, gain: 0.12, filter: { freq: 700 } }); T({ freq: 200, dur: 0.12, wave: 'triangle', gain: 0.08, pitchEnv: { from: 1, to: 0.45, time: 0.12 } }); break;
      case 'lowHp': T({ freq: 700, dur: 0.1, wave: 'sine', gain: 0.1 }); T({ freq: 700, dur: 0.1, wave: 'sine', gain: 0.1, t: 0.15 }); break;
      case 'crit': T({ freq: 900, dur: 0.14, wave: 'square', gain: 0.1, pitchEnv: { from: 1, to: 1.8, time: 0.14 }, filter: { cutoff: 4000 } }); N({ dur: 0.08, gain: 0.1, filter: { type: 'highpass', freq: 3000 } }); break;
      case 'step': if (thr(110)) N({ dur: 0.05, gain: 0.045, filter: { freq: 400 + Math.random() * 250 }, rate: 0.9 + Math.random() * 0.3 }); break;
      case 'overtime': for (let i = 0; i < 3; i++) T({ freq: 440, dur: 0.14, wave: 'square', gain: 0.1, t: i * 0.2, filter: { cutoff: 2500 } }); T({ freq: 440, dur: 0.6, wave: 'sawtooth', unison: 3, detune: 12, gain: 0.1, t: 0.65, filter: { cutoff: 2000 } }); break;
      case 'doubleElixir': B(midi(86), 0.6, 0.12); B(midi(93), 0.8, 0.1, 0.12); B(midi(98), 1.0, 0.08, 0.24); break;
      case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => T({ freq: f, dur: 0.35, wave: 'triangle', gain: 0.14, t: i * 0.12, wet: 0.7 })); break;
      case 'victory': [523, 659, 784, 1047, 1319].forEach((f, i) => { T({ freq: f, dur: 0.6, wave: 'triangle', gain: 0.16, t: i * 0.15, wet: 0.8 }); T({ freq: f / 2, dur: 0.6, wave: 'sine', gain: 0.08, t: i * 0.15 }); }); this.play('crowd'); break;
      case 'defeat': [440, 415, 370, 330].forEach((f, i) => T({ freq: f, dur: 0.7, wave: 'sawtooth', gain: 0.09, t: i * 0.3, filter: { cutoff: 1200 }, wet: 0.8 })); break;
      // ---------- abilities ----------
      case 'shieldBash': N({ dur: 0.25, gain: 0.18, filter: { freq: 2500, to: 300 } }); T({ freq: 110, dur: 0.3, wave: 'sine', gain: 0.25, t: 0.12, pitchEnv: { from: 1.5, to: 0.5, time: 0.25 } }); T({ freq: 3000, dur: 0.12, wave: 'square', gain: 0.04, t: 0.12, pitchEnv: { from: 1, to: 0.5, time: 0.1 } }); break;
      case 'rainOfArrows': N({ dur: 0.3, gain: 0.1, filter: { type: 'highpass', freq: 2000 } }); for (let i = 0; i < 10; i++) N({ t: 0.25 + i * 0.05, dur: 0.05, gain: 0.07, filter: { type: 'bandpass', freq: 2200 + Math.random() * 2000, q: 1.2 }, pan: (Math.random() - 0.5) * 0.8 }); break;
      case 'spearFan': for (let i = 0; i < 5; i++) N({ t: i * 0.03, dur: 0.14, gain: 0.09, filter: { type: 'bandpass', freq: 2200, q: 1.2, to: 600 }, pan: (i - 2) * 0.3 }); break;
      case 'adrenaline': T({ freq: 220, dur: 0.45, wave: 'sawtooth', unison: 3, detune: 20, gain: 0.1, pitchEnv: { from: 1, to: 3.5, time: 0.45 }, filter: { cutoff: 2500 } }); for (let i = 0; i < 4; i++) T({ freq: 90, dur: 0.06, wave: 'sine', gain: 0.14, t: 0.1 + i * 0.09, pitchEnv: { from: 1.3, to: 0.6, time: 0.05 } }); break;
      case 'groundSlam': T({ freq: 55, dur: 0.7, wave: 'sine', gain: 0.45, pitchEnv: { from: 1.6, to: 0.4, time: 0.5 } }); N({ dur: 0.6, gain: 0.35, filter: { freq: 1200, to: 80 }, curve: 0.6 }); for (let i = 0; i < 6; i++) N({ t: 0.08 + i * 0.07, dur: 0.06, gain: 0.14, filter: { freq: 900, to: 200 }, pan: (Math.random() - 0.5) }); break;
      case 'piercingShot': T({ freq: 2600, dur: 0.14, wave: 'sawtooth', gain: 0.12, pitchEnv: { from: 1, to: 0.1, time: 0.14 }, filter: { cutoff: 7000 } }); N({ dur: 0.3, gain: 0.2, filter: { freq: 4000, to: 300 } }); T({ freq: 80, dur: 0.25, wave: 'sine', gain: 0.2, pitchEnv: { from: 1.2, to: 0.5, time: 0.2 } }); break;
      case 'firestorm': N({ dur: 1.1, gain: 0.3, attack: 0.05, filter: { freq: 2500, to: 300 }, curve: 0.5 }); T({ freq: 90, dur: 0.6, wave: 'sine', gain: 0.25, pitchEnv: { from: 1.3, to: 0.4, time: 0.5 } }); for (let i = 0; i < 6; i++) N({ t: 0.15 + i * 0.12, dur: 0.15, gain: 0.1, filter: { type: 'bandpass', freq: 800 + Math.random() * 1500, q: 0.8 }, pan: (Math.random() - 0.5) }); break;
      case 'whirlwind': for (let i = 0; i < 6; i++) N({ t: i * 0.36, dur: 0.3, gain: 0.12, filter: { type: 'bandpass', freq: 700, q: 0.8, to: 2400 }, pan: Math.sin(i * 1.3) * 0.7 }); T({ freq: 150, dur: 2.2, wave: 'sawtooth', unison: 2, detune: 15, gain: 0.05, filter: { cutoff: 600, q: 3 }, vibrato: { rate: 2.8, depth: 40 } }); break;
      case 'infernoBreath': T({ freq: 150, dur: 0.35, wave: 'sawtooth', unison: 3, detune: 30, gain: 0.14, pitchEnv: { from: 0.7, to: 1.2, time: 0.3 }, filter: { cutoff: 900, q: 2 } }); N({ dur: 1.6, gain: 0.22, attack: 0.12, filter: { freq: 1800, to: 500 }, curve: 0.45 }); N({ t: 0.2, dur: 1.3, gain: 0.1, attack: 0.2, filter: { type: 'bandpass', freq: 400, q: 0.7 }, curve: 0.5 }); break;
      case 'dive': N({ dur: 0.35, gain: 0.16, filter: { freq: 4000, to: 400 } }); for (let i = 0; i < 3; i++) T({ freq: 1200 + i * 300, dur: 0.08, wave: 'square', gain: 0.04, t: i * 0.06, pitchEnv: { from: 1.4, to: 0.8, time: 0.08 }, filter: { cutoff: 3000 } }); break;
      case 'stampede': for (let i = 0; i < 8; i++) { T({ freq: 70, dur: 0.08, wave: 'sine', gain: 0.22, t: i * 0.11, pitchEnv: { from: 1.4, to: 0.6, time: 0.06 } }); N({ t: i * 0.11, dur: 0.05, gain: 0.08, filter: { freq: 900 } }); } N({ dur: 0.35, gain: 0.12, filter: { type: 'bandpass', freq: 300, q: 2, to: 900 } }); break;
      case 'lanceCharge': N({ dur: 0.5, gain: 0.18, attack: 0.05, filter: { freq: 500, to: 3500 } }); for (let i = 0; i < 6; i++) T({ freq: 75, dur: 0.07, wave: 'sine', gain: 0.18, t: i * 0.09, pitchEnv: { from: 1.3, to: 0.6, time: 0.05 } }); T({ freq: 3200, dur: 0.15, wave: 'square', gain: 0.04, t: 0.45, pitchEnv: { from: 1, to: 0.4, time: 0.12 } }); break;
      case 'raiseDead': T({ freq: 110, dur: 0.8, wave: 'sawtooth', unison: 3, detune: 25, gain: 0.1, pitchEnv: { from: 0.6, to: 1, time: 0.6 }, filter: { cutoff: 700, q: 2 }, wet: 0.7 }); for (let i = 0; i < 6; i++) N({ t: 0.2 + i * 0.07, dur: 0.03, gain: 0.08, filter: { type: 'bandpass', freq: 2200 + i * 300, q: 3 }, pan: (Math.random() - 0.5) }); break;
      case 'deathLeap': N({ dur: 0.3, gain: 0.12, filter: { freq: 600, to: 3000 } }); T({ freq: 60, dur: 0.5, wave: 'sine', gain: 0.4, t: 0.32, pitchEnv: { from: 1.6, to: 0.4, time: 0.4 } }); N({ t: 0.32, dur: 0.4, gain: 0.3, filter: { freq: 1500, to: 100 }, curve: 0.6 }); break;
      case 'clusterBomb': T({ freq: 400, dur: 0.6, wave: 'sine', gain: 0.06, pitchEnv: { from: 1, to: 0.5, time: 0.6 } }); N({ dur: 0.5, gain: 0.05, filter: { type: 'bandpass', freq: 1200, q: 2, to: 300 } }); break;
      case 'sanctuary': for (let i = 0; i < 4; i++) B(midi(76 + [0, 4, 7, 12][i]), 1.2, 0.09, i * 0.08); T({ freq: 330, dur: 1.2, wave: 'sine', gain: 0.08, octaveLayer: 0.05, env: { attack: 0.3, release: 0.5 }, wet: 0.8 }); N({ dur: 0.8, gain: 0.04, attack: 0.2, filter: { type: 'highpass', freq: 5000 } }); break;
      case 'shadowstep': N({ dur: 0.2, gain: 0.12, filter: { freq: 5000, to: 200 } }); T({ freq: 500, dur: 0.25, wave: 'sawtooth', unison: 2, detune: 50, gain: 0.07, pitchEnv: { from: 1, to: 0.3, time: 0.25 }, filter: { cutoff: 1500, q: 2 }, wet: 0.7 }); T({ freq: 800, dur: 0.2, wave: 'sine', gain: 0.06, t: 0.2, pitchEnv: { from: 0.5, to: 1.5, time: 0.2 } }); break;
      case 'thunderstorm': for (let i = 0; i < 5; i++) { T({ freq: 3000, dur: 0.1, wave: 'sawtooth', gain: 0.09, t: i * 0.09, pitchEnv: { from: 1, to: 0.1, time: 0.1 }, filter: { cutoff: 7000 }, pan: (Math.random() - 0.5) }); N({ t: i * 0.09, dur: 0.08, gain: 0.08, filter: { type: 'highpass', freq: 3000 } }); } T({ freq: 60, dur: 0.6, wave: 'sine', gain: 0.25, t: 0.05, pitchEnv: { from: 1.2, to: 0.5, time: 0.5 } }); N({ t: 0.1, dur: 0.9, gain: 0.2, filter: { freq: 900, to: 100 }, curve: 0.6 }); break;
      // ---------- unit calls on deploy ----------
      case 'callKnight': T({ freq: 200, dur: 0.18, wave: 'square', gain: 0.06, filter: { cutoff: 1200 }, pitchEnv: { from: 0.9, to: 1.1, time: 0.15 } }); N({ t: 0.1, dur: 0.06, gain: 0.1, filter: { type: 'bandpass', freq: 3500, q: 2 } }); break;
      case 'callArchers': T({ freq: 120, dur: 0.1, wave: 'triangle', gain: 0.07, pitchEnv: { from: 1.5, to: 0.8, time: 0.08 } }); N({ dur: 0.1, gain: 0.06, filter: { type: 'bandpass', freq: 4000, q: 1 } }); break;
      case 'callSpearlings': case 'callRaiders': for (let i = 0; i < 3; i++) T({ freq: 520 + i * 90, dur: 0.07, wave: 'square', gain: 0.045, t: i * 0.07, filter: { cutoff: 2500 }, pitchEnv: { from: 1.2, to: 0.9, time: 0.06 } }); break;
      case 'callColossus': T({ freq: 60, dur: 0.5, wave: 'sine', gain: 0.35, pitchEnv: { from: 1.5, to: 0.5, time: 0.4 } }); N({ dur: 0.4, gain: 0.2, filter: { freq: 700, to: 100 } }); T({ freq: 90, dur: 0.6, wave: 'sawtooth', unison: 3, detune: 20, gain: 0.06, filter: { cutoff: 400, q: 2 }, vibrato: { rate: 6, depth: 30 } }); break;
      case 'callSharpshooter': N({ dur: 0.05, gain: 0.08, filter: { type: 'bandpass', freq: 2500, q: 2 } }); N({ t: 0.08, dur: 0.05, gain: 0.1, filter: { type: 'bandpass', freq: 3200, q: 2 } }); break;
      case 'callPyromancer': N({ dur: 0.4, gain: 0.1, attack: 0.05, filter: { freq: 1200, to: 300 } }); T({ freq: 660, dur: 0.3, wave: 'sine', gain: 0.06, pitchEnv: { from: 1, to: 2, time: 0.3 } }); break;
      case 'callBerserker': T({ freq: 180, dur: 0.35, wave: 'sawtooth', unison: 3, detune: 25, gain: 0.09, filter: { cutoff: 900, q: 1.5 }, pitchEnv: { from: 0.8, to: 1.1, time: 0.2 }, vibrato: { rate: 8, depth: 25 } }); break;
      case 'callDrake': T({ freq: 160, dur: 0.6, wave: 'sawtooth', unison: 4, detune: 35, gain: 0.14, filter: { cutoff: 700, q: 2, envAmount: 800, decay: 0.3 }, pitchEnv: { from: 0.8, to: 1.3, time: 0.4 }, vibrato: { rate: 7, depth: 35 } }); N({ dur: 0.5, gain: 0.08, filter: { freq: 900, to: 300 } }); break;
      case 'callImps': for (let i = 0; i < 4; i++) T({ freq: 900 + Math.random() * 500, dur: 0.05, wave: 'square', gain: 0.035, t: i * 0.06, pitchEnv: { from: 1.3, to: 0.8, time: 0.05 }, filter: { cutoff: 4000 } }); break;
      case 'callBoar': T({ freq: 140, dur: 0.22, wave: 'sawtooth', unison: 2, detune: 30, gain: 0.1, filter: { cutoff: 600, q: 3 }, pitchEnv: { from: 1.1, to: 0.7, time: 0.2 } }); N({ dur: 0.18, gain: 0.1, filter: { type: 'bandpass', freq: 500, q: 1.5 } }); for (let i = 0; i < 3; i++) T({ freq: 75, dur: 0.06, wave: 'sine', gain: 0.14, t: 0.15 + i * 0.1, pitchEnv: { from: 1.3, to: 0.6, time: 0.05 } }); break;
      case 'callLancer': T({ freq: 620, dur: 0.12, wave: 'square', gain: 0.05, filter: { cutoff: 2500 } }); T({ freq: 830, dur: 0.22, wave: 'square', gain: 0.05, t: 0.12, filter: { cutoff: 2500 } }); for (let i = 0; i < 3; i++) T({ freq: 80, dur: 0.06, wave: 'sine', gain: 0.12, t: 0.1 + i * 0.1, pitchEnv: { from: 1.3, to: 0.6, time: 0.05 } }); break;
      case 'callBonehorde': for (let i = 0; i < 8; i++) N({ t: i * 0.045, dur: 0.03, gain: 0.16, filter: { type: 'bandpass', freq: 2000 + Math.random() * 1500, q: 3 }, pan: (Math.random() - 0.5) }); break;
      case 'callReaper': T({ freq: 90, dur: 0.6, wave: 'sawtooth', unison: 3, detune: 30, gain: 0.08, filter: { cutoff: 500, q: 2 }, pitchEnv: { from: 1, to: 0.7, time: 0.5 }, wet: 0.7 }); N({ dur: 0.4, gain: 0.05, filter: { type: 'bandpass', freq: 600, q: 1 } }); break;
      case 'callBombardier': N({ dur: 0.06, gain: 0.08, filter: { type: 'bandpass', freq: 2500, q: 2 } }); T({ freq: 1200, dur: 0.15, wave: 'sine', gain: 0.03, t: 0.05, pitchEnv: { from: 1, to: 2, time: 0.15 } }); break;
      case 'callCleric': B(midi(81), 0.6, 0.08); B(midi(88), 0.7, 0.06, 0.1); break;
      case 'callWraith': T({ freq: 240, dur: 0.6, wave: 'sawtooth', unison: 3, detune: 45, gain: 0.06, filter: { cutoff: 800, q: 2 }, pitchEnv: { from: 1.2, to: 0.6, time: 0.6 }, wet: 0.8 }); N({ dur: 0.6, gain: 0.05, attack: 0.1, filter: { type: 'bandpass', freq: 1200, q: 1, to: 400 } }); break;
      case 'callStormcaller': T({ freq: 1800, dur: 0.12, wave: 'sawtooth', gain: 0.06, pitchEnv: { from: 1, to: 0.3, time: 0.12 }, filter: { cutoff: 5000 } }); N({ dur: 0.1, gain: 0.05, filter: { type: 'highpass', freq: 3500 } }); B(midi(93), 0.3, 0.04, 0.05); break;
      case 'callCannon': for (let i = 0; i < 2; i++) N({ t: i * 0.1, dur: 0.06, gain: 0.14, filter: { freq: 900 } }); T({ freq: 140, dur: 0.15, wave: 'triangle', gain: 0.1, t: 0.2, pitchEnv: { from: 1, to: 0.7, time: 0.15 } }); break;
      case 'callArctower': T({ freq: 200, dur: 0.6, wave: 'sawtooth', unison: 2, detune: 10, gain: 0.07, pitchEnv: { from: 0.5, to: 2, time: 0.6 }, filter: { cutoff: 2500 } }); N({ dur: 0.3, gain: 0.05, filter: { type: 'highpass', freq: 5000 } }); break;
      case 'callBarracks': for (let i = 0; i < 3; i++) { N({ t: i * 0.12, dur: 0.05, gain: 0.12, filter: { freq: 1500 } }); T({ freq: 2200, dur: 0.05, wave: 'sine', gain: 0.03, t: i * 0.12 }); } break;
      default: break;
    }
  }

  /** Map a simulation event to sounds. */
  handle(ev: GameEvent): void {
    const p = ev.pos;
    switch (ev.type) {
      case 'deploy':
        if (ev.card) {
          this.play(ev.card.kind === 'building' ? 'deployBuilding' : 'deploy', p);
          const call = CALL_SOUND[ev.card.id];
          if (call) window.setTimeout(() => this.play(call, p), 120);
        } else this.play('deploy', p);
        break;
      case 'spell': {
        if (!ev.card || ev.card.kind !== 'spell') break;
        const key = `${ev.card.id}:${p ? p.x.toFixed(2) : ''}:${p ? p.y.toFixed(2) : ''}`;
        const casts = this.pendingSpells.get(key) ?? 0;
        if (casts === 0) {
          // anticipation on cast
          this.pendingSpells.set(key, 1);
          this.play(ev.card.effect === 'meteor' ? 'meteorIncoming' : 'deploySpell', p);
          window.setTimeout(() => this.pendingSpells.delete(key), 4000);
        } else {
          this.pendingSpells.delete(key);
          this.play(ev.card.effect === 'meteor' ? 'meteor' : ev.card.effect === 'volley' ? 'volley' : ev.card.effect === 'shock' ? 'shock' : ev.card.effect === 'frost' ? 'frost' : 'frenzy', p);
        }
        break;
      }
      case 'ranged': this.play((ev.style ?? 'arrow') as SoundName, p); break;
      case 'hit': {
        const s = ev.style;
        const n: SoundName = s === 'rock' ? 'meleeHit' : s === 'arrow' || s === 'spear' ? 'hitArrow' : s === 'bolt' ? 'hitBolt' : s === 'fireball' || s === 'flame' ? 'hitFire' : s === 'bomb' ? 'hitBomb' : s === 'cannonball' ? 'hitCannon' : s === 'shadow' ? 'hitShadow' : s === 'holy' ? 'hitHoly' : s === 'ice' ? 'hitIce' : 'meleeHit';
        this.play(n, p);
        if (ev.hero && ev.team === 0) this.play('hitmarker');
        break;
      }
      case 'death': this.play(Math.random() < 0.2 ? 'deathSkeleton' : 'death', p); break;
      case 'towerHit': this.play('towerHit', p); break;
      case 'towerDestroyed': this.play(ev.big ? 'kingHit' : 'towerDestroyed'); break;
      case 'possess': this.play('possess'); break;
      case 'release': this.play('release'); break;
      case 'heroDeath': this.play('heroDeath'); break;
      case 'ability': this.play(ABILITY_SOUND[ev.text ?? ''] ?? 'ability', p); break;
      case 'dash': this.play('dash'); break;
      case 'summon': this.play('summon', p); break;
      case 'kingActivated': this.play('kingAwake'); break;
      case 'overtime': this.play('overtime'); break;
      case 'doubleElixir': this.play('doubleElixir'); break;
      case 'invalid': this.play('invalid'); break;
      case 'lowHp': this.play('lowHp'); break;
      case 'crit': this.play('crit', p); break;
      case 'end': break; // the screen plays victory/defeat explicitly
      default: break;
    }
  }

  /** Scene ambience: wind + birds (menu) or wind + crowd murmur + torch crackle (battle). */
  startAmbience(scene: AmbienceScene = 'battle'): void {
    if (!this.base || !this.noiseBuf) return;
    if (this.ambience) { if (this.ambience.scene === scene) return; this.stopAmbience(); }
    const ctx = this.base, nb = this.noiseBuf;
    const t0 = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(scene === 'menu' ? 0.09 : 0.11, t0 + 3);
    gain.connect(this.sfxBus!);
    const nodes: AudioScheduledSourceNode[] = [];
    // wind bed
    const wind = ctx.createBufferSource(); wind.buffer = nb; wind.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.4;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06; const lg = ctx.createGain(); lg.gain.value = 240; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const wg = ctx.createGain(); wg.gain.value = 0.5;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.045; const lg2 = ctx.createGain(); lg2.gain.value = 0.2; lfo2.connect(lg2); lg2.connect(wg.gain); lfo2.start();
    wind.connect(bp); bp.connect(wg); wg.connect(gain); wind.start();
    nodes.push(wind, lfo, lfo2);
    if (scene === 'battle') {
      // distant crowd murmur: two bandpassed noise layers with slow amplitude drift
      for (const [f, rate] of [[800, 0.13], [1400, 0.09]] as const) {
        const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; src.playbackRate.value = 0.7;
        const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = f; f1.Q.value = 1.2;
        const g = ctx.createGain(); g.gain.value = 0.22;
        const l = ctx.createOscillator(); l.frequency.value = rate; const lgn = ctx.createGain(); lgn.gain.value = 0.1; l.connect(lgn); lgn.connect(g.gain); l.start();
        src.connect(f1); f1.connect(g); g.connect(gain); src.start();
        nodes.push(src, l);
      }
    }
    const timer = window.setInterval(() => {
      if (!this.base || !this.enabled) return;
      const t = ctx.currentTime + Math.random() * 0.5;
      if (scene === 'menu') {
        // birds: quick chirp figures with pitch flicks
        if (Math.random() < 0.45) {
          const base = 2200 + Math.random() * 1800;
          const n = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) {
            synthNote(ctx, gain, { t: t + i * (0.09 + Math.random() * 0.05), freq: base * (1 + (Math.random() - 0.5) * 0.2), dur: 0.05, wave: 'sine', gain: 0.35, pitchEnv: { from: 0.85, to: 1.25, time: 0.05 }, env: { attack: 0.01, decay: 0.03, sustain: 0.5, release: 0.04 }, pan: (Math.random() - 0.5) * 1.4, priority: 0 });
          }
        }
      } else if (Math.random() < 0.6) {
        // torch crackle
        noiseBurst(ctx, gain, nb, { t, dur: 0.02 + Math.random() * 0.03, gain: 0.25, filter: { type: 'bandpass', freq: 2500 + Math.random() * 3000, q: 2 }, pan: Math.random() < 0.5 ? -0.7 : 0.7, priority: 0 });
      }
    }, 700);
    this.ambience = { nodes, gain, timer, scene };
  }

  setAmbience(scene: AmbienceScene): void { this.startAmbience(scene); }

  stopAmbience(): void {
    if (!this.base || !this.ambience) return;
    const a = this.ambience;
    this.ambience = null;
    clearInterval(a.timer);
    const t = this.base.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(a.gain.gain.value, t);
    a.gain.gain.setTargetAtTime(0.0001, t, 0.6);
    for (const n of a.nodes) { try { n.stop(t + 3); } catch { /* already stopped */ } }
  }

  /** Drums exposed for other modules that want a percussive accent (e.g. countdown). */
  accent(kind: 'kick' | 'snare' | 'tom' | 'crash'): void {
    if (!this.base || !this.noiseBuf || !this.enabled) return;
    const t = this.base.currentTime + 0.005, d = this.out(0, 0.4);
    if (kind === 'kick') kick(this.base, d, t, 0.8); else if (kind === 'snare') snare(this.base, d, this.noiseBuf, t, 0.8); else if (kind === 'tom') tom(this.base, d, t, 110, 0.8); else crash(this.base, d, this.noiseBuf, t, 0.7);
  }

  /** Active synthesised voices (diagnostics). */
  get voices(): number { return pool.active; }
}

export const sfx = new Sfx();
