/**
 * Effects are the plain-data results of tools. The executor applies `when:'start'` effects (and the
 * inherently-immediate kinds) when an action begins and the rest when it completes.
 */
import { clamp } from '../core/index.ts';
import { item } from '../core/items.ts';
import type { Effect, Emote, ItemStack, Memory, Needs, PlotState, SkillName, StatusFlag, Villager, VillagerId } from '../core/types.ts';
import type { SimCore, TravelTarget } from './core.ts';
import { giftAppeal, interactionDelta } from './relationships.ts';
import { setFlag } from './villager.ts';

export const START_KINDS = new Set(['travel', 'rate', 'say', 'emote', 'sfx', 'sleep', 'conversation', 'interrupt', 'label']);

export const isStartEffect = (e: Effect): boolean => e.when === 'start' || (e.when === undefined && START_KINDS.has(e.kind));

/** Apply one effect for villager v. Returns false when the effect could not apply (missing items etc.). */
export function applyEffect(sim: SimCore, v: Villager, e: Effect): boolean {
  const who = (id: unknown): Villager | undefined => (typeof id === 'string' && id !== v.id ? sim.villager(id) : v);
  switch (e.kind) {
    case 'give': {
      const target = e.to === 'player' ? sim.player : who(e.to) ?? v;
      for (const s of e.items as ItemStack[]) sim.give(target, { ...s });
      return true;
    }
    case 'take': {
      const target = e.from === 'player' ? sim.player : who(e.from) ?? v;
      let ok = true;
      for (const s of e.items as ItemStack[]) if (!sim.take(target, { ...s })) ok = false;
      return ok;
    }
    case 'money': {
      const target = e.who === 'player' ? sim.player : who(e.who) ?? v;
      const d = Number(e.delta) || 0;
      target.money = Math.max(0, Math.round((target.money + d) * 100) / 100);
      if (target !== sim.player) {
        const t = target as Villager;
        if (d > 0) t.stats.moneyEarned = (t.stats.moneyEarned ?? 0) + d; else t.stats.moneySpent = (t.stats.moneySpent ?? 0) - d;
      }
      return true;
    }
    case 'need': {
      const target = who(e.who) ?? v;
      for (const k of ['energy', 'hunger', 'social', 'fun', 'comfort', 'purpose'] as (keyof Needs)[]) {
        const d = e[k];
        if (typeof d === 'number') target.needs[k] = clamp(target.needs[k] + d, 0, 100);
      }
      return true;
    }
    case 'rate': {
      const rt = sim.rt(v);
      for (const k of ['energy', 'hunger', 'social', 'fun', 'comfort', 'purpose'] as (keyof Needs)[]) {
        const d = e[k];
        if (typeof d === 'number') rt.rates[k] = d;
      }
      return true;
    }
    case 'skill': {
      sim.addSkill(v, e.skill as SkillName, Number(e.xp) || 0.1);
      return true;
    }
    case 'health': {
      const target = who(e.who) ?? v;
      target.health = clamp(target.health + (Number(e.delta) || 0), 0, 100);
      return true;
    }
    case 'plot': {
      const id = String(e.id);
      const cur = sim.world.plot(id);
      if (!cur) return false;
      sim.world.setPlot(id, { ...cur, ...(e.state as Partial<PlotState>) });
      return true;
    }
    case 'object': {
      const o = sim.world.object(String(e.id));
      if (!o) return false;
      Object.assign(o.data, e.data as Record<string, unknown>);
      return true;
    }
    case 'relationship': {
      const target = e.target as VillagerId | 'player';
      const other = target === 'player' ? null : sim.villager(target) ?? null;
      const appeal = typeof e.appeal === 'number' ? e.appeal : undefined;
      const d = e.delta && typeof e.delta === 'object' ? (e.delta as Record<string, number>) : interactionDelta(String(e.interaction ?? 'chat'), v, other, { appeal });
      sim.adjustRelationship(v, target, d, typeof e.note === 'string' ? e.note : undefined);
      if (e.mutual && other) {
        const back = e.backDelta && typeof e.backDelta === 'object' ? (e.backDelta as Record<string, number>) : interactionDelta(String(e.backInteraction ?? e.interaction ?? 'chat'), other, v, { appeal: typeof e.backAppeal === 'number' ? e.backAppeal : appeal });
        sim.adjustRelationship(other, v.id, back, typeof e.backNote === 'string' ? e.backNote : typeof e.note === 'string' ? e.note : undefined);
      }
      return true;
    }
    case 'memory': {
      const ids = Array.isArray(e.who) ? (e.who as VillagerId[]) : [typeof e.who === 'string' ? (e.who as VillagerId) : v.id];
      for (const id of ids) {
        const t = sim.villager(id);
        if (!t) continue;
        sim.remember(t, { kind: (e.memKind as Memory['kind']) ?? 'observation', text: String(e.text), importance: Number(e.importance) || 2, tags: (e.tags as string[]) ?? [], about: e.about as VillagerId[] | undefined, place: (e.place as string | undefined) ?? t.inside ?? sim.currentPlace(t)?.id, secondhand: e.secondhand as boolean | undefined, source: e.source as VillagerId | undefined });
      }
      return true;
    }
    case 'chronicle': {
      sim.log(String(e.text), Number(e.importance) || 3, e.about as VillagerId[] | undefined, (e.place as string | undefined) ?? v.inside ?? sim.currentPlace(v)?.id);
      return true;
    }
    case 'sfx': {
      sim.bus.emit({ type: 'sfx', name: String(e.name), pos: { ...v.pos } });
      return true;
    }
    case 'status': {
      const target = who(e.who) ?? v;
      const rt = sim.rt(target);
      for (const f of (e.add as StatusFlag[] | undefined) ?? []) { setFlag(target, f, true); if (typeof e.minutes === 'number') rt.flagUntil[f] = sim.now + e.minutes; }
      for (const f of (e.remove as StatusFlag[] | undefined) ?? []) { setFlag(target, f, false); delete rt.flagUntil[f]; }
      return true;
    }
    case 'emote': {
      const target = who(e.who) ?? v;
      sim.emote(target, e.emote as Emote);
      return true;
    }
    case 'say': {
      const target = who(e.who) ?? v;
      sim.say(target, String(e.text), e.to as VillagerId | 'player' | undefined, e.tone as 'warm' | undefined);
      return true;
    }
    case 'stat': {
      v.stats[String(e.key)] = (v.stats[String(e.key)] ?? 0) + (typeof e.n === 'number' ? e.n : 1);
      return true;
    }
    case 'goal': {
      if (e.add && typeof e.add === 'object') {
        const g = e.add as { text: string; priority?: number };
        if (!v.goals.some((x) => !x.done && x.text === g.text)) v.goals.push({ id: `g${sim.now}_${v.goals.length}`, text: g.text, priority: g.priority ?? 5, createdAt: sim.now });
      }
      if (typeof e.complete === 'string') {
        const key = e.complete.toLowerCase();
        for (const g of v.goals) if (!g.done && (g.id === e.complete || g.text.toLowerCase().includes(key))) { g.done = true; g.progress = 'done'; }
      }
      return true;
    }
    case 'enter': {
      const p = sim.world.place(String(e.place));
      if (!p) return false;
      v.inside = p.id;
      v.pos = { ...(p.interior ?? p.anchor) };
      sim.bus.emit({ type: 'sfx', name: 'door', pos: { ...(p.door ?? p.anchor) } });
      return true;
    }
    case 'leave': {
      if (!v.inside) return true;
      const p = sim.world.place(v.inside);
      v.inside = undefined;
      const door = p?.door ?? p?.anchor ?? v.pos;
      v.pos = sim.world.nearestWalkable({ x: door.x, y: door.y + 1 }, 3);
      if (!sim.world.walkable(Math.round(v.pos.x), Math.round(v.pos.y))) v.pos = sim.world.nearestWalkable(door, 4);
      v.facing = 'down';
      sim.bus.emit({ type: 'sfx', name: 'door', pos: { ...door } });
      return true;
    }
    case 'mood': {
      const target = who(e.who) ?? v;
      sim.rt(target).moodBoost = clamp(sim.rt(target).moodBoost + (Number(e.delta) || 0), -1, 1);
      return true;
    }
    case 'shop': {
      const shop = sim.shops.get(String(e.place));
      if (!shop) return false;
      for (const s of (e.add as ItemStack[] | undefined) ?? []) { const cur = shop.stock.find((x) => x.id === s.id); if (cur) cur.qty += s.qty; else shop.stock.push({ ...s }); }
      for (const s of (e.remove as ItemStack[] | undefined) ?? []) { const cur = shop.stock.find((x) => x.id === s.id); if (cur) { cur.qty -= s.qty; if (cur.qty <= 0) shop.stock.splice(shop.stock.indexOf(cur), 1); } }
      if (e.price && typeof e.price === 'object') { const p = e.price as { id: string; price: number }; shop.overrides[p.id] = Math.max(1, Math.round(p.price)); }
      if (typeof e.open === 'boolean') shop.open = e.open;
      return true;
    }
    case 'sleep': {
      sim.rt(v).asleep = true;
      return true;
    }
    case 'wake': {
      sim.rt(v).asleep = false;
      return true;
    }
    case 'interrupt': {
      const t = sim.villager(String(e.who));
      if (t) sim.interrupt(t, String(e.reason ?? 'interrupted'));
      return true;
    }
    case 'travel':
    case 'conversation':
    case 'label':
      // handled by the executor itself
      return true;
    case 'fn': {
      const fn = e.fn as ((sim: SimCore, v: Villager) => void) | undefined;
      if (typeof fn === 'function') fn(sim, v);
      return true;
    }
    default:
      return false;
  }
}

export interface TravelEffect extends Effect { kind: 'travel'; target: TravelTarget; then: { tool: string; args: Record<string, unknown> } | null; path: { x: number; y: number }[] }

export const appealOf = giftAppeal;
export const itemDef = item;
