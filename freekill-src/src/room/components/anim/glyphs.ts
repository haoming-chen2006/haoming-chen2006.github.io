/**
 * The objects. One entry per thing a card is actually about.
 *
 * Every glyph is a drawing in its own box (see `ink.ts`), so it is
 * resolution-free, tintable from a custom property, and costs a few hundred
 * bytes of integers rather than a sprite sheet. The register is 水墨 — a few
 * bold marks with weight in them — because that is what survives being drawn at
 * the width of a seat photo, and because these are Three Kingdoms objects and a
 * wire-frame icon would be the wrong voice for them.
 *
 * TWO WAYS TO DRAW. `ink` is brush centre-lines: `x, y, halfWidth` repeated,
 * for anything gestural — a leg, a mane, a tassel, a rib. `fill` is a raw SVG
 * outline, for anything with a hard definite shape — an axe bit, a shield body,
 * a peach. Using a brush for a hard shape produces a blob and using an outline
 * for a gesture produces a dead line; the two together are the whole toolkit.
 * `lit`/`litFill` are the same pair painted in the highlight colour, and `thin`
 * is constant-width detail SVG's own stroke draws better than a taper would.
 *
 * BOXES ARE ~250 UNITS. Every glyph is authored on roughly that scale and is
 * scaled by the effect, so a half-width of 6 always means the same visual
 * weight whatever the seat size. Bigger numbers are not more precise.
 *
 * WHAT MAKES A GOOD ONE. It has to be identifiable with the colour taken away
 * and at the size of a thumbnail. That rules out detail and rewards a single
 * strong outline plus one detail that is the object's NAME — the crescent on
 * the guandao, the snake-wave on the serpent lance, the magazine box on the
 * repeating crossbow, the blaze on 的卢's forehead.
 */
import type { Glyph, Line } from './ink';
import { ringLine } from './ink';

/* ------------------------------------------------------------------ horses */

/**
 * 奔马 — the flying gallop, facing right.
 *
 * All four feet off the ground, neck stretched, tail streaming: the pose the
 * Han bronze 馬踏飛燕 is in and the one every ink horse since has copied. It is
 * also the only pose that reads as SPEED rather than as a horse standing about,
 * which matters because five of the seven horse cards are about distance.
 *
 * The mane and tail are `lit` so the palette can put the individual horse in
 * them — 赤兔 burns, 爪黄飛電 is white lightning, 绝影 is smoke.
 */
export const HORSE: Glyph = {
  box: [258, 194],
  ink: [
    // barrel: croup to chest. Thinner than instinct says — a fat barrel eats
    // the legs and the whole animal turns into a bean.
    [88, 90, 15, 122, 82, 17, 154, 86, 14, 173, 97, 9],
    // neck, rising to the poll
    [162, 84, 13, 187, 62, 10, 205, 45, 7, 214, 34, 5],
    // near foreleg, thrown forward. Stops short of the muzzle: the two used to
    // meet and the horse grew a fifth limb out of its chin.
    [167, 101, 7, 187, 120, 5, 206, 133, 4, 220, 139, 3],
    // off foreleg, folded under
    [157, 103, 6, 158, 129, 5, 142, 146, 4, 129, 153, 2],
    // near hind leg, thrown back
    [92, 102, 9, 72, 130, 6, 48, 151, 4, 24, 158, 3],
    // off hind leg
    [104, 102, 8, 92, 134, 5, 74, 160, 4, 60, 176, 2],
  ],
  fill: [
    // the head, as an outline: a wedge with a jaw. As a brush stroke the muzzle
    // and the ear ran together into a spike and the horse read as a bird.
    'M206 30 L226 34 L244 58 L250 76 L242 82 L230 66 L214 58 L202 46 Z',
    // the ear, clear of the poll
    'M204 28 L210 6 L216 26 Z',
  ],
  lit: [
    // mane along the crest of the neck
    [214, 28, 6, 196, 38, 8, 176, 54, 7, 158, 72, 4],
    // tail: both wisps sweep UP and back, so they cannot be mistaken for the
    // hind legs they used to sit alongside
    [86, 86, 10, 62, 62, 8, 38, 40, 5, 12, 18, 0],
    [86, 92, 7, 60, 78, 5, 34, 68, 3, 8, 60, 0],
  ],
};

/** A white blaze down the face, for 的卢 — the mark that made it unlucky and
 *  the only thing that tells one horse from another in silhouette. */
export const BLAZE: readonly string[] = ['M212 38 L224 42 L240 66 L233 70 L219 50 Z'];

/* ----------------------------------------------------------------- weapons */

/**
 * 青龙偃月刀 — the crescent-moon blade on a nine-foot pole.
 *
 * 偃月 is "the reclining moon" and the blade is exactly that: a broad crescent
 * whose belly is the widest part and whose tip comes to nothing. The back-barb
 * behind the spine and the dragon's mouth at the collar are the two details
 * that stop it being a generic polearm; the barb is the one you can still see
 * at thumbnail size, so it is the one that is big.
 */
export const GUANDAO: Glyph = {
  box: [214, 250],
  ink: [
    // haft, butt at lower left up to the collar
    [24, 244, 7, 68, 178, 8, 108, 116, 8, 134, 78, 7],
  ],
  fill: [
    // The crescent: narrow at the collar, widest a third of the way up,
    // finishing at a point. Written as explicit cubics rather than a pair of
    // SVG arcs because with arcs the sweep flags decide whether you get a
    // crescent or a lens, and the first draft got a lens.
    'M130 96 C 98 54 118 12 190 2 C 168 32 156 60 152 98 Z',
    // 回钩 — the back-barb behind the spine, sharpened like a spear point. It
    // is the detail that survives at thumbnail size, so it is not subtle, and
    // it is attached to the spine rather than floating beside it.
    'M160 44 C 186 42 200 56 198 78 C 184 64 172 52 154 50 Z',
    // 龙吞口 — the dragon swallowing the haft at the collar
    'M116 84 L152 106 L142 124 L106 102 Z',
  ],
  litFill: [
    // the cutting edge: a bright rind along the CONVEX side. Down the middle it
    // read as a leaf's midrib, which is exactly what it looked like.
    'M130 96 C 98 54 118 12 190 2 C 130 22 112 58 142 92 Z',
  ],
  thin: [
    // the red horsehair tassel at the collar
    { d: 'M118 112 L104 142 M130 120 L124 150', w: 5 },
  ],
};

/**
 * 丈八蛇矛 — the eighteen-foot serpent lance.
 *
 * The whole name is the head: a straight spear is a stick, and the flame-cut
 * blade waving twice on its way to the point is 蛇. Drawn as an outline because
 * the wave has to have edges — as a brush stroke it reads as a scribble.
 */
export const SERPENT_LANCE: Glyph = {
  box: [186, 254],
  ink: [
    // shaft, thickening into the collar so the head is joined to it
    [34, 250, 7, 68, 184, 8, 100, 122, 9, 114, 96, 10],
    // The blade: a brush whose centre-line snakes twice. The wave has to be
    // wider than the stroke is thick or it disappears into its own width — at
    // 16 wide with a 24 wave the first draft read as a thin squiggle.
    [114, 100, 13, 146, 72, 14, 100, 44, 12, 138, 18, 7, 150, 0, 0],
  ],
  lit: [
    // 红缨 — the horsehair tassel, hanging. Splayed to the sides it read as a
    // bow tie, which is not the note 丈八蛇矛 is going for.
    [108, 108, 5, 102, 134, 4, 98, 160, 0],
    [120, 108, 5, 124, 134, 4, 128, 160, 0],
  ],
};

