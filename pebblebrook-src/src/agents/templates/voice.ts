/**
 * Slot filling and per-villager voice modulation shared by thoughts and dialogue.
 */
import type { Rng, Villager } from '../../core/types.ts';

export type Slots = Record<string, string | undefined>;

export function fill(template: string, slots: Slots): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => slots[k] ?? k).replace(/\s+([,;!?])/g, '$1').replace(/\s+\.(?!\.)/g, '.').replace(/\s{2,}/g, ' ').trim();
}

export const cap = (s: string): string => (s.length ? s[0].toUpperCase() + s.slice(1) : s);
/** lower-case a leading letter unless it starts a proper noun or the pronoun "I" */
export const lower = (s: string): string => (!s || /^I\b/.test(s) || PROPER.some((n) => s.startsWith(n)) ? s : s[0].toLowerCase() + s.slice(1));
const PROPER = ['Ada', 'Bram', 'Cerys', 'Dov', 'Elin', 'Finn', 'Greta', 'Hal', 'Ines', 'Jory', 'Pebblebrook', 'The ', 'Newcomer'];

const PRONOUN: Record<string, [string, string, string]> = { Ada: ['she', 'her', 'her'], Bram: ['he', 'his', 'him'], Cerys: ['she', 'her', 'her'], Dov: ['he', 'his', 'him'], Elin: ['she', 'her', 'her'], Finn: ['he', 'his', 'him'], Greta: ['she', 'her', 'her'], Hal: ['he', 'his', 'him'], Ines: ['she', 'her', 'her'], Jory: ['he', 'his', 'him'] };
/** "Finn gave Cerys cider", when Finn is the one telling it, becomes "he gave Cerys cider". */
export function pronounise(text: string, name: string): string {
  const pr = PRONOUN[name];
  if (!pr) return text;
  return text.replace(new RegExp(`^${name}'s\\b`), pr[1]).replace(new RegExp(`^${name} `), pr[0] + ' ').replace(new RegExp(`\\b${name}'s\\b`, 'g'), pr[1]).replace(new RegExp(`\\b${name}\\b`, 'g'), pr[2]);
}

/** Rewrite a third-person memory about `name` into first person ("Ada watered" → "I watered", "Ada's" → "my"). */
export function firstPerson(text: string, name: string): string {
  return text
    .replace(new RegExp(`\\b${name}'s\\b`, 'g'), 'my')
    .replace(new RegExp(`^${name} `), 'I ')
    .replace(new RegExp(`\\b${name} and I\\b`, 'g'), 'we')
    .replace(new RegExp(`\\b${name}\\b`, 'g'), 'me')
    .replace(/\bI is\b/g, 'I am').replace(/\bI was\b/g, 'I was').replace(/\bI has\b/g, 'I have').replace(/\bme (\w+ed)\b/g, 'I $1');
}

/** Apply a villager's verbal tics. Kept light so lines stay readable in a bubble. */
export function voice(v: Villager, text: string, rng: Rng): string {
  let t = text;
  const r = rng.next();
  switch (v.id) {
    case 'ada': if (r < 0.15) t = t.replace(/\.$/, '. Then back to it.'); break;
    case 'bram': {
      // short sentences; no exclamation marks
      t = t.replace(/!/g, '.');
      const parts = t.split(/(?<=[.?])\s+/);
      if (parts.length > 2) t = parts.slice(0, 2).join(' ');
      if (r < 0.2) t = 'Hm. ' + t;
      break;
    }
    case 'cerys': {
      if (r < 0.55) t = t.replace(/\.$/, '!');
      if (r > 0.8) t = 'Ooh, ' + lower(t);
      break;
    }
    case 'dov': t = t.replace(/!/g, '.'); if (r < 0.18) t = t.replace(/\.$/, '. Or not.'); break;
    case 'elin': if (r < 0.18) t = 'Sorry — ' + lower(t); else if (r > 0.85) t = t + ' I do worry.'; break;
    case 'finn': if (r < 0.3) t = t.replace(/\.$/, '!'); if (r > 0.8) t = 'Right then! ' + t; else if (r > 0.65) t = t + ' Ha!'; break;
    case 'greta': if (r < 0.2) t = 'Touch wood — ' + lower(t); break;
    case 'hal': if (r < 0.15) t = 'Now then. ' + t; else if (r > 0.85) t = t + ' Every coin counts.'; break;
    case 'ines': if (r < 0.2) t = 'Oh — ' + lower(t); else if (r > 0.85) t = t.replace(/\.$/, '...'); break;
    case 'jory': if (r < 0.18) t = 'Eh, ' + lower(t); else if (r > 0.85) t = t + ' No rush.'; break;
  }
  return cap(t);
}

export const timeOfDay = (hour: number): string => (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night');

export const WEATHER_PHRASE: Record<string, string[]> = {
  sunny: ['a fine day', 'sun on everything', 'a proper blue sky', 'warm enough to work in shirtsleeves'],
  cloudy: ['grey but dry', 'clouds sitting on the hill', 'a dull sort of day', 'sky like old washing'],
  rain: ['rain again', 'rain coming sideways', 'wet through', 'the kind of rain that gets in your boots'],
  storm: ['a real storm', 'thunder over the mine', 'wind fit to take the roof off', 'a filthy night for it'],
  fog: ['fog thick as bread', 'fog off the river', 'could not see the well from the bakery', 'fog again'],
  snow: ['snow on the road', 'snow up to the door', 'proper winter', 'snow squeaking underfoot'],
};

export const PROFESSION_WORK: Record<string, string> = {
  farmer: 'the farm', blacksmith: 'the forge', baker: 'the ovens', fisher: 'the river', doctor: 'the clinic', innkeeper: 'the Owl', miner: 'the mine', shopkeeper: 'the shop', librarian: 'the library', carpenter: 'the yard', none: 'things',
};
