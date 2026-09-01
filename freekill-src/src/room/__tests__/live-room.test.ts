/**
 * The room against a real engine, playing a real game.
 *
 * `replay.test.ts` folds a recording into the store; that proves the transcript
 * is read correctly but it cannot show a round trip, because a recording has no
 * request handler to answer a click. This file has two live VMs — an
 * authoritative host and the viewer's own client, the same pair
 * `src/engine/__tests__/human.test.ts` seats a human between — and drives them
 * through `RoomStore`, clicking only what the room would actually offer.
 *
 * That is the whole point: the test never decides what is legal. It reads
 * `store.scene`, the same object `Dashboard` and `Photo` read, and presses
 * whatever carries `enabled`. If the room offers something the engine did not,
 * the game says so.
 */
import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../../engine/luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../../engine/luaHost.ts';
import { RoomSession } from '../../engine/roomSession.ts';
import { PlayerState } from '../../engine/types.ts';
import { bundle, SEED, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support.ts';
import { skillsOf } from '../components/Dashboard.tsx';
import { LtkLua } from '../ltk/LtkLua.ts';
import { CARD_AREA } from '../ltk/types.ts';
import { RoomStore } from '../state/store.ts';

const LONG = 300_000;
const ME = 1;

interface Table {
  host: InProcessLuaHost;
  client: MainThreadLuaClient;
  lua: LtkLua;
  session: RoomSession;
  store: RoomStore;
  /** One entry per notify: a card the hand area drew that the engine had
   *  already put on the table. Empty is the only acceptable answer. */
  ghosts: string[];
  /** How many times the hand area was inspected, so an empty result is not
   *  an empty test. */
  shots: number;
}

/**
 * One seat with a person in it, wired exactly the way `RoomView` wires it: every
 * notify into the store, and `finishRequestUI` on the way out of a reply.
 */
async function seat(seed = SEED): Promise<Table> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const client = await MainThreadLuaClient.create(bundle(), { playerId: ME, screenName: 'player1' });
  const store = new RoomStore(ME);
  const lua = new LtkLua(client);
  const t = { ghosts: [] as string[], shots: 0 };

  client.onNotifyUI((command, data) => {
    store.applyNotify(String(command), data);
    if (command === 'ReplyToServer') {
      try { lua.finishRequestUI(); } catch { /* engine gone */ }
    }
    // Checked here, at the moment the room would have painted it: `cardArea` is
    // the engine's last word on where a card is, and a card the engine has put
    // on the table must not still be sitting in the viewer's hand.
    t.shots += 1;
    for (const cid of drawnHand(store)) {
      const area = store.state.cardArea[cid];
      if (area === CARD_AREA.DiscardPile || area === CARD_AREA.Processing || area === CARD_AREA.Void) {
        t.ghosts.push(`${cid} drawn in hand after ${String(command)}; engine has it in area ${area}`);
      }
    }
  });

  const seats = allBotSeats(8).map((s) =>
    (s.playerId === ME ? { ...s, state: PlayerState.Online as 1 } : s));
  const session = await RoomSession.start(
    host,
    {
      roomId: `room-${seed}`, seed, seats, ownerId: ME, timeout: 15,
      // Pinned to the standard roster. Every assertion in this file is about
      // the room shell - which control the scene enables, what the dashboard
      // lists, whether the hand matches the engine - and the general pool is an
      // uncontrolled variable that changes what the seed plays without telling
      // us anything new about the shell. The mobile roster is exercised by
      // `npm run audit` and by the engine error census instead.
      settings: { gameMode: 'aaa_role_mode', ...STANDARD_ROSTER_ONLY },
    },
    { onEnvelope: (e: Envelope) => { if (e.to === null || e.to === ME) client.deliverEnvelope(e); } },
  );
  return {
    host, client, lua, session, store,
    get ghosts() { return t.ghosts; },
    get shots() { return t.shots; },
  };
}

/**
 * The card ids `Dashboard` puts in the hand area: the hand itself, plus the
 * piles the request expanded (`scene.created.CardItem`).
 */
function drawnHand(store: RoomStore): number[] {
  const hand = store.state.hands[ME] ?? [];
  const piles = (store.scene.created.CardItem ?? []).map(Number)
    .filter((cid) => Number.isFinite(cid) && !hand.includes(cid));
  return [...hand, ...piles];
}

/** What the room offers to click right now, read off the scene and nowhere else. */
function offered(store: RoomStore) {
  const pick = (t: string) => Object.entries(store.scene.items[t] ?? {})
    .filter(([, v]) => v.enabled === true);
  return {
    cards: pick('CardItem'),
    photos: pick('Photo'),
    skills: pick('SkillButton'),
    buttons: pick('Button'),
  };
}

