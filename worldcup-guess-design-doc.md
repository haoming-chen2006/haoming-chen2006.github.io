# World Cup 2026 Guess Registration — Design Doc

## Overview

A simple, interactive website where users register predictions for the 2026 FIFA World Cup. Upper nav bar with four main sections: **Guess**, **Overall Schedule**, **Leaderboard**, **Personal Info**.

The site follows a simple and interactive design philosophy.

## Architecture & Integration

- **Backend:** Supabase — Postgres + Auth + Row Level Security.
  - Project URL: `https://bgxmcgsfkjhpocptrezi.supabase.co`
  - CLI setup:
    ```
    supabase login
    supabase init
    supabase link --project-ref bgxmcgsfkjhpocptrezi
    ```
  - Publishable key: `sb_publishable_18hn9O3SKu_Sr1H7RRGVKw_5lnb8UJL`
  - Direct connection string: `postgresql://postgres:[YOUR-PASSWORD]@db.bgxmcgsfkjhpocptrezi.supabase.co:5432/postgres`
- **Frontend:** React (Vite) + Supabase JS client. Easiest path for the four-component structure.
- **Hosting:** Free GitHub Pages — no purchase needed. Deploy the static build to a repo and it's served at `https://<username>.github.io/<repo>/`. HTTPS is included automatically. (Supabase's free tier covers the backend, so total hosting cost is $0.)
  - Build with Vite, set `base: '/<repo>/'` in `vite.config.js` so asset paths resolve under the repo subpath, and push the build via GitHub Actions or the `gh-pages` branch.
- **Integration / how disconnected it is:** Fully disconnected isn't required — the goal is just to make the link *hard to notice*. The app lives at its own GitHub Pages URL with no visible navigation back to the main site and no link from the main site's menus. It's reachable only by someone who has the direct URL. This is "soft-disconnected": discoverable in principle, but not surfaced anywhere.
  - Because it's a separate `github.io` origin, it shares nothing with the main site automatically (no cookies, no session) — so it stays cleanly separate without any extra work.
  - To keep it low-profile: don't add it to sitemaps or the main nav, and optionally add a `<meta name="robots" content="noindex">` so search engines don't surface it.

## Backend Philosophy

The World Cup has **104 games**, so we create a total of **104 match artifacts**: **72 of them are group-stage matches** (12 groups × 6 matches each, already determined after the Dec 5 draw), and **32 are knockout matches** that are revealed progressively as the tournament unfolds (Round of 32 → Round of 16 → Quarterfinals → Semifinals → 3rd-place + Final).

These match artifacts are the ultimate source of truth throughout the app, displayed across the four web components. Each match artifact has the following states:

- **`not_out`** — match not decided yet (knockout slot, sides unknown), artifact empty
- **`out_not_guessed`** — artifact out (both sides confirmed), user hasn't entered a guess yet
- **`out_and_guessed`** — artifact out, user has entered a guess
- **`backlogged`** — guessed + time passed (game has begun; artifact is locked and the user cannot guess anymore)

> **State semantics:** state is *computed per-user*, not stored as a single global field, because `out_and_guessed` vs `out_not_guessed` differs by user. Store the objective facts on the match (`sides_confirmed`, `kickoff_time`) and each user's guess separately; derive the four states at read time. `backlogged = now >= kickoff_time`.

There is also a **player artifact** for each player. These are used for the following tournament-long guesses, which get backlogged once the World Cup starts: champion team, top 4 teams, top scorer, top assister, best player (Golden Ball), best young player.

### How to get initial match data

Recommended approach, in order:

1. **Seed group matches once from a static source.** The 72 group matches are fixed (teams, dates, venues known now). Pull them once from the **openfootball/world-cup** GitHub repo (JSON/CSV, no key, public domain) and seed the `matches` table. No live-API dependency for the bulk of the data.
2. **Seed the 32 knockout matches now as `not_out` placeholders**, with round + bracket-position metadata (e.g. "Winner Group A", "R32-1"). Populate real teams as groups conclude. A daily Supabase cron / Edge Function during the tournament flips placeholders to real teams.
3. **Ingest live results for scoring** via a free sports API such as **football-data.org** (free tier) or API-Football. Only *results* are needed, not fixtures, so call volume is low. A daily cron job writes actual outcomes into the match artifacts.

Practical recommendation: **openfootball for fixtures (seed), football-data.org for results (cron).** Keep an `actual_result` column that stays null until the real score is ingested.

## Data Model (sketch)

