/**
 * What a block says on its face, in Chinese.
 *
 * `vocabulary.generated.json` is written for a compiler: `fk.EventPhaseStart`,
 * `ask-choose-players`, `"draw cards"`. A player who wants to build 「摸牌」
 * cannot find it under `draw`, and the English label is a note to the engineer
 * who wrote the extractor, not rules text. So every id the panel can offer gets
 * a Chinese face here, and the id stays underneath as the thing that actually
 * travels in the spec.
 *
 * Anything with no entry falls back to its generated `label` and then to its
 * id, which is deliberately ugly: an unlabelled block is a gap in this table,
 * not a thing to hide. `__tests__/designer.test.tsx` fails if a block
 * `forPanel` offers has no Chinese name.
 *
 * ---------------------------------------------------------------------------
 * PARAMETERS
 *
 * The vocabulary names a block's parameters and does not type them — it was
 * read off call sites, and a call site knows `fromPlace` was passed, not what
 * `fromPlace` may be. So the widget for each is chosen here, and the VALUES a
 * dropdown emits are the engine's own tokens wherever the citation names them
 * (`Player.Start`, `"h"`/`"e"`/`"j"`, `fk.FireDamage`) rather than a private
 * encoding, because the compiler on the other side of this contract is reading
 * the same citations.
 *
 * A parameter name is not globally unique — `from` is a player for `damage`
 * and an end of the draw pile for `from-draw-pile` — so a block may override
 * any of them in `BLOCK_PARAM_OVERRIDES`.
 */
import type { BlockKind, ParamValue } from '../spec';
import { paramsOf } from '../spec';

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

/** 46 triggers survive `forPanel`; every one of them is named here. */
export const TRIGGER_LABELS: Record<string, string> = {
  'fk.EventPhaseStart': '阶段开始时',
  'fk.EventPhaseEnd': '阶段结束时',
  'fk.EventPhaseChanging': '阶段切换时',
  'fk.TurnStart': '回合开始时',
  'fk.TurnEnd': '回合结束时',
  'fk.RoundStart': '轮开始时',
  'fk.RoundEnd': '轮结束时',
  'fk.GameStart': '游戏开始时',
  'fk.DrawNCards': '摸牌阶段确定摸牌数时',

  'fk.Damage': '造成伤害后',
  'fk.Damaged': '受到伤害后',
  'fk.DamageCaused': '造成伤害时',
  'fk.DamageInflicted': '受到伤害时',
  'fk.PreDamage': '伤害结算开始前',
  'fk.DetermineDamageCaused': '确定造成的伤害值时',
  'fk.DetermineDamageInflicted': '确定受到的伤害值时',

  'fk.CardUsing': '使用牌时',
  'fk.PreCardUse': '使用牌前',
  'fk.CardUseFinished': '使用牌结算结束后',
  'fk.AfterCardUseDeclared': '宣布使用牌后',
  'fk.AfterCardTargetDeclared': '确定使用目标后',
  'fk.PreCardEffect': '牌生效前',
  'fk.CardEffectCancelledOut': '牌被抵消后',
  'fk.CardResponding': '打出牌时',

  'fk.TargetSpecifying': '即将指定目标时',
  'fk.TargetSpecified': '指定目标后',
  'fk.TargetConfirming': '即将成为目标时',
  'fk.TargetConfirmed': '成为目标后',

  'fk.AfterCardsMove': '牌移动后',
  'fk.EnterDying': '进入濒死状态时',
  'fk.AfterDying': '濒死结算结束后',
  'fk.AskForPeaches': '濒死求桃时',
  'fk.Death': '死亡时',
  'fk.Deathed': '死亡结算后',

  'fk.HpChanged': '体力值变化后',
  'fk.HpRecover': '回复体力后',

  'fk.AskForRetrial': '判定牌生效前（可改判）',
  'fk.FinishJudge': '判定结束时',

  'fk.AskForCardUse': '被要求使用牌时',
  'fk.AskForCardResponse': '被要求打出牌时',

  'fk.StartPindian': '拼点开始时',
  'fk.PindianCardsDisplayed': '拼点牌亮出后',
  'fk.PindianResultConfirmed': '拼点结果确定后',

  'fk.TurnedOver': '翻面后',
  'fk.AfterSkillEffect': '技能生效后',
  'fk.EventLoseSkill': '失去技能时',
};

