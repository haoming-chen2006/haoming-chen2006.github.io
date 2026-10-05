/** Items: flat stat bonuses plus a few passives. Six slots, buy anywhere. */
export interface ItemDef {
  id: string;
  name: string;
  cost: number;
  tier: 1 | 2 | 3;
  desc: string;
  hp?: number;
  damage?: number;
  power?: number;
  armor?: number;
  resist?: number;
  attackSpeed?: number; // fraction
  speed?: number; // tiles/s
  lifesteal?: number; // fraction of physical damage dealt
  spellvamp?: number;
  cooldown?: number; // cooldown reduction fraction
  crit?: number; // crit chance
  passive?: 'immortal' | 'frost' | 'crown' | 'phoenix';
  icon: string; // a glyph for the HUD
  color: string;
}

export const ITEMS: Record<string, ItemDef> = {
  boots_swift: { id: 'boots_swift', name: 'Swift Boots', cost: 710, tier: 1, desc: '+0.6 move speed, +25% attack speed.', speed: 0.6, attackSpeed: 0.25, icon: '👢', color: '#d9b36b' },
  boots_tank: { id: 'boots_tank', name: 'Guardian Boots', cost: 710, tier: 1, desc: '+0.6 move speed, +60 armour, +300 health.', speed: 0.6, armor: 60, hp: 300, icon: '🥾', color: '#8fb0d9' },
  boots_arcane: { id: 'boots_arcane', name: 'Arcane Boots', cost: 710, tier: 1, desc: '+0.6 move speed, +15% cooldown reduction, +40 power.', speed: 0.6, cooldown: 0.15, power: 40, icon: '🥿', color: '#b08cff' },
  bloodthirst: { id: 'bloodthirst', name: 'Bloodthirst Blade', cost: 1740, tier: 2, desc: '+100 attack, +25% lifesteal.', damage: 100, lifesteal: 0.25, icon: '🗡', color: '#e04a4a' },
  storm_lance: { id: 'storm_lance', name: 'Storm Lance', cost: 2100, tier: 3, desc: '+120 attack, +30% attack speed, +15% crit.', damage: 120, attackSpeed: 0.3, crit: 0.15, icon: '⚡', color: '#7cf7d5' },
  shadow_fang: { id: 'shadow_fang', name: 'Shadow Fang', cost: 2000, tier: 3, desc: '+140 attack, +25% crit, +0.3 speed.', damage: 140, crit: 0.25, speed: 0.3, icon: '🌑', color: '#c08bff' },
  sage_tome: { id: 'sage_tome', name: "Sage's Tome", cost: 1800, tier: 2, desc: '+180 power, +10% cooldown reduction, +400 mana.', power: 180, cooldown: 0.1, icon: '📘', color: '#6fb6ff' },
  void_staff: { id: 'void_staff', name: 'Void Staff', cost: 2100, tier: 3, desc: '+240 power, +15% spell vamp.', power: 240, spellvamp: 0.15, icon: '🪄', color: '#b47cff' },
  phoenix_feather: { id: 'phoenix_feather', name: 'Phoenix Feather', cost: 2200, tier: 3, desc: '+200 power, +800 health. Revive once with 40% health (long cooldown).', power: 200, hp: 800, passive: 'phoenix', icon: '🪶', color: '#ffb15e' },
  red_crystal: { id: 'red_crystal', name: 'Red Crystal', cost: 1600, tier: 2, desc: '+1200 health, +15 health regen.', hp: 1200, icon: '🔴', color: '#ff6b6b' },
  guardian_plate: { id: 'guardian_plate', name: 'Guardian Plate', cost: 1900, tier: 2, desc: '+200 armour, +900 health.', armor: 200, hp: 900, icon: '🛡', color: '#9ec5ff' },
  frost_heart: { id: 'frost_heart', name: 'Frost Heart', cost: 2000, tier: 3, desc: '+150 armour, +700 health, +15% cooldown reduction. Attackers are slowed.', armor: 150, hp: 700, cooldown: 0.15, passive: 'frost', icon: '❄', color: '#bfe8ff' },
  crimson_crown: { id: 'crimson_crown', name: 'Crimson Crown', cost: 2100, tier: 3, desc: '+150 magic resist, +1000 health, +10% cooldown reduction.', resist: 150, hp: 1000, cooldown: 0.1, passive: 'crown', icon: '👑', color: '#ffd86b' },
  immortal_shield: { id: 'immortal_shield', name: 'Immortal Shield', cost: 2200, tier: 3, desc: '+120 armour, +120 magic resist, +600 health. Revive once (long cooldown).', armor: 120, resist: 120, hp: 600, passive: 'immortal', icon: '✨', color: '#fff4c2' },
};

export const ITEM_LIST: ItemDef[] = Object.values(ITEMS);
export const itemDef = (id: string): ItemDef => { const d = ITEMS[id]; if (!d) throw new Error(`unknown item ${id}`); return d; };

export interface ItemTotals { hp: number; damage: number; power: number; armor: number; resist: number; attackSpeed: number; speed: number; lifesteal: number; spellvamp: number; cooldown: number; crit: number; passives: Set<string> }
export function sumItems(ids: readonly string[]): ItemTotals {
  const t: ItemTotals = { hp: 0, damage: 0, power: 0, armor: 0, resist: 0, attackSpeed: 0, speed: 0, lifesteal: 0, spellvamp: 0, cooldown: 0, crit: 0, passives: new Set() };
  for (const id of ids) {
    const d = ITEMS[id]; if (!d) continue;
    t.hp += d.hp ?? 0; t.damage += d.damage ?? 0; t.power += d.power ?? 0; t.armor += d.armor ?? 0; t.resist += d.resist ?? 0;
    t.attackSpeed += d.attackSpeed ?? 0; t.speed += d.speed ?? 0; t.lifesteal += d.lifesteal ?? 0; t.spellvamp += d.spellvamp ?? 0;
    t.cooldown += d.cooldown ?? 0; t.crit += d.crit ?? 0; if (d.passive) t.passives.add(d.passive);
  }
  t.cooldown = Math.min(0.4, t.cooldown);
  return t;
}
