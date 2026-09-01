/**
 * The repeat runner.
 *
 *   npm run audit                                  # 1 game, 2 human seats, preview
 *   npm run audit -- --games=3 --seats=2
 *   npm run audit -- --live --games=2 --parallel=2
 *   npm run audit -- --url=http://127.0.0.1:4173/freekill/ --seed=1234
 *
 * Two constraints shape the defaults. Anonymous sign-up is rate limited to
 * 30/hour per IP, so seats reuse persistent Chrome profiles and a repeat run
 * costs zero new identities — without that the fourth invocation fails at the
 * front door and looks like a product bug. And a game takes minutes, so
 * progress streams as it goes and `--parallel` runs whole games side by side,
 * each with its own profile set so two Chromes never fight over one lock.
 *
 * Every run is reproducible: the seed and the room's join URL go in the summary
 * and every reply, in order, goes in the per-game log. Re-running with the same
 * `--seed` makes the same choices in the same situations.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRoster } from './catalogue.mjs';
import { playAuditedGame } from './game.mjs';
import { Ledger } from './ledger.mjs';
import { mergePerf } from './perf.mjs';
import { Coverage } from './session.mjs';
import { renderSummary } from './report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const LIVE = 'https://haoming-chen2006.github.io/freekill/';
const PREVIEW = 'http://127.0.0.1:4173/freekill/';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  // Split on the FIRST `=` only. `hit.split('=')[1]` silently truncated any
  // value containing one, so `--url=http://host/?pace=0` arrived as
  // `http://host/?pace` — a wrong URL that still fetched fine, so the run
  // completed and lied. Query strings are the common case; this is not exotic.
  const eq = hit.indexOf('=');
  return eq === -1 ? true : hit.slice(eq + 1);
};

/**
 * Normalise the base URL without corrupting its query.
 *
 * The old form was `u.replace(/\/$/, '') + '/'`, which appended the slash to
 * whatever the string ended with — for `…/freekill/?pace=0` that is the query,
 * giving `?pace=0/`. Only the *path* wants a trailing slash; `new URL` is what
 * knows where the path stops.
 *
 * `pace` defaults to 0 because a campaign is a bulk instrument. The engine's
 * 800 ms bot pace makes a game 2.5-4x longer, which runs past this harness's
 * own 15-minute per-game timeout and reports as a product failure. None of the
 * audit's checks read a clock — rules, geometry, card conservation, hand
 * retention, coverage and liveness are all event-driven — and at `pace=0` the
 * driver takes byte-for-byte the pre-pacing path. An explicit `pace` in the URL
 * still wins, so `…/?pace=800` audits the paced build on purpose.
 */
function normaliseBase(raw) {
  const u = new URL(String(raw));
  if (!u.pathname.endsWith('/')) u.pathname += '/';
  if (!u.searchParams.has('pace')) u.searchParams.set('pace', '0');
  return u.toString();
}

const positional = argv.find((a) => !a.startsWith('--'));
const url = normaliseBase(flag('url', positional ?? (flag('live', false) ? LIVE : PREVIEW)));
const games = Number(flag('games', 1));
const seatCount = Math.max(1, Math.min(4, Number(flag('seats', 2))));
const parallel = Math.max(1, Number(flag('parallel', 1)));
const seed = Number(flag('seed', Date.now() % 100000));
const gameTimeoutMs = Number(flag('timeout', 15 * 60 * 1000));
const shots = Boolean(flag('shots', false));
const profile = Boolean(flag('profile', false));
const hook = !flag('no-hook', false);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logDir = resolve(String(flag('out', join(ROOT, 'node_modules', '.cache', 'fk-audit', 'runs', stamp))));

mkdirSync(logDir, { recursive: true });

const now = () => new Date().toISOString().slice(11, 19);
const say = (msg) => process.stdout.write(`${now()} ${msg}\n`);

/**
 * Fail fast on an unreachable URL.
 *
 * Without this, a preview server that is not running costs a 60-second
 * sign-in timeout and then reports itself as a product failure at the front
 * door — which is exactly the confusion this suite exists to remove.
 */
const reachable = await fetch(url, { redirect: 'follow' })
  .then((r) => r.ok, () => false);
if (!reachable) {
  process.stderr.write(`\ncannot reach ${url}\n`
    + `  start one with:  npm run preview     (serves http://127.0.0.1:4173/freekill/)\n`
    + `  or audit the deployed site:  npm run audit:live\n\n`);
  process.exit(2);
}

/**
 * The campaign.
 *
 * Coverage from a single run answers "what did these games do". The question
 * worth asking is "what have we still never tested", and that needs a
 * denominator and a memory: the roster comes out of the build under test, and
 * what has ever been covered against that build persists between runs. The
 * same file is what lets the driver prefer a general it has never seated —
 * without it every run rediscovers the popular half of the roster.
 */
const roster = await loadRoster(url);
const buildKey = Ledger.buildKey(roster);
const ledgerPath = resolve(String(flag('ledger',
  join(ROOT, 'node_modules', '.cache', 'fk-audit', 'campaign.json'))));
const ledger = new Ledger(ledgerPath, buildKey);
const fresh = Boolean(flag('fresh-campaign', false));
if (fresh) ledger.data = { ...new Ledger('/dev/null', buildKey).data, buildKey };
const biasOn = !flag('no-bias', false);

say(`auditing ${url}`);
say(`${games} game(s) × ${seatCount} human seat(s), ${parallel} at a time, seed ${seed}`);
say(`build ${buildKey}: ${roster.generals.length} generals, ${roster.cards.length} cards, `
  + `packs ${[...(roster.packs.general ?? []), ...(roster.packs.card ?? [])].join('+')}`);
