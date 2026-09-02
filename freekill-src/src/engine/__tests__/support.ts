import type { RoomSpec } from '../../contract/engine.ts';
import { bundleSha256_16, type LuaBundle } from '../bundle.ts';
import { allBotSeats, InProcessLuaHost, type HostOptions } from '../luaHost.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';
import { MemoryCommandLog } from '../commandLog.ts';

/** Building the bundle reads ~300 files; do it once per test file. */
let cached: LuaBundle | null = null;
export function bundle(): LuaBundle {
  cached ??= buildBundle();
  return cached;
}

let shaCache: string | null = null;
export async function sha(): Promise<string> {
  shaCache ??= await bundleSha256_16(bundle());
  return shaCache;
}

/** The reference game: seed 20260828, 8 seats, standard 身份局. */
export const SEED = 20260828;

/**
 * The mobile pack's ten sub-packages, by the name `Engine:canUseGeneral` matches
 * on (`r.disabled_packs`, `lua/lunarltk/core/engine.lua:324`). Note these are
 * package names, not the shared `mobile` extension name.
 *
 * `scripts/build.test.ts` asserts `overview.json` contains exactly these, so
 * renaming or adding one upstream fails there rather than quietly widening the
 * pool underneath a test that meant to pin it.
 */
export const MOBILE_PACKS = [
  'mobile_bingshi', 'mobile_shiji', 'm_shzl_ex', 'm_yj_ex', 'mobile_sp',
  'mobile_lxxh', 'mobile_rare', 'mobile_jsrg', 'mobile_test', 'mobile_derived',
] as const;

/**
 * The six mirrored rosters' sub-packages, by the same `disabled_packs` name.
 *
 * Thirty-two of them behind six directories: the repository name is not the
 * package name, so this cannot be derived from `VENDORED_PACKAGES` — `shzl`
 * registers `wind`/`fire`/`forest`/`mountain`/`shadow`/`thunder`/`shzl_god`,
 * and `yj` registers one package per year.
 */
export const VENDORED_PACKS = [
  'standard_ex',
  // A card pack, and it has to be here for the same reason `mobile_derived` is:
  // `Engine:getAllCardIds` filters by `disabled_packs` too
  // (lua/lunarltk/core/engine.lua:545,563), so leaving it out puts 木牛流马 in
  // the draw pile of every game that meant to play the plain standard deck.
  // One extra card changes every draw after it, which is how a roster addition
  // turns into two unrelated-looking failures in liveTable.test.ts.
  'standard_ex_cards',
  'wind', 'fire', 'forest', 'mountain', 'shadow', 'thunder', 'shzl_god',
  'yj2011', 'yj2012', 'yj2013', 'yj2014', 'yj2015', 'yj2016', 'yj2017',
  'yjtw2013', 'yjtw2017',
  'sp', 'sp_star', 'sp_jsp', 'sp_re',
  'mou_zhi', 'mou_shi', 'mou_tong', 'mou_yu', 'mou_neng',
  'beginning', 'continue', 'transition', 'conclusion', 'decline', 'rise',
] as const;

/**
 * Settings that hold a test to the 25-general standard roster.
 *
 * Several suites assert things that are true of the standard pack and are not
 * claims about content generally - that every battle-log line renders in
 * English, say. Those were written when 25 generals was the whole game. Rather
 * than weaken the assertion, the game is pinned to the roster it was written
 * about, and the mobile roster gets its own measurement.
 *
 * Every non-standard general pack has to be listed or the pin leaks, and it
 * leaks silently: the suites that use this do not count generals, they assert
 * things like "every battle-log line renders in English", so a wider pool shows
 * up as an unrelated-looking failure somewhere downstream. That is exactly what
 * happened when the six rosters arrived — five suites went red at once, none of
 * them about content. `roster.test.ts` now asserts this list is complete
 * against the booted engine, so the next pack fails there, by name, instead.
 */
export const STANDARD_ROSTER_ONLY = {
  disabledPack: [...MOBILE_PACKS, ...VENDORED_PACKS],
} as const;

export function roomSpec(overrides: Partial<RoomSpec> = {}): RoomSpec {
  return {
    roomId: 'test-1',
    seed: SEED,
    seats: allBotSeats(8),
    ownerId: 1,
    timeout: 15,
    settings: { gameMode: 'aaa_role_mode' },
    ...overrides,
  };
}

export interface PlayedGame {
  host: InProcessLuaHost;
  session: RoomSession;
  log: MemoryCommandLog;
}

/** Boot a host, start a room, play it to `GameOver`. */
export async function playGame(
  spec: RoomSpec = roomSpec(),
  opts: HostOptions = {},
): Promise<PlayedGame> {
  const host = await InProcessLuaHost.create(bundle(), opts);
  const log = new MemoryCommandLog();
  const session = await RoomSession.start(host, spec, { log, bundleSha: await sha(), keepRaw: true });
  const res = await session.advance();
  if (res.err) throw new Error(`game did not finish: ${res.err}`);
  if (!res.over) throw new Error(`game stopped (${res.stopped}) on ${JSON.stringify(res.waitingOn)}`);
  return { host, session, log };
}

/**
 * Compare two decision sequences boundary by boundary and report the first
 * disagreement. A final-state-only match hides divergence that self-corrects,
 * so nothing in this suite ever compares only the last digest.
 */
export function firstDivergence(
  a: readonly { seq: number; playerId: number; command: string; digest: string }[],
  b: readonly { seq: number; playerId: number; command: string; digest: string }[],
): string | null {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    if (x.playerId !== y.playerId || x.command !== y.command || x.digest !== y.digest) {
      return `boundary ${i + 1}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`;
    }
  }
  if (a.length !== b.length) return `length ${a.length} vs ${b.length}, first ${n} agree`;
  return null;
}
