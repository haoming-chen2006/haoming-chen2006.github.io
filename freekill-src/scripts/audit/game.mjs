/**
 * One complete game, played and audited.
 *
 * Each seat runs its own loop. That is not an optimisation — it is the only
 * arrangement in which "the other player is stuck" is observable at all. A
 * driver that takes turns round-robin cannot tell a seat that is waiting from a
 * seat that is wedged, because it is the thing making them wait. Here every
 * seat polls, answers and is measured on its own clock, and a supervisor loop
 * on top does the checks that need every tab at once.
 *
 * The loop answers whatever the app offers and asserts continuously while it
 * does. It stops on GameOver, on the game timeout, or when a browser dies —
 * and it always writes its log, because the run that hangs is exactly the run
 * whose log you need.
 */
import { join } from 'node:path';
import { Auditor } from './invariants.mjs';
import { PerfLedger, outsideView } from './perf.mjs';
import { answerOnce, makeContext } from './policy.mjs';
import { SeatTimeout, openSeat, profileFor, sleep } from './seat.mjs';
import { Coverage, SessionLog } from './session.mjs';
import {
  createRoom, fillWithBots, signIn,
} from '../game-walk.mjs';

const TABLE_SEATS = 8;

/** Steps that commit an answer; anything else is still mid-selection. */
const COMMITTING = new Set([
  'commit', 'end-phase', 'decline', 'fallback-exit', 'confirm-general',
  'confirm-arrange', 'confirm-choice', 'confirm-card-pick', 'dismiss-arrange',
  'take-ag', 'pick-choice', 'pick-card-from-zone', 'invoke-skill',
  'decline-skill', 'dismiss-unknown-dialog',
]);

/** Log markers that record a decision rather than a press on a control. */
const NOT_A_CLICK = new Set(['back-out', 'steering']);

/** Trim a snapshot down to what a human reading the log actually needs. */
function boundarySnapshot(s) {
  return {
    seq: s.seq, round: s.round, currentId: s.currentId, selfId: s.selfId,
    drawPile: s.drawPile, discard: s.discard, universe: s.universe,
    areas: s.areas, ownHand: s.ownHand, ownEquip: s.ownEquip,
    table: s.table, logLines: s.logLines, outbound: s.outbound,
    request: s.request, focus: s.focus, prompt: s.scene?.prompt ?? null,
    players: Object.fromEntries(Object.entries(s.players ?? {}).map(([pid, p]) => [pid, {
      general: p.general, hp: p.hp, maxHp: p.maxHp, hand: p.hand,
      equip: p.equip, judge: p.judge, phase: p.phase, dead: p.dead,
    }])),
    dom: s.dom,
  };
}

