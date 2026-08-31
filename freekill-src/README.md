# FreeKill Web

新月杀 in a browser tab. Open a link, type a name, play — no client to install, no
extension packages to keep byte-identical, no server address to type.

Source lives here (`freekill-src/`); the build writes into `../freekill/`, which is what
GitHub Pages serves at <https://haoming-chen2006.github.io/freekill/>. Same convention as
`worldcup-guess-src/` → `worldcup-guess/` in this repo: the built output is committed, and
it is the deployment.

## Build and publish

One command:

```sh
npm install
npm run deploy
```

`deploy` builds every artifact, writes `../freekill/`, verifies the result, and prints the
`git` lines to run. **It never commits and never pushes.** Publishing is:

```sh
git -C ~/haoming-chen2006.github.io add freekill freekill-src
git -C ~/haoming-chen2006.github.io commit -m "freekill: publish"
git -C ~/haoming-chen2006.github.io push
```

### Requirements

| | |
|---|---|
| Node | 22+ (the build imports the engine lane's TypeScript directly, using node's type stripping) |
| The engine tree | a FreeKill checkout at `/Users/haoming/FreeKill`, or `FK_ROOT=/path/to/FreeKill` |
| `cwebp` | `brew install webp` — every raster is re-encoded to WebP |
| `uv` | only for `npm run build:fonts`, which is not part of a normal build |
| Chrome | only for `npm run smoke` / `npm run measure` |

The FreeKill checkout is read, never written. Every web-specific adaptation lives in this
directory; nothing is edited in place under `~/FreeKill/lua`, which keeps that fork clean to
merge from upstream.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server. Regenerates nothing — run `npm run build:data` first if `public/` is empty |
| `npm run build` | `build:data` then `vite build` into `../freekill/` |
| `npm run build:data` | lua bundle → assets → fonts → overview |
| `npm run build:lua` | `public/lua-bundle.json` + `lua-manifest.json` — the whole rules tree as `path → source` |
| `npm run build:assets` | Walks the three v1 packages and `image/`, re-encodes to WebP, content-hashes, writes `asset-manifest.json` |
| `npm run build:fonts` | Subsets the OFL CJK face to the glyphs the game uses and emits woff2 + license |
| `npm run build:overview` | Boots the real client VM in node and freezes the generals / cards / modes data |
| `npm run deploy` | build + verify + tell you what to commit |
| `npm run verify` | Checks a built dist without rebuilding it |
| `npm test` | Contract tests plus the build's own checks |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run preview` | Serves `../freekill/` at <http://127.0.0.1:4173/freekill/> |
| `npm run smoke` | Walks URL → name → lobby → room → join link → overview in headless Chrome |
| `npm run measure` | Cold-load timing and bytes, cache disabled. `--throttle=5` for 5 Mbps |

## Supabase

One shared hosted project — the same one `worldcup-guess` uses. **There is no local
Supabase and no Docker**; migrations are applied against the hosted project directly.

```sh
cp .env.example .env      # optional; the fallbacks below are compiled in
```

```
VITE_SUPABASE_URL=https://bgxmcgsfkjhpocptrezi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_18hn9O3SKu_Sr1H7RRGVKw_5lnb8UJL
```

Both have inline fallbacks in the client, exactly as in
`worldcup-guess-src/src/supabaseClient.js`, so a clean clone runs with no `.env` at all.
Every FreeKill table is prefixed `fk_` so the two apps cannot collide in the shared schema.
Anonymous sign-in is enabled: a display name and an avatar is the entire login.

The schema, the Realtime channels and the host-only command log belong to `src/net/`. Until
that module exists the shell runs on a local implementation backed by `localStorage` and a
`BroadcastChannel` — two tabs on one machine really do see each other's rooms — and the
lobby says "本机模式" out loud so nobody mistakes it for the real thing.

## What ships, and what does not

Measured in `specs/001-freekill-web/assets-findings.md` and enforced by `npm test`.