/**
 * 方天画戟 — Lü Bu's halberd: a straight spearhead with a crescent moon-blade
 * branching off EACH side.
 *
 * The two side-blades are what makes a 戟 a 戟, and they are also the card's
 * rule — the last 杀 picks up two extra targets. Both crescents point the same
 * way a moon does, horns forward, so the silhouette is a trident that has been
 * given a curve, not a fork.
 */
export const HALBERD: Glyph = {
  box: [244, 254],
  ink: [
    [122, 250, 7, 122, 176, 8, 122, 116, 8, 122, 84, 7],
  ],
  fill: [
    // spearhead
    'M122 100 L138 56 L122 0 L106 56 Z',
    // 小枝 — the two branches. With them the head reads as the character 井 in
    // silhouette, which is the only thing that tells a 戟 from a spear, and
    // they are also the card: two extra targets, one per branch.
    'M84 50 L118 50 L118 72 L84 72 Z',
    'M126 50 L160 50 L160 72 L126 72 Z',
    // the crescents, horns up and down, hollow side to the shaft. Pushed well
    // out from the haft: at the first spacing the contours merged and the head
    // came out as one solid disc.
    'M84 10 C 28 28 22 88 84 110 C 58 82 62 38 84 10 Z',
    'M160 10 C 216 28 222 88 160 110 C 186 82 182 38 160 10 Z',
  ],
  litFill: [
    'M122 100 L138 56 L122 0 L118 54 Z',
  ],
  lit: [
    // 红缨 — the tassel under the head
    [114, 112, 6, 100, 138, 4, 90, 166, 0],
    [130, 112, 6, 144, 138, 4, 154, 166, 0],
  ],
};

/**
 * 贯石斧 — "the axe that goes through stone".
 *
 * WEIGHT is the whole reading. The bit is a deep flare with the edge arced past
 * the horns, the poll behind the haft is heavy enough to balance it, and the
 * haft is short — a long haft turns an axe into a polearm, and the card is
 * about brute follow-through, not reach.
 */
export const AXE: Glyph = {
  box: [214, 250],
  ink: [
    [66, 246, 9, 78, 178, 9, 88, 112, 9, 92, 76, 8],
  ],
  fill: [
    // the bit: a deep flare with the edge arced well past both horns
    'M92 58 L150 44 C192 74 200 136 160 178 L92 162 Z',
    // the poll — a plain hammer block, so the haft has something to balance
    'M88 78 L52 86 L52 138 L88 146 Z',
  ],
  litFill: [
    // the edge only. The first draft lit the whole bit and the axe read as a
    // pale wedge with a dark stripe through it.
    'M150 44 C192 74 200 136 160 178 L146 174 C182 134 178 78 138 50 Z',
  ],
  thin: [
    { d: 'M100 92 L132 88 M100 132 L132 136', w: 4 },
  ],
};

/**
 * 古锭刀 — Sun Jian's ancient blade. A 环首刀: straight, single-edged, no guard
 * worth the name, and a ring cast into the pommel.
 *
 * It is the oldest-looking weapon in the deck and is drawn as such — no
 * ornament at all, and the ring is the only thing that identifies it.
 */
export const ANCIENT_DAO: Glyph = {
  box: [150, 254],
  ink: [],
  fill: [
    // blade: spine on the left, edge on the right, clipped point
    'M62 196 L62 40 L74 8 L92 34 L92 196 Z',
    // grip
    'M66 200 L88 200 L86 232 L68 232 Z',
    // the ring pommel
    'M77 232 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0 Z'
    + 'M77 232 m-10 0 a10 10 0 1 1 20 0 a10 10 0 1 1 -20 0 Z',
    // the small collar
    'M54 194 L100 194 L100 206 L54 206 Z',
  ],
  litFill: [
    // one edge lit, which is what says single-edged
    'M92 196 L92 34 L74 8 L82 40 L82 196 Z',
  ],
};

/**
 * 寒冰剑 — a straight double-edged jian, growing frost.
 *
 * The card PREVENTS the damage and takes cards instead, so the blade does not
 * cut — it freezes. The crystals are the glyph and the edge is deliberately
 * dull; a bright edge would say the opposite of what the card does.
 */
export const ICE_JIAN: Glyph = {
  box: [190, 258],
  ink: [],
  fill: [
    // Icicles off the blade — long, thin, and deliberately UNEVEN. An even ring
    // of short spikes is a maple leaf, which is exactly what the first two
    // drafts were; ice reads from the raggedness.
    'M86 104 L8 58 L84 124 Z',
    'M104 104 L178 78 L106 124 Z',
    'M86 138 L26 168 L84 158 Z',
    'M104 138 L172 122 L106 160 Z',
    'M88 62 L44 12 L92 84 Z',
    'M102 66 L150 34 L106 86 Z',
    'M88 176 L52 202 L90 190 Z',
    'M104 176 L146 194 L104 190 Z',
  ],
  litFill: [
    // the jian, bright, riding on top of the frost
    'M84 190 L84 46 L95 10 L106 46 L106 190 Z',
    'M87 196 L103 196 L101 232 L89 232 Z',
    'M60 188 L130 188 L130 200 L60 200 Z',
    'M95 232 L110 244 L95 252 L80 244 Z',
  ],
};

/**
 * 青釭剑 — Cao Cao's blade, the one Zhao Yun took at Changban. It "cuts iron
 * like mud", so the profile is narrow, the point is long, and the edge is lit
 * end to end. The card ignores armour: nothing about it is broad.
 */
export const QINGGANG: Glyph = {
  box: [160, 254],
  ink: [],
  fill: [
    'M70 190 L70 40 L80 2 L90 40 L90 190 Z',
    'M74 196 L86 196 L84 230 L76 230 Z',
    'M40 186 L120 186 C116 196 116 200 120 208 L40 208 C44 200 44 196 40 186 Z',
    'M80 230 L94 242 L80 252 L66 242 Z',
  ],
  litFill: [
    // one line down the fuller, and a hot tip. Both edges lit read as a mirror;
    // a blade that cuts armour like mud wants an edge, not a shine.
    'M78 186 L78 44 L80 6 L82 44 L82 186 Z',
  ],
  thin: [
    // 青釭 — the two gold characters inlaid on the grip. It is exactly how Zhao
    // Yun knew what he had taken off Xiahou En at Changban.
    { d: 'M76 204 L86 204 M76 210 L86 210 M74 218 L88 218 M81 214 L81 224', w: 3 },
  ],
};

/**
 * 雌雄双股剑 — the paired swords, crossed.
 *
 * Two of everything and deliberately NOT identical: the 雌 is a little shorter
 * and a little narrower than the 雄. The card's rule turns on the target being
 * of the opposite sex, and a matched pair would say twins rather than a couple.
 */
export const TWIN_JIAN: Glyph = {
  box: [242, 242],
  fill: [
    // 雄 — up and to the right, the longer one
    'M40 214 L48 200 L196 34 L206 22 L200 44 L64 208 L52 220 Z',
    'M32 226 L44 214 L56 226 L44 238 Z',
    'M74 176 L112 208 L104 218 L66 186 Z',
    // 雌 — up and to the left, shorter and finer
    'M204 216 L196 204 L62 56 L54 44 L74 54 L206 200 L214 212 Z',
    'M212 226 L200 216 L190 228 L202 238 Z',
    'M164 182 L128 210 L136 220 L172 192 Z',
  ],
  ink: [],
  litFill: [
    'M196 34 L206 22 L200 44 L192 52 Z',
    'M62 56 L54 44 L74 54 L82 62 Z',
  ],
};

