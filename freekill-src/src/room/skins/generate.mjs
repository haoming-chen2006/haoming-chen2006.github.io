/**
 * Generates `catalog.generated.ts` from the real engine.
 *
 * WHY A BUILD-TIME SNAPSHOT AND NOT A RUNTIME LUA CALL.
 *
 * `pack/` is lunarltk_skins (gitee.com/qsgs-fans/lunarltk_skins, GPL-3.0):
 * 320 KB of Lua whose entire output is a static table, general name -> list of
 * absolute artwork URLs. Nothing in it depends on game state, the seed, or the
 * player. Shipping it inside `public/lua-bundle.json` would cost that much on
 * every page load, change `bundleSha256_16` — which is the room's identity, and
 * which two clients must agree on to be seated together — and put a
 * third-party package inside the artifact whose hash is the promise that
 * everyone is playing by the same rules. For a purely cosmetic lookup table
 * that is a bad trade three times over.
 *
 * So the pack is a *build-time data source only*. This script takes the bundle
 * the site actually ships — `buildBundle()` from `scripts/build-lua-bundle.mjs`,
 * the same walker the deploy uses — mounts the pack beside it at
 * `packages/lunarltk_skins`, boots the real engine on the pair, reads
 * `Fk.skin_packages`, and freezes the answer into TypeScript. The browser
 * bundle never sees the Lua, and the Lua bundle hash is untouched. Regenerate
 * with:
 *
 *     node src/room/skins/generate.mjs
 *
 * WHY THE SHIPPED BUNDLE AND NOT A LIST OF PACKAGES. The first version of this
 * file carried its own six-package list, copied from the bundle builder on the
 * day it was written. The roster then grew from 341 generals to 697 — seven
 * mirrored packs under `<site>/packages/` — and the list did not, so every
 * general in those packs was "not shipped" as far as this script could tell and
 * was dropped from the catalog. The pack had artwork for most of them; the
 * table showed the default portrait on six seats in eight; and the players
 * read that as the skins having been taken away. `catalog.test.ts` now
 * regenerates and compares, the way `scripts/catalogue.test.ts` does for the
 * designer's vocabulary, so the committed file cannot fall behind the roster
 * again without a red test saying so.
 *
 * `designer: false`: a hero somebody designed this morning is not something
 * the pack can have artwork for, and a catalog that changed with the contents
 * of an untracked directory would fail its own freshness test on every
 * machine that has made one.
 *
 * The output is checked in deliberately: it is derived data, but it is derived
 * from a tree (`$FK_ROOT`) that is not this repository, so a clean checkout must
 * still build without it.
 *
 * TWO THINGS ABOUT CHINESE TEXT, both of which shape the output.
 *
 * **URLs are percent-encoded.** Many artwork files are named in Chinese
 * (`马云騄、花海舞枪.mp4`). Raw non-ASCII in a URL path is not a valid URI --
 * browsers coerce it, but the encoded form is the canonical one and both hosts
 * serve it byte-identically (verified). Encoding here rather than at the call
 * site also keeps the catalog free of literal Han, which matters because of:
 *
 * **Skin display names are dropped unless you ask for them** (`--with-labels`).
 * The pack registers a Chinese name per skin, which would be lovely in the
 * picker -- but shipping them has two real costs the repo already guards
 * against: `scripts/build.test.ts` requires the committed font subset to cover
 * every Han in the sources (these names add hundreds, so they would render as
 * tofu until `npm run build:fonts` is re-run), and
 * `src/i18n/__tests__/coverage.test.ts` forbids new hardcoded Chinese in `src/`
 * on principle. `SkinPicker.tsx` captions a tile from its file name instead.
 * To ship the names, pass the flag and do the two follow-ups above.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLuaVm } from '../../engine/vm.ts';
import { buildBundle, PACKAGES, VENDORED_PACKAGES, SITE_PACKAGES, DESIGNER_PACKAGES } from '../../../scripts/build-lua-bundle.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/** The vendored pack, pinned in `pack/README.md`. Never bundled; see above. */
export const PACK_DIR = join(here, 'pack');
/** Where the engine expects it: `require "packages/lunarltk_skins/..."`. */
export const PACK_MOUNT = 'packages/lunarltk_skins';
export const CATALOG_PATH = join(here, 'catalog.generated.ts');

