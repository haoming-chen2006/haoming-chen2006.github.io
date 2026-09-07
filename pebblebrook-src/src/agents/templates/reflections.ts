/**
 * Nightly reflections: templated aggregation over the day's memories. Returns 1–3 first-person lines.
 */
import { VILLAGER_BY_ID } from '../../core/villagers.ts';
import type { Memory, Rng, Villager, VillagerId, World } from '../../core/types.ts';
import { firstPerson, lower } from './voice.ts';

const name = (id: VillagerId): string => VILLAGER_BY_ID[id]?.short ?? (id === 'player' ? 'the newcomer' : id);
const lowerFirst = lower;
const fp = (v: Villager, t: string): string => lowerFirst(firstPerson(t, v.name.split(' ')[0]));

interface Summary {
  talks: Record<VillagerId, number>; giftsFrom: VillagerId[]; argued: VillagerId[]; romance: VillagerId[]; helped: VillagerId[];
  work: number; social: number; money: number; storm: boolean; alone: boolean; lowNeed: string | null; best: Memory | null; worst: Memory | null;
  drank: number; read: number; fished: number; farmed: number; mined: number; crafted: number; events: string[]; sick: boolean; playerTalks: number;
}

export function summarise(v: Villager, today: Memory[], world: World): Summary {
  const s: Summary = { talks: {}, giftsFrom: [], argued: [], romance: [], helped: [], work: 0, social: 0, money: v.money - (v.stats.moneyAtDawn ?? v.money), storm: world.weather.kind === 'storm', alone: false, lowNeed: null, best: null, worst: null, drank: 0, read: 0, fished: 0, farmed: 0, mined: 0, crafted: 0, events: [], sick: v.status.includes('sick'), playerTalks: 0 };
  const has = (m: Memory, t: string) => m.tags.includes(t);
  let best = -1, worst = 99;
  for (const m of today) {
    const others = (m.about ?? []).filter((a) => a !== v.id);
    if (m.kind === 'conversation' || has(m, 'talk')) for (const o of others) { if (o === 'player') s.playerTalks++; else s.talks[o] = (s.talks[o] ?? 0) + 1; }
    if (has(m, 'gift') && has(m, 'received')) s.giftsFrom.push(...others.filter((o) => o !== 'player'));
    if (has(m, 'argued')) s.argued.push(...others.filter((o) => o !== 'player'));
    if (has(m, 'romance') || has(m, 'flirt')) s.romance.push(...others.filter((o) => o !== 'player'));
    if (has(m, 'helped')) s.helped.push(...others.filter((o) => o !== 'player'));
    if (has(m, 'work')) s.work++;
    if (has(m, 'social')) s.social++;
    if (has(m, 'storm')) s.storm = true;
    if (m.kind === 'event') s.events.push(m.text);
    if (has(m, 'pleasant') && m.importance > best) { best = m.importance; s.best = m; }
    if (has(m, 'unpleasant') && m.importance < worst) { worst = m.importance; s.worst = m; }
    if (has(m, 'drink')) s.drank++;
    if (has(m, 'read')) s.read++;
    if (has(m, 'fish')) s.fished++;
    if (['till', 'plant', 'water', 'harvest'].some((t) => has(m, t))) s.farmed++;
    if (has(m, 'mine')) s.mined++;
    if (['craft', 'forge', 'bake', 'cook', 'craft_furniture', 'build'].some((t) => has(m, t))) s.crafted++;
  }
  s.alone = Object.keys(s.talks).length === 0 && s.playerTalks === 0;
  const n = v.needs;
  const lows: [string, number][] = [['energy', n.energy], ['hunger', n.hunger], ['social', n.social], ['fun', n.fun], ['comfort', n.comfort], ['purpose', n.purpose]];
  lows.sort((a, b) => a[1] - b[1]);
  if (lows[0][1] < 35) s.lowNeed = lows[0][0];
  return s;
}

