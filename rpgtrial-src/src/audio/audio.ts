// Public audio facade (audio agent). Wire from game.ts:
//   const audio = new AudioSystem(); await audio.init();
//   audio.update(dt, { pos: player.pos, yaw: cam.yaw, camPos }); audio.setArea('crypt'); audio.setMood('combat'); ...
// It subscribes itself to the event bus and to DOM CustomEvents 'ui:sfx' / 'ui:volume'.
import type { Vec3 } from '../core/math.ts';
import { AudioEngine, type VoiceOpts } from './engine.ts';
import { Synth } from './synth.ts';
import { MusicSystem, type Mood, type Area } from './music.ts';
import { AmbienceSystem } from './ambience.ts';
import { SfxRouter } from './sfx.ts';
import { AUDIO_FILES } from './manifest.generated.ts';

export type { Mood, Area };

export interface ListenerState { pos: Vec3; yaw: number; camPos?: Vec3; hp01?: number }

export class AudioSystem {
  engine: AudioEngine;
  synth: Synth;
  music: MusicSystem;
  ambience: AmbienceSystem;
  sfx: SfxRouter;
  ready = false;
  /** decode report (also mirrored to window.__audioReport for the e2e harness) */
  report: { total: number; decoded: number; failed: string[]; ms: number } = { total: 0, decoded: 0, failed: [], ms: 0 };
  private initPromise: Promise<void> | null = null;
  private lastUpdate = 0;
  private uiHandler = (e: Event) => { const d = (e as CustomEvent).detail; if (typeof d === 'string') this.sfx.ui(d); else if (d && typeof d.id === 'string') this.sfx.ui(d.id); };
  private volHandler = (e: Event) => { const d = (e as CustomEvent).detail ?? {}; this.setVolumes(d); };

  constructor() {
    this.engine = new AudioEngine();
    this.synth = new Synth(this.engine);
    this.music = new MusicSystem(this.engine, this.synth);
    this.ambience = new AmbienceSystem(this.engine, this.synth);
    this.sfx = new SfxRouter(this.engine, this.synth, this.music);
    this.sfx.onMood = (m) => this.setMood(m);
    this.sfx.onArea = (a) => this.setArea(a);
    this.sfx.subscribe();
    document.addEventListener('ui:sfx', this.uiHandler);
    document.addEventListener('ui:volume', this.volHandler);
    this.engine.onResumed.push(() => { this.ambience.start(); });
    (window as any).__audio = this;
  }

  /** Decode sfx + ambience up front (music decodes lazily per mood). Safe before the first user gesture. */
  init(onProgress?: (done: number, total: number) => void): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const t0 = performance.now();
      const groups = AUDIO_FILES.filter((f) => f.group !== 'music');
      this.report.total = groups.length;
      let done = 0;
      const step = () => { done++; onProgress?.(done, groups.length); };
      await Promise.all([this.engine.loadGroup('sfx', 6, step), this.engine.loadGroup('amb', 3, step)]);
      for (const f of groups) { if (this.engine.buffer(f.id)) this.report.decoded++; else this.report.failed.push(f.id); }
      this.report.ms = Math.round(performance.now() - t0);
      (window as any).__audioReport = this.report;
      this.ready = true;
      if (this.engine.unlocked) this.ambience.start();
      // warm the first music track
      this.engine.load(this.music.trackKey(this.music.mood) ?? 'explore');
    })();
    return this.initPromise;
  }

  /** Call once per frame. */
  update(dt: number, listener: ListenerState) {
    if (!listener) return;
    this.engine.updateListener(listener.pos, listener.yaw, listener.camPos);
    let hp01 = listener.hp01;
    if (hp01 == null) { try { const p = (globalThis as any).__hm?.world?.player; if (p && p.maxHp > 0) hp01 = p.dead ? 1 : p.hp / p.maxHp; } catch { /* */ } }
    if (hp01 != null) this.ambience.setPlayerHealth(hp01);
    this.music.update(dt);
    this.ambience.update(dt, this.engine.listenerPos);
    this.lastUpdate = this.engine.now;
  }

  setArea(area: Area) {
    if (area !== 'shore' && area !== 'crypt') return;
    this.engine.setArea(area); this.music.setArea(area); this.ambience.setArea(area);
  }
  setMood(mood: Mood) { this.music.setMood(mood); }
  setVolumes(v: { master?: number; music?: number; sfx?: number }) { this.engine.setVolumes(v); }
  setTimeOfDay(t: number) { this.ambience.setTimeOfDay(t); }
  /** Pause treatment (low-pass + dip). Also driven by bus 'ui' events. */
  setPaused(on: boolean) { this.engine.setPaused(on); }

  /**
   * Play any sound by id: a manifest family ('step_grass', 'coins'), an exact file id ('sting_bighit_1'),
   * or a named recipe ('chest_open', 'gate_open', 'boulder', 'lockpick', 'whisper', 'owl', 'thunder').
   */
  play(id: string, opts: { pos?: Vec3; volume?: number; pitch?: number; loop?: boolean } = {}) {
    const o: VoiceOpts = { pos: opts.pos ?? null, volume: opts.volume, pitch: opts.pitch, loop: opts.loop };
    switch (id) {
      case 'chest_open': case 'chest': this.sfx.chestOpen(); return;
      case 'gate_open': case 'gate': case 'door': this.sfx.gateOpen(); return;
      case 'boulder': case 'rumble': this.sfx.boulder(); return;
      case 'lockpick': this.sfx.lockpick(); return;
      case 'whisper': this.synth.whisper({ pos: opts.pos, volume: opts.volume }); return;
      case 'owl': this.synth.owl({ pos: opts.pos, volume: opts.volume }); return;
      case 'thunder': this.engine.play('thunder_far', { bus: 'amb', ...o }); this.synth.thunder({ pos: opts.pos, volume: (opts.volume ?? 1) * 0.4 }); return;
      case 'gust': this.synth.windGust({ pos: opts.pos, volume: opts.volume }); return;
      case 'dice': this.sfx.rollDice(); return;
      case 'success': this.sfx.rollResult(true, null); return;
      case 'fail': this.sfx.rollResult(false, null); return;
      case 'nat20': this.sfx.rollResult(true, 'hit'); return;
      case 'nat1': this.sfx.rollResult(false, 'miss'); return;
    }
    if (this.engine.has(id)) { const e = this.engine.entry(id) ?? this.engine.entry(this.engine.variants(id)[0]); this.engine.play(id, { bus: e?.group === 'music' ? 'music' : e?.group === 'amb' ? 'amb' : 'sfx', ...o }); return; }
    this.sfx.ui(id);
  }
  /** Musical hit over the current track (ids: sting_bighit_1/2, sting_victory, sting_victory_short, sting_levelup, sting_learn, sting_discovery). */
  playStinger(id: string, opts?: { duck?: number; volume?: number }) { this.music.playStinger(id, opts); }

  /** Stop everything (e.g. restart). Music/ambience restart on the next setMood/update. */
  stopAll() { this.engine.stopAll(0.3); }
  dispose() { this.sfx.dispose(); document.removeEventListener('ui:sfx', this.uiHandler); document.removeEventListener('ui:volume', this.volHandler); }
}
