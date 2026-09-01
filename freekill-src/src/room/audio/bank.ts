/**
 * What the pack holds, fetched once, when sound is turned on and not before.
 *
 * 41.5 MB of recordings cannot be a module, and neither can a listing of them:
 * a 2,015-row array is 300 kB of JavaScript on the first-paint path for a
 * visitor who may never turn sound on. So the listing is a 39 kB JSON document
 * (12.8 kB over the wire) fetched by the audio runtime — itself behind a
 * dynamic import — and the recordings are fetched one at a time, on first use.
 *
 * IT IS AN EXISTENCE INDEX, NOT A FILE MAP. `build-audio.mjs` writes each clip
 * to the engine's own path with the package stripped, so a clip's URL is a pure
 * function of the key the engine put on the wire:
 *
 *   audio/skill/fankui1   ->  <base>audio/skill/fankui1.mp3?v=<stamp>
 *
 * All this index has to say is *which* names exist and how long each take runs,
 * which is what makes it 39 kB instead of 300. The durations are here rather
 * than read off the decoded buffer because the mixer needs them before the
 * fetch: how long to duck for, whether a line will still be talking when the
 * next beat lands, whether a queued line has already gone stale.
 *
 * THE GENERALS TABLE ANSWERS TWO THINGS NOTHING ELSE CAN.
 *
 *   gender   `PlayerState.gender` exists in the room's types and no
 *            `applyNotify` case ever writes it, so a seat's gender is simply
 *            not on the wire. It is on `overview.json`, which the build reads.
 *   warm set which lines a general will actually reach for, resolved at build
 *            time in `RoomLogic.js:1402`'s order — the general's own take of a
 *            skill if the pack has one, else the shared take. That is exactly
 *            the set worth prefetching when a general takes a seat, and
 *            computing it at runtime would need the skill list, which is
 *            another 30 kB nobody needs.
 *
 * A FAILED LOAD IS A QUIET GAME, NEVER A BROKEN ONE. `load()` resolves to null
 * on any failure — offline, 404, a proxy that rewrote the JSON — and every
 * caller treats a null bank as "no recording for that", which falls through to
 * the synthesised patch that was always there.
 */
import { PACK, roleOf, takeNames, tailOf, type Clip, type VoiceBank } from './clips';

/** Centiseconds in the index; seconds everywhere else. */
const CS = 100;

/** What `index.json` looks like. Validated structurally, never trusted. */
interface RawIndex {
  readonly v?: number;
  readonly stamp?: string;
  /** Everything addressed by path: `system/chain`, `card/male/slash`. */
  readonly files?: Readonly<Record<string, number>>;
  readonly skill?: Readonly<Record<string, number | readonly number[]>>;
  readonly death?: Readonly<Record<string, number | readonly number[]>>;
  readonly win?: Readonly<Record<string, number | readonly number[]>>;
  readonly generals?: Readonly<Record<string, { readonly g?: number; readonly s?: readonly string[] }>>;
}

/** What the runtime knows about a general that the wire never says. */
export interface GeneralVoice {
  /** `General.Male` is 1 and `General.Female` 2; 0 when the pack did not say. */
  readonly gender: number;
  /** The skill lines this general reaches for, in the engine's resolution order. */
  readonly lines: readonly string[];
  readonly death: boolean;
  readonly win: boolean;
}

const EMPTY_VOICE: GeneralVoice = { gender: 0, lines: [], death: false, win: false };

export class Bank {
  private readonly files: Readonly<Record<string, number>>;
  private readonly banks: Readonly<Record<VoiceBank, Readonly<Record<string, number | readonly number[]>>>>;
  private readonly generals: Readonly<Record<string, { g?: number; s?: readonly string[] }>>;

  readonly stamp: string;
  readonly clips: number;

  private constructor(private readonly base: string, raw: RawIndex) {
    this.files = raw.files ?? {};
    this.banks = { skill: raw.skill ?? {}, death: raw.death ?? {}, win: raw.win ?? {} };
    this.generals = raw.generals ?? {};
    this.stamp = typeof raw.stamp === 'string' ? raw.stamp : '';
    let n = Object.keys(this.files).length;
    for (const b of Object.values(this.banks)) {
      for (const v of Object.values(b)) n += typeof v === 'number' ? 1 : v.length;
    }
    this.clips = n;
  }

  /**
   * Fetch and parse the index. Resolves to null rather than throwing.
   *
   * `PACK` is consulted first so a build that shipped nothing never makes the
   * request at all — an empty pack is the supported state, not an error, and it
   * is what `--pack` being absent produces.
   */
  static async load(base: string, fetchImpl: typeof fetch = fetch): Promise<Bank | null> {
    if (!PACK) return null;
    try {
      const res = await fetchImpl(`${base}audio/index.json?v=${PACK.stamp}`);
      if (!res.ok) return null;
      const raw = (await res.json()) as RawIndex;
      if (!raw || typeof raw !== 'object' || raw.v !== PACK.version) return null;
      return new Bank(base, raw);
    } catch {
      return null;
    }
  }

