import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { tap, type ArrangeState } from '../../room/dialogs/arrange.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { PlayerState } from '../types.ts';
import { bundle, sha } from './support.ts';

const LONG = 300_000;

/**
 * 神姜维 and three generals with nothing that opens a box of its own, so the
 * only `AskForArrangeCards` in the game is 星魂's.
 */
const ROSTER = ['mobile__godjiangwei', 'zhangfei', 'huangyueying', 'guanyu'] as const;

/** Requests the scene answers; everything else is dialog-shaped. */
const SCENE_REQUESTS = new Set([
  'PlayCard', 'AskForUseCard', 'AskForResponseCard', 'AskForUseActiveSkill',
]);

/**
 * 星魂, fired at the first turn boundary.
 *
 * `room:useSkill(player, skill, cb, data)` is the same entry the play phase uses
 * for an active skill (`lua/lunarltk/server/room.lua:2014`), so the skill runs
 * its real `on_use`: five cards off the draw pile, turned face up for its owner,
 * then `askToArrangeCards` with those five in one row and the whole hand in the
 * other (`packages/mobile/pkg/mobile_shiji/skills/xinghun.lua:26-34`). Waiting
 * for a bot to happen to play it is not a measurement.
 *
 * The two wrappers around it are the instrument. One records the request as the
 * engine posed it and the answer it took; the other snapshots the top of the
 * draw pile and the hand at the first moment after `on_use` has finished moving
 * cards — `askToChoosePlayers` is the skill's very next line, so it is exactly
 * that moment and needs no hook inside the skill.
 */
const PROBE = `
__xh = {}
local oldArrange = Room.askToArrangeCards
Room.askToArrangeCards = function(self, player, params)
  local before = table.simpleClone(player:getCardIds("h"))
  local res = oldArrange(self, player, params)
  if params.skill_name == "xinghun" and __xh.reply == nil then
    -- askToArrangeCards strips the row names out of card_map and fills the
    -- limits in, so both are read back off params after the call.
    __xh.offered = params.card_map
    __xh.capacities = params.max_limit
    __xh.handBefore = before
    __xh.reply = res
  end
  return res
end

local oldChoose = Room.askToChoosePlayers
Room.askToChoosePlayers = function(self, player, params)
  if params.skill_name == "xinghun" and __xh.afterTop == nil then
    __xh.afterTop = table.slice(self.draw_pile, 1, 6)
    __xh.afterHand = table.simpleClone(player:getCardIds("h"))
  end
  return oldChoose(self, player, params)
end

local Turn = GameEvent.Turn
local oldMain = Turn.main
local fired = false
Turn.main = function(self)
  local room = self.room
  if not fired then
    local jw
    for _, p in ipairs(room.alive_players) do
      if p.general == "mobile__godjiangwei" then jw = p end
    end
    if jw and not jw.dead then
      fired = true
      local skill = Fk.skills["xinghun"]
      local use_data = skill:handleCostData(jw, { from = jw, cards = {}, tos = {} }, nil)
      room:useSkill(jw, skill, function() skill:onUse(room, use_data) end, use_data)
    end
  end
  return oldMain(self)
end
return "ok"
`;

interface Probe {
  /** The two rows as the engine offered them: [top of draw pile, hand]. */
  offered: number[][];
  capacities: number[];
  handBefore: number[];
  /** What the panel sent back. */
  reply: number[][];
  /** Top five of the draw pile once 星魂 has finished putting cards back. */
  afterTop: number[];
  afterHand: number[];
}

interface Seat {
  id: number;
  client: MainThreadLuaClient;
  items: Map<string, Map<string, Record<string, unknown>>>;
  pending: { command: string; data: unknown } | null;
}

/** How the box is answered: rows in, rows out. */
type Answer = (rows: number[][], capacities: number[]) => number[][];

/**
 * The panel's own two clicks: pick up the first card of the hand row, put it
 * down on the first card of the draw-pile row.
 *
 * This is `ArrangeBox`'s state machine, not a re-implementation of it — the
 * component calls exactly these functions on exactly these clicks.
 */
const clickSwap: Answer = (rows, capacities) => {
  let s: ArrangeState = { zones: rows.map((z) => [...z]), picked: null };
  s = tap(s, capacities, rows[1][0]);
  s = tap(s, capacities, rows[0][0]);
  return s.zones.map((z) => [...z]);
};

