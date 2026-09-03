// Lua bundle build step: emits the path -> source object Agent 1's virtual
// filesystem mounts, plus the manifest that contract/manifest.ts validates.
//
// This is what makes the MD5 package-sync problem disappear. Client and host
// read their rules out of the same deployment, hashed together, so they cannot
// disagree about legality. `bundleSha256_16` is the room's identity: a client
// whose hash differs must not be seated.
//
// `packages/test` is not optional — ModManager:loadPackages requires it
// unconditionally (lua/core/mod_manager.lua), as do standard_cards and
// maneuvering, so all four load together or not at all.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..');
export const ENGINE_ROOT = process.env.FK_ROOT || '/Users/haoming/FreeKill';

const LUA_ROOTS = ['lua'];
/**
 * `mobile` is the 294-general mobile roster; `utility` is the shared skill/event
 * library it requires. Both are GPL-3.0 with SPDX headers, same as the rest.
 *
 * Ordering here is cosmetic — `ModManager:loadPackages` requires the first four
 * by name and then discovers the rest by walking `packages/`, so `utility`
 * loads because it is on disk, not because it is listed before `mobile`.
 */
export const PACKAGES = ['standard', 'standard_cards', 'maneuvering', 'test', 'utility', 'mobile'];

/**
 * Packages this repo owns, under `<site>/packages/`, mounted at `packages/<name>`
 * beside the mirrored ones. `webmodes` holds the web build's own game modes.
 *
 * They are listed apart from `PACKAGES` because they come from a different root
 * — that one is the read-only upstream mirror — but the engine cannot tell:
 * `ModManager:loadPackages` enumerates `packages/` off the virtual filesystem
 * and requires whatever has an `init.lua`.
 */
export const SITE_PACKAGES = ['webmodes'];

/**
 * Third-party rosters mirrored into `<site>/packages/`, pinned by commit in
 * `packages/provenance.json`. Seven packs, 433 more playable generals.
 *
 * They live in this repo rather than in the upstream mirror for three reasons.
 * The mirror is read-only and shared with another lane, so writing six package
 * directories into it perturbs work in flight. A tracked copy is reproducible
 * from the commit alone, which an untracked directory beside `mobile` is not —
 * and provenance we cannot reproduce is provenance we cannot defend. And
 * `glyphset.mjs` already harvests every `.lua` under `<site>/packages/`, so the
 * font subset picks up their Han without a second list to keep in step.
 *
 * Mechanically they are `SITE_PACKAGES` — same root, same mount prefix — but
 * they are kept apart from it because the licence question is different:
 * `webmodes` is ours, these are somebody else's, and `packages/provenance.json`
 * has to be able to say which is which.
 *
 * Each is `Package:new` per sub-pack, so the count of packages the engine
 * reports is much larger than six.
 */
export const VENDORED_PACKAGES = [
  'standard_ex', 'shzl', 'yj', 'sp', 'mougong', 'jsrg', 'sxrm',
];

/** Everything read out of `<site>/packages/`, in the order the walker takes them. */
export const WEB_PACKAGES = [...VENDORED_PACKAGES, ...SITE_PACKAGES];

/** Everything the manifest reports, in load order. */
export const ALL_PACKAGES = [...PACKAGES, ...WEB_PACKAGES];

/** The web overlay, mounted at `lua/web/`. Owned by the engine lane. */
const OVERLAY = join(WEB_ROOT, 'lua', 'web');

function walk(abs, rel, out, filter) {
  for (const name of readdirSync(abs).sort()) {
    const a = join(abs, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(a).isDirectory()) walk(a, r, out, filter);
    else if (filter(r)) out.set(r, readFileSync(a, 'utf8'));
  }
}

/**
 * The engine lane owns what a bundle contains — its test suite boots exactly
 * this object off disk. So when `src/engine/node/buildBundle.ts` is present the
 * build calls it rather than keeping a second, quietly diverging walker. The
 * local walker below is the fallback, and it is deliberately identical.
 */
async function engineBuilder() {
  const p = join(WEB_ROOT, 'src', 'engine', 'node', 'buildBundle.ts');
  if (!existsSync(p)) return null;
  try {
    const mod = await import(pathToFileURL(p).href);
    return typeof mod.buildBundle === 'function' ? mod.buildBundle : null;
  } catch (e) {
    console.warn(`[lua-bundle] engine builder unusable (${e.message}); using the local walker`);
    return null;
  }
}

export async function buildBundle() {
  const fromEngine = await engineBuilder();
  // `sitePackages` is passed explicitly: the engine builder defaults it to its
  // own `SITE_PACKAGES` (`webmodes` alone), which was right when this repo owned
  // every package under `<site>/packages/` and is not right now that it mirrors
  // six more. What ships is decided here, not there.
  if (fromEngine) {
    return fromEngine({ engineRoot: ENGINE_ROOT, packages: PACKAGES, sitePackages: WEB_PACKAGES });
  }

  const files = new Map();
  const isLua = (p) => p.endsWith('.lua');
  for (const root of LUA_ROOTS) walk(join(ENGINE_ROOT, root), root, files, isLua);
  for (const pkg of PACKAGES) walk(join(ENGINE_ROOT, 'packages', pkg), `packages/${pkg}`, files, isLua);
  for (const pkg of WEB_PACKAGES) walk(join(WEB_ROOT, 'packages', pkg), `packages/${pkg}`, files, isLua);
  if (existsSync(OVERLAY)) walk(OVERLAY, 'lua/web', files, isLua);

  const obj = {};
  for (const [k, v] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) obj[k] = v;
  return obj;
}

export function manifestFor(bundle, json) {
  const overlay = Object.keys(bundle).filter((p) => p.startsWith('lua/web/'));
  return {
    version: 1,
    bundleSha256_16: createHash('sha256').update(json).digest('hex').slice(0, 16),
    mountRoot: '/fk',
    entry: 'lua/freekill.lua',
    overlay,
    files: Object.keys(bundle).length,
    sourceBytes: Object.values(bundle).reduce((n, s) => n + Buffer.byteLength(s), 0),
    packages: ALL_PACKAGES,
  };
}

export async function buildLuaBundle({ quiet = false } = {}) {
  const bundle = await buildBundle();
  const json = JSON.stringify(bundle);
  const manifest = manifestFor(bundle, json);
  mkdirSync(join(WEB_ROOT, 'public'), { recursive: true });
  const out = join(WEB_ROOT, 'public', 'lua-bundle.json');
  writeFileSync(out, json);
  writeFileSync(join(WEB_ROOT, 'public', 'lua-manifest.json'), JSON.stringify(manifest));
  if (!quiet) {
    console.log(`${manifest.files} lua files, ${(manifest.sourceBytes / 1048576).toFixed(2)} MB source, ` +
      `${(json.length / 1048576).toFixed(2)} MB bundle, sha=${manifest.bundleSha256_16}`);
    console.log(`-> ${relative(process.cwd(), out)}`);
  }
  return { bundle, json, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildLuaBundle();
}
