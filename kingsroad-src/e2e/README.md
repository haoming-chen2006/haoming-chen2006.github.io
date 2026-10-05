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
node e2e/duel.cjs                # online: two browsers, create room -> invite link -> ready -> start ->
                                 # deploy on both sides -> guest possesses & moves -> lockstep hashes agree ->
                                 # host concedes -> rematch -> guest leaves. Talks to the real Supabase project.
RELAY=1 node e2e/duel.cjs        # the same, forcing the relayed (no-WebRTC) path

The older scripts launch Chromium with SwiftShader flags so WebGL works headlessly (expect ~5-10 fps there).
`duel.cjs` uses `--use-angle=metal` instead, which lets headless Chromium render on the real GPU on a Mac
(~100 fps); set `SWIFTSHADER=1` to force software rendering.
```
