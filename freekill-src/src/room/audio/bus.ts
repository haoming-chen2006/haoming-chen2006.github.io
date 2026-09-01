/**
 * The one thing that hears the game.
 *
 * A singleton, because there is one pair of speakers however many rooms a tab
 * has mounted, and because the music has to survive the room unmounting — going
 * back to the lobby is a change of scene, not a stop.
 *
 * WHERE IT GETS THE GAME FROM. `RoomStore.onSound` — the hook the store has
 * carried since it was written, called with every `LogEvent` and listened to by
 * nothing until now (`state/store.ts:84`, fired at `:565`). `attach(store)` is
 * that hook plus the two lookups a cue occasionally needs from live state: which
 * general is on a seat that just died, and which role the viewer is playing when
 * the game ends. `notify(command, data)` is the rest of the stream, and it
 * deliberately ignores `LogEvent` so nothing can arrive twice.
 *
 * WHY THE RUNTIME IS BEHIND A DYNAMIC IMPORT. Everything that makes noise — the
 * mixer, the synthesiser, the generative beds — is loaded the first time the
 * player turns sound on and never before. A visitor who leaves it off pays for
 * this file and nothing else, and the first-paint bundle does not grow.
 *
 * THE LOG IS NOT DEBUGGING FURNITURE. `window.__fkAudio` records what every cue
 * decided, including the ones that decided to stay silent. Headless Chrome has
 * no audio device, so this is the only way to prove against a real game that
 * the mapping fires on the right events — which is the difference between
 * shipping sound and shipping a sound-shaped module.
 */
import {
  cueFor, type Cue, type CueContext, type Scene,
} from './cues';
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
    else this.runtime?.setVolumes(next.music, next.effects);
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
    rt.setVolumes(this.settings.music, this.settings.effects);
    await rt.resume();
    rt.setScene(this.scene);
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
  }

  /* ---------------------------------------------------------------- intake */

  /**
   * The store's `onSound` hook plus the two state lookups a cue can need.
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
    this.deliver(command, data);
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
    for (const cue of cues) this.fire(command, cue);
  }

  private fire(command: string, cue: Cue): void {
    let how = 'off';
    if (cue.kind === 'music') {
      // The music follows the game whether or not anyone can hear it, so that
      // turning sound on mid-game starts the right bed rather than the lobby's.
      this.setScene(cue.scene);
      how = `music:${cue.scene}`;
    } else if (cue.kind === 'voice' && !this.settings.voice) {
      how = this.runtime ? this.runtime.fire(cue.then) : 'off';
    } else if (this.runtime) {
      how = this.runtime.fire(cue);
    }
    this.note(command, cue, how);
  }

  private note(command: string, cue: Cue, how: string): void {
    const name = cue.kind === 'sound'
      ? `${cue.sound}${cue.variant ? `/${cue.variant}` : ''}${cue.heavy ? '+' : ''}`
      : cue.kind === 'voice' ? `voice/${cue.bank}` : `music/${cue.scene}`;
    this.log.push({ at: Date.now(), command, cue: name, how });
    if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
  }

  private context(): CueContext {
    const src = this.source;
    return {
      general: (pid) => src?.state.players[pid]?.general ?? '',
      myRole: () => {
        const id = src?.state.selfId;
        return id == null ? '' : src?.state.players[id]?.role ?? '';
      },
    };
  }
}

/**
 * The instance the app uses.
 *
 * `BASE_URL` because the site is served from `/freekill/` on Pages and from `/`
 * everywhere else, and a licensed pack's clips are fetched relative to it.
 */
const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export const roomAudio = new RoomAudio(BASE);

/**
 * The audit's window on all this.
 *
 * `scripts/audit/probe.mjs` cannot hear anything — headless Chrome has no audio
 * device and the autoplay policy would stop it anyway — so what it checks is
 * that the right cue was derived from the right message at the right moment.
 * That is the part that can actually be wrong.
 */
if (typeof window !== 'undefined') {
  (window as unknown as { __fkAudio: unknown }).__fkAudio = {
    v: 1,
    status: () => roomAudio.live(),
    log: () => roomAudio.log.slice(),
    /** Counts by cue name — the shape an assertion actually wants. */
    tally: () => {
      const out: Record<string, number> = {};
      for (const row of roomAudio.log) out[row.cue] = (out[row.cue] ?? 0) + 1;
      return out;
    },
  };
}
