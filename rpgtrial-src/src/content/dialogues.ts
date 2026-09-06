// Hollowmere prologue — dialogue trees as data. Run by sim/dialogue.ts; effects/conditions resolved by content/prologue.ts.
// Speakers: 'narrator' | 'ilyra' | 'player' | 'boss'. `{name}` / `{class}` / `{Class}` are substituted at runtime.
// Conventions: choice text starting with "[Skill]" rolls; `tag: 'roll'` lets the UI draw a d20; `tag: 'leave'` ends.
import type { DialogueTree } from '../sim/types.ts';

// ---------------------------------------------------------------------------------------------
// 0. Waking on the shore. Narrator over a wide shot, then Ilyra close.
// ---------------------------------------------------------------------------------------------
export const INTRO: DialogueTree = {
  id: 'intro', start: 'n1',
  nodes: {
    n1: { id: 'n1', speaker: 'narrator', shot: 'wide', text: "The Hollowmere does not give back what it takes. Ask anyone in the valley; they will tell you about the bells.", next: 'n2' },
    n2: { id: 'n2', speaker: 'narrator', shot: 'wide', text: "Tonight it made an exception. One barge, six pilgrims, one hired {class}. The dead came up through the reeds at dusk and the water did the rest.", next: 'n3' },
    n3: { id: 'n3', speaker: 'narrator', shot: 'wide', text: "You are the exception.", next: 'i1' },
    i1: { id: 'i1', speaker: 'ilyra', shot: 'closeup', emote: 'Spellcast_Raise', text: "Easy. Breathe. In — good. You were face down in the shallows with a rib through your lung. The Moonmaiden and I have been arguing about you for the better part of an hour.", next: 'i2' },
    i2: { id: 'i2', speaker: 'ilyra', shot: 'closeup', text: "She won. Get up when you're ready. Not before.", next: null },
  },
};

