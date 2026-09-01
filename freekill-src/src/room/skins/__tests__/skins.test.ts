/**
 * The skin layer's contract, which is almost entirely about what it refuses to do.
 *
 * The feature is cosmetic and its artwork is on hosts we do not run, so the only
 * properties worth asserting hard are the negative ones: that `off` reaches the
 * network never, that a dead host stops being asked, and that nothing here can
 * put a URL in front of a player that the mode did not permit.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FAILURE_THRESHOLD,
  isHostWrittenOff,
  isUsable,
  noteSkinFailure,
  noteSkinSuccess,
  pickSkin,
  resetSkinHealth,
  skinsFor,
  hasSkins,
} from '../loader.ts';
import { SKIN_CATALOG, SKIN_HOSTS } from '../catalog.generated.ts';
import { DEFAULT_SKIN_MODE, readSkinMode, writeSkinMode, SKIN_MODE_KEY } from '../policy.ts';
import { isSkinMode, skinKind } from '../types.ts';

/** A general with both a still and a video, so the tiers are distinguishable. */
const MIXED = Object.keys(SKIN_CATALOG).find(
  (g) =>
    SKIN_CATALOG[g].some((s) => s.url.endsWith('.jpg')) &&
    SKIN_CATALOG[g].some((s) => s.url.endsWith('.mp4')),
)!;

beforeEach(resetSkinHealth);

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
  it('defaults to off, which is the licensing and privacy position', () => {
    expect(DEFAULT_SKIN_MODE).toBe('off');
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
      expect(readSkinMode()).toBe('off');
      expect(() => writeSkinMode('all')).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('round-trips through a working store and rejects junk', () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
    try {
      writeSkinMode('static');
      expect(store.get(SKIN_MODE_KEY)).toBe('static');
      expect(readSkinMode()).toBe('static');
      store.set(SKIN_MODE_KEY, 'ultra');
      expect(readSkinMode()).toBe('off');
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
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
