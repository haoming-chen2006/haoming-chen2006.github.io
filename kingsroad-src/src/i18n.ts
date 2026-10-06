/**
 * Localisation: English and Simplified Chinese.
 *
 * The simulation never holds display text — it emits stable keys (`@streak.double`, `@award.champion`)
 * and the UI translates them at the edge, so an online match between a Chinese and an English browser
 * stays in lockstep. `t()` reads a module-level language; `setLanguage()` swaps it and re-paints every
 * `data-i18n` element.
 */

import type { AbilityDef, UnitDef } from './game/types.ts';

export const LANG_KEY = 'kingsroad-lang';
export type Lang = 'en' | 'zh';

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    'common.back': 'Back', 'common.done': 'Done', 'common.you': 'You', 'common.bot': 'Bot', 'common.human': 'Player',
    'loading.forging': 'Raising the towers…', 'loading.raising': 'Raising the towers…',
    'menu.tagline': 'Honor of Kings in first person — 20 heroes, the real kits, 王者峡谷.',
    'online.soonGone': '',
    'menu.play': 'Play', 'menu.online': 'Online Lobby', 'menu.onlineSub': 'friends and bots, up to 5v5', 'menu.heroes': 'Heroes', 'menu.howToPlay': 'How to Play', 'menu.settings': 'Settings',
    'menu.record': '{w}W · {l}L',
    'mode.5v5': 'Full King\'s Canyon: three lanes, jungle, Tyrant and Overlord. Five heroes a side.',
    'mode.3v3': 'Three heroes a side on the full map: faster lanes, more room to roam.',
    'mode.1v1': 'Mid lane only. Just you, your rival, the minions and the jungle.',
    'diff.easy': 'Easy', 'diff.normal': 'Normal', 'diff.hard': 'Hard',
    'select.title': 'Choose your hero', 'select.start': 'To Battle', 'select.mode': '{mode} · {diff}', 'select.yourTeam': 'Your team', 'select.enemyTeam': 'Enemy team',
    'select.skills': 'Skills', 'select.passive': 'Passive', 'select.cooldown': '{s}s cooldown', 'select.mana': '{m} mana', 'select.build': 'Recommended build',
    'codex.title': 'Heroes',
    'role.tank': 'Tank', 'role.warrior': 'Warrior', 'role.assassin': 'Assassin', 'role.mage': 'Mage', 'role.marksman': 'Marksman', 'role.support': 'Support',
    'team.blue': 'Blue', 'team.red': 'Red',
    'help.title': 'How to play',
    'help.body': `<div><h3>Goal</h3><p>Push down the three lanes with your minion waves, destroy the towers in order, and break the enemy <b>crystal</b>. Lose yours and it's over.</p>
      <h3>Controls</h3><ul><li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move, mouse looks</li><li><b>Left click</b> basic attack toward the crosshair</li><li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> (or <kbd>Q</kbd> <kbd>E</kbd> <kbd>R</kbd>) skills, aimed at the crosshair</li><li><kbd>F</kbd> / <kbd>Space</kbd> summoner spell · <kbd>B</kbd> recall · <kbd>I</kbd> shop · <kbd>Tab</kbd> scoreboard · <kbd>M</kbd> big map · <kbd>V</kbd> view</li></ul></div>
      <div><h3>Growing</h3><p>Last-hit minions for gold, share XP with nearby allies, buy items anywhere (auto-buy follows the recommended build). Skills rank up automatically; the ultimate unlocks at level 4.</p>
      <h3>Jungle</h3><p>Blue buff: mana and cooldowns. Red buff: burn and slow on hit. The <b>Tyrant</b> (bottom-right pit, 2:00) empowers the whole team; the <b>Overlord</b> (top-left, 8:00) supercharges your next waves.</p>
      <h3>Bushes and towers</h3><p>Bushes hide you until an enemy walks in. Towers shoot minions first, but turn on any hero that attacks a hero under them.</p>
      <h3>Festival twists (off by default · Settings)</h3><ul><li><b>Resonance crown</b>: every skill that hits an enemy hero charges your crown (the gold bar). At full charge your next skill is <b>crowned</b>: bigger, 1.5× damage and a short stun.</li><li><b>Item moods</b>: Storm Lance forks lightning every 4th hit, Void Staff detonates on the 3rd skill mark, Frost Heart chills attackers, Phoenix Feather explodes on death, Immortal Shield revives.</li><li><b>Crowned towers</b>: a tower that sees a hero kill fires faster for 30 s. The Tyrant's slayer gets 20 s of fury.</li><li><b>Siege Hour</b>: from 18:00 every wave brings a siege engine, from 21:00 a super minion.</li><li><b>Guardians</b>: a crystal that drops under 40% calls three super minions to its defence, once.</li><li><b>Hero twists</b>: every hero has a signature passive — read it on the hero card.</li></ul></div>`,
    'hud.shop': 'Shop (I)', 'hud.shopTitle': 'Shop', 'hud.autoBuy': 'Auto buy', 'hud.slain': 'You were slain', 'hud.respawnHint': 'Watching your team…', 'hud.buy': 'Buy', 'hud.owned': 'Owned', 'hud.full': 'Full',
    'hud.gold': '{g} gold', 'hud.level': 'Lv {l}', 'hud.wave': 'Wave {n}', 'hud.recalling': 'Recalling…', 'hud.tab': 'Hold Tab for the scoreboard',
    'hud.tipStart': 'Walk to your lane. Minions arrive at 0:25.', 'hud.controls': 'WASD move · left click attack · 1 2 3 skills · F summoner spell · B recall · I shop · Tab score · V view', 'hud.tipRecall': 'Low health? Press B to recall and heal.',
    'score.hero': 'Hero', 'score.kda': 'K / D / A', 'score.gold': 'Gold', 'score.level': 'Lv', 'score.items': 'Items',
    'overlay.captureMouse': 'Click to capture the mouse', 'overlay.towerAggro': 'TOWER!',
    'pause.paused': 'Paused', 'pause.sub': 'The match is paused. Take a breath.', 'pause.resume': 'Resume', 'pause.settings': 'Settings', 'pause.quit': 'Surrender & Quit', 'pause.online': 'The match continues while this is open.',
    'results.victory': 'Victory', 'results.defeat': 'Defeat', 'results.draw': 'Draw', 'results.again': 'Play Again', 'results.menu': 'Main Menu', 'results.duration': '{m}:{s} · {k0} – {k1} kills',
    'result.crystal': 'The crystal has fallen', 'result.surrender': 'Surrender', 'result.forfeit': 'The other side left',
    'award.champion': 'Champion · most hero damage', 'award.warlord': 'Siegebreaker · most tower damage', 'award.executioner': 'Executioner · most kills', 'award.farmer': 'Harvester · most minions',
    'award.mvp': 'MVP', 'award.svp': 'SVP', 'award.tank': 'Bulwark · most damage taken', 'award.assist': 'Teamwork · most assists', 'award.guardian': 'Guardian · most healing', 'award.rampage': 'Rampage · best streak', 'award.bigSpender': 'Magnate · most gold', 'award.objectives': 'Dragonslayer · objectives',
    'streak.firstBlood': 'First Blood!', 'streak.double': 'Double Kill!', 'streak.triple': 'Triple Kill!', 'streak.quad': 'Quadra Kill!', 'streak.penta': 'PENTA KILL!',
    'streak.killingSpree': 'Killing Spree', 'streak.unstoppable': 'Unstoppable!', 'streak.rampage': 'Rampage!', 'streak.peerless': 'Peerless!', 'streak.dominating': 'Dominating!', 'streak.legendary': 'GODLIKE!', 'streak.ace': 'ACE!',
    'feed.kill': '{killer} slew {victim}', 'feed.tower': '{team} destroyed a {tier} tower', 'feed.crystal': '{team} broke the crystal!', 'feed.objective': '{team} took the {obj}',
    'tier.outer': 'outer', 'tier.inner': 'inner', 'tier.base': 'base', 'tier.crystal': 'crystal',
    'objective.tyrant': 'Tyrant slain!', 'objective.overlord': 'Overlord slain!', 'objective.tyrantSpawned': 'The Tyrant has risen', 'objective.overlordSpawned': 'The Overlord has risen', 'objective.siegeHour': 'Siege Hour: siege engines march every wave', 'objective.guardians': 'A wounded crystal calls its guardians!', 'objective.crumble': 'The walls are crumbling: every wave wears down every tower (20:00)', 'objective.superHour': 'Super minions join every wave',
    'buff.blue': 'Blue buff', 'buff.red': 'Red buff', 'buff.tyrant': 'Tyrant', 'buff.overlord': 'Overlord',
    'countdown.fight': 'Fight!', 'toast.recallInterrupted': 'Recall interrupted', 'toast.skillLocked': 'Skill not learned yet', 'toast.noMana': 'Not enough mana', 'toast.immortal': 'Immortal Shield!', 'toast.crowned': 'Crowned! Your next skill is empowered', 'toast.levelup': 'Level {l}!',
    'unit.tower': 'Tower', 'unit.minions': 'Minions',
    'bot.easy': 'Rookie', 'bot.normal': 'Veteran', 'bot.hard': 'Champion',
    'fx.noTargets': 'no targets', 'fx.tyrantRide': 'Tyrant fury!',
    'settings.title': 'Settings', 'settings.sfx': 'Sound volume', 'settings.music': 'Music volume', 'settings.sensitivity': 'Mouse sensitivity', 'settings.fov': 'Field of view',
    'settings.invert': 'Invert mouse Y', 'settings.announcer': 'Announcer voice (中文)', 'settings.festival': 'Festival twists (resonance crowns, crowned towers, guardians)', 'settings.firstPerson': 'Start in first person', 'settings.quality': 'Graphics', 'settings.high': 'High', 'settings.low': 'Low', 'settings.language': 'Language', 'settings.reset': 'Reset record',
    'online.title': 'Online Lobby', 'online.soon': 'Online rooms are being wired up. Play against bots meanwhile.',
    'online.name': 'Your name', 'online.namePh': 'Tarnished', 'online.create': 'Create Room', 'online.join': 'Join', 'online.codePh': 'ROOM CODE', 'online.openRooms': 'Open rooms', 'online.noRooms': 'No open rooms right now. Create one and send the link.',
    'online.hubHint': 'The host picks the mode. Empty seats are played by bots, so two friends can run a 5v5.', 'online.room': 'Room', 'online.copy': 'Copy link', 'online.copied': 'Link copied', 'online.emptySeat': 'empty · bot', 'online.ready': 'Ready', 'online.notReady': 'Not ready',
    'online.pickHero': 'Your hero:', 'online.chatPh': 'Say something…', 'online.send': 'Send', 'online.leave': 'Leave', 'online.start': 'Start Match', 'online.readyUp': 'Ready', 'online.unready': 'Not ready', 'online.playing': 'playing', 'online.creating': 'Creating room…', 'online.joining': 'Joining…',
    'net.waiting': 'Waiting for players… {s}s', 'net.outOfSync': 'Out of sync with the other players', 'net.rtt': 'online · {ms} ms', 'net.dropped': 'Seat {seat} stopped responding: a bot takes over', 'net.left': 'Seat {seat} left: a bot takes over',
    'err.noFreeCode': 'Could not find a free room code', 'err.notRoomCode': 'That is not a room code', 'err.noHost': 'No room {0} is open', 'err.roomFull': 'Room {0} is full', 'err.serverSilent': 'The server did not answer', 'err.network': 'Network error',
    // 王者荣耀 content: data is 中文; these are the English faces of the same keys
    'shop.cat.attack': 'Attack', 'shop.cat.magic': 'Magic', 'shop.cat.defense': 'Defense', 'shop.cat.support': 'Support', 'shop.cat.boots': 'Boots',
    'fx.ultReady': 'Ultimate ready!',
    'spell.flash': 'Flash', 'spell.smite': 'Smite', 'spell.heal': 'Heal', 'spell.frenzy': 'Frenzy', 'spell.sprint': 'Sprint', 'spell.cleanse': 'Purify', 'spell.execute': 'Execute',
    'spelldesc.flash': 'Blink a short distance.', 'spelldesc.smite': 'Heavy true damage to a nearby monster or minion.', 'spelldesc.heal': 'Heal yourself and nearby allies for 15% max health.', 'spelldesc.frenzy': '+60% attack speed, +10% attack for 5 s.', 'spelldesc.sprint': '+30% move speed for 10 s.', 'spelldesc.cleanse': 'Remove all crowd control and resist it for 1.5 s.', 'spelldesc.execute': 'True damage equal to 14% max health to a nearby enemy hero under 50%.',
    'select.spell': 'Summoner spell', 'select.allRoles': 'All', 'results.score': 'Score {v}', 'score.damage': 'Damage', 'score.taken': 'Taken',
    'unit.近战兵': 'Melee Minion', 'unit.远程兵': 'Ranged Minion', 'unit.炮车': 'Siege Engine', 'unit.超级兵': 'Super Minion', 'unit.寒冰魔': 'Frost Spirit', 'unit.赤炎魔': 'Flame Spirit', 'unit.野狼': 'Wolf', 'unit.刺猬': 'Hedgehog', 'unit.乌鸦': 'Crow', 'unit.岩石怪': 'Rock Golem', 'unit.野猪': 'Boar', 'unit.暴君': 'Tyrant', 'unit.主宰': 'Overlord',
    'hero.houyi.name': 'Hou Yi', 'hero.houyi.title': 'Bow of the Demigod', 'hero.luban.name': 'Luban No.7', 'hero.luban.title': 'Mechanical Marvel',
    'hero.sunshangxiang.name': 'Sun Shangxiang', 'hero.sunshangxiang.title': 'Lady of the Bow', 'hero.makeboluo.name': 'Marco Polo', 'hero.makeboluo.title': 'Roving Gunslinger',
    'hero.daji.name': 'Daji', 'hero.daji.title': 'Enchanting Fox', 'hero.anqila.name': 'Angela', 'hero.anqila.title': 'Midnight Mage',
    'hero.wangzhaojun.name': 'Wang Zhaojun', 'hero.wangzhaojun.title': 'Snow Blossom', 'hero.zhugeliang.name': 'Zhuge Liang', 'hero.zhugeliang.title': 'Grand Strategist',
    'hero.diaochan.name': 'Diaochan', 'hero.diaochan.title': 'Peerless Dancer', 'hero.sunwukong.name': 'Sun Wukong', 'hero.sunwukong.title': 'Monkey King',
    'hero.libai.name': 'Li Bai', 'hero.libai.title': 'Sword Immortal', 'hero.hanxin.name': 'Han Xin', 'hero.hanxin.title': 'Peerless General',
    'hero.yase.name': 'Arthur', 'hero.yase.title': 'Holy Knight', 'hero.dianwei.name': 'Dian Wei', 'hero.dianwei.title': 'Berserker',
    'hero.zhaoyun.name': 'Zhao Yun', 'hero.zhaoyun.title': 'Soaring Dragon', 'hero.chengyaojin.name': 'Cheng Yaojin', 'hero.chengyaojin.title': 'Blazing Axe',
    'hero.zhangfei.name': 'Zhang Fei', 'hero.zhangfei.title': 'Beast Unbound', 'hero.caiwenji.name': 'Cai Wenji', 'hero.caiwenji.title': 'Heavenly Lyre',
    'hero.zhuangzhou.name': 'Zhuang Zhou', 'hero.zhuangzhou.title': 'Carefree Dreamer', 'hero.niumo.name': 'Niu Mo', 'hero.niumo.title': 'Bull Demon King',
    'skill.多重箭矢': 'Multi-Arrow', 'skill.落日余晖': 'Sunset Glow', 'skill.灼日之光': 'Blazing Sun', 'skill.河豚手雷': 'Pufferfish Grenade', 'skill.无敌鲨嘴炮': 'Shark Cannon', 'skill.空中支援': 'Air Support',
    'skill.翻滚突袭': 'Rolling Assault', 'skill.炮弹冲击': 'Cannon Shot', 'skill.红莲爆弹': 'Crimson Bomb', 'skill.华丽左轮': 'Gilded Revolver', 'skill.漫游之枪': 'Roaming Gun', 'skill.狂热交锋': 'Frenzied Fire',
    'skill.灵魂冲击': 'Soul Shock', 'skill.偶像魅力': 'Idol Charm', 'skill.女王崇拜': 'Queen Worship', 'skill.火球术': 'Fireball', 'skill.混沌火种': 'Chaos Ember', 'skill.炽热光辉': 'Blazing Radiance',
    'skill.凛冬之息': 'Winter Breath', 'skill.冰封雪域': 'Frozen Field', 'skill.冰雪风暴': 'Blizzard', 'skill.时空穿梭': 'Time Warp', 'skill.东风破袭': 'East Wind', 'skill.元气弹': 'Spirit Bomb',
    'skill.落·红雨': 'Red Rain', 'skill.缘·心结': 'Heart Knot', 'skill.绽·风华': 'Blossom', 'skill.护身咒法': 'Guardian Spell', 'skill.斗战冲锋': 'Battle Charge', 'skill.如意金箍棒': 'Golden Staff',
    'skill.将进酒': 'Wine Song', 'skill.神来之笔': 'Divine Stroke', 'skill.青莲剑歌': 'Lotus Sword Song', 'skill.无情冲锋': 'Ruthless Charge', 'skill.背水一战': 'Last Stand', 'skill.国士无双': 'Peerless',
    'skill.誓约之盾': 'Oath Shield', 'skill.回旋打击': 'Whirling Strike', 'skill.圣剑裁决': 'Holy Judgement', 'skill.狂战士之心': 'Berserker Heart', 'skill.怒气爆发': 'Rage Burst', 'skill.亡命之徒': 'Desperado',
    'skill.惊雷之龙': 'Thunder Dragon', 'skill.破云之龙': 'Cloud Dragon', 'skill.天翔之龙': 'Sky Dragon', 'skill.刚烈之斧': 'Valiant Axe', 'skill.蛮横撞击': 'Brute Slam', 'skill.赤血狂暴': 'Blood Frenzy',
    'skill.画地为牢': 'Ground Prison', 'skill.狂兽血性': 'Beast Roar', 'skill.狂意': 'Wild Will', 'skill.胡笳乐': 'Hujia Melody', 'skill.悲歌': 'Elegy', 'skill.绝唱': 'Swan Song',
    'skill.化蝶': 'Butterflies', 'skill.梦生': 'Dream Life', 'skill.逍遥游': 'Free Wandering', 'skill.碎裂之盾': 'Shattering Shield', 'skill.暴烈冲撞': 'Violent Ram', 'skill.蛮力冲撞': 'Brute Force',
    'passive.houyi': 'Blazing Arrows', 'passive.luban': 'Suppressive Fire', 'passive.sunshangxiang': 'Rolling Empowerment', 'passive.makeboluo': 'True Damage', 'passive.daji': 'Queen Worship',
    'passive.anqila': 'Unstable Magic', 'passive.wangzhaojun': 'Frozen Heart', 'passive.zhugeliang': 'Stratagem', 'passive.diaochan': 'Blossom', 'passive.sunwukong': 'Empowered Strike',
    'passive.libai': 'Wandering Swordsman', 'passive.hanxin': 'Last Stand', 'passive.yase': 'Holy Protection', 'passive.dianwei': 'Berserk', 'passive.zhaoyun': 'Dragon Courage',
    'passive.chengyaojin': 'Rising Rage', 'passive.zhangfei': 'Wild Will', 'passive.caiwenji': 'Rejuvenation', 'passive.zhuangzhou': 'Butterfly Dream', 'passive.niumo': 'Bull Heart',
    'item.jibu_zhixue': 'Boots of Swiftness', 'item.yingren_zhizu': 'Ninja Tabi', 'item.dikang_zhixue': 'Boots of Resistance', 'item.lengjing_zhixue': 'Boots of Tranquility', 'item.mifa_zhixue': 'Arcane Boots', 'item.jisu_zhanxue': 'Rapid Boots',
    'item.wujin_zhanren': 'Endless Blade', 'item.pojun': 'Army Breaker', 'item.qixue_zhiren': 'Bloodweeper', 'item.yingren': 'Shadow Blade', 'item.zongshi_zhili': "Master's Force", 'item.anying_zhanfu': 'Shadow Axe',
    'item.shandian_bishou': 'Lightning Dagger', 'item.suixing_chui': 'Starshatter Hammer', 'item.mingdao_siming': 'Famed Blade', 'item.moshi': 'Doomsday', 'item.binghen_zhiwo': 'Frost Grip',
    'item.huixiang_zhizhang': 'Echo Staff', 'item.tongku_mianju': 'Mask of Agony', 'item.boxuezhe_zhinu': "Scholar's Wrath", 'item.xuwu_fazhang': 'Void Staff', 'item.huiyue': 'Moon Radiance', 'item.bingshuang_fazhang': 'Frost Staff',
    'item.shishen_zhishu': 'Devourer Tome', 'item.shizhi_yuyan': 'Prophecy of Time', 'item.shengbei': 'Holy Grail', 'item.fanshang_cijia': 'Thorn Mail', 'item.honglian_doupeng': 'Crimson Cloak', 'item.monv_doupeng': 'Witch Cloak',
    'item.businiao_zhiyan': 'Phoenix Eye', 'item.bazhe_zhongzhuang': 'Overlord Plate', 'item.xianzhe_bihu': "Sage's Sanctuary", 'item.jihan_fengbao': 'Frost Storm', 'item.buxiang_zhengzhao': 'Ominous Omen', 'item.jinwei_rongyao': "Guardian's Glory", 'item.jiushu_zhiyi': 'Wings of Redemption',
  },
  zh: {
    'common.back': '返回', 'common.done': '完成', 'common.you': '你', 'common.bot': '电脑', 'common.human': '玩家',
    'loading.forging': '正在筑起防御塔…', 'loading.raising': '正在筑起防御塔…',
    'menu.tagline': '王者峡谷 · 二十位英雄 · 第一人称亲历每一个技能。',
    'menu.play': '开始', 'menu.online': '在线大厅', 'menu.onlineSub': '邀好友，补电脑，最多 5v5', 'menu.heroes': '英雄', 'menu.howToPlay': '玩法说明', 'menu.settings': '设置',
    'menu.record': '{w} 胜 · {l} 负',
    'mode.5v5': '完整王者峡谷：三路、野区、暴君与主宰。每边五名英雄。',
    'mode.3v3': '完整地图，每边三名英雄：节奏更快，更多游走空间。',
    'mode.1v1': '只开中路。只有你、对手、小兵和野区。',
    'diff.easy': '简单', 'diff.normal': '普通', 'diff.hard': '困难',
    'select.title': '选择英雄', 'select.start': '出征', 'select.mode': '{mode} · {diff}', 'select.yourTeam': '我方', 'select.enemyTeam': '敌方',
    'select.skills': '技能', 'select.passive': '被动', 'select.cooldown': '冷却 {s} 秒', 'select.mana': '{m} 法力', 'select.build': '推荐出装',
    'codex.title': '英雄图鉴',
    'role.tank': '坦克', 'role.warrior': '战士', 'role.assassin': '刺客', 'role.mage': '法师', 'role.marksman': '射手', 'role.support': '辅助',
    'team.blue': '蓝方', 'team.red': '红方',
    'help.title': '玩法说明',
    'help.body': `<div><h3>目标</h3><p>跟随小兵推进三路，依次摧毁防御塔，击碎敌方<b>水晶</b>。己方水晶被毁则落败。</p>
      <h3>操作</h3><ul><li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动，鼠标转视角</li><li><b>左键</b> 朝准星普攻</li><li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>（或 <kbd>Q</kbd> <kbd>E</kbd> <kbd>R</kbd>）释放技能，瞄准准星</li><li><kbd>F</kbd> / <kbd>空格</kbd> 召唤师技能 · <kbd>B</kbd> 回城 · <kbd>I</kbd> 商店 · <kbd>Tab</kbd> 战绩 · <kbd>M</kbd> 大地图 · <kbd>V</kbd> 视角</li></ul></div>
      <div><h3>成长</h3><p>补刀小兵获得金币，附近队友共享经验，随时随地购买装备（自动购买按推荐出装）。技能自动升级，4 级解锁大招。</p>
      <h3>野区</h3><p>蓝 buff：回蓝与冷却。红 buff：攻击灼烧减速。<b>暴君</b>（右下坑，2:00）强化全队；<b>主宰</b>（左上坑，8:00）强化接下来的兵线。</p>
      <h3>草丛与防御塔</h3><p>草丛会隐藏你，直到敌人走进来。防御塔优先攻击小兵，但会立即转向在塔下攻击英雄的敌方英雄。</p>
      <h3>节日模式（默认关闭 · 设置中开启）</h3><ul><li><b>共鸣王冠</b>：技能命中敌方英雄会积攒王冠（金色条）。充满后下一个技能<b>加冕</b>：范围更大、1.5 倍伤害并附带短暂眩晕。</li><li><b>装备个性</b>：风暴之枪每第 4 次普攻引下分叉闪电；虚空法杖第 3 层印记引爆；冰霜之心减速攻击者；凤凰之羽死亡时爆炸；不死之盾复活一次。</li><li><b>加冕防御塔</b>：目睹英雄击杀的防御塔 30 秒内攻速提升；击杀暴君者获得 20 秒狂暴。</li><li><b>攻城时刻</b>：18:00 起每波兵线带攻城车，21:00 起带超级兵。</li><li><b>守护者</b>：水晶血量低于 40% 时会召唤三名超级兵守卫（仅一次）。</li><li><b>英雄彩蛋</b>：每位英雄都有专属被动，见英雄卡片。</li></ul></div>`,
    'hud.shop': '商店 (I)', 'hud.shopTitle': '商店', 'hud.autoBuy': '自动购买', 'hud.slain': '你被击败了', 'hud.respawnHint': '观战队友中…', 'hud.buy': '购买', 'hud.owned': '已拥有', 'hud.full': '已满',
    'hud.gold': '{g} 金币', 'hud.level': '{l} 级', 'hud.wave': '第 {n} 波', 'hud.recalling': '回城中…', 'hud.tab': '按住 Tab 查看战绩',
    'hud.tipStart': '走向你的分路。小兵将在 0:25 出发。', 'hud.controls': 'WASD 移动 · 左键普攻 · 1 2 3 技能 · F 召唤师技能 · B 回城 · I 商店 · Tab 战绩 · V 视角', 'hud.tipRecall': '血量低了？按 B 回城回复。',
    'score.hero': '英雄', 'score.kda': '击杀 / 死亡 / 助攻', 'score.gold': '金币', 'score.level': '等级', 'score.items': '装备',
    'overlay.captureMouse': '点击以捕获鼠标', 'overlay.towerAggro': '塔在打你！',
    'pause.paused': '已暂停', 'pause.sub': '对局已暂停，喘口气。', 'pause.resume': '继续', 'pause.settings': '设置', 'pause.quit': '投降并退出', 'pause.online': '对局仍在进行。',
    'results.victory': '胜利', 'results.defeat': '失败', 'results.draw': '平局', 'results.again': '再来一局', 'results.menu': '主菜单', 'results.duration': '{m}:{s} · 击杀 {k0} – {k1}',
    'result.crystal': '水晶已被摧毁', 'result.surrender': '投降', 'result.forfeit': '对方已离开',
    'award.champion': '冠军 · 对英雄伤害最高', 'award.warlord': '破城者 · 对塔伤害最高', 'award.executioner': '处刑者 · 击杀最多', 'award.farmer': '收割者 · 补刀最多',
    'award.mvp': 'MVP', 'award.svp': 'SVP', 'award.tank': '铁壁 · 承受伤害最高', 'award.assist': '助攻王 · 助攻最多', 'award.guardian': '守护者 · 治疗最多', 'award.rampage': '狂暴 · 最佳连杀', 'award.bigSpender': '富豪 · 金币最多', 'award.objectives': '屠龙者 · 野区目标',
    'streak.firstBlood': '一血！', 'streak.double': '双杀！', 'streak.triple': '三杀！', 'streak.quad': '四杀！', 'streak.penta': '五杀！',
    'streak.killingSpree': '大杀特杀', 'streak.unstoppable': '无人能挡！', 'streak.rampage': '横扫千军！', 'streak.peerless': '天下无双！', 'streak.dominating': '主宰比赛！', 'streak.legendary': '超神！', 'streak.ace': '团灭！',
    'feed.kill': '{killer} 击杀了 {victim}', 'feed.tower': '{team} 摧毁了{tier}塔', 'feed.crystal': '{team} 摧毁了水晶！', 'feed.objective': '{team} 击杀了{obj}',
    'tier.outer': '一', 'tier.inner': '二', 'tier.base': '高地', 'tier.crystal': '水晶',
    'objective.tyrant': '暴君已被击杀！', 'objective.overlord': '主宰已被击杀！', 'objective.tyrantSpawned': '暴君已出现', 'objective.overlordSpawned': '主宰已出现', 'objective.siegeHour': '攻城时刻：每波兵线都带攻城车', 'objective.guardians': '受创的水晶召唤了守护者！', 'objective.crumble': '城墙开始崩塌：每波兵线都会削弱所有防御塔', 'objective.superHour': '每波兵线都带超级兵',
    'buff.blue': '蓝 buff', 'buff.red': '红 buff', 'buff.tyrant': '暴君', 'buff.overlord': '主宰',
    'countdown.fight': '开战！', 'toast.recallInterrupted': '回城被打断', 'toast.skillLocked': '技能尚未学习', 'toast.noMana': '法力不足', 'toast.immortal': '复活甲！', 'toast.crowned': '加冕！下一个技能强化', 'toast.levelup': '升到 {l} 级！',
    'unit.tower': '防御塔', 'unit.minions': '小兵',
    'bot.easy': '新兵', 'bot.normal': '老兵', 'bot.hard': '王者',
    'fx.noTargets': '没有目标', 'fx.tyrantRide': '暴君之怒！',
    'settings.title': '设置', 'settings.sfx': '音效音量', 'settings.music': '音乐音量', 'settings.sensitivity': '鼠标灵敏度', 'settings.fov': '视野',
    'settings.invert': '反转鼠标 Y 轴', 'settings.announcer': '击杀播报语音', 'settings.festival': '节日模式（共鸣王冠、加冕防御塔、守护者等彩蛋机制）', 'settings.firstPerson': '默认第一人称', 'settings.quality': '画质', 'settings.high': '高', 'settings.low': '低', 'settings.language': '语言', 'settings.reset': '重置战绩',
    'online.title': '在线大厅', 'online.soon': '在线房间正在接入中，先和电脑来一局吧。',
    'online.name': '你的名字', 'online.namePh': '褪色者', 'online.create': '创建房间', 'online.join': '加入', 'online.codePh': '房间码', 'online.openRooms': '开放房间', 'online.noRooms': '暂时没有开放房间。创建一个并发送链接吧。',
    'online.hubHint': '房主选择模式。空位由电脑补上，两个朋友也能打 5v5。', 'online.room': '房间', 'online.copy': '复制链接', 'online.copied': '链接已复制', 'online.emptySeat': '空位 · 电脑', 'online.ready': '已准备', 'online.notReady': '未准备',
    'online.pickHero': '你的英雄：', 'online.chatPh': '说点什么…', 'online.send': '发送', 'online.leave': '离开', 'online.start': '开始对局', 'online.readyUp': '准备', 'online.unready': '取消准备', 'online.playing': '对局中', 'online.creating': '正在创建房间…', 'online.joining': '正在加入…',
    'net.waiting': '等待玩家… {s} 秒', 'net.outOfSync': '与其他玩家失去同步', 'net.rtt': '在线 · {ms} 毫秒', 'net.dropped': '座位 {seat} 无响应，电脑接管', 'net.left': '座位 {seat} 已离开，电脑接管',
    'err.noFreeCode': '找不到空闲房间码', 'err.notRoomCode': '这不是房间码', 'err.noHost': '房间 {0} 未开放', 'err.roomFull': '房间 {0} 已满', 'err.serverSilent': '服务器没有响应', 'err.network': '网络错误',
    'unit.近战兵': '近战兵', 'unit.远程兵': '远程兵', 'unit.炮车': '炮车', 'unit.超级兵': '超级兵', 'unit.寒冰魔': '寒冰魔', 'unit.赤炎魔': '赤炎魔', 'unit.野狼': '野狼', 'unit.刺猬': '刺猬', 'unit.乌鸦': '乌鸦', 'unit.岩石怪': '岩石怪', 'unit.野猪': '野猪', 'unit.暴君': '暴君', 'unit.主宰': '主宰',
    'select.spell': '召唤师技能', 'select.allRoles': '全部', 'results.score': '评分 {v}', 'score.damage': '输出', 'score.taken': '承伤',
    'shop.cat.attack': '攻击', 'shop.cat.magic': '法术', 'shop.cat.defense': '防御', 'shop.cat.support': '辅助', 'shop.cat.boots': '鞋',
    'fx.ultReady': '大招已解封！',
  },
};