/**
 * 麒麟弓 — the qilin bow, at full draw.
 *
 * A Chinese composite bow, so the limbs curve back on themselves and the ears
 * kick FORWARD at the tips — that reverse curve is the difference between this
 * and a longbow, and it is visible at any size. The card shoots the horse out
 * from under its target, so the arrow is drawn low and level.
 */
export const QILIN_BOW: Glyph = {
  box: [244, 244],
  ink: [
    // the limbs
    [70, 20, 6, 40, 58, 10, 32, 122, 11, 44, 186, 10, 74, 224, 6],
    // the recurved ears
    [70, 20, 6, 92, 12, 5, 100, 26, 3],
    [74, 224, 6, 96, 232, 5, 104, 218, 3],
  ],
  litFill: [
    // the arrow, nocked and level
    'M56 116 L196 116 L196 108 L226 122 L196 136 L196 128 L56 128 Z',
  ],
  thin: [
    // the string, pulled to the nock
    { d: 'M96 22 L56 122 L100 226', w: 4 },
    // the fletching
    { d: 'M60 108 L36 122 L60 136 M76 110 L54 122 L76 134', w: 4 },
  ],
};

/**
 * 诸葛连弩 — the repeating crossbow.
 *
 * The magazine box on top of the stock is the whole invention and the whole
 * card, so it is the biggest thing in the drawing and it is not subtle. Three
 * bolts leaving at once say "no limit" without a number on screen.
 */
export const REPEATER: Glyph = {
  box: [254, 190],
  ink: [
    // the prod, across the front of the stock
    [56, 22, 6, 34, 60, 10, 34, 128, 10, 58, 166, 6],
  ],
  fill: [
    // the stock, running back to the right
    'M46 84 L214 96 L246 112 L246 124 L206 118 L46 106 Z',
    // the magazine box, sitting proud on top
    'M74 44 L166 50 L166 88 L74 82 Z',
    // the lever
    'M166 62 L214 44 L220 54 L172 76 Z',
  ],
  litFill: [
    // three bolts in the air
    'M104 26 L214 18 L214 12 L238 20 L214 30 L214 24 L104 32 Z',
    'M96 8 L200 2 L200 -2 L220 4 L200 12 L200 6 L96 14 Z',
    'M110 44 L204 40 L204 36 L222 42 L204 50 L204 46 L110 50 Z',
  ],
  thin: [
    { d: 'M56 24 L104 96 L58 164', w: 4 },
    { d: 'M92 50 L92 84 M110 52 L110 86 M128 54 L128 86 M146 56 L146 88', w: 3 },
  ],
};

/**
 * 元戎精械弩 — Ma Jun's rebuilt repeater. The same weapon with the mechanism
 * showing: a ratchet wheel on the side and a longer magazine. See the note on
 * the `ex_` tier at the foot of this file.
 */
export const EX_REPEATER: Glyph = {
  box: [254, 190],
  ink: REPEATER.ink,
  fill: [...(REPEATER.fill ?? []), 'M188 96 L218 96 L218 120 L188 120 Z'],
  litFill: REPEATER.litFill,
  thin: [
    ...(REPEATER.thin ?? []),
    // the ratchet: a cogged wheel where the lever meets the stock
    { d: cog(190, 78, 22, 9), w: 4 },
  ],
};

/**
 * 朱雀羽扇 — the Vermilion Bird's feather fan.
 *
 * Ribs radiating from a handle, and the leading edge alight, because the card's
 * only job is turning a plain 杀 into a 火杀 and nothing else about a fan would
 * say that. Drawn as a real fan — a solid leaf between the ribs — rather than as
 * bare ribs, which read as a rake.
 */
export const FEATHER_FAN: Glyph = (() => {
  // Seven feathers radiating from the binding, each a brush stroke that starts
  // at a point, swells, and comes back to a point — which is what a feather is.
  // Drawn as one domed leaf with a toothed edge it read, unmistakably, as an
  // umbrella; the fix was to stop drawing the fan and start drawing the plumes.
  const bx = 122, by = 208, len = 176, half = 62 * Math.PI / 180;
  const ink: Line[] = [];
  const lit: Line[] = [];
  for (let i = 0; i < 7; i += 1) {
    const a = -half + (i / 6) * half * 2;
    const at = (t: number) => [
      Math.round(bx + Math.sin(a) * len * t),
      Math.round(by - Math.cos(a) * len * t),
    ];
    const [x1, y1] = at(0.34), [x2, y2] = at(0.66), [x3, y3] = at(1);
    ink.push([bx, by, 3, x1, y1, 16, x2, y2, 20, x3, y3, 2]);
    // the outer third, alight
    lit.push([x2, y2, 15, Math.round((x2 + x3) / 2), Math.round((y2 + y3) / 2), 12, x3, y3, 1]);
  }
  return {
    box: [252, 250],
    ink: [...ink, [122, 246, 10, 122, 210, 10]],
    lit,
    // the binding that gathers the quills
    fill: ['M100 196 L144 196 L140 224 L104 224 Z'],
  };
})();

/**
 * 玄剑 — the dark blade. A jian in shadow: a heavy, plain, black-lacquer sword
 * with one line of light down the fuller and a wrapped grip. The card turns a
 * whole suit into 杀, so what has to read is "a sword, and nothing else about
 * it" — the anti-ornament in a deck full of famous names.
 */
export const DARK_JIAN: Glyph = {
  box: [170, 254],
  ink: [],
  fill: [
    // Broader and blunter than 青釭剑 on purpose: side by side they must not be
    // the same silhouette, and this one is a knight-errant's working blade
    // rather than a treasure.
    'M56 188 L56 40 L84 6 L112 40 L112 188 Z',
    'M68 198 L100 198 L98 238 L70 238 Z',
    'M28 186 L140 186 L140 204 L28 204 Z',
  ],
  litFill: [
    // one thin line down the fuller and nothing else. The blade is black
    // lacquer; the highlight is all you are meant to be able to see.
    'M82 178 L82 46 L84 26 L86 46 L86 178 Z',
  ],
  thin: [
    // the wrapped grip, corded rather than cast
    { d: 'M70 208 L98 214 M70 218 L98 224 M70 228 L98 234', w: 5 },
  ],
};

/**
 * 霹雳车 — the traction trebuchet Liu Ye built for Cao Cao at Guandu.
 *
 * The arm past vertical and the stone already leaving the sling is the moment;
 * an arm at rest is a crane. The card strips a whole equipment area, so what has
 * to read is the size of the thing being thrown.
 */
export const CATAPULT: Glyph = {
  box: [254, 210],
  ink: [
    // the throwing arm, released
    [56, 176, 10, 96, 104, 9, 142, 42, 7, 172, 14, 5],
    // the A-frame and the bed
    [26, 200, 10, 70, 122, 9],
    [110, 200, 10, 74, 122, 9],
    [14, 202, 9, 124, 202, 9],
    // the haul ropes trailing from the short arm
    [56, 176, 4, 30, 168, 3, 8, 174, 0],
  ],
  litFill: [
    // the sling, and the stone
    'M170 18 C192 22 210 34 222 52 L212 60 C202 44 188 34 168 30 Z',
    'M232 70 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 Z',
  ],
  thin: [
    { d: 'M54 174 L28 198 M54 174 L106 198', w: 5 },
  ],
};

