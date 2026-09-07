import { item as itemDef } from '../../core/items.ts';
import type { Memory, MemoryKind, Villager } from '../../core/types.ts';
import { guardTextField, h, icon, img, pct, replaceChildren, setClass, setClassName, setHidden, setText, setStyle, Throttle } from '../dom.ts';
import { affinityColor, cap, doing, fmtAgo, moodClass, moodWord, NEED_LABELS, NEED_NAMES, REL_LABEL_CLASS, shortName, SKILL_NAMES, whereIs, type Panel, type UiCore } from '../shared.ts';
import { frame } from './frame.ts';

export interface InspectorPanel extends Panel { open(v: Villager): void; current(): Villager | null }

const KINDS: (MemoryKind | 'all')[] = ['all', 'observation', 'conversation', 'gossip', 'reflection', 'event', 'plan'];
const KIND_SHORT: Record<string, string> = { observation: 'saw', conversation: 'talk', gossip: 'gossip', reflection: 'thought', event: 'event', plan: 'plan', all: 'all' };
const fmtHour = (hour: number): string => { const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60); const h12 = hh % 12 === 0 ? 12 : hh % 12; return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${hh < 12 ? 'am' : 'pm'}`; };
const dots = (n: number, max = 10, cls = 'pb-dots'): HTMLElement => h('span', { class: cls }, ...Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));

export function createInspector(core: UiCore): InspectorPanel {
  const { ctx } = core;
  const prevBtn = h('button', { class: 'pb-btn wood sm', title: 'Previous villager (Shift+Tab)', onclick: () => cycle(-1) }, '◀');
  const nextBtn = h('button', { class: 'pb-btn wood sm', title: 'Next villager (Tab)', onclick: () => cycle(1) }, '▶');
  const { win, body } = frame(core, 'inspector', { title: 'Inspector', key: 'Tab', cls: 'pb-inspector', pos: 'side', headExtra: [prevBtn, nextBtn] });

  const portrait = img('', 'pb-portrait', '');
  const nameEl = h('div', { class: 'nm' }), profEl = h('div', { class: 'pf' }), whereEl = h('div', { class: 'pb-small pb-muted' });
  const moodChip = h('span', { class: 'pb-chip' });
  const flags = h('div', { class: 'flags' }, moodChip);
  const followBtn = h('button', { class: 'pb-btn sm', onclick: () => { if (!v) return; ctx.renderer.follow = ctx.renderer.follow === v.id ? 'player' : v.id; core.toast(ctx.renderer.follow === v.id ? `Following ${shortName(v)}` : 'Camera back on you'); } }, 'Follow');
  const brainBtn = h('button', { class: 'pb-btn ghost sm', title: 'Which brain drives this villager', onclick: () => { if (!v) return; const next = v.brain === 'llm' ? 'local' : 'llm'; if (next === 'llm' && (!ctx.sim.brains.llm || ctx.getLlm().provider === 'none')) { core.toast('No AI provider configured — Settings → AI brains', 'warn'); return; } ctx.sim.setBrain(v.id, next); core.toast(`${shortName(v)} now thinks with the ${next === 'llm' ? 'model' : 'local brain'}`); } }, icon('brain'), h('span', null, 'local'));
  const talkBtn = h('button', { class: 'pb-btn ghost sm', title: 'Open the dialogue (only when you are next to them)', onclick: () => { if (v) core.openDialogue(v); } }, 'Talk');
  const top = h('div', { class: 'top' }, portrait, h('div', { class: 'grow' }, nameEl, profEl, whereEl, flags, h('div', { class: 'pb-row', style: 'margin-top:6px;gap:4px' }, followBtn, brainBtn, talkBtn)));

  const needRows = NEED_NAMES.map((n) => ({ n, bar: h('div', { class: 'pb-bar' }, h('i')), v: h('span', { class: 'v' }) }));
  const needs = h('div', { class: 'needs' }, ...needRows.flatMap((r) => [h('span', null, NEED_LABELS[r.n]), r.bar, r.v]));

  const actLabel = h('div', { class: 'lbl' }), actThought = h('div', { class: 'th' }), actBar = h('div', { class: 'pb-bar' }, h('i')), actEta = h('span', { class: 'pb-small pb-mute2' });
  const action = h('div', { class: 'action' }, h('div', { class: 'pb-row' }, actLabel, h('span', { class: 'pb-right' }, actEta)), actThought, actBar);
  const queueEl = h('div', { class: 'pb-small pb-muted' });

  const planEl = h('div', { class: 'plan' }), planSummary = h('div', { class: 'pb-small pb-muted', style: 'margin-bottom:4px' });
  const goalsEl = h('div', { class: 'goals pb-col', style: 'gap:2px' });
  const relsEl = h('div', { class: 'rels' }), bestEl = h('div', { class: 'best' });

  const search = h('input', { class: 'pb-input', placeholder: 'search memories', 'aria-label': 'Search memories' });
  guardTextField(search); search.oninput = () => memKey.force();
  const filterBtns = KINDS.map((k) => h('button', { class: `pb-btn ghost f ${k === 'all' ? 'on' : ''}`, 'data-kind': k, onclick: () => { filter = k; filterBtns.forEach((b) => setClass(b, 'on', b.dataset.kind === k)); memKey.force(); } }, KIND_SHORT[k]));
  const memTools = h('div', { class: 'memtools' }, ...filterBtns, search);
  const memEl = h('div', { class: 'mem' }), memCount = h('span', { class: 'pb-small pb-mute2 pb-right' });
  const skillsEl = h('div', { class: 'skills' }), invEl = h('div', { class: 'inv' }), moneyEl = h('span', { class: 'pb-right' });

  const section = (title: string, ...kids: (HTMLElement | null)[]) => h('div', { class: 'pb-section' }, h('h3', { class: 'pb-row' }, title, ...kids.filter((k) => k && k.classList.contains('pb-right'))), ...kids.filter((k) => k && !k.classList.contains('pb-right')));
  body.append(top, section('Needs', needs), section('Right now', action, queueEl), section('Today’s plan', planSummary, planEl), section('Goals', goalsEl), section('Relationships', relsEl, bestEl), section('Memory stream', memCount, memTools, memEl), section('Skills', skillsEl), section('Pockets', moneyEl, invEl));

  let v: Villager | null = null;
  let filter: MemoryKind | 'all' = 'all';
  const fast = new Throttle(0.25), memKey = new Throttle(0.5), relKey = new Throttle(1);
  let lastRelKey = '', lastMemKey = '', lastPlanKey = '', lastGoalKey = '', lastInvKey = '', lastFlags = '';

  function cycle(dir: number): void {
    const list = ctx.sim.villagers; if (!list.length) return;
    const i = v ? list.findIndex((x) => x.id === v!.id) : -1;
    open(list[(i + dir + list.length) % list.length]);
  }

  function open(vv: Villager): void {
    v = vv;
    portrait.src = core.portrait(vv); portrait.alt = vv.name;
    setText(nameEl, vv.name); setText(profEl, cap(vv.profession));
    lastRelKey = lastMemKey = lastPlanKey = lastGoalKey = lastInvKey = lastFlags = '';
    memEl.scrollTop = 0;
    fast.force(); memKey.force(); relKey.force();
    refresh();
  }

  function refresh(): void {
    if (!v) return;
    setText(whereEl, `${whereIs(ctx, v)} · ${Math.round(v.money)} coins · health ${Math.round(v.health)}`);
    const fl = `${moodWord(v.mood)}|${v.status.join(',')}|${v.brain}|${ctx.renderer.follow}`;
    if (fl !== lastFlags) {
      lastFlags = fl;
      setText(moodChip, moodWord(v.mood)); setClassName(moodChip, `pb-chip ${moodClass(v.mood)}`);
      replaceChildren(flags, [moodChip, ...v.status.map((s) => h('span', { class: `pb-chip ${s === 'sick' || s === 'injured' || s === 'angry' ? 'bad' : s === 'inLove' || s === 'celebrating' || s === 'inspired' ? 'love' : 'muted'}` }, s === 'inLove' ? 'in love' : s))]);
      setText(brainBtn.lastChild as Element, v.brain === 'llm' ? 'model' : 'local'); setClass(brainBtn, 'on', v.brain === 'llm');
      setClass(followBtn, 'on', ctx.renderer.follow === v.id); setText(followBtn, ctx.renderer.follow === v.id ? 'Following' : 'Follow');
    }
    for (const r of needRows) { const val = v.needs[r.n]; setStyle(r.bar.firstElementChild as HTMLElement, 'width', pct(val)); setText(r.v, String(Math.round(val))); setClassName(r.bar, `pb-bar ${val < 25 ? 'low' : val < 50 ? 'mid' : ''}`); }
    const a = v.action;
    setText(actLabel, a ? a.label : doing(v)); setText(actThought, a?.thought ? `“${a.thought}”` : ''); setHidden(actThought, !a?.thought);
    setStyle(actBar.firstElementChild as HTMLElement, 'width', pct(a ? a.progress : 0, 1)); setHidden(actBar, !a);
    setText(actEta, a ? `${Math.max(0, Math.round(a.endsAt - ctx.world.time.minute))} min left` : '');
    setText(queueEl, v.queue.length ? `Then: ${v.queue.map((q) => q.tool.replace(/_/g, ' ')).join(', ')}` : '');
    // plan
    const hourNow = ctx.world.time.hour + ctx.world.time.min / 60;
    const entries = v.plan?.entries ?? [];
    const curIdx = entries.reduce((best, e, i) => (e.hour <= hourNow ? i : best), -1);
    const pk = `${v.plan?.day}|${entries.map((e) => `${e.hour}${e.block}${e.place ?? ''}${e.note ?? ''}`).join(';')}|${curIdx}`;
    if (pk !== lastPlanKey) {
      lastPlanKey = pk; setText(planSummary, v.plan?.summary ?? 'No plan yet.');
      replaceChildren(planEl, entries.flatMap((e, i) => { const cls = i === curIdx ? 'now' : i < curIdx ? 'past' : ''; const pl = e.place ? ctx.world.place(e.place)?.name : ''; return [h('span', { class: `t ${cls}` }, fmtHour(e.hour)), h('span', { class: cls }, `${cap(e.block)}${pl ? ` · ${pl}` : ''}${e.note ? ` — ${e.note}` : ''}`)]; }));
    }
    const gk = v.goals.map((g) => `${g.id}${g.done}${g.progress}`).join(';');
    if (gk !== lastGoalKey) { lastGoalKey = gk; replaceChildren(goalsEl, v.goals.length ? [...v.goals].sort((x, y) => Number(!!x.done) - Number(!!y.done) || y.priority - x.priority).map((g) => h('div', { class: `g ${g.done ? 'done' : ''}` }, h('span', { class: 'p' }, `P${g.priority}`), h('span', null, g.text, g.progress ? h('span', { class: 'pb-mute2' }, ` — ${g.progress}`) : null))) : [h('div', { class: 'pb-empty' }, 'No goals right now.')]); }
  }

  function refreshRels(): void {
    if (!v) return;
    const rels = Object.entries(v.relationships).map(([id, r]) => ({ id, r, o: id === 'player' ? null : ctx.sim.villager(id) })).filter((x) => x.o || x.id === 'player');
    rels.sort((a, b) => b.r.affinity - a.r.affinity);
    const key = rels.map((x) => `${x.id}${Math.round(x.r.affinity)}${x.r.label}${Math.round(x.r.familiarity)}${x.r.notes.length}`).join(';');
    if (key === lastRelKey) return;
    lastRelKey = key;
    replaceChildren(relsEl, rels.map(({ id, r, o }) => {
      const name = o ? shortName(o) : 'You';
      const bar = h('div', { class: 'pb-bar aff', style: 'height:8px' }, h('i', { class: r.affinity < 0 ? 'neg' : '', style: `width:${Math.abs(r.affinity) / 2}%;background:${affinityColor(r.affinity)}` }));
      const tip = h('div', { class: 'tip' }, `${r.label} · affinity ${Math.round(r.affinity)} · trust ${Math.round(r.trust)} · familiarity ${Math.round(r.familiarity)}${r.romance > 0 ? ` · romance ${Math.round(r.romance)}` : ''}`, r.notes.length ? h('div', { style: 'margin-top:4px' }, r.notes.slice(-3).map((n) => h('div', null, `· ${n}`))) : null, h('div', { class: 'pb-mute2' }, `last talked ${fmtAgo(r.lastTalked, ctx.world.time.minute)}`));
      const row = h('div', { class: 'rel', onclick: o ? () => open(o) : null, style: o ? 'cursor:pointer' : '' }, o ? img(core.portrait(o), 'pb-portrait sm', o.name) : h('span', { class: 'pb-ico', style: 'width:24px;height:24px' }, icon('star')), h('span', null, name), bar, h('span', { class: `pb-chip lb ${REL_LABEL_CLASS[r.label] ?? 'muted'}` }, r.label), tip);
      return row;
    }));
    const best = rels.filter((x) => x.o).sort((a, b) => b.r.affinity - a.r.affinity)[0];
    const worst = rels.filter((x) => x.o && x.r.affinity < -10).sort((a, b) => a.r.affinity - b.r.affinity)[0];
    setText(bestEl, best ? `Likes ${shortName(best.o!)} most${worst ? `; has no time for ${shortName(worst.o!)}` : ''}.` : '');
  }

  function refreshMemories(): void {
    if (!v) return;
    const q = search.value.trim().toLowerCase();
    let list: Memory[] = v.memory;
    if (filter !== 'all') list = list.filter((m) => m.kind === filter);
    if (q) list = list.filter((m) => m.text.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q)) || (m.about ?? []).some((a) => a.includes(q)));
    const recent = list.slice(-80).reverse();
    const key = `${filter}|${q}|${v.memory.length}|${recent.map((m) => m.id).join(',')}`;
    if (key === lastMemKey) return;
    lastMemKey = key;
    setText(memCount, `${list.length} of ${v.memory.length}`);
    const now = ctx.world.time.minute;
    replaceChildren(memEl, recent.length ? recent.map((m) => h('div', { class: `m ${m.importance >= 6 ? 'hi' : ''}`, title: m.tags.join(', ') },
      h('div', { class: 'meta' }, h('span', { class: `pb-chip kind-${m.kind}` }, KIND_SHORT[m.kind] ?? m.kind), dots(m.importance), h('span', null, fmtAgo(m.t, now)), m.secondhand ? h('span', null, `via ${m.source ? shortName(ctx.sim.villager(m.source) ?? { name: m.source }) : 'someone'}`) : null),
      h('div', null, m.text))) : [h('div', { class: 'pb-empty' }, v.memory.length ? 'Nothing matches.' : 'No memories yet.')]);
  }

  function refreshSkillsInv(): void {
    if (!v) return;
    const ik = `${v.inventory.map((s) => `${s.id}${s.qty}`).join(',')}|${SKILL_NAMES.map((s) => v!.skills[s]).join(',')}|${Math.round(v.money)}`;
    if (ik === lastInvKey) return;
    lastInvKey = ik;
    replaceChildren(skillsEl, SKILL_NAMES.map((s) => h('div', { class: 's' }, h('span', null, cap(s)), dots(Math.round(v!.skills[s] ?? 0)))));
    replaceChildren(invEl, v.inventory.length ? v.inventory.map((s) => h('span', { class: 'it', title: itemDef(s.id).description }, img(core.itemIcon(s.id, 32), 'pb-item sm'), `${itemDef(s.id).name}${s.qty > 1 ? ` ×${s.qty}` : ''}`)) : [h('span', { class: 'pb-empty' }, 'Nothing.')]);
    moneyEl.replaceChildren(icon('coin'), ` ${Math.round(v.money)}`);
  }

  function tick(dt: number): void {
    if (!v) return;
    if (fast.tick(dt)) { refresh(); refreshSkillsInv(); }
    if (relKey.tick(dt)) refreshRels();
    if (memKey.tick(dt)) refreshMemories();
  }

  return {
    id: 'inspector', el: win, modal: false, closable: true,
    show() { if (!v && ctx.sim.villagers[0]) open(ctx.sim.villagers[0]); else if (v) open(v); },
    hide() {}, tick, open, current: () => v,
  };
}
