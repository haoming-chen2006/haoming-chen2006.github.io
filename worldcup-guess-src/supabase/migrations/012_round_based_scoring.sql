-- 012: Restore ROUND-BASED scoring (supersedes the flat 3/+2 from 010).
--
-- Points now depend on the match round, matching the frontend `rounds` table:
--   round    outcome  exact(+)
--   group        3       2
--   r32          5       3
--   r16          8       4
--   qf          13       5
--   sf          21       8
--   third       13       5
--   final       34      13
--
-- "outcome" is awarded for the correct result (win / draw / loss), compared by
-- score sign so draws (sign 0 = sign 0) grade correctly. "exact" is an extra
-- bonus when both scorelines match. No minority / upset multiplier.

-- 1) Round-aware point helpers.
create or replace function public.round_outcome_points(p_round text)
returns integer language sql immutable as $$
  select case p_round
    when 'group' then 3
    when 'r32'   then 5
    when 'r16'   then 8
    when 'qf'    then 13
    when 'sf'    then 21
    when 'third' then 13
    when 'final' then 34
    else 3
  end;
$$;

create or replace function public.round_exact_points(p_round text)
returns integer language sql immutable as $$
  select case p_round
    when 'group' then 2
    when 'r32'   then 3
    when 'r16'   then 4
    when 'qf'    then 5
    when 'sf'    then 8
    when 'third' then 5
    when 'final' then 13
    else 2
  end;
$$;

-- 2) Authoritative grading: outcome by score sign (draw-safe), points pulled
--    from the round helpers above, NO minority multiplier.
create or replace function public.grade_all_predictions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_graded integer := 0;
begin
  update public.guesses g
  set
    points_earned =
      (case
        when sign(g.pred_home_score - g.pred_away_score)
           = sign(m.actual_home_score - m.actual_away_score)
        then public.round_outcome_points(m.round) else 0 end)
      + (case
        when g.pred_home_score = m.actual_home_score
         and g.pred_away_score = m.actual_away_score
        then public.round_exact_points(m.round) else 0 end),
    outcome_correct =
      sign(g.pred_home_score - g.pred_away_score)
        = sign(m.actual_home_score - m.actual_away_score),
    exact_correct =
      (g.pred_home_score = m.actual_home_score
       and g.pred_away_score = m.actual_away_score),
    minority_bonus_applied = false,
    graded_at = now()
  from public.matches m
  where m.id = g.match_id
    and m.actual_home_score is not null
    and m.actual_away_score is not null;

  get diagnostics v_graded = row_count;

  -- Recompute every profile's total from graded guesses.
  update public.profiles p
  set total_points = coalesce(totals.pts, 0)
  from (
    select user_id, sum(coalesce(points_earned, 0))::integer as pts
    from public.guesses
    group by user_id
  ) totals
  where p.user_id = totals.user_id;

  update public.profiles p
  set total_points = 0
  where not exists (
    select 1 from public.guesses g
    where g.user_id = p.user_id and g.points_earned is not null
  );

  return jsonb_build_object('graded', v_graded);
end;
$$;

-- 3) Re-grade everything with the new round-based points.
select public.grade_all_predictions();
