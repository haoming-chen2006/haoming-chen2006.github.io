// WebAudio engine core: context, mix buses, reverb sends, listener, buffer cache and voice playback.
// Everything else in src/audio builds on this. No three.js, no sim imports.
import type { Vec3 } from '../core/math.ts';
import { AUDIO_FILES, type AudioFileEntry } from './manifest.generated.ts';

export type Bus = 'music' | 'sfx' | 'amb' | 'ui' | 'voice';

export interface VoiceOpts {
  bus?: Bus;
  pos?: Vec3 | null;            // world position -> HRTF panner; omit/null = non-positional
  volume?: number;              // linear gain (1 = as authored)
  pitch?: number;               // playbackRate multiplier
  loop?: boolean;
  loopLength?: number;          // seconds (seamless loop length from the manifest)
  delay?: number;               // seconds from now
  offset?: number;              // start offset into the buffer
  duration?: number;            // stop after this many seconds (with a short fade)
  fadeIn?: number;
  send?: number;                // reverb send (0..1); default per bus
  refDistance?: number; maxDistance?: number; rolloff?: number;
  lowpass?: number;             // per-voice lowpass cutoff
  highpass?: number;
  priority?: number;            // 0 = droppable, 1 = normal, 2 = important
}

export interface Voice {
  src: AudioBufferSourceNode;
  gain: GainNode;
  panner: PannerNode | null;
  filter: BiquadFilterNode | null;
  started: number;
  stop(fade?: number): void;
  setPos(p: Vec3): void;
  playing: boolean;
}

const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
export const audioUrl = (file: string) => BASE + 'assets/audio/' + file;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const dB = (db: number) => Math.pow(10, db / 20);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Equal-power crossfade curves (for setValueCurveAtTime). */
const CURVE_N = 48;
export const FADE_IN = new Float32Array(CURVE_N).map((_, i) => Math.sin((i / (CURVE_N - 1)) * Math.PI * 0.5));
export const FADE_OUT = new Float32Array(CURVE_N).map((_, i) => Math.cos((i / (CURVE_N - 1)) * Math.PI * 0.5));

export class AudioEngine {
  ctx: AudioContext;
  master: GainNode;
  compressor: DynamicsCompressorNode;
  limiter: DynamicsCompressorNode;
  outGain: GainNode;                  // final trim; tap here (outGain) to record the mix
  pauseFilter: BiquadFilterNode;      // low-pass when paused / menu open
  pauseGain: GainNode;
  buses: Record<Bus, GainNode>;
  duck: Record<Bus, GainNode>;        // ducking stage per bus (dialogue, stingers)
  reverbIn: { small: GainNode; large: GainNode };
  reverbReturn: { small: GainNode; large: GainNode };
  private convolvers: { small: ConvolverNode; large: ConvolverNode };
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private entries = new Map<string, AudioFileEntry>();
  private families = new Map<string, string[]>();   // 'step_grass' -> ['step_grass_1', ...]
  private lastVariant = new Map<string, number>();
  private lastPlayed = new Map<string, number>();
  private activeVoices = new Set<Voice>();
  private musicBufferOrder: string[] = [];
  private area: 'shore' | 'crypt' = 'shore';
  volumes = { master: 1, music: 1, sfx: 1 };
  unlocked = false;
  listenerPos: Vec3 = { x: 0, y: 1.6, z: 0 };
  listenerYaw = 0;
  maxVoices = 56;
  onResumed: (() => void)[] = [];

