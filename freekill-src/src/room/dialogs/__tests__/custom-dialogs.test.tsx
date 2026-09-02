/**
 * The panels a `CustomDialog` asks for, and the payload reader that picks one.
 *
 * THE BUG THIS SUITE IS ABOUT. A player reported that 曹髦's 〖清正〗 "is not
 * implemented and cannot be used". It was two faults stacked:
 *
 *   1. The request arrived EMPTY. `Room:askToCustomDialog` reads `qml_path` and
 *      `extra_data` (`lua/lunarltk/server/room.lua:2838`); every caller in the
 *      shipped packages writes the newer `component = { url, prop }` instead, so
 *      the wire carried `{}` — no component, no properties. Fixed in
 *      `lua/web/roomcompat.lua`; the control below is what the seat used to get.
 *   2. `DialogHost` had no case for `CustomDialog` at all, so even a complete
 *      payload fell through to the "no dialog is implemented" box.
 *
 * Eight skills reach this request — 清正, 共损, 星启, 谋立, 党锢, 榻谟, 五灵,
 * 盗书 — across six components, and all eight were dead seats.
 *
 * WHAT THIS FILE OWNS, and what it deliberately does not. Like every other
 * suite in this directory it renders through `renderToStaticMarkup`, so it can
 * assert what a panel SAYS and whether anything on it can be pressed, but it
 * cannot fire a click. The reply shapes are checked twice elsewhere: the state
 * machines are pure functions from `../custom` and are exercised directly at the
 * bottom of this file, and `src/engine/__tests__/customdialog.test.ts` drives
 * 清正 through a real engine with a real reply and asserts the skill resolves.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { DialogHost } from '../DialogHost';
import {
  cardListProps, cardNamesProps, componentName, daoshuCardId, daoshuProps,
  nameEnabled, namesAutoAccept, readCustomDialog, shiftAt, swapSeats,
  toggleList, toggleName,
} from '../custom';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/**
 * The engine's own strings for the keys these panels use. Every entry is the
 * `zh_CN` value a booted engine returns — `src/engine/__tests__/customdialog.test.ts`
 * asserts each one still translates there, so this table cannot quietly drift
 * into being fiction.
 */
const ZH: Record<string, string> = {
  OK: '确定',
  Cancel: '取消',
  'Clear All': '清空',
  $ChooseCard: '请选择一张卡牌',
  $Hand: '手牌区',
  'Please click to move card': '请点击移动卡牌',

  // 清正 — the suit groups and the prompt 曹髦 is asked with.
  // A suit name is markup, not a glyph: the engine colours the red ones the
  // same way it colours them in the battle log.
  log_spade: '♠', log_club: '♣',
  log_heart: '<font color="#CC3131">♥</font>',
  log_diamond: '<font color="#CC3131">♦</font>',
  mobile_qianlong__qingzheng: '清正',
  ':mobile_qianlong__qingzheng': '持恒技，出牌阶段开始时，你可以选择一名有手牌的其他角色。',
  '#mobile_qianlong__qingzheng-card': '清正：你可以弃置一种花色的手牌，观看一名角色的手牌并弃置其中一种花色',

  // 星启 — a card-name box.
  xingqi: '星启',
  '#xingqi-choose': '星启：请选择一个牌名',
  slash: '杀', jink: '闪', peach: '桃',

  // 党锢 / 榻谟 / 五灵 / 盗书.
  $JieDang: '结党',
  mainGeneral: '主将',
  deputyGeneral: '副将',
  $TaMo: '榻谟',
  'click to exchange': '点击交换',
  'Please arrange WuLing cards': '请拖动分配“五禽戏”的顺序（从左至右）',
  wuling: '五灵',
  wulingHe: '鹤', wulingHu: '虎', wulingXiong: '熊', wulingYuan: '猿', wulingLu: '鹿',
  '#mobile__daoshu-guess': '猜测其中伪装牌名的牌',
  mobile__daoshu: '盗书',
  ':mobile__daoshu': '出牌阶段限一次，你可以选择一名手牌数不少于2的其他角色。',
  changshi__zhangrang: '张让',
  changshi__zhaozhong: '赵忠',
  changshi__bilan: '毕岚',
  caocao: '曹操',
  diaochan: '貂蝉',
};