/**
 * 大攻车 / 渠冲 — the covered ram on wheels.
 *
 * Blunt on purpose. It has a durability counter, which is a thing being worn
 * down, so the silhouette is heavy and square with nothing sharp on it, and the
 * ram head coming out of the front is a log with an iron cap, not a point.
 */
export const SIEGE_RAM: Glyph = {
  box: [254, 196],
  ink: [],
  fill: [
    // the roof, hipped and overhanging
    'M14 74 L100 30 L186 74 L186 90 L14 90 Z',
    // the body
    'M32 90 L168 90 L168 148 L32 148 Z',
    // the ram, out of the mouth
    'M168 106 L232 106 L232 132 L168 132 Z',
    'M228 100 L252 100 L252 138 L228 138 Z',
  ],
  litFill: [
    'M14 74 L100 30 L186 74 L172 74 L100 44 L28 74 Z',
  ],
  thin: [
    { d: 'M62 170 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0'
      + ' M140 170 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', w: 7 },
    { d: 'M52 100 L52 140 M84 100 L84 140 M116 100 L116 140 M148 100 L148 140', w: 4 },
  ],
};

/* ------------------------------------------------------------------ armour */

/**
 * 八卦 — the trigram wheel.
 *
 * The bars ARE the glyph, so they are drawn rather than suggested: eight
 * stations, three bars each, broken or whole, around a taiji. `order` is the
 * arrangement, which is the only difference between 八卦阵 and 先天八卦阵 and a
 * real one — see `LATER_HEAVEN` and `EARLIER_HEAVEN`.
 */
export function trigramWheel(order: readonly number[]): Glyph {
  const cx = 128, cy = 128, inner = 64, step = 20;
  const fill: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    // Station 0 is at the top and they run clockwise, which is how every 八卦
    // laid in a courtyard is oriented.
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const ux = Math.cos(a), uy = Math.sin(a);
    const vx = -uy, vy = ux;
    const code = order[i];
    for (let bar = 0; bar < 3; bar += 1) {
      // Bar 0 is the trigram's LOWEST line, and a trigram is read from the
      // bottom up with the bottom toward the centre. Getting this inverted
      // silently draws a different figure, which is why it is spelled out.
      const r = inner + bar * step;
      const half = 30 + bar * 2;
      const th = 6.5;
      const px = cx + ux * r, py = cy + uy * r;
      const bit = (code >> bar) & 1;
      if (bit) {
        fill.push(bar3(px, py, vx, vy, ux, uy, half, half * 0.3, th));
        fill.push(bar3(px, py, vx, vy, ux, uy, -half * 0.3, -half, th));
      } else {
        fill.push(bar3(px, py, vx, vy, ux, uy, half, -half, th));
      }
    }
  }
  return {
    box: [256, 256],
    ink: [ringLine(cx, cy, 46, 4)],
    fill,
    litFill: [
      // the taiji: the yang lobe, as one filled shape
      'M128 84 A22 22 0 0 1 128 128 A22 22 0 0 0 128 172 A44 44 0 0 0 128 84 Z',
      'M128 106 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z',
    ],
    thin: [
      { d: 'M128 150 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0', w: 6 },
    ],
  };
}

/** One bar of a trigram, as a rectangle across the radius. */
function bar3(
  px: number, py: number, vx: number, vy: number, ux: number, uy: number,
  t0: number, t1: number, th: number,
): string {
  const p = (t: number, s: number) => `${Math.round(px + vx * t + ux * th * s)} ${Math.round(py + vy * t + uy * th * s)}`;
  return `M${p(t0, -1)} L${p(t1, -1)} L${p(t1, 1)} L${p(t0, 1)} Z`;
}

/**
 * A trigram as three bits, LOWEST line first. 0 = solid 陽爻, 1 = broken 陰爻.
 *
 *   ☰ 乾 qian  solid  solid  solid   = 0
 *   ☱ 兌 dui   solid  solid  broken  = 4
 *   ☲ 離 li    solid  broken solid   = 2
 *   ☳ 震 zhen  solid  broken broken  = 6
 *   ☴ 巽 xun   broken solid  solid   = 1
 *   ☵ 坎 kan   broken solid  broken  = 5
 *   ☶ 艮 gen   broken broken solid   = 3
 *   ☷ 坤 kun   broken broken broken  = 7
 */
const QIAN = 0, DUI = 4, LI = 2, ZHEN = 6, XUN = 1, KAN = 5, GEN = 3, KUN = 7;

/** 後天八卦 (King Wen), clockwise from the top: 離 坤 兌 乾 坎 艮 震 巽. An
 *  asymmetric cycle — fire over water, and 乾/坤 pushed out to the corners. */
export const LATER_HEAVEN: readonly number[] = [LI, KUN, DUI, QIAN, KAN, GEN, ZHEN, XUN];

/** 先天八卦 (Fu Xi), clockwise from the top: 乾 巽 坎 艮 坤 震 離 兌. Every pair
 *  across the circle inverts line for line — three solid bars crowning the top
 *  and three broken anchoring the bottom — which is why the ex- card gets it:
 *  it is visibly the closed, complete arrangement. */
export const EARLIER_HEAVEN: readonly number[] = [QIAN, XUN, KAN, GEN, KUN, ZHEN, LI, DUI];

/**
 * 仁王盾 — a round lacquer shield with the wrathful guardian at the boss.
 *
 * 仁王 are the two 金剛力士 at a temple gate, and the one this card is about is
 * 吽形 — the one with his mouth CLAMPED SHUT, who keeps evil out. So the mask
 * is a scowl with the jaw closed, not a roar, and the card stops black 杀 dead.
 * Round rather than kite-shaped: Chinese shields of the period are 藤牌, round,
 * with a pushed-out boss carrying a beast face.
 */
export const GUARDIAN_SHIELD: Glyph = {
  box: [244, 244],
  ink: [],
  rings: [ringLine(122, 122, 110, 10), ringLine(122, 122, 84, 5)],
  fill: [
    // The brows: outer end HIGH, inner end LOW, so they converge downward at
    // the bridge. The first draft had them the other way up and the guardian
    // looked worried rather than furious — the single most load-bearing pair of
    // coordinates in the drawing.
    'M44 76 L110 110 L104 132 L48 104 Z',
    'M200 76 L134 110 L140 132 L196 104 Z',
    // 吽形 — the one whose mouth is CLAMPED SHUT, who keeps evil out. That is
    // the whole card: black 杀 do not get through the gate.
    'M68 176 L122 166 L176 176 L176 192 L122 182 L68 192 Z',
    'M112 126 L132 126 L140 162 L104 162 Z',
  ],
  litFill: [
    // the eyes, glaring out from under the brows
    'M58 108 L104 126 L98 148 L62 140 Z',
    'M186 108 L140 126 L146 148 L182 140 Z',
  ],
  thin: [
    // the rivets around the rim of the lacquer field
    { d: studs(122, 122, 97, 10, 5), w: 5 },
    // the fangs at the corners of the shut mouth
    { d: 'M78 192 L84 206 L92 192 M166 192 L160 206 L152 192', w: 5 },
  ],
};

/**
 * 金刚杵 — the five-pronged vajra, for 仁王金刚盾.
 *
 * 金剛 is the adamantine thunderbolt: "so hard it shatters everything and is
 * shattered by nothing", which is exactly what an armour that voids black AND
 * ♥ 杀 is claiming. The 五股杵 has four outer prongs curling in around a
 * straight central one at each end, and that five-pointed head is the whole
 * silhouette.
 */
