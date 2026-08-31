/**
 * One seat: a browser of its own, a page, and the probe inside it.
 *
 * A seat is a whole Chrome process rather than a tab, for the same reason
 * `smoke-two.mjs` uses two: separate storage means a separate anonymous
 * Supabase identity, and separate identities are the only way two clients in
 * one test are two clients rather than two views of one. The profile persists,
 * because anonymous sign-up is rate limited to 30/hour per IP and a suite that
 * mints a fresh identity per run starts failing at the front door on run four.
 *
 * Two things here exist because a wedged browser has cost this project real
 * time. Every call into the page is bounded — a renderer blocked in the client
 * Lua VM will not answer a `Runtime.evaluate`, and an unbounded await there
 * hangs the whole suite instead of failing one game. And the round-trip time of
 * a trivial evaluate is recorded on every call, because that number *is* the
 * main thread's block time, which is the measurable form of "a lot of delay".
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from '../cdp.mjs';
import { PROBE_SRC, PROBE_VERSION } from './probe.mjs';

export class SeatTimeout extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Reject rather than hang. A dead or blocked renderer is a finding, not a wait. */
function bounded(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, rej) => {
      timer = setTimeout(() => rej(new SeatTimeout(`${label} did not answer in ${ms} ms`)), ms);
    }),
  ]);
}

export class Seat {
  /**
   * @param {string} id     short label used in logs ('p1')
   * @param {string} name   the display name typed on the landing page
   */
  constructor(id, name, browser, opts) {
    this.id = id;
    this.name = name;
    this.b = browser;
    this.opts = opts;
    /** Everything the engine told this tab, in order. */
    this.stream = [];
    /** Everything this tab sent back, in order. */
    this.outbox = [];
    /** window.onerror / unhandledrejection, from the page itself. */
    this.pageErrors = [];
    /** Round-trip time of the cheapest possible evaluate, sampled per call. */
    this.pings = [];
    this.closed = false;
  }

  /* ------------------------------------------------------------- plumbing */

  async evaluate(expr, { timeoutMs = 20000, label = 'evaluate' } = {}) {
    if (this.closed) throw new SeatTimeout(`${this.id} is closed`);
    const t0 = Date.now();
    const v = await bounded(this.b.evaluate(expr), timeoutMs, `${this.id} ${label}`);
    const dt = Date.now() - t0;
    this.pings.push(dt);
    if (this.pings.length > 4000) this.pings.splice(0, 2000);
    return v;
  }

  /** JSON round-trip, so nothing in the page's object graph leaks into node. */
  json(expr, opts) {
    return this.evaluate(`JSON.stringify(${expr})`, opts)
      .then((s) => (s == null ? null : JSON.parse(s)));
  }

  /** Reinstall the probe if a navigation raced the injected script. */
  async ensureProbe() {
    const ok = await this.evaluate(
      `!!(window.__fkAudit && window.__fkAudit.v === ${PROBE_VERSION})`,
      { label: 'probe check' },
    ).catch(() => false);
    if (!ok) await this.evaluate(PROBE_SRC, { timeoutMs: 20000, label: 'probe install' });
  }

  snap(opts) { return this.json('window.__fkAudit.snap()', { label: 'snap', ...opts }); }

  actions(opts) { return this.json('window.__fkAudit.actions()', { label: 'actions', ...opts }); }

  cardInfo(cids) {
    if (!cids.length) return Promise.resolve({});
    return this.json(`window.__fkAudit.cardInfo(${JSON.stringify(cids)})`, { label: 'cardInfo' });
  }

  /** Pull the recorded stream across and keep it node-side. */
  async drain() {
    const d = await this.json('window.__fkAudit.drain()', { label: 'drain', timeoutMs: 30000 });
    if (!d) return { log: 0, acts: 0 };
    for (const e of d.log) this.stream.push(e);
    for (const e of d.acts) this.outbox.push(e);
    for (const e of d.errors) this.pageErrors.push(e);
    return { log: d.log.length, acts: d.acts.length };
  }

  /**
   * A real click. `element.click()` does not reliably reach this app's React
   * handlers — the dialogs and the portal-rendered controls swallow it — so
   * every interaction goes through the same input pipeline a person's mouse
   * does, at the box the probe measured.
   */
  async click(box, { doubleClick = false } = {}) {
    const at = { x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1 };
    await bounded(this.b.call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at }), 10000, `${this.id} move`);
    await bounded(this.b.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...at }), 10000, `${this.id} press`);
    await bounded(this.b.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at }), 10000, `${this.id} release`);
    if (doubleClick) {
      const at2 = { ...at, clickCount: 2 };
      await bounded(this.b.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...at2 }), 10000, `${this.id} press2`);
      await bounded(this.b.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at2 }), 10000, `${this.id} release2`);
    }
  }

  screenshot(path) { return bounded(this.b.screenshot(path), 30000, `${this.id} screenshot`); }

  /** Uncaught exceptions the browser saw, whether or not the page noticed. */
  thrown() { return this.b.errors(); }

  consoleErrors() { return this.b.consoleLines(['error']); }

  consoleWarnings() { return this.b.consoleLines(['warning']); }

  async close() {
    this.closed = true;
    await this.b.close().catch(() => {});
  }
}

/**
 * Open a seat.
 *
 * `profileDir` is not an optimisation. Without it every run signs up a new
 * anonymous user, and Supabase caps that at 30/hour per IP — a cap a repeat
 * runner reaches in its third invocation and then reports as a product failure
 * at sign-in. With it, seat `p1` is the same person in every run forever.
 */
export async function openSeat({ id, name, profileDir, width = 1440, height = 900, hook = true }) {
  if (profileDir) mkdirSync(profileDir, { recursive: true });
  const browser = await launch({ width, height, profileDir });
  // Before the app's first line, so a crash during boot is captured too.
  // `hook: false` leaves the probe reading only — no wrappers on the store or
  // the Lua facade — which is how you prove the instrument is not the bug. The
  // stream-derived checks (hand retention, skill coverage) go quiet with it.
  const source = hook ? PROBE_SRC : `${PROBE_SRC};window.__fkAudit.hookEnabled=false;`;
  await browser.call('Page.addScriptToEvaluateOnNewDocument', { source });
  return new Seat(id, name, browser, { width, height, hook });
}

export const profileFor = (cacheDir, id) => join(cacheDir, `seat-${id}`);

export { sleep, bounded };
