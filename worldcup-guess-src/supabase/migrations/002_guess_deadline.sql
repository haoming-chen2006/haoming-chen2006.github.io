-- Separate guess lock deadline from kickoff (defaults to kickoff when unset).

alter table public.matches
add column if not exists guess_deadline timestamptz;

update public.matches
set guess_deadline = kickoff_time
where guess_deadline is null;

create or replace function public.match_guess_deadline(match_row public.matches)
returns timestamptz
language sql
immutable
as $$
  select coalesce(match_row.guess_deadline, match_row.kickoff_time);
$$;

create or replace function public.reject_late_guess()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deadline timestamptz;
  match_confirmed boolean;
begin
  select public.match_guess_deadline(m), m.sides_confirmed
    into deadline, match_confirmed
    from public.matches m
    where m.id = new.match_id;

  if deadline <= now() then
    raise exception 'This match has already locked.';
  end if;

  if match_confirmed is not true then
    raise exception 'This match is not available for guesses yet.';
  end if;

  new.updated_at = now();
  return new;
end;
$$;
