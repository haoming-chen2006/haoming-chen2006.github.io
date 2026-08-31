/**
 * The battle log, in both languages, through the real path.
 *
 * `src/i18n/__tests__/coverage.test.ts` proves the tables are complete and that
 * `RoomStore` keeps whatever it is handed. This proves the thing in between:
 * that a real client VM, fed by a real host, emits `GameLog` with a rendering
 * per language — which is the only reason a player switching to English gets an
 * English battle log rather than a Chinese one.
 *
 * It exists because the first attempt at this shipped looking correct and was
 * not: `ClientBase:initialize` copies `self.appendLog` into `self.callbacks` at
 * construction (`lua/client/clientbase.lua:45`), so overriding the method on the
 * instance afterwards changed nothing the server could reach. A unit test on the
 * store would have passed; only driving the engine catches it.
 */
import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../../engine/luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../../engine/luaHost.ts';
import { RoomSession } from '../../engine/roomSession.ts';
import { bundle, SEED } from '../../engine/__tests__/support.ts';
import { asLocalized, localize } from '../localized';

const LONG = 300_000;

/** Ideographs only: the English side uses ♠♥ and full-width colons quite happily. */
const CJK = /[㐀-䶿一-鿿豈-﫿]/;

describe('the battle log the engine actually emits', () => {
  it('carries a Chinese and an English rendering of every line', async () => {
    const b = bundle();
    const host = await InProcessLuaHost.create(b, {});
    const client = await MainThreadLuaClient.create(b, { playerId: 1, screenName: 'player1' });
    const lines: unknown[] = [];
    client.onNotifyUI((command, data) => { if (command === 'GameLog') lines.push(data); });

    // Eight bots and one silent watcher. The bots make every decision, so the
    // game plays itself to the end; the client VM is here only to render what
    // it is broadcast, which is exactly what it does for a real spectator.
    const session = await RoomSession.start(
      host,
      {
        roomId: 'i18n-log', seed: SEED, seats: allBotSeats(8),
        ownerId: 1, timeout: 15, settings: { gameMode: 'aaa_role_mode' },
      },
      { onEnvelope: (e: Envelope) => { if (e.to === null || e.to === 1) client.deliverEnvelope(e); } },
    );
    const res = await session.advance();
    expect(res.err, `game did not finish: ${res.err}`).toBeFalsy();

    expect(lines.length, 'the engine produced no log at all').toBeGreaterThan(10);

    for (const raw of lines) {
      expect(typeof raw, `GameLog should be a per-language map, got ${typeof raw}`).toBe('object');
      const line = asLocalized(raw);
      expect(localize(line, 'zh_CN').length).toBeGreaterThan(0);
      expect(localize(line, 'en_US').length).toBeGreaterThan(0);
    }

    // The point of all of it: the English rendering is English.
    const english = lines.map((l) => localize(asLocalized(l), 'en_US'));
    const stillChinese = english.filter((s) => CJK.test(s));
    expect(
      stillChinese.slice(0, 5),
      `${stillChinese.length}/${english.length} log lines are still Chinese in en_US`,
    ).toEqual([]);

    // And the two renderings really are different text, not the same string twice.
    const zh = lines.map((l) => localize(asLocalized(l), 'zh_CN'));
    expect(english.some((s, i) => s !== zh[i])).toBe(true);

    client.dispose();
    host.dispose();
  }, LONG);
});