export const CONDITION_LABELS: Record<string, string> = {
  'has-skill': '我仍拥有此技能',
  'self-is-subject': '事件发生在我身上',
  'someone-else-is-subject': '事件发生在他人身上',
  'times-used': '此技能发动次数未超过',
  'in-phase': '当前是某阶段',
  'mark-value': '标记的值满足',
  'table-mark': '列表标记非空',
  'has-handcards': '有手牌',
  'has-any-cards': '有牌（任意区域）',
  'is-alive': '存活',
  'card-name-is': '牌名为',
  'card-count': '某区域的牌数满足',
  'move-area-is': '牌来自或去往',
  'player-count': '存活人数够多',
  'has-source': '此事件有来源角色',
  'hp-compare': '体力值满足',
  'move-involves-me': '这次移动与我有关',
  'card-type-is': '牌的类别为',
  'card-suit-or-colour': '牌的花色或颜色为',
  'can-discard': '这张牌可以被弃置',
  'pile-not-empty': '私人牌堆里有牌',
  'distance-or-range': '在距离或攻击范围之内',
  'is-wounded': '已受伤',
  'move-reason-is': '移动的原因为',
  'i-am-source': '这件事是我引发的',
  'can-use-card-to': '这张牌可以对其使用',
  'i-am-target': '我是目标',
  'equipment-check': '装备栏的状态',
  'room-state': '房间的标记或模式',
  'is-my-turn': '现在是我的回合',
  'kingdom-is': '势力为',
  'is-dying': '处于濒死状态',
  'is-turned-over': '已翻面或已横置',
  'damage-type-is': '伤害的属性为',
  'gender-is': '性别为',
  'damage-amount': '伤害点数满足',
  'card-number-is': '牌的点数在范围内',
  'switch-state': '转换技处于阴或阳',
  'amount-changed': '变化的点数足够多',
  'quest-state': '使命技已成功或已失败',
  'target-count': '这张牌的目标数',
};

