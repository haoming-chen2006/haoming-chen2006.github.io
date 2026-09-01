/**
 * The mixer, and the thing that keeps music playing.
 *
 * Three nodes and a rule: `master -> destination`, with a music bus and an
 * effects bus hanging off it. Two faders, because the honest split is not on and
 * off — plenty of people want the table at full and the music at a whisper.
 *
 * WHY THE CONTEXT IS BUILT LATE. An `AudioContext` constructed at page load is a
 * suspended context on every browser that matters, and resuming it needs a
 * gesture. Rather than build one and hope, nothing is constructed until the
 * player has actually asked for sound and actually touched the page. That order
 * — consent first, then gesture, then context — is also why there is no code
 * here that tries to work around an autoplay policy: the policy and this module
 * want the same thing.
 *
 * WHAT ROTATES, AND WHEN. Each scene owns a playlist and the playlist is
 * shuffled, not cycled, with one rule: never the same track twice running. A bed
 * plays for `BED_SECONDS` and then crossfades to the next; a sampled track
 * crossfades when it is `CROSSFADE` from its own end, so a loop point is never
 * heard. Changing scene crossfades immediately. Nothing ever cuts.
 *
 *   lobby   two slow beds, no pulse         `courtyard`, `rain`
 *   table   two with a drum, and any music the build has a licence for
 *   over    silence, faded, until the scene changes again
 *
 * In the public build the licensed set is empty (`provenance.json`), so every
 * track is generated and the rotation is unbounded — a bed is seeded but its
 * note choices run forward, so the second visit to `march` is not the first one
 * again.
 */
import { BEDS, Bed, type BedSpec } from './generative';
import { CLIPS, clipByKey, pickTake, takesOf, type Clip } from './clips';
import { lengthOf, play as playPatch, type Voice } from './sfx';
import type { Cue, Scene, SoundCue } from './cues';

/** Seconds of overlap when one track hands over to the next. Never a cut. */
const CROSSFADE = 4;
/** How long a generated bed runs before the rotation moves on. */
const BED_SECONDS = 165;
/** Effects alive at once. Past this the newest is dropped: the ear cannot hear
 *  a twelfth simultaneous impact and the bus can certainly clip on one. */
const MAX_VOICES = 10;
/** Two identical cues closer than this are one cue. The engine sends bursts. */
const DEDUPE_MS = 45;

type Track =
  | { readonly kind: 'bed'; readonly id: string; readonly spec: BedSpec }
  | { readonly kind: 'clip'; readonly id: string; readonly clip: Clip };

const PLAYLIST: Readonly<Record<Scene, readonly string[]>> = {
  lobby: ['courtyard', 'rain'],
  table: ['march', 'embers', 'courtyard'],
  over: [],
};

export interface RuntimeReport {
  /** Every cue this session decided on, newest last. Read by the audit probe. */
  readonly played: readonly { at: number; cue: string; how: string }[];
  readonly track: string | null;
  readonly scene: Scene;
  readonly voices: number;
}

export class AudioRuntime {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly musicBus: GainNode;
  private readonly sfxBus: GainNode;

  /** Decoded samples, when a build has a licensed pack. Empty otherwise. */
  private readonly samples = new Map<string, AudioBuffer | Promise<AudioBuffer | null> | null>();

  private scene: Scene = 'lobby';
  private current: { track: Track; bed?: Bed; source?: AudioBufferSourceNode; gain: GainNode } | null = null;
  private rotateTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTrackId = '';

  private voices = 0;
  private readonly lastFired = new Map<string, number>();
  private duckUntil = 0;
  private musicLevel = 0.45;

  readonly log: { at: number; cue: string; how: string }[] = [];

  constructor(private readonly base: string) {
    const Ctor = (globalThis as unknown as {
      AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext;
    });
    const Impl = Ctor.AudioContext ?? Ctor.webkitAudioContext;
    if (!Impl) throw new Error('no AudioContext');
    this.ctx = new Impl();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.45;
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.75;
    this.sfxBus.connect(this.master);
  }

