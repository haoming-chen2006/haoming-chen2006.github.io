# Fixtures — recorded from a real engine run

Everything here came out of FreeKill's own Lua engine running in a wasmoon
(Lua 5.4) VM. Nothing is hand-written, nothing is stubbed. Read-only for Phase 1.

Regenerate with `node spike/run-all.mjs && node spike/make-fixtures.mjs`
(~5 min; needs the engine checkout at `FK_ROOT`, default `/Users/haoming/FreeKill`).

Reference game: seed `20260828`, 8 seats, `aaa_role_mode`, standard +
standard_cards + maneuvering. It runs to `GameOver` with
`rebel+rebel_chief+civilian` winning.

| File | What it is | Who needs it |
|---|---|---|
| `envelopes.json` | The reference game as **batched envelopes** for one seat — 337 flushes, 8,084 messages. Matches `contract/protocol.ts#Envelope`. This is the normal replay source. | 2, 3, 4 |
| `seat-command-stream.json` | The same traffic unbatched, one row per message, with CBOR byte sizes. Use for volume work. | 2 |
| `ui-notify-stream.json` | What the **client VM** handed the UI after digesting that stream: 2,286 `notifyUI` calls, 60 of them `UpdateRequestUI`. This is the room's actual render input. | 3 |
| `request-ui-scenes.json` | Every distinct `UpdateRequestUI` diff harvested across 16 games (5 seeds × 3 seats). Parses against `contract/scene.ts#SceneChangeSchema`. | 3 |
| `request-payloads.json` | Sample payloads for each dialog-shaped request command actually reachable in a standard 身份局. | 3 |
| `command-log.json` | Seed + 328 accepted decisions, each with the state digest that followed it. Replaying these from the seed reproduces the game exactly. | 1, 2 |
| `command-log.lua` | The same log as a Lua literal — what the replay harness actually loads. Proof the log is plain data. | 1 |
| `lua-manifest.json` | The Lua bundle description: 299 files, 1.62 MB of source. | 1, 4 |
| `asset-manifest.json` | 818 images and sounds from the three shipped packages, content-hashed. | 3, 4 |
| `measurements.json` | Every number in `findings.md`, machine-readable. | everyone |

## Three things that will bite you if you skip them

1. **Tagged CBOR values are opaque references.** `{"__tag":33002,"value":57}` is
   "the Card with id 57", not data. Resolve it through `LuaClient`. Walking it
   inside a Lua VM expands a 177-byte packet into a 10.7 MB object graph.
2. **`"__bytes:<hex>"` strings are non-UTF-8 payloads** that had to survive a
   JSON hop. They are not text.
3. **`AskForArrangeCards` and `AskForPoxi` have no fixture** because a standard
   身份局 with the standard pack never asks them. They are unexercised, not
   forgotten. See `contract/scene.ts#DIALOG_REQUESTS`.
