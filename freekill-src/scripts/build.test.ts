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
import { EN_US } from '../src/i18n/engine';
import { buildBundle, ENGINE_ROOT, PACKAGES, WEB_PACKAGES } from './build-lua-bundle.mjs';
import { rootFor } from './build-assets.mjs';
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
    for (const pkg of PACKAGES) {
      for (const rel of walk(join(ENGINE_ROOT, 'packages', pkg), `packages/${pkg}`)) {
        expected.set(rel, readFileSync(join(ENGINE_ROOT, rel), 'utf8'));
      }
    }
    // Site-rooted packages — this repo's own `webmodes` and the six mirrored
    // rosters — mount at the same `packages/<name>` prefix from a different
    // root, which is exactly the thing a walker can get wrong.
    for (const pkg of WEB_PACKAGES) {
      for (const rel of walk(join(WEB_ROOT, 'packages', pkg), `packages/${pkg}`)) {
        expected.set(rel, readFileSync(join(WEB_ROOT, rel), 'utf8'));
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
    // The mobile roster and the skill library it requires. `utility` is not
    // optional: packages/mobile/**/*.lua requires `packages.utility.utility`.
    for (const p of ['utility', 'mobile']) expect(manifest.packages).toContain(p);
    // This repo's own game modes, mounted from the site tree, not the mirror.
    expect(manifest.packages).toContain('webmodes');
    expect(bundle['packages/webmodes/init.lua']).toBeTruthy();
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

  /**
   * The key is the engine-relative path a runtime `LogEvent` payload names, and
   * it stays that shape whichever disk the build read the bytes from: the six
   * mirrored rosters live under `<site>/packages/`, everything else under the
   * upstream checkout. `rootFor` is the build's own answer to that question, so
   * asking it here checks the mapping the build actually used rather than a
   * second copy of it that could drift.
   */
  it('keys assets by their engine path, so a LogEvent payload can look them up', () => {
    for (const e of manifest.entries) {
      expect(existsSync(join(rootFor(e.key), e.key)), e.key).toBe(true);
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
    // 743 KB, up from 653 KB, up from 338 KB. Each step is a roster growing:
    // the mobile pack took the Han the build can render from 1,458 to 2,800,
    // and the six mirrored rosters took it to 3,178. The subset has to cover
    // all of it or the general list shows tofu, and 90 KB of woff2 is a far
    // better trade than a name nobody can read. Harvesting only the translation
    // tables instead of the whole Lua tree would save 122 Han - not worth the
    // risk of missing one.
    expect(fonts.bytes).toBeLessThan(800 * 1024);
  });
});

describe('overview data (4.8)', () => {
  const data = JSON.parse(readFileSync(join(PUBLIC, 'overview.json'), 'utf8')) as {
    generals: { name: string; pack: string; extension: string; illustrator: string;
      skills: string[]; kingdom: string }[];
    translationsEn?: Record<string, string>;
    cards: { name: string; pack: string; copies: number }[];
    modes: { name: string }[];
    translations: Record<string, string>;
  };
  const byExtension = (ext: string) => data.generals.filter((g) => g.extension === ext);

  it('is the real content, not a sample', () => {
    expect(byExtension('standard')).toHaveLength(25);
    expect(data.generals.map((g) => g.name)).toContain('xiahoudun');
    expect(data.cards.map((c) => c.name)).toContain('slash');
    expect(data.modes.map((m) => m.name)).toContain('aaa_role_mode');
  });

  it('ships the mobile roster, minus the generals whose skills are not here', () => {
    // 294 visible in the engine; 15 still hidden by `lua/web/roster.lua` because
    // they cannot be played correctly here. That was 45 before the six mirrored
    // rosters arrived: 30 of them named a skill that lives in an extension pack
    // this checkout did not have, and `roster.lua` put them back by itself when
    // the skill appeared - the tables it consults are keyed by the missing
    // thing, not by general name, and are read at boot.
    //
    // Seating a general whose skill silently does nothing is a rules
    // divergence, which is worse than a shorter roster; that is why the rest
    // stay out. `m_ex__caiwenji` is the canonical example of one that came back
    // (〖断肠〗 now exists, from `shzl`), and `m_ex__weiyan` of one that has not
    // (〖狂骨〗 is in `ol`, which is not mirrored).
    expect(byExtension('mobile')).toHaveLength(279);
    expect(data.generals.map((g) => g.name)).toContain('sunru');
    // Ten sub-packages share one extension directory, which is why the payload
    // carries `extension` separately from `pack`.
    expect(new Set(byExtension('mobile').map((g) => g.pack)).size).toBeGreaterThanOrEqual(9);
    expect(data.generals.map((g) => g.name)).toContain('m_ex__caiwenji');
    expect(data.generals.map((g) => g.name)).not.toContain('m_ex__weiyan');
  });

  /**
   * The six rosters mirrored under `<site>/packages/`, pinned in
   * `packages/provenance.json`. Counted per extension because that is the
   * directory portraits resolve against, and asserted rather than summed so a
   * pack that silently stops loading - one bad `require` takes a whole package
   * down, as `gamemode` does - fails here instead of quietly shrinking the pool.
   */
  it('ships the six mirrored rosters', () => {
    expect(byExtension('standard_ex')).toHaveLength(31);
    expect(byExtension('shzl')).toHaveLength(63);
    expect(byExtension('yj')).toHaveLength(93);
    expect(byExtension('sp')).toHaveLength(53);
    expect(byExtension('mougong')).toHaveLength(48);
    expect(byExtension('jsrg')).toHaveLength(79);
    expect(data.generals).toHaveLength(671);
    // 界刘备 and 灵雎 load fine and are deliberately withheld: 〖仁德〗 and
    // 〖焚心〗 call Room methods this engine lacks, which throws inside the
    // skill where the engine swallows it. See roster.test.ts.
    expect(data.generals.map((g) => g.name)).not.toContain('ex__liubei');
    expect(data.generals.map((g) => g.name)).not.toContain('lingju');
  });

  it('resolves a portrait for every general but the four upstream never drew', () => {
    // The lookup key is the *extension* directory. Resolving by `pack` instead
    // silently blanks 254 of 279 tiles - the art is in the manifest, under a
    // path nothing asks for - so this is pinned rather than eyeballed.
    const assets = AssetManifestSchema.parse(
      JSON.parse(readFileSync(join(PUBLIC, 'asset-manifest.json'), 'utf8')),
    );
    const keys = new Set(assets.entries.map((e) => e.key));
    const blank = data.generals.filter(
      (g) => !keys.has(`packages/${g.extension}/image/generals/${g.name}.jpg`),
    );
    // These six ship no portrait in their pack's image/generals at all. The
    // grid draws its 3/4 placeholder for them, which is the honest answer.
    expect(blank.map((g) => g.name).sort()).toEqual([
      'js_re__qiaoxuan', 'js_re__sunjian',
      'm_shi__chenjiao', 'm_shi__wangchang', 'm_sp__yujin', 'mobile__yangqiu',
    ]);
  });

  it('carries only the upstream English that src/i18n/engine does not already have', () => {
    // The second lookup tier in `Overview.tsx`. Any key `EN_US` already covers
    // is dead weight on the critical path, and the page would never read it
    // anyway because `engineTr` checks EN_US first.
    //
    // This is the assertion that catches the failure mode that actually
    // happened: `build-overview.mjs` cannot import `src/i18n/engine/index.ts`
    // under plain node, so it composes the same set itself. When that
    // composition was a hand-written list of tables, adding `modes.ts` silently
    // took a whole table out of the filter. The script globs the directory now;
    // this checks the result against the real thing.
    //
    // The tier is EMPTY now, and that is the point rather than a regression. It
    // used to hold the ~18 keys where upstream's `packages/mobile/i18n/en_US.lua`
    // stub happened to write real English — mobile general names, mostly, out of
    // the 22 English values in its 452 entries. `engine/mobile.ts` translated
    // that pack, inheriting those 18 verbatim, so there is no longer a key the
    // overview can learn from upstream that the engine layer does not have. If a
    // future package ships English we have not written, this goes non-empty
    // again and the `redundant` check above still guards it.
    const en = data.translationsEn ?? {};
    const redundant = Object.keys(en).filter((k) => k in EN_US);
    expect(redundant, `already covered by src/i18n/engine: ${redundant.slice(0, 10).join(', ')}`)
      .toEqual([]);
    expect(EN_US.caochun).toBe('Cao Chun');
  });

  it('keeps the illustrator credits, which are the standard portraits only attribution', () => {
    // Only the standard pack carries `illustrator:` keys; the mobile art ships
    // with no credit of its own, and inventing one would be worse than none.
    expect(byExtension('standard').every((g) => g.illustrator === 'KayaK')).toBe(true);
  });

  it('carries skill text for every general', () => {
    for (const g of data.generals) {
      for (const s of g.skills) {
        expect(data.translations[s], `${g.name}/${s} has no name`).toBeTruthy();
      }
    }
  });
});
