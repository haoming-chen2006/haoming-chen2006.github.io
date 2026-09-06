// Class table (pure data). world.setPlayerClass() rebuilds the player from one of these.
import type { ClassDef, ClassId, FeatDef } from '../sim/types.ts';

/** Level-up feats. `chooseLevelUp(id)` applies one; the effects live in sim/rules.ts. */
export const FEATS: Record<string, FeatDef> = {
  greatWeaponMaster: { id: 'greatWeaponMaster', name: 'Great Weapon Master', description: 'Heavy and charged attacks take −5 to hit but deal +10 damage. Killing blows refill 20 stamina.' },
  defensiveDuelist: { id: 'defensiveDuelist', name: 'Defensive Duelist', description: 'Your parry window grows to 0.35 s and blocking costs half the stamina.' },
  empoweredEvocation: { id: 'empoweredEvocation', name: 'Empowered Evocation', description: 'Add your Intelligence modifier to the damage of your evocation spells.' },
  tough: { id: 'tough', name: 'Tough', description: '+2 hit points per level, now and on every level up.', hpPerLevel: 2 },
  assassinate: { id: 'assassinate', name: 'Assassinate', description: 'Attacks against staggered foes are automatic critical hits.' },
  mobile: { id: 'mobile', name: 'Mobile', description: 'You move 15% faster and dodging costs 25% less stamina.', ability: 'dex' },
  brutalCritical: { id: 'brutalCritical', name: 'Brutal Critical', description: 'Roll one additional weapon die on critical hits. +1 Strength.', ability: 'str' },
  savageAttacker: { id: 'savageAttacker', name: 'Savage Attacker', description: 'Roll weapon damage twice and take the better result.' },
};

