import { hashString } from '../../core/rng.ts';
import { VILLAGER_BY_ID } from '../../core/villagers.ts';
import { guardTextField, h, icon, img, setHidden } from '../dom.ts';
import { cap, type Panel, type UiCore } from '../shared.ts';

export const TAGLINE = 'Ten villagers, ten minds. You live among them.';

export function createTitle(core: UiCore): Panel {
  const { ctx } = core;
  const seedInput = h('input', { class: 'pb-input', id: 'pb-seed', type: 'text', placeholder: 'seed (number or words)', value: String(ctx.world.seed), 'aria-label': 'Village seed' });
  guardTextField(seedInput);
  const randomBtn = h('button', { class: 'pb-btn ghost', title: 'Pick a random seed', onclick: () => { seedInput.value = String(Math.floor(Math.random() * 1e9)); } }, 'Random');
  const seedOf = (): number => { const s = seedInput.value.trim(); if (!s) return Math.floor(Math.random() * 1e9); const n = Number(s); return Number.isFinite(n) && /^\d+$/.test(s) ? n : hashString(s); };
  const newBtn = h('button', { class: 'pb-btn big', id: 'pb-new', onclick: () => { const seed = seedOf(); try { const u = new URL(location.href); u.searchParams.set('seed', String(seed)); history.replaceState(null, '', u.toString()); } catch { /* file: */ } core.showTitle(false); ctx.newGame(seed); } }, 'New village');
  const contBtn = h('button', { class: 'pb-btn big wood', id: 'pb-continue', onclick: () => { if (ctx.load()) core.showTitle(false); else core.toast('No saved village found', 'warn'); } }, 'Continue');
  const howBtn = h('button', { class: 'pb-btn wood', onclick: () => core.open('howto') }, 'How to play');
  const rosterBtn = h('button', { class: 'pb-btn wood', onclick: () => core.open('roster') }, 'Villagers');
  const settingsBtn = h('button', { class: 'pb-btn wood', onclick: () => core.open('settings') }, 'Settings');

  const castRow = h('div', { class: 'pb-row wrap', style: 'gap:6px' });
  const brainLine = h('div', { class: 'pb-small pb-muted' });

  const card = h('div', { class: 'pb-title-card' },
    h('div', { class: 'pb-frame' },
      h('div', { class: 'pb-body' },
        h('div', { class: 'pb-title-logo' }, h('h1', null, 'Pebblebrook'), h('div', { class: 'tag' }, TAGLINE)),
        h('div', { class: 'pb-title-cols' },
          h('div', { class: 'pb-title-menu' },
            h('div', { class: 'seedrow' }, seedInput, randomBtn),
            newBtn, contBtn, h('div', { class: 'pb-sep' }), howBtn, rosterBtn, settingsBtn),
          h('div', { class: 'pb-title-side' },
            h('h3', null, 'A living village'),
            h('p', { class: 'pb-small' }, 'Every villager is run by their own agent: needs, a personality, a memory of what they saw and heard, opinions of each other, and a day they plan for themselves. Nobody follows a script. They farm, gossip, trade, fall out and make up; you can walk in, talk, trade, help — or open the Director panel and read their minds.'),
            h('h3', { style: 'margin-top:12px' }, 'The cast'),
            castRow,
            brainLine)),
        h('div', { class: 'pb-title-foot' }, 'Art: Kenney (CC0) · Music and sounds synthesised in your browser · Built with TypeScript and Canvas, no engine'))));
  const el = h('div', { class: 'pb-screen', id: 'pb-title' }, card);

  function show(): void {
    setHidden(contBtn, !core.hasSave());
    castRow.replaceChildren(...ctx.sim.villagers.map((v) => { const i = img(core.portrait(v), 'pb-portrait sm', v.name); i.title = `${v.name} — ${cap(v.profession)}`; i.style.cursor = 'pointer'; i.onclick = () => core.open('roster'); return i; }));
    const llm = ctx.getLlm();
    brainLine.replaceChildren(icon('brain'), ' ', llm.provider === 'none' ? 'Local brains (no key). Add an API key in Settings to let them think with a model.' : `${cap(llm.provider)} · ${llm.model} · ${llm.mode}`);
    setTimeout(() => newBtn.focus(), 0);
  }

  return { id: 'title', el, modal: true, closable: false, show, hide() {}, tick() {} };
}

/** Roster cards, opened from the title screen. */
export function createRoster(core: UiCore, frameFn: typeof import('./frame.ts').frame): Panel {
  const { win, body } = frameFn(core, 'roster', { title: 'The villagers', cls: 'pb-rosterwin' });
  const grid = h('div', { class: 'pb-roster' });
  body.appendChild(grid);
  return {
    id: 'roster', el: win, modal: true, closable: true,
    show() {
      grid.replaceChildren(...core.ctx.sim.villagers.map((v) => {
        const spec = VILLAGER_BY_ID[v.id];
        return h('div', { class: 'pb-card' }, img(core.portrait(v), 'pb-portrait', v.name),
          h('div', null, h('b', null, v.name), h('div', { class: 'prof' }, cap(v.profession)), h('div', { class: 'blurb' }, spec?.blurb ?? ''), h('div', { class: 'blurb', style: 'margin-top:4px' }, spec ? spec.personality.traits.join(' · ') : '')));
      }));
    }, hide() {}, tick() {},
  };
}
