/**
 * What a player actually sees, rendered rather than reasoned about.
 *
 * `skins.test.ts` covers the catalogue, the circuit breaker and the stored
 * preferences as values. This is the other half: the markup a seat and a picker
 * produce, because every claim worth making about this feature is a claim about
 * what ends up on screen — the artwork appears with nobody having asked for it,
 * a pin reaches the seat, one video plays and not seven, and a general the pack
 * never heard of produces no box at all.
 *
 * `renderToStaticMarkup` and no DOM, following `marks.test.tsx`: effects do not
 * run, which is exactly right here. Everything asserted below is a property of
 * the first paint, and a feature whose first paint is wrong is wrong.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { Photo } from '../../components/Photo';
import { SKIN_CATALOG } from '../catalog.generated';
import { clearSkinChoices, SKIN_CHOICE_KEY } from '../choice';
import { NO_SKIN, resetSkinHealth, skinsFor } from '../loader';
import { SKIN_MODE_KEY } from '../policy';
import { SkinGrid, SkinPicker, resetSkinOffers } from '../SkinPicker';
import { skinKind, type SkinMode } from '../types';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/** A general whose first skin is a video, so "the seat plays it" is testable. */
const VIDEO_FIRST = Object.keys(SKIN_CATALOG).find(
  (g) => SKIN_CATALOG[g].length > 3 && SKIN_CATALOG[g].every((s) => skinKind(s.url) === 'video'),
)!;
/** A general with at least two stills, so a pin has something to be instead of. */
const HAS_STILL = Object.keys(SKIN_CATALOG).find(
  (g) => SKIN_CATALOG[g].filter((s) => skinKind(s.url) === 'image').length > 1,
)!;
/** That general's second still: what a pin picks, and the catalogue would not. */
const OTHER_STILL = SKIN_CATALOG[HAS_STILL]?.filter((s) => skinKind(s.url) === 'image')[1].url;

function stub(): LtkLua {
  return {
    tr: (key: string) => `tr:${key}`,
    getQmlMark: () => ({}),
    getCardData: () => null,
    getGeneralData: () => null,
    getIllustrator: () => '',
  } as unknown as LtkLua;
}

function provide(node: React.ReactNode): string {
  const store = new RoomStore(1);
  const services: RoomServices = {
    store, lua: stub(), assets: new Assets(EMPTY_MANIFEST),
    mode: 'play', meId: 1, naming: makeNaming(store),
  };
  return renderToStaticMarkup(<RoomProvider value={services}>{node}</RoomProvider>);
}

/** One seat holding `general`, drawn by the real `Photo`. */
function seat(general: string): string {
  const store = new RoomStore(1);
  store.applyNotify('AddPlayer', [1, 'me', '']);
  store.applyNotify('PropertyUpdate', [1, 'general', general]);
  store.commit();
  const services: RoomServices = {
    store, lua: stub(), assets: new Assets(EMPTY_MANIFEST),
    mode: 'play', meId: 1, naming: makeNaming(store),
  };
  return renderToStaticMarkup(
    <RoomProvider value={services}>
      <Photo player={store.state.players[1]} isCurrent={false} handCount={0} focus={null} />
    </RoomProvider>,
  );
}

