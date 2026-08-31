/**
 * The game table.
 *
 * `<RoomView>` is the component `contract/views.ts` promises lane 4, and the
 * component that replaces `Fk/Pages/LunarLTK/Room.qml` (964 lines) plus
 * `RoomLogic.js` (1,616). Its entire input is `client.onNotifyUI`; its entire
 * output is `client.interact` and the dialog replies. There is no third path,
 * and no game rule lives on this side of it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatLine, RoomViewProps } from '../contract/views';
import { Assets } from './assets/assets';
import { Boundary } from './components/Boundary';
import { Dashboard } from './components/Dashboard';
import { GeneralDetail } from './components/GeneralDetail';
import { Indicators, type SeatRefs } from './components/Indicators';
import { Photo } from './components/Photo';
import { seatStyle } from './components/SeatRing';
import { useRingMetrics } from './components/useRingMetrics';
import { SidePanel } from './components/SidePanel';
import { TablePile } from './components/TablePile';
import { DialogHost } from './dialogs/DialogHost';
import { LtkLua } from './ltk/LtkLua';
import { makeNaming, RoomProvider, useRoom, useRoomState, useScene, type RoomServices } from './RoomContext';
import { RoomStore } from './state/store';
import './room.css';

export function RoomView(props: RoomViewProps) {
  const { client, assets: manifest, meId, mode, chat, onChat, playback, statusSlot } = props;

  const store = useMemo(() => new RoomStore(meId), [client]);
  const services = useMemo<RoomServices>(() => ({
    store,
    lua: new LtkLua(client),
    assets: new Assets(manifest),
    mode,
    meId,
    naming: makeNaming(store),
  }), [store, client, manifest, mode, meId]);

  // Notify messages arrive in bursts between engine yields — 2,286 of them over
  // a full game across 601 flushes. Apply each one immediately, publish once per
  // frame, so React re-renders per burst rather than per message.
  useEffect(() => {
    let queued = false;
    const publish = () => { queued = false; store.commit(); };
    const off = client.onNotifyUI((command, data) => {
      store.applyNotify(command as string, data);
      if (!queued) { queued = true; queueMicrotask(publish); }
    });
    return () => { off(); };
  }, [client, store]);

  // `Room.qml`'s 200 ms `statusSkillTimer`. `RefreshStatusSkills` is what emits
  // MaxCard, role visibility, UpdateDrawPile and UpdateSkill; nothing else does.
  useEffect(() => {
    if (mode === 'replay') return;
    const t = setInterval(() => { try { services.lua.refreshStatusSkills(); } catch { /* engine gone */ } }, 200);
    return () => clearInterval(t);
  }, [services, mode]);

  return (
    <RoomProvider value={services}>
      <RoomBody chat={chat} onChat={onChat} playback={playback} statusSlot={statusSlot} />
    </RoomProvider>
  );
}

