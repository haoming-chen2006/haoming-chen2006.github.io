/**
 * Generates `catalog.generated.ts` from the real engine.
 *
 * WHY A BUILD-TIME SNAPSHOT AND NOT A RUNTIME LUA CALL.
 *
 * `packages/lunarltk_skins` is 160 KB of Lua whose entire output is a static
 * table: general name -> list of absolute artwork URLs. Nothing in it depends on
 * game state, the seed, or the player. Shipping it inside `public/lua-bundle.json`
 * would cost 160 KB on every page load, change `bundleSha256_16` — which is the
 * room's identity, and which two clients must agree on to be seated together —
 * and put a third-party package inside the artifact whose hash is the promise
 * that everyone is playing by the same rules. For a purely cosmetic lookup table
 * that is a bad trade three times over.
 *
 * So the pack is a *build-time data source only*. It is installed at
 * `$FK_ROOT/packages/lunarltk_skins`, this script boots the real engine with it,
 * reads `Fk.skin_packages` and the translations the pack registered, and freezes
 * the answer into TypeScript. The browser bundle never sees the Lua, and the
 * Lua bundle hash is untouched. Regenerate with:
 *
 *     node src/room/skins/generate.mjs
 *
 * The output is checked in deliberately: it is derived data, but it is derived
 * from a tree (`$FK_ROOT`) that is not this repository, so a clean checkout must
 * still build without it.
 *
 * Only generals this build actually ships are recorded. The pack targets 1178
 * general ids, most of them from expansions we do not have; keeping the misses
 * would be ~90% dead weight.
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
 * The pack registers a Chinese name per skin, which would be lovely in a skin
 * picker -- but there is no picker, nothing renders them today, and shipping
 * them has two real costs the repo already guards against: `scripts/build.test.ts`
 * requires the committed font subset to cover every Han in the sources (these
 * names add hundreds, so they would render as tofu until `npm run build:fonts`
 * is re-run), and `src/i18n/__tests__/coverage.test.ts` forbids new hardcoded
 * Chinese in `src/` on principle. Both are correct, and neither is worth
 * satisfying for data nothing displays. When a picker lands, pass the flag and
 * do the two follow-ups above.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLuaVm } from '../../engine/vm.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = process.env.FK_ROOT || '/Users/haoming/FreeKill';
const WEB_ROOT = join(here, '..', '..', '..');

/** Mirrors `scripts/build-lua-bundle.mjs`, plus the skin pack this script reads. */
const PACKAGES = ['standard', 'standard_cards', 'maneuvering', 'test', 'utility', 'mobile', 'lunarltk_skins'];

function walk(abs, rel, out, filter) {
  for (const name of readdirSync(abs).sort()) {
    const a = join(abs, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(a).isDirectory()) walk(a, r, out, filter);
    else if (filter(r)) out.set(r, readFileSync(a, 'utf8'));
  }
}

function buildBundle() {
  const files = new Map();
  const isLua = (p) => p.endsWith('.lua');
  walk(join(ENGINE_ROOT, 'lua'), 'lua', files, isLua);
  for (const pkg of PACKAGES) walk(join(ENGINE_ROOT, 'packages', pkg), `packages/${pkg}`, files, isLua);
  walk(join(WEB_ROOT, 'lua', 'web'), 'lua/web', files, isLua);
  const obj = {};
  for (const [k, v] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) obj[k] = v;
  return obj;
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

const logs = [];
const { lua, close } = await createLuaVm(buildBundle(), {
  logLevels: new Set(),
  onLog: (level, message) => logs.push({ level, message }),
});
lua.doStringSync(`dofile('lua/web/host.lua')`);
lua.doStringSync(`assert(FKHost.boot())`);

const loaded = lua.doStringSync(`return table.concat(Fk.extension_names, ",")`);
if (!loaded.split(',').includes('lunarltk_skins')) {
  const why = logs.filter((l) => l.level === 'error').map((l) => l.message).join('\n');
  throw new Error(`packages/lunarltk_skins did not load from ${ENGINE_ROOT}.\n${why}`);
}

const rows = JSON.parse(lua.doStringSync(EXTRACT));
close?.();

const withLabels = process.argv.includes('--with-labels');

/**
 * `encodeURI` and not `encodeURIComponent`: the separators (`:`, `/`, `@`) are
 * structure and must survive. It is also idempotent over already-encoded input,
 * so re-running the generator cannot double-encode a `%`.
 */
for (const row of rows) for (const s of row.skins) s.url = encodeURI(s.url);

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

const out = `// GENERATED by src/room/skins/generate.mjs -- do not edit by hand.
//
// Source: packages/lunarltk_skins (GPL-3.0 Lua) against ${PACKAGES.length} engine packages.
// ${rows.length} shipped generals, ${files.length} artwork files (${files.length - video} static, ${video} video).
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

writeFileSync(join(here, 'catalog.generated.ts'), out);
console.log(
  `${rows.length} generals (${rows.filter((r) => !r.hidden).length} in the playable pool), ` +
    `${files.length} files (${files.length - video} jpg, ${video} mp4), hosts: ${hosts.join(', ')}`,
);
