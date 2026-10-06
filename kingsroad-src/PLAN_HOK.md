# Kingsroad → authentic 王者荣耀 (Honor of Kings) rebuild

Goal: a first-person Honor of Kings for a private, HoK-sponsored festival show. Not "inspired by" — the real
roster, the real kits, the real items, King's Canyon, HoK language and HUD. Chinese is the primary language
(English secondary). Everything below replaces the invented Crownfall-flavoured content; the deterministic
sim, lockstep multiplayer, bots and test harness stay.

## What I can and cannot produce myself
* I can rebuild all **data** (heroes, kits, passives, items, jungle, announcer lines, terminology) to match the
  game, and all **art direction** (King's Canyon look, HoK UI language, hero silhouettes, portraits in the
  HoK card style) as original stylised 3D/2D work.
* I cannot fetch Tencent's own textures, models, splash art or voice lines from the internet. If the sponsor
  gave you an asset pack, drop it in `~/kingsroad/assets-hok/` (layout below) and the loader will use the
  official art in place of my stand-ins — hero portraits, splash, 3D models, ground/wall textures, announcer
  and hero voice lines, music.

```
assets-hok/
  manifest.json                     # optional overrides; everything is also auto-discovered by path
  heroes/<heroId>/portrait.png      # card/HUD portrait (square)
  heroes/<heroId>/splash.jpg        # select-screen splash (16:9)
  heroes/<heroId>/model.glb         # rigged or static model, Y-up, ~1.8 units tall
  heroes/<heroId>/voice/{pick,kill,death,ult}.ogg
  textures/{grass,stone,path,wall,river,crystal}.png
  announcer/{first_blood,double,triple,quadra,penta,ace,tower,tyrant,overlord,victory,defeat}.ogg
  music/{menu,battle}.ogg
  icons/items/<itemId>.png
  icons/skills/<heroId>_{p,1,2,3}.png
```

## Phase 1 — Roster: 20 real heroes with their real kits (sim data)
Hero ids are pinyin; names shown in 中文 first. Roles use HoK's six: 坦克 / 战士 / 刺客 / 法师 / 射手 / 辅助.

| id | 英雄 | 定位 | 被动 | 1 | 2 | 3 |
|---|---|---|---|---|---|---|
| houyi | 后羿 | 射手 | 炽热之箭 | 多重箭矢 | 落日余晖 | 灼日之光 |
| daji | 妲己 | 法师 | 女王崇拜 | 灵魂冲击 | 偶像魅力 | 女王崇拜 |
| yase | 亚瑟 | 战士 | 圣光庇护 | 誓约之盾 | 回旋打击 | 圣剑裁决 |
| sunwukong | 孙悟空 | 刺客 | 强化普攻 | 护身咒法 | 斗战冲锋 | 如意金箍棒 |
| libai | 李白 | 刺客 | 侠客行 | 将进酒 | 神来之笔 | 青莲剑歌 |
| diaochan | 貂蝉 | 法师 | 绽·风华 | 落·红雨 | 缘·心结 | 绽·风华 |
| luban | 鲁班七号 | 射手 | 火力压制 | 河豚手雷 | 无敌鲨嘴炮 | 空中支援 |
| anqila | 安琪拉 | 法师 | 失控的魔法 | 火球术 | 混沌火种 | 炽热光辉 |
| chengyaojin | 程咬金 | 坦克 | 怒气勃发 | 刚烈之斧 | 蛮横撞击 | 赤血狂暴 |
| caiwenji | 蔡文姬 | 辅助 | 绝唱 | 胡笳乐 | 悲歌 | 绝唱 |
| dianwei | 典韦 | 战士 | 狂战 | 狂战士之心 | 怒气爆发 | 亡命之徒 |
| wangzhaojun | 王昭君 | 法师 | 冰封之心 | 凛冬之息 | 冰封雪域 | 冰雪风暴 |
| sunshangxiang | 孙尚香 | 射手 | 翻滚突袭 | 翻滚突袭 | 炮弹冲击 | 红莲爆弹 |
| zhangfei | 张飞 | 坦克 | 狂意 | 画地为牢 | 狂兽血性 | 狂意 |
| hanxin | 韩信 | 刺客 | 背水一战 | 无情冲锋 | 背水一战 | 国士无双 |
| zhaoyun | 赵云 | 战士 | 龙胆 | 惊雷之龙 | 破云之龙 | 天翔之龙 |
| zhugeliang | 诸葛亮 | 法师 | 策谋之刻 | 时空穿梭 | 东风破袭 | 元气弹 |
| zhuangzhou | 庄周 | 辅助 | 蝴蝶梦 | 化蝶 | 梦生 | 逍遥游 |
| niumo | 牛魔 | 辅助 | 牛魔之心 | 碎裂之盾 | 暴烈冲撞 | 蛮力冲撞 |
| makeboluo | 马可波罗 | 射手 | 真实伤害 | 华丽左轮 | 漫游之枪 | 狂热交锋 |

