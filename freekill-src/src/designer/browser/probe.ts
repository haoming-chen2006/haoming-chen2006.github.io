/**
 * The engine probe, in the player's tab.
 *
 * The published page has no server, and the whole reason the designer is
 * worth having is that it boots the real engine on a hero before it says the
 * hero works. So the probe runs here: `lua-bundle.json` — the rules the game
 * already ships — plus `lua-probe.json`, upstream's scripted-room harness that
 * the build emits beside it for exactly this, laid over each other and handed
 * to the same `probeHero` the dev back end uses. One VM boot per 创建, about a
 * second, in a tab that was going to load the bundle to play anyway.
 */
import type { LuaBundle } from '../../engine/bundle.ts';
import { assertBundle } from '../../engine/bundle.ts';
import type { HeroSpec } from '../spec.ts';
import { probeHero, type HeadlessResult } from '../compile/probe.ts';
import { heroPath } from '../../shell/customHeroes.ts';

const base = (): string => {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? './';
};

async function getJson(name: string): Promise<LuaBundle> {
  const res = await fetch(`${base()}${name}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return (await res.json()) as LuaBundle;
}

let treePromise: Promise<LuaBundle> | null = null;

/** The shipped bundle with the harness over it, fetched once per page. */
export function probeTree(): Promise<LuaBundle> {
  treePromise ??= Promise.all([getJson('lua-bundle.json'), getJson('lua-probe.json')])
    .then(([bundle, harness]) => {
      const tree = { ...bundle, ...harness };
      assertBundle(tree);
      return tree;
    })
    .catch((e) => {
      treePromise = null;
      throw e;
    });
  return treePromise;
}

/** Test seam: hand the probe a tree that did not come over the network. */
export function useProbeTree(tree: LuaBundle | null): void {
  treePromise = tree ? Promise.resolve(tree) : null;
}

/** Boot the engine on the shipped rules plus this hero's Lua and ask whether it works. */
export async function probeInBrowser(spec: HeroSpec, lua: string): Promise<HeadlessResult> {
  return probeHero(spec, { bundle: await probeTree(), files: { [heroPath(spec.id)]: lua } });
}