export const EFFECT_LABELS: Record<string, string> = {
  draw: '摸牌',
  throw: '弃牌',
  obtain: '获得牌',
  recover: '回复体力',
  'lose-hp': '失去体力',
  damage: '造成伤害',
  'change-max-hp': '改变体力上限',
  'change-shield': '改变护甲',
  'set-mark': '设置标记',
  'add-mark': '增加标记',
  'table-mark': '向列表标记中添加',
  'private-mark': '设置私密标记',
  'grant-skill': '获得或失去技能',
  'suppress-skill': '暂时废除技能',
  'invalidate-skill': '使其技能失效',
  indicate: '画出指示线（动画）',
  log: '写入战报',
  delay: '停顿片刻',
  'active-use': '出牌阶段主动发动',
  'view-as': '视为使用或打出',
  'use-card': '令其使用一张牌',
  'use-virtual-card': '视为使用一张牌',
  'respond-card': '令其打出一张牌',
  'move-card-to': '将牌移动到',
  'move-cards': '移动牌（底层）',
  'from-draw-pile': '从牌堆取牌',
  'to-pile': '放入私人牌堆',
  'shared-pile': '使用公共牌堆',
  'into-equip': '置入装备栏',
  'show-cards': '展示牌',
  recast: '重铸',
  swap: '交换牌',
  'print-card': '凭空生成一张牌',
  'filter-card': '视作另一张牌',
  'card-mark': '标记这张牌',
  judge: '进行判定',
  retrial: '改判',
  'change-judge-card': '替换判定牌',
  pindian: '进行拼点',
  'change-damage': '改变伤害点数',
  'prevent-damage': '防止此伤害',
  'change-targets': '增加或减少目标',
  nullify: '抵消此牌对目标的效果',
  'no-response': '使其不可响应',
  prohibit: '禁止',
  'modify-card-limits': '改变牌的使用次数或目标数',
  'modify-hand-limit': '改变手牌上限',
  'modify-distance': '改变距离',
  'modify-attack-range': '改变攻击范围',
  'change-draw-count': '改变摸牌阶段的摸牌数',
  'skip-phase': '跳过一个阶段',
  'end-phase-early': '结束当前阶段',
  'extra-phase': '获得一个额外阶段',
  'extra-turn': '获得一个额外回合',
  'turn-over': '翻面',
  chain: '横置或重置（铁索）',
  'reset-state': '复原（翻回正面并解除横置）',
  'change-kingdom': '改变势力',
  awaken: '觉醒（每局一次，永久）',
  'charge-skill': '蓄力',
  'quest-state': '结算使命技',
  'kill-or-revive': '杀死或复活角色',
  banner: '设置全局标记',
  'set-property': '设置角色属性',
  'seal-area': '废除或恢复装备栏',
  'modify-visibility': '改变可见性',
  'draw-pile-manipulation': '操作牌堆',
  'clean-table': '清理处理区',
  'use-history': '改写使用次数记录',
  'free-use': '本次使用不计入次数限制',
  'pass-data': '把数据传给后续步骤',
  discussion: '进行议事',
  'ask-yes-no': '询问是否发动',
  'ask-choice': '询问选择一项',
  'ask-cards': '令其选择自己的牌',
  'ask-discard': '令其弃置牌',
  'ask-choose-card': '令其选择他人的一张牌',
  'ask-choose-players': '令其选择角色',
  'ask-use-card': '令其使用或打出一张牌',
  'ask-yiji': '令其将牌分配给他人',
  'ask-guanxing': '令其观星（重排牌堆顶）',
  'ask-arrange': '令其排列卡牌',
  'ask-view-cards': '给其看牌并询问',
  'ask-move-in-board': '令其移动场上的一张牌',
  'ask-custom': '通过扩展包的对话框询问',
};

/** Chinese for a block id of any kind, falling back to the generated label. */
export const blockLabel = (kind: BlockKind, id: string, fallback?: string): string => {
  const table =
    kind === 'trigger' ? TRIGGER_LABELS : kind === 'condition' ? CONDITION_LABELS : EFFECT_LABELS;
  return table[id] ?? fallback ?? id;
};

/** The heading a palette group gets. Groups come from the vocabulary. */
export const GROUP_LABELS: Record<string, string> = {
  flow: '流程',
  damage: '伤害',
  'card-use': '使用与打出',
  cards: '牌的移动',
  targeting: '指定目标',
  dying: '濒死与求桃',
  death: '死亡',
  hp: '体力',
  judge: '判定',
  pindian: '拼点',
  request: '被要求出牌',
  state: '状态',
  other: '其他',
  misc: '其他',
};

/* -------------------------------------------------------------------------- */
/* Parameters                                                                  */
/* -------------------------------------------------------------------------- */

export interface ParamOption {
  value: string;
  label: string;
}

export interface ParamSpec {
  /** What the block says before the widget, e.g. 「摸」 __ 「张」. */
  label: string;
  /** Printed after the widget: a unit, mostly. */
  suffix?: string;
  kind: 'select' | 'number' | 'text' | 'bool';
  options?: ParamOption[];
  min?: number;
  max?: number;
  placeholder?: string;
  /** What a freshly added block starts with. `undefined` leaves it unfilled. */
  fallback?: ParamValue;
}

/** 你 / 目标 / 伤害来源 / 所选角色 — the four a trigger's data can name. */
const WHO: ParamOption[] = [
  { value: 'self', label: '你' },
  { value: 'target', label: '目标' },
  { value: 'source', label: '伤害来源' },
  { value: 'chosen', label: '所选角色' },
];

