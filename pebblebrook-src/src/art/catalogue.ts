/**
 * The tile catalogue: where everything lives on the Kenney Roguelike/RPG sheet (`rpg.png`), plus
 * which things are drawn in code. Coordinates are [col, row] on a 16 px grid with a 1 px margin:
 * source pixel x = col * 17, y = row * 17. Verified visually with scripts/atlas_preview.html.
 *
 * Conventions
 *  - `TileRef` = [col, row] on rpg.png (spring/base colours). Seasonal variants are produced by
 *    recolouring the whole sheet at load (see atlas.ts), so one ref serves every season.
 *  - Autotile sets are 13-piece "blob" sets: the middle, four edges, four outer corners and four inner
 *    notches. atlas.ts composites them per 8×8 quadrant into all 256 neighbour masks.
 *  - Building pieces are addressed relative to a colour set's base column (`WALL_SET_COLS`).
 */

export type TileRef = [number, number];

export const SHEET = { tile: 16, margin: 1, cols: 57, rows: 31, width: 968, height: 526 } as const;

/** Neighbour mask bit order used everywhere in art/render (clockwise from north). */
export const N = 1, NE = 2, E = 4, SE = 8, S = 16, SW = 32, W = 64, NW = 128;

export interface AutotileSet {
  center: TileRef;
  top: TileRef; left: TileRef; right: TileRef; bottom: TileRef;
  tl: TileRef; tr: TileRef; bl: TileRef; br: TileRef;
  /** inner notches: the tile whose only foreign neighbour is the named diagonal */
  itl: TileRef; itr: TileRef; ibl: TileRef; ibr: TileRef;
  /** extra plain variants for the fully-surrounded case */
  plain?: TileRef[];
  /** the set carries its own background (water tiles include grass); false = transparent outside */
  opaque: boolean;
}

const set = (c: number, r: number, opts: Partial<AutotileSet> = {}): AutotileSet => ({
  // Kenney path blocks: rows r..r+2 are corners/edges, notches sit two columns to the left.
  center: [c + 3, r + 1], top: [c + 3, r], left: [c + 2, r + 1], right: [c + 4, r + 1], bottom: [c + 3, r + 2],
  tl: [c + 2, r], tr: [c + 4, r], bl: [c + 2, r + 2], br: [c + 4, r + 2],
  itl: [c + 1, r + 1], itr: [c, r + 1], ibl: [c + 1, r], ibr: [c, r],
  opaque: false,
  ...opts,
});

export const AUTOTILES = {
  /** lake/river water with a grassy shore (grass is painted into the tile) */
  water: {
    center: [3, 1], top: [3, 0], left: [2, 1], right: [4, 1], bottom: [3, 2],
    tl: [2, 0], tr: [4, 0], bl: [2, 2], br: [4, 2],
    itl: [1, 2], itr: [0, 2], ibl: [1, 1], ibr: [0, 1],
    plain: [[0, 0], [1, 0]], opaque: true,
  } as AutotileSet,
  /** water in a cut-stone rim (docks, the well pool) */
  pool: {
    center: [3, 4], top: [3, 3], left: [2, 4], right: [4, 4], bottom: [3, 5],
    tl: [2, 3], tr: [4, 3], bl: [2, 5], br: [4, 5],
    itl: [1, 4], itr: [0, 4], ibl: [1, 3], ibr: [0, 3],
    opaque: false,
  } as AutotileSet,
  dirt: set(5, 9),
  stone: set(5, 15),
  sand: set(5, 21),
  /** brown bordered block: farmland */
  farmland: { center: [1, 26], top: [1, 25], left: [0, 26], right: [2, 26], bottom: [1, 27], tl: [0, 25], tr: [2, 25], bl: [0, 27], br: [2, 27], itl: [1, 26], itr: [1, 26], ibl: [1, 26], ibr: [1, 26], opaque: true } as AutotileSet,
  /** rounded lush grass patch (meadow, tall grass) */
  meadow: { center: [3, 16], top: [3, 15], left: [2, 16], right: [4, 16], bottom: [3, 17], tl: [2, 15], tr: [4, 15], bl: [2, 17], br: [4, 17], itl: [3, 16], itr: [3, 16], ibl: [3, 16], ibr: [3, 16], opaque: false } as AutotileSet,
  /** fallen-leaf ground */
  leaves: { center: [3, 19], top: [3, 18], left: [2, 19], right: [4, 19], bottom: [3, 20], tl: [2, 18], tr: [4, 18], bl: [2, 20], br: [4, 20], itl: [3, 19], itr: [3, 19], ibl: [3, 19], ibr: [3, 19], opaque: false } as AutotileSet,
  /** purple flower field */
  flowerfield: { center: [3, 22], top: [3, 21], left: [2, 22], right: [4, 22], bottom: [3, 23], tl: [2, 21], tr: [4, 21], bl: [2, 23], br: [4, 23], itl: [3, 22], itr: [3, 22], ibl: [3, 22], ibr: [3, 22], opaque: false } as AutotileSet,
  /** white patch: snow drifts */
  snow: { center: [45, 26], top: [45, 25], left: [44, 26], right: [46, 26], bottom: [45, 27], tl: [44, 25], tr: [46, 25], bl: [44, 27], br: [46, 27], itl: [45, 26], itr: [45, 26], ibl: [45, 26], ibr: [45, 26], opaque: false } as AutotileSet,
} as const;

