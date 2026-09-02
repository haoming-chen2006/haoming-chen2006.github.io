/**
 * The rolling game log and the chat box.
 *
 * `Fk/Components/Common/LogEdit.qml` and `ChatBox.qml`. The log's colour markup
 * is produced by the engine (`Client:appendLog` -> `GameLog`) and only needs to
 * be shown; the chat is a plain list plus an input, with bubbles surfacing over
 * the speaker's seat (see `Photo`'s `bubble` prop).
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { ChatLine } from '../../contract/views';
import { useLanguage } from '../../i18n';
import type { Language } from '../../i18n';
import { localize } from '../../i18n/localized';
import type { RoomState } from '../state/types';
import { ChatComposer, ChatText, useEmoji } from '../chat';
import { useRoom, useRoomState } from '../RoomContext';
import { cls } from './CardItem';
import { sanitizeMarkup } from './markup';

/**
 * The scrollback, sanitised once per line rather than once per line per line.
 *
 * THE MOST EXPENSIVE THING IN THE ROOM, and it was hidden behind an innocent
 * `map`. `sanitizeMarkup` is not a string function: it builds a `<template>`,
 * assigns `innerHTML` — a full HTML parse — walks the tree against a tag
 * allowlist, and reads `innerHTML` back out, which serialises it again. That is
 * the right way to sanitise engine markup that carries player screen names, and
 * it costs what a parse costs.
 *
 * It was being run over the WHOLE scrollback every time one line was appended.
 * `RoomStore` caps the log at 600 lines, so a talkative game — 6,002 `GameLog`
 * messages across two audited games, a general whose triggers cascade — asked
 * for three and a half million parses. That is not a slow render, it is
 * quadratic: the audit caught it as a single 16.9-second freeze on the seat
 * running the engine, and every other explanation was the wrong one, because
 * the browser reports no long task for it — React's scheduler spreads the work
 * over thousands of short tasks and only a starved timer ever sees it.
 *
 * A line's markup never changes once the engine has sent it, so it is parsed
 * once and the `<p>` is kept. The cache is dropped wholesale on a language
 * change, because the engine rendered every line in both and a toggle
 * retranslates the entire scrollback rather than only what comes next.
 */
export function foldLog(
  held: Map<number, ReactElement>,
  log: RoomState['log'],
  lang: Language,
): readonly ReactElement[] {
  const out: ReactElement[] = [];
  for (const l of log) {
    let el = held.get(l.id);
    if (!el) {
      el = <p key={l.id} dangerouslySetInnerHTML={{ __html: sanitizeMarkup(localize(l.html, lang)) }} />;
      held.set(l.id, el);
    }
    out.push(el);
  }
  // The store drops from the front at 600; drop with it, or a long game leaves
  // every line it ever showed in here. Ids are monotonic, so the survivors are
  // always a suffix and the ones to forget are always at the head.
  if (held.size > log.length) {
    const live = new Set(log.map((l) => l.id));
    for (const id of held.keys()) if (!live.has(id)) held.delete(id);
  }
  return out;
}

/** `foldLog` against a cache that lives as long as the panel does. Folded during
 *  render rather than in an effect, exactly as `usePlayMemory` folds the table:
 *  an effect would publish the new line a frame late. */
function useLogLines(log: RoomState['log'], lang: Language): readonly ReactElement[] {
  const cache = useRef(new Map<number, ReactElement>());
  const cachedLang = useRef(lang);
  if (cachedLang.current !== lang) {
    cachedLang.current = lang;
    cache.current.clear();
  }
  return foldLog(cache.current, log, lang);
}

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

  const lines = useLogLines(state.log, lang);

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
          {lines}
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
