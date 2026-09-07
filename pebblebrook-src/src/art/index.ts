// AGENT C owns this module. Keep the export names.
import type { Art, SpriteRect } from '../core/app.ts';
import type { ObjectKind, Season } from '../core/types.ts';
import { loadAtlas, type Atlas } from './atlas.ts';
import { buildCharacter } from './characters.ts';
import { cropSprite } from './crops.ts';
import { emoteSprite } from './emotes.ts';
import { itemSprite, uiIcon } from './icons.ts';
import { objectSprite } from './objects.ts';
import { tileSprite } from './tiles.ts';

export type { Atlas } from './atlas.ts';
export { N, NE, E, SE, S, SW, W, NW } from './catalogue.ts';
export { buildCharacter, FRAME_H, FRAME_W } from './characters.ts';
export { cropSprite } from './crops.ts';
export { emoteSprite } from './emotes.ts';
export { objectSprite, animalSprite } from './objects.ts';
export { tileSprite, buildingPiece, doorSprite, windowSprite, fenceSprite, bridgeSprite } from './tiles.ts';
export { makeCanvas, ctx2d } from './pixel.ts';

/** The Art implementation carries the atlas so the renderer can reach baked canvases directly. */
export interface ArtImpl extends Art { atlas: Atlas; base: string }

export async function loadArt(base: string): Promise<Art> {
  const root = base.endsWith('/') ? base : base + '/';
  const atlas = await loadAtlas(root + 'assets/kenney/rpg.png');
  const art: ArtImpl = {
    ready: true,
    atlas,
    base: root,
    tile: (kind, variant, season, neighbours) => tileSprite(atlas, kind, variant, season, neighbours ?? 255, 0),
    object: (kind: ObjectKind, data, season: Season) => objectSprite(atlas, kind, data, season, 0),
    item: (id) => itemSprite(atlas, id),
    character: (look, profession) => buildCharacter(look, profession),
    emote: (kind) => emoteSprite(kind),
    icon: (kind, id, size) => uiIcon(atlas, kind, id, size),
  };
  return art;
}

/** convenience for other modules: a crop stage sprite (also reachable through art.object for plots) */
export const cropStage = (id: string, stage: number): SpriteRect => cropSprite(id, stage);
