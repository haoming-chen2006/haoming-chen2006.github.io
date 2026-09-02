/**
 * A hundred and fifteen skills off five smaller packs, and one long line of
 * second-tier histories.
 *
 * Three sets sit here. The 新杀 additions are odd shapes — a regicide who was
 * executed for obeying his orders, three famous horses promoted to generals in
 * their own right, and a pair of palace servants — and two of those cards are
 * the same night in 260 seen from opposite ends, so they are drawn to answer
 * each other. The 一将成名 EX block is the 界限突破 rework of the second tier:
 * capable officers and administrators who each get one anecdote in the 三国志,
 * and that one anecdote is the design every time — 于禁 weeping as he executes
 * 昌豨, 全琮 giving away his father's rice, 徐盛 building a wall out of reeds
 * overnight. The last block is 诸葛四友 (whose two 共砺 cards are one skill
 * written twice, and are drawn as each other's reflection) and 王允, who won
 * and then would not pardon anybody.
 *
 * Rules text was read from the engine in every case. It matters more here than
 * in the standard set, because these names are almost all quotations: 伏枥 is
 * 老骥伏枥，志在千里, 征蓬 is 王维, 顺逸 is 顺天者逸，逆天者劳, and none of
 * the three describes what its skill does.
 */
import type { Motif } from '../motif';

