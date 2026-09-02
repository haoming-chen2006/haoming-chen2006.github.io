/**
 * The skin layer's contract, which is almost entirely about what it refuses to do.
 *
 * The feature is cosmetic and its artwork is on hosts we do not run, so the
 * properties worth asserting hardest are the negative ones: that `off` reaches
 * the network never, that a dead host stops being asked, that nothing here can
 * put a URL in front of a player that the mode did not permit -- and, since the
 * feature became reachable, that a player's choice of portrait never leaves
 * their browser.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FAILURE_THRESHOLD,
  isHostWrittenOff,
  isUsable,
  NO_SKIN,
  noteSkinFailure,
  noteSkinSuccess,
  pickSkin,
  resetSkinHealth,
  skinsFor,
  hasSkins,
} from '../loader.ts';
import { SKIN_CATALOG, SKIN_HOSTS } from '../catalog.generated.ts';
import { DEFAULT_SKIN_MODE, readSkinMode, writeSkinMode, SKIN_MODE_KEY } from '../policy.ts';
import {
  clearSkinChoices, readSkinChoices, writeSkinChoice, SKIN_CHOICE_KEY,
} from '../choice.ts';
import { claimOffer, resetSkinOffers, skinName } from '../SkinPicker.tsx';
import { isSkinMode, skinKind } from '../types.ts';

/** A general with both a still and a video, so the tiers are distinguishable. */
const MIXED = Object.keys(SKIN_CATALOG).find(
  (g) =>
    SKIN_CATALOG[g].some((s) => s.url.endsWith('.jpg')) &&
    SKIN_CATALOG[g].some((s) => s.url.endsWith('.mp4')),
)!;

/** A different general with more than one skin, which is what a picker is for.
 *  Deliberately not `MIXED`: the pin tests need two generals to tell apart. */
const MANY = Object.keys(SKIN_CATALOG).find(
  (g) => g !== MIXED && SKIN_CATALOG[g].length > 2,
)!;

/**
 * Run `body` against a `localStorage` that is a `Map`, and take it away again.
 *
 * Node has no `localStorage` at all, which is the right default for every other
 * test in here -- the whole point of the wrapping in `policy.ts` and `choice.ts`
 * is that its absence changes nothing. The stored-preference tests are the ones
 * that need it to exist.
 */
function withStore(store: Map<string, string>, body: () => void): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  try { body(); } finally {
    Reflect.deleteProperty(globalThis, 'localStorage');
    clearSkinChoices();
  }
}

beforeEach(() => {
  resetSkinHealth();
  resetSkinOffers();
  clearSkinChoices();
});

describe('the catalog', () => {
  it('is not empty, or the feature is pointless', () => {
    expect(Object.keys(SKIN_CATALOG).length).toBeGreaterThan(50);
  });

  it('holds only absolute https URLs on the declared hosts', () => {
    for (const [general, entries] of Object.entries(SKIN_CATALOG)) {
      expect(entries.length, general).toBeGreaterThan(0);
      for (const { url } of entries) {
        const u = new URL(url);
        expect(u.protocol, url).toBe('https:');
        expect(SKIN_HOSTS, url).toContain(u.host);
      }
    }
  });

  it('holds only file types the layer can actually render', () => {
    for (const entries of Object.values(SKIN_CATALOG)) {
      for (const { url } of entries) expect(url).toMatch(/\.(jpg|mp4)$/);
    }
  });

  it('has no duplicate URLs within one general', () => {
    for (const [general, entries] of Object.entries(SKIN_CATALOG)) {
      const urls = entries.map((e) => e.url);
      expect(new Set(urls).size, general).toBe(urls.length);
    }
  });

  it('found a general carrying both tiers, so the mode test below means something', () => {
    expect(MIXED).toBeTruthy();
  });
});

