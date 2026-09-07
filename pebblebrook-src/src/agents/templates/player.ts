/**
 * Lines for the player's intent buttons. Stance is by the villager's relationship with the player.
 * Slots: {player} {news} {gossip} {subject} {opinion} {want} {sell} {work} {weather} {dream} {action} {joke} {likes}.
 */
export type PStance = 'stranger' | 'acquaintance' | 'friend' | 'rival';

export const PLAYER_LINES: Record<string, Record<PStance, string[]>> = {
  greet: {
    stranger: ['Oh — hello. You are the newcomer, aren\'t you? Welcome to Pebblebrook.', 'Hello. New face. We do not get many of those.', 'Ah, the newcomer. I had heard. Hello.', 'Hello there. Settling in?', 'You must be the one who took the old cottage. Welcome.'],
    acquaintance: ['Hello again, {player}.', '{player}! Good to see you about.', 'Ah, {player}. How goes it?', 'Hello, hello.', 'Back again, {player}? Good.'],
    friend: ['{player}! There you are. I was hoping I would run into you.', 'My favourite newcomer. Hello!', 'Come here, {player}. How are you?', 'Well look who it is. Sit, sit.', 'Just who I wanted to see.'],
    rival: ['Oh. It is you.', '{player}.', 'Hm. What do you want?', 'Make it quick.', '...Hello.'],
  },
  day: {
    stranger: ['Same as most days. {news}', 'It is going. {news} That is about it.', 'Fine, thank you. {news}', 'Busy. {news}'],
    acquaintance: ['Not bad, actually. {news}', 'Long. {news} You know how it is.', 'Good, mostly. {news}', 'Oh, the usual. {news} And you?'],
    friend: ['Better now you have asked. {news}', 'Honestly? {news} I could use a friendly face.', 'I will tell you the truth because it is you: {news}', 'Well — {news} What about your day, {player}?'],
    rival: ['Fine.', 'Why?', 'It was going fine.', 'Busy. Was.'],
  },
  gossip: {
    stranger: ['I do not know you well enough for that. Yet.', 'Ask Cerys. She keeps the news.', 'Hm. There is always something. {gossip}', 'Careful — this village runs on rumour. {gossip}'],
    acquaintance: ['Well... you did not hear it from me. {gossip}', 'Since you ask. {gossip}', 'Hm, let me think. {gossip}', 'There is a bit of news. {gossip}'],
    friend: ['Oh, I have been DYING to tell someone. {gossip}', 'Come closer. {gossip} I know!', 'Right, between us: {gossip}', 'You will love this. {gossip}'],
    rival: ['I do not gossip. Especially not with you.', 'No.', 'If I knew anything I would not tell you.', 'Try someone who likes you.'],
  },
  help: {
    stranger: ['That is kind of you to offer. Actually — {want}', 'Hm. Now that you mention it: {want}', 'A newcomer who wants to help. Alright: {want}', 'Not much. But — {want}'],
    acquaintance: ['You know, I could use a hand. {want}', 'Since you are offering: {want}', 'Funny you should ask. {want}', 'There is something. {want}'],
    friend: ['You are a good sort, {player}. {want}', 'Only because it is you: {want}', 'I would not ask anyone else. {want}', 'Yes, actually. {want}'],
    rival: ['I do not need your help.', 'From you? No.', 'I manage.', 'Hm. ...No.'],
  },
  joke: {
    stranger: ['Go on, then. ...Ha. Not bad.', 'A joke? Alright. I will give you one back: {joke}', 'Ha. You are alright, newcomer.', 'Hm. {joke} That is mine. Yours was better.'],
    acquaintance: ['Ha! Alright, here is one. {joke}', 'That one again? Fine, it is still funny. {joke}', 'Ha. Here — {joke}', 'You are in a good mood. {joke}'],
    friend: ['HA. Oh, I needed that. My turn: {joke}', 'You and your jokes. Here: {joke}', 'Ha! Come on, then. {joke}', 'That is terrible and I love it. {joke}'],
    rival: ['...', 'Very funny.', 'Is that supposed to make me like you?', 'Hm.'],
  },
  compliment: {
    stranger: ['Oh. Well. Thank you. I try.', 'That is kind. You do not have to say that.', 'Hm. Thank you, newcomer.', 'Well, now. Thank you.'],
    acquaintance: ['You are kind to say so, {player}.', 'Ha — thank you. I needed that today.', 'Careful, I will start to like you.', 'Well. That has brightened the {time}.', 'Go on. No — stop. No, go on.', 'Somebody noticed! Write it down, nobody will believe me.', 'That is more than I have heard from anyone else this week.', 'I will take that. Thank you, {player}.'],
    friend: ['Stop it. No — go on. Stop.', 'From you, that means something, {player}.', 'I do not know what to do with my face now. Thank you.', 'Come here, you.'],
    rival: ['What do you want?', 'Flattery. Hm.', 'Save it.', '...Thank you, I suppose.'],
  },
  trade: {
    stranger: ['I might. {sell} What have you got?', 'Trade? Perhaps. {sell}', 'Show me what you have. {sell}', 'I do not trade with strangers. ...Alright, show me. {sell}'],
    acquaintance: ['Always. {sell}', 'Let us see. {sell}', 'I could be persuaded. {sell}', 'For you, a fair price. {sell}'],
    friend: ['For you? Name it. {sell}', 'Ha, of course. {sell}', 'You know I will. {sell}', 'We will sort something out. {sell}'],
    rival: ['Not with you.', 'My prices go up when you are around.', 'Hm. What have you got. Quickly.', 'No.'],
  },
  goodbye: {
    stranger: ['Good day, newcomer.', 'Mind how you go.', 'Bye, then.', 'Welcome to the village, once more.'],
    acquaintance: ['See you around, {player}.', 'Take care of yourself.', 'Bye, {player}. Do not be a stranger.', 'Until next time.'],
    friend: ['Do not be long, {player}. I get bored without you.', 'Come by again soon. I mean it.', 'Off you go. Look after yourself.', 'See you tomorrow, I hope.'],
    rival: ['Finally.', 'Bye.', 'Good.', 'Mm.'],
  },
  ask_about: {
    stranger: ['{subject}? {opinion}', 'Hm. {opinion}', 'I would not want to speak out of turn, but — {opinion}', '{opinion} That is all I will say.'],
    acquaintance: ['{subject}. Well. {opinion}', 'Honestly? {opinion}', 'Let me think. {opinion}', 'Between us: {opinion}'],
    friend: ['Oh, {subject}. {opinion} Do not tell them I said so.', 'You want the truth? {opinion}', '{opinion} And that is the polite version.', 'Ha. {opinion}'],
    rival: ['Ask {subject}.', 'I do not discuss people with you.', 'Hm.', 'Why do you want to know?'],
  },
  free: {
    stranger: ['Hm. I suppose so.', 'I would not know about that.', 'Maybe. I am new to you, and you to me.', 'Is that so.', 'People say all sorts. I mostly nod.', 'You will have to tell me more than that, newcomer.', 'Right. Well. Welcome to Pebblebrook, anyway.', 'I will think about that. Possibly.'],
    acquaintance: ['I see what you mean.', 'Ha. Perhaps.', 'You might be right, {player}.', 'Go on.', 'That is one way of looking at it.', 'Hm. I had not thought of it like that.', 'You say that now. Wait a season.', 'Well, you are the newcomer. Fresh eyes.'],
    friend: ['You always say the strangest things. I like it.', 'Ha! True enough.', 'I have thought the same, you know.', 'Tell me more.'],
    rival: ['Mm.', 'If you say so.', 'Hm.', 'And?'],
  },
};

