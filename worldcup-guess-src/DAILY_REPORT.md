# Daily Report — spec for Claude

When the user asks for a **daily report** (or "daily message"), follow this file.

## 1. Pull the data

Call the `get_daily_report` RPC. It is `SECURITY DEFINER` and granted to `anon`,
so the publishable key is enough (raw `guesses`/`profiles` are RLS-blocked and
cannot be read directly).

```bash
BASE="https://bgxmcgsfkjhpocptrezi.supabase.co/rest/v1"
KEY="sb_publishable_18hn9O3SKu_Sr1H7RRGVKw_5lnb8UJL"
curl -s "$BASE/rpc/get_daily_report" -X POST \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d '{}'
```

Response shape:

```json
{
  "has_data": true,
  "report_date": "2026-06-12",
  "matches_today": 1,
  "best_today":  { "display_name": "...", "points": 12, "picks": 1 },
  "worst_today": { "display_name": "...", "points": 0,  "picks": 1 },
  "leaders":     [ { "display_name": "...", "total_points": 25 } ],
  "fun_fact":    "... nailed the exact 2–1 scoreline in ..."
}
```

Notes:
- **"Today" = the most recent day that has graded results**, so it advances each
  time results are refreshed. Best/worst are computed over *that day's* matches
  only.
- `leaders` is an array because ties are possible — list all of them.
- If `has_data` is `false`, say no matches have been graded yet.

## 2. Format the message

```
📅 Daily Report — {report_date}

🏆 Today's best guesser: {best_today.display_name} ({best_today.points} pts)
😬 Today's worst guesser: {worst_today.display_name} ({worst_today.points} pts)
👑 Current leader{s}: {leaders joined by ", "} ({total_points} pts)
💡 Fun fact: {fun_fact}

— This is an automated daily message from Claude 🤖
```

Keep it short and friendly. Always end with the automated-message line.

## 3. Where it also shows up

The same RPC powers the dismissible banner at the top of the website
(`DailyReportBanner` in `src/App.jsx`), which reloads whenever a user clicks
**Refresh Results**.