describe('mode gating', () => {
  it('off yields nothing at all', () => {
    for (const general of Object.keys(SKIN_CATALOG)) {
      expect(pickSkin(general, 'off')).toBeUndefined();
    }
  });

  it('static never yields a video', () => {
    for (const general of Object.keys(SKIN_CATALOG)) {
      const picked = pickSkin(general, 'static');
      if (picked) expect(picked.kind, picked.url).toBe('image');
    }
  });

  it('all yields something for every general in the catalog', () => {
    for (const general of Object.keys(SKIN_CATALOG)) {
      expect(pickSkin(general, 'all'), general).toBeDefined();
    }
  });

  it('yields nothing for a general with no skins, or no general at all', () => {
    expect(pickSkin('nobody_here', 'all')).toBeUndefined();
    expect(pickSkin(undefined, 'all')).toBeUndefined();
    expect(pickSkin('', 'all')).toBeUndefined();
  });

  it('classifies by extension', () => {
    expect(skinKind('https://x/y.mp4')).toBe('video');
    expect(skinKind('https://x/y.jpg')).toBe('image');
  });
});

describe('selection stability', () => {
  it('is deterministic — a portrait must not reshuffle between renders', () => {
    for (const general of Object.keys(SKIN_CATALOG).slice(0, 20)) {
      const a = pickSkin(general, 'all');
      const b = pickSkin(general, 'all');
      expect(a?.url).toBe(b?.url);
    }
  });

  it('honours a pinned URL, and ignores one that is not this general’s', () => {
    const entries = SKIN_CATALOG[MIXED];
    const last = entries[entries.length - 1].url;
    expect(pickSkin(MIXED, 'all', last)?.url).toBe(last);
    expect(pickSkin(MIXED, 'all', 'https://elsewhere/nope.jpg')?.url).toBe(entries[0].url);
  });

  it('will not honour a pin that the mode forbids', () => {
    const video = SKIN_CATALOG[MIXED].find((s) => s.url.endsWith('.mp4'))!.url;
    const picked = pickSkin(MIXED, 'static', video);
    expect(picked?.url).not.toBe(video);
    expect(picked?.kind).toBe('image');
  });
});

