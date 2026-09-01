/**
 * The rolling game log and the chat box.
 *
 * `Fk/Components/Common/LogEdit.qml` and `ChatBox.qml`. The log's colour markup
 * is produced by the engine (`Client:appendLog` -> `GameLog`) and only needs to
 * be shown; the chat is a plain list plus an input, with bubbles surfacing over
 * the speaker's seat (see `Photo`'s `bubble` prop).
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatLine } from '../../contract/views';
import { useLanguage } from '../../i18n';
import { localize } from '../../i18n/localized';
import { ChatComposer, ChatText, useEmoji } from '../chat';
import { useRoom, useRoomState } from '../RoomContext';
import { cls } from './CardItem';
import { sanitizeMarkup } from './markup';

export const SidePanel = memo(function SidePanel(
  { chat, onChat }: { chat: readonly ChatLine[]; onChat: (t: string) => void },
) {
  const state = useRoomState();
  const { lua } = useRoom();
  const lang = useLanguage();
  const [tab, setTab] = useState<'log' | 'chat'>('log');
  const logRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const emoji = useEmoji();

  useEffect(() => {
    const el = tab === 'log' ? logRef.current : chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length, chat.length, tab]);

  // The message box must not re-render with the panel — see `ChatComposer`.
  // `onChat` is a fresh closure on every render of the room, so it is held in a
  // ref and handed over as one stable function.
  const sendRef = useRef(onChat);
  useEffect(() => { sendRef.current = onChat; });
  const send = useCallback((t: string) => sendRef.current(t), []);

  // Keyed on the language too: the engine rendered every line in both, so a
  // toggle retranslates the whole scrollback rather than only what comes next.
  const lines = useMemo(
    () => state.log.map((l) => ({ id: l.id, html: sanitizeMarkup(localize(l.html, lang)) })),
    [state.log, lang],
  );

  return (
    <div className="fk-side">
      <div className="fk-side__tabs">
        <button type="button" className={cls('fk-side__tab', tab === 'log' && 'fk-side__tab--on')} onClick={() => setTab('log')}>
          {lua.tr('Log')} ({state.log.length})
        </button>
        <button type="button" className={cls('fk-side__tab', tab === 'chat' && 'fk-side__tab--on')} onClick={() => setTab('chat')}>
          {lua.tr('Chat')} ({chat.length})
        </button>
      </div>

      {tab === 'log' ? (
        <div className="fk-log" ref={logRef}>
          {lines.map((l) => <p key={l.id} dangerouslySetInnerHTML={{ __html: l.html }} />)}
        </div>
      ) : (
        <div className="fk-log fk-chat">
          <div className="fk-chat__lines" ref={chatRef}>
            {chat.map((c) => (
              <div className="fk-chat__line" key={c.id}>
                <span className="fk-chat__who">{c.displayName}</span>
                <ChatText text={c.text} resolve={emoji.resolve} />
              </div>
            ))}
          </div>

          <ChatComposer
            ids={emoji.ids}
            resolve={emoji.resolve}
            onSend={send}
            placeholder={lua.tr('Chat')}
          />
        </div>
      )}
    </div>
  );
});
