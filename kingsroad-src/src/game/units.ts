import type { Look, UnitDef } from './types.ts';

const look = (color: string, accent: string, weapon: Look['weapon'], size: number, shape: Look['shape']): Look => ({ color, accent, shape, weapon, size });

type Spec = Partial<UnitDef> & Pick<UnitDef, 'id' | 'name' | 'look' | 'hp' | 'damage' | 'armor' | 'resist' | 'hitSpeed' | 'range' | 'speed' | 'radius' | 'kind'>;

const mk = (s: Spec): UnitDef => ({
  desc: '', hpGrowth: 0, damageGrowth: 0, power: 0, powerGrowth: 0, armorGrowth: 0, resistGrowth: 0, attackSpeedGrowth: 0, sight: 7, flying: false,
  targets: 'both', splash: 0, mana: 0, manaRegen: 0, hpRegen: 0, attackType: 'physical', skills: [], role: 'warrior', ...s,
});

/** Minions scale with match time (see minions.ts); these are the 0:00 values. */
export const MINIONS: Record<string, UnitDef> = {
  melee: mk({ id: 'melee', name: '近战兵', kind: 'minion', minionType: 'melee', look: { ...look('#8d94a0', '#c9a24a', 'sword', 0.3, 'humanoid'), armor: 'plate', skin: '#a9b0b8', cape: false, eyeGlow: true }, hp: 520, damage: 48, armor: 20, resist: 20, hitSpeed: 1.0, range: 0.9, speed: 3.0, radius: 0.32, sight: 6 }),
  ranged: mk({ id: 'ranged', name: '远程兵', kind: 'minion', minionType: 'ranged', look: { ...look('#8d94a0', '#c9a24a', 'bow', 0.28, 'humanoid'), armor: 'leather', skin: '#a9b0b8', cape: false, eyeGlow: true }, hp: 380, damage: 62, armor: 10, resist: 10, hitSpeed: 1.2, range: 4.5, speed: 3.0, radius: 0.3, sight: 7, projectile: 'arrow', projectileSpeed: 11 }),
  siege: mk({ id: 'siege', name: '炮车', kind: 'minion', minionType: 'siege', look: look('#6e5d4a', '#c9b48f', 'bomb', 0.42, 'brute'), hp: 1100, damage: 130, armor: 40, resist: 40, hitSpeed: 2.0, range: 6.5, speed: 2.6, radius: 0.45, sight: 8, projectile: 'rock', projectileSpeed: 8, splash: 0.8 }),
  super: mk({ id: 'super', name: '超级兵', kind: 'minion', minionType: 'super', look: look('#9a3b7a', '#ffb0e8', 'hammer', 0.5, 'brute'), hp: 2600, damage: 170, armor: 70, resist: 70, hitSpeed: 1.2, range: 1.1, speed: 3.1, radius: 0.5, sight: 7 }),
};

export const MONSTERS: Record<string, UnitDef> = {
  blueSentinel: mk({ id: 'blueSentinel', name: '寒冰魔', kind: 'monster', look: look('#3b6fd6', '#bfe0ff', 'none', 0.55, 'brute'), hp: 2000, hpGrowth: 180, damage: 110, damageGrowth: 10, armor: 40, resist: 40, hitSpeed: 1.3, range: 1.2, speed: 2.6, radius: 0.55, monster: { gold: 90, xp: 220, buff: 'blue', leash: 8 } }),
  redSentinel: mk({ id: 'redSentinel', name: '赤炎魔', kind: 'monster', look: look('#c43b3b', '#ffb8a8', 'none', 0.55, 'brute'), hp: 2200, hpGrowth: 190, damage: 130, damageGrowth: 12, armor: 45, resist: 45, hitSpeed: 1.3, range: 1.2, speed: 2.6, radius: 0.55, monster: { gold: 90, xp: 220, buff: 'red', leash: 8 } }),
  wolf: mk({ id: 'wolf', name: '野狼', kind: 'monster', look: look('#6d6a66', '#d0ccc4', 'none', 0.36, 'beast'), hp: 650, hpGrowth: 60, damage: 60, damageGrowth: 6, armor: 20, resist: 20, hitSpeed: 1.0, range: 0.9, speed: 3.4, radius: 0.36, monster: { gold: 35, xp: 70, leash: 7 } }),
  toad: mk({ id: 'toad', name: '刺猬', kind: 'monster', look: look('#5f8a3a', '#cfe8a0', 'none', 0.5, 'beast'), hp: 1500, hpGrowth: 130, damage: 95, damageGrowth: 9, armor: 30, resist: 30, hitSpeed: 1.5, range: 1.1, speed: 2.4, radius: 0.5, monster: { gold: 80, xp: 170, leash: 7 } }),
  raptor: mk({ id: 'raptor', name: '乌鸦', kind: 'monster', look: look('#a86a3a', '#ffd9a0', 'none', 0.34, 'flyer'), hp: 560, hpGrowth: 55, damage: 55, damageGrowth: 6, armor: 15, resist: 15, hitSpeed: 0.9, range: 0.9, speed: 3.6, radius: 0.34, monster: { gold: 32, xp: 65, leash: 7 } }),
  golem: mk({ id: 'golem', name: '岩石怪', kind: 'monster', look: look('#7a7466', '#cfc8b8', 'none', 0.55, 'brute'), hp: 1300, hpGrowth: 120, damage: 90, damageGrowth: 9, armor: 50, resist: 30, hitSpeed: 1.6, range: 1.2, speed: 2.3, radius: 0.55, monster: { gold: 55, xp: 120, leash: 7 } }),
  stag: mk({ id: 'stag', name: '野猪', kind: 'monster', look: look('#8a6a4a', '#f0d9b0', 'none', 0.45, 'beast'), hp: 1200, hpGrowth: 110, damage: 80, damageGrowth: 8, armor: 25, resist: 25, hitSpeed: 1.2, range: 1.0, speed: 3.6, radius: 0.45, monster: { gold: 70, xp: 150, leash: 7 } }),
  tyrant: mk({ id: 'tyrant', name: '暴君', kind: 'monster', look: look('#8a2d2d', '#ffb347', 'none', 1.1, 'dragon'), hp: 9000, hpGrowth: 700, damage: 260, damageGrowth: 20, armor: 90, resist: 90, hitSpeed: 1.5, range: 2.2, speed: 2.2, radius: 1.1, sight: 9, splash: 1.5, monster: { gold: 120, xp: 400, buff: 'tyrant', leash: 9, boss: true } }),
  overlord: mk({ id: 'overlord', name: '主宰', kind: 'monster', look: look('#4a2d8a', '#d8b0ff', 'none', 1.25, 'dragon'), hp: 14000, hpGrowth: 900, damage: 340, damageGrowth: 25, armor: 110, resist: 110, hitSpeed: 1.6, range: 2.4, speed: 2.0, radius: 1.25, sight: 9, splash: 1.8, monster: { gold: 150, xp: 600, buff: 'overlord', leash: 9, boss: true } }),
};

export const UNIT_DEFS: Record<string, UnitDef> = { ...MINIONS, ...MONSTERS };
