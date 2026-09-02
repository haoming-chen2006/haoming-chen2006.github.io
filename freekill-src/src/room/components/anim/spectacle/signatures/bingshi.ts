/**
 * 兵势 — the 势 line, and the four late arrivals that shipped with it.
 *
 * These are not the generals a new player meets. The 势 variants are second
 * readings of men the standard set either skipped or drew flat: 邓艾 who farmed
 * before he climbed, 陈到 who commanded the guard nobody wrote down, 田丰 who
 * was right and was killed for it, 臧洪 who starved a city rather than leave a
 * friend unhelped. Their skills are correspondingly fiddly — tokens, charge,
 * mission clauses, 乘势 riders — so the rule below held harder than usual: read
 * the engine text, not the category, and then find the ONE incident in the
 * man's life that the text is secretly a diagram of. 凿险 is a wedge falling at
 * sixty degrees because 邓艾 wrapped himself in felt and rolled down the 阴平
 * cliff. 据孤 keeps every particle inside the frame because nobody came.
 */
import type { Motif } from '../motif';

export const BINGSHI: Readonly<Record<string, Motif>> = {
  /* ---------------------------------------------------------- 势曹真 ---- */

  /**
   * 伺锋 — end phase, put three face-down cards on up to two other players'
   * character cards; they detonate as those players use cards.
   *
   * 曹真 held the west against 诸葛亮 and won by anticipation: he predicted the
   * 陈仓 feint a year early and had 郝昭 already inside the walls. 伺 is to lie
   * in wait and watch. So the threads are laid on OTHER seats — spread 1.4 —
   * and exactly three cards go out and then nothing moves at all.
   */
  sifeng: {
    figure: 'web', swarm: 'card', flight: 'out', ground: 'dim',
    hue: 'ink', hue2: 'bronze', stance: 'still', tempo: 'slow', n: 3, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------- 势陈到 ----
   * 白毦督. He commanded the 白毦兵, Liu Bei's own white-plume guard — 先帝帐下
   * 白毦，西方上兵也 — and 陈寿 records only that his name and rank stood always
   * just below 赵云's. A man known by his unit and by nothing else. Both skills
   * are that unit: one is what it does, one is what it endures.
   */

  /**
   * 往烈 — at play phase start, name one hand card: this phase it ignores
   * distance and cannot be responded to, and afterwards you may target nobody.
   *
   * One blow that reaches anywhere and cannot be answered, and then the guard
   * stands down for the rest of the phase. A wedge on a flat jet, at full
   * spread because distance has stopped existing, and `dim` because there is
   * nothing else happening in the frame.
   */
  mobile__wangliec: {
    figure: 'wedge', swarm: 'arrow', flight: 'jet', ground: 'dim',
    hue: 'silver', hue2: 'bone', stance: 'lunge', tempo: 'quick', n: 6, turn: -6, spread: 1.4, glyph: true,
  },

  /**
   * 弘毅 — 锁定技. 毅 tokens accumulate on damage dealt and taken; at prepare
   * phase you choose one of two things and are made to do the other at end.
   *
   * 士不可以不弘毅，任重而道远 — the burden is heavy and the road is long.
   * 白毦 are white yak-tail plumes, so the swarm is feathers and they do not
   * travel: they stand in the air over a standard that rises in rank order and
   * holds. The one motif in this pack where nothing is going anywhere on purpose.
   */
  hongyic: {
    figure: 'banner', swarm: 'feather', flight: 'hover', ground: 'bloom',
    hue: 'bone', hue2: 'frost', stance: 'brace', tempo: 'slow', n: 15, spread: 0.7, glyph: true,
  },

  /* ---------------------------------------------------------- 势程普 ----
   * 焚乌荡寇. The oldest of Sun Jian's officers — the army called him 程公 —
   * and 右都督 to 周瑜's left at Red Cliffs, a command he resented until he
   * didn't: 与周公瑾交，若饮醇醪，不觉自醉. Both skills are the deputy's job.
   */

  /**
   * 督佐 — when you gain a card by other means, you may give a character a
   * fire 【杀】.
   *
   * 督佐 is the assistant commander, and this skill's whole content is that the
   * fire he lights is used by somebody else. So the brand swells and lets go
   * toward the next seat, and the portrait bows: the old man handing the young
   * one the campaign.
   */
  duzuo: {
    figure: 'orb', swarm: 'cinder', flight: 'out', ground: 'bloom',
    hue: 'ember', hue2: 'flame', stance: 'bow', tempo: 'even', n: 10, spread: 1.3, glyph: true,
  },

  /**
   * 蔽扞 — when anyone takes 【杀】 damage, you or they discard down to current
   * HP and the damage is reduced by 1.
   *
   * 蔽 is to screen, 扞 is to ward. The shield hexagon draws itself shut and the
   * price falls out of a hand while it does — the cards are the cost, so they go
   * down, not out. `toll`, because a man is counting cards off while the blow
   * is already in the air.
   */
  bihan: {
    figure: 'aegis', swarm: 'card', flight: 'fall', ground: 'shade',
    hue: 'bronze', hue2: 'ash', stance: 'brace', tempo: 'toll', n: 8, glyph: true,
  },

  /* ---------------------------------------------------------- 势陈矫 ----
   * When 曹操 died at 洛阳 the court wanted to wait for an edict before letting
   * 曹丕 succeed, and 陈矫 said 王薨于外，天下惶惧，太子宜割哀即位 — cut the
   * mourning short and take the throne now — and had it done inside a day.
   * A man of one virtue: he decided, cleanly, while everyone else deliberated.
   */

  /**
   * 清严 — reveal X hand cards as a 【闪】 or 【无懈可击】; the skill then sleeps
   * until those revealed cards have left your hand.
   *
   * 清 pure, 严 strict. He answers by showing, not by striking: the cards open
   * like a fan and hover, spread 0.5 so nothing leaves the portrait, with frost
   * creeping in from the edges. An entire defensive skill in which nothing is
   * thrown.
   */
  m_shi__qingyan: {
    figure: 'fan', swarm: 'card', flight: 'hover', ground: 'frost',
    hue: 'frost', hue2: 'silver', stance: 'still', tempo: 'even', n: 5, spread: 0.5, glyph: true,
  },

  /**
   * 策断 — everyone in a threatening player's range reveals; your cards of the
   * majority colour all become one unlimited 【杀】 against him.
   *
   * 断 is the cut in 割哀即位. The engine literally weighs two colours and the
   * heavier one becomes a sword, so the figure is the balance beam and `hue2`
   * is the pan that wins: ink against cinnabar, tipping once, fast.
   */
  m_shi__ceduan: {
    figure: 'scale', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'ink', hue2: 'cinnabar', stance: 'lunge', tempo: 'quick', n: 10, glyph: true,
  },

  /* ---------------------------------------------------------- 势陈祗 ----
   * 承指接竖 — taking the sovereign's hint, keeping company with the eunuch.
   * 陈祗 succeeded 董允 and did the opposite of him: he flattered 刘禅, made a
   * working alliance with 黄皓, and ran Shu on personal favour. When he died the
   * emperor wept and wrote him an extravagant edict.
   */

  /**
   * 权宠 — 锁定技, once a round: at end phase discard everything and take an
   * extra turn; if your HP is not uniquely highest, lose 1 at its start.
   *
   * The door of audience opening a second time for the favourite. He empties
   * his hands into the dark — coins, not cards, because this is a price paid —
   * and bows into the light coming from behind the throne.
   */
  quanchong: {
    figure: 'gate', swarm: 'coin', flight: 'fall', ground: 'rays',
    hue: 'gold', hue2: 'ash', stance: 'bow', tempo: 'slow', n: 10, glyph: true,
  },

  /**
   * 任行 — twice a round, the first time a card leaves play outside the discard
   * phase: both you and the turn player draw, or you strip someone who has not
   * used a 【杀】.
   *
   * 任行 is acting exactly as one pleases. Wherever a card falls anywhere on
   * the table his hand is already under it, so the web is spun and everything
   * flies inward through smoke.
   */
  renxing: {
    figure: 'web', swarm: 'card', flight: 'in', ground: 'smoke',
    hue: 'violet', hue2: 'bone', stance: 'turn', tempo: 'quick', n: 8, glyph: true,
  },

  /* ---------------------------------------------------------- 势邓艾 ----
   * 勇气陵云. He stuttered — 艾艾 — and spent his twenties as a farm inspector
   * writing irrigation surveys nobody read. Thirty years later he took an army
   * over 阴平, seven hundred li of unroaded mountain, and where the cliff ran
   * out he wrapped himself in felt and rolled down it. Chengdu surrendered to a
   * man who had arrived from a direction that did not exist.
   */

  /**
   * 屯田 — 蓄力技. Losing non-damage cards charges it; spend to hand out random
   * ♥ cards; when it fills, draw and raise the ceiling.
   *
   * The military agricultural colony. `lattice` is the 阡陌 — the field grid
   * locking in over the seat — and the swarm is seed sown out past the frame,
   * because 屯田 feeds other people. Slow, amber, and the only farming skill in
   * this file that draws the fields rather than the ledger.
   */
  m_shi__tuntian: {
    figure: 'lattice', swarm: 'bead', flight: 'out', ground: 'wash',
    hue: 'amber', hue2: 'jade', stance: 'still', tempo: 'slow', n: 14, spread: 1.2, glyph: true,
  },

  /**
   * 凿险 — 锁定技. Spending 3 / 5 / 7 charge at once pulls 无中生有 /
   * 无懈可击 / 五谷丰登 back out of the discard pile.
   *
   * 凿 is to chisel. 阴平: 山高谷深，至为艰险，凿山通道，造作桥阁 — and then the
   * felt, and the roll. So the wedge is driven in at sixty degrees, the stone
   * comes off it downward, and the portrait SINKS. The one motif here whose
   * whole content is descent.
   */
  m_shi__zaoxian: {
    figure: 'wedge', swarm: 'shard', flight: 'fall', ground: 'vignette',
    hue: 'ash', hue2: 'bone', stance: 'sink', tempo: 'toll', n: 16, turn: 62, glyph: true,
  },

  /**
   * 急袭 — at the end of anyone's turn, if your cards found other targets this
   * turn, strip the turn player and use a distance-ignoring 顺手牵羊.
   *
   * The raid that arrives after the fighting has stopped. A net drops over the
   * far seat and draws shut, and the card comes back in along the same line —
   * spread 1.35, because the whole point of 邓艾 is that the distance was never
   * the obstacle everyone assumed.
   */
  m_shi__jixi: {
    figure: 'net', swarm: 'card', flight: 'in', ground: 'shade',
    hue: 'dusk', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 6, turn: -12, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------- 势国渊 ----
   * 清介有守. 郑玄's student, and the man who actually made 屯田 work — 五年中，
   * 仓廪丰实. He reported captures honestly when the convention was to multiply
   * by ten, and told 曹操 that inflating a number to please him would shame the
   * state. He also caught a seditious letter-writer by matching his hand to a
   * copy of 《二京赋》: a scholar's forensics.
   */

  /**
   * 清蹈 — after someone's damage card resolves on you: if it hurt, take a
   * 【闪】 or strip a card; if it did not, take a 【杀】 or use a card freely.
   *
   * 蹈 is to tread. A clean step leaves one ring and the water answers — the
   * ring punches out, the ripple goes with it, and the drops lift. He is not
   * counter-attacking; he is walking through it without getting dirty.
   */
  qingdao: {
    figure: 'ring', swarm: 'drop', flight: 'rise', ground: 'ripple',
    hue: 'celadon', hue2: 'frost', stance: 'brace', tempo: 'even', n: 10, glyph: true,
  },

  /**
   * 修耕 — at turn start, record up to two players' hand counts; at their draw
   * phase, being under it draws them two and being over it raises their limit.
   *
   * The other 屯田 man, and this is the half 邓艾 does not get: not the fields
   * but the LEDGER, the honest number written down before anyone has a reason
   * to lie about it. Three strokes of a brush and the bamboo slips go out to
   * the two players he has entered in the book.
   */
  xiugeng: {
    figure: 'strokes', swarm: 'slip', flight: 'out', ground: 'none',
    hue: 'pine', hue2: 'amber', stance: 'still', tempo: 'slow', n: 8, spread: 1.25, glyph: true,
  },

  /**
   * 陈赦 — when another player is dying, discard one card each from you, him and
   * the damage source; if all three came and matched suit, he heals to full —
   * and you lose this skill forever.
   *
   * 陈 is to lay out a plea, 赦 is the pardon. Three cards, so `n: 3`: they come
   * in from three directions and meet under a halo. His colour drains as it
   * works, because the intercession is spent and does not come back.
   */
  chenshe: {
    figure: 'halo', swarm: 'card', flight: 'in', ground: 'bloom',
    hue: 'jade', hue2: 'peach', stance: 'pale', tempo: 'slow', n: 3, glyph: true,
  },

  /* ---------------------------------------------------------- 势黄祖 ----
   * 守殁枭寒. 刘表's man at 江夏, who received 祢衡 as a gift nobody else wanted
   * and had him killed for insolence at a banquet, and who kept 甘宁 for years
   * without ever employing him. 甘宁 left, came back with 孙权's fleet, and shot
   * him off his horse in the rout at 夏口; his head went to 孙权's ancestral
   * temple. Everything he did to people came back down the same road.
   */

  /**
   * 鸱张 — damage cards ignore distance; discarding hand cards on the first
   * target forbids responses of the colours you discarded.
   *
   * 鸱张鱼溃 — the owl-spread. The wingspan crosses the frame at full reach and
   * the answers of one colour simply die in the air; sulphur is the eye, and
   * `void` is a bird you only ever see from underneath.
   */
  chizhang: {
    figure: 'sweep', swarm: 'blade', flight: 'across', ground: 'dim',
    hue: 'void', hue2: 'sulphur', stance: 'lunge', tempo: 'quick', n: 10, turn: -18, spread: 1.4, glyph: true,
  },

  /**
   * 断鞅 — once a turn, a 【杀】 that fell into the discard pile without being
   * used goes onto your character card and fires at the end of the phase.
   *
   * 断鞅 is cutting the harness strap. The chain draws taut, it parts, and the
   * shot that had been going nowhere leaves along the line — on the `toll`
   * rhythm, because this skill deliberately does not go off when it is loaded.
   * The arrow is his, and it is also the one that found him at 夏口.
   */
  duanyang: {
    figure: 'chain', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'bronze', hue2: 'blood', stance: 'lunge', tempo: 'toll', n: 7, turn: 8, glyph: true,
  },

  /* ---------------------------------------------------------- 势桓阶 ----
   * 才周托命. When 孙坚 died 桓阶 walked into 刘表's camp alone and asked for the
   * body of his lord, and got it. He talked 张羡 into revolting for 曹操, and he
   * argued 曹丕's case as heir when it was dangerous to. A man other men handed
   * things to.
   */

  /**
   * 共谋 — at prepare phase, swap hands with a player; you gain 〖奇策〗 and he
   * gains 〖看破〗 until end of turn.
   *
   * Two men holding each other's cards and each other's talents for one turn.
   * `mirror` doubles the frame and reverses one copy — the second palette is
   * the other man — and the hands cross between them.
   */
  gongmou: {
    figure: 'mirror', swarm: 'card', flight: 'across', ground: 'none',
    hue: 'indigo', hue2: 'pine', stance: 'turn', tempo: 'even', n: 8, turn: -6, glyph: true,
  },

  /**
   * 正朔 — 限定技. Everyone discards their entire hand in turn order, the deck
   * is shuffled, everyone draws four.
   *
   * 奉正朔 is to acknowledge whose calendar you live in — the single act that
   * says which dynasty this is, which is what 桓阶 spent his career arguing.
   * Rings leave over the whole table and the cards make the round trip out and
   * back; `toll`, once, like a new reign being announced.
   */
  zhengshuo: {
    figure: 'rings', swarm: 'card', flight: 'recoil', ground: 'rays',
    hue: 'gold', hue2: 'frost', stance: 'lift', tempo: 'toll', n: 16, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------- 势鲁肃 ----
   * 廓开大计. 周瑜 came to borrow grain and 鲁肃 pointed at one of his two
   * three-thousand-斛 granaries and said take it — 指囷相赠. The 榻上策 is his:
   * 汉室不可复兴，曹操不可卒除, so take Jing and hold the river. He then spent
   * ten years keeping 刘备 and 孙权 from killing each other, at his own expense.
   */

  /**
   * 好施 — at end phase, another player may use your hand cards as his own
   * until your next turn; the first two times that empties you, refill to three.
   *
   * 指囷. `pillars` is the row of granaries and the one he points at opens
   * toward the other seat; the giving crosses at spread 1.3 and he bows while
   * it goes. The only skill in this pack that hands somebody else your hand.
   */
  m_shi__haoshi: {
    figure: 'pillars', swarm: 'card', flight: 'out', ground: 'bloom',
    hue: 'amber', hue2: 'jade', stance: 'bow', tempo: 'slow', n: 8, spread: 1.3, glyph: true,
  },

  /**
   * 缔盟 — make two players whose hands differ by 3 or less swap them, then pay
   * for it yourself in discards or give the poorer one cards.
   *
   * 缔 is to tie a knot. The alliance is between two OTHER people and the price
   * is his, so the chain is drawn between two far seats at full spread and the
   * silk goes across it. Nothing about this motif points at 鲁肃.
   */
  m_shi__dimeng: {
    figure: 'chain', swarm: 'ribbon', flight: 'across', ground: 'none',
    hue: 'jade', hue2: 'azure', stance: 'still', tempo: 'slow', n: 8, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------- 势陆郁生 ----
   * 义姑. 陆绩's daughter, orphaned young and widowed younger, pressed by her
   * husband's disgraced family and by her own to remarry, and refusing — the
   * household kept running on her and the histories gave her three lines and a
   * title. Both skills are quiet, close-range and cost her something.
   */

  /**
   * 润微 — reveal up to five cards off the deck and give one colour of them to
   * a player; you then lose cards, and discard anything you kept.
   *
   * 随风潜入夜，润物细无声 — it enters the night on the wind and soaks things
   * without a sound. A sheet of rain draws down over the seat, the water falls
   * through it and rings out, and she keeps none of it.
   */
  mobile__runwei: {
    figure: 'veil', swarm: 'drop', flight: 'fall', ground: 'ripple',
    hue: 'celadon', hue2: 'moon', stance: 'still', tempo: 'slow', n: 14, spread: 1.2, glyph: true,
  },

  /**
   * 霜怀 — once a turn, when someone at distance 1 takes damage: prevent it, or
   * hand them a 【桃】 from the discard. Same person as last time and you both
   * draw; a different person and you lose 1 HP.
   *
   * The engine rewards constancy and charges her for changing her mind, which
   * is the entire 义姑 story written as a trigger. Plum opening inside frost,
   * the snow going nowhere at spread 0.6 because this only ever reaches her
   * neighbours.
   */
  shuanghuai: {
    figure: 'bloom', swarm: 'snow', flight: 'hover', ground: 'frost',
    hue: 'frost', hue2: 'plum', stance: 'brace', tempo: 'slow', n: 12, spread: 0.6, glyph: true,
  },

  /* ---------------------------------------------------------- 势孙綝 ----
   * 蝮影权倾. Regent at twenty-six, he killed 滕胤, 吕据 and 王惇, burned 诸葛恪's
   * corpse's grave, deposed 孙亮 and was taken by 孙休 at a banquet within the
   * year. The clan struck his name out afterwards: the records call him 故綝,
   * the late 綝, without the surname 孙.
   */

  /**
   * 逆固 — discard cards of differing suits; everyone in your range chooses
   * whether to hand you one, and every refusal buys +1 on your next damages.
   *
   * 蝮 is the pit viper. The coil winds round the seat, the tribute comes in as
   * coin, and the men who kept their hands shut are the ones the skill is
   * actually counting. Slow, dark, and it reaches every seat it can see.
   */
  nigu: {
    figure: 'coil', swarm: 'coin', flight: 'in', ground: 'dim',
    hue: 'void', hue2: 'bronze', stance: 'brace', tempo: 'slow', n: 10, spread: 1.3, glyph: true,
  },

  /**
   * 戮连 — 锁定技. After a hand card resolves, targets weaker than you in HP are
   * turned sideways and targets poorer in equipment pay you a card. 乘势: 1 fire
   * damage to somebody who is not the lowest.
   *
   * 戮连 is killing in series, and he did: one colleague after another down the
   * same list. The links run across the whole table on the `toll` beat with the
   * fangs riding them, and he does not move, because 锁定技 is not a decision.
   */
  lulian: {
    figure: 'chain', swarm: 'thorn', flight: 'across', ground: 'shade',
    hue: 'blood', hue2: 'flame', stance: 'still', tempo: 'toll', n: 12, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------- 势孙峻 ----
   * 横逆自固. The cousin who did it first: he had 诸葛恪 cut down at a banquet
   * he had invited him to, ran Wu on murder for three years, and died at
   * thirty-eight of a nightmare in which 诸葛恪 came for him.
   */

  /**
   * 凶图 — reveal another player's hand card, then either discard it or discard
   * X of your own and deal him 1 damage.
   *
   * 图 is the plan drawn on paper; 凶 is what kind. The banquet: he looks at
   * what you are holding, and the knife is already under the table. A short
   * hard starburst on a steep axis with the room dark at the corners.
   */
  xiongtus: {
    figure: 'star', swarm: 'blade', flight: 'out', ground: 'vignette',
    hue: 'ink', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 9, turn: 30, glyph: true,
  },

  /**
   * 先率 — 锁定技. The first card of each suit you use in a turn ignores all
   * count limits.
   *
   * Four suits, four free blades: `n: 4`, opening from one pivot and flaring
   * out. 先率 is leading from the front, and the skill's shape is that the first
   * of everything is free and the second of anything is not.
   */
  m_shi__xianshuai: {
    figure: 'fan', swarm: 'card', flight: 'flare', ground: 'none',
    hue: 'bronze', hue2: 'cinnabar', stance: 'lunge', tempo: 'quick', n: 4, glyph: true,
  },

  /* ---------------------------------------------------------- 势太史慈 ----
   * 志踏天阶. He rode out of besieged 北海 alone to fetch 刘备, fought 孙策 to a
   * standstill at 神亭岭 and came away holding his helmet, and shot a raider's
   * hand through into the beam he had raised it against. Dying at forty-one:
   * 丈夫生世，当带三尺之剑，以升天子之阶 — which is the 称号.
   */

  /**
   * 酣战 — you and one other draw up to your HP maxima (three cards each at
   * most), then you 【决斗】 him.
   *
   * 神亭岭. The engine fills both hands to the same rule before it lets them
   * fight, which is a duel between equals written as arithmetic — so the frame
   * doubles and reverses, and the wine is in the palette.
   */
  mobile__hanzhan: {
    figure: 'mirror', swarm: 'blade', flight: 'across', ground: 'dim',
    hue: 'amber', hue2: 'cinnabar', stance: 'lunge', tempo: 'quick', n: 6, turn: -4, glyph: true,
  },

  /**
   * 战烈 — 【杀】 hitting the discard pile earns 烈 tokens, up to six; at the end
   * of your play phase spend them all for one unlimited 【杀】 with an option per
   * three.
   *
   * 猿臂善射，弦不虚发 — the ape-armed archer whose string never wasted a shot.
   * The bow bends on the `toll` count while the tokens gather, `n: 6` for the
   * six of them, and then it all leaves along one line at full reach.
   */
  zhanlie: {
    figure: 'crescent', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'flame', hue2: 'gold', stance: 'lunge', tempo: 'toll', n: 6, turn: -14, spread: 1.4, glyph: true,
  },

  /**
   * 振锋 — 限定技. Recover 2 HP, or redefine the X inside 〖酣战〗 and 〖战烈〗.
   *
   * 以升天子之阶 — to climb to the emperor's stair. Once a game, a shaft stands
   * on the seat with the light behind it and the sparks go up rather than out.
   * The one skill of his that has no target at all: it is a vow, not a shot.
   */
  mobile__zhenfeng: {
    figure: 'column', swarm: 'glint', flight: 'rise', ground: 'rays',
    hue: 'gold', hue2: 'azure', stance: 'lift', tempo: 'slow', n: 10, glyph: true,
  },

  /* ---------------------------------------------------------- 势田丰 ----
   * 河北瑰杰. He told 袁绍 not to march on 官渡 and was put in irons for saying
   * it twice. When the army came back broken the jailer congratulated him —
   * now he will have to value you — and 田丰 said 若军有利，吾必全；今军败，吾
   * 其死矣. The order arrived that evening. He was right, and it killed him.
   */

  /**
   * 刚鲠 — give at least two hand cards to another player; at the end of the
   * turn, if his hand is the largest you draw, and if it is not you strip him.
   *
   * 骨鲠之臣 — the bone-in-the-throat minister, who will not go down. The
   * memorial unrolls and the bamboo slips go up to the man who did not want
   * them, on the `toll` beat, and then he is judged for having been right.
   */
  ganggeng: {
    figure: 'banner', swarm: 'slip', flight: 'out', ground: 'none',
    hue: 'ink', hue2: 'bone', stance: 'brace', tempo: 'toll', n: 6, spread: 1.3, glyph: true,
  },

  /**
   * 死谏 — on losing your last card or entering dying, choose a punishment for
   * someone or a gift for the turn player; with nobody dying you may 背水 and
   * lose an escalating amount of HP.
   *
   * Remonstrance unto death, with a clause that literally charges him more each
   * time he opens his mouth. He stands straight — a column that will not bend —
   * the room goes out around him, the blood falls, and the portrait wilts.
   */
  m_shi__sijian: {
    figure: 'column', swarm: 'drop', flight: 'fall', ground: 'dim',
    hue: 'blood', hue2: 'bone', stance: 'wilt', tempo: 'toll', n: 10, glyph: true,
  },

  /* ---------------------------------------------------------- 势王昶 ----
   * 识度良臣. He named his sons and nephews 默, 沉, 浑, 深 so that they would
   * have to read their own names every day, and wrote them a 家诫 explaining
   * why. His memorials to 曹芳 are about deterrence: make revolt unattractive
   * rather than punish it afterwards.
   */

  /**
   * 开济 — at prepare phase, X players each draw one, where X counts the living
   * who have been in a dying state; if any drew a non-basic, you draw too.
   *
   * 两朝开济老臣心 — 杜甫 on 诸葛亮, and the word 开济 is opening and sustaining.
   * The skill counts the people who have already nearly died once, so rings go
   * out to them at first light with petals riding on them.
   */
  kaiji: {
    figure: 'rings', swarm: 'petal', flight: 'out', ground: 'bloom',
    hue: 'dawn', hue2: 'jade', stance: 'lift', tempo: 'even', n: 9, spread: 1.35, glyph: true,
  },

  /**
   * 慑叛 — when targeted by a damage card, draw one or push one of his cards to
   * the top of the deck; then if your hands are EQUAL, the card does nothing.
   *
   * 慑 is to overawe. His whole doctrine was that a rebellion prevented costs
   * nothing, and the engine agrees: the beam comes level and the blow simply
   * stops existing. Frost, no travel, and nothing is destroyed.
   */
  shepan: {
    figure: 'scale', swarm: 'card', flight: 'hover', ground: 'frost',
    hue: 'silver', hue2: 'indigo', stance: 'brace', tempo: 'even', n: 6, glyph: true,
  },

  /* ---------------------------------------------------------- 势魏延 ----
   * 矜忠跨万山. He asked for five thousand men and the 子午谷 and was refused;
   * he held 汉中 for a decade on the doctrine of meeting the enemy outside the
   * passes; 诸葛亮 said he had a rebel's bone at the back of his skull. After
   * the retreat from 五丈原 he stood in the road shouting 谁敢杀我 — and 马岱
   * was behind him.
   */

  /**
   * 壮誓 — at play phase start: discard cards to make your next X cards
   * unblockable and rangeless, and/or lose HP to make that many ignore limits.
   *
   * An oath with the price written into it. Three strokes cut across the seat,
   * the cards he paid with fall out of them, and the frame washes red — `toll`,
   * because he is counting out what he is giving up before he does anything.
   */
  zhuangshi: {
    figure: 'strokes', swarm: 'card', flight: 'fall', ground: 'wash',
    hue: 'cinnabar', hue2: 'blood', stance: 'brace', tempo: 'toll', n: 8, turn: 12, glyph: true,
  },

  /**
   * 饮战 — 锁定技. Being lower in HP adds damage, being lower in hand strips
   * him afterwards; 乘势 heals you and hands you what he lost.
   *
   * 饮战 is drinking the fight — the worse his position the more he takes out of
   * it, and the rider literally pours the wound back into him. Everything flies
   * INWARD to a core that swells, and the colour floods back into the portrait.
   */
  yinzhan: {
    figure: 'orb', swarm: 'drop', flight: 'in', ground: 'wash',
    hue: 'ember', hue2: 'blood', stance: 'blush', tempo: 'quick', n: 12, glyph: true,
  },

  /**
   * 忠傲 — 使命技. Succeed by killing and 狂骨 upgrades; fail by going down, or
   * by refusing 〖壮誓〗, and you lose 壮誓 for 困奋.
   *
   * A skill whose whole content is which way this man ends, and everybody at
   * the table already knows. So the blade comes across the frame from behind
   * him at forty degrees, in bone with blood in it, and the portrait reels.
   * 谁敢杀我.
   */
  zhongao: {
    figure: 'crescent', swarm: 'shard', flight: 'across', ground: 'dim',
    hue: 'bone', hue2: 'blood', stance: 'reel', tempo: 'toll', n: 10, turn: 40, glyph: true,
  },

  /* ------------------------------------------ 势魏延, after 忠傲 resolves ----
   *
   * Neither of these two is on anybody's character card, which is why the
   * roster-wide sweep that gave all 537 skills a signature never saw them:
   * `overview.json` lists what a general STARTS with, and 忠傲 hands these out
   * at run time. They fire under their own names all the same, and they are the
   * skills the two halves of 势魏延's cutscene name.
   */

  /**
   * 狂骨 — damage somebody within distance 1 and heal or draw for it. At level
   * two, upgraded by 忠傲 succeeding, it also buys an extra 杀 for a card.
   *
   * The whole skill is the reach: 距离1以内 is the man in front of him and
   * nobody else, so `spread: 0.7` keeps every particle inside his own air.
   * `recoil` because it is a two-beat thing — the blow lands and comes back as
   * hp — and `swell`, because what returns goes into him.
   */
  m_shi__kuanggu: {
    figure: 'ring', swarm: 'drop', flight: 'recoil', ground: 'wash',
    hue: 'blood', hue2: 'bone', stance: 'swell', tempo: 'quick', n: 12, spread: 0.7, glyph: true,
  },

  /* ---------------------------------------------------------- 势夏侯尚 ---- */

  /**
   * 探锋 — at prepare phase: strip up to two of someone's cards and skip your
   * draw phase if he is poorer, and/or burn him for 1 and skip your play phase
   * if he is weaker.
   *
   * 魏胤前驱 — the heir's vanguard, and 曹丕's closest friend, who probed 江陵
   * with fire and later dug up the concubine 曹丕 had strangled to look at her
   * face and died of it. The blade goes out ahead of the army along one line,
   * carrying fire, and he pays for the reconnaissance with his own turn.
   */
  tanfeng: {
    figure: 'crescent', swarm: 'cinder', flight: 'jet', ground: 'shade',
    hue: 'flame', hue2: 'ink', stance: 'lunge', tempo: 'quick', n: 9, turn: -20, spread: 1.3, glyph: true,
  },

  /* ---------------------------------------------------------- 势辛宪英 ----
   * 明鉴致节. 辛毗's daughter. When 曹丕 was named heir and embraced her brother
   * laughing, she said a man who takes his father's place should be grieving,
   * not glad, and that Wei would not last long. She read 钟会's rebellion years
   * before it happened, and told her son exactly how to survive serving under
   * him. Nobody in the pack sees further and nobody acts less.
   */

  /**
   * 诫节 — the turn player may show you his hand; you name a suit, and either
   * that suit runs free for him and the rest is discarded, or he is given one
   * of it. Twice a round the reading also triggers 〖清识〗.
   *
   * She looks, and then she tells you. The lens opens over the seat and the
   * cards hover inside it at spread 0.6: no travel, no impact, no strike —
   * the entire skill is a diagnosis delivered to somebody else's turn.
   */
  jiejie: {
    figure: 'eye', swarm: 'card', flight: 'hover', ground: 'none',
    hue: 'moon', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 8, spread: 0.6, glyph: true,
  },

  /**
   * 清识 — after taking damage, name a player: same camp and you both draw,
   * different and you both discard.
   *
   * 明鉴 is the clear mirror and 清识 is the clear reading; the engine's test is
   * simply which side you are on. The beam tips once between celadon and the
   * dark, the recognition glints across it, and she is still reeling from the
   * blow that started it.
   */
  qingshix: {
    figure: 'scale', swarm: 'glint', flight: 'across', ground: 'dim',
    hue: 'celadon', hue2: 'void', stance: 'reel', tempo: 'even', n: 6, turn: -8, glyph: true,
  },

  /* ---------------------------------------------------------- 势于吉 ----
   * 夙仙望道. He burned incense, read the 道书, and made 符水 — talisman-ash
   * stirred into water — and cured enough people in 吴 that 孙策's officers left
   * a war council to bow to him in the street. 孙策 had him executed for it and
   * was dead himself inside the year, seeing him in every mirror.
   */

  /**
   * 符济 — hand out one card each to any number of players; a 符济 card pays its
   * user a card of the same suit, hits harder as a 【杀】, and draws as a 【闪】.
   *
   * 符 is the talisman itself. The seal turns over the seat and the charms go
   * out to everyone who will take one, past the frame on both sides — this is
   * the one motif here whose reach is the whole table because the SKILL's reach
   * is the whole table. Gold on jade: talisman-water, not treasure.
   */
  fujiy: {
    figure: 'sigil', swarm: 'rune', flight: 'out', ground: 'rays',
    hue: 'gold', hue2: 'jade', stance: 'still', tempo: 'slow', n: 12, spread: 1.4, glyph: true,
  },

  /**
   * 道转 — once a turn, put one of your own or the turn player's cards into the
   * discard pile and treat it as the basic card you needed.
   *
   * 道法自然: the thing turns into the other thing and nobody is told how. Slow
   * incense — the arm winds inward through its own smoke, and violet is the
   * palette this file keeps for what is not explained.
   */
  daozhuan: {
    figure: 'spiral', swarm: 'plume', flight: 'curl', ground: 'smoke',
    hue: 'violet', hue2: 'frost', stance: 'turn', tempo: 'slow', n: 12, spread: 0.8, glyph: true,
  },

  /* ---------------------------------------------------------- 势臧洪 ----
   * 张超 was besieged in 雍丘 and 袁绍 would not let 臧洪 go to him, so 臧洪
   * revolted and was besieged himself, in 东武阳, for a year. They ate the rats
   * and then the leather off the shields. With three 升 of rice left he had it
   * made into thin gruel and shared out, killed his own concubine to feed the
   * officers, and told the city to leave — and seven or eight thousand people
   * stayed and died with him. 陈容 was executed for saying so out loud.
   */

  /**
   * 烈志 — once a turn, lose 1 maximum HP to use a 【桃】, or an 【酒】 with no
   * limit on it.
   *
   * The last of the rice, made thin so it would go round. The blossom opens
   * outward and he sags as it does, because the cost here is not health but the
   * ceiling on it: this skill only ever spends what he will not get back.
   */
  liezhiz: {
    figure: 'bloom', swarm: 'petal', flight: 'out', ground: 'wash',
    hue: 'peach', hue2: 'blood', stance: 'wilt', tempo: 'toll', n: 10, spread: 1.1, glyph: true,
  },

  /**
   * 据孤 — on becoming the target of a card while unwounded, draw two and then
   * discard X, where X is how many times you have already done this.
   *
   * 据 is to hold a position, 孤 is alone. The walls close in, the dark comes in
   * from the corners, and every particle stays inside the frame at spread 0.5 —
   * nothing leaves and nothing arrives, because for a year nothing did. The
   * swarm is dust: they ate the rats, then the leather off the shields.
   */
  juguz: {
    figure: 'lattice', swarm: 'dust', flight: 'fall', ground: 'vignette',
    hue: 'bone', hue2: 'ash', stance: 'brace', tempo: 'slow', n: 16, spread: 0.5, glyph: true,
  },

  /* ---------------------------------------------------------- 势张燕 ----
   * 轻勇骇势. 褚燕 of the 黑山 — they called him 飞燕, the flying swallow, for
   * being 剽悍捷速, faster over broken ground than a horse. A hundred thousand
   * men in the Taihang, a seal from the Han court he took without coming down
   * off the mountain, and eventually a surrender to 曹操 on his own terms.
   */

  /**
   * 飞径 — twice a turn, when your 【杀】 has a single target, everyone on the
   * PATH between you reveals and discards, and one colour of them is added as
   * extra targets.
   *
   * The skill is literally a line drawn across the intervening seats, so the
   * figure is the rank that lights up in sequence along it and the cards go
   * across at full reach. 飞燕 came down the ridge road and everyone standing
   * on it was part of the attack.
   */
  feijing: {
    figure: 'pillars', swarm: 'card', flight: 'across', ground: 'dim',
    hue: 'ink', hue2: 'ember', stance: 'lunge', tempo: 'quick', n: 10, turn: -6, spread: 1.4, glyph: true,
  },

  /**
   * 骁戈 — 锁定技. Damage to anyone dragged in by 〖飞径〗 is PREVENTED; you heal
   * instead and keep what he threw away. A lone target becomes a 【决斗】.
   *
   * The bandit does not kill the bystanders on the road, he robs them and rides
   * off fatter — the one damage skill in this pack whose locked clause cancels
   * its own damage. The blade sweeps across and the colour floods back in.
   */
  xiaoge: {
    figure: 'sweep', swarm: 'blade', flight: 'across', ground: 'shade',
    hue: 'ember', hue2: 'ink', stance: 'blush', tempo: 'quick', n: 8, turn: 14, glyph: true,
  },

  /* ---------------------------------------------------------- 势钟会 ----
   * 荡蜚缴志. 钟繇's prodigy son, who had 嵇康 executed for declining to like
   * him, took Shu, wrote to 司马昭 that 邓艾 was preparing to revolt and had him
   * arrested on the road, and then revolted himself in Chengdu with 姜维. His
   * own soldiers killed them both inside three days. 辛宪英 had said so.
   */

  /**
   * 肆恣 — 蓄力技. Spend charge to make every 【杀】 hurt more for X turns, and
   * to bleed everyone who used one at the end of each of those turns — and past
   * your own HP, to bleed the ones who did not.
   *
   * 肆恣 is licence without a check on it. A net comes down over the whole table
   * with the barbs in it and does not lift for several turns; the room goes
   * dark; he swells. Note the last clause, which punishes inaction: there is no
   * behaviour that avoids this.
   */
  sizi: {
    figure: 'net', swarm: 'thorn', flight: 'fall', ground: 'dim',
    hue: 'violet', hue2: 'blood', stance: 'swell', tempo: 'slow', n: 14, spread: 1.4, glyph: true,
  },

  /**
   * 挟志 — 锁定技. Every change in your HP becomes charge; overflow raises your
   * hand limit and your 【杀】 limit.
   *
   * 挟 is what 曹操 did to the emperor — to hold a thing under your arm and use
   * it. He converts being hurt into being able to do more, so the coil tightens
   * inward around a portrait that swells, in dusk: purple over orange, the last
   * light, which is the palette for an ambition with about three days left.
   */
  xiezhi: {
    figure: 'coil', swarm: 'spark', flight: 'curl', ground: 'dim',
    hue: 'dusk', hue2: 'gold', stance: 'swell', tempo: 'even', n: 12, glyph: true,
  },

  /**
   * 迂难 — 觉醒技. You begin as 魏; put someone into dying in a round where
   * somebody has died and you change kingdom to 群 and take 〖克昌〗.
   *
   * The defection, as a state transition. `mirror` doubles the frame and
   * reverses one copy, and the seals cross from the old half into the new one
   * on the `toll` beat — one event, announced, irreversible. He turns.
   */
  yunan: {
    figure: 'mirror', swarm: 'rune', flight: 'across', ground: 'shade',
    hue: 'indigo', hue2: 'blood', stance: 'turn', tempo: 'toll', n: 8, glyph: true,
  },

  /**
   * 克昌 — 主公技, 锁定技. Your faction's 【杀】 ignore distance; upgraded, your
   * own cannot be answered.
   *
   * 燕及皇天，克昌厥后 — 诗经, on a house made to flourish in its descendants.
   * 钟会 died at forty without any. The standard goes up with the light behind
   * it and the decrees go out over the table; gold with the dark under it.
   */
  kechang: {
    figure: 'banner', swarm: 'rune', flight: 'out', ground: 'rays',
    hue: 'gold', hue2: 'void', stance: 'lift', tempo: 'toll', n: 12, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------- 势周瑜 ----
   * 燎琰涤浪. The same man as the standard set's 周瑜 and a different skill kit:
   * where 英姿 is bearing, these four are the fire itself. 谈笑间，樯橹灰飞烟灭.
   * The pack is deliberately one temperature — flame, ember, ash — and separated
   * by SHAPE instead: a wave, an eddy, a chain and a fan.
   */

  /**
   * 炽沄 — the first time you gain cards in a phase, hand a player cards; he
   * shows every card he holds of that colour and burns for it, or you draw two
   * and he is turned sideways.
   *
   * 炽 blazing, 沄 the churn of a current. The fire is handed to somebody, so
   * the wave leaves along one heading rather than radially and the embers ride
   * it into the next seat.
   */
  chiyun: {
    figure: 'wave', swarm: 'cinder', flight: 'jet', ground: 'wash',
    hue: 'flame', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 12, turn: 10, spread: 1.3, glyph: true,
  },

  /**
   * 焰洄 — on your first target, reveal one of a target's cards; a card revealed
   * twice in a turn is discarded, and at phase end somebody burns or you draw.
   *
   * 洄 is water turning back on itself. Cards caught in an eddy and shown again
   * — the skill punishes the SECOND look, so the flight curls inward and the
   * same cards come round.
   */
  yanhui: {
    figure: 'spiral', swarm: 'card', flight: 'curl', ground: 'smoke',
    hue: 'ember', hue2: 'gold', stance: 'turn', tempo: 'even', n: 10, glyph: true,
  },

  /**
   * 焚涛 — 锁定技. A chained player taking fire damage either passes on more of
   * it or throws away half his cards and is turned sideways.
   *
   * 连环计: 庞统 talks 曹操 into chaining the fleet gunwale to gunwale so the
   * northerners will stop being seasick. The links run across the table at full
   * spread and the fire goes down them as a thin hot line, head first, in
   * sequence. He does not move — this is what the river does now.
   */
  fentao: {
    figure: 'chain', swarm: 'spark', flight: 'across', ground: 'smoke',
    hue: 'flame', hue2: 'ember', stance: 'still', tempo: 'toll', n: 16, spread: 1.4, glyph: true,
  },

  /**
   * 雄姿 — 限定技. Bind all three of the above to your own turn and keep only
   * their first options, or only their second, then draw two.
   *
   * 雄姿英发，羽扇纶巾，谈笑间，樯橹灰飞烟灭. The standard set's 英姿 opens this
   * same fan and the feathers rise off it; here he opens it once, gives up half
   * of everything he can do, and what comes off it is smoke with the room going
   * dark behind. Same gesture, after the fire.
   */
  xiongzi: {
    figure: 'fan', swarm: 'plume', flight: 'rise', ground: 'dim',
    hue: 'azure', hue2: 'ember', stance: 'still', tempo: 'slow', n: 8, spread: 0.7, glyph: true,
  },

  /* ---------------------------------------------------------- 娄圭 ----
   * 一日之寒. At 潼关, with 马超 across the ford and no time to build, 娄圭 told
   * 曹操 to raise banks of sand and pour water over them in the night — the
   * frost did the rest, and by morning there was a wall. 曹操 said 子伯之计，
   * 孤不及也, and later had him killed for a remark made in the street.
   */

  /**
   * 灌沙 — 限定技. At the end of your play phase, swap every card you own for
   * the same number of random BASIC cards, and raise your hand limit by the
   * number of distinct names you got.
   *
   * 灌水成冰. Sand and water become a wall by morning: the grid locks in, frost
   * creeps over the seat, and what falls is snow rather than anything he chose.
   * The one skill in this file that trades a hand for a substance.
   */
  guansha: {
    figure: 'lattice', swarm: 'snow', flight: 'fall', ground: 'frost',
    hue: 'frost', hue2: 'bone', stance: 'brace', tempo: 'slow', n: 14, glyph: true,
  },

  /**
   * 急御 — discard one card and take a random card of each OTHER category out of
   * the deck or discard pile; use them all and it counts as never having fired.
   *
   * The improvisation, which is his whole reputation: one thing thrown away and
   * three unrelated things arrive to cover the gap. A quick starburst with
   * everything flying inward, and a single bright pulse on the portrait.
   */
  jiyul: {
    figure: 'star', swarm: 'card', flight: 'in', ground: 'none',
    hue: 'silver', hue2: 'amber', stance: 'flare', tempo: 'quick', n: 6, turn: 20, glyph: true,
  },

  /* ---------------------------------------------------------- 杨弘 ----
   * 柔迩驭远. 袁术's 长史, and the man who kept proposing that other people
   * fight: it is his plan to set 吕布 and 刘备 against each other. When 袁术
   * died he tried to bring the remaining army over to 孙策 and was intercepted
   * on the road by 刘勋, which is a fair summary of his luck.
   */

  /**
   * 间计 — secretly pick a hand card; make two players 拼点; the winner 【杀】s
   * the loser; either of them may secretly use YOUR card to compare with, and
   * if it was a 【杀】 you damage whoever took it.
   *
   * 疏不间亲 — the estrangement stratagem, with a poisoned card left in the
   * middle of it. Two frames facing each other with one card crossing between,
   * slowly, in sulphur: the trick only works if they have time to consider it.
   */
  mobile__jianji: {
    figure: 'mirror', swarm: 'card', flight: 'across', ground: 'shade',
    hue: 'sulphur', hue2: 'ink', stance: 'still', tempo: 'slow', n: 5, spread: 1.4, glyph: true,
  },

  /**
   * 远谟 — twice a turn, move a card that is on the table, then pay the man who
   * lost it in draws, one per player who has dropped out of his range.
   *
   * 柔远能迩 inverted into a title, and the skill is government at a distance:
   * he never touches anybody, he moves a piece from one far seat to another and
   * the reach of a third man quietly changes. Threads, written orders, full reach.
   */
  mobile__yuanmo: {
    figure: 'web', swarm: 'slip', flight: 'across', ground: 'none',
    hue: 'indigo', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 6, turn: -10, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------- 庞羲 ----
   * 璧玉佐君. When 刘焉's sons were killed at 长安 庞羲 got the grandchildren out
   * of the capital himself and brought them to 益州 — the reason 刘璋 gave him
   * 巴西 and a marriage. Both skills are about propping up whoever is weakest.
   */

  /**
   * 蓄业 — once a turn, when the player with the FEWEST cards takes damage, give
   * him two; then if he has ended up with the most, put one of his on the deck.
   *
   * 蓄业 is building somebody an estate. The arc opens over the poorest man at
   * the table and the money goes to him, slowly, past the frame — and the last
   * clause takes a little back the moment he is comfortable.
   */
  xuye: {
    figure: 'halo', swarm: 'coin', flight: 'out', ground: 'bloom',
    hue: 'jade', hue2: 'dawn', stance: 'lift', tempo: 'slow', n: 8, spread: 1.3, glyph: true,
  },

  /**
   * 匡襄 — swap hands with a player who holds no more than you; when either of
   * you runs out of what he gained, 〖蓄业〗 fires again.
   *
   * 匡 to straighten, 襄 to carry. The gate of 长安 with the children going
   * through it: two panels, one palette on each side, and the hands cross in
   * the dark. He bows — this skill is only ever performed downward.
   */
  mobile__kuangxiang: {
    figure: 'gate', swarm: 'card', flight: 'across', ground: 'dim',
    hue: 'celadon', hue2: 'amber', stance: 'bow', tempo: 'even', n: 8, glyph: true,
  },

  /* ---------------------------------------------------------- 孙韶 ----
   * 明敌御疆. He took over 孙河's command at seventeen and rebuilt 京城's walls
   * and towers without being told to. 孙权 rode up at night to test the watch
   * and 孙韶's men shot at him in the dark until he had to shout his own name.
   * He raided 广陵 for thirty years and the north never came south past him.
   */

  /**
   * 敢决 — once a phase, use a card from an EQUIPMENT area as a free 【杀】 with
   * no range; a target holding nothing of its suit cannot answer it.
   *
   * 敢决 is daring to decide, and the seventeen-year-old who shot at a party of
   * riders in the dark rather than wait to be told who they were is exactly
   * that. Arrows out of an indigo night along one line, quick, no hesitation.
   */
  ganjue: {
    figure: 'wedge', swarm: 'arrow', flight: 'jet', ground: 'dim',
    hue: 'indigo', hue2: 'frost', stance: 'lunge', tempo: 'quick', n: 10, turn: -10, spread: 1.35, glyph: true,
  },

  /**
   * 筑墼 — at the end of your play phase, discard every hand card of one suit
   * and take an equipment card of that suit out of the deck and wear it.
   *
   * 墼 is an unfired mud brick, and 孙韶's one recorded initiative was 缮治京城，
   * 起楼橹 — he built the walls up. Courses rise in sequence, the swarm is
   * literally small square blocks, and at spread 0.6 none of it travels:
   * a wall is the one structure that is supposed to stay where it is put.
   */
  zhujis: {
    figure: 'pillars', swarm: 'rune', flight: 'rise', ground: 'none',
    hue: 'bronze', hue2: 'bone', stance: 'brace', tempo: 'toll', n: 14, spread: 0.6, glyph: true,
  },
};
