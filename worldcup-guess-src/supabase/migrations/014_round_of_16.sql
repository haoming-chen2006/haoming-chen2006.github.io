-- 014: Round of 16 (1/8 finals) live + finish R32.
--
-- The R16 draw is set. Our bracket's W-code linkage does not line up with the
-- real 2026 bracket, but venues/kickoffs match openfootball 1:1, so we map the
-- real matchups onto our m-89..m-96 rows by venue. All 8 ties are now known
-- (Argentina beat Cape Verde AET, Egypt beat Australia, Colombia beat Ghana 1-0).
--
-- Also backfills the last R32 result (m-88 Colombia 1-0 Ghana) that never synced.

-- 1) Finish R32: Colombia 1-0 Ghana.
update public.matches
set actual_home_score = 1, actual_away_score = 0, actual_winner = 'Colombia'
where id = 'm-88';

-- 2) Clear R16 keys first (avoids any transient unique-index collision).
update public.matches set openfootball_key = null
where id in ('m-89','m-90','m-91','m-92','m-93','m-94','m-95','m-96');

-- 3) Fill the Round of 16 matchups (mapped by venue) + real team codes,
--    confirm sides, and set the guess deadline to kickoff.
update public.matches as m set
  team_home = v.team_home,
  team_away = v.team_away,
  team_home_code = v.team_home_code,
  team_away_code = v.team_away_code,
  sides_confirmed = true,
  guess_deadline = m.kickoff_time,
  openfootball_key = v.key
from (values
  ('m-89', 'Paraguay',      'France',  'PY', 'FR', '2026-07-04|Philadelphia|17:00 UTC-4'),
  ('m-90', 'Canada',        'Morocco', 'CA', 'MA', '2026-07-04|Houston|12:00 UTC-5'),
  ('m-91', 'Brazil',        'Norway',  'BR', 'NO', '2026-07-05|New York/New Jersey (East Rutherford)|16:00 UTC-4'),
  ('m-92', 'Mexico',        'England', 'MX', 'GB-ENG', '2026-07-05|Mexico City|18:00 UTC-6'),
  ('m-93', 'Portugal',      'Spain',   'PT', 'ES', '2026-07-06|Dallas (Arlington)|14:00 UTC-5'),
  ('m-94', 'United States', 'Belgium', 'US', 'BE', '2026-07-06|Seattle|17:00 UTC-7'),
  ('m-95', 'Argentina',     'Egypt',   'AR', 'EG', '2026-07-07|Atlanta|12:00 UTC-4'),
  ('m-96', 'Switzerland',   'Colombia','CH', 'CO', '2026-07-07|Vancouver|13:00 UTC-7')
) as v(id, team_home, team_away, team_home_code, team_away_code, key)
where m.id = v.id;

-- 4) Re-grade (R32 now complete; R16 has no results yet so no points change there).
select public.grade_all_predictions();
