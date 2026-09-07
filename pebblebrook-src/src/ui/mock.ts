/**
 * A fake UiContext for developing the UI on its own (public/ui-preview.html). Ten villagers with
 * plausible state, a clock that runs, a chronicle that keeps growing, shops, requests, events, and
 * procedurally drawn portraits/icons standing in for the art module. Nothing here is imported by the game.
 */
import type { Art, AudioSystem, CharacterSprites, Director, InputState, LlmSettings, PlayerController, Renderer, Sim, SpriteRect, UiContext } from '../core/app.ts';
import { bus } from '../core/bus.ts';
import { ITEMS, item as itemDef } from '../core/items.ts';
import { PLACES } from '../core/places.ts';
import { SeededRng } from '../core/rng.ts';
import { MINUTES_PER_DAY, timeFromMinute } from '../core/time.ts';
import type { ActiveEvent, Brain, ConversationState, ConversationTurn, Dir, ItemId, ItemStack, Memory, MemoryKind, Place, PlayerState, RelationLabel, Relationship, Request, Season, SkillName, Vec, Villager, VillagerId, WeatherKind, WeatherState, World, WorldObject } from '../core/types.ts';
import { PLAYER_LOOK, SCHEDULES, VILLAGERS } from '../core/villagers.ts';

export interface MockControls {
  /** force the hover pick to a villager (null = follow the fake layout under the mouse) */
  hover(id: VillagerId | null): void;
  screenPos(id: VillagerId): Vec;
  llm(on: boolean): void;
  /** push a fresh chronicle line (ticker test) */
  happen(): void;
  villager(id: VillagerId): Villager;
  drawBackdrop(canvas: HTMLCanvasElement): void;
}

const PLACE_NAMES: Record<string, string> = {
  home_ada: "Ada's farmhouse", home_bram: "Bram's cottage", home_cerys: "Cerys' rooms", home_dov: "Dov's shack", home_elin: "Elin's house",
  home_finn: "Finn's loft", home_greta: "Greta's cabin", home_hal: "Hal's townhouse", home_ines: "Ines' cottage", home_jory: "Jory's hut", home_player: 'Your cottage',
  farm: 'Thornfield Farm', barn: 'The barn', smithy: 'The Smithy', bakery: 'Wren Bakery', dock: 'Fish dock', clinic: 'The Clinic', tavern: 'The Drowsy Owl',
  mine: 'Mine entrance', store: 'General Store', library: 'The Library', carpenter: "Carpenter's yard", square: 'Village square', well: 'The well', board: 'Notice board',
  chapel: 'The chapel', festival_grounds: 'Festival grounds', forest: 'The forest', lake: 'The lake', river: 'The river', orchard: 'The orchard', graveyard: 'Graveyard',
  meadow: 'The meadow', hill: 'Library hill', bridge_east: 'East bridge', bridge_west: 'West bridge', player_farm: 'Your plot',
};
const PLACE_KIND: Record<string, Place['kind']> = { farm: 'farm', barn: 'farm', smithy: 'workplace', bakery: 'shop', dock: 'workplace', clinic: 'workplace', tavern: 'shop', mine: 'workplace', store: 'shop', library: 'public', carpenter: 'workplace', square: 'public', well: 'landmark', board: 'landmark', chapel: 'landmark', festival_grounds: 'public', forest: 'nature', lake: 'nature', river: 'nature', orchard: 'nature', graveyard: 'landmark', meadow: 'nature', hill: 'nature', bridge_east: 'landmark', bridge_west: 'landmark', player_farm: 'farm' };
const SHOP_STOCK: Record<string, [ItemId, number][]> = {
  store: [['turnip_seed', 30], ['potato_seed', 20], ['strawberry_seed', 12], ['fertiliser', 10], ['bread', 4], ['candle', 6], ['nails', 12], ['hoe', 1], ['watering_can', 1], ['book', 2], ['scarf', 1], ['lantern', 2], ['tea', 5], ['coffee', 5]],
  bakery: [['bread', 8], ['sweet_roll', 6], ['berry_pie', 1], ['flour', 4]],
  tavern: [['ale', 20], ['cider', 10], ['stew', 6], ['fish_soup', 3], ['roast_veg', 4]],
  smithy: [['pickaxe', 1], ['axe', 1], ['horseshoe', 3], ['nails', 20], ['iron_bar', 2], ['copper_bar', 3]],
  clinic: [['tonic', 4], ['bandage', 8], ['tea', 4], ['herbs', 6]],
  carpenter: [['chair', 2], ['birdhouse', 3], ['toy_boat', 2], ['fishing_rod', 1], ['bookshelf', 1]],
  library: [['book', 5], ['poetry', 2]],
  dock: [['trout', 4], ['perch', 6], ['carp', 3], ['catfish', 1]],
  farm: [['turnip', 10], ['potato', 8], ['egg', 12], ['milk', 6], ['wool', 3]],
};

interface ActionSpec { tool: string; label: string; thought: string }
const ACTIONS: Record<VillagerId, ActionSpec[]> = {
  ada: [{ tool: 'water', label: 'Watering the turnips', thought: 'If the rain holds off these will want a second pass by noon.' }, { tool: 'harvest', label: 'Harvesting potatoes', thought: 'Good soil this year. Hal can wait for his share.' }],
  bram: [{ tool: 'forge', label: 'Forging horseshoes', thought: 'Two more for the cart horse. Then the blade. Always then the blade.' }, { tool: 'rest', label: 'Resting by the forge', thought: 'Shoulder aches. Nobody needs to know that.' }],
  cerys: [{ tool: 'bake', label: 'Baking sweet rolls', thought: 'Jory said he liked the honey ones. Extra honey then!' }, { tool: 'gossip', label: 'Chatting with Jory', thought: 'He has flour on his sleeve and he has not even been in the bakery. Curious!' }],
  dov: [{ tool: 'fish', label: 'Fishing off the dock', thought: 'Third cast. The river is thinking about it.' }, { tool: 'stroll', label: 'Walking the riverbank', thought: 'Fog coming. Fish like fog. So do I.' }],
  elin: [{ tool: 'treat', label: 'Treating Greta’s cough', thought: 'Dust in her lungs again. She will not listen, but I will say it anyway.' }, { tool: 'read', label: 'Reading a medical text', thought: 'Elderflower for fever. I should ask Ines whether the library has the second volume.' }],
  finn: [{ tool: 'serve_drinks', label: 'Serving at the Owl', thought: 'Three regulars and a stranger. A stranger means a story.' }, { tool: 'chores', label: 'Sweeping the taproom', thought: 'Hal will be by for his money. He can have a drink instead.' }],
  greta: [{ tool: 'mine', label: 'Mining in the east shaft', thought: 'Grandmother swore the gold was under the third fork. Touch wood.' }, { tool: 'drink', label: 'Drinking at the Owl', thought: 'One ale for the dust, one for the luck.' }],
  hal: [{ tool: 'open_shop', label: 'Minding the store', thought: 'Cerys bought three candles. Three! Someone is having a dinner.' }, { tool: 'restock', label: 'Restocking shelves', thought: 'Seed prices up two coins. Ada will grumble. Ada always grumbles.' }],
  ines: [{ tool: 'catalogue_books', label: 'Cataloguing the shelves', thought: 'The old parish register mentions a bridge that is not on any map.' }, { tool: 'write_book', label: 'Writing the village history', thought: 'Chapter four. Nobody will read it. I will write it anyway.' }],
  jory: [{ tool: 'craft_furniture', label: 'Carving a chair leg', thought: 'Could be a chair leg. Could be a bird. We will see who it wants to be.' }, { tool: 'nap', label: 'Napping in the yard', thought: 'The fence can wait. The sun cannot.' }],
};

