/**
 * The event catalogue: data plus small hooks. Each event announces itself as memories (who would know),
 * changes the world/sim through the public contract, and cleans up after itself.
 */
import { item } from '../core/items.ts';
import type { ActiveEvent, ItemId, Villager, VillagerId } from '../core/types.ts';
import {
  addGoal, addToShop, adjustNeeds, blockTiles, chronicle, completeGoals, dryPlots, first, forceWeather, gather, giftable, giveGift,
  isAsleep, isWorking, makeSick, minuteAt, nearestTo, nudgeMood, plantedFarmPlots, recover, remember, removeFromShop, restoreTiles, romanceCandidates, setBackPlot,
  setStatus, shopsOf, stockOfShop, villagersAround, villagersAt, list as listNames, money, type StallShop,
} from './helpers.ts';
import type { Announcement, EventCtx, EventDef } from './types.ts';

const likes = (v: Villager, tag: string): boolean => v.personality.likes.includes(tag);
const dislikes = (v: Villager, tag: string): boolean => v.personality.dislikes.includes(tag);
const hasTrait = (v: Villager, t: string): boolean => v.personality.traits.includes(t);
const moodFor = (like: string[], dislike: string[]) => (v: Villager): 'pleasant' | 'unpleasant' | null =>
  like.some((t) => likes(v, t)) ? 'pleasant' : dislike.some((t) => dislikes(v, t)) ? 'unpleasant' : null;
const everyone = (text: string | ((v: Villager) => string), importance: number, tags: string[] = [], extra: Partial<Announcement> = {}): Announcement => ({ to: 'everyone', text, importance, tags, ...extra });
const awake = (text: string | ((v: Villager) => string), importance: number, tags: string[] = [], extra: Partial<Announcement> = {}): Announcement => ({ to: 'awake', text, importance, tags, ...extra });
const only = (ids: VillagerId[], text: string | ((v: Villager) => string), importance: number, tags: string[] = [], extra: Partial<Announcement> = {}): Announcement => ({ to: ids, text, importance, tags, ...extra });
const v_ = (ctx: EventCtx, id: VillagerId): Villager | undefined => ctx.sim.villager(id);
const others = (ctx: EventCtx, ...ids: VillagerId[]): Villager[] => ctx.sim.villagers.filter((v) => !ids.includes(v.id));
const dayOf = (ctx: EventCtx): number => ctx.time.dayIndex;

/* ================================================================= weather */

const storm_warning: EventDef = {
  id: 'storm_warning', name: 'Storm Warning', kind: 'weather', rarity: 'common', drama: 4,
  description: 'Dov reads the river and Elin\'s knee agrees: a storm tomorrow. Time to bring things in.',
  seasons: ['spring', 'summer', 'autumn'], when: { kind: 'random', perDay: 0.07, hours: [8, 17] }, durationMin: 180, cooldownDays: 5, exclusive: ['storm', 'heatwave', 'drought'],
  announce: (ctx) => [
    only(['dov'], 'Dov can smell a storm on the river; it will be here tomorrow', 6, ['weather', 'storm', 'plan']),
    everyone((v) => `${ctx.name('dov')} says a storm is coming tomorrow — bring things in and tie things down`, 5, ['weather', 'storm', 'plan'], { about: ['dov'], mood: moodFor(['storm'], ['storm']) }),
  ],
  onStart(ctx, ev) {
    const day = dayOf(ctx) + 1;
    ctx.schedule('storm', minuteAt(day, 13 + ctx.rng.int(0, 3)), { warned: true }, 'Storm (forecast)');
    ev.data.stormDay = day;
    const ada = v_(ctx, 'ada'); if (ada) addGoal(ada, 'get the harvest in before the storm', 8, ctx.now);
    const dov = v_(ctx, 'dov'); if (dov) addGoal(dov, 'pull the boat up and stow the nets', 7, ctx.now);
  },
  onEnd() {},
};

const storm: EventDef = {
  id: 'storm', name: 'Storm', kind: 'weather', rarity: 'uncommon', drama: 6,
  description: 'Thunder over the hill, the river up, everyone indoors. Crops get watered; a fence will not survive it.',
  seasons: ['spring', 'summer', 'autumn'], when: { kind: 'random', perDay: 0.03, hours: [12, 17] }, durationMin: 300, cooldownDays: 6, exclusive: ['heatwave', 'drought', 'storm_warning'],
  announce: () => [
    awake('A storm broke over Pebblebrook: thunder, sheets of rain, the river brown and loud', 6, ['weather', 'storm'], { mood: moodFor(['storm', 'rain'], ['storm', 'rain']) }),
  ],
  onStart(ctx, ev) {
    forceWeather(ctx.world, 'storm', 0.9, (ev.endsAt - ev.startedAt) / 60);
    for (const v of ctx.sim.villagers) { if (!v.inside) adjustNeeds(v, { comfort: -12 }); if (dislikes(v, 'storm')) nudgeMood(v, -0.15); if (likes(v, 'storm')) nudgeMood(v, 0.1); }
    ev.data.fenceBroken = ctx.rng.chance(0.7);
  },
  onEnd(ctx, ev) {
    const ada = v_(ctx, 'ada'), jory = v_(ctx, 'jory');
    if (ev.data.fenceBroken && ada) {
      remember(ctx.sim, ada, 'The storm took down a stretch of the farm fence; the sheep will be out by morning if it is not fixed', 6, ['storm', 'fence', 'unpleasant', 'plan']);
      addGoal(ada, 'get the storm-damaged fence fixed', 8, ctx.now);
      if (jory) { remember(ctx.sim, jory, 'Ada\'s fence came down in the storm — she will be after Jory to fix it', 5, ['storm', 'fence', 'plan'], ['ada']); addGoal(jory, 'fix Ada\'s storm-damaged fence', 6, ctx.now); }
      const r = ctx.sim.postRequest('ada', '2 pouches of nails and 4 wood to mend the storm fence', { money: Math.round((item('nails').price * 2 + item('wood').price * 4) * 1.5) + 10 }, [{ id: 'nails', qty: 2 }, { id: 'wood', qty: 4 }]);
      r.expiresAt = ctx.now + 3 * 1440;
      chronicle(ctx.sim, 'The storm has passed. A fence is down at the farm and Ada is already out counting sheep.', 5, ['ada'], 'farm');
    } else chronicle(ctx.sim, 'The storm has passed; the fields are soaked and the river is high.', 4);
  },
};

const heatwave: EventDef = {
  id: 'heatwave', name: 'Heatwave', kind: 'weather', rarity: 'uncommon', drama: 5,
  description: 'Two blazing days. Crops dry by noon, the tavern runs low on cider and nobody wants to be at the forge.',
  seasons: ['summer'], when: { kind: 'random', perDay: 0.07, hours: [9, 11] }, durationMin: 2 * 1440 - 60, cooldownDays: 8, exclusive: ['storm', 'drought', 'fog'],
  announce: () => [
    everyone('A heatwave has settled on the valley — the air shimmers over the square and the well is busy', 5, ['weather', 'heat'], { mood: moodFor(['sunny'], ['heat']) }),
    only(['ada'], 'In this heat the plots dry out by midday; they will need watering twice', 6, ['weather', 'heat', 'farming', 'plan']),
    only(['bram'], 'The forge in a heatwave is a punishment. Short shifts, lots of water', 5, ['weather', 'heat', 'unpleasant']),
    only(['finn'], 'Everyone wants cider in this heat. Finn could charge a little more', 5, ['weather', 'heat', 'money', 'plan']),
  ],
  onStart(ctx, ev) {
    forceWeather(ctx.world, 'sunny', 1, 24);
    ev.data.prices = { ale: 1.25, cider: 1.35, milk: 1.2, tea: 0.9 };
    const ada = v_(ctx, 'ada'); if (ada) addGoal(ada, 'water every plot twice while the heat lasts', 8, ctx.now);
  },
  onHour(ctx, ev, hour) {
    if (hour === 6) forceWeather(ctx.world, 'sunny', 1, 24);
    if (hour === 13) { const n = dryPlots(ctx.world); if (n) { const ada = v_(ctx, 'ada'); if (ada && !isAsleep(ctx.sim, ada)) { remember(ctx.sim, ada, `${n} plots have dried out again in the heat`, 5, ['heat', 'farming', 'unpleasant', 'plan']); ctx.sim.interrupt(ada, 'the plots have dried out in the heat'); } } }
    if (hour === 14) for (const v of ctx.sim.villagers) if (!v.inside && !isAsleep(ctx.sim, v)) adjustNeeds(v, { comfort: -8, energy: -4 });
    void ev;
  },
  onEnd(ctx) { chronicle(ctx.sim, 'The heat has finally broken. Bram is back at the forge and the cider is back to its old price.', 4); },
};

const fog: EventDef = {
  id: 'fog', name: 'River Fog', kind: 'weather', rarity: 'common', drama: 3,
  description: 'A thick fog off the river swallows the village until afternoon. Fishing is strange, gossip is stranger.',
  seasons: ['spring', 'autumn', 'winter'], when: { kind: 'random', perDay: 0.07, hours: [6, 8] }, durationMin: 420, cooldownDays: 4, exclusive: ['storm', 'heatwave'],
  announce: () => [
    awake('Fog came up off the river so thick you could lose the square in it', 4, ['weather', 'fog'], { mood: moodFor(['rain', 'quiet', 'mystery'], ['fog']) }),
    only(['dov'], 'Fog on the lake: the fish come up shallow and strange. A good morning for the rod', 5, ['weather', 'fog', 'fishing', 'plan']),
    only(['greta'], 'Fog is bad luck for the mine. Greta touched wood twice and went down anyway', 5, ['weather', 'fog', 'superstition']),
  ],
  onStart(ctx, ev) { forceWeather(ctx.world, 'fog', 0.85, (ev.endsAt - ev.startedAt) / 60); ev.data.fishBonus = 1.3; },
  onEnd(ctx) { chronicle(ctx.sim, 'The fog has lifted off the river.', 2); },
};

const drought: EventDef = {
  id: 'drought', name: 'Drought', kind: 'nature', rarity: 'rare', drama: 6,
  description: 'Three dry days and a low river. Every plot needs carrying water; the fisher and the farmer compare worries.',
  seasons: ['summer'], when: { kind: 'random', perDay: 0.04, hours: [7, 9] }, durationMin: 3 * 1440 - 120, cooldownDays: 14, exclusive: ['storm', 'storm_warning', 'heatwave'],
  announce: (ctx) => [
    everyone(`The river is lower than anyone remembers; ${ctx.name('ada')} is carrying water by the bucket`, 5, ['weather', 'drought'], { about: ['ada'], mood: moodFor([], ['farming']) }),
    only(['ada'], 'Drought. Nothing will grow that is not watered by hand, every single morning', 7, ['weather', 'drought', 'farming', 'plan', 'unpleasant']),
    only(['dov'], 'The lake has pulled back from the dock; the fish are sulking in the deep water', 5, ['weather', 'drought', 'fishing', 'unpleasant']),
  ],
  onStart(ctx, ev) {
    forceWeather(ctx.world, 'sunny', 1, 24);
    ev.data.fishBonus = 0.6; ev.data.prices = { turnip: 1.2, potato: 1.2, corn: 1.25, tomato: 1.25, milk: 1.15 };
    const ada = v_(ctx, 'ada'); if (ada) { addGoal(ada, 'water every plot by hand while the drought lasts', 9, ctx.now); const r = ctx.sim.postRequest('ada', 'a hand watering the plots — bring 3 fertiliser to keep the roots going', { money: Math.round(item('fertiliser').price * 3 * 1.5) + 15 }, [{ id: 'fertiliser', qty: 3 }]); r.expiresAt = ctx.now + 3 * 1440; }
  },
  onHour(ctx, ev, hour) {
    if (hour === 6) forceWeather(ctx.world, 'sunny', 1, 24);
    if (hour === 12) { dryPlots(ctx.world); const ada = v_(ctx, 'ada'); if (ada && !isAsleep(ctx.sim, ada) && !isWorking(ada, ctx.time)) ctx.sim.interrupt(ada, 'the plots are bone dry'); }
    void ev;
  },
  onEnd(ctx) { forceWeather(ctx.world, 'rain', 0.6, 6); chronicle(ctx.sim, 'Rain at last. The drought is over and Ada stood in it with her hat off.', 6, ['ada']); const ada = v_(ctx, 'ada'); if (ada) { remember(ctx.sim, ada, 'The drought broke with proper rain. Ada stood in the yard and let it soak her', 7, ['weather', 'rain', 'pleasant']); completeGoals(ada, 'water every plot by hand'); } },
};

const first_snow: EventDef = {
  id: 'first_snow', name: 'First Snow', kind: 'weather', rarity: 'uncommon', drama: 5,
  description: 'The first snow of the year. Cerys is out in it; Bram is not.',
  seasons: ['winter'], when: { kind: 'trigger', check: (ctx) => ctx.time.season === 'winter' && ctx.world.weather.kind === 'snow' }, durationMin: 360, cooldownDays: 100,
  announce: () => [
    everyone('The first snow of the year is falling on Pebblebrook', 5, ['weather', 'snow'], { mood: (v) => likes(v, 'festive') || likes(v, 'flower') || hasTrait(v, 'romantic') || hasTrait(v, 'artistic') ? 'pleasant' : dislikes(v, 'rain') ? 'unpleasant' : null }),
    only(['cerys'], 'First snow! Cerys ran out of the bakery with flour still on her hands to catch it', 6, ['weather', 'snow', 'pleasant']),
    only(['bram'], 'Snow. Which means every hinge in the village will seize and they will all come to Bram', 4, ['weather', 'snow', 'plan']),
  ],
  onStart(ctx, ev) { ev.data.prices = { tea: 0.85, coffee: 0.9, stew: 0.9 }; for (const v of ctx.sim.villagers) if (!v.inside) adjustNeeds(v, { fun: 6, comfort: -6 }); },
  onEnd() {},
};

