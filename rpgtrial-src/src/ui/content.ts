// Defensive access to the content tables (classes / abilities / items / feats). The real tables live in
// src/content/classes.ts + src/content/items.ts (content agent). Until they land — or when they lack an entry —
// we fall back to the placeholders below so every screen can be demoed.
import type { ClassDef, AbilityDef, ItemDef, ClassId, FeatDef } from '../sim/types.ts';
import { CLASSES, FEATS } from '../content/classes.ts';
import { ABILITIES } from '../content/spells.ts';
import { ITEMS } from '../content/items.ts';

export interface ContentTables {
  classes: Record<string, ClassDef>;
  abilities: Record<string, AbilityDef>;
  items: Record<string, ItemDef>;
  feats: Record<string, FeatDef>;
}

const A = (id: string, name: string, icon: string, kind: AbilityDef['kind'], description: string, extra: Partial<AbilityDef> = {}): AbilityDef =>
  ({ id, name, icon, kind, description, ...extra });

export const PLACEHOLDER_ABILITIES: Record<string, AbilityDef> = {
  // fighter
  secondWind: A('secondWind', 'Second Wind', 'wind', 'heal', 'Draw on your reserves: regain 1d10 + your level in hit points. Once per rest.', { cost: { resource: 'secondWind', amount: 1 }, cooldown: 1 }),
  actionSurge: A('actionSurge', 'Action Surge', 'surge', 'buff', 'Push beyond your limits: your next attacks come faster and your stamina refills. Once per rest.', { cost: { resource: 'actionSurge', amount: 1 }, cooldown: 1 }),
  shieldBash: A('shieldBash', 'Shield Bash', 'shield', 'attack', 'Slam your shield into a foe. On a failed Strength save (DC 13) they are staggered.', { cost: { resource: 'stamina', amount: 20 }, cooldown: 6, damage: '1d4', damageType: 'bludgeoning', save: { ability: 'str', dc: 13 } }),
  cleave: A('cleave', 'Cleave', 'greatsword', 'attack', 'A wide sweeping blow that strikes every enemy in front of you.', { cost: { resource: 'stamina', amount: 25 }, cooldown: 8, damage: '1d8', damageType: 'slashing' }),
  // wizard
  fireBolt: A('fireBolt', 'Fire Bolt', 'fire', 'spell', 'Cantrip. Hurl a mote of fire at a creature. Ranged spell attack, 1d10 fire damage.', { cooldown: 1.2, damage: '1d10', damageType: 'fire', range: 18, level: 0 }),
  rayOfFrost: A('rayOfFrost', 'Ray of Frost', 'frost', 'spell', 'Cantrip. A frigid beam of blue-white light. 1d8 cold damage and the target is slowed.', { cooldown: 1.5, damage: '1d8', damageType: 'cold', range: 18, level: 0 }),
  magicMissile: A('magicMissile', 'Magic Missile', 'missile', 'spell', 'Three darts of glowing force strike unerringly for 1d4 + 1 each.', { cost: { resource: 'spellSlots1', amount: 1 }, cooldown: 2, damage: '3d4+3', damageType: 'force', range: 24, level: 1 }),
  shield: A('shield', 'Shield', 'shieldSpell', 'buff', 'An invisible barrier of magical force: +5 AC for 6 seconds.', { cost: { resource: 'spellSlots1', amount: 1 }, cooldown: 4, level: 1 }),
  sleep: A('sleep', 'Sleep', 'sleep', 'spell', 'Send weak-minded creatures into a magical slumber (5d8 hit points worth, lowest first).', { cost: { resource: 'spellSlots1', amount: 1 }, cooldown: 6, radius: 4, range: 18, level: 1 }),
  burningHands: A('burningHands', 'Burning Hands', 'fire', 'spell', 'A thin sheet of flame shoots from your fingertips: 3d6 fire damage in a cone, Dex save DC 13 for half.', { cost: { resource: 'spellSlots1', amount: 1 }, cooldown: 4, damage: '3d6', damageType: 'fire', save: { ability: 'dex', dc: 'spell' }, level: 1 }),
  // rogue
  sneakAttack: A('sneakAttack', 'Sneak Attack', 'sneak', 'attack', 'Strike from hiding or while an ally distracts your target for an extra 1d6 damage.', { cost: { resource: 'stamina', amount: 15 }, cooldown: 5, damage: '1d6', damageType: 'piercing' }),
  cunningDash: A('cunningDash', 'Cunning Action: Dash', 'boot', 'utility', 'Bonus-action burst of speed — and your stamina refills.', { cooldown: 10 }),
  throwDagger: A('throwDagger', 'Throw Dagger', 'dagger', 'attack', 'Fling a dagger. Ranged attack, 1d4 + Dex piercing; sneak attack applies from hiding.', { cost: { resource: 'stamina', amount: 10 }, cooldown: 2.5, damage: '1d4', damageType: 'piercing', range: 14 }),
  vanish: A('vanish', 'Vanish', 'eyeOff', 'utility', 'Cunning Action: Hide. Fade from sight; enemies lose track of you for a moment.', { cost: { resource: 'stamina', amount: 20 }, cooldown: 14 }),
  // barbarian
  rage: A('rage', 'Rage', 'rage', 'buff', 'Enter a primal fury: +2 damage, resistance to slashing, piercing and bludgeoning. Lasts 20 seconds.', { cost: { resource: 'rage', amount: 1 }, cooldown: 2 }),
  recklessAttack: A('recklessAttack', 'Reckless Attack', 'fist', 'attack', 'Throw caution aside: attack with advantage, but enemies have advantage against you until your next turn.', { cost: { resource: 'stamina', amount: 20 }, cooldown: 4, damage: '1d12', damageType: 'slashing' }),
  whirlwind: A('whirlwind', 'Whirlwind', 'axe', 'attack', 'Spin with your greataxe, striking all enemies around you.', { cost: { resource: 'stamina', amount: 30 }, cooldown: 9, damage: '1d12', damageType: 'slashing' }),
  warCry: A('warCry', 'War Cry', 'skull', 'buff', 'A terrifying bellow. Enemies nearby must make a Wisdom save (DC 12) or be frightened.', { cost: { resource: 'stamina', amount: 15 }, cooldown: 15, save: { ability: 'wis', dc: 12 } }),
  // ranger
  huntersMark: A('huntersMark', "Hunter's Mark", 'mark', 'buff', 'Mark a foe as your quarry: +1d6 damage on every hit against it.', { cost: { resource: 'spellSlots1', amount: 1 }, cooldown: 2, level: 1 }),
  aimedShot: A('aimedShot', 'Aimed Shot', 'crossbow', 'attack', 'A careful crossbow shot. 1d8 + Dex piercing.', { cost: { resource: 'stamina', amount: 15 }, cooldown: 3, damage: '1d8', damageType: 'piercing', range: 24 }),
  cureWounds: A('cureWounds', 'Cure Wounds', 'heal', 'heal', 'Heal 1d8 + Wis hit points.', { cost: { resource: 'spellSlots1', amount: 1 }, cooldown: 3, level: 1 }),
  potion: A('potion', 'Potion of Healing', 'potion', 'heal', 'Drink to regain 2d4 + 2 hit points.', {}),
};

