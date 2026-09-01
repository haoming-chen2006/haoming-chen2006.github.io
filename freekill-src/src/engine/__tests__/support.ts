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
 * Settings that hold a test to the 25-general standard roster.
 *
 * Several suites assert things that are true of the standard pack and are not
 * claims about content generally - that every battle-log line renders in
 * English, say. Those were written when 25 generals was the whole game. Rather
 * than weaken the assertion, the game is pinned to the roster it was written
 * about, and the mobile roster gets its own measurement.
 */
export const STANDARD_ROSTER_ONLY = { disabledPack: [...MOBILE_PACKS] } as const;

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
