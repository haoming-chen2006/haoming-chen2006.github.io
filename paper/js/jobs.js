// Live job progress: status chips, tool lines, streamed agent text, final result.
import { h, svgIcon, relTime } from './util.js';
import { followJob } from './gateway.js';
import { renderInline } from './markdown.js';

const PHASES = [
  ['queued', 'Queued'],
  ['running', 'Agent'],
  ['building', 'Build'],
  ['deploying', 'Deploy'],
  ['done', 'Done'],
];
const KIND_LABEL = { create: 'New note', edit: 'Edit', reprocess: 'Reprocess', delete: 'Delete', chat: 'Chat' };
export const kindLabel = (k) => KIND_LABEL[k] ?? k;

function phaseOf(text) {
  const t = String(text).toLowerCase();
  if (/error|fail/.test(t)) return 'error';
  if (/^done|finished|complete/.test(t)) return 'done';
  if (/deploy|push|publish/.test(t)) return 'deploying';
  if (/build|validat/.test(t)) return 'building';
  if (/queue|wait/.test(t)) return 'queued';
  if (/run|agent|start|writ|edit|delet/.test(t)) return 'running';
  return null;
}

/**
 * Creates a job progress element and starts following the job.
 * opts: {title, kind, onDone(job), noteLink(id) -> element}
 */
export function mountJob(jobId, { kind = 'create', title, onDone, noteLink } = {}) {
  const chips = PHASES.map(([id, label]) => h('li.phase', { dataset: { phase: id } }, h('span.phase-dot'), label));
  const log = h('ol.job-log');
  const result = h('div.job-result');
  const el = h('div.job', { dataset: { job: jobId, status: 'queued' } },
    h('div.job-head',
      h('span.job-kind', kindLabel(kind)),
      title ? h('span.job-title', title) : null,
      h('span.job-spinner', { 'aria-hidden': 'true' })),
    h('ol.phases', chips),
    log,
    result);

  let phase = 'queued';
  let textEl = null;
  let textBuf = '';
  const setPhase = (p) => {
    if (!p || p === phase) return;
    const order = PHASES.map((x) => x[0]);
    if (p !== 'error' && order.indexOf(p) < order.indexOf(phase)) return;
    phase = p;
    el.dataset.status = p;
    const idx = order.indexOf(p);
    chips.forEach((c, i) => {
      c.classList.toggle('past', p === 'error' ? false : i < idx);
      c.classList.toggle('current', i === idx);
    });
  };
  setPhase('queued');
  chips[0].classList.add('current');

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const progress = (evt) => {
    if (evt.type === 'text') {
      if (!textEl) { textEl = h('li.log-text'); textBuf = ''; log.append(textEl); }
      textBuf += evt.text;
      textEl.textContent = textBuf;
    } else {
      textEl = null;
      if (evt.type === 'status') {
        setPhase(phaseOf(evt.text));
        log.append(h('li.log-status', svgIcon('dot'), evt.text));
      } else if (evt.type === 'tool') {
        log.append(h('li.log-tool', svgIcon('tool'), h('span', evt.text)));
      } else {
        log.append(h('li.log-line', evt.text));
      }
    }
    scroll();
  };
  const update = (job) => { setPhase(job.status); };
  const done = (job) => {
    setPhase(job.status === 'error' ? 'error' : 'done');
    el.classList.add('finished');
    result.replaceChildren();
    if (job.status === 'error') {
      result.append(h('div.job-error', svgIcon('x'), h('div', h('strong', 'Job failed'), h('p', job.error || 'Unknown error'))));
    } else {
      const parts = [svgIcon('check')];
      const body = h('div');
      if (job.note_id && kind !== 'delete' && kind !== 'chat') body.append(h('strong', kind === 'create' ? 'Note ready' : 'Note updated'), ' ', noteLink ? noteLink(job.note_id) : job.note_id);
      else if (kind === 'delete') body.append(h('strong', 'Deleted'));
      else body.append(h('strong', 'Done'));
      if (job.commit) body.append(h('span.job-commit', ` · deployed ${String(job.commit).slice(0, 7)}`));
      if (job.reply && kind !== 'chat') body.append(h('div.job-reply', renderInline(job.reply)));
      result.append(h('div.job-ok', parts, body));
    }
    onDone?.(job);
  };
  const handle = followJob(jobId, { progress, job: update, done });
  return { el, close: () => handle.close() };
}

export function jobRow(job, { onOpen, noteLink }) {
  const st = job.status;
  return h('li.job-row', { dataset: { status: st } },
    h('button.job-row-btn', { type: 'button', onclick: () => onOpen(job) },
      h('span.status-dot', { title: st }),
      h('span.job-row-main',
        h('span.job-row-kind', kindLabel(job.kind)),
        job.note_id ? h('span.job-row-note', job.note_id) : null),
      h('span.job-row-time', relTime(job.created))),
    job.note_id && st === 'done' && job.kind !== 'delete' && noteLink ? noteLink(job.note_id, true) : null);
}
