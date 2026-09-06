/**
 * Procedural soundtrack.
 *
 * Two composed pieces, played by a bar-aware step sequencer (16th notes, look-ahead scheduling):
 *  - "Throne Room" (menu): A minor, 84 BPM. Harp arpeggios, a bowed pad, a lyrical lead, soft
 *    frame drum. Sections: intro(4) A(8) B(8) A'(8), looping A B A'.
 *  - "Crownfall" (battle): D minor, 116 BPM (128 in overtime). Intro(4) A(8) A'(8) B(8) A'(8)
 *    Bridge(8) B(8) A'(8), looping from A. Layers by intensity:
 *      1  drums (kick/snare/hats), bass, harp arp, pad, lead
 *      2  + horns counter-line, 16th hats, syncopated kick, choir
 *      3  + war toms, ride, shaker, timpani, double-time fills; tempo up
 *    Intensity changes land on bar boundaries with a fill; every 4/8 bars has its own fill.
 *
 * Public API: attach(ctx, master), start(), stop(), setIntensity(0-3), setScene('menu'|'battle'),
 * stinger(name), duck(seconds). Works with an OfflineAudioContext via scheduleUntil(t) for tests.
 */
import { clap, crash, hat, kick, makeChorus, makeImpulse, makeNoise, midi, note, noise, ride, snare, timpani, tom, bell, type Ctx } from './synth.ts';

type ChordType = 'min' | 'maj' | 'min7' | 'maj7' | 'dom7' | 'sus4' | 'dim' | 'minadd9' | 'majadd9';
interface Chord { root: number; type: ChordType }
/** [step within section, midi, length in steps, velocity 0-1] */
type NoteEv = [number, number, number, number];
interface Section {
  name: string;
  chords: Chord[]; // one per bar
  lead: NoteEv[];
  counter?: NoteEv[]; // horns
  bass: 'roots' | 'drive' | 'pulse';
  arp: 'harp' | 'pulse' | 'none';
  drums: 'none' | 'soft' | 'full';
  energy: number; // 0..1 baseline energy
}
interface Song { name: string; bpm: number; swing: number; sections: Section[]; loopFrom: number; scene: 'menu' | 'battle' }

const CH = (root: number, type: ChordType = 'min'): Chord => ({ root, type });
const chordTones = (c: Chord): number[] => {
  const r = c.root;
  switch (c.type) {
    case 'min': return [r, r + 3, r + 7];
    case 'maj': return [r, r + 4, r + 7];
    case 'min7': return [r, r + 3, r + 7, r + 10];
    case 'maj7': return [r, r + 4, r + 7, r + 11];
    case 'dom7': return [r, r + 4, r + 7, r + 10];
    case 'sus4': return [r, r + 5, r + 7];
    case 'dim': return [r, r + 3, r + 6];
    case 'minadd9': return [r, r + 3, r + 7, r + 14];
    case 'majadd9': return [r, r + 4, r + 7, r + 14];
  }
};

// ---- note names (MIDI) ----
const D2 = 38, D3 = 50, A3 = 57, Bb3 = 58, C4 = 60, D4 = 62, Eb4 = 63, E4 = 64, F4 = 65, G4 = 67, A4 = 69, Bb4 = 70, Cs5 = 73, C5 = 72, D5 = 74, Eb5 = 75, E5 = 76, F5 = 77, G5 = 79, A5 = 81, Bb5 = 82, C6 = 84, D6 = 86;
const A2 = 45, E3 = 52, F3 = 53, G3 = 55, B4 = 71, B5 = 83;

