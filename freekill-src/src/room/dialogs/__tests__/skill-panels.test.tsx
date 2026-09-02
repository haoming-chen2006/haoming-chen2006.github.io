/**
 * What a skill panel says, and whether the seat can answer it.
 *
 * Three things a player reported, all of them true, all of them checked here
 * against the real store and the real component tree in the style of
 * `poxi-visibility` and `card-chosen-target`:
 *
 *   1. IDENTIFIERS ON SCREEN. `mobile__lvfan`, `#qusheng_3_prompt`, an option
 *      printed as `key::5:2`, a poxi heading with a literal `%src` and a
 *      dangling player id. Every one of these is a string that reached a button
 *      face or a title without going through the formatting the Qt client puts
 *      it through (`Util.processPrompt`, `Fk/Base/Util.qml:47`).
 *   2. OPTIONS THAT SAY NOTHING. A choice is an i18n key; translated it is a
 *      two-character allusion. The engine ships the rules text as `:<key>` and
 *      `DetailedChoiceBox.qml` already draws it.
 *   3. PANELS WITH NOTHING TO PRESS. `AskForCardsAndChoice` and
 *      `AskForMoveCardInBoard` had no case in `DialogHost` at all and fell
 *      through to a JSON dump with no buttons — a guaranteed 30-second freeze,
 *      and the campaign's standing liveness FAIL (`scripts/audit/catalogue.mjs`).
 *
 * WHERE THE WIRE SHAPE IS CHECKED, since it is deliberately not here. There is
 * no DOM in this suite — every dialog test in this directory renders through
 * `renderToStaticMarkup`, so a click cannot be fired and a reply cannot be
 * observed. The payloads these two new panels send (`{cards, choice}` and
 * `{cardId, pos}`) are checked against a REAL engine in
 * `src/engine/__tests__/multiseat.test.ts`, which plays whole games with the
 * mobile generals that raise them and asserts the answers keep the game moving.
 * What this file owns is the other half, and the half a player sees: what is
 * written on the panel, and whether anything on it can be pressed. "Can be
 * pressed" is asserted exactly the way `scripts/audit/invariants.mjs` measures
 * it — an enabled button inside `.fk-dialog__actions`.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import { ConfirmBar } from '../../components/ConfirmBar';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { DialogHost } from '../DialogHost';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/**
 * The engine's own table, for the keys these panels are built out of.
 *
 * Every value below is copied from `src/room/dev/data/lua-data.json`'s `zh_CN`
 * — the dump `src/room/__tests__/i18n.test.ts` already treats as the source of
 * truth — or is a plausible package entry of the same shape. A blanket identity
 * `tr` cannot be used for this suite: the faults under test are all about
 * substitution INTO a template, and with no templates every substitution
 * trivially "passes" by producing nothing.
 *
 * Any key not listed comes back as itself, which is what `Fk:translate` does
 * with a key nobody defined — so an assertion that a raw key is absent is a
 * real assertion, not an artefact of the stub.
 */
const ZH: Record<string, string> = {
  $Choice: '%1：请选择',
  $ChooseCard: '请选择一张卡牌',
  $ChooseCards: '请选择%1至%2张卡牌',
  $Hand: '手牌区',
  OK: '确定',
  Cancel: '取消',
  'Please click to move card': '请点击移动卡牌',
  '#AskForSkillInvoke': '你想发动〖%1〗吗？',

  // 孙权's 制衡, and an option built the way a skill builds one that carries
  // arguments: `Room:askToChoice` puts the raw string on the wire and the box
  // is expected to format it.
  zhiheng: '制衡',
  ':zhiheng': '出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。',
  give_to_target: '将牌交给%dest',

  // 曲盛 — an `askToChoices` caller whose prompt key is its own string. The
  // multi-choice payload puts the skill at index 4 and the prompt at index 5.
  qusheng: '曲盛',
  ':qusheng': '每回合限一次，你可以选择至多两项。',
  '#qusheng_3_prompt': '请选择至多两项',

  // 貂蝉, so a `%src` / `%dest` substitution has a real name to land.
  diaochan: '貂蝉',
  caocao: '曹操',

  // 护驾 — the skill the fire panel asks about below.
  hujia: '护驾',
  ':hujia': '主公技，当你需要使用或打出【闪】时，你可以令其他魏势力角色打出一张【闪】。',

  // 观星-style poxi, and 顺手牵羊's card box.
  zhenxing: '整形',
  ':zhenxing': '你可以将一张牌置于牌堆顶。',
  snatch_skill: '顺手牵羊',
};

