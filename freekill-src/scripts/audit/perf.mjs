/**
 * Where the main thread's time went.
 *
 * The audit's original freeze number was the round-trip of a CDP evaluate. A
 * round-trip is the renderer's block time plus the websocket plus node's own
 * event loop plus — the part that made it useless — the cost of whatever
 * expression was being evaluated, because the same counter timed `snap()` and
 * `actions()`, which walk the entire DOM. "The page froze for 2.7 s" and "the
 * audit asked an expensive question while node was busy parsing a megabyte of
 * someone else's stream" produced the identical number.
 *
 * So four numbers are kept apart here, and a claim is only ever made from the
 * one that supports it:
 *
 *   pageBlockMs   in-page setInterval overshoot. No browser protocol, no
 *                 socket, no node. If a 50 ms timer is woken 2 700 ms late the
 *                 page was frozen for 2 700 ms and there is nothing to argue
 *                 about. This is the freeze a player feels.
 *   frameGapMs    the same stall counted in dropped frames.
 *   evalRoundTripMs  the outside view: a trivial `1` over CDP. Bigger than
 *                 pageBlock by the transport, and by node's own busyness.
 *   probeCostMs   what the instrument charges, per question it asks.
 *
 * And once a freeze is real, `attribute()` says what ran during it, from the
 * in-page stopwatches around notify application, store publish (React), and
 * every client-VM call.
 */

const num = (a) => a.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);

export function stat(values) {
  const a = num(values);
  if (!a.length) return null;
  const at = (q) => a[Math.min(a.length - 1, Math.floor(a.length * q))];
  return {
    n: a.length, min: a[0], p50: at(0.5), p95: at(0.95), p99: at(0.99),
    max: a[a.length - 1],
    /** Everything over 100 ms, which is where a click stops feeling instant. */
    over100: a.filter((v) => v >= 100).length,
    over1000: a.filter((v) => v >= 1000).length,
  };
}

/** Merge the per-name {n,total,max} buckets the probe accumulates. */
function mergeBuckets(into, from) {
  for (const [name, e] of Object.entries(from ?? {})) {
    const t = into[name] ?? (into[name] = { n: 0, total: 0, max: 0, maxAt: 0 });
    t.n += e.n; t.total += e.total;
    if (e.max > t.max) { t.max = e.max; t.maxAt = e.maxAt; }
  }
}

/**
 * Everything one seat's page reported about its own main thread.
 *
 * The probe's buckets are cumulative, so the newest drain already contains the
 * whole history — summing them across drains would multiply every count by the
 * number of times it was read. Only the event arrays are per-drain.
 */
export class PerfLedger {
  constructor() {
    this.notify = {}; this.commit = {}; this.lua = {};
    this.probe = {}; this.probeLua = {};
    this.beats = [];        // {t, drift}
    this.frames = [];       // {t, gap}
    this.longTasks = [];    // {t, dur, att}
    this.slow = [];         // {t, bucket, what, ms}
    this.commits = 0;
    this.beatN = 0; this.frameN = 0;
    this.maxDrift = 0; this.maxFrameGap = 0;
    this.driftTotal = 0; this.longTaskTotal = 0;
    this.observerOk = false; this.observerErr = null;
    this.capped = false;
  }

  /** One `perfDrain()` from one seat. */
  add(seatId, p) {
    if (!p) return;
    // Cumulative: replace, never sum.
    this.perSeat ??= {};
    const prev = this.perSeat[seatId] ?? {};
    this.perSeat[seatId] = {
      notify: p.notify, commit: p.commit, lua: p.lua,
      probe: p.probe, probeLua: p.probeLua,
      commits: p.commits, beatN: p.beatN, frameN: p.frameN,
      maxDrift: p.maxDrift, maxFrameGap: p.maxFrameGap,
      driftTotal: p.driftTotal, longTaskTotal: p.longTaskTotal,
      observerOk: p.observerOk, observerErr: p.observerErr,
    };
    void prev;
    for (const b of p.beats ?? []) this.beats.push({ seat: seatId, ...b });
    for (const f of p.frames ?? []) this.frames.push({ seat: seatId, ...f });
    for (const l of p.longTasks ?? []) this.longTasks.push({ seat: seatId, ...l });
    for (const s of p.slow ?? []) this.slow.push({ seat: seatId, ...s });
    if (p.capped) this.capped = true;
    if (p.observerErr) this.observerErr = p.observerErr;
    if (p.observerOk) this.observerOk = true;
  }

  /** Fold the per-seat cumulative buckets into one view. */
  seal() {
    for (const v of Object.values(this.perSeat ?? {})) {
      mergeBuckets(this.notify, v.notify);
      mergeBuckets(this.commit, v.commit);
      mergeBuckets(this.lua, v.lua);
      mergeBuckets(this.probe, v.probe);
      mergeBuckets(this.probeLua, v.probeLua);
      this.commits += v.commits ?? 0;
      this.beatN += v.beatN ?? 0;
      this.frameN += v.frameN ?? 0;
      this.driftTotal += v.driftTotal ?? 0;
      this.longTaskTotal += v.longTaskTotal ?? 0;
      this.maxDrift = Math.max(this.maxDrift, v.maxDrift ?? 0);
      this.maxFrameGap = Math.max(this.maxFrameGap, v.maxFrameGap ?? 0);
    }
    return this;
  }

