-- Fix draw grading.
--
-- Previously a drawn match was stored with actual_winner = team_home (a bogus
-- fallback), and grade_all_predictions only graded matches where actual_winner
-- was not null and rewarded outcome points only when the prediction equalled
-- actual_winner. That meant: home-pickers were wrongly credited on a draw, and
-- correct draw predictions (predicted_winner is null) earned nothing.
--
-- A genuine draw now stores actual_winner = null (see edge function), so:
--   * grade matches by recorded scores, not by actual_winner;
--   * an outcome is correct when the prediction matches the actual outcome,
--     treating null (draw) = null (draw) as a match via `is not distinct from`;
--   * the minority bonus applies to draw picks too.

create or replace function public.grade_all_predictions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_graded integer := 0;
  v_match record;
  v_guess record;
  v_predicted text;
  v_points integer;
  v_outcome integer;
  v_exact integer;
  v_total_guesses integer;
  v_pick_count integer;
  v_share numeric;
begin
  for v_match in
    select * from public.matches
    where actual_home_score is not null
      and actual_away_score is not null
  loop
    select count(*) into v_total_guesses
    from public.guesses g
    where g.match_id = v_match.id;

    for v_guess in
      select * from public.guesses g where g.match_id = v_match.id
    loop
      v_predicted := public.guess_predicted_winner(
        v_guess.pred_home_score,
        v_guess.pred_away_score,
        v_guess.pred_winner,
        v_match.team_home,
        v_match.team_away
      );

      v_points := 0;
      v_outcome := public.round_outcome_points(v_match.round);
      v_exact := public.round_exact_points(v_match.round);

      -- Correct outcome: prediction matches actual, where null = draw on both sides.
      if v_predicted is not distinct from v_match.actual_winner then
        v_points := v_points + v_outcome;
      end if;

      if v_guess.pred_home_score = v_match.actual_home_score
         and v_guess.pred_away_score = v_match.actual_away_score then
        v_points := v_points + v_exact;
      end if;

      -- Minority bonus: correct pick (incl. draw) held by <= 20% of guessers → 1.5×.
      if v_points > 0 and v_total_guesses > 0 then
        select count(*) into v_pick_count
        from public.guesses g2
        where g2.match_id = v_match.id
          and public.guess_predicted_winner(
                g2.pred_home_score, g2.pred_away_score, g2.pred_winner,
                v_match.team_home, v_match.team_away
              ) is not distinct from v_predicted;

        v_share := v_pick_count::numeric / v_total_guesses::numeric;
        if v_share <= 0.2 then
          v_points := floor(v_points * 1.5);
          update public.guesses
          set minority_bonus_applied = true
          where id = v_guess.id;
        else
          update public.guesses
          set minority_bonus_applied = false
          where id = v_guess.id;
        end if;
      end if;

      update public.guesses
      set
        points_earned = v_points,
        outcome_correct = (v_predicted is not distinct from v_match.actual_winner),
        exact_correct = (
          v_guess.pred_home_score = v_match.actual_home_score
          and v_guess.pred_away_score = v_match.actual_away_score
        ),
        graded_at = now()
      where id = v_guess.id;

      v_graded := v_graded + 1;
    end loop;
  end loop;

  -- Recompute profile totals from graded guesses.
  update public.profiles p
  set total_points = coalesce(totals.pts, 0)
  from (
    select g.user_id, sum(coalesce(g.points_earned, 0))::integer as pts
    from public.guesses g
    group by g.user_id
  ) totals
  where p.user_id = totals.user_id;

  update public.profiles p
  set total_points = 0
  where not exists (
    select 1 from public.guesses g where g.user_id = p.user_id and g.points_earned is not null
  );

  return jsonb_build_object('graded', v_graded);
end;
$$;

-- Repair group-stage draws recorded under the old fallback. A level scoreline
-- in the group stage is always a draw (no penalties), so actual_winner must be
-- null. Knockout level scorelines go to penalties and keep their real winner;
-- those are corrected by re-running the (fixed) refresh-results sync from source.
update public.matches
set actual_winner = null
where round = 'group'
  and actual_home_score is not null
  and actual_home_score = actual_away_score
  and actual_winner is not null;
