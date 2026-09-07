/**
 * Internal contract between the sim and its tools. Tools receive a SimView by the public contract; inside
 * src/sim they upcast it to SimCore (the sim always passes itself) to reach the executor's helpers.
 */
import type { Bus } from '../core/bus.ts';
import type {
  CurrentAction, Effect, ItemId, ItemStack, Memory, Needs, Place, PlaceId, SimView, SkillName, ToolResult, Vec, Villager, VillagerId,
} from '../core/types.ts';

/** Per-villager state the sim needs that does not belong on the public Villager record. */
export interface VillagerRuntime {
  id: VillagerId;
  /** an async brain decision is in flight */
  pending: boolean;
  /** world minute since which the villager has had nothing to do while awake */
  idleSince: number;
  /** longest idle stretch while awake, in minutes (for the chronicle assertions) */
  longestIdle: number;
  /** effects to apply when the current action completes */
  effects: Effect[];
  /** per-hour need rates while the current action runs */
  rates: Partial<Needs>;
  /** an action put on hold by a conversation, restored afterwards */
  suspended: { action: CurrentAction; effects: Effect[]; rates: Partial<Needs>; remaining: number } | null;
  /** decisions made in the current tick (guards against instant-tool loops) */
  decisionsThisTick: number;
  /** id of the conversation the villager is in, if any */
  conversation: string | null;
  /** decaying accumulator of recent memory valence, feeds mood */
  moodBoost: number;
  /** dayIndex -> slept at home that night */
  sleptAtHome: Record<number, boolean>;
  /** dayIndex of the last nightly reflection */
  reflectedDay: number;
  /** minute at which temporary flags expire */
  flagUntil: Partial<Record<string, number>>;
  /** money at the start of the day (chronicle) */
  moneyAtDawn: number;
  /** tools used today in order (chronicle + brain anti-repetition) */
  todayTools: string[];
  /** last few tools, newest last */
  recentTools: string[];
  /** last decision reason, for debugging */
  lastReason: string;
  /** last hour a 'newhour' decision was requested */
  lastHourDecision: number;
  /** minute of the last conversation start (rate limit) */
  lastConversationAt: number;
  /** number of times the current travel retried following a moving target */
  travelRetries: number;
  /** the tool being travelled towards, for the label */
  travellingFor?: string;
  /** wake hour of the current plan */
  wakeHour: number;
  /** whether currently asleep */
  asleep: boolean;
  /** stack of villagers greeted this hour (avoid greeting loops) */
  greeted: Record<VillagerId, number>;
  /** the tool to run when the current walk arrives */
  then: { tool: string; args: Record<string, unknown> } | null;
  /** travel bookkeeping for the current walk */
  travel: { target: TravelTarget; dest: Vec; placeId?: string; enter: boolean } | null;
  /** when the async decision was requested */
  pendingSince: number;
  /** last tool that failed (brains avoid it for a while) */
  lastFail: string | null;
  /** observation to write when the current timed action completes */
  pendingMessage?: { message: string; importance: number; tool: string; category: string };
  /** an interrupt raised while the sim was mid-step; handled on the villager's next step */
  interruptedBy?: string;
  /** consecutive zero-length walks (guards against tools that never consider themselves "there") */
  zeroTravels?: number;
}

export interface ShopState {
  place: PlaceId;
  owner?: VillagerId;
  stock: ItemStack[];
  /** per item demand multiplier (1 = normal), drifts with buys/sells, decays daily */
  demand: Record<ItemId, number>;
  /** items and target quantities restocked daily */
  base: ItemStack[];
  /** the shop's own markup over base price */
  markup: number;
  /** owner-set price overrides */
  overrides: Record<ItemId, number>;
  /** sales counters for the chronicle */
  sold: number;
  bought: number;
  open: boolean;
  /** dayIndex on which the owner closed up explicitly (overrides opening hours for the rest of that day) */
  closedDay?: number;
}

export interface TravelTarget { place?: PlaceId; villager?: VillagerId; pos?: Vec; enter?: boolean }

export interface SimCore extends SimView {
  readonly bus: Bus;
  /** world minute */
  readonly now: number;
  rt(v: Villager): VillagerRuntime;
  shops: Map<PlaceId, ShopState>;
  /** true when the villager is inside the place or standing on one of its tiles */
  atPlace(v: Villager, place: PlaceId): boolean;
  currentPlace(v: Villager): Place | undefined;
  isOpen(place: Place): boolean;
  /** build a walking result; `then` is re-executed on arrival */
  travel(v: Villager, target: TravelTarget, then: { tool: string; args: Record<string, unknown> } | null, label?: string): ToolResult;
  near(v: Villager, other: Villager | { pos: Vec; inside?: PlaceId }, radius?: number): boolean;
  displayName(id: VillagerId | 'player'): string;
  placeName(id: PlaceId | undefined): string;
  resolvePlace(idOrName: unknown): Place | undefined;
  resolveVillager(idOrName: unknown): Villager | undefined;
  addSkill(v: Villager, skill: SkillName, xp: number): void;
  isAsleep(v: Villager): boolean;
  /** villagers the sim considers "in earshot" of v */
  audience(v: Villager, radius?: number): Villager[];
  /** memory helper with the villager's place filled in */
  observe(v: Villager, text: string, importance?: number, tags?: string[], about?: VillagerId[]): Memory;
  /** short name for a villager id */
  short(id: VillagerId | 'player'): string;
  /** the sale price a shop pays for an item */
  sellPriceOf(id: ItemId, place?: PlaceId): number;
  /** the fish table for the current season/weather */
  fishFor(): { id: ItemId; weight: number }[];
  /** seconds-free time helpers */
  hourFloat(): number;
  /** the friendliest option among villagers near v (or undefined) */
  bestCompanion(v: Villager): Villager | undefined;
}

export const asCore = (sim: SimView): SimCore => sim as SimCore;
