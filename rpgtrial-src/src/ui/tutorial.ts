// Tutorial cards: a right-side stack. `show(step)` adds a card with title/hint/keys, `complete(id)` plays the check
// animation, `card(title, html, keys)` shows a dismissable info card. INFO_CARDS explain the D&D systems.
import type { QuestStep } from '../sim/types.ts';
import { h, kbd, clear, sfx } from './dom.ts';
import { icon } from './icons.ts';

export interface Tutorial {
  show(step: QuestStep): void;
  complete(id: string): void;
  card(title: string, html: string, keys?: string[]): void;
  info(id: keyof typeof INFO_CARDS): void;
  clearAll(): void;
}

export const INFO_CARDS = {
  abilityScores: { title: 'Ability scores', icon: 'd20', html: `<p>Six scores describe your character: <b>STR</b> (might), <b>DEX</b> (agility, AC), <b>CON</b> (hit points), <b>INT</b> (arcana), <b>WIS</b> (perception, insight) and <b>CHA</b> (persuasion).</p><p>Each gives a <b>modifier</b>: (score − 10) ÷ 2, rounded down. A 16 is +3; an 8 is −1. Modifiers are added to nearly every roll.</p>` },
  checks: { title: 'Ability checks', icon: 'dice', html: `<p>When the outcome is uncertain you roll a <b>d20</b>, add your modifier (and proficiency if you're trained), and compare against a <b>Difficulty Class</b>.</p><p>DC 10 is easy, 15 is hard, 20 is very hard. A natural 20 always succeeds.</p>` },
  ac: { title: 'Armour class', icon: 'ac', html: `<p><b>AC</b> is how hard you are to hit. Attackers roll a d20 + their bonus and must meet or beat it.</p><p>Armour sets the base; Dexterity, shields and magic add to it. Blocking (<b>Q</b>) raises it further; a perfect parry negates the hit entirely.</p>` },
  proficiency: { title: 'Proficiency', icon: 'star', html: `<p>Your <b>proficiency bonus</b> (+2 at level 1) is added to attacks with weapons you're trained in, saving throws your class favours, and skills you've practised.</p><p>Skills marked with a gold dot on the character sheet are proficient.</p>` },
  spellSlots: { title: 'Spell slots', icon: 'sparkle', html: `<p>Levelled spells consume a <b>spell slot</b> — the blue diamonds under your stamina bar. Cantrips (Fire Bolt, Ray of Frost) are free and can be cast endlessly.</p><p>Slots return after a <b>rest</b> at a campfire.</p>` },
  rest: { title: 'Resting', icon: 'campfire', html: `<p>Interact with a <b>campfire</b> to rest. A <b>short rest</b> lets you spend hit dice to heal; a <b>long rest</b> restores all hit points, spell slots and class resources.</p><p>The dead do not rest. Be careful in the crypt.</p>` },
  stamina: { title: 'Stamina', icon: 'boot', html: `<p>The green bar. Sprinting (<b>Shift</b>), dodging (<b>Space</b>) and heavy attacks spend it; it regenerates when you ease off.</p><p>Run dry and you'll be slow and unable to dodge — leave a reserve.</p>` },
  hitPoints: { title: 'Hit points', icon: 'heal', html: `<p>The red bar. At 0 you fall and must make <b>death saving throws</b>: three failures and the prologue ends.</p><p>Potions (<b>R</b>), Second Wind, Cure Wounds and resting recover HP.</p>` },
  advantage: { title: 'Advantage', icon: 'd20', html: `<p>Roll two d20s and keep the <b>higher</b> (advantage) or <b>lower</b> (disadvantage). Attacking from stealth or a staggered foe grants advantage; fighting while blinded or frightened imposes disadvantage.</p>` },
  lockOn: { title: 'Lock-on', icon: 'target', html: `<p>Press <b>Tab</b> or the <b>middle mouse</b> to lock onto the nearest enemy. Your movement becomes a strafe and dodges become directional.</p><p>Scroll while locked to switch targets.</p>` },
} as const;

export function createTutorial(stack: HTMLElement, subst: (s: string) => string = (s) => s): Tutorial {
  const cards = new Map<string, HTMLElement>();
  function show(step: QuestStep) {
    if (cards.has(step.id)) return;
    const el = h('div.tut', { dataset: { id: step.id } },
      h('div.tt', h('span', { html: icon('quest') }), subst(step.title)),
      h('div.th', { html: emphasise(subst(step.hint)) }),
      step.keys?.length ? h('div.tk', step.keys.map((k) => kbd(k))) : null,
      h('span.chk', { html: icon('check') }));
    stack.appendChild(el); cards.set(step.id, el); sfx('open');
    while (stack.children.length > 4) { const first = stack.firstElementChild as HTMLElement; const id = first.dataset.id; first.remove(); if (id) cards.delete(id); }
  }
  function complete(id: string) {
    const el = cards.get(id); if (!el) return;
    el.classList.add('done'); sfx('success');
    setTimeout(() => { el.remove(); cards.delete(id); }, 1300);
  }
  function card(title: string, html: string, keys?: string[], iconName = 'info', id?: string) {
    const key = id ?? 'card:' + title;
    if (cards.has(key)) return;
    const el = h('div.tut.info', { dataset: { id: key } },
      h('div.tt', h('span', { html: icon(iconName) }), title),
      h('div.body', { html }),
      keys?.length ? h('div.tk', keys.map((k) => kbd(k))) : null,
      h('span.tx', { html: icon('close'), onclick: () => { el.remove(); cards.delete(key); sfx('close'); } }));
    stack.appendChild(el); cards.set(key, el); sfx('open');
    setTimeout(() => { if (cards.get(key) === el) { el.classList.add('done'); setTimeout(() => { el.remove(); cards.delete(key); }, 1300); } }, 14000);
  }
  function info(id: keyof typeof INFO_CARDS) { const c = INFO_CARDS[id]; if (c) card(c.title, c.html, undefined, c.icon, 'info:' + id); }
  function clearAll() { clear(stack); cards.clear(); }
  return { show, complete, card, info, clearAll };
}

/** Wrap key names in the hint with <b>. */
function emphasise(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
    .replace(/\b(WASD|Shift|Space|Tab|Ctrl|Esc|LMB|RMB|MMB|[EQRICJM]|[1-6])\b(?=[^\w]|$)/g, (m) => `<b>${m}</b>`);
}
