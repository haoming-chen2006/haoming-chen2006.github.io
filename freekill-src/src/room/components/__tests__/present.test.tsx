/**
 * Throwing flowers and eggs.
 *
 * Three things are worth a test here and the rest is CSS.
 *
 *  * The format, because it is the actual wire. A present is a chat line, and
 *    the room has to be able to tell one from something a player typed — in
 *    both directions, and for the upstream two-field form as well as this
 *    build's three-field one.
 *  * The budget, because it is the griefing answer. A send limit in the
 *    thrower's own browser is advice; the receive limit is the part that has to
 *    hold when somebody ignores it.
 *  * The badge placement, because it is the one piece of layout that reaches
 *    outside its own component. It is measured off the live seat elements, and
 *    it has to land under the portrait rather than on it.
 *  * Whether the badge can be *found*, because that is what actually failed:
 *    the feature shipped, worked, and was reported missing. See the last block.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import type { ChatLine, RoomMode } from '../../../contract/views';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { Presents } from '../Presents';
import type { SeatRefs } from '../Indicators';
import { photoHeight } from '../SeatRing';
import { ChatBudget } from '../../chat/budget';
import {
  decodePresent, encodePresent, isPresentText, rollKind,
  GIANT_EGG_CHANCE, RECEIVE_BURST, RECEIVE_GAP_MS,
} from '../present';

/* ------------------------------------------------------------- the format */

describe('the present format', () => {
  it('round-trips a throw', () => {
    const p = { kind: 'Flower', to: 5, from: 2 } as const;
    expect(encodePresent(p)).toBe('$@Flower:5:2');
    expect(decodePresent('$@Flower:5:2')).toEqual(p);
  });

  it('reads the upstream two-field form, with no thrower', () => {
    // `PlayerDetail.qml:213` sends `"$@" + p + ":" + pid` and takes the sender
    // off the chat envelope. This build has no sender on the envelope, so the
    // seat moved into the message — but the old shape still decodes.
    expect(decodePresent('$@Egg:3')).toEqual({ kind: 'Egg', to: 3, from: null });
    expect(encodePresent({ kind: 'Egg', to: 3, from: null })).toBe('$@Egg:3');
  });

  it('knows every kind the QML animates that this build ships', () => {
    for (const kind of ['Flower', 'Egg', 'GiantEgg'] as const) {
      expect(decodePresent(`$@${kind}:1:2`)?.kind).toBe(kind);
    }
  });

  it('leaves anything a player could plausibly type alone', () => {
    for (const said of [
      '', 'hello', '$@', '$@Flower', '$@Flower:', '$@:1:2', '$Flower:1',
      '@Flower:1:2', '$@Wine:1:2', '$@Shoe:1', '$@flower:1:2',
      '$@Flower:x:2', '$@Flower:1:2:3:4', '$@Flower:99999999999999:2',
      '  $@Flower:1:2', 'look: $@Flower:1:2',
    ]) {
      expect(decodePresent(said), said).toBeNull();
      expect(isPresentText(said), said).toBe(false);
    }
    expect(isPresentText('$@Flower:1:2')).toBe(true);
  });

  it('survives a chat line that is not a string at all', () => {
    for (const junk of [null, undefined, 7, {}, []]) {
      expect(decodePresent(junk)).toBeNull();
    }
  });

  it('rolls a giant egg exactly as rarely as the QML does', () => {
    // `PlayerDetail.qml:67`: `if (Math.random() < 0.03) GiantEgg else Egg`.
    expect(rollKind('Egg', 0)).toBe('GiantEgg');
    expect(rollKind('Egg', GIANT_EGG_CHANCE - 0.0001)).toBe('GiantEgg');
    expect(rollKind('Egg', GIANT_EGG_CHANCE)).toBe('Egg');
    expect(rollKind('Egg', 0.9)).toBe('Egg');
    // A flower is a flower however the dice land.
    expect(rollKind('Flower', 0)).toBe('Flower');
    expect(rollKind('Flower', 0.99)).toBe('Flower');
  });
});

