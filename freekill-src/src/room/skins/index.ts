/**
 * Alternate general artwork ("skins"), including animated video portraits.
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────────
 *
 * `pack/` is lunarltk_skins (gitee.com/qsgs-fans/lunarltk_skins, GPL-3.0), a
 * FreeKill package that maps general ids to alternate artwork. It carries no
 * artwork itself -- 320 KB of pure Lua -- and instead points at absolute URLs on
 * two third-party hosts. That is what makes it interesting: alternate portraits,
 * including animated ones, at literally zero bundle cost.
 *
 * The pack is a *build-time data source only*. `generate.mjs` boots the real
 * engine on the shipped roster with it and freezes `Fk.skin_packages` into
 * `catalog.generated.ts`; the Lua never enters `public/lua-bundle.json`, so the
 * bundle hash that decides which clients may sit at the same table is
 * untouched. See `generate.mjs`, and `pack/README.md` for the pinned commit.
 *
 * ── WHAT ACTUALLY LANDS ───────────────────────────────────────────────────────
 *
 * The pack targets well over a thousand general ids across every expansion its
 * authors play with, under every id upstream has ever used for them. Only ids
 * this build defines survive, and the header of `catalog.generated.ts` carries
 * the current count. At the time of writing, against a roster of 697:
 *
 *     305 generals get artwork      280 of them in the playable pool
 *     684 files                     284 still (.jpg), 400 animated (.mp4)
 *
 * That number moves with the roster, and `__tests__/catalog.test.ts` is what
 * keeps the committed file honest about it: the first catalog was generated
 * against 341 generals and never again, so when the roster nearly doubled the
 * new generals silently got nothing.
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
 * The default was `off` while that decision was open. The operator has now taken
 * it, with the paragraph above in hand, and the default is `all`. What that
 * changes is only the answer: the licensing exposure is the same exposure, the
 * privacy cost is the same cost, and the way out is one click away in the
 * picker's own panel rather than buried in a settings page — `off`, `static` and
 * `all` sit under the artwork they buy, which is the only place a player is
 * actually thinking about the question. See `policy.ts` and `SkinPicker.tsx`.
 *
 * ── WHAT A PLAYER SEES ────────────────────────────────────────────────────────
 *
 *   <SkinPicker general={mine} />   a chip in the room's corner. It opens itself
 *                                   once, the first time this seat is given a
 *                                   general with artwork, and stays reachable
 *                                   for the rest of the game.
 *   <SkinLayer general mode preferred />
 *                                   the overlay `Photo` already drops over every
 *                                   seat. `preferred` is this browser's pin.
 *
 * A pin is local to one browser and one viewer. It is written to `localStorage`,
 * read back by every `SkinLayer` in the document, and reaches the engine, the
 * store and the wire exactly never; the other seven seats cannot tell that it
 * happened. `__tests__/skins.test.ts` enforces that by reading this directory's
 * source, because "make it shared" is a one-line change that would look
 * reasonable in review.
 */
export { SkinLayer, type SkinLayerProps } from './SkinLayer';
export { SkinPicker, skinName, resetSkinOffers, type SkinPickerProps } from './SkinPicker';
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
  NO_SKIN,
} from './loader';
export { readSkinMode, writeSkinMode, DEFAULT_SKIN_MODE, SKIN_MODE_KEY } from './policy';
export {
  readSkinChoices,
  writeSkinChoice,
  clearSkinChoices,
  useSkinChoices,
  SKIN_CHOICE_KEY,
  SKIN_CHOICE_EVENT,
  type SkinChoices,
} from './choice';
export { SKIN_CATALOG, SKIN_HOSTS } from './catalog.generated';
export { skinKind, isSkinMode, SKIN_MODES, type SkinMode, type SkinEntry, type ResolvedSkin } from './types';