const WHO_MANY: ParamOption[] = [
  { value: 'chosen', label: '所选角色' },
  { value: 'target', label: '目标' },
  { value: 'others', label: '其他所有角色' },
  { value: 'all', label: '所有角色' },
];

/** `Player.Start` … `Player.Finish` (lunarltk/core/player.lua:46-56). */
export const PHASES: ParamOption[] = [
  { value: 'Start', label: '准备阶段' },
  { value: 'Judge', label: '判定阶段' },
  { value: 'Draw', label: '摸牌阶段' },
  { value: 'Play', label: '出牌阶段' },
  { value: 'Discard', label: '弃牌阶段' },
  { value: 'Finish', label: '结束阶段' },
];

/** Zone flags as `Player:getCardIds` takes them. */
const ZONES: ParamOption[] = [
  { value: 'h', label: '手牌区' },
  { value: 'e', label: '装备区' },
  { value: 'j', label: '判定区' },
];

/** `Card.PlayerHand` … `Card.Void` (lunarltk/core/card.lua:84-103). */
const AREAS: ParamOption[] = [
  { value: 'PlayerHand', label: '手牌区' },
  { value: 'PlayerEquip', label: '装备区' },
  { value: 'PlayerJudge', label: '判定区' },
  { value: 'PlayerSpecial', label: '私人牌堆' },
  { value: 'Processing', label: '处理区' },
  { value: 'DrawPile', label: '牌堆' },
  { value: 'DiscardPile', label: '弃牌堆' },
  { value: 'Void', label: '牌堆外' },
];

/** `fk.ReasonDraw` … (lunarltk/server/system_enum.lua:71-84). */
const MOVE_REASONS: ParamOption[] = [
  { value: 'fk.ReasonDraw', label: '摸牌' },
  { value: 'fk.ReasonDiscard', label: '弃牌' },
  { value: 'fk.ReasonGive', label: '交给' },
  { value: 'fk.ReasonPrey', label: '获得' },
  { value: 'fk.ReasonUse', label: '使用' },
  { value: 'fk.ReasonResonse', label: '打出' },
  { value: 'fk.ReasonJustMove', label: '移动' },
  { value: 'fk.ReasonPut', label: '置入' },
];

const OPS: ParamOption[] = [
  { value: '>=', label: '不小于' },
  { value: '<=', label: '不大于' },
  { value: '==', label: '等于' },
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
];

/** `Player:usedSkillTimes` scopes (lunarltk/core/player.lua:65-68). */
const SCOPES: ParamOption[] = [
  { value: 'phase', label: '每阶段' },
  { value: 'turn', label: '每回合' },
  { value: 'round', label: '每轮' },
  { value: 'game', label: '每局' },
];

/**
 * The card names a block may name.
 *
 * Deliberately the standard pack's eighteen and no more. The vocabulary's own
 * rule is that blocks cover what most skills do and the agent lane covers the
 * tail; a dropdown of every card in thirteen packs is a scrolling list nobody
 * reads, and a free-text box is a spelling test whose failure mode is a skill
 * that silently does nothing.
 */
const CARD_NAMES: ParamOption[] = [
  { value: 'slash', label: '杀' },
  { value: 'jink', label: '闪' },
  { value: 'peach', label: '桃' },
  { value: 'analeptic', label: '酒' },
  { value: 'nullification', label: '无懈可击' },
  { value: 'duel', label: '决斗' },
  { value: 'snatch', label: '顺手牵羊' },
  { value: 'dismantlement', label: '过河拆桥' },
  { value: 'ex_nihilo', label: '无中生有' },
  { value: 'savage_assault', label: '南蛮入侵' },
  { value: 'archery_attack', label: '万箭齐发' },
  { value: 'god_salvation', label: '桃园结义' },
  { value: 'amazing_grace', label: '五谷丰登' },
  { value: 'collateral', label: '借刀杀人' },
  { value: 'fire_attack', label: '火攻' },
  { value: 'iron_chain', label: '铁索连环' },
  { value: 'indulgence', label: '乐不思蜀' },
  { value: 'lightning', label: '闪电' },
];