  /** For tests and the dev harness: a bank over a literal index, no network. */
  static of(base: string, raw: RawIndex): Bank {
    return new Bank(base, raw);
  }

  private make(key: string, seconds: number): Clip {
    return {
      key,
      url: `${this.base}${key}.mp3${this.stamp ? `?v=${this.stamp}` : ''}`,
      role: roleOf(key),
      seconds,
    };
  }

  /**
   * A clip the engine named by its whole path — `getAudioByPath`.
   *
   * The path arrives with a package on it and the pack is flat, so the package
   * is dropped before the lookup. That is not a shortcut: `SkinBank` searches
   * every extension for a name it cannot find in the one it was given, so two
   * packages holding one name were always ambiguous upstream too. The build
   * refuses to produce a pack where that could happen.
   */
  clip(key: string): Clip | undefined {
    const tail = tailOf(key);
    const rel = tail.startsWith('audio/') ? tail.slice(6) : tail;
    const cs = this.files[rel];
    if (typeof cs === 'number') return this.make(`audio/${rel}`, cs / CS);
    // A path into one of the named banks: `audio/skill/fankui1` as a path
    // rather than as a line. Rare, but `PlaySound` is a free-form field.
    const m = /^(skill|death|win)\/(.+)$/.exec(rel);
    if (!m) return undefined;
    const takes = this.takes(m[1] as VoiceBank, m[2]);
    return takes.length === 1 ? takes[0] : undefined;
  }

  /** The takes of one line, in order. Empty when the pack has no such line. */
  takes(bank: VoiceBank, name: string): readonly Clip[] {
    const entry = this.banks[bank][name];
    if (entry === undefined) return [];
    const names = takeNames(name, entry);
    const durs = typeof entry === 'number' ? [entry] : entry;
    return names.map((n, i) => this.make(`audio/${bank}/${n}`, (durs[i] ?? durs[0]) / CS));
  }

  /** True if the line exists, without building any `Clip`. */
  has(bank: VoiceBank, name: string): boolean {
    return this.banks[bank][name] !== undefined;
  }

  /**
   * The first name in `names` the pack can actually speak.
   *
   * `RoomLogic.js:1402` is the order: the main general's own take of the skill,
   * then the deputy's, then the shared one. `serverplayer.lua:465` is what
   * sends all three, which is why no call into the Lua VM is needed here.
   */
  resolve(bank: VoiceBank, names: readonly string[]): string | undefined {
    for (const n of names) if (n && this.has(bank, n)) return n;
    return undefined;
  }

  general(name: string): GeneralVoice {
    const g = this.generals[name];
    if (!g) return EMPTY_VOICE;
    return {
      gender: Number(g.g) || 0,
      lines: g.s ?? [],
      death: this.has('death', name),
      win: this.has('win', name),
    };
  }

  /**
   * Everything a general might say, for warming a seat.
   *
   * Every take of every line, not just the first: a two-take skill picks
   * uniformly, so warming take one and not take two would make every other
   * invocation the late one, which is the failure mode this exists to avoid.
   */
  linesFor(name: string): readonly Clip[] {
    const g = this.general(name);
    const out: Clip[] = [];
    for (const line of g.lines) out.push(...this.takes('skill', line));
    out.push(...this.takes('death', name));
    out.push(...this.takes('win', name));
    return out;
  }

  /**
   * The clips a table reaches for constantly, whoever is playing.
   *
   * The engine's own chrome and the equipment foley: a hit in four elements, hp
   * loss, the chain, the recast, the draw riffle, the three `card/common`
   * sounds a piece of equipment makes going on, and every equipment proc. Around
   * 420 kB. Fetched when sound is turned on, because a card thwack arriving
   * 200 ms after the card is worse than no thwack, and unlike a voice line
   * there is no seat to predict it from.
   *
   * `bgm` is deliberately not in it: it is 850 kB and the rotation crossfades
   * into it on its own schedule.
   */
  warm(): readonly Clip[] {
    const out: Clip[] = [];
    for (const rel of Object.keys(this.files)) {
      if (rel === 'system/bgm') continue;
      if (rel.startsWith('system/') || (rel.startsWith('card/') && !/^card\/(male|female)\//.test(rel))) {
        out.push(this.make(`audio/${rel}`, this.files[rel] / CS));
      }
    }
    return out;
  }

  /** The card lines for one gender — 15 names, ~95 kB. Warmed per seated gender. */
  cardLines(gender: 'male' | 'female'): readonly Clip[] {
    const out: Clip[] = [];
    const prefix = `card/${gender}/`;
    for (const rel of Object.keys(this.files)) {
      if (rel.startsWith(prefix)) out.push(this.make(`audio/${rel}`, this.files[rel] / CS));
    }
    return out;
  }

  /** Counts, for the report and for `window.__fkAudio`. */
  census(): Readonly<Record<string, number>> {
    return {
      files: Object.keys(this.files).length,
      skill: Object.keys(this.banks.skill).length,
      death: Object.keys(this.banks.death).length,
      win: Object.keys(this.banks.win).length,
      generals: Object.keys(this.generals).length,
      clips: this.clips,
    };
  }
}
