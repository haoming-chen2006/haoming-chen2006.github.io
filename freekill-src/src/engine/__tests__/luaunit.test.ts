import { describe, expect, it } from 'vitest';
import { buildBundle } from '../node/buildBundle.ts';
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
 */
const ENTRIES = [
  { entry: 'test/lua/cpp_run.lua', name: 'core', expected: 14 },
  { entry: 'test/lua/cpp_run_gamelogic.lua', name: 'game logic', expected: 7 },
  { entry: 'test/lua/cpp_run_skill.lua', name: 'skills', expected: 39 },
];

describe('the existing luaunit suites under wasm', () => {
  for (const { entry, name, expected } of ENTRIES) {
    it(`passes the ${name} suite`, async () => {
      const bundle = buildBundle({ includeTests: true });
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
