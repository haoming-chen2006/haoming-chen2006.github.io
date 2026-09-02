// Extracts the exact character set the shipped build can render from static data.
// Scope D of specs/001-freekill-web/assets-findings.md: the three v1 packages'
// Lua, all of lua/, lang/{zh_CN,en_US}.ts and Fk/**/*.{qml,js,mjs} — minus vi_VN,
// which contributes zero Han. Our own React source is added on top, because the
// shell writes Chinese labels the engine tree never contains.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ENGINE_ROOT = process.env.FK_ROOT || '/Users/haoming/FreeKill';
export const WEB_ROOT = join(here, '..');

function walk(abs, filter, out = []) {
  let entries;
  try { entries = readdirSync(abs).sort(); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git') continue;
    const a = join(abs, name);
    const st = statSync(a);
    if (st.isDirectory()) walk(a, filter, out);
    else if (filter(a)) out.push(a);
  }
  return out;
}

export function sourceFiles() {
  const files = [];
  // vi_VN is not shipped; it contributes 78 Latin diacritics and zero Han.
  const isLua = (p) => p.endsWith('.lua') && !p.endsWith('vi_VN.lua');
  files.push(...walk(join(ENGINE_ROOT, 'lua'), isLua));
  for (const pkg of ['standard', 'standard_cards', 'maneuvering', 'utility', 'mobile']) {
    files.push(...walk(join(ENGINE_ROOT, 'packages', pkg), isLua));
  }
  // Site-owned packages. They mount at the same `packages/` prefix as the
  // mirrored ones and their translation tables render in the UI exactly the
  // same way, so leaving them out ships tofu for whatever Han only they use.
  files.push(...walk(join(WEB_ROOT, 'packages'), isLua));
  files.push(join(ENGINE_ROOT, 'lang', 'zh_CN.ts'), join(ENGINE_ROOT, 'lang', 'en_US.ts'));
  files.push(...walk(join(ENGINE_ROOT, 'Fk'), (p) => /\.(qml|js|mjs)$/.test(p)));
  // `.json` is in the list because a lane put user-visible Chinese labels in a
  // JSON file to stay out of `src/i18n`, and the harvester silently skipped
  // them -- safe only by coincidence, since every glyph happened to be in the
  // corpus already. A label edited later would have gone to tofu with nothing
  // failing. Anything under `src/` that can reach a screen must be walked.
  files.push(...walk(join(WEB_ROOT, 'src'), (p) => /\.(ts|tsx|css|html|json)$/.test(p)));
  files.push(join(WEB_ROOT, 'index.html'));
  return files;
}

const HAN = (c) => {
  const n = c.codePointAt(0);
  return (n >= 0x4e00 && n <= 0x9fff) || (n >= 0x3400 && n <= 0x4dbf) ||
         (n >= 0xf900 && n <= 0xfaff);
};

/**
 * One of our own TypeScript sources, with its comments gone.
 *
 * A comment is the one kind of Chinese in this tree that cannot reach a screen,
 * and harvesting it puts glyphs in the shipped face that no player will ever
 * see. That was theoretical while the annotations were in English; it stopped
 * being theoretical when `anim/spectacle/signatures/` grew five hundred
 * researched skill notes and moved the subset by fifty-five Han — a bigger font
 * for every player, to render prose only the source has.
 *
 * Parsed rather than regexed, and with `charset: 'utf8'` so a string keeps its
 * characters instead of being escaped to `\uXXXX` — the default output would
 * have silently emptied the harvest of the very thing it is for. A file esbuild
 * cannot read falls back to its raw text, because over-collecting is a slightly
 * larger download and under-collecting is tofu on the table.
 */
function code(file) {
  const raw = readFileSync(file, 'utf8');
  if (!/\.tsx?$/.test(file)) return raw;
  try {
    return transformSync(raw, {
      loader: file.endsWith('.tsx') ? 'tsx' : 'ts',
      charset: 'utf8',
      // Comments survive a plain transform inside an object literal, which is
      // exactly where the skill notes live. Whitespace minification drops them
      // and touches nothing else — identifiers, syntax and every string are
      // left alone.
      minifyWhitespace: true,
    }).code;
  } catch {
    return raw;
  }
}

export function glyphSet() {
  const chars = new Set();
  for (const f of sourceFiles()) {
    let text;
    try { text = code(f); } catch { continue; }
    for (const c of text) {
      const n = c.codePointAt(0);
      if (n < 0x20) continue;           // control characters
      if (n >= 0xd800 && n <= 0xdfff) continue;
      chars.add(c);
    }
  }
  // Always present regardless of what the sources happen to contain.
  for (let n = 0x20; n <= 0x7e; n++) chars.add(String.fromCodePoint(n));
  for (const c of '　、。〈〉《》「」『』【】〔〕〖〗！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～·—…‘’“”♠♣♥♦①②③④⑤⑥⑦⑧⑨⑩') chars.add(c);
  return chars;
}

export function classify(chars) {
  const han = [...chars].filter(HAN);
  return { total: chars.size, han: han.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const chars = glyphSet();
  const { total, han } = classify(chars);
  console.error(`${sourceFiles().length} source files -> ${total} distinct chars, ${han} Han`);
  process.stdout.write([...chars].sort().join(''));
}
