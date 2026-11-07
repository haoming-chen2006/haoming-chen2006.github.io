// Loads data/index.json (from this site, or from the gateway's served copy right after a job).
export const state = {
  index: null,        // {generated, chapters, notes}
  byId: new Map(),
  chapterIndex: new Map(), // chapter id -> position
  assetBase: '',      // '' = relative to this page; gateway URL + '/' when data came from the gateway
};

async function fetchIndex(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data.notes) || !Array.isArray(data.chapters)) throw new Error(`${url}: malformed index`);
  return data;
}

export function setIndex(data, assetBase = '') {
  state.index = data;
  state.assetBase = assetBase;
  state.byId = new Map(data.notes.map((n) => [n.id, n]));
  state.chapterIndex = new Map(data.chapters.map((c, i) => [c.id, i]));
}

export async function loadIndex() {
  setIndex(await fetchIndex(`data/index.json?t=${Date.now()}`));
  return state.index;
}

/**
 * After a gateway job: prefer the gateway-served build (fresh immediately), else poll this site's copy
 * until `generated` changes (GitHub Pages takes a minute or two to publish).
 */
export async function refreshAfterJob(gatewayUrl, { timeoutMs = 180000, onWait } = {}) {
  const before = state.index?.generated;
  if (gatewayUrl) {
    try {
      const sameOrigin = new URL(gatewayUrl).origin === location.origin;
      const data = await fetchIndex(`${gatewayUrl.replace(/\/$/, '')}/data/index.json?t=${Date.now()}`);
      if (data.generated !== before) {
        setIndex(data, sameOrigin ? '' : `${gatewayUrl.replace(/\/$/, '')}/`);
        return true;
      }
    } catch { /* gateway static copy not reachable (CORS or not serving dist) — fall back to polling */ }
  }
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const data = await fetchIndex(`data/index.json?t=${Date.now()}`);
      if (data.generated !== before) { setIndex(data); return true; }
    } catch { /* keep polling */ }
    onWait?.(Date.now() - t0);
    await new Promise((r) => setTimeout(r, 4000));
  }
  return false;
}

export const chapterOf = (note) => state.index.chapters.find((c) => c.id === note.chapter);
