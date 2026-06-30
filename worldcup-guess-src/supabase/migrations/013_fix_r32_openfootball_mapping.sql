-- 013: Fix Round-of-32 result mapping.
--
-- Problem: openfootball numbers the R32 games differently than our bracket
-- match_number column, so the sync matched results by number and stamped the
-- wrong scores onto the wrong games (e.g. Brazil vs Japan showed 1-1 instead of
-- 2-1). The sync's first lookup is by `openfootball_key`, so pinning the correct
-- key per match (mapped by TEAMS) makes every code path resolve correctly and
-- permanently, independent of match_number.
--
-- key format = `${date}|${ground}|${time}` (see makeOpenfootballKey).

-- 0) Clear existing R32 keys first. We are swapping keys between rows
--    (m-74 <-> m-76, etc.), which would transiently duplicate values and trip
--    the unique index on openfootball_key. Multiple NULLs are allowed.
update public.matches
set openfootball_key = null
where id in ('m-73','m-74','m-75','m-76','m-77','m-78','m-79','m-80',
             'm-81','m-82','m-83','m-84','m-85','m-86','m-87','m-88');

-- 1) Pin the correct openfootball_key for each R32 match (mapped by teams).
update public.matches as m set openfootball_key = v.key
from (values
  ('m-73', '2026-06-28|Los Angeles (Inglewood)|12:00 UTC-7'),                 -- South Africa vs Canada
  ('m-74', '2026-06-29|Houston|12:00 UTC-5'),                                 -- Brazil vs Japan
  ('m-75', '2026-06-29|Boston (Foxborough)|16:30 UTC-4'),                     -- Germany vs Paraguay
  ('m-76', '2026-06-29|Monterrey (Guadalupe)|19:00 UTC-6'),                   -- Netherlands vs Morocco
  ('m-77', '2026-06-30|Dallas (Arlington)|12:00 UTC-5'),                      -- Cote d'Ivoire vs Norway
  ('m-78', '2026-06-30|New York/New Jersey (East Rutherford)|17:00 UTC-4'),   -- France vs Sweden
  ('m-79', '2026-06-30|Mexico City|19:00 UTC-6'),                             -- Mexico vs Ecuador
  ('m-80', '2026-07-01|Atlanta|12:00 UTC-4'),                                 -- England vs DR Congo
  ('m-81', '2026-07-01|Seattle|13:00 UTC-7'),                                 -- Belgium vs Senegal
  ('m-82', '2026-07-01|San Francisco Bay Area (Santa Clara)|17:00 UTC-7'),    -- United States vs Bosnia and Herzegovina
  ('m-83', '2026-07-02|Los Angeles (Inglewood)|12:00 UTC-7'),                 -- Spain vs Austria
  ('m-84', '2026-07-02|Toronto|19:00 UTC-4'),                                 -- Portugal vs Croatia
  ('m-85', '2026-07-02|Vancouver|20:00 UTC-7'),                               -- Switzerland vs Algeria
  ('m-86', '2026-07-03|Dallas (Arlington)|13:00 UTC-5'),                      -- Australia vs Egypt
  ('m-87', '2026-07-03|Miami (Miami Gardens)|18:00 UTC-4'),                   -- Argentina vs Cape Verde
  ('m-88', '2026-07-03|Kansas City|20:30 UTC-5')                              -- Colombia vs Ghana
) as v(id, key)
where m.id = v.id;

-- 2) Set the correct final scores for the R32 games already played
--    (home/away are in OUR orientation: team_home is the home side).
update public.matches as m set
  actual_home_score = v.hs,
  actual_away_score = v.as_,
  actual_winner = v.winner
from (values
  ('m-73', 0, 1, 'Canada'),   -- South Africa 0 - 1 Canada
  ('m-74', 2, 1, 'Brazil'),   -- Brazil 2 - 1 Japan
  ('m-75', 1, 1, null),       -- Germany 1 - 1 Paraguay
  ('m-76', 1, 1, null),       -- Netherlands 1 - 1 Morocco
  ('m-77', 1, 2, 'Norway')    -- Cote d'Ivoire 1 - 2 Norway
) as v(id, hs, as_, winner)
where m.id = v.id;

-- 3) Re-grade everything with the corrected results + round-based scoring.
select public.grade_all_predictions();
