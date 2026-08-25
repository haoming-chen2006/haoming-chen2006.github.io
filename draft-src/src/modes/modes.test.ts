import { describe, expect, it } from 'vitest'
import { MIN_CARDS, MODES } from '../engine/card'
import { bankSource, chooseBank, loadBank, modeList } from './index'

describe('the three modes', () => {
  it('carries the contract’s shape and adds a brief for the judge', () => {
    expect(modeList.map((m) => m.id)).toEqual(['nba', 'soccer', 'hok'])

    for (const mode of modeList) {
      expect(mode.slots).toEqual(MODES[mode.id].slots)
      expect(mode.positions).toEqual(MODES[mode.id].positions)
      expect(mode.judgeBrief.length).toBeGreaterThan(200)
      // The brief tells the judge what to weigh; it must not hand it a number.
      expect(mode.judgeBrief).not.toMatch(/\d/)
    }
  })

  it('loads a bank for every mode', async () => {
    for (const mode of modeList) {
      const bank = await loadBank(mode.id)

      expect(bank.mode).toBe(mode.id)
      expect(bank.cards.length).toBeGreaterThanOrEqual(MIN_CARDS[mode.id])
      for (const card of bank.cards) expect(mode.positions).toContain(card.position)

      console.log(`${mode.label}: ${bank.cards.length} cards from the ${bankSource(mode.id)} bank`)
    }
  })
})

describe('choosing between the real bank and the stand-in', () => {
  const real = ['./banks/nba.json', './banks/hok.json']
  const fixtures = ['../../fixtures/banks/nba.json', '../../fixtures/banks/soccer.json']

  it('takes the real bank when Agent 2 has delivered it', () => {
    expect(chooseBank('nba', real, fixtures)).toEqual({ source: 'real', key: './banks/nba.json' })
  })

  it('stands in with the fixture until then', () => {
    expect(chooseBank('soccer', real, fixtures)).toEqual({
      source: 'fixtures',
      key: '../../fixtures/banks/soccer.json',
    })
  })

  it('has nothing to offer when neither exists', () => {
    expect(chooseBank('soccer', [], [])).toBeNull()
  })

  it('is on stand-in data today, which is what makes E19 a swap and nothing more', () => {
    for (const mode of modeList) expect(bankSource(mode.id)).toBe('fixtures')
  })
})
