import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  findDbMatch,
  makeOpenfootballKey,
  OPENFOOTBALL_URL,
  type DbMatch,
  type OpenfootballMatch,
  resolveActualResult,
} from '../_shared/openfootball.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  let matchesUpdated = 0;
  let unmatchedCount = 0;

  try {
    const response = await fetch(OPENFOOTBALL_URL);
    if (!response.ok) {
      throw new Error(`openfootball fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const entries: OpenfootballMatch[] = payload.matches ?? [];

    const { data: dbMatches, error: loadError } = await supabase
      .from('matches')
      .select('id, match_number, team_home, team_away, openfootball_key, city, venue');

    if (loadError) throw loadError;

    const matchList = (dbMatches ?? []) as DbMatch[];

    for (const entry of entries) {
      if (!entry.score?.ft) continue;

      const key = makeOpenfootballKey(entry);
      const dbMatch = findDbMatch(entry, matchList);

      if (!dbMatch || !dbMatch.team_home || !dbMatch.team_away) {
        unmatchedCount += 1;
        await supabase.from('sync_unmatched').upsert(
          {
            openfootball_key: key,
            payload: entry,
            reason: dbMatch ? 'missing_teams' : 'no_match',
          },
          { onConflict: 'openfootball_key' },
        );
        continue;
      }

      const result = resolveActualResult(entry, dbMatch.team_home, dbMatch.team_away);
      if (!result) continue;

      const { error: updateError } = await supabase
        .from('matches')
        .update({
          actual_home_score: result.homeScore,
          actual_away_score: result.awayScore,
          actual_winner: result.winner,
          openfootball_key: key,
        })
        .eq('id', dbMatch.id);

      if (updateError) {
        console.error('match update failed', dbMatch.id, updateError);
        continue;
      }

      dbMatch.openfootball_key = key;
      matchesUpdated += 1;
    }

    const { data: gradeResult, error: gradeError } = await supabase.rpc('grade_all_predictions');
    if (gradeError) throw gradeError;

    const graded = gradeResult?.graded ?? 0;

    await supabase.from('sync_runs').insert({
      id: runId,
      finished_at: new Date().toISOString(),
      matches_updated: matchesUpdated,
      guesses_graded: graded,
      unmatched_count: unmatchedCount,
    });

    const { data: unmatchedRows } = await supabase
      .from('sync_unmatched')
      .select('openfootball_key, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        ok: true,
        matches_updated: matchesUpdated,
        guesses_graded: graded,
        unmatched_count: unmatchedCount,
        recent_unmatched: unmatchedRows ?? [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
          ? JSON.stringify(err)
          : String(err);
    await supabase.from('sync_runs').insert({
      id: runId,
      finished_at: new Date().toISOString(),
      matches_updated: matchesUpdated,
      unmatched_count: unmatchedCount,
      error: message,
    });

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
