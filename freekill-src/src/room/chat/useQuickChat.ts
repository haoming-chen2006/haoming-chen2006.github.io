/**
 * The two halves of a quick chat that need the live room.
 *
 *   `useQuickLines`      what the viewer's own character can say, and how a pick
 *                        goes onto the wire.
 *   `useQuickChatVoice`  what the table hears when anybody says one.
 *
 * `quickchat.ts` is the format and holds no state; this is where it meets the
 * room. They are separate hooks because they are used in different places — the
 * menu lives in the side panel, and the voice has to be listening whether or not
 * the panel is on the chat tab.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { ChatLine } from '../../contract/views';
import { useLanguage } from '../../i18n';
import { roomAudio } from '../audio';
import { useRoom, useRoomState } from '../RoomContext';
import { ChatBudget } from './budget';
import {
  QUICK_CHAT_LINES, QUICK_RECEIVE_BURST, QUICK_RECEIVE_GAP_MS,
  decodeQuickChat, encodeQuickChat, quickBankFor, quickChatKey,
} from './quickchat';

/** One row of the menu: what it says, and what picking it sends. */
export interface QuickLine {
  /** 1-based, the engine's own numbering. */
  readonly idx: number;
  /** The translated sentence, from the engine's i18n table. */
  readonly text: string;
  /** The chat message a pick sends — `$fastchat_f7`. */
  readonly token: string;
}

/**
 * The 23 lines as the viewer's own general would say them.
 *
 * THE READING IS CHOSEN HERE AND NOWHERE ELSE, exactly where `ChatBox.qml:85-89`
 * chooses it: off the player's own general, once, at pick time. The bank then
 * travels in the message, so every receiver plays the take the speaker chose
 * rather than re-deriving it from a seat that may not have reached them yet.
 *
 * Memoised on the general and the language, because those are the only two
 * things that can change the answer — and the side panel this feeds re-renders
 * about five times a second whether or not the game moved, while 23 `tr` calls
 * plus a `GetGeneralData` are a round trip into the Lua VM each.
 */
export function useQuickLines(): readonly QuickLine[] {
  const { lua } = useRoom();
  const state = useRoomState();
  const lang = useLanguage();
  const general = state.selfId == null ? '' : state.players[state.selfId]?.general ?? '';

  return useMemo(() => {
    // `GetGeneralDetail`, not `GetGeneralData`: gender is only on the detail
    // (`client_util.lua:38`), which is also the call `ChatBox.qml:86` makes.
    // Once per general per language, so its cost does not matter.
    const gender = general ? lua.getGeneralDetail(general)?.gender ?? 0 : 0;
    const bank = quickBankFor(general, gender);
    const out: QuickLine[] = [];
    for (let idx = 1; idx <= QUICK_CHAT_LINES; idx += 1) {
      const q = { bank, idx } as const;
      const key = quickChatKey(q);
      const text = lua.tr(key);
      // `Fk:translate` answers with the key itself when a package did not
      // translate it. A row reading "$fastchat_m7" is worse than no row.
      if (text && text !== key) out.push({ idx, text, token: encodeQuickChat(q) });
    }
    return out;
    // `lang` is a dependency even though it is not read: `lua.tr` answers in
    // whichever language the room is in, and the whole menu retranslates.
  }, [lua, general, lang]);
}

/**
 * Play the quick chats that arrive, and refuse to let one person own the room.
 *
 * The same shape as `Presents`' receive path, for the same reason: this runs
 * over the raw chat feed, the feed is a relay the server does not understand,
 * and a client that ignores its own send limit can put a hundred lines a second
 * on it. Two independent things bound that.
 *
 *   here          one line per sender per `QUICK_RECEIVE_GAP_MS`. Costs a map
 *                 lookup and drops the rest before they reach the mixer.
 *   the mixer     `RANK_ORDER.chat` is below every rank the game itself uses and
 *                 `claim` only yields to a strictly higher one, so however many
 *                 get through here, at most one is ever audible and none of them
 *                 can talk over a general.
 *
 * Neither touches the text. A dropped line is still in the chat panel and still
 * surfaces over its speaker's seat; what it loses is the shout.
 */
export function useQuickChatVoice(chat: readonly ChatLine[]): void {
  const { store } = useRoom();
  /** Every chat id already looked at. Seeded from what was on screen at mount,
   *  so joining part-way through does not replay an hour of other people's
   *  jokes at you — `Presents` seeds the same way and for the same reason. */
  const seen = useRef<Set<string> | null>(null);
  const incoming = useRef(new ChatBudget(QUICK_RECEIVE_GAP_MS, QUICK_RECEIVE_BURST));

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(chat.map((c) => c.id));
      return;
    }
    const known = seen.current;
    const now = Date.now();
    for (const line of chat) {
      if (known.has(line.id)) continue;
      known.add(line.id);
      const q = decodeQuickChat(line.text);
      if (!q) continue;
      // The identity that spends the budget is the chat row's name, because
      // that is the field the server wrote. Anything inside the message is the
      // sender's own word for who they are.
      if (!incoming.current.take(line.displayName || String(line.playerId), now)) continue;
      const general = line.playerId == null
        ? ''
        : store.state.players[line.playerId]?.general ?? '';
      roomAudio.notify('QuickChat', { bank: q.bank, idx: q.idx, general });
    }
    // The set grows by one per chat line and a room keeps 80; this is a lifetime
    // of the room, not of the game, so it is trimmed rather than kept.
    if (known.size > 400) seen.current = new Set(chat.map((c) => c.id));
  }, [chat, store]);
}
