/**
 * What a request switches on, and what switches it off again.
 *
 * The room's three reported failures — skills that stayed live after they were
 * used, seat highlighting that outlasted the move, a played card that sat in
 * the hand for the rest of the turn — were one missing edge between them: the
 * room never left the interactive state when it answered. The engine emits
 * `CancelRequest` only *before* the next `AskFor*`, so from the moment a reply
 * goes out until the next question — a whole round, in a measured game — every
 * `enabled` flag the answered request had set was still on the board.
 *
 * `Fk/Pages/LunarLTK/RoomLogic.js:141` is the line these tests are about:
 * `replyToServer` sets `roomScene.state = "notactive"`.
 */
import { describe, expect, it } from 'vitest';
import { applySceneChange, RoomStore } from '../state/store';
import { EMPTY_SCENE } from '../state/types';
import { SceneChangeSchema } from '../../contract/scene';

/** Parsed against `contract/scene.ts`, so a diff that could not come off the
 *  wire cannot be written here by accident. */
const diff = (o: Record<string, unknown>) => SceneChangeSchema.parse(o);

/** A `#PlayCard` scene with a live hand, a candidate seat and a lit OK. */
function armed(store: RoomStore): void {
  store.applyNotify('CancelRequest', undefined);
  store.applyNotify('PlayCard', null);
  store.applyNotify('UpdateRequestUI', diff({
    _type: 'Room',
    _prompt: '#PlayCard',
    Button: [{ id: 'OK', enabled: true }, { id: 'End', enabled: true }],
    CardItem: [{ id: 53, enabled: true, selected: true }],
    Photo: [{ id: 2, enabled: true, selected: true, state: 'candidate' }],
    SkillButton: [{ id: 'zhiheng', enabled: true, selected: true }],
  }));
}

describe('answering a request ends it', () => {
  it('takes every card, target, skill and button off the board', () => {
    const store = new RoomStore(1);
    armed(store);
    expect(store.scene.items.Button.OK.enabled).toBe(true);
    expect(store.scene.items.Photo['2'].enabled).toBe(true);
    expect(store.scene.items.SkillButton.zhiheng.enabled).toBe(true);

    // What `doOKButton` pushes. `lua/web/client.lua` puts it on the wire; the
    // room's only job is to notice that the question is over.
    store.applyNotify('ReplyToServer', { card: 53, targets: [2] });

    expect(store.state.request).toEqual({ kind: 'none' });
    expect(store.scene).toEqual(EMPTY_SCENE);
    expect(store.scene.active).toBe(false);
  });

  it('is not re-armed by the empty diff the engine sends after the reply', () => {
    // `RequestHandler:_finish` clears its change table and notifies once more,
    // which lands as a bare `{_type: "Room"}`. Treating any diff as proof that a
    // request is open turned that into a second live board.
    const store = new RoomStore(1);
    armed(store);
    store.applyNotify('ReplyToServer', '1');
    store.applyNotify('UpdateRequestUI', diff({ _type: 'Room' }));

    expect(store.scene.active).toBe(false);
    expect(store.state.request).toEqual({ kind: 'none' });
  });

  it('closes a dialog too, so the same question cannot be answered twice', () => {
    const store = new RoomStore(1);
    store.applyNotify('AskForCardChosen', { _id: 2, _reason: 'snatch', _prompt: '', card_data: [] });
    expect(store.state.request.kind).toBe('dialog');
    // `RoomView.reply` calls this after handing the value to the client VM; a
    // dialog answer never comes back through the notify stream, so nothing else
    // would ever take the box down.
    store.closeRequest();
    expect(store.state.request).toEqual({ kind: 'none' });
  });

  it('still arms on the next request, in the order the engine sends it', () => {
    // `CancelRequest`, the previous handler's farewell diff, the request, then
    // the real scene — `fixtures/ui-notify-stream.json` frames 623-626.
    const store = new RoomStore(1);
    armed(store);
    store.applyNotify('ReplyToServer', '1');
    store.applyNotify('CancelRequest', undefined);
    store.applyNotify('UpdateRequestUI', diff({ _type: 'Room' }));
    store.applyNotify('AskForUseCard', ['jink', 'jink', '', true, {}, []]);
    store.applyNotify('UpdateRequestUI', diff({
      _type: 'Room', Button: [{ id: 'Cancel', enabled: true }],
    }));

    expect(store.scene.active).toBe(true);
    expect(store.scene.items.Button.Cancel.enabled).toBe(true);
    // Nothing survived from the request before it.
    expect(store.scene.items.CardItem).toBeUndefined();
    expect(store.scene.items.Photo).toBeUndefined();
  });
});

