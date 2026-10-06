import type { Vec } from '../engine/math.ts';
import type { LaneId, TowerTier } from './constants.ts';

export type Team = 0 | 1;
export const other = (t: Team): Team => (t === 0 ? 1 : 0);
/** Jungle monsters are on neither side; they are stored as team 2 internally. */
export const NEUTRAL = 2 as const;
export type Side = Team | typeof NEUTRAL;

export type TargetType = 'ground' | 'air' | 'both' | 'buildings';
export type ProjectileStyle = 'arrow' | 'spear' | 'fireball' | 'bolt' | 'bomb' | 'cannonball' | 'flame' | 'shadow' | 'holy' | 'rock' | 'ice';
export type ShapeKind = 'humanoid' | 'brute' | 'flyer' | 'skeleton' | 'beast' | 'wraith' | 'dragon' | 'building';
export type WeaponKind = 'sword' | 'bow' | 'spear' | 'staff' | 'axe' | 'hammer' | 'dagger' | 'lance' | 'scythe' | 'none' | 'orb' | 'bomb' | 'book' | 'shield' | 'rifle';
export type Role = 'tank' | 'warrior' | 'assassin' | 'mage' | 'marksman' | 'support';
export type DamageType = 'physical' | 'magic' | 'true';

export type AbilityKind =
  | 'dashStrike' // rush forward, hitting everything on the way
  | 'aoeSelf' // burst around self
  | 'aoeAim' // burst at cursor within range
  | 'lineShot' // piercing projectile
  | 'spreadShot' // fan of projectiles
  | 'cone' // sustained cone in facing direction
  | 'blink' // teleport to cursor, empower next hit
  | 'leap' // jump to cursor, damage on landing
  | 'summon' // spawn allies around self
  | 'selfBuff' // temporary speed/attack buff
  | 'healBurst' // heal allies around self, gain shield
  | 'chain' // chain lightning from self
  | 'spin' // sustained whirlwind while moving
  | 'globalShot' // 灼日之光: a slow, map-long arrow that stuns the first hero it meets
  | 'multiStrike'; // 如意金箍棒 / 国士无双 style: the next N basic attacks are empowered

export interface AbilityDef {
  kind: AbilityKind;
  name: string;
  desc: string;
  cooldown: number;
  mana: number;
  damage?: number; // base damage at rank 1
  damageGrowth?: number; // added per rank
  ratio?: number; // scales with attack (physical) or power (magic)
  type?: DamageType;
  radius?: number;
  range?: number;
  duration?: number;
  stun?: number;
  slow?: number; // fraction of speed removed
  slowT?: number;
  knockback?: number;
  count?: number;
  spread?: number; // radians total for spreadShot
  unit?: string; // unit id for summon
  buff?: { speed: number; attack: number };
  buildingMult?: number;
  critMult?: number;
  burn?: number; // dps for burn effects
  heal?: number;
  healRatio?: number;
  shield?: number;
  tick?: number; // seconds between hits for sustained abilities
  execute?: number; // bonus damage fraction of missing health (dashStrike)
  color?: string;
  sfx?: string;
  /** Extra damage as a fraction of the victim's max health (圣剑裁决, 末世-style ults). */
  maxHpPct?: number;
  /** Seconds of damage immunity granted on cast (青莲剑歌, 护身咒法). */
  invuln?: number;
  /** Shield given to allies in radius (画地为牢). */
  allyShield?: number;
  /** Remove stuns/slows from allies in radius and grant brief control immunity (逍遥游). */
  cleanse?: boolean;
  /** Heal applied to self when the skill lands (将进酒-style sustain), fraction of damage dealt. */
  selfHeal?: number;
}

/** Signature passives, implemented generically in passives.ts. */
export type PassiveKind =
  | 'burnOnHit' // 炽热之箭: basic attacks scorch
  | 'shredOnSkill' // 女王崇拜: skill hits strip magic resist
  | 'oocRegen' // 圣光庇护: strong regen out of combat
  | 'nthCrit' // 强化普攻: every Nth basic attack crits
  | 'ultGate' // 侠客行 / 狂意: N basic attacks unlock the ultimate for a few seconds
  | 'markDetonateHeal' // 绽·风华: the 4th skill mark detonates and heals the caster
  | 'nthBurst' // 火力压制: every Nth attack becomes a burst of shots
  | 'skillBurnStack' // 失控的魔法: skill hits stack a burn
  | 'rageAttack' // 怒气勃发: attack rises as health falls
  | 'periodicHeal' // 回春: heals the most wounded nearby ally every few seconds
  | 'frenzyStacks' // 狂战: attacks stack attack speed
  | 'freezeOnSlow' // 冰封之心: slowing a slowed enemy freezes them
  | 'nthStun' // 背水一战: every 3rd attack hits harder and knocks up
  | 'missingHpDR' // 龙胆: damage reduction grows as health falls
  | 'orbs' // 策谋之刻: skill hits stack orbs that fire at 5
  | 'dreamShield' // 蝴蝶梦: periodic damage reduction window
  | 'lowHpShield' // 牛魔之心: a shield when dropping low, once per 40 s
  | 'trueDamage'; // 真实伤害: attacks add true damage

