-- 017: Semifinal results + open the Final and Third-place match.
--
-- Scores are entered by hand now (openfootball had the QF/SF ties wrong — it
-- recorded 1-1 draws with no ET/penalty resolution). These are the real
-- results:
--   SF1 m-101 France 0-2 Spain      -> Spain to the final
--   SF2 m-102 England 1-2 Argentina -> Argentina to the final
-- Final:      Argentina vs Spain    (open for guessing)
-- 3rd place:  England  vs France    (open for guessing)

-- 1) Semifinal results (m-101 already set in a prior write; re-asserted here).
update public.matches as m set
  team_home = v.team_home, team_away = v.team_away,
  team_home_code = v.hc, team_away_code = v.ac,
  sides_confirmed = true,
  actual_home_score = v.hs, actual_away_score = v.as_, actual_winner = v.winner
from (values
  ('m-101', 'France',  'Spain',     'FR',     'ES', 0, 2, 'Spain'),
  ('m-102', 'England', 'Argentina', 'GB-ENG', 'AR', 1, 2, 'Argentina')
) as v(id, team_home, team_away, hc, ac, hs, as_, winner)
where m.id = v.id;

-- 2) Open the Final and the Third-place match for guessing.
update public.matches as m set
  team_home = v.team_home, team_away = v.team_away,
  team_home_code = v.hc, team_away_code = v.ac,
  sides_confirmed = true,
  guess_deadline = m.kickoff_time,
  actual_home_score = null, actual_away_score = null, actual_winner = null
from (values
  ('m-103', 'England',   'France', 'GB-ENG', 'FR'),  -- third place
  ('m-104', 'Argentina', 'Spain',  'AR',     'ES')   -- final
) as v(id, team_home, team_away, hc, ac)
where m.id = v.id;

-- 3) Re-grade (SF now scored; final/third open).
select public.grade_all_predictions();
