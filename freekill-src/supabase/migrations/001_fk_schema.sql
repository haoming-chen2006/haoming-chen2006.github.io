-- FreeKill Web backplane. Everything here is prefixed `fk_` and additive: this
-- database also serves a live World Cup app and nothing outside the `fk_`
-- namespace is touched.
--
-- The privacy design (contract/db.ts) is the reason this file is shaped the way
-- it is. The seed and the command log each independently reconstruct every
-- hidden hand, so both are gated on *being the current host*, not on holding a
-- role. Anonymous sign-in hands every visitor `role: authenticated`, so
-- `to authenticated using (true)` would be equivalent to publishing the deck.
--
-- Postgres RLS filters rows, never columns, so the seed cannot live on
-- `fk_rooms` (whose summary rows are a public lobby listing) and still be
-- host-only. It lives in `fk_room_secrets`, one row per room, where "non-host
-- reads the seed" is literally "non-host selects zero rows".

-- ---------------------------------------------------------------- enum types

do $$ begin
  create type fk_room_status as enum ('waiting', 'playing', 'finished', 'abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fk_connection_state as enum ('online', 'offline', 'left');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------- tables

create table if not exists public.fk_rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  host_id     text not null,
  status      fk_room_status not null default 'waiting',
  name        text not null,
  capacity    int  not null check (capacity between 2 and 12),
  settings    jsonb not null default '{}'::jsonb,
  bundle_sha  text not null,
  -- Denormalised so the lobby can render a room list without reading anyone's
  -- seat rows. `fk_room_players` stays strictly member-gated as a result.
  host_name   text not null default '?',
  seated      int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint fk_rooms_code_shape check (code ~ '^[A-Z0-9]{4,8}$')
);

comment on table public.fk_rooms is
  'Room metadata. Deliberately public to any signed-in user: this is the lobby listing. Contains no secrets — the seed is in fk_room_secrets.';

create index if not exists fk_rooms_status_updated_idx
  on public.fk_rooms (status, updated_at desc);

-- HOST-ONLY. One row per room, split out of fk_rooms precisely so that RLS can
-- hide it: a non-host selecting here gets zero rows, not an error.
create table if not exists public.fk_room_secrets (
  room_id uuid primary key references public.fk_rooms (id) on delete cascade,
  -- 32-bit, handed to math.randomseed in a fresh VM.
  seed    int not null,
  created_at timestamptz not null default now()
);

comment on table public.fk_room_secrets is
  'HOST-ONLY. The deal. RLS returns zero rows to every non-host, including seated members.';

create table if not exists public.fk_room_players (
  room_id      uuid not null references public.fk_rooms (id) on delete cascade,
  -- auth.uid()::text for a human; a synthetic `bot:<room>:<seat>` for a bot,
  -- which is why this is text and not a uuid FK to auth.users.
  user_id      text not null,
  seat         int  not null check (seat >= 1),
  display_name text not null,
  avatar       text not null default '',
  connection   fk_connection_state not null default 'online',
  is_bot       boolean not null default false,
  ready        boolean not null default false,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, seat),
  unique (room_id, user_id)
);

create index if not exists fk_room_players_user_idx
  on public.fk_room_players (user_id);

-- Append-only, host-only, (room_id, seq) dense from 1.
create table if not exists public.fk_commands (
  room_id    uuid not null references public.fk_rooms (id) on delete cascade,
  seq        int  not null check (seq >= 1),
  player_id  int  not null,
  command    text not null,
  reply      jsonb,
  digest     text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, seq)
);

comment on table public.fk_commands is
  'HOST-ONLY for read and insert. Append-only. Every private reply in the game is here; the log plus the seed rebuilds every hidden hand.';

create table if not exists public.fk_chat (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.fk_rooms (id) on delete cascade,
  user_id      text not null,
  player_id    int,
  display_name text not null,
  text         text not null check (char_length(text) between 1 and 500),
  created_at   timestamptz not null default now()
);

create index if not exists fk_chat_room_time_idx
  on public.fk_chat (room_id, created_at);

-- ----------------------------------------------------------------- functions

