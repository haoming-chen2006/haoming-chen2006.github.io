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
import { bundle, SEED, STANDARD_ROSTER_ONLY } from '../../engine/__tests__/support.ts';
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
        ownerId: 1, timeout: 15,
        // Pinned to the standard roster. The claim below - that every line
        // renders in English - is a claim about content that has been
        // translated, and `src/i18n/engine` covers the standard pack whole. The
        // mobile roster's coverage is measured in its own test, further down.
        settings: { gameMode: 'aaa_role_mode', ...STANDARD_ROSTER_ONLY },
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

  /**
   * The same path with the mobile roster in play, measured rather than asserted.
   *
   * `packages/mobile/i18n/en_US.lua` looks like a translation and is not one: it
   * registers 452 keys, of which 22 carry English. Names for 19 characters were
   * written down and then the work stopped - every skill description, every
   * voice line, every derived trigger badge and every prompt is still Chinese,
   * and `Fk:loadTranslationTable(..., 'en_US')` at `packages/mobile/init.lua:3`
   * files them under en_US anyway. So the engine answers an en_US lookup with
   * Chinese and nothing downstream can tell.
   *
   * This test is the tripwire for that number moving. It does not demand zero,
   * because zero is 6,683 keys of translation work that has not been done; it
   * demands that the mechanism still works (both renderings present, the log
   * still rendered per language) and that the leak does not silently grow.
   */
  it('shows how much of the mobile roster has no English yet', async () => {
    const b = bundle();
    const host = await InProcessLuaHost.create(b, {});
    const client = await MainThreadLuaClient.create(b, { playerId: 1, screenName: 'player1' });
    const lines: unknown[] = [];
    client.onNotifyUI((command, data) => { if (command === 'GameLog') lines.push(data); });

    const session = await RoomSession.start(
      host,
      {
        roomId: 'i18n-log-mobile', seed: SEED, seats: allBotSeats(8),
        ownerId: 1, timeout: 15, settings: { gameMode: 'aaa_role_mode' },
      },
      { onEnvelope: (e: Envelope) => { if (e.to === null || e.to === 1) client.deliverEnvelope(e); } },
    );
    expect((await session.advance()).err).toBeFalsy();
    expect(lines.length).toBeGreaterThan(10);

    // The mechanism is unaffected by the missing strings: every line still
    // arrives as a per-language map with both sides populated.
    for (const raw of lines) {
      const line = asLocalized(raw);
      expect(localize(line, 'zh_CN').length).toBeGreaterThan(0);
      expect(localize(line, 'en_US').length).toBeGreaterThan(0);
    }

    const english = lines.map((l) => localize(asLocalized(l), 'en_US'));
    const leaked = english.filter((s) => CJK.test(s)).length;
    const ratio = leaked / english.length;
    // Roughly one line in seven at the time of writing (54/385). A jump means
    // something regressed in the shared table, not that mobile got worse.
    expect(ratio, `${leaked}/${english.length} log lines are Chinese in en_US`)
      .toBeLessThan(0.35);

    client.dispose();
    host.dispose();
  }, LONG);
});