const stubLua = {
  tr: (key: string) => ZH[key] ?? key,
  getCardData: (cid: number) => ({ cid, name: 'slash', suit: 'spade', number: 7, known: true }),
  getCardExtensionByName: () => 'standard_cards',
  getGeneralData: () => null,
  getIllustrator: () => '',
  cardVisibility: () => true,
  getVirtualEquipData: () => undefined,
  poxiPrompt: () => '',
  poxiFilter: () => true,
  poxiFeasible: () => true,
  chooseGeneralPrompt: () => '',
  chooseGeneralFilter: () => true,
  chooseGeneralFeasible: () => true,
} as unknown as LtkLua;

interface Room {
  store: RoomStore;
  draw: (node?: ReactElement) => string;
}

function room(selfId = 1): Room {
  const store = new RoomStore(selfId);
  const services: RoomServices = {
    store, lua: stubLua, assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: selfId,
    naming: makeNaming(store),
  };
  return {
    store,
    draw: (node) => {
      store.commit();
      return renderToStaticMarkup(
        <RoomProvider value={services}>
          {node ?? <DialogHost onReply={() => {}} interactive />}
        </RoomProvider>,
      );
    },
  };
}

function seat(store: RoomStore, id: number, general: string): void {
  store.applyNotify('AddPlayer', [id, `p${id}`, '']);
  store.applyNotify('PropertyUpdate', [id, 'general', general]);
}

/** Every `<button>` in the markup, with whether it is pressable. */
function buttons(html: string): { label: string; enabled: boolean }[] {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((m) => ({
    label: m[2].replace(/<[^>]*>/g, ''),
    enabled: !/\bdisabled\b/.test(m[1]),
  }));
}

/** What `invariants.mjs:liveness` counts as "something the seat can click" —
 *  an enabled control anywhere in the open dialog, not only in its button row. */
function pressable(html: string): string[] {
  return buttons(html).filter((b) => b.enabled).map((b) => b.label);
}

/* ---------------------------------------------------- 1. the reported bug */

/**
 * 清正's ask, exactly as one measured four-seat game put it on the wire —
 * `>>> CustomDialog seat 1` with 曹髦's hand grouped by suit, one suit empty.
 */
const QINGZHENG = {
  path: 'packages/utility/qml/ChooseCardListBox.qml',
  data: {
    listNames: ['log_spade', 'log_club', 'log_heart', 'log_diamond'],
    listCards: [[107, 123, 92], [90, 66], [120], []],
    min: 1,
    max: 1,
    prompt: '#mobile_qianlong__qingzheng-card',
    allowEmpty: false,
    cancelable: true,
  },
};

