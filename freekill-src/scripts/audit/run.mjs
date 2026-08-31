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
import { playAuditedGame } from './game.mjs';
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
  const [, v] = hit.split('=');
  return v === undefined ? true : v;
};

const positional = argv.find((a) => !a.startsWith('--'));
const url = String(flag('url', positional ?? (flag('live', false) ? LIVE : PREVIEW)))
  .replace(/\/$/, '') + '/';
const games = Number(flag('games', 1));
const seatCount = Math.max(1, Math.min(4, Number(flag('seats', 2))));
const parallel = Math.max(1, Number(flag('parallel', 1)));
const seed = Number(flag('seed', Date.now() % 100000));
const gameTimeoutMs = Number(flag('timeout', 15 * 60 * 1000));
const shots = Boolean(flag('shots', false));
const hook = !flag('no-hook', false);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logDir = resolve(String(flag('out', join(ROOT, 'node_modules', '.cache', 'fk-audit', 'runs', stamp))));

mkdirSync(logDir, { recursive: true });

const now = () => new Date().toISOString().slice(11, 19);
const say = (msg) => process.stdout.write(`${now()} ${msg}\n`);

say(`auditing ${url}`);
say(`${games} game(s) × ${seatCount} human seat(s), ${parallel} at a time, seed ${seed}`);
say(`logs → ${logDir}`);

/**
 * Each parallel slot gets its own profile set. Chrome holds an exclusive lock
 * on a user-data-dir, and two games sharing one is the "chrome exited 21" that
 * has nothing to do with the app.
 */
const cacheFor = (slot) => join(ROOT, 'node_modules', '.cache', 'fk-audit', `slot-${slot}`);

const results = [];
const allFindings = [];
const total = new Coverage();

const queue = Array.from({ length: games }, (_, i) => i + 1);
let nextIndex = 0;

async function worker(slot) {
  for (;;) {
    const i = nextIndex++;
    if (i >= queue.length) return;
    const gameIndex = queue[i];
    const gameSeed = seed + gameIndex * 104729;
    const t0 = Date.now();
    say(`game ${gameIndex} starting (slot ${slot}, seed ${gameSeed})`);
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
      onProgress: (m) => say(`  game ${gameIndex}: ${m}`),
    });
    results.push(result);
    total.merge(coverage);
    for (const f of result.findings) allFindings.push({ ...f, game: gameIndex, logPath: result.log });
    say(`game ${gameIndex} ${result.passed ? 'PASSED' : 'FAILED'} `
      + `(${result.outcome}, ${Math.round((Date.now() - t0) / 1000)}s, `
      + `${result.decisions} decisions, ${result.findings.filter((f) => f.severity === 'fail').length} findings)`);
  }
}

await Promise.all(Array.from({ length: Math.min(parallel, games) }, (_, k) => worker(k + 1)));
results.sort((a, b) => a.game - b.game);

const latency = mergeLatency(results.map((r) => r.latency));
const summary = {
  url, seatCount, seed, games: results, coverage: total.toJSON(),
  findings: allFindings, latency, logDir,
};
writeFileSync(join(logDir, 'summary.json'), JSON.stringify(summary, null, 2));
process.stdout.write(renderSummary(summary));

const failed = results.filter((r) => !r.passed).length;
say(`${results.length - failed}/${results.length} games passed. summary.json in ${logDir}`);
process.exit(failed ? 1 : 0);

function mergeLatency(all) {
  const keys = ['requestAnswerableMs', 'decisionMs', 'replyToChangeMs', 'mainThreadBlockMs', 'settleMs'];
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
