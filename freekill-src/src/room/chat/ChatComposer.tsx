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
import { memo, useLayoutEffect, useRef, useState } from 'react';
import { insertToken, type EmojiResolver } from './emoji';
import { EmojiGrid, EmojiToggle } from './EmojiPicker';
import './chat.css';

/** `ChatBox.qml`'s `maximumLength: 300`. */
export const CHAT_MAX = 300;

export interface ChatComposerProps {
  readonly ids: readonly string[];
  readonly resolve: EmojiResolver;
  /** Stable across renders, or the memo below stops working. */
  readonly onSend: (text: string) => void;
  readonly placeholder: string;
}

export const ChatComposer = memo(function ChatComposer(props: ChatComposerProps) {
  const { ids, resolve, onSend, placeholder } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState(false);
  /** Where the caret goes once the draft this render carries is on screen. */
  const pendingCaret = useRef<number | null>(null);

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
    setPicking(false);
  };

  return (
    <>
      {/* Above the input, inside the panel — `ChatBox.qml`'s own placement. */}
      {picking ? <EmojiGrid ids={ids} resolve={resolve} onPick={insert} /> : null}

      <form
        className="fk-chat__input"
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          onSend(t);
          setDraft('');
          setPicking(false);
        }}
        onKeyDown={(e) => { if (e.key === 'Escape') setPicking(false); }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          maxLength={CHAT_MAX}
        />
        <EmojiToggle ids={ids} open={picking} onToggle={() => setPicking((v) => !v)} />
        <button type="submit" className="fk-btn" aria-label="send">➤</button>
      </form>
    </>
  );
});
