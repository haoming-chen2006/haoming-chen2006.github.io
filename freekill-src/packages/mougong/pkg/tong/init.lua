local extension = Package:new("mou_tong")
extension.extensionName = "mougong"

extension:loadSkillSkelsByPath("./packages/mougong/pkg/tong/skills")

Fk:loadTranslationTable{
  ["mou_tong"] = "谋攻篇-同包",
}

General:new(extension, "mou__sunce", "wu", 4):addSkills { "mou__jiang", "mou__hunzi", "mou__zhiba" }
Fk:loadTranslationTable{
  ["mou__sunce"] = "谋孙策",
  ["#mou__sunce"] = "江东的小霸王",
  ["illustrator:mou__sunce"] = "黯荧岛",

  ["$mou__yingzi_mou__sunce1"] = "今与公瑾相约，共图天下霸业！",
  ["$mou__yingzi_mou__sunce2"] = "空言岂尽意，跨马战沙场！",
  ["$yinghun_mou__sunce1"] = "父亲英魂犹在，助我定乱平贼！",
  ["$yinghun_mou__sunce2"] = "扫尽门庭之寇，贼自畏我之威！",
  ["~mou__sunce"] = "大志未展，权弟当继……",
}

General:new(extension, "mou__xiaoqiao", "wu", 3, 3, General.Female):addSkills { "mou__tianxiang", "mou__hongyan" }
Fk:loadTranslationTable{
  ["mou__xiaoqiao"] = "谋小乔",
  ["#mou__xiaoqiao"] = "矫情之花",
  ["illustrator:mou__xiaoqiao"] = "君桓文化",

  ["~mou__xiaoqiao"] = "朱颜易改，初心永在……",
}

General:new(extension, "mou__liucheng", "qun", 3, 3, General.Female):addSkills { "lueying", "yingwu" }
Fk:loadTranslationTable{
  ["mou__liucheng"] = "谋刘赪",
  ["#mou__liucheng"] = "泣梧的湘女",
  ["illustrator:mou__liucheng"] = "匠人绘",

  ["~mou__liucheng"] = "此番寻药未果，怎医叙儿之疾……",
}

General:new(extension, "mou__yangwan", "qun", 3, 3, General.Female):addSkills { "mingxuan", "xianchou" }
Fk:loadTranslationTable{
  ["mou__yangwan"] = "谋杨婉",
  ["#mou__yangwan"] = "迷计惑心",
  ["illustrator:mou__yangwan"] = "alien",

  ["~mou__yangwan"] = "引狗入寨，悔恨交加……",
}

General:new(extension, "mou__xiahoushi", "shu", 3, 3, General.Female):addSkills { "mou__qiaoshi", "mou__yanyu" }
Fk:loadTranslationTable{
  ["mou__xiahoushi"] = "谋夏侯氏",
  ["#mou__xiahoushi"] = "燕语呢喃",
  ["cv:mou__xiahoushi"] = "水原",
  ["illustrator:mou__xiahoushi"] = "凡果",

  ["~mou__xiahoushi"] = "玄鸟不曾归，君亦不再来……",
}

General:new(extension, "mou__zhurong", "shu", 4, 4, General.Female):addSkills { "mou__juxiang", "mou__lieren" }
Fk:loadTranslationTable{
  ["mou__zhurong"] = "谋祝融",
  ["#mou__zhurong"] = "野性的女王",
  ["illustrator:mou__zhurong"] = "刘小狼Syaoran",

  ["~mou__zhurong"] = "大王……这诸葛亮果然厉害……",
}

General:new(extension, "mou__zhangfei", "shu", 4):addSkills { "mou__paoxiao", "mou__xieji" }
Fk:loadTranslationTable{
  ["mou__zhangfei"] = "谋张飞",
  ["#mou__zhangfei"] = "义付桃园",
  ["illustrator:mou__zhangfei"] = "凡果",

  ["~mou__zhangfei"] = "不恤士卒，终为小人所害！",
}

General:new(extension, "mou__zhaoyun", "shu", 4):addSkills { "mou__longdan", "mou__jizhu" }
Fk:loadTranslationTable{
  ["mou__zhaoyun"] = "谋赵云",
  ["#mou__zhaoyun"] = "七进七出",
  ["illustrator:mou__zhaoyun"] = "匠人绘",

  ["~mou__zhaoyun"] = "汉室未兴，功业未成……",
}

General:new(extension, "mou__xiahoudun", "wei", 4):addSkills { "mou__ganglie", "mou__qingjian" }
Fk:loadTranslationTable{
  ["mou__xiahoudun"] = "谋夏侯惇",
  ["#mou__xiahoudun"] = "独眼的罗刹",
  ["illustrator:mou__xiahoudun"] = "游卡",

  ["~mou__xiahoudun"] = "急功盲进，实是有愧丞相……",
}

General:new(extension, "mou__xiahouyuan", "wei", 4):addSkills { "mou__shensu", "zhengzi" }
Fk:loadTranslationTable{
  ["mou__xiahouyuan"] = "谋夏侯渊",
  ["#mou__xiahouyuan"] = "虎步关右",
  ["illustrator:mou__xiahouyuan"] = "铁杵",

  ["~mou__xiahouyuan"] = "若非中其奸计，吾岂会命丧贼手……",
}

General:new(extension, "mou__zhuran", "wu", 4):addSkills { "zhenweiz", "heyuan" }
Fk:loadTranslationTable{
  ["mou__zhuran"] = "谋朱然",
  ["#mou__zhuran"] = "不动之督",
  ["illustrator:mou__zhuran"] = "zoo",

  ["!mou__zhuran"] = "挫敌卫疆半载，吴名威震敌国！",
  ["~mou__zhuran"] = "粮尽杀马，马尽食革，但有死无降耳。",
}

return extension
