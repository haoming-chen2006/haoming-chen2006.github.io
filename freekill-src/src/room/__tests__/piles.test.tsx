/**
 * A seat's private piles, from the engine to the pixels.
 *
 * WHAT WAS WRONG. `Photo.qml:174-208` keeps a counter for every private pile a
 * seat owns — `updatePileInfo` asks `Ltk.getPile(pid, name)` and writes the
 * count into the same mark row 〖忍戒〗and 〖屯田〗's own marks go into — and
 * `MarkArea.qml:66-113` makes each row a tap target that opens the pile. The
 * port tracked `state.piles` off `MoveCards` and read it in exactly one place
 * (the exchange box), so on the table itself a pile did not exist: `getPile`,
 * `getAllPiles` and the tap were all missing, and 邓艾's 田, 甘宁's 铃, 李丰's
 * 粮 and 23 other piles across the loaded roster were invisible. For 屯田 that
 * is not cosmetic — the size of the pile IS the general's distance modifier
 * (`packages/mobile/pkg/shzl_ex/skills/tuntian.lua:57-60`).
 *
 * HOW THE PILE IS MADE HERE. `ServerPlayer:addToPile` is the only way any pile
 * in the game is ever created — every one of the 28 `addToPile` call sites in
 * the packages funnels into `moveCardTo(..., Card.PlayerSpecial, ...)`
 * (`lua/lunarltk/server/serverplayer.lua:265`). The probe calls it directly at
 * the first turn rather than waiting for 屯储 to fire on a bot's whim; the move,
 * the notify, the client's own `special_cards`, the store and the render are all
 * the real thing.
 *
 * THE SECOND PILE IS THE POINT OF THE FIRST. `$`-prefixed piles are private:
 * `Player:cardVisible` reads `specialName and not specialName:startsWith("$")`
 * (`lua/lunarltk/core/player.lua:1621`), so another seat may count them and not
 * read them. That rule is not restated on this side — `inspectMark` asks
 * `cardVisibility` per card and keeps what comes back — and the test below is
 * what says so.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Envelope } from '../../contract/protocol.ts';
import type { AssetManifest } from '../../contract/manifest.ts';
import { MainThreadLuaClient } from '../../engine/luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../../engine/luaHost.ts';
import { RoomSession } from '../../engine/roomSession.ts';
import { PlayerState } from '../../engine/types.ts';
import { bundle, SEED, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support.ts';
import { Assets } from '../assets/assets.ts';
import { Photo } from '../components/Photo.tsx';
import { inspectMark, pileCounts } from '../components/marks.ts';
import { LtkLua } from '../ltk/LtkLua.ts';
import { makeNaming, RoomProvider, type RoomServices } from '../RoomContext.tsx';
import { RoomStore } from '../state/store.ts';

const LONG = 300_000;
const ME = 1;
const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/** 李丰's 屯储 pile, which the packages translate as 粮
 *  (`packages/mobile/pkg/mobile_sp/skills/tunchu.lua:10`). */
const OPEN = 'lifeng_liang';
/** A private pile. The `$` is the engine's own "nobody else reads this". */
const HIDDEN = '$mutao';