const CARD_SETS: ParamOption[] = [
  { value: 'chosen', label: '所选的牌' },
  { value: 'event', label: '本次事件的牌' },
  { value: 'hand', label: '全部手牌' },
  { value: 'equip', label: '装备区的牌' },
  { value: 'judge', label: '判定区的牌' },
];

/** Equip slot names (lunarltk/core/player.lua:70-76). */
const SLOTS: ParamOption[] = [
  { value: 'WeaponSlot', label: '武器' },
  { value: 'ArmorSlot', label: '防具' },
  { value: 'OffensiveRideSlot', label: '进攻马' },
  { value: 'DefensiveRideSlot', label: '防御马' },
  { value: 'TreasureSlot', label: '宝物' },
];

export const KINGDOM_OPTIONS: ParamOption[] = [
  { value: 'wei', label: '魏' },
  { value: 'shu', label: '蜀' },
  { value: 'wu', label: '吴' },
  { value: 'qun', label: '群' },
  { value: 'jin', label: '晋' },
];

export const GENDER_OPTIONS: ParamOption[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
];

/** By parameter name, when no block overrides it. */
const BY_NAME: Record<string, ParamSpec> = {
  who: { label: '令', kind: 'select', options: WHO, fallback: 'self' },
  from: { label: '由', kind: 'select', options: WHO, fallback: 'self' },
  to: { label: '对', kind: 'select', options: WHO, fallback: 'target' },
  target: { label: '对', kind: 'select', options: WHO, fallback: 'target' },
  thrower: { label: '弃牌者', kind: 'select', options: WHO, fallback: 'self' },
  a: { label: '角色', kind: 'select', options: WHO, fallback: 'self' },
  b: { label: '与', kind: 'select', options: WHO, fallback: 'target' },
  targets: { label: '对象', kind: 'select', options: WHO_MANY, fallback: 'chosen' },
  tos: { label: '目标', kind: 'select', options: WHO_MANY, fallback: 'chosen' },

  count: { label: '数量', suffix: '张', kind: 'number', min: 1, max: 20, fallback: 1 },
  amount: { label: '点数', suffix: '点', kind: 'number', min: 1, max: 12, fallback: 1 },
  min: { label: '至少', suffix: '张', kind: 'number', min: 0, max: 20, fallback: 1 },
  max: { label: '至多', suffix: '张', kind: 'number', min: 1, max: 20, fallback: 1 },
  value: { label: '值', kind: 'number', min: -20, max: 20, fallback: 1 },
  delta: { label: '增减', kind: 'number', min: -10, max: 10, fallback: 1 },
  limit: { label: '上限', suffix: '次', kind: 'number', min: 1, max: 10, fallback: 1 },
  range: { label: '距离', kind: 'number', min: 1, max: 10, fallback: 1 },
  extraUses: { label: '额外次数', kind: 'number', min: 0, max: 10, fallback: 1 },
  extraTargets: { label: '额外目标', kind: 'number', min: 0, max: 10, fallback: 1 },
  number: { label: '点数', kind: 'number', min: 1, max: 13, fallback: 1 },

  mark: { label: '标记', kind: 'text', placeholder: '如 @@fenli', fallback: '' },
  skill: { label: '技能', kind: 'text', placeholder: '技能 id', fallback: '' },
  skills: { label: '技能', kind: 'text', placeholder: '技能 id，逗号分隔', fallback: '' },
  pile: { label: '牌堆名', kind: 'text', placeholder: '如 &bifa', fallback: '' },
  banner: { label: '标记名', kind: 'text', placeholder: '如 @@zhaoxiang', fallback: '' },
  choices: { label: '选项', kind: 'text', placeholder: '选项，逗号分隔', fallback: '' },
  prompt: { label: '提示语', kind: 'text', placeholder: '留空则用技能名', fallback: '' },
  pattern: { label: '牌型', kind: 'text', placeholder: '留空为任意牌', fallback: '' },
  reason: { label: '原因', kind: 'select', options: MOVE_REASONS, fallback: 'fk.ReasonJustMove' },
  moveReason: { label: '原因', kind: 'select', options: MOVE_REASONS, fallback: 'fk.ReasonJustMove' },

  op: { label: '', kind: 'select', options: OPS, fallback: '>=' },
  scope: { label: '', kind: 'select', options: SCOPES, fallback: 'turn' },
  phase: { label: '阶段', kind: 'select', options: PHASES, fallback: 'Play' },
  phases: {
    label: '阶段',
    kind: 'select',
    options: [{ value: 'all', label: '全部阶段' }, ...PHASES],
    fallback: 'all',
  },
  zone: { label: '区域', kind: 'select', options: ZONES, fallback: 'h' },
  area: { label: '区域', kind: 'select', options: AREAS, fallback: 'PlayerHand' },
  toArea: { label: '去往', kind: 'select', options: AREAS, fallback: 'PlayerHand' },
  fromPlace: {
    label: '从',
    kind: 'select',
    options: [{ value: 'top', label: '牌堆顶' }, { value: 'bottom', label: '牌堆底' }],
    fallback: 'top',
  },

  cards: { label: '牌', kind: 'select', options: CARD_SETS, fallback: 'chosen' },
  ids: { label: '牌', kind: 'select', options: CARD_SETS, fallback: 'chosen' },
  card: { label: '牌', kind: 'select', options: CARD_NAMES, fallback: 'slash' },
  cardName: { label: '牌名', kind: 'select', options: CARD_NAMES, fallback: 'slash' },

  cardType: {
    label: '类别',
    kind: 'select',
    fallback: 'basic',
    options: [
      { value: 'basic', label: '基本牌' },
      { value: 'trick', label: '锦囊牌' },
      { value: 'equip', label: '装备牌' },
    ],
  },
  suit: {
    label: '花色',
    kind: 'select',
    fallback: 'spade',
    options: [
      { value: 'spade', label: '♠ 黑桃' },
      { value: 'heart', label: '♥ 红桃' },
      { value: 'club', label: '♣ 梅花' },
      { value: 'diamond', label: '♦ 方块' },
      { value: 'red', label: '红色' },
      { value: 'black', label: '黑色' },
    ],
  },
  damageType: {
    label: '属性',
    kind: 'select',
    fallback: 'normal',
    options: [
      { value: 'fk.NormalDamage', label: '普通伤害' },
      { value: 'fk.FireDamage', label: '火焰伤害' },
      { value: 'fk.ThunderDamage', label: '雷电伤害' },
      { value: 'fk.IceDamage', label: '冰冻伤害' },
    ],
  },
  kingdom: { label: '势力', kind: 'select', options: KINGDOM_OPTIONS, fallback: 'wei' },
  gender: { label: '性别', kind: 'select', options: GENDER_OPTIONS, fallback: 'male' },
  slot: { label: '装备栏', kind: 'select', options: SLOTS, fallback: 'WeaponSlot' },
  slots: { label: '装备栏', kind: 'select', options: SLOTS, fallback: 'WeaponSlot' },
  what: {
    label: '禁止',
    kind: 'select',
    fallback: 'use',
    options: [
      { value: 'use', label: '使用' },
      { value: 'response', label: '打出' },
      { value: 'discard', label: '弃置' },
      { value: 'pindian', label: '拼点' },
    ],
  },
  duration: {
    label: '持续',
    kind: 'select',
    fallback: 'turn',
    options: [
      { value: 'turn', label: '本回合' },
      { value: 'round', label: '本轮' },
      { value: 'game', label: '本局' },
    ],
  },

  visible: { label: '明置', kind: 'bool', fallback: false },
  skip: { label: '只选不执行', kind: 'bool', fallback: true },
  chained: { label: '横置', kind: 'bool', fallback: true },
};

