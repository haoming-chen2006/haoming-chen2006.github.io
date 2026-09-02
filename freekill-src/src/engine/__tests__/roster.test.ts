import { describe, expect, it } from 'vitest';
import { MainThreadLuaClient } from '../luaClient.ts';
import { bundle, STANDARD_ROSTER_ONLY } from './support.ts';

const LONG = 300_000;

/**
 * `STANDARD_ROSTER_ONLY` has to name every pack that puts a general or a card
 * into a game, bar the three the standard game is made of, or the suites using
 * it quietly play something other than what they were written about — and they
 * fail somewhere else entirely when they do.
 *
 * Cards matter as much as generals here: `disabled_packs` gates both
 * (`Engine:getAllCardIds`, lua/lunarltk/core/engine.lua:545 and 563), one extra
 * card shifts every draw after it, and the failure surfaces as a timing
 * assertion in a different suite. That is not hypothetical — it is what the six
 * mirrored rosters did, via a single 木牛流马 in `standard_ex_cards`.
 */
describe('the standard-roster pin', () => {
  it('names every pack that adds a general or a card, except the standard three', async () => {
    const c = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
    try {
      const packs: string[] = JSON.parse(String(c.lua.doStringSync(`
        -- utility is the shared skill/event library every pack requires. Its
        -- one card spec is a derived card, so it never reaches the draw pile --
        -- the plain standard deck is 160 (108 + 52) with it loaded -- and the
        -- library cannot be disabled without taking the roster with it.
        local keep = { standard = true, standard_cards = true, maneuvering = true,
                       utility = true }
        local out = {}
        for _, name in ipairs(Fk.package_names) do
          local p = Fk.packages[name]
          local contributes = p and ((p.type == Package.GeneralPack and #p.generals > 0)
            or (p.card_specs and #p.card_specs > 0))
          if contributes and not keep[name] and not name:match("^test") then
            out[#out + 1] = name
          end
        end
        table.sort(out)
        return json.encode(out)
      `)));
      const pinned = new Set<string>(STANDARD_ROSTER_ONLY.disabledPack);
      expect(packs.filter((p) => !pinned.has(p)), 'add these to support.ts').toEqual([]);
    } finally {
      c.dispose();
    }
  }, LONG);
});

/**
 * A general in the pool must not carry a skill that calls a Room method this
 * engine does not have.
 *
 * This is the failure mode `lua/web/roomcompat.lua` was written for, and the
 * one that is hardest to see: Lua resolves a method at the call, not at load,
 * so a skill file referencing a method that does not exist loads perfectly and
 * throws only when the skill fires. The engine swallows errors raised inside a
 * skill, so the game does not crash — the skill just silently does nothing, and
 * the player cannot tell, because the general card still prints it.
 *
 * Mirroring six more packs in turned up two of these on main effect paths:
 * 界仁德 wanted `room:getUniversalCards` for the bonus use it grants from the
 * second card given in a phase, and 焚心 wanted `room:changeRole`, which is the
 * whole of that skill. Both loaded clean and both would have shipped broken.
 *
 * The check is deliberately about the POOL, not about the packs: a pack may
 * reference anything it likes, so long as no general offering that skill can be
 * chosen. That is exactly the contract `lua/web/roster.lua` implements, and
 * keeping the assertion at the pool boundary means a future engine upgrade that
 * supplies the method lets the generals back in with no edit here.
 */
/**
 * A general in the pool must not carry a skill that names a card this engine
 * does not have.
 *
 * Same shape as the Room-method check below and a worse failure mode. A skill
 * that clones an unregistered card throws at `Engine:cloneCard` every time it
 * fires, and the engine swallows errors raised inside a skill — so usually the
 * skill just silently does nothing. But 〖授书〗 hangs off `fk.RoundStart` and
 * throws inside its own `can_trigger`, which took the round's turn logic down
 * with it: the round counter advanced, nobody drew, nobody played, nobody died,
 * and a game reached 999 rounds with 16 `MoveCards` in it before the audit's cap
 * stopped it. One missing card, one general, one game that cannot end.
 *
 * The card names are read out of the bundle rather than listed, so a seventh
 * pack referencing a card we do not ship fails here by name.
 */
