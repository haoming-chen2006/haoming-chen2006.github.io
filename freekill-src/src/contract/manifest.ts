/**
 * What the build produces and the runtime fetches.
 *
 * Two manifests: the Lua bundle (the rules) and the assets (the pictures and
 * sounds). The Lua bundle is what makes the MD5 package-sync problem go away —
 * client and server read their rules from the same deployment, so they cannot
 * disagree.
 */
import { z } from 'zod';

/* -------------------------------------------------------------- lua bundle */

/**
 * Measured: 299 files, 1.62 MB of Lua source, 1.56 MB as a single JSON object.
 * Mounting all of it into wasmoon's MEMFS took 33-59 ms; `dofile
 * 'lua/freekill.lua'` plus the client and scheduler took 47-89 ms after that.
 */
export const LuaManifestSchema = z.object({
  version: z.literal(1),
  /** First 16 hex chars of sha256 over the serialised bundle. The room's
   *  identity — a client whose hash differs must not join. */
  bundleSha256_16: z.string().regex(/^[0-9a-f]{16}$/),
  /** Where the bundle is mounted inside the VM's filesystem. */
  mountRoot: z.string(),
  /** Engine entry point, relative to `mountRoot`. */
  entry: z.string(),
  /** Web-only Lua, loaded before/around the engine. Never shadows `lua/`. */
  overlay: z.array(z.string()),
  files: z.number().int().positive(),
  sourceBytes: z.number().int().positive(),
  /** Extension packages included. `test` is required: `ModManager:loadPackages`
   *  unconditionally requires `packages.test`. */
  packages: z.array(z.string()),
});
export type LuaManifest = z.infer<typeof LuaManifestSchema>;

/* ------------------------------------------------------------------ assets */

export const ASSET_KINDS = ['general', 'card', 'skill-audio', 'death-audio', 'card-audio', 'misc'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const AssetEntrySchema = z.object({
  /** Engine-relative path exactly as Lua names it, e.g.
   *  `packages/standard/image/generals/caocao.jpg`. This is the lookup key:
   *  `LogEvent`/`PlaySound` payloads carry engine paths, not URLs. */
  key: z.string(),
  /** Content-hashed path under the publish root, e.g. `assets/ab12cd34.webp`. */
  href: z.string(),
  kind: z.enum(ASSET_KINDS),
  bytes: z.number().int().nonnegative(),
  /** Which extension package it came from; drives lazy loading. */
  pack: z.string(),
});
export type AssetEntry = z.infer<typeof AssetEntrySchema>;

export const AssetManifestSchema = z.object({
  version: z.literal(1),
  /** Prefix applied to every `href`. `/freekill/` in production. */
  base: z.string(),
  entries: z.array(AssetEntrySchema),
  /** Byte totals per kind, so the loader can decide what to defer. */
  totals: z.record(z.string(), z.number().int().nonnegative()),
});
export type AssetManifest = z.infer<typeof AssetManifestSchema>;

/** Engine path -> href. Build once at boot; every `LogEvent` sound lookup uses it. */
export function assetIndex(m: AssetManifest): ReadonlyMap<string, AssetEntry> {
  return new Map(m.entries.map((e) => [e.key, e]));
}
