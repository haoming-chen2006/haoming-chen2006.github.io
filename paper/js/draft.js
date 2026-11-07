// Draft tab: writing area (autosaved), submit to the agent with live progress, recent jobs, chat.
import { h, svgIcon, store, debounce, toast } from './util.js';
import { state } from './data.js';
import { actions, noteHref } from './ui.js';
import { gw, connected, api, followJob } from './gateway.js';
import { mountJob, jobRow, kindLabel } from './jobs.js';
import { renderInline } from './markdown.js';

const DRAFT_KEY = 'paper.draft';
const ACTIVE_KEY = 'paper.draft.activeJob';
const CHAT_KEY = 'paper.chat';

let root = null;
let els = {};
let liveJob = null;
let chatBusy = false;

const noteLink = (id, small = false) => {
  const n = state.byId.get(id);
  return h(small ? 'a.job-row-open' : 'a.note-link', { href: noteHref(id) }, small ? 'Open' : (n?.title ?? id), small ? null : svgIcon('external'));
};

const words = (s) => (s.trim().match(/\S+/g) ?? []).length;

export function renderDraft(section) {
  if (root) { updateConnection(); return; }
  root = section;
  const saved = store.get(DRAFT_KEY, {}) ?? {};

  els.url = h('input.draft-url', { type: 'url', placeholder: 'Paper link — arXiv, OpenReview, a blog post (optional)', spellcheck: 'false', value: saved.url ?? '', 'aria-label': 'Paper URL' });
  els.raw = h('textarea.draft-raw', { placeholder: 'What did you read? What stuck with you, what confused you, what would you try next?\n\nRough is fine — fragments, typos, dictation. The agent keeps your words in “My notes” and writes the rest.', 'aria-label': 'Raw notes' });
  els.raw.value = saved.raw ?? '';
  els.instr = h('input.draft-instr', { type: 'text', placeholder: 'Instruction for the agent (optional) — e.g. “file under Robotics”, “focus on the training recipe”', value: saved.instruction ?? '', 'aria-label': 'Instruction' });
  els.saved = h('span.autosave', '');
  els.submit = h('button.btn.primary.lg', { type: 'button', onclick: submit }, svgIcon('sparkle'), 'Write the note');
  els.banner = h('div.gw-banner', { hidden: true });
  els.live = h('div.draft-live');
  els.jobs = h('ul.jobs-list');
  els.chatLog = h('div.chat-log', { 'aria-live': 'polite' });
  els.chatIn = h('textarea.chat-input', { rows: 2, placeholder: 'Ask about your notes, or ask for a reorganization…', 'aria-label': 'Chat message' });
  els.chatSend = h('button.icon-btn.send', { type: 'button', 'aria-label': 'Send', onclick: sendChat }, svgIcon('send'));

  const persist = debounce(() => {
    store.set(DRAFT_KEY, { raw: els.raw.value, url: els.url.value, instruction: els.instr.value, at: new Date().toISOString() });
    els.saved.textContent = `Saved locally · ${words(els.raw.value)} words`;
  }, 300);
  for (const el of [els.raw, els.url, els.instr]) el.addEventListener('input', () => { els.saved.textContent = 'Saving…'; persist(); updateSubmit(); });
  els.raw.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } });
  els.chatIn.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendChat(); } });
  if (saved.raw) els.saved.textContent = `Saved locally · ${words(saved.raw)} words`;

  const seg = (id, label) => h('button.seg-btn', { type: 'button', dataset: { seg: id }, onclick: () => setSeg(id) }, label);
  els.segs = h('div.seg', { role: 'tablist' }, seg('activity', 'Activity'), seg('chat', 'Ask the notebook'));
  els.activity = h('div.side-panel.activity',
    h('div.panel-head', h('h2', 'Recent jobs'), h('button.link-btn', { type: 'button', onclick: loadJobs }, 'Refresh')),
    els.jobs);
  els.chat = h('div.side-panel.chat',
    h('div.panel-head', h('h2', 'Ask the notebook'), h('button.link-btn', { type: 'button', onclick: newChat }, 'New chat')),
    els.chatLog,
    h('div.chat-compose', els.chatIn, els.chatSend));

  section.replaceChildren(
    h('div.draft-main',
      h('header.draft-head',
        h('p.eyebrow', 'Draft'),
        h('h1', 'Capture a paper'),
        h('p.muted', 'Type rough thoughts. The agent reads the paper, keeps your words, writes a clean illustrated note, files it in the right chapter, and publishes it.')),
      els.banner,
      h('div.composer',
        h('label.composer-row', svgIcon('link'), els.url),
        els.raw,
        h('label.composer-row', svgIcon('sparkle'), els.instr),
        h('div.composer-foot', els.saved, h('span.spacer'), h('span.hint', h('kbd', '⌘'), h('kbd', 'Enter')), els.submit)),
      els.live),
    h('aside.draft-side', els.segs, els.activity, els.chat));

  setSeg(store.get('paper.draft.seg', 'activity'));
  renderChat();
  updateConnection();
  updateSubmit();
  const active = store.get(ACTIVE_KEY);
  if (active?.id) watchDraftJob(active.id, active.title);
}

