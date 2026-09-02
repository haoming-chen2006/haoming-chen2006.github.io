/**
 * The 珍将 pack: sixty-three skills off the rare list.
 *
 * This is where the game keeps its legends, its gods and its curiosities — a
 * 神司马懿 who wins by refusing to answer, an engineer whose signature move is a
 * water-driven puppet theatre, a recluse who is barely in the game at all, and
 * three separate 张辽s. So this file spends the vocabulary the standard set
 * mostly holds back: `sigil`, `void`, `dim`, `rays`, and the spreads past 1.3
 * that put particles in somebody else's seat. Each of those is spent on a skill
 * whose rules text asks for it — 慧夭 reaches 1.4 because it makes two other
 * people collide, not because 周不疑 is rare.
 *
 * Same method as the standard twenty-five: read the engine's text, find what
 * the name alludes to, and let the two of them together pick the picture.
 */
import type { Motif } from '../motif';

export const RARE: Readonly<Record<string, Motif>> = {
  /**
   * 曹纯 · 缮甲 — draw three, discard 3 minus the equipment you have lost; what
   * you did NOT discard buys an extra 杀 or a free range.
   *
   * 缮甲治兵 (左传): repair the armour, drill the troops. He commanded the
   * 虎豹骑, Cao Cao's household cavalry, and the skill is the morning before
   * the ride: the guard hexagon draws itself shut while the plates come back in.
   */
  shanjia: {
    figure: 'aegis', swarm: 'shard', flight: 'in', ground: 'shade',
    hue: 'bronze', hue2: 'silver', stance: 'brace', tempo: 'even', n: 12, glyph: true,
  },

  /**
   * 凌操 · 独进 — draw X+1 extra, X being half your equipment.
   *
   * 激流勇进. He rowed out ahead of the fleet at Xiakou and Gan Ning shot him off
   * the deck — the same 甘宁 whose 射却 is eleven entries down this file. A bow
   * wave leaves the seat and the river comes back over him; nothing spreads,
   * because 独进 is one boat on one heading.
   */
  dujin: {
    figure: 'wave', swarm: 'drop', flight: 'jet', ground: 'ripple',
    hue: 'azure', hue2: 'frost', stance: 'lunge', tempo: 'quick', n: 13, turn: -12, spread: 1.05, glyph: true,
  },

  /**
   * 留赞 · 奋音 — in your turn, a card of a different colour from the last one
   * draws you a card.
   *
   * He had a crippled leg and before every battle he loosened his hair and sang
   * to heaven, and the army sang back. The skill is literally alternation, so
   * the two colours are the two card colours: a rank of voices standing up in
   * sequence, red answering black, counted on the `toll`.
   */
  fenyin: {
    figure: 'pillars', swarm: 'plume', flight: 'rise', ground: 'ripple',
    hue: 'cinnabar', hue2: 'ink', stance: 'lift', tempo: 'toll', n: 12, glyph: true,
  },

  /* --- 友庞统 · 凤翥南地 -------------------------------------------------
   * 凤雏, the Fledgling Phoenix, named by 庞德公 (below, 评才). Recommended by
   * everyone and used by nobody until Liu Bei finally listened; killed by an
   * arrow at 落凤坡 — Fallen Phoenix Slope — at thirty-six. The 友 pack is the
   * co-op version, so all three skills lean on who else is at the table.
   */

  /**
   * 漫卷 — gaining two or more cards at once, put any back on the deck and pull
   * a card of a DIFFERENT category out of the discard for each.
   *
   * 漫卷诗书喜欲狂 (杜甫) — rolling up the books, half mad with joy. Cards go up
   * the spiral and different ones come back down it: `recoil` is the round trip.
   */
  friend__manjuan: {
    figure: 'spiral', swarm: 'card', flight: 'recoil', ground: 'smoke',
    hue: 'dusk', hue2: 'amber', stance: 'still', tempo: 'quick', n: 10, glyph: true,
  },

  /**
   * 养名 — having shed three hand cards, reveal X off the deck and use the ones
   * with distinct suits.
   *
   * He made his name grading other men and always over-praising them: in a bad
   * age, he said, you raise people up so there is something to aim at. The
   * phoenix opens its tail into the light and the feathers leave it.
   */
  friend__yangming: {
    figure: 'fan', swarm: 'feather', flight: 'flare', ground: 'rays',
    hue: 'flame', hue2: 'gold', stance: 'lift', tempo: 'even', n: 9, glyph: true,
  },

  /**
   * 共砺 — 锁定技. Better if 友诸葛亮 or 友徐庶 is on your side.
   *
   * 相互砥砺: two blades on one stone. All three 共砺 in this file are the same
   * `mirror` held still, and only the colour pair changes — phoenix against
   * dragon here, so that the trio reads as one idea seen from three seats.
   */
  pangtong__gongli: {
    figure: 'mirror', swarm: 'spark', flight: 'hover', ground: 'none',
    hue: 'flame', hue2: 'jade', stance: 'still', tempo: 'slow', n: 8, glyph: true,
  },

  /* --- 友徐庶 · 潜悟诲人 -------------------------------------------------
   * A knight-errant who killed a man for a friend, was taken with his face
   * whitewashed and would not give his name; freed, he broke the sword and went
   * to study. Later blackmailed into Cao Cao's camp by a forged letter from his
   * mother — 徐庶进曹营，一言不发, and he never spoke again.
   */

  /**
   * 侠行 — you start holding 【玄剑】, and when it hits the discard you can buy
   * it back with two 启诲 markers.
   *
   * The Dark Sword goes out and comes back: `recoil` is the only flight that is
   * a return trip, and it is the whole skill. This is the youth, before the
   * silence.
   */
  xiaxing: {
    figure: 'sweep', swarm: 'blade', flight: 'recoil', ground: 'shade',
    hue: 'void', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 7, turn: -20, glyph: true,
  },

  /**
   * 启诲 — 锁定技. Each card category you use marks you once; at three marks,
   * spend two and take a lesson: heal, draw two, or one unlimited card.
   *
   * 启 means to open. So it is a gate, opening, with the bamboo slips coming in
   * through it — the man who put the sword down and went in to be taught.
   */
  qihui: {
    figure: 'gate', swarm: 'slip', flight: 'in', ground: 'bloom',
    hue: 'ink', hue2: 'celadon', stance: 'lift', tempo: 'slow', n: 9, glyph: true,
  },

  /** 共砺 — the same stone, ink against phoenix-red. */
  xushu__gongli: {
    figure: 'mirror', swarm: 'spark', flight: 'hover', ground: 'none',
    hue: 'ink', hue2: 'flame', stance: 'still', tempo: 'slow', n: 8, glyph: true,
  },

  /* --- 友诸葛亮 · 龙骧九天 ----------------------------------------------
   * 卧龙, the Sleeping Dragon, rising to the ninth heaven. The 友 version is
   * built entirely around 卧龙演策 — a declared prediction that the table then
   * verifies card by card.
   */

  /**
   * 演策 — declare a prediction of category or colour; every card played that
   * matches draws you one, and the tally at the end pays or bleeds you.
   *
   * The one skill in the file that is an augury: counter-turning rings with the
   * predicted cards face-down in orbit, waiting to be turned over. `violet` is
   * the omen colour, and the room goes dark so nothing else is being read.
   */
  yance: {
    figure: 'sigil', swarm: 'card', flight: 'orbit', ground: 'dim',
    hue: 'violet', hue2: 'frost', stance: 'still', tempo: 'slow', n: 11, spread: 1.15, glyph: true,
  },

  /**
   * 方遒 — 限定技. Show the prediction; every payout is worth one more.
   *
   * 挥斥方遒 — the brush swept out, all restraint gone. Once a game he stops
   * hiding what he wrote: three strokes laid down, the slips lifting off them,
   * and light behind the seat. `toll`, because a 限定技 gets to be slow.
   */
  fangqiu: {
    figure: 'strokes', swarm: 'slip', flight: 'rise', ground: 'rays',
    hue: 'gold', hue2: 'celadon', stance: 'lift', tempo: 'toll', n: 8, glyph: true,
  },

  /** 共砺 — the same stone, dragon-jade against ink. The trio closes its loop. */
  zhugeliang__gongli: {
    figure: 'mirror', swarm: 'spark', flight: 'hover', ground: 'none',
    hue: 'jade', hue2: 'ink', stance: 'still', tempo: 'slow', n: 8, glyph: true,
  },

  /* --- 骥李典 · 义忘私隙 -------------------------------------------------
   * Lü Bu's men killed his uncle and he grew up scholarly and deep-tempered
   * anyway. At Hefei, with a standing grudge against both his co-commanders:
   * 此国家大事，吾可以私憾而忘公义乎 — this is a matter of state; shall I forget
   * public duty over a private grievance?
   */

  /**
   * 断津 — after a basic card of yours resolves, discard a card from someone who
   * has played this turn.
   *
   * 断 is to sever, 津 is the ford. A chain snaps taut across the crossing and
   * the river goes up off it; whoever was mid-stream loses what they were
   * carrying.
   */
  duanjin: {
    figure: 'chain', swarm: 'drop', flight: 'across', ground: 'ripple',
    hue: 'ink', hue2: 'frost', stance: 'lunge', tempo: 'quick', n: 10, turn: 16, glyph: true,
  },

  /**
   * 概公 — swap up to two hand cards against the bottom of the deck; three suits
   * in the trade buys you a free card.
   *
   * 概 is the strike-stick a granary officer runs across the measure so nobody
   * is cheated. A beam that tips, overshoots and settles, with the cards passing
   * across it — public weights and measures, which is the man.
   */
  gaigong: {
    figure: 'scale', swarm: 'card', flight: 'across', ground: 'wash',
    hue: 'bronze', hue2: 'celadon', stance: 'still', tempo: 'even', n: 8, turn: -6, glyph: true,
  },

  /**
   * 合御 — 锁定技, better with 骥乐进 or 骥张辽 present.
   *
   * The joint defence of Hefei by three men who could not stand each other. All
   * three 合御 are one guard hexagon closing on converging points of light, with
   * gold as the shared half — the colour of the command, not of the man.
   */
  lidian__heyu: {
    figure: 'aegis', swarm: 'glint', flight: 'in', ground: 'frost',
    hue: 'celadon', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 8, glyph: true,
  },

  /* --- 骥乐进 · 折冲御侮 -------------------------------------------------
   * 容貌短小 and first over the wall every time — 每战先登, the histories say,
   * over and over, for twenty years.
   */

  /**
   * 陷坚 — after your 杀 picks its only target, either strip them, or leave the
   * 杀 itself lodged in an empty equipment slot of theirs.
   *
   * 陷阵却敌: to sink into the line. The second option is the design — a blade
   * driven down one axis that stops in the other man's frame and stays there,
   * which is why it reaches past 1.1 into his seat and nothing fans out.
   */
  xianjian: {
    figure: 'wedge', swarm: 'blade', flight: 'jet', ground: 'shade',
    hue: 'blood', hue2: 'silver', stance: 'lunge', tempo: 'quick', n: 9, turn: -14, spread: 1.15, glyph: true,
  },

  /**
   * 折锐 — anyone carrying a 陷坚 card triggers it again by swinging; losing it
   * costs them a point of damage.
   *
   * 折其锐气. The barb is already in — this is it turning. A logarithmic arm
   * winds inward with the thorns riding it, and the dark closes from the
   * corners on somebody else's wound.
   */
  zherui: {
    figure: 'spiral', swarm: 'thorn', flight: 'curl', ground: 'vignette',
    hue: 'blood', hue2: 'ash', stance: 'brace', tempo: 'quick', n: 11, glyph: true,
  },

  /** 合御 — the same hexagon; his half of it is the red one. */
  yuejin__heyu: {
    figure: 'aegis', swarm: 'glint', flight: 'in', ground: 'frost',
    hue: 'blood', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 8, glyph: true,
  },

  /* --- 骥张辽 · 气夺三军 -------------------------------------------------
   * 逍遥津: eight hundred picked men through Sun Quan's hundred thousand at
   * first light, twice. Afterwards Wu mothers quieted crying children with his
   * name. The third 张辽 in the game and the loudest.
   */

  /**
   * 冲垒 — 锁定技. In your play phase nobody else's non-basic hand cards are
   * anything but 闪, and every card of yours they answer costs them one.
   *
   * The charge goes out as a flat ground wave across the whole table — 1.35,
   * because the text is about everyone — and the plunder comes back in on it.
   * The room dims: at 逍遥津 nothing else was happening.
   */
  chonglei: {
    figure: 'wave', swarm: 'card', flight: 'in', ground: 'dim',
    hue: 'dawn', hue2: 'blood', stance: 'lunge', tempo: 'toll', n: 12, spread: 1.35, glyph: true,
  },

  /**
   * 荡势 — after a damage card, a target picks: discard X, or take one more.
   * X climbs every time anyone chooses it.
   *
   * 荡 is to sweep clean away. A fan opens wider on each use, which is the only
   * figure that grows without changing — cold steel with his dawn behind it.
   */
  dangshi: {
    figure: 'fan', swarm: 'blade', flight: 'flare', ground: 'shade',
    hue: 'frost', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 12, turn: -18, spread: 1.2, glyph: true,
  },

  /** 合御 — the same hexagon; his half is bare steel. */
  zhangliao__heyu: {
    figure: 'aegis', swarm: 'glint', flight: 'in', ground: 'frost',
    hue: 'silver', hue2: 'gold', stance: 'brace', tempo: 'toll', n: 8, glyph: true,
  },

  /* --- 马钧 · 没渊瑰璞 ---------------------------------------------------
   * The finest mechanician of the age and a stammerer who could never argue his
   * own case: he rebuilt the south-pointing chariot, redesigned the silk loom,
   * and built the 龙骨水车 that still irrigated fields a thousand years later.
   * 没渊瑰璞 — a jade sunk in the deep, which is what 傅玄 said had happened to
   * him.
   */

  /**
   * 精械 — reveal one of five named pieces of equipment and UPGRADE it; dying,
   * recast an armour and come back at 1.
   *
   * Gearing. Nested rings leaving at staggered delays are a gear train, and a
   * `coin` is a disc with a square hole through it, which is a cog on its axle.
   * Nothing here is magic — it is bronze, turning, on time.
   */
  jingxie: {
    figure: 'rings', swarm: 'coin', flight: 'orbit', ground: 'none',
    hue: 'bronze', hue2: 'verdigris', stance: 'still', tempo: 'even', n: 10, glyph: true,
  },

  /**
   * 巧思 — perform the 水转百戏图, take the cards it wins you, then discard that
   * many or hand them to somebody.
   *
   * The water-powered puppet theatre he built for Emperor Ming: a hundred
   * little wooden figures on one wheel, drumming, dancing, throwing swords,
   * grinding flour. So the wheel turns on the water, the scenes ride round it,
   * and the pond rings behind. Nothing in this file is more fun than the source.
   */
  qiaosi: {
    figure: 'spiral', swarm: 'rune', flight: 'orbit', ground: 'ripple',
    hue: 'verdigris', hue2: 'amber', stance: 'still', tempo: 'even', n: 16, spread: 0.8, glyph: true,
  },

  /* --- 祢衡 · 鸷鹗啄孤凤 -------------------------------------------------
   * 击鼓骂曹: made a drummer to humiliate him, he stripped naked in the hall
   * while changing and abused Cao Cao to his face. Passed to Liu Biao, passed
   * to Huang Zu, killed at twenty-six. He wrote the 鹦鹉赋 at the banquet.
   */

  /**
   * 狂才 — cut your own clock to FIVE SECONDS; in exchange, no limits at all,
   * and every card draws you one and takes another second off.
   *
   * The most reckless mechanic in the game and a straight portrait of the man:
   * brilliance running on a fuse it is shortening itself. `sulphur` is the
   * poison yellow-green, which is what his gift actually was.
   */
  mobile__kuangcai: {
    figure: 'star', swarm: 'bolt', flight: 'out', ground: 'bloom',
    hue: 'sulphur', hue2: 'flame', stance: 'flare', tempo: 'quick', n: 20, spread: 1.25, glyph: true,
  },

  /**
   * 舌剑 — having discarded two-plus cards of all different suits, take one from
   * somebody.
   *
   * 唇枪舌剑. Three strokes go down like writing and leave as blades along one
   * heading. Ink and sulphur: what he said, and what it did.
   */
  mobile__shejian: {
    figure: 'strokes', swarm: 'blade', flight: 'jet', ground: 'none',
    hue: 'ink', hue2: 'sulphur', stance: 'lunge', tempo: 'quick', n: 7, turn: 24, glyph: true,
  },

  /* --- 彻里吉 · 北境寒锋 -------------------------------------------------
   * The Qiang king of 演义 ch.94, who sent 越吉 and the iron chariots against
   * Shu and lost them in the snow.
   */

  /**
   * 驱乘 — 锁定技. No distance limit, but only your immediate neighbours; and a
   * 杀 that draws no blood rolls on to the NEXT seat along.
   *
   * The chariot line, and a skill written entirely about the seats either side
   * of you — which is the one honest reason to run `spread` all the way to 1.4.
   * Iron links drawing taut across the table, in snow.
   */
  qusheng: {
    figure: 'chain', swarm: 'snow', flight: 'across', ground: 'frost',
    hue: 'silver', hue2: 'frost', stance: 'lunge', tempo: 'toll', n: 14, spread: 1.4, glyph: true,
  },

  /**
   * 羌勇 — 锁定技. Damage strips X cards off the victim, X being your 杀 count
   * this turn; strip them empty and it hits for one more.
   *
   * He rides through and their hand ends up on the ground: cards thrown out and
   * down on a gravity arc, bone-dry dust with blood in it. It escalates within
   * the turn, so nothing about it settles.
   */
  qiangyong: {
    figure: 'wedge', swarm: 'card', flight: 'arc', ground: 'shade',
    hue: 'bone', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 10, turn: -10, glyph: true,
  },

  /* --- 崔芙 · 戴冠金尾 ---------------------------------------------------
   * A wardrobe general: she picks her look at game start and plays the rest of
   * the game with her hand half face-up. Both skills are about cloth, so both
   * are quiet, close-in and slow, and neither one strikes anything.
   */

  /**
   * 裁裘 — each round, read the top X and keep at least one; if anyone plays a
   * card with the same NAME this round, it costs you a point of health.
   *
   * 集腋成裘 — a thousand fox-armpits make one robe. The fur drifts in and
   * settles into a sheet over her, close in at 0.7; the colour goes out of her
   * when the room turns up wearing the same thing.
   */
  caiqiu: {
    figure: 'veil', swarm: 'plume', flight: 'in', ground: 'smoke',
    hue: 'rouge', hue2: 'bone', stance: 'pale', tempo: 'slow', n: 9, spread: 0.7, glyph: true,
  },

  /**
   * 袭裳 — 锁定技. Pick a 褽装 at game start; cards you gain other than by
   * drawing turn face-up, and your face-up cards cannot be seen when chosen.
   *
   * The robe unrolls down the frame and the silk falls with it, and the room
   * goes dark around the one lit thing — which is the joke of the skill, that
   * being the most visible person at the table is how she hides.
   */
  xichang: {
    figure: 'banner', swarm: 'ribbon', flight: 'fall', ground: 'dim',
    hue: 'orchid', hue2: 'gold', stance: 'turn', tempo: 'slow', n: 10, spread: 0.65, glyph: true,
  },

  /* --- 神司马懿 · 三分一统 -----------------------------------------------
   * The god card, and the arc of the whole war in three skills: wait, be given
   * the seal, break everything. Zhuge Liang sent him women's clothing to shame
   * him into the field; he put it on and asked the messenger how his master was
   * sleeping and eating. The messenger told him. That was the campaign.
   */

  /**
   * 忍戒 — 锁定技, four times a round. Every time you COULD answer a card and do
   * not, you take a 忍 mark.
   *
   * The only skill in the game that pays you for inaction, so it has no figure
   * at all: four marks — exactly the cap — drift in out of the dark and hover
   * at half a seat width. Nothing leaves. Nothing moves. He does not move.
   */
  mobile__renjie: {
    figure: 'none', swarm: 'rune', flight: 'in', ground: 'dim',
    hue: 'void', hue2: 'ash', stance: 'still', tempo: 'slow', n: 4, spread: 0.5, glyph: true,
  },

  /**
   * 拜印 — 觉醒技. At four 忍 marks, give up a point of maximum health and take
   * 〖极略〗.
   *
   * The seal of command comes down and rank opens over his head. `fall` and
   * `toll` together are the only way to draw a thing being handed to you from
   * above, and gold on void is the throne arriving in the dark he waited in.
   */
  mobile__baiyin: {
    figure: 'halo', swarm: 'rune', flight: 'fall', ground: 'rays',
    hue: 'gold', hue2: 'void', stance: 'lift', tempo: 'toll', n: 7, glyph: true,
  },

  /**
   * 连破 — kill somebody and take an extra turn, or take another 极略 skill.
   *
   * 破 after 破 after 破: Meng Da in eight days, Liaodong buried, then the coup
   * at the Gaoping Tombs. The room-scale entry of the pack — a black shaft
   * standing over a table that has gone out, wreckage at 1.4 in everyone else's
   * air. 三分一统 is the title, and this is the skill that means it.
   */
  mobile__lianpo: {
    figure: 'column', swarm: 'shard', flight: 'out', ground: 'dim',
    hue: 'void', hue2: 'blood', stance: 'lift', tempo: 'toll', n: 18, spread: 1.4, glyph: true,
  },

  /* --- 张奋 · 究械菁杰 ---------------------------------------------------
   * Wu's siege engineer, who proposed and built the 大攻车 — and whose second
   * skill is what happens to him when he has not built it yet.
   */

  /**
   * 渠冲 — recast equipment, melt the discard pile's equipment into casting
   * points, and at 0/5/10/10 build a 大攻车 and hand it to somebody.
   *
   * 渠冲 is the ram itself. Scrap metal comes in out of the smoke and takes the
   * shape of a wedge; the swarm is `coin` because a casting point is literally
   * a slug of cast bronze. `toll` — a foundry is counted, not rushed.
   */
  quchong: {
    figure: 'wedge', swarm: 'coin', flight: 'in', ground: 'smoke',
    hue: 'bronze', hue2: 'ember', stance: 'brace', tempo: 'toll', n: 12, glyph: true,
  },

  /**
   * 逊节 — 锁定技. With no 大攻车 on the field and a bigger man hitting you,
   * judge; red takes a point off.
   *
   * 逊 is to yield. The engineer with no engine: a soft core swells, the blow
   * is absorbed into it, and nothing travels further than 0.6 from the seat.
   * The frost creeps in from the edges and that is the entire defence.
   */
  mobile__xunjie: {
    figure: 'orb', swarm: 'bubble', flight: 'hover', ground: 'frost',
    hue: 'celadon', hue2: 'moon', stance: 'brace', tempo: 'slow', n: 8, spread: 0.6, glyph: true,
  },

  /* --- 星董卓 · 破羌安边 -------------------------------------------------
   * The 星 pack is the road not taken, and this is Dong Zhuo before Luoyang: a
   * Liangzhou officer who could shoot from either hand at the gallop and who
   * slaughtered his own plough-oxen to feast visiting Qiang chieftains, who
   * sent him back a thousand head of cattle. All three skills are about a body
   * spent to buy something — which is also how it ended.
   */

  /**
   * 雄进 — once a round, at your play phase or somebody else's, hand out X cards
   * (X being health you have already lost); the discard phase then takes back
   * half their hand.
   *
   * The oxen. An open hand throwing coin out past 1.2 into the guest's seat,
   * the host dipping as he gives, and the whole thing paid for out of his own
   * wounds.
   */
  xiongjin: {
    figure: 'bloom', swarm: 'coin', flight: 'out', ground: 'wash',
    hue: 'ember', hue2: 'gold', stance: 'bow', tempo: 'even', n: 10, spread: 1.2, glyph: true,
  },

  /**
   * 镇边 — 锁定技. Hand limit equals maximum health; four suits recorded off the
   * discard pile buys a permanent point of it.
   *
   * The frontier command, growing. A net falls over the seat and the suits wind
   * inward into it; he swells as it closes. Bone and verdigris — a garrison,
   * not a court.
   */
  zhenbian: {
    figure: 'net', swarm: 'rune', flight: 'curl', ground: 'vignette',
    hue: 'bone', hue2: 'verdigris', stance: 'swell', tempo: 'slow', n: 8, spread: 0.6, glyph: true,
  },

  /**
   * 暴袭 — burn a point of maximum health to throw a 决斗, or another to throw an
   * unlimited 杀.
   *
   * Here it turns. A heavy blade falls on an arc with his own body coming off it
   * as embers, and the portrait sags and loses colour as it lands: 镇边 grew him
   * and this is him spending it, twice a round, until there is nothing left.
   */
  baoxi: {
    figure: 'crescent', swarm: 'cinder', flight: 'arc', ground: 'vignette',
    hue: 'blood', hue2: 'ember', stance: 'wilt', tempo: 'quick', n: 14, turn: 30, glyph: true,
  },

  /* --- 星法正 · 弹铗待试 -------------------------------------------------
   * 冯谖弹铗: Lord Mengchang's unnoticed retainer, tapping his sword-hilt and
   * singing 长铗归来乎，食无鱼 until somebody worked out what he was worth. Fa
   * Zheng spent years unemployed under Liu Zhang, then handed Shu to Liu Bei,
   * planned Hanzhong, and settled every old score he had. All three skills are
   * water and waiting.
   */

  /**
   * 藏铗 — 锁定技. Cards gained outside your play phase record their suit, and
   * in your play phase you may use nothing else.
   *
   * 藏 is concealment, and the moon with a shadow crossing it is the file's
   * figure for it. The blades hang unmoving in the dark at 0.55 — everything he
   * owns, none of it drawn yet. Sulphur, because he did not forget anything.
   */
  cangjia: {
    figure: 'moon', swarm: 'blade', flight: 'hover', ground: 'dim',
    hue: 'ink', hue2: 'sulphur', stance: 'still', tempo: 'slow', n: 8, spread: 0.55, glyph: true,
  },

  /**
   * 堕洄 — at anyone's prepare phase they may give you a card; you answer with a
   * card of the same suit, or let them draw.
   *
   * 洄 is a back-current. The vocabulary calls `eye` the eye of a storm and an
   * eddy is exactly that: a lens opening in the water with the drops turning
   * inward. People feed him, and he pays — which is the retainer's half of the
   * bargain.
   */
  duohui: {
    figure: 'eye', swarm: 'drop', flight: 'curl', ground: 'ripple',
    hue: 'moon', hue2: 'celadon', stance: 'still', tempo: 'slow', n: 12, spread: 0.7, glyph: true,
  },

  /**
   * 跃渊 — draw one card per suit 藏铗 has recorded, then give a suit back.
   *
   * 或跃在渊 (乾卦 九四): the dragon that may leap from the deep. Everything the
   * other two skills sank goes up at once — a coil uncoiling upward with the
   * bubbles of the abyss coming off it and light where it breaks the surface.
   */
  yueyuan: {
    figure: 'coil', swarm: 'bubble', flight: 'rise', ground: 'bloom',
    hue: 'indigo', hue2: 'frost', stance: 'lift', tempo: 'quick', n: 13, glyph: true,
  },

  /* --- 星甘宁 · 铃震没羽 -------------------------------------------------
   * 锦帆贼 — silk on the masts and bells on the belts, so you knew who had just
   * robbed you. 没羽 is the arrow buried to its fletching.
   */

  /**
   * 锦帆 — at the discard phase, hang hand cards on your character card as 铃,
   * one per suit; use them like hand cards, and each one that leaves fetches
   * another of its suit.
   *
   * The sail, and FOUR bells — one suit each — hanging at 0.5 and ringing where
   * they are, on the `toll`. Nothing goes anywhere: 铃 stay on the board until
   * he spends them.
   */
  jinfan: {
    figure: 'banner', swarm: 'bead', flight: 'hover', ground: 'wash',
    hue: 'plum', hue2: 'gold', stance: 'still', tempo: 'toll', n: 4, spread: 0.5, glyph: true,
  },

  /**
   * 射却 — at another player's prepare phase, if they have equipment, put a 杀
   * into them at any distance, straight through the armour.
   *
   * No figure and three particles, because it is one arrow: the shot that took
   * 凌操 off his deck two entries into this file. 1.4 is the range, `shade` is
   * the moment before, and there is nothing else in the frame.
   */
  sheque: {
    figure: 'none', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'silver', hue2: 'blood', stance: 'lunge', tempo: 'quick', n: 3, turn: -8, spread: 1.4, glyph: true,
  },

  /* --- 星黄忠 · 强挚烈弓 -------------------------------------------------
   * Sixty years old at 定军山 and he came down the hill and cut Xiahou Yuan in
   * half. 老当益壮.
   */

  /**
   * 势敌 — 锁定技, 转换技. 阳 at the prepare phase: you reach one further and
   * your black 杀 cannot be answered. 阴 at the end phase: everyone is one
   * further from you, and you cannot answer a red 杀.
   *
   * A 转换技 is a beam with a weight on each pan, and this is the only skill in
   * the file where `hue` and `hue2` are literally the two halves of the rules
   * text: flame on the yang side, indigo on the yin, tipping twice a turn.
   */
  shidi: {
    figure: 'scale', swarm: 'spark', flight: 'recoil', ground: 'shade',
    hue: 'flame', hue2: 'indigo', stance: 'turn', tempo: 'toll', n: 10, glyph: true,
  },

  /**
   * 义释 — take a point off your own damage and take a piece of their equipment
   * instead.
   *
   * 演义 ch.53: Guan Yu spares him when his bowstring snaps, and the next day he
   * puts the arrow through the helmet tassel instead of the head. So the bow
   * goes out and a red plume comes back — `recoil`, bone-coloured wood, and the
   * old man dipping the weapon rather than loosing it properly.
   */
  xing__yishi: {
    figure: 'crescent', swarm: 'feather', flight: 'recoil', ground: 'rays',
    hue: 'bone', hue2: 'cinnabar', stance: 'bow', tempo: 'slow', n: 6, turn: -12, spread: 1.15, glyph: true,
  },

  /**
   * 骑射 — any equipment card may be drunk as 【酒】; hand limit up by whatever
   * you are wearing.
   *
   * The wine, then the horse. A hard ring of heat going out and the colour
   * flooding into the portrait — `blush` is in the vocabulary for one reason and
   * this is the skill it was waiting for.
   */
  qishe: {
    figure: 'ring', swarm: 'drop', flight: 'flare', ground: 'bloom',
    hue: 'amber', hue2: 'flame', stance: 'blush', tempo: 'quick', n: 10, glyph: true,
  },

  /* --- 星王朗 · 负固不服 -------------------------------------------------
   * A serious classicist and a famously lenient judge, remembered instead for
   * riding out at seventy-six to talk Zhuge Liang into surrendering and being
   * argued off his horse dead. 负固不服 (周礼) — holding his fastness, refusing
   * to submit. Both skills are 拼点: everything he does is a comparison.
   */

  /**
   * 负隅 — sole target either way, pindian for it: the user wins and the card
   * resolves TWICE; the user loses and it does nothing.
   *
   * 负隅顽抗 (孟子) — the tiger backed into the rock corner that nobody will go
   * in after. Two frames, one reversed, with the pindian card going between
   * them: doubled or annulled is what a mirror does. He stays inside 0.6.
   */
  fuyu: {
    figure: 'mirror', swarm: 'card', flight: 'recoil', ground: 'frost',
    hue: 'bone', hue2: 'azure', stance: 'brace', tempo: 'toll', n: 6, spread: 0.6, glyph: true,
  },

  /**
   * 瞻势 — when ANYONE pindians, pick players and pay that many cards; draw
   * three for each of your picks that wins.
   *
   * 瞻 is to look up and out at something. A lens opens and holds, the stake
   * hovering in it, and the reading runs to 1.35 because the whole skill is
   * other people's business. He never touches the duel.
   */
  zhanshi: {
    figure: 'eye', swarm: 'coin', flight: 'hover', ground: 'vignette',
    hue: 'celadon', hue2: 'gold', stance: 'still', tempo: 'slow', n: 9, spread: 1.35, glyph: true,
  },

  /* --- 星魏延 · 骜勇孤战 -------------------------------------------------
   * 骜 is untamed. He wanted five thousand men and the Ziwu Valley and Chang'an
   * in ten days; Zhuge Liang said no every year for a decade, and after Zhuge
   * Liang died a quarrel over precedence got him killed by Ma Dai. Both skills
   * are one man deciding on his own.
   */

  /**
   * 孤厉 — once a phase, your ENTIRE hand becomes one 杀 that ignores armour; if
   * it lands you may bleed a point and refill to your maximum.
   *
   * Everything, in one stroke, alone. The hand itself is the swarm and it goes
   * down a single line; the room goes out around him, and it is `toll` — it
   * hangs, and then it lands.
   */
  guli: {
    figure: 'sweep', swarm: 'card', flight: 'jet', ground: 'dim',
    hue: 'blood', hue2: 'bone', stance: 'lunge', tempo: 'toll', n: 8, turn: -26, spread: 1.2, glyph: true,
  },

  /**
   * 骜肆 — 锁定技. Damage a man in your range during your play phase and there
   * is no limit on what you may use against him for the rest of it.
   *
   * The opposite rhythm to 孤厉 on purpose: not one stroke but rings of them
   * leaving one after another down the same line, fast, and he does not react to
   * it — 锁定技, so the portrait is `still`. Once he tastes it he does not stop.
   */
  aosi: {
    figure: 'rings', swarm: 'thorn', flight: 'out', ground: 'vignette',
    hue: 'ember', hue2: 'blood', stance: 'still', tempo: 'quick', n: 16, turn: 12, spread: 1.1, glyph: true,
  },

  /**
   * 星徐晃 · 治严 — once each per phase: fill your hand to your maximum and then
   * use nothing on anyone this phase; or hand the surplus over your health total
   * to somebody else.
   *
   * 治军严整 — Cao Cao rode through his camp under attack and found it in
   * perfect order: 徐将军可谓有周亚夫之风. And 何用私誉为 — what use is private
   * reputation? A grid closes and locks with the written orders coming in inside
   * it, everything held under 0.6, colourless on purpose.
   */
  mxing__zhiyan: {
    figure: 'lattice', swarm: 'slip', flight: 'recoil', ground: 'frost',
    hue: 'ash', hue2: 'silver', stance: 'brace', tempo: 'slow', n: 9, spread: 0.55, glyph: true,
  },

  /**
   * 星张郃 · 知略 — bleed a point for one more hand card, then either MOVE a card
   * on the field or draw one and swing without limits.
   *
   * 郃识变数，善处营陈，料战势地形，无不如计 — he read variables, laid out camps,
   * and calculated ground, and was never wrong; Liu Bei was more afraid of him
   * than of Xiahou Yuan. The camp grid comes down over the table and a card
   * slides across it from one seat to another — the only figure here that is a
   * map rather than a weapon.
   */
  zhilve: {
    figure: 'lattice', swarm: 'card', flight: 'across', ground: 'shade',
    hue: 'indigo', hue2: 'silver', stance: 'turn', tempo: 'even', n: 8, turn: -8, spread: 1.3, glyph: true,
  },

  /**
   * 星张辽 · 威风 — 锁定技. Your first attack of the phase brands a target with a
   * 惧 marked with that card's name; when they take damage the mark comes off —
   * matching name, one extra point; anything else, you take a card off them.
   *
   * 张辽止啼. The skill is literally fear, wearing his name, sitting on somebody
   * else across the table — so the seal goes OUT to 1.3 and the room dims behind
   * it. Void with his 逍遥津 dawn in it. He never moves; the mark does the work.
   */
  weifeng: {
    figure: 'sigil', swarm: 'rune', flight: 'out', ground: 'dim',
    hue: 'void', hue2: 'dawn', stance: 'still', tempo: 'toll', n: 8, spread: 1.3, glyph: true,
  },

  /* --- 星周不疑 · 稚雀清声 -----------------------------------------------
   * A child prodigy of Nanyang and 曹冲's friend. When Cao Chong died at
   * thirteen, Cao Cao had him assassinated at seventeen; Cao Pi begged for him
   * and was told 此人非汝所能驾驭也 — this is not a man you will be able to
   * control.
   */

  /**
   * 慧夭 — take a point of sourceless damage, then two other players are made to
   * collide: one of them deals a point to another of your choosing.
   *
   * 慧极必伤, and the epitaph of the boy himself. He sits at the centre of a web
   * and the harm travels along a thread ACROSS the table between two people who
   * are not him; it runs to 1.4 because both ends are somebody else's seat, and
   * he wilts as it goes.
   */
  huiyao: {
    figure: 'web', swarm: 'spark', flight: 'across', ground: 'dim',
    hue: 'frost', hue2: 'blood', stance: 'wilt', tempo: 'slow', n: 10, spread: 1.4, glyph: true,
  },

  /**
   * 雀颂 — having been hurt this turn, at anyone's end phase let a player draw
   * three and untap, or recover a point.
   *
   * The clear voice of the title. The one unmixed act of kindness in the pack
   * and it costs him a wound first: an arc opens over the seat and the small
   * bird's feathers go up out of it, in first light.
   */
  quesong: {
    figure: 'halo', swarm: 'feather', flight: 'rise', ground: 'bloom',
    hue: 'peach', hue2: 'dawn', stance: 'lift', tempo: 'even', n: 10, spread: 0.85, glyph: true,
  },

  /* --- 庞德公 · 德懿举世 -------------------------------------------------
   * The recluse of Xiangyang who never once crossed into the city. He named
   * 诸葛亮 the Sleeping Dragon, 庞统 the Fledgling Phoenix and 司马徽 the Water
   * Mirror; Liu Biao came out to the fields to beg him to serve and he said that
   * other men leave their descendants danger and he was leaving his safety. He
   * and his wife went up 鹿门山 for herbs and did not come back.
   */

  /**
   * 评才 — pick one of four treasures and wipe the dust off it: 卧龙 burns
   * somebody, 凤雏 taps three, 水镜 moves an armour, 玄剑 heals and draws.
   *
   * He is polishing the four names he handed out, and the effects get better if
   * the man he named is alive at the table. So: dust, actually `dust`, coming
   * off a core in a dark hut, and one jade under it. The best-sourced skill in
   * the pack.
   */
  pingcai: {
    figure: 'orb', swarm: 'dust', flight: 'flare', ground: 'dim',
    hue: 'bone', hue2: 'jade', stance: 'still', tempo: 'slow', n: 18, spread: 0.8, glyph: true,
  },

  /**
   * 隐世 — 锁定技. You have a draw, a play and a discard phase and nothing else,
   * and delayed tricks cannot name you.
   *
   * NO FIGURE AND NO PARTICLES: the emptiest entry in the file, emptier than
   * 空城, which at least had a gate standing open. This skill removes him from
   * half of the turn structure and from the reach of the deck, and the honest
   * picture of that is mist on an old mountain with his character ghosted behind
   * it and nothing else happening at all.
   */
  yinship: {
    figure: 'none', swarm: 'none', ground: 'smoke', n: 0,
    hue: 'pine', hue2: 'bone', stance: 'still', tempo: 'slow', glyph: true,
  },

  /* --- 十常侍 · 祸乱纲常 -------------------------------------------------
   * The ten eunuchs of Emperor Ling, who said 张常侍是我公，赵常侍是我母. They
   * sold every office in the empire, cut He Jin down inside the palace, and were
   * hunted through it by Yuan Shao's men, who killed anyone without a beard.
   * Played as ten sub-generals on ten cards, which is what both skills count.
   */

  /**
   * 党锢 — start with TEN 常侍 cards and form a faction: reveal one, reveal four
   * more, pick the one that will own you back.
   *
   * The 党锢之祸 — the Partisan Prohibitions of 166 and 169, in which they had
   * the reform faction proscribed and killed. A net drawn shut over ten pieces
   * of purchased office, winding inward in the dark, out past 1.1 because the
   * proscription was thrown over other people.
   */
  danggu: {
    figure: 'net', swarm: 'coin', flight: 'curl', ground: 'dim',
    hue: 'void', hue2: 'gold', stance: 'still', tempo: 'toll', n: 10, spread: 1.15, glyph: true,
  },

  /**
   * 殁亡 — 锁定技. Dying with 常侍 cards left unturned, you sit out a round
   * instead; at the end of it you die anyway.
   *
   * Cornered on the bank of the Yellow River, 张让 bowed to the boy emperor and
   * walked into it. A shroud comes down, the portrait SINKS — the one `sink` in
   * the file — and the bubbles go up past it. It only ever buys one round.
   */
  mowang: {
    figure: 'veil', swarm: 'bubble', flight: 'rise', ground: 'vignette',
    hue: 'ash', hue2: 'void', stance: 'sink', tempo: 'slow', n: 10, spread: 0.55, glyph: true,
  },

  /* --- 孙茹 · 出水青莲 ---------------------------------------------------
   * 出水芙蓉 (钟嵘, 诗品) — the lotus coming up out of the water: unadorned, and
   * the higher compliment of the two. Both skills are the flower and the water
   * it sits on.
   */

  /**
   * 影箭 — at your prepare phase, a 杀 at any distance, out of nothing.
   *
   * The arrow comes out of the flower. A lotus opens on black water and one shot
   * leaves it along a single line to 1.35 — no impact drawn, no swing, because
   * the skill fires before the turn has started and she never stands up.
   */
  yingjian: {
    figure: 'bloom', swarm: 'arrow', flight: 'jet', ground: 'shade',
    hue: 'void', hue2: 'jade', stance: 'still', tempo: 'quick', n: 7, turn: -12, spread: 1.35, glyph: true,
  },

  /**
   * 释衅 — 锁定技. Fire damage to you is prevented outright.
   *
   * The whole skill is one thing failing to happen to another, so it is drawn as
   * exactly that: embers falling INTO a standing column of green river water and
   * going out in it. Everything stays under 0.6 — nothing is thrown off, because
   * nothing survives the arrival.
   */
  shixin: {
    figure: 'column', swarm: 'cinder', flight: 'fall', ground: 'ripple',
    hue: 'jade', hue2: 'ember', stance: 'still', tempo: 'slow', n: 12, spread: 0.6, glyph: true,
  },

  /**
   * 郑玄 · 整经 — sort the classics, put any of what you sorted onto somebody's
   * character card as 经, keep the rest; at their prepare phase they take the
   * 经 and skip their judgement and their draw.
   *
   * The greatest commentator of the Han, who reconciled the New Text and Old
   * Text schools and spent the fourteen years of his own proscription writing.
   * 马融, when he left: 郑生今去，吾道东矣. Bound bamboo standing up in order and
   * carried across to another seat — and the cost is that you spend your morning
   * reading instead of playing, which is the joke and also the truth.
   */
  zhengjing: {
    figure: 'pillars', swarm: 'slip', flight: 'across', ground: 'smoke',
    hue: 'ink', hue2: 'celadon', stance: 'bow', tempo: 'slow', n: 14, spread: 1.25, glyph: true,
  },

  /* --- 朱绩 · 克绍箕裘 ---------------------------------------------------
   * 良冶之子必学为裘，良弓之子必学为箕 (礼记) — the smelter's son learns the fur
   * coat, the bowyer's son the winnowing basket. 朱然's son, holding Jiangling,
   * and famous for the private truce he and the Wei commander 胡质 kept across
   * the border because neither would take the other at a disadvantage.
   */

  /**
   * 竭逐 — dump your hand down to the nearest count nobody else holds, then a
   * distance-free 杀 at up to that many people; hit them all and refill to the
   * nearest count above.
   *
   * 竭 is to run dry. The fan empties itself into a volley that reaches every
   * seat at 1.4 and then draws back open — the one skill in the file where the
   * emptying and the refilling are the same gesture.
   */
  jiezhu: {
    figure: 'fan', swarm: 'arrow', flight: 'out', ground: 'dim',
    hue: 'verdigris', hue2: 'cinnabar', stance: 'lunge', tempo: 'quick', n: 16, spread: 1.4, glyph: true,
  },

  /**
   * 还施 — 使命技. Your first 杀 each turn hits for one more, and you may not
   * drink 【酒】 except when dying. Completed when damage dealt or taken equals
   * your remaining health exactly.
   *
   * 以彼之道，还施彼身. The mission condition is a blow weighed against a body and
   * found equal, so the blow leaves and comes straight back on `recoil`, once,
   * counted. His father's colour, since the whole title is about inheriting it.
   */
  huanshiz: {
    figure: 'ring', swarm: 'shard', flight: 'recoil', ground: 'wash',
    hue: 'cinnabar', hue2: 'ink', stance: 'brace', tempo: 'toll', n: 12, glyph: true,
  },
};
