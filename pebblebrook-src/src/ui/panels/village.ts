import type { Villager } from '../../core/types.ts';
import { h, highlightNames, img, replaceChildren, setClass, setClassName, setText, Throttle } from '../dom.ts';
import { affinityColor, doing, fmtStamp, moodClass, moodWord, shortName, whereIs, type Panel, type UiCore } from '../shared.ts';
import { frame } from './frame.ts';

type Tab = 'villagers' | 'story' | 'web';
const SVG = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };
const dots = (n: number): HTMLElement => h('span', { class: 'pb-dots' }, ...Array.from({ length: 10 }, (_, i) => h('i', { class: i < n ? 'on' : '' })));

export function createVillage(core: UiCore): Panel {
  const { ctx } = core;
  const { win, body } = frame(core, 'village', { title: 'Pebblebrook', key: 'V', cls: 'pb-village' });
  let tab: Tab = 'villagers';
  const tabs: Record<Tab, HTMLButtonElement> = {
    villagers: h('button', { class: 'pb-tab on', onclick: () => setTab('villagers') }, 'Who is where'),
    story: h('button', { class: 'pb-tab', onclick: () => setTab('story') }, 'Storyboard'),
    web: h('button', { class: 'pb-tab', onclick: () => setTab('web') }, 'Relationships'),
  };
  const countEl = h('span', { class: 'pb-small pb-muted pb-right', style: 'align-self:center' });
  body.append(h('div', { class: 'pb-tabs' }, tabs.villagers, tabs.story, tabs.web, countEl));

  // ---- villagers table
  const tbody = h('tbody');
  const table = h('div', { class: 'pane' }, h('table', { class: 'pb-table' }, h('thead', null, h('tr', null, h('th'), h('th', null, 'Villager'), h('th', null, 'Where'), h('th', null, 'Doing'), h('th', null, 'Mood'), h('th', null, 'Brain'))), tbody));
  const rows = new Map<string, { tr: HTMLTableRowElement; where: HTMLElement; doing: HTMLElement; mood: HTMLElement; brain: HTMLElement; thought: HTMLElement }>();
  function buildRows(): void {
    rows.clear();
    replaceChildren(tbody, ctx.sim.villagers.map((v) => {
      const where = h('td'), doingEl = h('td'), mood = h('span', { class: 'pb-chip' }), brain = h('td', { class: 'pb-small pb-muted' });
      const thought = h('div', { class: 'pb-small pb-mute2', style: 'font-style:italic' });
      doingEl.appendChild(h('div')); doingEl.appendChild(thought);
      const tr = h('tr', { class: 'click', tabindex: 0, onclick: () => core.openInspector(v), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') core.openInspector(v); } }, h('td', null, img(core.portrait(v), 'pb-portrait sm', v.name)), h('td', null, h('b', null, v.name), h('div', { class: 'pb-small pb-muted' }, v.profession)), where, doingEl, h('td', null, mood), brain);
      rows.set(v.id, { tr, where, doing: doingEl.firstElementChild as HTMLElement, mood, brain, thought });
      return tr;
    }));
  }
  function refreshRows(): void {
    for (const v of ctx.sim.villagers) {
      const r = rows.get(v.id); if (!r) continue;
      setText(r.where, whereIs(ctx, v) + (v.inside ? ' (inside)' : ''));
      setText(r.doing, doing(v)); setText(r.thought, v.action?.thought ? `“${v.action.thought}”` : '');
      setText(r.mood, moodWord(v.mood)); setClassName(r.mood, `pb-chip ${moodClass(v.mood)}`);
      setText(r.brain, v.brain === 'llm' ? 'model' : 'local');
      setClass(r.tr, 'sel', ctx.sim.player.talkingTo === v.id);
    }
  }

  // ---- storyboard
  const slider = h('input', { class: 'pb-range', type: 'range', min: 1, max: 9, value: 4, style: 'width:140px', 'aria-label': 'Minimum importance' });
  const sliderV = h('span', { class: 'pb-small pb-muted' }, 'importance ≥ 4');
  slider.oninput = () => { minImp = Number(slider.value); setText(sliderV, minImp <= 1 ? 'everything' : `importance ≥ ${minImp}`); lastStoryKey = ''; };
  let minImp = 4, lastStoryKey = '';
  const storyList = h('div', { class: 'pb-story' });
  const story = h('div', { class: 'pane', hidden: true }, h('div', { class: 'pb-row', style: 'margin-bottom:8px' }, h('span', { class: 'pb-small' }, 'Show:'), slider, sliderV, h('span', { class: 'pb-small pb-mute2 pb-right' }, 'newest first · click a name to inspect')), storyList);
  function refreshStory(): void {
    const all = ctx.sim.chronicle;
    const list = all.filter((c) => c.importance >= minImp).slice(-200).reverse();
    const key = `${minImp}|${all.length}|${list[0]?.t ?? 0}`;
    if (key === lastStoryKey) return;
    lastStoryKey = key;
    replaceChildren(storyList, list.length ? list.map((c) => h('div', { class: `e ${c.importance >= 8 ? 'big' : c.importance >= 6 ? 'hi' : ''}` }, h('span', { class: 't' }, fmtStamp(c.t), dots(c.importance)), h('span', null, ...highlightNames(c.text, core.names, (id) => { const v = ctx.sim.villager(id); if (v) core.openInspector(v); })))) : [h('div', { class: 'pb-empty' }, 'Nothing notable yet. Lower the slider, or give it a day.')]);
  }

  // ---- relationship web
  const webSvg = svg('svg', { viewBox: '0 0 600 520', preserveAspectRatio: 'xMidYMid meet' });
  const edgeLayer = svg('g', { class: 'edges' }), nodeLayer = svg('g', { class: 'nodes' });
  webSvg.append(edgeLayer, nodeLayer);
  const legend = h('div', { class: 'legend' }, h('h3', null, 'Reading the web'),
    h('div', null, h('span', { class: 'sw', style: `background:${affinityColor(80)}` }), 'close friends'), h('div', null, h('span', { class: 'sw', style: `background:${affinityColor(35)}` }), 'friendly'), h('div', null, h('span', { class: 'sw', style: `background:${affinityColor(0)}` }), 'neutral'), h('div', null, h('span', { class: 'sw', style: `background:${affinityColor(-50)}` }), 'rivals'),
    h('div', { class: 'pb-small pb-muted', style: 'margin-top:4px' }, 'Thicker lines mean they spend more time together. Hover a face to see only their ties; click to inspect.'),
    h('div', { class: 'pb-small pb-mute2', id: 'pb-web-hint', style: 'margin-top:8px' }));
  const web = h('div', { class: 'pane pb-web', hidden: true }, webSvg, legend);
  const edges = new Map<string, SVGLineElement>();
  let webBuilt = false;
  function positions(): Map<string, { x: number; y: number }> {
    const vs = ctx.sim.villagers; const m = new Map<string, { x: number; y: number }>();
    vs.forEach((v, i) => { const a = -Math.PI / 2 + (i / vs.length) * Math.PI * 2; m.set(v.id, { x: 300 + Math.cos(a) * 210, y: 260 + Math.sin(a) * 200 }); });
    return m;
  }
  function buildWeb(): void {
    webBuilt = true; edges.clear(); edgeLayer.replaceChildren(); nodeLayer.replaceChildren();
    const pos = positions(); const vs = ctx.sim.villagers;
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
      const a = vs[i], b = vs[j]; const pa = pos.get(a.id)!, pb = pos.get(b.id)!;
      const line = svg('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, class: 'edge', 'data-a': a.id, 'data-b': b.id, 'stroke-linecap': 'round' });
      edges.set(`${a.id}|${b.id}`, line); edgeLayer.appendChild(line);
    }
    for (const v of vs) {
      const p = pos.get(v.id)!;
      const g = svg('g', { class: 'node', transform: `translate(${p.x},${p.y})`, tabindex: 0, role: 'button' });
      g.appendChild(svg('circle', { r: 26, fill: '#f3e6c8', stroke: '#6b4a2b', 'stroke-width': 3 }));
      const im = svg('image', { x: -20, y: -20, width: 40, height: 40, href: core.portrait(v), style: 'image-rendering:pixelated' });
      g.appendChild(im);
      const t = svg('text', { y: 42, 'text-anchor': 'middle' }); t.textContent = shortName(v); g.appendChild(t);
      g.addEventListener('mouseenter', () => focusNode(v.id)); g.addEventListener('mouseleave', () => focusNode(null)); g.addEventListener('focus', () => focusNode(v.id)); g.addEventListener('blur', () => focusNode(null));
      g.addEventListener('click', () => core.openInspector(v)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') core.openInspector(v); });
      nodeLayer.appendChild(g);
    }
    refreshWeb();
  }
  function focusNode(id: string | null): void {
    setClass(web, 'focus', !!id);
    for (const [k, line] of edges) { const [a, b] = k.split('|'); setClass(line, 'on', !!id && (a === id || b === id)); }
    const hint = legend.querySelector('#pb-web-hint') as HTMLElement;
    if (!id) { setText(hint, ''); return; }
    const v = ctx.sim.villager(id); if (!v) return;
    const rels = Object.entries(v.relationships).filter(([k]) => k !== 'player').map(([k, r]) => ({ k, r })).sort((x, y) => y.r.affinity - x.r.affinity);
    const best = rels[0], worst = rels[rels.length - 1];
    setText(hint, `${shortName(v)}: closest to ${best ? shortName(ctx.sim.villager(best.k) ?? { name: best.k }) : '—'}${worst && worst.r.affinity < 0 ? `, coolest towards ${shortName(ctx.sim.villager(worst.k) ?? { name: worst.k })}` : ''}.`);
  }
  function refreshWeb(): void {
    for (const [k, line] of edges) {
      const [a, b] = k.split('|'); const va = ctx.sim.villager(a), vb = ctx.sim.villager(b); if (!va || !vb) continue;
      const ra = va.relationships[b], rb = vb.relationships[a];
      const aff = ((ra?.affinity ?? 0) + (rb?.affinity ?? 0)) / 2, fam = ((ra?.familiarity ?? 0) + (rb?.familiarity ?? 0)) / 2;
      const w = 1 + fam / 20; const show = Math.abs(aff) >= 8 || fam >= 40;
      line.setAttribute('stroke', affinityColor(aff)); line.setAttribute('stroke-width', String(w.toFixed(1)));
      line.style.display = show ? '' : 'none';
      line.setAttribute('opacity', String((0.35 + Math.min(1, Math.abs(aff) / 60) * 0.65).toFixed(2)));
      const romance = Math.max(ra?.romance ?? 0, rb?.romance ?? 0);
      line.setAttribute('stroke-dasharray', romance > 25 ? '6 4' : '');
    }
  }

  body.append(table, story, web);
  function setTab(t: Tab): void { tab = t; for (const [k, b] of Object.entries(tabs)) setClass(b, 'on', k === t); table.hidden = t !== 'villagers'; story.hidden = t !== 'story'; web.hidden = t !== 'web'; if (t === 'web' && !webBuilt) buildWeb(); if (t === 'story') { lastStoryKey = ''; refreshStory(); } }

  const th = new Throttle(0.25), thWeb = new Throttle(1);
  let villagerKey = '';
  function tick(dt: number): void {
    if (th.tick(dt)) {
      const vk = ctx.sim.villagers.map((v) => v.id).join(',');
      if (vk !== villagerKey) { villagerKey = vk; buildRows(); webBuilt = false; if (tab === 'web') buildWeb(); }
      if (tab === 'villagers') refreshRows();
      if (tab === 'story') refreshStory();
      setText(countEl, `${ctx.sim.villagers.length} villagers · ${ctx.sim.conversations.filter((c) => !c.done).length} talking · ${ctx.sim.events.length} events`);
    }
    if (tab === 'web' && thWeb.tick(dt)) refreshWeb();
  }
  return { id: 'village', el: win, modal: false, closable: true, show() { th.force(); setTab(tab); }, hide() {}, tick };
}
export type { Villager };