const C = (id: ClassId, name: string, model: ClassDef['model'], hitDie: number, description: string, flavour: string,
  abilities: ClassDef['abilities'], saveProfs: ClassDef['saveProfs'], skillProfs: ClassDef['skillProfs'], weapon: ClassDef['weapon'], offhand: ClassDef['offhand'], ac: number,
  kit: string[], resources: Record<string, number>, levelUpChoices: ClassDef['levelUpChoices'], startingItems: { id: string; qty: number }[]): ClassDef =>
  ({ id, name, model, hitDie, description, flavour, abilities, saveProfs, skillProfs, weapon, offhand, ac, kit, resources, levelUpChoices, startingItems });

export const PLACEHOLDER_CLASSES: Record<string, ClassDef> = {
  fighter: C('fighter', 'Fighter', 'Knight', 10,
    'A master of martial combat, skilled with a variety of weapons and armour.',
    'Steel, shield and stubbornness. You have survived worse than a shipwreck — you think.',
    { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 }, ['str', 'con'], ['athletics', 'perception', 'intimidation'],
    'sword_1handed', 'shield_round', 16, ['secondWind', 'actionSurge', 'shieldBash', 'cleave'], { secondWind: 1, actionSurge: 1 },
    [{ id: 'defense', name: 'Fighting Style: Defense', description: '+1 AC while wearing armour.' }, { id: 'dueling', name: 'Fighting Style: Dueling', description: '+2 damage with a one-handed weapon.' }, { id: 'tough', name: 'Tough', description: '+2 hit points per level.' }],
    [{ id: 'longsword', qty: 1 }, { id: 'shield_round', qty: 1 }, { id: 'chain_shirt', qty: 1 }, { id: 'potion_healing', qty: 2 }]),
  wizard: C('wizard', 'Wizard', 'Mage', 6,
    'A scholarly magic-user capable of manipulating the structures of reality.',
    'Your spellbook is water-stained but legible. Fire Bolt still works; the rest, you will find out.',
    { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 }, ['int', 'wis'], ['arcana', 'history', 'investigation'],
    'staff', 'spellbook_open', 12, ['fireBolt', 'rayOfFrost', 'magicMissile', 'shield', 'sleep', 'burningHands'], { spellSlots1: 3 },
    [{ id: 'evocation', name: 'School of Evocation', description: 'Your damaging spells deal +Int modifier damage.' }, { id: 'abjuration', name: 'School of Abjuration', description: 'Shield grants temporary hit points equal to twice your level.' }, { id: 'warCaster', name: 'War Caster', description: 'Advantage on concentration saves; cast Shield without a slot once per rest.' }],
    [{ id: 'staff', qty: 1 }, { id: 'spellbook', qty: 1 }, { id: 'scroll_magic_missile', qty: 1 }, { id: 'potion_healing', qty: 1 }]),
  rogue: C('rogue', 'Rogue', 'Rogue', 8,
    'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    'Quick hands, quicker feet. The sword washed ashore, but the daggers stayed where you hid them.',
    { str: 10, dex: 17, con: 12, int: 13, wis: 12, cha: 14 }, ['dex', 'int'], ['stealth', 'sleightOfHand', 'acrobatics', 'deception'],
    'dagger', 'dagger', 14, ['sneakAttack', 'throwDagger', 'cunningDash', 'vanish'], { sneakAttack: 1 },
    [{ id: 'assassin', name: 'Assassin', description: 'Attacks against surprised or slowed enemies are critical hits.' }, { id: 'thief', name: 'Thief', description: 'Cunning Action recharges twice as fast; +1 Dex.' }, { id: 'alert', name: 'Alert', description: 'You cannot be surprised, and get +5 to perception checks.' }],
    [{ id: 'dagger', qty: 2 }, { id: 'leather_armor', qty: 1 }, { id: 'thieves_tools', qty: 1 }, { id: 'potion_healing', qty: 1 }]),
  barbarian: C('barbarian', 'Barbarian', 'Barbarian', 12,
    'A fierce warrior of primitive background who can enter a battle rage.',
    'The lake spat you out and you bit it back. Your axe is still in your hand. Good.',
    { str: 17, dex: 13, con: 16, int: 8, wis: 10, cha: 11 }, ['str', 'con'], ['athletics', 'survival', 'intimidation'],
    'axe_2handed', null, 14, ['rage', 'recklessAttack', 'whirlwind', 'warCry'], { rage: 2 },
    [{ id: 'berserker', name: 'Path of the Berserker', description: 'While raging, your attacks cannot be interrupted.' }, { id: 'totemBear', name: 'Totem: Bear', description: 'While raging, resistance to all damage except psychic.' }, { id: 'greatWeaponMaster', name: 'Great Weapon Master', description: '−5 to hit, +10 damage with heavy weapons.' }],
    [{ id: 'greataxe', qty: 1 }, { id: 'handaxe', qty: 2 }, { id: 'potion_healing', qty: 1 }]),
  ranger: C('ranger', 'Ranger', 'Rogue_Hooded', 10,
    'A warrior who combats threats on the edges of civilisation.',
    'You know these woods. Or woods like them. The crossbow still fires.',
    { str: 12, dex: 16, con: 13, int: 10, wis: 15, cha: 10 }, ['str', 'dex'], ['survival', 'nature', 'perception', 'stealth'],
    'crossbow_2handed', null, 14, ['huntersMark', 'aimedShot', 'cureWounds', 'cunningDash'], { spellSlots1: 2 },
    [{ id: 'archery', name: 'Fighting Style: Archery', description: '+2 to ranged attack rolls.' }, { id: 'hunter', name: 'Hunter: Colossus Slayer', description: '+1d8 damage against wounded enemies.' }, { id: 'sharpshooter', name: 'Sharpshooter', description: 'Ignore cover; −5 to hit for +10 damage.' }],
    [{ id: 'crossbow', qty: 1 }, { id: 'leather_armor', qty: 1 }, { id: 'potion_healing', qty: 1 }]),
};

