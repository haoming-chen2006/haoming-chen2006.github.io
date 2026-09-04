// Shared sim types. Other agents: APPEND only, never rename/remove.
import type { Vec3 } from '../core/math.ts';
export type { Vec3 };

export type ModelId = 'Knight' | 'Mage' | 'Rogue' | 'Rogue_Hooded' | 'Barbarian'
  | 'Skeleton_Warrior' | 'Skeleton_Mage' | 'Skeleton_Rogue' | 'Skeleton_Minion';
export type ClassId = 'fighter' | 'wizard' | 'rogue' | 'barbarian' | 'ranger';
export type Faction = 'party' | 'undead' | 'neutral';
export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type Abilities = Record<AbilityKey, number>;
export type SkillKey = 'athletics' | 'acrobatics' | 'sleightOfHand' | 'stealth' | 'arcana' | 'history' | 'investigation'
  | 'nature' | 'religion' | 'animalHandling' | 'insight' | 'medicine' | 'perception' | 'survival' | 'deception'
  | 'intimidation' | 'performance' | 'persuasion';
export const SKILL_ABILITY: Record<SkillKey, AbilityKey> = {
  athletics: 'str', acrobatics: 'dex', sleightOfHand: 'dex', stealth: 'dex', arcana: 'int', history: 'int',
  investigation: 'int', nature: 'int', religion: 'int', animalHandling: 'wis', insight: 'wis', medicine: 'wis',
  perception: 'wis', survival: 'wis', deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha',
};

/** Weapon/offhand ids map to KayKit prop meshes attached to hand slots. */
export type WeaponId = 'sword_1handed' | 'sword_2handed' | 'axe_1handed' | 'axe_2handed' | 'dagger' | 'staff' | 'wand'
  | 'crossbow_1handed' | 'crossbow_2handed' | 'Skeleton_Blade' | 'Skeleton_Axe' | 'Skeleton_Staff' | 'Skeleton_Crossbow' | null;
export type OffhandId = 'shield_round' | 'shield_square' | 'shield_badge' | 'shield_spikes' | 'dagger' | 'spellbook_open'
  | 'Skeleton_Shield_Large_A' | 'Skeleton_Shield_Small_A' | null;

export type ActorState = 'idle' | 'move' | 'dodge' | 'jump' | 'attack' | 'block' | 'stagger' | 'cast' | 'interact'
  | 'dead' | 'cinematic' | 'sit' | 'lie' | 'awaken' | 'drink' | 'rest';

/** Animation request from sim → render. `seq` increments so an identical name can retrigger. */
export interface AnimRequest { name: string; loop: boolean; fade: number; speed: number; seq: number }

export interface AIState {
  behaviour: 'dormant' | 'idle' | 'chase' | 'attack' | 'strafe' | 'retreat' | 'flee' | 'follow' | 'awaken';
  targetId: string | null;
  timer: number;            // generic behaviour timer
  attackCooldown: number;
  home: Vec3;
  leash: number;
  aggroRange: number;
  boss?: { phase: number; name: string; subtitle: string };
  awakenAnim?: string;      // e.g. 'Skeletons_Awaken_Floor'
}

export interface Actor {
  id: string;
  kind: 'player' | 'companion' | 'enemy' | 'npc';
  name: string;
  model: ModelId;
  classId?: ClassId;
  faction: Faction;
  // transform / motion
  pos: Vec3; yaw: number; vel: Vec3; onGround: boolean; groundY: number;
  radius: number; height: number;
  walkSpeed: number; runSpeed: number;
  // D&D
  level: number; xp: number; prof: number;
  abilities: Abilities; ac: number; hp: number; maxHp: number; tempHp: number; hitDice: number; maxHitDice: number;
  skillProfs: SkillKey[]; saveProfs: AbilityKey[];
  // action-game
  stamina: number; maxStamina: number; staminaRegenDelay: number;
  state: ActorState; stateTime: number; iframes: number; poise: number; maxPoise: number; staggerTime: number;
  blocking: boolean; parryWindow: number; comboIndex: number; comboWindow: number; attackKind: 'light' | 'heavy' | 'charged' | null;
  hitboxOpen: boolean; hitDone: Set<string>;
  chargeTime: number;
  weapon: WeaponId; offhand: OffhandId;
  anim: AnimRequest;
  targetId: string | null;      // lock-on (player) or aggro (AI)
  conditions: Record<string, number>;   // name → seconds remaining (0 = permanent until cleared)
  resources: Record<string, number>;    // spellSlots1, secondWind, actionSurge, rage, sneakAttack, hunterMark...
  cooldowns: Record<string, number>;    // abilityId → seconds
  ai?: AIState;
  invisible?: boolean;
  hidden?: boolean;      // not rendered/ticked (e.g. before spawn)
  dead?: boolean;
  deathTime?: number;
  footstepPhase: number;
  lastHitBy?: string;
}

