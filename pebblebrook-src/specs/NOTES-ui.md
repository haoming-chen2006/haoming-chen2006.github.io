# NOTES — ui (Agent D)

`src/ui/` is the whole DOM layer. Entry: `createUi(ctx: UiContext): Ui & UiExtras` in `src/ui/index.ts`
(`UiExtras` adds `panels.open/close/isOpen/openIds` for play-tests and the `__pb` hook; `Ui` callers can ignore it).
Everything renders into `#ui` (created if missing). Styles: `src/ui/ui.css` (imported by index.ts; every class is `pb-`).
`npm run check` is clean for `src/ui` (other modules currently have their own errors: `src/art/catalogue.ts`, `src/sim/tools/*`).

## Files
| file | what |
|---|---|
| `index.ts` | `createUi`: panel manager (stack, z-order, dim layer, `modal`), keyboard, bus subscriptions, portrait/icon caches, settings |
| `shared.ts` | `UiCore` (what panels get), `Panel` interface, mood words, need labels, name matcher, affinity colours, `simFn` runtime probe |
| `dom.ts` | `h()` builder, `setText/setClass/setStyle` diff helpers, `Throttle`, inline pixel SVG icons, `guardTextField`, `download` |
| `panels/frame.ts` | framed window (wood head with key hint + close, parchment body, optional foot) |
| `panels/hud.ts` | clock/date/season/weather, money, speed, panel buttons, ticker, hotbar, E-prompt, toasts |
| `panels/title.ts` | title screen + roster window |
| `panels/howto.ts`, `settings.ts`, `menu.ts` | how-to, settings (audio/quality/typewriter + AI brains), Esc menu |
| `panels/dialogue.ts` | talk box: typewriter, intents (1–9), gift/about pickers, free text when a provider is set, hearts + affinity meter |
| `panels/inspector.ts` | side panel: needs, action+thought, plan, goals, relationships (+hover notes), memory stream (filter/search), skills, pockets |
| `panels/village.ts` | who-is-where table, storyboard (importance slider, names highlighted+clickable), relationship web (SVG) |
| `panels/board.ts` | requests: accept/complete/do-it-now, post form |
| `panels/shop.ts` | buy/sell tabs, qty stepper, money check |
| `panels/director.ts` | events + Fire, happening now, forecast, time controls, weather override, per-villager brains, chronicle export |
| `panels/hover.ts` | hover card from `renderer.pick()`; click on a villager opens the inspector |
| `mock.ts` | fake `UiContext` (sim/world/director/renderer/art/audio/input/player) with 10 villagers, memories, chronicle, shops, requests |
| `preview.ts` + `public/ui-preview.html` | standalone page; `window.__pbui` exposes `show(panel)`, `press(code)`, `night()`, `rain()`, `toast()`, `happen()`, `llm(on)`, `hover(id)` |
| `e2e/ui-shots.cjs` | Playwright: exercises every panel at 1280×800 (full flow) and 1920×1080, writes `e2e/shots/ui/*.png`, fails on page errors |

## Run / test
- Dev server: `npm run dev` (5190). Preview: `http://localhost:5190/pebblebrook/ui-preview.html` (add `?bar=0` to hide the dev bar).
- Shots: `node e2e/ui-shots.cjs` → `e2e/shots/ui/1280-*.png` (full interaction flow), `1920-*.png` (layout). `ONLY=1280` / `ONLY=1920` runs one size. Prints the open-panel stack after every shot; fails on page errors or if the page reloads mid-run. Last run: 47 shots, 0 errors.
- The preview accepts `?nohmr=1` (the shot script passes it) which blocks Vite's full reload / hot update on that page. Needed because the dev server is shared: whenever another agent saves a file under `src/core`, Vite would otherwise reload the preview mid-test (that was the cause of an intermittent 'title screen reappeared' / 'modal still open' result, not the UI).
- In the real game: `window.__pb.ui.panels.open('village')` etc.

## Behaviour contract (what main.ts / other modules can rely on)
- **Modal** (`ui.modal === true`, world paused by main loop): title, menu, settings, howto, roster, dialogue, shop, board. Non-modal: inspector, village, director, HUD.
- **Title** shows on the first `createUi` only (module flag). After `newGame`/`load` re-boot the new UI starts in-game (main.ts calls `ui.showTitle(false)` on the old one; that is fine). `createUi` disposes any previous instance (listeners, bus subs, DOM).
- **Keys** (window `keydown`, bubble phase; ignored when `ctx.input.typing` or focus is in a text field; text fields stop propagation of key events):
  `Esc` close top panel / open menu · `Tab` inspector (cycles villagers; `Shift+Tab` back) · `V` village · `B` board · `D` director · `Space` pause · `-`/`=` speed 1→2→4→8 · `1–9` intents inside the dialogue.
  Digits outside the dialogue are left to the player module (hotbar). `E`/`F`/WASD are not touched.
  → **The player module should not also bind Tab/V/B/D/Esc/Space/-/=**, or they will double-toggle.
- Speed/pause are written straight to `ctx.world.speed` / `ctx.world.paused` (the World interface exposes both).
- `openInspector(null)` = open on the villager you are talking to (or the first) / cycle if already open. `openInspector(v)` opens on `v`.
- `openDialogue(v)` calls `sim.playerTalk(v, 'greet')` immediately; closing calls `sim.endPlayerConversation()`.
- Hotbar click sets `sim.player.hotbar`. Clicking a villager (via `renderer.pick` + `input.clicked`) opens the inspector.
- Settings persist in `localStorage['pebblebrook.settings.v1']` (`{music, sfx, quality, typewriter}`) and are applied on boot via `audio.setVolume` and `renderer.setQuality`. LLM settings go through `ctx.setLlm/getLlm` only.
- "Continue" / "Load" are shown when any `localStorage` key starts with `pebblebrook.save`.

