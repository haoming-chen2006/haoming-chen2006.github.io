/**
 * Runs the browser harness in a real headless Chrome and reports the result.
 *
 *   npx vite-node src/engine/dev/browser.ts -- [url]
 *
 * Drives Chrome over the DevTools Protocol using node 22's built-in WebSocket,
 * so this needs no dependency the project does not already have. Deliberately
 * no `--virtual-time-budget`: it virtualises timers, which both hangs a
 * `requestAnimationFrame` loop and makes the main-thread responsiveness
 * measurement meaningless.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const URL_ = process.argv[2] ?? 'http://127.0.0.1:5199/freekill/src/engine/dev/harness.html';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--enable-precise-memory-info',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/fk-chrome-${process.pid}`,
  URL_,
]);
chrome.stderr.on('data', () => {});

async function target(): Promise<string> {
  for (let i = 0; i < 60; i++) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()) as {
        type: string;
        url: string;
        webSocketDebuggerUrl: string;
      }[];
      const page = list.find((t) => t.type === 'page' && t.url.includes('harness.html'));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('chrome devtools endpoint never appeared');
}

const ws = new WebSocket(await target());
await new Promise<void>((r) => ws.addEventListener('open', () => r(), { once: true }));

let id = 0;
function evaluate(expression: string): Promise<unknown> {
  const msg = { id: ++id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } };
  return new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      const data = JSON.parse(String(ev.data));
      if (data.id !== msg.id) return;
      ws.removeEventListener('message', onMessage);
      if (data.error) reject(new Error(JSON.stringify(data.error)));
      else resolve(data.result?.result?.value);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify(msg));
  });
}

let result: Record<string, unknown> | null = null;
for (let i = 0; i < 240; i++) {
  result = (await evaluate('window.__fkResult ?? null')) as Record<string, unknown> | null;
  if (result) break;
  await sleep(1000);
}
const text = await evaluate('document.getElementById("log")?.innerText ?? ""');
console.log(String(text));
console.log('---');
console.log(JSON.stringify(result, null, 2));
ws.close();
chrome.kill();
process.exit(result && (result as { pass?: boolean }).pass ? 0 : 1);
