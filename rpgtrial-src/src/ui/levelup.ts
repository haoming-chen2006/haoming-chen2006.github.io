// Level-up screen: fanfare, HP gain, 2–3 feature cards from CLASSES[cls].levelUpChoices → world.chooseLevelUp(id).
import { h, ornament, sfx, clear, abilityMod, fmtMod } from './dom.ts';
import { icon, CLASS_ICON } from './icons.ts';
import { getClass } from './content.ts';
import type { UIContext, Screen } from './types.ts';
import type { Nav } from './tabs.ts';

const CHOICE_ICON: Record<string, string> = { defense: 'ac', dueling: 'sword', tough: 'heal', evocation: 'fire', abjuration: 'shieldSpell', warCaster: 'sparkle', assassin: 'dagger', thief: 'key', alert: 'eye', berserker: 'rage', totemBear: 'fist', greatWeaponMaster: 'greatsword', archery: 'bow', hunter: 'mark', sharpshooter: 'crossbow',
  defensiveDuelist: 'shield', empoweredEvocation: 'fire', assassinate: 'dagger', mobile: 'boot', brutalCritical: 'axe', savageAttacker: 'greatsword' };

let announcedLevel = 0;
/** The level the sim announced in the `levelUp` event (the actor's `level` may or may not be bumped yet). */
export function setAnnouncedLevel(l: number) { announcedLevel = l; }

export function createLevelUp(ctx: UIContext, nav: Nav): Screen {
  const title = h('div.lv-fanfare', 'Level up'); const sub = h('div.lv-sub'); const gains = h('div.lv-gains'); const cards = h('div.lv-cards');
  const panel = ornament(h('div.panel.blur.lv-panel.content', title, sub, gains, h('h3.sec', { style: { justifyContent: 'center' } }, 'Choose a feature'), cards,
    h('div.screen-hint', { style: { position: 'static' } }, h('span', 'Click a card, or press 1–3'))));
  const el = h('div.screen#levelUp', h('div.veil'), panel);
  let choices: { id: string; name: string; description: string }[] = [];

  function render() {
    const p = ctx.world.player; const cls = getClass(p?.classId);
    // rules.ts bumps `level` before it emits `levelUp` (pendingLevelUps counts the unmade choice), so never add one
    const lvl = Math.max(announcedLevel || (p?.level ?? 2), 2);
    sub.textContent = `${p?.name ?? 'Tav'} reaches level ${lvl} as a ${cls.name}.`;
    const conMod = p ? abilityMod(p.abilities.con) : 2; const hpGain = Math.floor(cls.hitDie / 2) + 1 + conMod;
    clear(gains);
    gains.append(h('span', { html: `${icon('heal')}Hit points <b>+${hpGain}</b>` }), h('span', { html: `${icon('dice')}Hit dice <b>+1d${cls.hitDie}</b>` }),
      h('span', { html: `${icon(CLASS_ICON[cls.id] ?? 'star')}Proficiency <b>${fmtMod(p?.prof ?? 2)}</b>` }));
    choices = cls.levelUpChoices?.length ? cls.levelUpChoices : [{ id: 'tough', name: 'Tough', description: '+2 hit points per level.' }];
    clear(cards);
    choices.forEach((c, i) => cards.appendChild(h('div.lv-card', { onclick: () => pick(i) }, h('div.li', { html: icon(CHOICE_ICON[c.id] ?? 'star') }), h('div.ln', c.name), h('div.ld', c.description))));
  }
  function pick(i: number) {
    const c = choices[i]; if (!c) return;
    sfx('levelup');
    const w = ctx.world as any; if (typeof w.chooseLevelUp === 'function') w.chooseLevelUp(c.id);
    nav.close();
  }
  return {
    el,
    open() { render(); el.classList.add('on'); sfx('levelup'); },
    close() { el.classList.remove('on'); },
    key(code) { const d = /^Digit([1-9])$/.exec(code); if (d) { pick(Number(d[1]) - 1); return true; } return true; },
  };
}
