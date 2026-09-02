return {
  ["standard_ex"] = "Breakthrough-Standard",
  ["ex"] = "BT",
  ["std"] = "Std",

  ["ex__caocao"] = "JIE Cao Cao",
  ["ex__jianxiong"] = "Villainous Hero",
  [":ex__jianxiong"] = "After you suffer damage, can get the card that damaged you and draw 1.",

  ["ex__simayi"] = "JIE Sima Yi",
  ["ex__guicai"] = "Demonic Talent",
  [":ex__guicai"] = "Before a judgment result card takes effect, you can play a card which becomes the result.",
  ["ex__fankui"] = "Retaliation",
  [":ex__fankui"] = "After each unit of DMG you suffer from a hero, you can take 1 of his cards.",

  ["#ex__guicai-ask"] = "Demonic Talent: you can play a card, which becomes the %dest's %arg judge result.",

  ["ex__xiahoudun"] = "JIE Xiahou Dun",
  ["ex__ganglie"] = "Eye for an Eye",
  [":ex__ganglie"] = "After you suffer DMG from a hero, for each unit, you can be judged. If it is red, you DMG him 1. If it is black, you discard him 1 card.",
  ["ex__qingjian"] = "Frugal",
  [":ex__qingjian"] = "1x each hero’s turn, after you get a card outside of your Draw Phase, you can show any card(s) and give them to another hero. This turn, the current hero’s hand limit has +X (X = types of card you give).",
  ["#ex__qingjian_active"] = "Frugal",
  ["#ex__qingjian-invoke"] = "Frugal: you can show any card(s) and give them to another hero. This turn, the current hero’s hand limit has +X (X = types of card you give)",

  ["ex__zhangliao"] = "JIE Zhang Liao",
  ["ex__tuxi"] = "Sudden Strike",
  [":ex__tuxi"] = "At Draw Phase, you can draw X fewer cards. Then choose X heroes and take a hand card from each of them.",
  ["#ex__tuxi-choose"] = "Sudden Strike: you can draw up to %arg fewer cards. Then choose X heroes and take a hand card from each of them",

  ["ex__xuchu"] = "JIE Xu Chu",
  ["ex__luoyi"] = "Bare Chested",
  [":ex__luoyi"] = "At start of Draw Phase, you can show the top 3 cards, then you can get all weapons, Duel and basic cards shown, if you do so, skip this phase and until the start of your next turn when you are the source of Slash and Duel you deal +1 DMG.",

  ["ex__luoyi_get"] = "get all weapons, Duel and basic cards from shown",
  ["@@ex__luoyi"] = "Bare.",
  ["ex__luoyi_delay"] = "Bare Chested",

  ["ex__guojia"] = "JIE Guo Jia",
  ["ex__yiji"] = "Bequeathed Strategy",
  [":ex__yiji"] = "After you suffer DMG, for each unit, can draw 2 cards. If you do so, you can give up to 2 hand cards to up to 2 other heroes.",
  ["#ex__yiji-give"] = "Bequeathed Strategy: give up to %arg cards to up to 2 other heroes",

  ["ex__zhenji"] = "JIE Zhen Ji",
  ["ex__luoshen"] = "Goddess Luo",
  [":ex__luoshen"] = "At Beginning Phase, can be judged. If the result is black, get it and can repeat. The cards obtained this way become hand limitless this turn",

  ["@@ex__luoshen-inhand-turn"] = "Luo.",

  ["lidian"] = "Li Dian",
  ["xunxun"] = "Sincerity",
  [":xunxun"] = "At start of Draw Phase, can see the top 4 cards, put 2 of them atop the deck in any order and the rest on the bottom.",
  ["wangxi"] = "Forget Grudges",
  [":wangxi"] = "After you deal/suffer DMG to/by a hero, for each unit, you can draw 1 → the other hero will also draw 1.",
  ["#wangxi-invoke"] = "Forget Grudges: you can draw 1 → %dest will also draw 1",

  ["ex__liubei"] = "JIE Liu Bei",
  ["ex__rende"] = "Benevolence",
  [":ex__rende"] = "1 x Action Phase x hero, can give any hand card(s) to other heroes. When you give the 2nd card this way, you can view it as using any basic card.",

  ["#ex__rende-ask"] = "Benevolence: you can view it as using any basic card",

  ["ex__guanyu"] = "JIE Guan Yu",
  ["ex__wusheng"] = "Warrior Saint",
  [":ex__wusheng"] = "Can use/play any red cards as Sha. Your <font color='red'>♦</font> Slash are rangeless.",
  ["ex__yijue"] = "Absolute Loyalty",
  [":ex__yijue"] = "1x Action Phase, you can discard a card and choose another hero to show a hand card, if it’s:"..
  "<br>▪ black, he cannot use/play any cards from his hand neither optional hero skills for the rest of the turn. If you use <font color='red'>♥</font> Slash on him, it has +1 DMG."..
  "<br>▪ red, you take it, and then you can heal him 1.",
  ["@@yijue-turn"] = "A. Loyal",
  ["#yijue-show"] = "Absolute Loyalty: show a hand card",
  ["#yijue-recover"] = "Absolute Loyalty: you can heal %dest 1",

  ["ex__zhangfei"] = "JIE Zhang Fei",
  ["ex__paoxiao"] = "Roar",
  [":ex__paoxiao"] = "(forced) You can use unlimited Sha. If your Slash is dodged the next time you deal Slash DMG this turn, it has +1 DMG.",
  ["ex__tishen"] = "Stand-in",
  [":ex__tishen"] = "(limited) At Beginning Phase, you can heal X and then draw X cards. X = #wounds.",
  ["@paoxiao-turn"] = "Roar",
  ["#ex__paoxiao_trigger"] = "Roar",
  ["#tishen-invoke"] = "Stand-in: you can heal %arg and then draw %arg cards",

  ["ex__zhugeliang"] = "JIE Zhuhe Liang",
  ["ex__guanxing"] = "Stargaze",
  [":ex__guanxing"] = "At Beginning Phase, can see the top 5 cards (3 if there are less than 4 survivors) and place them in any order on the top or the bottom. If you put all them on the bottom, you can activate this skill again at End Phase.",

  ["ex__zhaoyun"] = "JIE Zhao Yun",
  ["ex__longdan"] = "Dragon Heart",
  [":ex__longdan"] = "Can use/play Slash as Dodge, Dodge as Sha, Wine as Peach and Peach as Wine.",
  ["yajiao"] = "Edge of the world",
  [":yajiao"] = "When you use/play a hand card outside of your turn, you can show the top card. If it is the same type as the one you just used/played, you can give it to a hero. If not, you can discard a card in any area of a hero in range.",
  ["#yajiao-choose"] = "Edge of the world: you can discard a card in any area of a hero in range",
  ["#yajiao-card"] = "Edge of the world: you can give %arg to a hero",

  ["ex__machao"] = "JIE Ma Chao",
  ["ex__tieji"] = "Iron Cavalry",
  [":ex__tieji"] = "After you use Slash, you can invalidate the target’s non-forced skills this turn, then you can be judged, unless he discards a card of the same suit as the judgment result, he cannot dodge it.",
  ["ex__tieji_invalidity"] = "Iron Cavalry",
  ["@@tieji-turn"] = "Iron C.",
  ["#ex__tieji-discard"] = "Iron Cavalry: discard a %arg card, or you cannot dodge this slash",

  ["ex__huangyueying"] = "JIE Huang Yueying",
  ["ex__jizhi"] = "Wisdom",
  [":ex__jizhi"] = "When you use a non-converted trick, you can draw 1 → if that card is basic card, you can discard it, +1 hand limit this turn.",
  ["ex__qicai"] = "Genius",
  [":ex__qicai"] = "(forced) Your trick cards are distanceless. Other heroes cannot discard your equipped armor and treasure.",
  ["@jizhi-turn"] = "Wisdom",

  ["#ex__qicai_move"] = "Genius",
  ["#cancelDismantle"] = "Due to %arg, %card is prevented from being discarded",
  ["#jizhi-invoke"] = "Wisdom: you can discard %arg, then you +1 hand limit this turn",

  ["std__xushu"] = "Xu Shu",
  ["zhuhai"] = "Punishment",
  [":zhuhai"] = "At other hero’s End Phase, if he dealt DMG his turn, you can use Slash on him.",
  ["qianxin"] = "Painstakingly Intelligent",
  [":qianxin"] = "(awaken) After you deal DMG, if you are wounded, then -1 maxHP and gain Suggest.",
  ["jianyan"] = "Suggest",
  [":jianyan"] = "1x Action Phase, can choose a card type or color and show cards from the top until a card matches→ give it to a male hero.",

  ["#zhuhai-ask"] = "Punishment: you can use Slash on %src",
  ["#jianyan-give"] = "Suggest: you can give %arg to a male hero",

  ["yijik"] = "Yi Ji",
  ["jijie"] = "Nimble Improvisation ",
  [":jijie"] = "1x Action Phase, you can see a card at the bottom of the deck, and then give it to a hero.",
  ["jiyuan"] = "Emergency Aid",
  [":jiyuan"] = "When a hero enters the brink-of-death or when you give a card to another hero, you can make that hero draw 1.",

  ["#jijie-give"] = "Nimble Improvisation: give %arg to a hero",
  ["#jiyuan-trigger"] = "Emergency Aid: you can make %dest draw 1",

  ["ex__sunquan"] = "Sun Quan",
  ["ex__zhiheng"] = "Balance of Power",
  [":ex__zhiheng"] = "1x Action Phase can discard any # of cards (=X) and draw X. If you discarded all your hand cards this way, draw +1 card.",
  ["ex__jiuyuan"] = "Rescued",
  [":ex__jiuyuan"] = "(lord) When another Wu is healed, if his HP ≥ yours & you are wounded, he can choose to heal you 1 instead → he draws 1.",
  ["#ex__jiuyuan-ask"] = "Rescued: you can choose to heal %dest 1 instead → you draw 1",

  ["ex__ganning"] = "Gan Ning",
  ["fenwei"] = "Prestige",
  [":fenwei"] = "(limited) when a hero uses a trick that targets > 1 heroes, you can prevent that card from targeting any # of the heroes that are targeted.",
  ["#fenwei-choose"] = "Prestige: you can prevent %arg from targeting any # of the heroes that are targeted",

  ["ex__lvmeng"] = "Lv Meng",
  ["qinxue"] = "Diligence",
  [":qinxue"] = "(awaken) At Beginning Phase, if hand cards ≥ HP+3, (or hand ≥ HP+2 if 7+ survivors), -1 maxHP and gain Strike at the Heart",

  ["ex__huanggai"] = "Huang Gai",
  ["ex__kurou"] = "Trojan Flesh",
  [":ex__kurou"] = " 1x Action Phase, you can discard a card and lose 1 HP.",
  ["zhaxiang"] = "False Surrender",
  [":zhaxiang"] = "(forced) After you lose HP, for each unit, draw 3 cards. If it is during Action Phase: ▪ you can use +1 Slash, ▪ your red Slash are rangeless & cannot be dodged.",
  ["#zhaxiangHit"] = "False Surrender",

  ["ex__zhouyu"] = "Zhou Yu",
  ["ex__yingzi"] = "Handsome",
  [":ex__yingzi"] = "(forced) During Draw Phase draw an extra card. Your hand limit = your maxHP.",
  ["ex__fanjian"] = "Sow Dissension",
  [":ex__fanjian"] = "1x Action Phase, can show a hand card and give it to another hero. He must then either lose 1 HP or show his entire hand and discard the card you just gave him and all cards of the same suit.",
  ["ex__fanjian_show"] = "show entire hand and discard all cards of the same suit",

  ["ex__daqiao"] = "Da Qiao",
  ["ex__guose"] = "National Beauty",
  [":ex__guose"] = "1x Action Phase, you can choose: a) use a <font color='red'>♦</font> card as Indulgence; b) discard a <font color='red'>♦</font> Indulgence on the field. Then, draw 1.",
  ["ex__guose_use"] = "Use Indulgence",
  ["ex__guose_throw"] = "Discard Indulgence",

  ["ex__luxun"] = "Lu Xun",
  ["ex__qianxun"] = "Humility",
  [":ex__qianxun"] = "When a delayed or normal trick used by another hero takes effect on you, if you are the only target, you can put all hand cards beside your hero → at the end of the current turn you get these cards.",
  ["ex__lianying"] = "One After Another",
  [":ex__lianying"] = "After you lose hand cards, if you have no hand card, you can choose up to X heroes, each of them draws 1. (X = cards you lost).",
  ["#ex__lianying-invoke"] = "One After Another: you can let up to %arg heroes draw 1",

  ["#ex__qianxun_delay"] = "Humility",

  ["ex__sunshangxiang"] = "Sun Shangxiang",
  ["ex__jieyin"] = "Marriage",
  [":ex__jieyin"] = "1x Action Phase, can choose a male hero and discard a hand card or place an equipment in his equipment area → if his HP < yours, you draw 1 and he heals 1; if his HP > yours, he draws 1 and you heal 1.",
  ["PutIntoEquipArea"] = "Put into his equipment area",
  ["Discard"] = "Discard",

  ["ex__huatuo"] = "Hua Tuo",
  ["ex__chuli"] = "Remove Ulcer",
  [":ex__chuli"] = "1x Action Phase, if you have hand cards, you can choose any # of other heroes from different kingdoms; then, you discard 1 of your cards and 1 of each of them. Then, each hero that discarded ♠ draws 1.",

  ["ex__lvbu"] = "Lü Bu",
  ["liyu"] = "Controlled for Profit",
  [":liyu"] = "After you DMG another hero using Sha, you can take a card in his area → if it’s: ▪ not equipment, he draws 1; ▪ equipment, view it as you using Duel on another hero chosen by him.",

  ["#liyu-invoke"] = "Controlled for Profit: you can take a card in %dest's area'",
  ["#liyu-ask"] = "Controled for Profit: choose a hero, viewing as %src using Duel on him",

  ["ex__diaochan"] = "Diao Chan",
  ["ex__biyue"] = "Envious by Moon",
  [":ex__biyue"] = "At End Phase you can draw 1. If you don’t have any hand card, draw 2 instead.",

  ["std__huaxiong"] = "Hua Xiong",
  ["yaowu"] = "Military Glory",
  [":yaowu"] = "(forced) When you suffer DMG from Slash, if that Slash is: ▪ red, source draws 1 or heal 1; ▪ not red, you draw 1.",

  ["std__yuanshu"] = "Yuan Shu",
  ["wangzun"] = "Treason",
  [":wangzun"] = "At lord’s Beginning Phase, you can draw 1 → he has -1 hand limit this turn.",
  ["tongji"] = "Diseased",
  [":tongji"] = "(forced) If # hand cards > HP, heroes who have you in their range must target you with every Slash they use.",

  ["std__gongsunzan"] = "Gongsun Zan",
  ["qiaomeng"] = "Fierce Mount",
  [":qiaomeng"] = "When you use black Slash, after you DMG a hero, you can discard a card in any of his areas. After the card goes into the discard pile, if it is a horse, you get it.",

  ["#qiaomeng_get"] = "Fierce Mount",

  ["std__panfeng"] = "Pan Feng",
  ["std__kuangfu"] = "Mad Axe",
  [":std__kuangfu"] = "(forced) After you DMG your target using Sha, if it's in your Action Phase and you don’t activated this skill yet, when his HP is: ▪ < yours, you draws 2; ▪ ≥ yours, you lose 1 HP.",

}