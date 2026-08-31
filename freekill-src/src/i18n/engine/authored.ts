/**
 * The English the engine does not ship.
 *
 * Upstream `en_US` covers 681 of the 1,368 keys the `zh_CN` table defines. These
 * are the other 691, translated from the Chinese. THIS FILE IS THE ONLY PLACE
 * IN THE TRANSLATION LAYER A HUMAN WROTE ENGLISH PROSE; a native speaker
 * reviewing this work only needs to read this file and `./overrides.ts`.
 *
 * TERMINOLOGY. Consistency with the half upstream already rendered matters more
 * than elegance, so every game term below follows upstream's own choice even
 * where a nicer one exists:
 *
 *   杀 Slash          闪 Dodge           桃 Peach          酒 Alcohol
 *   判定 judgement    判定区 judgement area                拼点 point fight
 *   伤害 DMG          体力 HP            体力上限 max HP    手牌 hand card
 *   距离 distance     攻击范围 ATK range 牌堆 draw pile     弃牌堆 discard pile
 *   角色 player       武将 character     锁定技 (forced)    重铸 recast
 *   准备阶段 Prepare phase   判定阶段 Judge phase   摸牌阶段 Draw phase
 *   出牌阶段 Action phase    弃牌阶段 Discard phase  结束阶段 Finish phase
 *   主公 Lord  忠臣 Loyalist  反贼 Rebel  内奸 Renegade
 *
 * Log templates keep the engine's placeholders exactly — `%from`, `%to`, `%src`,
 * `%dest`, `%arg`, `%argN`, `%card`, `%s`, `%1` — and keep the same *number* of
 * them, because `processPrompt` (src/room/ltk/prompt.ts) substitutes positionally.
 * Changing a placeholder here silently breaks a log line.
 *
 * Two conventions are inherited from upstream even though they read oddly:
 * "Sliver Lion" (upstream's spelling of 白银狮子) and the `*Wei*` asterisks on
 * kingdom names. See `./overrides.ts` for the handful of upstream strings that
 * are broken rather than merely odd.
 */
import type { TranslationTable } from '../types';

