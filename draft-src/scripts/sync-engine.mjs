#!/usr/bin/env node
// The rules exist in exactly one place — src/engine — but an Edge Function can
// only bundle what sits under supabase/functions. So the engine is copied there
// verbatim before a deploy, and a test asserts the copies are byte-identical so
// the two can never quietly drift.
//
// The hidden stats go the same way, into the judge's own folder. They are
// gitignored at both ends: they reach Supabase and never the repo or a browser.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const ENGINE = ['card.ts', 'state.ts', 'rules.ts']
const ENGINE_TO = 'supabase/functions/_shared/engine'
const HIDDEN_FROM = 'data/hidden'
const HIDDEN_TO = 'supabase/functions/judge/hidden'
const BANKS_TO = 'supabase/functions/_shared/banks'
const MODES = ['nba', 'soccer', 'hok']
const MODE_TO = 'supabase/functions/_shared/modes'

/** Vite resolves `./card`; Deno insists on `./card.ts`. The only edit made to the
 *  engine on its way to the server — and `npm run check:engine` re-derives it and
 *  fails if the two have drifted by so much as a byte. */
export const forDeno = (source) => source.replace(/(from '\.{1,2}\/[A-Za-z/]+)'/g, "$1.ts'")

mkdirSync(ENGINE_TO, { recursive: true })
for (const file of ENGINE) {
  writeFileSync(`${ENGINE_TO}/${file}`, forDeno(readFileSync(`src/engine/${file}`, 'utf8')))
  console.log(`engine  ${file}`)
}

// The server decides the draw order, so it needs its own copy of the banks.
// Same precedence as the app's loader: the real bank wins, the stand-in fills in.
mkdirSync(BANKS_TO, { recursive: true })
for (const mode of MODES) {
  const real = `src/modes/banks/${mode}.json`
  const stand = `fixtures/banks/${mode}.json`
  const from = existsSync(real) ? real : existsSync(stand) ? stand : null
  if (from === null) {
    console.log(`bank    ${mode}: nothing to copy`)
    continue
  }
  copyFileSync(from, `${BANKS_TO}/${mode}.json`)
  console.log(`bank    ${mode} from ${existsSync(real) ? 'real' : 'stand-in'}`)
}

// The judge needs the briefs. These only import the contract, so they travel.
mkdirSync(MODE_TO, { recursive: true })
for (const mode of MODES) {
  writeFileSync(`${MODE_TO}/${mode}.ts`, forDeno(readFileSync(`src/modes/${mode}.ts`, 'utf8')))
  console.log(`mode    ${mode}`)
}

// Always written, even when empty, so the judge's static imports always resolve
// on a machine that has never generated the hidden half.
mkdirSync(HIDDEN_TO, { recursive: true })
for (const mode of MODES) {
  const from = `${HIDDEN_FROM}/${mode}.json`
  if (existsSync(from)) {
    copyFileSync(from, `${HIDDEN_TO}/${mode}.json`)
    console.log(`hidden  ${mode}`)
  } else {
    writeFileSync(`${HIDDEN_TO}/${mode}.json`, JSON.stringify({ mode, hidden: {} }) + '\n')
    console.log(`hidden  ${mode} empty — no stats for the judge to read`)
  }
}
