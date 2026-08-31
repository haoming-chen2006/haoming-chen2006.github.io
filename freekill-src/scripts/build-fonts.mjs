// Fonts.
//
// The three TTFs in the FreeKill checkout CANNOT SHIP. FZLBGBK (方正隶变_GBK) and
// FZLE (方正隶二简体) are Founder Corporation retail faces; simli.ttf is Stone
// Co.'s SimLi. None carries a license grant, and the repo-level GPLv3 cannot
// relicense a third party's work. Subsetting does not cure it — a subset is a
// derivative and inherits the same restriction. simli.ttf is referenced by no
// QML binding at all, so it is dropped rather than replaced.
//
// So the web build substitutes an OFL-licensed CJK face, subset to the exact
// 1,443 Han the shipped Lua, translations and UI use, served as woff2 with the
// license file beside it.
//
// Requires network on first run and `uv` (fonttools + brotli come from an
// ephemeral uv environment). The output is committed, so a normal build never
// runs this.
//
//   node scripts/build-fonts.mjs            # build the shipped face
//   node scripts/build-fonts.mjs --all      # build every candidate, for comparison
//   node scripts/build-fonts.mjs --face notoserifsc
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { glyphSet } from './glyphset.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..');
const OUT = join(WEB_ROOT, 'public', 'fonts');
const CACHE = join(WEB_ROOT, 'node_modules', '.cache', 'fk-fonts');

/**
 * Every candidate is OFL 1.1 and was checked against the real glyph set.
 * `missingHan` is measured, not claimed. A face that misses Han the game uses
 * is not shippable as the primary: 惇 is 夏侯惇 and 骍 is 紫骍, both of which
 * appear on a general list and a card.
 */
export const CANDIDATES = {
  lxgwwenkai: {
    family: 'LXGW WenKai',
    label: '霞鹜文楷 LXGW WenKai',
    style: '楷体 — brush-derived kai, warm and hand-lettered',
    url: 'https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf',
    license: 'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt',
    copyright: 'Copyright (c) 2021, LIU Zhaoxi (lxgw). Derived from FONTWORKS Klee One.',
    missingHan: 0,
  },
  notoserifsc: {
    family: 'Noto Serif SC',
    label: '思源宋体 Noto Serif SC',
    style: '宋体 — the safe default; neutral, printed',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt',
    copyright: 'Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name Source.',
    instance: 400,
    missingHan: 0,
  },
  notosanssc: {
    family: 'Noto Sans SC',
    label: '思源黑体 Noto Sans SC',
    style: '黑体 — modern sans; the UI/body pairing',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/OFL.txt',
    copyright: 'Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name Source.',
    instance: 400,
    missingHan: 0,
  },
  zhuquefangsong: {
    family: 'Zhuque Fangsong',
    label: '朱雀仿宋 Zhuque Fangsong',
    style: '仿宋 — closest to the original\'s stroke contrast, but see missingHan',
    url: 'zip:https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip#ZhuqueFangsong-Regular.ttf',
    license: 'https://raw.githubusercontent.com/TrionesType/zhuque/main/OFL.txt',
    copyright: 'Copyright (c) 2022, Triones Type.',
    missingHan: 3, // 釭髣髴 — and no ♠♣♥♦, which a card game needs
  },
  mashanzheng: {
    family: 'Ma Shan Zheng',
    label: '马善政毛笔楷书 Ma Shan Zheng',
    style: '毛笔行楷 — most calligraphic, but see missingHan',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/OFL.txt',
    copyright: 'Copyright (c) 2016, Ma Shan Zheng.',
    missingHan: 8, // 惇毀釭飖骍髣髴黒 — exactly the gap the original LiShu face had
  },
  zcoolxiaowei: {
    family: 'ZCOOL XiaoWei',
    label: '站酷小薇体 ZCOOL XiaoWei',
    style: '文艺宋 — display face, but see missingHan',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolxiaowei/OFL.txt',
    copyright: 'Copyright (c) 2016, ZCOOL Fonts.',
    missingHan: 8,
  },
};

/** The face the build ships. Swap this one word and re-run to change it. */
export const SHIPPED = process.env.FK_FONT || 'lxgwwenkai';

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
}

function fetchSource(key, c) {
  mkdirSync(CACHE, { recursive: true });
  const ttf = join(CACHE, `${key}.ttf`);
  if (existsSync(ttf)) return ttf;
  if (c.url.startsWith('zip:')) {
    const [zipUrl, member] = c.url.slice(4).split('#');
    const zip = join(CACHE, `${key}.zip`);
    sh('curl', ['-sL', '-o', zip, zipUrl]);
    sh('unzip', ['-o', '-j', '-q', zip, `*${member}`, '-d', CACHE]);
    sh('mv', [join(CACHE, member), ttf]);
    rmSync(zip, { force: true });
  } else {
    sh('curl', ['-sL', '-o', ttf, c.url]);
  }
  if (statSync(ttf).size < 100000) throw new Error(`${key}: download looks wrong (${statSync(ttf).size} B)`);
  return ttf;
}