/**
 * The rule the panel shipped with, in one line: refuse any destination that is
 * already at capacity. Both of 星魂's rows are, so this answers every box with
 * the arrangement it was handed.
 */
const legacyMove: Answer = (rows, capacities) => {
  const zones = rows.map((z) => [...z]);
  const from = 1;
  const to = 0;
  const cid = zones[from][0];
  if (zones[to].length >= (capacities[to] ?? 99)) return zones;
  zones[from] = zones[from].filter((c) => c !== cid);
  zones[to] = [...zones[to], cid];
  return zones;
};

/**
 * Play until 星魂 has resolved, with every seat a person so the arrange box is
 * answered here rather than by the AI.
 */
async function playXinghun(answer: Answer): Promise<Probe> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const seats: Seat[] = [];
  const dispose = () => {
    host.dispose();
    for (const s of seats) s.client.dispose();
  };

  try {
    const pool = JSON.parse(String(host.lua.doStringSync(`
      local out = {}
      for name, g in pairs(Fk.generals) do
        if not g.hidden and not g.total_hidden then out[#out + 1] = name end
      end
      table.sort(out); return json.encode(out)
    `))) as string[];
    for (const g of ROSTER) {
      expect(pool, `${g} is not in this build's roster`).toContain(g);
    }
    expect(String(host.lua.doStringSync(PROBE))).toBe('ok');

    for (let id = 1; id <= ROSTER.length; id++) {
      const client = await MainThreadLuaClient.create(bundle(), { playerId: id, screenName: `p${id}` });
      const seat: Seat = { id, client, items: new Map(), pending: null };
      client.onNotifyUI((command, data) => {
        if (command === 'UpdateRequestUI') {
          for (const [elemType, list] of Object.entries(data as Record<string, unknown>)) {
            if (!Array.isArray(list)) continue;
            let bucket = seat.items.get(elemType);
            if (!bucket) { bucket = new Map(); seat.items.set(elemType, bucket); }
            for (const r of list as Record<string, unknown>[]) {
              const key = String(r.id);
              bucket.set(key, { ...(bucket.get(key) ?? {}), ...r });
            }
          }
        } else if (command === 'CancelRequest') {
          seat.pending = null;
          seat.items.clear();
        } else if (command === 'PlayCard' || command.startsWith('AskFor')) {
          seat.pending = { command, data };
        }
      });
      seats.push(seat);
    }

    const enabled = (s: Seat, t: string): string[] =>
      [...(s.items.get(t) ?? new Map<string, Record<string, unknown>>()).entries()]
        .filter(([, v]) => v.enabled && !v.selected)
        .map(([k]) => k);
    const isEnabled = (s: Seat, t: string, id: string): boolean =>
      (s.items.get(t)?.get(id) as { enabled?: boolean } | undefined)?.enabled === true;

    const reply = (s: Seat): void => {
      const p = s.pending;
      if (p && !SCENE_REQUESTS.has(p.command)) {
        s.pending = null;
        if (p.command === 'AskForGeneral') {
          const [generals, n] = p.data as [string[], number];
          s.client.replyToServer('AskForGeneral', generals.slice(0, n));
          return;
        }
        if (p.command === 'AskForArrangeCards') {
          const d = p.data as { cards: number[][]; capacities: number[] };
          s.client.replyToServer('ReplyToServer', answer(d.cards, d.capacities));
          return;
        }
        s.client.replyToServer('ReplyToServer', '');
        return;
      }
      // Click what the scene enabled, never what the test thinks is legal.
      for (let i = 0; i < 4; i++) {
        if (isEnabled(s, 'Button', 'OK')) break;
        const card = enabled(s, 'CardItem')[0];
        if (card !== undefined) {
          s.client.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: true } });
          continue;
        }
        const target = enabled(s, 'Photo')[0];
        if (target !== undefined) {
          s.client.interact({ elemType: 'Photo', id: Number(target), action: 'click', data: { selected: true } });
          continue;
        }
        break;
      }
      for (const button of ['OK', 'End', 'Cancel']) {
        if (button === 'Cancel' || isEnabled(s, 'Button', button)) {
          s.client.interact({ elemType: 'Button', id: button, action: 'click' });
          return;
        }
      }
    };

    const online = allBotSeats(ROSTER.length).map((s) => ({ ...s, state: PlayerState.Online as 1 }));
    const session = await RoomSession.start(host, {
      roomId: 'xinghun', seed: 7, seats: online, ownerId: 1, timeout: 15,
      settings: {
        gameMode: 'aaa_role_mode',
        generalNum: 1,
        disabledGenerals: pool.filter((g) => !ROSTER.includes(g as typeof ROSTER[number])),
      },
    }, {
      bundleSha: await sha(),
      onEnvelope: (e: Envelope) => {
        for (const s of seats) if (e.to === null || e.to === s.id) s.client.deliverEnvelope(e);
      },
    });

    for (let i = 0; i < 600; i++) {
      const res = await session.advance();
      if (res.err) throw new Error(res.err);
      if (Number(host.lua.doStringSync(`return __xh.afterTop and 1 or 0`)) === 1) break;
      if (res.over) break;
      for (const id of res.waitingOn) {
        const s = seats.find((x) => x.id === id);
        if (!s) continue;
        reply(s);
        for (const o of s.client.drainOutbound().filter((o) => o.kind === 'reply')) {
          await host.pushReplyRaw(s.id, o.payload);
        }
      }
    }

    for (const s of seats) expect(s.client.errors(), `seat ${s.id}`).toEqual([]);
    const probe = JSON.parse(String(host.lua.doStringSync(`return json.encode(__xh)`))) as Partial<Probe>;
    expect(probe.reply, '星魂 never opened its box').toBeDefined();
    expect(probe.afterTop, '星魂 never finished putting the cards back').toBeDefined();
    return probe as Probe;
  } finally {
    dispose();
  }
}

