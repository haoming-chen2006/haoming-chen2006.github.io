/**
 * The Director: rolls random events with a seeded RNG, fires calendar events, checks triggers hourly,
 * ticks and ends active events, applies follow-ups, generates requests, and exposes the override API.
 */
import type { Director, Sim } from '../core/app.ts';
import { SeededRng } from '../core/rng.ts';
import { DAYS_PER_SEASON, MINUTES_PER_DAY, timeFromMinute } from '../core/time.ts';
import type { ActiveEvent, Season, VillagerId, WorldTime } from '../core/types.ts';
import { EVENTS, EVENT_BY_ID, FESTIVAL_IDS } from './catalogue.ts';
import { announce, busOf, chronicle, hourFloat, minuteAt, nameOf, toast } from './helpers.ts';
import { RequestGenerator } from './requests.ts';
import type { CalendarEntry, EventCtx, EventDef } from './types.ts';

interface Scheduled { id: string; at: number; opts: Record<string, unknown>; label?: string; source: string }

export interface DirectorLogLine { t: number; dayIndex: number; id: string; name: string; phase: 'start' | 'end'; source: string; season: Season }

interface DirectorState {
  v: 1;
  rng: number;
  history: Record<string, number>;
  counts: Record<string, number>;
  scheduled: Scheduled[];
  lastDay: number;
  lastHour: number;
  seq: number;
  requests: unknown;
  yearFlags: Record<string, number>;
  log?: DirectorLogLine[];
}

export interface PebbleDirector extends Director {
  /** every start/end the director produced, oldest first (capped) */
  readonly log: DirectorLogLine[];
  readonly defs: EventDef[];
  readonly requests: RequestGenerator;
  /** live instances started by the director (a subset of `active`, which is the whole shared list) */
  mine(): ActiveEvent[];
  /** the villager-facing calendar the forecast is built from */
  readonly calendar: CalendarEntry[];
}

const MAX_RANDOM_PER_DAY = 2;
const DEFAULT_HOURS: [number, number] = [7, 20];
const CALENDAR_GRACE_HOURS = 3;
const LOG_CAP = 2000;
const LOG_SAVE = 600;

export class DirectorImpl implements PebbleDirector {
  readonly log: DirectorLogLine[] = [];
  readonly defs = EVENTS;
  readonly requests: RequestGenerator;
  readonly calendar: CalendarEntry[];
  private sim: Sim;
  private rng: SeededRng;
  private history: Record<string, number> = {};
  private counts: Record<string, number> = {};
  private scheduled: Scheduled[] = [];
  private yearFlags: Record<string, number> = {};
  private lastDay = 0;
  private lastHour = -1;
  private lastMinute = -1;
  private seq = 0;
  private unsubscribe: (() => void) | null = null;
  /** instances this director started, by id (the sim may drop `social` events itself at endsAt) */
  private live = new Map<string, ActiveEvent>();

  constructor(sim: Sim, seed: number) {
    this.sim = sim;
    this.rng = new SeededRng(seed >>> 0).fork(7);
    this.requests = new RequestGenerator(sim);
    this.calendar = buildCalendar(sim);
    this.unsubscribe = busOf(sim).on('request', (e) => this.requests.onRequest(e, this.ctx()));
  }

  get active(): ActiveEvent[] { return this.sim.events; }
  set active(_v: ActiveEvent[]) { /* the shared list is owned by the sim */ }

  mine(): ActiveEvent[] { return this.sim.events.filter((e) => typeof e.data?.def === 'string' && EVENT_BY_ID[String(e.data.def)]); }

  dispose(): void { this.unsubscribe?.(); this.unsubscribe = null; }

  /* ------------------------------------------------------------- loop */

