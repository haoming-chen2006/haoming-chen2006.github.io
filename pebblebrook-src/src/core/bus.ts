import type { ActiveEvent, ConversationState, Emote, Memory, PlaceId, Request, Vec, VillagerId, WeatherState } from './types.ts';

/**
 * The one channel modules use to hear about each other. Payloads are plain data. Anyone may emit;
 * the renderer, UI and audio subscribe. Keep the union additive.
 */
export type BusEvent =
  | { type: 'newday'; dayIndex: number }
  | { type: 'hour'; hour: number }
  | { type: 'weather'; weather: WeatherState }
  | { type: 'say'; who: VillagerId | 'player'; text: string; to?: VillagerId | 'player'; pos: Vec }
  | { type: 'emote'; who: VillagerId; kind: Emote; pos: Vec }
  | { type: 'action'; who: VillagerId; tool: string; label: string; phase: 'start' | 'end' | 'fail'; message?: string; pos: Vec }
  | { type: 'memory'; who: VillagerId; memory: Memory }
  | { type: 'relationship'; a: VillagerId; b: VillagerId | 'player'; delta: number; label?: string }
  | { type: 'conversation'; state: ConversationState; phase: 'start' | 'turn' | 'end' }
  | { type: 'event'; event: ActiveEvent; phase: 'start' | 'end' }
  | { type: 'request'; request: Request; phase: 'posted' | 'accepted' | 'done' | 'expired' }
  | { type: 'chronicle'; text: string; importance: number; about?: VillagerId[]; place?: PlaceId }
  | { type: 'sfx'; name: string; pos?: Vec }
  | { type: 'toast'; text: string; kind?: 'info' | 'warn' | 'good' }
  | { type: 'player'; what: 'enter' | 'leave' | 'talk' | 'gift' | 'buy' | 'sell' | 'harvest' | 'fish' | 'mine' | 'sleep'; detail?: string }
  | { type: 'save' } | { type: 'load' };

type Handler<T extends BusEvent['type']> = (e: Extract<BusEvent, { type: T }>) => void;

export class Bus {
  private handlers = new Map<string, Set<(e: BusEvent) => void>>();
  private any = new Set<(e: BusEvent) => void>();

  on<T extends BusEvent['type']>(type: T, fn: Handler<T>): () => void {
    let set = this.handlers.get(type);
    if (!set) { set = new Set(); this.handlers.set(type, set); }
    set.add(fn as (e: BusEvent) => void);
    return () => { set!.delete(fn as (e: BusEvent) => void); };
  }

  onAny(fn: (e: BusEvent) => void): () => void { this.any.add(fn); return () => { this.any.delete(fn); }; }

  emit(e: BusEvent): void {
    const set = this.handlers.get(e.type);
    if (set) for (const fn of set) fn(e);
    for (const fn of this.any) fn(e);
  }
}

/** One bus for the whole game. Headless scripts make their own. */
export const bus = new Bus();
