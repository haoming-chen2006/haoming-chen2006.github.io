/**
 * 〖离间〗's two words, which the port drew nowhere.
 *
 * `Room.qml:745-753` re-asks `Ltk.getTargetTip(pid)` for every seat on every
 * scene change, and `Photo.qml:399-450` draws the answers across the middle of
 * the portrait. It is the engine's channel for "here is what targeting THIS one
 * does", and in the shipped roster the thing that needs it most is 貂蝉:
 * 离间 asks for two men and its own `target_tip`
 * (`packages/standard/pkg/skills/lijian.lua:36-43`) writes 先出杀 over the one
 * who Slashes first and 后出杀 over the one who answers. Nothing else
 * distinguishes the two clicks. `LtkLua.getTargetTip` existed with no caller,
 * so a player using 离间 in this port was picking blind.
 *
 * TWO FAULTS, ONE FEATURE. The forwarder was also mistyped: `GetTargetTip`
 * returns the empty *string* when no active skill is mid-selection
 * (`client_util.lua:971`), which `?? []` does not catch — a caller that mapped
 * over it would have drawn one chip per character. Both are asserted below.
 *
 * WHAT IS FORCED AND WHAT IS NOT. The probe grants 离间 to the seat under test
 * at the first turn, because waiting for the deal to hand it to seat 1 and then
 * for a bot to reach a play phase with a spare card is not a measurement. The
 * skill, its target filter, its tips and the scene that decides which seats are
 * selectable are all the engine's, untouched — the test only presses what the
 * scene lit, and reads the tips back through the same facade `Photo` uses.
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
import { LtkLua } from '../ltk/LtkLua.ts';
import type { TargetTip } from '../ltk/types.ts';
import { makeNaming, RoomProvider, type RoomServices } from '../RoomContext.tsx';
import { RoomStore } from '../state/store.ts';

const LONG = 300_000;
const ME = 1;
const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

const GRANT = `
local Turn = GameEvent.Turn
local oldMain = Turn.main
local done = false
Turn.main = function(self)
  local room = self.room
  if not done then
    done = true
    local me = room:getPlayerById(${ME})
    if me then room:handleAddLoseSkills(me, "lijian", nil, false, false) end
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
  expect(String(host.lua.doStringSync(GRANT))).toBe('ok');

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
      roomId: `tip-${SEED}`,
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

/** What the scene has lit, read off the scene and nowhere else. */
function lit(store: RoomStore, type: string): string[] {
  return Object.entries(store.scene.items[type] ?? {})
    .filter(([, v]) => v.enabled === true && v.selected !== true)
    .map(([k]) => k);
}

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

/** `RoomView`'s own memo body, verbatim: one `getTargetTip` per seat the scene
 *  knows about. Kept here rather than exported so the room keeps owning it. */
function tipsFor(store: RoomStore, lua: LtkLua): Map<number, readonly TargetTip[]> {
  const out = new Map<number, readonly TargetTip[]>();
  for (const id of Object.keys(store.scene.items.Photo ?? {})) {
    const tips = lua.getTargetTip(Number(id));
    if (tips.length) out.set(Number(id), tips);
  }
  return out;
}

describe('the hint the engine puts on a target', () => {
  it('tells 离间 apart, and is an array when there is nothing to say', async () => {
    const t = await seat();
    try {
      // Nothing is open yet, so `GetTargetTip` has no handler to read and
      // answers the empty STRING (`client_util.lua:971`). The forwarder must
      // still hand back a list — `?? []` did not, and a caller that mapped over
      // the result would have drawn one chip per character.
      const idle = t.lua.getTargetTip(ME);
      expect(Array.isArray(idle), 'getTargetTip must always answer a list').toBe(true);
      expect(idle).toEqual([]);

      let reached = false;
      for (let i = 0; i < 300 && !reached; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();

        const req = t.store.state.request;
        if (
          req.kind === 'scene' && req.command === 'PlayCard'
          && t.store.scene.items.SkillButton?.lijian?.enabled === true
        ) {
          reached = true;
          break;
        }
        answer(t);
        for (const o of t.client.drainOutbound().filter((x) => x.kind === 'reply')) {
          await t.host.pushReplyRaw(ME, o.payload);
        }
      }
      expect(reached, '离间 was never offered to this seat').toBe(true);

      // Press the skill, then a card — exactly what `Dashboard`'s two handlers
      // send. Everything after this is the engine deciding who is targetable.
      t.lua.interact('SkillButton', 'lijian', 'click', { selected: true, autoTarget: false });
      t.store.commit();
      const card = lit(t.store, 'CardItem')[0];
      expect(card, '离间 wants a card to discard').toBeDefined();
      t.lua.interact('CardItem', Number(card), 'click', { selected: true, autoTarget: false });
      t.store.commit();

      const candidates = lit(t.store, 'Photo').map(Number);
      expect(candidates.length, 'two men to set against each other').toBeGreaterThanOrEqual(2);

      const tips = tipsFor(t.store, t.lua);
      for (const pid of candidates) {
        expect(tips.get(pid)?.map((x) => x.content), `tip on seat ${pid}`).toEqual(['lijian_tip_1']);
      }

      /* ---- and on the seat itself ---- */
      const owner = candidates[0];
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
            player={t.store.state.players[owner]}
            item={t.store.scene.items.Photo?.[String(owner)]}
            targetTips={tips.get(owner)}
            isCurrent={false}
            handCount={0}
            focus={null}
          />
        </RoomProvider>,
      );
      // 先出杀. Before the fix `Photo` had no target-tip row and this was absent.
      expect(html, 'the tip is drawn on the portrait').toContain(t.lua.tr('lijian_tip_1'));

      /* ---- and it changes when a target is picked ---- */
      t.lua.interact('Photo', owner, 'click', { selected: true, autoTarget: false });
      t.store.commit();
      const after = tipsFor(t.store, t.lua);
      expect(after.get(owner)?.map((x) => x.content), 'the picked seat still Slashes first')
        .toEqual(['lijian_tip_1']);
      const other = lit(t.store, 'Photo').map(Number).find((p) => p !== owner);
      if (other !== undefined) {
        expect(after.get(other)?.map((x) => x.content), 'the rest answer it')
          .toEqual(['lijian_tip_2']);
      }
    } finally {
      t.client.dispose();
      t.host.dispose();
    }
  }, LONG);
});
