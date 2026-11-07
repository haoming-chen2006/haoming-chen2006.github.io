// Hybrid search: BM25-style keyword score over note fields + cosine similarity over chunk embeddings.
// The embedding model (same one build.mjs uses) loads lazily on the first query.
import { state } from './data.js';

const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const DTYPE = 'q8'; // must match scripts/build.mjs

const STOP = new Set('a an and are as at be by for from has have how i in into is it its of on or that the their this to was were what when which who why will with about can do does my me we you your our not no'.split(' '));

export function tokenize(s) {
  return (String(s ?? '').toLowerCase().normalize('NFKD').match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((t) => !STOP.has(t))
    .map(stem);
}
function stem(t) {
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us')) return t.slice(0, -1);
  return t;
}

const FIELDS = [['title', 3], ['tags', 2.5], ['tldr', 2], ['authors', 1.2], ['body', 1]];

let kwIndex = null; // {docs:[{id, fields:{name: Map(term->tf)}, len, sections:[{heading, terms:Set, text}]}], df: Map, avgLen}

function stripMd(md) {
  return md.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_>#|]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildKw() {
  const df = new Map();
  let total = 0;
  const docs = state.index.notes.map((n) => {
    const fields = {};
    const src = { title: n.title, tags: (n.tags ?? []).join(' '), tldr: n.tldr, authors: (n.authors ?? []).join(' '), body: n.markdown };
    const seen = new Set();
    let len = 0;
    for (const [f] of FIELDS) {
      const m = new Map();
      for (const t of tokenize(src[f])) { m.set(t, (m.get(t) ?? 0) + 1); seen.add(t); len++; }
      fields[f] = m;
    }
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
    total += len;
    const sections = n.markdown.split(/^##\s+/m).slice(1).map((sec) => {
      const nl = sec.indexOf('\n');
      const heading = (nl < 0 ? sec : sec.slice(0, nl)).trim();
      const text = stripMd(nl < 0 ? '' : sec.slice(nl + 1));
      return { heading, text, terms: new Set(tokenize(text)) };
    });
    return { id: n.id, fields, len, sections };
  });
  kwIndex = { docs, df, avgLen: total / Math.max(1, docs.length), N: docs.length, generated: state.index.generated };
}

function keywordScores(q) {
  if (!kwIndex || kwIndex.generated !== state.index.generated) buildKw();
  const terms = [...new Set(tokenize(q))];
  const out = new Map();
  if (!terms.length) return out;
  const last = terms[terms.length - 1];
  const prefixOk = !/\s$/.test(q) && last.length >= 2;
  const { docs, df, avgLen, N } = kwIndex;
  for (const d of docs) {
    let score = 0;
    let hit = 0;
    for (const t of terms) {
      let tScore = 0;
      for (const [f, w] of FIELDS) {
        let tf = d.fields[f].get(t) ?? 0;
        if (!tf && prefixOk && t === last) for (const [k, v] of d.fields[f]) if (k.startsWith(t)) tf += v * 0.7;
        if (!tf) continue;
        const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
        const k1 = 1.2, b = f === 'body' ? 0.75 : 0;
        tScore += w * idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (d.len / avgLen))));
      }
      if (tScore) hit++;
      score += tScore;
    }
    if (score > 0) {
      score *= 0.5 + 0.5 * (hit / terms.length); // reward covering more of the query
      let best = null;
      let bestN = 0;
      for (const s of d.sections) {
        const c = terms.filter((t) => s.terms.has(t)).length;
        if (c > bestN) { bestN = c; best = s; }
      }
      out.set(d.id, { score, section: best, terms });
    }
  }
  return out;
}

// ---- semantic ----
let emb = null;       // {chunks:[{id, heading, text, v: Float32Array}], generated}
let embPromise = null;
let extractor = null;
let modelPromise = null;
const qCache = new Map();
export const semantic = { status: 'idle', error: null, listeners: new Set() };
const setSem = (status, error = null) => { semantic.status = status; semantic.error = error; semantic.listeners.forEach((f) => f(status)); };

