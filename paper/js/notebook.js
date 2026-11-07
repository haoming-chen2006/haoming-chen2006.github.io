// Sidebar chapters, note list (sort / tags / search results), and the overview dashboard.
import { $, h, svgIcon, esc, fmtDay, fmtLongDay, monthLabel, parseDay, dayKey, todayKey, chapterHue, MONTH_SHORT, store } from './util.js';
import { state } from './data.js';
import { ui, actions, noteHref } from './ui.js';
import { makeSnippet, semantic } from './search.js';

const SOURCE_LABEL = { drive: 'Drive', zotero: 'Zotero', onenote: 'OneNote', draft: 'Draft', manual: 'Manual' };

export function chapterStyle(chId) {
  const i = state.chapterIndex.get(chId) ?? 0;
  return `--hue:${chapterHue(i)}`;
}
const chapterTitle = (id) => state.index.chapters.find((c) => c.id === id)?.title ?? id;

export function sourceBadges(sources) {
  return h('span.sources', (sources ?? []).map((s) => h(`span.src.src-${s}`, { title: `From ${SOURCE_LABEL[s] ?? s}` }, SOURCE_LABEL[s] ?? s)));
}

// ---------- filtering ----------
function passesFilters(n) {
  if (ui.chapter && n.chapter !== ui.chapter) return false;
  if (ui.day && n.read !== ui.day) return false;
  for (const t of ui.tags) if (!(n.tags ?? []).includes(t)) return false;
  return true;
}

export function visibleNotes() {
  if (!state.index) return [];
  if (ui.results) return ui.results.map((r) => state.byId.get(r.id)).filter((n) => n && passesFilters(n));
  const notes = state.index.notes.filter(passesFilters);
  const by = ui.sort;
  return notes.sort((a, b) => {
    if (by === 'title') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    if (by === 'updated') return String(b.updated).localeCompare(String(a.updated)) || b.read.localeCompare(a.read);
    return b.read.localeCompare(a.read) || String(b.updated).localeCompare(String(a.updated));
  });
}

// ---------- sidebar ----------
export function renderSidebar() {
  const ul = $('#chapters');
  const counts = new Map();
  for (const n of state.index.notes) counts.set(n.chapter, (counts.get(n.chapter) ?? 0) + 1);
  const item = (id, title, count, extra = {}) => h('li', h('a.chapter', {
    href: id ? `#/chapter/${id}` : '#/',
    class: `chapter${(ui.chapter ?? null) === id && ui.view === 'notebook' ? ' active' : ''}${count ? '' : ' empty'}`,
    style: id ? chapterStyle(id) : null,
    title: extra.desc ?? '',
    dataset: { chapter: id ?? '' },
  }, id ? h('span.ch-dot') : svgIcon('dot'), h('span.ch-title', title), h('span.ch-count', String(count))));
  ul.replaceChildren(
    item(null, 'All notes', state.index.notes.length),
    ...state.index.chapters.map((c) => item(c.id, c.title, counts.get(c.id) ?? 0, { desc: c.description })),
  );
  ul.firstChild.querySelector('a').classList.add('all');
}

// ---------- list ----------
function highlight(text, terms) {
  if (!terms?.length || !text) return esc(text);
  const re = new RegExp(`(${terms.filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return esc(text).replace(re, '<mark>$1</mark>');
}

function card(n, r) {
  const active = n.id === ui.noteId;
  const tags = (n.tags ?? []).slice(0, 3);
  let match = null;
  if (r) {
    const via = r.via === 'semantic' ? 'meaning' : r.via === 'both' ? 'meaning + words' : 'words';
    match = h('div.match',
      h('div.match-head', h('span.match-sec', r.heading ? `§ ${r.heading}` : 'Title & summary'), h('span.match-via', via)),
      r.heading ? h('p.match-snip', { html: highlight(makeSnippet(r.snippet, r.terms), r.terms) }) : null);
  }
  return h('a.card', {
    href: noteHref(n.id),
    role: 'listitem',
    class: `card${active ? ' active' : ''}`,
    dataset: { id: n.id },
    style: chapterStyle(n.chapter),
    'aria-current': active ? 'true' : null,
  },
  h('div.card-top', h('span.ch-dot'), h('span.card-ch', chapterTitle(n.chapter)), h('span.card-date', { title: `Read ${fmtLongDay(n.read)}` }, fmtDay(n.read))),
  h('h3.card-title', { html: r ? highlight(n.title, r.terms) : esc(n.title) }),
  h('p.card-tldr', n.tldr),
  match,
  h('div.card-foot',
    h('span.card-tags', tags.map((t) => h('span.tag', `#${t}`))),
    sourceBadges(n.sources)));
}