describe('清正 opens the box it asks for', () => {
  it('draws the suit groups instead of the "not implemented" notice', () => {
    const r = room();
    r.store.applyNotify('CustomDialog', QINGZHENG);
    const html = r.draw();

    expect(r.store.state.request.kind).toBe('dialog');
    expect(html).not.toContain('has no panel for');
    // Its own prompt, and all four suits with their sizes.
    expect(html).toContain('清正：你可以弃置一种花色的手牌');
    for (const [glyph, n] of [['♠', 3], ['♣', 2], ['♥', 1], ['♦', 0]] as const) {
      expect(html).toContain(`${glyph} (${n})`);
    }
    // Six cards on screen: three spades, two clubs, one heart.
    expect((html.match(/fk-card /g) ?? []).length).toBe(6);
  });

  it('draws a red suit as a suit, not as the tag the engine wrote it with', () => {
    /*
     * `log_heart` is `<font color="#CC3131">♥</font>` — the engine colours the
     * suit, exactly as it does in the battle log. Rendered as text, every red
     * group's caption read `<font color="#CC3131">♥</font> (2)`, which is what
     * a real browser showed. `sanitizeMarkup` is the same allowlist the log
     * passes through before `dangerouslySetInnerHTML`.
     */
    const r = room();
    r.store.applyNotify('CustomDialog', QINGZHENG);
    const html = r.draw();
    expect(html).not.toContain('&lt;font');
    expect(html).toContain('♥ (1)');
  });

  it('gives the seat something to press from the moment it opens', () => {
    // `min: 1` keeps OK dark until a group is taken, so the live controls are
    // the groups themselves and the Cancel the payload allows. Zero of these is
    // the definition of an unanswerable screen.
    const r = room();
    r.store.applyNotify('CustomDialog', QINGZHENG);
    const html = r.draw();
    expect(pressable(html)).toContain('取消');
    // The three non-empty groups are clickable; the empty one is not, because
    // `allowEmpty` is false and its own model would refuse the click.
    expect((html.match(/cursor:pointer/g) ?? []).length).toBe(3);
  });

  it('says what 清正 does, using the skill on the request', () => {
    // The payload does not name the skill — `req.focus_text` does
    // (`room.lua:2835`), broadcast as `MoveFocus`.
    const r = room();
    r.store.applyNotify('MoveFocus', [[1], 'mobile_qianlong__qingzheng', 15000]);
    r.store.applyNotify('CustomDialog', QINGZHENG);
    expect(r.draw()).toContain('持恒技，出牌阶段开始时');
  });

  it('could not, while the wire carried an empty payload', () => {
    /*
     * THE CONTROL, and it is the bug rather than a hypothetical. Before
     * `lua/web/roomcompat.lua` flattened `component` back onto `qml_path` /
     * `extra_data`, this is byte for byte what the client received for 清正 —
     * five times in one four-seat game. Nothing in it says which box to draw,
     * so no panel can be chosen and the seat's only honest move is to decline.
     *
     * If this ever stops going through the unsupported box, the reader has
     * started guessing, and the test above has stopped measuring the fix.
     */
    const r = room();
    r.store.applyNotify('CustomDialog', {});
    const html = r.draw();

    expect(readCustomDialog({})).toBeNull();
    expect(html).toContain('has no panel for');
    expect(html).not.toContain('清正：你可以弃置一种花色的手牌');
    // Still answerable: a dead box is a 30-second freeze, and that was the
    // other half of what the player was seeing.
    expect(pressable(html)).toContain('取消');
  });
});

/* --------------------------------------------------- 2. the other five */