describe('degrading when the host misbehaves', () => {
  it('skips a URL that has failed, and moves to the next one', () => {
    const entries = SKIN_CATALOG[MIXED];
    expect(pickSkin(MIXED, 'all')?.url).toBe(entries[0].url);
    noteSkinFailure(entries[0].url);
    expect(isUsable(entries[0].url)).toBe(false);
    expect(pickSkin(MIXED, 'all')?.url).toBe(entries[1].url);
  });

  it('writes off a whole host after enough failures, and then asks it nothing', () => {
    const urls = Object.values(SKIN_CATALOG)
      .flat()
      .map((s) => s.url)
      .filter((u) => u.startsWith('https://cdn.jsdelivr.net/'));
    expect(urls.length).toBeGreaterThan(FAILURE_THRESHOLD);

    for (let i = 0; i < FAILURE_THRESHOLD; i++) noteSkinFailure(urls[i], 'error');
    expect(isHostWrittenOff(urls[0])).toBe(true);

    // Untouched URLs on that host are refused too — that is the whole point:
    // a dead host must cost one discovery, not one timeout per seat per render.
    const untouched = urls[urls.length - 1];
    expect(isUsable(untouched)).toBe(false);

    const stillOnThatHost = Object.keys(SKIN_CATALOG).filter((g) =>
      SKIN_CATALOG[g].every((s) => s.url.startsWith('https://cdn.jsdelivr.net/')),
    );
    for (const g of stillOnThatHost) expect(pickSkin(g, 'all'), g).toBeUndefined();
  });

  /**
   * The regression the review page caught. 110 seats put ~220 requests behind
   * the browser's six-per-host connection limit; the ones still queued when
   * their deadline expired reported timeouts, three of those wrote off the
   * host, and the whole feature switched itself off against two hosts that were
   * serving every byte correctly. A host that has proven itself must survive
   * any amount of slowness.
   */
  it('does not write off a host that is merely slow, once it has delivered anything', () => {
    const urls = Object.values(SKIN_CATALOG)
      .flat()
      .map((s) => s.url)
      .filter((u) => u.startsWith('https://cdn.jsdelivr.net/'));

    noteSkinSuccess(urls[0]); // one file arrived: the host is real
    for (const u of urls.slice(1, 60)) noteSkinFailure(u, 'timeout');

    expect(isHostWrittenOff(urls[0])).toBe(false);
    const untouched = urls[urls.length - 1];
    expect(isUsable(untouched)).toBe(true);
  });

  it('still writes off a host that has never delivered and keeps timing out', () => {
    const urls = Object.values(SKIN_CATALOG)
      .flat()
      .map((s) => s.url)
      .filter((u) => u.startsWith('https://cdn.jsdelivr.net/'));
    for (let i = 0; i < FAILURE_THRESHOLD; i++) noteSkinFailure(urls[i], 'timeout');
    expect(isHostWrittenOff(urls[0])).toBe(true);
  });

  it('counts a hard error even against a proven host — that is the host’s own answer', () => {
    const urls = Object.values(SKIN_CATALOG)
      .flat()
      .map((s) => s.url)
      .filter((u) => u.startsWith('https://cdn.jsdelivr.net/'));
    noteSkinSuccess(urls[0]);
    for (let i = 1; i <= FAILURE_THRESHOLD; i++) noteSkinFailure(urls[i], 'error');
    expect(isHostWrittenOff(urls[0])).toBe(true);
  });

  it('does not write off a host that is merely missing the odd file', () => {
    const urls = Object.values(SKIN_CATALOG)
      .flat()
      .map((s) => s.url)
      .filter((u) => u.startsWith('https://cdn.jsdelivr.net/'));
    for (let i = 0; i < FAILURE_THRESHOLD * 3; i++) {
      noteSkinFailure(urls[i], 'error');
      noteSkinSuccess(urls[i + 100]); // something on the same host still works
    }
    expect(isHostWrittenOff(urls[0])).toBe(false);
  });

  it('one host going down leaves the other host’s generals alone', () => {
    const onCnb = Object.keys(SKIN_CATALOG).find((g) =>
      SKIN_CATALOG[g].every((s) => s.url.startsWith('https://cnb.cool/')),
    );
    if (!onCnb) return; // catalog regenerated without cnb entries; nothing to assert
    const jsd = Object.values(SKIN_CATALOG)
      .flat()
      .map((s) => s.url)
      .filter((u) => u.startsWith('https://cdn.jsdelivr.net/'));
    for (let i = 0; i < FAILURE_THRESHOLD; i++) noteSkinFailure(jsd[i]);
    expect(pickSkin(onCnb, 'all')).toBeDefined();
  });
});

describe('the preference', () => {
  /**
   * The default was `off` for as long as the licensing question was open. It is
   * now the operator's answered question, so a player who has never touched a
   * setting gets the artwork -- which is the entire difference between a
   * catalogue and a feature.
   */
  it('defaults to all, so a first visit shows the artwork with no action taken', () => {
    expect(DEFAULT_SKIN_MODE).toBe('all');
    expect(readSkinMode()).toBe('all');
    for (const general of Object.keys(SKIN_CATALOG).slice(0, 20)) {
      expect(pickSkin(general, readSkinMode()), general).toBeDefined();
    }
  });

  /**
   * The other half of the same decision. Turning it on made the off switch load
   * bearing rather than decorative: it is what a player who does not want their
   * IP at a third-party host reaches for, and it has to still mean *nothing on
   * the wire* rather than "fewer requests".
   */
  it('keeps off working, and off still means not one request to anybody', () => {
    const store = new Map<string, string>([[SKIN_MODE_KEY, 'off']]);
    withStore(store, () => {
      expect(readSkinMode()).toBe('off');
      for (const general of Object.keys(SKIN_CATALOG)) {
        expect(pickSkin(general, readSkinMode()), general).toBeUndefined();
      }
    });
  });

  it('survives a localStorage that throws on every access', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: sandboxed');
      },
    });
    try {
      expect(readSkinMode()).toBe(DEFAULT_SKIN_MODE);
      expect(() => writeSkinMode('all')).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('round-trips through a working store and rejects junk', () => {
    const store = new Map<string, string>();
    withStore(store, () => {
      writeSkinMode('static');
      expect(store.get(SKIN_MODE_KEY)).toBe('static');
      expect(readSkinMode()).toBe('static');
      store.set(SKIN_MODE_KEY, 'ultra');
      expect(readSkinMode()).toBe(DEFAULT_SKIN_MODE);
    });
  });

  it('validates modes', () => {
    expect(isSkinMode('all')).toBe(true);
    expect(isSkinMode('ALL')).toBe(false);
    expect(isSkinMode(null)).toBe(false);
  });
});

