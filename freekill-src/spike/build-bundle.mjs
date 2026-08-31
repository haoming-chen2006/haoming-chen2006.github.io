// Builds the path -> source map that the browser virtual filesystem serves.
// Reads the FreeKill engine tree in place; never writes to it.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
export const ENGINE_ROOT = process.env.FK_ROOT || '/Users/haoming/FreeKill';
const OVERLAY = join(here, 'lua');

const LUA_ROOTS = ['lua'];
const PACKAGES = ['standard', 'standard_cards', 'maneuvering', 'test'];

function walk(abs, rel, out, filter) {
  for (const name of readdirSync(abs).sort()) {
    const a = join(abs, name);
    const r = rel ? `${rel}/${name}` : name;
    const st = statSync(a);
    if (st.isDirectory()) walk(a, r, out, filter);
    else if (filter(r)) out.set(r, readFileSync(a, 'utf8'));
  }
}

export function buildBundle() {
  const files = new Map();
  const isLua = (p) => p.endsWith('.lua');
  for (const root of LUA_ROOTS) walk(join(ENGINE_ROOT, root), root, files, isLua);
  for (const pkg of PACKAGES) {
    walk(join(ENGINE_ROOT, 'packages', pkg), `packages/${pkg}`, files, isLua);
  }
  // Directory entries that the engine stats but that hold no .lua of their own
  // still need to exist for FileIO.ls / isDir; the VFS derives them from paths.

  // Overlay: web-specific Lua. Loaded explicitly by the bootstrap, never shadowing
  // a path under lua/ or packages/.
  walk(OVERLAY, 'web', files, isLua);

  const obj = {};
  for (const [k, v] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) obj[k] = v;
  return obj;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const obj = buildBundle();
  const json = JSON.stringify(obj);
  mkdirSync(join(here, '..', 'public'), { recursive: true });
  const out = join(here, '..', 'public', 'lua-bundle.json');
  writeFileSync(out, json);
  const bytes = Object.values(obj).reduce((n, s) => n + Buffer.byteLength(s), 0);
  console.log(`${Object.keys(obj).length} lua files, ${bytes} source bytes, ` +
    `${json.length} bundle bytes, sha256=${createHash('sha256').update(json).digest('hex').slice(0, 16)}`);
  console.log(`-> ${relative(process.cwd(), out)}`);
}
