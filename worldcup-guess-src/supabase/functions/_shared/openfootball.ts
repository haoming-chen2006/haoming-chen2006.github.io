// Shared helpers for refresh-results edge function.

export const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

/** openfootball name → our canonical DB team name */
export const TEAM_ALIASES: Record<string, string> = {
  USA: 'United States',
  'South Korea': 'Korea Republic',
  'Czech Republic': 'Czechia',
  Turkey: 'Turkiye',
  'Ivory Coast': "Cote d'Ivoire",
  'Côte d\'Ivoire': "Cote d'Ivoire",
  Curaçao: 'Curacao',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
};

export type OpenfootballMatch = {
  round?: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  num?: number;
  score?: {
    ft?: [number, number];
    ht?: [number, number];
    pen?: [number, number];
  };
};

export type DbMatch = {
  id: string;
  match_number: number | null;
  team_home: string | null;
  team_away: string | null;
  openfootball_key: string | null;
  city: string | null;
  venue: string | null;
};

export function makeOpenfootballKey(entry: OpenfootballMatch): string {
  return `${entry.date}|${entry.ground}|${entry.time}`;
}

export function normalizeTeam(name: string): string {
  const trimmed = name.trim();
  return TEAM_ALIASES[trimmed] ?? trimmed;
}

/** Normalize ground/city for fuzzy venue matching */
export function normalizeGround(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function groundsMatch(dbCity: string | null, dbVenue: string | null, ofGround: string): boolean {
  const g = normalizeGround(ofGround);
  if (!g) return false;
  const city = normalizeGround(dbCity ?? '');
  const venue = normalizeGround(dbVenue ?? '');
  return g.includes(city) || city.includes(g) || g.includes(venue) || venue.includes(g) ||
    (city.length > 0 && g.startsWith(city.slice(0, 6)));
}

export function teamsPairKey(date: string, team1: string, team2: string): string {
  const a = normalizeTeam(team1);
  const b = normalizeTeam(team2);
  const sorted = [a, b].sort();
  return `${date}|${sorted[0]}|${sorted[1]}`;
}

export function resolveActualResult(
  entry: OpenfootballMatch,
  teamHome: string,
  teamAway: string,
): { homeScore: number; awayScore: number; winner: string | null } | null {
  if (!entry.score?.ft) return null;
  const [s1, s2] = entry.score.ft;
  const t1 = normalizeTeam(entry.team1);
  const t2 = normalizeTeam(entry.team2);

  let homeScore = s1;
  let awayScore = s2;

  // openfootball team order may differ from our home/away
  if (t1 === normalizeTeam(teamAway) && t2 === normalizeTeam(teamHome)) {
    homeScore = s2;
    awayScore = s1;
  } else if (t1 !== normalizeTeam(teamHome) || t2 !== normalizeTeam(teamAway)) {
    // bracket placeholder slots — keep ft order as home/away if teams align partially
    if (normalizeTeam(entry.team1) !== normalizeTeam(teamHome)) {
      homeScore = s2;
      awayScore = s1;
    }
  }

  let winner: string | null;
  if (entry.score.pen) {
    const [p1, p2] = entry.score.pen;
    const penWinnerSide = p1 > p2 ? entry.team1 : entry.team2;
    winner = normalizeTeam(penWinnerSide) === normalizeTeam(teamHome) ? teamHome : teamAway;
  } else if (homeScore > awayScore) {
    winner = teamHome;
  } else if (awayScore > homeScore) {
    winner = teamAway;
  } else {
    winner = null; // genuine draw (no penalties) → null actual_winner
  }

  return { homeScore, awayScore, winner };
}

export function findDbMatch(
  entry: OpenfootballMatch,
  dbMatches: DbMatch[],
): DbMatch | null {
  const key = makeOpenfootballKey(entry);

  const byKey = dbMatches.find((m) => m.openfootball_key === key);
  if (byKey) return byKey;

  if (entry.num != null) {
    const byNum = dbMatches.find((m) => m.match_number === entry.num);
    if (byNum) return byNum;
  }

  const t1 = normalizeTeam(entry.team1);
  const t2 = normalizeTeam(entry.team2);
  const pairKey = teamsPairKey(entry.date, t1, t2);

  const candidates = dbMatches.filter((m) => {
    if (!m.team_home || !m.team_away) return false;
    const dbPair = teamsPairKey(entry.date, m.team_home, m.team_away);
    return dbPair === pairKey;
  });

  if (candidates.length === 1) return candidates[0];

  if (candidates.length > 1) {
    const byGround = candidates.find((m) => groundsMatch(m.city, m.venue, entry.ground));
    if (byGround) return byGround;
  }

  // Last resort: date + ground only (team names may be placeholders pre-playoff)
  const byVenue = dbMatches.filter(
    (m) => groundsMatch(m.city, m.venue, entry.ground) &&
      m.team_home && m.team_away &&
      (normalizeTeam(entry.team1) === m.team_home ||
        normalizeTeam(entry.team2) === m.team_away ||
        normalizeTeam(entry.team1) === m.team_away ||
        normalizeTeam(entry.team2) === m.team_home),
  );
  if (byVenue.length === 1) return byVenue[0];

  return null;
}
