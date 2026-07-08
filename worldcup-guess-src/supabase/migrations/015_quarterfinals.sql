-- 015: Round of 16 complete → open Quarterfinals + preconfigure SF/Final gates.
--
-- R16 results sourced from openfootball (Jul 4–7). QF matchups mapped by venue
-- to our m-97..m-100 rows (same approach as 014). SF/third/final get readable
-- gate labels until QF winners are known.

-- 1) Backfill all R16 results.
update public.matches as m set
  actual_home_score = v.hs,
  actual_away_score = v.as_,
  actual_winner = v.winner
from (values
  ('m-89', 0, 1, 'France'),
  ('m-90', 0, 3, 'Morocco'),
  ('m-91', 1, 2, 'Norway'),
  ('m-92', 2, 3, 'England'),
  ('m-93', 0, 1, 'Spain'),
  ('m-94', 1, 4, 'Belgium'),
  ('m-95', 3, 2, 'Argentina'),
  ('m-96', 0, 0, 'Switzerland')
) as v(id, hs, as_, winner)
where m.id = v.id;

-- 2) Clear QF keys before remapping (avoids unique-index collision).
update public.matches set openfootball_key = null
where id in ('m-97','m-98','m-99','m-100');

-- 3) Populate quarterfinals (now open for guessing).
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = v.team_home_code,
  team_away_code = v.team_away_code,
  sides_confirmed = true,
  guess_deadline = m.kickoff_time,
  openfootball_key = v.key
from (values
  ('m-97', 'France',      'Morocco',     'FR', 'MA',     '2026-07-09|Boston (Foxborough)|16:00 UTC-4'),
  ('m-98', 'Spain',       'Belgium',     'ES', 'BE',     '2026-07-10|Los Angeles (Inglewood)|12:00 UTC-7'),
  ('m-99', 'Norway',      'England',     'NO', 'GB-ENG', '2026-07-11|Miami (Miami Gardens)|17:00 UTC-4'),
  ('m-100','Argentina',  'Switzerland', 'AR', 'CH',     '2026-07-11|Kansas City|20:00 UTC-5')
) as v(id, team_home, team_away, team_home_code, team_away_code, key)
where m.id = v.id;

-- 4) Preconfigure future gates (not yet open for guessing).
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = null,
  team_away_code = null,
  sides_confirmed = false,
  openfootball_key = v.key
from (values
  ('m-101', 'France / Morocco',     'Spain / Belgium',         '2026-07-14|Dallas (Arlington)|14:00 UTC-5'),
  ('m-102', 'Norway / England',     'Argentina / Switzerland', '2026-07-15|Atlanta|15:00 UTC-4'),
  ('m-103', 'Loser (SF France/Morocco–Spain/Belgium)', 'Loser (SF Norway/England–Argentina/Switzerland)', '2026-07-18|Miami (Miami Gardens)|17:00 UTC-4'),
  ('m-104', 'Winner (SF France/Morocco–Spain/Belgium)', 'Winner (SF Norway/England–Argentina/Switzerland)', '2026-07-19|New York/New Jersey (East Rutherford)|15:00 UTC-4')
) as v(id, team_home, team_away, key)
where m.id = v.id;

-- 5) Re-grade with round-based points (r16 now scores; qf still open).
select public.grade_all_predictions();
