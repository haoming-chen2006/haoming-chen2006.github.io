-- Results sync, grading, prediction distribution, and openfootball matching.

alter table public.matches
add column if not exists openfootball_key text unique;

create table if not exists public.sync_unmatched (
  id uuid primary key default gen_random_uuid(),
  openfootball_key text not null,
  payload jsonb not null,
  reason text not null default 'no_match',
  created_at timestamptz not null default now(),
  unique (openfootball_key)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  matches_updated integer not null default 0,
  guesses_graded integer not null default 0,
  unmatched_count integer not null default 0,
  error text
);

alter table public.guesses
add column if not exists points_earned integer,
add column if not exists outcome_correct boolean,
add column if not exists exact_correct boolean,
add column if not exists minority_bonus_applied boolean not null default false,
add column if not exists graded_at timestamptz;

-- Predict winner from guess row + match teams (mirrors client pickWinner).
create or replace function public.guess_predicted_winner(
  p_pred_home integer,
  p_pred_away integer,
  p_pred_winner text,
  p_team_home text,
  p_team_away text
)
returns text
language sql
immutable
as $$
  select case
    when p_pred_home = p_pred_away then nullif(p_pred_winner, '')
    when p_pred_home > p_pred_away then p_team_home
    else p_team_away
  end;
$$;

-- Round outcome / exact point values (Fibonacci-ish).
create or replace function public.round_outcome_points(p_round text)
returns integer
language sql
immutable
as $$
  select case p_round
    when 'group' then 3
    when 'r32' then 5
    when 'r16' then 8
    when 'qf' then 13
    when 'sf' then 21
    when 'third' then 13
    when 'final' then 34
    else 0
  end;
$$;

create or replace function public.round_exact_points(p_round text)
returns integer
language sql
immutable
as $$
  select case p_round
    when 'group' then 2
    when 'r32' then 3
    when 'r16' then 4
    when 'qf' then 5
    when 'sf' then 8
    when 'third' then 5
    when 'final' then 13
    else 0
  end;
$$;

-- Grade all guesses for matches that have actual results; refresh profiles.total_points.
create or replace function public.grade_all_predictions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_graded integer := 0;
  v_match record;
  v_guess record;
  v_predicted text;
  v_points integer;
  v_outcome integer;
  v_exact integer;
  v_total_guesses integer;
  v_pick_count integer;
  v_share numeric;
begin
  for v_match in
    select * from public.matches
    where actual_winner is not null
      and actual_home_score is not null
  loop
    select count(*) into v_total_guesses
    from public.guesses g
    where g.match_id = v_match.id;

    for v_guess in
      select * from public.guesses g where g.match_id = v_match.id
    loop
      v_predicted := public.guess_predicted_winner(
        v_guess.pred_home_score,
        v_guess.pred_away_score,
        v_guess.pred_winner,
        v_match.team_home,
        v_match.team_away
      );

      v_points := 0;
      v_outcome := public.round_outcome_points(v_match.round);
      v_exact := public.round_exact_points(v_match.round);

      if v_predicted is not null and v_predicted = v_match.actual_winner then
        v_points := v_points + v_outcome;
      end if;

      if v_guess.pred_home_score = v_match.actual_home_score
         and v_guess.pred_away_score = v_match.actual_away_score then
        v_points := v_points + v_exact;
      end if;

      -- Minority bonus: correct pick held by <= 20% of guessers → 1.5× match points.
      if v_points > 0 and v_total_guesses > 0 and v_predicted is not null then
        select count(*) into v_pick_count
        from public.guesses g2
        where g2.match_id = v_match.id
          and public.guess_predicted_winner(
                g2.pred_home_score, g2.pred_away_score, g2.pred_winner,
                v_match.team_home, v_match.team_away
              ) = v_predicted;

        v_share := v_pick_count::numeric / v_total_guesses::numeric;
        if v_share <= 0.2 then
          v_points := floor(v_points * 1.5);
          update public.guesses
          set minority_bonus_applied = true
          where id = v_guess.id;
        else
          update public.guesses
          set minority_bonus_applied = false
          where id = v_guess.id;
        end if;
      end if;

      update public.guesses
      set
        points_earned = v_points,
        outcome_correct = (v_predicted is not null and v_predicted = v_match.actual_winner),
        exact_correct = (
          v_guess.pred_home_score = v_match.actual_home_score
          and v_guess.pred_away_score = v_match.actual_away_score
        ),
        graded_at = now()
      where id = v_guess.id;

      v_graded := v_graded + 1;
    end loop;
  end loop;

  -- Recompute profile totals from graded guesses.
  update public.profiles p
  set total_points = coalesce(totals.pts, 0)
  from (
    select g.user_id, sum(coalesce(g.points_earned, 0))::integer as pts
    from public.guesses g
    group by g.user_id
  ) totals
  where p.user_id = totals.user_id;

  update public.profiles p
  set total_points = 0
  where not exists (
    select 1 from public.guesses g where g.user_id = p.user_id and g.points_earned is not null
  );

  return jsonb_build_object('graded', v_graded);
