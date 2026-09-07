/**
 * The node face of `probe.ts`: build the Lua tree off disk, then probe.
 *
 * `includeTests` brings in `test/lua/**`, which is where the scripted room
 * lives. It is not in the shipped bundle and must not be; the browser gets it
 * from `public/lua-probe.json` instead (see `../browser/probe.ts`).
 */
import { buildBundle, WEB_PACKAGES } from '../../engine/node/buildBundle.ts';
import type { HeroSpec } from '../spec.ts';
import { probeHero, type HeadlessResult } from './probe.ts';

export { formatHeadless, probeHero } from './probe.ts';
export type { HeadlessCheck, HeadlessResult, ProbeOptions } from './probe.ts';

export interface HeadlessOptions {
  /** Bundle entries to overlay, e.g. `packages/custom/generals/x.lua`. */
  files?: Record<string, string>;
}

export const testHero = async (
  spec: HeroSpec, { files = {} }: HeadlessOptions = {},
): Promise<HeadlessResult> =>
  probeHero(spec, {
    bundle: buildBundle({ includeTests: true, sitePackages: [...WEB_PACKAGES, 'custom'] }),
    files,
  });
