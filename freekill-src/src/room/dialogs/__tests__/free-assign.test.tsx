/**
 * 自由选将 — choosing your own general instead of taking what you were dealt.
 *
 * The thing worth pinning down here is the *gate*, because the engine has none.
 * `enableFreeAssign` is read server-side in exactly one place — to stop the
 * game counting towards win rates (`lua/server/roombase.lua:298`) — and the
 * reply to `AskForGeneral` is never checked against the offer at any point on
 * the way in. So whether this UI appears is the whole of the feature's
 * discipline, and it has to come from the room the host actually opened rather
 * than from a default in the client.
 *
 * That value reaches the room down one path and only one: `EnterRoom`'s third
 * element, which the store used to discard. These tests cover both ends of it.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import type { RoomMode } from '../../../contract/views';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { DialogHost } from '../DialogHost';
import { freeAssignEnabled } from '../FreeAssign';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

const OFFER = ['caocao', 'liubei', 'sunquan'];

const stubLua = {
  tr: (key: string) => key,
  getGeneralData: (name: string) => ({ name, hp: 4, maxHp: 4, extension: 'standard' }),
  getIllustrator: () => '',
  chooseGeneralPrompt: () => '',
  chooseGeneralFilter: () => true,
  chooseGeneralFeasible: () => true,
  searchGenerals: () => ['zhangfei', 'guanyu'],
} as unknown as LtkLua;

function ask(settings: Record<string, unknown>, mode: RoomMode = 'play'): string {
  const store = new RoomStore(1);
  // The wire, as the engine sends it: capacity, timeout, settings.
  store.applyNotify('EnterRoom', [8, 15, settings]);
  store.applyNotify('AskForGeneral', [OFFER, 1, false, false, 'askForGeneralsChosen', { n: 1 }]);
  store.commit();
  const services: RoomServices = {
    store, lua: stubLua, assets: new Assets(EMPTY_MANIFEST), mode, meId: mode === 'play' ? 1 : null,
    naming: makeNaming(store),
  };
  return renderToStaticMarkup(
    <RoomProvider value={services}>
      <DialogHost onReply={() => {}} interactive={mode === 'play'} />
    </RoomProvider>,
  );
}

const swaps = (html: string): number => (html.match(/fk-general__swap/g) ?? []).length;

/* ---------------------------------------------------- the setting's journey */

describe('the room settings a seat is told about', () => {
  it('keeps what EnterRoom sent', () => {
    const store = new RoomStore(1);
    store.applyNotify('EnterRoom', [8, 15, { enableFreeAssign: true, generalNum: 3 }]);
    expect(store.state.settings.enableFreeAssign).toBe(true);
    expect(store.state.settings.generalNum).toBe(3);
    expect(store.state.playerNum).toBe(8);
  });

  it('starts empty and stays a plain object whatever arrives', () => {
    expect(new RoomStore(1).state.settings).toEqual({});
    for (const junk of [undefined, null, 'nope', 7, ['a']]) {
      const store = new RoomStore(1);
      store.applyNotify('EnterRoom', [8, 15, junk]);
      expect(store.state.settings).toEqual({});
      // The capacity still lands: a malformed settings blob must not cost the
      // room the one number the ring is laid out from.
      expect(store.state.playerNum).toBe(8);
    }
  });

  it('reads the switch the way the engine writes it', () => {
    expect(freeAssignEnabled({ enableFreeAssign: true })).toBe(true);
    expect(freeAssignEnabled({ enableFreeAssign: false })).toBe(false);
    expect(freeAssignEnabled({})).toBe(false);
    // Not truthiness: the setting travels through CBOR and JSON and a string
    // "false" is exactly the shape that would turn this on by accident.
    expect(freeAssignEnabled({ enableFreeAssign: 'false' })).toBe(false);
    expect(freeAssignEnabled({ enableFreeAssign: 1 })).toBe(false);
  });
});

/* ------------------------------------------------------------- the offering */

describe('the choose-general box', () => {
  it('offers no free assign in an ordinary room', () => {
    const html = ask({ enableFreeAssign: false });
    expect(html).toContain('fk-general');
    expect(swaps(html)).toBe(0);
    expect(html).not.toContain('Enable free assign');
  });

  it('offers it on every card when the room was opened with it', () => {
    const html = ask({ enableFreeAssign: true });
    expect(swaps(html)).toBe(OFFER.length);
  });

  it('says so in the title, as the Qt client does', () => {
    // `ChooseGeneralBox.qml:29` appends `(自由选将)`. Without it nothing tells
    // a player this room does not count.
    expect(ask({ enableFreeAssign: true })).toContain('(Enable free assign)');
  });

  it('offers nothing to a seat that is not picking', () => {
    // An observer watching somebody else choose has no general to assign.
    expect(swaps(ask({ enableFreeAssign: true }, 'observe'))).toBe(0);
  });

  it('still draws the engine\'s own offer, not a roster', () => {
    // Free assign substitutes into the offer; it does not replace the offer
    // with all 274 generals. The dialog the seat opens on is the same one.
    const html = ask({ enableFreeAssign: true });
    for (const g of OFFER) expect(html).toContain(g);
    expect(html).not.toContain('zhangfei');
  });
});