export interface Look {
  color: string;
  accent: string;
  shape: ShapeKind;
  weapon: WeaponKind;
  size: number; // visual radius in tiles
  /** Optional outfit overrides (defaults come from the weapon kit). */
  gear?: 'helm' | 'hornhelm' | 'hood' | 'hat' | 'tricorn' | 'halo' | 'bandana' | 'cap' | 'goblincap';
  armor?: 'plate' | 'leather' | 'robe' | 'cloth';
  cape?: boolean;
  /** Hero flourishes so each 王者荣耀 hero reads at a glance. */
  hair?: { color: string; style: 'long' | 'pony' | 'bun' | 'short' | 'twin' | 'topknot' };
  tails?: 'fox' | 'monkey';
  ears?: 'fox' | 'cat';
  horns?: boolean;
  beard?: boolean;
  skirt?: boolean;
  doll?: boolean;
  skin?: string;
  /** Eyes glow in the team colour (小兵 golems). */
  eyeGlow?: boolean;
}

/** Base stats of anything that walks: minions, monsters and heroes. */
export interface UnitDef {
  id: string;
  name: string;
  desc: string;
  look: Look;
  hp: number;
  hpGrowth: number;
  damage: number;
  damageGrowth: number;
  power: number; // magic power
  powerGrowth: number;
  armor: number;
  armorGrowth: number;
  resist: number;
  resistGrowth: number;
  hitSpeed: number;
  attackSpeedGrowth: number; // fraction per level
  range: number; // measured to target's edge
  sight: number;
  speed: number; // tiles per second
  flying: boolean;
  targets: TargetType;
  splash: number;
  radius: number;
  mana: number;
  manaRegen: number;
  hpRegen: number;
  projectile?: ProjectileStyle;
  projectileSpeed?: number;
  attackType: DamageType;
  /** Heroes have three skills; minions and monsters none. */
  skills: AbilityDef[];
  role: Role;
  kind: 'hero' | 'minion' | 'monster';
  minionType?: 'melee' | 'ranged' | 'siege' | 'super';
  monster?: { gold: number; xp: number; buff?: 'blue' | 'red' | 'tyrant' | 'overlord'; leash: number; boss?: boolean };
  /** Order in which skill points are spent (indices into skills, repeated). */
  skillOrder?: number[];
  /** Recommended item build (item ids). */
  build?: string[];
  title?: string;
  lore?: string;
  tips?: string;
  /** Hero signature passive (flavour + rules text + generic implementation). */
  passive?: { name: string; desc: string; kind: PassiveKind; n?: number; value?: number };
  /** A per-hero legacy slot so older code paths that expect `ability` keep working (= skills[0]). */
  ability?: AbilityDef;
}

export type TroopDef = UnitDef;
export type CardDef = UnitDef;

export interface Status {
  stun: number;
  freeze: number;
  rage: number;
  rageSpeed: number;
  rageAttack: number;
  burnT: number;
  burnDps: number;
  slowT: number;
  slow: number;
  blueT: number; // blue buff seconds left
  redT: number; // red buff seconds left
  tyrantT: number;
  overlordT: number;
  invulnT: number;
  /** 法术防御 shred (女王崇拜) and its timer. */
  shred: number;
  shredT: number;
  /** Control immunity (逍遥游). */
  ccImmuneT: number;
  /** Last time this unit took damage from an enemy (out-of-combat regen). */
  lastHurtT: number;
}

export interface EntityBase {
  id: number;
  team: Side;
  pos: Vec;
  radius: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  flying: boolean;
  status: Status;
  targetId: number; // -1 when none
  attackCd: number;
  facing: number;
  hitFlash: number;
  attackAnim: number;
  shield: number;
  bornAt: number;
  armor: number;
  resist: number;
}

