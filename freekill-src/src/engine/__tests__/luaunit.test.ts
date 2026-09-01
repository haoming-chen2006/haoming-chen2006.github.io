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
 * The mobile pack ships three luaunit tests of its own, and they run whenever
 * the shipped bundle is loaded. Two pass. `m_ex__mieji`'s does not, and it is
 * pinned here by name rather than waved through, so that a *different* mobile
 * skill breaking is still a red test.
 *
 * The cause is a fixture coupling, not an engine defect: the test draws two
 * cards and then asserts the target ends up empty-handed, which only holds for
 * particular draws. `mobile_derived` puts ten more equipment cards into the
 * deck (`defensive_siege_engine`, `ex_crossbow`, … see `overview.json`), so the
 * draw is not the one the assertion was written against. It reproduces
 * identically under four different `hashSeedEpoch` values, so it is not our
 * VM's iteration order. Whether it also fails under Qt was not checked - there
 * is no Qt build here to check it with.
 */
describe("the mobile pack's own luaunit suite", () => {
  it('runs under wasm, with one known content failure', async () => {
    const bundle = buildBundle({ includeTests: true });
    const vm = await createLuaVm(bundle, { logLevels: new Set() });
    try {
      vm.lua.doStringSync(`dofile('lua/web/luaunit.lua')`);
      expect(vm.lua.doStringSync(`return FKUnit.boot()`)).toBe(true);
      vm.lua.global.set('__fk_entry', 'test/lua/cpp_run_skill.lua');
      const out = JSON.parse(String(vm.lua.doStringSync(`return FKUnit.run(__fk_entry)`)));
      expect(out.error ?? null).toBeNull();

      // Three more tests than the standard set's 39: mobile's own.
      expect(out.output).toContain('Ran 42 tests');
      const failed = (out.output as string)
        .split('\n')
        .filter((l) => /\.lua:\d+: expected/.test(l))
        .map((l) => l.trim());
      expect(failed).toEqual([
        './packages/mobile/pkg/yj_ex/skills/mieji.lua:85: expected: true, actual: false',
      ]);
    } finally {
      vm.close();
    }
  }, 300_000);
});