/** What the catalog is a statement about: everything shipped, minus designed heroes. */
const SHIPPED = [...PACKAGES, ...VENDORED_PACKAGES, ...SITE_PACKAGES.filter((p) => !DESIGNER_PACKAGES.includes(p))];

function walk(abs, rel, out, filter) {
  for (const name of readdirSync(abs).sort()) {
    const a = join(abs, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(a).isDirectory()) walk(a, r, out, filter);
    else if (filter(r)) out.set(r, readFileSync(a, 'utf8'));
  }
}

/** The shipped bundle with the skin pack mounted beside it. */
export async function skinBundle() {
  const bundle = { ...(await buildBundle({ designer: false })) };
  const files = new Map();
  walk(PACK_DIR, PACK_MOUNT, files, (p) => p.endsWith('.lua'));
  for (const [k, v] of files) bundle[k] = v;
  return bundle;
}

const EXTRACT = `
  local out = {}
  for g, list in pairs(Fk.skin_packages or {}) do
    local general = Fk.generals[g]
    if general then
      local skins = {}
      for _, url in ipairs(list) do
        local file = url:match("([^/]+)$") or url
        -- The pack registers each file name as a translation key whose value is
        -- the skin's display name. Untranslated keys come back unchanged, which
        -- is useless as a label, so those are reported as nil and the UI falls
        -- back to a positional name.
        local label = Fk:translate(file)
        if label == file then label = nil end
        skins[#skins + 1] = { url = url, label = label }
      end
      out[#out + 1] = {
        general = g,
        hidden = (general.hidden or general.total_hidden) and true or false,
        skins = skins,
      }
    end
  end
  table.sort(out, function(a, b) return a.general < b.general end)
  return json.encode(out)
`;

/**
 * Boot the engine on the shipped roster plus the pack and read the skins off it.
 *
 * Returns one row per shipped general the pack has artwork for, URLs
 * percent-encoded and de-duplicated in the pack's own order. The pack lists a
 * general under several ids (`caocao`, `ol__caocao`, …) and only the ids this
 * build defines survive the `Fk.generals[g]` check above.
 */
export async function computeSkinCatalog() {
  const logs = [];
  const { lua, close } = await createLuaVm(await skinBundle(), {
    logLevels: new Set(),
    onLog: (level, message) => logs.push({ level, message }),
  });
  lua.doStringSync(`dofile('lua/web/host.lua')`);
  lua.doStringSync(`assert(FKHost.boot())`);

  const loaded = lua.doStringSync(`return table.concat(Fk.extension_names, ",")`);
  if (!loaded.split(',').includes('lunarltk_skins')) {
    const why = logs.filter((l) => l.level === 'error').map((l) => l.message).join('\n');
    throw new Error(`${PACK_MOUNT} did not load.\n${why}`);
  }

  const rows = JSON.parse(lua.doStringSync(EXTRACT));
  close?.();

  const position = packOrder();
  for (const row of rows) {
    // `encodeURI` and not `encodeURIComponent`: the separators (`:`, `/`, `@`)
    // are structure and must survive. It is also idempotent over already-encoded
    // input, so re-running the generator cannot double-encode a `%`.
    const seen = new Set();
    row.skins = row.skins
      .map((s) => ({ ...s, url: encodeURI(s.url) }))
      .filter((s) => !seen.has(s.url) && seen.add(s.url))
      .map((s) => ({ ...s, at: position(s.url) }))
      // Files the pack builds at load (`名字、皮肤.jpg` out of a `pairs` walk)
      // have no position, and no order of their own either: the URL is the
      // only stable thing left to sort them by.
      .sort((a, b) => a.at - b.at || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0))
      .map(({ at: _at, ...s }) => s);
  }
  return rows.filter((r) => r.skins.length > 0);
}

