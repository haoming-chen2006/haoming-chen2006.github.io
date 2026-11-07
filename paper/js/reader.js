// Note reader: header, rendered body, raw notes, edit / reprocess / delete.
import { $, h, svgIcon, fmtLongDay, fmtDay, relTime, readingMinutes, debounce, toast } from './util.js';
import { state } from './data.js';
import { ui, actions, noteHref } from './ui.js';
import { renderMarkdown } from './markdown.js';
import { connected, api } from './gateway.js';
import { chapterStyle, sourceBadges, visibleNotes } from './notebook.js';

const chapterTitle = (id) => state.index.chapters.find((c) => c.id === id)?.title ?? id;

export function fullFile(n) {
  return `---\n${n.frontmatter ?? ''}\n---\n\n${n.markdown}`;
}

function neighbors(id) {
  const list = visibleNotes();
  const i = list.findIndex((n) => n.id === id);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}

function actionBtn(icon, label, onclick, { title, disabled, cls = '' } = {}) {
  return h(`button.btn.ghost.sm${cls}`, { type: 'button', onclick, title: title ?? label, disabled: disabled || null }, svgIcon(icon), h('span.btn-label', label));
}

export function renderNote(pane, n) {
  const live = connected();
  const offlineTip = 'Connect the gateway (paperd) to change notes';
  const { prev, next } = neighbors(n.id);
  const byline = [
    n.authors?.length ? (n.authors.length > 4 ? `${n.authors.slice(0, 3).join(', ')}, et al.` : n.authors.join(', ')) : null,
    (n.venue && n.year && String(n.venue).includes(String(n.year)) ? [n.venue] : [n.venue, n.year]).filter(Boolean).join(' '),
  ].filter(Boolean).join(' · ');

  const paperLink = n.url ? h('a.btn.paper.sm', { href: n.url, target: '_blank', rel: 'noopener noreferrer' }, svgIcon('external'), h('span', n.arxiv ? `arXiv ${n.arxiv}` : 'Open paper')) : null;

  const rawPanel = h('div.raw-panel', { hidden: !ui.rawOpen });
  const body = h('div.prose.note-body');
  body.append(renderMarkdown(n.markdown, { assetBase: state.assetBase }));

  const head = h('header.note-head', { style: chapterStyle(n.chapter) },
    h('a.eyebrow.ch-link', { href: `#/chapter/${n.chapter}` }, h('span.ch-dot'), chapterTitle(n.chapter)),
    h('h1.note-title', n.title),
    byline ? h('p.byline', byline) : null,
    h('p.tldr', n.tldr),
    h('div.meta-row',
      h('span', { title: 'Date read' }, `Read ${fmtLongDay(n.read)}`),
      h('span.sep', '·'),
      h('span', { title: `Updated ${n.updated}` }, `updated ${relTime(n.updated)}`),
      h('span.sep', '·'),
      h('span', `${readingMinutes(n.words)} min read`),
      sourceBadges(n.sources)),
    n.tags?.length ? h('div.tag-row', n.tags.map((t) => h('button.tag', { type: 'button', title: `Filter by #${t}`, onclick: () => { ui.tags.add(t); ui.results = null; actions.navigate(ui.chapter ? `#/chapter/${ui.chapter}` : '#/'); actions.render(); } }, `#${t}`))) : null,
    h('div.note-actions',
      paperLink,
      actionBtn('raw', ui.rawOpen ? 'Hide raw' : 'Raw notes', () => toggleRaw(n, rawPanel), { title: 'Raw notes as typed (r)', cls: ui.rawOpen ? '.on' : '' }),
      h('span.spacer'),
      actionBtn('edit', 'Edit', () => startEdit(pane, n), { title: live ? 'Edit markdown (e)' : offlineTip, disabled: !live }),
      actionBtn('refresh', 'Reprocess', () => openReprocess(n), { title: live ? 'Add raw notes and let the agent rewrite' : offlineTip, disabled: !live }),
      actionBtn('trash', 'Delete', () => confirmDelete(n), { title: live ? 'Delete note' : offlineTip, disabled: !live, cls: '.danger-ghost' })));

  const nav = h('nav.note-nav',
    prev ? h('a.nn.prev', { href: noteHref(prev.id) }, h('span.nn-dir', svgIcon('back'), 'Previous'), h('span.nn-title', prev.title)) : h('span'),
    next ? h('a.nn.next', { href: noteHref(next.id) }, h('span.nn-dir', 'Next', h('span.flip', svgIcon('back'))), h('span.nn-title', next.title)) : h('span'));

  const bar = h('div.reader-bar',
    h('a.icon-btn.back', { href: ui.chapter ? `#/chapter/${ui.chapter}` : '#/', 'aria-label': 'Back to list' }, svgIcon('back')),
    h('span.bar-crumb', chapterTitle(n.chapter)),
    h('span.spacer'),
    !live ? h('span.readonly', { title: offlineTip }, 'read-only') : null,
    h('a.icon-btn', { href: prev ? noteHref(prev.id) : null, 'aria-label': 'Previous note (k)', class: `icon-btn${prev ? '' : ' disabled'}` }, svgIcon('up')),
    h('a.icon-btn', { href: next ? noteHref(next.id) : null, 'aria-label': 'Next note (j)', class: `icon-btn${next ? '' : ' disabled'}` }, svgIcon('down')));

  pane.replaceChildren(bar, h('div.reader-inner', head, rawPanel, body, nav));
  if (ui.rawOpen) loadRaw(n, rawPanel);

  const heading = ui.match.get(n.id);
  if (heading) {
    const sec = [...body.querySelectorAll('section[data-heading]')].find((s) => s.dataset.heading === heading);
    if (sec) {
      sec.classList.add('matched');
      requestAnimationFrame(() => sec.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    }
  }
}

function toggleRaw(n, panel) {
  ui.rawOpen = !ui.rawOpen;
  actions.renderReader();
}

async function loadRaw(n, panel) {
  if (!connected()) {
    panel.replaceChildren(h('div.raw-empty', svgIcon('link'), h('p', 'Raw notes live on your Mac. Connect the gateway to read what you originally typed.'), h('button.btn.ghost.sm', { type: 'button', onclick: () => actions.openSettings() }, 'Gateway settings')));
    return;
  }
  panel.replaceChildren(h('div.raw-loading', 'Loading raw notes…'));
  try {
    const { raw } = await api('GET', `/api/notes/${encodeURIComponent(n.id)}/raw`);
    if (!raw.trim()) { panel.replaceChildren(h('div.raw-empty', h('p', 'No raw notes stored for this one (imported without raw text).'))); return; }
    const entries = raw.split(/(?=<!-- entry )/).map((chunk) => {
      const m = /^<!-- entry (\S+) source=(\w+) -->\s*\n?([\s\S]*)$/.exec(chunk.trim());
      return m ? { when: m[1], source: m[2], text: m[3].trim() } : { when: null, source: null, text: chunk.trim() };
    }).filter((e) => e.text);
    panel.replaceChildren(h('div.raw-head', h('span', 'Raw notes'), h('span.muted', `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} · append-only`)),
      ...entries.map((e) => h('div.raw-entry',
        h('div.raw-meta', e.when ? `${fmtDay(e.when.slice(0, 10), { year: true })} · ${e.when.slice(11, 16)} UTC` : 'entry', e.source ? h('span.src', e.source) : null),
        h('pre.raw-text', e.text))));
  } catch (e) {
    panel.replaceChildren(h('div.raw-empty', h('p', `Couldn't load raw notes: ${e.message}`)));
  }
}

// ---------- edit ----------
export function startEdit(pane, n) {
  if (!connected()) { toast('Connect the gateway to edit notes.'); return; }
  ui.editing = true;
  const ta = h('textarea.editor-input', { spellcheck: 'true', 'aria-label': 'Note markdown' });
  ta.value = fullFile(n);
  const preview = h('div.prose.editor-preview');
  const err = h('div.editor-error', { hidden: true });
  const save = h('button.btn.primary', { type: 'button' }, 'Save');
  const update = () => {
    const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/.exec(ta.value);
    preview.replaceChildren(renderMarkdown(m ? m[1] : ta.value, { assetBase: state.assetBase }));
  };
  const doSave = async () => {
    save.disabled = true;
    err.hidden = true;
    try {
      const { job_id } = await api('PUT', `/api/notes/${encodeURIComponent(n.id)}`, { markdown: ta.value });
      ui.editing = false;
      actions.dockJob(job_id, { kind: 'edit', title: n.title, noteId: n.id });
      actions.renderReader();
    } catch (e) {
      err.hidden = false;
      err.textContent = e.status === 400 ? `Not saved — ${e.message}` : e.message;
      save.disabled = false;
    }
  };
  save.onclick = doSave;
  const cancel = () => { ui.editing = false; actions.renderReader(); };
  ta.addEventListener('input', debounce(update, 180));
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doSave(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); }
  });
  pane.replaceChildren(h('div.editor',
    h('div.editor-bar',
      h('div', h('strong', 'Editing'), h('span.muted', ` ${n.id}.md`)),
      h('span.spacer'),
      h('span.hint', h('kbd', '⌘'), h('kbd', 'Enter'), ' to save'),
      h('button.btn.ghost', { type: 'button', onclick: cancel }, 'Cancel'),
      save),
    err,
    h('div.editor-split', h('div.editor-pane', ta), h('div.editor-pane.preview-pane', preview))));
  update();
  ta.focus();
  ta.setSelectionRange(0, 0);
  ta.scrollTop = 0;
}