export const VAJRA: Glyph = {
  box: [136, 254],
  ink: [
    // the outer prongs, curling in to meet the centre
    [30, 60, 6, 20, 34, 5, 40, 14, 3, 60, 4, 2],
    [106, 60, 6, 116, 34, 5, 96, 14, 3, 76, 4, 2],
    [30, 194, 6, 20, 220, 5, 40, 240, 3, 60, 250, 2],
    [106, 194, 6, 116, 220, 5, 96, 240, 3, 76, 250, 2],
  ],
  fill: [
    // the grip, waisted in the middle
    'M56 96 L80 96 L80 158 L56 158 Z',
    'M50 84 L86 84 L86 100 L50 100 Z',
    'M50 154 L86 154 L86 170 L50 170 Z',
    // the lotus knops the prongs spring from
    'M44 62 L92 62 L86 84 L50 84 Z',
    'M44 192 L92 192 L86 170 L50 170 Z',
    // the central prongs
    'M68 62 L76 34 L68 0 L60 34 Z',
    'M68 192 L76 220 L68 254 L60 220 Z',
  ],
  litFill: [
    'M68 62 L72 34 L68 0 L64 34 Z',
    'M68 192 L72 220 L68 254 L64 220 Z',
  ],
};

/**
 * 藤甲 — rattan armour.
 *
 * The WEAVE is the glyph. 三国演义 gives the recipe — red rattan soaked in oil
 * and sun-dried a dozen times over — and the finished piece is a coarse
 * basketwork cuirass, springy, hollow, and light enough to float. It is also
 * exactly why it burns, which is the other half of the card.
 */
export const RATTAN: Glyph = {
  box: [230, 250],
  ink: [],
  fill: [
    // A SOLID cuirass. The first draft was a hollow outline and read as a
    // birdcage: the weave has to sit on a body, not stand in for one.
    'M40 44 L74 14 C94 30 136 30 156 14 L190 44'
    + ' C200 86 202 126 194 164 C190 202 180 230 168 246'
    + ' L62 246 C50 230 40 202 36 164 C28 126 30 86 40 44 Z',
    // the shoulder straps
    'M74 8 L92 30 L74 40 L58 20 Z',
    'M156 8 L138 30 L156 40 L172 20 Z',
  ],
  lit: [
    // three courses of cane picked out, so the weave has a light and a dark
    [42, 96, 7, 80, 86, 7, 115, 98, 7, 150, 86, 7, 188, 96, 7],
    [42, 158, 7, 80, 148, 7, 115, 160, 7, 150, 148, 7, 188, 158, 7],
    [48, 220, 7, 82, 210, 7, 115, 222, 7, 148, 210, 7, 182, 220, 7],
  ],
  cut: [
    // The weave itself, cut into the body. As light lines ON the body it read
    // as chevrons floating over a shield; as grooves it reads as basketwork,
    // which is the whole of what 藤甲 is.
    { d: 'M38 68 C 76 56 154 56 192 68 M37 126 C 76 114 154 114 193 126'
      + ' M40 190 C 78 178 152 178 190 190', w: 6 },
    { d: 'M66 40 L58 240 M92 34 L88 244 M115 32 L115 246 M138 34 L142 244 M164 40 L172 240', w: 5 },
  ],
};

/**
 * 白银狮子 — the lion helm and its 護心鏡.
 *
 * Ma Chao's 獅盔獸帶，銀甲白袍. The convex heart-guard mirror is not decoration:
 * Chinese armour sources say it is domed precisely to SPREAD the force of a
 * blow, which is word for word what the card does — every wound capped at one.
 * So the mirror is as big as the mask and sits under it.
 */
export const LION_HELM: Glyph = {
  box: [252, 244],
  ink: [],
  fill: [
    // Eleven broad locks, pointing OUTWARD and flicked clockwise at the tip.
    // Thin ones made a gear; ones that curled inward made a chrysanthemum with
    // a face in the middle of it.
    ...maneLocks(124, 112, 78, 11),
    // the face, big enough to survive the mane around it
    'M60 106 C60 52 88 22 124 22 C160 22 188 52 188 106'
    + ' C188 152 160 184 124 184 C88 184 60 152 60 106 Z',
    // the muzzle
    'M92 134 C102 162 113 176 124 176 C135 176 146 162 156 134'
    + ' C146 118 135 112 124 112 C113 112 102 118 92 134 Z',
  ],
  litFill: [
    // the eyes, under brows that converge downward at the bridge
    'M70 76 L116 102 L110 128 L74 116 Z',
    'M178 76 L132 102 L138 128 L174 116 Z',
  ],
  cut: [
    // the muzzle line, and the fangs at the corners of the jaw
    { d: 'M124 138 L124 162', w: 6 },
    { d: 'M110 168 L113 188 L120 170 M138 168 L135 188 L128 170', w: 5 },
  ],
};

/* ------------------------------------------------------------------ others */

/**
 * 六龙骖驾 — the six dragons of the sun-chariot, abreast.
 *
 * 「日乘車駕以六龍，羲和御之」, and 周禮's 天子駕六 — six horses is the ritual
 * mark of the Son of Heaven, which is why the card's X counts the Kings on the
 * table. The silhouette must be the FAN OF SIX, wider than it is tall: one
 * dragon is a different card entirely.
 */
export const SIX_DRAGONS: Glyph = (() => {
  const ink: Line[] = [];
  const fill: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const x = 32 + i * 41;
    // Alternating rise, so six necks read as six rather than as a comb.
    const y = i % 2 === 0 ? 0 : -18;
    ink.push([x, 190, 9, x - 8, 146 + y, 9, x + 8, 104 + y, 8, x - 2, 74 + y, 7]);
    // the beard under the jaw, and the horn swept back over the skull
    ink.push([x + 2, 84 + y, 4, x + 18, 86 + y, 3, x + 24, 98 + y, 0]);
    ink.push([x - 8, 66 + y, 4, x - 26, 48 + y, 1]);
    // The head as an outline: a long snout with a lower jaw under it. As brush
    // strokes the six of them read as a row of hooks.
    fill.push(`M${x - 12} ${74 + y} L${x + 4} ${58 + y} L${x + 26} ${62 + y}`
      + ` L${x + 32} ${74 + y} L${x + 14} ${78 + y} L${x + 22} ${86 + y}`
      + ` L${x + 2} ${88 + y} L${x - 10} ${84 + y} Z`);
  }
  return {
    box: [270, 214],
    ink,
    fill,
    lit: [
      // the yoke the whole team pulls against
      [12, 186, 8, 136, 198, 9, 258, 186, 8],
    ],
  };
})();

/**
 * A lion's mane, as flame-shaped locks around the face.
 *
 * Thirteen, not a hundred: the first draft used enough locks to make a
 * sunburst, and at seat size a sunburst is a gear, not a lion. Each lock leaves
 * the head, widens, and flicks clockwise to a point.
 */
function maneLocks(cx: number, cy: number, r: number, n: number): string[] {
  const out: string[] = [];
  const at = (a: number, rr: number) =>
    `${Math.round(cx + Math.cos(a) * rr)} ${Math.round(cy + Math.sin(a) * rr)}`;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const w = Math.PI / n;
    // A lock is a flame: a wide base on the skull, a tip flicked clockwise.
    out.push(`M${at(a - w, r * 0.62)} C ${at(a - w * 0.8, r * 1.04)} ${at(a - w * 0.3, r * 1.3)}`
      + ` ${at(a + w * 0.24, r * 1.46)} C ${at(a + w * 0.5, r * 1.14)} ${at(a + w * 0.9, r * 0.98)}`
      + ` ${at(a + w, r * 0.62)} Z`);
  }
  return out;
}