export const AUTHORED_EN_US: TranslationTable = {
  /* ------------------------------------------------------------------------
   * Character subtitles (称号). One per playable character; shown under the
   * name on the portrait and in the overview sheet.
   * ---------------------------------------------------------------------- */
  '#caocao': 'Martial Emperor of Wei',
  '#daqiao': 'The Demure Flower',
  '#diaochan': 'The Peerless Dancer',
  '#ganning': 'The Brocade Sail Ranger',
  '#guanyu': 'Lord of the Magnificent Beard',
  '#guojia': 'The Prophet Who Died Young',
  '#huanggai': 'Life Held Cheap for the Kingdom',
  '#huangyueying': 'The Brilliant Woman in Seclusion',
  '#huatuo': 'The Divine Physician',
  '#liubei': 'Ambitious Hero of a Chaotic Age',
  '#luxun': 'Scholar of Great Talent',
  '#lvbu': 'The Incarnation of Valour',
  '#lvmeng': 'Crossing the River in White',
  '#machao': 'One Rider Worth a Thousand',
  '#simayi': 'The Wolf-Gazing Demon',
  '#sunquan': 'The Young Wise Lord',
  '#sunshangxiang': 'The Bow-Waist Princess',
  '#xiahoudun': 'The One-Eyed Rakshasa',
  '#xuchu': 'The Tiger Fool',
  '#zhangfei': 'A Match for Ten Thousand',
  '#zhangliao': 'General of the Vanguard',
  '#zhaoyun': 'The Young General',
  '#zhenji': 'The Ill-Fated Beauty',
  '#zhouyu': 'Grand Commander',
  '#zhugeliang': 'The Chancellor in His Twilight',

  /* ------------------------------------------------------------------------
   * Death lines (阵亡台词). Flavour text spoken when a character dies.
   * ---------------------------------------------------------------------- */
  '~caocao': 'My great work — unfinished! Unfinished!',
  '~daqiao': 'Bofu... I am coming...',
  '~diaochan': 'Father... forgive me...',
  '~ganning': 'Twenty years from now, I shall be a hero once again...',
  '~guanyu': 'What? This place is called Maicheng?',
  '~guojia': 'Cough... cough...',
  '~huanggai': 'Too much... blood lost...',
  '~huangyueying': 'Liang...',
  '~huatuo': 'A physician... cannot heal himself...',
  '~liubei': 'So this is the Peach Garden?',
  '~luxun': 'I was still too young...',
  '~lvbu': 'Impossible...!',
  '~lvmeng': 'So I was seen through...',
  '~machao': '(hoofbeats fading into the distance)',
  '~mouxusheng': 'In the next life, may I serve Jiangdong once more...',
  '~simayi': 'Is the will of Heaven truly beyond defying?',
  '~sunquan': 'Father, elder brother — Zhongmou has failed you...',
  '~sunshangxiang': 'No... I cannot die yet...',
  '~xiahoudun': 'Now I can see out of neither eye...',
  '~xuchu': 'Cold... so cold...',
  '~zhangfei': 'I truly... cannot fight any more...',
  '~zhangliao': 'I truly never expected this...',
  '~zhaoyun': 'So this... is the taste of defeat?',
  '~zhenji': 'I mourn a happy meeting forever ended, and grieve to depart into a foreign land.',
  '~zhouyu': 'Since Heaven made Yu, why did it also make...',
  '~zhugeliang': 'The general’s star has fallen; the mandate of Heaven cannot be defied.',

  /* ------------------------------------------------------------------------
   * Artist credits. Latin already — inherited verbatim from the zh_CN table,
   * which is where the packages ship them.
   * ---------------------------------------------------------------------- */
  'illustrator:caocao': 'KayaK',
  'illustrator:daqiao': 'KayaK',
  'illustrator:diaochan': 'KayaK',
  'illustrator:ganning': 'KayaK',
  'illustrator:guanyu': 'KayaK',
  'illustrator:guojia': 'KayaK',
  'illustrator:huanggai': 'KayaK',
  'illustrator:huangyueying': 'KayaK',
  'illustrator:huatuo': 'KayaK',
  'illustrator:liubei': 'KayaK',
  'illustrator:luxun': 'KayaK',
  'illustrator:lvbu': 'KayaK',
  'illustrator:lvmeng': 'KayaK',
  'illustrator:machao': 'KayaK',
  'illustrator:simayi': 'KayaK',
  'illustrator:sunquan': 'KayaK',
  'illustrator:sunshangxiang': 'KayaK',
  'illustrator:xiahoudun': 'KayaK',
  'illustrator:xuchu': 'KayaK',
  'illustrator:zhangfei': 'KayaK',
  'illustrator:zhangliao': 'KayaK',
  'illustrator:zhaoyun': 'KayaK',
  'illustrator:zhenji': 'KayaK',
  'illustrator:zhouyu': 'KayaK',
  'illustrator:zhugeliang': 'KayaK',

  /* ------------------------------------------------------------------------
   * Voice-line subtitles (`$<skill><n>`). Shown under the portrait when the
   * skill's audio plays. Flavour, not rules: read for tone, not precision.
   * ---------------------------------------------------------------------- */
  '$biyue1': 'Pardon my rudeness~',
  '$biyue2': 'Envious, are you~',
  '$change_hero': 'The enemy is fierce of face and hollow within — raise a false city and drive them off!',
  '$cheat': 'Haaa!',
  '$control': 'The general takes the field — breach the passes, mow down the cities!',
  '$damage_maker': 'A paltry few hundred Wei troops — watch me wipe them out in a single blow!',
  '$fanjian1': 'Struggle, then — in the abyss of blood and darkness!',
  '$fanjian2': 'Suffer, then — in the hell of spite and hatred!',
  '$fankui1': 'Be more careful next time.',
  '$fankui2': 'Live by the sword, pay by the sword.',
  '$ganglie1': 'Vermin — how dare you wound me!',
  '$ganglie2': 'Repay a man in his own coin!',
  '$guanxing1': 'Read tonight’s heavens, and know the fate of the realm.',
  '$guanxing2': 'Knowing Heaven is easy; defying Heaven is hard.',
  '$guicai1': 'The mandate of Heaven? Hahahaha...',
  '$guicai2': 'I am the son of Heaven’s mandate!',
  '$guose1': 'Do take your rest.',
  '$guose2': 'You are tired.',
  '$hujia1': 'Guards! Protect your lord!',
  '$hujia2': 'Where are the generals of Wei?',
  '$jianxiong1': 'Better that I wrong the world than that the world wrong me!',
  '$jianxiong2': 'I am fond of killing in my sleep!',
  '$jieyin1': 'My husband, your health comes first.',
  '$jieyin2': 'If he is well, so am I.',
  '$jijiang1': 'Where are the generals of Shu?',
  '$jijiang2': 'Do you dare answer the challenge?',
  '$jijiu1': 'Steady now — this old man is here.',
  '$jijiu2': 'To save one life is worth more than raising a seven-storey pagoda.',
  '$jiuyuan1': 'With you to aid me, all is well!',
  '$jiuyuan2': 'How very comforting.',
  '$jizhi1': 'Heh heh~',
  '$jizhi2': 'Hmph~',
  '$keji1': 'Vengeance is never forgone — only its hour has not come!',
  '$keji2': 'While the green hills remain, there will be firewood to burn!',
  '$kongcheng1': '(a lilting phrase on the zither)',
  '$kongcheng2': '(a low phrase on the zither)',
  '$kurou1': 'Lay on the whip, Gongjin!',
  '$kurou2': 'Through fire and boiling water — I shall not refuse!',
  '$lianying1': 'Cards are not everything, but with no cards you can do nothing at all.',
  '$lianying2': 'The old must go before the new can come.',
  '$lijian1': 'Mm, hehe~~ hehe~~',
  '$lijian2': 'My lord, you must take my part...',
  '$liuli1': 'I leave it to you.',
  '$liuli2': 'You take it~',
  '$longdan1': 'To advance and to withdraw at will — there is the true weapon!',
  '$longdan2': 'I am Zhao Zilong of Changshan!',
  '$luoshen1': 'Dim, as the moon veiled by a drifting cloud.',
  '$luoshen2': 'Adrift, as snow whirled up by the streaming wind.',
  '$luoyi1': 'Off with it!',
  '$luoyi2': 'Who will trade three hundred bouts with me?',
  '$paoxiao1': 'Aaargh~~~!',
  '$paoxiao2': 'Zhang Fei of Yan stands here!',
  '$qianxun1': 'A scholar stands clear of the dust; he does not chase ease and indulgence.',
  '$qianxun2': 'A modest gentleman will not drink from the Thief’s Spring.',
  '$qingguo1': 'Treading the waves in tiny steps, her silk stockings stirring the dust.',
  '$qingguo2': 'Swift as a startled duck in flight, elusive as a spirit.',
  '$qingnang1': 'Early to bed and early to rise — that is how life is nurtured.',
  '$qingnang2': 'The older you get, the more mending you need.',
  '$qixi1': 'Take this!',
  '$qixi2': 'You have far too many cards!',
  '$rende1': 'Win men over by virtue.',
  '$rende2': 'Only the worthy and the virtuous can win men’s hearts.',
  '$test_zhenggong': 'My feint has already broken the enemy’s nerve — how would they dare come close!',
  '$tiandu1': 'So be it.',
  '$tiandu2': 'Oh?',
  '$tieqi1': 'All forces, charge!',
  '$tieqi2': '(hoofbeats and the neighing of horses)',
  '$tuxi1': 'Hmph — you did not see that coming!',
  '$tuxi2': 'I will take that!',
  '$wusheng1': 'Guan Yu stands here — prepare to die!',
  '$wusheng2': 'You may as well tie on a tag and sell me your head!',
  '$wushuang1': 'Who can stand against me!',
  '$wushuang2': 'If a god blocks me I kill the god; if a buddha blocks me I kill the buddha!',
  '$xiaoji1': 'Hmph!',
  '$xiaoji2': 'See what I can do!',
  '$yiji1': 'Very well.',
  '$yiji2': 'Enough of it.',
  '$yingzi1': 'Hahahaha...',
  '$yingzi2': 'Watch closely, all of you!',
  '$zhiheng1': 'Allow me to think it over.',
  '$zhiheng2': 'One moment.',

  /* ------------------------------------------------------------------------
   * System log lines that happen to live under `$`. Placeholders are load
   * bearing — `%s` here is filled by the server, not by processPrompt.
   * ---------------------------------------------------------------------- */
  '$$TurnOverCard': '%from shows',
  '$AddObserver': 'Player <b>%s</b> started observing',
  '$PutCardNoFrom': '%arg2 card(s) %card were placed into %arg',
  '$PutToDiscard': '%arg card(s) %card were put into the discard pile',
  '$RemoveObserver': 'Observer <b>%s</b> left the room',
  '$RoomConfigChanged': 'The room settings have changed — please ready up again!',
  '$ShuffleDrawPile': 'The deck was reshuffled; the draw pile now holds %arg card(s)',
  '$TurnOverCardFromDrawPile': '%from revealed %arg card(s) %card',
  '$ViewCardFromDrawPile': '%from viewed %arg card(s)',
  '$ViewCards': 'Please view the cards',
  '$ViewCardsFrom': 'Please view %src’s cards',

  /* ------------------------------------------------------------------------
   * Equipment trigger labels (`##<equip>_skill_<n>_<kind>`). The engine derives
   * these at load time as `translate(<skill name>)`, so the right English is
   * simply the card's own name. Several are broken in zh_CN too (they render as
   * the raw `#<name>_skill` key); English gives the card name instead.
   * ---------------------------------------------------------------------- */
  '##axe_skill_1_trig': 'Axe',
  '##blade_skill_1_trig': 'Blade',
  '##chitu_skill_1_distance': 'Chi Tu',
  '##crossbow_skill_1_trig': 'Crossbow',
  '##crossbow_skill_2_targetmod': 'Crossbow',
  '##dayuan_skill_1_distance': 'Da Yuan',
  '##dilu_skill_1_distance': 'Di Lu',
  '##double_swords_skill_1_trig': 'Double Sword',
  '##eight_diagram_skill_1_trig': 'Eight Diagram',
  '##eight_diagram_skill_2_trig': 'Eight Diagram',
  '##fan_skill_1_trig': 'Fan',
  '##guding_blade_skill_1_trig': 'Ancient Scimitar',
  '##halberd_skill_1_trig': 'Halberd',
  '##halberd_skill_2_targetmod': 'Halberd',
  '##hualiu_skill_1_distance': 'Hua Liu',
  '##ice_sword_skill_1_trig': 'Ice Sword',
  '##jueying_skill_1_distance': 'Jue Ying',
  '##kylin_bow_skill_1_trig': 'Kylin Bow',
  '##nioh_shield_skill_1_trig': 'Nioh Shield',
  '##qinggang_sword_skill_1_trig': 'Qinggang Sword',
  '##qinggang_sword_skill_2_trig': 'Qinggang Sword',
  '##qinggang_sword_skill_3_trig': 'Qinggang Sword',
  '##qinggang_sword_skill_4_trig': 'Qinggang Sword',
  '##qinggang_sword_skill_5_trig': 'Qinggang Sword',
  '##qinggang_sword_skill_6_trig': 'Qinggang Sword',
  '##silver_lion_skill_1_trig': 'Sliver Lion',
  '##silver_lion_skill_2_trig': 'Sliver Lion',
  '##vine_skill_1_trig': 'Vine',
  '##vine_skill_2_trig': 'Vine',
  '##zhuahuangfeidian_skill_1_distance': 'Zhua Huang Fei Dian',
  '##zixing_skill_1_distance': 'Zi Xing',

  /* ------------------------------------------------------------------------
   * Card-effect labels (`#<card>_skill_1_cardskill`). Same derivation as above.
   * zh_CN leaves most of these as the raw identifier; English uses the card name.
   * ---------------------------------------------------------------------- */
  '#amazing_grace_skill_1_cardskill': 'Amazing Grace',
  '#analeptic_skill_1_cardskill': 'Alcohol',
  '#archery_attack_skill_1_cardskill': 'Archery Attack',
  '#collateral_skill_1_cardskill': 'Collateral',
  '#default_card_skill_1_cardskill': 'Card',
  '#default_equip_skill_1_cardskill': 'Equip',
  '#dismantlement_skill_1_cardskill': 'Dismantlement',
  '#duel_skill_1_cardskill': 'Duel',
  '#ex_nihilo_skill_1_cardskill': 'Ex Nihilo',
  '#fire__slash_skill_1_cardskill': 'Fire Slash',
  '#fire_attack_skill_1_cardskill': 'Fire Attack',
  '#god_salvation_skill_1_cardskill': 'God Salvation',
  '#indulgence_skill_1_cardskill': 'Indulgence',
  '#iron_chain_skill_1_cardskill': 'Iron Chain',
  '#jink_skill_1_cardskill': 'Dodge',
  '#lightning_skill_1_cardskill': 'Lightning',
  '#nullification_skill_1_cardskill': 'Nullification',
  '#peach_skill_1_cardskill': 'Peach',
  '#savage_assault_skill_1_cardskill': 'Savage Assault',
  '#slash_skill_1_cardskill': 'Slash',
  '#snatch_skill_1_cardskill': 'Snatch',
  '#supply_shortage_skill_1_cardskill': 'Supply Shortage',
  '#thunder__slash_skill_1_cardskill': 'Thunder Slash',

  /* ------------------------------------------------------------------------
   * Skill trigger labels (`#<skill>_<n>_<kind>`). The badge shown on the
   * portrait when a skill fires, and the entry in the game log's skill column.
   * Every one of these is the skill's own name; the English is upstream's name
   * for that skill so the badge matches the skill panel.
   * ---------------------------------------------------------------------- */
  '#analeptic_skill_2_trig': 'Alcohol',
  '#analeptic_skill_3_trig': 'Alcohol',
  '#armor_invalidity_1_invalidity': 'Armor Invalidated',
  '#biyue_1_trig': 'Envious by Moon',
  '#change_hero_1_active': 'Change Hero',
  '#cheat_1_active': 'Cheat',
  '#choose_cards_skill_1_active': 'Choose Cards',
  '#choose_players_skill_1_active': 'Choose Players',
  '#choose_players_to_move_card_in_board_1_active': 'Choose Players',
  '#control_1_active': 'Control',
  '#damage_maker_1_active': 'Damage Maker',
  '#discard_skill_1_active': 'Discard',
  '#distribution_select_skill_1_active': 'Choose',
  '#ex__choose_skill_1_active': 'Choose',
  '#fanjian_1_active': 'Sow Dissension',
  '#fankui_1_trig': 'Retaliation',
  'Game Rule': 'Game Rule',
  '#game_rule_1_trig': 'Game Rule',
  '#game_rule_2_trig': 'Game Rule',
  '#game_rule_3_trig': 'Game Rule',
  '#game_rule_4_trig': 'Game Rule',
  '#game_rule_5_trig': 'Game Rule',
  '#ganglie_1_trig': 'Eye for an Eye',
  '#guanxing_1_trig': 'Stargaze',
  '#guicai_1_trig': 'Demonic Talent',
  '#guose_1_active': 'National Beauty',
  '#hujia_1_trig': 'Royal Escort',
  '#hujia_2_trig': 'Royal Escort',
  '#jianxiong_1_trig': 'Villainous Hero',
  '#jieyin_1_active': 'Marriage',
  '#jijiang_1_active': 'Rouse',
  '#jijiu_1_active': 'First Aid',
  '#jiuyuan_1_trig': 'Rescued',
  '#jizhi_1_trig': 'Wisdom',
  '#keji_1_trig': 'Self Mastery',
  '#kongcheng_1_trig': 'Empty Fort',
  '#kongcheng_2_prohibit': 'Empty Fort',
  '#kurou_1_active': 'Trojan Flesh',
  '#lianying_1_trig': 'One After Another',
  '#lijian_1_active': 'Seed of Animosity',
  '#liuli_1_trig': 'Shirk',
  '#longdan_1_active': 'Dragon Heart',
  '#luoshen_1_trig': 'Goddess Luo',
  '#luoshen_2_trig': 'Goddess Luo',
  '#luoyi_1_trig': 'Bare Chested',
  '#luoyi_2_trig': 'Bare Chested',
  '#mashu_1_distance': 'Horsemanship',
  '#max_cards_skill_1_maxcards': 'Hand Limit',
  '#paoxiao_1_trig': 'Roar',
  '#paoxiao_2_targetmod': 'Roar',
  '#qianxun_1_prohibit': 'Humility',
  '#qicai_1_targetmod': 'Genius',
  '#qingguo_1_active': 'Helen of Troy',
  '#qingnang_1_active': 'Green Salve',
  '#qixi_1_active': 'Surprise Raid',
  '#recast_1_active': 'Recast',
  '#rende_1_active': 'Benevolence',
  '#reveal_prohibited_1_invalidity': 'Reveal Prohibited',
  '#reveal_skill&_1_active': 'Reveal Character',
  '#spear_skill&_1_active': 'Spear',
  '#spin_skill_1_active': 'Choose',
  '#test_rende_1_active': 'Give Cards',
  '#test_zhenggong_1_trig': 'Quick Test',
  '#test_zhijian_1_active': 'Equip Up',
  '#tiandu_1_trig': 'Envy of Heaven',
  '#tieqi_1_trig': 'Iron Cavalry',
  '#tuxi_1_trig': 'Sudden Strike',
  '#uncompulsory_invalidity_1_invalidity': 'Optional Skills Invalidated',
  '#userealcard_skill_1_active': 'Choose',
  '#virtual_viewas_1_active': 'Choose',
  '#wusheng_1_active': 'Warrior Saint',
  '#wushuang_1_trig': 'Without Equal',
  '#wushuang_2_trig': 'Without Equal',
  '#xiaoji_1_trig': 'Warrior Lady',
  '#yiji_1_trig': 'Bequeathed Strategy',
  '#yingzi_1_trig': 'Handsome',
  '#zhiheng_1_active': 'Balance of Power',

  /* ------------------------------------------------------------------------
   * Game log templates and prompts (`#…`). These are the lines the server emits
   * into the battle log. Placeholder names and counts match the Chinese exactly.
   * Phrasing follows the log lines upstream already renders (`#Damage`,
   * `#InvokeSkill`, `#TargetAdded`) so the log reads as one voice.
   * ---------------------------------------------------------------------- */
  '#AbortArea': '%from’s %arg was abolished',
  '#AddNewArea': '%from gained a new %arg',
  '#AddTargetsBySkill': 'Due to the effect of %arg, the %arg2 used by %from gained the target %to',
  '#AskForPlayCard': '%arg: please use a card',
  '#AskToChooseToMoveCardInBoard': '%arg: please move a card on the table',
  '#ChangeController': '%from is now controlled by player %arg',
  '#Choice': '%from chose %arg',
  '#DestructCards': '%card was destroyed',
  '#EquipmentChoice': '%arg',
  '#GameEventDamage': 'Damage event: %to dealt %arg %arg2 DMG to %from',
  '#GameEventDamageNoFrom': 'Damage event: %from took %arg %arg2 DMG',
  '#GameEventSkill': 'Skill event: %from used skill "%arg"',
  '#GameEventSkillTos': 'Skill event: %from used skill "%arg" to %to',
  '#GameRuleReplaceEquipment': 'Please choose the area to place it in',
  '#PreventDamage': 'Due to %arg, the %arg2 DMG %to was about to deal to %from was prevented',
  '#PreventDamageWithNoFrom': 'Due to %arg, the %arg2 DMG %from was about to take was prevented',
  '#QuitControl': '%from is now controlled by player %arg2, because player %arg released control',
  '#RemoveTargetsBySkill': 'Due to the effect of %arg, the %arg2 used by %from lost the target %to',
  '#ResumeArea': '%from’s %arg was restored',
  '#RoomOutdated': 'The server has finished updating. This room is out of date and can no longer be played',
  '#SummonPlayer': '%from was summoned to the table, with %to as their next player, acting on player %arg’s orders',
  '#TargetAdded': 'The %arg used by %from gained the target %to',
  '#TargetCancelled': 'The %arg used by %from lost the target %to',
  '#WatchCard': '%from viewed the card %card',
  '#damage_maker_choose_number': '%arg: choose a number',
  '#revive-ask': 'Revive a player!',

  /* ------------------------------------------------------------------------
   * Skill prompt hints (`#<skill>`). The one-line reminder shown while the
   * skill's dialog is open.
   * ---------------------------------------------------------------------- */
  '#cheat': 'Cheat: you can obtain any card you want',
  '#damage_maker':
    'Damage Maker: choose a test subject; you may also choose another player as the damage source '
    + '(Mou Xu Sheng by default)',
  '#qingguo': 'Helen of Troy: you can use or play a black hand card as Dodge.',
  '#qixi': 'Surprise Raid: you can use a black card as Dismantlement',
  '#test_rende-active':
    'Give Cards: you can give any number of cards to any number of players (dealt out evenly in '
    + 'order), or place any number of cards on top of the draw pile',
  '#test_zhijian':
    'Equip Up: choose any number of equip cards to put into one player’s equip area (replacing '
    + 'what is already there). Choose no card and a random equip card is taken from the draw pile; '
    + 'choose no player and you equip yourself',

  /* ------------------------------------------------------------------------
   * Skill rules text (`:<skill>`) the engine ships without English. All eight
   * belong to the `test` package's debug character, Mou Xu Sheng.
   * ---------------------------------------------------------------------- */
  ':change_hero': 'In your action phase, you can change a player’s character card or other attributes.',
  ':cheat': 'In your action phase, you can obtain any card you want.',
  ':control': 'In your action phase, you can take or release control of any number of other players.',
  ':damage_maker': 'In your action phase, you can run the damage maker once.',
  ':dummyskill': 'No effect.',
  ':test_rende':
    'In your action phase, you can give any number of cards to any number of players (dealt out '
    + 'evenly in order), or place any number of cards on top of the draw pile.',
  ':test_zhenggong': '(forced) At the start of the first round, you play an extra turn.',
  ':test_zhijian':
    'In your action phase, you can put any number of equip cards into one player’s equip area '
    + '(replacing what is already there). Choose no card and a random equip card is taken from the '
    + 'draw pile; choose no player and you equip yourself.',

  /* ------------------------------------------------------------------------
   * Game vocabulary: suits, phases, areas, roles, move reasons, counts. These
   * are the words the log and the dialogs are assembled out of, so they are the
   * highest-traffic strings in this file.
   * ---------------------------------------------------------------------- */
  // Suits. ♠♥♣♦ render as symbols elsewhere; these are the spelled-out names.
  spade: 'Spade',
  heart: 'Heart',
  club: 'Club',
  diamond: 'Diamond',
  suit: 'Suit',
  color: 'Color',
  number: 'Number',

  // Card categories.
  basic: 'Basic card',
  trick: 'Trick card',
  equip: 'Equip card',
  weapon: 'Weapon',
  armor: 'Armor',
  treasure: 'Treasure',
  non_basic: 'Non-basic card',
  non_basic_char: 'Non-basic',
  card: 'Card',

  // Phases the engine names outside the six numbered ones.
  phase_roundstart: 'Round start',
  phase_phasenone: 'Temporary phase',
  phase_notactive: 'Outside of turn',

  // Roles, and the grouped role labels the game-over screen uses.
  role: 'Role',
  unknown: 'Unknown',
  civilian: 'Civilian',
  rebel_chief: 'Rebel Chief',
  'lord+loyalist+civilian': 'Lord & Loyalists',
  'rebel+rebel_chief': 'Rebels',
  'rebel+rebel_chief+civilian': 'Rebels',
  'renegade+civilian': 'Renegades',
  'civilian never surrender': 'Civilians never surrender — hold on and you win!',

  // Move reasons: the `%arg` in log lines such as `#PutCardNoFrom`. Lower case
  // because they are always substituted mid-sentence.
  reason_use: 'use',
  reason_response: 'play',
  reason_discard: 'discard',
  reason_draw: 'draw',
  reason_prey: 'obtain',
  reason_give: 'hand over',
  reason_put: 'place',
  reason_put_in_discard: 'put into the discard pile',
  reason_judge: 'judgement',
  reason_recast: 'recast',
  reason_pindian: 'point fight',
  reason_exchange: 'exchange',
  reason_justmove: 'move',

  // Action words used as dialog titles and as damage-maker options.
  use: 'Use',
  use_card: 'Use cards',
  response: 'Play',
  discard: 'Discard',
  discard_card: 'Discard cards',
  draw: 'Draw',
  draw_card: 'Draw cards',
  prey: 'Obtain',
  prey_card: 'Obtain cards',
  recast_card: 'Recast cards',
  give: 'Give',
  view: 'View',
  kill: 'Kill',
  revive: 'Revive',
  turnOver: 'Turn over',
  chained: 'chained',
  'un-chained': 'unchained',
  damaged: 'Damage taken',
  heal_hp: 'Recover HP',
  heal_max_hp: 'Gain max HP',
  lose_max_hp: 'Lose max HP',
  replace_equip: 'Replace equipment',
  reset: 'Reset character card',
  rest: 'Rest',
  'resting...': 'Resting...',
  'rest round num': 'Rounds',
  shield: 'Shield',
  skill: 'Skill',
  dummyskill: 'Skill',
  spin_skill: 'Choose',
  toObtain: 'Cards to obtain',
  others: 'Other players',
  characters: 'Players',
  anyone: 'any',
  you: 'you',
  yes: 'Yes',
  no: 'No',
  default: 'Default',

  // Fixed-amount labels the damage maker and the AI hints offer.
  damage1: 'Deal 1 DMG',
  damageX: 'Deal {num} DMG',
  recover: 'Recover 1 HP',
  recoverX: 'Recover {num} HP',
  loseHp: 'Lose 1 HP',
  loseHpX: 'Lose {num} HP',
  loseMaxHp: 'Lose 1 max HP',
  loseMaxHpX: 'Lose {num} max HP',
  draw1: 'Draw 1 card',
  draw2: 'Draw 2 cards',
  draw3: 'Draw 3 cards',
  draw4: 'Draw 4 cards',
  draw5: 'Draw 5 cards',
  drawX: 'Draw {num} cards',
  discard1: 'Discard 1 card',
  discard2: 'Discard 2 cards',
  discard3: 'Discard 3 cards',
  discard4: 'Discard 4 cards',
  discard5: 'Discard 5 cards',
  discardX: 'Discard {num} cards',

  // Genders.
  male: 'Male',
  female: 'Female',
  bigender: 'Bigender',
  agender: 'Agender',

  // Turn order.
  clockwise: '↻ Clockwise',
  anticlockwise: '↺ Anticlockwise',

  /* ------------------------------------------------------------------------
   * The `test` package: the debug character and its skills. Not shown in a
   * normal game, but the keys exist and must resolve.
   * ---------------------------------------------------------------------- */
  test: 'Test',
  test_p_0: 'Test',
  mouxusheng: 'Mou Xu Sheng',
  mouxusheng_endnote: 'Test character',
  blank_shibing: 'Male Soldier',
  blank_nvshibing: 'Female Soldier',
  change_hero: 'Change Hero',
  control: 'Control',
  damage_maker: 'Damage Maker',
  damage_maker_tip_1: 'Target',
  damage_maker_tip_2: 'Source',
  test_rende: 'Give Cards',
  test_zhenggong: 'Quick Test',
  test_zhijian: 'Equip Up',
  lunarltk: 'LunarLTK',

  /* ------------------------------------------------------------------------
   * Request-type labels. The engine names each pending request by its handler;
   * the room shows the name as the dialog's title.
   * ---------------------------------------------------------------------- */
  AskForUseCard: 'Use',
  AskForResponseCard: 'Play',
  AskForUseActiveSkill: 'Use skill',
  AskForSkillInvoke: 'Use skill',
  AskForDiscard: 'Discard',
  AskForArrangeCards: 'Arrange cards',
  'Please arrange cards': 'Please drag to rearrange the cards',
  'Please click to move card': 'Please click to move a card',
  GetPlayerHandcards: 'Play card',
  SkipNullification: 'Skip for this round',
  Pindian: 'Point Fight',
  lijian_tip_1: 'Slash first',
  lijian_tip_2: 'Slash second',

  /* ------------------------------------------------------------------------
   * Shared UI words the engine owns: buttons, table areas, list headings.
   * Where the key is already idiomatic English it is kept verbatim — the engine
   * returns the key on a miss, so changing it would only churn the wording.
   * ---------------------------------------------------------------------- */
  OK: 'OK',
  Cancel: 'Cancel',
  End: 'End',
  Back: 'Back',
  Enter: 'Enter',
  Quit: 'Quit',
  Undo: 'Undo',
  Clear: 'Clear',
  Save: 'Save',
  Import: 'Import',
  Export: 'Export',
  New: 'New',
  Rename: 'Rename',
  Search: 'Search',
  Filter: 'Filter',
  Settings: 'Settings',
  Menu: 'Menu',
  About: 'About',
  Info: 'Info',
  Note: 'Note',
  Name: 'Name',
  Title: 'Title',
  Total: 'Total',
  All: 'All',
  Full: 'Full',
  Enable: 'Enable',
  Disabled: 'Disabled',
  Prohibit: 'Ban',
  Official: 'Official',
  Designer: 'Designer',
  Illustrator: 'Illustrator',
  Overview: 'Overview',
  Properties: 'Properties',
  Kingdom: 'Kingdom',
  Gender: 'Gender',
  Avatar: 'Avatar',
  Username: 'Username',
  PlayerList: 'Player list',
  Chat: 'Chat',
  Replay: 'Replay',
  Pause: 'Pause',
  Resume: 'Resume',
  Shuffle: 'Shuffle',
  Observe: 'Observe',
  Trust: 'Trust',
  Ready: 'Ready',
  Fight: 'Fight',
  Surrender: 'Surrender',
  Turn: 'Turn',
  Role: 'Role',
  MaxHp: 'Max HP',
  Recover: 'Recover',
  Damaged: 'Damage taken',
  Kill: 'Kills',
  HandSlot: 'Hand area',
  Top: 'Top',
  Bottom: 'Bottom',
  ChooseGeneralTime: 'Character selection time:',
  Ban_Generals: 'Banned characters',
  Ban_Packages: 'Banned packages',
  Whitelist_Generals: 'Whitelisted characters',
  ' thinking...': ' thinking...',
  '<Blocked> ': '<font color="red">[Blocked]</font> ',

  /* ------------------------------------------------------------------------
   * Achievement / play-style titles awarded on the game-over screen. The keys
   * are already the English titles; the Chinese is the localised flourish.
   * ---------------------------------------------------------------------- */
  'Awe Prestige': 'Awe Prestige',
  'Blood Judgement': 'Blood Judgement',
  'Bloody Warrior': 'Bloody Warrior',
  'Brilliant Healer': 'Brilliant Healer',
  'Burning Soul': 'Burning Soul',
  'Close But No Cigar': 'Close But No Cigar',
  Companions: 'Companions',
  Conspiracy: 'Conspiracy',
  'Direct Regicide': 'Direct Regicide',
  'Failed Ambition': 'Failed Ambition',
  'Fierce Lord': 'Fierce Lord',
  Fodder: 'Fodder',
  'Frightful Lord': 'Frightful Lord',
  'Impasse Strike': 'Impasse Strike',
  Innocent: 'Innocent',
  Legatus: 'Legatus',
  'Lose Prestige': 'Lose Prestige',
  Newbie: 'Newbie',
  'Peaceful Healer': 'Peaceful Healer',
  'Peaceful Watcher': 'Peaceful Watcher',
  'Poster Girl': 'Poster Girl',
  'Priority Honor': 'Priority Honor',
  Rampage: 'Rampage',
  'Rapid Victory': 'Rapid Victory',
  'Regretful Lose': 'Regretful Lose',
  Soy: 'Soy',
  Tank: 'Tank',
  'Victory or Defeat': 'Victory or Defeat',
  'War Spirit': 'War Spirit',
  'War Vanguard': 'War Vanguard',
  'Warrior Soul': 'Warrior Soul',
  'Wicked Kill': 'Wicked Kill',
  'Wisely Loyalist': 'Wisely Loyalist',
  'Wrath Warlord': 'Wrath Warlord',
  'time limitation: 5 min': 'The game ran for 5 minutes',

  /* ------------------------------------------------------------------------
   * Client chrome the Qt lobby owns: rooms, replays, settings, account. The web
   * shell does not render most of these today, but the keys are in the table
   * and a language toggle must not leave any of them showing a raw key.
   * ---------------------------------------------------------------------- */
  // Rooms.
  'Create Room': 'Create Room',
  'Room Name': 'Room Name',
  'Room ID': 'Room ID',
  'Room Password': 'Room Password',
  'Room Capacity': 'Room Capacity',
  'Room Fullness': 'Room Fullness',
  'Has Password': 'Has Password',
  'No Password': 'No Password',
  'Not Full': 'Not Full',
  "Please input room's password": 'Please enter the room’s password',
  'Change Room Config': 'Room Settings',
  'Refresh Room List': 'Refresh Room List (%1)',
  'Automatically Filter Room List': 'Filter the room list when refreshing',
  'Current room: %1': 'Current room: %1',
  'Back To Room': 'Back To Room',
  'Back To Lobby': 'Back To Lobby',
  'Exit Lobby': 'Exit Lobby',
  'Continue Game': 'Continue Game',
  'Are you sure to quit?':
    'Are you sure you want to quit? (If the game has started this counts against your forfeit record.)',
  'Surrender is disabled in this mode': 'Surrender is disabled in this mode',
  "Resting, don't leave!": 'You can rejoin the game shortly — don’t leave!',
  'Observing ...': 'Observing ...',
  'Trusting ...': 'On trust ...',
  'Endgame Expired': 'Endgame Expired',
  'View Endgame': 'View the endgame',

  // Characters and packages.
  'Hidden General': 'Hidden character',
  'Favorite Generals': 'Favorite characters',
  'Other Same Name Generals': 'Other characters with the same name',
  'Show general pool by packages': 'Show the character pool by package',
  'No enough generals': 'Not enough characters available!',
  'Copy as ban scheme': 'Copy as a ban list',
  'Package Settings': 'Package Settings',
  'Enabled Status': 'Enabled',
  'General Packages Help':
    'Character package settings live under "Overview" at the bottom right of the lobby',
  'Set as Favorite': 'Add to favorites',
  'Remove from Favorite': 'Remove from favorites',
  'Skill Name': 'Skill Name',
  'Skill Description': 'Skill Description',
  'Voice Actor': 'Voice Actor',
  'Audio Text': 'Voice line',
  'Copy Audio Text': 'Copy voice line',
  'Copy Audio Code': 'Copy voice code',

  // Replays.
  'Replay Manager': 'Replay Manager',
  'Replay Recording': 'Play back recording',
  'Replay from File': 'Open from file',
  'Save Replay': 'Save Replay',
  'Bookmark Replay': 'Bookmark Replay',
  'Already Bookmarked': 'Bookmarked',
  'Favorite Replay': 'Bookmarked replays',
  'Replay Expired': 'Replay Expired',
  'Speed Up': 'Speed Up',
  'Speed Down': 'Slow Down',
  'Return to Bottom': 'Back to the bottom',
  'Click to back': 'Click to go back',
  'Click The Game Scene to back': 'Click the game area to close the menu and carry on',

  // Account.
  'Edit Profile': 'Edit Profile',
  'Userinfo Settings': 'Profile',
  'Update Avatar': 'Update Avatar',
  'Update avatar done.': 'Avatar updated.',
  'Set as Avatar': 'Set as avatar',
  'Update Password': 'Update Password',
  'Update password done.': 'Password updated.',
  'Old Password': 'Old Password',
  'New Password': 'New Password',
  'Old password wrong!': 'Old password is wrong!',
  'Win Rate': 'Win Rate',

  // Settings pages.
  'Basic settings': 'Basic Settings',
  'General Settings': 'General Settings',
  'Control Settings': 'Controls',
  'Game UI settings': 'Game UI',
  'UI settings': 'UI Settings',
  'UI packages select': 'Choose UI package',
  'No available UI package': 'No UI package available',
  'BG Settings': 'Backgrounds',
  'Lobby BG': 'Lobby background',
  'Room BG': 'Room background',
  'Game BGM': 'Game BGM',
  'Change Skin': 'Change skin',
  'Audio Settings': 'Audio',
  'Audio and Message': 'Audio and Messages',
  'BGM Volume': 'BGM volume',
  'Effect Volume': 'Effect volume',
  'Male Audio': 'Male voices',
  'Female Audio': 'Female voices',
  'Equip Use Audio': 'Equip use sounds',
  'Equip Effect Audio': 'Equip effect sounds',
  'Death audio': 'Death voice',
  'Win audio': 'Victory voice',
  'Disable game over audio': 'Disable end-of-game sounds',
  'Disable message audio': 'Disable chat voice messages',
  'Hide presents': 'Hide gifts',
  'Hide observer chatter': 'Hide observers',
  'Show All Cards': 'Show hidden information',
  'Observer can view card': 'Observers can see hand cards',
  'Auto select the only target': 'Auto-select the only target',
  'Double click to use card or skill': 'Double-click to use',
  'Enable Super Drag': 'Drag to play cards',
  'Enable free assign': 'Free character assignment',
  'Hide unselectable cards': 'Move unselectable cards down',
  'Rotate table card': 'Randomly rotate cards on the table',
  'Do not use nullification to own one-target trick': 'Never nullify your own single-target tricks',
  'Choose General timeout': 'Character selection time (sec)',
  'Fire Target': 'Focus target',
  'Select All': 'Select All',

  // Settings help text (the hint under each switch).
  'help: Auto select the only target':
    'After you pick a card or a skill, select the target automatically when only one is possible',
  'help: Choose General timeout': 'The longest you may take to choose a character.',
  'help: Disable game over audio': 'Disable the victory and defeat sounds on the end-of-game box',
  'help: Disable message audio': 'Mute the chat voice messages every player sends',
  'help: Do not use nullification to own one-target trick':
    'Do not ask about Nullification for single-target tricks you used on yourself',
  'help: Double click to use card or skill':
    'Double-click a card or a portrait to use or play that card or skill',
  'help: Enable Super Drag':
    'Drag a card out of your hand to use it; drag it onto a player to select or deselect them as a target',
  'help: Enable deputy general': 'Note that some game modes do not support deputy characters at all.',
  'help: Enable free assign': 'Once on, press and hold or right-click a character on the selection screen.',
  'help: Hide observer chatter': 'Hide the chat messages and voice messages observers send',
  'help: Hide presents': 'Hide every flower, egg, wine cup and slipper other players throw',
  'help: Hide unselectable cards': 'Move cards you cannot select to the bottom of the screen',
  'help: Luck Card Times': 'The most times you may swap your opening hand.',
  'help: Observer can view card':
    'Once on, observers see the cards from the seat they are watching, including after switching seats',
  'help: Operation timeout': 'The longest you may take over a single action.',
  'help: Rotate table card': 'Randomly rotate the cards in the processing area',

  /* ------------------------------------------------------------------------
   * Room list summary. The key is already English; the Chinese carries a count.
   * ---------------------------------------------------------------------- */
  '%1 generals are enabled in this room': '%1 characters are enabled in this room',
};
