// refresh-results: re-grade only.
//
// Previously this function fetched the openfootball 2026 feed and wrote scores
// onto matches by fuzzy venue/date matching. Because our bracket is a
// simulation whose knockout linkage does not line up with the real 2026
// bracket, that venue matching mapped the WRONG real match onto our rows and
// clobbered hand-entered scores (e.g. it wrote 1-1 onto the Argentina–
// Switzerland QF). So it is removed entirely.
//
// The official scores are now entered by hand on each match. This function
// only recomputes points from those stored scores via grade_all_predictions(),
// which skips any match without a scoreline. It never fetches external data and
// never overwrites a result, so it cannot corrupt the pipeline.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

  try {
    const { data: gradeResult, error: gradeError } = await supabase.rpc('grade_all_predictions');
    if (gradeError) throw gradeError;

    const graded = gradeResult?.graded ?? 0;

    await supabase.from('sync_runs').insert({
      id: runId,
      finished_at: new Date().toISOString(),
      matches_updated: 0,
      guesses_graded: graded,
      unmatched_count: 0,
    });

    return new Response(
      JSON.stringify({ ok: true, matches_updated: 0, guesses_graded: graded }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('sync_runs').insert({
      id: runId,
      finished_at: new Date().toISOString(),
      matches_updated: 0,
      unmatched_count: 0,
      error: message,
    });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
