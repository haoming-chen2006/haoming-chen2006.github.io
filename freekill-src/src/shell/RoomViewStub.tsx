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

interface Line { seq: number; command: string; data: string; }

export function RoomViewStub(props: RoomViewProps) {
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
        <h2 style={{ margin: 0 }}>牌桌（占位）</h2>
        <div className="row" style={{ gap: 12 }}>
          {statusSlot}
          <button className="btn small ghost" onClick={onLeave}>离开</button>
        </div>
      </div>
      <p className="lede">
        真正的牌桌由 Agent 3 提供，接口是 <code>contract/views.ts</code> 的 <code>RoomViewProps</code>。
        这里显示的是这间房实际收到的 <code>notifyUI</code> 命令流。
      </p>

      <div className="seats">
        {seats.map((s) => (
          <div className={`seat${s.playerId === meId ? '' : ''}`} key={s.seat}>
            <div className="avatar" />
            <div>
              <div className="who-name">{s.displayName}</div>
              <div className="badges">
                <span className="badge">座位 {s.seat}</span>
                {s.isHost ? <span className="badge host">房主</span> : null}
                {s.isBot ? <span className="badge bot">机器人</span> : null}
                {s.playerId === meId ? <span className="badge ready">你</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="stream">
        {lines.length === 0
          ? '（还没有命令。引擎接上之后这里会滚动。）'
          : lines.map((l) => (
            <div key={l.seq}><b>{l.command}</b> {l.data}</div>
          ))}
      </div>

      <form
        className="row"
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onChat(draft.trim()); setDraft(''); } }}
      >
        <input type="text" style={{ flex: 1 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="聊天" />
        <button className="btn small" type="submit">发送</button>
      </form>
      <div style={{ fontSize: 13, color: 'var(--paper-faint)' }}>
        {chat.map((c) => <div key={c.id}>{c.displayName}：{c.text}</div>)}
      </div>
    </div>
  );
}