export function renderList() {
  const list = $('#list');
  const notes = visibleNotes();
  const title = $('#list-title');
  const parts = [];
  if (ui.results) {
    const semTxt = semantic.status === 'loading' ? 'loading meaning search…' : semantic.status === 'error' ? 'keyword only (model failed to load)' : ui.searching ? 'ranking…' : 'by relevance';
    parts.push(h('strong', `${notes.length} result${notes.length === 1 ? '' : 's'}`), h('span.muted', ` · ${semTxt}`));
  } else {
    parts.push(h('strong', ui.chapter ? chapterTitle(ui.chapter) : 'All notes'), h('span.muted', ` · ${notes.length}`));
  }
  title.replaceChildren(...parts);
  $('#sort').disabled = !!ui.results;
  $('#sort').title = ui.results ? 'Search results are ranked by relevance' : '';

  renderFilters();

  if (!notes.length) {
    list.replaceChildren(h('div.empty-state',
      h('div.empty-mark', svgIcon(ui.results ? 'sparkle' : 'raw')),
      h('p', ui.results ? 'Nothing matches that yet.' : 'No notes here yet.'),
      h('p.muted', ui.results ? 'Try describing the idea instead of the exact words.' : 'Write one in Draft — the agent will file it.')));
    return;
  }

  const frag = document.createDocumentFragment();
  const byRes = ui.results ? new Map(ui.results.map((r) => [r.id, r])) : null;
  let lastGroup = null;
  let box = frag;
  notes.forEach((n) => {
    if (!byRes && ui.sort !== 'title') {
      const g = monthLabel(ui.sort === 'updated' ? String(n.updated).slice(0, 10) : n.read);
      if (g !== lastGroup) {
        box = h('section.group-box', h('div.group', g));
        frag.append(box);
        lastGroup = g;
      }
    }
    box.append(card(n, byRes?.get(n.id)));
  });
  list.replaceChildren(frag);
  const act = list.querySelector('.card.active');
  if (act) act.scrollIntoView({ block: 'nearest' });
}

function renderFilters() {
  const box = $('#filters');
  const chips = [];
  if (ui.day) chips.push(h('button.filter', { type: 'button', onclick: () => { ui.day = null; actions.render(); } }, `Read ${fmtDay(ui.day, { year: true })}`, svgIcon('x')));
  for (const t of ui.tags) chips.push(h('button.filter', { type: 'button', onclick: () => { ui.tags.delete(t); actions.render(); } }, `#${t}`, svgIcon('x')));
  if (ui.chapter && ui.results) chips.push(h('button.filter', { type: 'button', onclick: () => actions.navigate('#/') }, `In ${chapterTitle(ui.chapter)}`, svgIcon('x')));
  box.hidden = !chips.length;
  box.replaceChildren(...chips);
  $('#tag-btn').classList.toggle('on', ui.tags.size > 0);
}

export function renderTagPopover() {
  const pop = $('#tag-pop');
  const counts = new Map();
  for (const n of state.index.notes) for (const t of n.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  const tags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  pop.replaceChildren(
    h('div.pop-head', h('span', 'Filter by tag'), ui.tags.size ? h('button.link-btn', { type: 'button', onclick: () => { ui.tags.clear(); actions.render(); renderTagPopover(); } }, 'Clear') : null),
    h('div.pop-tags', tags.map(([t, c]) => h('button.tag-opt', {
      type: 'button',
      class: `tag-opt${ui.tags.has(t) ? ' on' : ''}`,
      'aria-pressed': ui.tags.has(t) ? 'true' : 'false',
      onclick: () => { if (ui.tags.has(t)) ui.tags.delete(t); else ui.tags.add(t); actions.render(); renderTagPopover(); },
    }, `#${t}`, h('span.tag-n', String(c))))));
}

// ---------- dashboard ----------
function stats() {
  const notes = state.index.notes;
  const byDay = new Map();
  for (const n of notes) byDay.set(n.read, [...(byDay.get(n.read) ?? []), n]);
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const thisWeek = notes.filter((n) => parseDay(n.read) >= monday).length;
  // current streak: consecutive days with a note ending today (or yesterday if nothing yet today)
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!byDay.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (byDay.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  const days = [...byDay.keys()].sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const cur = parseDay(k);
    run = prev && (cur - prev) / 86400000 === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  const chapters = new Set(notes.map((n) => n.chapter)).size;
  const words = notes.reduce((s, n) => s + (n.words ?? 0), 0);
  return { byDay, thisWeek, streak, best, chapters, words, total: notes.length };
}

function heatmap(byDay, weeks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - ((today.getDay() + 6) % 7))); // Sunday of this week
  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1); // Monday
  const grid = h('div.hm-grid', { style: `--weeks:${weeks}`, role: 'grid', 'aria-label': 'Notes per day' });
  const months = h('div.hm-months', { style: `--weeks:${weeks}` });
  const label = h('div.hm-label', { 'aria-live': 'polite' }, ' ');
  let lastMonth = -1;
  let lastLabelCol = -9;
  const d = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col = h('div.hm-col', { role: 'row' });
    for (let i = 0; i < 7; i++) {
      const k = dayKey(d);
      const items = byDay.get(k) ?? [];
      const future = d > today;
      const lvl = items.length >= 4 ? 4 : items.length;
      const tip = `${fmtDay(k, { year: true })} — ${items.length ? `${items.length} note${items.length > 1 ? 's' : ''}: ${items.map((n) => n.title).join('; ')}` : 'nothing read'}`;
      const cell = h('button.hm-cell', {
        type: 'button',
        role: 'gridcell',
        class: `hm-cell l${lvl}${future ? ' future' : ''}${k === todayKey() ? ' today' : ''}${ui.day === k ? ' sel' : ''}`,
        title: tip,
        'aria-label': tip,
        disabled: future || !items.length ? true : null,
        dataset: { day: k, n: String(items.length) },
        onmouseenter: () => { label.textContent = tip; },
        onfocus: () => { label.textContent = tip; },
        onclick: () => { ui.day = ui.day === k ? null : k; ui.results = null; actions.navigate(ui.chapter ? `#/chapter/${ui.chapter}` : '#/'); actions.render(); },
      });
      col.append(cell);
      if (i === 0 && d.getMonth() !== lastMonth) {
        if (w < weeks - 1 && w - lastLabelCol >= 3) { months.append(h('span', { style: `grid-column:${w + 1}` }, MONTH_SHORT[d.getMonth()])); lastLabelCol = w; }
        lastMonth = d.getMonth();
      }
      d.setDate(d.getDate() + 1);
    }
    grid.append(col);
  }
  grid.addEventListener('mouseleave', () => { label.textContent = ' '; });
  const legend = h('div.hm-legend', h('span', 'Less'), [0, 1, 2, 3, 4].map((l) => h(`span.hm-cell.l${l}.static`)), h('span', 'More'));
  return h('div.heatmap', h('div.hm-scroll', months, h('div.hm-body', h('div.hm-days', h('span', 'Mon'), h('span'), h('span', 'Wed'), h('span'), h('span', 'Fri'), h('span'), h('span')), grid)), h('div.hm-foot', label, legend));
}

