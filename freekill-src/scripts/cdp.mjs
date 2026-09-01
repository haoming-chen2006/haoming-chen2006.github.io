// A very small Chrome DevTools Protocol client, on node's built-in WebSocket.
// Used by the load measurement and the smoke walk. No test dependency added,
// because a browser dependency that only two scripts need is not worth the
// lockfile churn.
//
// Two things here are load-bearing rather than convenient:
//
//  * `click()` dispatches real `Input.dispatchMouseEvent` pairs, not
//    `element.click()`. React's synthetic event system does deliver a
//    scripted `.click()` in most cases, but not reliably through this app's
//    dialogs and portals — it silently does nothing, which sends you chasing a
//    bug that is not there. Real input goes through the same path a person does.
//  * `newPage({ isolated: true })` opens a page in its own browser context, so
//    it gets its own localStorage and therefore its own anonymous Supabase
//    identity. That is what makes a genuine two-player test possible in one
//    browser: two isolated contexts are two machines as far as the app is
//    concerned.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * `profileDir` keeps the browser's storage — and therefore its anonymous
 * Supabase identity — across runs. That is not a speed tweak: anonymous
 * sign-ups are rate limited per IP, so a walk that mints a fresh user every
 * time starts failing at sign-in after a dozen runs, which looks exactly like
 * a flaky app and is not one. Anything testing the first-run experience wants
 * the default throwaway profile instead.
 */
export async function launch({ width = 1440, height = 900, profileDir } = {}) {
  const profile = profileDir ?? mkdtempSync(join(tmpdir(), 'fk-chrome-'));
  if (profileDir) mkdirSync(profileDir, { recursive: true });

  const spawnChrome = () => {
    const proc = spawn(CHROME, [
      '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
      '--no-first-run', '--no-default-browser-check', '--disable-gpu',
      // Headless Chrome plays audio through the system's default output. A test
      // run that exercises the game's sound therefore comes out of whoever is
      // wearing headphones -- which is exactly what happened. Muting the tab is
      // not enough on its own, so also decline the real audio device: the page
      // still creates and drives its AudioContext, so anything asserting that a
      // sound *was played* keeps working, it simply reaches no speaker.
      '--mute-audio', '--disable-audio-output',
      `--window-size=${width},${height}`, 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    return { proc, url: new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error('chrome did not report a debugger url')), 15000);
      proc.stderr.on('data', (d) => {
        buf += d;
        const m = /ws:\/\/[^\s]+/.exec(buf);
        if (m) { clearTimeout(timer); resolve(m[0]); }
      });
      proc.on('exit', (c) => { clearTimeout(timer); reject(new Error(`chrome exited ${c}`)); });
    }) };
  };

  // A reused profile is locked until the previous Chrome has fully exited, and
  // it does not exit the instant its parent stops waiting. Back-to-back runs of
  // a walk therefore hit a "chrome exited 21" that has nothing to do with the
  // app — so retry rather than report a phantom failure.
  let chrome;
  let wsUrl;
  for (let attempt = 1; ; attempt++) {
    const started = spawnChrome();
    chrome = started.proc;
    try {
      wsUrl = await started.url;
      break;
    } catch (e) {
      chrome.kill();
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let nextId = 1;
  const pending = new Map();
  const events = [];

  /**
   * A browser that dies takes every in-flight call with it, and a `waitFor`
   * that is awaiting a reply which is never coming hangs for good — which in a
   * loop means the whole run stalls rather than failing. So a dead browser is
   * reported as a failure, loudly, on the call that was waiting.
   */
  const failAll = (reason) => {
    const err = new Error(reason);
    for (const { reject } of pending.values()) reject(err);
    pending.clear();
  };
  ws.addEventListener('close', () => failAll('devtools socket closed (did chrome crash?)'));
  chrome.on('exit', (code) => failAll(`chrome exited ${code} mid-run`));
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  /** One tab, with everything a walk needs to drive it. */
  async function attach(targetId) {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    await call('Page.enable');
    await call('Network.enable');
    await call('Runtime.enable');

    const mine = (e) => e.sessionId === sessionId;

    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await call('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise: true,
      });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    };

    const waitFor = async (expression, timeoutMs = 15000) => {
      const start = Date.now();
      for (;;) {
        if (await evaluate(expression)) return Date.now() - start;
        if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for: ${expression}`);
        await new Promise((r) => setTimeout(r, 60));
      }
    };

    /**
     * Find a visible, enabled element and click it the way a person would.
     * `text` narrows a selector to the element whose text matches, which is how
     * every Chinese-labelled control in this app is identified.
     */
    const click = async (selector, { text, nth = 0, timeoutMs = 15000 } = {}) => {
      const pattern = text ? String(text) : null;
      const start = Date.now();
      for (;;) {
        const box = await evaluate(`(() => {
          const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
            .filter((e) => !e.disabled && e.getClientRects().length > 0);
          const want = ${pattern === null ? 'null' : JSON.stringify(pattern)};
          const hits = want === null ? els : els.filter((e) => e.textContent.includes(want));
          const el = hits[${nth}];
          if (!el) return null;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: el.textContent.trim().slice(0, 40) };
        })()`);
        if (box) {
          for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
            await call('Input.dispatchMouseEvent', {
              type, x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1,
            });
          }
          return box.text;
        }
        if (Date.now() - start > timeoutMs) {
          throw new Error(`no clickable ${selector}${pattern ? ` containing ${pattern}` : ''}`);
        }
        await new Promise((r) => setTimeout(r, 80));
      }
    };

    /** React reads `value` off the prototype setter; a plain assignment is ignored. */
    const setInput = (selector, value) => evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('no input ' + ${JSON.stringify(selector)});
      Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set
        .call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);

    const screenshot = async (path) => {
      const { data } = await call('Page.captureScreenshot', { format: 'png' });
      writeFileSync(path, Buffer.from(data, 'base64'));
      return path;
    };

    const errors = () => events
      .filter((e) => e.method === 'Runtime.exceptionThrown' && mine(e))
      .map((e) => e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text);

    const consoleLines = (types = ['error', 'warning']) => events
      .filter((e) => e.method === 'Runtime.consoleAPICalled' && mine(e) && types.includes(e.params.type))
      .map((e) => `[${e.params.type}] ${e.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);

    const goto = (url) => call('Page.navigate', { url });

    return { call, evaluate, waitFor, click, setInput, goto, screenshot, errors, consoleLines, events, targetId };
  }

  const contexts = [];
  /** A fresh tab. `isolated` gives it its own storage, and so its own identity. */
  const newPage = async ({ isolated = false, url = 'about:blank' } = {}) => {
    let browserContextId;
    if (isolated) {
      ({ browserContextId } = await send('Target.createBrowserContext', { disposeOnDetach: false }));
      contexts.push(browserContextId);
    }
    const { targetId } = await send('Target.createTarget', { url, ...(browserContextId ? { browserContextId } : {}) });
    return attach(targetId);
  };

  const first = await newPage();

  const close = async () => {
    for (const id of contexts) await send('Target.disposeBrowserContext', { browserContextId: id }).catch(() => {});
    ws.close();
    chrome.kill();
    await new Promise((r) => setTimeout(r, 300));
    if (!profileDir) rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };

  return { ...first, newPage, events, close };
}