describe('a scene request that carries its own prompt', () => {
  it('names the skill an AskForSkillInvoke is offering', () => {
    // `ReqInvoke` never calls `setPrompt`, so the scene has nothing to say and
    // the player used to get a bare OK / Cancel. `RoomLogic.js:825` takes the
    // name out of the payload instead.
    const store = new RoomStore(1);
    store.applyNotify('CancelRequest', undefined);
    store.applyNotify('AskForSkillInvoke', ['hujia']);
    expect(store.state.request).toEqual({ kind: 'scene', command: 'AskForSkillInvoke', promptArg: 'hujia' });
    expect(store.scene.prompt).toBe('');
  });

  it('names the card a bare AskForResponseCard wants played', () => {
    // Every ordinary "play a Jink" arrives with prompt == "".
    const store = new RoomStore(1);
    store.applyNotify('CancelRequest', undefined);
    store.applyNotify('AskForResponseCard', ['jink', 'jink', '', true, [], []]);
    store.applyNotify('UpdateRequestUI', diff({ _type: 'Room', _prompt: '' }));
    expect(store.scene.prompt).toBe('');
    expect((store.state.request as { promptArg?: string }).promptArg).toBe('jink');
  });

  it('leaves the engine s own prompt alone when there is one', () => {
    const store = new RoomStore(1);
    store.applyNotify('CancelRequest', undefined);
    store.applyNotify('AskForUseCard', ['jink', 'jink', '#slash-jink:6', true, {}, []]);
    store.applyNotify('UpdateRequestUI', diff({ _type: 'Room', _prompt: '#slash-jink:6' }));
    expect(store.scene.prompt).toBe('#slash-jink:6');
  });
});

describe('cards the request opened', () => {
  it('tracks _new and _delete as the expanded piles', () => {
    // `RoomScene:initialize` builds the hand's items before the change table
    // exists, so they are never `_new`. The only thing that adds a card to a
    // live scene is `ReqActiveSkill:expandPile` — which is exactly what belongs
    // beside the hand.
    let scene = applySceneChange(EMPTY_SCENE, diff({
      _type: 'Room',
      _new: [
        { type: 'CardItem', data: { id: 25, enabled: true }, ui_data: { reason: 'expand', footnote: '$Equip' } },
        { type: 'CardItem', data: { id: 26, enabled: true }, ui_data: { reason: 'expand', footnote: '$Equip' } },
      ],
    }));
    expect(scene.created.CardItem).toEqual(['25', '26']);

    scene = applySceneChange(scene, diff({
      _type: 'Room', _delete: [{ type: 'CardItem', id: 25 }],
    }));
    expect(scene.created.CardItem).toEqual(['26']);
  });

  it('does not count a hand card the scene merely updated', () => {
    // The bug this replaces: "every CardItem that is not in my hand" turned the
    // card you just played back into a card in your hand.
    const scene = applySceneChange(EMPTY_SCENE, diff({
      _type: 'Room', CardItem: [{ id: 53, enabled: true, selected: true }],
    }));
    expect(scene.items.CardItem['53']).toBeDefined();
    expect(scene.created.CardItem ?? []).toEqual([]);
  });
});

describe('indicator arrows', () => {
  it('draws both hops of a chain', () => {
    // `to` is a list of `[target, ...subTargets]`, not a list of targets
    // (`events/usecard.lua:79`). Collateral points its user at the weapon's
    // owner and the owner at the victim; only the first hop was ever drawn.
    const store = new RoomStore(1);
    store.applyNotify('Animate', { type: 'Indicate', from: 7, to: [[1, 8]] });
    expect(store.state.indicators.map((i) => [i.from, [...i.to]]))
      .toEqual([[7, [1]], [1, [8]]]);
  });

  it('draws one line per target, and skips a leg that points at its own source', () => {
    const store = new RoomStore(1);
    store.applyNotify('Animate', { type: 'Indicate', from: 3, to: [[5], [6], [3]] });
    expect(store.state.indicators.map((i) => [i.from, [...i.to]]))
      .toEqual([[3, [5]], [3, [6]]]);
  });
});