describe('the rest of the CustomDialog panels', () => {
  it('draws card NAMES for 星启, greying the ones outside `choices`', () => {
    const r = room();
    r.store.applyNotify('CustomDialog', {
      path: 'packages/utility/qml/ChooseCardNamesBox.qml',
      data: {
        choices: ['slash', 'jink'],
        allChoices: [['slash', 'jink', 'peach']],
        minNum: 1, maxNum: 1, prompt: '#xingqi-choose',
        cancelable: false, repeatable: false,
      },
    });
    const html = r.draw();

    expect(html).toContain('星启：请选择一个牌名');
    for (const name of ['杀', '闪', '桃']) expect(html).toContain(name);
    // `allChoices` is what is drawn and `choices` is what may be taken;
    // 桃 is outside `choices`, so it is shown and greyed.
    expect((html.match(/fk-card--disabled/g) ?? []).length).toBe(1);
    expect((html.match(/fk-card--enabled/g) ?? []).length).toBe(2);
  });

  it('offers 党锢 a deputy, with the locked candidate unpickable', () => {
    const r = room();
    r.store.applyNotify('CustomDialog', {
      path: 'packages/mobile/qml/JieDangBox.qml',
      data: {
        mainGeneral: 'changshi__zhangrang',
        deputyGenerals: ['changshi__zhaozhong', 'changshi__bilan'],
        disabledGeneral: 'changshi__bilan',
      },
    });
    const html = r.draw();

    expect(html).toContain('结党');
    expect(html).toContain('主将');
    expect(html).toContain('副将');
    // `danggu.lua:66-74` locks the candidate who hates the main general.
    expect((html.match(/cursor:not-allowed/g) ?? []).length).toBe(1);
  });

  it('lists the seats 榻谟 may reorder, in the order it will reply with', () => {
    const r = room();
    seat(r.store, 1, 'caocao');
    seat(r.store, 2, 'diaochan');
    r.store.applyNotify('CustomDialog', {
      path: 'packages/mobile/qml/TaMoBox.qml',
      data: { allPlayerIds: [2, 1], disabledPlayerIds: [1], titleName: '$TaMo' },
    });
    const html = r.draw();

    expect(html).toContain('榻谟');
    // Drawn in the payload's order, which IS the reply (`TaMoBox.qml:148`).
    expect(html.indexOf('貂蝉')).toBeLessThan(html.indexOf('曹操'));
    // The shown lord is locked (`tamo.lua:34-38`).
    expect((html.match(/fk-card--disabled/g) ?? []).length).toBe(1);
    // OK is live from the start: the identity seating is a legal answer.
    expect(pressable(html)).toContain('确定');
  });

  it("hard-codes 五灵's five tokens, because the payload is empty", () => {
    const r = room();
    r.store.applyNotify('CustomDialog', {
      path: 'packages/mobile/qml/WuLingBox.qml',
      data: {},
    });
    const html = r.draw();

    expect(html).toContain('请拖动分配');
    // `wuling.lua:126` sends `prop = {}`; the names are the component's own
    // default (`WuLingBox.qml:14`) and the question is only their order.
    for (const token of ['鹤', '虎', '熊', '猿', '鹿']) expect(html).toContain(token);
    expect(pressable(html)).toContain('确定');
  });

  it('shows 盗书 the disguised hand with the fake wearing its planted name', () => {
    const r = room();
    r.store.applyNotify('CustomDialog', {
      component: {
        url: 'packages/mobile/qml/DaoShuBox.qml',
        prop: {
          cards: [11, { extension: 'standard_cards', number: 5, suit: 'heart', color: 'red' }, 13],
          fake_index: 1,
          fake_name: 'peach',
        },
      },
    });
    const html = r.draw();

    expect(html).toContain('猜测其中伪装牌名的牌');
    // Three cards, one of them the planted 桃.
    expect((html.match(/fk-card /g) ?? []).length).toBe(3);
    expect(html).toContain('桃');
    // OK stays dark until a guess is made; the cards are what is pressable.
    expect(buttons(html).find((b) => b.label === '确定')?.enabled).toBe(false);
  });

  it('declines a component nobody has read, by name', () => {
    const r = room();
    r.store.applyNotify('CustomDialog', {
      path: 'packages/utility/qml/ChooseGeneralSkillsBox.qml',
      data: { skills: ['x'] },
    });
    const html = r.draw();
    expect(html).toContain('ChooseGeneralSkillsBox');
    expect(pressable(html)).toContain('取消');
  });
});

/* ------------------------------------------------- 3. reading the payload */

describe('reading a CustomDialog payload', () => {
  it('accepts the flattened shape askToCustomDialog sends', () => {
    expect(readCustomDialog(QINGZHENG)).toEqual({
      path: 'packages/utility/qml/ChooseCardListBox.qml',
      prop: QINGZHENG.data,
    });
  });

  it("accepts 盗书's raw component, which no server-side flattening reaches", () => {
    // `Request:new(friends, "CustomDialog")` with the component verbatim
    // (`mobile_daoshu.lua:102`).
    const spec = readCustomDialog({
      component: { url: 'packages/mobile/qml/DaoShuBox.qml', prop: { fake_index: 2 } },
    });
    expect(spec?.path).toBe('packages/mobile/qml/DaoShuBox.qml');
    expect(spec?.prop).toEqual({ fake_index: 2 });
  });

  it('unwraps the model layer the utility helpers add', () => {
    const spec = readCustomDialog({
      component: {
        url: 'packages/utility/qml/ChooseCardListBox.qml',
        model: { url: 'models/ChooseCardListModel.qml', prop: { min: 1 } },
      },
    });
    expect(spec?.prop).toEqual({ min: 1 });
  });

  it('reads an empty prop table, which Lua encodes as an empty array', () => {
    // 五灵 sends `prop = {}`, and `json.encode` of an empty Lua table is `[]`.
    const spec = readCustomDialog({ path: 'packages/mobile/qml/WuLingBox.qml', data: [] });
    expect(spec?.prop).toEqual({});
  });

  it('refuses a payload with no component at all', () => {
    expect(readCustomDialog({})).toBeNull();
    expect(readCustomDialog(null)).toBeNull();
    expect(readCustomDialog({ data: { min: 1 } })).toBeNull();
  });

  it('names the component the way the panel table is keyed', () => {
    expect(componentName('packages/utility/qml/ChooseCardListBox.qml')).toBe('ChooseCardListBox');
    expect(componentName('WuLingBox.qml')).toBe('WuLingBox');
  });
});