const MEM_BANK: Record<VillagerId, [MemoryKind, string, number, string[], VillagerId[]?][]> = {
  ada: [['observation', 'Ada watered all twelve turnip rows before the sun cleared the hill.', 2, ['farming', 'work']], ['conversation', 'Cerys stopped by the farm and traded two sweet rolls for a basket of eggs. She talked the whole time.', 4, ['trade', 'friends'], ['cerys']], ['observation', 'Jory promised to fix the barn door on Tuesday. It is Thursday.', 5, ['jory', 'promise'], ['jory']], ['reflection', 'I keep letting Jory off because he makes people laugh. That is not a reason to leave a door hanging.', 6, ['jory', 'reflection'], ['jory']], ['event', 'Crows got into the corn overnight. Lost a row.', 6, ['crops', 'calamity']], ['gossip', 'Hal told me Finn owes him forty coins. Hal tells everyone that.', 3, ['finn', 'hal', 'money'], ['finn', 'hal']], ['plan', 'Tomorrow: till the south plots and plant potatoes before the rain.', 3, ['plan', 'farming']], ['observation', 'Bram sharpened the hoe without asking for a coin. Grunted when I thanked him.', 4, ['bram', 'kindness'], ['bram']]],
  bram: [['observation', 'Bram finished a set of horseshoes for the miller’s cart.', 2, ['work', 'forge']], ['conversation', 'Greta came by with copper ore and stayed to talk about the east shaft. She thinks there is gold.', 5, ['greta', 'mining'], ['greta']], ['reflection', 'Greta laughs at her own bad luck. I would rather hear that than most people’s good news.', 6, ['greta', 'reflection'], ['greta']], ['observation', 'Hal asked whether I would sell the smithy sign. Told him no. Twice.', 4, ['hal'], ['hal']], ['event', 'The travelling merchant set up by the square with strange steel.', 5, ['merchant', 'metal']], ['plan', 'Save iron for the blade. Not this week. Maybe next.', 3, ['goal', 'blade']], ['observation', 'Rain got into the coal store. Wet coal, bad temper.', 3, ['weather', 'rain']]],
  cerys: [['observation', 'Cerys sold out of sweet rolls by ten. A record!', 3, ['bakery', 'work']], ['gossip', 'Ines was seen leaving the clinic at dusk. Elin says it was about books. Books! At dusk!', 5, ['ines', 'elin', 'romance'], ['ines', 'elin']], ['conversation', 'Jory came in for bread and stayed for an hour. He whistled the whole time. I did not mind.', 6, ['jory', 'romance'], ['jory']], ['reflection', 'I talk about everyone else’s heart so I do not have to talk about mine.', 7, ['reflection', 'romance']], ['observation', 'Dov walked past the bakery without looking in. He never looks in.', 2, ['dov'], ['dov']], ['event', 'Ada said the Harvest Feast will be at the farm this year. I am doing the cake.', 6, ['festival', 'ada'], ['ada']], ['plan', 'Bake extra bread for Finn on Friday; the Owl has a bard coming.', 3, ['plan', 'finn'], ['finn']]],
  dov: [['observation', 'Dov caught a catfish in the rain. The best kind of morning.', 3, ['fishing', 'rain']], ['observation', 'Elin came to the dock to ask for perch for a broth. She looked tired.', 4, ['elin'], ['elin']], ['reflection', 'The river tells you everything if you stop asking.', 5, ['reflection', 'river']], ['conversation', 'Ada wanted fish for the feast. Told her the great salmon is not for feasts.', 4, ['ada', 'festival'], ['ada']], ['gossip', 'Cerys says Jory is sweet on someone. Cerys says a lot.', 2, ['cerys', 'jory'], ['cerys', 'jory']], ['plan', 'Fish the lake at dawn; the fog will bring the perch up.', 3, ['plan', 'fishing']]],
  elin: [['observation', 'Elin treated Greta for a cough and told her, again, to wear the mask in the shaft.', 4, ['greta', 'clinic'], ['greta']], ['conversation', 'Ines brought the herbal volume from the library and stayed to talk. I forgot to worry for an hour.', 6, ['ines', 'books'], ['ines']], ['reflection', 'I cannot keep the whole village well by myself, and I keep trying anyway.', 7, ['reflection', 'worry']], ['observation', 'Finn came in with a burnt hand and a story about it. The story was longer than the burn.', 3, ['finn'], ['finn']], ['event', 'Three people with the same cough this week. Something is going around.', 6, ['illness', 'event']], ['plan', 'Restock tonic; ask Dov for perch; sleep before midnight for once.', 3, ['plan']]],
  finn: [['observation', 'Finn kept the Owl open past midnight for Greta and Bram. Good night, good coin, none of it kept.', 3, ['tavern', 'work']], ['conversation', 'Hal came for his forty coins. Gave him a cider and a promise. He took the cider.', 5, ['hal', 'money'], ['hal']], ['reflection', 'A full room is worth more than a full purse. Hal will never understand that, and he will always be richer.', 6, ['reflection', 'hal'], ['hal']], ['gossip', 'Jory says a bard is walking the north road. If he comes, I am not letting him leave.', 5, ['bard', 'jory'], ['jory']], ['observation', 'Cerys dropped off six loaves and three rumours.', 3, ['cerys'], ['cerys']], ['plan', 'Friday: music night. Ask Jory to play. Beg if needed.', 4, ['plan', 'jory'], ['jory']]],
  greta: [['observation', 'Greta found a copper vein in the east shaft. Not gold. Not yet.', 4, ['mining', 'work']], ['conversation', 'Bram said the copper was good. From Bram that is a speech.', 5, ['bram'], ['bram']], ['reflection', 'Every time I say the word gold something falls on my foot. Touch wood.', 5, ['reflection', 'luck']], ['observation', 'Elin nagged about the mask. She means well. She always means well.', 3, ['elin'], ['elin']], ['gossip', 'Ines has a map of the old mine. Ines! Who does not like the mine!', 4, ['ines', 'map'], ['ines']], ['event', 'A rumble in the lower tunnel. Nobody hurt. This time.', 7, ['calamity', 'mine']]],
  hal: [['observation', 'Hal sold three candles to Cerys, two to Elin, and none to Finn, who owes forty coins.', 3, ['store', 'work']], ['conversation', 'Finn paid in cider again. I have a ledger, not a cellar.', 5, ['finn', 'money'], ['finn']], ['reflection', 'They come to me when they need something and to Finn when they want something. I know which I would rather be, and it is not this.', 7, ['reflection', 'respect']], ['observation', 'Ada haggled over seed prices and won. She always wins.', 3, ['ada'], ['ada']], ['gossip', 'Bram was asked about his sign by the merchant. Bram said no. I could have got a better no.', 2, ['bram', 'merchant'], ['bram']], ['plan', 'Raise fertiliser to fourteen when Ada is not looking.', 2, ['plan', 'prices']]],
  ines: [['observation', 'Ines found a parish record from before the west bridge was built.', 5, ['history', 'books']], ['conversation', 'Elin and I talked about elderflower and old bridges until the candle went out.', 6, ['elin', 'books'], ['elin']], ['reflection', 'I am not shy. I am waiting for a subject worth being loud about.', 6, ['reflection']], ['observation', 'Greta laughed at the history book. Then she borrowed it.', 4, ['greta'], ['greta']], ['gossip', 'Cerys thinks I am courting someone. Cerys thinks everyone is courting someone.', 3, ['cerys'], ['cerys']], ['plan', 'Chapter five: the mine. Ask Greta what the tunnels look like.', 3, ['plan', 'greta'], ['greta']]],
  jory: [['observation', 'Jory carved a wren for the bakery windowsill instead of finishing Ada’s barn door.', 3, ['crafting', 'cerys'], ['cerys']], ['conversation', 'Cerys laughed at the wren and gave me a roll for it. Worth a door.', 6, ['cerys', 'romance'], ['cerys']], ['reflection', 'Ada is right about the door. She is right about most things, which is why nobody likes hearing it.', 5, ['reflection', 'ada'], ['ada']], ['observation', 'Finn wants music on Friday. The lute needs a string. Bram might have wire.', 3, ['finn', 'music'], ['finn']], ['plan', 'Fix the barn door. Really. Tuesday. A Tuesday.', 4, ['plan', 'ada'], ['ada']], ['event', 'The merchant had a lute string. Bought it instead of nails.', 4, ['merchant', 'music']]],
};

