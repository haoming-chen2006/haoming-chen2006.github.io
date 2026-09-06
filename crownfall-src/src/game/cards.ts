import type { AbilityDef, BuildingDef, CardDef, Look, SpellDef, TroopDef } from './types.ts';
import { SIGHT_DEFAULT } from './constants.ts';

type TroopInput = Omit<TroopDef, 'kind' | 'sight' | 'splash' | 'splashAir' | 'radius' | 'deployTime' | 'loadTime' | 'flying' | 'count' | 'possessable' | 'rarity'> &
  Partial<Pick<TroopDef, 'sight' | 'splash' | 'splashAir' | 'radius' | 'deployTime' | 'loadTime' | 'flying' | 'count' | 'possessable' | 'rarity'>>;

const troop = (t: TroopInput): TroopDef => ({
  kind: 'troop', sight: SIGHT_DEFAULT, splash: 0, splashAir: false, radius: 0.45, deployTime: 1.0, loadTime: 0.35,
  flying: false, count: 1, possessable: true, rarity: 'common', ...t,
});

const look = (color: string, accent: string, shape: Look['shape'], weapon: Look['weapon'], size: number): Look => ({ color, accent, shape, weapon, size });
const ability = (a: AbilityDef): AbilityDef => a;

export const TROOPS: TroopDef[] = [
  troop({
    id: 'knight', name: 'Knight', cost: 3, role: 'tank',
    desc: 'A sturdy melee fighter. Cheap, reliable, and hard to kill.',
    hp: 1400, damage: 160, hitSpeed: 1.1, range: 0.8, speed: 1.0, targets: 'ground', radius: 0.5,
    look: look('#8fa3b8', '#3b4b5c', 'humanoid', 'sword', 0.5),
    ability: ability({ kind: 'dashStrike', name: 'Shield Bash', desc: 'Charge forward, stunning and knocking back everything in your path.', cooldown: 7, range: 3.5, damage: 220, stun: 1.0, knockback: 1.3, color: '#cfe3ff' }),
  }),
  troop({
    id: 'archers', name: 'Archers', cost: 3, role: 'ranged', count: 2,
    desc: 'Two ranged archers that shoot ground and air targets.',
    hp: 300, damage: 90, hitSpeed: 1.0, range: 5.0, speed: 1.0, targets: 'both', projectile: 'arrow', projectileSpeed: 10, radius: 0.4,
    look: look('#7bb661', '#d4a76a', 'humanoid', 'bow', 0.42),
    ability: ability({ kind: 'aoeAim', name: 'Rain of Arrows', desc: 'Call down a volley of arrows on a target area.', cooldown: 8, range: 6, radius: 2.2, damage: 190, color: '#d8f0b0' }),
  }),
  troop({
    id: 'spearlings', name: 'Spearlings', cost: 2, role: 'ranged', count: 3,
    desc: 'Three quick goblins that throw spears at anything.',
    hp: 110, damage: 60, hitSpeed: 1.1, range: 4.5, speed: 2.0, targets: 'both', projectile: 'spear', projectileSpeed: 11, radius: 0.35,
    look: look('#4fbf6b', '#c9b458', 'humanoid', 'spear', 0.36),
    ability: ability({ kind: 'spreadShot', name: 'Spear Fan', desc: 'Hurl five spears in a wide fan.', cooldown: 6, count: 5, spread: 0.9, damage: 85, range: 6.5, color: '#c9b458' }),
  }),
  troop({
    id: 'raiders', name: 'Raiders', cost: 2, role: 'swarm', count: 3,
    desc: 'Three fast, fragile knife-fighters. Great at swarming a distracted target.',
    hp: 180, damage: 110, hitSpeed: 1.0, range: 0.6, speed: 2.0, targets: 'ground', radius: 0.35,
    look: look('#3f9b4f', '#6b3b2e', 'humanoid', 'dagger', 0.36),
    ability: ability({ kind: 'selfBuff', name: 'Adrenaline', desc: 'Move and strike 60% faster for 4 seconds.', cooldown: 9, duration: 4, buff: { speed: 1.6, attack: 1.6 }, color: '#8dff8d' }),
  }),
  troop({
    id: 'colossus', name: 'Colossus', cost: 5, role: 'wincon', rarity: 'rare',
    desc: 'A slow giant that only attacks buildings. Soaks a huge amount of damage.',
    hp: 3600, damage: 220, hitSpeed: 1.5, range: 0.9, speed: 0.75, targets: 'buildings', radius: 0.75,
    look: look('#c48a5a', '#5c3d2e', 'brute', 'none', 0.8),
    ability: ability({ kind: 'aoeSelf', name: 'Ground Slam', desc: 'Slam the ground, damaging, stunning and hurling back nearby enemies.', cooldown: 10, radius: 2.8, damage: 320, stun: 0.8, knockback: 2.2, color: '#e0b080' }),
  }),
  troop({
    id: 'sharpshooter', name: 'Sharpshooter', cost: 4, role: 'ranged', rarity: 'rare',
    desc: 'A long-range musketeer with high single-target damage.',
    hp: 620, damage: 190, hitSpeed: 1.1, range: 6.0, speed: 1.0, targets: 'both', projectile: 'bolt', projectileSpeed: 14,
    look: look('#6f5bd1', '#e8d8a0', 'humanoid', 'rifle', 0.45),
    ability: ability({ kind: 'lineShot', name: 'Piercing Shot', desc: 'Fire a round that passes through every enemy in a line.', cooldown: 8, damage: 430, range: 9, color: '#f3e7b3' }),
  }),
  troop({
    id: 'pyromancer', name: 'Pyromancer', cost: 5, role: 'splash', rarity: 'rare',
    desc: 'Throws fireballs that splash on impact. Melts swarms and air alike.',
    hp: 680, damage: 230, hitSpeed: 1.4, range: 5.5, speed: 1.0, targets: 'both', splash: 1.5, splashAir: true, projectile: 'fireball', projectileSpeed: 8,
    look: look('#e06a3a', '#f7d05a', 'humanoid', 'staff', 0.45),
    ability: ability({ kind: 'aoeAim', name: 'Firestorm', desc: 'Ignite an area, dealing heavy damage and setting enemies ablaze.', cooldown: 9, range: 6, radius: 2.6, damage: 330, burn: 60, color: '#ff7a2a' }),
  }),
  troop({
    id: 'berserker', name: 'Berserker', cost: 4, role: 'splash', rarity: 'rare',
    desc: 'Swings a great axe in a full circle, hitting every ground unit nearby.',
    hp: 1750, damage: 200, hitSpeed: 1.5, range: 0.9, speed: 1.0, targets: 'ground', splash: 1.3, radius: 0.55,
    look: look('#c94a5a', '#f1c27d', 'humanoid', 'axe', 0.5),
    ability: ability({ kind: 'spin', name: 'Whirlwind', desc: 'Spin for 2.5s while moving faster, shredding everything around you.', cooldown: 10, duration: 2.5, tick: 0.4, damage: 115, radius: 1.7, buff: { speed: 1.3, attack: 1 }, color: '#ff9a9a' }),
  }),
  troop({
    id: 'drake', name: 'Drake', cost: 4, role: 'air', rarity: 'epic', flying: true,
    desc: 'A flying drake that breathes splashing fire. Ignores ground obstacles.',
    hp: 1150, damage: 150, hitSpeed: 1.5, range: 3.5, speed: 1.5, targets: 'both', splash: 1.2, splashAir: true, projectile: 'flame', projectileSpeed: 7, radius: 0.6,
    look: look('#5aa860', '#f2b134', 'dragon', 'none', 0.6),
    ability: ability({ kind: 'cone', name: 'Inferno Breath', desc: 'Unleash a stream of fire in front of you for 1.6s.', cooldown: 9, duration: 1.6, tick: 0.25, damage: 75, range: 3.8, spread: 0.9, burn: 40, color: '#ffb347' }),
  }),
  troop({
    id: 'imps', name: 'Imps', cost: 3, role: 'air', count: 3, flying: true,
    desc: 'Three fast flying imps. Fragile but hard to reach.',
    hp: 200, damage: 85, hitSpeed: 1.0, range: 1.8, speed: 1.5, targets: 'both', projectile: 'shadow', projectileSpeed: 9, radius: 0.35,
    look: look('#6a5acd', '#d6d6ff', 'flyer', 'none', 0.35),
    ability: ability({ kind: 'dashStrike', name: 'Dive', desc: 'Dive through enemies, slashing everything you pass.', cooldown: 6, range: 3.8, damage: 170, color: '#c9c0ff' }),
  }),
  troop({
    id: 'boar', name: 'Boar Rider', cost: 4, role: 'wincon', rarity: 'rare',
    desc: 'Charges straight for buildings at high speed. A classic tower-pressure card.',
    hp: 1550, damage: 265, hitSpeed: 1.6, range: 0.8, speed: 2.0, targets: 'buildings', radius: 0.55,
    look: look('#8b5a2b', '#d9a066', 'beast', 'hammer', 0.55),
    ability: ability({ kind: 'dashStrike', name: 'Stampede', desc: 'Stampede forward; triple damage to buildings you crash into.', cooldown: 9, range: 4.5, damage: 210, buildingMult: 3, knockback: 1.5, color: '#ffd9a0' }),
  }),
  troop({
    id: 'lancer', name: 'Lancer', cost: 5, role: 'dps', rarity: 'epic',
    desc: 'After moving uninterrupted for a moment, charges with double damage.',
    hp: 1650, damage: 330, hitSpeed: 1.4, range: 1.0, speed: 1.0, targets: 'ground', radius: 0.55, charge: { delay: 1.5, speedMult: 2.0, dmgMult: 2.0 },
    look: look('#d4af37', '#2f3e5c', 'beast', 'lance', 0.55),
    ability: ability({ kind: 'dashStrike', name: 'Lance Charge', desc: 'A long thundering charge that skewers everything in its path.', cooldown: 10, range: 6.5, damage: 520, knockback: 1.0, color: '#ffe680' }),
  }),
  troop({
    id: 'bonehorde', name: 'Bone Horde', cost: 3, role: 'swarm', count: 12,
    desc: 'Twelve skeletons. Overwhelms single-target attackers, dies to any splash.',
    hp: 80, damage: 70, hitSpeed: 1.0, range: 0.5, speed: 1.5, targets: 'ground', radius: 0.28, deployTime: 1.0,
    look: look('#e8e8e8', '#333333', 'skeleton', 'dagger', 0.28),
    ability: ability({ kind: 'summon', name: 'Raise Dead', desc: 'Raise four skeletons at your side.', cooldown: 9, unit: 'bonehorde', count: 4, color: '#e8e8e8' }),
  }),
  troop({
    id: 'reaper', name: 'Reaper', cost: 4, role: 'dps', rarity: 'rare',
    desc: 'Slow swings, enormous damage. Deletes tanks.',
    hp: 1100, damage: 620, hitSpeed: 1.8, range: 0.8, speed: 1.5, targets: 'ground', radius: 0.5,
    look: look('#2b2d42', '#8d99ae', 'humanoid', 'scythe', 0.5),
    ability: ability({ kind: 'leap', name: 'Death Leap', desc: 'Leap to a spot and crash down with a devastating strike.', cooldown: 9, range: 5, radius: 1.5, damage: 460, color: '#b8c4e0' }),
  }),
  troop({
    id: 'bombardier', name: 'Bombardier', cost: 2, role: 'splash',
    desc: 'Lobs bombs that splash ground units. Cannot hit air.',
    hp: 300, damage: 180, hitSpeed: 1.9, range: 4.5, speed: 1.0, targets: 'ground', splash: 1.5, projectile: 'bomb', projectileSpeed: 7, radius: 0.4,
    look: look('#dcdcdc', '#333333', 'skeleton', 'bomb', 0.38),
    ability: ability({ kind: 'aoeAim', name: 'Cluster Bomb', desc: 'Lob a huge bomb with a wide blast radius.', cooldown: 8, range: 5.5, radius: 2.8, damage: 270, knockback: 1.0, color: '#ffc46b' }),
  }),
  troop({
    id: 'cleric', name: 'Cleric', cost: 4, role: 'support', rarity: 'rare',
    desc: 'Heals nearby allies over time while attacking from range.',
    hp: 750, damage: 70, hitSpeed: 1.2, range: 4.0, speed: 1.0, targets: 'both', projectile: 'holy', projectileSpeed: 9, healAura: { radius: 3.0, hps: 28 },
    look: look('#f5f0e1', '#e0b84c', 'humanoid', 'book', 0.45),
    ability: ability({ kind: 'healBurst', name: 'Sanctuary', desc: 'Instantly heal nearby allies and shield yourself.', cooldown: 12, radius: 3.5, heal: 360, shield: 320, color: '#fff2b0' }),
  }),
  troop({
    id: 'wraith', name: 'Wraith', cost: 3, role: 'assassin', rarity: 'epic',
    desc: 'A blindingly fast assassin. Made for possession.',
    hp: 520, damage: 260, hitSpeed: 0.9, range: 0.7, speed: 2.0, targets: 'ground', radius: 0.42,
    look: look('#3d2c5a', '#b67cff', 'wraith', 'dagger', 0.42),
    ability: ability({ kind: 'blink', name: 'Shadowstep', desc: 'Teleport a short distance. Your next strike deals triple damage.', cooldown: 7, range: 5, critMult: 3, color: '#c58cff' }),
  }),
  troop({
    id: 'stormcaller', name: 'Stormcaller', cost: 5, role: 'ranged', rarity: 'epic',
    desc: 'Bolts chain to nearby enemies and briefly stun them.',
    hp: 560, damage: 120, hitSpeed: 1.6, range: 5.0, speed: 1.0, targets: 'both', projectile: 'bolt', projectileSpeed: 16, chain: { count: 2, range: 2.5, stun: 0.4 },
    look: look('#3a7bd5', '#9fd3ff', 'humanoid', 'orb', 0.45),
    ability: ability({ kind: 'chain', name: 'Thunderstorm', desc: 'Lightning leaps between up to six nearby enemies, stunning each.', cooldown: 10, count: 6, range: 5, damage: 270, stun: 0.8, color: '#bfe6ff' }),
  }),
];

