/**
 * What the nine skill categories look like, and why they look different.
 *
 * `Animate{type="InvokeSkill"}` carries `skill_type` — the skill's `anim_type`,
 * one of nine values the engine enumerates at
 * `lua/lunarltk/server/system_enum.lua:87`. That single field is the whole
 * reason this lane scales: the roster went from 25 generals to 274 in a day and
 * every one of them animates, because nothing here knows a skill's name. A
 * hand-written map from skill to artwork would have been obsolete before it was
 * finished.
 *
 * The nine sprite strips the engine ships for these are nine variations on one
 * golden swirl: at the size a seat is drawn on a web table they are, in
 * practice, the same picture nine times. So the categories are separated here
 * on the axis the eye actually reads first, which is not colour.
 *
 * IT IS MOTION. Direction is pre-attentive — you know something moved outward
 * before you know what colour it was — so each category gets its own direction
 * and nothing else uses it:
 *
 *   offensive   across     blades sweep over the seat and spark outward
 *   defensive   inward     eight plates converge and lock, then hold
 *   control     around     two rings counter-rotate and tighten
 *   support     upward     motes rise, a halo opens overhead
 *   drawcard    inward     card shapes fly in from off-table and are absorbed
 *   masochism   in, then out   shards implode, then the seat answers with a burst
 *   negative    downward   everything sinks; the portrait corrodes from its edges
 *   special     on the spot a rune seal turns
 *   switch      sideways   two halves cross past each other and swap
 *
 * Colour is the second axis and it confirms rather than carries. Kingdom is a
 * third, on a surface of its own — the name plaque's rim and seal — because
 * tinting the effect by kingdom would have destroyed the first axis: four
 * players' `offensive` must look like one thing, not four.
 */

/* ------------------------------------------------------------- categories */

export const CATEGORIES = [
  'offensive', 'defensive', 'control', 'support', 'drawcard',
  'masochism', 'negative', 'special', 'switch',
] as const;

export type SkillCategory = (typeof CATEGORIES)[number];

const CATEGORY_SET: ReadonlySet<string> = new Set<string>(CATEGORIES);

/**
 * The category of an `InvokeSkill`.
 *
 * `RoomLogic.js:1350` falls back to `special` when the payload omits
 * `skill_type`, and plenty of skills omit it — `Skill.anim_type` defaults to
 * `""` (`lua/lunarltk/core/skill.lua:63`). A few skills pass something else
 * entirely: `paoxiao` sends its own name. Neither is a reason to draw nothing,
 * and neither is a decision — the engine said `special` by saying nothing.
 */
export function toCategory(raw: unknown): SkillCategory {
  return typeof raw === 'string' && CATEGORY_SET.has(raw) ? (raw as SkillCategory) : 'special';
}

/** How a category reads. `motes` is how many particle nodes it needs. */
export interface Signature {
  /** The direction the eye should catch. Drives the CSS via `--fk-spec-move`. */
  readonly move: 'across' | 'close' | 'orbit' | 'rise' | 'gather' | 'recoil' | 'sink' | 'seal' | 'swap';
  /** Core colour, as a bare `r, g, b` triple so CSS can vary the alpha. */
  readonly rgb: string;
  /** The lighter partner, for cores and highlights. */
  readonly lit: string;
  /** Particle count. Zero where the absence of particles is the tell. */
  readonly motes: number;
  /** What the portrait itself does. Empty where holding still is the point. */
  readonly host: '' | 'lunge' | 'brace' | 'lift' | 'reel' | 'wilt' | 'turn';
}

export const SIGNATURE: Readonly<Record<SkillCategory, Signature>> = {
  // Blades across the seat, sparks thrown outward, the portrait lunging into
  // the swing. The only category that leaves the frame in a straight line.
  offensive: { move: 'across', rgb: '255, 82, 58', lit: '255, 214, 178', motes: 14, host: 'lunge' },
  // Eight plates converge and lock. Deliberately the one category with NO
  // particles: everything else scatters, so a guard that does not is unmistakable.
  defensive: { move: 'close', rgb: '120, 176, 255', lit: '224, 240, 255', motes: 0, host: 'brace' },
  // Two rings tighten around a seat that is held perfectly still. The stillness
  // is the effect — nothing else in the nine leaves the portrait untouched.
  control: { move: 'orbit', rgb: '178, 116, 255', lit: '236, 214, 255', motes: 6, host: '' },
  support: { move: 'rise', rgb: '126, 230, 150', lit: '245, 255, 220', motes: 16, host: 'lift' },
  // The particles are card-shaped. Shape, not colour, is what says "cards".
  drawcard: { move: 'gather', rgb: '92, 198, 240', lit: '224, 248, 255', motes: 5, host: '' },
  // The only two-beat effect: it implodes, then answers. Its tint is overridden
  // at play time by the element of the damage that provoked it — see `toElement`.
  masochism: { move: 'recoil', rgb: '226, 58, 74', lit: '255, 196, 176', motes: 10, host: 'reel' },
  negative: { move: 'sink', rgb: '138, 186, 82', lit: '206, 232, 150', motes: 14, host: 'wilt' },
  special: { move: 'seal', rgb: '236, 196, 108', lit: '255, 246, 214', motes: 8, host: '' },
  // Two colours, one per half, because a swap needs two things to swap.
  switch: { move: 'swap', rgb: '72, 214, 200', lit: '255, 152, 226', motes: 0, host: 'turn' },
};