  update(minutes: number): void {
    const t = this.sim.world.time;
    const now = t.minute;
    if (this.lastMinute < 0) this.lastMinute = Math.max(0, now - Math.max(0, minutes));
    const elapsed = Math.max(0, now - this.lastMinute);
    const ctx = this.ctx();
    // events the sim removed on its own (it expires `social` ones at endsAt) still get their onEnd
    const byId = new Map(this.sim.events.map((e) => [e.id, e]));
    for (const [id, ev] of [...this.live]) { const cur = byId.get(id); if (cur) { if (cur !== ev) this.live.set(id, cur); } else this.end(ev); }
    if (t.dayIndex !== this.lastDay) { this.planRandom(t.dayIndex, now); this.lastDay = t.dayIndex; }
    const hourChanged = t.hour !== this.lastHour;
    this.lastHour = t.hour;

    // calendar (festivals, birthdays, tax day, market day)
    for (const c of this.calendar) {
      if (!calendarMatches(c, t)) continue;
      const key = calendarKey(c);
      if (this.history[key] === t.dayIndex) continue;
      const h = hourFloat(t);
      if (h < c.hour) continue;
      this.history[key] = t.dayIndex;
      if (h > c.hour + CALENDAR_GRACE_HOURS) continue;
      this.fireInternal(c.defId, c.opts ?? {}, 'calendar');
    }

    // scheduled one-offs (follow-ups, storms, weddings, today's random rolls)
    const due = this.scheduled.filter((s) => s.at <= now);
    if (due.length) {
      this.scheduled = this.scheduled.filter((s) => s.at > now);
      for (const s of due) this.fireInternal(s.id, s.opts, s.source);
    }

    // triggers, hourly
    if (hourChanged) {
      for (const def of EVENTS) {
        if (def.when.kind !== 'trigger') continue;
        if (!this.inSeason(def, t.season) || this.onCooldown(def, t.dayIndex) || this.activeOf(def.id)) continue;
        let ok = false;
        try { ok = def.when.check(ctx); } catch { ok = false; }
        if (ok) this.fireInternal(def.id, {}, 'trigger');
      }
    }

    // tick + end
    for (const ev of this.mine()) {
      const def = EVENT_BY_ID[String(ev.data.def)];
      if (!def) continue;
      if (elapsed > 0 && def.onTick) { try { def.onTick(ctx, ev, elapsed); } catch (e) { this.warn(def, 'onTick', e); } }
      if (hourChanged && def.onHour) { try { def.onHour(ctx, ev, t.hour); } catch (e) { this.warn(def, 'onHour', e); } }
    }
    for (const ev of this.mine()) if (ev.endsAt <= now) this.end(ev);

    if (hourChanged) this.requests.update(ctx);
    this.lastMinute = now;
  }

  /* ---------------------------------------------------------- firing */

  fire(eventId: string, opts: Record<string, unknown> = {}): ActiveEvent | null {
    return this.fireInternal(eventId, opts, 'director');
  }

  list(): { id: string; name: string; kind: string; description: string; canFire: boolean }[] {
    const ctx = this.ctx();
    return EVENTS.map((d) => ({ id: d.id, name: d.name, kind: d.kind, description: d.description, canFire: this.canFire(d, {}, ctx) }));
  }

  forecast(): { dayIndex: number; name: string; id: string }[] {
    const t = this.sim.world.time;
    const out: { dayIndex: number; name: string; id: string }[] = [];
    for (let d = t.dayIndex; d < t.dayIndex + 14; d++) {
      const dt = timeFromMinute((d - 1) * MINUTES_PER_DAY);
      for (const c of this.calendar) {
        if (!calendarMatches(c, dt)) continue;
        if (d === t.dayIndex && (this.history[calendarKey(c)] === d || hourFloat(t) > c.hour + CALENDAR_GRACE_HOURS)) continue;
        out.push({ dayIndex: d, name: c.name, id: c.defId });
      }
    }
    for (const s of this.scheduled) {
      if (!s.label) continue;
      const d = Math.floor(s.at / MINUTES_PER_DAY) + 1;
      if (d >= t.dayIndex && d < t.dayIndex + 14) out.push({ dayIndex: d, name: s.label, id: s.id });
    }
    return out.sort((a, b) => a.dayIndex - b.dayIndex);
  }

  private canFire(def: EventDef, opts: Record<string, unknown>, ctx: EventCtx): boolean {
    if (this.activeOf(def.id)) return false;
    if (def.exclusive?.some((x) => this.activeOf(x))) return false;
    if (def.canFire) { try { if (!def.canFire(ctx, opts)) return false; } catch { return false; } }
    return true;
  }

