import { describe, expect, it } from 'vitest';
import { allBotSeats, InProcessLuaHost } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { bundle, sha } from './support.ts';

const LONG = 300_000;

/**
 * The four seats. 神马超 plus three generals with nothing that reacts to
 * damage, so the battery below measures 驭雳 and not somebody else's 奸雄.
 * With `generalNum: 1` and exactly as many generals as seats, all four are
 * seated.
 */
const ROSTER = ['mobile__godmachao', 'zhangfei', 'huangyueying', 'guanyu'] as const;

interface Shot {
  label: string;
  /** Nature handed to `room:damage`, and the nature it resolved as. */
  inNature: string;
  outNature: string;
  damage: number;
  prevented: boolean;
  /** HP the *recipient* lost, and cards the recipient gained, over the call. */
  hpLost: number;
  drew: number;
}

/**
 * A scripted damage battery, fired at the first turn boundary of a real game.
 *
 * `room:damage` is the same entry every card and skill uses
 * (`lua/lunarltk/server/events/hp.lua:322`), so each shot runs the whole
 * pipeline - `fk.PreDamage`, `fk.DamageCaused`, `fk.DetermineDamageCaused`,
 * `fk.DamageInflicted`, `fk.DetermineDamageInflicted`, then `ChangeHp`
 * (`hp.lua:206-213`). Driving it directly rather than waiting for bots to
 * happen to draw a 雷杀 is what makes the measurement complete: every nature,
 * both directions, in one deterministic pass.
 *
 * The order keeps 神马超 alive: the two he shrugs off come first, then the
 * three that cost him a point each, from 4 HP down to 1.
 */
const BATTERY = `
__probe = {}
local NATURE = { [1] = "normal", [2] = "thunder", [3] = "fire", [4] = "ice" }
local Turn = GameEvent.Turn
local oldMain = Turn.main
local fired = false
Turn.main = function(self)
  if not fired then
    fired = true
    local room = self.room
    local mc, other
    for _, p in ipairs(room.alive_players) do
      if p.general == "mobile__godmachao" then mc = p else other = other or p end
    end
    local function shot(label, from, to, nature)
      local hp0, hand0 = to.hp, #to:getCardIds("h")
      local d = DamageData:new {
        from = from, to = to, damage = 1, damageType = nature, skillName = "probe",
      }
      room:damage(d)
      __probe[#__probe + 1] = {
        label = label,
        inNature = NATURE[nature],
        outNature = NATURE[d.damageType] or tostring(d.damageType),
        damage = d.damage,
        prevented = d.prevented and true or false,
        hpLost = hp0 - to.hp,
        drew = #to:getCardIds("h") - hand0,
      }
    end
    shot("incoming thunder", other, mc, 2)
    shot("self normal", mc, mc, 1)
    shot("incoming normal", other, mc, 1)
    shot("incoming fire", other, mc, 3)
    shot("incoming ice", other, mc, 4)
    shot("outgoing normal", mc, other, 1)
  end
  return oldMain(self)
end
return "ok"
`;

/**
 * Run the battery in a real room. `mutate` is Lua applied to the loaded skills
 * before the room starts, so a deliberately broken 驭雳 can be measured with
 * the same instrument as the shipped one.
 */
async function battery(mutate = ''): Promise<Shot[]> {
  const host = await InProcessLuaHost.create(bundle(), {});
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
    expect(String(host.lua.doStringSync(BATTERY))).toBe('ok');
    if (mutate) host.lua.doStringSync(mutate);

    const session = await RoomSession.start(host, {
      roomId: 'damagenature',
      seed: 3,
      seats: allBotSeats(ROSTER.length),
      ownerId: 1,
      timeout: 15,
      settings: {
        gameMode: 'aaa_role_mode',
        generalNum: 1,
        disabledGenerals: pool.filter((g) => !ROSTER.includes(g as typeof ROSTER[number])),
      },
    }, { bundleSha: await sha() });

    for (let i = 0; i < 400; i++) {
      const res = await session.advance();
      if (res.err) throw new Error(res.err);
      if (res.over) break;
      const n = Number(host.lua.doStringSync(`return #__probe`));
      if (n >= 6) break;
    }
    const shots = JSON.parse(String(host.lua.doStringSync(`return json.encode(__probe)`))) as Shot[];
    expect(shots.map((s) => s.label)).toEqual([
      'incoming thunder', 'self normal', 'incoming normal',
      'incoming fire', 'incoming ice', 'outgoing normal',
    ]);
    return shots;
  } finally {
    host.dispose();
  }
}

