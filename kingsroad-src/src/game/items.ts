/** 王者荣耀 装备. Six slots, one pair of 鞋; stats on this engine's scale (HoK numbers ÷ ~1 for attack/power, HP as-is). */
export type ItemCategory = 'attack' | 'magic' | 'defense' | 'boots' | 'support';
export type ItemPassive =
  | 'wujin' // 无尽战刃: crits deal more
  | 'pojun' // 破军: bonus damage to targets under 50%
  | 'yingren' // 影刃: attacks ramp attack speed
  | 'zongshi' // 宗师之力: after a skill, the next attack deals bonus physical damage
  | 'anying' // 暗影战斧: physical penetration (bonus vs armour)
  | 'shandian' // 闪电匕首: attacks arc lightning to nearby enemies
  | 'suixing' // 碎星锤: heavy penetration
  | 'mingdao' // 名刀·司命: death immunity, once per 90 s
  | 'moshi' // 末世: attacks deal % of target's current health
  | 'binghen' // 冰痕之握: after a skill, the next attack slows
  | 'huixiang' // 回响之杖: skill hits burst for bonus magic damage
  | 'tongku' // 痛苦面具: skills deal % of target's current health
  | 'boxuezhe' // 博学者之怒: +35% power
  | 'xuwu' // 虚无法杖: magic penetration
  | 'huiyue' // 辉月: brief invulnerability when dropping low, once per 90 s
  | 'bingshuang' // 冰霜法杖: skills slow
  | 'shishen' // 噬神之书: spell vamp
  | 'shizhi' // 时之预言: grows health over time
  | 'shengbei' // 圣杯: mana regen, cooldown
  | 'fanshang' // 反伤刺甲: reflect damage to attackers
  | 'honglian' // 红莲斗篷: burn nearby enemies
  | 'monv' // 魔女斗篷: magic shield out of combat
  | 'businiao' // 不死鸟之眼: healing received up
  | 'bazhe' // 霸者重装: strong regen out of combat
  | 'xianzhe' // 贤者的庇护: revive once
  | 'jihan' // 极寒风暴: slows attackers' attack speed, cooldown
  | 'buxiang' // 不祥征兆: slows attackers
  | 'jinwei' // 近卫荣耀: shields nearby allies when hit
  | 'jiushu' // 救赎之翼: heals nearby allies when low
  | 'yingrenzu' // 影忍之足: reduce basic-attack damage taken
  | 'dikang' // 抵抗之靴: tenacity (shorter stuns)
  | 'mifa' // 秘法之靴: magic penetration
  | 'jisu'; // 急速战靴: attack speed

export interface ItemDef {
  id: string;
  name: string;
  cost: number;
  tier: 1 | 2 | 3;
  category: ItemCategory;
  desc: string;
  hp?: number;
  damage?: number;
  power?: number;
  armor?: number;
  resist?: number;
  attackSpeed?: number; // fraction
  speed?: number; // tiles/s
  lifesteal?: number;
  spellvamp?: number;
  cooldown?: number;
  crit?: number;
  hpRegen?: number;
  manaRegen?: number;
  passive?: ItemPassive;
  icon: string;
  color: string;
}

