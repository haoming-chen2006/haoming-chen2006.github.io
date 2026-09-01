/**
 * The part that makes a third-party host safe to depend on.
 *
 * Skin artwork lives on hosts we do not run (see `index.ts` for who they are and
 * what that costs). They can be slow, rate-limited, DMCA'd, or simply gone. The
 * rule this module enforces is that none of that is ever the player's problem:
 * a skin is an *upgrade applied to an already-drawn portrait*, never a thing the
 * portrait waits for. If the artwork never arrives, the seat looks exactly as it
 * does today and the game is unaffected.
 *
 * Three mechanisms, in order of how much they save you:
 *
 *  1. **Nothing awaits a skin.** `SkinLayer` mounts on top of the default
 *     portrait at `opacity: 0` and fades in only after the element has actually
 *     decoded. There is no loading state, no spinner, and no code path where a
 *     pending skin can delay a render, a decision, or a network message.
 *
 *  2. **A per-URL deadline.** A host that accepts the connection and then stalls
 *     is worse than one that refuses, because the browser will wait a very long
 *     time before giving up on its own. Each element gets its own timer and is
 *     abandoned when it expires.
 *
 *  3. **A per-host circuit breaker.** The first two are per-element, so a dead
 *     host would still cost every seat a full timeout, every render, forever.
 *     After `FAILURE_THRESHOLD` failures against one host, that host is written
 *     off for the rest of the session and every later lookup against it returns
 *     nothing without touching the network. This is what turns "the art host is
 *     down" from a recurring tax into a single cheap discovery.
 *
 * WHY A TIMEOUT AND AN ERROR ARE NOT THE SAME EVIDENCE.
 *
 * The first cut of this counted both the same way, and the review page caught
 * what that costs. Rendering 110 seats at once put ~220 requests behind the
 * browser's six-connections-per-host limit; most sat in the queue past their own
 * deadline, through no fault of the host. Those queue timeouts tripped the
 * breaker, and by six seconds in the feature had switched itself off completely
 * against two hosts that were serving every byte correctly. Exactly the outage
 * the breaker exists to prevent, self-inflicted.
 *
 * So the two signals are now weighted by what they actually prove. An `error`
 * event is the host's own answer -- refused, 404, unplayable -- and always
 * counts. A timeout only says *something* was slow, which on a phone on a train
 * is usually the client. It counts only while the host is unproven; once any
 * file from that host has arrived, slowness can no longer write it off. A host
 * that has never delivered anything and has now missed three deadlines is dead
 * enough to stop asking, which keeps the black-hole case covered.
 *
 * The deadlines themselves are liveness checks, not performance budgets -- they
 * exist to release a socket that will never produce anything, and nothing waits
 * on them, so they are set generously rather than tightly.
 *
 * State is per-session and in-memory on purpose. A host that was down when the
 * tab opened may be up on the next reload, and nothing here is worth persisting.
 */
import { SKIN_CATALOG } from './catalog.generated';
import { skinKind, type ResolvedSkin, type SkinEntry, type SkinMode } from './types';

/** Failures against one host before it is written off for the session. */
export const FAILURE_THRESHOLD = 3;

/**
 * How long one element gets before it is abandoned.
 *
 * Generous on purpose. These are not performance budgets -- nothing waits on a
 * skin, so a slow one costs nothing but a socket the browser was holding anyway.
 * They are the point at which we stop believing anything will arrive. Set them
 * tight and ordinary queueing looks like an outage; see the header.
 */
export const DEADLINE_MS: Readonly<Record<ResolvedSkin['kind'], number>> = {
  image: 15_000,
  video: 30_000,
};

/** Why a URL was abandoned. The breaker weights these differently. */
export type FailureReason = 'error' | 'timeout';

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Per-session health, reset only by `resetSkinHealth` (tests) or a reload. */
interface Health {
  readonly failuresByHost: Map<string, number>;
  readonly deadUrls: Set<string>;
  /** Hosts that have delivered at least one file. Slowness cannot write these off. */
  readonly provenHosts: Set<string>;
}

const health: Health = { failuresByHost: new Map(), deadUrls: new Set(), provenHosts: new Set() };

/** Test seam. Never called in production code. */
export function resetSkinHealth(): void {
  health.failuresByHost.clear();
  health.deadUrls.clear();
  health.provenHosts.clear();
}

export function isHostWrittenOff(url: string): boolean {
  return (health.failuresByHost.get(hostOf(url)) ?? 0) >= FAILURE_THRESHOLD;
}

/** A URL is usable if it has not failed and its host has not been written off. */
export function isUsable(url: string): boolean {
  return !health.deadUrls.has(url) && !isHostWrittenOff(url);
}

/**
 * The URL is abandoned either way. Whether that also counts against the *host*
 * depends on what we actually learned -- see the header. A timeout against a
 * host that has already delivered something is treated as our problem, not its.
 */
export function noteSkinFailure(url: string, reason: FailureReason = 'error'): void {
  health.deadUrls.add(url);
  const host = hostOf(url);
  if (reason === 'timeout' && health.provenHosts.has(host)) return;
  health.failuresByHost.set(host, (health.failuresByHost.get(host) ?? 0) + 1);
}

/**
 * A success clears the host's failure count rather than decrementing it, and
 * marks the host proven for the rest of the session.
 *
 * The breaker is meant to catch a host that is *down*, not one that is missing
 * the odd file. Two 404s and a 200 is a patchy catalog, which is fine; three
 * failures with nothing working in between is an outage, which is not.
 */
export function noteSkinSuccess(url: string): void {
  const host = hostOf(url);
  health.failuresByHost.delete(host);
  health.provenHosts.add(host);
}

/** Diagnostics for the review page and the tests. */
export function skinHealthSnapshot(): {
  deadUrls: number;
  hosts: Record<string, number>;
  proven: string[];
} {
  return {
    deadUrls: health.deadUrls.size,
    hosts: Object.fromEntries(health.failuresByHost),
    proven: [...health.provenHosts],
  };
}

function eligible(entry: SkinEntry, mode: SkinMode): boolean {
  if (mode === 'off') return false;
  if (mode === 'static') return skinKind(entry.url) === 'image';
  return true;
}

/**
 * The skin to try for a general, or `undefined` to leave the default portrait
 * alone.
 *
 * Selection is the first eligible entry, not a random one. The pack lists a
 * general's skins in a curated order, and a stable choice means the table looks
 * the same on every render and across a reconnect -- a portrait that reshuffles
 * itself mid-game reads as a bug.
 *
 * `preferred` lets a caller pin one specific URL (a future skin picker); an
 * unusable or ineligible pin falls through to the normal choice rather than
 * leaving the seat with nothing.
 */
export function pickSkin(
  general: string | undefined,
  mode: SkinMode,
  preferred?: string,
): ResolvedSkin | undefined {
  if (!general || mode === 'off') return undefined;
  const entries = SKIN_CATALOG[general];
  if (!entries?.length) return undefined;

  const usable = entries.filter((e) => eligible(e, mode) && isUsable(e.url));
  const chosen = (preferred && usable.find((e) => e.url === preferred)) ?? usable[0];
  if (!chosen) return undefined;
  return { ...chosen, kind: skinKind(chosen.url) };
}

/** Every skin a general has, for a picker UI. Unfiltered by health. */
export function skinsFor(general: string | undefined): readonly ResolvedSkin[] {
  if (!general) return [];
  return (SKIN_CATALOG[general] ?? []).map((e) => ({ ...e, kind: skinKind(e.url) }));
}

export function hasSkins(general: string | undefined): boolean {
  return !!general && !!SKIN_CATALOG[general]?.length;
}
