import type { AbilityDef, Look, Role, UnitDef } from './types.ts';

/**
 * 王者荣耀 roster. Names and skill names are the game's own (中文 is the canonical key; English lives in i18n).
 * Numbers follow the shape of the real kits at level 1 → 15 on this engine's scale (hero HP ~3000–3900,
 * attack ~150–185, towers 4200+). Skills: 1 / 2 / 3(大招); the 大招 unlocks at level 4.
 */
type HeroSpec = Omit<UnitDef, 'kind' | 'desc' | 'splash' | 'flying' | 'targets' | 'sight'> & { desc?: string; splash?: number; sight?: number };

const base = (role: Role): Pick<UnitDef, 'hpRegen' | 'manaRegen' | 'attackSpeedGrowth' | 'resistGrowth' | 'armorGrowth' | 'powerGrowth' | 'damageGrowth' | 'hpGrowth'> => {
  switch (role) {
    case 'tank': return { hpGrowth: 320, damageGrowth: 12, powerGrowth: 0, armorGrowth: 24, resistGrowth: 14, attackSpeedGrowth: 0.012, hpRegen: 9, manaRegen: 2.5 } as never;
    case 'warrior': return { hpGrowth: 275, damageGrowth: 15, powerGrowth: 0, armorGrowth: 19, resistGrowth: 11, attackSpeedGrowth: 0.02, hpRegen: 7, manaRegen: 2.2 } as never;
    case 'assassin': return { hpGrowth: 265, damageGrowth: 18, powerGrowth: 0, armorGrowth: 16, resistGrowth: 9, attackSpeedGrowth: 0.025, hpRegen: 6, manaRegen: 2.5 } as never;
    case 'mage': return { hpGrowth: 200, damageGrowth: 8, powerGrowth: 26, armorGrowth: 12, resistGrowth: 9, attackSpeedGrowth: 0.012, hpRegen: 5, manaRegen: 4.5 } as never;
    case 'marksman': return { hpGrowth: 215, damageGrowth: 20, powerGrowth: 0, armorGrowth: 13, resistGrowth: 5, attackSpeedGrowth: 0.03, hpRegen: 5, manaRegen: 2.2 } as never;
    case 'support': return { hpGrowth: 255, damageGrowth: 10, powerGrowth: 16, armorGrowth: 17, resistGrowth: 9, attackSpeedGrowth: 0.012, hpRegen: 8, manaRegen: 4 } as never;
  }
};

const look = (color: string, accent: string, weapon: Look['weapon'], size = 0.42, outfit: Partial<Omit<Look, 'color' | 'accent' | 'weapon' | 'size' | 'shape'>> = {}, shape: Look['shape'] = 'humanoid'): Look => ({ color, accent, shape, weapon, size, ...outfit });
const S = (a: AbilityDef): AbilityDef => a;
const ORDER_1 = [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2];
const ORDER_2 = [1, 0, 1, 2, 1, 1, 0, 2, 1, 0, 0, 2, 0, 0, 2];