const BATTLE: Song = {
  name: 'Crownfall', bpm: 116, swing: 0.06, scene: 'battle', loopFrom: 1,
  sections: [
    { name: 'intro', chords: [CH(D3), CH(D3), CH(Bb3 - 12, 'maj'), CH(A3 - 12, 'maj')], lead: [], bass: 'pulse', arp: 'pulse', drums: 'soft', energy: 0.3 },
    {
      name: 'A', chords: [CH(D3), CH(D3), CH(Bb3 - 12, 'maj'), CH(C4 - 12, 'maj'), CH(D3), CH(F3, 'maj'), CH(G3), CH(A3 - 12, 'maj')],
      lead: [
        [0, D5, 3, 1], [4, F5, 2, 0.8], [6, A5, 6, 1],
        [16, G5, 2, 0.8], [18, F5, 2, 0.8], [20, E5, 4, 0.9], [24, D5, 6, 0.8],
        [32, Bb4, 2, 0.8], [34, D5, 2, 0.8], [36, F5, 4, 0.9], [40, Bb5, 6, 1],
        [48, A5, 4, 1], [52, G5, 2, 0.8], [54, E5, 2, 0.8], [56, C5, 6, 0.8],
        [64, D5, 3, 1], [68, F5, 2, 0.8], [70, A5, 6, 1],
        [80, C6, 4, 1], [84, A5, 2, 0.8], [86, F5, 2, 0.8], [88, A5, 6, 0.9],
        [96, Bb5, 4, 1], [100, G5, 2, 0.8], [102, D5, 2, 0.8], [104, G5, 6, 0.9],
        [112, A5, 6, 1], [120, Cs5, 4, 0.9],
      ],
      counter: [[0, D4, 2, 0.9], [6, D4, 2, 0.7], [10, A3, 2, 0.7], [16, D4, 2, 0.9], [22, F4, 2, 0.7], [26, A4, 2, 0.8], [32, Bb3, 2, 0.9], [38, D4, 2, 0.7], [42, F4, 2, 0.7], [48, C4, 2, 0.9], [54, E4, 2, 0.7], [58, G4, 2, 0.8], [64, D4, 2, 0.9], [70, D4, 2, 0.7], [74, A3, 2, 0.7], [80, F4, 2, 0.9], [86, A4, 2, 0.7], [90, C5, 2, 0.8], [96, G4, 2, 0.9], [102, Bb4, 2, 0.7], [106, D5, 2, 0.8], [112, A4, 4, 1], [118, Cs5, 2, 0.8], [122, E5, 4, 0.9]],
      bass: 'drive', arp: 'harp', drums: 'full', energy: 0.7,
    },
    {
      name: "A'", chords: [CH(D3), CH(D3), CH(Bb3 - 12, 'maj'), CH(C4 - 12, 'maj'), CH(D3), CH(Bb3 - 12, 'maj'), CH(G3), CH(D3)],
      lead: [
        [0, D5, 3, 1], [4, F5, 2, 0.8], [6, A5, 6, 1],
        [16, G5, 2, 0.8], [18, F5, 2, 0.8], [20, E5, 4, 0.9], [24, D5, 6, 0.8],
        [32, Bb4, 2, 0.8], [34, D5, 2, 0.8], [36, F5, 4, 0.9], [40, Bb5, 6, 1],
        [48, A5, 4, 1], [52, G5, 2, 0.8], [54, E5, 2, 0.8], [56, C5, 6, 0.8],
        [64, D5, 3, 1], [68, F5, 2, 0.8], [70, A5, 6, 1],
        [80, D6, 4, 1], [84, C6, 2, 0.8], [86, Bb5, 2, 0.8], [88, A5, 6, 0.9],
        [96, G5, 2, 0.8], [98, A5, 2, 0.8], [100, Bb5, 4, 0.9], [104, A5, 6, 0.9],
        [112, D5, 12, 1],
      ],
      counter: [[0, D4, 2, 0.9], [6, D4, 2, 0.7], [10, A3, 2, 0.7], [16, D4, 2, 0.9], [22, F4, 2, 0.7], [26, A4, 2, 0.8], [32, Bb3, 2, 0.9], [38, D4, 2, 0.7], [42, F4, 2, 0.7], [48, C4, 2, 0.9], [54, E4, 2, 0.7], [58, G4, 2, 0.8], [64, D4, 2, 0.9], [70, D4, 2, 0.7], [74, A3, 2, 0.7], [80, Bb3, 2, 0.9], [86, D4, 2, 0.7], [90, F4, 2, 0.8], [96, G4, 2, 0.9], [102, Bb4, 2, 0.7], [106, A4, 2, 0.8], [112, D4, 8, 1], [120, F4, 6, 0.9]],
      bass: 'drive', arp: 'harp', drums: 'full', energy: 0.75,
    },
    {
      name: 'B', chords: [CH(Bb3 - 12, 'maj7'), CH(F3, 'maj'), CH(C4 - 12, 'maj'), CH(D3, 'min7'), CH(Bb3 - 12, 'maj7'), CH(F3, 'maj'), CH(G3, 'min7'), CH(A3 - 12, 'dom7')],
      lead: [
        [0, F5, 6, 0.9], [8, D5, 4, 0.8], [12, F5, 4, 0.8],
        [16, A5, 8, 1], [24, C6, 8, 0.9],
        [32, G5, 6, 0.9], [40, E5, 4, 0.8], [44, G5, 4, 0.8],
        [48, A5, 12, 1],
        [64, F5, 6, 0.9], [72, D5, 4, 0.8], [76, F5, 4, 0.8],
        [80, A5, 8, 1], [88, C6, 8, 0.9],
        [96, D6, 6, 1], [104, Bb5, 4, 0.9], [108, G5, 4, 0.8],
        [112, A5, 8, 1], [120, Cs5, 8, 0.9],
      ],
      counter: [[0, Bb3, 4, 0.8], [8, D4, 4, 0.7], [16, F4, 4, 0.8], [24, A4, 4, 0.7], [32, C4, 4, 0.8], [40, E4, 4, 0.7], [48, D4, 6, 0.8], [56, F4, 6, 0.7], [64, Bb3, 4, 0.8], [72, D4, 4, 0.7], [80, F4, 4, 0.8], [88, A4, 4, 0.7], [96, G4, 4, 0.8], [104, Bb4, 4, 0.7], [112, A4, 4, 1], [118, Cs5, 2, 0.8], [122, E5, 4, 0.9]],
      bass: 'roots', arp: 'harp', drums: 'full', energy: 0.6,
    },
    {
      name: 'bridge', chords: [CH(D3), CH(Eb4 - 12, 'maj'), CH(D3), CH(Eb4 - 12, 'maj'), CH(G3), CH(Bb3 - 12, 'maj'), CH(A3 - 12, 'maj'), CH(A3 - 12, 'dom7')],
      lead: [
        [0, D5, 2, 1], [2, D5, 2, 0.7], [4, D5, 2, 0.8], [6, Eb5, 2, 1], [8, F5, 2, 0.9], [10, Eb5, 2, 0.8], [12, D5, 4, 1],
        [16, Eb5, 2, 1], [18, Eb5, 2, 0.7], [20, Eb5, 2, 0.8], [22, D5, 2, 1], [24, C5, 2, 0.9], [26, D5, 2, 0.8], [28, Eb5, 4, 1],
        [32, D5, 2, 1], [34, D5, 2, 0.7], [36, D5, 2, 0.8], [38, Eb5, 2, 1], [40, F5, 2, 0.9], [42, G5, 2, 0.8], [44, A5, 4, 1],
        [48, Bb5, 2, 1], [50, A5, 2, 0.8], [52, G5, 2, 0.8], [54, F5, 2, 0.9], [56, Eb5, 2, 0.8], [58, D5, 2, 0.8], [60, Eb5, 4, 1],
        [64, G5, 3, 1], [68, Bb5, 2, 0.8], [70, D6, 6, 1],
        [80, D6, 2, 0.9], [82, C6, 2, 0.8], [84, Bb5, 4, 0.9], [88, F5, 6, 0.8],
        [96, A5, 4, 1], [100, Cs5, 2, 0.8], [102, E5, 2, 0.8], [104, A5, 6, 1],
        [112, A5, 2, 1], [114, A5, 2, 0.8], [116, A5, 2, 0.8], [118, Bb5, 2, 0.9], [120, Cs5, 2, 0.9], [122, E5, 2, 0.9], [124, G5, 4, 1],
      ],
      counter: [[0, D4, 2, 1], [4, D4, 2, 0.8], [8, D4, 2, 0.8], [12, Eb4, 4, 1], [16, Eb4, 2, 1], [20, Eb4, 2, 0.8], [24, D4, 2, 0.8], [28, C4, 4, 0.9], [32, D4, 2, 1], [36, D4, 2, 0.8], [40, F4, 2, 0.8], [44, A4, 4, 1], [48, Bb4, 2, 1], [52, G4, 2, 0.8], [56, Eb4, 2, 0.8], [60, D4, 4, 0.9], [64, G4, 4, 1], [72, Bb4, 4, 0.9], [80, Bb4, 4, 1], [88, F4, 4, 0.9], [96, A4, 4, 1], [104, Cs5, 4, 0.9], [112, A4, 2, 1], [116, A4, 2, 1], [120, A4, 2, 1], [124, G4, 4, 1]],
      bass: 'drive', arp: 'pulse', drums: 'full', energy: 0.95,
    },
    { name: 'B2', chords: [], lead: [], bass: 'roots', arp: 'harp', drums: 'full', energy: 0.6 }, // filled below (copy of B)
    { name: 'A2', chords: [], lead: [], bass: 'drive', arp: 'harp', drums: 'full', energy: 0.8 }, // copy of A'
  ],
};
BATTLE.sections[5] = { ...BATTLE.sections[3], name: 'B2' };
BATTLE.sections[6] = { ...BATTLE.sections[2], name: 'A2', energy: 0.85 };

