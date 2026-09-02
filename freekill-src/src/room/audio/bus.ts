/**
 * The one thing that hears the game.
 *
 * A singleton, because there is one pair of speakers however many rooms a tab
 * has mounted, and because the music has to survive the room unmounting — going
 * back to the lobby is a change of scene, not a stop.
 *
 * WHERE IT GETS THE GAME FROM. `RoomStore.onSound` — the hook the store has
 * carried since it was written, called with every `LogEvent` (`state/store.ts:84`,
 * fired at `:573`). `attach(store)` is that hook plus the lookups a cue needs
 * from live state: which general is on a seat that just died, which general and
 * role the viewer is playing, and which generals are seated at all.
 * `notify(command, data)` is the rest of the stream, and it deliberately ignores
 * `LogEvent` so nothing can arrive twice.
 *
 * WHY THE RUNTIME IS BEHIND A DYNAMIC IMPORT. Everything that makes noise — the
 * mixer, the synthesiser, the generative beds, the 39 kB index of the voice
 * bank — is loaded the first time the player turns sound on and never before. A
 * visitor who leaves it off pays for this file and nothing else, and the
 * first-paint bundle does not grow by a byte of the 41.5 MB pack.
 *
 * THREE THINGS THIS FILE KNOWS THAT `cues.ts` CANNOT.
 *
 *   who is seated   so a general's whole repertoire can be fetched before they
 *                   use it. A line that crosses the network when its cue
 *                   arrives is a line that lands after its animation.
 *   what rank a     `PlaySkillSound` does not say whether a skill is 锁定技;
 *   skill has       `Animate{InvokeSkill}` does, since `lua/web/skillwire.lua`
 *                   started stamping `compulsory` on it, and `events/skill.lua`
 *                   sends the two back to back. Remembered here, read by the
 *                   next cue.
 *   whether this    a remount replays every retained `LogEvent` into this bus in
 *   is a replay     one synchronous burst. Without a guard that is a game's
 *                   worth of sound in a tick.
 *
 * THE LOG IS NOT DEBUGGING FURNITURE. `window.__fkAudio` records what every cue
 * decided, including the ones that decided to stay silent. Headless Chrome has
 * no audio device, so this is the only way to prove against a real game that
 * the mapping fires on the right events with the right resolution — which is
 * the part that can actually be wrong.
 */
import { cueFor, type Cue, type CueContext, type Scene, type VoiceRank } from './cues';
import { DEFAULT_SETTINGS, readSettings, writeSettings, type AudioSettings } from './settings';
import type { AudioRuntime } from './runtime';

/**
 * What `attach` needs, described structurally rather than imported.
 *
 * `RoomStore` satisfies this and TypeScript checks that it does at the call
 * site, but naming the class here would pull the room's whole state machine
 * into whatever chunk this file lands in. The room's public surface is
 * `RoomViewProps`; this is a keyhole, not a second one.
 */
export interface SoundSource {
  onSound?: (payload: unknown) => void;
  readonly state: {
    readonly selfId: number | null;
    readonly players: Readonly<Record<number, { readonly general: string; readonly role: string }>>;
  };
}

export interface AudioStatus {
  readonly settings: AudioSettings;
  readonly scene: Scene;
  /** True once a context exists and the browser has let it run. */
  readonly running: boolean;
  /** The rotation's current track, `bed:march` or `clip:<key>`. */
  readonly track: string | null;
}

const MAX_LOG = 300;

/**
 * The replay guard.
 *
 * `RoomView` subscribes to `onNotifyUI` and the client hands a new subscriber
 * everything it has retained, which on a remount mid-game is two thousand
 * messages in one synchronous tick. The animation lane has `anim.replaying` for
 * exactly this; this bus has no such flag and cannot be given one without a
 * change in a file this lane does not own. So it recognises the shape instead:
 * real play never produces this many sound-bearing messages this close together,
 * because the engine paces at 800 ms and even unpaced it yields to the event
 * loop between beats.
 */
const FLOOD_WINDOW_MS = 220;
const FLOOD_LIMIT = 24;

