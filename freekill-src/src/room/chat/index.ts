/** Chat emoji. The wire format is `./emoji.ts`; the surfaces are the side
 *  panel's chat tab and the bubble over a seat.
 *
 *  Quick chats — the 23 canned lines — ride the same channel and are `./
 *  quickchat.ts`, with `./budget.ts` the rate limit both they and thrown
 *  flowers answer to. */
export { ChatText } from './ChatText';
export { ChatComposer, CHAT_MAX } from './ChatComposer';
export { ChatBudget } from './budget';
export { spokenChat } from './feed';
export { EmojiGrid, EmojiToggle } from './EmojiPicker';
export { QuickChatList, QuickChatToggle } from './QuickChatPicker';
export { useEmoji, type EmojiCatalogue } from './useEmoji';
export { useQuickLines, useQuickChatVoice, type QuickLine } from './useQuickChat';
export { emojiAssetKey, emojiToken, hasEmoji, insertToken, parseChat } from './emoji';
export {
  QUICK_CHAT_LINES, QUICK_RECEIVE_BURST, QUICK_RECEIVE_GAP_MS,
  QUICK_SEND_BURST, QUICK_SEND_GAP_MS,
  decodeQuickChat, encodeQuickChat, isQuickChatText, quickBankFor, quickChatKey,
} from './quickchat';
export type { QuickBank, QuickChat } from './quickchat';
export type { ChatSegment, EmojiResolver, Insertion } from './emoji';