/** Answer whatever is open, the way the room's own click handlers would. */
function answer(t: Table): string {
  const { store, client, lua } = t;
  const req = store.state.request;
  if (req.kind === 'none') {
    // `Room:animDelay` asks every seat an `EmptyRequest` purely to hold the
    // table still for a few seconds. The QML client draws nothing and answers
    // nothing (`RoomLogic.js:1505`); the server's own timeout moves the game
    // on. There is no wall clock in this rig, so the timeout's answer is given
    // here instead. The room is correct to have nothing on screen for it.
    lua.replyToServer('');
    return 'timeout';
  }
  if (req.kind === 'dialog') {
    if (req.command === 'AskForGeneral') {
      const [generals, n] = req.data as [string[], number];
      lua.replyToServer(generals.slice(0, n));
    } else {
      lua.replyToServer('');
    }
    // `RoomView.reply` — a dialog answer never returns through the stream.
    store.closeRequest();
    try { lua.finishRequestUI(); } catch { /* engine gone */ }
    return 'dialog';
  }
  const press = (id: string) => client.interact({ elemType: 'Button', id, action: 'click' });
  if (store.scene.items.Button?.OK?.enabled) { press('OK'); return 'OK'; }

  const card = offered(store).cards.find(([, v]) => !v.selected)?.[0];
  if (card !== undefined) {
    client.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: true } });
    if (store.scene.items.Button?.OK?.enabled) { press('OK'); return 'card+OK'; }
    const target = offered(store).photos.find(([, v]) => !v.selected)?.[0];
    if (target !== undefined) {
      client.interact({ elemType: 'Photo', id: Number(target), action: 'click', data: { selected: true } });
      if (store.scene.items.Button?.OK?.enabled) { press('OK'); return 'card+target+OK'; }
    }
    // Nothing came of it: put the card back rather than leaving it hanging.
    client.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: false } });
  }
  if (store.scene.items.Button?.End?.enabled) { press('End'); return 'End'; }
  press('Cancel');
  return 'Cancel';
}