const I = (d: ItemDef): ItemDef => d;

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(([
  // ------------------------------------------------------------------ 鞋 (one only)
  I({ id: 'jibu_zhixue', name: '疾步之靴', cost: 710, tier: 1, category: 'boots', desc: '+0.6 移动速度，+25% 攻击速度。', speed: 0.6, attackSpeed: 0.25, icon: '👢', color: '#d9b36b' }),
  I({ id: 'yingren_zhizu', name: '影忍之足', cost: 710, tier: 1, category: 'boots', desc: '+0.6 移动速度，+110 物理防御。被动：受到的普攻伤害降低 15%。', speed: 0.6, armor: 110, passive: 'yingrenzu', icon: '🥾', color: '#8fb0d9' }),
  I({ id: 'dikang_zhixue', name: '抵抗之靴', cost: 710, tier: 1, category: 'boots', desc: '+0.6 移动速度，+110 法术防御。被动：韧性，控制时间缩短 30%。', speed: 0.6, resist: 110, passive: 'dikang', icon: '🥾', color: '#b48cff' }),
  I({ id: 'lengjing_zhixue', name: '冷静之靴', cost: 710, tier: 1, category: 'boots', desc: '+0.6 移动速度，+15% 冷却缩减。', speed: 0.6, cooldown: 0.15, icon: '🥿', color: '#9fd0ff' }),
  I({ id: 'mifa_zhixue', name: '秘法之靴', cost: 710, tier: 1, category: 'boots', desc: '+0.6 移动速度，+75 法术穿透。', speed: 0.6, power: 45, passive: 'mifa', icon: '🥿', color: '#b08cff' }),
  I({ id: 'jisu_zhanxue', name: '急速战靴', cost: 710, tier: 1, category: 'boots', desc: '+0.6 移动速度，+40% 攻击速度。', speed: 0.6, attackSpeed: 0.4, passive: 'jisu', icon: '👢', color: '#ffe36b' }),
  // ------------------------------------------------------------------ 攻击
  I({ id: 'wujin_zhanren', name: '无尽战刃', cost: 2140, tier: 3, category: 'attack', desc: '+120 物理攻击，+20% 暴击率。被动：暴击伤害提升至 220%。', damage: 120, crit: 0.2, passive: 'wujin', icon: '🗡', color: '#ff8f4a' }),
  I({ id: 'pojun', name: '破军', cost: 2950, tier: 3, category: 'attack', desc: '+180 物理攻击。被动：对生命值低于 50% 的敌人造成 30% 额外伤害。', damage: 180, passive: 'pojun', icon: '⚔', color: '#e04a4a' }),
  I({ id: 'qixue_zhiren', name: '泣血之刃', cost: 1740, tier: 2, category: 'attack', desc: '+100 物理攻击，+25% 物理吸血。', damage: 100, lifesteal: 0.25, icon: '🩸', color: '#d13c3c' }),
  I({ id: 'yingren', name: '影刃', cost: 1900, tier: 2, category: 'attack', desc: '+35% 攻击速度，+15% 暴击率，+0.2 移动速度。被动：普攻叠加攻速。', attackSpeed: 0.35, crit: 0.15, speed: 0.2, passive: 'yingren', icon: '🌀', color: '#c08bff' }),
  I({ id: 'zongshi_zhili', name: '宗师之力', cost: 2100, tier: 3, category: 'attack', desc: '+60 物理攻击，+20% 暴击率，+400 生命。被动：技能后下一次普攻造成额外伤害。', damage: 60, crit: 0.2, hp: 400, passive: 'zongshi', icon: '🔱', color: '#ffd166' }),
  I({ id: 'anying_zhanfu', name: '暗影战斧', cost: 2090, tier: 3, category: 'attack', desc: '+85 物理攻击，+500 生命，+15% 冷却缩减。被动：物理穿透。', damage: 85, hp: 500, cooldown: 0.15, passive: 'anying', icon: '🪓', color: '#9aa5b1' }),
  I({ id: 'shandian_bishou', name: '闪电匕首', cost: 1800, tier: 2, category: 'attack', desc: '+30% 攻击速度，+20% 暴击率。被动：普攻有概率释放链式闪电。', attackSpeed: 0.3, crit: 0.2, passive: 'shandian', icon: '⚡', color: '#7cf7d5' }),
  I({ id: 'suixing_chui', name: '碎星锤', cost: 2100, tier: 3, category: 'attack', desc: '+80 物理攻击，+10% 冷却缩减。被动：大幅物理穿透。', damage: 80, cooldown: 0.1, passive: 'suixing', icon: '🔨', color: '#c9c9c9' }),
  I({ id: 'mingdao_siming', name: '名刀·司命', cost: 2120, tier: 3, category: 'attack', desc: '+60 物理攻击，+10% 冷却缩减。被动：受到致命伤害时免疫伤害 1 秒（90 秒冷却）。', damage: 60, cooldown: 0.1, passive: 'mingdao', icon: '🔪', color: '#fff4c2' }),
  I({ id: 'moshi', name: '末世', cost: 2160, tier: 3, category: 'attack', desc: '+60 物理攻击，+30% 攻击速度。被动：普攻附带目标 8% 当前生命的魔法伤害。', damage: 60, attackSpeed: 0.3, passive: 'moshi', icon: '💀', color: '#ff6b6b' }),
  I({ id: 'binghen_zhiwo', name: '冰痕之握', cost: 2100, tier: 3, category: 'attack', desc: '+500 生命，+100 物理防御，+15% 冷却缩减。被动：技能后下一次普攻减速并额外伤害。', hp: 500, armor: 100, cooldown: 0.15, passive: 'binghen', icon: '❄', color: '#bfe8ff' }),
  // ------------------------------------------------------------------ 法术
  I({ id: 'huixiang_zhizhang', name: '回响之杖', cost: 2100, tier: 3, category: 'magic', desc: '+240 法术攻击，+0.3 移动速度。被动：技能命中造成额外法术伤害。', power: 240, speed: 0.3, passive: 'huixiang', icon: '🪄', color: '#b47cff' }),
  I({ id: 'tongku_mianju', name: '痛苦面具', cost: 2050, tier: 3, category: 'magic', desc: '+180 法术攻击，+1200 生命。被动：技能附带目标 8% 当前生命的法术伤害。', power: 180, hp: 1200, passive: 'tongku', icon: '🎭', color: '#c56bff' }),
  I({ id: 'boxuezhe_zhinu', name: '博学者之怒', cost: 2150, tier: 3, category: 'magic', desc: '+240 法术攻击。被动：法术攻击提升 35%。', power: 240, passive: 'boxuezhe', icon: '📘', color: '#6fb6ff' }),
  I({ id: 'xuwu_fazhang', name: '虚无法杖', cost: 2100, tier: 3, category: 'magic', desc: '+240 法术攻击，+10% 冷却缩减。被动：法术穿透。', power: 240, cooldown: 0.1, passive: 'xuwu', icon: '🔮', color: '#9d7cff' }),
  I({ id: 'huiyue', name: '辉月', cost: 2100, tier: 3, category: 'magic', desc: '+240 法术攻击，+10% 冷却缩减。被动：生命低于 25% 时免疫伤害 1.5 秒（90 秒冷却）。', power: 240, cooldown: 0.1, passive: 'huiyue', icon: '🌙', color: '#fff4c2' }),
  I({ id: 'bingshuang_fazhang', name: '冰霜法杖', cost: 1900, tier: 2, category: 'magic', desc: '+180 法术攻击，+600 生命。被动：技能命中减速 30%。', power: 180, hp: 600, passive: 'bingshuang', icon: '🧊', color: '#9fe3ff' }),
  I({ id: 'shishen_zhishu', name: '噬神之书', cost: 2100, tier: 3, category: 'magic', desc: '+200 法术攻击，+600 生命，+20% 冷却缩减，+25% 法术吸血。', power: 200, hp: 600, cooldown: 0.2, spellvamp: 0.25, passive: 'shishen', icon: '📕', color: '#ff7ab8' }),
  I({ id: 'shizhi_yuyan', name: '时之预言', cost: 2250, tier: 3, category: 'magic', desc: '+180 法术攻击，+1000 生命，+10% 冷却缩减。被动：随时间增加生命与法术攻击。', power: 180, hp: 1000, cooldown: 0.1, passive: 'shizhi', icon: '⏳', color: '#ffd166' }),
  I({ id: 'shengbei', name: '圣杯', cost: 1300, tier: 2, category: 'magic', desc: '+120 法术攻击，+10% 冷却缩减，大幅法力回复。', power: 120, cooldown: 0.1, manaRegen: 6, passive: 'shengbei', icon: '🏆', color: '#7cc8ff' }),
  // ------------------------------------------------------------------ 防御
  I({ id: 'fanshang_cijia', name: '反伤刺甲', cost: 2140, tier: 3, category: 'defense', desc: '+90 物理攻击，+240 物理防御。被动：受到普攻时反弹 25% 伤害。', damage: 90, armor: 240, passive: 'fanshang', icon: '🦔', color: '#d9b36b' }),
  I({ id: 'honglian_doupeng', name: '红莲斗篷', cost: 2080, tier: 3, category: 'defense', desc: '+240 物理防御，+1200 生命。被动：每秒灼烧周围敌人。', armor: 240, hp: 1200, passive: 'honglian', icon: '🔥', color: '#ff5a3c' }),
  I({ id: 'monv_doupeng', name: '魔女斗篷', cost: 2200, tier: 3, category: 'defense', desc: '+360 法术防御，+1000 生命。被动：脱战后获得法术护盾。', resist: 360, hp: 1000, passive: 'monv', icon: '🧥', color: '#b48cff' }),
  I({ id: 'businiao_zhiyan', name: '不死鸟之眼', cost: 2080, tier: 3, category: 'defense', desc: '+240 法术防御，+1200 生命，+100% 生命回复。被动：受到的治疗效果提升 30%。', resist: 240, hp: 1200, hpRegen: 10, passive: 'businiao', icon: '👁', color: '#ffb15e' }),
  I({ id: 'bazhe_zhongzhuang', name: '霸者重装', cost: 2050, tier: 3, category: 'defense', desc: '+2000 生命。被动：脱离战斗后每秒恢复 2.5% 最大生命。', hp: 2000, passive: 'bazhe', icon: '🛡', color: '#9ec5ff' }),
  I({ id: 'xianzhe_bihu', name: '贤者的庇护', cost: 2080, tier: 3, category: 'defense', desc: '+140 物理防御，+140 法术防御。被动：死亡后原地复活（长冷却）。', armor: 140, resist: 140, passive: 'xianzhe', icon: '✨', color: '#fff4c2' }),
  I({ id: 'jihan_fengbao', name: '极寒风暴', cost: 2110, tier: 3, category: 'defense', desc: '+200 物理防御，+20% 冷却缩减。被动：攻击你的敌人攻速降低。', armor: 200, cooldown: 0.2, passive: 'jihan', icon: '🌨', color: '#bfe8ff' }),
  I({ id: 'buxiang_zhengzhao', name: '不祥征兆', cost: 2160, tier: 3, category: 'defense', desc: '+270 物理防御，+1200 生命。被动：攻击你的敌人攻速和移速降低。', armor: 270, hp: 1200, passive: 'buxiang', icon: '☠', color: '#8fa0b3' }),
  // ------------------------------------------------------------------ 辅助
  I({ id: 'jinwei_rongyao', name: '近卫荣耀', cost: 1950, tier: 3, category: 'support', desc: '+1500 生命，+10% 冷却缩减。被动：受击时为附近队友提供护盾。', hp: 1500, cooldown: 0.1, passive: 'jinwei', icon: '🏰', color: '#ffd166' }),
  I({ id: 'jiushu_zhiyi', name: '救赎之翼', cost: 1800, tier: 2, category: 'support', desc: '+1200 生命，+10% 冷却缩减。被动：附近队友血量低时为其治疗。', hp: 1200, cooldown: 0.1, passive: 'jiushu', icon: '🕊', color: '#bff5ea' }),
] as ItemDef[]).map((d) => [d.id, d]));

