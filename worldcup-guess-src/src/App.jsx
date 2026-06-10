import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { groups, rounds, seedMatches, teamInfo } from './data/fixtures.js';
import { playerPool } from './data/players.js';
import RefreshResultsButton from './components/RefreshResultsButton.jsx';
import MatchPredictionBars, { useGuessDistributions } from './components/MatchPredictionBars.jsx';
import UserProfilePanel from './components/UserProfilePanel.jsx';
import {
  LANG_KEY,
  applyDemoMexicoLock,
  createT,
  formatKickoff,
  formatLockCountdown,
  getGuessDeadline,
  roundLabel,
} from './i18n.js';

const tabIds = ['guess', 'schedule', 'leaderboard', 'personal'];

const trophyFields = [
  { field: 'champion_team', labelKey: 'champion', icon: '🏆', type: 'team' },
  { field: 'top4_teams', labelKey: 'top4', icon: '🥇', type: 'teams' },
  { field: 'top_scorer', labelKey: 'goldenBoot', icon: '🥾', type: 'player' },
  { field: 'top_assister', labelKey: 'assistKing', icon: '🎯', type: 'player' },
  { field: 'best_player', labelKey: 'goldenBall', icon: '⚽', type: 'player' },
  { field: 'best_young_player', labelKey: 'bestYoung', icon: '🌟', type: 'player' },
];

const localGuessKey = 'worldcup-guess-local-guesses';
const localPlayerKey = 'worldcup-guess-player-artifact';
const localRankingKey = 'worldcup-guess-group-rankings';
const localBracketKey = 'worldcup-guess-bracket-picks';
const buyinDismissedKey = 'worldcup-guess-buyin-dismissed';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function BuyinModal({ t, onAgree }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  return (
    <div className="buyin-overlay" role="dialog" aria-modal="true" aria-label={t('buyinTitle')}>
      <div className="buyin-modal">
        <h2>{t('buyinTitle')}</h2>
        <p>{t('buyinBody')}</p>
        <label className="buyin-dont-show">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>{t('buyinDontShow')}</span>
        </label>
        <button type="button" className="buyin-agree" onClick={() => onAgree(dontShowAgain)}>
          {t('buyinAgree')}
        </button>
      </div>
    </div>
  );
}

function getMatchState(match, guess, now = Date.now()) {
  if (!match.sides_confirmed) return 'not_out';
  if (new Date(getGuessDeadline(match)).getTime() <= now) return 'backlogged';
  return guess ? 'out_and_guessed' : 'out_not_guessed';
}

function pickWinner(guess, match) {
  if (!guess) return '';
  if (guess.pred_home_score === guess.pred_away_score) return guess.pred_winner || '';
  return Number(guess.pred_home_score) > Number(guess.pred_away_score) ? match.team_home : match.team_away;
}

function teamFlag(team) {
  return teamInfo[team]?.flag || '◇';
}

function byKickoff(a, b) {
  return new Date(a.kickoff_time) - new Date(b.kickoff_time);
}

function playerLabel(player) {
  return `${player.name} · ${player.team}`;
}

function searchScore(player, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;
  const name = player.name.toLowerCase();
  const team = player.team.toLowerCase();
  if (name === normalized) return 1000;
  if (name.startsWith(normalized)) return 800;
  if (name.includes(normalized)) return 600 - name.indexOf(normalized);
  if (team.includes(normalized)) return 250;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.reduce((score, token) => score + (name.includes(token) ? 80 : 0), 0);
}

function resolveBracketTeam(slot, groupRankings) {
  if (!slot) return null;
  const pick = String(slot).match(/^([WL])(\d+)$/);
  if (pick) return null;

  const direct = String(slot).match(/^([123])([A-L])$/);
  if (direct) {
    const [, rank, group] = direct;
    return groupRankings[group]?.[Number(rank) - 1] || null;
  }

  const thirdCandidates = String(slot).match(/^3([A-L/]+)$/);
  if (thirdCandidates) {
    const teams = thirdCandidates[1]
      .split('/')
      .map((group) => groupRankings[group]?.[2])
      .filter(Boolean);
    return teams.length ? `3rd: ${teams.join(' / ')}` : null;
  }

  return null;
}

function resolveBracketSlot(slot, groupRankings, bracketPicks) {
  if (!slot) return null;
  const pick = String(slot).match(/^([WL])(\d+)$/);
  if (pick) {
    const [, side, matchNumber] = pick;
    const previous = bracketPicks[matchNumber];
    if (!previous) return slot;
    return side === 'W' ? previous.winner : previous.loser;
  }

  return resolveBracketTeam(slot, groupRankings) || slot;
}

