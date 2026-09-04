// Music: mood -> looping track (area-aware), equal-power crossfades, stingers with ducking,
// dialogue ducking, and the procedural pad that sits under exploration.
import { AudioEngine, FADE_IN, FADE_OUT, type Voice } from './engine.ts';
import { Synth, ProceduralPad } from './synth.ts';

export type Mood = 'menu' | 'explore' | 'camp' | 'tension' | 'combat' | 'boss' | 'victory' | 'ending' | 'death';
export type Area = 'shore' | 'crypt';

interface Track { id: string; level: number; loop: boolean }

const TRACKS: Record<string, Track> = {
  menu: { id: 'menu', level: 0.8, loop: true },
  explore: { id: 'explore', level: 0.72, loop: true },
  crypt_explore: { id: 'crypt_explore', level: 0.7, loop: true },
  camp: { id: 'camp', level: 0.68, loop: true },
  tension: { id: 'tension', level: 0.7, loop: true },
  crypt_tension: { id: 'crypt_tension', level: 0.72, loop: true },
  combat: { id: 'combat', level: 0.82, loop: true },
  boss: { id: 'boss', level: 0.95, loop: true },
  ending: { id: 'ending', level: 0.9, loop: false },
  death: { id: 'death', level: 0.8, loop: false },
};

/** Pad level under each mood (0 = off). */
const PAD_LEVEL: Record<Mood, number> = { menu: 0.7, explore: 0.85, camp: 0.45, tension: 0.25, combat: 0, boss: 0, victory: 0.3, ending: 0, death: 0 };

export class MusicSystem {
  mood: Mood = 'explore';
  area: Area = 'shore';
  private current: { key: string; voice: Voice; level: number } | null = null;
  private fading: { voice: Voice; until: number }[] = [];
  private pad: ProceduralPad;
  private pendingKey: string | null = null;
  private returnTimer: number | null = null;
  private lastMoodChange = -1e9;
  private prefetchQueue: string[] = [];
  private prefetching = false;
  private prefetchedOnce = false;
  dialogueDucked = false;
  enabled = true;

  constructor(private e: AudioEngine, private synth: Synth) {
    this.pad = new ProceduralPad(synth);
  }

  /** Which track a mood resolves to in the current area (null = silence / sting only). */
  trackKey(mood: Mood, area = this.area): string | null {
    switch (mood) {
      case 'explore': return area === 'crypt' ? 'crypt_explore' : 'explore';
      case 'tension': return area === 'crypt' ? 'crypt_tension' : 'tension';
      case 'victory': return null;
      default: return mood;
    }
  }

  setArea(area: Area) {
    if (this.area === area) return;
    this.area = area;
    const key = this.trackKey(this.mood);
    if (key && key !== this.current?.key) this.switchTo(key, { fadeOut: 3.5, fadeIn: 3.5 });
    this.queuePrefetch();
  }

  setMood(mood: Mood, opts: { fadeIn?: number; fadeOut?: number; force?: boolean } = {}) {
    const t = this.e.now;
    if (mood === this.mood && !opts.force && t - this.lastMoodChange < 0.5) return;
    const prev = this.mood;
    this.mood = mood; this.lastMoodChange = t;
    if (this.returnTimer != null) { clearTimeout(this.returnTimer); this.returnTimer = null; }
    this.pad.setLevel(PAD_LEVEL[mood], mood === 'combat' || mood === 'boss' ? 1 : 4);
    const key = this.trackKey(mood);
    // fade timings by transition type
    let fadeIn = opts.fadeIn, fadeOut = opts.fadeOut;
    if (mood === 'combat' || mood === 'boss') { fadeIn ??= 1.2; fadeOut ??= 1.6; }
    else if (prev === 'combat' || prev === 'boss') { fadeIn ??= 4; fadeOut ??= 2.5; }
    else if (mood === 'death') { fadeIn ??= 0.8; fadeOut ??= 1.2; }
    else { fadeIn ??= 3; fadeOut ??= 3; }
    if (mood === 'victory') {
      this.stopCurrent(2.2);
      this.playStinger('sting_victory', { duck: 0, volume: 0.9 });
      this.returnTimer = window.setTimeout(() => { this.returnTimer = null; if (this.mood === 'victory') this.setMood('explore', { fadeIn: 5 }); }, 7000);
      return;
    }
    if (!key) { this.stopCurrent(fadeOut); return; }
    if (key === this.current?.key && !opts.force) return;
    this.switchTo(key, { fadeIn, fadeOut });
    this.queuePrefetch();
  }

