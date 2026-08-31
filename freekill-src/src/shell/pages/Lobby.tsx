/**
 * The lobby: what is open, how to make one, how to get into someone else's.
 */
import { useEffect, useMemo, useState } from 'react';
import { engineTr, useLanguage, useT } from '../../i18n';
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
  const t = useT();
  const lang = useLanguage();
  const { api, loaded, identity } = useSession();
  /**
   * Mode names are engine i18n keys (`aaa_role_mode`), not display strings. The
   * overview payload carries the Chinese table; English comes from the overlay,
   * which is complete where the engine's own `en_US` is not.
   */
  const modeTitle = (key: unknown) =>
    engineTr(String(key ?? ''), lang, (k) => loaded.overview.translations[k] ?? k);
  const [rooms, setRooms] = useState<readonly RoomSummary[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modes = loaded.overview.modes;
  const packs = loaded.overview.packs;
  const [name, setName] = useState(() => t('lobby.defaultRoomName', { name: identity?.displayName ?? '' }));
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
      name: name.trim() || t('brand.name'),
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
      <h2>{t('lobby.title')}</h2>
      <p className="lede">
        {t('lobby.lede')}
        {api.kind === 'local' && t('lobby.localNote')}
      </p>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="row">
          <div className="field" style={{ flex: '2 1 220px' }}>
            <label htmlFor="rname">{t('lobby.roomName')}</label>
            <input id="rname" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
          </div>
          <div className="field">
            <label htmlFor="rmode">{t('lobby.mode')}</label>
            <select id="rmode" value={mode} onChange={(e) => setMode(e.target.value)}>
              {modes.map((m) => <option key={m.name} value={m.name}>{modeTitle(m.name)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rcap">{t('lobby.capacity')}</label>
            <select id="rcap" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
              {Array.from({ length: (selectedMode?.maxPlayer ?? 8) - (selectedMode?.minPlayer ?? 2) + 1 },
                (_, i) => (selectedMode?.minPlayer ?? 2) + i)
                .map((n) => <option key={n} value={n}>{t('lobby.capacityOption', { n })}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rgn">{t('lobby.generalNum')}</label>
            <select id="rgn" value={generalNum} onChange={(e) => setGeneralNum(Number(e.target.value))}>
              {[3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={create} disabled={busy}>{t('lobby.create')}</button>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('lobby.packs')}</label>
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
          <label htmlFor="jcode">{t('lobby.code')}</label>
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
        <button className="btn" onClick={() => join(code)} disabled={busy || code.length < 4}>{t('lobby.join')}</button>
      </div>

      {error ? <p className="notice" style={{ marginBottom: 18 }}>{error}</p> : null}

      <div className="rooms">
        {rooms.length === 0
          ? <div className="empty">{t('lobby.empty')}</div>
          : rooms.map((r) => (
            <div className="room-row" key={r.id}>
              <div>
                <div className="name">{r.name}</div>
                <div className="meta">
                  {t('lobby.host', { name: r.hostName })} ·
                  {' '}{modeTitle(r.settings.gameMode)} ·
                  {' '}{r.status === 'waiting' ? t('lobby.status.waiting')
                    : r.status === 'playing' ? t('lobby.status.playing') : t('lobby.status.finished')}
                </div>
              </div>
              <code className="tag">{r.code}</code>
              <div className="meta">{r.seated}/{r.capacity}</div>
              <button
                className="btn small"
                onClick={() => join(r.code)}
                disabled={busy || r.seated >= r.capacity}
              >
                {r.status === 'playing' ? t('lobby.spectate') : t('lobby.join')}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
