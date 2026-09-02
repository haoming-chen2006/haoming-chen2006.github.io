local extension = Package:new("sp_star")
extension.extensionName = "sp"

extension:loadSkillSkelsByPath("./packages/sp/pkg/sp_star/skills")

Fk:loadTranslationTable{
  ["sp_star"] = "☆SP",
  ["starsp"] = "☆SP",
}

General:new(extension, "starsp__zhaoyun", "qun", 3):addSkills { "longdan", "chongzhen" }
Fk:loadTranslationTable{
  ["starsp__zhaoyun"] = "赵云",
  ["#starsp__zhaoyun"] = "白马先锋",
  ["cv:starsp__zhaoyun"] = "彭尧",
  ["designer:starsp__zhaoyun"] = "danny",
  ["illustrator:starsp__zhaoyun"] = "Vincent",

  ["~starsp__zhaoyun"] = "这……就是失败的滋味吗……",
}

General:new(extension, "starsp__diaochan", "qun", 3, 3, General.Female):addSkills { "lihun", "biyue" }
Fk:loadTranslationTable{
  ["starsp__diaochan"] = "貂蝉",
  ["#starsp__diaochan"] = "暗黑的傀儡师",
  ["cv:starsp__diaochan"] = "林簌",
  ["designer:starsp__diaochan"] = "danny",
  ["illustrator:starsp__diaochan"] = "木美人",

  ["~starsp__diaochan"] = "义父，来世再做您的好女儿……",
}

General:new(extension, "starsp__caoren", "wei", 4):addSkills { "kuiwei", "yanzheng" }
Fk:loadTranslationTable{
  ["starsp__caoren"] = "曹仁",
  ["#starsp__caoren"] = "险不辞难",
  ["designer:starsp__caoren"] = "danny",
  ["illustrator:starsp__caoren"] = "张帅",

  ["~starsp__caoren"] = "城在人在，城破人亡……",
}

General:new(extension, "starsp__pangtong", "qun", 3):addSkills { "manjuan", "zuixiang" }
Fk:loadTranslationTable{
  ["starsp__pangtong"] = "庞统",
  ["#starsp__pangtong"] = "荆楚之高俊",
  ["designer:starsp__pangtong"] = "danny",
  ["illustrator:starsp__pangtong"] = "LiuHeng",
  ["cv:starsp__pangtong"] = "樰默",

  ["~starsp__pangtong"] = "纵有治世才，难遇治世主。",
}

General:new(extension, "starsp__zhangfei", "shu", 4):addSkills { "jyie", "dahe" }
Fk:loadTranslationTable{
  ["starsp__zhangfei"] = "张飞",
  ["#starsp__zhangfei"] = "横矛立马",
  ["designer:starsp__zhangfei"] = "serenddlplly",
  ["illustrator:starsp__zhangfei"] = "绿豆粥",
}

local lvmeng = General:new(extension, "starsp__lvmeng", "wu", 3)
lvmeng:addSkills { "tanhu", "mouduan" }
lvmeng:addRelatedSkills { "jiang", "qianxun", "yingzi", "keji" }
Fk:loadTranslationTable{
  ["starsp__lvmeng"] = "吕蒙",
  ["#starsp__lvmeng"] = "国士之风",
  ["designer:starsp__lvmeng"] = "老萌",
  ["illustrator:starsp__lvmeng"] = "YellowKiss",
}

General:new(extension, "starsp__liubei", "shu", 4):addSkills { "zhaolie", "shichoul" }
Fk:loadTranslationTable{
  ["starsp__liubei"] = "刘备",
  ["#starsp__liubei"] = "汉昭烈帝",
  ["designer:starsp__liubei"] = "妄想线条",
  ["illustrator:starsp__liubei"] = "Fool头",
}

General:new(extension, "starsp__daqiao", "wu", 3, 3, General.Female):addSkills { "yanxiao", "anxian" }
Fk:loadTranslationTable{
  ["starsp__daqiao"] = "大乔",
  ["#starsp__daqiao"] = "韶光易逝",
  ["designer:starsp__daqiao"] = "Ecauchy",
  ["illustrator:starsp__daqiao"] = "木美人",
}
local yanxiao = fk.CreateCard{
  name = "&yanxiao_trick",
  type = Card.TypeTrick,
  sub_type = Card.SubtypeDelayedTrick,
  skill = "yanxiao_trick_skill",
}
extension:loadCardSkels{yanxiao}
extension:addCardSpec("yanxiao_trick")

General:new(extension, "starsp__ganning", "qun", 4):addSkills { "yinling", "junwei" }
Fk:loadTranslationTable{
  ["starsp__ganning"] = "甘宁",
  ["#starsp__ganning"] = "怀铃的乌羽",
  ["designer:starsp__ganning"] = "飞雪",
  ["illustrator:starsp__ganning"] = "张帅",
}

General:new(extension, "starsp__xiahoudun", "wei", 4):addSkills { "fenyong", "xuehen" }
Fk:loadTranslationTable{
  ["starsp__xiahoudun"] = "夏侯惇",
  ["#starsp__xiahoudun"] = "啖睛的苍狼",
  ["designer:starsp__xiahoudun"] = "舟亢",
  ["illustrator:starsp__xiahoudun"] = "XXX",
}

return extension
