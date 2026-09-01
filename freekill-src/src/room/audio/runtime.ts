/**
 * The mixer, the cache, and the rule that only one person speaks at a time.
 *
 * FOUR BUSES AND TWO DUCKS.
 *
 *   master ─┬─ musicDuck ── musicBus ── the bed, or the game's own bgm
 *           ├─ sfxDuck  ── sfxBus   ── everything the table does
 *           └─            voiceBus  ── generals, and people saying card names
 *
 * The ducks are separate nodes from the faders on purpose. The first version of
 * this file ducked by writing to `musicBus.gain` and restoring it to the
 * remembered fader level, which meant a slider dragged while a gong was ringing
 * either lost its move or cancelled the duck. A gain the player owns and a gain
 * the mixer owns are two gains.
 *
 * ONLY ONE GENERAL TALKS. Two seats speaking over each other is the ugliest
 * thing this lane can do, and it is not hypothetical: a chain of triggered
 * skills round a table fires four `PlaySkillSound` inside one flush. So there
 * is a channel, it holds one line, and `cues.ts`'s rank ladder decides who wins
 * — a death over a limited skill over a 锁定技 over an ordinary one. A line that
 * loses is *dropped*, not queued, unless the one talking is nearly finished:
 * queueing produces the failure the brief names, a line arriving after the
 * moment that caused it, which is worse than silence. The one exception is a
 * queue of depth one with a deadline, so that two skills 200 ms apart both get
 * heard and neither is heard late.
 *
 * Card lines have their own channel. They are half a second long, they belong
 * to the card rather than to the speaker, and a 杀 called during a skill line
 * should duck under it rather than kill it.
 *
 * TWO CACHES, BECAUSE THE TWO COSTS ARE DIFFERENT. A four-second line is 20 kB
 * on the wire and 800 kB decoded — `decodeAudioData` resamples to the context's
 * rate and hands back float32. Keeping 200 decoded lines resident would be
 * 160 MB for a browser tab. Keeping 200 *encoded* lines is 4 MB. So the encoded
 * bytes are held generously and the decoded frames are held on a byte-budgeted
 * LRU, split so that a burst of four-second barks cannot evict the card thwack
 * that fires forty times a game.
 *
 * NOTHING IS FETCHED LATE IF IT CAN BE FETCHED EARLY. A recording that has to
 * cross the network when its cue arrives is a recording that lands after its
 * animation. Two prefetches prevent it: the table's own chrome when sound is
 * turned on, and a general's entire spoken repertoire the moment they take a
 * seat — every take of every skill they have, plus their death and victory
 * lines, which for a full eight-seat table is about 700 kB. What is not warm
 * still plays, under a quiet accent, if it arrives inside the grace window.
 */
import { Bank } from './bank';
import { BEDS, Bed, type BedSpec } from './generative';
import { pickTake, type Clip } from './clips';
import { RANK_ORDER, type Beatmark, type Cue, type Scene, type SoundCue, type VoiceCue } from './cues';
import { lengthOf, play as playPatch, type Voice } from './sfx';
import { speak, utteranceSeconds } from './voicebox';
import { SLAY_PHASE, beatMs } from '../components/anim/spectacle/budget';

/** Seconds of overlap when one track hands over to the next. Never a cut. */
const CROSSFADE = 4;
/** How long a generated bed runs before the rotation moves on. */
const BED_SECONDS = 165;
/** One-shots alive at once. Past this the newest is dropped: the ear cannot
 *  hear a twelfth simultaneous impact and the bus can certainly clip on one. */
const MAX_VOICES = 10;
/** Two identical cues closer than this are one cue. The engine sends bursts. */
const DEDUPE_MS = 45;

/**
 * How late a recording may arrive and still be played.
 *
 * Past this the moment has gone and the line is dropped — kept in the cache, so
 * the next time that general uses that skill it is instant. 260 ms is inside
 * the 620 ms a skill banner is on screen at the default pace, which is the
 * thing the line must not outlive.
 */
