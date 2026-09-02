import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { cardListProps, readCustomDialog, toggleList } from '../../room/dialogs/custom.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { PlayerState } from '../types.ts';
import { bundle, sha } from './support.ts';

const LONG = 300_000;

/**
 * 〖清正〗 end to end, because a player could not use it.
 *
 * WHAT WAS WRONG, in one line each. `Room:askToCustomDialog` sends
 * `{ path = params.qml_path, data = params.extra_data }`
 * (`lua/lunarltk/server/room.lua:2838`), and every caller in the shipped
 * packages writes the newer `params.component` instead — so the request went out
 * with an empty payload. And `DialogHost` had no case for `CustomDialog`, so
 * even a complete one would have drawn "no dialog is implemented".
 *
 * WHY 曹髦 IS THE SEAT TO MEASURE IT FROM. 〖潜龙〗 hands him 20 道心值 at game
 * start, or 60 when 〖魏统〗 finds another 魏 alive, and 25 grants 〖清正〗
 * outright (`packages/mobile/pkg/mobile_lxxh/skills/qianlong.lua:50`). So a
 * table of four 魏 generals has the skill in play before the first turn, and
 * 清正 then asks at the start of EVERY play phase — five times in the game
 * below. Nothing has to be forced with a probe: this is the skill firing on its
 * own, through `EventPhaseStart`, exactly as a player meets it.
 *
 * THE ANSWER COMES FROM THE PANEL, not from the test. `readCustomDialog`,
 * `cardListProps` and `toggleList` are the same three functions
 * `CustomDialogs.tsx` calls on a click, so what is being measured is the panel's
 * own reply going into a real engine — not a hand-written payload that happens
 * to be shaped right.
 */
const ROSTER = ['mobile__caomao', 'caocao', 'simayi', 'zhangliao'] as const;

/** Requests the scene answers; everything else is dialog-shaped. */
const SCENE_REQUESTS = new Set([
  'PlayCard', 'AskForUseCard', 'AskForResponseCard', 'AskForUseActiveSkill',
]);

const QINGZHENG = 'mobile_qianlong__qingzheng';

/**
 * The instrument, in two halves.
 *
 * `throwCard` records what 清正 actually discarded, from whom
 * (`MoveEventWrappers:throwCard`, `events/movecard.lua:522`). It is the only
 * measurement that cannot be faked by a panel that merely looks answered: the
 * skill's whole effect is cards leaving hands. A declined ask never reaches
 * `on_use` at all — `on_cost` needs `#choices == 1` (`qingzheng.lua:47`) — so
 * zero entries here is exactly "the skill did nothing".
 *
 * `askToCustomDialog` records the component and skill of every ask, off the
 * SERVER side, so a request that never reaches the client is still counted.
 */
const PROBE = `
__cd = { asks = {}, throws = {} }
local room_klass
for _, game in pairs(Fk.boardgames or {}) do room_klass = game.room_klass end

local oldAsk = room_klass.askToCustomDialog
room_klass.askToCustomDialog = function(self, player, params)
  __cd.asks[#__cd.asks + 1] = {
    skill = params.skill_name,
    url = params.component and params.component.url or params.qml_path,
    to = player.id,
  }
  return oldAsk(self, player, params)
end

local oldThrow = room_klass.throwCard
room_klass.throwCard = function(self, card_ids, skillName, who, thrower)
  if skillName == "${QINGZHENG}" and type(card_ids) == "table" then
    __cd.throws[#__cd.throws + 1] = { ids = table.simpleClone(card_ids), who = who and who.id }
  end
  return oldThrow(self, card_ids, skillName, who, thrower)
end
return "ok"
`;

/**
 * The wire as it was before `lua/web/roomcompat.lua`: a verbatim copy of
 * `Room:askToCustomDialog` (`room.lua:2832-2841`), which reads `qml_path` and
 * `extra_data` and never looks at `params.component`.
 *
 * This is the control, and it goes on BEFORE the probe so the probe still
 * counts the asks. It puts the empty payload back on the wire and changes
 * nothing else.
 */
const UNPATCH = `
local room_klass
for _, game in pairs(Fk.boardgames or {}) do room_klass = game.room_klass end
local wrapped = room_klass.askToCustomDialog
room_klass.askToCustomDialog = function(self, player, params)
  local req = Request:new(player, "CustomDialog")
  req.focus_text = params.skill_name
  req.receive_decode = false
  req:setData(player, { path = params.qml_path, data = params.extra_data })
  return req:getResult(player)
end
return wrapped ~= nil
`;

interface Seat {
  id: number;
  client: MainThreadLuaClient;
  items: Map<string, Map<string, Record<string, unknown>>>;
  pending: { command: string; data: unknown } | null;
}

interface Ask { skill: string; url: string | null; to: number }
interface Throw { ids: number[]; who: number }

interface Played {
  /** Every `CustomDialog` payload as the CLIENT received it. */
  received: unknown[];
  /** What the panel replied with, ask for ask. */
  replies: unknown[];
  asks: Ask[];
  throws: Throw[];
  over: boolean;
}

