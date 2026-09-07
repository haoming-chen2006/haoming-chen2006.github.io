import { h } from '../dom.ts';
import type { Panel, UiCore } from '../shared.ts';
import { frame } from './frame.ts';

const KEYS: [string[], string][] = [
  [['W', 'A', 'S', 'D'], 'Walk (arrow keys work too)'], [['E'], 'Interact: talk, farm, fish, mine, enter, read the board'], [['F'], 'Follow the villager you are looking at'],
  [['1', '…', '9'], 'Pick a hotbar slot'], [['Tab'], 'Inspector: read a villager’s mind; press again to cycle'], [['V'], 'Village overview and storyboard'], [['B'], 'Notice board'],
  [['G'], 'Director: fire events, control time and brains'], [['Space'], 'Pause / resume'], [['−', '='], 'Slower / faster (1×, 2×, 4×, 8×)'], [['Esc'], 'Close the top panel, or open the menu'],
];

export function createHowto(core: UiCore): Panel {
  const { win, body } = frame(core, 'howto', { title: 'How to play', cls: 'pb-howto' });
  body.append(
    h('h3', null, 'Controls'),
    h('div', { class: 'keys' }, ...KEYS.flatMap(([keys, what]) => [h('div', { class: 'k' }, ...keys.map((k) => h('span', { class: 'pb-kbd' }, k))), h('div', null, what)])),
    h('h3', null, 'The villagers'),
    h('p', null, 'Each of the ten villagers is driven by an agent of their own. Every few minutes it looks at what they need (sleep, food, company, fun, comfort, purpose), what they remember, who is nearby, the weather and the time, and then picks one of about fifty actions — walk somewhere, work, cook, chat, gossip, trade, gift, argue, teach, organise something, or just sit by the river. What they see and hear becomes memories; at night they reflect on the day. Conversations change how they feel about each other, and gossip carries secondhand news around the village, so a rumour you start at the bakery can reach the mine by evening.'),
    h('p', null, 'Without an API key the local brains do all of this with utility scoring and a large bank of templates. With a key (Settings → AI brains) they think and speak through a language model instead, with the local brain as a fallback so the world never stalls. Open the Inspector to watch it happen.'),
    h('h3', null, 'Your days'),
    h('p', null, 'Talk to people, trade at the store, bakery and tavern, farm your plot, fish the river, mine for ore, and take requests from the notice board. Time runs at one in-game minute per second; pause when you want to think, or speed up to watch a week go by.'),
  );
  return { id: 'howto', el: win, modal: true, closable: true, show() {}, hide() {}, tick() {} };
}
