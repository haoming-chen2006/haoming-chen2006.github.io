/**
 * 创建武将, with nothing but the tab: validate, compile, boot, keep.
 *
 * The same four steps the dev back end runs, in the same order and stopping at
 * the same places, because every later step is meaningless if an earlier one
 * failed and a compile error is a far better message than whatever the engine
 * would say about the file it produced. The difference is only where the
 * result goes: the back end writes `packages/custom/generals/<id>.lua` so a
 * deploy can ship it; this writes the browser's own list
 * (`shell/customHeroes.ts`) so a room can carry it.
 */
import { CompileError, compileHero } from '../compile/index.ts';
import { formatHeadless } from '../compile/probe.ts';
import { normalizeSpec, validateSpec, type HeroSpec, type SpecError } from '../spec.ts';
import { MAX_ART_CHARS, upsertSavedHero, type SavedHero } from '../../shell/customHeroes.ts';
import { probeInBrowser } from './probe.ts';

export interface HeroImage {
  mime: string;
  base64: string;
}

export interface BrowserBuild {
  ok: boolean;
  spec: HeroSpec;
  general?: string;
  lua?: string;
  errors: SpecError[];
  warnings: string[];
  test?: { ok: boolean; fired: boolean | null; log: string[] };
  /** The saved record, when `save` was asked for and the hero built. */
  saved?: SavedHero;
}

export interface BuildOptions {
  /** Put it in 我的武将. The agent loop passes false until the final round. */
  save?: boolean;
  image?: HeroImage | null;
  /** Test seam: the probe, when the network is not available. */
  probe?: (spec: HeroSpec, lua: string) => ReturnType<typeof probeInBrowser>;
  /** Test seam: the portrait shrinker, which needs a canvas. */
  shrink?: (image: HeroImage) => Promise<string | undefined>;
}

export async function buildInBrowser(raw: HeroSpec, opts: BuildOptions = {}): Promise<BrowserBuild> {
  const spec = normalizeSpec(raw);
  const { ok, errors } = validateSpec(spec);
  if (!ok) return { ok: false, spec, errors, warnings: [] };

  let lua: string;
  let warnings: string[];
  try {
    ({ lua, warnings } = compileHero(spec));
  } catch (e) {
    if (!(e instanceof CompileError)) throw e;
    return { ok: false, spec, errors: [{ path: e.path, message: e.message }], warnings: [] };
  }

  const probe = opts.probe ?? probeInBrowser;
  const result = await probe(spec, lua);
  const test = { ok: result.ok, fired: result.drove?.fired ?? null, log: formatHeadless(result) };

  const out: BrowserBuild = { ok: true, spec, general: spec.id, lua, errors: [], warnings, test };
  if (opts.save) {
    const art = opts.image ? await (opts.shrink ?? shrinkPortrait)(opts.image) : undefined;
    const saved: SavedHero = {
      id: spec.id,
      name: spec.name,
      title: spec.title,
      kingdom: spec.kingdom,
      lua,
      spec: spec as unknown as Record<string, unknown>,
      test,
      at: new Date().toISOString(),
      ...(art ? { art } : {}),
    };
    upsertSavedHero(saved);
    out.saved = saved;
  }
  return out;
}

/** Portrait box on a seat is 3:4; this is a small one of those. */
const ART_W = 160;
const ART_H = 224;

/**
 * A portrait small enough to ride in a room's settings row and in every
 * resync envelope: cover-cropped to 3:4, JPEG, and only kept under
 * `MAX_ART_CHARS`. A picture too big to shrink under that is left out rather
 * than sent — the seat then draws the name's first character, as it does for
 * any general without art, and the game is unaffected.
 */
export async function shrinkPortrait(image: HeroImage): Promise<string | undefined> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return undefined;
  try {
    const blob = await (await fetch(`data:${image.mime};base64,${image.base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = ART_W;
    canvas.height = ART_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const scale = Math.max(ART_W / bitmap.width, ART_H / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (ART_W - w) / 2, (ART_H - h) / 2, w, h);
    bitmap.close?.();
    for (const quality of [0.62, 0.48, 0.36]) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length <= MAX_ART_CHARS) return url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
