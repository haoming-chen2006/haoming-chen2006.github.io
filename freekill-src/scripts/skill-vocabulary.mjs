// The block dictionary: what a skill can be made of, and where the engine says so.
//
// Every entry carries a `citation` naming the Lua that implements it. That is
// the point of the file rather than decoration — the hero designer offers these
// as blocks, and a block that promises something the engine has no method for
// produces a skill that loads clean and silently does nothing. Lua resolves a
// method at the call, not at load, and the engine swallows errors raised inside
// a skill, so the failure is invisible: the general card still prints the
// skill. `roster.test.ts` exists because that already happened twice.
//
// Paths are relative to the engine tree (`FK_ROOT`, default `~/FreeKill`).
// Room is a composite — `Room` (lunarltk/server/room.lua:12) is `AbstractRoom`
// plus `ServerRoomBase` (server/roombase.lua) plus `GameEventWrappers`
// (lunarltk/server/events/init.lua) — so `room:damage` is NOT in room.lua. Each
// citation names the file that really defines the method.
//
// `match` is the evidence, not the contract: patterns are matched against Lua
// with comments and string literals blanked out, so a mention inside a prompt
// string is not a hit.

/** Trigger-event superclass -> the group a block panel would file it under. */
export const TRIGGER_FAMILIES = {
  DamageEvent: 'damage',
  HpChangedEvent: 'hp', HpLostEvent: 'hp', RecoverEvent: 'hp', MaxHpChangedEvent: 'hp',
  DyingEvent: 'dying', DeathEvent: 'death', ReviveEvent: 'death',
  MoveCardsEvent: 'cards', DrawCardEvent: 'cards',
  UseCardEvent: 'card-use', RespondCardEvent: 'card-use', CardEffectEvent: 'card-use',
  AimEvent: 'targeting', AimData: 'targeting', // usecard.lua:641 misnames the base class
  SkillEvent: 'skill', SkillModifyEvent: 'skill',
  JudgeEvent: 'judge', PindianEvent: 'pindian',
  RoundEvent: 'flow', TurnEvent: 'flow', PhaseEvent: 'flow',
  DrawNCardsEvent: 'flow', DrawInitialEvent: 'flow', StartPlayCardEvent: 'flow',
  PropertyChangeEvent: 'state', SimpleChangeEvent: 'state', AreaEvent: 'state',
  GeneralEvent: 'state', AskForCardEvent: 'request', NilEvent: 'misc',
  TriggerEvent: 'misc',
};

/**
 * What `can_trigger` tests.
 *
 * A trigger alone almost never decides whether a skill fires: `fk.Damaged`
 * fires for every player at the table and the skill has to say "and it was me".
 * These are the tests that recur, and each is a candidate condition block.
 */