describe('every general the pool can offer, on cards', () => {
  it('names only cards this engine actually has', async () => {
    const refs = new Map<string, Set<string>>(); // card -> files
    const PATTERNS = [
      /prepareDeriveCards\s*\(\s*\{\s*\{\s*"([a-z0-9_]+)"/g,
      /cloneCard\s*\(\s*"([a-z0-9_]+)"/g,
      /useVirtualCard\s*\(\s*"([a-z0-9_]+)"/g,
    ];
    const b = bundle();
    for (const [path, src] of Object.entries(b)) {
      if (!path.startsWith('packages/')) continue;
      for (const re of PATTERNS) {
        for (const m of src.matchAll(re)) {
          (refs.get(m[1]) ?? refs.set(m[1], new Set()).get(m[1])!).add(path);
        }
      }
    }
    expect(refs.size).toBeGreaterThan(5);

    const c = await MainThreadLuaClient.create(b, { playerId: 1, screenName: 'p1' });
    try {
      const names = [...refs.keys()].sort();
      const absent: string[] = JSON.parse(String(c.lua.doStringSync(`
        local want = { ${names.map((n) => JSON.stringify(n)).join(', ')} }
        local out = {}
        for _, n in ipairs(want) do
          if not (Fk.all_card_types or Util.DummyTable)[n] then out[#out + 1] = n end
        end
        return json.encode(out)
      `)));

      const tainted = new Set<string>();
      for (const card of absent) {
        for (const path of refs.get(card)!) {
          for (const m of b[path].matchAll(/^\s*name\s*=\s*"([^"]+)"/gm)) tainted.add(m[1]);
        }
      }
      const offered: string[] = JSON.parse(String(c.lua.doStringSync(`
        local tainted = {}
        for _, s in ipairs({ ${[...tainted].map((s) => JSON.stringify(s)).join(', ')} }) do
          tainted[s] = true
        end
        local bad = {}
        for name, g in pairs(Fk.generals or Util.DummyTable) do
          if not g.hidden and not g.total_hidden then
            for _, s in ipairs(g.other_skills or Util.DummyTable) do
              if tainted[s] then bad[#bad + 1] = name .. " / " .. s end
            end
          end
        end
        table.sort(bad)
        return json.encode(bad)
      `)));

      expect(
        offered,
        `these generals are selectable but carry a skill naming a card this ` +
          `engine lacks (${absent.join(', ')}); add the skill to REQUIRED_CARDS ` +
          `in lua/web/roster.lua`,
      ).toEqual([]);
    } finally {
      c.dispose();
    }
  }, LONG);
});

describe('every general the pool can offer', () => {
  it('calls only Room methods this engine actually has', async () => {
    // Which `room:<method>(` each Lua file in the shipped bundle calls. Read off
    // the bundle rather than the disk, so this asks about what really ships.
    const callers = new Map<string, Set<string>>(); // method -> files
    for (const [path, src] of Object.entries(bundle())) {
      if (!path.startsWith('packages/')) continue;
      for (const m of src.matchAll(/\broom:([A-Za-z_]\w*)\s*[({"']/g)) {
        (callers.get(m[1]) ?? callers.set(m[1], new Set()).get(m[1])!).add(path);
      }
    }
    expect(callers.size).toBeGreaterThan(50); // a regex that matched nothing proves nothing

    const c = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
    try {
      const names = [...callers.keys()].sort();
      const absent: string[] = JSON.parse(String(c.lua.doStringSync(`
        local want = { ${names.map((n) => JSON.stringify(n)).join(', ')} }
        local missing = {}
        for _, name in ipairs(want) do
          local found = false
          for _, game in pairs(Fk.boardgames or Util.DummyTable) do
            local k = game.room_klass
            if type(k) == "table" and k[name] ~= nil then found = true end
          end
          if not found then missing[#missing + 1] = name end
        end
        return json.encode(missing)
      `)));

      // The skill each implicated file declares. Skill files name their skeleton
      // at the top (`fk.CreateSkill{ name = "..." }`), which is the same string
      // `General:addSkill` stores, so this joins the two without a hand table.
      const tainted = new Set<string>();
      for (const method of absent) {
        for (const path of callers.get(method)!) {
          for (const m of bundle()[path].matchAll(/^\s*name\s*=\s*"([^"]+)"/gm)) tainted.add(m[1]);
        }
      }

      // A general is in the pool when it is neither hidden nor total_hidden —
      // the same condition `Engine:getGeneralsRandomly` uses (engine.lua:325).
      const offered: string[] = JSON.parse(String(c.lua.doStringSync(`
        local tainted = {}
        for _, s in ipairs({ ${[...tainted].map((s) => JSON.stringify(s)).join(', ')} }) do
          tainted[s] = true
        end
        local bad = {}
        for name, g in pairs(Fk.generals or Util.DummyTable) do
          if not g.hidden and not g.total_hidden then
            for _, s in ipairs(g.other_skills or Util.DummyTable) do
              if tainted[s] then bad[#bad + 1] = name .. " / " .. s end
            end
          end
        end
        table.sort(bad)
        return json.encode(bad)
      `)));

      expect(
        offered,
        `these generals are selectable but carry a skill calling a Room method ` +
          `this engine lacks (${absent.join(', ')}); add the skill to ` +
          `REQUIRED_ROOM_METHODS in lua/web/roster.lua`,
      ).toEqual([]);
    } finally {
      c.dispose();
    }
  }, LONG);
});
