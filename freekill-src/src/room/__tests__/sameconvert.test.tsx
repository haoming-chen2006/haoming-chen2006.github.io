/**
 * 替换武将 — the choice the port was not offering.
 *
 * Every general's id ends in its `trueName` (`general.lua:56`), so `guanyu`,
 * `ex__guanyu` and `js__guanyu` are three printings of one man, and
 * `Engine:getSameGenerals` hands back the printings of a given name that this
 * room may actually use (`engine.lua:333-340`). `ChooseGeneralBox.qml:119-126`
 * turns that into a `Same General Convert` button on the 选将 box, gated on
 * `no_convert` — which defaults to FALSE (`room.lua:1192`), so it is not a 国战
 * feature, it is on every deal.
 *
 * The port destructured past `data[2]`, had no button, and `getSameGenerals`
 * had no caller anywhere in `src/`. A player dealt 关羽 could not reach 界关羽.
 *
 * WHAT THIS PROVES, in the order it matters:
 *
 *   1. the roster really does offer alternatives — measured off a live deal,
 *      not asserted about a name this file picked;
 *   2. the engine accepts a converted reply and seats the converted general,
 *      which is what makes the whole feature legitimate rather than a client
 *      that lies to itself (`askToChooseGeneral` returns `req:getResult`
 *      verbatim — see `FreeAssign.tsx`, which rests on the same fact);
 *   3. the box draws the button when there is something to convert.
 *
 * The click itself is not exercised: this repository has no DOM test
 * environment, so `.tsx` suites render through `renderToStaticMarkup`. What a
 * click does — substitute one slot in the offer — is `assign`, the function
 * free assign has used since it was built.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Envelope } from '../../contract/protocol.ts';
import type { AssetManifest } from '../../contract/manifest.ts';
import { MainThreadLuaClient } from '../../engine/luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../../engine/luaHost.ts';
import { RoomSession } from '../../engine/roomSession.ts';
import { PlayerState } from '../../engine/types.ts';
import { bundle, SEED } from '../../engine/__tests__/support.ts';
import { Assets } from '../assets/assets.ts';
import { DialogHost } from '../dialogs/DialogHost.tsx';
import { conversionsFor } from '../dialogs/SameConvert.tsx';
import { LtkLua } from '../ltk/LtkLua.ts';
import { makeNaming, RoomProvider, type RoomServices } from '../RoomContext.tsx';
import { RoomStore } from '../state/store.ts';

const LONG = 300_000;
const ME = 1;
const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

interface Table {
  host: InProcessLuaHost;
  client: MainThreadLuaClient;
  lua: LtkLua;
  session: RoomSession;
  store: RoomStore;
}

/**
 * Three men who each have other printings.
 *
 * A three-card offer out of a 600-general pool contains an alternative only by
 * luck, and a test that depends on the deal is a test that reports the deal.
 * So the offer to the seat under test is pinned with a probe on
 * `Room:askToChooseGeneral` — the offer, and only the offer. Everything after
 * it is the engine's: which alternatives exist (`getSameGenerals`), whether the
 * reply is accepted, and which general the seat ends up playing.
 *
 * The names are not invented. Scanning the loaded roster for `trueName`s with
 * three or more usable printings finds 78 of them; these are three, and the
 * scan is repeated below so a build that loses those packs fails here loudly
 * instead of quietly testing nothing.
 */
const OFFER = ['caopi', 'caozhen', 'caozhi'] as const;

const PIN = `
__pinned = false
-- Both general-choice paths funnel through one Request: the lord's goes via
-- Room:askToChooseGeneral (room.lua:1175) and everyone else's is built inline
-- (gamelogic.lua:115). In both, the candidate list is data[1] -- which is also
-- why data[2] means "n" for one and "no_convert" for the other, and why a
-- non-lord seat receives no no_convert at all.
local oldSetData = Request.setData
Request.setData = function(self, player, data)
  if self.command == "AskForGeneral" and player.id == ${ME}
      and not __pinned and type(data[1]) == "table" then
    __pinned = true
    data[1] = { ${OFFER.map((g) => `"${g}"`).join(', ')} }
  end
  return oldSetData(self, player, data)
end
return "ok"
`;

async function seat(): Promise<Table> {
  const host = await InProcessLuaHost.create(bundle(), {});
  expect(String(host.lua.doStringSync(PIN))).toBe('ok');

  const client = await MainThreadLuaClient.create(bundle(), { playerId: ME, screenName: 'player1' });
  const store = new RoomStore(ME);
  const lua = new LtkLua(client);
  client.onNotifyUI((command, data) => {
    store.applyNotify(String(command), data);
    if (command === 'ReplyToServer') {
      try { lua.finishRequestUI(); } catch { /* engine gone */ }
    }
  });

  const seats = allBotSeats(4).map((s) =>
    (s.playerId === ME ? { ...s, state: PlayerState.Online as 1 } : s));
  const session = await RoomSession.start(
    host,
    {
      roomId: `convert-${SEED}`,
      seed: SEED,
      seats,
      ownerId: ME,
      timeout: 15,
      settings: { gameMode: 'aaa_role_mode' },
    },
    { onEnvelope: (e: Envelope) => { if (e.to === null || e.to === ME) client.deliverEnvelope(e); } },
  );
  return { host, client, lua, session, store };
}