function RoomBody(
  { chat, onChat, playback, statusSlot }:
  Pick<RoomViewProps, 'chat' | 'onChat' | 'playback' | 'statusSlot'>,
) {
  const { lua, mode, store } = useRoom();
  const state = useRoomState();
  const scene = useScene();
  const seatsRef = useRef<HTMLDivElement>(null);
  const refs = useRef<SeatRefs>(new Map());
  const [detail, setDetail] = useState<string | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const metrics = useRingMetrics(container);

  useEffect(() => { setContainer(seatsRef.current); }, []);

  const interactive = mode === 'play';
  const photoItems = scene.items.Photo ?? {};

  const clickPhoto = useCallback((pid: number, selected: boolean) => {
    lua.interact('Photo', pid, 'click', { selected, autoTarget: false });
  }, [lua]);

  const reply = useCallback((value: unknown) => {
    lua.replyToServer(value);
    store.outbound.push({ command: 'reply', payload: value });
    store.commit();
  }, [lua, store]);

  const order = state.circle.length ? state.circle : Object.keys(state.players).map(Number);
  const bubbles = useChatBubbles(chat);

  return (
    <div className="fk-room" style={{ ['--fk-photo-w' as string]: `${metrics.photoW}px` }}>
      <div className="fk-seats">
        <div className="fk-ring" ref={seatsRef}>
          <Banner />
          {order.map((pid) => {
            const p = state.players[pid];
            if (!p) return null;
            return (
              <div
                key={pid}
                className="fk-seat-slot"
                style={seatStyle(state.playerNum || order.length, p.index, metrics)}
                ref={(el) => { refs.current.set(pid, el); }}
                onContextMenu={(e) => { e.preventDefault(); if (p.general) setDetail(p.general); }}
              >
                <Photo
                  player={p}
                  state={state}
                  item={interactive ? photoItems[String(pid)] : undefined}
                  isCurrent={state.currentId === pid}
                  handCount={(state.hands[pid] ?? []).length}
                  effects={state.effects.filter((e) => e.playerId === pid && Date.now() - e.at < 1200)}
                  onClick={clickPhoto}
                />
              </div>
            );
          })}

          <TablePile />
          <Indicators seatRefs={refs.current} container={container} />
          {playback ? <PlaybackBar playback={playback} /> : null}
        </div>

        <SidePanel chat={chat} onChat={onChat} />
        {statusSlot ? <div style={{ position: 'absolute', right: 8, bottom: 8, zIndex: 20 }}>{statusSlot}</div> : null}
      </div>

      <Dashboard />

      <Boundary label={requestLabel(state.request)}>
        <DialogHost onReply={reply} interactive={interactive} />
      </Boundary>
      {detail ? <GeneralDetail name={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

/**
 * The last thing each player said, floating over their seat for a few seconds —
 * `Fk/Components/GameCommon/ChatBubble.qml`. The log panel keeps the history;
 * the bubble is what makes chat feel like it happened at the table.
 */
const BUBBLE_MS = 6000;

function useChatBubbles(chat: readonly ChatLine[]): ReadonlyMap<number, string> {
  const [, tick] = useState(0);
  const latest = new Map<number, ChatLine>();
  for (const line of chat) {
    if (line.playerId == null) continue;
    latest.set(line.playerId, line);
  }

  useEffect(() => {
    if (!chat.length) return;
    const t = setTimeout(() => tick((n) => n + 1), BUBBLE_MS + 50);
    return () => clearTimeout(t);
  }, [chat]);

  const now = Date.now();
  const out = new Map<number, string>();
  for (const [pid, line] of latest) {
    if (now - line.at < BUBBLE_MS) out.set(pid, line.text);
  }
  return out;
}

function requestLabel(req: { kind: string; command?: string }): string {
  return req.kind === 'none' ? 'request' : (req.command ?? 'request');
}

function Banner() {
  const { lua } = useRoom();
  const state = useRoomState();
  const entries = Object.entries(state.banners);
  if (!entries.length) return null;
  return (
    <div className="fk-banner">
      {entries.map(([k, v]) => (
        <span className="fk-banner__item" key={k}>
          {lua.tr(k)}{k.startsWith('@@') ? '' : ` ${summarise(v)}`}
        </span>
      ))}
    </div>
  );
}

function summarise(v: unknown): string {
  if (Array.isArray(v)) return String(v.length);
  if (typeof v === 'object' && v !== null) return '';
  return String(v);
}

/** Observer and replay transport. `RoomViewProps.playback` is undefined in play mode. */
function PlaybackBar({ playback }: { playback: NonNullable<RoomViewProps['playback']> }) {
  const { lua } = useRoom();
  return (
    <div
      style={{
        position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center', padding: '4px 10px',
        background: 'var(--fk-panel)', border: '1px solid var(--fk-line)', borderRadius: 4,
      }}
    >
      <button type="button" className="fk-btn" onClick={() => playback.onStep(-1)}>◀</button>
      <button type="button" className="fk-btn fk-btn--primary" onClick={playback.onPlayPause}>
        {playback.playing ? '❚❚' : '▶'}
      </button>
      <button type="button" className="fk-btn" onClick={() => playback.onStep(1)}>▶</button>
      <input
        type="range"
        min={0}
        max={Math.max(0, playback.total)}
        value={playback.index}
        onChange={(e) => playback.onSeek(Number(e.target.value))}
        style={{ width: 220 }}
      />
      <span style={{ fontSize: 12, color: 'var(--fk-ink-dim)' }}>
        {playback.index}/{playback.total}
      </span>
    </div>
  );
}