const meteor_shower: EventDef = {
  id: 'meteor_shower', name: 'Meteor Shower', kind: 'nature', rarity: 'uncommon', drama: 6, place: 'hill',
  description: 'A clear night and falling stars. Half the village ends up on the hill with blankets.',
  seasons: ['summer', 'autumn'], when: { kind: 'random', perDay: 0.07, hours: [21, 21] }, durationMin: 150, cooldownDays: 10,
  canFire: (ctx) => ['sunny', 'cloudy'].includes(ctx.world.weather.kind),
  announce: (ctx) => [
    awake(`Falling stars over the hill tonight — ${ctx.name('ines')} counted forty before she lost count`, 6, ['stars', 'night', 'pleasant'], { about: ['ines'] }),
  ],
  onStart(ctx, ev) {
    const who = ctx.sim.villagers.filter((v) => likes(v, 'stars') || v.personality.openness > 0.5 || v.status.includes('inLove') || ctx.rng.chance(0.3));
    ev.data.invited = who.map((v) => v.id);
    gather(ctx, ev, who, 'a meteor shower has started over the hill', 'go up the hill and watch the meteor shower', 8);
  },
  onEnd(ctx, ev) {
    const there = villagersAt(ctx.sim, 'hill', 9);
    for (const v of there) { adjustNeeds(v, { fun: 15, purpose: 5 }); remember(ctx.sim, v, `${first(v)} watched the meteor shower from the hill${there.length > 1 ? ' with ' + listNames(there.filter((o) => o.id !== v.id).map(first)) : ', alone, and did not mind'}`, 6, ['stars', 'night', 'pleasant', 'social'], there.filter((o) => o.id !== v.id).map((o) => o.id), 'hill'); }
    for (let i = 0; i < there.length; i++) for (let j = i + 1; j < there.length; j++) { ctx.sim.adjustRelationship(there[i], there[j].id, { affinity: 2, familiarity: 2, romance: 1.5 }); ctx.sim.adjustRelationship(there[j], there[i].id, { affinity: 2, familiarity: 2, romance: 1.5 }); }
    chronicle(ctx.sim, there.length ? `The meteor shower is over. ${listNames(there.map(first))} came down from the hill in the dark, talking quietly.` : 'The meteor shower is over; nobody made it up the hill.', 5, there.map((v) => v.id), 'hill');
    void ev;
  },
};

const shooting_star: EventDef = {
  id: 'shooting_star', name: 'A Shooting Star', kind: 'nature', rarity: 'common', drama: 3,
  description: 'One bright streak across the sky. Whoever is outside makes a wish.',
  when: { kind: 'random', perDay: 0.06, hours: [20, 22] }, durationMin: 30, cooldownDays: 3, exclusive: ['meteor_shower'],
  canFire: (ctx) => ['sunny', 'cloudy'].includes(ctx.world.weather.kind),
  announce: () => [],
  onStart(ctx, ev) {
    const outside = ctx.sim.villagers.filter((v) => !v.inside && !isAsleep(ctx.sim, v));
    ev.data.wishers = outside.map((v) => v.id);
    for (const v of outside) { remember(ctx.sim, v, `${first(v)} saw a shooting star and wished, quietly: ${v.personality.dream.toLowerCase()}`, 6, ['stars', 'wish', 'pleasant', 'dream']); adjustNeeds(v, { purpose: 8, fun: 5 }); ctx.sim.emote(v, 'idea'); }
    if (outside.length) chronicle(ctx.sim, `A shooting star. ${listNames(outside.map(first))} saw it and made wishes.`, 4, outside.map((v) => v.id));
  },
  onEnd() {},
};

/* ================================================================ visitors */

const MERCHANT_STOCK: [ItemId, number][] = [['pearl', 1], ['gem', 1], ['poetry', 2], ['scarf', 2], ['map_fragment', 1], ['sunflower_seed', 6], ['strawberry_seed', 6], ['pumpkin_seed', 4], ['honey', 3], ['candle', 4], ['book', 2], ['lantern', 1]];

const merchant: EventDef = {
  id: 'merchant', name: 'Travelling Merchant', kind: 'visitor', rarity: 'uncommon', drama: 5, place: 'square',
  description: 'Old Tamsin\'s cart is on the square for two days: pearls, a gem, poetry, scarves, exotic seeds and half a map.',
  when: { kind: 'random', perDay: 0.07, hours: [8, 11] }, durationMin: 2 * 1440 - 180, cooldownDays: 9, exclusive: ['market_day', 'mayor_race'],
  announce: () => [
    everyone('A travelling merchant, old Tamsin, has set up her cart on the square with pearls, gems, books and seeds nobody here grows', 5, ['merchant', 'trade', 'square', 'plan'], { mood: (v) => likes(v, 'fancy') || likes(v, 'books') || likes(v, 'news') ? 'pleasant' : null }),
    only(['hal'], 'Tamsin\'s cart on the square, again. Undercutting nobody, but every coin she takes is a coin not spent at the store', 5, ['merchant', 'money', 'unpleasant']),
    only(['ines'], 'The merchant has an old map fragment on her cart. It could be the other half', 7, ['merchant', 'mystery', 'map', 'plan']),
  ],
  onStart(ctx, ev) {
    const stock = MERCHANT_STOCK.map(([id, qty]) => ({ id, qty }));
    ev.data.stock = stock.map((s) => ({ ...s }));
    ev.data.merchant = { name: 'Tamsin', pos: { ...(ctx.world.place('square')?.anchor ?? { x: 41, y: 35 }) }, look: { skin: '#d9a77b', hair: '#c9c9c9', hairStyle: 3, outfit: '#7a4c8c', accent: '#e2b350', hat: 2, build: 'medium', height: 24 } };
    ev.data.stall = openStall(ctx, stock);
    const ines = v_(ctx, 'ines'); if (ines) addGoal(ines, 'buy the map fragment from the merchant on the square', 8, ctx.now);
    const cerys = v_(ctx, 'cerys'); if (cerys) addGoal(cerys, 'have a look at the merchant\'s cart', 5, ctx.now);
  },
  onLoad(ctx, ev) {
    const stock = ((ev.data.stock as { id: ItemId; qty: number }[]) ?? []).map((s) => ({ ...s }));
    if (!shopsOf(ctx.sim)?.get('square')) ev.data.stall = openStall(ctx, stock);
  },
  onHour(ctx, ev, hour) {
    if (hour === 9 || hour === 16) {
      const stock = ev.data.stock as { id: ItemId; qty: number }[];
      const shops = shopsOf(ctx.sim);
      const live = shops?.get('square')?.stock ?? stock;
      ev.data.stock = live.map((s) => ({ ...s }));
    }
  },
  onEnd(ctx, ev) {
    const shops = shopsOf(ctx.sim);
    const sold = shops?.get('square')?.sold ?? 0;
    shops?.delete('square');
    chronicle(ctx.sim, `Tamsin has packed up her cart and gone on down the river road${sold ? ` (${sold} things sold)` : ''}.`, 4, [], 'square');
    void ev;
  },
};

function openStall(ctx: EventCtx, stock: { id: ItemId; qty: number }[]): boolean {
  const shops = shopsOf(ctx.sim);
  if (!shops) return false;
  const stall: StallShop = { place: 'square', stock, demand: {}, base: [], markup: 1.4, overrides: {}, sold: 0, bought: 0, open: true };
  shops.set('square', stall);
  return true;
}

const flour_shortage: EventDef = {
  id: 'flour_shortage', name: 'Flour Shortage', kind: 'economy', rarity: 'uncommon', drama: 5,
  description: 'The mill upriver has stopped. No flour at the store, bread prices up, Cerys furious, Hal quietly delighted.',
  when: { kind: 'random', perDay: 0.05, hours: [8, 10] }, durationMin: 3 * 1440 - 240, cooldownDays: 12,
  announce: (ctx) => [
    everyone(`There is no flour to be had — the mill upriver has stopped, and ${ctx.name('hal')} is charging double for what he has`, 5, ['shortage', 'flour', 'money'], { about: ['hal'] }),
    only(['cerys'], 'No flour. Cerys stared at the empty sacks and swore in a way that would have surprised her customers', 7, ['shortage', 'flour', 'baking', 'unpleasant', 'plan']),
    only(['hal'], 'Flour is short and the store has the last of it. Supply and demand; Hal did not make the rules', 6, ['shortage', 'flour', 'money', 'plan']),
    only(['finn'], 'Bread costs half again what it did on Monday. Finn will have to water the stew', 4, ['shortage', 'money', 'unpleasant']),
  ],
  onStart(ctx, ev) {
    ev.data.prices = { flour: 2.2, bread: 1.6, sweet_roll: 1.5, berry_pie: 1.4, wheat: 1.8 };
    ev.data.storeFlour = removeFromShop(ctx.sim, 'store', 'flour');
    addToShop(ctx.sim, 'store', 'flour', 1);
    const cerys = v_(ctx, 'cerys'); if (cerys) { nudgeMood(cerys, -0.3); setStatus(cerys, 'angry', true); addGoal(cerys, 'find flour or wheat, whatever it costs', 9, ctx.now); const r = ctx.sim.postRequest('cerys', '6 wheat so the bakery can mill its own flour', { money: Math.round(item('wheat').price * 6 * 1.5) + 20, item: { id: 'sweet_roll', qty: 2 } }, [{ id: 'wheat', qty: 6 }]); r.expiresAt = ctx.now + 3 * 1440; }
    for (const v of others(ctx, 'hal')) ctx.sim.adjustRelationship(v, 'hal', { affinity: -3, trust: -2 }, 'profiteering on flour');
    const hal = v_(ctx, 'hal'); if (hal) hal.money += 25;
  },
  onEnd(ctx, ev) {
    addToShop(ctx.sim, 'store', 'flour', Math.max(6, Number(ev.data.storeFlour) || 0));
    const cerys = v_(ctx, 'cerys'); if (cerys) { setStatus(cerys, 'angry', false); completeGoals(cerys, 'find flour'); remember(ctx.sim, cerys, 'The mill is turning again. Flour by the sackful and Cerys baked until midnight out of spite', 6, ['flour', 'baking', 'pleasant']); }
    chronicle(ctx.sim, 'The mill upriver is running again; flour is back at the store and bread is back to its old price.', 4);
  },
};

const tax_collector: EventDef = {
  id: 'tax_collector', name: 'The Tax Collector', kind: 'economy', rarity: 'common', drama: 4, place: 'square',
  description: 'The county\'s man sits at a table on the square with a ledger. Everyone pays; everyone grumbles.',
  when: { kind: 'calendar', season: 'any', day: 26, hour: 10 }, durationMin: 300, cooldownDays: 20,
  announce: () => [],
  onStart(ctx, ev) {
    const paid: Record<VillagerId, number> = {};
    let total = 0;
    for (const v of ctx.sim.villagers) {
      const due = Math.min(80, Math.max(5, Math.round(v.money * 0.08)));
      if (v.money >= due) { v.money -= due; paid[v.id] = due; total += due; remember(ctx.sim, v, `The tax collector took ${money(due)} off ${first(v)}${hasTrait(v, 'penny-pinching') || likes(v, 'money') ? '. Robbery, with a ledger' : ''}`, 4, ['tax', 'money', 'unpleasant']); nudgeMood(v, -0.08); }
      else { paid[v.id] = 0; remember(ctx.sim, v, `${first(v)} could not pay the tax collector and has been written down in the ledger for next season`, 6, ['tax', 'money', 'debt', 'unpleasant']); nudgeMood(v, -0.2); }
    }
    const finn = v_(ctx, 'finn'), hal = v_(ctx, 'hal');
    if (finn && hal && paid.finn === 0) { remember(ctx.sim, hal, 'Finn could not pay the tax man either. Hal is not the only one he owes', 5, ['tax', 'debt', 'money'], ['finn']); ctx.sim.adjustRelationship(hal, 'finn', { trust: -3 }); }
    ev.data.paid = paid; ev.data.total = total;
    const sq = ctx.world.place('square');
    if (sq) ev.data.collector = { name: 'the county clerk', pos: { ...sq.anchor } };
    chronicle(ctx.sim, `Tax day. The county clerk collected ${money(total)} from the village and left before anyone could buy him a drink.`, 4, [], 'square');
  },
  onEnd() {},
};

const market_day: EventDef = {
  id: 'market_day', name: 'Market Day', kind: 'economy', rarity: 'common', drama: 4, place: 'square',
  description: 'Saturday market on the square: stalls, better prices for produce and fish, everyone out and about.',
  when: { kind: 'calendar', weekday: 5, hour: 9 }, durationMin: 300, cooldownDays: 5, exclusive: ['merchant', 'tax_collector', 'mayor_race'],
  announce: () => [
    awake('Market day on the square: stalls out, produce and fish fetching a good price, everyone comparing everyone else\'s baskets', 4, ['market', 'trade', 'square', 'social', 'plan'], { mood: (v) => likes(v, 'social') || likes(v, 'money') || likes(v, 'news') ? 'pleasant' : dislikes(v, 'crowds') ? 'unpleasant' : null }),
  ],
  onStart(ctx, ev) {
    ev.data.prices = { turnip: 1.15, potato: 1.15, strawberry: 1.2, corn: 1.15, tomato: 1.15, pumpkin: 1.2, cabbage: 1.15, trout: 1.2, perch: 1.2, carp: 1.15, salmon: 1.25, catfish: 1.2, bread: 1.1, sweet_roll: 1.1, honey: 1.15, egg: 1.1, milk: 1.1 };
    const who = ctx.sim.villagers.filter((v) => !['shopkeeper', 'baker', 'innkeeper'].includes(v.profession));
    gather(ctx, ev, who, 'the market is opening on the square', 'go down to the market on the square', 6);
  },
  onEnd(ctx) { chronicle(ctx.sim, 'The market stalls are packed away.', 2, [], 'square'); },
};