  constructor() {
    const AC: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 1;
    // gentle glue compression, then a fast limiter so stacked layers never clip the output
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -12; this.compressor.knee.value = 10; this.compressor.ratio.value = 2.5;
    this.compressor.attack.value = 0.006; this.compressor.release.value = 0.2;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -3; this.limiter.knee.value = 0; this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001; this.limiter.release.value = 0.08;
    this.outGain = c.createGain(); this.outGain.gain.value = dB(-1.5);
    this.pauseFilter = c.createBiquadFilter(); this.pauseFilter.type = 'lowpass'; this.pauseFilter.frequency.value = 20000; this.pauseFilter.Q.value = 0.5;
    this.pauseGain = c.createGain();
    this.master.connect(this.pauseFilter).connect(this.pauseGain).connect(this.compressor).connect(this.limiter).connect(this.outGain).connect(c.destination);
    const mk = () => c.createGain();
    this.buses = { music: mk(), sfx: mk(), amb: mk(), ui: mk(), voice: mk() };
    this.duck = { music: mk(), sfx: mk(), amb: mk(), ui: mk(), voice: mk() };
    for (const b of Object.keys(this.buses) as Bus[]) this.buses[b].connect(this.duck[b]).connect(this.master);
    // reverb: two convolvers, area selects the return balance
    this.convolvers = { small: c.createConvolver(), large: c.createConvolver() };
    this.reverbIn = { small: mk(), large: mk() };
    this.reverbReturn = { small: mk(), large: mk() };
    this.reverbIn.small.connect(this.convolvers.small).connect(this.reverbReturn.small).connect(this.master);
    this.reverbIn.large.connect(this.convolvers.large).connect(this.reverbReturn.large).connect(this.master);
    this.reverbReturn.small.gain.value = 1; this.reverbReturn.large.gain.value = 0;
    this.buildImpulses();
    for (const e of AUDIO_FILES) {
      this.entries.set(e.id, e);
      const fam = e.id.replace(/_\d+$/, '');
      if (fam !== e.id) { if (!this.families.has(fam)) this.families.set(fam, []); this.families.get(fam)!.push(e.id); }
    }
    this.applyVolumes();
    const unlock = () => { this.resume(); };
    for (const ev of ['pointerdown', 'keydown', 'click', 'touchstart']) document.addEventListener(ev, unlock, { passive: true });
    c.addEventListener?.('statechange', () => { if (c.state === 'running' && !this.unlocked) { this.unlocked = true; this.onResumed.forEach((f) => f()); } });
  }

  get now() { return this.ctx.currentTime; }

  resume() {
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    else if (!this.unlocked) { this.unlocked = true; this.onResumed.forEach((f) => f()); }
  }