  /**
   * What was running during the worst freezes.
   *
   * A stall is only explained if something with a stopwatch on it was running
   * inside its window. Anything left over — a stall no instrumented call
   * overlaps — is the honest "not accounted for", and that residue is the
   * interesting number: it is where the unmeasured work is.
   */
  attribute(topN = 12) {
    const worst = [...this.beats].sort((a, b) => b.drift - a.drift).slice(0, topN);
    return worst.map((b) => {
      const end = b.t;
      const start = end - b.drift;
      // What the stopwatches accumulated across exactly this stall, from the
      // probe's own beat-to-beat delta. Individual slow calls are kept beside
      // it, but they are not the explanation on this page: the freeze is made
      // of a hundred thousand fast calls, and only the delta sees those.
      const by = b.by ?? {};
      // The audit's own work is charged to the audit, not to the app — a stall
      // that turns out to be `snap()` is a harness bug, and it should read as one.
      const appMs = (by.lua ?? 0) + (by.notify ?? 0) + (by.commit ?? 0);
      const auditMs = (by.probe ?? 0) + (by.probeLua ?? 0);
      const inside = this.slow.filter((s) => s.seat === b.seat && s.t >= start - 60 && s.t <= end + 60);
      const tasks = this.longTasks.filter((l) => l.seat === b.seat && l.t + l.dur >= start && l.t <= end);
      return {
        seat: b.seat, at: b.t, blockedMs: b.drift,
        appMs, auditMs,
        unexplainedMs: Math.max(0, Math.round(b.drift - appMs - auditMs)),
        by,
        luaGrew: (b.luaGrew ?? []).map((g) => `${g.name}=${g.ms}ms`),
        ran: inside.sort((x, y) => y.ms - x.ms).slice(0, 4)
          .map((s) => `${s.bucket}:${s.what}=${s.ms}ms`),
        longTaskMs: Math.round(tasks.reduce((n, t) => n + t.dur, 0)),
        longTaskAttribution: [...new Set(tasks.map((t) => t.att).filter(Boolean))].slice(0, 3),
      };
    });
  }

  /**
   * Stalls per half-minute of the game, oldest first.
   *
   * The difference between "the app freezes" and "the app degrades" is the
   * whole diagnosis, and a single max hides it. A two-round game stalls not at
   * all and a twelve-round game stalls thirty-five times; if the freezes are
   * absent early and grow late, the cause is something that accumulates —
   * unbounded state, a longer log, a bigger table — and not the one-off cost
   * of booting a VM.
   */
  timeline(bucketMs = 30000) {
    if (!this.beats.length) return [];
    const t0 = Math.min(...this.beats.map((b) => b.t));
    const rows = new Map();
    for (const b of this.beats) {
      const k = Math.floor((b.t - t0) / bucketMs);
      const r = rows.get(k) ?? { atSec: k * (bucketMs / 1000), stalls: 0, totalMs: 0, worstMs: 0 };
      r.stalls += 1; r.totalMs += b.drift;
      r.worstMs = Math.max(r.worstMs, b.drift);
      rows.set(k, r);
    }
    return [...rows.entries()].sort((a, b) => a[0] - b[0])
      .map(([, r]) => ({ ...r, totalMs: Math.round(r.totalMs) }));
  }

  /** The top consumers by total time, which is what a fix should target. */
  hot(bucket, topN = 10) {
    return Object.entries(this[bucket] ?? {})
      .map(([name, e]) => ({
        name, n: e.n,
        totalMs: Math.round(e.total),
        avgMs: Math.round((e.total / e.n) * 100) / 100,
        maxMs: Math.round(e.max),
      }))
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, topN);
  }

  toJSON() {
    return {
      pageBlockMs: stat(this.beats.map((b) => b.drift)),
      frameGapMs: stat(this.frames.map((f) => f.gap)),
      maxDriftMs: this.maxDrift,
      maxFrameGapMs: this.maxFrameGap,
      // Only the stalls a player would notice. `setInterval` always overshoots
      // a little, and summing every millisecond of that produced a "20.8s
      // frozen" that was mostly timer granularity — a number that sounds
      // alarming and means nothing.
      stalledMs: Math.round(this.beats.reduce((s, b) => s + b.drift, 0)),
      stalls: this.beats.length,
      timerOvershootTotalMs: Math.round(this.driftTotal),
      beatsObserved: this.beatN,
      framesObserved: this.frameN,
      longTaskTotalMs: Math.round(this.longTaskTotal),
      longTaskObserver: this.observerOk ? 'on' : `off: ${this.observerErr ?? 'unavailable'}`,
      storeCommits: this.commits,
      hotNotify: this.hot('notify'),
      hotLua: this.hot('lua'),
      hotCommit: this.hot('commit'),
      probeCostByCall: this.hot('probe'),
      probeVmCost: this.hot('probeLua', 6),
      worstStalls: this.attribute(),
      stallTimeline: this.timeline(),
      // p1 is always the seat that opened the room, and therefore the one tab
      // also running the authoritative engine's driver loop and the host
      // worker's message pump. If its stalls outnumber the other seats' by a
      // wide margin, "the host tab is a worse client than everyone else's" is
      // a product fact and not a coincidence of which tab was watched.
      stallsBySeat: this.beats.reduce((m, b) => {
        const e = m[b.seat] ?? (m[b.seat] = { stalls: 0, totalMs: 0, worstMs: 0 });
        e.stalls += 1; e.totalMs = Math.round(e.totalMs + b.drift);
        e.worstMs = Math.max(e.worstMs, b.drift);
        return m;
      }, {}),
      eventsCapped: this.capped,
    };
  }
}

