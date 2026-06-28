-- 010: Round of 32 confirmed teams + FLAT scoring (supersedes 003/005/009 grading).
--
-- Runs after 009, so this is the authoritative final scoring logic.
-- Group-stage matches and their guesses are KEPT (hidden in the UI) so the
-- re-grade below recomputes everyone's points from real results.
--
-- Scoring is now FLAT for every match, every round:
--   correct result (win / draw / loss outcome) = 3 points
--   exact score (both numbers right)            = +2 points
-- No minority / upset multiplier. Max 5 points per match.

-- 1) Fill the 16 Round of 32 placeholders with the confirmed matchups.
--    Bracket linkage (W73 -> R16, etc.) is preserved; only teams/kickoffs change.
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = v.team_home_code,
  team_away_code = v.team_away_code,
  sides_confirmed = true,
  kickoff_time = v.kickoff_time::timestamptz,
  guess_deadline = v.kickoff_time::timestamptz,
  local_time = v.local_time
from (values
  ('m-73', 'South Africa', 'Canada', 'ZA', 'CA', '2026-06-28T19:00:00.000Z', '12:00 UTC-7'),
  ('m-74', 'Brazil', 'Japan', 'BR', 'JP', '2026-06-29T17:00:00.000Z', '10:00 UTC-7'),
  ('m-75', 'Germany', 'Paraguay', 'DE', 'PY', '2026-06-29T20:30:00.000Z', '13:30 UTC-7'),
  ('m-76', 'Netherlands', 'Morocco', 'NL', 'MA', '2026-06-30T01:00:00.000Z', '18:00 UTC-7'),
  ('m-77', 'Cote d''Ivoire', 'Norway', 'CI', 'NO', '2026-06-30T17:00:00.000Z', '10:00 UTC-7'),
  ('m-78', 'France', 'Sweden', 'FR', 'SE', '2026-06-30T21:00:00.000Z', '14:00 UTC-7'),
  ('m-79', 'Mexico', 'Ecuador', 'MX', 'EC', '2026-07-01T01:00:00.000Z', '18:00 UTC-7'),
  ('m-80', 'England', 'DR Congo', 'GB-ENG', 'CD', '2026-07-01T16:00:00.000Z', '09:00 UTC-7'),
  ('m-81', 'Belgium', 'Senegal', 'BE', 'SN', '2026-07-01T20:00:00.000Z', '13:00 UTC-7'),
  ('m-82', 'United States', 'Bosnia and Herzegovina', 'US', 'BA', '2026-07-02T00:00:00.000Z', '17:00 UTC-7'),
  ('m-83', 'Spain', 'Austria', 'ES', 'AT', '2026-07-02T19:00:00.000Z', '12:00 UTC-7'),
  ('m-84', 'Portugal', 'Croatia', 'PT', 'HR', '2026-07-02T23:00:00.000Z', '16:00 UTC-7'),
  ('m-85', 'Switzerland', 'Algeria', 'CH', 'DZ', '2026-07-03T03:00:00.000Z', '20:00 UTC-7'),
  ('m-86', 'Australia', 'Egypt', 'AU', 'EG', '2026-07-03T18:00:00.000Z', '11:00 UTC-7'),
  ('m-87', 'Argentina', 'Cape Verde', 'AR', 'CV', '2026-07-03T22:00:00.000Z', '15:00 UTC-7'),
  ('m-88', 'Colombia', 'Ghana', 'CO', 'GH', '2026-07-04T01:30:00.000Z', '18:30 UTC-7')
) as v(id, team_home, team_away, team_home_code, team_away_code, kickoff_time, local_time)
where m.id = v.id;

-- 2) Flat point helpers (kept consistent in case anything else calls them).
create or replace function public.round_outcome_points(p_round text)
returns integer language sql immutable as $$ select 3; $$;

create or replace function public.round_exact_points(p_round text)
returns integer language sql immutable as $$ select 2; $$;

-- 3) Authoritative grading: outcome compared by score sign (correctly handles
--    draws: sign 0 = sign 0), flat 3 / +2, NO minority multiplier.
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
        then 3 else 0 end)
      + (case
        when g.pred_home_score = m.actual_home_score
         and g.pred_away_score = m.actual_away_score
        then 2 else 0 end),
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

-- 4) Clear any previously-applied upset bonus flag and re-grade everything now.
update public.guesses set minority_bonus_applied = false;
select public.grade_all_predictions();
