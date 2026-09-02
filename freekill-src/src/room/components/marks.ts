/**
 * What is actually *in* a mark.
 *
 * `Photo/MarkArea.qml:66-113` hangs a `TapHandler` off every row of the mark
 * area, and the four branches below are its four branches, in its order. A mark
 * is not a label in the Qt client — it is the handle on a pile of cards, a list
 * of generals, or a package's own panel, and tapping it is how you read what
 * your opponent is holding in it.
 *
 * The port drew the same rows as inert `<span>`s. `getPile`, `getAllPiles` and
 * `cardVisibility` all sat on `LtkLua` with no caller, which is the same shape
 * of gap `GetQmlMark` and `getVirtualEquipData` were: the bridge was ported and
 * the thing that asks it was not.
 *
 * NOTHING HERE DECIDES WHAT MAY BE SEEN. `cardVisibility` is
 * `Self:cardVisible(id)` (`client_util.lua:1184`), which runs the room's
 * `VisibilitySkill`s, the buddy list and the `$`-prefix rule for private piles.
 * A `$`-prefixed pile belonging to somebody else therefore filters down to
 * nothing and the tap does nothing — exactly as it does upstream, and for the
 * same reason: the engine said no.
 */
import type { LtkLua } from '../ltk/LtkLua';

/** What a tapped mark or pile opens. `title` is an i18n key, not prose. */
export type Inspect =
  | { readonly kind: 'cards'; readonly title: string; readonly ids: readonly number[] }
  | { readonly kind: 'cardNames'; readonly title: string; readonly names: readonly string[] }
  | { readonly kind: 'generals'; readonly title: string; readonly names: readonly string[] };

/** `@&`/`@$` marks arrive as arrays; anything else is not a list of things. */
function asList(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * `MarkArea.qml:76` — `!Object.is(parseInt(data[0]), NaN)`. The whole list is
 * read as card ids when its FIRST entry parses as an integer, and as card names
 * otherwise. Mirrored rather than improved: a mixed list is not a shape the
 * engine produces, and guessing per entry would split one pile across two
 * renderings.
 */
function looksLikeIds(list: readonly unknown[]): boolean {
  const first = list[0];
  if (typeof first === 'number') return Number.isFinite(first);
  return typeof first === 'string' && Number.isInteger(Number.parseInt(first, 10));
}

/**
 * The cards of a named pile this viewer is allowed to see.
 *
 * `MarkArea.qml:103-106`: `Ltk.getPile(pid, name)` then
 * `.filter(Ltk.cardVisibility)`. Both are engine calls; the filter is the rule
 * and it is not re-stated here.
 */
export function visiblePile(lua: LtkLua, playerId: number, name: string): readonly number[] {
  let ids: readonly number[];
  try { ids = lua.getPile(playerId, name); } catch { return []; }
  return ids.filter((cid) => {
    try { return lua.cardVisibility(cid); } catch { return false; }
  });
}

/**
 * What tapping this mark should open, or null when the answer is "nothing".
 *
 * `@[type]name` marks are deliberately not here. Upstream routes them to
 * `startCheatByPath(data.qml_path)` — a QML file shipped by the package, which
 * this build cannot run — and their *text* is already rendered from the same
 * `GetQmlMark` call in `Photo`'s `markValue`. Opening an empty panel would be
 * worse than leaving the chip alone.
 */
export function inspectMark(
  lua: LtkLua, key: string, value: unknown, playerId: number,
): Inspect | null {
  // `@&xxx`: general names. `ViewGeneralPile`.
  if (key.startsWith('@&')) {
    const names = asList(value).map(String).filter(Boolean);
    return names.length ? { kind: 'generals', title: key, names } : null;
  }

  // `@$xxx`: card ids or card names. `ViewPile`.
  if (key.startsWith('@$')) {
    const list = asList(value);
    if (!list.length) return null;
    if (looksLikeIds(list)) {
      const ids = list.map((x) => Number(x)).filter(Number.isFinite);
      return ids.length ? { kind: 'cards', title: key, ids } : null;
    }
    return { kind: 'cardNames', title: key, names: list.map(String) };
  }

  // A package panel we cannot open; its text is already on the chip.
  if (key.startsWith('@[')) return null;

  // Everything else is read as the name of a private pile — which is also how
  // a pile gets into the mark area in the first place (`Photo.qml:186-193`).
  const ids = visiblePile(lua, playerId, key);
  return ids.length ? { kind: 'cards', title: key, ids } : null;
}

/**
 * The private piles a seat should show a counter for.
 *
 * `Photo.qml:187` — `updatePileInfo` skips any area whose name starts with `#`
 * and otherwise writes `markArea.setMark(areaName, count)`, so an ordinary
 * named pile (甘宁's 锦帆, 邓艾's 田, 李丰's 粮) appears in the mark row as its
 * own name and a number. The port tracked `state.piles` from `MoveCards` and
 * drew it nowhere, so those piles did not exist on screen at all — and for
 * 屯田, whose pile IS the general's attack range, that is the whole general.
 *
 * Empty piles are dropped, which is `updatePileInfo`'s `removeMark` branch: a
 * pile that has been emptied stops being shown rather than reading `0`.
 */
export function pileCounts(
  piles: Readonly<Record<string, readonly number[]>> | undefined,
): readonly (readonly [string, number])[] {
  if (!piles) return [];
  const out: (readonly [string, number])[] = [];
  for (const [name, ids] of Object.entries(piles)) {
    if (name.startsWith('#') || !ids.length) continue;
    out.push([name, ids.length]);
  }
  return out;
}