function loadEmbeddings() {
  const gen = state.index.generated;
  if (emb && emb.generated === gen) return Promise.resolve(emb);
  if (embPromise && embPromise.gen === gen) return embPromise;
  const p = fetch(`${state.assetBase}data/embeddings.json?g=${encodeURIComponent(gen)}`).then((r) => {
    if (!r.ok) throw new Error(`embeddings.json HTTP ${r.status}`);
    return r.json();
  }).then((data) => {
    emb = { generated: gen, chunks: data.chunks.filter((c) => Array.isArray(c.v) && c.v.length).map((c) => ({ ...c, v: Float32Array.from(c.v) })) };
    return emb;
  });
  p.gen = gen;
  embPromise = p;
  return p;
}

function loadModel() {
  if (extractor) return Promise.resolve(extractor);
  if (!modelPromise) {
    setSem('loading');
    modelPromise = import(TRANSFORMERS).then(async ({ pipeline, env }) => {
      env.allowLocalModels = false;
      extractor = await pipeline('feature-extraction', MODEL, { dtype: DTYPE });
      setSem('ready');
      return extractor;
    }).catch((e) => { modelPromise = null; setSem('error', e); throw e; });
  }
  return modelPromise;
}

export function warmSemantic() {
  loadEmbeddings().catch(() => {});
  loadModel().catch(() => {});
}

async function embedQuery(q) {
  const key = q.trim().toLowerCase();
  if (qCache.has(key)) return qCache.get(key);
  const ex = await loadModel();
  const out = await ex(key, { pooling: 'mean', normalize: true });
  const v = Float32Array.from(out.data);
  qCache.set(key, v);
  return v;
}

export function semanticReady() { return !!extractor && !!emb && emb.generated === state.index?.generated; }

async function semanticScores(q) {
  const [e, v] = await Promise.all([loadEmbeddings(), embedQuery(q)]);
  const best = new Map();
  for (const c of e.chunks) {
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += v[i] * c.v[i];
    const prev = best.get(c.id);
    if (!prev || dot > prev.score) best.set(c.id, { score: dot, heading: c.heading, text: c.text });
  }
  return best;
}

/**
 * Returns ranked results [{id, score, kw, sem, heading, snippet, terms}].
 * With semantic=false (or before the model loads) ranking is keyword-only.
 */
export async function search(q, { semantic: useSem = true } = {}) {
  const kw = keywordScores(q);
  let sem = null;
  if (useSem) {
    try { sem = await semanticScores(q); } catch { sem = null; }
  }
  const maxKw = Math.max(0, ...[...kw.values()].map((x) => x.score));
  const ids = new Set([...kw.keys(), ...(sem ? sem.keys() : [])]);
  const results = [];
  for (const id of ids) {
    if (!state.byId.has(id)) continue;
    const k = kw.get(id);
    const s = sem?.get(id);
    const kwN = k && maxKw ? k.score / maxKw : 0;
    const semN = s ? Math.max(0, Math.min(1, (s.score - 0.12) / 0.48)) : 0;
    const score = sem ? 0.35 * kwN + 0.65 * semN : kwN;
    if (sem ? score < 0.14 && kwN < 0.25 : !k) continue;
    const useSemHeading = s && (!k || semN > kwN);
    const heading = useSemHeading ? (s.heading ?? null) : (k?.section?.heading ?? null);
    const snippet = useSemHeading ? s.text : (k?.section?.text ?? '');
    results.push({ id, score, kw: kwN, sem: s?.score ?? null, heading, snippet, terms: k?.terms ?? tokenize(q), via: k && s && semN > 0.2 ? 'both' : s && semN > kwN ? 'semantic' : 'keyword' });
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

export function makeSnippet(text, terms, len = 170) {
  if (!text) return '';
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of terms ?? []) { const i = lower.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
  let start = at < 0 ? 0 : Math.max(0, at - 50);
  if (start > 0) { const sp = text.indexOf(' ', start); if (sp > 0 && sp - start < 20) start = sp + 1; }
  let s = text.slice(start, start + len);
  if (start + len < text.length) s = s.replace(/\s\S*$/, '') + '…';
  return (start > 0 ? '…' : '') + s;
}
