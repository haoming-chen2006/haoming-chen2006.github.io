-- Two final changes:
--   1) Lock tournament trophy/player picks (player_artifacts) at the end of the
--      group stage. The first knockout (R32) kicks off 2026-06-28 19:00 UTC, so
--      that instant is the cutoff for all tournament-long futures.
--   2) Recompute the leaderboard whenever a match result changes — via the
--      openfootball sync, a direct dashboard edit, or the new manual-entry RPC.

-- ---------------------------------------------------------------------------
-- Shared deadline for tournament-long trophy picks.
-- ---------------------------------------------------------------------------
create or replace function public.trophy_pick_deadline()
returns timestamptz
language sql
immutable
as $$
  select timestamptz '2026-06-28 19:00:00+00';
$$;

-- ---------------------------------------------------------------------------
-- Auto-grade: any time a match's actual result is set or changed, recompute
-- every guess and every profile total. Covers the openfootball sync, the
-- manual-entry RPC below, and direct dashboard edits alike.
-- ---------------------------------------------------------------------------
create or replace function public.matches_autograde()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grade_all_predictions();
  return null;
end;
$$;

drop trigger if exists matches_autograde_update on public.matches;
create trigger matches_autograde_update
after update of actual_home_score, actual_away_score, actual_winner
on public.matches
for each row
when (
  new.actual_home_score is distinct from old.actual_home_score
  or new.actual_away_score is distinct from old.actual_away_score
  or new.actual_winner is distinct from old.actual_winner
)
execute function public.matches_autograde();

drop trigger if exists matches_autograde_insert on public.matches;
create trigger matches_autograde_insert
after insert on public.matches
for each row
when (new.actual_home_score is not null and new.actual_away_score is not null)
execute function public.matches_autograde();

-- ---------------------------------------------------------------------------
-- Manual result entry. Authenticated users cannot write to matches directly
-- (no RLS write policy), so this SECURITY DEFINER RPC is the in-app path for
-- when the openfootball feed has no score yet. The autograde trigger fires on
-- the update, so the leaderboard refreshes immediately.
-- ---------------------------------------------------------------------------
create or replace function public.set_match_result(
  p_match_id text,
  p_home_score integer,
  p_away_score integer,
  p_pen_winner text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_winner text;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Unknown match %', p_match_id;
  end if;

  if p_home_score is null or p_away_score is null
     or p_home_score < 0 or p_away_score < 0 then
    raise exception 'Scores must be non-negative integers.';
  end if;

  if p_home_score > p_away_score then
    v_winner := v_match.team_home;
  elsif p_away_score > p_home_score then
    v_winner := v_match.team_away;
  else
    -- Level score: a group match is a genuine draw (winner null); a knockout
    -- tie is decided on penalties and needs an explicit shootout winner.
    if v_match.round = 'group' then
      v_winner := null;
    elsif p_pen_winner is not null
          and p_pen_winner in (v_match.team_home, v_match.team_away) then
      v_winner := p_pen_winner;
    else
      raise exception 'A knockout tie needs a penalty-shootout winner.';
    end if;
  end if;

  update public.matches
  set actual_home_score = p_home_score,
      actual_away_score = p_away_score,
      actual_winner = v_winner
  where id = p_match_id;

  return jsonb_build_object(
    'match_id', p_match_id,
    'actual_home_score', p_home_score,
    'actual_away_score', p_away_score,
    'actual_winner', v_winner
  );
end;
$$;

revoke all on function public.set_match_result(text, integer, integer, text) from public;
grant execute on function public.set_match_result(text, integer, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lock tournament trophy picks once the group stage ends.
-- ---------------------------------------------------------------------------
create or replace function public.reject_late_trophy_pick()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.trophy_pick_deadline() <= now() then
    raise exception 'Tournament picks locked at the end of the group stage.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_artifacts_lock on public.player_artifacts;
create trigger player_artifacts_lock
before insert or update on public.player_artifacts
for each row execute function public.reject_late_trophy_pick();