export const CLASSES: Record<ClassId, ClassDef> = {
  fighter: {
    id: 'fighter', name: 'Fighter', model: 'Knight', hitDie: 10,
    description: 'Sword and shield. Blocks, parries, and never runs out of fight.',
    flavour: 'You woke with a soldier\'s calluses and a habit of counting exits.',
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 },
    saveProfs: ['str', 'con'], skillProfs: ['athletics', 'perception', 'intimidation'],
    weapon: 'sword_1handed', offhand: 'shield_round', ac: 16,
    kit: ['secondWind', 'actionSurge', 'shieldBash'],
    resources: { secondWind: 1, actionSurge: 1 },
    levelUpChoices: [
      { id: 'greatWeaponMaster', name: FEATS.greatWeaponMaster.name, description: FEATS.greatWeaponMaster.description },
      { id: 'defensiveDuelist', name: FEATS.defensiveDuelist.name, description: FEATS.defensiveDuelist.description },
    ],
    startingItems: [{ id: 'potionHealing', qty: 2 }, { id: 'rations', qty: 2 }],
    startingEquipment: { mainHand: 'longsword', offHand: 'shield', armor: 'chainShirt' },
  },
  wizard: {
    id: 'wizard', name: 'Wizard', model: 'Mage', hitDie: 6,
    description: 'Fragile, brilliant, and dangerous at range. Cantrips are free; slots are not.',
    flavour: 'Your fingers still remember sigils your head has forgotten.',
    abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
    saveProfs: ['int', 'wis'], skillProfs: ['arcana', 'history', 'investigation'],
    weapon: 'staff', offhand: null, ac: 12,
    kit: ['fireBolt', 'rayOfFrost', 'magicMissile', 'thunderwave'],
    resources: { spellSlots1: 2, arcaneRecovery: 1 },
    levelUpChoices: [
      { id: 'empoweredEvocation', name: FEATS.empoweredEvocation.name, description: FEATS.empoweredEvocation.description },
      { id: 'tough', name: FEATS.tough.name, description: FEATS.tough.description },
    ],
    startingItems: [{ id: 'potionHealing', qty: 2 }, { id: 'scrollMagicMissile', qty: 1 }, { id: 'rations', qty: 2 }],
    startingEquipment: { mainHand: 'quarterstaff' },
    walkSpeed: 2.4, runSpeed: 5.6,
  },
  rogue: {
    id: 'rogue', name: 'Rogue', model: 'Rogue', hitDie: 8,
    description: 'Two daggers and a bad attitude. Fast, slippery, deadly from behind.',
    flavour: 'Somebody wanted you dead badly enough to pay for a boat.',
    abilities: { str: 10, dex: 16, con: 12, int: 12, wis: 13, cha: 14 },
    saveProfs: ['dex', 'int'], skillProfs: ['stealth', 'sleightOfHand', 'acrobatics', 'perception', 'deception'],
    expertise: ['stealth', 'sleightOfHand'],
    weapon: 'dagger', offhand: 'dagger', ac: 14,
    kit: ['throwDagger', 'cunningDash', 'smokeBomb'],
    resources: { smokeBomb: 2 },
    levelUpChoices: [
      { id: 'assassinate', name: FEATS.assassinate.name, description: FEATS.assassinate.description },
      { id: 'mobile', name: FEATS.mobile.name, description: FEATS.mobile.description },
    ],
    startingItems: [{ id: 'potionHealing', qty: 2 }, { id: 'rations', qty: 2 }],
    startingEquipment: { mainHand: 'dagger', offHand: 'dagger', armor: 'leatherArmor' },
    walkSpeed: 2.6, runSpeed: 6.0,
  },
  barbarian: {
    id: 'barbarian', name: 'Barbarian', model: 'Barbarian', hitDie: 12,
    description: 'A greataxe and a grudge. Rage shrugs off blades; Whirlwind clears a room.',
    flavour: 'The lake spat you out. It regretted it.',
    abilities: { str: 17, dex: 14, con: 16, int: 8, wis: 10, cha: 10 },
    saveProfs: ['str', 'con'], skillProfs: ['athletics', 'intimidation', 'survival'],
    weapon: 'axe_2handed', offhand: null, ac: 15, unarmoredDefense: 'con',
    kit: ['rage', 'recklessAttack', 'whirlwind'],
    resources: { rage: 2 },
    levelUpChoices: [
      { id: 'brutalCritical', name: FEATS.brutalCritical.name, description: FEATS.brutalCritical.description },
      { id: 'savageAttacker', name: FEATS.savageAttacker.name, description: FEATS.savageAttacker.description },
    ],
    startingItems: [{ id: 'potionHealing', qty: 2 }, { id: 'rations', qty: 2 }],
    startingEquipment: { mainHand: 'greataxe' },
    walkSpeed: 2.5, runSpeed: 5.8,
  },
  // Not selectable in the prologue (no Ranger model shipped); kept so ClassId stays total.
  ranger: {
    id: 'ranger', name: 'Ranger', model: 'Rogue_Hooded', hitDie: 10,
    description: 'Hunter of the wild places.', flavour: 'The woods know your name.',
    abilities: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 8 },
    saveProfs: ['str', 'dex'], skillProfs: ['survival', 'perception', 'nature', 'stealth'],
    weapon: 'dagger', offhand: null, ac: 14,
    kit: ['throwDagger', 'cunningDash'], resources: {},
    levelUpChoices: [{ id: 'mobile', name: FEATS.mobile.name, description: FEATS.mobile.description }, { id: 'tough', name: FEATS.tough.name, description: FEATS.tough.description }],
    startingItems: [{ id: 'potionHealing', qty: 2 }],
    startingEquipment: { mainHand: 'dagger', armor: 'leatherArmor' },
  },
};

export const getClass = (id: ClassId | string): ClassDef | undefined => (CLASSES as Record<string, ClassDef>)[id];
/** Classes offered on the class-select screen. */
export const PLAYABLE_CLASSES: ClassId[] = ['fighter', 'wizard', 'rogue', 'barbarian'];