const bard: EventDef = {
  id: 'bard', name: 'A Bard Passing Through', kind: 'visitor', rarity: 'uncommon', drama: 5, place: 'tavern',
  description: 'Orrin the bard stops at the Drowsy Owl for a night. Songs, a full house, and Jory does not sleep.',
  when: { kind: 'random', perDay: 0.06, hours: [17, 18] }, durationMin: 270, cooldownDays: 8,
  announce: (ctx) => [
    awake(`A bard called Orrin is playing at the Drowsy Owl tonight; ${ctx.name('finn')} has been shouting about it since he arrived`, 5, ['bard', 'music', 'tavern', 'social', 'plan'], { about: ['finn'], mood: (v) => likes(v, 'music') || likes(v, 'social') || likes(v, 'stories') ? 'pleasant' : dislikes(v, 'noise') || dislikes(v, 'loud') ? 'unpleasant' : null }),
    only(['finn'], 'Orrin the bard is back! One night only, and the Owl will be full to the rafters', 7, ['bard', 'music', 'tavern', 'pleasant', 'dream']),
    only(['jory'], 'A real bard at the tavern tonight. Jory wants to hear how he does the bridge in the river song', 6, ['bard', 'music', 'pleasant', 'plan']),
  ],
  onStart(ctx, ev) {
    ev.data.visitor = { name: 'Orrin the bard', place: 'tavern', look: { skin: '#e0b48c', hair: '#3a2a1a', hairStyle: 6, outfit: '#2e4a7a', accent: '#e2b350', build: 'slim', height: 24 } };
    const who = ctx.sim.villagers.filter((v) => !dislikes(v, 'noise') || ctx.rng.chance(0.3));
    gather(ctx, ev, who, 'a bard is playing at the tavern', 'go to the Drowsy Owl and hear the bard', 7);
    const jory = v_(ctx, 'jory'); if (jory) setStatus(jory, 'inspired', true);
  },
  onEnd(ctx, ev) {
    const there = villagersAt(ctx.sim, 'tavern', 3);
    for (const v of there) { adjustNeeds(v, { fun: 20, social: 15 }); remember(ctx.sim, v, `${first(v)} heard Orrin the bard play at the Owl — the river song, and a new one about a wolf and a mayor's hat`, 6, ['bard', 'music', 'tavern', 'pleasant', 'social'], there.filter((o) => o.id !== v.id).map((o) => o.id), 'tavern'); }
    const finn = v_(ctx, 'finn'); if (finn) { finn.money += 10 * Math.max(1, there.length); adjustNeeds(finn, { purpose: 20 }); }
    const jory = v_(ctx, 'jory'); if (jory) { setStatus(jory, 'inspired', false); addGoal(jory, 'learn the bard\'s river song properly', 5, ctx.now); }
    chronicle(ctx.sim, there.length ? `Orrin the bard played until late. ${listNames(there.map(first))} stayed for every song.` : 'Orrin the bard played to an empty room and left early.', 5, there.map((v) => v.id), 'tavern');
    void ev;
  },
};

const VISITORS = [
  { name: 'Lark Amsel', role: 'a travelling tinker', story: 'the city, where the streets have lamps that light themselves', look: { skin: '#c98d62', hair: '#1f1f2b', hairStyle: 9, outfit: '#5a3d2b', accent: '#c9c9c9', build: 'slim', height: 23 } },
  { name: 'Pell Harrow', role: 'a mapmaker from the coast', story: 'a sea that goes on further than the sky', look: { skin: '#f1c9a8', hair: '#8a4b1f', hairStyle: 4, outfit: '#3f6fb0', accent: '#e9c27c', build: 'medium', height: 25 } },
  { name: 'Bess Marrow', role: 'a retired soldier looking for somewhere quiet', story: 'the war nobody here remembers', look: { skin: '#d59a6d', hair: '#8c8c8c', hairStyle: 7, outfit: '#4a4a55', accent: '#9a3b2b', build: 'broad', height: 25 } },
];

const visitor: EventDef = {
  id: 'visitor', name: 'A Newcomer at the Inn', kind: 'visitor', rarity: 'uncommon', drama: 5, place: 'tavern',
  description: 'A stranger takes a room at the Drowsy Owl for three days and has stories. Hal wants to know everything.',
  when: { kind: 'random', perDay: 0.05, hours: [15, 18] }, durationMin: 3 * 1440 - 300, cooldownDays: 10, exclusive: ['bard'],
  announce: (ctx, ev) => {
    const vis = ev.data.visitor as { name: string; role: string };
    return [
      everyone(`A stranger, ${vis.name}, ${vis.role}, has taken a room at the Drowsy Owl`, 5, ['visitor', 'news', 'tavern'], { mood: (v) => likes(v, 'news') || likes(v, 'stories') ? 'pleasant' : dislikes(v, 'crowds') ? null : null }),
      only(['hal'], `A stranger at the inn. Hal intends to know where ${vis.name} came from, what they carry and how long they are staying, by supper`, 6, ['visitor', 'nosy', 'plan']),
      only(['finn'], `${vis.name} is paying for three nights. Coin! And a new face to tell the old stories to`, 6, ['visitor', 'money', 'tavern', 'pleasant']),
    ];
  },
  onStart(ctx, ev) {
    const vis = ctx.rng.pick(VISITORS);
    ev.data.visitor = { ...vis, place: 'tavern' };
    ev.name = `${vis.name} at the inn`;
    const finn = v_(ctx, 'finn'); if (finn) finn.money += 30;
    const hal = v_(ctx, 'hal'); if (hal) addGoal(hal, `find out everything about ${vis.name}`, 6, ctx.now);
    const ines = v_(ctx, 'ines'); if (ines) addGoal(ines, `ask ${vis.name} about ${vis.story.split(',')[0]}`, 5, ctx.now);
  },
  onHour(ctx, ev, hour) {
    if (hour !== 20 && hour !== 13) return;
    const vis = ev.data.visitor as { name: string; story: string };
    const there = villagersAt(ctx.sim, 'tavern', 3).filter((v) => !isAsleep(ctx.sim, v));
    for (const v of there) if (ctx.rng.chance(0.6)) { remember(ctx.sim, v, `${vis.name} told ${first(v)} about ${vis.story}`, 5, ['visitor', 'stories', 'pleasant', 'social'], undefined, 'tavern'); adjustNeeds(v, { fun: 8, social: 6 }); }
    const finn = v_(ctx, 'finn'); if (finn && hour === 20) finn.money += 8;
  },
  onEnd(ctx, ev) {
    const vis = ev.data.visitor as { name: string };
    for (const v of ctx.sim.villagers) if (v.memory.some((m) => m.tags.includes('visitor') && m.text.includes(vis.name))) remember(ctx.sim, v, `${vis.name} has moved on down the road. The village feels a little smaller again`, 4, ['visitor', 'news']);
    chronicle(ctx.sim, `${vis.name} has left the inn and taken the river road.`, 4, [], 'tavern');
  },
};

interface Letter { text: string; importance: number; mood: 'pleasant' | 'unpleasant' | null; goal?: string; tags: string[]; then?: (ctx: EventCtx, v: Villager) => void }
const LETTERS: Record<VillagerId, Letter[]> = {
  ada: [
    { text: 'A letter from Ada\'s brother in the north: the harvest failed there and he asks if she can spare seed', importance: 6, mood: 'unpleasant', goal: 'put seed aside for my brother', tags: ['family', 'farming'] },
    { text: 'A seed catalogue came for Ada with a new pumpkin variety circled in someone else\'s ink', importance: 4, mood: 'pleasant', tags: ['farming', 'pumpkin'] },
  ],
  bram: [
    { text: 'A letter from Bram\'s old master, now nearly blind: he is proud, and he wants a knife made by Bram\'s hand before the end', importance: 8, mood: 'pleasant', goal: 'forge a knife fine enough to send to the old master', tags: ['family', 'crafting', 'dream'] },
    { text: 'The county wants iron for the bridge works upriver, at a poor price. Bram put the letter in the fire', importance: 4, mood: 'unpleasant', tags: ['money', 'work'] },
  ],
  cerys: [
    { text: 'A letter from Cerys\'s cousin in the city with three pages of who married whom', importance: 5, mood: 'pleasant', tags: ['news', 'gossip', 'family'] },
    { text: 'An invitation for Cerys to bake at a wedding two valleys over — a proper wedding cake, tiers and all', importance: 7, mood: 'pleasant', goal: 'practise a tiered cake', tags: ['baking', 'dream', 'romance'] },
  ],
  dov: [
    { text: 'A letter from a fisher on the coast: the great salmon was seen in the estuary this spring, heading upriver', importance: 7, mood: 'pleasant', goal: 'fish the deep pool at dawn for the great salmon', tags: ['fishing', 'dream', 'salmon'] },
    { text: 'A letter for Dov with no name on it. Just a pressed river flower', importance: 6, mood: 'pleasant', tags: ['mystery', 'romance'] },
  ],
  elin: [
    { text: 'A letter from Elin\'s sister: the baby has arrived early and is small. Elin read it three times', importance: 7, mood: null, goal: 'write to my sister with everything I know about small babies', tags: ['family', 'medicine'] },
    { text: 'A medical journal came for Elin with a paper on river fevers. She has underlined most of it', importance: 5, mood: 'pleasant', tags: ['medicine', 'books'] },
  ],
  finn: [
    { text: 'A brewer in the city wrote to Finn: the bard Orrin has been asking after the Owl and might come back for the winter', importance: 6, mood: 'pleasant', tags: ['tavern', 'music', 'dream'] },
    { text: 'A reminder from the county about the tavern licence, overdue, with a fee. Finn hid it behind the bar', importance: 5, mood: 'unpleasant', goal: 'find the money for the tavern licence', tags: ['money', 'debt'] },
  ],
  greta: [
    { text: 'A letter from Greta\'s aunt with her grandmother\'s old sketch of the mine: a mark on the third gallery, and the word GOLD', importance: 8, mood: 'pleasant', goal: 'dig on the third gallery where grandmother marked it', tags: ['mining', 'dream', 'family'] },
    { text: 'The mining guild wrote to Greta about safety inspections. She used it to light the lamp', importance: 3, mood: 'unpleasant', tags: ['mining', 'work'] },
  ],
  hal: [
    { text: 'A supplier\'s letter for Hal: prices are going up in the city. He has already re-inked the price board', importance: 5, mood: null, goal: 'check every price against the city rates', tags: ['money', 'work'] },
    { text: 'A letter from Hal\'s daughter in the city: she is well, she does not need money, she asks if he is lonely', importance: 7, mood: null, tags: ['family'] },
  ],
  ines: [
    { text: 'The city archive wrote back to Ines: they hold a deed from Pebblebrook\'s founding, and it mentions the Stoneleigh name', importance: 8, mood: 'pleasant', goal: 'ask Greta about the Stoneleigh family history', tags: ['lore', 'history', 'mystery', 'dream'] },
    { text: 'A parcel of books for Ines from a friend at the university, with a note that said only: keep going', importance: 6, mood: 'pleasant', tags: ['books', 'pleasant'], then: (ctx, v) => ctx.sim.give(v, { id: 'book', qty: 2 }) },
  ],
  jory: [
    { text: 'A letter for Jory from a girl in the next valley who remembers a dance. He read it twice and whistled all afternoon', importance: 6, mood: 'pleasant', tags: ['romance', 'music'] },
    { text: 'A commission for Jory: a bandstand, in the city, paid in full. He would have to leave for a season', importance: 8, mood: null, goal: 'decide about the bandstand job in the city', tags: ['crafting', 'dream', 'money'] },
  ],
};

const letter: EventDef = {
  id: 'letter', name: 'A Letter Arrives', kind: 'social', rarity: 'common', drama: 4,
  description: 'The post cart leaves one letter with Hal to pass on. News from outside changes someone\'s week.',
  when: { kind: 'random', perDay: 0.09, hours: [9, 12] }, durationMin: 60, cooldownDays: 2,
  announce: () => [],
  onStart(ctx, ev, opts) {
    const ids = Object.keys(LETTERS);
    const to = typeof opts.villager === 'string' && LETTERS[opts.villager] ? opts.villager : ctx.rng.pick(ids);
    const v = v_(ctx, to);
    if (!v) return;
    const bank = LETTERS[to];
    const used = (ctx.sim.villagers.find((x) => x.id === to)?.stats.lettersRead ?? 0);
    const L = bank[used % bank.length];
    v.stats.lettersRead = used + 1;
    ev.data.to = to; ev.data.letter = L.text;
    ev.name = `A letter for ${first(v)}`;
    remember(ctx.sim, v, L.text, L.importance, ['letter', 'news', ...L.tags, ...(L.mood ? [L.mood] : [])]);
    if (L.goal) addGoal(v, L.goal, 6, ctx.now);
    if (L.mood === 'pleasant') nudgeMood(v, 0.2); else if (L.mood === 'unpleasant') nudgeMood(v, -0.2);
    L.then?.(ctx, v);
    const hal = v_(ctx, 'hal');
    if (hal && hal.id !== to) remember(ctx.sim, hal, `A letter came for ${first(v)} today. Hal handed it over unopened, which took some doing`, 4, ['letter', 'nosy', 'news'], [to]);
    if (!isAsleep(ctx.sim, v)) ctx.sim.emote(v, L.mood === 'unpleasant' ? 'sad' : L.mood === 'pleasant' ? 'happy' : 'question');
    chronicle(ctx.sim, `A letter came for ${first(v)}.`, 3, [to]);
  },
  onEnd() {},
};

/* ========================================================= nature, calamity */

const crows: EventDef = {
  id: 'crows', name: 'Crows on the Crops', kind: 'nature', rarity: 'common', drama: 4, place: 'farm',
  description: 'A murder of crows finds the farm at dawn. Several plots are set back; Ada wants a scarecrow yesterday.',
  seasons: ['spring', 'summer', 'autumn'], when: { kind: 'random', perDay: 0.08, hours: [6, 8] }, durationMin: 150, cooldownDays: 5,
  canFire: (ctx) => plantedFarmPlots(ctx.world).length >= 3,
  announce: (ctx, ev) => [
    only(['ada'], `Crows on the crops at first light — ${ev.data.hit} plots picked over. Ada threw her hat at them`, 7, ['crows', 'farming', 'unpleasant', 'plan']),
    { to: 'nearby', place: 'farm', radius: 14, text: (v) => `${first(v)} saw a cloud of crows come down on Ada's fields this morning`, importance: 4, tags: ['crows', 'farming'], about: ['ada'] },
    only(['jory'], 'Ada will want a scarecrow after the crows. Which means Jory will hear about it', 4, ['crows', 'crafting', 'plan'], { about: ['ada'] }),
  ],
  onStart(ctx, ev) {
    const plots = plantedFarmPlots(ctx.world);
    const n = Math.min(plots.length, ctx.rng.int(3, 6));
    const victims = ctx.rng.shuffle([...plots]).slice(0, n);
    for (const p of victims) setBackPlot(ctx.world, p.id, 1);
    ev.data.hit = n; ev.data.plots = victims.map((p) => p.id);
    const ada = v_(ctx, 'ada');
    if (ada) { nudgeMood(ada, -0.25); adjustNeeds(ada, { purpose: -10 }); addGoal(ada, 'get a scarecrow up before the crows come back', 8, ctx.now); if (!isAsleep(ctx.sim, ada)) ctx.sim.interrupt(ada, 'crows are on the crops'); const r = ctx.sim.postRequest('ada', '3 wood and 1 cloth for a scarecrow', { money: Math.round((item('wood').price * 3 + item('cloth').price) * 1.5) + 10 }, [{ id: 'wood', qty: 3 }, { id: 'cloth', qty: 1 }]); r.expiresAt = ctx.now + 3 * 1440; }
  },
  onEnd(ctx, ev) { chronicle(ctx.sim, `The crows have moved on to the orchard. ${ev.data.hit} plots at the farm will be late.`, 3, ['ada'], 'farm'); },
};