/** How a `CustomDialog` is answered. `null` is Cancel — the reply `''`. */
type Answer = (data: unknown) => unknown;

/**
 * The panel's own answer: read the payload, then take the first list that has
 * cards in it — which is what one click on a suit group does.
 *
 * Every step is a function `CardListBox` calls. If the payload cannot be read,
 * or names a component this build has no panel for, there is nothing to send
 * and the seat declines — which is precisely what the seat did before the fix.
 */
const panelAnswer: Answer = (data) => {
  const spec = readCustomDialog(data);
  if (!spec) return '';
  const p = cardListProps(spec.prop);
  let picked: string[] = [];
  for (const [i, name] of p.listNames.entries()) {
    if (picked.length >= p.min) break;
    picked = toggleList(picked, name, (p.listCards[i] ?? []).length, p);
  }
  return picked.length >= p.min ? picked : '';
};

/** What the shipped client could send: nothing. */
const declineAnswer: Answer = () => '';

async function playQingzheng(
  { answer, unpatch = false }: { answer: Answer; unpatch?: boolean },
): Promise<Played> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const seats: Seat[] = [];
  const received: unknown[] = [];
  const replies: unknown[] = [];
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
    if (unpatch) expect(host.lua.doStringSync(UNPATCH)).toBe(true);
    expect(String(host.lua.doStringSync(PROBE))).toBe('ok');

    for (let id = 1; id <= ROSTER.length; id++) {
      const client = await MainThreadLuaClient.create(bundle(), { playerId: id, screenName: `p${id}` });
      const seat: Seat = { id, client, items: new Map(), pending: null };
      client.onNotifyUI((command, data) => {
        if (command === 'CustomDialog') received.push(data);
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
        } else if (
          command === 'PlayCard' || command === 'CustomDialog'
          // The engine's filler for a seat with nothing to be asked. It owes a
          // reply like any other request, and a driver that ignores it deadlocks
          // the room — 曹髦's table raises one on the very first turn.
          || command === 'EmptyRequest'
          || command.startsWith('AskFor')
        ) {
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
        if (p.command === 'CustomDialog') {
          const value = answer(p.data);
          replies.push(value);
          s.client.replyToServer('ReplyToServer', value);
          return;
        }
        s.client.replyToServer('ReplyToServer', '');
        return;
      }
      // Click what the scene enabled, never what the test thinks is legal.
      for (let i = 0; i < 6; i++) {
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
      roomId: 'qingzheng', seed: 11, seats: online, ownerId: 1, timeout: 15,
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

    let over = false;
    for (let i = 0; i < 2000 && !over; i++) {
      const res = await session.advance();
      if (res.err) throw new Error(res.err);
      if (res.over) { over = true; break; }
      let progressed = false;
      for (const id of res.waitingOn) {
        const s = seats.find((x) => x.id === id);
        if (!s) continue;
        reply(s);
        const outbound = s.client.drainOutbound().filter((o) => o.kind === 'reply');
        for (const o of outbound) await host.pushReplyRaw(s.id, o.payload);
        if (outbound.length > 0) progressed = true;
      }
      if (!progressed) {
        throw new Error(`no seat could answer at resume ${i}: waitingOn ${JSON.stringify(res.waitingOn)}`);
      }
    }

    for (const s of seats) expect(s.client.errors(), `seat ${s.id}`).toEqual([]);
    const probe = JSON.parse(String(host.lua.doStringSync('return json.encode(__cd)'))) as {
      asks?: Ask[]; throws?: Throw[];
    };
    return {
      received, replies, over,
      asks: probe.asks ?? [],
      throws: probe.throws ?? [],
    };
  } finally {
    dispose();
  }
}

describe('清正 asks with a CustomDialog, and the panel can answer it', () => {
  it('fires on its own and carries the component and the suits it groups', async () => {
    const p = await playQingzheng({ answer: panelAnswer });

    // The skill reached its cost step, unforced, and named its component.
    expect(p.asks.length, '清正 never asked').toBeGreaterThan(0);
    expect(p.asks.every((a) => a.skill === QINGZHENG)).toBe(true);
    expect(p.asks[0].url).toBe('packages/utility/qml/ChooseCardListBox.qml');

    // And the CLIENT got all of it. This is the half that was empty.
    expect(p.received.length).toBe(p.asks.length);
    const spec = readCustomDialog(p.received[0]);
    expect(spec, 'the client could not read the payload').not.toBeNull();
    expect(spec!.path).toBe('packages/utility/qml/ChooseCardListBox.qml');

    const list = cardListProps(spec!.prop);
    // 清正 groups a hand by suit and asks for exactly one of the four
    // (`qingzheng.lua:36-44`).
    expect(list.listNames).toEqual(['log_spade', 'log_club', 'log_heart', 'log_diamond']);
    expect(list.min).toBe(1);
    expect(list.max).toBe(1);
    expect(list.prompt).toBe('#mobile_qianlong__qingzheng-card');
    // Every card offered is a real card in 曹髦's hand, so the box has
    // something to draw.
    expect(list.listCards.flat().length).toBeGreaterThan(0);
  }, LONG);

  it('discards exactly the suit the panel picked', async () => {
    const p = await playQingzheng({ answer: panelAnswer });

    // `on_use` only runs when the cost was paid, so a throw at all is the skill
    // resolving. It discards the seat's own cards of the chosen suit first
    // (`qingzheng.lua:74`).
    expect(p.throws.length, '清正 never resolved').toBeGreaterThan(0);
    expect(p.throws.some((t) => t.ids.length > 0), '清正 discarded nothing').toBe(true);

    // The engine acted on what the panel sent: the first ask's chosen list is
    // the first thing thrown, id for id.
    const first = cardListProps(readCustomDialog(p.received[0])!.prop);
    const chosen = p.replies[0] as string[];
    expect(chosen).toHaveLength(1);
    const expected = first.listCards[first.listNames.indexOf(chosen[0])];
    expect([...p.throws[0].ids].sort((a, b) => a - b))
      .toEqual([...expected].sort((a, b) => a - b));
  }, LONG);

  it('could not, while the request went out empty', async () => {
    /*
     * THE CONTROL, and it is the bug rather than a reconstruction of it: the
     * engine's own `askToCustomDialog`, reinstalled verbatim, without the
     * overlay that carries `params.component`.
     *
     * The ask still happens — 清正 is still granted and still triggers — so
     * this is not "the skill went missing". It is the seat being handed a
     * question with nothing in it, five times, and having no answer but to
     * decline. If this ever goes green the test above has stopped measuring
     * anything.
     */
    const p = await playQingzheng({ answer: panelAnswer, unpatch: true });

    expect(p.asks.length, '清正 never asked').toBeGreaterThan(0);
    expect(p.received.length).toBe(p.asks.length);

    // Nothing on the wire says which box to draw.
    for (const data of p.received) expect(readCustomDialog(data)).toBeNull();
    // So the panel had nothing to answer with…
    expect(p.replies.every((r) => r === '')).toBe(true);
    // …and the skill never resolved once, all game.
    expect(p.throws).toEqual([]);
  }, LONG);

  it('is what a declined ask looks like, which is not a crash', async () => {
    // Cancel is a real answer here: `askForChooseCardList` reads `''` as "chose
    // nothing" (`packages/utility/utility.lua:623`) and 清正's cost then fails
    // cleanly. The game must finish either way — a skill nobody uses is not a
    // stuck table.
    const p = await playQingzheng({ answer: declineAnswer });

    expect(p.asks.length).toBeGreaterThan(0);
    expect(p.throws).toEqual([]);
    expect(p.over, 'the game did not finish').toBe(true);
  }, LONG);
});

/* ----------------------------------------------------------- translations */

/**
 * Every literal string the new panels put on screen must be a key the engine
 * defines — in BOTH languages, and to something other than itself.
 *
 * `src/room/__tests__/i18n.test.ts` owns this check for the room generally, but
 * its key universe is `src/room/dev/data/lua-data.json`, a snapshot taken before
 * `packages/utility` and `packages/mobile` were in the build. These panels draw
 * mobile content and name mobile strings, so the check for them belongs where a
 * real engine is booted. Scanning the component file rather than repeating a
 * list is deliberate: a key added to a panel is checked without anyone
 * remembering to add it here.
 *
 * It asks the CLIENT VM, not the host: `lua/web/client.lua:61` is what loads the
 * English table (`lua/web/i18n_en_US.lua`), and the client is the VM the room's
 * own `lua.tr` calls go to.
 */
describe('the strings the CustomDialog panels put on screen', () => {
  it('are all keys a booted engine translates, in zh_CN and en_US', async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '..', '..', 'room', 'dialogs', 'CustomDialogs.tsx'), 'utf8');
    const keys = [...new Set([...src.matchAll(/\blua\.tr\(\s*'([^']+)'/g)].map((m) => m[1]))];
    expect(keys.length, 'no lua.tr literals found — has the file moved?').toBeGreaterThan(4);

    const client = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
    try {
      const list = keys.map((k) => `"${k.replaceAll('"', '\\"')}"`).join(',');
      const got = JSON.parse(String(client.lua.doStringSync(`
        local out = {}
        for _, k in ipairs({${list}}) do
          out[#out + 1] = { k = k, zh = Fk:translate(k, "zh_CN"), en = Fk:translate(k, "en_US") }
        end
        return json.encode(out)
      `))) as { k: string; zh: string; en: string }[];

      /*
       * `Fk:translate` answers an unknown key with the key itself, so "came
       * back as itself" is exactly "nobody defined this" — but only in zh_CN.
       * The keys ARE English (`OK`, `Clear All`), so a defined en_US entry
       * legitimately equals its own key and cannot be tested that way; what
       * en_US has to be is present and non-empty.
       */
      const missing = got.filter((r) => r.zh === r.k).map((r) => r.k);
      expect(missing).toEqual([]);
      expect(got.filter((r) => !r.en).map((r) => r.k)).toEqual([]);
    } finally {
      client.dispose();
    }
  }, LONG);
});
