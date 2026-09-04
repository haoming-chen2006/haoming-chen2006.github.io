// Item table (pure data). sim/inventory.ts applies the rules; ui shows name/icon/description.
import type { ItemDef, WeaponId } from '../sim/types.ts';

const W = (id: string, name: string, weaponId: WeaponId, damage: string, type: 'slashing' | 'piercing' | 'bludgeoning', extra: Partial<NonNullable<ItemDef['weapon']>> & { value?: number; description?: string; icon?: string; heavyWeapon?: boolean } = {}): ItemDef => {
  const { value, description, icon, heavyWeapon, ...w } = extra;
  return { id, name, kind: 'weapon', description: description ?? `${damage} ${type}.`, icon: icon ?? 'sword', value: value ?? 15, heavyWeapon,
    weapon: { weaponId, damage, type, ...w } };
};

export const ITEMS: Record<string, ItemDef> = {
  // ---- weapons ----
  longsword: W('longsword', 'Longsword', 'sword_1handed', '1d8', 'slashing', { value: 15, description: 'A soldier\'s blade, notched but true. 1d8 slashing.' }),
  greatsword: W('greatsword', 'Greatsword', 'sword_2handed', '2d6', 'slashing', { twoHanded: true, heavyWeapon: true, value: 50, description: 'Two-handed. 2d6 slashing.' }),
  greataxe: W('greataxe', 'Greataxe', 'axe_2handed', '1d12', 'slashing', { twoHanded: true, heavyWeapon: true, value: 30, icon: 'axe', description: 'Two-handed. 1d12 slashing.' }),
  handaxe: W('handaxe', 'Handaxe', 'axe_1handed', '1d6', 'slashing', { light: true, value: 5, icon: 'axe', description: 'Light. 1d6 slashing.' }),
  dagger: W('dagger', 'Dagger', 'dagger', '1d4', 'piercing', { finesse: true, light: true, value: 2, icon: 'dagger', description: 'Finesse, light. 1d4 piercing. Can be thrown.' }),
  quarterstaff: W('quarterstaff', 'Quarterstaff', 'staff', '1d6', 'bludgeoning', { twoHanded: true, value: 1, icon: 'staff', description: 'Two-handed. 1d6 bludgeoning — bones break under it.' }),
  mace: W('mace', 'Mace', 'axe_1handed', '1d6', 'bludgeoning', { value: 5, icon: 'mace', description: '1d6 bludgeoning. The dead do not like it.' }),
  warhammer: W('warhammer', 'Warhammer', 'sword_1handed', '1d8', 'bludgeoning', { value: 15, icon: 'mace', description: '1d8 bludgeoning.' }),
  // ---- shields / armor ----
  shield: { id: 'shield', name: 'Round Shield', kind: 'shield', description: '+2 AC. Hold Q to block; parry in the first moment of a block.', icon: 'shield', value: 10, shield: { offhandId: 'shield_round', ac: 2 } },
  leatherArmor: { id: 'leatherArmor', name: 'Leather Armor', kind: 'armor', description: 'AC 11 + Dex.', icon: 'armor', value: 10, armor: { ac: 11 }, armorType: 'light' },
  studdedLeather: { id: 'studdedLeather', name: 'Studded Leather', kind: 'armor', description: 'AC 12 + Dex.', icon: 'armor', value: 45, armor: { ac: 12 }, armorType: 'light' },
  chainShirt: { id: 'chainShirt', name: 'Chain Shirt', kind: 'armor', description: 'AC 13 + Dex (max 2).', icon: 'armor', value: 50, armor: { ac: 13, dexCap: 2 }, armorType: 'medium' },
  scaleMail: { id: 'scaleMail', name: 'Scale Mail', kind: 'armor', description: 'AC 14 + Dex (max 2). Disadvantage on Stealth.', icon: 'armor', value: 50, armor: { ac: 14, dexCap: 2, stealthDis: true }, armorType: 'medium' },
  chainMail: { id: 'chainMail', name: 'Chain Mail', kind: 'armor', description: 'AC 16. Disadvantage on Stealth.', icon: 'armor', value: 75, armor: { ac: 16, dexCap: 0, stealthDis: true }, armorType: 'heavy' },
  plateArmor: { id: 'plateArmor', name: 'Plate Armor', kind: 'armor', description: 'AC 18. Disadvantage on Stealth.', icon: 'armor', value: 1500, armor: { ac: 18, dexCap: 0, stealthDis: true }, armorType: 'heavy', rarity: 'rare' },
  // ---- consumables ----
  potionHealing: { id: 'potionHealing', name: 'Potion of Healing', kind: 'potion', description: 'Heals 2d4+2. Drinking takes a moment and can be interrupted.', icon: 'potion', value: 50, potion: { heal: '2d4+2' }, stackable: true, useAnim: 'Use_Item', useTime: 1.2 },
  potionGreaterHealing: { id: 'potionGreaterHealing', name: 'Potion of Greater Healing', kind: 'potion', description: 'Heals 4d4+4.', icon: 'potion', value: 150, potion: { heal: '4d4+4' }, stackable: true, rarity: 'uncommon', useAnim: 'Use_Item', useTime: 1.2 },
  antitoxin: { id: 'antitoxin', name: 'Antitoxin', kind: 'potion', description: 'Cures poison and grants resistance to it for a minute.', icon: 'vial', value: 50, potion: { effect: 'antitoxin' }, stackable: true, useAnim: 'Use_Item', useTime: 1.0 },
  scrollMagicMissile: { id: 'scrollMagicMissile', name: 'Scroll of Magic Missile', kind: 'scroll', description: 'Three darts of force that never miss. Anyone can read it.', icon: 'scroll', value: 60, spell: 'magicMissile', stackable: true, useAnim: 'Spellcast_Shoot', useTime: 0.6 },
  rations: { id: 'rations', name: 'Rations', kind: 'food', description: 'Dry bread and salted fish. Restores 1d4 HP out of combat.', icon: 'food', value: 1, potion: { heal: '1d4' }, stackable: true, useAnim: 'Use_Item', useTime: 1.0 },
  campSupplies: { id: 'campSupplies', name: 'Camp Supplies', kind: 'misc', description: 'Enough to make camp for a night. Needed for a long rest.', icon: 'camp', value: 16, stackable: true },
  // ---- rings / quest / misc ----
  ringProtection: { id: 'ringProtection', name: 'Ring of Protection', kind: 'ring', description: '+1 AC and +1 to saving throws.', icon: 'ring', value: 350, ring: { ac: 1, saves: 1 }, rarity: 'rare' },
  cryptKey: { id: 'cryptKey', name: 'Crypt Key', kind: 'quest', description: 'Cold iron, older than the chapel above it.', icon: 'key', value: 0 },
  gold: { id: 'gold', name: 'Gold', kind: 'misc', description: 'Coin.', icon: 'gold', value: 1, stackable: true },
};

export const getItem = (id: string): ItemDef | undefined => ITEMS[id];