const MENU: Song = {
  name: 'Throne Room', bpm: 84, swing: 0.1, scene: 'menu', loopFrom: 1,
  sections: [
    { name: 'intro', chords: [CH(A2 + 12), CH(A2 + 12), CH(F3, 'maj7'), CH(E3, 'maj')], lead: [], bass: 'roots', arp: 'harp', drums: 'none', energy: 0.2 },
    {
      name: 'A', chords: [CH(A2 + 12, 'minadd9'), CH(F3, 'maj7'), CH(C4 - 12, 'majadd9'), CH(G3, 'maj'), CH(A2 + 12, 'minadd9'), CH(F3, 'maj7'), CH(D3, 'min7'), CH(E3, 'maj')],
      lead: [
        [0, E5, 6, 0.8], [8, A5, 4, 0.9], [12, G5, 4, 0.7],
        [16, F5, 6, 0.8], [24, E5, 4, 0.7], [28, D5, 4, 0.7],
        [32, C5, 8, 0.8], [40, E5, 4, 0.7], [44, G5, 4, 0.8],
        [48, B4, 12, 0.8],
        [64, E5, 6, 0.8], [72, A5, 4, 0.9], [76, B5, 4, 0.8],
        [80, C6, 8, 0.9], [88, A5, 8, 0.8],
        [96, F5, 6, 0.8], [104, A5, 4, 0.8], [108, F5, 4, 0.7],
        [112, E5, 16, 0.9],
      ],
      bass: 'roots', arp: 'harp', drums: 'soft', energy: 0.4,
    },
    {
      name: 'B', chords: [CH(F3, 'maj7'), CH(G3, 'maj'), CH(A2 + 12, 'min7'), CH(A2 + 12, 'min7'), CH(F3, 'maj7'), CH(G3, 'maj'), CH(E3, 'maj'), CH(E3, 'dom7')],
      lead: [
        [0, A5, 12, 0.9],
        [16, G5, 8, 0.8], [24, B5, 8, 0.8],
        [32, C6, 12, 0.9],
        [48, E5, 8, 0.7], [56, G5, 8, 0.8],
        [64, A5, 8, 0.9], [72, F5, 8, 0.8],
        [80, G5, 8, 0.8], [88, D6, 8, 0.9],
        [96, B5, 12, 0.9],
        [112, E5, 16, 0.8],
      ],
      bass: 'roots', arp: 'harp', drums: 'soft', energy: 0.5,
    },
    { name: "A'", chords: [], lead: [], bass: 'roots', arp: 'harp', drums: 'soft', energy: 0.45 },
  ],
};
MENU.sections[3] = { ...MENU.sections[1], name: "A'" };