export const MISC: Readonly<Record<string, Motif>> = {
  /* ---------------------------------------------- 新杀: the odd shapes ---- */

  /**
   * 成济 · 劣犬良弓 — the soldier who did it. In 260 曹髦 came out of the palace
   * with a sword and 贾充 told 成济 "司马公畜养汝等，正为今日" — the Sima lord
   * has fed you for exactly this day — and 成济 ran the emperor through in front
   * of the carriage. 司马昭 then had him, his brother and his whole clan killed
   * to settle opinion. 劣犬良弓: 狡兔死，走狗烹；飞鸟尽，良弓藏.
   */

  /**
   * 狂戾 — 锁定技. A random number of other players are marked; twice a phase,
   * targeting a marked player costs you both a random card and pays you two.
   *
   * A dog off its chain, biting whoever is standing near. The marks go out
   * as barbs at 1.4 seat widths — the point of 狂戾 is that he does not choose
   * who — and nothing about the motion is decided or aimed.
   */
  kuangli: {
    figure: 'ring', swarm: 'thorn', flight: 'out', ground: 'shade',
    hue: 'blood', hue2: 'ash', stance: 'lunge', tempo: 'quick', n: 13, spread: 1.4, glyph: true,
  },

  /**
   * 凶肆 — 限定技. Throw away your whole hand; every other player loses 1 hp.
   *
   * 凶肆 is the shop that sells coffins. Once, and the whole table pays for it,
   * and he is emptied doing it: the cards leave on a ground-wave that flattens
   * across every seat, bone over blood, and the portrait sinks rather than
   * follows through. He does not survive his one good day either.
   */
  xiongsi: {
    figure: 'wave', swarm: 'card', flight: 'out', ground: 'dim',
    hue: 'bone', hue2: 'blood', stance: 'sink', tempo: 'toll', n: 10, spread: 1.4, glyph: true,
  },

  /**
   * 赤兔 — 人中吕布，马中赤兔. The horse itself, dealt as a general: 吕布's,
   * then 关羽's, and said to have starved itself to death when 关羽 died.
   */

  /**
   * 骏魁 — 锁定技. At game start EVERY mount card is removed from the game;
   * your 杀 limit goes up by one.
   *
   * There is one horse and it is this one. The stable doors part and every
   * other mount in the deck leaves the table for good — the only skill in the
   * pack whose figure is a door opening on cards going away permanently.
   */
  junkui: {
    figure: 'gate', swarm: 'card', flight: 'out', ground: 'dim',
    hue: 'ember', hue2: 'ash', stance: 'brace', tempo: 'toll', n: 6, spread: 1.3, glyph: true,
  },

  /**
   * 驰原 — your first 杀 each turn ignores distance and demands a second 闪;
   * once a phase, draw for the run of red cards on the table.
   *
   * 驰 is the gallop and 原 is open ground. A single long sweep across the frame
   * with the dust going with it, red at the body and dying to ember behind —
   * and it crosses into the neighbour's air, because ignoring distance is the
   * whole skill.
   */
  chiyuanc: {
    figure: 'sweep', swarm: 'dust', flight: 'across', ground: 'shade',
    hue: 'cinnabar', hue2: 'ember', stance: 'lunge', tempo: 'quick', n: 20, turn: -8, spread: 1.34, glyph: true,
  },

  /**
   * 的卢 — 刘备's horse, named for the white blaze running from its forehead to
   * its teeth, which the physiognomists said marked a horse that kills its
   * rider. At 檀溪 it cleared three 丈 of water in one bound with him on it.
   */

  /**
   * 骥冠 — 锁定技. All mounts leave the game; your hand limit is +2.
   *
   * The same removal as 骏魁 and it must not look like it. This one is the
   * blaze: a pale disc with a shadow crossing it — the white mark on the brow,
   * and 妨主, the omen on it — with the extra cards drawn quietly inward. Slow,
   * dark, and it does not move.
   */
  jiguan: {
    figure: 'moon', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'bone', hue2: 'ink', stance: 'still', tempo: 'slow', n: 7, spread: 0.7, glyph: true,
  },

  /**
   * 跃檀 — when someone within distance 1 is targeted by a damage card you may
   * hand them a card; if the damage never lands, you draw.
   *
   * 檀溪. The rider is carried over the water and out of reach of the thing
   * coming for him. So the figure is the stream — a rippling sheet drawn down
   * the seat — and the spray leaves on a gravity arc, up and over, at the
   * height of the jump.
   */
  yuetan: {
    figure: 'veil', swarm: 'drop', flight: 'arc', ground: 'ripple',
    hue: 'celadon', hue2: 'frost', stance: 'lift', tempo: 'quick', n: 12, spread: 1.3, glyph: true,
  },

  /**
   * 绝影 · 征蓬 — at another player's end phase, lose X hp to be paid for what
   * happened to them this turn; 乘势 resets X and pays out of the discard pile.
   *
   * 绝影 means shadowless: 曹操's horse at 宛城, which took three arrows and one
   * in the cheek and still carried him out of 张绣's camp. The name is 王维 —
   * 征蓬出汉塞，归雁入胡天 — the tumbleweed that leaves the frontier and does
   * not come back, so the figure is a rolling arm going out and away, burnt
   * flakes off it, and the portrait wilting as it pays.
   */
  zhengpeng: {
    figure: 'spiral', swarm: 'cinder', flight: 'flare', ground: 'smoke',
    hue: 'bone', hue2: 'ember', stance: 'wilt', tempo: 'even', n: 12, spread: 1.28, glyph: true,
  },

  /**
   * 李昭焦伯 · 竭诚尽节 — the other end of 成济's card. These are the two palace
   * officers 曹髦 sent down to 陵云台 for armour and weapons on the night he
   * decided to go out and be killed rather than be deposed. They are one card
   * because neither of them is anything on his own.
   */

  /**
   * 佐佑 — 转换技. 阳: someone draws three, then discards two. 阴: someone
   * discards one, then gains 1 armour.
   *
   * 佐佑 is 左右 — to help from the left and from the right. A balance beam with
   * a different colour in each pan, tipping between the giving half and the
   * guarding half, with the clerks' bamboo travelling across it.
   */
  zuoyou: {
    figure: 'scale', swarm: 'slip', flight: 'across', ground: 'wash',
    hue: 'dawn', hue2: 'void', stance: 'still', tempo: 'even', n: 8, glyph: true,
  },

  /**
   * 侍守 — 锁定技. When another player performs one option of 佐佑, you perform
   * the other one.
   *
   * The frame doubled with one copy reversed, and 佐佑's two colours put back
   * the other way round: this skill IS the mirrored half, and the two entries
   * should read as one motif seen twice. It barely travels and it braces — an
   * attendant standing to, not acting.
   */
  shishoul: {
    figure: 'mirror', swarm: 'rune', flight: 'hover', ground: 'dim',
    hue: 'void', hue2: 'dawn', stance: 'brace', tempo: 'toll', n: 6, spread: 0.6, glyph: true,
  },

  /* -------------------------------- 一将成名 EX (界限突破) ---------------- */

  /**
   * 界曹彰 · 将驰 — at play phase start, choose: draw one and use no 杀 this
   * phase, or discard one and have your 杀 lose its distance limit and gain a use.
   *
   * 黄须儿, who wrestled tigers and told his father what he wanted: 丈夫一为卫、
   * 霍，将十万骑驰沙漠 — to be a Wei Qing or a Huo Qubing and lead a hundred
   * thousand horse across the desert. The skill name is a piece of that
   * sentence. His standard goes up and the arrows leave along one heading, past
   * the frame; the colour is the beard.
   */
  m_ex__jiangchi: {
    figure: 'banner', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'amber', hue2: 'bronze', stance: 'lunge', tempo: 'quick', n: 10, turn: -12, spread: 1.36, glyph: true,
  },

  /**
   * 界曹真 · 司敌 — you privately assign another player a target; if their next
   * card goes to exactly that person, you collect. Neither assignment is visible.
   *
   * 荷国天督. After the first 祁山 campaign he told the court that 诸葛亮 would
   * come next through 陈仓, and put 郝昭 in it with orders to build, and was
   * right. So: an eye that opens and does not blink, and a sealed mark laid on
   * someone else's seat before they have moved. Nothing here is fast and
   * nothing here is shown.
   */
  m_ex__sidi: {
    figure: 'eye', swarm: 'rune', flight: 'out', ground: 'dim',
    hue: 'ink', hue2: 'frost', stance: 'still', tempo: 'slow', n: 6, spread: 1.3, glyph: true,
  },

  /**
   * 界典韦 · 强袭 — once per player per phase: lose 1 hp OR throw away a weapon,
   * and deal 1 damage inside your reach.
   *
   * 古之恶来. At 宛城 his halberds had been stolen, so he took up whatever came
   * to hand, held the gate while 曹操 got out, and died standing. The skill is
   * that trade written down: the body or the weapon, spent for one wound. A
   * hard starburst along one line, bronze splinters going with it in blood.
   */
  m_ex__qiangxi: {
    figure: 'star', swarm: 'shard', flight: 'jet', ground: 'shade',
    hue: 'blood', hue2: 'bronze', stance: 'lunge', tempo: 'quick', n: 12, turn: 12, spread: 1.1, glyph: true,
  },

  /**
   * 界伏皇后 · 孤注一掷 — 伏寿, who wrote to her father asking him to kill 曹操,
   * and whose letter surfaced eleven years later. 华歆 pulled her out of the
   * gap in the wall she was hiding in and dragged her past the emperor, who
   * said only 我亦不知命在何时 — I do not know when my own turn comes.
   */

  /**
   * 惴恐 — once a round, at another's prepare phase, gamble a 拼点 against
   * someone at least as healthy as you; lose and they hit you.
   *
   * 惴惴其栗, from 诗经 — trembling. This is terror deciding to act, which is
   * worse than terror doing nothing. A net comes down over the frame and shuts,
   * the dark closes from the corners, and the swarm is dust that barely gets
   * anywhere: 0.6, all of it inside the wall she was found behind.
   */
  m_ex__zhuikong: {
    figure: 'net', swarm: 'dust', flight: 'fall', ground: 'vignette',
    hue: 'ash', hue2: 'blood', stance: 'shiver', tempo: 'quick', n: 10, spread: 0.6, glyph: true,
  },

  /**
   * 求援 — when a 杀 names you, another player hands you a basic card or becomes
   * a target of it too.
   *
   * The letter. Asking for rescue is how she took her father, her brothers and
   * a hundred of her household down with her. A link drawn taut to another seat
   * with the message running out along it — the one flight in her pair that
   * leaves the frame at all — and she is already reeling when it goes.
   */
  m_ex__qiuyuan: {
    figure: 'chain', swarm: 'slip', flight: 'out', ground: 'dim',
    hue: 'blood', hue2: 'bone', stance: 'reel', tempo: 'toll', n: 7, turn: 8, spread: 1.35, glyph: true,
  },

  /**
   * 界高顺 · 攻无不克 — 吕布's best officer, who commanded seven hundred men
   * called 陷阵营 because nothing they were pointed at held. He drank nothing,
   * took no gifts, was demoted for telling 吕布 the truth, went on doing the
   * work, and at 下邳 answered his captors with silence and was executed.
   */

  /**
   * 陷阵 — 拼点 a player: win and you ignore their armour and all distance and
   * frequency limits against them; lose and you may use no 杀 this phase.
   *
   * The unit's own name — to break into the formation. A wedge along one line,
   * armour coming off it as splinters, and no spread at all: the 陷阵营 went in
   * at one point and through it. The toll rhythm is the seven hundred arriving
   * together rather than fast.
   */
  m_ex__xianzhen: {
    figure: 'wedge', swarm: 'shard', flight: 'jet', ground: 'vignette',
    hue: 'bronze', hue2: 'ink', stance: 'lunge', tempo: 'toll', n: 11, turn: -6, spread: 1.2, glyph: true,
  },

  /**
   * 禁酒 — 锁定技. Your 酒 is a plain 杀; wine-boosted damage against you is cut
   * back; nobody else may drink in your turn.
   *
   * Prohibition, and the man is the reason: 顺为人清白有威严，不饮酒. An ink
   * grid closes over the frame and locks, and the amber falls against it and
   * stops — spread 0.5, so not one drop leaves the portrait. The whole skill is
   * a refusal, and refusal is a wall with something wet running down it.
   */
  m_ex__jinjiu: {
    figure: 'lattice', swarm: 'drop', flight: 'fall', ground: 'shade',
    hue: 'ink', hue2: 'amber', stance: 'brace', tempo: 'slow', n: 8, spread: 0.5, glyph: true,
  },

  /**
   * 界顾雍 · 表疏忠言 — chancellor of 吴 for nineteen years and famously silent.
   * 孙权 said 顾君不言，言必有中. He sent his advice up in writing and never
   * claimed it; when word came that his son was dead he went on presiding, and
   * only afterwards was it seen he had driven his nails through his palm.
   */

  /**
   * 慎行 — X times a phase (X = your hp), discard two cards; two colours pays
   * two, one colour pays one.
   *
   * 慎行 is the careful step. Two strokes laid across each other in the order a
   * hand lays them — the two cards, unlike, which is the whole condition — with
   * the ink coming off the brush and going nowhere much. Nothing leaves the
   * frame: he never said anything he had not weighed.
   */
  m_ex__shenxing: {
    figure: 'strokes', swarm: 'drop', flight: 'fall', ground: 'none',
    hue: 'ink', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 8, spread: 0.68, glyph: true,
  },

  /**
   * 秉壹 — at end phase, show a hand that is all one colour or all one type and
   * up to X players each draw.
   *
   * 秉壹 is holding to the One. A single shaft standing on the seat with the
   * room lit from behind it, and then the memorial goes out to everyone at the
   * table at once — the reward for a hand that is entirely of a piece, from the
   * man whose whole reputation was that he never varied.
   */
  m_ex__bingyi: {
    figure: 'column', swarm: 'slip', flight: 'out', ground: 'rays',
    hue: 'celadon', hue2: 'gold', stance: 'still', tempo: 'toll', n: 9, spread: 1.35, glyph: true,
  },

  /**
   * 界华佗 · 青囊 — discard a card to heal someone; if it was red, do it again
   * for somebody you have not treated yet this phase.
   *
   * The same green satchel as the standard 青囊, but the 界 rework goes on down
   * the ward, so this one is not the scroll unrolling — it is the herbs opening
   * outward and reaching past the frame to the next patient and the next.
   */
  m_ex__qingnang: {
    figure: 'bloom', swarm: 'petal', flight: 'out', ground: 'bloom',
    hue: 'jade', hue2: 'peach', stance: 'lift', tempo: 'even', n: 12, spread: 1.3, glyph: true,
  },

  /**
   * 界姜维 · 龙的衣钵 — 诸葛亮's heir, who took the northern war on after him
   * and kept it going for thirty years and eleven campaigns.
   */

  /**
   * 挑衅 — name a player: they must 杀 you, or you take one of their cards.
   *
   * Goading, which is his entire strategic career: he could not make 魏 come
   * out, so he kept making it insulting to stay in. A fan snaps open toward one
   * seat with blades in it — a dare, delivered at 1.34 because the skill is
   * entirely about the other person and not at all about him.
   */
  m_ex__tiaoxin: {
    figure: 'fan', swarm: 'blade', flight: 'jet', ground: 'shade',
    hue: 'flame', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 9, turn: -18, spread: 1.34, glyph: true,
  },

  /**
   * 志继 — 觉醒技. Empty-handed at your prepare phase: heal or draw, lose a
   * point of max hp, and gain 〖观星〗.
   *
   * 继承 — to carry on the will. The mantle comes down rather than up: an arc
   * opening over his head with the light falling INTO him, and the palette is
   * 观星's own indigo and frost on purpose, because at the end of this animation
   * he is holding 诸葛亮's skill.
   */
  m_ex__zhiji: {
    figure: 'halo', swarm: 'glint', flight: 'fall', ground: 'rays',
    hue: 'indigo', hue2: 'frost', stance: 'lift', tempo: 'slow', n: 10, glyph: true,
  },

  /**
   * 界简雍 · 悠游风议 — 刘备's oldest friend, who lounged sideways on the couch
   * in front of him during audiences. During a drought 刘备 was arresting people
   * for owning brewing gear; 简雍 pointed at a couple in the street and said
   * they were about to fornicate — "they have the equipment" — and the arrests
   * stopped.
   */

  /**
   * 巧说 — 拼点; win and your next basic or trick may take a target on or off
   * (no distance limit); lose and no tricks this phase.
   *
   * Talk that changes who a thing lands on. Rings of breath going out over the
   * table with the air distorting behind them, reaching one seat further than
   * they should, and he turns while he says it.
   */
  m_ex__qiaoshui: {
    figure: 'rings', swarm: 'plume', flight: 'out', ground: 'ripple',
    hue: 'amber', hue2: 'dawn', stance: 'turn', tempo: 'even', n: 9, spread: 1.32, glyph: true,
  },

  /**
   * 纵适 — after any 拼点, look at the top card and take either it or the lower
   * of the two staked cards.
   *
   * 纵适 is letting go and being comfortable, and the man is the one who would
   * not sit up straight for a king. Five cards hovering where they are — the
   * only `hover` flight in this pack besides his opposite number 侍守 — inside
   * a 0.6 spread, in smoke. Nothing in it exerts itself.
   */
  m_ex__zongshij: {
    figure: 'coil', swarm: 'card', flight: 'hover', ground: 'smoke',
    hue: 'celadon', hue2: 'amber', stance: 'still', tempo: 'slow', n: 5, spread: 0.6, glyph: true,
  },

  /**
   * 界廖化 · 历尽沧桑 — he served 关羽, faked his own death to walk back across
   * the country to 刘备, and was still leading troops in 263. 蜀中无大将，廖化
   * 作先锋.
   */

  /**
   * 当先 — 锁定技. At turn start, take a 杀 out of the discard pile and take an
   * extra play phase.
   *
   * To be the vanguard. He picks a used blade up off the ground — the swarm
   * flies IN, which almost nothing offensive does — and goes out in front
   * again, in ash, on the slow count of a man who has done this for fifty years.
   */
  m_ex__dangxian: {
    figure: 'wedge', swarm: 'blade', flight: 'in', ground: 'dim',
    hue: 'ash', hue2: 'cinnabar', stance: 'lunge', tempo: 'toll', n: 6, turn: -6, spread: 1.15, glyph: true,
  },

  /**
   * 伏枥 — 限定技. Dying, set your hp to the number of kingdoms in play; if that
   * leaves you uniquely highest, turn face down.
   *
   * 老骥伏枥，志在千里 — 曹操's own line, the old horse lying in its stall with a
   * thousand li still in its head. A banked coal in the straw swelling back up
   * and the ash lifting off it, close in and slow. He does not charge out of
   * this; he just does not go out.
   */
  m_ex__fuli: {
    figure: 'orb', swarm: 'cinder', flight: 'rise', ground: 'bloom',
    hue: 'ember', hue2: 'bone', stance: 'lift', tempo: 'slow', n: 12, spread: 0.7, glyph: true,
  },

  /**
   * 界凌统 · 旋风 — discard two in your discard phase or lose an equip, and
   * strip two cards off the table or move somebody's equipment to somebody else.
   *
   * 豪情烈胆. At 逍遥津 he took three hundred men back into 张辽's line to get
   * 孙权 across the water and came out alone, wounded, having lost every one of
   * them. The name is the weather: a turning arm going out and around with other
   * people's cards in it, ash-dark with the stripped metal showing.
   */
  m_ex__xuanfeng: {
    figure: 'spiral', swarm: 'card', flight: 'flare', ground: 'smoke',
    hue: 'ash', hue2: 'silver', stance: 'turn', tempo: 'quick', n: 10, spread: 1.36, glyph: true,
  },

  /**
   * 界庞德 · 鞬出 — when your 杀 names a target, throw one of their cards away:
   * equipment and they cannot answer; anything else and they keep the 杀.
   *
   * 周苛之节 — 曹操 comparing him to the Han officer who was boiled alive rather
   * than change sides. He came to 樊城 with his own coffin on the cart and put
   * an arrow in 关羽's forehead. 鞬 is the bow-case on the saddle: the quiver
   * stands up in a rank and empties along one line.
   */
  m_ex__jianchu: {
    figure: 'pillars', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'bronze', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 8, turn: -12, spread: 1.3, glyph: true,
  },

  /**
   * 界庞统 · 凤雏 — the Fledgling Phoenix, who was killed by crossbows at
   * thirty-six at a place afterwards called 落凤坡.
   */

  /**
   * 连环 — a ♣ becomes 铁索连环, and your 铁索连环 takes an extra target.
   *
   * The advice he is remembered for: chain the ships together so the northerners
   * stop being seasick. Silver links draw taut into the next seat, and the fire
   * that this was actually for runs along them as sparks — the second colour is
   * what happened three weeks later.
   */
  m_ex__lianhuan: {
    figure: 'chain', swarm: 'spark', flight: 'across', ground: 'shade',
    hue: 'silver', hue2: 'flame', stance: 'still', tempo: 'toll', n: 10, turn: 6, spread: 1.35, glyph: true,
  },

  /**
   * 涅槃 — 限定技. Throw away everything you have, draw three, set hp to 3, and
   * restore your general card.
   *
   * Nirvana, and the bird his nickname is: burned down to nothing and standing
   * up out of it. Petals of flame opening with the feathers lifting off them
   * and the light coming from behind. Slow — a rebirth that arrived quickly
   * would just be a heal.
   */
  m_ex__niepan: {
    figure: 'bloom', swarm: 'feather', flight: 'rise', ground: 'rays',
    hue: 'flame', hue2: 'gold', stance: 'lift', tempo: 'slow', n: 14, glyph: true,
  },

  /**
   * 界潘璋马忠 · 擒龙伏虎 — the two officers who took 关羽 alive at 临沮 in 219.
   * 马忠's men made the capture; 潘璋 ended up with the blade.
   */

  /**
   * 夺刀 — after taking damage, take the weapon out of the damage source's
   * equipment area.
   *
   * The 青龙偃月刀, which 潘璋 carried afterwards. The crescent is drawn in the
   * standard set's 关羽 pine on purpose and it moves the wrong way — INTO the
   * seat, off the man who owned it — while the portrait is still reeling from
   * the blow that paid for it.
   */
  m_ex__duodao: {
    figure: 'crescent', swarm: 'glint', flight: 'in', ground: 'shade',
    hue: 'pine', hue2: 'ash', stance: 'reel', tempo: 'quick', n: 8, turn: -20, glyph: true,
  },

  /**
   * 暗箭 — 锁定技. If you are outside their reach, your 杀 either cannot be
   * answered or hits for one more.
   *
   * 暗箭伤人 — the arrow from where nobody is looking. NO FIGURE and only five
   * particles: a skill that works precisely because it is not seen should be
   * the least visible motif in the pack. One line comes out of a dark room and
   * crosses into the next seat, and there is nothing else to look at.
   */
  m_ex__anjian: {
    figure: 'none', swarm: 'arrow', flight: 'jet', ground: 'dim',
    hue: 'ink', hue2: 'blood', stance: 'still', tempo: 'quick', n: 5, turn: -8, spread: 1.38, glyph: true,
  },

  /**
   * 界全琮 · 邀名 — 蓄力技. Spend a charge to strip a card off someone richer
   * than you, or hand a card to someone poorer; alternating pays you back.
   *
   * 慕势耀族. His father sent him to 吴 with several thousand 斛 of rice to
   * trade and he gave all of it away to the destitute and came home with an
   * empty boat, and said he had thought winning hearts more urgent. 邀名 is
   * fishing for a reputation, so: a halo, bought — the grain pours out of it,
   * he bows, and the light behind is very fine indeed.
   */
  m_ex__yaoming: {
    figure: 'halo', swarm: 'bead', flight: 'out', ground: 'rays',
    hue: 'amber', hue2: 'gold', stance: 'bow', tempo: 'even', n: 12, spread: 1.3, glyph: true,
  },

  /**
   * 界孙鲁班 · 为虎作伥 — 孙权's daughter, who destroyed the heir 孙和, framed
   * his mother into her grave, and put her own family on the losing side of
   * everything afterwards. The title is the 伥: the ghost of a man a tiger ate,
   * which walks ahead of the tiger and leads other people to it.
   */

  /**
   * 谮毁 — once a phase, when your 杀 or black trick has one target, name a
   * second legal one and either take a card and make THEM the user of it, or
   * simply add them.
   *
   * 谮 is slander specifically — the word spoken about someone to someone else.
   * The mechanic hands the knife to a third party and steps back, which is the
   * 伥 exactly. A web is spun across the seat, the breath carries across it into
   * another player's air, and she turns away while it goes.
   */
  m_ex__zenhui: {
    figure: 'web', swarm: 'plume', flight: 'across', ground: 'smoke',
    hue: 'void', hue2: 'rouge', stance: 'turn', tempo: 'slow', n: 9, spread: 1.36, glyph: true,
  },

  /**
   * 骄矜 — damaged by a male character, discard an equip and the damage does not
   * happen.
   *
   * Hauteur, and it only works on men. THE ONE MOTIF IN THIS PACK WITH NO
   * PARTICLES: a screen comes down in orchid, the blow does not arrive, and the
   * portrait does not move or brace or flinch. She pays an equip for it and you
   * never see the price leave her hand — the whole skill is that nothing
   * happened and she is not going to discuss it.
   */
  m_ex__jiaojin: {
    figure: 'veil', swarm: 'none', ground: 'wash', n: 0,
    hue: 'orchid', hue2: 'silver', stance: 'still', tempo: 'quick', glyph: true,
  },

  /**
   * 界吴懿 · 奔袭 — at play phase start discard any number of cards to shorten
   * every distance by X, add up to X neighbours to your next card, and draw five
   * if it drew blood.
   *
   * 建兴鞍辔. 刘备's brother-in-law, who took 阳溪 with 魏延 in 230 by riding
   * further and faster than 郭淮 thought the roads allowed. One hard ring
   * punches out of the seat far enough to take in everyone standing near, with
   * the ground coming up behind it.
   */
  m_ex__benxi: {
    figure: 'ring', swarm: 'dust', flight: 'out', ground: 'shade',
    hue: 'bronze', hue2: 'dawn', stance: 'lunge', tempo: 'quick', n: 16, spread: 1.36, glyph: true,
  },

  /**
   * 界徐晃 · 周亚夫之风 — after he broke the siege of 樊城, 曹操 rode through his
   * camp and nobody left their post to look, and 曹操 said he had the bearing of
   * 周亚夫. Before that he had spent the campaign cutting the road behind 关羽.
   */

  /**
   * 断粮 — a black non-trick becomes 兵粮寸断, and against anyone holding more
   * cards than you it has no distance limit.
   *
   * Cutting the supply. Two panels shut across the road and the grain spills
   * down out of the gap — the only ash-and-amber pairing in the pack, and the
   * only figure here whose whole job is that something does not get through.
   */
  m_ex__duanliang: {
    figure: 'gate', swarm: 'bead', flight: 'fall', ground: 'dim',
    hue: 'ash', hue2: 'amber', stance: 'brace', tempo: 'toll', n: 9, spread: 1.3, glyph: true,
  },

  /**
   * 截辎 — 锁定技. Whenever another player skips a draw phase, you draw.
   *
   * 辎 is the baggage train. Where 断粮 closes a road, this one takes the cart:
   * his great axe comes down across the frame and the load walks off the other
   * player's turn into his hand. Six cards, quick, and nothing else in the air.
   */
  m_ex__jiezi: {
    figure: 'crescent', swarm: 'card', flight: 'in', ground: 'shade',
    hue: 'bronze', hue2: 'bone', stance: 'lunge', tempo: 'quick', n: 6, turn: -16, spread: 1.3, glyph: true,
  },

  /**
   * 界徐盛 · 破军 — when your 杀 names a target, stand up to X of their cards
   * face down beside their general card until end of turn.
   *
   * 江东的铁壁. In 224 he had a wall of reeds and painted boards built along
   * hundreds of li of the Yangtze in one night, and 曹丕 came down the river,
   * looked at it, said 魏虽有武骑千群，无所用之, and went home. The skill takes
   * a man's cards and stands them up in a row where he can see them and cannot
   * touch them — so the figure is that wall, built out of what belongs to the
   * enemy, and 0.62 spread because none of it goes anywhere.
   */
  m_ex__pojun: {
    figure: 'pillars', swarm: 'card', flight: 'fall', ground: 'dim',
    hue: 'silver', hue2: 'indigo', stance: 'brace', tempo: 'toll', n: 8, spread: 0.62, glyph: true,
  },

  /**
   * 界颜良文丑 · 双雄 — reveal two, keep one, and the rest of the turn cards of
   * the OTHER colour may be played as 决斗.
   *
   * 虎狼兄弟. 袁绍's two best, killed four months apart in the same campaign, at
   * 白马 and 延津. One card, two men, and the mechanic is a colour split — so
   * the figure is the two panels themselves, one in blood and one in ink, and
   * `hue2` is doing the work it exists for.
   */
  m_ex__shuangxiong: {
    figure: 'gate', swarm: 'blade', flight: 'out', ground: 'wash',
    hue: 'blood', hue2: 'ink', stance: 'lunge', tempo: 'quick', n: 6, spread: 1.2, glyph: true,
  },

  /**
   * 界袁术 · 仲家帝 — he had the seal, so in 197 he declared himself emperor of
   * 仲家 on the strength of a prophecy and a piece of jade, and two years later,
   * beaten and down to thirty 斛 of wheat husks in high summer, he asked for
   * honey water, was told there was none, sat on the edge of his couch and said
   * 袁术至于此乎, and coughed up a pint of blood and died.
   */

  /**
   * 庸肆 — 锁定技. Draw one per kingdom in play; then discard one at the end or
   * lose 1 hp.
   *
   * 庸 mediocre, 肆 unrestrained: everything comes in and none of it does him any
   * good. A net drags a whole table's worth of cards inward, the portrait
   * swells, and the amber turns sulphurous at the edge — the honey and the thing
   * that was actually in the cup.
   */
  m_ex__yongsi: {
    figure: 'net', swarm: 'card', flight: 'in', ground: 'wash',
    hue: 'amber', hue2: 'sulphur', stance: 'swell', tempo: 'even', n: 16, spread: 1.3, glyph: true,
  },

  /**
   * 觊玺 — 觉醒技. Three of your own turns without losing hp: +1 max hp, heal,
   * and then either 〖妄尊〗 or the lord's own lord-skill.
   *
   * 觊 is to covet and 玺 is the imperial seal — the actual object, fished out
   * of a well at 洛阳 and traded to him for troops. So the shaft of heaven's
   * attention stands on the seat and the seal turns up into it on the slow
   * count, gold over that particular violet dark: the mandate, and what was
   * actually holding it.
   */
  jixiy: {
    figure: 'column', swarm: 'rune', flight: 'rise', ground: 'rays',
    hue: 'gold', hue2: 'void', stance: 'lift', tempo: 'toll', n: 8, glyph: true,
  },

  /**
   * 界于吉 · 蛊惑 — put a card face down as any basic or trick; the others may
   * call it, and if they call it right it is void.
   *
   * 太平道人, whom 孙策 had executed for drawing crowds, and who is supposed to
   * have been standing in the mirror afterwards. This is the pack's one openly
   * occult skill and it gets the seal: two counter-turning rings closing inward
   * through incense, violet with something sulphurous underneath, slow enough
   * that everyone has time to decide whether to believe it.
   */
  m_ex__guhuo: {
    figure: 'sigil', swarm: 'plume', flight: 'curl', ground: 'smoke',
    hue: 'violet', hue2: 'sulphur', stance: 'still', tempo: 'slow', n: 10, spread: 0.8, glyph: true,
  },

  /**
   * 界于禁 · 节钺 — at end phase, give a player a card; they then either keep one
   * hand card and one equip and discard everything else, or let you draw three.
   *
   * 讨暴坚垒. 假节钺 is the authority to execute without asking first, and he
   * used it on 昌豨, an old friend who had surrendered to him personally, because
   * the law said those who surrender after being surrounded die — 奉法行令，事上
   * 之节也 — and he wept while he did it. The 钺 is a heavy curved axe: it is
   * held out at one man with the written order going with it, and it does not
   * hurry and it does not move.
   */
  m_ex__jieyue: {
    figure: 'crescent', swarm: 'slip', flight: 'out', ground: 'dim',
    hue: 'ink', hue2: 'bronze', stance: 'still', tempo: 'toll', n: 7, turn: 16, spread: 1.3, glyph: true,
  },

  /**
   * 界钟会 · 桀骜的野心家 — son of the calligrapher 钟繇; took 蜀 in 263, wrote
   * the letter that destroyed 邓艾, and was dead inside three months of trying
   * to keep the country for himself.
   */

  /**
   * 权计 — draw, then put a hand card on your general card as “权”; your hand
   * limit rises with the pile.
   *
   * 权 is leverage. Cards curl inward and are kept — spread 0.62, nothing is
   * spent, everything is banked — while the room darkens at the corners and the
   * portrait quietly swells. This is accumulation, and accumulation should look
   * like it is going somewhere unpleasant.
   */
  m_ex__quanji: {
    figure: 'orb', swarm: 'card', flight: 'curl', ground: 'vignette',
    hue: 'void', hue2: 'silver', stance: 'swell', tempo: 'even', n: 8, spread: 0.62, glyph: true,
  },

  /**
   * 自立 — 觉醒技 at three 权: heal or draw, lose a point of max hp, gain 排异.
   *
   * To set yourself up as your own authority. In 成都 he produced a forged
   * edict from the empress dowager ordering him to raise an army against 司马昭,
   * read it out, and locked the officers who would not sign it in the government
   * offices. A standard unrolls in a dark room with a seal rising off it —
   * violet under gold, a decree that nobody issued.
   */
  m_ex__zili: {
    figure: 'banner', swarm: 'rune', flight: 'rise', ground: 'dim',
    hue: 'violet', hue2: 'gold', stance: 'lift', tempo: 'toll', n: 6, glyph: true,
  },

  /**
   * 界周仓 · 忠勇 — after your 杀 resolves, take it back if nothing answered it;
   * otherwise take the 闪 and hand the 杀 to somebody else, or hand the 闪 on
   * and hit harder next time.
   *
   * 披肝沥胆. He is the man who carries 关羽's blade for him and cuts his own
   * throat on the wall when he sees his head. The skill is a weapon that comes
   * back to his hand and goes out again in another man's — the only `recoil` in
   * the pack that is a handoff rather than a counterattack — swept in blood with
   * his master's green on the edge of it.
   */
  m_ex__zhongyong: {
    figure: 'sweep', swarm: 'blade', flight: 'recoil', ground: 'shade',
    hue: 'blood', hue2: 'pine', stance: 'brace', tempo: 'even', n: 8, turn: -14, spread: 1.3, glyph: true,
  },

  /**
   * 界周妃 · 舫玉游鸾 — 周瑜's daughter, married to 孙权's heir 孙登, in a
   * generation where every marriage in 吴 was a placement.
   */

  /**
   * 良姻 — cards going onto a general card pay someone a draw, cards coming off
   * one cost someone a card, and at round end the one person always chosen heals
   * while the one person never chosen bleeds.
   *
   * A good match, and the last clause is the cruelty in it: to be the only one
   * included, or the only one left out. A balance beam with peach in one pan and
   * orchid in the other, blossom going out across the table, and nothing hurried.
   */
  m_ex__liangyin: {
    figure: 'scale', swarm: 'petal', flight: 'out', ground: 'bloom',
    hue: 'peach', hue2: 'orchid', stance: 'still', tempo: 'slow', n: 10, spread: 1.3, glyph: true,
  },

  /**
   * 箜声 — set any number of the turn player's cards on their general card; at
   * their end phase you play one and they get the rest back.
   *
   * 箜篌, the vertical harp — the instrument, not a metaphor. So the figure is
   * the strings themselves, standing in a rank, with the notes coming off them
   * and lifting; 0.75 spread keeps the sound in the room it is being played in.
   * Quiet, slow, and the only thing in her pair that does not touch anyone.
   */
  m_ex__kongsheng: {
    figure: 'pillars', swarm: 'bead', flight: 'rise', ground: 'bloom',
    hue: 'moon', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 10, spread: 0.75, glyph: true,
  },

  /**
   * 界朱然 · 胆守 — at another's end phase, draw if they never pointed anything
   * at you; otherwise pay X cards and hurt them for it.
   *
   * 不动之督. In 223 he held 江陵 for six months against 曹真 and 夏侯尚 with
   * five thousand men and half of them sick, and the state that had been besieging
   * him came out of it frightened of him. The guard hexagon draws itself shut,
   * the cold creeps in from the edges, he braces — and then it all comes back out
   * along the line it came in on. `recoil` is the two-beat answer, and he is the
   * second beat.
   */
  m_ex__danshou: {
    figure: 'aegis', swarm: 'shard', flight: 'recoil', ground: 'vignette',
    hue: 'frost', hue2: 'cinnabar', stance: 'brace', tempo: 'toll', n: 9, spread: 1.25, glyph: true,
  },

  /**
   * 界朱治 · 安国 — mark another player at game start; while the mark is out
   * there, lethal damage to you is prevented; when the marked player is dying,
   * they come back to 1 and you cut yourself down to 1 to pay for it.
   *
   * 功崇信重. He served 孙坚, then 孙策, and when 孙策 died it was 朱治 who put
   * the eighteen-year-old 孙权 in the seat and stood behind it. (界朱然, above,
   * was his adopted son.) So this is the standard set's 护驾 turned inside out:
   * the same guard hexagon, but drawn OUTWARD at 1.4 onto somebody else's seat,
   * while the portrait sinks. The shield is never over him.
   */
  m_ex__anguo: {
    figure: 'aegis', swarm: 'rune', flight: 'out', ground: 'bloom',
    hue: 'jade', hue2: 'gold', stance: 'sink', tempo: 'slow', n: 6, spread: 1.4, glyph: true,
  },

  /* --------------------------- 诸葛四友, and the minister ----------------- */

  /**
   * 友崔钧 · 日奋金丝 — 崔州平, who studied with 诸葛亮 at 隆中 and declined to
   * come down off the mountain for anybody. His father 崔烈 bought the office of
   * 司徒 for five million cash and asked his son what people were saying about
   * it; 崔钧 told him to his face: 论者嫌其铜臭 — they say you stink of copper.
   */

  /**
   * 顺逸 — using your uniquely lowest card, if it is ♥ and high enough, tuck
   * every card of that suit under your general card until end of turn and draw.
   *
   * 顺天者逸，逆天者劳 — go with heaven and be at ease, go against it and toil.
   * That is 崔州平's speech to 刘备 on the road, on the cycle of order and chaos,
   * and his reason for not helping. NO FIGURE: falling snow is the whole
   * picture, and the hearts he puts away are the only warm colour in it.
   */
  shunyi: {
    figure: 'none', swarm: 'snow', flight: 'fall', ground: 'frost',
    hue: 'frost', hue2: 'rouge', stance: 'still', tempo: 'slow', n: 16, spread: 0.8, glyph: true,
  },

  /**
   * 鄙位 — discard your uniquely highest card and make someone discard every
   * card that ranks at or above it.
   *
   * 鄙位 is the humble word for one's own office, and the joke is his father's
   * bought one. A balance tips and the coins fall off it — the pack's only
   * `coin` swarm, and the only place for it — in bronze going to verdigris,
   * which is the palette's word for corroded metal and this file's word for
   * 铜臭. He bows as he says it.
   */
  biwei: {
    figure: 'scale', swarm: 'coin', flight: 'fall', ground: 'dim',
    hue: 'bronze', hue2: 'verdigris', stance: 'bow', tempo: 'toll', n: 9, spread: 1.3, glyph: true,
  },

  /**
   * 共砺 (崔钧) — 锁定技. At game start, 〖顺逸〗 gains one more usable suit per
   * 友 general on the table.
   *
   * 砺 is a whetstone: 相互砥砺, the four of them sharpening each other at 隆中.
   * The two 共砺 cards in this pack are one skill written twice, so they are one
   * motif written twice — the doubled frame, the same sparks off the same stone,
   * and the colours put back the other way round. His adds, so his sparks leave.
   */
  cuijun__gongli: {
    figure: 'mirror', swarm: 'spark', flight: 'out', ground: 'none',
    hue: 'silver', hue2: 'jade', stance: 'still', tempo: 'even', n: 8, turn: 12, glyph: true,
  },

  /**
   * 友石韬 · 月堕窠臼 — 石广元, who studied with the same three men. 诸葛亮 told
   * them they could rise to inspector or governor; they asked how far he would
   * go and he only smiled. 石韬 became a commandery administrator in 魏, and
   * 诸葛亮, hearing it on campaign, said 魏殊多士邪！何彼二人不见用乎 — has 魏 so
   * many talents that it can leave those two where they are?
   */

  /**
   * 钦英 — recast any number of cards to use a 决斗, and during it either side
   * may discard from their region, X times, as a 杀.
   *
   * 钦 is to look up to somebody, and the skill is a duel that both men keep
   * feeding. A taut line between two seats with blades running along it in both
   * directions — moon-cold at his end, red at the other — and he does not move
   * while it happens.
   */
  qinying: {
    figure: 'chain', swarm: 'blade', flight: 'across', ground: 'shade',
    hue: 'moon', hue2: 'cinnabar', stance: 'still', tempo: 'even', n: 10, turn: 4, spread: 1.35, glyph: true,
  },

  /**
   * 论雄 — after dealing or taking damage, discard your uniquely highest card to
   * draw three; every later use must beat the last one.
   *
   * A bar that only ever goes up, which is 月堕窠臼: the man who was told what
   * his ceiling was and reached it. Posts standing up one after another in
   * sequence with the light climbing past them into a dark room — the rank order
   * is the mechanic, and the room is where 诸葛亮's smile left him.
   */
  lunxiong: {
    figure: 'pillars', swarm: 'glint', flight: 'rise', ground: 'dim',
    hue: 'bronze', hue2: 'moon', stance: 'lift', tempo: 'toll', n: 9, spread: 0.8, glyph: true,
  },

  /**
   * 共砺 (石韬) — 锁定技. At game start, 〖钦英〗 loses one usable card type per
   * 友 general on the table.
   *
   * The other face of 崔钧's card, and drawn as its reflection: the same stone,
   * the same sparks, jade and silver swapped over, and the flight reversed. His
   * version takes away — so the sparks come IN. The two of them only make sense
   * on the table together, which is the point of the name.
   */
  shitao__gongli: {
    figure: 'mirror', swarm: 'spark', flight: 'in', ground: 'none',
    hue: 'jade', hue2: 'silver', stance: 'still', tempo: 'even', n: 8, turn: -12, glyph: true,
  },

  /**
   * 起王允 · 居功自矜 — he ran the 连环计, got 董卓 killed in the palace gate,
   * and then would not amnesty 董卓's Liangzhou soldiers, executed 蔡邕 for
   * sighing over the body, and refused everyone's advice for two months until
   * 李傕 and 郭汜 came back and killed him on the tower.
   */

  /**
   * 赦论 — once a phase, name up to two players in your reach; everyone holding
   * no more cards than you deliberates, and the table's colour decides whether
   * the two are stripped or wounded.
   *
   * The amnesty debate — 吕布 asked him repeatedly to pardon the Liangzhou men
   * and he would not. The question goes round the table as tallies at 1.38, on
   * the toll count of a formal proceeding, in a darkened room, and comes back
   * red. The verdict was decided before it was put.
   */
  m_js__shelun: {
    figure: 'rings', swarm: 'rune', flight: 'orbit', ground: 'dim',
    hue: 'ink', hue2: 'blood', stance: 'still', tempo: 'toll', n: 12, spread: 1.38, glyph: true,
  },

  /**
   * 伐异 — after any deliberation, damage up to two players whose opinion
   * differed from yours.
   *
   * 党同伐异 — stand with those who agree and strike those who do not, which is
   * how a man who has just saved the dynasty loses it in ninety days. Two
   * calligraphic strokes cross the frame in blood over ink: a name struck
   * through, and then the other name. 蔡邕 only sighed.
   */
  m_js__fayi: {
    figure: 'strokes', swarm: 'blade', flight: 'across', ground: 'shade',
    hue: 'blood', hue2: 'ink', stance: 'lunge', tempo: 'quick', n: 8, turn: -12, spread: 1.36, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 曹性 — 吕布's archer under 高顺. At Xiapi he put an arrow through 夏侯惇's
   * left eye, and 夏侯惇 pulled it out with the eye still on it and ate it. The
   * whole man is one bowshot, so the two skills split it: the sighting, and
   * the release.
   */

  /**
   * 劲镞 — reveal one card against another player's two; hold the MIDDLE value
   * and your next 杀 on them is +1 and unanswerable, hold an extreme and every
   * revealed card is thrown away.
   *
   * 镞 is the arrowhead alone. The skill is not the shot, it is the ranging
   * before it: three cards hang in the air being weighed against each other,
   * and a beam settles on the middle one. The `toll` rhythm is an archer taking
   * his time. His hue2 is the eye he found.
   */
  jinzu: {
    figure: 'scale', swarm: 'card', flight: 'hover', ground: 'dim',
    hue: 'silver', hue2: 'blood', stance: 'brace', tempo: 'toll', n: 6, spread: 0.7, glyph: true,
  },

  /**
   * 暗弦 — the first time you discard each turn, take a 杀 back out of the
   * discard and fire it free, at any range.
   *
   * The dark string: the shot that comes out of what you had already thrown
   * away. A bowstring drawn taut across an unlit frame and one arrow leaving
   * along it — a single line, no scatter, into the next seat's air.
   */
  anxianc: {
    figure: 'chain', swarm: 'arrow', flight: 'jet', ground: 'dim',
    hue: 'void', hue2: 'bone', stance: 'still', tempo: 'quick', n: 5, turn: 16, spread: 1.25, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 曹植 — the poet, here in his charioteer aspect, built around the treasure
   * card 【六龙骖驾】. Two facts run the pair: drunk one night he drove out
   * through the 司马门, the gate reserved for the emperor's carriage, which is
   * the single act that cost him the succession; and 羲和 drives the sun across
   * the sky behind six dragons.
   */

  /**
   * 冲司 — name another player and an option; they must then take one too.
   * Someone uses a 杀, or discards two, or damages himself.
   *
   * 冲司马门. Two panels blown apart and a chariot's dust going straight
   * through the gap on one heading — and because the skill makes a second man
   * choose as well, the gate's two halves are two colours: the lacquer and the
   * imperial gold he had no business passing.
   */
  chongsi: {
    figure: 'gate', swarm: 'dust', flight: 'across', ground: 'shade',
    hue: 'ink', hue2: 'gold', stance: 'lunge', tempo: 'quick', n: 14, turn: -6, spread: 1.2, glyph: true,
  },

  /**
   * 辔东 — move 【六龙骖驾】 four different ways and it counts as a 杀, a 闪,
   * a 桃 or an 酒 depending on where it goes.
   *
   * 辔 is the rein. One card turning into four different cards is the same
   * team driven four different ways, so: six dragons coiling round the seat
   * with the traces streaming off them, and the sun behind.
   */
  peidong: {
    figure: 'coil', swarm: 'ribbon', flight: 'orbit', ground: 'rays',
    hue: 'gold', hue2: 'azure', stance: 'turn', tempo: 'even', n: 12, spread: 1.1, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 刘徽 — the mathematician of Wei, who annotated the 九章算术 and invented
   * 割圆术, cutting a circle with inscribed polygons of ever more sides until
   * the gap closed. His two works are his two skills.
   */

  /**
   * 割圆 — using a card whose point matches the next digit of π, draw and
   * advance to the digit after.
   *
   * Nested rings leaving one after another is the method itself: each polygon
   * closer to the circle than the last, and never touching it. The count is
   * 14, for 徽率 3.14 — the value he got and the one the world used for the
   * next two hundred years.
   */
  mobile__geyuan: {
    figure: 'rings', swarm: 'rune', flight: 'orbit', ground: 'none',
    hue: 'celadon', hue2: 'bone', stance: 'still', tempo: 'slow', n: 14, spread: 0.95, glyph: true,
  },

  /**
   * 重差 — cards of 10 or more escape your hand limit and count as zero in
   * 割圆; discard once a phase to advance the digit.
   *
   * 重差 is the lost title of the 海岛算经: two poles of known height, planted
   * apart, sighting an island nobody can reach, and the difference between the
   * two sightings gives you its height. Two gnomons, counting rods hanging
   * still between them, and haze where the answer is.
   */
  chongcha: {
    figure: 'pillars', swarm: 'slip', flight: 'hover', ground: 'smoke',
    hue: 'ink', hue2: 'frost', stance: 'still', tempo: 'even', n: 8, spread: 1.15, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 卢毓 — 卢植's son, Wei's 吏部尚书 and briefly its chief justice. He drafted
   * the 考课法, and when 明帝 asked him about selecting men he said reputation
   * is no way to find an extraordinary man, only an ordinary one.
   */

  /**
   * 禀法 — each round you name two statutes, every face-up player votes, and
   * at the round's end the winner is enforced.
   *
   * A promulgated edict, and the votes coming back in to it as filed slips.
   * `toll` because a round is a long time to wait for a law to take effect,
   * and it takes effect whether anybody liked it or not.
   */
  bingfa: {
    figure: 'banner', swarm: 'slip', flight: 'in', ground: 'dim',
    hue: 'bronze', hue2: 'celadon', stance: 'still', tempo: 'toll', n: 10, glyph: true,
  },

  /**
   * 束刑 — void a 杀 aimed at someone else, then reveal their whole hand; any
   * 闪 in it costs them a hit point or the 闪 themselves and their vote.
   *
   * The personnel minister's actual job: open a man and look at what is really
   * in him rather than at what he is said to hold. So a lens opens over the
   * seat, the hand is drawn into it, and nothing gets out — 束 is a binding,
   * and the spread is short enough that nothing leaves the portrait.
   */
  shuxing: {
    figure: 'eye', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'ink', hue2: 'silver', stance: 'still', tempo: 'even', n: 8, spread: 0.6, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 张芝 · 势举 — 锁定技. Match the previous card's type and you draw off the
   * top; match its suit and you draw off the bottom; match the name too and
   * you gain or upgrade 〖枯白〗.
   *
   * 草圣. He practised at the edge of a pond until the water in it was ink, and
   * he invented 今草, the running cursive where the brush does not leave the
   * paper between characters — 一笔书, which is exactly a skill that pays you
   * for what the last card was. Ink thrown off a driven stroke, with 枯白 in
   * the second colour: the dry white the bristles leave when the brush runs out
   * halfway through.
   */
  mobile__shiju: {
    figure: 'strokes', swarm: 'drop', flight: 'arc', ground: 'wash',
    hue: 'ink', hue2: 'bone', stance: 'lunge', tempo: 'quick', n: 12, turn: -24, spread: 1.15, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 周瑜, the musician rather than the admiral. 曲有误，周郎顾 — three cups in
   * and he would still turn his head at a wrong note. The lead's 英姿 gave him
   * azure and the feather fan; these two keep the colour and take the qin.
   */

  /**
   * 授乐 — draw, and hand somebody the skill 〖琴音〗; or set a flipped
   * character card upright again.
   *
   * The strings are the figure — the vocabulary named `pillars` for a zither
   * before it named it for a spear wall — and the notes go OUT, past the frame,
   * into the seat he is teaching. He inclines his head as they leave.
   */
  shouyuez: {
    figure: 'pillars', swarm: 'bead', flight: 'out', ground: 'ripple',
    hue: 'jade', hue2: 'dawn', stance: 'bow', tempo: 'slow', n: 10, spread: 1.25, glyph: true,
  },

  /**
   * 叠音 — flip yourself face down, name a phase, and take that phase again
   * after the current one.
   *
   * A doubled note. The frame is doubled and offset against itself, the beat
   * goes out and comes back on the second stroke, and the copy is in the colour
   * of a card lying face down. `turn` is literal here: he turns over.
   */
  dieyin: {
    figure: 'mirror', swarm: 'bubble', flight: 'recoil', ground: 'dim',
    hue: 'azure', hue2: 'ink', stance: 'turn', tempo: 'toll', n: 7, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 毌丘俭 — 幽州刺史, who burned 丸都 and cut a record of it into a stone that
   * was dug up again in 1906. Then he raised the first Huainan rebellion
   * against Sima Shi, his army melted away at 项, and a commoner shot him in
   * the weeds.
   */

  /**
   * 摧阵 — wreck up to three players' weapon slots at the start of the game,
   * wreck more in your play phase, and draw for every slot wrecked.
   *
   * Shattering the line. A steel wedge into one side and the armouries coming
   * apart as bronze splinters — thrown wide on purpose, because this is the one
   * skill in the pack that reaches three seats before the first turn is played.
   */
  cuizhen: {
    figure: 'wedge', swarm: 'shard', flight: 'out', ground: 'shade',
    hue: 'bronze', hue2: 'ash', stance: 'lunge', tempo: 'quick', n: 14, turn: -12, spread: 1.3, glyph: true,
  },

  /**
   * 溃离 — 锁定技. When you are hurt, you REPAIR the weapon slot of whoever
   * hurt you.
   *
   * 溃 is what a dyke does and what his army did: not a defeat, a dissolution.
   * So there is no figure at all — the thing he built comes apart and the
   * pieces go back out to the people he took them from, and the portrait sags.
   * The one motif here with nothing standing in the middle of it.
   */
  kuili: {
    figure: 'none', swarm: 'shard', flight: 'out', ground: 'dim',
    hue: 'ash', hue2: 'bronze', stance: 'wilt', tempo: 'even', n: 16, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 关羽兔 · 义 — up to two players each hand you a card; then either strike
   * one of them with the bundle, or deal the cards out to everyone they missed.
   *
   * The rabbit-year cards give their generals a single character instead of a
   * skill name, and for 关羽 the character is the whole man. 挂印封金: Cao Cao
   * gave him titles, gold and a horse, and when the news came about Liu Bei he
   * hung the seal on the wall, left every gift sealed where it stood, and rode
   * out. So the sweep is a blade in his green, and what it throws off is the
   * money going back.
   */
  mobile__natu_yi: {
    figure: 'sweep', swarm: 'coin', flight: 'recoil', ground: 'rays',
    hue: 'pine', hue2: 'gold', stance: 'bow', tempo: 'toll', n: 10, turn: -18, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 袁术, honey edition. Besieged, ruined, in June, he asked for honey water,
   * and the cook told him there was no honey, only blood water. 袁术至于此乎 —
   * "has it come to this for me" — and he vomited blood and died sitting up.
   */

  /**
   * 集蜜 — 锁定技. At the start of the game every hand in the game becomes 桃
   * and 酒; every 桃 or 酒 that reaches the discard without being used hands
   * you a damage card.
   *
   * A core swelling on honey drawn in off the whole table, in amber, and what
   * the core is actually full of is in the second colour. The reach is
   * deliberate: this skill rewrites everyone's hand, so its air is everyone's.
   */
  jimi: {
    figure: 'orb', swarm: 'drop', flight: 'in', ground: 'wash',
    hue: 'amber', hue2: 'blood', stance: 'still', tempo: 'slow', n: 14, spread: 1.35, glyph: true,
  },

  /**
   * 冒迭 — 锁定技. Once you have drawn blood, every damage card you play must
   * have a LONGER name than the last one.
   *
   * A rule that forces you to escalate until you cannot continue is the man's
   * biography written as a mechanic: he had the imperial seal, so he declared
   * himself emperor, and there was nowhere above that to go. An arc opening
   * over the head, seals rising into it, and the gold going sulphurous — the
   * one palette in the file that is a colour rotting.
   */
  maodiey: {
    figure: 'halo', swarm: 'rune', flight: 'rise', ground: 'rays',
    hue: 'gold', hue2: 'sulphur', stance: 'lift', tempo: 'toll', n: 9, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 赵云兔 — 常山赵子龙, two single characters. The lead's 龙胆 built him out
   * of cold silver with 杀-red coming off it; these two split that pair in
   * half and give one colour to each.
   */

  /**
   * 烈 — after a basic card, trim your hand to a rising number, and if you
   * threw anything away, hit somebody for it.
   *
   * 烈 is a fire word. Blades opening off one pivot with the discarded cards
   * going out as hot lines: the cards he throws away ARE the damage, which is
   * the only skill in the pack where that is true.
   */
  mobile__natu_lie: {
    figure: 'fan', swarm: 'spark', flight: 'out', ground: 'bloom',
    hue: 'flame', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 12, turn: -14, glyph: true,
  },

  /**
   * 恒 — once a round, an empty half of your hand becomes the card you need: no
   * non-damage cards and you have a 闪, no damage cards and you have a 杀.
   *
   * 恒山 was renamed 常山 to avoid an emperor's given name, and 常山 is where he
   * is from — so 恒 is his own mountain under its older name. A hexagon closing
   * and holding, snow that does not travel, and a spread short enough that
   * nothing leaves the frame. Whatever you bring, it is already answered.
   */
  mobile__natu_heng: {
    figure: 'aegis', swarm: 'snow', flight: 'hover', ground: 'frost',
    hue: 'frost', hue2: 'silver', stance: 'brace', tempo: 'slow', n: 8, spread: 0.6, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 诸葛亮兔 — 兴复汉室，还于旧都, and 抚百姓，示仪轨. 陈寿's obituary of him is
   * a list of verbs, and the rabbit card took two of them.
   */

  /**
   * 兴 — you start holding one of every targeted trick card in the game, all of
   * them unusable, and unlock them one at a time by dealing damage.
   *
   * A hand fanned out that you are not allowed to play is the whole northern
   * campaign: everything prepared, nothing yet permitted. The cards hover
   * inside the frame rather than going anywhere, and the room is dark until
   * the last one is free.
   */
  mobile__natu_xing: {
    figure: 'fan', swarm: 'card', flight: 'hover', ground: 'dim',
    hue: 'gold', hue2: 'cinnabar', stance: 'still', tempo: 'toll', n: 13, spread: 0.65, glyph: true,
  },

  /**
   * 抚 — after a trick card: heal whoever is lowest, or burn somebody for 1
   * fire damage if you are the only person who has ever played that card.
   *
   * A hand laid over the country. A veil comes down across the seat with
   * blossom falling through it — and the fire is in the second colour only,
   * because in this skill the burning is the smaller half of the same gesture.
   */
  mobile__natu_fu: {
    figure: 'veil', swarm: 'petal', flight: 'fall', ground: 'bloom',
    hue: 'jade', hue2: 'flame', stance: 'still', tempo: 'slow', n: 11, spread: 1.2, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 陈兰 · 据峻 — 锁定技. End a phase in which you were targeted and your hit
   * points moved, and you loose a 万箭齐发 at the table.
   *
   * 陈兰 and 梅成 took to 灊山 and held the heights, and it took 张辽 climbing
   * the cliff to end it — 贼以为神, the rebels thought he was not a man. A crag
   * standing on the seat and the volley going off it in every direction, at the
   * widest reach in the file, because 万箭齐发 hits everybody.
   */
  mobile__jujun: {
    figure: 'column', swarm: 'arrow', flight: 'out', ground: 'shade',
    hue: 'pine', hue2: 'bone', stance: 'brace', tempo: 'toll', n: 20, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 高顺 — 吕布's best officer and commander of the 陷陈营, seven hundred men
   * who never failed to break a line. He remonstrated with Lü Bu constantly and
   * was ignored every time; taken at Xiapi he would not answer a single
   * question, and was executed without having said anything.
   */

  /**
   * 激刃 — 限定技. For the rest of the game, nobody may target THEMSELVES with
   * anything that is not a weapon.
   *
   * A once-ever law that turns every blade in the room outward, forever. One
   * hard ring leaving the seat into everyone's air with the room put out behind
   * it, on the slowest rhythm — the effect is not a swing, it is a ruling.
   */
  jiren: {
    figure: 'ring', swarm: 'blade', flight: 'out', ground: 'dim',
    hue: 'silver', hue2: 'ink', stance: 'brace', tempo: 'toll', n: 14, spread: 1.4, glyph: true,
  },

  /**
   * 决止 — one of each per phase: draw, 决斗, and throw away every non-damage
   * card; or draw, heal, and throw away every damage card.
   *
   * 决 is the duel and 止 is the halt, and the skill is the two of them as a
   * pair of doors — one opens onto a fight and empties you of everything
   * peaceful, the other closes and empties you of everything sharp. The two
   * panels are two colours because that is what the choice is.
   */
  juezhig: {
    figure: 'gate', swarm: 'blade', flight: 'recoil', ground: 'shade',
    hue: 'blood', hue2: 'jade', stance: 'brace', tempo: 'even', n: 9, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 关羽, 缘 edition — the same 青龙偃月刀 as the lead's 武圣, so it keeps the
   * crescent, and everything else about it is different.
   */

  /**
   * 武圣 — any NUMBER of cards becomes one 杀 at any range, and the first time
   * each turn you fold that many, you draw two and it costs you nothing.
   *
   * The lead's version is the blade swung. This one is the blade being made:
   * the cards wind inward and become the crescent, rather than flying off it.
   * His red is the body here and the dragon's green is the edge — the reverse
   * of the standard card, on purpose, so the two read as the same weapon in two
   * hands.
   */
  m_yuan__wusheng: {
    figure: 'crescent', swarm: 'card', flight: 'curl', ground: 'rays',
    hue: 'cinnabar', hue2: 'pine', stance: 'lunge', tempo: 'quick', n: 8, turn: -28, glyph: true,
  },

  /**
   * 义绝 — 锁定技. On dealing a killing blow: either lock them out of the turn
   * and burn your matching suits, or PREVENT the damage and put you and them
   * out of each other's reach for the round.
   *
   * The second option is 华容道 written out as a rule. He had Cao Cao dead in
   * front of him on the mud road and let him ride through, and neither of them
   * could touch the other afterwards. So: the blade does not fall, the fog
   * holds, and a hexagon seals shut between two people who are now barred from
   * each other. Nothing in this motif moves quickly and nothing in it lands.
   */
  m_yuan__yijue: {
    figure: 'aegis', swarm: 'plume', flight: 'across', ground: 'smoke',
    hue: 'pine', hue2: 'ash', stance: 'still', tempo: 'slow', n: 10, spread: 1.2, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 吕布, 缘 edition. The lead's 无双 took the whole room with `dim` and one
   * crescent on a toll; these two are the same weight applied to the table
   * instead of to one man.
   */

  /**
   * 掠阵 — at the start of your play phase every other player must, in turn,
   * either reveal a growing number of cards or eat a free 杀.
   *
   * 依次 is the word that decides this: it goes round the table one seat at a
   * time. Nested rings leaving on staggered delays, the demanded cards coming
   * back in out of everyone's air, and the room dark for it.
   */
  luezhen: {
    figure: 'rings', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'blood', hue2: 'bone', stance: 'brace', tempo: 'toll', n: 12, spread: 1.4, glyph: true,
  },

  /**
   * 横威 — 锁定技. Hurt someone and they hand you a card or take one more; and
   * in your turn nobody may use a colour they have already shown you.
   *
   * 横 is literally "laid across", and that is the figure: a flat wave rolling
   * out over the table while the tribute comes in the other way. He does not
   * move for it. The colour is the one that cannot be seen into, with what it
   * costs in the second.
   */
  hengwei: {
    figure: 'wave', swarm: 'card', flight: 'in', ground: 'shade',
    hue: 'void', hue2: 'blood', stance: 'still', tempo: 'even', n: 10, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 梅成 · 壁险 — 锁定技. End a phase in which you were targeted and your hit
   * points did NOT move, and you loose a 决斗.
   *
   * 陈兰's twin, and the exact inverse: 据峻 fires when the wall was breached,
   * 壁险 fires when it held. 壁 is to entrench, 险 is the narrow place you
   * entrench in. So a grid locks across the frame and one lance goes out down
   * one line — a duel is one man, where the volley was everyone.
   */
  bixian: {
    figure: 'lattice', swarm: 'thorn', flight: 'jet', ground: 'shade',
    hue: 'ash', hue2: 'blood', stance: 'brace', tempo: 'even', n: 10, turn: -8, spread: 1.1, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 孙权, 缘 edition. The lead's 制衡 gave him verdigris, corroded bronze; both
   * of these keep faith with that in their own way.
   */

  /**
   * 势众 — 锁定技. Show your whole hand at the end phase; keep it all until
   * your next turn and your damage this turn becomes ONE HUNDRED THOUSAND.
   *
   * 孙十万. He took a hundred thousand men to Hefei and 张辽 came out at him
   * with eight hundred, and he has been called that ever since. The engine
   * caps a swarm at twenty-six, and this is the one motif in the file that
   * asks for all twenty-six: the count is the joke, so the count is the design.
   * Everything is shown, everything is thrown, and it reaches every seat.
   */
  shizhong: {
    figure: 'star', swarm: 'card', flight: 'out', ground: 'bloom',
    hue: 'azure', hue2: 'gold', stance: 'swell', tempo: 'toll', n: 26, spread: 1.35, glyph: true,
  },

  /**
   * 操微 — 锁定技. Hurt, you recast every card of at least one type and draw.
   *
   * 重铸 is the word for re-minting, and Wu's coinage is the thing Sun Quan is
   * least often forgiven for: 大泉五百, then 大泉当千, a coin worth a thousand
   * that nobody would take. So the arm turns and the money goes out and comes
   * back as different money, in the green of corroded bronze.
   */
  caowei: {
    figure: 'spiral', swarm: 'coin', flight: 'recoil', ground: 'ripple',
    hue: 'verdigris', hue2: 'frost', stance: 'reel', tempo: 'quick', n: 10, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 蹋顿 — the Wuhuan chieftain who sheltered the Yuan brothers and raided the
   * northern commanderies until 郭嘉 told Cao Cao to go through the dry marsh
   * road in autumn and 张辽 killed him at 白狼山.
   */

  /**
   * 游掠 — 锁定技. Gain a card in your turn and you draw another; lose one
   * outside your turn and you lose another.
   *
   * Roving plunder: it comes in while you are riding and it goes out while you
   * are not, and none of it ever settles anywhere. Loot circling the seat at a
   * fixed radius, in dust colours, and never landing.
   */
  youlve: {
    figure: 'coil', swarm: 'coin', flight: 'orbit', ground: 'smoke',
    hue: 'bone', hue2: 'amber', stance: 'still', tempo: 'even', n: 12, spread: 1.15, glyph: true,
  },

  /**
   * 连袭 — 杀 does not count against your hand limit, and a 杀 of yours that
   * reaches the discard comes straight back out as a free one.
   *
   * A raid that reloads itself out of its own wreckage. The steppe sabre is a
   * crescent, so it is the crescent here rather than the Green Dragon's, and
   * the arrows leave along one line into the next seat's air. Nothing about a
   * raid disperses.
   */
  lianxi: {
    figure: 'crescent', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'ember', hue2: 'bone', stance: 'lunge', tempo: 'quick', n: 14, turn: 20, spread: 1.25, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 檀石槐 — the Xianbei chieftain who unified the whole steppe into three
   * commands, raided the frontier every year for twenty, and turned down the
   * royal title the Han offered him to make it stop.
   */

  /**
   * 连斩 — after a 杀 at a single target, hit them again with a 杀 of a HIGHER
   * point, and draw.
   *
   * Links drawing taut, and every strike coming off them higher than the one
   * before — the flight is `rise` because the rule is not "again", it is
   * "again, and further". A zigzag is the only swarm shape that climbs.
   */
  lianzhant: {
    figure: 'chain', swarm: 'bolt', flight: 'rise', ground: 'shade',
    hue: 'cinnabar', hue2: 'bone', stance: 'lunge', tempo: 'quick', n: 12, turn: -12, glyph: true,
  },

  /**
   * 寇掠 — 锁定技. Anything that comes to your hand outside the draw phase is
   * free of your hand limit and counts as a 杀.
   *
   * Everything he takes is already a weapon. A net falls over the frame and
   * draws shut, and what it drags in out of the dark is edges — which is the
   * whole of the frontier's experience of him.
   */
  kouluet: {
    figure: 'net', swarm: 'blade', flight: 'in', ground: 'dim',
    hue: 'ash', hue2: 'cinnabar', stance: 'still', tempo: 'even', n: 15, spread: 1.3, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 曹髦 — the Wei emperor who said 司马昭之心，路人皆知 and then took a few
   * hundred palace servants out of the gate to do something about it, and was
   * run through in the street by 成济's spear at nineteen. He wrote the
   * 潜龙诗 first: 蟠居于井底，鳅鳝舞其前 — coiled at the bottom of a well, with
   * the loaches dancing in front of him.
   */

  /**
   * 潜龙 — 持恒技. You start on 20 道心 and climb by taking damage, dealing
   * damage and gaining cards; new skills unlock at 25, 50, 75 and 99. The cap
   * is 99.
   *
   * 潜龙勿用 — the submerged dragon: do not act. He acted. The dragon coils and
   * lifts, bubbles going up off it, the dark closing in from the corners the
   * way a well shaft does — and the spread is 0.55, which keeps every particle
   * inside the portrait. It rises the whole way and it never gets out, and the
   * ceiling is 99 rather than 100 for the same reason.
   */
  mobile__qianlong: {
    figure: 'coil', swarm: 'bubble', flight: 'rise', ground: 'vignette',
    hue: 'indigo', hue2: 'gold', stance: 'lift', tempo: 'slow', n: 13, spread: 0.55, glyph: true,
  },

  /**
   * 卫统 — 持恒技, 主公技. With other Wei still alive, 潜龙 starts you at 60
   * instead of 20.
   *
   * The throne only works if there is a state under it. The imperial seal turns
   * on the spot and the rolls of Wei come in to it out of the dark — he gains
   * nothing by his own act, which is the difference between this and every
   * other lord skill.
   */
  weitong: {
    figure: 'sigil', swarm: 'slip', flight: 'in', ground: 'rays',
    hue: 'gold', hue2: 'indigo', stance: 'brace', tempo: 'toll', n: 9, spread: 1.1, glyph: true,
  },

  /* ------------------------------------------- 曹髦, as 道心 buys them ----
   *
   * The four skills 潜龙 hands over at 25, 50, 75 and 99. None of them is on
   * his character card, so the roster-wide sweep never saw them — a general's
   * `skills` list is what he starts with — and all four fire under their own
   * names the moment the counter reaches them.
   *
   * They are also the arc: a clean magistrate, a drunk poet, a man exiling his
   * ministers, and a man driving a chariot at the person who has taken his
   * throne. So they are deliberately four different temperatures rather than
   * four shades of the well 潜龙 draws him at the bottom of.
   */

  /**
   * 清正 — 25 道心. Discard your hand cards of one suit, then look at somebody's
   * hand and discard a suit from it; if that came to less than yours, he takes
   * damage.
   *
   * 曹髦's own line for it: 朕虽不德，昧于大道，思与宇内共臻兹路. A young emperor
   * being scrupulous. A balance beam that tips and settles, cards falling out of
   * both pans, frost creeping in — it is an audit, and it is cold.
   */
  mobile_qianlong__qingzheng: {
    figure: 'scale', swarm: 'card', flight: 'fall', ground: 'frost',
    hue: 'frost', hue2: 'silver', stance: 'brace', tempo: 'toll', n: 10, glyph: true,
  },

  /**
   * 酒诗 — 50 道心. Turn your own character card face down; it counts as using
   * an 【酒】.
   *
   * 心愤无所表，下笔即成篇。弃忧但求醉，醒后寻复来. He wrote the 潜龙诗 and got
   * himself watched for it. The frame doubles and one copy turns over, which is
   * literally the rule, and what falls off it is amber.
   */
  mobile_qianlong__jiushi: {
    figure: 'mirror', swarm: 'drop', flight: 'fall', ground: 'smoke',
    hue: 'amber', hue2: 'plum', stance: 'turn', tempo: 'even', n: 9, glyph: true,
  },

  /**
   * 放逐 — 75 道心. Name somebody and put a restriction on them.
   *
   * 卿当竭命纳忠，何为此逾矩之举. The one skill of the four that reaches another
   * seat: two panels slide shut across the table at full spread and the decree
   * travels along the same heading. He does not move — an exile is signed, not
   * fought.
   */
  mobile_qianlong__fangzhu: {
    figure: 'gate', swarm: 'rune', flight: 'across', ground: 'shade',
    hue: 'indigo', hue2: 'ash', stance: 'still', tempo: 'slow', n: 8, spread: 1.4, glyph: true,
  },

  /**
   * 决进 — 99 道心, and the end of him. Every player drops to 1 hp and keeps the
   * difference as armour, and every 【桃】, 【酒】 and 【闪】 leaves the game.
   *
   * 朕安可坐受废辱，今日当与卿自出讨之. He came out of the palace on a chariot
   * with a drawn sword and 成济 ran him through in the street. A wedge going
   * out at everybody at once, in flame over gold, throwing cinders — the same
   * two colours as his cutscene, because they are the same moment and the scene
   * is this drawing at the size of the room.
   */
  juejin: {
    figure: 'wedge', swarm: 'cinder', flight: 'out', ground: 'rays',
    hue: 'flame', hue2: 'gold', stance: 'lunge', tempo: 'toll', n: 16, spread: 1.45, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 贾充 — the man in the street who turned to 成济 and said 公畜养汝等，正为
   * 今日, "the duke feeds you for exactly this day", and let somebody else put
   * the spear in. He then chaired the commission that wrote the 泰始律, the
   * shortest and best-drafted law code of the age.
   */

  /**
   * 悖逆 — name someone at your health or above; you or they draw two; and
   * whichever of you did NOT draw chooses to 杀 the other or take a card off
   * their field.
   *
   * A skill that pays one man to strike another while its owner stands still.
   * Threads across the seat, a blade going out along one of them into somebody
   * else's air, and the portrait does not move at all — he never held it.
   */
  mobile__beini: {
    figure: 'web', swarm: 'blade', flight: 'jet', ground: 'dim',
    hue: 'void', hue2: 'blood', stance: 'still', tempo: 'toll', n: 8, turn: 12, spread: 1.35, glyph: true,
  },

  /**
   * 定法 — at the end of the discard phase, if you have shed four cards or
   * more: heal, or strip two cards off somebody.
   *
   * 定法 is settling the code. The strokes are laid down and the statutes fall
   * into place under them, and the body colour is bronze because a law that is
   * meant to outlast you gets cast rather than written — the 刑鼎 the states
   * of Zheng and Jin put their codes on. Slow, short, nothing thrown.
   */
  mobile__dingfa: {
    figure: 'strokes', swarm: 'slip', flight: 'fall', ground: 'none',
    hue: 'bronze', hue2: 'ink', stance: 'still', tempo: 'slow', n: 10, spread: 0.7, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 嵇康 — 竹林七贤, executed at thirty-nine with three thousand students
   * petitioning for him. 山涛 said of him that he stood like a lone pine on a
   * cliff, which is where his title 峻峰孤松 comes from.
   */

  /**
   * 清弦 — name up to as many players as you have health, discard that many
   * cards, and each of them heals, bleeds or draws depending on how their
   * equipment compares to yours.
   *
   * One clear note, and every man in the room hears something different in it.
   * A single ring leaving the seat with the air rippling behind it, reaching
   * every seat at the table, in his own pine.
   */
  mobile__qingxian: {
    figure: 'ring', swarm: 'mote', flight: 'out', ground: 'ripple',
    hue: 'pine', hue2: 'frost', stance: 'still', tempo: 'even', n: 12, spread: 1.35, glyph: true,
  },

  /**
   * 绝响 — when you die, your killer loses all his equipment and a hit point,
   * and you may hand one other player 〖残韵〗, who can then inherit 〖绝响〗
   * itself.
   *
   * On the execution ground he looked at the shadow of the sun, saw he had time,
   * asked for his qin, played 广陵散 through, and said 广陵散于今绝矣 — the
   * Guangling melody ends today. It did not: the skill passes on.
   *
   * So the string breaks, the frame goes out, and exactly ONE particle leaves —
   * n: 1, the smallest swarm in the file — and it crosses out of the frame into
   * the next seat's air. That single bead is 残韵. The body colour is `dusk`
   * because the thing he checked first was how far the sun had gone.
   */
  mobile__juexiang: {
    figure: 'chain', swarm: 'bead', flight: 'across', ground: 'dim',
    hue: 'dusk', hue2: 'celadon', stance: 'wilt', tempo: 'toll', n: 1, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 司马孚 — Sima Yi's younger brother, who outlived all of it. He put 曹髦's
   * head in his lap in the street and wept 杀陛下者，臣之罪也; he held Cao Huan's
   * hand at the abdication and wept again; and to the end he insisted 臣死之
   * 日，固大魏之纯臣也 — on the day I die I am still a pure subject of Wei. His
   * title, 徒难夷惠, says he was neither 伯夷 nor 柳下惠 and it was all for
   * nothing.
   */

  /**
   * 蹒襄 — when anyone takes damage you may soften it by one and give the
   * source two cards, or add one and give them three — and never the same
   * option twice on the same person.
   *
   * 蹒 is a limp and 襄 is to assist. A beam that is forbidden by rule from
   * settling where it settled last time, so it swings back the other way every
   * time it is asked, and the man bows either way. Ash is the point: this is
   * help that changes nothing.
   */
  panxiang: {
    figure: 'scale', swarm: 'drop', flight: 'recoil', ground: 'shade',
    hue: 'ash', hue2: 'blood', stance: 'bow', tempo: 'toll', n: 8, glyph: true,
  },

  /**
   * 臣节 — 锁定技. When anybody you used 蹒襄 on dies, you throw away
   * everything you own and draw four.
   *
   * A subject's integrity, his own phrase. A white banner falls, the ash comes
   * down with it, and the portrait sinks — he went down in the road under the
   * emperor's body. The four cards afterwards are not in the picture, because
   * they were not the point to him either.
   */
  mobile__chenjie: {
    figure: 'banner', swarm: 'plume', flight: 'fall', ground: 'dim',
    hue: 'bone', hue2: 'ink', stance: 'sink', tempo: 'toll', n: 10, spread: 0.7, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 司马昭 — 司马昭之心，路人皆知, which is 曹髦's line about him and now the
   * ordinary Chinese for an open secret. Three skills, and they run in order:
   * the campaign behind the emperor, the bow that swallows, and the mask off.
   */

  /**
   * 挟征 — at the end phase, push a random card of somebody's onto the deck and
   * fire a 兵临城下 at them, preferring your own faction; bleed if it did
   * nothing.
   *
   * 挟天子以征. The siege lines close on one seat, the card is drawn up into
   * them, and the colour is the one you cannot see into with the emperor in
   * the second — because what is actually being carried in the baggage train
   * is the throne.
   */
  mobile__xiezheng: {
    figure: 'lattice', swarm: 'card', flight: 'in', ground: 'vignette',
    hue: 'void', hue2: 'gold', stance: 'still', tempo: 'toll', n: 12, spread: 1.2, glyph: true,
  },

  /**
   * 谦吞 — make somebody reveal part of their hand and 拼点 with only what they
   * revealed. Win and you take the revealed cards; lose and you take the ones
   * they hid.
   *
   * 谦 is to defer and 吞 is to swallow, and the skill is both at once: he
   * bows, the beam tips, and it tips his way whichever way it tips. Ash on the
   * outside and gold coming in — there was never a version of this he loses.
   */
  mobile__qiantun: {
    figure: 'gate', swarm: 'card', flight: 'in', ground: 'shade',
    hue: 'ash', hue2: 'gold', stance: 'bow', tempo: 'even', n: 8, spread: 1.1, glyph: true,
  },

  /**
   * 昭凶 — 限定技. Once you are wounded you may change your faction to 群,
   * gain 〖荡异〗, and stop preferring your own side in 挟征.
   *
   * The moment the passers-by were right about. His title is 独祅吞天, alone and
   * ominous, swallowing heaven — so it is an eclipse: the disc, the shadow
   * curling in over it, the gold going into the dark and staying there. He
   * turns over, once, and there is no second half to the animation.
   */
  mobile__zhaoxiong: {
    figure: 'moon', swarm: 'cinder', flight: 'curl', ground: 'dim',
    hue: 'gold', hue2: 'void', stance: 'turn', tempo: 'slow', n: 10, spread: 0.8, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 司马伷 — Sima Yi's son by a concubine, 琅邪王, mild enough that nobody in
   * that family ever needed to remove him. He led the eastern column against
   * Wu, and it was to him that 孙皓 sent the seal and surrendered. 恭温克己:
   * deferential, warm, self-restrained.
   */

  /**
   * 避锋 — cancel a basic or ordinary trick aimed at you; then bleed if nobody
   * else answered that card, or draw two if somebody did.
   *
   * Avoiding the edge. A veil the stroke passes clean through, silk going with
   * it on the same heading, and the portrait turning out of the line — there is
   * nothing solid anywhere in this motif to stop anything, which is the method.
   */
  bifeng: {
    figure: 'veil', swarm: 'plume', flight: 'across', ground: 'smoke',
    hue: 'moon', hue2: 'ash', stance: 'turn', tempo: 'quick', n: 9, turn: -20, spread: 1.1, glyph: true,
  },

  /**
   * 宿望 — every turn somebody aims at you and fails to hurt you, a card goes
   * face down on your character card as "宿望"; take them all in a draw phase
   * and somebody else draws two.
   *
   * Standing reputation, accrued one survived attempt at a time and then spent
   * on other people. An arc over the head with the beads coming in to it and
   * settling short — nothing here is thrown, and it takes the whole game.
   */
  suwang: {
    figure: 'halo', swarm: 'bead', flight: 'in', ground: 'bloom',
    hue: 'celadon', hue2: 'silver', stance: 'still', tempo: 'slow', n: 9, spread: 0.75, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 文钦 — 毌丘俭's partner in the first Huainan rebellion, then Wu, then back
   * for the third with 诸葛诞, who killed him inside the besieged city. His son
   * 文鸯 rode back through Sima Shi's cavalry six or seven times in one night
   * to cover the retreat and burst Sima Shi's bad eye out of its socket.
   */

  /**
   * 孛明 — at the start of the game, hand up to two players a random weapon
   * whose range matches the number of suits in their hand.
   *
   * 孛 is the broom star, the comet that means a house is going to fall. So the
   * long-axis burst is the comet on its slant, sulphurous rather than golden,
   * and what it drops on two other seats is edged. He armed two men at the
   * start and one of them was 文鸯.
   */
  beiming: {
    figure: 'star', swarm: 'blade', flight: 'out', ground: 'dim',
    hue: 'sulphur', hue2: 'silver', stance: 'still', tempo: 'slow', n: 6, turn: -30, spread: 1.3, glyph: true,
  },

  /**
   * 仇铓 — once a turn, on a single-target 杀 either way: +1 damage, or, if the
   * 杀 is dodged, take a card off anyone within one of you. 背水: bin both
   * weapons.
   *
   * 铓 is the edge of a blade and 仇 is the grudge on it. 背水 is 背水一战, the
   * river at your back, no line to fall back to — and the desperation clause
   * throws away his weapon and theirs at once. Two edges meeting and the sparks
   * off the strike, silver going to blood.
   */
  choumang: {
    figure: 'sweep', swarm: 'spark', flight: 'flare', ground: 'shade',
    hue: 'silver', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 14, turn: -34, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 向朗 — 马良's friend, dismissed by 诸葛亮 for knowing 马谡 had run from
   * 街亭 and saying nothing. He spent the twenty years after it on books:
   * 潜心典籍，孜孜不倦，年逾八十，犹手自校书 — past eighty and still collating
   * by hand, correcting errors, and he had the largest collection in Shu.
   */

  /**
   * 纳学 — skip your play phase; then discard any number, draw the same
   * number, and hand a card each to up to two other players.
   *
   * A man who gives up his turn in order to correct his library and lend it
   * out. Shelves of scroll-cases standing up in rank, the slips going out past
   * the frame to two other seats, and nothing struck in the whole animation.
   */
  naxue: {
    figure: 'pillars', swarm: 'slip', flight: 'out', ground: 'bloom',
    hue: 'celadon', hue2: 'amber', stance: 'still', tempo: 'slow', n: 12, spread: 1.2, glyph: true,
  },

  /**
   * 遗诫 — 锁定技. When you die, everyone at the table is set to the average of
   * everyone else's health.
   *
   * The admonition left to his son, and the only skill in the file that makes
   * the whole table equal. The vocabulary describes `wave` as a ground-wave
   * rolling outward and FLATTENING, which is precisely the verb: it goes out to
   * the last seat and levels what it reaches. He sinks as it leaves.
   */
  yijie: {
    figure: 'wave', swarm: 'slip', flight: 'out', ground: 'dim',
    hue: 'bone', hue2: 'celadon', stance: 'sink', tempo: 'toll', n: 10, spread: 1.4, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 薛综 — Wu's tutor to the heir and its best talker. When the Shu envoy 张奉
   * mocked 阚泽's name at a banquet, 薛综 stood up, took the graph 蜀 apart in
   * front of the room — 有犬为独，无犬为蜀，横目苟身，虫入其腹 — and then did
   * 汉 as well, and 张奉 had nothing.
   */

  /**
   * 复难 — when anybody answers a card of yours, you may take the card they
   * answered with. Upgraded, you also draw when your own reply goes unanswered.
   *
   * 难 is the technical word for a refutation and 复难 is the reply to it. The
   * frame doubled and reversed against itself with the argument coming back on
   * the two-beat: every answer you make him is an answer he now owns.
   */
  mobile__funan: {
    figure: 'mirror', swarm: 'card', flight: 'recoil', ground: 'none',
    hue: 'celadon', hue2: 'indigo', stance: 'still', tempo: 'quick', n: 8, glyph: true,
  },

  /**
   * 诫训 — at the end phase, name a suit, give somebody a large handful of
   * cards for it, and then make them discard a number that grows every time you
   * do this.
   *
   * Admonishment and instruction: he gives you a great deal and takes it back
   * with interest, and the interest compounds. Strokes laid across the seat and
   * the lesson going out to the next seat, on the counted rhythm — this is
   * teaching, and teaching is not fast.
   */
  mobile__jiexun: {
    figure: 'strokes', swarm: 'rune', flight: 'out', ground: 'wash',
    hue: 'indigo', hue2: 'bone', stance: 'still', tempo: 'toll', n: 11, turn: -12, spread: 1.25, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 袁术 again, this time the ordinary card: the man who had the seal and could
   * not stop himself, and who taxed Huainan into cannibalism holding it.
   */

  /**
   * 妄尊 — 锁定技. At the prepare phase of anyone with more health than you,
   * you draw — and more, and they lose hand limit, if they are the lord.
   *
   * 妄自尊大. A shaft of heaven's attention standing on a seat with no right to
   * it, and tribute coming in from everybody taller than him. Sulphur under
   * gold, the same pair his honey card wears, inverted: on that one the gold
   * was going bad, on this one it never was gold.
   */
  mobile__wangzun: {
    figure: 'column', swarm: 'coin', flight: 'in', ground: 'rays',
    hue: 'sulphur', hue2: 'gold', stance: 'swell', tempo: 'even', n: 10, spread: 1.3, glyph: true,
  },

  /**
   * 同疾 — when somebody else is targeted by a 杀 and you are in their range,
   * they may discard a card and hand the 杀 to you instead.
   *
   * 流离 turned inside out: instead of moving a stroke away from himself, he is
   * the seat everybody else's strokes get moved TO. Rings closing in from every
   * direction with the blades riding them, the corners going dark, and the
   * portrait taking it and setting itself again.
   */
  mobile__tongji: {
    figure: 'rings', swarm: 'blade', flight: 'in', ground: 'vignette',
    hue: 'blood', hue2: 'ash', stance: 'reel', tempo: 'quick', n: 12, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------------------- */
  /**
   * 木牛流马 — the wooden ox and the gliding horse, 诸葛亮's grain transport
   * for the Qishan campaigns, promoted here to a playable general. Nobody knows
   * what they actually were, which is why the pair is drawn as a mechanism
   * rather than as an animal.
   */

  /**
   * 摄梓 — 锁定技. At your prepare phase, name a player and one of their zones,
   * and take every piece of equipment in it.
   *
   * 梓 is catalpa, the carpenter's wood — 梓人 is the joiner who builds the
   * machines. A bronze mechanism turning at first light on the road and the
   * hardware coming apart into it. The green in the second colour is the wood
   * it is made of.
   */
  shezi: {
    figure: 'sigil', swarm: 'shard', flight: 'in', ground: 'none',
    hue: 'bronze', hue2: 'pine', stance: 'still', tempo: 'toll', n: 10, spread: 1.2, glyph: true,
  },

  /**
   * 易型 — bin all your "器", draw that many, then mount any number of equipment
   * cards on your character card as new "器", whose effects you all have.
   *
   * Changing form: the ox becomes the horse. The frame comes apart and locks
   * back together in a different arrangement, the parts going out and returning
   * as different parts, and the whole thing stays inside the portrait — it does
   * not go anywhere, it reconfigures.
   */
  yixing: {
    figure: 'lattice', swarm: 'rune', flight: 'recoil', ground: 'none',
    hue: 'pine', hue2: 'bronze', stance: 'turn', tempo: 'quick', n: 10, spread: 0.7, glyph: true,
  },
};
