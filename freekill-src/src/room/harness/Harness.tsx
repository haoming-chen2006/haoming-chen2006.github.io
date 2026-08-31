/**
 * The room lane's development loop.
 *
 * Replays Agent 0's recorded `notifyUI` stream through the real `<RoomView>`
 * with play / pause / step / seek, and shows what the room is doing with it:
 * which frame it is on, which `UpdateRequestUI` tuples it produced, and which
 * `Lua.call`s the fixture could not answer. No engine, no network, no Supabase.
 *
 * The interaction panel is the part that matters for review: it is the proof
 * that every click leaves through `UpdateRequestUI(elemType, id, action, data)`
 * and nothing else.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssetManifest } from '../../contract/manifest';
import type { ChatLine, RoomMode } from '../../contract/views';
import fixtureManifest from '../../../fixtures/asset-manifest.json';
import devManifest from '../dev/data/asset-manifest.dev.json';
import { FixtureLuaClient } from '../fixture/FixtureLuaClient';
import type { Language } from '../fixture/luaData';
import { RoomView } from '../RoomView';
import {
  commandHistogram, describeScene, initialDrawPile, notifyFrames, recordedRequests,
  injectableRequests, recordedScenes, recordedSeat,
} from './fixtureStream';
import './harness.css';

const SPEEDS = [1, 4, 16, 64, 256];
type Panel = 'frames' | 'interactions' | 'coverage' | 'scenes';

/**
 * Put the room into a recorded request state.
 *
 * A harvested diff is only half of a request: whether the room is *asking*
 * anything is carried by the request command, not by the diff (see
 * `applySceneChange`). The engine always sends both, in this order; the
 * harness has to as well, or the injected scene renders as a dead board.
 * `PlayCard` is the generic "you may act" ask, which is what these diffs are.
 */
function injectScene(client: FixtureLuaClient, diff: unknown): void {
  client.inject('CancelRequest', undefined);
  client.inject('PlayCard', null);
  client.inject('UpdateRequestUI', diff);
}

/**
 * Start position from the URL, so a particular frame can be linked, scripted or
 * screenshotted: `?at=1400&lang=en_US&assets=http://localhost:8123/&mode=replay`.
 */
function urlOptions() {
  const q = new URLSearchParams(location.search);
  return {
    at: Number(q.get('at') ?? 0) || 0,
    lang: (q.get('lang') as Language | null) ?? undefined,
    assets: q.get('assets') ?? undefined,
    mode: (q.get('mode') as RoomMode | null) ?? undefined,
    panel: (q.get('panel') as Panel | null) ?? undefined,
    // `?scene=4` injects one of the harvested UpdateRequestUI diffs on load.
    scene: q.get('scene') == null ? undefined : Number(q.get('scene')),
    // `?chat=1:hi,3:nice` seeds the chat panel and the seat bubbles.
    chat: (q.get('chat') ?? '').split(',').filter(Boolean).map((raw, i): ChatLine => {
      const [pid, ...rest] = raw.split(':');
      return {
        id: `u${i}`, playerId: Number(pid), displayName: `player${pid}`,
        text: rest.join(':'), at: Date.now(),
      };
    }),
  };
}
const URL_OPTS: ReturnType<typeof urlOptions> = typeof location === 'undefined'
  ? { at: 0, lang: undefined, assets: undefined, mode: undefined, panel: undefined, scene: undefined, chat: [] }
  : urlOptions();


