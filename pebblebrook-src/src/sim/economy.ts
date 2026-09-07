/**
 * Shops: stock that restocks daily, prices that drift with demand and events, the seller's cut.
 */
import { clamp } from '../core/index.ts';
import { item } from '../core/items.ts';
import type { ItemId, ItemStack, PlaceId, VillagerId } from '../core/types.ts';
import type { ShopState } from './core.ts';

interface ShopSpec { place: PlaceId; owner?: VillagerId; markup: number; base: [ItemId, number][]; buys: string[] }

/** What each shop stocks (target quantities) and which item kinds/tags it will buy from villagers. */
export const SHOP_SPECS: ShopSpec[] = [
  { place: 'store', owner: 'hal', markup: 1.15, base: [['turnip_seed', 20], ['potato_seed', 15], ['strawberry_seed', 10], ['corn_seed', 12], ['tomato_seed', 12], ['wheat_seed', 20], ['pumpkin_seed', 8], ['cabbage_seed', 10], ['sunflower_seed', 8], ['fertiliser', 8], ['candle', 6], ['bread', 4], ['coffee', 6], ['tea', 6], ['flour', 6], ['milk', 4], ['egg', 8], ['nails', 6], ['cloth', 2], ['book', 2], ['scarf', 1], ['lantern', 1], ['hoe', 1], ['watering_can', 1], ['axe', 1], ['copper_ore', 4], ['iron_ore', 3], ['wood', 6], ['potato', 4], ['turnip', 4], ['honey', 2], ['herbs', 3]], buys: ['crop', 'food', 'material', 'ore', 'gift', 'misc', 'fish', 'furniture', 'book', 'drink'] },
  { place: 'bakery', owner: 'cerys', markup: 1.0, base: [['bread', 6], ['sweet_roll', 4], ['berry_pie', 1], ['coffee', 4], ['tea', 3]], buys: ['flour', 'wheat', 'honey', 'berries', 'egg', 'milk', 'strawberry', 'apple'] },
  { place: 'tavern', owner: 'finn', markup: 1.1, base: [['ale', 20], ['cider', 10], ['stew', 6], ['fish_soup', 3], ['roast_veg', 3], ['omelette', 2], ['bread', 3]], buys: ['fish', 'crop', 'food', 'drink', 'apple', 'herbs'] },
  { place: 'smithy', owner: 'bram', markup: 1.05, base: [['nails', 12], ['horseshoe', 3], ['copper_bar', 2], ['iron_bar', 2], ['pickaxe', 1], ['axe', 1], ['hoe', 1], ['lantern', 1]], buys: ['ore', 'copper_bar', 'iron_bar', 'wood', 'stone', 'gem'] },
  { place: 'clinic', owner: 'elin', markup: 1.0, base: [['tonic', 4], ['bandage', 8], ['tea', 6], ['herbs', 3]], buys: ['herbs', 'honey', 'medicine'] },
  { place: 'carpenter', owner: 'jory', markup: 1.0, base: [['chair', 2], ['birdhouse', 2], ['toy_boat', 1], ['bookshelf', 1], ['fishing_rod', 1], ['wood', 10]], buys: ['wood', 'nails', 'cloth', 'stone'] },
  { place: 'dock', owner: 'dov', markup: 0.95, base: [['perch', 4], ['trout', 2], ['carp', 3], ['fish_soup', 1], ['fishing_rod', 1]], buys: ['fish', 'pearl'] },
  { place: 'library', owner: 'ines', markup: 1.0, base: [['book', 4], ['poetry', 2], ['tea', 2]], buys: ['book', 'poetry', 'map_fragment'] },
];

export function createShops(): Map<PlaceId, ShopState> {
  const m = new Map<PlaceId, ShopState>();
  for (const s of SHOP_SPECS) {
    m.set(s.place, { place: s.place, owner: s.owner, stock: s.base.map(([id, qty]) => ({ id, qty })), demand: {}, base: s.base.map(([id, qty]) => ({ id, qty })), markup: s.markup, overrides: {}, sold: 0, bought: 0, open: false });
  }
  return m;
}

/** Daily: top stock up towards base (partially, so owners' `restock` matters), relax demand towards 1. */
export function dailyRestock(shop: ShopState, fraction = 0.5): number {
  let added = 0;
  for (const b of shop.base) {
    const cur = shop.stock.find((s) => s.id === b.id);
    const target = Math.ceil(b.qty * fraction);
    if (!cur) { shop.stock.push({ id: b.id, qty: target }); added += target; }
    else if (cur.qty < target) { added += target - cur.qty; cur.qty = target; }
  }
  for (const k of Object.keys(shop.demand)) {
    shop.demand[k] = 1 + (shop.demand[k] - 1) * 0.6;
    if (Math.abs(shop.demand[k] - 1) < 0.02) delete shop.demand[k];
  }
  shop.stock = shop.stock.filter((s) => s.qty > 0);
  return added;
}

