/**
 * `CustomDialog` — the request that carries its own UI.
 *
 * Every other request the engine sends names what it wants (`AskForChoice`,
 * `AskForPoxi`) and the client owns the widget. `CustomDialog` inverts that: the
 * package hands over a QML component path and a bag of properties, and the
 * client is expected to instantiate it. `Room:askToCustomDialog` is three lines
 * (`lua/lunarltk/server/room.lua:2832`) and none of them look at what is inside.
 *
 * A browser cannot instantiate QML, so what this file does instead is read the
 * component path and treat it as the name of a panel — the same way
 * `AskForPoxi` treats `poxi_type` as the name of a rule. That is exact rather
 * than approximate: there are eight of these in the whole shipped roster and six
 * distinct components between them, all of them read out of the `.qml` they name
 * (see `CustomDialogs.tsx`, which cites each one).
 *
 * NOTHING HERE DECIDES A RULE. Every function below moves a selection around
 * inside the bounds the payload itself states — `min`/`max`/`cancelable` are the
 * engine's numbers — and the reply is handed straight back for the engine to
 * accept or refuse. `no-rules.test.ts` is the thing that keeps that true.
 */

/** A `CustomDialog` request, normalised to "which component, and its props". */
export interface CustomDialogSpec {
  /** The component's path, as the package wrote it. */
  readonly path: string;
  /** Its properties — a QML model's `prop` table. */
  readonly prop: Record<string, unknown>;
}

/**
 * The two shapes a `CustomDialog` payload arrives in, and why there are two.
 *
 * `Room:askToCustomDialog` sends `{ path, data }` — the old two-field API. Every
 * caller in the shipped packages writes the NEW one (`component = { url, prop }`,
 * or `component = { url, model = { url, prop } }`), which this build's core does
 * not read; `lua/web/roomcompat.lua` flattens that back onto `path`/`data` and
 * says why at length.
 *
 * 盗书 is the exception and the reason this reader still has to know about
 * `component`: it skips the helper and posts the request itself —
 * `Request:new(friends, "CustomDialog")` with `{ component = ... }` verbatim
 * (`packages/mobile/pkg/mobile_sp/skills/mobile_daoshu.lua:102`) — so no server
 * -side flattening can reach it.
 *
 * Anything else (an unknown shape, a missing path) comes back `null`, which is
 * what puts the honest "not supported" box on screen rather than a blank one.
 */
export function readCustomDialog(data: unknown): CustomDialogSpec | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;

  const component = typeof d.component === 'object' && d.component !== null
    ? d.component as Record<string, unknown>
    : null;
  const model = component && typeof component.model === 'object' && component.model !== null
    ? component.model as Record<string, unknown>
    : null;

  const path = typeof d.path === 'string' ? d.path
    : component && typeof component.url === 'string' ? component.url
      : null;
  if (!path) return null;

  const raw = d.data ?? (model ? model.prop : component?.prop);
  // `prop = {}` is legal and common — 五灵 sends exactly that — and Lua encodes
  // an empty table as an empty ARRAY, so a payload can arrive as `[]` here.
  const prop = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  return { path, prop };
}

/** The component's own name, which is what selects the panel. */
export function componentName(path: string): string {
  return path.split('/').pop()?.replace(/\.qml$/, '') ?? path;
}

/* ------------------------------------------------------- choose a card list */

export interface CardListProps {
  readonly listNames: readonly string[];
  readonly listCards: readonly (readonly number[])[];
  readonly min: number;
  readonly max: number;
  readonly prompt: string;
  readonly allowEmpty: boolean;
  readonly cancelable: boolean;
}

export function cardListProps(prop: Record<string, unknown>): CardListProps {
  const names = Array.isArray(prop.listNames) ? prop.listNames as string[] : [];
  const cards = Array.isArray(prop.listCards) ? prop.listCards as number[][] : [];
  return {
    listNames: names,
    // Lua drops an empty table to `[]`, and a list of four suits where one suit
    // is empty is the ordinary case for 清正 — so a short `listCards` must line
    // up with `listNames` by index rather than by length.
    listCards: names.map((_, i) => cards[i] ?? []),
    min: typeof prop.min === 'number' ? prop.min : 0,
    max: typeof prop.max === 'number' ? prop.max : 0,
    prompt: typeof prop.prompt === 'string' ? prop.prompt : '',
    allowEmpty: prop.allowEmpty === true,
    cancelable: prop.cancelable !== false,
  };
}

/**
 * `ChooseCardListModel.qml:toggleList` — one for one.
 *
 * An empty list may not be taken unless the caller said so, which is the whole
 * of `(cardNum || allowEmpty)`: 清正 offers all four suits and expects you not
 * to be able to discard a suit you hold none of.
 */
export function toggleList(
  result: readonly string[],
  listName: string,
  cardNum: number,
  p: Pick<CardListProps, 'max' | 'allowEmpty'>,
): string[] {
  const at = result.indexOf(listName);
  if (at !== -1) return result.filter((_, i) => i !== at);
  if (result.length >= p.max) return [...result];
  if (cardNum === 0 && !p.allowEmpty) return [...result];
  return [...result, listName];
}

/* ------------------------------------------------------ choose card names */

