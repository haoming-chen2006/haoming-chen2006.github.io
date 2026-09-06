# Browser play-tests

Scripted Playwright sessions that drive the real game in headless Chromium, take screenshots into
`e2e/shots/`, and fail on any page error.

Playwright is deliberately not a project dependency. To run them:

```sh
npm run dev                      # in one terminal
npx --yes playwright@1.62.1 install chromium   # once
npm i --no-save playwright@1.62.1
node e2e/smoke.cjs               # menus, deck builder, deploy, invalid deploy, pause
node e2e/possession.cjs          # deploy -> possess -> WASD across the bridge -> ability -> summon -> death
node e2e/full_match.cjs          # a whole match to the results screen, Play Again, portrait layout
PRESET=Vanguard PREFER=Sharpshooter node e2e/possession3d.cjs   # 3D: menu, thumbnails, commander view, first/third person

The scripts launch Chromium with SwiftShader flags so WebGL works headlessly (expect ~10 fps there).
```
