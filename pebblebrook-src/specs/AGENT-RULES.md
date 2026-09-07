# Rules for every agent

1. Read `specs/DESIGN.md` and everything under `src/core/` first. They are the contract.
2. You own ONE module directory (named in your brief). Do not edit other modules. If you need a new
   field or function in `src/core/`, ADD it (never rename or remove) and record it in your notes.
3. Write `specs/NOTES-<module>.md` within your first 10 minutes and keep it updated: what exists, what
   works, what is stubbed, how to run/test it, open questions. A cut-off agent must leave a usable trail.
4. `npm run check` must be clean when you report. Never commit.
5. Deterministic: no `Math.random`, `Date.now` or `performance.now` inside `src/sim`, `src/world`,
   `src/agents`, `src/events`. Use the seeded RNG passed to you (`SeededRng`, `rng.fork(salt)`).
6. Headless first: anything that can be exercised with `node scripts/<name>.ts` should have such a
   script and should pass before you report. Browser checks: `npm run dev` (port 5190), then Playwright
   from `/Users/haoming/crownfall/node_modules/playwright` (copy the pattern in `/Users/haoming/crownfall/e2e/duel.cjs`,
   launch args `['--use-angle=metal','--ignore-gpu-blocklist']`).
7. Quality bar: this is judged as a finished game, not a prototype. Content depth, variety, and polish
   matter. Prefer rich data tables (many templates, many items, many behaviours) over clever code.
8. Report back with: files, what works, how you verified it, and anything the lead must wire in main.ts.
