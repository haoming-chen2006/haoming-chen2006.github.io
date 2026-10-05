import type { AbilityDef, Look, Role, UnitDef } from './types.ts';

type HeroSpec = Omit<UnitDef, 'kind' | 'desc' | 'splash' | 'flying' | 'targets' | 'sight'> & { desc?: string; splash?: number; sight?: number };

const base = (role: Role): Pick<UnitDef, 'hpRegen' | 'manaRegen' | 'attackSpeedGrowth' | 'resistGrowth' | 'armorGrowth' | 'powerGrowth' | 'damageGrowth' | 'hpGrowth'> => {
  switch (role) {
    case 'tank': return { hpGrowth: 310, damageGrowth: 12, powerGrowth: 0, armorGrowth: 22, resistGrowth: 14, attackSpeedGrowth: 0.012, hpRegen: 9, manaRegen: 2.5 } as never;
    case 'warrior': return { hpGrowth: 265, damageGrowth: 15, powerGrowth: 0, armorGrowth: 18, resistGrowth: 11, attackSpeedGrowth: 0.02, hpRegen: 7, manaRegen: 2.2 } as never;
    case 'assassin': return { hpGrowth: 265, damageGrowth: 18, powerGrowth: 0, armorGrowth: 15, resistGrowth: 9, attackSpeedGrowth: 0.025, hpRegen: 6, manaRegen: 2.5 } as never;
    case 'mage': return { hpGrowth: 200, damageGrowth: 8, powerGrowth: 24, armorGrowth: 12, resistGrowth: 9, attackSpeedGrowth: 0.012, hpRegen: 5, manaRegen: 4.5 } as never;
    case 'marksman': return { hpGrowth: 215, damageGrowth: 20, powerGrowth: 0, armorGrowth: 13, resistGrowth: 5, attackSpeedGrowth: 0.03, hpRegen: 5, manaRegen: 2.2 } as never;
    case 'support': return { hpGrowth: 250, damageGrowth: 10, powerGrowth: 16, armorGrowth: 17, resistGrowth: 9, attackSpeedGrowth: 0.012, hpRegen: 8, manaRegen: 4 } as never;
  }
};

const look = (color: string, accent: string, weapon: Look['weapon'], size = 0.42, shape: Look['shape'] = 'humanoid'): Look => ({ color, accent, shape, weapon, size });

const S = (a: AbilityDef): AbilityDef => a;

