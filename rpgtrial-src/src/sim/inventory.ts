// Inventory, equipment (AC rules), consumables (potions with an interruptible drink), class starting gear.
import type { World } from './world.ts';
import type { Actor, EquipSlot, ClassDef, InventorySlot } from './types.ts';
import { bus } from '../core/events.ts';
import { getItem } from '../content/items.ts';
import { getClass } from '../content/classes.ts';
import { rollExpr, mod } from './dice.ts';
import { healActor, weaponStyle, hasFeat } from './combat.ts';
import { useAbility } from './abilities.ts';

const toast = (text: string, kind: 'info' | 'warn' | 'gold' | 'xp' = 'info') => bus.emit('toast', { text, kind });

export function countItem(w: World, itemId: string): number {
  let n = 0; for (const s of w.inventory) if (s.itemId === itemId) n += s.qty; return n;
}
function addSlots(w: World, itemId: string, qty: number) {
  const it = getItem(itemId)!;
  if (it.stackable) { const s = w.inventory.find((x) => x.itemId === itemId); if (s) s.qty += qty; else w.inventory.push({ itemId, qty }); }
  else for (let i = 0; i < qty; i++) w.inventory.push({ itemId, qty: 1 });
}
export function giveItem(w: World, itemId: string, qty = 1): boolean {
  const it = getItem(itemId);
  if (!it || qty <= 0) { console.warn('[sim] giveItem: unknown item', itemId); return false; }
  if (itemId === 'gold') { w.gold += qty; bus.emit('gold', { amount: qty, total: w.gold }); return true; }
  addSlots(w, itemId, qty);
  bus.emit('loot', { itemId, qty, name: it.name });
  return true;
}
export function removeItem(w: World, itemId: string, qty = 1): boolean {
  if (itemId === 'gold') { if (w.gold < qty) return false; w.gold -= qty; bus.emit('gold', { amount: -qty, total: w.gold }); return true; }
  if (countItem(w, itemId) < qty) return false;
  let left = qty;
  w.inventory = w.inventory.filter((s) => {
    if (s.itemId !== itemId || left <= 0) return true;
    const take = Math.min(s.qty, left); s.qty -= take; left -= take; return s.qty > 0;
  });
  return true;
}
export const hasItem = (w: World, itemId: string, qty = 1) => itemId === 'gold' ? w.gold >= qty : countItem(w, itemId) >= qty;

function slotFor(w: World, itemId: string): EquipSlot | null {
  const it = getItem(itemId); if (!it) return null;
  if (it.kind === 'weapon') {
    const main = w.equipment.mainHand ? getItem(w.equipment.mainHand) : undefined;
    // a second light weapon goes to the off hand (dual wield)
    if (it.weapon?.light && main?.weapon?.light && !w.equipment.offHand) return 'offHand';
    return 'mainHand';
  }
  if (it.kind === 'shield') return 'offHand';
  if (it.kind === 'armor') return 'armor';
  if (it.kind === 'ring') return 'ring';
  return null;
}
export function equip(w: World, itemId: string, slot?: EquipSlot): boolean {
  const it = getItem(itemId); if (!it) { console.warn('[sim] equip: unknown item', itemId); return false; }
  const p = w.player; if (!p) return false;
  slot = slot ?? slotFor(w, itemId) ?? undefined;
  if (!slot) { toast(`You can't equip ${it.name}.`, 'warn'); return false; }
  if (slot === 'offHand') {
    const main = w.equipment.mainHand ? getItem(w.equipment.mainHand) : undefined;
    if (main?.weapon?.twoHanded) { toast(`You can't use ${it.name} with a two-handed weapon.`, 'warn'); return false; }
    if (it.kind === 'weapon' && !it.weapon?.light) { toast(`${it.name} is too heavy for the off hand.`, 'warn'); return false; }
  }
  if (it.kind === 'armor' && it.armorType === 'heavy' && p.abilities.str < 13) toast(`${it.name} is heavy; you'll be slower.`, 'warn');
  // take from the inventory (content may equip an item it never gave — allow it)
  if (countItem(w, itemId) > 0) removeItem(w, itemId, 1);
  const prev = w.equipment[slot]; if (prev) addSlots(w, prev, 1);
  if (slot === 'mainHand' && it.weapon?.twoHanded && w.equipment.offHand) { addSlots(w, w.equipment.offHand, 1); w.equipment.offHand = null; }
  w.equipment[slot] = itemId;
  bus.emit('equip', { itemId, slot });
  recomputeStats(w, p);
  return true;
}
export function unequip(w: World, slot: EquipSlot): boolean {
  const cur = w.equipment[slot]; if (!cur) return false;
  w.equipment[slot] = null; addSlots(w, cur, 1);
  bus.emit('equip', { itemId: '', slot });
  if (w.player) recomputeStats(w, w.player);
  return true;
}

