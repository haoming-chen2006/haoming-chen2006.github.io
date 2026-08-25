#!/usr/bin/env node
// Agent 1's stand-in banks. Same shape and roughly the same size as the real ones,
// so swapping Agent 2's data in at E19 is a no-op.
//
//   node --experimental-strip-types scripts/make-fixtures.mjs
//
// Deterministic: the same seed always produces the same bank, so a test can name
// a card id and still mean the same card tomorrow.

import { mkdirSync, writeFileSync } from 'node:fs'
import { MODES } from '../src/engine/card.ts'

const BANK_DIR = 'fixtures/banks'
const HIDDEN_DIR = 'fixtures/hidden'
const COUNT = { nba: 250, soccer: 250, hok: 132 }

// Nothing below may contain a word the validator reads as a statistic
// (ppg rpg apg pts reb ast goal assist xg win rate kda per ts%), because
// descriptions ship to the browser and the whole game rests on hiding numbers.
const FIRST = ['Ade', 'Bram', 'Casti', 'Doran', 'Emryn', 'Falk', 'Goran', 'Hale', 'Ivor',
  'Jarek', 'Kell', 'Lorne', 'Mabry', 'Nils', 'Orin', 'Pell', 'Quill', 'Rask', 'Sten',
  'Tam', 'Ulric', 'Vane', 'Wick', 'Yorn', 'Zev']
const LAST = ['Ashcroft', 'Brambleton', 'Coldwater', 'Duskmoor', 'Everline', 'Farrowick',
  'Glasshill', 'Hollowfen', 'Ironmere', 'Junewood', 'Kestrelly', 'Larkspur', 'Marrowgate',
  'Nettleby', 'Oakhurst', 'Pinebank', 'Quarrow', 'Ravensford', 'Stonemarch', 'Thistlewaite',
  'Undercliff', 'Varden', 'Westergale', 'Yarrowfield', 'Zephyrly']
const CITY = ['Vantor', 'Kesh', 'Aldreth', 'Morrow', 'Pellhaven', 'Corvane', 'Drybank',
  'Ellwater', 'Fenmark', 'Gale End', 'Hallowdeep', 'Irondale']
const NICKNAME = ['Ironmen', 'Kestrels', 'Wardens', 'Lanterns', 'Foxes', 'Anvils',
  'Mariners', 'Thornbacks', 'Cinders', 'Wolves', 'Harriers', 'Beacons']
const TITLE_A = ['Silent', 'Iron', 'Crimson', 'Hollow', 'Radiant', 'Sundered', 'Verdant',
  'Obsidian', 'Gilded', 'Wandering', 'Thunderous', 'Frostbound']
const TITLE_B = ['Bulwark', 'Vanguard', 'Requiem', 'Ember', 'Sovereign', 'Tempest',
  'Lantern', 'Reverie', 'Bastion', 'Oracle', 'Warden', 'Coil']

const PALETTE = { nba: ['1d4ed8', 'eff6ff'], soccer: ['15803d', 'f0fdf4'], hok: ['7e22ce', 'faf5ff'] }

/** Small deterministic PRNG. Same seed, same bank, every run. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (rand, xs) => xs[Math.floor(rand() * xs.length)]
const int = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))
const round1 = (n) => Math.round(n * 10) / 10

/** A season label like "2015-16". */
const season = (rand) => {
  const y = int(rand, 1998, 2024)
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
}

/** How often a position comes up, taken from how many slots carry that name.
 *  Soccer's GK DEF DEF MID MID FWD gives twice the defenders and midfielders. */
function positionPool(mode) {
  const pool = []
  for (const position of mode.positions) {
    const weight = Math.max(1, mode.slots.filter((slot) => slot === position).length)
    for (let i = 0; i < weight; i++) pool.push(position)
  }
  return pool
}

const art = (modeId, label) => {
  const [bg, fg] = PALETTE[modeId]
  return `https://placehold.co/1040x760/${bg}/${fg}.png?text=${encodeURIComponent(label).replace(/%20/g, '+')}`
}

function hiddenFor(modeId, position, rand) {
  if (modeId === 'nba')
    return {
      games: int(rand, 45, 82),
      minutes: round1(int(rand, 180, 380) / 10),
      scoring: round1(int(rand, 60, 340) / 10),
      boards: round1(int(rand, 20, 140) / 10),
      creation: round1(int(rand, 10, 110) / 10),
      steals: round1(int(rand, 3, 25) / 10),
      blocks: round1(int(rand, 1, 30) / 10),
      shooting_pct: round1(int(rand, 400, 620) / 10),
      three_pct: round1(int(rand, 280, 440) / 10),
      true_shooting: round1(int(rand, 500, 660) / 10),
    }
  // soccer
  const outfield = position !== 'GK'
  return {
    matches: int(rand, 20, 38),
    minutes: int(rand, 1400, 3400),
    scored: outfield ? int(rand, 0, 34) : 0,
    created: outfield ? int(rand, 0, 22) : int(rand, 0, 2),
    shots_on_target: outfield ? int(rand, 5, 90) : 0,
    duels_won_pct: int(rand, 38, 72),
    ...(outfield ? {} : { clean_sheets: int(rand, 2, 21), saves: int(rand, 40, 140) }),
  }
}

function buildMode(modeId, seed) {
  const mode = MODES[modeId]
  const rand = rng(seed)
  const pool = positionPool(mode)
  const width = String(COUNT[modeId]).length
  const cards = []
  const hidden = {}

  for (let i = 0; i < COUNT[modeId]; i++) {
    const id = `${modeId}-${String(i + 1).padStart(width, '0')}`
    const name = `${pick(rand, FIRST)} ${pick(rand, LAST)}`
    const position = pool[i % pool.length]
    const description =
      modeId === 'hok'
        ? `${pick(rand, TITLE_A)} ${pick(rand, TITLE_B)}`
        : `${season(rand)} · ${pick(rand, CITY)} ${pick(rand, NICKNAME)}`

    cards.push({ id, name, description, art: art(modeId, name), position })
    if (mode.hasHidden) hidden[id] = hiddenFor(modeId, position, rand)
  }

  return {
    bank: { mode: modeId, cards },
    // hok declares hasHidden:false, so its hidden half stays empty on purpose.
    hidden: { mode: modeId, hidden },
  }
}

mkdirSync(BANK_DIR, { recursive: true })
mkdirSync(HIDDEN_DIR, { recursive: true })

// Fixed seeds, one per mode, so regenerating never reshuffles the ids.
for (const [modeId, seed] of [['nba', 20240001], ['soccer', 20240002], ['hok', 20240003]]) {
  const { bank, hidden } = buildMode(modeId, seed)
  writeFileSync(`${BANK_DIR}/${modeId}.json`, `${JSON.stringify(bank, null, 2)}\n`)
  writeFileSync(`${HIDDEN_DIR}/${modeId}.json`, `${JSON.stringify(hidden, null, 2)}\n`)
  const kinds = new Map()
  for (const c of bank.cards) kinds.set(c.position, (kinds.get(c.position) ?? 0) + 1)
  const shape = [...kinds].map(([p, n]) => `${p} ${n}`).join(', ')
  console.log(`${modeId}: ${bank.cards.length} cards (${shape}), ${Object.keys(hidden.hidden).length} hidden`)
}