const HERO_SPECS: HeroSpec[] = [
  {
    id: 'xuanwu', name: 'Xuanwu', title: 'the Bulwark', role: 'tank', ...base('tank'),
    look: look('#4f6f8f', '#c9d6e3', 'hammer', 0.5),
    hp: 3600, damage: 165, power: 0, armor: 95, resist: 50, hitSpeed: 1.1, range: 1.3, speed: 3.9, radius: 0.5, mana: 420, attackType: 'physical',
    lore: 'A mountain that learned to walk. Xuanwu holds the line so that others may strike.',
    tips: 'Open with Shield Bash to stun, then Earthquake when enemies cluster. You are the frontline: stand between the enemy and your carries.',
    skills: [
      S({ kind: 'dashStrike', name: 'Shield Bash', desc: 'Charge forward, knocking back and stunning enemies in the way.', cooldown: 9, mana: 60, damage: 240, damageGrowth: 60, ratio: 0.6, type: 'physical', range: 4.5, stun: 0.9, knockback: 1.6, radius: 1.0, color: '#9ec5ff' }),
      S({ kind: 'selfBuff', name: 'Stone Skin', desc: 'Harden for 4 s: gain a large shield and move faster.', cooldown: 14, mana: 70, duration: 4, shield: 500, buff: { speed: 1.25, attack: 1 }, color: '#c8d8e8' }),
      S({ kind: 'aoeSelf', name: 'Earthquake', desc: 'Slam the ground: heavy damage and a 1.5 s stun around you.', cooldown: 40, mana: 120, damage: 480, damageGrowth: 160, ratio: 1.0, type: 'physical', radius: 3.4, stun: 1.5, knockback: 0.6, color: '#d9b36b' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 1, 0, 2, 1, 0, 1, 2, 1, 1, 2],
    build: ['boots_tank', 'red_crystal', 'guardian_plate', 'frost_heart', 'crimson_crown', 'immortal_shield'],
  },
  {
    id: 'qinglong', name: 'Qinglong', title: 'Storm Lancer', role: 'warrior', ...base('warrior'),
    look: look('#2f8f6a', '#e0f5d8', 'lance', 0.45),
    hp: 3300, damage: 195, power: 0, armor: 88, resist: 52, hitSpeed: 0.95, range: 1.7, speed: 4.0, radius: 0.46, mana: 440, attackType: 'physical',
    lore: 'The azure dragon of the east, riding thunderheads into battle with a lance as long as a river.',
    tips: 'Dragon Thrust pokes through a whole wave. Dive on a target with Sky Dive, then Whirl while they are stunned.',
    skills: [
      S({ kind: 'lineShot', name: 'Dragon Thrust', desc: 'Thrust a lance of storm energy that pierces everything in a line.', cooldown: 7, mana: 55, damage: 280, damageGrowth: 70, ratio: 0.9, type: 'physical', range: 7, color: '#7cf7d5' }),
      S({ kind: 'spin', name: 'Whirl', desc: 'Spin the lance for 2.5 s, hitting everyone around you while you move.', cooldown: 12, mana: 70, damage: 90, damageGrowth: 30, ratio: 0.45, type: 'physical', radius: 2.2, duration: 2.5, tick: 0.35, color: '#aef2e6' }),
      S({ kind: 'leap', name: 'Sky Dive', desc: 'Leap to a point and crash down, damaging and stunning enemies there.', cooldown: 36, mana: 110, damage: 520, damageGrowth: 170, ratio: 1.2, type: 'physical', range: 7, radius: 2.4, stun: 1.0, color: '#5ad1ff' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_tank', 'bloodthirst', 'storm_lance', 'guardian_plate', 'crimson_crown', 'immortal_shield'],
  },
  {
    id: 'yingren', name: 'Yingren', title: 'Shadow Blade', role: 'assassin', ...base('assassin'),
    look: look('#3a2f5c', '#d4b2ff', 'dagger', 0.4),
    hp: 3050, damage: 215, power: 0, armor: 74, resist: 46, hitSpeed: 0.82, range: 1.3, speed: 4.4, radius: 0.42, mana: 400, attackType: 'physical',
    lore: 'Nobody has seen Yingren arrive. A few have seen them leave.',
    tips: 'Shadowstep behind a squishy target to crit, throw Fan of Knives, then finish with Execution when they drop low.',
    skills: [
      S({ kind: 'blink', name: 'Shadowstep', desc: 'Blink to the aimed point; your next attack crits for 2.2x.', cooldown: 10, mana: 60, range: 6, critMult: 2.2, color: '#c08bff' }),
      S({ kind: 'spreadShot', name: 'Fan of Knives', desc: 'Throw five knives in a fan.', cooldown: 8, mana: 55, damage: 150, damageGrowth: 40, ratio: 0.55, type: 'physical', count: 5, spread: 0.9, range: 7, color: '#e2d2ff' }),
      S({ kind: 'dashStrike', name: 'Execution', desc: 'Dash through enemies dealing damage plus 20% of their missing health.', cooldown: 30, mana: 100, damage: 380, damageGrowth: 120, ratio: 1.1, type: 'physical', range: 6, radius: 0.9, execute: 0.2, color: '#ff6bd5' }),
    ],
    skillOrder: [1, 0, 1, 2, 1, 1, 0, 2, 1, 0, 0, 2, 0, 0, 2],
    build: ['boots_swift', 'bloodthirst', 'shadow_fang', 'storm_lance', 'crimson_crown', 'immortal_shield'],
  },
  {
    id: 'wukong', name: 'Wukong', title: 'Stone Monkey', role: 'assassin', ...base('assassin'),
    look: look('#b8742a', '#ffd86b', 'staff', 0.42, 'beast'),
    hp: 3100, damage: 195, power: 0, armor: 78, resist: 48, hitSpeed: 0.9, range: 1.5, speed: 4.3, radius: 0.44, mana: 380, attackType: 'physical',
    lore: 'Born from stone, armed with a cudgel that weighs as much as the sea.',
    tips: 'Cloud Leap in, Staff Sweep to scatter the backline, then Golden Cyclone while chasing.',
    skills: [
      S({ kind: 'leap', name: 'Cloud Leap', desc: 'Somersault to a point, striking enemies where you land.', cooldown: 9, mana: 55, damage: 220, damageGrowth: 55, ratio: 0.8, type: 'physical', range: 6, radius: 1.8, color: '#ffd86b' }),
      S({ kind: 'cone', name: 'Staff Sweep', desc: 'Sweep the cudgel in a wide arc for 1.2 s, knocking enemies back.', cooldown: 11, mana: 60, damage: 120, damageGrowth: 35, ratio: 0.5, type: 'physical', radius: 3.2, duration: 1.2, tick: 0.3, knockback: 1.2, color: '#ffb347' }),
      S({ kind: 'spin', name: 'Golden Cyclone', desc: 'Whirl the cudgel for 4 s with bonus speed, hitting everything nearby.', cooldown: 38, mana: 110, damage: 140, damageGrowth: 45, ratio: 0.6, type: 'physical', radius: 2.6, duration: 4, tick: 0.3, buff: { speed: 1.2, attack: 1 }, color: '#ffe08a' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_swift', 'bloodthirst', 'storm_lance', 'shadow_fang', 'guardian_plate', 'crimson_crown'],
  },
  {
    id: 'huofeng', name: 'Huofeng', title: 'Flame Oracle', role: 'mage', ...base('mage'),
    look: look('#c9412a', '#ffb15e', 'orb', 0.4),
    hp: 2700, damage: 140, power: 80, armor: 62, resist: 52, hitSpeed: 1.0, range: 6.5, speed: 3.8, radius: 0.4, mana: 560, attackType: 'magic', projectile: 'fireball', projectileSpeed: 11,
    lore: 'She reads the future in embers and sets fire to the parts she dislikes.',
    tips: 'Fireball is your bread and butter. Save Meteor Rain for a grouped enemy team or a tower dive.',
    skills: [
      S({ kind: 'aoeAim', name: 'Fireball', desc: 'Hurl a fireball that bursts at the aimed point and burns.', cooldown: 6.5, mana: 60, damage: 250, damageGrowth: 60, ratio: 0.7, type: 'magic', range: 8, radius: 1.6, burn: 40, color: '#ff8a3c' }),
      S({ kind: 'cone', name: 'Flame Breath', desc: 'Breathe fire in a cone for 1.6 s.', cooldown: 11, mana: 75, damage: 110, damageGrowth: 35, ratio: 0.35, type: 'magic', radius: 4.2, duration: 1.6, tick: 0.25, burn: 25, color: '#ff6a2a' }),
      S({ kind: 'aoeAim', name: 'Meteor Rain', desc: 'Call a meteor down on a wide area after a short delay.', cooldown: 45, mana: 140, damage: 600, damageGrowth: 180, ratio: 1.2, type: 'magic', range: 9, radius: 3.0, burn: 60, stun: 0.4, color: '#ff4e2a' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_arcane', 'sage_tome', 'void_staff', 'frost_heart', 'phoenix_feather', 'immortal_shield'],
  },
  {
    id: 'bingji', name: 'Bingji', title: 'Frost Weaver', role: 'mage', ...base('mage'),
    look: look('#4e8fd6', '#dff3ff', 'staff', 0.4),
    hp: 2750, damage: 135, power: 75, armor: 60, resist: 55, hitSpeed: 1.0, range: 6.5, speed: 3.8, radius: 0.4, mana: 580, attackType: 'magic', projectile: 'ice', projectileSpeed: 12,
    lore: 'Every winter has a weaver. Bingji is the one that never stops.',
    tips: 'Ice Lance slows; chase with it. Frost Nova freezes anyone who dives you. Blizzard holds a choke point.',
    skills: [
      S({ kind: 'lineShot', name: 'Ice Lance', desc: 'Fire a lance of ice that pierces and slows.', cooldown: 6.5, mana: 55, damage: 220, damageGrowth: 55, ratio: 0.6, type: 'magic', range: 8, slow: 0.4, slowT: 2, color: '#9fe3ff' }),
      S({ kind: 'aoeSelf', name: 'Frost Nova', desc: 'Freeze everyone around you for 1.2 s.', cooldown: 13, mana: 80, damage: 220, damageGrowth: 60, ratio: 0.6, type: 'magic', radius: 3, stun: 1.2, color: '#c7f0ff' }),
      S({ kind: 'aoeAim', name: 'Blizzard', desc: 'A blizzard rages at the aimed point for 4 s, damaging and slowing.', cooldown: 40, mana: 140, damage: 150, damageGrowth: 50, ratio: 0.45, type: 'magic', range: 8, radius: 3.4, duration: 4, tick: 0.5, slow: 0.5, slowT: 1, color: '#bfe8ff' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_arcane', 'sage_tome', 'frost_heart', 'void_staff', 'phoenix_feather', 'immortal_shield'],
  },
  {
    id: 'shenshe', name: 'Shenshe', title: 'Divine Archer', role: 'marksman', ...base('marksman'),
    look: look('#2e7a4a', '#ffe9a8', 'bow', 0.4),
    hp: 2800, damage: 182, power: 0, armor: 64, resist: 42, hitSpeed: 1.0, range: 6.6, speed: 3.9, radius: 0.4, mana: 400, attackType: 'physical', projectile: 'arrow', projectileSpeed: 14,
    lore: 'Shenshe once shot down nine suns. The tenth surrendered.',
    tips: 'Stay behind your tank and keep shooting. Rapid Fire shreds towers. Arrow Storm wins team fights from range.',
    skills: [
      S({ kind: 'lineShot', name: 'Piercing Arrow', desc: 'A long arrow that pierces every enemy in its path.', cooldown: 7, mana: 50, damage: 260, damageGrowth: 70, ratio: 1.0, type: 'physical', range: 10, color: '#fff2b0' }),
      S({ kind: 'selfBuff', name: 'Rapid Fire', desc: 'Attack 40% faster and move faster for 5 s.', cooldown: 16, mana: 60, duration: 5, buff: { speed: 1.15, attack: 1.4 }, color: '#ffe27a' }),
      S({ kind: 'aoeAim', name: 'Arrow Storm', desc: 'Rain arrows on a wide area for 3 s.', cooldown: 42, mana: 120, damage: 130, damageGrowth: 45, ratio: 0.45, type: 'physical', range: 10, radius: 3.4, duration: 3, tick: 0.4, color: '#ffd86b' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_swift', 'bloodthirst', 'storm_lance', 'shadow_fang', 'crimson_crown', 'immortal_shield'],
  },
  {
    id: 'huochong', name: 'Huochong', title: 'Gunner', role: 'marksman', ...base('marksman'),
    look: look('#6b4a2b', '#ffb060', 'rifle', 0.42),
    hp: 3100, damage: 240, power: 0, armor: 72, resist: 44, hitSpeed: 1.0, range: 6.8, speed: 3.9, radius: 0.42, mana: 380, attackType: 'physical', projectile: 'bolt', projectileSpeed: 16,
    lore: 'A tinkerer who decided that bows were simply too quiet.',
    tips: 'Scatter melts anything close. Combat Roll resets your position; Barrage holds a lane.',
    skills: [
      S({ kind: 'spreadShot', name: 'Scatter', desc: 'Fire a spread of seven shells.', cooldown: 8, mana: 55, damage: 120, damageGrowth: 35, ratio: 0.5, type: 'physical', count: 7, spread: 1.1, range: 5, color: '#ffc27a' }),
      S({ kind: 'blink', name: 'Combat Roll', desc: 'Roll a short distance; your next shot crits.', cooldown: 9, mana: 40, range: 3.2, critMult: 1.8, color: '#ffd9a8' }),
      S({ kind: 'cone', name: 'Barrage', desc: 'Unload the cannon in a cone for 2.5 s.', cooldown: 38, mana: 110, damage: 140, damageGrowth: 45, ratio: 0.55, type: 'physical', radius: 6, duration: 2.5, tick: 0.2, color: '#ff9d3c' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_swift', 'bloodthirst', 'storm_lance', 'shadow_fang', 'crimson_crown', 'immortal_shield'],
  },
  {
    id: 'mingyue', name: 'Mingyue', title: 'Moon Priestess', role: 'support', ...base('support'),
    look: look('#8e7fd6', '#fff6d0', 'book', 0.4),
    hp: 3000, damage: 140, power: 60, armor: 70, resist: 58, hitSpeed: 1.05, range: 5.5, speed: 3.9, radius: 0.4, mana: 520, attackType: 'magic', projectile: 'holy', projectileSpeed: 11,
    lore: 'She carries the moon in a book and lends its light to whoever is losing.',
    tips: 'Stick to your marksman. Lunar Bind stops a diver; Sanctuary turns a losing fight around.',
    skills: [
      S({ kind: 'healBurst', name: 'Moonlight', desc: 'Heal nearby allies and shield yourself.', cooldown: 10, mana: 70, heal: 320, healRatio: 0.8, shield: 180, radius: 4.5, color: '#fff4c2' }),
      S({ kind: 'lineShot', name: 'Lunar Bind', desc: 'A crescent of light that stuns the first enemies it hits.', cooldown: 11, mana: 60, damage: 220, damageGrowth: 60, ratio: 0.6, type: 'magic', range: 8, stun: 1.0, color: '#ffe9a8' }),
      S({ kind: 'aoeSelf', name: 'Sanctuary', desc: 'Raise a sanctuary for 5 s that heals allies inside and slows enemies.', cooldown: 45, mana: 130, heal: 90, healRatio: 0.3, radius: 4, duration: 5, tick: 0.5, slow: 0.3, slowT: 0.6, color: '#fff8dc' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_arcane', 'sage_tome', 'guardian_plate', 'frost_heart', 'phoenix_feather', 'immortal_shield'],
  },
  {
    id: 'leigong', name: 'Leigong', title: 'Thunder Warden', role: 'support', ...base('support'),
    look: look('#3b4a8a', '#9fd0ff', 'axe', 0.46),
    hp: 3500, damage: 185, power: 60, armor: 90, resist: 60, hitSpeed: 1.0, range: 1.5, speed: 4.0, radius: 0.46, mana: 460, attackType: 'physical',
    lore: 'The storm keeps its own warden, and the warden keeps his own counsel.',
    tips: 'Thunder Dash to engage, Chain Lightning to stun a crowd, Storm Call to lock down the fight.',
    skills: [
      S({ kind: 'chain', name: 'Chain Lightning', desc: 'Lightning jumps between up to four enemies, stunning briefly.', cooldown: 9, mana: 65, damage: 230, damageGrowth: 60, ratio: 0.7, type: 'magic', range: 6, count: 4, stun: 0.5, color: '#9fd0ff' }),
      S({ kind: 'dashStrike', name: 'Thunder Dash', desc: 'Dash forward, shocking enemies you pass.', cooldown: 11, mana: 60, damage: 200, damageGrowth: 50, ratio: 0.6, type: 'magic', range: 5, radius: 1.0, slow: 0.3, slowT: 1.5, color: '#c9e6ff' }),
      S({ kind: 'aoeAim', name: 'Storm Call', desc: 'Call a thunderstorm on an area: damage and a 1.5 s stun.', cooldown: 45, mana: 130, damage: 420, damageGrowth: 140, ratio: 1.0, type: 'magic', range: 8, radius: 3.2, stun: 1.5, color: '#7fc4ff' }),
    ],
    skillOrder: [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2],
    build: ['boots_tank', 'guardian_plate', 'red_crystal', 'frost_heart', 'crimson_crown', 'immortal_shield'],
  },
];

export const HEROES: UnitDef[] = HERO_SPECS.map((h) => ({
  ...h, kind: 'hero', desc: h.desc ?? h.lore ?? '', splash: h.splash ?? 0, flying: false, targets: 'both', sight: h.sight ?? 9, ability: h.skills[0],
} as UnitDef));

export const HERO_BY_ID: Record<string, UnitDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));
export const heroDef = (id: string): UnitDef => { const d = HERO_BY_ID[id]; if (!d) throw new Error(`unknown hero ${id}`); return d; };

/** Lane assignment per role for a team of bots. */
export const ROLE_LANE: Record<Role, 0 | 1 | 2 | 3> = { tank: 0, warrior: 0, assassin: 3, mage: 1, marksman: 2, support: 2 };

/** A reasonable five-hero team around (or without) the chosen hero. */
export function pickTeam(include: string | null, rng: { next(): number }): string[] {
  const roles: Role[] = ['warrior', 'mage', 'marksman', 'support', 'assassin'];
  const out: string[] = [];
  if (include) {
    out.push(include);
    const r = heroDef(include).role;
    const i = roles.indexOf(r === 'tank' ? 'warrior' : r);
    if (i >= 0) roles.splice(i, 1); else roles.pop();
  }
  for (const role of roles) {
    const pool = HEROES.filter((h) => (h.role === role || (role === 'warrior' && h.role === 'tank')) && !out.includes(h.id));
    if (pool.length) out.push(pool[Math.floor(rng.next() * pool.length)].id);
  }
  while (out.length < 5) { const h = HEROES[Math.floor(rng.next() * HEROES.length)]; if (!out.includes(h.id)) out.push(h.id); }
  return out;
}
