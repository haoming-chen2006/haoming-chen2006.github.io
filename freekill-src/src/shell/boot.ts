/**
 * What the app loads before it can show anything, and in what order.
 *
 * The ordering is the whole first-run experience. The lobby needs the asset
 * manifest (for avatars and portraits) and the overview data; it does NOT need
 * the 1.5 MB Lua bundle or the Lua VM, which is why a cold load reaches a
 * playable lobby well inside the 10-second criterion. The bundle is fetched in
 * the background afterwards and is only awaited when a room actually starts.
 */
import { getLanguage, t } from '../i18n';
import { AssetManifestSchema, LuaManifestSchema, assetIndex } from '../contract/manifest';
import type { AssetEntry, AssetManifest, LuaManifest } from '../contract/manifest';

export interface OverviewGeneral {
  readonly name: string;
  readonly pack: string;
  /** Where the art lives. Several packs can share one extension directory. */
  readonly extension?: string;
  readonly kingdom: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
  readonly gender: number;
  readonly title: string;
  readonly subtitle: string;
  readonly illustrator: string;
  readonly skills: readonly string[];
}

export interface OverviewCard {
  readonly name: string;
  readonly pack: string;
  readonly type: number;
  readonly subType: number;
  readonly title: string;
  readonly description: string;
  readonly copies: number;
  readonly ids: readonly number[];
  readonly suits: readonly { readonly suit: string; readonly number: number }[];
}

export interface OverviewMode {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly minPlayer: number;
  readonly maxPlayer: number;
}

export interface OverviewData {
  readonly generals: readonly OverviewGeneral[];
  readonly cards: readonly OverviewCard[];
  readonly modes: readonly OverviewMode[];
  readonly packs: { readonly general: readonly string[]; readonly card: readonly string[] };
  readonly translations: Readonly<Record<string, string>>;
  /**
   * Upstream's own English, by key, for the keys upstream actually translated.
   *
   * `src/i18n/engine` covers the standard pack completely and is the first
   * place looked. This is the second: `packages/mobile/i18n/en_US.lua` writes
   * 452 keys into the engine's en_US table of which only 22 carry English, and
   * the build keeps that 22 rather than the Chinese it files alongside them.
   * Optional, so an overview.json built before this field still loads.
   */
  readonly translationsEn?: Readonly<Record<string, string>>;
}

export interface Loaded {
  readonly assets: AssetManifest;
  readonly assetsByKey: ReadonlyMap<string, AssetEntry>;
  readonly lua: LuaManifest;
  readonly overview: OverviewData;
}

export const BASE = import.meta.env.BASE_URL;

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export type Progress = (step: string, done: number, total: number) => void;

/**
 * The three files the lobby cannot render without.
 *
 * They are fetched together, not one after another. Nothing here depends on
 * anything else here, so the `await` chain was never buying anything. Measured
 * at 1.5 Mbps it is worth ~130 ms of a 3.3 s cold load - real, but small,
 * because the limit is bandwidth rather than round-trips.
 *
 * The bytes are what cost. `overview.json` went from 54 KB to 178 KB (80 KB
 * gzipped) with the mobile roster, and the lobby does not actually need it -
 * only the reference pages do. Measured by stubbing it out, deferring it is
 * worth ~430 ms at 1.5 Mbps (3.21 s -> 2.77 s). It is not done here because
 * `Loaded.overview` would stop being a value, which every consumer of
 * `useSession().loaded` can see; that is a shell-lane change, not a build one.
 */
export async function loadShell(onProgress: Progress): Promise<Loaded> {
  const steps = 3;
  const lang = getLanguage();
  onProgress(t('boot.step.assets', lang), 0, steps);

  const assetsP = getJson('asset-manifest.json');
  const luaP = getJson('lua-manifest.json');
  const overviewP = getJson('overview.json');

  const assets = AssetManifestSchema.parse(await assetsP);
  onProgress(t('boot.step.rules', lang), 1, steps);
  const lua = LuaManifestSchema.parse(await luaP);
  onProgress(t('boot.step.data', lang), 2, steps);
  const overview = (await overviewP) as OverviewData;

  onProgress(t('boot.step.ready', lang), steps, steps);
  return { assets, assetsByKey: assetIndex(assets), lua, overview };
}

/**
 * Engine-path -> URL. `LogEvent` and `PlaySound` payloads carry engine paths
 * (`packages/standard/image/generals/caocao.jpg`), never URLs, so every lookup
 * goes through the manifest. A miss returns null rather than a broken image:
 * the v1 build deliberately omits the anim sequences and all audio.
 */
export function assetUrl(loaded: Pick<Loaded, 'assetsByKey'>, key: string): string | null {
  const e = loaded.assetsByKey.get(key);
  return e ? `${BASE}${e.href}` : null;
}

/**
 * Portraits are filed under the *extension* directory, which is not the package
 * name: mobile's ten sub-packages (`mobile_sp`, `m_yj_ex`, …) all share
 * `packages/mobile/image/generals/`. `OverviewGeneral.extension` carries that;
 * the `standard` fallback keeps older overview.json files working.
 */
const GENERAL_EXTENSIONS = ['standard', 'mobile'] as const;

export function generalImage(
  loaded: Pick<Loaded, 'assetsByKey'>,
  name: string,
  extension?: string,
): string | null {
  if (extension) {
    const hit = assetUrl(loaded, `packages/${extension}/image/generals/${name}.jpg`);
    if (hit) return hit;
  }
  for (const ext of GENERAL_EXTENSIONS) {
    const hit = assetUrl(loaded, `packages/${ext}/image/generals/${name}.jpg`);
    if (hit) return hit;
  }
  return null;
}

export function generalAvatar(
  loaded: Pick<Loaded, 'assetsByKey'>,
  name: string,
  extension?: string,
): string | null {
  for (const ext of extension ? [extension, ...GENERAL_EXTENSIONS] : GENERAL_EXTENSIONS) {
    const hit = assetUrl(loaded, `packages/${ext}/image/generals/avatar/${name}.jpg`);
    if (hit) return hit;
  }
  return generalImage(loaded, name, extension);
}

export function cardImage(loaded: Pick<Loaded, 'assetsByKey'>, card: OverviewCard): string | null {
  for (const pack of [card.pack, 'standard_cards', 'maneuvering']) {
    for (const sub of ['', 'delayedTrick/']) {
      const hit = assetUrl(loaded, `packages/${pack}/image/card/${sub}${card.name}.png`);
      if (hit) return hit;
    }
  }
  return assetUrl(loaded, 'image/card/unknown.png');
}

/**
 * The Lua bundle, fetched in the background after the lobby is up. Whoever needs
 * the engine awaits this; nobody blocks the first paint on it.
 */
let bundlePromise: Promise<Record<string, string>> | null = null;
export function prefetchLuaBundle(): Promise<Record<string, string>> {
  bundlePromise ??= getJson('lua-bundle.json') as Promise<Record<string, string>>;
  return bundlePromise;
}
