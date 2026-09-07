import { ITEMS, item } from '../../core/items.ts';
import type { Effect, ItemId, ToolDef, Villager } from '../../core/types.ts';
import { asCore, type ShopState, type SimCore } from '../core.ts';
import { buyPrice, noteBuy, noteSell, removeStock, sellPrice, shopWants, stockOf } from '../economy.ts';
import { chron, done, fail, first, itemName, memFor, need, needNear, needPlace, num, rel, say, sfx, str } from './util.ts';

export function resolveItem(raw: unknown): ItemId | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (ITEMS.some((i) => i.id === key)) return key;
  const byName = ITEMS.find((i) => i.name.toLowerCase() === raw.trim().toLowerCase());
  if (byName) return byName.id;
  const partial = ITEMS.find((i) => i.name.toLowerCase().includes(raw.trim().toLowerCase()) || i.id.includes(key));
  return partial?.id;
}

/** Shops that currently sell `id`, nearest first; only open ones unless `any`. */
export function shopsWith(sim: SimCore, v: Villager, id: ItemId, any = false): ShopState[] {
  const out: ShopState[] = [];
  for (const s of sim.shops.values()) {
    const p = sim.world.place(s.place);
    if (!p) continue;
    if (stockOf(s, id) <= 0) continue;
    if (!any && !sim.isOpen(p)) continue;
    out.push(s);
  }
  out.sort((a, b) => d2(sim, v, a.place) - d2(sim, v, b.place));
  return out;
}

const d2 = (sim: SimCore, v: Villager, place: string): number => { const p = sim.world.place(place); return p ? (p.anchor.x - v.pos.x) ** 2 + (p.anchor.y - v.pos.y) ** 2 : 1e9; };

export function eventMult(sim: SimCore, id: ItemId): number {
  let m = 1;
  for (const e of sim.events) {
    const prices = e.data?.prices as Record<string, number> | undefined;
    if (prices && typeof prices[id] === 'number') m *= prices[id];
  }
  return m;
}

