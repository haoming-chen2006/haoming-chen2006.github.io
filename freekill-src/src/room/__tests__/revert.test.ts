/**
 * 反选, and the pending-skill readout that gates it.
 *
 * `Room.qml:244-249` puts a `Revert Selection` button on the control bar,
 * enabled while `dashboard.pending_skill !== ""` — which is
 * `Ltk.getPendingSkill()`, refreshed on every scene change
 * (`Dashboard.qml:195`). Pressing it runs `RevertSelection` in the client VM,
 * which unselects every pending card and then selects every card the scene will
 * still take (`client_util.lua:1123-1150`).
 *
 * Both calls sat on `LtkLua` with no caller anywhere in `src/`, so the port had
 * no button and nothing that could tell you which skill your hand was currently
 * committed to. On a multi-card active skill that means clicking every card off
 * and every other card on by hand.
 *
 * WHAT IS ASSERTED. That the two forwarders answer, and that the inversion is
 * real — the selection after the call is a DIFFERENT set from the one before,
 * arrived at entirely inside the engine. Nothing in `src/room` decides which
 * cards may be selected, before or after.
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

const LONG = 300_000;
const ME = 1;

/**
 * 涉猎 — a one-shot active skill that takes as many cards as it is given, so
 * there is something to invert. Granted at the first turn rather than waited
 * for; the skill, its filter and the scene are the engine's own.
 */
const SKILL = 'zhiheng';

const GRANT = `
local Turn = GameEvent.Turn
local oldMain = Turn.main
local done = false
Turn.main = function(self)
  local room = self.room
  if not done then
    done = true
    local me = room:getPlayerById(${ME})
    if me then room:handleAddLoseSkills(me, "${SKILL}", nil, false, false) end
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
      roomId: `revert-${SEED}`,
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

function selected(store: RoomStore): number[] {
  return Object.entries(store.scene.items.CardItem ?? {})
    .filter(([, v]) => v.selected === true)
    .map(([k]) => Number(k))
    .sort((a, b) => a - b);
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

describe('inverting a card selection', () => {
  it('names the pending skill and hands the inversion to the engine', async () => {
    const t = await seat();
    try {
      // Idle: no active skill is choosing, so there is no pending skill and the
      // button upstream draws would be disabled.
      expect(t.lua.getPendingSkill(), 'nothing pending before a request').toBe('');

      let reached = false;
      for (let i = 0; i < 300 && !reached; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();
        const req = t.store.state.request;
        if (
          req.kind === 'scene' && req.command === 'PlayCard'
          && t.store.scene.items.SkillButton?.[SKILL]?.enabled === true
        ) { reached = true; break; }
        answer(t);
        for (const o of t.client.drainOutbound().filter((x) => x.kind === 'reply')) {
          await t.host.pushReplyRaw(ME, o.payload);
        }
      }
      expect(reached, `${SKILL} was never offered to this seat`).toBe(true);

      // Press the skill. From here the hand is committed to it, which is
      // precisely what `GetPendingSkill` reports and what enables the button.
      t.lua.interact('SkillButton', SKILL, 'click', { selected: true, autoTarget: false });
      t.store.commit();
      expect(t.lua.getPendingSkill(), 'the hand is committed to this skill').toBe(SKILL);

      const offered = Object.entries(t.store.scene.items.CardItem ?? {})
        .filter(([, v]) => v.enabled === true)
        .map(([k]) => Number(k));
      expect(offered.length, 'something to invert').toBeGreaterThanOrEqual(2);

      t.lua.interact('CardItem', offered[0], 'click', { selected: true, autoTarget: false });
      t.store.commit();
      const before = selected(t.store);
      expect(before).toEqual([offered[0]]);

      // The inversion itself. Everything about which cards end up selected is
      // decided by `RevertSelection` inside the client VM — and the diff it
      // produces has to reach the board, which is what `flushUi` is for. With
      // the flush missing the call ran, the VM's selection changed, and the
      // scene the room draws did not move at all until the next click.
      t.lua.revertSelection();
      t.store.commit();
      const after = selected(t.store);

      expect(after, 'everything that was off is now on, and vice versa')
        .toEqual(offered.filter((cid) => cid !== offered[0]).sort((a, b) => a - b));
      expect(after, 'and it is not the selection we started with').not.toEqual(before);

      // And it closes again with the request.
      t.lua.interact('Button', 'Cancel', 'click');
      t.store.commit();
      expect(t.lua.getPendingSkill(), 'nothing pending once the ask is over').toBe('');
    } finally {
      t.client.dispose();
      t.host.dispose();
    }
  }, LONG);
});