export function reflectLines(v: Villager, today: Memory[], world: World, rng: Rng): string[] {
  const s = summarise(v, today, world);
  const p = v.personality;
  const out: { text: string; w: number }[] = [];
  const top = Object.entries(s.talks).sort((a, b) => b[1] - a[1]);
  if (top.length && top[0][1] >= 2) {
    const [id, n] = top[0];
    const rel = v.relationships[id];
    const romantic = rel && rel.romance > 25;
    out.push({ text: romantic ? rng.pick([`I keep finding reasons to talk to ${name(id)}. ${n} times today.`, `I can't stop thinking about ${name(id)}.`, `Every time I see ${name(id)} the day gets brighter. That is dangerous.`]) : rng.pick([`I've been spending a lot of time with ${name(id)} lately.`, `${name(id)} and I talked ${n} times today. Good company.`, `Funny how ${name(id)} keeps turning up wherever I am.`]), w: 3 });
  }
  if (s.argued.length) { const id = s.argued[0]; out.push({ text: p.agreeableness > 0.6 ? rng.pick([`I still feel bad about arguing with ${name(id)}. I should apologise.`, `That row with ${name(id)} sat in my stomach all day.`]) : rng.pick([`${name(id)} had it coming. I stand by what I said.`, `I am not the one who needs to apologise to ${name(id)}.`]), w: 4 }); }
  if (s.giftsFrom.length) { const id = s.giftsFrom[0]; out.push({ text: rng.pick([`${name(id)}'s gift meant more than I let on.`, `I should do something for ${name(id)} in return.`, `Nobody has given me anything in a while. ${name(id)} did.`]), w: 3 }); }
  if (s.money > 40) out.push({ text: rng.pick(['Business was good today.', `Coin came in today: ${Math.round(s.money)} more than this morning.`, 'A profitable day. I could get used to it.']), w: 2 });
  if (s.money < -40) out.push({ text: rng.pick(['I spent more than I should have today.', 'The purse is lighter than it was this morning. Too much lighter.', 'Money runs out of my hands like water.']), w: 2 });
  if (v.money < 40) out.push({ text: rng.pick(['I need to sell something soon or I will be eating turnips for a week.', 'Money is tight. I should work extra this week.', `${Math.floor(v.money)} coins to my name. That is not enough.`]), w: 3 });
  if (s.storm) out.push({ text: p.neuroticism > 0.5 ? 'The storm scared me more than I let on.' : p.likes.includes('storm') ? 'Nothing like a storm to make you feel alive.' : 'That storm will have done damage. We will see tomorrow.', w: 2 });
  if (s.work >= 4) out.push({ text: p.conscientiousness > 0.6 ? rng.pick(['I got a lot done today. Good.', 'Honest work, honest tired.', 'A full day. My hands know it.']) : rng.pick(['I worked far too hard today.', 'All work today. Tomorrow I am taking it easy.']), w: 1 });
  if (s.work === 0 && p.conscientiousness > 0.6) out.push({ text: rng.pick(['I barely worked today, and I feel it.', 'A wasted day. I hate wasted days.']), w: 2 });
  if (s.alone && p.extraversion > 0.5) out.push({ text: rng.pick(['I did not really talk to anyone today. That is not like me.', 'Quiet day. Too quiet.']), w: 2 });
  if (s.alone && p.extraversion <= 0.5) out.push({ text: rng.pick(['A quiet day. I like those.', 'Nobody bothered me today. Bliss.']), w: 1 });
  if (s.sick) out.push({ text: rng.pick(['I should see Elin about this cough.', 'I feel wretched. Bed, and maybe a tonic.']), w: 3 });
  if (s.romance.length) { const id = s.romance[0]; out.push({ text: rng.pick([`I wonder if ${name(id)} noticed me looking.`, `${name(id)}. Just ${name(id)}. I have no thoughts beyond that tonight.`, `Something is happening with ${name(id)} and I do not know if I am ready.`]), w: 4 }); }
  if (s.helped.length) out.push({ text: `It felt good to help ${name(s.helped[0])} today.`, w: 2 });
  if (s.playerTalks >= 2) out.push({ text: rng.pick(['The newcomer keeps turning up. I do not mind it.', 'I talked with the newcomer more than with anyone today. Strange, and not bad.', 'The newcomer asks a lot of questions. Good ones, mostly.']), w: 2 });
  if (s.drank >= 3) out.push({ text: rng.pick(['Too much ale tonight. Finn keeps pouring.', 'My head will hate me in the morning.']), w: 2 });
  if (s.read >= 2) out.push({ text: rng.pick(['Books were better company than people today.', 'I lost an afternoon to a book and regret nothing.']), w: 1 });
  if (s.fished >= 3) out.push({ text: rng.pick(['The river was generous today.', 'Hours on the water. My kind of day.']), w: 1 });
  if (s.mined >= 3) out.push({ text: rng.pick(['Deeper tomorrow. The gold is down there somewhere.', 'The mine gave up a little today. It is holding back the rest.']), w: 1 });
  if (s.crafted >= 3) out.push({ text: rng.pick(['Good work today. My hands are sure.', 'Three things made. Not bad for one pair of hands.']), w: 1 });
  if (s.lowNeed) {
    const lines: Record<string, string> = { energy: 'I am running on empty. Sleep, properly, tonight.', hunger: 'I forgot to eat again. Tomorrow I eat first.', social: 'I have been keeping to myself too much.', fun: 'All duty and no joy. I need to do something for myself.', comfort: 'Cold, wet, and sore. I need a fire and a chair.', purpose: 'What am I even for, lately? I need something to do that matters.' };
    out.push({ text: lines[s.lowNeed], w: 2 });
  }
  if (s.best) out.push({ text: `The best part of today: ${fp(v, s.best.text)}.`.replace(/\.\.$/, '.'), w: 1 });
  if (s.worst && s.worst.importance >= 4) out.push({ text: `I keep coming back to it: ${fp(v, s.worst.text)}.`.replace(/\.\.$/, '.'), w: 1 });
  if (s.events.length) out.push({ text: `Today the village will remember: ${fp(v, s.events[0])}.`.replace(/\.\.$/, '.'), w: 2 });
  if (rng.chance(0.25)) out.push({ text: rng.pick([`Some nights I think about it: ${lowerFirst(p.dream)}`, `Still dreaming of it. ${p.dream}`, `One day. ${p.dream}`]), w: 1 });
  if (!out.length) out.push({ text: rng.pick(['An ordinary day. Those add up to a life.', 'Nothing much happened. I am fine with that.', 'Tomorrow, then.', 'Same as yesterday, more or less. The bread was good.']), w: 1 });
  const picked: string[] = [];
  const pool = [...out];
  const count = Math.min(pool.length, 1 + (rng.chance(0.7) ? 1 : 0) + (rng.chance(0.4) ? 1 : 0));
  while (picked.length < count && pool.length) {
    const total = pool.reduce((a, b) => a + b.w, 0);
    let r = rng.next() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].w; if (r <= 0) break; }
    picked.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0].text);
  }
  return picked;
}