export type AutotileName = keyof typeof AUTOTILES;

/** Plain ground tiles (variants are picked by tileVariant / position hash). */
export const GROUND: Record<string, TileRef[]> = {
  grass: [[5, 0], [5, 1]],
  waterPlain: [[0, 0], [1, 0]],
  grassTufts: [[0, 15], [1, 15]],
  grassLight: [[0, 16], [1, 16]],
  grassStones: [[9, 1]],
  dirt: [[6, 0], [6, 1]],
  stone: [[7, 0], [7, 1]],
  cobble: [[9, 0]],
  sand: [[8, 0], [8, 1]],
  brick: [[5, 2], [5, 3]],
  brickGrey: [[6, 2], [6, 3]],
  brickBeige: [[7, 2], [7, 3]],
  planks: [[8, 2], [8, 3]],
  planksWide: [[9, 2], [9, 3]],
  floorWood: [[5, 4], [6, 4], [7, 4], [8, 4], [9, 4]],
  floorWood2: [[5, 5], [6, 5], [7, 5], [8, 5], [9, 5]],
  void: [[36, 8]],
};

/** Small ground details layered over grass. */
export const DETAIL: Record<string, TileRef[]> = {
  sprout: [[22, 10], [22, 11]],
  leaf: [[28, 10], [28, 11]],
  flowerRed: [[3, 7]],
  flowerWhite: [[3, 10]],
  flowerBlue: [[3, 13]],
  flowerSingleBlue: [[28, 9]],
  flowerSingleRed: [[29, 9]],
  flowerSinglePurple: [[30, 9]],
  flowerSingleWhite: [[31, 9]],
  mushroomRed: [[48, 2], [48, 3]],
  mushroomBrown: [[48, 4], [48, 5], [48, 6], [48, 7]],
  lilypad: [[26, 11]],
  lily: [[25, 11]],
  rockWaterBrown: [[54, 23], [55, 23], [56, 23]],
  rockWaterGrey: [[54, 24], [55, 24], [56, 24]],
  fallenLeaves: [[41, 23], [42, 23], [43, 23], [44, 23], [41, 24], [42, 24], [43, 24], [44, 24]],
};

/** Trees: 1-tile and 2-tile-tall versions. `top` sits one tile above the object's tile. */
export interface TreeRef { single: TileRef; top: TileRef; bottom: TileRef; autumn?: { single: TileRef; top: TileRef; bottom: TileRef } }
export const TREES: Record<string, TreeRef> = {
  oak: { single: [13, 9], top: [13, 9], bottom: [15, 11], autumn: { single: [14, 9], top: [14, 9], bottom: [14, 11] } },
  pine: { single: [13, 10], top: [16, 10], bottom: [16, 11], autumn: { single: [14, 10], top: [17, 10], bottom: [17, 11] } },
  dark: { single: [13, 11], top: [15, 10], bottom: [15, 11], autumn: { single: [14, 11], top: [14, 11], bottom: [14, 11] } },
  teal: { single: [18, 9], top: [18, 10], bottom: [18, 11] },
  apple: { single: [23, 9], top: [23, 9], bottom: [15, 11] },
  appleFull: { single: [23, 11], top: [23, 11], bottom: [15, 11] },
  dead: { single: [27, 9], top: [27, 10], bottom: [27, 11] },
};