Each kit is built on the ability engine (line / aim / cone / self / dash / leap / blink / spin / chain / heal /
buff) plus new kinds needed for fidelity: **global shot** (灼日之光), **channel** (炽热光辉, 绝唱), **suppress**
(圣剑裁决), **multi-strike** (如意金箍棒), **mark-and-detonate** (绽·风华, 策谋之刻 orbs), **untargetable
dash** (青莲剑歌, 逍遥游 cleanse). Numbers follow HoK level-1/level-15 scaling shape. Role base stats come from
the HoK roles (e.g. 射手 ~3200 HP / 160 ATK, 坦克 ~3600 HP / 100 armour).

The invented "twist" layer (resonance crown, item moods, hero twists, guardians) becomes an off-by-default
setting `节日模式` so the default game is HoK-faithful.

## Phase 2 — Equipment: the real shop
Six categories (攻击 / 法术 / 防御 / 移动 / 打野 / 辅助), 6 slots, 鞋 limited to one. First pass ~36 items:
无尽战刃, 破军, 泣血之刃, 影刃, 宗师之力, 暗影战斧, 闪电匕首, 碎星锤, 名刀·司命, 末世, 冰痕之握;
回响之杖, 痛苦面具, 博学者之怒, 虚无法杖, 辉月, 冰霜法杖, 噬神之书, 时之预言, 圣杯;
反伤刺甲, 红莲斗篷, 魔女斗篷, 不死鸟之眼, 霸者重装, 贤者的庇护, 极寒风暴, 不祥征兆, 近卫荣耀, 救赎之翼;
疾步之靴, 影忍之足, 抵抗之靴, 冷静之靴, 秘法之靴, 急速战靴. Passives implemented: 破军 (low-HP bonus),
末世 (%HP on hit), 名刀 (death immunity), 反伤 (thorns), 红莲 (burn aura), 冰痕 (post-skill slow), 回响
(skill burst), 痛苦面具 (%current HP), 宗师 (empowered attack), 贤者 (revive), 辉月 (invulnerable), 不祥
(attack-speed slow on attackers), 极寒 (cooldown + slow aura). Recommended builds per hero follow the in-game
default 出装.

## Phase 3 — 王者峡谷: map rules and art
* Rules: 三路 + 河道, 红 buff / 蓝 buff, 野区 (刺猬/野猪/野狼/岩石), 暴君 (下河道, 2:00) → 黑暗暴君 (late),
  主宰 (上河道, 8:00) with 主宰先锋 waves; 防御塔 with 塔刀 and backdoor shield; 水晶; 炮车 every 3rd wave;
  超级兵 after 高地塔 falls; 回城 B; 泉水 heal.
* Art: Chinese architecture — tiered pagoda roofs on towers, red lacquer and gold trim, stone-lion gates,
  lanterns, cherry blossom and bamboo groves, lotus river with wooden bridges, jade 水晶, carved stone paths,
  warm painted-texture look (procedural high-res textures with brush grain; official textures swap in).

## Phase 4 — Heroes you can recognise
Per-hero 3D silhouettes (后羿's longbow, 妲己's fox tails, 亚瑟's sword and cape, 孙悟空's golden armour and
staff, 李白's sword and scholar robe, 鲁班's walker cannon, 安琪拉's bear doll, 程咬金's great axe…), hero colour
palettes from the game, first-person weapon rigs per hero, portraits rendered in the HoK card frame
(gold filigree, role badge). Official portraits/splash/models replace stand-ins when present.

## Phase 5 — HoK HUD and screens
* 中文 UI first. Hero select "选择英雄" with role filter tabs, splash panel, 技能 preview, 推荐出装.
* In-match: HoK layout — 小地图 top-left, 击杀/时间 top-centre, 装备 + 金币 bottom-left, 技能 arc bottom-right
  with 召唤师技能 (闪现 / 惩击 / 治疗 / 狂暴 / 疾跑 / 净化 / 弱化 — pick one before the match), 回城,
  KDA strip, 击杀播报 (一血 / 双杀 / 三杀 / 四杀 / 五杀 / 大杀特杀 / 无人能挡 / 横扫千军 / 天下无双 / 主宰比赛 /
  超神 / 团灭), 防御塔/暴君/主宰 notices.
* Settlement: 胜利 / 失败 banner, MVP, 金牌/银牌/铜牌 awards, KDA, 伤害/承伤/经济 bars.
* Sound: zh-CN announcer via speech synthesis as stand-in (official 播报 audio swaps in), per-hero cast sounds.

## Phase 6 — Bots, modes, verification
Bots learn the new kits (per-kind usage rules, combos like 妲己 2→1→3). Modes 5v5 / 3v3 / 1v1 (单挑模式 mid
only) and online rooms unchanged. Every phase: `npm run check`, `npm run test:sim`, headless balance batches,
Playwright screenshots of every screen, deploy to /kingsroad.

## Order of work
1. Roster data + kits + new ability kinds (sim) — then bots for them.
2. Items + passives + builds.
3. Map rules (暴君/主宰/超级兵/炮车) + Canyon art + textures.
4. Hero models/rigs/portraits + asset-pack loader.
5. HUD/screens/announcer, settlement.
6. Balance, screenshots of everything, deploy.
