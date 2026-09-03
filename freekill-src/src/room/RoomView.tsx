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
import { roomAudio } from './audio';
import { AnimBus } from './components/anim/bus';
import { AnimProvider } from './components/anim/Stage';
import { warmCommonSheets } from './components/anim/sheets';
import { spokenChat, useQuickChatVoice } from './chat';
import { Boundary } from './components/Boundary';
import { ConfirmBar } from './components/ConfirmBar';
import { Dashboard } from './components/Dashboard';
import { GeneralDetail } from './dialogs/GeneralDetail';
import { MarkViewer } from './dialogs/MarkViewer';
import { inspectMark, type Inspect } from './components/marks';
import { Indicators, type SeatRefs } from './components/Indicators';
import { Photo } from './components/Photo';
import { Presents } from './components/Presents';
import { seatStyle, tableInset, tableTop } from './components/SeatRing';
import { useRingMetrics } from './components/useRingMetrics';
import { SidePanel } from './components/SidePanel';
import { Toasts } from './components/Toasts';
import { TableStage } from './table/TableStage';
import { DialogHost } from './dialogs/DialogHost';
import { makeReply } from './dialogs/reply';
import { LtkLua } from './ltk/LtkLua';
import type { TargetTip } from './ltk/types';
import { makeNaming, RoomProvider, useRoom, useRoomState, useScene, type RoomServices } from './RoomContext';
import { SkinPicker } from './skins';
import { RoomStore } from './state/store';
import './room.css';

export function RoomView(props: RoomViewProps) {
  const {
    client, assets: manifest, meId, mode, chat, onChat, playback, statusSlot,
    onPlayAgain, onLeave,
  } = props;

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
  const anim = useMemo(() => new AnimBus(
    (s: string) => services.lua.tr(s),
    // The four cutscenes put a general's portrait on screen — and two of them
    // put up the portrait the seat just *became*. `mobile` because every one of
    // the eight scenes belongs to a general in that pack; `generalPortrait`
    // falls back to `standard` and then to a bare key on its own, and answers
    // `undefined` for anything the pipeline did not ship, which draws no plate
    // rather than a broken one.
    (general: string) => services.assets.generalPortrait(general, 'mobile'),
  ), [services]);
  useEffect(() => () => anim.dispose(), [anim]);

  /**
   * The table's sound. `RoomStore.onSound` is the hook the store has carried
   * since it was written and nothing listened to; `attach` is that hook, plus
   * the two lookups a cue needs from live state (whose general just died, which
   * role the viewer is playing). Everything that can make a noise is behind a
   * dynamic import and is not loaded until the player turns sound on.
   */
  useEffect(() => roomAudio.attach(store), [store]);
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
      // Drawing, judging and the two ends of the game are not `LogEvent`s, so
      // they never reach `onSound`. The bus ignores `LogEvent` here for exactly
      // that reason: one message must never make two sounds.
      roomAudio.notify(command, data);
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
        <RoomBody
          chat={chat}
          onChat={onChat}
          playback={playback}
          statusSlot={statusSlot}
          onPlayAgain={onPlayAgain}
          onLeave={onLeave}
        />
      </AnimProvider>
    </RoomProvider>
  );
}

