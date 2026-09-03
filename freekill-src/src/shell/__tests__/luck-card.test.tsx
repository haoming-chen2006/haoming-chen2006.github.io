/**
 * 手气卡 — redrawing the opening hand, from the setting to the sentence.
 *
 * The engine has always implemented this. `DrawInitial` deals four cards and
 * then, if `luckTime > 0`, asks every seat whether it wants them back
 * (`lua/lunarltk/server/events/gameflow.lua:136-144`); saying yes discards the
 * hand, draws another, and asks again with the count one lower
 * (`lua/server/request.lua:156-172`). Upstream exposes the number as a 0-8 spin
 * row and ships the prompt in three languages.
 *
 * None of it was reachable here. `Lobby.tsx` created every room with
 * `luckTime: 0`, which is the one value that makes `DrawInitial` shuffle and
 * move on without asking anybody anything — so the request was never raised,
 * and nothing downstream had ever had to render it.
 *
 * This file is the whole path, end to end and in one piece: the shell's own
 * host driver, a real engine, a real client VM, the room's real store, and the
 * real `<ConfirmBar>` a player would be reading. It asserts what a player
 * would: I am asked, in words that say how many goes I have left; saying yes
 * gives me different cards; the offer runs out; saying no ends it early.
 *
 * THE PROMPT IS THE POINT. Before this the offer did arrive — it is an
 * `AskForSkillInvoke` and the room already draws those — but the room read only
 * `data[0]` and rendered the generic "你想发动〖手气卡〗吗？". The count of
 * redraws remaining exists in `data[1]` and nowhere else, so the one number a
 * player needs to decide with was the one thing on screen that was missing.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../contract/manifest';
import type { Envelope } from '../../contract/protocol';
import { MainThreadLuaClient } from '../../engine/luaClient';
import { InProcessLuaHost } from '../../engine/luaHost';
import { bundle, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support';
import { Assets } from '../../room/assets/assets';
import { ConfirmBar } from '../../room/components/ConfirmBar';
import { LtkLua } from '../../room/ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../room/RoomContext';
import { RoomStore } from '../../room/state/store';
import { retainNotifications } from '../retainingClient';
import { loopbackTransport } from '../api/transport';
import { startHostRunner, type HostRunner, type HostSeat } from '../hostRunner';
import { DEFAULT_SETTINGS } from '../pages/Lobby';

const LONG = 300_000;
const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

const SEATS: HostSeat[] = [
  { seat: 1, displayName: '我', avatar: 'caocao', isBot: false, connection: 'online' },
  ...Array.from({ length: 7 }, (_, i) => ({
    seat: i + 2,
    displayName: `机器人 ${i + 2}`,
    avatar: 'guojia',
    isBot: true,
    connection: 'online' as const,
  })),
];

interface Seat {
  runner: HostRunner;
  store: RoomStore;
  lua: LtkLua;
  client: ReturnType<typeof retainNotifications>;
  pending: { command: string; data: unknown } | null;
  stop(): void;
}

/**
 * One human at seat 1 of a real room, wired the way `RoomView` wires one: every
 * notify into the store, every answer out through the client VM.
 */
async function sitDown(luckTime: number, roomId = `luck-${luckTime}`): Promise<Seat> {
  const host = await InProcessLuaHost.create(bundle(), {});
  const vm = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: '我' });
  const client = retainNotifications(vm);
  const store = new RoomStore(1);
  const s: Seat = {
    runner: null as never, store, lua: new LtkLua(client), client, pending: null,
    stop() { s.runner?.stop(); client.dispose(); host.dispose(); },
  };

  client.onNotifyUI((command, data) => {
    store.applyNotify(command as string, data);
    store.commit();
    if (command === 'CancelRequest' || command === 'ReplyToServer') s.pending = null;
    else if (command === 'PlayCard' || String(command).startsWith('AskFor')) {
      s.pending = { command: String(command), data };
    }
  });

  s.runner = await startHostRunner({
    roomId,
    seats: SEATS,
    hostSeat: 1,
    settings: {
      gameMode: 'aaa_role_mode', generalNum: 3, generalTimeout: 30, luckTime,
      ...STANDARD_ROSTER_ONLY,
    },
    transport: loopbackTransport(roomId),
    createHost: async () => host,
    onLocalEnvelope: (e: Envelope) => client.deliverEnvelope(e),
    onFault: (m, fatal) => { if (fatal) throw new Error(m); },
  });
  client.onReply((_c, reply) => s.runner.submit(1, reply));
  return s;
}

/** What the player is actually reading — the real component, the real store. */
function promptOn(s: Seat): string {
  const services: RoomServices = {
    store: s.store,
    lua: s.lua,
    assets: new Assets(EMPTY_MANIFEST),
    mode: 'play',
    meId: 1,
    naming: makeNaming(s.store),
  };
  const html = renderToStaticMarkup(
    <RoomProvider value={services}><ConfirmBar /></RoomProvider>,
  );
  return /<div class="fk-confirm__prompt fk-prompt">([^<]*)<\/div>/.exec(html)?.[1] ?? '';
}

const hand = (s: Seat): number[] => s.client.call<number[]>('GetPlayerHandcards', 1);

