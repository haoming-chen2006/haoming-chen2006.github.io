/**
 * What the build promises, checked against the disk.
 *
 * These are the verification steps for tasks 4.5, 4.6 and 4.7: the asset
 * manifest validates and every path in it resolves, the Lua bundle is
 * byte-identical to the on-disk tree, and the shipped font covers every Han the
 * game uses — including 惇 (夏侯惇) and 骍 (紫骍), which the original LiShu face
 * was itself missing.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AssetManifestSchema, LuaManifestSchema } from '../src/contract/manifest';
import { buildBundle, ENGINE_ROOT } from './build-lua-bundle.mjs';
import { glyphSet } from './glyphset.mjs';
import { DIST } from './verify-dist.mjs';

const WEB_ROOT = join(import.meta.dirname, '..');
const PUBLIC = join(WEB_ROOT, 'public');

function walk(dir: string, rel: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(abs).isDirectory()) walk(abs, r, out);
    else if (r.endsWith('.lua')) out.push(r);
  }
  return out;
}

describe('lua bundle (4.7)', () => {
  it('matches the on-disk Lua tree exactly', async () => {
    const bundle = await buildBundle();

    // Walked independently of the builder, so a bug in the builder cannot hide
    // by also being in the expectation.
    const expected = new Map<string, string>();
    for (const rel of walk(join(ENGINE_ROOT, 'lua'), 'lua')) {
      expected.set(rel, readFileSync(join(ENGINE_ROOT, rel), 'utf8'));
    }
    for (const pkg of ['standard', 'standard_cards', 'maneuvering', 'test']) {
      for (const rel of walk(join(ENGINE_ROOT, 'packages', pkg), `packages/${pkg}`)) {
        expected.set(rel, readFileSync(join(ENGINE_ROOT, rel), 'utf8'));
      }
    }
    const overlayDir = join(WEB_ROOT, 'lua', 'web');
    if (existsSync(overlayDir)) {
      for (const rel of walk(overlayDir, 'lua/web')) {
        expected.set(rel, readFileSync(join(WEB_ROOT, rel), 'utf8'));
      }
    }

    expect(Object.keys(bundle).sort()).toEqual([...expected.keys()].sort());
    for (const [path, source] of expected) expect(bundle[path], path).toBe(source);
  });

  it('emits a manifest the contract accepts, describing the file it shipped', () => {
    const manifest = LuaManifestSchema.parse(
      JSON.parse(readFileSync(join(PUBLIC, 'lua-manifest.json'), 'utf8')),
    );
    const json = readFileSync(join(PUBLIC, 'lua-bundle.json'), 'utf8');
    const bundle = JSON.parse(json) as Record<string, string>;

    expect(Object.keys(bundle).length).toBe(manifest.files);
    expect(createHash('sha256').update(json).digest('hex').slice(0, 16)).toBe(manifest.bundleSha256_16);
    expect(bundle[manifest.entry]).toBeTruthy();
    for (const f of manifest.overlay) expect(bundle[f], f).toBeTruthy();
    // ModManager:loadPackages requires all three plus test, unconditionally.
    for (const p of ['standard', 'standard_cards', 'maneuvering', 'test']) {
      expect(manifest.packages).toContain(p);
    }
  });
});

describe('asset manifest (4.5)', () => {
  const manifest = AssetManifestSchema.parse(
    JSON.parse(readFileSync(join(PUBLIC, 'asset-manifest.json'), 'utf8')),
  );

  it('resolves every href it promises', () => {
    for (const e of manifest.entries) {
      expect(existsSync(join(PUBLIC, e.href)), `${e.key} -> ${e.href}`).toBe(true);
    }
  });

  it('keys assets by their engine path, so a LogEvent payload can look them up', () => {
    for (const e of manifest.entries) {
      expect(existsSync(join(ENGINE_ROOT, e.key)), e.key).toBe(true);
    }
  });

  it('excludes what v1 deliberately drops', () => {
    const keys = manifest.entries.map((e) => e.key);
    expect(keys.some((k) => k.startsWith('image/symbolic/'))).toBe(false); // 633 Adwaita SVGs
    expect(keys.some((k) => k.includes('/image/anim/'))).toBe(false);      // 15.6 MB of sprites
    expect(keys.some((k) => k.endsWith('.mp3'))).toBe(false);              // audio off by default
  });

  it('carries the content that the room and the overview actually need', () => {
    const keys = new Set(manifest.entries.map((e) => e.key));
    expect(keys.has('packages/standard/image/generals/caocao.jpg')).toBe(true);
    expect(keys.has('packages/standard_cards/image/card/slash.png')).toBe(true);
    expect(keys.has('image/card/card-back.png')).toBe(true);
    expect(manifest.base).toBe('/freekill/');
  });
});

describe('what GitHub Pages will actually serve', () => {
  /**
   * Pages runs Jekyll, and Jekyll drops any path segment beginning with an
   * underscore — silently. The file is in the commit, the push succeeds, the
   * server answers 404. Vite named a chunk `__vite-browser-external-<hash>.js`
   * and shipped a build whose engine could not load on the live site while
   * passing every local check. The build config strips the prefix now; this is
   * the assertion that says so out loud.
   */
  it('publishes no path Jekyll would refuse', () => {
    const walk = (dir: string, prefix = '', out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const rel = prefix ? `${prefix}/${name}` : name;
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) walk(abs, rel, out);
        else out.push(rel);
      }
      return out;
    };
    if (!existsSync(DIST)) return; // nothing published yet; `npm run build` makes one
    const refused = walk(DIST).filter((f) => f.split('/').some((seg) => seg.startsWith('_')));
    expect(refused, `GitHub Pages will 404 these: ${refused.join(', ')}`).toEqual([]);
  });
});