/* -------------------------------------------------------------- the budget */

describe('the throwing budget', () => {
  it('allows a burst, then makes you wait', () => {
    const b = new ChatBudget(1000, 3);
    const t0 = 10_000;
    expect(b.take('a', t0)).toBe(true);
    expect(b.take('a', t0)).toBe(true);
    expect(b.take('a', t0)).toBe(true);
    expect(b.take('a', t0)).toBe(false);
    expect(b.waitMs('a', t0)).toBe(1000);
  });

  it('refills one at a time', () => {
    const b = new ChatBudget(1000, 2);
    const t0 = 10_000;
    b.take('a', t0);
    b.take('a', t0);
    expect(b.take('a', t0 + 999)).toBe(false);
    expect(b.take('a', t0 + 1000)).toBe(true);
    expect(b.take('a', t0 + 1000)).toBe(false);
  });

  it('never lets a long quiet spell bank more than the burst', () => {
    // Otherwise going away for ten minutes buys six hundred eggs.
    const b = new ChatBudget(1000, 3);
    const t0 = 10_000;
    b.take('a', t0);
    let n = 0;
    const later = t0 + 600_000;
    while (b.take('a', later)) n += 1;
    expect(n).toBe(3);
  });

  it('budgets each thrower separately', () => {
    const b = new ChatBudget(1000, 1);
    expect(b.take('a', 0)).toBe(true);
    expect(b.take('a', 0)).toBe(false);
    expect(b.take('b', 0)).toBe(true);
  });

  it('caps a flood at the receiving end, whatever the sender does', () => {
    // The real griefing shape: one client ignores its own send limit and puts
    // a hundred chat rows on the wire in a second. Every other client refuses
    // to draw more than the burst until the gap has passed.
    const b = new ChatBudget(RECEIVE_GAP_MS, RECEIVE_BURST);
    let drawn = 0;
    for (let i = 0; i < 100; i += 1) if (b.take('griefer', 50_000 + i * 10)) drawn += 1;
    expect(drawn).toBe(RECEIVE_BURST);
    // And a minute of sustained flooding still only gets one per gap.
    let over = 0;
    for (let t = 50_000; t < 110_000; t += 10) if (b.take('griefer', t)) over += 1;
    expect(over).toBeLessThanOrEqual(60_000 / RECEIVE_GAP_MS + 1);
  });
});

/* --------------------------------------------------------------- the badge */

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

const stubLua = { tr: (key: string) => key } as unknown as LtkLua;

/** A seat element at a known place, so `getBoundingClientRect` is answerable. */
function seatEl(left: number, top: number, width: number): HTMLElement {
  return {
    getBoundingClientRect: () => ({ left, top, width, height: width * 1.79 }),
  } as unknown as HTMLElement;
}

function table(mode: RoomMode, meId: number | null, seats: readonly number[]) {
  const store = new RoomStore(meId);
  const services: RoomServices = {
    store, lua: stubLua, assets: new Assets(EMPTY_MANIFEST), mode, meId,
    naming: makeNaming(store),
  };
  const refs: SeatRefs = new Map();
  seats.forEach((pid, i) => refs.set(pid, seatEl(100 * i, 40, 120)));
  const container = seatEl(0, 0, 1000);
  const chat: readonly ChatLine[] = [];
  return renderToStaticMarkup(
    <RoomProvider value={services}>
      <Presents chat={chat} onChat={() => {}} seatRefs={refs} container={container} seats={seats} />
    </RoomProvider>,
  );
}

const badges = (html: string): number => (html.match(/fk-present-badge__btn/g) ?? []).length;