export const CANVAS_FONT = '"Nunito", "Segoe UI", system-ui, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';

const isLang = (v: unknown): v is Lang => v === 'en' || v === 'zh';

export function getLang(): Lang {
  try { const stored = localStorage.getItem(LANG_KEY); if (isLang(stored)) return stored; } catch { /* storage unavailable */ }
  // 王者荣耀 is a Chinese game: 中文 by default, English on request
  return 'zh';
}
export function setLang(lang: Lang): void { try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage unavailable */ } }

let current: Lang = getLang();
export const lang = (): Lang => current;
const listeners = new Set<() => void>();
export function onLanguageChange(fn: () => void): void { listeners.add(fn); }

export type Vars = Record<string, string | number>;

export function t(key: string, vars?: Vars): string {
  let s = translations[current][key] ?? translations.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function tSim(text: string): string {
  if (!text.startsWith('@')) return text;
  const [key, ...args] = text.slice(1).split('|');
  return t(key, Object.fromEntries(args.map((a, i) => [String(i), tSim(a)])));
}

export function setLanguage(next: Lang): void {
  if (next === current) return;
  current = next;
  setLang(next);
  applyStaticDom();
  for (const fn of listeners) fn();
}

export function applyStaticDom(root: ParentNode = document): void {
  document.documentElement.lang = current === 'zh' ? 'zh-CN' : 'en';
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml!); });
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => { el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder!)); });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle!); });
}

// data strings are 中文; a missing zh key means the data itself is the zh text
export const tCard = (key: string, fallback: string): string => translations[current][key] ?? (current === 'zh' ? fallback : translations.en[key] ?? fallback);
export const cardName = (c: UnitDef): string => tCard(`hero.${c.id}.name`, c.name);
export const heroTitle = (c: UnitDef): string => tCard(`hero.${c.id}.title`, c.title ?? '');
export const cardDesc = (c: UnitDef): string => tCard(`hero.${c.id}.desc`, c.desc);
export const skillName = (a: AbilityDef): string => tCard(`skill.${a.name}`, a.name);
export const skillDesc = (a: AbilityDef): string => tCard(`skilldesc.${a.name}`, a.desc);
export const abilityName = (c: UnitDef): string => skillName(c.skills[0]);
export const abilityDesc = (c: UnitDef): string => skillDesc(c.skills[0]);
export const itemName = (id: string, fallback: string): string => tCard(`item.${id}`, fallback);
export const roleName = (r: string): string => t(`role.${r}`);