/** A cogged wheel, for the `ex_` tier's mechanism. */
function cog(cx: number, cy: number, r: number, teeth: number): string {
  let d = '';
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * Math.PI * 2;
    d += `M${Math.round(cx + Math.cos(a) * r * 0.72)} ${Math.round(cy + Math.sin(a) * r * 0.72)}`
      + ` L${Math.round(cx + Math.cos(a) * r)} ${Math.round(cy + Math.sin(a) * r)}`;
  }
  return `${d}M${cx} ${cy} m${-Math.round(r * 0.62)} 0 a${Math.round(r * 0.62)} ${Math.round(r * 0.62)} 0 1 0 ${Math.round(r * 1.24)} 0 a${Math.round(r * 0.62)} ${Math.round(r * 0.62)} 0 1 0 ${-Math.round(r * 1.24)} 0`;
}

/** Evenly spaced dots on a circle — shield rivets, a seal's studs. */
function studs(cx: number, cy: number, r: number, n: number, dot: number): string {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    d += `M${x} ${y} m${-dot} 0 a${dot} ${dot} 0 1 0 ${dot * 2} 0 a${dot} ${dot} 0 1 0 ${-dot * 2} 0`;
  }
  return d;
}

/* ------------------------------------------------- basics and the tricks */

/**
 * 桃 — the peach of immortality, 蟠桃.
 *
 * Not a heart and not an apple: a peach has a CLEFT at the top, a shoulder that
 * leans, and a soft point at the bottom, and the leaf is what stops the
 * silhouette being a generic fruit. It is also the only card in the deck that
 * gives life back, so it is drawn soft where everything else is drawn sharp.
 */
export const PEACH: Glyph = {
  box: [236, 250],
  ink: [
    // the stem
    [126, 50, 6, 134, 26, 4, 148, 12, 2],
  ],
  fill: [
    'M116 244 C 54 214 16 162 16 116 C 16 68 50 36 86 36 C 100 36 111 43 116 54'
    + ' C 121 43 132 36 146 36 C 182 36 216 68 216 116 C 216 162 178 214 116 244 Z',
    // the leaf
    'M136 44 C 166 8 206 2 232 12 C 218 46 180 60 144 52 Z',
  ],
  litFill: [
    // the blush on the sunward cheek
    'M60 84 C 44 108 42 142 54 172 C 34 140 34 104 48 76 Z',
  ],
  cut: [
    // the cleft, which is the one line that makes it a peach
    { d: 'M116 54 C 112 104 112 168 118 226', w: 6 },
    { d: 'M150 24 L212 16', w: 4 },
  ],
};

/** 桃花 — the five-petal blossom, for 桃园结义. Three of them is the oath. */
export const BLOSSOM: Glyph = (() => {
  const fill: string[] = [];
  const cx = 118, cy = 118;
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * 108, py = cy + Math.sin(a) * 108;
    const lx = cx + Math.cos(a - 0.78) * 76, ly = cy + Math.sin(a - 0.78) * 76;
    const rx = cx + Math.cos(a + 0.78) * 76, ry = cy + Math.sin(a + 0.78) * 76;
    // A petal with a notched tip, which is what a peach blossom has and a plum
    // blossom does not.
    fill.push(`M${cx} ${cy} C ${Math.round(lx)} ${Math.round(ly)} ${Math.round(px - Math.cos(a + 1.6) * 36)} ${Math.round(py - Math.sin(a + 1.6) * 36)} ${Math.round(px)} ${Math.round(py)}`
      + ` C ${Math.round(px + Math.cos(a + 1.6) * 36)} ${Math.round(py + Math.sin(a + 1.6) * 36)} ${Math.round(rx)} ${Math.round(ry)} ${cx} ${cy} Z`);
  }
  return {
    box: [236, 236],
    ink: [],
    fill,
    litFill: [`M${cx} ${cy} m-25 0 a25 25 0 1 0 50 0 a25 25 0 1 0 -50 0 Z`],
    thin: [{ d: stamens(cx, cy, 54, 9), w: 4 }],
  };
})();

function stamens(cx: number, cy: number, r: number, n: number): string {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    d += `M${cx} ${cy} L${Math.round(cx + Math.cos(a) * r)} ${Math.round(cy + Math.sin(a) * r)}`;
  }
  return d;
}

/**
 * 酒 — the 爵, the three-legged bronze ritual cup.
 *
 * The one vessel in Chinese bronze whose silhouette is unmistakable: a long
 * pouring spout at one end, a pointed tail at the other, two capped posts
 * standing on the rim, and three splayed blade legs. A wine cup would be a
 * generic goblet; this is 酒 in the Three Kingdoms register.
 */
export const JUE_CUP: Glyph = {
  box: [252, 244],
  ink: [
    // 鋬 — the handle, on the tail side
    [70, 96, 8, 40, 108, 9, 44, 142, 7, 72, 148, 6],
  ],
  fill: [
    // the bowl
    'M66 68 L186 68 L172 152 L80 152 Z',
    // 流 — the spout
    'M186 68 L250 34 L242 74 L180 92 Z',
    // 尾 — the tail
    'M66 68 L10 46 L18 82 L72 94 Z',
    // three splayed blade legs
    'M88 152 L104 152 L92 236 L68 228 Z',
    'M148 152 L164 152 L184 228 L160 236 Z',
    'M118 152 L136 152 L134 242 L118 242 Z',
    // 柱 — the two capped posts on the rim
    'M146 68 L156 68 L156 40 L146 40 Z',
    'M138 44 L164 44 L164 32 L138 32 Z',
  ],
  cut: [
    // the 饕餮 band around the bowl
    { d: 'M72 96 L180 96 M76 118 L176 118', w: 5 },
    { d: 'M100 100 L100 114 M126 100 L126 114 M152 100 L152 114', w: 5 },
  ],
};

/**
 * 桥 — a humped plank bridge, in two halves.
 *
 * 过河拆桥 is "cross the river and demolish the bridge", and a card that tears
 * a specific thing away from a specific person deserves the specific image. Two
 * halves so the recipe can pull them apart; a whole bridge that merely fades
 * would be the one thing the idiom is not.
 */
export const BRIDGE_L: Glyph = {
  box: [150, 200],
  ink: [],
  fill: [
    'M6 104 C 44 58 88 40 146 36 L146 74 C 100 78 62 92 30 124 Z',
    'M12 124 L46 124 L46 194 L12 194 Z',
  ],
  cut: [{ d: 'M40 66 L48 96 M74 52 L78 84 M112 44 L114 78', w: 5 }],
  litFill: ['M6 104 C 44 58 88 40 146 36 L146 46 C 92 52 50 70 16 112 Z'],
};

export const BRIDGE_R: Glyph = {
  box: [150, 200],
  ink: [],
  fill: [
    'M144 104 C 106 58 62 40 4 36 L4 74 C 50 78 88 92 120 124 Z',
    'M104 124 L138 124 L138 194 L104 194 Z',
  ],
  cut: [{ d: 'M110 66 L102 96 M76 52 L72 84 M38 44 L36 78', w: 5 }],
  litFill: ['M144 104 C 106 58 62 40 4 36 L4 46 C 58 52 100 70 134 112 Z'],
};

/**
 * 羊 — the sheep of 顺手牵羊, with the rope still on it.
 *
 * One of the 三十六计: you walk past, and the sheep comes with you. The rope
 * trailing off to the side is the "顺手" — it is not a theft, it is a
 * convenience, and the animal has to look like it is being led rather than
 * carried off.
 */