## Bus events consumed
`toast` → toast · `chronicle` (importance ≥ 3) → top ticker · `event` start/end → toast · `request` posted by a villager → toast ·
`weather` → toast · `newday` → toast · `relationship` with the player (|delta| ≥ 3, dialogue closed) → toast; inside the dialogue it animates the hearts.
Emitted by the UI (only in the fallbacks below): `request` accepted/done, `player` buy/sell, `sfx` coin.

## Dialogue intents sent to `sim.playerTalk(v, intent, line?)`
`greet` (on open) · `day` · `gossip` · `help` · `joke` · `compliment` · `about` (line = other villager's **id**) · `chat` (line = typed text; only offered when `getLlm().provider !== 'none'`) · `goodbye`.
Gifts go through `sim.playerGift(v, itemId)` (reaction shown as the villager's line). Trade opens the shop for `world.place(v.workplace)` when that place is `kind: 'shop'` or `shopStock(place)` is non-empty.
A turn with `end: true` (or the goodbye intent) closes the box ~1.6 s after the line finishes typing. A rejected promise shows "…" and a warning toast.

## Sim helpers used (now part of the `Sim` contract, added by Agent B) and what is still probed at runtime
Called directly: `playerBuy(place, id, qty) → {ok, message, cost}`, `playerSell(place, id, qty) → {ok, message, earned}`,
`playerAcceptRequest(id) → boolean`, `playerCompleteRequest(id) → {ok, message}`. The UI shows `message` in a toast when `ok` is false
and never touches `player.money` / inventory / request state itself. `Request.expired` (or `expiresAt` passed) shows as an "expired" chip.
Still probed with `typeof … === 'function'` (fallback in brackets):
| wanted | fallback |
|---|---|
| `sim.sellPriceOf(id, place)` — for the price shown in the Sell tab before selling | `floor(priceOf(id, place) * 0.6)`; the toast always shows the real `earned` |
| `sim.skipMinutes(minutes)` or `director.skip(minutes)` | Director "Next morning" / "+1 hour" run `sim.update(5)` + `director.update(5)` in a loop for at most 4 s |
| `director.setWeather(kind)` or `world.setWeather(kind)` | writes `world.weather.kind` directly and warns that the world may change it back |

## What I need from the art module (Agent C)
`art.character(look, profession).portrait` — a 32×32 canvas (the UI draws it at 2–3×, `image-rendering: pixelated`), cached per villager id and for `'player'` via `ctx.player.look`.
`art.icon('item', id, 32)` and `art.icon('weather', kind, 24)` — canvases, converted once to data URLs and cached. A season icon is drawn by the UI itself (inline SVG).

## DOM hooks (ids/classes other agents or tests can use)
Root `#ui`. HUD `#pb-hud` (`#pb-clock`, `#pb-money`, `#pb-topright`, `#pb-ticker`, `#pb-hotbar` with `.pb-slot.sel`, `#pb-prompt`, `#pb-toasts`, `.pb-toast.(good|warn)`), hover `#pb-hover`, dim `#pb-dim`.
Windows `#pb-<panel>`: `title`, `roster`, `howto`, `settings` (`#pb-llm-provider`, `#pb-llm-key`, `#pb-llm-model`, `#pb-llm-mode`, `#pb-settings-apply`), `menu` (`#pb-resume`), `dialogue` (`button[data-intent=…]`, `#pb-chat`, `.picker .pb-card`), `inspector` (`.memtools button[data-kind]`, `.rel`, `.mem .m`), `village` (`.pb-tab`, `.pb-story .e`, `.pb-web .node`), `board` (`.pb-req`), `shop` (`.it`, `.qty input`), `director` (`.ev button`).
Title screen `#pb-title` with `#pb-seed`, `#pb-new`, `#pb-continue`.

## Style
Palette in `#ui` custom properties: wood `#6b4a2b` / dark `#3e2a17` / light `#a67c52`, parchment `#f3e6c8`, ink `#2b2118`, gold `#e2b350`; green/red/blue/love only for meaning (bars, chips, toasts). 8 px rhythm, notched "pixel" corners via `clip-path`, hard inset bevels instead of soft shadows, body font Verdana 13 px, display font Arial Rounded / Nunito / Trebuchet. Bars animate in `steps()` so motion stays chunky. Panels respond down to ~1100 px (inspector narrows, HUD labels collapse).

## Performance
No per-frame DOM rebuilds: HUD text at 10 Hz, hotbar 4 Hz, inspector 4 Hz (relationship list ≤ 1 Hz, memory list ≤ 2 Hz, both keyed so they rebuild only when content changes), village table 4 Hz, web edges 1 Hz, board/shop/director 2 Hz. Only open panels tick. Text/width/class writes are diffed.

## Open questions / not done
- Gamepad: none (by brief). Touch: untested.
- The relationship web places villagers on a circle; no force layout (10 nodes do not need one).
- Chronicle export uses `<a download>`; the textarea + Copy button covers sandboxes where downloads are blocked.
- The board's "Do it now" (accept + complete in one click) only appears for requests with no item needs.
- If the sim ends up with more than 10 villagers (newcomer event) the table/web/name matcher rebuild themselves; the title cast row is built on show.