describe('lookup helpers', () => {
  it('reports whether a general has skins without regard to health or mode', () => {
    expect(hasSkins(MIXED)).toBe(true);
    expect(hasSkins('nobody_here')).toBe(false);
    expect(hasSkins(undefined)).toBe(false);
    noteSkinFailure(SKIN_CATALOG[MIXED][0].url);
    expect(hasSkins(MIXED)).toBe(true);
  });

  it('lists every skin for a picker, tagged by kind', () => {
    const all = skinsFor(MIXED);
    expect(all.length).toBe(SKIN_CATALOG[MIXED].length);
    expect(all.every((s) => s.kind === skinKind(s.url))).toBe(true);
    expect(skinsFor('nobody_here')).toEqual([]);
  });
});

/* --------------------------------------------------------------- the pin */

/**
 * Choosing one skin for one general.
 *
 * The store is a `localStorage` key and nothing else, and that is the whole
 * claim being tested here: a pin changes what one browser draws and reaches the
 * engine, the room store and the wire exactly never. `a skin is not game state`
 * below checks the same thing from the other end, by reading the source.
 */
describe('pinning one skin per general', () => {
  it('has two distinct generals to tell apart, or the tests below prove nothing', () => {
    expect(MANY).toBeTruthy();
    expect(MANY).not.toBe(MIXED);
  });

  it('round-trips a choice, and touches only the general it was made for', () => {
    const store = new Map<string, string>();
    withStore(store, () => {
      const wanted = SKIN_CATALOG[MANY][1].url;
      writeSkinChoice(MANY, wanted);

      expect(readSkinChoices()[MANY]).toBe(wanted);
      expect(pickSkin(MANY, 'all', readSkinChoices()[MANY])?.url).toBe(wanted);
      // Everybody else is untouched: this is a per-general answer, not a mode.
      expect(readSkinChoices()[MIXED]).toBeUndefined();
      expect(pickSkin(MIXED, 'all', readSkinChoices()[MIXED])?.url).toBe(SKIN_CATALOG[MIXED][0].url);
    });
  });

  /**
   * The third answer, and the reason `NO_SKIN` exists at all. "I like the
   * artwork but not on this character" had no expression before: the only way
   * out of one portrait was to switch every portrait off.
   */
  it('lets one general keep the game’s own portrait without switching skins off', () => {
    const store = new Map<string, string>();
    withStore(store, () => {
      writeSkinChoice(MANY, NO_SKIN);
      expect(pickSkin(MANY, 'all', readSkinChoices()[MANY])).toBeUndefined();
      // And it really is only that one general.
      expect(pickSkin(MIXED, 'all', readSkinChoices()[MIXED])).toBeDefined();
      expect(readSkinMode()).toBe('all');
    });
  });

  it('clears back to the catalogue’s own choice', () => {
    const store = new Map<string, string>();
    withStore(store, () => {
      writeSkinChoice(MANY, SKIN_CATALOG[MANY][1].url);
      writeSkinChoice(MANY, undefined);
      expect(readSkinChoices()[MANY]).toBeUndefined();
      expect(pickSkin(MANY, 'all', readSkinChoices()[MANY])?.url).toBe(SKIN_CATALOG[MANY][0].url);
    });
  });

  /** A pinned file that later 404s must degrade to the next skin, not to none. */
  it('falls through a pin whose file has died', () => {
    const store = new Map<string, string>();
    withStore(store, () => {
      const dead = SKIN_CATALOG[MANY][1].url;
      writeSkinChoice(MANY, dead);
      noteSkinFailure(dead, 'error');
      const got = pickSkin(MANY, 'all', readSkinChoices()[MANY]);
      expect(got).toBeDefined();
      expect(got?.url).not.toBe(dead);
    });
  });

  it('survives a localStorage that throws on every access', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError: sandboxed'); },
    });
    try {
      expect(readSkinChoices()).toEqual({});
      expect(() => writeSkinChoice(MANY, SKIN_CATALOG[MANY][0].url)).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('drops a blob it cannot read rather than guessing at it', () => {
    for (const junk of ['not json at all', '[1,2,3]', 'null', '{"zhenji":42}', '{"zhenji":""}']) {
      const store = new Map<string, string>([[SKIN_CHOICE_KEY, junk]]);
      withStore(store, () => {
        expect(readSkinChoices(), junk).toEqual({});
      });
    }
  });

  /**
   * `Photo` is memoised on props and there are eight of it, and the table
   * commits five times a second whether or not the game moved. A hook that
   * handed back a fresh object every render would put every seat back into
   * reconciliation on every one of those commits -- the exact regression the
   * seat memo was introduced to fix.
   */
  it('hands back the same object for the same bytes, so the seat memo holds', () => {
    const store = new Map<string, string>();
    withStore(store, () => {
      expect(readSkinChoices()).toBe(readSkinChoices());
      writeSkinChoice(MANY, SKIN_CATALOG[MANY][0].url);
      const once = readSkinChoices();
      expect(readSkinChoices()).toBe(once);
      writeSkinChoice(MANY, SKIN_CATALOG[MANY][1].url);
      expect(readSkinChoices()).not.toBe(once);
    });
  });
});