export const SHEEP: Glyph = {
  box: [258, 200],
  ink: [
    // four short legs
    [92, 138, 8, 88, 168, 7, 84, 190, 6],
    [116, 142, 8, 116, 170, 7, 114, 192, 6],
    [160, 138, 8, 164, 168, 7, 168, 190, 6],
    [182, 132, 8, 190, 162, 7, 194, 184, 6],
    // the horn, curling back over the ear
    [58, 62, 8, 30, 56, 8, 16, 76, 6, 30, 94, 4],
  ],
  fill: [
    // the fleece: a scalloped cloud, which is how a sheep reads at any size
    'M76 90 C 70 62 96 48 118 58 C 132 38 166 38 178 60 C 206 54 224 76 216 100'
    + ' C 234 110 230 140 208 146 C 200 166 170 172 154 158 C 134 170 102 166 94 148'
    + ' C 68 150 56 124 68 108 Z',
    // the head, low and to the left, as a browsing animal carries it
    'M76 76 L44 70 L32 96 L52 116 L80 112 Z',
  ],
  litFill: ['M46 84 L58 82 L58 94 L46 94 Z'],
  thin: [
    // the rope, trailing off to the hand that is walking away
    { d: 'M40 96 C 20 108 12 130 16 154', w: 6 },
  ],
};

/**
 * 五谷 — a sheaf of grain, heads heavy enough to droop.
 *
 * 五谷丰登 is a harvest blessing, so what has to read is ABUNDANCE: the stalks
 * bend under the weight, which is the difference between a good year and a
 * bundle of sticks.
 */
export const SHEAF: Glyph = (() => {
  const ink: Line[] = [];
  const lit: Line[] = [];
  const bx = 120, by = 236;
  for (let i = 0; i < 5; i += 1) {
    const t = (i / 4) * 2 - 1;
    const tipX = Math.round(bx + t * 96);
    const tipY = Math.round(60 + Math.abs(t) * 34);
    const midX = Math.round(bx + t * 44);
    ink.push([bx, by, 6, midX, 150, 6, Math.round(tipX * 0.72 + bx * 0.28), tipY + 30, 5]);
    // The head, heavy enough to droop over — which is the whole difference
    // between a harvest and a bundle of sticks.
    lit.push([
      Math.round(tipX * 0.7 + bx * 0.3), tipY + 42, 8,
      Math.round(tipX * 0.92 + bx * 0.08), tipY + 6, 17,
      Math.round(tipX + t * 14), tipY - 6, 14,
      Math.round(tipX + t * 34), tipY + 12, 3,
    ]);
  }
  return {
    box: [240, 250],
    ink,
    lit,
    // the binding
    fill: ['M92 196 L148 196 L148 216 L92 216 Z'],
  };
})();

/**
 * 南蛮 — the Nanman war mask.
 *
 * 南蛮入侵 is Meng Huo's people coming out of the south, and every Chinese
 * depiction of them leads with the mask: tusks, a bone through the crest, a
 * glare. It is a caricature and it is the caricature the idiom carries, which
 * is the thing being drawn — the card is named for how the invasion was SEEN.
 */
export const NANMAN_MASK: Glyph = {
  box: [244, 254],
  ink: [
    // the feathered crest
    [82, 52, 8, 62, 16, 6, 54, 0, 2],
    [122, 44, 9, 122, 8, 6, 122, 0, 2],
    [162, 52, 8, 182, 16, 6, 190, 0, 2],
  ],
  fill: [
    // the mask
    'M56 78 C 56 54 84 40 122 40 C 160 40 188 54 188 78'
    + ' C 188 130 172 190 122 234 C 72 190 56 130 56 78 Z',
    // the tusks, up out of the lower jaw
    'M84 190 L74 148 L96 176 Z',
    'M160 190 L170 148 L148 176 Z',
  ],
  litFill: [
    // the eyes, wide and staring
    'M74 96 L112 88 L110 122 L78 124 Z',
    'M170 96 L132 88 L134 122 L166 124 Z',
    // the bone through the crest
    'M46 62 L198 62 L198 76 L46 76 Z',
  ],
  cut: [
    // the war paint
    { d: 'M92 140 L152 140 M100 158 L144 158', w: 6 },
    { d: 'M122 96 L122 128', w: 7 },
  ],
};

/**
 * 琴 — the guqin, for 乐不思蜀.
 *
 * 「此間樂，不思蜀。」 Liu Shan is asked whether he misses Shu, and the answer
 * is that he is having too nice a time. What the card takes away is his ability
 * to ACT, and the reason is music and wine, so the glyph is the instrument: a
 * long lacquered board with seven strings and the thirteen mother-of-pearl
 * studs, which is the most recognisable object in Chinese leisure.
 */
export const GUQIN: Glyph = {
  box: [254, 130],
  ink: [],
  fill: [
    'M14 46 C 40 30 84 24 130 24 C 180 24 220 32 244 48 L244 82'
    + ' C 220 98 180 106 130 106 C 84 106 40 100 14 84 Z',
  ],
  cut: [
    { d: 'M22 50 C 60 40 190 40 238 54 M22 60 C 60 52 190 52 238 62'
      + ' M22 70 C 60 64 190 64 238 70 M22 80 C 60 76 190 76 238 78', w: 4 },
  ],
  litFill: [studDots()],
};

