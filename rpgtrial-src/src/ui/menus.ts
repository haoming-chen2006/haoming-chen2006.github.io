// Main menu, class select, pause menu, death screen, credits.
import type { ClassId } from '../sim/types.ts';
import { h, button, divider, heading, ornament, sfx, fmtMod, abilityMod, clear } from './dom.ts';
import { icon, CLASS_ICON } from './icons.ts';
import { classList, getAbility, getItem, loadContent } from './content.ts';
import type { UIContext, Screen } from './types.ts';
import type { Nav } from './tabs.ts';

export const TIPS = [
  ['Ability checks', 'Roll a d20, add your modifier, meet or beat the DC. A natural 20 always succeeds.'],
  ['Parry', 'Tap Q just as a blow lands. The first fifth of a second is a parry — the rest is merely a block.'],
  ['Dodge', 'Space rolls you through an attack. You are untouchable for the first third of the roll.'],
  ['Stamina', 'Sprinting and dodging spend stamina. An empty bar leaves you slow and exposed.'],
  ['Spell slots', 'Cantrips are free. Levelled spells burn a blue diamond; rest at a campfire to restore them.'],
  ['Ilyra', 'Your companion heals when she can. Keep her alive and she will keep you alive.'],
  ['Undead', 'Skeletons resist piercing and are vulnerable to bludgeoning. Radiant damage frightens them.'],
  ['Heavy attacks', 'Hold the right mouse button for a quarter second to charge a heavy blow. It breaks poise.'],
  ['Advantage', 'Attacking a staggered or unaware foe rolls two d20s and keeps the higher.'],
  ['The Hollowmere', 'The lake takes what it is given and keeps what it takes. Do not swim.'],
  ['Lock-on', 'Tab or the middle mouse locks the camera to an enemy. Scroll to switch targets.'],
  ['Level 2', 'Three hundred experience earns a level: more hit points and a new feature to choose.'],
];