export const BUILDINGS: BuildingDef[] = [
  {
    kind: 'building', id: 'cannon', name: 'Cannon', cost: 3, rarity: 'common',
    desc: 'A defensive cannon that shoots ground units. Lasts 30 seconds.',
    hp: 720, damage: 125, hitSpeed: 0.9, range: 5.5, targets: 'ground', lifetime: 30, radius: 0.6, deployTime: 1.0, projectile: 'cannonball', projectileSpeed: 11,
    look: look('#555b66', '#8a6d3b', 'building', 'none', 0.6),
  },
  {
    kind: 'building', id: 'arctower', name: 'Arc Tower', cost: 4, rarity: 'rare',
    desc: 'Zaps ground and air targets. Lasts 35 seconds.',
    hp: 760, damage: 135, hitSpeed: 1.0, range: 5.5, targets: 'both', lifetime: 35, radius: 0.55, deployTime: 1.0, projectile: 'bolt', projectileSpeed: 18,
    look: look('#4fa3e0', '#e8f4ff', 'building', 'none', 0.55),
  },
  {
    kind: 'building', id: 'barracks', name: 'Barracks', cost: 5, rarity: 'rare',
    desc: 'Trains a Spearling every 4.5 seconds for 40 seconds.',
    hp: 950, damage: 0, hitSpeed: 1, range: 0, targets: 'ground', lifetime: 40, radius: 0.7, deployTime: 1.0,
    spawn: { unit: 'spearlings', every: 4.5, count: 1, initialDelay: 1.0 },
    look: look('#7a5c3a', '#4fbf6b', 'building', 'none', 0.7),
  },
];

