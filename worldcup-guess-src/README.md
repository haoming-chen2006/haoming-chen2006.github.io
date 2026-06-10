# World Cup 2026 Prediction

React/Vite app for a private World Cup 2026 prediction game with Supabase auth, per-user match guesses, tournament futures, group ranking, bracket prediction, and leaderboard scoring rules.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the URL Vite prints, usually:

```text
http://localhost:5173/worldcup-guess/
```

If that port is busy, Vite may print `5174` or another nearby port.

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Replace the values with your project URL and publishable key:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
```

4. Run the schema migrations in order:

```text
supabase/migrations/001_worldcup_guess_schema.sql
supabase/migrations/002_guess_deadline.sql
supabase/migrations/003_results_sync_and_grading.sql
```

5. Run the seed data in:

```text
supabase/seed.sql
```

The schema creates:

- `profiles`
- `matches`
- `players`
- `guesses`
- `player_artifacts`
- `prediction_states`

It also enables RLS, creates per-user write policies, blocks late match guesses via `guess_deadline` (defaults to kickoff), and creates profiles automatically when users sign up.

Migration `002_guess_deadline.sql` adds a separate guess lock deadline and a `refresh_demo_mexico_lock()` RPC. The app calls this on load so the Mexico opener (`g-a-1`) locks 2 minutes after each page visit — useful for testing the live lock UI and backend enforcement.

Migration `003_results_sync_and_grading.sql` adds result sync columns, auto-grading RPCs, prediction distribution queries, and the `sync_unmatched` audit table.

## Refresh Results (Edge Function)

All openfootball fetching and grading runs server-side via the `refresh-results` Edge Function.

### Deploy the function

```bash
cd worldcup-guess-src
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy refresh-results
```

The function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically in the Supabase runtime.

### Run manually

- Click **Refresh Results** in the app header, or
- `curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/refresh-results" -H "Authorization: Bearer YOUR_ANON_KEY"`

### Schedule (optional)

In Supabase Dashboard → **Database → Extensions**, enable `pg_cron`, then in SQL Editor:

```sql
select cron.schedule(
  'refresh-worldcup-results',
  '0 */6 * * *',  -- every 6 hours
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/refresh-results',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Or use Supabase **Cron** (Dashboard → Integrations → Cron) to hit the function URL on a schedule.

### Match identity

Incoming openfootball rows are matched to `matches` rows by:

1. Stored `openfootball_key` (`date|ground|time`)
2. Knockout `num` → `match_number`
3. Fallback: `date` + normalized team pair (via `TEAM_ALIASES` in the edge function)
4. Unmatched rows go to `sync_unmatched` — never silently mis-assigned

## Auth Redirects

In Supabase Auth settings, add your local and deployed URLs as allowed redirect URLs:

```text
http://localhost:5173/worldcup-guess/
http://localhost:5174/worldcup-guess/
https://YOUR-USERNAME.github.io/worldcup-guess/
```

For this hosted version, the deployed URL is:

```text
https://haoming-chen2006.github.io/worldcup-guess/
```

## Deploy

This source project builds to `../worldcup-guess/`, which is the static folder served by the GitHub Pages repo.

```bash
npm run build
```

Commit and push the generated `worldcup-guess/` folder to a GitHub Pages-enabled repo.

## Separate Repo

The source copy for people who want to host their own version lives at:

```text
https://github.com/haoming-chen2006/worldcup_prediction
```