export class RoomAudio {
  private settings: AudioSettings = DEFAULT_SETTINGS;
  private runtime: AudioRuntime | null = null;
  private loading: Promise<AudioRuntime | null> | null = null;
  private source: SoundSource | null = null;
  private scene: Scene = 'lobby';
  private readonly listeners = new Set<() => void>();
  private gestureOff: (() => void) | null = null;
  /** Rebuilt only when something changed. See `status()`. */
  private snapshot: AudioStatus;

  /** 锁定技 / 限定技, learned off `Animate{InvokeSkill}`. */
  private readonly ranks = new Map<string, VoiceRank>();
  /** Generals already handed to the runtime for prefetching. */
  private readonly seated = new Set<string>();
  private lastSeatScan = 0;

  private burst: number[] = [];
  private flooding = false;

  /** What every cue decided, newest last. Capped; this runs for hours. */
  readonly log: { at: number; command: string; cue: string; how: string }[] = [];

  constructor(private readonly base = '/') {
    this.settings = readSettings();
    this.snapshot = this.live();
  }

  /* -------------------------------------------------------------- settings */

  get(): AudioSettings { return this.settings; }

  /**
   * The snapshot React subscribes to. Cached, and that is not an optimisation.
   *
   * `useSyncExternalStore` compares snapshots with `Object.is`, so a getter that
   * builds a fresh object every call reports "changed" on every render and the
   * component re-renders forever — React error #185, and a white page. Building
   * the object once per actual change is what makes the comparison mean
   * anything. `live()` is the uncached read for anything that is not React.
   */
  status(): AudioStatus { return this.snapshot; }

  /** Fresh, including what the rotation is doing right now. Not for React. */
  live(): AudioStatus {
    return {
      settings: this.settings,
      scene: this.scene,
      running: this.runtime?.running ?? false,
      track: this.runtime?.report().track ?? null,
    };
  }

