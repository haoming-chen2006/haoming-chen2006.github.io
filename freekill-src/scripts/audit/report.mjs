/**
 * What a human reads afterwards.
 *
 * Two rules shape this. First, an invariant that was never exercised is
 * reported as "not exercised", never as a pass — a suite that shows green for
 * checks it never ran is how a game that dealt nothing scored 13/13. Second,
 * every finding names the log line that proves it, because a bug report without
 * evidence gets argued with instead of fixed.
 */

import { REACHABLE_REQUESTS, REQUESTS, UNREACHABLE_REQUESTS } from './catalogue.mjs';

const RULES = [
  ['conservation', 'card conservation', 'all cards in exactly one zone'],
  ['agreement', 'cross-seat agreement', 'tabs converge on shared state'],
  ['liveness', 'liveness', 'every request becomes answerable and closes'],
  ['retention', 'hand retention', 'hands change only by announced moves'],
  ['geometry', 'geometry', 'the table is on screen at a usable size'],
  ['render', 'render fidelity', 'the DOM and the scene agree on every control'],
  ['obscured', 'controls reachable', 'nothing is drawn over an enabled control'],
  ['reply-delivery', 'reply delivery', 'pressing an enabled control sends a reply'],
  ['stale-request', 'request closes', 'an answered request stops offering controls'],
  ['duplicate-reply', 'one answer one reply', 'no answer is put on the wire twice'],
  ['exception', 'no exceptions', 'nothing thrown in any tab'],
  ['rejection', 'no unhandled rejections', 'no promise left unhandled'],
  ['console', 'no console errors', 'the app logs no errors'],
  ['delay', 'main thread responsive', 'no freeze over 500 ms'],
  ['boundary', 'no error boundary', 'no component crashed out'],
  ['completion', 'completion', 'the game reaches GameOver on every seat'],
  ['setup', 'setup', 'sign-in, seating and start succeed'],
  ['driver', 'driver health', 'no seat loop died'],
];

const bar = (s = '─', n = 72) => s.repeat(n);

export function renderGame(result) {
  const lines = [];
  const ok = result.passed ? 'PASS' : 'FAIL';
  lines.push(`${ok}  game ${result.game}  ${result.outcome}  `
    + `${Math.round(result.durationMs / 1000)}s  round ${result.rounds}  `
    + `${result.decisions} decisions  winner=${result.winner ?? '—'}`);
  if (result.error) lines.push(`      error: ${result.error}`);
  return lines.join('\n');
}

