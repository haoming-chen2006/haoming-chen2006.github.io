/**
 * The lobby: what is open, how to make one, how to get into someone else's.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../session';
import type { RoomSummary } from '../api';

const DEFAULT_SETTINGS = {
  gameMode: 'aaa_role_mode',
  generalNum: 3,
  generalTimeout: 30,
  luckTime: 0,
  enableDeputy: false,
  enableFreeAssign: false,
  enableObserverViewCard: false,
  disabledPack: [] as string[],
  disabledGenerals: [] as string[],
  password: '',
};

export function Lobby({ onEnterRoom }: { onEnterRoom: (roomId: string) => void }) {
  const { api, loaded, identity } = useSession();
  const [rooms, setRooms] = useState<readonly RoomSummary[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modes = loaded.overview.modes;
  const packs = loaded.overview.packs;
  const [name, setName] = useState(() => `${identity?.displayName ?? ''}的房间`);
  const [capacity, setCapacity] = useState(8);
  const [mode, setMode] = useState(modes[0]?.name ?? 'aaa_role_mode');
  const [generalNum, setGeneralNum] = useState(3);
  const [disabled, setDisabled] = useState<readonly string[]>([]);

  useEffect(() => api.watchLobby(setRooms), [api]);

  const selectedMode = useMemo(() => modes.find((m) => m.name === mode), [modes, mode]);

  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try { return await fn(); } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally { setBusy(false); }
  }

  async function create() {
    const room = await guard(() => api.createRoom({
      name: name.trim() || '新月杀',
      capacity,
      settings: { ...DEFAULT_SETTINGS, gameMode: mode, generalNum, disabledPack: [...disabled] },
      bundleSha: loaded.lua.bundleSha256_16,
    }));
    if (room) onEnterRoom(room.summary.id);
  }

  async function join(c: string) {
    const room = await guard(() => api.joinByCode(c));
    if (room) onEnterRoom(room.summary.id);
  }

  return (
    <div className="page">
      <h2>房间</h2>
      <p className="lede">
        创建一个房间把链接发给朋友，或者用四位房号加入别人的。
        {api.kind === 'local' && ' 当前是本机模式：房间只在这台机器的浏览器之间可见。'}
      </p>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="row">
          <div className="field" style={{ flex: '2 1 220px' }}>
            <label htmlFor="rname">房间名</label>
            <input id="rname" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
          </div>
          <div className="field">
            <label htmlFor="rmode">模式</label>
            <select id="rmode" value={mode} onChange={(e) => setMode(e.target.value)}>
              {modes.map((m) => <option key={m.name} value={m.name}>{m.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rcap">人数</label>
            <select id="rcap" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
              {Array.from({ length: (selectedMode?.maxPlayer ?? 8) - (selectedMode?.minPlayer ?? 2) + 1 },
                (_, i) => (selectedMode?.minPlayer ?? 2) + i)
                .map((n) => <option key={n} value={n}>{n} 人</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rgn">选将数</label>
            <select id="rgn" value={generalNum} onChange={(e) => setGeneralNum(Number(e.target.value))}>
              {[3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={create} disabled={busy}>创建房间</button>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>扩展包</label>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[...packs.general, ...packs.card].map((p) => (
                <label key={p} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={!disabled.includes(p)}
                    onChange={(e) => setDisabled((d) => (e.target.checked ? d.filter((x) => x !== p) : [...d, p]))}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 22 }}>
        <div className="field">
          <label htmlFor="jcode">房号</label>
          <input
            id="jcode"
            type="text"
            value={code}
            placeholder="ABCD"
            maxLength={4}
            style={{ width: 130, letterSpacing: 6, textTransform: 'uppercase' }}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <button className="btn" onClick={() => join(code)} disabled={busy || code.length < 4}>加入</button>
      </div>

      {error ? <p className="notice" style={{ marginBottom: 18 }}>{error}</p> : null}

      <div className="rooms">
        {rooms.length === 0
          ? <div className="empty">还没有房间。创建一个吧。</div>
          : rooms.map((r) => (
            <div className="room-row" key={r.id}>
              <div>
                <div className="name">{r.name}</div>
                <div className="meta">
                  房主 {r.hostName} ·
                  {' '}{modes.find((m) => m.name === r.settings.gameMode)?.title ?? String(r.settings.gameMode ?? '')} ·
                  {r.status === 'waiting' ? ' 等待中' : r.status === 'playing' ? ' 游戏中' : ' 已结束'}
                </div>
              </div>
              <code className="tag">{r.code}</code>
              <div className="meta">{r.seated}/{r.capacity}</div>
              <button
                className="btn small"
                onClick={() => join(r.code)}
                disabled={busy || r.seated >= r.capacity}
              >
                {r.status === 'playing' ? '旁观' : '加入'}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