/* ----------------------------------------------- 4. what a click may do */

describe('the selection rules, against the QML they came from', () => {
  const p = cardListProps(QINGZHENG.data);

  it('lines the card lists up with the names by index', () => {
    expect(p.listCards).toEqual([[107, 123, 92], [90, 66], [120], []]);
  });

  it('takes one list and drops it again', () => {
    expect(toggleList([], 'log_spade', 3, p)).toEqual(['log_spade']);
    expect(toggleList(['log_spade'], 'log_spade', 3, p)).toEqual([]);
  });

  it('refuses an empty list unless the caller allowed one', () => {
    // `ChooseCardListModel.qml:toggleList` — `(cardNum || allowEmpty)`. 清正
    // sends `allowEmpty: false`, so a suit you hold none of cannot be discarded.
    expect(toggleList([], 'log_diamond', 0, p)).toEqual([]);
    expect(toggleList([], 'log_diamond', 0, { ...p, allowEmpty: true })).toEqual(['log_diamond']);
  });

  it('stops at `max`, rather than dropping the oldest pick', () => {
    expect(toggleList(['log_spade'], 'log_club', 2, p)).toEqual(['log_spade']);
    expect(toggleList(['log_spade'], 'log_club', 2, { ...p, max: 2 }))
      .toEqual(['log_spade', 'log_club']);
  });

  const names = cardNamesProps({
    choices: ['slash', 'jink'], allChoices: [['slash', 'jink', 'peach']],
    minNum: 1, maxNum: 2, prompt: '', cancelable: false, repeatable: false,
  });

  it('enables only names inside `choices`', () => {
    expect(nameEnabled([], 'slash', names)).toBe(true);
    expect(nameEnabled([], 'peach', names)).toBe(false);
    expect(toggleName([], 'peach', names)).toEqual([]);
  });

  it('lets a repeatable box take the same name twice', () => {
    const rep = { ...names, repeatable: true };
    expect(toggleName(['slash'], 'slash', rep)).toEqual(['slash', 'slash']);
    // …and a plain one toggles it off instead.
    expect(toggleName(['slash'], 'slash', names)).toEqual([]);
  });

  it('answers on the click when the ask is a forced single pick', () => {
    // `ChooseCardNamesModel.qml:toggleChoose` fires `accepted()` itself, and
    // the box then hides its whole button row — so without this the three
    // skills that ask this way would have nothing to send with.
    const forced = { ...names, minNum: 1, maxNum: 1, cancelable: false };
    expect(namesAutoAccept(['slash'], forced)).toBe(true);
    expect(namesAutoAccept(['slash'], { ...forced, cancelable: true })).toBe(false);
    expect(namesAutoAccept([], forced)).toBe(false);
  });

  it('trades two seats without disturbing the rest', () => {
    expect(swapSeats([4, 1, 2, 3], 4, 2)).toEqual([2, 1, 4, 3]);
    expect(swapSeats([4, 1, 2, 3], 4, 4)).toEqual([4, 1, 2, 3]);
    expect(swapSeats([4, 1, 2, 3], 4, 9)).toEqual([4, 1, 2, 3]);
  });

  it('shifts one token along its row and clamps at the ends', () => {
    expect(shiftAt(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(shiftAt(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(shiftAt(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });

  it('answers 盗书 with a card id, and with 0 for the planted card', () => {
    // `DaoShuBox.qml:38` gives the fake `cardId: 0`, and 盗书 reads a reply of
    // 0 as a correct guess (`mobile_daoshu.lua:126`).
    const d = daoshuProps({ cards: [11, { suit: 'heart' }, 13], fake_index: 1, fake_name: 'peach' });
    expect(d.cards.map(daoshuCardId)).toEqual([11, 0, 13]);
  });
});