const cave_in: EventDef = {
  id: 'cave_in', name: 'Cave-in at the Mine', kind: 'calamity', rarity: 'rare', drama: 9, place: 'mine',
  description: 'A gallery comes down with Greta on the wrong side of it. Bram and Jory dig for hours.',
  when: { kind: 'random', perDay: 0.035, hours: [9, 15] }, durationMin: 240, cooldownDays: 20,
  canFire: (ctx) => { const g = v_(ctx, 'greta'); return !!g && !g.status.includes('injured') && !isAsleep(ctx.sim, g); },
  announce: (ctx) => [
    everyone(`A cave-in at the mine — ${ctx.name('greta')} is trapped behind the fall and ${ctx.name('bram')} and ${ctx.name('jory')} have gone up with picks and props`, 8, ['cave_in', 'mine', 'danger', 'unpleasant'], { about: ['greta', 'bram', 'jory'] }),
    only(['greta'], 'The gallery came down behind Greta. Dark, dust, and a long wait listening for picks', 9, ['cave_in', 'mine', 'danger', 'unpleasant', 'trapped']),
    only(['bram'], 'Greta is behind a fall in the mine. Bram dropped the hammer where it stood', 8, ['cave_in', 'mine', 'rescue', 'plan'], { about: ['greta'] }),
    only(['jory'], 'Greta is trapped in the mine. Props, a shovel, and no time to think about it', 8, ['cave_in', 'mine', 'rescue', 'plan'], { about: ['greta'] }),
    only(['elin'], 'A cave-in at the mine. Elin packed bandages and tonic and is trying not to imagine the worst', 7, ['cave_in', 'medicine', 'plan', 'unpleasant'], { about: ['greta'] }),
  ],
  onStart(ctx, ev) {
    const greta = v_(ctx, 'greta');
    if (!greta) return;
    ev.data.trapped = 'greta';
    setStatus(greta, 'injured', true); greta.health = Math.max(20, greta.health - 15); adjustNeeds(greta, { comfort: -30, energy: -10 });
    ctx.sim.interrupt(greta, 'the gallery has come down — trapped behind the fall');
    addGoal(greta, 'stay calm and keep tapping on the rock', 10, ctx.now);
    const rescuers = ['bram', 'jory'].map((id) => v_(ctx, id)).filter((v): v is Villager => !!v);
    gather(ctx, ev, rescuers, 'Greta is trapped in the mine', 'dig Greta out of the mine', 10, true);
    const elin = v_(ctx, 'elin'); if (elin) gather(ctx, ev, [elin], 'a cave-in at the mine — someone may be hurt', 'get to the mine with bandages for Greta', 9, true);
    const r = ctx.sim.postRequest('bram', 'timber props for the mine: 6 wood', { money: Math.round(item('wood').price * 6 * 1.5) + 20 }, [{ id: 'wood', qty: 6 }]);
    r.expiresAt = ctx.now + 2 * 1440;
    ev.data.request = r.id;
  },
  onEnd(ctx, ev) {
    const greta = v_(ctx, 'greta');
    if (!greta) return;
    const mine = ctx.world.place('mine');
    // Bram and Jory were sent and dug; anyone else at the mine when the fall clears helped too
    const rescuers = ['bram', 'jory'].map((id) => v_(ctx, id)).filter((v): v is Villager => !!v);
    if (mine) for (const v of villagersAround(ctx.sim, mine.anchor, 12, 'mine')) if (v.id !== 'greta' && !rescuers.includes(v)) rescuers.push(v);
    ev.data.rescuers = rescuers.map((r) => r.id);
    for (const r of rescuers) {
      ctx.sim.adjustRelationship(greta, r.id, { affinity: 15, trust: 20, familiarity: 6 }, 'dug me out of the mine');
      ctx.sim.adjustRelationship(r, 'greta', { affinity: 6, trust: 5, familiarity: 6 }, 'dug Greta out');
      remember(ctx.sim, r, `${first(r)} dug ${first(greta)} out of the mine after the cave-in. Hours of it, and then her voice, swearing`, 9, ['cave_in', 'rescue', 'mine', 'pleasant'], ['greta'], 'mine');
      completeGoals(r, 'dig Greta out');
      adjustNeeds(r, { energy: -25, purpose: 30 });
    }
    remember(ctx.sim, greta, `${listNames(rescuers.map(first))} dug Greta out of the mine. She will not forget it, and she will not admit how frightened she was`, 10, ['cave_in', 'rescue', 'mine', 'pleasant', 'trust'], rescuers.map((r) => r.id), 'mine');
    completeGoals(greta, 'stay calm');
    addGoal(greta, 'rest until the bruises fade, then get back down there', 6, ctx.now);
    for (const v of ctx.sim.villagers) if (v.id !== 'greta' && !rescuers.includes(v)) remember(ctx.sim, v, `${first(greta)} was dug out of the mine alive by ${listNames(rescuers.map(first))}`, 7, ['cave_in', 'rescue', 'mine', 'pleasant'], ['greta', ...rescuers.map((r) => r.id)]);
    const elin = v_(ctx, 'elin'); if (elin) { addGoal(elin, 'look Greta over properly after the cave-in', 8, ctx.now); }
    ctx.sim.interrupt(greta, 'free at last');
    const r = ctx.sim.postRequest('greta', 'a herbal tonic to get back on my feet', { money: Math.round(item('tonic').price * 1.5) + 10, item: { id: 'copper_ore', qty: 3 } }, [{ id: 'tonic', qty: 1 }]);
    r.expiresAt = ctx.now + 3 * 1440;
    chronicle(ctx.sim, `${listNames(rescuers.map(first))} dug Greta out of the mine. She walked out on her own, grey with dust, and asked for ale.`, 9, ['greta', ...rescuers.map((r) => r.id)], 'mine');
    ctx.sim.emote(greta, 'exclaim');
    void ev;
  },
};

const wolf: EventDef = {
  id: 'wolf', name: 'Wolf near the Sheep', kind: 'calamity', rarity: 'uncommon', drama: 6, place: 'barn',
  description: 'Something big in the tree line by the animal field. The sheep are in a panic; Ada and Bram go to look.',
  when: { kind: 'random', perDay: 0.05, hours: [5, 7] }, durationMin: 180, cooldownDays: 8,
  announce: (ctx) => [
    only(['ada'], 'The sheep were screaming before dawn. Wolf tracks in the mud by the field gate', 8, ['wolf', 'animals', 'danger', 'unpleasant', 'plan']),
    everyone(`${ctx.name('ada')} says there is a wolf about the farm — the sheep saw it, and so did the tracks`, 6, ['wolf', 'animals', 'danger'], { about: ['ada'], mood: (v) => hasTrait(v, 'brave') ? null : 'unpleasant' }),
    only(['bram'], 'A wolf at Ada\'s. Bram took the heavy hammer, which is not for horseshoes', 6, ['wolf', 'plan', 'brave'], { about: ['ada'] }),
  ],
  onStart(ctx, ev) {
    const animals = ctx.world.objectsAt('barn', 'animal');
    for (const a of animals) { a.data.mood = 'frightened'; a.data.scared = true; }
    ev.data.animals = animals.length;
    const ada = v_(ctx, 'ada'), bram = v_(ctx, 'bram');
    if (ada) gather(ctx, ev, [ada], 'a wolf is at the animal field', 'check on the animals — there is a wolf about', 10, true);
    if (bram) gather(ctx, ev, [bram], 'Ada needs a hand: a wolf at the farm', 'go over to the farm and help Ada with the wolf', 8, true);
  },
  onEnd(ctx, ev) {
    const animals = ctx.world.objectsAt('barn', 'animal');
    for (const a of animals) { a.data.mood = 'calm'; delete a.data.scared; }
    const barn = ctx.world.place('barn');
    const hero = barn ? nearestTo(ctx.sim, barn.anchor, (v) => !isAsleep(ctx.sim, v)) : undefined;
    const ada = v_(ctx, 'ada');
    const h = hero ?? ada;
    if (h) {
      remember(ctx.sim, h, `${first(h)} drove the wolf off from the animal field with a lot of shouting and a ${h.id === 'bram' ? 'hammer' : 'stick'}`, 7, ['wolf', 'animals', 'brave', 'pleasant'], undefined, 'barn');
      if (ada && h.id !== 'ada') { ctx.sim.adjustRelationship(ada, h.id, { affinity: 10, trust: 8, familiarity: 3 }, 'drove off the wolf'); remember(ctx.sim, ada, `${first(h)} drove the wolf off. Every sheep accounted for`, 7, ['wolf', 'animals', 'pleasant'], [h.id], 'barn'); }
      for (const v of ctx.sim.villagers) if (v.id !== h.id && v.id !== 'ada') remember(ctx.sim, v, `${first(h)} chased the wolf off Ada's field`, 5, ['wolf', 'animals', 'news'], [h.id, 'ada']);
      chronicle(ctx.sim, `${first(h)} drove the wolf off from the animal field. The sheep have stopped screaming.`, 6, [h.id, 'ada'], 'barn');
      completeGoals(h, 'check on the animals'); completeGoals(h, 'go over to the farm and help');
    }
    if (ada) { completeGoals(ada, 'check on the animals'); addGoal(ada, 'ask Jory to raise the field fence', 5, ctx.now); }
    void ev;
  },
};

const fish_bloom: EventDef = {
  id: 'fish_bloom', name: 'Fish Bloom', kind: 'nature', rarity: 'uncommon', drama: 5, place: 'lake',
  description: 'The lake boils with perch and trout for a day. Dov cannot cast fast enough; Finn plans a stew night.',
  seasons: ['spring', 'summer', 'autumn'], when: { kind: 'random', perDay: 0.06, hours: [6, 8] }, durationMin: 480, cooldownDays: 7,
  announce: (ctx) => [
    awake(`The lake is full of fish — ${ctx.name('dov')} says he has never seen the like, and he says almost nothing`, 5, ['fishing', 'lake', 'pleasant'], { about: ['dov'] }),
    only(['dov'], 'A bloom on the lake: fish rising everywhere. Dov cast until his arm went', 8, ['fishing', 'lake', 'pleasant', 'dream']),
    only(['finn'], 'Fish coming out of the lake by the basket. Stew night at the Owl tonight, then', 6, ['fishing', 'tavern', 'plan', 'pleasant'], { about: ['dov'] }),
  ],
  onStart(ctx, ev) {
    ev.data.fishBonus = 2.2; ev.data.prices = { perch: 0.75, trout: 0.75, carp: 0.7, catfish: 0.8 };
    const dov = v_(ctx, 'dov');
    if (dov) { ctx.sim.give(dov, { id: 'perch', qty: 3 }); ctx.sim.give(dov, { id: 'trout', qty: 2 }); addGoal(dov, 'fish the bloom while it lasts', 9, ctx.now); adjustNeeds(dov, { purpose: 20 }); if (!isAsleep(ctx.sim, dov) && !isWorking(dov, ctx.time)) ctx.sim.interrupt(dov, 'the lake is boiling with fish'); }
    const finn = v_(ctx, 'finn'); if (finn) { addGoal(finn, 'buy fish off Dov for a stew night', 7, ctx.now); const r = ctx.sim.postRequest('finn', '4 fresh perch for tonight\'s stew', { money: Math.round(item('perch').price * 4 * 1.5) + 5 }, [{ id: 'perch', qty: 4 }]); r.expiresAt = ctx.now + 1440; }
    ctx.schedule('stew_night', minuteAt(dayOf(ctx), 19), { name: 'Fish stew night at the Drowsy Owl', host: 'finn' }, 'Fish stew night');
  },
  onEnd(ctx) { chronicle(ctx.sim, 'The fish have gone back down. Dov is asleep on the dock.', 3, ['dov'], 'lake'); },
};

const bumper_harvest: EventDef = {
  id: 'bumper_harvest', name: 'Bumper Harvest', kind: 'nature', rarity: 'rare', drama: 7, place: 'farm',
  description: 'Everything came up at once. Ada\'s dream, more or less: the whole village eats.',
  seasons: ['summer', 'autumn'], when: { kind: 'trigger', check: (ctx) => plantedFarmPlots(ctx.world).filter((p) => p.plot.growth >= 1).length >= 8 }, durationMin: 600, cooldownDays: 25,
  announce: (ctx) => [
    everyone(`A bumper harvest at ${ctx.name('ada')}'s — carts of it, and she is giving half of it away`, 6, ['harvest', 'farming', 'pleasant'], { about: ['ada'] }),
    only(['ada'], 'The harvest came in all at once and it is more than the barn will hold. This is the year', 9, ['harvest', 'farming', 'pleasant', 'dream']),
  ],
  onStart(ctx, ev) {
    ev.data.prices = { turnip: 0.8, potato: 0.8, corn: 0.8, tomato: 0.8, pumpkin: 0.85, wheat: 0.8, cabbage: 0.8 };
    const ada = v_(ctx, 'ada');
    const crop = ctx.time.season === 'autumn' ? 'pumpkin' : 'corn';
    if (ada) { ctx.sim.give(ada, { id: crop, qty: 6 }); ctx.sim.give(ada, { id: 'potato', qty: 6 }); adjustNeeds(ada, { purpose: 40 }); nudgeMood(ada, 0.4); setStatus(ada, 'celebrating', true); }
    for (const v of ctx.sim.villagers) if (v.id !== 'ada') { ctx.sim.give(v, { id: 'potato', qty: 2 }); ctx.sim.adjustRelationship(v, 'ada', { affinity: 4, trust: 2 }, 'shared the harvest'); }
    ctx.schedule('stew_night', minuteAt(dayOf(ctx), 19), { name: 'Harvest supper at the Drowsy Owl', host: 'ada' }, 'Harvest supper');
    chronicle(ctx.sim, 'A bumper harvest at the farm. Ada is handing out potatoes to anyone who walks past.', 7, ['ada'], 'farm');
  },
  onEnd(ctx) { const ada = v_(ctx, 'ada'); if (ada) setStatus(ada, 'celebrating', false); },
};

