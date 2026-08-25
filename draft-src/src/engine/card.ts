// THE CONTRACT between the engine and the data.
// Both agents build against this file. Nothing here changes without both agreeing.

export type ModeId = 'nba' | 'soccer' | 'hok'
export type CardId = string

/** One card in a bank. This is everything a player sees while bidding. */
export type Card = {
  /** Stable and unique inside its bank. Never reused, never renumbered. */
  id: CardId
  /** "Stephen Curry", "Lian Po" */
  name: string
  /** One short line under the name. "2015-16 · Golden State Warriors", "Justice Bombardment".
   *  Must never contain a statistic. */
  description: string
  /** Absolute https URL to the picture. */
  art: string
  /** Must be one of the mode's `positions`. Decides which slot it lands in. */
  position: string
}

/** The half a browser is allowed to have. Ships in the app bundle. */
export type Bank = {
  mode: ModeId
  cards: Card[]
}

/** Free-form. Whatever the judge should know and the player should not. */
export type HiddenStats = Record<string, string | number>

/** The half only the judge Edge Function reads. Never bundled into the app. */
export type HiddenBank = {
  mode: ModeId
  /** Keyed by Card.id. Empty for modes with nothing to hide. */
  hidden: Record<CardId, HiddenStats>
}

/** What a mode is. Four things and no more. */
export type Mode = {
  id: ModeId
  label: string
  /** Roster shape, in order. Length is the roster size. */
  slots: string[]
  /** What a card's `position` is allowed to be. Not the same as slots:
   *  an NBA card is never a "6th", but it can land in that slot. */
  positions: string[]
  /** Does this mode carry hidden stats? */
  hasHidden: boolean
  /** The mode-specific part of the judge prompt. */
  judgeBrief: string
}

export const MODES: Record<ModeId, Omit<Mode, 'judgeBrief'>> = {
  nba: {
    id: 'nba',
    label: 'NBA',
    slots: ['PG', 'SG', 'SF', 'PF', 'C', '6th'],
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    hasHidden: true,
  },
  soccer: {
    id: 'soccer',
    label: 'Soccer',
    slots: ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD'],
    positions: ['GK', 'DEF', 'MID', 'FWD'],
    hasHidden: true,
  },
  hok: {
    id: 'hok',
    label: 'Honor of Kings',
    slots: ['Clash', 'Jungle', 'Mid', 'Farm', 'Roam'],
    positions: ['Clash', 'Jungle', 'Mid', 'Farm', 'Roam'],
    hasHidden: false,
  },
}

/** Smallest bank we will accept per mode. Below this the draft gets repetitive. */
export const MIN_CARDS: Record<ModeId, number> = { nba: 200, soccer: 200, hok: 100 }
