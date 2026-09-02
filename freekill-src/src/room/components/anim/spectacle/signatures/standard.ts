/**
 * The standard twenty-five, and the forty skills they carry.
 *
 * These are the generals every player meets first and the ones a screenshot of
 * this game is most likely to contain, so every entry below is researched
 * rather than assigned. Three things went into each: what the general actually
 * did, what the skill's NAME alludes to — almost always a line of poetry, a
 * stratagem or a posthumous epithet rather than a description of anything — and
 * what the skill's rules text says it does, read from the engine rather than
 * guessed from the name.
 *
 * The third of those matters more than it sounds. 洛神 is `drawcard` and so is
 * 集智; 反间 is `offensive` and so is 武圣. The category is not wrong, it is
 * just not enough, and reading the real text is what stops a design from being
 * about the name alone: 苦肉's text is "lose 1 hp, draw two cards", and an
 * effect that showed only the flogging would be telling half of it.
 */
import type { Motif } from '../motif';

export const STANDARD: Readonly<Record<string, Motif>> = {
  /* ------------------------------------------------------------ 魏 ------ */

  /**
   * 曹操 · 奸雄 — "当你受到伤害后，你可以获得对你造成伤害的牌。"
   *
   * 许劭's judgement, which Cao Cao is said to have laughed out loud at:
   * 治世之能臣，乱世之奸雄 — a capable minister in an ordered age, a treacherous
   * hero in a chaotic one. The mechanic is the man: he is struck, and he takes
   * the thing that struck him.
   *
   * So the pieces of the blow are drawn INTO him (`in`, not `out` — nothing
   * about 奸雄 scatters) and a dark web closes over the seat as they arrive.
   * The swarm keeps the colour of whatever hit him, because `masochism` takes
   * its second colour from the damage the engine reported on the beat before.
   */
  jianxiong: {
    figure: 'web', swarm: 'shard', flight: 'in', ground: 'vignette',
    hue: 'void', hue2: 'cinnabar', stance: 'reel', tempo: 'quick', n: 14, glyph: true,
  },

  /**
   * 曹操 · 护驾 — 主公技. Other 魏 players answer a 闪 on his behalf.
   *
   * 护驾 is what a guard shouts when the imperial carriage is threatened. The
   * lord does nothing: the shield is other people, so the guard hexagon draws
   * itself shut while his retainers' tallies converge on it out of the dark.
   */
  hujia: {
    figure: 'aegis', swarm: 'rune', flight: 'in', ground: 'dim',
    hue: 'indigo', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 8, glyph: true,
  },

  /**
   * 司马懿 · 鬼才 — "当一名角色的判定牌生效前，你可以打出一张手牌代替之。"
   *
   * He reaches into somebody else's judgement and changes what fate was going
   * to say. 狼顾之鬼 — the wolf-glance ghoul, who could turn his head all the
   * way round, and whom Cao Cao distrusted for it.
   *
   * A net falls over the judgement and draws shut; small sealed tallies spiral
   * inward inside it. Nothing here moves fast — 司马懿 outlived everybody.
   */
  guicai: {
    figure: 'net', swarm: 'rune', flight: 'curl', ground: 'smoke',
    hue: 'void', hue2: 'violet', stance: 'still', tempo: 'slow', n: 9, glyph: true,
  },

  /**
   * 司马懿 · 反馈 — "当你受到伤害后，你可以获得伤害来源的一张牌。"
   *
   * Not 奸雄's "I keep what hit me" but "I take something back from YOU", along
   * the line the blow came in on. So: a chain snaps taut across the seat, and
   * the fragments come in and are dragged back out the same way.
   */
  fankui: {
    figure: 'chain', swarm: 'shard', flight: 'recoil', ground: 'shade',
    hue: 'void', hue2: 'cinnabar', stance: 'reel', tempo: 'quick', n: 10, turn: 14, glyph: true,
  },

  /**
   * 夏侯惇 · 刚烈 — a judgement, and then the source of the damage bleeds.
   *
   * 独眼的罗刹. An arrow took his left eye at Xiapi; he pulled it out with the
   * eye still on it and ate it — 父精母血，不可弃也, "flesh of my father, blood
   * of my mother, it is not to be thrown away" — and went back into the line.
   *
   * There is exactly one right image for this skill and it is a single eye
   * opening over the seat, in blood, with the room going dark around it.
   */
  ganglie: {
    figure: 'eye', swarm: 'drop', flight: 'out', ground: 'vignette',
    hue: 'blood', hue2: 'cinnabar', stance: 'reel', tempo: 'quick', n: 12, glyph: true,
  },

  /**
   * 张辽 · 突袭 — "摸牌阶段，你可以改为获得至多两名其他角色的各一张手牌。"
   *
   * 逍遥津: eight hundred men against a hundred thousand, at dawn, straight
   * into the camp before it was awake. He takes from other people's hands
   * rather than from the pile, which is the raid exactly.
   *
   * A wedge arrives out of first light and two cards come away with it.
   */
  tuxi: {
    figure: 'wedge', swarm: 'card', flight: 'in', ground: 'shade',
    hue: 'dawn', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 6, turn: -8, glyph: true,
  },

  /**
   * 许褚 · 裸衣 — draw one card fewer; your 杀 and 决斗 hit for one more.
   *
   * 虎痴, the tiger fool. At Tong Pass he stripped to the waist and fought Ma
   * Chao bare-chested, which is the trade this skill is: give up the cover,
   * take the strength. Armour comes off as bronze splinters on a shockwave and
   * the portrait swells.
   */
  luoyi: {
    figure: 'ring', swarm: 'shard', flight: 'out', ground: 'bloom',
    hue: 'bronze', hue2: 'flame', stance: 'swell', tempo: 'quick', n: 14, glyph: true,
  },

  /**
   * 郭嘉 · 天妒 — "当你的判定牌生效后，你可以获得之。"
   *
   * 天妒英才 — heaven envies a talent and takes it early. He died at thirty-eight
   * on the Wuhuan campaign, and Cao Cao, beaten at Red Cliffs, said that if
   * 奉孝 had lived he would not have come to this.
   *
   * Heaven's own attention, then: a shaft of cold light standing on the seat,
   * sparks falling INTO it out of the sky, the room lit from behind. He holds
   * still. The one thing 天妒 must not look like is something he chose.
   */
  tiandu: {
    figure: 'column', swarm: 'glint', flight: 'fall', ground: 'rays',
    hue: 'moon', hue2: 'frost', stance: 'still', tempo: 'slow', n: 10, glyph: true,
  },

  /**
   * 郭嘉 · 遗计 — hurt, he looks at two cards and hands them out.
   *
   * 遗计定辽东 — the plan he left behind. Dying, he wrote out how to take
   * Liaodong and told Cao Cao not to attack: wait, and the Gongsun brothers
   * will send you Yuan Shang's head themselves. They did.
   *
   * A hand writing, three strokes in the order a hand lays them, and then the
   * bamboo slips go out to other people. He is already pale.
   */
  yiji: {
    figure: 'strokes', swarm: 'slip', flight: 'out', ground: 'smoke',
    hue: 'ink', hue2: 'celadon', stance: 'pale', tempo: 'slow', n: 8, glyph: true,
  },

  /**
   * 甄姬 · 洛神 — judge; on black, keep the card and judge again.
   *
   * 洛神赋. Cao Zhi, riding back from the capital, sees the goddess of the Luo
   * on the far bank: 翩若惊鸿，婉若游龙 — startled swan, coiling dragon — and
   * 凌波微步，罗袜生尘, she walks the waves and her silk stockings raise dust
   * off the water. He cannot keep her, and the rhapsody is about that.
   *
   * Three veils of river light draw down over the seat, each on its own wobble.
   * The water rings out underneath and droplets lift off it. She does not move
   * — 洛神 is a vision, and a vision does not lunge.
   */
  luoshen: {
    figure: 'veil', swarm: 'drop', flight: 'rise', ground: 'ripple',
    hue: 'moon', hue2: 'frost', stance: 'still', tempo: 'slow', n: 16, spread: 0.72, glyph: true,
  },

  /**
   * 甄姬 · 倾国 — a black hand card becomes a 闪.
   *
   * 倾国倾城, from 李延年's song for his sister: 一顾倾人城，再顾倾人国 — one
   * glance topples a city, the second topples a state. It is an evasion skill,
   * so the beauty is the dodge: a sleeve sweeps across the frame, silk streams
   * after it, and there is nothing left where the blow was going.
   */
  qingguo: {
    figure: 'sweep', swarm: 'ribbon', flight: 'across', ground: 'smoke',
    hue: 'plum', hue2: 'rouge', stance: 'turn', tempo: 'even', n: 9, turn: -16, glyph: true,
  },

  /* ------------------------------------------------------------ 蜀 ------ */

  /**
   * 刘备 · 仁德 — give hand cards away; at two given, recover 1 hp.
   *
   * The whole brand. 携民渡江 — retreating from Cao Cao with a hundred thousand
   * civilians who would not leave him, at ten li a day, when every adviser told
   * him to abandon them.
   *
   * A halo opens over the seat and the cards go OUT. Almost nothing else in
   * this file sends cards away from their owner, which is the point.
   */
  rende: {
    figure: 'halo', swarm: 'card', flight: 'out', ground: 'bloom',
    hue: 'jade', hue2: 'gold', stance: 'lift', tempo: 'slow', n: 6, glyph: true,
  },

  /**
   * 刘备 · 激将 — 主公技. Other 蜀 players play a 杀 for him.
   *
   * 激将法, goading a general into fighting — the trick Zhuge Liang works on
   * Zhou Yu with the 铜雀台赋. The lord raises the standard and does not swing:
   * a banner unrolls, and the blades come in from off the table.
   */
  jijiang: {
    figure: 'banner', swarm: 'blade', flight: 'in', ground: 'rays',
    hue: 'cinnabar', hue2: 'gold', stance: 'bow', tempo: 'toll', n: 8, glyph: true,
  },

  /**
   * 关羽 · 武圣 — any red card becomes a 杀.
   *
   * 武圣, Saint of War: not a title he held but the deification, temples to him
   * in every city for a thousand years. The weapon is the 青龙偃月刀, the Green
   * Dragon Crescent Blade, and the crescent is the whole design — swept in
   * dragon-green, with his red across it.
   */
  wusheng: {
    figure: 'crescent', swarm: 'blade', flight: 'across', ground: 'wash',
    hue: 'pine', hue2: 'cinnabar', stance: 'lunge', tempo: 'quick', n: 7, turn: -22, glyph: true,
  },

  /**
   * 张飞 · 咆哮 — 锁定技. No limit on 杀 in his play phase.
   *
   * 长坂桥. Twenty horsemen behind him, the bridge cut, Cao Cao's army on the
   * far side, and he roared three times: 我乃燕人张翼德，谁敢与我决一死战.
   * Xiahou Jie fell off his horse dead of fright and the army turned round.
   *
   * A roar is a pressure wave, so this is rings leaving the seat one after
   * another with the air torn up behind them — and 咆哮 is 锁定技, which means
   * 张飞 does not decide to do it. The locked aura holds the frame while it
   * goes out. He is the reason the compulsory treatment exists: it is his only
   * skill, and until it was on the wire the table drew it as a choice.
   */
  paoxiao: {
    figure: 'rings', swarm: 'plume', flight: 'out', ground: 'ripple',
    hue: 'cinnabar', hue2: 'flame', stance: 'still', tempo: 'toll', n: 13, spread: 1.3, glyph: true,
  },

  /**
   * 诸葛亮 · 观星 — look at the top X cards and reorder them.
   *
   * He read the sky. At Wuzhangyuan, dying, he saw his own star fall and set
   * out the seven lamps to hold it — and Wei Yan burst into the tent and
   * knocked one over.
   *
   * The heavens turn: two slow arms of light sweep round a seat that does not
   * move, points of light orbiting with them, and the rest of the room goes
   * dark so the sky is the only thing lit.
   */
  guanxing: {
    figure: 'spiral', swarm: 'glint', flight: 'orbit', ground: 'dim',
    hue: 'indigo', hue2: 'frost', stance: 'still', tempo: 'slow', n: 15, spread: 1.35, glyph: true,
  },

  /**
   * 诸葛亮 · 空城 — 锁定技. With no hand cards he cannot be targeted.
   *
   * 空城计. Sima Yi's army arrives at a city Zhuge Liang has no troops in, and
   * he has the gates thrown open, the road swept, and sits on the wall playing
   * the qin. Sima Yi looks at the open gate for a long time and withdraws.
   *
   * THE ONE EFFECT IN THIS FILE WITH NO PARTICLES AT ALL. Every other skill
   * puts something in the air; this one is about there being nothing there, and
   * an empty gate standing open in a dark room says it better than anything
   * that could be added to it.
   */
  kongcheng: {
    figure: 'gate', swarm: 'none', ground: 'dim', n: 0,
    hue: 'ink', hue2: 'bone', stance: 'still', tempo: 'slow', glyph: true,
  },

  /**
   * 赵云 · 龙胆 — a 杀 may be played as a 闪, and a 闪 as a 杀.
   *
   * 子龙一身都是胆 — Liu Bei, walking the ground after Han River: "Zilong is
   * all gall". At Changban he went back into Cao Cao's army alone and came out
   * with the infant heir inside his armour.
   *
   * The skill is one thing becoming its opposite, so the dragon is drawn in
   * cold silver and the sparks coming off it are 杀-red: two colours, one
   * animal. It coils rather than strikes.
   */
  longdan: {
    figure: 'coil', swarm: 'glint', flight: 'flare', ground: 'bloom',
    hue: 'frost', hue2: 'cinnabar', stance: 'turn', tempo: 'quick', n: 10, glyph: true,
  },

  /**
   * 马超 · 马术 — 锁定技. Distance to everyone else is one shorter.
   *
   * 西凉锦马超, and the Liang cavalry. There is nothing to draw here but speed,
   * so nothing is drawn: NO FIGURE AT ALL, just dust crossing the frame on one
   * heading with the light going with it. The locked aura is what holds it to
   * the seat, and the absence of a form is what makes it read as a property
   * rather than an act.
   */
  mashu: {
    figure: 'none', swarm: 'dust', flight: 'across', ground: 'shade',
    hue: 'bone', hue2: 'ember', stance: 'still', tempo: 'quick', n: 22, turn: -6, glyph: true,
  },

  /**
   * 马超 · 铁骑 — on targeting with 杀, judge; on red, no 闪 allowed.
   *
   * Armoured cavalry. A steel wedge comes in along one line, stops dead, and
   * the lances follow it in a jet down the same line. Nothing spreads: a charge
   * that fans out is a rout.
   */
  tieqi: {
    figure: 'wedge', swarm: 'thorn', flight: 'jet', ground: 'shade',
    hue: 'silver', hue2: 'cinnabar', stance: 'lunge', tempo: 'quick', n: 13, turn: -4, glyph: true,
  },

  /**
   * 黄月英 · 集智 — draw on using an ordinary trick card.
   *
   * She is the one who is supposed to have designed the 木牛流马 and taught
   * Zhuge Liang the repeating crossbow, and the feather fan he is never drawn
   * without was hers first.
   *
   * Wisdom gathering: bamboo slips fly in from off the table and go into a
   * single bright core. Everything moves inward.
   */
  jizhi: {
    figure: 'orb', swarm: 'slip', flight: 'in', ground: 'bloom',
    hue: 'celadon', hue2: 'amber', stance: 'still', tempo: 'even', n: 9, glyph: true,
  },

  /**
   * 黄月英 · 奇才 — 锁定技. No distance limit on trick cards.
   *
   * The other half of the same woman: the engineer. A bronze mechanism turns on
   * the spot with tallies going round it — and it turns whether or not anybody
   * asked, which is what 锁定技 means.
   */
  qicai: {
    figure: 'sigil', swarm: 'rune', flight: 'orbit', ground: 'none',
    hue: 'bronze', hue2: 'amber', stance: 'still', tempo: 'even', n: 8, glyph: true,
  },

  /* ------------------------------------------------------------ 吴 ------ */

  /**
   * 孙权 · 制衡 — discard any number, draw the same number.
   *
   * 制衡 is the word for holding two things in check against each other, and it
   * is what he did for fifty years: 张昭 against 周瑜, the northern gentry
   * against the Jiangdong clans, Wei against Shu.
   *
   * A balance beam tips, overshoots and settles, and the cards go out and come
   * back — `recoil`, which is the only flight that is a round trip.
   */
  zhiheng: {
    figure: 'scale', swarm: 'card', flight: 'recoil', ground: 'none',
    hue: 'verdigris', hue2: 'amber', stance: 'still', tempo: 'even', n: 8, glyph: true,
  },

  /**
   * 孙权 · 救援 — 锁定技, 主公技. A 桃 from another 吴 player heals one more.
   *
   * Rings of aid closing on the seat with peach petals riding in on them —
   * 桃 is the card this skill is about, and a peach blossom is the one thing
   * that says so without a word.
   */
  jiuyuan: {
    figure: 'rings', swarm: 'petal', flight: 'in', ground: 'bloom',
    hue: 'peach', hue2: 'jade', stance: 'lift', tempo: 'slow', n: 10, glyph: true,
  },

  /**
   * 甘宁 · 奇袭 — a black card becomes a 过河拆桥.
   *
   * 锦帆贼 — the brocade-sail bandit, who ran the river with silk on his masts
   * and bells on his men's belts so you knew who had robbed you. Later, a
   * hundred horsemen into Cao Cao's camp at night and back out without losing
   * one.
   *
   * A dark sweep across the frame and the bells scatter gold out of it.
   */
  qixi: {
    figure: 'sweep', swarm: 'bead', flight: 'across', ground: 'shade',
    hue: 'void', hue2: 'gold', stance: 'lunge', tempo: 'quick', n: 12, turn: 14, glyph: true,
  },

  /**
   * 吕蒙 · 克己 — play no 杀, and skip the discard phase.
   *
   * 克己复礼, and 士别三日，即更刮目相待 — the man Sun Quan told to read, who
   * read, and became someone Lu Su had to look at again. The skill is
   * restraint: keep your hand, do nothing with it.
   *
   * A white lattice closes over the frame and locks, and NOTHING scatters —
   * the second effect in this file with no particles, for the same reason as
   * 空城 and by a different route. 白衣渡江: the colour is his.
   */
  keji: {
    figure: 'lattice', swarm: 'none', ground: 'frost', n: 0,
    hue: 'silver', hue2: 'moon', stance: 'brace', tempo: 'slow', glyph: true,
  },

  /**
   * 黄盖 · 苦肉 — lose 1 hp, then draw two.
   *
   * 苦肉计. Before Red Cliffs he argued with Zhou Yu in front of the whole camp
   * so that Zhou Yu would have him flogged in front of the whole camp, so that
   * Cao Cao's spies would report it and believe the defection when it came.
   * 周瑜打黄盖，一个愿打一个愿挨 — one willing to beat, one willing to take it.
   *
   * Three strokes laid across the seat in the order a hand lays them, blood
   * thrown off them on a gravity arc, the frame shivering and washed red. The
   * `toll` rhythm is deliberate: a flogging is not fast, it is counted.
   */
  kurou: {
    figure: 'strokes', swarm: 'drop', flight: 'arc', ground: 'wash',
    hue: 'blood', hue2: 'cinnabar', stance: 'shiver', tempo: 'toll', n: 12, glyph: true,
  },

  /**
   * 周瑜 · 英姿 — draw one extra in the draw phase.
   *
   * 雄姿英发，羽扇纶巾 — Su Shi, three hundred years later, still writing about
   * how he looked. 曲有误，周郎顾: he was a musician, and if the players got the
   * tune wrong he would turn his head, drunk or not.
   *
   * The feather fan opens and the feathers lift off it. No target, no impact —
   * 英姿 is bearing, and bearing goes upward.
   */
  yingzi: {
    figure: 'fan', swarm: 'feather', flight: 'rise', ground: 'bloom',
    hue: 'azure', hue2: 'frost', stance: 'lift', tempo: 'even', n: 10, glyph: true,
  },

  /**
   * 周瑜 · 反间 — name a suit; take one of his cards face up; be wrong and bleed.
   *
   * 反间计 at Red Cliffs. Jiang Gan comes to talk him into defecting, and Zhou
   * Yu lets him steal a forged letter from 蔡瑁 and 张允 — the only two men in
   * Cao Cao's fleet who knew how to fight on water. Cao Cao had them executed
   * that morning and understood what he had done about an hour later.
   *
   * Two frames, one of them reversed and in the other palette, crossing past
   * each other with a card going the wrong way between them. Slow, because the
   * whole trick is that you have time to look at it and still get it wrong.
   */
  fanjian: {
    figure: 'mirror', swarm: 'card', flight: 'across', ground: 'shade',
    hue: 'azure', hue2: 'blood', stance: 'turn', tempo: 'slow', n: 5, turn: -6, glyph: true,
  },

  /**
   * 大乔 · 国色 — a ♦ card becomes a 乐不思蜀.
   *
   * 国色天香 — the nation's beauty, heaven's own scent; said of the peony, and
   * of her. The card she turns everything into is the one that makes a man
   * forget he had somewhere to be.
   *
   * A peony opens and the petals go round rather than out. Nothing here strikes.
   */
  guose: {
    figure: 'bloom', swarm: 'petal', flight: 'orbit', ground: 'smoke',
    hue: 'plum', hue2: 'rouge', stance: 'still', tempo: 'slow', n: 12, glyph: true,
  },

  /**
   * 大乔 · 流离 — discard a card and give the 杀 to somebody else.
   *
   * 流离 is the word for being driven from your home — 流离失所 — and the skill
   * is exactly that done to a sword stroke: it arrives, and it goes somewhere
   * else. A wave leaves the seat, silk streams off in ONE direction rather than
   * radially, and the portrait turns out of the line.
   */
  liuli: {
    figure: 'wave', swarm: 'ribbon', flight: 'jet', ground: 'smoke',
    hue: 'orchid', hue2: 'moon', stance: 'turn', tempo: 'quick', n: 10, turn: 20, glyph: true,
  },

  /**
   * 陆逊 · 谦逊 — 锁定技. Cannot be the target of 顺手牵羊 or 乐不思蜀.
   *
   * He was thirty-nine and nobody had heard of him, and that was the point: Lu
   * Xun spent the whole first half of Yiling writing Liu Bei deferential letters
   * about how frightened he was.
   *
   * So there is no figure. Mist falls over the seat and settles, and the locked
   * aura is the only hard edge in the frame. A skill about not being seen
   * should be the least visible thing in the file.
   */
  qianxun: {
    figure: 'none', swarm: 'plume', flight: 'fall', ground: 'smoke',
    hue: 'celadon', hue2: 'bone', stance: 'still', tempo: 'slow', n: 12, spread: 0.55, glyph: true,
  },

  /**
   * 陆逊 · 连营 — losing your last hand card, draw one.
   *
   * Named for the thing he burned. Liu Bei strung his camps for seven hundred
   * li through the gorges in high summer, and Lu Xun waited two months, gave
   * every soldier a bundle of straw, and did it in one night.
   *
   * A row of camp posts stands up one after another and the embers lift off
   * them into smoke. The rank order is the whole point — 连营 is a LINE of
   * camps, and `pillars` is the only figure that arrives in sequence.
   */
  lianying: {
    figure: 'pillars', swarm: 'cinder', flight: 'rise', ground: 'smoke',
    hue: 'flame', hue2: 'ember', stance: 'still', tempo: 'even', n: 12, glyph: true,
  },

  /**
   * 孙尚香 · 枭姬 — losing an equip card, draw two.
   *
   * 弓腰姬, the bow-waisted princess. Liu Bei is supposed to have gone cold
   * every time he entered her rooms, because her hundred maids stood along the
   * walls with blades. Losing a weapon does not disarm her.
   *
   * A bow bends and the arrows leave in one line.
   */
  xiaoji: {
    figure: 'crescent', swarm: 'arrow', flight: 'jet', ground: 'wash',
    hue: 'rouge', hue2: 'gold', stance: 'lunge', tempo: 'quick', n: 8, turn: -10, glyph: true,
  },

  /**
   * 孙尚香 · 结姻 — discard two, and both she and a wounded man recover.
   *
   * 甘露寺. The marriage was Zhou Yu's trap to get Jingzhou back and it turned
   * into an actual marriage, briefly. 结姻 is the tying of the knot, so the
   * figure is the link itself, drawn taut across the seat, with the blossom
   * going out around it. Two people, one bond.
   */
  jieyin: {
    figure: 'chain', swarm: 'petal', flight: 'out', ground: 'bloom',
    hue: 'rouge', hue2: 'peach', stance: 'blush', tempo: 'slow', n: 10, turn: -9, glyph: true,
  },

  /* ------------------------------------------------------------ 群 ------ */

  /**
   * 华佗 · 青囊 — discard one, heal a wounded player.
   *
   * 青囊书, the green satchel: the medicine he wrote out in Cao Cao's prison
   * and gave to the jailer, whose wife burned it on the fire, because it had
   * already killed one man who owned it.
   *
   * A green scroll unrolls down the seat and the herbs go out from it.
   */
  qingnang: {
    figure: 'banner', swarm: 'petal', flight: 'out', ground: 'bloom',
    hue: 'jade', hue2: 'celadon', stance: 'lift', tempo: 'slow', n: 10, glyph: true,
  },

  /**
   * 华佗 · 急救 — outside his turn, a red card becomes a 桃.
   *
   * The same doctor, in a hurry. Where 青囊 unrolls, this one is a single pulse
   * and drops coming in from off the table. `quick`, because that is the whole
   * difference between the two skills and it should be the whole difference
   * between the two effects.
   */
  jijiu: {
    figure: 'star', swarm: 'drop', flight: 'in', ground: 'bloom',
    hue: 'peach', hue2: 'jade', stance: 'flare', tempo: 'quick', n: 11, turn: 12, glyph: true,
  },

  /**
   * 吕布 · 无双 — 锁定技. It takes two 闪 to answer his 杀, and two 杀 to
   * answer his 决斗.
   *
   * 人中吕布，马中赤兔. At Hulao Pass he fought all three brothers at once and
   * the field watched. 无双 means there is no second one.
   *
   * The heaviest thing in the standard set and the only skill here that takes
   * the ROOM: `dim` puts the rest of the table out. A single crescent comes
   * down on the `toll` rhythm — it hangs, and then it lands — and the wreckage
   * goes out around it. He does not react to it, because it is 锁定技: this is
   * not something 吕布 does, it is what 吕布 is.
   */
  wushuang: {
    figure: 'crescent', swarm: 'shard', flight: 'out', ground: 'dim',
    hue: 'blood', hue2: 'flame', stance: 'still', tempo: 'toll', n: 16, turn: 26, glyph: true,
  },

  /**
   * 貂蝉 · 离间 — pick two men; the second is made to 决斗 the first.
   *
   * 连环计. Wang Yun promises her to Lü Bu and gives her to Dong Zhuo, and then
   * stands back. She is the only person in the standard twenty-five whose skill
   * makes two other people fight each other, and she never touches either.
   *
   * A web is spun across the seat and the silk flies off it in a spiral —
   * `flare` is the one flight that leaves while turning, which is what a thread
   * does when it is pulled from the middle. A shadow crosses.
   */
  lijian: {
    figure: 'web', swarm: 'ribbon', flight: 'flare', ground: 'shade',
    hue: 'rouge', hue2: 'void', stance: 'turn', tempo: 'slow', n: 10, glyph: true,
  },

  /**
   * 貂蝉 · 闭月 — draw a card at the end phase.
   *
   * 闭月羞花. Hers is the 闭月 half: worshipping the moon in the garden, a
   * cloud crossed it, and Wang Yun told everyone the moon had hidden its face
   * rather than be compared with her.
   *
   * The `moon` figure in this file was authored for this one skill and is used
   * by almost nothing else: the disc rises, a shadow travels across it, and the
   * room goes dark behind. It is the last thing she does in a turn, and it is
   * the quietest effect in the standard set on purpose.
   */
  biyue: {
    figure: 'moon', swarm: 'plume', flight: 'across', ground: 'dim',
    hue: 'moon', hue2: 'void', stance: 'still', tempo: 'slow', n: 8, turn: 8, glyph: true,
  },
};
