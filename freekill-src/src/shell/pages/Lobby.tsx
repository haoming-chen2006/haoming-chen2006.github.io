/**
 * The lobby: what is open, how to make one, how to get into someone else's.
 *
 * Creating a room is now one decision. `ModePicker` is the whole of it — the
 * mode carries its own seat count, so there is no second control that can
 * disagree with the first, and no way to open a 斗地主 with eight chairs.
 * Everything else (room name, how many characters each seat is offered, which
 * packages are in) is a preference with a sane default, so it lives behind
 * "more options" rather than in front of the button.
 */
import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n';
import { useSession } from '../session';
import type { RoomSummary } from '../api';
import { DEFAULT_MODE_ID, GAME_MODES, modeById, modeOfRoom, type ModeId } from '../../contract/modes';
import { ModePicker, modeNameKey } from '../ModePicker';

const DEFAULT_SETTINGS = {
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
  const { api, loaded, identity } = useSession();
  const [rooms, setRooms] = useState<readonly RoomSummary[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const packs = loaded.overview.packs;
  const [name, setName] = useState(() => t('lobby.defaultRoomName', { name: identity?.displayName ?? '' }));
  const [modeId, setModeId] = useState<ModeId>(DEFAULT_MODE_ID);
  const [generalNum, setGeneralNum] = useState(3);
  const [disabled, setDisabled] = useState<readonly string[]>([]);

  useEffect(() => api.watchLobby(setRooms), [api]);

  const mode = useMemo(() => modeById(modeId) ?? GAME_MODES[0], [modeId]);

  /**
   * How many characters each seat is offered to choose from.
   *
   * The ceiling is the engine's, not a taste call: `askToChooseGeneral` draws
   * `#nonlord * generalNum` from `general_pile` in one go, so a roster of N
   * generals across S seats cannot offer more than N/S each. With the standard
   * pack alone that was 25/8 = 3, which is why this used to be a fixed [3,4,5].
   * With a general pack loaded it is far larger, and offering the whole roster
   * is what "browse and pick" means — so the list is derived, not written down.
   */
  const generalNumOptions = useMemo(() => {
    const pool = loaded.overview.generals.length;
    const max = Math.max(3, Math.floor(pool / Math.max(1, mode.seats)));
    const steps = [3, 5, 10, 20, 30, 50, 100, max];
    return [...new Set(steps.filter((n) => n <= max))].sort((a, b) => a - b);
  }, [loaded.overview.generals.length, mode.seats]);

  useEffect(() => {
    // A mode change can lower the ceiling; never send the engine a number it
    // cannot fill, or the deal throws before anyone sees a card.
    const max = generalNumOptions[generalNumOptions.length - 1] ?? 3;
    if (generalNum > max) setGeneralNum(max);
  }, [generalNumOptions, generalNum]);

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
      // The one place a capacity is decided, and it is read, not chosen.
      capacity: mode.seats,
      settings: {
        ...DEFAULT_SETTINGS,
        gameMode: mode.gameMode,
        // `gameMode` alone cannot tell a five-seat 身份局 from an eight-seat
        // one - they are the same ruleset. This is what a joining client reads
        // to know which offer the room was opened as.
        fkMode: mode.id,
        generalNum,
        disabledPack: [...disabled],
      },
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
        <div className="mode-head">
          <div>
            <div className="mode-head__title">{t('lobby.chooseMode')}</div>
            <div className="mode-head__hint">{t('lobby.chooseModeHint')}</div>
          </div>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => setAdvanced((v) => !v)}
            aria-expanded={advanced}
          >
            {t(advanced ? 'lobby.fewerOptions' : 'lobby.moreOptions')}
          </button>
        </div>

        <ModePicker value={modeId} onChange={setModeId} disabled={busy} />

        {advanced ? (
          <div className="mode-advanced">
            <div className="row">
              <div className="field" style={{ flex: '2 1 240px' }}>
                <label htmlFor="rname">{t('lobby.roomName')}</label>
                <input id="rname" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
              </div>
              <div className="field">
                <label htmlFor="rgn">{t('lobby.generalNum')}</label>
                <select id="rgn" value={generalNum} onChange={(e) => setGeneralNum(Number(e.target.value))}>
                  {generalNumOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
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
        ) : null}

        <div className="mode-actions">
          <button className="btn primary" onClick={create} disabled={busy}>
            {t('lobby.createIn', { mode: t(modeNameKey(mode.id)) })}
          </button>
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
          : rooms.map((r) => {
            const offer = modeOfRoom(r.settings, r.capacity);
            return (
              <div className="room-row" key={r.id}>
                <div>
                  <div className="name">{r.name}</div>
                  <div className="meta">
                    {t('lobby.host', { name: r.hostName })} ·
                    {' '}{offer ? t(modeNameKey(offer.id)) : t('mode.unknown')} ·
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
            );
          })}
      </div>
    </div>
  );
}
