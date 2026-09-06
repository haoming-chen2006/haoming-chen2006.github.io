// Ambience: per-area beds mixed by time of day, positional loops (campfire, torches, the lake's edge),
// randomized one-shots (birds, owls, thunder, gusts, drips, chains, whispers) and the low-HP heartbeat.
import type { Vec3 } from '../core/math.ts';
import { LAKE, LANDMARKS, LIGHTS } from '../content/level.ts';
import { AudioEngine, rand, type Voice } from './engine.ts';
import { Synth } from './synth.ts';
import type { Area } from './music.ts';

interface Bed { id: string; area: Area; voice: Voice | null; base: number; level: () => number; starting: boolean }
interface OneShot { area: Area | 'any'; next: number; min: number; max: number; when: () => boolean; fire: () => void }

const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class AmbienceSystem {
  area: Area = 'shore';
  timeOfDay = 0.78;                 // fraction of a day; game starts at dusk
  private beds: Bed[] = [];
  private shots: OneShot[] = [];
  private listener: Vec3 = { x: 0, y: 1.6, z: 0 };
  private lake: Voice | null = null;
  private campfire: Voice | null = null;
  private torches = new Map<number, Voice>();
  private torchTimer = 0;
  private heartbeat: Voice | null = null;
  private hp01 = 1;
  private started = false;
  enabled = true;

  constructor(private e: AudioEngine, private synth: Synth) {
    const day = () => this.daylight;
    const night = () => 1 - this.daylight;
    this.beds = [
      { id: 'wind_pines', area: 'shore', voice: null, base: 0.55, level: () => 0.7 + 0.3 * night(), starting: false },
      { id: 'birds_day', area: 'shore', voice: null, base: 0.55, level: day, starting: false },
      { id: 'crickets', area: 'shore', voice: null, base: 0.5, level: () => night() * (0.6 + 0.4 * this.lakeProximity()), starting: false },
      { id: 'crypt_drone', area: 'crypt', voice: null, base: 0.55, level: () => 1, starting: false },
      { id: 'crypt_texture', area: 'crypt', voice: null, base: 0.45, level: () => 1, starting: false },
      { id: 'crypt_drips', area: 'crypt', voice: null, base: 0.4, level: () => 1, starting: false },
    ];
    const around = (minR: number, maxR: number, yMin = 1, yMax = 4): Vec3 => {
      const a = rand(0, Math.PI * 2), r = rand(minR, maxR); const l = this.listener;
      return { x: l.x + Math.sin(a) * r, y: l.y + rand(yMin, yMax), z: l.z + Math.cos(a) * r };
    };
    this.shots = [
      { area: 'shore', next: 0, min: 4, max: 11, when: () => day() > 0.25, fire: () => e.play('bird', { bus: 'amb', pos: around(8, 26, 3, 9), volume: rand(0.35, 0.7) * day(), refDistance: 6, priority: 0 }) },
      { area: 'shore', next: 0, min: 14, max: 40, when: () => night() > 0.5, fire: () => (Math.random() < 0.7 ? synth.owl({ pos: around(18, 40, 4, 9), volume: rand(0.5, 0.9) * night(), refDistance: 8 }) : e.play('bird_night', { bus: 'amb', pos: around(10, 25, 3, 8), volume: 0.5 * night(), priority: 0 })) },
      { area: 'shore', next: 0, min: 5, max: 14, when: () => night() > 0.4 && this.lakeProximity() > 0.35, fire: () => e.play('frog', { bus: 'amb', pos: this.lakeEdgePoint(rand(-0.6, 0.6)), volume: rand(0.25, 0.5) * night(), refDistance: 4, priority: 0 }) },
      { area: 'shore', next: 0, min: 45, max: 140, when: () => true, fire: () => e.play('thunder_far', { bus: 'amb', pos: around(80, 140, 20, 40), volume: rand(0.35, 0.7), refDistance: 70, maxDistance: 400, rolloff: 0.6, priority: 1 }) },
      { area: 'shore', next: 0, min: 7, max: 18, when: () => true, fire: () => synth.windGust({ volume: rand(0.25, 0.55), dur: rand(3, 7) }) },
      { area: 'crypt', next: 0, min: 1.2, max: 5, when: () => true, fire: () => synth.drip({ pos: around(3, 16, 0, 5), volume: rand(0.4, 1) }) },
      { area: 'crypt', next: 0, min: 25, max: 70, when: () => true, fire: () => e.play('chain', { bus: 'amb', pos: around(6, 22, 0, 4), volume: rand(0.2, 0.4), priority: 0 }) },
      { area: 'crypt', next: 0, min: 18, max: 50, when: () => true, fire: () => (Math.random() < 0.55 ? synth.whisper({ pos: around(4, 12, 0, 3), volume: rand(0.4, 0.8) }) : e.play(Math.random() < 0.5 ? 'ghost_moan' : 'ghost_breath', { bus: 'amb', pos: around(8, 20, 0, 4), volume: rand(0.25, 0.45), pitchVar: 0.1, priority: 0 })) },
      { area: 'crypt', next: 0, min: 30, max: 90, when: () => true, fire: () => synth.rumble({ pos: around(20, 40, -3, 3), volume: rand(0.2, 0.45), dur: rand(1.5, 3) }) },
      { area: 'crypt', next: 0, min: 20, max: 60, when: () => true, fire: () => e.play('stones', { bus: 'amb', pos: around(10, 25, 0, 6), volume: rand(0.15, 0.3), priority: 0 }) },
    ];
  }

  get daylight(): number {
    let t = this.timeOfDay; if (t > 1) t = (t / 24) % 1;
    return smoothstep(0.22, 0.31, t) * (1 - smoothstep(0.73, 0.84, t));
  }
  setTimeOfDay(t: number) { this.timeOfDay = t; }
  setPlayerHealth(hp01: number) { this.hp01 = Math.min(1, Math.max(0, hp01)); }

  /** 0 far from the lake .. 1 at the shoreline / in the water. */
  lakeProximity(): number {
    const d = Math.hypot(this.listener.x - LAKE.x, this.listener.z - LAKE.z) - LAKE.r;
    return d <= 0 ? 1 : Math.exp(-d / 22);
  }
  /** Nearest point on the lake's edge to the listener (optionally rotated along the rim by `spread` radians). */
  lakeEdgePoint(spread = 0): Vec3 {
    const dx = this.listener.x - LAKE.x, dz = this.listener.z - LAKE.z; const len = Math.hypot(dx, dz) || 1;
    const a = Math.atan2(dx, dz) + spread;
    const inside = len < LAKE.r;
    const r = inside ? Math.max(1, len) : LAKE.r;
    return { x: LAKE.x + Math.sin(a) * r, y: LAKE.level + 0.2, z: LAKE.z + Math.cos(a) * r };
  }

  setArea(area: Area) {
    if (area === this.area) return;
    this.area = area;
    for (const s of this.shots) s.next = this.e.now + rand(2, 8);
  }

  start() { this.started = true; for (const s of this.shots) s.next = this.e.now + rand(1, s.max * 0.5); }

  private ensureBed(b: Bed) {
    if (b.voice || b.starting) return;
    const buf = this.e.buffer(b.id);
    if (!buf) { b.starting = true; this.e.load(b.id).then(() => { b.starting = false; }); return; }
    const entry = this.e.entry(b.id);
    b.voice = this.e.playBuffer(buf, { bus: 'amb', loop: true, loopLength: entry?.loop, volume: 0.0001, priority: 2, send: b.area === 'crypt' ? 0.25 : 0.1, offset: rand(0, Math.max(0, buf.duration - 1)) }, b.id);
  }

  update(dt: number, listener: Vec3) {
    this.listener = listener;
    if (!this.started || !this.enabled) return;
    const t = this.e.now, k = 0.8;
    // ---- beds: keep the current area's beds running and ease their gains; fade out the others
    for (const b of this.beds) {
      const active = b.area === this.area;
      if (active) this.ensureBed(b);
      if (!b.voice) continue;
      const target = active ? b.base * b.level() : 0;
      b.voice.gain.gain.setTargetAtTime(Math.max(0.0001, target), t, k);
      if (!active && b.voice.gain.gain.value < 0.002) { b.voice.stop(0.5); b.voice = null; }
    }
    // ---- lake edge (shore only): a loop that follows the nearest shoreline point
    if (this.area === 'shore') {
      if (!this.lake) { const buf = this.e.buffer('lake_water'); if (buf) this.lake = this.e.playBuffer(buf, { bus: 'amb', loop: true, loopLength: this.e.entry('lake_water')?.loop, volume: 0.0001, priority: 2, pos: this.lakeEdgePoint(), refDistance: 7, maxDistance: 160, rolloff: 0.9, send: 0.08, offset: rand(0, 40) }, 'lake_water'); else this.e.load('lake_water'); }
      if (this.lake) { this.lake.setPos(this.lakeEdgePoint()); this.lake.gain.gain.setTargetAtTime(0.75, t, 0.5); }
    } else if (this.lake) { this.lake.stop(2); this.lake = null; }
    // ---- campfire
    const cf = LANDMARKS.campfire; const dCamp = Math.hypot(listener.x - cf.x, listener.z - cf.z);
    if (this.area === 'shore' && dCamp < 50) {
      if (!this.campfire) { const buf = this.e.buffer('campfire'); if (buf) this.campfire = this.e.playBuffer(buf, { bus: 'amb', loop: true, loopLength: this.e.entry('campfire')?.loop, volume: 0.0001, priority: 2, pos: { x: cf.x, y: cf.y + 0.4, z: cf.z }, refDistance: 1.8, maxDistance: 60, rolloff: 1.3, send: 0.06, offset: rand(0, 20) }, 'campfire'); }
      if (this.campfire) this.campfire.gain.gain.setTargetAtTime(0.85, t, 0.4);
    } else if (this.campfire) { this.campfire.stop(1.5); this.campfire = null; }
    // ---- torches / braziers from the level's light placements (nearest few)
    this.torchTimer -= dt;
    if (this.torchTimer <= 0) { this.torchTimer = 0.5; this.updateTorches(); }
    // ---- one-shots
    for (const s of this.shots) {
      if (s.area !== 'any' && s.area !== this.area) continue;
      if (t < s.next) continue;
      s.next = t + rand(s.min, s.max);
      if (s.when()) s.fire();
    }
    // ---- heartbeat under 30% hp
    const want = this.hp01 < 0.3 ? Math.min(1, (0.3 - this.hp01) / 0.25 + 0.25) : 0;
    if (want > 0 && !this.heartbeat) { const buf = this.e.buffer('heartbeat'); if (buf) this.heartbeat = this.e.playBuffer(buf, { bus: 'amb', loop: true, loopLength: this.e.entry('heartbeat')?.loop, volume: 0.0001, priority: 2, send: 0 }, 'heartbeat'); }
    if (this.heartbeat) {
      this.heartbeat.gain.gain.setTargetAtTime(Math.max(0.0001, want * 0.9), t, 0.6);
      this.heartbeat.src.playbackRate.setTargetAtTime(1 + (1 - Math.min(1, this.hp01 / 0.3)) * 0.4, t, 1);
      if (want === 0 && this.heartbeat.gain.gain.value < 0.003) { this.heartbeat.stop(0.4); this.heartbeat = null; }
    }
  }

  private updateTorches() {
    const l = this.listener; const near: { i: number; d: number; kind: string; pos: Vec3 }[] = [];
    for (let i = 0; i < LIGHTS.length; i++) {
      const L = LIGHTS[i]; if (L.kind !== 'torch' && L.kind !== 'fire' && L.kind !== 'candle') continue;
      const d = Math.hypot(L.x - l.x, L.y - l.y, L.z - l.z); const maxD = L.kind === 'candle' ? 8 : L.kind === 'fire' ? 40 : 22;
      if (d < maxD) near.push({ i, d, kind: L.kind, pos: { x: L.x, y: L.y, z: L.z } });
    }
    near.sort((a, b) => a.d - b.d); const keep = near.slice(0, 6); const keepIds = new Set(keep.map((n) => n.i));
    for (const [i, v] of this.torches) if (!keepIds.has(i)) { v.stop(1.2); this.torches.delete(i); }
    for (const n of keep) {
      if (this.torches.has(n.i)) continue;
      const id = n.kind === 'fire' ? 'campfire' : 'torch'; const buf = this.e.buffer(id); if (!buf) continue;
      const v = this.e.playBuffer(buf, { bus: 'amb', loop: true, loopLength: this.e.entry(id)?.loop, volume: n.kind === 'candle' ? 0.12 : n.kind === 'fire' ? 0.7 : 0.45, fadeIn: 1, priority: 1, pos: n.pos, refDistance: n.kind === 'fire' ? 1.8 : 1.2, maxDistance: 50, rolloff: 1.4, send: 0.05, offset: rand(0, 10) }, id);
      if (v) this.torches.set(n.i, v);
    }
  }
}
