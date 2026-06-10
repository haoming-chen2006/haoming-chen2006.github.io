-- Remove the demo Mexico-opener lock: drop the helper and restore the real
-- guess deadline (kickoff time) for any row the demo function overwrote.

drop function if exists public.refresh_demo_mexico_lock();

update public.matches
set guess_deadline = kickoff_time
where id = 'g-a-1';
