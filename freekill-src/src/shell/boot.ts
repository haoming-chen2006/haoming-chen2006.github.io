/**
 * What the app loads before it can show anything, and in what order.
 *
 * The ordering is the whole first-run experience. The lobby needs the asset
 * manifest (for avatars and portraits) and the overview data; it does NOT need
 * the 1.5 MB Lua bundle or the Lua VM, which is why a cold load reaches a
 * playable lobby well inside the 10-second criterion. The bundle is fetched in
 * the background afterwards and is only awaited when a room actually starts.
 */
import { AssetManifestSchema, LuaManifestSchema, assetIndex } from '../contract/manifest';
import type { AssetEntry, AssetManifest, LuaManifest } from '../contract/manifest';

export interface OverviewGeneral {
  readonly name: string;
  readonly pack: string;
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

export async function loadShell(onProgress: Progress): Promise<Loaded> {
  const steps = 3;
  onProgress('读取素材清单', 0, steps);
  const assets = AssetManifestSchema.parse(await getJson('asset-manifest.json'));

  onProgress('读取规则清单', 1, steps);
  const lua = LuaManifestSchema.parse(await getJson('lua-manifest.json'));

  onProgress('读取武将与卡牌', 2, steps);
  const overview = (await getJson('overview.json')) as OverviewData;

  onProgress('就绪', steps, steps);
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

export function generalImage(loaded: Pick<Loaded, 'assetsByKey'>, name: string, pack = 'standard'): string | null {
  return assetUrl(loaded, `packages/${pack}/image/generals/${name}.jpg`);
}

export function generalAvatar(loaded: Pick<Loaded, 'assetsByKey'>, name: string): string | null {
  for (const pack of ['standard']) {
    const hit = assetUrl(loaded, `packages/${pack}/image/generals/avatar/${name}.jpg`);
    if (hit) return hit;
  }
  return generalImage(loaded, name);
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
