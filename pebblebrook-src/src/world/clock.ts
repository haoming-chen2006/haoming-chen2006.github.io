import type { Bus } from '../core/bus.ts';
import { SeededRng } from '../core/rng.ts';
import { MINUTES_PER_DAY, START_MINUTE, timeFromMinute } from '../core/time.ts';
import type { Season, WeatherKind, WeatherState, WorldTime } from '../core/types.ts';

/* ------------------------------------------------------------ calendar */

export interface Festival { id: string; name: string; season: Season; day: number; hour: number; place: string }

export const FESTIVALS: Festival[] = [
  { id: 'bloom_fair', name: 'Spring Bloom Fair', season: 'spring', day: 13, hour: 10, place: 'festival_grounds' },
  { id: 'lantern_night', name: 'Midsummer Lantern Night', season: 'summer', day: 15, hour: 19, place: 'square' },
  { id: 'harvest_feast', name: 'Harvest Feast', season: 'autumn', day: 20, hour: 12, place: 'festival_grounds' },
  { id: 'winter_star', name: 'Winter Star', season: 'winter', day: 24, hour: 17, place: 'square' },
];

export function festivalOn(t: WorldTime): Festival | null {
  return FESTIVALS.find((f) => f.season === t.season && f.day === t.day) ?? null;
}

/* ------------------------------------------------------------- weather */

export interface WeatherSegment { hour: number; kind: WeatherKind; intensity: number }
export interface DayWeather { segments: WeatherSegment[]; dominant: WeatherKind; baseTemp: number }

const SEASON_WEIGHTS: Record<Season, [WeatherKind, number][]> = {
  spring: [['sunny', 40], ['cloudy', 22], ['rain', 30], ['storm', 4], ['fog', 4]],
  summer: [['sunny', 58], ['cloudy', 14], ['rain', 10], ['storm', 14], ['fog', 4]],
  autumn: [['sunny', 30], ['cloudy', 24], ['rain', 20], ['fog', 20], ['storm', 6]],
  winter: [['snow', 45], ['cloudy', 22], ['sunny', 20], ['fog', 10], ['rain', 3]],
};
const SEASON_TEMP: Record<Season, number> = { spring: 12, summer: 22, autumn: 11, winter: -2 };
const KIND_TEMP: Record<WeatherKind, number> = { sunny: 3, cloudy: 0, rain: -3, storm: -4, fog: -2, snow: -5 };

function pickWeighted<T>(rng: SeededRng, entries: [T, number][]): T {
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = rng.next() * total;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[entries.length - 1][0];
}