function RoomBody(
  { chat, onChat, playback, statusSlot, onPlayAgain, onLeave }:
  Pick<RoomViewProps, 'chat' | 'onChat' | 'playback' | 'statusSlot' | 'onPlayAgain' | 'onLeave'>,
) {
  const { lua, mode, store } = useRoom();
  const state = useRoomState();
  const scene = useScene();
  const seatsRef = useRef<HTMLDivElement>(null);
  const refs = useRef<SeatRefs>(new Map());
  const [detail, setDetail] = useState<string | null>(null);
  /** The pile a player tapped open. Read-only; see `dialogs/MarkViewer.tsx`. */
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // The photo size is chosen against the number of seats actually at the table:
  // eight seats need a smaller photo than three before they stop touching.
  const metrics = useRingMetrics(container, state.playerNum || 8);

  useEffect(() => { setContainer(seatsRef.current); }, []);

  const interactive = mode === 'play';
  const photoItems = scene.items.Photo ?? {};

  /**
   * The per-seat targeting hints, re-asked exactly when `Room.qml:745-753`
   * re-asks them: once per scene change, for every seat.
   *
   * `store.scene` is replaced wholesale by `applySceneChange`, so its identity
   * is the "the request moved" signal and this memo does not run on the 5 Hz
   * status poll. `GetTargetTip` itself returns immediately unless an active
   * skill is mid-selection (`client_util.lua:971`), so the eight calls a real
   * scene change costs are eight early returns for all but the handful of
   * skills that publish a tip.
   */
  const targetTips = useMemo(() => {
    const out = new Map<number, readonly TargetTip[]>();
    if (!interactive || !scene.active) return out;
    for (const id of Object.keys(scene.items.Photo ?? {})) {
      const pid = Number(id);
      if (!Number.isFinite(pid)) continue;
      let tips: readonly TargetTip[] = [];
      try { tips = lua.getTargetTip(pid); } catch { /* engine gone */ }
      if (tips.length) out.set(pid, tips);
    }
    return out;
  }, [scene, lua, interactive]);

  const clickPhoto = useCallback((pid: number, selected: boolean) => {
    lua.interact('Photo', pid, 'click', { selected, autoTarget: false });
  }, [lua]);

  /**
   * Tapping a mark or a pile counter on a seat — `MarkArea.qml`'s `TapHandler`.
   *
   * The branch that decides WHAT a mark holds is `inspectMark`, and every
   * question it asks (which cards are in the pile, which of them this viewer may
   * see) goes to the client VM. A chip whose branch resolves to nothing opens
   * nothing, which is upstream's behaviour for another seat's private pile.
   */
  const onInspect = useCallback((pid: number, key: string, value: unknown) => {
    setInspect(inspectMark(lua, key, value, pid));
  }, [lua]);

  /** Answer a dialog-shaped request. See `dialogs/reply.ts`. */
  const reply = useMemo(() => makeReply(store, lua), [store, lua]);

  const order = state.circle.length ? state.circle : Object.keys(state.players).map(Number);
  // Two features ride the chat channel, so the raw feed carries messages nobody
  // should read as they arrive: a thrown flower is dropped and a quick chat is
  // rewritten to the sentence it stands for. `chat/feed.ts` is both, and is why
  // the log and the bubbles need to know about neither. `Presents` still gets
  // the raw list — the arc it draws is a present's whole appearance.
  const spoken = useMemo(() => spokenChat(chat, (key) => lua.tr(key)), [chat, lua]);
  const bubbles = useChatBubbles(spoken);
  // And the sound of one, on every client that sees it. Not tied to the panel:
  // the table hears a quick chat whether or not anybody is on the chat tab.
  useQuickChatVoice(chat);

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
                  piles={state.piles[pid]}
                  item={interactive ? photoItems[String(pid)] : undefined}
                  isCurrent={state.currentId === pid}
                  handCount={(state.hands[pid] ?? []).length}
                  focus={state.focus}
                  bubble={bubbles.get(pid)}
                  targetTips={targetTips.get(pid)}
                  onClick={clickPhoto}
                  onInspect={onInspect}
                />
              </div>
            );
          })}

          <TableStage />
          {/* `ShowToast` — the engine announcing something it also logged.
              Inside the ring and over everything in it, including a request
              dialog: the commonest toasts are the four `#*Draw` lines that say
              why the game just ended. See `components/Toasts.tsx`. */}
          <Toasts />
          <Indicators seatRefs={refs.current} container={container} />
          <Presents chat={chat} onChat={onChat} seatRefs={refs.current} container={container} seats={order} ring={metrics} />
          {playback ? <PlaybackBar playback={playback} /> : null}
        </div>

        <SidePanel chat={spoken} onChat={onChat} />
        {statusSlot ? <div style={{ position: 'absolute', right: 8, bottom: 8, zIndex: 20 }}>{statusSlot}</div> : null}
      </div>

      {/* Alternate artwork for the viewer's own general. It offers itself once,
          the first time this seat is given a general the catalogue has art for,
          and is reachable from its corner chip for the rest of the game. Given
          only the general — a skin is a local preference and has no business
          knowing anything else about the table. See `skins/SkinPicker.tsx`. */}
      <SkinPicker general={state.selfId == null ? undefined : state.players[state.selfId]?.general} />

      {/* The question, then the cards it is about. See `ConfirmBar.tsx`. */}
      <ConfirmBar />
      <Dashboard />

      <Boundary label={requestLabel(state.request)}>
        <DialogHost
          onReply={reply}
          interactive={interactive}
          onPlayAgain={onPlayAgain}
          onLeave={onLeave}
        />
      </Boundary>
      {/* A tapped pile or general list. Floats over the table without taking
          it away, so a request stays answerable while it is open. */}
      {inspect ? (
        <MarkViewer
          spec={inspect}
          onClose={() => setInspect(null)}
          onGeneral={(name) => setDetail(name)}
        />
      ) : null}
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