  private fireInternal(id: string, opts: Record<string, unknown>, source: string): ActiveEvent | null {
    const def = EVENT_BY_ID[id];
    if (!def) return null;
    const ctx = this.ctx();
    const t = ctx.time;
    if (source !== 'director' && !this.inSeason(def, t.season)) return null;
    if (!this.canFire(def, opts, ctx)) return null;
    const ev: ActiveEvent = {
      id: `${id}_${t.dayIndex}${this.counts[id] ? `_${++this.seq}` : ''}`, name: def.name, kind: def.kind,
      startedAt: ctx.now, endsAt: ctx.now + def.durationMin, place: def.place, text: def.description,
      data: { def: id, source, durationMin: def.durationMin },
    };
    if (FESTIVAL_IDS.includes(id)) {
      const placeholder = this.sim.events.findIndex((e) => e.id === `festival_${t.dayIndex}` && e.kind === 'festival');
      if (placeholder >= 0) this.sim.events.splice(placeholder, 1);
    }
    this.sim.events.push(ev);
    this.live.set(ev.id, ev);
    try { def.onStart(ctx, ev, opts); } catch (e) { this.warn(def, 'onStart', e); }
    if (def.text) { try { ev.text = def.text(ctx, ev); } catch { /* keep the default text */ } }
    let memories = 0;
    try { memories = announce(ctx, ev, def.announce(ctx, ev)); } catch (e) { this.warn(def, 'announce', e); }
    ev.data.memories = memories;
    this.history[id] = t.dayIndex;
    this.counts[id] = (this.counts[id] ?? 0) + 1;
    if (def.when.kind === 'trigger' && def.cooldownDays && def.cooldownDays >= 100) this.yearFlags[id] = t.year;
    this.pushLog({ t: ctx.now, dayIndex: t.dayIndex, id, name: ev.name, phase: 'start', source, season: t.season });
    busOf(this.sim).emit({ type: 'event', event: ev, phase: 'start' });
    chronicle(this.sim, `${ev.name}: ${ev.text}`, def.drama ?? 5, aboutOf(ev), ev.place);
    toast(this.sim, ev.name, def.kind === 'calamity' ? 'warn' : def.kind === 'festival' ? 'good' : 'info');
    return ev;
  }

  private end(ev: ActiveEvent): void {
    const def = EVENT_BY_ID[String(ev.data.def)];
    const ctx = this.ctx();
    const idx = this.sim.events.findIndex((e) => e.id === ev.id);
    if (idx >= 0) this.sim.events.splice(idx, 1);
    this.live.delete(ev.id);
    if (def) {
      try { def.onEnd(ctx, ev); } catch (e) { this.warn(def, 'onEnd', e); }
      for (const fu of def.followUps ?? []) {
        if (fu.chance !== undefined && !this.rng.chance(fu.chance)) continue;
        const at = fu.daysLater !== undefined ? minuteAt(ctx.time.dayIndex + fu.daysLater, fu.atHour ?? 10) : ctx.now + (fu.afterMin ?? 0);
        this.scheduled.push({ id: fu.id, at, opts: fu.opts?.(ev) ?? {}, label: fu.label, source: 'followup' });
      }
    }
    this.pushLog({ t: ctx.now, dayIndex: ctx.time.dayIndex, id: String(ev.data.def), name: ev.name, phase: 'end', source: String(ev.data.source ?? ''), season: ctx.time.season });
    busOf(this.sim).emit({ type: 'event', event: ev, phase: 'end' });
  }

  /* --------------------------------------------------------- planning */

  /** Once per day: roll every random event in season and schedule today's hits at seeded hours. */
  private planRandom(dayIndex: number, now: number): void {
    const t = timeFromMinute((dayIndex - 1) * MINUTES_PER_DAY);
    const hits: EventDef[] = [];
    for (const def of EVENTS) {
      if (def.when.kind !== 'random') continue;
      if (!this.inSeason(def, t.season) || this.onCooldown(def, dayIndex)) continue;
      const novelty = this.counts[def.id] ? 1 : 1.6;
      if (this.rng.chance(def.when.perDay * novelty)) hits.push(def);
    }
    this.rng.shuffle(hits);
    hits.sort((a, b) => (this.counts[a.id] ?? 0) - (this.counts[b.id] ?? 0));
    for (const def of hits.slice(0, MAX_RANDOM_PER_DAY)) {
      const [h0, h1] = def.when.kind === 'random' ? def.when.hours ?? DEFAULT_HOURS : DEFAULT_HOURS;
      const hour = this.rng.int(h0, h1) + (this.rng.chance(0.5) ? 0.5 : 0);
      let at = minuteAt(dayIndex, Math.min(hour, 23.5));
      if (at < now) at = now + this.rng.int(10, 90);
      this.scheduled.push({ id: def.id, at, opts: {}, source: 'random' });
    }
  }

  private inSeason(def: EventDef, season: Season): boolean { return !def.seasons || def.seasons.includes(season); }

  private onCooldown(def: EventDef, dayIndex: number): boolean {
    const last = this.history[def.id];
    if (last === undefined) return false;
    const cd = def.cooldownDays ?? 4;
    if (cd >= 100) { const y = this.yearFlags[def.id]; if (y !== undefined && y === timeFromMinute((dayIndex - 1) * MINUTES_PER_DAY).year) return true; return false; }
    return last + cd > dayIndex;
  }

