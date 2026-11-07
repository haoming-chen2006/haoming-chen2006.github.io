import { marked } from 'https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.es.mjs';
import katex from 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.mjs';

marked.setOptions({ gfm: true, breaks: false });

// Math is lifted out before marked runs (so `_` and `*` inside formulas survive), rendered with KaTeX,
// and spliced back in after sanitizing. Code spans and fences are left untouched.
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<![\\$\w])\$(?=\S)((?:\\\$|[^$\n])+?)(?<=\S)\$(?![\w$])/g;

function liftMath(src) {
  const math = [];
  const out = src.split(CODE).map((part, i) => {
    if (i % 2 === 1) return part;
    return part.replace(MATH, (_, d1, d2, i1, i2) => {
      const display = d1 != null || d2 != null;
      math.push({ tex: (d1 ?? d2 ?? i1 ?? i2).trim(), display });
      return `MATHPH${math.length - 1}END`;
    });
  }).join('');
  return { out, math };
}

function renderTex({ tex, display }) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' });
  } catch {
    return `<code>${tex.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</code>`;
  }
}

const slug = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

/**
 * Render note markdown into a DocumentFragment.
 * assetBase: prefix for relative asset URLs ('' when data came from this site, gateway URL otherwise).
 */
export function renderMarkdown(md, { assetBase = '' } = {}) {
  const { out, math } = liftMath(md ?? '');
  let html = marked.parse(out);
  html = DOMPurify.sanitize(html, { ADD_ATTR: ['target'], FORBID_TAGS: ['style', 'form', 'input'] });
  html = html
    .replace(/<p>\s*MATHPH(\d+)END\s*<\/p>/g, (_, i) => `<div class="math-block">${renderTex({ ...math[i], display: true })}</div>`)
    .replace(/MATHPH(\d+)END/g, (_, i) => (math[i].display ? `<span class="math-block">${renderTex(math[i])}</span>` : renderTex(math[i])));

  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const root = tpl.content;

  for (const img of root.querySelectorAll('img')) {
    let src = img.getAttribute('src') ?? '';
    if (assetBase && !/^(https?:|data:|\/)/.test(src)) { src = assetBase + src; img.setAttribute('src', src); }
    img.loading = 'lazy';
    img.decoding = 'async';
    const p = img.parentElement;
    const alt = img.getAttribute('alt') ?? '';
    const lone = p && p.tagName === 'P' && p.childNodes.length === 1;
    const fig = document.createElement('figure');
    const a = document.createElement('a');
    a.href = src;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'fig-link';
    img.replaceWith(fig);
    a.append(img);
    fig.append(a);
    if (alt) {
      const cap = document.createElement('figcaption');
      const m = /^(Figure\s+[\w.]+(?:\s+from the paper)?)([:.—-]\s*)?(.*)$/i.exec(alt);
      if (m) { const b = document.createElement('strong'); b.textContent = m[1]; cap.append(b, m[3] ? ` ${m[3]}` : ''); } else cap.textContent = alt;
      fig.append(cap);
    }
    if (lone) p.replaceWith(fig);
  }
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  }
  for (const t of root.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    t.replaceWith(wrap);
    wrap.append(t);
  }

  // Group each h2 and its content into <section data-heading>.
  const frag = document.createDocumentFragment();
  let cur = null;
  for (const node of [...root.childNodes]) {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      const heading = node.textContent.trim();
      cur = document.createElement('section');
      cur.dataset.heading = heading;
      cur.id = `sec-${slug(heading)}`;
      if (/^my notes$/i.test(heading)) cur.classList.add('my-notes');
      frag.append(cur);
    }
    (cur ?? frag).append(node);
  }
  return frag;
}

export function renderInline(md) {
  const frag = renderMarkdown(md);
  const div = document.createElement('div');
  div.append(frag);
  return div;
}
