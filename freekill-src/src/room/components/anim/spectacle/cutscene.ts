/**
 * The four moments the game stops for.
 *
 * WHAT THIS IS AND WHY IT IS ABOVE `signatures.ts`. Every one of the 537 skills
 * in this build has a signature — a composed motif, drawn on the seat, over in
 * about 620 ms. That is the right size for a skill firing. It is the wrong size
 * for the handful of moments that are not a skill firing at all but a character
 * *turning into a different character in front of the table*, and the mobile
 * game they come from knows it: all four get a takeover, and the published
 * accounts of three of them say the battle music changes with it.
 *
 * FOUR GENERALS, SIX SCENES, because two of the four fork and the fork is the
 * whole point of them. And every one of the six is keyed to a value the engine
 * broadcasts, which is the only reason this file is a port rather than a
 * wishlist:
 *
 *   势魏延  忠傲 is `Skill.Quest` — a 使命技. `zhongao.lua` does not merely flip
 *           a flag: on success it writes `player.general = "m_shi2__weiyan"` and
 *           broadcasts it, and on failure `"m_shi3__weiyan"`. Two portraits, two
 *           sets of voice lines, two men. This is the "revelation-like skill" —
 *           the moment the table learns which way Wei Yan ended.
 *   势周瑜  雄姿 is `Skill.Limited`, so the engine sends `InvokeUltSkill` and
 *           stops the room for 2 000 ms (`room.lua:609`); `xiongzi.lua` then
 *           swaps the portrait AND writes `@xiongzi-noclear`, which is the fork:
 *           first option keeps three fire skills, second keeps three draw-and-
 *           chain ones, and the game gives those two forms separate music.
 *   曹髦    决进 is what 潜龙 hands him at 99 道心, and `juejin.lua` writes
 *           `player.general = "mobile2__caomao"` — the 阴 painting in the
 *           council chamber becoming the 阳 one on the chariot.
 *   神姜维  神霈 is `Skill.Limited`; `InvokeUltSkill`, and nothing to swap, so
 *           the scene lives inside the pause the engine already took.
 *
 * NOTHING HERE IS A RULE, AND NOTHING HERE INFERS ONE. Every trigger below is a
 * value the server broadcast to every client — a general property, a mark, an
 * animation name — and the answer is a picture. `transformed` is the clearest
 * case: it does not work out whether the mission succeeded, it reads which
 * portrait the engine said the seat now has.
 *
 * WHAT IS SOURCED AND WHAT IS NOT, because a port should say. 曹髦's scene has a
 * published description written off dev-team material and is followed closely;
 * 势魏延's and 势周瑜's forms and per-form music are attested, their frame-by-
 * frame animation is not; 神姜维's is not documented anywhere reachable and is
 * built from his key art and the publisher's own lore blurb. Each entry says
 * which it is.
 *
 * WHY THE DETECTION LIVES APART FROM THE DRAWING. Two lanes need it. The
 * animation bus draws the scene; the sound lane needs the same moment to swap
 * the music, and the sound lane is on the app's first-paint path where
 * `signatures.ts`'s 8 700 lines of art direction must not follow it. So this
 * file imports types and nothing else, `plan.ts` turns a `Cutscene` into a
 * `Burst`, and `audio/themes.ts` turns the same `Cutscene` into a bed.
 */
import type { PaletteName } from './motif';

/**
 * One scene.
 *
 * `hue`/`hue2` are `motif.ts` palette names rather than colours, so a cutscene
 * is coloured out of the same twenty-eight pairs every signature is, and the
 * general's own signature and their cutscene cannot drift apart.
 */
export interface Cutscene {
  /** Stable id. The theme table and the workbench are keyed by it. */
  readonly key: string;
  /** The general the scene belongs to — the portrait it opens on. */
  readonly general: string;
  /** The portrait it closes on, when the moment is a transformation. */
  readonly becomes?: string;
  /** The engine's key for the skill whose moment this is. Printed as the title. */
  readonly skill: string;
  /**
   * The engine's key for what the character came away with — the skill gained,
   * upgraded or unlocked. Printed under the title.
   *
   * An engine skill key on purpose. There is no `使命达成` string anywhere in
   * FreeKill, and inventing one would put a word in the room that no package
   * can translate; naming the skill that actually changed says the same thing
   * in the engine's own vocabulary and tells the table something it needs.
   */
  readonly gains?: string;
  /**
   * The character's own words, as engine keys.
   *
   * These are the `$<skill><n>` lines the packages ship and the voice lane
   * plays. Where the engine itself splits them by branch — `zhongao.lua` gives
   * its success triggers `audio_index = {2,3}` and its failure triggers
   * `{4,5}` — the split here is the engine's, not a reading of the Chinese.
   */
  readonly lines: readonly string[];
  readonly hue: PaletteName;
  readonly hue2: PaletteName;
  /**
   * `sky` fills the room; `seat` is the smaller flourish the three lower 潜龙
   * thresholds get. 曹髦 crosses 25 within a turn or two of sitting down, and
   * four room-filling takeovers from one seat in one game is not a spectacle,
   * it is an interruption.
   */
  readonly scope: 'sky' | 'seat';
  /** The music this displaces the soundtrack with. See `audio/themes.ts`. */
  readonly theme?: string;
}