describe('fonts (4.6)', () => {
  const fonts = JSON.parse(readFileSync(join(PUBLIC, 'fonts', 'fonts.json'), 'utf8')) as {
    key: string; href: string; license: string; bytes: number;
    han: number; missing: string; missingHan: string;
  };

  it('ships an OFL face with its license beside it', () => {
    expect(existsSync(join(PUBLIC, fonts.href))).toBe(true);
    const license = readFileSync(join(PUBLIC, fonts.license), 'utf8');
    expect(license).toContain('SIL OPEN FONT LICENSE');
  });

  it('never ships the proprietary faces', () => {
    const shipped = readdirSync(join(PUBLIC, 'fonts')).join(' ').toLowerCase();
    for (const banned of ['fzlbgbk', 'fzle', 'simli']) expect(shipped).not.toContain(banned);
  });

  it('covers every Han the game uses, including the ones LiShu missed', () => {
    expect(fonts.missingHan).toBe('');
    const chars = glyphSet();
    for (const c of '惇骍毀釭飖髣髴黒') expect(chars.has(c), `glyph set should contain ${c}`).toBe(true);
    const han = [...chars].filter((c) => {
      const n = c.codePointAt(0)!;
      return n >= 0x4e00 && n <= 0x9fff;
    });
    // If the sources grew new Han, the committed subset is stale: rebuild it
    // rather than shipping tofu.
    expect(han.length, 'run `npm run build:fonts` — the glyph set has grown').toBeLessThanOrEqual(fonts.han);
  });

  it('is a rounding error next to the 25.84 MB it replaces', () => {
    expect(fonts.bytes).toBeLessThan(600 * 1024);
  });
});

describe('overview data (4.8)', () => {
  const data = JSON.parse(readFileSync(join(PUBLIC, 'overview.json'), 'utf8')) as {
    generals: { name: string; illustrator: string; skills: string[]; kingdom: string }[];
    cards: { name: string; copies: number }[];
    modes: { name: string }[];
    translations: Record<string, string>;
  };

  it('is the real standard pack, not a sample', () => {
    expect(data.generals.length).toBe(25);
    expect(data.generals.map((g) => g.name)).toContain('xiahoudun');
    expect(data.cards.map((c) => c.name)).toContain('slash');
    expect(data.modes.map((m) => m.name)).toContain('aaa_role_mode');
  });

  it('keeps the illustrator credits, which are the portraits only attribution', () => {
    expect(data.generals.every((g) => g.illustrator === 'KayaK')).toBe(true);
  });

  it('carries skill text for every general', () => {
    for (const g of data.generals) {
      for (const s of g.skills) {
        expect(data.translations[s], `${g.name}/${s} has no name`).toBeTruthy();
      }
    }
  });
});
