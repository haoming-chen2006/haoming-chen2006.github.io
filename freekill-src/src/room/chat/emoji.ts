/**
 * Chat emoji: the engine's wire format, adopted rather than invented.
 *
 * An emoji is not a message type. It is a token inside the text of an ordinary
 * chat message, and that is the whole protocol. `Fk/Components/Common/ChatBox.qml`
 * writes one from a grid of 59 cells —
 *
 *   onClicked: chatEdit.insert(chatEdit.cursorPosition, "{emoji" + index + "}")
 *
 * — and `Fk/Pages/Common/RoomPage.qml:691` reads it back on the way into the log:
 *
 *   msg = msg.replace(/\{emoji([0-9]+)\}/g,
 *     `<img src="${Cpp.path}/image/emoji/$1.png" height="16" width="16" />`);
 *
 * So a token survives every hop that text survives — no new envelope, no schema
 * change, nothing for the transport or the host to know about. The artwork is
 * `image/emoji/0.png` … `58.png` in the engine checkout, which the asset
 * pipeline already content-hashes into the manifest like every other picture.
 *
 * TWO THINGS THIS DELIBERATELY DOES NOT DO.
 *
 * It does not parse the number. Qt substitutes `$1` — the matched digits —
 * straight into the path, so `{emoji007}` asks for `007.png`, not `7.png`. We
 * keep the digits verbatim for the same reason: the id is a filename, and
 * normalising it would silently answer a question the sender did not ask.
 *
 * It does not build HTML. Qt can afford to substitute an `<img>` into the string
 * because its chat log is a rich-text control. Here that string would have to
 * reach `dangerouslySetInnerHTML` — and chat is the one surface in the room
 * whose bytes are typed by another player, rather than rendered by the engine
 * as the game log is. So `parseChat` returns segments and React renders them:
 * a message containing `<script>` is a message containing those characters.
 */

/** The engine's token, verbatim from `RoomPage.qml`. */
const TOKEN_SOURCE = '\\{emoji([0-9]+)\\}';

/** A run of plain text, or one emoji token, in the order they were typed. */
export type ChatSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'emoji'; readonly id: string; readonly token: string };

/** Emoji id -> a URL for its artwork, or `undefined` when this build has none. */
export type EmojiResolver = (id: string) => string | undefined;

/** The manifest key for an emoji's artwork. The engine's path, not ours. */
export function emojiAssetKey(id: string | number): string {
  return `image/emoji/${id}.png`;
}

/** The wire form of an emoji, as `ChatBox.qml` writes it. */
export function emojiToken(id: string | number): string {
  return `{emoji${id}}`;
}

/**
 * Split a chat message into text and emoji tokens.
 *
 * Total: concatenating every segment's source reproduces the input exactly,
 * which is what lets an unrecognised token fall back to its own literal text
 * without the renderer having to reconstruct it.
 */
export function parseChat(text: string): readonly ChatSegment[] {
  // A fresh regex per call: a module-level `/g` carries `lastIndex` between
  // calls, and this runs once per chat line per render.
  const re = new RegExp(TOKEN_SOURCE, 'g');
  const out: ChatSegment[] = [];
  let at = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > at) out.push({ kind: 'text', text: text.slice(at, m.index) });
    out.push({ kind: 'emoji', id: m[1], token: m[0] });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ kind: 'text', text: text.slice(at) });
  if (!out.length) out.push({ kind: 'text', text: '' });
  return out;
}

/** Whether a message carries any emoji token at all. */
export function hasEmoji(text: string): boolean {
  return new RegExp(TOKEN_SOURCE).test(text);
}

export interface Insertion {
  readonly text: string;
  /** Where the caret belongs afterwards — just past what was inserted. */
  readonly caret: number;
}

/**
 * Insert a token into a draft at the caret, replacing any selection.
 *
 * `ChatBox.qml` does `chatEdit.insert(chatEdit.cursorPosition, …)` and lets the
 * control's `maximumLength: 300` clip whatever overflows. Clipping a token
 * leaves `{emo` in the message, so this refuses the insert instead: a draft
 * with no room for an emoji keeps the words the player typed.
 */
export function insertToken(
  draft: string,
  token: string,
  start: number,
  end: number,
  maxLength: number,
): Insertion {
  const from = clamp(start, 0, draft.length);
  const to = clamp(Math.max(start, end), from, draft.length);
  const next = draft.slice(0, from) + token + draft.slice(to);
  if (next.length > maxLength) return { text: draft, caret: to };
  return { text: next, caret: from + token.length };
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
