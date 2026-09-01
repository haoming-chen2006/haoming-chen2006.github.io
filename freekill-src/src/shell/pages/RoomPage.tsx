/**
 * The room container: everything around the table, none of the table.
 *
 * It owns the room's lifecycle — watch the row, map members to seats, show the
 * waiting room until the host starts, then hand off. `<RoomView>` itself is
 * Agent 3's; this mounts whatever is there behind `contract/views.ts`, and a
 * stub until it is. Swapping the real one in requires no edit on either side.
 *
 * It also owns the seam the game used to fall through. Mounting a table is not
 * starting a game: something has to build the authoritative engine, feed it the
 * seed, and pump its output into every seat's client VM. `startLiveTable` is
 * that something, and the status it reports is rendered rather than swallowed —
 * an empty table with a green "已连接" badge is the single most misleading
 * thing this app could show, so it is no longer a state you can reach.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type { RoomViewProps, SeatView } from '../../contract/views';
import type { LuaClient } from '../../contract/engine';
import type { RoomDetail } from '../api';
import { useSession } from '../session';
import { shareUrl } from '../router';
import { WaitingRoomView } from './WaitingRoom';
import { RoomViewStub } from '../RoomViewStub';
import { createFixtureClient } from '../fixtureClient';
import { createEngineClient } from '../engineClient';
import { prefetchLuaBundle } from '../boot';
import { ErrorBoundary } from '../ErrorBoundary';
import { errorText } from '../hostRunner';
import { startLiveTable, type TableStatus } from '../liveTable';
import { retainNotifications } from '../retainingClient';
import { getLanguage, useT, withLanguage } from '../../i18n';

const roomModules = import.meta.glob<Record<string, unknown>>([
  '../../room/RoomView.tsx',
  '../../room/index.tsx',
  '../../room/index.ts',
]);

/**
 * Agent 3's component when it exists, the stub until then.
 *
 * `settled` says the dynamic import has resolved one way or the other. It is a
 * scheduling hint, not a safety net: what makes a late mount harmless is
 * `retainNotifications`, which keeps the stream for whoever attaches. Waiting
 * here just means the opening is replayed once, into the real table, instead of
 * twice.
 */
function useRoomView(): { View: ComponentType<RoomViewProps>; settled: boolean } {
  const [View, setView] = useState<ComponentType<RoomViewProps>>(() => RoomViewStub);
  const entry = Object.values(roomModules)[0];
  const [settled, setSettled] = useState(!entry);
  useEffect(() => {
    let live = true;
    if (!entry) return;
    void entry().then((mod) => {
      const found = (mod.RoomView ?? mod.default) as ComponentType<RoomViewProps> | undefined;
      if (!live) return;
      if (typeof found === 'function') setView(() => found);
      setSettled(true);
    }).catch((e) => {
      console.warn('[room] RoomView failed to load; keeping the stub', e);
      if (live) setSettled(true);
    });
    return () => { live = false; };
  }, [entry]);
  return { View, settled };
}

function toSeats(room: RoomDetail): SeatView[] {
  return room.members.map((m) => ({
    playerId: m.seat,
    seat: m.seat,
    displayName: m.displayName,
    avatar: m.avatar,
    isBot: m.isBot,
    isHost: m.userId === room.hostId,
    connection: m.connection,
    ready: m.ready,
  }));
}

