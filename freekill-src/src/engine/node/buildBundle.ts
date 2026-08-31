import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LuaBundle } from '../bundle.ts';

/**
 * Node-only bundle builder.
 *
 * The shipped bundle is produced by Agent 4's Vite build step; this exists so
 * the engine's own test suite can boot the real Lua tree straight off disk
 * without waiting on, or duplicating, that step. Both emit the same
 * `path -> source` object, so what the tests boot is what the browser boots.
 *
 * `/Users/haoming/FreeKill/lua` is mirrored from upstream `freekill-core` and
 * is only ever read. The web overlay lives beside this file, in the site repo.
 */

const here = dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = join(here, '..', '..', '..');
export const ENGINE_ROOT = process.env.FK_ROOT ?? '/Users/haoming/FreeKill';

/** `lua/core/mod_manager.lua:67` hard-requires all three at startup. */
export const STANDARD_PACKAGES = ['standard', 'standard_cards', 'maneuvering'] as const;

export interface BuildBundleOptions {
  engineRoot?: string;
  /** Extra `packages/` directories. `test` is needed by the luaunit suites. */
  packages?: readonly string[];
  /** Include the repo's `test/lua/**` tree, for porting the luaunit suites. */
  includeTests?: boolean;
}

function walk(abs: string, rel: string, out: Map<string, string>): void {
  for (const name of readdirSync(abs).sort()) {
    const a = join(abs, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(a).isDirectory()) walk(a, r, out);
    else if (r.endsWith('.lua')) out.set(r, readFileSync(a, 'utf8'));
  }
}

export function buildBundle(opts: BuildBundleOptions = {}): LuaBundle {
  const engineRoot = opts.engineRoot ?? ENGINE_ROOT;
  const packages = opts.packages ?? [...STANDARD_PACKAGES, 'test'];
  const files = new Map<string, string>();

  walk(join(engineRoot, 'lua'), 'lua', files);
  for (const pkg of packages) walk(join(engineRoot, 'packages', pkg), `packages/${pkg}`, files);
  if (opts.includeTests) walk(join(engineRoot, 'test', 'lua'), 'test/lua', files);

  // The web overlay, mounted at lua/web/. It shadows nothing under lua/ or
  // packages/ - the engine never enumerates lua/, so this directory is invisible
  // to it until something explicitly dofiles a path inside it.
  walk(join(WEB_ROOT, 'lua', 'web'), 'lua/web', files);

  const obj: LuaBundle = {};
  for (const k of [...files.keys()].sort()) obj[k] = files.get(k)!;
  return obj;
}