export type Scene = 'menu' | 'battle';
export type StingerName = 'victory' | 'defeat' | 'crown' | 'possess' | 'overtime' | 'doubleElixir' | 'kingAwake' | 'heroDeath';

interface Buses { drums: GainNode; bass: GainNode; pad: GainNode; arp: GainNode; lead: GainNode; horns: GainNode; choir: GainNode; perc: GainNode; sting: GainNode; duck: GainNode }

export class Music {
  private ctx: Ctx | null = null;
  private out: GainNode | null = null;
  private bus: Buses | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private timer = 0;
  private running = false;
  private song: Song = MENU;
  private nextSong: Song | null = null;
  private nextStepTime = 0;
  private step = 0; // absolute step index within the song
  private sectionIdx = 0;
  private sectionStep = 0;
  intensity = 0;
  private appliedIntensity = 0;
  private pendingFill = false;
  private targetGain = 0;
  private lastPadChordKey = '';
  private padVoices: { stop: () => void } | null = null;
  private layerLevels: Record<keyof Buses, number> = { drums: 0, bass: 0, pad: 0, arp: 0, lead: 0, horns: 0, choir: 0, perc: 0, sting: 1, duck: 1 };
  private bpm = 84;
  /** Music level relative to master (about -10 dB). */
  level = 0.34;

  /** 0..1 user volume; applies immediately. */
  setVolume(v: number): void {
    this.level = Math.max(0, Math.min(1, v)) * 0.34;
    if (this.running && this.targetGain > 0) this.targetGain = this.level;
  }

  attach(ctx: BaseAudioContext, master: AudioNode): void {
    if (this.ctx === ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.noiseBuf = makeNoise(ctx, 2);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx, 2.8, 2.6, 0.02);
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    const chorus = makeChorus(ctx, 0.28, 0.003, 0.3);
    const mk = () => { const g = ctx.createGain(); g.gain.value = 0; return g; };
    const duck = ctx.createGain(); duck.gain.value = 1;
    this.bus = { drums: mk(), bass: mk(), pad: mk(), arp: mk(), lead: mk(), horns: mk(), choir: mk(), perc: mk(), sting: ctx.createGain(), duck };
    // routing: duckable pad/arp/choir -> duck -> chorus ; drums/bass dry ; lead/horns/sting -> chorus
    for (const b of [this.bus.pad, this.bus.arp, this.bus.choir]) b.connect(duck);
    duck.connect(chorus.input);
    for (const b of [this.bus.lead, this.bus.horns, this.bus.sting]) b.connect(chorus.input);
    chorus.output.connect(comp);
    chorus.output.connect(wet);
    for (const b of [this.bus.drums, this.bus.bass, this.bus.perc]) { b.connect(comp); }
    this.bus.drums.connect(wet); this.bus.sting.connect(wet);
    wet.connect(conv); conv.connect(comp);
    comp.connect(this.out);
    this.out.connect(master);
  }

  /** Begin playback. `useTimer=false` lets tests drive scheduling with scheduleUntil(). */
  start(useTimer = true): void {
    if (!this.ctx || this.running) return;
    this.running = true;
    this.targetGain = this.level;
    this.resetSong(this.song, this.ctx.currentTime + 0.05);
    if (useTimer && typeof window !== 'undefined') this.timer = window.setInterval(() => this.schedule(), 40);
  }

