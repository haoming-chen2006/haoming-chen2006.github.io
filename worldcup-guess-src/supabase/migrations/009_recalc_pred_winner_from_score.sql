-- The predicted winner is now always derived from the predicted score (equal
-- score = draw, stored as ''). Older guesses kept a separate pred_winner that
-- could go stale — e.g. a 1:1 prediction still flagged as a home win. Recompute
-- pred_winner from the score for every guess whose score is not 0:0.
--
-- reject_late_guess blocks pred_winner changes on already-locked matches, so the
-- trigger is disabled for this one-time backfill, then results are re-graded.

alter table public.guesses disable trigger guesses_reject_late_guess;

update public.guesses g
set pred_winner = case
      when g.pred_home_score > g.pred_away_score then m.team_home
      when g.pred_away_score > g.pred_home_score then m.team_away
      else ''  -- any level score (1:1, 2:2, …) is a draw
    end,
    updated_at = now()
from public.matches m
where m.id = g.match_id
  and not (g.pred_home_score = 0 and g.pred_away_score = 0);

alter table public.guesses enable trigger guesses_reject_late_guess;

-- Re-grade so points and the leaderboard reflect the corrected draw predictions.
select public.grade_all_predictions();