describe('the throw badge', () => {
  it('offers one on every seat but your own', () => {
    expect(badges(table('play', 1, [1, 2, 3, 4]))).toBe(3);
  });

  it('offers none to an observer', () => {
    // `PlayerDetail.qml` hides all four present buttons behind
    // `!Config.observing`: watching a game does not entitle you to throw at it.
    expect(badges(table('observe', null, [1, 2, 3, 4]))).toBe(0);
    expect(badges(table('replay', null, [1, 2, 3]))).toBe(0);
  });

  it('sits below the portrait, not on it', () => {
    // The seat's own surface is spoken for — hp bar, name, hand count — and it
    // is getting more crowded, not less. The badge belongs in the strip under
    // the portrait where the equipment rows go.
    const html = table('play', 1, [1, 2]);
    const top = Number(/top:\s*([\d.]+)px/.exec(html)?.[1]);
    // Seat 2's element is at y=40 with a 120px-wide photo.
    expect(top).toBeCloseTo(40 + photoHeight(120) + 10, 5);
    expect(top).toBeGreaterThan(40 + photoHeight(120));
  });

  it('draws nothing at all before the ring has been measured', () => {
    const store = new RoomStore(1);
    const services: RoomServices = {
      store, lua: stubLua, assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: 1,
      naming: makeNaming(store),
    };
    const html = renderToStaticMarkup(
      <RoomProvider value={services}>
        <Presents chat={[]} onChat={() => {}} seatRefs={new Map()} container={null} seats={[1, 2]} />
      </RoomProvider>,
    );
    expect(html).toBe('');
  });
});

/* --------------------------------------------------------------- finding it */

/**
 * The part that actually failed.
 *
 * Everything above this block passed while the feature was, from the user's
 * seat, missing: the badge was in the DOM, the art was on the server, and a
 * 22 px circle at 42% opacity under a portrait is not something anybody finds.
 * This is the guard on the fix — see the header on `HINT_KEY` in `Presents.tsx`.
 */
const badgeRule = (): string => {
  const css = readFileSync(new URL('../present.css', import.meta.url), 'utf8');
  return /\.fk-present-badge__btn \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
};

/** A `window` with a localStorage that answers, since the tests render on the
 *  server and `hintWanted` reads one. */
function stubWindow(found: boolean): void {
  const store = new Map<string, string>(found ? [['fk.present.found', '1']] : []);
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
    },
  });
}

describe('finding the badge at all', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('is legible before anybody hovers it', () => {
    const rule = badgeRule();
    expect(Number(/opacity:\s*([\d.]+)/.exec(rule)?.[1])).toBeGreaterThanOrEqual(0.8);
    expect(Number(/width:\s*(\d+)px/.exec(rule)?.[1])).toBeGreaterThanOrEqual(26);
    // A gold rim, so it reads as a control rather than as a smudge on the felt.
    expect(rule).toMatch(/border:[^;]*var\(--fk-gold\)/);
  });

  it('glows once for a browser that has never opened one', () => {
    stubWindow(false);
    expect(table('play', 1, [1, 2, 3])).toContain('fk-present-badge__btn--hint');
  });

  it('never glows again once somebody has found it', () => {
    stubWindow(true);
    expect(table('play', 1, [1, 2, 3])).not.toContain('fk-present-badge__btn--hint');
  });

  it('says what it offers, in the engine\'s own words, in both languages', () => {
    // `stubLua.tr` is the identity, so this is the pair of keys rather than the
    // pair of sentences — `zh_CN.lua:124` translates both.
    stubWindow(true);
    expect(table('play', 1, [1, 2])).toContain('Give Flower / Give Egg');
  });

  it('still takes no pointer event it was not offered', () => {
    // The reason the badge is placed by this overlay and not by `Photo` is that
    // nothing here may cover the table. A hint that changed that would be a
    // worse bug than the one it fixes.
    const css = readFileSync(new URL('../present.css', import.meta.url), 'utf8');
    expect(/\.fk-presents \{([\s\S]*?)\n\}/.exec(css)?.[1]).toMatch(/pointer-events:\s*none/);
    expect(/--hint \{([\s\S]*?)\n\}/.exec(css)?.[1]).not.toMatch(/pointer-events/);
  });
});
