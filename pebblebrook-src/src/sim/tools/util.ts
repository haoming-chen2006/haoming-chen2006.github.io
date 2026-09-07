/** Helpers shared by the tool files. */
import { item, RECIPE_BY_ID } from '../../core/items.ts';
import type { Effect, ItemId, ItemStack, Place, RecipeDef, ToolResult, Villager, VillagerId } from '../../core/types.ts';
import type { SimCore } from '../core.ts';

export const fail = (message: string): ToolResult => ({ ok: false, message });
export const done = (message: string, durationMin = 0, effects: Effect[] = [], importance = 2): ToolResult => ({ ok: true, message, durationMin, effects, importance });

export function str(args: Record<string, unknown>, key: string, def = ''): string {
  const v = args[key];
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : def;
}
export function num(args: Record<string, unknown>, key: string, def = 0): number {
  const v = args[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : def;
}

/** Stand at a place (walk there first when needed). Returns a travel result or null when already there. */
export function needPlace(v: Villager, sim: SimCore, placeId: string, tool: string, args: Record<string, unknown>, enter = true): ToolResult | null {
  if (sim.atPlace(v, placeId)) {
    const p = sim.world.place(placeId);
    if (enter && p && p.interior && v.inside !== placeId) { v.inside = placeId; v.pos = { ...p.interior }; }
    return null;
  }
  const p = sim.world.place(placeId);
  if (!p) return fail(`there is no such place as ${placeId}`);
  return sim.travel(v, { place: placeId, enter }, { tool, args }, `heading to ${p.name}`);
}

/** Stand near another villager (walk to them first when needed). */
export function needNear(v: Villager, sim: SimCore, target: Villager, tool: string, args: Record<string, unknown>, radius = 2.5): ToolResult | null {
  if (sim.near(v, target, radius)) return null;
  return sim.travel(v, { villager: target.id }, { tool, args }, `going over to ${target.name.split(' ')[0]}`);
}

/** A place with the facility, preferring where the villager is, then their workplace, then their home. */
export function placeWithFacility(v: Villager, sim: SimCore, facility: string): Place | undefined {
  const here = sim.currentPlace(v);
  if (here?.facilities.includes(facility)) return here;
  const wp = sim.world.place(v.workplace);
  if (wp?.facilities.includes(facility)) return wp;
  const home = sim.world.place(v.home);
  if (home?.facilities.includes(facility)) return home;
  // public facilities anyone can use (a tavern kitchen, the library's books)
  const all = sim.world.places.filter((p) => p.facilities.includes(facility) && (p.kind === 'public' || p.kind === 'workplace' || p.kind === 'shop'));
  if (!all.length) return undefined;
  all.sort((a, b) => dist2(a.anchor, v.pos) - dist2(b.anchor, v.pos));
  return all[0];
}

export const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export function hasAll(sim: SimCore, v: Villager, inputs: ItemStack[]): boolean {
  return inputs.every((i) => sim.has(v, i.id, i.qty));
}

export function missing(sim: SimCore, v: Villager, inputs: ItemStack[]): ItemStack[] {
  return inputs.filter((i) => !sim.has(v, i.id, i.qty)).map((i) => ({ id: i.id, qty: i.qty - countOf(v, i.id) }));
}

export function countOf(v: { inventory: ItemStack[] }, id: ItemId): number {
  let n = 0;
  for (const s of v.inventory) if (s.id === id) n += s.qty;
  return n;
}

export const itemName = (id: ItemId): string => item(id).name;
export const lowerName = (id: ItemId): string => item(id).name.toLowerCase();

export function recipe(idOrName: string): RecipeDef | undefined {
  const key = idOrName.toLowerCase().replace(/\s+/g, '_');
  if (RECIPE_BY_ID[key]) return RECIPE_BY_ID[key];
  return Object.values(RECIPE_BY_ID).find((r) => r.name.toLowerCase() === idOrName.toLowerCase());
}

export function itemId(idOrName: string): ItemId | undefined {
  const key = idOrName.toLowerCase().trim().replace(/\s+/g, '_');
  if (item(key).description !== '' || item(key).kind !== 'misc' || key === 'map_fragment') return key;
  const byName = Object.values(item as unknown as Record<string, never>);
  void byName;
  return undefined;
}

export const first = (v: Villager): string => v.name.split(' ')[0];

export const short = (sim: SimCore, id: VillagerId | 'player'): string => sim.short(id);

export const skillOf = (v: Villager, s: keyof Villager['skills']): number => v.skills[s] ?? 0;

/** A plain memory effect for another villager. */
export const memFor = (who: VillagerId | VillagerId[], text: string, importance: number, tags: string[], about?: VillagerId[]): Effect => ({ kind: 'memory', who, text, importance, tags, about });

export const chron = (text: string, importance: number, about?: VillagerId[], place?: string): Effect => ({ kind: 'chronicle', text, importance, about, place });

export const sfx = (name: string): Effect => ({ kind: 'sfx', name });

export const rate = (r: Partial<Record<'energy' | 'hunger' | 'social' | 'fun' | 'comfort' | 'purpose', number>>): Effect => ({ kind: 'rate', ...r });

export const need = (r: Partial<Record<'energy' | 'hunger' | 'social' | 'fun' | 'comfort' | 'purpose', number>>): Effect => ({ kind: 'need', ...r });

export const rel = (target: VillagerId | 'player', interaction: string, extra: Record<string, unknown> = {}): Effect => ({ kind: 'relationship', target, interaction, ...extra });

export const emote = (kind: string, who?: VillagerId): Effect => ({ kind: 'emote', emote: kind, who });

export const say = (text: string, to?: VillagerId | 'player', tone?: string): Effect => ({ kind: 'say', text, to, tone });

export const stat = (key: string, n = 1): Effect => ({ kind: 'stat', key, n });

/** A closure effect (data-only effects are preferred; use this for the rare bookkeeping that needs the sim). */
export const fx = (fn: (sim: SimCore, v: Villager) => void, when?: 'start' | 'end'): Effect => ({ kind: 'fn', fn, ...(when ? { when } : {}) });

/** Skill level slows work a little: 10 = 30% faster than 0. */
export const skillTime = (base: number, level: number): number => Math.round(base * (1 - 0.03 * level));

/** Is the villager awake and free to be approached? */
export function approachable(sim: SimCore, target: Villager): boolean {
  if (sim.isAsleep(target)) return false;
  const rt = sim.rt(target);
  if (rt.conversation) return false;
  return true;
}