function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Late night reading' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

export function renderDashboard(pane) {
  const s = stats();
  const tile = (n, label, sub) => h('div.stat', h('div.stat-n', String(n)), h('div.stat-l', label), sub ? h('div.stat-s', sub) : null);
  const width = Math.min(pane.clientWidth || 800, 960);
  const pad = window.matchMedia('(max-width: 860px)').matches ? 36 + 38 : window.matchMedia('(max-width: 1279px)').matches ? 64 + 38 : 96 + 38;
  const weeks = Math.max(12, Math.min(53, Math.floor((width - pad - 34) / 15)));
  const recent = state.index.notes.slice(0, 5);
  const counts = new Map();
  for (const n of state.index.notes) counts.set(n.chapter, (counts.get(n.chapter) ?? 0) + 1);
  const maxC = Math.max(1, ...counts.values());
  const lastRead = state.index.notes[0]?.read;
  const now = new Date();

  requestAnimationFrame(() => { const sc = pane.querySelector('.hm-scroll'); if (sc) sc.scrollLeft = sc.scrollWidth; });
  pane.replaceChildren(h('div.dash',
    h('header.dash-head',
      h('p.eyebrow', fmtLongDay(dayKey(now))),
      h('h1.dash-title', `${greeting()}, Haoming.`),
      h('p.dash-sub', s.thisWeek
        ? `You've read ${s.thisWeek} paper${s.thisWeek > 1 ? 's' : ''} this week.${s.streak > 1 ? ` ${s.streak}-day streak — keep it going.` : ''}`
        : lastRead ? `Last note was ${fmtDay(lastRead, { year: true })}. What are you reading today?` : 'Start your notebook with a first draft.'),
      h('div.dash-cta', h('a.btn.primary', { href: '#/draft' }, svgIcon('edit'), 'New note'), h('span.hint', 'or press ', h('kbd', 'n')))),
    h('div.stats',
      tile(s.total, 'papers', `${s.words.toLocaleString()} words of notes`),
      tile(s.chapters, 'chapters', `of ${state.index.chapters.length}`),
      tile(s.thisWeek, 'this week', 'since Monday'),
      tile(s.streak, 'day streak', `best ${s.best}`)),
    h('section.dash-card',
      h('div.card-head', h('h2', 'Reading streak'), h('span.muted', `last ${weeks} weeks`)),
      heatmap(s.byDay, weeks)),
    h('div.dash-cols',
      h('section.dash-card',
        h('div.card-head', h('h2', 'Recently read')),
        h('ol.recent', recent.map((n) => h('li', h('a', { href: noteHref(n.id), style: chapterStyle(n.chapter) },
          h('span.ch-dot'), h('span.recent-title', n.title), h('span.recent-date', fmtDay(n.read))))))),
      h('section.dash-card',
        h('div.card-head', h('h2', 'Chapters')),
        h('ul.bars', state.index.chapters.filter((c) => counts.get(c.id)).map((c) => h('li', h('a', { href: `#/chapter/${c.id}`, style: chapterStyle(c.id) },
          h('span.bar-label', c.title),
          h('span.bar-track', h('span.bar-fill', { style: `width:${(100 * counts.get(c.id)) / maxC}%` })),
          h('span.bar-n', String(counts.get(c.id)))))))))));
}

export function rememberSort(v) { ui.sort = v; store.set('paper.sort', v); }
