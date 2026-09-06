import type { Vec } from '../engine/math.ts';

export type Team = 0 | 1;
export const other = (t: Team): Team => (t === 0 ? 1 : 0);

export type TargetType = 'ground' | 'air' | 'both' | 'buildings';
export type ProjectileStyle = 'arrow' | 'spear' | 'fireball' | 'bolt' | 'bomb' | 'cannonball' | 'flame' | 'shadow' | 'holy' | 'rock' | 'ice';
export type ShapeKind = 'humanoid' | 'brute' | 'flyer' | 'skeleton' | 'beast' | 'wraith' | 'dragon' | 'building';
export type WeaponKind = 'sword' | 'bow' | 'spear' | 'staff' | 'axe' | 'hammer' | 'dagger' | 'lance' | 'scythe' | 'none' | 'orb' | 'bomb' | 'book' | 'shield' | 'rifle';
export type Role = 'tank' | 'dps' | 'ranged' | 'splash' | 'swarm' | 'support' | 'assassin' | 'wincon' | 'air';

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
  | 'spin'; // sustained whirlwind while moving

export interface AbilityDef {
  kind: AbilityKind;
  name: string;
  desc: string;
  cooldown: number;
  damage?: number;
  radius?: number;
  range?: number;
  duration?: number;
  stun?: number;
  knockback?: number;
  count?: number;
  spread?: number; // radians total for spreadShot
  unit?: string; // card id for summon
  buff?: { speed: number; attack: number };
  buildingMult?: number;
  critMult?: number;
  burn?: number; // dps for burn effects
  heal?: number;
  shield?: number;
  tick?: number; // seconds between hits for sustained abilities
  color?: string;
}

export interface Look {
  color: string;
  accent: string;
  shape: ShapeKind;
  weapon: WeaponKind;
  size: number; // visual radius in tiles
}

interface CardBase {
  id: string;
  name: string;
  cost: number;
  desc: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  look: Look;
}

export interface TroopDef extends CardBase {
  kind: 'troop';
  hp: number;
  damage: number;
  hitSpeed: number;
  range: number; // measured to target's edge
  sight: number;
  speed: number; // tiles per second
  count: number;
  flying: boolean;
  targets: TargetType;
  splash: number; // 0 = single target
  splashAir: boolean;
  radius: number; // collision radius (tiles)
  deployTime: number;
  loadTime: number; // delay before the first hit after acquiring a target
  projectile?: ProjectileStyle;
  projectileSpeed?: number;
  chain?: { count: number; range: number; stun: number };
  healAura?: { radius: number; hps: number };
  charge?: { delay: number; speedMult: number; dmgMult: number };
  ability: AbilityDef;
  role: Role;
  possessable: boolean;
}

export interface BuildingDef extends CardBase {
  kind: 'building';
  hp: number;
  damage: number;
  hitSpeed: number;
  range: number;
  targets: TargetType;
  lifetime: number;
  radius: number;
  deployTime: number;
  projectile?: ProjectileStyle;
  projectileSpeed?: number;
  spawn?: { unit: string; every: number; count: number; initialDelay: number };
}

export interface SpellDef extends CardBase {
  kind: 'spell';
  radius: number;
  damage: number;
  towerMult: number;
  delay: number; // seconds between cast and impact
  hitsAir: boolean;
  stun?: number;
  freeze?: number;
  knockback?: number;
  rage?: { duration: number; speed: number; attack: number };
  effect: 'meteor' | 'volley' | 'shock' | 'frenzy' | 'frost';
}

export type CardDef = TroopDef | BuildingDef | SpellDef;

export interface Status {
  stun: number;
  freeze: number;
  rage: number; // seconds remaining
  rageSpeed: number;
  rageAttack: number;
  burnT: number;
  burnDps: number;
}

export interface EntityBase {
  id: number;
  team: Team;
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
}