export async function playAuditedGame(opts) {
  const {
    base, seats: seatCount, seed, gameIndex, cacheDir, logDir,
    gameTimeoutMs = 15 * 60 * 1000,
    pollMs = 300,
    shots = false,
    hook = true,
    bias = null,
    profile = false,
    onProgress = () => {},
  } = opts;

  const seatIds = Array.from({ length: seatCount }, (_, i) => `p${i + 1}`);
  const names = ['房主', '客人', '第三人', '第四人', '第五人'];
  const session = new SessionLog(join(logDir, `game-${gameIndex}.jsonl`));
  const coverage = new Coverage();
  const auditor = new Auditor({ seats: seatIds });
  const perf = new PerfLedger();
  /** Generals a human seat actually chose, which is the coverage that counts. */
  const seatedGenerals = [];
  /** Generals the engine put in front of a human seat, taken or not. */
  const offeredGenerals = [];
  const result = {
    game: gameIndex, seed, base, seats: seatCount,
    startedAt: Date.now(), endedAt: null, outcome: 'unknown',
    winner: null, rounds: 0, decisions: 0, log: session.path,
  };

  session.write('run', { base, seats: seatCount, seed, game: gameIndex, node: process.version });

  const openedSeats = [];
  let stop = false;
  let stopReason = null;
  const halt = (why) => { if (!stop) { stop = true; stopReason = why; } };

  try {
    /* ------------------------------------------------------------- seating */

    for (let i = 0; i < seatCount; i++) {
      openedSeats.push(await openSeat({
        id: seatIds[i],
        name: names[i] ?? `玩家${i + 1}`,
        profileDir: profileFor(cacheDir, seatIds[i]),
        hook,
      }));
    }
    const [host, ...guests] = openedSeats;

    onProgress(`signing in ${seatCount} seat(s)`);
    for (const s of openedSeats) {
      await signIn(s.b, base, s.name);
      await s.ensureProbe();
    }

    onProgress('opening a room');
    const joinUrl = await createRoom(host.b);
    session.write('room', { joinUrl, host: host.name });
    result.joinUrl = joinUrl;

    const botTarget = TABLE_SEATS - guests.length;
    const seated = await fillWithBots(host.b, botTarget);
    if (seated !== botTarget) throw new Error(`wanted ${botTarget} seated before guests, got ${seated}`);

    // The share link is `origin + pathname + #/join/<code>` (src/shell/router.ts) —
    // deliberately without the host's query, because a link handed to a friend
    // should not carry the host's debug flags. For the campaign that is wrong in
    // one specific way: the base URL's `?pace=0` would be dropped, and the guest
    // seats would run paced while the host did not. Re-apply the base's query so
    // every seat at the table is on the same build settings.
    const joinFor = (u) => {
      const from = new URL(base);
      if (!from.search) return u;
      const to = new URL(u);
      for (const [k, v] of from.searchParams) if (!to.searchParams.has(k)) to.searchParams.set(k, v);
      return to.toString();
    };
    for (const g of guests) {
      await g.b.goto(joinFor(joinUrl));
      await g.b.waitFor(`location.hash.startsWith('#/room/')`, 60000);
    }
    for (const s of openedSeats) {
      await s.b.waitFor(
        `document.querySelectorAll('.seat:not(.empty-seat)').length === ${TABLE_SEATS}`, 60000);
    }
    onProgress(`${TABLE_SEATS} seats taken`);

    /* --------------------------------------------------------------- start */

    const startedAt = Date.now();
    await host.b.click('.btn', { text: '开始游戏' });
    for (const s of openedSeats) {
      await s.b.waitFor(`!!document.querySelector('.fk-room')`, 180000);
    }
    result.tableUpMs = Date.now() - startedAt;
    session.write('start', { tableUpMs: result.tableUpMs });
    // Profiled from the moment the table exists, on the seat that opened the
    // room — that tab is the one that also drives the authoritative engine, and
    // it is where every one of the worst stalls has landed.
    if (profile) await host.profileStart().catch(() => {});
    onProgress(`table up in ${result.tableUpMs} ms — playing`);

    /* ---------------------------------------------------------- the driver */

    const deadline = Date.now() + gameTimeoutMs;
    const state = Object.fromEntries(seatIds.map((id) => [id, {
      over: null, overAt: null, decisions: 0, lastCurrent: null, ctx: null,
      lastSnap: null, answeredReqSeq: 0, answeredFocus: null, answeredAt: 0,
      staleReported: false,
    }]));

    /** Wait for the room to publish something new, or give up quickly. */
    const settleFor = (seat) => async () => {
      let before;
      try { before = await seat.json('window.__fkAudit.tick()', { timeoutMs: 8000, label: 'tick' }); }
      catch { return; }
      const until = Date.now() + 900;
      while (Date.now() < until) {
        await sleep(60);
        let now;
        try { now = await seat.json('window.__fkAudit.tick()', { timeoutMs: 8000, label: 'tick' }); }
        catch { return; }
        if (!now || !before) return;
        if (now.v !== before.v || now.req !== before.req || now.out !== before.out) return;
      }
    };

    const drive = async (seat) => {
      const st = state[seat.id];
      st.ctx = makeContext({
        seed: seed + seat.id.charCodeAt(1) * 7919, settle: settleFor(seat), deadline, bias,
      });
      while (!stop && Date.now() < deadline) {
        // Before the expensive question, not after and not from a timer of its
        // own: this is the trivial evaluate whose round trip is the outside
        // view of a main-thread block, and it only means that if nothing the
        // audit asked for is queued in front of it.
        await seat.blockSample({ timeoutMs: 25000 }).catch(() => {});
        const snap = await seat.snap({ timeoutMs: 25000 });
        st.lastSnap = snap;
        if (!snap) { await sleep(pollMs); continue; }

        const drained = await seat.drain();
        if (drained.log) {
          const fresh = seat.stream.slice(-drained.log);
          coverage.fromStream(fresh);
          session.write('stream', { seat: seat.id, n: fresh.length, entries: fresh });
        }
        // What this tab put back on the wire, in the same order it left. A
        // click that never became an `interact`, or an `interact` that never
        // became a `reply`, is the difference between "the UI ignored me" and
        // "the engine ignored the UI" — and only this record can tell them
        // apart afterwards.
        if (drained.acts) {
          const sent = seat.outbox.slice(-drained.acts);
          session.write('sent', { seat: seat.id, entries: sent });
          auditor.replyEcho(seat.id, sent);
        }
        coverage.fromSnapshot(snap);
        auditor.errors(seat.id, seat, snap);
        auditor.geometry(seat.id, snap);
        auditor.conservation(seat.id, snap);
        auditor.handRetention(seat.id, snap, seat.stream);

        if (snap.gameOver) {
          if (!st.over) {
            st.over = snap.gameOver;
            st.overAt = snap.at;
            session.write('gameover', { seat: seat.id, winner: snap.gameOver, seq: snap.seq, round: snap.round });
            onProgress(`${seat.id} sees game over: ${snap.gameOver}`);
          }
          if (seatIds.every((id) => state[id].over)) halt('gameover');
          await sleep(pollMs);
          continue;
        }

        if (snap.currentId !== st.lastCurrent) {
          st.lastCurrent = snap.currentId;
          st.ctx.playsThisTurn = 0;
        }

        const actions = await seat.actions({ timeoutMs: 25000 });
        auditor.liveness(seat.id, snap, actions);
        auditor.fidelity(seat.id, snap, actions);
        auditor.reachable(seat.id, snap, actions);

        const open = snap.request && snap.request.kind !== 'none';
        const offered = (actions?.actions ?? []).filter((x) => x.enabled && x.visible && x.box);

        /**
         * One answer per question the engine asked.
         *
         * The room's own `request` field is not the authority here, on purpose.
         * A build that forgets to close a request after replying leaves the
         * scene live and its buttons enabled, and a driver keyed off that
         * answers the same question over and over — which both wastes the game
         * and hides the real fault behind a driver-shaped one. The engine's
         * question counter cannot lie about this: it moves when, and only when,
         * a new `AskFor*` actually arrives.
         */
        const focusKey = snap.focus && snap.selfId != null && snap.focus.ids.includes(snap.selfId)
          ? snap.focus.startedAt : null;
        // With the wrappers off (`--no-hook`) there is no question counter, so
        // the driver falls back to `MoveFocus`'s arrival stamp — weaker, since
        // it cannot see a question that opened and closed between two polls,
        // but it does not depend on the instrument it is there to exonerate.
        const newQuestion = snap.reqSeq > 0
          ? snap.reqSeq > st.answeredReqSeq
          : (focusKey !== st.answeredFocus || Date.now() - st.answeredAt > 3000);
        if (!open || !offered.length || !newQuestion) {
          // A live scene with no new question behind it means the reply went
          // out and the request never closed. That is a stuck screen, and the
          // seat cannot be sure the click it makes next will be heard.
          if (open && offered.length && st.answeredReqSeq > 0
              && Date.now() - st.answeredAt > 6000 && !st.staleReported) {
            st.staleReported = true;
            auditor.report('stale-request', seat.id,
              `${snap.request.command} is still on screen with live controls `
              + `${Math.round((Date.now() - st.answeredAt) / 1000)}s after it was answered`, {
                key: `stale:${snap.request.command}`,
                command: snap.request.command, reqSeq: snap.reqSeq,
                prompt: snap.scene?.prompt ?? null,
                answeredReqSeq: st.answeredReqSeq, offered: offered.length,
                outbound: snap.outbound, seq: snap.seq,
              });
          }
          await sleep(pollMs);
          continue;
        }
        st.staleReported = false;

        // A decision boundary: this is where the record and the checks live.
        const requestedAt = Date.now();
        session.write('request', {
          seat: seat.id, command: snap.request.command, reqKind: snap.request.kind,
          prompt: actions.prompt, seq: snap.seq, focusStartedAt: focusKey,
          arrivalDelayMs: focusKey ? requestedAt - focusKey : null,
          offered: offered.map((o) => ({
            group: o.group, id: o.cid ?? o.name ?? o.pid ?? o.id ?? o.idx,
            label: o.label ?? null, selected: o.selected ?? false,
          })),
          table: boundarySnapshot(snap),
        });

        // Card faces for anything on the table or in hand: this is what turns
        // "cards were played" into a list of which ones.
        const faceCids = [...new Set([
          ...(snap.table ?? []).map((c) => c.cid).filter((c) => c >= 0),
          ...(snap.ownHand ?? []),
        ])].slice(0, 40);
        if (faceCids.length) coverage.fromCardInfo(await seat.cardInfo(faceCids).catch(() => ({})));

        const outBefore = snap.outbound;
        const answered = await answerOnce(seat, st.ctx, actions);
        const answeredAt = Date.now();
        st.answeredReqSeq = snap.reqSeq;
        st.answeredFocus = focusKey;
        st.answeredAt = answeredAt;
        st.decisions += 1;
        result.decisions += 1;
        coverage.answered(answered.handled ?? snap.request.command, answered.unknown);
        for (const g of answered.picked ?? []) {
          if (!seatedGenerals.includes(g)) seatedGenerals.push(g);
          coverage.seated(g);
        }
        for (const g of answered.offered ?? []) {
          if (!offeredGenerals.includes(g)) offeredGenerals.push(g);
          coverage.offered(g);
        }
        // Not every step is a click. `back-out` marks an abandoned attempt and
        // `steering` records why an option was preferred; both carry a `group`
        // so they read well in the log, and both would inflate the "elements
        // driven" tally with moves that never happened.
        for (const s of answered.steps) {
          if (s.group && !NOT_A_CLICK.has(s.what)) coverage.interacted(s.group);
        }
        if (answered.played) st.ctx.playsThisTurn += 1;

        const committed = answered.steps.some((s) => COMMITTING.has(s.what));
        let delivered = null;
        if (committed) {
          delivered = await waitForReply(seat, outBefore, 12000);
          if (delivered == null) {
            auditor.report('reply-delivery', seat.id,
              `pressed an enabled control for ${snap.request.command} and no reply was sent in 12s`, {
                key: `nodelivery:${snap.request.command}`,
                command: snap.request.command,
                prompt: actions.prompt ?? snap.scene?.prompt ?? null,
                pressed: answered.steps.filter((s) => COMMITTING.has(s.what)).map((s) => `${s.group}:${s.id}`).join(','),
                steps: answered.steps.map((s) => s.what),
                focusTimeout: snap.focus?.timeout ?? null,
                seq: snap.seq,
              });
          }
        }

        session.write('reply', {
          seat: seat.id, command: answered.handled ?? snap.request.command,
          steps: answered.steps, stuck: answered.stuck ?? null,
          played: !!answered.played, ended: !!answered.ended,
          decisionMs: answeredAt - requestedAt,
          replyMs: delivered, outBefore, focusStartedAt: focusKey,
        });
        auditor.noteReply(seat.id, answered.handled ?? snap.request.command,
          answeredAt - requestedAt, delivered);
        if (answered.stuck) {
          auditor.report('policy', seat.id, `could not answer ${snap.request.command}: ${answered.stuck}`, {
            key: `unanswerable:${snap.request.command}`, command: snap.request.command,
            steps: answered.steps.map((s) => s.what), severity: 'warn',
          });
        }
      }
    };

    /** Cross-tab checks and the progress heartbeat. */
    const supervise = async () => {
      let beats = 0;
      while (!stop && Date.now() < deadline) {
        await sleep(2500);
        const snaps = [];
        for (const s of openedSeats) {
          const v = state[s.id].lastSnap;
          if (v && v.model) snaps.push(v);
        }
        if (snaps.length === openedSeats.length && snaps.length) {
          auditor.stall(snaps);
          if (beats % 4 === 0) {
            await auditor.agreement(snaps, async () => {
              const out = [];
              for (const s of openedSeats) out.push(await s.snap({ timeoutMs: 20000 }).catch(() => null));
              return out;
            });
          }
          // The page's own account of how long it was frozen, drained on the
          // supervisor's beat rather than the driver's so it is not itself
          // paid for out of a decision's clock. A finding is raised off the
          // in-page number, never off the round trip — the round trip includes
          // node, the socket and the question being asked.
          for (const s of openedSeats) {
            const p = await s.perf().catch(() => null);
            if (!p) continue;
            perf.add(s.id, p);
            // The freshly drained stalls only: `maxDrift` is cumulative, so
            // reporting off it would re-report the same freeze on every beat
            // for the rest of the game.
            const worst = Math.max(0, ...(p.beats ?? []).map((b) => b.drift));
            if (worst >= auditor.t.blockedMs) auditor.noteBlocked(s.id, Math.round(worst), 'play');
          }
        }
        if (beats % 8 === 0) {
          const s0 = state[seatIds[0]].lastSnap;
          if (s0) {
            result.rounds = Math.max(result.rounds, s0.round ?? 0);
            const alive = Object.values(s0.players ?? {}).filter((p) => !p.dead).length;
            onProgress(`round ${s0.round}, ${alive} alive, draw ${s0.drawPile}, `
              + `${result.decisions} decisions, ${auditor.failures.length} findings`);
          }
          session.flush();
        }
        beats += 1;
      }
    };

    await Promise.all([...openedSeats.map((s) => drive(s).catch((e) => {
      auditor.report('driver', s.id, `the seat's loop stopped: ${e.message}`, {
        key: e.message.slice(0, 100), fatal: true,
      });
      halt(`${s.id} died: ${e.message}`);
    })), supervise()]);

    /* -------------------------------------------------------------- verdict */

    for (const s of openedSeats) {
      const tail = await s.drain().catch(() => ({ log: 0 }));
      if (tail.log) coverage.fromStream(s.stream.slice(-tail.log));
      // The last drain is the one that matters: a stall during the closing
      // burst is exactly the kind that never gets reported otherwise.
      const p = await s.perf().catch(() => null);
      if (p) perf.add(s.id, p);
      auditor.errors(s.id, s, state[s.id].lastSnap);
      if (shots) await s.screenshot(join(logDir, `game-${gameIndex}-${s.id}.png`)).catch(() => {});
    }
    if (profile) {
      result.profile = await openedSeats[0].profileStop().catch(() => null);
      if (result.profile) session.write('profile', { seat: openedSeats[0].id, ...result.profile });
    }

    const overAts = seatIds.map((id) => state[id].overAt).filter((v) => v != null);
    if (overAts.length > 1) {
      const spread = Math.max(...overAts) - Math.min(...overAts);
      result.gameOverSpreadMs = spread;
      // Every tab is on the same broadcast. One learning the game ended ten
      // seconds after another is the same class of fault as one never learning.
      if (spread > 10000) {
        auditor.report('completion', 'all',
          `GameOver reached the last seat ${Math.round(spread / 1000)}s after the first`, {
            key: 'gameOverSpread', spreadMs: spread,
            perSeat: Object.fromEntries(seatIds.map((id) => [id, state[id].overAt])),
          });
      }
    }

    // Every seat is looking at one deck. Two seats settling on different
    // totals means one of them was already miscounting before the first
    // comparison ran, which would quietly weaken every conservation check that
    // followed it.
    const decks = [...new Set(Object.values(auditor.deckSizes).filter((v) => v != null))];
    if (decks.length > 1) {
      auditor.report('conservation', 'all',
        `seats disagree on how many cards are in the deck: ${decks.join(' vs ')}`, {
          key: 'deckSize', perSeat: auditor.deckSizes,
        });
    }

    const winners = seatIds.map((id) => state[id].over).filter(Boolean);
    result.winner = winners[0] ?? null;
    result.outcome = winners.length === seatIds.length ? 'complete'
      : (Date.now() >= deadline ? 'timeout' : (stopReason ?? 'incomplete'));
    if (result.outcome !== 'complete') {
      auditor.report('completion', 'all',
        `the game did not reach GameOver on every seat (${result.outcome})`, {
          key: 'incomplete', outcome: result.outcome, reason: stopReason,
          sawGameOver: seatIds.filter((id) => state[id].over),
        });
    }
    const last = state[seatIds[0]].lastSnap;
    result.rounds = Math.max(result.rounds, last?.round ?? 0);
  } catch (e) {
    result.outcome = 'error';
    result.error = e instanceof SeatTimeout ? `page stopped answering: ${e.message}` : String(e.message ?? e);
    auditor.report('setup', 'all', result.error, { key: 'setup', fatal: true });
    // Completion must not read as a pass just because the run never got far
    // enough to fail it.
    auditor.report('completion', 'all', 'the game never started', { key: 'noStart' });
  } finally {
    for (const s of openedSeats) await s.close().catch(() => {});
  }

  result.endedAt = Date.now();
  result.durationMs = result.endedAt - result.startedAt;
  result.coverage = coverage.toJSON();
  result.seatedGenerals = seatedGenerals;
  result.offeredGenerals = offeredGenerals;
  result.findings = auditor.findings;
  result.checksRun = { ...auditor.ran };
  result.deckSizes = auditor.deckSizes;
  result.latency = summariseLatency(auditor, openedSeats);
  // Sealed exactly once: `seal()` folds the per-seat cumulative buckets into
  // the shared one, and folding twice would double every count in the report.
  result.perf = perf.seal().toJSON();
  result.passed = auditor.passed && result.outcome === 'complete';
  session.write('perf', result.perf);
  session.write('result', result);
  session.flush();
  return { result, auditor, coverage, perf: result.perf };
}