export const BUSHES: Record<string, TileRef> = {
  green: [19, 9], orange: [20, 9], dark: [21, 9], small: [25, 9], heart: [26, 9],
  berries: [24, 9], berriesBlue: [24, 10], berriesMixed: [24, 11], yellowFlower: [25, 10], orangeFruit: [26, 10],
  hedgeTop: [19, 10], hedgeBottom: [19, 11], hedgeDarkTop: [21, 10], hedgeDarkBottom: [21, 11],
  cactus: [22, 9],
};

/** Free-standing props addressed by name (single tiles unless noted). */
export const PROPS: Record<string, TileRef> = {
  stump: [13, 8], campfire: [15, 8], campfireLow: [14, 8],
  anvil: [15, 0], counter: [16, 0], counterLong: [17, 0], table: [18, 0],
  signpost: [19, 0], signLeft: [20, 0], signRight: [21, 0], signWall: [15, 19],
  barrel: [22, 0], barrelBanded: [23, 0], jarGrey: [24, 0], jarDark: [25, 0], jarBanded: [26, 0], jar: [27, 0],
  shelfBread: [28, 0], shelfGoods: [29, 0], shelfPlates: [30, 0], shelfBottles: [31, 0],
  bedHeadOrange: [12, 1], bedFootOrange: [12, 2], bedHeadWhite: [13, 1], bedFootWhite: [13, 2],
  bedHeadGreen: [12, 2], bedFootGreen: [12, 3],
  chair: [19, 2], chairRed: [20, 2], stool: [18, 5], bench: [18, 4], smallTable: [18, 6],
  bookshelfYellow: [15, 6], bookshelfGreen: [16, 6], bookshelfRed: [17, 6], bookshelfFull: [43, 12], bookshelfMixed: [45, 12],
  torch: [17, 7], torchWall: [18, 7], candelabra: [19, 8], candle: [19, 7],
  mirror: [23, 7], clock: [26, 8], bucket: [26, 7], chest: [28, 7], chestGold: [14, 7], chestOrange: [13, 7],
  sackFlour: [26, 2], sackGrain: [25, 2], sackOpen: [27, 2],
  pot: [14, 6], deadSapling: [14, 5],
  fireplace: [13, 0], fireplaceLit: [14, 0], hearth: [54, 7],
  awningOrangeTop: [10, 0], awningOrangeMid: [10, 1], awningOrangeBottom: [10, 2],
  awningGreenTop: [11, 0], awningGreenMid: [11, 1], awningGreenBottom: [11, 2],
  tentGreenTL: [46, 10], tentGreenTR: [47, 10], tentGreenBL: [46, 11], tentGreenBR: [47, 11],
  tentBeigeTL: [48, 10], tentBeigeTR: [49, 10], tentBeigeBL: [48, 11], tentBeigeBR: [49, 11],
  statueTop: [50, 10], statueBottom: [50, 11], orb: [50, 9], skull: [49, 9],
  graveCross: [51, 10], graveCrossOrnate: [52, 10], graveCrossPlain: [53, 10], graveCrossWood: [53, 9],
  gravestone: [51, 9], gravestoneRound: [52, 9], graveSlab: [51, 11], graveSlab2: [52, 11], graveSlab3: [53, 11],
  lanternLit: [51, 17], lanternDark: [51, 16], lanternLit2: [52, 17], lanternDark2: [52, 16],
  rodPost: [53, 16], rodLine: [53, 17], boat: [53, 18], logs: [53, 22], logAxe: [53, 21], logSplit: [53, 20], logRound: [53, 19],
  crate: [45, 16], crateSmall: [46, 16], crateGrey: [47, 16], crateGreyBig: [49, 16], box: [45, 17], boxBig: [47, 17],
  cartWood: [49, 19], cartGrey: [50, 19], cartOre: [51, 20], cartGold: [49, 21], cartCoal: [49, 22],
  shovel: [41, 16], pickaxeGround: [42, 16], axeGround: [43, 16], toolbox: [44, 16],
  rockBrownSmall: [56, 19], rockBrownMed: [55, 19], rockBrownBig: [54, 19],
  rockBrownMossSmall: [56, 20], rockBrownMossMed: [55, 20], rockBrownMossBig: [54, 20],
  rockGreySmall: [56, 21], rockGreyMed: [55, 21], rockGreyBig: [54, 21],
  rockGreyMossSmall: [56, 22], rockGreyMossMed: [55, 22], rockGreyMossBig: [54, 22],
  boulderBrown: [41, 10], boulderGrey: [42, 10],
  goldSmall: [41, 11], goldMed: [42, 11], goldBig: [43, 11], goldPile: [43, 10], silverPile: [44, 10], silverStack: [44, 11],
  coins: [45, 10], coinStack: [45, 11],
  gemPile: [32, 9], gemTeal: [33, 9], gemPurple: [34, 9], nuggetGold: [35, 9], nuggetCopper: [36, 9],
  banner: [49, 0], bannerBlue: [49, 3], bannerGreen: [49, 6], bannerCross: [50, 0],
  pennant: [51, 2], pennantBlue: [51, 5], pennantGreen: [51, 8],
  window: [40, 0], windowGrey: [41, 0], windowLit: [40, 6], windowGreyLit: [41, 6], windowRound: [44, 0], windowArch: [44, 2],
  windowArchLit: [44, 4], windowSmall: [46, 4], windowSmallLit: [46, 5],
  doorArch: [32, 0], doorArchWindow: [33, 0], doorGreyArch: [32, 2], doorGreyArchWindow: [33, 2],
  doorTeal: [36, 3], doorSquare: [38, 0], doorSquareWindow: [39, 0], doorPlank: [38, 2], doorOpen: [36, 0],
  fenceH: [48, 23], fenceHLeftEnd: [51, 23], fenceHRightEnd: [50, 23], fenceHMid: [52, 23], fenceHPost: [53, 23],
  fenceV: [39, 8], fencePosts: [45, 23], gate: [46, 23], fenceCornerTL: [37, 8], fenceCornerT: [38, 8],
  fenceLowH: [48, 24], fenceLowLeftEnd: [51, 24], fenceLowRightEnd: [50, 24], fenceLowMid: [52, 24], gateLow: [46, 24],
  ladder: [10, 4], shelf: [10, 5], shelfItems: [11, 4], shelfBottlesSmall: [12, 5], shelfGold: [13, 4],
  railH: [43, 20], railV: [44, 18], railCross: [43, 19],
  water: [0, 0],
};

