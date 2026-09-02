/**
 * The chat feed as the table should read it.
 *
 * TWO FEATURES RIDE THE CHAT CHANNEL and the raw feed therefore carries strings
 * that are not sentences. `Fk/Pages/Common/RoomPage.qml:695-700` does this same
 * job in one place for the same reason — any chat line beginning `$` goes to
 * `specialChat` before it can be appended — and the two outcomes there are the
 * two outcomes here:
 *
 *   a present   `$@Flower:5:2` is dropped. Its whole appearance is the arc
 *               `Presents.tsx` draws, off the raw feed, which is why that
 *               component is handed the unfiltered list.
 *   a quick chat `$fastchat_m7` is kept, rewritten to the sentence the engine's
 *               own i18n has for it. It *is* something a player said; the token
 *               is only how it travelled.
 *
 * Doing both here, once, is what lets the log and the bubble over the seat show
 * the real words with no knowledge of either format.
 *
 * The identity of the array matters — `RoomView` memoises on it and the bubbles
 * are derived from it — so a feed with nothing special in it is returned as
 * itself rather than as a fresh copy.
 */
import type { ChatLine } from '../../contract/views';
import { isPresentText } from '../components/present';
import { decodeQuickChat, quickChatKey } from './quickchat';

export function spokenChat(
  chat: readonly ChatLine[],
  tr: (key: string) => string,
): readonly ChatLine[] {
  let special = false;
  for (const line of chat) {
    if (typeof line.text === 'string' && line.text.startsWith('$')) { special = true; break; }
  }
  if (!special) return chat;

  const out: ChatLine[] = [];
  for (const line of chat) {
    if (isPresentText(line.text)) continue;
    const quick = decodeQuickChat(line.text);
    out.push(quick ? { ...line, text: tr(quickChatKey(quick)) } : line);
  }
  return out;
}
