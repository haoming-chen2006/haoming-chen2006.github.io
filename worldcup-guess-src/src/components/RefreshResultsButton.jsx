import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function RefreshResultsButton({ t, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function handleRefresh() {
    setLoading(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-results');
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || t('refreshFailed'));
      setLastResult(data);
      onComplete?.(data);
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
          {t('refreshSummary', {
            matches: lastResult.matches_updated ?? 0,
            graded: lastResult.guesses_graded ?? 0,
          })}
        </span>
      )}
      {lastResult && !lastResult.ok && (
        <span className="refresh-results-error">{lastResult.error}</span>
      )}
    </div>
  );
}