/** Owner-driven full restock. */
export function fullRestock(shop: ShopState): number {
  let added = 0;
  for (const b of shop.base) {
    const cur = shop.stock.find((s) => s.id === b.id);
    if (!cur) { shop.stock.push({ id: b.id, qty: b.qty }); added += b.qty; }
    else if (cur.qty < b.qty) { added += b.qty - cur.qty; cur.qty = b.qty; }
  }
  return added;
}

export function stockOf(shop: ShopState, id: ItemId): number { return shop.stock.find((s) => s.id === id)?.qty ?? 0; }

export function addStock(shop: ShopState, id: ItemId, qty: number): void {
  const cur = shop.stock.find((s) => s.id === id);
  if (cur) cur.qty += qty; else shop.stock.push({ id, qty });
}

export function removeStock(shop: ShopState, id: ItemId, qty: number): boolean {
  const cur = shop.stock.find((s) => s.id === id);
  if (!cur || cur.qty < qty) return false;
  cur.qty -= qty;
  if (cur.qty <= 0) shop.stock.splice(shop.stock.indexOf(cur), 1);
  return true;
}

/** Buying price at a shop: base × markup × demand × supply × event multipliers. */
export function buyPrice(shop: ShopState | undefined, id: ItemId, eventMult: number): number {
  const base = item(id).price;
  if (!shop) return Math.max(1, Math.round(base * eventMult));
  if (shop.overrides[id] !== undefined) return Math.max(1, Math.round(shop.overrides[id] * eventMult));
  const demand = shop.demand[id] ?? 1;
  const target = shop.base.find((b) => b.id === id)?.qty;
  const have = stockOf(shop, id);
  let supply = 1;
  if (target) supply = clamp(1 + (target - have) / (target * 4), 0.8, 1.35);
  return Math.max(1, Math.round(base * shop.markup * demand * supply * eventMult));
}

/** What a shop pays for an item: roughly 55–70% of base, more for things it wants. */
export function sellPrice(shop: ShopState | undefined, id: ItemId, eventMult: number): number {
  const def = item(id);
  const base = def.price;
  if (!shop) return Math.max(1, Math.floor(base * 0.5 * eventMult));
  const spec = SHOP_SPECS.find((s) => s.place === shop.place);
  const wants = spec ? spec.buys.includes(def.kind) || spec.buys.includes(def.id) || def.tags.some((t) => spec.buys.includes(t)) : false;
  const have = stockOf(shop, id);
  const demand = shop.demand[id] ?? 1;
  const glut = clamp(1 - have / 30, 0.5, 1);
  return Math.max(1, Math.floor(base * (wants ? 0.7 : 0.45) * demand * glut * eventMult));
}

export function shopWants(shop: ShopState, id: ItemId): boolean {
  const def = item(id);
  const spec = SHOP_SPECS.find((s) => s.place === shop.place);
  if (!spec) return false;
  return spec.buys.includes(def.kind) || spec.buys.includes(def.id) || def.tags.some((t) => spec.buys.includes(t));
}

export function noteBuy(shop: ShopState, id: ItemId, qty: number): void {
  shop.demand[id] = clamp((shop.demand[id] ?? 1) * (1 + 0.03 * qty), 0.7, 1.6);
  shop.sold += qty;
}
export function noteSell(shop: ShopState, id: ItemId, qty: number): void {
  shop.demand[id] = clamp((shop.demand[id] ?? 1) * (1 - 0.02 * qty), 0.7, 1.6);
  shop.bought += qty;
}

/** Which shop sells an item at all (for buy intents). */
export function shopsSelling(shops: Map<PlaceId, ShopState>, id: ItemId): ShopState[] {
  const out: ShopState[] = [];
  for (const s of shops.values()) if (stockOf(s, id) > 0) out.push(s);
  return out;
}

export function shopFor(shops: Map<PlaceId, ShopState>, owner: VillagerId): ShopState | undefined {
  for (const s of shops.values()) if (s.owner === owner) return s;
  return undefined;
}

export const FOOD_SHOPS: PlaceId[] = ['tavern', 'bakery', 'store'];

export function stackTotal(inv: ItemStack[], id: ItemId): number {
  let n = 0;
  for (const s of inv) if (s.id === id) n += s.qty;
  return n;
}