const CHRONICLE: [string, number, VillagerId[]][] = [
  ['Cerys opened the bakery before dawn; the smell of bread reached the square by six.', 2, ['cerys']],
  ['Ada and Bram argued about the price of a hoe and settled it with a handshake.', 4, ['ada', 'bram']],
  ['Dov caught a catfish the size of a cat. Finn has already told the story twice.', 5, ['dov', 'finn']],
  ['Greta came up from the mine with copper and a rumour about gold.', 4, ['greta']],
  ['Elin treated three villagers for the same cough. Something is going around.', 6, ['elin']],
  ['Jory carved a wren for Cerys and forgot Ada’s barn door again.', 5, ['jory', 'cerys', 'ada']],
  ['Hal raised the price of fertiliser. Ada noticed within the hour.', 3, ['hal', 'ada']],
  ['Ines found a record of a bridge that no longer exists.', 5, ['ines']],
  ['A travelling merchant set up a stall in the square with goods from over the hills.', 7, []],
  ['Finn kept The Drowsy Owl open late for Greta and Bram.', 3, ['finn', 'greta', 'bram']],
  ['Crows got into the farm corn overnight. Ada lost a row.', 6, ['ada']],
  ['Cerys told Dov that Jory was sweet on someone. Dov said nothing, which Cerys took as agreement.', 4, ['cerys', 'dov', 'jory']],
  ['Rain moved in over the lake by noon; the dock emptied out.', 3, ['dov']],
  ['Elin and Ines talked at the clinic until the candle burned out.', 5, ['elin', 'ines']],
  ['Bram sharpened Ada’s hoe and refused payment.', 4, ['bram', 'ada']],
  ['A rumble in the lower mine tunnel. Nobody hurt.', 7, ['greta']],
  ['Hal called at the tavern for his forty coins and left with a cider.', 4, ['hal', 'finn']],
  ['Greta borrowed a history book from Ines, laughing the whole way.', 3, ['greta', 'ines']],
  ['Jory bought a lute string from the merchant instead of nails.', 3, ['jory']],
  ['Ada announced the Harvest Feast will be held at the farm this year.', 8, ['ada']],
  ['You arrived in Pebblebrook and moved into the cottage by the west bridge.', 9, []],
  ['Cerys gave you a sweet roll “to welcome you properly”.', 5, ['cerys']],
  ['Finn toasted your arrival at the Owl. Twice.', 4, ['finn']],
  ['Dov and Elin shared a pot of tea on the dock.', 4, ['dov', 'elin']],
  ['Greta and Bram were seen at the forge past closing, arguing happily about ore.', 4, ['greta', 'bram']],
  ['Ines read to a crowd of two in the library. Both stayed to the end.', 3, ['ines']],
  ['Jory fell asleep in the carpenter’s yard with a half-carved bird on his chest.', 2, ['jory']],
  ['Hal counted his coins twice and found one missing. He suspects Finn.', 4, ['hal', 'finn']],
  ['Fog rolled off the river; Dov went out anyway.', 3, ['dov']],
  ['Cerys and Jory were caught sharing a roll behind the bakery. Cerys denies everything.', 6, ['cerys', 'jory']],
];

const LINES: Record<string, string[]> = {
  greet: ['Oh! Hello there. Didn’t see you come up the lane.', 'Well, look who it is. Come to see how the other half lives?', 'Morning. Or is it afternoon? The day runs together.', 'Ah, good — I was hoping someone would stop by.'],
  day: ['Busy! There’s never enough hours and never enough hands, but I like it that way.', 'Quiet, mostly. The kind of quiet that makes you notice small things.', 'Long. My feet ache and my purse doesn’t. Ask me again after supper.'],
  gossip: ['Well… you didn’t hear it from me, but Jory’s been in the bakery every morning this week. Every morning!', 'Hal says Finn owes him forty coins. Finn says Hal owes him a sense of humour.', 'Greta swears there’s gold under the east shaft. She also swears the well is haunted, so.'],
  help: ['Actually, yes. If you come across any wild berries, I’d pay well for three or four handfuls.', 'Not right now — but check the board by the well. Half the village is asking for something.', 'A hand with the barn door would be worth a hot meal. Jory keeps not showing up.'],
  joke: ['Ha! That’s terrible. Tell it to Finn, he’ll put it on the wall.', 'Hm. I think I’ve heard Dov tell that one. It was funnier when he didn’t smile.', 'Oh, that’s dreadful. Do you have another?'],
  compliment: ['You’re kind to say so. Most people just want bread.', 'Flattery! I like it. Carry on.', 'Well now. That’s… thank you. Nobody’s said that in a while.'],
  about: ['Hmm. Good sort, mostly. Keeps to themselves more than they should.', 'Oh, we go way back. Not always happily, but back.', 'I don’t like to speak ill. I’ll just say we don’t agree about much and leave it there.'],
  trade: ['Have a look at what I’ve got. Prices are fair; Hal’s are not.', 'Take your pick. I can always make more.'],
  chat: ['That’s a fine question. Give me a moment to think on it… I suppose it depends who you ask.', 'You talk like someone who reads. Ines would like you.', 'Ha, well. I’ve a hundred opinions on that and time for about two.'],
  goodbye: ['Mind the mud on the lane. See you tomorrow, I expect.', 'Off you go then. Come back when you’ve got news.', 'Safe home. Say hello to the river for me.'],
  gift_like: ['Oh! You remembered! This is my favourite. Come here, let me — thank you.', 'For me? You shouldn’t have. You absolutely should have.'],
  gift_neutral: ['Ah, thanks. That’s… useful. I’ll find a place for it.', 'Kind of you. Really. I’ll put it somewhere safe.'],
  gift_dislike: ['Hm. I don’t really… no, it’s fine. Thank you. I’ll give it to someone who’ll like it.', 'That is thoughtful, in its way.'],
};

const EVENT_LIST = [
  ['storm', 'Summer Storm', 'weather', 'Thunder over the lake for a day; villagers stay in, fish bite after.'],
  ['heatwave', 'Heatwave', 'weather', 'Three scorching days: crops need double water, tempers fray.'],
  ['fog', 'River Fog', 'weather', 'Thick fog from the river until noon. Dov loves it.'],
  ['merchant', 'Travelling Merchant', 'visitor', 'A stall in the square with rare goods for two days.'],
  ['bard', 'Bard Passing Through', 'visitor', 'A bard plays at the Owl tonight; Finn will not let him leave.'],
  ['spring_fair', 'Spring Bloom Fair', 'festival', 'Flowers, egg hunt, and a dance on the festival grounds.'],
  ['lantern_night', 'Midsummer Lantern Night', 'festival', 'Lanterns on the lake after dusk.'],
  ['harvest_feast', 'Harvest Feast', 'festival', 'A long table at the farm and Cerys’ biggest cake.'],
  ['winter_star', 'Winter Star', 'festival', 'Gifts and a bonfire in the square.'],
  ['cold', 'A Cold Going Around', 'calamity', 'Villagers catch a cough; the clinic is busy.'],
  ['crows', 'Crows on the Crops', 'calamity', 'Crows raid the farm until someone builds a scarecrow.'],
  ['cave_in', 'Mine Cave-in', 'calamity', 'The lower tunnel collapses; a rescue is needed.'],
  ['wolf', 'Wolf Near the Sheep', 'nature', 'Tracks in the meadow; the barn needs watching.'],
  ['flour_shortage', 'Flour Shortage', 'economy', 'The mill is down; bakery prices double.'],
  ['letter', 'A Letter Arrives', 'social', 'Someone gets news from far away.'],
  ['birthday', 'Birthday', 'social', 'It is somebody’s birthday; gifts are in order.'],
  ['meteor', 'Meteor Shower', 'nature', 'Streaks over the hill after midnight; the stargazers gather.'],
  ['drought', 'Drought', 'weather', 'No rain for a week. Crops wilt without watering.'],
  ['fish_bloom', 'Fish Bloom', 'nature', 'The lake teems; every cast lands.'],
  ['heirloom', 'Lost Heirloom', 'mystery', 'Something precious goes missing; clues turn up around town.'],
  ['stray_dog', 'A Stray Dog', 'nature', 'A dog wanders in and picks a villager to adopt.'],
  ['tax', 'Tax Collector', 'economy', 'A collector from the city; everybody pays, nobody smiles.'],
] as const;

/* ---------------------------------------------------------------------- portraits and icons */

