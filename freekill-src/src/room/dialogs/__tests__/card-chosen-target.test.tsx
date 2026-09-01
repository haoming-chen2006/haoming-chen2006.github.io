/**
 * Whose cards is this box asking about?
 *
 * `Room:askToChooseCard` sends `AskForCardChosen` with the target player in
 * `_id` (`lua/lunarltk/server/room.lua`), and `PlayerCardBox` in `DialogHost`
 * has destructured `_id` off that payload from the first commit. Nothing ever
 * rendered it. The dialog's title was `tr(_reason)` — the skill's name — and
 * its prompt was `$ChooseCard — tr(_reason)`, so a panel raised by any of the
 * 52 skills that steal or discard a specific card named the skill and never
 * the person, and with two opponents at 1 card each there was nothing on
 * screen to tell you which hand you were reaching into.
 *
 * Rendered rather than reasoned about, in the same style as `poxi-visibility`:
 * a real `RoomStore` fed the real notify message through the real component
 * tree, asserting on the markup the seat would be looking at.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { DialogHost } from '../DialogHost';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/** `tr` is identity so an assertion reads the key the panel chose to show. */
const stubLua = {
  tr: (key: string) => key,
  getCardData: (cid: number) => ({ cid, name: 'slash', suit: 'spade', number: 7, known: true }),
  getGeneralData: () => null,
  getIllustrator: () => '',
} as unknown as LtkLua;

function room(): { store: RoomStore; draw: () => string } {
  const store = new RoomStore(1);
  const services: RoomServices = {
    store,
    lua: stubLua,
    assets: new Assets(EMPTY_MANIFEST),
    mode: 'play',
    meId: 1,
    naming: makeNaming(store),
  };
  const draw = () => {
    store.commit();
    return renderToStaticMarkup(
      <RoomProvider value={services}>
        <DialogHost onReply={() => {}} interactive />
      </RoomProvider>,
    );
  };
  return { store, draw };
}

/** Seat 2 as 貂蝉, the way the engine fills a photo in before it asks anything. */
function seatDiaochan(store: RoomStore): void {
  store.applyNotify('AddPlayer', [2, 'guest', '']);
  store.applyNotify('PropertyUpdate', [2, 'general', 'diaochan']);
}

/** The wire for 过河拆桥 against seat 2: one card, from their hand. */
function snatchFrom(store: RoomStore, id: number): void {
  store.applyNotify('AskForCardChosen', {
    _id: id, _reason: 'dismantlement_skill', _prompt: '',
    card_data: [['$Hand', [11]]],
  });
}

describe('a box that picks one card off a player', () => {
  it('names the player whose cards it is showing', () => {
    const r = room();
    seatDiaochan(r.store);
    snatchFrom(r.store, 2);
    const html = r.draw();

    expect(r.store.state.request.kind).toBe('dialog');
    // The skill is still named — this adds the target, it does not replace it.
    expect(html).toContain('dismantlement_skill');
    // ...and the seat can now see whose hand it is reaching into.
    expect(html).toContain('diaochan');
  });

  it('falls back to the raw id rather than naming nobody', () => {
    // A player the client has no photo for yet — the box must still say which
    // seat, because "" would put us back where we started.
    const r = room();
    snatchFrom(r.store, 5);
    const html = r.draw();
    expect(html).toContain('dismantlement_skill');
    expect(html).toContain('5');
  });
});
