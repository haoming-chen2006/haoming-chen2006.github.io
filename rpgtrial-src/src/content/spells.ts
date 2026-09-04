// Ability / spell table (pure data). sim/abilities.ts executes them by id.
// Anim conventions: Spellcast_Shoot = projectiles, Spellcast_Raise = buffs/heals, Spellcast_Long = big area spells.
import type { AbilityDef } from '../sim/types.ts';

export const ABILITIES: Record<string, AbilityDef> = {
  // ---------------- fighter ----------------
  secondWind: { id: 'secondWind', name: 'Second Wind', icon: 'heart', kind: 'heal', description: 'Catch your breath: heal 1d10 + level. Recharges on a short rest.',
    cost: { resource: 'secondWind', amount: 1 }, castTime: 0.45, anim: 'Spellcast_Raise', damage: '1d10' },
  actionSurge: { id: 'actionSurge', name: 'Action Surge', icon: 'bolt', kind: 'buff', description: 'Push past your limits: stamina refills and you attack 35% faster for 6 s. Recharges on a short rest.',
    cost: { resource: 'actionSurge', amount: 1 }, castTime: 0.3, anim: 'Cheer' },
  shieldBash: { id: 'shieldBash', name: 'Shield Bash', icon: 'shield', kind: 'attack', description: 'Slam your shield into a foe: 1d4 + Str bludgeoning and a guaranteed stagger.',
    cooldown: 6, castTime: 0, anim: 'Block_Attack', damage: '1d4', damageType: 'bludgeoning', range: 2.2 },
  // ---------------- wizard ----------------
  fireBolt: { id: 'fireBolt', name: 'Fire Bolt', icon: 'fire', kind: 'spell', level: 0, description: 'Cantrip. A mote of fire: ranged spell attack, 1d10 fire.',
    castTime: 0.4, anim: 'Spellcast_Shoot', damage: '1d10', damageType: 'fire', range: 24, projectile: 'fireBolt', cooldown: 0.6 },
  rayOfFrost: { id: 'rayOfFrost', name: 'Ray of Frost', icon: 'frost', kind: 'spell', level: 0, description: 'Cantrip. A beam of cold: 1d8 cold and the target is slowed for 4 s.',
    castTime: 0.5, anim: 'Spellcast_Shoot', damage: '1d8', damageType: 'cold', range: 18, projectile: 'rayOfFrost', cooldown: 1.2 },
  magicMissile: { id: 'magicMissile', name: 'Magic Missile', icon: 'missile', kind: 'spell', level: 1, description: 'Three darts of force, 1d4+1 each. They never miss.',
    cost: { resource: 'spellSlots1', amount: 1 }, castTime: 0.6, anim: 'Spellcast_Shoot', damage: '1d4+1', damageType: 'force', range: 24, projectile: 'magicMissile', cooldown: 1.5 },
  thunderwave: { id: 'thunderwave', name: 'Thunderwave', icon: 'thunder', kind: 'spell', level: 1, description: 'A wave of thunderous force in front of you: 2d8, Con save for half; those who fail are hurled back.',
    cost: { resource: 'spellSlots1', amount: 1 }, castTime: 0.8, anim: 'Spellcast_Long', damage: '2d8', damageType: 'force', radius: 4.5, save: { ability: 'con', dc: 'spell' }, cooldown: 2 },
  shield: { id: 'shield', name: 'Shield', icon: 'ward', kind: 'buff', level: 1, description: 'Hold Q: an invisible barrier gives +5 AC against attacks while raised. No slot cost, but each blocked hit drains stamina.',
    anim: 'Spellcasting' },
  // ---------------- rogue ----------------
  cunningDash: { id: 'cunningDash', name: 'Cunning Action: Dash', icon: 'dash', kind: 'buff', description: 'Move like smoke: sprinting is free and 20% faster for 6 s.',
    cooldown: 12, castTime: 0, anim: '' },
  smokeBomb: { id: 'smokeBomb', name: 'Smoke Bomb', icon: 'smoke', kind: 'utility', description: 'Throw a smoke bomb: nearby enemies lose track of you for 3 s. Attacks from behind or on staggered foes deal Sneak Attack damage.',
    cost: { resource: 'smokeBomb', amount: 1 }, castTime: 0.5, anim: 'Throw', radius: 7 },
  throwDagger: { id: 'throwDagger', name: 'Throw Dagger', icon: 'dagger', kind: 'attack', description: 'Hurl a dagger: ranged attack, 1d4 + Dex piercing. Sneak Attack applies against staggered foes.',
    cooldown: 0.9, castTime: 0.35, anim: 'Throw', damage: '1d4', damageType: 'piercing', range: 18, projectile: 'dagger' },
  // ---------------- barbarian ----------------
  rage: { id: 'rage', name: 'Rage', icon: 'rage', kind: 'buff', description: 'Fury: resistance to slashing, piercing and bludgeoning, +2 damage, and heavier hits stagger you less. Lasts 10 s.',
    cost: { resource: 'rage', amount: 1 }, castTime: 0.5, anim: 'Cheer' },
  recklessAttack: { id: 'recklessAttack', name: 'Reckless Attack', icon: 'reckless', kind: 'buff', description: 'Throw caution away: advantage on your attack rolls for 8 s, but enemies have advantage against you.',
    cooldown: 10, castTime: 0.2, anim: 'Spellcast_Raise' },
  whirlwind: { id: 'whirlwind', name: 'Whirlwind', icon: 'whirl', kind: 'attack', description: 'Spin with your axe: hits everything around you for weapon damage.',
    cooldown: 8, castTime: 0, anim: '2H_Melee_Attack_Spinning' },
  // ---------------- companion (Ilyra) ----------------
  sacredFlame: { id: 'sacredFlame', name: 'Sacred Flame', icon: 'radiant', kind: 'spell', level: 0, description: 'Flame-like radiance descends on a foe: Dex save or 1d8 radiant.',
    castTime: 0.7, anim: 'Spellcast_Shoot', damage: '1d8', damageType: 'radiant', range: 18, projectile: 'sacredFlame', save: { ability: 'dex', dc: 13 }, cooldown: 3 },
  healingWord: { id: 'healingWord', name: 'Healing Word', icon: 'heal', kind: 'heal', description: 'A word of mending: heal 1d4+3 at range.',
    castTime: 0.5, anim: 'Spellcast_Raise', damage: '1d4+3', range: 18 },
  // ---------------- enemies ----------------
  necroticBolt: { id: 'necroticBolt', name: 'Necrotic Bolt', icon: 'necrotic', kind: 'spell', description: 'A bolt of grave-cold: ranged spell attack, 1d8 necrotic.',
    castTime: 0.85, anim: 'Spellcast_Shoot', damage: '1d8', damageType: 'necrotic', range: 20, projectile: 'necroticBolt', cooldown: 3 },
  summonMinions: { id: 'summonMinions', name: 'Raise the Fallen', icon: 'summon', kind: 'utility', description: 'The Hollow Knight calls two minions from the floor.',
    castTime: 2.2, anim: 'Spellcast_Summon' },
};

export const getAbility = (id: string): AbilityDef | undefined => ABILITIES[id];
