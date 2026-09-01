/**
 * Reading a general before picking it.
 *
 * 选将 used to put three portraits, three names and three HP totals in front of
 * a player and ask them to commit. With the standard 25 that is a memory test;
 * with the 319-general pool now landing it is a coin toss, and a compulsory
 * skill — which never animates, never logs an invocation, and is very often the
 * entire reason to take a general — was unreadable from the room at all.
 *
 * These are the checks on the box that fixes it, and on the two things it must
 * not do on the way: decide anything about the general's skills for itself, and
 * disturb the request it is opened over.
 *
 * Rendered, not reasoned about: `renderToStaticMarkup` runs the real component
 * tree over a real `RoomStore` fed a real `AskForGeneral`, so what is asserted
 * is what the room would put on screen. There is no DOM in this project's test
 * environment, so a click is asserted by the handler being wired and by the
 * pure list-shaping function being exported — not by dispatching an event.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import { GeneralDetail, readSkills } from '../GeneralDetail';
import type { GeneralDetail as GeneralDetailData } from '../../ltk/types';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { DialogHost } from '../DialogHost';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/**
 * One general with the four kinds of skill that have to survive the trip, taken
 * from names that really ship in this build:
 *
 *  - `paoxiao`, a 锁定技. Its text is the only place a player will ever read it.
 *  - `mobile__lianzhu`, a namespaced package skill. The dashboard lane shipped a
 *    `!name.includes('__')` filter once and it silently deleted every one of
 *    these; nothing here may repeat that.
 *  - `spear_skill&`, the 丈八蛇矛 view-as skill — another name shape that a
 *    tidy-looking filter would eat.
 *  - `#paoxiao_hidden`, upstream's marker for an internal sub-skill with no
 *    player-facing text (`GeneralDetailPage.qml:104` drops these).
 */
const SKILLS: GeneralDetailData['skill'] = [
  { name: 'paoxiao', description: '锁定技，出牌阶段，你使用【杀】无次数限制。', is_related_skill: false },
  { name: 'mobile__lianzhu', description: 'Once per turn, you may swap a hand card with another player.', is_related_skill: false },
  { name: 'spear_skill&', description: 'You can use two hand cards as a Slash.', is_related_skill: true },
  { name: '#paoxiao_hidden', description: ':#paoxiao_hidden', is_related_skill: false },
];

const DETAIL: GeneralDetailData = {
  package: 'standard', extension: 'standard', kingdom: 'shu',
  hp: 4, maxHp: 4, shield: 0, gender: 1,
  skill: SKILLS, companions: ['guanyu'],
  headnote: '#zhangfei_headnote', endnote: '',
};

/** Everything the box asks the engine for, answered locally. `tr` is the
 *  identity so an assertion can name the key it expects to see rendered. */
function stub(over: Partial<Record<string, unknown>> = {}): LtkLua {
  return {
    tr: (key: string) => key,
    getGeneralData: () => ({ extension: 'standard', hp: 4, maxHp: 4, kingdom: 'shu', package: 'standard', shield: 0 }),
    getGeneralDetail: () => DETAIL,
    getIllustrator: () => 'KayaK',
    chooseGeneralPrompt: () => '#AskForGeneral',
    chooseGeneralFilter: () => true,
    chooseGeneralFeasible: (_rule: string, selected: readonly string[]) => selected.length === 1,
    ...over,
  } as unknown as LtkLua;
}

function room(lua: LtkLua = stub()): { store: RoomStore; draw: (node: React.ReactNode) => string } {
  const store = new RoomStore(1);
  const services: RoomServices = {
    store, lua, assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: 1, naming: makeNaming(store),
  };
  const draw = (node: React.ReactNode) => {
    store.commit();
    return renderToStaticMarkup(<RoomProvider value={services}>{node}</RoomProvider>);
  };
  return { store, draw };
}

/** The wire, as `aux_choose_general.lua` puts an `AskForGeneral` on it. */
function offerGenerals(store: RoomStore, generals: string[] = ['zhangfei', 'caocao', 'diaochan']): void {
  store.applyNotify('AskForGeneral', [generals, 1, false, false, 'askForGeneralsChosen', { n: 1 }]);
}