const I = (id: string, name: string, kind: ItemDef['kind'], icon: string, description: string, value: number, extra: Partial<ItemDef> = {}): ItemDef =>
  ({ id, name, kind, icon, description, value, ...extra });
export const PLACEHOLDER_ITEMS: Record<string, ItemDef> = {
  longsword: I('longsword', 'Longsword', 'weapon', 'sword', 'A knight’s blade, salt-pitted but keen. Versatile.', 15, { weapon: { weaponId: 'sword_1handed', damage: '1d8', type: 'slashing' } }),
  greatsword: I('greatsword', 'Greatsword', 'weapon', 'greatsword', 'Six feet of steel. Requires both hands and most of your patience.', 50, { weapon: { weaponId: 'sword_2handed', damage: '2d6', type: 'slashing', twoHanded: true }, rarity: 'uncommon' }),
  dagger: I('dagger', 'Dagger', 'weapon', 'dagger', 'Light, finesse, and thrown. Everyone should carry one.', 2, { weapon: { weaponId: 'dagger', damage: '1d4', type: 'piercing', finesse: true, light: true }, stackable: true }),
  greataxe: I('greataxe', 'Greataxe', 'weapon', 'axe', 'Heavy enough to split a shield and the arm behind it.', 30, { weapon: { weaponId: 'axe_2handed', damage: '1d12', type: 'slashing', twoHanded: true } }),
  handaxe: I('handaxe', 'Handaxe', 'weapon', 'axe', 'A light throwing axe.', 5, { weapon: { weaponId: 'axe_1handed', damage: '1d6', type: 'slashing', light: true }, stackable: true }),
  staff: I('staff', 'Quarterstaff', 'weapon', 'staff', 'Ash wood bound in iron. A wizard’s walking stick and last resort.', 2, { weapon: { weaponId: 'staff', damage: '1d6', type: 'bludgeoning' } }),
  crossbow: I('crossbow', 'Light Crossbow', 'weapon', 'crossbow', 'Simple, reliable, and loud.', 25, { weapon: { weaponId: 'crossbow_2handed', damage: '1d8', type: 'piercing', ranged: true, twoHanded: true } }),
  shield_round: I('shield_round', 'Round Shield', 'shield', 'shield', 'Oak and iron. +2 AC. Hold Q to block; parry in the first instant.', 10, { shield: { offhandId: 'shield_round', ac: 2 } }),
  chain_shirt: I('chain_shirt', 'Chain Shirt', 'armor', 'armor', 'Medium armour. AC 13 + Dex (max 2).', 50, { armor: { ac: 13, dexCap: 2 } }),
  leather_armor: I('leather_armor', 'Leather Armour', 'armor', 'armor', 'Light armour. AC 11 + Dex.', 10, { armor: { ac: 11 } }),
  spellbook: I('spellbook', 'Spellbook', 'misc', 'book', 'Water-stained, but the ink held. Your six known spells.', 50, { rarity: 'uncommon' }),
  potion_healing: I('potion_healing', 'Potion of Healing', 'potion', 'potion', 'A red liquid that glimmers when agitated. Heals 2d4 + 2. Press R to drink.', 50, { potion: { heal: '2d4+2' }, stackable: true, rarity: 'common' }),
  scroll_magic_missile: I('scroll_magic_missile', 'Scroll of Magic Missile', 'scroll', 'scroll', 'One use. Three unerring darts of force.', 60, { spell: 'magicMissile', stackable: true, rarity: 'uncommon' }),
  thieves_tools: I('thieves_tools', "Thieves' Tools", 'misc', 'key', 'Picks, files, a tiny mirror. Advantage on lockpicking.', 25),
  ration: I('ration', 'Rations', 'food', 'food', 'Dried fish and hard bread. Eat during a rest.', 1, { stackable: true }),
  rusted_key: I('rusted_key', 'Rusted Key', 'quest', 'key', 'Found in the boat wreck. It fits something in the crypt.', 0, { rarity: 'rare' }),
  ring_protection: I('ring_protection', 'Ring of Protection', 'ring', 'ring', '+1 AC and +1 to saving throws.', 500, { ring: { ac: 1, saves: 1 }, rarity: 'rare' }),
  ilyra_amulet: I('ilyra_amulet', "Ilyra's Amulet", 'quest', 'crest', 'A silver crescent. It is warm to the touch, and the wearer feels watched — kindly.', 0, { rarity: 'very rare' }),
  gold_pouch: I('gold_pouch', 'Pouch of Coins', 'misc', 'coin', 'Sixty-four gold pieces, most of them real.', 64),
};

