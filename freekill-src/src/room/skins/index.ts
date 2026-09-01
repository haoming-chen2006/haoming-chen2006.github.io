/**
 * Alternate general artwork ("skins"), including animated video portraits.
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────────
 *
 * `packages/lunarltk_skins` (gitee.com/qsgs-fans/lunarltk_skins, GPL-3.0) is a
 * FreeKill package that maps general ids to alternate artwork. It carries no
 * artwork itself -- 160 KB of pure Lua -- and instead points at absolute URLs on
 * two third-party hosts. That is what makes it interesting: alternate portraits,
 * including animated ones, at literally zero bundle cost.
 *
 * The pack is a *build-time data source only*. `generate.mjs` boots the real
 * engine with it and freezes `Fk.skin_packages` into `catalog.generated.ts`; the
 * Lua never enters `public/lua-bundle.json`, so the bundle hash that decides
 * which clients may sit at the same table is untouched. See `generate.mjs`.
 *
 * ── WHAT ACTUALLY LANDS ───────────────────────────────────────────────────────
 *
 * The pack targets 1178 general ids across every expansion its authors play
 * with. This build ships 341 generals (277 in the playable pool), so most of
 * that misses. What connects:
 *
 *     110 generals get artwork      90 of them in the playable pool (32%)
 *     226 files                     88 still (.jpg), 138 animated (.mp4)
 *
 * ── LICENSING: UNRESOLVED, AND THE REASON THIS IS OFF BY DEFAULT ──────────────
 *
 * The GPL-3.0 in the pack's repository covers the Lua. It does not cover the
 * artwork, which is not in that repository. The artwork lives in two image
 * dumps, and **neither states a licence of any kind**:
 *
 *   * `github.com/Aated/pic` (via cdn.jsdelivr.net) -- 197 of the 226 files.
 *     No LICENSE file (GitHub's licence API returns 404), no README, no
 *     description. 1.4 GB, created 2026-08-26, still being pushed to.
 *   * `cnb.cool/Vanshang-Org/pic` -- the other 29. No LICENSE, no README.
 *
 * On inspection the files are official Sanguosha skin artwork -- the commercial
 * game's own promotional art, collected and rehosted. There is no plausible
 * reading under which an anonymous five-day-old 1.4 GB image dump holds
 * redistribution rights to it. Serving it from a public site is a copyright
 * exposure that no amount of engineering here can fix, and it is not a decision
 * a build step should make quietly on the operator's behalf.
 *
 * ── PRIVACY ───────────────────────────────────────────────────────────────────
 *
 * Enabling skins makes every player's browser fetch portraits directly from
 * jsdelivr and cnb.cool, handing both their IP address, User-Agent, and a
 * Referer naming this site. Neither host is under our control and neither has a
 * privacy policy we have accepted on the player's behalf. cnb.cool additionally
 * sends `Cache-Control: no-cache`, so those 29 files are re-requested on every
 * single view rather than cached -- a continuous per-player traffic signal.
 *
 * ── COST ──────────────────────────────────────────────────────────────────────
 *
 * Measured over all 226 files (see the report): stills are 73 KB median / 98 KB
 * p90; videos are 769 KB median / 1.77 MB p90 / 2.87 MB max -- roughly 10x. An
 * eight-seat table on the `all` tier can pull several megabytes of portraits
 * before the first card is played. Hence the three-way `off` / `static` / `all`
 * setting rather than a boolean.
 *
 * ── THEREFORE ─────────────────────────────────────────────────────────────────
 *
 * The default is `off`. Everything here is built, tested, and ready; the switch
 * is `writeSkinMode('static' | 'all')`. Turning it on is an operator decision
 * that should be made with the licensing paragraph above in hand.
 */
export { SkinLayer, type SkinLayerProps } from './SkinLayer';
export { useSkinMode } from './useSkinMode';
export {
  pickSkin,
  skinsFor,
  hasSkins,
  isUsable,
  isHostWrittenOff,
  noteSkinFailure,
  noteSkinSuccess,
  resetSkinHealth,
  skinHealthSnapshot,
  DEADLINE_MS,
  FAILURE_THRESHOLD,
} from './loader';
export { readSkinMode, writeSkinMode, DEFAULT_SKIN_MODE, SKIN_MODE_KEY } from './policy';
export { SKIN_CATALOG, SKIN_HOSTS } from './catalog.generated';
export { skinKind, isSkinMode, SKIN_MODES, type SkinMode, type SkinEntry, type ResolvedSkin } from './types';