export interface CardNamesProps {
  /** The names that may be taken. */
  readonly choices: readonly string[];
  /** Every name drawn, grouped into rows. Not all of them are `choices`. */
  readonly allChoices: readonly (readonly string[])[];
  readonly minNum: number;
  readonly maxNum: number;
  readonly prompt: string;
  readonly cancelable: boolean;
  readonly repeatable: boolean;
}

export function cardNamesProps(prop: Record<string, unknown>): CardNamesProps {
  const choices = Array.isArray(prop.choices) ? prop.choices as string[] : [];
  // `askForChooseCardNames` normalises `all_names` to a list of lists before it
  // sends (`packages/utility/utility.lua:533-539`), but a caller reaching
  // `askToCustomDialog` directly need not have, so a flat list is accepted too.
  const all = Array.isArray(prop.allChoices) ? prop.allChoices as unknown[] : [choices];
  const rows = all.every((r) => Array.isArray(r))
    ? all as string[][]
    : [all as string[]];
  return {
    choices,
    allChoices: rows.length ? rows : [choices],
    minNum: typeof prop.minNum === 'number' ? prop.minNum : 0,
    maxNum: typeof prop.maxNum === 'number' ? prop.maxNum : 0,
    prompt: typeof prop.prompt === 'string' ? prop.prompt : '',
    cancelable: prop.cancelable === true,
    repeatable: prop.repeatable === true,
  };
}

/** `ChooseCardNamesModel.qml:isChoiceEnabled`. */
export function nameEnabled(result: readonly string[], name: string, p: CardNamesProps): boolean {
  if (!p.choices.includes(name)) return false;
  if (p.repeatable) return result.length < p.maxNum;
  return result.includes(name) || result.length < p.maxNum;
}

/** `ChooseCardNamesModel.qml:toggleChoose`. Repeatable adds; plain toggles. */
export function toggleName(result: readonly string[], name: string, p: CardNamesProps): string[] {
  if (!p.choices.includes(name)) return [...result];
  if (p.repeatable) return result.length < p.maxNum ? [...result, name] : [...result];
  const at = result.indexOf(name);
  if (at !== -1) return result.filter((_, i) => i !== at);
  return result.length < p.maxNum ? [...result, name] : [...result];
}

/**
 * The one place the box answers on the click rather than on OK.
 *
 * `toggleChoose` fires `accepted()` itself when the question is a forced single
 * pick, and the box then hides its whole button row (`ChooseCardNamesBox.qml`'s
 * `buttonArea.visible`) — so without this the panel would have no OK, no Cancel
 * and no way to send the pick it just made.
 */
export function namesAutoAccept(result: readonly string[], p: CardNamesProps): boolean {
  return p.minNum === 1 && p.maxNum === 1 && !p.cancelable && result.length === 1;
}

/* ---------------------------------------------------------- seat ordering */

/**
 * 榻谟's swap, which is what `TaMoBox.qml`'s `onSelectedChanged` does: the first
 * click picks a photo up, the second trades the two players' seat numbers.
 *
 * The reply is the seating, `playerIds[seat - 1]` (`TaMoBox.qml:148`), so the
 * order of this array IS the answer.
 */
export function swapSeats(order: readonly number[], a: number, b: number): number[] {
  const i = order.indexOf(a);
  const j = order.indexOf(b);
  if (i < 0 || j < 0 || i === j) return [...order];
  const next = [...order];
  next[i] = b;
  next[j] = a;
  return next;
}

/* ------------------------------------------------------------- reordering */

/** Move the item at `index` one place in `delta`'s direction, clamped. */
export function shiftAt<T>(list: readonly T[], index: number, delta: number): T[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/**
 * 五灵's five tokens, in the order `wuling.lua:141` falls back to when the seat
 * sends nothing. The payload carries no card list at all — `prop = {}` — and
 * `WuLingBox.qml:14` hard-codes them, so the panel has to as well.
 */
export const WULING_CARDS = ['wulingHe', 'wulingHu', 'wulingXiong', 'wulingYuan', 'wulingLu'] as const;

/* ----------------------------------------------------------------- 盗书 */

export interface DaoshuProps {
  /** Card ids, except at `fakeIndex` where the disguised card's face sits. */
  readonly cards: readonly (number | DaoshuFace)[];
  readonly fakeIndex: number;
  readonly fakeName: string;
}

/** The printed face 盗书 gave the disguised card (`mobile_daoshu.lua:84-89`). */
export interface DaoshuFace {
  readonly extension?: string;
  readonly number?: number;
  readonly suit?: string;
  readonly color?: string;
}

export function daoshuProps(prop: Record<string, unknown>): DaoshuProps {
  const cards = Array.isArray(prop.cards) ? prop.cards as (number | DaoshuFace)[] : [];
  return {
    cards,
    fakeIndex: typeof prop.fake_index === 'number' ? prop.fake_index : -1,
    fakeName: typeof prop.fake_name === 'string' ? prop.fake_name : '',
  };
}

/**
 * What one entry replies with.
 *
 * `DaoShuBox.qml:38` builds the disguised card with `cardId: 0`, and 盗书 reads
 * a reply of `0` as "you found it" (`mobile_daoshu.lua:126`). So the fake's
 * answer is 0 and every other card answers with its own id — the guess is a
 * card id either way, and the panel never has to know which is which.
 */
export function daoshuCardId(entry: number | DaoshuFace): number {
  return typeof entry === 'number' ? entry : 0;
}