export const PLACEHOLDER_FEATS: Record<string, FeatDef> = {};
for (const c of Object.values(PLACEHOLDER_CLASSES)) for (const l of c.levelUpChoices) PLACEHOLDER_FEATS[l.id] = { id: l.id, name: l.name, description: l.description };

const tables: ContentTables = { classes: {}, abilities: {}, items: {}, feats: {} };
let loaded = false;
// The real tables (content agent). Pure data, safe to import statically; placeholders above fill any gaps.
try { setContent({ classes: CLASSES as Record<string, ClassDef>, feats: FEATS, abilities: ABILITIES, items: ITEMS }); loaded = true; } catch { /* keep placeholders */ }

/** Merge real content tables in (lead may call this directly instead of relying on the dynamic import). */
export function setContent(t: Partial<ContentTables>) {
  if (t.classes) Object.assign(tables.classes, t.classes);
  if (t.abilities) Object.assign(tables.abilities, t.abilities);
  if (t.items) Object.assign(tables.items, t.items);
  if (t.feats) Object.assign(tables.feats, t.feats);
}
function pickTable(m: any, ...names: string[]): Record<string, any> | null {
  for (const n of names) { const v = m?.[n]; if (v && typeof v === 'object') return Array.isArray(v) ? Object.fromEntries(v.map((x: any) => [x.id, x])) : v; }
  return null;
}
/** Merge any tables published on `globalThis.__hmContent` (optional hook). Safe to call repeatedly. */
export async function loadContent(): Promise<boolean> {
  const g = (globalThis as any).__hmContent;
  if (g) setContent({ classes: pickTable(g, 'CLASSES', 'classes') ?? undefined, abilities: pickTable(g, 'ABILITIES', 'abilities') ?? undefined, items: pickTable(g, 'ITEMS', 'items') ?? undefined, feats: pickTable(g, 'FEATS', 'feats') ?? undefined });
  loaded = Object.keys(tables.classes).length > 0;
  return loaded;
}
export const contentLoaded = () => loaded;

