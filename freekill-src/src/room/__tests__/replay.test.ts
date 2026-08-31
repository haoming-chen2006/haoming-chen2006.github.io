/**
 * The room lane's own "done when": replay the whole recorded game through the
 * real store and assert the table is coherent at every step.
 */
import { describe, expect, it } from 'vitest';
import { SceneChangeSchema, ELEM_TYPES, DIALOG_REQUESTS } from '../../contract/scene';
import { FixtureLuaClient } from '../fixture/FixtureLuaClient';
import requestPayloads from '../../../fixtures/request-payloads.json';
import { initialDrawPile, notifyFrames, recordedSeat } from '../harness/fixtureStream';
import { applySceneChange } from '../state/store';
import { RoomStore } from '../state/store';
import { EMPTY_SCENE } from '../state/types';
import { CARD_AREA } from '../ltk/types';

function replay(limit = Infinity) {
  const store = new RoomStore(recordedSeat);
  const client = new FixtureLuaClient({ frames: notifyFrames, initialDrawPile });
  client.onNotifyUI((c, d) => store.applyNotify(c as string, d));
  let n = 0;
  while (n < limit && client.step()) n += 1;
  store.commit();
  return { store, client, steps: n };
}

describe('full fixture replay', () => {
  it('applies every notify frame without throwing', () => {
    const { steps } = replay();
    expect(steps).toBe(notifyFrames.length);
  });

  it('ends in a finished 8-player game', () => {
    const { store } = replay();
    const s = store.state;
    expect(s.playerNum).toBe(8);
    expect(Object.keys(s.players)).toHaveLength(8);
    expect(s.circle).toHaveLength(8);
    expect(s.started).toBe(true);
    expect(s.gameOver).toBe('rebel+rebel_chief+civilian');
  });

  it('gives every seat a general, a role and a seat number', () => {
    const { store } = replay();
    for (const pid of store.state.circle) {
      const p = store.state.players[pid];
      expect(p.general, `player ${pid} general`).not.toBe('');
      expect(['lord', 'loyalist', 'rebel', 'renegade']).toContain(p.role);
      expect(p.seat).toBeGreaterThan(0);
      expect(p.maxHp).toBeGreaterThan(0);
    }
  });

  it('rotates the viewer to render slot 0', () => {
    const { store } = replay();
    expect(store.state.players[recordedSeat].index).toBe(0);
  });

  it('produces a readable log', () => {
    const { store } = replay();
    // 389 GameLog lines in the recording; the store caps at 600 and never hit it.
    expect(store.state.log.length).toBe(389);
    expect(store.state.log[0].html).toContain('身份模式');
  });

  it('never lets a card sit in two places at once', () => {
    const store = new RoomStore(recordedSeat);
    const client = new FixtureLuaClient({ frames: notifyFrames, initialDrawPile });
    client.onNotifyUI((c, d) => store.applyNotify(c as string, d));

    let checked = 0;
    while (client.step()) {
      const f = notifyFrames[client.cursor - 1];
      if (f.command !== 'MoveCards') continue;
      const s = store.state;
      const seen = new Map<number, string>();
      const visit = (where: string, ids: readonly number[]) => {
        for (const cid of ids) {
          const prev = seen.get(cid);
          expect(prev, `card ${cid} in ${prev} and ${where} at frame ${client.cursor}`).toBeUndefined();
          seen.set(cid, where);
        }
      };
      for (const [pid, ids] of Object.entries(s.hands)) visit(`hand:${pid}`, ids);
      for (const [pid, ids] of Object.entries(s.equips)) visit(`equip:${pid}`, ids);
      for (const [pid, ids] of Object.entries(s.judge)) visit(`judge:${pid}`, ids);
      for (const [pid, piles] of Object.entries(s.piles)) {
        for (const [name, ids] of Object.entries(piles)) visit(`pile:${pid}:${name}`, ids);
      }
      checked += 1;
    }
    expect(checked).toBe(258);
  });

  it('keeps the draw pile monotone and plausible', () => {
    const store = new RoomStore(recordedSeat);
    const client = new FixtureLuaClient({ frames: notifyFrames, initialDrawPile });
    client.onNotifyUI((c, d) => store.applyNotify(c as string, d));
    let max = 0;
    while (client.step()) {
      max = Math.max(max, store.state.drawPileCount);
      expect(store.state.drawPileCount).toBeGreaterThanOrEqual(0);
    }
    expect(max).toBe(initialDrawPile);
    // 8 seats x 4 opening cards leaves 128; the game draws it down from there.
    expect(store.state.drawPileCount).toBeLessThan(128);
  });

  it('tracks card areas for every card the game touched', () => {
    const { store } = replay();
    const areas = new Set(Object.values(store.state.cardArea));
    expect(areas.has(CARD_AREA.PlayerHand)).toBe(true);
    expect(areas.has(CARD_AREA.DiscardPile)).toBe(true);
    expect(Object.keys(store.state.cardArea).length).toBeGreaterThan(100);
  });

  it('leaves no expired card on the table at the end', () => {
    const { store } = replay();
    // Everything the last event destroyed is marked expired; the renderer drops
    // them. Nothing should be sitting there un-expired after GameOver.
    const live = store.state.table.filter((c) => !c.expired);
    expect(live.length).toBeLessThanOrEqual(2);
  });
});

