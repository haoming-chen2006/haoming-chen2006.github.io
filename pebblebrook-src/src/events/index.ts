// AGENT E owns this module. Keep the export names.
import type { Director, Sim } from '../core/app.ts';
import { DirectorImpl, type DirectorLogLine, type PebbleDirector } from './director.ts';

export type { PebbleDirector, DirectorLogLine };
export type { EventDef, EventWhen, Announcement, EventCtx, CalendarEntry, Rarity } from './types.ts';
export { EVENTS, EVENT_BY_ID, FESTIVAL_IDS, MERCHANT_STOCK } from './catalogue.ts';
export { REQUEST_RULES, rewardFor, CHAIN_LENGTH } from './requests.ts';
export { createFakeSim, type FakeSim } from './fakesim.ts';

/** The Director: external events, festivals, requests. `active` is the sim's shared `events` list. */
export function createDirector(sim: Sim, seed: number): PebbleDirector {
  return new DirectorImpl(sim, seed);
}

export type { Director };
