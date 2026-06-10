import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { formatKickoff } from '../i18n.js';

function teamFlag(team, teamInfo) {
  return teamInfo[team]?.flag || '◇';
}

export default function UserProfilePanel({ userId, onClose, t, lang, teamInfo }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase.rpc('get_user_prediction_profile', { p_user_id: userId }).then(({ data }) => {
      setProfile(data);
      setLoading(false);
    });
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="user-profile-overlay" onClick={onClose} role="presentation">
      <div className="user-profile-panel" onClick={(e) => e.stopPropagation()}>
        <div className="user-profile-head">
          <div>
            <p className="eyebrow">{t('playerProfile')}</p>
            <h2>{profile?.display_name ?? t('loading')}</h2>
          </div>
          <button type="button" className="profile-close" onClick={onClose}>×</button>
        </div>

        {loading && <p>{t('loading')}</p>}

        {!loading && profile && (
          <>
            <div className="profile-stats">
              <span><b>{profile.total_points ?? 0}</b> {t('points')}</span>
              <span><b>{profile.match_guesses?.length ?? 0}</b> {t('guesses')}</span>
            </div>

            <h3>{t('matchGuesses')}</h3>
            <div className="profile-guess-list">
              {(profile.match_guesses ?? []).map((guess) => (
                <article className="profile-guess-row" key={guess.match_id}>
                  <span>
                    {teamFlag(guess.team_home, teamInfo)} {guess.team_home} {t('vs')}{' '}
                    {teamFlag(guess.team_away, teamInfo)} {guess.team_away}
                  </span>
                  <span>{formatKickoff(guess.kickoff_time, lang)}</span>
                  <b>{guess.pred_home_score} : {guess.pred_away_score}</b>
                  <span>{guess.predicted_winner || t('draw')}</span>
                  {guess.points_earned != null && (
                    <span className="points-earned">+{guess.points_earned} {t('pts')}</span>
                  )}
                  {guess.actual_home_score != null && (
                    <small>
                      {t('actual')}: {guess.actual_home_score}:{guess.actual_away_score} ({guess.actual_winner || t('draw')})
                    </small>
                  )}
                </article>
              ))}
              {!profile.match_guesses?.length && <p className="empty-note">{t('noPicksYet')}</p>}
            </div>

            {profile.tournament_picks && Object.keys(profile.tournament_picks).length > 0 && (
              <>
                <h3>{t('tournamentPicks')}</h3>
                <pre className="artifact-dump profile-artifact">
                  {JSON.stringify(profile.tournament_picks, null, 2)}
                </pre>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