/** Node's outside view, kept separate from the page's inside view. */
export function outsideView(seats) {
  const byLabel = {};
  for (const s of seats) {
    for (const p of s.pings) (byLabel[p.label] ??= []).push(p.ms);
  }
  return {
    evalRoundTripMs: stat(seats.flatMap((s) => s.blocks.map((b) => b.ms))),
    probeCostMs: Object.fromEntries(
      Object.entries(byLabel).map(([k, v]) => [k, stat(v)]).sort((a, b) => (b[1]?.max ?? 0) - (a[1]?.max ?? 0)),
    ),
  };
}

/** Merge two sealed ledgers' JSON for a campaign-level view. */
export function mergePerf(all) {
  const live = all.filter(Boolean);
  if (!live.length) return null;
  const pick = (k) => live.map((p) => p[k]).filter(Boolean);
  const worst = (k) => Math.max(0, ...live.map((p) => p[k] ?? 0));
  const statOf = (k) => {
    const parts = pick(k);
    if (!parts.length) return null;
    const n = parts.reduce((s, p) => s + p.n, 0);
    return {
      n,
      min: Math.min(...parts.map((p) => p.min)),
      p50: Math.round(parts.reduce((s, p) => s + p.p50 * p.n, 0) / n),
      p95: Math.max(...parts.map((p) => p.p95)),
      p99: Math.max(...parts.map((p) => p.p99 ?? p.p95)),
      max: Math.max(...parts.map((p) => p.max)),
      over100: parts.reduce((s, p) => s + (p.over100 ?? 0), 0),
      over1000: parts.reduce((s, p) => s + (p.over1000 ?? 0), 0),
    };
  };
  const mergeHot = (k) => {
    const acc = {};
    for (const p of live) {
      for (const row of p[k] ?? []) {
        const t = acc[row.name] ?? (acc[row.name] = { name: row.name, n: 0, totalMs: 0, maxMs: 0 });
        t.n += row.n; t.totalMs += row.totalMs;
        t.maxMs = Math.max(t.maxMs, row.maxMs);
      }
    }
    return Object.values(acc)
      .map((r) => ({ ...r, avgMs: Math.round((r.totalMs / Math.max(1, r.n)) * 100) / 100 }))
      .sort((a, b) => b.totalMs - a.totalMs).slice(0, 10);
  };
  return {
    pageBlockMs: statOf('pageBlockMs'),
    frameGapMs: statOf('frameGapMs'),
    maxDriftMs: worst('maxDriftMs'),
    maxFrameGapMs: worst('maxFrameGapMs'),
    stalledMs: live.reduce((s, p) => s + (p.stalledMs ?? 0), 0),
    stalls: live.reduce((s, p) => s + (p.stalls ?? 0), 0),
    timerOvershootTotalMs: live.reduce((s, p) => s + (p.timerOvershootTotalMs ?? 0), 0),
    longTaskTotalMs: live.reduce((s, p) => s + (p.longTaskTotalMs ?? 0), 0),
    longTaskObserver: live[0].longTaskObserver,
    storeCommits: live.reduce((s, p) => s + (p.storeCommits ?? 0), 0),
    hotNotify: mergeHot('hotNotify'),
    hotLua: mergeHot('hotLua'),
    hotCommit: mergeHot('hotCommit'),
    probeCostByCall: mergeHot('probeCostByCall'),
    probeVmCost: mergeHot('probeVmCost'),
    worstStalls: live.flatMap((p) => p.worstStalls ?? [])
      .sort((a, b) => b.blockedMs - a.blockedMs).slice(0, 12),
    // Per game, not merged: two games' clocks have nothing to say to each
    // other, and averaging their timelines would flatten the growth this is
    // here to show.
    stallTimelines: live.map((p) => p.stallTimeline ?? []).filter((t) => t.length),
    stallsBySeat: live.reduce((m, p) => {
      for (const [seat, e] of Object.entries(p.stallsBySeat ?? {})) {
        const t = m[seat] ?? (m[seat] = { stalls: 0, totalMs: 0, worstMs: 0 });
        t.stalls += e.stalls; t.totalMs += e.totalMs;
        t.worstMs = Math.max(t.worstMs, e.worstMs);
      }
      return m;
    }, {}),
  };
}