  private stopCurrent(fadeOut: number) {
    if (!this.current) return;
    const v = this.current.voice; const t = this.e.now;
    v.gain.gain.cancelScheduledValues(t);
    const g0 = Math.max(0.0001, v.gain.gain.value);
    v.gain.gain.setValueAtTime(g0, t);
    v.gain.gain.setValueCurveAtTime(FADE_OUT.map((x) => x * g0), t, fadeOut);
    this.fading.push({ voice: v, until: t + fadeOut });
    try { v.src.stop(t + fadeOut + 0.05); } catch { /* */ }
    this.current = null;
  }

  private switchTo(key: string, f: { fadeIn: number; fadeOut: number }) {
    const track = TRACKS[key]; if (!track) return;
    this.pendingKey = key;
    const buf = this.e.buffer(track.id);
    const start = (b: AudioBuffer) => {
      if (this.pendingKey !== key) return;        // superseded while decoding
      this.pendingKey = null;
      this.stopCurrent(f.fadeOut);
      const entry = this.e.entry(track.id);
      const voice = this.e.playBuffer(b, { bus: 'music', loop: track.loop, loopLength: entry?.loop, volume: 0.0001, priority: 2, send: 0 }, track.id);
      if (!voice) return;
      const t = this.e.now, lvl = track.level;
      voice.gain.gain.setValueAtTime(0.0001, t);
      voice.gain.gain.setValueCurveAtTime(FADE_IN.map((x) => Math.max(0.0001, x * lvl)), t, f.fadeIn);
      this.current = { key, voice, level: lvl };
    };
    if (buf) start(buf); else this.e.load(track.id).then((b) => { if (b) start(b); });
  }

  /** One-shot musical hit over whatever is playing; ducks the bed briefly. */
  playStinger(id: string, opts: { duck?: number; volume?: number; delay?: number } = {}) {
    const entry = this.e.entry(id); if (!entry) return;
    const dur = entry.dur;
    if ((opts.duck ?? -6) < 0) this.e.duckBus('music', opts.duck ?? -6, 0.08, Math.max(0.5, dur - 1), 1.5);
    this.e.play(id, { bus: 'music', volume: opts.volume ?? 0.9, pitchVar: 0, volVar: 0, priority: 2, send: 0.15, delay: opts.delay });
  }

  setDialogue(on: boolean) {
    if (on === this.dialogueDucked) return;
    this.dialogueDucked = on;
    if (on) this.e.duckBus('music', -7, 0.6); else this.e.unduckBus('music', 1.2);
  }

  private queuePrefetch() {
    const want = this.area === 'crypt' ? ['combat', 'crypt_tension', 'boss', 'crypt_explore', 'death'] : ['combat', 'tension', 'explore', 'camp', 'death'];
    this.prefetchQueue = want.filter((id) => !this.e.buffer(id));
  }
  private async pumpPrefetch() {
    if (this.prefetching || !this.prefetchQueue.length || !this.e.unlocked) return;
    this.prefetching = true;
    const id = this.prefetchQueue.shift()!;
    await this.e.load(id);
    this.prefetching = false;
  }

  update(_dt: number) {
    const t = this.e.now;
    this.fading = this.fading.filter((f) => f.until > t);
    this.pad.update();
    if (!this.prefetchQueue.length && !this.prefetchedOnce) { this.prefetchedOnce = true; this.queuePrefetch(); }
    this.pumpPrefetch();
    // a non-looping track ended (ending/death): keep the pad quiet, nothing to do
    if (this.current && !this.current.voice.playing) this.current = null;
  }

  get currentTrack() { return this.current?.key ?? null; }
}