export const SPELLS: SpellDef[] = [
  { kind: 'spell', id: 'meteor', name: 'Meteor', cost: 4, rarity: 'rare', desc: 'Heavy area damage with knockback. Reduced damage to towers.', radius: 2.5, damage: 620, towerMult: 0.4, delay: 1.5, hitsAir: true, knockback: 1.6, effect: 'meteor', look: look('#ff6a2a', '#ffd27a', 'building', 'none', 0.5) },
  { kind: 'spell', id: 'volley', name: 'Volley', cost: 3, rarity: 'common', desc: 'A wide rain of arrows. Wipes swarms and imps.', radius: 4.0, damage: 260, towerMult: 0.4, delay: 1.0, hitsAir: true, effect: 'volley', look: look('#a0c4ff', '#d0e8ff', 'building', 'none', 0.5) },
  { kind: 'spell', id: 'shock', name: 'Shock', cost: 2, rarity: 'common', desc: 'Instant small area damage that stuns and resets targeting.', radius: 2.5, damage: 160, towerMult: 0.4, delay: 0.15, hitsAir: true, stun: 0.7, effect: 'shock', look: look('#7ee8fa', '#ffffff', 'building', 'none', 0.5) },
  { kind: 'spell', id: 'frenzy', name: 'Frenzy', cost: 2, rarity: 'epic', desc: 'Allies in the area move and attack 35% faster for 7 seconds.', radius: 3.0, damage: 0, towerMult: 0, delay: 0.2, hitsAir: true, rage: { duration: 7, speed: 1.35, attack: 1.35 }, effect: 'frenzy', look: look('#d84cff', '#ffb3ff', 'building', 'none', 0.5) },
  { kind: 'spell', id: 'frost', name: 'Frost', cost: 4, rarity: 'epic', desc: 'Freezes enemy units and buildings in the area for 4 seconds.', radius: 3.0, damage: 90, towerMult: 0.4, delay: 0.6, hitsAir: true, freeze: 3.5, effect: 'frost', look: look('#bfefff', '#ffffff', 'building', 'none', 0.5) },
];