-- SECURITY DEFINER so a policy on fk_room_players can call it without
-- recursing into that table's own policy. Owned by the migration role, which is
-- the table owner, and these tables are not FORCE ROW LEVEL SECURITY.
create or replace function public.fk_is_member(p_room uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.fk_room_players p
    where p.room_id = p_room and p.user_id = auth.uid()::text
  );
$$;

create or replace function public.fk_is_host(p_room uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.fk_rooms r
    where r.id = p_room and r.host_id = auth.uid()::text
  );
$$;

create or replace function public.fk_new_code()
returns text language plpgsql volatile
set search_path = public, pg_temp as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no I L O 0 1
  candidate text;
begin
  for _try in 1..40 loop
    candidate := '';
    for _i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.fk_rooms r where r.code = candidate) then
      return candidate;
    end if;
  end loop;
  -- Vanishingly unlikely; widen rather than fail.
  return candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
end $$;

-- Keeps the lobby-visible counters honest without exposing seat rows.
create or replace function public.fk_sync_room_stats()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_room uuid := coalesce(new.room_id, old.room_id);
begin
  update public.fk_rooms r set
    seated = (select count(*) from public.fk_room_players p where p.room_id = v_room),
    host_name = coalesce(
      (select p.display_name from public.fk_room_players p
       where p.room_id = v_room and p.user_id = r.host_id), r.host_name),
    updated_at = now()
  where r.id = v_room;
  return null;
end $$;

drop trigger if exists fk_room_players_stats on public.fk_room_players;
create trigger fk_room_players_stats
  after insert or update or delete on public.fk_room_players
  for each row execute function public.fk_sync_room_stats();

create or replace function public.fk_touch_room()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists fk_rooms_touch on public.fk_rooms;
create trigger fk_rooms_touch before update on public.fk_rooms
  for each row execute function public.fk_touch_room();

-- A gap makes the log unreplayable, so a gapped or out-of-order insert is a
-- hard error rather than a silently accepted row.
create or replace function public.fk_commands_dense_seq()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
declare
  expected int;
begin
  select coalesce(max(c.seq), 0) + 1 into expected
    from public.fk_commands c where c.room_id = new.room_id;
  if new.seq is null then
    new.seq := expected;
  elsif new.seq <> expected then
    raise exception 'fk_commands: seq % is out of order for room % (expected %)',
      new.seq, new.room_id, expected using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists fk_commands_seq on public.fk_commands;
create trigger fk_commands_seq before insert on public.fk_commands
  for each row execute function public.fk_commands_dense_seq();

-- Append-only means no rewriting history. It does not mean a room can never be
-- deleted: a cascade from `fk_rooms` removes the parent row first, inside the
-- same statement, so "the room is already gone" is exactly the one delete this
-- allows. Without that carve-out a room with any logged decision is undeletable.
create or replace function public.fk_commands_append_only()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from public.fk_rooms r where r.id = old.room_id) then
    return old;
  end if;
  raise exception 'fk_commands is append-only' using errcode = '42501';
end $$;

drop trigger if exists fk_commands_immutable on public.fk_commands;
create trigger fk_commands_immutable before update or delete on public.fk_commands
  for each row execute function public.fk_commands_append_only();

-- ---------------------------------------------------------------------- RPCs
-- Membership and handover only. No game logic in the database.

create or replace function public.fk_create_room(
  p_name text, p_capacity int, p_settings jsonb, p_bundle_sha text,
  p_display_name text, p_avatar text
) returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_uid  text := auth.uid()::text;
  v_room uuid;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.fk_rooms (code, host_id, name, capacity, settings, bundle_sha, host_name, seated)
  values (public.fk_new_code(), v_uid, p_name, p_capacity,
          coalesce(p_settings, '{}'::jsonb), p_bundle_sha, p_display_name, 0)
  returning id into v_room;

  insert into public.fk_room_secrets (room_id, seed)
  values (v_room, (floor(random() * 2147483647))::int);

  insert into public.fk_room_players (room_id, user_id, seat, display_name, avatar)
  values (v_room, v_uid, 1, p_display_name, coalesce(p_avatar, ''));

  return v_room;
end $$;

