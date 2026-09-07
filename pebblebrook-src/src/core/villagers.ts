import { PLACES } from './places.ts';
import type { Personality, Profession, ScheduleEntry, Season, SkillName, Villager, VillagerId } from './types.ts';

/** The cast. Data only; the sim turns each into a live Villager. */
export interface VillagerSpec {
  id: VillagerId;
  name: string;
  short: string;
  profession: Profession;
  home: string;
  workplace: string;
  personality: Personality;
  look: Villager['look'];
  birthday: { season: Season; day: number };
  money: number;
  skills: Partial<Record<SkillName, number>>;
  /** starting inventory item ids with quantities */
  inventory: [string, number][];
  /** starting opinions of others: id -> affinity */
  opinions: Record<VillagerId, number>;
  /** in one line, for the roster and prompts */
  blurb: string;
}

export const VILLAGERS: VillagerSpec[] = [
  {
    id: 'ada', name: 'Ada Thornfield', short: 'Ada', profession: 'farmer', home: PLACES.home_ada, workplace: PLACES.farm,
    personality: { openness: 0.4, conscientiousness: 0.9, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.3, traits: ['early riser', 'stubborn', 'generous', 'practical'],
      likes: ['vegetable', 'rustic', 'sunny', 'farming', 'honest work', 'stew'], dislikes: ['fancy', 'laziness', 'storm', 'gossip'],
      voice: 'Plain-spoken, warm, says what she means and then gets back to work.', dream: 'A harvest so big the whole village eats for free at the Harvest Feast.' },
    look: { skin: '#e8b78f', hair: '#6b3f1d', hairStyle: 2, outfit: '#8a5a2b', accent: '#d9c27a', hat: 1, build: 'medium', height: 24 },
    birthday: { season: 'spring', day: 9 }, money: 220, skills: { farming: 7, cooking: 3, crafting: 2 }, inventory: [['turnip_seed', 12], ['potato_seed', 8], ['hoe', 1], ['watering_can', 1], ['bread', 2]],
    opinions: { bram: 20, cerys: 30, jory: -10, hal: 5, dov: 15 }, blurb: 'Runs the farm on the east road. Up before the rooster, in bed before the owls.',
  },
  {
    id: 'bram', name: 'Bram Oakhollow', short: 'Bram', profession: 'blacksmith', home: PLACES.home_bram, workplace: PLACES.smithy,
    personality: { openness: 0.3, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.5, neuroticism: 0.4, traits: ['gruff', 'loyal', 'sentimental', 'proud'],
      likes: ['metal', 'ale', 'quiet', 'mining', 'strong coffee'], dislikes: ['nosy', 'sweet', 'rain', 'being rushed'],
      voice: 'Short sentences. Grunts more than he talks, but listens to everything.', dream: 'To forge one blade fine enough to be remembered by.' },
    look: { skin: '#c98d62', hair: '#2b1b12', hairStyle: 5, outfit: '#4a4a55', accent: '#9a3b2b', build: 'broad', height: 26 },
    birthday: { season: 'winter', day: 4 }, money: 340, skills: { crafting: 8, mining: 4, charm: 1 }, inventory: [['iron_bar', 3], ['copper_bar', 2], ['nails', 6], ['ale', 1]],
    opinions: { ada: 25, greta: 35, finn: 10, hal: -15, jory: 15 }, blurb: 'The smithy by the square. His anvil is the village clock.',
  },
  {
    id: 'cerys', name: 'Cerys Wren', short: 'Cerys', profession: 'baker', home: PLACES.home_cerys, workplace: PLACES.bakery,
    personality: { openness: 0.6, conscientiousness: 0.6, extraversion: 0.9, agreeableness: 0.8, neuroticism: 0.4, traits: ['cheerful', 'gossip', 'romantic', 'talkative'],
      likes: ['sweet', 'flower', 'social', 'festive', 'music', 'news'], dislikes: ['silence', 'fish', 'fog', 'rudeness'],
      voice: 'Bubbly, exclamation marks, always knows who said what to whom.', dream: 'A wedding cake for someone she loves — maybe her own.' },
    look: { skin: '#f1c9a8', hair: '#c94f3a', hairStyle: 1, outfit: '#e8e2d2', accent: '#d66f8a', build: 'slim', height: 23 },
    birthday: { season: 'summer', day: 14 }, money: 180, skills: { cooking: 8, charm: 6 }, inventory: [['flour', 6], ['honey', 2], ['sweet_roll', 3], ['bread', 4]],
    opinions: { ada: 30, ines: 25, finn: 20, jory: 35, dov: -5, hal: 10 }, blurb: 'Bakes before dawn and knows every rumour by noon.',
  },
  {
    id: 'dov', name: 'Dov Marlow', short: 'Dov', profession: 'fisher', home: PLACES.home_dov, workplace: PLACES.dock,
    personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.2, agreeableness: 0.6, neuroticism: 0.2, traits: ['patient', 'dry humour', 'loner', 'observant'],
      likes: ['fish', 'rain', 'quiet', 'stars', 'tea'], dislikes: ['crowds', 'festive', 'gossip', 'noise'],
      voice: 'Deadpan. Says one true thing and lets it sit there.', dream: 'To catch the great salmon everyone says is a story.' },
    look: { skin: '#d9a77b', hair: '#4a3b2a', hairStyle: 3, outfit: '#2f5f6e', accent: '#e0c070', hat: 2, build: 'medium', height: 25 },
    birthday: { season: 'autumn', day: 21 }, money: 150, skills: { fishing: 9, cooking: 4, lore: 3 }, inventory: [['fishing_rod', 1], ['perch', 3], ['trout', 1], ['tea', 2]],
    opinions: { ada: 15, elin: 20, greta: 10, cerys: -5, finn: 0 }, blurb: 'Lives by the dock. Talks to the river more than to people.',
  },
  {
    id: 'elin', name: 'Elin Vasque', short: 'Elin', profession: 'doctor', home: PLACES.home_elin, workplace: PLACES.clinic,
    personality: { openness: 0.7, conscientiousness: 0.9, extraversion: 0.4, agreeableness: 0.8, neuroticism: 0.7, traits: ['precise', 'anxious', 'kind', 'overworked'],
      likes: ['medicine', 'books', 'tea', 'calm', 'herbs'], dislikes: ['ale', 'recklessness', 'storm', 'mess'],
      voice: 'Careful, exact, apologises for worrying and then worries anyway.', dream: 'A whole season with nobody sick.' },
    look: { skin: '#f3d3bd', hair: '#1f1f2b', hairStyle: 4, outfit: '#f0f0f5', accent: '#6f8fc9', build: 'slim', height: 24 },
    birthday: { season: 'winter', day: 17 }, money: 260, skills: { medicine: 9, lore: 6, cooking: 3 }, inventory: [['tonic', 3], ['bandage', 5], ['herbs', 4], ['tea', 3]],
    opinions: { dov: 20, ines: 30, greta: 15, finn: -10, bram: 10 }, blurb: 'The clinic on the north lane. Treats everyone, sleeps too little.',
  },
  {
    id: 'finn', name: 'Finn Halloway', short: 'Finn', profession: 'innkeeper', home: PLACES.home_finn, workplace: PLACES.tavern,
    personality: { openness: 0.6, conscientiousness: 0.4, extraversion: 1.0, agreeableness: 0.7, neuroticism: 0.3, traits: ['loud', 'hospitable', 'spendthrift', 'storyteller'],
      likes: ['ale', 'social', 'music', 'festive', 'stew', 'stories'], dislikes: ['quiet', 'debt collectors', 'fog', 'early mornings'],
      voice: 'Booming, generous, every sentence is half a toast.', dream: 'The Drowsy Owl full every single night, and the bard back for good.' },
    look: { skin: '#d59a6d', hair: '#8a4b1f', hairStyle: 6, outfit: '#7a2e2e', accent: '#e9c27c', build: 'broad', height: 25 },
    birthday: { season: 'summer', day: 3 }, money: 120, skills: { cooking: 6, charm: 8 }, inventory: [['ale', 8], ['cider', 4], ['stew', 3]],
    opinions: { cerys: 20, bram: 10, jory: 25, hal: -20, greta: 15 }, blurb: 'Keeps The Drowsy Owl. Owes Hal money and everyone a drink.',
  },
  {
    id: 'greta', name: 'Greta Stoneleigh', short: 'Greta', profession: 'miner', home: PLACES.home_greta, workplace: PLACES.mine,
    personality: { openness: 0.5, conscientiousness: 0.6, extraversion: 0.6, agreeableness: 0.4, neuroticism: 0.5, traits: ['brave', 'blunt', 'superstitious', 'competitive'],
      likes: ['mining', 'gem', 'ale', 'storm', 'superstition', 'stories'], dislikes: ['fancy', 'cowardice', 'books', 'fog'],
      voice: 'Blunt, loud in the dark, touches wood before every sentence about luck.', dream: 'To find the vein of gold her grandmother swore was down there.' },
    look: { skin: '#c9855c', hair: '#3a2a20', hairStyle: 7, outfit: '#5a4630', accent: '#c8a45a', hat: 3, build: 'medium', height: 24 },
    birthday: { season: 'autumn', day: 6 }, money: 90, skills: { mining: 8, crafting: 3 }, inventory: [['pickaxe', 1], ['copper_ore', 5], ['iron_ore', 2], ['horseshoe', 1]],
    opinions: { bram: 35, finn: 15, elin: 10, ines: -15, hal: 0 }, blurb: 'Comes up from the mine grey with dust and grinning.',
  },
  {
    id: 'hal', name: 'Hal Pennywort', short: 'Hal', profession: 'shopkeeper', home: PLACES.home_hal, workplace: PLACES.store,
    personality: { openness: 0.3, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.3, neuroticism: 0.5, traits: ['shrewd', 'nosy', 'cautious', 'penny-pinching'],
      likes: ['money', 'news', 'fancy', 'order', 'tea'], dislikes: ['debt', 'waste', 'rain', 'haggling'],
      voice: 'Polite, precise, every kindness has a ledger entry.', dream: 'To be respected as much as he is needed.' },
    look: { skin: '#eec39a', hair: '#8c8c8c', hairStyle: 8, outfit: '#3d5a3a', accent: '#d8d0b0', hat: 4, build: 'slim', height: 24 },
    birthday: { season: 'spring', day: 24 }, money: 600, skills: { charm: 4, lore: 3 }, inventory: [['bread', 3], ['candle', 4], ['nails', 4], ['fertiliser', 3]],
    opinions: { finn: -25, ada: 10, cerys: 10, bram: -10, ines: 5 }, blurb: 'The General Store. Knows what everyone bought and what they could not afford.',
  },
  {
    id: 'ines', name: 'Ines Calloway', short: 'Ines', profession: 'librarian', home: PLACES.home_ines, workplace: PLACES.library,
    personality: { openness: 0.95, conscientiousness: 0.6, extraversion: 0.25, agreeableness: 0.8, neuroticism: 0.6, traits: ['curious', 'shy', 'idealist', 'dreamer'],
      likes: ['books', 'lore', 'mystery', 'stars', 'poetry', 'rain'], dislikes: ['loud', 'ale', 'cruelty', 'haggling'],
      voice: 'Quiet, careful, lights up mid-sentence when a subject catches her.', dream: 'To finish the history of Pebblebrook that nobody asked her to write.' },
    look: { skin: '#f5d6c0', hair: '#5a3b8f', hairStyle: 9, outfit: '#6c5b9e', accent: '#e8d8f0', build: 'slim', height: 23 },
    birthday: { season: 'winter', day: 25 }, money: 140, skills: { lore: 9, charm: 3, medicine: 2 }, inventory: [['book', 3], ['poetry', 1], ['tea', 2], ['map_fragment', 1]],
    opinions: { elin: 30, cerys: 20, dov: 15, greta: -10, jory: 10 }, blurb: 'The library on the hill. Reads to whoever wanders in.',
  },
  {
    id: 'jory', name: 'Jory Fenn', short: 'Jory', profession: 'carpenter', home: PLACES.home_jory, workplace: PLACES.carpenter,
    personality: { openness: 0.8, conscientiousness: 0.3, extraversion: 0.7, agreeableness: 0.8, neuroticism: 0.2, traits: ['easy-going', 'lazy', 'artistic', 'flirt'],
      likes: ['crafting', 'music', 'cider', 'sunny', 'flower', 'naps'], dislikes: ['deadlines', 'rain', 'ledgers', 'early mornings'],
      voice: 'Relaxed, teasing, would rather whittle a bird than finish a fence.', dream: 'To build a bandstand in the square and play the first song on it.' },
    look: { skin: '#dba578', hair: '#e0b25c', hairStyle: 10, outfit: '#5d7b3f', accent: '#c96a3c', build: 'medium', height: 25 },
    birthday: { season: 'spring', day: 17 }, money: 110, skills: { crafting: 7, charm: 6, lore: 2 }, inventory: [['wood', 10], ['nails', 3], ['toy_boat', 1], ['cider', 2]],
    opinions: { cerys: 35, finn: 25, ada: -5, bram: 15, ines: 15 }, blurb: 'The yard behind the tavern. Half-finished chairs and a lot of whistling.',
  },
];

