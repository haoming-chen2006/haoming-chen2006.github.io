# The hero designer

Make a 三国杀 general — by clicking blocks or by describing it — and have it on
the table a second later, with the engine's own word that its skills fire.

```sh
npm run dev                                   # the game and the designer page
npm run designer -- --key-file ~/x/.env       # the back end, port 5175
```

Then open <http://localhost:5173/freekill/designer.html> — the dev server has a
base of `/freekill/`. Vite proxies `/api` to 5175.

The key file is a dotenv holding `OPENAI_API_KEY=`. It is never guessed: with no
`OPENAI_API_KEY` in the environment you must name the file, with `--key-file` or
`DESIGNER_KEY_FILE`, because there is more than one plausible dotenv on this
machine and they hold different keys. The server prints which path it read and
never the key. Model defaults to `gpt-4.1-mini`; `OPENAI_MODEL` overrides it.
Without a key the server still starts — `validate` and `create` do not need one.

## Why there is a server at all

Because the only way to know whether a generated general works is to boot the
real Lua engine on it and drive its trigger in a scripted room.

Neither of the two ways a designed general fails is visible from the file. A
general carries its skills as STRINGS (`General:addSkill`), so one naming a
skill the engine never registered loads perfectly and prints a skill that does
nothing — which is what `lua/web/roster.lua` exists to catch. And `can_trigger`
REPLACES the engine's default guard rather than extending it
(`skill_skeleton.lua:274`), so one missing clause is a skill that is never
reachable. Both produce a card a player reads and a skill that never happens,
and a player cannot tell.

So `POST /api/designer/create` writes the file, rebuilds the bundle, boots the
engine off disk, and answers four questions in order of how badly each failure
hides:

```
ok   general dsgn_jianbi is registered
ok   it belongs to packages/custom (got custom)
ok   hp 4/4
ok   the general carries dsgn_jianbi_skill
ok   skill dsgn_jianbi_skill resolves to a Skill
ok   roster keeps it in the pool
ok   dsgn_jianbi_skill fired on fk.Damaged (1 times)
```

The last line is the engine's own use history (`events/skill.lua:110`) after the
event was really fired in a real `Room`. The room is upstream's own harness
(`test/lua/lib/fake_backend.lua`), and every question the skill asks is answered
yes — so a green result says "when the player accepts, this fires and its effect
runs", not that a bot would ever choose it.

## Endpoints

| | |
|---|---|
| `POST /api/designer/validate` | `{spec}` → `{ok, errors, lua, warnings}`. Writes nothing. |
| `POST /api/designer/create` | `{spec, image?: {mime, base64}}` → `{ok, general, lua, errors, warnings, test}`. Same id overwrites. |
| `GET /api/designer/heroes` | every hero made so far, with its spec and its last test result |
| `POST /api/designer/chat` | `{messages, spec?}` → `{reply, spec, status, attempts}` |

`chat` is the agent path and it is a loop, not a call: the model answers with a
spec under a JSON schema, and then validate → compile → create → boot runs, and
any failure goes back to the model as the validator's paths, the compiler's
sentence with the engine line number in it, or the probe's own report. Up to
five revisions; it stops only when the general loads and its skill fires.
`status` is `created` or `failed`. Every attempt is written to
`node_modules/.cache/designer/`.

## What a hero touches

```
packages/custom/generals/<id>.lua           the compiled general
packages/custom/specs/<id>.json             the spec, and its last test result
packages/custom/image/generals/<id>.jpg     the portrait, if one was uploaded
public/lua-bundle.json                      rebuilt, so the game sees it
public/asset-manifest.json                  patched, so the portrait resolves
```

Nothing under `../freekill/` (the built site) and nothing in the upstream mirror
is ever written.

The portrait is always saved as `<id>.jpg` whatever was uploaded, because the
manifest key is hardcoded `.jpg` in all four resolvers
(`src/room/assets/assets.ts:47`); `cwebp` reads the format from the bytes, so
`npm run build:assets` re-encodes it correctly regardless. JPEG and PNG only.

`packages/custom` lists its generals with `FileIO.ls` at load, so there is no
manifest to keep in step — drop a file in and rebuild the bundle.

## The supported subset

The compiler emits only what is listed here, and a spec naming anything else is
a compile error naming the block. That is deliberate: half a block is worse than
none, because the failure mode is silent. `SUPPORTED` in
`src/designer/compile/index.ts` is read off the emitter tables, so this list,
the agent's system prompt and the panel cannot drift from what actually compiles.