describe('the general-detail box', () => {
  it('shows every skill the engine lists, whatever its name looks like', () => {
    const { draw } = room();
    const html = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);

    // The 锁定技 — name and full rules text. A compulsory skill never animates
    // an invocation, so this box is the only place it is ever readable.
    expect(html).toContain('paoxiao');
    expect(html).toContain('锁定技，出牌阶段，你使用【杀】无次数限制。');

    // The namespaced one, whole. `mobile__lianzhu` is exactly the name that a
    // `!name.includes('__')` filter deleted from the dashboard.
    expect(html).toContain('mobile__lianzhu');
    expect(html).toContain('Once per turn, you may swap a hand card with another player.');

    // The derived skill, and the view-as name shape with it.
    expect(html).toContain('spear_skill&amp;');
    expect(html).toContain('You can use two hand cards as a Slash.');
  });

  it('leaves out only the internal sub-skill upstream marks with #', () => {
    const { draw } = room();
    const html = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);
    expect(html).not.toContain('paoxiao_hidden');
  });

  it('never decides which skills a general has — it renders the list it is given', () => {
    // `readSkills` is the whole of the room's opinion about the engine's list,
    // and the opinion is "render it". Two names that a shape rule would drop
    // and a derived skill all survive; only a `#` entry with no text at all —
    // a missing `:key`, echoed back by `Fk:translate` — is left out.
    const kept = readSkills({ skill: SKILLS }).map((s) => s.name);
    expect(kept).toEqual(['paoxiao', 'mobile__lianzhu', 'spear_skill&']);

    // A `#` skill that DOES carry rules text is kept: the drop rule can never
    // hide something a player needs to read.
    expect(readSkills({
      skill: [{ name: '#real', description: 'It does something.', is_related_skill: false }],
    })).toHaveLength(1);

    // An engine that answers nothing is an empty box, not a crash.
    expect(readSkills(undefined)).toEqual([]);
    expect(readSkills({})).toEqual([]);
  });

  it('scrolls its skill list rather than growing past the dialog', () => {
    // 319 generals are in the pool and the longest of them carry six skills with
    // a paragraph each. `.fk-dialog` caps at 86% of the room; without an inner
    // scroller the OK button goes off the bottom of the screen.
    const { draw } = room();
    const html = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);
    expect(html).toMatch(/fk-detail__skills[^>]*overflow-y:\s*auto/);
  });

  it('carries the credits and notes the packages ship inline', () => {
    // `illustrator:<name>` and friends are ordinary i18n keys the packages ship
    // inline; `Fk:translate` echoes back the ones nobody defined, and a credit
    // nobody defined is worth less than the line it would take.
    const table: Record<string, string> = { 'illustrator:zhangfei': 'KayaK', '#zhangfei': 'Man of Yan' };
    const { draw } = room(stub({ tr: (key: string) => table[key] ?? key }));
    const html = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);

    expect(html).toContain('KayaK');                  // Illustrator, resolved
    expect(html).toContain('Man of Yan');              // Title, resolved
    expect(html).not.toContain('designer:zhangfei');   // undefined, so left out
    expect(html).not.toContain('cv:zhangfei');
    expect(html).toContain('#zhangfei_headnote');      // the flavour headnote
    expect(html).toContain('Companions');
    expect(html).toContain('guanyu');
  });

  it('goes through lua.tr for every string, so the language toggle reaches it', () => {
    // Nothing is hardcoded in either language: swap the translator and the whole
    // box changes with it. This is `withLanguage(client, getLanguage)` at the
    // seam — the box only ever asks `lua.tr`.
    const { draw } = room(stub({ tr: (key: string) => `EN[${key}]` }));
    const html = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);
    expect(html).toContain('EN[zhangfei]');
    expect(html).toContain('EN[paoxiao]');
    expect(html).toContain('EN[mobile__lianzhu]');
    expect(html).toContain('EN[OK]');
  });

  it('asks again through lua.tr when the engine had no text in this language', () => {
    // `GetGeneralDetail` builds its text inside the VM, off the VM's own
    // `Config.language`, so a skill the active language has no `:<name>` for
    // comes back as the bare key. This side's table may still have it — and did,
    // for every standard-pack skill, while the VM was still answering in the
    // other language.
    const detail = { ...DETAIL, skill: [{ name: 'qingguo', description: ':qingguo', is_related_skill: false }] };
    const table: Record<string, string> = { ':qingguo': 'You can use/play any black hand card as Dodge.' };
    const { draw } = room(stub({
      getGeneralDetail: () => detail,
      tr: (key: string) => table[key] ?? key,
    }));
    expect(draw(<GeneralDetail name="zhenji" onClose={() => {}} />))
      .toContain('You can use/play any black hand card as Dodge.');
  });

  it('says so when neither side has the text, rather than drawing an empty skill', () => {
    // The 319-general import ships zh_CN only, so in English these come back as
    // the bare key from both. A name with nothing under it reads as a skill that
    // does nothing — a worse lie than a visible gap.
    const detail = { ...DETAIL, skill: [{ name: 'yuli', description: ':yuli', is_related_skill: false }] };
    const { draw } = room(stub({ getGeneralDetail: () => detail }));
    const html = draw(<GeneralDetail name="godmachao" onClose={() => {}} />);
    expect(html).toContain('fk-detail__untranslated');
    expect(html).not.toContain(':yuli');
  });

  it('pages across the whole offer rather than one general at a time', () => {
    // At 319 generals the box is the decision, not a footnote: a player opens it
    // once and reads the shortlist end to end. `onShow` is what makes ◀ ▶ live,
    // and the counter is how they know how much is left.
    const { draw } = room();
    const pool = ['zhangfei', 'caocao', 'diaochan'];
    const html = draw(
      <GeneralDetail name="caocao" pool={pool} onShow={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('fk-detail__pager');
    expect(html).toContain('2 / 3');
  });

  it('shows no pager when there is nothing to page to', () => {
    // Right-clicking a seat at the table opens the box on one general. A pager
    // with one page on it is furniture.
    const { draw } = room();
    expect(draw(<GeneralDetail name="zhangfei" onClose={() => {}} />)).not.toContain('fk-detail__pager');
    expect(draw(<GeneralDetail name="zhangfei" pool={['zhangfei']} onShow={() => {}} onClose={() => {}} />))
      .not.toContain('fk-detail__pager');
  });

  it('marks the general it is showing as one of the current picks', () => {
    // Read-only, so it says what the pick is rather than changing it — the tick
    // is how a player paging the shortlist keeps track of where they got to.
    const { draw } = room();
    const withTick = draw(<GeneralDetail name="zhangfei" selected onClose={() => {}} />);
    const without = draw(<GeneralDetail name="zhangfei" onClose={() => {}} />);
    expect(withTick).toContain('✓');
    expect(without).not.toContain('✓');
  });
});