function studDots(): string {
  let d = '';
  for (let i = 0; i < 13; i += 1) {
    const x = 34 + i * 16;
    const r = i === 6 ? 8 : 5;
    d += `M${x} 92 m${-r} 0 a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  return d;
}

/**
 * 粮 — a grain sack with its cord cut, for 兵粮寸断.
 *
 * "The army's grain cut to an inch." What the card does is stop you drawing, so
 * what has to read is SUPPLY, interrupted: a full sack, the neck cord severed,
 * and the grain already going.
 */
export const GRAIN_SACK: Glyph = {
  box: [230, 250],
  ink: [
    // the cut cord, both ends springing apart
    [78, 76, 6, 52, 62, 5, 34, 66, 3],
    [140, 76, 6, 166, 62, 5, 184, 66, 3],
  ],
  fill: [
    // the sack
    'M74 84 C 40 106 22 156 30 196 C 38 232 76 246 110 246'
    + ' C 144 246 182 232 190 196 C 198 156 180 106 146 84 Z',
    // the gathered neck
    'M80 46 L140 46 L146 88 L74 88 Z',
  ],
  litFill: [
    // grain spilling from the cut
    'M96 30 L106 12 L114 30 L124 16 L128 36 L92 36 Z',
  ],
  cut: [
    { d: 'M56 130 C 84 118 136 118 164 130 M46 172 C 82 158 138 158 174 172', w: 6 },
  ],
};

/**
 * 铁索连环 — two hulls, chained gunwale to gunwale.
 *
 * Pang Tong's advice at Red Cliffs: chain the boats together so the northern
 * troops stop being seasick. It worked, and then it burned. The card chains one
 * or two characters and the fire clause is the whole reason anyone remembers
 * it, so the boats are drawn, not just the chain.
 */
export const CHAINED_BOATS: Glyph = {
  box: [254, 160],
  ink: [
    // masts
    [58, 84, 6, 58, 18, 5],
    [196, 84, 6, 196, 18, 5],
  ],
  fill: [
    'M8 88 L108 88 L96 134 L28 134 Z',
    'M146 88 L246 88 L226 134 L158 134 Z',
    // sails
    'M62 24 L100 34 L100 78 L62 72 Z',
    'M192 24 L154 34 L154 78 L192 72 Z',
  ],
  litFill: [links(108, 100, 146, 100, 3, 11)],
};

/** A run of interlocking rings between two points — the one shape a dashed
 *  stroke cannot draw, and the reason a chain reads as a chain. */
function links(x0: number, y0: number, x1: number, y1: number, n: number, r: number): string {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
    const rx = i % 2 ? r : r * 0.6;
    d += `M${x} ${y} m${-rx} 0 a${rx} ${r} 0 1 0 ${rx * 2} 0 a${rx} ${r} 0 1 0 ${-rx * 2} 0 Z`
      + `M${x} ${y} m${-rx * 0.5} 0 a${rx * 0.5} ${r * 0.5} 0 1 1 ${rx} 0 a${rx * 0.5} ${r * 0.5} 0 1 1 ${-rx} 0 Z`;
  }
  return d;
}

/**
 * 火 — a brand, burning, for 火攻.
 *
 * The card makes you show a card and pays a matching suit to set it alight, so
 * what has to read is a deliberate, held fire — a torch someone is carrying —
 * rather than a fireball arriving from nowhere.
 */
export const TORCH: Glyph = {
  box: [190, 254],
  ink: [
    [94, 250, 12, 94, 190, 12],
  ],
  fill: [
    // the bound head
    'M64 186 L124 186 L118 142 L70 142 Z',
    // the flame: a broad tongue with two smaller ones licking off it
    'M94 4 C 132 56 152 96 146 130 C 140 160 118 176 94 176'
    + ' C 70 176 48 160 42 130 C 36 96 56 56 94 4 Z',
  ],
  litFill: [
    'M94 46 C 118 84 128 108 124 130 C 120 150 108 160 94 160'
    + ' C 80 160 68 150 64 130 C 60 108 70 84 94 46 Z',
  ],
  cut: [{ d: 'M74 190 L114 190 M72 206 L116 206 M74 224 L114 224', w: 5 }],
};

/**
 * 闪电 — the storm standing over a seat.
 *
 * The card is a delayed trick that MOVES when it misses, so the cloud is drawn
 * as a thing that is hanging around, and the fork under it is what it does when
 * the judgement finally comes up ♠2-9.
 */
export const STORM: Glyph = {
  box: [254, 220],
  ink: [],
  fill: [
    // the cloud
    'M40 106 C 18 106 6 88 14 70 C 20 52 42 46 58 56 C 62 26 96 10 126 22'
    + ' C 148 4 186 10 198 34 C 226 32 244 56 236 80 C 230 100 210 108 190 106 Z',
    // the fork
    'M130 106 L86 168 L118 168 L92 218 L166 148 L128 148 L162 106 Z',
  ],
  litFill: [
    'M130 106 L86 168 L106 168 L142 106 Z',
  ],
};

/**
 * 〇 — the ensō, for 无中生有.
 *
 * 「天下萬物生於有，有生於無。」 A single brush circle left open where the brush
 * lifted: the oldest way in East Asian painting of drawing nothing, and the one
 * shape that says "something is about to come out of this".
 */
export const ENSO: Glyph = {
  box: [244, 244],
  ink: [(() => {
    const out: number[] = [];
    const n = 13;
    // 300 degrees, not 360: the gap is the whole point.
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const a = -Math.PI * 0.42 + t * Math.PI * 1.72;
      const w = 4 + 16 * Math.sin(t * Math.PI) ** 0.7;
      out.push(
        Math.round(122 + Math.cos(a) * 100),
        Math.round(122 + Math.sin(a) * 100),
        Math.round(w),
      );
    }
    return out;
  })()],
};

/**
 * 无懈可击 — a wall with no seam in it.
 *
 * "Not a chink to strike at." Every other defensive card in the deck is a
 * shield or an armour; this one cancels a TRICK, from anywhere, on anyone's
 * turn, and what it is is a refusal. So it is masonry: interlocking courses
 * with the joints staggered, which is what "no chink" looks like.
 */
export const SEAMLESS_WALL: Glyph = (() => {
  const fill: string[] = [];
  const rows = 5, cols = 4, w = 244, bh = 40;
  for (let r = 0; r < rows; r += 1) {
    const off = r % 2 ? -w / cols / 2 : 0;
    for (let c = -1; c <= cols; c += 1) {
      const x0 = Math.max(2, c * (w / cols) + off + 3);
      const x1 = Math.min(w - 2, (c + 1) * (w / cols) + off - 3);
      if (x1 - x0 < 6) continue;
      const y0 = 8 + r * (bh + 5);
      fill.push(`M${Math.round(x0)} ${y0} L${Math.round(x1)} ${y0} L${Math.round(x1)} ${y0 + bh} L${Math.round(x0)} ${y0 + bh} Z`);
    }
  }
  return { box: [244, 232], ink: [], fill };
})();

/**
 * 借刀杀人 — a blade held out hilt-first.
 *
 * The 三十六计 entry, and the card: you do not strike, you HAND SOMEONE THE
 * KNIFE. The offered grip is the whole idiom, so the hilt is toward the viewer
 * and the point is turned away.
 */
export const OFFERED_BLADE: Glyph = {
  box: [254, 170],
  ink: [
    // the fingers wrapped round the blade, offering it
    [186, 62, 11, 210, 58, 12, 232, 66, 10],
    [188, 92, 10, 212, 92, 11, 234, 98, 9],
    [190, 118, 9, 212, 122, 10, 230, 128, 8],
  ],
  fill: [
    // the blade, point to the left, away from whoever is being handed it
    'M4 84 L106 62 L106 106 Z',
    // the guard and the grip, presented
    'M106 54 L118 54 L118 114 L106 114 Z',
    'M118 68 L182 68 L182 100 L118 100 Z',
    'M182 62 L198 62 L198 106 L182 106 Z',
  ],
  litFill: ['M4 84 L106 62 L106 76 Z'],
};

/** 五谷丰登 / 万箭齐发 want a single arrow they can multiply. */
export const ARROW: Glyph = {
  box: [254, 70],
  ink: [],
  fill: [
    'M0 28 L196 28 L196 12 L254 35 L196 58 L196 42 L0 42 Z',
    'M10 8 L44 35 L10 62 L26 35 Z',
  ],
  litFill: ['M196 12 L254 35 L196 42 Z'],
};

/** Everything, for the workbench's glyph sheet. */
export const GLYPHS: Readonly<Record<string, Glyph>> = {
  HORSE, GUANDAO, SERPENT_LANCE, HALBERD, AXE, ANCIENT_DAO, ICE_JIAN, QINGGANG,
  TWIN_JIAN, QILIN_BOW, REPEATER, EX_REPEATER, FEATHER_FAN, DARK_JIAN, CATAPULT,
  SIEGE_RAM, GUARDIAN_SHIELD, VAJRA, RATTAN, LION_HELM, SIX_DRAGONS,
  EIGHT_DIAGRAM: trigramWheel(LATER_HEAVEN),
  EARLY_DIAGRAM: trigramWheel(EARLIER_HEAVEN),
  PEACH, BLOSSOM, JUE_CUP, BRIDGE_L, BRIDGE_R, SHEEP, SHEAF, NANMAN_MASK,
  GUQIN, GRAIN_SACK, CHAINED_BOATS, TORCH, STORM, ENSO, SEAMLESS_WALL,
  OFFERED_BLADE, ARROW,
};
