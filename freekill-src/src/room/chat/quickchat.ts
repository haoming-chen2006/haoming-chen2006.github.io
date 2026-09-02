/**
 * Quick chats — the 23 canned lines a player can make their character say.
 *
 * WHAT THESE ARE. `packages/standard/audio/skill/fastchat_{m,f}{1..23}.mp3`:
 * 46 files, one male and one female reading of the same 23 lines, and the
 * engine's own i18n has the text of each under `$fastchat_m7` and friends
 * (`packages/standard/i18n/zh_CN.lua:317`). They have been in this build's pack
 * since it was first packed — `public/audio/index.json` carries them as
 * `skill/fastchat_m` and `skill/fastchat_f`, 23 takes each — with nothing in
 * the client able to reach them. This module is the reaching.
 *
 * THE WIRE IS UPSTREAM'S, VERBATIM, AND NEEDS NO PROTOCOL CHANGE.
 * `Fk/Components/Common/ChatBox.qml:84-89` sends a quick chat as a chat message
 * whose whole body is
 *
 *     "$" + ("fastchat_m" | "fastchat_f") + ":" + idx
 *
 * and `Fk/Pages/Common/RoomPage.qml:640-679` intercepts any `$`-prefixed chat
 * line before it can be printed: it splits on `:`, plays take `idx` of the
 * named line, and replaces the message text with `Lua.tr("$" + skill + idx)`.
 * A present (`components/present.ts`) is the same trick with an `@` after the
 * `$`; the two prefixes cannot collide because `@` is not a legal line name.
 *
 * So a quick chat costs nothing on the wire, and needs no new channel: the room
 * already has `onChat` out and `chat` back, and that is the channel the Qt
 * client uses for this, used the same way.
 *
 * NOTHING HERE HOLDS A STRING OF ITS OWN. The 23 lines are the engine's
 * translations, read through `LtkLua.tr` at the point of display, so they are
 * Chinese or English according to the room's language and this build never
 * forks the text. `quickChatKey` is the only thing that knows how the key is
 * spelled.
 */

/** `ChatBox.qml:19` — `for (let i = 1; i <= 23; i++)`. */
export const QUICK_CHAT_LINES = 23;

/**
 * Which reading of the lines. Not a property of the message so much as of the
 * speaker: the same 23 sentences, performed by a man or by a woman.
 *
 * It is on the wire rather than derived by each receiver, and that is
 * deliberate — it is what upstream sends, and it means the take everybody hears
 * and the text everybody reads agree even when a receiver's idea of the
 * sender's general is a message behind. Five of the 23 lines differ between the
 * two readings (`$fastchat_f4` opens with 嗯嘛~), so this is not only audio.
 */
export type QuickBank = 'fastchat_m' | 'fastchat_f';

export interface QuickChat {
  readonly bank: QuickBank;
  /** 1-based, exactly as the files are numbered. */
  readonly idx: number;
}

/** `specialChat` keys off `$`, then anything that is not `@`. */
const PREFIX = '$';

const BANKS: readonly QuickBank[] = ['fastchat_m', 'fastchat_f'];

/**
 * The reading a player's own general gives.
 *
 * `ChatBox.qml:85-89` and `AvatarChatBox.qml:236-241`, which are the same eight
 * lines twice: start at `fastchat_m`, and if the player has a general at all,
 * ask the engine for its gender and switch to `fastchat_f` unless it is
 * `General.Male` (`lua/lunarltk/core/general.lua:37` — the number 1). A seat
 * with no general yet, and every gender that is neither — 双性 and 无性 both
 * exist in the engine — take the male reading, because that is what the
 * `!== 1` in the QML does.
 */
export function quickBankFor(general: string, gender: number): QuickBank {
  return general && gender !== 1 ? 'fastchat_f' : 'fastchat_m';
}

export function encodeQuickChat(q: QuickChat): string {
  return `${PREFIX}${q.bank}:${q.idx}`;
}

/**
 * A chat line back into a quick chat, or null if it is something somebody said.
 *
 * Deliberately total, like `decodePresent`: this runs over every chat line the
 * room ever sees, including whatever a player types by hand. A player who types
 * `$fastchat_m:7` into the box does send one, which is also true upstream and
 * is not worth a defence — it is a line they could have picked anyway.
 */
export function decodeQuickChat(text: unknown): QuickChat | null {
  if (typeof text !== 'string' || !text.startsWith(PREFIX)) return null;
  const parts = text.slice(PREFIX.length).split(':');
  if (parts.length !== 2) return null;
  const bank = parts[0] as QuickBank;
  if (!BANKS.includes(bank)) return null;
  if (!/^\d{1,2}$/.test(parts[1])) return null;
  const idx = Number(parts[1]);
  return idx >= 1 && idx <= QUICK_CHAT_LINES ? { bank, idx } : null;
}

export function isQuickChatText(text: unknown): boolean {
  return decodeQuickChat(text) !== null;
}

/**
 * The i18n key for a line's text — `$fastchat_m7`.
 *
 * `RoomPage.qml:677` builds the same string to overwrite the chat row with, and
 * `ChatBox.qml:76` builds it to label the menu entry. One key, both surfaces.
 */
export function quickChatKey(q: QuickChat): string {
  return `${PREFIX}${q.bank}${q.idx}`;
}

/* --------------------------------------------------------------- the budget */

/* `chat/budget.ts` holds the bucket. These are how hard it is turned up for a
 * quick chat, and they are tighter than a present's because this one makes a
 * *noise*: a flower you can look away from. */

/**
 * `ChatBox.qml` gates its own send button behind a 1.5 s `opTimer`, so this is
 * upstream's number. Two back to back, because "哥们，给力点行吗？" followed by
 * "这波，不亏。" is one thought.
 */
export const QUICK_SEND_GAP_MS = 1500;
export const QUICK_SEND_BURST = 2;

/**
 * The receiving cap, per sender. Under the send limit on purpose — a lagging
 * round trip must not lose a legitimate line.
 *
 * IT BOUNDS THE LOG, NOT THE TEXT. A refused line still appears in the chat
 * panel and still surfaces over the speaker's seat: it was said, and hiding it
 * would be a second, invisible kind of censorship. What it loses is the voice,
 * because that is the part that takes the table's attention.
 */
export const QUICK_RECEIVE_GAP_MS = 1200;
export const QUICK_RECEIVE_BURST = 2;
