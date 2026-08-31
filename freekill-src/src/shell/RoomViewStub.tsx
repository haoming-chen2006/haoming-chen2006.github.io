/**
 * The stand-in for Agent 3's `<RoomView>`.
 *
 * It takes the real `RoomViewProps` and subscribes to the real `LuaClient`, so
 * when the room lane lands there is nothing to change here or there — the glob
 * in RoomPage picks the real component up and this file stops being reached.
 * Until then it shows the seats and the live `notifyUI` stream, which is enough
 * to prove the wiring is correct rather than merely present.
 */
import { useEffect, useRef, useState } from 'react';
import type { RoomViewProps } from '../contract/views';
import { useT } from '../i18n';

interface Line { seq: number; command: string; data: string; }

export function RoomViewStub(props: RoomViewProps) {
  const t = useT();
  const { seats, meId, client, onLeave, statusSlot, chat, onChat } = props;
  const [lines, setLines] = useState<Line[]>([]);
  const seq = useRef(0);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!client) return;
    return client.onNotifyUI((command, data) => {
      setLines((prev) => {
        const next = [...prev, {
          seq: ++seq.current,
          command: String(command),
          data: JSON.stringify(data ?? null).slice(0, 160),
        }];
        return next.slice(-200);
      });
    });
  }, [client]);

  return (
    <div className="page room-stub">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{t('stub.title')}</h2>
        <div className="row" style={{ gap: 12 }}>
          {statusSlot}
          <button className="btn small ghost" onClick={onLeave}>{t('stub.leave')}</button>
        </div>
      </div>
      <p className="lede">
        {t('stub.lede.1')}<code>contract/views.ts</code>{t('stub.lede.2')}
      </p>

      <div className="seats">
        {seats.map((s) => (
          <div className={`seat${s.playerId === meId ? '' : ''}`} key={s.seat}>
            <div className="avatar" />
            <div>
              <div className="who-name">{s.displayName}</div>
              <div className="badges">
                <span className="badge">{t('stub.seat', { seat: s.seat })}</span>
                {s.isHost ? <span className="badge host">{t('waiting.badge.host')}</span> : null}
                {s.isBot ? <span className="badge bot">{t('waiting.badge.bot')}</span> : null}
                {s.playerId === meId ? <span className="badge ready">{t('waiting.badge.you')}</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="stream">
        {lines.length === 0
          ? t('stub.noCommands')
          : lines.map((l) => (
            <div key={l.seq}><b>{l.command}</b> {l.data}</div>
          ))}
      </div>

      <form
        className="row"
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onChat(draft.trim()); setDraft(''); } }}
      >
        <input type="text" style={{ flex: 1 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('stub.chatPlaceholder')} />
        <button className="btn small" type="submit">{t('stub.send')}</button>
      </form>
      <div style={{ fontSize: 13, color: 'var(--paper-faint)' }}>
        {chat.map((c) => <div key={c.id}>{c.displayName}{t('punct.nameSep')}{c.text}</div>)}
      </div>
    </div>
  );
}