export interface PlayerIntent {
  move: { x: number; z: number };   // camera-relative, |v| ≤ 1
  cameraYaw: number;
  sprint: boolean; walk: boolean;
  dodge: boolean; jump: boolean;
  lightAttack: boolean; heavyAttack: boolean; heavyHold: boolean; heavyRelease: boolean; heavyHeldFor: number;
  block: boolean; lockOn: boolean; interact: boolean;
  ability: number | null;   // 0-5
  useItem: boolean;
  lockTargetHint?: string | null;
}
export const emptyIntent = (cameraYaw = 0): PlayerIntent => ({
  move: { x: 0, z: 0 }, cameraYaw, sprint: false, walk: false, dodge: false, jump: false, lightAttack: false,
  heavyAttack: false, heavyHold: false, heavyRelease: false, heavyHeldFor: 0, block: false, lockOn: false, interact: false, ability: null, useItem: false,
});

export type ItemKind = 'weapon' | 'armor' | 'shield' | 'potion' | 'scroll' | 'quest' | 'misc' | 'ring' | 'food';
export interface ItemDef {
  id: string; name: string; kind: ItemKind; description: string; icon: string; value: number;
  weapon?: { weaponId: WeaponId; damage: string; type: 'slashing' | 'piercing' | 'bludgeoning'; twoHanded?: boolean; finesse?: boolean; light?: boolean; ranged?: boolean };
  armor?: { ac: number; dexCap?: number; stealthDis?: boolean };
  shield?: { offhandId: OffhandId; ac: number };
  potion?: { heal?: string; effect?: string };
  stackable?: boolean;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
}
export interface InventorySlot { itemId: string; qty: number }
export type EquipSlot = 'mainHand' | 'offHand' | 'armor' | 'ring' | 'amulet';

export interface Collider { kind: 'circle'; x: number; z: number; r: number; tag?: string } 
export interface BoxCollider { kind: 'box'; x: number; z: number; w: number; d: number; yaw: number; tag?: string; y0?: number; y1?: number }
export type AnyCollider = Collider | BoxCollider;

export interface Trigger { id: string; x: number; z: number; r: number; once?: boolean; y?: number }
export interface Interactable {
  id: string; label: string; x: number; y: number; z: number; r: number; enabled: boolean; used?: boolean; kind?: string;
}

// ---- dialogue data (content agent writes trees, ui agent renders them, sim/dialogue.ts runs them) ----
export interface DialogueCheck { skill: SkillKey; dc: number; label?: string }
export interface DialogueChoice {
  text: string;                 // shown to player; may start with a bracketed tag e.g. "[Persuasion] ..."
  next: string | null;          // node id, or null to end
  check?: DialogueCheck;        // if present, a d20 skill check decides success/fail nodes
  successNext?: string; failNext?: string;
  effect?: string;              // opaque effect id handled by content/prologue.ts (e.g. 'giveGuidance', 'setFlag:x')
  condition?: string;           // opaque condition id; hidden if false (e.g. 'hasSword', 'class:wizard')
  tag?: 'attack' | 'leave' | 'roll' | 'gold';  // icon hint for UI
}
export interface DialogueNode {
  id: string;
  speaker: string;              // actor id ('ilyra', 'player', 'narrator', 'boss')
  text: string;                 // supports {name} and {class} substitutions
  emote?: string;               // animation name for the speaker (e.g. 'Cheer', 'Interact')
  shot?: 'ots' | 'closeup' | 'wide' | 'two';   // camera shot hint (over-the-shoulder is default)
  choices?: DialogueChoice[];   // absent = "continue" to `next`
  next?: string | null;
  effect?: string;              // fired when node is shown
}
export interface DialogueTree { id: string; start: string; nodes: Record<string, DialogueNode> }

// ---- classes / abilities (content/classes.ts defines, sim/combat.ts executes, ui shows) ----
export interface AbilityDef {
  id: string; name: string; icon: string; description: string;
  kind: 'attack' | 'spell' | 'buff' | 'heal' | 'utility';
  cost?: { resource: string; amount: number };  // e.g. {resource:'spellSlots1', amount:1} or stamina
  cooldown?: number; castTime?: number; range?: number; radius?: number;
  damage?: string; damageType?: import('../core/events.ts').DamageType; save?: { ability: AbilityKey; dc: number | 'spell' };
  anim?: string; projectile?: string; level?: number; concentration?: boolean;
}
export interface ClassDef {
  id: ClassId; name: string; model: ModelId; hitDie: number; description: string; flavour: string;
  abilities: Abilities; saveProfs: AbilityKey[]; skillProfs: SkillKey[];
  weapon: WeaponId; offhand: OffhandId; ac: number;
  kit: string[];                // ability ids on the hotbar (in order)
  resources: Record<string, number>;
  levelUpChoices: { id: string; name: string; description: string }[];  // feats at level 2
}
export interface QuestStep { id: string; title: string; hint: string; keys?: string[]; done?: boolean }