const PROBE = `
__piles = {}
local Turn = GameEvent.Turn
local oldMain = Turn.main
local done = false
Turn.main = function(self)
  local room = self.room
  if not done then
    done = true
    local target
    for _, p in ipairs(room.alive_players) do
      if p.id ~= ${ME} and target == nil then target = p end
    end
    local top = room:getNCards(3)
    target:addToPile("${OPEN}", top, true, "tunchu")
    local more = room:getNCards(2)
    target:addToPile("${HIDDEN}", more, false, "tunchu")
    __piles = { who = target.id, open = top, hidden = more }
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
}

async function seat(): Promise<Table> {
  const host = await InProcessLuaHost.create(bundle(), {});
  expect(String(host.lua.doStringSync(PROBE))).toBe('ok');

  const client = await MainThreadLuaClient.create(bundle(), { playerId: ME, screenName: 'player1' });
  const store = new RoomStore(ME);
  const lua = new LtkLua(client);

  client.onNotifyUI((command, data) => {
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
      roomId: `piles-${SEED}`,
      seed: SEED,
      seats,
      ownerId: ME,
      timeout: 15,
      settings: { gameMode: 'aaa_role_mode', ...STANDARD_ROSTER_ONLY },
    },
    { onEnvelope: (e: Envelope) => { if (e.to === null || e.to === ME) client.deliverEnvelope(e); } },
  );
  return { host, client, lua, session, store };
}

/** Answer whatever is open, the way `live-room.test.ts` does. Nothing decides. */
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

describe('a private pile on somebody else\'s seat', () => {
  it('is counted on the portrait and opened by tapping it', async () => {
    const t = await seat();
    try {
      for (let i = 0; i < 40; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();
        if (t.store.state.piles && Object.keys(t.store.state.piles).length) break;
        answer(t);
        for (const o of t.client.drainOutbound().filter((x) => x.kind === 'reply')) {
          await t.host.pushReplyRaw(ME, o.payload);
        }
      }
      t.store.commit();

      const probe = JSON.parse(String(t.host.lua.doStringSync('return json.encode(__piles)'))) as {
        who: number; open: number[]; hidden: number[];
      };
      expect(probe.who, 'the probe put the piles somewhere').toBeGreaterThan(0);
      expect(probe.open).toHaveLength(3);
      expect(probe.hidden).toHaveLength(2);

      const owner = probe.who;
      const piles = t.store.state.piles[owner];

      // The store transported both piles off `MoveCards`, exactly as before.
      // This half passed before the fix too; it is here so a failure below is
      // unambiguously the room and not the wire.
      expect(Object.keys(piles ?? {}).sort()).toEqual([HIDDEN, OPEN].sort());

      // Both get a counter, private or not — `updatePileInfo` skips only `#`.
      expect([...pileCounts(piles)].sort()).toEqual([[HIDDEN, 2], [OPEN, 3]].sort());

      /* ---- what the seat actually draws ---- */
      const player = t.store.state.players[owner];
      const services: RoomServices = {
        store: t.store,
        lua: t.lua,
        assets: new Assets(EMPTY_MANIFEST),
        mode: 'play',
        meId: ME,
        naming: makeNaming(t.store),
      };
      const html = renderToStaticMarkup(
        <RoomProvider value={services}>
          <Photo
            player={player}
            piles={piles}
            isCurrent={false}
            handCount={(t.store.state.hands[owner] ?? []).length}
            focus={null}
          />
        </RoomProvider>,
      );

      // 粮 3. Before the fix the mark row ignored `piles` entirely and this
      // string did not appear in the seat's markup at all.
      expect(html, 'the open pile is counted on the portrait')
        .toContain(`${t.lua.tr(OPEN)} 3`);
      expect(html, 'the private pile is counted too')
        .toContain(`${t.lua.tr(HIDDEN)} 2`);

      /* ---- what tapping one opens ---- */
      // The engine's own answer, twice: `GetPile` for the contents and
      // `CardVisibility` for what this viewer may read of them.
      const open = inspectMark(t.lua, OPEN, null, owner);
      expect(open, 'tapping a public pile opens it').not.toBeNull();
      expect(open?.kind).toBe('cards');
      expect(open?.kind === 'cards' ? [...open.ids].sort() : [])
        .toEqual([...probe.open].sort());

      // And the rule this side does not restate: `$`-prefixed is private, so
      // another seat counts it and cannot read it.
      expect(inspectMark(t.lua, HIDDEN, null, owner), 'a `$` pile stays shut')
        .toBeNull();
    } finally {
      t.client.dispose();
      t.host.dispose();
    }
  }, LONG);
});
