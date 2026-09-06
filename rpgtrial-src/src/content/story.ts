// Hollowmere prologue — lore, area names, tutorial copy, Ilyra's barks. Pure data (no three, no DOM).
// content-quest agent owns this file. Strings only: the script in prologue.ts decides when they play.
import type { ClassId, QuestStep } from '../sim/types.ts';

// ---------------------------------------------------------------------------------------------
// Areas (emitted with `areaEnter`)
// ---------------------------------------------------------------------------------------------
export const AREAS = {
  shore: { id: 'shore', name: 'The Drowned Shore' },
  camp: { id: 'camp', name: "Pilgrim's Rest" },
  chapel: { id: 'chapel', name: 'The Chapel of Saint Aldric' },
  crypt: { id: 'crypt', name: "The Warden's Crypt" },
} as const;
export type AreaId = keyof typeof AREAS;

// ---------------------------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------------------------
export const CAST = {
  ilyra: { id: 'ilyra', name: 'Ilyra Vane', model: 'Rogue_Hooded' as const },
  boss: { id: 'boss', name: 'The Hollow Knight', subtitle: 'Warden of the Drowned' },
  captain: { id: 'captain', name: 'Skeleton Captain' },
} as const;

export const CLASS_NAMES: Record<ClassId, string> = {
  fighter: 'fighter', wizard: 'wizard', rogue: 'rogue', barbarian: 'barbarian', ranger: 'ranger',
};

// ---------------------------------------------------------------------------------------------
// Items the prologue hands out. sim-rules / items table defines these ids; unknown ids must not throw.
// ---------------------------------------------------------------------------------------------
export const ITEMS = {
  longsword: 'longsword',          // fallback weapon if the player somehow has none (the wreck holds the player's own class weapon)
  potion: 'potionHealing',
  ring: 'ringProtection',
  key: 'cryptKey',
} as const;
/** Class-appropriate gear from the camp chest (plus the ring for everyone). Ids from content/items.ts. */
export const CLASS_GEAR: Record<ClassId, { id: string; qty: number; equip?: boolean }[]> = {
  fighter: [{ id: 'scaleMail', qty: 1, equip: true }],
  wizard: [{ id: 'scrollMagicMissile', qty: 2 }],
  rogue: [{ id: 'studdedLeather', qty: 1, equip: true }],
  barbarian: [{ id: 'potionGreaterHealing', qty: 1 }],
  ranger: [{ id: 'studdedLeather', qty: 1, equip: true }],
};