const cold: EventDef = {
  id: 'cold', name: 'A Cold Going Around', kind: 'calamity', rarity: 'common', drama: 5,
  description: 'Two or three villagers come down with it. Elin does not sleep; tonics are wanted.',
  when: { kind: 'random', perDay: 0.06, hours: [7, 10] }, durationMin: 2 * 1440 - 360, cooldownDays: 9,
  announce: (ctx, ev) => {
    const sick = (ev.data.sick as VillagerId[]).map((id) => ctx.name(id));
    return [
      everyone(`There is a cold going round: ${listNames(sick)} are down with it and ${ctx.name('elin')} is run off her feet`, 5, ['cold', 'sick', 'news'], { about: [...(ev.data.sick as VillagerId[]), 'elin'] }),
      only(['elin'], `${listNames(sick)} all with the same cold. Elin will not get to bed before midnight`, 7, ['cold', 'sick', 'medicine', 'plan', 'unpleasant'], { about: ev.data.sick as VillagerId[] }),
    ];
  },
  onStart(ctx, ev) {
    const pool = ctx.sim.villagers.filter((v) => v.id !== 'elin' && !v.status.includes('sick'));
    const scored = pool.map((v) => ({ v, s: (v.status.includes('wet') ? 2 : 0) + (v.needs.comfort < 40 ? 1.5 : 0) + v.personality.neuroticism + ctx.rng.next() * 2 })).sort((a, b) => b.s - a.s);
    const sick = scored.slice(0, ctx.rng.int(2, 3)).map((x) => x.v);
    ev.data.sick = sick.map((v) => v.id);
    for (const v of sick) {
      makeSick(v, 1);
      remember(ctx.sim, v, `${first(v)} has caught the cold that is going round: head like a bucket, no strength for anything`, 6, ['cold', 'sick', 'unpleasant']);
      addGoal(v, 'see Elin about this cold', 8, ctx.now);
      const r = ctx.sim.postRequest(v.id, 'a herbal tonic for this wretched cold', { money: Math.round(item('tonic').price * 1.5) + ctx.rng.int(0, 8) }, [{ id: 'tonic', qty: 1 }]);
      r.expiresAt = ctx.now + 2 * 1440;
    }
    const elin = v_(ctx, 'elin');
    if (elin) { addGoal(elin, `treat ${listNames(sick.map(first))} for the cold`, 9, ctx.now); ctx.sim.give(elin, { id: 'tonic', qty: 2 }); if (!isAsleep(ctx.sim, elin)) ctx.sim.interrupt(elin, 'patients: a cold is going round'); }
  },
  onHour(ctx, ev, hour) {
    if (hour === 12 && ev.data.spread !== true && ctx.rng.chance(0.5)) {
      ev.data.spread = true;
      const sick = ev.data.sick as VillagerId[];
      const pool = ctx.sim.villagers.filter((v) => v.id !== 'elin' && !sick.includes(v.id) && !v.status.includes('sick'));
      if (pool.length) { const v = ctx.rng.pick(pool); makeSick(v, 0.6); sick.push(v.id); remember(ctx.sim, v, `${first(v)} has caught the cold too. Of course`, 5, ['cold', 'sick', 'unpleasant']); addGoal(v, 'see Elin about this cold', 7, ctx.now); chronicle(ctx.sim, `${first(v)} has come down with the cold as well.`, 4, [v.id]); }
    }
  },
  onEnd(ctx, ev) {
    const sick = (ev.data.sick as VillagerId[]).map((id) => v_(ctx, id)).filter((v): v is Villager => !!v);
    for (const v of sick) { if (v.health < 72) recover(v, 76); completeGoals(v, 'see Elin about this cold'); remember(ctx.sim, v, `${first(v)} is over the cold. Elin's tonic, or time, or both`, 4, ['cold', 'pleasant'], ['elin']); ctx.sim.adjustRelationship(v, 'elin', { affinity: 3, trust: 4 }, 'saw me through the cold'); }
    const elin = v_(ctx, 'elin'); if (elin) { completeGoals(elin, 'treat '); remember(ctx.sim, elin, 'The cold has run its course. Nobody died, which is Elin\'s definition of a good week', 6, ['cold', 'medicine', 'pleasant']); adjustNeeds(elin, { purpose: 25 }); }
    chronicle(ctx.sim, 'The cold has passed through the village.', 4, ['elin']);
  },
};

const broken_bridge: EventDef = {
  id: 'broken_bridge', name: 'The Bridge is Out', kind: 'calamity', rarity: 'uncommon', drama: 6, place: 'bridge_west',
  description: 'The main-road bridge has lost its planks to the river. The farm is a long way round until Jory fixes it.',
  when: { kind: 'random', perDay: 0.04, hours: [6, 9] }, durationMin: 1440 - 120, cooldownDays: 15,
  canFire: (ctx) => !!ctx.world.place('bridge_west') && !!(ctx.world as unknown as { grid?: unknown }).grid,
  announce: (ctx) => [
    everyone(`The river took the planks off the main bridge in the night; it is the south bridge or nothing until ${ctx.name('jory')} gets to it`, 5, ['bridge', 'river', 'unpleasant'], { about: ['jory'] }),
    only(['jory'], 'The bridge is out and every single person in the village has told Jory about it already', 7, ['bridge', 'crafting', 'plan', 'unpleasant']),
    only(['ada'], 'The bridge is out. Getting the cart to market means the long way round by the lake', 6, ['bridge', 'farming', 'unpleasant']),
  ],
  onStart(ctx, ev) {
    const p = ctx.world.place('bridge_west');
    if (!p) return;
    const tiles = p.tiles;
    const saved = blockTiles(ctx.world, tiles);
    ev.data.tiles = tiles.map((t) => ({ ...t })); ev.data.saved = saved ?? [];
    const jory = v_(ctx, 'jory');
    if (jory) { addGoal(jory, 'rebuild the main bridge', 9, ctx.now); const r = ctx.sim.postRequest('jory', '6 wood and 2 nails to rebuild the bridge', { money: Math.round((item('wood').price * 6 + item('nails').price * 2) * 1.5) + 15 }, [{ id: 'wood', qty: 6 }, { id: 'nails', qty: 2 }]); r.expiresAt = ctx.now + 2 * 1440; ev.data.request = r.id; }
    for (const v of ctx.sim.villagers) if (!v.inside && Math.abs(v.pos.x - p.anchor.x) < 2 && Math.abs(v.pos.y - p.anchor.y) < 2) v.pos = ctx.world.nearestWalkable({ x: p.anchor.x - 3, y: p.anchor.y }, 6);
  },
  onLoad(ctx, ev) {
    const tiles = (ev.data.tiles as { x: number; y: number }[]) ?? [];
    const saved = blockTiles(ctx.world, tiles);
    if (saved) ev.data.saved = saved;
  },
  onEnd(ctx, ev) {
    const tiles = (ev.data.tiles as { x: number; y: number }[]) ?? [];
    restoreTiles(ctx.world, tiles, (ev.data.saved as number[]) ?? []);
    const jory = v_(ctx, 'jory');
    if (jory) { completeGoals(jory, 'rebuild the main bridge'); remember(ctx.sim, jory, 'Jory rebuilt the bridge. New planks, good nails, and he carved a little fish into the rail', 7, ['bridge', 'crafting', 'pleasant']); adjustNeeds(jory, { purpose: 30 }); for (const v of ctx.sim.villagers) if (v.id !== 'jory') ctx.sim.adjustRelationship(v, 'jory', { affinity: 4, trust: 3 }, 'rebuilt the bridge'); }
    chronicle(ctx.sim, 'The main bridge is open again. Jory carved a fish into the rail.', 5, ['jory'], 'bridge_west');
  },
};

const DOG_NAMES = ['Biscuit', 'Nettle', 'Patch', 'Sorrel', 'Tam', 'Widget'];

const stray_dog: EventDef = {
  id: 'stray_dog', name: 'A Stray Dog', kind: 'social', rarity: 'uncommon', drama: 4,
  description: 'A thin dog turns up at someone\'s door, and stays. It will dig something up eventually.',
  when: { kind: 'random', perDay: 0.045, hours: [7, 18] }, durationMin: 1440, cooldownDays: 30,
  canFire: (ctx) => ctx.sim.villagers.some((v) => !v.stats.dog),
  announce: (ctx, ev) => {
    const o = ev.data.owner as VillagerId, dog = ev.data.dog as string;
    return [
      only([o], `A stray dog followed ${ctx.name(o)} home and would not leave. ${ctx.name(o)} has named it ${dog}, which settles it`, 7, ['dog', 'pleasant', 'home']),
      everyone((v) => v.id === o ? '' : `${ctx.name(o)} has taken in a stray dog and calls it ${dog}`, 4, ['dog', 'news'], { about: [o] }),
    ];
  },
  onStart(ctx, ev, opts) {
    const pool = ctx.sim.villagers.filter((v) => !v.stats.dog);
    const pick = typeof opts.villager === 'string' ? pool.find((v) => v.id === opts.villager) : undefined;
    const scored = pool.map((v) => ({ v, s: v.personality.agreeableness + (hasTrait(v, 'generous') || hasTrait(v, 'kind') || hasTrait(v, 'loner') || hasTrait(v, 'sentimental') ? 0.6 : 0) + ctx.rng.next() })).sort((a, b) => b.s - a.s);
    const owner = pick ?? scored[0]?.v;
    if (!owner) return;
    const dog = ctx.rng.pick(DOG_NAMES);
    owner.stats.dog = 1;
    ev.data.owner = owner.id; ev.data.dog = dog; ev.name = `${dog} adopts ${first(owner)}`;
    ev.data.pet = { name: dog, owner: owner.id };
    adjustNeeds(owner, { fun: 15, comfort: 10, social: 8 }); nudgeMood(owner, 0.25);
    addGoal(owner, `feed ${dog}`, 4, ctx.now);
    ctx.schedule('dog_digs', minuteAt(dayOf(ctx) + 2, 9 + ctx.rng.int(0, 6)), { owner: owner.id, dog });
    chronicle(ctx.sim, `A stray dog has adopted ${first(owner)}. Its name is ${dog} now.`, 4, [owner.id]);
  },
  onEnd() {},
};

const dog_digs: EventDef = {
  id: 'dog_digs', name: 'The Dog Digs Something Up', kind: 'mystery', rarity: 'rare', drama: 4,
  description: 'The dog comes back muddy with something in its mouth.',
  when: { kind: 'manual' }, durationMin: 30, cooldownDays: 0,
  canFire: (ctx) => ctx.sim.villagers.some((v) => v.stats.dog),
  announce: () => [],
  onStart(ctx, ev, opts) {
    const owner = (typeof opts.owner === 'string' ? v_(ctx, opts.owner) : undefined) ?? ctx.sim.villagers.find((v) => v.stats.dog);
    if (!owner) return;
    const dog = typeof opts.dog === 'string' ? opts.dog : 'the dog';
    const find = ctx.rng.pick<ItemId>(['horseshoe', 'map_fragment', 'horseshoe', 'pearl', 'gem', 'toy_boat']);
    ctx.sim.give(owner, { id: find, qty: 1 });
    ev.data.owner = owner.id; ev.data.item = find;
    remember(ctx.sim, owner, `${dog} came back covered in mud with ${item(find).name.toLowerCase()} in its mouth. Where on earth did it dig that up?`, 6, ['dog', 'found', find, 'pleasant', 'mystery']);
    if (find === 'map_fragment') { const ines = v_(ctx, 'ines'); if (ines && ines.id !== owner.id) remember(ctx.sim, owner, `${first(owner)} should show the map piece to Ines; she collects that sort of thing`, 5, ['map', 'mystery', 'plan'], ['ines']); }
    chronicle(ctx.sim, `${first(owner)}'s dog ${dog} dug up ${item(find).name.toLowerCase()} somewhere.`, 4, [owner.id]);
  },
  onEnd() {},
};

const HEIRLOOMS: { owner: VillagerId; item: ItemId; what: string }[] = [
  { owner: 'greta', item: 'horseshoe', what: 'her grandmother\'s lucky horseshoe' },
  { owner: 'ines', item: 'map_fragment', what: 'the old map fragment from the library' },
  { owner: 'ines', item: 'poetry', what: 'her mother\'s book of poems' },
  { owner: 'jory', item: 'toy_boat', what: 'the first boat he ever carved' },
  { owner: 'bram', item: 'horseshoe', what: 'the horseshoe from his master\'s forge' },
  { owner: 'dov', item: 'tea', what: 'the tin of tea his father left him' },
  { owner: 'cerys', item: 'pie_tin', what: 'her grandmother\'s pie tin' },
];
const HIDING = ['orchard', 'meadow', 'hill', 'dock', 'graveyard', 'tavern'];