/**
 * Where each artwork file is named in the pack's own source, so a general's
 * skins come out in the order its authors wrote them.
 *
 * The engine cannot promise that order. Part of the pack registers skins out
 * of a table keyed by Chinese name (`["魏张辽"] = { "zhangliao", … }`), walked
 * with `pairs`, and two keys that both enable one general land in
 * `Fk.skin_packages` in hash order — which the string hash seed decides, and
 * which came out differently under vitest than under node. A catalog whose
 * freshness test flips on the seed is a catalog with no freshness test, and a
 * seat whose default skin depends on the seed is a seat that changes portrait
 * between builds. The source text has one order; this reads it back.
 */
function packOrder() {
  const files = new Map();
  walk(PACK_DIR, '', files, (p) => p.endsWith('.lua'));
  const source = [...files.values()].join('\n');
  return (url) => {
    let file = url.slice(url.lastIndexOf('/') + 1);
    try { file = decodeURIComponent(file); } catch { /* keep the encoded form */ }
    const at = source.indexOf(file);
    return at < 0 ? Number.MAX_SAFE_INTEGER : at;
  };
}

/** The TypeScript the catalog file holds, for these rows. Deterministic. */
export function renderCatalog(rows, { withLabels = false } = {}) {
  const files = rows.flatMap((r) => r.skins);
  const video = files.filter((s) => s.url.endsWith('.mp4')).length;
  const hosts = [...new Set(files.map((s) => new URL(s.url).host))].sort();
  const nonAscii = files.filter((s) => /[^\x20-\x7e]/.test(s.url));
  if (nonAscii.length) throw new Error(`URL survived encoding with non-ASCII: ${nonAscii[0].url}`);

  const body = rows
    .map((r) => {
      const skins = r.skins
        .map((s) => {
          const label = withLabels && s.label ? `, label: ${JSON.stringify(s.label)}` : '';
          return `    { url: ${JSON.stringify(s.url)}${label} },`;
        })
        .join('\n');
      return `  ${JSON.stringify(r.general)}: [\n${skins}\n  ],`;
    })
    .join('\n');

  return `// GENERATED by src/room/skins/generate.mjs -- do not edit by hand.
//
// Source: src/room/skins/pack (lunarltk_skins, GPL-3.0 Lua) booted with the shipped
// roster: ${SHIPPED.join(', ')}.
// ${rows.length} shipped generals (${rows.filter((r) => !r.hidden).length} in the playable pool), ${files.length} artwork files (${files.length - video} static, ${video} video).
// Artwork is fetched at runtime from: ${hosts.join(', ')}.
// URLs are percent-encoded; skin display names are ${withLabels ? 'included' : 'omitted (see generate.mjs)'}.
// See index.ts in this directory for the licensing and privacy position.
import type { SkinEntry } from './types';

export const SKIN_CATALOG: Readonly<Record<string, readonly SkinEntry[]>> = {
${body}
};

/** Hosts the catalog points at. The circuit breaker keys off these. */
export const SKIN_HOSTS: readonly string[] = ${JSON.stringify(hosts)};
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = await computeSkinCatalog();
  const withLabels = process.argv.includes('--with-labels');
  writeFileSync(CATALOG_PATH, renderCatalog(rows, { withLabels }));
  const files = rows.flatMap((r) => r.skins);
  const video = files.filter((s) => s.url.endsWith('.mp4')).length;
  const hosts = [...new Set(files.map((s) => new URL(s.url).host))].sort();
  console.log(
    `${rows.length} generals (${rows.filter((r) => !r.hidden).length} in the playable pool), ` +
      `${files.length} files (${files.length - video} jpg, ${video} mp4), hosts: ${hosts.join(', ')}`,
  );
}
