// Extracts the exact character set the shipped build can render from static data.
// Scope D of specs/001-freekill-web/assets-findings.md: the three v1 packages'
// Lua, all of lua/, lang/{zh_CN,en_US}.ts and Fk/**/*.{qml,js,mjs} — minus vi_VN,
// which contributes zero Han. Our own React source is added on top, because the
// shell writes Chinese labels the engine tree never contains.
import { readdirSync, statSync, readFileSync } from 'node:fs';
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
  files.push(...walk(join(WEB_ROOT, 'src'), (p) => /\.(ts|tsx|css|html)$/.test(p)));
  files.push(join(WEB_ROOT, 'index.html'));
  return files;
}

const HAN = (c) => {
  const n = c.codePointAt(0);
  return (n >= 0x4e00 && n <= 0x9fff) || (n >= 0x3400 && n <= 0x4dbf) ||
         (n >= 0xf900 && n <= 0xfaff);
};

export function glyphSet() {
  const chars = new Set();
  for (const f of sourceFiles()) {
    let text;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
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
