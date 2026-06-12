-- Daily report: today's best/worst guesser (today's matches only), the current
-- overall leader(s), and one fun fact. "Today" is the most recent day that has
-- graded results, so it advances automatically every time results refresh.
--
-- Returns jsonb consumed both by the website banner and by the daily message.

create or replace function public.get_daily_report()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_day date;
  v_match_ids text[];
  v_match_count integer;
  v_best jsonb;
  v_worst jsonb;
  v_leaders jsonb;
  v_max_total integer;
  v_fun text;
begin
  -- "Today" = the latest day with graded results.
  select max(kickoff_time::date) into v_day
  from public.matches
  where actual_home_score is not null and actual_away_score is not null;

  if v_day is null then
    return jsonb_build_object('has_data', false);
  end if;

  select array_agg(id), count(*) into v_match_ids, v_match_count
  from public.matches
  where actual_home_score is not null and actual_away_score is not null
    and kickoff_time::date = v_day;

  -- Per-user points earned on today's matches.
  with today_points as (
    select
      g.user_id,
      coalesce(p.display_name, p.email, 'Player') as display_name,
      sum(coalesce(g.points_earned, 0))::integer as points,
      count(*)::integer as picks
    from public.guesses g
    join public.profiles p on p.user_id = g.user_id
    where g.match_id = any(v_match_ids)
      and g.points_earned is not null
    group by g.user_id, coalesce(p.display_name, p.email, 'Player')
  )
  select
    (select to_jsonb(t) from (
      select display_name, points, picks from today_points
      order by points desc, picks desc, display_name asc limit 1
    ) t),
    (select to_jsonb(t) from (
      select display_name, points, picks from today_points
      order by points asc, picks desc, display_name asc limit 1
    ) t)
  into v_best, v_worst;

  -- Current overall leader(s): everyone tied at the top (with points > 0).
  select max(total_points) into v_max_total from public.profiles;

  if v_max_total is not null and v_max_total > 0 then
    select jsonb_agg(
      jsonb_build_object(
        'display_name', coalesce(display_name, email, 'Player'),
        'total_points', total_points
      ) order by coalesce(display_name, email, 'Player')
    )
    into v_leaders
    from public.profiles
    where total_points = v_max_total;
  else
    v_leaders := '[]'::jsonb;
  end if;

  -- Fun fact: prefer an exact-scoreline hit from today...
  select coalesce(p.display_name, p.email, 'Player')
         || ' nailed the exact ' || m.actual_home_score || '–' || m.actual_away_score
         || ' scoreline in ' || m.team_home || ' vs ' || m.team_away || '.'
  into v_fun
  from public.guesses g
  join public.matches m on m.id = g.match_id
  join public.profiles p on p.user_id = g.user_id
  where g.match_id = any(v_match_ids) and g.exact_correct = true
  order by g.points_earned desc nulls last, g.id
  limit 1;

  -- ...otherwise the single biggest-scoring pick of the day...
  if v_fun is null then
    select coalesce(p.display_name, p.email, 'Player')
           || ' banked ' || g.points_earned || ' pts backing ' || m.team_home
           || ' vs ' || m.team_away || '.'
    into v_fun
    from public.guesses g
    join public.matches m on m.id = g.match_id
    join public.profiles p on p.user_id = g.user_id
    where g.match_id = any(v_match_ids) and coalesce(g.points_earned, 0) > 0
    order by g.points_earned desc, g.id
    limit 1;
  end if;

  -- ...or admit it was a quiet day.
  if v_fun is null then
    v_fun := 'Nobody cracked today''s results — a clean sweep for the underdogs.';
  end if;

  return jsonb_build_object(
    'has_data', true,
    'report_date', to_char(v_day, 'YYYY-MM-DD'),
    'matches_today', v_match_count,
    'best_today', v_best,
    'worst_today', v_worst,
    'leaders', coalesce(v_leaders, '[]'::jsonb),
    'fun_fact', v_fun
  );
end;
$$;

revoke all on function public.get_daily_report() from public;
grant execute on function public.get_daily_report() to anon, authenticated;
