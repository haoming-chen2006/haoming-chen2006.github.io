/** Runs the repo's existing luaunit suites against the wasm-hosted engine. */
import { createLuaVm } from '../vm.ts';
import { buildBundle } from '../node/buildBundle.ts';

const bundle = buildBundle({ includeTests: true });
console.log(`bundle has test/lua: ${Object.keys(bundle).filter((k) => k.startsWith('test/lua')).length} files`);

for (const entry of ['test/lua/cpp_run.lua', 'test/lua/cpp_run_gamelogic.lua', 'test/lua/cpp_run_skill.lua']) {
  const vm = await createLuaVm(bundle, { logLevels: new Set(['error', 'warn']) });
  try {
    vm.lua.doStringSync(`dofile('lua/web/luaunit.lua')`);
    vm.lua.doStringSync(`assert(FKUnit.boot())`);
    vm.lua.global.set('__fk_entry', entry);
    const out = JSON.parse(String(vm.lua.doStringSync(`return FKUnit.run(__fk_entry)`)));
    console.log(`${entry}: ${JSON.stringify(out).slice(0, 700)}`);
  } catch (e) {
    console.log(`${entry}: THREW ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    vm.close();
  }
}
