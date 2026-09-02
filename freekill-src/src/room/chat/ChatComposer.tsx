/**
 * The message box: the draft, the emoji grid, and the send button.
 *
 * `Fk/Components/Common/ChatBox.qml`'s bottom `RowLayout` plus the grid above
 * it. Split out of `SidePanel` for two reasons, both about the caret.
 *
 * IT MUST NOT RE-RENDER WITH THE PANEL. The table commits about five times a
 * second on `refreshStatusSkills` whether or not the game moved, and `SidePanel`
 * re-renders on every one of them because it draws the log. Re-rendering a
 * focused, controlled `<input>` at 5 Hz for the rest of the game is work nobody
 * asked for, next to a caret nobody wants disturbed. Every prop below is stable
 * across a commit — `ids` and `resolve` are memoised on the asset manifest,
 * `onSend` is held in a ref by the panel, `placeholder` changes only with the
 * language — so `memo` bails out and React touches the input only when the
 * draft itself changes.
 *
 * PUTTING THE CARET BACK, EXACTLY ONCE. `ChatBox.qml` inserts at
 * `chatEdit.cursorPosition`, so the web version has to restore the caret after
 * React writes the new value. The first cut did that in a `requestAnimationFrame`
 * and it was measurably wrong: instrumenting the input in a real game caught the
 * frame from one pick landing *after* the next thing the player did, replaying a
 * stale `setSelectionRange(8, 8)` onto a two-character draft and clamping it to
 * the end. A layout effect keyed on the draft runs synchronously in the commit
 * that carries the new value, so there is no window for anything to get between
 * them and no frame to arrive late.
 */
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatBudget } from './budget';
import { insertToken, type EmojiResolver } from './emoji';
import { EmojiGrid, EmojiToggle } from './EmojiPicker';
import { QuickChatList, QuickChatToggle } from './QuickChatPicker';
import { QUICK_SEND_BURST, QUICK_SEND_GAP_MS } from './quickchat';
import type { QuickLine } from './useQuickChat';
import './chat.css';

/** `ChatBox.qml`'s `maximumLength: 300`. */
export const CHAT_MAX = 300;

/** Which picker is open above the input. `ChatBox.qml` closes each when the
 *  other opens, because they are the same slot in the same column. */
type Picker = 'none' | 'emoji' | 'quick';

export interface ChatComposerProps {
  readonly ids: readonly string[];
  readonly resolve: EmojiResolver;
  /** Stable across renders, or the memo below stops working. */
  readonly onSend: (text: string) => void;
  readonly placeholder: string;
  /** The 23 canned lines as the viewer's own general says them. Empty in a
   *  build whose i18n has none, which removes the button. See `useQuickLines`. */
  readonly quick: readonly QuickLine[];
  /** The engine's own word for them: 快捷短语 / "quick chats". */
  readonly quickLabel: string;
}

export const ChatComposer = memo(function ChatComposer(props: ChatComposerProps) {
  const { ids, resolve, onSend, placeholder, quick, quickLabel } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState<Picker>('none');
  /** Where the caret goes once the draft this render carries is on screen. */
  const pendingCaret = useRef<number | null>(null);

  /**
   * The send-side limit on quick chats, which is manners rather than defence:
   * it is `ChatBox.qml`'s own 1.5 s `opTimer`, and like it, all it does is grey
   * the button out so a player can see they are going too fast. The limit that
   * has to hold is in `useQuickChatVoice`, on every receiver.
   */
  const outgoing = useRef(new ChatBudget(QUICK_SEND_GAP_MS, QUICK_SEND_BURST));
  const [cooling, setCooling] = useState(false);
  const coolTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (coolTimer.current) clearTimeout(coolTimer.current); }, []);

  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    if (caret == null) return;
    pendingCaret.current = null;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(caret, caret);
  }, [draft]);

  const insert = (token: string): void => {
    const el = inputRef.current;
    const at = el?.selectionStart ?? draft.length;
    const to = el?.selectionEnd ?? at;
    const next = insertToken(draft, token, at, to, CHAT_MAX);
    if (next.text === draft) return; // no room left; leave the caret alone
    pendingCaret.current = next.caret;
    setDraft(next.text);
    setPicking('none');
  };

  /** A quick line is not inserted into the draft — it *is* the message. */
  const say = (token: string): void => {
    if (!outgoing.current.take('me', Date.now())) return;
    onSend(token);
    setPicking('none');
    const wait = outgoing.current.waitMs('me', Date.now());
    if (wait <= 0) return;
    setCooling(true);
    if (coolTimer.current) clearTimeout(coolTimer.current);
    coolTimer.current = setTimeout(() => { coolTimer.current = null; setCooling(false); }, wait);
  };

  return (
    <>
      {/* Above the input, inside the panel — `ChatBox.qml`'s own placement. */}
      {picking === 'emoji' ? <EmojiGrid ids={ids} resolve={resolve} onPick={insert} /> : null}
      {picking === 'quick' ? <QuickChatList lines={quick} onPick={say} /> : null}

      <form
        className="fk-chat__input"
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          onSend(t);
          setDraft('');
          setPicking('none');
        }}
        onKeyDown={(e) => { if (e.key === 'Escape') setPicking('none'); }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          maxLength={CHAT_MAX}
        />
        {quick.length ? (
          <QuickChatToggle
            label={quickLabel}
            open={picking === 'quick'}
            disabled={cooling}
            onToggle={() => setPicking((v) => (v === 'quick' ? 'none' : 'quick'))}
          />
        ) : null}
        <EmojiToggle
          ids={ids}
          open={picking === 'emoji'}
          onToggle={() => setPicking((v) => (v === 'emoji' ? 'none' : 'emoji'))}
        />
        <button type="submit" className="fk-btn" aria-label="send">➤</button>
      </form>
    </>
  );
});
