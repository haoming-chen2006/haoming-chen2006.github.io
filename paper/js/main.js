import { $, $$, h, svgIcon, store, toast, debounce } from './util.js';
import { state, loadIndex, refreshAfterJob } from './data.js';
import { ui, actions, noteHref } from './ui.js';
import { search, warmSemantic, semantic } from './search.js';
import { gw, getUrl, getToken, setConfig, check, startPolling, consumePairFragment, connected } from './gateway.js';
import { renderSidebar, renderList, renderDashboard, renderTagPopover, visibleNotes, rememberSort } from './notebook.js';
import { renderNote, startEdit } from './reader.js';
import { renderDraft, focusDraft, updateConnection } from './draft.js';
import { mountJob } from './jobs.js';

const app = $('#app');
const reader = $('#reader');
const narrow = () => window.matchMedia('(max-width: 1099px)').matches;

// ---------------- routing ----------------
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [kind, ...rest] = raw.split('/');
  const arg = decodeURIComponent(rest.join('/'));
  return { kind: kind || 'home', arg };
}

function route() {
  if (consumePairFragment()) { onPaired(); return; }
  const { kind, arg } = parseHash();
  const prevView = ui.view;
  const prevNote = ui.noteId;
  ui.overview = false;
  if (kind === 'draft') {
    ui.view = 'draft';
  } else {
    ui.view = 'notebook';
    if (kind === 'note') {
      ui.noteId = arg;
      const n = state.byId.get(arg);
      if (n && ui.chapter && n.chapter !== ui.chapter && !ui.results) ui.chapter = null;
    } else {
      ui.noteId = null;
      if (kind === 'chapter') ui.chapter = state.chapterIndex.has(arg) ? arg : null;
      else if (kind === 'tag') { ui.chapter = null; ui.tags = new Set([arg]); }
      else if (kind === 'overview') ui.overview = true;
      else ui.chapter = null;
    }
  }
  if (prevNote !== ui.noteId) { ui.editing = false; }
  closeDrawer();
  render();
  if (ui.view === 'draft' && prevView !== 'draft') setTimeout(focusDraft, 30);
  if (ui.view === 'notebook' && ui.noteId && prevNote !== ui.noteId) reader.scrollTop = 0;
}

// ---------------- rendering ----------------
function render() {
  if (!state.index) return;
  app.dataset.view = ui.view;
  $('#view-notebook').hidden = ui.view !== 'notebook';
  $('#view-draft').hidden = ui.view !== 'draft';
  for (const t of $$('.tab')) t.classList.toggle('active', t.dataset.tab === (ui.overview ? 'overview' : ui.view));
  renderSidebar();
  if (ui.view === 'notebook') {
    app.dataset.reading = ui.noteId || ui.overview ? '1' : '';
    renderList();
    renderReader();
    const n = ui.noteId && state.byId.get(ui.noteId);
    document.title = n ? `${n.title} — Paper Notebook` : 'Paper Notebook';
  } else {
    app.dataset.reading = '';
    renderDraft($('#view-draft'));
    document.title = 'Draft — Paper Notebook';
  }
}

function renderReader() {
  if (ui.editing) return;
  if (ui.noteId) {
    const n = state.byId.get(ui.noteId);
    if (n) renderNote(reader, n);
    else {
      reader.replaceChildren(h('div.reader-bar', h('a.icon-btn.back', { href: '#/', 'aria-label': 'Back' }, svgIcon('back'))),
        h('div.empty-state.tall', h('div.empty-mark', svgIcon('raw')), h('p', 'That note isn’t here.'), h('p.muted', 'It may have been renamed, merged or deleted.'), h('a.btn.ghost', { href: '#/' }, 'Back to the notebook')));
    }
  } else {
    renderDashboard(reader);
    if (narrow() && ui.overview) reader.prepend(h('div.reader-bar', h('a.icon-btn.back', { href: '#/', 'aria-label': 'Back' }, svgIcon('back')), h('span.bar-crumb', 'Overview')));
  }
}

actions.render = render;
actions.renderList = renderList;
actions.renderReader = renderReader;
actions.navigate = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

// ---------------- data refresh after jobs ----------------
actions.refreshData = async (opts = {}) => {
  const ok = await refreshAfterJob(getUrl(), opts);
  if (ok) {
    if (ui.query) await runSearch(ui.query, { semanticOnly: false });
    if (ui.noteId && !state.byId.has(ui.noteId)) actions.navigate(ui.chapter ? `#/chapter/${ui.chapter}` : '#/');
    else render();
  }
  return ok;
};