const SAVE_KEY = 'hm.save';
export function readSave(): { classId: ClassId; name: string } | null { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

// ---------------------------------------------------------------- main menu
export function createMainMenu(ctx: UIContext, nav: Nav): Screen {
  const list = h('div.menu-list'); const tip = h('div.tip');
  const el = h('div.screen#menu', h('div.veil'), h('div.vignette'), h('div.content',
    h('div.title-block', h('div.over', 'A Dungeons & Dragons prologue'), h('h1', 'Hollowmere'), h('div.sub', 'A Prologue'), divider()),
    list),
    h('div.menu-foot', tip, h('div.ver', 'Hollowmere · prologue build')));
  let sel = 0; let items: HTMLButtonElement[] = [];
  function build() {
    clear(list); items = [];
    const add = (label: string, fn: () => void, disabled = false) => { const b = h('button.menu-item', { type: 'button', disabled, onclick: () => { sfx('click'); fn(); } }, label) as HTMLButtonElement; list.appendChild(b); items.push(b); };
    add('New Game', () => nav.show('classSelect'));
    const save = readSave(); if (save) add('Continue', () => { ctx.game.startGame(save.classId, save.name); nav.close(); });
    add('Settings', () => nav.show('settings'));
    add('Credits', () => nav.show('credits'));
    highlight();
  }
  function highlight() { items.forEach((b, i) => b.classList.toggle('sel', i === sel)); }
  let tipTimer = 0; let tipIdx = Math.floor(Math.random() * TIPS.length);
  function rotateTip() { const t = TIPS[tipIdx++ % TIPS.length]; tip.innerHTML = `<b style="color:var(--gold);font-style:normal;font-family:var(--title);font-size:11px;letter-spacing:.2em;text-transform:uppercase">${t[0]}</b> — ${t[1]}`; }
  return {
    el,
    open() { build(); el.classList.add('on'); rotateTip(); tipTimer = window.setInterval(rotateTip, 7000); },
    close() { el.classList.remove('on'); clearInterval(tipTimer); },
    key(code) {
      if (code === 'ArrowDown' || code === 'KeyS') { sel = (sel + 1) % items.length; highlight(); return true; }
      if (code === 'ArrowUp' || code === 'KeyW') { sel = (sel - 1 + items.length) % items.length; highlight(); return true; }
      if (code === 'Enter' || code === 'Space') { items[sel]?.click(); return true; }
      return code === 'Escape';
    },
  };
}

// ---------------------------------------------------------------- class select
export function createClassSelect(ctx: UIContext, nav: Nav): Screen {
  const cards = h('div.class-cards'); const nameInput = h('input', { type: 'text', value: 'Tav', maxLength: 18, spellcheck: false }) as HTMLInputElement;
  const begin = button('Begin', () => start(), 'primary');
  const back = button('Back', () => nav.show('menu'), 'ghost small');
  const el = h('div.screen#classSelect.dim', h('div.veil'), h('div.content',
    heading('Choose your class', 'Who washed ashore on the Hollowmere?'), cards,
    h('div.cs-bottom', back, h('div.field', h('label', 'Name'), nameInput), begin)));
  let selected: ClassId = 'fighter';
  function build() {
    clear(cards);
    for (const c of classList()) {
      const kit = c.kit.slice(0, 6).map((id) => { const a = getAbility(id); return h('span.ki', { html: icon(a.icon), 'data-tip': `<div class="tt-name">${a.name}</div><div class="tt-desc">${a.description}</div>` }); });
      const items = (c.startingItems ?? []).map((s) => { const it = getItem(s.id); return `<b>${it.name}</b>${s.qty > 1 ? ' ×' + s.qty : ''}`; }).join(', ');
      const card = h('div.card' + (c.id === selected ? '.sel' : ''), { dataset: { id: c.id }, onclick: () => { selected = c.id; sfx('click'); [...cards.children].forEach((x) => x.classList.toggle('sel', (x as HTMLElement).dataset.id === c.id)); } },
        h('div.cicon', { html: icon(CLASS_ICON[c.id] ?? 'person') }),
        h('h3', c.name), h('div.hit', `Hit die d${c.hitDie} · AC ${c.ac}`),
        h('div.flav', c.flavour), h('div.desc', c.description),
        h('div.abil-grid', (['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((k) => h('div.abil', h('div.k', k.toUpperCase()), h('div.v', String(c.abilities[k])), h('div.m', fmtMod(abilityMod(c.abilities[k])))))),
        h('h3.sec', 'Abilities'), h('div.kit', kit),
        items ? h('h3.sec', 'Starting kit') : null, items ? h('div.items', { html: items }) : null);
      cards.appendChild(card);
    }
  }
  function start() {
    const name = nameInput.value.trim() || 'Tav';
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ classId: selected, name })); } catch {}
    sfx('success'); nav.close(); ctx.game.startGame(selected, name);
  }
  return {
    el,
    open() { loadContent().then(build); build(); el.classList.add('on'); setTimeout(() => nameInput.focus(), 50); },
    close() { el.classList.remove('on'); nameInput.blur(); },
    key(code, e) {
      if (document.activeElement === nameInput) { if (code === 'Enter') { start(); return true; } if (code === 'Escape') { nameInput.blur(); return true; } return true; }
      const ids = classList().map((c) => c.id); const i = ids.indexOf(selected);
      if (code === 'ArrowRight' || code === 'KeyD') { selected = ids[(i + 1) % ids.length]; build(); return true; }
      if (code === 'ArrowLeft' || code === 'KeyA') { selected = ids[(i - 1 + ids.length) % ids.length]; build(); return true; }
      if (code === 'Enter') { start(); return true; }
      if (code === 'Escape') { nav.show('menu'); return true; }
      e.preventDefault(); return true;
    },
  };
}

// ---------------------------------------------------------------- pause
export function createPause(ctx: UIContext, nav: Nav): Screen {
  const el = h('div.screen#pause', h('div.veil'), ornament(h('div.panel.blur.menu-panel.content',
    heading('Paused'),
    h('div.menu-list',
      h('button.menu-item', { type: 'button', onclick: () => { sfx('click'); nav.close(); } }, 'Resume'),
      h('button.menu-item', { type: 'button', onclick: () => { sfx('click'); nav.show('settings'); } }, 'Settings'),
      h('button.menu-item', { type: 'button', onclick: () => { sfx('click'); ctx.game.restart(); } }, 'Restart'),
      h('button.menu-item', { type: 'button', onclick: () => { sfx('click'); try { localStorage.removeItem(SAVE_KEY); } catch {} ctx.game.restart(); } }, 'Quit to menu')),
    h('div.screen-hint', { style: { position: 'static', marginTop: '18px' } }, h('span', 'Esc to resume')))));
  return { el, open() { el.classList.add('on'); }, close() { el.classList.remove('on'); }, key(code) { if (code === 'Escape') { nav.close(); return true; } return false; } };
}