const HERO_SPECS: HeroSpec[] = [
  // ------------------------------------------------------------------ 射手
  {
    id: 'houyi', name: '后羿', title: '半神之弓', role: 'marksman', ...base('marksman'),
    look: look('#b8352a', '#f3c969', 'bow', 0.4, { gear: 'bandana', armor: 'leather', hair: { color: '#6b2a1a', style: 'pony' } }),
    hp: 3200, damage: 168, power: 0, armor: 86, resist: 50, hitSpeed: 1.0, range: 6.8, speed: 3.9, radius: 0.4, mana: 430, attackType: 'physical', projectile: 'arrow', projectileSpeed: 15,
    lore: '射落九日的半神，弓弦一响，天地失色。',
    tips: '站在队友身后持续普攻；多重箭矢清线极快，灼日之光可以从全图射出，眩晕第一个命中的敌方英雄。',
    passive: { name: '炽热之箭', desc: '普攻命中后使目标灼烧 2 秒，并提升自身攻速。', kind: 'burnOnHit', value: 22 },
    skills: [
      S({ kind: 'multiStrike', name: '多重箭矢', desc: '接下来 3 次普攻变为多重箭，对目标周围的敌人也造成伤害。', cooldown: 7, mana: 50, count: 3, radius: 1.6, buff: { speed: 1, attack: 1.25 }, duration: 5, color: '#ffd166', sfx: 'rainOfArrows' }),
      S({ kind: 'lineShot', name: '落日余晖', desc: '朝指定方向射出一支箭，对命中的敌人造成伤害并减速。', cooldown: 9, mana: 60, damage: 240, damageGrowth: 60, ratio: 0.9, type: 'physical', range: 9, slow: 0.5, slowT: 2, color: '#ff9b4a', sfx: 'piercingShot' }),
      S({ kind: 'globalShot', name: '灼日之光', desc: '向指定方向射出一支横贯全图的太阳之箭，眩晕命中的第一名敌方英雄。', cooldown: 60, mana: 120, damage: 450, damageGrowth: 150, ratio: 1.2, type: 'physical', range: 60, stun: 1.5, radius: 0.7, color: '#ffe27a', sfx: 'meteorIncoming' }),
    ],
    skillOrder: ORDER_1,
    build: ['jibu_zhixue', 'wujin_zhanren', 'pojun', 'qixue_zhiren', 'yingren', 'mingdao_siming'],
  },
  {
    id: 'luban', name: '鲁班七号', title: '机关造物', role: 'marksman', ...base('marksman'),
    look: look('#4e9c5a', '#ffe36b', 'rifle', 0.34, { gear: 'cap', armor: 'leather', hair: { color: '#2d6b3a', style: 'short' } }),
    hp: 3000, damage: 160, power: 0, armor: 82, resist: 48, hitSpeed: 1.0, range: 6.6, speed: 3.85, radius: 0.38, mana: 420, attackType: 'physical', projectile: 'bolt', projectileSpeed: 17,
    lore: '鲁班大师的第七号作品，一台会碎碎念的全自动火炮。',
    tips: '四次普攻后触发扫射；河豚手雷减速敌人，空中支援可以隔墙轰炸。',
    passive: { name: '火力压制', desc: '每 4 次普攻后，下一次普攻变为扫射，发射 3 发弹药。', kind: 'nthBurst', n: 4, value: 0.55 },
    skills: [
      S({ kind: 'aoeAim', name: '河豚手雷', desc: '投掷一枚河豚手雷，爆炸造成伤害并减速。', cooldown: 8, mana: 55, damage: 220, damageGrowth: 55, ratio: 0.7, type: 'physical', range: 7, radius: 1.8, slow: 0.4, slowT: 1.5, color: '#9be36b', sfx: 'clusterBomb' }),
      S({ kind: 'lineShot', name: '无敌鲨嘴炮', desc: '发射一枚鲨嘴炮弹，贯穿并伤害直线上的敌人。', cooldown: 10, mana: 60, damage: 300, damageGrowth: 70, ratio: 1.0, type: 'physical', range: 9, color: '#ffe36b', sfx: 'cannon' }),
      S({ kind: 'aoeAim', name: '空中支援', desc: '呼叫空中火力轰炸指定区域，持续 3 秒。', cooldown: 40, mana: 110, damage: 150, damageGrowth: 50, ratio: 0.5, type: 'physical', range: 10, radius: 3.0, duration: 3, tick: 0.4, color: '#ff8a3c', sfx: 'rainOfArrows' }),
    ],
    skillOrder: ORDER_1,
    build: ['jibu_zhixue', 'wujin_zhanren', 'yingren', 'pojun', 'qixue_zhiren', 'mingdao_siming'],
  },
  {
    id: 'sunshangxiang', name: '孙尚香', title: '弓腰姬', role: 'marksman', ...base('marksman'),
    look: look('#c23b3b', '#f6d27a', 'rifle', 0.4, { gear: 'bandana', armor: 'leather', hair: { color: '#5a2a1a', style: 'pony' }, skirt: true }),
    hp: 3100, damage: 172, power: 0, armor: 86, resist: 50, hitSpeed: 1.0, range: 6.5, speed: 3.95, radius: 0.4, mana: 400, attackType: 'physical', projectile: 'cannonball', projectileSpeed: 15,
    lore: '江东的弓腰姬，扛着比自己还高的大炮冲在最前面。',
    tips: '翻滚突袭重置位置并强化下一次普攻；炮弹冲击贯穿，红莲爆弹用来收割。',
    passive: { name: '翻滚强化', desc: '翻滚后的下一次普攻必定暴击。', kind: 'nthCrit', n: 1, value: 1.8 },
    skills: [
      S({ kind: 'blink', name: '翻滚突袭', desc: '向指定方向翻滚，下一次普攻强化并暴击。', cooldown: 8, mana: 40, range: 3.4, critMult: 1.9, color: '#ffd9a8', sfx: 'dash' }),
      S({ kind: 'lineShot', name: '炮弹冲击', desc: '发射一枚贯穿炮弹，造成伤害并减速。', cooldown: 9, mana: 55, damage: 260, damageGrowth: 65, ratio: 0.9, type: 'physical', range: 8.5, slow: 0.3, slowT: 1.5, color: '#ff9d3c', sfx: 'cannon' }),
      S({ kind: 'aoeAim', name: '红莲爆弹', desc: '发射一枚巨型爆弹，在落点爆炸造成大范围伤害。', cooldown: 38, mana: 110, damage: 520, damageGrowth: 160, ratio: 1.3, type: 'physical', range: 9, radius: 2.6, knockback: 0.5, color: '#ff4e2a', sfx: 'clusterBomb' }),
    ],
    skillOrder: ORDER_2,
    build: ['jibu_zhixue', 'wujin_zhanren', 'yingren', 'pojun', 'qixue_zhiren', 'mingdao_siming'],
  },
  {
    id: 'makeboluo', name: '马可波罗', title: '远游之枪', role: 'marksman', ...base('marksman'),
    look: look('#2f5e9e', '#e8ecf3', 'rifle', 0.4, { gear: 'tricorn', armor: 'leather', cape: true, hair: { color: '#e8d8a8', style: 'short' } }),
    hp: 3050, damage: 158, power: 0, armor: 84, resist: 50, hitSpeed: 0.85, range: 6.2, speed: 4.0, radius: 0.4, mana: 400, attackType: 'physical', projectile: 'bolt', projectileSpeed: 18,
    lore: '双枪在手，走遍天下。马可波罗从不停下脚步。',
    tips: '边走边打：华丽左轮扫射，漫游之枪翻滚脱身，狂热交锋旋转射击追击残血。',
    passive: { name: '真实伤害', desc: '普攻附带 10% 的真实伤害。', kind: 'trueDamage', value: 0.1 },
    skills: [
      S({ kind: 'spreadShot', name: '华丽左轮', desc: '朝指定方向连续射击，发射 5 发子弹。', cooldown: 7, mana: 45, damage: 120, damageGrowth: 30, ratio: 0.5, type: 'physical', count: 5, spread: 0.5, range: 7, color: '#9fd0ff', sfx: 'piercingShot' }),
      S({ kind: 'blink', name: '漫游之枪', desc: '向指定方向翻滚，下一次普攻强化。', cooldown: 10, mana: 50, range: 3.5, critMult: 1.6, color: '#dff3ff', sfx: 'dash' }),
      S({ kind: 'spin', name: '狂热交锋', desc: '持续 3 秒旋转射击周围的敌人，期间移速提升。', cooldown: 40, mana: 110, damage: 110, damageGrowth: 35, ratio: 0.5, type: 'physical', radius: 3.2, duration: 3, tick: 0.3, buff: { speed: 1.3, attack: 1 }, color: '#7cc8ff', sfx: 'whirlwind' }),
    ],
    skillOrder: ORDER_1,
    build: ['jibu_zhixue', 'moshi', 'wujin_zhanren', 'pojun', 'qixue_zhiren', 'mingdao_siming'],
  },
  // ------------------------------------------------------------------ 法师
  {
    id: 'daji', name: '妲己', title: '魅惑之狐', role: 'mage', ...base('mage'),
    look: look('#e36aa3', '#fff0f6', 'orb', 0.38, { gear: 'cap', armor: 'robe', hair: { color: '#ffd6ea', style: 'long' }, ears: 'fox', tails: 'fox', skirt: true }),
    hp: 2900, damage: 140, power: 0, armor: 78, resist: 52, hitSpeed: 1.0, range: 6.2, speed: 3.8, radius: 0.38, mana: 540, attackType: 'magic', projectile: 'shadow', projectileSpeed: 12,
    lore: '请尽情吩咐妲己，主人。',
    tips: '二技能眩晕接一技能和大招，是最简单的爆发连招。',
    passive: { name: '女王崇拜', desc: '技能命中会降低目标 30 点法术防御，持续 3 秒。', kind: 'shredOnSkill', value: 30 },
    skills: [
      S({ kind: 'lineShot', name: '灵魂冲击', desc: '发射一道灵魂冲击波，造成法术伤害并减速。', cooldown: 6, mana: 55, damage: 260, damageGrowth: 60, ratio: 0.6, type: 'magic', range: 8, slow: 0.5, slowT: 1.5, color: '#ff8ad0', sfx: 'shadow' }),
      S({ kind: 'aoeAim', name: '偶像魅力', desc: '对指定位置的敌人造成伤害并眩晕 1.5 秒。', cooldown: 11, mana: 70, damage: 330, damageGrowth: 80, ratio: 0.7, type: 'magic', range: 7, radius: 1.2, stun: 1.5, color: '#ffb0e8', sfx: 'shock' }),
      S({ kind: 'spreadShot', name: '女王崇拜', desc: '射出 5 只狐狸灵魂，对命中的敌人造成法术伤害。', cooldown: 34, mana: 120, damage: 220, damageGrowth: 70, ratio: 0.55, type: 'magic', count: 5, spread: 0.8, range: 7, color: '#ff6ac8', sfx: 'shadow' }),
    ],
    skillOrder: ORDER_2,
    build: ['lengjing_zhixue', 'huixiang_zhizhang', 'xuwu_fazhang', 'tongku_mianju', 'boxuezhe_zhinu', 'xianzhe_bihu'],
  },
  {
    id: 'anqila', name: '安琪拉', title: '暗夜萝莉', role: 'mage', ...base('mage'),
    look: look('#d94a7a', '#ffd1e6', 'staff', 0.36, { gear: 'hat', armor: 'robe', hair: { color: '#ff9ad0', style: 'twin' }, skirt: true, doll: true }),
    hp: 2850, damage: 138, power: 0, armor: 76, resist: 54, hitSpeed: 1.0, range: 6.0, speed: 3.8, radius: 0.38, mana: 560, attackType: 'magic', projectile: 'fireball', projectileSpeed: 11,
    lore: '抱着小熊玩偶的暗夜萝莉，魔法已经失控了。',
    tips: '混沌火种眩晕后接火球术，再用炽热光辉持续喷射收割。',
    passive: { name: '失控的魔法', desc: '技能命中会叠加灼烧印记，每层每秒造成额外法术伤害（最多 3 层）。', kind: 'skillBurnStack', value: 18 },
    skills: [
      S({ kind: 'lineShot', name: '火球术', desc: '发射一枚火球，对直线上的敌人造成法术伤害。', cooldown: 5.5, mana: 50, damage: 250, damageGrowth: 60, ratio: 0.65, type: 'magic', range: 8, color: '#ff7a3c', sfx: 'fireball' }),
      S({ kind: 'aoeAim', name: '混沌火种', desc: '在指定位置引爆混沌火种，造成伤害并眩晕 1 秒。', cooldown: 10, mana: 70, damage: 300, damageGrowth: 70, ratio: 0.6, type: 'magic', range: 7, radius: 1.6, stun: 1.0, color: '#ff4a8a', sfx: 'firestorm' }),
      S({ kind: 'cone', name: '炽热光辉', desc: '向前方持续喷射火焰 2.5 秒，对范围内的敌人造成高额法术伤害。', cooldown: 40, mana: 130, damage: 140, damageGrowth: 45, ratio: 0.4, type: 'magic', radius: 5.5, spread: 0.7, duration: 2.5, tick: 0.25, burn: 20, color: '#ff5a3c', sfx: 'infernoBreath' }),
    ],
    skillOrder: ORDER_1,
    build: ['lengjing_zhixue', 'huixiang_zhizhang', 'tongku_mianju', 'xuwu_fazhang', 'boxuezhe_zhinu', 'huiyue'],
  },
  {
    id: 'wangzhaojun', name: '王昭君', title: '冰雪之华', role: 'mage', ...base('mage'),
    look: look('#4f8fd6', '#eaf7ff', 'staff', 0.38, { gear: 'cap', armor: 'robe', cape: true, hair: { color: '#bfe3ff', style: 'long' }, skirt: true }),
    hp: 2900, damage: 136, power: 0, armor: 78, resist: 55, hitSpeed: 1.0, range: 6.4, speed: 3.75, radius: 0.38, mana: 580, attackType: 'magic', projectile: 'ice', projectileSpeed: 12,
    lore: '出塞的琵琶声中，风雪为她停步。',
    tips: '凛冬之息减速，再次命中即可冰冻；冰雪风暴控住整片战场。',
    passive: { name: '冰封之心', desc: '技能命中会减速敌人；对已减速的敌人再次减速会将其冰冻 1 秒。', kind: 'freezeOnSlow', value: 1.0 },
    skills: [
      S({ kind: 'lineShot', name: '凛冬之息', desc: '射出一道冰刃，贯穿敌人并减速。', cooldown: 6, mana: 55, damage: 240, damageGrowth: 60, ratio: 0.6, type: 'magic', range: 8, slow: 0.5, slowT: 2, color: '#9fe3ff', sfx: 'ice' }),
      S({ kind: 'aoeAim', name: '冰封雪域', desc: '冰封指定区域，造成伤害并大幅减速。', cooldown: 11, mana: 75, damage: 300, damageGrowth: 70, ratio: 0.6, type: 'magic', range: 7, radius: 2.2, slow: 0.6, slowT: 2, color: '#c7f0ff', sfx: 'frost' }),
      S({ kind: 'aoeAim', name: '冰雪风暴', desc: '召唤持续 4 秒的暴风雪，对范围内敌人持续造成伤害并减速。', cooldown: 42, mana: 140, damage: 150, damageGrowth: 50, ratio: 0.45, type: 'magic', range: 8, radius: 3.6, duration: 4, tick: 0.5, slow: 0.5, slowT: 1, color: '#bfe8ff', sfx: 'frost' }),
    ],
    skillOrder: ORDER_1,
    build: ['lengjing_zhixue', 'huixiang_zhizhang', 'bingshuang_fazhang', 'tongku_mianju', 'xuwu_fazhang', 'xianzhe_bihu'],
  },
  {
    id: 'zhugeliang', name: '诸葛亮', title: '智绝', role: 'mage', ...base('mage'),
    look: look('#3b6fb3', '#f4f6fa', 'book', 0.4, { gear: 'cap', armor: 'robe', cape: true, hair: { color: '#1b1b24', style: 'topknot' }, beard: true }),
    hp: 2950, damage: 142, power: 0, armor: 80, resist: 54, hitSpeed: 1.0, range: 6.2, speed: 3.9, radius: 0.4, mana: 520, attackType: 'magic', projectile: 'holy', projectileSpeed: 13,
    lore: '羽扇轻摇，天下尽在策谋之中。',
    tips: '用东风破袭叠满法球，时空穿梭进场，元气弹收割残血。',
    passive: { name: '策谋之刻', desc: '技能命中会获得法球，叠满 5 个后自动飞向附近的敌人造成伤害。', kind: 'orbs', n: 5, value: 160 },
    skills: [
      S({ kind: 'blink', name: '时空穿梭', desc: '向指定方向闪现，并提升接下来的攻速。', cooldown: 9, mana: 50, range: 4.5, critMult: 1.3, color: '#9fd0ff', sfx: 'shadowstep' }),
      S({ kind: 'spreadShot', name: '东风破袭', desc: '向前方射出 3 枚法球，造成法术伤害。', cooldown: 6, mana: 55, damage: 200, damageGrowth: 50, ratio: 0.55, type: 'magic', count: 3, spread: 0.5, range: 7.5, color: '#7cc8ff', sfx: 'holy' }),
      S({ kind: 'chain', name: '元气弹', desc: '锁定附近的敌方英雄，发射元气弹造成高额伤害（对残血敌人伤害更高）。', cooldown: 36, mana: 120, damage: 520, damageGrowth: 170, ratio: 1.0, type: 'magic', range: 8, count: 1, execute: 0.25, color: '#5ab0ff', sfx: 'thunderstorm' }),
    ],
    skillOrder: ORDER_2,
    build: ['lengjing_zhixue', 'huixiang_zhizhang', 'xuwu_fazhang', 'boxuezhe_zhinu', 'tongku_mianju', 'huiyue'],
  },
  {
    id: 'diaochan', name: '貂蝉', title: '绝世舞姬', role: 'mage', ...base('mage'),
    look: look('#9b5de5', '#ffe6f7', 'orb', 0.38, { gear: 'cap', armor: 'robe', cape: true, hair: { color: '#5a2d8a', style: 'bun' }, skirt: true }),
    hp: 3000, damage: 150, power: 0, armor: 82, resist: 54, hitSpeed: 1.0, range: 4.5, speed: 4.0, radius: 0.38, mana: 500, attackType: 'magic', projectile: 'holy', projectileSpeed: 14,
    lore: '一舞倾城，花瓣落处皆是刀锋。',
    tips: '缘·心结穿梭叠印记，第四次技能命中引爆回血；大招开启后在人群中跳舞。',
    passive: { name: '绽·风华', desc: '技能命中叠加印记，第 4 层引爆造成额外伤害并治疗自己。', kind: 'markDetonateHeal', n: 4, value: 220 },
    skills: [
      S({ kind: 'lineShot', name: '落·红雨', desc: '抛出花瓣法球，对直线上的敌人造成法术伤害并减速。', cooldown: 5, mana: 45, damage: 210, damageGrowth: 50, ratio: 0.55, type: 'magic', range: 6.5, slow: 0.3, slowT: 1, color: '#ff8ad0', sfx: 'holy' }),
      S({ kind: 'dashStrike', name: '缘·心结', desc: '向指定方向穿梭，对路径上的敌人造成伤害。', cooldown: 7, mana: 50, damage: 230, damageGrowth: 55, ratio: 0.5, type: 'magic', range: 4.5, radius: 1.0, color: '#d9a8ff', sfx: 'shadowstep' }),
      S({ kind: 'spin', name: '绽·风华', desc: '起舞 4 秒，对周围敌人持续造成法术伤害，期间移速提升。', cooldown: 36, mana: 120, damage: 120, damageGrowth: 40, ratio: 0.45, type: 'magic', radius: 2.8, duration: 4, tick: 0.3, buff: { speed: 1.25, attack: 1 }, color: '#ff6ac8', sfx: 'whirlwind' }),
    ],
    skillOrder: ORDER_1,
    build: ['lengjing_zhixue', 'huixiang_zhizhang', 'tongku_mianju', 'bingshuang_fazhang', 'xuwu_fazhang', 'huiyue'],
  },
  // ------------------------------------------------------------------ 刺客
  {
    id: 'sunwukong', name: '孙悟空', title: '齐天大圣', role: 'assassin', ...base('assassin'),
    look: look('#d8a23a', '#c0392b', 'staff', 0.42, { gear: 'bandana', armor: 'plate', cape: true, hair: { color: '#c8762a', style: 'short' }, tails: 'monkey' }),
    hp: 3250, damage: 185, power: 0, armor: 86, resist: 52, hitSpeed: 0.9, range: 1.6, speed: 4.3, radius: 0.44, mana: 380, attackType: 'physical',
    lore: '俺老孙来也！',
    tips: '护身咒法免疫伤害进场，斗战冲锋击飞，再用如意金箍棒三连击带走脆皮。',
    passive: { name: '强化普攻', desc: '每第 3 次普攻必定暴击，造成额外伤害。', kind: 'nthCrit', n: 3, value: 2.0 },
    skills: [
      S({ kind: 'selfBuff', name: '护身咒法', desc: '进入护身状态 1.5 秒，免疫伤害并提升移速。', cooldown: 14, mana: 60, duration: 1.5, invuln: 1.5, buff: { speed: 1.3, attack: 1 }, color: '#ffd86b', sfx: 'adrenaline' }),
      S({ kind: 'dashStrike', name: '斗战冲锋', desc: '向指定方向冲锋，对路径上的敌人造成伤害并击飞。', cooldown: 10, mana: 60, damage: 240, damageGrowth: 60, ratio: 0.8, type: 'physical', range: 5, radius: 1.0, stun: 0.8, knockback: 1.2, color: '#ffb347', sfx: 'stampede' }),
      S({ kind: 'multiStrike', name: '如意金箍棒', desc: '接下来 3 次普攻变为强化棒击，每次造成额外伤害并附带短暂击飞。', cooldown: 32, mana: 100, count: 3, buff: { speed: 1.1, attack: 1.8 }, duration: 6, stun: 0.3, color: '#ffe08a', sfx: 'groundSlam' }),
    ],
    skillOrder: [1, 0, 1, 2, 1, 1, 0, 2, 1, 0, 0, 2, 0, 0, 2],
    build: ['jibu_zhixue', 'wujin_zhanren', 'anying_zhanfu', 'suixing_chui', 'mingdao_siming', 'xianzhe_bihu'],
  },
  {
    id: 'libai', name: '李白', title: '青莲剑仙', role: 'assassin', ...base('assassin'),
    look: look('#e9eef5', '#4f8fd6', 'sword', 0.4, { gear: 'cap', armor: 'robe', cape: true, hair: { color: '#f4f6fa', style: 'long' } }),
    hp: 3150, damage: 180, power: 0, armor: 82, resist: 50, hitSpeed: 0.85, range: 1.5, speed: 4.35, radius: 0.42, mana: 400, attackType: 'physical',
    lore: '十步杀一人，千里不留行。',
    tips: '先用 4 次普攻解除剑意封印，再将进酒切入、神来之笔减伤、青莲剑歌斩杀。',
    passive: { name: '侠客行', desc: '4 次普攻后解除剑意封印，5 秒内可以释放青莲剑歌。', kind: 'ultGate', n: 4, value: 5 },
    skills: [
      S({ kind: 'dashStrike', name: '将进酒', desc: '向指定方向突进并挥剑，对路径上的敌人造成伤害。', cooldown: 7, mana: 50, damage: 250, damageGrowth: 60, ratio: 0.85, type: 'physical', range: 5, radius: 1.0, color: '#9fd0ff', sfx: 'lanceCharge' }),
      S({ kind: 'aoeSelf', name: '神来之笔', desc: '以剑气画出一个圆环，对圈内敌人造成伤害并减速，自己获得护盾。', cooldown: 10, mana: 60, damage: 220, damageGrowth: 55, ratio: 0.7, type: 'physical', radius: 3.0, slow: 0.4, slowT: 1.5, shield: 300, color: '#bfe8ff', sfx: 'whirlwind' }),
      S({ kind: 'aoeSelf', name: '青莲剑歌', desc: '化身剑气，对周围的敌人造成高额伤害，期间免疫伤害。', cooldown: 30, mana: 100, damage: 520, damageGrowth: 170, ratio: 1.3, type: 'physical', radius: 3.4, invuln: 1.0, color: '#7cc8ff', sfx: 'deathLeap' }),
    ],
    skillOrder: ORDER_1,
    build: ['jibu_zhixue', 'anying_zhanfu', 'wujin_zhanren', 'suixing_chui', 'mingdao_siming', 'xianzhe_bihu'],
  },
  {
    id: 'hanxin', name: '韩信', title: '国士无双', role: 'assassin', ...base('assassin'),
    look: look('#2f3f6b', '#e9c46a', 'lance', 0.42, { gear: 'cap', armor: 'leather', cape: true, hair: { color: '#1b1b24', style: 'pony' } }),
    hp: 3200, damage: 182, power: 0, armor: 84, resist: 50, hitSpeed: 0.85, range: 1.7, speed: 4.35, radius: 0.42, mana: 400, attackType: 'physical',
    lore: '他想要的，是整个天下。',
    tips: '无情冲锋连续突进，背水一战挑飞，国士无双跨越地形追击。',
    passive: { name: '背水一战', desc: '每第 3 次普攻造成额外伤害并将目标击飞 0.4 秒。', kind: 'nthStun', n: 3, value: 0.5 },
    skills: [
      S({ kind: 'dashStrike', name: '无情冲锋', desc: '向指定方向连续冲锋，对路径上的敌人造成伤害。', cooldown: 6, mana: 45, damage: 220, damageGrowth: 55, ratio: 0.8, type: 'physical', range: 6, radius: 0.9, color: '#ffe9a8', sfx: 'lanceCharge' }),
      S({ kind: 'aoeSelf', name: '背水一战', desc: '持枪横扫，对周围敌人造成伤害并击飞。', cooldown: 10, mana: 60, damage: 260, damageGrowth: 65, ratio: 0.8, type: 'physical', radius: 2.4, stun: 0.7, knockback: 0.6, color: '#f6d27a', sfx: 'groundSlam' }),
      S({ kind: 'leap', name: '国士无双', desc: '向指定方向跃起突进，落地对敌人造成伤害并眩晕。', cooldown: 30, mana: 100, damage: 480, damageGrowth: 150, ratio: 1.2, type: 'physical', range: 7, radius: 2.2, stun: 1.0, color: '#ffd166', sfx: 'dive' }),
    ],
    skillOrder: ORDER_1,
    build: ['jibu_zhixue', 'anying_zhanfu', 'wujin_zhanren', 'suixing_chui', 'mingdao_siming', 'xianzhe_bihu'],
  },
  // ------------------------------------------------------------------ 战士
  {
    id: 'yase', name: '亚瑟', title: '圣骑之力', role: 'warrior', ...base('warrior'),
    look: look('#2f5ea8', '#f3c969', 'sword', 0.45, { armor: 'plate', cape: true, hair: { color: '#e8d8a8', style: 'short' } }),
    hp: 3500, damage: 178, power: 0, armor: 94, resist: 56, hitSpeed: 0.95, range: 1.5, speed: 4.0, radius: 0.46, mana: 0, attackType: 'physical',
    lore: '圆桌骑士之王，以圣剑裁决一切不义。',
    tips: '誓约之盾加速接近并沉默，回旋打击持续输出，圣剑裁决压制脆皮。',
    passive: { name: '圣光庇护', desc: '脱离战斗 5 秒后，每秒恢复 2% 最大生命值。', kind: 'oocRegen', value: 0.02 },
    skills: [
      S({ kind: 'selfBuff', name: '誓约之盾', desc: '提升移速 3 秒，下一次普攻造成额外伤害并沉默目标。', cooldown: 10, mana: 0, duration: 3, buff: { speed: 1.3, attack: 1.6 }, color: '#9ec5ff', sfx: 'adrenaline' }),
      S({ kind: 'spin', name: '回旋打击', desc: '挥舞圣剑持续 3 秒，对周围敌人持续造成伤害。', cooldown: 11, mana: 0, damage: 95, damageGrowth: 30, ratio: 0.45, type: 'physical', radius: 2.3, duration: 3, tick: 0.35, buff: { speed: 1.1, attack: 1 }, color: '#dfe9ff', sfx: 'whirlwind' }),
      S({ kind: 'leap', name: '圣剑裁决', desc: '跃向目标并将其压制，造成伤害外加目标 20% 最大生命值的伤害。', cooldown: 34, mana: 0, damage: 300, damageGrowth: 100, ratio: 0.8, type: 'physical', range: 6, radius: 1.6, stun: 1.0, maxHpPct: 0.2, color: '#ffd166', sfx: 'dive' }),
    ],
    skillOrder: ORDER_2,
    build: ['yingren_zhizu', 'anying_zhanfu', 'fanshang_cijia', 'honglian_doupeng', 'buxiang_zhengzhao', 'bazhe_zhongzhuang'],
  },
  {
    id: 'dianwei', name: '典韦', title: '狂战士', role: 'warrior', ...base('warrior'),
    look: look('#8b2d2d', '#e07a2a', 'axe', 0.47, { gear: 'bandana', armor: 'leather', hair: { color: '#1b1b24', style: 'short' }, beard: true }),
    hp: 3600, damage: 182, power: 0, armor: 92, resist: 54, hitSpeed: 0.95, range: 1.5, speed: 4.0, radius: 0.47, mana: 0, attackType: 'physical',
    lore: '古之恶来，一柄双戟荡平千军。',
    tips: '狂战士之心叠攻速，怒气爆发击飞，亡命之徒扑向敌人大杀四方。',
    passive: { name: '狂战', desc: '每次普攻叠加一层狂战，每层提升攻速 6%（最多 5 层）。', kind: 'frenzyStacks', n: 5, value: 0.06 },
    skills: [
      S({ kind: 'selfBuff', name: '狂战士之心', desc: '提升攻速和移速 4 秒，并获得一层护盾。', cooldown: 10, mana: 0, duration: 4, buff: { speed: 1.2, attack: 1.3 }, shield: 250, color: '#ff7a3c', sfx: 'adrenaline' }),
      S({ kind: 'aoeSelf', name: '怒气爆发', desc: '猛砸地面，对周围敌人造成伤害并击飞。', cooldown: 11, mana: 0, damage: 260, damageGrowth: 65, ratio: 0.8, type: 'physical', radius: 2.4, stun: 0.8, knockback: 0.8, color: '#ffb347', sfx: 'groundSlam' }),
      S({ kind: 'leap', name: '亡命之徒', desc: '跃向目标区域，落地造成高额伤害并眩晕。', cooldown: 36, mana: 0, damage: 500, damageGrowth: 160, ratio: 1.2, type: 'physical', range: 6, radius: 2.4, stun: 0.8, color: '#ff4e2a', sfx: 'dive' }),
    ],
    skillOrder: ORDER_1,
    build: ['jibu_zhixue', 'anying_zhanfu', 'wujin_zhanren', 'fanshang_cijia', 'pojun', 'mingdao_siming'],
  },
  {
    id: 'zhaoyun', name: '赵云', title: '苍天翔龙', role: 'warrior', ...base('warrior'),
    look: look('#c9d6e3', '#3b6fb3', 'lance', 0.45, { armor: 'plate', cape: true, hair: { color: '#1b1b24', style: 'pony' } }),
    hp: 3450, damage: 180, power: 0, armor: 92, resist: 55, hitSpeed: 0.92, range: 1.7, speed: 4.05, radius: 0.46, mana: 0, attackType: 'physical',
    lore: '常山赵子龙，一身是胆。',
    tips: '惊雷之龙突进，破云之龙旋转输出，天翔之龙击飞收尾，血量越低越能扛。',
    passive: { name: '龙胆', desc: '损失的生命值越多，受到的伤害越低（最多减免 40%）。', kind: 'missingHpDR', value: 0.4 },
    skills: [
      S({ kind: 'dashStrike', name: '惊雷之龙', desc: '向指定方向突进并刺击，对路径上的敌人造成伤害。', cooldown: 7, mana: 0, damage: 240, damageGrowth: 60, ratio: 0.85, type: 'physical', range: 5, radius: 1.0, color: '#9fd0ff', sfx: 'lanceCharge' }),
      S({ kind: 'spin', name: '破云之龙', desc: '旋转长枪 2.5 秒，对周围敌人持续造成伤害。', cooldown: 11, mana: 0, damage: 100, damageGrowth: 32, ratio: 0.5, type: 'physical', radius: 2.4, duration: 2.5, tick: 0.35, buff: { speed: 1.1, attack: 1 }, color: '#dfe9ff', sfx: 'whirlwind' }),
      S({ kind: 'leap', name: '天翔之龙', desc: '跃起后重击落点，对范围内敌人造成伤害并击飞。', cooldown: 34, mana: 0, damage: 480, damageGrowth: 150, ratio: 1.2, type: 'physical', range: 7, radius: 2.4, stun: 1.0, knockback: 0.8, color: '#5ad1ff', sfx: 'dive' }),
    ],
    skillOrder: ORDER_1,
    build: ['jibu_zhixue', 'anying_zhanfu', 'wujin_zhanren', 'fanshang_cijia', 'pojun', 'mingdao_siming'],
  },
  // ------------------------------------------------------------------ 坦克
  {
    id: 'chengyaojin', name: '程咬金', title: '热烈之斧', role: 'tank', ...base('tank'),
    look: look('#3f7a3a', '#f3c969', 'axe', 0.5, { gear: 'hornhelm', armor: 'plate', beard: true, hair: { color: '#3a2a1a', style: 'short' } }),
    hp: 3800, damage: 170, power: 0, armor: 100, resist: 58, hitSpeed: 1.0, range: 1.5, speed: 3.95, radius: 0.5, mana: 0, attackType: 'physical',
    lore: '三板斧砍下去，什么都解决了。',
    tips: '血量越低攻击越高；刚烈之斧冲进去，残血时开赤血狂暴回满。',
    passive: { name: '怒气勃发', desc: '损失的生命值越多，攻击力越高（最多 +60%）。', kind: 'rageAttack', value: 0.6 },
    skills: [
      S({ kind: 'dashStrike', name: '刚烈之斧', desc: '向指定方向冲锋，对路径上的敌人造成伤害并击飞。', cooldown: 9, mana: 0, damage: 240, damageGrowth: 60, ratio: 0.7, type: 'physical', range: 4.5, radius: 1.0, stun: 0.8, knockback: 1.4, color: '#9be36b', sfx: 'shieldBash' }),
      S({ kind: 'aoeSelf', name: '蛮横撞击', desc: '挥斧砸地，对周围敌人造成伤害并减速。', cooldown: 10, mana: 0, damage: 260, damageGrowth: 65, ratio: 0.8, type: 'physical', radius: 2.6, slow: 0.4, slowT: 1.5, color: '#ffe36b', sfx: 'groundSlam' }),
      S({ kind: 'healBurst', name: '赤血狂暴', desc: '燃烧斗志，立即恢复大量生命并获得护盾（血量越低恢复越多）。', cooldown: 40, mana: 0, heal: 700, healRatio: 0, radius: 0.1, shield: 300, color: '#ff4e2a', sfx: 'adrenaline' }),
    ],
    skillOrder: ORDER_1,
    build: ['yingren_zhizu', 'honglian_doupeng', 'fanshang_cijia', 'buxiang_zhengzhao', 'bazhe_zhongzhuang', 'businiao_zhiyan'],
  },
  {
    id: 'zhangfei', name: '张飞', title: '禁血狂兽', role: 'tank', ...base('tank'),
    look: look('#2b2b36', '#c0392b', 'hammer', 0.52, { gear: 'bandana', armor: 'plate', cape: true, beard: true, hair: { color: '#1b1b24', style: 'short' } }),
    hp: 3900, damage: 172, power: 0, armor: 102, resist: 60, hitSpeed: 1.05, range: 1.5, speed: 3.9, radius: 0.52, mana: 0, attackType: 'physical',
    lore: '燕人张翼德在此！',
    tips: '画地为牢给队友护盾，狂兽血性推开敌人，叠满狂意后变身大闹一场。',
    passive: { name: '狂意', desc: '每次普攻积累狂意，8 层后 6 秒内可以释放狂意变身。', kind: 'ultGate', n: 8, value: 6 },
    skills: [
      S({ kind: 'healBurst', name: '画地为牢', desc: '为周围的队友和自己套上护盾。', cooldown: 10, mana: 0, heal: 0, radius: 4, shield: 320, allyShield: 320, color: '#ffd166', sfx: 'sanctuary' }),
      S({ kind: 'aoeSelf', name: '狂兽血性', desc: '向周围怒吼，对敌人造成伤害并击退。', cooldown: 10, mana: 0, damage: 240, damageGrowth: 60, ratio: 0.7, type: 'physical', radius: 2.6, knockback: 1.6, stun: 0.3, color: '#ff6b6b', sfx: 'groundSlam' }),
      S({ kind: 'aoeSelf', name: '狂意', desc: '变身狂兽，对周围敌人造成伤害并击飞，随后获得巨额护盾。', cooldown: 30, mana: 0, damage: 420, damageGrowth: 140, ratio: 1.0, type: 'physical', radius: 3.2, stun: 1.0, knockback: 1.0, shield: 600, color: '#c0392b', sfx: 'stampede' }),
    ],
    skillOrder: ORDER_1,
    build: ['yingren_zhizu', 'jiushu_zhiyi', 'honglian_doupeng', 'fanshang_cijia', 'bazhe_zhongzhuang', 'businiao_zhiyan'],
  },
  // ------------------------------------------------------------------ 辅助
  {
    id: 'caiwenji', name: '蔡文姬', title: '天籁弦音', role: 'support', ...base('support'),
    look: look('#4ec1b5', '#fff6d0', 'book', 0.36, { gear: 'cap', armor: 'robe', hair: { color: '#a8e6dc', style: 'twin' }, skirt: true }),
    hp: 3200, damage: 145, power: 0, armor: 84, resist: 58, hitSpeed: 1.0, range: 5.5, speed: 3.9, radius: 0.38, mana: 520, attackType: 'magic', projectile: 'holy', projectileSpeed: 11,
    lore: '胡笳十八拍，一曲安魂。',
    tips: '跟紧射手，胡笳乐减速敌人，悲歌打断突进，绝唱在团战中持续回血。',
    passive: { name: '回春', desc: '每 6 秒治疗附近血量最低的队友。', kind: 'periodicHeal', n: 6, value: 180 },
    skills: [
      S({ kind: 'chain', name: '胡笳乐', desc: '弹出音符，在敌人之间弹跳 3 次，造成伤害并减速。', cooldown: 7, mana: 55, damage: 200, damageGrowth: 50, ratio: 0.5, type: 'magic', range: 5, count: 3, slow: 0.4, slowT: 1.2, color: '#9fe3ff', sfx: 'holy' }),
      S({ kind: 'aoeAim', name: '悲歌', desc: '掷出琴音，对指定位置的敌人造成伤害并眩晕 1 秒。', cooldown: 11, mana: 65, damage: 240, damageGrowth: 60, ratio: 0.5, type: 'magic', range: 6, radius: 1.5, stun: 1.0, color: '#fff6d0', sfx: 'shock' }),
      S({ kind: 'aoeSelf', name: '绝唱', desc: '奏响绝唱 5 秒，持续治疗周围队友并减速靠近的敌人。', cooldown: 45, mana: 130, heal: 110, healRatio: 0.3, radius: 4.2, duration: 5, tick: 0.5, slow: 0.2, slowT: 0.6, color: '#bff5ea', sfx: 'sanctuary' }),
    ],
    skillOrder: ORDER_1,
    build: ['lengjing_zhixue', 'jiushu_zhiyi', 'jinwei_rongyao', 'shizhi_yuyan', 'businiao_zhiyan', 'xianzhe_bihu'],
  },
  {
    id: 'zhuangzhou', name: '庄周', title: '逍遥幻梦', role: 'support', ...base('support'),
    look: look('#3b9c6d', '#bfe8ff', 'staff', 0.44, { gear: 'hat', armor: 'robe', hair: { color: '#2d6b5a', style: 'short' } }),
    hp: 3500, damage: 150, power: 0, armor: 92, resist: 62, hitSpeed: 1.0, range: 1.6, speed: 3.95, radius: 0.46, mana: 480, attackType: 'magic',
    lore: '不知周之梦为蝴蝶与，蝴蝶之梦为周与？',
    tips: '化蝶减速，梦生给队友加速，逍遥游解除全队控制——团战的保险。',
    passive: { name: '蝴蝶梦', desc: '每 12 秒进入 2 秒梦境，期间受到的伤害降低 40%。', kind: 'dreamShield', n: 12, value: 0.4 },
    skills: [
      S({ kind: 'aoeAim', name: '化蝶', desc: '召唤蝴蝶群，对指定区域的敌人造成伤害并减速。', cooldown: 7, mana: 55, damage: 220, damageGrowth: 55, ratio: 0.5, type: 'magic', range: 6, radius: 2.2, slow: 0.5, slowT: 2, color: '#9be3c8', sfx: 'holy' }),
      S({ kind: 'healBurst', name: '梦生', desc: '治疗周围队友并提升他们的移速。', cooldown: 10, mana: 60, heal: 240, healRatio: 0.5, radius: 4.5, shield: 120, color: '#dff3ff', sfx: 'sanctuary' }),
      S({ kind: 'healBurst', name: '逍遥游', desc: '解除周围队友的控制效果，并使他们短时间免疫控制。', cooldown: 40, mana: 110, heal: 150, healRatio: 0.3, radius: 5, cleanse: true, color: '#bfe8ff', sfx: 'release' }),
    ],
    skillOrder: ORDER_2,
    build: ['yingren_zhizu', 'jiushu_zhiyi', 'jinwei_rongyao', 'honglian_doupeng', 'businiao_zhiyan', 'bazhe_zhongzhuang'],
  },
  {
    id: 'niumo', name: '牛魔', title: '蛮荒之力', role: 'support', ...base('support'),
    look: look('#6b3a1e', '#c0392b', 'hammer', 0.5, { gear: 'cap', armor: 'plate', horns: true, beard: true, hair: { color: '#3a2a1a', style: 'short' } }),
    hp: 3700, damage: 165, power: 0, armor: 98, resist: 60, hitSpeed: 1.0, range: 1.5, speed: 3.9, radius: 0.5, mana: 0, attackType: 'physical',
    lore: '牛魔王的愤怒，连地面都要裂开。',
    tips: '碎裂之盾冲锋眩晕，暴烈冲撞撞开人群，蛮力冲撞的大招击飞整队敌人。',
    passive: { name: '牛魔之心', desc: '生命值低于 30% 时获得一层大护盾，每 40 秒触发一次。', kind: 'lowHpShield', n: 40, value: 600 },
    skills: [
      S({ kind: 'dashStrike', name: '碎裂之盾', desc: '向指定方向冲锋，对路径上的敌人造成伤害并眩晕。', cooldown: 10, mana: 0, damage: 230, damageGrowth: 55, ratio: 0.7, type: 'physical', range: 4.5, radius: 1.0, stun: 1.0, color: '#ffb347', sfx: 'shieldBash' }),
      S({ kind: 'aoeSelf', name: '暴烈冲撞', desc: '猛砸地面，对周围敌人造成伤害并击退。', cooldown: 10, mana: 0, damage: 250, damageGrowth: 60, ratio: 0.7, type: 'physical', radius: 2.6, knockback: 1.4, stun: 0.3, color: '#ff8a3c', sfx: 'groundSlam' }),
      S({ kind: 'aoeSelf', name: '蛮力冲撞', desc: '蛮力一击，对周围敌人造成高额伤害并击飞 1.5 秒。', cooldown: 36, mana: 0, damage: 440, damageGrowth: 140, ratio: 1.0, type: 'physical', radius: 3.4, stun: 1.5, knockback: 0.8, color: '#c0392b', sfx: 'stampede' }),
    ],
    skillOrder: ORDER_1,
    build: ['yingren_zhizu', 'jiushu_zhiyi', 'honglian_doupeng', 'fanshang_cijia', 'buxiang_zhengzhao', 'bazhe_zhongzhuang'],
  },
];