// ---------------- search ----------------
let searchSeq = 0;
async function runSearch(q) {
  const seq = ++searchSeq;
  ui.query = q;
  if (!q.trim()) {
    ui.results = null;
    ui.searching = false;
    ui.match.clear();
    renderList();
    return;
  }
  ui.day = null;
  ui.searching = true;
  ui.results = await search(q, { semantic: false });
  if (seq !== searchSeq) return;
  renderList();
  const res = await search(q, { semantic: true });
  if (seq !== searchSeq) return;
  ui.results = res;
  ui.searching = false;
  ui.match = new Map(res.filter((r) => r.heading).map((r) => [r.id, r.heading]));
  renderList();
  $('#list').dataset.ranked = semantic.status === 'ready' ? 'semantic' : 'keyword';
  $('#list').dataset.query = q;
}
const searchInput = $('#search');
const debounced = debounce((v) => runSearch(v), 160);
searchInput.addEventListener('input', () => {
  if (ui.view !== 'notebook') actions.navigate('#/');
  debounced(searchInput.value);
});
searchInput.addEventListener('focus', () => warmSemantic(), { once: true });
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { searchInput.value = ''; runSearch(''); searchInput.blur(); }
  if (e.key === 'Enter' || e.key === 'ArrowDown') {
    const first = visibleNotes()[0];
    if (first && e.key === 'Enter') { e.preventDefault(); actions.navigate(noteHref(first.id)); searchInput.blur(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); searchInput.blur(); move(1); }
  }
});
semantic.listeners.add(() => { if (ui.results) renderList(); });

// ---------------- controls ----------------
$('#sort').value = ui.sort;
$('#sort').addEventListener('change', (e) => { rememberSort(e.target.value); renderList(); });

const tagBtn = $('#tag-btn');
const tagPop = $('#tag-pop');
tagBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = tagPop.hidden;
  tagPop.hidden = !open;
  tagBtn.setAttribute('aria-expanded', String(open));
  if (open) renderTagPopover();
});
document.addEventListener('click', (e) => {
  if (!tagPop.hidden && !e.composedPath().includes(tagPop) && e.target !== tagBtn) { tagPop.hidden = true; tagBtn.setAttribute('aria-expanded', 'false'); }
});

// drawer (narrow screens)
const sidebar = $('#sidebar');
const scrim = $('#scrim');
function openDrawer() { app.classList.add('drawer-open'); scrim.hidden = false; }
function closeDrawer() { app.classList.remove('drawer-open'); scrim.hidden = true; }
$('#menu-btn').addEventListener('click', () => (app.classList.contains('drawer-open') ? closeDrawer() : openDrawer()));
scrim.addEventListener('click', closeDrawer);
sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(); });

// theme
function effectiveTheme() {
  const t = document.documentElement.dataset.theme;
  if (t) return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function paintThemeIcon() {
  $('#theme-btn').replaceChildren(svgIcon(effectiveTheme() === 'dark' ? 'sun' : 'moon'));
  $('#theme-btn').title = effectiveTheme() === 'dark' ? 'Light theme (t)' : 'Dark theme (t)';
}
function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.setRaw('paper.theme', next);
  paintThemeIcon();
}
$('#theme-btn').addEventListener('click', toggleTheme);
paintThemeIcon();

// ---------------- dialogs ----------------
for (const d of $$('dialog')) {
  d.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); d.close(); }
    else if (e.target === d) d.close(); // backdrop
  });
}
$('#keys-btn').addEventListener('click', () => $('#keys-dialog').showModal());

actions.confirm = ({ title, text, ok = 'Delete' }) => new Promise((resolve) => {
  const d = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-ok').textContent = ok;
  const done = () => { d.removeEventListener('close', done); resolve(d.returnValue === 'ok'); };
  d.returnValue = '';
  $('#confirm-ok').value = 'ok';
  d.addEventListener('close', done);
  d.showModal();
  $('#confirm-ok').focus();
});

const settingsForm = $('#settings-form');
const settingsStatus = $('#settings-status');
function paintSettingsStatus() {
  const s = gw.status;
  const txt = {
    connected: ['ok', `Connected to ${getUrl()}${gw.health ? ` · ${gw.health.busy ? 'busy' : 'idle'}${gw.health.queued ? `, ${gw.health.queued} queued` : ''}` : ''}`],
    unpaired: ['warn', getToken() ? 'Gateway reachable, but it rejected this token.' : 'Gateway reachable — add the token to pair.'],
    offline: ['err', `No gateway at ${getUrl()}. Is paperd running?`],
    checking: ['', 'Checking…'],
  }[s];
  settingsStatus.className = `settings-status ${txt[0]}`;
  settingsStatus.textContent = txt[1];
}
actions.openSettings = () => {
  settingsForm.url.value = getUrl();
  settingsForm.token.value = getToken();
  paintSettingsStatus();
  $('#settings-dialog').showModal();
};
$('#settings-btn').addEventListener('click', actions.openSettings);
settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setConfig({ url: settingsForm.url.value.trim(), token: settingsForm.token.value.trim() });
  gw.status = 'checking';
  paintSettingsStatus();
  await check();
  paintSettingsStatus();
  if (gw.status === 'connected') setTimeout(() => $('#settings-dialog').close(), 700);
});
$('#settings-forget').addEventListener('click', async () => {
  setConfig({ token: '' });
  settingsForm.token.value = '';
  await check();
  paintSettingsStatus();
});