const VOICE_GRACE_MS = 260;
/** A line may wait this long behind another before it is stale. */
const VOICE_QUEUE_MS = 620;
/** A losing line waits rather than dies if the winner is this close to done. */
const NEARLY_DONE = 0.22;
/** How long a cut line takes to get out of the way. Long enough not to click. */
const CUT_FADE = 0.07;

/** Decoded frames held for short things — card calls, hits, the chain. */
const SHORT_CACHE_BYTES = 6 << 20;
/** Decoded frames held for lines. Roughly 25 four-second takes. */
const VOICE_CACHE_BYTES = 20 << 20;
/** Compressed bytes held. ~1000 clips; a whole game touches a fraction. */
const ENCODED_CACHE_BYTES = 12 << 20;
/** Prefetches in flight. Enough to warm a seat quickly, few enough to stay out
 *  of the way of the Lua bundle and the portraits. */
const PREFETCH_WIDTH = 3;

/** Relative level per role, which is the mix. Tuned here, not baked into files. */
const LEVEL: Readonly<Record<Clip['role'], number>> = {
  music: 1, sfx: 0.85, line: 0.8, voice: 1,
};

type Track =
  | { readonly kind: 'bed'; readonly id: string; readonly spec: BedSpec }
  | { readonly kind: 'clip'; readonly id: string; readonly clip: Clip };

/**
 * The synthesised beds, per scene — the FALLBACK, not the rotation.
 *
 * These were written for a build that shipped no audio at all, and for that
 * build they were the whole answer. Now that the pack is here they only play
 * where the recording cannot: no pack, or the music fader at zero.
 * `pickTrack` reaches for `bgm()` first.
 */
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
  /** What the pack turned out to hold, once its index landed. */
  readonly bank: Readonly<Record<string, number>> | null;
  /** Bytes held, so a long session can be shown not to grow without bound. */
  readonly cache: { readonly encoded: number; readonly decoded: number; readonly clips: number };
  /** Who is talking, if anyone. */
  readonly speaking: string | null;
}

/* ------------------------------------------------------------------ caches */

/** Least-recently-used, by bytes. Small enough to read, which is the point. */
class Lru<V> {
  private readonly map = new Map<string, { v: V; n: number }>();
  private used = 0;

  constructor(private readonly budget: number) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    // Re-insert to move it to the young end. `Map` iterates in insertion order,
    // which is the whole implementation of "least recently used" here.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.v;
  }

  has(key: string): boolean { return this.map.has(key); }

  put(key: string, v: V, n: number): void {
    const old = this.map.get(key);
    if (old) { this.used -= old.n; this.map.delete(key); }
    this.map.set(key, { v, n });
    this.used += n;
    for (const [k, e] of this.map) {
      if (this.used <= this.budget) break;
      if (k === key) continue;
      this.map.delete(k);
      this.used -= e.n;
    }
  }

  get bytes(): number { return this.used; }
  get size(): number { return this.map.size; }
}

/* --------------------------------------------------------------- channels */

/** One line, being spoken. */
interface Speaking {
  readonly rank: number;
  readonly key: string;
  /** Context time it finishes. */
  readonly endsAt: number;
  readonly gain: GainNode;
  readonly src: AudioBufferSourceNode | null;
}

export class AudioRuntime {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly musicBus: GainNode;
  private readonly musicDuck: GainNode;
  private readonly sfxBus: GainNode;
  private readonly sfxDuck: GainNode;
  private readonly voiceBus: GainNode;

  private bank: Bank | null = null;
  private banking: Promise<Bank | null> | null = null;

  private readonly encoded = new Lru<ArrayBuffer>(ENCODED_CACHE_BYTES);
  private readonly shortFrames = new Lru<AudioBuffer>(SHORT_CACHE_BYTES);
  private readonly voiceFrames = new Lru<AudioBuffer>(VOICE_CACHE_BYTES);
  private readonly inFlight = new Map<string, Promise<AudioBuffer | null>>();
  private readonly failed = new Set<string>();
  /** The one music buffer, held outside every budget: it is 20 MB decoded. */
  private music: { key: string; buf: AudioBuffer } | null = null;

