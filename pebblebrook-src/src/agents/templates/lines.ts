/**
 * Dialogue banks for villager↔villager conversations. Slots: {listener} {speaker} {weather} {season} {place}
 * {work} {item} {news} {subject} {activity} {hour} {dream} {likes} {time} {day} {topic} {question}.
 */
export type Stance = 'warm' | 'neutral' | 'cold';

export const SUBTOPICS = ['weather', 'work', 'food', 'village', 'dreams', 'plans', 'river', 'festival', 'news', 'tired', 'likes', 'memory', 'money'] as const;
export type Subtopic = (typeof SUBTOPICS)[number];

export const CHAT_OPENERS: Record<Subtopic, string[]> = {
  weather: ['{weather}, eh? What do you make of it?', 'Would you look at this sky. {weather}.', 'Is it always {weather} this time of {season}, or am I imagining it?', 'The weather has been odd. {weather} again.', 'Sky is doing {weather} things. Good for you or bad?'],
  work: ['How is {work} treating you, {listener}?', 'Busy at {work} today?', 'I have been at it since dawn. And you?', 'Work never stops, does it. How is yours?', 'They keep me at {work} all hours. Same for you?'],
  food: ['Have you eaten? I could murder something hot.', 'What is good to eat at the moment, in your opinion?', 'Cerys\' bread this morning — did you get any?', 'I dreamed about stew last night. Tells you something.', 'Do you cook, {listener}, or do you live at the Owl like the rest of us?'],
  village: ['This village. Never a dull day, and never an exciting one either.', 'Have you noticed the square looks different lately?', 'Pebblebrook could do with a bandstand. Or a second tavern.', 'Who do you reckon actually runs this place?', 'Sometimes I think the whole village is one big family that never picked each other.'],
  dreams: ['Can I tell you something? {dream}', 'Do you ever think about what you would do if you could do anything?', 'I have been thinking about the future. Mine, I mean.', 'What do you actually want, {listener}? Out of all this?', 'If I said {dream}, would you laugh?'],
  plans: ['What are you doing later?', 'Any plans for the {time}?', 'I was thinking of heading to {place} later. You?', 'Tomorrow. What does tomorrow look like for you?', 'I need a plan for this {day}. Give me one.'],
  river: ['The river is high today.', 'Dov says there is a salmon the size of a dog in there. Do you believe him?', 'Ever swim in the lake? Properly?', 'The water is the best thing about this village.', 'I saw something in the river this morning. Big. Gone before I looked twice.'],
  festival: ['Looking forward to the next festival?', 'The last festival — do you remember the end of it?', 'Festival food is the only reason I stay in this village.', 'Will you be at the festival? Say yes.', 'They should do a festival every week. I would organise it.'],
  news: ['You will not believe what happened. {news}', 'Have you heard? {news}', 'Something happened, actually. {news}', 'Guess what. {news}', 'Bit of news: {news}'],
  tired: ['I am so tired I could sleep standing up.', 'Do you ever get to the end of a day and wonder where it went?', 'I have not slept properly in days.', 'Long day. Long week, honestly.'],
  likes: ['I know you like {likes}. Any recommendations?', 'You are the person to ask about {likes}, aren\'t you?', 'Tell me something about {likes}. I know nothing.', 'Still keen on {likes}?'],
  memory: ['Last time we talked you seemed distracted. Everything alright?', 'I keep thinking about what you said the other day.', 'Do you remember when we last spoke? I have thought about it since.', 'You said something once that stuck with me.'],
  money: ['Coin is tight this {season}. Is it just me?', 'Hal\'s prices, honestly.', 'Do you ever feel like you work all day and end up with nothing?', 'If I had fifty more coins I would... well, I would have fifty coins.'],
};