/** Item icons that come straight off the sheet; everything else is drawn by icons.ts. */
export const ITEM_SPRITES: Record<string, TileRef> = {
  mushroom: [48, 2], wildflower: [29, 9], herbs: [28, 10], honey: [56, 11], egg: [54, 13], tea: [55, 15], coffee: [54, 17],
  tonic: [54, 12], ale: [54, 11], cider: [55, 11],
  book: [46, 15], poetry: [49, 15], map_fragment: [44, 15],
  gem: [33, 9], gold_ore: [35, 9], copper_ore: [36, 9],
  wood: [53, 22], stone: [55, 21], lantern: [51, 17], chair: [19, 2], bookshelf: [15, 6], birdhouse: [26, 8], candle: [19, 7],
  toy_boat: [53, 18], pie_tin: [55, 16], fertiliser: [25, 2], flour: [26, 2], stew: [56, 14], fish_soup: [55, 17],
  roast_veg: [54, 16], omelette: [56, 17], trout: [56, 12], perch: [56, 12], carp: [56, 12], salmon: [56, 12], catfish: [56, 12],
  barrel: [22, 0], crate: [45, 16],
};

/** Building colour sets: base column of the 7-column block (rows 12..24). */
export const WALL_SET_COLS = { beige: 13, grey: 20, bluegrey: 27, brown: 34 } as const;
export type WallSet = keyof typeof WALL_SET_COLS;
/** wall style index (describeTile().style / tileVariant & 3) → colour set */
export const WALL_STYLES: WallSet[] = ['beige', 'brown', 'grey', 'bluegrey'];
/**
 * roof colour index → colour set. Each set's pitched-roof pieces (rows 21..24, cols 0..3) have their
 * own colour: brown set = brown, bluegrey set = slate, grey set = orange, beige set = cream. Indexed
 * so that a building with only a `style` gets a contrasting pair: beige+brown, brown+slate,
 * grey+orange, bluegrey+cream.
 */