/* ---------------------------------------------------------------- kingdoms */

/**
 * The kingdom a seat is playing, from `PropertyUpdate[id, "kingdom", value]`.
 *
 * The engine broadcasts it at the top of the game (`gamelogic.lua:172`) and
 * again on every change — 变更 skills move a player between kingdoms mid-game
 * (`events/misc.lua:100`), and `serverplayer.lua:583` sets `wild` for a
 * revealed 野心家. All of them arrive on the same wire property, so watching it
 * is both the simplest and the only correct way to know.
 *
 * It never tints the effect, only the name plaque's rim and seal. See the
 * header: kingdom on the effect would undo what the category separation buys.
 */
export const KINGDOMS = ['wei', 'shu', 'wu', 'qun', 'jin', 'god', 'wild'] as const;

export type Kingdom = (typeof KINGDOMS)[number] | 'unknown';

const KINGDOM_SET: ReadonlySet<string> = new Set<string>(KINGDOMS);

export function toKingdom(raw: unknown): Kingdom {
  return typeof raw === 'string' && KINGDOM_SET.has(raw) ? (raw as Kingdom) : 'unknown';
}

/** Plaque rim and plaque seal fill. The character stamped in the seal is not
 *  here: see `markOf`. */
export interface Banner {
  readonly rim: string;
  readonly seal: string;
}

export const KINGDOM_BANNER: Readonly<Record<Kingdom, Banner>> = {
  wei: { rim: '90, 146, 210', seal: '24, 48, 84' },
  shu: { rim: '206, 78, 62', seal: '78, 24, 20' },
  wu: { rim: '90, 184, 142', seal: '18, 62, 50' },
  qun: { rim: '206, 168, 88', seal: '72, 54, 20' },
  jin: { rim: '166, 124, 214', seal: '54, 32, 84' },
  god: { rim: '236, 224, 190', seal: '84, 72, 40' },
  // The engine names the kingdom `wild` the moment an ambitionist is revealed.
  wild: { rim: '224, 112, 64', seal: '76, 30, 12' },
  unknown: { rim: '176, 156, 122', seal: '48, 40, 28' },
};

/**
 * The character in the kingdom seal, from the engine's own dictionary.
 *
 * NOT A TABLE OF CHARACTERS HERE. `Photo` already renders a seat's kingdom as
 * `lua.tr(player.kingdom)`, so the glyph a player expects on a Wei seat is
 * whatever `Fk:translate("wei")` returns — and writing it into this file
 * instead would put it outside the dictionary, out of reach of translation, and
 * outside the committed font subset (the traditional forms this once used were
 * three glyphs the subset does not carry, which renders as tofu, not as text).
 *
 * One character, because the seal is a square barely wider than its own text.
 * When the engine has no translation it returns the key, so `god` becomes `G`
 * rather than a box — right in English, and right in Chinese the moment a pack
 * ships the key.
 */
export function markOf(kingdom: Kingdom, tr: (s: string) => string): string {
  // Trim FIRST, then fall back: a translator that answers with a space has said
  // nothing, and `'  ' || kingdom` is `'  '`, which trims to a blank seal.
  const word = tr(kingdom).trim() || kingdom.trim();
  if (!word) return '·';
  const first = [...word][0];
  // An untranslated key comes back as itself: `wei` -> `W`, not `w`.
  return /[a-z]/.test(first) ? first.toUpperCase() : first;
}

/* ------------------------------------------------------------------- roles */

/**
 * Who fell, and why that changes what it looks like.
 *
 * The engine ships EIGHT separate death stamps —
 * `image/photo/death/{lord,loyalist,rebel,renegade,hidden,surrender,run,saveme}.png`
 * — which is the strongest statement it makes anywhere that a death is not one
 * event. They are red vertical brush seals reading 「主公阵亡」 and so on, with a
 * rough double frame: that is the house idiom, and the seal below is authored to
 * it rather than lifted from it. (They are GPL-3.0 and could have been shipped;
 * eight more PNGs is 146 kB that cannot be recoloured, cannot be animated and
 * goes soft at any size but the one it was drawn at.)
 *
 * The role arrives as `PropertyUpdate[id, "role", value]` — broadcast to
 * everyone at the top of the game (`gamelogic.lua:79`) and already in
 * `RoomStore`. Showing it at the moment of death reveals nothing that is not
 * revealed anyway: the engine sets `role_shown` in the same event
 * (`events/death.lua:122`) and `Photo` puts the role across the portrait for
 * the rest of the game the instant `dead` arrives. This draws the same fact at
 * the same instant.
 */
