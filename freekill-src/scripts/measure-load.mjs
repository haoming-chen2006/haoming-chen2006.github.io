// Cold-load measurement against a real browser, no test dependency added.
//
// Launches headless Chrome, drives it over the DevTools protocol with node's
// built-in WebSocket, disables the HTTP cache, optionally throttles the network,
// and reports what a first-time visitor actually waits for: bytes over the wire
// and the moment the lobby is on screen and usable.
//
//   node scripts/measure-load.mjs [url] [--throttle=5] [--shot=out.png]
//
// `--throttle` is Mbps downlink (Network.emulateNetworkConditions). The
// acceptance criterion is "a playable lobby in under 10 seconds on a normal
// connection", so the default run is unthrottled and a throttled run is the
// honest cross-check.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4173/freekill/';
const throttleMbps = Number(args.find((a) => a.startsWith('--throttle='))?.split('=')[1] ?? 0);
const shot = args.find((a) => a.startsWith('--shot='))?.split('=')[1];

const profile = mkdtempSync(join(tmpdir(), 'fk-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=1440,900', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const timer = setTimeout(() => reject(new Error('chrome did not report a debugger url')), 15000);
  chrome.stderr.on('data', (d) => {
    buf += d;
    const m = /ws:\/\/[^\s]+/.exec(buf);
    if (m) { clearTimeout(timer); resolve(m[0]); }
  });
  chrome.on('exit', (c) => { clearTimeout(timer); reject(new Error(`chrome exited ${c}`)); });
});

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 1;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) {
    events.push(msg);
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const call = (method, params) => send(method, params, sessionId);

await call('Page.enable');
await call('Network.enable');
await call('Runtime.enable');
await call('Network.setCacheDisabled', { cacheDisabled: true });
if (throttleMbps > 0) {
  await call('Network.emulateNetworkConditions', {
    offline: false, latency: 40,
    downloadThroughput: (throttleMbps * 1e6) / 8,
    uploadThroughput: (throttleMbps * 1e6) / 8,
  });
}

const t0 = Date.now();
await call('Page.navigate', { url });

/** Poll for the lobby actually being on screen — not merely `load`. */
async function waitFor(expression, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { result } = await call('Runtime.evaluate', { expression, returnByValue: true });
    if (result.value) return Date.now() - t0;
    if (Date.now() > deadline) return null;
    await new Promise((r) => setTimeout(r, 50));
  }
}

const firstPaint = await waitFor(`!!document.querySelector('#boot h1, .boot-screen')`);
// "Playable lobby" = signed-out landing with the name box, or the lobby itself.
const interactive = await waitFor(
  `!!document.querySelector('.landing input[type=text], .rooms, .page')`);

await new Promise((r) => setTimeout(r, 1200)); // let late requests settle

const responses = new Map();
let bytes = 0;
for (const e of events) {
  if (e.method === 'Network.responseReceived') {
    responses.set(e.params.requestId, e.params.response.url);
  }
  if (e.method === 'Network.loadingFinished') {
    bytes += e.params.encodedDataLength ?? 0;
  }
}

const { result: metrics } = await call('Runtime.evaluate', {
  expression: `JSON.stringify({
    nav: performance.getEntriesByType('navigation')[0]?.toJSON() ?? null,
    resources: performance.getEntriesByType('resource').map(r => ({
      name: r.name.split('/').slice(-1)[0], size: r.transferSize, ms: Math.round(r.responseEnd),
    })),
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
  })`,
  returnByValue: true,
});
const m = JSON.parse(metrics.value);

if (shot) {
  const { data } = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync(shot, Buffer.from(data, 'base64'));
}

const errors = events
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => e.params.exceptionDetails.text);

console.log(`url                 ${url}`);
console.log(`throttle            ${throttleMbps > 0 ? `${throttleMbps} Mbps / 40 ms RTT` : 'none'}`);
console.log(`first paint         ${firstPaint} ms`);
console.log(`lobby interactive   ${interactive} ms   ${interactive !== null && interactive < 10000 ? '✓ under 10 s' : '✗'}`);
console.log(`FCP                 ${m.fcp ? Math.round(m.fcp) : '?'} ms`);
console.log(`transferred         ${(bytes / 1024).toFixed(0)} KB over ${responses.size} requests`);
const top = m.resources.filter((r) => r.size > 0).sort((a, b) => b.size - a.size).slice(0, 12);
for (const r of top) console.log(`  ${String(r.size).padStart(8)} B  ${String(r.ms).padStart(6)} ms  ${r.name}`);
if (errors.length) {
  console.log(`\npage errors (${errors.length}):`);
  for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
}

ws.close();
chrome.kill();
await new Promise((r) => setTimeout(r, 300));
rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
process.exit(errors.length || interactive === null ? 1 : 0);
