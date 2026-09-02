import { describe, expect, it } from 'vitest';
import { STANDARD_PACKAGES, buildBundle } from '../node/buildBundle.ts';
import { createLuaVm } from '../vm.ts';

/**
 * The repo's own luaunit suites, run against the wasm-hosted engine.
 *
 * These are driven by C++ fixtures in the Qt build (`test/lua_core_test.cpp:36`
 * does `dofile('test/lua/cpp_run.lua')` then `lu.LuaUnit.run()`), and they use
 * the pure-Lua stubs in `lua/lsp/` rather than this lane's host shims. That is
 * the point: they check that the *engine* behaves the same under wasm,
 * independently of anything `src/engine` does.
 *
 * The only adaptation is `lua/web/luaunit.lua`, which hands back the three
 * globals the C++ fixture provides - `__package`, `__os`, `__io` - because
 * `lua/freekill.lua` deletes `package`, `os` and `io` on the way past.
 *
 * WHY THESE RUN ON THE STANDARD PACKAGE SET AND NOT THE SHIPPED ONE. The
 * fixtures are written against the four packages the Qt build's C++ test target
 * installs, and `test/lua/core/engine.lua:18` says so out loud - it asserts
 * `extension_names` is exactly `{standard, standard_cards, maneuvering, test}`.
 * Running them with content packs loaded tests a configuration upstream never
 * claimed. The suites' purpose is engine-under-wasm parity, and pinning the
 * package set is what keeps that the only variable.
 *
 * `mobile`'s own suites are covered separately, below.
 */
const UPSTREAM_PACKAGES = [...STANDARD_PACKAGES, 'test'];

const ENTRIES = [
  { entry: 'test/lua/cpp_run.lua', name: 'core', expected: 14 },
  { entry: 'test/lua/cpp_run_gamelogic.lua', name: 'game logic', expected: 7 },
  { entry: 'test/lua/cpp_run_skill.lua', name: 'skills', expected: 39 },
];

describe('the existing luaunit suites under wasm', () => {
  for (const { entry, name, expected } of ENTRIES) {
    it(`passes the ${name} suite`, async () => {
      // `sitePackages: []` matters as much as the package list: `webmodes` is
      // discovered by the same `packages/` enumeration, so leaving it in would
      // fail `test/lua/core/engine.lua:18` the same way an extra content pack
      // does.
      const bundle = buildBundle({
        includeTests: true, packages: UPSTREAM_PACKAGES, sitePackages: [],
      });
      const vm = await createLuaVm(bundle, { logLevels: new Set() });
      try {
        vm.lua.doStringSync(`dofile('lua/web/luaunit.lua')`);
        expect(vm.lua.doStringSync(`return FKUnit.boot()`)).toBe(true);
        vm.lua.global.set('__fk_entry', entry);
        const out = JSON.parse(String(vm.lua.doStringSync(`return FKUnit.run(__fk_entry)`)));
        expect(out.error ?? null).toBeNull();
        expect(out.ok).toBe(true);
        expect(out.failures).toBe(0);
        expect(out.output).toContain(`${expected} successes, 0 failures`);
      } finally {
        vm.close();
      }
    }, 300_000);
  }
});

/**
 * Every content pack in the shipped bundle ships luaunit tests of its own, and
 * they all run whenever that bundle is loaded. 53 tests now: the standard set's
 * 39, mobile's 3, and 11 from the six mirrored rosters. 47 pass.
 *
 * The six failures are pinned here by name rather than waved through, so that a
 * *different* skill breaking is still a red test. What is and is not known
 * about them:
 *
 * `m_ex__mieji` is the long-standing one. Fixture coupling, not an engine
 * defect: the test draws two cards and asserts the target ends up empty-handed,
 * which only holds for particular draws, and `mobile_derived` puts ten more
 * equipment cards in the deck. It reproduces identically under four different
 * `hashSeedEpoch` values, so it is not our VM's iteration order.
 *
 * `ex__luoyi`, `jiyuan`, `luanwu` and `qinyin` arrived with the mirrored packs
 * and all four have the same shape: a test that hands a fixed card id to a
 * fixed target and asserts an hp. Each is off by exactly the damage of one
 * unresolved hit, which is what a fixture gets when the deck it indexes into is
 * not the deck it was written against — and `standard_ex_cards` adds 木牛流马 to
 * that deck (see `src/room/__tests__/draw-pile.test.ts`, 160 -> 161). That is
 * the same cause as `m_ex__mieji` and it is CONSISTENT with these, not proven
 * for them. Nobody has run them under Qt, where the deck is different again;
 * there is no Qt build here to run them with. Treat the four as unverified
 * rather than as cleared — see the note in `packages/provenance.json`.
 *
 * `tianyi` is an error rather than a failure, and it is the one thing here that
 * is definitely not a rules question: the test reaches into the CLIENT's
 * current request handler and calls `cardValidity` on it. That method exists on
 * this engine (`lua/lunarltk/core/request_type/play_card.lua:29`), so the
 * handler that is current at that moment under wasm is simply not the
 * `ReqPlayCard` the test casts it to. It asserts about a UI affordance, not
 * about what the skill does.
 */
describe("the content packs' own luaunit suites", () => {
  it('run under wasm, with six known content failures', async () => {
    const bundle = buildBundle({ includeTests: true });
    const vm = await createLuaVm(bundle, { logLevels: new Set() });
    try {
      vm.lua.doStringSync(`dofile('lua/web/luaunit.lua')`);
      expect(vm.lua.doStringSync(`return FKUnit.boot()`)).toBe(true);
      vm.lua.global.set('__fk_entry', 'test/lua/cpp_run_skill.lua');
      const out = JSON.parse(String(vm.lua.doStringSync(`return FKUnit.run(__fk_entry)`)));
      expect(out.error ?? null).toBeNull();

      // 14 more than the standard set's 39: mobile's 3 and the six mirrored
      // rosters' 11. Pinned so that a pack quietly failing to contribute its
      // tests reads as a failure rather than as a smaller green number.
      expect(out.output).toContain('Ran 53 tests');
      const failed = (out.output as string)
        .split('\n')
        .filter((l) => /\.lua:\d+: expected/.test(l))
        .map((l) => l.trim())
        .sort();
      expect(failed).toEqual([
        './packages/mobile/pkg/yj_ex/skills/mieji.lua:85: expected: true, actual: false',
        './packages/shzl/pkg/forest/skills/luanwu.lua:81: expected: 2, actual: 4',
        './packages/shzl/pkg/god/skills/qinyin.lua:94: expected: 3, actual: 4',
        './packages/standard_ex/pkg/general/skills/jiyuan.lua:103: expected: 1, actual: 2',
        './packages/standard_ex/pkg/general/skills/luoyi.lua:90: expected: 2, actual: 4',
      ].sort());
      // The one error, kept separate from the assertion failures because it is
      // a different kind of thing entirely — see the note above.
      expect(out.output).toContain(
        "./packages/shzl/pkg/fire/skills/tianyi.lua:99: attempt to call a nil value (method 'cardValidity')",
      );
    } finally {
      vm.close();
    }
  }, 300_000);
});