const heirloom: EventDef = {
  id: 'heirloom', name: 'The Lost Heirloom', kind: 'mystery', rarity: 'uncommon', drama: 6,
  description: 'Something precious goes missing. Clues in three people\'s memories; whoever brings it back earns real trust.',
  when: { kind: 'random', perDay: 0.045, hours: [8, 12] }, durationMin: 2 * 1440 - 300, cooldownDays: 15,
  canFire: (ctx) => HEIRLOOMS.some((h) => { const v = v_(ctx, h.owner); return v && ctx.sim.has(v, h.item, 1); }),
  announce: (ctx, ev) => {
    const o = ev.data.owner as VillagerId, what = ev.data.what as string, clues = ev.data.clues as VillagerId[], where = ev.data.where as string;
    const seen = clues.slice(0, 2), heard = clues.slice(2);
    return [
      only([o], `${ctx.name(o)}'s ${what} is gone. Not mislaid — gone. Somebody has it`, 8, ['heirloom', 'lost', 'unpleasant', 'mystery', 'plan']),
      everyone((v) => v.id === o ? '' : `${ctx.name(o)} has lost ${what} and is asking everyone about it`, 4, ['heirloom', 'lost', 'news', 'mystery'], { about: [o] }),
      only(seen, (v) => `${first(v)} remembers seeing something glint near the ${ctx.world.place(where)?.name.toLowerCase() ?? where} the other evening, and someone walking off towards the store`, 6, ['heirloom', 'clue', 'mystery'], { about: [o] }),
      only(heard, `${ctx.name('hal')} took something in trade yesterday that he was very quiet about`, 6, ['heirloom', 'clue', 'mystery'], { about: ['hal', o] }),
    ];
  },
  onStart(ctx, ev) {
    const options = HEIRLOOMS.filter((h) => { const v = v_(ctx, h.owner); return v && ctx.sim.has(v, h.item, 1); });
    const h = ctx.rng.pick(options);
    const owner = v_(ctx, h.owner)!;
    ctx.sim.take(owner, { id: h.item, qty: 1 });
    addToShop(ctx.sim, 'store', h.item, 1);
    const clues = ctx.rng.shuffle(others(ctx, h.owner, 'hal').map((v) => v.id)).slice(0, 3);
    const where = ctx.rng.pick(HIDING);
    Object.assign(ev.data, { owner: h.owner, item: h.item, what: h.what, clues, where, atStore: true });
    ev.name = `${first(owner)}'s lost ${item(h.item).name.toLowerCase()}`;
    nudgeMood(owner, -0.3); adjustNeeds(owner, { comfort: -10 });
    addGoal(owner, `find ${h.what}`, 9, ctx.now);
    const r = ctx.sim.postRequest(h.owner, `find ${h.what} — ${item(h.item).name.toLowerCase()}, gone missing`, { money: Math.round(item(h.item).price * 1.5) + 40 }, [{ id: h.item, qty: 1 }]);
    r.expiresAt = ctx.now + 2 * 1440; ev.data.request = r.id;
    const hal = v_(ctx, 'hal'); if (hal) remember(ctx.sim, hal, `Someone traded Hal ${item(h.item).name.toLowerCase()} yesterday for far less than it was worth. Best not to ask`, 5, ['heirloom', 'trade', 'money', 'secret'], [h.owner]);
    chronicle(ctx.sim, `${first(owner)}'s ${h.what} has gone missing.`, 6, [h.owner]);
  },
  onHour(ctx, ev, hour) {
    if (ev.data.resolved) return;
    const req = ctx.sim.requests.find((r) => r.id === ev.data.request);
    if (req?.done) { ev.data.resolved = true; ev.data.by = req.acceptedBy; ev.endsAt = Math.min(ev.endsAt, ctx.now + 30); return; }
    const owner = v_(ctx, String(ev.data.owner)); const it = String(ev.data.item);
    if (owner && ctx.sim.has(owner, it, 1)) { ev.data.resolved = true; ev.endsAt = Math.min(ev.endsAt, ctx.now + 30); return; }
    const age = ctx.now - ev.startedAt;
    if (age > 6 * 60 && hour >= 9 && hour <= 21 && ctx.rng.chance(0.16)) {
      const clues = ev.data.clues as VillagerId[];
      const awakeClues = clues.map((id) => v_(ctx, id)).filter((v): v is Villager => !!v && !isAsleep(ctx.sim, v));
      if (awakeClues.length && owner) resolveHeirloom(ctx, ev, ctx.rng.pick(awakeClues), owner);
    }
  },
  onEnd(ctx, ev) {
    const owner = v_(ctx, String(ev.data.owner));
    if (!owner) return;
    if (!ev.data.resolved) { const hal = v_(ctx, 'hal'); if (hal) resolveHeirloom(ctx, ev, hal, owner); }
    else if (ev.data.by === 'player') { remember(ctx.sim, owner, `${ctx.sim.player.name} brought back ${ev.data.what}. ${first(owner)} will not forget that`, 9, ['heirloom', 'found', 'pleasant', 'trust', 'player'], ['player']); ctx.sim.adjustRelationship(owner, 'player', { affinity: 12, trust: 18 }, 'returned the heirloom'); chronicle(ctx.sim, `${ctx.sim.player.name} found ${first(owner)}'s ${ev.data.what}.`, 7, [owner.id]); }
    completeGoals(owner, 'find ');
    const req = ctx.sim.requests.find((r) => r.id === ev.data.request); if (req && !req.done) req.expiresAt = Math.min(req.expiresAt, ctx.now);
  },
};

function resolveHeirloom(ctx: EventCtx, ev: ActiveEvent, finder: Villager, owner: Villager): void {
  const it = String(ev.data.item), what = String(ev.data.what);
  if (ev.data.atStore) { if (stockOfShop(ctx.sim, 'store', it) > 0) removeFromShop(ctx.sim, 'store', it); ev.data.atStore = false; }
  ctx.sim.give(owner, { id: it, qty: 1 });
  ev.data.resolved = true; ev.data.by = finder.id;
  ev.endsAt = Math.min(ev.endsAt, ctx.now + 30);
  const viaHal = finder.id === 'hal';
  remember(ctx.sim, finder, viaHal ? `Hal found ${what} on his own shelf, and gave it back to ${first(owner)} without being asked. He did not enjoy it` : `${first(finder)} found ${what} at the store and bought it back for ${first(owner)}`, 8, ['heirloom', 'found', 'pleasant', 'mystery'], [owner.id]);
  remember(ctx.sim, owner, `${first(finder)} brought back ${what}. ${first(owner)} nearly cried, and will deny it`, 9, ['heirloom', 'found', 'pleasant', 'trust'], [finder.id]);
  ctx.sim.adjustRelationship(owner, finder.id, { affinity: 12, trust: 18, familiarity: 4 }, 'returned the heirloom');
  ctx.sim.adjustRelationship(finder, owner.id, { affinity: 4, familiarity: 3 });
  for (const v of ctx.sim.villagers) if (v.id !== finder.id && v.id !== owner.id) remember(ctx.sim, v, `${first(finder)} found ${first(owner)}'s ${what}${viaHal ? ' — it had been on Hal\'s shelf all along' : ''}`, 5, ['heirloom', 'found', 'news'], [finder.id, owner.id]);
  const req = ctx.sim.requests.find((r) => r.id === ev.data.request); if (req && !req.done) { req.done = true; req.acceptedBy = req.acceptedBy ?? finder.id; }
  chronicle(ctx.sim, `${first(finder)} found ${first(owner)}'s ${what}${viaHal ? '. It had been at the store the whole time.' : ' at the General Store and brought it back.'}`, 7, [finder.id, owner.id]);
  ctx.sim.emote(owner, 'happy');
}

/* ================================================================== social */

const birthday: EventDef = {
  id: 'birthday', name: 'Birthday', kind: 'social', rarity: 'common', drama: 5, place: 'tavern',
  description: 'Someone\'s birthday: friends bring gifts, and there is a gathering at the Drowsy Owl in the evening.',
  when: { kind: 'calendar', hour: 18 }, durationMin: 210, cooldownDays: 0,
  announce: (ctx, ev) => {
    const who = ev.data.villager as VillagerId;
    return [awake((v) => v.id === who ? '' : `${ctx.name(who)}'s birthday gathering at the Drowsy Owl this evening`, 5, ['birthday', 'social', 'tavern', 'plan'], { about: [who] })];
  },
  onStart(ctx, ev, opts) {
    const t = ctx.time;
    const today = ctx.sim.villagers.find((v) => v.birthday.season === t.season && v.birthday.day === t.day);
    const who = (typeof opts.villager === 'string' ? v_(ctx, opts.villager) : undefined) ?? today ?? soonestBirthday(ctx);
    if (!who) return;
    ev.data.villager = who.id; ev.name = `${first(who)}'s birthday`;
    setStatus(who, 'celebrating', true);
    const friends = others(ctx, who.id).filter((v) => (v.relationships[who.id]?.affinity ?? 0) > 10);
    const gifts: string[] = [];
    for (const f of friends) {
      if (!ctx.rng.chance(0.65)) continue;
      const g = giftable(f, who);
      if (g && giveGift(ctx, f, who, g, `for ${first(who)}'s birthday`)) gifts.push(first(f));
    }
    ev.data.gifts = gifts;
    remember(ctx.sim, who, gifts.length ? `${first(who)}'s birthday: ${listNames(gifts)} brought gifts, and everyone came to the Owl` : `${first(who)}'s birthday. Nobody brought a gift, but the Owl was warm`, gifts.length ? 7 : 5, ['birthday', 'social', gifts.length ? 'pleasant' : 'unpleasant'], friends.map((f) => f.id), 'tavern');
    gather(ctx, ev, friends, `${first(who)}'s birthday gathering at the tavern`, `go to ${first(who)}'s birthday gathering at the Drowsy Owl`, 7);
    if (!isAsleep(ctx.sim, who) && !isWorking(who, t)) ctx.sim.interrupt(who, 'it is your birthday — people are gathering at the tavern');
    addGoal(who, 'enjoy the birthday gathering at the tavern', 8, ctx.now);
    chronicle(ctx.sim, `${first(who)}'s birthday${gifts.length ? ` — gifts from ${listNames(gifts)}` : ''}. Gathering at the Owl tonight.`, 5, [who.id, ...friends.map((f) => f.id)], 'tavern');
  },
  onEnd(ctx, ev) {
    const who = v_(ctx, String(ev.data.villager)); if (!who) return;
    const there = villagersAt(ctx.sim, 'tavern', 3).filter((v) => v.id !== who.id);
    for (const v of there) { adjustNeeds(v, { fun: 12, social: 15 }); ctx.sim.adjustRelationship(v, who.id, { affinity: 2, familiarity: 2 }); ctx.sim.adjustRelationship(who, v.id, { affinity: 3, familiarity: 2 }, 'came to my birthday'); }
    if (there.length) remember(ctx.sim, who, `${listNames(there.map(first))} stayed late at the Owl for ${first(who)}'s birthday`, 6, ['birthday', 'social', 'pleasant'], there.map((v) => v.id), 'tavern');
    setStatus(who, 'celebrating', false);
  },
};

function soonestBirthday(ctx: EventCtx): Villager | undefined {
  const order = ['spring', 'summer', 'autumn', 'winter'];
  const t = ctx.time;
  const today = order.indexOf(t.season) * 28 + t.day;
  let best: Villager | undefined, bd = Infinity;
  for (const v of ctx.sim.villagers) { let d = order.indexOf(v.birthday.season) * 28 + v.birthday.day - today; if (d < 0) d += 112; if (d < bd) { bd = d; best = v; } }
  return best;
}

const proposal: EventDef = {
  id: 'proposal', name: 'A Proposal', kind: 'social', rarity: 'legendary', drama: 10,
  description: 'When two hearts are sure enough, one of them asks. A wedding follows in two days.',
  when: { kind: 'trigger', check: (ctx) => romanceCandidates(ctx.sim, 60, 55).length > 0 && ctx.time.hour >= 17 && ctx.time.hour <= 21 }, durationMin: 45, cooldownDays: 30,
  canFire: (ctx, opts) => { if (opts && typeof opts.a === 'string' && typeof opts.b === 'string') { const a = v_(ctx, opts.a), b = v_(ctx, opts.b); return !!a && !!b && a.relationships[b.id]?.label !== 'partner'; } return romanceCandidates(ctx.sim, 25, 20).length > 0; },
  announce: (ctx, ev) => {
    const a = ev.data.a as VillagerId, b = ev.data.b as VillagerId;
    return [everyone((v) => v.id === a || v.id === b ? '' : `Word is ${ctx.name(a)} and ${ctx.name(b)} are to be married — ${ctx.name(a)} asked, and ${ctx.name(b)} said yes`, 7, ['proposal', 'romance', 'gossip', 'news', 'pleasant'], { about: [a, b] })];
  },
  onStart(ctx, ev, opts) {
    let a: Villager | undefined, b: Villager | undefined;
    if (typeof opts.a === 'string' && typeof opts.b === 'string') { a = v_(ctx, opts.a); b = v_(ctx, opts.b); }
    if (!a || !b) { const c = romanceCandidates(ctx.sim, 60, 55)[0] ?? romanceCandidates(ctx.sim, 25, 20)[0]; if (!c) return; a = c.a; b = c.b; }
    if ((b.relationships[a.id]?.romance ?? 0) > (a.relationships[b.id]?.romance ?? 0)) [a, b] = [b, a];
    ev.data.a = a.id; ev.data.b = b.id; ev.name = `${first(a)} proposes to ${first(b)}`;
    ctx.sim.adjustRelationship(a, b.id, { affinity: 20, trust: 15, romance: 30, familiarity: 10 }, 'proposed — yes!');
    ctx.sim.adjustRelationship(b, a.id, { affinity: 20, trust: 15, romance: 30, familiarity: 10 }, 'said yes to a proposal');
    a.relationships[b.id].label = 'partner'; b.relationships[a.id].label = 'partner';
    setStatus(a, 'celebrating', true); setStatus(b, 'celebrating', true); setStatus(a, 'inLove', true); setStatus(b, 'inLove', true);
    remember(ctx.sim, a, `${first(a)} proposed to ${first(b)} and ${first(b)} said yes. They are to be married`, 10, ['proposal', 'romance', 'pleasant', 'social'], [b.id]);
    remember(ctx.sim, b, `${first(a)} proposed and ${first(b)} said yes. Partners now — and a wedding to plan`, 10, ['proposal', 'romance', 'pleasant', 'social'], [a.id]);
    ctx.sim.say(a, ctx.rng.pick([`${first(b)}, be with me. Properly.`, `I am no good at speeches, ${first(b)}. Say yes?`, `${first(b)} — marry me.`]), b.id, 'warm');
    ctx.sim.say(b, ctx.rng.pick(['Yes. Obviously yes.', 'You took your time. Yes.', 'Yes — and you are telling Cerys, not me.']), a.id, 'warm');
    ctx.sim.emote(a, 'love'); ctx.sim.emote(b, 'love');
    const day = dayOf(ctx) + 2;
    ctx.schedule('wedding', minuteAt(day, 11), { a: a.id, b: b.id }, `Wedding of ${first(a)} and ${first(b)}`);
    const cerys = v_(ctx, 'cerys'); if (cerys && cerys.id !== a.id && cerys.id !== b.id) { addGoal(cerys, `bake the wedding cake for ${first(a)} and ${first(b)}`, 8, ctx.now); }
    chronicle(ctx.sim, `${first(a)} proposed to ${first(b)} — and ${first(b)} said yes. Pebblebrook has a wedding to plan.`, 10, [a.id, b.id]);
  },
  onEnd() {},
};