export const HEROES: UnitDef[] = HERO_SPECS.map((h) => ({
  ...h, kind: 'hero', desc: h.desc ?? h.lore ?? '', splash: h.splash ?? 0, flying: false, targets: 'both', sight: h.sight ?? 9, ability: h.skills[0],
} as UnitDef));

export const HERO_BY_ID: Record<string, UnitDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));
export const heroDef = (id: string): UnitDef => { const d = HERO_BY_ID[id]; if (!d) throw new Error(`unknown hero ${id}`); return d; };

/** Lane assignment per role for a team of bots: 对抗路 (0) / 中路 (1) / 发育路 (2) / 打野 (3). */
export const ROLE_LANE: Record<Role, 0 | 1 | 2 | 3> = { tank: 0, warrior: 0, assassin: 3, mage: 1, marksman: 2, support: 2 };

/** A reasonable five-hero team around (or without) the chosen hero. */
export function pickTeam(include: string | null, rng: { next(): number }, taken: ReadonlySet<string> = new Set()): string[] {
  const roles: Role[] = ['warrior', 'mage', 'marksman', 'support', 'assassin'];
  const out: string[] = [];
  if (include) {
    out.push(include);
    const r = heroDef(include).role;
    const i = roles.indexOf(r === 'tank' ? 'warrior' : r);
    if (i >= 0) roles.splice(i, 1); else roles.pop();
  }
  for (const role of roles) {
    const pool = HEROES.filter((h) => (h.role === role || (role === 'warrior' && h.role === 'tank')) && !out.includes(h.id) && !taken.has(h.id));
    if (pool.length) out.push(pool[Math.floor(rng.next() * pool.length)].id);
  }
  while (out.length < 5) { const h = HEROES[Math.floor(rng.next() * HEROES.length)]; if (!out.includes(h.id) && !taken.has(h.id)) out.push(h.id); }
  return out;
}
