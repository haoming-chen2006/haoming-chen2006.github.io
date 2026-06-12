-- Fix: grade_all_predictions() updates guess rows (points_earned, graded_at,
-- minority_bonus_applied) for matches that have already finished. The
-- reject_late_guess trigger blocked ANY update to a guess once its match had
-- locked, so the grader's own bookkeeping write raised "This match has already
-- locked." and the whole sync/grade failed (edge function 500, leaderboard
-- never updated).
--
-- The lock should only reject changes to the player's actual prediction
-- (pred_home_score / pred_away_score / pred_winner). Bookkeeping-only updates
-- that leave the prediction untouched are allowed through, even after lock.

create or replace function public.reject_late_guess()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deadline timestamptz;
  match_confirmed boolean;
begin
  -- Allow grading / bookkeeping updates: if the prediction itself is unchanged,
  -- this is not a player edit, so the deadline does not apply.
  if tg_op = 'UPDATE'
     and new.pred_home_score is not distinct from old.pred_home_score
     and new.pred_away_score is not distinct from old.pred_away_score
     and new.pred_winner is not distinct from old.pred_winner then
    return new;
  end if;

  select public.match_guess_deadline(m), m.sides_confirmed
    into deadline, match_confirmed
    from public.matches m
    where m.id = new.match_id;

  if deadline <= now() then
    raise exception 'This match has already locked.';
  end if;

  if match_confirmed is not true then
    raise exception 'This match is not available for guesses yet.';
  end if;

  new.updated_at = now();
  return new;
end;
$$;
