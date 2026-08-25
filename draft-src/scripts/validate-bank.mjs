#!/usr/bin/env node
// The handshake. Agent 2's data is done when this passes for all three modes.
// Agent 1's fake banks must pass it too, so real data drops in with no surprises.
//
//   node --experimental-strip-types scripts/validate-bank.mjs nba
//   node --experimental-strip-types scripts/validate-bank.mjs nba --images   (also HEADs every art URL)
//   node --experimental-strip-types scripts/validate-bank.mjs all
//   ... --bank-dir fixtures/banks --hidden-dir fixtures/hidden   (agent 1's stand-in data)

import { readFileSync, existsSync } from 'node:fs'
import { MODES, MIN_CARDS } from '../src/engine/card.ts'

const flag = (name, dflt) => {
  const i = process.argv.indexOf(name)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}
const BANK_DIR = flag('--bank-dir', 'src/modes/banks')
const HIDDEN_DIR = flag('--hidden-dir', 'data/hidden')
const BANK = (m) => `${BANK_DIR}/${m}.json`
const HIDDEN = (m) => `${HIDDEN_DIR}/${m}.json`

const readJson = (p) => {
  if (!existsSync(p)) throw new Error(`missing file: ${p}`)
  try { return JSON.parse(readFileSync(p, 'utf8')) }
  catch (e) { throw new Error(`${p} is not valid JSON: ${e.message}`) }
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0

function validate(modeId) {
  const mode = MODES[modeId]
  if (!mode) throw new Error(`unknown mode: ${modeId}`)
  const errs = []
  const bank = readJson(BANK(modeId))

  if (bank.mode !== modeId) errs.push(`bank.mode is "${bank.mode}", expected "${modeId}"`)
  if (!Array.isArray(bank.cards)) throw new Error('bank.cards is not an array')
  if (bank.cards.length < MIN_CARDS[modeId])
    errs.push(`only ${bank.cards.length} cards, need at least ${MIN_CARDS[modeId]}`)

  const seen = new Set()
  const statish = /\b(ppg|rpg|apg|pts|reb|ast|goals?|assists?|xg|win.?rate|kda|per|ts%)\b/i

  bank.cards.forEach((c, i) => {
    const at = `card[${i}]${isStr(c?.id) ? ` id=${c.id}` : ''}`
    for (const f of ['id', 'name', 'description', 'art', 'position'])
      if (!isStr(c?.[f])) errs.push(`${at}: "${f}" missing or empty`)
    if (isStr(c?.id)) {
      if (seen.has(c.id)) errs.push(`${at}: duplicate id`)
      seen.add(c.id)
    }
    if (isStr(c?.position) && !mode.positions.includes(c.position))
      errs.push(`${at}: position "${c.position}" not in [${mode.positions}]`)
    if (isStr(c?.art) && !c.art.startsWith('https://'))
      errs.push(`${at}: art is not an https URL`)
    if (isStr(c?.description) && statish.test(c.description))
      errs.push(`${at}: description looks like it leaks a stat: "${c.description}"`)
  })

  // hidden half
  if (mode.hasHidden) {
    const h = readJson(HIDDEN(modeId))
    if (h.mode !== modeId) errs.push(`hidden.mode is "${h.mode}", expected "${modeId}"`)
    const keys = Object.keys(h.hidden ?? {})
    const missing = [...seen].filter((id) => !(id in (h.hidden ?? {})))
    const orphan = keys.filter((id) => !seen.has(id))
    if (missing.length) errs.push(`${missing.length} cards have no hidden stats (e.g. ${missing.slice(0, 3)})`)
    if (orphan.length) errs.push(`${orphan.length} hidden entries match no card (e.g. ${orphan.slice(0, 3)})`)
    for (const [id, s] of Object.entries(h.hidden ?? {})) {
      if (typeof s !== 'object' || s === null || Array.isArray(s)) { errs.push(`hidden[${id}] is not an object`); continue }
      if (Object.keys(s).length === 0) errs.push(`hidden[${id}] is empty`)
      for (const [k, v] of Object.entries(s))
        if (!['string', 'number'].includes(typeof v)) errs.push(`hidden[${id}].${k} is ${typeof v}, must be string or number`)
    }
  } else if (existsSync(HIDDEN(modeId))) {
    const h = readJson(HIDDEN(modeId))
    if (Object.keys(h.hidden ?? {}).length) errs.push(`${modeId} declares hasHidden:false but the hidden file has entries`)
  }

  return { modeId, count: bank.cards.length, errs, cards: bank.cards }
}

async function checkImages(cards) {
  const bad = []
  const q = [...cards]
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (q.length) {
      const c = q.pop()
      try {
        const r = await fetch(c.art, { method: 'HEAD', redirect: 'follow' })
        if (!r.ok) bad.push(`${c.id} -> HTTP ${r.status}`)
      } catch (e) { bad.push(`${c.id} -> ${e.message}`) }
    }
  }))
  return bad
}

const arg = process.argv[2]
const wantImages = process.argv.includes('--images')
const modes = !arg || arg === 'all' || arg.startsWith('--') ? Object.keys(MODES) : [arg]

let failed = false
for (const m of modes) {
  let r
  try { r = validate(m) }
  catch (e) { console.log(`✗ ${m}: ${e.message}`); failed = true; continue }

  if (wantImages && !r.errs.length) {
    const bad = await checkImages(r.cards)
    bad.forEach((b) => r.errs.push(`art unreachable: ${b}`))
  }

  if (r.errs.length) {
    failed = true
    console.log(`✗ ${m}: ${r.count} cards, ${r.errs.length} problem(s)`)
    r.errs.slice(0, 25).forEach((e) => console.log(`    ${e}`))
    if (r.errs.length > 25) console.log(`    ...and ${r.errs.length - 25} more`)
  } else {
    console.log(`✓ ${m}: ${r.count} cards${wantImages ? ', all art reachable' : ''}`)
  }
}
process.exit(failed ? 1 : 0)