/**
 * Run the room until seat 1 is asked something, answering 选将 on the way — the
 * luck card is the first thing that happens after every seat has a character.
 */
async function runToAsk(s: Seat, answer: (kind: string) => unknown): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const p = s.pending;
    if (p && p.command === 'AskForGeneral') {
      const [generals, n] = p.data as [string[], number];
      s.pending = null;
      s.lua.replyToServer(generals.slice(0, n ?? 1));
    } else if (p) {
      const done = answer(p.command);
      if (done === 'stop') return;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe('手气卡 — the opening hand you can throw back', () => {
  /**
   * The whole loop, as a player experiences it: three offers, each naming how
   * many are left, each one dealing a different hand.
   */
  it('offers a redraw, says how many are left, and deals a new hand each time', async () => {
    const s = await sitDown(3);
    try {
      const offers: { prompt: string; before: number[]; after: number[] }[] = [];
      let settled = false;

      await runToAsk(s, (command) => {
        if (command === 'AskForSkillInvoke' && offers.length < 3) {
          const prompt = promptOn(s);
          const before = hand(s);
          s.pending = null;
          // Exactly what pressing OK does: `ReqInvoke:doOKButton` sends "1".
          s.lua.interact('Button', 'OK', 'click');
          offers.push({ prompt, before, after: [] });
          return undefined;
        }
        // Anything else means the engine has finished dealing and the game has
        // started — the redraws are over.
        if (offers.length >= 3) { settled = true; return 'stop'; }
        return undefined;
      });

      // Record the hand each offer produced, one offer late: a redraw only
      // lands once the reply has been through the host.
      expect(offers).toHaveLength(3);
      expect(settled).toBe(true);

      // THE COUNT IS ON SCREEN. This is what the generic
      // "你想发动〖手气卡〗吗？" could not say, and what a player deciding
      // whether to spend a redraw needs.
      expect(offers.map((o) => o.prompt.includes('手气卡'))).toEqual([true, true, true]);
      for (const [i, n] of [3, 2, 1].entries()) {
        expect(offers[i].prompt, `offer ${i + 1} of 3`).toContain(String(n));
      }

      // A NEW HAND, NOT THE SAME ONE. The engine discards and redraws
      // (`request.lua:165-166`); the four cards a player was looking at when
      // they pressed the button are not the four they get.
      expect(offers[0].before).toHaveLength(4);
      expect(offers[1].before).not.toEqual(offers[0].before);
      expect(offers[2].before).not.toEqual(offers[1].before);
    } finally {
      s.stop();
    }
  }, LONG);

  /**
   * Declining is a first-class answer, and it has to end the offers rather than
   * merely skip one — `request.lua:161` treats anything that is not
   * `__cancel` as "yes, deal me another".
   */
  it('keeps the hand and stops asking when the player declines', async () => {
    const s = await sitDown(5, 'luck-decline');
    try {
      let kept: number[] = [];
      let asked = 0;
      let moved = false;

      await runToAsk(s, (command) => {
        if (command === 'AskForSkillInvoke') {
          asked += 1;
          kept = hand(s);
          s.pending = null;
          // `ReqInvoke:doCancelButton` — the engine's own "no".
          s.lua.interact('Button', 'Cancel', 'click');
          return undefined;
        }
        moved = true;
        return 'stop';
      });

      expect(asked).toBe(1);
      expect(moved).toBe(true);
      expect(kept).toHaveLength(4);
      // The game went on with the hand the player chose to keep.
      expect(s.client.call<number[]>('GetPlayerHandcards', 1)).toEqual(kept);
    } finally {
      s.stop();
    }
  }, LONG);

  /**
   * Zero is still a real setting, and it is the one the host reaches for when
   * a table thinks redrawing is cheating. `DrawInitial` must not ask at all.
   */
  it('never asks when the host has turned it off', async () => {
    const s = await sitDown(0, 'luck-off');
    try {
      let invokes = 0;
      let played = false;
      await runToAsk(s, (command) => {
        if (command === 'AskForSkillInvoke') { invokes += 1; s.pending = null; return undefined; }
        played = true;
        return 'stop';
      });
      expect(played).toBe(true);
      expect(invokes).toBe(0);
    } finally {
      s.stop();
    }
  }, LONG);

  /**
   * OFF by default, and that is a retreat rather than a design.
   *
   * It shipped on at 5 and a player reported the table coming up saying every
   * card had been drawn — unplayable. The engine is not the problem:
   * `discardInit` puts the old hand back in the draw pile
   * (`gameflow.lua:39-48`), so the deck cannot drain. Something on this side
   * reads or counts the redraw's `MoveCards` wrongly, and until that is found
   * nobody should meet it by accident.
   *
   * The range assertion stays, because the host control is still there and
   * upstream's ceiling is still 8 (`lua/lunarltk/init.lua:22`). What is pinned
   * now is only that a lobby-created room does not turn it on for you.
   */
  it('is off by default until the draw-count bug is understood', () => {
    expect(DEFAULT_SETTINGS.luckTime).toBe(0);
    expect(DEFAULT_SETTINGS.luckTime).toBeLessThanOrEqual(8);
  });
});