function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string): void { c.fillStyle = col; c.fillRect(x, y, w, h); }
function shade(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16); if (Number.isNaN(n)) return hex;
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f))), g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f))), b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function drawPortrait(look: Villager['look']): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
  const c = cv.getContext('2d')!;
  const wide = look.build === 'broad' ? 2 : look.build === 'slim' ? -1 : 0;
  // shoulders / outfit
  px(c, 6 - wide, 24, 20 + wide * 2, 8, look.outfit);
  px(c, 6 - wide, 24, 20 + wide * 2, 1, shade(look.outfit, 1.25));
  px(c, 14, 24, 4, 8, look.accent);
  // neck + head
  px(c, 13, 21, 6, 4, shade(look.skin, 0.85));
  px(c, 10, 7, 12, 14, look.skin);
  px(c, 9, 9, 14, 10, look.skin);
  px(c, 11, 6, 10, 1, look.skin);
  // ears
  px(c, 8, 12, 1, 4, shade(look.skin, 0.9)); px(c, 23, 12, 1, 4, shade(look.skin, 0.9));
  // eyes + mouth + blush
  px(c, 12, 13, 2, 2, '#2b2118'); px(c, 18, 13, 2, 2, '#2b2118');
  px(c, 12, 13, 1, 1, '#fff'); px(c, 18, 13, 1, 1, '#fff');
  px(c, 14, 17, 4, 1, shade(look.skin, 0.65));
  px(c, 10, 16, 2, 1, shade(look.skin, 0.92)); px(c, 20, 16, 2, 1, shade(look.skin, 0.92));
  // hair by style
  const hr = look.hair, hd = shade(hr, 0.8);
  const s = look.hairStyle % 11;
  px(c, 10, 5, 12, 3, hr); px(c, 9, 7, 14, 2, hr); px(c, 11, 4, 10, 1, hr);
  if (s === 1 || s === 9) { px(c, 8, 8, 2, 14, hr); px(c, 22, 8, 2, 14, hr); px(c, 8, 20, 3, 4, hd); px(c, 21, 20, 3, 4, hd); }
  if (s === 2) { px(c, 12, 2, 8, 3, hr); px(c, 14, 1, 4, 1, hr); px(c, 9, 8, 2, 3, hr); px(c, 21, 8, 2, 3, hr); }
  if (s === 3) { px(c, 9, 8, 3, 6, hr); px(c, 20, 8, 3, 3, hr); px(c, 10, 5, 8, 2, hd); }
  if (s === 4) { px(c, 8, 8, 2, 10, hr); px(c, 22, 8, 2, 10, hr); px(c, 9, 17, 2, 2, hr); px(c, 21, 17, 2, 2, hr); px(c, 10, 8, 12, 1, hr); }
  if (s === 5) { px(c, 10, 5, 12, 3, hd); px(c, 9, 7, 14, 1, hd); }
  if (s === 6) { px(c, 9, 3, 2, 3, hr); px(c, 13, 2, 2, 3, hr); px(c, 17, 2, 2, 3, hr); px(c, 21, 3, 2, 3, hr); px(c, 8, 8, 2, 4, hr); px(c, 22, 8, 2, 4, hr); }
  if (s === 7) { px(c, 21, 8, 3, 12, hr); px(c, 22, 20, 2, 5, hd); px(c, 9, 8, 2, 3, hr); }
  if (s === 8) { c.clearRect(10, 4, 12, 3); px(c, 10, 6, 12, 1, hr); px(c, 9, 7, 3, 4, hr); px(c, 20, 7, 3, 4, hr); px(c, 11, 6, 10, 2, look.skin); px(c, 10, 5, 12, 1, look.skin); }
  if (s === 10) { px(c, 8, 6, 2, 6, hr); px(c, 22, 6, 2, 6, hr); px(c, 9, 4, 3, 2, hr); px(c, 20, 4, 3, 2, hr); px(c, 12, 3, 8, 2, hr); }
  if (s === 0) { px(c, 9, 8, 2, 3, hr); px(c, 21, 8, 2, 3, hr); }
  // hats
  if (look.hat === 1) { px(c, 6, 6, 20, 2, '#d9c27a'); px(c, 10, 2, 12, 5, '#e8d38a'); px(c, 10, 5, 12, 1, '#b0964a'); }
  if (look.hat === 2) { px(c, 9, 3, 14, 4, '#2f5f6e'); px(c, 8, 6, 16, 1, '#1f3f4a'); px(c, 22, 6, 4, 1, '#1f3f4a'); }
  if (look.hat === 3) { px(c, 9, 2, 14, 5, '#c8a45a'); px(c, 8, 6, 16, 1, '#8a6a30'); px(c, 14, 1, 4, 3, '#f6dc8c'); }
  if (look.hat === 4) { px(c, 9, 3, 14, 4, '#3d5a3a'); px(c, 8, 6, 12, 1, '#2a3f28'); }
  return cv;
}

function hashHue(id: string): number { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h % 360; }

export function drawItemIcon(id: ItemId, size: number): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false;
  const def = itemDef(id); const k = def.kind; const s = size / 16;
  const hue = hashHue(id);
  const P = (x: number, y: number, w: number, h: number, col: string) => px(c, Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s), col);
  const base = `hsl(${hue}, 45%, 55%)`, dark = `hsl(${hue}, 45%, 35%)`, lite = `hsl(${hue}, 55%, 72%)`;
  switch (k) {
    case 'crop': P(6, 2, 4, 4, '#5b8a3c'); P(7, 1, 2, 2, '#5b8a3c'); P(4, 6, 8, 8, base); P(3, 8, 10, 4, base); P(5, 7, 2, 2, lite); break;
    case 'seed': P(3, 3, 10, 10, '#c9a06e'); P(4, 4, 8, 8, '#e8d0a0'); P(6, 6, 2, 2, '#6b4a2b'); P(9, 8, 2, 2, '#6b4a2b'); P(7, 10, 2, 2, '#6b4a2b'); break;
    case 'fish': P(3, 6, 8, 5, '#5b8fc9'); P(2, 7, 10, 3, '#5b8fc9'); P(11, 5, 3, 7, '#3d6fa0'); P(4, 7, 1, 1, '#fff'); P(5, 9, 4, 1, '#8fb8e8'); break;
    case 'ore': P(3, 6, 10, 8, '#7a7a7a'); P(2, 8, 12, 5, '#7a7a7a'); P(5, 4, 6, 3, '#8a8a8a'); P(6, 8, 2, 2, base); P(9, 10, 2, 2, base); P(4, 11, 2, 1, base); break;
    case 'tool': P(3, 11, 9, 2, '#8a5a2b'); P(2, 12, 9, 2, '#6b4a2b'); P(10, 3, 4, 6, '#9a9aa0'); P(9, 4, 3, 4, '#c0c0c8'); P(11, 8, 2, 3, '#6b4a2b'); break;
    case 'food': P(4, 5, 8, 8, base); P(3, 7, 10, 4, base); P(5, 6, 3, 2, lite); P(6, 4, 4, 1, dark); break;
    case 'drink': P(4, 3, 8, 11, '#c9a06e'); P(5, 4, 6, 3, '#f6dc8c'); P(5, 7, 6, 6, base); P(12, 5, 2, 6, '#8a5a2b'); break;
    case 'material': P(3, 4, 10, 9, base); P(3, 4, 10, 2, lite); P(3, 11, 10, 2, dark); P(5, 7, 6, 2, dark); break;
    case 'gift': P(3, 5, 10, 9, base); P(3, 5, 10, 2, lite); P(7, 5, 2, 9, '#e2b350'); P(3, 9, 10, 1, '#e2b350'); P(5, 3, 2, 2, '#e2b350'); P(9, 3, 2, 2, '#e2b350'); break;
    case 'book': P(3, 3, 10, 11, dark); P(4, 4, 8, 9, base); P(4, 4, 2, 9, dark); P(7, 6, 4, 1, lite); P(7, 8, 4, 1, lite); break;
    case 'furniture': P(3, 3, 10, 10, '#8a5a2b'); P(4, 4, 8, 8, '#a67c52'); P(3, 12, 2, 3, '#6b4a2b'); P(11, 12, 2, 3, '#6b4a2b'); P(5, 6, 6, 1, '#6b4a2b'); break;
    case 'medicine': P(5, 2, 6, 3, '#9a9aa0'); P(4, 5, 8, 9, '#dfe6d6'); P(5, 8, 6, 4, '#c95a45'); P(7, 6, 2, 1, '#c95a45'); break;
    default: P(4, 4, 8, 8, base); P(5, 5, 3, 3, lite); break;
  }
  return cv;
}

export function drawWeatherIcon(kind: WeatherKind, size: number): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const c = cv.getContext('2d')!; const s = size / 16;
  const P = (x: number, y: number, w: number, h: number, col: string) => px(c, Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s), col);
  const sun = () => { P(5, 5, 6, 6, '#f3c440'); P(7, 2, 2, 2, '#f3c440'); P(7, 12, 2, 2, '#f3c440'); P(2, 7, 2, 2, '#f3c440'); P(12, 7, 2, 2, '#f3c440'); P(6, 6, 2, 2, '#fff2b0'); };
  const cloud = (col: string, y = 4) => { P(4, y + 2, 10, 5, col); P(6, y, 5, 3, col); P(2, y + 4, 12, 3, col); };
  switch (kind) {
    case 'sunny': sun(); break;
    case 'cloudy': sun(); cloud('#e8e2d2', 6); break;
    case 'rain': cloud('#8a94a8', 2); P(4, 10, 1, 3, '#5b8fc9'); P(7, 11, 1, 3, '#5b8fc9'); P(10, 10, 1, 3, '#5b8fc9'); break;
    case 'storm': cloud('#55607a', 2); P(8, 9, 2, 3, '#f3c440'); P(6, 11, 3, 2, '#f3c440'); P(7, 13, 2, 2, '#f3c440'); break;
    case 'fog': P(2, 4, 12, 2, '#cfd3d8'); P(3, 8, 10, 2, '#cfd3d8'); P(2, 12, 12, 2, '#cfd3d8'); break;
    case 'snow': cloud('#dfe6ee', 1); P(4, 10, 2, 2, '#fff'); P(9, 11, 2, 2, '#fff'); P(6, 13, 2, 2, '#fff'); P(12, 12, 2, 2, '#fff'); break;
  }
  return cv;
}