/* ------------------------------------------------------------------ the four */

/**
 * 势魏延 · 矜忠跨万山 — 忠傲, the 使命技.
 *
 * He asked for the 子午谷 and was refused, held 汉中 for a decade, and after
 * 五丈原 stood in the road shouting 谁敢杀我 with 马岱 already behind him. The
 * skill is a fork in exactly that: kill somebody and 狂骨 upgrades, or go down
 * — or refuse your own oath — and 壮誓 is taken off you for 困奋.
 *
 * The two branches are the same composition in opposite temperatures. Success
 * is cinnabar over gold and the portrait rises; failure is bone over blood and
 * the light goes out of it. Both end on a different face than they started.
 */
const WEIYAN_RISE: Cutscene = {
  key: 'weiyan-rise',
  general: 'm_shi__weiyan',
  becomes: 'm_shi2__weiyan',
  skill: 'zhongao',
  gains: 'm_shi__kuanggu',
  lines: ['$zhongao2', '$zhongao3'],
  // 饮战形态 — the mobile game's own name for the success form, and its own
  // description of it is 周身被火焰包围, wrapped in flame. Not the bone-and-omen
  // reading the 忠傲 *signature* takes: the seat's signature is drawn before
  // anyone knows which way it went, and this is the half that came out warm.
  hue: 'flame', hue2: 'gold',
  scope: 'sky',
  theme: 'oath-kept',
};

const WEIYAN_FALL: Cutscene = {
  key: 'weiyan-fall',
  general: 'm_shi__weiyan',
  becomes: 'm_shi3__weiyan',
  skill: 'zhongao',
  gains: 'kunfen',
  lines: ['$zhongao4', '$zhongao5'],
  // 退守形态 — 严阵以待，蓄势待发, all armour and a long polearm, 一夫当关.
  // Bronze and blood: he is not beaten, he has stopped advancing. His own
  // failure lines are consolation to the rest of the table, not despair —
  // 一时得失何须挂怀 — so this is a colder picture, never a dying one.
  hue: 'bronze', hue2: 'blood',
  scope: 'sky',
  theme: 'oath-broken',
};

/**
 * 势周瑜 · 燎琰涤浪 — 雄姿, the 限定技, and the one scene here that forks on a
 * choice rather than on an outcome.
 *
 * 雄姿英发，羽扇纶巾，谈笑间，樯橹灰飞烟灭. He binds 炽沄, 焰洄 and 焚涛 to his
 * own turn and keeps ONE option of each, and the two options are two different
 * commanders: every first option is fire damage, every second option is a draw
 * and a seat turned sideways. The mobile game gives those two forms separate
 * artwork and separate battle music, and this follows it.
 *
 * WHICH FORK IS NOT GUESSED. `xiongzi.lua` writes the answer to the wire as the
 * visible mark `@xiongzi-noclear`, whose value is the engine's own key for the
 * branch. Note the naming, which is not a typo here: `askToChoice` is offered
 * `{ "xiongzi_2", "xiongzi_1" }` and the package translates `xiongzi_2` as
 * 选项一 and `xiongzi_1` as 选项二 — so the mark reading `xiongzi_2` is the
 * FIRST option, which is the fire one.
 */
const ZHOUYU_FIRE: Cutscene = {
  key: 'zhouyu-fire',
  general: 'm_shi__zhouyu',
  becomes: 'm_shi2__zhouyu',
  skill: 'xiongzi',
  // 以吾一人心火，焚汝百万庸贼 — the fire form's own line.
  lines: ['$xiongzi3', '$xiongzi2'],
  hue: 'flame', hue2: 'ember',
  scope: 'sky',
  theme: 'river-fire',
};

const ZHOUYU_WATER: Cutscene = {
  key: 'zhouyu-water',
  general: 'm_shi__zhouyu',
  becomes: 'm_shi2__zhouyu',
  skill: 'xiongzi',
  // 纵有波汹浪涌，岂阻江海奔流 — the water form's.
  lines: ['$xiongzi1', '$xiongzi4'],
  hue: 'azure', hue2: 'frost',
  scope: 'sky',
  theme: 'river-tide',
};

