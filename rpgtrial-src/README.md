# Hollowmere — a D&D prologue

A browser action-RPG prologue: Baldur's Gate 3 rules and setting (D&D 5e dice, classes, skill checks,
dialogue with rolls, rests, level-ups) with Elden Ring / Witcher third-person controls, built with
TypeScript, three.js, pmndrs postprocessing and N8AO. Play it at
https://haoming-chen2006.github.io/rpgtrial/

## Running it

```sh
npm install
npm run dev        # http://127.0.0.1:5180/rpgtrial/
npm run build      # production build in dist/
npm run check      # tsc --noEmit
npm test           # headless rules/combat/quest tests (Node, no browser)
scripts/deploy.sh  # stage build + source into the GitHub Pages repo (no commit)
```

Playwright screenshot harness (uses the scratchpad Playwright install):
`node e2e/shot.cjs wait:1500 shot:name key:KeyW:1000 eval:'window.__hm.cam.yaw=1'`.

## Controls

| Action | Key |
| --- | --- |
| Move / camera | WASD / mouse (click the game to capture the mouse), scroll to zoom |
| Sprint / walk | Shift (hold) / Alt (hold) |
| Dodge roll | Space |
| Jump | Ctrl or F |
| Light / heavy attack | Left mouse / right mouse (hold right for a charged heavy) |
| Block / parry | Q (hold; parry in the first 0.2 s) |
| Lock-on | Tab or middle mouse (scroll to switch) |
| Interact | E |
| Abilities / spells | 1–6 |
| Potion | R |
| Inventory / character / journal / map | I / C / J / M |
| Pause / settings | Esc |

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md). `src/sim` is a deterministic, headless simulation
(D&D rules, combat, AI, quests) that never imports three.js; `src/render`, `src/ui`, `src/audio`
subscribe to its typed event bus.

## Credits (all CC0 unless noted)

- Characters, weapons and dungeon kit: [KayKit](https://kaylousberg.com) — Adventurers, Skeletons, Dungeon Remastered.
- Environment models, PBR textures and HDRIs: [Poly Haven](https://polyhaven.com).
- Audio: see `public/assets/audio/CREDITS.txt`.
- Fonts: Cinzel, EB Garamond (SIL OFL).
