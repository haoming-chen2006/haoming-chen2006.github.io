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
import { AnimBus } from './components/anim/bus';
import { AnimProvider } from './components/anim/Stage';
import { warmCommonSheets } from './components/anim/sheets';
import { Boundary } from './components/Boundary';
import { ConfirmBar } from './components/ConfirmBar';
import { Dashboard } from './components/Dashboard';
import { GeneralDetail } from './dialogs/GeneralDetail';
import { Indicators, type SeatRefs } from './components/Indicators';
import { Photo } from './components/Photo';
import { seatStyle, tableInset, tableTop } from './components/SeatRing';
import { useRingMetrics } from './components/useRingMetrics';
import { SidePanel } from './components/SidePanel';
import { TablePile } from './components/TablePile';
import { DialogHost } from './dialogs/DialogHost';
import { makeReply } from './dialogs/reply';
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

  /**
   * The animation bus.
   *
   * It taps the same notify stream the store does, from the same subscription,
   * because two things it needs never survive the store: `Animate.skill_type`,
   * which says which of the nine `skillInvoke` categories a skill belongs to,
   * and `Animate.is_card`, which says the effect belongs on a card rather than
   * a seat. See `components/anim/bus.ts`.
   */
  const anim = useMemo(() => new AnimBus((s: string) => services.lua.tr(s)), [services]);
  useEffect(() => () => anim.dispose(), [anim]);
  useEffect(() => { if (mode === 'play') warmCommonSheets(); }, [mode]);

  // Notify messages arrive in bursts between engine yields — 2,286 of them over
  // a full game across 601 flushes. Apply each one immediately, publish once per
  // frame, so React re-renders per burst rather than per message.
  useEffect(() => {
    let queued = false;
    const publish = () => { queued = false; store.commit(); };
    // `retainingClient` replays its whole history into a new subscriber before
    // `onNotifyUI` returns, so a remount mid-game would otherwise fire every
    // `Animate` the table has ever seen at once. Nothing animates until the
    // subscription is live and the messages are new.
    anim.replaying = true;
    const off = client.onNotifyUI((command, data) => {
      store.applyNotify(command as string, data);
      anim.notify(command, data);
      // `Room.qml`'s transition to `notactive` ends with `Ltk.finishRequestUI()`,
      // and answering is one of the three things that triggers it. Without it
      // the client VM keeps the answered handler as `current_request_handler`
      // and any later `UpdateRequestUI` — a stray click, a re-press of OK —
      // runs `doOKButton` on it again and sends the host a second reply.
      if (command === 'ReplyToServer') {
        try { services.lua.finishRequestUI(); } catch { /* engine gone */ }
      }
      if (!queued) { queued = true; queueMicrotask(publish); }
    });
    // `retainingClient` replays synchronously, so everything delivered before
    // this line is history and everything after it is the game happening now.
    anim.replaying = false;
    return () => { off(); anim.replaying = true; };
  }, [client, store, services, anim]);

  // `Room.qml`'s 200 ms `statusSkillTimer`. `RefreshStatusSkills` is what emits
  // MaxCard, role visibility, UpdateDrawPile and UpdateSkill; nothing else does.
  useEffect(() => {
    if (mode === 'replay') return;
    const t = setInterval(() => { try { services.lua.refreshStatusSkills(); } catch { /* engine gone */ } }, 200);
    return () => clearInterval(t);
  }, [services, mode]);

  return (
    <RoomProvider value={services}>
      <AnimProvider value={anim}>
        <RoomBody chat={chat} onChat={onChat} playback={playback} statusSlot={statusSlot} />
      </AnimProvider>
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
  // The photo size is chosen against the number of seats actually at the table:
  // eight seats need a smaller photo than three before they stop touching.
  const metrics = useRingMetrics(container, state.playerNum || 8);

  useEffect(() => { setContainer(seatsRef.current); }, []);

  const interactive = mode === 'play';
  const photoItems = scene.items.Photo ?? {};

  const clickPhoto = useCallback((pid: number, selected: boolean) => {
    lua.interact('Photo', pid, 'click', { selected, autoTarget: false });
  }, [lua]);

  /** Answer a dialog-shaped request. See `dialogs/reply.ts`. */
  const reply = useMemo(() => makeReply(store, lua), [store, lua]);

  const order = state.circle.length ? state.circle : Object.keys(state.players).map(Number);
  const bubbles = useChatBubbles(chat);

  return (
    <div
      className="fk-room"
      style={{
        ['--fk-photo-w' as string]: `${metrics.photoW}px`,
        // The processing pile keeps to the space between the two seat columns,
        // and below the tallest seat on the top edge.
        ['--fk-table-inset' as string]: `${tableInset(metrics)}px`,
        ['--fk-table-top' as string]: `${tableTop(metrics)}px`,
      }}
    >
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
                {/* Every prop here is a value or a reference the store keeps
                    stable between commits, which is what lets `memo` on `Photo`
                    actually bail out. It used to be handed the whole `state`
                    plus a freshly `filter`ed array built with `Date.now()`, so
                    the memo missed on every render — and the table renders five
                    times a second on `refreshStatusSkills` whether or not
                    anything happened. Eight seats reconciled 5 Hz for nothing. */}
                <Photo
                  player={p}
                  equips={state.equips[pid]}
                  judge={state.judge[pid]}
                  item={interactive ? photoItems[String(pid)] : undefined}
                  isCurrent={state.currentId === pid}
                  handCount={(state.hands[pid] ?? []).length}
                  focus={state.focus}
                  bubble={bubbles.get(pid)}
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

      {/* The question, then the cards it is about. See `ConfirmBar.tsx`. */}
      <ConfirmBar />
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
