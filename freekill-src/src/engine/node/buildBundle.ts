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

/** The mobile roster and the skill library it depends on. */
export const MOBILE_PACKAGES = ['utility', 'mobile'] as const;

/**
 * Packages this repo owns, under `<site>/packages/`, mounted at `packages/<name>`
 * beside the mirrored ones.
 *
 * `webmodes` cannot live in `opts.packages` with the others: those are read out
 * of the read-only upstream mirror and this one is site source. It reaches the
 * engine by the engine's own front door either way — `ModManager:loadPackages`
 * enumerates `packages/` off the VFS and cannot tell which root a directory
 * came from.
 *
 * That enumeration is also why this only works at all now: `__fk_isdir` used to
 * call `FS.isDir`, which this emscripten build does not export, and the
 * TypeError was swallowed into `false`. Every discovered package was skipped in
 * silence — `webmodes` would have been mounted and never loaded.
 */
export const SITE_PACKAGES = ['webmodes'] as const;

/**
 * Third-party rosters mirrored into `<site>/packages/` and pinned by commit in
 * `packages/provenance.json`. Same root and mount prefix as `SITE_PACKAGES`;
 * listed apart because those are this repo's own and these are not.
 *
 * They belong in the default because this suite's job is to test what ships.
 * They were left out of it for one run and the roster invariant in
 * `__tests__/roster.test.ts` passed against a bundle 433 generals smaller than
 * the deployed one — a green suite proving nothing about the real thing. Adding
 * a pack here is therefore not optional bookkeeping: it is what makes the
 * invariant true of the thing players get.
 */
export const VENDORED_PACKAGES = [
  'standard_ex', 'shzl', 'yj', 'sp', 'mougong', 'jsrg', 'sxrm',
] as const;

/** Everything read out of `<site>/packages/`. */
export const WEB_PACKAGES = [...VENDORED_PACKAGES, ...SITE_PACKAGES] as const;

/** What the shipped build contains. Kept in step with `scripts/build-lua-bundle.mjs`. */
export const SHIPPED_PACKAGES = [...STANDARD_PACKAGES, 'test', ...MOBILE_PACKAGES] as const;

export interface BuildBundleOptions {
  engineRoot?: string;
  /** Extra `packages/` directories, read from the upstream mirror. */
  packages?: readonly string[];
  /**
   * Site-owned `packages/` directories. Defaults to `SITE_PACKAGES`; pass `[]`
   * to build the upstream configuration exactly, which is what the luaunit
   * suites need — `test/lua/core/engine.lua:18` asserts `extension_names` is
   * precisely the four upstream packages.
   */
  sitePackages?: readonly string[];
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
  const packages = opts.packages ?? SHIPPED_PACKAGES;
  const files = new Map<string, string>();

  walk(join(engineRoot, 'lua'), 'lua', files);
  for (const pkg of packages) walk(join(engineRoot, 'packages', pkg), `packages/${pkg}`, files);
  for (const pkg of opts.sitePackages ?? WEB_PACKAGES) {
    walk(join(WEB_ROOT, 'packages', pkg), `packages/${pkg}`, files);
  }
  if (opts.includeTests) walk(join(engineRoot, 'test', 'lua'), 'test/lua', files);

  // The web overlay, mounted at lua/web/. It shadows nothing under lua/ or
  // packages/ - the engine never enumerates lua/, so this directory is invisible
  // to it until something explicitly dofiles a path inside it.
  walk(join(WEB_ROOT, 'lua', 'web'), 'lua/web', files);

  const obj: LuaBundle = {};
  for (const k of [...files.keys()].sort()) obj[k] = files.get(k)!;
  return obj;
}
