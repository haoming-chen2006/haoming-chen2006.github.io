// Checks a built dist the way a browser would: does every path the manifests
// promise actually exist under the publish root, and is the font's license
// beside the font. Run by `npm run deploy` before anything is written, and by
// the build test.
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DIST = join(here, '..', '..', 'freekill');

function bytes(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    n += st.isDirectory() ? bytes(p) : st.size;
  }
  return n;
}

export function verifyDist(dist = DIST) {
  const problems = [];
  const need = ['index.html', 'asset-manifest.json', 'lua-manifest.json', 'lua-bundle.json', 'overview.json'];
  for (const f of need) if (!existsSync(join(dist, f))) problems.push(`missing ${f}`);
  if (problems.length) return { ok: false, problems, stats: null };

  const assets = JSON.parse(readFileSync(join(dist, 'asset-manifest.json'), 'utf8'));
  const lua = JSON.parse(readFileSync(join(dist, 'lua-manifest.json'), 'utf8'));
  const bundle = JSON.parse(readFileSync(join(dist, 'lua-bundle.json'), 'utf8'));
  const overview = JSON.parse(readFileSync(join(dist, 'overview.json'), 'utf8'));

  for (const e of assets.entries) {
    if (!existsSync(join(dist, e.href))) problems.push(`asset ${e.key} -> ${e.href} does not exist`);
  }
  if (assets.base !== '/freekill/') problems.push(`asset manifest base is ${assets.base}, expected /freekill/`);

  if (Object.keys(bundle).length !== lua.files) {
    problems.push(`lua manifest says ${lua.files} files, bundle has ${Object.keys(bundle).length}`);
  }
  if (!bundle[lua.entry]) problems.push(`lua bundle is missing its entry ${lua.entry}`);
  for (const f of lua.overlay) if (!bundle[f]) problems.push(`lua bundle is missing overlay ${f}`);

  // Fonts: the substitute must ship with its license, and the proprietary faces
  // must not have crept back in.
  const fontsDir = join(dist, 'fonts');
  if (!existsSync(fontsDir)) problems.push('missing fonts/');
  else {
    const files = readdirSync(fontsDir);
    const faces = files.filter((f) => f.endsWith('.woff2'));
    if (!faces.length) problems.push('no woff2 face in fonts/');
    for (const face of faces) {
      const key = face.replace(/\.woff2$/, '');
      if (!files.includes(`${key}.OFL.txt`)) problems.push(`${face} ships without ${key}.OFL.txt`);
    }
    for (const banned of ['FZLBGBK', 'FZLE', 'simli']) {
      if (files.some((f) => f.toLowerCase().includes(banned.toLowerCase()))) {
        problems.push(`proprietary font ${banned} is in the dist and must not ship`);
      }
    }
  }

  if (!overview.generals?.length) problems.push('overview has no generals');
  if (!overview.cards?.length) problems.push('overview has no cards');

  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  if (!html.includes('/freekill/assets/')) problems.push('index.html does not reference /freekill/ — wrong base');

  const stats = {
    totalBytes: bytes(dist),
    assets: assets.entries.length,
    assetBytes: assets.entries.reduce((n, e) => n + e.bytes, 0),
    luaFiles: lua.files,
    luaBundleBytes: statSync(join(dist, 'lua-bundle.json')).size,
    generals: overview.generals.length,
    cards: overview.cards.length,
    fontBytes: existsSync(fontsDir)
      ? readdirSync(fontsDir).filter((f) => f.endsWith('.woff2'))
        .reduce((n, f) => n + statSync(join(fontsDir, f)).size, 0)
      : 0,
  };
  return { ok: problems.length === 0, problems, stats };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, problems, stats } = verifyDist();
  if (stats) {
    console.log(`dist ${(stats.totalBytes / 1048576).toFixed(2)} MB · ${stats.assets} assets ` +
      `(${(stats.assetBytes / 1048576).toFixed(2)} MB) · ${stats.luaFiles} lua files ` +
      `(${(stats.luaBundleBytes / 1048576).toFixed(2)} MB) · font ${(stats.fontBytes / 1024).toFixed(0)} KB · ` +
      `${stats.generals} generals, ${stats.cards} cards`);
  }
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.log(ok ? '✓ dist verified' : `✗ ${problems.length} problem(s)`);
  process.exit(ok ? 0 : 1);
}