  /** The gesture. Safe to call on every click; it is a no-op once running. */
  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch { /* the browser said no */ }
    }
  }

  get running(): boolean { return this.ctx.state === 'running'; }

  setVolumes(music: number, effects: number): void {
    this.musicLevel = music;
    const t = this.ctx.currentTime;
    // Ramped, not set: a slider dragged across its range should not staircase.
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(music, t, 0.05);
    this.sfxBus.gain.cancelScheduledValues(t);
    this.sfxBus.gain.setTargetAtTime(effects, t, 0.05);
  }

  /* ------------------------------------------------------------------ music */

  /**
   * Move the music, or start it.
   *
   * The `this.current` half of the guard is load-bearing and was missing: the
   * runtime is built when sound is turned on, and the scene it is handed is
   * almost always the one it already thinks it is in — the player is in the
   * lobby, and the runtime's initial scene is `lobby`. Comparing scenes alone
   * made that a no-op, so turning sound on and staying put gave silence, and the
   * music only ever appeared on the way to a room. Nothing playing is always a
   * reason to start something.
   */
  setScene(scene: Scene): void {
    const nothingToPlay = PLAYLIST[scene].length === 0 && !(scene === 'table' && MUSIC_CLIPS.length);
    if (scene === this.scene && (this.current || nothingToPlay)) return;
    this.scene = scene;
    this.rotate(true);
  }

  /** Start, or hand over to the next track in the current scene's playlist. */
  private rotate(immediate = false): void {
    if (this.rotateTimer) { clearTimeout(this.rotateTimer); this.rotateTimer = null; }
    const next = this.pickTrack();
    const outgoing = this.current;
    this.current = null;

    const fade = immediate ? CROSSFADE / 2 : CROSSFADE;
    if (outgoing) {
      outgoing.bed?.fadeOut(fade);
      if (outgoing.source) {
        const t = this.ctx.currentTime;
        outgoing.gain.gain.cancelScheduledValues(t);
        outgoing.gain.gain.setValueAtTime(outgoing.gain.gain.value, t);
        outgoing.gain.gain.linearRampToValueAtTime(0, t + fade);
        try { outgoing.source.stop(t + fade + 0.1); } catch { /* already done */ }
      }
      const dying = outgoing;
      setTimeout(() => dying.bed?.stop(), (fade + 0.5) * 1000);
    }

    if (!next) return;
    this.lastTrackId = next.id;
    if (next.kind === 'bed') {
      const bed = new Bed(this.ctx, next.spec);
      const gain = this.ctx.createGain();
      gain.gain.value = 1;
      bed.out.connect(gain).connect(this.musicBus);
      bed.fadeIn(1, fade);
      this.current = { track: next, bed, gain };
      this.rotateTimer = setTimeout(() => this.rotate(), BED_SECONDS * 1000);
    } else {
      void this.startClipTrack(next, fade);
    }
  }

  private async startClipTrack(track: Track & { kind: 'clip' }, fade: number): Promise<void> {
    const buf = await this.sample(track.clip);
    // The scene may have moved on while the fetch was in flight.
    if (!buf || this.lastTrackId !== track.id) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain).connect(this.musicBus);
    const t = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(1, t + fade);
    src.start(t);
    this.current = { track, source: src, gain };
    // Hand over before the end rather than at it, so the tail of one track is
    // still sounding when the next arrives and no seam is ever exposed.
    const runFor = Math.max(fade + 1, buf.duration - CROSSFADE);
    this.rotateTimer = setTimeout(() => this.rotate(), runFor * 1000);
  }

  /** Shuffle, not cycle — but never the same track twice running. */
  private pickTrack(): Track | null {
    const names = PLAYLIST[this.scene];
    if (!names.length) return null;
    const pool: Track[] = [];
    for (const name of names) {
      const spec = BEDS.find((b) => b.name === name);
      if (spec) pool.push({ kind: 'bed', id: `bed:${name}`, spec });
    }
    // A build with a licensed music pack adds it to the table's rotation.
    if (this.scene === 'table') {
      for (const clip of musicClips()) pool.push({ kind: 'clip', id: `clip:${clip.key}`, clip });
    }
    if (!pool.length) return null;
    const fresh = pool.filter((t) => t.id !== this.lastTrackId);
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  /* ---------------------------------------------------------------- effects */

  /** One cue. Returns what it did, which is what the audit reads. */
  fire(cue: Cue): string {
    if (cue.kind === 'music') { this.setScene(cue.scene); return `music:${cue.scene}`; }
    if (cue.kind === 'voice') {
      const takes = takesOf(cue.bank, cue.names.find((n) => takesOf(cue.bank, n).length) ?? '');
      const take = pickTake(takes, cue.index);
      if (take) { void this.playClip(take, 1); return `voice:${take.key}`; }
      return this.fire(cue.then);
    }
    return this.fireSound(cue);
  }

  private fireSound(cue: SoundCue): string {
    const now = Date.now();
    const tag = cue.tag ?? cue.sound;
    const last = this.lastFired.get(tag);
    if (last !== undefined && now - last < DEDUPE_MS) return 'deduped';
    this.lastFired.set(tag, now);
    if (this.voices >= MAX_VOICES) return 'over-budget';

    const seconds = lengthOf(cue);
    if (seconds > 0.9) this.duck(seconds);

    // A licensed clip wins over the patch; there are none in the public build.
    const clip = cue.sample ? clipByKey(cue.sample) : undefined;
    if (clip) { void this.playClip(clip, cue.gain ?? 1); return `clip:${clip.key}`; }

    this.voices += 1;
    setTimeout(() => { this.voices -= 1; }, (seconds + 0.2) * 1000);
    const v: Voice = { ctx: this.ctx, dest: this.sfxBus, at: this.ctx.currentTime, gain: cue.gain ?? 1 };
    playPatch(cue, v);
    return `synth:${cue.sound}${cue.variant ? `/${cue.variant}` : ''}`;
  }

  private async playClip(clip: Clip, gain: number): Promise<void> {
    const buf = await this.sample(clip);
    if (!buf) return;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g).connect(clip.role === 'music' ? this.musicBus : this.sfxBus);
    src.start();
  }

  /**
   * Music stands back while something long is under it.
   *
   * A gong or a death line fighting a pad is two things at once and neither
   * heard. The music comes back on its own; there is no un-duck to forget.
   */
  private duck(seconds: number): void {
    const until = this.ctx.currentTime + seconds + 0.5;
    if (until <= this.duckUntil) return;
    this.duckUntil = until;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(this.musicLevel * 0.35, t, 0.1);
    this.musicBus.gain.setTargetAtTime(this.musicLevel, until, 0.5);
  }

  /** Fetch and decode once. A failure caches as null so it is not retried per cue. */
  private sample(clip: Clip): Promise<AudioBuffer | null> {
    const hit = this.samples.get(clip.key);
    if (hit instanceof Promise) return hit;
    if (hit !== undefined) return Promise.resolve(hit);
    const p = fetch(`${this.base}audio/${clip.file}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => this.ctx.decodeAudioData(b))
      .then((buf) => { this.samples.set(clip.key, buf); return buf; })
      .catch(() => { this.samples.set(clip.key, null); return null; });
    this.samples.set(clip.key, p);
    return p;
  }

  report(): RuntimeReport {
    return {
      played: this.log.slice(-200),
      track: this.current?.track.id ?? null,
      scene: this.scene,
      voices: this.voices,
    };
  }

  /** Everything released. The context is closed; a new one is cheap. */
  dispose(): void {
    if (this.rotateTimer) clearTimeout(this.rotateTimer);
    this.current?.bed?.stop();
    try { this.current?.source?.stop(); } catch { /* already stopped */ }
    this.current = null;
    void this.ctx.close().catch(() => {});
  }
}

/**
 * Music the build has a licence for. Empty in the public build by design, so
 * the table's rotation is the three generated beds and nothing is fetched.
 */
const MUSIC_CLIPS: readonly Clip[] = CLIPS.filter((c) => c.role === 'music');

function musicClips(): readonly Clip[] {
  return MUSIC_CLIPS;
}