export const ECONOMY_TOOLS: ToolDef[] = [
  {
    name: 'buy', category: 'economy',
    description: 'Buy an item from a shop that stocks it (walks there if needed).',
    params: { type: 'object', properties: { item: { type: 'string' }, qty: { type: 'number' }, place: { type: 'string', description: 'shop to buy from; default: nearest open shop that has it' } }, required: ['item'] },
    available: (v, view) => v.money >= 3 && !asCore(view).isAsleep(v),
    execute(v, view, args) {
      const sim = asCore(view);
      const id = resolveItem(args.item);
      if (!id) return fail(`no such item as ${str(args, 'item')}`);
      const qty = Math.max(1, Math.min(20, Math.round(num(args, 'qty', 1))));
      let shop: ShopState | undefined;
      if (args.place !== undefined && args.place !== '') {
        const p = sim.resolvePlace(args.place);
        shop = p ? sim.shops.get(p.id) : undefined;
        if (!shop) return fail(`${str(args, 'place')} is not a shop`);
      } else {
        shop = shopsWith(sim, v, id)[0];
        if (!shop) return shopsWith(sim, v, id, true).length ? fail(`nowhere selling ${itemName(id)} is open right now`) : fail(`nobody sells ${itemName(id)}`);
      }
      const place = sim.world.place(shop.place)!;
      if (!sim.isOpen(place)) return fail(`${place.name} is closed`);
      if (shop.owner === v.id) return fail(`${first(v)} owns ${place.name}; take it from the shelf instead`);
      const walk = needPlace(v, sim, shop.place, 'buy', { ...args, item: id, place: shop.place });
      if (walk) return walk;
      const have = stockOf(shop, id);
      if (have <= 0) return fail(`${place.name} is out of ${itemName(id)}`);
      const n = Math.min(qty, have);
      const unit = buyPrice(shop, id, eventMult(sim, id)) * (sim.rt(v).flagUntil.haggle && sim.rt(v).flagUntil.haggle! > sim.now && sim.rt(v).lastReason === `haggle:${shop.place}` ? 0.85 : 1);
      const affordable = Math.min(n, Math.floor(v.money / Math.max(1, unit)));
      if (affordable <= 0) return fail(`${first(v)} cannot afford ${itemName(id)} (${Math.round(unit)} coins)`);
      const total = Math.round(unit * affordable);
      removeStock(shop, id, affordable);
      noteBuy(shop, id, affordable);
      const owner = shop.owner ? sim.villager(shop.owner) : undefined;
      const effects: Effect[] = [{ kind: 'money', delta: -total }, { kind: 'give', items: [{ id, qty: affordable }] }, sfx('coin'), { kind: 'stat', key: 'buys' }];
      if (owner) {
        effects.push({ kind: 'money', who: owner.id, delta: Math.round(total * 0.8) }, memFor(owner.id, `${first(v)} bought ${affordable} ${itemName(id)} at ${place.name} for ${total} coins`, 2, ['trade', 'money', 'work'], [v.id]));
        if (sim.atPlace(owner, shop.place)) effects.push(rel(owner.id, 'trade', { mutual: true }), { kind: 'say', who: owner.id, text: shopLine(owner, sim), to: v.id, tone: 'neutral' });
      }
      const def = item(id);
      if (def.price * affordable >= 40) effects.push(chron(`${first(v)} bought ${affordable > 1 ? affordable + ' ' : withArticle(def.name).replace(def.name, '') }${def.name} at ${place.name}.`, 2, [v.id], shop.place));
      return done(`${first(v)} bought ${affordable} ${def.name} at ${place.name} for ${total} coins`, 2, effects, 2);
    },
  },
  {
    name: 'sell', category: 'economy',
    description: 'Sell items from your inventory to a shop that buys that kind of thing.',
    params: { type: 'object', properties: { item: { type: 'string' }, qty: { type: 'number' }, place: { type: 'string' } }, required: ['item'] },
    available: (v, view) => v.inventory.some((s) => item(s.id).kind !== 'tool') && !asCore(view).isAsleep(v),
    execute(v, view, args) {
      const sim = asCore(view);
      const id = resolveItem(args.item);
      if (!id) return fail(`no such item as ${str(args, 'item')}`);
      const have = v.inventory.filter((s) => s.id === id).reduce((a, b) => a + b.qty, 0);
      if (have <= 0) return fail(`${first(v)} has no ${itemName(id)} to sell`);
      const qty = Math.max(1, Math.min(have, Math.round(num(args, 'qty', have))));
      let shop: ShopState | undefined;
      if (args.place !== undefined && args.place !== '') {
        const p = sim.resolvePlace(args.place);
        shop = p ? sim.shops.get(p.id) : undefined;
        if (!shop) return fail(`${str(args, 'place')} is not a shop`);
      } else {
        const cands = [...sim.shops.values()].filter((s) => s.owner !== v.id && shopWants(s, id) && sim.isOpen(sim.world.place(s.place)!));
        cands.sort((a, b) => sellPrice(b, id, 1) - sellPrice(a, id, 1) || d2(sim, v, a.place) - d2(sim, v, b.place));
        shop = cands[0];
        if (!shop) return fail(`no open shop wants ${itemName(id)} right now`);
      }
      const place = sim.world.place(shop.place)!;
      if (!sim.isOpen(place)) return fail(`${place.name} is closed`);
      if (shop.owner === v.id) return fail(`${first(v)} cannot sell to their own shop; use restock`);
      const walk = needPlace(v, sim, shop.place, 'sell', { ...args, item: id, place: shop.place, qty });
      if (walk) return walk;
      const unit = sellPrice(shop, id, eventMult(sim, id));
      const total = unit * qty;
      const cur = shop.stock.find((s) => s.id === id);
      if (cur) cur.qty += qty; else shop.stock.push({ id, qty });
      noteSell(shop, id, qty);
      const owner = shop.owner ? sim.villager(shop.owner) : undefined;
      const effects: Effect[] = [{ kind: 'take', items: [{ id, qty }] }, { kind: 'money', delta: total }, sfx('coin'), need({ purpose: 4 }), { kind: 'stat', key: 'sells' }];
      if (owner) {
        effects.push({ kind: 'money', who: owner.id, delta: -Math.min(owner.money, Math.round(total * 0.6)) }, memFor(owner.id, `${first(v)} sold ${qty} ${itemName(id)} to ${place.name}`, 2, ['trade', 'money', 'work'], [v.id]));
        if (sim.atPlace(owner, shop.place)) effects.push(rel(owner.id, 'trade', { mutual: true }));
      }
      if (total >= 40) effects.push(chron(`${first(v)} sold ${qty} ${itemName(id)} at ${place.name} for ${total} coins.`, 2, [v.id], shop.place));
      return done(`${first(v)} sold ${qty} ${itemName(id)} at ${place.name} for ${total} coins`, 2, effects, 2);
    },
  },
  {
    name: 'trade', category: 'economy',
    description: 'Offer another villager a swap: your item for theirs.',
    params: { type: 'object', properties: { target: { type: 'string' }, give: { type: 'string' }, want: { type: 'string' } }, required: ['target', 'give', 'want'] },
    available: (v, view) => v.inventory.length > 0 && asCore(view).villagersNear(v.pos, 8).some((o) => o.id !== v.id && o.inventory.length > 0 && !asCore(view).isAsleep(o)),
    execute(v, view, args) {
      const sim = asCore(view);
      const t = sim.resolveVillager(args.target);
      if (!t || t.id === v.id) return fail('no such villager to trade with');
      const give = resolveItem(args.give), want = resolveItem(args.want);
      if (!give || !want) return fail('trade needs a give item and a want item');
      if (!sim.has(v, give, 1)) return fail(`${first(v)} has no ${itemName(give)}`);
      if (!sim.has(t, want, 1)) return fail(`${first(t)} has no ${itemName(want)}`);
      if (sim.isAsleep(t)) return fail(`${first(t)} is asleep`);
      const walk = needNear(v, sim, t, 'trade', { ...args, target: t.id, give, want });
      if (walk) return walk;
      const vg = item(give).price, vw = item(want).price;
      const aff = t.relationships[v.id]?.affinity ?? 0;
      const likes = item(give).tags.some((tag) => t.personality.likes.includes(tag));
      const ok = vg >= vw * (0.85 - aff / 300) || (likes && vg >= vw * 0.6);
      if (!ok) return done(`${first(v)} offered ${first(t)} ${itemName(give)} for ${itemName(want)}; ${first(t)} declined`, 2, [say(`${first(t)}, my ${itemName(give).toLowerCase()} for your ${itemName(want).toLowerCase()}?`, t.id), { kind: 'say', who: t.id, text: sim.rng.pick(['Not for that, no.', 'You are having a laugh.', 'Hm. No.']), to: v.id, tone: 'neutral' }, rel(t.id, 'refused'), memFor(t.id, `${first(v)} tried to trade ${itemName(give)} for ${first(t)}'s ${itemName(want)}; not a fair swap`, 2, ['trade', 'social'], [v.id])], 2);
      return done(`${first(v)} swapped ${itemName(give)} for ${first(t)}'s ${itemName(want)}`, 2, [
        say(`${first(t)}, my ${itemName(give).toLowerCase()} for your ${itemName(want).toLowerCase()}?`, t.id), { kind: 'say', who: t.id, text: sim.rng.pick(['Deal.', 'Fair enough. Done.', 'Go on then.']), to: v.id, tone: 'warm' },
        { kind: 'take', items: [{ id: give, qty: 1 }] }, { kind: 'give', items: [{ id: give, qty: 1 }], to: t.id }, { kind: 'take', items: [{ id: want, qty: 1 }], from: t.id }, { kind: 'give', items: [{ id: want, qty: 1 }] },
        rel(t.id, 'trade', { mutual: true }), memFor(t.id, `${first(t)} traded ${itemName(want)} for ${first(v)}'s ${itemName(give)}`, 3, ['trade', 'social', 'pleasant'], [v.id]), need({ social: 3 }), { kind: 'stat', key: 'trades' }, sfx('coin'),
      ], 3);
    },
  },
  {
    name: 'pay', category: 'economy',
    description: 'Give someone money — settling a debt, paying for help, or just being generous.',
    params: { type: 'object', properties: { target: { type: 'string' }, amount: { type: 'number' }, reason: { type: 'string' } }, required: ['target', 'amount'] },
    available: (v, view) => v.money >= 10 && asCore(view).villagersNear(v.pos, 8).some((o) => o.id !== v.id && !asCore(view).isAsleep(o)),
    execute(v, view, args) {
      const sim = asCore(view);
      const t = sim.resolveVillager(args.target);
      if (!t || t.id === v.id) return fail('no such villager to pay');
      const amount = Math.round(num(args, 'amount', 0));
      if (amount <= 0) return fail('amount must be positive');
      if (v.money < amount) return fail(`${first(v)} only has ${Math.floor(v.money)} coins`);
      if (sim.isAsleep(t)) return fail(`${first(t)} is asleep`);
      const walk = needNear(v, sim, t, 'pay', { ...args, target: t.id, amount });
      if (walk) return walk;
      const reason = str(args, 'reason', 'no particular reason');
      const debt = /debt|owe|back|loan/i.test(reason);
      return done(`${first(v)} paid ${first(t)} ${amount} coins (${reason})`, 1, [
        { kind: 'money', delta: -amount }, { kind: 'money', who: t.id, delta: amount }, sfx('coin'),
        say(debt ? `Here, ${first(t)}. ${amount} coins. We are square.` : `${first(t)} — ${amount} coins, for ${reason}.`, t.id), { kind: 'say', who: t.id, text: debt ? sim.rng.pick(['About time.', 'Noted. And thank you.', 'I had nearly given up on that.']) : sim.rng.pick(['That is very good of you.', 'You did not have to. Thank you.']), to: v.id, tone: 'warm' },
        rel(t.id, debt ? 'promise_kept' : 'help', { mutual: true, note: `paid ${amount} (${reason})` }), memFor(t.id, `${first(v)} paid ${first(t)} ${amount} coins — ${reason}`, debt ? 5 : 4, ['money', 'social', 'pleasant', debt ? 'promise' : 'gift'], [v.id]), { kind: 'goal', complete: 'pay' }, { kind: 'stat', key: 'payments' },
        chron(`${first(v)} paid ${first(t)} ${amount} coins${debt ? ' — settling a debt' : ''}.`, debt ? 5 : 3, [v.id, t.id]),
      ], debt ? 5 : 3);
    },
  },
  {
    name: 'haggle', category: 'economy',
    description: 'Try to talk a shopkeeper down on their prices. Charm helps; some shopkeepers hate it.',
    params: { type: 'object', properties: { place: { type: 'string' } } },
    available(v, view) {
      const sim = asCore(view);
      const p = sim.currentPlace(v);
      if (!p) return false;
      const shop = sim.shops.get(p.id);
      return !!shop && shop.owner !== v.id && !!shop.owner && sim.atPlace(sim.villager(shop.owner)!, p.id) && sim.isOpen(p);
    },
    execute(v, view, args) {
      const sim = asCore(view);
      const p = args.place !== undefined && args.place !== '' ? sim.resolvePlace(args.place) : sim.currentPlace(v);
      const shop = p ? sim.shops.get(p.id) : undefined;
      if (!p || !shop || !shop.owner) return fail('no shopkeeper here to haggle with');
      const owner = sim.villager(shop.owner)!;
      if (!sim.atPlace(owner, p.id)) return fail(`${first(owner)} is not at the counter`);
      const walk = needPlace(v, sim, p.id, 'haggle', { place: p.id });
      if (walk) return walk;
      const hates = owner.personality.dislikes.includes('haggling');
      const roll = v.skills.charm + (v.relationships[owner.id]?.affinity ?? 0) / 20 + sim.rng.range(-3, 3) - owner.skills.charm * 0.5 - (hates ? 3 : 0);
      const win = roll > 3;
      const effects: Effect[] = [say(sim.rng.pick(['Come on, that price is robbery.', 'Surely you can do better than that for a neighbour?', 'I will take two if you knock something off.']), owner.id, 'joking'), { kind: 'skill', skill: 'charm', xp: 0.15 }, need({ fun: 3 }), { kind: 'stat', key: 'haggles' }];
      if (win) { effects.push({ kind: 'say', who: owner.id, text: sim.rng.pick(['...Fine. Fifteen percent. Tell nobody.', 'You are a menace. Alright, a little off.', 'Only because it is you.']), to: v.id, tone: 'neutral' }, { kind: 'fn', fn: (s: SimCore, me: Villager) => { s.rt(me).flagUntil.haggle = s.now + 60; s.rt(me).lastReason = `haggle:${p.id}`; } }); }
      else effects.push({ kind: 'say', who: owner.id, text: hates ? sim.rng.pick(['The price is the price. It is written on the sign.', 'I do not haggle. Ever.']) : sim.rng.pick(['Nice try.', 'The price is fair and you know it.']), to: v.id, tone: hates ? 'cold' : 'neutral' }, rel(owner.id, 'tease', { mutual: true, backDelta: { affinity: hates ? -2.5 : -0.5, familiarity: 1 } }));
      effects.push(memFor(owner.id, `${first(v)} tried to haggle at ${p.name}${win ? ' and got a discount' : hates ? '. Infuriating' : ''}`, hates ? 3 : 2, ['trade', 'social', hates ? 'unpleasant' : 'social'], [v.id]));
      return done(win ? `${first(v)} haggled ${first(owner)} down a little` : `${first(v)} tried to haggle with ${first(owner)} and got nowhere`, 2, effects, 2);
    },
  },
];

function shopLine(owner: Villager, sim: SimCore): string {
  const lines: Record<string, string[]> = {
    hal: ['Pleasure doing business.', 'Every coin counts. Thank you.', 'I will note that in the ledger.'],
    cerys: ['Still warm! Enjoy!', 'Tell me if it is not the best you have ever had!', 'Come back tomorrow — I am trying a new recipe!'],
    finn: ['Drink up, friend!', 'On the house next time. Maybe.', 'Sit, sit!'],
    bram: ['Mind the edge.', 'Mm.', 'Made that one Tuesday.'],
    elin: ['Take it with food. And rest.', 'Come back if it does not settle.', 'Be careful out there, please.'],
    jory: ['Careful, the varnish might still be tacky.', 'Made with love and very little hurry.'],
    dov: ['Fresh this morning.', 'River was generous.'],
    ines: ['Bring it back when you are done — or do not, if you love it.', 'Oh, that one is wonderful.'],
  };
  return sim.rng.pick(lines[owner.id] ?? ['Thank you.']);
}

function withArticle(name: string): string { return /^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`; }
