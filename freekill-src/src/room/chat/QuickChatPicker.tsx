/**
 * The quick-chat menu: a list of the 23 canned lines, and the button that
 * opens it.
 *
 * `Fk/Components/Common/ChatBox.qml:129-146` puts a 🗨️ button beside the emoji
 * one and toggles a 180 px scrolling `ListView` above the input — a sibling in
 * the same `ColumnLayout`. This is deliberately the same shape as `EmojiGrid`
 * next door, and for the same reason its header gives at length: a block in the
 * chat column has no geometry to get wrong, cannot reach the table, cannot leave
 * the viewport, and needs no portal, no backdrop and no document listener that
 * could swallow a click meant for a card.
 *
 * WHERE THE TEXT COMES FROM. Nowhere here. `useQuickLines` reads it out of the
 * engine's own translation table, so the menu reads 能不能快一点啊，兵贵神速啊。in
 * both languages because that is what `packages/standard/i18n/en_US.lua:162`
 * actually says.
 *
 * WHY THE BUTTON IS NOT JUST A GLYPH. The emoji toggle can be a bare 😃 because
 * everybody already knows what an emoji button does. Nobody knows what 🗨️ does,
 * and this project has now twice shipped a working feature whose only entry
 * point was a small unlabelled control that the person who asked for it could
 * not find. So it carries the engine's own word for these — 快捷短语 in Chinese,
 * "quick chats" in English, `fastchat_m` in the i18n table — and it is a word,
 * not a picture.
 */
import type { MouseEvent } from 'react';
import type { QuickLine } from './useQuickChat';
import './chat.css';

/** Decline the focus this press would otherwise take from the message input. */
const keepFocus = (e: MouseEvent) => e.preventDefault();

/** The list. Render it above the message input; nothing when it is closed. */
export function QuickChatList(
  { lines, onPick }: { lines: readonly QuickLine[]; onPick: (token: string) => void },
) {
  if (!lines.length) return null;
  return (
    <div className="fk-quick-list" role="menu">
      {lines.map((line) => (
        <button
          type="button"
          key={line.idx}
          className="fk-quick-list__row"
          role="menuitem"
          onMouseDown={keepFocus}
          onClick={() => onPick(line.token)}
        >
          {line.text}
        </button>
      ))}
    </div>
  );
}

/** The button. A build with no quick lines translated gets no button at all. */
export function QuickChatToggle(
  { label, open, disabled, onToggle }:
  { label: string; open: boolean; disabled: boolean; onToggle: () => void },
) {
  return (
    <button
      type="button"
      className="fk-btn fk-quick-toggle"
      aria-expanded={open}
      disabled={disabled}
      title={label}
      onMouseDown={keepFocus}
      onClick={onToggle}
    >
      <span aria-hidden="true">🗨️</span>
      <span className="fk-quick-toggle__label">{label}</span>
    </button>
  );
}
