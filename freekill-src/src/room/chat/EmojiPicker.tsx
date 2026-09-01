/**
 * The emoji picker: a grid inside the chat panel, and the button that opens it.
 *
 * `Fk/Components/Common/ChatBox.qml` puts a 😃 button beside the send button and
 * toggles a 59-cell grid above the input — a sibling in the `ColumnLayout`, not
 * a floating layer. This is the same shape, deliberately, and the deliberation
 * cost a rewrite: the first version floated the grid over the chat scrollback so
 * the log would not reflow, and the first real table it was measured on put it
 * 50 px left of the panel, over the card ring, with its top 58 px above the
 * viewport. The panel is `top: 8px` with an auto height, so a chat box with few
 * lines in it is short and there is simply nothing above the input to float
 * into.
 *
 * In the flow there is no geometry to get wrong. The grid is a block in a
 * column that is already inside the side panel, so it cannot reach the table,
 * cannot leave the viewport, and needs no portal, no backdrop and no document
 * listener — nothing that could swallow a click meant for a card. It makes the
 * log shorter while it is open, which is what the QML does and what the log's
 * own `overflow-y: auto` is for.
 *
 * Open state lives in the panel because the two halves live in different parents
 * — the grid above the form, the button inside it.
 *
 * WHY BOTH BUTTONS REFUSE FOCUS. `ChatBox.qml` inserts at `chatEdit.cursorPosition`,
 * and the web equivalent reads `input.selectionStart` — so the message box wants
 * to keep both the focus and the caret while the player browses pictures.
 * Measured in a real game, pressing the toggle moved `document.activeElement`
 * off the input and onto the button; declining the mousedown default leaves it
 * where it was, which also means the player can carry straight on typing after
 * picking. It suppresses nothing but this button's own focus transfer — the
 * click still fires, and no event belonging to anything else is touched.
 *
 * The button face is the Unicode character, exactly as the QML button is: no
 * artwork, no asset lookup, and no translation to invent. A screen reader names
 * it in the reader's own locale, which is more than any string we could add here
 * would manage, since the engine's tables have no key for "emoji".
 */
import type { MouseEvent } from 'react';
import { emojiToken, type EmojiResolver } from './emoji';
import './chat.css';

/** Decline the focus this press would otherwise take from the message input. */
const keepFocus = (e: MouseEvent) => e.preventDefault();

export interface EmojiPickerProps {
  /** Every emoji this build shipped, in the engine's numeric order. */
  ids: readonly string[];
  resolve: EmojiResolver;
}

/** The grid. Render it above the message input; nothing when it is closed. */
export function EmojiGrid(
  { ids, resolve, onPick }: EmojiPickerProps & { onPick: (token: string) => void },
) {
  if (!ids.length) return null;
  return (
    <div className="fk-emoji-grid">
      {ids.map((id) => {
        const token = emojiToken(id);
        return (
          <button
            type="button"
            key={id}
            className="fk-emoji-grid__cell"
            aria-label={token}
            onMouseDown={keepFocus}
            onClick={() => onPick(token)}
          >
            <img className="fk-emoji" src={resolve(id)} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}

/** The button. A build whose manifest carries no emoji gets no button at all. */
export function EmojiToggle(
  { ids, open, onToggle }: { ids: readonly string[]; open: boolean; onToggle: () => void },
) {
  if (!ids.length) return null;
  return (
    <button
      type="button"
      className="fk-btn fk-emoji-toggle"
      aria-expanded={open}
      onMouseDown={keepFocus}
      onClick={onToggle}
    >
      😃
    </button>
  );
}
