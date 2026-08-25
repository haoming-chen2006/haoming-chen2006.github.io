// A mode is data: roster shape, what a card's position may be, and what the judge
// is told. Adding a fourth means adding a file here and a bank — the engine does
// not change.

import type { Bank, Mode, ModeId } from '../engine/card'
import { hok } from './hok'
import { nba } from './nba'
import { soccer } from './soccer'

export const modes: Record<ModeId, Mode> = { nba, soccer, hok }
export const modeList: Mode[] = [nba, soccer, hok]

// Agent 2's banks land in ./banks. Until they do, Agent 1's stand-ins answer for
// them. Both are globbed rather than imported so a missing directory is a
// fallback and not a build error.
const real = import.meta.glob('./banks/*.json')
const fixtures = import.meta.glob('../../fixtures/banks/*.json')

export type BankSource = 'real' | 'fixtures'

/** The real bank wins wherever it exists; the fixture stands in until it lands.
 *  Taking the key lists as arguments keeps the precedence rule testable without
 *  a build that has both. */
export function chooseBank(
  id: ModeId,
  realKeys: string[],
  fixtureKeys: string[],
): { source: BankSource; key: string } | null {
  const match = (keys: string[]) => keys.find((key) => key.endsWith(`/${id}.json`))
  const found = match(realKeys)
  if (found !== undefined) return { source: 'real', key: found }
  const stand = match(fixtureKeys)
  return stand === undefined ? null : { source: 'fixtures', key: stand }
}

export const bankSource = (id: ModeId): BankSource | null =>
  chooseBank(id, Object.keys(real), Object.keys(fixtures))?.source ?? null

export async function loadBank(id: ModeId): Promise<Bank> {
  const chosen = chooseBank(id, Object.keys(real), Object.keys(fixtures))
  if (chosen === null) throw new Error(`no bank for ${id}, real or stand-in`)

  const load = (chosen.source === 'real' ? real : fixtures)[chosen.key]!
  const bank = ((await load()) as { default: Bank }).default
  if (bank.mode !== id) throw new Error(`${chosen.key} says it is "${bank.mode}", not "${id}"`)
  return bank
}