// ---------------------------------------------------------------------------------------------
// Quest steps. ONE objective each. `keys` are glyph names the UI renders as keycaps.
// ---------------------------------------------------------------------------------------------
export const STEPS = {
  wake: { id: 'wake', title: 'Wake', hint: 'The Hollowmere does not give back what it takes.', keys: [] },
  move: { id: 'move', title: 'Find your feet', hint: 'Walk with the keys, look with the mouse. Take a few steps along the shore.', keys: ['W', 'A', 'S', 'D', 'Mouse'] },
  sprint: { id: 'sprint', title: 'Run', hint: 'Hold Shift while moving to sprint. It drains stamina — the yellow bar.', keys: ['Shift'] },
  dodge: { id: 'dodge', title: 'Roll', hint: 'Tap Space to dodge roll. You cannot be hit mid-roll.', keys: ['Space'] },
  jump: { id: 'jump', title: 'Jump', hint: 'Press Ctrl (or F) to jump. Rocks and roots go under you, not around you.', keys: ['Ctrl', 'F'] },
  sword: { id: 'sword', title: 'Take your weapon', hint: 'Your {weapon} washed up by the wreck. Walk to it and press E.', keys: ['E'] },
  inventory: { id: 'inventory', title: 'Open your pack', hint: 'Press I to open your inventory.', keys: ['I'] },
  equip: { id: 'equip', title: 'Arm yourself', hint: 'Equip the {weapon} from your inventory.', keys: ['I'] },
  sheet: { id: 'sheet', title: 'Know yourself', hint: 'Press C to open your character sheet.', keys: ['C'] },
  cardAbilities: { id: 'cardAbilities', title: 'Ability scores', hint: 'Six numbers describe you: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma. 10 is an ordinary person. Every 2 points above 10 is +1 to everything that score touches — swings, saves and skill checks.', keys: [] },
  cardAC: { id: 'cardAC', title: 'Armour Class', hint: 'AC is the number an attack must beat. Armour and shields raise it; Dexterity helps if the armour is light enough. At AC 16, a skeleton needs a 12 or better on its d20 after bonuses — most nights, it will not get one.', keys: [] },
  cardProf: { id: 'cardProf', title: 'Proficiency', hint: 'Proficiency is training: +2 at level 1, added on top of your ability modifier to anything you are proficient in — your weapons, some saves, and the skills your class taught you. Untrained skills get the raw modifier and your best hopes.', keys: [] },
  cache: { id: 'cache', title: 'Something in the rocks', hint: 'Walk the shoreline west of the wreck. Keep your eyes open.', keys: ['W', 'A', 'S', 'D'] },
  cacheLoot: { id: 'cacheLoot', title: 'Search the cache', hint: 'Press E to search the rocks.', keys: ['E'] },
  potion: { id: 'potion', title: 'Potions', hint: 'Press R to drink a Potion of Healing. Drink when hurt, not after — the dead do not wait for you to finish the bottle.', keys: ['R'] },
  talk: { id: 'talk', title: 'Speak with Ilyra', hint: 'Walk up to Ilyra and press E. Choices in brackets [like this] roll a d20 against a difficulty.', keys: ['E'] },
  camp: { id: 'camp', title: "Reach Pilgrim's Rest", hint: 'Follow the path east to the campfire.', keys: ['W'] },
  rest: { id: 'rest', title: 'Rest at the fire', hint: 'Press E at the campfire. Ilyra will explain short and long rests.', keys: ['E'] },
  chest: { id: 'chest', title: 'Open the chest', hint: 'Someone left a chest by the fire. Press E to open it.', keys: ['E'] },
  hotbar: { id: 'hotbar', title: 'Your abilities', hint: 'Your class abilities sit on the hotbar. Press 1 to use the first one. Spells cost slots; other tricks have cooldowns.', keys: ['1', '2', '3', '4'] },
  boulder: { id: 'boulder', title: 'Clear the rockfall', hint: 'A boulder blocks the path. Press E and roll Athletics (DC 12). You can try again if you fail.', keys: ['E'] },
  boulderHelp: { id: 'boulderHelp', title: 'Working together', hint: 'Ilyra can help: with the Help action you roll with advantage — two d20s, keep the higher. Press E to try again.', keys: ['E'] },
  chapel: { id: 'chapel', title: 'Reach the chapel', hint: 'Follow the path uphill to the ruined chapel of Saint Aldric.', keys: ['W'] },
  lockOn: { id: 'lockOn', title: 'Lock on', hint: 'Press Tab (or middle mouse) to lock onto an enemy. Scroll to switch targets.', keys: ['Tab'] },
  lightAttack: { id: 'lightAttack', title: 'Light attack', hint: 'Left click for a quick strike. Chain clicks for a combo.', keys: ['LMB'] },
  dodgeAttack: { id: 'dodgeAttack', title: 'Dodge an attack', hint: 'When a skeleton swings, tap Space to roll through it. Invulnerable during the roll.', keys: ['Space'] },
  block: { id: 'block', title: 'Block', hint: 'Hold Q to block. Block just as the blow lands (first 0.2 s) to parry and stagger the attacker.', keys: ['Q'] },
  blockWizard: { id: 'block', title: 'Shield', hint: 'Hold Q to raise Shield. Cast it just as the blow lands to turn the hit aside entirely.', keys: ['Q'] },
  heavyAttack: { id: 'heavyAttack', title: 'Heavy attack', hint: 'Right click for a heavy strike. Hold it (a quarter second or more) to charge — more damage, breaks poise.', keys: ['RMB'] },
  ability: { id: 'ability', title: 'Use an ability', hint: 'Press 1 to use your first class ability in the fight.', keys: ['1'] },
  finishChapel: { id: 'finishChapel', title: 'Put them down', hint: 'Destroy the remaining skeletons.', keys: [] },
  levelUp: { id: 'levelUp', title: 'Level 2', hint: 'You have enough experience for level 2. Open the level-up screen and choose.', keys: [] },
  captain: { id: 'captain', title: 'The captain', hint: 'A Skeleton Captain has risen by the altar. Destroy it.', keys: ['Tab', 'LMB'] },
  key: { id: 'key', title: 'Find the crypt key', hint: 'Take the key from the captain, or search the altar (Religion / Investigation, DC 10). Either works.', keys: ['E'] },
  gate: { id: 'gate', title: 'Open the crypt gate', hint: 'Press E at the iron gate. With the key it opens; without, roll Sleight of Hand (DC 14) — you may retry.', keys: ['E'] },
  crypt: { id: 'crypt', title: 'Into the crypt', hint: 'Follow the candles. Stay off the walls.', keys: ['W'] },
  cryptHall: { id: 'cryptHall', title: 'Ambush', hint: 'A Skeleton Mage and a Rogue. Close on the mage first; keep moving so its bolts miss.', keys: ['Space', 'Tab'] },
  brazier: { id: 'brazier', title: 'Catch your breath', hint: 'Press E at the brazier to take a short rest, or walk on to the Warden\'s door.', keys: ['E'] },
  boss: { id: 'boss', title: 'The Hollow Knight', hint: 'Destroy the Warden of the Drowned. Dodge the big swings, punish the recovery.', keys: ['Space', 'LMB', 'RMB', '1'] },
  ending: { id: 'ending', title: 'No bells', hint: 'Speak with Ilyra.', keys: ['E'] },
} satisfies Record<string, QuestStep>;
export type StepId = keyof typeof STEPS;

