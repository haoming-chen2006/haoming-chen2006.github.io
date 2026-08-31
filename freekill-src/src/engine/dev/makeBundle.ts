/**
 * Emits the Lua bundle this lane's browser harness fetches.
 *
 * Agent 4's build step produces the shipping bundle; this exists only so the
 * engine can be exercised in a real browser without waiting on it. Same
 * `path -> source` object either way.
 *
 *   npx vite-node src/engine/dev/makeBundle.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleSha256_16, bundleSourceBytes } from '../bundle.ts';
import { buildBundle } from '../node/buildBundle.ts';

const bundle = buildBundle();
const out = join(dirname(fileURLToPath(import.meta.url)), 'lua-bundle.json');
writeFileSync(out, JSON.stringify(bundle));
console.log(
  `${Object.keys(bundle).length} files, ${bundleSourceBytes(bundle)} source bytes, ` +
    `sha256_16 ${await bundleSha256_16(bundle)} -> ${out}`,
);