/* ---------------------------------------------------- offering the picker */

describe('offering the picker once a general is chosen', () => {
  it('offers a general with artwork exactly once per page load', () => {
    expect(claimOffer(MANY, 'all')).toBe(true);
    expect(claimOffer(MANY, 'all')).toBe(false);
    resetSkinOffers();
    expect(claimOffer(MANY, 'all')).toBe(true);
  });

  /**
   * 231 of the 341 shipped generals have no artwork at all. Those seats must
   * see nothing -- not a box that says there is nothing.
   */
  it('says nothing at all for a general with no artwork', () => {
    const bare = 'a_general_the_pack_never_heard_of';
    expect(hasSkins(bare)).toBe(false);
    expect(claimOffer(bare, 'all')).toBe(false);
    expect(claimOffer(bare, 'all')).toBe(false);
  });

  /**
   * The offer has to be "something will arrive", not "the pack lists something".
   * cnb.cool answers `cross-origin-resource-policy: same-origin`, so no browser
   * will render its 29 files from this site; 7 generals have nothing else. Once
   * the breaker has written a host off, the generals behind it must go back to
   * saying nothing rather than opening a box that cannot fill itself.
   */
  it('stops offering a general once its host has been written off', () => {
    const onOneHost = Object.keys(SKIN_CATALOG).find((g) => {
      const hosts = new Set(SKIN_CATALOG[g].map((s) => new URL(s.url).host));
      return hosts.size === 1;
    })!;
    for (const s of SKIN_CATALOG[onOneHost]) noteSkinFailure(s.url, 'error');
    expect(hasSkins(onOneHost)).toBe(true);
    expect(pickSkin(onOneHost, 'all')).toBeUndefined();
    expect(claimOffer(onOneHost, 'all')).toBe(false);
  });

  it('waits for a seat, and respects a player who turned skins off', () => {
    expect(claimOffer(undefined, 'all')).toBe(false);
    expect(claimOffer('', 'all')).toBe(false);
    expect(claimOffer(MANY, 'off')).toBe(false);
    // Refusing while off must not spend the offer.
    expect(claimOffer(MANY, 'all')).toBe(true);
  });
});

/* ------------------------------------------------------------ tile captions */

