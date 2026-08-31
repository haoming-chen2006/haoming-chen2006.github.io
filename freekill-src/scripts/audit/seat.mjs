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
    /**
     * Round-trip time of every evaluate, tagged with what was evaluated.
     *
     * This used to be an untagged list of numbers that the report published as
     * "main thread block", and it was not that. `snap()` serialises the whole
     * table and `actions()` measures a box for every control on screen; timing
     * those and calling the result the app's freeze charged the app for the
     * audit's own work. The tag is what lets the two be told apart, and
     * `blocks` below is the number that actually means what the old one
     * claimed to.
     */
    this.pings = [];
    /** Round-trip of a trivial `1`. Nothing but transport and block time. */
    this.blocks = [];
    /** What the page said about its own freezes, drained periodically. */
    this.perfSamples = [];
    this.closed = false;
  }

  /* ------------------------------------------------------------- plumbing */

  async evaluate(expr, { timeoutMs = 20000, label = 'evaluate' } = {}) {
    if (this.closed) throw new SeatTimeout(`${this.id} is closed`);
    const t0 = Date.now();
    const v = await bounded(this.b.evaluate(expr), timeoutMs, `${this.id} ${label}`);
    const dt = Date.now() - t0;
    this.pings.push({ ms: dt, label, at: t0 });
    if (this.pings.length > 6000) this.pings.splice(0, 3000);
    return v;
  }

  /**
   * The cheapest question there is. Nothing here is the app's work, so what
   * this measures is transport plus however long the renderer took to get
   * round to answering — which is the outside view of a main-thread block.
   *
   * It is deliberately issued from the driver's own loop rather than from a
   * timer of its own: a sampler racing the driver's `snap()` would spend most
   * of its time queued behind it and report the audit's DOM walk as the app's
   * freeze, which is the mistake this whole split exists to undo.
   */
  async blockSample({ timeoutMs = 20000 } = {}) {
    const t0 = Date.now();
    await bounded(this.b.evaluate('1'), timeoutMs, `${this.id} ping`);
    const dt = Date.now() - t0;
    this.blocks.push({ ms: dt, at: t0 });
    if (this.blocks.length > 6000) this.blocks.splice(0, 3000);
    return dt;
  }

  /**
   * A real CPU profile of the renderer, for when the stopwatches run out.
   *
   * The in-page timers can prove a freeze happened and can charge the part of
   * it that ran through an instrumented seam. They cannot name what ran in the
   * rest, and on this page the rest is ninety per cent of it. A sampling
   * profiler can: it interrupts the thread on a fixed interval and writes down
   * the stack, so React's reconciler, a layout flush and the Lua VM all show up
   * under their own names, with no cooperation from the code being measured.
   *
   * 200 µs is fine-grained enough to resolve a 100 ms stall into functions and
   * coarse enough not to distort what it is measuring.
   */
  async profileStart({ intervalUs = 200 } = {}) {
    await this.b.call('Profiler.enable');
    await this.b.call('Profiler.setSamplingInterval', { interval: intervalUs });
    await this.b.call('Profiler.start');
    this.profiling = true;
  }

  /** Stop, and fold the sample tree into self-time per function. */
  async profileStop() {
    if (!this.profiling) return null;
    this.profiling = false;
    const { profile } = await bounded(this.b.call('Profiler.stop'), 60000, `${this.id} profile`);
    await this.b.call('Profiler.disable').catch(() => {});
    return foldProfile(profile);
  }

  /** The page's own account of its freezes, since the last call. */
  async perf(opts) {
    const p = await this.json('window.__fkAudit.perfDrain()', { label: 'perf', timeoutMs: 30000, ...opts });
    if (p) this.perfSamples.push(p);
    return p;
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

/**
 * A V8 sample profile, reduced to "where did the thread's time actually go".
 *
 * Self time, not total time: a frame high on the stack is not the thing
 * costing anything, and a report sorted by total time says `(root)` at the top
 * and helps nobody. `samples` and `timeDeltas` are parallel arrays — sample
 * `i` was taken `timeDeltas[i]` microseconds after the previous one — so the
 * cost of a node is the deltas of the samples that landed on it.
 *
 * `(program)`, `(garbage collector)` and `(idle)` are V8's own pseudo-frames.
 * They are kept rather than filtered: "the freeze was GC" and "the freeze was
 * the browser doing layout outside JS" are both answers, and dropping them
 * would leave a hole that looks like missing data.
 */
export function foldProfile(profile) {
  const byId = new Map((profile.nodes ?? []).map((n) => [n.id, n]));
  const self = new Map();
  const deltas = profile.timeDeltas ?? [];
  const samples = profile.samples ?? [];
  let totalUs = 0;
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] ?? 0;
    if (dt <= 0) continue;
    totalUs += dt;
    const n = byId.get(samples[i]);
    if (!n) continue;
    const cf = n.callFrame ?? {};
    const url = String(cf.url ?? '').split('/').pop() || '(inline)';
    const key = `${cf.functionName || '(anonymous)'} @ ${url}:${cf.lineNumber ?? '?'}`;
    self.set(key, (self.get(key) ?? 0) + dt);
  }
  const rows = [...self.entries()]
    .map(([name, us]) => ({ name, ms: Math.round(us / 1000), pct: 0 }))
    .sort((a, b) => b.ms - a.ms);
  for (const r of rows) r.pct = totalUs ? Math.round((r.ms * 1000 * 1000) / totalUs) / 10 : 0;
  return {
    totalMs: Math.round(totalUs / 1000),
    samples: samples.length,
    top: rows.slice(0, 30),
  };
}

export const profileFor = (cacheDir, id) => join(cacheDir, `seat-${id}`);

export { sleep, bounded };
