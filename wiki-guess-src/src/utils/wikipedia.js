const WIKI_HOSTS = { en: 'en.wikipedia.org', zh: 'zh.wikipedia.org', 'zh-tw': 'zh.wikipedia.org' };

const SKIP_NS = [
  'Special:', 'File:', 'Help:', 'Wikipedia:', 'Template:', 'Category:',
  'Portal:', 'Module:', 'Draft:', 'Talk:', 'User:',
];

export function wikiHost(lang) {
  return WIKI_HOSTS[lang] ?? WIKI_HOSTS.zh;
}

export function safeDecodeTitle(raw) {
  const normalized = String(raw).replace(/ /g, '_').trim();
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

export function normalizeTitle(title) {
  return safeDecodeTitle(title);
}

export function titlesMatch(a, b) {
  return normalizeTitle(a).toLowerCase() === normalizeTitle(b).toLowerCase();
}

function isWikiHost(hostname, lang) {
  const prefix = [ 'zh', 'zh-tw' ].includes(lang) ? 'zh' : 'en';
  return hostname === `${prefix}.wikipedia.org` || hostname === `${prefix}.m.wikipedia.org`;
}

export function titleFromHref(href, lang) {
  if (!href || href.startsWith('#')) return null;

  const host = wikiHost(lang);
  try {
    const url = new URL(href, `https://${host}`);
    if (!isWikiHost(url.hostname, lang)) return null;

    let title = null;
    if (url.pathname.startsWith('/wiki/')) {
      title = safeDecodeTitle(url.pathname.slice(6));
    } else if (url.pathname.includes('index.php')) {
      const fromQuery = url.searchParams.get('title');
      if (fromQuery) title = safeDecodeTitle(fromQuery);
    }

    if (!title) return null;
    if (SKIP_NS.some((ns) => title.startsWith(ns))) return null;
    return title;
  } catch {
    return null;
  }
}

function variantFor(lang) {
  if (lang === 'zh') return 'zh-cn';
  if (lang === 'zh-tw') return 'zh-tw';
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wikipedia rate-limits anonymous clients (HTTP 429), which is easy to hit
// because English articles are large and each move used to fire several calls.
// Retry a throttled request a few times with growing backoff before giving up.
async function wikiGet(lang, params, attempt = 0) {
  const host = wikiHost(lang);
  const res = await fetch(`https://${host}/w/api.php?${params}`);
  if ((res.status === 429 || res.status === 503) && attempt < 4) {
    await sleep(500 * (attempt + 1));
    return wikiGet(lang, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`Wikipedia API error (${res.status})`);
  return res.json();
}

// Cache resolved page ids per lang+title. Within a round the target title is
// checked on every click, so this turns most win-checks into zero requests.
const pageIdCache = new Map();

export async function resolveTitle(lang, title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
  });
  const variant = variantFor(lang);
  if (variant) params.set('variant', variant);
  const data = await wikiGet(lang, params);
  const pages = data.query?.pages;
  if (!pages?.length) return null;
  const page = pages[0];
  if (page.missing) return null;
  return page.title;
}

export async function getPageId(lang, title) {
  const cacheKey = `${lang}::${title}`;
  if (pageIdCache.has(cacheKey)) return pageIdCache.get(cacheKey);

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
  });
  const variant = variantFor(lang);
  if (variant) params.set('variant', variant);
  const data = await wikiGet(lang, params);
  const page = data.query?.pages?.[0];
  const id = !page || page.missing ? null : page.pageid;
  if (id != null) pageIdCache.set(cacheKey, id);
  return id;
}

export async function titlesMatchOnWiki(wikiLang, titleA, titleB) {
  const [idA, idB] = await Promise.all([
    getPageId(wikiLang, titleA),
    getPageId(wikiLang, titleB),
  ]);
  return Boolean(idA && idB && idA === idB);
}

export async function translateTitle(fromLang, toLang, title) {
  if (fromLang === toLang) return resolveTitle(fromLang, title) ?? title;

  const resolved = await resolveTitle(fromLang, title);
  if (!resolved) return title;

  const params = new URLSearchParams({
    action: 'query',
    titles: resolved,
    prop: 'langlinks',
    lllang: toLang,
    format: 'json',
    formatversion: '2',
    origin: '*',
  });
  const data = await wikiGet(fromLang, params);
  const page = data.query?.pages?.[0];
  const link = page?.langlinks?.find((l) => l.lang === toLang);
  if (link?.title) return link.title;

  return resolved;
}

export async function fetchArticle(lang, title) {
  // parse resolves redirects itself, so we skip a separate resolveTitle call.
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'text|displaytitle',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
  });
  const variant = variantFor(lang);
  if (variant) params.set('variant', variant);
  const data = await wikiGet(lang, params);
  if (data.error) throw new Error(data.error.info ?? 'Article not found');
  if (!data.parse?.text) throw new Error('Article not found');

  // Remember the id so the win-check for this page is free.
  if (data.parse.pageid != null) {
    pageIdCache.set(`${lang}::${title}`, data.parse.pageid);
    pageIdCache.set(`${lang}::${data.parse.title}`, data.parse.pageid);
  }

  return {
    title: data.parse.title,
    pageid: data.parse.pageid,
    displayTitle: data.parse.displaytitle,
    html: data.parse.text,
  };
}

export function rewriteArticleHtml(html, lang) {
  const host = wikiHost(lang);
  return html
    .replace(/href="\/wiki\//g, `href="https://${host}/wiki/`)
    .replace(/href="\/w\//g, `href="https://${host}/w/`);
}
