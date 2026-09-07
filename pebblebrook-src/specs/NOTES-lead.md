# Lead notes (integration)

## Key bindings (final)
- Move WASD/arrows, Shift run, **E interact**, **F follow nearest villager** (toggle), **1–9 hotbar**, mouse wheel cycles hotbar.
- **Space pause**, `-`/`=` slower/faster (speeds 1,2,4,8). UI panels: Tab inspector, V village, B board, G director (D walks right), Esc menu.
- The player module (`src/player`) emits bus `player` and `sfx` events; UI shows `ctx.player.prompt()`.

## Wiring in main.ts
world → local brain → llm brain (fallback local) → sim → director → art → renderer → player → ui. `ui.modal` pauses the world.
Player F-follow: the player module toasts; the renderer's `follow` is set by the UI's Follow button and by main (todo).

## Decisions
- No interiors: buildings are exteriors; "inside" villagers are hidden at the interior anchor. Shops open a panel on entering.
- Player sleeping fast-forwards the sim in 15-minute chunks until 6:00 (villagers simulate through the night).