// ---------------------------------------------------------------------------------------------
// Ilyra's barks per beat (non-blocking subtitle lines). `{class}` / `{name}` substituted.
// Class-specific variants where cheap.
// ---------------------------------------------------------------------------------------------
export type Bark = string | ({ default: string } & Partial<Record<ClassId, string>>);
export const BARKS: Record<string, Bark> = {
  wakeUp: "Easy. Breathe. In — good. You were face down in the shallows with a rib through your lung. The Moonmaiden and I have been arguing about you for the better part of an hour.",
  wakeUp2: "She won. Get up when you're ready. Not before.",
  move: "Get your legs under you. Walk a little — the beach won't bite. The lake might.",
  sprint: "Good. Now run. If tonight goes the way I think it will, you'll want the practice.",
  dodge: "When something swings at you, don't be where it swings. Roll.",
  jump: "And the rocks — over, not around. You're not a barrel.",
  sword: { default: "Your {weapon} washed up by the wreck — the lake spat it out after you. Take it before it changes its mind.", wizard: "Your {weapon} washed up by the wreck. Yes, I know what you'd rather be holding. Until you've slept, that's the spell that never runs out.", rogue: "Your {weapon} washed up by the wreck. The lake kept the other one, I'm afraid — no, sorry, that's on your belt. Take it.", barbarian: "Your {weapon} washed up by the wreck. It took two of us to drag it clear. I'd like that noted." },
  inventory: "Check your pack. Whatever the lake didn't want, you still have.",
  equip: "A weapon in the pack is a very heavy stick. Put it in your hand.",
  sheet: "You'll want to know what you're working with. Look at yourself — honestly, for once.",
  sheetDone: "That's you. Numbers lie less than people. Remember that when we talk.",
  cacheSuccess: "Sharp eyes. Someone stashed that and didn't come back for it. I doubt they'll mind.",
  cacheFail: "You walked straight past it. There — under the rocks. Rule one of the shore: nothing here is just rocks.",
  potion: "Healing potions. Drink one when you're hurt, not after. The dead don't wait for you to finish the bottle.",
  potionDrunk: "See? Tastes like copper and regret. Works, though.",
  talk: "Now. Come here. We should talk before we walk, and I'd rather do it where the light is.",
  toCamp: "There's a camp up the path, past the wreck. Fire, a chest someone left, and a log I've grown attached to. Come on — you can walk now. I checked.",
  camp: "Pilgrim's Rest. Ambitious name for a fire and a log, but the fire's honest.",
  chest: "Someone left a chest. In my experience that means a gift or a trap, and tonight I'll take either.",
  chestOpened: { default: "Better armour than the lake left you. And a ring — silver, old work. The Lady's, if I had to guess. Wear it; it turns blades that should have landed.", wizard: "Scrolls. Magic missile, twice, for when the words won't come. And a ring — wear it; it turns blades that should have landed.", barbarian: "A potion that's actually worth drinking. And a ring — wear it. It turns blades that should have landed." },
  hotbar: { default: "Show me what you've got, {class}. Not the sword — the other thing.", wizard: "You have a spell. Cast it. Please don't aim it at me.", barbarian: "Go on. Get angry. I've seen it work.", rogue: "Your particular trick. The one you don't tell the guards about.", fighter: "Whatever they taught you in the yard. Show me.", ranger: "Whatever you do to things at a distance. Show me." },
  hotbarDone: "Good. That comes back with rest, so don't be shy with it. Path's east. Mind the rocks — I mean that literally.",
  boulder: "Rockfall. The path's under there somewhere. Put your shoulder into it — 'Athletics' is the polite word for shoving.",
  boulderFail: "It's a rock; it has all night. Try again — or let me help. Two backs are better than one.",
  boulderNat1: "…Did you just slip on flat ground?",
  boulderSuccess: "There. Watch your feet on the way down.",
  boulderNat20: "You moved that like it owed you money.",
  boulderHelped: "See? Advantage. Two dice, keep the better one. Remember that when you've got a friend nearby.",
  chapel: "Saint Aldric's. The saint who bound the drowned and — apparently — didn't bind them well enough. Stay close. These graves are fresh in the wrong direction.",
  rising: "They're coming up. Sword out. Pick one and stay on it.",
  lockOn: "Pick one. Look at it and don't look away.",
  lightAttack: "Hit it. Quick strikes — don't wind up.",
  dodgeAttack: "When it swings, roll. Not away — through.",
  block: { default: "Or take it on the shield. Catch it early and it staggers.", wizard: "Your Shield spell. Now would be good.", barbarian: "Take it on the axe. Or the chest, knowing your sort.", rogue: "Or turn it with the blade. Early — it's about timing, not muscle." },
  heavyAttack: "Now the big one. Hold, then let go.",
  ability: "Your trick. Now.",
  stagesDone: "Good. You've got the shape of it. Finish them.",
  stagesSkipped: "…Well. That works too.",
  chapelDone: "That was three. He's still down there, and he has more.",
  levelUp: "You feel that? That's the world noticing you. Take it — they don't hand it out twice.",
  levelUpAgain: "…Twice, apparently. Don't let it go to your head. Or do — you've earned it tonight.",
  captain: "Another one. That one's older — look at the tabard. One of Aldric's, and he's not done.",
  captainDown: "That one had a key on his belt. The gate up the hill — that's where he was going. If it's not on him, the altar. Aldric's wardens always kept a spare.",
  keyTaken: "The key. Thank the Moonmaiden for small, rusted mercies.",
  altarSuccess: "There — under the saint's hand. They always kept a spare. Priests are predictable; it's why I'm good at this.",
  altarFail: "Nothing. Or nothing you can see. Try again, or take it off the captain.",
  gate: "Iron and prayer. The prayer's worn off — the iron's your problem.",
  gateFail: "Feel for the second pin. No — the other second pin. Again.",
  gateKey: "Key first, prayers second. Let's see if three hundred years of rust remembers what it's for.",
  gateOpen: "Doors. There's always another door. Go on — I'll be right behind you, which I realise is what people say before they aren't.",
  crypt: "Stay off the walls. Candles don't light themselves — something's home.",
  cryptHall: "A mage. Get to it before it gets to you — they die like anyone else, they just talk more first.",
  cryptHallDone: "Good. If it glows, you move. That's most of surviving casters.",
  brazier: "Catch your breath. Whatever's behind that door has waited three hundred years; it can wait ten minutes.",
  brazierRested: "Better. Now — quietly. He knows we're here; there's no reason to be rude about it.",
  bossHesitate: "It worked. Now — while he doubts!",
  bossFail: "…Well. I've seen worse openings. Go!",
  bossHalf: "He's slowing — the armour's heavier than the oath. Keep on him!",
  bossDown: "…It's done. Listen. — No bells.",
  playerDeath: "No — no, not again. Lady of Silver, one more. Just one more.",
  respawn: "I've got you. Again. We're going to have words about your footwork.",
  // crit reactions (any check)
  nat20: { default: "…The Lady's watching. Or you're lucky. Either's fine by me." },
  nat1: { default: "That's — no. We'll pretend I didn't see that." },
};
/** Skill-specific crit lines (fallback to BARKS.nat20 / nat1). */
export const CRIT_LINES: Partial<Record<string, { nat20?: string; nat1?: string }>> = {
  perception: { nat20: "You saw that from the wreck, didn't you. Remind me never to hide anything from you.", nat1: "You're looking at your own feet. The cache is the other way." },
  athletics: { nat20: "You moved that like it owed you money.", nat1: "…Did you just slip on flat ground?" },
  sleightOfHand: { nat20: "Did you even touch it? It just… opened for you.", nat1: "That's the pick snapped off in the lock. Fortunately I brought three." },
  insight: { nat20: "Stop looking at me like that. Fine. Fine.", nat1: "You're squinting. It's not helping." },
  persuasion: { nat20: "…That's the worst part. You actually mean it.", nat1: "Was that supposed to be a speech?" },
  intimidation: { nat20: "All right! All right. Lady of Silver, your face.", nat1: "You're bleeding on your own boots. It's not as menacing as you think." },
  religion: { nat20: "You'd have made a decent priest. Awful hours, though.", nat1: "That's not a relic, it's a candle-holder." },
  investigation: { nat20: "Under the hand — how did you — never mind. Good.", nat1: "You're looking under the wrong saint." },
};