/** Weather for a day is a pure function of (seed, dayIndex): deterministic and load-proof. */
export function weatherForDay(seed: number, dayIndex: number, season: Season, festival: boolean): DayWeather {
  const rng = new SeededRng((seed ^ Math.imul(dayIndex + 11, 0x9e3779b1)) >>> 0).fork(31);
  let dominant = pickWeighted(rng, SEASON_WEIGHTS[season]);
  if (festival && (dominant === 'storm' || dominant === 'rain' || dominant === 'snow')) dominant = rng.chance(0.7) ? 'sunny' : 'cloudy';
  const segs: WeatherSegment[] = [];
  const seg = (hour: number, kind: WeatherKind, intensity = 0): void => { segs.push({ hour, kind, intensity }); };
  const wet = season === 'winter' ? 'snow' : 'rain';
  switch (dominant) {
    case 'sunny':
      if (rng.chance(0.3)) { seg(0, 'cloudy'); seg(rng.int(8, 10), 'sunny'); } else seg(0, 'sunny');
      if (season === 'summer' && rng.chance(0.15)) { seg(rng.int(15, 17), 'cloudy'); }
      break;
    case 'cloudy': {
      const r = rng.next();
      if (r < 0.5) seg(0, 'cloudy');
      else if (r < 0.8) { seg(0, 'cloudy'); seg(rng.int(13, 16), wet, rng.range(0.3, 0.6)); seg(rng.int(19, 22), 'cloudy'); }
      else { seg(0, 'cloudy'); seg(rng.int(11, 13), 'sunny'); }
      break;
    }
    case 'rain':
      if (rng.chance(0.6)) seg(0, 'rain', rng.range(0.4, 0.8));
      else { seg(0, 'cloudy'); seg(rng.int(7, 10), 'rain', rng.range(0.3, 0.7)); }
      if (rng.chance(0.3)) seg(rng.int(17, 20), 'cloudy');
      break;
    case 'storm': {
      seg(0, 'cloudy');
      const start = rng.int(12, 15);
      seg(start, 'rain', 0.6);
      seg(start + rng.int(1, 2), 'storm', rng.range(0.8, 1));
      seg(rng.int(20, 22), 'rain', 0.5);
      break;
    }
    case 'fog': {
      seg(0, 'fog', rng.range(0.5, 1));
      seg(rng.int(9, 11), rng.chance(0.6) ? 'cloudy' : 'sunny');
      if (season === 'autumn' && rng.chance(0.4)) seg(rng.int(18, 20), 'fog', 0.6);
      break;
    }
    case 'snow':
      if (rng.chance(0.6)) seg(0, 'snow', rng.range(0.3, 0.8));
      else { seg(0, 'cloudy'); seg(rng.int(9, 12), 'snow', rng.range(0.3, 0.9)); }
      if (rng.chance(0.25)) seg(rng.int(18, 21), 'cloudy');
      break;
  }
  segs.sort((a, b) => a.hour - b.hour);
  const baseTemp = SEASON_TEMP[season] + rng.range(-3, 3) + KIND_TEMP[dominant];
  return { segments: segs, dominant, baseTemp };
}

export function segmentAt(day: DayWeather, hour: number): WeatherSegment {
  let cur = day.segments[0];
  for (const s of day.segments) if (s.hour <= hour) cur = s;
  return cur;
}

export const isWet = (k: WeatherKind): boolean => k === 'rain' || k === 'storm' || k === 'snow';

/* --------------------------------------------------------------- clock */

export interface WeatherOverride { kind: WeatherKind; intensity: number; untilMinute: number }

export interface ClockSave { minute: number; frac: number; speed: number; paused: boolean; override: WeatherOverride | null }

/**
 * Minute-resolution clock with the daily weather plan. `tick` walks minute by minute so every hour,
 * weather change and day boundary fires exactly once and in order, no matter how large the step.
 */
export class Clock {
  readonly seed: number;
  private readonly bus: Bus;
  minute = START_MINUTE;
  private frac = 0;
  speed = 1;
  paused = false;
  time: WorldTime;
  weather: WeatherState;
  today: DayWeather;
  tomorrow: DayWeather;
  override: WeatherOverride | null = null;
  /** true once it has rained/snowed at any point today (crops count as watered) */
  rainedToday = false;
  /** hooks the world uses; called before the corresponding bus event */
  onNewDay: (dayIndex: number, rainedYesterday: boolean) => void = () => {};
  onWeather: (weather: WeatherState) => void = () => {};

  constructor(seed: number, bus: Bus) {
    this.seed = seed;
    this.bus = bus;
    this.time = timeFromMinute(this.minute);
    this.today = this.planFor(this.time.dayIndex);
    this.tomorrow = this.planFor(this.time.dayIndex + 1);
    this.weather = this.computeWeather();
    this.rainedToday = this.today.segments.some((s) => s.hour <= this.time.hour && isWet(s.kind));
  }

  private planFor(dayIndex: number): DayWeather {
    const t = timeFromMinute((dayIndex - 1) * MINUTES_PER_DAY);
    return weatherForDay(this.seed, dayIndex, t.season, festivalOn(t) !== null);
  }

