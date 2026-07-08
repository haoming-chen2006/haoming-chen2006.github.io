# Wiki Guess (Wikipedia Race)

A multiplayer Wikipedia link-race game. Navigate from a random popular article to another using only in-article links. Play solo or invite friends via a shareable room link.

**Live URL:** `https://haoming-chen2006.github.io/wiki-guess/`

## Features

- Click-only Wikipedia races (no search)
- 5 rounds × 5 minutes each
- Start/end topics from [Wikipedia:Popular pages](https://en.wikipedia.org/wiki/Wikipedia:Popular_pages) (~970 EN articles)
- English / Chinese toggle (switches Wikipedia language)
- Create room → share invite link → see friends' progress in sidebar
- No database — peer-to-peer sync via WebRTC (Trystero)

## Development

```bash
cd wiki-guess-src
npm install
npm run dev          # http://localhost:5173/wiki-guess/
```

## Build & deploy

```bash
npm run build        # outputs to ../wiki-guess/
git add wiki-guess/
git commit -m "Update wiki-guess build"
git push
```

## Refresh topic list

```bash
npm run fetch-topics
```

Fetches article titles from `data/Wikipedia_Popular_pages.md` (snapshot of [Wikipedia:Popular pages](https://en.wikipedia.org/wiki/Wikipedia:Popular_pages)) and resolves Chinese equivalents via Wikimedia langlinks.

## How rooms work

1. **Create Room** — generates an 8-character room code and updates the URL.
2. Share the link with friends (e.g. `?room=abc12345`).
3. Host clicks **Start Game** — round config is broadcast to all peers.
4. Each player's hops, current article, and finish time sync in the sidebar.
5. Host advances rounds; scores accumulate across 5 rounds.

Solo play works without a room code.
