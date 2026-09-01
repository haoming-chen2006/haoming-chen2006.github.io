/**
 * English for the 249-character mobile pack (`packages/mobile`).
 *
 * Upstream ships `packages/mobile/i18n/en_US.lua`, but it is a stub rather than
 * a translation: it registers 452 keys of which only 22 carry English, and the
 * rest are the Chinese filed verbatim under `en_US`. Importing it wholesale
 * would make the English build *look* translated while showing Chinese, which
 * is worse than showing Chinese honestly — so the coverage test forbids a CJK
 * ideograph anywhere in the English table, and this file is the real thing.
 *
 * PROVENANCE. Every string here was written for this project except the 22
 * keys upstream's stub did render in English, which are inherited verbatim, and
 * the derived trigger badges (`#<skill>_<n>_<trig>`), whose Chinese value is
 * literally the skill's own name and which are therefore generated from the
 * skill-name entry rather than translated a second time.
 *
 * TERMINOLOGY follows `./upstream.ts` and `./authored.ts` exactly — Slash,
 * Dodge, Peach, judgement area, Action phase, ATK range, "(forced)" for 锁定技,
 * Lord / Loyalist / Rebel / Renegade. Consistency with the 1,368 keys already
 * translated matters more than a nicer word here.
 *
 * NAME ROMANISATION is Hanyu Pinyin, surname first, and the variant prefixes
 * follow upstream's own `mxing__ganning` -> "Star Gan Ning": 神 is `God`,
 * 界 is `Ex`, 势 is `Momentum`, 手杀星 is `Star`.
 *
 * Log templates keep the engine's placeholders exactly — `%from`, `%to`,
 * `%src`, `%dest`, `%arg`, `%argN`, `%card` — and keep the same *number* of
 * them; `processPrompt` substitutes positionally, so dropping one silently
 * breaks a log line. HTML (`<br>`, `<b>`, `<font>`) is preserved tag for tag.
 *
 * 6663 keys. Anything still untranslated is listed in
 * `../provenance.json` under `mobileUntranslated`, and falls back to the
 * engine's Chinese rather than to a guess.
 */
import type { TranslationTable } from '../types';

export const MOBILE_EN_US: TranslationTable = {

  /* ------------------------------------------------------------------------
   * Character names, subtitles and package labels. 1293 keys.
   * ---------------------------------------------------------------------- */
  AskForDiscussion: 'Discussion',
  'Clear All': 'Clear All',
  'Please arrange WuLing cards': 'Drag to set the order of the Five Animal Frolics (left to right)',
  RenPile_href: 'The Benevolence pile is a public area on the field used to hold cards.<br>It holds '
    + 'at most 6 cards; when it holds more than 6, the card put there earliest goes to the '
    + 'discard pile.',
  _xingbu_1: '<font color=\'grey\'>Mars Guards the Heart Star</font>',
  _xingbu_2: 'A White Rainbow Pierces the Sun',
  _xingbu_3: '<font color=\'#CC3131\'>Five Planets in Alignment</font>',
  anda: 'Confidant',
  anda_active: 'Confidant',
  anxianc: 'Hidden Bowstring',
  aocai: 'Proud Talent',
  aosi: 'Unbridled',
  armor__xianjian: 'Breach',
  askforCardsChosenFromAreas: 'Choose Cards',
  aux_dawu: 'Heavy Fog',
  aux_kuangfeng: 'Gale',
  bag_of_tricks: '#"<b>Bag of Tricks</b>": namely Dismantlement, Nullification and Ex Nihilo',
  baoxi: 'Violent Raid',
  beiming: 'Comet Light',
  beizhu: 'Prepared Punishment',
  bifeng: 'Evade the Edge',
  bihan: 'Shield Ward',
  bihuoy: 'Avert Disaster',
  biluan: 'Flee the Turmoil',
  bingfa: 'Uphold the Law',
  binghuo: 'Scourge of War',
  binglun: 'Treatise',
  binglun_recover: 'Recover 1 HP at the end of your next turn',
  bingqing: 'Uphold Purity',
  biwei: 'Scorn of Rank',
  bixian: 'Hold the Pass',
  bojian: 'Broad Insight',
  bomb: 'Bomb',
  buqi: 'Never Abandon',
  buxu: 'Restoration',
  bypass_distances: 'Ignore distance',
  caiqiu: 'Tailored Fur',
  caizhenji: 'Cai Zhenji',
  cangjia: 'Hidden Blade',
  canshi: 'Cruel Blight',
  caochun: 'Cao Chun',
  caowei: 'Subtle Control',
  changshi: 'Palace Attendant',
  changshi__bilan: 'Bi Lan',
  changshi__chihe: 'Browbeat',
  changshi__chiyan: 'Owl Cry',
  changshi__duangui: 'Duan Gui',
  changshi__gaowang: 'Gao Wang',
  changshi__guosheng: 'Guo Sheng',
  changshi__hankui: 'Han Kui',
  changshi__kuiji: 'Spy the Chance',
  changshi__lisong: 'Li Song',
  changshi__miaoyu: 'Clever Words',
  changshi__niqu: 'Usurp',
  changshi__picai: 'Gather Materials',
  changshi__sunzhang: 'Sun Zhang',
  changshi__taoluan: 'Flood of Chaos',
  changshi__xiaolu: 'Night Bribe',
  changshi__xiaolu_discard: 'Discard two hand cards',
  changshi__xiaolu_give: 'Hand over two hand cards',
  changshi__xiayun: 'Xia Yun',
  changshi__yaozhuo: 'Slander',
  changshi__zhangrang: 'Zhang Rang',
  changshi__zhaozhong: 'Zhao Zhong',
  changshi__zimou: 'Own Counsel',
  chanyuan: 'Entangled Grudge',
  chengjiw: 'Cheng Ji',
  chengxiong: 'Punish the Wicked',
  chengye: 'Inheritance',
  chengye_classic: 'Classic',
  chengye_href: 'Odes - damage-dealing trick cards;<br>Documents - basic cards;<br>Rites - '
    + 'Nullification;<br>Changes - Ex Nihilo;<br>Music - Indulgence;<br>Spring and Autumn - '
    + 'equip cards',
  chengzhang: 'Verse Complete',
  chengzhao: 'Bear the Edict',
  chenshe: 'Plea for Pardon',
  chenshe_none: 'None',
  chenzhen: 'Chen Zhen',
  chiyuanc: 'Gallop the Plains',
  chiyun: 'Blazing Current',
  chiyun_display: 'Show cards and take fire damage from %src',
  chiyun_draw: '%src draws two cards and you become chained',
  chizhang: 'Rampant Display',
  chongcha: 'Double Difference',
  chongjian: 'Breach',
  chonglei: 'Rampart Charge',
  chongsi: 'Storm the Court',
  chongsi_damage: 'Deal 1 damage to yourself or to the player equipped with Six Dragon Chariot',
  chongsi_discard: 'Discard two cards',
  choose_cards_mutlipat_skill: 'Choose Cards',
  chouhai: 'Sea of Hatred',
  choulue: 'Stratagem',
  choumang: 'Vengeful Edge',
  choumang_beishui: 'Desperate Stand: discard both weapons',
  choumang_damage: 'This Slash\'s damage +1',
  choumang_prey: 'After this Slash is countered, obtain a card from a player',
  chuhai: 'Slay the Scourge',
  chuifeng: 'Spearhead',
  'click to exchange': 'Click to exchange',
  countermeausre_failed: 'Countermeasure failed',
  countermeausre_success: 'Countermeasure succeeded',
  cuijin: 'Urge the Advance',
  cuijun__gongli: 'Mutual Honing',
  cuizhen: 'Shatter Formation',
  cy_classic_basic: 'Documents',
  cy_classic_damage: 'Poetry',
  cy_classic_equip: 'Spring and Autumn',
  cy_classic_ex_nihilo: 'Changes',
  cy_classic_indulgence: 'Music',
  cy_classic_nullification: 'Rites',
  daigong: 'Blunted Assault',
  daizui: 'Bear the Blame',
  daizui_shi: 'Absolution',
  daming: 'Mandate',
  'daming_other&': 'Mandate',
  danggu: 'Partisan Ban',
  dangshi: 'Sweeping Force',
  dangshi_damage: 'Take 1 damage',
  dangshi_discard: 'Discard %arg cards',
  dangshi_use: 'Use a %arg on %src',
  daoji: 'Steal the Halberd',
  daozhuan: 'Turn of the Way',
  debao: 'Repay with Virtue',
  defensive_horse__xianjian: 'Breach',
  defensive_siege_engine: 'Great Siege Engine - Defense',
  delayedPindian: '<b>Delayed point fight:</b><br>Before the point-fight cards are revealed, the result '
    + 'is not announced at once: the point-fight cards are placed face down and removed '
    + 'from the game. After this turn ends, if the condition for revealing the result is '
    + 'still unmet, those point-fight cards are put into the discard pile, and no further '
    + 'point-fight procedure or timing is carried out.',
  dengli: 'Matched Strength',
  dieyin: 'Layered Notes',
  difei: 'Deflect Slander',
  dinghan: 'Secure the Han',
  dinghan_add: 'Add a Secure the Han card name',
  dinghan_remove: 'Remove a Secure the Han card name',
  dingyi: 'Ordained Rites',
  dingyi1: 'Extra Draw',
  dingyi2: 'Hand Limit',
  dingyi3: 'ATK Range',
  dingyi4: 'Extra Recovery',
  dingyuan: 'Ding Yuan',
  dingzhen: 'Frontier Guard',
  dingzhou: 'Secure the Province',
  duanbi: 'Forge Currency',
  duanjin: 'Sever the Ford',
  duansuo: 'Break the Chains',
  duanyang: 'Severed Harness',
  duanyang_draw: 'Draw %arg cards',
  duanyang_obtain: 'Obtain the basic cards among them',
  dujin: 'Lone Advance',
  dulie: 'Steadfast Valor',
  duohui: 'Undertow',
  duoji: 'Seize Ji Province',
  duwu: 'Warmonger',
  duzuo: 'Co-Command',
  ex__leiji: 'Lightning Strike',
  ex_crossbow: 'Yuanrong Precision Crossbow',
  ex_eight_diagram: 'Primordial Eight Diagram',
  ex_nioh_shield: 'Nioh Vajra Shield',
  ex_silver_lion: 'Moonlit Lion Helm',
  ex_vine: 'Tung Oil Vine Armor',
  fangqiu: 'Full Vigor',
  fangzong: 'Fragrant Trail',
  feijing: 'Flying Path',
  feili: 'Slander and Discord',
  feili_discard: 'Discard two cards',
  feili_removemark: 'Remove the "Libel" mark of %dest',
  fengjie: 'Uphold Integrity',
  fentao: 'Burning Tide',
  fenyin: 'Rousing Voice',
  friend__manjuan: 'Sweeping Scrolls',
  friend__yangming: 'Cultivate Fame',
  fubi: 'Right Hand',
  fuhai: 'Overturn the Sea',
  fujiy: 'Talisman Aid',
  fuman: 'Pacify the Tribes',
  fuqian: 'Fu Qian',
  futu: 'Pagoda',
  futu_ye: 'Karma',
  fuyu: 'Cornered Stand',
  gaigong: 'Public Spirit',
  ganggeng: 'Blunt Integrity',
  ganjue: 'Bold Resolve',
  gaoyuan: 'Call for Aid',
  gebo: 'Arms and Silk',
  godguojia: 'God Guo Jia',
  godhuatuo: 'God Hua Tuo',
  godlusu: 'God Lu Su',
  godsunce: 'God Sun Ce',
  godtaishici: 'God Taishi Ci',
  godxunyu: 'God Xun Yu',
  gonghuan: 'Shared Peril',
  gongmou: 'Joint Scheme',
  gongsunkang: 'Gongsun Kang',
  guansha: 'Poured Sand',
  guansuo: 'Guan Suo',
  guanzong: 'Pampering',
  guiming: 'Submission of Fate',
  guimou: 'Cunning Scheme',
  guimou_discard: 'Cards discarded',
  guimou_gain: 'Cards obtained',
  guimou_option_discard: 'Discard this card',
  guimou_option_give: 'Give this card',
  guimou_use: 'Cards used',
  guli: 'Lone Fury',
  gushe: 'Wagging Tongue',
  guying: 'Fortify Camp',
  guying_get: 'Let %src obtain %arg',
  guying_give: 'Give %src a random card',
  hannan: 'Ward Off Peril',
  heji: 'Joint Strike',
  hengwei: 'Overbearing Might',
  hongyi: 'Grand Decorum',
  hongyic: 'Great Resolve',
  hongyic_discard: 'Discard all Resolve markers',
  hongyic_draw: 'Draw %arg cards',
  houfeng: 'Rich Stipend',
  huaibi: 'Cherished Jade',
  huaizi: 'With Child',
  huanshiz: 'Repay in Kind',
  huantu: 'Patient Design',
  huantu1: '%dest recovers 1 HP and draws two cards',
  huantu2: 'You draw three cards, then give %dest two hand cards',
  hucheer: 'Hu Che\'er',
  huishig: 'Fading Radiance',
  huitian: 'Turn the Heavens',
  huiyao: 'Doomed Brilliance',
  hujinding: 'Hu Jinding',
  jiangwan: 'Jiang Wan',
  jianlv: 'Broad Counsel',
  jianlv_damage: 'Deal 1 damage to another player',
  jianlv_refresh: 'Treat this skill as not having been used',
  jianyi: 'Plain Dress',
  jianyu: 'Remonstrance',
  jianzhan: 'War Counsel',
  jianzhan_draw: '%src draws a card',
  jianzhan_slash: 'Counts as using a Slash on %dest',
  jibing: 'Muster Troops',
  jichou: 'Swift Scheme',
  'jichou_give&': '<font color=\'grey\'>Swift Scheme [give cards]</font>',
  jici: 'Provoking Words',
  jiebian: 'Kalpa Debate',
  jiebian_damage: 'Deal 1 damage to %dest',
  jiebian_recover: 'Make %dest recover HP and draw a card, then you obtain their cards',
  jiebing: 'Borrow Troops',
  jiedang: 'Cabal',
  jiejianw: 'Loyal Remonstrance',
  jiejie: 'Admonition',
  'jiejie&': 'Admonition',
  jiezhu: 'Relentless Pursuit',
  jiguan: 'Crown of Steeds',
  jilim: 'Mounting Malice',
  jilun: 'Shrewd Counsel',
  jilun_draw: 'Draw %arg cards',
  jilun_use: 'Count as using a basic card, or a regular trick card recorded by Swift Scheme whose '
    + 'number of targets is not more than %arg',
  jimi: 'Honey Gathering',
  jimie: 'Annihilation',
  jinfan: 'Brocade Sail',
  jinfan_active: 'Brocade Sail',
  jinfan_ling: 'Bell',
  jingtu: 'Pure Land',
  jingtu_black: 'Obtain black Karma',
  jingtu_red: 'Obtain red Karma',
  jingxie: 'Precision Craft',
  jingzhong: 'Reverence',
  jinzu: 'Mighty Arrowhead',
  jiren: 'Rousing Blade',
  jiren_debuff_desc: '',
  jishi: 'Heal the World',
  jiwei: 'Aid in Peril',
  jixiy: 'Covet the Seal',
  jixiy1: 'Gain the skill False Majesty',
  jixiy2: 'Draw two cards and gain the Lord\'s lord skill',
  jiyul: 'Urgent Defense',
  juejin: 'Resolute Advance',
  jueyong: 'Peerless Valor',
  jueyong_desperation: 'Valor',
  juezhi: 'Order of Rank',
  juezhig: 'Decisive Halt',
  juezhig_duel: 'Use Duel',
  juezhig_recover: 'Recover HP',
  juguz: 'Lone Stand',
  juliao: 'Hold Liaodong',
  jungong: 'Severe Assault',
  jungong_discard: 'Discard %arg card(s)',
  jungong_loseHp: 'Lose %arg HP',
  junkui: 'Peerless Steed',
  jutu: 'Hold the Land',
  juxiangz: 'Refuse Surrender',
  kaiji: 'Found and Sustain',
  kechang: 'Prosperity',
  kouluet: 'Plunder',
  kuangli: 'Savage Frenzy',
  kuangwu: 'Boastful Valor',
  kubai: 'Withered Pallor',
  kuili: 'Rout',
  kujian: 'Bitter Counsel',
  laimin: 'Lai Min',
  laishou: 'Longevity',
  lianxi: 'Chain Raid',
  lianzhant: 'Chain Slaughter',
  liaoyi: 'Cure Plague',
  lidian__heyu: 'Joint Defense',
  liezhi: 'Stern Integrity',
  liezhiz: 'Fierce Resolve',
  lifeng: 'Li Feng',
  lifeng_liang: 'Grain',
  lingcao: 'Ling Cao',
  lingce: 'Inspired Scheme',
  lingfa: 'Rule of Law',
  lingren_basic: 'Has a basic card',
  lingren_equip: 'Has an equip card',
  lingren_trick: 'Has a trick card',
  liubing: 'Stray Troops',
  liuzan: 'Liu Zan',
  liuzhang: 'Liu Zhang',
  liuzhang_sheng: 'Life',
  lixia: 'Deference',
  lixia_draw: 'Make %src draw a card',
  liyong: 'Fierce Valor',
  lizhaojiaobo: 'Li Zhao and Jiao Bo',
  longyuan: 'Dragon Abyss',
  luanchou: 'Phoenix Pair',
  luanqun: 'Rabble Rouser',
  luezhen: 'Sweep the Ranks',
  lulian: 'Serial Slaughter',
  lunxiong: 'Measure of Heroes',
  luotong: 'Luo Tong',
  m_ex: 'Mobile Ex',
  m_ex__anguo: 'Steady the State',
  m_ex__anguo_losehp: 'Lose HP down to 1',
  m_ex__anguo_losemaxhp: 'Reduce max HP to 1',
  m_ex__anjian: 'Hidden Arrow',
  m_ex__anjian_damage: 'Damage +1',
  m_ex__anjian_disresponsive: 'Cannot respond',
  m_ex__anxu: 'Comfort',
  m_ex__beige: 'Sad Song',
  m_ex__benxi: 'Swift Raid',
  m_ex__bingyi: 'Hold to One',
  m_ex__bulianshi: 'Ex Bu Lianshi',
  m_ex__caifuren: 'Ex Lady Cai',
  m_ex__caiwenji: 'Ex Cai Wenji',
  m_ex__caopi: 'Ex Cao Pi',
  m_ex__caozhang: 'Ex Cao Zhang',
  m_ex__caozhen: 'Ex Cao Zhen',
  m_ex__caozhi: 'Ex Cao Zhi',
  m_ex__chengpu: 'Ex Cheng Pu',
  m_ex__chenqun: 'Ex Chen Qun',
  m_ex__dangxian: 'Vanguard',
  m_ex__danshou: 'Valiant Guard',
  m_ex__dengai: 'Ex Deng Ai',
  m_ex__dianwei: 'Ex Dian Wei',
  m_ex__dingpin: 'Set the Rank',
  m_ex__duanliang: 'Cut Supply',
  m_ex__duodao: 'Seize the Blade',
  m_ex__fangquan: 'Delegation',
  m_ex__fangzhu: 'Exile',
  m_ex__fenji: 'Rouse',
  m_ex__fuhuanghou: 'Ex Empress Fu',
  m_ex__fuli: 'Old Steed',
  m_ex__ganlu: 'Sweet Dew',
  m_ex__gaoshun: 'Ex Gao Shun',
  m_ex__gongqi: 'Horse Archery',
  m_ex__gongsunzan: 'Ex Gongsun Zan',
  m_ex__guhuo: 'Bewitch',
  m_ex__guyong: 'Ex Gu Yong',
  m_ex__handang: 'Ex Han Dang',
  m_ex__huatuo: 'Ex Hua Tuo',
  m_ex__hunzi: 'Soul Stance',
  m_ex__huoji: 'Fire Stratagem',
  m_ex__jianchu: 'Quiver Draw',
  m_ex__jiangchi: 'Charge',
  m_ex__jiangchi_discard: 'Discard 1 card: Slash ignores distance and +1 use',
  m_ex__jiangchi_draw: 'Draw 1 card: cannot use Slash',
  m_ex__jiangwei: 'Ex Jiang Wei',
  m_ex__jianying: 'Gradual Design',
  m_ex__jianyong: 'Ex Jian Yong',
  m_ex__jiaojin: 'Haughtiness',
  m_ex__jieming: 'Integrity',
  m_ex__jieyue: 'Token of Command',
  m_ex__jieyue_active: 'Token of Command',
  m_ex__jieyue_select: 'Token of Command',
  m_ex__jiezi: 'Intercept Supplies',
  m_ex__jinjiu: 'Prohibition',
  m_ex__jiushi: 'Wine Poetry',
  m_ex__juece: 'Decisive Stratagem',
  m_ex__junxing: 'Harsh Punishment',
  m_ex__jvshou: 'Ex Ju Shou',
  m_ex__kanpo: 'See Through',
  m_ex__kongsheng: 'Harp Song',
  m_ex__liangyin: 'Auspicious Match',
  m_ex__lianhuan: 'Chain',
  m_ex__liaohua: 'Ex Liao Hua',
  m_ex__lihuo: 'Fever Fire',
  m_ex__lingtong: 'Ex Ling Tong',
  m_ex__liru: 'Ex Li Ru',
  m_ex__liubiao: 'Ex Liu Biao',
  m_ex__liushan: 'Ex Liu Shan',
  m_ex__luanji: 'Wild Volley',
  m_ex__manchong: 'Ex Man Chong',
  m_ex__mieji: 'Scheme Breaker',
  m_ex__mieji_dis2card: 'Discard two non-trick cards in order',
  m_ex__mieji_handovertrick: 'Hand over a trick card',
  m_ex__niepan: 'Nirvana',
  m_ex__paiyi: 'Rejection',
  m_ex__pangde: 'Ex Pang De',
  m_ex__pangtong: 'Ex Pang Tong',
  m_ex__panzhangmazhong: 'Ex Pan Zhang & Ma Zhong',
  m_ex__pingkou: 'Quell Bandits',
  m_ex__pojun: 'Army Breaker',
  m_ex__qiangxi: 'Strong Assault',
  m_ex__qiaoshui: 'Silver Tongue',
  m_ex__qieting: 'Eavesdrop',
  m_ex__qieting_move: 'Move a card in the equip area of %dest',
  m_ex__qieting_pry: 'View two hand cards of %dest and obtain one of them',
  m_ex__qimou: 'Ingenious Scheme',
  m_ex__qingjian: 'Frugality',
  m_ex__qingnang: 'Green Salve',
  m_ex__qiuyuan: 'Call for Aid',
  m_ex__quancong: 'Ex Quan Cong',
  m_ex__quanji: 'Power Scheme',
  m_ex__shenxing: 'Prudence',
  m_ex__shuangxiong: 'Twin Heroes',
  m_ex__sidi: 'Mark the Foe',
  m_ex__sidi_negate: 'Cancel this card',
  m_ex__sidi_negate_and_damage: 'Cancel this card and deal damage to its user',
  m_ex__sunce: 'Ex Sun Ce',
  m_ex__sunjian: 'Ex Sun Jian',
  m_ex__sunluban: 'Ex Sun Luban',
  m_ex__sunxiu: 'Ex Sun Xiu',
  m_ex__tianxiang: 'Heavenly Fragrance',
  m_ex__tianxiang_damage: 'Make them take 1 damage and draw cards equal to their lost HP',
  m_ex__tianxiang_loseHp: 'Make them lose 1 HP and obtain the card you discarded',
  m_ex__tiaoxin: 'Provoke',
  m_ex__tuntian: 'Garrison Farming',
  m_ex__weiyan: 'Ex Wei Yan',
  m_ex__wolong: 'Ex Sleeping Dragon Zhuge Liang',
  m_ex__wuguotai: 'Ex Wu Guotai',
  m_ex__wurong: 'Pacify the Tribes',
  m_ex__wuyi: 'Ex Wu Yi',
  m_ex__xiahoudun: 'Ex Xiahou Dun',
  m_ex__xianzhen: 'Breach Formation',
  m_ex__xiaoqiao: 'Ex Xiao Qiao',
  m_ex__xingshang: 'Mourning',
  m_ex__xingshang_prey: 'Obtain all of %dest\'s cards',
  m_ex__xingxue: 'Promote Learning',
  m_ex__xingxue_give: 'Give a card to a target of Promote Learning',
  m_ex__xingxue_puttodrawpile: 'Place a card on top of the draw pile',
  m_ex__xuanfeng: 'Whirlwind',
  m_ex__xuanfeng_active: 'Whirlwind',
  m_ex__xuanfeng_discard: 'Discard two cards in total from up to two other players',
  m_ex__xuanfeng_movecard: 'Move an equip card on the field',
  m_ex__xuhuang: 'Ex Xu Huang',
  m_ex__xunyu: 'Ex Xun Yu',
  m_ex__xusheng: 'Ex Xu Sheng',
  m_ex__yanliangwenchou: 'Ex Yan Liang and Wen Chou',
  m_ex__yanzhu: 'Banquet Execution',
  m_ex__yanzhu_choice1: 'Make them obtain a card from your area',
  m_ex__yanzhu_choice2: 'Make them obtain all cards in your equip area and lose Banquet Execution',
  m_ex__yaoming: 'Chasing Fame',
  m_ex__yaoming_draw: 'Make a player whose hand count is no greater than yours draw a card',
  m_ex__yaoming_draw_mark: 'Draw',
  m_ex__yaoming_throw: 'Discard a card from another player whose hand count is no less than yours',
  m_ex__yaoming_throw_mark: 'Discard',
  m_ex__yicong: 'Loyal Followers',
  m_ex__yongsi: 'Wanton Excess',
  m_ex__yuanshao: 'Ex Yuan Shao',
  m_ex__yuanshu: 'Ex Yuan Shu',
  m_ex__yufan: 'Ex Yu Fan',
  m_ex__yuji: 'Ex Yu Ji',
  m_ex__yujin: 'Ex Yu Jin',
  m_ex__zenhui: 'Slander',
  m_ex__zenhui_becometarget: 'Make them also become a target of this card',
  m_ex__zenhui_becomeuser: 'Obtain a card from them and make them the user',
  m_ex__zhangfei: 'Ex Zhang Fei',
  m_ex__zhangjiao: 'Ex Zhang Jiao',
  m_ex__zhangyi: 'Ex Zhang Yi',
  m_ex__zhangzhaozhanghong: 'Ex Zhang Zhao and Zhang Hong',
  m_ex__zhiji: 'Inherited Ambition',
  m_ex__zhijian: 'Equip Up',
  m_ex__zhonghui: 'Ex Zhong Hui',
  m_ex__zhonghui_power: 'Power',
  m_ex__zhongyong: 'Loyal Valour',
  m_ex__zhongyong_other: 'Hand over the Dodge',
  m_ex__zhongyong_self: 'Obtain the Dodge',
  m_ex__zhoucang: 'Ex Zhou Cang',
  m_ex__zhoufei: 'Ex Zhou Fei',
  m_ex__zhoutai: 'Ex Zhou Tai',
  m_ex__zhuhuan: 'Ex Zhu Huan',
  m_ex__zhuikong: 'Trembling Dread',
  m_ex__zhuran: 'Ex Zhu Ran',
  m_ex__zhuzhi: 'Ex Zhu Zhi',
  m_ex__zili: 'Independence',
  m_ex__zongshi: 'Imperial Clan',
  m_ex__zongshij: 'Free Spirit',
  m_ex__zongxuan: 'Mystic Release',
  m_friend: 'Friend',
  m_friend__cuijun: 'Friend Cui Jun',
  m_friend__pangtong: 'Friend Pang Tong',
  m_friend__shitao: 'Friend Shi Tao',
  m_friend__xushu: 'Friend Xu Shu',
  m_friend__zhugeliang: 'Friend Zhuge Liang',
  m_js: 'Mobile Rivers and Mountains',
  m_js__fayi: 'Purge Dissent',
  m_js__jishan: 'Accumulated Virtue',
  m_js__juelie: 'Fierce Resolve',
  m_js__liubei: 'Rise Liu Bei',
  m_js__shelun: 'Amnesty Debate',
  m_js__sunjian: 'Rise Sun Jian',
  m_js__wangyun: 'Rise Wang Yun',
  m_liuyi: 'Six Arts',
  m_liuyi__caoxing: 'Archer Cao Xing',
  m_liuyi__caozhi: 'Imperial Cao Zhi',
  m_liuyi__liuhui: 'Math Liu Hui',
  m_liuyi__liulongcanjia: 'Six-Dragon Chariot',
  m_liuyi__luyu: 'Rites Lu Yu',
  m_liuyi__zhangzhi: 'Calligraphy Zhang Zhi',
  m_liuyi__zhouyu: 'Music Zhou Yu',
  m_liuyi_laws_cards: 'The player with the most cards in their areas gives one card to each other player',
  m_liuyi_laws_damage: 'The player who dealt the most damage this round takes 2 damage with no source',
  m_liuyi_laws_gain: 'The hand card limit of the player who obtained the most cards this round -2',
  m_liuyi_laws_hp: 'The player whose HP changed the most times this round loses 1 max HP',
  m_shi: 'Momentum',
  m_shi2: 'Momentum',
  m_shi2__weiyan: 'Momentum Wei Yan',
  m_shi2__zhouyu: 'Momentum Zhou Yu',
  m_shi3: 'Momentum',
  m_shi3__weiyan: 'Momentum Wei Yan',
  m_shi__caozhen: 'Momentum Cao Zhen',
  m_shi__ceduan: 'Decisive Strategy',
  m_shi__chendao: 'Momentum Chen Dao',
  m_shi__chengpu: 'Momentum Cheng Pu',
  m_shi__chenjiao: 'Momentum Chen Jiao',
  m_shi__chenzhis: 'Momentum Chen Zhi',
  m_shi__dengai: 'Momentum Deng Ai',
  m_shi__dimeng: 'Alliance',
  m_shi__dimeng_discard: 'Discard %arg cards (all of them if you have fewer)',
  m_shi__dimeng_draw: '%dest draws %arg cards',
  m_shi__dongzhao: 'Momentum Dong Zhao',
  m_shi__guoyuan: 'Momentum Guo Yuan',
  m_shi__haoshi: 'Generosity',
  'm_shi__haoshi&': 'Generosity',
  m_shi__huangzu: 'Momentum Huang Zu',
  m_shi__huanjie: 'Momentum Huan Jie',
  m_shi__jixi: 'Swift Raid',
  m_shi__kuanggu: 'Frenzied Bones',
  m_shi__lusu: 'Momentum Lu Su',
  m_shi__luyusheng: 'Momentum Lu Yusheng',
  m_shi__qingyan: 'Stern Integrity',
  m_shi__sijian: 'Dying Remonstrance',
  m_shi__sijian_beishui: 'Desperate Stand: lose %arg HP',
  m_shi__sijian_discard: 'Make a player discard a card after they use their next card',
  m_shi__sijian_draw: '%dest draws two cards',
  m_shi__sunchen: 'Momentum Sun Chen',
  m_shi__sunjun: 'Momentum Sun Jun',
  m_shi__taishici: 'Momentum Taishi Ci',
  m_shi__tianfeng: 'Momentum Tian Feng',
  m_shi__tuntian: 'Garrison Farming',
  m_shi__wangchang: 'Momentum Wang Chang',
  m_shi__weiyan: 'Momentum Wei Yan',
  m_shi__xiahoushang: 'Momentum Xiahou Shang',
  m_shi__xianshuai: 'Vanguard',
  m_shi__xinxianying: 'Momentum Xin Xianying',
  m_shi__yuji: 'Momentum Yu Ji',
  m_shi__zanghong: 'Momentum Zang Hong',
  m_shi__zaoxian: 'Perilous Path',
  m_shi__zhangyan: 'Momentum Zhang Yan',
  m_shi__zhonghui: 'Momentum Zhong Hui',
  m_shi__zhouyu: 'Momentum Zhou Yu',
  m_shzl_ex: 'Mobile: Breakthrough',
  m_sp: 'Mobile SP',
  m_sp__caocao: 'Cao Cao',
  m_sp__guanqiujian: 'Guanqiu Jian',
  m_sp__simazhao: 'Sima Zhao',
  m_sp__yujin: 'Yu Jin',
  m_sp__zhenji: 'Zhen Ji',
  m_sp_lord: 'Mobile',
  m_sp_lord__guanyu: 'Guan Yu Rabbit',
  m_sp_lord__yuanshu: 'Honey-Gathering Yuan Shu',
  m_sp_lord__zhaoyun: 'Rabbit Zhao Yun',
  m_sp_lord__zhugeliang: 'Zhuge Tu',
  m_thoroughbred: 'Steed',
  m_thoroughbred__lidian: 'Thoroughbred Li Dian',
  m_thoroughbred__yuejin: 'Thoroughbred Yue Jin',
  m_thoroughbred__zhangliao: 'Thoroughbred Zhang Liao',
  m_yj_ex: 'Mobile: Breakthrough Fame',
  m_yuan: 'Bond',
  m_yuan__chenlan: 'Fate Chen Lan',
  m_yuan__gaoshun: 'Fate Gao Shun',
  m_yuan__guanyu: 'Fate Guan Yu',
  m_yuan__lvbu: 'Fate Lü Bu',
  m_yuan__meicheng: 'Fate Mei Cheng',
  m_yuan__sunquan: 'Fate Sun Quan',
  m_yuan__tadun: 'Fate Tadun',
  m_yuan__tanshihuai: 'Fate Tanshihuai',
  m_yuan__wusheng: 'Warrior Saint',
  m_yuan__yijue: 'Severed Bond',
  m_yuan__yijue_discard: 'They cannot use or play cards this turn, you discard your hand cards of those suits',
  m_yuan__yijue_prevent: 'Prevent this damage, this round cancel targeting between the two of you',
  m_yuan__zhangliao: 'Young Zhang Liao',
  majun: 'Ma Jun',
  maodiey: 'Escalation',
  maojie: 'Mao Jie',
  mayuanyi: 'Ma Yuanyi',
  mayuanyi_bing: 'Troop',
  mazhong: 'Ma Zhong',
  miaolue: 'Brilliant Strategy',
  miaolue_zhinang: 'Obtain a Wisdom Bag of your choice',
  mibei: 'Secret Preparation',
  miewu: 'Conquer Wu',
  miheng: 'Mi Heng',
  mingcha: 'Discernment',
  mkpanxiang1: '-',
  mkpanxiang2: '+',
  mobile: 'Mobile',
  mobile2: 'Mobile',
  mobile2__caomao: 'Cao Mao',
  mobile2__simazhao: 'Sima Zhao',
  mobile__baiyin: 'Seal of Office',
  mobile__baosanniang: 'Bao Sanniang',
  mobile__baoxin: 'Bao Xin',
  mobile__beini: 'Treason',
  mobile__beini_other: 'They draw two cards, you choose an option',
  mobile__beini_own: 'You draw two cards, they choose an option',
  mobile__beini_prey: 'Obtain a card on the field of %dest',
  mobile__beini_slash: 'It counts as using a Slash on %dest',
  mobile__bianfuren: 'Lady Bian',
  mobile__biaozhao: 'Memorial Summons',
  mobile__bijing: 'Seal the Borders',
  mobile__canyun: 'Lingering Echo',
  mobile__caomao: 'Cao Mao',
  mobile__caosong: 'Cao Song',
  mobile__caoying: 'Cao Ying',
  mobile__catapult: 'Thunderbolt Catapult',
  mobile__cheliji: 'Cheliji',
  mobile__chendeng: 'Chen Deng',
  mobile__chengui: 'Chen Gui',
  mobile__chenjie: 'Subject\'s Honor',
  mobile__chijie: 'Imperial Staff',
  mobile__choujue: 'Blood Feud',
  mobile__cuilingyi: 'Cui Fu',
  mobile__cuiyan: 'Cui Yan',
  mobile__dangyi: 'Purge Dissent',
  mobile__daoshu: 'Steal the Letter',
  mobile__daoshu_choose: 'Steal the Letter',
  mobile__dengzhi: 'Deng Zhi',
  mobile__diancai: 'Treasury',
  mobile__dianhua: 'Enlightenment',
  mobile__diaodu: 'Dispatch',
  mobile__dingfa: 'Set the Law',
  mobile__dingfa_throw: 'Discard up to two cards from a player',
  mobile__dongbai: 'Dong Bai',
  mobile__dongcheng: 'Dong Cheng',
  mobile__duyu: 'Du Yu',
  mobile__falu: 'Talisman Register',
  mobile__feiyi: 'Fei Yi',
  mobile__fengji: 'Bountiful Store',
  mobile__fenxin: 'Burning Heart',
  mobile__fenxin_role: 'Exchange role cards',
  mobile__fenxin_skill: 'Gain skills',
  mobile__fozong: 'Buddhist Sect',
  mobile__fuhaiw: 'Sail the Seas',
  mobile__fuhaiw1: 'Rising Tide',
  mobile__fuhaiw2: 'Ebbing Tide',
  mobile__fujian: 'Hidden Spy',
  mobile__funan: 'Rebuttal',
  mobile__furong: 'Fu Rong',
  mobile__ganfuren: 'Lady Gan',
  mobile__gaolan: 'Gao Lan',
  mobile__geyuan: 'Circle Cutting',
  mobile__godjiangwei: 'God Jiang Wei',
  mobile__godmachao: 'God Ma Chao',
  mobile__godsimayi: 'God Sima Yi',
  mobile__gongsun: 'Shared Loss',
  mobile__guanyinping: 'Guan Yinping',
  mobile__guixiu: 'Noble Maiden',
  mobile__guozhao: 'Guo Nüwang',
  mobile__hansui: 'Han Sui',
  mobile__hanzhan: 'Fierce Battle',
  mobile__heqi: 'He Qi',
  mobile__huaman: 'Hua Man',
  mobile__huangfusong: 'Huangfu Song',
  mobile__huaxin: 'Hua Xin',
  mobile__huban: 'Hu Ban',
  mobile__huishi: 'Keen Insight',
  mobile__huojun: 'Huo Jun',
  mobile__huxiao: 'Tiger Roar',
  mobile__huxiao_beishui: 'Desperate Stand: discard a red card',
  mobile__huxiao_damage: 'Deal 1 fire damage to a player whose HP is not less than yours',
  mobile__huxiao_use: 'Cards you use this turn have no distance restriction',
  mobile__jiachong: 'Jia Chong',
  mobile__jianggan: 'Jiang Gan',
  mobile__jiangji: 'Jiang Ji',
  mobile__jiangqin: 'Jiang Qin',
  mobile__jianji: 'Divisive Scheme',
  mobile__jiaohua: 'Enlightenment',
  mobile__jiexun: 'Admonition',
  mobile__jiexun_num: '%arg (%arg2 cards)',
  mobile__jieyu: 'Dogged Defense',
  mobile__jieyuan: 'Severed Bond',
  mobile__jieyuan_beishui: 'Desperate Stand: upgrade this skill',
  mobile__jieyuan_discard: 'Discard a %arg2 card, this damage %arg',
  mobile__jieyuan_draw: 'Draw %arg %arg2 cards',
  mobile__jikang: 'Ji Kang',
  mobile__jilue: 'Ultimate Strategy',
  mobile__jilue_draw: 'Remove up to two Endure marks, draw that many cards',
  mobile__jilue_skill: 'Remove %arg Endure marks, gain an Ultimate Strategy skill',
  mobile__jimeng: 'Urgent Alliance',
  mobile__jincui: 'Utter Devotion',
  mobile__jingong: 'Vaunted Merit',
  mobile__jintao: 'Punitive March',
  mobile__juexiang: 'Final Echo',
  mobile__jujun: 'Hold the Heights',
  mobile__kongrong: 'Kong Rong',
  mobile__kuangcai: 'Mad Genius',
  mobile__kuangxiang: 'Mutual Aid',
  mobile__lianji: 'Chain Stratagem',
  mobile__lianpo: 'Onslaught',
  mobile__lianpo_skill: 'Choose and gain an Ultimate Strategy skill',
  mobile__lianpo_turn: 'Gain an extra turn',
  mobile__lianzhu: 'Chain Execution',
  mobile__liechi: 'Fierce Rebuke',
  mobile__lingju: 'Ling Ju',
  mobile__lingren: 'Overbearing',
  mobile__lirang: 'Courtesy',
  mobile__liuba: 'Liu Ba',
  mobile__liuye: 'Liu Ye',
  mobile__liwei: 'Li Yi',
  mobile__lougui: 'Lou Gui',
  mobile__lvfan: 'Lü Fan',
  mobile__lvkai: 'Lü Kai',
  mobile__maliang: 'Ma Liang',
  mobile__mamidi: 'Ma Midi',
  mobile__meibu: 'Beguiling Step',
  mobile__mengda: 'Meng Da',
  mobile__mifuren: 'Lady Mi',
  mobile__mingfa: 'Open Campaign',
  mobile__mingshi: 'Renowned Scholar',
  mobile__moucheng: 'Scheme Fulfilled',
  mobile__mumu: 'Solemn Grace',
  mobile__mumu_discard: 'Discard a card from a player\'s equip area',
  mobile__mumu_get: 'Obtain an armor card in play, cannot use Slash this turn',
  mobile__mutao: 'Call to Arms',
  mobile__natu_fu: 'Solace',
  mobile__natu_heng: 'Constant',
  mobile__natu_lie: 'Fierce',
  mobile__natu_xing: 'Revival',
  mobile__natu_yi: 'Righteousness',
  mobile__natu_yi_give: 'Distribute these cards',
  mobile__natu_yi_slash: 'Use these cards as a Slash against one of those players',
  mobile__niluan: 'Insurrection',
  mobile__qianlong: 'Hidden Dragon',
  mobile__qiantun: 'Humble Ambition',
  mobile__qianxinz: 'Dispatch Letters',
  mobile__qianxinz1: '%src draws two cards',
  mobile__qianxinz2: 'Your hand limit this turn -2',
  mobile__qinghegongzhu: 'Princess Qinghe',
  mobile__qingxian: 'Clear Strings',
  mobile__qizhou: 'Ornate Armor',
  mobile__renjie: 'Forbearance',
  mobile__runwei: 'Subtle Nourishment',
  mobile__runwei_active: 'Subtle Nourishment',
  mobile__runwei_disabled: 'Has obtained cards',
  mobile__sanchen: 'Three Memorials',
  mobile__saojian: 'Purge Traitors',
  mobile__shajue: 'Slaughter',
  mobile__shangyi: 'Uphold Honor',
  mobile__shanxi: 'Flash Raid',
  mobile__shejian: 'Sword Tongue',
  mobile__shenpei: 'Shen Pei',
  mobile__shiju: 'Rising Momentum',
  mobile__shuaiyan: 'Candid Words',
  mobile__shushen: 'Gentle Grace',
  mobile__sidai: 'Seize the Lull',
  mobile__simafu: 'Sima Fu',
  mobile__simazhao: 'Sima Zhao',
  mobile__simazhou: 'Sima Zhou',
  mobile__songshu: 'Praise of Shu',
  mobile__sufei: 'Su Fei',
  mobile__sunluyu: 'Sun Luyu',
  mobile__sunshao: 'Sun Shao',
  mobile__tianshu: 'Heavenly Book',
  mobile__tianyi: 'Heaven\'s Wings',
  mobile__tongdu: 'Rule and Measure',
  mobile__tongji: 'Shared Affliction',
  mobile__wangcan: 'Wang Can',
  mobile__wangliec: 'Valiant Advance',
  mobile__wangling: 'Wang Ling',
  mobile__wangshuang: 'Wang Shuang',
  mobile__wangyuanji: 'Wang Yuanji',
  mobile__wangyun: 'Wang Yun',
  mobile__wangzun: 'False Majesty',
  mobile__wanwei: 'Avert Peril',
  mobile__weisi: 'Unbridled Might',
  mobile__weiwenzhugezhi: 'Wei Wen & Zhuge Zhi',
  mobile__wenqin: 'Wen Qin',
  mobile__wenyang: 'Wen Yang',
  mobile__wuban: 'Wu Ban',
  mobile__wuji: 'Martial Legacy',
  mobile__wujing: 'Wu Jing',
  mobile__xiahui: 'Cunning Wit',
  mobile__xianglang: 'Xiang Lang',
  mobile__xiaoxi: 'Valiant Raid',
  mobile__xiezheng: 'Coerced Campaign',
  mobile__xiezheng_debuff: 'same-kingdom-priority',
  mobile__xingdaorong: 'Xing Daorong',
  mobile__xinpi: 'Xin Pi',
  mobile__xionghuo: 'Savage Cauldron',
  mobile__xuehen: 'Vengeance',
  mobile__xuewei: 'Blood Guard',
  mobile__xuezong: 'Xue Zong',
  mobile__xugong: 'Xu Gong',
  mobile__xunjie: 'Humble Integrity',
  mobile__xurong: 'Xu Rong',
  mobile__xushen: 'Devotion',
  mobile__yanghong: 'Yang Hong',
  mobile__yanghu: 'Yang Hu',
  mobile__yanghuiyu: 'Yang Huiyu',
  mobile__yangqiu: 'Yang Qiu',
  mobile__yangyi: 'Yang Yi',
  mobile__yanjiao: 'Strict Teaching',
  mobile__yanxiang: 'Yan Xiang',
  mobile__yilie: 'Righteous Ardor',
  mobile__yimou: 'Resolute Counsel',
  mobile__yimou_give: '%dest gives a hand card to another player and draws a card',
  mobile__yimou_slash: '%dest obtains a Slash',
  mobile__yingbing: 'Shadow Soldiers',
  mobile__yinju: 'Grasp the Robe',
  mobile__yizheng: 'Righteous Contest',
  mobile__yuanmo: 'Far-Reaching Plan',
  mobile__yuanshu: 'Yuan Shu',
  mobile__yuejian: 'Frugality',
  mobile__yuejiu: 'Yue Jiu',
  mobile__yufeng: 'Ride the Wind',
  mobile__yufeng_less: 'The next card\'s number is lower than %arg',
  mobile__yufeng_more: 'The next card\'s number is higher than %arg',
  mobile__zengou: 'Slanderous Plot',
  mobile__zengou_exchange: 'Replace the card with Slash',
  mobile__zengou_use: 'Count as using a basic card',
  mobile__zerong: 'Ze Rong',
  mobile__zhangbao: 'Zhang Bao',
  mobile__zhangbao_zhou: 'Curse',
  mobile__zhangchangpu: 'Zhang Changpu',
  mobile__zhangfen: 'Zhang Fen',
  mobile__zhanggong: 'Zhang Gong',
  mobile__zhangjih: 'Zhang Ji',
  mobile__zhangqiying: 'Zhang Qiying',
  mobile__zhangwen: 'Zhang Wen',
  mobile__zhangyiy: 'Zhang Yi',
  mobile__zhaoxiong: 'Manifest Malice',
  mobile__zhenfeng: 'Rousing Blade',
  mobile__zhenfeng_alives: 'Living players',
  mobile__zhenfeng_hp: 'Current HP',
  mobile__zhenfeng_lostHp: 'Lost HP',
  mobile__zhenfeng_recover: 'Recover 2 HP',
  mobile__zhenfeng_upgrade: 'Modify skill',
  mobile__zhennan: 'Pacify the South',
  mobile__zhenyi: 'True Rite',
  mobile__zhenyi_heart: 'Change the judgement result to <font color=\'red\'>♥</font>5',
  mobile__zhenyi_spade: 'Change the judgement result to ♠5',
  mobile__zhixi: 'Cessation',
  mobile__zhixi_prohibit: 'Cannot play cards',
  mobile__zhixi_remains: 'Remaining',
  mobile__zhouchu: 'Zhou Chu',
  mobile__zhoufu: 'Curse Bind',
  mobile__zhouxuanz: 'Manoeuvre',
  mobile__zhujun: 'Zhu Jun',
  mobile__zishu: 'Personal Letter',
  mobile_bingshi: 'Mobile: Force of Arms',
  mobile_derived: 'Mobile derived cards',
  mobile_dongjiao: 'Mobile',
  mobile_dongjiao__cuilingyi: 'Cui Fu',
  mobile_dongjiao__weizhuang: 'Finery',
  mobile_jsrg: 'Mobile: Rivers and Mountains',
  mobile_lxxh: 'Mobile: Dragon Blood',
  mobile_qianlong__fangzhu: 'Exile',
  mobile_qianlong__jiushi: 'Wine Poetry',
  mobile_qianlong__qingzheng: 'Integrity',
  mobile_qianlong_nullify_skill: 'Character skills are disabled',
  mobile_qianlong_only_trick: 'Can only use trick cards',
  mobile_rare: 'Mobile Rare',
  mobile_shiji: 'Mobile: Opening Stratagems',
  mobile_sp: 'Mobile SP',
  mobile_test: 'Mobile Test',
  mobile_xiuge: 'Mobile',
  mobile_xiuge__cuilingyi: 'Cui Fu',
  mobile_xiuge__weizhuang: 'Finery',
  moucuan: 'Plot Usurpation',
  mouli: 'Enthronement Plot',
  mowang: 'Demise',
  muludawang: 'King Mulu',
  muzhen: 'Harmonious Ranks',
  muzhen1: 'Put in an equip card, obtain a hand card',
  muzhen2: 'Give two cards, obtain an equip card',
  mxing: 'M. Star',
  mxing__dongzhuo: 'Star Dong Zhuo',
  mxing__fazheng: 'Star Fa Zheng',
  mxing__ganning: 'Star Gan Ning',
  mxing__huangzhong: 'Star Huang Zhong',
  mxing__wanglang: 'Star Wang Lang',
  mxing__weiyan: 'Star Wei Yan',
  mxing__xuhuang: 'Star Xu Huang',
  mxing__zhanghe: 'Star Zhang He',
  mxing__zhangliao: 'Star Zhang Liao',
  mxing__zhiyan: 'Strict Rule',
  mxing__zhiyan_draw: 'Draw up to your max HP in hand cards',
  mxing__zhiyan_give: 'Give another player the cards exceeding your HP',
  mxing__zhoubuyi: 'Star Zhou Buyi',
  nanhualaoxian: 'Nanhua the Immortal',
  naxue: 'Embrace Learning',
  nigu: 'Defiant Hold',
  noresult: 'No result',
  nos__cunsi: 'Preserve the Heir',
  nos__guixiu: 'Noble Maiden',
  nos__huaxin: 'Hua Xin',
  nos__mifuren: 'Lady Mi',
  nos__xunchen: 'Xun Chen',
  offensive_horse__xianjian: 'Breach',
  offensive_siege_engine: 'Great Siege Engine - Assault',
  pangdegong: 'Pang Degong',
  pangtong__gongli: 'Mutual Honing',
  pangxi: 'Pang Xi',
  panxiang: 'Halting Aid',
  panxiang1: 'Damage -1',
  'panxiang1-from': 'Damage -1, %src draws two cards',
  panxiang2: 'Damage +1, they draw three cards',
  path_beginner: 'Starting player',
  path_end: 'Destination player',
  path_player: 'Path player',
  peidong: 'Reins Eastward',
  peixiu: 'Pei Xiu',
  pengyang: 'Peng Yang',
  pingcai: 'Appraise Talent',
  pingcai_fail: 'The wipe failed!',
  pingcai_pangtong: 'Fledgling Phoenix',
  pingcai_simahui: 'Water Mirror',
  pingcai_success: 'The wipe succeeded!',
  pingcai_wolong: 'Crouching Dragon',
  pingcai_xushu: 'Mystic Sword',
  pinghe: 'Ford the River',
  poise: 'Poise',
  polu: 'Shield Breaker',
  polus: 'Rout the Invaders',
  powei: 'Break the Siege',
  powei_active: 'Break the Siege',
  powei_damage: 'Discard a hand card and deal 1 damage to them',
  powei_prey: 'Obtain one of their hand cards',
  poxiang: 'Defy Surrender',
  premeditate: 'Premeditate',
  premeditate_href: 'Place a hand card face down in your judgement area; at the start of your Judge '
    + 'phase, resolve the Premeditate cards one by one in the order they were placed (the '
    + 'last one placed is handled first): 1. use this card, then you cannot use another '
    + 'card with this name during this phase; 2. put all Premeditate cards into the discard '
    + 'pile.',
  qianchong: 'Modesty',
  qiangyong: 'Qiang Valor',
  qianzhao: 'Qian Zhao',
  qiaogong: 'Qiao Gong',
  qiaosi: 'Ingenuity',
  qiaosi_abort: 'Stop spinning',
  qiaosi_baixitu: 'Puppet Show',
  qiaosi_discard: 'Discard the same number of cards',
  qiaosi_figure1: 'King: two trick cards',
  qiaosi_figure2: 'Merchant: 75% equip, 25% Slash/Alcohol; if General is also picked, always Slash/Alcohol',
  qiaosi_figure3: 'Artisan: 75% Slash, 25% Alcohol',
  qiaosi_figure4: 'Farmer: 75% Dodge, 25% Peach',
  qiaosi_figure5: 'Scholar: 75% trick, 25% Dodge/Peach; if King is also picked, always Dodge/Peach',
  qiaosi_figure6: 'General: two equip cards',
  qiaosi_give: 'Give the same number of cards',
  qiaozhou: 'Qiao Zhou',
  qihui: 'Enlightenment',
  qihui_use: 'Next card used has no limit on uses',
  qingdao: 'Pure Tread',
  qingdao_discard: 'Discard a card in a player\'s area',
  qingdao_jink: 'Obtain a Dodge',
  qingdao_slash: 'Obtain a Slash',
  qingdao_use: 'Use a hand card',
  qingjue: 'Appeal',
  qingshix: 'Discerning Eye',
  qingyu: 'Pure Jade',
  qinying: 'Esteemed Valor',
  'qinying&': 'Esteemed Valor',
  qinzheng: 'Diligent Governance',
  qirang: 'Prayer Rite',
  qishe: 'Mounted Archery',
  quanchong: 'Imperial Favour',
  quanfeng: 'Urge Investiture',
  quchong: 'Siege Works',
  quchong_active: 'Siege Works',
  quedi: 'Repel the Foe',
  quedi_beishui: 'Desperate Stand: reduce max HP by 1',
  quedi_damage: 'Discard a basic card to give this %arg +1 damage',
  quedi_prey: 'Obtain a hand card from %dest',
  quesong: 'Sparrow\'s Ode',
  quesong_draw: 'Draw %arg cards and reset',
  qusheng: 'Chariot Charge',
  rangjie: 'Ceded Authority',
  rangjie_move: 'Move a card in play',
  rangjie_obtain: 'Obtain a card of a named type',
  realcard_viewas: 'Use',
  renshi: 'Merciful Release',
  renshih: 'Benevolent Service',
  renxing: 'Unchecked Conduct',
  renxing_discard: 'Discard a card from a player',
  renxing_draw: 'You and %dest each draw a card',
  rongbei: 'War Readiness',
  ruanhui: 'Ruan Hui',
  ruilian: 'Sage Gleaning',
  score_full: 'A full haul, ha ha.',
  score_not_full: 'The stars are in my bag.',
  score_one: 'The wind is up - run for it.',
  score_zero: 'A pity - the stars stayed out of reach.',
  shameng: 'Blood Oath',
  shangjian: 'Frugality',
  shanjia: 'Mend Armour',
  shanxie: 'Master of Arms',
  shenpeij: 'Divine Rain',
  shenzhuo: 'Divine Shot',
  shenzhuo_draw1: 'Draw 1 card, you can keep using Slash',
  shenzhuo_draw3: 'Draw 3 cards, you cannot use Slash this turn',
  shepan: 'Awe the Rebels',
  shepan_put: 'Put one of %dest\'s hand cards on top of the draw pile',
  sheque: 'Repelling Shot',
  sheyi: 'Forsake the Heir',
  shezi: 'Seize the Timber',
  shichangshi: 'Ten Attendants',
  shidi: 'Rival Force',
  shihe: 'Show of Force',
  shiji: 'Force Strike',
  shijic: 'Shi Ji',
  shishoul: 'Faithful Watch',
  shishu: 'Trust in Guile',
  shishu_discard: 'Discard those cards',
  shishu_give: 'Give them a card whose type differs from all of those',
  shitao__gongli: 'Mutual Honing',
  shixie: 'Shi Xie',
  shixin: 'Defy',
  shizhong: 'Strength in Numbers',
  shoufa: 'Beast Arts',
  shoufa_bao: 'Leopard',
  shoufa_tu: 'Rabbit',
  shoufa_xiong: 'Bear',
  shoufa_ying: 'Eagle',
  shouye: 'Defense of Ye',
  shouye_choice1: 'Open Gates, Lure the Enemy',
  shouye_choice2: 'Raid the Supply Road',
  shouye_choice3: 'Storm the City',
  shouye_choice4: 'Split Troops, Besiege',
  shouyuez: 'Bestow Music',
  shouyuez_choose: 'Bestow Music',
  shouyuez_draw: 'Draw a card and make a player gain Zither Song',
  shouyuez_restore: 'Make a player reset their character card',
  shuanghuai: 'Frost Heart',
  shuanghuai_peach: 'Make %dest obtain a Peach from the discard pile',
  shuanghuai_prevent: 'Prevent this damage',
  shuchen: 'Petition',
  shuliang: 'Grain Supply',
  shunyi: 'Effortless Flow',
  shuxing: 'Binding Penalty',
  shuxing_give: 'Give every Dodge among them, and hand %src the right to make your next Uphold the '
    + 'Law choice',
  shuxing_lose: 'Lose 1 HP',
  shuyong: 'Fair Valor',
  sifeng: 'Waiting Blade',
  sifeng_damage: 'Remove %dest\'s \'Waiting Blade\' and deal 1 damage to them',
  sifeng_prey: 'Obtain %dest\'s \'Waiting Blade\'',
  simazhao_wang: 'Ambition',
  sizi: 'Unbridled',
  strategy_failed: 'Stratagem failed',
  strategy_success: 'Stratagem succeeded',
  sunhao: 'Sun Hao',
  sunru: 'Sun Ru',
  sunshaow: 'Sun Shao',
  sunyi: 'Sun Yi',
  suwang: 'Long Renown',
  tamo: 'Couch Counsel',
  tanfeng: 'Probing Blade',
  tanfeng_damage: 'Deal fire damage',
  tanfeng_discard: 'Discard a player\'s cards',
  taoluanh: 'Quell Rebellion',
  taoluanh_prey: 'Obtain the judgement card',
  taoluanh_slash: 'Count as using a fire Slash against %dest',
  taomie: 'Extermination',
  taomie_beishui: 'Backwater: discard their Extermination mark, and this damage does not make them gain '
    + 'the mark',
  taomie_damage: 'This damage +1',
  taomie_prey: 'Obtain a card from their area, and you can give it to another player',
  taoqian: 'Tao Qian',
  tiansuan: 'Heaven\'s Reckoning',
  tiansuanA: 'Fair Fortune',
  tiansuanB: 'Bad Fortune',
  tiansuanC: 'Terrible Fortune',
  tiansuanNone: 'No cheating',
  tiansuanS: 'Good Fortune',
  tiansuanSSR: 'Great Fortune',
  tiantao: 'Heavenly Torrent',
  tianyin: 'Heavenly Sound',
  tianzuo: 'Heaven\'s Aid',
  tingwei: 'Thunderous Might',
  tingwei_1: 'Your non-forced skills are invalid until the end of your next turn',
  tingwei_2: 'Give them an equip card',
  tingwei_3: 'This card deals +1 damage to you',
  tingwei_4: 'Discard a random card',
  tongqu: 'Canal Works',
  tongqu__jiakui: 'Jia Kui',
  tongqu_active: 'Canal Works',
  treasure__xianjian: 'Breach',
  tunchu: 'Stockpile',
  wangfuzhaolei: 'Wang Fu & Zhao Lei',
  wangjing: 'Wang Jing',
  wangjingm: 'March on the Capital',
  wangjun: 'Wang Jun',
  wanglang: 'Wang Lang',
  wangzhuan: 'Usurped Authority',
  wanlan: 'Stem the Tide',
  weapon__xianjian: 'Breach',
  weifeng: 'Imposing Might',
  weiming: 'Mighty Mandate',
  weitong: 'Guard the Line',
  weizhuang: 'Finery',
  weizhuang_draw: 'Draw phase draw count +1',
  weizhuang_draw_diff: 'Draw phase draw count -1',
  weizhuang_hand: 'Hand limit +1',
  weizhuang_hand_diff: 'Hand limit -1',
  weizhuang_hp: 'Recover 1 HP',
  weizhuang_hp_diff: 'Lose 1 HP',
  'weizhuang_record-noclear': 'Finery',
  weizhuang_slash: 'Slash use limit +1',
  weizhuang_slash_diff: 'Slash use limit -1',
  wisdom__qiai: 'Seven Sorrows',
  wisdom__shanxi: 'War Proclamation',
  wolongyance: 'Predict the colour or the type of a set number of cards that will be used from now '
    + 'on (the number of cards you can predict starts at 3). The prediction method is '
    + 'either predicting by colour or predicting by type. A prediction is revealed when a '
    + 'player uses a card; once all the predictions have been revealed, this is called '
    + 'fully verified.',
  wooden_ox: 'Wooden Ox',
  wufei: 'Slander',
  wuke: 'Wu Ke',
  wuku: 'Armoury',
  wuling: 'Five Beasts',
  wuling1: 'Tiger',
  wuling2: 'Deer',
  wuling3: 'Bear',
  wuling4: 'Ape',
  wuling5: 'Crane',
  wulingHe: 'Crane Spirit',
  wulingHu: 'Tiger Spirit',
  wulingLu: 'Deer Spirit',
  wulingXiong: 'Bear Spirit',
  wulingYuan: 'Ape Spirit',
  'wurong-anfu': 'Appease',
  'wurong-fankang': 'Resist',
  'wurong-guishun': 'Submit',
  'wurong-zhenya': 'Suppress',
  wuyuan: 'Martial Bond',
  xiangchong: 'Xiang Chong',
  xianghai: 'Village Scourge',
  xiangzhen: 'Elephant Formation',
  xianjian: 'Breach',
  xianjian_draw: '%src draws a card, %dest discards %arg card(s)',
  xianjian_put: 'After this Slash resolves it becomes %dest\'s Breach card',
  xiaoge: 'Valiant Lance',
  xiaoni: 'Insolence',
  xiaxing: 'Knight Errant',
  xichang: 'Don the Robe',
  xiefang: 'Gather Blossoms',
  xieli_bingjin: 'Advance Together',
  xieli_luli: 'Join Forces',
  xieli_shucai: 'Open Purse',
  xieli_tongchou: 'Common Foe',
  xiezhi: 'Harbored Ambition',
  xing__yishi: 'Righteous Release',
  xingbu: 'Star Divination',
  xinghun: 'Star Soul',
  xingqi: 'Star Omen',
  xingtu: 'Cartography',
  xiongjin: 'Bold Advance',
  xiongsi: 'Wanton Cruelty',
  xiongtus: 'Vicious Scheme',
  xiongzi: 'Majestic Bearing',
  xiongzi_1: 'Option 2',
  xiongzi_2: 'Option 1',
  xiugeng: 'Tend the Fields',
  xizhan: 'Playful Skirmish',
  xuancun: 'Lifeline',
  xuanjian_sword: 'Mystic Sword',
  'xuanjian_sword_skill&': 'Mystic Sword',
  xuetu: 'Blood Path',
  xuetu_v2: 'Blood Path',
  xuetu_v2_draw: 'Make a player draw two cards',
  xuetu_v2_recover: 'Make a player recover 1 HP',
  xuetu_v3: 'Blood Path',
  xunyi: 'Martyrdom',
  xushu__gongli: 'Mutual Honing',
  xuye: 'Foster Growth',
  yajun: 'Noble Bearing',
  yajun_top: 'Put on top of the draw pile',
  yance: 'Stratagem',
  yance_prey: 'Obtain a trick card',
  yance_yance: 'Carry out "Sleeping Dragon\'s Stratagem"',
  yangbiao: 'Yang Biao',
  yangfeng: 'Yang Feng',
  yangfu: 'Yang Fu',
  yangjie: 'Feigned Relief',
  yanhui: 'Flame Eddy',
  yanji: 'Strict Discipline',
  yanpu: 'Yan Pu',
  yaohu: 'Invite the Tiger',
  yichong: 'Shifting Favour',
  yijie: 'Final Admonition',
  yijin: 'Vast Gold',
  yijin_active: 'Vast Gold',
  yijin_guxiong: 'Bought Calamity',
  yijin_houren: 'Weighty Trust',
  yijin_jinmi: 'Gold Besotted',
  yijin_tongshen: 'Divine Reach',
  yijin_wushi: 'Bountiful Office',
  yijin_yongbi: 'Shut Out',
  yingba: 'Heroic Supremacy',
  yingjia: 'Imperial Escort',
  yingjian: 'Shadow Arrow',
  yingyuan: 'Support',
  yinship: 'Reclusion',
  yinzhan: 'Battle Draught',
  yirang: 'Gracious Yielding',
  yixiang: 'Righteous Aid',
  yixing: 'Shifting Form',
  yiyongw: 'Extraordinary Valour',
  yizan: 'Loyal Support',
  yizhu: 'Lost Pearl',
  youlve: 'Roving Raid',
  youye: 'Lasting Enterprise',
  youyi: 'Wandering Physician',
  yuanhuan: 'Yuan Huan',
  yuanqing: 'Clear Depths',
  yuejin__heyu: 'Joint Defense',
  yuetan: 'Tanxi Leap',
  yueyuan: 'Leap from the Deep',
  yuhua: 'Ascension',
  yuli: 'Thunder Rein',
  yunan: 'Devious Revolt',
  yuxiang: 'Elephant Rider',
  zaoli: 'Restless Rage',
  zhangbu: 'Zhang Bu',
  zhangliao__heyu: 'Joint Defense',
  zhangming: 'Manifest Renown',
  zhangzhongjing: 'Zhang Zhongjing',
  zhanlie: 'Blazing War',
  zhanlie_damage: 'Damage +1',
  zhanlie_disresponsive: 'Must discard an extra card to respond',
  zhanlie_draw: 'Draw two cards after resolving',
  zhanlie_target: 'Targets +1',
  zhanshi: 'Survey the Field',
  zhaohan: 'Glorify the Han',
  zhaohuo: 'Invite Calamity',
  zhaotongzhaoguang: 'Zhao Tong and Zhao Guang',
  zhaoxin: 'Manifest Intent',
  zhenbian: 'Border Guard',
  zhenfu: 'Pacify',
  zhengjian: 'Candid Recommendation',
  zhengjing: 'Collate the Classics',
  zhengjun: 'Muster',
  zhengnan: 'Southern Campaign',
  zhengpeng: 'Drifting Tumbleweed',
  zhengshuo: 'Rightful Calendar',
  zhengsu_bianzhen: 'Shift Formation',
  zhengsu_desc: '<b>#Rectify:</b><br>The player who uses the skill chooses one of Drumbeat Advance, '
    + 'Shift Formation or Sound the Halt for the target to carry out; if Rectify succeeds '
    + 'this turn, they gain the Rectify reward at the end of the Discard '
    + 'phase.<br><b>Drumbeat Advance:</b>During the Action phase, the points of all cards '
    + 'used must increase, and at least three cards must be used.<br><b>Shift '
    + 'Formation:</b>During the Action phase, all cards used must be of the same suit, and '
    + 'at least two cards must be used.<br><b>Sound the Halt:</b>During the Discard phase, '
    + 'all cards discarded must be of different suits, and at least two cards must be '
    + 'discarded.<br><b>Rectify reward:</b>Draw two cards or recover 1 HP.',
  zhengsu_failure: 'Failure',
  zhengsu_leijin: 'Drumbeat Advance',
  zhengsu_mingzhi: 'Sound the Halt',
  zhengsu_success: 'Success',
  zhengxuan: 'Zheng Xuan',
  zhenjun: 'Steady the Army',
  zhenting: 'Guard the Court',
  zhenting_beishui: 'Desperate Stand: become the target of this card in their place',
  zhenting_discard: 'Discard a hand card from %dest',
  zhenxing: 'Steady March',
  zherui: 'Break the Edge',
  zhijie: 'Wise Counsel',
  zhilve: 'Strategic Insight',
  zhilve1: 'Move a card on the field',
  zhilve2: 'Draw a card and it counts as using a Slash',
  zhimeng: 'Wise Alliance',
  zhiyi: 'Uphold Righteousness',
  zhongao: 'Proud Loyalty',
  zhoulin: 'Cursed Scales',
  zhoulin_bao: 'Leopard: the damage source takes 1 damage with no source',
  zhoulin_tu: 'Rabbit: the damage source draws a card',
  zhoulin_xiong: 'Bear: discard a random card from the damage source\'s equip area',
  zhoulin_ying: 'Eagle: obtain a random card from the damage source',
  zhouqun: 'Zhou Qun',
  zhouxian: 'Provincial Sage',
  zhuangshi: 'Valiant Oath',
  zhugeguo: 'Zhuge Guo',
  zhugeke: 'Zhuge Ke',
  zhugeliang__gongli: 'Mutual Honing',
  zhuguo: 'Aid the State',
  zhujian: 'Build the Fleet',
  zhujic: 'Zhu Ji',
  zhujis: 'Build Ramparts',
  zhujis_shield: 'Gain 1 Shield',
  zifu: 'Self-Binding',
  zuici: 'Indictment',
  zujin: 'Halt the Advance',
  zundi: 'Honor the Heir',
  zuoxing: 'Fortune\'s Aide',
  zuoyou: 'Aid and Guard',

  /* ------------------------------------------------------------------------
   * Character subtitles (称号) and skill prompts. 2264 keys.
   * ---------------------------------------------------------------------- */
  '##RenPileTrigger_1_trig': 'Benevolence',
  '##ThisTurnDiscardedRecorder_1_trig': '#ThisTurnDiscardedRecorder',
  '##ThisTurnDiscardedRecorder_2_trig': '#ThisTurnDiscardedRecorder',
  '##UseCardRecoder_1_trig': '#UseCardRecoder',
  '##choose_path_1_active': 'Choose Path',
  '##connected_cards_rule_1_trig': 'Discard Connected Cards',
  '##connected_cards_rule_2_trig': 'Discard Connected Cards',
  '##connected_cards_rule_3_visibility': 'Discard Connected Cards',
  '##defensive_siege_engine_skill_1_trig': 'Great Siege Engine - Defense',
  '##defensive_siege_engine_skill_2_trig': 'Great Siege Engine - Defense',
  '##defensive_siege_engine_skill_3_trig': 'Great Siege Engine - Defense',
  '##defensive_siege_engine_skill_4_trig': 'Great Siege Engine - Defense',
  '##ex_crossbow_skill_1_trig': '#ex_crossbow_skill',
  '##ex_crossbow_skill_2_targetmod': '#ex_crossbow_skill',
  '##ex_eight_diagram_skill_1_trig': 'Primordial Eight Diagram',
  '##ex_eight_diagram_skill_2_trig': 'Primordial Eight Diagram',
  '##ex_nioh_shield_skill_1_trig': 'Nioh Vajra Shield',
  '##ex_silver_lion_skill_1_trig': 'Moonlit Lion Helm',
  '##ex_silver_lion_skill_2_trig': 'Moonlit Lion Helm',
  '##ex_vine_skill_1_trig': 'Tung Oil Vine Armor',
  '##ex_vine_skill_2_trig': 'Tung Oil Vine Armor',
  '##ex_vine_skill_3_trig': 'Tung Oil Vine Armor',
  '##m_liuyi__liulongcanjia_skill_1_distance': '#m_liuyi__liulongcanjia_skill',
  '##mobile__catapult_skill_1_trig': 'Thunderbolt Catapult',
  '##mobile__jiexun_active_1_active': 'Admonition',
  '##mobile__jieyuan_active_1_active': 'Severed Bond',
  '##mobile_zhengsu_recorder_1_trig': '#mobile_zhengsu_recorder',
  '##mobile_zhengsu_recorder_2_trig': '#mobile_zhengsu_recorder',
  '##mobile_zhengsu_recorder_3_trig': '#mobile_zhengsu_recorder',
  '##offensive_siege_engine_skill_1_trig': 'Great Siege Engine - Assault',
  '##offensive_siege_engine_skill_2_trig': 'Great Siege Engine - Assault',
  '##offensive_siege_engine_skill_3_trig': 'Great Siege Engine - Assault',
  '##offensive_siege_engine_skill_4_trig': 'Great Siege Engine - Assault',
  '##premeditate_rule&_1_trig': 'Premeditate',
  '##premeditate_rule&_2_prohibit': 'Premeditate',
  '##premeditate_rule&_3_visibility': 'Premeditate',
  '##util_addandcanceltarget_1_active': 'Add or Cancel Target',
  '#AddToRenPile': '%card is moved into the Benevolence zone by %arg',
  '#AskToChooseGeneralSkills': '%arg: choose %arg2 to %arg3 character skills',
  '#AskToChooseGeneralsAndChoice': '%arg: choose %arg2 to %arg3 characters',
  '#BuXuFalid': '%from failed to trigger %arg: could not find %arg2',
  '#CardDisplayedDesc': 'A revealed card is a general property of a game card: it means the card is visible '
    + 'to all players.<br />Normally the cards in a player\'s equip area and judgement area '
    + 'are all revealed cards, but a player\'s revealed cards do not include the cards in '
    + 'their judgement area.<br />(Note: this mechanic is not additionally adapted to any '
    + 'mechanic other than Mobile\'s reveal.)',
  '#ChengShi': 'Seize Momentum is a special additional effect: in a multi-branch effect, if the '
    + 'trigger condition of every branch is met, this effect is triggered.',
  '#ConnectCards': 'An operation performed on hand cards. Connected hand cards are visible to all '
    + 'players. When one connected card leaves a player\'s hand area because it was used, '
    + 'played or discarded, all players discard the remaining connected cards one by one '
    + '(this operation does not trigger this rule\'s discard again). When a connected card '
    + 'is connected again or leaves the corresponding area, it is reset to its normal '
    + 'state.',
  '#DisplayCardsDesc': 'Revealing is an action: the process of turning a game card from face down to face '
    + 'up.<br />When a player reveals cards, every card about to be revealed must meet the '
    + 'following conditions:<br />1. it is in a player\'s area;<br />2. it is not already a '
    + 'revealed card.<br />(Note: this mechanic is not additionally adapted to any mechanic '
    + 'other than Mobile\'s reveal.)',
  '#JointPindianNoWinner': 'The joint point fight %arg has no winner',
  '#LawsDesc': '1. The player who dealt the most damage this round takes 2 sourceless damage;<br '
    + '/>2. the player who obtained the most cards this round has their hand card limit '
    + '-2;<br />3. the player whose HP changed the most times this round loses 1 max HP;<br '
    + '/>4. the player with the most cards in their areas in play gives one card to each '
    + 'other player.',
  '#MexWuRongResult': '%from chose %arg',
  '#OverflowFromRenPile': '%card overflowed out of the Benevolence zone',
  '#PathDesc': 'A path between the user (the one who triggers) and the target (the one chosen) that '
    + 'traverses all the players between them in one direction. \'Players on the path\' does '
    + 'not include the first and last players.',
  '#PutKnownCardtoDrawPile': '%from put %card on top of the draw pile',
  '#RenPileTrigger': 'Benevolence Zone',
  '#SendDiscussionOpinion': '%from \'s opinion is %arg',
  '#ShowDiscussionResult': '%from \'s discussion result is %arg',
  '#ShowJointPindianWinner': '%from %arg in the joint point fight',
  '#StartDiscussionReason': '%from started a discussion because of %arg',
  '#StrategiesResult': '%from %arg on %to',
  '#TiansuanResult': '%from \'s Heaven\'s Reckoning draw result is %arg',
  '#ZhengjingChoice': '%from sorted out %arg',
  '#anda-give': 'Confidant: give %dest two cards of different colours, otherwise they recover 1 HP',
  '#anda-invoke': 'Confidant: you can make %src give %dest two cards of different colours, otherwise '
    + '%dest recovers 1 HP',
  '#anda_1_trig': 'Confidant',
  '#anda_active_1_active': 'Confidant',
  '#anxianc-choose': 'Hidden Bowstring: you can obtain one of these Slashes and then use it (it does not '
    + 'count toward the use limit and has no distance or use restriction)',
  '#anxianc-slash': 'Hidden Bowstring: use this Slash (it does not count toward the use limit and has no '
    + 'distance or use restriction)',
  '#anxianc_1_trig': 'Hidden Bowstring',
  '#aocai': 'Proud Talent: you can use or play the basic card you need from among them',
  '#aocai_1_active': 'Proud Talent',
  '#aosi_1_trig': 'Unbridled',
  '#aosi_2_targetmod': 'Unbridled',
  '#askForCardByMultiPatterns': 'Choose Card',
  '#askForDiscussion': 'Show a hand card for the discussion',
  '#askForUseRealCard': '%arg: use a card',
  '#askforCardsChosenFromAreas': '%arg: choose one card from each area of %dest',
  '#aux_dawu_1_trig': 'Heavy Fog',
  '#aux_kuangfeng_1_trig': 'Gale',
  '#baoxi-use': 'Violent Raid: you can lose 1 max HP to use a hand card as %arg',
  '#baoxi_1_trig': 'Violent Raid',
  '#beiming-choose': 'Comet Light: you can make up to two players obtain a weapon card',
  '#beiming_1_trig': 'Comet Light',
  '#beizhu-draw': 'Prepared Punishment: you can make %src obtain a Slash from the draw pile',
  '#beizhu-prompt': 'Prepared Punishment: you can look at another player\'s hand cards; if there is a '
    + 'Slash, they use their Slashes on you, otherwise you discard a card from them',
  '#beizhu-throw': 'Prepared Punishment: discard a card from %src',
  '#beizhu_1_active': 'Prepared Punishment',
  '#beizhu_2_trig': 'Prepared Punishment',
  '#bifeng-invoke': 'Evade the Edge: you can cancel the %arg that %src used on you; after it resolves you '
    + 'lose HP or draw cards',
  '#bifeng_1_trig': 'Evade the Edge',
  '#bifeng_2_trig': 'Evade the Edge',
  '#bihan-choose': 'Shield Ward: make yourself or %dest discard hand cards down to their current HP, and '
    + 'this Slash deals 1 less damage to them',
  '#bihan_1_trig': 'Shield Ward',
  '#bihuoy-invoke': 'Avert Disaster: you can make %dest draw three cards, and this round the distance '
    + 'from every player to them is increased',
  '#bihuoy_1_trig': 'Avert Disaster',
  '#bihuoy_2_distance': 'Avert Disaster',
  '#biluan-invoke': 'Flee the Turmoil: you can give up drawing cards to make other players\' distance to '
    + 'you increase by %arg',
  '#biluan_1_trig': 'Flee the Turmoil',
  '#biluan_2_distance': 'Flee the Turmoil',
  '#bingfa-choose': 'Uphold the Law: choose one law; the one chosen most often becomes this round\'s law',
  '#bingfa-choose_basic': 'Uphold the Law: choose two laws for every player whose character card is face up to '
    + 'choose between',
  '#bingfa-distribute': 'Uphold the Law: distribute one card to each player',
  '#bingfa-extra_choose': 'Uphold the Law: choose this round\'s law for another player (%arg more to choose)',
  '#bingfa_1_trig': 'Uphold the Law',
  '#bingfa_2_trig': 'Uphold the Law',
  '#bingfa_3_trig': 'Uphold the Law',
  '#bingfa_4_trig': 'Uphold the Law',
  '#bingfa_5_trig': 'Uphold the Law',
  '#binghuo-choose': 'Scourge of War: make a player judge, and if the result is black, you deal 1 thunder '
    + 'damage to them',
  '#binghuo_1_trig': 'Scourge of War',
  '#binglun': 'Treatise: you can remove a card from the Benevolence area and make a player choose '
    + 'to draw a card or to recover HP at the end of their turn',
  '#binglun_1_active': 'Treatise',
  '#binglun_2_trig': 'Treatise',
  '#bingqing-damage': 'Uphold Purity: you can deal 1 damage to another player',
  '#bingqing-discard': 'Uphold Purity: you can discard a card from a player\'s area',
  '#bingqing-draw': 'Uphold Purity: you can make a player draw two cards',
  '#bingqing_1_trig': 'Uphold Purity',
  '#bingqing_2_trig': 'Uphold Purity',
  '#biwei': 'Scorn of Rank: discard the hand card with the unique highest number, then make a '
    + 'player discard all hand cards with a number not less than that card',
  '#biwei_1_active': 'Scorn of Rank',
  '#bixian-use': 'Hold the Pass: it counts as using a Duel',
  '#bixian_1_trig': 'Hold the Pass',
  '#bojian-give': 'Broad Insight: choose one of those cards and give it to a player',
  '#bojian_1_trig': 'Broad Insight',
  '#buqi-invoke': 'Never Abandon: remove two "Benevolence" cards to make %dest recover 1 HP',
  '#buqi_1_trig': 'Never Abandon',
  '#buqi_2_trig': 'Never Abandon',
  '#buxu-choice': 'Restoration: choose one of your missing Six Classics to obtain',
  '#buxu_1_active': 'Restoration',
  '#caiqiu-put': 'Tailored Fur: you can obtain at least one of these cards, but you lose HP this round '
    + 'when another player uses a card with the same name',
  '#caiqiu_1_trig': 'Tailored Fur',
  '#caiqiu_2_trig': 'Tailored Fur',
  '#caizhenji': 'A Selfless Heart\'s Care',
  '#cangjia_1_trig': 'Hidden Blade',
  '#cangjia_2_prohibit': 'Hidden Blade',
  '#canshi_1_trig': 'Cruel Blight',
  '#canshi_2_trig': 'Cruel Blight',
  '#caochun': 'Head of the Tiger and Leopard Cavalry',
  '#caowei-choose': 'Subtle Control: choose at least one card type and recast all of your cards of those types',
  '#caowei_1_trig': 'Subtle Control',
  '#changshi__chihe-invoke': 'Thunderous Rebuke: make the Slash you use on %dest unable to be responded to and '
    + 'increase its damage?',
  '#changshi__chihe_1_trig': 'Browbeat',
  '#changshi__chihe_2_trig': 'Browbeat',
  '#changshi__chihe_3_prohibit': 'Browbeat',
  '#changshi__chiyan-invoke': 'Owl\'s Gullet: put one card of %dest on their character card until the end of the turn?',
  '#changshi__chiyan_1_trig': 'Owl Cry',
  '#changshi__chiyan_2_trig': 'Owl Cry',
  '#changshi__chiyan_3_trig': 'Owl Cry',
  '#changshi__kuiji': 'Spy the Moment: look at a player\'s hand cards, and you can discard four cards of '
    + 'different suits from your hand and theirs',
  '#changshi__kuiji-ask': 'Spy the Moment: discard four cards of different suits from both players\' hands',
  '#changshi__kuiji_1_active': 'Spy the Chance',
  '#changshi__miaoyu_1_active': 'Clever Words',
  '#changshi__miaoyu_2_trig': 'Clever Words',
  '#changshi__miaoyu_3_trig': 'Clever Words',
  '#changshi__niqu': 'Seize by Force: deal 1 fire damage to a player',
  '#changshi__niqu_1_active': 'Usurp',
  '#changshi__picai': 'Gather Materials: judge repeatedly until a suit repeats, then you can give the '
    + 'judgement cards to a player',
  '#changshi__picai-ask': 'Gather Materials: continue judging?',
  '#changshi__picai-give': 'Gather Materials: you can give these judgement cards to a player',
  '#changshi__picai_1_active': 'Gather Materials',
  '#changshi__taoluan': 'Rising Turmoil: you can use a card as any basic card or ordinary trick card',
  '#changshi__taoluan_1_active': 'Flood of Chaos',
  '#changshi__xiaolu': 'Night Bribes: draw two cards, then discard two hand cards or give two hand cards to '
    + 'another player',
  '#changshi__xiaolu-give': 'Night Bribes: give %arg hand cards to another player',
  '#changshi__xiaolu_1_active': 'Night Bribe',
  '#changshi__yaozhuo': 'Slander: point fight with a player; if you win, they skip their next Draw phase; if '
    + 'you do not win, you discard two cards',
  '#changshi__yaozhuo_1_active': 'Slander',
  '#changshi__yaozhuo_2_trig': 'Slander',
  '#changshi__zimou_1_trig': 'Own Counsel',
  '#changshi__zimou_2_trig': 'Own Counsel',
  '#chanyuan_1_trig': 'Entangled Grudge',
  '#chanyuan_2_invalidity': 'Entangled Grudge',
  '#chanyuan_3_trig': 'Entangled Grudge',
  '#chengjiw': 'Mangy Hound, Fine Bow',
  '#chengxiong-choose': 'Punish the Wicked: discard a card from a player; if it is %arg, deal 1 damage to them',
  '#chengxiong-discard': 'Punish the Wicked: discard a card from %dest',
  '#chengxiong_1_trig': 'Punish the Wicked',
  '#chengye-put': 'Inheritance: put one of these cards down as a Classic',
  '#chengye_1_trig': 'Inheritance',
  '#chengye_2_trig': 'Inheritance',
  '#chengye_3_trig': 'Inheritance',
  '#chengzhang_1_trig': 'Verse Complete',
  '#chengzhang_2_trig': 'Verse Complete',
  '#chengzhang_3_trig': 'Verse Complete',
  '#chengzhao-choose': 'Bear the Edict: start a point fight with a player; if you win, it counts as using a '
    + 'Slash on them that ignores armor',
  '#chengzhao_1_trig': 'Bear the Edict',
  '#chengzhao_2_trig': 'Bear the Edict',
  '#chenshe-discard': 'Plea for Pardon: discard a card from %dest, current suit: %arg',
  '#chenshe-invoke': 'Plea for Pardon: you can discard one card each from you, %src and %dest; if the '
    + 'suits are the same, %src recovers to full HP',
  '#chenshe-invokeNoSource': 'Plea for Pardon: you can discard one card each from you and %src; if the suits are '
    + 'the same, %src recovers to full HP',
  '#chenshe_1_trig': 'Plea for Pardon',
  '#chenzhen': 'Envoy of the Blood Oath',
  '#chiyuanc-active': 'Gallop the Plains: you can draw %arg cards',
  '#chiyuanc_1_active': 'Gallop the Plains',
  '#chiyuanc_2_trig': 'Gallop the Plains',
  '#chiyuanc_3_trig': 'Gallop the Plains',
  '#chiyuanc_4_targetmod': 'Gallop the Plains',
  '#chiyun-invoke': 'Blazing Current: you can give at least one hand card to another player',
  '#chiyun_1_trig': 'Blazing Current',
  '#chizhang-invoke': 'Rampant Display: you can discard at least one hand card; other players cannot use '
    + 'cards of those colors to respond',
  '#chizhang_1_trig': 'Rampant Display',
  '#chizhang_2_targetmod': 'Rampant Display',
  '#chizhang_3_trig': 'Rampant Display',
  '#chizhang_4_trig': 'Rampant Display',
  '#chizhang_5_prohibit': 'Rampant Display',
  '#chongcha-active': 'Double Difference: you can discard a card to adjust the X in "Circle Cutting" to the '
    + 'value of the next digit',
  '#chongcha_1_active': 'Double Difference',
  '#chongcha_2_maxcards': 'Double Difference',
  '#chongjian': 'Breach: use an equip card as Alcohol, or as a Slash with no distance restriction '
    + 'that ignores armor',
  '#chongjian_1_active': 'Breach',
  '#chongjian_2_trig': 'Breach',
  '#chongjian_3_trig': 'Breach',
  '#chongjian_4_targetmod': 'Breach',
  '#chonglei-prey': 'Rampart Charge: obtain a hand card from %dest',
  '#chonglei_1_trig': 'Rampart Charge',
  '#chonglei_2_trig': 'Rampart Charge',
  '#chonglei_3_filter': 'Rampart Charge',
  '#chongsi-active': 'Storm the Court: you can choose another player, then each of you chooses an option in turn',
  '#chongsi-choose': 'Storm the Court: deal 1 damage to yourself or to the player equipped with Six Dragon '
    + 'Chariot',
  '#chongsi-slash': 'Storm the Court: you can use a Slash, otherwise choose one of the remaining two options',
  '#chongsi_1_active': 'Storm the Court',
  '#choose_cards_mutlipat_skill_1_active': 'Choose Cards',
  '#choose_path': 'Choose Path',
  '#chouhai_1_trig': 'Sea of Hatred',
  '#choulue-ask': 'Stratagem: you can give %dest a card; if you do, they can convert a card',
  '#choulue-choose': 'Stratagem: make another player choose whether to give you a card',
  '#choulue_1_trig': 'Stratagem',
  '#choulue_2_trig': 'Stratagem',
  '#choumang-invoke': 'Vengeful Edge: you can choose one option',
  '#choumang_1_trig': 'Vengeful Edge',
  '#choumang_2_trig': 'Vengeful Edge',
  '#choumang_3_trig': 'Vengeful Edge',
  '#choumang_delay-choose': 'Vengeful Edge: you can obtain a card from the area of one of those players',
  '#chuhai': 'Slay the Scourge: draw a card and point fight with a player; if you win, obtain '
    + 'cards matching the card types in their hand, and this phase, after you deal damage '
    + 'to them, obtain an equip',
  '#chuhai_1_active': 'Slay the Scourge',
  '#chuhai_2_trig': 'Slay the Scourge',
  '#chuhai_3_trig': 'Slay the Scourge',
  '#chuhai_4_trig': 'Slay the Scourge',
  '#chuhai_5_trig': 'Slay the Scourge',
  '#chuifeng': 'Spearhead: you can lose 1 HP, counting as using a Duel',
  '#chuifeng_1_active': 'Spearhead',
  '#chuifeng_2_trig': 'Spearhead',
  '#connected_cards_rule': 'Discard Connected Cards',
  '#countermeausre-ask': 'Respond to \'Countermeasure\': if you and the other player choose the same, %src\'s '
    + 'countermeasure succeeds; otherwise %src fails',
  '#cuijin-ask': 'Urge the Advance: discard a card to make the %arg used by %dest deal 1 more damage? '
    + 'If it deals no damage, you draw a card and deal 1 damage to %dest.',
  '#cuijin_1_trig': 'Urge the Advance',
  '#cuijin_2_trig': 'Urge the Advance',
  '#cuijun__gongli-choice': 'Mutual Honing: add %arg triggering suits to Effortless Flow',
  '#cuijun__gongli_1_trig': 'Mutual Honing',
  '#cuizhen-choose': 'Shatter Formation: you can disable the weapon slot of up to three players!',
  '#cuizhen-invoke': 'Shatter Formation: disable the weapon slot of %dest?',
  '#cuizhen_1_trig': 'Shatter Formation',
  '#cuizhen_2_trig': 'Shatter Formation',
  '#cuizhen_3_trig': 'Shatter Formation',
  '#daigong-give': 'Blunted Assault: you must give %src a card of a different suit, otherwise this '
    + 'damage is prevented',
  '#daigong-invoke': 'Blunted Assault: you can show all your hand cards to make the damage source give you '
    + 'a card of a different suit or prevent this damage',
  '#daigong_1_trig': 'Blunted Assault',
  '#daizui_1_trig': 'Bear the Blame',
  '#daizui_2_trig': 'Bear the Blame',
  '#daming-choose': 'Mandate: choose another player. If they have %arg, they must give %dest a %arg and '
    + 'you gain 1 Mandate point; otherwise you give the %arg2 to %dest',
  '#daming-give': 'Mandate: you must give %dest a %arg',
  '#daming_1_trig': 'Mandate',
  '#daming_other': 'Mandate: you can give a card to the player who has Mandate, making them choose '
    + 'another player to give you a card of the same type',
  '#daming_other&_1_active': 'Mandate',
  '#danggu_1_trig': 'Partisan Ban',
  '#danggu_2_trig': 'Partisan Ban',
  '#danggu_3_trig': 'Partisan Ban',
  '#danggu_4_trig': 'Partisan Ban',
  '#danggu_5_trig': 'Partisan Ban',
  '#dangshi-choose': 'Sweeping Force: you can make one target player choose an option',
  '#dangshi-use': 'Sweeping Force: use a %arg on %src, or click Cancel to take 1 damage',
  '#dangshi_1_trig': 'Sweeping Force',
  '#daoji': 'Steal the Halberd: discard a non-basic card and choose a player with cards in their '
    + 'equip area, obtain one of their equips, and if it is a weapon deal damage to them',
  '#daoji-use': 'Steal the Halberd: use %arg',
  '#daoji_1_active': 'Steal the Halberd',
  '#daozhuan': 'Turn of the Way: put a card from you or %dest into the discard pile, counting as '
    + 'using a basic card',
  '#daozhuan-ask': 'Turn of the Way: put a card from you or the current turn player into the discard pile',
  '#daozhuan_1_active': 'Turn of the Way',
  '#daozhuan_self': 'Turn of the Way: put a card into the discard pile, counting as using a basic card',
  '#debao_1_trig': 'Repay with Virtue',
  '#debao_2_trig': 'Repay with Virtue',
  '#defensive_siege_engine': 'Great Siege Engine - Defense',
  '#defensive_siege_engine_skill': 'Great Siege Engine - Defense',
  '#dengli_1_trig': 'Matched Strength',
  '#dengli_2_trig': 'Matched Strength',
  '#dieyin_1_active': 'Layered Notes',
  '#difei-discard': 'Deflect Slander: discard a hand card, or click Cancel to draw a card',
  '#difei-discard-recover1': 'Deflect Slander: discard a hand card, or click Cancel to draw a card, then show all '
    + 'your hand cards and recover 1 HP',
  '#difei-discard-recover2': 'Deflect Slander: discard a hand card, or click Cancel to draw a card, then show all '
    + 'your hand cards; if none of them is a %arg card, recover 1 HP',
  '#difei_1_trig': 'Deflect Slander',
  '#dinghan_1_trig': 'Secure the Han',
  '#dinghan_2_trig': 'Secure the Han',
  '#dingyi-choice': 'Ordained Rites: choose one option to apply to all players',
  '#dingyi_1_trig': 'Ordained Rites',
  '#dingyi_2_trig': 'Ordained Rites',
  '#dingyi_3_trig': 'Ordained Rites',
  '#dingyi_4_maxcards': 'Ordained Rites',
  '#dingyi_5_atkrange': 'Ordained Rites',
  '#dingyuan': 'Feeding the Tiger Breeds Ruin',
  '#dingzhen-choose': 'Frontier Guard: you can make up to %arg players choose one',
  '#dingzhen-discard': 'Frontier Guard: discard a Slash, otherwise trick cards you use during your turn this '
    + 'round cannot target %src',
  '#dingzhen_1_trig': 'Frontier Guard',
  '#dingzhen_2_prohibit': 'Frontier Guard',
  '#dingzhou': 'Secure the Province: give another player as many cards as they have on the field, '
    + 'then obtain their cards on the field',
  '#dingzhou_1_active': 'Secure the Province',
  '#duanbi': 'Forge Currency: make every other player discard half their hand cards (rounded up), '
    + 'then you can give the discarded cards to a player!',
  '#duanbi-give': 'Forge Currency: you can give three random discarded cards to a player',
  '#duanbi_1_active': 'Forge Currency',
  '#duanjin-choose': 'Sever the Ford: you can discard a card from one of those players',
  '#duanjin_1_trig': 'Sever the Ford',
  '#duansuo': 'Break the Chains: unchain at least one player and deal 1 fire damage to each of them',
  '#duansuo_1_active': 'Break the Chains',
  '#duanyang-choose': 'Severed Harness: you can recast up to two cards in %dest\'s area',
  '#duanyang_1_trig': 'Severed Harness',
  '#duanyang_2_trig': 'Severed Harness',
  '#duanyang_3_trig': 'Severed Harness',
  '#dujin_1_trig': 'Lone Advance',
  '#dulie_1_trig': 'Steadfast Valor',
  '#duohui-give': 'Undertow: you can give %src a card; they must then give you another card of the same '
    + 'suit or make you draw a card',
  '#duohui-give_same': 'Undertow: give %dest another %arg card, otherwise they draw a card',
  '#duohui_1_trig': 'Undertow',
  '#duoji': 'Seize Ji Province: you can discard two hand cards and obtain all cards in another '
    + 'player\'s equip area!',
  '#duoji_1_active': 'Seize Ji Province',
  '#duwu': 'Warmonger: discard cards equal to a player\'s HP and deal 1 damage to them',
  '#duwu_1_active': 'Warmonger',
  '#duwu_2_trig': 'Warmonger',
  '#duwu_3_trig': 'Warmonger',
  '#duzuo-choose': 'Co-Command: you can make a player obtain a fire Slash',
  '#duzuo_1_trig': 'Co-Command',
  '#dz__bahu_1_trig': 'Overbearing',
  '#dz__bahu_2_targetmod': 'Overbearing',
  '#dz__feiyang_1_trig': 'Soaring',
  '#ex__leiji-choose': 'Lightning Strike: make a player perform a judgement; if it is ♠, you deal 2 thunder '
    + 'damage to them; if it is ♣, you recover 1 HP and deal 1 thunder damage to them',
  '#ex__leiji_1_trig': 'Lightning Strike',
  '#ex__leiji_2_trig': 'Lightning Strike',
  '#ex_eight_diagram_skill': 'Primordial Eight Diagram',
  '#ex_nioh_shield_skill': 'Nioh Vajra Shield',
  '#ex_silver_lion_skill': 'Moonlit Lion Helm',
  '#ex_vine_skill': 'Tung-Oiled Vine Armor',
  '#fangqiu-invoke': 'Full Vigor: make this "Sleeping Dragon\'s Stratagem" prediction public? the effects '
    + 'carried out after all predictions are verified are increased by 1',
  '#fangqiu_1_trig': 'Full Vigor',
  '#fangzong_1_trig': 'Fragrant Trail',
  '#fangzong_2_prohibit': 'Fragrant Trail',
  '#feijing': 'Flying Path: you can use or play a damage trick card as a Slash',
  '#feijing-choose': 'Flying Path: you can choose a colour, and the players who discarded a card of that '
    + 'colour become extra targets of the Slash',
  '#feijing-choosePath': 'Flying Path: choose a path between you and %dest',
  '#feijing-display': 'Flying Path: choose a hand card to show and discard',
  '#feijing_1_active': 'Flying Path',
  '#feijing_2_trig': 'Flying Path',
  '#feili-discard': 'Estrangement: discard two cards to prevent this damage',
  '#feili-invoke': 'Estrangement: discard a \'Calumny\' mark or two cards to prevent the damage you take?',
  '#feili_1_trig': 'Slander and Discord',
  '#fengjie-choose': 'Uphold Integrity: choose a player; in every Finish phase you adjust your hand to '
    + 'match their HP',
  '#fengjie_1_trig': 'Uphold Integrity',
  '#fengjie_2_trig': 'Uphold Integrity',
  '#fentao-discard': 'Burning Tide: discard %arg cards, or cancel to make the damage in this chain '
    + 'transmission +1 instead',
  '#fentao_1_trig': 'Burning Tide',
  '#fentao_2_trig': 'Burning Tide',
  '#fentao_3_trig': 'Burning Tide',
  '#fenyin_1_trig': 'Rousing Voice',
  '#fenyin_2_trig': 'Rousing Voice',
  '#friend__manjuan-invoke': 'Sweeping Scrolls: you can put those cards on top of the draw pile and obtain the '
    + 'same number of cards of a different type',
  '#friend__manjuan_1_trig': 'Sweeping Scrolls',
  '#friend__yangming-use': 'Cultivate Fame: you can use any number of those cards, all of different suits',
  '#friend__yangming_1_trig': 'Cultivate Fame',
  '#fubi': 'Right Hand: change one player\'s Ordained Rites effect, or discard a card to double '
    + 'one player\'s Ordained Rites effect until the start of your next turn',
  '#fubi-choice': 'Right Hand: choose the new Ordained Rites effect for %dest',
  '#fubi_1_active': 'Right Hand',
  '#fubi_2_trig': 'Right Hand',
  '#fuhai_1_trig': 'Overturn the Sea',
  '#fuhai_2_trig': 'Overturn the Sea',
  '#fujiy': 'Talisman Aid: show up to %arg cards and give them to that many other players; these '
    + 'cards gain extra effects when used',
  '#fujiy-give': 'Talisman Aid: give these cards to other players',
  '#fujiy_1_active': 'Talisman Aid',
  '#fujiy_2_trig': 'Talisman Aid',
  '#fujiy_3_trig': 'Talisman Aid',
  '#fujiy_4_trig': 'Talisman Aid',
  '#fujiy_5_trig': 'Talisman Aid',
  '#fuman': 'Pacify the Tribes: give a Slash to a player; when they use that Slash you draw a card',
  '#fuman_1_active': 'Pacify the Tribes',
  '#fuman_2_trig': 'Pacify the Tribes',
  '#fuman_3_trig': 'Pacify the Tribes',
  '#fuman_4_trig': 'Pacify the Tribes',
  '#fuqian': 'Peerless Valor for a Dying Han',
  '#futu-protect': 'Pagoda: you can remove a Karma to prevent this damage',
  '#futu_1_trig': 'Pagoda',
  '#futu_2_trig': 'Pagoda',
  '#fuyu1-invoke': 'Desperate Stand: you can point fight with %dest; if you win, this card resolves one '
    + 'extra time; if you do not win, this card has no effect',
  '#fuyu2-invoke': 'Desperate Stand: you can point fight with %dest; if they win, this card resolves one '
    + 'extra time; if they do not win, this card has no effect',
  '#fuyu_1_trig': 'Cornered Stand',
  '#fuyu_2_trig': 'Cornered Stand',
  '#gaigong-choose': 'Public Spirit: you can show up to two hand cards of yours or theirs and swap them '
    + 'with the same number of cards from the bottom of the draw pile',
  '#gaigong-use': 'Public Spirit: you can use one of those cards',
  '#gaigong_1_trig': 'Public Spirit',
  '#gaigong_2_trig': 'Public Spirit',
  '#ganggeng': 'Blunt Integrity: give at least two hand cards to a player; at the end of the turn '
    + 'the effect depends on whether they have the most hand cards',
  '#ganggeng_1_active': 'Blunt Integrity',
  '#ganggeng_2_trig': 'Blunt Integrity',
  '#ganjue': 'Bold Resolve: use a card from your equip area as a Slash with no distance or use '
    + 'limit; if the target has no hand card of the same colour, they cannot respond to it',
  '#ganjue_1_active': 'Bold Resolve',
  '#ganjue_2_targetmod': 'Bold Resolve',
  '#ganjue_3_trig': 'Bold Resolve',
  '#gaoyuan-choose': 'Call for Aid: you can discard a card to transfer this Slash to another player with a '
    + 'Candid Recommendation mark',
  '#gaoyuan-invoke': 'Call for Aid: you can discard a card to transfer this Slash to %src',
  '#gaoyuan_1_trig': 'Call for Aid',
  '#gebo_1_trig': 'Arms and Silk',
  '#global_slash_targetmod_1_targetmod': 'global_slash_targetmod',
  '#godguojia': 'Wondrous Aide of Star and Moon',
  '#godhuatuo': 'Hanging the Gourd, Healing the World',
  '#godlusu': 'The Deng Yu Who Raised Wu',
  '#godsunce': 'Ghost Hero Astride the River',
  '#godtaishici': 'Righteous Faith, Heavenly Valor',
  '#godxunyu': 'Piercing Insight, Prescient Mind',
  '#gonghuan_1_trig': 'Shared Peril',
  '#gongmou-choose': 'Joint Scheme: exchange hand cards with a player, gaining "Wondrous Plan" this turn '
    + 'while they gain "See Through" this turn',
  '#gongmou_1_trig': 'Joint Scheme',
  '#gongsunkang': 'Soaring Dragon of the Boiling Stream',
  '#guansha_1_trig': 'Poured Sand',
  '#guansuo': 'Dashing Lone Knight-Errant',
  '#guanzong': 'Pampering: choose two players, the first <font color=\'red\'>counts as</font> dealing '
    + '1 damage to the second',
  '#guanzong_1_active': 'Pampering',
  '#guiming_1_targetmod': 'Submission of Fate',
  '#guimou-choose': 'Cunning Scheme: choose one option, and at your next Prepare phase the player with '
    + 'the lowest value for it is punished',
  '#guimou-give': 'Cunning Scheme: give %arg to another player',
  '#guimou-invoke': 'Cunning Scheme: choose one of those players to view their hand cards, and you can '
    + 'choose one of those cards to give away or discard',
  '#guimou-view': 'You are currently viewing the hand cards of %dest',
  '#guimou_1_trig': 'Cunning Scheme',
  '#guimou_2_trig': 'Cunning Scheme',
  '#guimou_3_trig': 'Cunning Scheme',
  '#guimou_4_trig': 'Cunning Scheme',
  '#guimou_5_trig': 'Cunning Scheme',
  '#guimou_6_trig': 'Cunning Scheme',
  '#guli': 'Lone Fury: you can use all your hand cards as one Slash that ignores armor',
  '#guli-invoke': 'Lone Fury: you can lose 1 HP to draw hand cards up to your max HP',
  '#guli_1_active': 'Lone Fury',
  '#guli_2_targetmod': 'Lone Fury',
  '#guli_3_trig': 'Lone Fury',
  '#gushe': 'Wagging Tongue: you can start a point fight with up to three players at the same time',
  '#gushe-discard': 'Wagging Tongue: you must discard a card, otherwise %dest draws a card',
  '#gushe_1_active': 'Wagging Tongue',
  '#guying-invoke': 'Fortify Camp: choose an option for %src to carry out',
  '#guying-use': 'Fortify Camp: use %arg',
  '#guying_1_trig': 'Fortify Camp',
  '#guying_2_trig': 'Fortify Camp',
  '#hannan': 'Ward Off Peril: start a point fight with a player, and the player who wins deals 1 '
    + 'damage to the player who does not win!',
  '#hannan_1_active': 'Ward Off Peril',
  '#heji-use': 'Joint Strike: you can use a Slash or a Duel from your hand against %dest',
  '#heji_1_trig': 'Joint Strike',
  '#heji_2_trig': 'Joint Strike',
  '#heng-jink': 'Constancy: it counts as using or playing a Dodge',
  '#heng-slash': 'Constancy: it counts as using or playing a Slash with no limit on the number of uses',
  '#hengwei-give': 'Overbearing Might: show and give a hand card to %src, or this damage +1',
  '#hengwei_1_trig': 'Overbearing Might',
  '#hengwei_2_trig': 'Overbearing Might',
  '#hengwei_3_prohibit': 'Overbearing Might',
  '#hongyi-active': 'Grand Decorum: choose another player; when they deal damage they judge, red lets the '
    + 'damaged player draw, black reduces the damage by 1',
  '#hongyi_1_active': 'Grand Decorum',
  '#hongyi_2_trig': 'Grand Decorum',
  '#hongyi_3_trig': 'Grand Decorum',
  '#hongyic-choice': 'Great Resolve: choose one option, and carry out the other in the Finish phase',
  '#hongyic_1_trig': 'Great Resolve',
  '#hongyic_2_trig': 'Great Resolve',
  '#hongyic_3_trig': 'Great Resolve',
  '#hongyic_4_trig': 'Great Resolve',
  '#hongyic_5_trig': 'Great Resolve',
  '#houfeng-choice': 'Rich Stipend: choose a Rectify condition for %dest',
  '#houfeng-invoke': 'Rich Stipend: you can make %dest Rectify; if they succeed, you and they gain the '
    + 'Rectify reward',
  '#houfeng-reward': 'Rich Stipend: Rectify succeeded, you and %src both carry out the Rectify reward',
  '#houfeng_1_trig': 'Rich Stipend',
  '#houfeng_2_trig': 'Rich Stipend',
  '#huaibi_1_maxcards': 'Cherished Jade',
  '#huaizi_1_maxcards': 'With Child',
  '#huanshiz_1_active': 'Repay in Kind',
  '#huanshiz_2_trig': 'Repay in Kind',
  '#huanshiz_3_prohibit': 'Repay in Kind',
  '#huanshiz_4_trig': 'Repay in Kind',
  '#huanshiz_5_trig': 'Repay in Kind',
  '#huanshiz_active': 'Repay in Kind: you can recast an Alcohol',
  '#huantu-give': 'Patient Design: give %dest two hand cards',
  '#huantu-invoke': 'Patient Design: you can give %dest a card to make them skip their Draw phase, and '
    + 'they draw cards at the Finish phase this turn',
  '#huantu_1_trig': 'Patient Design',
  '#huantu_2_trig': 'Patient Design',
  '#hucheer': 'Night Thief of Divine Stride',
  '#huishig': 'Fading Radiance: lose 2 max HP and make one of a player\'s awaken skills count as '
    + 'meeting its condition (if they have no awaken skill, they draw four cards)',
  '#huishig-choice': 'Fading Radiance: choose one awaken skill of %dest to count as meeting its awaken condition',
  '#huishig_1_active': 'Fading Radiance',
  '#huishig_2_trig': 'Fading Radiance',
  '#huitian_1_trig': 'Turn the Heavens',
  '#huitian_2_trig': 'Turn the Heavens',
  '#huiyao': 'Doomed Brilliance: you can take 1 damage with no source and choose another player, '
    + 'who <font color=\'red\'>counts as</font> dealing the damage',
  '#huiyao-choose': 'Doomed Brilliance: choose a player; it counts as %dest dealing 1 damage to them',
  '#huiyao_1_active': 'Doomed Brilliance',
  '#hujinding': 'Bearing a Child, Begging Mercy',
  '#jiangwan': 'Upright and Imposing',
  '#jianlv-choose': 'Broad Deliberation: you can deal 1 damage to another player, then if they die, you '
    + 'carry out an extra effect',
  '#jianlv-damage': 'Broad Deliberation: choose another player and deal 1 damage to them',
  '#jianlv_1_trig': 'Broad Counsel',
  '#jianyi_1_trig': 'Plain Dress',
  '#jianyu': 'Remonstrance: choose two players; until the start of your next turn, when these '
    + 'players use cards on each other, the target draws a card',
  '#jianyu_1_active': 'Remonstrance',
  '#jianyu_2_trig': 'Remonstrance',
  '#jianyu_3_trig': 'Remonstrance',
  '#jianzhan': 'War Counsel: make a player choose to count as using a Slash on another player you '
    + 'name, or you draw a card',
  '#jianzhan-choose': 'War Counsel: choose the target of the Slash %dest counts as using',
  '#jianzhan_1_active': 'War Counsel',
  '#jibing': 'Muster Troops: you can use or play a Troop as a Slash or a Dodge',
  '#jibing-invoke': 'Muster Troops: give up drawing cards and gain two Troops instead?',
  '#jibing_1_active': 'Muster Troops',
  '#jibing_2_trig': 'Muster Troops',
  '#jichou': 'Swift Scheme: you can count as using one kind of regular trick card, then for the '
    + 'rest of this game you cannot use non-virtual cards of that name and cannot respond '
    + 'to cards of that name',
  '#jichou_1_active': 'Swift Scheme',
  '#jichou_2_prohibit': 'Swift Scheme',
  '#jichou_3_trig': 'Swift Scheme',
  '#jichou_give&_1_active': '<font color=\'grey\'>Swift Scheme [give cards]</font>',
  '#jici_1_trig': 'Provoking Words',
  '#jiebian-invoke': 'Kalpa Debate: you can start a point fight with one of those players',
  '#jiebian_1_trig': 'Kalpa Debate',
  '#jiebing-choose': 'Borrow Troops: choose a player and obtain a random card from them',
  '#jiebing-use': 'Borrow Troops: use %arg',
  '#jiebing_1_trig': 'Borrow Troops',
  '#jiejianw-give': 'Loyal Remonstrance: give any number of hand cards to a player; they gain the Loyal '
    + 'Remonstrance mark',
  '#jiejianw-invoke': 'Loyal Remonstrance: transfer the %arg used on %dest to you and draw a card?',
  '#jiejianw_1_trig': 'Loyal Remonstrance',
  '#jiejianw_2_trig': 'Loyal Remonstrance',
  '#jiejianw_3_trig': 'Loyal Remonstrance',
  '#jiejie': 'Admonition: look at your hand cards, then choose a suit; the effect depends on '
    + 'whether your hand contains that suit',
  '#jiejie&': 'Admonition: let Momentum Xin Xianying look at your hand cards, then they choose a '
    + 'suit; the effect depends on whether your hand contains that suit',
  '#jiejie&_1_active': 'Admonition',
  '#jiejie-choice': 'Admonition: choose a suit; if their hand contains it they discard their hand cards '
    + 'of the other suits, otherwise they obtain a card of that suit',
  '#jiejie_1_active': 'Admonition',
  '#jiejie_2_trig': 'Admonition',
  '#jiejie_3_targetmod': 'Admonition',
  '#jiezhu-viewas': 'Relentless Pursuit: you can discard %arg cards; it counts as using a Slash that can '
    + 'target %arg players with no distance restriction',
  '#jiezhu_1_active': 'Relentless Pursuit',
  '#jiezhu_2_targetmod': 'Relentless Pursuit',
  '#jiezhu_3_trig': 'Relentless Pursuit',
  '#jiguan_1_trig': 'Crown of Steeds',
  '#jiguan_2_maxcards': 'Crown of Steeds',
  '#jilim-choice': 'Mounting Malice: you can secretly choose one of these numbers; the effect depends on '
    + 'how it compares with the number of times %dest targets you this turn',
  '#jilim-give': 'Mounting Malice: choose %arg cards to give to %dest',
  '#jilim-slash': 'Mounting Malice: you can count this as using a Slash against %dest',
  '#jilim_1_trig': 'Mounting Malice',
  '#jilim_2_trig': 'Mounting Malice',
  '#jilun-ask': 'Shrewd Counsel: choose one',
  '#jilun_1_trig': 'Shrewd Counsel',
  '#jimi_1_trig': 'Honey Gathering',
  '#jimi_2_trig': 'Honey Gathering',
  '#jimie-choose': 'Annihilation: lose 8 Thunder marks and deal damage to one player equal to their max HP!',
  '#jimie_1_trig': 'Annihilation',
  '#jimie_2_trig': 'Annihilation',
  '#jinfan-invoke': 'Brocade Sail: you can place any number of hand cards as Bells',
  '#jinfan_1_trig': 'Brocade Sail',
  '#jinfan_2_trig': 'Brocade Sail',
  '#jinfan_3_filter': 'Brocade Sail',
  '#jinfan_active_1_active': 'Brocade Sail',
  '#jingtu': 'Pure Land: you can obtain Karma and carry out the corresponding effect',
  '#jingtu-damage': 'Pure Land: deal %arg damage to a player',
  '#jingtu-heal': 'Pure Land: make a player gain %arg max HP and recover %arg HP',
  '#jingtu_1_active': 'Pure Land',
  '#jingxie': 'Precision Craft: you can show an armor card and upgrade it',
  '#jingxie-recast': 'Precision Craft: you can recast an armor card, then restore your HP to 1',
  '#jingxie_1_active': 'Precision Craft',
  '#jingxie_2_trig': 'Precision Craft',
  '#jingzhong-choose': 'Reverence: you can choose a player and obtain the first three cards they use in '
    + 'their next Action phase',
  '#jingzhong_1_trig': 'Reverence',
  '#jingzhong_2_trig': 'Reverence',
  '#jingzhong_3_trig': 'Reverence',
  '#jinzu-active': 'Mighty Arrowhead: you can choose another player and show cards together with them',
  '#jinzu-display': 'Mighty Arrowhead: show %arg hand cards; if the number is the middle value the Slash '
    + 'gains an extra effect, if it is an extreme value the shown cards are discarded',
  '#jinzu_1_active': 'Mighty Arrowhead',
  '#jinzu_2_trig': 'Mighty Arrowhead',
  '#jinzu_3_trig': 'Mighty Arrowhead',
  '#jiren-active': 'Rousing Blade: you can make all players unable to choose themselves as a target when '
    + 'using non-weapon cards for the rest of the game',
  '#jiren_1_active': 'Rousing Blade',
  '#jiren_2_prohibit': 'Rousing Blade',
  '#jishi_1_trig': 'Heal the World',
  '#jishi_2_trig': 'Heal the World',
  '#jiwei-choice': 'Aid in Peril: choose a color, then distribute your hand cards of that color to other '
    + 'players',
  '#jiwei-give': 'Aid in Peril: distribute your %arg hand cards to other players',
  '#jiwei_1_trig': 'Aid in Peril',
  '#jiwei_2_trig': 'Aid in Peril',
  '#jixiy_1_trig': 'Covet the Seal',
  '#jiyul': 'Urgent Defense: discard a hand card and obtain one random card of each type '
    + 'different from it',
  '#jiyul_1_active': 'Urgent Defense',
  '#jiyul_2_trig': 'Urgent Defense',
  '#juejin_1_active': 'Resolute Advance',
  '#juejin_2_trig': 'Resolute Advance',
  '#jueyong-choose': 'Peerless Valor: choose the secondary targets of the %arg used on %dest',
  '#jueyong_1_trig': 'Peerless Valor',
  '#jueyong_2_trig': 'Peerless Valor',
  '#jueyong_3_trig': 'Peerless Valor',
  '#juezhi': 'Order of Rank: discard at least two cards and obtain a card whose number is the '
    + 'remainder of the sum of the discarded cards\' numbers divided by 13',
  '#juezhi-active': 'Decisive Halt: you can draw a card and carry out the option you chose',
  '#juezhi_1_active': 'Order of Rank',
  '#juezhig_1_active': 'Decisive Halt',
  '#juguz-invoke': 'Lone Stand: you can draw two cards, then discard %arg card(s)',
  '#juguz_1_trig': 'Lone Stand',
  '#juliao_1_distance': 'Hold Liaodong',
  '#jungong': 'Severe Assault: you can carry out one option, and it counts as using a Slash with no '
    + 'distance restriction and no limit on the number of uses',
  '#jungong_1_active': 'Severe Assault',
  '#jungong_2_trig': 'Severe Assault',
  '#jungong_3_targetmod': 'Severe Assault',
  '#junkui_1_trig': 'Peerless Steed',
  '#junkui_2_targetmod': 'Peerless Steed',
  '#jutu-put': 'Hold the Land: place %arg cards as Life',
  '#jutu_1_trig': 'Hold the Land',
  '#juxiangz-invoke': 'Refuse Surrender: you can deal 1 damage to %dest!',
  '#juxiangz_1_trig': 'Refuse Surrender',
  '#kaiji-choose': 'Found and Sustain: make up to %arg players each draw a card',
  '#kaiji_1_trig': 'Found and Sustain',
  '#kechang_1_trig': 'Prosperity',
  '#kechang_2_targetmod': 'Prosperity',
  '#kouluet_1_trig': 'Plunder',
  '#kouluet_2_maxcards': 'Plunder',
  '#kouluet_3_filter': 'Plunder',
  '#kuangli_1_trig': 'Savage Frenzy',
  '#kuangli_2_trig': 'Savage Frenzy',
  '#kuangwu-discard': 'Boastful Valor: you can discard %arg hand cards to count as using a Duel against %dest',
  '#kuangwu-draw': 'Boastful Valor: you can draw up to %arg hand cards to count as using a Duel against %dest',
  '#kuangwu_1_trig': 'Boastful Valor',
  '#kubai_1_trig': 'Withered Pallor',
  '#kubai_2_trig': 'Withered Pallor',
  '#kubai_3_prohibit': 'Withered Pallor',
  '#kuili_1_trig': 'Rout',
  '#kujian-active': 'You can use Bitter Counsel: mark up to two hand cards as Counsel and give them to '
    + 'another player',
  '#kujian-discard': 'Bitter Counsel: discard a card',
  '#kujian_1_active': 'Bitter Counsel',
  '#kujian_2_trig': 'Bitter Counsel',
  '#kujian_3_trig': 'Bitter Counsel',
  '#kujian_4_trig': 'Bitter Counsel',
  '#kujian_5_trig': 'Bitter Counsel',
  '#kujian_6_trig': 'Bitter Counsel',
  '#kujian_7_trig': 'Bitter Counsel',
  '#laimin': 'Perverse Rot, Unruly Crowd',
  '#laishou_1_trig': 'Longevity',
  '#laishou_2_trig': 'Longevity',
  '#lianxi-use': 'Chain Raid: you can count as using a Slash with no distance restriction and no limit '
    + 'on the number of uses',
  '#lianxi_1_trig': 'Chain Raid',
  '#lianxi_2_maxcards': 'Chain Raid',
  '#lianzhant-slash': 'Chain Slaughter: you can use a Slash with a number greater than %arg against %dest '
    + 'and draw a card',
  '#lianzhant_1_trig': 'Chain Slaughter',
  '#lianzhant_2_trig': 'Chain Slaughter',
  '#liaoyi-choose': 'Cure Plague: obtain %arg cards from the Benevolence area',
  '#liaoyi-put': 'Cure Plague: you must put %arg hand cards into the Benevolence area',
  '#liaoyi1-invoke': 'Plague Remedy: you can make %dest gain %arg Benevolence',
  '#liaoyi2-invoke': 'Plague Remedy: you can make %dest put %arg hand cards into their Benevolence area',
  '#liaoyi_1_trig': 'Cure Plague',
  '#lidian__heyu_1_trig': 'Joint Defense',
  '#lidian__heyu_2_trig': 'Joint Defense',
  '#liezhi-choose': 'Stern Integrity: discard one card from the areas of up to two other players',
  '#liezhi_1_trig': 'Stern Integrity',
  '#liezhi_2_trig': 'Stern Integrity',
  '#liezhi_3_trig': 'Stern Integrity',
  '#liezhiz': 'Fierce Resolve: reduce your max HP by 1, and it counts as using a Peach or an Alcohol',
  '#liezhiz_1_active': 'Fierce Resolve',
  '#liezhiz_2_targetmod': 'Fierce Resolve',
  '#lifeng': 'Governor of Zhuti',
  '#lingcao': 'Forward Against the Torrent',
  '#lingce_1_trig': 'Inspired Scheme',
  '#lingfa-discard': 'Rule of Law: discard a card, otherwise take 1 damage dealt by %dest',
  '#lingfa-give': 'Rule of Law: give %dest a card, otherwise take 1 damage dealt by them',
  '#lingfa-invokeOne': 'Rule of Law: you can make other players discard a card when they use a Slash this '
    + 'round, otherwise they take damage',
  '#lingfa-invokeTwo': 'Rule of Law: you can make other players give you a card when they use a Peach this '
    + 'round, otherwise they take damage',
  '#lingfa_1_trig': 'Rule of Law',
  '#lingfa_2_trig': 'Rule of Law',
  '#lingfa_3_trig': 'Rule of Law',
  '#liubing_1_trig': 'Stray Troops',
  '#liubing_2_trig': 'Stray Troops',
  '#liuzan': 'Roar to the Heavens',
  '#liuzhang': 'Half Jade in Shadow',
  '#lixia_1_trig': 'Deference',
  '#lixia_2_distance': 'Deference',
  '#liyong_1_trig': 'Fierce Valor',
  '#liyong_2_trig': 'Fierce Valor',
  '#liyong_3_trig': 'Fierce Valor',
  '#liyong_4_trig': 'Fierce Valor',
  '#lizhaojiaobo': 'Utmost Sincerity, Utmost Duty',
  '#longyuan_1_trig': 'Dragon Abyss',
  '#luanchou': 'Phoenix Pair: make two players gain the Marriage mark and gain the skill Shared Peril',
  '#luanchou_1_active': 'Phoenix Pair',
  '#luanqun': 'Rabble Rouser: make all players show a hand card; you can obtain one of them with '
    + 'the same color as the card you showed',
  '#luanqun-card': 'Rabble Rouser: show a hand card',
  '#luanqun-get': 'Rabble Rouser: you can obtain up to %arg of those cards',
  '#luanqun_1_active': 'Rabble Rouser',
  '#luanqun_2_trig': 'Rabble Rouser',
  '#luanqun_3_trig': 'Rabble Rouser',
  '#luanqun_4_prohibit': 'Rabble Rouser',
  '#luezhen-display': 'Sweep the Ranks: show %arg hand cards, or it counts as %src using a Slash on you',
  '#luezhen-invoke': 'Sweep the Ranks: you can make all other players choose in turn to show hand cards or '
    + 'to have you count as using a Slash on them',
  '#luezhen_1_trig': 'Sweep the Ranks',
  '#lulian-choose': 'Serial Slaughter: deal 1 fire damage to a player whose HP is not the lowest',
  '#lulian_1_trig': 'Serial Slaughter',
  '#lunxiong-invoke': 'Measure of Heroes: you can discard the hand card with the unique highest number (at '
    + 'least %arg), then draw three cards',
  '#lunxiong_1_trig': 'Measure of Heroes',
  '#lunxiong_2_trig': 'Measure of Heroes',
  '#luotong': 'Toiling Minister of State',
  '#m_ex__anguo-choose': 'Steady the State: choose a player to gain the Steady the State mark',
  '#m_ex__anguo-move': 'Steady the State: you can move the Steady the State mark on %dest to another player',
  '#m_ex__anguo_1_trig': 'Steady the State',
  '#m_ex__anguo_2_trig': 'Steady the State',
  '#m_ex__anguo_3_trig': 'Steady the State',
  '#m_ex__anguo_4_trig': 'Steady the State',
  '#m_ex__anguo_5_maxcards': 'Steady the State',
  '#m_ex__anjian-choice': 'Hidden Arrow: make %dest unable to respond to this Slash, or increase the damage '
    + 'they take from this Slash by 1',
  '#m_ex__anjian_1_trig': 'Hidden Arrow',
  '#m_ex__anxu-active': 'Consolation: choose two other players; the first one chosen obtains a card from the '
    + 'second one chosen',
  '#m_ex__anxu-draw': 'Consolation: make %dest draw a card?',
  '#m_ex__anxu_1_active': 'Comfort',
  '#m_ex__beige_1_trig': 'Sad Song',
  '#m_ex__benxi-choose': 'Swift Raid: you can choose up to %arg2 additional targets at distance 1 for this %arg',
  '#m_ex__benxi-discard': 'Swift Raid: discard several cards; the first card you use this phase can choose that '
    + 'many additional targets',
  '#m_ex__benxi_1_trig': 'Swift Raid',
  '#m_ex__benxi_2_trig': 'Swift Raid',
  '#m_ex__benxi_3_trig': 'Swift Raid',
  '#m_ex__benxi_4_trig': 'Swift Raid',
  '#m_ex__benxi_5_distance': 'Swift Raid',
  '#m_ex__benxi_delay': 'Swift Raid',
  '#m_ex__bingyi-choose': 'Hold to One: choose up to %arg players to each draw a card',
  '#m_ex__bingyi_1_trig': 'Hold to One',
  '#m_ex__bulianshi': 'The Uncrowned Empress',
  '#m_ex__caifuren': 'Rushes of the Xiang River',
  '#m_ex__caiwenji': 'Orphan in a Foreign Land',
  '#m_ex__caopi': 'Heir to the Hegemony',
  '#m_ex__caozhang': 'The Yellow-Bearded Lad',
  '#m_ex__caozhen': 'Grand Commander of the Realm',
  '#m_ex__caozhi': 'Talent of Eight Measures',
  '#m_ex__chengpu': 'Tiger Vassal of Three Reigns',
  '#m_ex__chenqun': 'Model Minister for the Ages',
  '#m_ex__dangxian_1_trig': 'Vanguard',
  '#m_ex__danshou-discard': 'Valiant Guard: you can discard %arg cards to deal 1 damage to %dest',
  '#m_ex__danshou_1_trig': 'Valiant Guard',
  '#m_ex__danshou_2_trig': 'Valiant Guard',
  '#m_ex__dengai': 'The Resolute Stalwart',
  '#m_ex__dianwei': 'The Elai of Old',
  '#m_ex__dingpin-active': 'Grading: choose 1 card to discard (it cannot be a type you have used or discarded '
    + 'this turn) and choose 1 player',
  '#m_ex__dingpin_1_active': 'Set the Rank',
  '#m_ex__dingpin_2_trig': 'Set the Rank',
  '#m_ex__dingpin_3_trig': 'Set the Rank',
  '#m_ex__duanliang': 'Cut Supply: you can use a black non-trick card as Supply Shortage',
  '#m_ex__duanliang_1_active': 'Cut Supply',
  '#m_ex__duanliang_2_targetmod': 'Cut Supply',
  '#m_ex__duodao-invoke': 'Seize the Blade: you can obtain the weapon card in %dest\'s equip area',
  '#m_ex__duodao_1_trig': 'Seize the Blade',
  '#m_ex__fangquan_1_trig': 'Delegation',
  '#m_ex__fangquan_2_trig': 'Delegation',
  '#m_ex__fangquan_3_maxcards': 'Delegation',
  '#m_ex__fangzhu-ask': 'Banishment: discard %arg cards and lose 1 HP, or click Cancel to draw %arg cards and '
    + 'turn your character card over',
  '#m_ex__fangzhu-choose': 'Banishment: make a player choose to draw %arg cards and turn their character card '
    + 'over, or to discard %arg cards and lose 1 HP',
  '#m_ex__fangzhu_1_trig': 'Exile',
  '#m_ex__fenji-invoke': 'Agitation: make %dest draw two cards and lose 1 HP yourself?',
  '#m_ex__fenji_1_trig': 'Rouse',
  '#m_ex__fuhuanghou': 'All on a Single Throw',
  '#m_ex__fuli_1_trig': 'Old Steed',
  '#m_ex__ganlu-active': 'Sweet Dew: make two players whose difference in the number of cards in their equip '
    + 'areas is no greater than %arg swap the cards in their equip areas; if you choose '
    + 'yourself there is no such restriction',
  '#m_ex__ganlu_1_active': 'Sweet Dew',
  '#m_ex__gaoshun': 'No Fortress Unbroken',
  '#m_ex__gongqi': 'Horse Archery: you can discard a non-basic card to discard a card from another player',
  '#m_ex__gongqi_1_active': 'Horse Archery',
  '#m_ex__gongqi_2_atkrange': 'Horse Archery',
  '#m_ex__gongsunzan': 'The White Horse General',
  '#m_ex__guhuo': 'Bewitch: place a hand card face down and declare a basic card or ordinary trick '
    + 'card; if nobody challenges, use or play it as that card name',
  '#m_ex__guhuo_1_active': 'Bewitch',
  '#m_ex__guyong': 'Memorials of Loyal Counsel',
  '#m_ex__handang': 'Desperate Stand at Nan Commandery',
  '#m_ex__huatuo': 'Divine Physician',
  '#m_ex__hunzi_1_trig': 'Soul Stance',
  '#m_ex__huoji': 'Fire Scheme: you can use a red card as Fire Attack',
  '#m_ex__huoji_1_active': 'Fire Stratagem',
  '#m_ex__jianchu_1_trig': 'Quiver Draw',
  '#m_ex__jiangchi-invoke': 'Charge: you can draw a card and use no Slash this phase; or discard a chosen card '
    + 'and use one extra Slash this phase',
  '#m_ex__jiangchi_1_trig': 'Charge',
  '#m_ex__jiangchi_2_targetmod': 'Charge',
  '#m_ex__jiangchi_3_prohibit': 'Charge',
  '#m_ex__jiangwei': 'The Dragon\'s Mantle',
  '#m_ex__jianying-active': 'Gradual Design: convert a card into any basic card and use it',
  '#m_ex__jianying_1_active': 'Gradual Design',
  '#m_ex__jianying_2_trig': 'Gradual Design',
  '#m_ex__jianying_3_trig': 'Gradual Design',
  '#m_ex__jianying_trigger': 'Gradual Design',
  '#m_ex__jianyong': 'Leisurely Wit, Free Discourse',
  '#m_ex__jiaojin-discard': 'Haughtiness: you can discard an equip card to prevent this damage',
  '#m_ex__jiaojin_1_trig': 'Haughtiness',
  '#m_ex__jieming-choose': 'Devotion: make a player draw two cards, then if their hand card count is less than '
    + 'their max HP, you draw a card',
  '#m_ex__jieming_1_trig': 'Integrity',
  '#m_ex__jieyue-choose': 'Token of Command: you can choose a card to give to another player',
  '#m_ex__jieyue-select': 'Token of Command: choose one hand card and one card in your equip area to keep and '
    + 'discard the rest, or click cancel to make %src draw three cards',
  '#m_ex__jieyue_1_trig': 'Token of Command',
  '#m_ex__jieyue_active_1_active': 'Token of Command',
  '#m_ex__jiezi_1_trig': 'Intercept Supplies',
  '#m_ex__jinjiu_1_trig': 'Prohibition',
  '#m_ex__jinjiu_2_filter': 'Prohibition',
  '#m_ex__jinjiu_3_prohibit': 'Prohibition',
  '#m_ex__jinjiu_trigger': 'Prohibition',
  '#m_ex__jiushi-active': 'Wine Poem: you can turn your character card over to count as using an Alcohol',
  '#m_ex__jiushi-turnover': 'Wine Poem: turn your character card face up again?',
  '#m_ex__jiushi_1_active': 'Wine Poetry',
  '#m_ex__jiushi_2_trig': 'Wine Poetry',
  '#m_ex__jiushi_3_trig': 'Wine Poetry',
  '#m_ex__juece-choose': 'Ruthless Scheme: choose another player who has lost cards this turn and deal 1 '
    + 'damage to them',
  '#m_ex__juece_1_trig': 'Decisive Stratagem',
  '#m_ex__junxing-active': 'Use Harsh Punishment: choose any number of hand cards to discard and choose another player',
  '#m_ex__junxing-discard': 'Harsh Punishment: discard %arg cards and lose 1 HP, or click Cancel to turn your '
    + 'character card over and draw %arg cards',
  '#m_ex__junxing_1_active': 'Harsh Punishment',
  '#m_ex__jvshou': 'Army Overseer, Planner of the State',
  '#m_ex__kanpo': 'Insight: you can use a black card as Nullification',
  '#m_ex__kanpo_1_active': 'See Through',
  '#m_ex__kongsheng-invoke': 'Harp Song: you can place any number of %dest\'s cards as Harp',
  '#m_ex__kongsheng-use': 'Harp Song: you can use one of the Harp cards, and %dest obtains the rest',
  '#m_ex__kongsheng_1_trig': 'Harp Song',
  '#m_ex__kongsheng_2_trig': 'Harp Song',
  '#m_ex__kongsheng_3_trig': 'Harp Song',
  '#m_ex__kongsheng_4_trig': 'Harp Song',
  '#m_ex__liangyin-discard': 'Auspicious Match: you can make a player discard a card',
  '#m_ex__liangyin-drawcard': 'Auspicious Match: you can make a player draw a card',
  '#m_ex__liangyin-hp': 'Auspicious Match: you can make the target player recover or lose 1 HP',
  '#m_ex__liangyin_1_trig': 'Auspicious Match',
  '#m_ex__liangyin_2_trig': 'Auspicious Match',
  '#m_ex__lianhuan': 'Chain: you can use or recast a ♣ hand card as Iron Chain',
  '#m_ex__lianhuan-choose': 'Chain: you can designate one additional target for %arg',
  '#m_ex__lianhuan_1_active': 'Chain',
  '#m_ex__lianhuan_2_trig': 'Chain',
  '#m_ex__liaohua': 'Through All the Vicissitudes',
  '#m_ex__lihuo-invoke': 'Plague Fire: change %arg into a fire Slash?',
  '#m_ex__lihuo_1_trig': 'Fever Fire',
  '#m_ex__lihuo_2_trig': 'Fever Fire',
  '#m_ex__lingtong': 'Bold Heart, Fierce Courage',
  '#m_ex__liru': 'The Demon Retainer',
  '#m_ex__liubiao': 'Bestriding the Lands South of the Han',
  '#m_ex__liushan': 'The Idle Lord of True Destiny',
  '#m_ex__luanji': 'Wild Assault: use two hand cards as Archery Attack; you cannot use a suit already '
    + 'used this phase',
  '#m_ex__luanji_1_active': 'Wild Volley',
  '#m_ex__luanji_2_trig': 'Wild Volley',
  '#m_ex__luanji_3_trig': 'Wild Volley',
  '#m_ex__manchong': 'Statutes and Stratagems',
  '#m_ex__mieji-active': 'Plot Breaker: choose a black trick card to place on top of the draw pile, and choose '
    + 'another player',
  '#m_ex__mieji-choice': 'Plot Breaker: choose to give %src a trick card, or to discard two non-trick cards '
    + 'one at a time',
  '#m_ex__mieji-discard': 'Plot Breaker: choose one more non-trick card to discard',
  '#m_ex__mieji_1_active': 'Scheme Breaker',
  '#m_ex__niepan': 'Nirvana: do you want to discard all the cards in your areas, draw three cards, heal '
    + 'your HP up to 3 and restore your character card?',
  '#m_ex__niepan_1_active': 'Nirvana',
  '#m_ex__niepan_2_trig': 'Nirvana',
  '#m_ex__paiyi-active': 'Rejection: choose a Power card to put into the discard pile and choose a player to '
    + 'draw two cards',
  '#m_ex__paiyi_1_active': 'Rejection',
  '#m_ex__pangde': 'The Integrity of Zhou Ke',
  '#m_ex__pangtong': 'Fledgling Phoenix',
  '#m_ex__panzhangmazhong': 'Capture the Dragon, Subdue the Tiger',
  '#m_ex__pingkou-choose': 'Bandit Purge: you can deal 1 damage to each of up to %arg players, then randomly '
    + 'obtain 1 equip card',
  '#m_ex__pingkou_1_trig': 'Quell Bandits',
  '#m_ex__pojun-invoke': 'Army Breaker: place up to %arg of %dest\'s cards face down until the end of the turn?',
  '#m_ex__pojun_1_trig': 'Army Breaker',
  '#m_ex__pojun_2_trig': 'Army Breaker',
  '#m_ex__pojun_3_trig': 'Army Breaker',
  '#m_ex__qiangxi': 'Strong Assault: discard a weapon card, or click OK to lose 1 HP, then deal 1 damage '
    + 'to a player in your ATK range not yet chosen this phase',
  '#m_ex__qiangxi_1_active': 'Strong Assault',
  '#m_ex__qiaoshui-active': 'Silver Tongue: choose 1 other player and start a point fight with them',
  '#m_ex__qiaoshui-choose': 'Silver Tongue: you can add or remove 1 target for the %arg you are using',
  '#m_ex__qiaoshui_1_active': 'Silver Tongue',
  '#m_ex__qiaoshui_2_trig': 'Silver Tongue',
  '#m_ex__qiaoshui_3_prohibit': 'Silver Tongue',
  '#m_ex__qieting_1_trig': 'Eavesdrop',
  '#m_ex__qimou': 'Ingenious Scheme: lose any amount of HP; this turn your distance to other players is '
    + 'reduced by that much and you can use that many extra Slashes',
  '#m_ex__qimou_1_active': 'Ingenious Scheme',
  '#m_ex__qimou_2_targetmod': 'Ingenious Scheme',
  '#m_ex__qimou_3_distance': 'Ingenious Scheme',
  '#m_ex__qingjian-ask': 'Pure Thrift: you can place any number of hand cards face down as Pure Thrift cards, '
    + 'and distribute these cards to other players in your Finish phase',
  '#m_ex__qingjian_1_trig': 'Frugality',
  '#m_ex__qingjian_2_trig': 'Frugality',
  '#m_ex__qingnang': 'Green Salve: discard a hand card to make a player recover 1 HP; if the discarded '
    + 'card was red you can use it again',
  '#m_ex__qingnang-invoke': 'Green Salve: you can use Green Salve again on a player not yet chosen this phase',
  '#m_ex__qingnang_1_active': 'Green Salve',
  '#m_ex__qiuyuan-choose': 'Call for Aid: make another player give you a basic card other than Slash, or they '
    + 'also become a target of this Slash',
  '#m_ex__qiuyuan-give': 'Call for Aid: give %dest a basic card other than Slash, or become an extra target of '
    + 'this Slash',
  '#m_ex__qiuyuan_1_trig': 'Call for Aid',
  '#m_ex__quancong': 'Courting Power, Glorifying the Clan',
  '#m_ex__quanji-push': 'Power Scheme: choose 1 hand card to place on your character card as Power',
  '#m_ex__quanji_1_trig': 'Power Scheme',
  '#m_ex__quanji_2_trig': 'Power Scheme',
  '#m_ex__quanji_3_maxcards': 'Power Scheme',
  '#m_ex__shenxing': 'Prudence: you can discard two cards and draw a card, plus one more if the discarded '
    + 'cards are different colors',
  '#m_ex__shenxing_1_active': 'Prudence',
  '#m_ex__shuangxiong-get': 'Twin Heroes: obtain one of these cards; this turn you can use hand cards of a '
    + 'different colour as Duel',
  '#m_ex__shuangxiong-invoke': 'Twin Heroes: give up drawing cards and instead reveal the top two cards of the draw '
    + 'pile and obtain one of them?',
  '#m_ex__shuangxiong-prey': 'Twin Heroes: obtain the Slash the other player played?',
  '#m_ex__shuangxiong_1_active': 'Twin Heroes',
  '#m_ex__shuangxiong_2_trig': 'Twin Heroes',
  '#m_ex__shuangxiong_3_trig': 'Twin Heroes',
  '#m_ex__sidi-choice': 'Mark the Foe: choose to cancel the %arg used by %dest, or to draw two cards',
  '#m_ex__sidi-choose': 'You can use Mark the Foe: choose a player and name a Mark the Foe target for them',
  '#m_ex__sidi-choose2': 'Mark the Foe: name a Mark the Foe target for %dest; if it is correct, you can '
    + 'trigger the matching effect',
  '#m_ex__sidi_1_trig': 'Mark the Foe',
  '#m_ex__sidi_2_trig': 'Mark the Foe',
  '#m_ex__sunce': 'The Little Conqueror of Jiangdong',
  '#m_ex__sunjian': 'Emperor Wulie',
  '#m_ex__sunluban': 'Accomplice to the Tiger',
  '#m_ex__sunxiu': 'Lord Jing of the Early Grave',
  '#m_ex__tianxiang-choice': 'Heavenly Fragrance: choose an option for %dest to carry out',
  '#m_ex__tianxiang-choose': 'Heavenly Fragrance: discard a <font color=\'red\'>♥</font> hand card and choose '
    + 'another player',
  '#m_ex__tianxiang_1_trig': 'Heavenly Fragrance',
  '#m_ex__tiaoxin_1_active': 'Provoke',
  '#m_ex__tuntian_1_trig': 'Garrison Farming',
  '#m_ex__tuntian_2_trig': 'Garrison Farming',
  '#m_ex__tuntian_3_distance': 'Garrison Farming',
  '#m_ex__weiyan': 'The Bloodthirsty Lone Wolf',
  '#m_ex__wolong': 'Sleeping Dragon',
  '#m_ex__wuguotai': 'Kind Heart, Flawless Jade',
  '#m_ex__wurong': 'Soothe the Rong: hold a strategy duel with another player',
  '#m_ex__wurong-give': 'Soothe the Rong: give %dest two cards',
  '#m_ex__wurong-prey': 'Soothe the Rong: obtain a card from %dest',
  '#m_ex__wurong_1_active': 'Pacify the Tribes',
  '#m_ex__wurong_2_trig': 'Pacify the Tribes',
  '#m_ex__wuyi': 'Saddle and Bridle of Jianxing',
  '#m_ex__xiahoudun': 'The One-Eyed Rakshasa',
  '#m_ex__xianzhen-active': 'Breach Formation: choose 1 other player and start a point fight with them',
  '#m_ex__xianzhen_1_active': 'Breach Formation',
  '#m_ex__xianzhen_2_targetmod': 'Breach Formation',
  '#m_ex__xianzhen_3_prohibit': 'Breach Formation',
  '#m_ex__xianzhen_4_maxcards': 'Breach Formation',
  '#m_ex__xiaoqiao': 'The Flower of Affectation',
  '#m_ex__xingshang_1_trig': 'Mourning',
  '#m_ex__xingxue-choose': 'Promote Learning: you can make up to %arg players each draw a card and place a card '
    + 'on top of the draw pile',
  '#m_ex__xingxue-give': 'Promote Learning: choose 1 card to give to 1 target of this Promote Learning, or '
    + 'choose no target and place it on top of the draw pile',
  '#m_ex__xingxue-puttodrawpile': 'Promote Learning: choose a card to place on top of the draw pile',
  '#m_ex__xingxue_1_trig': 'Promote Learning',
  '#m_ex__xuanfeng-choose': 'Whirlwind: choose to discard 2 cards from other players, or to move 1 equip card of '
    + 'another player',
  '#m_ex__xuanfeng-discard': 'Whirlwind: you can choose a player and discard a card from them',
  '#m_ex__xuanfeng_1_trig': 'Whirlwind',
  '#m_ex__xuanfeng_2_trig': 'Whirlwind',
  '#m_ex__xuanfeng_active_1_active': 'Whirlwind',
  '#m_ex__xuhuang': 'The Air of Zhou Yafu',
  '#m_ex__xunyu': 'Talent to Aid a King',
  '#m_ex__xusheng': 'The Iron Wall of Jiangdong',
  '#m_ex__yanliangwenchou': 'Brothers of Tiger and Wolf',
  '#m_ex__yanzhu-active': 'Banquet Execution: choose 1 other player who has cards in their area',
  '#m_ex__yanzhu-choice': 'Banquet Execution: choose whether %src obtains one card from your area, or %src '
    + 'obtains all cards in your equip area and loses Banquet Execution',
  '#m_ex__yanzhu_1_active': 'Banquet Execution',
  '#m_ex__yaoming': 'Chasing Fame: discard a card from a player or make them draw a card',
  '#m_ex__yaoming_1_active': 'Chasing Fame',
  '#m_ex__yaoming_2_trig': 'Chasing Fame',
  '#m_ex__yaoming_3_trig': 'Chasing Fame',
  '#m_ex__yicong_1_distance': 'Loyal Followers',
  '#m_ex__yongsi-discard': 'Wanton Excess: you must discard a card, or lose 1 HP',
  '#m_ex__yongsi_1_trig': 'Wanton Excess',
  '#m_ex__yongsi_2_trig': 'Wanton Excess',
  '#m_ex__yuanshao': 'Scion of a Noble House',
  '#m_ex__yuanshu': 'Emperor of Zhongjia',
  '#m_ex__yufan': 'The Blunt and Unruly Scholar',
  '#m_ex__yuji': 'Daoist of Great Peace',
  '#m_ex__yujin': 'Quell the Brutal, Hold the Rampart',
  '#m_ex__zenhui-choose': 'Slander: choose a player who can become a target of %arg',
  '#m_ex__zenhui_1_trig': 'Slander',
  '#m_ex__zhangfei': 'A Match for Ten Thousand',
  '#m_ex__zhangjiao': 'The Great Worthy Teacher',
  '#m_ex__zhangyi': 'Valor Surpassing the Ancients',
  '#m_ex__zhangzhaozhanghong': 'Weaving Heaven and Earth',
  '#m_ex__zhiji_1_trig': 'Inherited Ambition',
  '#m_ex__zhijian_1_active': 'Equip Up',
  '#m_ex__zhijian_2_trig': 'Equip Up',
  '#m_ex__zhonghui': 'The Arrogant Ambitionist',
  '#m_ex__zhongyong-choose': 'Loyal Valour: give all the Dodges that responded to this Slash to one player',
  '#m_ex__zhongyong-give': 'Loyal Valour: choose a player and make them obtain the %arg you used',
  '#m_ex__zhongyong-jink': 'Loyal Valour: you can obtain or hand over the Dodges, then gain some further effect',
  '#m_ex__zhongyong-slash': 'Loyal Valour: take back the %arg you used?',
  '#m_ex__zhongyong_1_trig': 'Loyal Valour',
  '#m_ex__zhongyong_2_trig': 'Loyal Valour',
  '#m_ex__zhongyong_3_prohibit': 'Loyal Valour',
  '#m_ex__zhoucang': 'Utter Devotion',
  '#m_ex__zhoufei': 'Jade Barge, Roaming Phoenix',
  '#m_ex__zhoutai': 'Body Forged in Battle',
  '#m_ex__zhuhuan': 'Barring the Heaven-Sent at Zhongzhou',
  '#m_ex__zhuikong-invoke': 'Trembling Dread: you can point fight with %dest; if you win, cards they use this '
    + 'turn can only target themselves',
  '#m_ex__zhuikong_1_trig': 'Trembling Dread',
  '#m_ex__zhuikong_2_prohibit': 'Trembling Dread',
  '#m_ex__zhuikong_3_trig': 'Trembling Dread',
  '#m_ex__zhuran': 'The Unmoving Commander',
  '#m_ex__zhuzhi': 'High in Merit, Deep in Trust',
  '#m_ex__zili-choice': 'Independence: choose 1 benefit',
  '#m_ex__zili_1_trig': 'Independence',
  '#m_ex__zongshi_1_trig': 'Imperial Clan',
  '#m_ex__zongshi_2_maxcards': 'Imperial Clan',
  '#m_ex__zongshi_3_targetmod': 'Imperial Clan',
  '#m_ex__zongshij-card': 'Free Spirit: choose one card to obtain',
  '#m_ex__zongshij_1_trig': 'Free Spirit',
  '#m_ex__zongxuan-active': 'Mystic Release: you can draw a card, then put a card on top of the draw pile',
  '#m_ex__zongxuan-invoke': 'Mystic Release: put any number of the discarded cards on top of the draw pile',
  '#m_ex__zongxuan-put': 'Mystic Release: put a card on top of the draw pile',
  '#m_ex__zongxuan_1_active': 'Mystic Release',
  '#m_ex__zongxuan_2_trig': 'Mystic Release',
  '#m_friend__pangtong': 'Phoenix Soaring in the South',
  '#m_friend__shitao': 'Moon Fallen to Convention',
  '#m_friend__xushu': 'Quiet Insight, Patient Teacher',
  '#m_friend__zhugeliang': 'Dragon Rising to the Ninth Heaven',
  '#m_js__fayi-choose': 'Purge Dissent: you can deal damage to up to %arg players whose opinion differs from yours',
  '#m_js__fayi_1_trig': 'Purge Dissent',
  '#m_js__jishan-choose': 'Accumulated Virtue: you can make a player heal 1 HP',
  '#m_js__jishan-invoke': 'Accumulated Virtue: you can lose 2 HP to prevent the damage %dest is taking, then '
    + 'you and they each draw a card',
  '#m_js__jishan_1_trig': 'Accumulated Virtue',
  '#m_js__jishan_2_trig': 'Accumulated Virtue',
  '#m_js__juelie-discard': 'Fierce Resolve: you can discard a card, then discard a card from %dest',
  '#m_js__juelie_1_trig': 'Fierce Resolve',
  '#m_js__juelie_2_trig': 'Fierce Resolve',
  '#m_js__liubei': 'Bearing Arms, Shouldering the Halberd',
  '#m_js__shelun': 'Amnesty Debate: name %arg players; every other player whose hand card count is not '
    + 'greater than yours holds a council<br>Red: discard two cards from the targets; '
    + 'Black: deal 1 damage to the targets',
  '#m_js__shelun-discard': 'Amnesty Debate: discard two cards from %dest',
  '#m_js__shelun_1_active': 'Amnesty Debate',
  '#m_js__sunjian': 'Fierce Ambition, Order Restored',
  '#m_js__wangyun': 'Vain of His Own Merit',
  '#m_liuyi__caozhi': 'Rivers and Mountains in Verse',
  '#m_liuyi__liuhui': 'Ancient Ratio of the Heavens',
  '#m_liuyi__luyu': 'Measure, Mirror, and Order',
  '#m_liuyi__zhangzhi': 'Sage of Cursive Script',
  '#m_liuyi__zhouyu': 'Zhou Lang Who Heeds the Tune',
  '#m_shi2__weiyan': 'Proud Loyalty Across Ten Thousand Mountains',
  '#m_shi3__weiyan': 'Proud Loyalty Across Ten Thousand Mountains',
  '#m_shi__caozhen': 'Bearing the State, Heaven\'s Commander',
  '#m_shi__ceduan': 'Decisive Strategy: choose a player, then use your hand cards of one color as one '
    + 'kind of Slash against them',
  '#m_shi__ceduan-show': 'Decisive Strategy: show a hand card; depending on the color, %src will use a Slash '
    + 'against %dest',
  '#m_shi__ceduan-slash': 'Decisive Strategy: choose a kind of Slash to use against %dest',
  '#m_shi__ceduan_1_active': 'Decisive Strategy',
  '#m_shi__chendao': 'Commander of the White Feathers',
  '#m_shi__chengpu': 'Burning Wulin, Sweeping Bandits',
  '#m_shi__chenzhis': 'Bending to the Throne, Bound to the Eunuch',
  '#m_shi__dengai': 'Courage Soaring to the Clouds',
  '#m_shi__dimeng': 'Alliance: make two players whose hand counts differ by no more than %arg exchange '
    + 'hand cards',
  '#m_shi__dimeng_1_active': 'Alliance',
  '#m_shi__dongzhao': 'Laying Plans, Fixing the Course',
  '#m_shi__guoyuan': 'Incorrupt and Steadfast',
  '#m_shi__haoshi&': 'Generosity: use or play Momentum Lu Su\'s hand cards',
  '#m_shi__haoshi&_1_active': 'Generosity',
  '#m_shi__haoshi-choose': 'Generosity: choose a player; until the start of your next turn, they can use or play '
    + 'your hand cards as if they were their own hand cards',
  '#m_shi__haoshi_1_trig': 'Generosity',
  '#m_shi__haoshi_2_trig': 'Generosity',
  '#m_shi__haoshi_3_trig': 'Generosity',
  '#m_shi__haoshi_4_trig': 'Generosity',
  '#m_shi__haoshi_5_filter': 'Generosity',
  '#m_shi__huangzu': 'Cold Vigil Unto Death',
  '#m_shi__huanjie': 'Talent Complete, Fate Entrusted',
  '#m_shi__jixi-invoke_other': 'Swift Raid: you can discard 1 card from %dest and carry out the following effect',
  '#m_shi__jixi-invoke_you': 'Swift Raid: you can discard 1 of your own cards and carry out the following effect',
  '#m_shi__jixi-use': 'Swift Raid: choose any number of players who have been targets of cards you used '
    + 'this turn; it counts as using Snatch on them',
  '#m_shi__jixi_1_trig': 'Swift Raid',
  '#m_shi__kuanggu_1_trig': 'Frenzied Bones',
  '#m_shi__kuanggu_2_trig': 'Frenzied Bones',
  '#m_shi__lusu': 'Unfolding the Grand Plan',
  '#m_shi__luyusheng': 'The Righteous Maiden',
  '#m_shi__qingyan': 'Stern Integrity: show %arg hand cards, counting as using a Dodge or a Nullification',
  '#m_shi__qingyan_1_active': 'Stern Integrity',
  '#m_shi__qingyan_2_invalidity': 'Stern Integrity',
  '#m_shi__sijian-choose': 'Dying Remonstrance: make a player discard a card after they use their next card',
  '#m_shi__sijian_1_trig': 'Dying Remonstrance',
  '#m_shi__sijian_2_trig': 'Dying Remonstrance',
  '#m_shi__sijian_3_trig': 'Dying Remonstrance',
  '#m_shi__sunchen': 'Viper\'s Shadow, Unrivalled Sway',
  '#m_shi__sunjun': 'Entrenched by Violence',
  '#m_shi__taishici': 'Treading the Stair to Heaven',
  '#m_shi__tianfeng': 'Paragon of Hebei',
  '#m_shi__tuntian': 'Garrison Farming: you can spend any number of charge points to make up to that many '
    + 'players each obtain a <font color=\'red\'>♥</font> card',
  '#m_shi__tuntian-choose': 'Garrison Farming: choose up to %arg players to each obtain a <font '
    + 'color=\'red\'>♥</font> card',
  '#m_shi__tuntian_1_active': 'Garrison Farming',
  '#m_shi__tuntian_2_trig': 'Garrison Farming',
  '#m_shi__tuntian_3_trig': 'Garrison Farming',
  '#m_shi__wangchang': 'Worthy Minister of Insight',
  '#m_shi__weiyan': 'Loyal Pride Across Ten Thousand Mountains',
  '#m_shi__xiahoushang': 'Wei\'s Scion, the Vanguard',
  '#m_shi__xianshuai_1_trig': 'Vanguard',
  '#m_shi__xianshuai_2_targetmod': 'Vanguard',
  '#m_shi__xinxianying': 'Clear Judgment, Steadfast Honor',
  '#m_shi__yuji': 'Ageless Immortal, Seeking the Way',
  '#m_shi__zaoxian_1_trig': 'Perilous Path',
  '#m_shi__zhangyan': 'Nimble Valour, Startling Force',
  '#m_shi__zhonghui': 'Ambition Sweeping the Skies',
  '#m_shi__zhouyu': 'Blazing Jade, Cleansing Waves',
  '#m_sp__caocao': 'Lofty and Unbowed',
  '#m_sp__guanqiujian': 'Talent and Insight Beyond Compare',
  '#m_sp__simazhao': 'Awing the Four Seas',
  '#m_sp__yujin': 'Rout Tyranny, Quell Chaos',
  '#m_sp__zhenji': 'Bright Pearl, Brocade Jade',
  '#m_thoroughbred__lidian': 'Duty Above Private Grudge',
  '#m_thoroughbred__yuejin': 'Repelling Foes, Warding Aggression',
  '#m_thoroughbred__zhangliao': 'Spirit That Overawes the Host',
  '#m_yuan__wusheng': 'Warrior Saint: you can use or play any number of cards as a Slash with no distance '
    + 'restriction',
  '#m_yuan__wusheng_1_active': 'Warrior Saint',
  '#m_yuan__wusheng_2_targetmod': 'Warrior Saint',
  '#m_yuan__yijue-give': 'Severed Bond: you can give %src any number of cards, then they choose one option',
  '#m_yuan__yijue_1_trig': 'Severed Bond',
  '#m_yuan__yijue_2_trig': 'Severed Bond',
  '#m_yuan__yijue_3_prohibit': 'Severed Bond',
  '#majun': 'Uncut Jade of the Deep',
  '#maodiey_1_trig': 'Escalation',
  '#maodiey_2_trig': 'Escalation',
  '#maodiey_3_trig': 'Escalation',
  '#maodiey_4_prohibit': 'Escalation',
  '#maojie': 'Upright and Plain of Conduct',
  '#mayuanyi': 'Torchbearer of the Yellow Heaven',
  '#mazhong': 'Winning Nanzhong with a Smile',
  '#mex_guhuo_query': '%from chooses %arg',
  '#miaolue-ask': 'Brilliant Stratagem: choose which Wisdom Bag to obtain',
  '#miaolue_1_trig': 'Brilliant Strategy',
  '#miaolue_2_trig': 'Brilliant Strategy',
  '#mibei_1_trig': 'Secret Preparation',
  '#mibei_2_trig': 'Secret Preparation',
  '#mibei_3_trig': 'Secret Preparation',
  '#miewu': 'Destroy Wu: discard 1 Armoury mark to use or play a card as any basic or trick card, '
    + 'then draw a card',
  '#miewu_1_active': 'Conquer Wu',
  '#miewu_2_trig': 'Conquer Wu',
  '#miewu_3_trig': 'Conquer Wu',
  '#miheng': 'The Osprey Pecks the Lone Phoenix',
  '#mingcha-choose': 'Discernment: you can choose a player and obtain a random card from them',
  '#mingcha-get': 'Discernment: give up drawing and obtain the cards among them with a number of 8 or less?',
  '#mingcha_1_trig': 'Discernment',
  '#mobile2__caomao': 'Facing Death to Preserve Wei',
  '#mobile2__simazhao': 'A Lone Portent Swallowing Heaven',
  '#mobile__baiyin_1_trig': 'Seal of Office',
  '#mobile__baosanniang': 'Flower-Loving Beauty',
  '#mobile__baoxin': 'The Plain and Loyal Chancellor',
  '#mobile__beini': 'Treason: choose a player whose HP is not less than yours; one side draws two cards, '
    + 'the other side uses a Slash on them or obtains a card from them',
  '#mobile__beini_1_active': 'Treason',
  '#mobile__bianfuren': 'Wise Consort, Virtuous Empress',
  '#mobile__biaozhao-choose': 'Memorial Summons: make a player heal 1 HP and draw three cards',
  '#mobile__biaozhao-cost': 'Memorial Summons: you can put a card on your character card as a Memorial',
  '#mobile__biaozhao_1_trig': 'Memorial Summons',
  '#mobile__biaozhao_2_trig': 'Memorial Summons',
  '#mobile__bijing-invoke': 'Closed Borders: you can mark a hand card as a Closed Borders card',
  '#mobile__bijing_1_trig': 'Seal the Borders',
  '#mobile__bijing_2_trig': 'Seal the Borders',
  '#mobile__bijing_3_trig': 'Seal the Borders',
  '#mobile__bijing_4_trig': 'Seal the Borders',
  '#mobile__canyun_1_active': 'Lingering Echo',
  '#mobile__caomao': 'Facing Death to Preserve Wei',
  '#mobile__caosong': 'Carting Gold, Buying Power',
  '#mobile__caoying': 'Dragon City, Phoenix Cry',
  '#mobile__catapult-invoke': 'Thunderbolt Catapult: you can discard all the cards in %dest\'s equip area',
  '#mobile__catapult_skill': 'Thunderbolt Catapult',
  '#mobile__cheliji': 'Cold Edge of the North',
  '#mobile__chendeng': 'Heroic Spirit, Steadfast Honour',
  '#mobile__chengui': 'Silver Tongue, Deft Hand',
  '#mobile__chenjie_1_trig': 'Subject\'s Honor',
  '#mobile__chijie-invoke': 'Imperial Staff: you can perform a judgement, and if the number is greater than 6, '
    + 'cancel this %arg',
  '#mobile__chijie_1_trig': 'Imperial Staff',
  '#mobile__choujue_1_trig': 'Blood Feud',
  '#mobile__cuilingyi': 'Golden Crown and Plume',
  '#mobile__cuiyan': 'The Manner of Bo Yi',
  '#mobile__dangyi-invoke': 'Purge Dissent: increase the damage you deal to %dest by 1? (%arg use(s) left!)',
  '#mobile__dangyi_1_trig': 'Purge Dissent',
  '#mobile__daoshu': 'Steal the Letter: you and your teammates can look at one enemy\'s hand cards and find '
    + 'the card disguised under a false name',
  '#mobile__daoshu-choose': 'Steal the Letter: choose a card name on the left and choose a hand card, then '
    + 'disguise that card as that card name',
  '#mobile__daoshu-guess': 'Guess which of them is the disguised card',
  '#mobile__daoshu_1_active': 'Steal the Letter',
  '#mobile__daoshu_choose_1_active': 'Steal the Letter',
  '#mobile__dengzhi': 'Diplomat in Dire Straits',
  '#mobile__diancai_1_trig': 'Treasury',
  '#mobile__dianhua_1_trig': 'Enlightenment',
  '#mobile__diaodu-move': 'Dispatch: you can move an equip card on the field, and the player who loses the card '
    + 'draws a card',
  '#mobile__diaodu_1_trig': 'Dispatch',
  '#mobile__dingfa-choose': 'Set the Law: choose a player and discard up to two of their cards',
  '#mobile__dingfa_1_trig': 'Set the Law',
  '#mobile__dongbai': 'Demon Princess',
  '#mobile__dongcheng': 'Devoted Defender of Han',
  '#mobile__duyu': 'Civil Accomplishment, Martial Virtue',
  '#mobile__falu_1_trig': 'Talisman Register',
  '#mobile__falu_2_trig': 'Talisman Register',
  '#mobile__feiyi': 'Renowned Chancellor of Shu Han',
  '#mobile__fengji_1_trig': 'Bountiful Store',
  '#mobile__fengji_2_trig': 'Bountiful Store',
  '#mobile__fengji_3_maxcards': 'Bountiful Store',
  '#mobile__fenxin-invoke': 'Burning Heart: you can use Burning Heart on %dest , choose one option',
  '#mobile__fenxin_1_trig': 'Burning Heart',
  '#mobile__fozong_1_trig': 'Buddhist Sect',
  '#mobile__fozong_2_trig': 'Buddhist Sect',
  '#mobile__fozong_3_trig': 'Buddhist Sect',
  '#mobile__fozong_4_maxcards': 'Buddhist Sect',
  '#mobile__fuhaiw': 'Sail the Seas: make all other players choose Rising Tide or Ebbing Tide, then you '
    + 'draw cards',
  '#mobile__fuhaiw-choice': 'Sail the Seas: choose one, which may make %src draw cards',
  '#mobile__fuhaiw_1_active': 'Sail the Seas',
  '#mobile__fujian_1_trig': 'Hidden Spy',
  '#mobile__funan-invoke': 'Rebuttal: you can obtain the %arg used by %dest',
  '#mobile__funan_1_trig': 'Rebuttal',
  '#mobile__funan_2_trig': 'Rebuttal',
  '#mobile__funan_3_trig': 'Rebuttal',
  '#mobile__funan_4_trig': 'Rebuttal',
  '#mobile__funan_5_trig': 'Rebuttal',
  '#mobile__funan_6_trig': 'Rebuttal',
  '#mobile__funan_7_trig': 'Rebuttal',
  '#mobile__furong': 'Fierce Loyalty to the Failing Han',
  '#mobile__ganfuren': 'Empress Zhaolie',
  '#mobile__gaolan': 'Decisive Strike on the Fortified Camp',
  '#mobile__geyuan-invoke': 'Circle Cutting: you can draw %arg cards',
  '#mobile__geyuan_1_trig': 'Circle Cutting',
  '#mobile__godjiangwei': 'Rain Upon All the People',
  '#mobile__godmachao': 'Might That Shakes the Ninth Heaven',
  '#mobile__godsimayi': 'Three Kingdoms Made One',
  '#mobile__gongsun-choose': 'Mutual Loss: discard two cards and choose another player, then name a card; neither '
    + 'of you can use, play or discard hand cards with that name',
  '#mobile__gongsun-name': 'Mutual Loss: name a card; you and %dest cannot use, play or discard hand cards with '
    + 'that name until the start of your next turn',
  '#mobile__gongsun_1_trig': 'Shared Loss',
  '#mobile__gongsun_2_prohibit': 'Shared Loss',
  '#mobile__gongsun_3_trig': 'Shared Loss',
  '#mobile__gongsun_4_trig': 'Shared Loss',
  '#mobile__guanyinping': 'Martial Maiden',
  '#mobile__guixiu_1_trig': 'Noble Maiden',
  '#mobile__guozhao': 'Empress Wende',
  '#mobile__hansui': 'Overlord of the Northern Frontier',
  '#mobile__hanzhan': 'Fierce Battle: you can draw cards together with another player, then it counts as '
    + 'you using a Duel on them',
  '#mobile__hanzhan_1_active': 'Fierce Battle',
  '#mobile__heqi': 'Hooves Across the Mountains',
  '#mobile__huaman': 'Clear Shadow of the Marshes',
  '#mobile__huangfusong': 'Iron Blood, Tender Heart',
  '#mobile__huaxin': 'Pure and Plain, Sweeping the Murk',
  '#mobile__huban': 'Bright Justice, Ardent Valor',
  '#mobile__huishi': 'Keen Insight: judge repeatedly until a suit repeats, then give the judgement cards '
    + 'to a player',
  '#mobile__huishi-ask': 'Keen Insight: you can gain 1 max HP and keep judging',
  '#mobile__huishi-choose': 'Keen Insight: give these judgement cards to a player, or click Cancel to obtain them '
    + 'yourself',
  '#mobile__huishi_1_active': 'Keen Insight',
  '#mobile__huojun': 'Iron Lion of Jiameng',
  '#mobile__huxiao_1_active': 'Tiger Roar',
  '#mobile__huxiao_2_targetmod': 'Tiger Roar',
  '#mobile__jiachong': 'Fierce and Walking Alone',
  '#mobile__jianggan': 'False Loyalty, Feigned Sincerity',
  '#mobile__jiangji': 'Prospering Wei, Rising Talent',
  '#mobile__jiangqin': 'Bending Pride, Prizing Honor',
  '#mobile__jianji': 'Divisive Scheme: choose a hand card and make two players point fight; the winner '
    + 'counts as using a Slash against the other',
  '#mobile__jianji-invoke': 'Divisive Scheme: use the card %src secretly chose for the point fight instead?',
  '#mobile__jianji_1_active': 'Divisive Scheme',
  '#mobile__jianji_2_trig': 'Divisive Scheme',
  '#mobile__jiaohua': 'Enlightenment: make a player obtain a card of the type you choose',
  '#mobile__jiaohua_1_active': 'Enlightenment',
  '#mobile__jiexun-choose': 'Admonition: choose a suit, make a player draw cards equal to the number of cards of '
    + 'that suit on the field, then discard %arg cards',
  '#mobile__jiexun_1_trig': 'Admonition',
  '#mobile__jiexun_active': 'Admonition',
  '#mobile__jieyu_1_trig': 'Dogged Defense',
  '#mobile__jieyu_2_trig': 'Dogged Defense',
  '#mobile__jieyu_3_trig': 'Dogged Defense',
  '#mobile__jieyuan1-invoke': 'Exhausted Bond: you are dealing damage to %dest, you can choose one option',
  '#mobile__jieyuan2-invoke': 'Exhausted Bond: you are taking damage, you can choose one option',
  '#mobile__jieyuan_1_trig': 'Severed Bond',
  '#mobile__jieyuan_2_trig': 'Severed Bond',
  '#mobile__jieyuan_active': 'Severed Bond',
  '#mobile__jikang': 'Lone Pine on a Steep Peak',
  '#mobile__jilue_1_trig': 'Ultimate Strategy',
  '#mobile__jilue_2_trig': 'Ultimate Strategy',
  '#mobile__jimeng-choose': 'Urgent Alliance: you can obtain a card from another player, then give them %arg cards',
  '#mobile__jimeng-give': 'Urgent Alliance: give %dest %arg cards',
  '#mobile__jimeng_1_trig': 'Urgent Alliance',
  '#mobile__jincui': 'Utter Devotion: you can swap seats with a player and lose %arg HP',
  '#mobile__jincui_1_active': 'Utter Devotion',
  '#mobile__jingong': 'Boast of Merit: you can use an equip card or a Slash as a trick card',
  '#mobile__jingong_1_active': 'Vaunted Merit',
  '#mobile__jingong_2_trig': 'Vaunted Merit',
  '#mobile__jintao_1_trig': 'Punitive March',
  '#mobile__jintao_2_targetmod': 'Punitive March',
  '#mobile__juexiang-choose': 'Final Echo: you can make another player gain the skill Lingering Echo',
  '#mobile__juexiang-throw': 'Final Echo: you can discard a ♣ card on the field, then gain the skill Final Echo',
  '#mobile__juexiang_1_trig': 'Final Echo',
  '#mobile__jujun_1_trig': 'Hold the Heights',
  '#mobile__kongrong': 'Stern and Righteous',
  '#mobile__kuangcai_1_trig': 'Mad Genius',
  '#mobile__kuangcai_2_trig': 'Mad Genius',
  '#mobile__kuangcai_3_trig': 'Mad Genius',
  '#mobile__kuangcai_4_targetmod': 'Mad Genius',
  '#mobile__kuangxiang': 'Mutual Aid: you can exchange hand cards with a player whose hand count is no greater '
    + 'than yours',
  '#mobile__kuangxiang-invoke': 'Mutual Aid: carry out one \'Foster Growth\' effect to draw two cards?',
  '#mobile__kuangxiang_1_active': 'Mutual Aid',
  '#mobile__kuangxiang_2_trig': 'Mutual Aid',
  '#mobile__kuangxiang_3_trig': 'Mutual Aid',
  '#mobile__lianji0': 'Chain Stratagem: choose two players; the first player uses a random weapon, then it '
    + 'counts as using a random damage card on the second player',
  '#mobile__lianji1': 'Chain Stratagem: %src uses a random weapon, then it counts as using a random damage '
    + 'card on another player',
  '#mobile__lianji2': 'Chain Stratagem: %src uses a random weapon, then it counts as using a random damage '
    + 'card on %dest',
  '#mobile__lianji_1_active': 'Chain Stratagem',
  '#mobile__lianpo_1_trig': 'Onslaught',
  '#mobile__lianzhu': 'Chain Execution: give a player a card; this phase you use cards on the player who '
    + 'has that card with no distance or count restriction',
  '#mobile__lianzhu-give': 'Chain Execution: give %src another card and give the Chain Execution card to %dest, '
    + 'otherwise %src draws two cards',
  '#mobile__lianzhu-prey': 'Chain Execution: obtain the Chain Execution card from %dest?',
  '#mobile__lianzhu_1_active': 'Chain Execution',
  '#mobile__lianzhu_2_targetmod': 'Chain Execution',
  '#mobile__lianzhu_3_trig': 'Chain Execution',
  '#mobile__lianzhu_4_trig': 'Chain Execution',
  '#mobile__liechi_1_trig': 'Fierce Rebuke',
  '#mobile__lingju': 'Love Fades with the Dream',
  '#mobile__lingren-choice': 'Overbearing: guess whether the hand cards of %dest contain a basic card, a trick '
    + 'card or an equip card',
  '#mobile__lingren-choose': 'Do you want to use Overbearing and guess whether the hand cards of one of the target '
    + 'players contain a basic card, a trick card or an equip card?',
  '#mobile__lingren-invoke': 'Do you want to use Overbearing on %dest and guess whether the hand cards of one of '
    + 'the target players contain a basic card, a trick card or an equip card?',
  '#mobile__lingren_1_trig': 'Overbearing',
  '#mobile__lingren_2_trig': 'Overbearing',
  '#mobile__lingren_3_trig': 'Overbearing',
  '#mobile__lingren_result': '%from guessed %arg of them correctly',
  '#mobile__lirang-get': 'Courtesy: obtain up to two cards %dest discarded this phase',
  '#mobile__lirang-invoke': 'Courtesy: you can gain the "Modesty" mark to make %dest draw 2 extra cards',
  '#mobile__lirang_1_trig': 'Courtesy',
  '#mobile__lirang_2_trig': 'Courtesy',
  '#mobile__lirang_3_trig': 'Courtesy',
  '#mobile__lirang_4_trig': 'Courtesy',
  '#mobile__liuba': 'Drafting the Code, Enforcing the Law',
  '#mobile__liuye': 'Talent to Aid an Age',
  '#mobile__lougui': 'Not One Day\'s Frost',
  '#mobile__lvfan': 'Keeper of Tallies, Upright and Bold',
  '#mobile__lvkai': 'Iron Heart, True Compass',
  '#mobile__maliang': 'The White-Browed Sage',
  '#mobile__mamidi': 'Heir to the Scholar\'s Legacy',
  '#mobile__meibu-invoke': 'Beguiling Step: discard a card to give %dest Cease Fire this turn?',
  '#mobile__meibu_1_trig': 'Beguiling Step',
  '#mobile__meibu_2_distance': 'Beguiling Step',
  '#mobile__mengda': 'Seeking a Perch on the Phoenix Tree',
  '#mobile__mifuren': 'Sinking Fragrance in Chaotic Times',
  '#mobile__mingfa-choose': 'Open Campaign: you can point-fight with the card you showed last turn',
  '#mobile__mingfa-show': 'Open Campaign: you can show a card, and point-fight with it in your next turn\'s '
    + 'Action phase',
  '#mobile__mingfa_1_trig': 'Open Campaign',
  '#mobile__mingfa_2_trig': 'Open Campaign',
  '#mobile__mingfa_3_trig': 'Open Campaign',
  '#mobile__mingfa_4_prohibit': 'Open Campaign',
  '#mobile__mingshi-discard': 'Renowned Scholar: discard a card from your areas; if it is black %src obtains it, if '
    + 'it is red %scr recovers HP',
  '#mobile__mingshi_1_trig': 'Renowned Scholar',
  '#mobile__moucheng_1_trig': 'Scheme Fulfilled',
  '#mobile__mumu-discard': 'Solemn Grace: choose a player and discard one of their equip cards',
  '#mobile__mumu-get': 'Solemn Grace: choose a player and obtain one of their armor cards',
  '#mobile__mumu-prey': 'Solemn Grace: obtain one of these armor cards',
  '#mobile__mumu_1_trig': 'Solemn Grace',
  '#mobile__mumu_2_prohibit': 'Solemn Grace',
  '#mobile__mutao': 'Call to Arms: choose a player to hand out the Slashes in their hand and deal damage '
    + 'to the last player',
  '#mobile__mutao_1_active': 'Call to Arms',
  '#mobile__natu_fu-damage': 'Solace: you can deal %arg fire damage to a player',
  '#mobile__natu_fu-recover': 'Solace: you can make %dest recover %arg HP',
  '#mobile__natu_fu_1_trig': 'Solace',
  '#mobile__natu_heng_1_active': 'Constant',
  '#mobile__natu_lie-damage': 'Fierce: you can deal 1 damage to a player',
  '#mobile__natu_lie-invoke': 'Fierce: you can adjust your hand to %arg cards; if you discard cards to do so, you '
    + 'can deal 1 damage',
  '#mobile__natu_lie_1_trig': 'Fierce',
  '#mobile__natu_xing_1_trig': 'Revival',
  '#mobile__natu_xing_2_trig': 'Revival',
  '#mobile__natu_xing_3_prohibit': 'Revival',
  '#mobile__natu_xing_4_maxcards': 'Revival',
  '#mobile__natu_xing_5_targetmod': 'Revival',
  '#mobile__natu_xing_6_trig': 'Revival',
  '#mobile__natu_yi': 'Righteousness: make up to two players each give you a card, then choose one option',
  '#mobile__natu_yi-ask': 'Righteousness: give %src a card',
  '#mobile__natu_yi-give': 'Righteousness: distribute these cards; using a black card among them makes the '
    + 'target\'s non-forced skills invalid',
  '#mobile__natu_yi-slash': 'Righteousness: use these cards as a Slash against one of those players; the target '
    + 'cannot use hand cards of the converted cards\' color',
  '#mobile__natu_yi_1_active': 'Righteousness',
  '#mobile__natu_yi_2_trig': 'Righteousness',
  '#mobile__natu_yi_3_trig': 'Righteousness',
  '#mobile__natu_yi_4_prohibit': 'Righteousness',
  '#mobile__niluan-slash': 'Insurrection: you can use a Slash against %src',
  '#mobile__niluan_1_trig': 'Insurrection',
  '#mobile__qianlong_1_trig': 'Hidden Dragon',
  '#mobile__qianlong_2_trig': 'Hidden Dragon',
  '#mobile__qianlong_3_trig': 'Hidden Dragon',
  '#mobile__qianlong_4_trig': 'Hidden Dragon',
  '#mobile__qiantun': 'Humble Ambition: make a player show any number of hand cards and point fight with '
    + 'them; if you win, you obtain the shown cards; if you do not win, you obtain their '
    + 'unshown hand cards',
  '#mobile__qiantun-ask': 'Humble Ambition: show any number of hand cards. You can only use these cards to '
    + 'point fight with %src, and depending on the result they obtain your shown cards or '
    + 'your unshown cards!',
  '#mobile__qiantun-pindian': 'Humble Ambition: you can only use these cards to point fight with %src! If they win, '
    + 'they obtain your shown cards; if they do not win, they obtain your unshown hand '
    + 'cards',
  '#mobile__qiantun_1_active': 'Humble Ambition',
  '#mobile__qiantun_2_trig': 'Humble Ambition',
  '#mobile__qianxinz': 'Dispatch Letters: choose up to two hand cards and hand them out at random to the '
    + 'same number of other players',
  '#mobile__qianxinz_1_active': 'Dispatch Letters',
  '#mobile__qianxinz_2_trig': 'Dispatch Letters',
  '#mobile__qinghegongzhu': 'Venomous Slander',
  '#mobile__qingxian': 'Clear Strings: choose up to %arg other players and discard the same number of cards; '
    + 'the effect depends on how many equips they have',
  '#mobile__qingxian_1_active': 'Clear Strings',
  '#mobile__qizhou_1_trig': 'Ornate Armor',
  '#mobile__qizhou_2_trig': 'Ornate Armor',
  '#mobile__renjie_1_trig': 'Forbearance',
  '#mobile__renjie_2_trig': 'Forbearance',
  '#mobile__renjie_3_trig': 'Forbearance',
  '#mobile__runwei': 'Subtle Nourishment: you can show up to 5 cards from the top of the draw pile and '
    + 'make 1 player obtain the cards of one colour among them',
  '#mobile__runwei-choose': 'Subtle Nourishment: choose 1 player to obtain the cards of one colour among them',
  '#mobile__runwei_1_active': 'Subtle Nourishment',
  '#mobile__runwei_2_trig': 'Subtle Nourishment',
  '#mobile__runwei_3_trig': 'Subtle Nourishment',
  '#mobile__runwei_active_1_active': 'Subtle Nourishment',
  '#mobile__sanchen_1_trig': 'Three Memorials',
  '#mobile__saojian': 'Purge Traitors: look at another player\'s hand cards, then make them discard hand '
    + 'cards until they discard the card you chose',
  '#mobile__saojian-discard': 'Purge Traitors: discard a hand card, until you discard the card chosen by Purge '
    + 'Traitors (%arg remaining)',
  '#mobile__saojian_1_active': 'Purge Traitors',
  '#mobile__shajue_1_trig': 'Slaughter',
  '#mobile__shangyi': 'Uphold Honor: discard a card to make a player look at your hand cards, then you look '
    + 'at their hand cards and obtain one of them',
  '#mobile__shangyi_1_active': 'Uphold Honor',
  '#mobile__shanxi-cards': 'Flash Raid: put up to %arg of %dest\'s cards face down on their character card until '
    + 'the end of the turn',
  '#mobile__shanxi-choose': 'Flash Raid: you can discard a red basic card to put another player\'s cards face down '
    + 'on their character card until the end of the turn',
  '#mobile__shanxi_1_trig': 'Flash Raid',
  '#mobile__shanxi_2_trig': 'Flash Raid',
  '#mobile__shejian-choose': 'Sword Tongue: you can discard a card from another player',
  '#mobile__shejian_1_trig': 'Sword Tongue',
  '#mobile__shenpei': 'Upright in the South, Righteous in the North',
  '#mobile__shiju_1_trig': 'Rising Momentum',
  '#mobile__shuaiyan-choose': 'Candid Words: you can show all your hand cards to make another player give you a card',
  '#mobile__shuaiyan-give': 'Candid Words: give %dest a card',
  '#mobile__shuaiyan_1_trig': 'Candid Words',
  '#mobile__shushen-draw': 'Gentle Grace: you can make another player draw two cards',
  '#mobile__shushen-recover': 'Gentle Grace: you can make another player recover 1 HP',
  '#mobile__shushen_1_trig': 'Gentle Grace',
  '#mobile__shushen_2_trig': 'Gentle Grace',
  '#mobile__sidai': 'Seize the Lull: you can use all your basic cards as a Slash (a Peach or a Dodge '
    + 'among them adds an extra effect)!',
  '#mobile__sidai_1_active': 'Seize the Lull',
  '#mobile__sidai_2_trig': 'Seize the Lull',
  '#mobile__sidai_3_trig': 'Seize the Lull',
  '#mobile__sidai_nojink': 'Seize the Lull: discard a basic card, otherwise you cannot respond to this Slash',
  '#mobile__simafu': 'Vainly Seeking Virtue',
  '#mobile__simazhao': 'Lone Specter Devouring Heaven',
  '#mobile__simazhou': 'Reverent, Gentle, Self-Mastered',
  '#mobile__songshu-choose': 'Praise of Shu: obtain %arg cards from the Benevolence area',
  '#mobile__songshu-invoke': 'Praise of Shu: you can make %dest give up drawing and obtain Benevolence cards '
    + 'instead, and this turn the cards they use cannot target other players',
  '#mobile__songshu_1_trig': 'Praise of Shu',
  '#mobile__songshu_2_prohibit': 'Praise of Shu',
  '#mobile__sufei': 'Candid Friend Seeking the Light',
  '#mobile__sunluyu': 'Sacrificed to Feed the Tiger',
  '#mobile__sunshao': 'Founder of the Realm\'s Order',
  '#mobile__tianshu-invoke': 'Heavenly Scripture: you can discard a card to make a player obtain the Classic of '
    + 'Great Peace and use it',
  '#mobile__tianshu_1_trig': 'Heavenly Book',
  '#mobile__tianyi-choose': 'Heaven\'s Wings: make a player gain the skill Auspicious Aid',
  '#mobile__tianyi_1_trig': 'Heaven\'s Wings',
  '#mobile__tongdu-card': 'Rule and Measure: recast a card',
  '#mobile__tongdu-choose': 'Rule and Measure: you can make a player recast a card',
  '#mobile__tongdu_1_trig': 'Rule and Measure',
  '#mobile__tongji-invoke': 'Shared Affliction: you can discard a card to transfer the Slash to %src',
  '#mobile__tongji_1_trig': 'Shared Affliction',
  '#mobile__wangcan': 'Verse and Prose Unbound',
  '#mobile__wangliec-invoke': 'Valiant Advance: choose a hand card; your use of it this phase has no distance '
    + 'restriction and cannot be responded to, and after it resolves you cannot use cards '
    + 'on other players',
  '#mobile__wangliec_1_trig': 'Valiant Advance',
  '#mobile__wangliec_2_targetmod': 'Valiant Advance',
  '#mobile__wangliec_3_trig': 'Valiant Advance',
  '#mobile__wangliec_4_trig': 'Valiant Advance',
  '#mobile__wangliec_5_prohibit': 'Valiant Advance',
  '#mobile__wangling': 'Lofty Principle and Bearing',
  '#mobile__wangshuang': 'Fierce Soldier of the Frontier',
  '#mobile__wangyuanji': 'Elegance Without Ostentation',
  '#mobile__wangyun': 'Loyal Soul Undying',
  '#mobile__wangzun_1_trig': 'False Majesty',
  '#mobile__wanwei': 'Avert Peril: make another player recover %arg HP, then you lose all your HP',
  '#mobile__wanwei-invoke': 'Avert Peril: you can make %dest recover %arg HP, then you lose all your HP',
  '#mobile__wanwei_1_active': 'Avert Peril',
  '#mobile__wanwei_2_trig': 'Avert Peril',
  '#mobile__weisi': 'Unbridled Might: make a player remove any number of hand cards from the game until '
    + 'the end of the turn, then it counts as using a Duel against them!',
  '#mobile__weisi-ask': 'Unbridled Might: %src will use a Duel against you! Remove any number of hand cards '
    + 'from the game for this turn; after the Duel deals damage to you, they obtain your '
    + 'hand cards!',
  '#mobile__weisi_1_active': 'Unbridled Might',
  '#mobile__weisi_2_trig': 'Unbridled Might',
  '#mobile__weisi_3_trig': 'Unbridled Might',
  '#mobile__weiwenzhugezhi': 'Sails Reaching Yizhou',
  '#mobile__wenqin': 'Proud Arm of the Huai Hills',
  '#mobile__wenyang': 'Lone Rider, Army Breaker',
  '#mobile__wuban': 'Hero of Loyal Blood',
  '#mobile__wuji': 'Martial Legacy: modify Vengeance this phase, so that after using a Vengeance card '
    + 'you draw a card!',
  '#mobile__wuji_1_active': 'Martial Legacy',
  '#mobile__wujing': 'Aiding Wu in Battle',
  '#mobile__xiahui_1_trig': 'Cunning Wit',
  '#mobile__xiahui_2_maxcards': 'Cunning Wit',
  '#mobile__xiahui_3_trig': 'Cunning Wit',
  '#mobile__xiahui_4_prohibit': 'Cunning Wit',
  '#mobile__xiaoxi': 'Valiant Raid: you can use or play a black card as Slash',
  '#mobile__xiaoxi_1_active': 'Valiant Raid',
  '#mobile__xiezheng-choose': 'Coerced Campaign: make up to %arg players each place a random hand card on top of '
    + 'the draw pile, then you count as using a %arg2 Besiege!',
  '#mobile__xiezheng-use': 'Coerced Campaign: it counts as using a Besiege! If it deals no damage, you lose 1 HP',
  '#mobile__xiezheng_1_trig': 'Coerced Campaign',
  '#mobile__xiezheng_2_trig': 'Coerced Campaign',
  '#mobile__xingdaorong': 'Grand General of Lingling',
  '#mobile__xinpi': 'One Staff Stills Six Armies',
  '#mobile__xionghuo-active': 'Savage Cauldron: give a Cruelty mark to another player',
  '#mobile__xionghuo_1_active': 'Savage Cauldron',
  '#mobile__xionghuo_2_trig': 'Savage Cauldron',
  '#mobile__xionghuo_3_trig': 'Savage Cauldron',
  '#mobile__xionghuo_4_trig': 'Savage Cauldron',
  '#mobile__xionghuo_5_prohibit': 'Savage Cauldron',
  '#mobile__xuehen-invoke': 'Vengeance: show up to %arg hand cards; these cards count as Slash with no limit on '
    + 'the number of uses',
  '#mobile__xuehen_1_trig': 'Vengeance',
  '#mobile__xuehen_2_trig': 'Vengeance',
  '#mobile__xuehen_3_trig': 'Vengeance',
  '#mobile__xuehen_4_filter': 'Vengeance',
  '#mobile__xuehen_5_targetmod': 'Vengeance',
  '#mobile__xuehen_6_trig': 'Vengeance',
  '#mobile__xuehen_7_trig': 'Vengeance',
  '#mobile__xuewei-choose': 'Blood Guard: secretly choose a player, prevent the next damage they take, take that '
    + 'much damage yourself, and deal damage to the damage source',
  '#mobile__xuewei_1_trig': 'Blood Guard',
  '#mobile__xuewei_2_trig': 'Blood Guard',
  '#mobile__xuewei_3_trig': 'Blood Guard',
  '#mobile__xuezong': 'The Refined Jade',
  '#mobile__xunjie_1_trig': 'Humble Integrity',
  '#mobile__xurong': 'War Demon of Xuantu',
  '#mobile__xushen-choose': 'Devotion: you can make one of those players gain "%arg"',
  '#mobile__xushen_1_active': 'Devotion',
  '#mobile__xushen_2_trig': 'Devotion',
  '#mobile__xushen_3_trig': 'Devotion',
  '#mobile__yanghong': 'Soothe the Near, Rule the Far',
  '#mobile__yanghu': 'Crane\'s Virtue, Jade\'s Renown',
  '#mobile__yanghuiyu': 'Gentle Wisdom, Motherly Grace',
  '#mobile__yangqiu': 'Through Fire and Water',
  '#mobile__yangyi': 'The Lone Snipe',
  '#mobile__yanjiao': 'Strict Teaching: choose a suit and a player, give all hand cards of that suit to '
    + 'them and deal 1 damage to them',
  '#mobile__yanjiao_1_active': 'Strict Teaching',
  '#mobile__yanjiao_2_trig': 'Strict Teaching',
  '#mobile__yanxiang': 'Bright Ideals, Early Mastery',
  '#mobile__yilie-choose': 'Righteous Ardor: choose another player; you take damage in their place, and you '
    + 'recover HP after they deal damage',
  '#mobile__yilie_1_trig': 'Righteous Ardor',
  '#mobile__yilie_2_trig': 'Righteous Ardor',
  '#mobile__yilie_3_trig': 'Righteous Ardor',
  '#mobile__yilie_4_trig': 'Righteous Ardor',
  '#mobile__yimou-give': 'Resolute Counsel: give a hand card to another player, then draw a card',
  '#mobile__yimou_1_trig': 'Resolute Counsel',
  '#mobile__yingbing_1_trig': 'Shadow Soldiers',
  '#mobile__yinju': 'Grasp the Robe: make another player choose: use a Slash on you, or skip their Action '
    + 'phase and Discard phase next turn',
  '#mobile__yinju-slash': 'Grasp the Robe: you must use a Slash on %src, otherwise skip your Action phase and '
    + 'Discard phase next turn',
  '#mobile__yinju_1_active': 'Grasp the Robe',
  '#mobile__yinju_2_trig': 'Grasp the Robe',
  '#mobile__yizheng_1_active': 'Righteous Contest',
  '#mobile__yizheng_2_trig': 'Righteous Contest',
  '#mobile__yuanmo-draw': 'Far-Reaching Plan: make %dest draw %arg cards?',
  '#mobile__yuanmo-move': 'Far-Reaching Plan: you can move a card in play, then you can make the player who '
    + 'lost the card draw cards',
  '#mobile__yuanmo_1_trig': 'Far-Reaching Plan',
  '#mobile__yuanmo_2_trig': 'Far-Reaching Plan',
  '#mobile__yuanshu': 'Ambition Ever Growing',
  '#mobile__yuejian-invoke': 'Frugality: you can discard two cards to recover 1 HP',
  '#mobile__yuejian_1_trig': 'Frugality',
  '#mobile__yuejian_2_maxcards': 'Frugality',
  '#mobile__yuejiu': 'Commander of the Zhongjia Army',
  '#mobile__yufeng': 'Ride the Wind: you can play a minigame; on success, make another player skip their '
    + 'Draw phase or their Action and Discard phases',
  '#mobile__yufeng-choice': 'Ride the Wind: guess the number of the next card',
  '#mobile__yufeng-choose': 'Ride the Wind: choose up to %arg other players; on their next turn they skip their '
    + 'Draw phase or their Action and Discard phases',
  '#mobile__yufeng_1_active': 'Ride the Wind',
  '#mobile__yufeng_2_trig': 'Ride the Wind',
  '#mobile__yufeng_delay': 'Ride the Wind',
  '#mobile__zengou': 'Fabricated Slander: look at a player\'s hand and choose one option',
  '#mobile__zengou-bname': 'Fabricated Slander: record a basic card name for %dest\'s Libel mark',
  '#mobile__zengou-choose': 'Fabricated Slander: look at %dest\'s hand and choose one option',
  '#mobile__zengou-use': 'Fabricated Slander: you can use in turn one basic card of each different name (they '
    + 'do not count toward the use limit and have no limit on the number of uses)',
  '#mobile__zengou_1_active': 'Slanderous Plot',
  '#mobile__zengou_2_trig': 'Slanderous Plot',
  '#mobile__zengou_3_maxcards': 'Slanderous Plot',
  '#mobile__zengou_4_trig': 'Slanderous Plot',
  '#mobile__zengou_trigger': 'Fabricated Slander',
  '#mobile__zerong': 'Upholding the Sect, Serving the Demon',
  '#mobile__zhangbao': 'General of the Earth',
  '#mobile__zhangchangpu': 'Stern Look, Strict Teaching',
  '#mobile__zhangfen': 'Brilliant Master of Engines',
  '#mobile__zhanggong': 'Long Song of the Western Regions',
  '#mobile__zhangjih': 'Borders Secure, People at Peace',
  '#mobile__zhangqiying': 'Prayers East and West',
  '#mobile__zhangwen': 'Embracing Virtue, Radiating Harmony',
  '#mobile__zhangyiy': 'Fierce Spirit, Loyal Heart',
  '#mobile__zhaoxiong-invoke': 'Manifest Malice: change your kingdom to Neutral, lose Humble Ambition, and gain '
    + 'Unbridled Might and Purge Dissent?',
  '#mobile__zhaoxiong_1_trig': 'Manifest Malice',
  '#mobile__zhenfeng': 'Rousing Blade: you can recover HP or modify another skill',
  '#mobile__zhenfeng-choose': 'Rousing Blade: change the X in \'%arg\' to one of these options',
  '#mobile__zhenfeng_1_active': 'Rousing Blade',
  '#mobile__zhennan-discard': 'Pacify the South: you can discard a card to deal 1 damage to a player',
  '#mobile__zhennan_1_trig': 'Pacify the South',
  '#mobile__zhenyi1': 'True Rite: you can discard the ♠ Purple Star to change the judgement result of %dest '
    + 'to ♠5 or <font color=\'red\'>♥5</font>',
  '#mobile__zhenyi2': 'True Rite: you can discard the ♣ Earth Queen to use a hand card as Peach',
  '#mobile__zhenyi3': 'True Rite: you can discard the <font color=\'red\'>♥</font> Jade Purity to increase '
    + 'the damage dealt to %dest by 1',
  '#mobile__zhenyi4': 'True Rite: you can discard the <font color=\'red\'>♦</font> Hook Star to randomly '
    + 'obtain one card of each of three card types from the draw pile',
  '#mobile__zhenyi_1_active': 'True Rite',
  '#mobile__zhenyi_2_trig': 'True Rite',
  '#mobile__zhenyi_3_trig': 'True Rite',
  '#mobile__zhenyi_4_trig': 'True Rite',
  '#mobile__zhixi_1_trig': 'Cessation',
  '#mobile__zhixi_2_prohibit': 'Cessation',
  '#mobile__zhouchu': 'Heroic Heart Unbound',
  '#mobile__zhoufu': 'Curse Bind: place a card as a Curse on a player',
  '#mobile__zhoufu_1_active': 'Curse Bind',
  '#mobile__zhoufu_2_trig': 'Curse Bind',
  '#mobile__zhoufu_3_trig': 'Curse Bind',
  '#mobile__zhoufu_4_trig': 'Curse Bind',
  '#mobile__zhouxuanz': 'Manoeuvre: guess the name or type of the next card a player uses or plays',
  '#mobile__zhouxuanz-give': 'Manoeuvre: you can distribute these cards as you like, or click Cancel to keep them '
    + 'yourself',
  '#mobile__zhouxuanz_1_active': 'Manoeuvre',
  '#mobile__zhouxuanz_2_trig': 'Manoeuvre',
  '#mobile__zhouxuanz_3_trig': 'Manoeuvre',
  '#mobile__zhujun': 'Merit Won, Army Victorious',
  '#mobile__zishu_1_trig': 'Personal Letter',
  '#mobile__zishu_2_trig': 'Personal Letter',
  '#mobile_dongjiao__cuilingyi': 'Crowned with a Golden Tail',
  '#mobile_dongjiao__weizhuang-choose': 'Splendid Attire: you can obtain a card from one of the other players among the targets',
  '#mobile_dongjiao__weizhuang-draw': 'Splendid Attire: you can make a player who has a revealed card draw two cards',
  '#mobile_dongjiao__weizhuang_1_trig': 'Finery',
  '#mobile_dongjiao__weizhuang_2_trig': 'Finery',
  '#mobile_dongjiao__weizhuang_3_trig': 'Finery',
  '#mobile_dongjiao__weizhuang_4_trig': 'Finery',
  '#mobile_dongjiao__weizhuang_5_trig': 'Finery',
  '#mobile_dongjiao__weizhuang_6_trig': 'Finery',
  '#mobile_dongjiao__weizhuang_7_trig': 'Finery',
  '#mobile_qianlong__fangzhu': 'Exile: you can choose a player and place a restriction on them',
  '#mobile_qianlong__fangzhu_1_active': 'Exile',
  '#mobile_qianlong__fangzhu_2_trig': 'Exile',
  '#mobile_qianlong__fangzhu_3_trig': 'Exile',
  '#mobile_qianlong__fangzhu_4_prohibit': 'Exile',
  '#mobile_qianlong__fangzhu_5_invalidity': 'Exile',
  '#mobile_qianlong__jiushi': 'Wine Poetry: you can turn your character card over, and it counts as using an Alcohol',
  '#mobile_qianlong__jiushi-turnover': 'Wine Poetry: turn your character card face up again?',
  '#mobile_qianlong__jiushi_1_active': 'Wine Poetry',
  '#mobile_qianlong__jiushi_2_trig': 'Wine Poetry',
  '#mobile_qianlong__jiushi_3_trig': 'Wine Poetry',
  '#mobile_qianlong__qingzheng-card': 'Uprightness: you can discard your hand cards of one suit, then look at a player\'s '
    + 'hand and discard one suit from it',
  '#mobile_qianlong__qingzheng-choose': 'Uprightness: choose another player, look at their hand and discard one suit from it',
  '#mobile_qianlong__qingzheng-throw': 'Uprightness: discard %dest\'s hand cards of one suit; if fewer than %arg cards are '
    + 'discarded, deal damage to them',
  '#mobile_qianlong__qingzheng_1_trig': 'Integrity',
  '#mobile_xiuge__cuilingyi': 'Crowned with a Golden Tail',
  '#mobile_xiuge__weizhuang-viewAs': 'Splendid Attire: you can convert a card',
  '#mobile_xiuge__weizhuang_1_active': 'Finery',
  '#mobile_xiuge__weizhuang_2_trig': 'Finery',
  '#mobile_xiuge__weizhuang_3_targetmod': 'Finery',
  '#mobile_xiuge__weizhuang_4_trig': 'Finery',
  '#mobile_xiuge__weizhuang_5_trig': 'Finery',
  '#moucuan_1_trig': 'Plot Usurpation',
  '#mouli': 'Scheme to Enthrone: make another player remove one of your Reserve cards, and they '
    + 'obtain a card of the same name from the draw pile',
  '#mouli-choice': 'Kingmaker: remove one Prep from %src and obtain a card of the same name from the draw pile',
  '#mouli_1_active': 'Enthronement Plot',
  '#mowang_1_trig': 'Demise',
  '#mowang_2_trig': 'Demise',
  '#muludawang': 'Chieftain of Bana Cave',
  '#muzhen1': 'Harmonious Ranks: put an equip card into another player\'s equip area and obtain a '
    + 'hand card from them',
  '#muzhen2': 'Harmonious Ranks: give a player two cards and obtain an equip card from them',
  '#muzhen_1_active': 'Harmonious Ranks',
  '#mxing__dongzhuo': 'Crush the Qiang, Secure the Border',
  '#mxing__fazheng': 'Tapping the Blade, Awaiting the Call',
  '#mxing__ganning': 'Ringing Bells, Sunken Arrows',
  '#mxing__huangzhong': 'Strong Grip, Fierce Bow',
  '#mxing__wanglang': 'Entrenched and Defiant',
  '#mxing__weiyan': 'Untamed Valour, Lone Battle',
  '#mxing__xuhuang': 'Calm in Counsel, Stern by Nature',
  '#mxing__zhanghe': 'Household General Who Pacifies the State',
  '#mxing__zhangliao': 'Treading Blades, Drinking Blood',
  '#mxing__zhiyan': 'Strict Rule: carry out one option',
  '#mxing__zhiyan_1_active': 'Strict Rule',
  '#mxing__zhiyan_2_prohibit': 'Strict Rule',
  '#mxing__zhoubuyi': 'Fledgling Sparrow, Clear Voice',
  '#nanhualaoxian': 'Riding the Wind Through the Void',
  '#naxue-discard': 'Embrace Learning: you can discard any number of cards and draw that many cards',
  '#naxue-give': 'Embrace Learning: you can give up to two other players a card each',
  '#naxue_1_trig': 'Embrace Learning',
  '#nigu': 'Defiant Hold: discard at least one card, all of different suits, making the players '
    + 'in your ATK range choose to give you a card or your damage +1',
  '#nigu-give': 'Defiant Hold: give %src a card, or click Cancel so the damage they deal this turn +1',
  '#nigu_1_active': 'Defiant Hold',
  '#nigu_2_trig': 'Defiant Hold',
  '#nos__cunsi': 'Preserve the Heir: you can turn your character card over to make a player obtain a '
    + 'Slash, and the next Slash they use deals +1 damage',
  '#nos__cunsi_1_active': 'Preserve the Heir',
  '#nos__cunsi_2_trig': 'Preserve the Heir',
  '#nos__guixiu_1_trig': 'Noble Maiden',
  '#nos__guixiu_2_trig': 'Noble Maiden',
  '#nos__huaxin': 'Purity Sweeps the Foul',
  '#nos__mifuren': 'Fragrance Sunk in Troubled Times',
  '#nos__xunchen': 'Blade of Schemes, Edge of Strategy',
  '#offensive_siege_engine': 'Great Siege Engine - Assault',
  '#offensive_siege_engine-invoke': 'Great Siege Engine - Assault: you can reduce the Great Siege Engine\'s durability by '
    + '1 so that the damage dealt to %dest is +%arg',
  '#offensive_siege_engine_skill': 'Great Siege Engine - Assault',
  '#pangdegong': 'Virtue Known to All the World',
  '#pangtong__gongli-prey': 'Mutual Honing: obtain one of these cards',
  '#pangtong__gongli_1_visibility': 'Mutual Honing',
  '#pangxi': 'Jade to Serve the Lord',
  '#panxiang-invoke': 'Halting Aid: you can choose one option',
  '#panxiang_1_trig': 'Halting Aid',
  '#peidong-viewAs': 'Reins Eastward: you can perform the matching action, which counts as using that card',
  '#peidong_1_active': 'Reins Eastward',
  '#peidong_2_distance': 'Reins Eastward',
  '#peixiu': 'Maps of Jin Unveil the Hidden',
  '#pengyang': 'Unable to Tell Bean from Wheat',
  '#pingcai': 'Appraise Talent: choose a treasure and wipe the dust from it',
  '#pingcai_1_active': 'Appraise Talent',
  '#pingcai_pangtong': 'Fledgling Phoenix: chain up to %arg players',
  '#pingcai_simahui': 'Water Mirror: move a %arg on the field',
  '#pingcai_wolong': 'Crouching Dragon: deal 1 fire damage to up to %arg players',
  '#pingcai_xushu': 'Mystic Sword: make a player draw a card and recover 1 HP',
  '#pinghe-give': 'Ford the River: give a hand card to another player',
  '#pinghe_1_trig': 'Ford the River',
  '#pinghe_2_maxcards': 'Ford the River',
  '#polu-use': 'Shield Breaker: use %arg',
  '#polu_1_trig': 'Shield Breaker',
  '#polu_2_trig': 'Shield Breaker',
  '#polus-choose': 'Rout the Foe: you can make any number of players each draw %arg cards',
  '#polus_1_trig': 'Rout the Invaders',
  '#powei-invoke': 'Break the Siege: you can carry out one option against %dest',
  '#powei_1_trig': 'Break the Siege',
  '#powei_2_trig': 'Break the Siege',
  '#powei_3_trig': 'Break the Siege',
  '#powei_4_trig': 'Break the Siege',
  '#powei_5_atkrange': 'Break the Siege',
  '#powei_active_1_active': 'Break the Siege',
  '#poxiang-active': 'Defy Surrender: give a card to a player, then draw three cards, remove all Valor and '
    + 'lose 1 HP',
  '#poxiang_1_active': 'Defy Surrender',
  '#poxiang_2_maxcards': 'Defy Surrender',
  '#premeditate_rule&': 'Premeditate',
  '#premediterate-use': 'You can use this Premeditate card %arg, or click Cancel to put all Premeditate cards '
    + 'into the discard pile',
  '#qianchong-choice': 'Modesty: choose a card type; this phase you use cards of that type with no limit on '
    + 'the number of uses and no distance restriction',
  '#qianchong_1_trig': 'Modesty',
  '#qianchong_2_targetmod': 'Modesty',
  '#qianchong_3_trig': 'Modesty',
  '#qiangyong-discard': 'Qiang Valor: discard %arg cards from %dest',
  '#qiangyong_1_trig': 'Qiang Valor',
  '#qianzhao': 'Might Resounding Afar',
  '#qiaogong': 'Noble Bearing, Great Renown',
  '#qiaosi': 'Ingenuity: you can perform the water-powered puppet show once and win a prize',
  '#qiaosi-give': 'Ingenuity: give %arg cards to another player',
  '#qiaosi_1_active': 'Ingenuity',
  '#qiaosi_log': 'Ingenuity spins up this result: %card',
  '#qiaozhou': 'Reading the Stars, Knowing Fate',
  '#qihui-remove': 'Enlightenment: remove two kinds of Enlightenment mark',
  '#qihui_1_trig': 'Enlightenment',
  '#qihui_2_trig': 'Enlightenment',
  '#qihui_3_targetmod': 'Enlightenment',
  '#qingdao-discard': 'Pure Tread: choose a card in %dest\'s area to discard',
  '#qingdao-invoke': 'Pure Tread: you can choose one option to carry out',
  '#qingdao-use': 'Pure Tread: you can use a hand card (with no distance restriction)',
  '#qingdao_1_trig': 'Pure Tread',
  '#qingjue-invoke': 'Appeal: %src uses %arg on %dest; you can draw a card and point fight with %src, '
    + 'cancelling the card if you win, or taking it over if you do not',
  '#qingjue_1_trig': 'Appeal',
  '#qingshix-invoke': 'Discerning Eye: choose a player; if they are of the same kingdom as you, you each '
    + 'draw a card, otherwise you discard one card from each of you',
  '#qingshix_1_trig': 'Discerning Eye',
  '#qingyu-invoke': 'Pure Jade: you must discard two hand cards to prevent the damage you are taking',
  '#qingyu_1_trig': 'Pure Jade',
  '#qingyu_2_trig': 'Pure Jade',
  '#qingyu_3_trig': 'Pure Jade',
  '#qinying': 'Esteemed Valor: you can recast any number of cards, which counts as using a Duel; '
    + 'either side can discard a card to count as playing a Slash',
  '#qinying&': 'You can discard a card in your area, which counts as playing a Slash (%arg uses left!)',
  '#qinying&_1_active': 'Esteemed Valor',
  '#qinying_1_active': 'Esteemed Valor',
  '#qinzheng_1_trig': 'Diligent Governance',
  '#qinzheng_2_trig': 'Diligent Governance',
  '#qinzheng_3_trig': 'Diligent Governance',
  '#qinzheng_4_trig': 'Diligent Governance',
  '#qirang_1_trig': 'Prayer Rite',
  '#qirang_2_trig': 'Prayer Rite',
  '#qirang_3_targetmod': 'Prayer Rite',
  '#qishe': 'Mounted Archery: you can use an equip card as Alcohol',
  '#qishe_1_active': 'Mounted Archery',
  '#qishe_2_maxcards': 'Mounted Archery',
  '#quanchong_1_trig': 'Imperial Favour',
  '#quanchong_2_trig': 'Imperial Favour',
  '#quanfeng1-invoke': 'Urge Ascension: you can lose Grand Bearing and gain all of %dest\'s skills, then your '
    + 'max HP +1 and you recover 1 HP',
  '#quanfeng2-invoke': 'Urge Ascension: gain 2 max HP and recover 4 HP?',
  '#quanfeng_1_trig': 'Urge Investiture',
  '#quanfeng_2_trig': 'Urge Investiture',
  '#quchong': 'Siege Works: you can recast an equip card',
  '#quchong-ask': 'Siege Works: choose a kind of Great Siege Engine to give to a player and make them use it',
  '#quchong-choose': 'Siege Works: you can give the Great Siege Engine in play to another player and make '
    + 'them use it',
  '#quchong_1_active': 'Siege Works',
  '#quchong_2_trig': 'Siege Works',
  '#quchong_3_trig': 'Siege Works',
  '#quchong_active_1_active': 'Siege Works',
  '#quedi-choice': 'Repel the Foe: do you want to use "Repel the Foe" on %dest? (used: %arg/%arg2)',
  '#quedi-discard': 'Repel the Foe: you can discard a basic card to give this %arg +1 damage',
  '#quedi_1_trig': 'Repel the Foe',
  '#quesong-choose': 'Sparrow\'s Ode: you can make a player choose to draw cards or recover HP',
  '#quesong_1_trig': 'Sparrow\'s Ode',
  '#qusheng_1_trig': 'Chariot Charge',
  '#qusheng_2_targetmod': 'Chariot Charge',
  '#qusheng_3_prohibit': 'Chariot Charge',
  '#rangjie-move': 'Ceded Authority: choose two players and move one card in play between them',
  '#rangjie_1_trig': 'Ceded Authority',
  '#realcard_viewas_1_active': 'Use',
  '#renshi_1_trig': 'Merciful Release',
  '#renshih': 'Benevolent Service: you can give a hand card to another player',
  '#renshih_1_active': 'Benevolent Service',
  '#renxing-choose': 'Unchecked Conduct: choose a player and discard one of their cards',
  '#renxing_1_trig': 'Unchecked Conduct',
  '#rongbei': 'War Readiness: make a player randomly use one equip card for each empty equip slot',
  '#rongbei_1_active': 'War Readiness',
  '#ruanhui': 'Discerner of Fortune and Misfortune',
  '#ruilian-ask': 'You can use Sage Gleaning on a player',
  '#ruilian-type': 'Sage Gleaning: you can choose one type among the cards %src discarded this turn, '
    + 'then you and they each obtain a card of that type from the discard pile',
  '#ruilian_1_trig': 'Sage Gleaning',
  '#ruilian_2_trig': 'Sage Gleaning',
  '#ruilian_3_trig': 'Sage Gleaning',
  '#ruilian_4_trig': 'Sage Gleaning',
  '#shameng': 'Blood Oath: discard two hand cards of the same color to make another player draw two '
    + 'cards, then you draw three cards',
  '#shameng_1_active': 'Blood Oath',
  '#shangjian_1_trig': 'Frugality',
  '#shangjian_2_trig': 'Frugality',
  '#shanjia': 'Mend Armour: draw three cards, then discard %arg cards',
  '#shanjia-discard': 'Mend Armour: you must discard %arg cards; if you discard no basic card or no trick '
    + 'card, you gain an extra effect',
  '#shanjia-slash': 'Mend Armour: you can count as using a Slash',
  '#shanjia_1_active': 'Mend Armour',
  '#shanjia_2_trig': 'Mend Armour',
  '#shanjia_3_targetmod': 'Mend Armour',
  '#shanxie': 'Master of Arms: you can obtain a weapon card from the draw pile (if there is none, '
    + 'you randomly obtain another player\'s weapon)',
  '#shanxie_1_active': 'Master of Arms',
  '#shanxie_2_trig': 'Master of Arms',
  '#shenpeij-choose': 'Divine Rain: choose 1 other player and deal %arg thunder damage to them',
  '#shenpeij-invoke': 'Divine Rain: you can recover %arg HP and gain Turn the Tide',
  '#shenpeij_1_trig': 'Divine Rain',
  '#shenzhuo_1_trig': 'Divine Shot',
  '#shenzhuo_2_prohibit': 'Divine Shot',
  '#shepan_1_trig': 'Awe the Rebels',
  '#sheque-invoke': 'Repelling Shot: you can use a Slash against %dest with no distance restriction that '
    + 'ignores armor',
  '#sheque_1_trig': 'Repelling Shot',
  '#sheque_2_trig': 'Repelling Shot',
  '#sheyi-invoke': 'Forsake the Heir: you can give %dest at least %arg cards to prevent the damage they '
    + 'would take',
  '#sheyi_1_trig': 'Forsake the Heir',
  '#shezi-choice': 'Seize the Timber: choose one area of %dest; if that area contains equip cards, '
    + 'obtain all cards in it',
  '#shezi-choose': 'Seize the Timber: choose a player; if the chosen area contains equip cards, obtain '
    + 'all cards in it',
  '#shezi_1_trig': 'Seize the Timber',
  '#shichangshi': 'Wreckers of the Moral Order',
  '#shidi_1_trig': 'Rival Force',
  '#shidi_2_trig': 'Rival Force',
  '#shidi_3_distance': 'Rival Force',
  '#shihe': 'Show of Force: you can start a point fight; if you win, prevent the damage they deal '
    + 'to you; if you do not win, you discard a random card',
  '#shihe_1_active': 'Show of Force',
  '#shihe_2_trig': 'Show of Force',
  '#shihe_3_trig': 'Show of Force',
  '#shiji-invoke': 'Force Strike: you can look at the hand cards of %dest and discard all red cards '
    + 'among them, then draw that many cards',
  '#shiji_1_trig': 'Force Strike',
  '#shijic': 'Heir to the Family Legacy',
  '#shishoul_1_trig': 'Faithful Watch',
  '#shishu-give': 'Trust in Guile: choose one of these cards to give to %dest',
  '#shishu_1_trig': 'Trust in Guile',
  '#shitao__gongli-choice': 'Mutual Honing: reduce the number of discardable card types for Esteemed Valor by %arg',
  '#shitao__gongli_1_trig': 'Mutual Honing',
  '#shixie': 'Patriarch of Southern Learning',
  '#shixin_1_trig': 'Defy',
  '#shizhong_1_trig': 'Strength in Numbers',
  '#shizhong_2_trig': 'Strength in Numbers',
  '#shizhong_3_trig': 'Strength in Numbers',
  '#shoufa-choose': 'Beast Arts: choose a player to carry out a random beast effect',
  '#shoufa_1_trig': 'Beast Arts',
  '#shoufa_2_trig': 'Beast Arts',
  '#shouye-invoke': 'Defense of Ye: you can hold a countermeasure with %dest; if you succeed, %arg has no '
    + 'effect on you and you obtain it',
  '#shouye_1_trig': 'Defense of Ye',
  '#shouye_2_trig': 'Defense of Ye',
  '#shouyuez-invoke': 'Bestow Music: you can choose one option to use',
  '#shouyuez_1_trig': 'Bestow Music',
  '#shouyuez_2_trig': 'Bestow Music',
  '#shouyuez_3_trig': 'Bestow Music',
  '#shouyuez_choose_1_active': 'Bestow Music',
  '#shuanghuai_1_trig': 'Frost Heart',
  '#shuchen_1_trig': 'Petition',
  '#shuliang-invoke': 'Grain Supply: you can remove one Grain to make %dest draw two cards',
  '#shuliang_1_trig': 'Grain Supply',
  '#shunyi-invoke': 'Effortless Flow: place all %arg hand cards on your character card until the end of '
    + 'the turn and draw a card?',
  '#shunyi_1_trig': 'Effortless Flow',
  '#shunyi_2_trig': 'Effortless Flow',
  '#shuxing-invoke': 'Binding Penalty: you can make this Slash have no effect on %dest, show their hand '
    + 'cards, and if there is a Dodge among them make them choose an option',
  '#shuxing_1_trig': 'Binding Penalty',
  '#shuyong-choose': 'Fair Valor: you can obtain a card in another player\'s area; if you do, they draw a card',
  '#shuyong-draw': 'Draw after having a card taken',
  '#shuyong_1_trig': 'Fair Valor',
  '#shuyong_2_trig': 'Fair Valor',
  '#sifeng-give': 'Waiting Blade: distribute these cards among up to two other players',
  '#sifeng_1_trig': 'Waiting Blade',
  '#sifeng_2_trig': 'Waiting Blade',
  '#sifeng_3_trig': 'Waiting Blade',
  '#sizi-active': 'Unbridled: you can spend charge points to gain special effects for that many turns',
  '#sizi_1_active': 'Unbridled',
  '#sizi_2_trig': 'Unbridled',
  '#sizi_3_trig': 'Unbridled',
  '#sizi_4_trig': 'Unbridled',
  '#strategy-ask': 'Respond to Strategy: if you and your opponent choose differently, %src\'s Strategy '
    + 'succeeds; otherwise %src fails',
  '#sunhao': 'When Will This Sun Perish',
  '#sunru': 'Lotus Rising from the Water',
  '#sunshaow': 'Know the Foe, Guard the Frontier',
  '#sunyi': 'Fierce and Hot-Tempered',
  '#suwang-choose': 'Long Renown: you can make another player draw two cards',
  '#suwang-invoke': 'Long Renown: obtain all your Long Renown cards instead, then you can make another '
    + 'player draw two cards',
  '#suwang_1_trig': 'Long Renown',
  '#suwang_2_trig': 'Long Renown',
  '#suwang_3_trig': 'Long Renown',
  '#tamo-invoke': 'Couch Counsel: you can rearrange the seating order of the players on the field',
  '#tamo_1_trig': 'Couch Counsel',
  '#tanfeng1-choose': 'Probe the Edge: discard up to two cards from a player; if their hand size is not '
    + 'greater than yours, they skip their Draw phase',
  '#tanfeng2-choose': 'Probe the Edge: deal damage to a player; if their HP is not greater than yours, they '
    + 'skip their Action phase',
  '#tanfeng_1_trig': 'Probing Blade',
  '#taoluanh-invoke': 'Quell Rebellion: the judgement of %dest is about to take effect, you can cancel this '
    + 'judgement and perform one option!',
  '#taoluanh_1_trig': 'Quell Rebellion',
  '#taomie-choose': 'Extermination: you can give this %arg to another player',
  '#taomie-invoke': 'Extermination: make %dest gain the Extermination mark?',
  '#taomie_1_trig': 'Extermination',
  '#taomie_2_trig': 'Extermination',
  '#taomie_3_trig': 'Extermination',
  '#taomie_4_atkrange': 'Extermination',
  '#taoqian': 'Bearing Gentle Benevolence',
  '#tiansuan': 'Heaven\'s Reckoning: you can draw a Fate Lot (you can add one extra lot of your choice)',
  '#tiansuan-choose': 'Heaven\'s Reckoning: the lot drawn is %arg, choose a player to gain the lot\'s effect',
  '#tiansuan_1_active': 'Heaven\'s Reckoning',
  '#tiansuan_2_trig': 'Heaven\'s Reckoning',
  '#tiansuan_3_trig': 'Heaven\'s Reckoning',
  '#tiansuan_4_trig': 'Heaven\'s Reckoning',
  '#tiansuan_5_prohibit': 'Heaven\'s Reckoning',
  '#tiansuan_6_trig': 'Heaven\'s Reckoning',
  '#tiansuan_7_trig': 'Heaven\'s Reckoning',
  '#tiantao-choice': 'Heavenly Torrent: choose 1 area and discard all cards in it',
  '#tiantao-choose': 'Heavenly Torrent: choose any number of other players and discard 1 card each from '
    + 'those players\' %arg',
  '#tiantao_1_trig': 'Heavenly Torrent',
  '#tianyin_1_trig': 'Heavenly Sound',
  '#tianzuo_1_trig': 'Heaven\'s Aid',
  '#tianzuo_2_trig': 'Heaven\'s Aid',
  '#tingwei-choice': 'Thunderous Might: carry out any options to make %src lose that many Thunder marks; '
    + 'if you carry out none, you become chained',
  '#tingwei-choose': 'Thunderous Might: gain 4 Thunder marks and make one target player choose any options '
    + 'to carry out',
  '#tingwei-give': 'Thunderous Might: give %src an equip card',
  '#tingwei-invoke': 'Thunderous Might: gain 4 Thunder marks and make %dest choose any options to carry out',
  '#tingwei_1_trig': 'Thunderous Might',
  '#tingwei_2_trig': 'Thunderous Might',
  '#tingwei_3_trig': 'Thunderous Might',
  '#tongqu-choose': 'Canal Works: you can lose 1 HP to give a player a Canal mark',
  '#tongqu-give': 'Canal Works: give a card to a player who has Canal, or discard a card',
  '#tongqu-use': 'Canal Works: use %arg',
  '#tongqu_1_trig': 'Canal Works',
  '#tongqu_2_trig': 'Canal Works',
  '#tongqu_3_trig': 'Canal Works',
  '#tongqu_4_trig': 'Canal Works',
  '#tongqu_5_trig': 'Canal Works',
  '#tongqu__jiakui': 'Order Across Ten Thousand Li',
  '#tongqu_active_1_active': 'Canal Works',
  '#tunchu-put': 'Stockpile: you can place any number of hand cards as Grain',
  '#tunchu_1_trig': 'Stockpile',
  '#tunchu_2_trig': 'Stockpile',
  '#tunchu_3_prohibit': 'Stockpile',
  '#util_addandcanceltarget': 'Add or Remove Targets',
  '#wangfuzhaolei': 'Unwavering Loyalty',
  '#wangjing': 'Blue Clouds, Lone Bamboo',
  '#wangjingm_1_trig': 'March on the Capital',
  '#wangjingm_2_trig': 'March on the Capital',
  '#wangjun': 'First to Take the Stone City',
  '#wanglang': 'The Phoenix Babbler',
  '#wangzhuan-invoke': 'Usurped Authority: you can draw a card to make the current turn player\'s non-forced '
    + 'skills invalid this turn',
  '#wangzhuan_1_trig': 'Usurped Authority',
  '#wanlan-invoke': 'Stem the Tide: you can discard all your equipment to prevent the fatal damage to %dest',
  '#wanlan_1_trig': 'Stem the Tide',
  '#weifeng-choose': 'Imposing Might: make a player gain a Fear mark',
  '#weifeng-prey': 'Imposing Might: obtain a card from %dest',
  '#weifeng_1_trig': 'Imposing Might',
  '#weifeng_2_trig': 'Imposing Might',
  '#weifeng_3_trig': 'Imposing Might',
  '#weiming-choose': 'Mighty Mandate: choose a player who has not been chosen before; if they die before '
    + 'you kill another player who has not been chosen, Mighty Mandate fails',
  '#weiming_1_trig': 'Mighty Mandate',
  '#weiming_2_trig': 'Mighty Mandate',
  '#weitong_1_targetmod': 'Guard the Line',
  '#weizhuang_1_trig': 'Finery',
  '#weizhuang_2_trig': 'Finery',
  '#weizhuang_3_trig': 'Finery',
  '#weizhuang_4_trig': 'Finery',
  '#weizhuang_5_trig': 'Finery',
  '#weizhuang_6_targetmod': 'Finery',
  '#weizhuang_7_maxcards': 'Finery',
  '#wisdom__qiai': 'Seven Sorrows: give a non-basic card to a player, and they choose to make you '
    + 'recover HP or draw cards',
  '#wisdom__qiai-choose': 'Seven Sorrows: choose one option for %src to carry out',
  '#wisdom__qiai_1_active': 'Seven Sorrows',
  '#wisdom__shanxi-choose': 'War Proclamation: choose another player to gain the "Proclamation" mark (if it is '
    + 'already in play, the mark moves to that player)',
  '#wisdom__shanxi-give': 'War Proclamation: give %src two cards, or else lose 1 HP',
  '#wisdom__shanxi_1_trig': 'War Proclamation',
  '#wisdom__shanxi_2_trig': 'War Proclamation',
  '#wufei-invoke': 'Slander: make %dest take 1 damage',
  '#wufei_1_trig': 'Slander',
  '#wufei_2_trig': 'Slander',
  '#wuke': 'Wisdom, Stratagem and Guile',
  '#wuku_1_trig': 'Armoury',
  '#wuling': 'Five Beasts: teach a player the Five Animal Frolics',
  '#wuling-choice': 'Five Beasts: choose the order in which to teach %dest the Five Animal '
    + 'Frolics<br>Chosen so far: %arg',
  '#wuling-choose': 'Five Beasts: choose another player and obtain a card from their equip area',
  '#wuling_1_active': 'Five Beasts',
  '#wuling_2_trig': 'Five Beasts',
  '#wuling_3_trig': 'Five Beasts',
  '#wuling_4_prohibit': 'Five Beasts',
  '#wuling_5_trig': 'Five Beasts',
  '#wuyuan_1_active': 'Martial Bond',
  '#xiangchong': 'Mountain That Guards the Army',
  '#xianghai_1_filter': 'Village Scourge',
  '#xianghai_2_maxcards': 'Village Scourge',
  '#xiangzhen_1_trig': 'Elephant Formation',
  '#xiangzhen_2_trig': 'Elephant Formation',
  '#xiangzhen_3_trig': 'Elephant Formation',
  '#xianjian-invoke': 'Breach: you can use Breach on %dest and choose one option',
  '#xianjian-put': 'Breach: put this Slash into an empty equip slot of %dest',
  '#xianjian_1_trig': 'Breach',
  '#xianjian_2_trig': 'Breach',
  '#xiaoge_1_trig': 'Valiant Lance',
  '#xiaoge_2_trig': 'Valiant Lance',
  '#xiaoni': 'Insolence: you can spend Mandate points (they can drop below zero) to use a card as '
    + 'a damage card!',
  '#xiaoni_1_active': 'Insolence',
  '#xiaoni_2_trig': 'Insolence',
  '#xiaoni_3_maxcards': 'Insolence',
  '#xiaxing-choice': 'Knight Errant: remove two Enlightenment marks to obtain Mystic Sword?',
  '#xiaxing_1_trig': 'Knight Errant',
  '#xiaxing_2_trig': 'Knight Errant',
  '#xichang-choose': 'Don the Robe: choose an Attire to gain',
  '#xichang_1_trig': 'Don the Robe',
  '#xichang_2_trig': 'Don the Robe',
  '#xichang_3_visibility': 'Don the Robe',
  '#xiefang_1_distance': 'Gather Blossoms',
  '#xiezhi_1_trig': 'Harbored Ambition',
  '#xing__yishi-invoke': 'Righteous Release: reduce the damage dealt to %dest by 1 and obtain a card from '
    + 'their equip area?',
  '#xing__yishi_1_trig': 'Righteous Release',
  '#xingbu-discard': 'Star Divination: discard a card',
  '#xingbu-target': 'Star Divination: you can choose another player and make them gain "%arg"',
  '#xingbu_1_trig': 'Star Divination',
  '#xingbu_2_trig': 'Star Divination',
  '#xingbu_3_trig': 'Star Divination',
  '#xingbu_4_trig': 'Star Divination',
  '#xingbu_5_trig': 'Star Divination',
  '#xingbu_6_targetmod': 'Star Divination',
  '#xinghun': 'Star Soul: look at, exchange and arrange the top 5 cards of the draw pile',
  '#xinghun-choose': 'Star Soul: make 1 player choose the cards to show, then you use the Slash among them '
    + 'against them',
  '#xinghun-choosecard': 'Star Soul: choose 5 cards from the top of the draw pile and %src\'s hand cards to '
    + 'show; the Slash among them will be used against you',
  '#xinghun-exchange': 'Star Soul: look at, exchange and arrange these cards, then go to the next step',
  '#xinghun_1_active': 'Star Soul',
  '#xingqi-invoke': 'Star Omen: you can remove a Prep and obtain a card of the same name from the draw pile',
  '#xingqi_1_trig': 'Star Omen',
  '#xingqi_2_trig': 'Star Omen',
  '#xingtu_1_trig': 'Cartography',
  '#xingtu_2_trig': 'Cartography',
  '#xingtu_3_targetmod': 'Cartography',
  '#xiongjinAnother-invoke': 'Bold Advance: you can make %dest draw %arg cards; at the start of their Discard '
    + 'phase this turn they discard all their basic cards',
  '#xiongjinUser-invoke': 'Bold Advance: you can draw %arg cards, and at the start of your Discard phase this '
    + 'turn you discard all your non-basic cards',
  '#xiongjin_1_trig': 'Bold Advance',
  '#xiongjin_2_trig': 'Bold Advance',
  '#xiongjin_discard': 'Bold Advance',
  '#xiongsi': 'Wanton Cruelty: you can discard all your hand cards to make every other player lose 1 HP!',
  '#xiongsi_1_active': 'Wanton Cruelty',
  '#xiongtus': 'Vicious Scheme: show a player\'s hand card, then choose to discard that card, or to '
    + 'discard cards and deal damage to them',
  '#xiongtus-damage': 'Vicious Scheme: click OK to deal 1 damage to %dest, or click Cancel to discard the '
    + 'card they showed',
  '#xiongtus-discard': 'Vicious Scheme: discard %arg cards to deal 1 damage to %dest, or click Cancel to '
    + 'discard the card they showed',
  '#xiongtus_1_active': 'Vicious Scheme',
  '#xiongtus_2_trig': 'Vicious Scheme',
  '#xiongzi-invoke': 'Majestic Bearing: you can restrict your other skills to a single fixed option usable '
    + 'only during your turn, then draw 2 cards',
  '#xiongzi_1_trig': 'Majestic Bearing',
  '#xiugeng-choose': 'Tend the Fields: you can record the hand card count of up to two players, and those '
    + 'players will draw cards or gain hand limit',
  '#xiugeng_1_trig': 'Tend the Fields',
  '#xiugeng_2_trig': 'Tend the Fields',
  '#xizhan-invoke': 'Playful Skirmish: on %dest\'s turn, discard a card and carry out the effect matching '
    + 'its suit, or click Cancel to lose 1 HP',
  '#xizhan_1_trig': 'Playful Skirmish',
  '#xuancun-invoke': 'Held Reserve: you can make %dest draw %arg cards',
  '#xuancun_1_trig': 'Lifeline',
  '#xuanjian_sword_skill': 'Dark Sword: use all your hand cards of one suit as a Slash',
  '#xuanjian_sword_skill&_1_active': 'Mystic Sword',
  '#xuanjian_sword_skill_update': 'Dark Sword: use a hand card as a Slash',
  '#xuetu_1_active': 'Blood Path',
  '#xuetu_v2_1_active': 'Blood Path',
  '#xuetu_v3_1_active': 'Blood Path',
  '#xuetu_v3_yang': 'Blood Path: you can recover 1 HP and make a player discard two cards',
  '#xuetu_v3_yin': 'Blood Path: you can draw a card and deal 1 damage to a player',
  '#xuetu_yang': 'Blood Path: you can make a player recover 1 HP',
  '#xuetu_yin': 'Blood Path: you can make a player draw two cards',
  '#xunyi-choose': 'Martyrdom: choose a player to gain the Duty mark',
  '#xunyi_1_trig': 'Martyrdom',
  '#xunyi_2_trig': 'Martyrdom',
  '#xunyi_3_trig': 'Martyrdom',
  '#xunyi_4_trig': 'Martyrdom',
  '#xushu__gongli_1_targetmod': 'Mutual Honing',
  '#xuye-ask': 'Foster Growth: place a card from %dest\'s area on top of the draw pile',
  '#xuye-invoke': 'Foster Growth: you can make %dest draw two cards, then if they have the most hand '
    + 'cards in play, you place a card from their area on top of the draw pile',
  '#xuye_1_trig': 'Foster Growth',
  '#yajun-invoke': 'Noble Bearing: you can start a point fight with another player using a card you '
    + 'obtained this turn',
  '#yajun-put': 'Noble Bearing: you can put one of those cards on top of the draw pile',
  '#yajun_1_trig': 'Noble Bearing',
  '#yajun_2_trig': 'Noble Bearing',
  '#yajun_3_trig': 'Noble Bearing',
  '#yance-choice': 'Stratagem: predict a card that will be used (card %arg of %arg2)',
  '#yance-prey': 'Stratagem: obtain a card matching the condition you declared',
  '#yance_1_trig': 'Stratagem',
  '#yance_2_trig': 'Stratagem',
  '#yance_3_trig': 'Stratagem',
  '#yangbiao': 'Virtue Renowned Within the Seas',
  '#yangfeng': 'Loyal Valour Cut Short',
  '#yangfu': 'Valor to Shake the Mighty Lion',
  '#yangjie': 'Feigned Relief: you can start a point fight; if you do not win, you can make another '
    + 'player count as using a fire Slash on the player you fought points with',
  '#yangjie-choose': 'Feigned Relief: you can choose a player; it counts as them using a fire Slash on %dest',
  '#yangjie_1_active': 'Feigned Relief',
  '#yanhui-choose': 'Flame Eddy: you can deal 1 fire damage to an eligible player, or cancel to draw %arg '
    + 'cards instead',
  '#yanhui-force': 'Flame Eddy: deal 1 fire damage to an eligible player',
  '#yanhui-invoke': 'Flame Eddy: you can show a hand card of one target player',
  '#yanhui_1_trig': 'Flame Eddy',
  '#yanhui_2_trig': 'Flame Eddy',
  '#yanhui_3_trig': 'Flame Eddy',
  '#yanji-choice': 'Strict Discipline: choose your Rectify condition for this turn',
  '#yanji-invoke': 'Strict Discipline: you can perform Rectify, and if it succeeds you gain a reward '
    + 'after your Discard phase ends',
  '#yanji-reward': 'Strict Discipline: Rectify succeeded, choose one Rectify reward',
  '#yanji_1_trig': 'Strict Discipline',
  '#yanji_2_trig': 'Strict Discipline',
  '#yanpu': 'Surveying the Age, Reading the Tide',
  '#yaohu-choice': 'Invite the Tiger: choose the kingdom you want to invite',
  '#yaohu-choose': 'Invite the Tiger: choose the target for %dest to use a Slash against',
  '#yaohu-give': 'Invite the Tiger: you must give %src two cards, or they cancel this %arg',
  '#yaohu-slash': 'Invite the Tiger: you must use a Slash against %dest, or this phase, when you use a '
    + 'damage card targeting %src, you must give them cards',
  '#yaohu_1_trig': 'Invite the Tiger',
  '#yaohu_2_trig': 'Invite the Tiger',
  '#yaohu_3_trig': 'Invite the Tiger',
  '#yichong-choose': 'Shifting Favour: choose another player and obtain every card of that suit in their '
    + 'equip area plus one hand card of that suit',
  '#yichong_1_trig': 'Shifting Favour',
  '#yichong_2_trig': 'Shifting Favour',
  '#yichong_3_trig': 'Shifting Favour',
  '#yijie_1_trig': 'Final Admonition',
  '#yijin-choose': 'Vast Gold: give one kind of \'Gold\' to another player',
  '#yijin_1_trig': 'Vast Gold',
  '#yijin_2_trig': 'Vast Gold',
  '#yijin_3_trig': 'Vast Gold',
  '#yijin_4_trig': 'Vast Gold',
  '#yijin_5_trig': 'Vast Gold',
  '#yijin_6_trig': 'Vast Gold',
  '#yijin_7_trig': 'Vast Gold',
  '#yijin_8_trig': 'Vast Gold',
  '#yijin_9_targetmod': 'Vast Gold',
  '#yijin_active_1_active': 'Vast Gold',
  '#yingba': 'Heroic Supremacy: you and a player each lose 1 max HP, and they gain 1 Pacify mark',
  '#yingba_1_active': 'Heroic Supremacy',
  '#yingba_2_targetmod': 'Heroic Supremacy',
  '#yingjia-choose': 'Escort the Emperor: discard a hand card to make a player gain an extra turn',
  '#yingjia_1_trig': 'Imperial Escort',
  '#yingjia_2_trig': 'Imperial Escort',
  '#yingjian-choose': 'Shadow Arrow: you can count as using a Slash that ignores distance',
  '#yingjian_1_trig': 'Shadow Arrow',
  '#yingyuan-card': 'Support: you can give %arg to another player',
  '#yingyuan_1_trig': 'Support',
  '#yinship_1_trig': 'Reclusion',
  '#yinship_2_prohibit': 'Reclusion',
  '#yinzhan_1_trig': 'Battle Draught',
  '#yinzhan_2_trig': 'Battle Draught',
  '#yirang-choose': 'Gracious Yielding: give all your non-basic cards to a player, raise your max HP to '
    + 'match theirs and recover HP',
  '#yirang_1_trig': 'Gracious Yielding',
  '#yixiang_1_trig': 'Righteous Aid',
  '#yixing': 'Shifting Form: put all Gear cards into the discard pile and draw that many cards, '
    + 'then you can place any number of equip cards as Gear',
  '#yixing-put': 'Shifting Form: you can place any number of equip cards as Gear',
  '#yixing_1_active': 'Shifting Form',
  '#yixing_2_atkrange': 'Shifting Form',
  '#yiyongw-invoke': 'Extraordinary Valour: you can obtain this %arg and use it as a Slash on %dest',
  '#yiyongw_1_trig': 'Extraordinary Valour',
  '#yiyongw_2_trig': 'Extraordinary Valour',
  '#yizan1': 'Loyal Support: you can use or play two cards (at least one of which is a basic card) '
    + 'as any basic card',
  '#yizan2': 'Loyal Support: you can use or play a basic card as any basic card',
  '#yizan_1_active': 'Loyal Support',
  '#yizhu-card': 'Lost Pearl: shuffle two cards into the draw pile as Lost Pearls',
  '#yizhu-invoke': 'Lost Pearl: you can cancel the %arg used by %dest',
  '#yizhu_1_trig': 'Lost Pearl',
  '#yizhu_2_trig': 'Lost Pearl',
  '#yizhu_3_trig': 'Lost Pearl',
  '#youlve_1_trig': 'Roving Raid',
  '#youye-give': 'Lasting Enterprise: distribute all \'Reserve\' cards as you wish',
  '#youye_1_trig': 'Lasting Enterprise',
  '#youye_2_trig': 'Lasting Enterprise',
  '#youye_3_trig': 'Lasting Enterprise',
  '#youyi': 'Wandering Physician: you can remove every card from the Benevolence pile to make all '
    + 'players recover 1 HP',
  '#youyi-invoke': 'Wandering Physician: put the cards discarded this phase into the Benevolence pile?',
  '#youyi_1_active': 'Wandering Physician',
  '#youyi_2_trig': 'Wandering Physician',
  '#yuanhuan': 'Rain Follows the Carriage',
  '#yuanqing_1_trig': 'Clear Depths',
  '#yuejin__heyu-put': 'Breach: you can put this Slash into an empty equip slot of %dest',
  '#yuejin__heyu_1_trig': 'Joint Defense',
  '#yuejin__heyu_2_trig': 'Joint Defense',
  '#yuetan-give': 'Tanxi Leap: you can give %dest a card; if they take no damage, you draw 1 card',
  '#yuetan-invoke': 'Tanxi Leap: you can use this skill; if you take no damage from this card, you draw 1 card',
  '#yuetan_1_trig': 'Tanxi Leap',
  '#yuetan_2_trig': 'Tanxi Leap',
  '#yueyuan-active': 'Leap from the Deep: you can draw %arg cards, then clear one suit recorded by your '
    + 'Hidden Blade',
  '#yueyuan-remove': 'Leap from the Deep: choose and clear one suit recorded by your Hidden Blade',
  '#yueyuan_1_active': 'Leap from the Deep',
  '#yuhua_1_trig': 'Ascension',
  '#yuhua_2_maxcards': 'Ascension',
  '#yuli_1_trig': 'Thunder Rein',
  '#yuli_2_trig': 'Thunder Rein',
  '#yunan_1_trig': 'Devious Revolt',
  '#yuxiang_1_trig': 'Elephant Rider',
  '#yuxiang_2_distance': 'Elephant Rider',
  '#zaoli-discard': 'Restless Rage: choose at least one card; you discard those cards and all Rage, then '
    + 'draw the same number of cards',
  '#zaoli_1_trig': 'Restless Rage',
  '#zaoli_2_trig': 'Restless Rage',
  '#zaoli_3_trig': 'Restless Rage',
  '#zaoli_4_trig': 'Restless Rage',
  '#zaoli_5_prohibit': 'Restless Rage',
  '#zhangbu': 'Victory First, Righteousness Second',
  '#zhangliao__heyu_1_targetmod': 'Joint Defense',
  '#zhangming_1_trig': 'Manifest Renown',
  '#zhangming_2_trig': 'Manifest Renown',
  '#zhangming_3_maxcards': 'Manifest Renown',
  '#zhangzhongjing': 'Sage of Medicine',
  '#zhanlie-choice': 'Blazing War: choose up to %arg extra effects for this Slash',
  '#zhanlie-slash': 'Blazing War: you can count as using a Slash carrying up to %arg extra effects',
  '#zhanlie_1_trig': 'Blazing War',
  '#zhanlie_2_trig': 'Blazing War',
  '#zhanlie_3_trig': 'Blazing War',
  '#zhanlie_4_trig': 'Blazing War',
  '#zhanlie_5_trig': 'Blazing War',
  '#zhanlie_discard': 'Blazing War: discard a card, or you cannot respond to this Slash',
  '#zhanlie_target': 'Blazing War: choose an extra target for this Slash',
  '#zhanshi-invoke': 'Survey the Field: discard any number of cards and choose that many players in the '
    + 'point fight; you draw three cards for each chosen player who wins',
  '#zhanshi_1_trig': 'Survey the Field',
  '#zhanshi_2_trig': 'Survey the Field',
  '#zhaohan_1_trig': 'Glorify the Han',
  '#zhaohuo_1_trig': 'Invite Calamity',
  '#zhaotongzhaoguang': 'Aiding a Late Revival',
  '#zhaoxin': 'Manifest Intent: you can place any number of cards as \'Ambition\' and draw the same '
    + 'number of cards (at most three \'Ambition\')',
  '#zhaoxin-choose': 'Manifest Intent: choose one \'Ambition\' of %src to obtain',
  '#zhaoxin-damage': 'Manifest Intent: deal 1 damage to %dest?',
  '#zhaoxin-get': 'Manifest Intent: you can choose one \'Ambition\' of %src to obtain, then they can deal '
    + '1 damage to you',
  '#zhaoxin_1_active': 'Manifest Intent',
  '#zhaoxin_2_trig': 'Manifest Intent',
  '#zhenbian_1_trig': 'Border Guard',
  '#zhenbian_2_maxcards': 'Border Guard',
  '#zhenfu-choose': 'Pacify: you can make another player gain 1 shield',
  '#zhenfu_1_trig': 'Pacify',
  '#zhengjian-choose': 'Choose the target of Candid Recommendation',
  '#zhengjian_1_trig': 'Candid Recommendation',
  '#zhengjian_2_trig': 'Candid Recommendation',
  '#zhengjian_3_trig': 'Candid Recommendation',
  '#zhengjian_4_trig': 'Candid Recommendation',
  '#zhengjian_5_trig': 'Candid Recommendation',
  '#zhengjing': 'Collate the Classics: begin collating the classics!',
  '#zhengjing-give': 'Collate the Classics: you can place the cards you collated as a player\'s Canon',
  '#zhengjing_1_active': 'Collate the Classics',
  '#zhengjing_2_trig': 'Collate the Classics',
  '#zhengjing_choice': 'Collate the classics!',
  '#zhengjun-choice': 'Muster: choose your Discipline condition for this turn',
  '#zhengjun-choose': 'Muster: you can make another player also gain the Discipline reward',
  '#zhengjun-invoke': 'Muster: you can perform Discipline; if it succeeds, you gain the reward after your '
    + 'Discard phase ends, and you can make another player gain the reward',
  '#zhengjun-reward': 'Muster: Discipline succeeded, choose one Discipline reward',
  '#zhengjun-support': 'Muster: choose the Discipline reward that %dest gains',
  '#zhengjun_1_trig': 'Muster',
  '#zhengjun_2_trig': 'Muster',
  '#zhengnan-choice': 'Southern Campaign: choose the skill to gain',
  '#zhengnan_1_trig': 'Southern Campaign',
  '#zhengpeng-choose': 'Drifting Tumbleweed: you can choose a player and lose %arg HP, then draw the '
    + 'corresponding number of cards',
  '#zhengpeng_1_trig': 'Drifting Tumbleweed',
  '#zhengshuo': 'Rightful Calendar: make all players discard all their hand cards, reshuffle, then '
    + 'each draw four cards',
  '#zhengshuo_1_active': 'Rightful Calendar',
  '#zhengxuan': 'All Learning Gathered, the Way Made Clear',
  '#zhenjun-choose': 'Steady the Army: give a card to another player; they choose either to use a Slash or '
    + 'to let you deal damage',
  '#zhenjun-damage': 'Steady the Army: you can deal 1 damage to a player',
  '#zhenjun-use': 'Steady the Army: use a non-black Slash',
  '#zhenjun_1_trig': 'Steady the Army',
  '#zhenting-invoke': 'Guard the Court: %src used %arg on %dest, you can choose one option',
  '#zhenting_1_trig': 'Guard the Court',
  '#zhenxing-get': 'Steady March: you can obtain one of these cards',
  '#zhenxing_1_trig': 'Steady March',
  '#zhenxing_2_trig': 'Steady March',
  '#zherui_1_trig': 'Break the Edge',
  '#zherui_2_trig': 'Break the Edge',
  '#zhijie-invoke': 'Wise Counsel: you can show one of %dest\'s hand cards; when they use a card of the '
    + 'same type this phase they will draw and discard',
  '#zhijie_1_trig': 'Wise Counsel',
  '#zhijie_2_trig': 'Wise Counsel',
  '#zhijie_3_trig': 'Wise Counsel',
  '#zhilve': 'Strategic Insight: lose 1 HP to increase your hand limit this turn by 1, then carry '
    + 'out an option',
  '#zhilve_1_active': 'Strategic Insight',
  '#zhimeng-choose': 'Wise Alliance: you can choose a player and split your hand cards evenly at random '
    + 'with them',
  '#zhimeng_1_trig': 'Wise Alliance',
  '#zhiyi-use': 'Hold to Duty: it counts as using a basic card, or click Cancel to draw a card',
  '#zhiyi_1_trig': 'Uphold Righteousness',
  '#zhongao_1_trig': 'Proud Loyalty',
  '#zhongao_2_trig': 'Proud Loyalty',
  '#zhongao_3_trig': 'Proud Loyalty',
  '#zhongao_4_trig': 'Proud Loyalty',
  '#zhoulin': 'Cursed Scales: you can gain 2 Shield and choose one Beast Arts effect that always '
    + 'happens until the start of your next turn',
  '#zhoulin_1_active': 'Cursed Scales',
  '#zhoulin_2_trig': 'Cursed Scales',
  '#zhouqun': 'The Latter Sage',
  '#zhouxian-discard': 'Provincial Sage: discard a card of a type that appears among the revealed cards, '
    + 'otherwise %dest is removed as a target of %arg',
  '#zhouxian_1_trig': 'Provincial Sage',
  '#zhuangshi-discard': 'Valiant Oath: you can discard at least one hand card to make that many of the first '
    + 'cards you use this phase ignore distance and be unable to be responded to',
  '#zhuangshi-loseHp': 'Valiant Oath: you can lose at least 1 HP to make that many of the first cards you '
    + 'use this phase not count toward use limits',
  '#zhuangshi_1_trig': 'Valiant Oath',
  '#zhuangshi_2_trig': 'Valiant Oath',
  '#zhuangshi_3_targetmod': 'Valiant Oath',
  '#zhugeguo': 'Phoenix Pavilion, Riding the Mist',
  '#zhugeke': 'Raised the House, Doomed the Clan',
  '#zhugeliang__gongli_1_visibility': 'Mutual Honing',
  '#zhuguo': 'Aid the State: make a player adjust their hand to their max HP (at most 5) and '
    + 'resolve the effect',
  '#zhuguo-choose': 'Aid the State: choose another player; %dest can use a Slash against them',
  '#zhuguo-use': 'Aid the State: you can use a Slash against %dest with no distance restriction and no '
    + 'limit on the number of uses',
  '#zhuguo_1_active': 'Aid the State',
  '#zhujian': 'Build the Fleet: make at least two players who have cards in their equip area each '
    + 'draw a card',
  '#zhujian_1_active': 'Build the Fleet',
  '#zhujic': 'Heir to the Family Craft',
  '#zhujis-invoke': 'Build Ramparts: you can discard your hand cards of one suit, then obtain and use an '
    + 'equip card of that suit from the draw pile',
  '#zhujis-use': 'Build Ramparts: use %arg',
  '#zhujis_1_trig': 'Build Ramparts',
  '#zifu_1_trig': 'Self-Binding',
  '#zuici_1_trig': 'Indictment',
  '#zujin-jink': 'Halt the Advance: you can use or play a basic card as Dodge or Nullification',
  '#zujin-slash': 'Halt the Advance: you can use or play a basic card as Slash',
  '#zujin_1_active': 'Halt the Advance',
  '#zundi': 'Honor the Heir: discard a hand card and choose a player, then you judge; on black '
    + 'they draw three cards, on red they can move a card on the field',
  '#zundi-move': 'Honor the Heir: you can move a card on the field',
  '#zundi_1_active': 'Honor the Heir',
  '#zuoxing': 'Grant Favor: you can make %dest lose 1 max HP, and it counts as using a normal trick card',
  '#zuoxing_1_active': 'Fortune\'s Aide',
  '#zuoyou-yang': 'Aid and Guard: you can make a player draw three cards, then they discard two hand cards',
  '#zuoyou-yin': 'Aid and Guard: you can make a player discard a hand card, then they gain 1 Shield',
  '#zuoyou_1_active': 'Aid and Guard',
  '#zuoyou_2v2-yin': 'Aid and Guard: you can make a player gain 1 Shield',

  /* ------------------------------------------------------------------------
   * Skill rules text. 701 keys.
   * ---------------------------------------------------------------------- */
  ':anda': 'Once per round, when a player enters the dying state, you can make the damage source '
    + 'choose one: 1. give them two cards of different colours; 2. that player recovers 1 '
    + 'HP.',
  ':anxianc': 'After you discard hand cards for the first time each turn, you can obtain and use '
    + 'one Slash among them; this Slash does not count toward the use limit and has no '
    + 'distance or use restriction.',
  ':aocai': 'When you need to use or play a basic card outside your turn, you can look at the top '
    + 'two cards of the draw pile and use or play the one you need from among them.',
  ':aosi': '(forced) After you deal damage in your Action phase to another player within your '
    + 'ATK range, you use cards on them this phase with no limit on the number of uses.',
  ':armor__xianjian': 'This is a Breach armor card.',
  ':baoxi': 'Once per round for each, after at least two basic cards enter the discard pile at '
    + 'once, you can lose 1 max HP and use a hand card as a Duel; after at least two '
    + 'non-basic cards enter the discard pile at once, you can lose 1 max HP and use a hand '
    + 'card as a Slash that does not count toward your limit and has no limit on the number '
    + 'of uses.',
  ':beiming': 'At the start of the game, you can make up to two players each randomly obtain from '
    + 'the draw pile a weapon card whose ATK range is X (X is the number of suits among '
    + 'that player\'s hand cards).',
  ':beizhu': 'Once per Action phase, you can look at another player\'s hand cards. If there are '
    + 'Slashes among them, they use those Slashes on you one after another (after you take '
    + 'damage from a Slash used this way, you draw a card); otherwise you discard a card '
    + 'from them and can make them obtain a Slash from the draw pile.',
  ':bifeng': 'When you become the target of a basic card or a normal trick card, if the number of '
    + 'its targets is no more than 4, you can cancel it. If you do, after this card '
    + 'finishes resolving, if no other player responded to this card, you lose 1 HP; '
    + 'otherwise you draw two cards.',
  ':bihan': 'When a player is about to take damage from a Slash, you can make yourself or them '
    + 'discard hand cards down to their current HP, making that Slash\'s damage -1.',
  ':bihuoy': '(once per game) When a player leaves the dying state, you can make them draw three '
    + 'cards, then this round, when players other than them calculate their distance to '
    + 'them, it is +X (X is the number of players in play).',
  ':biluan': 'At the start of your Draw phase, if a player\'s distance to you is 1, you can give up '
    + 'drawing cards to make other players\' distance to you increase by X (X is the number '
    + 'of surviving kingdoms).',
  ':binghuo': 'At a player\'s Finish phase, if you used Gather Troops this turn to use or play a '
    + 'Troop, you can make a player perform a judgement; if the result is black, you deal 1 '
    + 'thunder damage to them.',
  ':binglun': 'Once per Action phase, you can remove a Benevolence card and make a player choose '
    + 'one: 1. draw a card; 2. recover 1 HP at the end of their next turn.',
  ':bingqing': 'When you use a card during your Action phase, if its suit differs from the suit of '
    + 'every card you have used this phase, you record that suit. After this card finishes '
    + 'resolving, according to the number of suits recorded this phase, you can perform the '
    + 'corresponding effect:<br>two suits, make a player draw two cards;<br>three suits, '
    + 'discard a card from a player\'s area;<br>four suits, deal 1 damage to another player.',
  ':biwei': 'Once per Action phase, you can discard a hand card with the unique highest number '
    + 'and choose another player, making them discard all hand cards with a number not less '
    + 'than that card. If they did not discard any card this way, reset this skill.',
  ':bixian': '(forced) At the end of a phase in which you were the target of a card and your HP '
    + 'did not change, it counts as you using a Duel.',
  ':bojian': '(forced) At the end of your Action phase, if both the number of cards and the number '
    + 'of suits you used this phase differ from those of your previous Action phase, you '
    + 'draw two cards; otherwise you choose one card you used this phase from the discard '
    + 'pile and give it to a player.',
  ':buqi': '(forced) When a player enters the dying state, you remove two "Benevolence" cards '
    + 'and make them recover 1 HP. After a player dies, you remove all "Benevolence" cards.',
  ':buxu': 'In your Action phase, if you have the skill Inheritance, you can discard X cards and '
    + 'choose one of your missing <a href=\'chengye_href\'>Six Classics</a>, then randomly '
    + 'obtain from the draw pile or the discard pile a card corresponding to that Classic '
    + 'and add it to your Classics (X is the number of times you have already successfully '
    + 'used this skill this phase +1).',
  ':caiqiu': 'At the start of each round, you look at the top X cards of the draw pile (X is the '
    + 'number of players in the game), then you can obtain at least one of them. If you do, '
    + 'after another player finishes resolving a card they use this round, if that card '
    + 'shares a name with a card you obtained this way, you lose 1 HP.',
  ':cangjia': '(forced) After you obtain a card outside your Action phase, record that card\'s suit; '
    + 'during your Action phase you cannot use cards of a suit this skill has not recorded.',
  ':canshi': 'In your Draw phase, you can instead draw X cards (X is the number of wounded '
    + 'players); then, when you use a basic card or a normal trick card this turn, you '
    + 'discard a card.',
  ':caowei': '(forced) After you take damage, you recast all of your cards of at least one card '
    + 'type and draw a card.',
  ':changshi__bilan-specificSkillDesc': 'Muster Talent: (Wise Insight)',
  ':changshi__chihe': 'After you use a Slash and designate it at a single target, you can reveal the top '
    + 'two cards of the draw pile; that target cannot use cards of the same suit as the '
    + 'revealed cards to respond to this Slash, and for each revealed card whose suit '
    + 'matches this Slash\'s suit, this Slash\'s base damage +1.',
  ':changshi__chiyan': 'After you use a Slash and designate its targets, you can place one card of a target '
    + 'face down next to their character card, and that player obtains this card at the end '
    + 'of this turn; when a Slash you use deals damage to a target player whose hand card '
    + 'count and equip area card count are both not greater than yours, this damage +1.',
  ':changshi__duangui-specificSkillDesc': 'Bellow: (Fierce Bow)',
  ':changshi__gaowang-specificSkillDesc': 'Witty Words: (Dragon Soul)',
  ':changshi__guosheng-specificSkillDesc': 'Seize by Force: (Appraise Talent)',
  ':changshi__hankui-specificSkillDesc': 'Night Bribe: (Ingenuity)',
  ':changshi__kuiji': 'Once per Action phase, you can look at another player\'s hand cards and discard a '
    + 'total of four cards of four different suits from your hand cards and theirs.',
  ':changshi__lisong-specificSkillDesc': 'Spy the Moment: (Soul Raid)',
  ':changshi__miaoyu': 'You can use or play up to two cards of the same suit according to the following '
    + 'rules: <font color=\'red\'>♥</font> as Peach, <font color=\'red\'>♦</font> as a fire '
    + 'Slash, ♣ as Dodge, ♠ as Nullification. If you use or play two cards this way: <font '
    + 'color=\'red\'>♥</font> cards, this card\'s base recovery is increased by 1; <font '
    + 'color=\'red\'>♦</font> cards, this card\'s base damage is increased by 1; black cards, '
    + 'you discard a card from the current turn player.',
  ':changshi__niqu': 'Once per Action phase, you can deal 1 fire damage to a player.',
  ':changshi__sunzhang-specificSkillDesc': 'Self-Interest: (Diligent Governance)',
  ':changshi__taoluan': 'Once per Action phase, you can use a card as any basic card or any normal trick card.',
  ':changshi__xiaolu': 'Once per Action phase, you can draw two cards, then choose one: 1. discard two hand '
    + 'cards; 2. give two hand cards to another player.',
  ':changshi__xiayun-specificSkillDesc': 'Slander: (Righteous Contest)',
  ':changshi__yaozhuo': 'Once per Action phase, you can start a point fight with a player. If you: win, skip '
    + 'their next Draw phase; do not win: you discard two cards.',
  ':changshi__zhangrang-specificSkillDesc': 'Tide of Chaos: (Tide of Chaos)',
  ':changshi__zimou': '(forced) When you use, during your Action phase: your second card, you randomly '
    + 'obtain an Alcohol; your fourth card, you randomly obtain a Slash; your sixth card, '
    + 'you randomly obtain a Duel.',
  ':chanyuan': '(forced) You cannot question Bewitch; if your HP is 1, your other skills have no effect.',
  ':chengxiong': 'After you use a trick card that targets only other players, you can choose a player '
    + 'whose card count is not less than X (X is the number of cards you have used this '
    + 'phase), discard a card from them, and if that card\'s colour is the same as the '
    + 'colour of the trick card you used, you deal 1 damage to them.',
  ':chengye': '(forced) After another player finishes using a non-converted card, or after an equip '
    + 'card or delayed trick card in another player\'s area enters the discard pile, if the '
    + 'corresponding one of your <a href=\'chengye_href\'>Six Classics</a> is missing, you '
    + 'put this card on your character card, called a Classic; at the start of your Action '
    + 'phase, if none of your Six Classics is missing, you obtain all Classics.',
  ':chengzhang': '(awaken) In your Prepare phase, if the total of the damage you have dealt and the '
    + 'damage you have taken is 7 or more, you recover 1 HP and draw 1 card, then modify '
    + 'Wine Poetry (the effect that obtains a trick card is changed to trigger after you '
    + 'turn your character card over).',
  ':chengzhao': 'In a player\'s Finish phase, if you have obtained at least two cards this turn, you '
    + 'can start a point fight with another player; if you win, it counts as you using a '
    + 'Slash on them that ignores armor.',
  ':chenshe': 'When another player enters the dying state, you can discard, in order, one card each '
    + 'from you, them and the damage source; if all these players had a card discarded this '
    + 'way and all of the suits are the same, they recover HP up to their max HP, then you '
    + 'lose this skill.',
  ':chiyuanc': 'The first Slash you use each turn has no distance restriction and requires one extra '
    + 'Dodge to respond to it; once per Action phase, you can draw X cards (X is the number '
    + 'of red cards in the current consecutive run of cards used).',
  ':chiyun': 'After you obtain cards for the first time in each phase, you can give at least one '
    + 'hand card to another player, and they choose one: 1. they show all hand cards of the '
    + 'same colour as those cards, and you deal 1 fire damage to them; 2. you draw two '
    + 'cards, and they become chained.',
  ':chizhang': 'You use damage-dealing cards with no distance restriction; after you use a '
    + 'damage-dealing card from your hand other than Lightning and choose the first target, '
    + 'you can discard at least one hand card to make other players unable to use or play '
    + 'cards of the same color as the cards you discarded this way to respond to that card.',
  ':chongcha': 'Your cards with a number of 10 or more do not count toward your hand limit, and when '
    + 'used they are treated as matching the number 0 in "Circle Cutting"; once per Action '
    + 'phase, if you have the skill "Circle Cutting", you can discard a card to adjust the '
    + 'X in "Circle Cutting" to the value of the next digit.',
  ':chongjian': '(kingdom) Wu, you can use an equip card as Alcohol, or as any kind of Slash with no '
    + 'distance restriction that ignores armor. After a Slash you used this way deals '
    + 'damage to a player, you obtain X cards from their equip area (X is the damage '
    + 'dealt).',
  ':chonglei': '(forced) During your Action phase, all other players\' non-basic hand cards can only '
    + 'be used or played as Dodge; up to X times per Action phase (X is the number of other '
    + 'players), after a card you use is responded to by another player, or after you '
    + 'respond to a card used by another player, you obtain a hand card from that player.',
  ':chongsi': 'In your Action phase, if you have not chosen the last option during this phase, you '
    + 'can choose another player and choose one option, then they also choose one option: '
    + '1. use a Slash; 2. discard two hand cards; 3. deal 1 damage to yourself or to the '
    + 'player equipped with Six Dragon Chariot.',
  ':chouhai': '(forced) When you take damage, if you have no hand cards, you make this damage +1.',
  ':choulue': 'At the start of your Action phase, you can make another player choose whether to '
    + 'give you a card; if they do, you can count as using the last card that dealt damage '
    + 'to you other than a delayed trick card.',
  ':choumang': 'Once per turn, after you use a Slash that has only one target, or after you become '
    + 'the only target of a Slash, you can choose one option: 1. this Slash\'s damage +1; 2. '
    + 'after this Slash is countered, you can obtain a card from the area of another player '
    + 'within distance 1 of you. Desperate Stand: discard the weapon cards in your equip '
    + 'area and in theirs (you can only choose this if you or they have a weapon card in '
    + 'the equip area).',
  ':chuhai': '(mission) Once per Action phase, you can draw a card and point fight with another '
    + 'player; for this point fight the number of your point fight card is increased by X '
    + '(X is 4 minus the number of equips in your equip area). If you win: you look at '
    + 'their hand, and randomly obtain from the draw pile or the discard pile one card of '
    + 'each card type present in their hand; after you deal damage to them during this '
    + 'phase, put an equip card from the draw pile or the discard pile whose type matches '
    + 'one of your empty equip slots into your corresponding equip area.<br>\n  ⬤ Success: '
    + 'after an equip card enters your equip area, if there are no fewer than 3 equips in '
    + 'your equip area, you recover HP up to your max HP, gain Renown and lose Village '
    + 'Scourge.<br>\n  ⬤ Failure: if, before the mission is achieved, you point fight with '
    + 'Slay the Scourge and do not win, and your point fight result is not greater than 6, '
    + 'the mission fails.',
  ':chuifeng': '(kingdom) Wei, twice per Action phase, you can lose 1 HP, and it counts as using a '
    + 'Duel. When you take damage caused by a Duel used this way, prevent this damage, and '
    + 'this skill has no effect for the rest of this phase.',
  ':cuijin': 'When you or a player in your ATK range uses a Slash, you can discard a card to make '
    + 'this Slash\'s base damage +1. After this Slash finishes resolving, if it has dealt no '
    + 'damage, you draw a card and deal 1 damage to its user.',
  ':cuijun__gongli': '(forced) At the start of the game, you add X triggering suits to Effortless Flow (X '
    + 'is the number of Friend characters in play).',
  ':cuizhen': 'At the start of the game, you can choose up to three other players and disable their '
    + 'weapon slots; after you use a Slash or a damage trick card during your Action phase '
    + 'and choose another player as a target, if their number of hand cards is not less '
    + 'than their HP, you can disable their weapon slot; in your Draw phase, you draw X '
    + 'extra cards (X is the number of disabled weapon slots in play +1, at most 3).',
  ':cy_classic_basic': 'Basic card',
  ':cy_classic_damage': 'Damage trick card',
  ':cy_classic_equip': 'Equip card',
  ':cy_classic_ex_nihilo': 'Ex Nihilo',
  ':cy_classic_indulgence': 'Indulgence',
  ':cy_classic_nullification': 'Nullification',
  ':daigong': 'Once per turn, when you take damage, you can show all your hand cards to make the '
    + 'damage source choose one: 1. give you a card whose suit is different from every card '
    + 'you showed this way; 2. prevent this damage.',
  ':daizui': '(once per game) When you would take fatal damage, you can prevent this damage, then '
    + 'place the card that dealt the damage to you on the damage source\'s character card, '
    + 'called "Absolution". At the end of this turn, they obtain their "Absolution".',
  ':daming': '1. At the start of the game, you gain 1 Mandate point. 2. Once per Action phase of '
    + 'another player, they can give you a card, then you choose another player. If the '
    + 'latter has a card of the same type, the latter must give the former a card of the '
    + 'same type and you gain 1 Mandate point; otherwise you give the card you obtained '
    + 'this way to the former.',
  ':daming_other&': 'Once per Action phase, you can give Peng Yang a card, then he chooses another '
    + 'player. If that player has a card of the same type, that player must give you a card '
    + 'of the same type and Peng Yang gains 1 Mandate point; otherwise Peng Yang gives the '
    + 'card he obtained back to you.',
  ':danggu': '(forced) At the start of the game, you obtain ten different Attendant cards, then '
    + 'you perform one Faction Forming (randomly show one Attendant card, then randomly '
    + 'show four Attendant cards; from those you choose one that is mutually compatible '
    + 'with the Attendant card shown first, and those two form a dual character); after you '
    + 'return to the game from recuperation, you perform one Faction Forming and draw a '
    + 'card.',
  ':dangshi': 'After a damage card you use finishes resolving, you can make one of its other target '
    + 'players choose one: 1. discard X cards (X is the number of times players have chosen '
    + 'this option this round, at least 1); 2. you deal 1 damage to them.',
  ':daoji': 'Once per Action phase, you can discard a non-basic card and choose another player '
    + 'with cards in their equip area; you obtain one card from their equip area and use '
    + 'it. If the card you obtain this way is a weapon card, you then deal 1 damage to '
    + 'them.',
  ':daozhuan': 'Once per turn, when you need to use a basic card (once per card name per round), you '
    + 'can put a card from you or the current turn player into the discard pile, and this '
    + 'counts as using that basic card. If the current turn player lost a card this way, '
    + 'this skill is disabled for the rest of this round.',
  ':debao': '(forced) After another player obtains your cards, if the number of "Benevolence" '
    + 'cards is less than your max HP, you place the top card of the draw pile as a '
    + '"Benevolence". In your Prepare phase, you obtain all "Benevolence" cards.',
  ':defensive_horse__xianjian': 'This is a "Pierce the Line" defensive horse.',
  ':defensive_siege_engine': 'Equip card - Weapon<br/><b>ATK range</b>: 9<br/><b>Durability</b>: 3<br/><b>Weapon '
    + 'skill</b>: After this card enters your equip area, discard the other cards in your '
    + 'equip area; before another equip card would enter your equip area, it is put into '
    + 'the discard pile instead; when you take damage, this card loses that much Durability '
    + '(all of it if there is not enough), and this damage is reduced by X (X is the '
    + 'Durability lost); when this card would leave your equip area for a reason other than '
    + '"Siege Works", prevent it, then this card loses 1 Durability; when this card\'s '
    + 'Durability drops to 0, destroy this card.',
  ':dengli': 'After you use a Slash and choose another player as a target, or after you become the '
    + 'target of a Slash used by another player, if your HP is equal to theirs, you can '
    + 'draw a card.',
  ':dieyin': 'Once per Action phase, you can turn your character card face down and choose a '
    + 'phase; you perform this extra phase after the current phase ends.',
  ':difei': '(forced) Once per turn, after you take damage, you draw a card or discard a hand '
    + 'card, then you show all your hand cards; if the card that dealt damage to you has no '
    + 'suit, or none of your hand cards has the same suit as the card that dealt damage to '
    + 'you, you recover 1 HP.',
  ':dinghan': 'When you become the target of a trick card, if that card\'s name has not been '
    + 'recorded, record that card name, then cancel this target; at the start of your turn, '
    + 'you can add or remove the record of one trick card name.',
  ':dingyi': '(forced) At the start of the game, you choose one option to apply to every player: '
    + '1. they draw 1 extra card in their Draw phase; 2. their hand limit +2; 3. their ATK '
    + 'range +1; 4. when they leave the dying state, they recover 1 HP.',
  ':dingzhen': 'At the start of each round, you can make up to X other players within distance X of '
    + 'you choose one in turn (X is your current HP): 1. discard a Slash; 2. this round, '
    + 'trick cards they use during their turn cannot target you.',
  ':dingzhou': 'Once per Action phase, you can choose another player and give them X cards (X is the '
    + 'number of cards they have on the field), then you obtain all of their cards on the '
    + 'field.',
  ':duanbi': '(once per game) In your Action phase, if the total hand size of all players is '
    + 'greater than twice the number of living players, you can make every other player '
    + 'discard X hand cards (X is half their hand size, rounded down, up to 3); then you '
    + 'can choose a player and give them three random cards discarded this way.',
  ':duanjin': 'After a basic card you use finishes resolving, you can discard a card from another '
    + 'player who has used a card this turn.',
  ':duansuo': 'Once per Action phase, you can unchain at least one player, then deal 1 fire damage '
    + 'to each of those players.',
  ':duanyang': 'Once per turn, after your hand cards enter the discard pile other than by being '
    + 'used, you can put a random Slash among them onto your character card and use it at '
    + 'the end of this phase (with no limit on the number of uses). After a Slash you use '
    + 'this way deals damage, you can recast up to two cards in the damaged player\'s area, '
    + 'then you draw four cards.',
  ':dujin': 'In your Draw phase, you can draw X+1 extra cards (X is half the number of cards in '
    + 'your equip area, rounded down).',
  ':dulie': '(forced) When you become the target of a Slash used by a player whose HP is greater '
    + 'than yours, you judge; if the result is <font color=\'red\'>♥</font>, cancel it.',
  ':duohui': 'At the start of another player\'s Prepare phase, they can give you a card, then you '
    + 'choose one:<br>1. give them another card of the same suit;<br>2. make them draw a '
    + 'card.',
  ':duoji': '(once per game) During your Action phase, you can discard two hand cards and obtain '
    + 'all cards in another player\'s equip area.',
  ':duwu': 'During your Action phase, you can discard X cards and deal 1 damage to another '
    + 'player within your ATK range (X is that player\'s HP). If they enter the dying state '
    + 'because of this, after the dying state is resolved you lose 1 HP and this skill is '
    + 'invalid for the rest of this turn.',
  ':duzuo': 'After you obtain a card other than through this skill, you can make a player obtain '
    + 'a fire Slash.',
  ':ex__leiji': 'After you use or play a Dodge, you can make another player make one judgement; if '
    + 'the result is: ♠, you deal 2 thunder damage to them; ♣, you recover 1 HP and deal 1 '
    + 'thunder damage to them.',
  ':ex_crossbow': 'Equip card - Weapon<br/><b>ATK range</b>: 3<br/><b>Weapon skill</b>: (forced) You '
    + 'can use Slash during your Action phase with no limit on the number of uses.',
  ':ex_eight_diagram': 'Equip card - Armor<br/><b>Armor skill</b>: When you need to use or play a Dodge, you '
    + 'can make a judgement: if the result is not ♠, it counts as you using or playing a '
    + 'Dodge.',
  ':ex_nioh_shield': 'Equip card - Armor<br/><b>Armor skill</b>: (forced) Black Slash and <font '
    + 'color=\'red\'>♥</font> Slash have no effect on you.',
  ':ex_silver_lion': 'Equip card - Armor<br/><b>Armor skill</b>: (forced) When you take damage, if this '
    + 'damage is greater than 1, prevent the excess damage. After you lose the Moonlit Lion '
    + 'Helm from your equip area, you recover 1 HP and draw two cards.',
  ':ex_vine': 'Equip card - Armor<br/><b>Armor skill</b>: (forced) Savage Assault, Archery Attack '
    + 'and normal Slash have no effect on you. You cannot be chained. When you take fire '
    + 'damage, this damage is increased by 1.',
  ':fangqiu': '(once per game) After you carry out "Sleeping Dragon\'s Stratagem", you can show your '
    + '"Sleeping Dragon\'s Stratagem" predictions. If you do, after all predictions of this '
    + '"Sleeping Dragon\'s Stratagem" are verified, the values of the effects carried out '
    + 'are each increased by 1; if the number of predicted cards is greater than 3 and all '
    + 'of them are correct, reset this skill.',
  ':fangzong': '(forced) During your Action phase, damage-dealing cards you use cannot choose '
    + 'players within your ATK range as targets; other players whose ATK range contains you '
    + 'cannot choose you as the target of damage-dealing cards they use. In your Finish '
    + 'phase, you draw until you have X hand cards (X is the number of players alive).',
  ':feijing': 'You can use or play a damage trick card as a Slash; twice per turn, when you use a '
    + 'Slash and choose only one target, you can make all the players on one <a '
    + 'href=\'#PathDesc\'>path</a> between you and that player simultaneously show a hand '
    + 'card and then discard it one by one, then you can choose a colour and the players '
    + 'who discarded a card of that colour become extra targets of this Slash.',
  ':feili': 'When you take damage, if you have Slanderous Plot, you can discard two cards to '
    + 'prevent this damage; if the damage source has the "Slander" mark, you can instead '
    + 'remove that mark to prevent this damage, then you draw two cards and cannot use '
    + 'Slanderous Plot on them for the rest of the game.',
  ':fengjie': '(forced) In your Prepare phase, you choose another player; until the start of your '
    + 'next turn, in each player\'s Finish phase, if the player you chose is alive, you draw '
    + 'or discard until your hand size equals that player\'s HP (drawing to at most four '
    + 'cards).',
  ':fentao': '(forced) When another player in the chained state takes fire damage, they choose '
    + 'one: 1. the damage in this chain transmission +1; 2. they discard half of their '
    + 'cards (rounded up), and after this damage resolves they become chained.',
  ':fenyin': 'During your turn, when you use a card of a different colour from the previous card, '
    + 'you can draw a card.',
  ':friend__manjuan': 'Up to five times each round, after you obtain at least two cards at once other than '
    + 'through this skill, you can put any number of those cards on top of the draw pile in '
    + 'any order. If you do, for each card you place there you obtain a random card from '
    + 'the discard pile of a different type from it (up to five cards each time).',
  ':friend__yangming': 'At the end of your Action phase, if you lost at least three hand cards this phase, '
    + 'you can reveal the top X cards of the draw pile (X is the number of suits among the '
    + 'cards that entered the discard pile this turn) and use any number of them, all of '
    + 'different suits (with no limit on the number of uses).',
  ':fubi': 'Once per Action phase, you can choose a player who has the Ordained Rites effect and '
    + 'choose one option: 1. change their Ordained Rites effect; 2. discard a card, and '
    + 'until the start of your next turn their Ordained Rites effect is doubled.',
  ':fuhai': '(forced) After you use a card and choose a player who has a Pacify mark as a target, '
    + 'they cannot respond to this card and you draw a card (you draw at most two cards '
    + 'this way each turn); when a player who has a Pacify mark dies, you gain X max HP and '
    + 'draw X cards (X is their number of Pacify marks).',
  ':fujiy': 'Once per Action phase, you can show and give one card each to any number of other '
    + 'players; these cards are called Talisman cards.<br>When a player uses a Talisman '
    + 'card, they obtain a card of the same suit as that Talisman card. If the Talisman '
    + 'card is a Slash, that Slash\'s base damage is increased by 1; if it is a Dodge, the '
    + 'user draws a card after it resolves.<br>If your hand size is the lowest in play '
    + 'after you give out cards with this skill, you draw a card, and the first Slash and '
    + 'the first Dodge you use carry the Talisman card effects above until the start of '
    + 'your next turn.',
  ':fuman': 'Once per Action phase for each player, you can give a Slash to another player; then '
    + 'when they use that Pacify the Tribes card before the end of their next turn, you '
    + 'draw a card.',
  ':futu': 'At the end of each turn, if during that turn you: dealt the most damage, you place '
    + 'the first black card from the top of the draw pile on your character card, called '
    + 'Karma; healed the most HP for players, you place the first red card from the top of '
    + 'the draw pile as Karma. When you take damage, you can remove a Karma to prevent it.',
  ':fuyu': 'Once per turn for each, when you become the only target of a basic card or ordinary '
    + 'trick card used by another player, or when you use a basic card or ordinary trick '
    + 'card whose only target is another player, you can point fight with them; if the user '
    + 'of that card wins, the card resolves one extra time; if the user does not win, the '
    + 'card has no effect. If your point fight result is the same as the last time you '
    + 'triggered this skill, you draw two cards.',
  ':gaigong': 'Once per turn, after you deal damage to another player or take damage dealt by '
    + 'another player, you can show up to two hand cards of yours or of that player and '
    + 'swap them with the same number of cards from the bottom of the draw pile; if the '
    + 'swapped cards contain at least three suits, you can use one of those cards (with no '
    + 'limit on the number of uses and not counting toward the use limit).',
  ':ganggeng': 'Once per Action phase, you can give at least two hand cards to another player. At '
    + 'the end of the turn, if their number of hand cards is the most among all players, '
    + 'you draw a card; if it is not the most, you discard a card from their area.',
  ':ganjue': 'Once per Action phase, you can use a card from your equip area as a Slash that does '
    + 'not count toward the use limit and has no distance or use restriction. If the target '
    + 'player has no hand card of the same suit as that Slash, they cannot respond to that '
    + 'Slash.',
  ':gaoyuan': 'When you become the target of a Slash used by a player, you can discard a card to '
    + 'transfer this Slash to another player with a Candid Recommendation mark.',
  ':gebo': '(forced) After a player heals HP, you put a card from the top of the draw pile into '
    + 'the <a href=\'RenPile_href\'>"Benevolence" area</a>.',
  ':gonghuan': '(forced) Once per turn, when another player who has a "Marriage" mark takes damage, '
    + 'if their HP is less than yours, transfer this damage to you; then remove the '
    + '"Marriage" marks of both players.',
  ':gongmou': 'In your Prepare phase, you can exchange hand cards with another player. If you do, '
    + 'you gain the skill Wondrous Plan and they gain the skill See Through until the end '
    + 'of the turn.',
  ':guansha': '(once per game) At the end of your Action phase, you can replace all your cards with '
    + 'the same number of random basic cards from the draw pile; your hand limit is '
    + 'increased by X this turn (X is the number of distinct card names you obtained this '
    + 'way).',
  ':guanzong': 'Once per Action phase, you can make another player <font color=\'red\'>count as</font> '
    + 'dealing 1 damage to a second other player.',
  ':guiming': '(lord skill) (forced) During your Draw phase, other Wu players count as wounded players.',
  ':guimou': '(forced) At the start of the game you randomly choose one option, or at the end of '
    + 'your turn you choose one option: until the start of your next Prepare phase, 1. '
    + 'record the other player who has used the fewest cards; 2. record the other player '
    + 'who has discarded the fewest cards; 3. record the other player who has obtained the '
    + 'fewest cards. At the start of your Prepare phase, you choose one of the recorded '
    + 'players, view their hand cards and you can choose one of those cards, then discard '
    + 'it or give it to another player.',
  ':guli': 'Once per Action phase, you can use all your hand cards as one Slash that ignores '
    + 'armor. After that card is settled, if it dealt damage, you can lose 1 HP, then draw '
    + 'cards until your hand size equals your max HP.',
  ':gushe': 'Once per Action phase, you can use a hand card to start a point fight with up to '
    + 'three players at the same time, then resolve the point fight results one by one; '
    + 'each player who does not win chooses one: 1. discard a card; 2. make you draw a '
    + 'card. If the player who does not win the point fight is you, you must first gain a '
    + 'Prattle mark (when you have 7 Prattle marks, you die).',
  ':guying': '(forced) Once per turn, after you lose exactly one card at once outside your turn by '
    + 'using, playing or discarding it, the current turn player must choose one: 1. give '
    + 'you a random card; 2. you obtain that card (if it is an equip card, you use it). In '
    + 'your Prepare phase, you must discard X cards (X is the number of times this skill '
    + 'has been triggered), then reset this skill\'s trigger count.',
  ':hannan': 'Once per Action phase, you can start a point fight with another player; the player '
    + 'who wins the point fight deals 1 damage to the player who does not win.',
  ':heji': 'After a player finishes using a Duel or a red Slash that targets only one other '
    + 'player, you can use a Slash or Duel from your hand against the same target with no '
    + 'distance restriction and no limit on the number of uses. If the card you use is not '
    + 'a converted card, you obtain a random red card when you use this card.',
  ':hengwei': '(forced) When you deal damage to another player, they must show and give you a hand '
    + 'card, or this damage +1; during your turn, other players cannot use cards of the '
    + 'same colour as a card they have shown this turn.',
  ':hongyi': 'Once per Action phase, you can choose another player; when they deal damage before '
    + 'the start of your next turn, they judge, and if the result is red, the damaged '
    + 'player draws a card; black, the damage is reduced by 1.',
  ':hongyic': '(forced) At the start of the game, you gain 2 Resolve markers; after you deal or '
    + 'take damage, you gain 1 Resolve marker; you can have at most 4 Resolve '
    + 'markers.<br>In your Prepare phase, you choose one option, and in the next Finish '
    + 'phase this turn you carry out the other: 1. draw X cards (X is your current number '
    + 'of Resolve markers); 2. discard all your Resolve markers.',
  ':houfeng': 'Once per round, at the start of the Action phase of a player in your ATK range, you '
    + 'can make them <a href=\'zhengsu_desc\'>Rectify</a>; you and they both gain the <a '
    + 'href=\'zhengsu_desc\'>Rectify</a> reward.',
  ':huaibi': '(lord skill) (forced) Your hand limit +X (X is the number of players of the kingdom '
    + 'you chose with Invite the Tiger).',
  ':huaizi': '(forced) Your hand card limit equals your max HP.',
  ':huanshiz': '(mission) The first Slash you use each turn deals +1 damage; while you are not dying '
    + 'you cannot use Alcohol, but you can recast it.<br />Success: after you deal or take '
    + 'damage, if the damage value equals your HP, you gain the skill <a '
    + 'href=\':jianlv\'>Broad Foresight</a>.',
  ':huantu': 'Once per round, before the Draw phase of another player in your ATK range begins, '
    + 'you can give them a card to make them skip their Draw phase. If you do, at the '
    + 'Finish phase this turn you choose one: 1. make them recover 1 HP and draw two cards; '
    + '2. you draw three cards and give them two hand cards.',
  ':huishig': '(once per game) In your Action phase, you can choose a player. If they have an '
    + 'awaken skill that has not been triggered and your max HP is not less than the number '
    + 'of living players, you choose one of those skills and that player counts as meeting '
    + 'its awaken condition; otherwise they draw four cards. Finally you lose 2 max HP.',
  ':huitian': 'At the end of the turn of a player whose HP is greater than yours, you can draw a '
    + 'card and take an extra turn. At the start of each round, if you have used this '
    + 'skill, you die.',
  ':huiyao': 'Once per Action phase, you can take 1 damage with no source and choose another '
    + 'player; it <font color=\'red\'>counts as</font> them dealing 1 damage to another '
    + 'player of your choice.',
  ':jianlv': 'After you discard at least X cards at once (X is the number of times you have used '
    + 'this skill plus 1), you can deal 1 damage to another player. Then if they die, you '
    + 'choose one: 1. this skill is treated as never having been used; 2. deal 1 damage to '
    + 'another player.',
  ':jianyi': '(forced) At the end of another player\'s turn, if there is an armor card discarded '
    + 'this turn in the discard pile, you choose one of them and obtain it.',
  ':jianyu': 'Once per round, in your Action phase, you can choose two players; until the start of '
    + 'your next turn, after either of these players uses a card during their Action phase '
    + 'that designates the other as a target, you make the target draw a card.',
  ':jianzhan': 'Once per Action phase, you can make another player choose one option: 1. it counts '
    + 'as them using a Slash on another player of your choice who is within their ATK range '
    + 'and has fewer hand cards than them; 2. you draw a card.',
  ':jibing': 'At the start of your Draw phase, if your number of Troops is less than X (X is the '
    + 'number of kingdoms in play), you can give up drawing and instead put the top two '
    + 'cards of the draw pile on your character card, called Troops. You can use or play a '
    + 'Troop as a normal Slash or a Dodge.',
  ':jichou': 'Once per turn, you can count as using a regular trick card whose name has not been '
    + 'recorded and record that card name; you cannot use non-virtual cards of a recorded '
    + 'name, and cannot respond to cards of a recorded name; once per Action phase, you can '
    + 'give at least one card of a recorded name to another player.',
  ':jichou_give&': '<font color=\'grey\'>Once per Action phase, you can give at least one card whose name '
    + 'has been recorded by Swift Scheme to a player.</font>',
  ':jici': 'After your point fight card is revealed when you use Wagging Tongue, if its number '
    + 'is less than X, you can make its number +X; if its number equals X, you can make the '
    + 'number of times you can use Wagging Tongue this phase +1 (X is the number of your '
    + 'Prattle marks).',
  ':jiebian': 'At the end of a player\'s Action phase, if no player has taken damage during that '
    + 'phase, you can start a point fight with the current turn player or with the player '
    + 'with the lowest HP (you can use a Karma for this point fight); if you win, choose '
    + 'one: 1. deal 1 damage to the player who did not win; 2. make the player who did not '
    + 'win recover 1 HP and draw a card, then obtain two of their cards.',
  ':jiebing': '(forced) After you take damage, you choose another player other than the damage '
    + 'source, obtain a random card from them and show it; if this card is an equip card, '
    + 'you use it.',
  ':jiejianw': 'At your Prepare phase, you can give any number of hand cards to another player and '
    + 'make them gain the Loyal Remonstrance mark. Once per player\'s turn, when a player '
    + 'with the Loyal Remonstrance mark becomes the only target of a non-equip card used by '
    + 'another player, you can transfer this card to you, then draw a card. At the end of '
    + 'the turn of the player with the Loyal Remonstrance mark, remove their Loyal '
    + 'Remonstrance mark; if their HP is not less than their HP was when you gave them the '
    + 'cards, you draw two cards.',
  ':jiejie': 'Once per Action phase of each player, the current turn player can let you look at '
    + 'their hand cards, then you can choose a suit. If their hand: contains that suit, '
    + 'they use cards of that suit this turn with no limit on the number of uses, then they '
    + 'discard their hand cards of the other suits; does not contain that suit, they '
    + 'randomly obtain a card of that suit from the draw pile or the discard pile. Twice '
    + 'per round, if the suit contained in the cards they let you look at this way this '
    + 'round is the unique most numerous suit, you count as using Discerning Eye on them '
    + 'once.',
  ':jiejie&': 'Once per Action phase, you can let Momentum Xin Xianying look at your hand cards, '
    + 'then they can choose a suit. If your hand: contains that suit, you use cards of that '
    + 'suit this turn with no limit on the number of uses, then you discard your hand cards '
    + 'of the other suits; does not contain that suit, you obtain a card of that suit. If '
    + 'the suit contained in the cards you showed Momentum Xin Xianying this way is the '
    + 'unique most numerous this round, they count as using Discerning Eye on you once.',
  ':jiezhu': 'Once per turn, you can discard hand cards down to the closest lower hand card count '
    + 'that no player in play has; it counts as using a Slash with no distance restriction '
    + 'that targets up to X players (X is the number of cards discarded). After that Slash '
    + 'finishes resolving, if that Slash had X targets and dealt damage to all of them, you '
    + 'draw cards up to the closest higher hand card count that no player in play has.',
  ':jiguan': '(forced) At the start of the game, you remove all horse cards from the game; your '
    + 'hand limit +2.',
  ':jilim': 'At the start of another player\'s turn, if they are in your ATK range, you can '
    + 'secretly choose a number from 0 to 2 that you have not chosen this round. If you do, '
    + 'at the start of the Finish phase of that turn, compare the number of times they have '
    + 'targeted you with cards this turn against X: if it is less than X, you draw 4-X '
    + 'cards; if it equals X, you give them X cards; if it is greater than X, you can count '
    + 'it as using a Slash against them with no distance restriction (X is the number you '
    + 'chose this time).',
  ':jilun': 'After you take damage, if you have the skill Swift Scheme, you can choose one: 1. '
    + 'draw X cards (X is the number of card names recorded by Swift Scheme, at least 1 and '
    + 'at most 3); 2. count as using a basic card, or a regular trick card recorded by '
    + 'Swift Scheme whose number of targets is not more than X (once for each card name).',
  ':jimi': '(forced) At the start of the game, all players replace the cards in their hand that '
    + 'are not Peach or Alcohol with the same number of Peaches or Alcohols taken at random '
    + 'from the draw pile; after a Peach or an Alcohol enters the discard pile for a reason '
    + 'other than being used, you obtain a damage card whose name is X characters long (X '
    + 'is the number of Peaches and Alcohols that have entered the discard pile this turn).',
  ':jimie': '(once per game) At the end of your Action phase, you can lose 8 Thunder marks and '
    + 'deal damage to one player equal to their max HP. Then, once both effects of your '
    + 'Thunder Rein have been carried out, this skill can be used again.',
  ':jinfan': 'At the start of your Discard phase, you can place any number of hand cards on your '
    + 'character card, called Bells (at most one of each suit); you can use or play Bells '
    + 'as if they were hand cards; when a Bell leaves your character card, you obtain a '
    + 'card of the same suit from the draw pile.',
  ':jingxie': 'In your Action phase, you can show a Crossbow, Eight Diagram, Nioh Shield, Sliver '
    + 'Lion or Vine from your hand or your equip area, then upgrade that card;<br>When you '
    + 'enter the dying state, you can recast an armor card, then restore your HP to 1.',
  ':jingzhong': 'At the end of your Discard phase, if you have discarded at least two black cards '
    + 'this phase, you can choose another player; up to three times during their next '
    + 'Action phase, after they finish using a card, you obtain it.',
  ':jinzu': 'Once per Action phase, you can choose another player; you show one hand card and '
    + 'they simultaneously show two hand cards. If, among all the shown cards, the number '
    + 'of your shown card is: the middle value, the next Slash you use on them this turn '
    + 'deals 1 extra damage to them and they cannot respond to it; an extreme value, you '
    + 'discard all the shown cards. If you discarded cards this way, this skill can be '
    + 'triggered again.',
  ':jiren': '(once per game) In your Action phase, you can make all players unable to choose '
    + 'themselves as a target when using non-weapon cards for the rest of the game.',
  ':jiren_debuff_desc': 'All players cannot choose themselves as a target when using non-weapon cards',
  ':jishi': '(forced) After a card you use finishes resolving, if it dealt no damage, put it into '
    + 'the <a href=\'RenPile_href\'>Benevolence area</a>; after a Benevolence card leaves the '
    + 'Benevolence area for a reason other than overflow, you draw a card.',
  ':jiwei': '(forced) At the end of another player\'s turn, you draw a card for each of the '
    + 'following met this turn:<br>1. a player lost cards;<br>2. a player took damage (in '
    + 'Role mode this option is removed; in Landlord mode you draw one extra card for '
    + 'meeting this option).<br>In your Prepare phase, if your hand card count is not less '
    + 'than the number of players alive and not less than your HP (in Landlord or 2v2 mode '
    + 'this condition becomes: all players are alive and you have at least five hand '
    + 'cards), you must distribute all hand cards of the color you hold more of to other '
    + 'players (if the counts are equal, choose one color).',
  ':jiwei_1v2': '(forced) At the end of another player\'s turn, if this turn: a player lost cards, you '
    + 'draw a card; a player took damage, you draw two cards.<br>In your Prepare phase, if '
    + 'all players are alive and you have at least five hand cards, you must distribute all '
    + 'hand cards of the color you hold more of to other players (if the counts are equal, '
    + 'choose one color).',
  ':jiwei_2v2': '(forced) At the end of another player\'s turn, you draw a card for each of the '
    + 'following met this turn:<br>1. a player lost cards;<br>2. a player took '
    + 'damage.<br>In your Prepare phase, if your hand card count is not less than the '
    + 'number of players alive and not less than your HP, you must distribute all hand '
    + 'cards of the color you hold more of to other players (if the counts are equal, '
    + 'choose one color).',
  ':jiwei_role_mode': '(forced) At the end of another player\'s turn, if a player lost cards this turn, you '
    + 'draw a card.<br>In your Prepare phase, if your hand card count is not less than the '
    + 'number of players alive and not less than your HP, you must distribute all hand '
    + 'cards of the color you hold more of to other players (if the counts are equal, '
    + 'choose one color).',
  ':jixiy': '(awaken) After your turn ends, if you have not lost HP during three consecutive '
    + 'turns of your own, you gain 1 max HP, recover 1 HP, then choose one: 1. gain the '
    + 'skill False Majesty; 2. draw two cards, then gain the Lord\'s lord skill.',
  ':jiyul': 'Once per Action phase, you can discard a hand card and obtain from the draw pile or '
    + 'the discard pile one random card of each type different from it; up to twice each '
    + 'phase, if you have used all the cards you obtained this way, this skill counts as '
    + 'not having been triggered.',
  ':juejin': '(persistent) (once per game) In your Action phase, you can make all players set '
    + 'their HP to 1 and gain X Shield (X is the amount of HP they lost this way; if that '
    + 'player is you, then +2), then remove all Alcohol, Peach and Dodge cards in the draw '
    + 'pile, the discard pile and every player\'s areas from the game.',
  ':jueyong': '(forced) When you become the target of a card that is not used by Peerless Valor, is '
    + 'not converted and is not virtual (Peach and Alcohol excepted), if you are the only '
    + 'target of this card and the number of Valor cards is less than your HP, you cancel '
    + 'it. Then put this card on your character card, called Valor. In your Finish phase, '
    + 'if you have Valor, resolve the Valor cards one by one in the order they were placed, '
    + 'making each card\'s original user use it on you (if that card\'s user is not in play, '
    + 'put the card into the discard pile).',
  ':juezhi': 'In your Action phase, you can discard at least two cards, then randomly obtain from '
    + 'the draw pile a card whose number is X (X is the remainder when the sum of the '
    + 'numbers of the cards discarded this way is divided by 13; if the remainder is 0, X '
    + 'becomes 13).',
  ':juezhig': 'Once per Action phase for each option: 1. you can draw a card, count as using a '
    + 'Duel, then discard all non-damage cards in your hand; 2. you can draw a card, '
    + 'recover 1 HP, then discard all damage cards in your hand.',
  ':juguz': 'After you become the target of a card, if you are not wounded, you can draw two '
    + 'cards, then discard X cards (X is the number of times this skill has been used this '
    + 'turn).',
  ':juliao': '(forced) Other players calculate their distance to you +X (X is the number of '
    + 'kingdoms in play -1).',
  ':jungong': 'During your Action phase, you can discard X+1 cards or lose X+1 HP (X is the number '
    + 'of times you have used this skill this turn), and it counts as using a Slash with no '
    + 'distance restriction and no limit on the number of uses. If this Slash deals damage '
    + 'to the target player, this skill is invalid for the rest of this turn.',
  ':junkui': '(forced) At the start of the game, you remove all horse cards from the game; the '
    + 'limit on the number of Slashes you can use +1.',
  ':jutu': '(forced) At your Prepare phase, you obtain all Life cards in play, draw X+1 cards, '
    + 'then place X cards on your character card, called Life (X is the number of players '
    + 'of the kingdom you chose with Invite the Tiger).',
  ':juxiangz': '(once per game) After another player\'s dying resolution ends, you can deal 1 damage '
    + 'to them.',
  ':kaiji': 'At your Prepare phase, you can make up to X players each draw a card; if any player '
    + 'obtained a non-basic card this way, you draw a card (X is the number of living '
    + 'players who have entered the dying state).',
  ':kechang': 'Level 1: (lord skill) (forced) Neutral kingdom players use Slash with no distance '
    + 'restriction.<br/>Level 2: (lord skill) (forced) Neutral kingdom players use Slash '
    + 'with no distance restriction; the Slashes you use cannot be responded to.',
  ':kechang_update': '(lord skill) (forced) Neutral kingdom players use Slash with no distance '
    + 'restriction; the Slashes you use cannot be responded to.',
  ':kouluet': '(forced) Hand cards you obtain outside your Draw phase do not count toward your hand '
    + 'limit and are all considered to be Slash.',
  ':kuangli': '(forced) At the start of your Action phase, a random number (at least one) of other '
    + 'players gain a Savage Frenzy mark until the end of the turn; up to twice each phase '
    + '(in Fight the Landlord, up to once), after you use a card in your Action phase '
    + 'targeting a player with a Savage Frenzy mark, you discard one random card from '
    + 'yourself and one from them, then you draw two cards.',
  ':kuangli_1v2': '(forced) At the start of your Action phase, a random number (at least one) of other '
    + 'players gain a Savage Frenzy mark until the end of the turn; once per phase, after '
    + 'you use a card in your Action phase targeting a player with a Savage Frenzy mark, '
    + 'you discard one random card from yourself and one from them, then you draw two '
    + 'cards.',
  ':kuangli_role_mode': '(forced) At the start of your Action phase, a random number (at least one) of other '
    + 'players gain a Savage Frenzy mark until the end of the turn; up to twice each phase, '
    + 'after you use a card in your Action phase targeting a player with a Savage Frenzy '
    + 'mark, you discard one random card from yourself and one from them, then you draw two '
    + 'cards.',
  ':kuangwu': 'At the start of another player\'s Action phase, you can draw or discard until your '
    + 'hand card count equals theirs (drawing up to five cards at most, discarding down to '
    + 'one card at most), then it counts as using a Duel against them. After this Duel '
    + 'finishes resolving, if they took no damage from this card, you lose 1 HP and '
    + 'Boastful Valor has no effect until the end of this round.',
  ':kubai': 'Level 1: (forced) When you use the first card of each color during your turn, you '
    + 'draw a card; during your turn other players cannot use cards that have a color you '
    + 'have not used.<br />Level 2: (forced) When you use the first card of each suit '
    + 'during your turn, you draw a card; during your turn other players cannot use cards '
    + 'that have a suit you have not used.<br />Level 3: (forced) When you use the first '
    + 'card of each number during your turn, you draw a card; during your turn other '
    + 'players cannot use cards that have a number you have not used.',
  ':kuili': '(forced) After you take damage, you restore the weapon slot of the damage source.',
  ':kujian': 'Once per Action phase, you can mark up to two hand cards as Counsel and give them to '
    + 'another player. When another player uses or plays a Counsel card, you and they each '
    + 'draw two cards. After another player loses a Counsel card from their hand other than '
    + 'by using or playing it, you and they each discard a card.',
  ':laishou': '(forced) When you take fatal damage, if your max HP is less than 9, prevent this '
    + 'damage and increase your max HP by that amount. In your Prepare phase, if your max '
    + 'HP is not less than 9, you die.',
  ':lianxi': 'Slash does not count toward your hand limit; after a Slash of yours is discarded '
    + 'into the discard pile, you can count as using an ordinary Slash that does not count '
    + 'toward your number of uses, with no distance restriction and no limit on the number '
    + 'of uses.',
  ':lianzhant': 'After a Slash with a number that you used against a single target finishes '
    + 'resolving, you can use a Slash with a greater number against them with no distance '
    + 'restriction and no limit on the number of uses, then draw a card.',
  ':liaoyi': 'At the start of another player\'s turn, if their hand card count is less than their '
    + 'HP and the number of Benevolence cards in play is not less than X, you can make them '
    + 'obtain X Benevolence cards; if their hand card count is greater than their HP, you '
    + 'can make them put X hand cards into the Benevolence area (X is the difference '
    + 'between their hand card count and their HP, at most 4).',
  ':lidian__heyu': '(forced) If allied Thoroughbred Yue Jin is in play, you obtain the cards discarded '
    + 'by Sever the Ford; if allied Thoroughbred Zhang Liao is in play, cards used with '
    + 'Public Spirit cannot be responded to. (Only in Landlord and 2v2 modes)',
  ':lidian__heyu_yuejin': '(forced) If allied Thoroughbred Yue Jin is in play, you obtain the cards discarded '
    + 'by Sever the Ford.',
  ':lidian__heyu_zhangliao': '(forced) If allied Thoroughbred Zhang Liao is in play, cards used with Public Spirit '
    + 'cannot be responded to.',
  ':liezhi': 'In your Prepare phase, you can discard one card from the areas of each of up to two '
    + 'other players, one after another; after you take damage, Stern Integrity has no '
    + 'effect until your next Finish phase.',
  ':liezhiz': 'Once per turn, you can reduce your max HP by 1, and it counts as using a Peach, or '
    + 'an Alcohol that does not count toward the use limit and has no limit on the number '
    + 'of uses.',
  ':lingce': '(forced) When a trick card that is neither virtual nor converted is used, if that '
    + 'card\'s name is one of the <a href=\'bag_of_tricks\'>Bag of Tricks</a> card names, a '
    + 'card name already recorded by Steady the Han, or Orthodox and Unorthodox, you draw a '
    + 'card.',
  ':lingfa': 'At the start of each round, if the current round number is not greater than 2, you '
    + 'can make effect X apply to all other players this round (X is the current round '
    + 'number): 1. when they use a Slash, they must discard a card, otherwise you deal 1 '
    + 'damage to them; 2. after a Peach they use finishes resolving, they must give you a '
    + 'card, otherwise you deal 1 damage to them. If the current round number is greater '
    + 'than 2, you lose this skill and gain <a href=\':os__zhian\'>Dark Governance</a> and <a '
    + 'href=\':jianxiong\'>Villainous Hero</a>.',
  ':liubing': '(forced) The suit of the first non-virtual Slash you use each turn counts as <font '
    + 'color=\'red\'>♦</font>. After another player finishes using a non-converted black '
    + 'Slash during their Action phase, if it has dealt no damage, you obtain it.',
  ':lixia': '(forced) In another player\'s Finish phase, if you are not within their ATK range, '
    + 'you choose one: 1. draw a card; 2. make them draw a card. Then other players\' '
    + 'distance to you is reduced by 1.',
  ':liyong': '(forced) After a Slash you use during your Action phase is countered by a Dodge, '
    + 'then after the next Slash you use during this phase designates its targets, the '
    + 'targets\' non-forced skills have no effect until the end of the turn, this Slash '
    + 'cannot be responded to, and its damage to the target players is increased by 1; '
    + 'after this Slash deals damage, if the target player has not died, you lose 1 HP.',
  ':longyuan': '(awaken) In your Prepare phase, if you have used Loyal Support at least three times '
    + 'this game, you change Loyal Support so that it requires only one card.',
  ':luanchou': 'Once per Action phase, you can remove all "Marriage" marks in play and choose two '
    + 'players, making them gain "Marriage". A player with "Marriage" counts as having the '
    + 'skill Shared Peril.',
  ':luanqun': 'Once per Action phase, if you have hand cards, you can make all players show a hand '
    + 'card at the same time, then you can obtain up to two of those cards (up to four in '
    + 'Role mode) with the same color as the card you showed. Every player whose shown card '
    + 'differs in color from yours can only choose you as the target of the first Slash '
    + 'they use in their next Action phase, and you cannot respond to Slashes they use on '
    + 'their next turn.',
  ':luanqun_1v2': 'Once per Action phase, if you have hand cards, you can make all players show a hand '
    + 'card at the same time, then you can obtain up to two of those cards with the same '
    + 'color as the card you showed. Every player whose shown card differs in color from '
    + 'yours can only choose you as the target of the first Slash they use in their next '
    + 'Action phase, and you cannot respond to Slashes they use on their next turn.',
  ':luanqun_role_mode': 'Once per Action phase, if you have hand cards, you can make all players show a hand '
    + 'card at the same time, then you can obtain up to four of those cards with the same '
    + 'color as the card you showed. Every player whose shown card differs in color from '
    + 'yours can only choose you as the target of the first Slash they use in their next '
    + 'Action phase, and you cannot respond to Slashes they use on their next turn.',
  ':luezhen': 'At the start of your Action phase, you can make all other players choose one in '
    + 'turn: 1. show X hand cards (X is the number of times they have chosen this option '
    + '+1); 2. you count as using a Slash on them that does not count toward your limit and '
    + 'has no distance or use-count restriction.',
  ':lulian': '(forced) After the settlement of a hand card you use ends, if you have no hand card '
    + 'of that type and there is a target player whose: HP is less than or equal to yours, '
    + 'all targets of that card become chained; number of cards in the equip area is less '
    + 'than or equal to yours, you draw a card. Momentum: you deal 1 fire damage to a '
    + 'player whose HP is not the lowest.',
  ':lunxiong': 'After you deal or take damage, you can discard the hand card with the unique highest '
    + 'number, then draw three cards. For the rest of the game, each card you discard this '
    + 'way must have a higher number than this card.',
  ':m_ex__anguo': 'At the start of the game, you make another player gain the Steady the State mark; '
    + 'the hand card limit of the player who has the Steady the State mark equals their max '
    + 'HP; at the start of your Action phase, if a player in play has the Steady the State '
    + 'mark, you can move the mark to a player who has not had this mark this game; when '
    + 'you take damage, if a player in play has the Steady the State mark, the damage '
    + 'source does not have the mark, and the damage value is not less than your HP, '
    + 'prevent this damage; when the player who has the Steady the State mark enters the '
    + 'dying state, they remove the mark and recover their HP to 1, then you choose: 1. if '
    + 'your HP is greater than 1, you lose HP down to 1; 2. if your max HP is greater than '
    + '1, you reduce your max HP to 1. If you do, they gain 1 Armour.',
  ':m_ex__anjian': '(forced) After you use a Slash that designates a player as its target, if you are '
    + 'not within their ATK range, you choose one: 1. they cannot respond to this Slash; 2. '
    + 'this Slash\'s base damage to them is increased by 1.',
  ':m_ex__anxu': 'Once per Action phase, you can make another player obtain a card from a second other '
    + 'player. If the card they obtain is not from an equip area, you draw a card. After '
    + 'they obtain a card this way, you can make whichever of the two has fewer hand cards '
    + 'draw a card.',
  ':m_ex__beige': 'After a player takes damage caused by a Slash, you can discard a card to make them '
    + 'make a judgement; if the result is: <font color=\'red\'>♥</font>, they recover X HP (X '
    + 'is the damage they took this time); <font color=\'red\'>♦</font>, they draw three '
    + 'cards; ♣, the damage source discards two cards; ♠, the damage source turns their '
    + 'character card over.',
  ':m_ex__benxi': 'At the start of your Action phase, you can discard any number of cards to make it so '
    + 'that this phase: you calculate your distance to other players -X, and the next basic '
    + 'card or ordinary trick card you use can choose up to X additional players whose '
    + 'distance from you is 1 as targets (X is the number of cards you discarded this way). '
    + 'Then, after that card finishes resolving, if it dealt damage, you draw five cards.',
  ':m_ex__bingyi': 'In your Finish phase, you can show all your hand cards; if they are all of the same '
    + 'color or all of the same type, you make up to X players each draw a card (X is your '
    + 'number of hand cards).',
  ':m_ex__dangxian': '(forced) At the start of your turn, you obtain a Slash from the discard pile and '
    + 'perform an extra Action phase.',
  ':m_ex__danshou': 'At another player\'s Finish phase, if you have not been a target of a card they used '
    + 'this turn, you draw a card; otherwise you can discard X cards to deal 1 damage to '
    + 'them (X is the number of times you were a target of a card they used this turn).',
  ':m_ex__dingpin': 'In your Action phase, you can discard a card (it cannot be of a type you have used '
    + 'or discarded this turn) and choose a player, making them make a judgement; if the '
    + 'result is: black, that player draws X cards (X is their current HP, at most 3), then '
    + 'you cannot use "Grading" on them for the rest of this turn; <font '
    + 'color=\'red\'>♥</font>, the card you discarded for this use of "Grading" does not '
    + 'count toward the types you have discarded; <font color=\'red\'>♦</font>, you turn your '
    + 'character card over.',
  ':m_ex__duanliang': 'You can use a black non-trick card as Supply Shortage. When you use Supply Shortage '
    + 'on a player whose hand size is not less than yours, it has no distance restriction.',
  ':m_ex__duodao': 'After you take damage, you can obtain the weapon card in the damage source\'s equip area.',
  ':m_ex__fangquan': 'You can skip your Action phase. If you do, your hand limit this turn is equal to '
    + 'your max HP, and after this turn ends, you can discard a hand card to make another '
    + 'player take an extra turn.',
  ':m_ex__fangzhu': 'After you take damage, you can make another player choose one: 1. discard X cards '
    + 'and lose 1 HP; 2. draw X cards and turn their character card over (X is the amount '
    + 'of HP you have lost).',
  ':m_ex__fenji': 'In a player\'s Finish phase, if they have no hand cards, you can make them draw two '
    + 'cards, then you lose 1 HP.',
  ':m_ex__fuli': '(once per game) When you are in the dying state, you can recover your current HP to '
    + 'X (X is the number of kingdoms in play). Then, if your HP is the unique highest in '
    + 'play, you turn your character card over.',
  ':m_ex__ganlu': 'Once per Action phase, you can choose two players the difference between whose '
    + 'numbers of cards in their equip areas is no greater than the amount of HP you have '
    + 'lost, and exchange the cards in their equip areas; if you are one of the players you '
    + 'choose, the restriction on the difference does not apply.',
  ':m_ex__gongqi': 'If there is a horse card in your equip area, your ATK range is unlimited; once per '
    + 'Action phase, you can discard a non-basic card and choose another player who has '
    + 'cards, then discard a card from them.',
  ':m_ex__guhuo': 'Once per turn, you can place a hand card face down and use or play it as any basic '
    + 'card or ordinary trick card. Before using this card, each other player in turn '
    + 'chooses whether to challenge; if a player challenges, this card is turned face up: '
    + 'if it is false, this card is voided; if it is true, that player gains Lingering '
    + 'Grudge.',
  ':m_ex__hunzi': '(awaken) In your Prepare phase, if your HP is not greater than 2, you reduce your '
    + 'max HP by 1, then gain Handsome and Heroic Soul.',
  ':m_ex__huoji': 'You can use a red card as Fire Attack.',
  ':m_ex__jianchu': 'After you use a Slash and choose a target, you can discard one of their cards. If '
    + 'that card is: an equipment card, they cannot respond to this Slash; not an equipment '
    + 'card, that player obtains this Slash.',
  ':m_ex__jiangchi': 'At the start of your Action phase, you can choose one option: 1. draw a card, and '
    + 'you cannot use Slash this phase; 2. discard a card, and this phase you use Slash '
    + 'with no distance restriction and can use one extra Slash.',
  ':m_ex__jianying': 'When you use a card during your Action phase, if that card has the same number or '
    + 'suit as the previous card you used during this phase, you can draw a card. Once per '
    + 'Action phase, you can use a card as any kind of basic card; if the previous card you '
    + 'used during this phase has a suit, this card\'s suit is treated as the suit of the '
    + 'previous card you used this turn.',
  ':m_ex__jiaojin': 'When you take damage dealt by a male player, you can discard an equip card to '
    + 'prevent this damage.',
  ':m_ex__jieming': 'After you take 1 damage, you can make a player draw two cards, then if their number '
    + 'of hand cards is less than their max HP, you draw a card.',
  ':m_ex__jieyue': 'At your Finish phase, you can give a card to another player, then they choose one: '
    + '1. keep one hand card and one card in their equip area, then discard the rest; 2. '
    + 'make you draw three cards.',
  ':m_ex__jiezi': '(forced) After another player skips their Draw phase, you draw a card.',
  ':m_ex__jinjiu': '(forced) The card name of your Alcohol counts as Slash, and such a Slash is a normal '
    + 'Slash; when you take damage from a Slash whose base damage was increased by an '
    + 'Alcohol taking effect, you reduce the damage by X (X is the base damage increase '
    + 'caused by that Alcohol); other players cannot use Alcohol during your turn.',
  ':m_ex__jiushi': 'When you need to use an Alcohol, if your character card is face up, you can turn '
    + 'your character card over, and it counts as using an Alcohol; after you take damage, '
    + 'if your character card is face down and you have not used Wine Poetry for this '
    + 'damage, you can turn your character card over and randomly obtain a trick card from '
    + 'the draw pile.',
  ':m_ex__jiushi_upgrade': 'When you need to use an Alcohol, if your character card is face up, you can turn '
    + 'your character card over, and it counts as using an Alcohol; after you take damage, '
    + 'if your character card is face down and you have not used Wine Poetry for this '
    + 'damage, you can turn your character card over; after you turn your character card '
    + 'over, you randomly obtain a trick card from the draw pile.',
  ':m_ex__juece': 'In your Finish phase, you can deal 1 damage to another player who has lost cards '
    + 'this turn.',
  ':m_ex__junxing': 'Once per Action phase, you can discard any number of hand cards and make another '
    + 'player choose one: 1. discard the same number of cards and lose 1 HP; 2. turn their '
    + 'character card over, then draw the same number of cards.',
  ':m_ex__kanpo': 'You can use a black card as Nullification.',
  ':m_ex__kongsheng': 'At your Prepare phase, or after you lose or recover HP, you can place any number of '
    + 'the current turn player\'s cards on their character card; at their Finish phase, you '
    + 'can use one of those cards, and they obtain the rest.',
  ':m_ex__liangyin': 'When a card is placed on a character card, you can make a player draw a card; when '
    + 'any player obtains a card from a player\'s character card, you can make a player '
    + 'discard a card. At the end of each round, you can make the only player who became a '
    + 'target of Auspicious Match this round recover 1 HP, or make the only player who did '
    + 'not become a target of Auspicious Match this round lose 1 HP.',
  ':m_ex__lianhuan': 'You can use or recast a ♣ hand card as Iron Chain; when you use Iron Chain you can '
    + 'designate one additional target.',
  ':m_ex__lihuo': 'When you use a normal Slash, you can change this Slash into a fire Slash. If the '
    + 'target player of this Slash is chained, this Slash\'s damage is increased by 1. After '
    + 'a fire Slash you used finishes resolving, you lose 1 HP for every 2 damage it dealt.',
  ':m_ex__luanji': 'In your Action phase, you can use two hand cards as an Archery Attack (you cannot '
    + 'use a suit already used for this skill during this phase); when another player plays '
    + 'a Dodge in response to an Archery Attack you used, they draw a card; after an '
    + 'Archery Attack you used finishes resolving, if no player took damage from that card, '
    + 'you draw cards equal to the number of targets that Archery Attack designated.',
  ':m_ex__mieji': 'Once per Action phase, you can put a black trick card on top of the draw pile and '
    + 'choose another player who has hand cards; they choose: 1. give you a trick card; 2. '
    + 'discard two non-trick cards one at a time (discard one if they do not have enough).',
  ':m_ex__niepan': '(once per game) In your Action phase, or while you are dying, you can discard all '
    + 'the cards in your areas, draw three cards, heal your HP up to 3 and restore your '
    + 'character card.',
  ':m_ex__paiyi': 'Once per Action phase, you can remove one "Power" card to make a player draw two '
    + 'cards. If that player\'s number of hand cards is greater than yours, you deal 1 '
    + 'damage to them.',
  ':m_ex__pingkou': 'At the end of your turn, you can deal 1 damage to each of up to X other players (X '
    + 'is the number of phases you skipped this turn). If you do, you randomly obtain an '
    + 'equip card from the draw pile.',
  ':m_ex__pojun': 'After you use a Slash and choose a target, you can place up to X of their cards face '
    + 'down beside that player\'s character card (X is their HP); if you do, at the end of '
    + 'the current turn, that player obtains these cards; when a Slash you use deals damage '
    + 'to a target player whose hand card count and equip area card count are both not '
    + 'greater than yours, this damage +1.',
  ':m_ex__qiangxi': 'Once per Action phase for each player, you can lose 1 HP or discard a weapon card to '
    + 'deal 1 damage to another player in your ATK range.',
  ':m_ex__qiaoshui': 'Once per Action phase, you can start a point fight with a player. If you win, the '
    + 'next basic card or normal trick card you use this phase can choose one more or one '
    + 'fewer target (with no distance restriction); if you do not win, you cannot use trick '
    + 'cards this phase.',
  ':m_ex__qieting': 'After another player\'s turn ends, if they did not deal damage to another player '
    + 'during that turn, you can choose: 1. look at two of their hand cards and obtain one '
    + 'of them; 2. put a card from their equip area into your equip area; 3. draw a card.',
  ':m_ex__qimou': '(once per game) In your Action phase, you can lose any amount of HP; until the end '
    + 'of the turn, your distance to other players is reduced by X and you can use X '
    + 'additional Slash (X is the amount of HP you lost this way).',
  ':m_ex__qingjian': 'Once per turn, after you obtain cards outside your Draw phase, you can place any '
    + 'number of hand cards face down on your character card; in a player\'s Finish phase, '
    + 'if there are "Frugality" cards on your character card, you distribute those cards '
    + 'among other players, and if you give away more than one card, you draw a card.',
  ':m_ex__qingnang': 'Once per Action phase, you can discard a hand card and choose a wounded player, '
    + 'making them recover 1 HP. If the discarded card was red, you can use Green Salve '
    + 'again on a player not yet chosen this phase.',
  ':m_ex__qiuyuan': 'When you become the target of a Slash, you can make another player give you a basic '
    + 'card other than Slash, otherwise they also become a target of this Slash.',
  ':m_ex__quanji': 'At the end of your Action phase, if your hand card count is greater than your HP, or '
    + 'after you take 1 damage, you can draw a card, then you place a hand card on your '
    + 'character card, called Power; your hand card limit +X (X is the number of Power).',
  ':m_ex__shenxing': 'X times per Action phase (X is your HP), you can discard two cards; if the discarded '
    + 'cards are different colors, you draw two cards; otherwise you draw one card.',
  ':m_ex__shuangxiong': 'In your Draw phase, you can instead reveal the top two cards of the draw pile and '
    + 'obtain one of them, then this turn you can use hand cards whose colour differs from '
    + 'that card as Duel; after you take damage from a Duel used this way, you can obtain '
    + 'the Slashes other players played to respond to that Duel.',
  ':m_ex__sidi': 'After a card other than a delayed trick that you use finishes resolving, you can '
    + 'choose another player who has not yet been assigned a Mark the Foe target, and name '
    + 'a Mark the Foe target player for them (neither choice is revealed). When the first '
    + 'card other than a delayed trick that they use targets only that Mark the Foe target '
    + 'and no one else (otherwise you clear the Mark the Foe target you named for them), '
    + 'you carry out an effect as follows: if the target is you, you draw a card; if the '
    + 'target is not you, you choose: 1. cancel that card, then if no player is dying at '
    + 'this time, you deal 1 damage to them; 2. you draw two cards. Then you clear the Mark '
    + 'the Foe target you named for them.',
  ':m_ex__tianxiang': 'When you take damage, you can discard a <font color=\'red\'>♥</font> hand card and '
    + 'choose another player. You prevent this damage and choose one: 1. the damage source '
    + 'deals 1 damage to them, and they draw X cards (X is the amount of HP they have lost, '
    + 'at most 5); 2. they lose 1 HP and obtain the card you discarded this way from the '
    + 'draw pile or the discard pile.',
  ':m_ex__tiaoxin': 'Once per Action phase, you can choose another player; unless that player uses a '
    + 'Slash on you, you discard a card from them.',
  ':m_ex__tuntian': 'After you lose cards outside your turn, you can make a judgement: if the result is '
    + '<font color=\'red\'>♥</font>, you obtain the judgement card; otherwise you put the '
    + 'judgement card, after it takes effect, on your character card, called a Field card; '
    + 'your distance to other players is -X (X is the number of Field cards).',
  ':m_ex__wurong': 'Once per Action phase, you can hold a strategy duel with another player; according '
    + 'to what both sides choose:<br>Suppress-Resist, you deal 1 damage to them, then you '
    + 'draw a card.<br>Suppress-Submit, you obtain one card from them, then give them two '
    + 'cards.<br>Appease-Resist, you take 1 damage, then you draw a '
    + 'card.<br>Appease-Submit, they give you two cards; if they have fewer than two cards, '
    + 'instead they skip their next Draw phase.',
  ':m_ex__xianzhen': 'Once per Action phase, you can start a point fight with a player. If you win, during '
    + 'this phase you ignore their armour and use cards against them with no distance '
    + 'restriction and no limit on the number of uses; if you do not win, you cannot use '
    + 'Slash during this phase. If your point fight card is a Slash, your Slashes do not '
    + 'count toward your hand limit this turn.',
  ':m_ex__xingshang': 'When another player dies, you can choose one option: 1. obtain all their cards; 2. '
    + 'recover 1 HP.',
  ':m_ex__xingxue': 'In your Finish phase, you can choose up to X players (X is your HP); each of those '
    + 'players draws a card and puts a card on top of the draw pile. If you do not have '
    + 'Banquet Execution, they can instead give a card to another target of this skill, and '
    + 'X becomes your max HP.',
  ':m_ex__xingxue_normal': 'In your Finish phase, you can choose up to X players (X is your HP); each of those '
    + 'players draws a card and puts a card on top of the draw pile.',
  ':m_ex__xingxue_upgrade': 'In your Finish phase, you can choose up to X players (X is your max HP); each of '
    + 'those players draws a card and chooses: 1. put a card on top of the draw pile; 2. '
    + 'give a card to another target of this skill.',
  ':m_ex__xuanfeng': 'After you have discarded at least two cards in your Discard phase, or after you lose '
    + 'a card from your equip area, you can choose one option: 1. discard two cards in '
    + 'total from up to two other players; 2. move a card in one other player\'s equip area '
    + 'to the corresponding area of another other player.',
  ':m_ex__yanzhu': 'Once per Action phase, you can make another player choose one option: 1. you obtain '
    + 'one card from their areas; 2. you obtain all cards in their equip area (at least '
    + 'one), then you lose Banquet Execution.',
  ':m_ex__yaoming': '(charge 2/4) During your Action phase or after you take damage, you can reduce 1 '
    + 'charge point and choose one: 1. discard a card from another player whose hand count '
    + 'is no less than yours; 2. make a player whose hand count is no greater than yours '
    + 'draw a card. If this option is different from the option you chose last time, you '
    + 'gain 1 charge point and clear the recorded option. After you take 1 damage, you gain '
    + '1 charge point.',
  ':m_ex__yicong': '(forced) Your distance to other players is -X (X is your HP -1); other players\' '
    + 'distance to you is +Y (Y is your lost HP -1).',
  ':m_ex__yongsi': '(forced) During your Draw phase, you draw X cards instead (X is the number of '
    + 'kingdoms in play); at the start of your Discard phase, you must discard a card, or '
    + 'lose 1 HP.',
  ':m_ex__zenhui': 'Once per Action phase, when you use a Slash or a black regular trick card and choose '
    + 'a player as its only target, you can choose another player who can be a legal target '
    + 'of this card, and choose one: 1. obtain a card from that player, then they replace '
    + 'you as the user of this card; 2. make them also become a target of this card.',
  ':m_ex__zhiji': '(awaken) In your Prepare phase, if you have no hand cards, you recover 1 HP or draw '
    + 'two cards, reduce your max HP by 1, then gain Stargaze.',
  ':m_ex__zhijian': 'During your Action phase, you can put an equip card from your hand into another '
    + 'player\'s equip area, then draw a card. When you use an equip card during your Action '
    + 'phase, you draw a card.',
  ':m_ex__zhongyong': 'After a Slash you use during your Action phase finishes resolving, if no target '
    + 'player used a Dodge in response to this Slash, you can obtain this Slash again; '
    + 'otherwise you can choose: 1. obtain the Dodges that responded to this Slash, then '
    + 'you can give this Slash to another player; 2. give the Dodges that responded to this '
    + 'Slash to another player, then your limit on the number of Slashes you can use this '
    + 'phase +1, and the base damage of the next Slash you use this phase +1. You cannot '
    + 'use cards obtained through Loyal Valour this turn.',
  ':m_ex__zhuikong': 'Once per round, in another player\'s Prepare phase, if their HP is not less than '
    + 'yours, you can point fight with them. If you win, this turn they cannot use a card '
    + 'targeting any player other than themselves; if you do not win, you obtain their '
    + 'point fight card, then it counts as them using a Slash on you.',
  ':m_ex__zili': '(awaken) During your Prepare phase, if the number of Power is no less than 3, choose '
    + 'one: 1. recover 1 HP; 2. draw two cards. Then your max HP -1 and you gain Rejection.',
  ':m_ex__zongshi': '(forced) Your hand limit is +X (X is the number of kingdoms in play). In your '
    + 'Prepare phase, if your hand card count is greater than your HP, you use Slash with '
    + 'no limit on the number of uses this turn.',
  ':m_ex__zongshij': 'After you take part in a point fight, you look at the top card of the draw pile and '
    + 'can choose one: obtain that top card of the draw pile, or obtain the lower-numbered '
    + 'of the two point fight cards.',
  ':m_ex__zongxuan': 'Once per Action phase, you can draw a card, then put a card on top of the draw pile; '
    + 'when your cards are put into the discard pile because they are discarded, you can '
    + 'put any number of them on top of the draw pile.',
  ':m_js__fayi': 'After a council you took part in ends, you can deal 1 damage to up to two (in '
    + 'Landlord mode, one instead) players whose opinion differs from yours.',
  ':m_js__fayi_1v2': 'After a council you took part in ends, you can deal 1 damage to one player whose '
    + 'opinion differs from yours.',
  ':m_js__fayi_role_mode': 'After a council you took part in ends, you can deal 1 damage to up to two players '
    + 'whose opinion differs from yours.',
  ':m_js__jishan': 'Once per turn for each effect, when a player takes damage, you can lose 2 HP and '
    + 'prevent this damage, then you and they each draw a card; after you deal damage, you '
    + 'can make a player with the lowest HP whose damage has been prevented this way '
    + 'recover 1 HP.',
  ':m_js__juelie': 'When a Slash you use deals damage to the target player, if your hand card count or '
    + 'your HP is the lowest in play, this damage is +1. After you use a Slash and choose a '
    + 'player as a target, you can discard a card, then discard one card from them.',
  ':m_js__shelun': 'Once per Action phase, if you have hand cards, you can choose up to two (in Landlord '
    + 'mode, one instead) other players in your ATK range, then you make every other player '
    + 'whose hand card count is not greater than yours hold a council. If the result is '
    + 'red, you discard two cards from each of the chosen players; if black, you deal 1 '
    + 'damage to each of them.',
  ':m_js__shelun_1v2': 'Once per Action phase, if you have hand cards, you can choose one other player in '
    + 'your ATK range, then you make every other player whose hand card count is not '
    + 'greater than yours hold a council. If the result is red, you discard two cards from '
    + 'the chosen player; if black, you deal 1 damage to them.',
  ':m_js__shelun_role_mode': 'Once per Action phase, if you have hand cards, you can choose up to two other '
    + 'players in your ATK range, then you make every other player whose hand card count is '
    + 'not greater than yours hold a council. If the result is red, you discard two cards '
    + 'from each of the chosen players; if black, you deal 1 damage to each of them.',
  ':m_liuyi__liulongcanjia': 'Equip card - Treasure<br/><b>Treasure skill</b>: your distance to other players is '
    + '-X; other players\' distance to you is +X (X is the number of cards with rank K in '
    + 'play).',
  ':m_liuyi_laws_cards': '',
  ':m_liuyi_laws_damage': '',
  ':m_liuyi_laws_gain': '',
  ':m_liuyi_laws_hp': '',
  ':m_shi__ceduan': 'Once per Action phase, you can choose a player whose ATK range includes you; all '
    + 'players within that player\'s ATK range simultaneously show a hand card, then you use '
    + 'all of your hand cards of the color shown most often as one Slash of any kind that '
    + 'does not count toward the use limit against them. If it deals damage, you draw a '
    + 'card.',
  ':m_shi__dimeng': 'Once per Action phase, you can make two players whose hand counts differ by no more '
    + 'than 3 exchange hand cards, then you choose one: 1. you discard X cards (all of them '
    + 'if you have fewer); 2. the player with fewer hand cards after the exchange draws X '
    + 'cards (X is your lost HP).',
  ':m_shi__haoshi': 'At your Finish phase, you can choose another player; until the start of your next '
    + 'turn, they can use or play your hand cards as if they were their own hand cards. The '
    + 'first two times during that period that you lose your last hand card this way, you '
    + 'draw until you have three hand cards.',
  ':m_shi__haoshi&': 'You can use or play Momentum Lu Su\'s hand cards as if they were your own hand cards.',
  ':m_shi__jixi': 'At the end of a player\'s turn, if there is another player who has been a target of a '
    + 'card you used this turn, you can discard a card from the current turn player; it '
    + 'counts as using a Snatch with no distance restriction that targets any number of '
    + 'those players.',
  ':m_shi__kuanggu': 'After you deal damage to a player at distance 1 or less, you can choose one option: '
    + '1. recover 1 HP; 2. draw a card.<br>⬤ Level 2: After you deal damage to a player at '
    + 'distance 1 or less, you can choose one option: 1. recover 1 HP; 2. draw a card. '
    + 'Backwater: discard a card, then the number of Slashes you can use this phase is +1.',
  ':m_shi__kuanggu1': 'After you deal damage to a player at distance 1 or less, you can choose one option: '
    + '1. recover 1 HP; 2. draw a card.',
  ':m_shi__kuanggu2': 'After you deal damage to a player at distance 1 or less, you can choose one option: '
    + '1. recover 1 HP; 2. draw a card. Backwater: discard a card, then the number of '
    + 'Slashes you can use this phase is +1.',
  ':m_shi__qingyan': 'You can show X hand cards (X is the number of times this skill has been triggered '
    + 'this round, up to 5), and it counts as using a Dodge or a Nullification; then this '
    + 'skill is disabled until none of the cards shown this way are in your hand.',
  ':m_shi__tuntian': 'Charge skill (0/0), after you lose a non-damage card, you gain 1 charge point; once '
    + 'per Action phase, you can spend at least 1 charge point to make up to that many '
    + 'players each randomly obtain a <font color=\'red\'>♥</font> card; at the start of a '
    + 'player\'s turn, if your charge points are full, you draw a card and your charge point '
    + 'limit +1.',
  ':m_shi__xianshuai': '(forced) During your turn, the first hand card you use of each suit does not count '
    + 'toward the use limit and has no limit on the number of uses.',
  ':m_shi__zaoxian': '(forced) When the number of charge points you spend at once is no less than the '
    + 'corresponding value, you obtain the corresponding card from the discard pile:\n  3, '
    + 'Ex Nihilo;\n  5, Nullification;\n  7, Amazing Grace.',
  ':m_yuan__wusheng': 'You can use or play any number of cards as a Slash with no distance restriction. '
    + 'After that Slash resolves, if this is the first time this turn that you converted '
    + 'that number of cards, you draw two cards and that Slash does not count toward the '
    + 'use limit.',
  ':m_yuan__yijue': '(forced) When you are about to deal lethal damage to a player, they choose whether '
    + 'to give you any number of cards; then you choose one: 1. they cannot use or play '
    + 'cards this turn, and you discard all your hand cards of the same suits as those '
    + 'cards; 2. prevent that damage, and this round, when they or you use a card targeting '
    + 'the other, that target is cancelled.',
  ':miaolue': 'At the start of the game, you gain two <a href=\':underhanding\'>Underhanding</a>; '
    + 'after you take damage, you can choose one option: 1. draw two cards; 2. obtain a <a '
    + 'href=\'bag_of_tricks\'>Bag of Tricks</a> card you name from the draw pile or the '
    + 'discard pile.',
  ':mibei': '(mission) <br>\n  ⬤ Success: after the settlement of a card you use, if you have no '
    + 'fewer than two Preps of every card type, you obtain one card of each type from the '
    + 'draw pile, then you gain the skill Kingmaker.<br>\n  ⬤ Failure: at the end of your '
    + 'Discard phase, if you have no Prep both at that moment and at the start of this '
    + 'turn\'s Prepare phase, you lose 1 max HP and the mission fails.',
  ':miewu': 'Once per turn, you can discard 1 Armory mark and use or play a card as any basic '
    + 'card or trick card; if you do, you draw a card.',
  ':mingcha': 'At the start of your Draw phase, you reveal the top three cards of the draw pile, '
    + 'then you can give up drawing and obtain the cards among them with a number of 8 or '
    + 'less; if you obtain cards this way, you can choose another player and obtain a '
    + 'random card from them.',
  ':mobile__baiyin': '(awaken) At the start of your Prepare phase, if you have at least 4 Endure marks, '
    + 'you lose 1 max HP, then gain Ultimate Strategy.',
  ':mobile__beini': 'Once per Action phase, you can choose a player whose HP is not less than yours and '
    + 'make either you or them draw two cards, then the player who did not draw chooses one '
    + 'option: 1. it counts as using a Slash on the player who drew, with no distance '
    + 'restriction and no limit on the number of uses; 2. obtain a card on the field of the '
    + 'player who drew.',
  ':mobile__biaozhao': 'In your Finish phase, you can place a card face down on your character card, called '
    + 'a Memorial. When a card with the same rank as the Memorial enters the discard pile, '
    + 'you remove the Memorial and lose 1 HP. In your Prepare phase, you remove the '
    + 'Memorial, then make a player recover 1 HP and draw three cards.',
  ':mobile__bijing': 'In your Finish phase, you can choose a hand card and mark it as Closed Border. If '
    + 'you lose the Closed Border card outside your turn, at the start of the current turn '
    + 'player\'s Discard phase, they must discard two cards. In your Prepare phase, you '
    + 'discard the Closed Border card from your hand.',
  ':mobile__canyun': 'Once per Action phase, you can choose up to X other players and discard that many '
    + 'cards (X is your HP; once per game for each player). Compare the number of cards in '
    + 'those players\' equip areas with yours: fewer than yours, they recover 1 HP; more '
    + 'than yours, they lose 1 HP; equal to yours, they draw a card. If the number of '
    + 'targets you chose equals X, you draw a card.',
  ':mobile__catapult': 'Equip card - Weapon<br/><b>ATK range</b>: 9<br/><b>Weapon skill</b>: after you deal '
    + 'damage to another player, you can discard all cards in their equip area.',
  ':mobile__chenjie': '(forced) If you have Halting Aid, after a player who has been a target of Halting '
    + 'Aid dies, you discard all cards in your area, then draw four cards.',
  ':mobile__chijie': 'Once per turn, when you become the only target of a card used by another player, you '
    + 'can perform a judgement; if the number is greater than 6, cancel it.',
  ':mobile__choujue': '(forced) After you kill a player, you gain 1 max HP, draw two cards, and the number '
    + 'of times you can use Repel the Foe this turn is increased by 1.',
  ':mobile__dangyi': '(persistent) (lord skill) Once per turn, when you deal damage, you can make this '
    + 'damage +1 (twice per game).',
  ':mobile__daoshu': 'Once per Action phase, you can choose another player with at least 2 hand cards. '
    + 'That player chooses one of three random card names and disguises a hand card with a '
    + 'different card name as a card of that name, then you look at their hand cards after '
    + 'the disguise and guess which one is disguised (in 2v2 or Landlord mode, instead '
    + 'choose an enemy player with at least 2 hand cards, and you and your allies guess at '
    + 'the same time). Each player who guesses correctly deals 1 damage to that player; '
    + 'each player who guesses wrong randomly discards two hand cards, or loses 1 HP '
    + 'instead if they do not have enough hand cards.',
  ':mobile__daoshu_1v2': 'Once per Action phase, you can choose an enemy player with at least 2 hand cards. '
    + 'That player chooses one of three random card names and disguises a hand card with a '
    + 'different card name as a card of that name, then you look at their hand cards after '
    + 'the disguise and, together with your allies, guess at the same time which one is '
    + 'disguised. Each player who guesses correctly deals 1 damage to that player; each '
    + 'player who guesses wrong randomly discards two hand cards, or loses 1 HP instead if '
    + 'they do not have enough hand cards.',
  ':mobile__daoshu_role_mode': 'Once per Action phase, you can choose another player with at least 2 hand cards. '
    + 'That player chooses one of three random card names and disguises a hand card with a '
    + 'different card name as a card of that name, then you look at their hand cards after '
    + 'the disguise and guess which one is disguised. Each player who guesses correctly '
    + 'deals 1 damage to that player; each player who guesses wrong randomly discards two '
    + 'hand cards, or loses 1 HP instead if they do not have enough hand cards.',
  ':mobile__diancai': 'At the end of another player\'s Action phase, if you lost at least X cards during '
    + 'that phase (X is your HP), you can draw cards until you have as many hand cards as '
    + 'your max HP.',
  ':mobile__dianhua': 'In your Prepare phase or Finish phase, you can view the top X cards of the draw pile '
    + '(X is the number of your marks), then put these cards back on top of the draw pile '
    + 'in any order.',
  ':mobile__diaodu': 'In your Prepare phase, you can move an equip card on the field, then the player who '
    + 'loses a card this way draws a card.',
  ':mobile__dingfa': 'At the end of your Discard phase, if the number of cards you lost this turn is not '
    + 'less than 4, you can choose one option: 1. heal 1 HP; 2. discard up to two cards '
    + 'from a player.',
  ':mobile__falu': '(forced) After your cards are moved to the discard pile by being discarded, you '
    + 'obtain the corresponding marks according to the suits of those cards:<br>♠, you '
    + 'obtain 1 "Purple Star";<br>♣, you obtain 1 "Earth Queen";<br><font '
    + 'color=\'red\'>♥</font>, you obtain 1 "Jade Purity";<br><font color=\'red\'>♦</font>, you '
    + 'obtain 1 "Hook Star".<br>You can have at most one of each mark. At the start of the '
    + 'game, you obtain all four marks above.',
  ':mobile__fengji': '(forced) At the start of your turn, if your number of hand cards is not less than '
    + 'the number you had after the end of your previous turn, you draw three cards and '
    + 'your hand limit this turn is equal to your max HP.',
  ':mobile__fenxin': 'Before a player you have killed reveals their role card, you can choose one:<br>1. '
    + 'if their camp is different from yours, gain all skills on their character card '
    + '(except once-per-game, awaken, mission, lord and persistent skills);<br>2. exchange '
    + 'role cards with them (selectable only while neither your role card nor theirs is '
    + 'revealed).',
  ':mobile__fozong': '(forced) Your hand cards with the same color as the cards you obtained through Pure '
    + 'Land do not count toward your hand limit, and the amount of damage you deal and of '
    + 'HP you recover is +1.',
  ':mobile__fuhaiw': 'Once per Action phase, you can make all other players choose Rising Tide or Ebbing '
    + 'Tide at the same time, then you draw X cards (X is the number of players who chose '
    + 'the same option consecutively, starting from your next player).',
  ':mobile__fujian': '(forced) In your Finish phase, you randomly view X hand cards of another player (X '
    + 'is the number of hand cards of the player with the fewest hand cards).',
  ':mobile__funan': 'When another player uses or plays a card to respond to a card you use, you can '
    + 'obtain the card they used or played.<br>⬤ Level 2: When another player uses or plays '
    + 'a card to respond to a card you use, you can obtain the card they used or played; '
    + 'after the settlement of a card you use that was obtained this way ends, if no other '
    + 'player responded to that card, you draw a card.',
  ':mobile__funan_update': 'When another player uses or plays a card to respond to a card you use, you can '
    + 'obtain the card they used or played; after the settlement of a card you use that was '
    + 'obtained this way ends, if no other player responded to that card, you draw a card.',
  ':mobile__geyuan': 'When you use a card whose number is X (X is the value of the first digit after the '
    + 'decimal point of pi), you can draw Y cards and adjust X to the value of the next '
    + 'digit (Y is the number of times you have used this skill this turn plus 1, and at '
    + 'most pi).',
  ':mobile__gongsun': 'At the start of your Action phase, you can discard two cards and choose another '
    + 'player, then declare the name of a basic card or a normal trick card. If you do, '
    + 'until the start of your next turn or until you die, neither you nor they can use, '
    + 'play or discard hand cards with that name.',
  ':mobile__guixiu': '(forced) In your Finish phase, if your HP is odd, you draw a card; otherwise you '
    + 'recover 1 HP.',
  ':mobile__hanzhan': 'Once per Action phase, you can choose another player; you and they each draw until '
    + 'you have X hand cards (X is each player\'s own max HP, and each player draws at most '
    + 'three cards), then it counts as you using a Duel on them.',
  ':mobile__huishi': 'Once per Action phase, if your max HP is less than 10, you can judge. If the suit '
    + 'differs from every other judgement result in this process and your max HP is less '
    + 'than 10, you can gain 1 max HP and repeat this process. Finally you give all '
    + 'judgement cards that took effect in this process to a player, and if they have the '
    + 'most hand cards in play, you lose 1 max HP.',
  ':mobile__huxiao': 'Once per Action phase, you can choose one: 1. deal 1 fire damage to a player whose '
    + 'HP is not less than yours; 2. cards you use this turn have no distance restriction; '
    + 'Desperate Stand: discard a red card.',
  ':mobile__jianji': 'Once per Action phase, you can secretly choose a hand card and make two players '
    + 'point fight; the player who wins counts as using a Slash with no distance '
    + 'restriction against the player who did not win. During this point fight, those '
    + 'players can secretly choose to use the card you chose for the point fight instead, '
    + 'then if that card is a Slash, you deal 1 damage to the player who chose to point '
    + 'fight with it.',
  ':mobile__jiaohua': 'Twice per Action phase, you can make a player obtain from the draw pile a card of a '
    + 'type that has not been chosen this way; after every type has been chosen, reset the '
    + 'chosen types.',
  ':mobile__jiexun': 'In your Finish phase, you can choose a suit and make another player draw cards equal '
    + 'to the number of cards of that suit on the field (up to 5), then they discard X '
    + 'cards (X is the number of times this skill has been used). If they discard all their '
    + 'hand cards this way, you upgrade Rebuttal.',
  ':mobile__jieyu': 'In your Finish phase, you can randomly obtain X basic cards with different names '
    + 'from the discard pile (X is 3 minus the number of times you have been the target of '
    + 'another player\'s Slash or damage-dealing trick card from the last time you used this '
    + 'skill up to this phase, and X is at least 1).',
  ':mobile__jieyuan': 'When you deal damage, you can choose one: 1. obtain a black card from the draw pile; '
    + '2. discard a black card, this damage +1. When you take damage, you can choose one: '
    + '1. obtain a red card from the draw pile; 2. discard a red card, this damage -1. '
    + 'Desperate Stand: delete all effects under the other trigger timing and upgrade this '
    + 'skill - the number of cards obtained becomes two, and the damage increase or '
    + 'decrease becomes 2.',
  ':mobile__jieyuan_black': 'When you deal damage, you can choose one: 1. obtain two black cards from the draw '
    + 'pile; 2. discard a black card, this damage +2.',
  ':mobile__jieyuan_red': 'When you take damage, you can choose one: 1. obtain two red cards from the draw '
    + 'pile; 2. discard a red card, this damage -2.',
  ':mobile__jilue': 'When you gain this skill, you gain Demonic Talent, then gain a skill matching your '
    + 'kingdom:<br>Wei, Exile; Shu, Wisdom; Wu, Balance; Neutral, Absolute Kill.<br>At the '
    + 'start of your Action phase, you can choose one option: 1. remove X Forbearance '
    + 'marks, then choose and gain one skill from Ultimate Strategy that you do not have (X '
    + 'is the number of times you have chosen this option +1, and at least 2); 2. remove up '
    + 'to two Forbearance marks, then draw that many cards.',
  ':mobile__jimeng': 'At the start of your Action phase, you can obtain a card from another player, then '
    + 'you give that player X cards (X is your HP).',
  ':mobile__jincui': '(once per game) In your Action phase, you can swap seats with another player, then '
    + 'you lose X HP (X is your HP minus the number of times you have used Guard the Court '
    + 'this game). If you did not lose HP this way, you gain 1 max HP, then the Desperate '
    + 'Stand option is removed from Guard the Court.',
  ':mobile__jingong': 'Once per Action phase, you can use an equip card or a Slash as a trick card (choose '
    + 'one of three: two random normal trick cards, plus one card chosen at random between '
    + 'Beauty Trap and Knife Behind a Smile), then in this turn\'s Finish phase, if you have '
    + 'dealt no damage this turn, you lose 1 HP.',
  ':mobile__jintao': '(forced) The Slashes you use have no distance restriction and your Slash use limit '
    + '+1. The first Slash you use in your Action phase cannot be responded to; the base '
    + 'damage value of the second Slash +1.',
  ':mobile__juexiang': 'When you die, the player who killed you discards all cards in their equip area and '
    + 'loses 1 HP, then you can make another player gain the skill Lingering Echo; that '
    + 'player can discard a ♣ card on the field, then gain the skill Final Echo.',
  ':mobile__jujun': '(forced) At the end of a phase in which you have been the target of a card and your '
    + 'HP has changed, it counts as using an Archery Attack.',
  ':mobile__kuangcai': 'At the start of your Action phase, you can set your active play time for this phase '
    + 'to 5 seconds. If you do, you use cards this phase with no distance restriction and '
    + 'no limit on the number of uses, and when you use a card, you draw a card and your '
    + 'active play time -1 second (you can draw at most five cards this way each phase).',
  ':mobile__kuangxiang': 'Once per Action phase, you can exchange hand cards with another player whose hand '
    + 'count is no greater than yours. Until the start of your next Action phase, after you '
    + 'or they lose all the hand cards obtained this way, you can carry out the effect of '
    + 'Foster Growth once.',
  ':mobile__lianji': 'Once per Action phase, you can choose two players; the first player randomly uses a '
    + 'weapon card from the draw pile, then it counts as randomly using one of the '
    + 'following cards on the second player: Slash, Duel, Fire Attack, Savage Assault, '
    + 'Archery Attack. If damage is dealt to the target player, you obtain that many "Chain '
    + 'Stratagem" marks.',
  ':mobile__lianpo': 'After you kill another player, you can choose one: 1. gain an extra turn after this '
    + 'turn ends (once per turn); 2. if you have Ultimate Strategy, choose and gain one '
    + 'skill of Ultimate Strategy that you do not already have.',
  ':mobile__lianzhu': 'Once per Action phase, you can show a card and give it to another player. This phase '
    + 'you use cards on the player who has that card with no distance or count restriction, '
    + 'and after you deal damage to them you can obtain that card.<br>After another player '
    + 'obtains that card during this phase, they choose one option: 1. give you a card '
    + 'other than that card, then give that card to the player who acts before them; 2. '
    + 'make you draw two cards.',
  ':mobile__liechi': '(forced) When you enter the dying state, the damage source discards a card.',
  ':mobile__lingren': 'Once per phase, after you designate the first target for a Slash or a damage-dealing '
    + 'trick card during your Action phase, you can guess whether the hand card area of one '
    + 'of the target players contains a basic card, a trick card or an equip card. If you '
    + 'guess correctly: at least one of them, the damage this card deals to them is '
    + 'increased by 1; at least two of them, you draw two cards; all three, you obtain '
    + 'Villainous Hero and Mourning until the start of your next turn.',
  ':mobile__lirang': 'At the start of another player\'s Draw phase, if you do not have the "Modesty" mark, '
    + 'you can gain the "Modesty" mark and make them draw two extra cards. If you do, at '
    + 'the end of that turn\'s Discard phase, you obtain up to two of the cards they '
    + 'discarded during that phase. Before your Draw phase begins, if you have the '
    + '"Modesty" mark, you skip this phase and remove the "Modesty" mark.',
  ':mobile__meibu': 'At the start of another player\'s Action phase, if you are within their ATK range, '
    + 'you can discard a card, then they are regarded as having the skill Cease Fire this '
    + 'turn. If the card you discarded this way is not a Slash or a black trick card, the '
    + 'distance between them and you is 1 this turn.',
  ':mobile__mingfa': 'In your Finish phase, you can show a card. At the start of the first Action phase of '
    + 'your next turn, if that card is still among your hand cards or in your equip area, '
    + 'you can point-fight with it against another player. If you: win, you obtain a card '
    + 'from them and randomly obtain a card with number X from the draw pile (X is the '
    + 'number of your point-fight card minus 1); do not win, you cannot use cards on other '
    + 'players this turn. After your point-fight card is revealed, you make its number +2.',
  ':mobile__mingshi': '(forced) After you take damage, if you have the "Modesty" mark, the damage source '
    + 'must discard a card from their areas; if the discarded card is: black, you obtain '
    + 'it; red, you recover 1 HP.',
  ':mobile__moucheng': '(awaken) After a player deals damage, if you have more than 2 "Chain Stratagem" '
    + 'marks, you increase your max HP by 1, heal 1 HP, lose Chain Stratagem and obtain '
    + 'Vaunted Merit.',
  ':mobile__mumu': 'At the start of your Action phase, you can choose one: discard an equip card in '
    + 'play; or obtain an armor card in play, then you cannot use or play Slash this turn.',
  ':mobile__mutao': 'Once per Action phase, you can choose a player and make them put all Slashes in '
    + 'their hand onto their character card, then they give these Slashes at random one by '
    + 'one to each player, starting with the player next to them, then they deal X damage '
    + 'to the last player (X is the number of Slashes in the last player\'s hand, up to 2).',
  ':mobile__natu_fu': 'After you use a trick card, you can trigger this skill. If this card:<br>1. has a '
    + 'name different from every Revival card in your hand, you make the player with the '
    + 'unique lowest HP recover 1 HP;<br>2. has a name that only you have used this game, '
    + 'you deal 1 fire damage to a player.<br>Ride the Momentum: all numbers in this '
    + 'execution of the effect +1.',
  ':mobile__natu_heng': 'Once per round, if you have no:<br>1. non-damage cards in hand, you can count as '
    + 'using or playing a Dodge;<br>2. damage cards in hand, you can count as using or '
    + 'playing a Slash that does not count toward your limit and has no limit on the number '
    + 'of uses.',
  ':mobile__natu_lie': 'After you use a basic card, you can adjust your hand card count to X (X is the '
    + 'number of times you have used this skill this turn +1, at most 5). If you discarded '
    + 'cards to do so, you can deal 1 damage to a player.',
  ':mobile__natu_xing': 'At the start of the game, you obtain from the draw pile one card of each card name '
    + 'among the trick cards that can designate targets, called Revival (they cannot be '
    + 'used or discarded and do not count toward your hand limit). X times per turn (X is '
    + 'the number of damage cards you have used this turn), after you deal damage, one '
    + 'random Revival card becomes usable. If there is no unusable Revival card in your '
    + 'hand, the cards you use have no distance or use-count restriction and cannot be '
    + 'responded to.',
  ':mobile__natu_yi': 'Once per Action phase, you can make up to two players each give you a card, then '
    + 'choose one:<br>1. use these cards as a Slash against one of those players (it does '
    + 'not count toward the use limit and has no distance or use limit); during this '
    + 'Slash\'s resolution, they cannot use hand cards of the same color as the cards it was '
    + 'converted from;<br>2. distribute these cards to players who were not targeted; after '
    + 'one of them uses a black card obtained this way and chooses another player as a '
    + 'target, that target\'s non-forced skills are invalid this turn.',
  ':mobile__niluan': 'During another player\'s Finish phase, if they have used a card on a player other '
    + 'than themselves this turn, you can use a Slash against them (with no distance '
    + 'restriction); then, after that Slash finishes resolving, if that Slash dealt damage '
    + 'to them, you discard one of their cards.',
  ':mobile__qianlong': '(persistent) At the start of the game, you gain 20 Resolve; you gain the '
    + 'corresponding amount of Resolve in the following situations: after you take 1 damage '
    + '-- 10; after you deal 1 damage -- 15; after you obtain cards -- 5.<br>Based on your '
    + 'Resolve you count as having the following skills: 25 - Upright; 50 - Wine Poetry; 75 '
    + '- Banishment; 99 - Resolute Advance. Your Resolve has a maximum of 99.',
  ':mobile__qiantun': '(kingdom) Wei skill. Once per Action phase, you can make another player who has hand '
    + 'cards show at least one hand card, then you point fight with them (they can only use '
    + 'the shown cards for the point fight). If you win, you obtain the hand cards they '
    + 'showed; if you do not win, you obtain their unshown hand cards. (In Landlord mode, '
    + 'you obtain at most two cards.)',
  ':mobile__qiantun_1v2': '(kingdom) Wei skill. Once per Action phase, you can make another player who has hand '
    + 'cards show at least one hand card, then you point fight with them (they can only use '
    + 'the shown cards for the point fight). If you win, you obtain the hand cards they '
    + 'showed; if you do not win, you obtain their unshown hand cards. (You obtain at most '
    + 'two cards.)',
  ':mobile__qiantun_role_mode': '(kingdom) Wei skill. Once per Action phase, you can make another player who has hand '
    + 'cards show at least one hand card, then you point fight with them (they can only use '
    + 'the shown cards for the point fight). If you win, you obtain the hand cards they '
    + 'showed; if you do not win, you obtain their unshown hand cards.',
  ':mobile__qianxinz': 'Once per Action phase, you can hand out up to two hand cards at random, one each, to '
    + 'the same number of other players; these are called Letters. Then, in such a player\'s '
    + 'next Prepare phase, if they have a Letter, they choose one option: 1. you draw two '
    + 'cards; 2. their hand limit this turn -2.',
  ':mobile__qingxian': 'Once per Action phase, you can choose up to X other players and discard the same '
    + 'number of cards (X is your HP). For each of these players, if the number of cards in '
    + 'their equip area is: less than yours, they recover 1 HP; greater than yours, they '
    + 'lose 1 HP; equal to yours, they draw a card. If the number of targets you chose is '
    + 'equal to X, you draw a card.',
  ':mobile__qizhou': '(forced) You gain the following skills according to the number of suits among the '
    + 'cards in your equip area: at least 1 suit - Handsome; at least 2 suits - Surprise '
    + 'Raid; at least 3 suits - Whirlwind.',
  ':mobile__renjie': '(forced) Up to four times per round, when you need to use or play a card to respond '
    + 'to a card, if you are not the user of that card and you do not respond, you gain an '
    + 'Endure mark.',
  ':mobile__runwei': 'Once per Action phase, you can show up to five cards from the top of the draw pile '
    + 'and make a player obtain all the cards of one colour among them. If you do: 1. once '
    + 'per phase, after you lose X cards (X is the number of cards they obtained this way), '
    + 'this skill can be used again, and it cannot target a player who has obtained cards '
    + 'this turn; 2. at the end of this phase, you discard the hand cards you obtained this '
    + 'way.',
  ':mobile__sanchen': '(awaken) In your Finish phase, if you have 3 Armoury marks, you gain 1 max HP, '
    + 'recover 1 HP, then gain the skill Conquer Wu.',
  ':mobile__saojian': 'Once per Action phase, you can look at another player\'s hand cards and choose one of '
    + 'them, then they repeatedly discard a hand card until they have discarded five cards '
    + 'or discarded the card you chose.',
  ':mobile__shajue': '(forced) When another player enters the dying state, if they need more than one '
    + 'Peach or Alcohol to be saved, you gain a Cruelty mark and obtain the card that made '
    + 'them enter the dying state.',
  ':mobile__shangyi': 'Once per Action phase, you can discard a card and choose another player who has hand '
    + 'cards; they look at your hand cards, then you look at their hand cards and obtain '
    + 'one of them.',
  ':mobile__shanxi': 'At the start of your Action phase, you can discard a red basic card and choose '
    + 'another player, then put up to X of their cards on their character card (X is your '
    + 'HP); at the end of this turn they obtain those cards.',
  ':mobile__shejian': 'At the end of your Discard phase, if you discarded at least two cards this phase and '
    + 'their suits are all different, you can discard a card from another player.',
  ':mobile__shiju': '(forced) After a card you use finishes resolving, if this card and the last card '
    + 'used before you used it are: of the same type, you obtain the top card of the draw '
    + 'pile; of the same suit, you obtain the bottom card of the draw pile. <a '
    + 'href=\'#ChengShi\'>Ride the Momentum</a>: if the card names are also the same, you '
    + 'gain or upgrade the skill <a href=\':kubai\'>Withered White</a>.',
  ':mobile__shuaiyan': 'At the start of your Discard phase, if your hand card count is greater than 1, you '
    + 'can show all your hand cards and make another player give you a card.',
  ':mobile__shushen': 'Once per turn each, after you recover HP, you can make another player draw two '
    + 'cards; after you get cards, if the number of those cards is greater than 1, you can '
    + 'make another player recover 1 HP.',
  ':mobile__sidai': '(once per game) In your Action phase, you can use all your basic cards as a Slash '
    + '(it does not count toward the number of uses). If those cards include: a Peach, '
    + 'after this Slash deals damage, the player who took the damage loses 1 max HP; a '
    + 'Dodge, the target of this Slash must discard a basic card, otherwise they cannot '
    + 'respond.',
  ':mobile__songshu': 'At the start of the Draw phase of another player whose HP is greater than yours, if '
    + 'there are cards in the "Benevolence" area, you can make them give up drawing and '
    + 'obtain X cards from the "Benevolence" area instead (X is your HP, up to a maximum of '
    + '5). If you do, this turn the cards they use cannot target other players.',
  ':mobile__tianshu': 'At the start of your Action phase, if <a href=\':js__peace_spell\'>Peace Spell</a> is '
    + 'not in the game, or is in the draw pile or the discard pile, you can discard a card '
    + 'and make a player obtain Peace Spell and use it.',
  ':mobile__tianyi': '(awaken) At the start of your Prepare phase, if every living player has taken damage '
    + 'this game, you gain 2 max HP, recover 1 HP, and make a player gain the skill '
    + 'Auspicious Aid.',
  ':mobile__tongdu': 'Once per turn, when you become the only target of a card used by another player, you '
    + 'can make a player recast a card.',
  ':mobile__tongji': 'When another player becomes the target of a Slash, if you are within their ATK range '
    + 'and you are not the user of this Slash, they can discard a card to transfer this '
    + 'Slash to you.',
  ':mobile__wangliec': 'At the start of your Action phase, you can choose a hand card. Your use of this card '
    + 'this phase has no distance restriction and cannot be responded to, and after your '
    + 'use of this card finishes resolving, you cannot use cards on other players this '
    + 'phase.',
  ':mobile__wangzun': '(forced) In the Prepare phase of a player whose HP is greater than yours, you draw a '
    + 'card (if they are the Lord or the Landlord, you draw one extra card and their hand '
    + 'limit this turn is reduced by 1).',
  ':mobile__wanwei': 'Once per round, when another player enters the dying state, or during your Action '
    + 'phase when you choose another player, you can make them recover X+1 HP (if that is '
    + 'not enough to save them from the dying state, they instead recover to 1 HP), then '
    + 'you lose X HP (X is your HP).',
  ':mobile__weisi': '(Neutral kingdom) Once per Action phase, you can choose another player and make them '
    + 'move any number of their hand cards out of the game until the end of the turn, then '
    + 'it counts as using a Duel on them; after this card deals damage to them, you obtain '
    + 'all their hand cards (in Landlord mode, all becomes one).',
  ':mobile__weisi_1v2': '(Neutral kingdom) Once per Action phase, you can choose another player and make them '
    + 'move any number of their hand cards out of the game until the end of the turn, then '
    + 'it counts as using a Duel on them; after this card deals damage to them, you obtain '
    + 'one of their hand cards.',
  ':mobile__weisi_role_mode': '(Neutral kingdom) Once per Action phase, you can choose another player and make them '
    + 'move any number of their hand cards out of the game until the end of the turn, then '
    + 'it counts as using a Duel on them; after this card deals damage to them, you obtain '
    + 'all their hand cards.',
  ':mobile__wuji': '(once per game) During your Action phase, you can modify Vengeance (after using a '
    + 'Vengeance card, draw a card) until the end of this phase; if you obtain at least two '
    + 'cards from Vengeance this phase, you instead modify Vengeance permanently.',
  ':mobile__xiahui': '(forced) Your black cards do not count toward your hand limit; when another player '
    + 'obtains a Chain Execution card or a black card of yours, they cannot use, play, or '
    + 'discard those cards until their HP decreases.',
  ':mobile__xiaoxi': 'You can use or play a black card as Slash.',
  ':mobile__xiezheng': 'In your Finish phase, you can make up to one player (in Landlord mode, up to two '
    + 'players instead, once per game) each place a random hand card on top of the draw '
    + 'pile, then it counts as you using a Besiege (in Role mode, you must give priority to '
    + 'targeting players of the same kingdom). After it resolves, if it dealt no damage, '
    + 'you lose 1 HP.',
  ':mobile__xiezheng_1v2': 'Once per game, in your Finish phase, you can make up to two players each place a '
    + 'random hand card on top of the draw pile, then it counts as you using a Besiege. '
    + 'After it resolves, if it dealt no damage, you lose 1 HP.',
  ':mobile__xiezheng_2v2': 'In your Finish phase, you can make one player place a random hand card on top of the '
    + 'draw pile, then it counts as you using a Besiege. After it resolves, if it dealt no '
    + 'damage, you lose 1 HP.',
  ':mobile__xiezheng_role_mode': 'In your Finish phase, you can make one player place a random hand card on top of the '
    + 'draw pile, then it counts as you using a Besiege (you must give priority to '
    + 'targeting players of the same kingdom). After it resolves, if it dealt no damage, '
    + 'you lose 1 HP.',
  ':mobile__xiezheng_role_mode2': 'In your Finish phase, you can make one player place a random hand card on top of the '
    + 'draw pile, then it counts as you using a Besiege. After it resolves, if it dealt no '
    + 'damage, you lose 1 HP.',
  ':mobile__xionghuo': 'At the start of the game, you gain 3 Cruelty marks. During your Action phase, you '
    + 'can give one Cruelty mark to another player. Damage you deal to other players who '
    + 'have this mark is +1, and at the start of their Action phase, they remove a Cruelty '
    + 'mark and one of the following happens at random: 1. they take 1 fire damage and '
    + 'cannot use Slash on you this turn; 2. they lose 1 HP and their hand limit is -1 this '
    + 'turn; 3. you obtain a random hand card of theirs and a random card from their equip '
    + 'area.',
  ':mobile__xuehen': 'After you deal or take damage for the first time each turn, you can show up to X '
    + 'hand cards (X is your lost HP); these cards count as Slash with no limit on the '
    + 'number of uses, until you deal damage with these cards.',
  ':mobile__xuehen_update': 'After you deal or take damage for the first time each turn, you can show up to X '
    + 'hand cards (X is your lost HP); these cards count as Slash with no limit on the '
    + 'number of uses, until you deal damage with these cards. After a Slash converted this '
    + 'way finishes resolving, you draw a card.',
  ':mobile__xuewei': 'In your Prepare phase, you can mark another player (visible only to you). If you do, '
    + 'until the start of your next turn, when the player you marked takes damage for the '
    + 'first time, you prevent this damage and take that much damage instead, then you deal '
    + 'that much damage of the same element to the damage source.',
  ':mobile__xunjie': '(forced) When you take damage, if there is no Great Siege Engine - Offense or Great '
    + 'Siege Engine - Defense in play, and the damage source\'s HP is greater than yours, '
    + 'you make a judgement; if the result is red, this damage is reduced by 1.',
  ':mobile__xushen': '(once per game) During your Action phase, you can draw up to three cards and lose '
    + 'that much HP. If you enter the dying state because of this, then after you leave the '
    + 'dying state, you can distribute "<a href=\':wusheng\'>Warrior Saint</a>", "<a '
    + 'href=\':dangxian\'>Vanguard</a>" and "<a href=\':zhiman\'>Subdue Barbarians</a>" among '
    + 'the players who recovered HP for you during this dying resolution (if such a player '
    + 'already has the corresponding skill, they draw three cards instead).',
  ':mobile__yanjiao': 'Once per Action phase, you can give all hand cards of one suit to another player, '
    + 'then deal 1 damage to them. If you do, at the start of your next turn you draw X '
    + 'cards (X is the number of cards you gave this way).',
  ':mobile__yilie': '(forced) At the start of the game, you choose another player.<br>When that player '
    + 'takes damage, if you have no Ardor marks, you gain Ardor marks equal to the damage '
    + 'amount, then prevent this damage;<br>After that player deals damage to another '
    + 'player, you recover 1 HP;<br>In your Finish phase, if you have Ardor marks, you draw '
    + 'a card and lose X HP (X is the number of your Ardor marks), then remove all your '
    + 'Ardor marks.',
  ':mobile__yimou': 'After a player at distance 1 or less from you takes damage, you can choose one: 1. '
    + 'make them obtain a Slash from the draw pile; 2. make them give a hand card to '
    + 'another player and draw a card.',
  ':mobile__yingbing': '(forced) When a player who has a Curse uses a card of the same suit as that Curse, '
    + 'you draw a card; if this is the second time you have drawn a card because of that '
    + 'Curse, remove that Curse.',
  ':mobile__yinju': 'Once per Action phase, you can make another player choose one: 1. at the start of '
    + 'the Prepare phase of their next turn, they skip their Action phase and Discard phase '
    + 'that turn; 2. use a Slash on you with no distance restriction.',
  ':mobile__yizheng': 'Once per Action phase, you can point fight with a player whose HP is not greater '
    + 'than yours. If you: win, they skip their next Draw phase; do not win, you lose 1 max '
    + 'HP.',
  ':mobile__yuanmo': 'Twice per turn, at your Prepare phase or after you take damage, you can move a card '
    + 'in play, then you can make the player who lost the card this way draw X cards (X is '
    + 'the number of players by which their ATK range was reduced because of this, up to '
    + '5).',
  ':mobile__yuejian': 'Your hand limit equals your max HP; when you enter the dying state, you can discard '
    + 'two cards to recover 1 HP.',
  ':mobile__yufeng': 'Once per Action phase, you can perform one <a href=\':mobile__yufeng_href\'>Ride the '
    + 'Wind</a>. If it fails, you draw X cards; if it succeeds, you can choose up to X '
    + 'other players, and in their next Prepare phase they make a judgement: if the result '
    + 'is black, they skip their Action phase and Discard phase; if the result is red, they '
    + 'skip their Draw phase; if you choose fewer than X players, each remaining point '
    + 'instead lets you draw a card (X is your Ride the Wind score, at most 3).',
  ':mobile__yufeng_href': 'Reveal a random card from among the draw pile and the discard pile, then repeatedly '
    + 'guess whether the next revealed card has a higher or lower rank than the previously '
    + 'revealed one, until you reach the score cap or guess wrong (2 or 3 points); each '
    + 'correct guess scores one point.',
  ':mobile__zengou': 'Once per Action phase, you can look at all of a player\'s hand cards, then choose one '
    + 'option:<br>1. it counts as using two basic cards whose names are not among their '
    + 'hand cards (not counting toward the use limit and with no limit on the number of '
    + 'uses);<br>2. you and they each in turn replace the cards in your hand areas that '
    + 'share a card name with an equal number of Slashes from the draw pile (Slashes '
    + 'obtained this way do not count toward the hand limit until the end of your '
    + 'respective turns).<br>Then they gain a Slander mark naming a basic card you specify. '
    + 'After the first card a player with this mark uses each turn resolves, if it has the '
    + 'same name as the recorded one, they remove this mark and lose 1 HP.',
  ':mobile__zhaoxiong': '(persistent) (once per game) In your Prepare phase, if you are wounded, you can '
    + 'change your kingdom to Neutral, then you gain the skill Purge Dissent (in Role mode, '
    + 'the clause about giving priority to targeting players of the same kingdom is deleted '
    + 'from Coerced Campaign).',
  ':mobile__zhaoxiong_1v2': '(persistent) (once per game) In your Prepare phase, if you are wounded, you can '
    + 'change your kingdom to Neutral, then you gain the skill Purge Dissent.',
  ':mobile__zhaoxiong_role_mode': '(persistent) (once per game) In your Prepare phase, if you are wounded, you can '
    + 'change your kingdom to Neutral, then you gain the skill Purge Dissent, and the '
    + 'clause about giving priority to targeting players of the same kingdom is deleted '
    + 'from Coerced Campaign.',
  ':mobile__zhenfeng': '(once per game) In your Action phase, you can choose one option: 1. recover 2 HP; 2. '
    + 'change the X in Fierce Battle and the X in Blazing War each to one of your current '
    + 'HP, your lost HP, or the number of living players (you can only choose an option for '
    + 'a skill you have).',
  ':mobile__zhennan': 'After a player designates the first target of a non-delayed trick card, if you are '
    + 'among the targets and the number of targets is greater than X (X is the user\'s HP, '
    + 'and at least 1), you can discard a card to deal 1 damage to a player.',
  ':mobile__zhenyi': 'You can discard the corresponding mark at the following timings to trigger the '
    + 'following effects:<br>Before a judgement card takes effect, you can discard "Purple '
    + 'Star", then change the judgement result to ♠5 or <font color=\'red\'>♥5</font> and end '
    + 'this timing;<br>While you are dying, you can discard "Earth Queen", then use one of '
    + 'your hand cards as Peach;<br>When you deal damage, you can discard "Jade Purity", '
    + 'then perform a judgement, and if the result is black, the damage is increased by '
    + '1;<br>After you take elemental damage, you can discard "Hook Star", then you '
    + 'randomly obtain one card of each of three card types from the draw pile or the '
    + 'discard pile.',
  ':mobile__zhixi': '(forced) During your Action phase, you can use at most X cards (X is your HP). After '
    + 'you use a trick card, your Action phase ends.',
  ':mobile__zhoufu': 'Once per Action phase, you can place a hand card next to the character card of '
    + 'another player who has no Curse; it is called a Curse. When a player who has a Curse '
    + 'makes a judgement, the Curse is used as the judgement card. At the end of a player\'s '
    + 'turn, you make each player whose Curse was removed this turn lose 1 HP.',
  ':mobile__zhouxuanz': 'Once per Action phase, you can choose another player and choose a type of non-basic '
    + 'card or the name of a basic card. If the first card that player then uses or plays '
    + 'matches your choice, you look at the top three cards of the draw pile and distribute '
    + 'them to any players.',
  ':mobile__zishu': '(forced) Outside your turn, all hand cards you obtain are put into the discard pile '
    + 'at the end of the current turn\'s Finish phase; during your turn, when you obtain '
    + 'hand cards other than through this skill\'s effect, you draw a card.',
  ':mobile_dongjiao__weizhuang': 'Once per turn for each option, if the number of card types among your <a '
    + 'href=\'#CardDisplayedDesc\'>revealed cards</a> is not less than: 1, the value of basic '
    + 'cards you use is +1; 2, after you use a trick card and choose its first target, you '
    + 'can obtain one card from another player among the targets; 3, after an equip card '
    + 'you use finishes resolving, you can make a player who has <a '
    + 'href=\'#CardDisplayedDesc\'>revealed cards</a> draw two cards.',
  ':mobile_qianlong__fangzhu': '(persistent) Once per Action phase, you can choose one option for another player to '
    + 'carry out (you cannot choose the player you last chose this way since the start of '
    + 'your previous turn): 1. until the end of their next turn, they cannot use hand cards '
    + 'other than trick cards; 2. until the end of their next turn, all their skills are '
    + 'invalid.',
  ':mobile_qianlong__jiushi': '(persistent) When you need to use an Alcohol, if your character card is face up, you '
    + 'can turn your character card over, and it counts as using an Alcohol; after you take '
    + 'damage, if your character card is face down and you have not used Wine Poetry for '
    + 'this damage, you can turn your character card over; after you turn your character '
    + 'card over, you obtain a random trick card from the draw pile.',
  ':mobile_qianlong__qingzheng': '(persistent) At the start of your Action phase, you can choose another player who '
    + 'has hand cards; you discard all your hand cards of one suit, then look at their hand '
    + 'cards and choose a suit, and they discard all their hand cards of that suit. If you '
    + 'do and the number of cards you discarded this way is greater than the number of hand '
    + 'cards they discarded, you deal 1 damage to them.',
  ':mobile_xiuge__weizhuang': 'Once per turn for each option, you can discard a: 1. weapon card, and it counts as '
    + 'using any Slash; 2. armor card, and it counts as using a Dodge; defensive horse '
    + 'card, and it counts as using a Peach; offensive horse card, and it counts as using '
    + 'an Alcohol. Cards you use this way have no limit on the number of uses and do not '
    + 'count toward the use limit, and after they finish resolving you obtain one card of '
    + 'the discarded card\'s suit from the draw pile or the discard pile. If your <a '
    + 'href=\'#CardDisplayedDesc\'>revealed cards</a> contain four suits, discarding in this '
    + 'skill becomes showing.',
  ':moucuan': '(awaken) In your Prepare phase, if your number of Troops is not less than X (X is '
    + 'the number of kingdoms in play), you lose 1 max HP, then gain the skill Scourge of '
    + 'War.',
  ':mowang': '(forced) When you are about to die, if you have the skill Partisan Ban and you still '
    + 'have unrevealed Attendant cards, you recuperate for one round instead; at the end of '
    + 'the turn, you die.',
  ':muzhen': 'Once per Action phase for each, you can: put an equip card into another player\'s '
    + 'equip area, then obtain a hand card from them; give two cards to another player who '
    + 'has cards in their equip area, then obtain a card from their equip area.',
  ':mxing__zhiyan': 'Once per Action phase for each option, you can choose one: 1. draw until your hand '
    + 'size equals your max HP, then you cannot use cards on other players for the rest of '
    + 'this phase; 2. give X hand cards to another player (X is your hand size minus your '
    + 'HP).',
  ':naxue': 'You can skip your Action phase. If you do, you can discard any number of cards, draw '
    + 'that many cards, then give up to two other players a card each.',
  ':nigu': 'Once per Action phase, you can discard at least one card, all of different suits, '
    + 'and make the players in your ATK range simultaneously choose whether to give you a '
    + 'card. Then the next X instances of damage you deal this turn are +1 (X is the number '
    + 'of players who chose not to give you a card).',
  ':nos__cunsi': 'Once per Action phase, you can turn your character card face down to make a player '
    + 'obtain a Slash; the damage dealt by the next Slash they use +1.',
  ':nos__guixiu': '(forced) After you take damage, you turn your character card face up; after your '
    + 'character card is turned face up, you draw a card.',
  ':offensive_horse__xianjian': 'This is a Breach offensive horse.',
  ':offensive_siege_engine': 'Equip card - Weapon<br/><b>ATK range</b>: 9<br /><b>Durability</b>: 2<br /><b>Weapon '
    + 'skill</b>: after this card enters your equip area, discard the other cards in your '
    + 'equip area; before another equip card enters your equip area, put it into the '
    + 'discard pile instead; when you deal damage, you can reduce this card\'s durability by '
    + '1 to make this damage +X (X is the number of game rounds, at most 3); when this card '
    + 'would leave your equip area for a reason other than Siege Ram, prevent it, then this '
    + 'card\'s durability is -1; when this card\'s durability drops to 0, destroy this card.',
  ':pangtong__gongli': '(forced) If your ally Friend Zhuge Liang is in play, Cultivate Fame reveals 1 more '
    + 'card; if your ally Friend Xu Shu is in play, after you trigger Cultivate Fame you '
    + 'obtain one of the cards revealed this time whose suit was not used. (Only in Fight '
    + 'the Landlord and 2v2 modes)',
  ':pangtong__gongli_xushu': '(forced) If your ally Friend Xu Shu is in play, after you trigger Cultivate Fame you '
    + 'obtain one of the cards revealed this time whose suit was not used.',
  ':pangtong__gongli_zhugeliang': '(forced) If your ally Friend Zhuge Liang is in play, Cultivate Fame reveals 1 more card.',
  ':panxiang': 'When a player takes damage, you can choose one (you cannot choose the option you '
    + 'chose the last time you triggered this skill on that player): 1. this damage -1, '
    + 'then the damage source draws two cards; 2. this damage +1, then they draw three '
    + 'cards.',
  ':peidong': 'You can take <a href=\':m_liuyi__liulongcanjia\'>Six Dragon Chariot</a> and:<br />move '
    + 'it from your equip area to the next player, which counts as using a Slash;<br '
    + '/>obtain it from another player\'s field, which counts as using a Dodge;<br />reveal '
    + 'it from your hand or the draw pile, which counts as using a Peach;<br />put it from '
    + 'outside the game into your treasure slot, which counts as using an Alcohol.',
  ':pingcai': 'Once per Action phase, you can pick a treasure and wipe the dust off it. If the wipe '
    + 'succeeds, you can perform the effect matching the treasure\'s type:<br>Crouching '
    + 'Dragon: deal 1 fire damage to a player. If a living Crouching Dragon Zhuge Liang is '
    + 'on the field, this becomes dealing 1 fire damage to each of up to two '
    + 'players.<br>Fledgling Phoenix: chain up to three players. If a living Pang Tong is '
    + 'on the field, this becomes chaining up to four players.<br>Water Mirror: move an '
    + 'armor card on the field. If a living Sima Hui is on the field, this becomes moving '
    + 'an equip card on the field.<br>Mystic Sword: make a player draw a card and recover 1 '
    + 'HP. If a living Xu Shu is on the field, this becomes making a player draw a card and '
    + 'recover 1 HP, then you draw a card.',
  ':pinghe': '(forced) Your base hand card limit is your lost HP; when you take damage caused by '
    + 'another player, if your max HP is greater than 1 and you have hand cards, you '
    + 'prevent this damage, lose 1 max HP and give a hand card to another player, then if '
    + 'you have the skill Heroic Supremacy, the damage source gains a Pacify mark.',
  ':polu': '(forced) At the start of your turn, you obtain a <a '
    + 'href=\':mobile__catapult\'>Thunderbolt Catapult</a> from outside the game, the draw '
    + 'pile or the discard pile, and use it; after you take 1 damage, if there is no '
    + 'Thunderbolt Catapult in your equip area, you draw a card, then randomly obtain a '
    + 'weapon card from the draw pile and use it.',
  ':polus': 'After you kill a player, or after you die, you can make any number of players each '
    + 'draw X cards (X is the number of times you have used this skill +1).',
  ':powei': '(mission) At the start of the game, you make all other players gain the Siege mark; '
    + 'at the start of a turn, you make every player who has the Siege mark move their '
    + 'Siege mark to the next player (if the next player is you, it moves to the player '
    + 'after you instead); after a player with the Siege mark takes damage, remove their '
    + 'Siege mark; at the start of the turn of a player who has Siege, you can choose one '
    + 'option and make yourself count as being within their ATK range this turn: 1. discard '
    + 'a hand card and deal 1 damage to them; 2. if their HP is not greater than yours, you '
    + 'obtain one of their hand cards.<br>\n  ⬤ Success: at the start of a turn, if there is '
    + 'no Siege mark in play, you gain the skill Divine Renown;<br>\n  ⬤ Failure: when you '
    + 'enter the dying state, if your HP is less than 1, you recover HP up to 1, remove all '
    + 'Siege marks in play, then discard all cards in your equip area.',
  ':poxiang': 'Once per Action phase, you can give a card to another player, then draw three cards, '
    + 'remove all Valor and lose 1 HP; the cards you obtain this way do not count toward '
    + 'your hand limit this turn.',
  ':premeditate': 'This is a Premeditate card. Premeditate cards are offered for use one by one in the '
    + 'next Judge phase, in reverse order of placement.',
  ':qianchong': '(forced) If all cards in your equip area are black, you have Curtain; if all cards '
    + 'in your equip area are red, you have Sagacity. At the start of your Action phase, if '
    + 'you meet neither of the above conditions, you choose a card type, and this phase you '
    + 'use cards of that type with no limit on the number of uses and no distance '
    + 'restriction.',
  ':qiangyong': '(forced) When a Slash you use deals damage, discard X cards from the damaged player '
    + '(X is the number of times you have used Slash this turn), then if they have no hand '
    + 'cards, this Slash\'s damage is increased by 1.',
  ':qiaosi': 'Once per Action phase, you can perform the water-powered puppet show once and obtain '
    + 'the cards it yields, then choose one: 1. discard the same number of cards; 2. give '
    + 'the same number of cards to another player. (If you have fewer, give or discard all '
    + 'of them.)',
  ':qihui': '(forced) When you use a card, if you have no mark for that card\'s type, you gain 1 '
    + 'Enlightenment mark of that type; then if you have 3 Enlightenment marks, you remove '
    + '2 Enlightenment marks and choose one: 1. heal 1 HP; 2. draw two cards; 3. the next '
    + 'card you use does not count toward the use limit and has no limit on the number of '
    + 'uses.',
  ':qingdao': 'After a damage-dealing card used by another player finishes resolving, if you were '
    + 'among the targets, then: if you took damage from this card, you can obtain a Dodge '
    + 'from the draw pile or the discard pile, or discard a card in a player\'s area; if you '
    + 'did not take damage from this card, you can obtain a Slash from the draw pile or the '
    + 'discard pile, or use a hand card (with no distance restriction).',
  ':qingjue': 'Once per round, when another player uses a card whose only target is another player '
    + 'with less HP than them, if no player is dying, you can draw a card and point fight '
    + 'with the user; if you win or you are not a legal target of this card, cancel this '
    + 'card; if you do not win and you are a legal target of this card, this card\'s target '
    + 'is changed to you.',
  ':qingshix': 'After you take damage, you can choose a player. If your kingdom and theirs are: the '
    + 'same, you and they each draw a card; different, you discard one card from each of '
    + 'you.',
  ':qingyu': '(mission) When you take damage, you must discard two hand cards and prevent this '
    + 'damage.<br>\n  ⬤ Success: in your Prepare phase, if you are unwounded and have no '
    + 'hand cards, you gain the skill Suspended Life.<br>\n  ⬤ Failure: when you enter the '
    + 'dying state, you lose 1 max HP and the mission fails.',
  ':qinying': 'Once per Action phase, you can recast any number of cards, which counts as using a '
    + 'Duel. If you do, during the resolution of this Duel, up to X times (X is the number '
    + 'of cards you recast this way) you or the target player can discard a card in their '
    + 'area, which counts as playing a Slash.',
  ':qinying&': 'You can discard a card in your area, which counts as playing a Slash.',
  ':qinzheng': '(forced) Each time you have used or played: three cards, you randomly obtain a Slash '
    + 'or a Dodge; five cards, you randomly obtain a Peach or an Alcohol; eight cards, you '
    + 'randomly obtain an Ex Nihilo or a Duel.',
  ':qirang': 'After an equip card is placed into your equip area, you can randomly obtain a trick '
    + 'card from the draw pile; when you use that trick card there is no distance '
    + 'restriction and you draw a card.',
  ':qishe': 'You can use an equip card as Alcohol; your hand limit is +X (X is the number of '
    + 'cards in your equip area).',
  ':quanchong': '(forced) Once per round, in your Finish phase, you discard all your cards and take '
    + 'an extra turn after the current turn ends. If your HP is not the unique highest in '
    + 'play, you lose 1 HP at the start of that turn.',
  ':quanfeng': '(once per game) After another player dies, you can <a '
    + 'href=\'memorialize\'>memorialize</a> that player: you lose Grand Decorum, gain all '
    + 'skills on their character card (lord skills excepted), gain 1 max HP and recover 1 '
    + 'HP; when you are dying, you can gain 2 max HP and recover 4 HP.',
  ':quchong': 'In your Action phase, you can recast an equip card; at the end of each turn, you '
    + 'remove the equip cards in the discard pile from the game and gain an equal number of '
    + 'casting points; at the start of your Action phase, if there is no Great Siege Engine '
    + 'in play (<a href=\':offensive_siege_engine\'>Great Siege Engine - Offense</a>, <a '
    + 'href=\':defensive_siege_engine\'>Great Siege Engine - Defense</a>), then according to '
    + 'the number of times you have cast you can pay 0, 5, 10, 10 casting points (in 2v2 or '
    + 'Landlord mode this becomes 0, 2, 5, 5) to choose one kind of Great Siege Engine and '
    + 'give it to a player and make them use it; otherwise you can give the Great Siege '
    + 'Engine in play to another player and make them use it.',
  ':quchong_1v2': 'In your Action phase, you can recast an equip card; at the end of each turn, you '
    + 'remove the equip cards in the discard pile from the game and gain an equal number of '
    + 'casting points; at the start of your Action phase, if there is no Great Siege Engine '
    + 'in play (<a href=\':offensive_siege_engine\'>Great Siege Engine - Offense</a>, <a '
    + 'href=\':defensive_siege_engine\'>Great Siege Engine - Defense</a>), then according to '
    + 'the number of times you have cast you can pay 0, 2, 5, 5 casting points to choose '
    + 'one kind of Great Siege Engine and give it to a player and make them use it; '
    + 'otherwise you can give the Great Siege Engine in play to another player and make '
    + 'them use it.',
  ':quchong_role_mode': 'In your Action phase, you can recast an equip card; at the end of each turn, you '
    + 'remove the equip cards in the discard pile from the game and gain an equal number of '
    + 'casting points; at the start of your Action phase, if there is no Great Siege Engine '
    + 'in play (<a href=\':offensive_siege_engine\'>Great Siege Engine - Offense</a>, <a '
    + 'href=\':defensive_siege_engine\'>Great Siege Engine - Defense</a>), then according to '
    + 'the number of times you have cast you can pay 0, 5, 10, 10 casting points to choose '
    + 'one kind of Great Siege Engine and give it to a player and make them use it; '
    + 'otherwise you can give the Great Siege Engine in play to another player and make '
    + 'them use it.',
  ':quesong': 'During a player\'s Finish phase, if you have taken damage this turn, you can make a '
    + 'player choose one: 1. draw three cards (if the number of cards in their equip area '
    + 'is greater than 2, they draw two cards instead) and reset their character card; 2. '
    + 'recover 1 HP.',
  ':rangjie': 'After you take 1 damage, you can choose one: 1. move a card in play; 2. randomly '
    + 'obtain a card of a type you name from the draw pile or the discard pile. Finally you '
    + 'draw a card.',
  ':renshi': '(forced) When you take damage caused by a Slash, if you are wounded, you prevent '
    + 'this damage, obtain that Slash and lose 1 max HP.',
  ':renshih': 'Once per Action phase for each player, you can give a hand card to another player.',
  ':renxing': 'Up to twice each round, the first time each turn that a card is discarded outside '
    + 'the Discard phase, you can choose one: 1. you and the current turn player each draw '
    + 'a card; 2. discard a card from a player who has not used or played a Slash this '
    + 'turn.',
  ':rongbei': '(once per game) In your Action phase, you can choose a player who has an empty equip '
    + 'slot in their equip area; for each empty equip slot, they randomly use an equip card '
    + 'of the matching type from the draw pile or the discard pile.',
  ':ruilian': 'At the start of each round, you can choose a player; before the end of their next '
    + 'turn, if they have discarded cards during that turn, you can choose one type among '
    + 'the cards they discarded that turn, then you and they each obtain a card of that '
    + 'type from the discard pile.',
  ':shameng': 'Once per Action phase, you can discard two hand cards of the same color and choose '
    + 'another player; that player draws two cards, then you draw three cards.',
  ':shangjian': '(forced) At a player\'s Finish phase, if the number of cards you lost this turn (the '
    + 'number of cards lost other than by using equip cards, plus the number of cards that '
    + 'did not enter your equip area while you were using equip cards) is not greater than '
    + 'your HP, you draw that many cards.',
  ':shanjia': 'Once per Action phase, you can draw three cards, then discard X cards (X is 3 minus '
    + 'the number of cards you have lost from your equip area this game). If you discarded '
    + 'no: basic card, you can count as using a Slash that does not count toward your limit '
    + 'and has no limit on the number of uses; trick card, your use of cards this phase has '
    + 'no distance restriction.',
  ':shanxie': 'Once per Action phase, you can obtain a weapon card from the draw pile (if there is '
    + 'none, you randomly obtain a weapon card from another player\'s equip area). When '
    + 'another player uses a Dodge to respond to a Slash you used, if that Dodge has no '
    + 'number or its number is not greater than twice your ATK range, that Dodge has no '
    + 'effect.',
  ':shenpeij': '(once per game) When you enter the dying state, you can recover X HP (X is the '
    + 'number of times you have entered the dying state this game), deal that much thunder '
    + 'damage to a player and gain <a href=\':huitian\'>Turn the Tide</a>.',
  ':shenzhuo': '(forced) After a Slash you use that is neither converted nor virtual finishes '
    + 'resolving, you must choose one option: 1. draw a card, and the limit on the number '
    + 'of Slashes you can use this turn is +1; 2. draw three cards, and you cannot use '
    + 'Slash for the rest of this turn.',
  ':shepan': 'Once per round for each card name, and once per turn, after you become the target of '
    + 'a damage-dealing card used by another player, you can choose one: 1. draw a card; 2. '
    + 'put one of their hand cards on top of the draw pile. Then if you and they have the '
    + 'same number of hand cards, this card has no effect on you.',
  ':sheque': 'During another player\'s Prepare phase, if there are cards in their equip area, you '
    + 'can use a Slash against them with no distance restriction; this Slash ignores armor.',
  ':sheyi': 'Once per round, when another player takes damage, if their HP is less than yours, '
    + 'you can give them at least X cards to prevent this damage (X is your HP).',
  ':shezi': '(forced) In your Prepare phase, you choose a player and choose one of their areas; '
    + 'if that area contains equip cards, you obtain all cards in that area.',
  ':shidi': '(forced) (toggle) At the start of your Prepare phase, switch to Yang; at the start '
    + 'of your Finish phase, switch to Yin; Yang: your distance to other players is -1, and '
    + 'black Slashes you use cannot be responded to; Yin: other players\' distance to you is '
    + '+1, and you cannot respond to red Slashes used on you by other players.',
  ':shihe': 'Once per Action phase, you can start a point fight with another player. If you win, '
    + 'until the end of their next turn, prevent the damage they deal to friendly players; '
    + 'if you do not win, you discard a random card.',
  ':shiji': 'When you deal elemental damage to another player, if your hand card count is not the '
    + 'single highest in the game, you can look at their hand cards and discard all red '
    + 'cards among them, then you draw that many cards.',
  ':shishoul': '(forced) After another player carries out one option of Aid and Guard, you carry out '
    + 'the other option of Aid and Guard.',
  ':shishu': '(forced) After another player obtains your cards during their own turn, you make '
    + 'them choose one option: 1. discard those cards; 2. give you a card whose type '
    + 'differs from that of every one of those cards.',
  ':shixin': '(forced) Prevent all fire damage you would take.',
  ':shizhong': '(forced) At the start of your Finish phase, you draw a card and show all your hand '
    + 'cards; at the start of your Prepare phase, you draw X cards (X is the number of '
    + 'cards still in your hand out of those you showed with Strength in Numbers last '
    + 'time), and if X equals the number of cards you showed last time, then when you deal '
    + 'damage this turn, change the damage amount to 100000!',
  ':shoufa': 'After you deal damage for the first time each turn, you can choose a player at '
    + 'distance 2 or less from you; up to five times each turn, after you take damage, you '
    + 'can choose a player at distance greater than 1 from you (in Fight the Landlord, '
    + 'those distances become distance 1 or less from you, and distance not less than 1 '
    + 'from you); they carry out one random effect:<br>Leopard, they take 1 damage with no '
    + 'source;<br>Eagle, you obtain a random card from them;<br>Bear, you discard a random '
    + 'card from their equip area;<br>Rabbit, they draw a card.',
  ':shoufa_1v2': 'After you deal damage for the first time each turn, you can choose a player at '
    + 'distance 1 or less from you; up to five times each turn, after you take damage, you '
    + 'can choose a player at distance not less than 1 from you; they carry out one random '
    + 'effect:<br>Leopard, they take 1 damage with no source;<br>Eagle, you obtain a random '
    + 'card from them;<br>Bear, you discard a random card from their equip area;<br>Rabbit, '
    + 'they draw a card.',
  ':shoufa_role_mode': 'After you deal damage for the first time each turn, you can choose a player at '
    + 'distance 2 or less from you; up to five times each turn, after you take damage, you '
    + 'can choose a player at distance greater than 1 from you; they carry out one random '
    + 'effect:<br>Leopard, they take 1 damage with no source;<br>Eagle, you obtain a random '
    + 'card from them;<br>Bear, you discard a random card from their equip area;<br>Rabbit, '
    + 'they draw a card.',
  ':shouye': 'Once per turn, after you become the only target of a card used by another player, '
    + 'you can hold a countermeasure with them; if your countermeasure succeeds, this card '
    + 'has no effect on you, and after this card finishes resolving, you obtain it.',
  ':shouye_choice1': 'Open the gates and lure them in!',
  ':shouye_choice2': 'Raid the supply road!',
  ':shouye_choice3': 'Storm the city with everything?',
  ':shouye_choice4': 'Split the troops and besiege it?',
  ':shouyuez': 'At the start of your Draw phase, or after your HP decreases, you can choose one: 1. '
    + 'draw a card and make a player gain the skill <a href=\':qinyin\'>Zither Song</a> (if '
    + 'they already have it, they draw a card instead); 2. make a player reset their '
    + 'character card.',
  ':shuanghuai': 'Once per turn, when another player at distance 1 or less from you takes damage, you '
    + 'can choose one: 1. prevent this damage; 2. make them obtain a Peach from the discard '
    + 'pile. If that player is the same as the one from your last use of this skill, you '
    + 'and they each draw a card; if different, you lose 1 HP.',
  ':shuchen': '(forced) When a player enters the dying state, if the number of \'Benevolence\' cards '
    + 'is at least 4, you obtain all \'Benevolence\' cards, then make them recover 1 HP.',
  ':shuliang': 'In a player\'s Finish phase, if their hand card count is less than their HP, you can '
    + 'remove one "Grain", then that player draws two cards.',
  ':shunyi': 'When you use the hand card with the unique lowest number, if this card\'s suit is '
    + '<font color=\'red\'>♥</font> and its number is greater than X (X is the number of '
    + 'times you have triggered this skill this turn), you can place all hand cards of this '
    + 'suit face down on your character card until the end of the current turn, then you '
    + 'draw a card.',
  ':shunyi_inner': 'When you use the hand card with the unique lowest number, if this card\'s suit is {1} '
    + 'and its number is greater than X (X is the number of times you have triggered this '
    + 'skill this turn), you can place all hand cards of this suit face down on your '
    + 'character card until the end of the current turn, then you draw a card.',
  ':shuxing': 'Once per player during your turn, when another player becomes the target of a Slash, '
    + 'you can make this Slash have no effect on them, then show all their hand cards. If '
    + 'there is a Dodge among their hand cards, they must choose one option: 1. lose 1 HP; '
    + '2. give you every Dodge among them, and the next time an Uphold the Law choice is '
    + 'made, you choose in their place.',
  ':shuyong': 'When you use or play a Slash, you can obtain a card in another player\'s area. Then '
    + 'if the number of cards you have obtained from their area this way this round is '
    + 'greater than 1, they draw a card.',
  ':sifeng': 'At your Finish phase, you can distribute the top three cards of the draw pile in any '
    + 'order and place them face down on the character cards of up to two other players, '
    + 'called \'Waiting Blade\'.<br>For a player with \'Waiting Blade\' on their character '
    + 'card: after they use a card during their turn, you remove the first \'Waiting Blade\' '
    + 'on their character card, and if the card they used differs in color from the removed '
    + '\'Waiting Blade\', they discard a hand card; at the end of their turn, if any \'Waiting '
    + 'Blade\' has not been removed, you choose one: 1. obtain the \'Waiting Blade\' on their '
    + 'character card; 2. remove the remaining \'Waiting Blade\' on their character card, '
    + 'then deal 1 damage to them.',
  ':sizi': '(charge 4/4) Once per Action phase, you can spend at least 1 charge point, then gain '
    + 'the following effects until X turns have ended or your turn begins (X is the number '
    + 'of charge points spent this way): 1. when a player uses a Slash to deal damage, that '
    + 'damage +1; 2. at the end of a player\'s turn, you draw two cards, then each player '
    + 'who has used a Slash this turn loses 1 HP. If X is greater than your HP, you '
    + 'additionally gain the following effect: at the end of a player\'s turn, if no player '
    + 'has used a Slash this turn, the current turn player loses 1 HP.',
  ':suwang': 'At the end of a player\'s turn, if they designated you as a target when using a card '
    + 'during that turn and you took no damage (in 2v2 mode this becomes: the damage you '
    + 'took is no more than 1), you put the top card of the draw pile onto your character '
    + 'card, called "Long Renown"; in your Draw phase, if you have Long Renown cards, you '
    + 'can obtain all of them instead of drawing, then you can make another player draw two '
    + 'cards.',
  ':suwang_2v2': 'At the end of a player\'s turn, if they designated you as a target when using a card '
    + 'during that turn and the damage you took is no more than 1, you put the top card of '
    + 'the draw pile onto your character card, called "Long Renown"; in your Draw phase, if '
    + 'you have Long Renown cards, you can obtain all of them instead of drawing, then you '
    + 'can make another player draw two cards.',
  ':suwang_role_mode': 'At the end of a player\'s turn, if they designated you as a target when using a card '
    + 'during that turn and you took no damage, you put the top card of the draw pile onto '
    + 'your character card, called "Long Renown"; in your Draw phase, if you have Long '
    + 'Renown cards, you can obtain all of them instead of drawing, then you can make '
    + 'another player draw two cards.',
  ':tamo': 'At the start of the game, you can rearrange the seats of all players (in Role mode '
    + 'this becomes all players except the Lord; in Fight the Landlord this becomes all '
    + 'players except the third seat).',
  ':tanfeng': 'At your Prepare phase, you can choose any number of options: 1. discard up to two '
    + 'cards from a player, then if their hand card count is not greater than yours, you '
    + 'skip your Draw phase; 2. deal 1 fire damage to a player, then if their HP is not '
    + 'greater than yours, you skip your Action phase.',
  ':taoluanh': 'Once per turn, before a player\'s judgement card takes effect, if the judgement '
    + 'result is a spade, you can cancel this judgement and choose one: 1. you obtain this '
    + 'judgement card; 2. if the player making the judgement is not you, you count as using '
    + 'a fire Slash against them with no distance restriction and no limit on the number of '
    + 'uses.',
  ':taomie': 'After you take damage or after you deal damage, you can make the damage source or '
    + 'the damaged player gain the Extermination mark (if the mark is already in play, it '
    + 'is transferred to that player); you and the player with the Extermination mark are '
    + 'considered to be in each other\'s ATK range; when you deal damage to a player with '
    + 'the Extermination mark, choose one: 1. this damage +1; 2. you obtain a card from '
    + 'their area and can give this card to another player; Backwater: discard their '
    + 'Extermination mark, and this damage does not make them gain the Extermination mark.',
  ':tiansuan': 'Once per round, during your Action phase, you can draw a Fate Lot (before the draw '
    + 'begins, you can quietly cheat and add one extra Fate Lot to increase its chance of '
    + 'being drawn).<br/>Then you choose a player, who gains the effect of the Fate Lot '
    + 'until the start of your next turn.<br/>If they gain the Great Fortune lot, you look '
    + 'at their hand cards and obtain a card from their area; if they gain the Good Fortune '
    + 'lot, you obtain a card from them.<br/>The effects of the Fate Lots are as '
    + 'follows:<br/>Great Fortune: prevent the damage they take.<br/>Good Fortune: when '
    + 'they take damage, if the damage value is greater than 1, change the damage value to '
    + '1; after they take each 1 damage, you draw a card.<br/>Middling Fortune: when they '
    + 'take damage, change the damage to fire damage, and if the damage value is greater '
    + 'than 1, change the damage value to 1.<br/>Poor Fortune: when they take damage, the '
    + 'damage value +1.<br/>Worst Fortune: when they take damage, the damage value +1; they '
    + 'cannot use Peach or Alcohol.',
  ':tiantao': '(forced) At your Finish phase, you choose an area and discard all cards in it, then '
    + 'discard one card each from the same area of any number of other players in order; '
    + 'each player who has a card discarded this way and did not have a Slash discarded '
    + 'loses 1 HP.',
  ':tianyin': '(forced) At your Finish phase, you obtain from the draw pile one card of each card '
    + 'type you have not used this turn.',
  ':tianzuo': '(forced) At the start of the game, add 8 <a href=\':raid_and_frontal_attack\'>Raid and '
    + 'Frontal Attack</a> cards to the draw pile; Raid and Frontal Attack has no effect on '
    + 'you.',
  ':tingwei': 'After you use a Slash and choose targets, you can gain 4 Thunder marks and choose '
    + 'one target player; they choose any options (each time they choose an option, you '
    + 'lose 1 Thunder mark):<br>1. their non-forced skills are invalid until the end of '
    + 'their next turn;<br>2. they give you an equip card;<br>3. this card deals +1 damage '
    + 'to them:<br>4. they discard a random card.<br>If they choose none of them, they '
    + 'become chained.',
  ':tongqu': 'At the start of the game, you gain a Canal mark; in your Prepare phase, you can lose '
    + '1 HP to make a player without a Canal mark gain a Canal mark. A player who has Canal '
    + 'draws one extra card in their Draw phase, then gives a card to another player who '
    + 'has Canal or discards a card; if the card given this way is an equip card, that '
    + 'player uses it. When a player who has Canal enters the dying state, their Canal is '
    + 'removed.',
  ':treasure__xianjian': 'This is a Breach treasure.',
  ':tunchu': 'In your Draw phase, if you have no "Grain", you can draw two extra cards, then you '
    + 'can place any number of hand cards on your character card, called "Grain"; if there '
    + 'is "Grain" on your character card, you cannot use Slash.',
  ':wangzhuan': 'After a player takes damage that was not caused by a card, if you are the damage '
    + 'source or the damaged player, you can draw a card, then the current turn player\'s '
    + 'non-forced skills are invalid this turn.',
  ':wanlan': 'When a player takes fatal damage, you can discard all cards in your equip area (at '
    + 'least one) to prevent this damage.',
  ':weapon__xianjian': 'This is a Breach weapon.',
  ':weifeng': '(forced) After the first Slash or damage-dealing trick card you use in your Action '
    + 'phase finishes resolving, you choose one of its other target players who has no '
    + '"Fear", and make them gain a "Fear" mark named after this card. When a player with '
    + '"Fear" takes damage, remove the "Fear" and apply the effect: if the name of the card '
    + 'dealing the damage is the same as the "Fear", this damage is increased by 1; if it '
    + 'is different, you obtain a card from them. In your Prepare phase or when you die, '
    + 'remove all "Fear" marks.',
  ':weiming': '(mission) At the start of your Action phase, you mark another player who has not '
    + 'been marked before.<br>⬤ Success: after you kill an unmarked player, you change '
    + 'Blood Path to level 2;<br>⬤ Failure: after a marked player dies, you change Blood '
    + 'Path to level 3.',
  ':weitong': '(persistent) (lord skill) If there is another living Wei kingdom player in play, the '
    + 'Resolve your Hidden Dragon grants at the start of the game becomes 60.',
  ':weizhuang': 'At the start of the Finish phase of a player who has <a '
    + 'href=\'#CardDisplayedDesc\'>revealed cards</a>, you can reduce one of the following '
    + 'values by 1 and use one <a href=\':caiqiu\'>Tailor the Robe</a>: 1. the number of '
    + 'cards you draw in your Draw phase; 2. the limit on the number of Slashes you can '
    + 'use; 3. your hand limit; 4. your HP. X times per game; each time X cards have been '
    + 'revealed, you increase one of the above values by 1 (X is the number of players in '
    + 'the game +1).',
  ':wisdom__qiai': 'Once per Action phase, you can give a non-basic card to another player, then they '
    + 'choose one: 1. make you recover 1 HP; 2. make you draw two cards.',
  ':wisdom__shanxi': 'At the start of your Action phase, you can make a player who has no "Proclamation" '
    + 'gain one "Proclamation" mark (if that mark is already in play, it is transferred to '
    + 'that player instead); after a player with the "Proclamation" mark recovers HP, if '
    + 'they are not in the dying state, they must choose one: 1. give you two cards; 2. '
    + 'lose 1 HP.',
  ':wufei': 'The source of damage caused by Slashes and normal trick cards you use counts as the '
    + 'player who has the Sparrow mark. After you take damage, if the player who has the '
    + 'Sparrow mark has more than 3 HP, you can make them take 1 sourceless damage.',
  ':wuku': '(forced) When a player uses an equipment card, you gain 1 Armoury mark. (You can '
    + 'have at most 3 Armoury marks.)',
  ':wuling': 'Twice per Action phase, you can choose a player without a Five Beasts mark and teach '
    + 'them the Five Animal Frolics in an order of your choosing. In their Prepare phase, a '
    + 'player with a Five Beasts mark switches to the next effect in the order they were '
    + 'taught:<br>Tiger: when you deal damage with a card that has only one target, that '
    + 'damage +1.<br>Deer: recover 1 HP and discard all cards in your judgement area; you '
    + 'cannot be the target of delayed trick cards.<br>Bear: once per turn, when you take '
    + 'damage, that damage -1.<br>Ape: obtain a card from another player\'s equip '
    + 'area.<br>Crane: you draw three cards.',
  ':wurong-anfu': 'If the opponent chooses Resist, you take 1 damage, then you draw a card<br>If the '
    + 'opponent chooses Submit, they give you two cards; if they have fewer than two cards, '
    + 'instead they skip their next Draw phase',
  ':wurong-fankang': 'If the opponent chooses Suppress, they deal 1 damage to you, then they draw a '
    + 'card<br>If the opponent chooses Appease, they take 1 damage, then they draw a card',
  ':wurong-guishun': 'If the opponent chooses Suppress, they obtain one card from you, then they give you '
    + 'two cards<br>If the opponent chooses Appease, you give them two cards; if you have '
    + 'fewer than two cards, instead you skip your next Draw phase',
  ':wurong-zhenya': 'If the opponent chooses Resist, you deal 1 damage to them, then you draw a '
    + 'card<br>If the opponent chooses Submit, you obtain one card from them, then give '
    + 'them two cards',
  ':wuyuan': 'Once per Action phase, you can give a Slash to another player, then you recover 1 HP '
    + 'and they draw a card. If that Slash is: a red Slash, that player recovers 1 extra '
    + 'HP; not a normal Slash, that player draws an extra card.',
  ':xianghai': '(forced) Other players\' hand limit -1; equip cards in your hand all count as Alcohol.',
  ':xiangzhen': '(forced) Savage Assault has no effect on you; after a Savage Assault finishes '
    + 'resolving, if it dealt damage, you and the damage source each draw a card.',
  ':xianjian': 'After you use a Slash and choose its only target, you can choose one option: 1. you '
    + 'draw a card and they discard X cards (X is the number of cards they have in play, '
    + 'and at least 1); 2. after this Slash finishes resolving, you put this Slash into one '
    + 'of their empty equip slots, called a Breach card.',
  ':xiaoge': '(forced) For a Slash you use: when it would deal damage to a player who became an '
    + 'extra target through Flying Path, prevent that damage, then you recover 1 HP and '
    + 'obtain the card that player discarded; after the Slash finishes resolving, if it had '
    + 'only one player as its target, it counts as you using a Duel on that player.',
  ':xiaoni': '1. Once per Action phase, if your Mandate points are greater than 0, you can use a '
    + 'card as any kind of Slash or as a damage-dealing trick card, and you lose Mandate '
    + 'points equal to the number of targets of that card.<br>2. Your hand limit is X (X is '
    + 'your Mandate points, and at most your HP).',
  ':xiaxing': 'At the start of the game, you obtain and use <a href=\':xuanjian_sword\'>Mystic '
    + 'Sword</a>; after Mystic Sword enters the discard pile, you can remove 2 '
    + 'Enlightenment marks to obtain it.',
  ':xichang': '(forced) At the start of the game, you choose your appearance for this game and gain '
    + 'the corresponding Attire; when you obtain a card other than by drawing, <a '
    + 'href=\'#DisplayCardsDesc\'>reveal</a> it; your revealed hand cards are not visible '
    + 'when another player chooses cards from you.<br /><a href=\':weizhuang\'>Attire '
    + '(Osmanthus Hall)</a><br /><a href=\':mobile_dongjiao__weizhuang\'>Attire (Eastern '
    + 'Suburb)</a><br /><a href=\':mobile_xiuge__weizhuang\'>Attire (Embroidered Chamber)</a>',
  ':xiefang': '(forced) Your distance to other players -X (X is the number of female players).',
  ':xieli_bingjin': 'You and they have drawn at least 8 cards in total',
  ':xieli_luli': 'The cards you and they have used or played contain 4 suits',
  ':xieli_shucai': 'The cards you and they have discarded contain 4 suits',
  ':xieli_tongchou': 'The total damage you and they have dealt is not less than 4',
  ':xiezhi': '(forced) After your HP changes, you gain X charge points (X is the size of this '
    + 'change). If you would gain charge points beyond the maximum this way, your hand '
    + 'limit and your limit on the number of Slashes you can use +1.',
  ':xing__yishi': 'When you deal damage to another player, you can reduce this damage by 1 and obtain a '
    + 'card from their equip area.',
  ':xingbu': 'In your Finish phase, you can reveal the top three cards of the draw pile, then, '
    + 'according to the number of red cards among them, you can make another player of your '
    + 'choice gain one of the following effects:<br/>3 red cards: <font '
    + 'color=\'#CC3131\'>«Five Stars in Alignment»</font>, on their next turn they draw 2 '
    + 'extra cards in their Draw phase and can use one extra Slash in their Action '
    + 'phase;<br/>2 red cards: «White Rainbow Pierces the Sun», on their next turn the '
    + 'number of Slashes they can use in their Action phase is -1 and they skip their '
    + 'Discard phase;<br/>no more than 1 red card: <font color=\'grey\'>«Mars Guards the '
    + 'Heart»</font>, on their next turn they discard a hand card in their Prepare phase.',
  ':xinghun': 'Once per Action phase, you can look at the top five cards of the draw pile, exchange '
    + 'any number of hand cards with an equal number of them and arrange them, then you '
    + 'make another player show five cards in total from your hand cards and the top of the '
    + 'draw pile, and you use the Slash among them against them one by one.',
  ':xingqi': 'When you use a card that is not a delayed trick card, if there is no Prep with that '
    + 'card\'s name, record that card\'s name as a Prep. In your Finish phase, you can remove '
    + 'a Prep and obtain a card of the same name from the draw pile.',
  ':xingtu': '(forced) When you use a card, if this card\'s number is a factor of X, you draw a '
    + 'card; you use cards whose number is a multiple of X with no limit on the number of '
    + 'uses (X is the number of the last card you used).',
  ':xiongjin': 'Once per round for each, at the start of your Action phase or another player\'s '
    + 'Action phase, you can make yourself or them draw X cards (X is your lost HP, at '
    + 'least 1 and at most 3). If you do, at the start of the Discard phase this turn, you '
    + 'discard all your non-basic cards or they discard all their basic cards.',
  ':xiongsi': '(once per game) In your Action phase, if you have at least three hand cards, you can '
    + 'discard all your hand cards, then every other player loses 1 HP.',
  ':xiongtus': 'Once per Action phase, you can show a hand card of another player and choose one: 1. '
    + 'discard that card; 2. discard X cards and deal 1 damage to them (X is the number of '
    + 'suits that have not entered the discard pile this turn). If you do, then for the '
    + 'rest of this turn, after you deal damage other than through this skill you draw a '
    + 'card, and this skill becomes usable up to twice this phase.',
  ':xiongzi': '(once per game) At the start of your Prepare phase, you can make your Blazing '
    + 'Current, Flame Eddy and Burning Tide trigger only during your turn for the rest of '
    + 'the game, keeping only all of their option 1 or all of their option 2, then draw two '
    + 'cards.',
  ':xiugeng': 'At the start of your turn, you can record the hand card count of up to two players. '
    + 'If you do, at the start of those players\' Draw phase, if their hand card count is: '
    + 'not greater than the recorded value, they draw two cards; not less than the recorded '
    + 'value, their hand limit +1.',
  ':xizhan': '(forced) At the start of another player\'s turn, you choose one option:<br>1. discard '
    + 'a card and make your Fragrant Trail invalid this turn, then carry out the effect '
    + 'matching the discarded card\'s suit:<br>♠, it counts as them using an '
    + 'Alcohol;<br><font color=\'red\'>♥</font>, it counts as you using an Ex Nihilo;<br>♣, '
    + 'it counts as you using an Iron Chain on them;<br><font color=\'red\'>♦</font>, it '
    + 'counts as you using a fire Slash on them.<br>2. lose 1 HP.',
  ':xuancun': 'At the end of another player\'s turn, if your HP is greater than your hand card '
    + 'count, you can make them draw X cards (X is the difference between your HP and your '
    + 'hand card count, at most 2).',
  ':xuanjian_sword': 'Equip card - Weapon<br/><b>ATK range</b>: 3<br/><b>Weapon skill</b>: you can use all '
    + 'your hand cards of one suit as a Slash.',
  ':xuanjian_sword_skill&': 'You can use all your hand cards of one suit as a Slash.',
  ':xuetu': '(toggle) Once per Action phase, you can: Yang, make a player recover 1 HP; Yin, make '
    + 'a player draw two cards.<br>⬤ Level 2: Once per Action phase for each option, you '
    + 'can choose one: 1. make a player recover 1 HP; 2. make a player draw two cards.<br>⬤ '
    + 'Level 3: (toggle) Once per Action phase, you can: Yang, recover 1 HP and make a '
    + 'player discard two cards; Yin, draw a card and deal 1 damage to a player.',
  ':xuetu_v2': 'Once per Action phase for each option, you can choose one: 1. make a player recover '
    + '1 HP; 2. make a player draw two cards.',
  ':xuetu_v3': '(toggle) Once per Action phase, you can: Yang, recover 1 HP and make a player '
    + 'discard two cards; Yin, draw a card and deal 1 damage to a player.',
  ':xunyi': 'At the start of the game, you choose another player and give them the Duty '
    + 'mark.<br>After you or the player with Duty takes 1 damage, if the damage source is '
    + 'not the other of the two of you, that other one discards a card.<br>After you or the '
    + 'player with Duty deals 1 damage, if the damaged player is not the other of the two '
    + 'of you, that other one draws a card.<br>When the player with Duty dies, you can '
    + 'transfer the Duty mark.',
  ':xushu__gongli': '(forced) If your ally Friend Zhuge Liang is in play, when you trigger Mystic Sword '
    + 'it instead lets you use one hand card as Slash; if your ally Friend Pang Tong is in '
    + 'play, the Slash you use with Mystic Sword has no distance restriction. (Only in '
    + 'Fight the Landlord and 2v2 modes)',
  ':xushu__gongli_pangtong': '(forced) If your ally Friend Pang Tong is in play, the Slash you use with Mystic '
    + 'Sword has no distance restriction.',
  ':xushu__gongli_zhugeliang': '(forced) If your ally Friend Zhuge Liang is in play, when you trigger Mystic Sword '
    + 'it instead lets you use one hand card as Slash.',
  ':xuye': 'Once per turn, after the player with the fewest hand cards in play takes damage, you '
    + 'can make them draw two cards, then if they have the most hand cards in play, you '
    + 'place a card from their area on top of the draw pile.',
  ':yajun': 'During your Draw phase, you draw one extra card. At the start of your Action phase, '
    + 'you can start a point fight with another player using a card you obtained this turn; '
    + 'if you: win, you can put one of the point fight cards on top of the draw pile; do '
    + 'not win, your hand limit this turn -1.',
  ':yance': 'Once per round, at the start of the first round or in your Prepare phase, you can '
    + 'choose one: randomly obtain a trick card from the draw pile; carry out <a '
    + 'href=\'wolongyance\'>"Sleeping Dragon\'s Stratagem"</a>. If you carry out "Sleeping '
    + 'Dragon\'s Stratagem", then when a card is used, if that card\'s type or color matches '
    + 'your prediction, you draw a card (each time you carry out "Sleeping Dragon\'s '
    + 'Stratagem" you can draw at most five cards this way).<br>After all predictions of '
    + '"Sleeping Dragon\'s Stratagem" have been verified, or when you carry out "Sleeping '
    + 'Dragon\'s Stratagem" again, if the number of correct predictions in this "Sleeping '
    + 'Dragon\'s Stratagem" is:<br>0, you lose 1 HP, and thereafter the number of cards '
    + '"Sleeping Dragon\'s Stratagem" can predict is reduced by 1;<br>less than half, you '
    + 'discard a card;<br>at least half (rounded up), you obtain from the draw pile a card '
    + 'matching the condition you declared, according to the way you predicted this '
    + 'time;<br>all correct, you draw two cards, and thereafter the number of cards '
    + '"Sleeping Dragon\'s Stratagem" can predict is increased by 1 (up to 7).',
  ':yangjie': 'Once per Action phase, you can start a point fight with a player. If you do not win, '
    + 'you can make another player count as using a fire Slash with no distance restriction '
    + 'on the player who fought points with you.',
  ':yanhui': 'After you use a card and choose its first target, you can show a hand card of one '
    + 'target player; if that card has already been shown this turn, you discard it. If you '
    + 'do, at the end of this phase you choose one: 1. deal 1 fire damage to a player who '
    + 'had a card discarded this way this phase; 2. draw X cards (X is the number of '
    + 'players who have shown cards this turn).',
  ':yanji': 'At the start of your Action phase, you can perform "<a href=\'zhengsu_desc\'>Rectify</a>".',
  ':yaohu': 'Once per round, at the start of your turn, you must choose a kingdom in play. At the '
    + 'start of the Action phase of another player of that kingdom, they obtain one of your '
    + 'Life cards, then they must choose one: 1. use a Slash that does not count toward the '
    + 'use limit against another player within their ATK range that you designate; 2. this '
    + 'phase, when they use a damage-dealing card targeting you, they must give you two '
    + 'cards, or cancel it.',
  ':yichong': 'In your Prepare phase, you can choose another player and name a suit, obtain all '
    + 'their equipment of that suit and one of their hand cards of that suit, and make them '
    + 'gain a Sparrow mark until the start of your next turn (if a Sparrow mark is already '
    + 'in play, it is moved to that player instead). When a player who has a Sparrow mark '
    + 'obtains a card of the suit you named, you obtain that card (you obtain at most one '
    + 'card from this Sparrow mark).',
  ':yijie': '(forced) When you die, adjust the HP of all players in play to X (X is the average '
    + 'HP of all other players in play, rounded down and at least 1).',
  ':yijin': '(forced) At the start of the game, you gain 6 \'Gold\' marks; at the start of your '
    + 'turn, if you have no \'Gold\', you die. At the start of your Action phase, you make '
    + 'another player who has no \'Gold\' gain one \'Gold\' and the matching effect until the '
    + 'end of their next turn:<br>Bountiful Office: Draw phase draw count +4, and the limit '
    + 'on Slash uses in the Action phase +1;<br>Weighty Trust: recover 3 HP at the end of '
    + 'their turn;<br>Bought Calamity: lose 1 HP at the start of their Action phase, and '
    + 'hand limit -3 this turn;<br>Shut Out: skip the Draw phase;<br>Divine Reach: prevent '
    + 'non-thunder damage taken;<br>Gold Besotted: skip the Action phase and the Discard '
    + 'phase.',
  ':yijin_guxiong': 'At the start of your Action phase, lose 1 HP; hand limit -3',
  ':yijin_houren': 'At the end of your turn, recover 3 HP',
  ':yijin_jinmi': 'Skip your Action phase and Discard phase',
  ':yijin_tongshen': 'Prevent non-thunder damage you take',
  ':yijin_wushi': 'Draw phase draw count +4, Action phase Slash use count +1',
  ':yijin_yongbi': 'Skip your Draw phase',
  ':yingba': 'Once per Action phase, you can make another player whose max HP is greater than 1 '
    + 'lose 1 max HP and gain a Pacify mark, then you lose 1 max HP; you use cards on '
    + 'players who have a Pacify mark with no distance restriction.',
  ':yingjia': '(once per game) At the end of a player\'s turn, if you have used at least two trick '
    + 'cards with the same name this turn, you can discard a hand card and make a player '
    + 'take an extra turn; at the start of this extra turn they draw two cards.',
  ':yingjian': 'In your Prepare phase, you can count as using a Slash with no distance restriction.',
  ':yingyuan': 'When a card you used during your turn finishes resolving and is put into the discard '
    + 'pile, you can give it to another player (once per turn for each card name).',
  ':yinship': '(forced) You have only the Draw phase, the Action phase and the Discard phase; you '
    + 'cannot be chosen as the target of delayed trick cards.',
  ':yinzhan': '(forced) When you use a Slash to deal damage to a player, if your: HP is not more '
    + 'than theirs, this damage +1; hand card count is not more than theirs, you discard a '
    + 'card of theirs after this Slash finishes resolving. <a href=\'#ChengShi\'>Seize '
    + 'Momentum</a>: you recover 1 HP and obtain the card they discarded.',
  ':yirang': 'At the start of your Action phase, you can give all your non-basic cards (at least '
    + 'one) to another player whose max HP is greater than yours, then you raise your max '
    + 'HP to match that player\'s and recover X HP (X is the number of card types among the '
    + 'cards you gave them this way).',
  ':yixiang': 'Once per turn, after you become the target of a card used by a player whose HP is '
    + 'greater than yours, you can randomly obtain from the draw pile a basic card that you '
    + 'do not have.',
  ':yixing': 'Once per Action phase, you can put all your Gear cards into the discard pile and '
    + 'draw that many cards, then you can put any number of equip cards on your character '
    + 'card, called Gear. You have all the effects of your Gear cards.',
  ':yiyongw': 'After you take damage caused by a Slash used by another player, if there is a weapon '
    + 'card in your equip area, you can obtain that Slash, then use it as a normal Slash on '
    + 'them (if there is no weapon card in their equip area, this Slash deals 1 extra '
    + 'damage to them).',
  ':yizan': 'You can use or play two cards (at least one of which is a basic card) as any basic card.',
  ':yizhu': 'In your Finish phase, you draw two cards, then choose two cards as "Lost Pearls" and '
    + 'record them, shuffling them at random into the top 2X cards of the draw pile (X is '
    + 'the number of living players in the game). After another player uses a recorded '
    + '"Lost Pearl" card and it designates a single target, you can cancel it, then you '
    + 'remove that card from the record.',
  ':youlve': '(forced) After you obtain a card during your turn other than by this skill, you draw '
    + 'a card; after you lose a card outside your turn other than by this skill, you '
    + 'discard a card.',
  ':youye': '(forced) At another player\'s Finish phase, if they have not dealt damage to you this '
    + 'turn, you place the top card of the draw pile on your character card, called '
    + '\'Reserve\' (at most 5). After you deal or take damage, you distribute all \'Reserve\' '
    + 'cards as you wish.',
  ':youyi': 'At the end of your Discard phase, you can put the cards discarded this phase into '
    + 'the <a href=\'RenPile_href\'>Benevolence pile</a>. Once per Action phase, you can '
    + 'discard all cards in the Benevolence pile to make all players recover 1 HP.',
  ':yuanqing': '(forced) At the end of your Action phase, from among the cards that entered the '
    + 'discard pile because you used them this turn, you randomly place one card of each '
    + 'type into the <a href=\'RenPile_href\'>\'Benevolence\' zone</a>.',
  ':yuejin__heyu': '(forced) If allied Thoroughbred Zhang Liao is in play, after a Slash you used Breach '
    + 'on deals damage, you can carry out the option that was not chosen against the target '
    + 'player; if allied Thoroughbred Li Dian is in play, after a player loses a Breach '
    + 'card for the first time each turn, you draw a card. (Only in Landlord and 2v2 modes)',
  ':yuejin__heyu_lidian': '(forced) If allied Thoroughbred Li Dian is in play, after a player loses a Breach '
    + 'card for the first time each turn, you draw a card.',
  ':yuejin__heyu_zhangliao': '(forced) If allied Thoroughbred Zhang Liao is in play, after a Slash you used Breach '
    + 'on deals damage, you can carry out the option that was not chosen against the target '
    + 'player.',
  ':yuetan': 'After a player at distance 1 or less from you becomes the target of a damage card, '
    + 'you can give them a card (if that player is you, you can use this skill directly '
    + 'instead). After this damage card finishes resolving, if they have taken no damage '
    + 'from this card, you draw a card. Each time you lose two cards this way, you recover '
    + '1 HP.',
  ':yueyuan': 'Once per Action phase, you can draw X cards (X is the number of suits recorded by '
    + 'your Hidden Blade), then clear one suit recorded by your Hidden Blade.',
  ':yuhua': '(forced) Your non-basic cards do not count toward your hand limit; at your Finish '
    + 'phase, if your hand count is greater than your HP, you look at the top X cards of '
    + 'the draw pile (X is the number of card types in your hand), place any number of them '
    + 'on top of the draw pile and the rest on the bottom of the draw pile.',
  ':yuli': '(forced) 1. Damage you deal becomes thunder damage; if it is already thunder damage, '
    + 'this damage +1; 2. When you take thunder damage, prevent it and draw that many '
    + 'cards.',
  ':yunan': '(awaken) Your starting kingdom is Wei; when you make a player enter the dying state, '
    + 'if a player has died this round, you change your kingdom to Neutral, then gain or '
    + 'upgrade the skill <a href=\':kechang\'>Prosperity</a>.',
  ':yuxiang': '(forced) If you have Shield: the distance from you to other players is reduced by 1; '
    + 'the distance from other players to you is increased by 1; when you take fire damage, '
    + 'that damage is increased by 1.',
  ':zaoli': '(forced) During your Action phase, you cannot use or play hand cards that you did '
    + 'not obtain this turn. When you use or play a hand card, if your number of Rage marks '
    + 'is less than 4, you gain 1 Rage mark. At the start of your turn, if you have Rage '
    + 'marks, you remove all Rage marks and discard any number of cards (at least one '
    + 'card), then draw X cards (X is the number of Rage marks you removed plus the number '
    + 'of cards you discarded). If the number of Rage marks you removed is greater than 2, '
    + 'you lose 1 HP.',
  ':zhangliao__heyu': '(forced) If allied Thoroughbred Yue Jin is in play, Rampart Charge\'s \'non-basic hand '
    + 'cards\' becomes \'hand cards\'; if allied Thoroughbred Li Dian is in play, Sweeping '
    + 'Force\'s X is fixed at 3. (Only takes effect in Landlord and 2v2 modes.)',
  ':zhangliao__heyu_lidian': '(forced) If allied Thoroughbred Li Dian is in play, Sweeping Force\'s X is fixed at 3.',
  ':zhangliao__heyu_yuejin': '(forced) If allied Thoroughbred Yue Jin is in play, Rampart Charge\'s \'non-basic hand '
    + 'cards\' becomes \'hand cards\'.',
  ':zhangming': '(forced) ♣ cards you use cannot be responded to. Once per turn, after you deal '
    + 'damage to another player, they discard a random hand card, then you obtain from the '
    + 'draw pile or the discard pile one card of each type other than the type of the card '
    + 'they discarded (if they cannot discard a hand card, instead you obtain one card of '
    + 'each type from the draw pile or the discard pile); cards obtained this way do not '
    + 'count toward your hand limit this turn.',
  ':zhanlie': 'At the start of a player\'s turn, you record X (X is your ATK range at that time). '
    + 'After each of the first X Slashes this turn enters the discard pile, if that card is '
    + 'in the discard pile, you gain 1 Blaze mark (you can have at most 6 Blaze marks); at '
    + 'the end of your Action phase, you can remove all your Blaze marks and count as using '
    + 'a Slash with no limit on the number of uses, then choose up to Y options (Y is the '
    + 'number of marks you removed this time divided by 3, rounded down): 1. this Slash\'s '
    + 'targets +1; 2. this Slash\'s base damage +1; 3. the target players must discard an '
    + 'extra card in order to respond to this Slash; 4. after this Slash finishes '
    + 'resolving, you draw two cards.',
  ':zhanshi': 'When players make a point fight, you can choose any number of players in this point '
    + 'fight and discard that many cards; after this point fight resolves, you draw three '
    + 'cards for each chosen player who won.',
  ':zhaohan': '(forced) At the start of your Prepare phase, if X is: less than 4, you gain 1 max HP '
    + 'and recover 1 HP; not less than 4 and less than 7, you lose 1 max HP (X is the '
    + 'number of times you have triggered this skill).',
  ':zhaohuo': '(forced) When another player enters the dying state, if your max HP is greater than '
    + '1, you reduce your max HP to 1, then you draw cards equal to the amount of max HP '
    + 'reduced.',
  ':zhaoxin': 'Once per Action phase, you can place any number of cards on your character card, '
    + 'called \'Ambition\' (their total cannot exceed 3), then draw the same number of cards. '
    + 'At the end of the Draw phase of you and of players in your ATK range, that player '
    + 'can obtain one \'Ambition\' that you choose, then you can deal 1 damage to them.',
  ':zhenbian': '(forced) Your hand limit equals your max HP; when cards enter the discard pile for a '
    + 'reason other than being used, this skill records the suits of those cards, then if '
    + 'this skill has recorded all four suits and your max HP is less than 8, you clear the '
    + 'recorded suits and gain 1 max HP.',
  ':zhenfu': 'In your Finish phase, if you have lost cards by discarding this turn, you can make '
    + 'another player gain 1 shield.',
  ':zhengjian': '(forced) In your Finish phase, you give a player a Candid Recommendation mark, then '
    + 'at the start of your next turn they draw X cards and remove the Candid '
    + 'Recommendation mark (X is the number of cards they used or played during that '
    + 'period, up to their max HP and up to 5).',
  ':zhengjing': 'Once per Action phase, you can collate the classics once, and place any of the cards '
    + 'you collated onto a player\'s character card, called Canon, then you obtain the '
    + 'remaining cards. In the Prepare phase of a player who has Canon on their character '
    + 'card, they obtain all of the Canon cards, then they skip this turn\'s Judge phase and '
    + 'Draw phase.',
  ':zhengjun': 'At the start of your Action phase, you can perform "<a '
    + 'href=\'zhengsu_desc\'>Discipline</a>"; after your Discard phase ends, if "<a '
    + 'href=\'zhengsu_desc\'>Discipline</a>" succeeded, you gain the "<a '
    + 'href=\'zhengsu_desc\'>Discipline</a>" reward, then you can make another player also '
    + 'gain the "<a href=\'zhengsu_desc\'>Discipline</a>" reward.',
  ':zhengnan': 'After another player dies, you can draw three cards; if you do, you gain any one of '
    + 'the following skills: Warrior Saint, Vanguard and Subdue the Savage.',
  ':zhengpeng': 'At the end of a player\'s turn, you can choose an eligible player and lose X HP (X is '
    + 'the number of times this skill has been used this round); you draw a card for each '
    + 'of the following that player met this turn: they took damage, they lost an equip '
    + 'card, they are not the current turn\'s player and obtained cards. <a '
    + 'href=\'#ChengShi\'>Ride the Momentum</a>: reset this skill\'s X, then you obtain one '
    + 'card of each type from the discard pile.',
  ':zhengshuo': '(once per game) In your Action phase, you can make all players discard all their '
    + 'hand cards in turn, then reshuffle the draw pile. If you do, all players each draw '
    + 'four cards.',
  ':zhengsu_bianzhen': 'During your Action phase, use at least 2 cards, and the cards you use are of the same suit',
  ':zhengsu_leijin': 'During your Action phase, use at least 3 cards, and the numbers of the cards you use '
    + 'are increasing',
  ':zhengsu_mingzhi': 'During your Discard phase, discard at least 2 cards, and the cards you discard are '
    + 'all of different suits',
  ':zhenjun': 'At the start of your Action phase, you can give a card to another player, then make '
    + 'them choose whether to use a non-black Slash; after this Slash finishes resolving '
    + 'you draw X cards (X is the damage dealt by this Slash +1, up to 5). If they do not, '
    + 'you can deal 1 damage to them or to a player within their ATK range.',
  ':zhenting': 'Once per turn, when you or a player in your ATK range becomes the target of a Slash '
    + 'or a delayed trick card, if you are not the user of this card, you can choose one '
    + 'option: 1. discard a hand card from the user of this card; 2. draw a card. Desperate '
    + 'Stand: you become the target of this card in their place.',
  ':zhenting_inner': 'Once per turn, when you or a player in your ATK range becomes the target of a Slash '
    + 'or a delayed trick card, if you are not the user of this card, you can choose one '
    + 'option: 1. discard a hand card from the user of this card; 2. draw a card.',
  ':zhenxing': 'In your Finish phase or after you take damage, you can look at the top three cards '
    + 'of the draw pile, then obtain the one among them whose suit differs from that of '
    + 'both of the others.',
  ':zherui': 'After a player with a Breach card in their equip area uses a Slash and chooses '
    + 'targets, you use Breach on them once with the option chosen by them; after a player '
    + 'loses a Breach card from their equip area, you deal 1 damage to them.',
  ':zhijie': 'Once per round, at the start of a player\'s Action phase, you can show one of their '
    + 'hand cards. After they use a card of the same type as that card during this phase, '
    + 'they draw a card and discard X cards (X is the number of times this effect has '
    + 'triggered minus 1); at the end of that phase, if the number of cards they drew this '
    + 'way during the phase is greater than the number of cards they discarded this way, '
    + 'you and they each draw a card.',
  ':zhilve': 'Once per Action phase, you can lose 1 HP to increase your hand limit this turn by 1, '
    + 'and choose one option: 1. move a card on the field; 2. draw a card and it counts as '
    + 'using a Slash with no distance restriction and no limit on the number of uses.',
  ':zhimeng': 'At the end of your turn, you can split your hand cards evenly at random with another '
    + 'player (if this is not Role mode, this becomes another player whose hand card count '
    + 'is no greater than your hand card count +1); if the total number of cards is odd, '
    + 'you take the larger share.',
  ':zhimeng_1v2': 'At the end of your turn, you can split your hand cards evenly at random with another '
    + 'player whose hand card count is no greater than your hand card count +1; if the '
    + 'total number of cards is odd, you take the larger share.',
  ':zhimeng_role_mode': 'At the end of your turn, you can split your hand cards evenly at random with another '
    + 'player; if the total number of cards is odd, you take the larger share.',
  ':zhiyi': '(forced) At a player\'s Finish phase, if you have used or played a basic card this '
    + 'turn, you choose one: 1. it counts as using any one basic card you have used or '
    + 'played this turn; 2. draw a card.',
  ':zhongao': '(mission) At the start of the game, you gain the skill <a '
    + 'href=\':m_shi__kuanggu\'>Bloodlust</a>.<br>⬤ Success: after you kill a player, you '
    + 'upgrade the skill Bloodlust. If, during that phase, the number of cards you used is '
    + 'less than the number of cards you discarded for Valiant Oath, you draw a card; the '
    + 'number of cards you used is less than the amount of HP you lost for Valiant Oath, '
    + 'you recover 1 HP (if you are not wounded, you draw a card instead).<br>⬤ Failure: '
    + 'when you enter the dying state, or you choose not to use the skill Valiant Oath, you '
    + 'lose the skill Valiant Oath and gain the skill <a href=\':kunfen\'>Desperate '
    + 'Struggle</a>.',
  ':zhoulin': '(once per game) In your Action phase, if you have Beast Arts, you can gain 2 Shield '
    + 'and choose one beast effect; until the start of your next turn, Beast Arts always '
    + 'carries out that beast effect.',
  ':zhouxian': '(forced) When you become the target of a damage card used by another player, you '
    + 'reveal the top three cards of the draw pile, then they must discard a card of a type '
    + 'that appears among the revealed cards, otherwise this target is cancelled.',
  ':zhuangshi': 'At the start of your Action phase, you can perform at least one of the following in '
    + 'order: 1. discard at least one hand card, then the first X cards you use this phase '
    + 'have no distance restriction and cannot be responded to (X is the number of cards '
    + 'you discarded this way); 2. lose at least 1 HP, then the same number of the first '
    + 'cards you use this phase do not count toward use limits.',
  ':zhugeliang__gongli': '(forced) If Friend Pang Tong is in play on your side, the initial number of cards '
    + 'you can predict when you carry out "Sleeping Dragon\'s Stratagem" is increased by 1; '
    + 'if Friend Xu Shu is in play on your side, the result of the first card you predict '
    + 'with "Sleeping Dragon\'s Stratagem" is always treated as correct. (Only takes effect '
    + 'in Landlord and 2v2 modes.)',
  ':zhugeliang__gongli_pangtong': '(forced) If Friend Pang Tong is in play on your side, the initial number of cards '
    + 'you can predict when you carry out "Sleeping Dragon\'s Stratagem" is increased by 1.',
  ':zhugeliang__gongli_xushu': '(forced) If Friend Xu Shu is in play on your side, the result of the first card you '
    + 'predict with "Sleeping Dragon\'s Stratagem" is always treated as correct.',
  ':zhuguo': 'Once per Action phase, you can make a player adjust their hand to X cards (X is '
    + 'their max HP, at most 5). Then if they: did not draw, they recover 1 HP; drew cards '
    + 'this way and have the most hand cards in the game, you can choose another player and '
    + 'let them decide whether to use a Slash against this player with no distance '
    + 'restriction and no limit on the number of uses.',
  ':zhujian': 'Once per Action phase, you can make at least two players who have cards in their '
    + 'equip area each draw a card.',
  ':zhujis': 'At the end of your Action phase, you can choose a hand card, discard all your hand '
    + 'cards of the same suit as it, then obtain and use an equip card of that suit from '
    + 'the draw pile. If the number of cards you discarded is not less than the number of '
    + 'cards in your equip area before you used that equip card, choose one: 1. draw two '
    + 'cards; 2. heal 1 HP; 3. gain 1 Shield.',
  ':zifu': '(forced) At the end of your Action phase, if you used no card this phase, your hand '
    + 'limit -1 this turn and you remove all your Preps.',
  ':zujin': 'Once per turn for each card name, if you are not wounded or your HP is not the '
    + 'lowest, you can use or play a basic card as Slash; if you are wounded, you can use '
    + 'or play a basic card as Dodge or Nullification.',
  ':zundi': 'Once per Action phase, you can discard a hand card and choose a player, then you '
    + 'judge; if the result is: black, they draw three cards; red, they can move a card on '
    + 'the field.',
  ':zuoxing': 'Once per Action phase, you can make God Guo Jia lose 1 max HP, and it counts as '
    + 'using a regular trick card.',
  ':zuoyou': '(toggle) Once per Action phase, Yang: you can make a player draw three cards, then '
    + 'they discard two hand cards; Yin: you can make a player discard a hand card, then '
    + 'they gain 1 Shield (in 2v2 mode this becomes: make a player gain 1 Shield).',
  ':zuoyou_2v2': '(toggle) Once per Action phase, Yang: you can make a player draw three cards, then '
    + 'they discard two hand cards; Yin: you can make a player gain 1 Shield.',
  ':zuoyou_role_mode': '(toggle) Once per Action phase, Yang: you can make a player draw three cards, then '
    + 'they discard two hand cards; Yin: you can make a player discard a hand card, then '
    + 'they gain 1 Shield.',

  /* ------------------------------------------------------------------------
   * Portrait marks. 195 keys.
   * ---------------------------------------------------------------------- */
  '@$RenPile': 'Benevolence',
  '@$dinghan': 'Secure the Han',
  '@$jichou': 'Swift Scheme',
  '@$mobile__mingfa': 'Open Campaign',
  '@$yijin': 'Gold',
  '@&changshiCards': 'Palace Attendant',
  '@@AddTarget': 'Add Target',
  '@@CancelTarget': 'Cancel Target',
  '@@aosi-phase': 'Unbridled',
  '@@changshi__yaozhuo': 'Slander',
  '@@chanyuan': 'Entangled Grudge',
  '@@chuhai-phase': 'Slay the Scourge',
  '@@connected-inhand': 'Linked',
  '@@dawu': 'Heavy Fog',
  '@@dingzhen-round': 'Frontier Guard',
  '@@fujiy-inhand': 'Talisman Aid',
  '@@fuman-inhand': 'Pacify the Tribes',
  '@@ganggeng-turn': 'Blunt Integrity',
  '@@hongyi': 'Grand Decorum',
  '@@jianyu': 'Remonstrance',
  '@@jingzhong': 'Reverence',
  '@@jinzu_damage_record-turn': 'Mighty Arrowhead',
  '@@jiyul-phase': 'Urgent Defense',
  '@@kouluet_slash-inhand': 'Plunder',
  '@@kuangfeng': 'Gale',
  '@@kuangli-turn': 'Savage Frenzy',
  '@@kujian-inhand': 'Remonstrance',
  '@@liyong-phase': 'Fierce Valor',
  '@@luanchou': 'Marriage',
  '@@m_ex__anguo': 'Steady the State',
  '@@m_ex__benxi-phase': 'Charge: extra target',
  '@@m_ex__jiangchi_prohibit-phase': 'Command Charge: no Slash',
  '@@m_ex__jiangchi_targetmod-phase': 'Command Charge: extra Slash',
  '@@m_ex__wurong_skip': 'Skip Draw',
  '@@m_ex__xianzhen-phase': 'Breach Formation',
  '@@m_ex__xianzhen_maxcards-turn': 'Breach Formation',
  '@@m_ex__zhongyong-inhand-turn': 'Loyal Valour',
  '@@m_ex__zhuikong_prohibit-turn': 'Trembling Dread',
  '@@m_ex__zongshi-turn': 'Imperial Clan',
  '@@m_shi__qingyan-inhand': 'Stern Integrity',
  '@@m_yuan__yijue-turn': 'Sever Ties: no cards',
  '@@mobile__bijing': 'Seal the Borders',
  '@@mobile__faluclub': '♣Sovereign Earth',
  '@@mobile__faludiamond': '<font color=\'red\'>♦</font>Hook Star',
  '@@mobile__faluheart': '<font color=\'red\'>♥</font>Jade Purity',
  '@@mobile__faluspade': '♠Purple Star',
  '@@mobile__funan-inhand': 'Rebuttal',
  '@@mobile__huxiao-turn': 'Tiger Roar',
  '@@mobile__kongrong_qian': 'Modesty',
  '@@mobile__kuangxiang-inhand': 'Mutual Aid',
  '@@mobile__lianpo-turn': 'Onslaught',
  '@@mobile__mail-inhand': 'Letter',
  '@@mobile__mingfa_fail-turn': 'Open Assault Failed',
  '@@mobile__mumu-turn': 'No Slash',
  '@@mobile__natu_xing-inhand': 'Revival',
  '@@mobile__natu_yi-inhand': 'Righteousness',
  '@@mobile__runwei-inhand-phase': 'Subtle Nourishment',
  '@@mobile__songshu-turn': 'Praise of Shu',
  '@@mobile__wangliec-phase': 'Valiant Advance',
  '@@mobile__xiahui-inhand': 'Cunning Wit',
  '@@mobile__xuehen-inhand': 'Vengeance',
  '@@mobile__yilie': 'Righteous Ardor',
  '@@mobile__yinju': 'Grasp the Robe',
  '@@mobile__yizheng': 'Righteous Contest',
  '@@mobile__yufeng': 'Ride the Wind',
  '@@mobile__zengou-inhand': 'Slanderous Plot',
  '@@mobile__zishu-inhand-turn': 'Personal Letter',
  '@@mobile_qianlong__fangzhu_skill_nullified': 'Exile: skills void',
  '@@mobile_visible_card-inarea': 'Revealed',
  '@@nos__cunsi': 'Preserve the Heir',
  '@@powei_wei': 'Siege',
  '@@poxiang-inhand-turn': 'Defy Surrender',
  '@@qirang-inhand': 'Prayer Rite',
  '@@ruilian': 'Sage Gleaning',
  '@@shenzhuo-turn': 'Divine Sign: no Slash',
  '@@shihe': 'Show of Force',
  '@@shizhong_buff-turn': 'Multitude: 100000 DMG',
  '@@shizhong_record-inhand': 'Strength in Numbers',
  '@@shizhong_same-noclear': 'Strength in Numbers',
  '@@shouyuez_qinyin': 'Bestow Music: Zither Tone',
  '@@taomie': 'Extermination',
  '@@tingwei_invalidity': 'Non-forced skills void',
  '@@tongqu': 'Canal Works',
  '@@wangzhuan-turn': 'Usurped Authority',
  '@@weiming': 'Mighty Mandate',
  '@@wisdom__xi': 'Summons',
  '@@xiongjinBasic-turn': 'Bold Advance: basic',
  '@@xiongjinNotBasic-turn': 'Bold Advance: non-basic',
  '@@xiongtus_buff-turn': 'Vicious Scheme',
  '@@xunyi': 'Righteousness',
  '@@yaohu-phase': 'Invite the Tiger',
  '@@yuetan_give': 'Tanxi Leap',
  '@@zaoli-turn-inhand': 'Restless Rage',
  '@@zhangming-inhand-turn': 'Manifest Renown',
  '@[:]jiren_debuff': 'Rousing Blade',
  '@[:]yijin': '',
  '@[:]yijin_owner': 'Vast Gold',
  '@[bingfaDesc]bingfa_record-round': 'Uphold the Law',
  '@[cardtypes]mobile_dongjiao__weizhuang_tip-noclear': 'Finery',
  '@[jianlvNum]-noclear': 'Broad Counsel',
  '@[list]m_shi__haoshi': 'Generosity',
  '@[mobile__zhixi]': 'Cessation',
  '@[mou__xieli]': 'Joint Effort',
  '@[private]guimou': 'Cunning Scheme',
  '@[private]mobile__xuewei': 'Blood Guard',
  '@[private]mobile__zengou_wu': 'Framed',
  '@[suits]mobile_xiuge__weizhuang_tip-noclear': 'Finery',
  '@[wuling]': 'Five Beasts',
  '@[yance]': 'Sleeping Dragon\'s Stratagem',
  '@bihuoy-round': 'Avert Disaster',
  '@bingqing-phase': 'Uphold Purity',
  '@cangjia_record': 'Hidden Blade',
  '@changshi__zimou': 'Own Counsel',
  '@chengzhang': 'Verse Complete',
  '@chizhang': 'Rampant Display',
  '@choulue': 'Stratagem',
  '@daming': 'Mandate',
  '@defensive_siege_engine_durability': 'Defence Durability',
  '@dingyi': 'Ordained Rites',
  '@fenyin-turn': 'Rousing Voice',
  '@hengwei_record-turn': 'Overbearing Might',
  '@hongyic': 'Resolve',
  '@houfeng-turn': 'Rich Stipend',
  '@huishig': 'Fading Radiance',
  '@jiejianw': 'Loyal Remonstrance',
  '@jiejie-round': 'Admonition',
  '@jingtu-color': 'Pure Land',
  '@kechang_level-noclear': 'Prosperity Level',
  '@kubai_level-noclear': 'Withered White Level',
  '@lingfa-round-noclear': 'Rule of Law',
  '@m_ex__benxi-phase': 'Raid Distance',
  '@m_ex__danshou_count-turn': 'Valiant Guard',
  '@m_ex__jianying_record-phase': 'Gradual Design',
  '@m_ex__luanji-phase': 'Wild Volley',
  '@m_ex__qiaoshui-phase': 'Silver Tongue',
  '@m_ex__qimou-turn': 'Ingenious Scheme',
  '@m_ex__yaoming': 'Chasing Fame',
  '@m_ex__zenhui-choice': 'Slander: choose one option for %dest to perform',
  '@m_shi__sijian': 'Dying Remonstrance',
  '@m_shi__xianshuai-turn': 'Vanguard',
  '@machao_thunder': 'Thunder',
  '@mobile__baoli': 'Brutality',
  '@mobile__fengji': 'Bountiful Store',
  '@mobile__geyuan_record-noclear': 'Circle Cutting',
  '@mobile__gongsun': 'Shared Loss',
  '@mobile__jieyu': 'Dogged Defense',
  '@mobile__lianji': 'Chain Stratagem',
  '@mobile__qianlong_daoxin': 'Resolve',
  '@mobile__renjie_ren': 'Endure',
  '@mobile__runwei-phase': 'Subtle Nourishment',
  '@mobile__yanjiao': 'Strict Teaching',
  '@mobile__yilie_lie': 'Fierce',
  '@mobile__zengou-round': 'Slanderous Plot',
  '@mobile__zhenfeng_mobile__hanzhan': 'Fierce Battle',
  '@mobile__zhenfeng_zhanlie': 'Blazing War',
  '@mobile_qianlong__fangzhu_limit': 'Exile Limit',
  '@nigu-turn': 'DMG Bonus',
  '@offensive_siege_engine_durability': 'Assault Durability',
  '@panxiang': 'Halting Aid',
  '@qianchong-phase': 'Modesty',
  '@qihui': 'Enlightenment',
  '@qinzheng': 'Diligent Governance',
  '@quchong_casting_point': 'Casting',
  '@raoshe': 'Loose Tongue',
  '@ruilian-turn': 'Sage Gleaning',
  '@shangjian-turn': 'Frugality',
  '@shanjia': 'Mend Discard',
  '@shixie_distance': 'Distance',
  '@shuanghuai': 'Frost Heart',
  '@sizi_active': 'Unbridled',
  '@skill_charge': 'Charge',
  '@tiansuan': 'Heaven\'s Reckoning',
  '@weifeng': 'Fear',
  '@weizhuang_status-noclear': 'Finery',
  '@wuku': 'Armoury',
  '@xiezhi_buff': 'Harbored Ambition',
  '@xingbu': 'Star Divination',
  '@xingbu-turn': 'Star Divination',
  '@xingtu': 'Cartography',
  '@xiongzi-noclear': 'Majestic Bearing',
  '@xiugeng_record': 'Tend the Fields',
  '@yaohu': 'Invite the Tiger',
  '@yichong': 'Shifting Favour',
  '@yichong_que': 'Sparrow',
  '@yingba_pingding': 'Pacify',
  '@zaoli': 'Rage',
  '@zhanlie': 'Fierce',
  '@zhenbian': 'Border Guard',
  '@zhengjian': 'Candid Recommendation',
  '@zhengsu_bianzhen-turn': 'Shift Formation',
  '@zhengsu_leijin-turn': 'Drumbeat Advance',
  '@zhengsu_mingzhi-turn': 'Sound the Halt',
  '@zhijie-phase': 'Wise Counsel',
  '@zhoulin': 'Cursed Scales',
  '@zhuangshi-phase': 'Valiant Oath',

  /* ------------------------------------------------------------------------
   * Voice-line subtitles. 1541 keys.
   * ---------------------------------------------------------------------- */
  $JieDang: 'Faction',
  $PindianCard: 'Point Fight Card',
  $RenPile: 'Benevolence Area',
  $TaMo: 'Couch Counsel',
  $anda1: 'Your rule south of the river is new and unsettled. How can you kill this land\'s finest?',
  $anda2: 'Master Yu has blessed the army and healed the men. He must not be killed.',
  $anxianc1: 'I draw the carved bow unseen - the arrow sings like thunder!',
  $anxianc2: 'Today you learn how deadly my archery is!',
  $aocai1: 'Hmph. Easy as turning my hand.',
  $aocai2: 'My lord is wise, and his grace covers all who serve him.',
  $aosi1: 'Fierce, arrogant, unbridled - born with wild bones!',
  $aosi2: 'Savage and unchecked, I look down on every hero alive!',
  $baoxi1: 'Hahahaha! I want to see a sea of blood on every field.',
  $baoxi2: 'Such fine spoils of war - how could I let them pass?',
  $beiming1: 'A comet rises over Wu and Chu - we must take up arms!',
  $beiming2: 'Muster every soldier in Huainan, to punish the Sima traitors!',
  $beizhu1: 'Muster the men, and make them ready for the march.',
  $beizhu2: 'Pick out the officers - we ride against the traitors to Han.',
  $beizhu3: 'The rebels are strong; do not force a battle yet.',
  $bifeng1: 'It has come to this - report the crisis at the southern gate at once.',
  $bifeng2: 'What Your Majesty has done today has failed both court and people.',
  $bifeng3: 'Fall back from his charge - on no account strike the imperial carriage.',
  $bihan1: 'If harm comes to the young lord, ten thousand deaths would not atone for me!',
  $bihan2: 'While I draw breath in Jiangdong, the house of Sun will not fall!',
  $bihuoy1: 'Come to him as a beaten man, and your merit is slight and your life unsafe.',
  $bihuoy2: 'Better to join another and hold him off first, then submit - your merit will be far '
    + 'greater.',
  $biluan1: 'In a broken age it is enough to keep yourself alive.',
  $biluan2: 'Shelter from the storm of the hour, and win a lasting peace.',
  $bingfa1: 'The law is the standard of the realm, the measure of all things.',
  $bingfa2: 'In a wise ruler\'s state there are no bamboo tracts - the law itself is the teaching.',
  $bingfa3: 'Merit is rewarded though the man be a stranger; guilt is punished though he be beloved.',
  $bingfa4: 'Cheapen the rewards and the loyal slacken; pardon the punishments and the '
    + 'treacherous grow bold.',
  $binghuo1: 'The Yellow Turbans have risen - the unrighteous armies shall burn!',
  $binghuo2: 'Kill the officials, kill the clerks - slay every claw of the court!',
  $binglun1: 'The sickness runs deep or shallow; so the dose runs heavy or light.',
  $binglun2: 'Three parts the physician\'s hand, seven parts the body\'s own care.',
  $bingqing1: 'I keep the sages\' words close, and hold myself to them.',
  $bingqing2: 'Honored and favored, I have not forgotten why I began.',
  $biwei1: 'Why envy the lords at court? Only the stink of coin clings to them.',
  $biwei2: 'Meat rots behind vermilion gates - who counts the years of the people\'s hunger?',
  $bixian: 'The hour is desperate. Nothing less than everything will do!',
  $bojian1: 'The wise women of old all studied how ages rose and fell, and took warning.',
  $bojian2: 'One look and I know the words, and so I learn what honor means.',
  $buqi1: 'We took him in when he asked us - shall we cast him off now, in danger?',
  $buqi2: 'Having taken him in, we must not entertain the thought of abandoning him.',
  $buxu1: 'Vulgar scholars twist the texts; unless they are mended they will mislead all who '
    + 'come after.',
  $buxu2: 'The classics are far from the sages and thick with errors - the Six Classics must be '
    + 'set right.',
  $buyi_m_ex__wuguotai1: 'While I am here, my good son-in-law comes to no harm!',
  $buyi_m_ex__wuguotai2: 'Wu is no place for your games!',
  $caiqiu1: 'Dress is the greatest of the rites - how could it be settled so carelessly?',
  $caiqiu2: 'My face is at stake. Only one in a hundred will do.',
  $caiqiu3: 'Shameless wench - daring to copy my dress.',
  $caiqiu4: 'My lord has spoiled you far too well. You have forgotten your place.',
  $cangjia1: 'A mind full of strategy, and no one to hear it.',
  $cangjia2: 'A bright pearl cast into the dark - so it has come to this.',
  $cangjia3: 'Alas. Talent enough to order a world, and nowhere to spend it.',
  $cangjia4: 'It is not my wit that falls short - only my fortune.',
  $canshi1: 'How do men differ from ants? Hahaha...',
  $canshi2: 'Is not all of it in My hands?',
  $caowei1: 'Zhang Liao has eight hundred men. How dare he face my hundred thousand?',
  $caowei2: 'They are few and weak. Surround them and strike.',
  $changshi__bilan_taunt1: 'Coarse I may be, but far above you raving old fools!',
  $changshi__chihe1: 'You want an audience with His Majesty? Heh heh - I fear you are not so blessed.',
  $changshi__chiyan: 'Owl\'s Maw',
  $changshi__chiyan1: 'Traitors and rebels alike will suffer this pecking of the heart.',
  $changshi__duangui_taunt1: 'Hmph. Cattle in fine collars, swine in caps and gowns!',
  $changshi__gaowang_taunt1: 'Without my help, where would you be today?',
  $changshi__guosheng_taunt1: 'A muddled old fool - I am ashamed to stand in his company.',
  $changshi__hankui_taunt1: 'Pah! Better a short life of comfort than a drudge like you!',
  $changshi__kuiji1: 'Those who walk our road are loyal; those who take another are traitors!',
  $changshi__lisong_taunt1: 'Humble as I am, I am the Emperor\'s eyes and ears. And what use are you?',
  $changshi__miaoyu1: 'A small hurt, nothing more. Rest easy and mend.',
  $changshi__niqu1: 'Divided hearts and divided purpose we will not suffer!',
  $changshi__picai1: 'Raise ten thousand great halls, and the house of Han will not fall.',
  $changshi__sunzhang_taunt1: 'Angry at slander, glad at praise - you must never, never be so!',
  $changshi__taoluan1: 'Silk and scarlet, purple and gold - all puppets in our hands.',
  $changshi__xiaolu1: 'Greasing palms up and down the palace costs a little silver, naturally.',
  $changshi__xiayun_taunt1: 'Greed and bribery are the smaller crimes; insolence to the throne is treason!',
  $changshi__yaozhuo1: 'Blind the Emperor above, and cheat the court below!',
  $changshi__zhangrang_taunt1: 'I am father to the Emperor himself - are you fit to stand beside me?',
  $changshi__zhaozhong_taunt1: 'Talk like that? Go and find your own face in a puddle of piss.',
  $changshi__zimou1: 'We serve in the palace, and every bit of it is for profit!',
  $chanyuan1: 'Blind to heaven\'s reckoning, there is no escaping fate.',
  $chanyuan2: 'Every mortal grudge is born in the heart.',
  $chengxiong1: 'No unruly minister stands before the Son of Heaven.',
  $chengxiong2: 'His Majesty has given the order. Take his head!',
  $chengye1: 'Study hard before you are grown; set your will before you are strong.',
  $chengye2: 'Resolve lies in firmness and action; learning in diligence and time.',
  $chengye3: 'I carry on my forebears\' work and spread the learning of Confucius.',
  $chengzhang1: 'The string draws tight, the mournful note sounds. Hear my ardent words.',
  $chengzhang2: 'The prime never comes again; a hundred years press hard on me.',
  $chengzhao1: 'For His Majesty I will cut down the arch-traitor!',
  $chengzhao2: 'Every word of this edict pierces the heart - how can Cao not be slain!',
  $chenshe1: 'These stragglers were not the ringleaders. Lord Cao, spare them the axe.',
  $chenshe2: 'Tian Yin and Su Bo are broken. What is left to fear from the rest?',
  $chenshe3: 'A thousand men live today, and all by Lord Cao\'s mercy.',
  $chiyuanc1: 'Full gallop - crimson thunder splits the sky!',
  $chiyuanc2: 'A thousand li in the space of a breath!',
  $chiyun1: 'Lord Sun\'s ambition soars past the clouds - Yu must raise his own to the open sky.',
  $chiyun2: 'With all of Yu\'s skill and spirit, I will fulfil every hope of Jiangdong.',
  $chiyun_m_shi2__zhouyu1: 'The lamps of Wu burn at my back - I will guard them!',
  $chiyun_m_shi2__zhouyu2: 'Your ambitions are grand, my lords - watch me drive them forward.',
  $chiyun_m_shi2__zhouyu3: 'With this blade\'s edge, I send my host down the river!',
  $chiyun_m_shi2__zhouyu4: 'A spark in my palm becomes a blaze to burn the sky.',
  $chizhang1: 'Insolent whelp! How dare you speak so wildly!',
  $chizhang2: 'Sun Quan raids me again and again. I will take him alive and be done with it.',
  $chongcha1: 'To sight the highest and sound the deepest, you must use double differences.',
  $chongcha2: 'Twin gnomons, linked cords, stacked distances - that is the method of double differences.',
  $chongjian1: 'Your finest generals cannot stand one blow from me!',
  $chongjian2: 'Broken men like these? Too easy!',
  $chonglei1: 'No more words today. Only battle!',
  $chonglei2: 'A thousand peaks, ten thousand ravines -- I will ride them all down!',
  $chongsi1: 'My driver has the carriage ready. I set out on a long road.',
  $chongsi2: 'Where does the long road lead? To Wu, and to my enemy.',
  $chouhai1: 'Hmph. And what if I make three thousand enemies?',
  $chouhai2: 'Go mad, or be destroyed!',
  $choulue1: 'Follow this plan, and the army\'s heart will settle.',
  $choulue2: 'The stratagem that breaks Yuan - I have it already.',
  $choumang1: 'All the waters of the Luo could not wash the Sima clan\'s crimes clean!',
  $choumang2: 'Generations of Wei\'s favour, and now the Sima dare do this!',
  $chuhai1: 'With me standing here, who dares work harm?!',
  $chuhai2: 'Wretched little beast - kneel and take your death!',
  $chuhai3: 'Not this time - we fight again tomorrow!',
  $chuifeng1: 'Charge! No blade nor spear will hold us!',
  $chuifeng2: 'I walk on blades - let a horse\'s hide be my shroud!',
  $chunlao_m_ex__chengpu1: 'Set out the good wine for the victory feast.',
  $chunlao_m_ex__chengpu2: 'Drink this parting cup and take the first honor!',
  $cuijin1: 'March, all of you - the code will deal with any man who lags!',
  $cuijin2: 'Faster! Miss the moment and you die, no pardon!',
  $cuijun__gongli1: 'One flavour never sweetened Yi Yin\'s cauldron; one tree never made a forest.',
  $cuijun__gongli2: 'Bind good friends to you, and the way of virtue grows wide.',
  $cuizhen1: 'If you want to live, throw down your arms and your armour!',
  $cuizhen2: 'Full advance! We swear to bring the Sima traitors down!',
  $daigong1: 'No hurry. We wait for their spirit to fail.',
  $daigong2: 'I have read every plan of theirs; a long game will tie them down.',
  $daizui1: 'Chancellor, mark the fault down and let Gan earn it back!',
  $daizui2: 'Gan thanks the Chancellor for sparing his life!',
  $daming1: 'By Shiyuan\'s good word I came to my lord at Jiameng, and carried his will through Shu.',
  $daming2: 'Speak of governance, plan for kingship -- I will make my lord\'s great work.',
  $daming3: 'My heart was large and my ambition wide. I have shamed the lord who knew my worth.',
  $dangshi1: 'Your retreat is cut. Dismount and meet the blade!',
  $dangshi2: 'These are my death-sworn men. Have you the stomach to face them?',
  $dangshi3: 'Heaven\'s might sweeps the rebels away. Surrender, curs!',
  $dangshi4: 'Their line is broken -- give chase, now!',
  $dangxian_guansuo: 'Generals, let the young one take the field first!',
  $daoji1: 'Eighty catties of twin halberds? I lift them out like coin from a purse!',
  $daoji2: 'Your own spear against your own shield!',
  $daozhuan1: 'I carry Heaven\'s law: I close the road of evil and open the stair to Great Peace.',
  $daozhuan2: 'You who would repay Heaven and earth and win long life -- believe in the Dao, and '
    + 'never slacken.',
  $daozhuan3: 'No study, no wisdom. No plowing, no harvest. Do you understand?',
  $daozhuan4: 'Alas! You of resolve -- plan early, plan early, and do not waste my words.',
  $debao1: 'It cost me a lift of the hand - how can I stop you praising me so?',
  $debao2: 'Do good without ceasing, and its reward follows close behind.',
  $dengli1: 'Bravest man in the realm or no, I will not give half a step!',
  $dengli2: 'Empty fame is no boast. Speak no more of beating me!',
  $dieyin1: 'The turning of a zither\'s tone lies in the hand, and more in the heart.',
  $dieyin2: 'The strings crash like running thunder; the melody turns like a whirlpool.',
  $difei1: 'Plead illness, receive no one, and wait for them to show their hand.',
  $difei2: 'Lady Sun\'s slanders do not touch me by a hair.',
  $dinghan1: 'There is a place to lay down this life, and an hour to repay the state.',
  $dinghan2: 'What serves the state I will not shirk, though it kill me.',
  $dingyi1: 'To order the state and settle the people, we must first fix the rites.',
  $dingyi2: 'Rule without rites, and hope for peace? It cannot be had.',
  $dingzhen1: 'Call the wanderers home, and raise the counties up again.',
  $dingzhen2: 'Shelter the people and gather the multitude, and the Qiang come back to the soil.',
  $dingzhou1: 'Su goes himself - what has my lord left to fear?',
  $dingzhou2: 'Wherever Su goes, all is settled!',
  $duanbi1: 'Call in the old coin, recast it anew, and the people will have wealth to spare.',
  $duanbi2: 'Unify the coinage of Shu, and the gain will last a thousand years.',
  $duanchang_m_ex__caiwenji1: 'The geese fly high, too far to find; my heart breaks in the silence.',
  $duanchang_m_ex__caiwenji2: 'If heaven has eyes, how does it not see me drifting alone?',
  $duanjin1: 'That bridge is Wu\'s only retreat - cut it and victory is already ours.',
  $duanjin2: 'Split the force, break the bridge, cut off their aid - we return in total victory.',
  $duansuo1: 'My heart is a torch. No cold iron chain will stop it.',
  $duansuo2: 'Melt the gold, break the chains, and win the day!',
  $duanyang: 'Severed Harness',
  $duanyang1: 'Forward, every one of you. Any man who falls back dies here.',
  $duanyang2: 'Insolent wretch! How dare you shake my army\'s spirit.',
  $duanyang3: 'My officers did well - how could I not reward them?',
  $dujin1: 'A hundred thousand men are worth less than one more plate of my armour!',
  $dujin2: 'One light boat, straight ahead - break their vanguard!',
  $dulie1: 'My word has always been my bond. Let my faith stand plain!',
  $dulie2: 'If small promises fail, on what will great faith stand?',
  $duohui1: 'An envoy needs a silver tongue. I am ill-suited to the task.',
  $duohui2: 'I would guard Yizhou from within, not argue for it abroad.',
  $duoji1: 'Yield Jizhou, General, and you will rest as safe as Mount Tai.',
  $duoji2: 'Let the Yuan have Jizhou, and they will repay you richly.',
  $duwu1: 'The great victory over Cao is ours this very day!',
  $duwu2: 'Storm the walls with everything! Any man who speaks of retreat dies!',
  $duzuo1: 'A great foe stands before us - I will stand with my lord!',
  $duzuo2: 'Ten thousand men each, you and I - how can Cao the traitor win?',
  $ex__ganglie_m_ex__xiahoudun1: 'Fierce heart, bold gut. What is a little wound!',
  $ex__ganglie_m_ex__xiahoudun2: 'Trade life for life, and the enemy will flinch!',
  $ex__guanxing_m_ex__jiangwei1: 'Reading heaven is easy, so I read it. Defying it is hard, so I do it.',
  $ex__guanxing_m_ex__jiangwei2: 'To do all a man can, first hear what heaven decrees.',
  $ex__leiji1: 'Be an offering to the age of the Yellow Heaven.',
  $ex__leiji2: 'Call the wind and rain, drive the thunder, whip the lightning!',
  $ex__yingzi_m_ex__sunce1: 'With Gongjin beside me, the realm can be settled.',
  $ex__yingzi_m_ex__sunce2: 'Wherever I go, no battle is lost.',
  $fangqiu1: 'One stroke settles it - why invite more uncertainty?',
  $fangqiu2: 'The enemy breaks now - let us not waste the moment.',
  $fangqiu3: 'Hahaha! Exactly as I foresaw.',
  $fangzhu_mobile__godsimayi: 'This old man is not cruel. You brought it on yourself!',
  $fangzong1: 'One battle bound us, and it can never be. For the greater cause I cut this love away!',
  $fangzong2: 'The general leaves his kindness everywhere he goes - and my heart with it.',
  $feijing1: 'Hah! Now you know what the Flying Swallow can do!',
  $feijing2: 'Blame your luck, boy. You fell into my hands.',
  $feijing3: 'Plunder every house! Leave not a chicken nor a dog!',
  $feijing4: 'I want scorched earth for a thousand li, and not a soul on it.',
  $feili1: 'My fault for holding back and letting you crawl away alive.',
  $feili2: 'Xiahou Mao, it has come to this. Spare me the act.',
  $fencheng_m_ex__liru1: 'A thousand li of imperial city, all of it ash!',
  $fencheng_m_ex__liru2: 'Glory, power, desire, let this fire take every last one of them!',
  $fengjie1: 'See a worthy man and seek to match him, then look within yourself.',
  $fengjie2: 'Root yourself in the Way, and stand yourself in what is right.',
  $fenli_m_ex__zhuhuan1: 'Hold the ground and make them come. That wins a hundred fights in a hundred.',
  $fenli_m_ex__zhuhuan2: 'Stand with me for this one fight, and the victory is ours.',
  $fentao1: 'With your ambition and mine, we sweep the Nine Provinces.',
  $fentao2: 'Jiangdong\'s spark will sweep the whole realm at last.',
  $fentao_m_shi2__zhouyu1: 'Mengde, do not grieve this defeat - we meet again at Xudu.',
  $fentao_m_shi2__zhouyu2: 'Lord Cao needs no horsehide shroud - the three rivers will bury you!',
  $fentao_m_shi2__zhouyu3: 'A thousand li of the Yangtze - let the fire run east with it!',
  $fentao_m_shi2__zhouyu4: 'A million northern men, and today the great river takes them all!',
  $fenyin1: 'Our war cry shakes the heavens - the enemy\'s heart must break!',
  $fenyin2: 'A song before the lines, to lift the army\'s heart!',
  $friend__manjuan1: 'Ten lines at a glance still feels shallow; one shut door, five cartloads read.',
  $friend__manjuan2: 'With eyes like these, what book could go unread?',
  $friend__yangming1: 'I merely nurture the realm\'s scholars and choose talent for my lord.',
  $friend__yangming2: 'The worthy are many. Those who can recognise them are few.',
  $fubi1: 'To aid one\'s lord and prop up the throne - that is a gentleman\'s ambition.',
  $fubi2: 'Offer counsel, weigh the stratagem, and help settle the realm.',
  $fuhai1: 'Overturn the rivers, tread the seas, and set heaven and earth in order!',
  $fuhai2: 'Take Jiangdong by force, and let my name ring through the realm!',
  $fujiy1: 'This talisman reaches the gods above and the netherworld below. Its powers are many.',
  $fujiy2: 'My talismans scourge a hundred demons. What is a little sickness to them?',
  $fujiy3: 'He who keeps Heaven\'s will lives long; he who loses it dies.',
  $fujiy4: 'Heaven nourishes a man\'s life; earth nourishes his form.',
  $fujiy5: 'Heaven and earth keep their law, and never err by a hair.',
  $fuman1: 'Kindness and force together - the tribes will serve us yet!',
  $fuman2: 'Break out the weapons!',
  $futu1: 'The unferried I carry across; the crossed I set toward Buddhahood.',
  $futu2: 'May I gain the Buddha\'s pure voice, the Dharma\'s sound reaching without bound.',
  $futu3: 'Compassion in the heart, deliverance for all beings.',
  $futu4: 'If I do not enter hell, who will?',
  $futu5: 'The world holds three paths and five sufferings - why not be reborn in bliss?',
  $futu6: 'The realm of desire is endless torment; the Western Paradise, free and unhindered.',
  $futu7: 'Body, speech and mind made pure; wisdom delights in hearing much.',
  $futu8: 'Desire is the root of suffering; contentment is wealth and joy.',
  $fuyu1: 'I am an officer of Han. I guard the city and its people. How could I turn away?',
  $fuyu2: 'I can level a spear and ride a horse - who says I lack the strength to resist?',
  $fuyu3: 'The ground favors us. Sun Ce will never take it.',
  $fuyu4: 'This is the court\'s own land. I will hold it to the death.',
  $gaigong1: 'Old grudges end today.',
  $gaigong2: 'We serve one state - what room is there for private grievance?',
  $gaigong3: 'My lord\'s order stands; Li Dian puts the greater cause first.',
  $gaigong4: 'This is a matter of state - shall private rancour make me forget the common good?',
  $ganggeng1: 'I will speak against his face. Why should I fear one death?',
  $ganggeng2: 'Feng has good counsel, General. Why not take it?',
  $ganggeng3: 'Heaven\'s hour is yours, General. This battle is already won.',
  $ganggeng4: 'Alas, all is lost. All is lost!',
  $ganjue1: 'Firm, decisive, brave and resolved - so should a true man be.',
  $ganjue2: 'A general must adapt in time, and rout the rebels early.',
  $gaoyuan1: 'Send word to Xingba - tell him we need him, without fail.',
  $gaoyuan2: 'Matters are desperate. Only Xingba can save us now.',
  $gebo1: 'Clasp hands, make peace, and lay the sword down for good.',
  $gebo2: 'Friends once more - let the old grudge go.',
  $gonghuan1: 'Cao\'s Wei grows strong. Wu and Shu must stand against it together.',
  $gonghuan2: 'With this marriage between us, the two states hold all the firmer.',
  $gongmou1: 'Set men where death is certain, and they will fight to the death.',
  $gongmou2: 'My king, hold the six armies back to show your strength in reserve - why ride out '
    + 'yourself for fear of defeat?',
  $guansha1: 'Use the frost - flood the sand, and by dawn we have a wall.',
  $guansha2: 'Raise that rampart, and no wall of metal, no moat of fire, could better it.',
  $guanzong1: 'You are his uncle. Must you quarrel with a boy?',
  $guanzong2: 'Aman is hale and lively - hold your tongue!',
  $guicai_mobile__godsimayi: 'The making of heaven and earth turns on a single thought of mine!',
  $guidao_m_ex__zhangjiao1: 'Where the Way\'s power turns, I am the one who decides.',
  $guidao_m_ex__zhangjiao2: 'Heh heh. Such is heaven\'s will!',
  $guiming1: 'So you would send Me down to the Yellow Springs?',
  $guiming2: 'This is the last emperor\'s road of no return!',
  $guimou1: 'A rabble thrown together in haste - hardly a match for you, General.',
  $guimou2: 'Chickens tied together cannot roost as one; follow Gui\'s plan and they come apart '
    + 'one by one.',
  $guli1: 'If I cut down this witless lord, what of it that they call me traitor?',
  $guli2: 'Han Xuan is short on wit and long on suspicion. I will kill him now!',
  $gushe1: 'You know the Mandate and you know the times - why raise a nameless army against our '
    + 'borders?',
  $gushe2: 'Lay down your arms, surrender with honour, and you keep your marquisate. The state '
    + 'at peace, the people glad - would that not be fine?',
  $guying1: 'Our camp stands as firm as bedrock!',
  $guying2: 'Deep walls, solid ramparts - no enemy dares come!',
  $guzheng_m_ex__zhangzhaozhanghong1: 'A ruler must not build without restraint and squander the realm\'s substance.',
  $guzheng_m_ex__zhangzhaozhanghong2: 'Settle the people, secure the state, and only then think of moving.',
  $hannan1: 'The rebels are brave, but Fu will spend himself to hold them!',
  $hannan2: 'Even the valour of Han Xin and Ying Bu can be answered with a plan!',
  $heji1: 'Join our strength and strike - what trouble are a few bandits?',
  $heji2: 'Bofu! In today\'s battle, hold nothing back!',
  $hengwei1: 'Cao Cao, that boy - why fret? Let him pitch camp, and I will take him myself.',
  $hengwei2: 'Eighteen warlords feared me. And you are common soldiers?',
  $hongyi1: 'Make the rites and the teaching plain, and rein in what is unseemly.',
  $hongyi2: 'Train up a great character, and raise upright virtue high.',
  $hongyic1: 'A thousand li of road - but walk it, and you arrive.',
  $hongyic2: 'Ten thousand perils, and still the thing must be tried.',
  $hongyic3: 'Without breadth he cannot bear the weight; without resolve he cannot go the distance.',
  $hongyic4: 'A gentleman must be broad and resolute: the burden is heavy and the road is long.',
  $houfeng1: 'The command is yours - do not fail my hopes!',
  $houfeng2: 'Merit earns its reward. Bring it forward!',
  $houfeng3: 'Drag him out! Twenty strokes of the rod!',
  $huaibi1: 'Ah! The commoner is innocent - it is the jade he carries that damns him.',
  $huaibi2: 'Here is all the grain and fodder. Take it, kinsman, as you will.',
  $huangtian_m_ex__zhangjiao1: 'The Azure Heaven is no more; the Yellow Heaven takes its place!',
  $huangtian_m_ex__zhangjiao2: 'The Yellow Heaven stands, the people\'s hearts follow, the realm is at peace!',
  $huanshiz1: 'I shall match my father\'s nerve and throw back the invaders!',
  $huanshiz2: 'Fine wine is fine, but it will not spoil my duties.',
  $huanshiz3: 'The debt of a father\'s raising is heavy - but blood cannot be cut!',
  $huantu1: 'With warlords swarming, my lord should draw in and hold back - be not the first to '
    + 'court disaster.',
  $huantu2: 'The fate of Chen Sheng is lesson enough for today - weigh it well, my lord.',
  $huaxin_ren: 'Benevolence',
  $huishig1: 'A stray dog with no home. My lord need not trouble himself.',
  $huishig2: 'The hour and the means are both at hand - what is left to fear?',
  $huitian1: 'With honest fire in my breast, I dare challenge heaven for my fate!',
  $huitian2: 'Let the rain of heaven fall - I will turn earth over and reverse the very sky!',
  $huitian3: 'Let later ages say what they will - Wei... has not failed the people.',
  $huitian4: 'The land remains; the blood of the loyal... flows on.',
  $huiyao1: 'With Cangshu for company, the heights were never cold to me.',
  $huiyao2: 'Quick wit with no will to study -- the whole world will sigh over it.',
  $jiang_m_ex__sunce1: 'I will carry victory home to Jiangdong.',
  $jiang_m_ex__sunce2: 'Heroes of the realm - who among you dares face me?',
  $jianlv1: 'Look at Wei\'s armies now - ten times what they were.',
  $jianlv2: 'If Shu falls, the lips are gone and our teeth will freeze.',
  $jianlv3: 'Guard Jiangdong, and keep faith whole.',
  $jianxiong_m_sp__caocao1: 'I crushed the Wuhuan and put down the rebels. I am the first general of Han!',
  $jianxiong_m_sp__caocao2: 'Right or wrong, merit or fault - let later ages judge it.',
  $jianxiong_mobile__caoying: 'To do great things, look far ahead - as my grandfather did.',
  $jianyi1: 'We are wealthy now, and still nothing should be wasted.',
  $jianyi2: 'Plain clothes and thrift - that is how a house rises.',
  $jianyu1: 'Weigh gain against loss and speak loyal counsel to the last - that is our duty.',
  $jianyu2: 'Each guards the other, each keeps to his place, and each is fully used.',
  $jianzhan1: 'Receive the Emperor, raise arms against the traitors, and the great work is done.',
  $jianzhan2: 'My lord is the hero of the age - who could stand against him?',
  $jibing1: 'Gather the best of Jing and Yang, and we rise for the great cause!',
  $jibing2: 'Brothers of the faith, assemble! Do not fail the great work!',
  $jichou1: 'Urgency calls for expedients. Give me a moment to think.',
  $jichou2: 'In this hour of ruin, only a desperate plan will serve.',
  $jici1: 'How can your rotten-grass glimmer stand against the bright moon of heaven?',
  $jici2: 'You... you country bumpkin Zhuge, you dare!',
  $jiebian1: 'All beings turning on the wheel - come swiftly to my land and be at peace.',
  $jiebian2: 'A merciful heart always, lifting the living, ferrying the boundless suffering across.',
  $jiebing1: 'The foe is strong and the hour desperate - I can only thank you, sir.',
  $jiebing2: 'General, your loan of troops - Fu will repay it once the enemy is driven off.',
  $jiefan_m_ex__handang1: 'Five thousand of the Jiefan at my back, awaiting your word, my lord!',
  $jiefan_m_ex__handang2: 'To ease my lord\'s cares, I stand ready at his command!',
  $jiejianw1: 'Your Majesty, why the haste? Endure, and wait for the moment.',
  $jiejianw2: 'Power has sat at their gate for years now. How would Your Majesty stand against it?',
  $jiejianw3: 'Duke Zhao of Lu fled and lost his state. Your Majesty must think deeper still.',
  $jiejie1: 'Duty is the great cause of a life - how could one not answer it?',
  $jiejie2: 'To take a man\'s whip and then abandon his work is ill-omened, and must not be done.',
  $jiejie3: 'In the ranks of an army, only mercy and forbearance can save you.',
  $jiejie4: 'In office, think of your charge; in duty, think of what you stand for.',
  $jiezhu1: 'The Wei army falls back - order the advance at once!',
  $jiezhu2: 'Too weak to strike, but more than strong enough to hold.',
  $jiezhu_shijic1: 'The Wei army falls back - order the advance at once!',
  $jiezhu_shijic2: 'Too weak to strike, but more than strong enough to hold.',
  $jiguan1: 'What common horse could soar across a battlefield of sky?',
  $jiguan2: 'Full power. Victory for my lord!',
  $jiguan_jueying1: 'Across the wide world - chasing wind, outrunning shadow!',
  $jiguan_jueying2: 'Steel sinew, iron bone, a thousand jun on my back!',
  $jijiang_m_ex__liushan1: 'My lords, put your strength together and keep this realm standing.',
  $jijiang_m_ex__liushan2: 'Which of my lords will serve the state?',
  $jijiu_m_ex__huatuo1: 'Save the dying, tend the wounded, heal the world.',
  $jijiu_m_ex__huatuo2: 'A deft hand and a kind heart - the medicine lands, the illness lifts.',
  $jilim1: 'Where power and profit intrude, kin turn to foes - and we were never kin!',
  $jilim2: 'Since I pledged myself my offences have piled like mountains, yet I rest easy - how '
    + 'much more should my lord!',
  $jilim3: 'Your Majesty thirsts for worthy men and sits humbly aside; no wise man would refuse you.',
  $jilim4: 'I came from afar in awe of Your Majesty - am I some assassin sent by Liu Bei?',
  $jilim5: 'I could not stay true to the end - but Liu Feng pushed me too far!',
  $jilim6: 'Even the sea that swallows a hundred rivers has waves that break its calm.',
  $jilim7: 'I only guard the border and hold the land - what other design could I have?',
  $jilim8: 'My heart Your Majesty has long known. Why doubt me now?',
  $jilim9: 'Lowborn as I am, I still know the words honour and duty.',
  $jilun1: 'To build a lasting work, be mindful of the people\'s season.',
  $jilun2: 'Weigh every gain and loss to the end - and ban all ornate, cunning words.',
  $jimi1: 'Submit to Us, and there is honey for all!',
  $jimi2: 'Fine honey wants mung beans from north and south - it is not to be gulped down!',
  $jimi3: 'So sweet, so very sweet - Our vigour knows no end!',
  $jimi4: 'Without all the honey under Heaven, where is Our imperial majesty?',
  $jimie1: 'Silence upon all things, extinction upon all realms!',
  $jimie2: 'All returns to stillness, and heaven and earth answer to my name alone!',
  $jimie3: 'I am the law of all laws, the god who slays gods!',
  $jimie4: 'At the ending of this world, I shall shine forth again!',
  $jinfan1: 'Raise the silk sails, raid every shore, and live free!',
  $jinfan2: 'Where the bells are heard, there is no peace left!',
  $jingtu1: 'Tear out the root of birth and death, and reach supreme enlightenment.',
  $jingtu2: 'Trust the deep words of the sutras; trust that good deeds bring blessing.',
  $jingtu3: 'The bowl appears before you, filled of its own accord.',
  $jingtu4: 'Wish for clothes and they come, wish for food and it comes - all is made by mind.',
  $jingtu5: 'To take life is to deliver life; to do harm is to end harm.',
  $jingtu6: 'Be a lamp unto yourself; practise, and know it for yourself.',
  $jingxie1: 'Only finely wrought engines keep an army safe.',
  $jingxie2: 'Ingenious, yes - but not yet perfect.',
  $jingzhong1: 'What I lack is beauty. And you, my lord - how many virtues do you have?',
  $jingzhong2: 'You love looks and slight virtue - and call yourself complete in every one?',
  $jinzu1: 'Loose this arrow, and you die beneath my stray shaft!',
  $jinzu2: 'Skill that touches heaven still cannot dodge my measured arrow!',
  $jiren1: 'I have long heard Wenyuan\'s name. Today let me weigh it.',
  $jiren2: 'Wenyuan comes just in time - Shun was hoping for a lesson.',
  $jishi1: 'I study the ancients hard, and keep the will to heal.',
  $jishi2: 'I gather remedies from every hand, and follow no fashion.',
  $jiwei1: 'The treasure of a broken age is not gold or land, but a kind heart.',
  $jiwei2: 'A common man is guilty for holding jade. How much more a great house.',
  $jiwei3: 'Neighbors on every side, let us bear these hard times together.',
  $jiwei4: 'The people were born to a cruel hour. How could I watch them starve?',
  $jixi_m_ex__dengai1: 'Strike where they are not ready - cut the general down, take the baggage!',
  $jixi_m_ex__dengai2: 'A surprise force and a frontal push - what can the enemy do?',
  $jixiy1: 'I am the founder of a dynasty! Hahahahaha...',
  $jixiy2: 'Mandated by Heaven -- long life and endless prosperity.',
  $jiyul1: 'The army is out. The camp comes first - how can we not wall it?',
  $jiyul2: 'A lifetime of wisdom, Chancellor. Will you be blinded by this?',
  $jiyul3: 'You face the rebels, Chancellor - raise the stockade now, against whatever comes.',
  $jizhi_mobile__godsimayi: 'Every scheme, every stroke, serves my long design!',
  $juejin1: 'I would sooner die fighting - does the traitor dare meet me?',
  $juejin2: 'Shall I sit and be deposed in shame? Today we ride out against him!',
  $jueyong1: 'Surrounded? What of it. There is only death!',
  $jueyong2: 'Deep in their lines, I fight all the fiercer!',
  $juezhi1: 'Restore the five ranks of nobility, and the crumbling realm may yet hold.',
  $juezhi2: 'In name, five ranks of nobility; in truth, a wall around the imperial house.',
  $juezhig1: 'Blades have no eyes, Wenyuan. Keep your guard up.',
  $juezhig2: 'They say your spearwork is divine. Let me see it for myself.',
  $juezhig3: 'A test of skill, not a contest of victory.',
  $juezhig4: 'This is a bout. We stop at the first touch.',
  $juguz1: 'For the great cause Hong must die - but you have done nothing; do not share in this ruin.',
  $juguz2: 'The Yuans are lawless and their designs are treason - how could Hong betray the '
    + 'state to serve a traitor?',
  $jungong1: 'Cao\'s men hold their camp and shun the open field. Now is our chance!',
  $jungong2: 'If this camp does not fall, how can Lan face Lord Yuan again!',
  $junkui1: 'Common colts - off the field!',
  $junkui2: 'Flesh and bone - no match for a frame of steel!',
  $jutu1: 'Let the people live in peace; endless war serves no one.',
  $jutu2: 'The unrest is barely settled - now we rest and recover.',
  $juxiangz1: 'This is not the age of Qin and Xiang; accept their surrender and you only feed rebellion!',
  $juxiangz2: 'Same shape, different momentum - this plea for surrender must not be taken!',
  $kaiji1: 'Store the grain, hoard the cloth, and turn the people back to simplicity.',
  $kaiji2: 'To put an end to extravagance, honour thrift.',
  $kechang1: 'If Heaven\'s mandate rests with Wei, why do the Simas hold all the power?',
  $kouluet1: 'Take their grain, burn their walls - let the Han lose heart at my name!',
  $kouluet2: 'Blood on the yellow sand, corpses in the open field - today we kill our fill!',
  $kuangli1: 'I killed the sovereign under orders - now disperse!',
  $kuangli2: 'Whoever gathers a mob again, I will cut him down!',
  $kuangwu1: 'Hah! Have you heard the name of the great general of Lingling?',
  $kuangwu2: 'Still boasting? I will have your dog\'s head!',
  $kuangwu3: 'I was wrong, sir! Strategist, spare me, leave me one road out!',
  $kuangwu4: 'Ow! General, is your anger spent?',
  $kubai1: 'The body of a character must come in a single stroke.',
  $kubai2: 'The line may break here and there, but the lifeblood never does.',
  $kubai3: 'Master one style alone, and reach past compare.',
  $kubai4: 'Five harmonies meet: the spirit melts and the brush runs free.',
  $kubai5: 'Refine the craft further, and a latecomer can still stand first.',
  $kubai6: 'One stroke of flying white - unmatched, and alone.',
  $kuili1: 'There is still a turn to be won. We must not break ranks now.',
  $kuili2: 'I do not fear defeat by the enemy - I fear our own hearts have broken.',
  $kujian1: 'Every word I speak is for my lord\'s great cause.',
  $kujian2: 'Would my lord be known for heeding counsel in name alone!',
  $kujian3: 'Your house has flourished for generations, my lord - but not as Zhou once did.',
  $kunfen_m_shi3__weiyan1: 'My lord trusts me deeply - a small setback will not shake me.',
  $kunfen_m_shi3__weiyan2: 'The road ahead is hard - so march at twice the pace!',
  $kunfen_m_shi__weiyan1: 'My lord trusts me deeply - a small setback will not shake me.',
  $kunfen_m_shi__weiyan2: 'The road ahead is hard - so march at twice the pace!',
  $laishou1: 'Grey hair and a bent back - that is what we call long years.',
  $laishou2: 'Nurse a contented heart, and win the lifespan of the immortals.',
  $laishou3: 'My blessings run out, and I never saw a hundred years!',
  $lianxi1: 'You marched in alone and marched in deep - straight to your own grave!',
  $lianxi2: 'Han is falling. The Wuhuan will rise!',
  $lianzhant1: 'The gates are open - in with you, and cut them down!',
  $lianzhant2: 'Hahahaha! Two of them down in a row - glorious!',
  $liaoyi1: 'A decoction of ephedra may yet cure this cold-damage plague.',
  $liaoyi2: 'Look, listen, ask, take the pulse - then treat what is there.',
  $lidian__heyu1: '',
  $lidian__heyu2: '',
  $liezhi1: 'I regret only that my arrows are too few to kill you all!',
  $liezhi2: 'To fall is a small thing; to keep faith is great.',
  $liezhiz1: 'The royal house is in peril and the traitor\'s head still on his shoulders - now is '
    + 'the hour to repay it with our lives.',
  $liezhiz2: 'Han is stricken and the imperial order broken - gather the righteous host and march '
    + 'to save the state.',
  $lingce1: 'Shao has the numbers, but they are hard to use - they will come to nothing.',
  $lingce2: 'Yuan\'s army is a dish of loose sand, my lord - one bold stroke and it scatters.',
  $lingfa1: 'Orders obeyed, bans kept - the law knows no mercy.',
  $lingfa2: 'The law stands like a mountain. How dare you trifle with it!',
  $liubing1: 'Even you drifters can show the courage of my army.',
  $liubing2: 'Drifters are no use as they are - drill them hard and they become elite.',
  $lixia1: 'The general is truly a pillar of the state.',
  $lixia2: 'A hero may make his home and his living here in Jiaozhou.',
  $liyong1: 'A million rebels - I do not spare them a glance.',
  $liyong2: 'One against a thousand - come on, then!',
  $longyuan1: 'The golden scale was never meant for the pond; one storm, and it becomes a dragon.',
  $longyuan2: 'I bided my time, and today at last I make my name.',
  $luanchou1: 'May you be paired like phoenixes, and sworn like mandarin ducks.',
  $luanchou2: 'Husband and wife who sustain each other grow old together.',
  $luanqun1: 'Past eighty a man follows his heart\'s desire - where is the overstepping in that?',
  $luanqun2: 'I hold an office of prudence, and I have read and heard much - all the more reason '
    + 'to speak my nature!',
  $luezhen1: 'Hmph. Cao Cao\'s ten thousand? I count them as weeds!',
  $luezhen2: 'I will ride out myself, sweep their lines, and cut the traitor down.',
  $lulian1: 'This court may do without an emperor - can it do without Sun Chen?',
  $lulian2: 'The affairs of court are yours, my lord; life and death are mine!',
  $lulian3: 'Do not fear the loneliness below - your whole clan will keep you company!',
  $lulian4: 'I am kind at heart, I cannot bear partings - so your clan shall be reunited!',
  $lunxiong1: 'The brilliant plans with insight and sees the moment - he needs the bold to act.',
  $lunxiong2: 'The bold subdues by strength and clears the way - he needs the brilliant to finish it.',
  $luoying_m_ex__caozhi1: 'The tumbleweed leaves its root, drifting on the long wind.',
  $luoying_m_ex__caozhi2: 'Tall trees know the mournful wind, and the sea lifts up its waves.',
  $m_ex__anguo1: 'Wentai knew my worth - I will spend myself to the last on the work he left behind.',
  $m_ex__anguo2: 'Steady the state, settle the realm, and make the southeast one!',
  $m_ex__anguo3: 'The house of Sun is in peril - I will give everything to hold it up!',
  $m_ex__anjian1: 'One arrow, one life!',
  $m_ex__anjian2: 'An open spear is easy to dodge; a hidden arrow is not!',
  $m_ex__anxu1: 'Virtue and propriety: teach others, and teach yourself.',
  $m_ex__anxu2: 'Rain and dew fall evenly, and the inner palace keeps its peace.',
  $m_ex__beige1: 'The men are fierce as vipers, armoured and bows drawn, revelling in their pride.',
  $m_ex__beige2: 'The second stanza, the string drawn near to breaking; will crushed, heart broken, I '
    + 'sigh for myself.',
  $m_ex__benxi1: 'War knows only victory and defeat - why spare such useless things?',
  $m_ex__benxi2: 'Birds already startled by the bow - you cannot outrun my charge!',
  $m_ex__benxi3: 'My robe stained with the sunset of Yong and Liang, my horse across the last snows of '
    + 'Mount Qi!',
  $m_ex__bingyi1: 'Counsel straight, and hide no private motive.',
  $m_ex__bingyi2: 'Hold to fairness, keep to one purpose, and be worthy of His Majesty\'s grace.',
  $m_ex__dangxian1: 'Who says Shu Han has no generals left?',
  $m_ex__dangxian2: 'The old general\'s hair is white, but his blade is keen still!',
  $m_ex__danshou1: 'This city is in danger - I will give it everything I have!',
  $m_ex__danshou2: 'A true man knows when to bend and when to rise; one battle decides nothing.',
  $m_ex__dingpin1: 'The old system of recommendation is ruined; let Rectifiers choose our men.',
  $m_ex__dingpin2: 'Set Rectifiers in every province and commandery, and rank talent by the nine grades.',
  $m_ex__duanliang1: 'Their grain has not been hauled three times over - they have broken the great rule '
    + 'of the march.',
  $m_ex__duanliang2: 'Cut the enemy\'s supply, and this battle is won.',
  $m_ex__duodao1: 'Slip past the edge, and take the blade!',
  $m_ex__duodao2: 'What a fine weapon! Hahaha!',
  $m_ex__fangquan1: 'Decide it yourself, my worthy minister.',
  $m_ex__fangquan2: 'The northern campaign is weighty; let my Prime Father settle it all.',
  $m_ex__fangzhu1: 'The law of the realm cannot be set aside. Withdraw for now.',
  $m_ex__fangzhu2: 'General, your campaigns have been hard; I shall grant you a fine estate.',
  $m_ex__fenji1: 'Get past me first!',
  $m_ex__fenji2: 'Fight on, drenched in blood, until death!',
  $m_ex__fuli1: 'The enemy is unbroken - how could I yield so easily?',
  $m_ex__fuli2: 'Watch this old man throw himself into one more fight!',
  $m_ex__ganlu1: 'Xuande truly makes a fine son-in-law.',
  $m_ex__ganlu2: 'A gifted man and a lovely girl - a match made in heaven.',
  $m_ex__gongqi1: 'Three arrows to one string, and not one misses!',
  $m_ex__gongqi2: 'I shoot from either hand in the line, and no blade or spear matches me on horseback!',
  $m_ex__guhuo1: 'The mysteries of the Way shift beyond all reckoning.',
  $m_ex__guhuo2: 'Real as truth, false as dream - who can tell?',
  $m_ex__hunzi1: 'The Little Conqueror\'s name rings through the land - who does not know it?',
  $m_ex__hunzi2: 'Jiangdong is pacified and the heartland shakes - straight on to Xuchang.',
  $m_ex__huoji1: 'This fire will win my army a total victory.',
  $m_ex__huoji2: 'Burn!',
  $m_ex__jianchu1: 'Come on! Charge out and leave them not a scrap of armour!',
  $m_ex__jianchu2: 'One man, one horse, sweeping a thousand aside!',
  $m_ex__jiangchi1: 'Wings spread, wings folded, and the three armies in order.',
  $m_ex__jiangchi2: 'Whip and spur, ten thousand li at a gallop.',
  $m_ex__jianying1: 'A hundred good schemes, and the decisive battle tilts our way!',
  $m_ex__jianying2: 'Fine plans come together - breaking the enemy is within easy reach!',
  $m_ex__jiaojin1: 'Insolent creature! Have you forgotten what you are?',
  $m_ex__jiaojin2: 'Match schemes with the Princess? Hmph. Laughable!',
  $m_ex__jieming1: 'Guide the momentum where it wants to go - that is good strategy.',
  $m_ex__jieming2: 'To die for virtue, and not fail the Emperor\'s grace.',
  $m_ex__jieyue1: 'By the Chancellor\'s order, this force is under my command now!',
  $m_ex__jieyue2: 'To keep the law and serve one\'s lord - what room is there for leniency?',
  $m_ex__jiezi1: 'Take your grain from the enemy, and the army will eat its fill.',
  $m_ex__jiezi2: 'One measure taken from the enemy is worth twenty of our own.',
  $m_ex__jinjiu1: 'Drown yourself in that yellow brew and the work goes undone.',
  $m_ex__jinjiu2: 'In the Charging Camp, no man drinks.',
  $m_ex__jiushi1: 'Three cups drunk in gladness, belt loosened, the dishes poured out.',
  $m_ex__jiushi2: 'Home to feast at Pingle, fine wine at ten thousand a measure.',
  $m_ex__juece1: 'Hold out your hands and be taken!',
  $m_ex__juece2: 'Pull the weed up by the root, and end the trouble for good!',
  $m_ex__junxing1: 'Strict law honours fairness - shall it bend for high or low?',
  $m_ex__junxing2: 'What feeling forgives, the law may not!',
  $m_ex__kanpo1: 'A parlour trick.',
  $m_ex__kanpo2: 'Your scheme is seen through.',
  $m_ex__kongsheng1: 'The strings stir and hearts grow drunk; the sound lands and they wake.',
  $m_ex__kongsheng2: 'Softly I play the Konghou song, and send my drifting heart with it.',
  $m_ex__liangyin1: 'Would we were deep-mountain trees, every branch grown as one.',
  $m_ex__liangyin2: 'The River of Heaven is clear and shallow - how far apart can we be?',
  $m_ex__liangyin3: 'Young lovers, old companions - hand in hand, never tired of looking.',
  $m_ex__liangyin4: 'Nothing higher or brighter than sun and moon; nothing closer or more distant than '
    + 'husband and wife.',
  $m_ex__lianhuan1: 'Too many generals, too many men to meet head on - let them chain themselves, and '
    + 'their momentum dies.',
  $m_ex__lianhuan2: 'The good commander guards against loss even in cleverness, and plans for the turn '
    + 'mid-course.',
  $m_ex__lihuo1: 'This fire is to wipe them out - no room for a woman\'s mercy.',
  $m_ex__lihuo2: 'Win the battle, take the ground, and let fire finish the work.',
  $m_ex__luanji1: 'Ten thousand arrows through the heart - their spirit dies.',
  $m_ex__luanji2: 'Join your heart and strength to mine, and together we will secure the realm.',
  $m_ex__mieji1: 'I mean to leave you nowhere left to run!',
  $m_ex__mieji2: 'You will not escape either!',
  $m_ex__niepan1: 'The phoenix breaks its wings, and rises from the ashes.',
  $m_ex__niepan2: 'An ambition of the ninth heaven - spread wings, and soar.',
  $m_ex__paiyi1: 'Whoever wrecks my design dies unpardoned!',
  $m_ex__paiyi2: 'Denounce this one, and the trouble is already gone!',
  $m_ex__pingkou1: 'I have waited a long while, and all of it for today\'s victory.',
  $m_ex__pingkou2: 'One drumbeat, one charge - break the weary foe!',
  $m_ex__pojun: 'Army Breaker',
  $m_ex__pojun1: 'Whoever sets foot on Wu\'s soil, Sheng will break him!',
  $m_ex__pojun2: 'Come if you dare - you will go home routed!',
  $m_ex__qiangxi1: 'Twin iron halberds, eighty catties - my might shakes heaven and earth!',
  $m_ex__qiangxi2: 'Courage at the front, honour foremost!',
  $m_ex__qiaoshui1: 'Hear me out on this, and the sense of it will be plain.',
  $m_ex__qiaoshui2: 'Today\'s business - just hear me out, that is all.',
  $m_ex__qieting1: 'Secrets? Hah! They reached my ears long ago.',
  $m_ex__qieting2: 'Leave this one alive, and in time he becomes a plague!',
  $m_ex__qimou1: 'Light troops through the Ziwu valley, straight for the Wei capital.',
  $m_ex__qimou2: 'Hah - the Chancellor is weak on daring schemes; risk is my strength!',
  $m_ex__qingjian: 'Austerity',
  $m_ex__qingjian1: 'Thrift with measure - my ambition runs a thousand li!',
  $m_ex__qingjian2: 'Shun luxury and keep it plain, and the army\'s heart is mine!',
  $m_ex__qingnang1: 'To relieve all the living is a physician\'s plain duty.',
  $m_ex__qingnang2: 'First, a tonic.',
  $m_ex__qiuyuan1: 'This is the last hope left.',
  $m_ex__qiuyuan2: 'Rank and title to whoever kills this traitor to the realm!',
  $m_ex__quanji1: 'Fast or slow is not settled in a moment; let us take this slowly.',
  $m_ex__quanji2: 'Weigh the light against the heavy, and judge what fits.',
  $m_ex__shenxing1: 'The finest warfare attacks plans. Think thrice before you move.',
  $m_ex__shenxing2: 'Better, and better still; careful, and more careful yet.',
  $m_ex__shuangxiong1: 'Brother, watch me take Zhao Yun!/Fifty bouts with him, then!',
  $m_ex__shuangxiong2: 'With either of us here, why fear Hua Xiong!/He goes out, and he does not come back!',
  $m_ex__sidi1: 'Watch the enemy move, and strike first to master him.',
  $m_ex__sidi2: 'Read the enemy\'s march, and the ambush ends him.',
  $m_ex__tianxiang1: 'A soft smile - a delicate flower mirrored in the water.',
  $m_ex__tianxiang2: 'A face of jade, a beauty like blossom - not so easily cast aside.',
  $m_ex__tiaoxin1: 'Yellow-mouthed brat - why march out only to die?',
  $m_ex__tiaoxin2: 'If you would like to go home beaten, by all means, advance!',
  $m_ex__tuntian1: 'Rest and recover, so that we are ready for the unforeseen.',
  $m_ex__tuntian2: 'Losses in war are certain - good management is what lessens them.',
  $m_ex__wurong1: 'Quell the Qiang, soothe the tribes, reopen the old roads, restore the posthouses!',
  $m_ex__wurong2: 'Clear judgement and firm action bring order to a thousand li of Yuesui\'s wild frontier!',
  $m_ex__wurong3: 'If the tribes will not be won over, then civilising them never reached them - the '
    + 'fault is Yi\'s own.',
  $m_ex__xianzhen1: 'To break the enemy line - death, and no way back!',
  $m_ex__xianzhen2: 'We attack, and cities fall; we fight, and the enemy breaks.',
  $m_ex__xingshang1: 'The swallows leave and the swans fly south; I think of you wandering far, and my '
    + 'heart breaks.',
  $m_ex__xingshang2: 'Frost and dew come down together, the leaves fall, and all is bleak.',
  $m_ex__xingxue1: 'The ancients founded states on teaching first, shaping vessels for their age!',
  $m_ex__xingxue2: 'Lay down arms, cultivate letters, and exalt the great transformation!',
  $m_ex__xuanfeng1: 'Close with the blades - leave them casting off helm and mail!',
  $m_ex__xuanfeng2: 'Strike them unready - watch them flee at the sound of us!',
  $m_ex__yanzhu1: 'I laid the banquet at Ciyang for one thing only - to take your head!',
  $m_ex__yanzhu2: 'Why wait for high noon? I send you on your way now!',
  $m_ex__yaoming1: 'The mountain turns away no grain of dust, and so it towers; the sea refuses no '
    + 'water, and so it runs deep.',
  $m_ex__yaoming2: 'Aim high and you may reach the middle. Aim low and you get nothing at all.',
  $m_ex__yongsi1: 'In an age of chaos, a great villain is bound to rise.',
  $m_ex__yongsi2: 'The Imperial Seal is mine. Heaven itself is with me!',
  $m_ex__zenhui1: 'If the Princess calls you a traitor, who would say it is false?',
  $m_ex__zenhui2: 'Stop struggling. Not one of you escapes!',
  $m_ex__zhiji1: 'Wei will spend himself to restore the house of Han.',
  $m_ex__zhiji2: 'The Chancellor\'s will - Wei will strain every nerve for it.',
  $m_ex__zhijian1: 'A minister\'s duty is to speak straight and hide nothing.',
  $m_ex__zhijian2: 'Counsel may grate on the ear, but it does the state no harm at all.',
  $m_ex__zhongyong1: 'General Guan, take the blade!',
  $m_ex__zhongyong2: 'Three strokes of the Green Dragon blade, and ten thousand foes fall!',
  $m_ex__zhoufei_harp: 'Konghou',
  $m_ex__zhuikong1: 'In all things, caution is best.',
  $m_ex__zhuikong2: 'A woman I may be, but I will root out the traitor Cao.',
  $m_ex__zili1: 'My name outshines the age - why should I kneel beneath anyone?',
  $m_ex__zili2: 'Heaven hands me the moment - why not take it?',
  $m_ex__zongshi1: 'All under heaven is the soil of great Han!',
  $m_ex__zongshi2: 'The majesty of Han stands undimmed even now!',
  $m_ex__zongshij1: 'Cling to small proprieties and you will never do great things.',
  $m_ex__zongshij2: 'Ceremony and red tape are only ropes to bind a man.',
  $m_ex__zongxuan1: 'As for the days ahead, my mind already has its reckoning.',
  $m_ex__zongxuan2: 'Let me cast a hexagram for the general.',
  $m_js__fayi1: 'I destroyed Dong Zhuo. Court and country now move on my word alone.',
  $m_js__fayi2: 'To repay private favour and forget public duty is Dong Zhuo\'s own crime!',
  $m_js__jishan1: 'The war is my crime - what did the people ever do to deserve it?',
  $m_js__jishan2: 'Bei would sooner die, if only the people could be safe!',
  $m_js__jishan3: 'If the people are at peace, then the realm is at peace!',
  $m_js__jishan4: 'Do no evil because it is small, and leave no good undone because it is small!',
  $m_js__juelie1: 'I have chased the traitor this far - only his death will content me!',
  $m_js__juelie2: 'Word to every unit - cut off the traitor Dong\'s retreat!',
  $m_js__juelie3: 'Luoyang lies before us - do not let Dong slip away!',
  $m_js__juelie4: 'The fire will not wait - the whole army, forward, now!',
  $m_js__shelun1: 'Dong the traitor is dead. His Liangzhou veterans must now be dealt with!',
  $m_js__shelun2: 'This is too grave for one man to settle - let the court debate it!',
  $m_js__shelun3: 'What crime is theirs? They served their master. They need not die!',
  $m_js__shelun4: 'If this rebel host is not put to the sword, how shall the loyal men of the east be '
    + 'comforted!',
  $m_shi__ceduan1: 'Send relief and make us your border shield, and Wu can be broken.',
  $m_shi__ceduan2: 'My humble commandery is small, but it holds the ground that matters.',
  $m_shi__ceduan3: 'The wolves of Jiangdong. Only the royal army can hold them.',
  $m_shi__dimeng1: 'Let our two houses ally, and Cao\'s strength is no threat.',
  $m_shi__dimeng2: 'I lay the times out for you, General - see what this alliance is worth.',
  $m_shi__haoshi1: 'Because he is selfless, he fulfils himself.',
  $m_shi__haoshi2: 'A whole fortune given to the people - where is the harm?',
  $m_shi__haoshi3: 'War upon war, the people scattered - how could I sit and watch?',
  $m_shi__jixi1: 'Strike where they stand empty, and they must break.',
  $m_shi__jixi2: 'Life or death - it turns on this one stroke.',
  $m_shi__kuanggu1: 'Cao\'s traitors, Wu\'s dogs - what have I to fear?',
  $m_shi__kuanggu2: 'I have not fought with all my strength yet. Who could stop me then?',
  $m_shi__kuanggu3: 'Drink the traitors\' blood, then watch me earn more glory.',
  $m_shi__kuanggu4: 'Making an enemy of me is the worst luck you will ever have.',
  $m_shi__kuanggu5: 'Not every rebel is dead. Why would I go back to camp?',
  $m_shi__kuanggu6: 'Is there no foe strong enough to give me even a taste of defeat?',
  $m_shi__kuanggu_m_shi3__weiyan1: 'A small victory - now let us wash away the old shame.',
  $m_shi__kuanggu_m_shi3__weiyan2: 'I should lead the charge, not command the rearguard!',
  $m_shi__qingyan1: 'I walk by the measure, not a hair astray.',
  $m_shi__qingyan2: 'I hold the seal of power and indulge no private desire.',
  $m_shi__qingyan3: 'Clean sleeves, and a stern face in the hall.',
  $m_shi__sijian1: 'If my lord will only listen, Feng would die without regret!',
  $m_shi__sijian2: 'It sits heavy in my chest. I must speak it out!',
  $m_shi__tuntian1: 'Settle the fields and dig the canals - army and farmer both need them.',
  $m_shi__tuntian2: 'Farming is the root of victory.',
  $m_shi__xianshuai1: 'If I do not ease His Majesty\'s cares, who will?',
  $m_shi__xianshuai2: 'Your servant will lead the horse and foot, and march on Cao Wei.',
  $m_shi__zaoxian1: 'Press the advantage - one drumbeat, one charge.',
  $m_shi__zaoxian2: 'Shu is not yet broken - why should I fear for my life?',
  $m_yuan__wusheng1: 'Cut down the traitors, sworn to guard the Han!',
  $m_yuan__wusheng2: 'I do not love killing - I punish the unjust!',
  $m_yuan__wusheng3: 'A million rebels cannot stop one rider!',
  $m_yuan__wusheng4: 'Surrounded? All the better for my blade!',
  $m_yuan__yijue1: 'Gold cannot move my heart, nor rank turn my will!',
  $m_yuan__yijue2: 'What are worldly things beside the bond of brothers?',
  $m_yuan__yijue3: 'Today I spare your life, to repay a kindness long past.',
  $m_yuan__yijue4: 'I have read the Spring and Autumn - I know where righteousness lies.',
  $maodiey1: 'Ha! We shall turn Heaven and earth upside down!',
  $maodiey2: 'Steal Our honey? Then you have tired of living!',
  $maodiey3: 'By rights, one of your rank has no license to even breathe on Us!',
  $maodiey4: 'We are not yet in Our dotage - We do not blunder about!',
  $miaolue1: 'The wise bend with the moment and undo the danger at hand.',
  $miaolue2: 'Follow my plan, and this trouble is gone.',
  $mibei1: 'Prepare it in secret; nothing may slip.',
  $mibei2: 'Secrecy makes a plan; a loose word breaks it!',
  $miewu1: 'The tide has turned to ruin - Shicheng lies right before us',
  $miewu2: 'We split them like bamboo - the six commanderies of Jiangdong are ours for the taking.',
  $mingcha1: 'An enlightened lord is won by reason. How could you plead with him by feeling?',
  $mingcha2: 'The disaster is already in plain sight. How is it to be escaped?',
  $mingzhe_mobile__wangyuanji: 'Act modestly and carefully, and fortune comes, harm keeps away.',
  $mobile__baiyin1: 'The age of chaos is over; this old man will open an empire for ten thousand years!',
  $mobile__baiyin2: 'The light rises above the earth and shows forth Heaven\'s virtue - this is Jin!',
  $mobile__beini1: 'Let my name be soiled today; a new sovereign will praise it tomorrow.',
  $mobile__beini2: 'I serve the warm rising sun - why fear a setting moon\'s last light?',
  $mobile__biaozhao1: 'Sun Ce is the Xiang Yu of our age - give him his moment and he will turn!',
  $mobile__biaozhao2: 'Gong humbly submits this memorial, that my lord may see Sun Ce\'s treachery!',
  $mobile__biaozhao_message: 'Memorial',
  $mobile__bijing1: 'Bar Wu, seal the border - I swear to hold Yongchang!',
  $mobile__bijing2: 'A subject serves one lord - we can fight, we cannot surrender!',
  $mobile__chenjie1: 'The Emperor\'s death is my crime!',
  $mobile__chenjie2: 'A servant of Wei, I will never turn from Wei.',
  $mobile__chijie1: 'The imperial tally is here - no general is to advance rashly.',
  $mobile__chijie2: 'By the Son of Heaven\'s own edict, I set the six armies in order.',
  $mobile__choujue1: 'A sea of blood, and today it is repaid!',
  $mobile__choujue2: 'Your head - an offering to my father!',
  $mobile__dangyi1: 'Treason in the heart with no strength behind it - crushed as easily as turning a hand!',
  $mobile__dangyi2: 'The Sima realm has no room for men of divided heart!',
  $mobile__daoshu1: 'Hah! Only a letter - surely an old friend may look?',
  $mobile__daoshu2: 'Lucky I came prepared, or you would have made a fool of me.',
  $mobile__daoshu3: 'A lifetime\'s good name, and Zhou Yu played me for a fool!',
  $mobile__diancai1: 'Wealth belongs to the state, never to a man\'s own purse!',
  $mobile__diancai2: 'Spend for the state and the governing is clean - then the people follow!',
  $mobile__dianhua1: 'Marked by form, transformed by heart.',
  $mobile__dianhua2: 'I look up and down and sigh at heaven and earth, and pass away facing my own heart.',
  $mobile__diaodu1: 'Arms for the host, tools for siege and defence - all by proper order!',
  $mobile__diaodu2: 'Give each man his weapon, and hard lines break, strong foes fall!',
  $mobile__dingfa1: 'Raise the walls of rite and teaching; weigh guilt by the five degrees of mourning.',
  $mobile__dingfa2: 'Rite and law together - reward the good, condemn the wicked, govern with a light hand.',
  $mobile__falu1: 'I write the sacred registers, to carry on Huang-Lao.',
  $mobile__falu2: 'Turn nothing into something; let something carry nothing.',
  $mobile__fengji1: 'Survey the land for what it suits, and take every benefit the canals can give.',
  $mobile__fengji2: 'Care for the old, raise the orphans, treat the people as if wounded - so Xuzhou '
    + 'grows rich and settled.',
  $mobile__fenxin1: 'You. Give up the last of your worth!',
  $mobile__fenxin2: 'Count yourself lucky to be of use to me.',
  $mobile__fozong1: 'The Blessed One cut his flesh to feed a hawk; I give my body to ferry others across.',
  $mobile__fozong2: 'Do no evil. Practise every good.',
  $mobile__fozong3: 'Good and evil bring their own return; no one has ever borne another\'s.',
  $mobile__fozong4: 'Believe in my Dharma, and you shall see the Buddha.',
  $mobile__fozong5: 'Repent with a full heart, and ten thousand sins dissolve.',
  $mobile__fozong6: 'Free of desire, free of bonds - that is bliss.',
  $mobile__fuhaiw1: 'We rise and sink on the sea of office; life and death are past guessing!',
  $mobile__fuhaiw2: 'South across the sea we sail, and the waves rise and fall.',
  $mobile__fujian1: 'Set the sharpest minds to spying, and great things follow!',
  $mobile__fujian2: 'The five kinds of spy. I know them all, and I use them all.',
  $mobile__funan1: 'Thrust and answer both -- that is how gentlemen debate.',
  $mobile__funan2: 'Your words are fine, sir, but they contradict themselves. Allow me.',
  $mobile__geyuan1: 'The finer you cut it, the less is lost - until it cannot be cut at all.',
  $mobile__geyuan2: 'Circumference to diameter is an exact number, not the old rule of three to one.',
  $mobile__gongsun1: 'How should a man of great talent sit among mediocrities?',
  $mobile__gongsun2: 'A whole court of ministers, and half of them base-born nothings.',
  $mobile__guixiu1: 'Cornered though I am, I will hold myself with grace.',
  $mobile__guixiu2: 'War may take my body; it will not break my honour.',
  $mobile__hanzhan1: 'Bold of spirit, fierce of heart - I shall gladly match you!',
  $mobile__hanzhan2: 'Hah! One more bout, and we shall see who is the true overlord!',
  $mobile__huishi1: 'Keen of ear, I know what is far; clear of eye, I see what is small.',
  $mobile__huishi2: 'From the faint sign, the whole design; from a man, his mind.',
  $mobile__huxiao1: 'My blade wakes the wind - a tiger comes down the mountain!',
  $mobile__huxiao2: 'The blade-light is cold, and the tiger roars!',
  $mobile__jianji1: 'Force will not win today; we must take it by scheme.',
  $mobile__jianji2: 'Liu Bei is easy prey, but Lü Bu may save him - so sow discord first.',
  $mobile__jianji3: 'Take Liu Bei first, then Lü Bu, and Xuzhou is ours.',
  $mobile__jiaohua1: 'Teach the people and raise them by culture, and the southern march is settled.',
  $mobile__jiaohua2: 'Let them know the rites and honour the king\'s way, and they will rebel no more.',
  $mobile__jiexun1: 'My lord, the traitor Yuan will fall to Wei regardless. Why tire an army on him?',
  $mobile__jiexun2: 'Act this way now, and the gain will not repay the cost!',
  $mobile__jieyu1: 'I serve my lord - Jun will not fail the charge laid on him!',
  $mobile__jieyu2: 'You may take my head. You will never take this city!',
  $mobile__jieyuan1: 'What binds you and me was always a sin.',
  $mobile__jieyuan2: 'It is time. Time to end this.',
  $mobile__jilue1: 'Three kingdoms made one - the realm united!',
  $mobile__jilue2: 'All power in a single hand - court and country at peace!',
  $mobile__jimeng1: 'Wei swallows all before it - only an alliance can hold it.',
  $mobile__jimeng2: 'Our lord is young; let me go and mend things with Wu.',
  $mobile__jincui1: 'Hard as the march on Wei may be, your servant will gladly die at its head!',
  $mobile__jincui2: 'I will spend every sinew, and lead Your Majesty\'s van to the death!',
  $mobile__jingong1: 'No mercy for the chief offender, and little enough for the rest.',
  $mobile__jingong2: 'By my own strength alone I strike the traitors and set the state right.',
  $mobile__jintao1: 'I lead the troops out - I will not fail the Chancellor!',
  $mobile__jintao2: 'Raise the army and march - let the northern campaign win glory!',
  $mobile__juexiang1: 'One last Guangling melody, and I leave this world of dust.',
  $mobile__juexiang2: 'The ancient music of the qin falls silent with me!',
  $mobile__jujun: 'Ten thousand arrows fall - how will they ever climb this mountain!',
  $mobile__kuangcai1: 'All the past and all the present, plucked at will.',
  $mobile__kuangcai2: 'Fame is dust. Time is gold.',
  $mobile__kuangxiang1: 'Our houses are old friends in Yizhou - how could I let his grandsons come to harm?',
  $mobile__kuangxiang2: 'To right one\'s lord and aid the state is a man\'s charge.',
  $mobile__kuangxiang3: 'In the campaign against Zhang Lu, I can lend my lord my strength.',
  $mobile__lianji1: 'The plan runs tight; nothing will slip.',
  $mobile__lianji2: 'Two peaches once killed three warriors; two schemes now kill the tiger and the wolf.',
  $mobile__lianpo1: 'Fight if you can fight; if you cannot, then die!',
  $mobile__lianpo2: 'Take city after city and raise a mound of the slain - Liaodong will trouble us no more.',
  $mobile__lianzhu1: 'Name your accomplices now, and you may yet escape death!',
  $mobile__lianzhu2: 'This traitor\'s crime is rebellion - every one of you shares the guilt!',
  $mobile__liechi1: 'Dogs of Wu! Do you dare face me?',
  $mobile__liechi2: 'Get out, before you die on my blade for nothing!',
  $mobile__lingren1: 'The old general\'s tiger might holds still. A pity his days are short.',
  $mobile__lingren2: 'This mountain is surrounded. Surrender and you may yet die in peace!',
  $mobile__lirang1: 'Where a man goes, courtesy goes with him.',
  $mobile__lirang2: 'Give courtesy, and virtue comes back to you.',
  $mobile__meibu1: 'Leaning on the rail to watch the painted boats, green leaves scenting a thousand miles.',
  $mobile__meibu2: 'Orioles dance on the bough; on a festival day, let the fighting stop.',
  $mobile__mingfa1: 'Tomorrow we meet them in battle. Be ready early, all of you.',
  $mobile__mingfa2: 'I strike in the open. I do not plot ambushes.',
  $mobile__mingshi1: 'Power may stand at my shoulder. I will not lose my backbone.',
  $mobile__mingshi2: 'Cast down the crooked, raise up the true. What is there to fear?',
  $mobile__moucheng1: 'Dong the traitor is dead - the realm should thank me for it.',
  $mobile__moucheng2: 'Dong is dead; Li and Guo must answer next.',
  $mobile__mumu1: 'A quarrel over the heir throws today into chaos and curses a thousand years!',
  $mobile__mumu2: 'At the solstice, at the turn of the year, arms must not be raised lightly.',
  $mobile__mutao1: 'We raise this army for one thing - to make the realm clean again!',
  $mobile__mutao2: 'While the traitor Dong lives, how can Han ever rise?',
  $mobile__natu_fu1: 'Only when the people live in comfort will our homeland know peace.',
  $mobile__natu_fu2: 'For your peace, my dears, I would spend all my life.',
  $mobile__natu_heng1: 'A life given to the Han, a heart given to my lord.',
  $mobile__natu_heng2: 'Ten thousand perils and a thousand hardships - this heart will not change!',
  $mobile__natu_lie1: 'A word of advice, folks - you had best step aside.',
  $mobile__natu_lie2: 'Want to beat me? Then come at me all at once, folks.',
  $mobile__natu_xing1: 'Every plan I lay is for a better tomorrow.',
  $mobile__natu_xing2: 'For the restoration of Han, for all Nine Provinces.',
  $mobile__natu_yi1: 'In our homeland, honour has always come first.',
  $mobile__natu_yi2: 'May this great honour endure a thousand ages.',
  $mobile__niluan1: 'Either you die, or I do!',
  $mobile__niluan2: 'No road back. Only the fight!',
  $mobile__qianlong1: 'I gather loyal men in secret, and wait for the moment to break the board!',
  $mobile__qianlong2: 'Post the Simas to the frontier, and the throne may yet take back its power!',
  $mobile__qianlong3: 'I am the Son of Heaven! How can I watch my authority bleed away!',
  $mobile__qianlong4: 'Given time, I will bring down the whole Sima clan!',
  $mobile__qianlong5: 'The minister overshadows his lord, and treats the Son of Heaven as nothing!',
  $mobile__qianlong6: 'My mind is set! What is death to me?',
  $mobile__qiantun1: 'The realm is unsettled. I decline the fief and mend myself - how would I dare overreach?',
  $mobile__qiantun2: 'Command of the court, awe across the seas - all of it is His Majesty\'s grace!',
  $mobile__qiantun3: 'The whole court is loyal to the Son of Heaven. Where is the traitor here?',
  $mobile__qiantun4: 'Nine times I refused the honours - proof enough of your servant\'s loyal heart.',
  $mobile__qianxinz1: 'The men are trapped in a hopeless land - and march on as if going home!',
  $mobile__qianxinz2: 'The hour is desperate - reinforcements, at once!',
  $mobile__qingxian1: 'To play the qin is to know oneself; to hear it is to see the player.',
  $mobile__qingxian2: 'The strings hold their own wonder - the vulgar cannot hear it.',
  $mobile__renjie1: 'Matters great and small at court are for the Grand Marshal to decide.',
  $mobile__renjie2: 'In council this old man follows the Grand Marshal\'s lead.',
  $mobile__runwei1: 'Slight as I am, I can still keep his brothers and sisters from harm.',
  $mobile__runwei2: 'My strength is small, but enough to carry a household on one shoulder.',
  $mobile__runwei3: 'You are still in straits - how could I stop halfway?',
  $mobile__runwei4: 'To give up something is to gain something. That is simply the way of things.',
  $mobile__sanchen1: 'The rebels are out of schemes; array the troops on Wu\'s soil and take it in one drumbeat.',
  $mobile__sanchen2: 'Nine advantages in ten to striking Wu - may Your Majesty see it.',
  $mobile__saojian1: 'I hold the Director\'s seal now. How could that crowd be suffered!',
  $mobile__saojian2: 'The court crawls with vermin. How can we govern? Burn them out!',
  $mobile__saojian3: 'Alas, once the crooked road is opened, it is never fully closed!',
  $mobile__shajue1: 'Surrendering now? That is a little late.',
  $mobile__shajue2: 'Whoever stands against us - leave not one of them alive.',
  $mobile__shangyi1: 'A man of the realm puts honour first!',
  $mobile__shangyi2: 'A knight honours righteousness - why bow to common manners?',
  $mobile__shanxi: 'Flash Raid',
  $mobile__shanxi1: 'Advance, never retreat - rout them and take the field!',
  $mobile__shanxi2: 'Break the rebels quickly - give them no ground to hold!',
  $mobile__shejian1: 'You little men are not fit company!',
  $mobile__shejian2: 'Wash out your ears, sir, and hear me.',
  $mobile__shiju1: 'Every bolt of silk in my house I write on first, and bleach afterwards.',
  $mobile__shiju2: 'I studied writing beside the pond until its water ran black with ink.',
  $mobile__shiju3: 'Sitting, I forget the world\'s harness, and brush and spirit meet.',
  $mobile__shuaiyan1: 'No sky holds two suns; no man serves two lords.',
  $mobile__shuaiyan2: 'I speak for Wu\'s sake as much as for Shu\'s.',
  $mobile__shushen1: 'This is the very omen of a state\'s fall. Does my lord not see it?',
  $mobile__shushen2: 'A wife should think ahead for her husband.',
  $mobile__sidai1: 'Their strength is spent - now it is our turn to strike!',
  $mobile__sidai2: 'The enemy is weary. Press the advantage!',
  $mobile__songshu1: 'Praise the governance of Shu, and their doubts will fall away.',
  $mobile__songshu2: 'In Shu the lord is wise and the people glad - that is what peacetime rule looks like.',
  $mobile__tianshu1: 'Deep in desire, shallow in the workings of Heaven.',
  $mobile__tianshu2: 'What slays the living does not die; what gives life to life is never born.',
  $mobile__tianyi1: 'Heaven\'s mandate is not constant - it aids virtue alone.',
  $mobile__tianyi2: 'The man who can fulfil my ambition - it is surely he!',
  $mobile__tongdu1: 'Moving the supply trains is a matter of state - no game for children!',
  $mobile__tongdu2: 'The treasuries are full, the people have savings - my lord marches with just cause.',
  $mobile__tongji1: 'Ngh - treason! Treason! Treason!',
  $mobile__tongji2: 'You affront Heaven\'s majesty - rank treason!',
  $mobile__wangliec1: 'A great general wins today\'s merit without effacing the valour of old.',
  $mobile__wangliec2: 'One man an army - thunder upon thunder, dark and rolling, and the realm takes fright.',
  $mobile__wangzun1: 'The Imperial Seal belongs to the ablest, naturally.',
  $mobile__wangzun2: 'I am the Emperor! I am Heaven itself!',
  $mobile__wangzun_m_ex__yuanshu1: 'Four generations of ministers? I am the Supreme Sovereign!',
  $mobile__wangzun_m_ex__yuanshu2: 'All who follow me are founding heroes of my dynasty!',
  $mobile__wanwei1: 'It has come to this; now think of what comes after.',
  $mobile__wanwei2: 'Rest and recover - the realm can still be won slowly.',
  $mobile__weisi: 'Unbridled Might',
  $mobile__weisi1: 'The day the walls fall, three generations of this traitor die!',
  $mobile__weisi2: 'Huainan pacified - the house of Sima wins glory beyond the age once more!',
  $mobile__weisi3: 'All my generals took in quelling this revolt is His Majesty\'s gift!',
  $mobile__wuji1: 'My father\'s art, my brother\'s art - I have mastered them all!',
  $mobile__wuji2: 'Blade, take the field at my side!',
  $mobile__xiaoxi1: 'Let me see you dodge this!',
  $mobile__xiaoxi2: 'Die, you little thief!',
  $mobile__xiezheng1: 'Let Your Majesty ride against the rebels yourself, and show the throne\'s might!',
  $mobile__xiezheng2: 'With the Son of Heaven at the front, Huainan will be quiet within days!',
  $mobile__xiezheng_mobile2__simazhao1: 'All power rests in my hand now - why would I hand it to another?',
  $mobile__xiezheng_mobile2__simazhao2: 'I hold the three armies in the field - His Majesty will not take the court back!',
  $mobile__xionghuo1: 'A coward on the battlefield never ends well!',
  $mobile__xionghuo2: 'Crush the enemy - in the cruellest way there is!',
  $mobile__xuehen1: 'For country and kin - no mountain, no river, no thorn will stop me!',
  $mobile__xuehen2: 'Rouge on my cheek, gold at my brow, and still I ride to war!',
  $mobile__xuewei1: 'You will not come near my lord!',
  $mobile__xuewei2: 'Even at the cost of my life, I will take a few more with me!',
  $mobile__xunjie1: 'What the heart holds is all love; what the body shows is all respect.',
  $mobile__xunjie2: 'Cultivate yourself as you would sheathe a tool: the greatest craft looks like none at all.',
  $mobile__xushen1: 'We met here, you and I - let us cherish each other.',
  $mobile__xushen2: 'Take my hand, and we will brave the ends of the world together.',
  $mobile__yanjiao1: 'Until this passage is learned, Hui, there will be no playing.',
  $mobile__yanjiao2: 'Your mother is strict, but all of it is for your good.',
  $mobile__yilie1: 'Even beasts know what is right - how much more a man?',
  $mobile__yilie2: 'Ban is a nobody, but the loyalty is in his bones!',
  $mobile__yilie3: 'I do not cling to life - let my death weigh as Mount Tai!',
  $mobile__yimou1: 'Stand calm and steady, and the enemy breaks himself!',
  $mobile__yimou2: 'For the great cause we lay great plans and do great deeds!',
  $mobile__yingbing1: 'Vermilion Bird, Black Tortoise -- march at my word!',
  $mobile__yingbing2: 'What I call comes; what I summon stands before me!',
  $mobile__yinju1: 'To strike Wu is to raise armies, exhaust the people, and gain nothing. I beg Your '
    + 'Majesty, think again!',
  $mobile__yinju2: 'Now is the time to farm the garrisons and rest the troops, and take Wu and Shu '
    + 'slowly. Why rush headlong?',
  $mobile__yizheng1: 'One seizes the Emperor, one takes the ministers hostage - can this stand?',
  $mobile__yizheng2: 'If the armies rise, let them follow Heaven\'s heart - why must it be like this!',
  $mobile__yuanmo1: 'Sun Ce holds the Yangtze, well armed and well fed. Not yet.',
  $mobile__yuanmo2: 'Strike Liu Bei first; Sun Ce can wait.',
  $mobile__yuanmo3: 'I offer one plan that takes Liu Bei this very day.',
  $mobile__yuejian1: 'Thrift in the palace builds virtue beyond its walls.',
  $mobile__yuejian2: 'What you save is worth no less than what you gain.',
  $mobile__yufeng1: 'Fling wide the gates of heaven - I ride out upon the dark clouds.',
  $mobile__yufeng2: 'High I fly and calmly soar, riding pure air, reining yin and yang.',
  $mobile__zengou1: 'You wronged me first - do not blame my cruelty now.',
  $mobile__zengou2: 'With this in my hand, you have a mouth and nothing to say.',
  $mobile__zengou3: 'Hmph! Only this will wash away the shame I bore.',
  $mobile__zhaoxiong1: 'In name the realm belongs to Cao; in truth, to the house of Sima!',
  $mobile__zhaoxiong2: 'The Emperor is guilty. I will judge him, and answer to the realm!',
  $mobile__zhenfeng1: 'Whoever has the courage, follow me into battle!',
  $mobile__zhenfeng2: 'Let me rally my horse and foot - the day is not decided yet!',
  $mobile__zhenfeng3: 'Last time settled nothing. This time we fight to the death!',
  $mobile__zhenfeng4: 'Heaven aids the righteous; the hero waits, and wins!',
  $mobile__zhennan1: 'I will not let you stir up storms again!',
  $mobile__zhennan2: 'My husband and I guard Nanzhong together!',
  $mobile__zhenyi1: 'The way of man is ever changing; the way of heaven holds constant.',
  $mobile__zhenyi2: 'Understand the Great Way, and the true form shows itself.',
  $mobile__zhoufu1: 'Defy my curse, and fall to ruin and death!',
  $mobile__zhoufu2: 'Charm and talisman, show your power now!',
  $mobile__zhouxuanz1: 'Which is the tiger? Which the hawk? To me they are all pieces on a board.',
  $mobile__zhouxuanz2: 'While the warlords chase the deer, only he who reads the times comes through.',
  $mobile__zishu1: 'My mind is made up. Why do my brothers say more?',
  $mobile__zishu2: 'If this errand fails, I would rather die for the cause.',
  $mobile_dongjiao__weizhuang1: 'It was mine by right. Who spoke of a gift?',
  $mobile_dongjiao__weizhuang2: 'I have borne this wrong so long - how will my lord make amends?',
  $mobile_dongjiao__weizhuang3: 'This maid slights her mistress. What should her punishment be?',
  $mobile_dongjiao__weizhuang4: 'This robe belongs to a consort. How dare a servant dress above her station?',
  $mobile_dongjiao__weizhuang5: 'Sinking fish and falling geese cannot compare - such beauty was born first in the world.',
  $mobile_dongjiao__weizhuang6: 'I never asked to be beautiful, yet heaven\'s favour cannot be refused.',
  $mobile_qianlong__fangzhu1: 'You owe me your utmost loyalty - what is this overstepping!',
  $mobile_qianlong__fangzhu2: 'I inherit Emperor Wen\'s grace, and I shall match his cunning too!',
  $mobile_qianlong__jiushi1: 'Rage with nowhere to go - so my brush turns it into verse.',
  $mobile_qianlong__jiushi2: 'Drown the sorrow in wine; it comes looking for me when I wake.',
  $mobile_qianlong__qingzheng1: 'Unworthy as I am, blind to the great Way, I would walk it with all under heaven.',
  $mobile_qianlong__qingzheng2: 'I will heed those who came before, and be a bright and worthy emperor.',
  $mobile_xiuge__weizhuang1: 'Hmph. Maids and concubines - hardly fit to be measured against me.',
  $mobile_xiuge__weizhuang2: 'Even if I could part with it, could my lord?',
  $mobile_xiuge__weizhuang3: 'A face like spring peach still needs fine silk to set it off.',
  $mobile_xiuge__weizhuang4: 'So lovely a view deserves a small cup of wine.',
  $mobile_xiuge__weizhuang5: 'My lord\'s own choosing - stately beyond compare, naturally.',
  $mobile_xiuge__weizhuang6: 'Does my beauty please my lord\'s eye?',
  $moucuan1: 'The Han has lost the people. Heaven grants us our moment!',
  $moucuan2: 'The rightful lord of the realm is the Great Teacher himself!',
  $mouli1: 'Cleanse the royal house, and set a true son of the line upon the throne!',
  $mouli2: 'Usurpers work their harm - shall I scheme and never act?',
  $mutao: 'Muster and March',
  $muzhen1: 'When the ranks are in harmony, every man finds his place.',
  $muzhen2: 'Know the hour and the task, and high and low are at peace.',
  $mxing__zhiyan1: 'Govern the army strictly, and only then will you have elite troops.',
  $mxing__zhiyan2: 'Elite soldiers hold themselves to the strictest rule and keep themselves in hand.',
  $naxue1: 'You are young yet. Do not waste these good years of study.',
  $naxue2: 'This old man has ten thousand scrolls - let every student read them.',
  $nigu1: 'If you lords will not serve me, then you have already turned traitor!',
  $nigu2: 'This is the hour to fight to the death - why do you hesitate!',
  $nigu3: 'If the Son of Heaven harbours other thoughts, I shall make other plans!',
  $nigu4: 'If my orders will not be obeyed, then my punishments will be!',
  $nos__cunsi1: 'Life and death hang on this hour, General - do not hesitate.',
  $nos__cunsi2: 'To save the heir of Han, I give my life!',
  $nos__faen_m_ex__chenqun1: 'What the law cannot forgive, mercy sometimes can.',
  $nos__faen_m_ex__chenqun2: 'Harsh law and heavy punishment - I beg you, tread carefully.',
  $nos__guixiu1: 'Though I sit secluded in my chamber, I still know what is right.',
  $nos__guixiu2: 'By night I lean on the moon at my window, and pity my own shadow.',
  $ol__buqu_m_ex__zhoutai1: 'A body forged in battle does not fall.',
  $ol__buqu_m_ex__zhoutai2: 'Do not think you are getting past me.',
  $ol_ex__kuanggu_m_ex__weiyan1: 'Wild bones stand alone - why keep company with anyone?',
  $ol_ex__kuanggu_m_ex__weiyan2: 'For Hanzhong, I alone am enough.',
  $os__duoduan_mobile__yangyi1: 'Read the moment, lay the plan, cut through to victory.',
  $os__duoduan_mobile__yangyi2: 'Meet the enemy with thought first; set the plan, then move.',
  $os__shengxi_mobile__feiyi1: 'I carry Lord Zhuge\'s charge: enrich the state, settle the people.',
  $os__shengxi_mobile__feiyi2: 'Guard the state, govern the people, keep the altars with reverence.',
  $os__zhian_m_sp__caocao1: 'You nobles take bribes and bend the law - you will not get off lightly!',
  $os__zhian_m_sp__caocao2: 'Defy the law and it is the rod for you, high born or low!',
  $os_ex__paoxiao_m_ex__zhangfei1: 'Through a million men, watch me take their commander\'s head.',
  $os_ex__paoxiao_m_ex__zhangfei2: 'The Serpent Spear is in my hand - are you afraid yet?',
  $pangtong__gongli1: 'We share one ambition - let us sharpen each other and press on.',
  $pangtong__gongli2: 'Three minds as one, and all things may be hoped for.',
  $panxiang1: 'Your Highness must put the state first - why play the common man\'s filial son?',
  $panxiang2: 'My lords, hail the heir and steady the realm. Will you only weep?',
  $panxiang3: 'Entrusted with an orphaned throne, and you sit at idle talk? Is that fitting?',
  $panxiang4: 'This old servant takes command, and will hold Wu and Shu beyond our borders.',
  $peidong1: 'The Fusang tree rises where the stream of the morning sun runs.',
  $peidong2: 'Its crown climbs the blue sky, its leaves spread to the world\'s end.',
  $peidong3: 'At dawn the sun climbs its eastern bough; at dusk it sinks in the western.',
  $peidong4: 'Would I could rein the sun and send it racing east again.',
  $pingcai1: 'I have my friends: Sleeping Dragon, Fledgling Phoenix, Water Mirror, and Yuanzhi.',
  $pingcai2: 'Kongming can borrow the force of heaven\'s fire.',
  $pingcai3: 'Shiyuan\'s schemes lock link into link.',
  $pingcai4: 'Decao knows deeply the way of living in this world.',
  $pingcai5: 'Yuanzhi the knight-errant punishes evil and upholds good.',
  $pinghe1: 'Craven rats, the lot of them. What is there to fear?',
  $pinghe2: 'We come back in victory, or we do not come back!',
  $pingtao_m_js__sunjian1: 'Dong Zhuo is on the brink - why do you all hold back?',
  $pingtao_m_js__sunjian2: 'Blood on our lips, we swear to kill this traitor to the realm!',
  $polu1: 'Raise these stone-throwers, and Yuan\'s high towers will fall.',
  $polu2: 'A crack of thunder, and the enemy\'s courage is gone.',
  $polus: 'Cut them down, take back the city, and let Jiangdong\'s banners be feared!',
  $powei1: 'Hold the city, my lord. I will go and take the enemy\'s measure.',
  $powei2: 'Bow and horse and hot blood -- I break their ring and prove myself!',
  $powei3: 'Their guard is still tight. We look again tomorrow!',
  $poxiang1: 'Wang Guan\'s surrender is a feint. Let us turn his own plan on him.',
  $poxiang2: 'With two thousand surrendered Wei troops, Qian can shatter their main force.',
  $qianchong1: 'I plan each small step, hoping only to lend my husband a hand.',
  $qiangyong1: 'Zhuge, you brat - yield the pass and surrender at once.',
  $qiangyong2: 'To think the old veterans of Xiliang are now the dogs of Shu.',
  $qiangyong3: 'Today I swear to break Xiping Pass and show the might of the Qiang!',
  $qiangyong4: 'My iron chariots are unmatched - why fear the boys of Shu?',
  $qiaomeng_m_ex__gongsunzan1: 'Take their blades and their horses, and their defeat is certain.',
  $qiaomeng_m_ex__gongsunzan2: 'Break the enemy like a dry branch, sweep the bandits with a turn of the hand.',
  $qiaosi1: 'Let me think a while, and make it cleverer still.',
  $qiaosi2: 'Better to think it through and test it than to argue over empty words.',
  $qice_m_shi__huanjie1: 'Without some clever stratagem, how is this to be solved?',
  $qice_m_shi__huanjie2: 'Our one recourse now is the way of the old prophetic charts.',
  $qihui1: 'Heaven is high and far. Not every matter can be settled from below.',
  $qihui2: 'We answer heaven\'s will above and save the common folk below.',
  $qihui3: 'Rid us of grasping officials, and the realm cleans itself.',
  $qingdao1: 'Deceive not your sovereign, oppress not the people -- that is the way of an official.',
  $qingdao2: 'Three things make an official: purity, prudence, diligence.',
  $qingjue1: 'Arms are ill-omened tools - use them only when you must.',
  $qingjue2: 'People cling to their land: lead them with the grain, never against it.',
  $qingjue3: 'Move them with virtue, summon them with benevolence - only then do you win their hearts.',
  $qingshix1: 'Zhong Hui is reckless in all he does - no way to endure long beneath another.',
  $qingshix2: 'Clever and unrestrained - I fear he has other ambitions.',
  $qingyu1: 'The bearing of a great house must not be lost.',
  $qingyu2: 'The vermilion sinks, the jade is lost; the cassia falls, the orchid withers.',
  $qingyu3: 'Clear as ice, pure as jade - how could it ever be stained?',
  $qinyin_m_liuyi__zhouyu1: 'The open notes run deep, like pine roots coiled in a ravine.',
  $qinyin_m_liuyi__zhouyu2: 'The harmonics ring clear, like river water past the sandbar.',
  $qinying1: 'Destitute, I serve no doomed state; poor, I take no corrupt lord\'s pay.',
  $qinying2: 'Taigong waited till seventy; Sun Shuao lost his post thrice without regret.',
  $qinying3: 'He who knows fate waits his hour. Who says the age has no heroes?',
  $qinying4: 'No enlightened lord has found me yet, so I keep to the Way and wait.',
  $qinzheng1: 'A state has its people as water has a boat: still, it carries; stirred, it drowns.',
  $qinzheng2: 'Treat the illness before it deepens; root out the trouble before it takes hold.',
  $qirang1: 'My mother\'s wit, my father\'s arts - I pray now by the Seven Stars.',
  $qirang2: 'The immortal armour has come. Can the immortal arts be far behind?',
  $qishe1: 'The bait is taken - now nock the arrow!',
  $qishe2: 'Guan Yu is on the drawbridge and my string is drawn - what do I do?',
  $qixi_mobile__heqi: 'Ride in close, draw the blade, and strike them unready!',
  $quanchong1: 'While I stand in this court, you will never rise again.',
  $quanchong2: 'Insolent Pang Hong! You dare look down on me?',
  $quanchong3: 'Such a trifle. Why trouble His Majesty with it?',
  $quanchong4: 'His Majesty\'s favour is boundless; I think only of repaying it.',
  $quanfeng1: 'Yuanrong\'s virtue was noble. She should be given her title.',
  $quanfeng2: 'Only the name Jinghuai is worthy of what she was.',
  $quchong1: 'The engine holds nine defences ready, and nine assaults to shift among.',
  $quchong2: 'Every turn a siege can take, this carriage answers!',
  $quchong3: 'The great assault begins - it will cleave mountain and sea!',
  $quchong4: 'Break the strong like rotten wood; walk the high walls like level ground.',
  $quedi1: 'I shatter their lines like sunlight breaking through cloud!',
  $quedi2: 'You have the lives to chase me - not the lives to return!',
  $quesong1: 'By the white sparrow\'s omen, the virtue of the Duke of Zhou is shown.',
  $quesong2: 'Pull the House of Han back from ruin, and carry on Guangwu\'s restoration.',
  $quhu_m_ex__xunyu1: 'Drive the tiger at the enemy, and we come to no harm.',
  $quhu_m_ex__xunyu2: 'Not one soldier of mine need be spent.',
  $qusheng1: 'Today I ride out to meet them - let Shu learn what my iron chariots can do.',
  $qusheng2: 'With these chariots I will crush you children.',
  $rangjie1: 'You hold the power already - why throw lord and court into chaos?',
  $rangjie2: 'Your power sways the whole court, yet still you must honour His Majesty\'s will.',
  $re__zishou_m_ex__liubiao1: 'Bide the time, wait the moment, and take the spoils at leisure!',
  $re__zishou_m_ex__liubiao2: 'Hold the troops still, and take Jing and Xiang at my own pace!',
  $renshi1: 'A woman in a broken age can only drift like dust.',
  $renshi2: 'I beg you - stay your hand!',
  $renshih1: 'Since I serve great Wei, I will act with a gentleman\'s benevolence.',
  $renshih2: 'A gentleman takes office for one thing only - to practise benevolence.',
  $renxing1: 'I am the Son of Heaven\'s own man - I act on his command alone.',
  $renxing2: 'His Majesty\'s word is gold and jade. How could it err?',
  $rongbei1: 'We win the people by virtue, but we do not let our arms rust.',
  $rongbei2: 'Mend the armor, drill the men, arm broadly, and do not miss the hour to strike Wu.',
  $ruilian1: 'Push forward with worthless men, my lord, and you will lose the people!',
  $ruilian2: 'Curb the show of empty ambition abroad, and cut the policies that ruin the people at home.',
  $ruoyu_m_ex__liushan1: 'Only by wearing the name of a fool of a king can I keep Shu\'s people safe.',
  $ruoyu_m_ex__liushan2: 'With no talent to contend for the realm, I will settle for keeping it.',
  $shameng1: 'Untalented as I am, I come as envoy, to bind our two states in friendship.',
  $shameng2: 'I come bearing gifts of goodwill; if I breach your state\'s customs, pray tell me.',
  $shangjian1: 'In such troubled times we must hold to thrift.',
  $shangjian2: 'While the people go cold and hungry, we must not squander.',
  $shanjia1: 'Mend the armour, whet the blades, and wait for the moment.',
  $shanjia2: 'In war, take the finest troops and cast off the dull ones.',
  $shanxie1: 'Quick, my weapon! I am going out to kill!',
  $shanxie2: 'Haha! Nothing beats your own weapon in your own hand!',
  $shenpeij1: 'I have crossed every peak and gorge - trust that after the cold comes spring.',
  $shenpeij2: 'The world waits on rain-clouds, and heaven itself shall grant them!',
  $shenzhuo1: 'A hundred catties of bowstring drawn - the shaft goes through his hand and into the beam!',
  $shenzhuo2: 'The arrow is already on the string - how can I not loose it?',
  $shepan1: 'The bandits come on. Loose every crossbow and break their charge!',
  $shepan2: 'The rebels would sally out. Set the ambush and kill their will to fight.',
  $sheque1: 'Watch this arrow take the fool who rowed too far ahead!',
  $sheque2: 'Stout armour, good shields - none of it stops my shot!',
  $sheyi1: 'I cannot save both sons. I can keep only one.',
  $sheyi2: 'Let my own child go if I must - the one entrusted to me must not be lost.',
  $shezi1: 'Become a part of me!',
  $shezi2: 'Everything turns around me!',
  $shibei_m_ex__jvshou1: 'Here stands a man who will die for it - never one who bows to Cao!',
  $shibei_m_ex__jvshou2: 'My heart is with the Yuans, and there is no turning from it!',
  $shidi1: 'Feign the rout, then shoot - he is a dead man!',
  $shidi2: 'Agh - his drag-blade trick has taken me!',
  $shihe1: 'Fortune or ruin hangs on this - look closely, King Qiao!',
  $shihe2: 'Han is the celestial realm - what is a Liaodong backwater beside it?',
  $shiji1: 'They camp among the dry grass - the gravest blunder in war!',
  $shiji2: 'The art of war speaks of fire, and the hour is now!',
  $shishoul1: 'This is the Son of Heaven\'s carriage - who dares come near!',
  $shishoul2: 'We stand guard at his side. His Majesty will come to no harm!',
  $shishu1: 'Circumstance forced my hand - I had no other road.',
  $shishu2: 'I once learned from noble men; may my lord strive as they did.',
  $shitao__gongli1: 'The realm has lost its Way. Will you join me and set it right?',
  $shitao__gongli2: 'Our minds are one - why not walk the same road?',
  $shixin1: 'Let the rancour go, and I will melt your displeasure away.',
  $shixin2: 'A spark that small - how could it harm me?',
  $shizhong1: 'I lead this host myself, and today I swear the city falls.',
  $shizhong2: 'Many against few - how could we fail to take it?',
  $shizhong3: 'My army is at your walls. There is nothing left for you but death.',
  $shoufa1: 'Vipers and scorpions, go forth at my word!',
  $shoufa2: 'Tigers and leopards, jackals and wolves - all obey me!',
  $shouye1: 'Their assault is flagging - hold to the plan, all of you.',
  $shouye2: 'Yuan of Youzhou arrives within days; earn merit by the plan and repay him.',
  $shouyuez1: 'Sound holds no grief or joy, music no high or low - it carries only the heart.',
  $shouyuez2: 'Hear it and forget your cares, practise it and nourish your nature - a treasure for '
    + 'the cultivated self.',
  $shuanghuai1: 'A woman keeps her honour: sooner the orchid broken and the jade snapped than a '
    + 'promise betrayed.',
  $shuanghuai2: 'Humility is the handle of virtue; compliance, the conduct of a wife.',
  $shuanghuai3: 'Yan Hui was prized for mending his faults, and Confucius praised him for never '
    + 'repeating them - shall a woman do less?',
  $shuchen1: 'Your Majesty should first attend to the way of governance, and leave conquest for later.',
  $shuchen2: 'If Your Majesty cultivates virtue and heeds the people\'s suffering, the realm is blessed.',
  $shuliang1: 'The general has ridden hard - wine and meat to comfort him.',
  $shuliang2: 'General, the cards have arrived.',
  $shunyi: 'Heaven\'s Ease',
  $shunyi1: 'Does the general not know? Follow heaven and be at ease; defy it and toil.',
  $shunyi2: 'I am a rustic of the hills - hardly fit to debate the realm with a general.',
  $shuxing1: 'Unseen and unheard - how can a man be condemned on guesswork?',
  $shuxing2: 'A woman\'s affection is born of meeting, and her duty deepens once she is a wife.',
  $shuyong1: 'My skill came straight from General Guan himself!',
  $shuyong2: 'See how you like this one!',
  $sifeng: 'Blade Watch',
  $sifeng1: 'Let every road hold firm; the Shu army will tire and withdraw on its own.',
  $sifeng2: 'We outnumber the rebels ten to one. What is there to fear?',
  $sifeng3: 'Hmph! So much for the army of Shu.',
  $sifeng4: 'Shu always plays this trick - it will not fool me twice.',
  $sifeng5: 'Cut the grain on the Long heights - leave nothing for Shu to gather.',
  $sifeng6: 'Their line is broken and scattered - now we give chase.',
  $sizi1: 'Han Xin slipped through Chencang, and the Three Qin were his.',
  $sizi2: 'A hundred thousand at my back - why fear the roads of Shu?',
  $sizi3: 'Virtue plain, merit shown - why blush to take it?',
  $sizi4: 'The Duke of Jin already doubts me. We must decide, and soon.',
  $sizi5: 'I swallowed shame and carried the weight - all for this day, and the throne.',
  $sizi6: 'Fear nothing in the realm, my lord - fear only Ji Kang.',
  $sizi7: 'You bade me ride at your side. Why cast me off now?',
  $songwei_m_ex__caopi1: 'A wall around the great house, to turn back insult and quell disorder.',
  $songwei_m_ex__caopi2: 'I hold the mandate\'s token; the change of destiny falls to me at last.',
  $suwang: 'Long Renown',
  $suwang1: 'With the state well ruled and its officers at peace, the people turn to virtue of '
    + 'themselves.',
  $suwang2: 'He who stands above others should be one who soothes and wins hearts.',
  $tamo1: 'The realm is torn to its very limit. Let Su offer my lord what poor counsel he has.',
  $tamo2: 'The realm will change hands - hold this ground, my lord, and wait for the hour.',
  $tanfeng1: 'Find where their guard is thin, and take them while they are unready.',
  $tanfeng2: 'Keep the probing edge sharp, and wait for the hour to advance.',
  $taoluanh1: 'Rebels are savage - only force will bend them!',
  $taoluanh2: 'To break the Yellow Turbans, trust in sharpened steel!',
  $taomie1: 'Cross into Liaodong, and payment will follow!',
  $taomie2: 'The Han and Hui revolt ends here - not a breath of life left in it!',
  $taomie3: 'Your head has ten thousand li to travel. What use have you for a seat?',
  $tiansuan1: 'You drew the lot and asked the question - now accept what heaven grants.',
  $tiansuan2: 'Walk upright in the Way, and heaven will grant you fortune and long years.',
  $tiantao1: 'With the water of the vault of heaven, I wash every stain away!',
  $tiantao2: 'How can a foul heart bear the cleanness of a divine rain?',
  $tianyin1: 'A clear body, a distant heart at the qin - only then does nature sing.',
  $tianyin2: 'Keep the heart upright, and heaven\'s music comes of itself.',
  $tianzuo1: 'To advance now costs much and gains little - hold, my lord, and consider well.',
  $tianzuo2: 'If my lord does not settle it soon, the whole realm will stir, and it will be too late.',
  $tingwei1: 'Who sees me trembles, who hears me quakes!',
  $tingwei2: 'Ask your heart again - would you truly war with Heaven?',
  $tingwei3: 'Kneel! Receive your divine punishment!',
  $tingwei4: 'The thunder decree is sent - no escape in the three realms!',
  $tongqu1: 'Cut the canals, and camp the army by the water!',
  $tongqu2: 'Open the channels, clear the roads, and stock the army well!',
  $tunchu1: 'The grain stores are the greater matter - I will not quarrel with you now.',
  $tunchu2: 'Store the grain and wait for war - keep your blades sheathed.',
  $wangjingm1: 'Reach the palace attendants - together we break the court\'s unjust army!',
  $wangjingm2: 'To and from the capital, plotting the rising with the attendants!',
  $wangzhuan1: 'If this reaches the sovereign\'s ear, you know well what follows.',
  $wangzhuan2: 'Sun Chen is dead. Now the court speaks with my voice alone.',
  $wanlan1: 'Shiting is lost. We cannot lose the Grand Marshal as well!',
  $wanlan2: 'The Grand Marshal bears an orphaned throne\'s trust - not a hair of him may come to harm!',
  $wansha_mobile__godsimayi: 'Put the clan to the sword, clip the wings of their faction, and end the trouble for good!',
  $weifeng1: 'Spread dread far and wide, and drain the foe of all will to fight.',
  $weifeng2: 'If you fear me, then roll up your armour and surrender.',
  $weiming1: 'You return east to Luoyang - Feng will ride as your guard.',
  $weiming2: 'Defy the imperial command and you are counted a rebel.',
  $weiming3: 'So long in the planning - and it falls short at the last basketful.',
  $weimu_mobile__wangyuanji: 'We are within the palace walls - why meddle in matters outside?',
  $weitong1: 'Powerless to guard the line, I doze uneasy and wake in fright.',
  $weizhuang1: 'A grand banquet approaches; of course I shall dress for it.',
  $weizhuang2: 'A splendid gown, then - one that shows my beauty in full.',
  $weizhuang3: 'I so rarely go out - dressing myself is the whole pleasure of it.',
  $weizhuang4: 'Wear the same dress twice? No - a new one, to mark the day.',
  $wisdom__qiai1: 'My kin weep over me; my friends cling to the cart.',
  $wisdom__qiai2: 'I go out and see nothing - white bones cover the plain.',
  $wisdom__shanxi1: 'The western capital is chaos; jackals and tigers work their ruin.',
  $wisdom__shanxi2: 'I leave the Central Plains again, and give myself to the wilds of Jing.',
  $wufei1: 'Witchcraft is a vile and evil art. Your Majesty must look into it!',
  $wufei2: 'I should not say so much - I only fear they mean Your Majesty harm.',
  $wuku1: 'I weigh ten thousand pivots, and spend the age\'s machinery to the last.',
  $wuku2: 'Ten thousand scrolls within my breast, stocked full as an armoury.',
  $wuling1: 'I made the Play of the Five Beasts - practice it, and be rid of illness.',
  $wuling2: 'To ease a thousand sufferings, move your body as the five creatures do.',
  $wusheng_guansuo: 'Traitor - do you know the valour of the house of Guan?',
  $wuyuan1: 'My husband, when you march, keep me in your thoughts!',
  $wuyuan2: 'Yunchang, come back to me safe!',
  $xianghai1: 'Out of the way, quick - I would hate to hurt you, hahaha!',
  $xianghai2: 'You ran into me yourself - don\'t go blaming young master Zhou!',
  $xiangle_m_ex__liushan1: 'In this land of plenty, the people are at peace and the state secure.',
  $xiangle_m_ex__liushan2: 'War only troubles the people - better to let it go.',
  $xiangzhen1: 'The elephants alone can drive them off - why should I trouble myself?',
  $xiangzhen2: 'Hmph! Where the elephants march, armies fall into ruin.',
  $xianjian1: 'Your walls may be iron and moat - my blade is sharper!',
  $xianjian2: 'In a siege there is only forward. I lead from the front!',
  $xianzhou_m_ex__caifuren1: 'If this is the will of you all, what doubt should I have?',
  $xianzhou_m_ex__caifuren2: 'A woman I may be, but I know that ceding the province is the lasting plan.',
  $xiaoge1: 'With men this fierce, what battle could I lose?',
  $xiaoge2: 'A rich haul from this fight. Every one of you will be rewarded.',
  $xiaoge3: 'Boy, can you last another hundred bouts with me?',
  $xiaoge4: 'I will not win by numbers. Dare you face me alone?',
  $xiaoni1: 'A weaver of mats, a seller of sandals -- can such a man truly not use men?',
  $xiaoni2: 'In all the ages, who has prized butchers and tavern-men above the worthy?',
  $xiaxing1: 'A true man walks the errant\'s road, sword in hand, honor first.',
  $xiaxing2: 'See wrong on the road and draw your blade. That is the errant\'s duty.',
  $xichang1: 'At this ceremony I shall outshine every flower there.',
  $xichang2: 'Beauty such as mine is wasted on a mirror alone.',
  $xichang3: 'Only robes like these suit the pleasures of the wild.',
  $xichang4: 'It breaks no rite - so why should I not wear it?',
  $xichang5: 'Shut in my chambers I may be, but I will not stoop.',
  $xichang6: 'Fine silks and paint - only a small pleasure of my own.',
  $xichang7: 'A pearl is hidden by its shell; a gown, by its chest.',
  $xichang8: 'A treasured gown is made to be seen - but not by just anyone.',
  $xiezhi1: 'A thousand li of rich land in Shu - why long for the halls of Wei?',
  $xiezhi2: 'Jiang Wei surrendered to me, not to Wei. That is Heaven\'s own verdict.',
  $xing__yishi1: 'Yesterday he spared me; today I repay with an empty shot.',
  $xing__yishi2: 'Your blade spared my head; my arrow takes only your helmet tassel.',
  $xingbu1: 'The heavens show a favourable sign - an omen of great fortune.',
  $xingbu2: 'The stars are strange - the northern campaign must not be counted on.',
  $xinghun1: 'I look up to Ziwei and read the rise and fall; I look down, and the general\'s star '
    + 'lights my armour.',
  $xinghun2: 'I know where the nine stars point - I break through all of it, alone.',
  $xingqi1: 'Plan then act, and you prosper; act then plan, and you perish!',
  $xingqi2: 'The Simas hold power and rank, true - but a patient hand may still take them.',
  $xingshang_mobile__caoying: 'The general\'s loyal spirit endures - he deserves a rich burial.',
  $xingtu1: 'Mapmaking has six principles; lack one and it cannot be called exact.',
  $xingtu2: 'Set the scale, and the whole world fits within a foot of silk.',
  $xiongjin1: 'A general needs courage and cunning both, and wins battle after battle.',
  $xiongjin2: 'Rebels stir up chaos - this is our hour to win glory.',
  $xiongsi1: 'You would silence me? Then we go down together!',
  $xiongsi2: 'Jia Chong! You showed no mercy - do not blame me for showing none!',
  $xiongtus1: 'A banquet tomorrow, my lord - do not refuse me.',
  $xiongtus2: 'Your illness is not yet mended, my lord; here is your usual medicine wine, take it.',
  $xiongtus3: 'Zhuge Ke is arrogant and unchecked; let Jun rid Your Majesty of him.',
  $xiongtus4: 'Zhuge Ke has lost the people entirely - this is our moment.',
  $xiongzi1: 'Let the waves surge as they will - they cannot stop the river running to the sea.',
  $xiongzi2: 'The grand design unfolds; I need only wait for the realm to come to Wu.',
  $xiongzi3: 'With the fire in one man\'s heart I will burn your million worthless rogues',
  $xiongzi4: 'The Nine Provinces still stand - who then rules their rise and fall?!',
  $xiugeng1: 'Entrusted with this charge, how could I fail Lord Cao?',
  $xiugeng2: 'Survey the soil, settle the people, count them and post officers -- so the garrison '
    + 'farms will thrive.',
  $xiugeng3: 'The people take joy in their work. Truly a paradise on earth.',
  $xiugeng4: 'Kind winds, timely rain -- and year on year the granaries stand full.',
  $xizhan1: 'A battlefield is no playground - but what can any of you do to me?',
  $xizhan2: 'I was only playing! Must you strike so hard?',
  $xizhan3: 'Ah, Mother, rest easy - Man\'er will not make trouble.',
  $xizhan4: 'Hehe, now this is fun.',
  $xizhan5: 'Hmph! Let me show you what this lady can do!',
  $xuancun1: 'A Dou is only a child - have a care, General Zilong!',
  $xuancun2: 'Now that I have found you, General, this child may yet live.',
  $xuanfeng_mobile__heqi: 'An army decked in silk and splendour fears no attack!',
  $xuetu1: 'The Son of Heaven\'s escort stands here - no rebel disturbs the imperial carriage.',
  $xuetu2: 'Your servant came late to the rescue. Forgive me, Your Majesty.',
  $xuetu_v31: 'Xu and Yang are heavy with grain - generals, ride with me.',
  $xuetu_v32: 'Hahahaha! Wherever we pass, not one grain is left behind.',
  $xueyi_m_ex__yuanshao1: 'A great house calls, and court and country revere it.',
  $xueyi_m_ex__yuanshao2: 'I am of a noble line - how could I keep company with the likes of you?',
  $xunyi1: 'The ancients died for kindness given. Today we die for what is right!',
  $xunyi2: 'Give up the body for what is right, and die for my lord!',
  $xushu__gongli1: 'Joined in strength and of one mind, what great thing could we fail?',
  $xushu__gongli2: 'With our talents, why not serve one lord and build an empire together?',
  $xuye1: 'These times demand guards - call up the Cong folk of Hanchang as soldiers.',
  $xuye2: 'The realm is in turmoil - can a province stand with no men at all?',
  $xuye3: 'I raise troops only to hold off the foe - would I dare harbour treachery?',
  $yajun1: 'A gentleman is jade - even his robes hold dignity!',
  $yajun2: 'Not one word of your benevolence yet - and already the schemes and the soldiers come '
    + 'first!',
  $yance1: 'As the times stand, only this stratagem will serve.',
  $yance2: 'The age turns past all foreseeing; we must rely on the art of the plan.',
  $yance3: 'A hundred plans, a hundred hits - it is only diligence in working them through.',
  $yance4: 'Ah... a hundred reckonings, and all of them for nothing.',
  $yance5: 'So much for a plan without a flaw.',
  $yance6: 'I gave my utmost; still Heaven bests me by a move.',
  $yance7: 'I did not think it through, and left the enemy room to breathe.',
  $yangjie1: 'Lift the siege entirely; when they sally out to fight, strike, and they scatter!',
  $yangjie2: 'Feign lifting the siege, then strike them outside the walls - that is the easy way '
    + 'to break them!',
  $yanhui1: 'With strength enough to seize cities, why aim at one province alone?',
  $yanhui2: 'One note tells me your meaning - let the zither call the heroes in!',
  $yanhui3: 'With Zijing beside me the grand design is set - together we swallow the realm!',
  $yanhui4: 'The enemy weakens - fan the flames of victory!',
  $yanhui5: 'Ride this win - press on, one triumph after another!',
  $yanhui6: 'You and I of one mind, and the realm falls into our hands!',
  $yanhui_m_shi2__zhouyu1: 'We laid this plan together - it cannot fail.',
  $yanhui_m_shi2__zhouyu2: 'Every hero of the age is of our making - and Yu leads them all!',
  $yanhui_m_shi2__zhouyu3: 'Mengde trusts in his numbers, yet he cannot shake Jiangdong!',
  $yanhui_m_shi2__zhouyu4: 'Let every warship sail - the tide drowns Cao\'s million men.',
  $yanhui_m_shi2__zhouyu5: 'Rain of fire falls, and the flames swallow three thousand hulls.',
  $yanhui_m_shi2__zhouyu6: 'Watch my stratagem settle the Nine Provinces before the season turns.',
  $yanji1: 'If Fan keeps the ledgers, Fan will hold himself to the strictest account!',
  $yanji2: 'Wealth is worth only its use - stock the army stores and the realm stands firm!',
  $yanji3: 'Public coin for private use? I will have it out, and punish it hard!',
  $yaohu1: 'Yizhou is worn thin. I ask my worthy kinsman\'s help.',
  $yaohu2: 'Rice bandits within, mighty Cao without - Zhang cannot do without his kinsman!',
  $yechou_mobile__xugong1: 'Sun Ce, you brat - your evil will be repaid!',
  $yechou_mobile__xugong2: 'I go down to the Yellow Springs - and you shall know no peace!',
  $yichong1: 'Mistress of the inner palace, and dear to His Majesty!',
  $yichong2: 'Three thousand loves? Let them all gather on me alone!',
  $yijie1: 'The Commentary says an army wins by harmony, not by numbers - when heaven and earth '
    + 'accord, all things are born.',
  $yijie2: 'When lord and minister accord, the state is at peace; when kin accord, the clan thrives.',
  $yijin1: 'My house is worth untold millions. What are a few strings of coin to me!',
  $yijin2: 'A child carrying gold through a crowded market. Hmph! Why should I trouble myself to kill?',
  $yijin3: 'In all the world, is there an office my money cannot buy?',
  $yingba1: 'Follow me and live. Defy me and there is no place for you!',
  $yingba2: 'No other man snores beside my bed!',
  $yinghun_m_ex__sunce1: 'Spirit of Wulie, help me make my name.',
  $yinghun_m_ex__sunce2: 'Lord of Jiangdong - the hope of all who watch.',
  $yinghun_m_ex__sunjian1: 'By right I settle the four wilds; by arms I set the realm in order.',
  $yinghun_m_ex__sunjian2: 'Every son of Jiangdong carries the will to set the world right.',
  $yingjia1: 'Extraordinary deeds bring extraordinary merit - think thrice, General.',
  $yingjia2: 'Staying to prop up the court serves us ill, General - move the imperial carriage to Xu.',
  $yingjian1: 'Drifting light above the clouds, like a peach-blossom immortal.',
  $yingjian2: 'No cards left? And what is impossible about that?',
  $yingyuan_mobile__maliang1: 'The Imperial Uncle has few to aid him. Liang must answer at once.',
  $yingyuan_mobile__maliang2: 'A wise lord calls me himself - how could Liang refuse?',
  $yingzi_mobile__heqi: 'Keen blades and tough leather - how could others not envy us?',
  $yinzhan1: 'To campaign on the field is the great joy of my life.',
  $yinzhan2: 'Breaking the enemy for my lord is as easy as a fish takes water.',
  $yinzhan3: 'Wei Wenchang stands before you! How dare you!',
  $yinzhan_m_shi2__weiyan1: 'You have met Wei Yan. Give up any hope of going home.',
  $yinzhan_m_shi2__weiyan2: 'Stand in my blade\'s path and you will leave your helm and armor behind.',
  $yinzhan_m_shi2__weiyan3: 'Strong foes I cut down; hard armor I break!',
  $yinzhan_m_shi3__weiyan1: 'Better to die on the field than throw down my armor and surrender!',
  $yinzhan_m_shi3__weiyan2: 'Few men and weary, and still we cut our way out!',
  $yinzhan_m_shi3__weiyan3: 'War is not counted in numbers, but in the fire in the heart!',
  $yirang1: 'My lord, do not refuse me!',
  $yirang2: 'I beg you, my lord - think first of the cities of Han!',
  $yixiang1: 'One region in peril, and aid comes from all eight.',
  $yixiang2: 'I was good to you once. Repay it now.',
  $yixing1: 'I am the principle of ten thousand uses!',
  $yixing2: 'All things run smooth, all ways run through!',
  $yiyongw1: 'In such a hurry to get back? Hmph! Then let me see you off!',
  $yiyongw2: 'Your weapon - allow me to return it! Hahaha!',
  $yizan1: 'Heirs to our father\'s valor - form the ranks!',
  $yizan2: 'Heirs to the late Emperor\'s will - we will raise Han again.',
  $yizhu1: 'I have two daughters, and I hold them as bright pearls.',
  $yizhu2: 'Should you meet my girl, General, I beg you see her safely home.',
  $youlve1: 'Autumn is high and the horses are fat - now we ride south!',
  $youlve2: 'Their pursuit is upon us - we ride into it ourselves!',
  $youye1: 'Build walls on the western march, and open ten thousand ages of peace.',
  $youye2: 'Hold the border and stand the watch, and the people shall have a settled living.',
  $youyi1: 'I practice medicine to save the countless common folk.',
  $youyi2: 'Heal all living souls, and free them from sickness forever.',
  $yuanqing1: 'Jade at the breast, orchid in the hand, a heart as clean as sweet grass.',
  $yuanqing2: 'Fine words, noble deeds - clear as a deep pool, pure as jade.',
  $yuce_m_ex__manchong1: 'Puff them up with profit, then show them terror!',
  $yuce_m_ex__manchong2: 'Act well abroad, and fortune is born at home.',
  $yuejin__heyu1: '',
  $yuejin__heyu2: '',
  $yuetan1: 'Leap the chasms of the ninth heaven, cross abysses ten thousand fathoms deep!',
  $yuetan2: 'Let this one leap shake heaven and earth!',
  $yueyuan1: 'The phoenix roosts in no lesser tree; a scholar serves no lesser lord.',
  $yueyuan2: 'Liu Zhang is weak, his people unwilling - this is the general\'s moment.',
  $yuhua1: 'This is an immortal\'s treasure. It is not to be thrown away.',
  $yuhua2: 'Phoenix feathers in the drifting smoke, riding the change to immortal dust.',
  $yuli1: 'I wield the primal force, I hold the trigger of life and death!',
  $yuli2: 'I command the thunder, and Heaven itself takes heed!',
  $yuli3: 'Ten thousand tons come down - nothing survives!',
  $yuli4: 'Defy my divine might and be ground to dust!',
  $yuli5: 'Dark thunder tempers the edge and whets my divine might!',
  $yuli6: 'Nine strokes of thunder forge my divine soul!',
  $yunan1: 'Even with Zhang Liang\'s cunning, no man outruns a slanderous tongue.',
  $yunan2: 'All my life on thin ice - one slip and there is no coming back.',
  $yunan3: 'The Simas are cruel. Share their hardship if you must, never their fortune.',
  $yunan4: 'My merit overshadows my lord. Shall I sit and wait for the axe?',
  $yuxiang1: 'Aaah - what a terrible blaze!',
  $zaoli1: 'A man\'s worth is his honesty - I do no wrong even unseen!',
  $zaoli2: 'Feigned feeling and false conduct - I hold them shameful!',
  $zaoxian_m_ex__dengai1: 'Wage war by daring, and the battle is won!',
  $zaoxian_m_ex__dengai2: 'We have reached Mount Mage - press on quickly and break Shu!',
  $zhangliao__heyu1: '',
  $zhangliao__heyu2: '',
  $zhangming1: 'Hold to a far ambition, and your name will surely shine!',
  $zhangming2: 'Begin to learn today, and become a man of use!',
  $zhanlie1: 'Beneath this arrow, what man steals another breath?',
  $zhanlie2: 'Hmph. Can you still fight?',
  $zhanlie3: 'Your head is mine already - yield it and surrender!',
  $zhanshi1: 'Their numbers are few - we may yet have our chance to win.',
  $zhanshi2: 'Hold the gates and we still have room to turn this around.',
  $zhanshi3: 'The advantage is still ours - now hold fast.',
  $zhanshi4: 'When Sun Ce\'s grain runs short, his army must withdraw.',
  $zhaohan1: 'Heaven\'s way is clear; another Guangwu may yet arise.',
  $zhaohan2: 'The mandate of Han is ending. How could I be without regret?',
  $zhaohuo1: 'I have offended Heaven, and the people of Xuzhou pay for it!',
  $zhaohuo2: 'Then Xuzhou is lost...',
  $zhaoxin1: 'My heart is plain for all to see - let the world talk!',
  $zhaoxin2: 'Whatever you mean by this errand, I have taken your measure.',
  $zhenbian1: 'While I stand here, why should we fear the Hu?',
  $zhenbian2: 'My merit is great. The reward is only my due.',
  $zhenfu1: 'Store the grain, tend the herds, hold the raiders, comfort the people.',
  $zhenfu2: 'A hundred thousand households opened up, and every tribe at rest.',
  $zhengjian1: 'This man has fierce, rare talent. Look at him, my lord.',
  $zhengjian2: 'Win him, my lord, and it is a tiger given wings.',
  $zhengjing1: 'I draw on both old and new, learn without limit, and teach only what is best.',
  $zhengjing10: 'I go up the stream after her, and she stands there in mid-water',
  $zhengjing11: 'Even the Qi has its banks, even the marsh has its shore',
  $zhengjing12: 'In our childhood feasts we talked and laughed at ease',
  $zhengjing13: 'Your vows were earnest, and I never thought you would break them',
  $zhengjing14: 'Since you think of it no more, then let it end here',
  $zhengjing2: 'A gentleman must master the Six Arts, and know the Three Rites as well.',
  $zhengjing3: 'The ospreys cry guan-guan, on the islet in the river',
  $zhengjing4: 'A fair and gentle lady, fit mate for a gentleman',
  $zhengjing5: 'The waterweed grows uneven, and left and right we seek it',
  $zhengjing6: 'A fair and gentle lady, sought waking and sleeping',
  $zhengjing7: 'The reeds are grey and thick, the white dew turned to frost',
  $zhengjing8: 'The one I long for stands on the far side of the water',
  $zhengjing9: 'I go down the stream after her, and the way is hard and long',
  $zhengjun1: 'Off the field, do as you please. In battle, give me everything!',
  $zhengjun2: 'You held nothing back - the rebels\' fall belongs to every one of you!',
  $zhengjun3: 'Mercy and pardon make a poor way to run an army!',
  $zhengnan1: 'Suo is the Chancellor\'s to command. Ten thousand deaths would not turn me back!',
  $zhengnan2: 'I would take up my father\'s will and march out with the Chancellor!',
  $zhengpeng1: 'Iron barding, spread wide - shield him head to hoof!',
  $zhengpeng2: 'I will clear the road ahead for my lord!',
  $zhengshuo1: 'Since Emperor An the Han has held only a name - not a foot of land, not one subject.',
  $zhengshuo2: 'Sun Quan calls himself vassal from afar. Heaven and man have both answered.',
  $zhengxuan_jing: 'Classics',
  $zhenjun1: 'A general who keeps his authority keeps his army in hand.',
  $zhenjun2: 'An army is governed by severity, and nothing else.',
  $zhenqiao_m_js__liubei1: 'The sword sings from its sheath, and dragons roar across the seas!',
  $zhenqiao_m_js__liubei2: 'The Kunpeng\'s ambition is set upon all the people of the world!',
  $zhenting1: 'The government rests on me now - all the more reason for care.',
  $zhenting2: 'A state may fall to foreign foes, but it must not rot from within!',
  $zhenxing1: 'Campaigning east and west, I take one man in a hundred.',
  $zhenxing2: 'Many mouths will melt metal; slander piled high dissolves the bone.',
  $zherui1: 'Yue Jin stands here! Who dares fight me to the death?',
  $zherui2: 'My strength is spent, and still I can fight on!',
  $zherui3: 'They are many, we are few - a fine place to make a name!',
  $zherui4: 'Not for love of killing. To put an end to war.',
  $zhiba_m_ex__sunce1: 'My conquest has only just begun.',
  $zhiba_m_ex__sunce2: 'Fight or surrender - I will meet you either way.',
  $zhiheng_mobile__godsimayi: 'The wheel never stops; cause and effect never rest!',
  $zhijie1: 'Of old, Zihan would not call jade a treasure, and the Spring and Autumn Annals '
    + 'praised him for it.',
  $zhijie2: 'Wu and Wei still stand. How can we cherish a bewitching trinket now?',
  $zhilve1: 'A general is not ruled by heaven above, nor earth below, nor men between.',
  $zhilve2: 'Read the enemy\'s plan, know his intent, and turn the moment against him.',
  $zhiman_guansuo: 'The southern tribes are to be won over, not wiped out!',
  $zhimeng1: 'Why flee so far, Lord of Yuzhou, instead of joining a master of true vision?',
  $zhimeng2: 'My lord is wise and mighty - a million of Cao\'s men give us no fear!',
  $zhiyan_m_ex__yufan1: 'On this matter, General, hear me out.',
  $zhiyan_m_ex__yufan2: 'I beg my lord to weigh it once more.',
  $zhiyi1: 'How can we retreat unbidden and squander the state\'s hard-won merit?',
  $zhiyi2: 'Command without slack, and all of it to break the enemy!',
  $zhongao1: 'With Yan at your side, my lord, why fear for the Han\'s revival!',
  $zhongao2: 'This head, this victory, and only the first of many!',
  $zhongao3: 'I fight without rest, all of it to build my lord\'s cause!',
  $zhongao4: 'One loss is nothing to dwell on. There will be honor to win again!',
  $zhongao5: 'Do not trouble yourselves over me. Press on, all of you.',
  $zhoulin1: 'What would some hill-country scholar know of the beast-craft of Nanzhong?',
  $zhoulin2: 'My great art comes down from Heaven - is that the same as Zhuge Liang\'s little tricks?',
  $zhouxian1: 'There is no tyranny and no unrest - yet you dare speak of misrule.',
  $zhouxian2: 'General Cao\'s prowess is the answer to the age - why court ruin on your own head?',
  $zhuangshi1: 'Let Wei send a hundred thousand; I will cut down every one for my lord.',
  $zhuangshi2: 'Though Cao\'s traitors march with all the realm, I will throw them back.',
  $zhuangshi_m_shi2__weiyan1: 'Trouble yourself no further, Chancellor. I will take a light force and win it.',
  $zhuangshi_m_shi2__weiyan2: 'Xiahou Mao is a coward with no plan. What is there to debate?',
  $zhugeliang__gongli1: 'His ambition reaches far - let honest friends advance together.',
  $zhugeliang__gongli2: 'One purpose between us, to mend the age. Press on, brothers.',
  $zhuguo1: 'Better to settle it in life and death than send them a hostage.',
  $zhuguo2: 'This is no measure for a moment. It is the profit of ten thousand years.',
  $zhuguo3: 'Let my small wisdom serve the long design of the state.',
  $zhuiyi_m_ex__bulianshi1: 'I turn myself into a Peach Garden, and only for you.',
  $zhuiyi_m_ex__bulianshi2: 'If my spirit has any power left, it will aid my husband.',
  $zhujian1: 'Raise the towers, build the ships, and wait for the hour to mend the realm.',
  $zhujian2: 'Ships lashed together and clad in gold -- the royal aura is ours to take.',
  $zhujis1: 'With walls of metal and moats of fire, why fear a foe from far away?',
  $zhujis2: 'Strong armour and keen blades - let them try to break us.',
  $zhujis3: 'Raise the towers, ready the engines, and hold the enemy off.',
  $zhujis4: 'Without strong walls and armour, how do we keep the foe outside?',
  $zifu1: 'The will is there, the strength is not. I confess, and I yield.',
  $zifu2: 'Bound, with my own coffin behind me - I beg the Grand Tutor\'s mercy!',
  $zuici1: 'If it keeps the court at peace, then I resign, and gladly.',
  $zuici2: 'The state comes first. What is my good name beside it?',
  $zujin1: 'Hold still and wait for relief. Do not take their bait.',
  $zujin2: 'I misread the field. Nothing left but to fall back on Didao.',
  $zujin3: 'The Shu troops come far and weary. Strike first and master them.',
  $zundi1: 'The Spring and Autumn teaches it: name a son heir, and name the eldest.',
  $zundi2: 'The General of the Household has both talent and virtue. The succession is rightly his.',
  $zuoxing1: 'Meet what is hard with a clear mind, and take every question to your lord.',
  $zuoxing2: 'Your own plans and the state\'s cannot both be served.',
  $zuoyou1: 'His Majesty rides against the traitors - how could we not ride at his side!',
  $zuoyou2: 'Though it cost our lives, our loyalty is to His Majesty alone!',

  /* ------------------------------------------------------------------------
   * Death lines. 299 keys.
   * ---------------------------------------------------------------------- */
  '~caizhenji': 'The world calls me a good wife. I was never a good mother...',
  '~caochun': 'Silver armour on my back, and still I fall to your hand!',
  '~chengjiw': 'So you kill the donkey once the grinding is done? Ugh...',
  '~chenzhen': 'Break the covenant, and both sides fall together!',
  '~chitu': 'I honour your great faith, General - let me die beside you!',
  '~dilu': 'So it is true... I bring ruin to my master...',
  '~dingyuan': 'Fengxian, why have you turned on me - aah!',
  '~fuqian': 'In life a servant of Shu; in death... still Shu!',
  '~godguojia': 'A pity - a pillar of the state, bent by fate...',
  '~godhuatuo': 'So many of the world\'s ills still uncured - how can this old man pass on...',
  '~godlusu': 'Always counting the small gain... never the whole board...',
  '~godsunce': 'Shameless curs! To strike at me from the shadows...',
  '~godtaishici': 'My soul returns... to heaven and earth...',
  '~godxunyu': 'Better to cry out and die than to live in silence...',
  '~gongsunkang': 'A warlord\'s whole life - what is there to regret!',
  '~guansuo': 'I grieve only that the realm is unsettled, and my purpose left undone...',
  '~hucheer': 'One reach of the hand... and their chieftain had me...',
  '~hujinding': 'Yunchang, so soon after we met again, must we part...',
  '~jiangwan': 'Your servant is dying; let Wenwei carry on the work of the state...',
  '~jueying': 'My lord - ride on to a better tomorrow!',
  '~laimin': 'A loose tongue... ten faults in a single word...',
  '~lifeng': 'I have failed the Chancellor\'s trust.',
  '~lingcao': 'Agh! (thud) This arrow... from where...',
  '~liuzan': 'Come on then, you rogues! Aaah............',
  '~liuzhang': 'I let the wolf in at my own door - and now regret comes too late!',
  '~lizhaojiaobo': 'Your Majesty!! Traitors - how dare you strike down your sovereign! Agh...',
  '~luotong': 'Tong\'s one great wish is met. I may die now, and not perish.',
  '~m_ex__bulianshi': 'In this life my lord goes first... in the next, I will serve him again...',
  '~m_ex__caifuren': 'Cong, my child! Ahh...',
  '~m_ex__caiwenji': 'I part from my sons and go home; an old grief settles, and a new grief grows!',
  '~m_ex__caopi': 'Jianping said eighty -- he was counting days and nights. So it is decided...',
  '~m_ex__caozhang': 'Yellow beard and golden armor, no match for a brother\'s poisoned heart!',
  '~m_ex__caozhen': 'Yong and Liang in revolt... the fault is all mine...',
  '~m_ex__caozhi': 'What man of old did not die? Know your fate, and what is left to fear...',
  '~m_ex__chengpu': 'I put down rebels with violence... and violence has come back for me?',
  '~m_ex__chenqun': 'I stood pure and whole. What is one death to me...',
  '~m_ex__dengai': 'A whole heart\'s loyalty, and this is what it bought me...',
  '~m_ex__dianwei': 'You whelps dare do me harm! Come and pay with your lives!',
  '~m_ex__fuhuanghou': 'Father, how could you waver so...',
  '~m_ex__gaoshun': 'My lord knew what I was, and would not use me. What a pity!',
  '~m_ex__gongsunzan': 'Agh! (a horse screaming)',
  '~m_ex__guyong': 'This sickness... I shall not rise from it...',
  '~m_ex__handang': 'I would serve again... but age and sickness have me now...',
  '~m_ex__huatuo': 'Birth, age, sickness, death - fate is not to be defied.',
  '~m_ex__jiangwei': 'A pity. The great design unfinished, and I am already fallen.',
  '~m_ex__jianyong': 'I kept to no rules, and men came to loathe me.',
  '~m_ex__jvshou': 'Shou has not failed his lord\'s kindness...',
  '~m_ex__liaohua': 'The great restoration rests with you now!',
  '~m_ex__lingtong': 'Just... hold on a moment...',
  '~m_ex__liru': 'We die by a woman\'s hand, every one of us!',
  '~m_ex__liubiao': 'Old, so very old... I have forgotten the fire of my prime...',
  '~m_ex__liushan': 'I have shamed my imperial father, and my Chancellor-father too...',
  '~m_ex__manchong': 'Chong served the state all his life -- loyal and frugal to the end.',
  '~m_ex__pangde': 'I would sooner be a ghost of the state than a general of traitors!',
  '~m_ex__pangtong': 'Fallen... Phoenix... Slope...',
  '~m_ex__panzhangmazhong': 'Such a perfect ambush... how could this...',
  '~m_ex__quancong': 'I chased fame like a man building a house on roadside advice... and so it was never '
    + 'finished...',
  '~m_ex__sunce': 'The great work unfinished, and I fall in the middle of my years...',
  '~m_ex__sunjian': 'My body dies, but loyalty and valour must be passed on.',
  '~m_ex__sunluban': 'Little sister, your elder had no choice...',
  '~m_ex__sunxiu': 'I sought no cities abroad - only that great Wu be safe forever...',
  '~m_ex__weiyan': 'You... do not be blinded by Yang Yi\'s scheming... argh!',
  '~m_ex__wolong': 'My stratagem... how could it be seen through...',
  '~m_ex__wuguotai': 'My lords, I beg you - stand by Zhongmou with all your strength...',
  '~m_ex__wuyi': 'We never feared the perilous roads of Shu, yet the Wei River and Chang\'an we cannot '
    + 'pass...',
  '~m_ex__xiahoudun': 'One eye, a broken body - I fear neither life nor death.',
  '~m_ex__xiaoqiao': 'Master Zhou, wait for me.',
  '~m_ex__xuhuang': 'Their guard was perfect... I took them too lightly...',
  '~m_ex__xunyu': 'Fate is not ours to choose. What use is sighing...',
  '~m_ex__xusheng': 'Sheng regrets only this - no more foes broken for my lord.',
  '~m_ex__yanliangwenchou': 'I told you to watch my back...',
  '~m_ex__yuanshao': 'Woe to the house of Yuan...',
  '~m_ex__yuanshu': 'I... was to reign ten thousand years...',
  '~m_ex__yufan': 'Better, after all, to bow to Heaven\'s will!',
  '~m_ex__yuji': 'The deep secret of the Way... seen through at last...',
  '~m_ex__yujin': 'Peril and hardship at last, and I have failed thirty years of the Chancellor\'s '
    + 'trust... alas...',
  '~m_ex__zhangfei': 'In the end it is small men one cannot guard against...',
  '~m_ex__zhangjiao': 'The Yellow Heaven has fallen - what becomes of the people...',
  '~m_ex__zhangyi': 'The northern campaign unwon - I will give my life to repay Your Majesty!',
  '~m_ex__zhangzhaozhanghong': 'My one regret: not one more day of good work for the people of Wu...',
  '~m_ex__zhonghui': 'Father, I knew myself. I could never master myself...',
  '~m_ex__zhoucang': 'Below the Nine Springs, Cang will walk beside the General once more...',
  '~m_ex__zhoufei': 'When will this longing meet its meeting? This hour, this night, is hard to bear...',
  '~m_ex__zhoutai': 'This... is only a scratch...',
  '~m_ex__zhuhuan': 'To lead from behind and kneel beneath another - no living man could bear such shame...',
  '~m_ex__zhuran': 'The long-eared thief is right there - after him...',
  '~m_ex__zhuzhi': 'Three generations of the house of Sun I served; near seventy now, I die without regret.',
  '~m_friend__cuijun': 'What joy your friendship was... a pity we shall never meet again...',
  '~m_friend__pangtong': 'The great work unfinished... what a pity, what a pity...',
  '~m_friend__shitao': 'All this fire in me, and no way to serve my country...',
  '~m_friend__xushu': 'The people drown in bitterness, and I cannot reach them...',
  '~m_friend__zhugeliang': 'I found my rightful lord, if not my rightful hour... I gave it everything...',
  '~m_js__liubei': 'The mulberry at Lousang, that canopy of plumes... all a passing dream...',
  '~m_js__sunjian': 'If I break this oath, let ten thousand arrows pierce my heart...',
  '~m_js__wangyun': 'The armies would not disband, and new chaos rises - this old man must answer with '
    + 'his life...',
  '~m_liuyi__caoxing': 'I never thought this one could be so terrible...',
  '~m_liuyi__caozhi': 'Idleness was never my wish... gladly I go to my country\'s cares...',
  '~m_liuyi__liuhui': 'The Nine Chapters is annotated to the end, and now I can go in peace.',
  '~m_liuyi__luyu': 'A wise ruler makes upright ministers - that is why I dared to speak against him.',
  '~m_liuyi__zhangzhi': 'Where the brush-tip ends, no wall divides the living from the dead.',
  '~m_liuyi__zhouyu': 'Bo Ya broke his zither for the friend who knew him - not the lost music, but the '
    + 'true heart, is what we prize.',
  '~m_shi2__weiyan': 'To die on the field is a fine thing - in the next life I shall see the Han restored...',
  '~m_shi2__zhouyu': 'So brief a life, and never room enough for so boundless an ambition...',
  '~m_shi3__weiyan': 'I bear the slanderers no grudge - only that my lord\'s great ambition went unfulfilled...',
  '~m_shi__caozhen': 'This Zhuge Liang... do not pursue him too far...',
  '~m_shi__chendao': 'Does the late Emperor\'s work end here?',
  '~m_shi__chengpu': 'When I meet my old lord below, I shall have nothing to be ashamed of.',
  '~m_shi__chenjiao': 'Though I lack Shen Xu\'s feat, could I forget Hong Yan\'s faith?',
  '~m_shi__chenzhis': 'Not one merit to my name. I have shamed my sovereign\'s grace.',
  '~m_shi__dengai': 'Heaven and sun can vouch for my loyalty - yet traitors have hidden it away.',
  '~m_shi__dongzhao': 'To have drafted the strategies for Lord Cao - that was fortune enough for me...',
  '~m_shi__guoyuan': 'I lived plain and frugal... let my burial be plain too.',
  '~m_shi__huangzu': 'They mock your father as a tin-forging duke - and still you would not kill?',
  '~m_shi__huanjie': 'Your Majesty was generous - your servant can repay it only beyond the grave.',
  '~m_shi__lusu': 'I fear the times will turn, and the alliance will be no more.',
  '~m_shi__luyusheng': 'I have shamed my family\'s honour, and failed my father\'s hopes...',
  '~m_shi__sunchen': 'If not merit, then at least toil! Mercy, Your Majesty, mercy!',
  '~m_shi__sunjun': 'Ah, Zhuge Ke! I did not fear you living - why should I fear you dead?',
  '~m_shi__taishici': 'My body bears witness to the cause; my soul turns to Jiangdong...',
  '~m_shi__tianfeng': 'Trust the man you use, use no man you doubt. Does my lord not know this?',
  '~m_shi__wangchang': 'The flower of the morning... falls by evening...',
  '~m_shi__weiyan': 'I gave my life to the Han. What is there to regret in dying?',
  '~m_shi__xiahoushang': 'His Majesty\'s pity runs this deep. I can die without regret...',
  '~m_shi__xinxianying': 'Do as I told you, and you will come away whole.',
  '~m_shi__yuji': 'You would not believe the Dao, and so you fall into misery... is that not pitiful?',
  '~m_shi__zanghong': 'A pity Hong is too weak to draw the blade and avenge the realm - but yield? Never.',
  '~m_shi__zhangyan': 'Better to bend the knee to Lord Cao than run in every direction.',
  '~m_shi__zhonghui': 'The scheme failed, yet it beats kneeling to another man.',
  '~m_shi__zhouyu': 'The great work will be finished one day... I only regret Bofu will not see it with me...',
  '~m_sp__caocao': 'My great work... had not even begun...',
  '~m_sp__guanqiujian': 'You will not strike the usurpers - why cut down the army that would...',
  '~m_sp__simazhao': 'Anshi... the rest of it is up to you...',
  '~m_sp__yujin': 'Down to the Nine Springs - with what face can I meet them...',
  '~m_sp__zhenji': 'I regret ever entering an emperor\'s house. Every wish came to nothing...',
  '~m_sp_lord__guanyu': 'Sooner death than a bent will!',
  '~m_sp_lord__yuanshu': 'Where has all Our honey gone...',
  '~m_sp_lord__zhaoyun': 'Everyone behind me - charge on, for the House of Han!',
  '~m_sp_lord__zhugeliang': 'A brighter tomorrow, my dears - we must all work harder for it.',
  '~m_thoroughbred__lidian': 'A true man may die, but his name must never be stained!',
  '~m_thoroughbred__yuejin': 'My arrow wound splits open - I can still kill rebels!',
  '~m_thoroughbred__zhangliao': 'Who in this world does not one day die...',
  '~m_yuan__chenlan': 'Tianzhu is steep, but no cliff stops a true tiger general...',
  '~m_yuan__gaoshun': 'Wenyuan is a true hero.',
  '~m_yuan__guanyu': 'Guan Yu is not heartless - each of us serves his own lord.',
  '~m_yuan__lvbu': 'Liu Bei, that whelp? How dare he be my undoing.',
  '~m_yuan__meicheng': 'This Zhang Liao, a fine hand indeed...',
  '~m_yuan__sunquan': 'The great work is unfinished. Reform the ranks and fight again.',
  '~m_yuan__tadun': 'The Yuans have been the ruin of me!',
  '~m_yuan__tanshihuai': 'Fall back to the Yin Mountains, lads. One day I will come again.',
  '~m_yuan__zhangliao': '',
  '~majun': 'The scales lie unused, and fine jade is slandered!',
  '~maojie': 'To depose and enthrone is no small thing, my lord - take care...',
  '~mayuanyi': 'Tang Zhou... you have no shame!',
  '~mazhong': 'With the Chancellor gone, you would dare...',
  '~miheng': 'Ha ha ha ha... heaven and earth have no room for me!...',
  '~mobile2__caomao': 'Even if I die in failure, I am the Grand Ancestor\'s blood, and sovereign of great Wei...',
  '~mobile2__simazhao': 'The royal power broken - a crime that fills the heavens...',
  '~mobile__baosanniang': 'Husband, in the next life let me walk beside you still...',
  '~mobile__baoxin': 'Good plans, strong bones - and never the hour to use them!',
  '~mobile__bianfuren': 'My lord Mengde, I may stand at your side once more...',
  '~mobile__caomao': 'Though I fall and die, I am the Grand Ancestor\'s blood, sovereign of great Wei...',
  '~mobile__caosong': 'Ever I grieved that hearts run shallower than water - on level ground they raise up '
    + 'waves...',
  '~mobile__caoying': 'I fall, but nothing stops the rise of great Wei...',
  '~mobile__cheliji': 'Zhuge the sorcerer has ruined my mighty army.',
  '~mobile__chendeng': 'My lords - need you fear there will be no worthy minister left?',
  '~mobile__chengui': 'Lü Bu is no loyal man, General - deal with him early...',
  '~mobile__cuilingyi': 'No paint keeps a face a thousand years; high or low, we all come back to the same '
    + 'mound of earth.',
  '~mobile__cuiyan': 'Live as a gentleman, die reaching for the virtue of bamboo...',
  '~mobile__dengzhi': 'A whole life given to the state - no regrets now.',
  '~mobile__dongbai': 'Let go of me! How dare you...',
  '~mobile__dongcheng': 'Down in the Nine Springs, I will be waiting for you, Cao the traitor!',
  '~mobile__duyu': 'A round stone in the Luo, the road turning south... plain living alone will keep me '
    + 'whole...',
  '~mobile__feiyi': 'I do not grudge my death - only that I shall not see the Han restored.',
  '~mobile__furong': 'The rear is held... I die without regret...',
  '~mobile__ganfuren': 'May my lord\'s great work succeed, and the Han rise again in time...',
  '~mobile__gaolan': 'A heart full of loyalty, undone by one slander... ah!',
  '~mobile__godjiangwei': 'Let this body fall - I rise a new star, and guard the Nine Provinces beside the sun.',
  '~mobile__godmachao': 'I judged ten thousand ages... who is left to judge me...',
  '~mobile__godsimayi': 'The Luo rolls on... it cannot tell the hardship of my life...',
  '~mobile__guanyinping': 'Father... brother... Yinping comes to join you...',
  '~mobile__guozhao': 'Tears fall unbidden... and stain my robes...',
  '~mobile__hansui': 'Thirty years a warlord, and one defeat turns it all to dust...',
  '~mobile__heqi': 'Fine arms, hard armour - and still we were beaten...',
  '~mobile__huaman': 'The war is settled, and my wish granted at last...',
  '~mobile__huangfusong': 'What strength I had, I spent in service...',
  '~mobile__huaxin': 'For the good of the state, this body may be spent...',
  '~mobile__huban': 'My life was small but my will unchanged, my station low but my honour untaken...',
  '~mobile__huojun': 'My lord... Jiameng... has held...',
  '~mobile__jiachong': 'A life spent serving power - now I beg only for a kinder name on the stone...',
  '~mobile__jianggan': 'Ah... that forged letter has ruined me...',
  '~mobile__jiangji': 'The oath sworn by the Luo still rings in my ears... cough, cough, cough...',
  '~mobile__jiangqin': 'I fought the foe and shielded my lord - let that be my name...',
  '~mobile__jikang': 'The qin sounds on, and lulls me to my long sleep...',
  '~mobile__kongrong': 'Flouting the court\'s rites? A slander, and nothing more!',
  '~mobile__lingju': 'For one sworn to die, the one forbidden thing is to feel...',
  '~mobile__liuba': 'Kongming, the whole burden of Han rests on you alone now...',
  '~mobile__liuye': 'Alas. I could not aid my sovereign above, nor keep my colleagues below. I was no '
    + 'minister to save an age.',
  '~mobile__liwei': 'Pacifying the south is a heavy charge... never take it lightly...',
  '~mobile__lougui': 'Stay where you are, Chancellor. This old man takes his leave.',
  '~mobile__lvfan': 'This sickness comes on fierce - forgive me, my lord, I can serve no longer...',
  '~mobile__lvkai': 'Keeping faith is never easy. I give this body gladly for Shu.',
  '~mobile__maliang': 'I lived loyal, I lived just. My heart holds no shame.',
  '~mobile__mamidi': 'Yuan Gonglu! How dare you deceive me!',
  '~mobile__mengda': 'What? How could Lord Sima march so swiftly!',
  '~mobile__mifuren': 'My days are done. Only let Adou reach Shu safely...',
  '~mobile__qinghegongzhu': 'Xiahou Mao is all appearance - no true husband at all...',
  '~mobile__shenpei': 'My lord lies to the north - let me die facing north!',
  '~mobile__simafu': 'That such usurpation came to pass... this guilty servant cannot escape the blame...',
  '~mobile__simazhao': 'My edge too bared, my ambition too plain - and this is the fruit of it...',
  '~mobile__simazhou': 'All I ask is burial beside the Grand Consort\'s tomb, and my lands divided among my '
    + 'four sons.',
  '~mobile__sufei': 'We could have built something great - but my lord\'s measure was small...',
  '~mobile__sunluyu': 'Slandered, I die wronged today - one day the histories will clear my name!',
  '~mobile__sunshao': 'Every lord and general of Jiangdong has his gift - but never one heart...',
  '~mobile__wangcan': 'Now I know the singer of the Falling Spring, and sigh till my heart tears...',
  '~mobile__wangling': 'A whole life served loyally to Wei - and at the end it is all undone!',
  '~mobile__wangshuang': 'What? Back to the main camp, now! Agh!',
  '~mobile__wangyuanji': 'The tides of this world... no one hand can turn them...',
  '~mobile__wangyun': 'Why waste words, rebel? Today there is only death!',
  '~mobile__weiwenzhugezhi': 'We were pure men of the sea and Dai... who knew that life could pass so easily...',
  '~mobile__wenqin': 'On the day your armies break, I will take this vengeance from beyond the grave!',
  '~mobile__wenyang': 'Half a life of service, undone by one house\'s slander - how can I not resent it!',
  '~mobile__wuban': 'Han is falling, and no hope left of setting it right...',
  '~mobile__wujing': 'The bandits still stand, and I am the one to fall...',
  '~mobile__xianglang': 'The Master said: in teaching there are no classes. A pity - so many never came to '
    + 'the school...',
  '~mobile__xingdaorong': 'This Zhao Yun, he is fearsome indeed...',
  '~mobile__xinpi': 'In life I stood in the court, in death my name stands in the histories. I have no regrets.',
  '~mobile__xuezong': 'Alas! I gave loyal counsel again and again... why would no one believe me...',
  '~mobile__xugong': 'That memorial is not my writing - you shall not smear my name!',
  '~mobile__xurong': 'To die on the battlefield... not a bad ending...',
  '~mobile__yanghong': 'Today I die - and what is there to fear in that?',
  '~mobile__yanghu': 'My one regret in this life is that I never took Wu...',
  '~mobile__yanghuiyu': 'Taofu, you must come home safe...',
  '~mobile__yangqiu': 'How dare I defy my sovereign? But I fear disaster will come of it!',
  '~mobile__yangyi': 'Regret it now, and it is already beyond mending...',
  '~mobile__yanxiang': 'Under an enlightened lord, my name might have lived in the histories...',
  '~mobile__yuanshu': 'Ngh... there is no... no honey water left...',
  '~mobile__yuejiu': 'Hmph. Do it, then!',
  '~mobile__zerong': 'So few awaken; so many stay lost.',
  '~mobile__zhangbao': 'Yellow Heaven... why?!',
  '~mobile__zhangchangpu': 'The honor of the Zhong house waits for my son to raise it...',
  '~mobile__zhangfen': 'Thirty years old, and no name yet made... a pity...',
  '~mobile__zhanggong': 'One thread of smoke in the desert, and no help coming...',
  '~mobile__zhangjih': 'It grieves me that I shall not see the realm made quiet, and the Qiang and Hu come '
    + 'to submit.',
  '~mobile__zhangqiying': 'Heaven and earth are not kind; they use all things as straw dogs...',
  '~mobile__zhangwen': 'I brought this blame upon myself... and the grief of it is mine...',
  '~mobile__zhangyiy': 'I ask only that the people be spared this ruin... ah...',
  '~mobile__zhouchu': 'I mended my ways and swore to end the three scourges...',
  '~mobile__zhujun': 'Guo Si, you wretch! You have vexed me to death! Ngh...',
  '~muludawang': 'Ah, Zhuge Liang is a god come down among men; we cannot stand against Heaven.',
  '~mxing__dongzhuo': 'I meant to sit and watch the age turn - but Heaven would not have it.',
  '~mxing__fazheng': 'If the general will not take it now, another surely will.',
  '~mxing__ganning': 'The bronze bells... I fear I will not hear them again...',
  '~mxing__huangzhong': 'Guan Yunchang spared me in honour - how could I loose on him...',
  '~mxing__wanglang': 'Lang could not die for his honor - I shame the martyrs of Han!',
  '~mxing__weiyan': 'My lord, why did you cast me off... aargh!',
  '~mxing__xuhuang': 'Alas... no wise lord found, no great deed done...',
  '~mxing__zhanghe': 'But for petty men in the way, Guandu need never have been lost...',
  '~mxing__zhangliao': 'Bewitched by a woman, he threw away the hour of battle - a worthless lord has ruined me.',
  '~mxing__zhoubuyi': 'The bright child is gone... and the world is wounded...',
  '~nanhualaoxian': 'Seek Heaven\'s design and it draws near; grasp at it and it flees...',
  '~nos__huaxin': 'Old and sick... I petition to lay down my office...',
  '~nos__mifuren': 'General Zilong, take care of yourself...',
  '~nos__xunchen': 'Only let me not disgrace the Xun name of Yingchuan...',
  '~pangdegong': 'I could read other men and never myself - how absurd.',
  '~pangxi': 'I saved your sons and upheld you at every turn - how can the Governor doubt me?',
  '~peixiu': 'I took the cold-stone powder, and then the cold wine... I should have known...',
  '~pengyang': 'The ruin I called down was my own doing... all of it...',
  '~qianzhao': 'Years holding the frontier - no great merit, but no failing either...',
  '~qiaogong': 'All a father\'s thoughts... were only ever for you two...',
  '~qiaozhou': 'Right and wrong are mine; praise and blame belong to others...',
  '~ruanhui': 'Alone I keep an empty room, and the ache of missing you I dare not forget...',
  '~shijic': 'Alas. Troubles within brought us to this, and no strength can turn the sky back.',
  '~shixie': 'This life of mine... has been enough...',
  '~sunhao': 'Fate! It is fate!',
  '~sunru': 'I shielded Jiangdong; dying, I have no complaint.',
  '~sunshaow': 'So much favour from His Majesty, and I fear I can never repay it.',
  '~sunyi': 'You... why would you do this...',
  '~taoqian': 'I should never have sent that petty man - and so I brought this ruin down.',
  '~tongqu__jiakui': 'In life a heart loyal unto death; in death a ghost still serving the realm!',
  '~wangfuzhaolei': 'Sworn unto death... to follow at the general\'s side...',
  '~wangjing': 'My mother said as much... Jing dies without regret.',
  '~wangjun': 'The realm lies broken, the river\'s iron chains run cold...',
  '~wanglang': 'You... you! ...Agh... ah...',
  '~wooden_ox': 'Function impaired... I can serve the Chancellor\'s northern march no longer...',
  '~wuke': 'Serve Zhongmou with all you have, and let Jiangdong come first in all things.',
  '~xiangchong': 'The tribes still harbour treachery; this war will never be laid to rest...',
  '~yangbiao': 'I could not die to save the Han... my clan weighed too heavy...',
  '~yangfeng': 'Liu Bei! We swore to take Lü Bu together - why set this Hongmen trap for me!',
  '~yangfu': 'You betrayed your father and your lord. I swear it... I will kill...',
  '~yanpu': 'My lord heeded my every counsel - how could Pu not give him his all...',
  '~yuanhuan': 'In an age of chaos, ritual counts for nothing...',
  '~zhangbu': 'I should have obeyed the late Emperor\'s last command...',
  '~zhangzhongjing': 'No one to carry the art on - I fear the thread is lost...',
  '~zhaotongzhaoguang': 'We fought to the death for what he built - no shame to our first vow.',
  '~zhengxuan': 'My commentary on the Changes unfinished... and my years already spent...',
  '~zhouqun': 'Cut the loss in time... too far is as bad as not far enough...',
  '~zhugeguo': 'Born even as I die, dying even as I am born...',
  '~zhugeke': 'Power too great unsettles the throne... that was my oversight...',
  '~zhujic': 'Why did Zhuge Rong hold his army back, and leave me to this ruin?',

  /* ------------------------------------------------------------------------
   * Victory lines. 49 keys.
   * ---------------------------------------------------------------------- */
  '!godguojia': 'If I am to be the peerless advisor, the name must be earned!',
  '!godhuatuo': 'Let the world be free of illness, though the dust settle on my shelves.',
  '!godlusu': 'My lord sits enthroned at heaven\'s centre; the four seas lie beneath his gaze!',
  '!godsunce': 'Three commanderies pacified -- Jiangdong stands firm in my hand!',
  '!godtaishici': 'With this divine bow I carry out Heaven\'s punishment!',
  '!godxunyu': 'The restoration of Han is close at hand!',
  '!m_ex__bulianshi': 'Jiangdong grows strong, and talent fills her halls!',
  '!m_friend__zhugeliang': 'Let the tripod stand firm, General, and the Central Plains are ours to take.',
  '!m_shi2__weiyan': 'Your Majesty! Chancellor! The stratagem is done, and my lord\'s hope is all but won!',
  '!m_shi2__zhouyu': 'The great river washes every hero\'s pride away - only Zhou Lang\'s name is fixed in '
    + 'the histories!',
  '!m_shi3__weiyan': 'My lord and the Chancellor are gone, but Wei Yan remains - I will not let the Wei '
    + 'rebels run wild.',
  '!m_shi__guoyuan': 'A state with no want of grain has already won half the war.',
  '!m_shi__huanjie': 'Your Highness bears the Mandate of Heaven. There is no one to yield to.',
  '!m_shi__luyusheng': 'A woman may be soft, and still be steel.',
  '!m_shi__sunchen': 'Who but I keeps the house of Sun at peace? Hahahaha!',
  '!m_shi__taishici': 'In meeting Bofu, my great ambition is fulfilled at last!',
  '!m_shi__weiyan': 'My blood runs true, and I have not failed my lord\'s grace.',
  '!m_shi__xinxianying': 'A woman\'s wisdom may reach where a man\'s cannot.',
  '!m_shi__yuji': 'Long life is Heaven\'s great treasure -- given to the virtuous, never won by fraud.',
  '!m_shi__zanghong': 'Fortunes rise and fall, and men turn with them or against - but heaven favours the '
    + 'loyal and the just.',
  '!m_shi__zhouyu': 'No need to dwell on this victory - such days will soon be ordinary.',
  '!m_sp__simazhao': 'The realm made one - the work is within arm\'s reach now.',
  '!m_sp__zhenji': 'I saw nine homes in ten stand empty. How precious this peace is now.',
  '!m_thoroughbred__zhangliao': 'Generals -- today you see what one heart can do!',
  '!majun': 'That my craft should serve the world - what good fortune!',
  '!mobile2__simazhao': 'The age of one realm will be opened by the House of Sima!',
  '!mobile__caomao': 'Shaokang slew Han Zhuo and restored the realm - why should I not cut down the Simas!',
  '!mobile__caoying': 'With this victory, Shu broken and Wu swallowed are only days away!',
  '!mobile__cuilingyi': 'In gown and rouge, who could match even half of me?',
  '!mobile__godjiangwei': 'The heart\'s fire warms a mortal world, and heaven\'s water falls as rain on men.',
  '!mobile__godmachao': 'My divine might blazes over the world, and all realms are mine to roam!',
  '!mobile__maliang': 'Liang stands with my lord - my life for the rising of Han!',
  '!mobile__qinghegongzhu': 'My husband walked to his own death. How can he lay it at my door?',
  '!mobile__simazhao': 'The court is mine to command - and every inch of Wei with it!',
  '!mobile__wangyuanji': 'The common people will have a fair future at last.',
  '!mobile__wangyun': 'The traitor is gone, the chaos will settle, and Han endures forever.',
  '!mobile__zerong': 'Here there is no name for the three paths of suffering, only the sound of natural joy.',
  '!mobile__zhangfen': 'Genius works unseen - but let all men know its worth!',
  '!mobile__zhangqiying': 'The spirit of the valley never dies; it is called the mysterious female.',
  '!mxing__fazheng': 'Yizhou is ground of great advantage - the base from which the general restores the Han.',
  '!mxing__ganning': 'Another rich haul! Hoist the sails, brothers!',
  '!mxing__xuhuang': 'I have found an enlightened lord. Now I must earn my place in his service.',
  '!mxing__zhanghe': 'Water shapes its course to the ground; an army shapes its victory to the foe!',
  '!mxing__zhangliao': 'The riders of Bingzhou shall sweep the six directions clean!',
  '!nanhualaoxian': 'The Nine Provinces teem and swarm - yet long life and early death rest with me.',
  '!shichangshi': 'The Ten Attendants stand higher than ever - no hand can check us now.',
  '!zhaotongzhaoguang': 'We carry the Dragon\'s soul - swift to act, sure to win!',
  '!zhouqun': 'In star and omen alike, my readings never miss!',
  '!zhugeguo': 'The joy is mine alone - I melt into the sky and roam free!',

  /* ------------------------------------------------------------------------
   * Artist, voice and designer credits. 321 keys.
   * ---------------------------------------------------------------------- */
  'cv:fuqian': 'Yang Chaoran',
  'cv:lifeng': 'Qin Qiege',
  'cv:liuzan': 'Teng Ge\'er',
  'cv:m_ex__xusheng': 'Jin Yao',
  'cv:majun': 'Jin Yao',
  'cv:maojie': 'Liu Qiang',
  'cv:mobile__caoying': 'Shuiyuan',
  'cv:mobile__gaolan': 'Cao Zhen',
  'cv:mobile__jiachong': 'Yu Xiaoxu',
  'cv:mobile__lvfan': 'Yu Xiaoxu',
  'cv:mobile__wangling': 'Song Guoqing',
  'cv:mobile__wujing': 'Yu Xiaoxu',
  'cv:mobile__xurong': 'Cao Zhen',
  'cv:nanhualaoxian': 'Song Guoqing',
  'cv:xiangchong': 'Yu Xiaoxu',
  'cv:yangbiao': 'Yuan Guoqing',
  'designer:guansuo': 'Qianhuan',
  'designer:liuzan': 'Dongjiao Yichen Noah',
  'designer:m_ex__manchong': 'Loun Laomeng',
  'designer:m_sp__yujin': 'Loun Laomeng',
  'designer:majun': 'Loun Laomeng',
  'designer:mazhong': 'Virgopaladin',
  'designer:miheng': 'Qianhuan',
  'designer:mobile__baoxin': 'jcj Xiong',
  'designer:mobile__caoying': 'Han Xu',
  'designer:mobile__huojun': 'Busui',
  'designer:mobile__jiachong': 'Loun Laomeng',
  'designer:mobile__liuye': 'Tumi',
  'designer:mobile__sunshao': 'Loun Laomeng',
  'designer:mobile__xurong': 'Loun Laomeng',
  'designer:mobile__yanghuiyu': 'Loun Laomeng',
  'designer:mobile__zhanggong': 'Bi Xin',
  'designer:peixiu': 'Loun Laomeng',
  'designer:shixie': 'Rivers',
  'designer:taoqian': 'Rivers',
  'designer:wanglang': 'Qianhuan',
  'designer:yangbiao': 'Loun Laomeng',
  'designer:zhaotongzhaoguang': 'Loun Laomeng',
  'designer:zhengxuan': 'Loun Laomeng',
  'designer:zhugeke': 'Han Xu',
  'illustrator:caizhenji': 'M Yunya',
  'illustrator:caochun': 'depp',
  'illustrator:changshi__bilan': 'Guihuafu',
  'illustrator:changshi__duangui': 'Guihuafu',
  'illustrator:changshi__gaowang': 'Guihuafu',
  'illustrator:changshi__guosheng': 'Guihuafu',
  'illustrator:changshi__hankui': 'Guihuafu',
  'illustrator:changshi__lisong': 'Tiechu Wenhua',
  'illustrator:changshi__sunzhang': 'Guihuafu',
  'illustrator:changshi__xiayun': 'Tiechu Wenhua',
  'illustrator:changshi__zhangrang': 'Fanguo',
  'illustrator:changshi__zhaozhong': 'Fanguo',
  'illustrator:chengjiw': 'Ningju Yongheng',
  'illustrator:chenzhen': 'Chengdu Jinxin',
  'illustrator:chitu': 'Teterou',
  'illustrator:dilu': 'Teterou',
  'illustrator:dingyuan': 'M Yunya',
  'illustrator:fuqian': 'Junhuan Wenhua',
  'illustrator:godguojia': 'Mu Meiren',
  'illustrator:godhuatuo': 'Wu Tao',
  'illustrator:godlusu': 'Manxiangzu',
  'illustrator:godsunce': 'Xiaotong',
  'illustrator:godtaishici': 'Xiaotong',
  'illustrator:godxunyu': 'Xiaotong',
  'illustrator:gongsunkang': 'Xiaoqiang',
  'illustrator:guansuo': 'depp',
  'illustrator:hucheer': 'Li Minran',
  'illustrator:hujinding': 'Thinking',
  'illustrator:jiangwan': 'Fanguo',
  'illustrator:jueying': 'Tete Rou',
  'illustrator:laimin': 'Cuoluo Yuzhou',
  'illustrator:lifeng': 'NOVART',
  'illustrator:lingcao': 'Yinghua Shanluan',
  'illustrator:liuzan': 'Suanbao',
  'illustrator:liuzhang': 'Guihuafu',
  'illustrator:lizhaojiaobo': 'Ningju Yongheng',
  'illustrator:luotong': 'Guihuafu',
  'illustrator:m_ex__bulianshi': 'Fanguo',
  'illustrator:m_ex__caifuren': 'Manxiang Zu',
  'illustrator:m_ex__caiwenji': 'Qingxue',
  'illustrator:m_ex__caopi': 'YanBai',
  'illustrator:m_ex__caozhang': 'Xiaotong',
  'illustrator:m_ex__caozhen': 'Guihuafu',
  'illustrator:m_ex__caozhi': 'Qingdao Panpu',
  'illustrator:m_ex__chengpu': 'monkey',
  'illustrator:m_ex__chenqun': 'Guihuafu',
  'illustrator:m_ex__dengai': 'Ningju Yongheng',
  'illustrator:m_ex__dianwei': 'Ningju Yongheng',
  'illustrator:m_ex__fuhuanghou': 'zoo',
  'illustrator:m_ex__gaoshun': 'Danfei Jiding',
  'illustrator:m_ex__gongsunzan': 'fingerling',
  'illustrator:m_ex__guyong': 'Qiu Daidai',
  'illustrator:m_ex__handang': 'Linglong Yiyou',
  'illustrator:m_ex__huatuo': 'Liu Xiaolang Syaoran',
  'illustrator:m_ex__jiangwei': 'Shichan',
  'illustrator:m_ex__jianyong': 'zoo',
  'illustrator:m_ex__jvshou': 'Guihuafu',
  'illustrator:m_ex__liaohua': 'Juyi Studio',
  'illustrator:m_ex__lingtong': 'Qingdao Panpu',
  'illustrator:m_ex__liru': 'Sandaowen',
  'illustrator:m_ex__liubiao': 'Guangyu',
  'illustrator:m_ex__liushan': 'Huiju Yitang',
  'illustrator:m_ex__manchong': 'YanBai',
  'illustrator:m_ex__pangde': 'Ningju Yongheng',
  'illustrator:m_ex__pangtong': 'Qingdao Panpu',
  'illustrator:m_ex__panzhangmazhong': 'Ningju Yongheng',
  'illustrator:m_ex__quancong': 'YanBai',
  'illustrator:m_ex__sunce': 'Ningju Yongheng',
  'illustrator:m_ex__sunjian': 'Manxiang Zu',
  'illustrator:m_ex__sunluban': 'Guihuafu',
  'illustrator:m_ex__sunxiu': 'Junhuan Wenhua',
  'illustrator:m_ex__weiyan': 'Keke Yixiu',
  'illustrator:m_ex__wolong': 'YanBai',
  'illustrator:m_ex__wuguotai': 'Li Xiusen',
  'illustrator:m_ex__wuyi': 'Guihua Fu',
  'illustrator:m_ex__xiahoudun': 'Mu Meiren',
  'illustrator:m_ex__xiaoqiao': 'Ningju Yongheng',
  'illustrator:m_ex__xuhuang': 'Bozi',
  'illustrator:m_ex__xunyu': 'Qingdao Panpu',
  'illustrator:m_ex__xusheng': 'Tiechu Wenhua',
  'illustrator:m_ex__yanliangwenchou': 'Ningju Yongheng',
  'illustrator:m_ex__yuanshao': '17 Haogongfang',
  'illustrator:m_ex__yuanshu': 'Moqishi',
  'illustrator:m_ex__yufan': 'YanBai',
  'illustrator:m_ex__yuji': 'Moguiyu',
  'illustrator:m_ex__yujin': 'biou09',
  'illustrator:m_ex__zhangfei': 'Mu Meiren',
  'illustrator:m_ex__zhangjiao': 'LiuHeng',
  'illustrator:m_ex__zhangyi': 'Chengdu Huyu',
  'illustrator:m_ex__zhangzhaozhanghong': 'Huiju Yitang',
  'illustrator:m_ex__zhonghui': 'monkey',
  'illustrator:m_ex__zhoucang': 'Xingyu Zai',
  'illustrator:m_ex__zhoutai': 'Moqishi',
  'illustrator:m_ex__zhuhuan': 'Juyi Gongzuoshi',
  'illustrator:m_ex__zhuran': 'zoo',
  'illustrator:m_ex__zhuzhi': 'Ningju Yongheng',
  'illustrator:m_friend__cuijun': 'Ningju Yongheng',
  'illustrator:m_friend__pangtong': 'zoo',
  'illustrator:m_friend__shitao': 'Ningju Yongheng',
  'illustrator:m_friend__xushu': 'zoo',
  'illustrator:m_friend__zhugeliang': 'zoo',
  'illustrator:m_js__liubei': 'Junhuan Wenhua',
  'illustrator:m_js__sunjian': 'Fanguo',
  'illustrator:m_js__wangyun': 'Fanguo',
  'illustrator:m_liuyi__caozhi': 'Ningju Yongheng',
  'illustrator:m_liuyi__liuhui': 'Ningju Yongheng',
  'illustrator:m_liuyi__luyu': 'Ningju Yongheng',
  'illustrator:m_liuyi__zhangzhi': 'Ningju Yongheng',
  'illustrator:m_liuyi__zhouyu': 'Ningju Yongheng',
  'illustrator:m_shi2__weiyan': 'Ningju Yongheng',
  'illustrator:m_shi3__weiyan': 'Xingyuzai',
  'illustrator:m_shi__chendao': 'Tiechu',
  'illustrator:m_shi__chenzhis': 'Ningju Yongheng',
  'illustrator:m_shi__dengai': '',
  'illustrator:m_shi__guoyuan': 'Tiechu',
  'illustrator:m_shi__huangzu': 'Tiechu',
  'illustrator:m_shi__huanjie': 'Ningju Yongheng',
  'illustrator:m_shi__lusu': 'Tiechu',
  'illustrator:m_shi__luyusheng': 'Shichan',
  'illustrator:m_shi__taishici': 'Tiechu',
  'illustrator:m_shi__tianfeng': 'Ningju Yongheng',
  'illustrator:m_shi__wangchang': 'Guihuafu',
  'illustrator:m_shi__weiyan': 'Ningju Yongheng',
  'illustrator:m_shi__xiahoushang': 'Yunya',
  'illustrator:m_shi__xinxianying': 'Ningju Yongheng',
  'illustrator:m_shi__yuji': 'Tiechu',
  'illustrator:m_shi__zhangyan': 'zoo',
  'illustrator:m_shi__zhonghui': 'Tiechu Wenhua',
  'illustrator:m_sp__caocao': 'Huiju Yitang',
  'illustrator:m_sp__guanqiujian': 'Ningju Yongheng',
  'illustrator:m_sp__simazhao': 'Thinking',
  'illustrator:m_sp__zhenji': 'Tiechu',
  'illustrator:m_thoroughbred__lidian': 'Ningju Yongheng',
  'illustrator:m_thoroughbred__yuejin': 'Ningju Yongheng',
  'illustrator:m_thoroughbred__zhangliao': 'Liuyao',
  'illustrator:majun': 'Juyi_Xiaodaoen',
  'illustrator:maojie': 'Junhuan Wenhua',
  'illustrator:mayuanyi': 'Wandian Keji',
  'illustrator:mazhong': 'Thinking',
  'illustrator:miheng': 'Thinking',
  'illustrator:mobile2__caomao': 'Tiechu',
  'illustrator:mobile2__simazhao': 'Xingyuzai',
  'illustrator:mobile__baosanniang': 'Mizou Zhiyin',
  'illustrator:mobile__baoxin': 'Mengxiangjun',
  'illustrator:mobile__bianfuren': 'Zhizhi Bujiatang',
  'illustrator:mobile__caomao': 'Tiechu',
  'illustrator:mobile__caosong': 'Anyingdao Studio',
  'illustrator:mobile__caoying': 'DH',
  'illustrator:mobile__chendeng': 'Xiaoqiang',
  'illustrator:mobile__chengui': 'Ningju Yongheng',
  'illustrator:mobile__cuilingyi': 'Yingguangbi',
  'illustrator:mobile__cuiyan': 'Jiangren Hui',
  'illustrator:mobile__dengzhi': 'Qi Ming',
  'illustrator:mobile__dongbai': 'Xingyu Zai',
  'illustrator:mobile__dongcheng': 'Huiju Yitang',
  'illustrator:mobile__duyu': 'Guihuafu',
  'illustrator:mobile__feiyi': 'Youman Meihui',
  'illustrator:mobile__furong': 'Anyingdao',
  'illustrator:mobile__ganfuren': 'Cuoluo Yuzhou',
  'illustrator:mobile__gaolan': 'Xingyou',
  'illustrator:mobile__godjiangwei': 'Yunya',
  'illustrator:mobile__godmachao': 'Yunya',
  'illustrator:mobile__godsimayi': 'Shenzhen Xiaotong',
  'illustrator:mobile__guanyinping': 'alien',
  'illustrator:mobile__guozhao': 'Fanguo',
  'illustrator:mobile__hansui': 'Mangte',
  'illustrator:mobile__heqi': 'Baiyeling BYL',
  'illustrator:mobile__huaman': 'alien',
  'illustrator:mobile__huangfusong': 'Guihuafu',
  'illustrator:mobile__huaxin': 'Youman Meihui',
  'illustrator:mobile__huban': 'Tiechu Wenhua',
  'illustrator:mobile__huojun': 'Junhuan Wenhua',
  'illustrator:mobile__jiachong': 'Tiechu Wenhua',
  'illustrator:mobile__jianggan': 'Guihua Fu',
  'illustrator:mobile__jiangji': 'Cuoluo Yuzhou',
  'illustrator:mobile__jiangqin': 'Shen Ying',
  'illustrator:mobile__jikang': 'Heiyu',
  'illustrator:mobile__kongrong': 'Ningju Yongheng',
  'illustrator:mobile__lingju': 'Diqige Juzi',
  'illustrator:mobile__liuba': 'Junhuan Wenhua',
  'illustrator:mobile__liuye': 'Thinking',
  'illustrator:mobile__liwei': 'Junhuan Culture',
  'illustrator:mobile__lougui': 'Tiechu',
  'illustrator:mobile__lvfan': 'Guihuafu',
  'illustrator:mobile__lvkai': 'L',
  'illustrator:mobile__maliang': 'Yunya',
  'illustrator:mobile__mamidi': 'Junhuan Wenhua',
  'illustrator:mobile__mengda': 'Tete Rou',
  'illustrator:mobile__mifuren': 'zoo',
  'illustrator:mobile__qinghegongzhu': 'Ningju Yongheng',
  'illustrator:mobile__shenpei': 'YanBai',
  'illustrator:mobile__simafu': 'Guihuafu',
  'illustrator:mobile__simazhao': 'Xingyu Zai',
  'illustrator:mobile__simazhou': 'Cuoluo Yuzhou',
  'illustrator:mobile__sufei': 'Shichan',
  'illustrator:mobile__sunluyu': 'Guihuafu',
  'illustrator:mobile__sunshao': 'Junhuan Wenhua',
  'illustrator:mobile__wangcan': 'Guihuafu',
  'illustrator:mobile__wangling': 'Xiguo Hongyun',
  'illustrator:mobile__wangshuang': 'Techu Wenhua',
  'illustrator:mobile__wangyuanji': 'Ningju Yongheng',
  'illustrator:mobile__wangyun': 'Guihua Fu',
  'illustrator:mobile__weiwenzhugezhi': 'biou09',
  'illustrator:mobile__wenqin': 'Tiechu',
  'illustrator:mobile__wenyang': 'Guihuafu',
  'illustrator:mobile__wuban': 'Guihuafu',
  'illustrator:mobile__wujing': 'Jiangren Hui',
  'illustrator:mobile__xinpi': 'Guihuafu',
  'illustrator:mobile__xuezong': 'zoo',
  'illustrator:mobile__xugong': 'Junhuan Wenhua',
  'illustrator:mobile__xurong': 'Qingdao Panpu',
  'illustrator:mobile__yanghong': 'Tiechu',
  'illustrator:mobile__yanghu': 'Bai',
  'illustrator:mobile__yanghuiyu': 'Shichan',
  'illustrator:mobile__yangyi': 'Tiechu Wenhua',
  'illustrator:mobile__yanxiang': 'Junhuan Wenhua',
  'illustrator:mobile__yuanshu': 'Yezi',
  'illustrator:mobile__yuejiu': 'Taodan Feizei',
  'illustrator:mobile__zerong': 'Ningju Yongheng',
  'illustrator:mobile__zhangbao': '4250 Gongzuoshi',
  'illustrator:mobile__zhangchangpu': 'Junhuan Wenhua',
  'illustrator:mobile__zhangfen': 'Tiechu',
  'illustrator:mobile__zhanggong': 'B_LEE',
  'illustrator:mobile__zhangjih': 'Ningju Yongheng',
  'illustrator:mobile__zhangqiying': 'Danfei Jiding',
  'illustrator:mobile__zhangwen': 'Ningju Yongheng',
  'illustrator:mobile__zhangyiy': 'Wang Qiang',
  'illustrator:mobile__zhouchu': 'Xiaotong',
  'illustrator:mobile__zhujun': 'Guihuafu',
  'illustrator:mobile_dongjiao__cuilingyi': 'Yingguangbi',
  'illustrator:mobile_xiuge__cuilingyi': 'Yingguangbi',
  'illustrator:muludawang': 'Sandaowen',
  'illustrator:mxing__dongzhuo': 'Ningju Yongheng',
  'illustrator:mxing__fazheng': 'Ningju Yongheng',
  'illustrator:mxing__ganning': 'Wang Qiang',
  'illustrator:mxing__huangzhong': 'Manxiang Zu',
  'illustrator:mxing__weiyan': 'Guihuafu',
  'illustrator:mxing__xuhuang': 'Wang Qiang',
  'illustrator:mxing__zhanghe': 'Wang Qiang',
  'illustrator:mxing__zhangliao': 'Wang Qiang',
  'illustrator:mxing__zhoubuyi': 'Junhuan Wenhua',
  'illustrator:nanhualaoxian': 'Junhuan Wenhua',
  'illustrator:nos__huaxin': 'Fanguo',
  'illustrator:nos__mifuren': 'M Yunya',
  'illustrator:nos__xunchen': 'Guihuafu',
  'illustrator:pangdegong': 'Town',
  'illustrator:pangxi': 'Tiechu',
  'illustrator:peixiu': 'Guihua Fu',
  'illustrator:pengyang': 'Tiechu Wenhua',
  'illustrator:qianzhao': 'Cuoluo Yuzhou',
  'illustrator:qiaogong': 'Ningju Yongheng',
  'illustrator:qiaozhou': 'Jiangrenhui',
  'illustrator:ruanhui': 'Jiangren Hui',
  'illustrator:shichangshi': 'Yuzai',
  'illustrator:shixie': 'Ming zmy',
  'illustrator:sunhao': 'LiuHeng',
  'illustrator:sunru': 'Saya Jiang',
  'illustrator:sunshaow': 'Tiechu',
  'illustrator:sunyi': 'Guihuafu',
  'illustrator:taoqian': 'F.Yuan',
  'illustrator:tongqu__jiakui': 'Fuzhou Anjin',
  'illustrator:wangfuzhaolei': 'Youman Meihui',
  'illustrator:wangjing': 'Ningju Yongheng',
  'illustrator:wangjun': 'Ningju Yongheng',
  'illustrator:wanglang': 'Mingzmy',
  'illustrator:wooden_ox': 'Tete Rou',
  'illustrator:wuke': 'Tiechu',
  'illustrator:xiangchong': 'Ningju Yongheng',
  'illustrator:yangbiao': 'Mu Meiren',
  'illustrator:yangfeng': 'Tiechu Wenhua',
  'illustrator:yangfu': 'Tiechu Culture',
  'illustrator:yanpu': 'Guihua Fu',
  'illustrator:yuanhuan': 'Ningju Yongheng',
  'illustrator:zhangbu': 'Cuoluo Yuzhou',
  'illustrator:zhangzhongjing': 'Guihuafu',
  'illustrator:zhaotongzhaoguang': 'Danfei Jiding',
  'illustrator:zhengxuan': 'monkey',
  'illustrator:zhouqun': 'Zhang Shuai',
  'illustrator:zhugeguo': 'NOVART',
  'illustrator:zhugeke': 'LiuHeng',
  'illustrator:zhujic': 'Xingyuzai',
};