**Triggers** — `fk.EventPhaseStart` and `fk.EventPhaseEnd` (with a `phase`),
`fk.TurnStart`, `fk.TurnEnd`, `fk.GameStart`, `fk.Damage`, `fk.Damaged`,
`fk.DamageInflicted`, `fk.HpChanged`, `fk.HpRecover`, `fk.EnterDying`,
`fk.CardUsing`, `fk.CardUseFinished`, `fk.TargetSpecified`, `fk.AfterCardsMove`.

**Conditions** — `self-is-subject`, `someone-else-is-subject`, `is-alive`,
`is-wounded`, `is-my-turn`, `is-dying`, `has-handcards`, `has-any-cards`,
`in-phase`, `kingdom-is`, `gender-is`, `hp-compare`, `card-count`, `mark-value`,
`times-used`, `has-source`, `i-am-source`, `i-am-target`, `damage-amount`,
`damage-type-is`, `card-name-is`, `card-type-is`, `move-involves-me`,
`move-reason-is`.

**Actions** — `draw`, `obtain`, `throw`, `recover`, `lose-hp`, `damage`,
`change-max-hp`, `set-mark`, `add-mark`, `change-damage`, `prevent-damage`,
`swap`.

**Costs** (blocks that belong in `cost`, not `actions`) — `ask-yes-no`,
`ask-choose-players`, `ask-cards`, `ask-discard`, and `set-mark` / `add-mark`.

### Not supported yet

Everything else in `vocabulary.generated.json` — around 170 more blocks. The
ones that will be missed first:

- **`active`** — a button the player presses in their own turn. 出牌阶段限一次
  skills are all of this shape and none of them can be built here yet. It is the
  largest single gap.
- **`viewas`** — using one card as another (转化技).
- The declarative kinds: `prohibit`, `targetmod`, `maxcards`, `filter`,
  `distance`, `atkrange`, `invalidity`, `visibility`. These are not triggers at
  all; they are `addEffect("maxcards", …)` with a `correct_func`, and the spec
  shape does not model them.
- `judge`, `pindian`, `view-as`, `to-pile`, `ask-guanxing`, `ask-yiji`,
  `use-card`, `grant-skill`, `move-cards`, `extra-turn`, `extra-phase`, and the
  rest of the tail.
- **Use limits as a declaration.** `max_phase_use_time` and friends
  (`skill_skeleton.lua:97`) are not emitted; "once per turn" is expressible only
  as a `times-used` condition, which is the same rule read a different way but
  does not get the engine's own bookkeeping.
- **Compound conditions.** Conditions are ANDed. There is no OR and no NOT.

## Known limits

- **`fk.GameStart` cannot be driven headlessly.** The harness has a room only
  after the game has started, so a hero whose only trigger is `fk.GameStart`
  gets its loading checked and its firing reported as "not driven" rather than
  as passing. Nothing pretends otherwise.
- **Designed heroes are not in `public/overview.json`.** The reference page is a
  catalogue of what the deployment ships, and `scripts/build.test.ts` asserts
  its per-extension counts to catch a mirrored pack that stopped loading; adding
  designer output there turns "somebody made a hero" into a red test about the
  seven mirrored rosters. The in-room general picker reads the live Lua VM, not
  `overview.json`, so a designed hero IS pickable in a game — which is the path
  that matters. Same reason for `build-skill-catalogue.mjs`, where it is
  stronger still: a vocabulary that counted generals generated from itself would
  be measuring itself. Both call `buildBundle({ designer: false })`.
- **Designed names are not in the font subset.** `scripts/glyphset.mjs` skips
  `packages/custom` because its Han is unbounded — any character could turn up
  in a name typed this morning. Browsers fall back per character, so such a name
  renders in `PingFang SC` rather than as tofu; it is a slight inconsistency,
  not a broken glyph.
- **The lobby has no toggle for the `custom` pack.** The pack checkboxes are
  built from `overview.json`, which designed heroes are deliberately absent
  from, so `custom` is always on and cannot be switched off from the lobby. It
  is on by default either way (`disabledPack` starts empty,
  `src/shell/pages/Lobby.tsx:25`).
- **A designed hero ships if it is on disk when you deploy.** The bundle walker
  reads `packages/custom/generals/` off the machine that runs `npm run deploy`,
  so whatever is there goes into `public/lua-bundle.json` and onto the live
  table — untracked in git, but not absent from the build. That is the intended
  way to put one in front of your friends: design it, `npm run deploy`, commit,
  push. Delete the `.lua` (or move it aside) before deploying if it is not
  ready. `git merge` of this branch alone adds nothing, because nothing under
  `generals/` is tracked.
- **`designer.html` ships in the build but only works in dev**, because its API
  is on localhost. It is in the build so that it is type-checked and bundled by
  the thing that actually publishes. On the published site every call answers
  with GitHub Pages' 404 page, which `ui/api.ts` turns into the instruction to
  run `npm run dev` and `npm run designer` locally.
