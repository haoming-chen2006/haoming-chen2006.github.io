// Agent 0's spike page: boots the real engine in this tab and plays a full
// standard 身份局, so cold-load time and peak tab memory are measured in a
// browser rather than projected from node.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createVm, installHost } from './engine.js';

type Row = { label: string; value: string };

export function SpikePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const push = (label: string, value: string) =>
    setRows((r) => [...r, { label, value }]);

  const run = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    setBusy(true);
    const mem = () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const t0 = performance.now();
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}lua-bundle.json`);
      const bundle = (await res.json()) as Record<string, string>;
      const tFetch = performance.now();
      push('bundle fetch', `${(tFetch - t0).toFixed(0)} ms, ${Object.keys(bundle).length} files`);

      const { lua, FS } = await createVm(bundle, { traceAllocations: true, wasmUri: `${import.meta.env.BASE_URL}glue.wasm` });
      installHost({ lua, FS }, { logLevels: new Set(['error']) });
      const tMount = performance.now();
      push('vm + mount', `${(tMount - tFetch).toFixed(0)} ms`);

      lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
      const tBoot = performance.now();
      push('engine load', `${(tBoot - tMount).toFixed(0)} ms`);
      push('COLD READY', `${(tBoot - t0).toFixed(0)} ms`);
      if (mem()) push('js heap after load', `${(mem()!.usedJSHeapSize / 1048576).toFixed(1)} MiB`);
      push('lua heap after load', `${(lua.global.getMemoryUsed() / 1048576).toFixed(1)} MiB`);

      const pin = new URLSearchParams(location.search).has('pinorder');
      if (pin) lua.doStringSync(`FKWeb.pinIterationOrder()`);
      push('order pinned', String(pin));
      push('pairs head', String(lua.doStringSync(`return FKWeb.pairsHead(6)`)));
      lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
      const resumes = lua.doStringSync(`return FKWeb.run()`);
      const tGame = performance.now();
      push('full game', `${(tGame - tBoot).toFixed(0)} ms, ${resumes} resumes`);
      const summary = JSON.parse(lua.doStringSync(`return FKWeb.summary()`)) as {
        messages: number; steps: number; final_state_digest: string;
      };
      push('messages / decisions', `${summary.messages} / ${summary.steps}`);
      push('final state digest', summary.final_state_digest);
      push('lua heap after game', `${(lua.global.getMemoryUsed() / 1048576).toFixed(1)} MiB`);
      if (mem()) push('PEAK js heap', `${(mem()!.usedJSHeapSize / 1048576).toFixed(1)} MiB`);
      document.title = `SPIKE_DONE ${summary.final_state_digest}`;
      console.log('[spike] done', summary.final_state_digest);
    } catch (e) {
      push('FAILED', String(e));
      console.error('[spike] failed', e);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).has('autorun')) void run();
  }, [run]);

  return (
    <main style={{ font: '14px ui-monospace, monospace', padding: 24, maxWidth: 720 }}>
      <h1 style={{ font: '600 20px system-ui' }}>FreeKill engine — browser spike</h1>
      <p>Boots the Lua 5.4 VM, loads 299 engine files, plays an 8-player 身份局 to GameOver.</p>
      <button onClick={run} disabled={busy} style={{ padding: '8px 16px', fontSize: 14 }}>
        {busy ? 'running…' : 'run'}
      </button>
      <table style={{ marginTop: 16, borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: '2px 16px 2px 0', opacity: 0.7 }}>{r.label}</td>
              <td style={{ padding: '2px 0' }}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