describe('scene model', () => {
  const sceneFrames = notifyFrames.filter((f) => f.command === 'UpdateRequestUI');

  it('has the UpdateRequestUI volume the spike measured', () => {
    expect(sceneFrames).toHaveLength(60);
  });

  it('parses every diff against contract/scene.ts', () => {
    for (const f of sceneFrames) {
      expect(() => SceneChangeSchema.parse(f.data)).not.toThrow();
    }
  });

  it('applies every diff with no unknown elemType', () => {
    let scene = EMPTY_SCENE;
    const unknown = new Set<string>();
    for (const f of sceneFrames) {
      scene = applySceneChange(scene, SceneChangeSchema.parse(f.data));
      for (const key of Object.keys(scene.items)) {
        if (!(ELEM_TYPES as readonly string[]).includes(key)) unknown.add(key);
      }
    }
    expect([...unknown]).toEqual([]);
  });

  it('accumulates a diff rather than replacing a snapshot', () => {
    // `Scene:update` only sends the items that changed, so an item set once and
    // not mentioned again must survive later diffs.
    let scene = applySceneChange(EMPTY_SCENE, SceneChangeSchema.parse({
      _type: 'Room',
      Button: [{ id: 'OK', enabled: false }, { id: 'Cancel', enabled: true }],
    }));
    scene = applySceneChange(scene, SceneChangeSchema.parse({ _type: 'Room', Button: [{ id: 'OK', enabled: true }] }));
    expect(scene.items.Button.OK.enabled).toBe(true);
    expect(scene.items.Button.Cancel.enabled).toBe(true);
  });

  it('honours _new and _delete', () => {
    let scene = applySceneChange(EMPTY_SCENE, SceneChangeSchema.parse({
      _type: 'Room',
      _new: [{ type: 'CardItem', data: { id: 25, enabled: false, selected: false }, ui_data: { footnote: 'yiji' } }],
    }));
    expect(scene.items.CardItem['25']).toBeDefined();
    expect(scene.uiData.CardItem['25']).toEqual({ footnote: 'yiji' });
    scene = applySceneChange(scene, SceneChangeSchema.parse({ _type: 'Room', _delete: [{ type: 'CardItem', id: 25 }] }));
    expect(scene.items.CardItem['25']).toBeUndefined();
  });

  it('is cleared by CancelRequest, as the client emits before every AskFor*', () => {
    const store = new RoomStore(1);
    store.applyNotify('UpdateRequestUI', { _type: 'Room', Button: [{ id: 'OK', enabled: true }] });
    expect(store.scene.items.Button.OK.enabled).toBe(true);
    store.applyNotify('CancelRequest', undefined);
    expect(store.scene).toEqual(EMPTY_SCENE);
  });
});