-- Lowest free seat, taken under a row lock so two simultaneous joins cannot
-- both win seat 3.
create or replace function public.fk_join_room(
  p_code text, p_display_name text, p_avatar text
) returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_uid  text := auth.uid()::text;
  v_room public.fk_rooms;
  v_seat int;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into v_room from public.fk_rooms
    where code = upper(p_code) and status <> 'abandoned' for update;
  if not found then raise exception 'no such room: %', p_code using errcode = 'P0002'; end if;

  if exists (select 1 from public.fk_room_players p
             where p.room_id = v_room.id and p.user_id = v_uid) then
    update public.fk_room_players
      set display_name = p_display_name, avatar = coalesce(p_avatar, ''),
          connection = 'online', last_seen_at = now()
      where room_id = v_room.id and user_id = v_uid;
    return v_room.id;
  end if;

  select s.n into v_seat
    from generate_series(1, v_room.capacity) as s(n)
    where not exists (select 1 from public.fk_room_players p
                      where p.room_id = v_room.id and p.seat = s.n)
    order by s.n limit 1;
  if v_seat is null then raise exception 'room is full' using errcode = 'P0001'; end if;

  insert into public.fk_room_players (room_id, user_id, seat, display_name, avatar)
  values (v_room.id, v_uid, v_seat, p_display_name, coalesce(p_avatar, ''));
  return v_room.id;
end $$;

create or replace function public.fk_update_settings(p_room uuid, p_patch jsonb)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if not public.fk_is_host(p_room) then
    raise exception 'only the host may change settings' using errcode = '42501';
  end if;
  update public.fk_rooms set settings = settings || coalesce(p_patch, '{}'::jsonb)
    where id = p_room;
end $$;