export const VILLAGER_BY_ID: Record<VillagerId, VillagerSpec> = Object.fromEntries(VILLAGERS.map((v) => [v.id, v]));

/** Profession day templates; the sim personalises them (early risers shift earlier, etc.). */
export const SCHEDULES: Record<Profession, ScheduleEntry[]> = {
  farmer: [{ hour: 5.5, block: 'breakfast' }, { hour: 6.5, block: 'work' }, { hour: 12, block: 'lunch' }, { hour: 13, block: 'work' }, { hour: 17, block: 'free' }, { hour: 19, block: 'dinner' }, { hour: 20, block: 'social' }, { hour: 21.5, block: 'sleep' }],
  blacksmith: [{ hour: 7, block: 'breakfast' }, { hour: 8, block: 'work' }, { hour: 12.5, block: 'lunch' }, { hour: 13.5, block: 'work' }, { hour: 18, block: 'free' }, { hour: 19.5, block: 'dinner' }, { hour: 20.5, block: 'social' }, { hour: 22.5, block: 'sleep' }],
  baker: [{ hour: 4.5, block: 'work' }, { hour: 8, block: 'breakfast' }, { hour: 9, block: 'work' }, { hour: 13, block: 'lunch' }, { hour: 14, block: 'free' }, { hour: 16, block: 'social' }, { hour: 19, block: 'dinner' }, { hour: 20, block: 'social' }, { hour: 21, block: 'sleep' }],
  fisher: [{ hour: 5, block: 'work' }, { hour: 9, block: 'breakfast' }, { hour: 10, block: 'work' }, { hour: 13, block: 'lunch' }, { hour: 14, block: 'free' }, { hour: 17, block: 'work' }, { hour: 19.5, block: 'dinner' }, { hour: 20.5, block: 'free' }, { hour: 22, block: 'sleep' }],
  doctor: [{ hour: 6.5, block: 'breakfast' }, { hour: 8, block: 'work' }, { hour: 12.5, block: 'lunch' }, { hour: 13.5, block: 'work' }, { hour: 18, block: 'free' }, { hour: 19.5, block: 'dinner' }, { hour: 20.5, block: 'free' }, { hour: 23, block: 'sleep' }],
  innkeeper: [{ hour: 8.5, block: 'breakfast' }, { hour: 10, block: 'chores' }, { hour: 12, block: 'work' }, { hour: 15, block: 'free' }, { hour: 17, block: 'work' }, { hour: 19, block: 'dinner' }, { hour: 19.5, block: 'work' }, { hour: 23.5, block: 'sleep' }],
  miner: [{ hour: 6.5, block: 'breakfast' }, { hour: 7.5, block: 'work' }, { hour: 12.5, block: 'lunch' }, { hour: 13.5, block: 'work' }, { hour: 17, block: 'free' }, { hour: 19, block: 'dinner' }, { hour: 20, block: 'social' }, { hour: 22, block: 'sleep' }],
  shopkeeper: [{ hour: 6.5, block: 'breakfast' }, { hour: 8, block: 'work' }, { hour: 12.5, block: 'lunch' }, { hour: 13, block: 'work' }, { hour: 18, block: 'chores' }, { hour: 19, block: 'dinner' }, { hour: 20, block: 'free' }, { hour: 22, block: 'sleep' }],
  librarian: [{ hour: 7.5, block: 'breakfast' }, { hour: 9, block: 'work' }, { hour: 12.5, block: 'lunch' }, { hour: 13.5, block: 'work' }, { hour: 17.5, block: 'free' }, { hour: 19, block: 'dinner' }, { hour: 20, block: 'free' }, { hour: 23, block: 'sleep' }],
  carpenter: [{ hour: 8.5, block: 'breakfast' }, { hour: 9.5, block: 'work' }, { hour: 12.5, block: 'lunch' }, { hour: 14, block: 'work' }, { hour: 16.5, block: 'free' }, { hour: 19, block: 'dinner' }, { hour: 20, block: 'social' }, { hour: 23, block: 'sleep' }],
  none: [{ hour: 7, block: 'breakfast' }, { hour: 8, block: 'free' }, { hour: 12.5, block: 'lunch' }, { hour: 13.5, block: 'free' }, { hour: 19, block: 'dinner' }, { hour: 20, block: 'social' }, { hour: 22.5, block: 'sleep' }],
};

export const PLAYER_LOOK: Villager['look'] = { skin: '#e9bd96', hair: '#3b2a1a', hairStyle: 0, outfit: '#3f6fb0', accent: '#f0d68a', build: 'medium', height: 24 };