// ---------------------------------------------------------------------------------------------
// Journal codex. `unlock` is a quest flag; entries without one are known from the start.
// ---------------------------------------------------------------------------------------------
export interface CodexEntry { id: string; title: string; text: string; unlock?: string }
export const CODEX: CodexEntry[] = [
  {
    id: 'hollowmere', title: 'The Hollowmere',
    text: "A drowned valley. Two centuries and a half ago the town of Aldmere sat where the water is now, until a plague came upriver and the abbey — for the best of reasons — opened the sluices at Marrow's Weir. The town went under in a night. The plague ended. The bells did not. On still evenings, fishermen swear they hear them ringing from the bottom. The wise ones stay off the water after dusk. The barge you were on was not crewed by the wise ones.",
  },
  {
    id: 'moonmaiden', title: 'The Moonmaiden',
    text: "Our Lady of Silver: goddess of the moon, of lost travellers and second chances. Her clerics keep vigil by night, which makes them useful on a shore like this one and unpopular at breakfast. Her doctrine is short — the dark is not the enemy; it is only where the light has not reached yet. Ilyra Vane says this often. She says it as though she is trying to convince herself.",
    unlock: 'met:ilyra',
  },
  {
    id: 'aldric', title: 'Saint Aldric and the Binding',
    text: "When the drowned of Aldmere rose from the flood — as the drowned sometimes do when they die angry — a priest named Aldric walked into the lake with a silver lantern and did not come out for three days. When he did, the dead lay quiet. He built a chapel on the north shore and a crypt beneath it, and he left his order's knights to keep the door. The chapel is a ruin now. The crypt is not.",
    unlock: 'area:chapel',
  },
  {
    id: 'hollowKnight', title: 'The Hollow Knight',
    text: "Ser Oswin Marrow, Warden of the Drowned. Last of Aldric's knights, who watched the abbey stop sending relief and understood that no one was coming. The oath permitted no retirement. So he kept it the only way left to him: he lay down among the dead he guarded, and became one, and kept guarding. The armour is empty. The oath is not. That is what 'hollow' means.",
    unlock: 'lore:marrow',
  },
  {
    id: 'pilgrimsRest', title: "Pilgrim's Rest",
    text: "A clearing above the shore with a fire-pit older than the chapel. Pilgrims to Saint Aldric's stop here for the night before the last climb, which is why there is always a chest someone meant to come back for, and a log that has heard every confession in the valley.",
    unlock: 'area:camp',
  },
  {
    id: 'ilyra', title: 'Ilyra Vane',
    text: "Half-elf. Cleric of the Moonmaiden, sent by the Silver Abbey to recover a reliquary the Wardens took three centuries ago. Broke the seal on the Warden's crypt at moonrise. Has not slept. Will not say how many she pulled from the water; the number she gives changes.",
    unlock: 'ilyraConfessed',
  },
];

// ---------------------------------------------------------------------------------------------
// Ending / misc copy
// ---------------------------------------------------------------------------------------------
export const TITLE = { name: 'HOLLOWMERE', tagline: 'The lake keeps what it is given.' };
export const ENDING_STATS_LABELS: Record<string, string> = {
  rolls: 'Dice rolled', nat20: 'Natural 20s', nat1: 'Natural 1s', damageDealt: 'Damage dealt', damageTaken: 'Damage taken',
  deaths: 'Deaths', kills: 'Skeletons put down', potions: 'Potions drunk', time: 'Time (seconds)', checksPassed: 'Checks passed', checksFailed: 'Checks failed',
};