export const CHAT_REPLIES: Record<Subtopic, Record<Stance, string[]>> = {
  weather: {
    warm: ['I love it, honestly. {weather} suits me.', 'Good for the crops, whatever it does to my mood.', 'I do not mind it. Better than fog.', 'You know me. Any weather is fine if the company is good.'],
    neutral: ['It is weather. It happens.', 'I have seen worse. I have seen better.', 'Hard to say. Ask Dov, he reads the sky.', 'Suits some, not others.', 'My knees say rain. My knees are usually wrong.', 'Good for something, bad for something else. That is weather.', 'It was {weather} yesterday too. I have stopped noticing.', 'The crops will decide whether it was good weather. Not me.'],
    cold: ['I have not got time to discuss the sky, {speaker}.', 'Weather. Yes. I noticed.', 'Is that really what you came over to say?'],
  },
  work: {
    warm: ['Busy, but the good kind of busy. And you look well on it, {speaker}.', 'Could not be better. Well — could be, but I will not complain to you.', 'Long hours, sore hands, no regrets.', 'Same as ever. I would not know what to do with a day off.'],
    neutral: ['It gets done. That is the main thing.', 'Work is work.', 'Slow this week. It picks up.', 'Ask me at the end of the season.', 'Busy enough. Not so busy I cannot stand here talking, evidently.', 'Same as ever. The hands know what to do; the head can wander.', 'Long days. I am not complaining. I am just saying they are long.', 'There is always more of it. That is the one thing you can count on.'],
    cold: ['I would be at it now if you had not stopped me.', 'Fine. Busy. Like I was until a moment ago.', 'It pays. That is all you need to know.'],
  },
  food: {
    warm: ['Cerys\' sweet rolls. I would fight you for the last one.', 'Finn\'s stew, on a cold night. Nothing better.', 'I have a loaf in my bag, actually. Half?', 'Anything, as long as somebody else cooked it.'],
    neutral: ['I eat what is there.', 'The bakery, mostly. Or the Owl.', 'Fish, if Dov has been lucky.', 'Whatever is cheap.'],
    cold: ['I eat at home. Alone. By choice.', 'I am not hungry, thank you.', 'Food. Yes. I have heard of it.'],
  },
  village: {
    warm: ['I would not live anywhere else. Not for gold.', 'It is small, but it is ours.', 'Everybody knows everybody. That is the charm and the curse.', 'A bandstand! Yes! Tell Jory.'],
    neutral: ['It is a village. It has a well.', 'Nothing changes here. That is the point.', 'Quiet. Mostly.', 'It could use a proper road.'],
    cold: ['The village would be fine if people minded their own business.', 'I have opinions about this place. You would not like them.', 'Smaller every year, this village.'],
  },
  dreams: {
    warm: ['I would never laugh. Tell me more.', 'I think about that too, {speaker}. More than I say.', 'That is the most honest thing anyone has said to me all week.', 'Then do it. What is stopping you?'],
    neutral: ['Everyone dreams. Not everyone gets out of bed.', 'That is a big thought for the {time}.', 'Hm. I suppose it could happen.', 'Dreams are cheap. Mornings are expensive.'],
    cold: ['I do not do dreams, {speaker}.', 'Keep it to yourself, maybe.', 'We all want things. Most of us keep quiet about it.'],
  },
  plans: {
    warm: ['I was hoping you would ask. Come to {place} with me?', 'Nothing that cannot wait, if you have a better idea.', 'The Owl, probably. Save me a seat?', 'Whatever you are doing sounds better than my plan.'],
    neutral: ['Work, then home. The usual.', 'No plans. Plans go wrong.', 'I will see how the day goes.', 'Same as yesterday, probably.'],
    cold: ['Plans that do not involve you, {speaker}.', 'Busy.', 'I keep my plans to myself.'],
  },
  river: {
    warm: ['I believe him. I saw it once. Nobody believes me either.', 'Swim? In the lake? With you? ...Maybe. In summer.', 'The river is the reason I stayed.', 'Best sound in the world, that water at night.'],
    neutral: ['The river does what it does.', 'A salmon the size of a dog is a dog, {speaker}.', 'Wet. Cold. Fish in it.', 'I cross it. I do not think about it.'],
    cold: ['I do not swim. I do not intend to start.', 'Fish stories. Spare me.', 'The river is wet. There. Discussed.'],
  },
  festival: {
    warm: ['I am counting the days! I will save you a dance.', 'I remember the end of the last one very well. Some of us more than others.', 'Festival food and festival music and a bit of festival nonsense. Yes.', 'Say yes? YES.'],
    neutral: ['I will probably go. For a bit.', 'Festivals are fine. Loud, but fine.', 'I usually work through them.', 'If the weather holds.'],
    cold: ['Crowds. No.', 'I will be there as long as it takes to be seen leaving.', 'You go. Tell me if anything burns down.'],
  },
  news: {
    warm: ['No! Really? Tell me everything.', 'I knew something was going on. I could feel it.', 'Well, well. Thank you for telling me, {speaker}.', 'That explains a great deal, actually.'],
    neutral: ['Hm. Is that so.', 'I had heard something like it.', 'People talk. Half of it is true.', 'Interesting. Not surprising.'],
    cold: ['I do not carry tales, {speaker}. Neither should you.', 'And why are you telling me?', 'Gossip. Wonderful.'],
  },
  tired: {
    warm: ['You look it. Sit down, I will fetch you something.', 'Come to the Owl later. Rest is allowed, you know.', 'Same. We are a fine pair.', 'Then stop for a minute. The world will keep.'],
    neutral: ['Sleep, then.', 'Everyone is tired this {season}.', 'It passes.', 'You should see Elin. She has something for that.'],
    cold: ['We are all tired, {speaker}.', 'Then go to bed and stop telling people.', 'Tired. Yes. Join the queue.'],
  },
  likes: {
    warm: ['Oh, you have asked the right person. Where do I start?', 'I could talk about {likes} all day. You have been warned.', 'You remembered! Yes — sit down, this will take a while.', 'Nobody ever asks. Thank you.'],
    neutral: ['It is a hobby. Nothing special.', 'I know a bit. Not as much as people think.', 'Start with the basics. Everyone skips them.', 'It keeps me out of trouble.'],
    cold: ['I would rather not.', 'It is private, {speaker}.', 'Why the sudden interest?'],
  },
  memory: {
    warm: ['I remember. I meant every word.', 'I was distracted. Better now, thanks to you asking.', 'You were listening? That means a lot.', 'I think about that conversation too.'],
    neutral: ['Did I? I do not recall.', 'I say a lot of things.', 'It was nothing. Just a long day.', 'You have a good memory. Better than mine.'],
    cold: ['Whatever I said, I have moved on.', 'Let us not.', 'I do not remember, and I would rather not try.'],
  },
  money: {
    warm: ['Tell me about it. If you ever need a loan — well, ask someone richer, but I will listen.', 'Hal charges by the breath. I said it.', 'Coin comes and goes. Friends stay. That is my whole economy.', 'Fifty coins? I would buy you a drink with one of them.'],
    neutral: ['It is tight everywhere.', 'Prices are prices.', 'Work more, spend less. There is no trick.', 'Sell something. That is what I do.'],
    cold: ['My money is my business.', 'If you are asking for a loan, the answer is no.', 'Some of us budget, {speaker}.'],
  },
};

