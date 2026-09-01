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

/**
 * This project is one directory inside a personal site, and it builds with
 * `emptyOutDir: true` pointed at a sibling (`../freekill`). Override that
 * outDir by even one path segment and the build erases whatever it lands on
 * instead. That happened: 30 tracked files — the portfolio's images and
 * `assets/website_basic/` — were emptied out of the working tree, and because
 * git carries a working-tree deletion silently across every branch switch,
 * nothing surfaced it for days. Publishing is the last moment to catch it, so
 * a deletion anywhere outside this project's own two directories stops the
 * deploy rather than riding along into a commit.
 */
let collateral = '';
try {
  collateral = execFileSync(
    'git', ['status', '--porcelain', '-z', '--', '.', ':(exclude)freekill', ':(exclude)freekill-src'],
    { cwd: SITE_ROOT, encoding: 'utf8' },
  );
} catch { /* not a git checkout; nothing to check */ }
const deleted = collateral.split('\0')
  .filter((line) => line.startsWith(' D ') || line.startsWith('D  '))
  .map((line) => line.slice(3));
if (deleted.length) {
  console.error(`\n✗ not published: ${deleted.length} tracked file(s) outside this project are deleted`);
  for (const f of deleted.slice(0, 10)) console.error(`    ${f}`);
  if (deleted.length > 10) console.error(`    … and ${deleted.length - 10} more`);
  console.error('  These belong to the rest of the site. Restore them before publishing:');
  console.error("    git -C .. status --porcelain -z -- . ':(exclude)freekill' ':(exclude)freekill-src' \\");
  console.error("      | tr '\\0' '\\n' | grep '^ D ' | cut -c4- | tr '\\n' '\\0' | xargs -0 git -C .. checkout --");
  process.exit(1);
}

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