describe('the choose-general dialog', () => {
  it('offers a way into the detail box on every general it shows', () => {
    const { store, draw } = room();
    offerGenerals(store);
    const html = draw(<DialogHost onReply={() => {}} interactive />);

    // One ⓘ badge per card — the affordance that opens the box.
    expect((html.match(/fk-general__info/g) ?? []).length).toBe(3);
    // And the button `ChooseGeneralBox.qml:123` puts next to OK.
    expect(html).toContain('Show General Detail');
  });

  it('does not take the card click that answers the request', () => {
    // The reason the ⓘ badge exists at all. Putting the detail box on the card's
    // own click would leave the seat no way to pick, and would drop a
    // full-screen `.fk-modal` over the remaining cards after the first click —
    // the same shape as the bug that made the amazing-grace board unanswerable.
    const { store, draw } = room();
    offerGenerals(store);
    const html = draw(<DialogHost onReply={() => {}} interactive />);

    // Nothing is selected and nothing is open: exactly one modal, the question.
    expect((html.match(/fk-modal/g) ?? []).length).toBe(1);
    expect(html).not.toContain('fk-detail__skills');
    // The cards are still the cards the audit driver clicks to select.
    expect((html.match(/class="fk-general"/g) ?? []).length).toBe(3);
  });

  it('leaves the OK gating to the engine, and keeps the detail button off it', () => {
    const { store, draw } = room();
    offerGenerals(store);
    const html = draw(<DialogHost onReply={() => {}} interactive />);

    // `ChooseGeneralFeasible` says no with nothing picked, so OK is disabled —
    // unchanged by the new button beside it.
    expect(html).toMatch(/fk-btn fk-btn--primary"\s+disabled/);
    // The detail button is NOT primary. Everything that reads a request dialog
    // — a player, the audit driver — takes the primary button for "answer it".
    const detailBtn = html.slice(html.indexOf('Show General Detail') - 200, html.indexOf('Show General Detail'));
    expect(detailBtn).not.toContain('fk-btn--primary');
  });

  it('is gone the moment the request is', () => {
    // The box lives in the dialog's own state, so answering unmounts it. There
    // is no path where it outlives the question it was opened from — which is
    // the property that keeps a read-only popup from leaving a request live.
    const { store, draw } = room();
    offerGenerals(store);
    expect(draw(<DialogHost onReply={() => {}} interactive />)).toContain('fk-general__info');

    store.closeRequest();
    const after = draw(<DialogHost onReply={() => {}} interactive />);
    expect(after).not.toContain('fk-general__info');
    expect(after).not.toContain('fk-detail__skills');
  });

  it('lets an observer read a general even though it cannot pick one', () => {
    const { store, draw } = room();
    offerGenerals(store);
    const html = draw(<DialogHost onReply={() => {}} interactive={false} />);
    // Reading answers nothing, so it is not gated on being the seat that was
    // asked. Selecting still is: OK stays disabled.
    expect(html).toContain('fk-general__info');
    expect(html).toMatch(/fk-btn fk-btn--primary"\s+disabled/);
  });

  it('scrolls a large offer instead of pushing OK off the screen', () => {
    // Three is the 身份 case. Free assign hands over the whole pool, which is now
    // 319 cards at 128px each — around forty rows, against a dialog capped at
    // 86% of the room.
    const { store, draw } = room();
    offerGenerals(store, Array.from({ length: 120 }, (_, i) => `general_${i}`));
    const html = draw(<DialogHost onReply={() => {}} interactive />);

    expect((html.match(/fk-general__info/g) ?? []).length).toBe(120);
    expect(html).toMatch(/fk-generals"[^>]*overflow-y:\s*auto/);
    // The answer button is still in the box with them.
    expect(html).toContain('fk-dialog__actions');
  });
});