export const ROOF_COLOURS: WallSet[] = ['brown', 'bluegrey', 'grey', 'beige'];
export const ROOF_COLOUR_NAMES = ['brown', 'slate', 'orange', 'cream'] as const;

/** Pieces inside a colour set, relative to its base column. */
export const BUILDING_PIECE: Record<string, [number, number]> = {
  wallPlain: [4, 15], wallPlain2: [5, 15], wallPlain3: [6, 15],
  wallColumns: [0, 15], wallColumns2: [1, 15],
  wallBand: [4, 16], wallBand2: [5, 16],
  wallLogs: [0, 17], wallLogs2: [1, 17],
  wallStone: [4, 18], wallStone2: [5, 18], wallStone3: [6, 18],
  wallCracked: [3, 19], wallCracked2: [4, 19],
  wallBase: [4, 23], wallBase2: [5, 23],
  wallTop: [4, 21], wallTop2: [5, 21],
  pillar: [0, 19], pillarBase: [0, 20],
  archL: [4, 17], archT: [5, 17], archR: [6, 17],
  roofSlopeL: [0, 21], roofSlopeR: [1, 21], roofShallowL: [2, 21], roofShallowR: [3, 21],
  /** pitched-roof body (same colour as the slopes) */
  roofBody: [0, 22], roofBody2: [1, 22],
  /** the lighter flat block (cols 4..6, rows 21..23) */
  roofFlat: [4, 21], roofFlat2: [5, 21], roofFlat3: [6, 21],
  roofFlatLine: [3, 22], roofHalf: [2, 22],
  roofTrimL: [0, 23], roofTrimR: [1, 23], roofValleyL: [2, 23], roofValleyR: [3, 23],
  roofBottom: [4, 23], roofBottom2: [5, 23],
  roofPeak: [0, 24], roofRidge: [1, 24], roofGableBottom: [2, 24],
};

/** Doors and windows per wall set. */
export const DOOR_FOR_SET: Record<WallSet, TileRef> = { beige: [32, 0], brown: [38, 0], grey: [32, 2], bluegrey: [36, 3] };
export const WINDOW_FOR_SET: Record<WallSet, { day: TileRef; night: TileRef }> = {
  beige: { day: [40, 0], night: [40, 6] }, brown: { day: [40, 0], night: [40, 6] },
  grey: { day: [41, 0], night: [41, 6] }, bluegrey: { day: [41, 0], night: [41, 6] },
};

/** Villager emote glyphs and UI symbols are drawn in code (emotes.ts). */
export const EMOTES = ['happy', 'sad', 'angry', 'love', 'question', 'idea', 'sleepy', 'music', 'sweat', 'exclaim', 'sick'] as const;

/** Region of the sheet holding ground/terrain tiles: gets the "ground" seasonal recolour. */
export const GROUND_REGIONS: { c0: number; r0: number; c1: number; r1: number }[] = [
  { c0: 0, r0: 0, c1: 9, r1: 2 },     // water shores (rows 0..2), grass, dirt, stone, sand
  { c0: 0, r0: 6, c1: 4, r1: 14 },    // flower beds on grass
  { c0: 0, r0: 15, c1: 4, r1: 17 },   // grass variants + meadow patch
];
/** Regions holding foliage (trees, bushes, hedges): "foliage" recolour. Everything else keeps base colours. */
export const FOLIAGE_REGIONS: { c0: number; r0: number; c1: number; r1: number }[] = [
  { c0: 13, r0: 9, c1: 26, r1: 11 },
  { c0: 28, r0: 10, c1: 28, r1: 11 },
  { c0: 54, r0: 20, c1: 56, r1: 20 },
  { c0: 54, r0: 22, c1: 56, r1: 22 },
];