/**
 * Where a block means something else by a name everybody else shares.
 *
 * `from` is the offender: a player for `damage`, an end of the draw pile for
 * `from-draw-pile`. Getting this wrong is not a cosmetic bug — it emits
 * `Room:getNCards(2, "self")` and the skill dies inside the engine, silently.
 */
const BLOCK_PARAM_OVERRIDES: Record<string, Record<string, ParamSpec>> = {
  'from-draw-pile': {
    from: {
      label: '从',
      kind: 'select',
      fallback: 'top',
      options: [{ value: 'top', label: '牌堆顶' }, { value: 'bottom', label: '牌堆底' }],
    },
  },
  'set-mark': { value: { label: '设为', kind: 'number', min: -20, max: 20, fallback: 1 } },
  'add-mark': { count: { label: '增加', kind: 'number', min: -20, max: 20, fallback: 1 } },
  'table-mark': { value: { label: '加入', kind: 'text', placeholder: '要记下的内容', fallback: '' } },
  banner: { value: { label: '设为', kind: 'text', placeholder: '标记的值', fallback: '' } },
  judge: { reason: { label: '原因', kind: 'text', placeholder: '技能 id', fallback: '' } },
  throw: { who: { label: '弃置', kind: 'select', options: WHO, fallback: 'self' } },
  'ask-discard': { min: { label: '至少弃', suffix: '张', kind: 'number', min: 0, max: 20, fallback: 1 } },
  'change-targets': { who: { label: '增减', kind: 'select', options: WHO, fallback: 'chosen' } },
  'modify-card-limits': { cardName: { label: '对', kind: 'select', options: CARD_NAMES, fallback: 'slash' } },
  'card-count': { value: { label: '', kind: 'number', min: 0, max: 20, fallback: 1 } },
  'hp-compare': { value: { label: '', kind: 'number', min: 0, max: 12, fallback: 1 } },
  'damage-amount': { value: { label: '', kind: 'number', min: 1, max: 12, fallback: 1 } },
  'mark-value': { value: { label: '', kind: 'number', min: 0, max: 20, fallback: 1 } },
  'times-used': { limit: { label: '不超过', suffix: '次', kind: 'number', min: 1, max: 10, fallback: 1 } },
};

