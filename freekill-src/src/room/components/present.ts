/**
 * Throwing a flower or an egg at somebody, and the budget that stops it
 * becoming a way to ruin a game.
 *
 * WHERE THE WIRE FOR THIS ALREADY EXISTS. A present is not an engine event and
 * never was. The Qt client sends one as a *chat message*
 * (`Fk/Components/LunarLTK/Cheat/PlayerDetail.qml:213`):
 *
 *     ClientInstance.notifyServer("Chat", { type: 2, msg: "$@" + kind + ":" + pid })
 *
 * and every receiving client intercepts it before it can become a chat bubble
 * (`Fk/Pages/Common/RoomPage.qml:582-609`, `specialChat`): a `$`-prefixed
 * message beginning `@` is split on `:`, the head names one of `Egg`,
 * `GiantEgg`, `Shoe`, `Wine`, `Flower`, the tail is the target's id, and the
 * sender's id comes off the chat envelope. The server relays the string and has
 * no idea any of this happened.
 *
 * That matters because it means this feature needs no new wire. The room
 * already has both halves of a chat round trip in `RoomViewProps` — `onChat`
 * out, `chat` back — and they are the same channel the Qt client uses, used the
 * same way. Nothing here touches `client.interact`, `replyToServer`, or any
 * engine state; a present is decoration that every seat happens to see.
 *
 * ONE DEVIATION FROM THE QT FORMAT, AND WHY. Upstream reads the thrower off the
 * chat envelope's `pid`. This build's `ChatLine.playerId` is always `null`:
 * neither `src/shell/api/local.ts:251` nor `src/net/index.ts:281` writes a seat
 * onto a chat row, so there is no envelope sender to read. The seat is therefore
 * carried in the message itself as a third field — `$@Flower:<to>:<from>` — and
 * `decode` still accepts the two-field upstream form, with `from` null.
 *
 * The seat in that field decides only where the throw is animated *from*. It is
 * never the name shown: that comes from the chat row's own `displayName`, which
 * the server wrote. A client that lies about `from` moves the arc and cannot
 * change whose name is on it.
 */

/** The three the room ships. Upstream also has `Wine` and `Shoe`; the art for
 *  those is 488 kB against 46 kB for these two, for a joke that lands less. */
export type PresentKind = 'Flower' | 'Egg' | 'GiantEgg';

/** What the player picks. `GiantEgg` is not offered — it is the rare roll on an
 *  egg, exactly as `PlayerDetail.qml:67` rolls it. */
export type ThrownKind = 'Flower' | 'Egg';

export const PRESENT_KINDS: readonly PresentKind[] = ['Flower', 'Egg', 'GiantEgg'];

/** The engine's own i18n keys, so the buttons read 送花 / 砸蛋 in Chinese and
 *  Flower / Egg in English without this build inventing a string.
 *  `lua/client/i18n/zh_CN.lua:124`. */
export const PRESENT_LABEL: Readonly<Record<ThrownKind, string>> = {
  Flower: 'Give Flower',
  Egg: 'Give Egg',
};

export interface Present {
  readonly kind: PresentKind;
  /** The seat it was thrown at. */
  readonly to: number;
  /** The seat it came from, or null in the upstream two-field form. */
  readonly from: number | null;
}

/** `specialChat` keys off `$` then `@`. Both, in that order, or it is chat. */
const PREFIX = '$@';

/** `PlayerDetail.qml:67` — a 3% chance the egg is a very large egg. */
export const GIANT_EGG_CHANCE = 0.03;

/** Rolls the kind actually thrown for a picked present. `roll` is injected so a
 *  test can pin it; nothing else about a present is random. */
export function rollKind(picked: ThrownKind, roll: number): PresentKind {
  return picked === 'Egg' && roll < GIANT_EGG_CHANCE ? 'GiantEgg' : picked;
}

export function encodePresent(p: Present): string {
  return p.from == null
    ? `${PREFIX}${p.kind}:${p.to}`
    : `${PREFIX}${p.kind}:${p.to}:${p.from}`;
}

/**
 * A chat line back into a present, or null if it is just something somebody
 * said. Deliberately total: this runs over every chat line the room ever sees,
 * including whatever a player types by hand.
 */
export function decodePresent(text: unknown): Present | null {
  if (typeof text !== 'string' || !text.startsWith(PREFIX)) return null;
  const parts = text.slice(PREFIX.length).split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const kind = parts[0] as PresentKind;
  if (!PRESENT_KINDS.includes(kind)) return null;
  const to = seat(parts[1]);
  if (to == null) return null;
  const from = parts.length === 3 ? seat(parts[2]) : null;
  return { kind, to, from };
}

/** Is this chat line a present rather than something to print? The log and the
 *  bubbles both ask, because upstream's `specialChat` returning true is what
 *  stops the raw `$@Egg:3` from ever being shown as text. */
export function isPresentText(text: unknown): boolean {
  return decodePresent(text) !== null;
}

function seat(s: string): number | null {
  if (!/^-?\d{1,6}$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

/* --------------------------------------------------------------- the budget */

/**
 * A token bucket, per thrower.
 *
 * This exists twice on purpose, and the two copies are not the same mechanism.
 *
 * The SEND side is manners: it greys the button out so a player can see they
 * are throwing too fast, and it is the only one a player can feel.
 *
 * The RECEIVE side is the defence, and it is the one that matters. The send
 * limit lives in the sender's own browser, which means it is advice — anybody
 * who can open a console can send a hundred chat lines a second. A table where
 * that turns into a hundred animations is a table you cannot play at, so every
 * client independently refuses to draw more than one present per sender per
 * `RECEIVE_GAP_MS`, whatever arrives. The griefer's flood is then a flood of
 * chat rows nobody renders.
 */
export class PresentBudget {
  /** When each key's bucket was last full, in the token-bucket sense. */
  private readonly at = new Map<string, number>();

  constructor(
    /** Milliseconds a single token takes to refill. */
    private readonly gapMs: number,
    /** How many may be spent back to back before the gap bites. */
    private readonly burst: number,
  ) {}

  /** Milliseconds until `key` may throw again; 0 when it may throw now. */
  waitMs(key: string, now: number): number {
    const floor = now - this.gapMs * this.burst;
    const last = Math.max(this.at.get(key) ?? floor, floor);
    return Math.max(0, last + this.gapMs - now);
  }

  /** Spend a token if there is one. False means refused, and nothing changed. */
  take(key: string, now: number): boolean {
    if (this.waitMs(key, now) > 0) return false;
    const floor = now - this.gapMs * this.burst;
    const last = Math.max(this.at.get(key) ?? floor, floor);
    this.at.set(key, last + this.gapMs);
    return true;
  }

  forget(key: string): void { this.at.delete(key); }
}

/** One throw every 2.5 s, three back to back. Slow enough that a stream of them
 *  is a choice, fast enough that a flower and an egg is one gesture. */
export const SEND_GAP_MS = 2500;
export const SEND_BURST = 3;

/** The receiving cap. Two seconds per sender is under the send limit on purpose
 *  — a lagging round trip must not lose a legitimate throw. */
export const RECEIVE_GAP_MS = 2000;
export const RECEIVE_BURST = 3;

/** However many people are throwing, this many arcs may be in the air. Beyond
 *  it the newest is dropped, because the table has to stay readable. */
export const MAX_IN_FLIGHT = 4;