/** The reply counter the room keeps for itself; the only proof it went out. */
async function waitForReply(seat, before, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    let t;
    try { t = await seat.json('window.__fkAudit.tick()', { timeoutMs: 8000, label: 'tick' }); }
    catch { return null; }
    if (!t) return null;
    if (t.out > before || t.over) return Date.now() - t0;
    if (t.req === 'none:-') return Date.now() - t0;
    await sleep(80);
  }
  return null;
}

function summariseLatency(auditor, seats) {
  const nums = (arr) => arr.map((x) => x.ms).filter((n) => Number.isFinite(n));
  const stat = (arr) => {
    const a = nums(arr).sort((x, y) => x - y);
    if (!a.length) return null;
    return {
      n: a.length, min: a[0], p50: a[Math.floor(a.length * 0.5)],
      p95: a[Math.floor(a.length * 0.95)], max: a[a.length - 1],
    };
  };
  return {
    requestAnswerableMs: stat(auditor.latency.answerable),
    decisionMs: stat(auditor.latency.decision),
    replyToChangeMs: stat(auditor.latency.replyToChange),
    settleMs: stat(auditor.settleSamples.map((ms) => ({ ms }))),
    // The outside view, and only the outside view. What used to be published
    // here as `mainThreadBlockMs` was the round trip of every evaluate the
    // audit made, `snap()` and `actions()` included, so the app was being
    // charged for the instrument's DOM walk. The page's own freeze number now
    // comes from `result.perf.pageBlockMs`, measured inside the tab.
    ...outsideView(seats),
  };
}
