import type { UiContext } from '../core/app.ts';
import type { ItemId, Place, Villager, VillagerId, WeatherKind } from '../core/types.ts';
import { VILLAGERS } from '../core/villagers.ts';

/** What every panel gets: the game context plus the UI-wide services (caches, open/close, toasts). */
export interface UiCore {
  ctx: UiContext;
  root: HTMLElement;
  /** data-URL portrait for a villager (cached) */
  portrait(v: Villager | 'player'): string;
  itemIcon(id: ItemId, size?: number): string;
  weatherIcon(kind: WeatherKind, size?: number): string;
  open(id: PanelId): void;
  close(id: PanelId): void;
  toggle(id: PanelId): void;
  isOpen(id: PanelId): boolean;
  openInspector(v: Villager | null): void;
  openDialogue(v: Villager): void;
  openShop(place: Place): void;
  openBoard(): void;
  showTitle(show: boolean): void;
  toast(text: string, kind?: 'info' | 'warn' | 'good'): void;
  /** villager name matcher for highlighting chronicle lines */
  names: { re: RegExp; ids: Map<string, VillagerId> };
  /** settings shared by title + menu */
  settings: Settings;
  saveSettings(): void;
  hasSave(): boolean;
  setSpeed(n: number): void;
  togglePause(): void;
}

export type PanelId = 'title' | 'hud' | 'dialogue' | 'inspector' | 'village' | 'board' | 'shop' | 'director' | 'menu' | 'settings' | 'howto' | 'roster';

export interface Panel {
  id: PanelId;
  el: HTMLElement;
  /** a modal panel pauses the world and owns the keyboard */
  modal: boolean;
  /** Esc closes it (title is the exception) */
  closable: boolean;
  show(): void;
  hide(): void;
  tick(dt: number): void;
}

export interface Settings { music: number; sfx: number; quality: 'high' | 'low'; typewriter: boolean }
export const SETTINGS_KEY = 'pebblebrook.settings.v1';
export const DEFAULT_SETTINGS: Settings = { music: 0.6, sfx: 0.8, quality: 'high', typewriter: true };

export const SPEEDS = [1, 2, 4, 8];

export function moodWord(m: number): string {
  if (m >= 0.65) return 'elated';
  if (m >= 0.35) return 'cheerful';
  if (m >= 0.12) return 'content';
  if (m > -0.12) return 'calm';
  if (m > -0.35) return 'glum';
  if (m > -0.65) return 'upset';
  return 'miserable';
}
export const moodClass = (m: number): string => (m >= 0.12 ? 'good' : m > -0.12 ? 'mid' : 'bad');

export const NEED_NAMES: (keyof Villager['needs'])[] = ['energy', 'hunger', 'social', 'fun', 'comfort', 'purpose'];
export const NEED_LABELS: Record<keyof Villager['needs'], string> = { energy: 'Energy', hunger: 'Food', social: 'Company', fun: 'Fun', comfort: 'Comfort', purpose: 'Purpose' };
export const SKILL_NAMES = ['farming', 'fishing', 'mining', 'cooking', 'crafting', 'charm', 'lore', 'medicine'] as const;

export const shortName = (v: Villager | { name: string }): string => v.name.split(' ')[0];
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function whereIs(ctx: UiContext, v: Villager): string {
  if (v.inside) return ctx.world.place(v.inside)?.name ?? cap(v.inside.replace(/_/g, ' '));
  const p = ctx.world.placeAt({ x: Math.round(v.pos.x), y: Math.round(v.pos.y) });
  return p ? p.name : 'Outdoors';
}

export function doing(v: Villager): string {
  if (v.action?.label) return v.action.label;
  if (v.status.includes('sick')) return 'Feeling poorly';
  return 'Idle';
}

/** 12-hour clock that tolerates fractional minutes (the sim advances by dt × speed). */
export const clock12 = (hour: number, min: number): string => `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${String(Math.floor(min)).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;

/** "Day 3, 7:15 am" from an absolute world minute. */
export function fmtStamp(minute: number): string {
  const dayIndex = Math.floor(minute / 1440) + 1;
  const dayMin = Math.floor(minute - (dayIndex - 1) * 1440);
  return `Day ${dayIndex}, ${clock12(Math.floor(dayMin / 60), dayMin % 60)}`;
}
export function fmtAgo(minute: number, now: number): string {
  const d = Math.max(0, now - minute);
  if (d < 1) return 'just now';
  if (d < 60) return `${Math.round(d)} min ago`;
  if (d < 1440) { const hh = Math.floor(d / 60); return `${hh} h ago`; }
  const dd = Math.floor(d / 1440);
  return dd === 1 ? 'yesterday' : `${dd} days ago`;
}
export function fmtDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const hh = Math.floor(m / 60), mm = m % 60;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}

/** Build the villager-name matcher once (full names, first names, ids). */
export function buildNameMatcher(villagers: Villager[]): { re: RegExp; ids: Map<string, VillagerId> } {
  const ids = new Map<string, VillagerId>();
  const words: string[] = [];
  const specs = new Map(VILLAGERS.map((s) => [s.id, s]));
  for (const v of villagers) {
    const first = shortName(v);
    const spec = specs.get(v.id);
    for (const w of [v.name, first, spec?.short ?? first]) { if (!w) continue; ids.set(w.toLowerCase(), v.id); words.push(w); }
  }
  words.sort((a, b) => b.length - a.length);
  const esc = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`\\b(?:${esc.join('|')})(?:['’]s)?\\b`, 'g');
  // possessives: map "Ada's" to Ada
  const wrapped = new Map<string, VillagerId>();
  for (const [k, v] of ids) { wrapped.set(k, v); wrapped.set(`${k}'s`, v); wrapped.set(`${k}’s`, v); }
  return { re, ids: wrapped };
}

export function affinityColor(a: number): string {
  // -100..100 → red .. tan .. green .. gold
  if (a <= 0) { const t = Math.min(1, -a / 100); return `hsl(${Math.round(30 - 22 * t)}, ${Math.round(40 + 40 * t)}%, ${Math.round(58 - 10 * t)}%)`; }
  if (a < 60) { const t = a / 60; return `hsl(${Math.round(30 + 75 * t)}, ${Math.round(40 + 15 * t)}%, ${Math.round(58 - 20 * t)}%)`; }
  const t = (a - 60) / 40; return `hsl(${Math.round(105 - 60 * t)}, ${Math.round(55 + 20 * t)}%, ${Math.round(38 + 12 * t)}%)`;
}

export const REL_LABEL_CLASS: Record<string, string> = { stranger: 'muted', acquaintance: 'muted', friend: 'good', 'close friend': 'good', rival: 'bad', crush: 'love', partner: 'love', family: 'gold' };

export const loadSettings = (): Settings => {
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>) }; } catch { return { ...DEFAULT_SETTINGS }; }
};

/** Draw a 32×32 canvas (or any) to a data URL once; canvases can only live in one DOM spot, images can be cloned. */
export function canvasUrl(c: HTMLCanvasElement): string { try { return c.toDataURL(); } catch { return ''; } }

/** Prefer a sim helper when it exists at runtime (the sim may grow playerBuy/playerSell/acceptRequest later). */
export function simFn<T extends (...a: never[]) => unknown>(sim: unknown, name: string): T | null {
  const f = (sim as Record<string, unknown>)[name];
  return typeof f === 'function' ? (f as T).bind(sim) as T : null;
}

export const PLAYER_ID = 'player';