/** The request must be the one the bug is about, whichever answer was given. */
function assertTheBoxIsFull(p: Probe): void {
  expect(p.offered).toHaveLength(2);
  expect(p.offered[0]).toHaveLength(5);
  expect(p.offered[1]).toEqual(p.handBefore);
  // Both rows at capacity from the moment it opens — this is the whole bug.
  expect(p.capacities).toEqual([p.offered[0].length, p.offered[1].length]);
}

/**
 * 星魂 puts the top row back on the draw pile and takes the other row into hand
 * (`xinghun.lua:37-60`), so a hand card that reached the top row is a hand card
 * that reached the deck. That is the skill.
 */
function assertTraded(p: Probe): void {
  const hand = new Set(p.offered[1]);
  const deck = new Set(p.offered[0]);

  const fromHand = p.reply[0].filter((c) => hand.has(c));
  expect(fromHand, 'no hand card reached the top row').toHaveLength(1);
  const fromDeck = p.reply[1].filter((c) => deck.has(c));
  expect(fromDeck, 'no draw-pile card reached the hand row').toHaveLength(1);

  // An exchange is one card each way: neither row may change length.
  expect(p.reply.map((z) => z.length)).toEqual([5, p.offered[1].length]);

  // And the engine acted on it. The top of the deck is the row we sent…
  expect(p.afterTop).toEqual(p.reply[0]);
  expect(p.afterTop).toContain(fromHand[0]);
  // …and the card we took off the deck is in hand.
  expect(p.afterHand).toContain(fromDeck[0]);
  expect(p.afterHand).not.toContain(fromHand[0]);
}

describe('星魂 swaps hand cards for the cards on top of the deck', () => {
  it('puts a hand card on the deck when the panel is clicked twice', async () => {
    const p = await playXinghun(clickSwap);
    assertTheBoxIsFull(p);
    assertTraded(p);
  }, LONG);

  it('could not, while the panel refused a destination at capacity', async () => {
    // The control: the same room, the same skill, the same instrument — only
    // the panel's rule is the old one. If this ever stops going red the test
    // above has stopped measuring anything.
    const p = await playXinghun(legacyMove);
    assertTheBoxIsFull(p);

    // The answer is the question: nothing the seat could do changed a card.
    expect(p.reply).toEqual(p.offered);
    expect(p.afterTop).toEqual(p.offered[0]);
    expect(p.afterHand.slice().sort()).toEqual(p.handBefore.slice().sort());
    expect(() => assertTraded(p)).toThrow();
  }, LONG);
});