export const CHAT_FOLLOWUPS: Record<Subtopic, string[]> = {
  weather: ['Well, the crops do not mind either way.', 'It will turn. It always turns.', 'I only ask because I am planning something outdoors.', 'The sky has been strange all {season}.'],
  work: ['You should take a day. I mean it.', 'If you ever need a hand, I have two.', 'Somebody has to keep the place running, eh?', 'I could not do your job. I would go mad.'],
  food: ['I will bring you something next time.', 'We should eat together sometime. At the Owl, or mine.', 'Now I am hungrier than I was.', 'Finn should hire you. Or me. Somebody.'],
  village: ['Still. Home is home.', 'We should fix that. Someone should.', 'I would miss it, if I left. I think.', 'Maybe next year it will surprise us.'],
  dreams: ['Thank you for not laughing.', 'Maybe this year.', 'Do not tell anyone. Especially Cerys.', 'One step at a time, I suppose.'],
  plans: ['Then I will see you there.', 'Good. I hate walking in alone.', 'Well, if you change your mind, you know where I will be.', 'Plans can bend. Let them.'],
  river: ['One day I will prove it.', 'Come down at dawn. You will see.', 'There is more in that water than fish.', 'The lake in summer. Remember that.'],
  festival: ['Save me a spot near the food.', 'I might even dance. Do not tell anyone.', 'It is the one day the village stops arguing.', 'Then it is settled.'],
  news: ['Keep it between us. Or do not. I am not the boss of you.', 'I thought you should know.', 'Anyway. That is the news.', 'What do you make of it?'],
  tired: ['A drink would help. Or sleep. Sleep is cheaper.', 'Tomorrow will be better. Or at least different.', 'I should stop talking and let you go, then.', 'We will laugh about this week eventually.'],
  likes: ['I will come by and you can show me properly.', 'You light up when you talk about it, you know.', 'I might take it up. Badly, but still.', 'Good. Keep at it.'],
  memory: ['Well. I am glad we talked.', 'That is all. I just wanted you to know.', 'I will not bring it up again.', 'Good. That is settled, then.'],
  money: ['Anyway. It will sort itself. It always does. Sort of.', 'If you hear of work going, tell me.', 'I should sell something. Everything, maybe.', 'Do not tell Hal I said any of that.'],
};