**Ships:** 313 images (2.69 MB → 0.98 MB as WebP) — card art, the 25 general portraits,
card / seat / button chrome, emoji, backgrounds. 302 Lua files (1.58 MB, ~400 KB over the
wire gzipped). One 333 KB font subset.

**Does not ship, deliberately:**

- `image/symbolic` — 633 GNOME Adwaita SVGs of which about fifteen were ever referenced.
- All `image/anim` sequences — 22 card-use sprite sets, 15.6 MB, purely decorative.
  `node scripts/build-assets.mjs --anim` puts them back.
- All audio — 236 files, 7.27 MB. The engine emits sound as a fire-and-forget
  `PlaySkillSound` notification, so a client that ignores it diverges in nothing the rules
  observe. `--audio` puts it back, but note the provenance of the voice lines is
  unestablished (assets-findings §2).
- The three bundled TTFs. See below.

### Fonts — a licensing decision, not a size one

`FZLBGBK` (方正隶变_GBK) and `FZLE` (方正隶二简体) are Founder Corporation retail faces;
`simli` is Stone Co.'s SimLi. None carries a license grant, and a repository-level GPLv3
cannot relicense a third party's work. **Subsetting does not cure this** — a subset is a
derivative and inherits the same restriction. `simli.ttf` is referenced by no QML binding at
all, so it is dropped rather than replaced.

The build ships **霞鹜文楷 LXGW WenKai** (OFL 1.1), subset to the 1,443 Han the game actually
uses: 333 KB against the 25.84 MB the Qt client carries. `public/fonts/` holds the woff2 and
its OFL text, and both are committed, because rebuilding them needs `uv`, `fonttools` and a
download.

To try another face:

```sh
FK_FONT=notoserifsc npm run build:fonts && npm run build
# lxgwwenkai · notoserifsc · notosanssc · zhuquefangsong · mashanzheng · zcoolxiaowei
```

`build:fonts` refuses to ship a primary face missing Han the game uses, and prints which
ones. That is not hypothetical: Ma Shan Zheng and ZCOOL XiaoWei are both missing 惇 (夏侯惇)
and 骍 (紫骍), the same eight glyphs the original LiShu face was missing; Zhuque Fangsong has
no card suits.

A static subset cannot cover player names or chat, so the CSS falls back to
`PingFang SC → Hiragino Sans GB → Microsoft YaHei → Noto Sans CJK SC`.

## Layout

```
freekill-src/
  index.html            font-face, splash, the page before React
  src/
    main.tsx            entry: load manifests, then mount the app
    shell/              routing, sign-in, lobby, waiting room, overview  (Agent 4)
      api/              the LobbyApi seam: local now, src/net later
      boot.ts           load order — manifests gate first paint, the Lua bundle does not
      engineClient.ts   adapts the engine lane's pull-shaped client to contract/engine.ts
    contract/           the frozen seam. Nobody edits this after Phase 0
    engine/  worker/    Lua VMs, host worker, determinism            (Agent 1)
    net/                Supabase schema, auth, Realtime, command log  (Agent 2)
    room/               the table: seats, hands, scene renderer       (Agent 3)
  lua/web/              web-only Lua overlay, mounted at lua/web/ in the VM
  scripts/              the build. Every artifact under public/ comes from here
  fixtures/             recorded command streams and payloads. Read-only
  public/               build output the app fetches at runtime
```

Routing is hash-based (`#/lobby`, `#/room/:id`, `#/join/ABCD`) because a join link has to
survive being pasted into a group chat, and history routing on a Pages subpath needs a
404.html rewrite that breaks the moment the path moves.

## Load order, and why the lobby is fast

`main.tsx` awaits three small manifests — assets, Lua, overview: tens of KB — and paints. The
1.5 MB Lua bundle is prefetched behind the lobby and only awaited when a game actually
starts. Measured cold, cache disabled, on the preview server:

```
first paint         230 ms
lobby interactive   353 ms
transferred         918 KB over 15 requests   (incl. the background Lua bundle)
```

Against the spec's "playable lobby in under 10 seconds". Re-measure any time with
`npm run measure`, or `npm run measure -- --throttle=5` for a 5 Mbps line.