const stubLua = {
  tr: (key: string) => ZH[key] ?? key,
  getCardData: (cid: number) => ({ cid, name: 'slash', suit: 'spade', number: 7, known: true }),
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

function room(lua: LtkLua = stubLua, selfId = 1): Room {
  const store = new RoomStore(selfId);
  const services: RoomServices = {
    store, lua, assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: selfId,
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

/** Seat `id` as `general`, the way the engine fills a photo in before it asks. */
function seat(store: RoomStore, id: number, general: string): void {
  store.applyNotify('AddPlayer', [id, `p${id}`, '']);
  store.applyNotify('PropertyUpdate', [id, 'general', general]);
}

/* ------------------------------------------------------------------ helpers */

/** Every `<button>` in the markup, with whether it is pressable. */
function buttons(html: string): { label: string; enabled: boolean }[] {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((m) => ({
    label: m[2].replace(/<[^>]*>/g, ''),
    enabled: !/\bdisabled\b/.test(m[1]),
  }));
}

/**
 * What `invariants.mjs:liveness` counts: an enabled control in the panel's own
 * action row. Zero of these is the definition of "nothing the seat can click".
 */
function pressableActions(html: string): string[] {
  const row = /<div class="fk-dialog__actions">([\s\S]*?)<\/div><\/div><\/div>/.exec(html);
  return row ? buttons(row[1]).filter((b) => b.enabled).map((b) => b.label) : [];
}

/* ------------------------------------------------------- 1. reading a choice */

describe('a choice panel a player can read', () => {
  /** `RoomLogic.js:931` — [choices, all_choices, skill, prompt, detailed]. */
  const askChoice = (store: RoomStore, choices: string[], skill = 'zhiheng', prompt = '') => {
    store.applyNotify('AskForChoice', [choices, choices, skill, prompt, false]);
  };

  it('formats an option that carries arguments instead of printing the key', () => {
    // `give_to_target::3` is the ordinary way a skill says "give them to 貂蝉":
    // field 0 is the i18n key, field 2 is `%dest`. `ChoiceBox.qml:33` renders
    // every option through `processPrompt`; this box used `tr()`, which does not
    // split on `:` and put the whole string on the button face.
    const r = room();
    seat(r.store, 3, 'diaochan');
    askChoice(r.store, ['give_to_target::3']);
    const html = r.draw();

    expect(html).toContain('将牌交给貂蝉');
    expect(html).not.toContain('give_to_target::3');
    expect(html).not.toContain('%dest');
  });

  it('says what each option does, not just what it is called', () => {
    const r = room();
    askChoice(r.store, ['zhiheng']);
    const html = r.draw();

    expect(html).toContain('制衡');
    // `:zhiheng` — the paragraph the general's own card prints.
    expect(html).toContain('出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。');
  });

  it('leaves an option with no description as its name alone', () => {
    // An honest gap. The packages do not write `:` entries for every option and
    // a missing one must show nothing, never the `:key` the engine echoes back.
    const r = room();
    askChoice(r.store, ['some_unnamed_option']);
    const html = r.draw();
    expect(html).toContain('some_unnamed_option');
    expect(html).not.toContain(':some_unnamed_option');
  });

  it('heads a multi-choice panel with the skill, not with the prompt key', () => {
    // `RoomLogic.js:962` — [choices, all, [min,max], cancelable, skill, prompt,
    // detailed]. The skill is index 4 and the prompt is index 5; this box read
    // index 5 for both, so the heading was a raw prompt key.
    const r = room();
    r.store.applyNotify('AskForChoices', [
      ['zhiheng'], ['zhiheng'], [1, 2], true, 'qusheng', '#qusheng_3_prompt', false,
    ]);
    const html = r.draw();

    expect(html).toContain('曲盛：请选择');
    expect(html).not.toContain('#qusheng_3_prompt');
    // The prompt key still renders — as the prompt, translated.
    expect(html).toContain('请选择至多两项');
    // And the panel says what 曲盛 does.
    expect(html).toContain('每回合限一次，你可以选择至多两项。');
  });
});

/* --------------------------------------------------------------- 2. the poxi */

describe('the poxi panel heading', () => {
  it('puts the player into the prompt instead of printing %src and an id', () => {
    /*
     * `PoxiPrompt` is `Fk:translate(poxi.prompt(...))` and a poxi method builds
     * its prompt by translating a template and then APPENDING arguments —
     * `return ret .. ":" .. extra_data.to` (`packages/standard/aux_poxi.lua`).
     * `Fk:translate` cannot match that as a key and hands it straight back, so
     * `PoxiBox.qml:13` runs `Util.processPrompt` over it. This box ran `tr()`.
     */
    const lua = {
      ...stubLua,
      tr: (key: string) => ZH[key] ?? key,
      poxiPrompt: () => '整形：请选择%src的一张牌:3',
      poxiFilter: () => true,
      poxiFeasible: () => true,
    } as unknown as LtkLua;

    const r = room(lua);
    seat(r.store, 3, 'diaochan');
    r.store.applyNotify('AskForPoxi', {
      type: 'zhenxing',
      data: [['$Hand', [11]]],
      extra_data: { to: 3, min: 1, max: 1 },
      cancelable: true,
    });
    const html = r.draw();

    expect(html).toContain('整形：请选择貂蝉的一张牌');
    expect(html).not.toContain('%src');
    expect(html).not.toContain('的一张牌:3');
    // And the poxi type is a skill, so the panel can say what it is for.
    expect(html).toContain('你可以将一张牌置于牌堆顶。');
  });
});

/* -------------------------------------------- 3. the two panels that were not */

describe('see cards, then decide (AskForCardsAndChoice)', () => {
  /** `Room:askToChooseCardsAndChoice` (`room.lua:968`). */
  const ask = (store: RoomStore, over: Partial<Record<string, unknown>> = {}) => {
    store.applyNotify('AskForCardsAndChoice', {
      cards: [11, 12],
      choices: ['zhiheng'],
      cancel_choices: ['Cancel'],
      disabled: [],
      min: 1,
      max: 1,
      prompt: '',
      extra_data: { skillName: 'zhiheng' },
      ...over,
    });
  };

  it('opens a panel at all', () => {
    const r = room();
    ask(r.store);
    const html = r.draw();
    expect(r.store.state.request.kind).toBe('dialog');
    // Not the `UnknownRequest` JSON dump this used to fall through to.
    expect(html).not.toContain('No dialog is implemented');
    expect(html).toContain('fk-dialog');
  });

  it('always gives the seat something it can press', () => {
    // THE LIVENESS FAIL, stated the way the campaign states it. With `min: 1`
    // the choice buttons are correctly dark until a card is taken — so if the
    // cancel branch were not offered there would be a window with nothing at
    // all to click, which is what `invariants.mjs` reports as unanswerable.
    const r = room();
    ask(r.store);
    expect(pressableActions(r.draw())).not.toHaveLength(0);
  });

  it('offers the read-only viewer its button immediately', () => {
    // `Room:askToViewCardsAndChoice` pins `min_num = max_num = 0`
    // (`room.lua:932`): nothing to select, so OK must be live on arrival.
    const r = room();
    ask(r.store, { min: 0, max: 0, choices: ['OK'], cancel_choices: [], prompt: '$ViewCards' });
    expect(pressableActions(r.draw())).toContain('确定');
  });

  it('shows every card it was given, and says what the choice does', () => {
    const r = room();
    ask(r.store);
    const html = r.draw();
    expect((html.match(/fk-card /g) ?? []).length).toBe(2);
    expect(html).toContain('制衡');
    expect(html).toContain('出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。');
  });

  it('finds the asking skill on the request when the payload omits it', () => {
    /*
     * The real path, and the reason this box has to look outside its payload.
     * `askToChooseCardsAndChoice` puts the skill on the REQUEST — `req.focus_text
     * = skillname` (`room.lua:983`) — and `Request:_sendPacket` broadcasts it as
     * `MoveFocus`'s text (`request.lua:220`). Nothing in `data` carries it, so a
     * box that read only `extra_data` would name the skill for the handful of
     * callers that duplicate it there and stay silent for the rest.
     */
    const r = room();
    r.store.applyNotify('MoveFocus', [[1], 'zhiheng', 15000]);
    ask(r.store, { extra_data: {} });
    expect(r.draw()).toContain('出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。');
  });

  it('ignores a focus that belongs to another seat', () => {
    const r = room();
    r.store.applyNotify('MoveFocus', [[2], 'zhiheng', 15000]);
    ask(r.store, { extra_data: {}, choices: ['OK'] });
    expect(r.draw()).not.toContain('出牌阶段限一次');
  });

  it('greys the cards the skill excluded rather than offering them', () => {
    // `all_cards` minus `cards` arrives as `disabled` (`room.lua:976`).
    const r = room();
    ask(r.store, { disabled: [12] });
    const html = r.draw();
    expect(html).toContain('opacity:0.55');
  });
});

describe('moving a card between two players (AskForMoveCardInBoard)', () => {
  const ask = (store: RoomStore) => {
    store.applyNotify('AskForMoveCardInBoard', {
      cards: [11, 12],
      cardsPosition: [0, 1],
      generalNames: ['caocao', 'diaochan'],
      playerIds: [2, 3],
    });
  };

  it('opens a panel with both players named and an answer available', () => {
    const r = room();
    ask(r.store);
    const html = r.draw();

    expect(html).not.toContain('No dialog is implemented');
    expect(html).toContain('请点击移动卡牌');
    // `generalNames` arrive as raw engine names and must be translated —
    // `RoomLogic.js:1125` splits a `general/deputy` pair and translates each.
    expect(html).toContain('曹操');
    expect(html).toContain('貂蝉');
    expect(html).not.toContain('caocao');
    // Cancel is a real answer here: the engine reads `''` and moves a random
    // card (`room.lua:2941`), so the seat is never trapped.
    expect(pressableActions(html)).toContain('取消');
  });

  it('starts every card on the side the payload put it on', () => {
    const r = room();
    ask(r.store);
    const html = r.draw();
    const zones = [...html.matchAll(/<div class="fk-zone"[\s\S]*?<\/div><\/div>/g)].map((m) => m[0]);
    expect(zones).toHaveLength(2);
    // One card each, as `cardsPosition: [0, 1]` says.
    for (const z of zones) expect((z.match(/fk-card /g) ?? []).length).toBe(1);
  });

  it('keeps OK dark until a card has actually been moved', () => {
    const r = room();
    ask(r.store);
    // Nothing picked yet, so the only live action is the decline.
    expect(pressableActions(r.draw())).toEqual(['取消']);
  });
});

describe('a request this build has no panel for', () => {
  it('can be declined instead of freezing the seat for the whole timeout', () => {
    // A `CustomDialog` naming a component nobody has read. Six of them now have
    // panels (`../CustomDialogs`); `ChooseSkillBox` is one no roster skill
    // raises, so it stays here. A box with no button is a guaranteed 30-second
    // stall; `''` is what the timeout would have sent anyway
    // (`Request:getResult`).
    const r = room();
    r.store.applyNotify('CustomDialog', { path: 'ChooseSkillBox.qml', data: {} });
    const html = r.draw();
    expect(html).toContain('has no panel for');
    // Named, so a bug report can say WHICH component — and not a JSON dump,
    // which reads as a crash to the player looking at it.
    expect(html).toContain('ChooseSkillBox');
    expect(pressableActions(html)).toContain('取消');
  });
});

/* ------------------------------------------------------------ 4. fire panel */

describe('the panel that asks whether to fire a skill', () => {
  it('writes what the skill does, not only its name', () => {
    // `#AskForSkillInvoke` is "你想发动〖%1〗吗？" and `%1` is a two-character
    // allusion. Upstream stops there (`RoomLogic.js:829`); the text is one
    // lookup away and is what the general's card prints.
    const r = room();
    r.store.applyNotify('AskForSkillInvoke', ['hujia']);
    const html = r.draw(<ConfirmBar />);

    expect(html).toContain('你想发动〖护驾〗吗？');
    expect(html).toContain('主公技，当你需要使用或打出【闪】时');
  });

  it('says nothing extra when the packages never described the skill', () => {
    const r = room();
    r.store.applyNotify('AskForSkillInvoke', ['no_such_skill']);
    const html = r.draw(<ConfirmBar />);
    expect(html).toContain('你想发动〖no_such_skill〗吗？');
    // The gap is a gap. `Fk:translate` echoes an unknown key, and echoing it
    // onto the panel is the leak this whole lane exists to close.
    expect(html).not.toContain(':no_such_skill');
    expect(html).not.toContain('fk-detail-line');
  });

  it('leaves the ordinary "play a Jink" prompt alone', () => {
    // `promptArg` also carries a CARD name for AskForUseCard / AskForResponseCard.
    // The rules text for 闪 under every Slash is noise, not help.
    const r = room();
    r.store.applyNotify('AskForResponseCard', ['jink', '']);
    const html = r.draw(<ConfirmBar />);
    expect(html).not.toContain('fk-detail-line');
  });
});
