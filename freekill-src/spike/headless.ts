// Headless-measurable entry: runs the whole spike at module-evaluation time so
// the document's load event does not fire until the game is over. That is what
// makes `chrome --headless --dump-dom` a usable measuring instrument.
import { createVm, installHost } from './engine.js';

export async function runSpikeInTab(pinOrder: boolean, loadOnly = false): Promise<[string, string][]> {
  const rows: [string, string][] = [];
  const mem = () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  let peak = 0;
  const mark = () => { const m = mem(); if (m && m.usedJSHeapSize > peak) peak = m.usedJSHeapSize; };

  const t0 = performance.now();
  const bundle = (await (await fetch(`${import.meta.env.BASE_URL}lua-bundle.json`)).json()) as Record<string, string>;
  const tFetch = performance.now();
  mark();
  const { lua, FS } = await createVm(bundle, {
    traceAllocations: true, wasmUri: `${import.meta.env.BASE_URL}glue.wasm`,
  });
  installHost({ lua, FS }, { logLevels: new Set(['error']) });
  const tMount = performance.now();
  mark();
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  const tBoot = performance.now();
  mark();

  rows.push(['bundle fetch ms', (tFetch - t0).toFixed(0)]);
  rows.push(['vm + mount ms', (tMount - tFetch).toFixed(0)]);
  rows.push(['engine load ms', (tBoot - tMount).toFixed(0)]);
  rows.push(['COLD READY ms', (tBoot - t0).toFixed(0)]);
  rows.push(['lua heap after load MiB', (lua.global.getMemoryUsed() / 1048576).toFixed(1)]);

  if (pinOrder) lua.doStringSync(`FKWeb.pinIterationOrder()`);
  rows.push(['order pinned', String(pinOrder)]);
  rows.push(['pairs head', String(lua.doStringSync(`return FKWeb.pairsHead(6)`))]);

  if (loadOnly) { rows.push(['loadonly', 'true']); return rows; }
  lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
  const resumes = lua.doStringSync(`return FKWeb.run()`) as number;
  const tGame = performance.now();
  mark();
  const s = JSON.parse(lua.doStringSync(`return FKWeb.summary()`) as string) as
    { messages: number; steps: number; final_state_digest: string };

  rows.push(['game ms', (tGame - tBoot).toFixed(0)]);
  rows.push(['resumes', String(resumes)]);
  rows.push(['messages', String(s.messages)]);
  rows.push(['decisions', String(s.steps)]);
  rows.push(['final state digest', s.final_state_digest]);
  rows.push(['lua heap after game MiB', (lua.global.getMemoryUsed() / 1048576).toFixed(1)]);
  rows.push(['peak js heap MiB', peak ? (peak / 1048576).toFixed(1) : 'n/a']);
  // Hash of the decision log itself. If two hosts agree on this, they played
  // the same game — regardless of what their state-digest encoding says.
  rows.push(['command log hash', String(lua.doStringSync(
    `return FKWeb.canon.hash(FKWeb.dumpLogLua())`))]);
  rows.push(['command log bytes', String(lua.doStringSync(`return #FKWeb.dumpLogLua()`))]);
  return rows;
}