const PY = `
import sys, subprocess, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
src, out, wght, textfile = sys.argv[1:5]
chars = open(textfile, encoding='utf-8').read()
work = src
f = TTFont(src)
if 'fvar' in f and wght != '-':
    f = instancer.instantiateVariableFont(f, {'wght': float(wght)}, inplace=True, updateFontNames=False)
    work = out + '.static.ttf'
    f.save(work)
f.close()
subprocess.run(['pyftsubset', work, '--text=' + chars, '--output-file=' + out, '--flavor=woff2',
    '--layout-features=', '--no-hinting', '--desubroutinize',
    '--drop-tables+=DSIG,GSUB,GPOS,GDEF,MVAR,STAT,HVAR,VVAR,fvar,avar',
    '--name-IDs=*', '--notdef-outline'], check=True)
if work != src: os.remove(work)
missing = []
f = TTFont(out)
cmap = set()
for t in f['cmap'].tables: cmap |= set(t.cmap.keys())
for c in chars:
    if ord(c) not in cmap: missing.append(c)
print(os.path.getsize(out), ''.join(missing), sep='\\t')
`;

function subset(srcTtf, outPath, instance, textFile) {
  const py = join(CACHE, 'subset.py');
  writeFileSync(py, PY);
  const line = sh('uv', ['run', '--quiet', '--with', 'fonttools[woff]', '--with', 'brotli',
    'python', py, srcTtf, outPath, instance ? String(instance) : '-', textFile]).trim();
  const [bytes, missing] = line.split('\t');
  return { bytes: Number(bytes), missing: missing ?? '' };
}

export function buildFonts({ all = false, face = SHIPPED } = {}) {
  const chars = [...glyphSet()].sort().join('');
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CACHE, { recursive: true });
  const textFile = join(CACHE, 'glyphs.txt');
  writeFileSync(textFile, chars);

  const han = [...chars].filter((c) => c.codePointAt(0) >= 0x4e00 && c.codePointAt(0) <= 0x9fff);
  console.log(`glyph set: ${chars.length} chars, ${han.length} Han`);

  const keys = all ? Object.keys(CANDIDATES) : [face];
  const results = [];
  for (const key of keys) {
    const c = CANDIDATES[key];
    if (!c) throw new Error(`unknown face ${key}; have ${Object.keys(CANDIDATES).join(', ')}`);
    const src = fetchSource(key, c);
    const out = join(OUT, `${key}.woff2`);
    const { bytes, missing } = subset(src, out, c.instance, textFile);
    const missingHan = [...missing].filter((m) => m.codePointAt(0) >= 0x4e00 && m.codePointAt(0) <= 0x9fff);
    // OFL requires the license travel with the font.
    sh('curl', ['-sL', '-o', join(OUT, `${key}.OFL.txt`), c.license]);
    results.push({ key, ...c, bytes, missing, missingHan: missingHan.join('') });
    console.log(`${c.label.padEnd(30)} ${(bytes / 1024).toFixed(1)} KB` +
      `  missing ${missing.length} (${missingHan.length} Han${missingHan.length ? ': ' + missingHan.join('') : ''})`);
    if (key === face && missingHan.length) {
      throw new Error(`${key} is missing Han the game uses: ${missingHan.join('')} — not shippable as the primary face`);
    }
  }

  const shipped = results.find((r) => r.key === face);
  if (shipped) {
    writeFileSync(join(OUT, 'fonts.json'), JSON.stringify({
      family: 'FKHan', source: shipped.family, key: shipped.key,
      href: `fonts/${shipped.key}.woff2`, license: `fonts/${shipped.key}.OFL.txt`,
      copyright: shipped.copyright, bytes: shipped.bytes, chars: chars.length, han: han.length,
      // Recorded so the build test can fail loudly if the glyph set grows past
      // what the committed woff2 covers, instead of shipping tofu.
      missing: shipped.missing, missingHan: shipped.missingHan,
      hanCovered: han.filter((c) => !shipped.missing.includes(c)).length,
    }, null, 2));
    console.log(`shipped: ${shipped.label} -> public/fonts/${shipped.key}.woff2 (${(shipped.bytes / 1024).toFixed(1)} KB)`);
    console.log(`baseline: fonts/ in the Qt checkout is 25.84 MB across three proprietary TTFs`);
  }
  return results;
}

/**
 * The woff2 and its license are committed, and rebuilding needs uv, fonttools and
 * a download. So a normal build only re-subsets when the glyph set has actually
 * outgrown what shipped — and says so rather than silently shipping tofu.
 */
export function fontsAreCurrent(face = SHIPPED) {
  const meta = join(OUT, 'fonts.json');
  if (!existsSync(meta) || !existsSync(join(OUT, `${face}.woff2`))) return false;
  const shipped = JSON.parse(readFileSync(meta, 'utf8'));
  if (shipped.key !== face) return false;
  const han = [...glyphSet()].filter((c) => {
    const n = c.codePointAt(0);
    return n >= 0x4e00 && n <= 0x9fff;
  }).length;
  if (han > shipped.han) {
    console.warn(`[fonts] the glyph set grew to ${han} Han; the shipped subset covers ${shipped.han}`);
    return false;
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const faceIdx = argv.indexOf('--face');
  const face = faceIdx >= 0 ? argv[faceIdx + 1] : SHIPPED;
  if (!argv.includes('--all') && !argv.includes('--force') && fontsAreCurrent(face)) {
    const meta = JSON.parse(readFileSync(join(OUT, 'fonts.json'), 'utf8'));
    console.log(`fonts: ${meta.source} ${(meta.bytes / 1024).toFixed(1)} KB is current ` +
      `(--force to rebuild)`);
  } else {
    buildFonts({ all: argv.includes('--all'), face });
  }
}
