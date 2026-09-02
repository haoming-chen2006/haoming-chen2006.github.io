/**
 * "What is this one FOR?" — one plain-language answer per general.
 *
 * WHY THIS FILE EXISTS. The pool went from 25 to 274. `GetGeneralDetail` hands
 * the box the engine's own rules text, which is correct, complete, and written
 * for someone who already knows the game: 甄姬's two skills are 96 characters of
 * conditional, 神司马懿's are 300. A player deciding between three unfamiliar
 * names cannot read six paragraphs per candidate, so in practice they read
 * none of it and pick on the portrait. Two sentences that say what the
 * character is FOR — aggressive, defensive, draws cards, disrupts — is the
 * difference between a browsable roster and an unusable one.
 *
 * THIS IS PROSE, NOT LOGIC, AND THAT IS LOAD-BEARING. Nothing here is computed
 * from a skill and nothing here is consulted by anything that decides a rule.
 * The room's whole contract is that legality comes from the Lua scene model
 * (`src/room/__tests__/no-rules.test.ts`); a summary that tried to *derive*
 * what a skill does would be a second, wrong copy of the rules. So these are
 * written by hand, read off the engine's own `Fk:getDescription` output for all
 * 274, and the full text stays one toggle away — the summary never replaces it.
 *
 * WHY IT LIVES HERE RATHER THAN NEXT TO ITS ONE READER. `src/room/dialogs`
 * would be the obvious home, and it is where this started; `coverage.test.ts`
 * is the reason it moved. Chinese in `src/**` is a failure outside `src/i18n`,
 * because everywhere else the Chinese belongs in a dictionary and reaches the
 * screen through a key — and that rule is right, and this file is a dictionary.
 * It is not one of the ENGINE tables, though: those are `src/i18n/engine`, they
 * are keyed to the engine's own keys, and a translation lane owns them. This is
 * separate content in a separate file and touches none of them.
 *
 * 锁定技 ARE THE POINT, NOT AN AFTERTHOUGHT. A compulsory skill never animates
 * an invocation, so it is invisible everywhere except this box, and it is very
 * often the entire reason to take a general — 张飞's 咆哮, 吕布's 无双, 陆逊's
 * 谦逊 are the whole character. Every summary below that has one says so, and
 * says it first where it dominates.
 *
 * WHAT "TWO SENTENCES" MEANS. The lead sentence is the role, in the register
 * the request asked for: 进攻型 / 防守型 / 辅助型 / 摸牌型 / 干扰型 / 控场型 /
 * 爆发型 / 成长型 / 治疗型 / 综合型, and Aggressive / Defensive / Support /
 * Card draw / Disruptive / Control / Late-game / Healer / Utility. The second
 * says concretely what the skills do.
 * `src/room/dialogs/__tests__/general-summaries.test.tsx` holds every entry to
 * two sentences in both languages, and holds the lead to that closed set.
 *
 * WHAT IS NOT SUMMARISED, AND WHY IT SAYS SO. Nine generals reach a skill this
 * build ships no `:<skill>` text for at all — always a skill they *gain* mid
 * game (关索's 当先/制蛮 off 征南, 神司马懿's 极略 package off 拜印), whose
 * package is not in `packages/`. The summary covers what is readable and
 * `missing` names the keys that are not, so the box can say so out loud rather
 * than quietly describing three quarters of a character. See
 * `lua/web/roster.lua` for the same problem handled at the roster level.
 *
 * The 274 names are the engine's own, read off `public/overview.json`, which
 * `scripts/build-overview.mjs` extracts from a booted VM. A general added to a
 * package appears there and fails this file's coverage test until it is written
 * up here — which is the intended way to find out.
 */
import type { Language } from './types';

export interface GeneralSummary {
  /** At most two sentences. Role first, then what the skills concretely do. */
  readonly zh_CN: string;
  readonly en_US: string;
  /**
   * Engine skill keys this build ships no description for — always a skill the
   * general GAINS from another package. Named rather than glossed over: a
   * summary that silently covered three of four skills would be the same lie as
   * a skill drawn with no text under it.
   */
  readonly missing?: readonly string[];
}