/** The mark `xiongzi.lua` records the branch in, and the two values it takes. */
export const XIONGZI_MARK = '@xiongzi-noclear';
const XIONGZI_FORM: Readonly<Record<string, Cutscene>> = {
  xiongzi_2: ZHOUYU_FIRE,
  xiongzi_1: ZHOUYU_WATER,
};

/**
 * 曹髦 · 向死存魏 — 决进, the skill 潜龙 hands over at 99 道心.
 *
 * 潜龙勿用 — the submerged dragon: do not act. He acted. He walked out of the
 * palace with a drawn sword saying 司马昭之心，路人皆知, and 成济 ran him through
 * in the street on 贾充's word. The counter stops at 99 rather than 100, which
 * is the whole character, and 决进 is what he does with it.
 *
 * NOT AT 25, 50 OR 75. The obvious design — a flourish at each threshold — is
 * not what the game does, and searching for one found nothing: every published
 * description of 曹髦's presentation attaches to 99 alone. What the lower
 * thresholds get instead is the thing the game actually gives them, his own
 * resource bar, and this port now draws it (`components/Photo.tsx`).
 *
 * THE ONE SCENE HERE WITH A PUBLISHED DESCRIPTION. 游戏日报's feature, written
 * off dev-team material: 当全场进入"向死存魏"状态时，将会出现一个【曹髦】的近景
 * 特写…整个牌局背景也将燃起熊熊的火焰特效，背景音乐则会切换成【曹髦】的武将主题
 * 曲. A close-up, the whole table on fire, and the music changing. And the
 * portrait behind it is a deliberate cold-to-warm flip: the 阴 painting is 曹髦
 * in the council chamber under 电闪雷鸣、骤雨斜侵, the 阳 painting is him alone
 * on a war chariot with a drawn sword and the gold 英魂 of 曹操, 曹丕 and 曹植
 * behind him.
 *
 * So: flame over gold, and no dragon. Every literal description names fire, a
 * close-up, a chariot and a sword; the dragon is in the name of the skill that
 * got him here and nowhere in the picture.
 */
const CAOMAO_JUEJIN: Cutscene = {
  key: 'caomao-juejin',
  general: 'mobile__caomao',
  becomes: 'mobile2__caomao',
  skill: 'juejin',
  lines: ['$juejin1', '$juejin2'],
  hue: 'flame', hue2: 'gold',
  scope: 'sky',
  theme: 'daoxin',
};

/** The mark `qianlong.lua` keeps the counter in. `@`-prefixed, so it is on the
 *  wire. No scene watches it; `Photo` draws it as 曹髦's own gauge. */
export const DAOXIN_MARK = '@mobile__qianlong_daoxin';

/** The 道心值 each of 潜龙's four skills arrives at, ascending. */
export const DAOXIN_STEPS: readonly number[] = [25, 50, 75, 99];

/** 潜龙's ceiling. 99, not 100, and `ChangeDaoxin` clamps to it. */
export const DAOXIN_MAX = 99;

/**
 * 神姜维 · 万民承霖 — 神霈, the 限定技.
 *
 * 霈 is a downpour and 万民承霖 is rain arriving for a people who were owed it.
 * He plotted with 钟会 at the very end — 愿陛下忍数日之辱，臣欲使社稷危而复安，
 * 日月幽而复明 — and the mutineers cut him open for it. The skill is the one of
 * his three that goes up: dying, he stands back up under the rain and hands the
 * lightning on.
 *
 * THE ONLY SCENE HERE WITH NO PUBLISHED DESCRIPTION OF ITS ANIMATION. Searching
 * for one found the character's key art and the publisher's own lore blurb and
 * no account of what fires on screen, which is a gap in the sources rather than
 * evidence that nothing does. So this is built from the two things that ARE
 * sourced, and it is worth saying which:
 *
 *   the key art  gold-dominant, a flame-shaped mark on the chest for 炎汉 —
 *                the Han's fire virtue — a sword of water, and a star array
 *                behind him answering 诸葛亮's 观星.
 *   the blurb    忽星魂垂照，天涛翻涌，神霈沛然骤降，三日不绝…皆言此乃姜维回天
 *                之力 — which walks his four skills through the rain miracle in
 *                order and ends on the one this scene hands him.
 *
 * Gold for the man and violet for what comes down with the rain, which is what
 * the rules say it is: `shenpeij` deals `fk.ThunderDamage`.
 */
const JIANGWEI_SHENPEI: Cutscene = {
  key: 'jiangwei-shenpei',
  general: 'mobile__godjiangwei',
  skill: 'shenpeij',
  gains: 'huitian',
  lines: ['$shenpeij1', '$shenpeij2'],
  hue: 'gold', hue2: 'violet',
  scope: 'sky',
  theme: 'rain-owed',
};

