/**
 * The announcement channel, end to end.
 *
 * `Client:appendLog` sends every log message flagged `toast = true` twice — once
 * as `GameLog` and once as `ShowToast` (`lua/lunarltk/client/client.lua:234`,
 * and the port's own `lua/web/client.lua:187`, which renders both languages
 * first). The second copy is the engine saying "announce this", and it had no
 * handler anywhere in `src/`: it fell through `applyNotify`'s default and was
 * dropped, along with every draw announcement, 议事's verdict, 拼点's
 * `#ChangePindianNumber` and 谷虎's claim.
 *
 * THE DRAW IS NOT SIMULATED. `Room:getNCards` shuffles the discard pile back in
 * when the draw pile is short and, if that still is not enough, sends
 * `#NoCardDraw` with `toast = true` and calls `gameOver("")`
 * (`lua/lunarltk/server/room.lua:298-306`). The probe below only makes the
 * table reach that state sooner: at the first turn it moves all but a few cards
 * out of both piles into the void, using the engine's own `changeCardArea`.
 * Everything after that — the exhausted draw, the log line, the toast, the
 * draw ending — is the engine playing the game it always plays.
 *
 * WHAT WOULD PASS WITHOUT THE FIX. `wire` counts the raw `ShowToast` messages,
 * so this file distinguishes "the engine never announced it" from "the room
 * threw it away". Before `case 'ShowToast'` existed, `wire` was already
 * non-zero and `store.state.toasts` was empty — which is exactly the assertion
 * pair below.
 */
import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../../engine/luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../../engine/luaHost.ts';
import { RoomSession } from '../../engine/roomSession.ts';
import { PlayerState } from '../../engine/types.ts';
import { bundle, SEED, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support.ts';
import { LtkLua } from '../ltk/LtkLua.ts';
import { RoomStore } from '../state/store.ts';
import { toastOpacity } from '../components/Toasts.tsx';

const LONG = 300_000;
const ME = 1;

/**
 * Starve both piles at the first turn boundary.
 *
 * `changeCardArea` is the engine's own "move cards between draw pile, discard
 * pile and void without an event" (`room.lua:3699`), so nothing here reaches
 * into a table the engine does not expect to be written. Four cards is enough
 * for a play phase to draw and not enough for the next one.
 */
const STARVE = `
local Turn = GameEvent.Turn
local oldMain = Turn.main
local done = false
Turn.main = function(self)
  local room = self.room
  if not done then
    done = true
    local dump = {}
    for i = 5, #room.draw_pile do dump[#dump + 1] = room.draw_pile[i] end
    for _, id in ipairs(room.discard_pile) do dump[#dump + 1] = id end
    if #dump > 0 then room:changeCardArea(dump, Card.Void) end
  end
  return oldMain(self)
end
return "ok"
`;

interface Table {
  host: InProcessLuaHost;
  client: MainThreadLuaClient;
  lua: LtkLua;
  session: RoomSession;
  store: RoomStore;
  /** Raw `ShowToast` payloads as they came off the wire, before the store. */
  wire: unknown[];
}

async function seat(): Promise<Table> {
  const host = await InProcessLuaHost.create(bundle(), {});
  expect(String(host.lua.doStringSync(STARVE))).toBe('ok');

  const client = await MainThreadLuaClient.create(bundle(), { playerId: ME, screenName: 'player1' });
  const store = new RoomStore(ME);
  const lua = new LtkLua(client);
  const wire: unknown[] = [];

  client.onNotifyUI((command, data) => {
    if (command === 'ShowToast') wire.push(data);
    store.applyNotify(String(command), data);
    if (command === 'ReplyToServer') {
      try { lua.finishRequestUI(); } catch { /* engine gone */ }
    }
  });

  const seats = allBotSeats(8).map((s) =>
    (s.playerId === ME ? { ...s, state: PlayerState.Online as 1 } : s));
  const session = await RoomSession.start(
    host,
    {
      roomId: `toast-${SEED}`,
      seed: SEED,
      seats,
      ownerId: ME,
      timeout: 15,
      settings: { gameMode: 'aaa_role_mode', ...STANDARD_ROSTER_ONLY },
    },
    { onEnvelope: (e: Envelope) => { if (e.to === null || e.to === ME) client.deliverEnvelope(e); } },
  );
  return { host, client, lua, session, store, wire };
}

/** Answer whatever is open the way `live-room.test.ts` does: press what the
 *  scene lit, and take the first offer from a dialog. Nothing here decides. */
function answer(t: Table): void {
  const { store, client, lua } = t;
  const req = store.state.request;
  if (req.kind === 'none') { lua.replyToServer(''); return; }
  if (req.kind === 'dialog') {
    if (req.command === 'AskForGeneral') {
      const [generals, n] = req.data as [string[], number];
      lua.replyToServer(generals.slice(0, n));
    } else {
      lua.replyToServer('');
    }
    store.closeRequest();
    try { lua.finishRequestUI(); } catch { /* engine gone */ }
    return;
  }
  const press = (id: string) => client.interact({ elemType: 'Button', id, action: 'click' });
  if (store.scene.items.Button?.End?.enabled) { press('End'); return; }
  if (store.scene.items.Button?.OK?.enabled) { press('OK'); return; }
  press('Cancel');
}

describe('what the engine announces', () => {
  it('reaches the table when the draw pile runs dry', async () => {
    const t = await seat();
    try {
      let over = false;
      for (let i = 0; i < 200 && !over; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) { over = true; break; }
        t.store.commit();
        answer(t);
        for (const o of t.client.drainOutbound().filter((x) => x.kind === 'reply')) {
          await t.host.pushReplyRaw(ME, o.payload);
        }
      }
      t.store.commit();

      // The engine did announce it. If this fails the probe is wrong, not the room.
      expect(t.wire.length, 'ShowToast messages on the wire').toBeGreaterThan(0);

      // And the room kept it. This is the whole fix: before `case 'ShowToast'`
      // the line above passed and this one did not.
      const toasts = t.store.state.toasts;
      expect(toasts.length, 'toasts the room is holding').toBeGreaterThan(0);

      // Both languages, because `lua/web/client.lua` renders both and a toast
      // must retranslate on a language toggle the way the log does.
      const texts = toasts.map((x) => x.html);
      expect(texts.some((x) => x.zh_CN.includes('牌堆被摸空了'))).toBe(true);
      expect(texts.some((x) => x.en_US.includes('Card Pile is empty'))).toBe(true);

      // The announcement is the reason the game ended, which is why it has to
      // be readable over the game-over box rather than under it.
      expect(t.store.state.gameOver, 'the draw ended the game').not.toBeNull();
    } finally {
      t.client.dispose();
      t.host.dispose();
    }
  }, LONG);

  /** `Toast.qml`: fade in over 300 ms, hold at .9, fade out over 300 ms, gone
   *  at 3 s. Interpolated rather than animated so `prefers-reduced-motion`
   *  cannot make an announcement invisible. */
  it('fades the way the Qt toast does', () => {
    expect(toastOpacity(-1)).toBe(0);
    expect(toastOpacity(0)).toBe(0);
    expect(toastOpacity(150)).toBeCloseTo(0.45, 5);
    expect(toastOpacity(300)).toBeCloseTo(0.9, 5);
    expect(toastOpacity(1500)).toBeCloseTo(0.9, 5);
    expect(toastOpacity(2850)).toBeCloseTo(0.45, 5);
    expect(toastOpacity(3000)).toBe(0);
    expect(toastOpacity(9999)).toBe(0);
  });
});
