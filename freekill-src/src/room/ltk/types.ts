/**
 * Return shapes of `lua/client/client_util.lua`.
 *
 * These are DESCRIPTIONS of what the client Lua hands back, transcribed from the
 * function bodies in `client_util.lua`. They are not a model the room maintains
 * and never a place to compute anything: every value here arrives from a
 * `LuaClient.call`.
 */

/** `GetCardData(id, filterCard)` — `client_util.lua:87`. */
export interface CardData {
  readonly cid: number;
  /** Absent when the client cannot see the card; `known` is then false. */
  readonly name?: string;
  readonly known?: boolean;
  readonly extension?: string;
  readonly number?: number;
  readonly suit?: CardSuit;
  readonly color?: 'red' | 'black' | 'nocolor';
  readonly mark?: readonly { readonly k: string; readonly v: unknown }[];
  /** `Card.TypeBasic` = 1, `TypeTrick` = 2, `TypeEquip` = 3. */
  readonly type?: number;
  readonly subtype?: CardSubtype;
  readonly multiple_targets?: boolean;
  /** Set when a filter skill renamed the card (`fire__slash` over a `slash`). */
  readonly virt_name?: string;
}

export type CardSuit = 'spade' | 'heart' | 'club' | 'diamond' | 'nosuit';

export type CardSubtype =
  | 'none' | 'delayed_trick' | 'weapon' | 'armor'
  | 'defensive_ride' | 'offensive_ride' | 'treasure';

/** `Card.Type*` in `lua/lunarltk/core/card.lua`. */
export const CARD_TYPE = { BASIC: 1, TRICK: 2, EQUIP: 3 } as const;

/** `GetGeneralData(name)` — `client_util.lua:9`. */
export interface GeneralData {
  readonly package: string;
  readonly extension: string;
  readonly kingdom: string;
  readonly subkingdom?: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly mainMaxHpAdjustedValue?: number;
  readonly deputyMaxHpAdjustedValue?: number;
  readonly shield: number;
  readonly hidden?: boolean;
  readonly total_hidden?: boolean;
}

/** `GetGeneralDetail(name)` — `client_util.lua:27`. */
export interface GeneralDetail extends GeneralData {
  readonly gender: number;
  readonly skill: readonly { readonly name: string; readonly description: string; readonly is_related_skill: boolean }[];
  readonly companions: readonly string[];
  readonly headnote?: string;
  readonly endnote?: string;
}

/** `GetSkillData(name)` — `client_util.lua:421`. */
export interface SkillData {
  readonly skill: string;
  readonly orig_skill: string;
  readonly extension: string;
  readonly freq: 'active' | 'notactive';
  readonly frequency?: 'limit' | 'wake' | 'quest';
  /**
   * 锁定技 — `Skill:hasTag(Skill.Compulsory)`, which is the engine's own
   * predicate and counts a 觉醒技 as compulsory too (`frequency` tells those
   * apart). Added by `lua/web/skillwire.lua`; upstream's `GetSkillData` does
   * not report it, and the only other signal is the prefix of the translated
   * description, which is prose, not data.
   */
  readonly compulsory?: boolean;
  readonly switchSkillName: string;
  readonly isViewAsSkill: boolean;
}

/** `GetSkillStatus(name)` — `client_util.lua:447`. The only source of "is this
 *  skill usable right now". Never recomputed here. */
export interface SkillStatus {
  readonly locked: boolean;
  readonly times: number;
}

/** `GetTargetTip(pid)` — `client_util.lua:969`. */
export interface TargetTip {
  readonly type?: string;
  readonly content: string;
}

/** `GetPlayerSkills(pid)` — `client_util.lua:398`. */
export interface PlayerSkill {
  readonly name: string;
  readonly description: string;
}

/** Move areas — `Card.PlayerHand` … in `lua/lunarltk/core/card.lua`, mirrored in
 *  `Fk/Pages/LunarLTK/RoomLogic.js:5`. */
export const CARD_AREA = {
  Unknown: 0,
  PlayerHand: 1,
  PlayerEquip: 2,
  PlayerJudge: 3,
  PlayerSpecial: 4,
  Processing: 5,
  DrawPile: 6,
  DiscardPile: 7,
  Void: 8,
} as const;

export type CardArea = (typeof CARD_AREA)[keyof typeof CARD_AREA];

/** `Player.Phase` — `lua/lunarltk/core/player.lua`. `NotActive` is 8. */
export const PHASE = {
  RoundStart: 1, Start: 2, Judge: 3, Draw: 4, Play: 5,
  Discard: 6, Finish: 7, NotActive: 8, PhaseNone: 9,
} as const;

export const PHASE_NAME: Readonly<Record<number, string>> = {
  1: 'phase_roundstart', 2: 'phase_start', 3: 'phase_judge', 4: 'phase_draw',
  5: 'phase_play', 6: 'phase_discard', 7: 'phase_finish', 8: 'phase_notactive',
  9: 'phase_none',
};
