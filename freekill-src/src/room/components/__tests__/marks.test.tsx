/**
 * What a mark on a photo actually says.
 *
 * `lua/core/player.lua:44-54` documents four shapes a mark name can take, and
 * the Qt client renders each differently (`Pages/LunarLTK/RoomLogic.js:1286`
 * for the dispatch, `Photo/MarkArea.qml:135-152` for the value). This build
 * printed `String(value)` for all of them, which is correct only for a plain
 * number:
 *
 *   - `@$` / `@&` carry an array — a card pile, or a list of general names —
 *     and rendered as `1,2,3` where the engine shows how many.
 *   - `@[type]name` is a package-supplied display. Its text comes from
 *     `GetQmlMark`, a call that existed on `LtkLua` with no caller anywhere,
 *     so every one of these marks showed its own raw key to the player.
 *   - a string value is a translation key, not a literal.
 *
 * Rendered rather than reasoned about: the real `Photo` fed a real `RoomStore`
 * carrying the marks the engine would have broadcast.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { Photo } from '../Photo';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/** `tr` prefixes rather than translating, so an assertion can tell a value
 *  that went through `tr` from one that was printed raw. */
function stub(qml?: (type: string, name: string, pid: number) => unknown): LtkLua {
  return {
    tr: (key: string) => `tr:${key}`,
    getQmlMark: (type: string, name: string, p: unknown) =>
      (qml ? qml(type, name, p as number) : {}),
    getCardData: () => null,
    getGeneralData: () => null,
    getIllustrator: () => '',
  } as unknown as LtkLua;
}

function draw(marks: Record<string, unknown>, lua = stub()): string {
  const store = new RoomStore(1);
  store.applyNotify('AddPlayer', [1, 'me', '']);
  for (const [k, v] of Object.entries(marks)) {
    store.applyNotify('SetPlayerMark', [1, k, v]);
  }
  store.commit();
  const services: RoomServices = {
    store, lua, assets: new Assets(EMPTY_MANIFEST),
    mode: 'play', meId: 1, naming: makeNaming(store),
  };
  return renderToStaticMarkup(
    <RoomProvider value={services}>
      <Photo player={store.state.players[1]} isCurrent={false} handCount={0} focus={null} />
    </RoomProvider>,
  );
}

/** The text of the one mark chip on the photo.
 *
 *  A `<button>` since the mark row became a tap target — `MarkArea.qml:66`
 *  hangs a `TapHandler` off every row, and `components/marks.ts` is what a tap
 *  resolves to. What a chip SAYS is unchanged, which is what this file is
 *  about; only the element it says it in moved. */
function chip(html: string): string {
  const m = html.match(/class="fk-mark"[^>]*>(.*?)<\/button>/);
  return m
    ? m[1].replace(/<!--[^>]*-->/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    : '';
}

describe('a mark on a photo', () => {
  it('shows a card pile as a count, not as its card ids', () => {
    // `@$` carries card_integer[]. Eight ids under 一号袋 must read "3", the
    // way the engine's own mark area reads it — not "11,12,13".
    expect(chip(draw({ '@$stash': [11, 12, 13] }))).toBe('tr:@$stash 3');
  });

  it('shows a general list as a count too', () => {
    expect(chip(draw({ '@&banished': ['diaochan', 'zhaoyun'] }))).toBe('tr:@&banished 2');
  });

  it('asks the package how to show a qml mark instead of printing the key', () => {
    const lua = stub((type, name) => (type === 'seat' ? { text: `S${name.length}` } : {}));
    expect(chip(draw({ '@[seat]xy': 1 }, lua))).toBe('tr:@[seat]xy S9');
  });

  it('shows nothing rather than a raw key when the package supplies no text', () => {
    // `GetQmlMark` returns `{}` for a type nothing registered. The key is not
    // prose, so the name alone is the honest thing to draw.
    expect(chip(draw({ '@[nope]x': 1 }))).toBe('tr:@[nope]x');
  });

  it('translates a string value instead of printing it literally', () => {
    expect(chip(draw({ '@kingdom': 'wei' }))).toBe('tr:@kingdom tr:wei');
  });

  it('still shows a plain number, and still hides an @@ value', () => {
    expect(chip(draw({ '@count': 3 }))).toBe('tr:@count tr:3');
    expect(chip(draw({ '@@secret': 9 }))).toBe('tr:@@secret');
  });
});