// ---------------------------------------------------------------------------------------------
// sim-rules: appended runtime types for combat / AI / items / projectiles. All optional on Actor
// so existing spawn() callers keep working; sim/world.ts fills them in.
// ---------------------------------------------------------------------------------------------
export type DamageType = import('../core/events.ts').DamageType;
export type EnemyKind = 'minion' | 'warrior' | 'mage' | 'rogue' | 'boss';
export type AttackPhase = 'startup' | 'charge' | 'active' | 'recovery';
export type WeaponStyle = '1h' | '2h' | 'dual' | 'unarmed';

/** One swing. Timings in seconds of sim time; `animSpeed` scales the clip so it roughly matches. */
export interface AttackDef {
  id: string;
  kind: 'light' | 'heavy' | 'charged' | 'special';
  anim: string; animSpeed: number;
  startup: number; active: number; recovery: number;
  /** forward root-motion distance (m) applied over the end of startup + active */
  step: number;
  reach: number;            // metres from the attacker centre
  arc: number;              // half-angle in radians (Math.PI = all around)
  damageMult: number;       // × weapon dice
  poiseDamage: number;
  cost: number;             // stamina
  cancelAt: number;         // fraction of recovery after which a queued attack may chain / dodge-cancel
  damage?: string;          // override dice (enemies / specials)
  damageType?: DamageType;
  attackBonus?: number;
  special?: 'shockwave' | 'leap' | 'bash' | 'whirlwind';
  saveDc?: number; saveAbility?: AbilityKey; radius?: number;
  telegraph?: boolean;      // AI: emit swing at startup so audio/vfx can telegraph
}

export interface Projectile {
  id: number; kind: string; spellId: string; ownerId: string; faction: Faction;
  pos: Vec3; vel: Vec3; speed: number; radius: number; ttl: number;
  targetId?: string | null; homing?: number;    // rad/s turn rate toward target
  damage: string; damageType: DamageType;
  attackBonus?: number;                          // ranged attack roll vs AC (absent = auto-hit)
  save?: { ability: AbilityKey; dc: number };    // half damage on success
  effect?: 'slow' | 'stagger' | null;
  poiseDamage?: number;
  crit?: boolean;                                // for thrown weapons: sneak-attack eligible
  sneak?: boolean;
  flatBonus?: number; label?: string; weaponAttack?: boolean;
}

export interface FeatDef { id: string; name: string; description: string; ability?: AbilityKey; hpPerLevel?: number }

// Interface merging (same module): adds optional members to the interfaces declared above.
export interface Actor {
    // combat runtime
    attack?: AttackDef | null; attackPhase?: AttackPhase | null; attackTime?: number; queued?: 'light' | 'heavy' | null;
    style?: WeaponStyle; attackAnimIndex?: number; hyperArmor?: boolean;
    resistances?: DamageType[]; vulnerabilities?: DamageType[]; immunities?: DamageType[];
    attackBonus?: number; damageDice?: string; damageType?: DamageType; critRange?: number;
    scale?: number; invulnerable?: boolean; xpValue?: number; enemyKind?: EnemyKind;
    feats?: string[]; expertise?: SkillKey[]; sneakDice?: string;
    castId?: string | null; castTime?: number; castTotal?: number; castTargetId?: string | null; castRecover?: number;
    drinkItem?: string | null; drinkTime?: number;
    animHold?: number;       // seconds the current emote/anim is held before the controller may override it
    pendingLevelUps?: number;
    lastAttackTime?: number; blockHits?: number; encounterId?: string | null;
    knockback?: { x: number; z: number; t: number } | null;
    important?: boolean;     // story character: cannot drop below 1 HP
    lastDamageTime?: number;
    queuedAt?: number; leapTo?: Vec3 | null;
}
export interface AIState {
    kind?: EnemyKind; strafeDir?: number; blockTimer?: number; attacksInRow?: number; nextDecision?: number;
    summoned?: boolean; jumpCooldown?: number; castCooldown?: number; holdPos?: Vec3 | null; follow?: boolean;
    healedThisEncounter?: boolean; taunted?: boolean; retreatTimer?: number; lostTargetTimer?: number; lastPlayerAttackSeq?: number;
    speedMul?: number;
}
export interface ItemDef {
    spell?: string;                   // scrolls: ability id cast on use
    armorType?: 'light' | 'medium' | 'heavy';
    ring?: { ac?: number; saves?: number };
    useAnim?: string; useTime?: number;
    heavyWeapon?: boolean;            // GWM-eligible
}
export interface ClassDef {
    expertise?: SkillKey[];
    startingItems?: { id: string; qty: number }[];
    startingEquipment?: Partial<Record<EquipSlot, string>>;
    feats?: string[];
    unarmoredDefense?: 'con';
    walkSpeed?: number; runSpeed?: number;
}
