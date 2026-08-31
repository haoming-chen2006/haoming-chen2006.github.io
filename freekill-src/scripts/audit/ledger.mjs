/**
 * What the campaign has ever exercised.
 *
 * One run's coverage answers "what did this game do". Nobody asked that. The
 * question is "what have we never tested", and that one can only be answered
 * across every game ever played — so coverage is accumulated in a file that
 * outlives the run, keyed by the build it was measured against.
 *
 * It is also the input to the bias. A driver that picks uniformly among legal
 * options re-covers the popular paths every game and reaches the rare ones by
 * luck; a driver that knows zhugeliang has never been seated can prefer him
 * *when the dialog offers him*, and the rare path stops being a coin flip. The
 * ledger is what makes that preference possible, which is why it lives here
 * next to the coverage rather than in the report.
 *
 * The build key matters: coverage measured against a build with a different
 * package set is not evidence about this one. A roster change starts a new
 * ledger rather than silently inheriting stale credit.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const EMPTY = () => ({
  version: 1,
  buildKey: null,
  firstRunAt: null,
  lastRunAt: null,
  runs: 0,
  games: 0,
  decisions: 0,
  generals: {},          // general -> games it was on the table
  generalsSeated: {},    // general -> times a *human* seat played it
  generalsOffered: {},   // general -> times the chooser showed it to a human seat
  skillsFired: {},
  skillsGranted: {},
  cardsUsed: {},
  suits: {},
  cardTypes: {},
  cardSubtypes: {},
  requestsSeen: {},
  requestsAnswered: {},
  interactions: {},
  sceneTypes: {},
  dialogsRendered: {},
  rounds: 0,
  damageEvents: 0,
  deaths: 0,
  sessions: [],          // {at, seed, url, games, findings, logDir}
});

const bump = (obj, key, n = 1) => { if (key != null && key !== '') obj[key] = (obj[key] ?? 0) + n; };

export class Ledger {
  constructor(path, buildKey) {
    this.path = path;
    this.data = EMPTY();
    this.reset = false;
    try {
      const disk = JSON.parse(readFileSync(path, 'utf8'));
      if (disk.version === 1 && (!buildKey || !disk.buildKey || disk.buildKey === buildKey)) {
        this.data = { ...EMPTY(), ...disk };
      } else if (disk.buildKey && buildKey && disk.buildKey !== buildKey) {
        // Coverage against a different package set is not evidence about this
        // one. Keeping it would credit this build for generals it does not ship.
        this.reset = true;
        this.previous = { buildKey: disk.buildKey, games: disk.games, generals: Object.keys(disk.generals ?? {}).length };
      }
    } catch { /* first run */ }
    this.data.buildKey = buildKey ?? this.data.buildKey;
  }

  /** A stable name for "this build's content", so a roster change is visible. */
  static buildKey(roster) {
    return createHash('sha256')
      .update(JSON.stringify({ g: roster.generals, c: roster.cards, p: roster.packs }))
      .digest('hex').slice(0, 16);
  }

  /** Fold one game's Coverage#toJSON into the campaign. */
  absorb(cov, { seatedGenerals = [] } = {}) {
    const d = this.data;
    d.games += 1;
    for (const g of cov.generals ?? []) bump(d.generals, g);
    for (const g of seatedGenerals) bump(d.generalsSeated, g);
    for (const g of cov.generalsOffered ?? []) bump(d.generalsOffered, g);
    for (const s of cov.skillsGranted ?? []) bump(d.skillsGranted, s);
    for (const [k, n] of Object.entries(cov.skillsFired ?? {})) bump(d.skillsFired, k, n);
    for (const [k, n] of Object.entries(cov.cardsUsed ?? {})) bump(d.cardsUsed, k, n);
    for (const [k, n] of Object.entries(cov.requestsSeen ?? {})) bump(d.requestsSeen, k, n);
    for (const [k, n] of Object.entries(cov.requestsAnswered ?? {})) bump(d.requestsAnswered, k, n);
    for (const [k, n] of Object.entries(cov.interactions ?? {})) bump(d.interactions, k, n);
    for (const s of cov.suits ?? []) bump(d.suits, s);
    for (const s of cov.cardTypes ?? []) bump(d.cardTypes, s);
    for (const s of cov.cardSubtypes ?? []) bump(d.cardSubtypes, s);
    for (const s of cov.sceneTypes ?? []) bump(d.sceneTypes, s);
    for (const s of cov.dialogsRendered ?? []) bump(d.dialogsRendered, s);
    d.rounds += cov.rounds ?? 0;
    d.damageEvents += cov.damageEvents ?? 0;
    d.deaths += cov.deaths ?? 0;
  }

  noteSession({ at, seed, url, games, findings, logDir, decisions }) {
    const d = this.data;
    d.runs += 1;
    d.decisions += decisions ?? 0;
    d.firstRunAt ??= at;
    d.lastRunAt = at;
    d.sessions.push({ at, seed, url, games, findings, logDir });
    if (d.sessions.length > 200) d.sessions.splice(0, d.sessions.length - 200);
  }

  /**
   * What to steer toward: everything the build ships that the campaign has
   * never seen. This is the whole point of keeping the file.
   */
  gaps(roster) {
    const d = this.data;
    const never = (all, seen) => all.filter((x) => !seen[x]);
    return {
      generals: never(roster.generals, d.generals),
      generalsNeverSeated: never(roster.generals, d.generalsSeated),
      generalsNeverOffered: never(roster.generals, d.generalsOffered),
      skills: never(roster.skills, d.skillsFired),
      cards: never(roster.cards, d.cardsUsed),
    };
  }

  /** Written via a temp file: a killed run must not leave a half-parsed ledger. */
  save() {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.path);
  }
}
