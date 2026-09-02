/**
 * Two small controls that were saying the wrong thing.
 *
 * `specialUseOn` — the 重铸 / 正常使用 radio group. `SpecialSkills` carries only
 * the list of options (`lua/ui_emu/specialskills.lua:16`); the engine never says
 * which one is chosen, because upstream's `RadioButton` group holds that itself
 * and moves its check on click (`Room.qml:453-466`). The port hard-coded the
 * lit chip to index 0, so a player who pressed 重铸 saw 正常使用 still lit while
 * the engine had already switched (`play_card.lua:220` -> `selectSpecialUse`).
 * A UI that contradicts the engine is worse than no UI.
 *
 * `atBottom` — whether the log should follow the newest line.
 * `LogEdit.qml:60-66` reads `currentIndex === count - 1` before appending, so a
 * player who has scrolled up to re-read a resolution stays there. The port set
 * `scrollTop = scrollHeight` unconditionally on every appended line, and a
 * cascading trigger sends dozens a second — which made reading back during a
 * turn impossible.
 *
 * THESE ARE LOGIC TESTS, NOT CLICK TESTS, and it is worth being straight about
 * why: this repository has no DOM test environment (no jsdom, no happy-dom, and
 * adding one is not this change's business), so every `.tsx` suite here renders
 * through `renderToStaticMarkup` and cannot fire an event. The static render
 * below pins the DEFAULT that a player sees before touching anything; the pure
 * functions pin what happens when they do.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { ConfirmBar, specialUseOn } from '../ConfirmBar';
import { atBottom, STICK_SLACK_PX } from '../SidePanel';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

const stub = {
  tr: (key: string) => (key === '_normal_use' ? '正常使用' : key === 'recast' ? '重铸' : key),
  getPendingSkill: () => '',
  getSkillData: () => undefined,
  getMySkills: () => [],
  interact: () => {},
} as unknown as LtkLua;

function draw(skills: readonly string[]): string {
  const store = new RoomStore(1);
  // The scene, as `ReqPlayCard:selectCard` publishes it: the options and
  // nothing else. There is no "selected" field on the item, which is the whole
  // reason the pick has to be held on this side.
  store.applyNotify('PlayCard', ['slash']);
  store.applyNotify('UpdateRequestUI', {
    _type: 'Room',
    SpecialSkills: [{ id: '1', skills: [...skills] }],
  });
  store.commit();
  const services: RoomServices = {
    store, lua: stub, assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: 1,
    naming: makeNaming(store),
  };
  return renderToStaticMarkup(
    <RoomProvider value={services}><ConfirmBar /></RoomProvider>,
  );
}

describe('the special-use chips', () => {
  const OFFER = ['_normal_use', 'recast'];

  it('lights the first option before anything is pressed', () => {
    const html = draw(OFFER);
    // `_normal_use` is spliced in front whenever the card can also be used
    // normally (`play_card.lua:192`), so index 0 is the default the engine
    // itself assumes.
    expect(html).toContain('fk-chip fk-chip--on">正常使用');
    expect(html).toContain('class="fk-chip">重铸');
  });

  it('follows the press instead of staying on index 0', () => {
    const key = OFFER.join('|');
    expect(specialUseOn(OFFER, null), 'nothing pressed yet').toBe('_normal_use');
    expect(specialUseOn(OFFER, { key, skill: 'recast' }), 'the pressed one')
      .toBe('recast');
  });

  it('re-defaults when the engine offers a different list', () => {
    // Selecting another card republishes `skills` wholesale, and upstream's
    // Repeater rebuilds with `checked: index === 0`. A pick from the previous
    // card must not survive into the next one.
    const stale = { key: ['_normal_use', 'recast'].join('|'), skill: 'recast' };
    expect(specialUseOn(['_normal_use', 'mobile__daoshu'], stale)).toBe('_normal_use');
    // Nor may a pick survive the list going empty, which is what deselecting
    // the card does (`play_card.lua:202`).
    expect(specialUseOn([], stale)).toBeUndefined();
  });

  it('ignores a pick the offer no longer contains', () => {
    expect(specialUseOn(['recast'], { key: 'recast', skill: '_normal_use' })).toBe('recast');
  });
});

describe('following the newest log line', () => {
  const box = (scrollHeight: number, scrollTop: number, clientHeight: number) =>
    ({ scrollHeight, scrollTop, clientHeight });

  it('follows while the reader is parked at the bottom', () => {
    expect(atBottom(box(1000, 800, 200))).toBe(true);
  });

  it('stops following the moment the reader scrolls up', () => {
    // One screenful back is unambiguously "I am reading history".
    expect(atBottom(box(1000, 600, 200))).toBe(false);
  });

  it('tolerates a sub-pixel gap rather than reading it as a scroll', () => {
    // A wheel gesture or a zoomed rendering routinely leaves a fraction of a
    // pixel; an exact comparison would treat that as scrolling up and stop
    // following the game for the rest of the match.
    expect(atBottom(box(1000, 800 - STICK_SLACK_PX, 200))).toBe(true);
    expect(atBottom(box(1000, 800 - STICK_SLACK_PX - 1, 200))).toBe(false);
  });

  it('follows an empty panel', () => {
    expect(atBottom(box(0, 0, 0))).toBe(true);
  });
});
