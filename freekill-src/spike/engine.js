// Boots the FreeKill Lua engine inside a wasmoon (Lua 5.4) VM.
// Runs unchanged in node and in a browser tab: the only input is a
// { path: source } bundle, which is the same object the Vite build emits.
import { LuaFactory } from 'wasmoon';

const MOUNT = '/fk';

/**
 * Boots a Lua state with the bundle mounted into wasmoon's MEMFS.
 *
 * `hashSeedEpoch` is load-bearing, not a nicety. Lua 5.4 seeds its string hash
 * from time(NULL) at lua_newstate; under emscripten time() reads Date.now().
 * A different hash seed changes `pairs` iteration order, which changes
 * Room:makeGeneralPile's pre-shuffle order, which changes the entire game even
 * with an identical math.randomseed. Pinning Date.now across state creation is
 * what makes two runs of one seed byte-identical.
 */
export async function createVm(bundle, { traceAllocations = false, wasmUri, hashSeedEpoch = 1700000000000 } = {}) {
  const factory = new LuaFactory(wasmUri);
  const luaWasm = await factory.getLuaModule();
  for (const [path, source] of Object.entries(bundle)) {
    factory.mountFileSync(luaWasm, `${MOUNT}/${path}`, source);
  }
  const realNow = Date.now;
  let lua;
  try {
    if (hashSeedEpoch !== null) Date.now = () => hashSeedEpoch;
    lua = await factory.createEngine({ traceAllocations, enableProxy: false });
  } finally {
    Date.now = realNow;
  }
  const FS = luaWasm.module.FS;
  FS.chdir(MOUNT);
  return { lua, FS, luaWasm, factory };
}

function resolve(FS, cwd, p) {
  if (!p || p === '.') return cwd;
  if (p.startsWith('/')) return p;
  let out = cwd;
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out = out.replace(/\/[^/]*$/, '') || '/';
    else out = out === '/' ? `/${part}` : `${out}/${part}`;
  }
  return out;
}

/**
 * The host surface. This is the browser replacement for the JSON-RPC
 * transport in lua/server/rpc/fk.lua; every function here is synchronous,
 * which is what lets the engine's single game coroutine run untouched.
 */
export function installHost({ lua, FS }, opts = {}) {
  const state = {
    cwd: MOUNT,
    logs: [],
    logLevels: opts.logLevels ?? new Set(['warn', 'error']),
    ticks: 0,
    tickBytes: 0,
    replies: opts.replies ?? new Map(),
    onTick: opts.onTick,
  };

  lua.global.set('__fk_log', (level, msg) => {
    if (state.logLevels.has(level)) console.log(`[lua:${level}] ${msg}`);
    state.logs.push([level, msg]);
  });
  lua.global.set('__fk_now_us', () => 0); // replaced by boot.lua with its virtual clock
  lua.global.set('__fk_pwd', () => state.cwd);
  lua.global.set('__fk_cd', (p) => { state.cwd = resolve(FS, state.cwd, p); });
  lua.global.set('__fk_exists', (p) => {
    try { FS.stat(resolve(FS, state.cwd, p)); return true; } catch { return false; }
  });
  lua.global.set('__fk_isdir', (p) => {
    try { return FS.isDir(FS.stat(resolve(FS, state.cwd, p)).mode); } catch { return false; }
  });
  lua.global.set('__fk_ls', (p) => {
    try {
      return FS.readdir(resolve(FS, state.cwd, p))
        .filter((e) => e !== '.' && e !== '..').join('\n');
    } catch { return ''; }
  });
  lua.global.set('__fk_tick', (kind, connId, command, nbytes) => {
    state.ticks += 1;
    state.tickBytes += nbytes;
    if (state.onTick) state.onTick(kind, connId, command, nbytes);
  });
  lua.global.set('__fk_wait_reply', (connId) => {
    const q = state.replies.get(connId);
    if (!q || q.length === 0) return '__notready';
    return q.shift();
  });

  return state;
}