```
matches
  id, round ('group'|'r32'|'r16'|'qf'|'sf'|'third'|'final'),
  group_label (nullable, 'A'..'L'), bracket_pos,
  team_home (nullable), team_away (nullable),
  sides_confirmed bool, kickoff_time timestamptz,
  actual_home_score, actual_away_score, actual_winner

guesses                          -- per match, per user
  id, user_id, match_id,
  pred_home_score, pred_away_score, pred_winner,
  created_at, locked bool

player_artifacts                 -- tournament-long predictions
  id, user_id,
  champion_team, top4_teams[], top_scorer, top_assister,
  best_player, best_young_player, locked bool

profiles                         -- 1:1 with auth.users
  user_id, display_name, total_points
```

Lock with RLS + a check: reject any insert/update on a guess whose match `kickoff_time <= now()` (or `locked = true`).

## Two Layers of the Web App

1. Game layer
2. User layer

### Game Layer

#### 1. Guess Game

The source of truth for entering guesses. Displays all upcoming matches with both sides confirmed, ordered by time, color-coded per match:

- `backlogged` → **dark**
- `not_out` → **grey**
- `out_not_guessed` → **orange**
- `out_and_guessed` → **green**

The user inputs a guess and it is saved in the backend. Enforce the rules: no backlogged guesses, no `not_out` guesses (the user cannot edit locked or undecided matches).

**Minority-bonus notification:** when a user is entering a guess, the UI proactively notifies them that they will earn **extra points if they guess with the minority** — i.e. if their (correct) pick is one that few other users chose. This nudge is shown inline on the guess input (e.g. a small badge or tooltip: *"Pick an underdog — correct minority guesses earn a bonus"*). Where the live guess distribution is available pre-lock, the UI can hint at how contrarian the current pick is (e.g. "Only 12% of users picked this").

#### 2. Overall Fixture

First fetches and populates the user's existing records entered through the Guess Game and stored in the backend (backlogged guesses are shown read-only and cannot be changed).

Displays the **12 groups** in tabular format. Below (scrollable), displays the knockout matches in a **bracket/tree format up to the champion**, and allows the user to input guesses that **auto-propagate** up toward the champion depending on input.

> The bracket and the Guess Game write to the **same** `guesses` table — they are two views over one source of truth. Auto-propagation: picking a R32 winner pre-fills that team into the corresponding R16 slot, and so on. Note that downstream propagated picks become invalid if the user changes an upstream pick — recompute the affected branch and clear contradicted downstream guesses.

#### 3. Leaderboard

User leaderboard with the scoring scheme below.

**Base scoring** (rewards outcome + exact-score precision, scaling up with stakes):

| Round | Correct outcome (winner / advancer) | Exact score bonus |
|---|---|---|
| Group match | 3 | +2 |
| Round of 32 | 5 | +3 |
| Round of 16 | 8 | +4 |
| Quarterfinal | 13 | +5 |
| Semifinal | 21 | +8 |
| Final | 34 | +13 |

(Fibonacci-ish growth keeps later rounds decisive without being runaway.)

**Knockout "correct match" nuance:** in knockouts, "correct" means the user predicted the right *advancing team*. Award outcome points if the picked winner actually advanced, separate from the exact-score bonus. Optionally give partial "team reached this round" credit so a single early miss doesn't zero out an entire bracket.

**Minority bonus:** after a match locks, compute the distribution of all users' guesses for that match. If a user's correct pick was held by fewer than a threshold (e.g. ≤ 20%) of users, multiply that match's earned points (e.g. 1.5×) or add a flat contrarian bonus. This rewards correctly calling upsets and is the bonus surfaced to users in the Guess Game notification above. Implement as a post-match batch job once `actual_result` lands, since it depends on the full guess pool.

**Player artifact guesses** (locked at tournament start, scored at the end):

| Prediction | Points |
|---|---|
| Champion team | 30 |
| Top 4 teams (correct set) | 5 each, +10 if all 4 correct |
| Top scorer | 15 |
| Top assister | 15 |
| Best player (Golden Ball) | 15 |
| Best young player | 10 |

Minority bonus can apply here too (correctly calling a dark-horse champion should pay off).

#### 4. Personal Info

Displays the user's past guesses and the points earned from each.

## Open Questions Before Build

1. Are score predictions required for every match, or is winner-only allowed (simpler UX, fewer exact-score bonuses)?
2. Single global leaderboard, or private leagues among friend groups?
3. Do you want extra-time/penalties handled, or score-at-90-minutes only for knockout exact-score scoring?