  private activeOf(defId: string): ActiveEvent | undefined { return this.sim.events.find((e) => e.data?.def === defId); }

  private ctx(): EventCtx {
    const sim = this.sim;
    return {
      sim, world: sim.world, rng: this.rng, now: sim.world.time.minute, time: sim.world.time,
      fire: (id, opts) => this.fireInternal(id, opts ?? {}, 'chained'),
      schedule: (id, at, opts, label) => { this.scheduled.push({ id, at, opts: opts ?? {}, label, source: 'scheduled' }); },
      activeOf: (id) => this.activeOf(id),
      name: (id) => nameOf(sim, id),
    };
  }

  private pushLog(line: DirectorLogLine): void { this.log.push(line); if (this.log.length > LOG_CAP) this.log.splice(0, this.log.length - LOG_CAP); }

  private warn(def: EventDef, hook: string, e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    this.sim.log(`(event ${def.id}.${hook} failed: ${msg})`, 1);
  }

  /* -------------------------------------------------------- save/load */

  save(): unknown {
    const s: DirectorState = { v: 1, rng: this.rng.state, history: { ...this.history }, counts: { ...this.counts }, scheduled: this.scheduled.map((x) => ({ ...x, opts: { ...x.opts } })), lastDay: this.lastDay, lastHour: this.lastHour, seq: this.seq, requests: this.requests.save(), yearFlags: { ...this.yearFlags }, log: this.log.slice(-LOG_SAVE) };
    return s;
  }

  load(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const s = data as Partial<DirectorState>;
    if (typeof s.rng === 'number') this.rng.state = s.rng;
    this.history = { ...(s.history ?? {}) };
    this.counts = { ...(s.counts ?? {}) };
    this.scheduled = Array.isArray(s.scheduled) ? s.scheduled.map((x) => ({ ...x, opts: { ...(x.opts ?? {}) } })) : [];
    this.yearFlags = { ...(s.yearFlags ?? {}) };
    this.lastDay = typeof s.lastDay === 'number' ? s.lastDay : this.sim.world.time.dayIndex;
    this.lastHour = typeof s.lastHour === 'number' ? s.lastHour : this.sim.world.time.hour;
    this.seq = typeof s.seq === 'number' ? s.seq : 0;
    this.lastMinute = -1;
    this.requests.load(s.requests);
    this.log.length = 0;
    if (Array.isArray(s.log)) this.log.push(...s.log);
    // active events came back through sim.load(); re-apply anything that lives outside the saved data
    this.live.clear();
    const ctx = this.ctx();
    for (const ev of this.mine()) { this.live.set(ev.id, ev); const def = EVENT_BY_ID[String(ev.data.def)]; if (def?.onLoad) { try { def.onLoad(ctx, ev); } catch (e) { this.warn(def, 'onLoad', e); } } }
  }
}

/* ------------------------------------------------------------------ helpers */

function buildCalendar(sim: Sim): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  for (const def of EVENTS) {
    if (def.when.kind !== 'calendar') continue;
    const w = def.when;
    if (def.id === 'birthday') continue;
    if (w.day === undefined && w.weekday === undefined) continue;
    out.push({ defId: def.id, name: def.name, season: w.season ?? (def.seasons?.length === 1 ? def.seasons[0] : 'any'), day: w.day, weekday: w.weekday, hour: w.hour });
  }
  for (const v of sim.villagers) out.push({ defId: 'birthday', name: `${nameOf(sim, v.id)}'s birthday`, season: v.birthday.season, day: v.birthday.day, hour: 18, opts: { villager: v.id } });
  return out;
}

function calendarMatches(c: CalendarEntry, t: WorldTime): boolean {
  if (c.season && c.season !== 'any' && c.season !== t.season) return false;
  if (c.day !== undefined && c.day !== t.day) return false;
  if (c.weekday !== undefined && c.weekday !== t.weekday) return false;
  return true;
}

const calendarKey = (c: CalendarEntry): string => c.opts?.villager ? `${c.defId}:${String(c.opts.villager)}` : c.defId;

function aboutOf(ev: ActiveEvent): VillagerId[] | undefined {
  const d = ev.data;
  const ids: VillagerId[] = [];
  for (const k of ['villager', 'owner', 'to', 'a', 'b', 'trapped']) if (typeof d[k] === 'string') ids.push(String(d[k]));
  for (const k of ['sick', 'candidates']) if (Array.isArray(d[k])) for (const x of d[k] as unknown[]) if (typeof x === 'string') ids.push(x);
  return ids.length ? ids : undefined;
}

export const seasonDays = DAYS_PER_SEASON;
