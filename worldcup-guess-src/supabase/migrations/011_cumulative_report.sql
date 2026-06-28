-- 011: Read-only cumulative report RPC (group leaderboard, lone-correct matches,
-- fun stats). Granted to anon so it can be called with the publishable key.

create or replace function public.get_cumulative_report()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with graded as (
  select g.user_id, g.match_id, g.points_earned, g.outcome_correct, g.exact_correct,
         m.round, m.team_home, m.team_away, m.kickoff_time,
         m.actual_home_score, m.actual_away_score
  from public.guesses g
  join public.matches m on m.id = g.match_id
  where g.points_earned is not null
),
gl as (
  select gd.user_id,
         sum(gd.points_earned) as pts,
         count(*) as n,
         sum((gd.outcome_correct)::int) as wins
  from graded gd
  where gd.round = 'group'
  group by gd.user_id
),
group_leaderboard as (
  select coalesce(p.display_name, p.email, 'Player') as name, gl.pts, gl.n, gl.wins
  from gl join public.profiles p on p.user_id = gl.user_id
  order by gl.pts desc, gl.wins desc
  limit 10
),
match_correct as (
  select gd.match_id, gd.team_home, gd.team_away,
         gd.actual_home_score, gd.actual_away_score, gd.round,
         count(*) filter (where gd.outcome_correct) as cc,
         count(*) as total_guesses
  from graded gd
  group by gd.match_id, gd.team_home, gd.team_away,
           gd.actual_home_score, gd.actual_away_score, gd.round
),
single_correct as (
  select mc.*, (
    select coalesce(pp.display_name, pp.email, 'Player')
    from graded g2 join public.profiles pp on pp.user_id = g2.user_id
    where g2.match_id = mc.match_id and g2.outcome_correct
    limit 1
  ) as lone_player
  from match_correct mc
  where mc.cc = 1
  order by mc.total_guesses desc
  limit 5
),
seq as (
  select user_id, kickoff_time, outcome_correct,
    row_number() over (partition by user_id order by kickoff_time)
      - row_number() over (partition by user_id, outcome_correct order by kickoff_time) as grp
  from graded
),
runs as (
  select user_id, outcome_correct, count(*) as run_len
  from seq
  group by user_id, outcome_correct, grp
),
win_streak as (
  select coalesce(p.display_name, p.email, 'Player') as name, r.run_len
  from runs r join public.profiles p on p.user_id = r.user_id
  where r.outcome_correct
  order by r.run_len desc
  limit 1
),
loss_streak as (
  select coalesce(p.display_name, p.email, 'Player') as name, r.run_len
  from runs r join public.profiles p on p.user_id = r.user_id
  where not r.outcome_correct
  order by r.run_len desc
  limit 1
),
ppg as (
  select coalesce(p.display_name, p.email, 'Player') as name,
         round(avg(gd.points_earned)::numeric, 2) as avg_pts,
         count(*) as n
  from graded gd join public.profiles p on p.user_id = gd.user_id
  group by p.user_id, p.display_name, p.email
  order by avg_pts desc
  limit 1
),
exact_king as (
  select coalesce(p.display_name, p.email, 'Player') as name, count(*) as exacts
  from graded gd join public.profiles p on p.user_id = gd.user_id
  where gd.exact_correct
  group by p.user_id, p.display_name, p.email
  order by exacts desc
  limit 1
)
select jsonb_build_object(
  'generated_at', now(),
  'group_leaderboard', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', name, 'points', pts, 'graded', n, 'wins', wins
    )), '[]'::jsonb) from group_leaderboard
  ),
  'single_correct_matches', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'match', team_home || ' vs ' || team_away,
      'score', actual_home_score || ':' || actual_away_score,
      'round', round,
      'total_guesses', total_guesses,
      'only_correct', lone_player
    )), '[]'::jsonb) from single_correct
  ),
  'fun_stats', jsonb_build_object(
    'most_points_per_guess', (select jsonb_build_object('name', name, 'avg_points', avg_pts, 'guesses', n) from ppg),
    'longest_win_streak', (select jsonb_build_object('name', name, 'streak', run_len) from win_streak),
    'longest_losing_streak', (select jsonb_build_object('name', name, 'streak', run_len) from loss_streak),
    'most_exact_scores', (select jsonb_build_object('name', name, 'exact_scores', exacts) from exact_king)
  )
);
$$;

revoke all on function public.get_cumulative_report() from public;
grant execute on function public.get_cumulative_report() to anon, authenticated;
