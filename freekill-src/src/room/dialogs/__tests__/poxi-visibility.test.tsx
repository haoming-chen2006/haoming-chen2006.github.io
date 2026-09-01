/**
 * What a seat is allowed to see while it picks cards out of somebody's hand.
 *
 * `Room:askToChooseCards` builds a `visible_data` map — `false` for every card
 * the chooser may not see — and hands it to the client inside `extra_data`
 * (`lua/lunarltk/server/room.lua:1364-1372`). The engine reads that map back
 * when it renders a log line (`lunarltk/client/client.lua:158, :174`), the Qt
 * client reads it to decide `known` (`Fk/Pages/LunarLTK/PoxiBox.qml:77-81`),
 * and `PlayerCardBox` in this very file reads its own copy of it.
 *
 * `PoxiBox` did not. It drew `<CardItem known />` for every card in every zone,
 * so a player choosing two cards out of an opponent's hand read both faces
 * before choosing. That is not a rare panel either: `askToChooseCards` sends
 * `AskForPoxi` with `poxi_type = "AskForCardsChosen"`, which is how every
 * multi-card steal in the game arrives.
 *
 * Rendered rather than reasoned about, in the same style as `ag-board`: a real
 * `RoomStore` fed the real notify message, through the real component tree, and
 * the assertion is on the markup the seat would be looking at.
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

/** Everything the panel asks the engine; none of it is under test. */
const stubLua = {
  tr: (key: string) => key,
  getCardData: (cid: number) => ({ cid, name: 'slash', suit: 'spade', number: 7, known: true }),
  getGeneralData: () => null,
  getIllustrator: () => '',
  poxiPrompt: () => '',
  poxiFilter: () => true,
  poxiFeasible: () => true,
} as unknown as LtkLua;

function room(selfId = 1): { store: RoomStore; draw: () => string } {
  const store = new RoomStore(selfId);
  const services: RoomServices = {
    store,
    lua: stubLua,
    assets: new Assets(EMPTY_MANIFEST),
    mode: 'play',
    meId: selfId,
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

/**
 * The wire, as `Room:askToChooseCards` puts it out for a two-card steal from a
 * hand this seat cannot see through. Card 12 is hidden, card 11 is not — the
 * shape the engine writes when only some of the hand is visible.
 */
function stealFromHand(store: RoomStore, hidden: readonly number[]): void {
  const visible_data: Record<string, boolean> = {};
  for (const cid of hidden) visible_data[String(cid)] = false;
  store.applyNotify('AskForPoxi', {
    type: 'AskForCardsChosen',
    data: [['$Hand', [11, 12]]],
    extra_data: {
      to: 2, min: 1, max: 2, skillName: 'dismantlement_skill',
      prompt: '', visible_data,
    },
    cancelable: false,
  });
}

/** One `<CardItem>` each; a face-down one carries `fk-card--back`. */
const backs = (html: string): number => (html.match(/fk-card--back/g) ?? []).length;

describe('picking cards out of a hand', () => {
  it('draws a card the engine flagged hidden face-down', () => {
    const r = room(1);
    stealFromHand(r.store, [12]);
    const html = r.draw();

    // The panel is up and offering both cards...
    expect(r.store.state.request.kind).toBe('dialog');
    expect(html).toContain('fk-card');
    // ...but only the one this seat may see has a face.
    expect(backs(html)).toBe(1);
    // The visible one still shows its face, so this is not "hide everything".
    expect(html).toContain('slash');
  });

  it('draws every card face-down when the whole hand is hidden', () => {
    const r = room(1);
    stealFromHand(r.store, [11, 12]);
    const html = r.draw();
    expect(backs(html)).toBe(2);
    expect(html).not.toContain('slash');
  });

  it('still shows faces when the engine sent no visibility map at all', () => {
    // `askToChooseCards` drops `visible_data` entirely when nothing is hidden
    // (`room.lua:1370`), and a poxi method that is not a card steal never sets
    // it. Absent must keep meaning visible, or every poxi goes blank.
    const r = room(1);
    stealFromHand(r.store, []);
    const html = r.draw();
    expect(backs(html)).toBe(0);
    expect(html).toContain('slash');
  });
});