export function RoomPage({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const t = useT();
  const { api, loaded, identity } = useSession();
  const [room, setRoom] = useState<RoomDetail | null | undefined>(undefined);
  const [fault, setFault] = useState<string | null>(null);
  const { View: RoomView, settled: viewReady } = useRoomView();

  useEffect(() => api.watchRoom(roomId, setRoom), [api, roomId]);

  const me = room?.members.find((m) => m.userId === identity?.userId);
  const isHost = !!room && room.hostId === identity?.userId;
  const playing = room?.summary.status === 'playing';

  /**
   * Every host action is a promise nobody was awaiting. `void api.startGame()`
   * threw away the one signal that would have told the player — or the console
   * — that pressing the button did nothing at all.
   */
  const run = useCallback((what: string, p: Promise<unknown>) => {
    setFault(null);
    void p.catch((e: unknown) => {
      console.error(`[room] ${what} failed`, e);
      setFault(t('room.fault.action', { what, error: errorText(e) }));
    });
  }, [t]);

  const leave = useCallback(async () => {
    await api.leaveRoom(roomId).catch((e: unknown) => console.warn('[room] leave failed', e));
    onLeave();
  }, [api, roomId, onLeave]);

  const seats = useMemo(() => (room ? toSeats(room) : []), [room]);

  // The table gets a real client VM when the engine lane's module is present and
  // the bundle has finished prefetching; the recorded fixture stream otherwise.
  // Both satisfy `contract/engine.ts`'s LuaClient, so nothing downstream knows
  // which one it got.
  //
  // Either way it is wrapped in `retainNotifications` the moment it exists, and
  // that wrapping is load-bearing rather than tidy: the engine's first flush
  // carries the entire opening, and whether the table has mounted by then is up
  // to React. Retaining the stream turns "the table subscribed late" from a lost
  // game into a replay. See `retainingClient.ts`.
  const [client, setClient] = useState<LuaClient | null>(null);
  const [fixtureOnly, setFixtureOnly] = useState(false);
  /** Set when the engine is supposed to be here and could not start. */
  const [engineDown, setEngineDown] = useState<string | null>(null);
  const seat = me?.seat;
  const known = room !== undefined;
  useEffect(() => {
    // Booting a Lua VM costs a second and a few tens of MB. Doing it before the
    // room row has arrived means doing it twice: once as a seatless observer,
    // then again for the seat we turned out to hold.
    if (!known) return;
    let live = true;
    let made: LuaClient | null = null;
    const fallback = () => {
      if (!live) return;
      made = retainNotifications(createFixtureClient({ overview: loaded.overview }));
      setFixtureOnly(true);
      setClient(made);
    };
    void prefetchLuaBundle()
      .then((bundle) => createEngineClient({
        bundle,
        seat: seat ?? 1,
        name: identity?.displayName ?? t('room.observerName'),
        avatar: identity?.avatar ?? 'guojia',
        observing: seat === undefined,
      }))
      .then((real) => {
        if (!live) { real?.dispose(); return; }
        // Null means this build has no engine lane at all, which is the one
        // case where a recorded stream is an honest stand-in. A *failure* to
        // start an engine that should be here throws, and lands below.
        if (!real) { fallback(); return; }
        made = retainNotifications(real);
        setFixtureOnly(false);
        setEngineDown(null);
        setClient(made);
      })
      .catch((e) => {
        console.error('[room] the rules engine could not start', e);
        if (live) setEngineDown(errorText(e));
      });
    return () => { live = false; made?.dispose(); };
  }, [known, loaded, seat, identity, t]);

  // A getter, deliberately, not a `Language`: `RoomView` memoizes its RoomStore
  // on client identity, so a wrapper whose identity changed on a language
  // toggle would wipe the table mid-game.
  const wrapped = useMemo(() => client && withLanguage(client, getLanguage), [client]);

  /**
   * The missing half: once the room says `playing`, somebody has to actually
   * run a game. The host builds the engine; everyone plugs their client VM into
   * the traffic it produces.
   */
  const [table, setTable] = useState<TableStatus | null>(null);

  // The room row is refetched on every chat line, heartbeat and connection
  // change, and each refetch is a fresh `members` array and a fresh `settings`
  // object. Those must not be effect dependencies: a new object identity would
  // tear down the engine and deal a brand new game mid-hand. The table is
  // started once per game from whatever the room looked like at that moment.
  const latestRoom = useRef(room);
  latestRoom.current = room;

  useEffect(() => {
    // `viewReady` is no longer what makes this correct — `retainNotifications`
    // is, and it holds for every ordering. This just avoids replaying an
    // opening into the stub and then again into the real table.
    if (!playing || !client || fixtureOnly || !viewReady) return;
    const snapshot = latestRoom.current;
    if (!snapshot) return;
    let live = true;
    let handle: { stop(): void } | null = null;
    void startLiveTable({
      roomId,
      client,
      mySeat: seat ?? null,
      isHost,
      seats: snapshot.members.map((m) => ({
        seat: m.seat,
        displayName: m.displayName,
        avatar: m.avatar,
        isBot: m.isBot,
        connection: m.connection,
      })),
      settings: snapshot.summary.settings,
      onStatus: (s) => { if (live) setTable(s); },
    }).then((t) => {
      handle = t;
      if (!live) t.stop();
    }).catch((e: unknown) => {
      console.error('[room] the table failed to connect', e);
      if (live) setTable({ phase: 'failed', note: t('room.fault.table', { error: errorText(e) }), warnings: [] });
    });
    return () => { live = false; handle?.stop(); };
  }, [playing, client, fixtureOnly, viewReady, roomId, seat, isHost, t]);

  const banner = fault ? <Banner text={fault} onDismiss={() => setFault(null)} /> : null;

  if (room === undefined) return <div className="page"><p className="lede">{t('room.loading')}</p></div>;
  if (room === null) {
    return (
      <div className="page">
        <h2>{t('room.gone.title')}</h2>
        <p className="lede">{t('room.gone.body')}</p>
        <button className="btn" onClick={onLeave}>{t('app.backToLobby')}</button>
      </div>
    );
  }

  if (room.summary.status === 'waiting') {
    return (
      <>
        {banner}
        <WaitingRoomView
          roomId={roomId}
          joinCode={room.summary.code}
          joinUrl={shareUrl(room.summary.code)}
          seats={seats}
          capacity={room.summary.capacity}
          settings={room.summary.settings}
          meId={me?.seat ?? -1}
          isHost={isHost}
          onStart={isHost ? () => run(t('room.action.start'), api.startGame(roomId)) : undefined}
          onAddBot={isHost ? (s) => run(t('room.action.addBot'), api.addBot(roomId, s)) : undefined}
          onRemoveSeat={isHost ? (s) => run(t('room.action.removeSeat'), api.removeSeat(roomId, s)) : undefined}
          onChangeSettings={isHost ? (patch) => run(t('room.action.changeSettings'), api.updateSettings(roomId, patch)) : undefined}
          onLeave={leave}
          onChat={(text) => run(t('room.action.sendChat'), api.sendChat(roomId, text, me?.seat ?? null))}
          chat={room.chat}
        />
      </>
    );
  }

  // No engine means no game. Saying so beats mounting a recorded one and
  // crashing on the first card it cannot describe, which is what this did.
  if (engineDown) {
    return (
      <div className="page">
        {banner}
        <h2>{t('room.engineDown.title')}</h2>
        <p className="lede">{t('room.engineDown.body')}</p>
        <pre style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10,
          padding: 14, fontSize: 12, overflow: 'auto', color: 'var(--paper-dim)',
        }}>{engineDown}</pre>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => location.reload()}>{t('room.engineDown.retry')}</button>
          <button className="btn ghost" onClick={onLeave}>{t('app.backToLobby')}</button>
        </div>
      </div>
    );
  }

  if (!client || !wrapped) return <div className="page"><p className="lede">{t('room.preparing')}</p></div>;

  // The table is mounted the moment the room is playing, because it has to be
  // listening before the first flush arrives — but a table with nothing on it
  // and a reassuring "已连接" badge is exactly the lie this page used to tell,
  // so until real game data lands, a curtain says what is going on. It lifts by
  // itself the moment the first envelope is applied.
  const curtain = table && table.phase !== 'live' && table.phase !== 'over'
    ? <TableCurtain status={table} onLeave={leave} />
    : null;

  return (
    <ErrorBoundary where={t('room.boundaryName')} onReset={onLeave}>
    {banner}
    {curtain}
    <RoomView
      roomId={roomId}
      mode={me ? 'play' : 'observe'}
      meId={me?.seat ?? null}
      seats={seats}
      client={wrapped}
      assets={loaded.assets}
      chat={room.chat}
      onChat={(text) => run(t('room.action.sendChat'), api.sendChat(roomId, text, me?.seat ?? null))}
      onLeave={leave}
      statusSlot={<span style={{ fontSize: 12, color: 'var(--paper-faint)' }}>
        {table?.warnings.length
          ? <span style={{ color: 'var(--gold)' }}>{table.warnings[0]}</span>
          : t(api.kind === 'local' ? 'room.badge.local' : 'room.badge.connected')}
      </span>}
    />
    </ErrorBoundary>
  );
}