// ---------------- gateway pill ----------------
function paintPill() {
  const labels = { connected: 'Connected', offline: 'Offline', unpaired: 'Unpaired', checking: 'Checking' };
  const tips = {
    connected: 'Gateway connected — drafting and editing enabled',
    offline: 'Gateway offline — the notebook is read-only',
    unpaired: 'Gateway found but not paired — click to add the token',
    checking: 'Checking gateway…',
  };
  for (const p of $$('[data-gateway-pill]')) {
    p.dataset.status = gw.status;
    p.title = tips[gw.status];
    p.replaceChildren(...[h('span.pill-dot'), h('span.pill-label', labels[gw.status]), gw.health?.busy && gw.status === 'connected' ? h('span.pill-busy', 'working') : null].filter(Boolean));
    p.onclick = actions.openSettings;
  }
}
gw.listeners.add((s, meta) => {
  paintPill();
  if ($('#settings-dialog').open) paintSettingsStatus();
  if (meta?.quiet) return;
  updateConnection();
  if (ui.view === 'notebook' && !ui.editing) renderReader();
});

// ---------------- job dock (jobs started from the reader) ----------------
const dock = $('#job-dock');
actions.dockJob = (jobId, { kind, title, noteId }) => {
  const close = h('button.icon-btn.dock-close', { type: 'button', 'aria-label': 'Dismiss' }, svgIcon('x'));
  const wrap = h('div.dock-item');
  const job = mountJob(jobId, {
    kind,
    title,
    noteLink: (id) => h('a.note-link', { href: noteHref(id) }, state.byId.get(id)?.title ?? id),
    onDone: async (j) => {
      if (j.status === 'done') {
        const ok = await actions.refreshData();
        if (ok && kind === 'delete' && ui.noteId === noteId) actions.navigate(ui.chapter ? `#/chapter/${ui.chapter}` : '#/');
        if (ok) toast(kind === 'delete' ? 'Note deleted.' : 'Note updated.', { kind: 'ok' });
        setTimeout(() => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 300); }, 6000);
      }
    },
  });
  close.onclick = () => { job.close(); wrap.remove(); };
  wrap.append(close, job.el);
  dock.append(wrap);
};

// ---------------- keyboard ----------------
function move(delta) {
  const list = visibleNotes();
  if (!list.length) return;
  let i = list.findIndex((n) => n.id === ui.noteId);
  i = i < 0 ? (delta > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, i + delta));
  actions.navigate(noteHref(list[i].id));
}

let gPending = 0;
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  if ($$('dialog').some((d) => d.open)) return;
  if (typing) return;
  const k = e.key;
  if (gPending && Date.now() - gPending < 1200) {
    gPending = 0;
    if (k === 'n') { e.preventDefault(); actions.navigate('#/'); return; }
    if (k === 'd') { e.preventDefault(); actions.navigate('#/draft'); return; }
  }
  if (k === 'g') { gPending = Date.now(); return; }
  if (k === '/') { e.preventDefault(); if (ui.view !== 'notebook') actions.navigate(ui.noteId ? noteHref(ui.noteId) : '#/'); searchInput.focus(); searchInput.select(); return; }
  if (k === '?') { e.preventDefault(); $('#keys-dialog').showModal(); return; }
  if (k === 't') { e.preventDefault(); toggleTheme(); return; }
  if (k === 'n') { e.preventDefault(); actions.navigate('#/draft'); setTimeout(focusDraft, 40); return; }
  if (ui.view !== 'notebook') return;
  if (k === 'j') { e.preventDefault(); move(1); return; }
  if (k === 'k') { e.preventDefault(); move(-1); return; }
  if (k === 'e' && ui.noteId) {
    e.preventDefault();
    const n = state.byId.get(ui.noteId);
    if (!connected()) { toast('Connect the gateway to edit — the notebook is read-only right now.'); return; }
    if (n && !ui.editing) startEdit(reader, n);
    return;
  }
  if (k === 'r' && ui.noteId) { e.preventDefault(); ui.rawOpen = !ui.rawOpen; renderReader(); return; }
  if (k === 'Escape') {
    if (app.classList.contains('drawer-open')) closeDrawer();
    else if (ui.query) { searchInput.value = ''; runSearch(''); }
    else if (ui.noteId || ui.overview) actions.navigate(ui.chapter ? `#/chapter/${ui.chapter}` : '#/');
  }
});

function onPaired() {
  check().then((s) => toast(s === 'connected' ? 'Paired with your gateway.' : 'Token saved — the gateway isn’t reachable yet.', { kind: s === 'connected' ? 'ok' : 'info' }));
}

// ---------------- boot ----------------
async function boot() {
  const paired = consumePairFragment();
  paintPill();
  try {
    await loadIndex();
  } catch (e) {
    $('#list').replaceChildren(h('div.empty-state', h('p', 'Couldn’t load the notebook.'), h('p.muted', String(e.message))));
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  startPolling();
  if (paired) onPaired();
  window.addEventListener('resize', debounce(() => { if (ui.view === 'notebook' && !ui.noteId && !ui.editing) renderReader(); }, 200));
  document.body.dataset.ready = '1';
}
boot();