function drawGenericIcon(label: string, size: number, col: string): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const c = cv.getContext('2d')!;
  px(c, 0, 0, size, size, col); px(c, 2, 2, size - 4, size - 4, shade(col, 1.2));
  c.fillStyle = '#2b2118'; c.font = `bold ${Math.round(size * 0.5)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(label.slice(0, 2).toUpperCase(), size / 2, size / 2 + 1);
  return cv;
}

/* ---------------------------------------------------------------------- the mock */

const LABEL = (a: number, romance: number): RelationLabel => romance > 60 ? 'partner' : romance > 30 ? 'crush' : a >= 60 ? 'close friend' : a >= 25 ? 'friend' : a <= -25 ? 'rival' : a > 5 ? 'acquaintance' : 'stranger';

export function createMockContext(seed = 7): UiContext & { mock: MockControls } {
  const rng = new SeededRng(seed);
  let minute = 2 * MINUTES_PER_DAY + 9 * 60 + 20; // day 3, 9:20 am
  let time = timeFromMinute(minute);
  const weather: WeatherState = { kind: 'sunny', intensity: 0, forecast: 'rain', temperature: 17 };

  // places laid out on a 96×72 map (rough village plan)
  const placeAnchors: Record<string, Vec> = { square: { x: 48, y: 36 }, well: { x: 48, y: 38 }, board: { x: 51, y: 37 }, bakery: { x: 42, y: 30 }, smithy: { x: 55, y: 30 }, store: { x: 42, y: 42 }, tavern: { x: 56, y: 42 }, carpenter: { x: 60, y: 46 }, clinic: { x: 48, y: 22 }, library: { x: 36, y: 20 }, hill: { x: 34, y: 16 }, chapel: { x: 62, y: 22 }, farm: { x: 76, y: 40 }, barn: { x: 80, y: 44 }, home_ada: { x: 72, y: 36 }, dock: { x: 24, y: 50 }, lake: { x: 18, y: 54 }, river: { x: 30, y: 60 }, home_dov: { x: 26, y: 46 }, mine: { x: 84, y: 16 }, home_greta: { x: 78, y: 20 }, forest: { x: 16, y: 20 }, orchard: { x: 66, y: 58 }, meadow: { x: 40, y: 58 }, graveyard: { x: 68, y: 18 }, festival_grounds: { x: 50, y: 52 }, home_bram: { x: 58, y: 26 }, home_cerys: { x: 40, y: 26 }, home_elin: { x: 52, y: 18 }, home_finn: { x: 58, y: 38 }, home_hal: { x: 38, y: 40 }, home_ines: { x: 32, y: 24 }, home_jory: { x: 64, y: 44 }, home_player: { x: 30, y: 36 }, player_farm: { x: 28, y: 32 }, bridge_east: { x: 60, y: 60 }, bridge_west: { x: 30, y: 56 } };
  const places: Place[] = Object.values(PLACES).map((id) => {
    const anchor = placeAnchors[id] ?? { x: 48, y: 36 };
    const isHome = id.startsWith('home_');
    const owner = isHome ? id.slice(5) : VILLAGERS.find((v) => v.workplace === id)?.id;
    const tiles: Vec[] = [];
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) tiles.push({ x: anchor.x + dx, y: anchor.y + dy });
    return { id, name: PLACE_NAMES[id] ?? id, kind: isHome ? 'home' : PLACE_KIND[id] ?? 'public', tiles, anchor, door: { x: anchor.x, y: anchor.y + 2 }, interior: { x: anchor.x, y: anchor.y + 1 }, owner: owner === 'player' ? undefined : owner, open: PLACE_KIND[id] === 'shop' ? [8, 18] : undefined, facilities: id === 'bakery' ? ['oven', 'counter'] : id === 'tavern' ? ['bar', 'kitchen'] : [] };
  });
  const placeById = new Map(places.map((p) => [p.id, p]));

  const world: World = {
    seed, width: 96, height: 72, places, objects: [] as WorldObject[],
    get time() { return time; }, get weather() { return weather; },
    tile: () => 'grass', tileVariant: () => 0, walkable: () => true,
    place: (id) => placeById.get(id), placeAt: (pos) => places.find((p) => Math.abs(p.anchor.x - pos.x) <= 2 && Math.abs(p.anchor.y - pos.y) <= 2),
    placesOfKind: (kind) => places.filter((p) => p.kind === kind), object: () => undefined, objectsNear: () => [], objectsAt: () => [],
    findPath: (a, b) => [a, b], nearestWalkable: (p) => p,
    tick(m: number) {
      const before = time; minute += m; time = timeFromMinute(minute);
      if (time.hour !== before.hour) { bus.emit({ type: 'hour', hour: time.hour }); if (time.hour === 12) { weather.kind = weather.forecast; weather.forecast = rng.pick(['sunny', 'cloudy', 'rain', 'fog', 'storm', 'snow']); bus.emit({ type: 'weather', weather }); } }
      if (time.dayIndex !== before.dayIndex) bus.emit({ type: 'newday', dayIndex: time.dayIndex });
    },
    speed: 1, paused: false,
    festivalToday: () => null, get season(): Season { return time.season; },
    plot: () => undefined, setPlot: () => {}, save: () => ({ minute }), load: (d) => { minute = (d as { minute: number }).minute; time = timeFromMinute(minute); },
  };

  // villagers
  const villagers: Villager[] = VILLAGERS.map((spec, i) => {
    const r = rng.fork(i + 1);
    const skills = Object.fromEntries((['farming', 'fishing', 'mining', 'cooking', 'crafting', 'charm', 'lore', 'medicine'] as SkillName[]).map((s) => [s, spec.skills[s] ?? r.int(0, 2)])) as Record<SkillName, number>;
    const relationships: Record<VillagerId, Relationship> = {};
    for (const other of VILLAGERS) {
      if (other.id === spec.id) continue;
      const a = spec.opinions[other.id] ?? other.opinions[spec.id] ?? r.int(-8, 12);
      const familiarity = Math.min(100, 20 + Math.abs(a) + r.int(0, 30));
      const romance = (spec.id === 'cerys' && other.id === 'jory') || (spec.id === 'jory' && other.id === 'cerys') ? 34 : (spec.id === 'elin' && other.id === 'ines') || (spec.id === 'ines' && other.id === 'elin') ? 18 : 0;
      const notes = a > 20 ? [`${other.short} helped out last ${r.pick(['spring', 'winter', 'week'])}.`, `Shared a drink at the Owl.`] : a < -10 ? [`${other.short} was rude at the market.`, `Still owes an apology.`] : [`Nod to each other in the square.`];
      relationships[other.id] = { affinity: a, trust: Math.max(0, Math.min(100, 40 + a / 2 + r.int(-10, 10))), romance, familiarity, label: LABEL(a, romance), notes, lastTalked: minute - r.int(20, 2000) };
    }
    const pa = { ada: 12, cerys: 26, finn: 18, hal: 4, dov: 2, bram: 6, elin: 8, greta: 5, ines: 9, jory: 14 }[spec.id] ?? 0;
    relationships.player = { affinity: pa, trust: 30 + pa, romance: 0, familiarity: 10 + pa, label: LABEL(pa, 0), notes: pa > 10 ? ['Welcomed you when you arrived.'] : [], lastTalked: minute - r.int(60, 900) };
    const mem: Memory[] = MEM_BANK[spec.id].map((m, j) => ({ id: `${spec.id}-m${j}`, t: minute - r.int(15, 2 * MINUTES_PER_DAY), kind: m[0], text: m[1], importance: m[2], tags: m[3], about: m[4], secondhand: m[0] === 'gossip', source: m[0] === 'gossip' ? 'cerys' : undefined })).sort((a, b) => a.t - b.t);
    const act = r.pick(ACTIONS[spec.id]);
    const wp = placeById.get(spec.workplace)!;
    const plan = SCHEDULES[spec.profession].map((e) => ({ ...e, place: e.block === 'work' ? spec.workplace : e.block === 'sleep' || e.block === 'breakfast' ? spec.home : e.block === 'social' ? PLACES.tavern : e.block === 'lunch' || e.block === 'dinner' ? spec.home : PLACES.square, note: e.block === 'work' ? act.label : undefined }));
    const statusPool: Villager['status'][] = [[], ['tired'], ['sick'], ['inLove'], ['inspired'], [], [], ['wet']];
    return {
      id: spec.id, name: spec.name, profession: spec.profession, home: spec.home, workplace: spec.workplace,
      pos: { x: wp.anchor.x + r.range(-1.5, 1.5), y: wp.anchor.y + r.range(-1, 2) }, facing: r.pick(['up', 'down', 'left', 'right'] as Dir[]), inside: r.chance(0.4) ? spec.workplace : undefined,
      needs: { energy: r.int(30, 95), hunger: r.int(35, 95), social: r.int(20, 95), fun: r.int(15, 90), comfort: r.int(40, 95), purpose: r.int(30, 95) },
      mood: r.range(-0.7, 0.9), money: spec.money, inventory: spec.inventory.map(([id, qty]) => ({ id, qty })), skills, health: r.int(70, 100),
      personality: spec.personality, relationships, memory: mem,
      goals: [{ id: 'g1', text: spec.personality.dream, priority: 8, createdAt: 0, progress: r.pick(['just started', 'halfway there', 'stalled']) }, { id: 'g2', text: r.pick(['Talk to someone new this week', 'Save 100 coins', 'Fix the leaky roof', 'Visit the chapel on Sunday', 'Learn a new recipe']), priority: r.int(3, 6), createdAt: minute - 500 }, { id: 'g3', text: 'Buy a warmer coat before winter', priority: 2, createdAt: minute - 3000, done: true }],
      plan: { day: time.dayIndex, entries: plan, summary: `${spec.short}'s usual ${spec.profession}'s day, with ${act.label.toLowerCase()} after breakfast.` },
      action: { tool: act.tool, args: {}, startedAt: minute - 20, endsAt: minute + 40, label: act.label, thought: act.thought, progress: r.range(0.1, 0.9) },
      queue: [], status: r.pick(statusPool), look: spec.look, brain: 'local', birthday: spec.birthday,
      speech: r.chance(0.3) ? { text: r.pick(LINES.day), until: minute + 5 } : undefined,
      stats: { actions: r.int(40, 200), conversations: r.int(5, 40) },
    } satisfies Villager;
  });
  const byId = new Map(villagers.map((v) => [v.id, v]));

  const player: PlayerState = { pos: { x: 47, y: 37 }, facing: 'down', money: 342, inventory: [{ id: 'turnip_seed', qty: 12 }, { id: 'hoe', qty: 1 }, { id: 'watering_can', qty: 1 }, { id: 'bread', qty: 3 }, { id: 'wildflower', qty: 2 }, { id: 'berries', qty: 7 }, { id: 'sweet_roll', qty: 1 }, { id: 'trout', qty: 2 }, { id: 'wood', qty: 15 }, { id: 'stone', qty: 6 }, { id: 'copper_ore', qty: 3 }, { id: 'honey', qty: 1 }], skills: { farming: 2, fishing: 1, mining: 1, cooking: 0, crafting: 1, charm: 2, lore: 0, medicine: 0 }, energy: 78, name: 'You', hotbar: 0 };

  const chronicle: Sim['chronicle'][number][] = CHRONICLE.map((c, i) => ({ t: minute - (CHRONICLE.length - i) * 47 - rng.int(0, 30), text: c[0], importance: c[1], about: c[2] }));
  const requests: Request[] = [
    { id: 'r1', by: 'cerys', text: 'Wild berries for a pie — three handfuls would do. I’ll pay, and there may be a slice in it for you.', reward: { money: 40, item: { id: 'berry_pie', qty: 1 } }, needs: [{ id: 'berries', qty: 3 }], postedAt: minute - 400, expiresAt: minute + 2000 },
    { id: 'r2', by: 'bram', text: 'Copper ore. Five lumps. Greta is slow this week.', reward: { money: 60 }, needs: [{ id: 'copper_ore', qty: 5 }], postedAt: minute - 900, expiresAt: minute + 1500 },
    { id: 'r3', by: 'elin', text: 'Fresh herbs for tonic — the cough is spreading and my shelf is bare.', reward: { money: 35 }, needs: [{ id: 'herbs', qty: 4 }], postedAt: minute - 120, acceptedBy: 'player', expiresAt: minute + 3000 },
    { id: 'r4', by: 'finn', text: 'Someone to play music at the Owl on Friday. Or someone who knows someone.', reward: { money: 25, item: { id: 'ale', qty: 3 } }, needs: [], postedAt: minute - 1500, expiresAt: minute + 800 },
    { id: 'r5', by: 'ada', text: 'A hand with the barn door. Bring nails; Jory brought promises.', reward: { money: 30 }, needs: [{ id: 'nails', qty: 2 }], postedAt: minute - 2200, acceptedBy: 'jory', done: true, expiresAt: minute + 100 },
    { id: 'r6', by: 'player', text: 'Looking for a fishing rod, will trade wood.', reward: { money: 20 }, needs: [{ id: 'fishing_rod', qty: 1 }], postedAt: minute - 60, expiresAt: minute + 2800 },
  ];
  const events: ActiveEvent[] = [{ id: 'merchant', name: 'Travelling Merchant', kind: 'visitor', startedAt: minute - 300, endsAt: minute + 2 * MINUTES_PER_DAY - 300, place: 'square', text: 'A stall in the square with goods from over the hills.', data: {} }];
  const conversations: ConversationState[] = [{ id: 'c1', participants: ['cerys', 'jory'], turns: [{ speaker: 'cerys', text: 'You have flour on your sleeve.' }, { speaker: 'jory', text: 'Do I? Must be the wren’s.' }], startedAt: minute - 4, topic: 'flour' }];

  const localBrain: Brain = { kind: 'local', decide: async () => ({ tool: 'idle', args: {}, thought: '' }), converse: async () => ({ speaker: 'ada', text: '' }), reflect: async () => [] };
  const llmBrain: Brain = { ...localBrain, kind: 'llm' };

  let llmSettings: LlmSettings = { provider: 'none', apiKey: '', model: 'claude-haiku-4-5-20251001', mode: 'off', budgetPerHour: 60 };
  try { const raw = localStorage.getItem('pebblebrook.llm'); if (raw) llmSettings = { ...llmSettings, ...(JSON.parse(raw) as Partial<LlmSettings>) }; } catch { /* none */ }

  const invOf = (v: Villager | PlayerState): ItemStack[] => v.inventory;
  const has = (v: Villager | PlayerState, id: ItemId, qty = 1): boolean => (invOf(v).find((s) => s.id === id)?.qty ?? 0) >= qty;
  const give = (v: Villager | PlayerState, it: ItemStack): void => { const s = invOf(v).find((x) => x.id === it.id); if (s) s.qty += it.qty; else invOf(v).push({ id: it.id, qty: it.qty }); };
  const take = (v: Villager | PlayerState, it: ItemStack): boolean => { const inv = invOf(v); const s = inv.find((x) => x.id === it.id); if (!s || s.qty < it.qty) return false; s.qty -= it.qty; if (s.qty <= 0) inv.splice(inv.indexOf(s), 1); return true; };
  const stock = new Map<string, ItemStack[]>(Object.entries(SHOP_STOCK).map(([k, v]) => [k, v.map(([id, qty]) => ({ id, qty }))]));
  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  let talking: Villager | null = null;
  let lastHappen = minute;

  const sim: Sim = {
    world, villagers, player, requests, events, conversations,
    villager: (id) => byId.get(id), villagersNear: (pos, r) => villagers.filter((v) => Math.hypot(v.pos.x - pos.x, v.pos.y - pos.y) <= r),
    give, take, has,
    remember: (v, m) => { const mem: Memory = { ...m, id: `${v.id}-${v.memory.length}`, t: minute }; v.memory.push(mem); bus.emit({ type: 'memory', who: v.id, memory: mem }); return mem; },
    adjustRelationship: (a, b, d, note) => { const r = a.relationships[b]; if (!r) return; r.affinity = Math.max(-100, Math.min(100, r.affinity + (d.affinity ?? 0))); r.familiarity = Math.min(100, r.familiarity + (d.familiarity ?? 0)); r.trust = Math.min(100, r.trust + (d.trust ?? 0)); r.romance = Math.min(100, r.romance + (d.romance ?? 0)); r.label = LABEL(r.affinity, r.romance); if (note) r.notes.push(note); bus.emit({ type: 'relationship', a: a.id, b, delta: d.affinity ?? 0, label: r.label }); },
    say: (v, text, to, tone) => { v.speech = { text, until: minute + 4, to }; bus.emit({ type: 'say', who: v.id, text, to, pos: v.pos }); void tone; },
    emote: (v, kind) => { v.emote = { kind, until: minute + 3 }; bus.emit({ type: 'emote', who: v.id, kind, pos: v.pos }); },
    startConversation: () => null,
    postRequest: (by, text, reward, needs) => { const r: Request = { id: `r${requests.length + 1}`, by, text, reward, needs, postedAt: minute, expiresAt: minute + 3 * MINUTES_PER_DAY }; requests.push(r); bus.emit({ type: 'request', request: r, phase: 'posted' }); return r; },
    shopStock: (place) => stock.get(place) ?? [],
    priceOf: (id, place) => Math.round(itemDef(id).price * (place === 'store' ? 1.15 : place === 'tavern' ? 1.1 : 1)),
    interrupt: () => {}, rng, log: (text, importance, about, place) => { chronicle.push({ t: minute, text, importance, about, place }); bus.emit({ type: 'chronicle', text, importance, about, place }); }, chronicle,
    update(m: number) {
      world.tick(m);
      for (const v of villagers) {
        v.needs.energy = Math.max(0, v.needs.energy - m * 0.05); v.needs.hunger = Math.max(0, v.needs.hunger - m * 0.08); v.needs.fun = Math.max(0, v.needs.fun - m * 0.03);
        if (v.action) { v.action.progress = Math.min(1, (minute - v.action.startedAt) / (v.action.endsAt - v.action.startedAt)); if (v.action.progress >= 1) { const act = rng.pick(ACTIONS[v.id]); v.action = { tool: act.tool, args: {}, startedAt: minute, endsAt: minute + rng.int(20, 90), label: act.label, thought: act.thought, progress: 0 }; bus.emit({ type: 'action', who: v.id, tool: act.tool, label: act.label, phase: 'start', pos: v.pos }); } }
        if (!v.inside) { v.pos.x += rng.range(-0.05, 0.05) * m; v.pos.y += rng.range(-0.05, 0.05) * m; }
      }
      if (minute - lastHappen > 12) { lastHappen = minute; mock.happen(); }
    },
    setBrain: (id, kind) => { const v = byId.get(id); if (v) v.brain = kind; },
    brains: { local: localBrain, llm: llmBrain }, tools: [],
    save: () => ({ minute, money: player.money }), load: (d) => { const s = d as { minute?: number }; if (typeof s.minute === 'number') { minute = s.minute; time = timeFromMinute(minute); } },
    async playerTalk(v, intent, line) {
      talking = v; player.talkingTo = v.id;
      await delay(llmSettings.provider === 'none' ? 350 : 900);
      const bank = LINES[intent] ?? LINES.chat;
      let text = rng.pick(bank);
      if (intent === 'about' && line) { const other = byId.get(line); const rel = other ? v.relationships[other.id] : undefined; if (other && rel) text = rel.affinity > 20 ? `${other.name.split(' ')[0]}? Good sort. ${rel.notes[0] ?? ''}`.trim() : rel.affinity < -10 ? `${other.name.split(' ')[0]}. Hm. We don’t see eye to eye, and I’d rather not say more.` : `${other.name.split(' ')[0]}? We nod in the square. Not much more than that.`; }
      if (intent === 'chat' && line) text = `"${line.slice(0, 40)}${line.length > 40 ? '…' : ''}" — ${rng.pick(LINES.chat)}`;
      const delta = intent === 'compliment' ? 3 : intent === 'joke' ? (rng.chance(0.7) ? 2 : -1) : intent === 'gossip' ? (v.personality.likes.includes('news') ? 2 : 0) : intent === 'goodbye' ? 0 : 1;
      if (delta) sim.adjustRelationship(v, 'player', { affinity: delta, familiarity: 1 });
      const turn: ConversationTurn = { speaker: v.id, text, tone: delta < 0 ? 'cold' : intent === 'joke' ? 'joking' : intent === 'compliment' ? 'warm' : 'neutral', end: intent === 'goodbye', affinityDelta: delta, emote: intent === 'compliment' ? 'love' : intent === 'joke' ? 'happy' : undefined };
      sim.say(v, text, 'player', turn.tone);
      return turn;
    },
    playerGift(v, id) {
      if (!take(player, { id, qty: 1 })) return { ok: false, reaction: 'You do not have that.' };
      const tags = itemDef(id).tags; const liked = tags.some((t) => v.personality.likes.includes(t)); const disliked = tags.some((t) => v.personality.dislikes.includes(t));
      const delta = liked ? 8 : disliked ? -4 : 2;
      give(v, { id, qty: 1 });
      sim.adjustRelationship(v, 'player', { affinity: delta, familiarity: 2 }, `Got ${itemDef(id).name} from you.`);
      const reaction = rng.pick(liked ? LINES.gift_like : disliked ? LINES.gift_dislike : LINES.gift_neutral);
      sim.say(v, reaction, 'player'); sim.emote(v, liked ? 'love' : disliked ? 'sad' : 'happy');
      return { ok: true, reaction };
    },
    playerEnter: (place) => { player.inside = place; return true; }, playerLeave: () => { player.inside = undefined; },
    endPlayerConversation: () => { talking = null; player.talkingTo = undefined; },
    playerBuy(place, id, qty = 1) {
      const st = (stock.get(place) ?? []).find((s) => s.id === id);
      const cost = sim.priceOf(id, place) * qty;
      if (!st || st.qty < qty) return { ok: false, message: 'Sold out.', cost: 0 };
      if (player.money < cost) return { ok: false, message: 'Not enough coins.', cost };
      st.qty -= qty; player.money -= cost; give(player, { id, qty });
      bus.emit({ type: 'player', what: 'buy', detail: `${id}×${qty}` });
      return { ok: true, message: `Bought ${itemDef(id).name} × ${qty}.`, cost };
    },
    playerSell(place, id, qty = 1) {
      const earned = Math.max(1, Math.floor(sim.priceOf(id, place) * 0.6)) * qty;
      if (!take(player, { id, qty })) return { ok: false, message: 'You do not have that.', earned: 0 };
      player.money += earned; const st = (stock.get(place) ?? []).find((s) => s.id === id); if (st) st.qty += qty; else stock.get(place)?.push({ id, qty });
      bus.emit({ type: 'player', what: 'sell', detail: `${id}×${qty}` });
      return { ok: true, message: `Sold ${itemDef(id).name} × ${qty}.`, earned };
    },
    playerAcceptRequest(id) { const r = requests.find((x) => x.id === id); if (!r || r.done || r.acceptedBy) return false; r.acceptedBy = 'player'; bus.emit({ type: 'request', request: r, phase: 'accepted' }); return true; },
    playerCompleteRequest(id) {
      const r = requests.find((x) => x.id === id); if (!r || r.done) return { ok: false, message: 'That request is gone.' };
      if (!r.needs.every((n) => has(player, n.id, n.qty))) return { ok: false, message: 'You do not have everything it needs yet.' };
      for (const n of r.needs) take(player, n);
      if (r.reward.money) player.money += r.reward.money; if (r.reward.item) give(player, r.reward.item);
      r.done = true; r.acceptedBy = 'player';
      const poster = r.by === 'player' ? null : byId.get(r.by);
      if (poster) { sim.adjustRelationship(poster, 'player', { affinity: 6, trust: 5, familiarity: 3 }, 'You helped with a request.'); sim.remember(poster, { kind: 'event', text: `${player.name} brought what I asked for on the board.`, importance: 5, tags: ['request', 'player'] }); }
      bus.emit({ type: 'request', request: r, phase: 'done' }); sim.log(`You completed ${poster ? poster.name.split(' ')[0] + '’s' : 'a'} request.`, 5, poster ? [poster.id] : []);
      return { ok: true, message: `${poster ? poster.name.split(' ')[0] : 'Someone'} thanks you.` };
    },
  };

  const director: Director = {
    update: () => {},
    fire(id) { const e = EVENT_LIST.find((x) => x[0] === id); if (!e) return null; const ev: ActiveEvent = { id, name: e[1], kind: e[2], startedAt: minute, endsAt: minute + rng.int(180, 1440), text: e[3], data: {} }; events.push(ev); bus.emit({ type: 'event', event: ev, phase: 'start' }); sim.log(`${e[1]}: ${e[3]}`, 7); bus.emit({ type: 'toast', text: `Event: ${e[1]}`, kind: 'good' }); return ev; },
    list: () => EVENT_LIST.map((e) => ({ id: e[0], name: e[1], kind: e[2], description: e[3], canFire: !events.some((a) => a.id === e[0]) })),
    forecast: () => [{ dayIndex: time.dayIndex + 1, id: 'fog', name: 'River Fog' }, { dayIndex: time.dayIndex + 3, id: 'bard', name: 'Bard Passing Through' }, { dayIndex: 12, id: 'spring_fair', name: 'Spring Bloom Fair' }],
    active: events, save: () => ({}), load: () => {},
  };

  // fake screen layout for pick(): each villager gets a screen rect from its tile position
  let hoverForce: VillagerId | null = null;
  const screenOf = (v: Villager): Vec => ({ x: 120 + (v.pos.x - 10) * 12, y: 80 + (v.pos.y - 10) * 11 });
  const renderer: Renderer = {
    camera: { x: 48, y: 36, zoom: 3 }, follow: 'player',
    render: () => {}, resize: () => {}, screenToTile: (x, y) => ({ x: (x - 120) / 12 + 10, y: (y - 80) / 11 + 10 }), tileToScreen: (p) => ({ x: 120 + (p.x - 10) * 12, y: 80 + (p.y - 10) * 11 }),
    pick(pxx, pyy) { if (hoverForce) return { villager: byId.get(hoverForce) }; for (const v of villagers) { if (v.inside) continue; const s = screenOf(v); if (pxx >= s.x - 14 && pxx <= s.x + 14 && pyy >= s.y - 36 && pyy <= s.y + 8) return { villager: v }; } return null; },
    setQuality: () => {}, highlight: null,
  };

  const portraitCache = new Map<string, CharacterSprites>();
  const art: Art = {
    ready: true, tile: () => null, object: () => null, item: () => null, emote: () => null,
    character(look) { const key = JSON.stringify(look); let s = portraitCache.get(key); if (!s) { s = { frames: { up: [] as SpriteRect[], down: [], left: [], right: [] }, width: 16, height: 24, portrait: drawPortrait(look) }; portraitCache.set(key, s); } return s; },
    icon(kind, id, size) { if (kind === 'item') return drawItemIcon(id, size); if (kind === 'weather') return drawWeatherIcon(id as WeatherKind, size); return drawGenericIcon(id, size, kind === 'skill' ? '#c9a06e' : '#a67c52'); },
  };

  const audio: AudioSystem = { init: () => {}, ready: true, setScene: () => {}, play: () => {}, update: () => {}, setVolume: () => {}, enabled: true };
  const mouse: Vec = { x: 0, y: 0 };
  let clicked = false;
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mousedown', (e) => { if ((e.target as HTMLElement).closest?.('#ui > *')) return; clicked = true; });
  const input: InputState = { down: () => false, pressed: () => false, mouse, mouseDown: false, get clicked() { return clicked; }, rightClicked: false, wheel: 0, get typing() { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'); }, endFrame: () => { clicked = false; } };
  const playerCtl: PlayerController = { update: () => {}, prompt: () => { const near = villagers.filter((v) => !v.inside).sort((a, b) => Math.hypot(a.pos.x - player.pos.x, a.pos.y - player.pos.y) - Math.hypot(b.pos.x - player.pos.x, b.pos.y - player.pos.y))[0]; return near ? `Talk to ${near.name.split(' ')[0]}` : null; }, moving: false, look: PLAYER_LOOK };

  const mock: MockControls = {
    hover: (id) => { hoverForce = id; },
    screenPos: (id) => screenOf(byId.get(id)!),
    llm: (on) => { llmSettings = { ...llmSettings, provider: on ? 'anthropic' : 'none', apiKey: on ? 'sk-ant-mock' : '', mode: on ? 'social' : 'off' }; },
    happen() { const c = rng.pick(CHRONICLE); const who = c[2].length ? byId.get(rng.pick(c[2])) : undefined; sim.log(c[0], c[1], c[2]); if (who && rng.chance(0.5)) sim.say(who, rng.pick(LINES.day)); if (who && rng.chance(0.3)) { const other = rng.pick(villagers.filter((v) => v.id !== who.id)); sim.adjustRelationship(who, other.id, { affinity: rng.int(-3, 4), familiarity: 1 }); } },
    villager: (id) => byId.get(id)!,
    drawBackdrop(canvas) {
      const c = canvas.getContext('2d')!; const W = canvas.width, H = canvas.height;
      const night = !time.isDaylight;
      c.fillStyle = night ? '#1c2a1e' : weather.kind === 'rain' || weather.kind === 'storm' ? '#4f6b45' : '#6f9a58'; c.fillRect(0, 0, W, H);
      c.fillStyle = night ? '#25352a' : '#7fa966';
      for (let y = 0; y < H; y += 48) for (let x = (y / 48) % 2 ? 24 : 0; x < W; x += 48) c.fillRect(x, y, 24, 24);
      c.fillStyle = night ? '#4a3a2a' : '#c9a06e';
      c.fillRect(0, 380, W, 40); c.fillRect(560, 0, 40, H);
      c.fillStyle = night ? '#2a4a6a' : '#5b8fc9'; c.fillRect(0, H - 120, 320, 120);
      for (const p of places) { if (p.kind === 'home' || p.kind === 'shop' || p.kind === 'workplace') { const s = renderer.tileToScreen(p.anchor); c.fillStyle = night ? '#3a2a1a' : '#8a5a2b'; c.fillRect(s.x - 30, s.y - 34, 60, 44); c.fillStyle = night ? '#6b4a2b' : '#c95a45'; c.fillRect(s.x - 34, s.y - 46, 68, 16); c.fillStyle = night ? '#f6dc8c' : '#3e2a17'; c.fillRect(s.x - 6, s.y - 8, 12, 18); c.fillStyle = '#f3e6c8'; c.font = '11px Verdana'; c.textAlign = 'center'; c.fillText(p.name, s.x, s.y + 24); } }
      for (const v of villagers) { if (v.inside) continue; const s = screenOf(v); c.fillStyle = v.look.outfit; c.fillRect(s.x - 8, s.y - 20, 16, 20); c.fillStyle = v.look.skin; c.fillRect(s.x - 6, s.y - 32, 12, 12); c.fillStyle = v.look.hair; c.fillRect(s.x - 7, s.y - 34, 14, 5); }
      const ps = renderer.tileToScreen(player.pos); c.fillStyle = PLAYER_LOOK.outfit; c.fillRect(ps.x - 8, ps.y - 20, 16, 20); c.fillStyle = PLAYER_LOOK.skin; c.fillRect(ps.x - 6, ps.y - 32, 12, 12);
      if (night) { c.fillStyle = 'rgba(10,16,40,.45)'; c.fillRect(0, 0, W, H); }
      if (weather.kind === 'rain' || weather.kind === 'storm') { c.strokeStyle = 'rgba(200,220,255,.35)'; for (let i = 0; i < 120; i++) { const x = (i * 97) % W, y = (i * 53 + (minute * 40)) % H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + 10); c.stroke(); } }
      if (weather.kind === 'fog') { c.fillStyle = 'rgba(220,225,230,.4)'; c.fillRect(0, 0, W, H); }
    },
  };

  const ctx: UiContext & { mock: MockControls } = {
    sim, world, director, renderer, player: playerCtl, audio, art, input,
    save: () => { try { localStorage.setItem('pebblebrook.save.v1', JSON.stringify({ seed, sim: sim.save() })); } catch { /* none */ } bus.emit({ type: 'save' }); },
    load: () => { try { const raw = localStorage.getItem('pebblebrook.save.v1'); if (!raw) return false; sim.load((JSON.parse(raw) as { sim: unknown }).sim); bus.emit({ type: 'load' }); return true; } catch { return false; } },
    newGame: (s) => { bus.emit({ type: 'toast', text: `(mock) new village with seed ${s}`, kind: 'info' }); },
    setLlm: (cfg) => { llmSettings = cfg; try { localStorage.setItem('pebblebrook.llm', JSON.stringify(cfg)); } catch { /* none */ } },
    getLlm: () => llmSettings,
    mock,
  };
  void talking; void placeById;
  return ctx;
}

/** Every item id, for pickers in the preview. */
export const ALL_ITEM_IDS: ItemId[] = ITEMS.map((i) => i.id);