  private scene: Scene = 'lobby';
  private current: { track: Track; bed?: Bed; source?: AudioBufferSourceNode; gain: GainNode } | null = null;
  private rotateTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTrackId = '';

  private voices = 0;
  private readonly lastFired = new Map<string, number>();
  private duckUntil = 0;
  private musicLevel = 0.45;
  private voiceLevel = 0.9;

  private bark: Speaking | null = null;
  private call: Speaking | null = null;
  private queued: { cue: VoiceCue; deadline: number } | null = null;
  private queueTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly warmed = new Set<string>();
  private prefetching = 0;
  private readonly prefetchQueue: Clip[] = [];

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

    this.musicDuck = this.ctx.createGain();
    this.musicDuck.gain.value = 1;
    this.musicDuck.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.45;
    this.musicBus.connect(this.musicDuck);

    this.sfxDuck = this.ctx.createGain();
    this.sfxDuck.gain.value = 1;
    this.sfxDuck.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.75;
    this.sfxBus.connect(this.sfxDuck);

    this.voiceBus = this.ctx.createGain();
    this.voiceBus.gain.value = 0.9;
    this.voiceBus.connect(this.master);
  }

  /** The gesture. Safe to call on every click; it is a no-op once running. */
  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch { /* the browser said no */ }
    }
  }

  get running(): boolean { return this.ctx.state === 'running'; }

  setVolumes(music: number, effects: number, voice: number): void {
    this.musicLevel = music;
    this.voiceLevel = voice;
    const t = this.ctx.currentTime;
    // Ramped, not set: a slider dragged across its range should not staircase.
    for (const [node, v] of [[this.musicBus, music], [this.sfxBus, effects], [this.voiceBus, voice]] as const) {
      node.gain.cancelScheduledValues(t);
      node.gain.setTargetAtTime(v, t, 0.05);
    }
  }

  /* --------------------------------------------------------------- the pack */

  /**
   * Pull the index, then warm the table's own chrome.
   *
   * Called once, when sound is turned on. Everything after this is per-clip and
   * on demand; this is the only eager fetch in the lane and it is 39 kB of JSON
   * plus about 420 kB of the sounds a table makes constantly — a hit in four
   * elements, hp loss, the chain, the draw riffle, the three noises a piece of
   * equipment makes going on. Those cannot be predicted from a seat and arriving
   * 200 ms after the card is worse than not arriving.
   */
  loadBank(): Promise<Bank | null> {
    if (this.bank) return Promise.resolve(this.bank);
    if (this.banking) return this.banking;
    this.banking = Bank.load(this.base)
      .then((b) => {
        this.bank = b;
        if (b) this.prefetch(b.warm());
        // The index arrives after the first `setScene` — sound is turned on,
        // music starts, and only then does the pack land. Without this the
        // opening bed held the channel until its own rotation came round
        // minutes later, so "the music" was a generated bed for most of a
        // session even though the recording was already downloaded. Hand over
        // as soon as there is something real to hand over to; `rotate`
        // crossfades, so it is a change of music rather than a cut.
        if (b && this.current?.track.kind === 'bed' && this.bgm()) this.rotate(true);
        return b;
      })
      .catch(() => null);
    return this.banking;
  }

  /**
   * Warm everything one general will ever say.
   *
   * Called when a seat's general becomes known, which is well before they use a
   * skill. Every take, not just the first: a two-take skill picks uniformly, so
   * warming only take one would make every other invocation the late one.
   */
  warmGeneral(name: string, gender?: number): void {
    if (!name || this.warmed.has(name)) return;
    this.warmed.add(name);
    const bank = this.bank;
    if (!bank) { void this.loadBank().then(() => { this.warmed.delete(name); this.warmGeneral(name, gender); }); return; }
    this.prefetch(bank.linesFor(name));
    // The card calls are per gender and there are only two sets of fifteen, so
    // one seated woman warms every line a woman will say all game.
    const g = gender ?? bank.general(name).gender;
    if (g === 1 || g === 2) {
      const which = g === 1 ? 'male' : 'female';
      if (!this.warmed.has(`sex:${which}`)) {
        this.warmed.add(`sex:${which}`);
        this.prefetch(bank.cardLines(which));
      }
    }
  }

  private prefetch(clips: readonly Clip[]): void {
    for (const c of clips) {
      if (this.encoded.has(c.key) || this.failed.has(c.key)) continue;
      this.prefetchQueue.push(c);
    }
    this.pumpPrefetch();
  }

  private pumpPrefetch(): void {
    while (this.prefetching < PREFETCH_WIDTH && this.prefetchQueue.length) {
      const clip = this.prefetchQueue.shift()!;
      if (this.encoded.has(clip.key)) continue;
      this.prefetching += 1;
      void this.bytes(clip)
        .catch(() => null)
        .then(() => { this.prefetching -= 1; this.pumpPrefetch(); });
    }
  }

  /* ------------------------------------------------------------------ music */

  /**
   * Move the music, or start it.
   *
   * The `this.current` half of the guard is load-bearing: the runtime is built
   * when sound is turned on, and the scene it is handed is almost always the one
   * it already thinks it is in — the player is in the lobby, and the runtime's
   * initial scene is `lobby`. Comparing scenes alone made that a no-op, so
   * turning sound on and staying put gave silence.
   */
  setScene(scene: Scene): void {
    const nothingToPlay = PLAYLIST[scene].length === 0 && !this.bgm();
    if (scene === this.scene && (this.current || nothingToPlay)) return;
    this.scene = scene;
    // The decoded buffer used to be dropped on leaving the table, because the
    // table was the only scene that played it. It is 20 MB decoded but it is
    // also now the music everywhere, and re-decoding it on every trip between
    // lobby and table is a stall for no gain.
    if (scene === 'over') this.music = null;
    this.rotate(true);
  }

  /** The game's own recording, when the pack has it and the fader is up. */
  private bgm(): Clip | undefined {
    if (this.musicLevel <= 0.02) return undefined;
    if (this.scene === 'over') return undefined;
    return this.bank?.clip('audio/system/bgm');
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
    const buf = await this.musicBuffer(track.clip);
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
    // The soundtrack, wherever there is music at all.
    //
    // This used to be one entry in a pool of three synthesised beds, and only
    // on the table -- so the lobby never played it and the table played it
    // roughly one time in four. Three quarters of what a player heard was a
    // generated bed standing in for a recording that was sitting right there
    // in the pack, which is why the music sounded wrong rather than merely
    // repetitive. The pack ships exactly one track, so this is a loop, and a
    // loop of the real thing is what the game itself plays.
    const clip = this.bgm();
    if (clip) return { kind: 'clip', id: `clip:${clip.key}`, clip };

    const names = PLAYLIST[this.scene];
    const pool: Track[] = [];
    for (const name of names) {
      const spec = BEDS.find((b) => b.name === name);
      if (spec) pool.push({ kind: 'bed', id: `bed:${name}`, spec });
    }
    if (!pool.length) return null;
    const fresh = pool.filter((t) => t.id !== this.lastTrackId);
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  /* -------------------------------------------------------------- the beat */

  /**
   * When a cue wants to be heard, in seconds from now.
   *
   * `cut`, `shatter` and `seal` are the slay animation's own phases, and the
   * arithmetic belongs to the lane that draws it: `beatMs('slay')` is 1750 ms at
   * the default 800 ms pace and 0 at `?pace=0`, which is how a delayed cue
   * collapses to an immediate one when the table is running unpaced under the
   * audit. A literal number stays literal, because the two that use one — a
   * present's arc and the length of the victory fanfare — are not pace-scaled
   * either.
   */
  private atSeconds(at: Beatmark | undefined): number {
    if (at === undefined) return 0;
    if (typeof at === 'number') return Math.max(0, at) / 1000;
    let pace = 0;
    try { pace = beatMs('slay'); } catch { pace = 0; }
    return Math.max(0, Math.round(pace * SLAY_PHASE[at])) / 1000;
  }

  /* ---------------------------------------------------------------- effects */

  /** One cue. Returns what it did, which is what the audit reads. */
  fire(cue: Cue): string {
    if (cue.kind === 'music') { this.setScene(cue.scene); return `music:${cue.scene}`; }
    if (cue.kind === 'voice') return this.fireVoice(cue);
    return this.fireSound(cue);
  }

  private fireSound(cue: SoundCue): string {
    const now = Date.now();
    const tag = cue.tag ?? cue.sound;
    const last = this.lastFired.get(tag);
    if (last !== undefined && now - last < DEDUPE_MS) return 'deduped';
    this.lastFired.set(tag, now);
    if (this.voices >= MAX_VOICES) return 'over-budget';
    if ((cue.gain ?? 1) <= 0) return 'silent';

    const delay = this.atSeconds(cue.at);
    const sample = cue.pick?.length
      ? cue.pick[Math.floor(Math.random() * cue.pick.length)]
      : cue.sample;
    const clip = sample ? this.bank?.clip(sample) : undefined;

    if (clip) {
      const buf = this.frames(clip);
      if (buf) {
        this.playBuffer(clip, buf, cue.gain ?? 1, delay);
        return `clip:${clip.key}`;
      }
      // Not resident. Fetch it for next time and synthesise this one — a card
      // thwack that arrives after the card has landed is not a card thwack.
      void this.load(clip);
      this.synth(cue, delay);
      return `synth-cold:${cue.sound}`;
    }

    this.synth(cue, delay);
    return `synth:${cue.sound}${cue.variant ? `/${cue.variant}` : ''}`;
  }

  private synth(cue: SoundCue, delay: number): void {
    const seconds = lengthOf(cue);
    if (seconds > 0.9) this.duckMusic(seconds + delay);
    this.voices += 1;
    setTimeout(() => { this.voices -= 1; }, (seconds + delay + 0.2) * 1000);
    const v: Voice = {
      ctx: this.ctx, dest: this.sfxBus, at: this.ctx.currentTime + delay, gain: cue.gain ?? 1,
    };
    playPatch(cue, v);
  }

  /**
   * A recorded one-shot: a hit, a chain, a card being named.
   *
   * A card line goes to the voice bus and its own channel, because it is a
   * recording of a person and belongs under a general who is mid-sentence
   * rather than on top of them. Everything else is foley on the effects bus.
   */
  private playBuffer(clip: Clip, buf: AudioBuffer, gain: number, delay: number): void {
    const at = this.ctx.currentTime + delay;
    const g = this.ctx.createGain();
    g.gain.value = gain * LEVEL[clip.role];
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g);

    if (clip.role === 'line') {
      g.connect(this.voiceBus);
      // A new card call replaces the old one: the previous card has resolved,
      // and two overlapping names is nobody saying anything.
      this.cut(this.call, 0.05);
      src.start(at);
      this.call = { rank: 0, key: clip.key, endsAt: at + buf.duration, gain: g, src };
      const mine = this.call;
      setTimeout(() => { if (this.call === mine) this.call = null; }, (delay + buf.duration + 0.05) * 1000);
      return;
    }

    g.connect(clip.role === 'music' ? this.musicBus : this.sfxBus);
    this.voices += 1;
    setTimeout(() => { this.voices -= 1; }, (delay + buf.duration + 0.2) * 1000);
    if (buf.duration > 0.9) this.duckMusic(buf.duration + delay);
    src.start(at);
  }

  /* ------------------------------------------------------------ the channel */

  /**
   * A general speaking.
   *
   * Four outcomes, and which one happens is the whole timing model:
   *
   *   resident   the take is decoded — it plays on the beat, alone.
   *   cold       it is not — a quiet accent plays now and the line follows if it
   *              lands inside 260 ms, which is inside the skill banner.
   *   unrecorded no take exists anywhere for this general and skill — the bell
   *              plays at full, with a synthesised utterance over it, pitched as
   *              this character. 37 skill-general pairs need this.
   *   busy       somebody else is talking and outranks this — dropped, or held
   *              for one beat if they are nearly done.
   */
  private fireVoice(cue: VoiceCue): string {
    const bank = this.bank;
    const name = bank?.resolve(cue.bank, cue.names);
    const delay = this.atSeconds(cue.at);

    if (!bank || !name) return this.standIn(cue, delay);

    const takes = bank.takes(cue.bank, name);
    const clip = pickTake(takes, cue.index);
    if (!clip) return this.standIn(cue, delay);

    const rank = RANK_ORDER[cue.rank];
    const verdict = this.claim(rank, delay + clip.seconds);
    if (verdict === 'drop') return 'voice-busy';
    if (verdict === 'wait') {
      this.enqueue(cue);
      return 'voice-queued';
    }

    const buf = this.frames(clip);
    if (buf) {
      this.startLine(clip, buf, rank, delay);
      return `voice:${clip.key}`;
    }

    // Cold: the recording exists but is not decoded yet, so the line chases in
    // a moment. It used to go out behind a synthesised accent at a third level,
    // on the theory that the moment should not be silent. In a game it is not a
    // footstep in front of a sentence, it is a chime before every single skill
    // — and with the general actually speaking a beat later it reads as a bug,
    // not as punctuation. A skill that has a voice now waits for its voice.
    // `standIn` below still covers the skills nobody recorded, which is the
    // case the accent was really for.
    const sent = this.ctx.currentTime;
    void this.load(clip).then((late) => {
      if (!late) return;
      const lateBy = (this.ctx.currentTime - sent) * 1000;
      if (lateBy > VOICE_GRACE_MS + delay * 1000) { this.note(cue, 'voice-late-drop'); return; }
      if (this.claim(rank, clip.seconds) !== 'play') { this.note(cue, 'voice-busy'); return; }
      this.startLine(clip, late, rank, 0);
      this.note(cue, `voice-late:${clip.key}`);
    });
    return `voice-loading:${clip.key}`;
  }

  /**
   * Nobody recorded this one.
   *
   * The bell at full, and over it a formant utterance built from the general's
   * name and the skill's — see `voicebox.ts` for why this rather than
   * `speechSynthesis`. A cue whose `then` is silent (a victory line) gets
   * nothing: the fanfare already spoke.
   */
  private standIn(cue: VoiceCue, delay: number): string {
    if ((cue.then.gain ?? 1) <= 0) return 'voice-none';
    this.synth(cue.then, delay);
    const gender = this.bank?.general(cue.general).gender ?? 0;
    const kind = cue.bank === 'skill' ? 'skill' : cue.bank === 'death' ? 'death' : 'win';
    const spec = {
      seed: (hash(cue.general) ^ hash(cue.names[cue.names.length - 1] ?? '')) >>> 0,
      gender,
      kind,
      gain: cue.bank === 'death' ? 0.5 : 0.38,
    } as const;
    const seconds = utteranceSeconds(spec);
    const rank = RANK_ORDER[cue.rank];
    if (this.claim(rank, delay + seconds) !== 'play') return 'voice-busy';
    const out = speak({ ctx: this.ctx, dest: this.voiceBus, at: this.ctx.currentTime + delay, gain: spec.gain }, spec);
    this.hold({ rank, key: `synth:${cue.general}`, endsAt: this.ctx.currentTime + delay + seconds, gain: out, src: null });
    return `voice-synth:${cue.general || '?'}`;
  }

  private startLine(clip: Clip, buf: AudioBuffer, rank: number, delay: number): void {
    const at = this.ctx.currentTime + delay;
    const g = this.ctx.createGain();
    g.gain.value = LEVEL.voice;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g).connect(this.voiceBus);
    src.start(at);
    this.hold({ rank, key: clip.key, endsAt: at + buf.duration, gain: g, src });
  }

  /** Take the channel, ducking everything else under it. */
  private hold(next: Speaking): void {
    this.cut(this.bark, CUT_FADE);
    this.bark = next;
    this.duckFor(next.endsAt - this.ctx.currentTime);
    const mine = next;
    const ms = Math.max(0, (next.endsAt - this.ctx.currentTime) * 1000) + 40;
    setTimeout(() => {
      if (this.bark === mine) { this.bark = null; this.serveQueue(); }
    }, ms);
  }

  /**
   * May a line of this rank start, and if not, is it worth waiting?
   *
   * `wait` only when the incumbent is within 220 ms of finishing, which is the
   * difference between two skills reading as a conversation and reading as an
   * interruption.
   */
  private claim(rank: number, _seconds: number): 'play' | 'wait' | 'drop' {
    const held = this.bark;
    if (!held) return 'play';
    const left = held.endsAt - this.ctx.currentTime;
    if (left <= 0.02) return 'play';
    if (rank > held.rank) return 'play';
    if (left <= NEARLY_DONE) return 'wait';
    return 'drop';
  }

  private enqueue(cue: VoiceCue): void {
    const deadline = Date.now() + VOICE_QUEUE_MS;
    if (this.queued && RANK_ORDER[this.queued.cue.rank] >= RANK_ORDER[cue.rank]) return;
    this.queued = { cue, deadline };
    if (this.queueTimer) clearTimeout(this.queueTimer);
    const wait = Math.max(20, (this.bark ? (this.bark.endsAt - this.ctx.currentTime) * 1000 : 0) + 30);
    this.queueTimer = setTimeout(() => this.serveQueue(), wait);
  }

  /** A queued line plays if the channel is free and it has not gone stale. */
  private serveQueue(): void {
    if (this.queueTimer) { clearTimeout(this.queueTimer); this.queueTimer = null; }
    const held = this.queued;
    if (!held) return;
    this.queued = null;
    if (Date.now() > held.deadline) { this.note(held.cue, 'voice-stale'); return; }
    if (this.bark) return;
    // The delay has already been served by the wait; play it now.
    this.note(held.cue, this.fireVoice({ ...held.cue, at: 0 }));
  }

  private cut(who: Speaking | null, fade: number): void {
    if (!who) return;
    const t = this.ctx.currentTime;
    try {
      who.gain.gain.cancelScheduledValues(t);
      who.gain.gain.setValueAtTime(who.gain.gain.value, t);
      who.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
      who.src?.stop(t + fade + 0.02);
    } catch { /* already stopped */ }
    if (this.bark === who) this.bark = null;
    if (this.call === who) this.call = null;
  }

  /* ---------------------------------------------------------------- ducking */

  /**
   * Music stands back while something long is under it.
   *
   * The music comes back on its own; there is no un-duck to forget. On its own
   * node rather than the fader, so a slider moved mid-duck is not fighting it.
   */
  private duckMusic(seconds: number): void {
    const until = this.ctx.currentTime + seconds + 0.5;
    if (until <= this.duckUntil) return;
    this.duckUntil = until;
    const t = this.ctx.currentTime;
    this.musicDuck.gain.cancelScheduledValues(t);
    this.musicDuck.gain.setTargetAtTime(0.35, t, 0.1);
    this.musicDuck.gain.setTargetAtTime(1, until, 0.5);
  }

  /**
   * Somebody is speaking: music well back, table half back.
   *
   * The effects duck is the one that matters. A general's line is two to five
   * seconds long and a table does not stop for it — cards keep landing, hp keeps
   * moving — so the choice is between a line nobody can follow and a table that
   * leans out of the way for a moment. 0.55 is far enough to hear the words and
   * near enough that a hit still reads as a hit.
   */
  private duckFor(seconds: number): void {
    const until = this.ctx.currentTime + Math.max(0.2, seconds) + 0.35;
    if (until > this.duckUntil) {
      this.duckUntil = until;
      const t = this.ctx.currentTime;
      this.musicDuck.gain.cancelScheduledValues(t);
      this.musicDuck.gain.setTargetAtTime(0.22, t, 0.08);
      this.musicDuck.gain.setTargetAtTime(1, until, 0.5);
    }
    const t = this.ctx.currentTime;
    this.sfxDuck.gain.cancelScheduledValues(t);
    this.sfxDuck.gain.setTargetAtTime(0.55, t, 0.06);
    this.sfxDuck.gain.setTargetAtTime(1, until, 0.35);
  }

  /* ----------------------------------------------------------------- bytes */

  /** Decoded frames, if they are resident. Never a fetch; never a decode. */
  private frames(clip: Clip): AudioBuffer | undefined {
    return clip.role === 'voice' ? this.voiceFrames.get(clip.key) : this.shortFrames.get(clip.key);
  }

  private putFrames(clip: Clip, buf: AudioBuffer): void {
    const bytes = buf.length * buf.numberOfChannels * 4;
    if (clip.role === 'voice') this.voiceFrames.put(clip.key, buf, bytes);
    else this.shortFrames.put(clip.key, buf, bytes);
  }

  /**
   * Compressed bytes, fetched once.
   *
   * A failure is remembered so a missing clip is not re-requested on every cue —
   * a skill that fires forty times a game would otherwise be forty 404s.
   */
  private async bytes(clip: Clip): Promise<ArrayBuffer | null> {
    const hit = this.encoded.get(clip.key);
    if (hit) return hit;
    if (this.failed.has(clip.key)) return null;
    try {
      const res = await fetch(clip.url);
      if (!res.ok) throw new Error(String(res.status));
      const buf = await res.arrayBuffer();
      this.encoded.put(clip.key, buf, buf.byteLength);
      return buf;
    } catch {
      this.failed.add(clip.key);
      return null;
    }
  }

  /**
   * Fetch and decode, once, however many cues ask at the same instant.
   *
   * `decodeAudioData` takes ownership of the buffer it is handed — the
   * `ArrayBuffer` is detached and unreadable afterwards — so the cached copy is
   * sliced before decoding. That slice is 20 kB and it is what lets a line be
   * re-decoded after its frames are evicted without going back to the network.
   */
  private load(clip: Clip): Promise<AudioBuffer | null> {
    const resident = this.frames(clip);
    if (resident) return Promise.resolve(resident);
    const flying = this.inFlight.get(clip.key);
    if (flying) return flying;
    const p = this.bytes(clip)
      .then((bytes) => (bytes ? this.ctx.decodeAudioData(bytes.slice(0)) : null))
      .then((buf) => {
        if (buf) this.putFrames(clip, buf);
        return buf;
      })
      .catch(() => {
        this.failed.add(clip.key);
        return null;
      })
      .finally(() => { this.inFlight.delete(clip.key); });
    this.inFlight.set(clip.key, p);
    return p;
  }

  /** The bed, held in its own slot: 110 seconds decoded is 20 MB. */
  private async musicBuffer(clip: Clip): Promise<AudioBuffer | null> {
    if (this.music?.key === clip.key) return this.music.buf;
    const bytes = await this.bytes(clip);
    if (!bytes) return null;
    try {
      const buf = await this.ctx.decodeAudioData(bytes.slice(0));
      this.music = { key: clip.key, buf };
      return buf;
    } catch {
      this.failed.add(clip.key);
      return null;
    }
  }

  /* --------------------------------------------------------------- reporting */

  private note(cue: VoiceCue, how: string): void {
    this.log.push({ at: Date.now(), cue: `voice/${cue.bank}`, how });
    if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
  }

  report(): RuntimeReport {
    return {
      played: this.log.slice(-200),
      track: this.current?.track.id ?? null,
      scene: this.scene,
      voices: this.voices,
      bank: this.bank?.census() ?? null,
      cache: {
        encoded: this.encoded.bytes,
        decoded: this.shortFrames.bytes + this.voiceFrames.bytes,
        clips: this.shortFrames.size + this.voiceFrames.size,
      },
      speaking: this.bark?.key ?? null,
    };
  }

  /** Everything released. The context is closed; a new one is cheap. */
  dispose(): void {
    if (this.rotateTimer) clearTimeout(this.rotateTimer);
    if (this.queueTimer) clearTimeout(this.queueTimer);
    this.current?.bed?.stop();
    try { this.current?.source?.stop(); } catch { /* already stopped */ }
    this.current = null;
    this.music = null;
    void this.ctx.close().catch(() => {});
  }
}

/** FNV-1a, the same one `cues.ts` seeds patches with. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