describe('another printing of the same man', () => {
  it('is offered, is drawn, and is accepted by the engine', async () => {
    const t = await seat();
    try {
      let offer: string[] | null = null;
      let want = 1;
      for (let i = 0; i < 40 && !offer; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();
        const req = t.store.state.request;
        if (req.kind === 'dialog' && req.command === 'AskForGeneral') {
          const [generals, n] = req.data as [string[], number?];
          offer = generals;
          want = n ?? 1;
          break;
        }
        // Anything else, answer minimally and keep going.
        t.lua.replyToServer('');
        t.store.closeRequest();
        for (const o of t.client.drainOutbound().filter((x) => x.kind === 'reply')) {
          await t.host.pushReplyRaw(ME, o.payload);
        }
      }
      expect(offer, 'this seat was asked to choose a general').not.toBeNull();
      const generals = offer as string[];
      expect(generals, 'the probe pinned the offer').toEqual([...OFFER]);

      // 78 men in this build have three or more usable printings. If that ever
      // falls to zero the feature is unreachable and this file should say so
      // rather than pass on an offer that happens to have been pinned.
      const multi = Number(t.host.lua.doStringSync(`
        local groups = {}
        for name, g in pairs(Fk.generals) do
          if not g.hidden and not g.total_hidden then
            groups[g.trueName] = (groups[g.trueName] or 0) + 1
          end
        end
        local n = 0
        for _, c in pairs(groups) do if c >= 2 then n = n + 1 end end
        return n
      `));
      expect(multi, 'men with more than one printing in the loaded roster')
        .toBeGreaterThan(20);

      /* ---- 1. the roster really does offer alternatives ---- */
      const groups = conversionsFor(t.lua, generals);
      expect(groups.length, `nothing on offer (${generals.join(', ')}) has another printing`)
        .toBeGreaterThan(0);
      const [from, alts] = groups[0];
      const to = alts[0];
      // The engine excludes the general itself and anything this room bans, so
      // a conversion is never a no-op and never an illegal general.
      expect(to).not.toBe(from);
      expect(generals).not.toContain(to);

      /* ---- 3. the box draws the button ---- */
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
          <DialogHost onReply={() => {}} interactive />
        </RoomProvider>,
      );
      expect(html, 'the convert button is on the choose-general box')
        .toContain(t.lua.tr('Same General Convert'));

      // And `no_convert` — `data[2]`, which the box used to destructure past —
      // takes it away again. The lord's ask carries the flag
      // (`room.lua:1192`); a non-lord's four-element payload does not, which is
      // why it must read as "convertible" when absent.
      const draw = (noConvert: boolean) => {
        const store = new RoomStore(ME);
        store.applyNotify('AskForGeneral', [generals, want, noConvert, false, 'askForGeneralsChosen', { n: want }]);
        store.commit();
        return renderToStaticMarkup(
          <RoomProvider value={{ ...services, store, naming: makeNaming(store) }}>
            <DialogHost onReply={() => {}} interactive />
          </RoomProvider>,
        );
      };
      expect(draw(false), 'absent flag means convertible')
        .toContain(t.lua.tr('Same General Convert'));
      expect(draw(true), 'no_convert hides it')
        .not.toContain(t.lua.tr('Same General Convert'));

      /* ---- 2. the engine seats the converted general ---- */
      // Exactly what the box sends after a conversion: the offer with one slot
      // substituted, sliced to the number asked for.
      const answer = generals.map((g) => (g === from ? to : g)).slice(0, want);
      expect(answer).toContain(to);
      t.lua.replyToServer(answer);
      t.store.closeRequest();
      try { t.lua.finishRequestUI(); } catch { /* engine gone */ }
      for (const o of t.client.drainOutbound().filter((x) => x.kind === 'reply')) {
        await t.host.pushReplyRaw(ME, o.payload);
      }

      let seated = '';
      for (let i = 0; i < 40 && !seated; i++) {
        const res = await t.session.advance();
        if (res.err) throw new Error(res.err);
        if (res.over) break;
        t.store.commit();
        seated = t.store.state.players[ME]?.general ?? '';
        if (seated) break;
        const req = t.store.state.request;
        if (req.kind !== 'none') {
          t.lua.replyToServer('');
          t.store.closeRequest();
        } else {
          t.lua.replyToServer('');
        }
        for (const o of t.client.drainOutbound().filter((x) => x.kind === 'reply')) {
          await t.host.pushReplyRaw(ME, o.payload);
        }
      }
      expect(seated, 'the engine seated the converted printing').toBe(to);
    } finally {
      t.client.dispose();
      t.host.dispose();
    }
  }, LONG);
});