/** Keyed by the engine's general name, the same key `GetGeneralDetail` takes. */
export const GENERAL_SUMMARIES: Readonly<Record<string, GeneralSummary>> = {
  caizhenji: {
    zh_CN: '辅助型。可以送牌给体力更低的角色来免除其伤害，锁定技还会在每回合结束补一张你本回合没用过的类型的牌。',
    en_US: 'Support. Hands cards to a weaker player to cancel damage they would take, and a locked skill refills one card of every type she did not use that turn.',
  },
  caocao: {
    zh_CN: '防守反击型。受伤后可以直接拿走伤害你的那张牌，主公技还能让其他魏势力角色替你出【闪】。',
    en_US: 'Defensive. Takes the card that damaged him, and as lord he can ask other Wei players to supply a Dodge for him.',
  },
  caochun: {
    zh_CN: '进攻型。出牌阶段摸三张再弃几张，弃得少就白送一张【杀】，或让本阶段用牌没有距离限制。',
    en_US: 'Aggressive. Draws three and discards a few each turn; keeping the right cards buys him a free Slash or unlimited range for the phase.',
  },
  chengjiw: {
    zh_CN: '进攻型。锁定技给其他角色随机挂上标记，你打标记角色时弃牌换摸两张，限定技一次清空手牌让所有其他角色掉1点体力。',
    en_US: 'Aggressive. A locked skill marks random opponents so hitting them trades a discard for two draws, and once per game he dumps his whole hand to cost everyone else 1 HP.',
  },
  chenzhen: {
    zh_CN: '摸牌型。出牌阶段弃两张同色手牌，让一名其他角色摸两张，自己摸三张。',
    en_US: 'Card draw. Discards two same-colour hand cards to give another player two draws and take three himself.',
  },
  chitu: {
    zh_CN: '进攻型。锁定技把所有坐骑牌移出游戏并提高【杀】的次数上限，每回合第一张【杀】无距离限制但需要对方多出一张【闪】。',
    en_US: 'Aggressive. A locked skill removes every horse from the game and raises his Slash limit, and his first Slash each turn ignores range but needs two Dodges to block.',
  },
  daqiao: {
    zh_CN: '防守型。方块牌可以当【乐不思蜀】使用，被【杀】指定时弃一张牌就能把这张【杀】转给攻击范围内的另一个人。',
    en_US: 'Defensive. Turns diamond cards into Indulgence, and discards a card to pass a Slash aimed at her onto someone else.',
  },
  diaochan: {
    zh_CN: '干扰型。出牌阶段弃一张牌就能让两名男性角色互相【决斗】，回合结束还能摸一张牌。',
    en_US: 'Disruptive. Discards a card to force two male players into a Duel, and draws an extra card at the end of her turn.',
  },
  dilu: {
    zh_CN: '防守型。锁定技移除所有坐骑牌并让手牌上限+2，还能送牌给身边被指定为目标的角色来帮其挡伤并慢慢回血。',
    en_US: 'Defensive. A locked skill removes every horse and adds two to his hand limit, and he hands cards to nearby targets to blunt incoming damage and slowly heal.',
  },
  dingyuan: {
    zh_CN: '干扰型。出牌阶段可以看一名其他角色的手牌，逼其把【杀】全打在你身上换摸牌，没【杀】就弃其一张牌。',
    en_US: 'Disruptive. Looks at an opponent hand and makes them fire every Slash at him for extra draws, or strips a card if they had none.',
  },
  fuqian: {
    zh_CN: '防守型。锁定技可以取消指定你的单目标牌并存起来，回合结束再统一结算，另一个技能用1点体力换三张牌。',
    en_US: 'Defensive. A locked skill cancels single-target cards aimed at him and stores them until his end phase, and he can trade 1 HP for three cards.',
  },
  ganning: {
    zh_CN: '干扰型。所有黑色牌都能当【过河拆桥】使用，整局都在拆别人的牌。',
    en_US: 'Disruptive. Any black card becomes a Dismantlement, so he strips other players cards all game.',
  },
  godguojia: {
    zh_CN: '成长型。靠一连串判定不断加体力上限，觉醒后还能让一名角色直接达成觉醒条件或让其摸四张牌。',
    en_US: 'Late-game. Chains judgements to grow his maximum HP, and can later hand another player an instant awakening or four cards.',
  },
  godhuatuo: {
    zh_CN: '辅助型。给角色轮流挂上虎鹿熊猿鹤五种增益效果，还能把弃掉的牌攒起来换全场回血。',
    en_US: 'Support. Rotates five animal buffs onto players around the table, and banks discards to heal everyone at once.',
  },
  godlusu: {
    zh_CN: '控场型。开局可以重排所有人的座次，之后靠交换和均分手牌搬空对手场上的牌。',
    en_US: 'Control. Reorders every seat at the start of the game, then swaps and splits hands to strip the field.',
  },
  godsunce: {
    zh_CN: '爆发型。用自己的体力上限换“平定”标记，被标记的人无法响应你的牌，标记角色死亡时你的体力上限会大量增加。',
    en_US: 'Aggressive. Trades his own maximum HP for marks that stop opponents responding to his cards, and cashes in hugely when a marked player dies.',
  },
  godtaishici: {
    zh_CN: '防守反击型。锁定技让体力更高的角色的【杀】有机会直接作废，使命技靠转移“围”标记来打人或抢牌。',
    en_US: 'Defensive. A locked skill can void Slashes from healthier opponents, and his mission passes a mark around the table for free damage or card steals.',
  },
  gongsunkang: {
    zh_CN: '进攻型。锁定技让其他人计算与你的距离更远，“讨灭”标记则让你和目标互相进入攻击范围并加伤或抢牌。',
    en_US: 'Aggressive. A locked skill keeps opponents at a distance, while his mark links him to one target for bonus damage or card steals.',
  },
  guansuo: {
    zh_CN: '成长型。每当有角色死亡就能摸三张牌并学会一个新技能，锁定技让你离女性角色更近。',
    en_US: 'Late-game. Draws three and learns a new skill every time someone dies, and a locked skill shortens his distance for each female player.',
  },
  guanyu: {
    zh_CN: '进攻型。所有红色牌都能当【杀】使用或打出，几乎不会缺【杀】。',
    en_US: 'Aggressive. Every red card works as a Slash, so he almost never runs out of attacks.',
  },
  guojia: {
    zh_CN: '摸牌型。判定牌可以直接收走，每受到1点伤害还能看两张牌并任意分配。',
    en_US: 'Card draw. Keeps judgement cards, and each point of damage lets him look at two cards and hand them out.',
  },
  huanggai: {
    zh_CN: '爆发型。出牌阶段可以反复失去1点体力换两张牌，是用血换牌的典型角色。',
    en_US: 'Aggressive. Repeatedly trades 1 HP for two cards, the classic burn-your-own-health engine.',
  },
  huangyueying: {
    zh_CN: '摸牌型。使用普通锦囊牌就能摸一张，锁定技让你的锦囊牌没有距离限制。',
    en_US: 'Card draw. Draws a card whenever she plays a normal trick, and a locked skill removes range limits on her tricks.',
  },
  huatuo: {
    zh_CN: '治疗型。出牌阶段弃一张手牌帮人回血，回合外还能把红色牌当【桃】救人。',
    en_US: 'Healer. Discards a hand card to heal someone each turn, and plays any red card as a Peach outside his turn.',
  },
  hucheer: {
    zh_CN: '进攻型。出牌阶段弃一张非基本牌就能抢走别人装备区里的一张牌并直接使用，抢到武器还附带1点伤害。',
    en_US: 'Aggressive. Discards a non-basic card to steal and immediately use an opponent equipment, dealing 1 damage on top if it was a weapon.',
  },
  hujinding: {
    zh_CN: '防守型。受伤后【杀】的伤害会被免除并把这张【杀】收走，代价是体力上限；送【杀】给别人还能回血。',
    en_US: 'Defensive. Once injured she absorbs Slashes and keeps them at the cost of maximum HP, and gifting a Slash to someone heals her.',
  },
  jiangwan: {
    zh_CN: '防守型。你和攻击范围内的角色被【杀】或延时锦囊指定时，可以弃使用者一张手牌或自己摸一张，限定技还能与人交换座次。',
    en_US: 'Defensive. When he or someone in his range is targeted by a Slash or delayed trick he strips the attacker or draws, and once per game he can swap seats.',
  },
  jueying: {
    zh_CN: '摸牌型。锁定技移除所有坐骑牌并让手牌上限+2，每个回合结束还能用体力换一批牌。',
    en_US: 'Card draw. A locked skill removes every horse and adds two to the hand limit, and it spends HP at the end of turns to draw more.',
  },
  laimin: {
    zh_CN: '干扰型。锁定技把致命伤害变成体力上限，上限到9就会死；另一个技能靠比手牌颜色抢牌并逼人只能打你。',
    en_US: 'Disruptive. A locked skill turns lethal damage into extra maximum HP until it reaches nine and kills him, and his other skill steals cards through a colour showdown.',
  },
  lifeng: {
    zh_CN: '辅助型。摸牌阶段可以多摸两张并把牌存成“粮”，之后用“粮”让手牌少的角色各摸两张，但有“粮”时不能使用【杀】。',
    en_US: 'Support. Draws two extra and banks them as grain, then spends grain to give short-handed players two cards each, though he cannot use Slash while grain is stored.',
  },
  lingcao: {
    zh_CN: '摸牌型。摸牌阶段按装备区里的牌数多摸牌，装备越多摸得越多。',
    en_US: 'Card draw. Draws extra cards in proportion to his equipment, so the more he wears the more he draws.',
  },
  liubei: {
    zh_CN: '辅助型。出牌阶段把手牌分给其他角色，给出两张后回1点体力，主公技还能让蜀势力角色替你出【杀】。',
    en_US: 'Support. Hands cards out to allies and heals once he has given two away, and as lord he can ask Shu players to Slash for him.',
  },
  liuzan: {
    zh_CN: '摸牌型。回合内每次使用与上一张颜色不同的牌就能摸一张，红黑交替出牌收益最高。',
    en_US: 'Card draw. Draws a card each time he plays a card of a different colour from the last one, so alternating red and black pays off.',
  },
  liuzhang: {
    zh_CN: '控场型。锁定技每回合积攒“生”牌，另一个技能每轮指定一个势力，让那些人替你打指定目标或向你交牌。',
    en_US: 'Control. Stockpiles cards each turn and names one kingdom whose players must either attack a target he picks or pay him cards.',
  },
  lizhaojiaobo: {
    zh_CN: '辅助型。转换技轮流让一名角色摸三张后弃两张、或弃一张后获得1点护甲，别人执行其中一项时你自动执行另一项。',
    en_US: 'Support. A switching skill alternates between giving someone cards and giving them armour, and he automatically takes the other half whenever an opponent uses one.',
  },
  luotong: {
    zh_CN: '摸牌型。锁定技按你使用或打出的牌数累计，每到三张、五张、八张就白拿一张对应的牌。',
    en_US: 'Card draw. A locked skill hands him a free card at the third, fifth and eighth card he plays.',
  },
  luxun: {
    zh_CN: '防守型。锁定技让你不能被【顺手牵羊】和【乐不思蜀】指定，手牌空了还能摸一张续上。',
    en_US: 'Defensive. A locked skill makes him an illegal target for Snatch and Indulgence, and he draws whenever he empties his hand.',
  },
  lvbu: {
    zh_CN: '进攻型。锁定技让你的【杀】需要连续两张【闪】才能抵消，【决斗】也要连续两张【杀】才能响应。',
    en_US: 'Aggressive. A locked skill makes his Slash cost two Dodges to block and his Duel cost two Slashes to answer.',
  },
  lvmeng: {
    zh_CN: '防守型。只要出牌阶段没有使用或打出【杀】，就可以跳过弃牌阶段把手牌全留住。',
    en_US: 'Defensive. Skips his discard phase entirely as long as he played no Slash that turn, so he hoards cards.',
  },
  m_ex__caozhang: {
    zh_CN: '进攻型。出牌阶段开始时二选一：摸一张但本阶段不能用【杀】，或弃一张换无距离限制并多出一张【杀】。',
    en_US: 'Aggressive. At the start of each play phase he either draws and gives up Slash, or discards to gain range and an extra Slash.',
  },
  m_ex__caozhen: {
    zh_CN: '干扰型。暗中给其他角色指定“司敌”目标，命中后可以取消对方的牌并造成1点伤害，或者自己摸两张。',
    en_US: 'Disruptive. Secretly assigns hidden targets to opponents, then cancels their card and damages them, or just draws two, when the guess lands.',
  },
  m_ex__dianwei: {
    zh_CN: '进攻型。出牌阶段对每名角色限一次，失去1点体力或弃一张武器牌就能直接造成1点伤害。',
    en_US: 'Aggressive. Spends 1 HP or a weapon to deal 1 damage directly, once per opponent each turn.',
  },
  m_ex__fuhuanghou: {
    zh_CN: '干扰型。每轮可以和一名体力更高的角色拼点来封锁其出牌，被【杀】指定时还能拉别人一起当目标。',
    en_US: 'Disruptive. Once a round she gambles a pindian to lock down a healthier opponent, and drags a third player into any Slash aimed at her.',
  },
  m_ex__gaoshun: {
    zh_CN: '进攻型。拼点赢了本阶段对目标无视防具且不限距离次数，锁定技把【酒】变成【杀】并禁止别人在你回合用【酒】。',
    en_US: 'Aggressive. Wins a pindian to ignore armour and attack freely for the phase, and a locked skill turns Analeptic into Slash and bans it on his turn.',
  },
  m_ex__guyong: {
    zh_CN: '摸牌型。出牌阶段可以多次弃两张牌换摸牌，回合结束展示手牌，若颜色或类别统一还能让多名角色一起摸牌。',
    en_US: 'Card draw. Repeatedly discards two cards to draw, and a uniform hand at the end of his turn lets several players draw.',
  },
  m_ex__huatuo: {
    zh_CN: '治疗型。回合外可以把红色牌当【桃】救人，出牌阶段弃红色手牌帮人回血后还能接着再发动一次。',
    en_US: 'Healer. Plays red cards as Peach off-turn, and discarding a red card to heal lets him immediately heal someone else.',
  },
  m_ex__jiangwei: {
    zh_CN: '控场型。出牌阶段可以逼一名角色对你使用【杀】，否则弃其一张牌；觉醒后回血并学会【观星】。',
    en_US: 'Control. Forces an opponent to Slash him or lose a card, and once awakened he heals and gains the deck-stacking skill.',
  },
  m_ex__jianyong: {
    zh_CN: '辅助型。拼点赢了本阶段的下一张基本牌或普通锦囊可以多指定或少指定一个目标，每次拼点后还能挑一张牌拿走。',
    en_US: 'Support. A pindian win lets his next basic or trick add or drop a target, and every pindian also nets him a card.',
  },
  m_ex__liaohua: {
    zh_CN: '进攻型。锁定技每回合从弃牌堆拿一张【杀】并多一个出牌阶段，濒死时限定技可以把体力回复到势力数。',
    en_US: 'Aggressive. A locked skill gives him a free Slash and a second play phase every turn, and once per game he can pull himself back from the brink.',
  },
  m_ex__lingtong: {
    zh_CN: '干扰型。弃牌阶段弃了两张牌或失去装备后，可以弃置其他角色共两张牌，或搬动别人的装备。',
    en_US: 'Disruptive. After discarding two cards or losing equipment he strips two cards from opponents or moves their equipment around.',
  },
  m_ex__pangde: {
    zh_CN: '进攻型。锁定技拉近你与所有人的距离，【杀】指定目标后可以弃其一张牌，弃到装备牌就让对方无法响应。',
    en_US: 'Aggressive. A locked skill shortens distance, and each Slash strips a card from the target, blocking their response if it was equipment.',
  },
  m_ex__pangtong: {
    zh_CN: '控场型。梅花手牌可以当【铁索连环】使用或重铸，限定技可以弃光自己区域里的牌换摸三张并把体力回到3点。',
    en_US: 'Control. Turns club cards into Iron Chain, and once per game he wipes his own cards to reset to three fresh cards and 3 HP.',
  },
  m_ex__panzhangmazhong: {
    zh_CN: '进攻型。受伤后可以夺走伤害来源的武器牌，锁定技让你在攻击范围外的【杀】要么不可响应要么多1点伤害。',
    en_US: 'Aggressive. Takes the weapon of whoever damages him, and a locked skill makes his out-of-range Slashes either unblockable or harder hitting.',
  },
  m_ex__quancong: {
    zh_CN: '综合型。蓄力技可以弃手牌多的人一张牌，或让手牌少的人摸一张，受到伤害还会把蓄力点补回来。',
    en_US: 'Utility. Spends charges to strip a card-rich opponent or feed a card-poor one, and taking damage refunds those charges.',
  },
  m_ex__sunluban: {
    zh_CN: '干扰型。可以把自己的【杀】或黑色锦囊改由别人使用并抢其一张牌，受到男性角色伤害时弃一张装备就能免伤。',
    en_US: 'Disruptive. Redirects her own Slash or black trick through another player while robbing them, and discards equipment to shrug off damage from men.',
  },
  m_ex__wuyi: {
    zh_CN: '进攻型。出牌阶段开始弃任意张牌来拉近距离并让下一张基本牌或锦囊多打几个人，打出伤害就摸五张。',
    en_US: 'Aggressive. Discards cards to close distance and add targets to his next card, and a hit pays him five cards back.',
  },
  m_ex__xuhuang: {
    zh_CN: '控场型。黑色非锦囊牌可以当【兵粮寸断】使用，锁定技在别人跳过摸牌阶段时让你摸一张。',
    en_US: 'Control. Plays black non-trick cards as Supply Shortage, and a locked skill draws him a card whenever someone skips their draw phase.',
  },
  m_ex__xusheng: {
    zh_CN: '进攻型。【杀】指定目标后可以暂时扣走其手牌，对手牌和装备都不多的目标造成伤害时还会多1点。',
    en_US: 'Aggressive. Temporarily confiscates the target hand when he Slashes, and hits low-resource targets for an extra point of damage.',
  },
  m_ex__yanliangwenchou: {
    zh_CN: '进攻型。摸牌阶段改成亮两张挑一张，本回合还能把异色手牌当【决斗】使用并回收对方响应的【杀】。',
    en_US: 'Aggressive. Swaps the draw phase for a pick of two, then plays off-colour cards as Duel and collects the Slashes used to answer them.',
  },
  m_ex__yuanshu: {
    zh_CN: '摸牌型。锁定技让你按场上势力数摸牌，但弃牌阶段要多弃一张，觉醒后可以学新技能或抢主公技。',
    en_US: 'Card draw. A locked skill scales his draw phase with the number of kingdoms at a cost each discard phase, and awakening grants a new skill or the lord skill.',
  },
  m_ex__yuji: {
    zh_CN: '干扰型。每回合可以扣着一张手牌宣称成任意基本牌或普通锦囊使用，只有被人质疑成功这张牌才会作废。',
    en_US: 'Disruptive. Once a turn he plays a face-down card claiming to be any basic or trick, and it fizzles only if someone calls the bluff correctly.',
  },
  m_ex__yujin: {
    zh_CN: '控场型。回合结束时送一名角色一张牌，逼其在只留两张牌和让你摸三张之间二选一。',
    en_US: 'Control. Gives an opponent a card at his end phase and makes them choose between keeping two cards or letting him draw three.',
  },
  m_ex__zhonghui: {
    zh_CN: '成长型。靠“权”牌不断提高手牌上限，觉醒后回血或摸牌并获得新技能。',
    en_US: 'Late-game. Banks cards to raise his hand limit turn after turn, then awakens for healing or cards plus a new skill.',
  },
  m_ex__zhoucang: {
    zh_CN: '进攻型。出牌阶段的【杀】没被【闪】响应就能收回重用，被响应则可以抢走那张【闪】或换取额外的【杀】次数和伤害。',
    en_US: 'Aggressive. Recovers an unanswered Slash to use again, or trades a blocked one for the Dodge, extra Slashes and more damage.',
  },
  m_ex__zhoufei: {
    zh_CN: '辅助型。围绕武将牌上暂存的牌运作，让人摸牌、弃牌或回血，还能把当前回合角色的牌收起来再帮其使用。',
    en_US: 'Support. Works off cards parked on character cards to hand out draws, discards and healing, and stores the active player cards to replay later.',
  },
  m_ex__zhuran: {
    zh_CN: '防守反击型。其他角色回合结束时，你没被其指定过就摸一张，被指定过则可以弃牌反打1点伤害。',
    en_US: 'Defensive. At every other player end phase he draws if they ignored him, or discards to punch back for 1 damage if they targeted him.',
  },
  m_ex__zhuzhi: {
    zh_CN: '防守型。给一名角色挂上“安国”标记提高其手牌上限，场上有这个标记时你可以免除足以打倒你的伤害。',
    en_US: 'Defensive. Marks a player to raise their hand limit, and while that mark is out he can cancel damage heavy enough to fell him.',
  },
  m_friend__cuijun: {
    zh_CN: '摸牌型。围绕手牌点数运作，用最小的红桃牌换摸牌，用最大的牌逼别人弃掉一批手牌。',
    en_US: 'Card draw. Plays off card numbers, cashing his lowest heart for draws and his highest card to force an opponent to dump their big cards.',
  },
  m_friend__pangtong: {
    zh_CN: '摸牌型。一次拿到多张牌后可以把牌压回牌堆顶并从弃牌堆换来一批新牌，弃牌多的回合还能白用一批花色不同的牌。',
    en_US: 'Card draw. Recycles cards through the deck top to pull replacements from the discard pile, and a heavy-discard turn lets him play a free spread of suits.',
  },
  m_friend__shitao: {
    zh_CN: '进攻型。出牌阶段重铸任意张牌视为使用【决斗】，造成或受到伤害后还能弃最大点数的手牌换摸三张。',
    en_US: 'Aggressive. Recasts any number of cards into a Duel, and after any damage he discards his highest card to draw three.',
  },
  m_friend__xushu: {
    zh_CN: '综合型。开局就获得并装备【玄剑】，锁定技按使用牌的类别累计标记，攒够就换回血、摸牌或一次白打。',
    en_US: 'Utility. Starts with a special sword, and a locked skill banks marks by card type that cash in for healing, cards or a free play.',
  },
  m_friend__zhugeliang: {
    zh_CN: '摸牌型。每轮可以预测接下来会出现哪些牌，猜中越多摸得越多，全部猜中还能扩大下次预测的规模。',
    en_US: 'Card draw. Calls the cards about to be played each round, drawing more the more he gets right and expanding the forecast on a clean sweep.',
  },
  m_js__wangyun: {
    zh_CN: '进攻型。通过议事让全场表态，然后弃置或伤害意见与你不同的角色。',
    en_US: 'Aggressive. Puts a proposal to the table, then strips or damages the players who voted against him.',
  },
  m_liuyi__caoxing: {
    zh_CN: '进攻型。和一名角色比手牌点数，落在中间值就让下一张【杀】加伤且不可响应，弃过手牌后还能白用一张【杀】。',
    en_US: 'Aggressive. Compares revealed card numbers to make his next Slash unblockable and harder hitting, and a discard nets him a free Slash.',
  },
  m_liuyi__caozhi: {
    zh_CN: '干扰型。逼其他角色在出【杀】、弃两张手牌和自伤之间做选择，还能靠移动【六龙骖驾】视为使用各种基本牌。',
    en_US: 'Disruptive. Forces opponents to Slash, discard or hurt themselves, and moves a special chariot around to count as basic cards.',
  },
  m_liuyi__liuhui: {
    zh_CN: '摸牌型。按圆周率的数位对应手牌点数来摸牌，点数不小于10的牌还不计入手牌上限。',
    en_US: 'Card draw. Draws by matching card numbers to successive digits of pi, and his high cards do not count against his hand limit.',
  },
  m_liuyi__luyu: {
    zh_CN: '控场型。每轮让全场表决选出两条“律法”并在轮末执行，回合内还能让一张【杀】对目标无效并翻其手牌。',
    en_US: 'Control. Puts two house rules to a table vote each round and enforces the winners, and can void a Slash aimed at someone else.',
  },
  m_liuyi__zhangzhi: {
    zh_CN: '摸牌型。锁定技比较你连续使用的两张牌，类别相同摸牌堆顶，花色相同摸牌堆底，牌名也相同还能升级附加技能。',
    en_US: 'Card draw. A locked skill rewards playing cards that match the previous one, drawing from the top or bottom of the deck and upgrading a bonus skill on a full match.',
  },
  m_liuyi__zhouyu: {
    zh_CN: '辅助型。可以送人一个技能或帮人复原武将牌，还能把自己翻面来多执行一个阶段。',
    en_US: 'Support. Hands out a skill or unturns a character card, and can flip himself face down to run an extra phase.',
  },
  m_shi__caozhen: {
    zh_CN: '控场型。回合结束时把三张牌扣在其他角色的武将牌上，之后按颜色是否相符逼其弃牌或吃1点伤害。',
    en_US: 'Control. Parks three face-down cards on opponents at his end phase, then punishes them with discards or damage as they play.',
  },
  m_shi__chendao: {
    zh_CN: '综合型。锁定技靠“毅”标记在准备阶段和结束阶段之间二选一地摸牌或弃标记，另一个技能让一张牌无距离限制且不可被响应。',
    en_US: 'Utility. A locked skill banks marks that convert into draws, and his other skill sends one card through unblockable and without range limits.',
  },
  m_shi__chengpu: {
    zh_CN: '辅助型。可以给一名角色送一张火【杀】，也可以让自己或受害者弃牌来减免一次【杀】的伤害。',
    en_US: 'Support. Hands out Fire Slashes, and can trade hand cards to soften a Slash aimed at anyone.',
  },
  m_shi__chenjiao: {
    zh_CN: '防守型。展示手牌就能视为使用【闪】或【无懈可击】，出牌阶段还能把同色手牌合成一张【杀】打人。',
    en_US: 'Defensive. Reveals cards to count as Dodge or Nullification, and merges same-colour cards into one Slash on his turn.',
  },
  m_shi__chenzhis: {
    zh_CN: '爆发型。锁定技每轮弃光手牌换一个额外回合，另一个技能在别人的牌离开手牌时跟着摸牌或拆牌。',
    en_US: 'Aggressive. A locked skill trades his whole hand for an extra turn each round, and he draws or strips whenever cards leave play.',
  },
  m_shi__dengai: {
    zh_CN: '综合型。靠失去牌积攒蓄力点，蓄力点可以送红桃牌、换强力锦囊，还能在别人回合结束时白拿一张牌。',
    en_US: 'Utility. Banks charges whenever he loses cards, spending them on gifts, powerful tricks and free card steals at end phases.',
  },
  m_shi__guoyuan: {
    zh_CN: '防守型。别人的伤害牌结算后你可以拿【闪】或【杀】、拆一张牌或白用一张手牌，还能提前记录手牌数帮人摸牌。',
    en_US: 'Defensive. Answers incoming attacks by pulling a Slash or Dodge from the deck, stripping a card or playing one free, and he also feeds allies draws.',
  },
  m_shi__huangzu: {
    zh_CN: '进攻型。伤害类牌不受距离限制，弃手牌还能封住对方同色的响应牌，被弃掉的【杀】也能回收再用。',
    en_US: 'Aggressive. His damage cards ignore range and he discards to block same-colour responses, then recycles discarded Slashes to fire again.',
  },
  m_shi__huanjie: {
    zh_CN: '辅助型。准备阶段可以和一名角色交换手牌并互相临时授予技能，限定技让全场弃光手牌后各摸四张。',
    en_US: 'Support. Swaps hands and trades skills with someone at his prep phase, and once per game he resets every hand to four fresh cards.',
  },
  m_shi__lusu: {
    zh_CN: '辅助型。回合结束时把自己的手牌借给一名角色使用，还能让两名角色交换手牌并让弱势一方摸牌。',
    en_US: 'Support. Lends his hand to another player to use, and swaps two hands to even out the table.',
  },
  m_shi__luyusheng: {
    zh_CN: '辅助型。出牌阶段亮出牌堆顶的牌送给一名角色，还能防止身边角色受到的伤害或帮其从弃牌堆拿【桃】。',
    en_US: 'Support. Reveals the top of the deck to gift cards, and shields nearby players from damage or fetches them a Peach.',
  },
  m_shi__sunchen: {
    zh_CN: '进攻型。弃不同花色的牌逼攻击范围内的角色向你交牌，拒绝的人数决定你本回合的加伤次数。',
    en_US: 'Aggressive. Discards a spread of suits to demand tribute, and every refusal adds a point of damage to his attacks that turn.',
  },
  m_shi__sunjun: {
    zh_CN: '进攻型。出牌阶段展示别人一张手牌后弃掉它，或弃牌换1点伤害，锁定技让每个花色的第一张手牌不计次数。',
    en_US: 'Aggressive. Reveals and destroys an opponent card or spends discards for damage, and a locked skill makes the first card of each suit free to play.',
  },
  m_shi__taishici: {
    zh_CN: '进攻型。可以和一名角色一起补满手牌然后视为【决斗】，还能攒“烈”标记换一张附带多重强化的【杀】。',
    en_US: 'Aggressive. Fills both hands then forces a Duel, and banks marks to fire one heavily upgraded Slash.',
  },
  m_shi__tianfeng: {
    zh_CN: '辅助型。出牌阶段把两张以上手牌塞给一名角色，回合结束按其手牌多少摸牌或拆牌，手牌空了还能反制。',
    en_US: 'Support. Dumps cards on an opponent and profits at end of turn either way, and hits back when he runs out of cards or nearly dies.',
  },
  m_shi__wangchang: {
    zh_CN: '防守型。准备阶段让多名角色摸牌，被伤害牌指定时可以摸牌或把对方的牌压回牌堆顶来让这张牌对你无效。',
    en_US: 'Defensive. Feeds allies draws at his prep phase, and answers incoming attacks by drawing or burying the attacker card to void it.',
  },
  m_shi__weiyan: {
    zh_CN: '爆发型。用弃牌和体力换本阶段的不可响应和额外出牌次数，锁定技在体力或手牌不占优时给【杀】加伤。',
    en_US: 'Aggressive. Spends cards and HP to make his attacks unblockable and unlimited, and a locked skill adds damage when he is the worse off of the two.',
  },
  m_shi__xiahoushang: {
    zh_CN: '进攻型。准备阶段可以弃别人两张牌或造成1点火焰伤害，代价是跳过自己的摸牌阶段或出牌阶段。',
    en_US: 'Aggressive. Strips two cards or deals fire damage at his prep phase, paying for it by skipping his own draw or play phase.',
  },
  m_shi__xinxianying: {
    zh_CN: '控场型。看过当前回合角色的手牌后指定一种花色，让其整个回合都围绕这个花色行动，受伤后还能和同阵营的人一起摸牌。',
    en_US: 'Control. Reads the active player hand and names a suit that reshapes their whole turn, and shares draws with allies when damaged.',
  },
  m_shi__yuji: {
    zh_CN: '辅助型。把手牌当“符济”送给别人，让他们用这些牌时得到额外收益，自己也能把牌换成需要的基本牌。',
    en_US: 'Support. Gifts charmed cards that pay off when others play them, and can convert cards into the basic card he needs.',
  },
  m_shi__zanghong: {
    zh_CN: '爆发型。可以减1点体力上限换【桃】或【酒】，未受伤时被指定为目标还能摸两张牌。',
    en_US: 'Aggressive. Burns maximum HP for a Peach or Analeptic, and draws two whenever he is targeted while unhurt.',
  },
  m_shi__zhangyan: {
    zh_CN: '进攻型。伤害类锦囊可以当【杀】使用，还能把你和目标之间路径上的角色一起卷进这张【杀】。',
    en_US: 'Aggressive. Plays damage tricks as Slash and drags everyone standing between him and the target into it.',
  },
  m_shi__zhonghui: {
    zh_CN: '爆发型。蓄力点越多，全场【杀】的伤害越高、你摸的牌越多，而任何体力变化又会把蓄力点补回来。',
    en_US: 'Aggressive. Spends charges to make every Slash on the table hit harder while he draws, and any HP swing refills those charges.',
  },
  m_shi__zhouyu: {
    zh_CN: '进攻型。围绕火焰伤害和展示手牌运作，处于连环状态的角色受到火伤时还会被进一步加重。',
    en_US: 'Aggressive. Built around fire damage and forced reveals, and punishes chained opponents with extra fire on top.',
  },
  m_sp__caocao: {
    zh_CN: '控场型。前两轮用“令法”给全场加规则，逼别人用【杀】或【桃】时向你交牌，之后换成另一套技能。',
    en_US: 'Control. Imposes table-wide rules for the first two rounds that tax every Slash or Peach, then swaps into a different skill set.',
    missing: ['os__zhian'],
  },
  m_sp__guanqiujian: {
    zh_CN: '干扰型。废除其他角色的武器栏并按废除数多摸牌，锁定技在你受伤后把武器栏还回去。',
    en_US: 'Disruptive. Disables opponent weapon slots and draws more for each one disabled, restoring them when he takes damage.',
  },
  m_sp__simazhao: {
    zh_CN: '综合型。把牌存成“望”换等量摸牌，别人拿走“望”时你可以顺手打1点伤害，受伤时还能展示手牌逼对方选择。',
    en_US: 'Utility. Banks cards for equal draws and punishes whoever takes them, and reveals his hand to make attackers choose between paying up or cancelling.',
  },
  m_sp__yujin: {
    zh_CN: '干扰型。出牌阶段送一名角色一张牌，逼其使用非黑色【杀】让你摸牌，不从就吃1点伤害。',
    en_US: 'Disruptive. Gifts a card to force an opponent into a Slash that pays him draws, or deals damage if they refuse.',
  },
  m_sp__zhenji: {
    zh_CN: '摸牌型。锁定技要求每个出牌阶段的用牌方式和上次不同来换摸两张，别人回合里发生的事也在给你摸牌。',
    en_US: 'Card draw. A locked skill pays her for varying how she plays each turn, and other players turns keep feeding her cards.',
  },
  m_sp_lord__guanyu: {
    zh_CN: '进攻型。让至多两名角色向你交牌，然后把这些牌合成一张【杀】打出去，或分给别人来限制其出牌。',
    en_US: 'Aggressive. Collects cards from up to two players, then merges them into one Slash or redistributes them to weaken opponents.',
  },
  m_sp_lord__yuanshu: {
    zh_CN: '进攻型。锁定技开局把全场手牌换成【桃】和【酒】，之后按牌名字数递增地打出伤害牌。',
    en_US: 'Aggressive. A locked skill rewrites every hand into Peaches and Analeptics, then he escalates through damage cards by name length.',
  },
  m_sp_lord__zhaoyun: {
    zh_CN: '进攻型。使用基本牌后可以调整手牌数并顺手造成1点伤害，手牌构成单一时还能视为使用【闪】或【杀】。',
    en_US: 'Aggressive. Resets his hand size after each basic card for free damage, and conjures a Dodge or Slash when his hand runs one-sided.',
  },
  m_sp_lord__zhugeliang: {
    zh_CN: '综合型。开局拿到每种指定目标的锦囊各一张作为“兴”，造成伤害后逐渐解锁使用，用锦囊还能回血或打火伤。',
    en_US: 'Utility. Starts holding one of every targeted trick and unlocks them by dealing damage, healing or burning as he plays them.',
  },
  m_thoroughbred__lidian: {
    zh_CN: '综合型。用完基本牌可以弃别人一张牌，造成或受到伤害后还能和牌堆底换牌并白用其中一张。',
    en_US: 'Utility. Strips a card after each basic card, and swaps cards with the bottom of the deck after damage for a free play.',
  },
  m_thoroughbred__yuejin: {
    zh_CN: '进攻型。【杀】指定唯一目标后可以逼其弃牌，或把这张【杀】放进其装备栏持续压制并造成伤害。',
    en_US: 'Aggressive. Forces discards on a single-target Slash or nails the Slash into their equipment slot to keep punishing them.',
  },
  m_thoroughbred__zhangliao: {
    zh_CN: '控场型。锁定技让你的出牌阶段里别人的非基本手牌只能当【闪】用，牌被响应还能抢其一张手牌。',
    en_US: 'Control. A locked skill reduces every opponent non-basic card to a Dodge during his play phase, and responses cost them a card.',
  },
  m_yuan__chenlan: {
    zh_CN: '进攻型。只有一个锁定技：某个阶段里你既被指定过目标又有体力变化，阶段结束就视为使用一张【万箭齐发】。',
    en_US: 'Aggressive. One locked skill: if he was targeted and his HP moved during a phase, he fires an Archery Attack at the whole table when it ends.',
  },
  m_yuan__gaoshun: {
    zh_CN: '进攻型。出牌阶段可以摸牌后视为使用【决斗】并清掉一类手牌，限定技让全场都不能用非武器牌指定自己。',
    en_US: 'Aggressive. Draws into a free Duel while purging half his hand, and once per game he stops everyone from targeting themselves.',
  },
  m_yuan__guanyu: {
    zh_CN: '进攻型。任意张牌都能当无距离限制的【杀】使用，锁定技还在致命伤害时逼对方交牌或直接封锁其出牌。',
    en_US: 'Aggressive. Converts any number of cards into a rangeless Slash with bonus draws, and a locked skill squeezes the target when the blow would be lethal.',
  },
  m_yuan__lvbu: {
    zh_CN: '进攻型。出牌阶段逼所有其他角色展示手牌或挨一张【杀】，锁定技让不交牌的人多吃1点伤害。',
    en_US: 'Aggressive. Makes every opponent either reveal cards or eat a free Slash, and a locked skill taxes them another point if they hold back.',
  },
  m_yuan__meicheng: {
    zh_CN: '防守型。只有一个锁定技：某个阶段里你被指定过目标却没有体力变化，阶段结束就视为使用一张【决斗】。',
    en_US: 'Defensive. One locked skill: if he was targeted but took no HP change during a phase, he answers with a free Duel when it ends.',
  },
  m_yuan__sunquan: {
    zh_CN: '摸牌型。锁定技靠展示并保留手牌换额外摸牌，保得完整时本回合造成的伤害会高得夸张。',
    en_US: 'Card draw. A locked skill pays him for keeping the hand he revealed, and holding all of it makes his damage that turn absurd.',
  },
  m_yuan__tadun: {
    zh_CN: '进攻型。【杀】不计入手牌上限，被弃掉的【杀】还能视为再使用一次，回合内外都在不停摸牌弃牌。',
    en_US: 'Aggressive. Slashes do not count against his hand limit and discarded ones fire again for free.',
  },
  m_yuan__tanshihuai: {
    zh_CN: '进攻型。【杀】命中后可以接着用一张点数更大的【杀】并摸牌，锁定技把回合外拿到的牌全部视为【杀】。',
    en_US: 'Aggressive. Chains into a higher-numbered Slash after each hit, and a locked skill turns every card he picks up off-turn into a Slash.',
  },
  machao: {
    zh_CN: '进攻型。锁定技拉近你与所有人的距离，【杀】指定目标后判定为红色就让对方不能用【闪】。',
    en_US: 'Aggressive. A locked skill closes distance on everyone, and a red judgement stops the target from Dodging his Slash.',
  },
  majun: {
    zh_CN: '综合型。可以升级手上的特定装备牌，濒死时重铸防具把体力拉回1点，另一个技能靠小玩法换来一批牌。',
    en_US: 'Utility. Upgrades key equipment, pulls himself back to 1 HP by recasting armour, and plays a minigame for cards.',
  },
  maojie: {
    zh_CN: '综合型。出牌阶段每多用一种没用过的花色，就依次解锁让人摸牌、拆牌和造成1点伤害。',
    en_US: 'Utility. Each new suit he plays in a turn unlocks a bigger reward, from draws to strips to a point of damage.',
  },
  mayuanyi: {
    zh_CN: '综合型。放弃摸牌把牌堆顶的牌存成“兵”，“兵”可以当【杀】或【闪】使用，攒够就觉醒换新技能。',
    en_US: 'Utility. Trades his draw phase for banked cards that work as Slash or Dodge, and awakens into a new skill once enough are stored.',
  },
  mazhong: {
    zh_CN: '辅助型。出牌阶段送【杀】给其他角色，对方用掉这张【杀】你就摸一张牌。',
    en_US: 'Support. Hands Slashes to other players and draws a card whenever they use one.',
  },
  miheng: {
    zh_CN: '爆发型。把自己的出牌时间压到5秒换本阶段无距离次数限制并连续摸牌，弃牌阶段还能拆别人一张牌。',
    en_US: 'Aggressive. Cuts his own decision time to five seconds in exchange for unlimited plays and a stream of draws, and strips a card at his discard phase.',
  },
  mobile__baosanniang: {
    zh_CN: '进攻型。使用或打出【杀】时可以顺手抢别人区域里的一张牌，限定技用体力换牌并在濒死后把技能分给救你的人。',
    en_US: 'Aggressive. Steals a card from someone every time she uses a Slash, and once per game she trades HP for cards and gifts skills to whoever saved her.',
  },
  mobile__baoxin: {
    zh_CN: '干扰型。把一名角色手上的【杀】按座次依次传下去，最后一名角色要吃伤害，身边有人受伤时还能帮其拿牌。',
    en_US: 'Disruptive. Passes an opponent Slashes around the table until the last player takes the damage, and props up wounded neighbours.',
  },
  mobile__bianfuren: {
    zh_CN: '治疗型。用自己的体力把濒死的角色救回来，手牌上限等于体力上限，自己濒死时也能弃牌回血。',
    en_US: 'Healer. Spends her own HP to pull dying players back, and can discard to save herself when she goes down.',
  },
  mobile__caomao: {
    zh_CN: '成长型。靠“道心值”成长，受伤、造成伤害和获得牌都会累积，达到一定数值就依次解锁四个额外技能。',
    en_US: 'Late-game. Builds a resolve counter through damage and card gains, unlocking four extra skills as it climbs.',
  },
  mobile__caosong: {
    zh_CN: '干扰型。锁定技把“金”标记发给其他角色，附带的效果有好有坏，自己没“金”时回合开始就会死。',
    en_US: 'Disruptive. Doles out gold tokens with wildly different effects, and dies at the start of his turn if he has none left.',
  },
  mobile__caoying: {
    zh_CN: '进攻型。用伤害牌指定目标后猜其手牌构成，猜中越多就加伤、摸牌，甚至临时获得两个新技能。',
    en_US: 'Aggressive. Guesses what card types a target is holding when she attacks, gaining damage, draws and even borrowed skills for a correct read.',
  },
  mobile__cheliji: {
    zh_CN: '进攻型。锁定技让【杀】无距离限制但只能打上下家，命中后弃对方的牌，对方没手牌还会多吃1点伤害。',
    en_US: 'Aggressive. Locked skills give his Slash unlimited range against his neighbours, strip the victim and hit empty hands even harder.',
  },
  mobile__chendeng: {
    zh_CN: '综合型。猜一名角色接下来会用什么牌，猜中就看三张牌任意分配，锁定技在手牌没减少时让你摸三张。',
    en_US: 'Utility. Predicts what an opponent will play next for a three-card look and free distribution, and a locked skill pays him for holding cards.',
  },
  mobile__chengui: {
    zh_CN: '干扰型。锁定技锁定场上最不活跃的角色并翻其手牌拆牌，另一个锁定技逼伤害来源弃牌否则取消这次目标。',
    en_US: 'Disruptive. A locked skill tracks the least active player and rifles their hand, while another makes attackers pay a card or lose the target.',
  },
  mobile__cuilingyi: {
    zh_CN: '摸牌型。每轮看牌堆顶一批牌并挑走想要的，但和别人用牌撞名会掉血；锁定技让你的明置手牌对别人不可见。',
    en_US: 'Card draw. Peeks at the deck top each round and keeps what she wants at the risk of losing HP on a clash, with a locked skill hiding her revealed cards.',
  },
  mobile__cuiyan: {
    zh_CN: '摸牌型。摸牌阶段多摸一张，还能拿本回合获得的牌和人拼点，赢了就把拼点牌压回牌堆顶。',
    en_US: 'Card draw. Draws an extra card each turn and gambles fresh cards in a pindian, burying the loser card on a win.',
  },
  mobile__dengzhi: {
    zh_CN: '辅助型。出牌阶段抢一名角色一张牌再按体力值还牌给他，弃牌阶段还能展示手牌换对方一张牌。',
    en_US: 'Support. Takes a card and pays several back, and reveals his hand at the discard phase to demand a card in return.',
  },
  mobile__dongbai: {
    zh_CN: '控场型。把一张牌塞给别人后对持牌者无距离次数限制，锁定技让别人拿到你的黑牌后暂时用不出去。',
    en_US: 'Control. Marks a player with a gifted card to attack them freely, and a locked skill freezes her black cards in whoever holds them.',
  },
  mobile__dongcheng: {
    zh_CN: '进攻型。本回合获得过两张以上的牌，就能在结束阶段和人拼点，赢了视为使用一张无视防具的【杀】。',
    en_US: 'Aggressive. After a card-rich turn he gambles a pindian at the end phase for a free armour-piercing Slash.',
  },
  mobile__duyu: {
    zh_CN: '成长型。锁定技在任何人使用装备时累积“武库”标记，攒够三个就觉醒加体力上限并学会新技能。',
    en_US: 'Late-game. Banks a token whenever anyone equips, and awakens at three for extra HP and a new skill.',
  },
  mobile__furong: {
    zh_CN: '防守型。准备阶段暗中守护一名角色，替其挡下第一次伤害，并把等量伤害反弹给伤害来源。',
    en_US: 'Defensive. Secretly guards a chosen player, taking their first hit for them and reflecting the same damage back at the attacker.',
  },
  mobile__ganfuren: {
    zh_CN: '辅助型。展示当前回合角色的一张手牌来引导其出牌并一起摸牌，自己回血或获得牌后还能让别人摸牌回血。',
    en_US: 'Support. Steers the active player turn through a revealed card for shared draws, and turns her own healing and card gains into gifts for others.',
  },
  mobile__gaolan: {
    zh_CN: '进攻型。出牌阶段可以反复弃牌或掉血视为使用无距离次数限制的【杀】，和体力相同的角色互攻时还能摸牌。',
    en_US: 'Aggressive. Spends cards or HP to conjure rangeless Slashes, and draws when trading blows with someone at his own HP.',
  },
  mobile__godjiangwei: {
    zh_CN: '进攻型。看牌堆顶五张并和手牌交换排序，然后把其中的【杀】依次砸向一名角色，锁定技每回合还会清场弃牌。',
    en_US: 'Aggressive. Stacks the deck top and unloads every Slash in it on one victim, while a locked skill strips a zone from the whole table each turn.',
  },
  mobile__godmachao: {
    zh_CN: '爆发型。锁定技把你造成的伤害变成雷电伤害并免疫雷电，攒够“霆”标记还能一次打出等同对方体力上限的伤害。',
    en_US: 'Aggressive. A locked skill turns his damage into lightning and makes him immune to it, and enough thunder tokens deliver one enormous strike.',
  },
  mobile__godsimayi: {
    zh_CN: '成长型。锁定技在你不响应别人的牌时积攒“忍”标记，觉醒后获得一整套强力技能，杀死角色还能多一个回合。',
    en_US: 'Late-game. Banks patience tokens for every card he declines to answer, awakens into a whole skill package, and takes extra turns for kills.',
  },
  mobile__guanyinping: {
    zh_CN: '进攻型。受伤越多，能展示成不限次数【杀】的手牌就越多，还能直接对体力不低于你的角色打火焰伤害。',
    en_US: 'Aggressive. The more damage she has taken the more of her hand becomes unlimited Slashes, and she can burn healthy opponents outright.',
  },
  mobile__guozhao: {
    zh_CN: '干扰型。准备阶段挑一种花色抢走目标的装备和手牌并挂上“雀”标记，之后其获得同花色的牌你也能抢过来。',
    en_US: 'Disruptive. Names a suit to strip a target equipment and hand, then keeps skimming cards of that suit from them afterwards.',
  },
  mobile__hansui: {
    zh_CN: '进攻型。黑色牌可以当【杀】使用，其他角色回合结束时还能追加一张无距离限制的【杀】并拆其一张牌。',
    en_US: 'Aggressive. Plays black cards as Slash and fires an extra rangeless Slash at anyone who acted on their turn.',
  },
  mobile__heqi: {
    zh_CN: '综合型。锁定技按装备区里的花色数依次解锁三个额外技能，装备越杂能用的技能越多。',
    en_US: 'Utility. A locked skill grants extra skills based on how many suits he is wearing, so a varied kit means more skills.',
  },
  mobile__huaman: {
    zh_CN: '防守型。锁定技让你和攻击范围内的角色互相不能用伤害牌指定对方，回合结束还能把手牌补到存活人数。',
    en_US: 'Defensive. Locked skills stop her and anyone in range from targeting each other with damage, and she refills to a full hand each turn.',
  },
  mobile__huangfusong: {
    zh_CN: '综合型。判定结果为黑桃时可以打断判定并改成火【杀】打人，造成属性伤害后还能拆对方红色手牌换摸牌。',
    en_US: 'Utility. Hijacks spade judgements into a Fire Slash, and strips red cards for draws after any elemental damage.',
  },
  mobile__huaxin: {
    zh_CN: '辅助型。锁定技把你用过的牌存进“仁”区，有人濒死时清空“仁”区救人并把这些牌收进自己手里。',
    en_US: 'Support. Banks his played cards into a shared pile, then cashes it in to heal a dying player and keep the cards.',
  },
  mobile__huban: {
    zh_CN: '防守型。锁定技开局绑定一名角色，替其挡下伤害并转成“烈”标记，之后用自己的体力把标记结算掉。',
    en_US: 'Defensive. A locked skill bonds him to one player, absorbing their damage as tokens he later pays off with his own HP.',
  },
  mobile__huojun: {
    zh_CN: '爆发型。限定技让所有基本牌都能当【杀】打出去，另一个技能在结束阶段从弃牌堆拿回一批基本牌。',
    en_US: 'Aggressive. Once per game every basic card in his hand becomes a Slash, and he fishes basics back out of the discard pile each turn.',
  },
  mobile__jiachong: {
    zh_CN: '干扰型。出牌阶段让你或目标摸两张，没摸牌的一方要么对摸牌的人使用【杀】，要么抢其场上的一张牌。',
    en_US: 'Disruptive. Gives himself or a target two cards, and whoever missed out must either Slash the other or steal from them.',
  },
  mobile__jianggan: {
    zh_CN: '干扰型。让一名角色伪装一张手牌再由你来猜，猜中就造成伤害，猜错自己弃牌；限定技还能免除一次致命伤害。',
    en_US: 'Disruptive. Makes an opponent disguise a card and guesses which, dealing damage on a hit and discarding on a miss, with a once-per-game save from lethal damage.',
  },
  mobile__jiangji: {
    zh_CN: '综合型。每回合可以视为使用一张没记录过的普通锦囊，代价是记录过的牌名之后就不能再用也不能响应。',
    en_US: 'Utility. Conjures one unused trick each turn, at the cost of locking that card name out of his hand afterwards.',
  },
  mobile__jiangqin: {
    zh_CN: '综合型。锁定技回收别人弃掉的防具牌，另一个技能弃一张牌就能互看手牌并抢走其中一张。',
    en_US: 'Utility. A locked skill collects discarded armour, and he trades one card for a look at an opponent hand and a card from it.',
  },
  mobile__jikang: {
    zh_CN: '辅助型。出牌阶段按装备数把多名角色分成回血、掉血和摸牌，死亡时还会惩罚凶手并把技能传给别人。',
    en_US: 'Support. Sorts several players into healing, damage or draws by their equipment, and punishes his killer while passing his skill on.',
  },
  mobile__kongrong: {
    zh_CN: '辅助型。让出自己的摸牌阶段换“谦”标记，别人多摸两张而你回收其弃牌，受伤时还能反过来惩罚伤害来源。',
    en_US: 'Support. Gives up his own draw phase so someone else draws more, then collects their discards and punishes whoever damages him.',
  },
  mobile__lingju: {
    zh_CN: '综合型。造成或受到伤害时都能拿黑牌红牌或加减伤害，杀死角色后还能夺取其技能或与其交换身份。',
    en_US: 'Utility. Turns every point of damage in or out into cards or damage swings, and steals the skills or identity of anyone she kills.',
  },
  mobile__liuba: {
    zh_CN: '干扰型。限定技让全场弃掉一半手牌再把其中三张交给一名角色，另一个技能在你被单点时让一名角色重铸。',
    en_US: 'Disruptive. Once per game he makes the whole table dump half their hands, and he hands out recasts when singled out.',
  },
  mobile__liuye: {
    zh_CN: '进攻型。锁定技每回合开始装备一张【霹雳车】，受伤后还能随机换来武器，另一个技能复制打过你的那张牌。',
    en_US: 'Aggressive. A locked skill equips a siege weapon each turn and replaces it when damaged, and he can copy the last card that hurt him.',
  },
  mobile__liwei: {
    zh_CN: '辅助型。出牌阶段限两次，让一名角色从牌堆获得一张指定类别的牌，类别轮完后重置。',
    en_US: 'Support. Twice a turn he lets a player pull a card of a chosen type from the deck, cycling through the types.',
  },
  mobile__lougui: {
    zh_CN: '摸牌型。限定技把所有牌换成随机基本牌并提高手牌上限，另一个技能弃一张牌换来不同类别的牌。',
    en_US: 'Card draw. Once per game he rewrites his whole hand into random basics with a bigger hand limit, and otherwise trades a card for a fresh spread.',
  },
  mobile__lvfan: {
    zh_CN: '辅助型。准备阶段搬动场上的装备并让失去牌的人摸一张，别人回合里失去牌够多还能把手牌补到体力上限。',
    en_US: 'Support. Shuffles equipment around and pays the loser a card, and refills to full whenever he bleeds cards on other turns.',
  },
  mobile__maliang: {
    zh_CN: '摸牌型。锁定技让你回合内每次获得手牌都额外摸一张，但回合外拿到的牌会在回合结束时被弃掉。',
    en_US: 'Card draw. A locked skill gives him a bonus card every time he gains one on his turn, but off-turn cards vanish at the end phase.',
  },
  mobile__mamidi: {
    zh_CN: '综合型。锁定技把别人用过的牌按“六经”分类存起来，集齐六类就把这些牌全部收进手里。',
    en_US: 'Utility. A locked skill files away cards other players use into six categories, and completing the set hands him the whole collection.',
  },
  mobile__mengda: {
    zh_CN: '干扰型。暗中猜别人本回合会指定你几次，猜中就摸牌或反打一张【杀】，锁定技让拿走你牌的人付出代价。',
    en_US: 'Disruptive. Secretly bets on how often an opponent will target him for draws or a free Slash, and taxes anyone who takes his cards.',
  },
  mobile__mifuren: {
    zh_CN: '防守型。锁定技每回合结束按体力奇偶摸牌或回血，使命技靠弃两张手牌免除受到的伤害。',
    en_US: 'Defensive. A locked skill draws or heals at every end phase, and her mission cancels damage by discarding two cards.',
  },
  mobile__shenpei: {
    zh_CN: '防守型。被单点时可以对策，成功就让这张牌无效并收为己有，准备阶段还能拆其他角色两张牌。',
    en_US: 'Defensive. Contests any card aimed only at him, voiding and keeping it on a win, and strips two cards at his prep phase.',
  },
  mobile__simafu: {
    zh_CN: '辅助型。任何人受到伤害时你都能把伤害加1或减1并让伤害来源摸牌，被你干预过的角色死亡还能让你摸四张。',
    en_US: 'Support. Nudges any damage up or down while paying the attacker cards, and cashes in four cards when someone he touched dies.',
  },
  mobile__simazhao: {
    zh_CN: '进攻型。结束阶段视为使用【兵临城下】压制目标，出牌阶段还能靠拼点抢走对方展示或未展示的那半手牌。',
    en_US: 'Aggressive. Fires a siege trick at his end phase and gambles a pindian to take either half of an opponent hand.',
  },
  mobile__simazhou: {
    zh_CN: '防守型。可以取消指定你的基本牌和普通锦囊，没人响应就掉1点体力，有人响应则摸两张。',
    en_US: 'Defensive. Cancels basics and tricks aimed at him, paying 1 HP if nobody else responds and drawing two if they do.',
  },
  mobile__sufei: {
    zh_CN: '辅助型。锁定技每回合给一名角色挂“诤荐”，其出牌越多下回合摸得越多，你也能把【杀】转给带标记的人。',
    en_US: 'Support. Marks a player each turn so their activity pays them draws, and he can push a Slash aimed at him onto a marked ally.',
  },
  mobile__sunluyu: {
    zh_CN: '防守型。弃一张牌让当前回合角色临时获得【止息】，出牌阶段还能弃掉或抢走场上的装备和防具。',
    en_US: 'Defensive. Discards to saddle the active player with a restricting skill, and strips or claims equipment on the table.',
  },
  mobile__sunshao: {
    zh_CN: '辅助型。开局给全场选一项增益效果，之后可以更换、加倍，或在受伤后收回对方的这项增益。',
    en_US: 'Support. Picks one table-wide buff at the start, then reassigns, doubles or revokes it as the game goes.',
  },
  mobile__wangcan: {
    zh_CN: '辅助型。送一张非基本牌给别人换回血或摸两张，“檄”标记还会在对方回血时逼其交牌或掉体力。',
    en_US: 'Support. Trades a non-basic card for healing or two draws, and his mark taxes whoever heals while holding it.',
  },
  mobile__wangling: {
    zh_CN: '摸牌型。使用过的牌名会记成“备”，结束阶段移除一个“备”就能从牌堆拿一张同名牌。',
    en_US: 'Card draw. Records the names of cards he plays and cashes one in at his end phase for a copy from the deck.',
  },
  mobile__wangshuang: {
    zh_CN: '进攻型。装备区有武器时被【杀】伤害可以夺过这张【杀】反打回去，另一个技能保证你稳定拿到武器牌。',
    en_US: 'Aggressive. With a weapon equipped he seizes the Slash that hurt him and fires it back, and he can always fetch a weapon from the deck.',
  },
  mobile__wangyuanji: {
    zh_CN: '防守型。锁定技按装备区的颜色获得额外的防御技能，另一个锁定技在你失去的牌不多时把牌补回来。',
    en_US: 'Defensive. A locked skill grants extra defensive skills based on the colour of her equipment, and another refunds the cards she spends.',
  },
  mobile__wangyun: {
    zh_CN: '干扰型。让两名角色互相攻击并累积“连计”标记，攒够就觉醒加体力上限并换成新技能。',
    en_US: 'Disruptive. Sets two players on each other to bank tokens, then awakens for extra HP and a new skill.',
  },
  mobile__weiwenzhugezhi: {
    zh_CN: '摸牌型。出牌阶段让所有其他角色同时选“潮起”或“潮落”，从你下家开始连续选到相同的人数决定你摸几张。',
    en_US: 'Card draw. Puts a simultaneous choice to the table and draws for every player from his right who matched the same call.',
  },
  mobile__wenqin: {
    zh_CN: '进攻型。开局送武器给两名角色，【杀】的攻防中还能选择加伤，或在被抵消后抢走附近角色的一张牌。',
    en_US: 'Aggressive. Hands out weapons at the start, then boosts his Slash damage or snatches a card when it is blocked.',
  },
  mobile__wenyang: {
    zh_CN: '进攻型。【杀】或【决斗】指定唯一目标后可以抢牌或加伤，杀死角色还能加体力上限并摸两张牌。',
    en_US: 'Aggressive. Steals a card or adds damage on any single-target attack, and a kill grants him extra maximum HP and cards.',
  },
  mobile__wuban: {
    zh_CN: '进攻型。只有一个很直接的锁定技：【杀】无距离限制且次数+1，第一张不可响应，第二张伤害+1。',
    en_US: 'Aggressive. One blunt locked skill: rangeless Slashes, one extra per turn, the first unblockable and the second hitting harder.',
  },
  mobile__wujing: {
    zh_CN: '进攻型。别人打出【决斗】或红【杀】后你可以跟着补一刀并随机摸红牌，锁定技还能回收别人无效的黑【杀】。',
    en_US: 'Aggressive. Piles on after someone else Duel or red Slash with a free attack and a red card, and collects their failed black Slashes.',
  },
  mobile__xianglang: {
    zh_CN: '辅助型。跳过出牌阶段换一次任意张换牌，并给至多两名角色各送一张，死亡时还会把全场体力拉平。',
    en_US: 'Support. Skips his play phase to cycle his hand and gift cards around, and levels everyone HP when he dies.',
  },
  mobile__xingdaorong: {
    zh_CN: '进攻型。其他角色出牌阶段开始时把手牌调整到与其相同再视为【决斗】，没打出伤害就自己掉1点体力。',
    en_US: 'Aggressive. Matches an opponent hand size and forces a Duel at the start of their turn, losing 1 HP if it fails to land.',
  },
  mobile__xinpi: {
    zh_CN: '控场型。逼一名角色要么跳过下回合的出牌和弃牌阶段，要么马上对你使用【杀】，你还能判定取消单点你的牌。',
    en_US: 'Control. Makes an opponent choose between losing most of their next turn or Slashing him now, and can judge away cards aimed only at him.',
  },
  mobile__xuezong: {
    zh_CN: '控场型。别人响应你的牌时你可以把那张响应牌收走，另一个技能让人摸一批牌再逼其弃牌。',
    en_US: 'Control. Collects whatever card is used to answer his own, and floods a player with draws only to make them discard.',
  },
  mobile__xurong: {
    zh_CN: '进攻型。把“暴戾”标记塞给其他角色，你对其伤害+1，其回合开始时还会随机受罚。',
    en_US: 'Aggressive. Brands opponents with a token that boosts his damage against them and punishes them at the start of their turn.',
  },
  mobile__yanghong: {
    zh_CN: '干扰型。让两名角色拼点，赢的人视为对没赢的人使用一张【杀】，还能搬动场上的牌并让人摸牌。',
    en_US: 'Disruptive. Pits two players in a pindian so the winner Slashes the loser, and shuffles cards around the table for draws.',
  },
  mobile__yanghu: {
    zh_CN: '综合型。结束阶段展示一张牌，下个回合用它和人拼点，赢了抢牌并补一张，限定技还能给人装满装备栏。',
    en_US: 'Utility. Flags a card now to gamble it next turn for steals and draws, and once per game he fills someone empty equipment slots.',
  },
  mobile__yanghuiyu: {
    zh_CN: '辅助型。指定一名角色，其造成伤害时按判定给受害者摸牌或直接减伤，限定技还能继承死者的全部技能。',
    en_US: 'Support. Tags a player so their damage either pays the victim or shrinks, and once per game she inherits a dead player skills.',
  },
  mobile__yangqiu: {
    zh_CN: '干扰型。出牌阶段看一名角色的手牌并选中一张，逼其一直弃牌直到弃满五张或弃掉你选的那一张。',
    en_US: 'Disruptive. Looks at an opponent hand, picks one card, and makes them discard until they hit it or lose five.',
  },
  mobile__yanxiang: {
    zh_CN: '辅助型。把手牌标记成“谏”送给别人，其正常使用你们各摸两张，被浪费掉则你们各弃一张。',
    en_US: 'Support. Gifts marked cards that pay both players two draws when used properly and cost both a card when wasted.',
  },
  mobile__yuanshu: {
    zh_CN: '摸牌型。锁定技在体力比你高的角色准备阶段让你摸牌，另一个技能让攻击范围内的人把【杀】转给你。',
    en_US: 'Card draw. A locked skill draws him cards off every healthier player prep phase, and neighbours can push their Slashes onto him.',
  },
  mobile__yuejiu: {
    zh_CN: '辅助型。你或攻击范围内的角色使用【杀】时可以弃一张牌加伤，没造成伤害则摸牌并反打使用者1点伤害。',
    en_US: 'Support. Discards to boost any Slash from himself or his range, and punishes the user with damage and a draw if it misses.',
  },
  mobile__zerong: {
    zh_CN: '综合型。按每回合的伤害和治疗攒“业”牌用来免伤，限定技把“业”一次性换成伤害或体力上限。',
    en_US: 'Utility. Banks cards from dealing damage or healing to cancel damage later, and cashes the pile in for one big strike or heal.',
  },
  mobile__zhangbao: {
    zh_CN: '干扰型。把手牌当“咒”放在别人身上来操控其判定，移除“咒”时还会让相关角色掉体力。',
    en_US: 'Disruptive. Pins cards on opponents to control their judgements, and costs them HP when the curse comes off.',
  },
  mobile__zhangchangpu: {
    zh_CN: '防守型。锁定技受伤后摸牌或弃牌并展示手牌，花色不撞就回1点体力，另一个技能靠送出同花色的牌来打伤害。',
    en_US: 'Defensive. A locked skill turns damage into cards and heals her when suits do not match, and she deals damage by gifting a whole suit away.',
  },
  mobile__zhangfen: {
    zh_CN: '辅助型。靠重铸和回收装备牌积攒铸造值，用来打造【大攻车】交给场上的角色使用。',
    en_US: 'Support. Recycles equipment into a build meter and constructs a siege engine for someone at the table to use.',
  },
  mobile__zhanggong: {
    zh_CN: '辅助型。把手牌当“信”分给别人，逼其在让你摸两张和手牌上限-2之间选择，还能看牌堆顶挑一张牌。',
    en_US: 'Support. Posts letters to opponents who must either pay him draws or shrink their hand limit, and he peeks at the deck for a card.',
  },
  mobile__zhangjih: {
    zh_CN: '防守型。每轮逼身边的角色弃【杀】或放弃用锦囊指定你，锁定技还会持续把牌堆顶的牌存成“蓄”。',
    en_US: 'Defensive. Each round he makes nearby players give up a Slash or the right to target him, while a locked skill quietly stockpiles cards.',
  },
  mobile__zhangqiying: {
    zh_CN: '综合型。四种道教标记分别用来改判定、当【桃】自救、给伤害加1和补一批牌，弃牌时按花色补充标记。',
    en_US: 'Utility. Four ritual tokens each buy a different effect, from rewriting a judgement to saving herself or boosting damage, refilled by her discards.',
  },
  mobile__zhangwen: {
    zh_CN: '辅助型。锁定技在有人回血时把牌堆顶的牌存进“仁”区，之后让体力高的角色放弃摸牌改拿“仁”牌。',
    en_US: 'Support. Banks a card into a shared pile whenever anyone heals, then trades those cards to a healthier player in place of their draw phase.',
  },
  mobile__zhouchu: {
    zh_CN: '进攻型。锁定技压低所有其他角色的手牌上限并把你的装备牌变成【酒】，使命技靠拼点抢牌和补装备。',
    en_US: 'Aggressive. A locked skill squeezes every other hand limit and turns his equipment into Analeptic, and his mission gambles pindian for cards and gear.',
  },
  mobile__zhujun: {
    zh_CN: '综合型。拼点没赢也能让另一名角色替你打出火【杀】，还能和攻击范围内的角色共享“整肃”奖励。',
    en_US: 'Utility. Turns a lost pindian into someone else firing a Fire Slash, and shares discipline rewards with players in his range.',
  },
  muludawang: {
    zh_CN: '综合型。造成或受到伤害后随机召唤豹鹰熊兔之一来打人、抢牌或摸牌，限定技可以锁定你想要的那只野兽。',
    en_US: 'Utility. Summons one of four beasts after damage for a hit, a steal or a draw, and once per game he locks in the beast he wants.',
  },
  mxing__dongzhuo: {
    zh_CN: '爆发型。用体力上限换【决斗】或额外的【杀】，锁定技让手牌上限等于体力上限并靠花色慢慢把上限加回来。',
    en_US: 'Aggressive. Burns maximum HP for extra Duels and Slashes, while a locked skill ties his hand limit to it and slowly grows it back.',
  },
  mxing__fazheng: {
    zh_CN: '摸牌型。锁定技记录你回合外获得牌的花色，出牌阶段只能用记录过的花色，攒够花色再一次性换成摸牌。',
    en_US: 'Card draw. A locked skill records the suits he picks up off-turn and restricts him to those, then cashes the collection in for draws.',
  },
  mxing__ganning: {
    zh_CN: '进攻型。把每种花色各存一张成“铃”当手牌使用，用掉一张还能从牌堆补一张同花色的牌。',
    en_US: 'Aggressive. Stores one card of each suit as bells he can play like hand cards, each replaced from the deck when spent.',
  },
  mxing__huangzhong: {
    zh_CN: '进攻型。转换技在准备阶段拉近距离并让黑【杀】不可响应，结束阶段则让别人更难够到你。',
    en_US: 'Aggressive. A switching locked skill closes distance and makes his black Slashes unblockable on his turn, then pushes everyone away after it.',
  },
  mxing__wanglang: {
    zh_CN: '干扰型。被单点或单点别人时都能拼点，赢了让这张牌多结算一次，输了让它直接无效。',
    en_US: 'Disruptive. Gambles a pindian on any single-target card, doubling it on a win and voiding it on a loss.',
  },
  mxing__weiyan: {
    zh_CN: '爆发型。出牌阶段可以把所有手牌合成一张无视防具的【杀】，命中后掉1点体力就能把手牌补满。',
    en_US: 'Aggressive. Fuses his entire hand into one armour-piercing Slash and refills to full for 1 HP when it connects.',
  },
  mxing__xuhuang: {
    zh_CN: '摸牌型。出牌阶段可以把手牌补到体力上限但本阶段不能对别人用牌，也可以把多余的手牌塞给一名角色。',
    en_US: 'Card draw. Refills his hand up to his maximum HP at the price of not attacking that phase, or dumps his surplus on someone else.',
  },
  mxing__zhanghe: {
    zh_CN: '进攻型。出牌阶段失去1点体力换手牌上限+1，并二选一：搬动场上一张牌，或摸牌后白用一张【杀】。',
    en_US: 'Aggressive. Spends 1 HP for a bigger hand limit and either moves a card on the table or draws into a free Slash.',
  },
  mxing__zhangliao: {
    zh_CN: '进攻型。锁定技给目标挂上“惧”标记，之后其受伤时要么多吃1点伤害，要么被你抢走一张牌。',
    en_US: 'Aggressive. A locked skill brands his target with fear, so their next damage either hits harder or costs them a card to him.',
  },
  mxing__zhoubuyi: {
    zh_CN: '干扰型。自伤1点就能让一名角色视为对另一名角色造成1点伤害，受伤的回合还能让人摸牌或回血。',
    en_US: 'Disruptive. Takes 1 damage to make one player hurt another, and hands out draws or healing on any turn he was damaged.',
  },
  nos__huaxin: {
    zh_CN: '辅助型。把手牌送给别人来累积“仁”牌，准备阶段全部收回，有人濒死时还会自动救人。',
    en_US: 'Support. Gives cards away to bank a reserve he collects each prep phase, and it automatically heals anyone who goes down.',
  },
  nos__mifuren: {
    zh_CN: '辅助型。把自己翻面来送给一名角色一张【杀】并给其加伤，受伤后翻回正面还能摸一张牌。',
    en_US: 'Support. Flips herself face down to arm someone with a boosted Slash, and turns back up for a card when damaged.',
  },
  nos__xunchen: {
    zh_CN: '干扰型。逼一名角色去打别人否则你摸一张，限定技弃两张手牌就能抢光对方装备区里的牌。',
    en_US: 'Disruptive. Makes an opponent attack someone else or pay him a card, and once per game he strips a whole equipment area.',
  },
  pangdegong: {
    zh_CN: '辅助型。出牌阶段挑一件宝物触发不同效果，锁定技让你只有摸牌、出牌和弃牌阶段且不能被延时锦囊指定。',
    en_US: 'Support. Polishes one of four treasures each turn for a different effect, and a locked skill strips his turn to the essentials while making him immune to delayed tricks.',
  },
  pangxi: {
    zh_CN: '辅助型。手牌最少的角色受伤后可以让其摸两张，还能和手牌少的角色交换手牌来再触发一次同样的效果。',
    en_US: 'Support. Feeds the most card-starved player two cards when they are hurt, and swaps hands to trigger the same effect again.',
  },
  peixiu: {
    zh_CN: '摸牌型。围绕牌的点数运作，点数是上一张牌的因数就摸牌，是倍数就不计使用次数。',
    en_US: 'Card draw. Plays off card numbers, drawing on factors of his last card and playing freely on multiples of it.',
  },
  pengyang: {
    zh_CN: '综合型。靠“达命”值运作，别人向你交牌就增加，用来把牌当【杀】或伤害类锦囊使用，也决定你的手牌上限。',
    en_US: 'Utility. Runs on a resolve counter fed by tribute from other players, spending it to turn cards into attacks and using it as his hand limit.',
  },
  qianzhao: {
    zh_CN: '防守型。拼点赢了就让对方一段时间内无法伤害你的友方，结束阶段还能给一名角色1点护甲。',
    en_US: 'Defensive. A pindian win stops an opponent hurting his allies for a while, and he hands out armour at his end phase.',
  },
  qiaogong: {
    zh_CN: '控场型。把两张“遗珠”洗回牌堆顶，别人用到它时你可以直接取消，还能给两名角色配对加成。',
    en_US: 'Control. Seeds marked cards into the deck top and cancels them when someone plays one, and pairs two players for a bonus.',
  },
  ruanhui: {
    zh_CN: '摸牌型。摸牌阶段亮三张挑走小牌并顺手抢别人一张，弃过黑牌还能在下个回合回收别人用过的牌。',
    en_US: 'Card draw. Swaps her draw phase for low cards off the deck top plus a steal, and later collects the cards an opponent plays.',
  },
  shichangshi: {
    zh_CN: '特殊型。锁定技开局发到十张“常侍”牌并随机组成双将，死亡时只要还有没亮出的牌就改为休整一轮。',
    en_US: 'Unusual. A locked skill deals him ten courtier cards that pair up randomly, and while any remain unrevealed death only benches him for a round.',
  },
  shixie: {
    zh_CN: '防守型。放弃摸牌让所有人离你更远，锁定技在别人回合结束时给你或对方摸牌并逐渐拉近距离。',
    en_US: 'Defensive. Gives up his draw phase to push everyone away, and a locked skill feeds draws while the distance slowly closes again.',
  },
  simayi: {
    zh_CN: '控场型。可以打出手牌替换任何角色的判定牌，受伤后还能直接拿走伤害来源的一张牌。',
    en_US: 'Control. Replaces any judgement card with one from his hand, and takes a card from whoever damages him.',
  },
  sunhao: {
    zh_CN: '进攻型。按已受伤的角色数决定摸牌量，锁定技在你没有手牌时让受到的伤害+1。',
    en_US: 'Aggressive. Draws in proportion to how many players are wounded, and a locked skill makes damage hurt more while his hand is empty.',
  },
  sunquan: {
    zh_CN: '摸牌型。出牌阶段可以弃任意张牌再摸等量的牌，把没用的牌全部换成有用的。',
    en_US: 'Card draw. Discards any number of cards each turn and draws the same number back, turning dead cards into live ones.',
  },
  sunru: {
    zh_CN: '进攻型。准备阶段白送一张无距离限制的【杀】，锁定技免疫所有火焰伤害。',
    en_US: 'Aggressive. Gets a free rangeless Slash at her prep phase, and a locked skill makes her immune to fire damage.',
  },
  sunshangxiang: {
    zh_CN: '综合型。装备区失去牌就摸两张，出牌阶段弃两张手牌还能和一名受伤的男性角色一起回血。',
    en_US: 'Utility. Draws two whenever she loses equipment, and can discard two cards to heal both herself and a wounded man.',
  },
  sunshaow: {
    zh_CN: '进攻型。把装备区的牌当【杀】使用且对方很难响应，出牌阶段结束还能弃同花色手牌换装备和额外收益。',
    en_US: 'Aggressive. Fires equipment as a hard-to-block Slash, and trades a whole suit at end of phase for gear plus cards, healing or armour.',
  },
  sunyi: {
    zh_CN: '爆发型。锁定技让你出牌阶段只能用本回合获得的牌，靠攒“厉”标记在回合开始大量弃牌换摸牌。',
    en_US: 'Aggressive. A locked skill restricts him to cards drawn this turn and banks tokens that convert into a big discard-and-draw at the start of his turn.',
  },
  taoqian: {
    zh_CN: '防守型。锁定技在别人濒死时把体力上限砸到1换一大把牌，另一个技能又能把体力上限加回去。',
    en_US: 'Defensive. A locked skill crashes his maximum HP to one for a fistful of cards when someone is dying, and another skill builds it back up.',
  },
  tongqu__jiakui: {
    zh_CN: '辅助型。用体力给角色挂“渠”标记让其多摸一张并互相传牌，还能弃光装备免除一次致命伤害。',
    en_US: 'Support. Spends HP to mark players who then draw more and pass cards to each other, and dumps his equipment to cancel a lethal blow.',
  },
  wangfuzhaolei: {
    zh_CN: '辅助型。开局和一名角色结成“义”，两人中任意一方受伤另一方弃牌，任意一方造成伤害另一方摸牌。',
    en_US: 'Support. Bonds with one player so damage taken by either costs the other a card and damage dealt pays the other a draw.',
  },
  wangjing: {
    zh_CN: '防守型。未受伤时基本牌能当【杀】，受伤后基本牌能当【闪】或【无懈可击】，还能把指向盟友的牌转到自己身上。',
    en_US: 'Defensive. Turns basics into Slash while healthy and into Dodge or Nullification once hurt, and can pull a card aimed at an ally onto himself.',
  },
  wangjun: {
    zh_CN: '综合型。出牌阶段让装备区有牌的角色一起摸牌，也可以重置多名角色并各造成1点火焰伤害。',
    en_US: 'Utility. Pays draws to everyone wearing equipment, or unchains several players and burns each of them for 1.',
  },
  wanglang: {
    zh_CN: '干扰型。用一张手牌同时和至多三名角色拼点，没赢的人弃牌或让你摸牌，但你自己输多了会累积标记直到死亡。',
    en_US: 'Disruptive. Pindians against up to three players at once for discards or draws, but stacking too many losses eventually kills him.',
  },
  wooden_ox: {
    zh_CN: '综合型。锁定技每回合抢走一名角色某个区域里的装备牌，另一个技能把装备存成“器”并获得其全部效果。',
    en_US: 'Utility. A locked skill strips equipment from one zone every prep phase, and it can bank equipment to keep all of their effects.',
  },
  wuke: {
    zh_CN: '辅助型。有人濒死时逼伤害来源交牌或让其回血，出牌阶段还能把一名角色的手牌调整到体力上限。',
    en_US: 'Support. Makes attackers pay up or heal when someone goes down, and tops a player hand up to their maximum HP.',
  },
  xiahoudun: {
    zh_CN: '防守反击型。受伤后判定不是红桃，就让伤害来源弃两张手牌或再吃1点伤害。',
    en_US: 'Defensive. After taking damage a non-heart judgement makes the attacker discard two cards or take 1 damage back.',
  },
  xiangchong: {
    zh_CN: '防守型。锁定技在你回合外失去一张牌后，逼当前回合角色交给你一张牌或让你直接把那张牌收走。',
    en_US: 'Defensive. A locked skill makes the active player pay him whenever he loses a single card off-turn.',
  },
  xuchu: {
    zh_CN: '进攻型。摸牌阶段少摸一张，换本回合【杀】和【决斗】对目标的伤害+1。',
    en_US: 'Aggressive. Draws one card fewer to make his Slashes and Duels hit for an extra point that turn.',
  },
  yangbiao: {
    zh_CN: '防守型。锁定技在前几轮不断加体力上限并回血，受伤后还能搬动场上的牌或补一张你指定类别的牌。',
    en_US: 'Defensive. A locked skill grows his maximum HP and heals him in the early rounds, and damage pays him a card of his choice.',
  },
  yangfeng: {
    zh_CN: '辅助型。转换技轮流让一名角色回血或摸两张，使命技的成败会把这个技能升级成两种不同的版本。',
    en_US: 'Support. Alternates between healing someone and giving them two cards, and his mission upgrades that skill in one of two directions.',
  },
  yangfu: {
    zh_CN: '防守反击型。锁定技在你受伤后随机抢一名旁观者的牌并直接装备，另一个技能靠拼点互相造成1点伤害。',
    en_US: 'Defensive. A locked skill grabs a random card from a bystander when he is hurt, and he trades a pindian for a point of damage.',
  },
  yanpu: {
    zh_CN: '辅助型。送一张牌让攻击范围内的角色跳过摸牌阶段，回合结束再补偿其回血摸牌，或者自己摸三张。',
    en_US: 'Support. Pays a card to skip a nearby player draw phase, then repays them with healing and cards or takes three himself.',
  },
  yuanhuan: {
    zh_CN: '防守型。每轮可以拼点取消一张针对弱者的牌，锁定技让你的手牌数向指定角色的体力值看齐。',
    en_US: 'Defensive. Once a round he gambles to cancel a card aimed at a weaker player, and a locked skill keeps his hand size tied to a chosen player HP.',
  },
  zhangbu: {
    zh_CN: '进攻型。使用锦囊指定其他角色后可以弃其一张牌，颜色相同还能追加1点伤害。',
    en_US: 'Aggressive. Strips a card whenever he plays a trick at others, adding a point of damage if the colours match.',
  },
  zhangfei: {
    zh_CN: '进攻型。锁定技让你在出牌阶段使用【杀】没有次数限制，手上有多少【杀】就能打多少。',
    en_US: 'Aggressive. A locked skill removes the limit on Slashes, so he attacks as many times as he has cards for.',
  },
  zhangliao: {
    zh_CN: '干扰型。摸牌阶段可以改为直接从至多两名其他角色手里各抢一张手牌。',
    en_US: 'Disruptive. Swaps his draw phase for taking one hand card each from up to two other players.',
  },
  zhangzhongjing: {
    zh_CN: '治疗型。锁定技把没造成伤害的牌存进“仁”区，用来给手牌不足的角色补牌或让人回血。',
    en_US: 'Healer. Banks his harmless cards into a shared pile and spends it to top up short hands and heal players.',
  },
  zhaotongzhaoguang: {
    zh_CN: '综合型。两张牌（其中至少一张基本牌）可以当任意基本牌使用或打出，觉醒后只需要一张牌。',
    en_US: 'Utility. Turns two cards into any basic card, and after awakening a single card is enough.',
  },
  zhaoyun: {
    zh_CN: '综合型。【杀】和【闪】可以互相转换使用，攻守都很灵活。',
    en_US: 'Utility. Plays Slash as Dodge and Dodge as Slash, so his hand works for attack and defence alike.',
  },
  zhengxuan: {
    zh_CN: '辅助型。出牌阶段整理一批牌，把其中一部分作为“经”送给一名角色，其收下后要跳过判定和摸牌阶段。',
    en_US: 'Support. Sorts a batch of cards and gifts some to a player, who gains them but must skip their judgement and draw phases.',
  },
  zhenji: {
    zh_CN: '摸牌型。准备阶段判定为黑色就能拿走判定牌并继续判定，黑色手牌还能当【闪】使用。',
    en_US: 'Card draw. Keeps flipping judgements at her prep phase and pockets every black one, and her black cards double as Dodge.',
  },
  zhouqun: {
    zh_CN: '综合型。每轮抽一支“命运签”，给一名角色附上从完全免伤到伤害加重的不同效果。',
    en_US: 'Utility. Draws a fortune slip each round that saddles a player with anything from full damage immunity to extra damage taken.',
  },
  zhouyu: {
    zh_CN: '摸牌型。摸牌阶段多摸一张，出牌阶段还能让一名角色猜花色，猜错就吃1点伤害。',
    en_US: 'Card draw. Draws an extra card each turn, and makes an opponent guess a suit or take 1 damage.',
  },
  zhugeguo: {
    zh_CN: '综合型。装备牌进入装备区就能从牌堆拿一张锦囊并用它摸牌，锁定技让非基本牌不计入手牌上限。',
    en_US: 'Utility. Each new piece of equipment fetches a trick she can play for a card, and a locked skill exempts non-basics from her hand limit.',
  },
  zhugeke: {
    zh_CN: '进攻型。回合外需要基本牌时可以看牌堆顶两张直接使用，出牌阶段弃牌就能对攻击范围内的人造成1点伤害。',
    en_US: 'Aggressive. Peeks at the deck top for the basic card he needs off-turn, and discards cards to deal damage inside his range.',
  },
  zhugeliang: {
    zh_CN: '控场型。准备阶段可以看几张牌并重排牌堆顶，锁定技让你没有手牌时不能被【杀】和【决斗】指定。',
    en_US: 'Control. Rearranges the top of the deck at his prep phase, and a locked skill makes him untargetable by Slash and Duel while his hand is empty.',
  },
  zhujic: {
    zh_CN: '进攻型。把手牌弃到特定数量视为使用一张可以打多人的【杀】，全部命中还能把手牌补回来。',
    en_US: 'Aggressive. Discards down to a specific hand size to fire a multi-target Slash, refilling his hand if every target is hit.',
  },
};