function setSeg(id) {
  store.set('paper.draft.seg', id);
  for (const b of els.segs.children) b.classList.toggle('on', b.dataset.seg === id);
  els.activity.hidden = id !== 'activity';
  els.chat.hidden = id !== 'chat';
  if (id === 'chat') els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

export function focusDraft() {
  if (!els.raw) return;
  els.raw.focus();
  els.raw.setSelectionRange(els.raw.value.length, els.raw.value.length);
}

function updateSubmit() {
  if (!els.submit) return;
  els.submit.disabled = !connected() || !els.raw.value.trim() || !!liveJob;
}

export function updateConnection() {
  if (!root) return;
  const s = gw.status;
  els.banner.hidden = s === 'connected' || s === 'checking';
  if (s === 'offline') {
    els.banner.replaceChildren(svgIcon('link'), h('div', h('strong', 'Read-only right now.'), ' The gateway on your Mac isn’t reachable, so drafts can’t be submitted from here. Your writing is still saved in this browser — submit it once ', h('code', 'paperd'), ' is running.'), h('button.btn.ghost.sm', { type: 'button', onclick: () => actions.openSettings() }, 'Settings'));
  } else if (s === 'unpaired') {
    els.banner.replaceChildren(svgIcon('link'), h('div', h('strong', 'Gateway found, not paired.'), ' Run ', h('code', 'python3 gateway/paperd.py pair'), ' on your Mac, or paste the token in settings.'), h('button.btn.ghost.sm', { type: 'button', onclick: () => actions.openSettings() }, 'Pair'));
  }
  els.chatIn.disabled = s !== 'connected';
  els.chatSend.disabled = s !== 'connected';
  els.chatIn.placeholder = s === 'connected' ? 'Ask about your notes, or ask for a reorganization…' : 'Chat needs the gateway — connect it in settings.';
  updateSubmit();
  if (s === 'connected') loadJobs();
}

async function submit() {
  const raw = els.raw.value.trim();
  if (!raw || liveJob) return;
  if (!connected()) { toast('The gateway isn’t connected — your draft is saved locally.'); return; }
  const url = els.url.value.trim();
  const instruction = els.instr.value.trim();
  els.submit.disabled = true;
  try {
    const { job_id } = await api('POST', '/api/notes', { raw, ...(url ? { url } : {}), ...(instruction ? { instruction } : {}) });
    store.set('paper.draft.last', { raw, url, instruction, job_id });
    store.set(DRAFT_KEY, {});
    els.raw.value = '';
    els.url.value = '';
    els.instr.value = '';
    els.saved.textContent = 'Submitted — a copy is kept in this browser until the note is live';
    const title = url || raw.split('\n')[0].slice(0, 80);
    store.set(ACTIVE_KEY, { id: job_id, title });
    watchDraftJob(job_id, title);
    loadJobs();
  } catch (e) {
    toast(e.message, { kind: 'error' });
    updateSubmit();
  }
}

function watchDraftJob(jobId, title, { kind = 'create', fromHistory = false } = {}) {
  liveJob?.close();
  const job = mountJob(jobId, {
    kind,
    title,
    noteLink,
    onDone: async (j) => {
      if (!fromHistory) store.set(ACTIVE_KEY, null);
      liveJob = null;
      updateSubmit();
      loadJobs();
      if (j.status === 'done' && j.changed?.length !== 0 && !fromHistory) {
        const wait = h('p.job-wait', 'Loading the new note…');
        job.el.append(wait);
        const ok = await actions.refreshData({ onWait: (ms) => { wait.textContent = `Waiting for the site to publish… ${Math.round(ms / 1000)}s`; } });
        wait.remove();
        const link = job.el.querySelector('.note-link');
        if (link && j.note_id) link.replaceWith(noteLink(j.note_id));
        if (ok && j.note_id) toast(h('span', 'Note is live — ', noteLink(j.note_id)), { kind: 'ok', ms: 6000 });
      }
    },
  });
  liveJob = fromHistory ? null : job;
  els.live.replaceChildren(job.el);
  requestAnimationFrame(() => job.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  updateSubmit();
}

async function loadJobs() {
  if (!connected() || !els.jobs) return;
  try {
    const { jobs } = await api('GET', '/api/jobs?limit=20');
    if (!jobs.length) { els.jobs.replaceChildren(h('li.jobs-empty', 'No jobs yet. Submit a draft and it will show up here.')); return; }
    els.jobs.replaceChildren(...jobs.map((j) => jobRow(j, {
      noteLink,
      onOpen: (job) => watchDraftJob(job.id, job.note_id ?? kindLabel(job.kind), { kind: job.kind, fromHistory: job.status === 'done' || job.status === 'error' }),
    })));
  } catch (e) {
    els.jobs.replaceChildren(h('li.jobs-empty', `Couldn't load jobs: ${e.message}`));
  }
}

// ---------- chat ----------
function chatState() { return store.get(CHAT_KEY, { session_id: null, messages: [] }) ?? { session_id: null, messages: [] }; }
function saveChat(s) { s.messages = s.messages.slice(-60); store.set(CHAT_KEY, s); }

function bubble(m) {
  const body = m.role === 'user' ? h('div.bubble-text', m.text) : h('div.bubble-text.prose', renderInline(m.text || '…'));
  return h(`div.msg.${m.role}`, m.error ? { class: `msg ${m.role} error` } : null, body);
}

function renderChat() {
  const s = chatState();
  if (!s.messages.length) {
    els.chatLog.replaceChildren(h('div.chat-empty',
      h('p', 'Ask anything about your notebook.'),
      h('div.chat-suggest', ['What have I read on VLAs?', 'Summarize my diffusion notes', 'Which notes should be merged?'].map((q) => h('button.suggest', { type: 'button', onclick: () => { els.chatIn.value = q; els.chatIn.focus(); } }, q)))));
    return;
  }
  els.chatLog.replaceChildren(...s.messages.map(bubble));
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function newChat() {
  store.set(CHAT_KEY, { session_id: null, messages: [] });
  renderChat();
}

async function sendChat() {
  const text = els.chatIn.value.trim();
  if (!text || chatBusy || !connected()) return;
  chatBusy = true;
  els.chatSend.disabled = true;
  const s = chatState();
  s.messages.push({ role: 'user', text });
  saveChat(s);
  els.chatIn.value = '';
  renderChat();
  const pending = h('div.msg.assistant.pending', h('div.bubble-text', h('span.typing', h('i'), h('i'), h('i'))));
  const toolLine = h('div.msg-tools');
  pending.append(toolLine);
  els.chatLog.append(pending);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
  try {
    const res = await api('POST', '/api/chat', { message: text, ...(s.session_id ? { session_id: s.session_id } : {}) });
    s.session_id = res.session_id ?? s.session_id;
    saveChat(s);
    let streamed = '';
    await new Promise((resolve) => {
      followJob(res.job_id, {
        progress: (evt) => {
          if (evt.type === 'text') {
            streamed += evt.text;
            pending.firstChild.replaceChildren(document.createTextNode(streamed));
          } else if (evt.type === 'tool') {
            toolLine.textContent = evt.text;
          }
          els.chatLog.scrollTop = els.chatLog.scrollHeight;
        },
        done: async (job) => {
          const st = chatState();
          if (job.status === 'error') st.messages.push({ role: 'assistant', text: `**Error:** ${job.error ?? 'unknown'}`, error: true });
          else st.messages.push({ role: 'assistant', text: job.reply || streamed || '(no reply)' });
          if (job.session_id) st.session_id = job.session_id;
          saveChat(st);
          renderChat();
          if (job.changed?.length) { toast('The agent changed your notes — reloading.'); await actions.refreshData(); }
          resolve();
        },
      });
    });
  } catch (e) {
    const st = chatState();
    st.messages.push({ role: 'assistant', text: `**Couldn't send:** ${e.message}`, error: true });
    saveChat(st);
    renderChat();
  } finally {
    chatBusy = false;
    els.chatSend.disabled = !connected();
  }
}

