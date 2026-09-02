/**
 * The SP pack: a hundred and fifty-five skills, belonging mostly to people the
 * standard box has no room for — a father, a wife, a gatekeeper, a clerk of
 * grain — plus a handful of alternate takes on faces the player already knows.
 *
 * The alternates are the hard ones and they are designed against the standard
 * set rather than alongside it. SP 甄姬 is the scholar who read her brothers'
 * books, not the goddess of the Luo, so she gets no veil; SP 曹操 is the
 * twenty-year-old sheriff of North Luoyang with his five-coloured staves, not
 * the 奸雄 with the web; 郭女王 is the woman who replaced 甄姬 and her motif is
 * the mark of favour moving off one seat and onto another. Everything else is
 * built the same way: read the rules text first, then the man's own life, and
 * let the two agree before drawing anything.
 */
import type { Motif } from '../motif';

export const SP: Readonly<Record<string, Motif>> = {
  /**
   * 丁原 · 备诛 — look at a hand; if it holds 杀, they use them all on you in
   * turn; otherwise discard one of their cards and hand them a 杀.
   *
   * 饲虎成患 — he fed the tiger. He raised 吕布, made him his 主簿, and 董卓
   * bought him with 赤兔 and a promise. A lens opens on somebody's hand, and
   * the blades that are in it come back through it one at a time — `toll`,
   * because 依次 means counted, not scattered.
   */
  beizhu: {
    figure: 'eye', swarm: 'blade', flight: 'in', ground: 'dim',
    hue: 'ash', hue2: 'blood', stance: 'brace', tempo: 'toll', n: 6, glyph: true,
  },

  /* ---- 傅佥, who held 阳安关 when 蒋舒 walked out of it and surrendered, and
     died on the wall rather than follow him. 危汉绝勇. ------------------ */

  /**
   * 破降 — give a card away, draw three, then shed every "绝" and lose 1 hp.
   *
   * The name is an order: BREAK the surrender. He spends the whole shell he has
   * been accumulating in one movement, so the two panels of the gate his
   * colleague opened are blown apart and the plating goes with them.
   */
  poxiang: {
    figure: 'gate', swarm: 'shard', flight: 'out', ground: 'shade',
    hue: 'bronze', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 14, glyph: true,
  },

  /**
   * 绝勇 — 锁定技. Cancel a card that targets you alone, keep it as "绝"; at the
   * end phase every 绝 is handed back to its owner to use on you again.
   *
   * The other half of the same stand: nothing gets through, and then all of it
   * gets through at once. `recoil` is the only flight that is a round trip and
   * this is the only skill in the pack that is literally one.
   */
  jueyong: {
    figure: 'aegis', swarm: 'card', flight: 'recoil', ground: 'frost',
    hue: 'silver', hue2: 'cinnabar', stance: 'brace', tempo: 'toll', n: 7, glyph: true,
  },

  /* ---- 公孙康, who ruled Liaodong at the end of the world, killed his father's
     killers, and sent 袁尚's head to 曹操 in a box rather than shelter him. -- */

  /**
   * 据辽 — 锁定技. Everyone else's distance to you is X longer.
   *
   * Liaodong is the far cold corner and the skill is nothing but that distance,
   * so the wave that leaves the seat is a ground-wave that flattens as it goes
   * and pushes the whole table back out of reach. `spread: 1.4` is the point.
   */
  juliao: {
    figure: 'wave', swarm: 'dust', flight: 'out', ground: 'vignette',
    hue: 'frost', hue2: 'bone', stance: 'brace', tempo: 'slow', n: 10, spread: 1.4, glyph: true,
  },

  /**
   * 讨灭 — mark a character; you and the mark are in each other's range, and you
   * hit them harder or take a card off them.
   *
   * A feud, held open on purpose. The chain runs across to another seat and
   * stays there, and it moves when the mark moves — barbed, because nothing
   * about 讨灭 is a bond.
   */
  taomie: {
    figure: 'chain', swarm: 'thorn', flight: 'across', ground: 'shade',
    hue: 'ember', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 9, turn: 10, spread: 1.35, glyph: true,
  },

  /* ---- 关索, 关羽's third son in the novel and in no history at all, who comes
     down out of the mountains with three wives and his father's blade. ---- */

  /**
   * 征南 — when someone dies, draw three and take one of 武圣 / 当先 / 制蛮.
   *
   * The southern campaign, and an inheritance: the man in front falls and the
   * son picks the standard up. It unrolls, and what he takes comes IN to him.
   */
  zhengnan: {
    figure: 'banner', swarm: 'card', flight: 'in', ground: 'rays',
    hue: 'pine', hue2: 'gold', stance: 'lift', tempo: 'even', n: 6, glyph: true,
  },

  /**
   * 撷芳 — 锁定技. Distance to others shortened by the number of women at table.
   *
   * 撷芳 is plucking the flowering branch, and the joke of the skill is that the
   * women are what closes the distance. Petals gather INWARD — `curl` is around
   * and in, which is the movement of a hand picking rather than a wind blowing.
   */
  xiefang: {
    figure: 'bloom', swarm: 'petal', flight: 'curl', ground: 'smoke',
    hue: 'plum', hue2: 'peach', stance: 'turn', tempo: 'even', n: 14, spread: 0.7, glyph: true,
  },

  /**
   * 胡车儿 · 盗戟 — discard a non-basic, take an equip off somebody and use it;
   * if it was a weapon, they bleed for it.
   *
   * 宛城. He drank with 典韦 all evening and carried the twin halberds out of the
   * tent while he slept, and in the morning 典韦 had nothing to fight with and
   * died in the gateway. The disc goes dark, and the bronze comes out of it.
   */
  daoji: {
    figure: 'moon', swarm: 'blade', flight: 'out', ground: 'dim',
    hue: 'void', hue2: 'bronze', stance: 'lunge', tempo: 'quick', n: 8, turn: -14, glyph: true,
  },

  /* ---- 胡金定, the bandit chief's daughter who fought 关索 to a standstill,
     married him on the spot, and in the folk plays is pregnant throughout. -- */

  /**
   * 仁释 — 锁定技. Wounded, a 杀 that would hurt you is prevented; you take the
   * card and 1 point of your maximum health goes with it.
   *
   * 仁释 is the release granted out of mercy, and it is granted by her, to the
   * man swinging. A sleeve comes down between them and the stroke stops inside
   * it. Nothing travels; she pays, and the frame loses colour.
   */
  renshi: {
    figure: 'veil', swarm: 'blade', flight: 'in', ground: 'dim',
    hue: 'peach', hue2: 'blood', stance: 'wilt', tempo: 'slow', n: 6, spread: 0.6, glyph: true,
  },

  /**
   * 武缘 — hand somebody a 杀; you heal, they draw, and a red or unusual 杀 pays
   * them more.
   *
   * They met by fighting each other. 武缘 is a marriage contracted through arms,
   * so the red cord winds round the seat and what goes out along it is a blade.
   */
  wuyuan: {
    figure: 'coil', swarm: 'blade', flight: 'out', ground: 'bloom',
    hue: 'rouge', hue2: 'silver', stance: 'blush', tempo: 'even', n: 6, glyph: true,
  },

  /**
   * 怀子 — 锁定技. Your hand limit is your maximum health.
   *
   * 怀子 is carrying a child. The one flight that does not go anywhere is
   * `hover`, and `spread: 0.5` keeps every mote inside the portrait: this is the
   * only motif in the pack whose whole content is that nothing leaves her.
   */
  huaizi: {
    figure: 'orb', swarm: 'mote', flight: 'hover', ground: 'bloom',
    hue: 'peach', hue2: 'dawn', stance: 'still', tempo: 'slow', n: 8, spread: 0.5, glyph: true,
  },

  /* ---- 来敏, the scholar with the ungovernable mouth, demoted three times for
     it, and still alive at ninety-seven when everyone he had insulted was not. */

  /**
   * 来寿 — fatal damage is prevented and converted into maximum health, until
   * that reaches nine and the next prepare phase kills you.
   *
   * A pun on his own surname: 来, and longevity. The beam takes the blow on one
   * side and the years pile on the other, and the count is what finally goes
   * over — `toll`, and it swells rather than braces.
   */
  laishou: {
    figure: 'scale', swarm: 'bead', flight: 'rise', ground: 'dim',
    hue: 'bone', hue2: 'jade', stance: 'swell', tempo: 'toll', n: 9, glyph: true,
  },

  /**
   * 乱群 — everyone reveals a hand card; you take the ones that match your
   * colour, and everyone who does not match must aim their next 杀 at you.
   *
   * 悖骴乱群 is the wording of the impeachment against him — corrupting the dead,
   * disordering the flock. He turns the entire table against himself with one
   * sentence, so this is a sulphur-coloured ring of cards leaving on a spiral
   * and crossing into everybody's air at once.
   */
  luanqun: {
    figure: 'rings', swarm: 'card', flight: 'flare', ground: 'ripple',
    hue: 'sulphur', hue2: 'ash', stance: 'turn', tempo: 'quick', n: 14, spread: 1.4, glyph: true,
  },

  /* ---- 李丰 of Shu, 李严's son, 朱提太守: a quartermaster, whose two skills are
     a full granary and an empty road. --------------------------------- */

  /**
   * 屯储 — draw two extra, then stash any number of cards as "粮"; while you
   * hold 粮 you cannot use 杀.
   *
   * A store is a grid that shuts, and the grain moves inward and stops. He is
   * braced over it and nothing leaves the frame, which is exactly the cost.
   */
  tunchu: {
    figure: 'lattice', swarm: 'bead', flight: 'in', ground: 'none',
    hue: 'amber', hue2: 'bronze', stance: 'brace', tempo: 'even', n: 9, glyph: true,
  },

  /**
   * 输粮 — at someone's end phase, spend a 粮 and they draw two.
   *
   * The other half, and deliberately the mirror movement of it: the grain leaves
   * on ONE heading, along one road, to one seat. `jet` rather than `out` — a
   * convoy that fans out has been ambushed.
   */
  shuliang: {
    figure: 'sweep', swarm: 'bead', flight: 'jet', ground: 'none',
    hue: 'amber', hue2: 'jade', stance: 'lift', tempo: 'slow', n: 12, turn: 8, spread: 1.3, glyph: true,
  },

  /**
   * 曹操(群) · 令法 — for the first two rounds impose a law on everybody; after
   * that you lose the skill and become 治暗 and 奸雄 instead.
   *
   * 峥嵘而立: this is the twenty-year-old 洛阳北部尉, who hung five-coloured
   * staves at every gate of the city and beat 蹇硕's uncle to death with one for
   * breaking curfew. A rank of staves stands up in sequence and the edicts go
   * out over the whole table — and then it expires, which is the history too.
   * Nothing here is the web: he has not become that man yet.
   */
  lingfa: {
    figure: 'pillars', swarm: 'rune', flight: 'out', ground: 'wash',
    hue: 'ink', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 10, spread: 1.35, glyph: true,
  },

  /* ---- 司马昭, of whom 曹髦 said 司马昭之心，路人皆知 — his intent is known to
     every man in the street — shortly before being cut down in it. ------- */

  /**
   * 昭心 — stash up to three cards as "望" in the open; anyone in your range may
   * take one at the end of their draw phase, and then you may hurt them.
   *
   * The bait is displayed. So: a gold arc opens over the seat like a virtue and
   * what hangs in it is coin — everyone can see the offer, everyone can see the
   * hook, and it works anyway.
   */
  zhaoxin: {
    figure: 'halo', swarm: 'coin', flight: 'out', ground: 'rays',
    hue: 'gold', hue2: 'blood', stance: 'still', tempo: 'even', n: 6, glyph: true,
  },

  /**
   * 怠攻 — reveal your whole hand and the attacker must find a suit you are not
   * holding, or the damage is prevented.
   *
   * 怠攻 is making an assault go slack. The hand opens like a fan and then
   * nothing happens: `hover` at `spread: 0.55` keeps every card inside the
   * frame, and the blow dies in the room rather than on a shield.
   */
  daigong: {
    figure: 'fan', swarm: 'card', flight: 'hover', ground: 'dim',
    hue: 'ink', hue2: 'silver', stance: 'brace', tempo: 'slow', n: 8, spread: 0.55, glyph: true,
  },

  /**
   * 于禁(群) · 镇军 — give a card away and require a 杀 of the man you gave it
   * to; if he refuses, you hurt him or someone he can reach.
   *
   * 逐暴定乱. When his own troops looted at 宛, he executed them himself and
   * finished pitching camp before he went to explain it to 曹操. This is the
   * drum: one hard ring, orders going out on it across the table, and the sword
   * swung by somebody else's arm because that is what discipline is.
   */
  zhenjun: {
    figure: 'ring', swarm: 'slip', flight: 'out', ground: 'shade',
    hue: 'ash', hue2: 'cinnabar', stance: 'brace', tempo: 'toll', n: 8, spread: 1.3, glyph: true,
  },

  /* ---- 甄姬(群), 明珠锦玉 — not the vision on the far bank of the Luo but the
     girl who read her brothers' books and was told she wanted to be a 女博士,
     and answered 古者贤女，必览前世成败. No veils in either of these. ----- */

  /**
   * 博鉴 — 锁定技. If the count and the suits of what you played this phase both
   * differ from last phase, draw two; otherwise give away a card you used.
   *
   * The skill is a comparison of this page against the previous one, which is
   * what wide reading is. `mirror` doubles the frame and reverses one copy, and
   * the bamboo slips cross between the two halves.
   */
  bojian: {
    figure: 'mirror', swarm: 'slip', flight: 'across', ground: 'none',
    hue: 'celadon', hue2: 'ink', stance: 'still', tempo: 'slow', n: 6, glyph: true,
  },

  /**
   * 济危 — draw whenever the table has bled or lost cards; and when your hand is
   * too full, deal the majority colour out to everybody else.
   *
   * 乱世求宝，是无罪而怀璧也 — she made her family open the grain stores in the
   * 建安 famine, on the argument that hoarding in a bad year is the only crime
   * you need. So the flower opens on the two-beat: it takes in what the table
   * has dropped, and then it gives all of it away.
   */
  jiwei: {
    figure: 'bloom', swarm: 'coin', flight: 'recoil', ground: 'dim',
    hue: 'jade', hue2: 'bone', stance: 'lift', tempo: 'slow', n: 12, spread: 1.3, glyph: true,
  },

  /**
   * 毛玠 · 秉清 — each new suit you play this phase is recorded; at two suits
   * somebody draws, at three you discard from someone, at four you deal damage.
   *
   * 清公素履 — plain shoes, no私. He ran appointments for 曹操 and would promote
   * only the frugal, and the record says 天下之士莫不以廉节自励, the whole realm
   * started dressing plainly to get hired. Four cold marks laid down one at a
   * time, `n: 4` for the four suits, frost creeping in behind. Nothing scatters.
   */
  bingqing: {
    figure: 'strokes', swarm: 'rune', flight: 'rise', ground: 'frost',
    hue: 'frost', hue2: 'ink', stance: 'still', tempo: 'even', n: 4, spread: 0.7, glyph: true,
  },

  /* ---- 马元义, who was to raise 洛阳 for the 太平道 and was given up by 唐周,
     and was torn apart by chariots in the market before the rising began. -- */

  /**
   * 集兵 — give up your draw and stack the top two cards as "兵" instead; a 兵
   * can be played as a 杀 or a 闪.
   *
   * 苍天已死，黄天当立. A spear wall going up in ranks, in sulphur — the Yellow
   * Heaven is a colour before it is anything else — and what stands up in it is
   * sharpened farm tools, coming in off the table rather than out of the deck.
   */
  jibing: {
    figure: 'pillars', swarm: 'thorn', flight: 'in', ground: 'dim',
    hue: 'sulphur', hue2: 'ember', stance: 'brace', tempo: 'toll', n: 8, glyph: true,
  },

  /**
   * 往京 — 锁定技. Spending a 兵 against the healthiest man at the table draws.
   *
   * He went up to the capital himself to fix the date with the eunuchs inside
   * the palace. One wedge on one heading, lances following it down the same
   * line into the biggest thing in the room, and no spread at all.
   */
  wangjingm: {
    figure: 'wedge', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'ember', hue2: 'sulphur', stance: 'lunge', tempo: 'quick', n: 7, turn: -12, spread: 1.35, glyph: true,
  },

  /**
   * 谋篡 — 觉醒技. Enough 兵 stacked, and you lose a point of maximum health and
   * gain 兵祸.
   *
   * The 太平道 was a church before it was an army — 符水, incantations, the
   * character 甲子 chalked on the palace gates. An awakening is the one moment
   * where the seal finishes turning, so: the sigil, embers leaving it on a
   * spiral, and the black of the plot under the yellow of the faith.
   */
  moucuan: {
    figure: 'sigil', swarm: 'cinder', flight: 'flare', ground: 'smoke',
    hue: 'void', hue2: 'sulphur', stance: 'swell', tempo: 'slow', n: 12, glyph: true,
  },

  /**
   * 马忠(蜀) · 抚蛮 — give a 杀 to somebody and draw when they use it.
   *
   * 笑合南中. He governed 南中 for years by handing the tribes their own
   * authority back, and when he died the 夷 wept and built him shrines they kept
   * up for generations. A slow green wave rolling out over the south, and what
   * rides out on it is a weapon he is giving away rather than using.
   */
  fuman: {
    figure: 'wave', swarm: 'blade', flight: 'out', ground: 'smoke',
    hue: 'pine', hue2: 'amber', stance: 'still', tempo: 'slow', n: 8, spread: 1.3, glyph: true,
  },

  /* ---- 鲍三娘, 慕花之姝 — 关索's wife in the plays, who beat him in single
     combat before she married him and died holding 葭萌关. --------------- */

  /**
   * 姝勇 — when you use or play a 杀, take a card out of somebody's area; take a
   * second from the same person this round and they draw.
   *
   * A beauty with a blade, and the name says both halves in two characters. The
   * crescent goes across the frame and what comes off it is blossom.
   */
  shuyong: {
    figure: 'crescent', swarm: 'petal', flight: 'across', ground: 'wash',
    hue: 'plum', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 9, turn: -18, glyph: true,
  },

  /**
   * 许身 — 限定技. Draw up to three and lose that much health; if that nearly
   * kills you, whoever pulls you back gets 武圣, 当先 or 制蛮 for it.
   *
   * 许身 is pledging your own body — the word for a betrothal and for a life
   * spent. The links draw taut, the blood goes out on them, and she wilts. The
   * `toll` rhythm counts the three cards the way it counts three wounds.
   */
  mobile__xushen: {
    figure: 'chain', swarm: 'drop', flight: 'out', ground: 'vignette',
    hue: 'blood', hue2: 'rouge', stance: 'wilt', tempo: 'toll', n: 10, turn: -6, glyph: true,
  },

  /**
   * 镇南 — when a trick aimed at a crowd includes you, discard one card and put
   * one point of damage into somebody.
   *
   * She was killed on the wall at 葭萌关, which is where 镇南 comes from: the
   * garrison in the way. A grid locks across the frame and one barb goes back
   * out through it along a single heading.
   */
  mobile__zhennan: {
    figure: 'lattice', swarm: 'thorn', flight: 'jet', ground: 'shade',
    hue: 'bronze', hue2: 'cinnabar', stance: 'brace', tempo: 'quick', n: 8, turn: 16, glyph: true,
  },

  /* ---- 鲍信, 坚朴的忠相, who told 曹操 that 袁绍 would be the next 董卓 and
     was not believed, and died at 兖州 recovering 曹操's body from the Yellow
     Turbans. They never found his — 曹操 had a wooden one carved and wept at it. */

  /**
   * 募讨 — a character stacks every 杀 in his hand and passes them one by one
   * round the table from his left, and the last man to receive them bleeds.
   *
   * A levy going round the circuit, seat by seat, and someone at the end of it
   * pays. `orbit` is the only flight that travels round the table rather than
   * away from it, and `spread: 1.4` puts it in everybody's air.
   */
  mobile__mutao: {
    figure: 'ring', swarm: 'blade', flight: 'orbit', ground: 'dim',
    hue: 'bronze', hue2: 'blood', stance: 'brace', tempo: 'toll', n: 10, spread: 1.4, glyph: true,
  },

  /**
   * 毅谋 — when a neighbour is hurt, either hand him a 杀 out of the deck or
   * have him pass a card on and draw.
   *
   * 毅谋 is steadfast counsel, and his was correct and ignored every time he
   * gave it. A beam tips between two options and the advice goes out as written
   * slips; he bows rather than strikes, and it barely leaves the seat.
   */
  mobile__yimou: {
    figure: 'scale', swarm: 'slip', flight: 'out', ground: 'none',
    hue: 'ash', hue2: 'jade', stance: 'bow', tempo: 'even', n: 6, spread: 0.8, glyph: true,
  },

  /* ---- 曹嵩, 舆金贾权 — the eunuch's adopted son who bought the office of 太尉
     for a hundred million cash and was murdered on the road with the carts. -- */

  /**
   * 亿金 — six "金" tokens; run out and you die at the start of your turn. Each
   * play phase you give one away, with the effect that comes attached.
   *
   * The fortune fans out to whoever will take it, one coin at a time, counted
   * on the `toll` rhythm because the count is the whole tension of the skill.
   * He does not move; the money does.
   */
  yijin: {
    figure: 'fan', swarm: 'coin', flight: 'out', ground: 'rays',
    hue: 'gold', hue2: 'amber', stance: 'still', tempo: 'toll', n: 12, spread: 1.35, glyph: true,
  },

  /**
   * 惯纵 — make one other character deal a point of damage to another.
   *
   * 惯纵 is the indulgence that spoils a child; his money paid for a 游侠
   * adolescence that other people bled for. Two other seats, one of them a
   * reversed copy of the other, a coin crossing between them — and the man whose
   * skill it is stands perfectly still through all of it.
   */
  guanzong: {
    figure: 'mirror', swarm: 'coin', flight: 'across', ground: 'shade',
    hue: 'amber', hue2: 'blood', stance: 'still', tempo: 'even', n: 5, turn: 8, spread: 1.4, glyph: true,
  },

  /* ---- 曹婴, 龙城凤鸣 — a 曹 of the late line who exists in this game and
     almost nowhere else, and whose two skills are both about knowing what is in
     somebody else's hand. ---------------------------------------------- */

  /**
   * 凌人 — guess which categories a target is holding; guess well and the damage
   * goes up, you draw, and you borrow 奸雄 and 行殇 outright.
   *
   * 凌人 is looking down on people from a height. The hand is netted and read
   * and pulled in, in the violet of an omen — this is a guess that keeps coming
   * out right, which is a more unpleasant thing than a scheme.
   */
  mobile__lingren: {
    figure: 'net', swarm: 'card', flight: 'in', ground: 'vignette',
    hue: 'violet', hue2: 'gold', stance: 'lunge', tempo: 'quick', n: 9, glyph: true,
  },

  /**
   * 伏间 — 锁定技. At the end phase you see some of one player's hand at random.
   *
   * 伏间 is the agent already in place. A lens opens in the dark and holds, dust
   * hanging in it, `spread: 0.55` so that nothing at all leaves the frame —
   * this skill takes nothing and announces nothing, it only looks.
   */
  mobile__fujian: {
    figure: 'eye', swarm: 'dust', flight: 'hover', ground: 'smoke',
    hue: 'ink', hue2: 'ash', stance: 'still', tempo: 'slow', n: 8, spread: 0.55, glyph: true,
  },

  /* ---- 陈登, 雄气壮节 — 湖海之士，豪气不除, said 刘备 of him. He handed 吕布
     to 曹操, held 广陵 against 孙策, and died at thirty-nine of the parasite he
     got from eating raw river fish, which 华佗 had warned him about. ----- */

  /**
   * 周旋 — name a card type for another player; if his next card matches, you
   * look at the top three and deal them out to whoever you like.
   *
   * 周旋 is manoeuvring around a man rather than at him. An arm of light turns
   * about the seat and the cards come round and inward with it — `curl`, the
   * prediction closing on him — and the payoff is arranging other people's luck.
   */
  mobile__zhouxuanz: {
    figure: 'spiral', swarm: 'card', flight: 'curl', ground: 'none',
    hue: 'azure', hue2: 'celadon', stance: 'turn', tempo: 'even', n: 9, glyph: true,
  },

  /**
   * 丰积 — 锁定技. Hold as many cards as you ended last turn with and draw three,
   * with your hand limit raised to your maximum health.
   *
   * At 广陵 he built the 陈公塘 and filled the granaries, which is the only
   * reason the city held. Water and grain standing behind a wall: a sheet drawn
   * across the seat, the store rising inside it, and nothing spilled.
   */
  mobile__fengji: {
    figure: 'veil', swarm: 'bead', flight: 'in', ground: 'ripple',
    hue: 'verdigris', hue2: 'amber', stance: 'swell', tempo: 'slow', n: 9, spread: 0.6, glyph: true,
  },

  /* ---- 陈珪, 弄辞巧掇 — 陈登's father, who talked 吕布 out of the 袁术
     marriage alliance with nothing but conversation, and outlived him. ---- */

  /**
   * 诡谋 — 锁定技. Keep a standing note of whoever has used, discarded or gained
   * the fewest cards; at your prepare phase you look at his hand and take one.
   *
   * Quiet bookkeeping on the whole table, and then one hand goes in. The web is
   * spun wide — `spread: 1.3` — and what travels along it is written slips
   * coming home, not silk going out. He never rises from the chair.
   */
  guimou: {
    figure: 'web', swarm: 'slip', flight: 'in', ground: 'dim',
    hue: 'ash', hue2: 'violet', stance: 'still', tempo: 'slow', n: 8, spread: 1.3, glyph: true,
  },

  /**
   * 州贤 — 锁定技. Attacked, you turn three cards face up and the attacker must
   * pay one of those types or lose the target.
   *
   * 州贤 is the elder of the province, and the defence is entirely procedural:
   * three cards stood up in a row, in sequence, and a demand. `n: 3` is the
   * three cards; they hover and nothing is thrown at anybody.
   */
  zhouxian: {
    figure: 'pillars', swarm: 'card', flight: 'hover', ground: 'wash',
    hue: 'celadon', hue2: 'bone', stance: 'still', tempo: 'even', n: 3, spread: 0.6, glyph: true,
  },

  /* ---- 邓芝, 绝境外交家 — the envoy sent to 吴 after 夷陵 with nothing to
     offer. 孙权 kept him waiting beside a cauldron of boiling oil; he walked up
     to it and remarked that he had not expected Wu to boil an envoy today. -- */

  /**
   * 急盟 — take one card off another player, then hand him as many cards back as
   * you have health.
   *
   * The terms of that alliance exactly: one thing taken, far more given, and
   * both sides better off than the alternative. The gate between two courts
   * opens, cards go over and one comes back, and the cauldron burns behind him.
   */
  mobile__jimeng: {
    figure: 'gate', swarm: 'card', flight: 'recoil', ground: 'rays',
    hue: 'flame', hue2: 'jade', stance: 'bow', tempo: 'quick', n: 10, spread: 1.35, glyph: true,
  },

  /**
   * 率言 — at the discard phase show your whole hand and make somebody give you
   * a card.
   *
   * 臣此来，亦欲为吴，不但为蜀也 — I came for Wu's sake as much as Shu's — which
   * is the sentence that got the treaty. 率言 is speech with nothing held back:
   * everything laid out plainly in three strokes, and the concession comes in
   * across the table.
   */
  mobile__shuaiyan: {
    figure: 'strokes', swarm: 'card', flight: 'in', ground: 'none',
    hue: 'bone', hue2: 'azure', stance: 'lift', tempo: 'quick', n: 5, spread: 1.3, glyph: true,
  },

  /* ---- 董白, 魔姬 — 董卓's granddaughter, given a marquisate at fifteen with
     her own seal and carriage, and executed with the whole clan at 郿坞 before
     she was old enough for it to have been her fault. ------------------- */

  /**
   * 连诛 — show a card and give it away; you may hit whoever holds it without
   * limit, and holding it forces him to pay or pass it on to his neighbour.
   *
   * 连诛 is the legal term for putting a family to death together, which is how
   * she died. So it is a chain running the whole circuit of the table, a marked
   * card going hand to hand round it, and whoever is holding it when the beat
   * lands is the one who is condemned.
   */
  mobile__lianzhu: {
    figure: 'chain', swarm: 'card', flight: 'orbit', ground: 'vignette',
    hue: 'blood', hue2: 'void', stance: 'still', tempo: 'toll', n: 8, spread: 1.4, glyph: true,
  },

  /**
   * 黠慧 — 锁定技. Your black cards are free of the hand limit, and anyone who
   * takes one cannot use, play or discard it until he loses health.
   *
   * A clever child's gift that turns out to be a curse. The serpent winds round
   * the seat and the cards it gives out simply stop where they land: `hover` at
   * `spread: 0.6`, because nothing she hands you ever goes anywhere.
   */
  mobile__xiahui: {
    figure: 'coil', swarm: 'card', flight: 'hover', ground: 'dim',
    hue: 'void', hue2: 'rouge', stance: 'still', tempo: 'slow', n: 9, spread: 0.6, glyph: true,
  },

  /**
   * 董承 · 承诏 — having gained two cards this turn, 拼点 with someone; win, and
   * it counts as a 杀 that ignores armour.
   *
   * 衣带诏 — the edict 献帝 wrote in blood and sewed into a girdle to get it out
   * of the palace past 曹操. 承诏 is receiving it. The banner unrolls, and what
   * goes out along it is a blade that no armour is allowed to stop.
   */
  chengzhao: {
    figure: 'banner', swarm: 'blade', flight: 'jet', ground: 'dim',
    hue: 'gold', hue2: 'blood', stance: 'lunge', tempo: 'toll', n: 7, turn: -10, spread: 1.3, glyph: true,
  },

  /* ---- 傅肜, 危汉烈义 — 傅佥's father, who held the rear at 夷陵 so 刘备 could
     get out, and when he was called on to surrender shouted 吴狗！何有汉将军降
     者！ and died where he stood. ---------------------------------------- */

  /**
   * 血卫 — mark someone secretly; the first damage they take, you take instead,
   * and you hand the same back to the source.
   *
   * The rearguard: a hexagon drawn shut over ANOTHER seat — `spread: 1.35`, it
   * is not his own body he is covering — and the blood goes in and comes back
   * out along the same line.
   */
  mobile__xuewei: {
    figure: 'aegis', swarm: 'drop', flight: 'recoil', ground: 'shade',
    hue: 'blood', hue2: 'ember', stance: 'brace', tempo: 'quick', n: 10, spread: 1.35, glyph: true,
  },

  /**
   * 烈斥 — 锁定技. When you go down, whoever put you there discards a card.
   *
   * 烈斥 is the shouted rebuke, and his is on the record. A last stroke goes
   * across the frame, takes something off the man who did it, and the seat
   * darkens at the edges as he sags.
   */
  mobile__liechi: {
    figure: 'sweep', swarm: 'shard', flight: 'across', ground: 'vignette',
    hue: 'cinnabar', hue2: 'bone', stance: 'wilt', tempo: 'quick', n: 8, turn: 22, spread: 1.3, glyph: true,
  },

  /* ---- 甘夫人, 昭烈皇后 — 刘备's first wife, who carried 阿斗 through 长坂.
     He kept a white jade figure by her bed and looked from one to the other,
     until she said 昔子罕不以玉为宝，春秋美之。今吴魏未夷，安可以妖玩经心！
     and he smashed it. ------------------------------------------------- */

  /**
   * 智诫 — reveal a card in somebody's hand at the start of his play phase; if
   * he keeps playing that type he draws and then pays for it, and if he came out
   * ahead you both draw.
   *
   * The admonition, held up rather than thrown. The white jade stands in the
   * air in front of him, cold, pulsing where it is, `spread: 0.6` — a warning is
   * only ever offered, and this one was taken.
   */
  zhijie: {
    figure: 'orb', swarm: 'glint', flight: 'hover', ground: 'frost',
    hue: 'frost', hue2: 'jade', stance: 'still', tempo: 'slow', n: 7, spread: 0.6, glyph: true,
  },

  /**
   * 淑慎 — once each turn: heal, and somebody draws two; gain more than one
   * card, and somebody heals.
   *
   * 淑慎其身 out of the 诗经. Everything in the skill is done for other people,
   * so the arc opens over her head and comes DOWN across the table onto the
   * other seats. She bows into it rather than rising.
   */
  mobile__shushen: {
    figure: 'halo', swarm: 'drop', flight: 'fall', ground: 'bloom',
    hue: 'peach', hue2: 'dawn', stance: 'bow', tempo: 'slow', n: 9, spread: 1.3, glyph: true,
  },

  /* ---- 关银屏, 武姬 — 关羽's daughter, the one 孙权 asked for and was answered
     虎女安肯嫁犬子乎. In the Sichuan legends she got out of 荆州 and spent the
     rest of her life in the hills at 都江堰. ---------------------------- */

  /**
   * 雪恨 — on your first damage each turn, show as many cards as you have wounds
   * and they all become unlimited 杀 until they have drawn blood.
   *
   * 雪恨 is washing out a hatred, and hers is her father's. The hand fans open
   * and every card in it is a killing: frost for 雪, and the blood is what the
   * cards turn into. The count is her injuries.
   */
  mobile__xuehen: {
    figure: 'fan', swarm: 'card', flight: 'out', ground: 'wash',
    hue: 'frost', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 9, turn: -14, glyph: true,
  },

  /**
   * 虎啸 — a point of fire damage into anybody at least as healthy as you, or no
   * distance limit for the turn.
   *
   * 虎女. Where her uncle 张飞's roar is nested rings on a slow count, hers is
   * ONE hard ring, fast, thrown out past the far seats — a shout that reaches
   * anyone, which is exactly what the second option of the skill grants.
   */
  mobile__huxiao: {
    figure: 'ring', swarm: 'cinder', flight: 'out', ground: 'bloom',
    hue: 'flame', hue2: 'gold', stance: 'lunge', tempo: 'quick', n: 12, spread: 1.4, glyph: true,
  },

  /**
   * 武继 — 限定技. Improve 雪恨 for the phase; do well enough and the improvement
   * is permanent.
   *
   * 武继 is inheriting the line. The seal turns and locks, the green of 关羽 and
   * the red of 关羽 set into it together, everything drawn INWARD — this is the
   * one skill of hers that is about taking a name rather than swinging it.
   */
  mobile__wuji: {
    figure: 'sigil', swarm: 'rune', flight: 'in', ground: 'rays',
    hue: 'pine', hue2: 'cinnabar', stance: 'lift', tempo: 'toll', n: 8, spread: 0.7, glyph: true,
  },

  /* ---- 郭女王, 文德皇后 — her father said 此乃吾女中王也 and named her 女王
     for it. She replaced 甄姬, who was made to die at 邺, and was in turn made
     to die by 甄姬's son. --------------------------------------------- */

  /**
   * 易宠 — name a player and a suit; take his equipment and a card of that suit,
   * and hang the "雀" mark on him until your next turn.
   *
   * 易宠 is favour changing hands, and the mark moves from one person to the
   * next exactly the way favour did in that palace. The beam tips, and the
   * feathers cross the table from the seat that had it to the seat that has it.
   */
  yichong: {
    figure: 'scale', swarm: 'feather', flight: 'across', ground: 'shade',
    hue: 'violet', hue2: 'gold', stance: 'turn', tempo: 'slow', n: 8, spread: 1.35, glyph: true,
  },

  /**
   * 诬诽 — your damage counts as coming from whoever wears "雀"; and when you are
   * hurt, they take a point of damage from no source at all.
   *
   * 无来源伤害 — damage with nobody behind it. That is what a rumour is, and it
   * is what killed 甄姬, so this motif has NO FIGURE: nothing is drawn, nothing
   * is thrown, only a drift of smoke crossing the whole table and touching a
   * woman she never once looked at.
   */
  wufei: {
    figure: 'none', swarm: 'plume', flight: 'across', ground: 'smoke',
    hue: 'orchid', hue2: 'void', stance: 'still', tempo: 'slow', n: 12, spread: 1.4, glyph: true,
  },

  /* ---- 韩遂, 雄踞北疆 — thirty years in arms in 凉州, 马腾's sworn brother and
     then his enemy, and finally the man 曹操 broke by sending him a letter
     scratched over with corrections so that 马超 would ask what he was hiding. */

  /**
   * 逆乱 — at another man's end phase, if he has spent his turn on other people,
   * put a 杀 into him at any distance and strip a card off him.
   *
   * He struck whoever had just committed themselves, and only then. A heavy
   * blade comes across at the end of the beat, out of a room that has already
   * gone dark, into a seat that has nothing left in hand.
   */
  mobile__niluan: {
    figure: 'crescent', swarm: 'blade', flight: 'across', ground: 'dim',
    hue: 'ember', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 8, turn: 20, spread: 1.35, glyph: true,
  },

  /**
   * 骁袭 — any black card is a 杀.
   *
   * The 凉州 raid as a standing condition rather than an event: a dark arc
   * across the frame, blades leaving on one heading, and it happens again next
   * turn and the turn after. Ink into cinnabar — a black card, and what it
   * becomes.
   */
  mobile__xiaoxi: {
    figure: 'sweep', swarm: 'blade', flight: 'jet', ground: 'shade',
    hue: 'ink', hue2: 'cinnabar', stance: 'lunge', tempo: 'quick', n: 7, turn: -18, glyph: true,
  },

  /* ---- 贺齐, 马踏群峦 — the terror of the 山越, and a dandy: 《吴书》 says his
     armour was embroidered, his bows and arrows made of the best material going,
     his warships 望之若山, and that he spent everything he had on kit. ---- */

  /**
   * 绮胄 — 锁定技. You gain 英姿, 奇袭 or 旋风 according to how many suits are
   * sitting in your equipment area.
   *
   * 绮胄 is the brocade helm, and the skill is quite literally about how much
   * gear he is wearing. So: the gleam itself, a four-armed starburst throwing
   * glints off chased silver, held close to the body where the armour is.
   */
  mobile__qizhou: {
    figure: 'star', swarm: 'glint', flight: 'flare', ground: 'rays',
    hue: 'silver', hue2: 'amber', stance: 'brace', tempo: 'even', n: 12, spread: 0.7, glyph: true,
  },

  /**
   * 闪袭 — discard a red basic and put several of a man's cards onto his own
   * general card; he gets them back at the end of the turn.
   *
   * 闪袭 is the raid that is over before the alarm goes: he took the 山越 out of
   * their own valleys and put them back. A net drops on another seat, the cards
   * curl up inside it, and by evening everything is where it was.
   */
  mobile__shanxi: {
    figure: 'net', swarm: 'card', flight: 'curl', ground: 'dim',
    hue: 'indigo', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 8, spread: 1.35, glyph: true,
  },

  /**
   * 胡班 · 义烈 — pick a man at the start of the game; his damage becomes your
   * "烈" marks and is prevented, his kills heal you, and at your end phase the
   * marks come due in health.
   *
   * 荥阳. His father gave him a torch and told him to burn the guest-house down
   * with 关羽 inside it; he looked through the window first, saw the man reading
   * by candlelight, and went in and warned him instead. So the fire he did not
   * set stands up on HIS seat, and burns there on the count, for somebody else.
   */
  mobile__yilie: {
    figure: 'column', swarm: 'cinder', flight: 'rise', ground: 'smoke',
    hue: 'ember', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 12, spread: 0.7, glyph: true,
  },

  /* ---- 霍峻, 葭萌铁狮 — who held 葭萌关 for a year with a few hundred men
     against 刘璋's ten thousand, waited until they had gone slack, came out of
     the gate once, and killed the enemy commander in the field. --------- */

  /**
   * 伺怠 — 限定技. Every basic card in your hand becomes a 杀 with no limit on
   * the count; the 桃 among them cost health permanently and the 闪 among them
   * forbid a response.
   *
   * 伺怠 is watching for the slackness, and the whole year of it is in the
   * release: the gate that stayed shut opens once and EVERYTHING comes out.
   * Sixteen blades, quick, into a room that had stopped paying attention.
   */
  mobile__sidai: {
    figure: 'gate', swarm: 'blade', flight: 'out', ground: 'dim',
    hue: 'bronze', hue2: 'flame', stance: 'lunge', tempo: 'quick', n: 16, spread: 1.35, glyph: true,
  },

  /**
   * 竭御 — at the end phase, scavenge basic cards out of the discard pile — and
   * the more they came at you since last time, the fewer you get.
   *
   * The other side of the same year: 竭御 is defence carried to exhaustion. The
   * shield draws shut and what little there is is picked up off the ground
   * inside it. `spread: 0.6` — a garrison does not forage far.
   */
  mobile__jieyu: {
    figure: 'aegis', swarm: 'card', flight: 'in', ground: 'vignette',
    hue: 'ash', hue2: 'bone', stance: 'brace', tempo: 'slow', n: 6, spread: 0.6, glyph: true,
  },

  /* ---- 蒋干, 虚义伪诚 — 周瑜's schoolfellow, sent across the river to talk him
     into changing sides, and sent home again carrying a forged letter that got
     蔡瑁 and 张允 executed the same morning. He was, the record says, actually
     a very fine speaker. It did not help. -------------------------------- */

  /**
   * 盗书 — a player disguises one card as another; you look at the hand and pick
   * which one is the fake. Guess right and he bleeds; guess wrong and you do.
   *
   * The stolen letter, from the fool's side of the table rather than 周瑜's.
   * The frame doubles and one copy is reversed, a written slip comes back across
   * in the sulphur of something that is not what it says, and it is `slow`:
   * you had all night to read it.
   */
  mobile__daoshu: {
    figure: 'mirror', swarm: 'slip', flight: 'in', ground: 'smoke',
    hue: 'sulphur', hue2: 'ink', stance: 'turn', tempo: 'slow', n: 6, turn: 6, spread: 1.3, glyph: true,
  },

  /**
   * 戴罪 — 限定技. Prevent the blow that would kill you and pin the card that
   * carried it onto the man who swung, as "释"; he gets it back at the end.
   *
   * 戴罪立功 — to carry the guilt while you work it off. He carried his. The
   * seal is stamped, the mark travels across to the seat that struck, and he
   * goes white on the count while it does.
   */
  daizui: {
    figure: 'sigil', swarm: 'rune', flight: 'out', ground: 'vignette',
    hue: 'bone', hue2: 'blood', stance: 'pale', tempo: 'toll', n: 6, spread: 1.3, glyph: true,
  },

  /* ---- 蒋济, 盛魏昌杰 — four reigns of Wei strategy, and at 高平陵 he rode out
     and gave 曹爽 his personal word that surrender was safe. 司马懿 killed him
     and his whole clan anyway, and 蒋济 was dead within the year. --------- */

  /**
   * 急筹 — once a turn, use a normal trick you have not used before and record
   * its name; you may never use or answer that name again.
   *
   * 急筹 is reckoning in a hurry, and this is a man spending his repertoire one
   * stratagem at a time and crossing each one off. A grid of names closing
   * across the frame with the used ones going out of it for good.
   */
  jichou: {
    figure: 'lattice', swarm: 'slip', flight: 'out', ground: 'none',
    hue: 'verdigris', hue2: 'bronze', stance: 'still', tempo: 'quick', n: 9, spread: 1.3, glyph: true,
  },

  /**
   * 机论 — hurt, and holding 急筹, either draw for every name you have spent or
   * spend another one on the spot.
   *
   * The mind working under a blow. He reels, and the thought turns inward
   * instead of outward — `curl` at `spread: 0.7`, nothing leaves the seat,
   * because 机论 is what he thinks, not what he does about it.
   */
  jilun: {
    figure: 'spiral', swarm: 'slip', flight: 'curl', ground: 'bloom',
    hue: 'celadon', hue2: 'amber', stance: 'reel', tempo: 'quick', n: 10, spread: 0.7, glyph: true,
  },

  /* ---- 灵雎, 情随梦逝 — not out of any chronicle: a girl written for this game
     and given a story about loving somebody through a war and losing him to it. */

  /**
   * 竭缘 — dealing damage, take or spend a BLACK card; taking damage, take or
   * spend a RED one. Going 背水 deletes one half and doubles the other.
   *
   * The skill is two symmetrical halves and a choice to burn one of them, so the
   * figure is two panels, and the colour is 暮 — purple over orange, the last
   * light, which is the whole of 情随梦逝 in one word. It never quite opens.
   */
  mobile__jieyuan: {
    figure: 'gate', swarm: 'petal', flight: 'across', ground: 'dim',
    hue: 'dusk', hue2: 'void', stance: 'still', tempo: 'slow', n: 10, spread: 0.8, glyph: true,
  },

  /**
   * 焚心 — before a man you killed turns his identity card over, take all his
   * skills, or trade identities with him outright.
   *
   * 焚心 is burning out the heart. Taking on someone else's whole self is the
   * frame doubled with one copy reversed — and everything travels INWARD, into
   * the ash, on a slow count. This is the only motif in the pack where a person
   * is what is being absorbed.
   */
  mobile__fenxin: {
    figure: 'mirror', swarm: 'cinder', flight: 'in', ground: 'smoke',
    hue: 'void', hue2: 'flame', stance: 'turn', tempo: 'slow', n: 10, glyph: true,
  },

  /* ---- 刘晔, 佐世之才 — 光武's own line, serving the man who was dismantling
     the dynasty, and right about nearly everything: 关羽, 孟达, 公孙渊. He built
     the 霹雳车 that broke 袁绍's siege towers at 官渡. -------------------- */

  /**
   * 破橹 — 锁定技. Every turn you fetch a 霹雳车 and use it; hurt without one in
   * play, you draw and are handed a weapon at random.
   *
   * The trebuchet is his, historically and literally — 发石车, which the army
   * called the thunderclap cart because of the noise. So the throwing arm sweeps
   * over, the stone leaves on a GRAVITY ARC, and it lands in somebody else's
   * air. The only `arc` in the pack, and the only siege engine.
   */
  polu: {
    figure: 'sweep', swarm: 'shard', flight: 'arc', ground: 'shade',
    hue: 'bronze', hue2: 'ember', stance: 'brace', tempo: 'toll', n: 13, turn: -26, spread: 1.35, glyph: true,
  },

  /**
   * 筹略 — ask a man for a card; if he gives it, you may use the last card that
   * damaged you, again.
   *
   * 筹略 is reckoning and stratagem, and what it does is hand a blow back to the
   * table in the exact shape it arrived in. The wedge comes in and goes out the
   * same line — `recoil` — and he does not move while it happens.
   */
  choulue: {
    figure: 'wedge', swarm: 'card', flight: 'recoil', ground: 'shade',
    hue: 'azure', hue2: 'ember', stance: 'still', tempo: 'even', n: 8, turn: 12, spread: 1.3, glyph: true,
  },

  /**
   * 李遗 · 教化 — twice a phase, let somebody take from the deck a card of a
   * category nobody has taken yet; when every category has gone, it resets.
   *
   * 伏被俞元. 李恢's son, and the family business in 南中 was 教化 rather than
   * garrisons: schools, seed, and the local gentry put in office. Rings of
   * instruction leaving at staggered delays with bamboo books riding out on
   * them, and then the cycle comes round and starts again.
   */
  mobile__jiaohua: {
    figure: 'rings', swarm: 'slip', flight: 'out', ground: 'bloom',
    hue: 'jade', hue2: 'celadon', stance: 'bow', tempo: 'slow', n: 9, spread: 1.3, glyph: true,
  },

  /* ---- 马良, 白眉 — 马氏五常，白眉最良. 诸葛亮's correspondent, who addressed
     him as 尊兄 in letters, went to the 五溪 and brought the tribes over to 汉
     with nothing but talk, and died at 夷陵 at thirty-six. --------------- */

  /**
   * 自书 — 锁定技. Cards you gain outside your turn are thrown away at the end of
   * that turn; cards you gain inside it draw you another.
   *
   * 自书 is writing it out in your own hand. Everything he sets down away from
   * his own desk is swept up the same evening: three strokes, the slips falling
   * off them, smoke, and none of it further than the edge of the table.
   */
  mobile__zishu: {
    figure: 'strokes', swarm: 'slip', flight: 'fall', ground: 'smoke',
    hue: 'bone', hue2: 'ink', stance: 'still', tempo: 'even', n: 10, spread: 0.7, glyph: true,
  },

  /**
   * 应援 — a card you have finished using may go to another player instead of
   * the discard pile.
   *
   * 应援 is answering a call for support, which is what he went to 五溪 to
   * arrange. The arc opens in first light — 白眉 — and what he is done with
   * travels SIDEWAYS to a neighbour rather than up or out.
   */
  yingyuan: {
    figure: 'halo', swarm: 'card', flight: 'across', ground: 'rays',
    hue: 'dawn', hue2: 'jade', stance: 'lift', tempo: 'even', n: 7, turn: 6, spread: 1.35, glyph: true,
  },

  /* ---- 马日磾, 少传融业 — 马融's grandson, who inherited the greatest classical
     scholarship in the empire, was sent as envoy to 袁术, and had his staff of
     office taken off him and kept. He died of it in 寿春. ---------------- */

  /**
   * 承业 — 锁定技. Cards finishing their business elsewhere settle onto your
   * general card as "典" wherever one of your 六经 is missing; complete the six
   * and you take the lot.
   *
   * The Six Classics, assembled one shelf at a time. `n: 6` is the six, the
   * bamboo comes IN off the table rather than out of the deck, and the count is
   * `toll` because a canon is filled in order and slowly.
   */
  chengye: {
    figure: 'pillars', swarm: 'slip', flight: 'in', ground: 'none',
    hue: 'celadon', hue2: 'bronze', stance: 'still', tempo: 'toll', n: 6, spread: 0.6, glyph: true,
  },

  /**
   * 补续 — discard cards and name a classic you are missing; a matching card is
   * fetched at random out of the deck or the discard pile.
   *
   * 补续 is patching a damaged text back into continuity, which was the family
   * trade. Where 承业 is the shelf filling, this is the ONE hole in the grid
   * being found and lit — inward, small, and nothing thrown.
   */
  buxu: {
    figure: 'lattice', swarm: 'rune', flight: 'in', ground: 'dim',
    hue: 'ash', hue2: 'gold', stance: 'still', tempo: 'slow', n: 7, spread: 0.6, glyph: true,
  },

  /* ---- 孟达, 求栖梧桐 — 良禽择木而栖, and he chose four times. Shu, then Wei,
     then back toward Shu, and 司马懿 covered twelve hundred li in eight days and
     had his head off before the letters had finished arriving. ---------- */

  /**
   * 积戾 — at another man's turn start, pick a number from nought to two IN
   * SECRET; at the end phase, whether he targeted you fewer, exactly or more
   * times than that decides whether you draw, pay him, or shoot him.
   *
   * A hidden number, and a three-way settlement on it. The beam is drawn but it
   * does not tip: the tally hangs face down at `spread: 0.6` and NOTHING moves
   * until the end phase, which is the entire tension of the skill.
   */
  jilim: {
    figure: 'scale', swarm: 'rune', flight: 'hover', ground: 'dim',
    hue: 'void', hue2: 'sulphur', stance: 'still', tempo: 'slow', n: 6, spread: 0.6, glyph: true,
  },

  /**
   * 恃术 — 锁定技. Anyone who takes your cards on his own turn must either throw
   * them away or pay you something unlike them.
   *
   * 恃术 is trusting to your own cleverness, which he did until the last week of
   * his life. Whatever leaves his hand has a barb in it: a web spun out across
   * the table with thorns on the strands, and he never moves.
   */
  shishu: {
    figure: 'web', swarm: 'thorn', flight: 'out', ground: 'shade',
    hue: 'sulphur', hue2: 'ash', stance: 'still', tempo: 'even', n: 10, spread: 1.3, glyph: true,
  },

  /* ---- 审配, 正南义北 — held 邺 through a siege until his own nephew opened a
     gate. Refusing to kneel at the execution he asked to be turned to face
     north, because 吾君在北 — his lord was in the north. His 字 is 正南. ---- */

  /**
   * 守邺 — once a turn, when you are the sole target of a card, contest it; win
   * and the card does nothing and you keep it.
   *
   * The wall of 邺. The grid closes, the card thrown at it sticks in the
   * brickwork, and he keeps it — `in`, and nothing comes back out. Counted on
   * the `toll` rhythm, because a siege is measured in months.
   */
  shouye: {
    figure: 'lattice', swarm: 'card', flight: 'in', ground: 'vignette',
    hue: 'bronze', hue2: 'indigo', stance: 'brace', tempo: 'toll', n: 7, spread: 0.7, glyph: true,
  },

  /**
   * 烈直 — at your prepare phase strip a card each off up to two other players;
   * take any damage and the skill switches off until your next end phase.
   *
   * 烈直 — fierce and rigid, the quality that made him unbearable to his own
   * side and impossible for the other one. Two hard strokes, one to each of two
   * seats, in frost and cinnabar; and the only reason it ever stops is that
   * somebody finally hits him.
   */
  liezhi: {
    figure: 'strokes', swarm: 'shard', flight: 'across', ground: 'none',
    hue: 'frost', hue2: 'cinnabar', stance: 'lunge', tempo: 'toll', n: 6, turn: -24, spread: 1.35, glyph: true,
  },

  /**
   * 苏飞(吴) · 诤荐 — 锁定技. Mark a player at your end phase; at the start of
   * your next turn he draws for everything he has done in between.
   *
   * 诤友投明. He recommended 甘宁 to 黄祖 over and over and was ignored every
   * time; and when 苏飞 was taken by Wu and condemned, 甘宁 knocked his forehead
   * bloody on the floor in front of 孙权 until he got the man's life. So the
   * shaft of light does not stand on his own seat — it stands on somebody
   * else's, `spread: 1.4`, and he bows under it.
   */
  zhengjian: {
    figure: 'column', swarm: 'glint', flight: 'rise', ground: 'rays',
    hue: 'gold', hue2: 'jade', stance: 'bow', tempo: 'slow', n: 9, spread: 1.4, glyph: true,
  },

  /**
   * 苏飞 · 告援 — targeted by a 杀, discard a card and hand the 杀 to another
   * character carrying a "诤荐" mark.
   *
   * 黄祖's officer, who recommended 甘宁 to his lord over and over and was
   * ignored; when Jiangxia fell and Sun Quan meant to kill him, Gan Ning put
   * his own head on the block for him and got him spared. A beacon goes up over
   * the seat, and the blade that was coming crosses the frame to somebody who
   * spoke for him.
   */
  gaoyuan: {
    figure: 'banner', swarm: 'blade', flight: 'across', ground: 'smoke',
    hue: 'ember', hue2: 'azure', stance: 'turn', tempo: 'quick', n: 8, turn: 10, spread: 1.3, glyph: true,
  },

  /* ------------------------------------------------------------ 孙鲁育 --
   * 朱公主, Sun Quan's younger daughter. She refused to join her sister 孙鲁班's
   * plot against the heir 孙和, and 孙鲁班 remembered it: in 255 she was framed
   * into the 孙峻 affair and executed. 舍身饲虎 — the Jataka prince who fed
   * himself to the starving tigress.                                        */

  /**
   * 魅步 — at another's play phase start, if you are in their attack range,
   * discard a card and they are treated as having 〖止息〗 this turn.
   *
   * The skill requires her to be standing inside the reach of the thing she is
   * stopping. So the web is spun from inside the tiger's range: threads curl
   * in around the aggressor, and the trap is that she walked into it herself.
   */
  mobile__meibu: {
    figure: 'web', swarm: 'ribbon', flight: 'curl', ground: 'smoke',
    hue: 'plum', hue2: 'void', stance: 'turn', tempo: 'slow', n: 10, spread: 1.25, glyph: true,
  },

  /**
   * 穆穆 — at play phase start, either discard an equip on the field, or take an
   * armour from the field and then use no 杀 this turn.
   *
   * 穆穆文王，于缉熙敬止 — the 诗经 word for royal composure. She may take the
   * shield only by laying down the sword, so a halo of rank opens and the
   * blades fall out of the air under it. Nothing about 穆穆 strikes.
   */
  mobile__mumu: {
    figure: 'halo', swarm: 'blade', flight: 'fall', ground: 'frost',
    hue: 'celadon', hue2: 'silver', stance: 'bow', tempo: 'slow', n: 7, spread: 0.7, glyph: true,
  },

  /* ------------------------------------------------------------ 王元姬 --
   * 司马昭's wife, 王朗's granddaughter. She looked at 钟会 once and told her
   * husband he would rebel — 见利忘义，好为事端 — and she was right. Famous for
   * wearing nothing ornamental her whole life. 清雅抑华.                     */

  /**
   * 谦冲 — 锁定技. All-black equips grant 〖帷幕〗; all-red grant 〖明哲〗;
   * otherwise pick a card type and use it without limit this phase.
   *
   * 帷幕 is literally a curtain, so the figure is the curtain — one sheet drawn
   * across the seat, ink on one face and cinnabar on the other, hanging where
   * it is. 谦冲 is 虚怀若谷: the space behind the screen is the whole skill.
   */
  qianchong: {
    figure: 'veil', swarm: 'rune', flight: 'hover', ground: 'dim',
    hue: 'ink', hue2: 'cinnabar', stance: 'still', tempo: 'even', n: 6, spread: 0.6, glyph: true,
  },

  /**
   * 尚俭 — 锁定技. At any character's end phase, if what you lost this turn is
   * no more than your hp, draw that many.
   *
   * Thrift returns exactly what it spent and not a card more. Undyed cloth
   * draws down, the dust of it goes back in, and the particle count is five
   * because a frugal effect that threw sixteen motes would be lying.
   */
  shangjian: {
    figure: 'veil', swarm: 'dust', flight: 'in', ground: 'none',
    hue: 'bone', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 5, spread: 0.6, glyph: true,
  },

  /* -------------------------------------------------------------- 王允 --
   * The 司徒 who ran the 连环计 through 貂蝉 and had Dong Zhuo killed, then
   * refused amnesty to the Liangzhou officers, brought 李傕 and 郭汜 down on
   * Chang'an, and died in the sack he caused. 忠魂不泯.                      */

  /**
   * 连计 — once per play phase, arm one character with a random weapon from the
   * deck, then deem them to use 杀/决斗/火攻/南蛮/万箭 on a second; damage dealt
   * becomes "连计" marks for you.
   *
   * 连环 means linked, and this is the chain drawn between two other seats —
   * he arms one man and points him at another and never touches either. The
   * spread crosses into their air because none of it happens where he is.
   */
  mobile__lianji: {
    figure: 'chain', swarm: 'blade', flight: 'across', ground: 'shade',
    hue: 'void', hue2: 'flame', stance: 'still', tempo: 'slow', n: 10, turn: -8, spread: 1.35, glyph: true,
  },

  /**
   * 谋逞 — 觉醒技. With more than two "连计" marks, gain 1 max hp, heal, lose
   * 〖连计〗 and gain 〖矜功〗.
   *
   * 谋逞: the scheme comes off. The core swells and lets go in a fan of light,
   * gold going to blood — because what he wins here is the skill named
   * "preening on merit", and that is the thing that killed him three months
   * after Dong Zhuo died.
   */
  mobile__moucheng: {
    figure: 'orb', swarm: 'glint', flight: 'flare', ground: 'rays',
    hue: 'gold', hue2: 'blood', stance: 'swell', tempo: 'toll', n: 10, glyph: true,
  },

  /**
   * 卫温诸葛直 · 浮海 — once per play phase, every other character picks 潮起 or
   * 潮落 at once, and you draw for each unbroken run of agreement.
   *
   * In 230 Sun Quan sent them over the sea to 夷洲 with ten thousand men; they
   * came back with a few hundred captives, having lost most of the fleet to
   * disease, and he executed them both. One tide crosses the whole table and
   * every seat has to say which way it is running.
   */
  mobile__fuhaiw: {
    figure: 'wave', swarm: 'drop', flight: 'across', ground: 'ripple',
    hue: 'azure', hue2: 'frost', stance: 'still', tempo: 'slow', n: 14, spread: 1.35, glyph: true,
  },

  /**
   * 吴班 · 进讨 — 锁定技. 杀 with no distance limit and one extra use; the first
   * 杀 of your play phase cannot be responded to, the second hits for one more.
   *
   * Liu Bei's vanguard commander, 碧血 — the loyal man's blood that turns to
   * jade. Two blows in sequence and the second is heavier, so the wedge lands
   * on `toll` rather than `quick`: this is a counted advance, not a raid.
   */
  mobile__jintao: {
    figure: 'wedge', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'cinnabar', hue2: 'jade', stance: 'lunge', tempo: 'toll', n: 12, turn: -6, spread: 1.2, glyph: true,
  },

  /**
   * 邢道荣 · 诳武 — match your hand to another's by drawing or discarding, then
   * deem a 决斗 on them; if they take no damage you lose 1 hp and the skill
   * switches off for the round.
   *
   * 吾乃零陵上将邢道荣也 — and then Zhao Yun killed him. 诳 is a bluff, and the
   * skill literally makes him a copy of the man he is challenging, so the frame
   * doubles, the blade goes out, and it comes straight back into him.
   */
  kuangwu: {
    figure: 'mirror', swarm: 'blade', flight: 'recoil', ground: 'wash',
    hue: 'bronze', hue2: 'ash', stance: 'reel', tempo: 'quick', n: 8, turn: 8, glyph: true,
  },

  /* -------------------------------------------------------------- 徐荣 --
   * 玄菟战魔. Dong Zhuo's general from the far northeast frontier and the only
   * man of the era to beat both Cao Cao (荥阳) and Sun Jian (梁东). 镬 is the
   * cauldron bodies were boiled in.                                          */

  /**
   * 凶镬 — start with three "暴戾" marks; hand one to another character, take
   * +1 damage against them, and at their play phase start the mark burns them,
   * bleeds them, or is paid for with a card.
   *
   * A brand, not a blow: the seal is struck and travels to somebody else's
   * seat, and there are exactly three of them because that is what the rules
   * text hands him at the start of the game.
   */
  mobile__xionghuo: {
    figure: 'sigil', swarm: 'rune', flight: 'out', ground: 'smoke',
    hue: 'ember', hue2: 'sulphur', stance: 'still', tempo: 'even', n: 3, spread: 1.3, glyph: true,
  },

  /**
   * 杀绝 — 锁定技. When someone entering dying would need more than one 桃 or 酒
   * to come back, you take a "暴戾" mark and the card that put them there.
   *
   * 杀绝 is finishing, leaving nothing. The bars come in and lock and the barbs
   * come with them: this is the lid of the cauldron, and the whole point is
   * that there is no way back out of it.
   */
  mobile__shajue: {
    figure: 'lattice', swarm: 'thorn', flight: 'in', ground: 'vignette',
    hue: 'blood', hue2: 'sulphur', stance: 'still', tempo: 'toll', n: 8, spread: 0.7, glyph: true,
  },

  /* ------------------------------------------------------------ 羊徽瑜 --
   * 景献皇后, 司马师's wife and 羊祜's sister, childless, honoured as empress
   * dowager for her judgement rather than her line. 温慧母仪.                */

  /**
   * 弘仪 — name another character; when they deal damage before your next turn
   * they judge, and on red the victim draws, on black the damage is reduced.
   *
   * She does not stop the blow, she puts propriety in front of it. A screen
   * comes down over somebody else's violence with the judgement falling through
   * it, slowly, and she never moves.
   */
  hongyi: {
    figure: 'veil', swarm: 'card', flight: 'fall', ground: 'dim',
    hue: 'rouge', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 7, spread: 1.2, glyph: true,
  },

  /**
   * 劝封 — 限定技. Mourn a dead character: lose 〖弘仪〗, take all their skills,
   * gain 1 max hp and heal; or, dying, take 2 max hp and heal 4.
   *
   * 追思 is the word the engine uses and it decides the design. The figure is
   * the 铭旌 — the funeral banner carried in front of the coffin with the dead
   * person's name on it — hanging while their breath is drawn into her.
   */
  quanfeng: {
    figure: 'banner', swarm: 'plume', flight: 'in', ground: 'dim',
    hue: 'bone', hue2: 'gold', stance: 'bow', tempo: 'toll', n: 8, glyph: true,
  },

  /**
   * 阳球 · 扫奸 — look at another's hand and pick one card; they then discard
   * hand cards one at a time until they have thrown away five, or thrown away
   * the one you picked.
   *
   * The 司隶校尉 who had the eunuch 王甫 beaten to death and his body put out
   * with a placard on it. 扫 is a broom: the sweep goes across, the hand comes
   * apart card by card on the `toll` rhythm, and `n` is five because five is
   * where the purge stops.
   */
  mobile__saojian: {
    figure: 'sweep', swarm: 'card', flight: 'across', ground: 'shade',
    hue: 'ink', hue2: 'blood', stance: 'lunge', tempo: 'toll', n: 5, turn: -12, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 阎象 --
   * 袁术's 主簿, and the only man in his court who told him not to take the
   * imperial title — citing King Wen, who held two thirds of the realm and went
   * on serving Yin. He was ignored. 明尚夙达.                                */

  /**
   * 苦谏 — mark up to two hand cards as "谏" and give them to another. Used or
   * played, you both draw two; thrown away, you both discard one.
   *
   * Two strokes laid down and sent across the table, and exactly two, because
   * the rules text says at most two. Sulphur is the colour of the word 苦: the
   * advice is bitter to take and it is worth something only if it is taken.
   */
  kujian: {
    figure: 'strokes', swarm: 'slip', flight: 'across', ground: 'none',
    hue: 'sulphur', hue2: 'bone', stance: 'bow', tempo: 'slow', n: 2, spread: 1.35, glyph: true,
  },

  /**
   * 睿敛 — each round, name a character; if they discarded this turn, pick one
   * of the types they threw away and you both take a card of it back out of the
   * discard pile.
   *
   * 敛 is gathering-in. A net closes over the heap of thrown-away cards and
   * what is worth keeping comes back up out of it. Nothing here goes outward.
   */
  ruilian: {
    figure: 'net', swarm: 'card', flight: 'in', ground: 'none',
    hue: 'celadon', hue2: 'bronze', stance: 'still', tempo: 'even', n: 8, glyph: true,
  },

  /**
   * 乐就 · 催进 — when you or someone in your attack range uses a 杀, discard a
   * card to raise its base damage; if that 杀 deals no damage, you draw and
   * then deal 1 damage to the man who swung it.
   *
   * 仲家军督 — a drill officer of Yuan Shu's short-lived dynasty. This is the
   * advance-drum: one hard ring off the seat with the air torn up behind it,
   * barbs riding out on it, on the `toll` rhythm, because a drum is counted.
   * Failure is punished, which is why the second colour is blood.
   */
  cuijin: {
    figure: 'ring', swarm: 'thorn', flight: 'out', ground: 'ripple',
    hue: 'bronze', hue2: 'blood', stance: 'brace', tempo: 'toll', n: 10, spread: 1.2, glyph: true,
  },

  /* -------------------------------------------------------------- 笮融 --
   * 持宗事魔, and the strangest man in the pack. He embezzled the grain
   * transport of three commanderies to raise the first great Buddhist temple in
   * China — a gilt bronze Buddha, five thousand monks, ten thousand at the
   * bathing festival — and then murdered 赵昱, who had welcomed him with a
   * banquet, and 薛礼, and 朱皓, and was killed by hill people. The three
   * skills are one arc: karma piles up, karma is spent, and in between he
   * arrives preaching and leaves with your cards.                            */

  /**
   * 浮图 — at each turn's end, deal the most damage and the top black card goes
   * onto your general as "业"; heal the most and it is a red one. Spend a "业"
   * to prevent damage to yourself.
   *
   * 浮图 is the stupa. The tiers stand up one after another — `pillars` is the
   * only figure that arrives in sequence, which is what a pagoda does — and the
   * karma falls onto it from above, gilt over ink.
   */
  futu: {
    figure: 'pillars', swarm: 'rune', flight: 'fall', ground: 'bloom',
    hue: 'gold', hue2: 'ink', stance: 'still', tempo: 'slow', n: 7, spread: 0.8, glyph: true,
  },

  /**
   * 净土 — 限定技. Cash every black "业" as damage on one character, or every
   * red one as max hp and healing; then 浮图 is gone and 佛宗 replaces it.
   *
   * The Pure Land, the western paradise you are admitted to. The gate opens on
   * `toll` with the light behind it and petals going out through it — and the
   * two panels are gold and blood, because the same ledger pays out either as a
   * blessing or as a massacre and the man does not much care which.
   */
  jingtu: {
    figure: 'gate', swarm: 'petal', flight: 'out', ground: 'rays',
    hue: 'gold', hue2: 'blood', stance: 'lift', tempo: 'toll', n: 12, spread: 1.3, glyph: true,
  },

  /**
   * 劫辩 — at a play phase's end in which nobody was hurt, 拼点 with the turn
   * player or the weakest man at the table (a "业" is legal tender for it); win,
   * and either wound him or heal him and take two of his cards.
   *
   * A dharma disputation that is a robbery. The beam tips, the temple's money
   * slides across it, and the loser is as likely to be blessed as bled — which
   * is exactly what happened at 赵昱's banquet.
   */
  jiebian: {
    figure: 'scale', swarm: 'coin', flight: 'across', ground: 'smoke',
    hue: 'sulphur', hue2: 'bronze', stance: 'turn', tempo: 'even', n: 9, turn: 10, spread: 1.25, glyph: true,
  },

  /* -------------------------------------------------------------- 张宝 --
   * 地公将军, Zhang Jue's brother, the Yellow Turban sorcerer — wind and sand
   * and phantom troops, broken by Liu Bei with the blood of pigs and dogs.   */

  /**
   * 咒缚 — put one hand card beside a character as a "咒"; it becomes their
   * judgement card when they judge, and anyone who sheds a "咒" in a turn loses
   * 1 hp at the end of it.
   *
   * One card, one victim, one talisman. The ribbon uncoils off the seat
   * carrying a single sealed slip across the table — `n: 1`, because a curse
   * that came in a shower of twelve would be weather, not a curse.
   */
  mobile__zhoufu: {
    figure: 'coil', swarm: 'rune', flight: 'out', ground: 'smoke',
    hue: 'void', hue2: 'sulphur', stance: 'still', tempo: 'slow', n: 1, spread: 1.35, glyph: true,
  },

  /**
   * 影兵 — 锁定技. When a cursed character plays a card of the "咒"'s suit you
   * draw; the second time, the curse is spent.
   *
   * 撒豆成兵 — beans thrown on the ground stand up as soldiers. The frame
   * doubles and the dust of the doubling rises: an army that is only ever the
   * reflection of one, which is why the count is high and the colour is not.
   */
  mobile__yingbing: {
    figure: 'mirror', swarm: 'dust', flight: 'rise', ground: 'smoke',
    hue: 'void', hue2: 'ash', stance: 'still', tempo: 'even', n: 16, glyph: true,
  },

  /* -------------------------------------------------------------- 张恭 --
   * 敦煌太守, who held the far west through the founding of Wei and sent his son
   * across the desert to ask Cao's court for troops. The son was caught and told
   * to write home advising surrender, and shouted instead that his father should
   * hold. He held. 西域长歌.                                                 */

  /**
   * 遣信 — hand up to two cards out at random as "信"; at that character's next
   * prepare phase they either let you draw two or take a hand limit of two
   * fewer.
   *
   * The only figure that would be honest here is no figure, because the skill
   * is about the distance the letter has to cross and there is nothing between
   * Dunhuang and Luoyang but sand. Two slips, two seats, the widest spread in
   * the pack.
   */
  mobile__qianxinz: {
    figure: 'none', swarm: 'slip', flight: 'across', ground: 'smoke',
    hue: 'bone', hue2: 'amber', stance: 'still', tempo: 'slow', n: 2, turn: -4, spread: 1.4, glyph: true,
  },

  /**
   * 镇行 — at your end phase or after taking damage, look at the top three and
   * take the one whose suit matches neither of the others.
   *
   * Three cards spread like a hand of them and one drawn out — the odd one, the
   * thing that does not belong, which is what a garrison commander on the
   * frontier spends his life looking for. `n: 3` is the three cards exactly.
   */
  zhenxing: {
    figure: 'fan', swarm: 'card', flight: 'in', ground: 'frost',
    hue: 'azure', hue2: 'bone', stance: 'still', tempo: 'even', n: 3, spread: 0.75, glyph: true,
  },

  /* -------------------------------------------------------------- 张既 --
   * 雍州刺史, who pacified the northwest — the Qiang, the Di, 张进 and 黄华 —
   * mostly by arriving first and settling people rather than by killing them.
   * 边安人宁: the border quiet, the people at rest.                          */

  /**
   * 定镇 — each round, up to X characters within distance X of you each either
   * discard a 杀 or agree not to aim tricks at you this round (X is your hp).
   *
   * The perimeter he draws is literally a radius, so the figure is rings
   * leaving the seat at that reach — and the blades come inward and are laid
   * down inside them. Pacification, on a counted rhythm, with nothing thrown.
   */
  dingzhen: {
    figure: 'rings', swarm: 'blade', flight: 'in', ground: 'none',
    hue: 'bronze', hue2: 'ash', stance: 'brace', tempo: 'toll', n: 9, spread: 1.35, glyph: true,
  },

  /**
   * 攸业 — 锁定技. Any character who ends a turn without having hurt you leaves
   * a card on your general as "蓄", up to five; on damage, you deal all of them
   * out again as you like.
   *
   * 蓄 is stores. Grain spirals into the granary and sits there — the seed
   * swarm, curling inward, at a short spread, and capped at five because the
   * rules cap it at five. What it is for is the winter after.
   */
  youye: {
    figure: 'orb', swarm: 'bead', flight: 'curl', ground: 'none',
    hue: 'amber', hue2: 'bone', stance: 'still', tempo: 'slow', n: 5, spread: 0.7, glyph: true,
  },

  /* ------------------------------------------------------------ 张琪瑛 --
   * 张鲁's daughter and a priestess of the Five Pecks of Rice, who in the legend
   * rides away off a cliff. Her three skills run on four Daoist star-marks:
   * 紫微 the pole emperor, 后土 the earth queen, 玉清 the jade heaven, 勾陈.  */

  /**
   * 法箓 — 锁定技. Discarded cards convert to marks by suit, one of each kind,
   * and you begin the game holding all four.
   *
   * 箓 is the ordination register — the talisman list a Daoist is licensed by.
   * Four seals, and they do not go anywhere: they hover close in around her at
   * a radius smaller than the portrait, which is what a register is.
   */
  mobile__falu: {
    figure: 'sigil', swarm: 'rune', flight: 'hover', ground: 'none',
    hue: 'violet', hue2: 'frost', stance: 'still', tempo: 'even', n: 4, spread: 0.62, glyph: true,
  },

  /**
   * 真仪 — spend a mark to rewrite a judgement, to make a hand card a 桃 while
   * dying, to add to damage, or to pull three card types out of the deck after
   * an elemental hit.
   *
   * The rite performed rather than held. A four-armed star opens on the altar
   * and the light leaves it turning — one figure with four arms for four gods,
   * violet going to gold at the moment a mark is actually burned.
   */
  mobile__zhenyi: {
    figure: 'star', swarm: 'glint', flight: 'flare', ground: 'rays',
    hue: 'violet', hue2: 'gold', stance: 'flare', tempo: 'quick', n: 12, glyph: true,
  },

  /**
   * 点化 — at your prepare or end phase, look at the top X cards and put them
   * back in any order (X is how many marks you hold).
   *
   * 点化 is transmutation — 点石成金. It must not be 观星: nothing here orbits
   * and nothing leaves. The cards lift, hang, and settle back exactly where
   * they were, in a different order, under a night sky.
   */
  mobile__dianhua: {
    figure: 'orb', swarm: 'card', flight: 'hover', ground: 'ripple',
    hue: 'indigo', hue2: 'frost', stance: 'still', tempo: 'slow', n: 4, spread: 0.55, glyph: true,
  },

  /* ---------------------------------------------------------- 木鹿大王 --
   * 八纳洞主, Meng Huo's ally, who rode a white elephant and brought tigers,
   * leopards, wolves and snakes onto the field with a bell and an incantation —
   * until Zhuge Liang met him with wooden beasts that breathed fire.         */

  /**
   * 兽法 — after your first damage each turn, and up to five times when you are
   * hurt, a beast is loosed on somebody: leopard wounds, eagle steals, bear
   * strips an equip, hare gives them a card.
   *
   * Four beasts, one gesture, so the figure is claws — blades opening off a
   * single pivot — with fangs coming out of them, `n: 4` for the four animals
   * in the rules text.
   */
  shoufa: {
    figure: 'fan', swarm: 'thorn', flight: 'out', ground: 'smoke',
    hue: 'sulphur', hue2: 'ember', stance: 'lunge', tempo: 'quick', n: 4, turn: -18, spread: 1.25, glyph: true,
  },

  /**
   * 咒鳞 — 限定技. Take 2 armour and fix 〖兽法〗 on one chosen beast until your
   * next turn.
   *
   * 鳞 is scales. The hexagon draws itself shut out of them — armour that is
   * skin rather than metal, verdigris over sulphur, closing on the `toll`
   * rhythm because an incantation is spoken slowly and once.
   */
  zhoulin: {
    figure: 'aegis', swarm: 'shard', flight: 'in', ground: 'smoke',
    hue: 'verdigris', hue2: 'sulphur', stance: 'brace', tempo: 'toll', n: 10, spread: 0.65, glyph: true,
  },

  /**
   * 御象 — 锁定技. With armour on, you reach one further, others reach one less,
   * and fire hurts you one more.
   *
   * The white elephant, walking. A ground-wave with the dust of it going across
   * on one heading — mass, not speed, which is what separates this from a
   * cavalry skill — and the ember second colour is the only warning the card
   * gives you about how this man actually died.
   */
  yuxiang: {
    figure: 'wave', swarm: 'dust', flight: 'across', ground: 'shade',
    hue: 'ash', hue2: 'ember', stance: 'brace', tempo: 'toll', n: 18, turn: -4, spread: 1.2, glyph: true,
  },

  /* -------------------------------------------------------------- 裴秀 --
   * The great Jin cartographer — 禹贡地域图 and the 制图六体, the six rules of
   * mapmaking, of which the first is 分率, the grid — and the 尚书令 who rebuilt
   * the five-rank peerage. 晋图开秘.                                          */

  /**
   * 行图 — 锁定技. Play a card whose number divides X and you draw; play cards
   * that are multiples of X without limit (X is your last card's number).
   *
   * Pure arithmetic on a grid, which is his actual invention: 计里画方, the
   * ruled squares a Chinese map is drawn on. The lattice draws itself and does
   * not close on anybody — it hovers, at a spread inside the portrait, with the
   * survey slips sitting in it.
   */
  xingtu: {
    figure: 'lattice', swarm: 'slip', flight: 'hover', ground: 'none',
    hue: 'celadon', hue2: 'ink', stance: 'still', tempo: 'even', n: 6, spread: 0.6, glyph: true,
  },

  /**
   * 爵制 — discard at least two cards and take a card whose number is the sum of
   * theirs modulo thirteen.
   *
   * 五等爵: 公侯伯子男, the five grades he restored, so five ranks stand up in
   * order with the coin of enfeoffment coming into each. `pillars` is the
   * figure that arrives in sequence, and a peerage is nothing but sequence.
   */
  juezhi: {
    figure: 'pillars', swarm: 'coin', flight: 'in', ground: 'none',
    hue: 'gold', hue2: 'bronze', stance: 'still', tempo: 'even', n: 5, spread: 0.75, glyph: true,
  },

  /* -------------------------------------------------------------- 彭羕 --
   * Brilliant, insufferable, promoted by Liu Bei and distrusted by Zhuge Liang;
   * demoted to a border post, he complained to Ma Chao that Liu Bei was an
   * "old soldier" and proposed they take the realm between them. Ma Chao
   * reported it. He was executed at thirty-seven. 难别菽麦.                   */

  /**
   * 达命 — another character may hand you a card; you name a third, who must
   * match its type to the first or else you hand it over yourself. Success
   * raises your "达命" value.
   *
   * He brokers, and takes his commission in standing. The beam tips between two
   * other seats with the cards crossing between them at full spread; dusk is
   * the last light, which is the hour this man is always in.
   */
  daming: {
    figure: 'scale', swarm: 'card', flight: 'across', ground: 'none',
    hue: 'dusk', hue2: 'ash', stance: 'turn', tempo: 'even', n: 6, spread: 1.35, glyph: true,
  },

  /**
   * 嚣逆 — spend "达命" to play any card as a 杀 or a damaging trick, and your
   * hand limit is whatever "达命" you have left.
   *
   * 嚣逆 is the charge he died on: clamorous treason. A sleeve sweeps out and
   * what comes off it is not silk but the zigzag of an outburst, jetted along
   * one line at somebody. He spends his reputation on it and there is nothing
   * behind him afterwards, which is why the hand limit is the same number.
   */
  xiaoni: {
    figure: 'sweep', swarm: 'bolt', flight: 'jet', ground: 'wash',
    hue: 'sulphur', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 9, turn: 18, spread: 1.2, glyph: true,
  },

  /* -------------------------------------------------------------- 牵招 --
   * Liu Bei's friend in youth and Wei's northern frontier commander, who broke
   * 轲比能 and held the Xianbei mostly by being frightening at a distance. As a
   * boy he carried his murdered teacher's body out through bandits and was let
   * through for it. 威风远振.                                                */

  /**
   * 势吓 — 拼点 with another character; win, and until their next turn ends they
   * cannot damage anyone on your side. Lose, and you throw a card away.
   *
   * Overawe, not battle: the guard hexagon closes and the light goes out behind
   * it across the whole table, and the only two objects in the air are the two
   * cards of the 拼点. Nothing lands. That was his entire northern policy.
   */
  shihe: {
    figure: 'aegis', swarm: 'card', flight: 'out', ground: 'rays',
    hue: 'bronze', hue2: 'frost', stance: 'brace', tempo: 'toll', n: 2, spread: 1.3, glyph: true,
  },

  /**
   * 镇抚 — at your end phase, if you lost cards to discarding this turn, give
   * another character 1 armour.
   *
   * The other half of the same man: 镇 is a garrison, 抚 is settling people. A
   * wall goes up over somebody else's seat, in silver over bronze, and the
   * pieces travel outward — he is building it for them and not for himself.
   */
  zhenfu: {
    figure: 'lattice', swarm: 'shard', flight: 'out', ground: 'none',
    hue: 'silver', hue2: 'bronze', stance: 'still', tempo: 'even', n: 6, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 阮慧 --
   * 明察福祸 — reading fortune and calamity clearly. A woman of the 陈留 阮, the
   * clan of 阮瑀 and 阮籍: musicians, 玄学 arguers, and very good at knowing what
   * a thing was going to turn into.                                          */

  /**
   * 明察 — reveal the top three at your draw phase; you may skip drawing to take
   * those numbered eight or less, and if you took any, take a card from somebody
   * at random too.
   *
   * A lens opens over the deck, three cards come into it, and she gives up her
   * draw for the two she can actually read. Frost going to amber: cold looking,
   * warm return.
   */
  mingcha: {
    figure: 'eye', swarm: 'card', flight: 'in', ground: 'rays',
    hue: 'frost', hue2: 'amber', stance: 'still', tempo: 'slow', n: 3, spread: 1.2, glyph: true,
  },

  /**
   * 敬重 — discard two black cards in a phase and name a character; three times
   * in their next play phase, whatever they finish using comes to you.
   *
   * The name says esteem and the rules say tribute. A halo is set over somebody
   * else's head, the room dims, and three cards come back along the same line.
   * `n: 3` is the three uses; the bow is hers and it is not sincere.
   */
  jingzhong: {
    figure: 'halo', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'ink', hue2: 'silver', stance: 'bow', tempo: 'slow', n: 3, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 士燮 --
   * 士王, who ruled Jiaozhi for forty years while the north tore itself apart,
   * sent tribute to whoever was winning, and rode out with Hu men burning
   * incense along the road beside his carriage. Vietnam still has shrines to
   * him. 南交学祖.                                                            */

  /**
   * 避乱 — at your draw phase, with anybody at distance 1, give up drawing to
   * push everyone's distance to you out by the number of surviving kingdoms.
   *
   * The far south: he did not win the war, he was simply not in it. Rings go
   * out past the neighbouring seats carrying nothing but dust, the room darkens
   * behind them, and the table is further away than it was.
   */
  biluan: {
    figure: 'rings', swarm: 'dust', flight: 'out', ground: 'dim',
    hue: 'celadon', hue2: 'ash', stance: 'still', tempo: 'slow', n: 12, spread: 1.4, glyph: true,
  },

  /**
   * 礼下 — 锁定技. At another's end phase, if you are outside their reach, take a
   * card or give them one; either way the table gets one step closer to you.
   *
   * 礼贤下士, and the incense on the road. A flower opens and the smoke of it
   * goes up — amber to jade, the two colours of tribute — and he bows. This is
   * how he stayed alive: give first, and be worth more standing than dead.
   */
  lixia: {
    figure: 'bloom', swarm: 'plume', flight: 'rise', ground: 'smoke',
    hue: 'amber', hue2: 'jade', stance: 'bow', tempo: 'slow', n: 10, spread: 1.1, glyph: true,
  },

  /* -------------------------------------------------------------- 孙皓 --
   * 时日曷丧，予及汝皆亡 — from the 尚书, what the people said about the tyrant
   * Jie: when will this sun die, I would go with it. Wu's last emperor flayed
   * faces and put out eyes, then surrendered to Jin and told Sima Yan he had
   * kept a seat ready for him in the south too.                              */

  /**
   * 残蚀 — draw one card per wounded character instead of your normal draw, then
   * pay a card for every basic or ordinary trick you use this turn.
   *
   * He feeds on the wounded, so a web is thrown across the table and the blood
   * comes in along it out of every hurt seat. The portrait swells while it
   * arrives, and everything it buys has to be paid for card by card.
   */
  canshi: {
    figure: 'web', swarm: 'drop', flight: 'in', ground: 'vignette',
    hue: 'blood', hue2: 'void', stance: 'swell', tempo: 'even', n: 14, spread: 1.35, glyph: true,
  },

  /**
   * 仇海 — 锁定技. Empty-handed, every wound you take is one deeper.
   *
   * A sea of grudges, and the joke of the skill is that it only bites when
   * there is nothing left in his hand. The wave rolls in rather than out, barbs
   * riding it, the corners closing — a tyrant with no cards is a man surrounded.
   */
  chouhai: {
    figure: 'wave', swarm: 'thorn', flight: 'in', ground: 'vignette',
    hue: 'void', hue2: 'blood', stance: 'reel', tempo: 'quick', n: 12, turn: 8, spread: 1.2, glyph: true,
  },

  /**
   * 归命 — 主公技, 锁定技. Every other 吴 character counts as wounded during your
   * draw phase.
   *
   * 归命侯 is the title Sima Yan actually gave him after the surrender: Marquis
   * Who Returned The Mandate. The banner comes down instead of up, the colours
   * falling off it, the portrait sinking — and the kingdom it counts as wounded
   * is his own.
   */
  guiming: {
    figure: 'banner', swarm: 'ribbon', flight: 'fall', ground: 'dim',
    hue: 'ash', hue2: 'blood', stance: 'sink', tempo: 'toll', n: 8, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 陶谦 --
   * The old governor of Xu, who offered the province to Liu Bei three times and
   * died before the fourth; whose officer killed Cao Cao's father on the road,
   * and whose people paid for it when Cao Cao came back. 膺秉温仁.            */

  /**
   * 招祸 — 锁定技. When somebody else starts dying, cut your own max hp to 1 and
   * draw a card for every point you gave up.
   *
   * 招祸 is inviting the disaster in. A net falls over the frame with the ash of
   * something already burning in it, the corners close, and the portrait wilts:
   * he did not do anything, and it happened because of him anyway.
   */
  zhaohuo: {
    figure: 'net', swarm: 'cinder', flight: 'fall', ground: 'vignette',
    hue: 'ember', hue2: 'ash', stance: 'wilt', tempo: 'toll', n: 14, spread: 1.2, glyph: true,
  },

  /**
   * 义襄 — once a turn, being targeted by somebody healthier than you, take a
   * basic card you do not already hold out of the deck at random.
   *
   * The weak old man everyone protects. A halo opens and the seeds come in
   * under it from off the table — four of them, one for each basic card the
   * deck has to offer him — and he lifts. Nothing he does here is an act.
   */
  yixiang: {
    figure: 'halo', swarm: 'bead', flight: 'in', ground: 'bloom',
    hue: 'jade', hue2: 'peach', stance: 'lift', tempo: 'even', n: 4, spread: 1.1, glyph: true,
  },

  /**
   * 揖让 — hand every non-basic card you own to a character with a higher max
   * hp, then rise to their max hp and heal one point per card type you gave.
   *
   * 三让徐州, and it is the only skill in the pack where giving the whole thing
   * away is how you win. The city gates swing open, the seals go out through
   * them, and the rhythm is `toll` because he did it three times and was
   * refused twice.
   */
  yirang: {
    figure: 'gate', swarm: 'rune', flight: 'out', ground: 'rays',
    hue: 'jade', hue2: 'gold', stance: 'bow', tempo: 'toll', n: 9, spread: 1.35, glyph: true,
  },

  /* -------------------------------------------------------------- 贾逵 --
   * So poor as a boy he had no trousers; later the man who cut the 贾侯渠 two
   * hundred li through Yuzhou, and who marched without orders to 石亭 and pulled
   * Cao Xiu's beaten army out. Sima Yi wept at his shrine years after. 肃齐万里.*/

  /**
   * 通渠 — hand out "渠" marks at the cost of your own blood; marked characters
   * draw an extra card and then pass one along to another marked character.
   *
   * The canal. Water crosses between seats along a line of links, the field
   * ringing behind it, at a spread that reaches the far side of the table —
   * because what a canal is for is moving grain to somebody who is not you.
   */
  tongqu: {
    figure: 'chain', swarm: 'drop', flight: 'across', ground: 'ripple',
    hue: 'verdigris', hue2: 'azure', stance: 'still', tempo: 'even', n: 10, spread: 1.4, glyph: true,
  },

  /**
   * 挽澜 — when any character takes lethal damage, throw away every card in your
   * equip area to prevent it.
   *
   * 力挽狂澜, and the man who did it at Shiting. The engineer's answer to a
   * flood is not a wall but a sluice: two panels slam shut, his own armour goes
   * to pieces off them, and the water stops. He is not covered afterwards.
   */
  wanlan: {
    figure: 'gate', swarm: 'shard', flight: 'out', ground: 'ripple',
    hue: 'verdigris', hue2: 'silver', stance: 'brace', tempo: 'quick', n: 12, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 王经 --
   * Raised poor, ruined at 洮西 where Jiang Wei killed tens of thousands of his
   * men, and then the only minister who would not sell 曹髦 when the emperor
   * marched out to die. Executed with his mother, who told the court she was
   * pleased. 青云孤竹 — the lone bamboo.                                       */

  /**
   * 阻进 — unwounded, a basic card is a 杀; wounded, a basic card is a 闪 or a
   * 无懈可击.
   *
   * The beam tips at the exact moment he is hurt and everything he owns changes
   * function. Silver over pine — 孤竹, the single stalk — and the blades leave
   * along one axis whichever way it has tipped.
   */
  zujin: {
    figure: 'scale', swarm: 'blade', flight: 'out', ground: 'shade',
    hue: 'silver', hue2: 'pine', stance: 'brace', tempo: 'even', n: 8, turn: -12, glyph: true,
  },

  /**
   * 节谏 — give cards to another and mark them; once a turn, when they are the
   * sole target of something, take it onto yourself and draw.
   *
   * He stands where the blow was going. The figure is one upright shaft — the
   * lone bamboo of his title — and the card arrives into it out of somebody
   * else's air, on `toll`, with the rest of the room dark. This is the skill he
   * actually died of.
   */
  jiejianw: {
    figure: 'column', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'pine', hue2: 'bone', stance: 'brace', tempo: 'toll', n: 7, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 王濬 --
   * The Jin admiral who built the tower-ships in Yizhou and took them down the
   * Yangtze in 280 to finish Wu. 王濬楼船下益州，金陵王气黯然收. 首下石城.     */

  /**
   * 筑舰 — once per play phase, at least two characters with something in their
   * equip area each draw a card.
   *
   * The shipyard. Masts stand up one after another with the pennants lifting
   * off them — `pillars` is the figure that arrives in sequence, and a fleet is
   * built in sequence — in pine over bronze, timber and fittings, reaching
   * across the table because he is arming other people's decks and not his own.
   */
  zhujian: {
    figure: 'pillars', swarm: 'ribbon', flight: 'rise', ground: 'none',
    hue: 'pine', hue2: 'bronze', stance: 'lift', tempo: 'even', n: 10, spread: 1.25, glyph: true,
  },

  /**
   * 断索 — once per play phase, reset any number of characters and then deal 1
   * fire damage to each of them.
   *
   * Wu strung iron chains across the river and drove spikes into the bed. He
   * built rafts to sweep the spikes and enormous oil-soaked torches to burn
   * through the chains, and the chains came apart. There is one right image for
   * this and it is a chain snapping in fire.
   */
  duansuo: {
    figure: 'chain', swarm: 'cinder', flight: 'out', ground: 'ripple',
    hue: 'flame', hue2: 'ember', stance: 'lunge', tempo: 'quick', n: 14, turn: 8, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 王朗 --
   * Wei's 司徒, and in the novel the man Zhuge Liang argues to death in front of
   * both armies. His two skills run on "饶舌" marks — garrulity — and at seven
   * of them the card kills him. 凤鹛: the phoenix, and the chattering babbler. */

  /**
   * 鼓舌 — 拼点 with up to three characters at once; each loser discards a card
   * or lets you draw. When the loser is you, you take a "饶舌" mark first.
   *
   * A fan of talk opening on three people simultaneously, cards crossing the
   * whole table, in amber going to ash — hot air, and what is left of it. `n`
   * is three because three is the most he can shout at.
   */
  gushe: {
    figure: 'fan', swarm: 'card', flight: 'across', ground: 'wash',
    hue: 'amber', hue2: 'ash', stance: 'lunge', tempo: 'quick', n: 3, turn: -14, spread: 1.4, glyph: true,
  },

  /**
   * 激词 — with your 鼓舌 card revealed, raise it by your "饶舌" count, or match
   * it exactly and buy another go.
   *
   * His shame is literally his ammunition: the worse he has talked, the harder
   * this hits. A hard flash and seven zigzags going out — seven, the number of
   * marks at which the card announces that he has died of it.
   */
  jici: {
    figure: 'star', swarm: 'bolt', flight: 'out', ground: 'wash',
    hue: 'flame', hue2: 'ash', stance: 'flare', tempo: 'quick', n: 7, spread: 1.1, glyph: true,
  },

  /* -------------------------------------------------------------- 吴珂 --
   * 智略权谲 — strategy and expedient deceit. Both skills work by handing a
   * problem back to the person who caused it.                                */

  /**
   * 谙达 — once a round, when somebody starts dying, the source of the damage
   * chooses: give them two cards of different colours, or heal them.
   *
   * The killer is made into the physician. The frame doubles and reverses and
   * the petals cross between the two halves — the same act, run backwards, in
   * peach over ink. Slow, because the man being asked has time to hate it.
   */
  anda: {
    figure: 'mirror', swarm: 'petal', flight: 'across', ground: 'bloom',
    hue: 'peach', hue2: 'ink', stance: 'turn', tempo: 'slow', n: 6, spread: 1.35, glyph: true,
  },

  /**
   * 助国 — level a character's hand to their max hp, capped at five; if they
   * drew nothing they heal, and if they drew the most at the table somebody else
   * is invited to shoot them.
   *
   * The state granary, levelling. The beam holds still while the coin hangs
   * over the table rather than travelling — nothing here is given away, it is
   * adjusted — and the second colour is blood, because that last clause is
   * where the "权谲" in his title lives.
   */
  zhuguo: {
    figure: 'scale', swarm: 'coin', flight: 'hover', ground: 'wash',
    hue: 'amber', hue2: 'blood', stance: 'still', tempo: 'even', n: 5, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 杨彪 --
   * 弘农杨氏, four generations of 三公, and 杨修's father. He kept Emperor Xian
   * alive through the flight from Chang'an; after Cao Cao executed his son he
   * would take no office, and when Cao asked why he had grown so thin he said
   * he lacked Jin Midi's foresight and still had the old ox's love of the calf.
   * 德彰海内.                                                                 */

  /**
   * 昭汉 — 锁定技. At each of your prepare phases: under four uses, gain max hp
   * and heal; from four to six, lose max hp.
   *
   * The skill waxes and then wanes on a fixed count, which is the Han itself.
   * The disc rises with the light behind it and the shadow is already coming
   * across — gold going to ash, on the `toll` rhythm, one beat per reign.
   */
  zhaohan: {
    figure: 'moon', swarm: 'glint', flight: 'rise', ground: 'rays',
    hue: 'gold', hue2: 'ash', stance: 'lift', tempo: 'toll', n: 9, glyph: true,
  },

  /**
   * 让节 — after taking a point of damage, either move a card on the field or
   * pull a card of a type you name out of the deck; then draw.
   *
   * 节 is both the tasselled staff of an imperial commissioner and a man's
   * integrity, and he yielded the office without yielding the second one. The
   * sleeve goes across, the tassels stream off it, one thing on the table is
   * somewhere else, and he bows.
   */
  rangjie: {
    figure: 'sweep', swarm: 'ribbon', flight: 'across', ground: 'none',
    hue: 'bone', hue2: 'gold', stance: 'bow', tempo: 'slow', n: 6, turn: -14, spread: 1.3, glyph: true,
  },

  /**
   * 义争 — 拼点 with somebody no stronger than you: win and they skip a draw
   * phase, lose and you give up a point of max hp.
   *
   * Arguing on principle with a man who can afford it less than you can, and
   * paying for it out of your own body when you are wrong. A wedge of bamboo
   * slips driven along one line — a memorial thrown at somebody, which is the
   * only weapon this family ever used.
   */
  mobile__yizheng: {
    figure: 'wedge', swarm: 'slip', flight: 'jet', ground: 'none',
    hue: 'ink', hue2: 'bone', stance: 'lunge', tempo: 'even', n: 5, turn: -10, spread: 1.3, glyph: true,
  },

  /* -------------------------------------------------------------- 杨奉 --
   * A 白波 bandit chief who came over, escorted Emperor Xian out of Chang'an
   * through 李傕's cavalry, and then went back to banditry in Yang province and
   * was killed by Liu Bei. 忠勇半途 — loyal and brave, halfway.               */

  /**
   * 血途 — 转换技. 阳 heals somebody, 阴 makes them draw two; at its third grade
   * 阳 heals you and strips them, 阴 draws you a card and wounds them.
   *
   * A 转换技 has two faces by construction, and `mirror` is the figure that is
   * literally the frame doubled with one copy reversed. Blood on one side and
   * peach on the other — the escort road that starts as protecting people and
   * finishes as living off them.
   */
  xuetu: {
    figure: 'mirror', swarm: 'drop', flight: 'across', ground: 'shade',
    hue: 'blood', hue2: 'peach', stance: 'turn', tempo: 'even', n: 10, turn: 6, spread: 1.3, glyph: true,
  },

  /**
   * 威命 — 使命技. Mark an unmarked character each play phase; kill an unmarked
   * one and 血途 improves, lose a marked one and it improves differently.
   *
   * He picks a man out and watches him. One lens, one spike, one target —
   * `n: 1`, because the rules text marks exactly one person per turn and a
   * shower of anything would make it a threat instead of a sentence.
   */
  weiming: {
    figure: 'eye', swarm: 'thorn', flight: 'out', ground: 'shade',
    hue: 'blood', hue2: 'void', stance: 'still', tempo: 'toll', n: 1, spread: 1.35, glyph: true,
  },

  /* -------------------------------------------------------------- 杨阜 --
   * After Ma Chao killed 韦康, Yang Fu raised the Longyou gentry against him,
   * lost his wife and most of his family for it, took five wounds, and drove
   * Ma Chao out of Liang province with borrowed men. 勇撼雄狮.                */

  /**
   * 借兵 — 锁定技. Hurt, take a card at random from somebody other than the man
   * who hurt you, and use it if it is equipment.
   *
   * 借兵 is borrowing troops, and he raised his against Ma Chao out of cousins
   * and neighbours after the blow had already landed. A net goes out over a
   * kinsman's seat and one blade comes back; he is still reeling when it does.
   */
  jiebing: {
    figure: 'net', swarm: 'blade', flight: 'in', ground: 'shade',
    hue: 'ash', hue2: 'bronze', stance: 'reel', tempo: 'quick', n: 6, spread: 1.35, glyph: true,
  },

  /**
   * 扞难 — 拼点 with another character; whoever wins deals the other 1 damage.
   *
   * The plainest skill in the pack and it should be the plainest picture: one
   * heavy blade comes down across the frame with the room dark behind it, on
   * `toll`, and one of the two men is under it. He fought Ma Chao himself and
   * came out of it with five holes in him.
   */
  hannan: {
    figure: 'crescent', swarm: 'shard', flight: 'out', ground: 'dim',
    hue: 'silver', hue2: 'blood', stance: 'lunge', tempo: 'toll', n: 10, turn: -24, spread: 1.15, glyph: true,
  },

  /* -------------------------------------------------------------- 阎圃 --
   * 张鲁's adviser, who talked him out of declaring himself king, and when
   * Hanzhong fell told him not to burn the treasuries but to seal them and
   * leave them for Cao Cao. It bought Zhang Lu a marquisate and Yan Pu one of
   * his own. 盱衡识势 — knowing which way it is going.                        */

  /**
   * 缓图 — once a round, give a card to somebody in your reach to make them skip
   * their draw phase; at that turn's end you settle up, either healing them and
   * drawing them two, or drawing three and handing two back.
   *
   * 封存府库: the storehouse doors are shut and sealed rather than burned, and
   * opened later by arrangement. Nothing is destroyed and nothing is taken —
   * everything is only deferred, which is the whole of his career.
   */
  huantu: {
    figure: 'gate', swarm: 'rune', flight: 'in', ground: 'dim',
    hue: 'bronze', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 8, spread: 1.3, glyph: true,
  },

  /**
   * 避祸 — 限定技. When a character comes out of dying, draw them three and put
   * everyone else a long way away from them for the round.
   *
   * The guard hexagon closes around somebody who has just nearly died, and the
   * smoke of it goes out past the neighbouring seats — the distance is the
   * protection. He never saved anybody by fighting for them.
   */
  bihuoy: {
    figure: 'aegis', swarm: 'plume', flight: 'out', ground: 'smoke',
    hue: 'bone', hue2: 'jade', stance: 'lift', tempo: 'slow', n: 10, spread: 1.4, glyph: true,
  },

  /* -------------------------------------------------------------- 张布 --
   * With 濮阳兴 he put 孙休 on the throne over 孙綝's body, and then put 孙皓 on
   * it after him — and 孙皓 killed them both inside a year. 主胜辅义.          */

  /**
   * 惩凶 — using a trick aimed only at other people, strip a card off somebody
   * holding enough of them, and if its colour matches your trick, wound them.
   *
   * 惩凶 is punishing the violent, which is what he called the purge of 孙綝.
   * Two strokes of a writ crossing the seat and the splinters going out along
   * them: ink and blood, an execution order rather than a fight.
   */
  chengxiong: {
    figure: 'strokes', swarm: 'shard', flight: 'out', ground: 'shade',
    hue: 'ink', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 9, turn: 16, spread: 1.3, glyph: true,
  },

  /**
   * 妄专 — when damage comes from something that is not a card and you are at
   * either end of it, draw, and the turn player's non-locked skills stop working
   * for the turn.
   *
   * 专权 was the charge Sun Hao executed him on, and this skill is that word:
   * he switches other people's abilities off. The grid closes inward and locks
   * over somebody else's turn, in void over ash, and it does not ask.
   */
  wangzhuan: {
    figure: 'lattice', swarm: 'rune', flight: 'in', ground: 'dim',
    hue: 'void', hue2: 'ash', stance: 'still', tempo: 'toll', n: 8, spread: 1.3, glyph: true,
  },

  /* ---------------------------------------------------------- 赵统赵广 --
   * Zhao Yun's two sons on one card. 赵统 inherited the marquisate; 赵广 died at
   * 沓中 covering Jiang Wei's retreat from Deng Ai. 翊赞季兴. The design brief
   * here was mostly a prohibition: this must never read as 龙胆 across the
   * table, so nothing coils and nothing flares.                              */

  /**
   * 翊赞 — two cards, at least one of them basic, become any basic card.
   *
   * Two of them make one thing, so two shafts of light stand up side by side
   * and the cards come in between them. `n: 2` is the two cards and also the
   * two brothers, and the whole effect is quiet — they are their father's
   * support, which is what 翊赞 means, and support does not lunge.
   */
  yizan: {
    figure: 'pillars', swarm: 'card', flight: 'in', ground: 'bloom',
    hue: 'silver', hue2: 'azure', stance: 'lift', tempo: 'even', n: 2, spread: 0.8, glyph: true,
  },

  /**
   * 龙渊 — 觉醒技. After three uses of 〖翊赞〗, it needs only one card.
   *
   * 龙渊 is a sword out of the old catalogue and it is also, read plainly, the
   * dragon's deep — their father's name is 子龙 and this is what he left. The
   * two shafts of 翊赞 become one, and the blade rises out of it with the light
   * behind. The awakening is the moment two people stop needing to be two.
   */
  longyuan: {
    figure: 'column', swarm: 'blade', flight: 'rise', ground: 'rays',
    hue: 'frost', hue2: 'indigo', stance: 'lift', tempo: 'toll', n: 6, spread: 0.85, glyph: true,
  },

  /**
   * 周群 · 天算 — once a round, draw a fortune lot — and before the draw you may
   * quietly slip an extra one into the tube to improve your odds — then hang its
   * effect on somebody until your next turn.
   *
   * Shu's great diviner, 后圣, who read the cloud-vapour and told Liu Bei he
   * would take Hanzhong's land and not its people, and was right. The lots turn
   * in the tube and curl inward — five of them, 上上 to 下下 — and the second
   * colour is sulphur, because the rules text says out loud that he cheats.
   */
  tiansuan: {
    figure: 'spiral', swarm: 'slip', flight: 'curl', ground: 'dim',
    hue: 'violet', hue2: 'sulphur', stance: 'still', tempo: 'slow', n: 5, spread: 0.8, glyph: true,
  },

  /* ------------------------------------------------------------ 诸葛果 --
   * Zhuge Liang's daughter, who has almost no history and a great deal of
   * legend: she is said to have taken orders at 乘烟观 and gone up on the smoke.
   * 凤阁乘烟.                                                                 */

  /**
   * 祈禳 — when equipment enters your equip area, take a trick card out of the
   * deck at random; using it has no distance limit and draws you a card.
   *
   * 禳 is the rite that argues with heaven — her father set out seven lamps at
   * Wuzhangyuan to hold his own star in the sky, and Wei Yan kicked one over.
   * The seal turns and rises with the answer coming out of it. `n: 7` is his
   * lamps; she is the one who got the ritual to work.
   */
  qirang: {
    figure: 'sigil', swarm: 'rune', flight: 'rise', ground: 'rays',
    hue: 'orchid', hue2: 'gold', stance: 'lift', tempo: 'slow', n: 7, spread: 0.9, glyph: true,
  },

  /**
   * 羽化 — 锁定技. Non-basic cards do not count against your hand limit; holding
   * more than your hp, you sort the top of the deck at your end phase.
   *
   * 羽化登仙 — feathering away into transcendence, and 乘烟, riding the smoke.
   * There is no figure, because the point of the legend is that she is not
   * there any more: only feathers going up out of a seat that is emptying, in
   * moonlight over orchid. The whole card is a woman leaving.
   */
  yuhua: {
    figure: 'none', swarm: 'feather', flight: 'rise', ground: 'smoke',
    hue: 'moon', hue2: 'orchid', stance: 'lift', tempo: 'slow', n: 14, spread: 1.2, glyph: true,
  },

  /* ------------------------------------------------------------ 诸葛恪 --
   * 兴家赤族 — his own father's verdict on him: he will either raise this house
   * or wipe it out. The prodigy who wrote 之驴 under the donkey's name at Sun
   * Quan's banquet, then won at 东兴, then sat in front of Hefei New City for
   * months until plague ate his army, and was murdered at a dinner. The clan
   * was exterminated.                                                        */

  /**
   * 傲才 — needing a basic card outside your turn, look at the top two and take
   * the one you need.
   *
   * He always had the answer, and he was always visibly pleased about it. One
   * hard flash, two cards coming in close to the seat, over before anyone else
   * has moved. `n: 2` is the two cards; `dawn` is a talent that has not yet
   * found out what it costs.
   */
  aocai: {
    figure: 'star', swarm: 'card', flight: 'in', ground: 'none',
    hue: 'dawn', hue2: 'ash', stance: 'still', tempo: 'quick', n: 2, spread: 0.7, glyph: true,
  },

  /**
   * 黩武 — throw away as many cards as a man has hit points to deal him one
   * point of damage; if it puts him under, you bleed and the skill shuts off.
   *
   * 穷兵黩武, and 新城. The wedge is driven at one seat and eighteen cinders go
   * with it, because the cost is the whole idea — he spent an army to move a
   * wall one inch, and then the plague finished what was left of it.
   */
  duwu: {
    figure: 'wedge', swarm: 'cinder', flight: 'jet', ground: 'vignette',
    hue: 'blood', hue2: 'ash', stance: 'lunge', tempo: 'toll', n: 18, turn: -8, spread: 1.15, glyph: true,
  },
};