create or replace function public.fk_leave_room(p_room uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_uid text := auth.uid()::text;
  v_successor text;
begin
  -- SECURITY DEFINER, so state the membership check rather than leaving it
  -- implied by the DELETE matching nothing.
  if not exists (select 1 from public.fk_room_players p
                 where p.room_id = p_room and p.user_id = v_uid) then
    return;
  end if;

  delete from public.fk_room_players where room_id = p_room and user_id = v_uid;

  if not exists (select 1 from public.fk_room_players p
                 where p.room_id = p_room and not p.is_bot) then
    update public.fk_rooms set status = 'abandoned' where id = p_room;
    return;
  end if;

  select p.user_id into v_successor from public.fk_room_players p
    where p.room_id = p_room and not p.is_bot order by p.seat limit 1;
  update public.fk_rooms r set host_id = v_successor,
         host_name = (select p.display_name from public.fk_room_players p
                      where p.room_id = p_room and p.user_id = v_successor)
    where r.id = p_room and r.host_id = v_uid;
end $$;

-- The atomic handover from contract/db.ts. The `host_id = p_previous_host_id`
-- predicate in the UPDATE is the compare-and-swap: two racing survivors cannot
-- both win, and the loser sees ok=false with the winner's id.
create or replace function public.fk_promote_host(
  p_room uuid, p_previous_host_id text
) returns json language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_uid   text := auth.uid()::text;
  v_host  text;
  v_stale boolean;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not exists (select 1 from public.fk_room_players p
                 where p.room_id = p_room and p.user_id = v_uid and not p.is_bot) then
    raise exception 'only a seated player may claim the host' using errcode = '42501';
  end if;

  -- The caller asserts the previous host is gone; verify it rather than trust it.
  select (p.user_id is null or p.connection <> 'online'
          or p.last_seen_at < now() - interval '20 seconds')
    into v_stale
    from public.fk_room_players p
    where p.room_id = p_room and p.user_id = p_previous_host_id;
  if v_stale is null then v_stale := true; end if;  -- previous host already left
  if not v_stale then
    select host_id into v_host from public.fk_rooms where id = p_room;
    return json_build_object('ok', false, 'host_id', v_host, 'seed', null,
      'last_seq', coalesce((select max(seq) from public.fk_commands where room_id = p_room), 0));
  end if;

  update public.fk_rooms r set host_id = v_uid,
         host_name = (select p.display_name from public.fk_room_players p
                      where p.room_id = p_room and p.user_id = v_uid)
    where r.id = p_room and r.host_id = p_previous_host_id
    returning r.host_id into v_host;

  if v_host is null then
    select host_id into v_host from public.fk_rooms where id = p_room;
    return json_build_object('ok', false, 'host_id', v_host, 'seed', null,
      'last_seq', coalesce((select max(seq) from public.fk_commands where room_id = p_room), 0));
  end if;

  return json_build_object(
    'ok', true,
    'host_id', v_host,
    'seed', (select s.seed from public.fk_room_secrets s where s.room_id = p_room),
    'last_seq', coalesce((select max(seq) from public.fk_commands where room_id = p_room), 0)
  );
end $$;

-- ------------------------------------------------------------------ heartbeat

create or replace function public.fk_heartbeat(p_room uuid, p_state fk_connection_state)
returns void language sql security definer
set search_path = public, pg_temp as $$
  update public.fk_room_players
     set last_seen_at = now(), connection = coalesce(p_state, 'online')
   where room_id = p_room and user_id = auth.uid()::text;
$$;

-- ------------------------------------------------------------- RLS + policies

alter table public.fk_rooms         enable row level security;
alter table public.fk_room_secrets  enable row level security;
alter table public.fk_room_players  enable row level security;
alter table public.fk_commands      enable row level security;
alter table public.fk_chat          enable row level security;

-- fk_rooms: the lobby listing. Public to signed-in users on purpose — it is the
-- room list — and it holds nothing private. Writes are host-only.
drop policy if exists fk_rooms_select on public.fk_rooms;
create policy fk_rooms_select on public.fk_rooms
  for select to authenticated using (true);

drop policy if exists fk_rooms_insert on public.fk_rooms;
create policy fk_rooms_insert on public.fk_rooms
  for insert to authenticated with check (host_id = auth.uid()::text);

drop policy if exists fk_rooms_update on public.fk_rooms;
create policy fk_rooms_update on public.fk_rooms
  for update to authenticated
  using (host_id = auth.uid()::text)
  with check (host_id = auth.uid()::text);

drop policy if exists fk_rooms_delete on public.fk_rooms;
create policy fk_rooms_delete on public.fk_rooms
  for delete to authenticated using (host_id = auth.uid()::text);

-- fk_room_secrets: THE SEED. Current host only, for every verb. A seated
-- non-host selecting this table gets zero rows.
drop policy if exists fk_room_secrets_select on public.fk_room_secrets;
create policy fk_room_secrets_select on public.fk_room_secrets
  for select to authenticated using (public.fk_is_host(room_id));

drop policy if exists fk_room_secrets_insert on public.fk_room_secrets;
create policy fk_room_secrets_insert on public.fk_room_secrets
  for insert to authenticated with check (public.fk_is_host(room_id));

drop policy if exists fk_room_secrets_update on public.fk_room_secrets;
create policy fk_room_secrets_update on public.fk_room_secrets
  for update to authenticated
  using (public.fk_is_host(room_id)) with check (public.fk_is_host(room_id));

-- fk_room_players: members see the table; the lobby uses fk_rooms.seated
-- instead, so no membership leak to non-members.
drop policy if exists fk_room_players_select on public.fk_room_players;
create policy fk_room_players_select on public.fk_room_players
  for select to authenticated using (public.fk_is_member(room_id));

drop policy if exists fk_room_players_insert on public.fk_room_players;
create policy fk_room_players_insert on public.fk_room_players
  for insert to authenticated with check (
    (user_id = auth.uid()::text and not is_bot) or public.fk_is_host(room_id)
  );

drop policy if exists fk_room_players_update on public.fk_room_players;
create policy fk_room_players_update on public.fk_room_players
  for update to authenticated
  using (user_id = auth.uid()::text or public.fk_is_host(room_id))
  with check (user_id = auth.uid()::text or public.fk_is_host(room_id));

drop policy if exists fk_room_players_delete on public.fk_room_players;
create policy fk_room_players_delete on public.fk_room_players
  for delete to authenticated
  using (user_id = auth.uid()::text or public.fk_is_host(room_id));

-- fk_commands: THE LOG. Current host only, read and insert. No update or delete
-- policy exists at all, and a trigger refuses them even to the table owner.
drop policy if exists fk_commands_select on public.fk_commands;
create policy fk_commands_select on public.fk_commands
  for select to authenticated using (public.fk_is_host(room_id));

drop policy if exists fk_commands_insert on public.fk_commands;
create policy fk_commands_insert on public.fk_commands
  for insert to authenticated with check (public.fk_is_host(room_id));

-- fk_chat: members only, and you may only speak as yourself.
drop policy if exists fk_chat_select on public.fk_chat;
create policy fk_chat_select on public.fk_chat
  for select to authenticated using (public.fk_is_member(room_id));

drop policy if exists fk_chat_insert on public.fk_chat;
create policy fk_chat_insert on public.fk_chat
  for insert to authenticated
  with check (public.fk_is_member(room_id) and user_id = auth.uid()::text);

-- -------------------------------------------------------------------- grants
-- Table privileges are the gate's hinge, not the gate: RLS above decides rows.
-- Nothing is granted to `anon`; the app signs in anonymously and arrives as
-- `authenticated`.
--
-- The revoke is not paranoia. This project's `alter default privileges` hands
-- anon/authenticated ALL privileges on every new table in `public`, and TRUNCATE
-- is not subject to RLS — so without this, a policy-perfect `fk_commands` would
-- still be truncatable by any visitor with a database connection. Scoped to the
-- five tables this migration created; the project-wide default privileges
-- themselves are left exactly as they were, because the other app depends on them.

revoke all on public.fk_rooms, public.fk_room_secrets, public.fk_room_players,
               public.fk_commands, public.fk_chat
  from public, anon, authenticated;

grant select, insert, update, delete on public.fk_rooms        to authenticated;
grant select, insert, update          on public.fk_room_secrets to authenticated;
grant select, insert, update, delete on public.fk_room_players to authenticated;
grant select, insert                  on public.fk_commands     to authenticated;
grant select, insert                  on public.fk_chat         to authenticated;

-- Same story for functions: Postgres grants EXECUTE to PUBLIC by default, and
-- these are SECURITY DEFINER. Every one of them already refuses a null
-- `auth.uid()`, but an unauthenticated caller should not reach the check at all.
revoke execute on function
  public.fk_is_member(uuid), public.fk_is_host(uuid), public.fk_new_code(),
  public.fk_create_room(text, int, jsonb, text, text, text),
  public.fk_join_room(text, text, text),
  public.fk_update_settings(uuid, jsonb), public.fk_leave_room(uuid),
  public.fk_promote_host(uuid, text),
  public.fk_heartbeat(uuid, fk_connection_state)
  from public, anon;

grant execute on function public.fk_is_member(uuid)        to authenticated;
grant execute on function public.fk_is_host(uuid)          to authenticated;
grant execute on function public.fk_create_room(text, int, jsonb, text, text, text) to authenticated;
grant execute on function public.fk_join_room(text, text, text) to authenticated;
grant execute on function public.fk_update_settings(uuid, jsonb) to authenticated;
grant execute on function public.fk_leave_room(uuid)       to authenticated;
grant execute on function public.fk_promote_host(uuid, text) to authenticated;
grant execute on function public.fk_heartbeat(uuid, fk_connection_state) to authenticated;



-- ------------------------------------------------------------------ realtime
-- postgres_changes on the three tables the shell watches. Deliberately NOT
-- fk_commands and NOT fk_room_secrets: Realtime replays row payloads and there
-- is no reason to put the log or the seed on a socket at all. Game traffic uses
-- Realtime *broadcast* (contract/protocol.ts `channels`), batched as Envelopes.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public'
                     and tablename = 'fk_rooms') then
      alter publication supabase_realtime add table public.fk_rooms;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public'
                     and tablename = 'fk_room_players') then
      alter publication supabase_realtime add table public.fk_room_players;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public'
                     and tablename = 'fk_chat') then
      alter publication supabase_realtime add table public.fk_chat;
    end if;
  end if;
end $$;

alter table public.fk_room_players replica identity full;
alter table public.fk_rooms replica identity full;