  /** What the mixer is holding and doing. Null until sound has been turned on. */
  mixerReport(): ReturnType<AudioRuntime['report']> | null {
    return this.runtime?.report() ?? null;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  private publish(): void {
    this.snapshot = this.live();
    for (const fn of this.listeners) fn();
  }

  set(patch: Partial<AudioSettings>): void {
    const next = { ...this.settings, ...patch };
    const wasEnabled = this.settings.enabled;
    this.settings = next;
    writeSettings(next);
    if (next.enabled && !wasEnabled) void this.start();
    else if (!next.enabled && wasEnabled) this.stop();
    else this.runtime?.setVolumes(next.music, next.effects, next.voice);
    this.publish();
  }

  /* ----------------------------------------------------------- starting up */

  /**
   * Arm the first gesture.
   *
   * Called once at mount. If the player turned sound on during an earlier visit
   * this is what makes it come back without asking again — and it still waits
   * for a real gesture, because that is what the browser wants and, more to the
   * point, what a person opening a link wants. `once` on all three, so nothing
   * stays hooked to the document after it has done its job.
   */
  arm(): () => void {
    if (typeof document === 'undefined') return () => {};
    const fire = () => { if (this.settings.enabled) void this.start(); };
    const opts = { once: true, passive: true } as const;
    document.addEventListener('pointerdown', fire, opts);
    document.addEventListener('keydown', fire, opts);
    document.addEventListener('touchstart', fire, opts);
    this.gestureOff = () => {
      document.removeEventListener('pointerdown', fire);
      document.removeEventListener('keydown', fire);
      document.removeEventListener('touchstart', fire);
    };
    return this.gestureOff;
  }

  /** Build the runtime if it is wanted and not already there, and resume it. */
  async start(): Promise<void> {
    if (!this.settings.enabled) return;
    const rt = await this.load();
    if (!rt) return;
    rt.setVolumes(this.settings.music, this.settings.effects, this.settings.voice);
    await rt.resume();
    rt.setScene(this.scene);
    // The index, and the table's own chrome. Everything else waits for a seat
    // or a cue. See `runtime.loadBank`.
    void rt.loadBank().then(() => {
      this.seated.clear();
      this.scanSeats(true);
      this.publish();
    });
    this.publish();
  }

  private load(): Promise<AudioRuntime | null> {
    if (this.runtime) return Promise.resolve(this.runtime);
    if (this.loading) return this.loading;
    this.loading = import('./runtime')
      .then(({ AudioRuntime }) => {
        const rt = new AudioRuntime(this.base);
        this.runtime = rt;
        return rt;
      })
      .catch(() => {
        // No `AudioContext`, or the chunk failed to load. The game is silent
        // and entirely playable; it is not an error to show anybody.
        this.loading = null;
        return null;
      });
    return this.loading;
  }

  private stop(): void {
    this.gestureOff?.();
    this.gestureOff = null;
    this.runtime?.dispose();
    this.runtime = null;
    this.loading = null;
    this.seated.clear();
  }

  /* ---------------------------------------------------------------- intake */

  /**
   * The store's `onSound` hook plus the state lookups a cue can need.
   * Returns the detach, which is what a React effect wants.
   */
  attach(source: SoundSource): () => void {
    this.source = source;
    source.onSound = (payload: unknown) => this.deliver('LogEvent', payload);
    return () => {
      if (source.onSound) source.onSound = undefined;
      if (this.source === source) this.source = null;
    };
  }

  /**
   * The rest of the notify stream.
   *
   * `LogEvent` is deliberately not handled here: it arrives through `onSound`,
   * and a message that made two sounds would be a bug nobody could see in a
   * screenshot.
   */
  notify(command: string, data: unknown): void {
    if (command === 'LogEvent') return;
    // `Animate` is the only place a skill's tags reach the client, and it lands
    // in the same flush as the `PlaySkillSound` it belongs to.
    if (command === 'Animate') this.rememberRank(data);
    if (command === 'StartGame' || command === 'ArrangeSeats') this.scanSeats(true);
    this.deliver(command, data);
  }

  /**
   * `Animate{InvokeSkill|InvokeUltSkill}` carries `compulsory`.
   *
   * `lua/web/skillwire.lua:49` stamps it on the way out of `doAnimate`, and
   * `events/skill.lua:81-82` sends `broadcastSkillInvoke` and
   * `notifySkillInvoked` one after the other with nothing in between, so the
   * rank of a skill is known before its own line is due — its cue is scheduled
   * 60 ms out — and certainly before the second time it fires.
   */
  private rememberRank(data: unknown): void {
    const d = (data ?? {}) as { type?: unknown; name?: unknown; compulsory?: unknown };
    const type = typeof d.type === 'string' ? d.type : '';
    if (type !== 'InvokeSkill' && type !== 'InvokeUltSkill') return;
    const name = typeof d.name === 'string' ? d.name : '';
    if (!name) return;
    // A limited skill stops the room for two seconds (`room.lua:609`); it gets
    // the channel over anything short of a death.
    this.ranks.set(name, type === 'InvokeUltSkill' ? 'ult' : d.compulsory === true ? 'compulsory' : 'skill');
  }

  /**
   * Hand the runtime any general that has appeared at a seat.
   *
   * Throttled, because it runs off the notify stream and a game is two thousand
   * messages: the seats change a handful of times and the rest of the scans are
   * a string compare on eight entries.
   */
  private scanSeats(force = false): void {
    const rt = this.runtime;
    const src = this.source;
    if (!rt || !src) return;
    const now = Date.now();
    if (!force && now - this.lastSeatScan < 400) return;
    this.lastSeatScan = now;
    for (const p of Object.values(src.state.players)) {
      const g = p?.general;
      if (g && !this.seated.has(g)) {
        this.seated.add(g);
        rt.warmGeneral(g);
      }
    }
  }

  /** Move the music without an engine event — the route changing, mostly. */
  setScene(scene: Scene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    this.runtime?.setScene(scene);
    this.publish();
  }

  private deliver(command: string, data: unknown): void {
    let cues: readonly Cue[];
    try {
      cues = cueFor(command, data, this.context());
    } catch {
      // A payload shaped unlike anything expected is silence, never a throw:
      // this runs inside the room's notify handler.
      return;
    }
    if (!cues.length) { this.scanSeats(); return; }
    const flooding = this.floodCheck(cues.length);
    for (const cue of cues) this.fire(command, cue, flooding);
    this.scanSeats();
  }

  /**
   * True while a burst is arriving that no real game could produce.
   *
   * Music cues still pass — the scene must be right whatever happened — and the
   * burst is logged so a run that hits this is visible rather than mysterious.
   */
  private floodCheck(n: number): boolean {
    const now = Date.now();
    for (let i = 0; i < n; i += 1) this.burst.push(now);
    const cut = now - FLOOD_WINDOW_MS;
    while (this.burst.length && this.burst[0] < cut) this.burst.shift();
    const over = this.burst.length > FLOOD_LIMIT;
    if (over && !this.flooding) this.flooding = true;
    else if (!over && this.flooding) this.flooding = false;
    return over;
  }

  private fire(command: string, cue: Cue, flooding: boolean): void {
    let how = 'off';
    if (cue.kind === 'music') {
      // The music follows the game whether or not anyone can hear it, so that
      // turning sound on mid-game starts the right bed rather than the lobby's.
      this.setScene(cue.scene);
      how = `music:${cue.scene}`;
    } else if (flooding) {
      how = 'replay';
    } else if (cue.kind === 'voice' && this.settings.voice <= 0) {
      how = this.runtime ? this.runtime.fire(cue.then) : 'off';
    } else if (this.runtime) {
      how = this.runtime.fire(cue);
    }
    this.note(command, cue, how);
  }

  private note(command: string, cue: Cue, how: string): void {
    const name = cue.kind === 'sound'
      ? `${cue.sound}${cue.variant ? `/${cue.variant}` : ''}${cue.heavy ? '+' : ''}`
      : cue.kind === 'voice' ? `voice/${cue.bank}`
        : cue.kind === 'theme' ? `theme/${cue.theme}`
          : `music/${cue.scene}`;
    this.log.push({ at: Date.now(), command, cue: name, how });
    if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
  }

  private context(): CueContext {
    const src = this.source;
    const mine = () => {
      const id = src?.state.selfId;
      return id == null ? undefined : src?.state.players[id];
    };
    return {
      general: (pid) => src?.state.players[pid]?.general ?? '',
      myRole: () => mine()?.role ?? '',
      myGeneral: () => mine()?.general ?? '',
      skillRank: (skill) => this.ranks.get(skill) ?? 'skill',
    };
  }
}

/**
 * The instance the app uses.
 *
 * `BASE_URL` because the site is served from `/freekill/` on Pages and from `/`
 * everywhere else, and every clip is fetched relative to it.
 */
const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export const roomAudio = new RoomAudio(BASE);

/**
 * The audit's window on all this.
 *
 * `scripts/audit/probe.mjs` cannot hear anything — headless Chrome is launched
 * with `--mute-audio --disable-audio-output` — so what it checks is that the
 * right cue was derived from the right message and resolved the right way:
 * `voice:audio/skill/fankui1` and `synth:skill` are different outcomes, and the
 * difference between them is the whole of this lane's work.
 */
if (typeof window !== 'undefined') {
  (window as unknown as { __fkAudio: unknown }).__fkAudio = {
    v: 2,
    status: () => roomAudio.live(),
    log: () => roomAudio.log.slice(),
    /** The mixer's own view: the pack it loaded, what it is holding, who is
     *  talking, and the lines that landed late enough to be resolved after the
     *  cue that asked for them had already been logged. */
    mixer: () => roomAudio.mixerReport(),
    /** Counts by cue name — the shape an assertion actually wants. */
    tally: () => {
      const out: Record<string, number> = {};
      for (const row of roomAudio.log) out[row.cue] = (out[row.cue] ?? 0) + 1;
      return out;
    },
    /** Counts by how the cue resolved, collapsed to its kind. */
    resolution: () => {
      const out: Record<string, number> = {};
      for (const row of roomAudio.log) {
        const kind = row.how.split(':')[0];
        out[kind] = (out[kind] ?? 0) + 1;
      }
      return out;
    },
    /** Every distinct recording this session actually played. */
    clips: () => {
      const out = new Set<string>();
      for (const row of roomAudio.log) {
        const m = /^(?:clip|voice|voice-late):(.+)$/.exec(row.how);
        if (m) out.add(m[1]);
      }
      return [...out].sort();
    },
  };
}
