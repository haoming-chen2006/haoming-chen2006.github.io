import type { ItemId, Season, WeatherKind, WorldObject } from '../core/types.ts';

/* ------------------------------------------------------------------ fish */

export interface FishEntry {
  item: ItemId;
  /** base weight */
  w: number;
  seasons?: Season[];
  /** multiplier applied when it is raining or storming */
  rain?: number;
  /** multiplier at night (before sunrise / after sunset) */
  night?: number;
}

export const FISH_TABLES: Record<'river' | 'lake', FishEntry[]> = {
  river: [
    { item: 'trout', w: 40 },
    { item: 'perch', w: 18 },
    { item: 'carp', w: 14 },
    { item: 'salmon', w: 5, seasons: ['spring', 'autumn'], rain: 2.5 },
    { item: 'catfish', w: 4, rain: 8, night: 2 },
  ],
  lake: [
    { item: 'perch', w: 40 },
    { item: 'carp', w: 30 },
    { item: 'trout', w: 10 },
    { item: 'catfish', w: 5, rain: 7, night: 2 },
    { item: 'pearl', w: 1, seasons: ['summer'] },
  ],
};

/** The effective weighted table for a fish spot right now. Empty weights are dropped. */
export function fishTableFor(spot: WorldObject, season: Season, weather: WeatherKind, isDaylight = true): { item: ItemId; weight: number }[] {
  const water = (spot.data.water as 'river' | 'lake') ?? 'lake';
  const table = (spot.data.table as FishEntry[] | undefined) ?? FISH_TABLES[water];
  const wet = weather === 'rain' || weather === 'storm';
  const out: { item: ItemId; weight: number }[] = [];
  for (const e of table) {
    if (e.seasons && !e.seasons.includes(season)) continue;
    let weight = e.w;
    if (wet && e.rain) weight *= e.rain;
    if (!isDaylight && e.night) weight *= e.night;
    if (weight > 0) out.push({ item: e.item, weight });
  }
  return out;
}

/* ---------------------------------------------------------------- forage */

export type ForageArea = 'forest' | 'meadow' | 'hill' | 'orchard' | 'shore';

/** item weights per season and area; `chance` is the per-spot daily spawn probability */
export const FORAGE: Record<Season, { chance: number; items: Record<ForageArea, [ItemId, number][]> }> = {
  spring: {
    chance: 0.7,
    items: {
      forest: [['herbs', 35], ['wildflower', 25], ['mushroom', 15]],
      meadow: [['wildflower', 55], ['herbs', 25]],
      hill: [['herbs', 45], ['wildflower', 30]],
      orchard: [['wildflower', 40], ['herbs', 20]],
      shore: [['herbs', 30], ['wildflower', 20]],
    },
  },
  summer: {
    chance: 0.72,
    items: {
      forest: [['berries', 50], ['herbs', 20], ['mushroom', 8]],
      meadow: [['wildflower', 40], ['berries', 30], ['herbs', 15]],
      hill: [['berries', 35], ['herbs', 30]],
      orchard: [['berries', 30], ['wildflower', 25]],
      shore: [['berries', 25], ['herbs', 20]],
    },
  },
  autumn: {
    chance: 0.8,
    items: {
      forest: [['mushroom', 55], ['berries', 20], ['herbs', 10]],
      meadow: [['herbs', 30], ['mushroom', 25], ['wildflower', 15]],
      hill: [['mushroom', 40], ['herbs', 30]],
      orchard: [['mushroom', 35], ['herbs', 20]],
      shore: [['mushroom', 25], ['herbs', 25]],
    },
  },
  winter: {
    chance: 0.35,
    items: {
      forest: [['herbs', 35], ['mushroom', 10]],
      meadow: [['herbs', 30]],
      hill: [['herbs', 45]],
      orchard: [['herbs', 25]],
      shore: [['herbs', 25]],
    },
  },
};

/* --------------------------------------------------------------- animals */

export const ANIMALS: { species: 'cow' | 'hen' | 'sheep'; name: string; produce: ItemId }[] = [
  { species: 'cow', name: 'Buttercup', produce: 'milk' },
  { species: 'cow', name: 'Maisie', produce: 'milk' },
  { species: 'cow', name: 'Clover', produce: 'milk' },
  { species: 'sheep', name: 'Woolly', produce: 'wool' },
  { species: 'sheep', name: 'Nimbus', produce: 'wool' },
  { species: 'sheep', name: 'Dumpling', produce: 'wool' },
  { species: 'hen', name: 'Pip', produce: 'egg' },
  { species: 'hen', name: 'Dot', produce: 'egg' },
  { species: 'hen', name: 'Marigold', produce: 'egg' },
  { species: 'hen', name: 'Henrietta', produce: 'egg' },
];

/* ------------------------------------------------------------------ lore */

export const GRAVES: string[] = [
  'Alder Pennywort, mayor for forty years',
  'Old Wren, who baked for the village',
  'Tam Marlow, lost to the river',
  'Rosalind Thornfield, of the east farm',
  'Unknown traveller, found in the snow',
  'Pip — a good dog',
  'The Stoneleigh twins, miners both',
  'Brother Osric, who kept the chapel',
];

export const SIGNS: Record<string, string> = {
  square: 'Pebblebrook — pop. 11 (and a dog, sometimes)',
  farm: 'Thornfield Farm. Mind the hens.',
  mine: 'Pebblebrook Mine. Lamps out by dark.',
  dock: "Dov's dock. Quiet, please. The fish are listening.",
  forest: 'Old Wood. Forage freely, fell only what you need.',
  hill: 'To the Library on the hill.',
  lake: 'Stillwater Lake. No swimming after dusk.',
  graveyard: 'Rest, and be remembered.',
  player: 'Home sweet home.',
  festival: 'Festival grounds — see the notice board for dates.',
  orchard: 'The Orchard. Windfalls are free.',
  meadow: 'Wren Meadow.',
};

export const TREE_TYPES = ['oak', 'pine', 'birch', 'apple'] as const;
export type TreeType = typeof TREE_TYPES[number];
export const TREE_VARIANT: Record<TreeType, number> = { oak: 0, pine: 1, apple: 2, birch: 3 };