const by = (shots: Shot[], label: string): Shot => {
  const hit = shots.find((s) => s.label === label);
  if (!hit) throw new Error(`no shot ${label}`);
  return hit;
};

/**
 * 神马超's 驭雳 rewrites damage nature, and the direction it rewrites in is the
 * whole skill.
 *
 * 「锁定技，1.你造成的伤害改为雷电伤害，已是雷电伤害则伤害+1；2.你受到雷电伤害时，
 * 防止之并摸等量牌。」 - two clauses pointing opposite ways. Clause 1 is a
 * `fk.DamageCaused` effect and the engine triggers that one on `damageData.from`
 * (`lua/lunarltk/server/events/hp.lua:210`); clause 2 is
 * `fk.DetermineDamageInflicted`, triggered on `damageData.to` (`hp.lua:213`).
 * Both guards read `target == player` (`mobile_shiji/skills/yuli.lua:21` and
 * `:41`), which means "the owner is this event's subject" - the source for one,
 * the victim for the other.
 *
 * Collapse that distinction and 神马超 becomes immune to everything: clause 1
 * would turn incoming damage of any nature into thunder, and clause 2 would then
 * prevent it. That is exactly what a player reported seeing, so it is worth a
 * standing measurement rather than a reading of the source. It is a cheap
 * mistake to make, too - it is one dropped conjunct, and clause 1 already lost a
 * conjunct once upstream (`packages/mobile@3ec8fc8` removed `not data.chain`).
 *
 * The second test is the control. It injects that exact break and shows the
 * assertions below go red, so this file cannot rot into a test that passes
 * because it measures nothing.
 */
/** The skill text, as assertions. Shared so the control can prove it bites. */
function assertYuli(shots: Shot[]): void {
  // Clause 1 is not his to apply here: he is the victim, not the source.
  for (const label of ['incoming normal', 'incoming fire', 'incoming ice']) {
    const s = by(shots, label);
    expect(`${label}: ${s.inNature} -> ${s.outNature}`).toBe(`${label}: ${s.inNature} -> ${s.inNature}`);
    expect(s.prevented, `${label} must not be prevented`).toBe(false);
    expect(s.hpLost, `${label} must cost him a point of HP`).toBe(1);
    expect(s.drew, `${label} must not pay him cards`).toBe(0);
  }

  // Clause 2, the one immunity he does have, and the draw that comes with it.
  const thunder = by(shots, 'incoming thunder');
  expect(thunder.prevented).toBe(true);
  expect(thunder.hpLost).toBe(0);
  expect(thunder.drew).toBe(1);

  // Clause 1 on damage he deals: nature rewritten, damage still lands.
  const outgoing = by(shots, 'outgoing normal');
  expect(outgoing.outNature).toBe('thunder');
  expect(outgoing.prevented).toBe(false);
  expect(outgoing.hpLost).toBe(1);

  // Damage he deals to himself is where the two clauses legitimately meet:
  // clause 1 makes it thunder because he is the source, then clause 2 prevents
  // it because he is the victim. This is the only route by which damage he
  // takes turns into thunder, and it is the composition the skill text
  // describes rather than a defect.
  const self = by(shots, 'self normal');
  expect(self.outNature).toBe('thunder');
  expect(self.prevented).toBe(true);
  expect(self.hpLost).toBe(0);
  expect(self.drew).toBe(1);
}

describe('驭雳 rewrites the damage 神马超 deals, not the damage he takes', () => {
  it('leaves every nature aimed at him alone, and prevents only thunder', async () => {
    assertYuli(await battery());
  }, LONG);

  it('goes red when clause 1 fires for him as victim', async () => {
    // `sk.triggerable` is where a skeleton's `can_trigger` ends up
    // (`lua/lunarltk/core/skill_skeleton.lua:284`). Dropping `target == player`
    // from it is the reported bug, expressed in one line.
    const shots = await battery(`
      Fk.skills["yuli"].triggerable = function(self, event, target, player, data)
        return player:hasSkill("yuli")
      end
    `);

    // The reported symptom, both halves of it: a plain 【杀】 arrives as thunder
    // and is then prevented, leaving him untouched.
    const s = by(shots, 'incoming normal');
    expect(s.outNature).toBe('thunder');
    expect(s.prevented).toBe(true);
    expect(s.hpLost).toBe(0);

    // And the test above is what would have caught it.
    expect(() => assertYuli(shots)).toThrow();
  }, LONG);
});