/**
 * What the room says while it is not yet a game. Overlaid on the table rather
 * than shown instead of it, so the table is already subscribed to the engine.
 */
function TableCurtain({ status, onLeave }: { status: TableStatus; onLeave: () => void }) {
  const t = useT();
  const failed = status.phase === 'failed';
  return (
    <div
      className="fk-curtain"
      data-phase={status.phase}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, background: 'rgba(12,10,8,.92)', textAlign: 'center', padding: 24,
      }}
    >
      <h2 style={{ margin: 0 }}>{t(failed ? 'room.curtain.failed' : 'room.curtain.preparing')}</h2>
      <p className="lede" style={{ margin: 0, maxWidth: 520 }}>{status.note}</p>
      {status.warnings.map((w) => (
        <p className="lede" key={w} style={{ margin: 0, maxWidth: 520, fontSize: 13 }}>· {w}</p>
      ))}
      <button className="btn ghost" onClick={onLeave}>{t('waiting.leave')}</button>
    </div>
  );
}

function Banner({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  const t = useT();
  return (
    <div style={{
      position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
      maxWidth: 720, display: 'flex', gap: 12, alignItems: 'center',
      background: 'var(--ink-2, #241f1a)', border: '1px solid var(--gold, #b9975b)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--paper, #eee)',
      boxShadow: '0 8px 24px rgba(0,0,0,.45)',
    }}>
      <span style={{ flex: 1 }}>{text}</span>
      <button className="btn small ghost" onClick={onDismiss}>{t('room.banner.dismiss')}</button>
    </div>
  );
}