export const getClass = (id: string | undefined | null): ClassDef => (id && (tables.classes[id] ?? PLACEHOLDER_CLASSES[id])) || PLACEHOLDER_CLASSES.fighter;
export const getAbility = (id: string): AbilityDef => tables.abilities[id] ?? PLACEHOLDER_ABILITIES[id] ?? { id, name: prettify(id), icon: 'sparkle', kind: 'utility', description: '' };
export const getItem = (id: string): ItemDef => tables.items[id] ?? PLACEHOLDER_ITEMS[id] ?? { id, name: prettify(id), kind: 'misc', icon: 'bag', description: '', value: 0 };
export const getFeat = (id: string): FeatDef => tables.feats[id] ?? PLACEHOLDER_FEATS[id] ?? { id, name: prettify(id), description: '' };
export const classList = (): ClassDef[] => {
  const ids: ClassId[] = ['fighter', 'wizard', 'rogue', 'barbarian'];
  return ids.map((id) => getClass(id));
};
/** Substitute {name} {class} {weapon} in quest/tutorial text. */
export function questText(world: any, s: string): string {
  const p = world?.player; const cls = getClass(p?.classId);
  const mh = world?.equipment?.mainHand; const weapon = mh ? getItem(mh).name.toLowerCase() : (cls.weapon ? prettify(String(cls.weapon).replace(/_\dhanded$/, '')).toLowerCase() : 'weapon');
  return s.replace(/\{name\}/g, p?.name ?? 'Tav').replace(/\{class\}/g, cls.name.toLowerCase()).replace(/\{Class\}/g, cls.name).replace(/\{weapon\}/g, weapon);
}
export const prettify = (id: string) => id.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, (c) => c.toUpperCase());
export const RARITY_COLOR: Record<string, string> = { common: '#d9d3c4', uncommon: '#5ec97a', rare: '#5a9cf0', 'very rare': '#b26be6', legendary: '#f0a33a' };
export const SKILL_NAME: Record<string, string> = {
  athletics: 'Athletics', acrobatics: 'Acrobatics', sleightOfHand: 'Sleight of Hand', stealth: 'Stealth', arcana: 'Arcana', history: 'History', investigation: 'Investigation',
  nature: 'Nature', religion: 'Religion', animalHandling: 'Animal Handling', insight: 'Insight', medicine: 'Medicine', perception: 'Perception', survival: 'Survival',
  deception: 'Deception', intimidation: 'Intimidation', performance: 'Performance', persuasion: 'Persuasion',
};
export const ABILITY_NAME: Record<string, string> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
export const RESOURCE_NAME: Record<string, string> = { spellSlots1: 'Spell Slot', secondWind: 'Second Wind', actionSurge: 'Action Surge', rage: 'Rage', sneakAttack: 'Sneak Attack', hunterMark: "Hunter's Mark", stamina: 'Stamina' };