/** Every scene, by key. The workbench and the tests enumerate this. */
export const CUTSCENES: Readonly<Record<string, Cutscene>> = Object.fromEntries(
  [WEIYAN_RISE, WEIYAN_FALL, ZHOUYU_FIRE, ZHOUYU_WATER, CAOMAO_JUEJIN, JIANGWEI_SHENPEI]
    .map((c) => [c.key, c]),
);

/** The marks any scene watches. `AnimBus` remembers these and nothing else. */
export const WATCHED_MARKS: readonly string[] = [XIONGZI_MARK];

/* ------------------------------------------------------------------ triggers */

/**
 * A `PropertyUpdate[id, "general"|"deputyGeneral", name]` that is a
 * transformation.
 *
 * BOTH HALVES ARE CHECKED. `to` alone would be enough today — nothing but
 * 忠傲 ever writes `m_shi2__weiyan` or `m_shi3__weiyan`, and neither is in the
 * selectable roster — but the property is also broadcast when a seat is first
 * dealt its general and again on every reconnect, and a scene that fires on
 * arrival rather than on change would play the biggest moment in the game to
 * somebody who just refreshed the page. Requiring the base general as the
 * previous value makes that impossible rather than unlikely.
 *
 * TWO OF THE FOUR ARE HERE. 忠傲, whose whole content is which of two men Wei
 * Yan turns out to be, and 决进, which is 曹髦 leaving the council chamber for
 * the chariot. 雄姿 swaps a portrait too and is deliberately not here — its
 * scene is keyed on the mark that says which of two forms he chose, because the
 * portrait alone cannot say. See `marked`, and the note on `ZHOUYU_FIRE`.
 */
export function transformed(from: unknown, to: unknown): Cutscene | undefined {
  if (typeof from !== 'string' || typeof to !== 'string' || from === to) return undefined;
  for (const c of [WEIYAN_RISE, WEIYAN_FALL, CAOMAO_JUEJIN]) {
    if (c.general === from && c.becomes === to) return c;
  }
  return undefined;
}

/**
 * An `Animate{type="InvokeUltSkill"}` that is one of these.
 *
 * Only 神霈. It is the one scene of the four with no branch and no portrait to
 * swap, so the message the engine stops the room for is also the message that
 * says everything there is to say, and the scene belongs inside that pause.
 *
 * 雄姿 sends `InvokeUltSkill` too and is deliberately NOT here: it is answered
 * by the 1.9 s `ultBurst` on the pause, and its scene follows two seconds later
 * on the mark that names which of the two forms he chose. Announcement, then
 * transformation — which is the order the events actually happen in
 * (`events/skill.lua:81` sends the animation, `delay(2000)`, then `on_use`
 * swaps the portrait and writes the mark).
 */
export function invoked(name: unknown): Cutscene | undefined {
  if (typeof name !== 'string') return undefined;
  return name === JIANGWEI_SHENPEI.skill ? JIANGWEI_SHENPEI : undefined;
}

/**
 * A `SetPlayerMark[id, mark, value]` that is a scene.
 *
 * One mark, `@`-prefixed and therefore on the wire — `clientbase.lua:437`
 * forwards only those to the UI. It is set once and never cleared (the mark is
 * literally named `-noclear`), so the transition out of "not set" is the whole
 * of the moment.
 *
 * `from` being anything other than `undefined` is a seat whose mark this client
 * has already seen — the status poll's forty-a-second resend, or a fresh
 * subscriber being caught up on a game already in progress. Neither is a
 * choice being made, and this is what keeps a reconnect mid-game from replaying
 * somebody else's 雄姿 at them.
 */
export function marked(mark: unknown, from: unknown, to: unknown): Cutscene | undefined {
  if (mark !== XIONGZI_MARK || from !== undefined || typeof to !== 'string') return undefined;
  return XIONGZI_FORM[to];
}

/**
 * Every portrait a scene can end on, so the bus can decode them before it needs
 * them.
 *
 * A cutscene that has to fetch and decode a 16 kB portrait while it is already
 * on screen shows an empty plate for the first third of itself. These are
 * warmed the moment the base general appears at a seat, which is minutes early.
 */
export function afterPortraits(general: string): readonly string[] {
  const out: string[] = [];
  for (const c of Object.values(CUTSCENES)) {
    if (c.general === general && c.becomes) out.push(c.becomes);
  }
  return out;
}

/** The generals that have one at all. `AnimBus` warms nothing for anyone else. */
export const CUTSCENE_GENERALS: ReadonlySet<string> = new Set(
  Object.values(CUTSCENES).map((c) => c.general),
);