/** Derive AC, weapon visuals and speeds from class + equipment + feats. */
export function recomputeStats(w: World, p: Actor) {
  const cls: ClassDef | undefined = p.classId ? getClass(p.classId) : undefined;
  const eq = w.equipment;
  const anyEquip = !!(eq.mainHand || eq.offHand || eq.armor || eq.ring);
  if (!cls && !anyEquip) return;   // raw spawn without class/equipment: leave the lead's numbers alone
  const dex = mod(p.abilities.dex), con = mod(p.abilities.con);
  const armor = eq.armor ? getItem(eq.armor)?.armor : undefined;
  let ac: number;
  if (armor) ac = armor.ac + (armor.dexCap !== undefined ? Math.min(dex, armor.dexCap) : dex);
  else if (cls?.unarmoredDefense === 'con') ac = 10 + dex + con;
  else ac = 10 + dex;
  const off = eq.offHand ? getItem(eq.offHand) : undefined;
  if (off?.shield) ac += off.shield.ac;
  const ring = eq.ring ? getItem(eq.ring)?.ring : undefined;
  if (ring?.ac) ac += ring.ac;
  p.ac = ac;
  const main = eq.mainHand ? getItem(eq.mainHand) : undefined;
  p.weapon = main?.weapon?.weaponId ?? (cls && !eq.mainHand ? null : p.weapon);
  p.offhand = off?.shield ? off.shield.offhandId : off?.weapon?.weaponId === 'dagger' ? 'dagger' : null;
  p.style = weaponStyle(p);
  const speedMul = (hasFeat(p, 'mobile') ? 1.15 : 1) * (getItem(eq.armor ?? '')?.armorType === 'heavy' && p.abilities.str < 13 ? 0.85 : 1);
  p.walkSpeed = (cls?.walkSpeed ?? 2.4) * speedMul; p.runSpeed = (cls?.runSpeed ?? 5.6) * speedMul;
}

/** Give and equip a class's starting gear (clears the current inventory/equipment first). */
export function applyClassGear(w: World, def: ClassDef) {
  w.inventory = []; w.equipment = { mainHand: null, offHand: null, armor: null, ring: null, amulet: null };
  for (const it of def.startingItems ?? []) addSlots(w, it.id, it.qty);
  const eqp = def.startingEquipment ?? {};
  for (const slot of ['armor', 'mainHand', 'offHand', 'ring', 'amulet'] as EquipSlot[]) { const id = eqp[slot]; if (id) { addSlots(w, id, 1); equip(w, id, slot); } }
}

const inCombat = (w: World, p: Actor) => w.actorsNear(p.pos, 20, (a) => a.kind === 'enemy' && a.ai?.behaviour !== 'dormant' && a.ai?.behaviour !== 'idle').length > 0;

/** R key / inventory click. Potions and food start a drink; scrolls cast; gear equips. */
export function useItem(w: World, itemId: string): boolean {
  const p = w.player; if (!p || p.dead) return false;
  const it = getItem(itemId); if (!it) { console.warn('[sim] useItem: unknown item', itemId); return false; }
  if (!hasItem(w, itemId)) { toast(`You have no ${it.name}.`, 'warn'); return false; }
  if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'shield' || it.kind === 'ring') return equip(w, itemId);
  if (it.kind === 'scroll') {
    if (!it.spell) return false;
    const ok = useAbility(w, p, it.spell, { free: true });
    if (ok) { removeItem(w, itemId, 1); bus.emit('itemUsed', { itemId, actorId: p.id }); }
    return ok;
  }
  if (it.kind === 'potion' || it.kind === 'food') {
    if (!(p.state === 'idle' || p.state === 'move' || p.state === 'block') || !p.onGround) return false;
    if (it.kind === 'food' && inCombat(w, p)) { toast('Not while something is trying to eat you.', 'warn'); return false; }
    if (it.potion?.heal && !it.potion.effect && p.hp >= p.maxHp && it.kind === 'potion') { toast('You are already at full health.', 'info'); return false; }
    p.blocking = false; p.parryWindow = 0;
    w.setState(p, 'drink'); p.drinkItem = itemId; p.drinkTime = 0;
    const t = it.useTime ?? 1.2;
    w.setAnim(p, it.useAnim ?? 'Use_Item', false, 0.1, 1.6 / t);
    return true;
  }
  toast(it.description, 'info');
  return false;
}
/** Advance a drink in progress; applies the effect and consumes the item at the end. */
export function updateDrink(w: World, p: Actor, dt: number) {
  if (p.state !== 'drink') return;
  const itemId = p.drinkItem; const it = itemId ? getItem(itemId) : undefined;
  if (!it) { w.setState(p, 'idle'); return; }
  p.drinkTime = (p.drinkTime ?? 0) + dt;
  if (p.drinkTime < (it.useTime ?? 1.2)) return;
  if (!removeItem(w, it.id, 1)) { w.setState(p, 'idle'); p.drinkItem = null; return; }
  if (it.potion?.heal) healActor(w, p, p, rollExpr(w.rng, it.potion.heal).total);
  if (it.potion?.effect === 'antitoxin') {
    if (p.conditions.poisoned) { delete p.conditions.poisoned; bus.emit('condition', { actorId: p.id, condition: 'poisoned', on: false }); }
    p.conditions.antitoxin = 60; bus.emit('condition', { actorId: p.id, condition: 'antitoxin', on: true });
  }
  bus.emit('itemUsed', { itemId: it.id, actorId: p.id });
  p.drinkItem = null; w.setState(p, 'idle');
}
/** The potion the R key should drink: weakest healing potion first, unless badly hurt. */
export function quickPotion(w: World): string | null {
  const p = w.player; if (!p) return null;
  const small = countItem(w, 'potionHealing') > 0, big = countItem(w, 'potionGreaterHealing') > 0;
  if (p.hp <= p.maxHp * 0.35 && big) return 'potionGreaterHealing';
  if (small) return 'potionHealing';
  if (big) return 'potionGreaterHealing';
  return null;
}
export const inventorySnapshot = (w: World): InventorySlot[] => w.inventory.map((s) => ({ ...s }));