  stop(): void {
    if (!this.ctx) return;
    this.targetGain = 0;
    this.out?.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.6);
    const t = window.setTimeout(() => {
      if (this.targetGain === 0) { if (this.timer) clearInterval(this.timer); this.timer = 0; this.running = false; this.padVoices?.stop(); this.padVoices = null; this.lastPadChordKey = ''; }
    }, 2500);
    void t;
  }

  setIntensity(level: number): void {
    const l = Math.max(0, Math.min(3, Math.round(level)));
    if (l === this.intensity) return;
    if (l > this.intensity) this.pendingFill = true;
    this.intensity = l;
    const wantScene: Scene = l === 0 ? 'menu' : 'battle';
    if (wantScene !== this.song.scene) this.setScene(wantScene);
  }

  /** Switch pieces at the next bar (or immediately if idle). */
  setScene(scene: Scene): void {
    const s = scene === 'menu' ? MENU : BATTLE;
    if (s === this.song) { this.nextSong = null; return; }
    if (!this.running || !this.ctx) { this.song = s; return; }
    this.nextSong = s;
  }

  private resetSong(song: Song, at: number): void {
    this.song = song;
    this.nextSong = null;
    this.step = 0; this.sectionIdx = 0; this.sectionStep = 0;
    this.nextStepTime = at;
    this.lastPadChordKey = '';
    this.padVoices?.stop(); this.padVoices = null;
    this.bpm = song.bpm;
  }

  private stepDur(): number { return 60 / this.bpm / 4; }

  /** Schedule everything up to `until` (context time). Public so offline renders can drive it. */
  scheduleUntil(until: number): void {
    if (!this.ctx || !this.bus || !this.running) return;
    const ctx = this.ctx;
    this.out!.gain.setTargetAtTime(this.targetGain, ctx.currentTime, 0.4);
    while (this.nextStepTime < until) {
      const sec = this.song.sections[this.sectionIdx];
      const barStart = this.sectionStep % 16 === 0;
      if (barStart) this.onBar(this.nextStepTime);
      this.playStep(sec, this.sectionStep, this.nextStepTime);
      // advance
      const sd = this.stepDur();
      this.nextStepTime += sd;
      this.step++;
      this.sectionStep++;
      if (this.sectionStep >= sec.chords.length * 16) {
        this.sectionStep = 0;
        this.sectionIdx++;
        if (this.sectionIdx >= this.song.sections.length) this.sectionIdx = this.song.loopFrom;
      }
    }
  }

  private schedule(): void {
    if (!this.ctx) return;
    this.scheduleUntil(this.ctx.currentTime + 0.22);
  }

  /** Bar boundary: apply pending song/intensity changes and layer levels. */
  private onBar(t: number): void {
    if (this.nextSong) {
      // crossfade out then reset into the new song on this bar
      this.padVoices?.stop(); this.padVoices = null;
      const s = this.nextSong;
      this.resetSong(s, t);
      this.appliedIntensity = -1;
    }
    if (this.appliedIntensity !== this.intensity) {
      this.appliedIntensity = this.intensity;
      this.bpm = this.song.scene === 'battle' ? (this.intensity >= 3 ? 128 : this.intensity >= 2 ? 120 : 116) : this.song.bpm;
    }
    const I = this.song.scene === 'battle' ? Math.max(1, this.intensity) : 0;
    const sec = this.song.sections[this.sectionIdx];
    const e = sec.energy;
    const target: Partial<Record<keyof Buses, number>> = this.song.scene === 'menu'
      ? { drums: sec.drums === 'none' ? 0 : 0.35, bass: 0.5, pad: 0.55, arp: 0.5, lead: sec.lead.length ? 0.55 : 0, horns: 0, choir: 0.25, perc: 0 }
      : {
          drums: sec.drums === 'none' ? 0 : sec.drums === 'soft' ? 0.45 : 0.85 + (I - 1) * 0.06,
          bass: 0.6 + e * 0.15, pad: 0.5, arp: I >= 2 ? 0.45 : 0.35, lead: sec.lead.length ? 0.6 : 0,
          horns: I >= 2 && sec.counter ? 0.5 : 0, choir: I >= 2 ? 0.35 : 0.12, perc: I >= 3 ? 0.7 : 0,
        };
    for (const k of Object.keys(target) as (keyof Buses)[]) {
      const v = target[k] ?? 0;
      if (this.layerLevels[k] !== v) { this.layerLevels[k] = v; this.bus![k].gain.setTargetAtTime(v, t, 0.35); }
    }
  }

  private duckPads(t: number, depth = 0.55, recover = 0.14): void {
    const g = this.bus!.duck.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(depth, t + 0.012);
    g.setTargetAtTime(1, t + 0.02, recover);
  }

  /** Dip the whole score briefly (under a stinger or big SFX). */
  duck(seconds = 1.2, depth = 0.35): void {
    if (!this.ctx || !this.out) return;
    const t = this.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(this.targetGain * depth, t + 0.08);
    g.setTargetAtTime(this.targetGain, t + seconds * 0.5, seconds * 0.25);
  }

  private humanize(t: number, amount = 0.004): number { return t + (Math.random() - 0.5) * amount; }

  private playStep(sec: Section, s: number, t: number): void {
    const ctx = this.ctx!, bus = this.bus!, nb = this.noiseBuf!;
    const sd = this.stepDur();
    const swung = s % 2 === 1 ? t + sd * this.song.swing : t;
    const bar = Math.floor(s / 16), s16 = s % 16;
    const chord = sec.chords[bar];
    const nextChord = sec.chords[bar + 1] ?? this.song.sections[(this.sectionIdx + 1 >= this.song.sections.length ? this.song.loopFrom : this.sectionIdx + 1)].chords[0];
    const battle = this.song.scene === 'battle';
    const I = battle ? Math.max(1, this.intensity) : 0;
    const totalBars = sec.chords.length;
    const lastBarOfSection = bar === totalBars - 1;
    const fillBar = lastBarOfSection || bar % 4 === 3;
    const bigFill = lastBarOfSection || this.pendingFill;

    // ---- pad (legato chords; retrigger on change) ----
    const key = `${chord.root}:${chord.type}:${this.sectionIdx}`;
    if (s16 === 0 && key !== this.lastPadChordKey) {
      this.lastPadChordKey = key;
      this.padVoices?.stop();
      this.padVoices = this.padChord(chord, t, battle);
      if (I >= 2 || !battle) this.choir(chord, t, sec.chords.length);
    }
    // ---- bass ----
    if (sec.bass === 'roots') {
      if (s16 === 0 || s16 === 8) this.bassNote(chord.root - 12, swung, sd * (battle ? 7 : 7.5), 0.9);
      if (battle && s16 === 14) this.bassNote(chordTones(chord)[2] - 12, swung, sd * 1.5, 0.6);
    } else if (sec.bass === 'pulse') {
      if (s16 % 4 === 0) this.bassNote(chord.root - 12, swung, sd * 3, 0.7);
    } else {
      // drive: 8ths with the 5th on the and-of-3 and an octave pickup before chord changes
      if (s16 % 2 === 0) {
        const toneIdx = s16 === 10 ? 2 : 0;
        const n = chordTones(chord)[toneIdx] - 12 + (s16 === 14 && nextChord.root !== chord.root ? 12 : 0);
        const accent = s16 === 0 || s16 === 8 ? 1 : 0.75;
        this.bassNote(n, swung, sd * (I >= 2 ? 1.7 : 1.4), accent);
      } else if (I >= 3 && (s16 === 7 || s16 === 15)) this.bassNote(chord.root - 12, swung, sd * 0.8, 0.55);
    }
    // ---- arp ----
    if (sec.arp === 'harp') {
      const tones = chordTones(chord);
      const seq = [...tones, ...tones.map((n) => n + 12), tones[1] + 12, tones[0] + 24];
      const idx = s16 % seq.length;
      const dir = bar % 2 === 0 ? idx : seq.length - 1 - idx;
      const play = battle ? (I >= 2 || s16 % 2 === 0) : (s16 % 2 === 0 || bar % 4 === 3);
      if (play) this.pluck(seq[dir], swung, sd * 2.2, (s16 % 4 === 0 ? 0.9 : 0.6) * (battle ? 0.8 : 1), battle ? 0 : (idx / seq.length - 0.5) * 0.8);
    } else if (sec.arp === 'pulse') {
      if (s16 % 2 === 0) this.pluck(chordTones(chord)[s16 % 8 === 4 ? 2 : s16 % 8 === 6 ? 1 : 0] + 12, swung, sd * 1.2, 0.55, 0);
    }
    // ---- lead ----
    for (const [st, n, len, vel] of sec.lead) if (st === s) this.leadNote(n, this.humanize(swung), sd * len, vel, battle);
    // ---- horns (counter line) ----
    if (battle && I >= 2 && sec.counter) for (const [st, n, len, vel] of sec.counter) if (st === s) this.horn(n, swung, sd * len, vel);
    // ---- drums ----
    if (sec.drums !== 'none') this.drums(sec, s16, bar, swung, sd, I, battle, fillBar, bigFill, nb);
    // ---- perc (overtime tension) ----
    if (battle && I >= 3) {
      if (s16 % 2 === 1) noise(ctx, bus.perc, nb, { t: swung, dur: 0.05, gain: 0.12, filter: { type: 'bandpass', freq: 4200, q: 1.5 }, priority: 0 });
      if (s16 === 0 && bar % 2 === 0) timpani(ctx, bus.perc, t, midi(chord.root - 24), 0.9);
      if (s16 === 12 && bar % 2 === 1) timpani(ctx, bus.perc, t, midi(chord.root - 24), 0.6);
    }
    if (s16 === 15 && bigFill) this.pendingFill = false;
  }

  private drums(sec: Section, s16: number, bar: number, t: number, sd: number, I: number, battle: boolean, fillBar: boolean, bigFill: boolean, nb: AudioBuffer): void {
    const ctx = this.ctx!, bus = this.bus!;
    if (!battle) {
      // soft frame drum + shaker
      if (s16 === 0) { tom(ctx, bus.drums, t, 82, 0.6); }
      if (s16 === 10) tom(ctx, bus.drums, t, 82, 0.35);
      if (s16 % 2 === 0) noise(ctx, bus.drums, nb, { t, dur: 0.04, gain: s16 % 4 === 0 ? 0.12 : 0.07, filter: { type: 'bandpass', freq: 5000, q: 1.2 }, priority: 0 });
      return;
    }
    const soft = sec.drums === 'soft';
    // fills
    if (bigFill && s16 >= 8) {
      const toms = [220, 180, 150, 120, 100, 85, 72, 60];
      tom(ctx, bus.drums, t, toms[s16 - 8], 0.9);
      if (s16 % 2 === 0) snare(ctx, bus.drums, nb, t, 0.8, true);
      if (s16 === 15) crash(ctx, bus.drums, nb, t + sd, 0.9);
      return;
    }
    if (fillBar && s16 >= 12) {
      snare(ctx, bus.drums, nb, t, 0.55 + (s16 - 12) * 0.12, true);
      if (s16 === 15 && I >= 2) crash(ctx, bus.drums, nb, t + sd, 0.6);
      return;
    }
    // kick
    const kickSteps = soft ? [0, 8] : I >= 3 ? [0, 6, 8, 10] : I >= 2 ? [0, 8, 10] : [0, 8];
    if (kickSteps.includes(s16)) { kick(ctx, bus.drums, t, s16 === 0 ? 1 : 0.85, { tone: 0.95 }); this.duckPads(t); }
    if (soft) {
      if (s16 === 4 || s16 === 12) clap(ctx, bus.drums, nb, t, 0.5);
      if (s16 % 4 === 2) hat(ctx, bus.drums, nb, t, 0.5);
      return;
    }
    // snare
    if (s16 === 4 || s16 === 12) snare(ctx, bus.drums, nb, t, 1);
    if (I >= 3 && s16 === 14 && bar % 2 === 1) snare(ctx, bus.drums, nb, t, 0.5, true);
    // hats
    if (I >= 2 || s16 % 2 === 0) hat(ctx, bus.drums, nb, t, s16 % 4 === 0 ? 0.9 : s16 % 2 === 0 ? 0.65 : 0.45, s16 === 14 && I >= 2);
    if (I >= 3 && s16 % 2 === 0) ride(ctx, bus.drums, nb, t, s16 % 4 === 0 ? 0.8 : 0.5);
    // war toms
    if (I >= 3 && [3, 6, 11].includes(s16)) tom(ctx, bus.drums, t, s16 === 6 ? 95 : 120, 0.7);
    if (I >= 2 && s16 === 0 && bar % 8 === 0) crash(ctx, bus.drums, nb, t, 0.7);
  }

  private bassNote(n: number, t: number, dur: number, vel: number): void {
    note(this.ctx!, this.bus!.bass, {
      t, freq: midi(n), dur, wave: 'sawtooth', unison: 2, detune: 8, gain: 0.5 * vel, sub: 0.6,
      env: { attack: 0.006, decay: 0.12, sustain: 0.6, release: 0.08 },
      filter: { cutoff: 180, envAmount: 900 * vel, q: 2.5, decay: 0.16, keyTrack: 1.5 }, priority: 2,
    });
  }

  private pluck(n: number, t: number, dur: number, vel: number, pan: number): void {
    note(this.ctx!, this.bus!.arp, {
      t, freq: midi(n), dur: Math.min(dur, 0.35), wave: 'triangle', unison: 2, detune: 5, gain: 0.32 * vel, octaveLayer: 0.12,
      env: { attack: 0.003, decay: 0.25, sustain: 0.15, release: 0.12 },
      filter: { cutoff: 900, envAmount: 4200 * vel, q: 1.1, decay: 0.22, keyTrack: 1 }, pan, priority: 0,
    });
  }

  private leadNote(n: number, t: number, dur: number, vel: number, battle: boolean): void {
    const ctx = this.ctx!, bus = this.bus!;
    if (battle) {
      // bright synth-brass lead with vibrato
      note(ctx, bus.lead, {
        t, freq: midi(n), dur, wave: 'sawtooth', unison: 3, detune: 14, gain: 0.34 * vel,
        env: { attack: 0.03, decay: 0.15, sustain: 0.8, release: 0.18 },
        filter: { cutoff: 1400, envAmount: 2600, q: 1.4, decay: 0.3, keyTrack: 1.5 },
        vibrato: { rate: 5.2, depth: 12, delay: 0.25 }, priority: 2,
      });
      note(ctx, bus.lead, { t, freq: midi(n), dur, wave: 'square', gain: 0.07 * vel, env: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.15 }, filter: { cutoff: 2000, q: 0.7 }, priority: 1 });
    } else {
      // soft flute-like lead: sine + a little triangle, slow vibrato
      note(ctx, bus.lead, {
        t, freq: midi(n), dur, wave: 'sine', gain: 0.4 * vel, octaveLayer: 0.06,
        env: { attack: 0.06, decay: 0.3, sustain: 0.8, release: 0.35 },
        vibrato: { rate: 4.6, depth: 9, delay: 0.35 }, priority: 2,
      });
      note(ctx, bus.lead, { t: t + 0.01, freq: midi(n), dur, wave: 'triangle', gain: 0.12 * vel, env: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.3 }, filter: { cutoff: 1800, q: 0.5 }, priority: 1 });
    }
  }

  private horn(n: number, t: number, dur: number, vel: number): void {
    note(this.ctx!, this.bus!.horns, {
      t, freq: midi(n), dur, wave: 'sawtooth', unison: 4, detune: 18, gain: 0.3 * vel,
      env: { attack: 0.05, decay: 0.2, sustain: 0.85, release: 0.2 },
      filter: { cutoff: 500, envAmount: 1400, q: 1.0, decay: 0.35, keyTrack: 1.2 },
      vibrato: { rate: 4.8, depth: 7, delay: 0.3 }, priority: 1,
    });
  }

  private padChord(chord: Chord, t: number, battle: boolean): { stop: () => void } {
    const ctx = this.ctx!, bus = this.bus!;
    const tones = chordTones(chord);
    // spread voicing: root low, then thirds/fifths above, top note doubled up an octave
    const voicing = [tones[0], tones[1] + 12, tones[2] + 12, (tones[3] ?? tones[0] + 12) + 12];
    const oscs: OscillatorNode[] = [];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(battle ? 0.14 : 0.16, t + (battle ? 0.35 : 0.9));
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = battle ? 1100 : 900; lp.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
    g.connect(lp); lp.connect(bus.pad);
    voicing.forEach((n, i) => {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'square' : 'sawtooth'; o.frequency.value = midi(n) * (i === 0 ? 0.5 : 1); o.detune.value = det + (i - 1.5) * 2;
        const og = ctx.createGain(); og.gain.value = i === 0 ? 0.35 : 0.3;
        o.connect(og); og.connect(g); o.start(t); oscs.push(o);
      }
    });
    return {
      stop: () => {
        const now = Math.max(ctx.currentTime, t);
        g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.setTargetAtTime(0.0001, now, 0.25);
        for (const o of oscs) o.stop(now + 1.2);
        lfo.stop(now + 1.2);
      },
    };
  }

  /** Vowel-ish choir swell on the root and fifth. */
  private choir(chord: Chord, t: number, bars: number): void {
    const ctx = this.ctx!, bus = this.bus!;
    const dur = this.stepDur() * 16 * 0.95;
    void bars;
    for (const n of [chord.root + 12, chord.root + 19]) {
      for (const [f, q] of [[720, 8], [1150, 10]] as const) {
        note(ctx, bus.choir, { t, freq: midi(n), dur, wave: 'sawtooth', unison: 3, detune: 16, gain: 0.11, env: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 0.6 }, filter: { type: 'bandpass', cutoff: f, q }, vibrato: { rate: 4.2, depth: 6, delay: 0.5 }, priority: 0 });
      }
    }
  }

  /** Short musical phrases for game moments, in the current key. */
  stinger(name: StingerName): void {
    if (!this.ctx || !this.bus) return;
    const ctx = this.ctx, bus = this.bus, nb = this.noiseBuf!;
    const t = ctx.currentTime + 0.02;
    const brass = (n: number, at: number, dur: number, vel = 1) => note(ctx, bus.sting, { t: at, freq: midi(n), dur, wave: 'sawtooth', unison: 4, detune: 16, gain: 0.32 * vel, env: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.3 }, filter: { cutoff: 600, envAmount: 2200, q: 1.1, decay: 0.3, keyTrack: 1.2 }, vibrato: { rate: 5, depth: 8, delay: 0.2 }, priority: 2 });
    const chime = (n: number, at: number, dur: number, vel = 1) => bell(ctx, bus.sting, at, midi(n), dur, 0.22 * vel, 3.01);
    switch (name) {
      case 'victory': {
        this.duck(3, 0.3);
        // D major fanfare: D A D F# A D
        [[D4, 0], [A4, 0.18], [D5, 0.36], [78, 0.54], [A5, 0.72], [D6, 1.05]].forEach(([n, d]) => brass(n, t + d, 0.55));
        [[D5, 1.05], [78, 1.05], [A5, 1.05], [D6, 1.05]].forEach(([n, d]) => brass(n, t + d, 2.2, 0.8));
        [D6, 78 + 12, A5 + 12].forEach((n, i) => chime(n, t + 1.1 + i * 0.12, 2.2, 0.8));
        crash(ctx, bus.drums, nb, t + 1.05, 1);
        timpani(ctx, bus.perc, t + 1.05, midi(D2), 1);
        break;
      }
      case 'defeat': {
        this.duck(3, 0.3);
        [[D5, 0], [C5, 0.5], [Bb4, 1.0], [A4, 1.5]].forEach(([n, d]) => brass(n, t + d, 0.6, 0.8));
        [[D4, 1.5], [F4, 1.5], [A4, 1.5]].forEach(([n, d]) => brass(n, t + d, 2.5, 0.6));
        timpani(ctx, bus.perc, t, midi(D2), 0.9); timpani(ctx, bus.perc, t + 1.5, midi(A2 - 12), 1);
        break;
      }
      case 'crown': {
        this.duck(1.2, 0.5);
        brass(A4, t, 0.16, 0.9); brass(D5, t + 0.17, 0.45, 1); brass(F5, t + 0.17, 0.45, 0.8);
        chime(D6, t + 0.2, 1.2, 0.7);
        snare(ctx, bus.drums, nb, t, 0.8, true); snare(ctx, bus.drums, nb, t + 0.08, 0.9, true); crash(ctx, bus.drums, nb, t + 0.17, 0.7);
        break;
      }
      case 'possess': {
        // harp gliss up a Dm add9 then a choir swell
        const gl = [D4, F4, A4, E5 - 12 + 12, D5, F5, A5, E5 + 12 - 12 + 12, D6];
        gl.forEach((n, i) => this.pluck(n, t + i * 0.045, 0.3, 0.8, (i / gl.length - 0.5) * 0.6));
        chime(A5, t + 0.4, 1.4, 0.5); chime(D6, t + 0.5, 1.6, 0.5);
        break;
      }
      case 'heroDeath': {
        [[A5, 0], [F5, 0.25], [D5, 0.5]].forEach(([n, d]) => chime(n, t + d, 1.2, 0.5));
        brass(D4, t + 0.5, 1.2, 0.5);
        break;
      }
      case 'overtime': {
        this.duck(1.5, 0.45);
        for (let i = 0; i < 3; i++) { brass(A4, t + i * 0.22, 0.14, 1); brass(Cs5, t + i * 0.22, 0.14, 0.8); brass(E5, t + i * 0.22, 0.14, 0.8); }
        brass(A4, t + 0.7, 1.4, 1); brass(E5, t + 0.7, 1.4, 0.8); brass(A5, t + 0.7, 1.4, 0.7);
        timpani(ctx, bus.perc, t + 0.7, midi(A2 - 12), 1);
        break;
      }
      case 'doubleElixir': {
        chime(D6, t, 0.8, 0.7); chime(A5 + 12, t + 0.14, 1.0, 0.7); chime(D6 + 12, t + 0.28, 1.3, 0.6);
        break;
      }
      case 'kingAwake': {
        brass(D4 - 12, t, 1.2, 1); brass(A3, t, 1.2, 0.7); brass(D4, t + 0.05, 1.2, 0.6);
        timpani(ctx, bus.perc, t, midi(D2), 1);
        break;
      }
    }
  }
}

export const music = new Music();