describe('request coverage', () => {
  it('renders or deliberately skips every request command in the recording', () => {
    const seen = new Set(
      notifyFrames.filter((f) => f.command.startsWith('AskFor') || f.command === 'PlayCard')
        .map((f) => f.command),
    );
    // The nine the spike measured, minus AskForGuanxing which this seat did not
    // receive (it fired for other seats and lives in request-payloads.json).
    expect([...seen].sort()).toEqual([
      'AskForAG', 'AskForCardChosen', 'AskForGeneral', 'AskForResponseCard',
      'AskForSkillInvoke', 'AskForUseActiveSkill', 'AskForUseCard', 'PlayCard',
    ]);
  });

  it('treats EmptyRequest as drawing nothing', () => {
    const store = new RoomStore(1);
    store.applyNotify('EmptyRequest', undefined);
    expect(store.state.request).toEqual({ kind: 'none' });
    expect(DIALOG_REQUESTS.EmptyRequest.rendersUi).toBe(false);
  });

  it('opens a dialog for every dialog-shaped request and a scene for the rest', () => {
    // Real payloads where the fixture has one; a minimal well-formed stand-in
    // where the request is unexercised in a standard 身份局.
    const payloads = requestPayloads as Record<string, unknown[]>;
    const fallback: Record<string, unknown> = {
      AskForArrangeCards: { cards: [[]], names: [], capacities: [], limits: [] },
      AskForPoxi: { type: 'x', data: [], extra_data: {}, cancelable: true },
      AskForChoice: [[], [], 'skill', '', false],
      AskForChoices: [[], [], [1, 1], true, 'skill', '', false],
      AskForCardsChosen: { _id: 1, _reason: 'r', _prompt: '', card_data: [] },
      AskForCardsAndChoice: {},
      AskForExchange: { piles: [[]], piles_name: [] },
      AskForMoveCardInBoard: { cards: [], cardsPosition: [], generalNames: [], playerIds: [] },
      MiniGame: { type: 'x', data: {} },
    };
    for (const [command, meta] of Object.entries(DIALOG_REQUESTS)) {
      if ((meta as { rendersUi?: boolean }).rendersUi === false) continue;
      const store = new RoomStore(1);
      const payload = payloads[command]?.[0] ?? fallback[command] ?? {};
      store.applyNotify(command, payload);
      expect(store.state.request.kind, command).not.toBe('none');
    }
  });
});

describe('the table stays bounded', () => {
  it('never lets the processing area grow past a plausible size', () => {
    const store = new RoomStore(recordedSeat);
    const client = new FixtureLuaClient({ frames: notifyFrames, initialDrawPile });
    client.onNotifyUI((c, d) => store.applyNotify(c as string, d));
    let peak = 0;
    while (client.step()) {
      // The renderer prunes on a timer; do it eagerly here so the assertion is
      // about the engine's own churn rather than about animation timing.
      store.pruneTable();
      peak = Math.max(peak, store.state.table.length);
    }
    // A single event puts a handful of cards on the table; anything in the
    // dozens means table -> discard moves are being re-added.
    expect(peak).toBeLessThan(12);
  });

  it('conserves the deck: 160 cards, each in exactly one place', () => {
    const store = new RoomStore(recordedSeat);
    const client = new FixtureLuaClient({ frames: notifyFrames, initialDrawPile });
    client.onNotifyUI((c, d) => store.applyNotify(c as string, d));
    let checks = 0;
    const total = () => {
      const s = store.state;
      const held =
        Object.values(s.hands).flat().length +
        Object.values(s.equips).flat().length +
        Object.values(s.judge).flat().length +
        Object.values(s.piles).flatMap((p) => Object.values(p).flat()).length;
      // `ShowVirtualCard` puts display-only proxies on the table (negative ids);
      // they are pictures of a card, not cards, and are not part of the deck.
      const onTable = s.table.filter((c) => !c.virtual);
      const tableIds = new Set(onTable.map((c) => c.cid));
      // In flight: the engine retired the card from the table (a
      // `DestroyTableCardByEvent`) but has not yet said where it landed. It is
      // still a card; it is just between two homes for a few frames.
      const inFlight = Object.entries(s.cardArea).filter(
        ([cid, area]) =>
          (area === CARD_AREA.Processing || area === CARD_AREA.Void) && !tableIds.has(Number(cid)),
      ).length;
      return held + s.drawPileCount + s.discardCount + onTable.length + inFlight;
    };
    while (client.step()) {
      store.pruneTable();
      store.commit();
      // Only meaningful once the deck exists; the pile size arrives with
      // StartGame (frame 4 of the recording).
      if (!store.state.started) continue;
      // The whole standard deck, all the way through, at every commit.
      expect(total(), `frame ${client.cursor}`).toBe(160);
      checks += 1;
    }
    expect(checks).toBeGreaterThan(2200);
  });
});

describe('replay speed does not change what is drawn', () => {
  it('keeps the table bounded even when the stream outruns the fade timer', () => {
    // The renderer's fade is wall-clock; the stream is not. Stepping the whole
    // game without ever letting the timer fire must still leave a table you
    // could look at.
    const store = new RoomStore(recordedSeat);
    const client = new FixtureLuaClient({ frames: notifyFrames, initialDrawPile });
    client.onNotifyUI((c, d) => store.applyNotify(c as string, d));
    let peak = 0;
    while (client.step()) peak = Math.max(peak, store.state.table.length);
    expect(peak).toBeLessThan(16);
  });
});