export function renderSummary({
  url, seatCount, seed, games, coverage, findings, latency, logDir,
  perf, roster, campaign, buildKey, ledgerPath,
}) {
  const out = [];
  const complete = games.filter((g) => g.outcome === 'complete').length;
  const passed = games.filter((g) => g.passed).length;

  out.push('');
  out.push(bar('═'));
  out.push(`FreeKill full-game audit — ${url}`);
  out.push(`${games.length} game(s), ${seatCount} human seat(s) + bots to 8, seed ${seed}`);
  out.push(bar('═'));
  out.push('');
  for (const g of games) out.push(renderGame(g));
  out.push('');
  out.push(`${passed}/${games.length} games passed, ${complete}/${games.length} reached GameOver`);

  /* ------------------------------------------------------------ invariants */

  out.push('');
  out.push(bar());
  out.push('INVARIANTS');
  out.push(bar());
  // How many times each check actually ran, summed over the games. A check
  // reported as passing without a number behind it is exactly the kind of green
  // that let a game which dealt no cards score 13/13.
  const ran = (key) => games.reduce((n, g) => n + (g.checksRun?.[key] ?? 0), 0);
  const decisions = games.reduce((n, g) => n + g.decisions, 0);
  const exercised = {
    conservation: ran('conservation'),
    agreement: ran('agreement'),
    liveness: ran('liveness'),
    retention: ran('retention'),
    geometry: ran('geometry'),
    render: ran('fidelity'),
    obscured: ran('reachable'),
    'duplicate-reply': ran('replies'),
    'reply-delivery': decisions,
    'stale-request': decisions,
    // Every 50 ms beat the page's timer reported is one sample of "was the
    // main thread available", so that is the honest number of times this check
    // ran — not the number of games.
    delay: games.reduce((n, g) => n + (g.perf?.beatsObserved ?? 0), 0),
    exception: games.length, rejection: games.length, console: games.length,
    boundary: games.length, completion: games.length, setup: games.length,
    driver: games.length,
  };
  for (const [rule, name, what] of RULES) {
    const hits = findings.filter((f) => f.rule === rule);
    const fails = hits.filter((f) => f.severity === 'fail');
    const n = exercised[rule] ?? 0;
    const mark = !n ? 'n/a ' : (fails.length ? 'FAIL' : (hits.length ? 'warn' : ' ok '));
    const tail = !n ? 'NOT EXERCISED — this check never ran'
      : fails.length ? `${fails.length} finding(s) over ${n} check(s)`
        : hits.length ? `${hits.length} warning(s) over ${n} check(s)`
          : `${what} — ${n} check(s)`;
    out.push(`  [${mark}] ${name.padEnd(24)} ${tail}`);
  }
  const decks = games.map((g) => Object.values(g.deckSizes ?? {}).filter((v) => v != null));
  const flat = [...new Set(decks.flat())];
  out.push(`  deck size the conservation check held every seat to: ${flat.length ? flat.join(' / ') : 'never established'}`);

  /* -------------------------------------------------------------- coverage */

  out.push('');
  out.push(bar());
  out.push('COVERAGE');
  out.push(bar());
  const c = coverage;
  const top = (obj, n = 14) => Object.entries(obj).slice(0, n).map(([k, v]) => `${k}×${v}`).join(', ');
  // A tally with no denominator is a boast. Every count that can be stated as
  // "x of the y this build ships" is, because only that form can shrink.
  const frac = (have, all) => (all ? ` — ${have}/${all.length} this build ships` : '');
  out.push(`  generals at the table (${c.generals.length})${frac(c.generals.length, roster?.generals)}: ${c.generals.join(', ') || '—'}`);
  out.push(`  generals a HUMAN seat played (${(c.generalsSeated ?? []).length}): ${(c.generalsSeated ?? []).join(', ') || '—'}`);
  out.push(`  skills granted (${c.skillsGranted.length}): ${c.skillsGranted.join(', ') || '—'}`);
  out.push(`  skills that FIRED (${Object.keys(c.skillsFired).length})${frac(Object.keys(c.skillsFired).length, roster?.skills)}: ${top(c.skillsFired) || '—'}`);
  out.push(`  card types: ${c.cardTypes.join(', ') || '—'}   subtypes: ${c.cardSubtypes.join(', ') || '—'}`);
  out.push(`  suits: ${c.suits.join(', ') || '—'}`);
  out.push(`  cards seen in play (${Object.keys(c.cardsUsed).length})${frac(Object.keys(c.cardsUsed).length, roster?.cards)}: ${top(c.cardsUsed, 18) || '—'}`);
  out.push(`  request types the engine sent (${Object.keys(c.requestsSeen).length}): ${top(c.requestsSeen, 18) || '—'}`);
  out.push(`  request types this suite ANSWERED (${Object.keys(c.requestsAnswered).length}): ${top(c.requestsAnswered, 18) || '—'}`);
  // The gap matters as much as the tally — but only the reachable part of it.
  // Listing AskForPoxi under "not reached" every run implied a hole in the
  // testing; there is no hole, there is no caller. Saying which is which is
  // the difference between a coverage report that can reach 100% and one that
  // is permanently and misleadingly short.
  const missed = REACHABLE_REQUESTS.filter((r) => !c.requestsAnswered[r]);
  if (missed.length) {
    out.push(`  reachable but NOT reached in this run (${missed.length}):`);
    for (const r of missed) out.push(`      ${r.padEnd(24)} needs: ${REQUESTS[r].producer}`);
  }
  out.push(`  cannot occur in this build (${UNREACHABLE_REQUESTS.length}): ${UNREACHABLE_REQUESTS.join(', ')}`);
  out.push('      no call site in standard/standard_cards/maneuvering/test — not a coverage gap');
  const unanswered = Object.keys(c.requestsSeen).filter((r) => !c.requestsAnswered[r]);
  if (unanswered.length) out.push(`  !! sent by the engine but never answered here: ${unanswered.join(', ')}`);
  // A self-check on the instrument. Answering a question more often than the
  // engine asked it is arithmetically impossible, so if this fires the driver
  // is filing answers under the wrong command — which is precisely how
  // seventeen correctly-answered AskForCardChosen dialogs once got reported as
  // never reached, with the surplus quietly inflating PlayCard.
  const overcounted = Object.entries(c.requestsAnswered)
    .filter(([r, n]) => n > (c.requestsSeen[r] ?? 0))
    .map(([r, n]) => `${r} ${n}>${c.requestsSeen[r] ?? 0}`);
  if (overcounted.length) {
    out.push(`  !! HARNESS: answered more often than asked — ${overcounted.join(', ')}`);
    out.push('     the driver is mislabelling replies; fix the audit before trusting this table');
  }
  out.push(`  UI elements driven: ${top(c.interactions) || '—'}`);
  out.push(`  scene types: ${c.sceneTypes.join(', ') || '—'}`);
  if (c.requestsWithNoDialog.length) {
    out.push(`  !! requests with no dialog implemented: ${c.requestsWithNoDialog.join(', ')}`);
  }
  out.push(`  rounds reached: ${c.rounds}   damage events: ${c.damageEvents}   deaths: ${c.deaths}`);

  /* -------------------------------------------------------------- campaign */

  if (campaign && roster) {
    out.push('');
    out.push(bar());
    out.push(`CAMPAIGN — what has NEVER been exercised, over ${campaign.games} game(s) in `
      + `${campaign.runs} run(s) against build ${buildKey}`);
    out.push(bar());
    const g = campaign.gaps;
    const line = (label, missing, all) => {
      const covered = all.length - missing.length;
      const pct = all.length ? Math.round((covered / all.length) * 100) : 0;
      out.push(`  ${label.padEnd(28)} ${String(covered).padStart(3)}/${String(all.length).padEnd(3)} (${String(pct).padStart(3)}%)`
        + `${missing.length ? `  never: ${missing.slice(0, 22).join(', ')}${missing.length > 22 ? ` …+${missing.length - 22}` : ''}` : '  — complete'}`);
    };
    line('generals seated by a human', g.generalsNeverSeated, roster.generals);
    // Split out on purpose: a general the chooser has never once put in front
    // of a human seat is not something the driver failed to steer toward, and
    // reporting the two as one number makes an engine fact look like a harness
    // shortcoming.
    line('generals ever OFFERED to a seat', g.generalsNeverOffered ?? [], roster.generals);
    line('generals at the table', g.generals, roster.generals);
    const steerable = (g.generalsNeverSeated ?? []).filter((x) => !(g.generalsNeverOffered ?? []).includes(x));
    if (steerable.length) {
      out.push(`      offered but still never taken: ${steerable.join(', ')}`);
    }
    line('skills seen to fire', g.skills, roster.skills);
    if (g.skills.length && roster.skillTags) {
      const grouped = g.skills.reduce((m, s) => {
        const t = roster.skillTags[s] ?? 'active';
        (m[t] ??= []).push(s);
        return m;
      }, {});
      for (const [tag, list] of Object.entries(grouped)) {
        const why = tag === 'locked'
          ? ' (compulsory; several of these are passive and never animate an invocation)'
          : tag === 'lord' ? ' (needs its holder to be the lord, with same-kingdom allies seated)'
            : tag === 'limited' ? ' (once per game)' : '';
        out.push(`      ${tag}: ${list.join(', ')}${why}`);
      }
    }
    line('cards played', g.cards, roster.cards);
    const reqMissing = REACHABLE_REQUESTS.filter((r) => !campaign.requestsAnswered[r]);
    line('reachable request types', reqMissing, REACHABLE_REQUESTS);
    for (const r of reqMissing) {
      out.push(`      ${r.padEnd(24)} needs: ${REQUESTS[r].producer}`);
    }
    if (!campaign.biased) out.push('  (bias off — this run picked uniformly among legal options)');
    out.push(`  ledger: ${ledgerPath}`);
  }

  /* --------------------------------------------------------------- latency */

  out.push('');
  out.push(bar());
  out.push('LATENCY (ms)');
  out.push(bar());
  const row = (label, s) => out.push(`  ${label.padEnd(32)} ${s ? `n=${String(s.n).padEnd(6)} p50=${String(s.p50).padEnd(6)} p95=${String(s.p95).padEnd(6)} max=${s.max}` : '—'}`);
  row('request → answerable', latency.requestAnswerableMs);
  row('request → answered', latency.decisionMs);
  row('reply → next state change', latency.replyToChangeMs);
  row('cross-tab settle', latency.settleMs);

  /* ----------------------------------------------------------- main thread */

  out.push('');
  out.push(bar());
  out.push('MAIN THREAD');
  out.push(bar());
  if (!perf) {
    out.push('  not measured');
  } else {
    out.push('  Measured inside the tab — a 50 ms timer\'s overshoot. No socket, no node,');
    out.push('  no question being asked. This is the freeze a player feels.');
    row('page frozen (timer overshoot)', perf.pageBlockMs);
    row('dropped-frame gap', perf.frameGapMs);
    out.push(`  worst single freeze: ${perf.maxDriftMs} ms    worst frame gap: ${perf.maxFrameGapMs} ms`);
    out.push(`  ${perf.stalls} stall(s) of 100 ms or more, ${(perf.stalledMs / 1000).toFixed(1)}s lost to them in total`
      + `   (browser long-task time ${(perf.longTaskTotalMs / 1000).toFixed(1)}s, observer ${perf.longTaskObserver})`);
    out.push(`  full-table React renders (store commits): ${perf.storeCommits}`);
    out.push('');
    out.push('  For contrast, the outside view — round trip of a trivial `1` over CDP.');
    out.push('  Bigger than the freeze by the transport and by node\'s own busyness,');
    out.push('  which is why it is not the number any claim is made from.');
    row('evaluate round trip', latency.evalRoundTripMs);
    const pc = latency.probeCostMs ?? {};
    const worst = Object.entries(pc).slice(0, 3)
      .map(([k, v]) => `${k} p50=${v.p50} max=${v.max}`).join('   ');
    if (worst) out.push(`  what the instrument itself costs:  ${worst}`);

    const hot = (label, rows) => {
      if (!rows?.length) return;
      out.push('');
      out.push(`  ${label}`);
      for (const r of rows.slice(0, 8)) {
        out.push(`      ${String(r.name).slice(0, 34).padEnd(36)} ${String(r.n).padStart(7)} calls  `
          + `${String(r.totalMs).padStart(7)} ms total  ${String(r.avgMs).padStart(7)} ms avg  ${String(r.maxMs).padStart(6)} ms worst`);
      }
    };
    hot('client Lua VM calls, by total main-thread time:', perf.hotLua);
    hot('notify application, by command:', perf.hotNotify);
    hot('store publish (one per burst, = one full-table render):', perf.hotCommit);
    hot('the audit\'s own in-page cost, for comparison:', perf.probeCostByCall);

    const bySeat = Object.entries(perf.stallsBySeat ?? {}).sort();
    if (bySeat.length) {
      out.push('');
      out.push('  stalls by seat (p1 is the tab that opened the room, and so the one');
      out.push('  also running the authoritative engine and the host worker\'s pump):');
      for (const [seat, e] of bySeat) {
        out.push(`      ${seat}  ${String(e.stalls).padStart(4)} stall(s)  `
          + `${String(e.totalMs).padStart(6)} ms lost  worst ${e.worstMs} ms`);
      }
    }

    if (perf.stallTimelines?.length) {
      out.push('');
      out.push('  stalls per 30s of play, oldest first (one row per game):');
      for (const t of perf.stallTimelines.slice(0, 6)) {
        out.push(`      ${t.map((r) => `${r.stalls}×/${r.worstMs}ms`).join('  ')}`);
      }
      out.push('      a row that climbs is degradation, not a one-off freeze.');
    }

    const profiles = games.map((g) => g.profile).filter(Boolean);
    if (profiles.length) {
      out.push('');
      out.push('  CPU profile of the host seat, self time (a sampling profiler, so this');
      out.push('  names the work the in-page stopwatches cannot reach):');
      const acc = new Map();
      let totalMs = 0;
      for (const pr of profiles) {
        totalMs += pr.totalMs;
        for (const r of pr.top) acc.set(r.name, (acc.get(r.name) ?? 0) + r.ms);
      }
      const rows = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
      out.push(`      ${String(totalMs).padStart(7)} ms profiled in total`);
      for (const [name, ms] of rows) {
        const pct = totalMs ? ((ms / totalMs) * 100).toFixed(1) : '0.0';
        out.push(`      ${String(ms).padStart(7)} ms  ${String(pct).padStart(5)}%  ${name}`);
      }
    }

    if (perf.worstStalls?.length) {
      out.push('');
      out.push('  the worst freezes, and what was running inside them:');
      for (const s of perf.worstStalls.slice(0, 8)) {
        out.push(`      ${s.seat} ${String(s.blockedMs).padStart(6)} ms frozen  =  `
          + `app ${String(s.appMs).padStart(5)} ms  +  audit ${String(s.auditMs).padStart(4)} ms  `
          + `+  unexplained ${String(s.unexplainedMs).padStart(5)} ms`);
        if (s.luaGrew?.length) out.push(`             client VM: ${s.luaGrew.join('  ')}`);
        if (s.ran?.length) out.push(`             slow single calls: ${s.ran.join('  ')}`);
        if (s.longTaskAttribution?.length) out.push(`             longtask: ${s.longTaskAttribution.join(' ')}`);
      }
      out.push('      "app" is what the in-page stopwatches accumulated across the stall.');
      out.push('      "unexplained" is work nothing is timing — React reconciliation, style,');
      out.push('      layout, paint, GC — and a large residue means the freeze is in the');
      out.push('      render, not in the calls the render makes.');
    }
  }

  /* -------------------------------------------------------------- findings */

  out.push('');
  out.push(bar());
  out.push('FINDINGS, ranked');
  out.push(bar());
  const ranked = rank(findings);
  if (!ranked.length) out.push('  none');
  for (let i = 0; i < ranked.length; i++) {
    const f = ranked[i];
    out.push(`  ${String(i + 1).padStart(2)}. [${f.severity.toUpperCase()}] ${f.rule} / ${f.seat} — ${f.message}`);
    out.push(`      seen ${f.count}× · game ${f.game} · ${f.logPath}`);
    const d = f.detail ?? {};
    const bits = Object.entries(d)
      .filter(([k, v]) => !['key', 'severity', 'full', 'scene'].includes(k) && v != null && typeof v !== 'object')
      .slice(0, 6).map(([k, v]) => `${k}=${v}`);
    if (bits.length) out.push(`      ${bits.join('  ')}`);
    if (d.seq != null) out.push(`      grep the log:  jq 'select(.seat=="${f.seat}" and .kind=="request")' ${f.logPath} | head`);
  }

  out.push('');
  out.push(`logs: ${logDir}`);
  out.push('');
  return out.join('\n');
}

/**
 * Rank by what a maintainer should fix first: anything that stops a game, then
 * state corruption, then things a player sees, then noise. Frequency breaks
 * ties, because a fault on every decision is worse than one on a single turn.
 */
const RULE_WEIGHT = {
  setup: 100, driver: 95, completion: 90,
  liveness: 80, 'reply-delivery': 75,
  conservation: 70, retention: 68, agreement: 65, 'stale-request': 72,
  'duplicate-reply': 66,
  boundary: 60, exception: 55, rejection: 50,
  geometry: 45, render: 44, obscured: 74,
  console: 20, delay: 15, policy: 10,
};

export function rank(findings) {
  return [...findings].sort((a, b) => {
    if ((a.severity === 'fail') !== (b.severity === 'fail')) return a.severity === 'fail' ? -1 : 1;
    const w = (RULE_WEIGHT[b.rule] ?? 0) - (RULE_WEIGHT[a.rule] ?? 0);
    if (w) return w;
    return b.count - a.count;
  });
}