// ---------------------------------------------------------------------------------------------
// 4. The first real conversation. ≥ 8 nodes, Insight DC 10 → Persuasion DC 13 / Intimidation DC 15 → confession.
//    Guidance offered at the end. Flags: ilyraConfessed, ilyraIntimidated, ilyraDeflected, ilyraTrusts, ilyraOwes, askedMarrow.
// ---------------------------------------------------------------------------------------------
export const ILYRA_TALK: DialogueTree = {
  id: 'ilyraTalk', start: 't1',
  nodes: {
    t1: {
      id: 't1', speaker: 'ilyra', shot: 'two', effect: 'flag:met:ilyra',
      text: "Right. Names first. I'm Ilyra — cleric of the Moonmaiden, lately of the Silver Abbey, currently of this beach. And you're the one who kept breathing. {name}, according to the barge manifest. A {class}.",
      choices: [
        { text: "{name}. Yes. What happened to the others?", next: 't2' },
        { text: "Since when do clerics read manifests?", next: 't2b' },
        { text: "A cleric who reads. Careful — they'll make you a bishop.", next: 't2c', condition: 'class:wizard' },
        { text: "Names later. Where are the things that did this?", next: 't3', condition: 'class:barbarian', effect: 'flag:ilyraBlunt' },
      ],
    },
    t2: { id: 't2', speaker: 'ilyra', shot: 'closeup', text: "In the lake. I'm sorry. I pulled out three. Two were already gone, and the third — the third was you.", next: 't3' },
    t2b: { id: 't2b', speaker: 'ilyra', text: "Since the manifest washed up beside you and I like to know who I'm praying over. Sit still — you're still bleeding somewhere, I just haven't found it yet.", next: 't3' },
    t2c: { id: 't2c', speaker: 'ilyra', emote: 'Interact', text: "They tried. I was awful at it. Bishops sleep at night; I've never managed the trick. Sit still — you're still bleeding somewhere.", next: 't3' },
    t3: {
      id: 't3', speaker: 'ilyra', shot: 'ots',
      text: "Here's what I know. The Hollowmere's dead have stayed down for three hundred years because a knight named Marrow swore they would. Tonight they came up in a line and walked onto your barge like it was a ferry.",
      choices: [
        { text: "Why tonight? What changed?", next: 't4' },
        { text: "[Insight] Something in the way she says 'tonight'. She knows more than she's telling.", next: 't4', check: { skill: 'insight', dc: 10, label: 'Insight' }, successNext: 't5', failNext: 't4f', tag: 'roll' },
        { text: "Who's Marrow?", next: 't3b', condition: '!flag:askedMarrow', effect: 'flag:askedMarrow' },
      ],
    },
    t3b: {
      id: 't3b', speaker: 'ilyra', effect: 'flag:lore:marrow',
      text: "Ser Oswin Marrow. The Warden of the Drowned. Saint Aldric bound the dead and Marrow kept the binding — long after Aldric, long after the abbey stopped sending anyone to check. The valley calls him the Hollow Knight. It isn't a compliment.",
      next: 't3',
    },
    t4: {
      id: 't4', speaker: 'ilyra', shot: 'ots',
      text: "The binding failed. That's the short version. The long version is in the crypt under the chapel, and I'm going there to end it. Marrow's holding the dead up like a man holding a door — and he's standing in the doorway. Take him out and they lie back down.",
      next: 't6',
    },
    t4f: { id: 't4f', speaker: 'ilyra', text: "Nothing changed. Bindings fail. Three hundred years is a long time to hold a door.", next: 't4' },
    t5: {
      id: 't5', speaker: 'ilyra', shot: 'closeup',
      text: "…You've a look. Fine. Yes — I know more than I'm telling. Everyone does. Ask me the right way and I might tell you.",
      choices: [
        { text: "[Persuasion] I nearly drowned for whatever this is. I've earned the truth.", next: 't7', check: { skill: 'persuasion', dc: 13, label: 'Persuasion' }, successNext: 't7', failNext: 't5f', tag: 'roll' },
        { text: "[Intimidation] I pulled a rib out of my own lung tonight. Don't make me pull anything out of you.", next: 't7i', check: { skill: 'intimidation', dc: 15, label: 'Intimidation' }, successNext: 't7i', failNext: 't5f', tag: 'roll' },
        { text: "Keep it, then. Tell me what I need to know.", next: 't4', effect: 'flag:ilyraSecretKept' },
      ],
    },
    t5f: {
      id: 't5f', speaker: 'ilyra', effect: 'flag:ilyraDeflected',
      text: "No. Not yet. Not because I enjoy it — because if I say it out loud you'll walk off, and I need you. Ask me again when he's dead.",
      next: 't4',
    },
    t7: {
      id: 't7', speaker: 'ilyra', shot: 'closeup', effect: 'flag:ilyraConfessed',
      text: "…It was me. The binding didn't fail; I opened it. There's a reliquary in that crypt — my order's, taken by the Wardens when the abbey and the chapel fell out three centuries ago. I was sent to bring it home. I got as far as the seal. I thought: a cleric of the Moonmaiden, in a crypt built by clerics of the Moonmaiden. It would know me.",
      next: 't7b',
    },
    t7b: { id: 't7b', speaker: 'ilyra', shot: 'closeup', text: "It did not know me.", next: 't8' },
    t7i: {
      id: 't7i', speaker: 'ilyra', shot: 'closeup', emote: 'Hit_A', effect: 'flag:ilyraConfessed;flag:ilyraIntimidated',
      text: "…All right. All right. It was me. I broke the seal on the Warden's crypt at moonrise, looking for something that belongs to my order, and the dead came out past me like I was a wall they'd been waiting to walk through. Six pilgrims. Your six pilgrims.",
      next: 't8',
    },
    t8: {
      id: 't8', speaker: 'ilyra', shot: 'two',
      text: "So now you know why I'm on this beach fishing strangers out of the water instead of running for the abbey. I am going to fix it. I would prefer not to do it alone.",
      choices: [
        { text: "Then we fix it. Together.", next: 't9', effect: 'flag:ilyraTrusts' },
        { text: "We'll talk about what you owe me when he's dead.", next: 't9', effect: 'flag:ilyraOwes' },
        { text: "Six people, Ilyra.", next: 't8b', condition: 'flag:ilyraIntimidated' },
      ],
    },
    t8b: { id: 't8b', speaker: 'ilyra', shot: 'closeup', text: "I know. I counted. I'll count them every night for the rest of my life, and that's still not the same as fixing it. Come with me.", next: 't9', effect: 'flag:ilyraOwes' },
    t6: {
      id: 't6', speaker: 'ilyra', shot: 'two',
      text: "Whatever you decide about me later, decide it after. Tonight I need a sword that's still attached to someone.",
      next: 't9',
    },
    t9: {
      id: 't9', speaker: 'ilyra', shot: 'ots',
      text: "One more thing. The Lady has a thumb she likes to put on the scale — 'Guidance', we call it. The next hard thing you try, you roll an extra die. Want it?",
      choices: [
        { text: "Bless me, then. I'll take every edge.", next: 't10', effect: 'giveGuidance' },
        { text: "Keep your prayers. I'll manage.", next: 't10b', effect: 'flag:refusedGuidance' },
        { text: "Do I look like I need it?", next: 't10c', condition: 'class:barbarian' },
      ],
    },
    t10: { id: 't10', speaker: 'ilyra', emote: 'Spellcast_Raise', text: "Hold still. — There. Don't waste it on a door.", next: 't11' },
    t10b: { id: 't10b', speaker: 'ilyra', emote: 'Interact', text: "Suit yourself. The offer stands — the Lady is patient and so, unfortunately, am I.", next: 't11' },
    t10c: { id: 't10c', speaker: 'ilyra', emote: 'Cheer', text: "You look like you need a bath and a week. But no — I'll save it. Ask if you change your mind.", next: 't11' },
    t11: {
      id: 't11', speaker: 'ilyra', shot: 'wide', effect: 'codex:pilgrimsRest;flag:ilyraSaidCamp',
      text: "There's a camp up the path past the wreck. Fire, a chest someone left, and a log I've grown attached to. Come on — you can walk now. I checked.",
      next: null,
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Re-talk hub: press E on Ilyra any time after the first conversation.
// ---------------------------------------------------------------------------------------------
export const ILYRA_CHAT: DialogueTree = {
  id: 'ilyraChat', start: 'h1',
  nodes: {
    h1: {
      id: 'h1', speaker: 'ilyra', shot: 'ots', text: "Mm?",
      choices: [
        { text: "Tell me about the Moonmaiden.", next: 'moon', condition: '!flag:askedMoon', effect: 'flag:askedMoon' },
        { text: "Who's Marrow, really?", next: 'marrow', condition: '!flag:askedMarrow', effect: 'flag:askedMarrow' },
        { text: "About that blessing…", next: 'guidance', condition: '!flag:guidance' },
        { text: "You said 'ask me again when he's dead'. He's not dead yet, but—", next: 'again', condition: 'flag:ilyraDeflected' },
        { text: "Nothing. Let's go.", next: null, tag: 'leave' },
      ],
    },
    moon: { id: 'moon', speaker: 'ilyra', shot: 'closeup', effect: 'codex:moonmaiden', text: "Our Lady of Silver. Moon, lost travellers, second chances — the patron of everyone who's out too late for their own good. Her clerics keep vigil at night. It makes us useful on a shore like this and unpopular at breakfast. Her whole doctrine fits in a sentence: the dark isn't the enemy, it's just where the light hasn't reached yet.", next: 'moon2' },
    moon2: { id: 'moon2', speaker: 'ilyra', text: "I say that a lot. I'm told it sounds like I'm trying to convince myself.", next: 'h1' },
    marrow: { id: 'marrow', speaker: 'ilyra', shot: 'closeup', effect: 'flag:lore:marrow', text: "Ser Oswin Marrow. Last of Aldric's knights. The abbey stopped sending relief after the first century and he understood — properly understood — that no one was coming. The oath didn't allow for retirement. So he lay down among the dead he was guarding and became one of them, and kept guarding. The armour's empty. The oath isn't.", next: 'h1' },
    guidance: { id: 'guidance', speaker: 'ilyra', emote: 'Spellcast_Raise', effect: 'giveGuidance', text: "Changed your mind? Good. Hold still. — There. An extra d4 on your next check. Don't waste it on a door.", next: 'h1' },
    again: { id: 'again', speaker: 'ilyra', shot: 'closeup', text: "He's not. So no. But I'll say this much: whatever you find down there that looks like it doesn't belong to a knight — it doesn't. It belongs to my order. That's the whole of what I'll say until he's ash.", next: 'h1' },
  },
};

// ---------------------------------------------------------------------------------------------
// 5. Campfire: the rest lesson (short vs long). Effects: rest:short / rest:long.
// ---------------------------------------------------------------------------------------------
export const CAMPFIRE: DialogueTree = {
  id: 'campfire', start: 'c1',
  nodes: {
    c1: {
      id: 'c1', speaker: 'ilyra', shot: 'two', emote: 'Sit_Floor_Idle',
      text: "Sit. Two kinds of rest, and they aren't the same. A short rest is an hour — bandage, breathe, spend a hit die or two to get some health back, and some of your tricks come back with it. A long rest is a night: everything comes back. Spells, all of it. But nights are when the dead walk, and we don't have one to spare.",
      choices: [
        { text: "[Short rest] An hour. I can spare an hour.", next: 'cs', effect: 'rest:short' },
        { text: "[Long rest] I need the night.", next: 'cl', effect: 'rest:long' },
        { text: "I don't need to rest.", next: 'cn', tag: 'leave' },
      ],
    },
    cs: { id: 'cs', speaker: 'ilyra', text: "Good. I'll watch the water. If you hear a bell, you'll know before I do — you'll be the one it's for.", next: null },
    cl: { id: 'cl', speaker: 'ilyra', emote: 'Interact', text: "…Fine. I'll wake you if the bells start. Don't make me wake you.", next: null },
    cn: { id: 'cn', speaker: 'ilyra', text: "Stubborn. The fire's here when you need it, and you will.", next: null },
  },
};

// ---------------------------------------------------------------------------------------------
// 6. Boulder: after the first failed Athletics check. Teaches Help / advantage.
// ---------------------------------------------------------------------------------------------
export const BOULDER_HELP: DialogueTree = {
  id: 'boulderHelp', start: 'b1',
  nodes: {
    b1: {
      id: 'b1', speaker: 'ilyra', shot: 'two',
      text: "It's a rock. It has all night; you don't. Try again — or let me get under it with you. Two backs. That's the Help action: one of us braces, the other rolls with advantage — two dice, keep the better.",
      choices: [
        { text: "[Working together] Help me push.", next: 'b2', effect: 'flag:boulderHelp' },
        { text: "I've got it.", next: 'b3' },
      ],
    },
    b2: { id: 'b2', speaker: 'ilyra', emote: 'Interact', text: "On three. One — two —", next: null },
    b3: { id: 'b3', speaker: 'ilyra', text: "Said every drowned man to every river. Go on, then.", next: null },
  },
};

// ---------------------------------------------------------------------------------------------
// 10. The Hollow Knight. Three lines, then a DC 15 Intimidation / Persuasion to make him hesitate.
// ---------------------------------------------------------------------------------------------
export const BOSS_INTRO: DialogueTree = {
  id: 'bossIntro', start: 'k1',
  nodes: {
    k1: {
      id: 'k1', speaker: 'boss', shot: 'closeup', emote: 'Skeletons_Awaken_Standing',
      text: "Three hundred years I have kept this door. The saint died. The abbey forgot. The bells rang under the water and I did not open it.",
      next: 'k2',
    },
    k2: {
      id: 'k2', speaker: 'boss', shot: 'closeup', emote: 'Taunt',
      text: "And then a child of the moon came with a key that was not hers. And now you. Another for the lake. Say your name, so I may add it to the count.",
      choices: [
        { text: "[Intimidation] I'm the one who finishes what Aldric started. Kneel, Warden.", next: 'kh', check: { skill: 'intimidation', dc: 15, label: 'Intimidation' }, successNext: 'kh', failNext: 'kf', tag: 'roll' },
        { text: "[Persuasion] Your oath was to keep them down, Marrow. Look at them. You're the one holding them up.", next: 'kh', check: { skill: 'persuasion', dc: 15, label: 'Persuasion' }, successNext: 'kh', failNext: 'kf', tag: 'roll' },
        { text: "She opened your door. I'm here to close it.", next: 'kc', condition: 'flag:ilyraConfessed', tag: 'attack' },
        { text: "{name}. Remember it.", next: 'kn', tag: 'attack' },
      ],
    },
    kh: { id: 'kh', speaker: 'boss', shot: 'closeup', emote: 'Hit_B', effect: 'bossHesitate', text: "…Kneel. I have not — I have not knelt since —", next: 'kh2' },
    kh2: { id: 'kh2', speaker: 'narrator', shot: 'closeup', text: "The armour sways. For one moment there is nothing inside it but doubt.", next: null },
    kf: { id: 'kf', speaker: 'boss', emote: 'Taunt', text: "No.", next: null },
    kc: { id: 'kc', speaker: 'boss', shot: 'closeup', text: "Then we want the same thing, {class}. Come and take my post.", next: null },
    kn: { id: 'kn', speaker: 'boss', shot: 'closeup', text: "{name}. Yes. I will remember.", next: null },
  },
};

// ---------------------------------------------------------------------------------------------
// 11. Ending. Branches on whether Ilyra confessed. Sets endingAbbey / endingSecret / endingOwed.
// ---------------------------------------------------------------------------------------------
export const ENDING: DialogueTree = {
  id: 'ending', start: 'e1',
  nodes: {
    e1: { id: 'e1', speaker: 'ilyra', shot: 'two', text: "…Listen.", next: 'e2' },
    e2: { id: 'e2', speaker: 'ilyra', shot: 'closeup', text: "No bells.", next: 'e3' },
    e3: {
      id: 'e3', speaker: 'ilyra', shot: 'two',
      text: "He's down. They'll go down with him — the lake keeps what it's given, and tonight it was given a Warden.",
      // conditional routing: `next: 'a?condition|b'` (see sim/dialogue.ts)
      next: 'e5c?flag:ilyraConfessed|e5n',
    },
    e5c: {
      id: 'e5c', speaker: 'ilyra', shot: 'closeup',
      text: "You know what I did. What happens now is yours to decide. The abbey will want to know, and I'm done lying to people who bleed for me.",
      choices: [
        { text: "We go to the abbey. You tell them yourself.", next: 'e6a', effect: 'flag:endingAbbey' },
        { text: "Nobody needs to know. The valley's safe.", next: 'e6b', effect: 'flag:endingSecret' },
        { text: "You still owe me. I'll decide what for.", next: 'e6c', effect: 'flag:endingOwed' },
      ],
    },
    e5n: {
      id: 'e5n', speaker: 'ilyra', shot: 'closeup',
      text: "There's something I haven't told you. I'll tell you on the road — but there's a reliquary in that crypt that shouldn't be here, and an abbey four days north that's going to ask why. Come with me?",
      choices: [
        { text: "North, then.", next: 'e6a', effect: 'flag:endingAbbey' },
        { text: "[Insight] You broke that seal, didn't you.", next: 'e6d', check: { skill: 'insight', dc: 10, label: 'Insight' }, successNext: 'e6d', failNext: 'e6a', tag: 'roll' },
        { text: "I'm done with your church's problems.", next: 'e6e', effect: 'flag:endingAlone' },
      ],
    },
    // ending flags live on the nodes so every route (including failed checks) records its outcome
    e6a: { id: 'e6a', speaker: 'ilyra', shot: 'two', effect: 'flag:endingAbbey', text: "Then we walk at first light. The Silver Abbey's four days north — and I know a shorter road, which is how all this started.", next: 'e7' },
    e6b: { id: 'e6b', speaker: 'ilyra', shot: 'closeup', effect: 'flag:endingSecret', text: "…That's either mercy or negligence, and I'll spend the walk deciding which. Thank you.", next: 'e7' },
    e6c: { id: 'e6c', speaker: 'ilyra', shot: 'closeup', emote: 'Interact', effect: 'flag:endingOwed', text: "That's fair. That's more than fair. I'll be around to collect from — I've nowhere else to be.", next: 'e7' },
    e6d: { id: 'e6d', speaker: 'ilyra', shot: 'closeup', effect: 'flag:ilyraConfessed;flag:endingAbbey', text: "…Yes. And there's a great deal more to it, and you'll hear all of it before we reach the abbey. Walk with me?", next: 'e7' },
    e6e: { id: 'e6e', speaker: 'ilyra', shot: 'closeup', effect: 'flag:endingAlone', text: "That's your right. The road north's the same road for the first day, though. I'll try not to talk.", next: 'e7' },
    e7: {
      id: 'e7', speaker: 'narrator', shot: 'wide',
      text: "Dawn comes to the Hollowmere the way it always has — slowly, and from the wrong side of the hills. Somewhere north, a road is waiting.",
      next: null,
    },
  },
};

export const DIALOGUES: Record<string, DialogueTree> = {
  intro: INTRO, ilyraTalk: ILYRA_TALK, ilyraChat: ILYRA_CHAT, campfire: CAMPFIRE, boulderHelp: BOULDER_HELP, bossIntro: BOSS_INTRO, ending: ENDING,
};