function getMatchSides(match, groupRankings, bracketPicks) {
  return {
    home: resolveBracketSlot(match.team_home, groupRankings, bracketPicks),
    away: resolveBracketSlot(match.team_away, groupRankings, bracketPicks),
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('guess');
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en');
  const [session, setSession] = useState(null);
  const [matches, setMatches] = useState(() => applyDemoMexicoLock(seedMatches));
  const [players, setPlayers] = useState(playerPool);
  const [guesses, setGuesses] = useState(() => JSON.parse(localStorage.getItem(localGuessKey) || '{}'));
  const [playerArtifact, setPlayerArtifact] = useState(() =>
    JSON.parse(localStorage.getItem(localPlayerKey) || '{"top4_teams":[]}')
  );
  const [groupRankings, setGroupRankings] = useState(() =>
    JSON.parse(localStorage.getItem(localRankingKey) || '{}')
  );
  const [bracketPicks, setBracketPicks] = useState(() =>
    JSON.parse(localStorage.getItem(localBracketKey) || '{}')
  );
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showBuyin, setShowBuyin] = useState(
    () => localStorage.getItem(buyinDismissedKey) !== 'true'
  );
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState('');
  const now = useNow();
  const t = useMemo(() => createT(lang), [lang]);
  const displayStatus = status || t('statusLocalDraft');
  const { distributions, reload: reloadDistributions } = useGuessDistributions();

  async function reloadMatchesAndLeaderboard() {
    const [{ data: remoteMatches }, { data: leaderboard }] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_time', { ascending: true }),
      supabase.rpc('get_leaderboard'),
    ]);
    if (remoteMatches?.length) setMatches(applyDemoMexicoLock(remoteMatches));
    if (leaderboard) setLeaderboardRows(leaderboard);
    await reloadDistributions();
  }

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(localGuessKey, JSON.stringify(guesses));
  }, [guesses]);

  useEffect(() => {
    localStorage.setItem(localPlayerKey, JSON.stringify(playerArtifact));
  }, [playerArtifact]);

  useEffect(() => {
    localStorage.setItem(localRankingKey, JSON.stringify(groupRankings));
  }, [groupRankings]);

  useEffect(() => {
    localStorage.setItem(localBracketKey, JSON.stringify(bracketPicks));
  }, [bracketPicks]);

  useEffect(() => {
    async function loadRemoteData() {
      await supabase.rpc('refresh_demo_mexico_lock').catch(() => null);

      if (session) {
        await supabase.from('profiles').upsert(
          {
            user_id: session.user.id,
            email: session.user.email,
            display_name: session.user.email?.split('@')[0] || 'Player',
          },
          { onConflict: 'user_id' },
        );
      }

      const [{ data: remoteMatches, error: matchError }, { data: remotePlayers }, { data: remoteGuesses, error: guessError }, artifactResult, stateResult] =
        await Promise.all([
          supabase.from('matches').select('*').order('kickoff_time', { ascending: true }),
          supabase.from('players').select('*').order('name', { ascending: true }),
          session ? supabase.from('guesses').select('*').eq('user_id', session.user.id) : Promise.resolve({ data: null }),
          session
            ? supabase.from('player_artifacts').select('*').eq('user_id', session.user.id).maybeSingle()
            : Promise.resolve({ data: null }),
          session
            ? supabase.from('prediction_states').select('*').eq('user_id', session.user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

      if (remoteMatches?.length) {
        setMatches(applyDemoMexicoLock(remoteMatches));
        setStatus(session ? t('statusSynced') : t('statusFixtureLoaded'));
      } else if (matchError) {
        setStatus(t('statusLocalDraft'));
      }

      if (remotePlayers?.length) {
        setPlayers(remotePlayers);
      }

      if (remoteGuesses?.length && !guessError) {
        setGuesses(Object.fromEntries(remoteGuesses.map((guess) => [guess.match_id, guess])));
      }

      if (artifactResult?.data) {
        setPlayerArtifact(artifactResult.data);
      }

      if (stateResult?.data) {
        setGroupRankings(stateResult.data.group_rankings || {});
        setBracketPicks(stateResult.data.bracket_picks || {});
      }
    }

    loadRemoteData();
  }, [session, t]);

  useEffect(() => {
    async function loadLeaderboard() {
      const { data, error } = await supabase.rpc('get_leaderboard');
      if (error) return;
      setLeaderboardRows(data || []);
    }

    loadLeaderboard();
  }, [session, guesses]);

  const orderedMatches = useMemo(() => [...matches].sort(byKickoff), [matches]);
  const teams = useMemo(() => groups.flatMap((group) => group.teams).sort(), []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setStatus(t('statusSignedOut'));
  }

  async function savePredictionState(nextGroupRankings = groupRankings, nextBracketPicks = bracketPicks) {
    if (!session) return;
    const { error } = await supabase.from('prediction_states').upsert(
      {
        user_id: session.user.id,
        group_rankings: nextGroupRankings,
        bracket_picks: nextBracketPicks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    setStatus(error ? error.message : t('statusStateSaved'));
  }

  async function saveGuess(match, patch) {
    const state = getMatchState(match, guesses[match.id], now);
    if (state === 'backlogged') {
      setNotice(t('noticeMatchLocked'));
      window.setTimeout(() => setNotice(''), 2800);
      return false;
    }
    if (state === 'not_out') {
      setNotice(t('noticeMatchNotOpen'));
      window.setTimeout(() => setNotice(''), 2800);
      return false;
    }
    const current = guesses[match.id] || {
      match_id: match.id,
      pred_home_score: 0,
      pred_away_score: 0,
      pred_winner: match.team_home || '',
    };
    const next = { ...current, ...patch };
    setGuesses((previous) => ({ ...previous, [match.id]: next }));

    if (!session) {
      setStatus(t('statusGuessSaved'));
      return true;
    }

    const payload = { ...next, user_id: session.user.id };
    const { error } = await supabase.from('guesses').upsert(payload, { onConflict: 'user_id,match_id' });
    setStatus(error ? error.message : t('statusGuessSaved'));
    return !error;
  }

  async function savePlayerArtifact(field, value) {
    const nextArtifact = { ...playerArtifact, [field]: value };
    setPlayerArtifact(nextArtifact);

    if (!session) {
      setStatus(t('statusTournamentSaved'));
      return true;
    }

    const { error } = await supabase
      .from('player_artifacts')
      .upsert({ ...nextArtifact, user_id: session.user.id }, { onConflict: 'user_id' });
    setStatus(error ? error.message : t('statusTournamentSaved'));
    return !error;
  }

  function saveGroupRankings(nextOrUpdater) {
    setGroupRankings((current) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater;
      savePredictionState(next, bracketPicks);
      return next;
    });
    return true;
  }

  function saveBracketPicks(nextOrUpdater) {
    setBracketPicks((current) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater;
      savePredictionState(groupRankings, next);
      return next;
    });
    return true;
  }

  return (
    <main className="app-shell">
      {showBuyin && (
        <BuyinModal
          t={t}
          onAgree={(dontShowAgain) => {
            if (dontShowAgain) localStorage.setItem(buyinDismissedKey, 'true');
            setShowBuyin(false);
          }}
        />
      )}
      {notice && <div className="toast-notice">{notice}</div>}
      <header className="topbar">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
        </div>
        <div className="topbar-actions">
          <RefreshResultsButton t={t} onComplete={reloadMatchesAndLeaderboard} />
          <button
            type="button"
            className="lang-toggle"
            aria-label={t('langToggleAria')}
            onClick={() => setLang((current) => (current === 'en' ? 'zh' : 'en'))}
          >
            {t('langToggle')}
          </button>
          <div className="demo-status-pill">{displayStatus}</div>
          {session && (
            <form className="auth-panel">
              <span>{session.user.email}</span>
              <button type="button" onClick={signOut}>
                {t('signOut')}
              </button>
            </form>
          )}
        </div>
      </header>

      <p className="demo-lock-banner">{t('demoLockActive')}</p>

      <nav className="tabbar" aria-label="Main sections">
        {tabIds.map((tabId) => (
          <button
            key={tabId}
            className={activeTab === tabId ? 'active' : ''}
            onClick={() => setActiveTab(tabId)}
            type="button"
          >
            {t(`tab${tabId.charAt(0).toUpperCase()}${tabId.slice(1)}`)}
          </button>
        ))}
      </nav>

      {activeTab === 'guess' && (
        <GuessView
          matches={orderedMatches}
          guesses={guesses}
          onSaveGuess={saveGuess}
          playerArtifact={playerArtifact}
          onPlayerArtifact={savePlayerArtifact}
          teams={teams}
          players={players}
          t={t}
          lang={lang}
          now={now}
          distributions={distributions}
          onSelectUser={setSelectedUserId}
        />
      )}
      {activeTab === 'schedule' && (
        <ScheduleView
          matches={orderedMatches}
          guesses={guesses}
          groupRankings={groupRankings}
          onGroupRankings={saveGroupRankings}
          bracketPicks={bracketPicks}
          onBracketPicks={saveBracketPicks}
          t={t}
          lang={lang}
          now={now}
        />
      )}
      {activeTab === 'leaderboard' && (
        <LeaderboardView
          guesses={guesses}
          matches={orderedMatches}
          rows={leaderboardRows}
          session={session}
          t={t}
          onSelectUser={setSelectedUserId}
        />
      )}
      {activeTab === 'personal' && (
        <PersonalView guesses={guesses} matches={orderedMatches} playerArtifact={playerArtifact} t={t} />
      )}

      {selectedUserId && (
        <UserProfilePanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          t={t}
          lang={lang}
          teamInfo={teamInfo}
        />
      )}
    </main>
  );
}

function GuessView({ matches, guesses, onSaveGuess, playerArtifact, onPlayerArtifact, teams, players, t, lang, now, distributions, onSelectUser }) {
  const groupMatches = matches.filter((match) => match.round === 'group');

  return (
    <section className="workspace guess-workspace">
      <PlayerPicksPanel value={playerArtifact} onChange={onPlayerArtifact} teams={teams} players={players} t={t} />
      <div className="two-column">
        <div className="match-list">
          {groupMatches.map((match) => (
            <MatchGuessRow
              match={match}
              guess={guesses[match.id]}
              onSaveGuess={onSaveGuess}
              key={match.id}
              t={t}
              lang={lang}
              now={now}
              distribution={distributions[match.id]}
              onSelectUser={onSelectUser}
            />
          ))}
        </div>
        <aside className="side-panel">
          <h2>{t('liveBoard')}</h2>
          <div className="stat-strip">
            <b>{groupMatches.length}</b>
            <span>{t('groupMatchesLoaded')}</span>
          </div>
          <div className="stat-strip">
            <b>{Object.keys(guesses).length}</b>
            <span>{t('savedPredictions')}</span>
          </div>
          <dl className="legend">
            <div><dt className="swatch dark" /> <dd>{t('legendLocked')}</dd></div>
            <div><dt className="swatch grey" /> <dd>{t('legendHidden')}</dd></div>
            <div><dt className="swatch orange" /> <dd>{t('legendOpen')}</dd></div>
            <div><dt className="swatch green" /> <dd>{t('legendGuessed')}</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

function MatchGuessRow({ match, guess, onSaveGuess, t, lang, now, distribution, onSelectUser }) {
  const state = getMatchState(match, guess, now);
  const locked = state === 'backlogged' || state === 'not_out';
  const selectedWinner = pickWinner(guess, match);
  const hasMinorityShare = guess?.minority_share !== undefined && guess?.minority_share !== null;
  const bonusActive = Boolean(guess?.minority_bonus_active || (hasMinorityShare && Number(guess.minority_share) <= 0.2));
  const deadline = getGuessDeadline(match);
  const countdown = formatLockCountdown(deadline, now);

  return (
    <article className={`match-row ${state}`}>
      <div className="match-status" aria-label={state} />
      <div className="match-meta">
        <b>{match.matchday}</b>
        <span>{formatKickoff(match.kickoff_time, lang)}</span>
        <span>{match.venue} · {match.city}</span>
        {countdown && (
          <span className="lock-countdown">{t('locksIn')}: {countdown}</span>
        )}
        {state === 'backlogged' && (
          <span className="lock-badge">{t('locked')}</span>
        )}
      </div>
      <div className="team-pair">
        <TeamName team={match.team_home} code={match.team_home_code} selected={selectedWinner === match.team_home} t={t} />
        <TeamName team={match.team_away} code={match.team_away_code} selected={selectedWinner === match.team_away} t={t} />
        <MatchPredictionBars
          match={match}
          distribution={distribution}
          t={t}
          onSelectUser={onSelectUser}
        />
      </div>
      <div className="score-controls">
        <input
          type="number"
          min="0"
          value={guess?.pred_home_score ?? 0}
          disabled={locked}
          aria-label={`${match.team_home || 'Home'} score`}
          onChange={(event) => onSaveGuess(match, { pred_home_score: Number(event.target.value) })}
        />
        <span>:</span>
        <input
          type="number"
          min="0"
          value={guess?.pred_away_score ?? 0}
          disabled={locked}
          aria-label={`${match.team_away || 'Away'} score`}
          onChange={(event) => onSaveGuess(match, { pred_away_score: Number(event.target.value) })}
        />
      </div>
      <select
        value={pickWinner(guess, match)}
        disabled={locked}
        aria-label={t('winner')}
        onChange={(event) => onSaveGuess(match, { pred_winner: event.target.value })}
      >
        <option value="">{t('winner')}</option>
        {match.team_home && <option value={match.team_home}>{match.team_home}</option>}
        {match.team_away && <option value={match.team_away}>{match.team_away}</option>}
      </select>
      {bonusActive && <span className="bonus-chip active">{t('underdogBonus')}</span>}
    </article>
  );
}

function TeamName({ team, selected = false, t }) {
  return (
    <span className={selected ? 'team-name selected' : 'team-name'}>
      <span className="flag">{teamFlag(team)}</span>
      <span>{team || t('tbd')}</span>
    </span>
  );
}

function PlayerPicksPanel({ value, onChange, teams, players, t }) {
  return (
    <section className="player-picks">
      <div className="player-picks-head">
        <div>
          <h2>{t('tournamentFutures')}</h2>
          <p>{t('tournamentFuturesDesc')}</p>
        </div>
        <div className="player-db-pill">
          <b>{players.length}</b>
          <span>{t('playersTracked')}</span>
        </div>
      </div>
      <div className="trophy-grid">
        {trophyFields.map((item) => (
          <div className={item.type === 'teams' ? 'trophy-card trophy-card-wide' : 'trophy-card'} key={item.field}>
            <span className="trophy-icon">{item.icon}</span>
            <span>{t(item.labelKey)}</span>
            {item.type === 'team' && (
              <select value={value[item.field] || ''} onChange={(event) => onChange(item.field, event.target.value)}>
                <option value="">{t('pickTeam')}</option>
                {teams.map((team) => (
                  <option value={team} key={team}>{teamFlag(team)} {team}</option>
                ))}
              </select>
            )}
            {item.type === 'teams' && (
              <TopFourPicker value={value[item.field] || []} teams={teams} onChange={(next) => onChange(item.field, next)} t={t} />
            )}
            {item.type === 'player' && (
              <PlayerSearchSelect
                players={players}
                value={value[item.field] || ''}
                onChange={(next) => onChange(item.field, next)}
                t={t}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TopFourPicker({ value, teams, onChange, t }) {
  function setSlot(index, team) {
    const next = [...value];
    next[index] = team;
    onChange(next.filter(Boolean).slice(0, 4));
  }

  return (
    <div className="top-four-grid">
      {[0, 1, 2, 3].map((index) => (
        <label key={index}>
          <span>#{index + 1}</span>
          <select value={value[index] || ''} onChange={(event) => setSlot(index, event.target.value)}>
            <option value="">{t('pickTeam')}</option>
            {teams
              .filter((team) => !value.includes(team) || value[index] === team)
              .map((team) => (
                <option value={team} key={team}>{teamFlag(team)} {team}</option>
              ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function PlayerSearchSelect({ players, value, onChange, t }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const scored = players
      .map((player) => ({ player, score: searchScore(player, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.player.international_goals - a.player.international_goals)
      .slice(0, 6);
    return scored.map((item) => item.player);
  }, [players, query]);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  return (
    <div className="player-search">
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder={t('typePlayer')}
        aria-label={t('typePlayer')}
      />
      {open && query && query !== value && (
        <div className="player-results">
          {matches.map((player) => (
            <button
              type="button"
              key={player.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={async () => {
                const next = playerLabel(player);
                const saved = await onChange(next);
                if (saved !== false) {
                  setQuery(next);
                  setOpen(false);
                }
              }}
            >
              <b>{player.name}</b>
              <span>{player.flag} {player.team} · {player.position} · {player.club}</span>
            </button>
          ))}
          {!matches.length && <span className="empty-result">{t('noPlayerMatch')}</span>}
        </div>
      )}
    </div>
  );
}

function ScheduleView({ matches, guesses, groupRankings, onGroupRankings, bracketPicks, onBracketPicks, t, lang, now }) {
  const [groupFilter, setGroupFilter] = useState('All');
  const [venueFilter, setVenueFilter] = useState('All');
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id || '');

  const venues = useMemo(() => ['All', ...new Set(matches.map((match) => match.venue))], [matches]);
  const visibleMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          (groupFilter === 'All' || match.group_label === groupFilter) &&
          (venueFilter === 'All' || match.venue === venueFilter),
      ),
    [groupFilter, matches, venueFilter],
  );
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || visibleMatches[0] || matches[0];
  const knockout = matches.filter((match) => match.round !== 'group');
  const groupsComplete = groups.every((group) => groupRankings[group.label]?.length === 4);
  const populatedKnockout = useMemo(
    () =>
      knockout.map((match) => ({
        ...match,
        display_home: getMatchSides(match, groupRankings, bracketPicks).home,
        display_away: getMatchSides(match, groupRankings, bracketPicks).away,
      })),
    [bracketPicks, groupRankings, knockout],
  );

  return (
    <section className="workspace schedule-grid">
      <div className="schedule-controls">
        <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} aria-label="Group filter">
          <option value="All">{t('allGroups')}</option>
          {groups.map((group) => (
            <option value={group.label} key={group.label}>{t('groupLabel', { label: group.label })}</option>
          ))}
        </select>
        <select value={venueFilter} onChange={(event) => setVenueFilter(event.target.value)} aria-label="Venue filter">
          {venues.map((venue) => (
            <option value={venue} key={venue}>{venue}</option>
          ))}
        </select>
      </div>

      <div className="interactive-schedule">
        {!groupsComplete ? (
          <GroupRankingBoard
            groupFilter={groupFilter}
            rankings={groupRankings}
            onRankings={onGroupRankings}
            onGroupFilter={setGroupFilter}
            t={t}
          />
        ) : (
          <KnockoutPredictor
            matches={knockout}
            groupRankings={groupRankings}
            picks={bracketPicks}
            onPicks={onBracketPicks}
            t={t}
            lang={lang}
          />
        )}

        <div className="fixture-rail">
          {visibleMatches.slice(0, 36).map((match) => (
            <button
              className={`fixture-card ${selectedMatch?.id === match.id ? 'active' : ''}`}
              type="button"
              key={match.id}
              onClick={() => setSelectedMatchId(match.id)}
            >
              <span>{roundLabel(match.round, t)}</span>
              <b>{teamFlag(match.team_home)} {match.team_home}</b>
              <b>{teamFlag(match.team_away)} {match.team_away}</b>
              <small>{formatKickoff(match.kickoff_time, lang)} · {match.city}</small>
            </button>
          ))}
        </div>

        {selectedMatch && (
          <div className="match-detail">
            <p className="eyebrow">{t('selectedMatch')}</p>
            <h2>{teamFlag(selectedMatch.team_home)} {selectedMatch.team_home} {t('vs')} {teamFlag(selectedMatch.team_away)} {selectedMatch.team_away}</h2>
            <div className="detail-grid">
              <span>{t('matchNumber', { n: selectedMatch.match_number })}</span>
              <span>{formatKickoff(selectedMatch.kickoff_time, lang)}</span>
              <span>{selectedMatch.venue}</span>
              <span>{selectedMatch.city}, {selectedMatch.host_country}</span>
              <span>{t('capacity', { n: selectedMatch.stadium_capacity?.toLocaleString() })}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bracket-lane">
        {['r32', 'r16', 'qf', 'sf', 'third', 'final'].map((round) => (
          <div className="bracket-round" key={round}>
            <h2>{roundLabel(round, t)}</h2>
            {populatedKnockout.filter((match) => match.round === round).map((match) => (
              <button
                className={`bracket-node ${getMatchState(match, guesses[match.id], now)}`}
                key={match.id}
                type="button"
              >
                <span>{teamFlag(match.display_home)} {match.display_home || match.bracket_pos}</span>
                <span>{teamFlag(match.display_away)} {match.display_away || t('tbd')}</span>
                <small>{formatKickoff(match.kickoff_time, lang)} · {match.city}</small>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupRankingBoard({ groupFilter, rankings, onRankings, onGroupFilter, t }) {
  const visibleGroups = groupFilter === 'All' ? groups : groups.filter((group) => group.label === groupFilter);

  function confirmGroup(groupLabel, ranking) {
    onRankings((current) => ({ ...current, [groupLabel]: ranking }));
  }

  return (
    <div className="ranking-board">
      {visibleGroups.map((group) => (
        <GroupRanker
          key={group.label}
          group={group}
          ranking={rankings[group.label] || group.teams}
          onConfirm={(ranking) => confirmGroup(group.label, ranking)}
          onFocus={() => onGroupFilter(group.label)}
          t={t}
        />
      ))}
    </div>
  );
}

function GroupRanker({ group, ranking, onConfirm, onFocus, t }) {
  const [draft, setDraft] = useState(ranking);
  const [draggedTeam, setDraggedTeam] = useState('');

  useEffect(() => {
    setDraft(ranking);
  }, [ranking]);

  function moveTeam(team, direction) {
    const index = draft.indexOf(team);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.length) return;
    const next = [...draft];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setDraft(next);
  }

  function dropOn(targetTeam) {
    if (!draggedTeam || draggedTeam === targetTeam) return;
    const next = draft.filter((team) => team !== draggedTeam);
    next.splice(next.indexOf(targetTeam), 0, draggedTeam);
    setDraft(next);
    setDraggedTeam('');
  }

  return (
    <section className="rank-card" onFocus={onFocus}>
      <div className="rank-card-head">
        <b>{t('groupLabel', { label: group.label })}</b>
        <button type="button" onClick={() => onConfirm(draft)}>{t('confirm')}</button>
      </div>
      <div className="rank-list">
        {draft.map((team, index) => (
          <div
            className="rank-row"
            key={team}
            draggable
            onDragStart={() => setDraggedTeam(team)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(team)}
          >
            <span className="rank-number">{index + 1}</span>
            <TeamName team={team} t={t} />
            <div className="rank-actions">
              <button type="button" onClick={() => moveTeam(team, -1)} aria-label={`Move ${team} up`}>↑</button>
              <button type="button" onClick={() => moveTeam(team, 1)} aria-label={`Move ${team} down`}>↓</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KnockoutPredictor({ matches, groupRankings, picks, onPicks, t, lang }) {
  const orderedMatches = useMemo(() => [...matches].sort((a, b) => a.match_number - b.match_number), [matches]);
  const nextMatch =
    orderedMatches.find((match) => {
      const sides = getMatchSides(match, groupRankings, picks);
      return sides.home && sides.away && !String(sides.home).includes('/') && !String(sides.away).includes('/') && !picks[match.match_number];
    }) || null;
  const finalPick = picks[104]?.winner;

  function chooseWinner(match, winner) {
    const sides = getMatchSides(match, groupRankings, picks);
    const loser = winner === sides.home ? sides.away : sides.home;
    onPicks((current) => ({
      ...current,
      [match.match_number]: {
        winner,
        loser,
        round: match.round,
      },
    }));
  }

  function resetBracket() {
    onPicks({});
  }

  function savePng() {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f6f7f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#172017';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText('World Cup 2026 Bracket Prediction', 64, 82);
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(`Champion: ${finalPick || 'TBD'}`, 64, 124);

    const roundsToDraw = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];
    const colWidth = 210;
    roundsToDraw.forEach((round, column) => {
      const roundMatches = orderedMatches.filter((match) => match.round === round);
      ctx.fillStyle = '#1f6f50';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(rounds[round].label, 64 + column * colWidth, 180);
      roundMatches.forEach((match, index) => {
        const sides = getMatchSides(match, groupRankings, picks);
        const pick = picks[match.match_number]?.winner || '';
        const x = 64 + column * colWidth;
        const y = 220 + index * 78;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#d6dccf';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, 188, 58);
        ctx.strokeRect(x, y, 188, 58);
        ctx.fillStyle = '#172017';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText(`M${match.match_number}`, x + 10, y + 18);
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(String(sides.home || match.team_home || 'TBD').slice(0, 22), x + 10, y + 36);
        ctx.fillText(String(sides.away || match.team_away || 'TBD').slice(0, 22), x + 10, y + 52);
        if (pick) {
          ctx.fillStyle = '#cf7d30';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.fillText(`→ ${pick}`.slice(0, 24), x + 86, y + 18);
        }
      });
    });

    const link = document.createElement('a');
    link.download = 'world-cup-2026-prediction.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <section className="knockout-predictor">
      <div className="knockout-head">
        <div>
          <b>{t('bracketBuilder')}</b>
          <span>{t('knockoutPicksMade', { n: Object.keys(picks).length })}</span>
        </div>
        <button type="button" onClick={resetBracket}>{t('reset')}</button>
      </div>

      {nextMatch ? (
        <div className="next-match-picker">
          <span>{roundLabel(nextMatch.round, t)} · {t('matchNumber', { n: nextMatch.match_number })}</span>
          <h2>{t('chooseWinner')}</h2>
          <div className="winner-buttons">
            {[getMatchSides(nextMatch, groupRankings, picks).home, getMatchSides(nextMatch, groupRankings, picks).away].map((team) => (
              <button type="button" key={team} onClick={() => chooseWinner(nextMatch, team)}>
                <span>{teamFlag(team)}</span>
                <b>{team}</b>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="next-match-picker complete">
          <span>{t('bracketComplete')}</span>
          <h2>{finalPick ? `${teamFlag(finalPick)} ${finalPick}` : t('championTbd')}</h2>
          <button type="button" className="save-png-button" onClick={savePng}>{t('savePng')}</button>
        </div>
      )}

      <div className="mini-pick-list">
        {orderedMatches.map((match) => {
          const sides = getMatchSides(match, groupRankings, picks);
          return (
            <div className={picks[match.match_number] ? 'mini-pick picked' : 'mini-pick'} key={match.match_number}>
              <span>M{match.match_number}</span>
              <b>{picks[match.match_number]?.winner || t('waiting')}</b>
              <small>{sides.home || match.team_home} {t('vs')} {sides.away || match.team_away}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LeaderboardView({ guesses, matches, rows, session, t, onSelectUser }) {
  const score = Object.values(guesses).reduce((total, guess) => {
    const match = matches.find((item) => item.id === guess.match_id);
    return total + (guess.points_earned ?? (match ? Math.floor(rounds[match.round].outcome / 2) : 0));
  }, 0);
  const leaderboardRows = rows.length
    ? rows.map((row) => ({
        id: row.user_id,
        name: row.email || row.display_name || t('player'),
        points: row.total_points || 0,
        guessed: Number(row.guess_count || 0),
        isCurrentUser: session?.user?.id === row.user_id,
      }))
    : [{ id: 'local', name: t('localDraft'), points: score, guessed: Object.keys(guesses).length, isCurrentUser: true }];

  return (
    <section className="workspace leaderboard-layout">
      <div>
        <p className="leaderboard-hint">{t('leaderboardClickHint')}</p>
        <table className="leaderboard">
          <thead>
            <tr><th>{t('rank')}</th><th>{t('player')}</th><th>{t('guesses')}</th><th>{t('points')}</th></tr>
          </thead>
          <tbody>
            {leaderboardRows.map((row, index) => (
              <tr
                className={`${row.isCurrentUser ? 'current-user-row ' : ''}leaderboard-row-clickable`}
                key={row.id}
                onClick={() => row.id !== 'local' && onSelectUser?.(row.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && row.id !== 'local') onSelectUser?.(row.id);
                }}
                tabIndex={row.id === 'local' ? -1 : 0}
                role={row.id === 'local' ? undefined : 'button'}
              >
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td>{row.guessed}</td>
                <td>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="empty-note">{t('noLeaderboardRows')}</p>}
      </div>
      <aside className="scoring-panel">
        <h2>{t('scoringRules')}</h2>
        <table>
          <thead><tr><th>{t('round')}</th><th>{t('outcome')}</th><th>{t('exact')}</th></tr></thead>
          <tbody>
            <tr><td>{t('roundGroup')}</td><td>3</td><td>+2</td></tr>
            <tr><td>{t('roundR32')}</td><td>5</td><td>+3</td></tr>
            <tr><td>{t('roundR16')}</td><td>8</td><td>+4</td></tr>
            <tr><td>{t('roundQf')}</td><td>13</td><td>+5</td></tr>
            <tr><td>{t('roundSf')}</td><td>21</td><td>+8</td></tr>
            <tr><td>{t('roundFinal')}</td><td>34</td><td>+13</td></tr>
          </tbody>
        </table>
        <p>{t('scoringKnockout')}</p>
        <p>{t('scoringMinority')}</p>
        <p>{t('scoringTournament')}</p>
      </aside>
    </section>
  );
}

function PersonalView({ guesses, matches, playerArtifact, t }) {
  return (
    <section className="workspace personal-grid">
      <div>
        <h2>{t('matchGuesses')}</h2>
        <div className="history-list">
          {Object.values(guesses).map((guess) => {
            const match = matches.find((item) => item.id === guess.match_id);
            if (!match) return null;
            return (
              <article className="history-row" key={guess.match_id}>
                <span>{teamFlag(match.team_home)} {match.team_home} {t('vs')} {teamFlag(match.team_away)} {match.team_away}</span>
                <b>{guess.pred_home_score} : {guess.pred_away_score}</b>
                <span>{pickWinner(guess, match) || t('noWinner')}</span>
              </article>
            );
          })}
        </div>
      </div>
      <div>
        <h2>{t('tournamentPicks')}</h2>
        <pre className="artifact-dump">{JSON.stringify(playerArtifact, null, 2)}</pre>
      </div>
    </section>
  );
}