/** How a parameter of this block is edited. Never null for a real block param. */
export const paramSpec = (blockId: string, name: string): ParamSpec =>
  BLOCK_PARAM_OVERRIDES[blockId]?.[name] ??
  BY_NAME[name] ?? { label: name, kind: 'text', fallback: '' };

/** What a parameter's value reads as on the block face. */
export const paramText = (blockId: string, name: string, value: ParamValue | undefined): string => {
  const spec = paramSpec(blockId, name);
  if (value === undefined || value === '') return '—';
  if (spec.kind === 'bool') return value ? '是' : '否';
  if (spec.kind === 'select') {
    return spec.options?.find((o) => o.value === String(value))?.label ?? String(value);
  }
  return String(value);
};

/**
 * A freshly clicked block, with everything the engine has no default for
 * already filled in.
 *
 * Adding a block that is instantly an error teaches the player that the panel
 * is a nag; adding one that already says 「摸 1 张」 teaches them what it does.
 * The parameters with no sensible guess — a mark's name, a list of choices —
 * are left empty on purpose, and those are exactly the ones `validateSpec`
 * asks for.
 */
export const defaultParams = (kind: BlockKind, id: string): Record<string, ParamValue> => {
  const out: Record<string, ParamValue> = {};
  for (const name of paramsOf(kind, id) ?? []) {
    const fallback = paramSpec(id, name).fallback;
    if (fallback !== undefined && fallback !== '') out[name] = fallback;
  }
  return out;
};
