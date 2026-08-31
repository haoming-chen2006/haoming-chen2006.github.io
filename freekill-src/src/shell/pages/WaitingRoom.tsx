/**
 * The waiting room, against `contract/views.ts`'s `WaitingRoomViewProps`.
 *
 * Host-only actions arrive as undefined callbacks for non-hosts, and the rule
 * here is hide, not disable: a control a player can never use is noise, and a
 * disabled Start button invites them to keep clicking it.
 */
import { useState } from 'react';
import type { WaitingRoomViewProps } from '../../contract/views';
import { engineTr, useLanguage, useT } from '../../i18n';
import { useSession } from '../session';
import { generalAvatar } from '../boot';

export function WaitingRoomView(props: WaitingRoomViewProps) {
  const {
    joinCode, joinUrl, seats, capacity, settings, meId, isHost,
    onStart, onAddBot, onRemoveSeat, onLeave, onChat, chat,
  } = props;
  const t = useT();
  const lang = useLanguage();
  const { loaded } = useSession();
  // The mode is an engine key; the overview payload carries only the Chinese.
  const modeTitle = engineTr(String(settings.gameMode ?? ''), lang,
    (k) => loaded.overview.translations[k] ?? k);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [draft, setDraft] = useState('');

  const bySeat = new Map(seats.map((s) => [s.seat, s]));
  const humans = seats.filter((s) => !s.isBot);
  const everyoneReady = humans.every((s) => s.ready || s.playerId === meId);

  async function copy(what: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(what === 'code' ? joinCode : joinUrl);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* clipboard blocked — the text is on screen anyway */ }
  }

  return (
    <div className="page">
      <h2>{t('waiting.title')}</h2>
      <p className="lede">
        {modeTitle} · {t('waiting.seated', { seated: seats.length, capacity })}
        {isHost ? t('waiting.youAreHost') : ''}
      </p>

      <div className="sharebar">
        <span style={{ color: 'var(--paper-faint)', fontSize: 13 }}>{t('waiting.code')}</span>
        <code className="code-big">{joinCode}</code>
        <button className="btn small ghost" onClick={() => copy('code')}>
          {copied === 'code' ? t('waiting.copied') : t('waiting.copyCode')}
        </button>
        <code style={{ flex: 1 }}>{joinUrl}</code>
        <button className="btn small" onClick={() => copy('link')}>
          {copied === 'link' ? t('waiting.copied') : t('waiting.copyLink')}
        </button>
      </div>

      <div className="seats">
        {Array.from({ length: capacity }, (_, i) => i + 1).map((seat) => {
          const s = bySeat.get(seat);
          if (!s) {
            return (
              <div className="seat empty-seat" key={seat}>
                {onAddBot
                  ? <button className="btn small ghost" onClick={() => onAddBot(seat)}>{t('waiting.addBot')}</button>
                  : <span>{t('waiting.emptySeat', { seat })}</span>}
              </div>
            );
          }
          const src = generalAvatar(loaded, s.avatar || 'guojia');
          return (
            <div className={`seat${s.connection === 'online' ? '' : ' offline'}`} key={seat}>
              {src ? <img className="avatar" src={src} alt="" /> : <div className="avatar" />}
              <div style={{ minWidth: 0 }}>
                <div className="who-name">{s.displayName}</div>
                <div className="badges">
                  {s.isHost ? <span className="badge host">{t('waiting.badge.host')}</span> : null}
                  {s.isBot ? <span className="badge bot">{t('waiting.badge.bot')}</span> : null}
                  {s.ready && !s.isBot ? <span className="badge ready">{t('waiting.badge.ready')}</span> : null}
                  {s.connection === 'offline' ? <span className="badge">{t('waiting.badge.offline')}</span> : null}
                </div>
              </div>
              {onRemoveSeat && s.playerId !== meId
                ? <button className="btn small ghost" style={{ marginLeft: 'auto' }} onClick={() => onRemoveSeat(seat)}>{t('waiting.remove')}</button>
                : null}
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 22 }}>
        <button className="btn ghost" onClick={onLeave}>{t('waiting.leave')}</button>
        {onStart
          ? (
            <button className="btn primary" onClick={onStart} disabled={seats.length < 2}>
              {everyoneReady ? t('waiting.start') : t('waiting.startNotReady')}
            </button>
          )
          : <span style={{ color: 'var(--paper-faint)', fontSize: 13 }}>{t('waiting.waitForHost')}</span>}
      </div>

      <div className="card" style={{ marginTop: 26 }}>
        <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 10, fontSize: 13, lineHeight: 1.9 }}>
          {chat.length === 0
            ? <span style={{ color: 'var(--paper-faint)' }}>{t('waiting.noChat')}</span>
            : chat.map((c) => (
              <div key={c.id}>
                <span style={{ color: 'var(--gold)' }}>{c.displayName}</span>
                <span style={{ color: 'var(--paper-faint)' }}>{t('punct.nameSep')}</span>
                {c.text}
              </div>
            ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onChat(draft.trim()); setDraft(''); } }}
        >
          <input
            type="text"
            style={{ flex: 1 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('waiting.chatPlaceholder')}
            maxLength={120}
          />
          <button className="btn small" type="submit">{t('waiting.send')}</button>
        </form>
      </div>
    </div>
  );
}
