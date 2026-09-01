import { LuaFactory } from 'wasmoon';
import { MOUNT_ROOT, assertBundle, type LuaBundle } from './bundle.ts';

export interface LuaVm {
  lua: import('wasmoon').LuaEngine;
  /** emscripten MEMFS handle, for the virtual filesystem shims. */
  fs: EmscriptenFs;
  close(): void;
}

interface EmscriptenFs {
  chdir(path: string): void;
  stat(path: string): { mode: number };
  /** Not exported by every emscripten build; `isDirMode` is the fallback. */
  isDir?(mode: number): boolean;
  readdir(path: string): string[];
}

/**
 * `FS.isDir` is absent from the `glue.wasm` emscripten build — it exports
 * `isFile`/`isFIFO`/`isSocket` and nothing else. Calling it threw a TypeError
 * that `__fk_isdir`'s catch swallowed into `false`, so every directory in the
 * VFS reported as a non-directory. That is invisible for the four packages
 * `ModManager:loadPackages` requires by name, and fatal for every package it
 * discovers by walking `packages/` — they were skipped in silence. Test the
 * S_IFDIR bits directly instead.
 */
const S_IFMT = 0o170000;
const S_IFDIR = 0o040000;
export function isDirMode(fs: EmscriptenFs, mode: number): boolean {
  return typeof fs.isDir === 'function' ? fs.isDir(mode) : (mode & S_IFMT) === S_IFDIR;
}

export interface VmOptions {
  /** Override where `glue.wasm` is fetched from. Needed under some bundlers. */
  wasmUri?: string;
  /**
   * Lua 5.4 seeds its string hash from `time(NULL)` at `lua_newstate`; under
   * emscripten that reads `Date.now()`. A different hash seed changes `pairs`
   * iteration order, which changes `Room:makeGeneralPile`'s pre-shuffle order,
   * which changes the entire game even with an identical `math.randomseed`.
   *
   * Pinning `Date.now` across state creation is what makes two runs of one seed
   * byte-identical. This is load-bearing, not a nicety. Pass `null` only if you
   * are deliberately testing that it matters.
   */
  hashSeedEpoch?: number | null;
  traceAllocations?: boolean;
  /** Which log levels reach the console. Everything is still captured. */
  logLevels?: ReadonlySet<string>;
  onLog?: (level: string, message: string) => void;
}

export const DEFAULT_HASH_SEED_EPOCH = 1700000000000;

/**
 * Boots a Lua 5.4 state with the bundle mounted into wasmoon's MEMFS and the
 * host shims installed. Identical in node and in a browser tab: the only input
 * is the bundle.
 */
export async function createLuaVm(bundle: LuaBundle, opts: VmOptions = {}): Promise<LuaVm> {
  assertBundle(bundle);
  const factory = new LuaFactory(opts.wasmUri);
  const luaWasm = await factory.getLuaModule();
  for (const [path, source] of Object.entries(bundle)) {
    factory.mountFileSync(luaWasm, `${MOUNT_ROOT}/${path}`, source);
  }

  const epoch = opts.hashSeedEpoch === undefined ? DEFAULT_HASH_SEED_EPOCH : opts.hashSeedEpoch;
  const realNow = Date.now;
  let lua;
  try {
    if (epoch !== null) Date.now = () => epoch;
    lua = await factory.createEngine({
      traceAllocations: opts.traceAllocations ?? false,
      enableProxy: false,
    });
  } finally {
    Date.now = realNow;
  }

  const fs = (luaWasm as unknown as { module: { FS: EmscriptenFs } }).module.FS;
  fs.chdir(MOUNT_ROOT);
  installHostShims(lua, fs, opts);

  return {
    lua,
    fs,
    close() {
      lua.global.close();
    },
  };
}

function resolve(cwd: string, p: string): string {
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
 * The browser replacement for `lua/server/rpc/fk.lua`'s stdio transport: the
 * `fk.QmlBackend_*` filesystem family and logging. Every function is
 * synchronous, which is what lets the engine's single game coroutine run
 * untouched. Message traffic deliberately does *not* go through here — it is
 * batched inside Lua and handed over once per resume.
 */
function installHostShims(
  lua: import('wasmoon').LuaEngine,
  fs: EmscriptenFs,
  opts: VmOptions,
): void {
  let cwd = MOUNT_ROOT;
  const levels = opts.logLevels ?? new Set(['error']);

  lua.global.set('__fk_log', (level: string, msg: string) => {
    if (levels.has(level)) console.log(`[lua:${level}] ${msg}`);
    opts.onLog?.(level, msg);
  });
  lua.global.set('__fk_pwd', () => cwd);
  lua.global.set('__fk_cd', (p: string) => {
    cwd = resolve(cwd, p);
  });
  lua.global.set('__fk_exists', (p: string) => {
    try {
      fs.stat(resolve(cwd, p));
      return true;
    } catch {
      return false;
    }
  });
  lua.global.set('__fk_isdir', (p: string) => {
    try {
      return isDirMode(fs, fs.stat(resolve(cwd, p)).mode);
    } catch {
      return false;
    }
  });
  lua.global.set('__fk_ls', (p: string) => {
    try {
      return fs
        .readdir(resolve(cwd, p))
        .filter((e) => e !== '.' && e !== '..')
        .join('\n');
    } catch {
      return '';
    }
  });
  // Replaced by the overlay's virtual clock the moment it boots; defined here
  // so that a partially-booted VM cannot call a nil global.
  lua.global.set('__fk_now_us', () => 0);
}

/** Calls a global Lua function by name and returns its first result. */
export function callGlobal(lua: import('wasmoon').LuaEngine, name: string, args: string[]): unknown {
  const call = args.length ? `${name}(${args.join(', ')})` : `${name}()`;
  return lua.doStringSync(`return ${call}`);
}

/** Lua long-bracket literal that cannot be closed by the payload itself. */
export function luaLiteral(s: string): string {
  let eq = '';
  while (s.includes(`]${eq}]`)) eq += '=';
  return `[${eq}[${s}]${eq}]`;
}
