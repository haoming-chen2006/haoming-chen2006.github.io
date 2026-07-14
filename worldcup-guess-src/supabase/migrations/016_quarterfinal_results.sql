-- 016: Correct/confirm Round of 16 scores, record Quarterfinal results,
--      open the Semifinals, and re-grade.
--
-- R16 scorelines are re-asserted (identical to 015) in case 015 never fully
-- applied or a results sync overwrote them. QF results (Jul 9–11) are added.
-- The four QF winners — France, Spain, England, Argentina — set the SF ties:
--   SF1 (m-101) France vs Spain   SF2 (m-102) England vs Argentina
-- No QF went to penalties (m-99, m-100 were decided in extra time).

-- 1) Re-assert the eight Round of 16 results (authoritative).
--    m-96 was a 0-0 draw decided on penalties (Switzerland won the shootout),
--    so the level score is kept with an explicit shootout winner.
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = v.hc,
  team_away_code = v.ac,
  sides_confirmed = true,
  actual_home_score = v.hs,
  actual_away_score = v.as_,
  actual_winner = v.winner
from (values
  ('m-89', 'Paraguay',      'France',   'PY', 'FR',     0, 1, 'France'),
  ('m-90', 'Canada',        'Morocco',  'CA', 'MA',     0, 3, 'Morocco'),
  ('m-91', 'Brazil',        'Norway',   'BR', 'NO',     1, 2, 'Norway'),
  ('m-92', 'Mexico',        'England',  'MX', 'GB-ENG', 2, 3, 'England'),
  ('m-93', 'Portugal',      'Spain',    'PT', 'ES',     0, 1, 'Spain'),
  ('m-94', 'United States', 'Belgium',  'US', 'BE',     1, 4, 'Belgium'),
  ('m-95', 'Argentina',     'Egypt',    'AR', 'EG',     3, 2, 'Argentina'),
  ('m-96', 'Switzerland',   'Colombia', 'CH', 'CO',     0, 0, 'Switzerland')
) as v(id, team_home, team_away, hc, ac, hs, as_, winner)
where m.id = v.id;

-- 2) Record the four Quarterfinal results (confirm teams + scores).
--    m-99 and m-100 went to extra time; the recorded score is the final
--    (post-ET) score, so grading by score sign credits the right side.
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = v.hc,
  team_away_code = v.ac,
  sides_confirmed = true,
  actual_home_score = v.hs,
  actual_away_score = v.as_,
  actual_winner = v.winner
from (values
  ('m-97',  'France',    'Morocco',     'FR', 'MA',     2, 0, 'France'),
  ('m-98',  'Spain',     'Belgium',     'ES', 'BE',     2, 1, 'Spain'),
  ('m-99',  'Norway',    'England',     'NO', 'GB-ENG', 1, 2, 'England'),
  ('m-100', 'Argentina', 'Switzerland', 'AR', 'CH',     3, 1, 'Argentina')
) as v(id, team_home, team_away, hc, ac, hs, as_, winner)
where m.id = v.id;

-- 3) Open the Semifinals for guessing (winners now known).
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = v.hc,
  team_away_code = v.ac,
  sides_confirmed = true,
  guess_deadline = m.kickoff_time
from (values
  ('m-101', 'France',  'Spain',     'FR',     'ES'),
  ('m-102', 'England', 'Argentina', 'GB-ENG', 'AR')
) as v(id, team_home, team_away, hc, ac)
where m.id = v.id;

-- 4) Refresh the third-place / final gate labels for the new SF pairings
--    (not yet open for guessing).
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = null,
  team_away_code = null,
  sides_confirmed = false
from (values
  ('m-103', 'Loser (SF France-Spain)',  'Loser (SF England-Argentina)'),
  ('m-104', 'Winner (SF France-Spain)', 'Winner (SF England-Argentina)')
) as v(id, team_home, team_away)
where m.id = v.id;

-- 5) Re-grade everything (r16 + qf now scored; sf still open).
select public.grade_all_predictions();