/**
 * The summary for a general, or `undefined` when there is none.
 *
 * `undefined` is a real answer and the box renders it as one. A general can
 * legitimately be absent — a package added after this file was written, or a
 * hidden general the roster keeps out of the pool (`lua/web/roster.lua`) but
 * that the table can still show on right-click. Inventing a summary for a
 * general nobody has read is exactly the vague filler the request ruled out.
 *
 * `hasOwnProperty` rather than a bare index: the key is the engine's own string
 * and `constructor` is a general name in the same sense that `toString` is.
 */
export function generalSummary(name: string): GeneralSummary | undefined {
  return Object.prototype.hasOwnProperty.call(GENERAL_SUMMARIES, name)
    ? GENERAL_SUMMARIES[name]
    : undefined;
}

/**
 * The four strings the toggle itself needs, in both languages.
 *
 * NOT in `src/i18n/ui.ts`, deliberately. That table is the UI-chrome lane's,
 * a translation lane is adding to it concurrently, and these four strings are
 * this file's own content — they belong with the summaries they label, and
 * moving them later is a rename, not a redesign. Everything else the box draws
 * still goes through `lua.tr`, which is the engine's word.
 */
export const SUMMARY_LABELS: Readonly<Record<Language, {
  simple: string; full: string; none: string; missing: string;
}>> = {
  zh_CN: {
    simple: '简明',
    full: '详细',
    none: '这名武将暂无简明介绍，请看详细技能说明。',
    missing: '本作缺少以下技能的说明：',
  },
  en_US: {
    simple: 'Simple',
    full: 'Full',
    none: 'No plain-language summary for this one yet — read the full skills below.',
    missing: 'This build ships no text for: ',
  },
};
