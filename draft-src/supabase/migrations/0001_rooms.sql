-- One row is one game. The Edge Function is the only thing that writes it; every
-- browser reads it and is pushed changes over Realtime.

create table if not exists rooms (
  code        text primary key,
  mode        text not null,
  state       jsonb not null,
  version     int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table rooms enable row level security;

-- Anyone with the code may watch a room. Nobody may write one: there is no
-- insert, update or delete policy, so only the service role gets through, and
-- the service role key lives in the Edge Function.
drop policy if exists read_all on rooms;
create policy read_all on rooms for select using (true);

-- Realtime needs the whole row on update to push a useful payload.
alter table rooms replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table rooms;
  end if;
end $$;