if (ledger.reset) {
  say(`campaign reset: the ledger was measured against build ${ledger.previous.buildKey}, `
    + `which shipped a different roster`);
}
const gapsBefore = ledger.gaps(roster);
say(`campaign so far: ${ledger.data.games} game(s); `
  + `never seated ${gapsBefore.generalsNeverSeated.length}/${roster.generals.length} generals, `
  + `never fired ${gapsBefore.skills.length}/${roster.skills.length} skills, `
  + `never played ${gapsBefore.cards.length}/${roster.cards.length} cards`);
say(`logs → ${logDir}`);

/**
 * Each parallel slot gets its own profile set. Chrome holds an exclusive lock
 * on a user-data-dir, and two games sharing one is the "chrome exited 21" that
 * has nothing to do with the app.
 */
const cacheFor = (slot) => join(ROOT, 'node_modules', '.cache', 'fk-audit', `slot-${slot}`);

const results = [];
const allFindings = [];
const allPerf = [];
const total = new Coverage();

/**
 * Recomputed per game, so two games in a run do not both go chasing the same
 * gap while a third is left uncovered. With `--parallel` the games that start
 * together share a view, which is the honest cost of running them at once.
 */
const biasFor = () => {
  if (!biasOn) return null;
  const g = ledger.gaps(roster);
  return {
    generals: new Set(g.generalsNeverSeated),
    skills: new Set(g.skills),
    cards: new Set(g.cards),
  };
};

const queue = Array.from({ length: games }, (_, i) => i + 1);
let nextIndex = 0;

async function worker(slot) {
  for (;;) {
    const i = nextIndex++;
    if (i >= queue.length) return;
    const gameIndex = queue[i];
    const gameSeed = seed + gameIndex * 104729;
    const t0 = Date.now();
    const bias = biasFor();
    say(`game ${gameIndex} starting (slot ${slot}, seed ${gameSeed}`
      + `${bias?.generals.size ? `, hunting ${bias.generals.size} unseated general(s)` : ''})`);
    const { result, coverage } = await playAuditedGame({
      base: url,
      seats: seatCount,
      seed: gameSeed,
      gameIndex,
      cacheDir: cacheFor(slot),
      logDir,
      gameTimeoutMs,
      shots,
      hook,
      bias,
      profile,
      onProgress: (m) => say(`  game ${gameIndex}: ${m}`),
    });
    results.push(result);
    total.merge(coverage);
    if (result.perf) allPerf.push(result.perf);
    // Folded in as each game finishes, not at the end: a run that is killed
    // half way should still leave the campaign knowing what it covered, and
    // the game after this one should already be hunting a different general.
    ledger.absorb(result.coverage, { seatedGenerals: result.seatedGenerals ?? [] });
    ledger.save();
    for (const f of result.findings) allFindings.push({ ...f, game: gameIndex, logPath: result.log });
    const newlySeated = (result.seatedGenerals ?? []).filter((g) => gapsBefore.generalsNeverSeated.includes(g));
    say(`game ${gameIndex} ${result.passed ? 'PASSED' : 'FAILED'} `
      + `(${result.outcome}, ${Math.round((Date.now() - t0) / 1000)}s, `
      + `${result.decisions} decisions, ${result.findings.filter((f) => f.severity === 'fail').length} findings`
      + `${newlySeated.length ? `, NEW: ${newlySeated.join('+')}` : ''})`);
  }
}

await Promise.all(Array.from({ length: Math.min(parallel, games) }, (_, k) => worker(k + 1)));
results.sort((a, b) => a.game - b.game);

const latency = mergeLatency(results.map((r) => r.latency));
ledger.noteSession({
  at: Date.now(), seed, url, games: results.length, logDir,
  decisions: results.reduce((n, r) => n + r.decisions, 0),
  findings: allFindings.filter((f) => f.severity === 'fail').length,
});
ledger.save();

const summary = {
  url, seatCount, seed, games: results, coverage: total.toJSON(),
  findings: allFindings, latency, logDir,
  perf: mergePerf(allPerf),
  roster, buildKey, ledgerPath,
  campaign: {
    games: ledger.data.games, runs: ledger.data.runs, decisions: ledger.data.decisions,
    gaps: ledger.gaps(roster),
    generalsSeated: Object.keys(ledger.data.generalsSeated).sort(),
    skillsFired: Object.keys(ledger.data.skillsFired).sort(),
    cardsUsed: Object.keys(ledger.data.cardsUsed).sort(),
    requestsAnswered: ledger.data.requestsAnswered,
    biased: biasOn,
  },
};
writeFileSync(join(logDir, 'summary.json'), JSON.stringify(summary, null, 2));
process.stdout.write(renderSummary(summary));

const failed = results.filter((r) => !r.passed).length;
say(`${results.length - failed}/${results.length} games passed. summary.json in ${logDir}`);
say(`campaign ledger → ${ledgerPath}`);
process.exit(failed ? 1 : 0);

function mergeLatency(all) {
  const keys = ['requestAnswerableMs', 'decisionMs', 'replyToChangeMs', 'evalRoundTripMs', 'settleMs'];
  const out = {};
  for (const k of keys) {
    const parts = all.map((a) => a?.[k]).filter(Boolean);
    if (!parts.length) { out[k] = null; continue; }
    out[k] = {
      n: parts.reduce((s, p) => s + p.n, 0),
      p50: Math.round(parts.reduce((s, p) => s + p.p50 * p.n, 0) / parts.reduce((s, p) => s + p.n, 0)),
      p95: Math.max(...parts.map((p) => p.p95 ?? 0)),
      max: Math.max(...parts.map((p) => p.max ?? 0)),
    };
  }
  return out;
}