const wedding: EventDef = {
  id: 'wedding', name: 'A Wedding', kind: 'festival', rarity: 'legendary', drama: 10, place: 'chapel',
  description: 'A ceremony at the chapel and a party at the tavern. Everyone comes; everyone remembers.',
  when: { kind: 'manual' }, durationMin: 150, cooldownDays: 0,
  canFire: (ctx, opts) => { if (opts && typeof opts.a === 'string' && typeof opts.b === 'string') return !!v_(ctx, opts.a) && !!v_(ctx, opts.b); return ctx.sim.villagers.some((v) => Object.values(v.relationships).some((r) => r.label === 'partner')); },
  announce: (ctx, ev) => {
    const a = ev.data.a as VillagerId, b = ev.data.b as VillagerId;
    return [everyone(`${ctx.name(a)} and ${ctx.name(b)} were married at the chapel today; the whole village was there`, 9, ['wedding', 'romance', 'festival', 'pleasant', 'social'], { about: [a, b], place: 'chapel' })];
  },
  onStart(ctx, ev, opts) {
    let a: Villager | undefined, b: Villager | undefined;
    if (typeof opts.a === 'string' && typeof opts.b === 'string') { a = v_(ctx, opts.a); b = v_(ctx, opts.b); }
    if (!a || !b) { for (const v of ctx.sim.villagers) { const p = Object.entries(v.relationships).find(([, r]) => r.label === 'partner'); if (p) { a = v; b = v_(ctx, p[0]); break; } } }
    if (!a || !b) return;
    ev.data.a = a.id; ev.data.b = b.id; ev.name = `Wedding of ${first(a)} and ${first(b)}`;
    ev.text = `${first(a)} and ${first(b)} are being married at the chapel at 11:00, with a party at the Drowsy Owl after.`;
    for (const v of [a, b]) { setStatus(v, 'celebrating', true); adjustNeeds(v, { fun: 30, social: 30, purpose: 30 }); nudgeMood(v, 0.5); }
    gather(ctx, ev, others(ctx, a.id, b.id), `the wedding of ${first(a)} and ${first(b)} is starting at the chapel`, `go to the wedding of ${first(a)} and ${first(b)} at the chapel`, 10, true);
    gather(ctx, ev, [a, b], 'your wedding is starting', 'get to the chapel — it is your wedding', 10, true);
    ctx.schedule('stew_night', ev.endsAt + 10, { name: `Wedding party for ${first(a)} and ${first(b)}`, host: 'finn', wedding: [a.id, b.id] }, 'Wedding party');
    chronicle(ctx.sim, `Bells at the chapel: ${first(a)} and ${first(b)} are being married.`, 10, [a.id, b.id], 'chapel');
  },
  onEnd(ctx, ev) {
    const a = v_(ctx, String(ev.data.a)), b = v_(ctx, String(ev.data.b));
    if (!a || !b) return;
    const there = villagersAt(ctx.sim, 'chapel', 5).filter((v) => v.id !== a.id && v.id !== b.id);
    for (const v of ctx.sim.villagers) if (v.id !== a.id && v.id !== b.id) { ctx.sim.adjustRelationship(v, a.id, { affinity: 3, familiarity: 2 }); ctx.sim.adjustRelationship(v, b.id, { affinity: 3, familiarity: 2 }); if (there.includes(v)) { adjustNeeds(v, { fun: 15, social: 15 }); if (hasTrait(v, 'romantic')) nudgeMood(v, 0.3); } }
    remember(ctx.sim, a, `${first(a)} married ${first(b)} at the chapel. ${there.length ? listNames(there.map(first)) + ' were there' : 'Nobody came, which they will laugh about later'}`, 10, ['wedding', 'romance', 'pleasant'], [b.id, ...there.map((v) => v.id)], 'chapel');
    remember(ctx.sim, b, `${first(b)} married ${first(a)} at the chapel. ${there.length ? listNames(there.map(first)) + ' were there' : 'Just the two of them, in the end'}`, 10, ['wedding', 'romance', 'pleasant'], [a.id, ...there.map((v) => v.id)], 'chapel');
    a.relationships[b.id].label = 'partner'; b.relationships[a.id].label = 'partner';
    chronicle(ctx.sim, `${first(a)} and ${first(b)} are married. ${there.length ? listNames(there.map(first)) + ' threw petals.' : ''} The party moves to the Owl.`, 10, [a.id, b.id], 'chapel');
  },
};

const stew_night: EventDef = {
  id: 'stew_night', name: 'Supper at the Drowsy Owl', kind: 'social', rarity: 'common', drama: 4, place: 'tavern',
  description: 'A supper at the tavern: a full table, Finn pouring, and whatever the occasion is.',
  when: { kind: 'manual' }, durationMin: 150, cooldownDays: 0,
  announce: (ctx, ev) => [awake(`${ev.name} tonight — ${ctx.name(String(ev.data.host ?? 'finn'))} is putting it on`, 5, ['supper', 'tavern', 'social', 'plan'], { about: [String(ev.data.host ?? 'finn')] })],
  onStart(ctx, ev, opts) {
    ev.name = typeof opts.name === 'string' ? opts.name : 'Supper at the Drowsy Owl';
    ev.data.host = typeof opts.host === 'string' ? opts.host : 'finn';
    ev.text = `${ev.name}: everyone welcome at the tavern from ${ctx.time.hour}:00.`;
    if (Array.isArray(opts.wedding)) ev.data.wedding = opts.wedding;
    gather(ctx, ev, ctx.sim.villagers, `${ev.name} is starting at the tavern`, `go to ${ev.name.toLowerCase()}`, 8, Array.isArray(opts.wedding));
  },
  onEnd(ctx, ev) {
    const there = villagersAt(ctx.sim, 'tavern', 3);
    for (const v of there) { adjustNeeds(v, { hunger: 35, fun: 15, social: 18 }); remember(ctx.sim, v, `${first(v)} was at ${ev.name.toLowerCase()}${there.length > 1 ? ' with ' + listNames(there.filter((o) => o.id !== v.id).map(first)) : ''}`, 5, ['supper', 'tavern', 'social', 'pleasant'], there.filter((o) => o.id !== v.id).map((o) => o.id), 'tavern'); }
    for (let i = 0; i < there.length; i++) for (let j = i + 1; j < there.length; j++) { ctx.sim.adjustRelationship(there[i], there[j].id, { affinity: 1.5, familiarity: 2 }); ctx.sim.adjustRelationship(there[j], there[i].id, { affinity: 1.5, familiarity: 2 }); }
    const finn = v_(ctx, 'finn'); if (finn) finn.money += 6 * there.length;
    if (there.length) chronicle(ctx.sim, `${ev.name}: ${listNames(there.map(first))} ate and drank until late.`, 4, there.map((v) => v.id), 'tavern');
  },
};

const CANDIDATE_POOL: VillagerId[] = ['hal', 'finn', 'ada', 'greta', 'cerys', 'bram'];

const mayor_race: EventDef = {
  id: 'mayor_race', name: 'Race for Mayor', kind: 'social', rarity: 'rare', drama: 7, place: 'square',
  description: 'Two villagers want the mayor\'s chain. A day of campaigning, sides taken, and a vote on the square.',
  when: { kind: 'random', perDay: 0.03, hours: [9, 11] }, durationMin: 1440 + 420, cooldownDays: 40, exclusive: ['merchant', 'market_day'],
  announce: (ctx, ev) => {
    const [a, b] = ev.data.candidates as VillagerId[];
    return [everyone((v) => v.id === a || v.id === b ? '' : `${ctx.name(a)} and ${ctx.name(b)} are both standing for mayor; the vote is on the square tomorrow at three`, 6, ['mayor', 'politics', 'news', 'plan'], { about: [a, b] })];
  },
  onStart(ctx, ev) {
    const pool = CANDIDATE_POOL.map((id) => v_(ctx, id)).filter((v): v is Villager => !!v);
    const cands = ctx.rng.shuffle([...pool]).slice(0, 2);
    if (cands.length < 2) return;
    const [a, b] = cands;
    ev.data.candidates = [a.id, b.id]; ev.data.voteDay = dayOf(ctx) + 1; ev.name = `${first(a)} v ${first(b)} for mayor`;
    ev.text = `${first(a)} and ${first(b)} are standing for mayor. Vote on the square tomorrow at 15:00.`;
    for (const c of cands) { remember(ctx.sim, c, `${first(c)} is standing for mayor against ${first(c.id === a.id ? b : a)}. Handshakes all day`, 8, ['mayor', 'politics', 'plan', 'dream'], [c.id === a.id ? b.id : a.id]); addGoal(c, 'talk to everyone before the vote', 8, ctx.now); adjustNeeds(c, { purpose: 20 }); }
    const sides: Record<VillagerId, VillagerId> = {};
    for (const v of others(ctx, a.id, b.id)) {
      const fa = v.relationships[a.id]?.affinity ?? 0, fb = v.relationships[b.id]?.affinity ?? 0;
      const side = fa === fb ? ctx.rng.pick([a, b]) : fa > fb ? a : b;
      sides[v.id] = side.id;
      const other = side.id === a.id ? b : a;
      remember(ctx.sim, v, `${first(v)} is for ${first(side)} for mayor. ${first(other)} would be a disaster`, 5, ['mayor', 'politics', 'side'], [side.id, other.id]);
      ctx.sim.adjustRelationship(v, side.id, { affinity: 2 }); ctx.sim.adjustRelationship(v, other.id, { affinity: -2 });
    }
    ev.data.sides = sides;
    chronicle(ctx.sim, `${first(a)} and ${first(b)} are both standing for mayor. The vote is tomorrow on the square.`, 7, [a.id, b.id], 'square');
  },
  onHour(ctx, ev, hour) {
    if (ev.data.voted || ev.data.voteDay !== ctx.time.dayIndex) return;
    if (hour === 14) { gather(ctx, ev, ctx.sim.villagers, 'the vote for mayor is at three on the square', 'go to the square for the mayor vote', 9, true); return; }
    if (hour !== 15) return;
    ev.data.voted = true;
    const [aId, bId] = ev.data.candidates as VillagerId[];
    const a = v_(ctx, aId), b = v_(ctx, bId);
    if (!a || !b) return;
    const sides = ev.data.sides as Record<VillagerId, VillagerId>;
    let va = 1, vb = 1;
    for (const [id, s] of Object.entries(sides)) { const v = v_(ctx, id); if (!v) continue; const stayed = ctx.rng.chance(0.8); const pick = stayed ? s : (s === aId ? bId : aId); if (pick === aId) va++; else vb++; }
    const tie = va === vb; const winner = tie ? (ctx.rng.chance(0.5) ? a : b) : va > vb ? a : b; const loser = winner === a ? b : a;
    ev.data.mayor = winner.id; ev.data.votes = { [aId]: va, [bId]: vb };
    setStatus(winner, 'celebrating', true); adjustNeeds(winner, { purpose: 40, fun: 20 }); nudgeMood(winner, 0.4);
    setStatus(loser, 'angry', true); adjustNeeds(loser, { purpose: -20 }); nudgeMood(loser, -0.4);
    remember(ctx.sim, winner, `${first(winner)} won the vote for mayor, ${Math.max(va, vb)} to ${Math.min(va, vb)}. The chain is heavier than it looks`, 9, ['mayor', 'politics', 'pleasant', 'dream'], [loser.id], 'square');
    remember(ctx.sim, loser, `${first(loser)} lost the vote for mayor to ${first(winner)}. ${Math.min(va, vb)} votes. ${first(loser)} knows exactly who they were`, 8, ['mayor', 'politics', 'unpleasant', 'grudge'], [winner.id], 'square');
    ctx.sim.adjustRelationship(loser, winner.id, { affinity: -8, trust: -4 }, 'beat me for mayor');
    for (const v of others(ctx, aId, bId)) { const backed = sides[v.id] === winner.id; remember(ctx.sim, v, `${first(winner)} is mayor now, ${Math.max(va, vb)} votes to ${Math.min(va, vb)}. ${backed ? `${first(v)} voted for ${first(winner)}` : `${first(v)} was for ${first(loser)}, for what it was worth`}`, 6, ['mayor', 'politics', backed ? 'pleasant' : 'unpleasant'], [winner.id, loser.id], 'square'); }
    chronicle(ctx.sim, `${first(winner)} is the new mayor of Pebblebrook, ${Math.max(va, vb)} votes to ${Math.min(va, vb)}. ${first(loser)} left the square without a word.`, 8, [winner.id, loser.id], 'square');
    ctx.sim.emote(winner, 'happy'); ctx.sim.emote(loser, 'angry');
    ev.endsAt = Math.min(ev.endsAt, ctx.now + 120);
  },
  onEnd(ctx, ev) {
    const [aId, bId] = (ev.data.candidates as VillagerId[]) ?? [];
    for (const id of [aId, bId]) { const v = v_(ctx, id); if (v) { setStatus(v, 'angry', false); setStatus(v, 'celebrating', false); completeGoals(v, 'talk to everyone before the vote'); } }
    if (ev.data.mayor) { const m = v_(ctx, String(ev.data.mayor)); if (m) m.stats.mayor = 1; }
  },
};

/* ================================================================ festivals */

