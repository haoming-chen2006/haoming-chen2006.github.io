/**
 * Turning engine names into image URLs.
 *
 * A port of the lookup half of `Fk/Base/SkinBank.qml`. The path conventions are
 * the engine's, not ours:
 *
 *   portrait      packages/<ext>/image/generals/<name>.jpg
 *   avatar        packages/<ext>/image/generals/avatar/<name>.jpg
 *   card face     packages/<ext>/image/card/<name>.png
 *   delayed trick packages/<ext>/image/card/delayedTrick/<name>.png
 *   equip icon    packages/<ext>/image/card/equipIcon/<name>.png
 *   role/suit/…   image/photo/role/<role>.png, image/card/suit/<suit>.png
 *
 * Every lookup goes through the `AssetManifest` (contract/manifest.ts), so
 * Agent 4's content-hashed pipeline substitutes in with no change here. A miss
 * returns `undefined` and the component draws its own fallback — a missing
 * picture must never blank out a seat.
 */
import { assetIndex, type AssetManifest } from '../../contract/manifest';

export class Assets {
  private readonly index: ReadonlyMap<string, { href: string }>;
  private readonly base: string;
  private emojiCache?: readonly string[];

  constructor(manifest: AssetManifest) {
    this.index = assetIndex(manifest);
    this.base = manifest.base ?? '';
  }

  /** Engine-relative path -> URL, or undefined when the pipeline has no such file. */
  url(key: string): string | undefined {
    const entry = this.index.get(key);
    if (!entry) return undefined;
    return this.base + entry.href;
  }

  private first(...keys: readonly (string | undefined)[]): string | undefined {
    for (const k of keys) {
      if (!k) continue;
      const u = this.url(k);
      if (u) return u;
    }
    return undefined;
  }

  generalPortrait(name: string, extension?: string): string | undefined {
    return this.first(
      extension && `packages/${extension}/image/generals/${name}.jpg`,
      `packages/standard/image/generals/${name}.jpg`,
      `image/generals/${name}.jpg`,
    );
  }

  generalAvatar(name: string, extension?: string): string | undefined {
    return this.first(
      extension && `packages/${extension}/image/generals/avatar/${name}.jpg`,
      `packages/standard/image/generals/avatar/${name}.jpg`,
      this.generalPortraitKey(name, extension),
    );
  }

  private generalPortraitKey(name: string, extension?: string): string | undefined {
    return extension ? `packages/${extension}/image/generals/${name}.jpg` : undefined;
  }

  cardFace(name: string, extension?: string): string | undefined {
    return this.first(
      extension && `packages/${extension}/image/card/${name}.png`,
      `packages/standard_cards/image/card/${name}.png`,
      `packages/maneuvering/image/card/${name}.png`,
      'image/card/unknown.png',
    );
  }

  delayedTrick(name: string, extension?: string): string | undefined {
    return this.first(
      extension && `packages/${extension}/image/card/delayedTrick/${name}.png`,
      `packages/standard_cards/image/card/delayedTrick/${name}.png`,
      `packages/maneuvering/image/card/delayedTrick/${name}.png`,
      'image/card/delayedTrick/unknown.png',
    );
  }

  equipIcon(name: string, extension?: string): string | undefined {
    return this.first(
      extension && `packages/${extension}/image/card/equipIcon/${name}.png`,
      `packages/standard_cards/image/card/equipIcon/${name}.png`,
      `packages/maneuvering/image/card/equipIcon/${name}.png`,
      'image/card/equipIcon/unknown.png',
    );
  }

  cardBack(): string | undefined { return this.url('image/card/card-back.png'); }
  role(role: string): string | undefined { return this.first(`image/photo/role/${role}.png`, 'image/photo/role/unknown.png'); }
  suit(suit: string): string | undefined { return this.url(`image/card/suit/${suit}.png`); }
  rank(color: 'red' | 'black', n: number): string | undefined { return this.url(`image/card/number/${color}/${n}.png`); }
  photoBack(kingdom: string): string | undefined { return this.first(`image/photo/back/${kingdom}.png`, 'image/photo/back/unknown.png'); }
  netState(state: string): string | undefined { return this.url(`image/photo/state/${state}.png`); }
  death(role: string): string | undefined { return this.first(`image/photo/death/${role}.png`, 'image/photo/death/saveme.png'); }
  magatama(n: number, heg = false): string | undefined { return this.url(`image/photo/magatama/${n}${heg ? '-heg' : ''}.png`); }
  photo(name: string): string | undefined { return this.url(`image/photo/${name}.png`); }
  misc(name: string): string | undefined { return this.url(`image/misc/${name}.png`); }
  tableBackground(): string | undefined { return this.url('image/gamebg.jpg'); }

  /** A chat emoji. `{emoji12}` in a message is `image/emoji/12.png`. */
  emoji(id: string | number): string | undefined { return this.url(`image/emoji/${id}.png`); }

  /**
   * Every emoji this build shipped, in numeric order — the picker's contents.
   *
   * Read off the manifest rather than counted to a constant, so the offered set
   * is by construction the set that has artwork behind it. Scanned once and
   * kept: the manifest is thousands of entries and the answer never changes.
   */
  emojiIds(): readonly string[] {
    if (this.emojiCache) return this.emojiCache;
    const found: number[] = [];
    for (const key of this.index.keys()) {
      const m = /^image\/emoji\/([0-9]+)\.png$/.exec(key);
      if (m) found.push(Number(m[1]));
    }
    this.emojiCache = found.sort((a, b) => a - b).map(String);
    return this.emojiCache;
  }
}

/** `1`..`13` become `A`, `2`… `J`, `Q`, `K` on a card face. */
export function rankText(n: number | undefined): string {
  if (!n || n < 1) return '';
  return ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[n] ?? String(n);
}

export const SUIT_GLYPH: Readonly<Record<string, string>> = {
  spade: '♠', heart: '♥', club: '♣', diamond: '♦', nosuit: '',
};

export const SUIT_IS_RED: Readonly<Record<string, boolean>> = {
  spade: false, club: false, heart: true, diamond: true, nosuit: false,
};