export interface ItemState { id: string }

export interface Unit extends EntityBase {
  kind: 'unit';
  def: UnitDef;
  isHero: boolean;
  deployT: number; // seconds until active (spawn animation)
  possessed: boolean; // controlled by a human
  soulbound: boolean;
  moveT: number;
  charging: boolean;
  /** Per-skill cooldowns (seconds left) and ranks. */
  skillCd: number[];
  skillRank: number[];
  abilityCd: number; // legacy alias of skillCd[0] for renderers
  dashCd: number;
  flashCd: number;
  abilityT: number; // remaining time of an active sustained ability
  abilityTick: number;
  abilityDir: Vec;
  activeSkill: number; // which skill is sustained (-1 none)
  dashVel: Vec | null;
  dashT: number;
  dashHits: Set<number>;
  dashDamage: number;
  dashStun: number;
  dashKnockback: number;
  dashBuildingMult: number;
  dashKind: 'none' | 'dash' | 'ability';
  dashExecute: number;
  dashType: DamageType;
  buffT: number;
  buffSpeed: number;
  buffAttack: number;
  critNext: number;
  lane: LaneId;
  laneIndex: number; // progress along the lane path (minions)
  vel: Vec;
  bobT: number;
  heroAttackHeld: boolean;
  lastPos: Vec;
  stuckT: number;
  waypoint: Vec | null;
  path: Vec[]; // remaining nav path for bots/minions off-lane
  pathT: number;
  fromSpawner: boolean;
  // hero progression
  level: number;
  xp: number;
  mana: number;
  maxMana: number;
  items: string[];
  gold: number;
  recallT: number; // seconds of recall channel left (0 = not recalling)
  respawnT: number;
  kills: number;
  deaths: number;
  assists: number;
  streak: number;
  lastHurtBy: { id: number; t: number }[];
  damageTaken: number; // recent damage for bots (decays)
  inBush: boolean;
  camp: string | null; // monster home camp
  home: Vec | null;
  leashT: number;
  owner: Team | -1; // for summons
  autoBuy: boolean;
  skillPoints: number;
  lastAttackT: number;
  /** Resonance: skill hits on enemy heroes charge the crown (0..100); at 100 the next skill is crowned. */
  crown: number;
  crowned: boolean;
  /** Storm Lance: basic attacks landed since the last chain bolt. */
  stormN: number;
  /** Void Staff marks stacked on this unit by enemy skills; three detonate. */
  voidMarks: number;
  /** Hero passive bookkeeping: attack counter / accumulated damage, stacks, and a timer. */
  passiveN: number;
  passiveStacks: number;
  passiveT: number;
  /** Damage reduction window (护身/蝴蝶梦-style passives). */
  wardT: number;
  wardDR: number;
  /** Seconds the next basic attack stays empowered by an item (宗师之力 / 冰痕之握) or a skill (如意金箍棒). */
  empowerT: number;
  empowerN: number;
  empowerSkill: number;
}

export interface Tower extends EntityBase {
  kind: 'tower';
  towerType: TowerTier;
  tier: TowerTier;
  lane: LaneId | -1;
  side: 'left' | 'right' | 'center';
  active: boolean; // false while a tower in front still stands
  damage: number;
  hitSpeed: number;
  range: number;
  heat: number; // consecutive shots on the same target ramp damage
  crownT: number; // seconds of 'crowned' fire rate after a hero kill
  /** Crystal only: the guardians have already answered its call. */
  guardians: boolean;
  aggroId: number; // hero that attacked an allied hero under the tower
  aggroT: number;
}

export interface Building extends EntityBase {
  kind: 'building';
  def: UnitDef;
  deployT: number;
  lifetime: number;
  spawnT: number;
}

export type Entity = Unit | Building | Tower;

export interface Projectile {
  id: number;
  team: Side;
  pos: Vec;
  prev: Vec;
  style: ProjectileStyle;
  speed: number;
  damage: number;
  type: DamageType;
  mode: 'homing' | 'linear' | 'lob';
  targetId: number;
  dir: Vec;
  maxDist: number;
  traveled: number;
  splash: number;
  splashAir: boolean;
  hitsAir: boolean;
  hitsGround: boolean;
  pierce: boolean;
  hitIds: Set<number>;
  sourceId: number;
  stun: number;
  slow: number;
  slowT: number;
  knockback: number;
  buildingMult: number;
  burn: number;
  chain?: { count: number; range: number; stun: number };
  lobFrom: Vec;
  lobTo: Vec;
  lobT: number;
  lobDur: number;
  height: number;
  dead: boolean;
  hero: boolean;
  radius: number;
  skill: boolean;
  crowned: boolean;
  /** Only enemy heroes stop it (灼日之光). */
  heroOnly?: boolean;
}