// ---------------------------------------------------------------- death
export function createDeath(ctx: UIContext, nav: Nav): Screen {
  let rising = false; let riseTimer = 0;
  const rise = h('button.menu-item', { type: 'button', onclick: () => {
    if (rising) return; sfx('click');
    const pr = (ctx.game as any).prologue; const w = ctx.world as any;
    if (!pr || typeof pr.respawn !== 'function') { ctx.game.restart(); return; }
    // The prologue respawns at the last checkpoint and emits `respawn`, which closes this screen. It only reads the
    // request after its own fade-out (and re-arms it then), so keep asking; if nothing answers — a death outside a
    // scripted encounter — revive through the world directly, and close regardless after 6 s.
    rising = true; rise.textContent = 'Rising…'; (rise as HTMLButtonElement).disabled = true;
    const t0 = Date.now(); pr.respawn();
    riseTimer = window.setInterval(() => {
      if (!el.classList.contains('on')) { clearInterval(riseTimer); return; }
      const dt = Date.now() - t0;
      if (dt > 6000) { clearInterval(riseTimer); nav.close(); return; }
      if (dt > 1800 && w.player?.dead && typeof w.respawn === 'function') w.respawn(); else pr.respawn();
    }, 400);
  } }, 'Rise again');
  const el = h('div.screen#death', h('div.veil'), h('div.content',
    h('div.death-block',
      h('div.over', 'Death saving throw failed'),
      h('h1', 'You have fallen'),
      h('div.dsave', h('i'), h('i'), h('i')),
      h('div.sub', 'The Hollowmere keeps what it takes.'),
      divider(),
      h('div.menu-list',
        rise,
        h('button.menu-item', { type: 'button', onclick: () => { sfx('click'); try { localStorage.removeItem(SAVE_KEY); } catch {} ctx.game.restart(); } }, 'Main menu')))));
  return {
    el,
    open() { rising = false; rise.textContent = 'Rise again'; (rise as HTMLButtonElement).disabled = false; el.classList.add('on'); sfx('fail'); },
    close() { el.classList.remove('on'); clearInterval(riseTimer); },
    key() { return true; },
  };
}

// ---------------------------------------------------------------- credits
export function createCredits(ctx: UIContext, nav: Nav): Screen {
  const el = h('div.screen#credits', h('div.veil'), ornament(h('div.panel.blur.menu-panel.content',
    heading('Credits'),
    h('div.credits', { html: CREDITS_HTML }),
    h('div', { style: { textAlign: 'center', marginTop: '18px' } }, button('Back', () => nav.back(), 'ghost small')))));
  return { el, open() { el.classList.add('on'); }, close() { el.classList.remove('on'); }, key(code) { if (code === 'Escape') { nav.back(); return true; } return false; } };
}
export const CREDITS_HTML = `
  <h4>Design & code</h4><div>Hollowmere — a prologue, built in TypeScript with three.js</div>
  <h4>Characters & props</h4><div><b>KayKit</b> Adventurers, Skeletons & Dungeon packs — CC0</div>
  <h4>Textures, HDRIs & props</h4><div><b>Poly Haven</b> — CC0</div>
  <h4>Typefaces</h4><div><b>Cinzel</b> by Natanael Gama · <b>EB Garamond</b> by Georg Duffner — SIL Open Font License</div>
  <h4>Libraries</h4><div>three.js · pmndrs postprocessing · N8AO</div>
  <h4>Rules</h4><div>Inspired by the 5th edition System Reference Document</div>
  <h4>With gratitude to</h4><div>Larian Studios, FromSoftware and CD Projekt Red for showing the way</div>`;
