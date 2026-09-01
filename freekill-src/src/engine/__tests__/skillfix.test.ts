import { describe, expect, it } from 'vitest';
import { MainThreadLuaClient } from '../luaClient.ts';
import { bundle } from './support.ts';

const LONG = 300_000;

/**
 * A prohibit skill has to survive being asked without a user.
 *
 * `Player:isProhibitedTarget(card)` asks "may this player be the target of this
 * card at all", with nobody using it, so it calls every `ProhibitSkill` with a
 * nil `from` (`lua/lunarltk/core/player.lua:1338`). `fk_ex.lua:174` types the
 * parameter `Player?` for exactly that reason. 〖驱乘〗 dereferenced it anyway
 * — `from:hasSkill(...)` on the first line of its guard
 * (`packages/mobile/pkg/mobile_rare/skills/qusheng.lua:67`) — so with
 * 车里吉 at the table, every legality check for moving a delayed trick around
 * the board threw out of `canMoveCardInBoardTo` and killed the skill that was
 * asking. Two games in 220.
 *
 * The scan below is what found it, kept as the test: one nil-`from` call per
 * prohibit skill in the whole loaded roster. A second package with the same
 * mistake fails here, loudly, instead of costing somebody a skill in one game
 * out of a hundred.
 */
describe('a prohibit skill asked without a user', () => {
  it('answers rather than throwing, for every skill in the roster', async () => {
    const c = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
    try {
      // `Fk:currentRoom()` is `ClientInstance` on this side, so the skills that
      // consult the room mid-check have one. `Self` is the target; a delayed
      // trick is the card, because that is the only thing the engine moves
      // through `isProhibitedTarget` today.
      const report = JSON.parse(String(c.lua.doStringSync(`
        local card = Fk:cloneCard("indulgence")
        local scanned, bad = 0, {}
        for name, skill in pairs(Fk.skills) do
          if type(skill) == "table" and skill.isProhibited
            and skill.isInstanceOf and skill:isInstanceOf(ProhibitSkill) then
            scanned = scanned + 1
            local ok, err = pcall(skill.isProhibited, skill, nil, Self, card)
            if not ok then bad[#bad + 1] = name .. " | " .. tostring(err) end
          end
        end
        table.sort(bad)
        return json.encode { scanned = scanned, bad = bad }
      `))) as { scanned: number; bad: string[] };

      // A roster with no prohibit skills would pass the assertion below while
      // proving nothing.
      expect(report.scanned).toBeGreaterThan(10);
      expect(report.bad).toEqual([]);
    } finally {
      c.dispose();
    }
  }, LONG);
});