describe('naming a skin in the picker', () => {
  it('reads the romanised file name the pack uses for most artwork', () => {
    expect(skinName({ url: 'https://h/x/zhenji_luoshuishenyun.mp4', kind: 'video' }, 'zhenji'))
      .toBe('luoshuishenyun');
    expect(skinName({ url: 'https://h/x/sp__diaochan_huandieyinghun.mp4', kind: 'video' }, 'diaochan'))
      .toBe('huandieyinghun');
  });

  /**
   * The Chinese-named files get no caption rather than a broken one. The shipped
   * font is subset to the exact Han the sources use (`scripts/glyphset.mjs`),
   * and a skin name decoded out of a URL at runtime is in none of it -- so the
   * alternative to "no caption" is tofu, not a name.
   */
  it('declines to caption a file named in characters the shipped font lacks', () => {
    const url = 'https://cnb.cool/x/%E8%B2%82%E8%9D%89--%E7%A7%8B%E6%B0%B4%E4%BC%8A%E4%BA%BA.mp4';
    expect(skinName({ url, kind: 'video' }, 'diaochan')).toBeUndefined();
  });

  /** Measured on a live table: `mobile__caomao` wears `caomao_…` files as well
   *  as `mobile__caomao_…` ones, and the tile read "caomao longxuexuanhuang". */
  it('strips the bare general id as well as the pack-qualified one', () => {
    expect(skinName({ url: 'https://h/x/caomao_longxuexuanhuang.mp4', kind: 'video' }, 'mobile__caomao'))
      .toBe('longxuexuanhuang');
    expect(skinName({ url: 'https://h/x/mobile__caomao_xiaolongpoyuan.mp4', kind: 'video' }, 'mobile__caomao'))
      .toBe('xiaolongpoyuan');
  });

  it('prefers a label the catalogue actually carries', () => {
    expect(skinName({ url: 'https://h/x/zhenji_a.jpg', kind: 'image', label: 'Given' }, 'zhenji'))
      .toBe('Given');
  });

  it('names every skin in the catalogue or admits it cannot', () => {
    let named = 0;
    for (const [general, entries] of Object.entries(SKIN_CATALOG)) {
      for (const e of entries) {
        const name = skinName({ ...e, kind: skinKind(e.url) }, general);
        if (name === undefined) continue;
        named++;
        // Whatever comes back is printable ASCII: anything else is a glyph the
        // shipped font subset was never built for.
        expect(name, e.url).toMatch(/^[\x20-\x7e]+$/);
      }
    }
    // A floor, not a target: if the pack renames its files this may move, but a
    // picker that captions almost nothing is a picker of blank squares.
    expect(named).toBeGreaterThan(150);
  });
});

/* ------------------------------------------------- a skin is not game state */

/**
 * The one thing that would turn this from a preference into a bug.
 *
 * A skin is what one browser draws over a portrait it was already drawing. The
 * moment any of it is sent, replied with, or written into the room store it
 * becomes something the other seven seats can disagree about -- and a cosmetic
 * disagreement between seats is indistinguishable, from the outside, from a
 * desync. Making it "shared" is a one-line change that would look reasonable in
 * review, so the boundary is asserted rather than described.
 */
describe('a skin is not game state', () => {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const SKINS = join(HERE, '..');

  /** Names that would only exist if a skin had started leaving this browser. */
  const FORBIDDEN = [
    /\binteract\s*\(/,
    /\breplyToServer\b/,
    /\bonNotifyUI\b/,
    /\bapplyNotify\b/,
    /\bfinishRequestUI\b/,
    /\bRoomStore\b/,
    /\.commit\s*\(/,
  ];

  /** Comments and string literals are prose, not logic -- `no-rules.test.ts`. */
  function code(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
  }

  const files = readdirSync(SKINS).filter((f) => /\.tsx?$/.test(f));

  it('has source to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('never sends, replies with, or stores a skin anywhere the table can see it', () => {
    const hits: string[] = [];
    for (const f of files) {
      const body = code(readFileSync(join(SKINS, f), 'utf8'));
      for (const re of FORBIDDEN) {
        const m = body.match(re);
        if (m) hits.push(`${f}: ${m[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('keeps every write inside one localStorage key', () => {
    const keys = new Set<string>();
    for (const f of files) {
      const body = readFileSync(join(SKINS, f), 'utf8');
      for (const m of body.matchAll(/setItem\(\s*([A-Za-z_$][\w$]*)/g)) keys.add(m[1]);
    }
    expect([...keys].sort()).toEqual(['SKIN_CHOICE_KEY', 'SKIN_MODE_KEY']);
  });
});