const bloom_fair: EventDef = {
  id: 'bloom_fair', name: 'Spring Bloom Fair', kind: 'festival', rarity: 'common', drama: 8, place: 'festival_grounds',
  description: 'Flower judging at eleven, dancing round the maypole from one. The whole village on the festival field.',
  seasons: ['spring'], when: { kind: 'calendar', season: 'spring', day: 13, hour: 10 }, durationMin: 300, cooldownDays: 100,
  announce: () => [everyone('The Spring Bloom Fair is on the festival field: flowers to be judged at eleven, dancing from one', 7, ['festival', 'bloom_fair', 'social', 'plan', 'pleasant'], { place: 'festival_grounds' })],
  onStart(ctx, ev) {
    ev.text = 'Spring Bloom Fair on the festival field: flower judging at 11:00, dancing round the maypole from 13:00.';
    gather(ctx, ev, ctx.sim.villagers, 'the Spring Bloom Fair is starting on the festival field', 'go to the Spring Bloom Fair on the festival field', 10, true);
    for (const v of ctx.sim.villagers) if (likes(v, 'flower') || likes(v, 'festive')) nudgeMood(v, 0.2);
  },
  onHour(ctx, ev, hour) {
    const there = villagersAt(ctx.sim, 'festival_grounds', 9);
    if (hour === 11 && !ev.data.judged) {
      ev.data.judged = true;
      const pool = there.length ? there : ctx.sim.villagers;
      const scored = pool.map((v) => ({ v, s: (likes(v, 'flower') ? 2 : 0) + (v.inventory.find((s) => s.id === 'wildflower' || s.id === 'sunflower')?.qty ?? 0) + (v.id === 'ada' ? 1 : 0) + ctx.rng.next() * 2 })).sort((a, b) => b.s - a.s);
      const winner = scored[0]?.v; if (!winner) return;
      ev.data.flowerWinner = winner.id;
      setStatus(winner, 'celebrating', true); adjustNeeds(winner, { purpose: 20, fun: 15 }); ctx.sim.give(winner, { id: 'honey', qty: 1 });
      remember(ctx.sim, winner, `${first(winner)} won the flower judging at the Bloom Fair. A jar of honey and a ribbon`, 8, ['festival', 'bloom_fair', 'flower', 'pleasant', 'won'], undefined, 'festival_grounds');
      for (const v of pool) if (v.id !== winner.id) remember(ctx.sim, v, `${first(winner)} won the flower judging at the Bloom Fair${likes(v, 'flower') ? '. Next year' : ''}`, 5, ['festival', 'bloom_fair', 'flower'], [winner.id], 'festival_grounds');
      chronicle(ctx.sim, `${first(winner)} won the flower judging at the Spring Bloom Fair.`, 6, [winner.id], 'festival_grounds');
    }
    if (hour === 13 && !ev.data.danced) {
      ev.data.danced = true;
      const dancers = ctx.rng.shuffle(there.filter((v) => v.mood > -0.3 || likes(v, 'music')));
      const couples: string[] = [];
      for (let i = 0; i + 1 < dancers.length; i += 2) {
        const a = dancers[i], b = dancers[i + 1];
        couples.push(`${first(a)} and ${first(b)}`);
        for (const [x, y] of [[a, b], [b, a]] as [Villager, Villager][]) { remember(ctx.sim, x, `${first(x)} danced with ${first(y)} round the maypole at the Bloom Fair`, 6, ['festival', 'bloom_fair', 'dance', 'social', 'pleasant', 'romance'], [y.id], 'festival_grounds'); ctx.sim.adjustRelationship(x, y.id, { affinity: 4, familiarity: 4, romance: 3 }, 'danced at the Bloom Fair'); adjustNeeds(x, { fun: 20, social: 15 }); ctx.sim.emote(x, 'music'); }
      }
      if (couples.length) chronicle(ctx.sim, `Dancing at the Bloom Fair: ${listNames(couples)}.`, 6, dancers.map((v) => v.id), 'festival_grounds');
    }
  },
  onEnd(ctx, ev) {
    const there = villagersAt(ctx.sim, 'festival_grounds', 9);
    for (const v of ctx.sim.villagers) { setStatus(v, 'celebrating', false); if (there.includes(v)) remember(ctx.sim, v, `The Bloom Fair — flowers, the maypole, and the whole village on the field. ${first(v)} stayed until the end`, 6, ['festival', 'bloom_fair', 'pleasant', 'social'], there.filter((o) => o.id !== v.id).map((o) => o.id), 'festival_grounds'); }
    chronicle(ctx.sim, 'The Spring Bloom Fair is over; petals all over the festival field.', 5, [], 'festival_grounds');
    void ev;
  },
};

const lantern_night: EventDef = {
  id: 'lantern_night', name: 'Midsummer Lantern Night', kind: 'festival', rarity: 'common', drama: 8, place: 'lake',
  description: 'At dusk the village walks down to the lake and sets paper lanterns on the water. Wishes, quiet, and the odd kiss.',
  seasons: ['summer'], when: { kind: 'calendar', season: 'summer', day: 15, hour: 19 }, durationMin: 240, cooldownDays: 100,
  announce: () => [everyone('Midsummer Lantern Night: everyone walks down to the lake at dusk to float lanterns', 7, ['festival', 'lantern_night', 'social', 'plan', 'pleasant'], { place: 'lake' })],
  onStart(ctx, ev) {
    ev.text = 'Midsummer Lantern Night at the lake from dusk: lanterns on the water at 20:00.';
    gather(ctx, ev, ctx.sim.villagers, 'Lantern Night is starting down at the lake', 'walk down to the lake for Lantern Night', 10, true);
    for (const o of ctx.world.objectsNear(ctx.world.place('lake')?.anchor ?? { x: 64, y: 54 }, 20, 'lantern')) o.data.lit = true;
  },
  onHour(ctx, ev, hour) {
    if (hour !== 20 || ev.data.floated) return;
    ev.data.floated = true;
    const there = villagersAt(ctx.sim, 'lake', 12);
    for (const v of there) { remember(ctx.sim, v, `${first(v)} set a lantern on the lake and wished: ${v.personality.dream.toLowerCase()}`, 7, ['festival', 'lantern_night', 'wish', 'dream', 'pleasant'], undefined, 'lake'); adjustNeeds(v, { fun: 15, purpose: 12, social: 10 }); ctx.sim.emote(v, 'love'); }
    const cands = romanceCandidates(ctx.sim, 20, 20).filter((c) => there.includes(c.a) && there.includes(c.b));
    if (cands.length) { const c = cands[0]; for (const [x, y] of [[c.a, c.b], [c.b, c.a]] as [Villager, Villager][]) { remember(ctx.sim, x, `${first(x)} and ${first(y)} stood a long time at the water's edge on Lantern Night, not saying much`, 8, ['festival', 'lantern_night', 'romance', 'pleasant'], [y.id], 'lake'); ctx.sim.adjustRelationship(x, y.id, { romance: 8, affinity: 4, familiarity: 3 }, 'Lantern Night'); } chronicle(ctx.sim, `Lanterns on the lake. ${first(c.a)} and ${first(c.b)} stayed at the water long after the others.`, 7, [c.a.id, c.b.id], 'lake'); }
    else chronicle(ctx.sim, `Lanterns on the lake: ${there.length ? listNames(there.map(first)) : 'nobody'} came down to the water.`, 6, there.map((v) => v.id), 'lake');
  },
  onEnd(ctx, ev) {
    for (const o of ctx.world.objectsNear(ctx.world.place('lake')?.anchor ?? { x: 64, y: 54 }, 20, 'lantern')) o.data.lit = false;
    for (const v of ctx.sim.villagers) setStatus(v, 'celebrating', false);
    chronicle(ctx.sim, 'The last lantern has gone out on the lake.', 4, [], 'lake');
    void ev;
  },
};

const harvest_feast: EventDef = {
  id: 'harvest_feast', name: 'Harvest Feast', kind: 'festival', rarity: 'common', drama: 8, place: 'festival_grounds',
  description: 'A long table on the festival field, everyone fed, and the pumpkin contest at two.',
  seasons: ['autumn'], when: { kind: 'calendar', season: 'autumn', day: 20, hour: 12 }, durationMin: 360, cooldownDays: 100,
  announce: (ctx) => [everyone(`Harvest Feast on the festival field: the long table at noon, ${ctx.name('ada')}'s pumpkin contest at two`, 7, ['festival', 'harvest_feast', 'social', 'plan', 'pleasant'], { about: ['ada'], place: 'festival_grounds' })],
  onStart(ctx, ev) {
    ev.text = 'Harvest Feast on the festival field: the long table from 12:00, the pumpkin contest at 14:00.';
    gather(ctx, ev, ctx.sim.villagers, 'the Harvest Feast is starting on the festival field', 'go to the Harvest Feast on the festival field', 10, true);
    const ada = v_(ctx, 'ada'); if (ada) { adjustNeeds(ada, { purpose: 20 }); nudgeMood(ada, 0.3); }
  },
  onHour(ctx, ev, hour) {
    const there = villagersAt(ctx.sim, 'festival_grounds', 9);
    if (hour === 13 && !ev.data.fed) { ev.data.fed = true; for (const v of there) { adjustNeeds(v, { hunger: 45, fun: 12, social: 15 }); remember(ctx.sim, v, `${first(v)} ate at the long table at the Harvest Feast — Ada's potatoes, Finn's stew, Cerys's pies`, 6, ['festival', 'harvest_feast', 'food', 'pleasant', 'social'], ['ada', 'finn', 'cerys'].filter((id) => id !== v.id), 'festival_grounds'); } if (there.length) chronicle(ctx.sim, `The long table at the Harvest Feast: ${listNames(there.map(first))}.`, 6, there.map((v) => v.id), 'festival_grounds'); }
    if (hour === 14 && !ev.data.pumpkin) {
      ev.data.pumpkin = true;
      const pool = there.length ? there : ctx.sim.villagers;
      const scored = pool.map((v) => ({ v, s: (v.inventory.find((s) => s.id === 'pumpkin')?.qty ?? 0) * 2 + (v.id === 'ada' ? 2 : 0) + (v.skills.farming ?? 0) * 0.3 + ctx.rng.next() * 2 })).sort((a, b) => b.s - a.s);
      const w = scored[0]?.v; if (!w) return;
      ev.data.pumpkinWinner = w.id; setStatus(w, 'celebrating', true); ctx.sim.give(w, { id: 'pumpkin_seed', qty: 4 }); adjustNeeds(w, { purpose: 20 });
      remember(ctx.sim, w, `${first(w)} won the pumpkin contest at the Harvest Feast${w.id === 'ada' ? '. As it should be' : ' — and Ada did not'}`, 8, ['festival', 'harvest_feast', 'pumpkin', 'pleasant', 'won'], undefined, 'festival_grounds');
      for (const v of pool) if (v.id !== w.id) remember(ctx.sim, v, `${first(w)} won the pumpkin contest${v.id === 'ada' && w.id !== 'ada' ? '. Ada has opinions about the judging' : ''}`, 5, ['festival', 'harvest_feast', 'pumpkin', v.id === 'ada' ? 'unpleasant' : 'pleasant'], [w.id], 'festival_grounds');
      chronicle(ctx.sim, `${first(w)} won the pumpkin contest at the Harvest Feast.`, 6, [w.id], 'festival_grounds');
    }
  },
  onEnd(ctx) { for (const v of ctx.sim.villagers) setStatus(v, 'celebrating', false); chronicle(ctx.sim, 'The Harvest Feast is over. The long table will take Jory a week to put away.', 5, ['jory'], 'festival_grounds'); },
};

const winter_star: EventDef = {
  id: 'winter_star', name: 'Winter Star', kind: 'festival', rarity: 'common', drama: 8, place: 'square',
  description: 'Gifts exchanged on the square at dusk, then everyone looks up for the Winter Star.',
  seasons: ['winter'], when: { kind: 'calendar', season: 'winter', day: 24, hour: 17 }, durationMin: 300, cooldownDays: 100,
  announce: () => [everyone('Winter Star tonight: the gift exchange on the square at dusk, then stargazing when the Star rises', 7, ['festival', 'winter_star', 'social', 'gift', 'plan', 'pleasant'], { place: 'square' })],
  onStart(ctx, ev) {
    ev.text = 'Winter Star on the square: the gift exchange at 18:00, the Star rises at 20:00.';
    gather(ctx, ev, ctx.sim.villagers, 'Winter Star is starting on the square', 'go to the square for Winter Star', 10, true);
    const ids = ctx.rng.shuffle(ctx.sim.villagers.map((v) => v.id));
    const pairs: Record<VillagerId, VillagerId> = {};
    ids.forEach((id, i) => { pairs[id] = ids[(i + 1) % ids.length]; });
    ev.data.secret = pairs;
    for (const o of ctx.world.objectsNear(ctx.world.place('square')?.anchor ?? { x: 41, y: 35 }, 12, 'lantern')) o.data.lit = true;
  },
  onHour(ctx, ev, hour) {
    if (hour === 18 && !ev.data.exchanged) {
      ev.data.exchanged = true;
      const pairs = ev.data.secret as Record<VillagerId, VillagerId>;
      const given: string[] = [];
      for (const [from, to] of Object.entries(pairs)) {
        const f = v_(ctx, from), t = v_(ctx, to); if (!f || !t) continue;
        let g = giftable(f, t);
        if (!g && f.money >= 15) { f.money -= 15; ctx.sim.give(f, { id: 'candle', qty: 1 }); g = 'candle'; }
        if (g && giveGift(ctx, f, t, g, 'at the Winter Star exchange')) given.push(`${first(f)} → ${first(t)}`);
      }
      chronicle(ctx.sim, `The Winter Star gift exchange: ${given.length ? given.join(', ') : 'nobody had anything to give'}.`, 6, [], 'square');
    }
    if (hour === 20 && !ev.data.star) {
      ev.data.star = true;
      const there = villagersAt(ctx.sim, 'square', 9);
      for (const v of there) { remember(ctx.sim, v, `${first(v)} watched the Winter Star rise over the square with ${there.length > 1 ? listNames(there.filter((o) => o.id !== v.id).map(first)) : 'nobody at all'}`, 7, ['festival', 'winter_star', 'stars', 'pleasant', 'social'], there.filter((o) => o.id !== v.id).map((o) => o.id), 'square'); adjustNeeds(v, { fun: 15, comfort: -5, social: 15 }); ctx.sim.emote(v, 'happy'); }
      chronicle(ctx.sim, `The Winter Star rose. ${there.length ? listNames(there.map(first)) + ' watched from the square.' : ''}`, 7, there.map((v) => v.id), 'square');
    }
  },
  onEnd(ctx) { for (const o of ctx.world.objectsNear(ctx.world.place('square')?.anchor ?? { x: 41, y: 35 }, 12, 'lantern')) o.data.lit = false; for (const v of ctx.sim.villagers) setStatus(v, 'celebrating', false); chronicle(ctx.sim, 'Winter Star is over; the square is dark and everyone is home by the fire.', 4, [], 'square'); },
};

/* ================================================================== export */

export const EVENTS: EventDef[] = [
  storm_warning, storm, heatwave, fog, drought, first_snow, meteor_shower, shooting_star,
  merchant, flour_shortage, tax_collector, market_day, bard, visitor, letter,
  crows, cave_in, wolf, fish_bloom, bumper_harvest, cold, broken_bridge, stray_dog, dog_digs, heirloom,
  birthday, proposal, wedding, stew_night, mayor_race,
  bloom_fair, lantern_night, harvest_feast, winter_star,
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export const FESTIVAL_IDS = ['bloom_fair', 'lantern_night', 'harvest_feast', 'winter_star'];

export { MERCHANT_STOCK };
