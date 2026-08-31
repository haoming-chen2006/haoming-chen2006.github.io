/**
 * What a human reads afterwards.
 *
 * Two rules shape this. First, an invariant that was never exercised is
 * reported as "not exercised", never as a pass — a suite that shows green for
 * checks it never ran is how a game that dealt nothing scored 13/13. Second,
 * every finding names the log line that proves it, because a bug report without
 * evidence gets argued with instead of fixed.
 */

const RULES = [
  ['conservation', 'card conservation', 'all cards in exactly one zone'],
  ['agreement', 'cross-seat agreement', 'tabs converge on shared state'],
  ['liveness', 'liveness', 'every request becomes answerable and closes'],
  ['retention', 'hand retention', 'hands change only by announced moves'],
  ['geometry', 'geometry', 'the table is on screen at a usable size'],
  ['render', 'render fidelity', 'the DOM draws what the model holds'],
  ['reply-delivery', 'reply delivery', 'pressing an enabled control sends a reply'],
  ['stale-request', 'request closes', 'an answered request stops offering controls'],
  ['exception', 'no exceptions', 'nothing thrown in any tab'],
  ['rejection', 'no unhandled rejections', 'no promise left unhandled'],
  ['console', 'no console errors', 'the app logs no errors'],
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

export function renderSummary({ url, seatCount, seed, games, coverage, findings, latency, logDir }) {
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
    render: ran('geometry'),
    'reply-delivery': decisions,
    'stale-request': decisions,
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
  out.push(`  generals played (${c.generals.length}): ${c.generals.join(', ') || '—'}`);
  out.push(`  skills granted (${c.skillsGranted.length}): ${c.skillsGranted.join(', ') || '—'}`);
  out.push(`  skills that FIRED (${Object.keys(c.skillsFired).length}): ${top(c.skillsFired) || '—'}`);
  out.push(`  card types: ${c.cardTypes.join(', ') || '—'}   subtypes: ${c.cardSubtypes.join(', ') || '—'}`);
  out.push(`  suits: ${c.suits.join(', ') || '—'}`);
  out.push(`  cards seen in play (${Object.keys(c.cardsUsed).length}): ${top(c.cardsUsed, 18) || '—'}`);
  out.push(`  request types the engine sent (${Object.keys(c.requestsSeen).length}): ${top(c.requestsSeen, 18) || '—'}`);
  out.push(`  request types this suite ANSWERED (${Object.keys(c.requestsAnswered).length}): ${top(c.requestsAnswered, 18) || '—'}`);
  out.push(`  UI elements driven: ${top(c.interactions) || '—'}`);
  out.push(`  scene types: ${c.sceneTypes.join(', ') || '—'}`);
  if (c.requestsWithNoDialog.length) {
    out.push(`  !! requests with no dialog implemented: ${c.requestsWithNoDialog.join(', ')}`);
  }
  out.push(`  rounds reached: ${c.rounds}   damage events: ${c.damageEvents}   deaths: ${c.deaths}`);

  /* --------------------------------------------------------------- latency */

  out.push('');
  out.push(bar());
  out.push('LATENCY (ms)');
  out.push(bar());
  const row = (label, s) => out.push(`  ${label.padEnd(30)} ${s ? `n=${String(s.n).padEnd(5)} p50=${String(s.p50).padEnd(6)} p95=${String(s.p95).padEnd(6)} max=${s.max}` : '—'}`);
  row('request → answerable', latency.requestAnswerableMs);
  row('request → answered', latency.decisionMs);
  row('reply → next state change', latency.replyToChangeMs);
  row('main thread block (evaluate)', latency.mainThreadBlockMs);
  row('cross-tab settle', latency.settleMs);

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
  boundary: 60, exception: 55, rejection: 50,
  geometry: 45, render: 44,
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