export const CHAT_REPLIES_2: Record<Stance, string[]> = {
  warm: ['You are good company, {speaker}. Do not let anyone tell you otherwise.', 'I am glad you stopped me, honestly.', 'Same time tomorrow? I mean — if you are about.', 'Go on, then. I will see you later.', 'This was nice.', 'Come and find me if you need anything. Anything.'],
  neutral: ['Fair enough.', 'Well. I should get on.', 'We will see.', 'Alright, {speaker}.', 'Hm. Maybe.', 'Right you are.'],
  cold: ['Are we done?', 'Good. Bye.', 'I have things to do, {speaker}.', 'Mm.'],
};

export const CLOSERS: Record<Stance, string[]> = {
  warm: ['Right — I should go before I talk your ear off. Good to see you, {listener}.', 'That is me. Look after yourself, {listener}.', 'I will let you get on. See you soon, I hope.', 'Off I go. Save me a seat at the Owl.', 'Lovely. Same again tomorrow?'],
  neutral: ['I should get on. See you, {listener}.', 'Right. Things to do.', 'Anyway. Later, {listener}.', 'That is me. Good day.'],
  cold: ['That is all.', 'I have said what I came to say.', 'Good day, {listener}.'],
};

/* ---------------------------------------------------------- kind banks */

export interface KindBank { open: string[]; reply: Record<'yes' | 'no', string[]>; follow: Record<'yes' | 'no', string[]>; reply2: Record<'yes' | 'no', string[]>; close: string[] }