export const JOKES = [
  'Why did the turnip blush? It saw the salad dressing.',
  'Hal asked me for a loan. I said, "How much?" He said, "A little interest."',
  'A fish walks into the Owl. Finn says, "What is this, a bar?" ... Dov told me that one. Deadpan.',
  'Why is the mine always cold? Too many drafts.',
  'Jory started a fence last spring. It is a very long fence. It is also very short.',
  'What do you call a baker who gossips? Cerys. Sorry, that one is not a joke.',
  'A miner, a fisher and a doctor walk into the library. Ines says "Shh." That is it. That is the joke.',
  'Why did the scarecrow get promoted? Outstanding in his field.',
  'The river asked the bridge for a loan. The bridge said, "I am already over you."',
  'What does Bram say when he is happy? Nobody knows. Nobody has heard it.',
  'Why did the hen go to the clinic? She felt eggs-hausted. Elin did not laugh either.',
  'What is Greta\'s favourite music? Rock. Obviously. She hit me for that.',
];

export const OPINION_BY_LABEL: Record<string, string[]> = {
  rival: ['{subject} and I do not see eye to eye. Leave it at that.', 'I would rather not talk about {subject}.', 'Some people in this village think they are better than the rest. {subject} is one of them.', 'If {subject} told you the sky was blue I would check.'],
  stranger: ['I do not really know {subject}, to be honest.', '{subject}? We nod. That is about it.', 'Hard to say. {subject} keeps to themselves, or I do.', 'I could not tell you much about {subject}.'],
  acquaintance: ['{subject} is alright. Decent enough.', 'Fine. We get on well enough.', 'I see {subject} about. Nothing bad to say. Nothing much good either.', '{subject} is a solid sort, as far as I can tell.'],
  friend: ['{subject} is a good friend. One of the good ones.', 'I like {subject}. Genuinely.', '{subject}? You could do a lot worse for a friend.', '{subject} has done right by me more than once.'],
  'close friend': ['{subject} is family, near enough.', 'I would trust {subject} with my life. I have, actually.', '{subject} knows me better than anyone.', 'Do not let anyone tell you a word against {subject}.'],
  crush: ['{subject}? Oh — {subject} is... fine. Very fine. Why? Did they say something?', 'I... do not know why I go red when you say the name. Ignore that.', '{subject} is wonderful. I mean — good. Decent. Fine.', 'Has {subject} mentioned me? No? Right. Fine. Good.'],
  partner: ['{subject} is mine, and I am theirs. That is the whole story.', 'Do not get me started on {subject}. I will not stop.', '{subject}? The best thing that ever happened to me.', 'I still cannot believe {subject} said yes.'],
};

