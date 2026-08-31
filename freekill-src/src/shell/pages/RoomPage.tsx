/**
 * The room container: everything around the table, none of the table.
 *
 * It owns the room's lifecycle — watch the row, map members to seats, show the
 * waiting room until the host starts, then hand off. `<RoomView>` itself is
 * Agent 3's; this mounts whatever is there behind `contract/views.ts`, and a
 * stub until it is. Swapping the real one in requires no edit on either side.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const roomModules = import.meta.glob<Record<string, unknown>>([
  '../../room/RoomView.tsx',
  '../../room/index.tsx',
  '../../room/index.ts',
]);

/** Agent 3's component when it exists, the stub until then. */
function useRoomView(): ComponentType<RoomViewProps> {
  const [View, setView] = useState<ComponentType<RoomViewProps>>(() => RoomViewStub);
  useEffect(() => {
    let live = true;
    const entry = Object.values(roomModules)[0];
    if (!entry) return;
    void entry().then((mod) => {
      const found = (mod.RoomView ?? mod.default) as ComponentType<RoomViewProps> | undefined;
      if (live && typeof found === 'function') setView(() => found);
    }).catch((e) => console.warn('[room] RoomView failed to load; keeping the stub', e));
    return () => { live = false; };
  }, []);
  return View;
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
  const { api, loaded, identity } = useSession();
  const [room, setRoom] = useState<RoomDetail | null | undefined>(undefined);
  const RoomView = useRoomView();

  useEffect(() => api.watchRoom(roomId, setRoom), [api, roomId]);

  const me = room?.members.find((m) => m.userId === identity?.userId);
  const isHost = !!room && room.hostId === identity?.userId;

  const leave = useCallback(async () => {
    await api.leaveRoom(roomId).catch(() => {});
    onLeave();
  }, [api, roomId, onLeave]);

  const seats = useMemo(() => (room ? toSeats(room) : []), [room]);

  // The table gets a real client VM when the engine lane's module is present and
  // the bundle has finished prefetching; the recorded fixture stream otherwise.
  // Both satisfy `contract/engine.ts`'s LuaClient, so nothing downstream knows
  // which one it got.
  const [client, setClient] = useState<LuaClient | null>(null);
  const seat = me?.seat;
  useEffect(() => {
    let live = true;
    let made: LuaClient | null = null;
    const fallback = () => {
      if (!live) return;
      made = createFixtureClient({ overview: loaded.overview });
      setClient(made);
    };
    void prefetchLuaBundle()
      .then((bundle) => createEngineClient({
        bundle,
        seat: seat ?? 1,
        name: identity?.displayName ?? '观战',
        avatar: identity?.avatar ?? 'guojia',
        observing: seat === undefined,
      }))
      .then((real) => {
        if (!live) { real?.dispose(); return; }
        if (!real) { fallback(); return; }
        made = real;
        setClient(real);
      })
      .catch((e) => { console.warn('[room] engine unavailable', e); fallback(); });
    return () => { live = false; made?.dispose(); };
  }, [loaded, seat, identity, api]);

  if (room === undefined) return <div className="page"><p className="lede">正在读取房间…</p></div>;
  if (room === null) {
    return (
      <div className="page">
        <h2>房间不在了</h2>
        <p className="lede">这个房间已经解散，或者链接指向的是别人机器上的本机房间。</p>
        <button className="btn" onClick={onLeave}>回到大厅</button>
      </div>
    );
  }

  if (room.summary.status === 'waiting') {
    return (
      <WaitingRoomView
        roomId={roomId}
        joinCode={room.summary.code}
        joinUrl={shareUrl(room.summary.code)}
        seats={seats}
        capacity={room.summary.capacity}
        settings={room.summary.settings}
        meId={me?.seat ?? -1}
        isHost={isHost}
        onStart={isHost ? () => void api.startGame(roomId) : undefined}
        onAddBot={isHost ? (seat) => void api.addBot(roomId, seat) : undefined}
        onRemoveSeat={isHost ? (seat) => void api.removeSeat(roomId, seat) : undefined}
        onChangeSettings={isHost ? (patch) => void api.updateSettings(roomId, patch) : undefined}
        onLeave={leave}
        onChat={(text) => void api.sendChat(roomId, text)}
        chat={room.chat}
      />
    );
  }

  if (!client) return <div className="page"><p className="lede">正在准备牌桌…</p></div>;

  return (
    <ErrorBoundary where="牌桌" onReset={onLeave}>
    <RoomView
      roomId={roomId}
      mode={me ? 'play' : 'observe'}
      meId={me?.seat ?? null}
      seats={seats}
      client={client}
      assets={loaded.assets}
      chat={room.chat}
      onChat={(text) => void api.sendChat(roomId, text)}
      onLeave={leave}
      statusSlot={<span style={{ fontSize: 12, color: 'var(--paper-faint)' }}>
        {api.kind === 'local' ? '本机模式' : '已连接'}
      </span>}
    />
    </ErrorBoundary>
  );
}
