/**
 * Types for `generate.mjs`, which stays JavaScript because `node` runs it
 * directly and the rest of `scripts/` is `.mjs` for the same reason. Only
 * `__tests__/catalog.test.ts` imports it.
 */
export interface SkinRow {
  general: string;
  hidden: boolean;
  skins: { url: string; label?: string }[];
}

export const PACK_DIR: string;
export const PACK_MOUNT: string;
export const CATALOG_PATH: string;

/** The shipped bundle with the skin pack mounted at `PACK_MOUNT`. */
export function skinBundle(): Promise<Record<string, string>>;
/** Boot the engine and read the skins off it, one row per general with artwork. */
export function computeSkinCatalog(): Promise<SkinRow[]>;
/** The exact text of `catalog.generated.ts` for these rows. */
export function renderCatalog(rows: SkinRow[], opts?: { withLabels?: boolean }): string;
