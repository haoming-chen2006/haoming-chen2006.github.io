import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

// This button ONLY re-grades every prediction against the official scores that
// are already stored on each match. It never fetches or overwrites results, so
// pressing it can't corrupt the pipeline. Matches without an entered score are
// left ungraded (grade_all_predictions skips null scorelines).
export default function RefreshResultsButton({ t, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function handleRefresh() {
    setLoading(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.rpc('grade_all_predictions');
      if (error) throw error;
      const result = { ok: true, guesses_graded: data?.graded ?? 0 };
      setLastResult(result);
      onComplete?.(result);
    } catch (err) {
      setLastResult({ ok: false, error: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="refresh-results-wrap">
      <button
        type="button"
        className="refresh-results-btn"
        onClick={handleRefresh}
        disabled={loading}
      >
        {loading ? t('refreshing') : t('refreshResults')}
      </button>
      {lastResult?.ok && (
        <span className="refresh-results-summary">
          {t('refreshSummary', { graded: lastResult.guesses_graded ?? 0 })}
        </span>
      )}
      {lastResult && !lastResult.ok && (
        <span className="refresh-results-error">{lastResult.error}</span>
      )}
    </div>
  );
}