export const ROLES = ['lord', 'loyalist', 'rebel', 'renegade'] as const;

export type Role = (typeof ROLES)[number] | 'unknown';

const ROLE_SET: ReadonlySet<string> = new Set<string>(ROLES);

export function toRole(raw: unknown): Role {
  return typeof raw === 'string' && ROLE_SET.has(raw) ? (raw as Role) : 'unknown';
}

/**
 * How a role dies.
 *
 * `temper` is the whole point of this table: four deaths that are shaped
 * differently, not four deaths in different colours. A 主公 falling ends the
 * game and takes the whole room with it; a 忠臣 falls honourably and slowly; a
 * 反贼 is cut down fast and violently; a 内奸 is not so much killed as
 * *revealed*, which is why its seal fades up instead of slamming.
 */
export interface Rite {
  readonly rgb: string;
  readonly lit: string;
  /** Drives the CSS. Each is a different sequence, not a different tint. */
  readonly temper: 'sovereign' | 'solemn' | 'savage' | 'unmasked';
  /** How the blade crosses the table, in degrees from horizontal. */
  readonly cut: number;
  /** How many pieces the portrait breaks into. */
  readonly shards: number;
  /** Whether the whole room dims, or only the seat's neighbourhood. */
  readonly roomWide: boolean;
}

export const ROLE_RITE: Readonly<Record<Role, Rite>> = {
  // 主公. Gold, room-wide, and the slowest to let go. Losing the lord is
  // usually losing the game, and it should read like the end of one.
  lord: { rgb: '242, 198, 92', lit: '255, 250, 226', temper: 'sovereign', cut: -18, shards: 16, roomWide: true },
  // 忠臣. Steel blue, a vertical fall rather than a cut across, fewer pieces,
  // a longer hold on the seal. Honourable.
  loyalist: { rgb: '104, 160, 224', lit: '226, 240, 255', temper: 'solemn', cut: -78, shards: 9, roomWide: false },
  // 反贼. Crimson, the fastest and the most violent — a double cut, the most
  // pieces, the hardest shake.
  rebel: { rgb: '226, 62, 54', lit: '255, 214, 196', temper: 'savage', cut: -34, shards: 20, roomWide: false },
  // 内奸. Violet, and the one that is not a killing: the portrait peels away
  // and the seal resolves out of the dark. Being found out, not being cut down.
  renegade: { rgb: '176, 112, 224', lit: '238, 216, 255', temper: 'unmasked', cut: 26, shards: 12, roomWide: false },
  // The role the engine withheld — `victim.rest > 0`, so it logged `unknown`
  // and never set `role_shown`. Neutral, and no claim about who this was.
  unknown: { rgb: '196, 186, 172', lit: '255, 250, 240', temper: 'solemn', cut: -30, shards: 12, roomWide: false },
};

/* ---------------------------------------------------------------- elements */

export const ELEMENTS = ['normal', 'fire', 'thunder', 'ice'] as const;

export type Element = (typeof ELEMENTS)[number];

/**
 * `LogEvent{type="Damage"}.damageType` — `normal_damage`, `fire_damage`,
 * `thunder_damage`, `ice_damage` (`events/hp.lua:38`).
 *
 * Also the tint a `masochism` skill inherits. A 反馈 fired in answer to a fire
 * 杀 should look like it was answering fire, and the engine has already said
 * which element landed on that seat — see `Spectacle.damage`.
 */
export function toElement(damageType: unknown): Element {
  const name = String(damageType ?? '').replace(/_damage$/, '');
  return name === 'fire' || name === 'thunder' || name === 'ice' ? name : 'normal';
}

export const ELEMENT_RGB: Readonly<Record<Element, string>> = {
  normal: '255, 74, 52',
  fire: '255, 146, 40',
  thunder: '150, 190, 255',
  ice: '180, 240, 255',
};

export const ELEMENT_LIT: Readonly<Record<Element, string>> = {
  normal: '255, 206, 180',
  fire: '255, 236, 170',
  thunder: '236, 246, 255',
  ice: '240, 253, 255',
};

/**
 * How hard a hit reads, from `damageNum`.
 *
 * The Qt client uses this field for exactly one thing: it appends `"2"` to the
 * sound file name when the damage is more than 1 (`RoomLogic.js:1381`). So the
 * engine has always told the client how big the hit was and the web table has
 * always thrown it away. Three points of damage should not look like one.
 *
 * Capped at 3 because past that the difference stops being visible and the
 * shake starts being unpleasant.
 */
export function toWeight(damageNum: unknown): 1 | 2 | 3 {
  const n = Number(damageNum);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return n >= 3 ? 3 : 2;
}
