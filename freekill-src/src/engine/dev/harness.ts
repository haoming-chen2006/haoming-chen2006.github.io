/**
 * Proves the engine in an actual browser, not just under node.
 *
 * The host VM runs in a real `Worker`; the client VM runs on the main thread
 * and is fed the routed stream. While the worker plays, a `requestAnimationFrame`
 * loop samples the main thread - if the authority were running here, the frames
 * would stop.
 */
import wasmUri from 'wasmoon/dist/glue.wasm?url';
import bundleUrl from './lua-bundle.json?url';
import { fetchBundle } from '../bundle.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { allBotSeats } from '../luaHost.ts';
import { domEndpoint } from '../../worker/protocol.ts';
import { WorkerLuaHost } from '../../worker/workerHost.ts';
import type { Envelope } from '../../contract/protocol.ts';

const logEl = document.getElementById('log')!;
const lines: string[] = [];
const say = (s: string, cls = '') => {
  lines.push(cls ? `<span class="${cls}">${s}</span>` : s);
  logEl.innerHTML = lines.join('\n');
};

// Frame sampling: the main thread must keep painting while the worker plays.
let frames = 0;
let worstGap = 0;
let lastFrame = performance.now();
let sampling = true;
const sample = () => {
  const now = performance.now();
  worstGap = Math.max(worstGap, now - lastFrame);
  lastFrame = now;
  frames += 1;
  if (sampling) requestAnimationFrame(sample);
};
requestAnimationFrame(sample);

(async () => {
  try {
    const t0 = performance.now();
    const bundle = await fetchBundle(bundleUrl);
    say(`bundle: ${Object.keys(bundle).length} files in ${(performance.now() - t0).toFixed(0)}ms`);

    const client = await MainThreadLuaClient.create(bundle, { playerId: 1, screenName: 'me' }, { wasmUri });
    say(`client VM up (main thread) at ${(performance.now() - t0).toFixed(0)}ms`);

    const worker = new Worker(new URL('../../worker/hostWorker.ts', import.meta.url), {
      type: 'module',
    });
    const host = await WorkerLuaHost.connect(domEndpoint(worker as never), { bundle, wasmUri });
    say(`host VM up (worker) at ${(performance.now() - t0).toFixed(0)}ms`);

    let uiEvents = 0;
    let requestScenes = 0;
    let enabledCardScenes = 0;
    client.onNotifyUI((command, data) => {
      uiEvents += 1;
      if (command !== 'UpdateRequestUI') return;
      requestScenes += 1;
      const cards = (data as Record<string, unknown>).CardItem;
      if (Array.isArray(cards) && (cards as { enabled?: boolean }[]).some((c) => c.enabled)) {
        enabledCardScenes += 1;
      }
    });

    const envelopes: Envelope[] = [];
    host.onOutput((e) => {
      envelopes.push(e);
      if (e.to === null || e.to === 1) client.deliverEnvelope(e);
    });

    const seed = Number(new URLSearchParams(location.search).get('seed') ?? 20260828);
    await host.createRoom({
      roomId: 'browser-1',
      seed,
      seats: allBotSeats(8),
      ownerId: 1,
      timeout: 15,
      settings: { gameMode: 'aaa_role_mode' },
    });
    const tGame = performance.now();
    const res = await host.advance();
    sampling = false;

    const stats = await host.stats();
    const digest = await host.stateDigest();
    const decisions = await host.decisionsFrom(1);
    say(`game: over=${res.over} in ${(performance.now() - tGame).toFixed(0)}ms, ${res.resumes} resumes`);
    say(`decisions ${stats.decisions}, messages ${stats.messages}, envelopes ${envelopes.length}`);
    say(`lua heap in worker: ${(stats.luaHeapKiB / 1024).toFixed(1)} MiB`);
    say(`state digest: ${digest}`);
    say(`client: ${uiEvents} notifyUI, ${requestScenes} scenes, ${enabledCardScenes} with an enabled card`);
    say(`client errors: ${JSON.stringify(client.errors())}`);
    say(`main thread: ${frames} frames, worst gap ${worstGap.toFixed(0)}ms`);

    // Replay the log in a second worker and compare every boundary.
    const worker2 = new Worker(new URL('../../worker/hostWorker.ts', import.meta.url), {
      type: 'module',
    });
    const host2 = await WorkerLuaHost.connect(domEndpoint(worker2 as never), { bundle, wasmUri });
    await host2.replay(
      {
        roomId: 'browser-1',
        seed,
        seats: allBotSeats(8),
        ownerId: 1,
        timeout: 15,
        settings: { gameMode: 'aaa_role_mode' },
      },
      decisions,
    );
    const replayed = await host2.decisionsFrom(1);
    let first = -1;
    for (let i = 0; i < Math.min(decisions.length, replayed.length); i++) {
      if (
        decisions[i].playerId !== replayed[i].playerId ||
        decisions[i].command !== replayed[i].command ||
        decisions[i].digest !== replayed[i].digest
      ) {
        first = i;
        break;
      }
    }
    const replayDigest = await host2.stateDigest();
    say(
      `replay: ${replayed.length}/${decisions.length} boundaries, first divergence ${first}, ` +
        `digest ${replayDigest}`,
    );

    const good =
      res.over &&
      client.errors().length === 0 &&
      enabledCardScenes > 0 &&
      first === -1 &&
      replayDigest === digest &&
      frames > 30;
    say(good ? 'RESULT: PASS' : 'RESULT: FAIL', good ? 'ok' : 'bad');
    (window as unknown as { __fkResult: unknown }).__fkResult = {
      pass: good,
      d1: decisions[0]?.digest,
      d10: decisions[9]?.digest,
      d100: decisions[99]?.digest,
      dLast: decisions[decisions.length - 1]?.digest,
      decisions: stats.decisions,
      messages: stats.messages,
      digest,
      replayDigest,
      firstDivergence: first,
      frames,
      worstGap,
      enabledCardScenes,
      errors: client.errors(),
    };
  } catch (e) {
    sampling = false;
    say(`THREW: ${e instanceof Error ? `${e.message}\n${e.stack}` : String(e)}`, 'bad');
    (window as unknown as { __fkResult: unknown }).__fkResult = { pass: false, error: String(e) };
  }
})();