export const ALL_CARDS: CardDef[] = [...TROOPS, ...BUILDINGS, ...SPELLS];
export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));
export const cardById = (id: string): CardDef => {
  const c = CARD_BY_ID[id];
  if (!c) throw new Error(`unknown card ${id}`);
  return c;
};
export const troopById = (id: string): TroopDef => {
  const c = cardById(id);
  if (c.kind !== 'troop') throw new Error(`${id} is not a troop`);
  return c;
};

export const PRESET_DECKS: Record<string, string[]> = {
  Vanguard: ['knight', 'archers', 'colossus', 'sharpshooter', 'pyromancer', 'boar', 'meteor', 'shock'],
  Swarm: ['raiders', 'spearlings', 'bonehorde', 'imps', 'berserker', 'cleric', 'frenzy', 'volley'],
  Nightfall: ['colossus', 'lancer', 'reaper', 'drake', 'wraith', 'stormcaller', 'frost', 'arctower'],
  Siege: ['boar', 'lancer', 'bombardier', 'cannon', 'barracks', 'archers', 'meteor', 'knight'],
};

export const DEFAULT_DECK = PRESET_DECKS.Vanguard;

export const cardsFromIds = (ids: string[]): CardDef[] => ids.map(cardById);
export const avgCost = (cards: CardDef[]): number => cards.reduce((s, c) => s + c.cost, 0) / Math.max(1, cards.length);
