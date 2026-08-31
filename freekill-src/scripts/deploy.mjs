// One command: build everything and put it where GitHub Pages serves it.
//
//   npm run deploy
//
// Vite's outDir is already `../freekill`, so "publishing" is not a copy step —
// it is the build writing straight into the served directory, exactly as
// worldcup-guess-src → worldcup-guess does in this repo. What this script adds
// is the part a bare `vite build` cannot do: verify the result before it becomes
// the deployment, and tell you what to commit.
//
// It never commits and never pushes. That is the user's call, always.
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDist, DIST } from './verify-dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..');
const SITE_ROOT = join(WEB_ROOT, '..');

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: WEB_ROOT, ...opts });
}

const t0 = Date.now();
console.log('→ building');
run('npm', ['run', 'build']);

console.log('\n→ verifying');
const { ok, problems, stats } = verifyDist();
for (const p of problems) console.error(`  ✗ ${p}`);
if (!ok) {
  console.error(`\n✗ not published: ${problems.length} problem(s) in ${relative(SITE_ROOT, DIST)}`);
  process.exit(1);
}

console.log(`  ✓ ${stats.assets} assets, ${stats.luaFiles} lua files, ` +
  `${stats.generals} generals, ${stats.cards} cards`);
console.log(`  ✓ ${(stats.totalBytes / 1048576).toFixed(2)} MB in ${relative(SITE_ROOT, DIST)}/`);
console.log(`  ✓ font ${(stats.fontBytes / 1024).toFixed(0)} KB, OFL license alongside`);

let dirty = '';
try {
  dirty = execFileSync('git', ['status', '--porcelain', '--', 'freekill'], { cwd: SITE_ROOT, encoding: 'utf8' });
} catch { /* not a git checkout; nothing to report */ }

console.log(`\n✓ published to ${DIST} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('  live at https://haoming-chen2006.github.io/freekill/ once committed and pushed:');
console.log('    git -C ~/haoming-chen2006.github.io add freekill freekill-src');
console.log('    git -C ~/haoming-chen2006.github.io commit -m "freekill: publish"');
if (dirty) {
  const n = dirty.trim().split('\n').length;
  console.log(`  (${n} changed path${n === 1 ? '' : 's'} under freekill/)`);
}
