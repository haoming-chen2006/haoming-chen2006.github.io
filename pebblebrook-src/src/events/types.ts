/**
 * Contracts inside src/events. The catalogue is data plus small hooks; the director drives them.
 */
import type { Sim } from '../core/app.ts';
import type { ActiveEvent, EventKind, PlaceId, Rng, Season, Villager, VillagerId, World, WorldTime } from '../core/types.ts';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type EventWhen =
  /** rolled once per day with probability `perDay`; fires at a seeded hour inside `hours` (default 7–20) */
  | { kind: 'random'; perDay: number; hours?: [number, number] }
  /** fixed calendar slot; `season` 'any' = every season, `weekday` 0 = Monday; `day` omitted = every day */
  | { kind: 'calendar'; season?: Season | 'any'; day?: number; weekday?: number; hour: number }
  /** checked every hour */
  | { kind: 'trigger'; check(ctx: EventCtx): boolean }
  /** only through follow-ups, `schedule()` or `fire()` */
  | { kind: 'manual' };

/** What a group of villagers gets to know when the event starts (written as `event` memories). */
export interface Announcement {
  to: 'everyone' | 'awake' | 'nearby' | VillagerId[];
  text: string | ((v: Villager) => string);
  importance: number;
  tags?: string[];
  about?: VillagerId[];
  place?: PlaceId;
  /** tile radius for 'nearby' around the event place (default 10) */
  radius?: number;
  /** 'pleasant' | 'unpleasant' colouring can depend on the villager */
  mood?: (v: Villager) => 'pleasant' | 'unpleasant' | null;
}

export interface FollowUp {
  id: string;
  /** minutes after the event ends (default 0) */
  afterMin?: number;
  /** or: this many days later at `atHour` */
  daysLater?: number;
  atHour?: number;
  chance?: number;
  opts?: (ev: ActiveEvent) => Record<string, unknown>;
  /** show in the forecast under this label */
  label?: string;
}

/** What hooks get: the sim, a seeded RNG owned by the director, the clock, and a way to chain events. */
export interface EventCtx {
  sim: Sim;
  world: World;
  rng: Rng;
  /** world minute */
  now: number;
  time: WorldTime;
  fire(id: string, opts?: Record<string, unknown>): ActiveEvent | null;
  schedule(id: string, atMinute: number, opts?: Record<string, unknown>, label?: string): void;
  activeOf(defId: string): ActiveEvent | undefined;
  /** shorthand for the villager's first name */
  name(id: VillagerId | 'player'): string;
}

export interface EventDef {
  id: string;
  name: string;
  kind: EventKind;
  description: string;
  rarity: Rarity;
  /** seasons in which the scheduler may roll/fire it (director override ignores this) */
  seasons?: Season[];
  when: EventWhen;
  durationMin: number;
  place?: PlaceId;
  /** days before the scheduler rolls it again (default 4) */
  cooldownDays?: number;
  /** other defs that block this one while active */
  exclusive?: string[];
  /** hard precondition, also checked by the director override */
  canFire?(ctx: EventCtx, opts?: Record<string, unknown>): boolean;
  /** the ActiveEvent text (default: description) */
  text?(ctx: EventCtx, ev: ActiveEvent): string;
  announce(ctx: EventCtx, ev: ActiveEvent): Announcement[];
  onStart(ctx: EventCtx, ev: ActiveEvent, opts: Record<string, unknown>): void;
  onTick?(ctx: EventCtx, ev: ActiveEvent, minutes: number): void;
  /** once when the world hour changes while the event is active */
  onHour?(ctx: EventCtx, ev: ActiveEvent, hour: number): void;
  onEnd(ctx: EventCtx, ev: ActiveEvent): void;
  /** after a save/load, for state that lives outside `ev.data` (a stall in the sim's shops, blocked tiles) */
  onLoad?(ctx: EventCtx, ev: ActiveEvent): void;
  followUps?: FollowUp[];
  /** importance of the chronicle/toast lines, 1..10 (default 5) */
  drama?: number;
}

/** A calendar slot the director derives from the catalogue (festivals, tax day, market day, birthdays). */
export interface CalendarEntry {
  defId: string;
  name: string;
  season?: Season | 'any';
  day?: number;
  weekday?: number;
  hour: number;
  opts?: Record<string, unknown>;
}
