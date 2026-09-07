import type { Season, WorldTime } from './types.ts';

export const MINUTES_PER_DAY = 24 * 60;
export const DAYS_PER_SEASON = 28;
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** the game starts on day 1 of spring at 6:00 */
export const START_MINUTE = 6 * 60;

export function timeFromMinute(minute: number): WorldTime {
  const dayIndex = Math.floor(minute / MINUTES_PER_DAY) + 1;
  const dayMin = minute - (dayIndex - 1) * MINUTES_PER_DAY;
  const hour = Math.floor(dayMin / 60), min = dayMin % 60;
  const seasonIndex = Math.floor((dayIndex - 1) / DAYS_PER_SEASON);
  const season = SEASONS[seasonIndex % 4];
  const year = Math.floor(seasonIndex / 4) + 1;
  const day = ((dayIndex - 1) % DAYS_PER_SEASON) + 1;
  const { sunrise, sunset } = daylightHours(season);
  return { minute, year, season, day, dayIndex, hour, min, weekday: (dayIndex - 1) % 7, isDaylight: hour + min / 60 >= sunrise && hour + min / 60 < sunset };
}

export function daylightHours(season: Season): { sunrise: number; sunset: number } {
  switch (season) {
    case 'spring': return { sunrise: 6, sunset: 19 };
    case 'summer': return { sunrise: 5.5, sunset: 20.5 };
    case 'autumn': return { sunrise: 6.5, sunset: 18.5 };
    case 'winter': return { sunrise: 7.5, sunset: 17 };
  }
}

export const fmtClock = (t: WorldTime): string => `${t.hour === 0 ? 12 : t.hour > 12 ? t.hour - 12 : t.hour}:${String(t.min).padStart(2, '0')} ${t.hour < 12 ? 'am' : 'pm'}`;
export const fmtDate = (t: WorldTime): string => `${WEEKDAYS[t.weekday]} ${t.day} ${t.season[0].toUpperCase()}${t.season.slice(1)}, Year ${t.year}`;
export const hourOf = (minute: number): number => (minute % MINUTES_PER_DAY) / 60;
