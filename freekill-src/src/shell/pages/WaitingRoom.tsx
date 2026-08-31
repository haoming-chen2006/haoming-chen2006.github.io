/**
 * The waiting room, against `contract/views.ts`'s `WaitingRoomViewProps`.
 *
 * Host-only actions arrive as undefined callbacks for non-hosts, and the rule
 * here is hide, not disable: a control a player can never use is noise, and a
 * disabled Start button invites them to keep clicking it.
 */
import { useState } from 'react';
import type { WaitingRoomViewProps } from '../../contract/views';
import { useSession } from '../session';
import { generalAvatar } from '../boot';

export function WaitingRoomView(props: WaitingRoomViewProps) {
  const {
    joinCode, joinUrl, seats, capacity, settings, meId, isHost,
    onStart, onAddBot, onRemoveSeat, onLeave, onChat, chat,
  } = props;
  const { loaded } = useSession();
  const modeTitle = loaded.overview.modes.find((m) => m.name === settings.gameMode)?.title
    ?? String(settings.gameMode ?? '');
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
      <h2>等待中</h2>
      <p className="lede">
        {modeTitle} · {seats.length}/{capacity} 就座
        {isHost ? ' · 你是房主' : ''}
      </p>

      <div className="sharebar">
        <span style={{ color: 'var(--paper-faint)', fontSize: 13 }}>房号</span>
        <code className="code-big">{joinCode}</code>
        <button className="btn small ghost" onClick={() => copy('code')}>
          {copied === 'code' ? '已复制' : '复制房号'}
        </button>
        <code style={{ flex: 1 }}>{joinUrl}</code>
        <button className="btn small" onClick={() => copy('link')}>
          {copied === 'link' ? '已复制' : '复制链接'}
        </button>
      </div>

      <div className="seats">
        {Array.from({ length: capacity }, (_, i) => i + 1).map((seat) => {
          const s = bySeat.get(seat);
          if (!s) {
            return (
              <div className="seat empty-seat" key={seat}>
                {onAddBot
                  ? <button className="btn small ghost" onClick={() => onAddBot(seat)}>＋ 机器人</button>
                  : <span>空位 {seat}</span>}
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
                  {s.isHost ? <span className="badge host">房主</span> : null}
                  {s.isBot ? <span className="badge bot">机器人</span> : null}
                  {s.ready && !s.isBot ? <span className="badge ready">准备</span> : null}
                  {s.connection === 'offline' ? <span className="badge">离线</span> : null}
                </div>
              </div>
              {onRemoveSeat && s.playerId !== meId
                ? <button className="btn small ghost" style={{ marginLeft: 'auto' }} onClick={() => onRemoveSeat(seat)}>移除</button>
                : null}
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 22 }}>
        <button className="btn ghost" onClick={onLeave}>离开房间</button>
        {onStart
          ? (
            <button className="btn primary" onClick={onStart} disabled={seats.length < 2}>
              {everyoneReady ? '开始游戏' : '开始游戏（有人未准备）'}
            </button>
          )
          : <span style={{ color: 'var(--paper-faint)', fontSize: 13 }}>等房主开始</span>}
      </div>

      <div className="card" style={{ marginTop: 26 }}>
        <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 10, fontSize: 13, lineHeight: 1.9 }}>
          {chat.length === 0
            ? <span style={{ color: 'var(--paper-faint)' }}>还没有人说话。</span>
            : chat.map((c) => (
              <div key={c.id}>
                <span style={{ color: 'var(--gold)' }}>{c.displayName}</span>
                <span style={{ color: 'var(--paper-faint)' }}>：</span>
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
            placeholder="说点什么"
            maxLength={120}
          />
          <button className="btn small" type="submit">发送</button>
        </form>
      </div>
    </div>
  );
}