export const CONDITIONS = {
  'self-is-subject': {
    label: 'the event happened to me',
    citation: 'lunarltk/core/skill_type/trigger.lua:43 — TriggerSkill:triggerable defaults to `target == player`',
    match: [/\btarget\s*==\s*player\b/, /\bplayer\s*==\s*target\b/],
  },
  'someone-else-is-subject': {
    label: 'the event happened to somebody else',
    citation: 'lunarltk/core/skill_type/trigger.lua:43 — the default is target == player; this overrides it',
    match: [/\btarget\s*~=\s*player\b/, /\bplayer\s*~=\s*target\b/],
  },
  'has-skill': {
    label: 'I still have the skill',
    citation: 'lunarltk/core/player.lua — Player:hasSkill(skill, ignoreNullify, ignoreAlive)',
    match: [/:hasSkill\s*\(/],
  },
  'is-alive': {
    label: 'the player is alive',
    citation: 'lunarltk/core/player.lua — Player.dead / Player:isAlive()',
    match: [/:isAlive\s*\(/, /\.dead\b/, /:isDead\s*\(/],
  },
  'in-phase': {
    label: 'we are in a named phase',
    citation: 'lunarltk/core/player.lua:46-56 — Player.Start/Judge/Draw/Play/Discard/Finish; '
      + 'the phase events are generic and discriminate on data.phase (server/events/gameflow.lua:389)',
    params: ['phase'],
    match: [/\bPlayer\.(RoundStart|Start|Judge|Draw|Play|Discard|Finish|NotActive|PhaseNone)\b/],
  },
  'is-my-turn': {
    label: "it is my own turn",
    citation: 'lunarltk/core/player.lua — Player:isCurrent(); server/roombase.lua — Room.current',
    match: [/:isCurrent\s*\(/, /room\.current\b/, /\.current\s*==\s*player\b/],
  },
  'is-wounded': {
    label: 'the player is wounded',
    citation: 'lunarltk/core/player.lua — Player:isWounded() / Player:getLostHp()',
    match: [/:isWounded\s*\(/, /:getLostHp\s*\(/],
  },
  'hp-compare': {
    label: 'a health comparison',
    citation: 'lunarltk/core/player.lua — Player.hp / Player.maxHp / Player.shield',
    params: ['who', 'op', 'value'],
    match: [/\.hp\s*[<>=~]/, /\.maxHp\s*[<>=~]/, /\.shield\s*[<>=~]/, /[<>=~]=?\s*\w+\.hp\b/],
  },
  'has-handcards': {
    label: 'the player has cards in hand',
    citation: 'lunarltk/core/player.lua — Player:isKongcheng() / Player:getHandcardNum()',
    match: [/:isKongcheng\s*\(/, /:getHandcardNum\s*\(/],
  },
  'has-any-cards': {
    label: 'the player has any card at all',
    citation: 'lunarltk/core/player.lua — Player:isNude() / Player:isAllNude()',
    match: [/:isNude\s*\(/, /:isAllNude\s*\(/],
  },
  'card-count': {
    label: 'how many cards a zone holds',
    citation: 'lunarltk/core/player.lua — Player:getCardIds(flag) with "h"/"e"/"j" zone flags',
    params: ['who', 'zone', 'op', 'value'],
    match: [/:getCardIds\s*\(/],
  },
  'mark-value': {
    label: 'a mark is at a value',
    citation: 'core/player.lua:67 — Player:getMark(name) returns 0 when absent, never nil',
    params: ['mark', 'op', 'value'],
    match: [/:getMark\s*\(/, /:hasMark\s*\(/],
  },
  'table-mark': {
    label: 'a list-valued mark contains something',
    citation: 'core/player.lua:79 — Player:getTableMark(name) returns {} when absent',
    params: ['mark'],
    match: [/:getTableMark\s*\(/],
  },
  'times-used': {
    label: 'how often the skill already fired',
    citation: 'lunarltk/core/player.lua — Player:usedSkillTimes(name, scope); scopes at player.lua:65-68 '
      + '(HistoryPhase/Turn/Round/Game)',
    params: ['scope', 'limit'],
    match: [/:usedSkillTimes\s*\(/, /:usedEffectTimes\s*\(/, /:usedCardTimes\s*\(/],
  },
  'card-name-is': {
    label: 'the card is a named card',
    citation: 'lunarltk/core/card.lua — Card.name / Card.trueName',
    params: ['cardName'],
    match: [/\.trueName\s*==/, /card\.name\s*==/, /\.name\s*==\s*"(slash|jink|peach|analeptic)"/],
  },
  'card-type-is': {
    label: 'the card is of a type',
    citation: 'lunarltk/core/card.lua — Card.type / Card.sub_type; Card.TypeBasic/TypeTrick/TypeEquip',
    params: ['cardType'],
    match: [/Card\.Type(Basic|Trick|Equip|Skill)\b/, /Card\.Sub(Type\w+)\b/, /\.sub_type\s*==/],
  },
  'card-suit-or-colour': {
    label: 'the card is a suit or colour',
    citation: 'lunarltk/core/card.lua — Card.suit / Card.color / Card:isRed() / Card:isBlack()',
    params: ['suit'],
    match: [/Card\.(Spade|Heart|Club|Diamond|NoSuit)\b/, /:isRed\s*\(/, /:isBlack\s*\(/, /\.color\s*==/],
  },
  'card-number-is': {
    label: 'the card number is in a range',
    citation: 'lunarltk/core/card.lua — Card.number (1..13)',
    match: [/\.number\s*[<>=~]/],
  },
  'damage-amount': {
    label: 'the damage is at least N',
    citation: 'lunarltk/core/events/hp.lua:60-73 — DamageDataSpec.damage',
    params: ['op', 'value'],
    match: [/data\.damage\s*[<>=~]/],
  },
  'damage-type-is': {
    label: 'the damage is of an element',
    citation: 'lunarltk/core/events/hp.lua:54-57 — fk.NormalDamage/ThunderDamage/FireDamage/IceDamage',
    params: ['damageType'],
    match: [/fk\.(Normal|Thunder|Fire|Ice)Damage\b/],
  },
  'has-source': {
    label: 'the event has a source player',
    citation: 'lunarltk/core/events/hp.lua:60-73 — DamageDataSpec.from is optional',
    match: [/\bdata\.from\b/],
  },
  'i-am-source': {
    label: 'I caused it',
    citation: 'lunarltk/core/events/hp.lua — DamageDataSpec.from; events/usecard.lua:28 UseCardDataSpec.from',
    match: [/data\.from\s*==\s*player\b/, /player\s*==\s*data\.from\b/],
  },
  'i-am-target': {
    label: 'I am the target',
    citation: 'lunarltk/core/events/hp.lua — DamageDataSpec.to; events/usecard.lua — AimData.to',
    match: [/data\.to\s*==\s*player\b/, /player\s*==\s*data\.to\b/],
  },
  'amount-changed': {
    label: 'the amount is at least N',
    citation: 'lunarltk/core/events/hp.lua:19-28 HpLostDataSpec.num; :95-105 RecoverDataSpec.num',
    match: [/data\.num\s*[<>=~]/],
  },
  'move-reason-is': {
    label: 'the cards moved for a reason',
    citation: 'lunarltk/server/system_enum.lua:71-84 — fk.ReasonDraw/Discard/Give/Prey/Use/…',
    params: ['reason'],
    match: [/fk\.Reason\w+/],
  },
  'move-area-is': {
    label: 'the cards came from / went to a zone',
    citation: 'lunarltk/core/card.lua:84-103 — Card.PlayerHand/PlayerEquip/PlayerJudge/PlayerSpecial/'
      + 'Processing/DrawPile/DiscardPile/Void',
    params: ['area'],
    match: [/Card\.(PlayerHand|PlayerEquip|PlayerJudge|PlayerSpecial|Processing|DrawPile|DiscardPile|Void|Unknown)\b/],
  },
  'move-involves-me': {
    label: 'the move was from or to me',
    citation: 'lunarltk/core/events/movecard.lua:29-42 — MoveCardsDataSpec.from / .to; note the payload '
      + 'for fk.BeforeCardsMove / fk.AfterCardsMove is an ARRAY of these (movecard.lua:49)',
    match: [/move\.from\s*==\s*player\b/, /move\.to\s*==\s*player\b/],
  },
  'distance-or-range': {
    label: 'the target is within range',
    citation: 'lunarltk/core/player.lua — Player:distanceTo(other) / Player:inMyAttackRange(other)',
    params: ['range'],
    match: [/:distanceTo\s*\(/, /:inMyAttackRange\s*\(/],
  },
  'kingdom-is': {
    label: 'the player belongs to a kingdom',
    citation: 'lunarltk/core/player.lua — Player.kingdom; Fk.kingdoms',
    params: ['kingdom'],
    match: [/\.kingdom\s*==/, /:getKingdom\s*\(/],
  },
  'gender-is': {
    label: 'the player is male or female',
    citation: 'lunarltk/core/player.lua — Player:isMale() / Player:isFemale()',
    params: ['gender'],
    match: [/:isMale\s*\(/, /:isFemale\s*\(/],
  },
  'equipment-check': {
    label: 'an equip slot is filled or empty',
    citation: 'lunarltk/core/player.lua — Player:getEquipments(subtype) / Player:hasEmptyEquipSlot() / '
      + 'Player:getAvailableEquipSlots(); slot names at player.lua:70-76',
    params: ['slot'],
    match: [/:getEquipments\s*\(/, /:hasEmptyEquipSlot\s*\(/, /:getAvailableEquipSlots\s*\(/, /:getEquipCards\s*\(/],
  },
  'pile-not-empty': {
    label: 'a private pile has cards',
    citation: 'lunarltk/core/player.lua — Player:getPile(name); piles are Card.PlayerSpecial (card.lua:84-103)',
    params: ['pile'],
    match: [/:getPile\s*\(/],
  },
  'is-turned-over': {
    label: 'the player is face-down or chained',
    citation: 'lunarltk/core/player.lua — Player.faceup / Player.chained',
    match: [/\.faceup\b/, /\.chained\b/],
  },
  'is-dying': {
    label: 'the player is dying',
    citation: 'lunarltk/core/events/death.lua:3-12 — DyingDataSpec; Player.dying',
    match: [/\.dying\b/],
  },
  'target-count': {
    label: 'how many targets the card has',
    citation: 'lunarltk/core/events/usecard.lua:28-54 — UseCardDataSpec.tos',
    match: [/#data\.tos\b/, /#\w+\.tos\b/],
  },
  'can-use-card-to': {
    label: 'the card could legally be used on them',
    citation: 'lunarltk/core/player.lua — Player:canUseTo(card, to, extra) / Player:prohibitUse(card)',
    match: [/:canUseTo\s*\(/, /:canUse\s*\(/, /:prohibitUse\s*\(/, /:isProhibited\s*\(/],
  },
  'can-discard': {
    label: 'the card may legally be discarded',
    citation: 'lunarltk/core/player.lua — Player:prohibitDiscard(card)',
    match: [/:prohibitDiscard\s*\(/],
  },
  'room-state': {
    label: 'a room-wide flag or mode',
    citation: 'server/roombase.lua:520 Room:setBanner / core/roombase.lua:76 Room:getBanner; '
      + 'Room:isGameMode(name)',
    params: ['banner'],
    match: [/:getBanner\s*\(/, /:isGameMode\s*\(/, /:getSettings\s*\(/],
  },
  'switch-state': {
    label: 'a 转换技 is on yin or yang',
    citation: 'lunarltk/core/player.lua — Player:getSwitchSkillState(name); fk.SwitchYang / fk.SwitchYin; '
      + 'Skill.Switch tag at lunarltk/core/skill.lua:36',
    match: [/:getSwitchSkillState\s*\(/, /fk\.Switch(Yang|Yin)\b/],
  },
  'quest-state': {
    label: 'a 使命技 has succeeded or failed',
    citation: 'lunarltk/core/player.lua — Player:getQuestSkillState(name); '
      + 'server/room.lua:3299 Room:updateQuestSkillState',
    match: [/:getQuestSkillState\s*\(/],
  },
  'player-count': {
    label: 'how many players are alive',
    citation: 'server/roombase.lua — Room.alive_players / Room:getAlivePlayers() / Room:getOtherPlayers()',
    match: [/:getAlivePlayers\s*\(/, /\.alive_players\b/, /#room:getOtherPlayers/],
  },
};

/**
 * What a skill does — the effect blocks.
 *
 * The split between "does" and "asks" is real but not clean, and the engine is
 * the reason: six `askTo*` methods perform their action unless passed
 * `skip = true` (`askToDiscard` throws the cards at room.lua:790,
 * `askToGuanxing` reorders the pile at :1833). So an ask appears in both
 * dictionaries, and a designer that offers "choose cards" and "discard them" as
 * two blocks must emit `skip` on the first or the cards are thrown twice.
 */
export const EFFECTS = {
  /* ------------------------------------------------------- cards: gaining */
  draw: {
    label: 'draw cards',
    citation: 'lunarltk/server/events/movecard.lua:424 — Room:drawCards(player, num, skillName, '
      + 'fromPlace, moveMark); serverplayer.lua:254 — ServerPlayer:drawCards(num, skillName, …). '
      + 'Fires fk.BeforeDrawCard first, which may rewrite num.',
    params: ['who', 'count', 'fromPlace'],
    match: [/:drawCards\s*[({]/],
  },
  obtain: {
    label: 'gain a card into hand',
    citation: 'lunarltk/server/events/movecard.lua:413 — Room:obtainCard(player, card, visible, reason, '
      + 'proposer, skillName, …); a wrapper over moveCardTo(…, Card.PlayerHand, …)',
    params: ['who', 'cards', 'visible'],
    match: [/:obtainCard\s*[({]/],
  },
  'from-draw-pile': {
    label: 'take cards off the draw pile',
    citation: 'server/room.lua:295 — Room:getNCards(num, from) PEEKS ids without moving them; pair it '
      + 'with moveCards. Room:getCardsFromPileByRule(pattern, num, fromPile) for a filtered pick.',
    params: ['count', 'from'],
    match: [/:getNCards\s*[({]/, /:getCardsFromPileByRule\s*[({]/, /:getSubcardsByRule\s*[({]/],
  },
  'print-card': {
    label: 'mint a brand-new card',
    citation: 'server/room.lua:3289 — Room:printCard(name, suit, number); '
      + 'Room:prepareDeriveCards for a batch. A name the engine does not have throws at cloneCard.',
    params: ['cardName', 'suit', 'number'],
    match: [/:printCard\s*[({]/, /:prepareDeriveCards\s*[({]/],
  },

  /* ------------------------------------------------------- cards: losing */
  throw: {
    label: 'discard cards',
    citation: 'lunarltk/server/events/movecard.lua:522 — Room:throwCard(card_ids, skillName, who, '
      + 'thrower). ASSERTS every card is owned by `who` (movecard.lua:525): to discard a target\'s '
      + 'cards, `who` is the target and `thrower` is the skill owner.',
    params: ['cards', 'who', 'thrower'],
    match: [/:throwCard\s*[({]/, /:throwAllCards\s*[({]/],
  },
  recast: {
    label: 'recast (discard then redraw the same number)',
    citation: 'lunarltk/server/events/movecard.lua:544 — Room:recastCard(card_ids, who, skillName, moveMark)',
    params: ['cards', 'who'],
    match: [/:recastCard\s*[({]/],
  },

  /* ------------------------------------------------------- cards: moving */
  'move-card-to': {
    label: 'move cards to a player or zone',
    citation: 'lunarltk/server/events/movecard.lua:470 — Room:moveCardTo(card, to_place, target, reason, '
      + 'skill_name, special_name, visible, proposer, …). Asserts a target when to_place is a player area.',
    params: ['cards', 'toArea', 'target', 'reason'],
    match: [/:moveCardTo\s*[({]/],
  },
  'move-cards': {
    label: 'a raw card move',
    citation: 'lunarltk/server/events/movecard.lua:368 — Room:moveCards(...CardsMoveInfo) takes VARARGS, '
      + 'not a list. CardsMoveInfo shape at lunarltk/core/events/movecard.lua:4-18; infoCheck enforces '
      + 'a valid toArea, a specialName when toArea is Card.PlayerSpecial, and a numeric moveReason.',
    params: ['ids', 'from', 'to', 'toArea', 'moveReason'],
    match: [/:moveCards\s*[({]/],
  },
  swap: {
    label: 'swap cards between players',
    citation: 'lunarltk/server/events/movecard.lua:758 Room:swapCards(player, card_data, skillName, '
      + 'toArea); :881 swapAllCards(player, targets, skillName, flag); :904 swapCardsWithPile',
    params: ['a', 'b', 'zone'],
    match: [/:swapCards\s*[({]/, /:swapAllCards\s*[({]/, /:swapCardsWithPile\s*[({]/],
  },
  'to-pile': {
    label: 'put cards into a private pile',
    citation: 'lunarltk/server/serverplayer.lua:265 — ServerPlayer:addToPile(pile_name, card, visible, '
      + 'skillName, …), which moves to Card.PlayerSpecial. A pile named in `derived_piles` is discarded '
      + 'automatically when the skill is lost (skill_skeleton.lua:765-788).',
    params: ['pile', 'cards', 'visible'],
    match: [/:addToPile\s*[({]/, /:setPlayerPile\s*[({]/],
  },
  'into-equip': {
    label: 'put a card into an equip slot',
    citation: 'lunarltk/server/events/movecard.lua:642 — Room:moveCardIntoEquip(target, cards, skillName, '
      + 'convert, proposer). BLOCKS: asks which equip to replace when the slot is full (movecard.lua:662).',
    params: ['target', 'cards'],
    match: [/:moveCardIntoEquip\s*[({]/],
  },
  yiji: {
    label: 'distribute cards to several players',
    citation: 'lunarltk/server/events/movecard.lua:579 — Room:doYiji(list, proposer, skillName, moveMark); '
      + '`list` is keyed by PLAYER ID, values are id arrays',
    params: ['distribution'],
    match: [/:doYiji\s*[({]/],
  },
  'draw-pile-manipulation': {
    label: 'reorder or reveal the draw pile',
    citation: 'lunarltk/server/events/movecard.lua:709 Room:turnOverCardsFromDrawPile; :729 '
      + 'returnCardsToDrawPile; server/room.lua:3133 shuffleDrawPile',
    match: [/:turnOverCardsFromDrawPile\s*[({]/, /:returnCardsToDrawPile\s*[({]/, /:shuffleDrawPile\s*[({]/],
  },
  'clean-table': {
    label: 'sweep the processing area',
    citation: 'server/room.lua:3499 — Room:cleanProcessingArea(cards, skillName)',
    match: [/:cleanProcessingArea\s*[({]/],
  },
  'show-cards': {
    label: 'reveal cards to everybody',
    citation: 'lunarltk/server/serverplayer.lua:91 ServerPlayer:showCards(cards, proposer) — applies '
      + 'lock-view filters; server/room.lua:3719 Room:showCards does NOT (see the warning at :3715)',
    params: ['cards', 'who'],
    match: [/:showCards\s*[({]/],
  },

  /* --------------------------------------------------------------- health */
  damage: {
    label: 'deal damage',
    citation: 'lunarltk/server/events/hp.lua:326 — Room:damage(DamageDataSpec); spec at '
      + 'lunarltk/core/events/hp.lua:60-73 {from?, to, damage, card?, damageType?, skillName?, chain?}. '
      + 'No-ops when damage < 1 (hp.lua:194). Can cascade into dying and open peach requests.',
    params: ['from', 'to', 'amount', 'damageType'],
    match: [/:damage\s*[({]/],
  },
  'lose-hp': {
    label: 'lose health',
    citation: 'lunarltk/server/events/hp.lua:375 — Room:loseHp(player, num, skillName, proposer). '
      + 'Not preventable by armour or damage prevention — it is not damage.',
    params: ['who', 'amount'],
    match: [/:loseHp\s*[({]/],
  },
  recover: {
    label: 'recover health',
    citation: 'lunarltk/server/events/hp.lua:443 — Room:recover(RecoverDataSpec {who, num, recoverBy?, '
      + 'skillName?, card?}). CLAMPED to maxHp - hp (hp.lua:424) and prevented outright at full health.',
    params: ['who', 'amount'],
    match: [/:recover\s*[({]/],
  },
  'change-max-hp': {
    label: 'change maximum health',
    citation: 'lunarltk/server/events/hp.lua:509 — Room:changeMaxHp(player, num). Floors at 0, and '
      + 'maxHp reaching 0 KILLS the player (hp.lua:496).',
    params: ['who', 'delta'],
    match: [/:changeMaxHp\s*[({]/],
  },
  'change-shield': {
    label: 'change armour (护甲)',
    citation: 'server/room.lua:3020 — Room:changeShield(player, num); clamped to [0,5] (room.lua:3022)',
    params: ['who', 'delta'],
    match: [/:changeShield\s*[({]/],
  },
  'change-hp': {
    label: 'change health directly',
    citation: 'lunarltk/server/events/hp.lua:156 — Room:changeHp(player, num, reason, skillName, '
      + 'damageData, hpLostData). The primitive under damage/loseHp/recover; a skill should normally '
      + 'reach for one of those instead.',
    params: ['who', 'delta', 'reason'],
    match: [/:changeHp\s*[({]/],
  },
  'kill-or-revive': {
    label: 'kill or revive a player',
    citation: 'lunarltk/server/events/death.lua:142 Room:killPlayer(DeathDataSpec); :186 revivePlayer; '
      + ':66 enterDying',
    match: [/:killPlayer\s*[({]/, /:revivePlayer\s*[({]/, /:enterDying\s*[({]/],
  },

  /* ---------------------------------------------------------------- state */
  'turn-over': {
    label: 'turn the character face-down or up',
    citation: 'lunarltk/server/serverplayer.lua:59 — ServerPlayer:turnOver(data); preventable via '
      + 'fk.BeforeTurnOver',
    params: ['who'],
    match: [/:turnOver\s*[({]/],
  },
  chain: {
    label: 'set the iron-chain state',
    citation: 'lunarltk/server/serverplayer.lua:389 — ServerPlayer:setChainState(chained, data)',
    params: ['who', 'chained'],
    match: [/:setChainState\s*[({]/],
  },
  'reset-state': {
    label: 'turn face up and unchain',
    citation: 'lunarltk/server/serverplayer.lua:418 — ServerPlayer:reset()',
    params: ['who'],
    match: [/:reset\s*\(\s*\)/],
  },
  'redirect-phase': {
    label: 'run a different phase instead',
    citation: 'lunarltk/core/events/gameflow.lua:123-132 — PhaseData.phase, rewritten under '
      + 'fk.EventPhaseChanging before Phase:main runs (server/gameflow.lua:356)',
    params: ['phase'],
    match: [/\bdata\.phase\s*=[^=]/],
  },
  'skip-phase': {
    label: 'skip a phase',
    citation: 'lunarltk/server/serverplayer.lua:152 — ServerPlayer:skip(phase); only affects phases '
      + 'LATER than the current index. Or set data.skipped = true in fk.EventPhaseChanging '
      + '(lunarltk/core/events/gameflow.lua:149).',
    params: ['phase'],
    match: [/:skip\s*[({]/, /\.skipped\s*=\s*true/, /:endPlayPhase\s*[({]/, /:endCurrentPhase\s*[({]/],
  },
  'extra-turn': {
    label: 'grant an extra turn',
    citation: 'lunarltk/server/serverplayer.lua:206 — ServerPlayer:gainAnExtraTurn(delay, skillName, '
      + 'phases, extra_data). `delay` DEFAULTS TRUE, which queues the turn rather than running it.',
    params: ['who', 'phases'],
    match: [/:gainAnExtraTurn\s*[({]/],
  },
  'extra-phase': {
    label: 'grant an extra phase',
    citation: 'lunarltk/server/serverplayer.lua:121 — ServerPlayer:gainAnExtraPhase(phase, skillName, '
      + 'delay, extra_data); same delay-defaults-true queuing',
    params: ['who', 'phase'],
    match: [/:gainAnExtraPhase\s*[({]/],
  },
  'end-turn': {
    label: 'end the current turn',
    citation: 'server/room.lua:3488 — Room:endTurn(); or set data.turn_end on TurnData '
      + '(lunarltk/core/events/gameflow.lua:51-60)',
    match: [/:endTurn\s*[({]/, /\.turn_end\s*=/],
  },
  'change-kingdom': {
    label: 'change a kingdom',
    citation: 'lunarltk/server/events/misc.lua:186 — Room:changeKingdom(player, kingdom, sendLog); '
      + 'runs the full ChangeProperty event so kingdom-attached skills re-evaluate',
    params: ['who', 'kingdom'],
    match: [/:changeKingdom\s*[({]/],
  },
  'change-hero': {
    label: 'replace the general',
    citation: 'lunarltk/server/events/misc.lua:134 — Room:changeHero(player, new_general, full, '
      + 'isDeputy, sendLog, maxHpChange, kingdomChange). BLOCKS on a kingdom choice for sub-kingdom generals.',
    match: [/:changeHero\s*[({]/],
  },
  'seal-area': {
    label: 'seal or restore an equip slot',
    citation: 'server/room.lua:3325 Room:abortPlayerArea(player, slots) / :3398 resumePlayerArea; '
      + 'slot names at lunarltk/core/player.lua:70-76. Sealing discards what is in the zone.',
    params: ['who', 'slots'],
    match: [/:abortPlayerArea\s*[({]/, /:resumePlayerArea\s*[({]/, /:setPlayerEquipSlots\s*[({]/,
      /:addPlayerEquipSlots\s*[({]/, /:removePlayerEquipSlots\s*[({]/],
  },
  'set-property': {
    label: 'set a raw player property',
    citation: 'server/roombase.lua:189 — Room:setPlayerProperty(player, property, value). Bypasses every '
      + 'event; prefer the typed method when one exists.',
    match: [/:setPlayerProperty\s*[({]/],
  },
  'seat-change': {
    label: 'move a seat',
    citation: 'server/room.lua:3037 Room:swapSeat / :3058 moveSeatTo / :3076 moveSeatToNext',
    match: [/:swapSeat\s*[({]/, /:moveSeatTo\s*[({]/, /:moveSeatToNext\s*[({]/],
  },
  'game-over': {
    label: 'end the game',
    citation: 'server/room.lua:3148 — Room:gameOver(winner); "" is a draw',
    match: [/:gameOver\s*[({]/],
  },

  /* ---------------------------------------------------------------- marks */
  'set-mark': {
    label: 'set a mark to a value',
    citation: 'server/roombase.lua:480 — Room:setPlayerMark(player, mark, value). Setting 0 DELETES the '
      + 'mark (core/player.lua:58). Name prefixes drive the UI: @ visible, @@ hidden data, @$ card list, '
      + '@& general list, @! corner mark (roombase.lua:464-476). Suffixes -phase/-turn/-round/-noclear '
      + 'auto-clear (server/mark_enum.lua:56).',
    params: ['who', 'mark', 'value'],
    match: [/:setPlayerMark\s*[({]/],
  },
  'add-mark': {
    label: 'add to a numeric mark',
    citation: 'server/roombase.lua:495 Room:addPlayerMark(player, mark, count) / :508 removePlayerMark; '
      + 'floors at 0',
    params: ['who', 'mark', 'count'],
    match: [/:addPlayerMark\s*[({]/, /:removePlayerMark\s*[({]/],
  },
  'table-mark': {
    label: 'add to a list-valued mark',
    citation: 'server/room.lua:3510 Room:addTableMark(sth, mark, value) — `sth` may be a player OR a '
      + 'card; :3525 addTableMarkIfNeed; :3541 removeTableMark',
    params: ['who', 'mark', 'value'],
    match: [/:addTableMark\s*[({]/, /:addTableMarkIfNeed\s*[({]/, /:removeTableMark\s*[({]/],
  },
  'card-mark': {
    label: 'mark a card',
    citation: 'server/room.lua:343 Room:setCardMark / :358 addCardMark / :369 removeCardMark',
    match: [/:setCardMark\s*[({]/, /:addCardMark\s*[({]/, /:removeCardMark\s*[({]/],
  },
  banner: {
    label: 'set a room-wide banner',
    citation: 'server/roombase.lua:520 Room:setBanner(name, value); visible to clients, unlike setTag '
      + '(roombase.lua:442) which is server-only',
    params: ['banner', 'value'],
    match: [/:setBanner\s*[({]/],
  },

  /* --------------------------------------------------------------- skills */
  'grant-skill': {
    label: 'grant or remove a skill',
    citation: 'lunarltk/server/events/skill.lua:199 — Room:handleAddLoseSkills(player, skill_names, '
      + 'source_skill, sendlog, no_trigger). `skill_names` is a string[] or a |-delimited string; a '
      + 'leading "-" means lose. This is the API — Player:addSkill is its internal.',
    params: ['who', 'skills'],
    match: [/:handleAddLoseSkills\s*[({]/],
  },
  'suppress-skill': {
    label: 'switch a skill off without removing it',
    citation: 'server/room.lua:3557 Room:invalidateSkill(player, skill_name, temp, source_skill) / '
      + ':3571 validateSkill. `temp` is a TempMarkSuffix (server/mark_enum.lua:45).',
    params: ['who', 'skill', 'duration'],
    match: [/:invalidateSkill\s*[({]/, /:validateSkill\s*[({]/],
  },
  'use-history': {
    label: 'rewrite a use count',
    citation: 'lunarltk/server/serverplayer.lua:362 addSkillUseHistory / :374 setSkillUseHistory / '
      + ':350 addCardUseHistory; scopes at core/player.lua:65-68',
    match: [/:setSkillUseHistory\s*[({]/, /:addSkillUseHistory\s*[({]/, /:addCardUseHistory\s*[({]/,
      /:setCardUseHistory\s*[({]/, /:addSkillBranchUseHistory\s*[({]/],
  },
  'quest-state': {
    label: 'settle a 使命技',
    citation: 'server/room.lua:3299 — Room:updateQuestSkillState(player, skillName, failed); asserts '
      + 'the skill carries the Skill.Quest tag (lunarltk/core/skill.lua:37)',
    match: [/:updateQuestSkillState\s*[({]/],
  },

  /* ------------------------------------------------------------ card play */
  'use-card': {
    label: 'make somebody use a card',
    citation: 'lunarltk/server/events/usecard.lua:485 — Room:useCard(UseCardDataSpec {from, card, tos, '
      + 'extraUse?, …}); spec at lunarltk/core/events/usecard.lua:28-54',
    params: ['from', 'card', 'tos'],
    match: [/:useCard\s*[({]/],
  },
  'use-virtual-card': {
    label: 'use a card that is not really there',
    citation: 'lunarltk/server/events/usecard.lua:845 — Room:useVirtualCard(card_name, subcards, from, '
      + 'tos, skillName, extra, extra_data). Returns nil when the use would be prohibited (:849-859). '
      + 'The convenient "as if by a Slash" primitive.',
    params: ['cardName', 'from', 'tos'],
    match: [/:useVirtualCard\s*[({]/],
  },
  'respond-card': {
    label: 'make somebody respond with a card',
    citation: 'lunarltk/server/events/usecard.lua:828 — Room:responseCard(RespondCardDataSpec)',
    match: [/:responseCard\s*[({]/],
  },
  judge: {
    label: 'run a judgement',
    citation: 'lunarltk/server/events/judge.lua:133 — Room:judge(JudgeDataSpec {who, pattern, reason, '
      + 'card?, skipDrop?}). The result is written back INTO `data.results`, so hold the reference.',
    params: ['who', 'pattern', 'reason'],
    match: [/:judge\s*[({]/],
  },
  retrial: {
    label: 'change a judgement card',
    citation: 'lunarltk/server/events/judge.lua:151 — Room:changeJudge(RetrialParams {card, player, '
      + 'data, skillName?, exchange?, response?}); :203 retrial is deprecated, do not emit it',
    match: [/:changeJudge\s*[({]/, /:retrial\s*[({]/],
  },
  pindian: {
    label: 'run a pindian',
    citation: 'lunarltk/server/events/pindian.lua:257 Room:pindian(PindianDataSpec); '
      + 'serverplayer.lua:454 ServerPlayer:pindian(tos, skillName, initialCard)',
    params: ['from', 'tos'],
    match: [/:pindian\s*[({]/, /:changePindianNumber\s*[({]/],
  },

  /* ------------------------------------------------- asking (see REQUESTS) */
  'ask-yes-no': {
    label: 'ask whether to use the skill',
    citation: 'server/room.lua:1653 — Room:askToSkillInvoke(player, params) -> boolean. A non-compulsory '
      + 'trigger raises this automatically without a single call (skill_type/trigger.lua:98).',
    params: ['who', 'prompt'],
    match: [/:askToSkillInvoke\s*[({]/],
  },
  'ask-choose-players': {
    label: 'ask the player to pick targets',
    citation: 'server/room.lua:806 — Room:askToChoosePlayers(player, params) -> ServerPlayer[]',
    params: ['who', 'targets', 'min', 'max'],
    match: [/:askToChoosePlayers\s*[({]/],
  },
  'ask-choice': {
    label: 'ask a multiple-choice question',
    citation: 'server/room.lua:1415 Room:askToChoice(player, params) -> string; :1470 askToChoices for '
      + 'several; :1510 askToJointChoice asks everybody at once',
    params: ['who', 'choices'],
    match: [/:askToChoice\s*[({]/, /:askToChoices\s*[({]/, /:askToJointChoice\s*[({]/],
  },
  'ask-discard': {
    label: 'ask the player to discard',
    citation: 'server/room.lua:729 — Room:askToDiscard(player, params) -> integer[]. THROWS THE CARDS '
      + 'itself (room.lua:790) unless `skip = true`. Opens no dialog at all when the minimum equals '
      + 'everything discardable and it is not cancelable (:765-770).',
    params: ['who', 'min', 'max', 'zone', 'skip'],
    match: [/:askToDiscard\s*[({]/],
  },
  'ask-choose-card': {
    label: 'ask the player to pick a card off somebody',
    citation: 'server/room.lua:1247 Room:askToChooseCard(player, params) -> integer; :1331 '
      + 'askToChooseCards for several (sends AskForPoxi)',
    params: ['who', 'target', 'zone'],
    match: [/:askToChooseCard\s*[({]/, /:askToChooseCards\s*[({]/],
  },
  'ask-cards': {
    label: 'ask the player to pick cards of their own',
    citation: 'server/room.lua:855 Room:askToCards(player, params) -> integer[]; :1008 '
      + 'askToChooseCardsAndPlayers for cards and targets together',
    params: ['who', 'min', 'max', 'pattern'],
    match: [/:askToCards\s*[({]/, /:askToChooseCardsAndPlayers\s*[({]/],
  },
  'ask-use-card': {
    label: 'ask the player to play a card',
    citation: 'server/room.lua:2411 askToUseCard; :2309 askToPlayCard; :2091 askToUseRealCard; '
      + ':2171 askToUseVirtualCard; :2512 askToResponse; :2602 askToNullification (a RACE — first '
      + 'responder wins, room.lua:2635). Each USES the card unless `skip = true`.',
    params: ['who', 'pattern', 'skip'],
    match: [/:askToUseCard\s*[({]/, /:askToPlayCard\s*[({]/, /:askToUseRealCard\s*[({]/,
      /:askToUseVirtualCard\s*[({]/, /:askToResponse\s*[({]/, /:askToNullification\s*[({]/],
  },
  'ask-guanxing': {
    label: 'ask the player to reorder the draw pile',
    citation: 'server/room.lua:1769 — Room:askToGuanxing(player, params) -> {top, bottom}; REORDERS '
      + 'the pile itself (:1833-1849) unless `skip = true`',
    params: ['who', 'cards'],
    match: [/:askToGuanxing\s*[({]/],
  },
  'ask-yiji': {
    label: 'ask the player to hand cards out',
    citation: 'server/room.lua:1073 — Room:askToYiji(player, params); loops, and calls doYiji itself '
      + '(:1157) unless `skip = true`',
    params: ['who', 'cards', 'targets'],
    match: [/:askToYiji\s*[({]/],
  },
  'ask-arrange': {
    label: 'ask the player to arrange cards into rows',
    citation: 'server/room.lua:1677 Room:askToArrangeCards; :1865 askToExchange (no callers ship); '
      + ':2684 askToAG',
    match: [/:askToArrangeCards\s*[({]/, /:askToExchange\s*[({]/, /:askToAG\s*[({]/],
  },
  'ask-move-in-board': {
    label: 'ask the player to move a card between two boards',
    citation: 'server/room.lua:2857 Room:askToMoveCardInBoard — MOVES it itself (:2952) unless `skip`; '
      + ':2977 askToChooseToMoveCardInBoard picks the pair of players instead',
    match: [/:askToMoveCardInBoard\s*[({]/, /:askToChooseToMoveCardInBoard\s*[({]/],
  },
  'ask-view-cards': {
    label: 'show the player cards and ask about them',
    citation: 'server/room.lua:911 Room:viewCards; :926 askToViewCardsAndChoice; :953 '
      + 'askToChooseCardsAndChoice',
    match: [/:viewCards\s*[({]/, /:askToViewCardsAndChoice\s*[({]/, /:askToChooseCardsAndChoice\s*[({]/],
  },
  'ask-number': {
    label: 'ask the player for a number',
    citation: 'server/room.lua:2367 — Room:askToNumber(player, params) -> integer? (a spinner)',
    match: [/:askToNumber\s*[({]/],
  },
  'ask-custom': {
    label: 'ask through a package dialog',
    citation: 'server/room.lua:2832 Room:askToCustomDialog; :2794 askToMiniGame; :1175 askToChooseGeneral. '
      + 'A custom dialog needs a QML component this web client must also implement.',
    match: [/:askToCustomDialog\s*[({]/, /:askToMiniGame\s*[({]/, /:askToChooseGeneral\s*[({]/,
      /:askToChooseSkills\s*[({]/, /:askForChooseCardNames\s*[({]/, /:askForChooseCardList\s*[({]/],
  },

  /* ------------------------------------------- rewriting the event in flight
   * The most idiomatic effect in the game and the one a naive "call a Room
   * method" model misses entirely: a great many skills DO nothing and instead
   * edit the event that is already happening. 安剑 is the whole pattern — one
   * line, `data:changeDamage(1)`.
   *
   * It works because a payload is a `TriggerData` whose `__index`/`__newindex`
   * proxy to an inner table (lunarltk/core/events/init.lua:11-20), so a write
   * lands on the live event and the rest of the pipeline sees it. Which fields
   * are writable depends on the trigger, so these blocks are only offerable
   * under the events whose payload declares them.
   */
  'change-damage': {
    label: 'change the damage amount',
    citation: 'lunarltk/core/events/hp.lua:81 — DamageData:changeDamage(n); or write data.damage / '
      + 'data.additionalDamage directly. Only under a damage trigger; DamageEvent:breakCheck '
      + '(hp.lua:222) aborts the timing the moment damage drops below 1.',
    params: ['delta'],
    match: [/:changeDamage\s*\(/, /\bdata\.damage\s*=[^=]/, /\bdata\.additionalDamage\s*=[^=]/],
  },
  'prevent-damage': {
    label: 'prevent the damage',
    citation: 'lunarltk/core/events/hp.lua:89 — DamageData:preventDamage() sets damage 0 and prevented',
    match: [/:preventDamage\s*\(/],
  },
  'prevent-event': {
    label: 'prevent the event outright',
    citation: 'lunarltk/core/events/hp.lua:31 HpLostData:preventHpLost(); :47 '
      + 'MaxHpChangedData:preventMaxHpChange(); RecoverData:preventRecover(); or write data.prevented',
    match: [/:preventHpLost\s*\(/, /:preventRecover\s*\(/, /:preventMaxHpChange\s*\(/,
      /\bdata\.prevented\s*=[^=]/],
  },
  'change-amount': {
    label: 'change the amount of a heal or loss',
    citation: 'lunarltk/core/events/hp.lua:107 RecoverData:changeRecover(n); or write data.num',
    params: ['delta'],
    match: [/:changeRecover\s*\(/, /\bdata\.num\s*=[^=]/],
  },
  'change-draw-count': {
    label: 'draw more or fewer in the draw phase',
    citation: 'lunarltk/core/events/gameflow.lua:160-162 — DrawNCardsData.n, under fk.DrawNCards. '
      + 'The engine hard-sets n = 2 immediately before the trigger (server/events/gameflow.lua:431).',
    params: ['delta'],
    match: [/\bdata\.n\s*=[^=]/],
  },
  'change-targets': {
    label: 'add or remove a target of the card',
    citation: 'lunarltk/core/events/usecard.lua:124 UseCardData:addTarget(player, sub); :64 '
      + 'removeTarget; :83 removeAllTargets; AimData:cancelCurrentTarget / cancelTarget / '
      + 'cancelAllTarget under the fk.Target* events',
    params: ['who'],
    match: [/:addTarget\s*\(/, /:removeTarget\s*\(/, /:removeAllTargets\s*\(/,
      /:cancelCurrentTarget\s*\(/, /:cancelTarget\s*\(/, /:cancelAllTarget\s*\(/],
  },
  nullify: {
    label: 'cancel the card against a target',
    citation: 'lunarltk/core/events/usecard.lua:653-678 — CardEffectData.nullified / '
      + 'UseCardData.nullifiedTargets; CardEffectData:setNullified(t)',
    match: [/\bdata\.nullified\s*=[^=]/, /\bdata\.nullifiedTargets\s*=[^=]/, /:setNullified\s*\(/],
  },
  'no-response': {
    label: 'forbid the target from responding',
    citation: 'lunarltk/core/events/usecard.lua — data.disresponsive / disresponsiveList, '
      + 'CardEffectData:setDisresponsive(t); unoffsetable/unoffsetableList for "cannot be countered"',
    match: [/\bdata\.disresponsive\w*\s*=[^=]/, /:setDisresponsive\s*\(/,
      /\bdata\.unoffsetable\w*\s*=[^=]/, /:setUnoffsetable\s*\(/],
  },
  'change-response-times': {
    label: 'need more than one card to answer',
    citation: 'lunarltk/core/events/usecard.lua — AimData/CardEffectData:setResponseTimes(n, target); '
      + 'this is what 无双 does',
    params: ['times'],
    match: [/:setResponseTimes\s*\(/],
  },
  'change-judge-card': {
    label: 'replace the judgement card',
    citation: 'lunarltk/core/events/judge.lua:3-13 — JudgeData.card, rewritten under fk.AskForRetrial; '
      + 'the supported route is Room:changeJudge (server/events/judge.lua:151)',
    match: [/\bdata\.card\s*=[^=]/],
  },
  'free-use': {
    label: 'the use does not count against a limit',
    citation: 'lunarltk/core/events/usecard.lua:28-54 — UseCardData.extraUse; '
      + 'lunarltk/server/system_enum.lua:6-17 UseExtraData.extraUse',
    match: [/\bdata\.extraUse\s*=[^=]/],
  },
  'end-phase-early': {
    label: 'cut the current phase short',
    citation: 'lunarltk/core/events/gameflow.lua:123-132 — PhaseData.phase_end; fk.EventPhaseEnd '
      + 'still fires afterwards because it lives in the cleaner (server/gameflow.lua:488)',
    match: [/\bdata\.phase_end\s*=[^=]/],
  },
  'pass-data': {
    label: 'carry data forward to a later step',
    citation: 'lunarltk/core/events/usecard.lua — data.extra_data; lunarltk/server/system_enum.lua:6-17 '
      + 'UseExtraData carries the targeting overrides (must_targets, fix_targets, bypass_distances, …)',
    match: [/\bdata\.extra_data\s*=[^=]/],
  },

  /* --------------------------------------------- mechanics from the library
   * `packages/utility` is a shared library the newer packs require, and it
   * carries whole named mechanics that no Room method implements. A skill using
   * one is not calling the engine, it is calling the pack — so a designer block
   * for these only works while `utility` is loaded, which it always is here
   * (scripts/build-lua-bundle.mjs:30 lists it in PACKAGES).
   */
  'charge-skill': {
    label: 'charge up a 蓄力技',
    citation: 'packages/utility/utility.lua — Utility.skillCharged; the Skill.Charge tag at '
      + 'lunarltk/core/skill.lua:41',
    match: [/\b(U|Utility)\.skillCharged\b/],
  },
  'shared-pile': {
    label: 'use the communal 任 pile',
    citation: 'packages/utility/utility.lua — Utility.AddToRenPile / Utility.GetRenPile',
    match: [/\b(U|Utility)\.(AddToRenPile|GetRenPile)\b/],
  },
  'private-mark': {
    label: 'set a mark only some players can see',
    citation: 'packages/utility/utility.lua — Utility.setPrivateMark / getPrivateMark',
    match: [/\b(U|Utility)\.(set|get)PrivateMark\b/],
  },
  discussion: {
    label: 'hold a 议事',
    citation: 'packages/utility/utility.lua — Utility.Discussion, plus the package-defined events '
      + 'Utility.StartDiscussion / DiscussionFinished / DiscussionResultConfirming|Confirmed, which '
      + 'are addEffect keys exactly like an fk.* event',
    match: [/\b(U|Utility)\.Discussion\b/],
  },
  zhengsu: {
    label: 'run a 整肃 objective',
    citation: 'packages/utility/utility.lua — Utility.startZhengsu / checkZhengsu / rewardZhengsu',
    match: [/\b(U|Utility)\.(start|check|reward)Zhengsu\b/],
  },
  'delayed-pindian': {
    label: 'a pindian resolved later',
    citation: 'packages/utility/utility.lua — Utility.delayedPindian / delayedPindianDisplay / '
      + 'delayedPindianCleaner',
    match: [/\b(U|Utility)\.delayedPindian\w*/],
  },

  /* --------------------------------------------------------- presentation */
  log: {
    label: 'write a battle-log line',
    citation: 'server/roombase.lua:232 — Room:sendLog(LogMessage); shape at '
      + 'lunarltk/server/system_enum.lua:37-51',
    match: [/:sendLog\s*[({]/, /:sendFootnote\s*[({]/],
  },
  indicate: {
    label: 'draw the arrow / play the animation',
    citation: 'server/room.lua:621 Room:doIndicate(source, targets); server/roombase.lua:240 doAnimate; '
      + 'room.lua:565 notifySkillInvoked — which BLOCKS for 2s on an unmuted 限定技 (room.lua:614)',
    match: [/:doIndicate\s*[({]/, /:doAnimate\s*[({]/, /:notifySkillInvoked\s*[({]/,
      /:broadcastSkillInvoke\s*[({]/, /:setEmotion\s*[({]/, /:doSuperLightBox\s*[({]/],
  },
  delay: {
    label: 'pause',
    citation: 'server/roombase.lua:248 — Room:delay(ms) blocks the room coroutine; server/room.lua:461 '
      + 'Room:animDelay(seconds) blocks via a real request so everybody sees a progress bar',
    match: [/:delay\s*[({]/, /:animDelay\s*[({]/],
  },
};

/**
 * The kinds whose effect IS the effect object, not a call it makes.
 *
 * A `distance` effect never calls a Room method — it exists, and the engine
 * consults it while computing distance (`Fk.skill_keys`, engine.lua:56 maps the
 * key to its constructor). So these cannot be found by scanning a body, and a
 * scanner that only looks for calls reports 90 shipped skills as doing nothing
 * at all. They are contributed from the effect's runtime class instead, which
 * is why they are keyed by class name here.
 *
 * For the designer these are the "passive property" blocks — the ones that
 * change a rule rather than perform an action.
 */
export const DECLARATIVE = {
  ViewAsSkill: {
    id: 'view-as',
    label: 'use cards as if they were another card',
    citation: 'lunarltk/core/skill_skeleton.lua:618 createViewAsSkill — spec {view_as, filter_pattern, '
      + 'pattern, enabled_at_play, enabled_at_response, …}. `view_as` returns a Card, and the engine '
      + 'then uses it as if it had been played.',
    params: ['cardName', 'pattern', 'count'],
  },
  DistanceSkill: {
    id: 'modify-distance',
    label: 'change the distance between players',
    citation: 'lunarltk/core/skill_skeleton.lua:334 createDistanceSkill — spec {correct_func, fixed_func}; '
      + 'this is 马术',
    params: ['delta'],
  },
  AttackRangeSkill: {
    id: 'modify-attack-range',
    label: 'change my attack range',
    citation: 'lunarltk/core/skill_skeleton.lua:367 createAttackRangeSkill — spec {correct_func, '
      + 'fixed_func, within_func, without_func, final_func, virtual_weapon_func}',
    params: ['delta'],
  },
  MaxCardsSkill: {
    id: 'modify-hand-limit',
    label: 'change the hand limit',
    citation: 'lunarltk/core/skill_skeleton.lua:400 createMaxCardsSkill — spec {correct_func, '
      + 'fixed_func, exclude_from}',
    params: ['delta'],
  },
  TargetModSkill: {
    id: 'modify-card-limits',
    label: 'change how many times or how far a card may be used',
    citation: 'lunarltk/core/skill_skeleton.lua:420 createTargetModSkill — spec {bypass_times, '
      + 'residue_func, fix_times_func, fix_target_func, bypass_distances, distance_limit_func, '
      + 'extra_target_func, target_tip_func}',
    params: ['cardName', 'extraUses', 'extraTargets'],
  },
  ProhibitSkill: {
    id: 'prohibit',
    label: 'forbid a card being used, responded, discarded or pindianed',
    citation: 'lunarltk/core/skill_skeleton.lua:350 createProhibitSkill — spec {is_prohibited, '
      + 'prohibit_use, prohibit_response, prohibit_discard, prohibit_pindian}',
    params: ['what'],
  },
  FilterSkill: {
    id: 'filter-card',
    label: 'make a card count as a different card',
    citation: 'lunarltk/core/skill_skeleton.lua:456 createFilterSkill — spec {card_filter, view_as, '
      + 'equip_skill_filter, handly_cards}. Unlike view-as this rewrites the card permanently while '
      + 'held, so it applies without the owner doing anything.',
  },
  InvaliditySkill: {
    id: 'invalidate-skill',
    label: "switch somebody's skill off",
    citation: 'lunarltk/core/skill_skeleton.lua:472 createInvaliditySkill — spec {invalidity_func, '
      + 'invalidity_attackrange, recheck_invalidity}; consulted by Skill:isEffectable '
      + '(lunarltk/core/skill.lua:146)',
  },
  VisibilitySkill: {
    id: 'modify-visibility',
    label: 'change who can see a card, a role or a move',
    citation: 'lunarltk/core/skill_skeleton.lua:492 createVisibilitySkill — spec {card_visible, '
      + 'role_visible, move_visible}',
  },
  ActiveSkill: {
    id: 'active-use',
    label: 'a button the player presses on their turn',
    citation: 'lunarltk/core/skill_skeleton.lua:525 createActiveSkill — spec {can_use, card_filter, '
      + 'target_filter, feasible, on_use, prompt, interaction, …}. The whole effect lives in `on_use`.',
    params: ['cards', 'targets'],
  },
  CardSkill: {
    id: 'card-effect',
    label: 'the effect of a card, not of a general',
    citation: 'lunarltk/core/skill_skeleton.lua:588 createCardSkill — spec {can_use, target_filter, '
      + 'on_use, on_effect, on_action, about_to_effect, on_nullified, …}',
  },
};

/**
 * Effects a skill gets from a TAG rather than from anything it writes.
 *
 * 龙渊 is the proof this is needed: a 觉醒技 whose whole body is `can_trigger`
 * plus `can_wake`, with no `on_use` at all. Waking IS the effect — the engine
 * records it (skill_skeleton.lua:108-112 gives every Wake and Limited skill a
 * once-per-game limit) and other skills gate on `usedSkillTimes`. A scanner
 * that only reads bodies calls that skill empty.
 */
export const TAG_EFFECTS = {
  Wake: {
    id: 'awaken',
    label: 'wake up (once per game, permanently)',
    citation: 'lunarltk/core/skill.lua:34 Skill.Wake; skill_skeleton.lua:108-112 pins '
      + 'max_use_time[HistoryGame] = 1; skill_type/trigger.lua:118 enableToWake gates on can_wake '
      + 'and on the StraightToWake mark',
  },
};

/**
 * The wire command each ask raises.
 *
 * Read off `lunarltk/server/room.lua` end to end; several `askTo*` names do NOT
 * send the command their name suggests — `askToChooseCards` sends `AskForPoxi`
 * and `askToYiji` sends `AskForUseActiveSkill`. This is the same table
 * `scripts/audit/skill-panels.mjs` carries, kept here so the designer can tell
 * a block "this needs a dialog the web client has to be able to draw".
 */
export const REQUESTS = {
  AskForSkillInvoke: { label: 'yes / no', citation: 'server/room.lua:1653 askToSkillInvoke', match: [/:askToSkillInvoke\s*[({]/] },
  AskForUseActiveSkill: {
    label: 'an aux active skill (cards and/or targets)',
    citation: 'server/room.lua:656 askToUseActiveSkill, and the nine helpers that wrap it: '
      + 'askToDiscard(729), askToChoosePlayers(806), askToCards(855), askToChooseCardsAndPlayers(1008), '
      + 'askToYiji(1073), askToJointCards(1563), askToNumber(2367), askToUseRealCard(2091), '
      + 'askToUseVirtualCard(2171), askToChooseToMoveCardInBoard(2977)',
    match: [/:askToUseActiveSkill\s*[({]/, /:askToDiscard\s*[({]/, /:askToChoosePlayers\s*[({]/,
      /:askToCards\s*[({]/, /:askToChooseCardsAndPlayers\s*[({]/, /:askToYiji\s*[({]/,
      /:askToJointCards\s*[({]/, /:askToNumber\s*[({]/, /:askToUseRealCard\s*[({]/,
      /:askToUseVirtualCard\s*[({]/, /:askToChooseToMoveCardInBoard\s*[({]/],
  },
  AskForChoice: {
    label: 'pick one of several strings',
    citation: 'server/room.lua:1415 askToChoice, :1510 askToJointChoice, :1206 askToChooseKingdom',
    match: [/:askToChoice\s*[({]/, /:askToJointChoice\s*[({]/, /:askToChooseKingdom\s*[({]/],
  },
  AskForChoices: { label: 'pick several strings', citation: 'server/room.lua:1470 askToChoices', match: [/:askToChoices\s*[({]/] },
  AskForCardChosen: { label: 'pick one card off a player', citation: 'server/room.lua:1247 askToChooseCard', match: [/:askToChooseCard\s*[({]/] },
  AskForPoxi: {
    label: 'a poxi board (pick n of a displayed set)',
    citation: 'server/room.lua:1297 askToPoxi, :1331 askToChooseCards (poxi type "AskForCardsChosen")',
    match: [/:askToPoxi\s*[({]/, /:askToChooseCards\s*[({]/],
  },
  AskForGuanxing: { label: 'top / bottom of the draw pile', citation: 'server/room.lua:1769 askToGuanxing', match: [/:askToGuanxing\s*[({]/] },
  AskForArrangeCards: { label: 'arrange cards into n rows', citation: 'server/room.lua:1677 askToArrangeCards', match: [/:askToArrangeCards\s*[({]/] },
  AskForUseCard: {
    label: 'play a card',
    citation: 'server/room.lua:2411 askToUseCard, :2309 askToPlayCard, :2602 askToNullification (race)',
    match: [/:askToUseCard\s*[({]/, /:askToPlayCard\s*[({]/, /:askToNullification\s*[({]/],
  },
  AskForResponseCard: { label: 'respond with a card', citation: 'server/room.lua:2512 askToResponse', match: [/:askToResponse\s*[({]/] },
  AskForCardsAndChoice: {
    label: 'see cards, then decide',
    citation: 'server/room.lua:911 viewCards, :926 askToViewCardsAndChoice, :953 askToChooseCardsAndChoice',
    match: [/:viewCards\s*[({]/, /:askToViewCardsAndChoice\s*[({]/, /:askToChooseCardsAndChoice\s*[({]/],
  },
  AskForMoveCardInBoard: { label: 'move an equip/judge card between two boards', citation: 'server/room.lua:2857 askToMoveCardInBoard', match: [/:askToMoveCardInBoard\s*[({]/] },
  AskForAG: { label: 'the amazing-grace tray', citation: 'server/room.lua:2684 askToAG', match: [/:askToAG\s*[({]/] },
  AskForGeneral: { label: 'pick a general', citation: 'server/room.lua:1175 askToChooseGeneral', match: [/:askToChooseGeneral\s*[({]/] },
  AskForExchange: { label: 'exchange piles', citation: 'server/room.lua:1865 askToExchange — no shipped caller', match: [/:askToExchange\s*[({]/] },
  CustomDialog: {
    label: 'a package QML component',
    citation: 'server/room.lua:2832 askToCustomDialog, plus the Utility helpers and raw '
      + 'Request:new(players, "CustomDialog") (packages/mobile/.../mobile_daoshu.lua:102)',
    match: [/:askToCustomDialog\s*[({]/, /:askToChooseSkills\s*[({]/, /:askToJointSkills\s*[({]/,
      /:askForChooseCardNames\s*[({]/, /:askForChooseCardList\s*[({]/,
      /:askToChooseGeneralSkills\s*[({]/, /:askToChooseGeneralsAndChoice\s*[({]/,
      /Request:new\s*\([^)]*"CustomDialog"/],
  },
  MiniGame: { label: 'a package QML minigame', citation: 'server/room.lua:2794 askToMiniGame — Fk.mini_games is empty in this build', match: [/:askToMiniGame\s*[({]/] },
};