end;
$$;

-- Aggregate prediction counts per match (for bar charts).
create or replace function public.get_guess_distributions()
returns table (
  match_id text,
  home_team text,
  away_team text,
  home_count bigint,
  away_count bigint,
  draw_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    m.id as match_id,
    m.team_home as home_team,
    m.team_away as away_team,
    count(*) filter (
      where public.guess_predicted_winner(
        g.pred_home_score, g.pred_away_score, g.pred_winner, m.team_home, m.team_away
      ) = m.team_home
    ) as home_count,
    count(*) filter (
      where public.guess_predicted_winner(
        g.pred_home_score, g.pred_away_score, g.pred_winner, m.team_home, m.team_away
      ) = m.team_away
    ) as away_count,
    count(*) filter (
      where g.pred_home_score = g.pred_away_score
        and coalesce(g.pred_winner, '') = ''
    ) as draw_count
  from public.matches m
  left join public.guesses g on g.match_id = m.id
  where m.sides_confirmed = true
  group by m.id, m.team_home, m.team_away;
$$;

-- Who picked which side for a single match.
create or replace function public.get_match_guess_detail(p_match_id text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  with base as (
    select
      g.user_id,
      coalesce(p.display_name, p.email, 'Player') as display_name,
      public.guess_predicted_winner(
        g.pred_home_score, g.pred_away_score, g.pred_winner,
        m.team_home, m.team_away
      ) as predicted_winner,
      g.pred_home_score,
      g.pred_away_score,
      m.team_home,
      m.team_away
    from public.guesses g
    join public.matches m on m.id = g.match_id
    left join public.profiles p on p.user_id = g.user_id
    where g.match_id = p_match_id
  )
  select jsonb_build_object(
    'home_team', (select team_home from public.matches where id = p_match_id),
    'away_team', (select team_away from public.matches where id = p_match_id),
    'home_picks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'display_name', display_name,
        'pred_home_score', pred_home_score,
        'pred_away_score', pred_away_score
      ) order by display_name)
      from base where predicted_winner = (select team_home from public.matches where id = p_match_id)
    ), '[]'::jsonb),
    'away_picks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'display_name', display_name,
        'pred_home_score', pred_home_score,
        'pred_away_score', pred_away_score
      ) order by display_name)
      from base where predicted_winner = (select team_away from public.matches where id = p_match_id)
    ), '[]'::jsonb),
    'draw_picks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'display_name', display_name,
        'pred_home_score', pred_home_score,
        'pred_away_score', pred_away_score
      ) order by display_name)
      from base where predicted_winner is null
    ), '[]'::jsonb)
  );
$$;

-- Full prediction profile for a user (leaderboard drill-down).
create or replace function public.get_user_prediction_profile(p_user_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', p.user_id,
    'display_name', coalesce(p.display_name, p.email, 'Player'),
    'email', p.email,
    'total_points', p.total_points,
    'match_guesses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'match_id', g.match_id,
        'team_home', m.team_home,
        'team_away', m.team_away,
        'pred_home_score', g.pred_home_score,
        'pred_away_score', g.pred_away_score,
        'predicted_winner', public.guess_predicted_winner(
          g.pred_home_score, g.pred_away_score, g.pred_winner, m.team_home, m.team_away
        ),
        'points_earned', g.points_earned,
        'actual_home_score', m.actual_home_score,
        'actual_away_score', m.actual_away_score,
        'actual_winner', m.actual_winner,
        'kickoff_time', m.kickoff_time
      ) order by m.kickoff_time)
      from public.guesses g
      join public.matches m on m.id = g.match_id
      where g.user_id = p_user_id
    ), '[]'::jsonb),
    'tournament_picks', coalesce((
      select to_jsonb(pa.*) - 'id' - 'user_id' - 'created_at'
      from public.player_artifacts pa
      where pa.user_id = p_user_id
    ), '{}'::jsonb)
  )
  from public.profiles p
  where p.user_id = p_user_id;
$$;

revoke all on function public.grade_all_predictions() from public;
grant execute on function public.grade_all_predictions() to service_role;

revoke all on function public.get_guess_distributions() from public;
grant execute on function public.get_guess_distributions() to anon, authenticated;

revoke all on function public.get_match_guess_detail(text) from public;
grant execute on function public.get_match_guess_detail(text) to anon, authenticated;

revoke all on function public.get_user_prediction_profile(uuid) from public;
grant execute on function public.get_user_prediction_profile(uuid) to anon, authenticated;

-- Allow reading sync_unmatched for admin/debug (anon ok in demo).
alter table public.sync_unmatched enable row level security;
drop policy if exists "sync_unmatched readable" on public.sync_unmatched;
create policy "sync_unmatched readable"
on public.sync_unmatched for select to anon, authenticated using (true);

alter table public.sync_runs enable row level security;
drop policy if exists "sync_runs readable" on public.sync_runs;
create policy "sync_runs readable"
on public.sync_runs for select to anon, authenticated using (true);