  /** Generated impulse responses: exponentially decaying noise, darker tail for the crypt. */
  private buildImpulses() {
    this.convolvers.small.buffer = this.makeImpulse(1.4, 3.2, 0.32, 0.006);
    this.convolvers.large.buffer = this.makeImpulse(4.2, 2.2, 0.18, 0.025);
  }
  makeImpulse(seconds: number, decay: number, damp: number, preDelay: number): AudioBuffer {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * seconds), buf = this.ctx.createBuffer(2, n, sr);
    const pre = Math.floor(preDelay * sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      // early reflections: a few sparse taps
      for (let k = 0; k < 6; k++) { const at = pre + Math.floor(rand(0.005, 0.06) * sr); if (at < n) d[at] += rand(0.2, 0.5) * (Math.random() < 0.5 ? -1 : 1); }
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / sr;
        const env = Math.pow(1 - t / seconds, decay) * Math.exp(-t * 0.6);
        const white = Math.random() * 2 - 1;
        lp += damp * (white - lp);           // one-pole lowpass => tail gets darker as damp shrinks
        d[i] += lp * env * 0.9;
      }
    }
    return buf;
  }

  setArea(area: 'shore' | 'crypt') {
    this.area = area;
    const t = this.now;
    this.reverbReturn.small.gain.cancelScheduledValues(t); this.reverbReturn.large.gain.cancelScheduledValues(t);
    this.reverbReturn.small.gain.setTargetAtTime(area === 'shore' ? 1 : 0.25, t, 1.0);
    this.reverbReturn.large.gain.setTargetAtTime(area === 'crypt' ? 1 : 0, t, 1.0);
  }
  get currentArea() { return this.area; }

  setVolumes(v: { master?: number; music?: number; sfx?: number }) {
    if (v.master != null) this.volumes.master = clamp01(v.master);
    if (v.music != null) this.volumes.music = clamp01(v.music);
    if (v.sfx != null) this.volumes.sfx = clamp01(v.sfx);
    this.applyVolumes();
  }
  private applyVolumes() {
    const t = this.now, s = 0.05;
    // perceptual: square the sliders
    this.master.gain.setTargetAtTime(this.volumes.master * this.volumes.master, t, s);
    this.buses.music.gain.setTargetAtTime(this.volumes.music * this.volumes.music * 0.72, t, s);
    const sfx = this.volumes.sfx * this.volumes.sfx;
    this.buses.sfx.gain.setTargetAtTime(sfx * 0.72, t, s);
    this.buses.amb.gain.setTargetAtTime(sfx * 0.7, t, s);
    this.buses.ui.gain.setTargetAtTime(sfx * 0.6, t, s);
    this.buses.voice.gain.setTargetAtTime(sfx * 0.75, t, s);
  }

  /** Pause / menu treatment: low-pass + dip. */
  setPaused(on: boolean) {
    const t = this.now;
    this.pauseFilter.frequency.cancelScheduledValues(t);
    this.pauseFilter.frequency.setTargetAtTime(on ? 700 : 20000, t, on ? 0.12 : 0.25);
    this.pauseGain.gain.cancelScheduledValues(t);
    this.pauseGain.gain.setTargetAtTime(on ? 0.55 : 1, t, 0.15);
  }
  /** Duck a bus by `db` for `hold` seconds (or until undone if hold is null). */
  duckBus(bus: Bus, db: number, attack = 0.15, hold: number | null = null, release = 0.6) {
    const g = this.duck[bus].gain, t = this.now;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(dB(db), t, attack / 3);
    if (hold != null) g.setTargetAtTime(1, t + attack + hold, release / 3);
  }
  unduckBus(bus: Bus, release = 0.6) {
    const g = this.duck[bus].gain, t = this.now; g.cancelScheduledValues(t); g.setTargetAtTime(1, t, release / 3);
  }

  updateListener(pos: Vec3, yaw: number, camPos?: Vec3) {
    // Sit the ears a little way from the player toward the camera: sounds behind the camera stay audible,
    // distances are still judged from the character.
    const p = camPos ? { x: pos.x + (camPos.x - pos.x) * 0.35, y: pos.y + 1.4 + (camPos.y - pos.y - 1.4) * 0.35, z: pos.z + (camPos.z - pos.z) * 0.35 } : { x: pos.x, y: pos.y + 1.5, z: pos.z };
    this.listenerPos = p; this.listenerYaw = yaw;
    const L = this.ctx.listener as AudioListener & { positionX?: AudioParam };
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    if (L.positionX) {
      const t = this.now, k = 0.03;
      L.positionX.setTargetAtTime(p.x, t, k); L.positionY.setTargetAtTime(p.y, t, k); L.positionZ.setTargetAtTime(p.z, t, k);
      L.forwardX.setTargetAtTime(fx, t, k); L.forwardY.setTargetAtTime(0, t, k); L.forwardZ.setTargetAtTime(fz, t, k);
      L.upX.setTargetAtTime(0, t, k); L.upY.setTargetAtTime(1, t, k); L.upZ.setTargetAtTime(0, t, k);
    } else if ((L as any).setPosition) { (L as any).setPosition(p.x, p.y, p.z); (L as any).setOrientation(fx, 0, fz, 0, 1, 0); }
  }
  distanceTo(p: Vec3) { const l = this.listenerPos; return Math.hypot(p.x - l.x, p.y - l.y, p.z - l.z); }

  // ---------------------------------------------------------------- buffers
  entry(id: string) { return this.entries.get(id); }
  has(id: string) { return this.entries.has(id) || this.families.has(id); }
  variants(id: string): string[] { return this.families.get(id) ?? (this.entries.has(id) ? [id] : []); }
  /** Pick a variant for a family id, avoiding the one used last time. */
  variant(id: string): string | null {
    const v = this.variants(id); if (!v.length) return null; if (v.length === 1) return v[0];
    let i = Math.floor(Math.random() * v.length);
    if (i === this.lastVariant.get(id)) i = (i + 1 + Math.floor(Math.random() * (v.length - 1))) % v.length;
    this.lastVariant.set(id, i); return v[i];
  }
  buffer(id: string): AudioBuffer | null { return this.buffers.get(id) ?? null; }
  async load(id: string): Promise<AudioBuffer | null> {
    const have = this.buffers.get(id); if (have) return have;
    const p = this.pending.get(id); if (p) return p;
    const e = this.entries.get(id); if (!e) { console.warn('[audio] unknown file id', id); return null; }
    const job = (async () => {
      try {
        const res = await fetch(audioUrl(e.file)); if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(data);
        this.buffers.set(id, buf);
        if (e.group === 'music') { this.musicBufferOrder.push(id); this.evictMusic(); }
        return buf;
      } catch (err) { console.error('[audio] decode failed', e.file, err); return null; }
      finally { this.pending.delete(id); }
    })();
    this.pending.set(id, job); return job;
  }
  /** Keep only the most recent few decoded music tracks (each is ~25-50 MB of PCM). */
  private evictMusic(keep = 4) {
    while (this.musicBufferOrder.length > keep) {
      const id = this.musicBufferOrder.shift()!;
      if (![...this.activeVoices].some((v) => (v as any).id === id)) this.buffers.delete(id); else this.musicBufferOrder.push(id);
    }
  }
  /** Decode everything in a group (sfx/amb at init; music is lazy). Concurrency-limited. */
  async loadGroup(group: AudioFileEntry['group'], concurrency = 6, onProgress?: (done: number, total: number) => void) {
    const ids = AUDIO_FILES.filter((e) => e.group === group).map((e) => e.id);
    let i = 0, done = 0;
    const worker = async () => { while (i < ids.length) { const id = ids[i++]; await this.load(id); done++; onProgress?.(done, ids.length); } };
    await Promise.all(Array.from({ length: concurrency }, worker));
    return ids.length;
  }
  /** Leading digital silence (encoder delay that the browser didn't strip); used to align loop points. */
  leadingSilence(buf: AudioBuffer): number {
    const d = buf.getChannelData(0), n = Math.min(d.length, 8192); let i = 0;
    while (i < n && Math.abs(d[i]) < 2e-4) i++;
    return i >= n ? 0 : i / buf.sampleRate;
  }

  // ---------------------------------------------------------------- playback
  /** Rate limiter: returns false if `key` fired within `minInterval` seconds. */
  allow(key: string, minInterval: number): boolean {
    const t = this.now, last = this.lastPlayed.get(key) ?? -1e9;
    if (t - last < minInterval) return false;
    this.lastPlayed.set(key, t); return true;
  }
  activeCount() { return this.activeVoices.size; }

  /** Play a decoded buffer through the graph. Returns null if dropped (voice cap) or not loaded. */
  playBuffer(buf: AudioBuffer, o: VoiceOpts = {}, id = ''): Voice | null {
    const pri = o.priority ?? 1;
    if (this.activeVoices.size >= this.maxVoices && pri < 2) {
      if (pri === 0) return null;
      // steal the oldest droppable voice
      let victim: Voice | null = null; for (const v of this.activeVoices) if ((v as any).pri === 0) { victim = v; break; }
      if (victim) victim.stop(0.02); else return null;
    }
    const c = this.ctx, t0 = this.now + (o.delay ?? 0);
    const src = c.createBufferSource(); src.buffer = buf;
    const rate = o.pitch ?? 1; src.playbackRate.value = rate;
    const gain = c.createGain();
    const vol = o.volume ?? 1;
    let node: AudioNode = src;
    let filter: BiquadFilterNode | null = null;
    if (o.lowpass || o.highpass) {
      filter = c.createBiquadFilter(); filter.type = o.lowpass ? 'lowpass' : 'highpass'; filter.frequency.value = o.lowpass ?? o.highpass!; filter.Q.value = 0.7;
      node.connect(filter); node = filter;
    }
    let panner: PannerNode | null = null;
    if (o.pos) {
      panner = c.createPanner();
      panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
      panner.refDistance = o.refDistance ?? 2.5; panner.maxDistance = o.maxDistance ?? 80; panner.rolloffFactor = o.rolloff ?? 1.1;
      panner.coneInnerAngle = 360; panner.coneOuterAngle = 360;
      this.setPannerPos(panner, o.pos);
      node.connect(panner); node = panner;
    }
    node.connect(gain);
    const bus = o.bus ?? 'sfx';
    gain.connect(this.buses[bus]);
    // reverb send: default depends on bus; positional sounds get wetter with distance
    let send = o.send ?? (bus === 'music' ? 0 : bus === 'ui' ? 0.08 : bus === 'amb' ? 0.12 : 0.22);
    if (o.pos && o.send == null) { const d = this.distanceTo(o.pos); send = Math.min(0.5, send + d * 0.008); }
    if (send > 0) {
      const sg = c.createGain(); sg.gain.value = send; gain.connect(sg);
      sg.connect(this.reverbIn.small); sg.connect(this.reverbIn.large);
    }
    if (o.fadeIn) { gain.gain.setValueAtTime(0.0001, t0); gain.gain.linearRampToValueAtTime(vol, t0 + o.fadeIn); }
    else gain.gain.setValueAtTime(vol, t0);
    if (o.loop) { src.loop = true; const lead = this.leadingSilence(buf); src.loopStart = lead; src.loopEnd = Math.min(buf.duration, lead + (o.loopLength ?? buf.duration)); }
    const voice: Voice = {
      src, gain, panner, filter, started: t0, playing: true,
      stop: (fade = 0.03) => {
        if (!voice.playing) return; voice.playing = false;
        const t = this.now; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.005, fade));
        try { src.stop(t + Math.max(0.005, fade) + 0.02); } catch { /* already stopped */ }
      },
      setPos: (p) => { if (panner) this.setPannerPos(panner, p); },
    };
    (voice as any).pri = pri; (voice as any).id = id;
    src.onended = () => { voice.playing = false; this.activeVoices.delete(voice); try { gain.disconnect(); } catch { /* */ } };
    this.activeVoices.add(voice);
    const offset = o.offset ?? 0;
    if (o.duration != null) {
      src.start(t0, offset);
      const end = t0 + o.duration;
      gain.gain.setValueAtTime(vol, Math.max(t0, end - 0.05)); gain.gain.linearRampToValueAtTime(0.0001, end);
      src.stop(end + 0.01);
    } else if (o.loop) src.start(t0, offset);
    else src.start(t0, offset);
    return voice;
  }
  private setPannerPos(p: PannerNode, pos: Vec3) {
    const t = this.now;
    if (p.positionX) { p.positionX.setTargetAtTime(pos.x, t, 0.02); p.positionY.setTargetAtTime(pos.y, t, 0.02); p.positionZ.setTargetAtTime(pos.z, t, 0.02); }
    else (p as any).setPosition(pos.x, pos.y, pos.z);
  }

  /** Play a manifest sample (family or exact id) with variation. Loads lazily if needed (then plays late). */
  play(id: string, o: VoiceOpts & { pitchVar?: number; volVar?: number; rate?: number } = {}): Voice | null {
    const vid = this.variant(id); if (!vid) { return null; }
    if (o.rate != null && !this.allow('id:' + id, o.rate)) return null;
    const buf = this.buffers.get(vid);
    const pv = o.pitchVar ?? 0.06, vv = o.volVar ?? 0.12;
    const opts: VoiceOpts = { ...o, pitch: (o.pitch ?? 1) * (1 + rand(-pv, pv)), volume: (o.volume ?? 1) * (1 + rand(-vv, vv)) };
    if (!buf) { this.load(vid).then((b) => { if (b && (o.delay ?? 0) >= 0) this.playBuffer(b, { ...opts, delay: 0 }, vid); }); return null; }
    if (o.loop && o.loopLength == null) opts.loopLength = this.entries.get(vid)?.loop;
    return this.playBuffer(buf, opts, vid);
  }

  stopAll(fade = 0.1) { for (const v of this.activeVoices) v.stop(fade); }
}
