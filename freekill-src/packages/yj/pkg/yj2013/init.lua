local extension = Package:new("yj2013")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/yj2013/skills")

Fk:loadTranslationTable{
  ["yj2013"] = "一将成名2013",
}

General:new(extension, "caochong", "wei", 3):addSkills { "chengxiang", "renxin" }
Fk:loadTranslationTable{
  ["caochong"] = "曹冲",
  ["#caochong"] = "仁爱的神童",
  ["cv:caochong"] = "水原",
  ["illustrator:caochong"] = "amo",

  ["~caochong"] = "子桓哥哥……",
}

General:new(extension, "nos__caochong", "wei", 3):addSkills { "nos__chengxiang", "nos__renxin" }
Fk:loadTranslationTable{
  ["nos__caochong"] = "曹冲",
  ["#nos__caochong"] = "仁爱的神童",
  ["illustrator:nos__caochong"] = "alien",

  ["~nos__caochong"] = "父亲，冲儿……再不能承欢膝下了。",
}

General:new(extension, "guohuai", "wei", 4):addSkills { "jingce" }
Fk:loadTranslationTable{
  ["guohuai"] = "郭淮",
  ["#guohuai"] = "垂问秦雍",
  ["designer:guohuai"] = "五月fy",
  ["illustrator:guohuai"] = "DH",

  ["~guohuai"] = "姜维小儿，竟然……",
}

General:new(extension, "manchong", "wei", 3):addSkills { "junxing", "yuce" }
Fk:loadTranslationTable{
  ["manchong"] = "满宠",
  ["#manchong"] = "政法兵谋",
  ["designer:manchong"] = "VirgoPaladin",
  ["illustrator:manchong"] = "Aimer彩三",

  ["~manchong"] = "援军为何迟迟未到……",
}

General:new(extension, "guanping", "shu", 4):addSkills { "longyin" }
Fk:loadTranslationTable{
  ["guanping"] = "关平",
  ["#guanping"] = "忠臣孝子",
  ["designer:guanping"] = "昂翼天使",
  ["illustrator:guanping"] = "樱花闪乱",

  ["~guanping"] = "父亲快走，孩儿断后……",
}

General:new(extension, "jianyong", "shu", 3):addSkills { "qiaoshui", "zongshij" }
Fk:loadTranslationTable{
  ["jianyong"] = "简雍",
  ["#jianyong"] = "悠游风议",
  ["designer:jianyong"] = "Nocihoo",
  ["illustrator:jianyong"] = "Thinking",

  ["~jianyong"] = "两国交战……不斩……",
}

General:new(extension, "liufeng", "shu", 4):addSkills { "xiansi" }
Fk:loadTranslationTable{
  ["liufeng"] = "刘封",
  ["#liufeng"] = "骑虎之殇",
  ["designer:liufeng"] = "香蒲神殇",
  ["illustrator:liufeng"] = "Thinking",

  ["~liufeng"] = "父亲，为什么……",
}

General:new(extension, "panzhangmazhong", "wu", 4):addSkills { "duodao", "anjian" }
Fk:loadTranslationTable{
  ["panzhangmazhong"] = "潘璋马忠",
  ["#panzhangmazhong"] = "擒龙伏虎",
  ["designer:panzhangmazhong"] = "Michael_Lee",
  ["illustrator:panzhangmazhong"] = "zzyzzyy",

  ["~panzhangmazhong"] = "怎么可能，我明明亲手将你……",
}

General:new(extension, "yufan", "wu", 3):addSkills { "zongxuan", "zhiyan" }
Fk:loadTranslationTable{
  ["yufan"] = "虞翻",
  ["#yufan"] = "狂直之士",
  ["designer:yufan"] = "幻岛",
  ["illustrator:yufan"] = "L",

  ["~yufan"] = "我枉称东方朔再世……",
}

General:new(extension, "nos__zhuran", "wu", 4):addSkills { "nos__danshou" }
Fk:loadTranslationTable{
  ["nos__zhuran"] = "朱然",
  ["#nos__zhuran"] = "不动之督",
  ["designer:nos__zhuran"] = "迁迁婷婷",
  ["illustrator:nos__zhuran"] = "Ccat",

  ["~nos__zhuran"] = "何人竟有如此之胆！？",
}

General:new(extension, "zhuran", "wu", 4):addSkills { "danshou" }
Fk:loadTranslationTable{
  ["zhuran"] = "朱然",
  ["#zhuran"] = "不动之督",
  ["designer:zhuran"] = "Loun老萌",
  ["illustrator:zhuran"] = "NOVART",

  ["~zhuran"] = "何人竟有如此之胆！？",
}

General:new(extension, "fuhuanghou", "qun", 3, 3, General.Female):addSkills { "zhuikong", "qiuyuan" }
Fk:loadTranslationTable{
  ["fuhuanghou"] = "伏皇后",
  ["#fuhuanghou"] = "孤注一掷",
  ["designer:fuhuanghou"] = "萌D",
  ["illustrator:fuhuanghou"] = "小莘",

  ["~fuhuanghou"] = "陛下为何不救臣妾……",
}

General:new(extension, "nos__fuhuanghou", "qun", 3, 3, General.Female):addSkills { "nos__zhuikong", "nos__qiuyuan" }
Fk:loadTranslationTable{
  ["nos__fuhuanghou"] = "伏皇后",
  ["#nos__fuhuanghou"] = "孤注一掷",
  ["designer:nos__fuhuanghou"] = "萌D",
  ["illustrator:nos__fuhuanghou"] = "琛·美弟奇",

  ["~nos__fuhuanghou"] = "曹贼！汝，定不得好死！",
}

General:new(extension, "nos__liru", "qun", 3):addSkills { "nos__juece", "nos__mieji", "nos__fencheng" }
Fk:loadTranslationTable{
  ["nos__liru"] = "李儒",
  ["#nos__liru"] = "魔仕",
  ["designer:nos__liru"] = "淬毒",
  ["illustrator:nos__liru"] = "zoo",

  ["~nos__liru"] = "乱世的好戏才刚刚开始……",
}

General:new(extension, "liru", "qun", 3):addSkills { "juece", "mieji", "fencheng" }
Fk:loadTranslationTable{
  ["liru"] = "李儒",
  ["#liru"] = "魔仕",
  ["designer:liru"] = "淬毒",
  ["illustrator:liru"] = "MSNZero",

  ["~liru"] = "如遇明主，大业必成……",
}

return extension
