# lunarltk_skins, vendored

`gitee.com/qsgs-fans/lunarltk_skins`, pinned at commit
`86da0c5fc231106032af05eb52963ec32b5b8e95` (2026-09-06, "feat: 皮肤更新").
GPL-3.0; `LICENSE` is the repository's own copy (the GPL-3.0 text with CRLF
line endings, same text as FreeKill's).

This directory is a **build-time data source only**. `../generate.mjs` mounts it
at `packages/lunarltk_skins` beside the shipped bundle, boots the engine, and
freezes `Fk.skin_packages` into `../catalog.generated.ts`. Nothing here reaches
`public/lua-bundle.json`: it is under `src/`, not `packages/`, so neither the
bundle walker nor the glyph harvester (which reads `.lua` only under
`packages/`) ever sees it. See `../index.ts` for the licensing and privacy
position on the artwork the URLs point at, which is not in this repository.

Two files are not upstream's:

- `init.lua` — upstream's, plus one `require` for `compat.lua`.
- `compat.lua` — widens `Package:addSkinPackage` to accept the absolute `url`
  base every call site in this pack passes, which the 0.5.20 core this build
  mirrors does not understand. Its own header says why it lives here rather
  than in the engine mirror.

To update: clone the repository, copy `skin_other.lua`, `skin_van.lua`,
`utility/utility.lua` and `LICENSE` over these, bump the commit above, then
`node src/room/skins/generate.mjs`. `__tests__/catalog.test.ts` fails until the
committed catalog matches.
