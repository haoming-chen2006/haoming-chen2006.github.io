// Gateway (paperd) client per schema/api.md: health/auth polling, authed fetch, SSE job streams.
import { store } from './util.js';

const URL_KEY = 'paper.gateway.url';
const TOKEN_KEY = 'paper.gateway.token';
export const DEFAULT_URL = 'http://127.0.0.1:4791';

export const gw = {
  status: 'checking', // connected | offline | unpaired | checking
  health: null,
  listeners: new Set(),
};

function defaultUrl() {
  // When the page is served by the gateway itself, talk to that origin.
  if (/^https?:\/\/(127\.0\.0\.1|localhost):4791$/.test(location.origin)) return location.origin;
  return DEFAULT_URL;
}
export const getUrl = () => (store.getRaw(URL_KEY) || defaultUrl()).replace(/\/+$/, '');
export const getToken = () => store.getRaw(TOKEN_KEY) || '';
export function setConfig({ url, token }) {
  if (url !== undefined) store.setRaw(URL_KEY, url && url.replace(/\/+$/, '') !== defaultUrl() ? url.replace(/\/+$/, '') : null);
  if (token !== undefined) store.setRaw(TOKEN_KEY, token || null);
}
export const connected = () => gw.status === 'connected';

function setStatus(s, health = gw.health) {
  const changed = s !== gw.status;
  gw.status = s;
  gw.health = health;
  if (changed) gw.listeners.forEach((f) => f(s));
  else gw.listeners.forEach((f) => f(s, { quiet: true }));
}

/** Consume `#pair=<token>` (api.md): store the token and strip the fragment. Returns true if paired. */
export function consumePairFragment() {
  const m = /^#\/?pair=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (!m) return false;
  setConfig({ token: m[1] });
  history.replaceState(null, '', `${location.pathname}${location.search}#/`);
  return true;
}

async function timed(url, opts = {}, ms = 3500) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctl.signal, cache: 'no-store' }); } finally { clearTimeout(t); }
}

export async function check() {
  const base = getUrl();
  let health;
  try {
    const r = await timed(`${base}/api/health`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    health = await r.json();
  } catch {
    setStatus('offline', null);
    return gw.status;
  }
  const token = getToken();
  if (!token) { setStatus('unpaired', health); return gw.status; }
  try {
    const r = await timed(`${base}/api/auth/check`, { headers: { Authorization: `Bearer ${token}` } });
    setStatus(r.ok ? 'connected' : 'unpaired', health);
  } catch {
    setStatus('offline', null);
  }
  return gw.status;
}

let pollTimer = null;
export function startPolling() {
  const tick = async () => {
    await check();
    clearTimeout(pollTimer);
    pollTimer = setTimeout(tick, gw.status === 'connected' ? 20000 : 30000);
  };
  tick();
  window.addEventListener('focus', () => check());
  window.addEventListener('online', () => check());
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function api(method, path, body) {
  const r = await fetch(`${getUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  }).catch((e) => { check(); throw new ApiError(0, `Gateway unreachable (${e.message})`); });
  let data = null;
  try { data = await r.json(); } catch { /* empty */ }
  if (r.status === 401) { check(); throw new ApiError(401, 'Not paired — the gateway rejected the token.'); }
  if (!r.ok) throw new ApiError(r.status, data?.error || `HTTP ${r.status}`);
  return data;
}

const TERMINAL = new Set(['done', 'error']);

/**
 * Follow a job: SSE with replay, falling back to polling GET /api/jobs/{id} if the stream drops.
 * handlers: {progress(evt), job(jobSnapshot), done(job)}. Returns {close()}.
 */
export function followJob(jobId, handlers) {
  let closed = false;
  let finished = false;
  let es = null;
  let pollT = null;
  const finish = (job) => {
    if (finished) return;
    finished = true;
    handlers.done?.(job);
    close();
  };
  const poll = async () => {
    if (closed) return;
    try {
      const job = await api('GET', `/api/jobs/${encodeURIComponent(jobId)}`);
      handlers.job?.(job);
      if (TERMINAL.has(job.status)) return finish(job);
    } catch { /* retry */ }
    pollT = setTimeout(poll, 2000);
  };
  try {
    es = new EventSource(`${getUrl()}/api/jobs/${encodeURIComponent(jobId)}/events?token=${encodeURIComponent(getToken())}`);
    es.addEventListener('progress', (e) => { try { handlers.progress?.(JSON.parse(e.data)); } catch { /* ignore */ } });
    es.addEventListener('done', (e) => { try { finish(JSON.parse(e.data)); } catch { poll(); } });
    es.onerror = () => {
      if (finished || closed) return;
      es.close();
      es = null;
      poll();
    };
  } catch {
    poll();
  }
  function close() {
    closed = true;
    es?.close();
    clearTimeout(pollT);
  }
  return { close };
}