export const WANTS_BY_PROFESSION: Record<string, string[]> = {
  farmer: ['the fence on the north side still needs mending. Jory promised. Jory promises a lot.', 'a few nails from Bram would let me fix the gate myself.', 'if you see wheat seeds at Hal\'s, I am out.'],
  blacksmith: ['I am short of iron ore. Greta brings what she can, but the forge eats it.', 'copper. Always copper. Three ore makes a bar and I need bars.', 'a stack of wood for the forge would not go amiss.'],
  baker: ['flour! I am nearly out and Hal charges the earth.', 'honey from the orchard, if you can get near the hives.', 'berries. Three of them and I could bake a pie worth the name.'],
  fisher: ['herbs for the soup. The good ones grow in the forest.', 'if you catch a salmon, tell me. Just tell me. I want to know it is real.', 'nothing much. Quiet company on the dock would do.'],
  doctor: ['herbs. As many as you can gather. Half this village is coughing.', 'honey. It goes into the tonic and I am down to my last jar.', 'tell Finn to stop serving Bram past midnight. He will not listen to me.'],
  innkeeper: ['potatoes for the stew. Two make a pot, and I have none.', 'fish! Dov has been stingy. A perch or two would keep the kitchen going.', 'a song. No, honestly — come by tonight and make some noise. The place is dead.'],
  miner: ['a bandage or two would not go amiss. The mine bites.', 'ale. It is medicinal. Ask anyone. Do not ask Elin.', 'if you find a horseshoe, I will pay. Luck is worth coin down there.'],
  shopkeeper: ['candles sell and I am out. Two honey makes four candles, if you have a kitchen.', 'wool from the farm. Ada has sheep and never sells the wool.', 'keep an eye on Finn for me. He owes me eighty coins and avoids the square.'],
  librarian: ['there is a map fragment somewhere in this village. Half of one. I have the other half. If you find it...', 'a book. Any book. People take them and never bring them back.', 'tea. The library runs on it.'],
  carpenter: ['wood. Always wood. Four planks and I will make you something.', 'nails from Bram. I keep meaning to go and keep not going.', 'tell Ada the fence is happening. This week. Probably.'],
  none: ['nothing that springs to mind.'],
};

export const NEWS_FALLBACK = ['nothing much has happened, which suits me.', 'quiet so far. Suspiciously quiet.', 'the usual: work, weather, more work.', 'I have mostly been keeping my head down.'];