export interface Unit extends EntityBase {
  kind: 'unit';
  def: TroopDef;
  deployT: number; // seconds until active
  possessed: boolean;
  soulbound: boolean;
  moveT: number; // seconds moved without attacking (charge)
  charging: boolean;
  abilityCd: number;
  dashCd: number;
  abilityT: number; // remaining time of an active sustained ability
  abilityTick: number;
  abilityDir: Vec;
  dashVel: Vec | null;
  dashT: number;
  dashHits: Set<number>;
  dashDamage: number;
  dashStun: number;
  dashKnockback: number;
  dashBuildingMult: number;
  dashKind: 'none' | 'dash' | 'ability';
  buffT: number;
  buffSpeed: number;
  buffAttack: number;
  critNext: number; // multiplier applied to next hit (1 = none)
  lane: 0 | 1;
  vel: Vec;
  bobT: number;
  heroAttackHeld: boolean;
  lastPos: Vec;
  stuckT: number;
  waypoint: Vec | null;
  fromSpawner: boolean;
}

export interface Building extends EntityBase {
  kind: 'building';
  def: BuildingDef;
  deployT: number;
  lifetime: number;
  spawnT: number;
}

export interface Tower extends EntityBase {
  kind: 'tower';
  towerType: 'king' | 'princess';
  side: 'left' | 'right' | 'center';
  active: boolean;
  damage: number;
  hitSpeed: number;
  range: number;
}

export type Entity = Unit | Building | Tower;

export interface Projectile {
  id: number;
  team: Team;
  pos: Vec;
  prev: Vec;
  style: ProjectileStyle;
  speed: number;
  damage: number;
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
  knockback: number;
  buildingMult: number;
  burn: number; // dps applied for 3s on hit
  chain?: { count: number; range: number; stun: number };
  lobFrom: Vec;
  lobTo: Vec;
  lobT: number;
  lobDur: number;
  height: number;
  dead: boolean;
  hero: boolean;
  radius: number;
}

export type EffectType =
  | 'ring' | 'burst' | 'text' | 'slash' | 'beam' | 'spawn' | 'shockwave' | 'cone' | 'lightning'
  | 'heal' | 'frost' | 'soul' | 'crater' | 'smoke' | 'spark' | 'flame' | 'crown' | 'shield' | 'blink' | 'meteor' | 'volley' | 'death';

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
  team?: Team;
  arc?: number;
}

export interface Zone {
  kind: 'frenzy';
  pos: Vec;
  radius: number;
  t: number;
  team: Team;
  speed: number;
  attack: number;
}

export interface Stats {
  towerDamage: number;
  unitsDeployed: number;
  elixirSpent: number;
  unitKills: number;
  heroKills: number;
  heroDamage: number;
  possessions: number;
  heroDeaths: number;
  towersDestroyed: number;
  bestStreak: number;
  heroTime: number; // seconds spent possessing
  elixirHarvested: number;
}

export const newStats = (): Stats => ({ towerDamage: 0, unitsDeployed: 0, elixirSpent: 0, unitKills: 0, heroKills: 0, heroDamage: 0, possessions: 0, heroDeaths: 0, towersDestroyed: 0, bestStreak: 0, heroTime: 0, elixirHarvested: 0 });

export interface PlayerState {
  team: Team;
  elixir: number;
  elixirMult: number; // difficulty handicap
  deck: CardDef[];
  hand: CardDef[];
  queue: CardDef[]; // front = next card
  crowns: number;
  stats: Stats;
  possessCd: number;
  heroId: number; // -1 when commanding
  isBot: boolean;
  name: string;
  lastDeployId: number;
  streak: number;
  streakT: number; // world time of the last champion kill
  harvested: number; // Soul Harvest elixir gained during the current possession
}

export type GameEventType =
  | 'deploy' | 'hit' | 'ranged' | 'death' | 'towerDestroyed' | 'towerHit' | 'spell' | 'possess' | 'release' | 'heroDeath'
  | 'ability' | 'dash' | 'kingActivated' | 'overtime' | 'doubleElixir' | 'end' | 'invalid' | 'lowHp' | 'crit' | 'summon'
  | 'streak' | 'countdown' | 'botPossess' | 'botRelease';

export interface GameEvent {
  type: GameEventType;
  pos?: Vec;
  team?: Team;
  card?: CardDef;
  style?: ProjectileStyle;
  text?: string;
  big?: boolean;
  hero?: boolean;
}

export type MatchPhase = 'countdown' | 'regulation' | 'overtime' | 'ended';
export interface Award { title: string; desc: string; team: Team; value: number }
export interface MatchResult { winner: Team | -1; reason: string; crowns: [number, number]; awards?: Award[] }
