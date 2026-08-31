// `npm run dev` on a clean clone would otherwise start a server that 404s on
// every manifest. This regenerates only what is missing, so the common case
// costs nothing.
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const need = (f) => !existsSync(join(PUBLIC, f));

if (need('lua-bundle.json') || need('lua-manifest.json')) {
  const { buildLuaBundle } = await import('./build-lua-bundle.mjs');
  await buildLuaBundle();
}
if (need('asset-manifest.json')) {
  const { buildAssets } = await import('./build-assets.mjs');
  await buildAssets();
}
if (need('overview.json')) {
  const { buildOverview } = await import('./build-overview.mjs');
  await buildOverview();
}
if (need('fonts/fonts.json')) {
  const { buildFonts } = await import('./build-fonts.mjs');
  buildFonts({});
}
