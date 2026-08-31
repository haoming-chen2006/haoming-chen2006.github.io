/**
 * The Lua source bundle: the virtual filesystem the engine is loaded from.
 *
 * Keys are paths relative to the mount root, e.g. `lua/freekill.lua`,
 * `packages/standard/init.lua`, `lua/web/host.lua`. Agent 4's build step emits
 * this object; the engine only ever consumes it.
 */
export type LuaBundle = Record<string, string>;

export const MOUNT_ROOT = '/fk';

/** Entry point the host and client VMs both load. */
export const ENGINE_ENTRY = 'lua/freekill.lua';

/** The web overlay. Loaded explicitly; shadows nothing under `lua/` or `packages/`. */
export const OVERLAY_FILES = [
  'lua/web/b64.lua',
  'lua/web/canon.lua',
  'lua/web/determinism.lua',
  'lua/web/state.lua',
  'lua/web/fkhost.lua',
  'lua/web/fkclient.lua',
  'lua/web/host.lua',
  'lua/web/client.lua',
] as const;

export interface LuaBundleManifest {
  version: number;
  bundleSha256_16: string;
  mountRoot: string;
  entry: string;
  overlay: string[];
  files: number;
  sourceBytes: number;
  packages: string[];
}

/**
 * The bundle's identity: first 16 hex chars of sha256 over the serialised
 * object, matching `LuaManifestSchema.bundleSha256_16` in `contract/manifest.ts`
 * and what the build step writes into the manifest.
 *
 * There is deliberately only one bundle hash in this codebase. A room records
 * which rules it was played under (`rooms.bundle_sha`), and a client whose hash
 * differs must not be seated - it would compute different legality. Two
 * competing hashes would make "same bundle" undecidable at exactly the moment
 * it matters, which is host migration.
 *
 * Async because `crypto.subtle` is the one digest API present in both a browser
 * and node without importing anything.
 */
export async function bundleSha256_16(bundle: LuaBundle): Promise<string> {
  const sorted: LuaBundle = {};
  for (const k of Object.keys(bundle).sort()) sorted[k] = bundle[k];
  const bytes = new TextEncoder().encode(JSON.stringify(sorted));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function bundleSourceBytes(bundle: LuaBundle): number {
  const enc = new TextEncoder();
  let n = 0;
  for (const v of Object.values(bundle)) n += enc.encode(v).length;
  return n;
}

/**
 * Fetch a bundle emitted by the build. Browser path; `assertBundle` is what
 * catches a stale or truncated deploy before the VM fails in a confusing way.
 */
export async function fetchBundle(url: string): Promise<LuaBundle> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`lua bundle ${url}: HTTP ${res.status}`);
  const bundle = (await res.json()) as LuaBundle;
  assertBundle(bundle);
  return bundle;
}

export function assertBundle(bundle: LuaBundle): void {
  if (!bundle || typeof bundle !== 'object') throw new Error('lua bundle is not an object');
  if (!bundle[ENGINE_ENTRY]) throw new Error(`lua bundle is missing ${ENGINE_ENTRY}`);
  for (const f of OVERLAY_FILES) {
    if (!bundle[f]) throw new Error(`lua bundle is missing the web overlay file ${f}`);
  }
}