  private computeWeather(): WeatherState {
    const t = this.time;
    const hour = t.hour + t.min / 60;
    const seg = segmentAt(this.today, hour);
    const ov = this.override && this.override.untilMinute > this.minute ? this.override : null;
    const kind = ov ? ov.kind : seg.kind;
    const intensity = ov ? ov.intensity : seg.intensity;
    const temp = this.today.baseTemp + 3 * Math.sin(((hour - 9) / 24) * Math.PI * 2) + KIND_TEMP[kind] * 0.5;
    return { kind, intensity, forecast: this.tomorrow.dominant, temperature: Math.round(temp * 10) / 10 };
  }

  festivalToday(): { id: string; name: string; hour: number } | null {
    const f = festivalOn(this.time);
    return f ? { id: f.id, name: f.name, hour: f.hour } : null;
  }

  /** Force the weather for `hours` (default: the rest of the day). Events use this. */
  forceWeather(kind: WeatherKind, intensity = 0.7, hours?: number): void {
    const endOfDay = this.time.dayIndex * MINUTES_PER_DAY;
    const until = hours === undefined ? endOfDay : Math.min(endOfDay, this.minute + Math.round(hours * 60));
    this.override = { kind, intensity, untilMinute: until };
    this.applyWeather();
  }

  /** recompute the weather from the plan; returns true when it changed */
  private refreshWeather(): boolean {
    const next = this.computeWeather();
    const changed = next.kind !== this.weather.kind || Math.abs(next.intensity - this.weather.intensity) > 0.01 || next.forecast !== this.weather.forecast;
    this.weather = next;
    if (isWet(next.kind)) this.rainedToday = true;
    return changed;
  }
  private applyWeather(): void { if (this.refreshWeather()) { this.onWeather(this.weather); this.bus.emit({ type: 'weather', weather: this.weather }); } }

  tick(minutes: number): void {
    if (!(minutes > 0)) return;
    this.frac += minutes;
    const whole = Math.floor(this.frac);
    if (whole <= 0) return;
    this.frac -= whole;
    for (let i = 0; i < whole; i++) this.step();
  }

  private step(): void {
    const prev = this.time;
    this.minute++;
    this.time = timeFromMinute(this.minute);
    const t = this.time;
    if (t.dayIndex !== prev.dayIndex) {
      this.today = this.tomorrow;
      this.tomorrow = this.planFor(t.dayIndex + 1);
      const rainedYesterday = this.rainedToday;
      this.rainedToday = false;
      if (this.override && this.override.untilMinute <= this.minute) this.override = null;
      const changed = this.refreshWeather();
      this.onNewDay(t.dayIndex, rainedYesterday);
      this.bus.emit({ type: 'newday', dayIndex: t.dayIndex });
      if (changed) { this.onWeather(this.weather); this.bus.emit({ type: 'weather', weather: this.weather }); }
    }
    if (t.hour !== prev.hour) {
      this.bus.emit({ type: 'hour', hour: t.hour });
      // weather segments and the temperature curve move on the hour
      if (this.override && this.override.untilMinute <= this.minute) this.override = null;
      this.applyWeather();
    } else if (this.override && this.override.untilMinute === this.minute) {
      this.override = null;
      this.applyWeather();
    }
  }

  save(): ClockSave { return { minute: this.minute, frac: this.frac, speed: this.speed, paused: this.paused, override: this.override ? { ...this.override } : null }; }

  load(s: Partial<ClockSave>): void {
    this.minute = typeof s.minute === 'number' ? s.minute : START_MINUTE;
    this.frac = typeof s.frac === 'number' ? s.frac : 0;
    this.speed = typeof s.speed === 'number' ? s.speed : 1;
    this.paused = !!s.paused;
    this.override = s.override ?? null;
    this.time = timeFromMinute(this.minute);
    this.today = this.planFor(this.time.dayIndex);
    this.tomorrow = this.planFor(this.time.dayIndex + 1);
    this.weather = this.computeWeather();
    this.rainedToday = this.today.segments.some((s2) => s2.hour <= this.time.hour && isWet(s2.kind));
  }
}