export const ITEM_LIST: ItemDef[] = Object.values(ITEMS);
export const itemDef = (id: string): ItemDef => { const d = ITEMS[id]; if (!d) throw new Error(`unknown item ${id}`); return d; };
export const CATEGORY_ORDER: ItemCategory[] = ['attack', 'magic', 'defense', 'support', 'boots'];

export interface ItemTotals { hp: number; damage: number; power: number; armor: number; resist: number; attackSpeed: number; speed: number; lifesteal: number; spellvamp: number; cooldown: number; crit: number; hpRegen: number; manaRegen: number; passives: Set<string> }
export function sumItems(ids: readonly string[]): ItemTotals {
  const t: ItemTotals = { hp: 0, damage: 0, power: 0, armor: 0, resist: 0, attackSpeed: 0, speed: 0, lifesteal: 0, spellvamp: 0, cooldown: 0, crit: 0, hpRegen: 0, manaRegen: 0, passives: new Set() };
  for (const id of ids) {
    const d = ITEMS[id]; if (!d) continue;
    t.hp += d.hp ?? 0; t.damage += d.damage ?? 0; t.power += d.power ?? 0; t.armor += d.armor ?? 0; t.resist += d.resist ?? 0;
    t.attackSpeed += d.attackSpeed ?? 0; t.speed += d.speed ?? 0; t.lifesteal += d.lifesteal ?? 0; t.spellvamp += d.spellvamp ?? 0;
    t.cooldown += d.cooldown ?? 0; t.crit += d.crit ?? 0; t.hpRegen += d.hpRegen ?? 0; t.manaRegen += d.manaRegen ?? 0; if (d.passive) t.passives.add(d.passive);
  }
  if (t.passives.has('boxuezhe')) t.power *= 1.35;
  t.cooldown = Math.min(0.4, t.cooldown);
  return t;
}
export const isBoots = (id: string): boolean => ITEMS[id]?.category === 'boots';