/** A `localStorage` that is a `Map`, taken away again afterwards. */
function withStore(entries: Record<string, string>, body: () => void): void {
  const store = new Map(Object.entries(entries));
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

const count = (html: string, tag: string) => html.split(`<${tag}`).length - 1;

beforeEach(() => {
  resetSkinHealth();
  resetSkinOffers();
  clearSkinChoices();
});

/* ------------------------------------------------------------------- a seat */

describe('a seat, with nobody having chosen anything', () => {
  /**
   * The whole point of the default change, at the only place it is observable.
   * Before this, a first-time visitor's portrait was the shipped art and there
   * was no code path anywhere in the app that could make it anything else.
   */
  it('wears alternate artwork on a first visit, with no stored preference at all', () => {
    const html = seat(HAS_STILL);
    const wanted = SKIN_CATALOG[HAS_STILL][0].url;
    expect(html).toContain(wanted);
  });

  it('plays a video skin, rather than showing its first frame or nothing', () => {
    const html = seat(VIDEO_FIRST);
    expect(html).toContain('<video');
    expect(html).toContain(SKIN_CATALOG[VIDEO_FIRST][0].url);
    // Muted, inline and looping, or a browser refuses to start it at all.
    expect(html).toMatch(/<video[^>]*autoplay/i);
    expect(html).toMatch(/<video[^>]*muted/i);
    expect(html).toMatch(/<video[^>]*playsinline/i);
    // Exactly one media element over the portrait. Eight seats must never be
    // able to become sixteen decoders.
    expect(count(html, 'video')).toBe(1);
  });

  it('wears nothing at all for a general the pack never heard of', () => {
    const html = seat('a_general_the_pack_never_heard_of');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('cdn.jsdelivr.net');
  });
});

describe('a seat, once this browser has chosen', () => {
  it('wears the pinned skin instead of the catalogue’s first', () => {
    expect(OTHER_STILL).not.toBe(SKIN_CATALOG[HAS_STILL][0].url);
    withStore({ [SKIN_CHOICE_KEY]: JSON.stringify({ [HAS_STILL]: OTHER_STILL }) }, () => {
      const html = seat(HAS_STILL);
      expect(html).toContain(OTHER_STILL);
      expect(html).not.toContain(SKIN_CATALOG[HAS_STILL][0].url);
    });
  });

  it('goes back to the game’s own portrait for a general pinned to none', () => {
    withStore({ [SKIN_CHOICE_KEY]: JSON.stringify({ [VIDEO_FIRST]: NO_SKIN }) }, () => {
      const html = seat(VIDEO_FIRST);
      expect(html).not.toContain('<video');
      expect(html).not.toContain(SKIN_CATALOG[VIDEO_FIRST][0].url);
    });
  });

  it('loads nothing at all when the player has turned skins off', () => {
    withStore({ [SKIN_MODE_KEY]: 'off' }, () => {
      const html = seat(VIDEO_FIRST);
      expect(html).not.toContain('<video');
      expect(html).not.toContain('cdn.jsdelivr.net');
      expect(html).not.toContain('cnb.cool');
    });
  });
});

/* ----------------------------------------------------------------- the grid */

describe('the picker’s grid', () => {
  const grid = (general: string, mode: SkinMode = 'all') =>
    provide(
      <SkinGrid
        general={general}
        mode={mode}
        offered={skinsFor(general)}
        onFail={() => {}}
      />,
    );

  it('offers every skin the general has, plus the way back to the default', () => {
    const html = grid(VIDEO_FIRST);
    expect(count(html, 'button')).toBe(SKIN_CATALOG[VIDEO_FIRST].length + 1);
    expect(html).toContain('tr:default');
    // Only the live tile carries a URL — the rest are deliberately elementless,
    // which is the next test. Every one of them is still a tile you can press.
    expect(count(html, 'span class="fk-skins__ghost"'))
      .toBe(SKIN_CATALOG[VIDEO_FIRST].length - 1);
  });

  it('offers every still it has as a real image, since a still costs 73 KB', () => {
    const stills = SKIN_CATALOG[HAS_STILL].filter((s) => skinKind(s.url) === 'image');
    const html = grid(HAS_STILL);
    for (const { url } of stills) expect(html).toContain(url);
    expect(html).toMatch(/<img[^>]*loading="lazy"/);
  });

  /**
   * The memory constraint, made checkable. Video is 138 of the 226 files at a
   * 769 KB median; the general below has four or more of them and a grid that
   * mounted each one would pull several megabytes to let somebody look at one.
   * Exactly one tile is ever live — what the seat is wearing, or whatever the
   * pointer is on — and every other video tile is chrome with no element.
   */
  it('mounts one video element and no more, however many the general has', () => {
    expect(SKIN_CATALOG[VIDEO_FIRST].length).toBeGreaterThan(3);
    const html = grid(VIDEO_FIRST);
    expect(count(html, 'video')).toBe(1);
    // And it is the one the seat is actually wearing, so opening the panel shows
    // you what you have before it shows you what you could have.
    expect(html).toMatch(new RegExp(`<video[^>]*src="${SKIN_CATALOG[VIDEO_FIRST][0].url}"`));
  });

  it('draws no grid at all for a general with nothing to choose between', () => {
    expect(grid('a_general_the_pack_never_heard_of')).toBe('');
  });

  it('greys the video tier out under `static` rather than pretending it is gone', () => {
    const html = grid(VIDEO_FIRST, 'static');
    expect(count(html, 'video')).toBe(0);
    expect(html).toContain('fk-skins__tile--off');
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});

/* ---------------------------------------------------------------- the chip */

describe('the picker itself', () => {
  it('is a corner chip, not a modal — it can never cover a question', () => {
    const html = provide(<SkinPicker general={VIDEO_FIRST} />);
    expect(html).toContain('fk-skins__btn');
    // `.fk-modal` is the request dialogs' overlay and takes every click on the
    // screen. A cosmetic panel that used one could lose a game.
    expect(html).not.toContain('fk-modal');
    expect(html).not.toContain('fk-float');
  });

  it('starts closed, and is still there for a seat with no general yet', () => {
    const html = provide(<SkinPicker />);
    expect(html).toContain('fk-skins__btn');
    expect(html).not.toContain('fk-skins__panel');
  });
});