export const KINDS: Record<string, KindBank> = {
  gossip: {
    open: ['Have you heard about {subject}? {news}', 'Come here. Closer. {news}', 'You did not hear this from me: {news}', 'I should not say this, but — {news}', 'Everyone is talking about it. {news}', 'So. {subject}. {news} I know!'],
    reply: {
      yes: ['No! {subject}? Really?', 'I KNEW it. I knew something was up with {subject}.', 'Well, well. Go on.', 'That explains the face on {subject} yesterday.', 'Oh, that is good. That is very good. Who else knows?'],
      no: ['I do not want to hear about {subject}, {speaker}.', 'That is {subject}\'s business.', 'Is that true, or is that Cerys-true?', 'Hm. I will pretend I did not hear that.'],
    },
    follow: {
      yes: ['Nobody. Well — nobody who would tell. Well — you.', 'And that is only the half of it.', 'I thought you would want to know. You always want to know.', 'Anyway, if {subject} asks, we were talking about the weather.'],
      no: ['Fine, fine. Forget I said anything.', 'I only mention it because I worry about {subject}.', 'You are right. Of course you are right.', 'Well, now you know, whether you wanted to or not.'],
    },
    reply2: {
      yes: ['My lips are sealed. Mostly.', 'You are terrible. Tell me more next time.', 'The weather. Absolutely. Terrible weather.', 'I will keep an eye on {subject}, then.'],
      no: ['Let us talk about something else.', 'I will hear it from {subject} if it matters.', 'Mm.', 'Careful, {speaker}. Tales come back around.'],
    },
    close: ['Anyway — not a word.', 'Right, I have said too much. Off I go.', 'Keep it close. See you, {listener}.', 'That is all I know. For now.'],
  },
  ask: {
    open: ['{listener}, can I ask you something? {question}', 'Question for you: {question}', 'Quick one — {question}', 'I have been meaning to ask. {question}'],
    reply: {
      yes: ['Of course. Let me think... honestly? Fine. Better than fine, some days.', 'You can always ask. The answer is: it depends who is asking, and it is you, so — yes, alright.', 'Ha. Nobody asks me that. The truth is I do not know.', 'That is a good question. I will give you a proper answer if you have a minute.'],
      no: ['Why do you want to know?', 'That is a strange thing to ask, {speaker}.', 'I would rather not say.', 'Ask Cerys. She knows everything, apparently.'],
    },
    follow: {
      yes: ['I have a minute. I have several.', 'That is more than I expected. Thank you.', 'Hm. That is what I thought, actually.', 'You do not have to answer. I am just curious.'],
      no: ['No reason. Forget it.', 'Just making conversation.', 'Fair enough. Sorry I asked.', 'I did not mean anything by it.'],
    },
    reply2: {
      yes: ['Well then. There it is.', 'Now you know more than most.', 'Do not spread it about.', 'Ask me again in a week and I might say different.'],
      no: ['It is fine. I am prickly today.', 'Hm.', 'Another time, maybe.', 'Let us leave it.'],
    },
    close: ['Thanks for humouring me, {listener}.', 'That is all I wanted to know. See you.', 'I will let you go. Cheers.', 'Good. Off I go.'],
  },
  compliment: {
    open: ['{listener} — I have been meaning to say. {work} has never looked better. That is you.', 'You know what, {listener}? You are the best thing about this village. Do not argue.', 'That {item} you had the other day — the whole village noticed. Well done.', 'I do not say this enough: you do good work, {listener}.', 'You have a way about you, {listener}. Do not lose it.', 'Has anyone told you today that you are a marvel? No? Then I will.'],
    reply: {
      yes: ['Oh — stop. No, go on. Stop.', 'Well. That has made my {time}.', 'You are only saying that. Say it again.', 'Coming from you, {speaker}, that means something.', 'I do not know what to do with my face now. Thank you.'],
      no: ['What do you want, {speaker}?', 'Flattery. I know what that costs.', 'Mm. Thank you, I suppose.', 'If you say so.'],
    },
    follow: {
      yes: ['I mean it. Every word.', 'You deserve to hear it more often.', 'Good. That is what I was going for.', 'Now do not let it go to your head. Or do. You have earned it.'],
      no: ['Nothing! I do not want anything. Can a person not be kind?', 'Fine. Be like that. It is still true.', 'I meant it, you know.', 'Alright. I will keep my compliments to myself.'],
    },
    reply2: {
      yes: ['Right back at you, {speaker}. Truly.', 'Well — I will be smiling about that all afternoon.', 'You are a good one.', 'Come here. No, I mean it, come here.'],
      no: ['...Thank you. Really.', 'I am not used to it, that is all.', 'Hm. Alright. Thanks.', 'Sorry. Thank you. I mean it.'],
    },
    close: ['That is all. Carry on being wonderful.', 'Off I go. Keep it up, {listener}.', 'Good. Now I have to go before I say something soppy.', 'See you, {listener}. Head up.'],
  },
  tease: {
    open: ['{listener}, is that the same shirt as yesterday? And the day before?', 'Careful, {listener}, you nearly smiled there.', 'I heard {listener} was seen working. Somebody check the sky for pigs.', 'Oh look, it is {listener}. Did they let you out early today?', 'Still going on about {likes}, {listener}? The whole village knows.', '{listener}! You walk like someone who owes money.'],
    reply: {
      yes: ['Ha! Says the one who fell in the river last spring.', 'Oh, very good. Did you practise that?', 'At least I have a shirt, {speaker}.', 'Someone woke up feeling clever.', 'You are lucky I like you.'],
      no: ['Do not start, {speaker}.', 'Not today.', 'Is that supposed to be funny?', 'Very good. Have you finished?'],
    },
    follow: {
      yes: ['I did practise, actually. In the mirror.', 'The river was cold and I regret nothing.', 'You know I only tease the ones I like.', 'Somebody has to keep you humble.'],
      no: ['Alright, alright. Sorry.', 'Just a joke, {listener}.', 'Touchy today.', 'I will leave it.'],
    },
    reply2: {
      yes: ['Go on, get out of here.', 'You are a menace and I would not change you.', 'Tomorrow it is my turn.', 'Ha. Alright.'],
      no: ['Fine.', 'Good.', 'Just — not today, {speaker}.', 'Hm.'],
    },
    close: ['Right, I am off before you think of a comeback.', 'See you, {listener}. Try not to fall in anything.', 'Same time tomorrow for round two?', 'That is me done.'],
  },
  argue: {
    open: ['We need to talk about {topic}, {listener}, and you are not going to like it.', 'I have held my tongue about {topic} long enough.', 'What was that about, {listener}? {topic}. Go on. Explain.', 'No. No, I am not letting {topic} slide this time.', 'You and I have a problem, {listener}. It is called {topic}.', 'I am sick of {topic}. Sick of it.'],
    reply: {
      yes: ['You have no idea what you are talking about.', 'Oh, HERE we go.', 'Me? ME? Have you looked in a mirror lately?', 'Say that again. I dare you.', 'You want a row? Fine. You have one.'],
      no: ['...You might be right about {topic}. I hate that.', 'Alright. Alright. I hear you.', 'I do not want to fight about it, {speaker}.', 'Let us not do this here.'],
    },
    follow: {
      yes: ['I have looked. I like what I see. Unlike some.', 'You never listen. That is the whole problem.', 'Everyone thinks it. I am just the one saying it.', 'Fine. Have it your way. You always do.'],
      no: ['Good. Then fix it.', 'I am not trying to fight. I am trying to be heard.', 'Well. Good. I did not enjoy that.', 'Then we understand each other.'],
    },
    reply2: {
      yes: ['We are done here.', 'Get out of my sight, {speaker}.', 'I will remember this.', 'Fine. FINE.'],
      no: ['I will try. I mean it.', 'We are alright. Are we alright?', 'Give me a day to cool off.', 'I know. I am sorry.'],
    },
    close: ['I have said my piece.', 'Do not follow me.', 'This is not over, {listener}.', 'Think about it. That is all I ask.'],
  },
  apologize: {
    open: ['{listener}. I was out of order. I am sorry.', 'I have been thinking about what I said, and I was wrong. Sorry.', 'I owe you an apology, {listener}. A proper one.', 'Can we start again? I was an idiot.', 'Look — I am sorry. About all of it.'],
    reply: {
      yes: ['...Thank you. That cannot have been easy.', 'I said things too. We are even.', 'Oh, {speaker}. Come here.', 'Accepted. Now buy me a drink.', 'I was waiting for that. Thank you.'],
      no: ['Words are cheap, {speaker}.', 'I am not ready. Not yet.', 'You said it. Now show it.', 'Hm. We will see.'],
    },
    follow: {
      yes: ['It was not easy. You are worth it.', 'A drink. Two. Whatever you like.', 'I missed talking to you.', 'Good. I hated the silence.'],
      no: ['Fair. I will show it, then.', 'I understand. Take your time.', 'I will not push. I just needed you to hear it.', 'That is fair. I will earn it.'],
    },
    reply2: {
      yes: ['We are alright, {speaker}. Truly.', 'Go on. Get out of here before I cry.', 'Friends?', 'Good. Now, about that drink.'],
      no: ['Give me time.', 'Maybe.', 'Do not make me regret listening.', 'Alright. We will talk.'],
    },
    close: ['Thank you for hearing me out, {listener}.', 'That is all I wanted to say. See you.', 'Right. I feel lighter. Good day, {listener}.', 'I will go now. Thank you.'],
  },
  comfort: {
    open: ['{listener}. You look like the world sat on you. Come here.', 'Rough day? Sit. I am not going anywhere.', 'You do not have to talk. I will just stand here with you.', 'I saw your face and thought: that one needs a friend. Here I am.', 'Whatever it is, {listener}, it will look smaller tomorrow. Tonight, you have me.'],
    reply: {
      yes: ['I... thank you. I did not think anyone noticed.', 'It has been a bad one, {speaker}. A bad one.', 'Do not be kind to me, I will fall apart.', 'Just stay a minute. Please.', 'You are a good soul.'],
      no: ['I am fine, {speaker}.', 'I do not need looking after.', 'Leave it. Please.', 'It is nothing.'],
    },
    follow: {
      yes: ['Fall apart, then. I will hold the pieces.', 'I am staying. Talk or do not.', 'Noticed. Of course I noticed.', 'A bad day is just a day. It ends.'],
      no: ['Alright. But I am here. That does not change.', 'Fine is a word people use when they are not.', 'I will leave it. But the offer stands.', 'You do not have to need it. It is yours anyway.'],
    },
    reply2: {
      yes: ['Thank you, {speaker}. I mean it.', 'I feel a bit more like a person now.', 'Do not tell anyone I cried.', 'I will not forget this.'],
      no: ['...Thank you. Maybe later.', 'You are stubborn.', 'Alright. Thank you.', 'I know. I know you are.'],
    },
    close: ['Come and find me if it gets heavy again. Any hour.', 'I will check on you tomorrow, {listener}.', 'Sleep, if you can. Things look different after.', 'You are not alone. Remember that.'],
  },
  invite: {
    open: ['{listener} — {activity} at {place}, around {hour}. Come?', 'Fancy {activity}? {place}, {hour} o\'clock. Say yes.', 'I am going to {place} for {activity} at {hour}. It would be better with you there.', 'No excuses: {activity}, {place}, {hour}. I will save you a spot.'],
    reply: {
      yes: ['{activity}? I would love to. {hour} it is.', 'You had me at {activity}. I will be there.', 'Yes! Finally something to look forward to.', 'Alright, twist my arm. {place} at {hour}.'],
      no: ['I cannot, {speaker}. Not tonight.', 'Another time, maybe.', 'I am not really one for {activity}.', 'I will think about it. That means no, probably.'],
    },
    follow: {
      yes: ['Good. Do not be late.', 'It is a date. Not a date-date. A date.', 'You will not regret it.', 'Excellent. I will bring the good stuff.'],
      no: ['No pressure. The offer stands.', 'Your loss. I will tell you what you missed.', 'Fair enough. Next time.', 'Alright. I will save you a seat anyway.'],
    },
    reply2: {
      yes: ['See you there, {speaker}.', 'I am looking forward to it already.', 'Ha. A date-date. Noted.', 'I will bring something too.'],
      no: ['Thank you for asking, though.', 'Next time. I mean it.', 'Have fun without me.', 'Tell me everything after.'],
    },
    close: ['Right. {hour}. Do not forget.', 'See you at {place}!', 'Off I go. Later, {listener}.', 'That is settled, then.'],
  },
  visit: {
    open: ['I was passing and thought I would call in. Hello, {listener}.', 'Knock knock. Is this a bad time?', 'I have not seen {place} in ages. Nor you, come to that.', 'Company! I brought myself. Hope that is enough.'],
    reply: {
      yes: ['{speaker}! Come in, come in. Sit.', 'Never a bad time for you.', 'Ah, good. I was talking to myself.', 'The kettle is on. Or it will be.'],
      no: ['It is a bit of a bad time, actually.', 'What do you want, {speaker}?', 'I was in the middle of something.', 'Hm. Alright. Briefly.'],
    },
    follow: {
      yes: ['You keep a nice place. Nicer than mine.', 'I will not stay long. Or I will. Depends on the tea.', 'It is good to see you at home. You look different at home.', 'I brought nothing. Sorry. Next time.'],
      no: ['I will not keep you.', 'Just wanted to see a friendly face. Or any face.', 'Sorry — I should have sent word.', 'Briefly, then.'],
    },
    reply2: {
      yes: ['Stay as long as you like.', 'Different? Good different, I hope.', 'Next time bring bread. Cerys\'.', 'Tea is nearly ready.'],
      no: ['Alright. Thank you for coming, I suppose.', 'Another day, {speaker}.', 'Fine. Mind the step on your way out.', 'Mm.'],
    },
    close: ['Right, I will leave you in peace. Thank you, {listener}.', 'That was nice. I will call again.', 'Off I go. Mind yourself.', 'Thank you for the {time}.'],
  },
  festival: {
    open: ['Some turnout! Have you seen the food?', 'This is the best day of the year and I will not hear otherwise.', 'Look at everyone! Even Dov came.', 'Dance with me later. That is not a question.'],
    reply: {
      yes: ['I have seen the food. I have been the food.', 'Best day of the year. Agreed. Twice.', 'Even Dov! Somebody write it down.', 'Later. If you can keep up.'],
      no: ['Loud, is what it is.', 'I am here for the pie. Then I am gone.', 'Do not make me dance, {speaker}.', 'It is fine. It is a lot.'],
    },
    follow: {
      yes: ['We should do this every week.', 'I am going to eat until I cannot move.', 'Race you to the lanterns.', 'Keep up? I invented keeping up.'],
      no: ['Have some pie, then. Pie fixes most things.', 'Stay for one song. Just one.', 'Alright, alright. No dancing.', 'It is a lot. But it is ours.'],
    },
    reply2: {
      yes: ['Every week! Tell Finn.', 'Mind the lanterns, they bite.', 'Go on then. Go!', 'Ha. Fine. One dance.'],
      no: ['One song. Then home.', 'Pie. Yes. That I can do.', 'Hm. It is nice, I suppose. In its way.', 'Alright. One song.'],
    },
    close: ['See you by the fire!', 'Save me a lantern.', 'Right, I am off to find the pie.', 'Enjoy it, {listener}. It only comes once a season.'],
  },
  event: {
    open: ['Good turnout, this.', 'Glad you came. It is better with people in it.', 'Did you bring anything? I brought my charm. It is enough.', 'Look at us. Almost like a proper village.'],
    reply: {
      yes: ['Would not have missed it.', 'Somebody had to bring the good mood. Here I am.', 'Your charm, and my appetite. A team.', 'It is nice, isn\'t it? Just this.'],
      no: ['I will not stay long.', 'I was talked into it.', 'Mm. It is fine.', 'I came for the food.'],
    },
    follow: {
      yes: ['We should do more of this.', 'Stay till the end. It always gets better at the end.', 'A team! I like that.', 'Just this. Yes.'],
      no: ['Stay for a bit. Just a bit.', 'Talked into it is still here.', 'Fine is a start.', 'Food is a fine reason.'],
    },
    reply2: {
      yes: ['I will. Wave me over if anything happens.', 'Agreed. Next one is mine to organise.', 'Ha. Alright.', 'Yes.'],
      no: ['Alright. A bit.', 'Hm.', 'We will see.', 'Mm.'],
    },
    close: ['Enjoy it, {listener}.', 'Right, mingling. Wish me luck.', 'See you by the fire.', 'That is me. Later.'],
  },
  ask_about: {
    open: ['What do you make of {subject}, honestly?', '{subject}. Tell me something I do not know.', 'You know {subject} better than I do. What are they like, really?', 'Between us — {subject}. Good sort, or not?'],
    reply: {
      yes: ['{subject}? Good sort, deep down. Deep, deep down in some cases.', 'I could tell you a thing or two. And I will.', 'Honestly? I like {subject}. Do not tell them.', 'Complicated. Like everyone here. But sound.'],
      no: ['Ask {subject} yourself.', 'I do not talk about people behind their backs, {speaker}.', 'Why are you asking?', 'I keep my opinions on {subject} to myself.'],
    },
    follow: {
      yes: ['Go on, then. A thing or two.', 'Deep down is fine. I can dig.', 'Your secret is safe. Mostly.', 'That matches what I thought.'],
      no: ['Fair. Forget I asked.', 'Just curious, that is all.', 'Alright. Alright.', 'No harm meant.'],
    },
    reply2: {
      yes: ['That is all I will say. For now.', 'You did not hear it from me.', 'Make of that what you will.', 'Judge for yourself. But kindly.'],
      no: ['Hm.', 'Talk to them. It is not hard.', 'Let us change the subject.', 'Mm.'],
    },
    close: ['Thanks. That helps, actually.', 'Right. I will judge for myself, then.', 'Interesting. See you, {listener}.', 'That is all I wanted. Cheers.'],
  },
};

export const STORY_HOOKS = ['the great salmon', 'the winter the river froze', 'the miner with the gem in his teeth', 'the bard who never left', 'the night the Owl\'s roof came off', 'the tax man and old Pennywort', 'the ghost on the library stairs', 'the wolf and the mayor\'s hat'];
