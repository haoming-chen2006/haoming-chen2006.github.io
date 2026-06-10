import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient.js';

export function useGuessDistributions() {
  const [distributions, setDistributions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_guess_distributions');
      if (!error && data) {
        setDistributions(Object.fromEntries(data.map((row) => [row.match_id, row])));
      }
      setLoading(false);
    }
    load();
  }, []);

  return { distributions, loading, reload: async () => {
    const { data } = await supabase.rpc('get_guess_distributions');
    if (data) setDistributions(Object.fromEntries(data.map((row) => [row.match_id, row])));
  } };
}

export default function MatchPredictionBars({ match, distribution, t, onSelectUser }) {
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const homeCount = Number(distribution?.home_count ?? 0);
  const awayCount = Number(distribution?.away_count ?? 0);
  const total = homeCount + awayCount;
  const homePct = total ? Math.round((homeCount / total) * 100) : 50;
  const awayPct = total ? 100 - homePct : 50;

  async function openDetail(side) {
    setOpen(side);
    setDetail(null);
    setLoadingDetail(true);
    const { data } = await supabase.rpc('get_match_guess_detail', { p_match_id: match.id });
    setDetail(data);
    setLoadingDetail(false);
  }

  if (!match.team_home || !match.team_away) return null;

  return (
    <div className="prediction-bars">
      <button type="button" className="pred-bar-row" onClick={() => openDetail('home')}>
        <span className="pred-bar-label">{match.team_home}</span>
        <span className="pred-bar-track">
          <span className="pred-bar-fill home" style={{ width: `${homePct}%` }} />
        </span>
        <span className="pred-bar-count">{homeCount}</span>
      </button>
      <button type="button" className="pred-bar-row" onClick={() => openDetail('away')}>
        <span className="pred-bar-label">{match.team_away}</span>
        <span className="pred-bar-track">
          <span className="pred-bar-fill away" style={{ width: `${awayPct}%` }} />
        </span>
        <span className="pred-bar-count">{awayCount}</span>
      </button>

      {open && createPortal(
        <div className="pred-detail-overlay" onClick={() => setOpen(false)} role="presentation">
          <div className="pred-detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pred-detail-head">
              <b>{t('whoPredicted')}</b>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="pred-detail-body">
              {loadingDetail && <p>{t('loading')}</p>}
              {!loadingDetail && detail && (
                <div className="pred-detail-columns">
                  <PickColumn
                    title={open === 'home' ? detail.home_team : detail.away_team}
                    picks={open === 'home' ? detail.home_picks : detail.away_picks}
                    t={t}
                    onSelectUser={onSelectUser}
                  />
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function PickColumn({ title, picks, t, onSelectUser }) {
  const list = picks ?? [];
  return (
    <div className="pred-pick-column">
      <h3>{title}</h3>
      {list.length === 0 && <p className="empty-note">{t('noPicksYet')}</p>}
      <ul>
        {list.map((pick) => (
          <li key={pick.user_id}>
            <button
              type="button"
              className="pred-pick-user"
              onClick={() => onSelectUser?.(pick.user_id)}
            >
              <b>{pick.display_name}</b>
              <span>{pick.pred_home_score} : {pick.pred_away_score}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