// ---------- reprocess / delete ----------
function openReprocess(n) {
  const dlg = $('#reprocess-dialog');
  const form = $('#reprocess-form');
  form.reset();
  $('#reprocess-title').textContent = `Reprocess “${n.title.length > 60 ? `${n.title.slice(0, 57)}…` : n.title}”`;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const raw = form.raw.value.trim();
    const instruction = form.instruction.value.trim();
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const { job_id } = await api('POST', `/api/notes/${encodeURIComponent(n.id)}/reprocess`, { ...(raw ? { raw } : {}), ...(instruction ? { instruction } : {}) });
      dlg.close();
      actions.dockJob(job_id, { kind: 'reprocess', title: n.title, noteId: n.id });
    } catch (err) {
      toast(err.message, { kind: 'error' });
    } finally {
      btn.disabled = false;
    }
  };
  dlg.showModal();
  form.raw.focus();
}

async function confirmDelete(n) {
  const ok = await actions.confirm({ title: 'Delete this note?', text: `“${n.title}” — its note, raw notes and figures will be removed from the notebook. Git history keeps a copy.`, ok: 'Delete note' });
  if (!ok) return;
  try {
    const { job_id } = await api('DELETE', `/api/notes/${encodeURIComponent(n.id)}`);
    actions.dockJob(job_id, { kind: 'delete', title: n.title, noteId: n.id });
  } catch (e) {
    toast(e.message, { kind: 'error' });
  }
}