describe('a room driven by the scene it renders', () => {
  /**
   * The regression the user reported as "the pointers are messed up" and "skill
   * use is messed up", which are the same fact seen twice: the board stayed
   * armed after the move was made. Measured before the fix, every card play in
   * this game left OK lit and the chosen seat highlighted until the next
   * question — up to a full round later.
   */
  it('goes dark the moment it answers', async () => {
    const t = await seat();
    try {
      let answered = 0;
      let checked = 0;
      for (let i = 0; i < 40; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();

        const how = answer(t);

        // Whatever it just answered, there is nothing left to press. This is
        // `Room.qml`'s `notactive`: no lit card, no candidate seat, no button.
        const after = offered(t.store);
        expect(t.store.state.request.kind, `after ${how} at #${i}`).toBe('none');
        expect(t.store.scene.active, `after ${how} at #${i}`).toBe(false);
        expect(after.cards, `cards after ${how} at #${i}`).toEqual([]);
        expect(after.photos, `targets after ${how} at #${i}`).toEqual([]);
        expect(after.skills, `skills after ${how} at #${i}`).toEqual([]);
        expect(after.buttons, `buttons after ${how} at #${i}`).toEqual([]);
        checked += 1;

        const out = t.client.drainOutbound().filter((o) => o.kind === 'reply');
        expect(out.length, `one reply for ${how} at #${i}`).toBe(1);
        for (const o of out) await t.host.pushReplyRaw(ME, o.payload);
        answered += 1;
      }
      expect(answered).toBeGreaterThan(8);
      expect(checked).toBe(answered);
      expect(t.client.errors()).toEqual([]);
    } finally {
      t.host.dispose();
      t.client.dispose();
    }
  }, LONG);

  /**
   * The same fault, seen from the engine's side: a second press of a button the
   * room should no longer be showing must not reach the answered handler.
   *
   * `UpdateRequestUI` in `client_util.lua:1158` looks up
   * `ClientInstance.current_request_handler` and does not care that it has
   * already replied — so `doOKButton` runs again and the host gets a second
   * answer to a question it has moved on from. `FinishRequestUI` is what the QML
   * client calls to drop the handler, and the room now calls it too.
   */
  it('cannot answer the same question twice', async () => {
    const t = await seat();
    try {
      let doubleClicks = 0;
      for (let i = 0; i < 24; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();

        const how = answer(t);
        const out = t.client.drainOutbound().filter((o) => o.kind === 'reply');

        // A player mashing the button the room used to leave lit.
        t.client.interact({ elemType: 'Button', id: 'OK', action: 'click' });
        t.client.interact({ elemType: 'Button', id: 'Cancel', action: 'click' });
        const extra = t.client.drainOutbound().filter((o) => o.kind === 'reply');
        expect(extra, `extra replies after ${how} at #${i}`).toEqual([]);
        doubleClicks += 1;

        for (const o of out) await t.host.pushReplyRaw(ME, o.payload);
      }
      expect(doubleClicks).toBeGreaterThan(8);
      expect(t.client.errors()).toEqual([]);
    } finally {
      t.host.dispose();
      t.client.dispose();
    }
  }, LONG);

  /**
   * "Cards are retained across turns."
   *
   * The hand area used to draw the hand plus "every card item the scene knows
   * that is not in my hand" — and the scene's card items are a snapshot of the
   * hand taken when the request opened. So the instant a played card left the
   * hand it came back as a pile card, and stayed there until the next
   * `CancelRequest`: measured at 40-odd consecutive frames spanning a whole
   * round, with an empty hand showing one card.
   */
  it('never draws a card the viewer no longer holds', async () => {
    const t = await seat();
    try {
      for (let i = 0; i < 30; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();
        answer(t);
        const out = t.client.drainOutbound().filter((o) => o.kind === 'reply');
        for (const o of out) await t.host.pushReplyRaw(ME, o.payload);
      }

      expect(t.ghosts.slice(0, 5)).toEqual([]);
      expect(t.shots).toBeGreaterThan(200);
    } finally {
      t.host.dispose();
      t.client.dispose();
    }
  }, LONG);

  /**
   * Every skill the request offers is a skill the dashboard can show.
   *
   * The dashboard used to build its list by filtering the notify stream's skill
   * names by shape, and the shape rule dropped two whole families the engine
   * treats as ordinary active skills: names ending in `&` (an attached-equipment
   * skill — `spear_skill&` is 丈八蛇矛, in the standard card pack and therefore in
   * this build) and names containing `__` (how packages namespace their reworks:
   * `mobile__lianzhu`, `changshi__kuiji`). `RoomScene:initialize` gives each of
   * them a `SkillButton` and the engine lights it when it is usable — at which
   * point the player was looking at a dashboard that did not have the button on
   * it. `GetMySkills` is the engine's own answer and is what the QML dashboard
   * renders (`Dashboard.qml:133`).
   */
  it('lists every skill the scene puts a button on', async () => {
    const t = await seat(7);
    try {
      // The hazard, stated as a fact about this build rather than as a worry:
      // an attached-equipment skill is an active skill and gets a button.
      expect(t.lua.getSkillData('spear_skill&')?.freq).toBe('active');

      const offeredSkills = new Set<string>();
      const missing: string[] = [];
      for (let i = 0; i < 30; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();

        // Exactly the list `Dashboard` maps over.
        const listed = skillsOf(t.lua, t.store.state.players[ME]?.skills ?? []);
        for (const name of Object.keys(t.store.scene.items.SkillButton ?? {})) {
          offeredSkills.add(name);
          if (!listed.includes(name)) missing.push(`#${i} ${name} (listed: ${listed.join()})`);
        }
        answer(t);
        const out = t.client.drainOutbound().filter((o) => o.kind === 'reply');
        for (const o of out) await t.host.pushReplyRaw(ME, o.payload);
      }
      expect(missing).toEqual([]);
      expect([...offeredSkills].length).toBeGreaterThan(0);
    } finally {
      t.host.dispose();
      t.client.dispose();
    }
  }, LONG);

  /**
   * The hand the room draws is the hand the engine says the viewer holds — at
   * every single notify, not just when it is their turn.
   */
  it('keeps the hand in step with the engine across turn boundaries', async () => {
    const t = await seat();
    try {
      const drift: string[] = [];
      for (let i = 0; i < 30; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();

        const truth = [...(t.lua.getPlayerHandcards(ME) ?? [])].sort((a, b) => a - b);
        const drawn = [...drawnHand(t.store)].sort((a, b) => a - b);
        if (JSON.stringify(truth) !== JSON.stringify(drawn)) {
          drift.push(`#${i} engine=[${truth}] room=[${drawn}]`);
        }
        answer(t);
        const out = t.client.drainOutbound().filter((o) => o.kind === 'reply');
        for (const o of out) await t.host.pushReplyRaw(ME, o.payload);
      }
      // Between requests no pile is expanded, so the two must agree exactly.
      expect(drift).toEqual([]);
    } finally {
      t.host.dispose();
      t.client.dispose();
    }
  }, LONG);
});
