import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/popularArticles.json');
const SOURCE_MD = join(__dirname, '../data/Wikipedia_Popular_pages.md');
const SOURCE_URL = 'https://en.wikipedia.org/wiki/Wikipedia:Popular_pages';

const SKIP_TITLES = new Set([
  'Main_Page', 'Main Page', '-', '404.php', 'Undefined', 'Search',
]);
const SKIP_PREFIXES = [
  'Special:', 'Wikipedia:', 'Portal:', 'File:', 'Help:', 'Template:',
  'Category:', 'User:', 'Talk:', 'Module:', 'Draft:',
  'List of ', 'Index of ', 'Outline of ', 'Glossary of ',
  'Bibliography of ', 'Timeline of ', 'Table of ',
];

function shouldSkip(title) {
  if (!title || title.length < 2) return true;
  if (SKIP_TITLES.has(title)) return true;
  return SKIP_PREFIXES.some((p) => title.startsWith(p));
}

function parseTitlesFromMarkdown(md) {
  const paths = [...md.matchAll(/\/wiki\/([^)\s"]+)/g)].map((m) => m[1]);
  const seen = new Set();
  const titles = [];

  for (const raw of paths) {
    const title = decodeURIComponent(raw).replace(/ /g, '_');
    if (shouldSkip(title) || seen.has(title)) continue;
    seen.add(title);
    titles.push(title);
  }
  return titles;
}

async function wikiGet(host, params, retries = 8) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`https://${host}/w/api.php?${params}`);
    if (res.status === 429) {
      const wait = 1500 * (attempt + 1);
      console.warn(`\nRate limited, waiting ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`API ${res.status} on ${host}`);
    return res.json();
  }
  throw new Error(`API rate limit exceeded on ${host}`);
}

async function fetchZhTitles(enTitles) {
  const zhTitles = [];
  const batchSize = 10;

  for (let i = 0; i < enTitles.length; i += batchSize) {
    const batch = enTitles.slice(i, i + batchSize);
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      prop: 'langlinks',
      lllang: 'zh',
      format: 'json',
      formatversion: '2',
      origin: '*',
    });
    try {
      const data = await wikiGet('en.wikipedia.org', params);
      for (const page of data.query?.pages ?? []) {
        const zh = page.langlinks?.find((l) => l.lang === 'zh');
        if (zh?.title) zhTitles.push(zh.title);
      }
    } catch (err) {
      console.warn(`\nStopped at ${i}/${enTitles.length}: ${err.message}`);
      break;
    }
    process.stdout.write(`\rZH langlinks: ${Math.min(i + batchSize, enTitles.length)}/${enTitles.length} (${zhTitles.length} mapped)`);
    await new Promise((r) => setTimeout(r, 2500));
  }
  process.stdout.write('\n');
  return [...new Set(zhTitles)];
}

async function main() {
  console.log(`Parsing articles from ${SOURCE_URL}`);
  const md = readFileSync(SOURCE_MD, 'utf8');
  const en = parseTitlesFromMarkdown(md);
  console.log(`Found ${en.length} EN articles`);

  let zh = [];
  try {
    console.log('Resolving Chinese titles via langlinks…');
    zh = await fetchZhTitles(en);
    console.log(`Mapped ${zh.length} ZH articles`);
  } catch (err) {
    console.warn(`ZH langlinks failed (${err.message})`);
  }

  if (zh.length < 100) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8'));
      if ((prev.zh?.length ?? 0) > zh.length) {
        console.log(`Keeping ${prev.zh.length} previous ZH topics (partial langlinks: ${zh.length})`);
        zh = prev.zh;
      }
    } catch { /* no previous file */ }
  }

  const payload = {
    en,
    zh,
    source: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${en.length} EN + ${zh.length} ZH topics → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