export type EffectType =
  | 'ring' | 'burst' | 'text' | 'slash' | 'beam' | 'spawn' | 'shockwave' | 'cone' | 'lightning'
  | 'heal' | 'frost' | 'soul' | 'crater' | 'smoke' | 'spark' | 'flame' | 'crown' | 'shield' | 'blink' | 'meteor' | 'volley' | 'death' | 'recall' | 'levelup';

export interface Effect {
  type: EffectType;
  pos: Vec;
  to?: Vec;
  t: number;
  dur: number;
  radius: number;
  color: string;
  angle?: number;
  text?: string;
  vel?: Vec;
  size?: number;
  team?: Side;
  arc?: number;
}

export interface Zone {
  kind: 'frenzy' | 'sanctuary' | 'blizzard';
  pos: Vec;
  radius: number;
  t: number;
  team: Side;
  speed: number;
  attack: number;
  heal?: number;
  dps?: number;
  slow?: number;
  sourceId?: number;
  tick?: number;
}

export interface Stats {
  towerDamage: number;
  unitKills: number;
  heroKills: number;
  heroDamage: number;
  heroDeaths: number;
  assists: number;
  towersDestroyed: number;
  bestStreak: number;
  goldEarned: number;
  healing: number;
  objectives: number;
  minionKills: number;
  damageTaken: number;
}

export const newStats = (): Stats => ({ towerDamage: 0, unitKills: 0, heroKills: 0, heroDamage: 0, heroDeaths: 0, assists: 0, towersDestroyed: 0, bestStreak: 0, goldEarned: 0, healing: 0, objectives: 0, minionKills: 0, damageTaken: 0 });

/** One seat: a human or a bot controlling one hero. Five per team. */
export interface Seat {
  team: Team;
  index: number; // 0..4 within the team
  heroDefId: string;
  heroId: number; // current hero entity id (-1 while dead)
  isBot: boolean;
  name: string;
  stats: Stats;
  respawnT: number;
  level: number; // persists across deaths
  xp: number;
  gold: number;
  items: string[];
  skillRank: number[];
  skillPoints: number;
  role: Role;
  lane: LaneId | 3; // 3 = jungle
  streak: number;
  kills: number;
  deaths: number;
  assists: number;
  autoBuy: boolean;
  /** Item passive cooldowns keyed by item passive id (seconds of world time when usable again). */
  itemCd: Record<string, number>;
  /** 召唤师技能 chosen for this seat. */
  spell: string;
}

/** Per-team state (the old PlayerState name is kept for the renderer). */
export interface PlayerState {
  team: Team;
  name: string;
  isBot: boolean;
  heroId: number; // the human-controlled hero on this team (-1 if none / dead)
  seats: Seat[];
  stats: Stats;
  towersLost: number;
  kills: number;
  crowns: number;
  possessCd: number;
  streak: number;
  streakT: number;
  objectiveT: { tyrant: number; overlord: number };
}

export type GameEventType =
  | 'deploy' | 'hit' | 'ranged' | 'death' | 'towerDestroyed' | 'towerHit' | 'spell' | 'possess' | 'release' | 'heroDeath'
  | 'ability' | 'dash' | 'end' | 'invalid' | 'lowHp' | 'crit' | 'summon' | 'streak' | 'countdown' | 'wave' | 'levelup'
  | 'recall' | 'respawn' | 'buy' | 'objective' | 'buff' | 'firstBlood' | 'ace' | 'kill' | 'towerWarning' | 'flash' | 'heal' | 'crown';

export interface GameEvent {
  type: GameEventType;
  pos?: Vec;
  team?: Side;
  card?: UnitDef;
  style?: ProjectileStyle;
  text?: string;
  big?: boolean;
  hero?: boolean;
  killer?: string;
  victim?: string;
  killerTeam?: Team;
  skill?: AbilityDef;
  seat?: Seat;
}

export type MatchPhase = 'countdown' | 'regulation' | 'overtime' | 'ended';
export interface Award { title: string; team: Team; value: number; seat?: string }
export interface MatchResult { winner: Team | -1; reason: string; crowns: [number, number]; awards?: Award[]; duration: number }