export function Harness() {
  const [assetBase, setAssetBase] = useState(() => URL_OPTS.assets ?? localStorage.getItem('fk.assetBase') ?? '');
  // Two manifests, one shape. `fixture` is Agent 0's frozen, content-hashed
  // manifest — the shape the room ships against; its files do not exist until
  // Agent 4's pipeline runs. `dev` keeps engine-relative paths so pointing the
  // base at a static server rooted at the FreeKill checkout shows real art.
  const [assetSource, setAssetSource] = useState<'dev' | 'fixture'>(
    () => (localStorage.getItem('fk.assetSource') as 'dev' | 'fixture') ?? 'dev',
  );
  const [language, setLanguage] = useState<Language>(
    () => URL_OPTS.lang ?? (localStorage.getItem('fk.lang') as Language) ?? 'zh_CN',
  );
  const [mode, setMode] = useState<RoomMode>(URL_OPTS.mode ?? 'play');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(16);
  const [index, setIndex] = useState(0);
  const [interactionTick, setInteractionTick] = useState(0);
  const [panel, setPanel] = useState<Panel>(URL_OPTS.panel ?? 'frames');
  // The harness has no peer, so chat echoes back to the sender. It is enough to
  // exercise the panel, the bubbles over a seat and the reply path; Agent 2's
  // transport replaces the echo with the real channel.
  const [chat, setChat] = useState<readonly ChatLine[]>(() => URL_OPTS.chat);

  const [epoch, setEpoch] = useState(0);
  /** Frames to fast-forward as soon as a fresh client exists. */
  const [pendingAt, setPendingAt] = useState(URL_OPTS.at);

  /**
   * One client per (language, epoch). Everything reads this binding rather than
   * a ref: under StrictMode the memo factory runs twice, and a ref written
   * during render can end up pointing at the discarded instance — which is
   * exactly how you get a room that renders nothing while the counter advances.
   */
  const client = useMemo(
    () => new FixtureLuaClient({ frames: notifyFrames, language, initialDrawPile }),
    [language, epoch],
  );

  const manifest = useMemo<AssetManifest>(() => {
    const src = (assetSource === 'fixture' ? fixtureManifest : devManifest) as unknown as AssetManifest;
    return { ...src, base: assetBase || (assetSource === 'fixture' ? src.base : '') };
  }, [assetBase, assetSource]);

  useEffect(() => { localStorage.setItem('fk.assetBase', assetBase); }, [assetBase]);
  useEffect(() => { localStorage.setItem('fk.lang', language); }, [language]);
  useEffect(() => { localStorage.setItem('fk.assetSource', assetSource); }, [assetSource]);

  const stepN = useCallback((n: number) => {
    for (let i = 0; i < n && client.step(); i++) { /* advance */ }
    setIndex(client.cursor);
  }, [client]);

  // Fast-forward a fresh client. `cursor > 0` guards StrictMode's second mount.
  useEffect(() => {
    if (pendingAt > 0 && client.cursor === 0) {
      for (let i = 0; i < pendingAt && client.step(); i++) { /* advance */ }
      setPendingAt(0);
    }
    setIndex(client.cursor);
  }, [client, pendingAt]);

  useEffect(() => client.onInteraction(() => setInteractionTick((n) => n + 1)), [client]);

  useEffect(() => {
    if (URL_OPTS.scene == null) return;
    const sc = recordedScenes[URL_OPTS.scene];
    if (!sc) return;
    const t = setTimeout(() => injectScene(client, sc), 60);
    return () => clearTimeout(t);
  }, [client]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (client.done) { setPlaying(false); return; }
      stepN(speed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, stepN, client]);

  const seek = useCallback((target: number) => {
    setPlaying(false);
    if (target < client.cursor) {
      // Rewind by rebuilding: the room is a fold over the stream, so replaying
      // from zero is the only honest way back.
      setPendingAt(target);
      setEpoch((e) => e + 1);
      return;
    }
    stepN(target - client.cursor);
  }, [client, stepN]);

  const nextRequest = useCallback(() => {
    setPlaying(false);
    client.stepUntil((f) => f.command.startsWith('AskFor') || f.command === 'PlayCard');
    setIndex(client.cursor);
  }, [client]);

  const frame = notifyFrames[Math.max(0, index - 1)];
  const recent = notifyFrames.slice(Math.max(0, index - 40), index).reverse();

  return (
    <div className="hz">
      <header className="hz__bar">
        <strong>FreeKill Web — room harness</strong>
        <span className="hz__dim">
          seat {recordedSeat} · {notifyFrames.length} notify frames · fixtures only
        </span>

        <span className="hz__spacer" />

        <button type="button" onClick={() => { setPlaying(false); setPendingAt(0); setEpoch((e) => e + 1); }}>⟲ reset</button>
        <button type="button" onClick={() => stepN(1)}>step 1</button>
        <button type="button" onClick={() => stepN(20)}>step 20</button>
        <button type="button" onClick={nextRequest}>▶| next request</button>
        <button type="button" className={playing ? 'on' : ''} onClick={() => setPlaying((p) => !p)}>
          {playing ? '❚❚ pause' : '▶ play'}
        </button>
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
        <input
          type="range" min={0} max={notifyFrames.length} value={index}
          onChange={(e) => seek(Number(e.target.value))} style={{ width: 260 }}
        />
        <span className="hz__dim">{index}/{notifyFrames.length}</span>

        <span className="hz__spacer" />

        <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
          <option value="zh_CN">zh_CN</option>
          <option value="en_US">en_US</option>
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value as RoomMode)}>
          <option value="play">play</option>
          <option value="observe">observe</option>
          <option value="replay">replay</option>
        </select>
        <select value={assetSource} onChange={(e) => setAssetSource(e.target.value as 'dev' | 'fixture')}>
          <option value="dev">assets: dev paths</option>
          <option value="fixture">assets: fixture manifest</option>
        </select>
        <input
          className="hz__base" value={assetBase} placeholder="asset base URL (e.g. http://localhost:8123/)"
          onChange={(e) => setAssetBase(e.target.value)}
        />
      </header>

      <div className="hz__body">
        <div className="hz__room">
          <RoomView
            key={epoch}
            roomId="fixture"
            mode={mode}
            meId={mode === 'play' ? recordedSeat : null}
            seats={[]}
            client={client}
            assets={manifest}
            chat={chat}
            onChat={(text) => setChat((c) => [...c, {
              id: `c${c.length}`, playerId: recordedSeat, displayName: `player${recordedSeat}`,
              text, at: Date.now(),
            }])}
            onLeave={() => { /* no shell here */ }}
            playback={mode === 'play' ? undefined : {
              playing, index, total: notifyFrames.length,
              onPlayPause: () => setPlaying((p) => !p),
              onStep: (d) => (d > 0 ? stepN(d) : seek(Math.max(0, index + d))),
              onSeek: seek,
            }}
          />
        </div>

        <aside className="hz__side">
          <nav className="hz__tabs">
            {(['frames', 'interactions', 'coverage', 'scenes'] as const).map((t) => (
              <button key={t} type="button" className={panel === t ? 'on' : ''} onClick={() => setPanel(t)}>{t}</button>
            ))}
          </nav>

          {panel === 'frames' ? (
            <div className="hz__panel">
              <h4>current</h4>
              <pre>{frame ? `${index}. ${frame.command}\n${json(frame.data)}` : '—'}</pre>
              <h4>recent</h4>
              <ol className="hz__frames" start={index} reversed>
                {recent.map((f, i) => (
                  <li key={index - i} className={f.command.startsWith('AskFor') || f.command === 'PlayCard' ? 'req' : ''}>
                    <code>{f.command}</code>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {panel === 'interactions' ? (
            <div className="hz__panel">
              <h4>UpdateRequestUI sent by the room</h4>
              <p className="hz__dim">
                Every click leaves through this call and no other. A recording cannot
                answer one — the diff comes from the client VM's request handler —
                so the tuples are shown rather than applied.
              </p>
              <ol className="hz__frames" data-tick={interactionTick}>
                {[...client.interactions].reverse().map((i, k) => (
                  <li key={k}><code>{i.elemType}</code> {String(i.id)} <em>{i.action}</em> {json(i.data)}</li>
                ))}
                {client.interactions.length === 0 ? <li className="hz__dim">nothing yet</li> : null}
              </ol>
              <h4>Lua calls the fixture could not answer</h4>
              <ol className="hz__frames">
                {[...client.unanswered.values()].map((u) => (
                  <li key={u.fn}><code>{u.fn}</code> ×{u.count}</li>
                ))}
                {client.unanswered.size === 0 ? <li className="hz__dim">none</li> : null}
              </ol>
            </div>
          ) : null}

          {panel === 'coverage' ? <Coverage /> : null}

          {panel === 'scenes' ? (
            <div className="hz__panel">
              <p className="hz__dim">
                Scene diffs were harvested across 16 games and three seats. Injecting
                one puts the room into that request state so cards and targets can
                actually be clicked — this seat's own timeline never produced a scene
                with a selectable hand card (see the note in fixtureStream.ts).
              </p>
              <h4 style={{ marginTop: 0 }}>dialog requests</h4>
              <p className="hz__dim">
                One recorded payload per dialog-shaped request. <b>notify</b> is the
                shape the room really receives; <b>wire</b> is the pre-digestion
                payload, kept for requests this seat never saw — including{' '}
                <code>AskForGuanxing</code>, which fired only for other seats.
              </p>
              <ol className="hz__frames">
                {injectableRequests.map((r) => (
                  <li key={r.command}>
                    <button type="button" className="hz__inject" onClick={() => client.inject(r.command, r.data)}>
                      inject
                    </button>{' '}
                    <code>{r.command}</code> <em className="hz__dim">{r.source}</em>
                  </li>
                ))}
              </ol>

              <h4>recorded UpdateRequestUI diffs</h4>
              <ol className="hz__frames">
                {recordedScenes.map((sc, i) => (
                  <li key={i}>
                    <button type="button" className="hz__inject" onClick={() => injectScene(client, sc)}>
                      inject #{i}
                    </button>{' '}
                    {describeScene(sc)}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Coverage() {
  const hist = useMemo(() => commandHistogram(notifyFrames), []);
  const requests = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recordedRequests) m.set(r.command, (m.get(r.command) ?? 0) + 1);
    return m;
  }, []);
  return (
    <div className="hz__panel">
      <h4>request commands in this recording</h4>
      <table className="hz__table">
        <tbody>
          {[...requests.entries()].map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}
        </tbody>
      </table>
      <h4>every notify command</h4>
      <table className="hz__table">
        <tbody>
          {[...hist.entries()].map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function json(v: unknown): string {
  if (v === undefined) return '';
  const s = JSON.stringify(v);
  return s && s.length > 400 ? `${s.slice(0, 400)}…` : (s ?? '');
}

