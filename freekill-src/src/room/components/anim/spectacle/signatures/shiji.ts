/**
 * 史诗 (mobile_shiji) — a hundred and two skills across forty-five generals.
 *
 * This pack is mostly not the people on the box art. It is women of the Han
 * whose one recorded act is the whole of what survives of them, quartermasters
 * and legal draftsmen, a provincial governor remembered for losing, a defector,
 * a doctor, and five 神 cards that are the famous men rewritten as weather.
 * That is an advantage rather than a problem: where a general has exactly one
 * anecdote, the anecdote IS the design, and the skill name is almost always
 * pointing straight at it — 舍裔 at a mother choosing which child gets the
 * medicine, 怀璧 at 匹夫无罪，怀璧其罪, 锻币 at the hundred-cash coin that
 * refilled an empty treasury in three months.
 *
 * Where the figure genuinely is not known — 花鬘 is a folk daughter of 孟获 and
 * has no biography to read — the design comes off the rules text and the literal
 * sense of the name, which is what the rest of them are checked against anyway.
 */
import type { Motif } from '../motif';

export const SHIJI: Readonly<Record<string, Motif>> = {
  /* --------------------------------------------------------------------- *
   * 蔡贞姬 — 蔡邕's other daughter, 蔡文姬's sister, married to 羊衜, mother
   * of 羊祜 and of the empress 羊徽瑜. Her stepson 羊发 and her own son 羊承
   * fell ill together and there was one course of medicine. She gave it to the
   * stepson. 羊承 died. The 称号 舍心顾复 puts 舍心 — the heart given up —
   * against 顾复, the word from 蓼莪 for what a parent does for a child.
   * --------------------------------------------------------------------- */

  /**
   * 舍裔 — once a round, when another character takes damage, if their HP is
   * lower than yours, give them at least X cards and prevent it.
   *
   * The medicine, exactly: the dose crosses to the weaker child and she is the
   * one who goes grey. Peach is the life she hands over; bone is what is left
   * on her side of the frame, and the veil is a sleeve put over somebody else's
   * seat rather than her own.
   */
  sheyi: {
    figure: 'veil', swarm: 'drop', flight: 'out', ground: 'dim',
    hue: 'peach', hue2: 'bone', stance: 'wilt', tempo: 'slow', n: 8, spread: 1.3, glyph: true,
  },

  /**
   * 天音 — 锁定技. At the end phase, take one card of every type you did not
   * use this turn.
   *
   * Her father built the 焦尾琴 out of a log somebody was burning, and the ear
   * for a broken string ran in that house. 余音绕梁 — the note that winds round
   * the roofbeams and will not stop — so the figure is the winding itself, and
   * what she was missing arrives on it. Counted, like plucked strings.
   */
  tianyin: {
    figure: 'coil', swarm: 'card', flight: 'in', ground: 'ripple',
    hue: 'silver', hue2: 'celadon', stance: 'still', tempo: 'toll', n: 6, spread: 0.7, glyph: true,
  },

  /**
   * 陈震 · 歃盟 — discard two hand cards of one colour; another character draws
   * two, then you draw three.
   *
   * 歃盟使节. In 229 he went to Wu as Shu's envoy for Sun Quan's accession and
   * swore the treaty that carved up Wei's provinces between two states that did
   * not yet own any of them. 歃血为盟 is the ox's blood on the lips: the link is
   * drawn taut between two seats, the blood is thrown off it, and both sides
   * come away holding something.
   */
  shameng: {
    figure: 'chain', swarm: 'drop', flight: 'out', ground: 'wash',
    hue: 'blood', hue2: 'gold', stance: 'bow', tempo: 'toll', n: 8, turn: -10, spread: 1.25, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 神郭嘉 · 星月奇佐 — the man who died at thirty-eight, rebuilt as an engine
   * that buys 体力上限 with correct guesses and then spends the whole stock to
   * make somebody else become what they were going to be. 遗计定辽东 as a card:
   * everything he accumulates leaves him.
   * --------------------------------------------------------------------- */

  /**
   * 慧识 — judge; if the suit differs from every other judgement in the run,
   * gain 1 max HP and go again. Hand the judgement cards to someone at the end.
   *
   * Four suits and no repeats — reading is the skill, not luck. A lens holds
   * open over the seat with the cards circling it, one per turn of the wheel,
   * and violet is the palette this game keeps for anything that reads fate.
   */
  mobile__huishi: {
    figure: 'eye', swarm: 'card', flight: 'orbit', ground: 'rays',
    hue: 'violet', hue2: 'frost', stance: 'still', tempo: 'toll', n: 8, spread: 1.0, glyph: true,
  },

  /**
   * 天翊 — 觉醒技. Once every living player has bled, +2 max HP, recover 1, and
   * give a character 〖佐幸〗.
   *
   * 翊 is 立 under 羽 — standing, with wings. So the arc is a wing rather than a
   * blade, the feathers go up off it, and the light comes from behind: this is
   * the one beat in his three skills where something is given TO him.
   */
  mobile__tianyi: {
    figure: 'sweep', swarm: 'feather', flight: 'rise', ground: 'rays',
    hue: 'dawn', hue2: 'gold', stance: 'lift', tempo: 'slow', n: 12, glyph: true,
  },

  /**
   * 辉逝 — 限定技. Force another character's awakening condition to be met, or
   * give them four cards; then lose 2 max HP.
   *
   * 辉逝 is the light going out, and it is the only skill in the pack that costs
   * its owner the thing every other skill of his was accumulating. His star
   * falls, the room goes dark, and the light travels far enough to land in
   * somebody else's seat — 遗计定辽东 with the letter still unopened.
   */
  huishig: {
    figure: 'star', swarm: 'glint', flight: 'out', ground: 'dim',
    hue: 'moon', hue2: 'gold', stance: 'sink', tempo: 'slow', n: 14, spread: 1.3, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 神华佗 · 悬壶济世 — the gourd hung outside the door, which is still the
   * idiom for practising medicine. Both his skills are the real 华佗 rather
   * than the novel's: the exercise set he invented, and the free clinic.
   * --------------------------------------------------------------------- */

  /**
   * 五灵 — twice a play phase, teach a character 五禽戏; they cycle 虎, 鹿, 熊,
   * 猿, 鹤 one form per prepare phase in the order you chose.
   *
   * The Five Animal Frolics are a real thing he really wrote, and the mechanic
   * is its actual structure: five forms, laid out in an order, handed to someone
   * else. A fan opens with five leaves and the breath goes out along them — the
   * whole practice is breathing, so the swarm is breath.
   */
  wuling: {
    figure: 'fan', swarm: 'plume', flight: 'out', ground: 'smoke',
    hue: 'jade', hue2: 'amber', stance: 'turn', tempo: 'even', n: 10, spread: 1.2, glyph: true,
  },

  /**
   * 游医 — bank your discards in the 仁 zone; once a play phase, spend the whole
   * zone and every character on the table recovers 1 HP.
   *
   * 悬壶: the gourd swells until it cannot hold any more and lets go, and what
   * comes out is pills, not light. Nothing here is aimed — 所有角色 means the
   * enemy too, and the spread is set to reach the far side of the table.
   */
  youyi: {
    figure: 'orb', swarm: 'bead', flight: 'out', ground: 'bloom',
    hue: 'peach', hue2: 'jade', stance: 'lift', tempo: 'slow', n: 14, spread: 1.35, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 神鲁肃 · 兴吴之邓禹 — Sun Quan's own comparison. 邓禹 laid out the whole
   * restoration for 刘秀 at their first interview; 鲁肃 did the same on a couch
   * with a jar between them: the Han cannot be revived, take Jing, hold the
   * river, and wait. All three skills are that one habit — moving other people
   * into position and calling it an alliance.
   * --------------------------------------------------------------------- */

  /**
   * 榻谟 — at the start of the game, reassign the seating order of everybody at
   * the table.
   *
   * 榻上策, and the only skill in the pack that touches all seven seats before
   * a card is dealt. Threads go out to every chair with the tallies for the men
   * in them turning slowly into place, and the room around it is dark, because
   * this was two men drinking at night.
   */
  tamo: {
    figure: 'web', swarm: 'rune', flight: 'orbit', ground: 'dim',
    hue: 'indigo', hue2: 'amber', stance: 'still', tempo: 'slow', n: 9, spread: 1.4, glyph: true,
  },

  /**
   * 定州 — give a character as many cards as they have on the field, then take
   * everything on their field.
   *
   * 借荆州 as a transaction, which is what it was: he is the man who argued for
   * lending it. The gate opens, the payment goes out, and the province comes
   * back through the same doors — `recoil` is the only flight that is a round
   * trip, and this skill is nothing but a round trip.
   */
  dingzhou: {
    figure: 'gate', swarm: 'coin', flight: 'recoil', ground: 'wash',
    hue: 'bronze', hue2: 'jade', stance: 'still', tempo: 'even', n: 10, spread: 1.2, glyph: true,
  },

  /**
   * 智盟 — at the end of your turn, split hand cards randomly and evenly with
   * another character; on an odd total, you take the larger half.
   *
   * The Sun–Liu alliance in one line of rules text, including the part everyone
   * forgets: it is even, and then it is one card better for him. The beam tips,
   * overshoots, and does not quite come back level.
   */
  zhimeng: {
    figure: 'scale', swarm: 'card', flight: 'across', ground: 'none',
    hue: 'azure', hue2: 'jade', stance: 'still', tempo: 'even', n: 10, spread: 1.15, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 神孙策 · 踞江鬼雄 — 鬼雄 is 屈原's, from 国殇: 身既死兮神以灵，魂魄毅兮
   * 为鬼雄. He took Jiangdong in four years and was killed at twenty-six by
   * three retainers of a man he had executed. The card is built on that: every
   * skill he has spends 体力上限, and the pay-off is somebody else dying.
   * --------------------------------------------------------------------- */

  /**
   * 英霸 — make another character lose 1 max HP and take a 平定 token; then lose
   * 1 max HP yourself. No distance limit against the marked.
   *
   * 平定江东, stamped on a man. The standard goes up over the conquered seat and
   * the seals travel to it, far enough to cross the table, because the whole
   * point of the mark is that range stops applying.
   */
  yingba: {
    figure: 'banner', swarm: 'rune', flight: 'out', ground: 'rays',
    hue: 'flame', hue2: 'gold', stance: 'lunge', tempo: 'quick', n: 8, spread: 1.3, glyph: true,
  },

  /**
   * 覆海 — 锁定技. The marked cannot respond to your cards; when one of them
   * dies you gain max HP and draw.
   *
   * 翻江覆海, taken literally: the sea turns over and there is nothing under it
   * to answer with. Void rather than indigo because the man doing it is a ghost
   * by the time the card is printed, and the spray is the only light in it.
   */
  fuhai: {
    figure: 'wave', swarm: 'drop', flight: 'out', ground: 'ripple',
    hue: 'void', hue2: 'frost', stance: 'still', tempo: 'toll', n: 16, spread: 1.35, glyph: true,
  },

  /**
   * 冯河 — 锁定技. Hand limit equals HP lost; damage from others is prevented in
   * exchange for 1 max HP and a card handed to somebody.
   *
   * 暴虎冯河 — Confucius on the man who wrestles tigers bare-handed and fords
   * rivers with no boat, and dies without regret: 吾不与也. NO FIGURE, because
   * the point of the phrase is that he has nothing to cross on. Only water
   * coming up past him, close in, and the air going out of it.
   */
  pinghe: {
    figure: 'none', swarm: 'bubble', flight: 'rise', ground: 'ripple',
    hue: 'indigo', hue2: 'frost', stance: 'sink', tempo: 'slow', n: 16, spread: 0.6, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 神太史慈 · 义信天武 — 义 and 信 are earned: paroled by Sun Ce to go and
   * recall Liu Yao's scattered men, with the whole camp saying he would not
   * come back, he came back at noon on the day he had named. He died at
   * forty-one: 大丈夫生世，当带三尺之剑，以升天子之阶。今所志未从，奈何而死乎.
   * --------------------------------------------------------------------- */

  /**
   * 笃烈 — 锁定技. When a character with more HP than you targets you with 杀,
   * judge; on ♥, cancel it.
   *
   * 笃 is staunchness and the judgement that saves him is a heart, so the guard
   * closes in cold metal with one red thing at its core. The blades come IN and
   * stop: he is not answering the stronger man, he is outlasting him.
   */
  dulie: {
    figure: 'aegis', swarm: 'blade', flight: 'in', ground: 'shade',
    hue: 'silver', hue2: 'blood', stance: 'brace', tempo: 'toll', n: 9, glyph: true,
  },

  /**
   * 破围 — 使命技. Everyone starts with a 围 token; it moves one seat each of
   * your turns; you win by clearing the board of them.
   *
   * 北海解围. Besieged with Kong Rong, he rode out every morning to shoot at
   * targets until the besiegers stopped getting up to watch him, and on the
   * fourth morning went straight through the line for Liu Bei's relief column.
   * The ring is the siege, drawn in ink; he leaves it on one heading, at dawn,
   * and the spread is set to carry him clear into the next seat's air.
   */
  powei: {
    figure: 'ring', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'ink', hue2: 'dawn', stance: 'lunge', tempo: 'quick', n: 12, turn: -12, spread: 1.4, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 蒋琬 · 方整威重 — the phrase is from his appraisal. 诸葛亮's sealed memorial
   * named him successor: 臣若不幸，后事宜以付琬. When the news came back from
   * Wuzhangyuan and the country panicked, he showed neither grief nor pleasure
   * and carried on exactly as before, and that alone settled the officials.
   * --------------------------------------------------------------------- */

  /**
   * 镇庭 — once a turn, when you or someone in your range is targeted by 杀 or a
   * delayed trick, discard the user's card or draw; 背水, take the hit yourself.
   *
   * 镇 is what a weight does to paper. A single shaft stands on the seat and
   * does not move while the blades come in and stop against it, and the spread
   * is just past the frame because the skill covers his neighbours too.
   */
  zhenting: {
    figure: 'column', swarm: 'blade', flight: 'in', ground: 'vignette',
    hue: 'pine', hue2: 'bronze', stance: 'brace', tempo: 'toll', n: 10, spread: 1.15, glyph: true,
  },

  /**
   * 尽瘁 — 限定技. Swap seats with another character, then lose X HP; survive it
   * and gain max HP, and 镇庭's 背水 option is deleted for good.
   *
   * 鞠躬尽瘁，死而后已 is 诸葛亮's, out of the 后出师表, and 蒋琬 inherited the
   * sentence along with the office. The standard he was handed unrolls once, the
   * memoranda come off it, and he goes down under it. Nothing rises here.
   */
  mobile__jincui: {
    figure: 'banner', swarm: 'slip', flight: 'fall', ground: 'dim',
    hue: 'ink', hue2: 'bone', stance: 'sink', tempo: 'slow', n: 8, spread: 1.2, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 刘璋 · 半圭黯暗 — a 璋 is literally half a 圭, so the 称号 is a pun on his
   * name and a verdict in four characters: half a jade tablet, and dim. He held
   * the richest province in the empire, invited Liu Bei in to deal with Zhang
   * Lu, and lost it. At the end he had three years of grain and thirty thousand
   * men in Chengdu and opened the gates anyway, because 何心能安.
   * --------------------------------------------------------------------- */

  /**
   * 据土 — 锁定技. At your prepare phase, reclaim all your 生 cards, draw X+1,
   * and set X of them back on your character card.
   *
   * 天府之土: he does nothing and the land pays him, every single turn, forever.
   * Seeds curl inward on an amber wash, close in to the seat, and he never
   * moves — this is a property of the ground, not an act.
   */
  jutu: {
    figure: 'spiral', swarm: 'bead', flight: 'curl', ground: 'wash',
    hue: 'amber', hue2: 'jade', stance: 'still', tempo: 'slow', n: 14, spread: 0.7, glyph: true,
  },

  /**
   * 邀虎 — name a faction; its members are fed one of your 生 cards and then
   * have to swing at whoever you point at, or pay you to hit you.
   *
   * 引虎自卫 is the idiom for exactly what he did with 张松's introduction, and
   * 邀 is not "summon", it is "invite". So the gates open, the blades come in,
   * and the portrait BOWS as they arrive. Dusk is the palette: purple over
   * orange, the last light, which is the whole 黯暗 half of his epithet.
   */
  yaohu: {
    figure: 'gate', swarm: 'blade', flight: 'in', ground: 'shade',
    hue: 'dusk', hue2: 'ember', stance: 'bow', tempo: 'slow', n: 10, spread: 1.25, glyph: true,
  },

  /**
   * 怀璧 — 主公技, 锁定技. Hand limit +X.
   *
   * 匹夫无罪，怀璧其罪 — the commoner has done nothing; his crime is owning the
   * jade. A 璧 is a flat jade disc, so the figure is the disc with the shadow
   * already crossing it, held close and barely moving while the room goes out
   * around it. He is not doing anything. That is the charge.
   */
  huaibi: {
    figure: 'moon', swarm: 'glint', flight: 'hover', ground: 'dim',
    hue: 'jade', hue2: 'void', stance: 'still', tempo: 'slow', n: 8, spread: 0.5, glyph: true,
  },

  /**
   * 骆统 · 勤政 — 锁定技. Every third, fifth and eighth card you use or play
   * hands you a specific pair to pick from.
   *
   * 力政人臣. He spent his career filing memorials at Sun Quan about conscription
   * and the emptying countryside, and as a boy in a famine ate less and less
   * until his sister noticed and sold her own things to cover it. So: staggered
   * rings, one per threshold, and the records come back IN on the count. `toll`
   * because the whole skill is a tally.
   */
  qinzheng: {
    figure: 'rings', swarm: 'slip', flight: 'in', ground: 'none',
    hue: 'celadon', hue2: 'amber', stance: 'still', tempo: 'toll', n: 9, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 卞夫人 · 内助贤后 — a singer's daughter who became empress dowager. Two
   * things are told about her: when a false report of Cao Cao's death reached
   * Luoyang and his followers began packing, she stood up and asked how they
   * would face him if it were untrue, and they stayed; and she ran the richest
   * household in the empire on plain black lacquer with no embroidery in it.
   * --------------------------------------------------------------------- */

  /**
   * 挽危 — once a round, heal another character X+1, then lose X HP yourself
   * (X being your own HP).
   *
   * 挽 is to haul something back. There is no ceiling on what this costs her, so
   * the arc opens over somebody else's seat, the life crosses to it in drops,
   * and the colour goes out of her while it happens.
   */
  mobile__wanwei: {
    figure: 'halo', swarm: 'drop', flight: 'out', ground: 'bloom',
    hue: 'peach', hue2: 'bone', stance: 'pale', tempo: 'slow', n: 10, spread: 1.3, glyph: true,
  },

  /**
   * 约俭 — hand limit equals max HP; entering dying, discard two cards to
   * recover 1.
   *
   * Offered her pick of a tray of jewellery she took the middle one, on the
   * grounds that choosing the best is greed and the worst is a performance. So:
   * ink, which is the colour of the undecorated lacquer she actually used, a
   * lattice closing on a dark room, and FOUR pearls falling out of the frame.
   * Everything about this entry is deliberately not enough.
   */
  mobile__yuejian: {
    figure: 'lattice', swarm: 'bead', flight: 'fall', ground: 'dim',
    hue: 'ink', hue2: 'bone', stance: 'still', tempo: 'slow', n: 4, spread: 0.55, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 崔琰 · 伯夷之风 — Cao Cao's own words in the edict appointing him: 有伯夷
   * 之风，史鱼之直. Four-foot beard, and imposing enough that Cao Cao put him on
   * the throne to receive the Xiongnu envoy and stood beside the seat holding a
   * sword — after which the envoy reported that the man on the throne was very
   * fine, but the man with the sword was a hero. Cao Cao had him killed anyway.
   * --------------------------------------------------------------------- */

  /**
   * 雅俊 — draw one extra; at play phase start you may 拼点 with a card gained
   * this turn. Win and you set the deck's top card; fail and your hand limit drops.
   *
   * 捉刀 is the design and 拼点 is the same shape: two men held up side by side
   * and a judgement about which is the real one. The frame doubles, one copy
   * reversed, the cards cross between them — and the envoy got it right.
   */
  yajun: {
    figure: 'mirror', swarm: 'card', flight: 'across', ground: 'none',
    hue: 'silver', hue2: 'gold', stance: 'still', tempo: 'even', n: 6, spread: 0.7, glyph: true,
  },

  /**
   * 尊嫡 — discard a card, name a character, judge: black, they draw three; red,
   * they move a card on the field.
   *
   * He backed 曹丕 over 曹植 in an open unsealed letter, quoting 春秋之义，立子
   * 以长, and 曹植 was married to his own niece. Gold is the palette for decrees
   * and this is a decree: three strokes laid down in public, the seals going out
   * from them, the light behind him, and the man himself planted.
   */
  zundi: {
    figure: 'strokes', swarm: 'rune', flight: 'out', ground: 'rays',
    hue: 'gold', hue2: 'ink', stance: 'brace', tempo: 'toll', n: 8, spread: 1.15, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 杜预 · 文成武德 — the man who wrote the 春秋左氏经传集解 that stayed the
   * standard commentary for seventeen centuries AND commanded the fleet that
   * finished Wu in 280, and who could not ride a horse or shoot through a
   * writing-tablet. His nickname was 杜武库: Du the Arsenal, because whatever
   * you needed was already in there.
   * --------------------------------------------------------------------- */

  /**
   * 武库 — 锁定技. Whenever ANY character uses an equip, you gain a 武库 token,
   * to a maximum of three.
   *
   * The nickname, drawn as furniture: a rack standing up in the dark while other
   * people's weapons come in off the table and are put away. He does not move,
   * he does not swing, and the count is the whole skill — three and then no more.
   */
  wuku: {
    figure: 'pillars', swarm: 'blade', flight: 'in', ground: 'dim',
    hue: 'bronze', hue2: 'silver', stance: 'still', tempo: 'toll', n: 9, glyph: true,
  },

  /**
   * 三陈 — 觉醒技. At the end phase with three 武库 tokens: +1 max HP, recover 1,
   * gain 〖灭吴〗.
   *
   * 三陈伐吴之策 — he memorialised Sima Yan three times before the invasion was
   * approved, and once it started he told the council 譬如破竹，数节之后，皆迎
   * 刃而解. Both halves are in one image: the wedge goes into the bamboo and what
   * flies off it is writing slips.
   */
  mobile__sanchen: {
    figure: 'wedge', swarm: 'slip', flight: 'out', ground: 'rays',
    hue: 'celadon', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 12, turn: -6, spread: 1.3, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 高览 · 绝击坚营 — one of 袁绍's 河北四庭柱. At Guandu he and 张郃 were sent
   * against Cao Cao's camp, could not take it, were slandered to Yuan Shao while
   * they were still in front of it, burned their own siege engines and went over.
   * The 称号 is the assault that failed and decided the war anyway.
   * --------------------------------------------------------------------- */

  /**
   * 峻攻 — discard X+1 cards or lose X+1 HP and use a 杀 with no range or count
   * limit; the moment one of them connects, the skill shuts off for the turn.
   *
   * Wave after wave at a palisade, each one costing more than the last, and it
   * stops only when something finally gives. A heavy blade comes down on a
   * counted rhythm and the stakes go out in splinters; the blood is his own,
   * because the cost is often paid in HP.
   */
  jungong: {
    figure: 'crescent', swarm: 'shard', flight: 'out', ground: 'shade',
    hue: 'ember', hue2: 'blood', stance: 'lunge', tempo: 'toll', n: 13, turn: 34, spread: 1.2, glyph: true,
  },

  /**
   * 等力 — when you target another with 杀, or are targeted by one, if your HP
   * is exactly theirs, draw.
   *
   * The only condition is equality, and it reads the same from either end. So
   * the links snap taut and rebound, nothing goes anywhere, and the palette is
   * ash — neutral and worn on purpose, for a man whose whole skill is being
   * precisely as strong as the person opposite.
   */
  dengli: {
    figure: 'chain', swarm: 'blade', flight: 'recoil', ground: 'none',
    hue: 'ash', hue2: 'silver', stance: 'brace', tempo: 'even', n: 8, spread: 1.1, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 神姜维 · 万民承霖 — 诸葛亮's chosen heir, nine campaigns north, and at the
   * very end the plot with 钟会: 愿陛下忍数日之辱，臣欲使社稷危而复安，日月幽
   * 而复明. It failed and the mutineers cut him open. The 称号 is rain owed to a
   * people that never got it.
   * --------------------------------------------------------------------- */

  /**
   * 星魂 — look at the top five, trade and reorder them against your hand, then
   * reveal all five to one character and use every 杀 among them on him in order.
   *
   * 观星 inherited by the man who was taught it, and turned into a firing order.
   * The sky is cold and indigo above the seat; what comes off it is red, one at
   * a time, along a single line at a single man. `toll`, because 依次 means the
   * blades are counted out rather than thrown.
   */
  xinghun: {
    figure: 'star', swarm: 'blade', flight: 'jet', ground: 'dim',
    hue: 'indigo', hue2: 'cinnabar', stance: 'lunge', tempo: 'toll', n: 10, turn: -14, spread: 1.35, glyph: true,
  },

  /**
   * 天涛 — 锁定技. At the end phase name one zone, empty yours, then strip the
   * same zone from any number of other characters; anyone who did not lose a 杀
   * loses 1 HP.
   *
   * A cold front rather than a battle: it names one thing and takes it from
   * everybody, himself first. The net comes down over the whole table and the
   * cards fall out of it like weather, and he does not move, because 锁定技.
   */
  tiantao: {
    figure: 'net', swarm: 'card', flight: 'fall', ground: 'ripple',
    hue: 'frost', hue2: 'indigo', stance: 'still', tempo: 'slow', n: 14, spread: 1.4, glyph: true,
  },

  /**
   * 神霈 — 限定技. Dying, recover X HP (X = the number of times you have been
   * dying this game), deal that much lightning damage, and gain 〖回天〗.
   *
   * 霈 is a downpour, and 万民承霖 is the rain arriving for the people. The one
   * skill in his three that goes UP: the sheet of rain comes down over the seat,
   * the bolts come down with it, and the man stands back up out of the dying
   * state under it. Jade for the water, violet for what is in it.
   */
  shenpeij: {
    figure: 'veil', swarm: 'bolt', flight: 'fall', ground: 'ripple',
    hue: 'violet', hue2: 'jade', stance: 'lift', tempo: 'toll', n: 16, spread: 1.3, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 神马超 · 势震九天 — the Liang cavalryman turned into weather. 曹操 after
   * Tong Pass: 马儿不死，吾无葬地也. Every skill on the card is the same
   * substance in a different quantity, so the three entries are separated by
   * how much of the room they take rather than by what they are made of.
   * --------------------------------------------------------------------- */

  /**
   * 驭雳 — 锁定技. Your damage becomes lightning, or is +1 if already lightning;
   * lightning aimed at you is prevented and you draw for it.
   *
   * 驭 is to rein something, not to throw it. This is a standing property, not
   * an act, so it never leaves the seat: a seal of thunder turning on the spot
   * with the bolts running round it, close in, whether or not anybody asked.
   */
  yuli: {
    figure: 'sigil', swarm: 'bolt', flight: 'orbit', ground: 'wash',
    hue: 'violet', hue2: 'frost', stance: 'still', tempo: 'quick', n: 12, spread: 0.75, glyph: true,
  },

  /**
   * 霆威 — on targeting with 杀, take four 霆 tokens and hand a target a menu of
   * four bad options; refuse them all and he goes into 连环.
   *
   * A fan of four blades opening out of the strike, one per token, each of them
   * something he does not want. Ink for the cloud it comes out of and violet for
   * what is inside it, so it reads as the same storm as 驭雳 at a larger size.
   */
  tingwei: {
    figure: 'fan', swarm: 'bolt', flight: 'flare', ground: 'shade',
    hue: 'ink', hue2: 'violet', stance: 'lunge', tempo: 'quick', n: 12, spread: 1.25, glyph: true,
  },

  /**
   * 寂灭 — 限定技. Spend eight 霆 to deal a character damage equal to his own
   * max HP.
   *
   * 寂灭 is the Buddhist word for extinction, and the character that starts it
   * means silence. NO PARTICLES: the whole stock of thunder is spent in one
   * white shaft standing in a dark room, and then there is nothing in the air at
   * all. Everything he had is gone, and so is the man he pointed it at.
   */
  jimie: {
    figure: 'column', swarm: 'none', ground: 'dim', n: 0,
    hue: 'frost', hue2: 'void', stance: 'still', tempo: 'toll', glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 花鬘 · 薮泽清影 — 孟获 and 祝融夫人's daughter in the folk material and not
   * in any history, so all three of these are designed off the rules text and
   * the names. What the rules say about her is consistent and odd: she is
   * immune to the south, she cannot be reached and cannot reach, and she plays.
   * --------------------------------------------------------------------- */

  /**
   * 象阵 — 锁定技. 南蛮入侵 has no effect on you; after one resolves having dealt
   * damage, you and its user each draw.
   *
   * 象阵 is a formation of elephants and 南蛮入侵 is the card they are already
   * in. A rank stands up in order out of the dust with the smoke behind it; the
   * bone is ivory and the pine is what it is standing in.
   */
  xiangzhen: {
    figure: 'pillars', swarm: 'dust', flight: 'rise', ground: 'smoke',
    hue: 'bone', hue2: 'pine', stance: 'brace', tempo: 'toll', n: 12, glyph: true,
  },

  /**
   * 芳踪 — 锁定技. You cannot aim damage at anything inside your own range, and
   * nothing whose range holds you can aim damage at you.
   *
   * 芳踪难觅 — a beautiful woman's traces are hard to find, and the whole skill
   * is a rule about her not being where you are. NO FIGURE: petals cross the
   * frame on one heading with nothing at the centre of it, well past the edge of
   * the seat, and the portrait turns out of the line. She has already gone.
   */
  fangzong: {
    figure: 'none', swarm: 'petal', flight: 'across', ground: 'smoke',
    hue: 'orchid', hue2: 'celadon', stance: 'turn', tempo: 'slow', n: 14, spread: 1.35, glyph: true,
  },

  /**
   * 嬉战 — 锁定技. At each other character's turn start, discard a card and take
   * an effect off its suit — ♠ 酒, ♥ 无中生有, ♣ 铁索连环, ♦ fire 杀 — or lose 1 HP.
   *
   * 嬉 is play, and the mechanic is a child picking one of four. The flower opens
   * with the cards themselves as its petals, one per suit, and they go out
   * turning — the only thing in this general's three skills that reaches anyone.
   */
  xizhan: {
    figure: 'bloom', swarm: 'card', flight: 'flare', ground: 'smoke',
    hue: 'plum', hue2: 'flame', stance: 'turn', tempo: 'quick', n: 12, spread: 1.25, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 皇甫嵩 · 铁血柔肠 — both halves are documented. At 长社 he was penned in by
   * 波才's far larger army, saw that they had camped in tall grass, waited for a
   * wind and sent men out over the wall with torches at night. He also refused
   * 阎忠's offer of the empire, and petitioned to have Jizhou's taxes remitted
   * so the province could eat.
   * --------------------------------------------------------------------- */

  /**
   * 讨乱 — once a turn, when a judgement card is about to take effect and it is
   * ♠, stop it and either take the card or throw an unlimited fire 杀 at whoever
   * was judging.
   *
   * 长社, which is the only thing this skill can be. A grass fire runs across the
   * frame on the wind at an angle, cinders going with it into the smoke, and it
   * carries far enough to reach the next camp — which is precisely how the night
   * went for 波才.
   */
  taoluanh: {
    figure: 'wave', swarm: 'cinder', flight: 'across', ground: 'smoke',
    hue: 'flame', hue2: 'ember', stance: 'lunge', tempo: 'quick', n: 16, turn: -10, spread: 1.35, glyph: true,
  },

  /**
   * 势击 — on dealing elemental damage, if your hand is not the largest, look at
   * the target's hand, discard every red card in it and draw as many.
   *
   * The morning after the fire: he goes through what is left. Their hand is
   * fanned open toward him and the red is pulled out of it — blood for the cards
   * he is taking, ash for the hand they came out of. The condition is that he is
   * behind, which is why he lunges.
   */
  shiji: {
    figure: 'fan', swarm: 'card', flight: 'in', ground: 'shade',
    hue: 'blood', hue2: 'ash', stance: 'lunge', tempo: 'quick', n: 10, spread: 1.2, glyph: true,
  },

  /**
   * 整军 — at play phase start you may run 整肃; if it succeeds you take the
   * reward at the end of the discard phase, and may give it to somebody else too.
   *
   * On campaign he would not have his own tent pitched until the camp was up and
   * would not eat until the men had eaten. So the grid squares up and locks, and
   * then the ration tallies go OUT past the frame to the next man — 铁血 and
   * 柔肠 in one figure, in that order.
   */
  zhengjun: {
    figure: 'lattice', swarm: 'rune', flight: 'out', ground: 'dim',
    hue: 'bronze', hue2: 'jade', stance: 'brace', tempo: 'toll', n: 9, spread: 1.25, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 华歆 · 清素拂浊 — the 割席 story is his: a lump of gold turned up while he
   * and 管宁 were hoeing and he picked it up before throwing it away, and 管宁
   * cut the mat. The better story is the other one — colleagues loaded him with
   * gold as a parting gift, he took every piece publicly, marked them all in
   * secret, and gave them back at the gate.
   * --------------------------------------------------------------------- */

  /**
   * 渊清 — 锁定技. At the end of your play phase, one card of each category you
   * used this turn goes into the 仁 zone instead of staying discarded.
   *
   * 渊清玉洁. Nothing is thrown away here, it is put down: the used cards fall
   * into still water, one ring goes out, and it settles. Kept close and slow —
   * this is the quietest entry in the pack and it should be.
   */
  yuanqing: {
    figure: 'ring', swarm: 'drop', flight: 'fall', ground: 'ripple',
    hue: 'celadon', hue2: 'frost', stance: 'still', tempo: 'slow', n: 10, spread: 0.65, glyph: true,
  },

  /**
   * 疏陈 — 锁定技. When anyone starts dying and the 仁 zone holds four or more,
   * take the whole zone and put them back on their feet.
   *
   * 既已纳其自托，宁可以急相弃邪 — having once taken a man in, you cannot drop
   * him the moment it gets dangerous, which he said about a stranger the rest of
   * the party wanted to abandon. A guard closes over somebody else's seat and the
   * memoranda travel to it; 疏 is the word for a memorial laid before the throne.
   */
  shuchen: {
    figure: 'aegis', swarm: 'slip', flight: 'out', ground: 'bloom',
    hue: 'jade', hue2: 'silver', stance: 'lift', tempo: 'toll', n: 8, spread: 1.3, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 蒋钦 · 折节尚义 — 徐盛 had once had one of his officers punished, and when
   * 蒋钦 was later put over him everybody waited for the reprisal; he recommended
   * him to Sun Quan instead. 孙权 called on him unannounced and found his mother
   * asleep behind plain cloth curtains under a cloth quilt, with the household
   * dressed the same way, and went away and sent them silk.
   * --------------------------------------------------------------------- */

  /**
   * 俭衣 — 锁定技. At the end of another character's turn, if any armour was
   * discarded during it, pick one and take it.
   *
   * 布被疏帐: the plain curtain and the cloth quilt Sun Quan actually found in
   * that house. A grey undyed sheet comes down over the seat and what other
   * people threw away drifts in under it. Ash and bone, six particles, nothing
   * bright — 俭 is the whole point and the effect should look cheap.
   */
  jianyi: {
    figure: 'veil', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'ash', hue2: 'bone', stance: 'still', tempo: 'slow', n: 6, spread: 0.7, glyph: true,
  },

  /**
   * 尚义 — once a play phase, discard a card; another character reads your hand,
   * then you read his and take one card out of it.
   *
   * The only skill in the pack where both players open their hands to each other.
   * Two frames face off with the cards held up between them and NOTHING MOVING —
   * `hover` is the flight for a thing that is shown rather than thrown. He bows,
   * because 折节 is literally the bending.
   */
  mobile__shangyi: {
    figure: 'mirror', swarm: 'card', flight: 'hover', ground: 'none',
    hue: 'jade', hue2: 'silver', stance: 'bow', tempo: 'slow', n: 6, spread: 0.85, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 孔融 · 凛然重义 — Confucius's twentieth-generation descendant, who at four
   * took the smallest pear, sheltered a proscribed fugitive and then fought his
   * own brother and mother for the right to be executed for it, kept a house
   * where 座上客常满，樽中酒不空, and was killed by Cao Cao for saying so in
   * public. His eight-year-old son, told his father was arrested: 覆巢之下，安有
   * 完卵.
   * --------------------------------------------------------------------- */

  /**
   * 名士 — 锁定技. Damaged while you hold a 谦 token, the source must give up a
   * card from his own zone; black you take it, red you heal.
   *
   * 凛然 is the cold that comes off a reputation. His renown stands over the seat
   * as an arc with frost creeping in from the edges, and the man who hit him
   * walks a card into it — nothing is thrown, it is surrendered.
   */
  mobile__mingshi: {
    figure: 'halo', swarm: 'card', flight: 'in', ground: 'frost',
    hue: 'frost', hue2: 'ink', stance: 'brace', tempo: 'toll', n: 7, spread: 1.2, glyph: true,
  },

  /**
   * 礼让 — at another character's draw phase, take a 谦 token and let him draw
   * two extra, collecting up to two of what he throws away; then skip your own
   * draw phase.
   *
   * 孔融让梨, which is the first thing every child in China is told about him and
   * exactly what this skill does — the big share goes across the table and he
   * takes what is left over afterwards. Pear blossom, opening and going out, and
   * a four-year-old bowing.
   */
  mobile__lirang: {
    figure: 'bloom', swarm: 'petal', flight: 'out', ground: 'rays',
    hue: 'moon', hue2: 'jade', stance: 'bow', tempo: 'slow', n: 10, spread: 1.25, glyph: true,
  },

  /* --------------------------------------------------------------------- *
   * 刘巴 · 撰科行律 — he ran from Liu Bei for a decade and bolted his door when
   * Chengdu fell, and then took the empty treasury Liu Bei's army had just
   * looted and refilled it in a few months by minting the 直百五铢 and putting
   * the markets under an official. He also co-drafted the 蜀科 with Zhuge Liang.
   * --------------------------------------------------------------------- */

  /**
   * 锻币 — 限定技. When the table is holding more than two cards a head, every
   * other character discards half his hand, and you hand three of them back to
   * somebody.
   *
   * A currency reform, drawn as one: the mint die turns, the coin comes in off
   * every seat at the table, and three pieces go back out where they are needed.
   * `toll` is the hammer. This is the closest match between rules text and
   * biography anywhere in the pack.
   */
  duanbi: {
    figure: 'sigil', swarm: 'coin', flight: 'in', ground: 'wash',
    hue: 'bronze', hue2: 'gold', stance: 'still', tempo: 'toll', n: 18, spread: 1.4, glyph: true,
  },

  /**
   * 统度 — once a turn, when you are the sole target of another's card, you may
   * make any character recast one of his.
   *
   * 统一度量 — one standard, applied to everybody, including the man who just
   * aimed at you. The lattice of the code closes in with frost behind it and the
   * measures come to hand; nothing is destroyed, it is brought into conformity.
   */
  mobile__tongdu: {
    figure: 'lattice', swarm: 'rune', flight: 'in', ground: 'frost',
    hue: 'silver', hue2: 'celadon', stance: 'still', tempo: 'even', n: 8, spread: 1.1, glyph: true,
  },

  /**
   * 吕范 · 调度 — at your prepare phase, move one equip card anywhere on the
   * field; whoever lost it draws.
   *
   * 持筹廉悍 — holding the counting rods, incorruptible, hard. When Sun Quan was
   * young and asked him quietly for money out of the accounts, Lü Fan refused to
   * release a coin without reporting it to Sun Ce; 周谷 cooked the books for him
   * instead. Sun Quan came to power, honoured Lü Fan and would not employ 周谷.
   * So: a quartermaster's beam, the rods crossing the table, and the ledger
   * squares — the item leaves one seat and the compensation lands in it.
   */
  mobile__diaodu: {
    figure: 'scale', swarm: 'slip', flight: 'across', ground: 'none',
    hue: 'bronze', hue2: 'celadon', stance: 'still', tempo: 'even', n: 8, spread: 1.3, glyph: true,
  },

  /* ---------------------------------------------------------- 吕范 ------ *
   * 持筹廉悍 — the tally-rods and the hard hand. Sun Ce's quartermaster, and
   * the man who would not open the strongbox for the young Sun Quan without
   * writing to Sun Ce first, while 周谷 cooked the books for him instead.
   * Sun Quan resented it for years and then promoted him for it.
   */

  /**
   * 典财 — at the end of another player's play phase, if you lost X cards this
   * phase (X = your hp), draw back up to your hand limit.
   *
   * 持筹 is literally holding the counting rods, so the figure is the rods:
   * a rank of bars standing up in sequence, with the money coming back IN to
   * the till rather than out of it. `toll`, because an audit is counted.
   */
  mobile__diancai: {
    figure: 'pillars', swarm: 'coin', flight: 'in', ground: 'dim',
    hue: 'bronze', hue2: 'gold', stance: 'still', tempo: 'toll', n: 10, glyph: true,
  },

  /**
   * 严纪 — at the start of your play phase you may declare 整肃.
   *
   * 廉悍: he dressed magnificently and ran his command like iron. A white grid
   * closes over the seat and locks, with the regulations hanging in the air
   * inside it and nothing moving — 整肃 is a rule you impose on yourself.
   */
  yanji: {
    figure: 'lattice', swarm: 'slip', flight: 'hover', ground: 'dim',
    hue: 'ink', hue2: 'silver', stance: 'brace', tempo: 'toll', n: 8, spread: 0.6, glyph: true,
  },

  /* -------------------------------------------------------- 糜夫人 ------ *
   * 乱世沉香 — aloeswood sunk in a broken age. At Changban, wounded in the leg
   * with the infant Liu Shan in her arms, she refused Zhao Yun's horse, put
   * the child into his hands, and went into the dry well so that he would not
   * have to carry them both. Four skills, two of them two drafts of the same
   * one; 沉 is the word the epithet and the well share.
   */

  /**
   * 闺秀 (mobile) — 锁定技, end phase: on odd hp draw a card, on even recover 1.
   *
   * A skill that alternates by parity is a waxing and waning, so it is the
   * disc with the shadow travelling over it, and the petals fall inside the
   * frame (`spread` 0.6) because 闺秀 is a woman who never left the inner
   * courtyard.
   */
  mobile__guixiu: {
    figure: 'moon', swarm: 'petal', flight: 'fall', ground: 'smoke',
    hue: 'orchid', hue2: 'peach', stance: 'still', tempo: 'slow', n: 9, spread: 0.6, glyph: true,
  },

  /**
   * 清玉 — 使命技: when damaged, discard two hand cards and prevent it. Succeed
   * with no wound and no hand; fail by going to the ground.
   *
   * 宁为玉碎，不为瓦全 — better a shattered jade than a whole roof-tile. The
   * jade ring takes the blow and goes to pieces, and she is not marked.
   */
  qingyu: {
    figure: 'ring', swarm: 'shard', flight: 'out', ground: 'frost',
    hue: 'celadon', hue2: 'frost', stance: 'brace', tempo: 'quick', n: 12, glyph: true,
  },

  /**
   * 存嗣 — turn your own character card face down; a chosen player gains a 杀
   * and their next 杀 deals one more.
   *
   * The well. `orb` is documented as a core that swells and lets go, which is
   * the child passing out of her arms; the 杀 leaves with him toward another
   * seat, and she `sink`s while it goes. The only skill in the pack whose
   * portrait is going away from the effect.
   */
  nos__cunsi: {
    figure: 'orb', swarm: 'blade', flight: 'out', ground: 'dim',
    hue: 'peach', hue2: 'cinnabar', stance: 'sink', tempo: 'slow', n: 6, spread: 1.1, glyph: true,
  },

  /**
   * 闺秀 (nos) — 锁定技: damaged, you turn face up again; turning face up, draw.
   *
   * The counterpart to 存嗣 and deliberately its reverse: the veil lifts, the
   * card comes over, and the aloeswood goes up rather than down. 暮 is the
   * palette because this is the last light on her, not the morning.
   */
  nos__guixiu: {
    figure: 'veil', swarm: 'plume', flight: 'rise', ground: 'smoke',
    hue: 'dusk', hue2: 'rouge', stance: 'turn', tempo: 'even', n: 8, glyph: true,
  },

  /* ---------------------------------------------------------- 孙邵 ------ *
   * 创基抉政 — Wu's first Chancellor, whom 陈寿 left out of the Records
   * entirely, which is the most famous thing about him. 孔融 called him 廊庙才,
   * timber for the halls of state; he wrote Wu's statutes, was accused in the
   * 暨艳 affair, took off his cap and resigned, and was reinstated.
   */

  /**
   * 定仪 — 锁定技: at game start pick ONE rule that then applies to everybody
   * at the table for the rest of the game.
   *
   * One statute promulgated once. A single hard ring going out past every
   * seat (`spread` 1.4) with the ordinance riding on it, tolled rather than
   * struck. Nothing about a founding law is fast or personal.
   */
  dingyi: {
    figure: 'ring', swarm: 'slip', flight: 'out', ground: 'wash',
    hue: 'gold', hue2: 'celadon', stance: 'still', tempo: 'toll', n: 12, spread: 1.4, glyph: true,
  },

  /**
   * 罪辞 — damaged by someone holding 定仪, you may strip 定仪 from them and
   * hand them a 智囊 card out of the pile instead.
   *
   * 免冠谢罪, the cap taken off: a written admission, the statute drawn back
   * off the man who has it, and the seat bowing while it happens. The one
   * `bow` in the pack that is an apology rather than a courtesy.
   */
  zuici: {
    figure: 'strokes', swarm: 'slip', flight: 'in', ground: 'shade',
    hue: 'ink', hue2: 'bone', stance: 'bow', tempo: 'slow', n: 8, glyph: true,
  },

  /**
   * 辅弼 — once a phase: change a 定仪 holder's chosen rule, or discard a card
   * to double it until your next turn.
   *
   * 左辅右弼, the two ministers who flank the throne — and the mechanic is a
   * beam with two things on it that you tip one way or the other. `hue2` is
   * doing its job here: the two pans are not the same colour.
   */
  fubi: {
    figure: 'scale', swarm: 'rune', flight: 'hover', ground: 'none',
    hue: 'jade', hue2: 'gold', stance: 'still', tempo: 'even', n: 8, glyph: true,
  },

  /* ---------------------------------------------------------- 王粲 ------ *
   * 词章纵横 — the best of the 建安七子. 蔡邕 ran out to meet him with his shoes
   * on backwards; he could recite a stele after one reading and rebuild an
   * upset weiqi board from memory; at his funeral Cao Pi had the mourners bray
   * like donkeys, because he had liked the sound.
   */

  /**
   * 七哀 — once a phase, give a non-basic card to another player; they choose
   * whether you recover 1 hp or draw two.
   *
   * 七哀诗, written fleeing Chang'an in 192: 出门无所见，白骨蔽平原, and the
   * starving woman who leaves her own child in the grass because she cannot
   * feed it. So there is NO FIGURE — seven pale things crossing an empty
   * plain, the light closing at the corners, and the seat wilting. The card
   * he gives away in the rules is the child he cannot keep in the poem.
   */
  wisdom__qiai: {
    figure: 'none', swarm: 'plume', flight: 'across', ground: 'vignette',
    hue: 'bone', hue2: 'ash', stance: 'wilt', tempo: 'slow', n: 7, spread: 1.2, glyph: true,
  },

  /**
   * 善檄 — put a 檄 mark on someone (or move the existing one); when a marked
   * player heals, they hand you two cards or lose 1 hp.
   *
   * A 檄文 is a manifesto nailed up in public and copied onward, so the banner
   * unrolls and the seal travels sideways to the next seat. Sulphur rather
   * than ink: a proclamation of this kind is a poison-pen letter with a seal
   * on it.
   */
  wisdom__shanxi: {
    figure: 'banner', swarm: 'rune', flight: 'across', ground: 'shade',
    hue: 'sulphur', hue2: 'ink', stance: 'still', tempo: 'even', n: 6, spread: 1.3, glyph: true,
  },

  /* ---------------------------------------------------------- 王凌 ------ *
   * 风节格尚 — 王允's nephew, and the first of the three Huainan revolts. He and
   * 令狐愚 read a portent in the southeast and laid a plot to replace Cao Fang
   * with 曹彪; Sima Yi came down the river before he was ready, he surrendered
   * bound on the water at 丘头, and took poison at 项城 in front of 贾逵's
   * shrine, shouting that the god at least knew he had been loyal to Wei.
   */

  /**
   * 星启 — using a non-delayed trick with a name you have not recorded logs it
   * as a 备; at the end phase spend a 备 to pull the same card out of the pile.
   *
   * The plot began as an omen: a great star in the southeast, and a diviner
   * who said the sign meant a change of ruler. A slow counter-turning seal
   * with the sky's light collecting into it — this skill only ever stores.
   */
  xingqi: {
    figure: 'sigil', swarm: 'glint', flight: 'in', ground: 'dim',
    hue: 'indigo', hue2: 'frost', stance: 'still', tempo: 'slow', n: 9, glyph: true,
  },

  /**
   * 自缚 — 锁定技: use no card in your play phase and your hand limit drops by
   * one and every 备 you had laid up is removed.
   *
   * 面缚, the surrender: he came out of the boat bound, sent ahead his seal
   * and his axe, and everything he had spent two years preparing was gone in
   * an afternoon. The ribbon winds around the seat, the stores fall out of it,
   * and the whole thing stays inside the frame — nothing he did got out.
   */
  zifu: {
    figure: 'coil', swarm: 'slip', flight: 'fall', ground: 'dim',
    hue: 'ash', hue2: 'ink', stance: 'sink', tempo: 'toll', n: 8, spread: 0.5, glyph: true,
  },

  /**
   * 秘备 — 使命技: hold two 备 of every card category and you collect one of
   * each and gain 谋立; hold none across a whole turn and you shrink.
   *
   * The conspiracy itself, assembled quietly in a province a long way from
   * Luoyang. A web spun tight against the seat, the records curling inward,
   * sulphur in it because the thing at the middle of this is treason.
   */
  mibei: {
    figure: 'web', swarm: 'slip', flight: 'curl', ground: 'dim',
    hue: 'void', hue2: 'sulphur', stance: 'still', tempo: 'slow', n: 10, spread: 0.6, glyph: true,
  },

  /* ---------------------------------------------------------- 王双 ------ *
   * 边城猛兵 — 形貌壮猛，膂力过人. Cao Zhen's man against Zhuge Liang's second
   * northern campaign, killed pursuing the Shu retreat in 228; the novel gives
   * him a great sabre and a meteor-hammer hidden under his coat.
   */

  /**
   * 异勇 — damaged by another's 杀 while you have a weapon equipped: take that
   * very 杀 and use it back at them.
   *
   * The same blade, returning. A heavy curved sabre on the one flight that is
   * a round trip, and the portrait takes the hit before it answers — `reel`
   * first, then the swing.
   */
  yiyongw: {
    figure: 'crescent', swarm: 'blade', flight: 'recoil', ground: 'shade',
    hue: 'bronze', hue2: 'blood', stance: 'reel', tempo: 'quick', n: 7, turn: 28, glyph: true,
  },

  /**
   * 擅械 — take a weapon out of the pile (or off somebody), and a 闪 answering
   * your 杀 is void unless its number beats twice your reach.
   *
   * 械 is the machine rather than the sword: the 流星锤 whirling on its cord,
   * which is why this is a turning arm throwing metal outward and not another
   * straight swing. Reach is the whole skill, so the spread runs long.
   */
  shanxie: {
    figure: 'spiral', swarm: 'shard', flight: 'flare', ground: 'shade',
    hue: 'bronze', hue2: 'ember', stance: 'lunge', tempo: 'quick', n: 10, spread: 1.1, glyph: true,
  },

  /* ---------------------------------------------------------- 文鸯 ------ *
   * 独骑破军 — eighteen at 乐嘉, he rode into Sima Shi's camp at night calling
   * his own name, and the shock of it burst the tumour behind Sima Shi's eye;
   * he died of it days later. Retreating, Wen Yang turned back ALONE into more
   * than a hundred pursuing horse six or seven times and rode away. He defected
   * to Wu and back, broke the Xianbei in Liangzhou, and was executed with his
   * entire clan in 291 by Zhuge Dan's grandson over a grudge forty years old.
   */

  /**
   * 却敌 — once a turn, on a single-target 杀 or 决斗: take a card off them, or
   * discard a basic for +1 damage; the 背水 line costs 1 max hp.
   *
   * 背水一战 is in the cost text and it is the river at your back. A broad
   * ground-wave rolls out and flattens with the blades riding on it, and he
   * plants rather than lunges: 却敌 is repelling, not charging.
   */
  quedi: {
    figure: 'wave', swarm: 'blade', flight: 'out', ground: 'ripple',
    hue: 'silver', hue2: 'blood', stance: 'brace', tempo: 'quick', n: 12, spread: 1.15, glyph: true,
  },

  /**
   * 椎锋 — 魏势力技: pay 1 hp, twice a phase, to deal a 决斗; damage coming back
   * off it is prevented once and then the skill shuts off for the phase.
   *
   * 椎锋陷陈 — hammer the spearhead, break the ranks. The Wei half of him: one
   * hard triangular slam down a single line with his own blood in the palette,
   * and the room dark, because this is the night raid.
   */
  chuifeng: {
    figure: 'wedge', swarm: 'shard', flight: 'jet', ground: 'dim',
    hue: 'blood', hue2: 'flame', stance: 'lunge', tempo: 'quick', n: 14, turn: -12, spread: 1.25, glyph: true,
  },

  /**
   * 冲坚 — 吴势力技: an equip card becomes 酒, or a 杀 with no range limit that
   * ignores armour; on damage you take X pieces of their equipment.
   *
   * 冲坚陷阵, and the Wu half — the defection years. Armour is explicitly no
   * use against it, so a single ring punches out and comes back wearing the
   * bronze it stripped. Ember rather than flame: this one is drunk.
   */
  chongjian: {
    figure: 'ring', swarm: 'shard', flight: 'recoil', ground: 'wash',
    hue: 'ember', hue2: 'bronze', stance: 'lunge', tempo: 'quick', n: 12, glyph: true,
  },

  /**
   * 仇决 — 锁定技: kill someone and you gain 1 max hp, draw two, and get an
   * extra 却敌 this turn.
   *
   * He killed Sima Shi without touching him — the shouting outside the palisade
   * and an eye that came out of its socket. The second `eye` in the game and
   * knowingly so; 夏侯惇's is his own and this one is the other man's. Locked,
   * so `still` and `toll`: the feud closing is not something he decides.
   */
  mobile__choujue: {
    figure: 'eye', swarm: 'spark', flight: 'out', ground: 'vignette',
    hue: 'void', hue2: 'blood', stance: 'still', tempo: 'toll', n: 10, glyph: true,
  },

  /* ---------------------------------------------------------- 吴景 ------ *
   * 助吴征战 — Lady Wu's younger brother: Sun Jian's second, then Yuan Shu's
   * unwilling Grand Administrator of Danyang, then back to his nephew to help
   * take Jiangdong. Nobody's protagonist for thirty years of fighting.
   */

  /**
   * 合击 — after someone resolves a 决斗 or red 杀 on a single target, you may
   * put your own 杀 or 决斗 on the same target, free of range and count.
   *
   * The second blow arriving on the first one's line. A starburst at the point
   * where they meet, thrown down one heading and long enough to reach the seat
   * the fight was already happening at.
   */
  heji: {
    figure: 'star', swarm: 'blade', flight: 'jet', ground: 'wash',
    hue: 'cinnabar', hue2: 'gold', stance: 'lunge', tempo: 'quick', n: 10, turn: 18, spread: 1.3, glyph: true,
  },

  /**
   * 流兵 — 锁定技: your first real 杀 each turn counts as ♦, and other players'
   * black 杀 that finish their play phase without hurting anybody come to you.
   *
   * 流兵 are stragglers, and collecting them is what he did after Sun Jian
   * died. NO FIGURE: this is not an act, it is other people's spent weapons
   * drifting in off every neighbouring seat and being picked up.
   */
  liubing: {
    figure: 'none', swarm: 'blade', flight: 'in', ground: 'vignette',
    hue: 'ash', hue2: 'cinnabar', stance: 'still', tempo: 'even', n: 14, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------- 辛毗 ------ *
   * 一节肃六军 — one staff of office and the six armies stood still. Both of his
   * skills are named after the two anecdotes, and both anecdotes are about a
   * man physically refusing to let something happen.
   */

  /**
   * 引裾 — once a phase, make another player either skip their next play and
   * discard phases, or use a 杀 at you with no distance limit.
   *
   * Cao Pi meant to move a hundred thousand households in a famine year.
   * Xin Pi argued; the emperor got up and walked into the inner apartments;
   * Xin Pi went after him and TOOK HOLD OF HIS ROBE. The hem is dragged back
   * into the frame on a chain drawing taut, imperial gold in a grey fist, and
   * nothing travels — `spread` 0.55 because nobody gets past him.
   */
  mobile__yinju: {
    figure: 'chain', swarm: 'ribbon', flight: 'in', ground: 'dim',
    hue: 'gold', hue2: 'ink', stance: 'brace', tempo: 'toll', n: 9, spread: 0.55, glyph: true,
  },

  /**
   * 持节 — once a turn, becoming the sole target of another's card, judge; over
   * 6 and the card is cancelled.
   *
   * 五丈原: Sima Yi's officers were baying to go out and fight, so he asked the
   * court for an order forbidding it, and Cao Rui sent Xin Pi with the staff.
   * 毗仗节立军门 — he stood in the gate of the camp holding it and the army did
   * not move. Two panels, the dust hanging, nothing crossing the threshold.
   */
  mobile__chijie: {
    figure: 'gate', swarm: 'plume', flight: 'hover', ground: 'dim',
    hue: 'bronze', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 6, spread: 0.5, glyph: true,
  },

  /* ---------------------------------------------------------- 羊祜 ------ *
   * 鹤德璋声 — ten years at Xiangyang across the line from 陆抗, running the war
   * by decency: he paid in silk for the grain his troops took, sent back
   * captured children, refused game his men had wounded second, and traded
   * wine and medicine with the enemy commander. The 堕泪碑 on Xianshan is named
   * for what people did when they read it.
   */

  /**
   * 明伐 — reveal a card at your end phase; if you still hold it next turn you
   * may 拼点 with it, at +2, for a card of theirs and a card out of the pile.
   *
   * 每交兵，克日方战，不为掩袭之计 — he named the day and never raided. The card
   * is shown a whole turn in advance and just stands there in the light: a
   * shaft on the seat, one card hovering in it, dawn colours, no metal.
   */
  mobile__mingfa: {
    figure: 'column', swarm: 'card', flight: 'hover', ground: 'rays',
    hue: 'dawn', hue2: 'silver', stance: 'still', tempo: 'slow', n: 5, spread: 0.6, glyph: true,
  },

  /**
   * 戎备 — 限定技: pick someone with empty equipment slots and fill every one of
   * them from the pile or the discards.
   *
   * The other ten years: 垦田八百顷, granaries, ships, kit. An armoury rack
   * standing up bar by bar as the slots fill in sequence, and the swarm is
   * coin because 羊祜 is the general who paid for what he took.
   */
  rongbei: {
    figure: 'pillars', swarm: 'coin', flight: 'in', ground: 'bloom',
    hue: 'jade', hue2: 'bronze', stance: 'lift', tempo: 'slow', n: 8, glyph: true,
  },

  /* -------------------------------------------------------- 张昌蒲 ------ *
   * 厉色严教 — 钟繇's concubine and 钟会's mother, and the only reason we know
   * anything about her is that her son wrote her biography himself. 钟繇's wife
   * poisoned her food while she was pregnant; she noticed, survived, and would
   * not let the household hush it up. Then she raised him on a reading
   * timetable and never once let anyone flatter him.
   */

  /**
   * 抵诽 — 锁定技: damaged, draw or discard one, then SHOW YOUR WHOLE HAND; if
   * the card that hurt you was suitless or you hold nothing of its suit, you
   * recover 1.
   *
   * 抵诽 is rebutting a slander, and the rules make you prove it by opening
   * everything. A hand of cards fanned wide off one pivot: silver for what she
   * is showing, sulphur for what was put in her food.
   */
  difei: {
    figure: 'fan', swarm: 'card', flight: 'flare', ground: 'wash',
    hue: 'silver', hue2: 'sulphur', stance: 'brace', tempo: 'even', n: 8, glyph: true,
  },

  /**
   * 严教 — once a phase, give another player EVERY card of one suit in your
   * hand, then deal them 1 damage; next turn you draw that many.
   *
   * Give him everything you have and then hit him. A cane's arc across the
   * frame carrying the cards over to the other seat, ink for the books and
   * blood for the lesson, counted out on `toll` rather than lost in temper.
   */
  mobile__yanjiao: {
    figure: 'sweep', swarm: 'card', flight: 'across', ground: 'shade',
    hue: 'ink', hue2: 'blood', stance: 'still', tempo: 'toll', n: 8, turn: -18, spread: 1.2, glyph: true,
  },

  /* ---------------------------------------------------------- 张温 ------ *
   * 抱德炀和 — Wu's brilliant young envoy, sent to Chengdu in 224, where he
   * praised Shu warmly and got out-talked by 秦宓 on the way. Sun Quan decided
   * his heart was outside the state, tied him to the 暨艳 purge, and buried his
   * career for good. He never held office again.
   */

  /**
   * 戈帛 — 锁定技: whenever anybody recovers hp, the top card of the pile goes
   * into the shared 仁 zone.
   *
   * 化干戈为玉帛 — turn the halberds into jade and silk. Two colours because it
   * is two things: a bolt of silk unrolling with the bronze of the weapon
   * still under it, and the cards drop quietly into the common store.
   */
  gebo: {
    figure: 'banner', swarm: 'ribbon', flight: 'fall', ground: 'none',
    hue: 'bronze', hue2: 'jade', stance: 'still', tempo: 'toll', n: 6, glyph: true,
  },

  /**
   * 颂蜀 — a healthier player about to draw may instead take X cards out of the
   * 仁 zone, and then cannot target anybody else this turn.
   *
   * Literally the incident that ruined him: he came back from Shu full of
   * praise for it. Diplomacy as this skill has it is a hand of gifts sent
   * across to the strong man on condition that he does not swing. The halo is
   * over someone else's seat, the swarm is tribute, and he bows.
   */
  mobile__songshu: {
    figure: 'halo', swarm: 'card', flight: 'across', ground: 'rays',
    hue: 'gold', hue2: 'celadon', stance: 'bow', tempo: 'slow', n: 8, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------- 周处 ------ *
   * 英情天逸 — 周处除三害. The village counted three scourges: the tiger on South
   * Mountain, the flood-dragon in the river, and him. He killed the tiger, went
   * into the water after the 蛟 for three days and three nights, and came home
   * to find them celebrating his death — which is when he understood, went to
   * 陆云, and became somebody else. Died in 297 refusing to retreat, shooting
   * until the arrows ran out.
   */

  /**
   * 乡害 — 锁定技: everyone else's hand limit drops by one, and equipment in
   * your hand counts as 酒.
   *
   * The young one, before any of it. NO FIGURE, because a district being
   * ground down does not have a shape: sulphur barbs spilling past every seat
   * at 1.4, the corners closing in, and a man drinking in the middle of it.
   */
  xianghai: {
    figure: 'none', swarm: 'thorn', flight: 'out', ground: 'vignette',
    hue: 'sulphur', hue2: 'ember', stance: 'still', tempo: 'slow', n: 16, spread: 1.4, glyph: true,
  },

  /**
   * 除害 — 使命技: 拼点 with your equipment slots counting for you; win and you
   * strip his hand's categories out of the pile, and every wound you land arms
   * you further. Three pieces on and you heal to full and lose 乡害.
   *
   * The three days in the river. A serpentine thing coiled round the seat and
   * water turning inward with it, verdigris scales and blood in the current,
   * `toll` because the fight went on for three days and the villagers had
   * given up counting.
   */
  chuhai: {
    figure: 'coil', swarm: 'drop', flight: 'curl', ground: 'ripple',
    hue: 'verdigris', hue2: 'blood', stance: 'lunge', tempo: 'toll', n: 12, spread: 0.8, glyph: true,
  },

  /* ---------------------------------------------------------- 朱儁 ------ *
   * 功成师克 — one of the three who put down the Yellow Turbans. At 宛城 he
   * built a mound, made a show of attacking the southwest, and went in over the
   * northeast wall while they were all watching the wrong side.
   */

  /**
   * 佯解 — once a phase, 拼点 with someone; if you LOSE, you may have a third
   * player throw a fire 杀 at the man you just lost to.
   *
   * The feint at Wancheng, and the only skill in the pack that pays out for
   * losing. Two frames, one of them reversed: the siege that looks lifted, and
   * the burning coming across from the side nobody was looking at.
   */
  yangjie: {
    figure: 'mirror', swarm: 'cinder', flight: 'across', ground: 'smoke',
    hue: 'ash', hue2: 'flame', stance: 'turn', tempo: 'slow', n: 8, turn: -10, spread: 1.25, glyph: true,
  },

  /**
   * 厚俸 — once a round, give a player in your reach 整肃, and you BOTH take the
   * reward for it.
   *
   * 轻财好义: he came up poor, kept nothing, and was known for handing his pay
   * to whoever needed it. Coins thrown out and down on a gravity arc into
   * somebody else's seat, amber rather than gold — this is wealth, not power.
   */
  houfeng: {
    figure: 'halo', swarm: 'coin', flight: 'arc', ground: 'bloom',
    hue: 'amber', hue2: 'gold', stance: 'lift', tempo: 'even', n: 10, spread: 1.3, glyph: true,
  },

  /**
   * 拒降 — 限定技: after another player finishes climbing out of dying, you may
   * deal them 1 damage.
   *
   * 韩忠 offered to surrender at Wancheng and Zhu Jun refused it in as many
   * words: taking the surrender of rebels only teaches rebellion. Then he
   * closed the ring — 围师必阙 says leave them a gap, and he did not. A net
   * comes down and draws shut on a man already on the floor, bone and blood,
   * nothing escaping the frame.
   */
  juxiangz: {
    figure: 'net', swarm: 'thorn', flight: 'in', ground: 'dim',
    hue: 'bone', hue2: 'blood', stance: 'still', tempo: 'toll', n: 10, spread: 0.6, glyph: true,
  },

  /* ---------------------------------------------------------- 华歆 ------ *
   * 清素拂浊 — 管宁割席: they turned up a lump of gold hoeing the garden and he
   * picked it up before throwing it away, and Guan Ning cut the mat in two.
   * But also: a stranger begged to travel with his party, Hua Xin alone
   * objected — and when the man became a liability and the others wanted to
   * drop him, Hua Xin was the one who said 既已纳其自托，宁可以急相弃邪.
   */

  /**
   * 仁仕 — once per player per phase, hand a card to another player.
   *
   * Not a lump sum to one man but one card to each in turn, which is the
   * skill and also the reputation. Petals opening from the centre, one to
   * every seat, in the plainest green in the palette — 清素.
   */
  renshih: {
    figure: 'bloom', swarm: 'card', flight: 'out', ground: 'none',
    hue: 'celadon', hue2: 'jade', stance: 'still', tempo: 'even', n: 8, spread: 1.35, glyph: true,
  },

  /**
   * 德报 — 锁定技: whenever someone takes a card of yours, the top of the pile
   * goes to the 仁 zone; at your prep phase you take all of it back.
   *
   * 以德报怨. What leaves him accumulates somewhere behind him and comes back
   * at dawn — rings arriving one after another rather than one arrival, and
   * gold in it for the piece he picked up out of the vegetable bed.
   */
  debao: {
    figure: 'rings', swarm: 'card', flight: 'in', ground: 'bloom',
    hue: 'jade', hue2: 'gold', stance: 'still', tempo: 'slow', n: 9, glyph: true,
  },

  /**
   * 不弃 — 锁定技: someone goes down, you spend two 仁 to stand them back up; if
   * anyone actually dies, all of it is swept away.
   *
   * 宁可以急相弃邪 — "we already took him in; are we to drop him now it is
   * dangerous?" A grey chain reaching across the dark to the far seat with the
   * colour only at the end where he is; the near half of this effect is not
   * warm at all, and Hua Xin was not a warm man.
   */
  buqi: {
    figure: 'chain', swarm: 'card', flight: 'across', ground: 'dim',
    hue: 'ash', hue2: 'peach', stance: 'brace', tempo: 'toll', n: 6, turn: -8, spread: 1.3, glyph: true,
  },

  /* ---------------------------------------------------------- 荀谌 ------ *
   * 谋刃略锋 — Xun Yu's brother, on the wrong side. His one act in the record is
   * being sent to 韩馥 to explain, politely, that Ji Province would be better
   * off as Yuan Shao's, and coming away with it. No army moved.
   */

  /**
   * 谏战 — once a phase, make another player either shoot a weaker third party
   * of your choosing, or hand you a card for not doing it.
   *
   * The whole man: he does not fight, he arranges. Threads across the seat and
   * an arrow leaving along one of them into somebody else's air, ink for the
   * arguing and cinnabar for where it lands.
   */
  jianzhan: {
    figure: 'web', swarm: 'arrow', flight: 'across', ground: 'shade',
    hue: 'ink', hue2: 'cinnabar', stance: 'still', tempo: 'slow', n: 8, turn: -14, spread: 1.35, glyph: true,
  },

  /**
   * 夺冀 — 限定技: discard two cards and take EVERY piece of equipment another
   * player is wearing.
   *
   * 夺冀州: Han Fu opened the gates of Ye and handed over a province to a man
   * who could not have taken it, because Xun Chen sat down with him and went
   * through the reasons. The gates part, everything he was wearing comes in
   * out of the dark, and the seal is the only bright thing in it.
   */
  duoji: {
    figure: 'gate', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'void', hue2: 'gold', stance: 'still', tempo: 'slow', n: 8, spread: 1.2, glyph: true,
  },

  /* ---------------------------------------------------------- 桥公 ------ *
   * 高风硕望 — the old man of Wan whose two daughters married Sun Ce and Zhou Yu
   * on the same day, and who is otherwise a name attached to other people's
   * stories.
   */

  /**
   * 遗珠 — draw two at your end phase, mark two cards as 遗珠 and shuffle them
   * back into the top of the deck; later you may cancel one when another player
   * aims it at a single target.
   *
   * 沧海遗珠 — the pearl left in the sea, which is what the phrase means and
   * also, for this man, literally what he gave away. Pearls dropped into water
   * with the rings still going out over the place they went in.
   */
  yizhu: {
    figure: 'wave', swarm: 'bead', flight: 'fall', ground: 'ripple',
    hue: 'moon', hue2: 'frost', stance: 'still', tempo: 'slow', n: 10, spread: 1.2, glyph: true,
  },

  /**
   * 鸾俦 — clear every 姻 mark, then bind TWO players with it; the pair share
   * 共患.
   *
   * 鸾俦凤侣, the phoenix pair. The two weddings were on one day, so this is
   * the bridal veil rather than a bond drawn between seats: a red silk sheet
   * coming down and the blossom going round the pair at a fixed radius instead
   * of scattering.
   */
  luanchou: {
    figure: 'veil', swarm: 'petal', flight: 'orbit', ground: 'bloom',
    hue: 'plum', hue2: 'peach', stance: 'still', tempo: 'slow', n: 12, spread: 1.2, glyph: true,
  },

  /* ---------------------------------------------------------- 孙翊 ------ *
   * 骁悍激躁 — 有兄策风, the brother most like Sun Ce and with none of the brakes.
   * 张昭 told him to hold his temper. He beat his own officers when he drank,
   * and in 204 two of them and a swordsman came for him after a drinking party,
   * when he was unarmed. His widow 徐氏 spent three months pretending to
   * consent and had them both cut down at his memorial sacrifice.
   */

  /**
   * 躁厉 — 锁定技: you may only play cards you got THIS turn; each card played
   * adds a 厉 up to four; at your turn's start you dump them all, discard, draw
   * for the total, and bleed if you had more than two.
   *
   * A core that fills up and then lets go, with a bleed on the far side of it.
   * The seat cannot keep still (`shiver`) and the field goes red — the whole
   * skill is a temper being stored and paid for.
   */
  zaoli: {
    figure: 'orb', swarm: 'cinder', flight: 'flare', ground: 'wash',
    hue: 'flame', hue2: 'blood', stance: 'shiver', tempo: 'quick', n: 14, spread: 1.2, glyph: true,
  },

  /* ------------------------------------------------------ 王甫赵累 ------ *
   * 忱忠不移 — two men on one card, both of them 关羽's, both dead within days
   * of him. 王甫 warned him not to leave Jing province to 糜芳 and 傅士仁 and
   * threw himself off the wall of 麦城 when it fell; 赵累 was taken with him at
   * 临沮 and executed beside him.
   */

  /**
   * 殉义 — mark another player 义 at game start; a wound to either of you that
   * did not come from the other costs the other a card, a wound either of you
   * deals earns the other one, and when the marked one dies you may pass 义 on.
   *
   * One card with two men on it, and a skill in which everything that happens
   * to one happens to the other. The frame doubled and offset with the tally
   * crossing between the halves, 义 in gold over blood, and the mark simply
   * moves to the next man when the first one is gone.
   */
  xunyi: {
    figure: 'mirror', swarm: 'rune', flight: 'across', ground: 'dim',
    hue: 'blood', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 6, spread: 1.35, glyph: true,
  },

  /* ---------------------------------------------------------- 向宠 ------ *
   * 镇军之岳 — the officer 诸葛亮 stops to name in the 出师表: 性行淑均，晓畅
   * 军事…必能使行阵和睦. At 猇亭 his was the one camp that came out of the fire
   * whole. He died in 240 against the Han-jia tribes and his men carried the
   * body back out.
   */

  /**
   * 固营 — 锁定技, once a turn: lose exactly one card outside your turn and the
   * active player either hands you a card at random or watches you take the one
   * you lost; at your prep phase you pay the tally back.
   *
   * The camp that did not burn. A hexagon drawing itself shut with the stakes
   * of the palisade coming in point-first, in pine — 岳 is a mountain, and the
   * whole appeal of this man is that he is deep, dull and still.
   */
  guying: {
    figure: 'aegis', swarm: 'thorn', flight: 'in', ground: 'dim',
    hue: 'pine', hue2: 'bronze', stance: 'brace', tempo: 'toll', n: 8, spread: 1.1, glyph: true,
  },

  /**
   * 睦阵 — each once a phase: put an equip onto someone and take a card from
   * their hand, or give two cards to an equipped player and take a piece off
   * them.
   *
   * 必能使行阵和睦 — the same sentence of the 出师表 the epithet comes from. Two
   * panels and the one flight that is a round trip, because the skill is
   * literally two exchanges, one going each way, between neighbouring camps.
   */
  muzhen: {
    figure: 'gate', swarm: 'card', flight: 'recoil', ground: 'none',
    hue: 'celadon', hue2: 'bronze', stance: 'still', tempo: 'even', n: 8, spread: 1.2, glyph: true,
  },

  /* ---------------------------------------------------------- 袁涣 ------ *
   * 随车致雨 — the rain that follows a good governor's carriage. Lü Bu ordered
   * him to write a letter abusing Liu Bei, then held a blade on him for saying
   * no,
   * and 袁涣 answered that only virtue can shame a man, never abuse, and that
   * if Liu Bei were a gentleman the words would not touch him and if he were
   * not they would only be traded back. Lü Bu dropped it.
   */

  /**
   * 请决 — once a round, when someone aims a card at a WEAKER player, you may
   * draw and 拼点 the user: win and it is cancelled; lose and it comes to you
   * instead.
   *
   * Stepping in front of a strong man on a weak man's behalf, which is the
   * only thing 袁涣 is remembered for doing. The beam tips over the gap in hp,
   * and the card comes IN to him, which is the losing half and also the point.
   */
  qingjue: {
    figure: 'scale', swarm: 'card', flight: 'in', ground: 'shade',
    hue: 'azure', hue2: 'bone', stance: 'brace', tempo: 'even', n: 6, spread: 1.25, glyph: true,
  },

  /**
   * 奉节 — 锁定技: name another player at your prep phase and, at every end
   * phase until your next turn, draw or discard to match their hp.
   *
   * 随车致雨, and a man who keeps measuring himself against somebody else all
   * the way round the table. Grey rain drawn down over the seat and settling
   * short of the frame — this is the quietest effect in the pack and the only
   * one that repeats all round the turn.
   */
  fengjie: {
    figure: 'veil', swarm: 'drop', flight: 'fall', ground: 'smoke',
    hue: 'ash', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 14, spread: 0.7, glyph: true,
  },

  /* -------------------------------------------------------- 张仲景 ------ *
   * 医理圣哲 — 张机, the 医圣. His own preface says his clan was over two hundred
   * strong and lost two-thirds of them to fever inside ten years, and that this
   * is why he sat down and wrote 《伤寒杂病论》. The tradition has him opening
   * the hall of the Changsha governor's office on the first and the fifteenth
   * and treating whoever came, which is where 坐堂 for a doctor comes from.
   */

  /**
   * 济世 — 锁定技: any card of yours that resolves without hurting anybody goes
   * into the 仁 zone, and you draw when one of them is spent on somebody.
   *
   * 医理: what he actually did was put medicine in ORDER. So the figure is the
   * hundred-drawer herb cabinet — a grid closing and locking, everything
   * harmless filed into it, in the plainest celadon.
   */
  jishi: {
    figure: 'lattice', swarm: 'card', flight: 'in', ground: 'bloom',
    hue: 'celadon', hue2: 'jade', stance: 'still', tempo: 'slow', n: 8, spread: 0.6, glyph: true,
  },

  /**
   * 疗疫 — at another player's turn start, top them up out of the 仁 zone if
   * they are short of their hp, or take the surplus off them into it if they
   * are over.
   *
   * 伤寒 going through a household, and the man walking it back seat by seat.
   * The two colours ARE the two halves of the skill: sulphur for the fever
   * crossing the table and jade for what he puts against it.
   */
  liaoyi: {
    figure: 'wave', swarm: 'drop', flight: 'across', ground: 'smoke',
    hue: 'sulphur', hue2: 'jade', stance: 'still', tempo: 'slow', n: 12, spread: 1.35, glyph: true,
  },

  /**
   * 病论 — once a phase, spend a 仁 card to let someone either draw now or
   * recover 1 at the end of their next turn.
   *
   * 《伤寒杂病论》 itself: a prescription written out, and the choice in the
   * rules text is the prescription's two lines — take it now, or take it
   * tomorrow. Ink for the writing, peach for what is in the pills.
   */
  binglun: {
    figure: 'strokes', swarm: 'bead', flight: 'across', ground: 'none',
    hue: 'ink', hue2: 'peach', stance: 'still', tempo: 'even', n: 6, spread: 1.2, glyph: true,
  },
};
