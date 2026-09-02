local extension = Package:new("forest")
extension.extensionName = "shzl"

extension:loadSkillSkelsByPath("./packages/shzl/pkg/forest/skills")

Fk:loadTranslationTable{
  ["forest"] = "神话再临·林",
}

General:new(extension, "xuhuang", "wei", 4):addSkills { "duanliang" }
Fk:loadTranslationTable{
  ["xuhuang"] = "徐晃",
  ["#xuhuang"] = "周亚夫之风",
  ["illustrator:xuhuang"] = "Tuu.",

  ["~xuhuang"] = "一顿不吃饿得慌。",
}

General:new(extension, "caopi", "wei", 3):addSkills { "xingshang", "fangzhu", "songwei" }
Fk:loadTranslationTable{
  ["caopi"] = "曹丕",
  ["#caopi"] = "霸业的继承者",
  ["cv:caopi"] = "曹真",
  ["illustrator:caopi"] = "SoniaTang",

  ["~caopi"] = "子建，子建……",
}

General:new(extension, "menghuo", "shu", 4):addSkills { "huoshou", "zaiqi" }
Fk:loadTranslationTable{
  ["menghuo"] = "孟获",
  ["#menghuo"] = "南蛮王",
  ["illustrator:menghuo"] = "废柴男",

  ["~menghuo"] = "七纵之恩……来世……再报了……",
}

General:new(extension, "zhurong", "shu", 4, 4, General.Female):addSkills { "juxiang", "lieren" }
Fk:loadTranslationTable{
  ["zhurong"] = "祝融",
  ["#zhurong"] = "野性的女王",
  ["cv:zhurong"] = "水原",
  ["illustrator:zhurong"] = "废柴男",

  ["~zhurong"] = "大王，我……先走一步了……",
}

General:new(extension, "sunjian", "wu", 4):addSkills { "yinghun" }
Fk:loadTranslationTable{
  ["sunjian"] = "孙坚",
  ["#sunjian"] = "武烈帝",
  ["illustrator:sunjian"] = "LiuHeng",

  ["~sunjian"] = "有埋伏，啊……",
}

General:new(extension, "lusu", "wu", 3):addSkills { "haoshi", "dimeng" }
Fk:loadTranslationTable{
  ["lusu"] = "鲁肃",
  ["#lusu"] = "独断的外交家",
  ["illustrator:lusu"] = "LiuHeng",

  ["~lusu"] = "此联盟已破，吴蜀休矣……",
}

General:new(extension, "dongzhuo", "qun", 8):addSkills { "jiuchi", "roulin", "benghuai", "baonue" }
Fk:loadTranslationTable{
  ["dongzhuo"] = "董卓",
  ["#dongzhuo"] = "魔王",
  ["illustrator:dongzhuo"] = "小冷",
  ["cv:dongzhuo"] = "九命黑猫",

  ["~dongzhuo"] = "汉室衰弱，非我一人之罪。",
}

General:new(extension, "jiaxu", "qun", 3):addSkills { "wansha", "luanwu", "weimu" }
Fk:loadTranslationTable{
  ["jiaxu"] = "贾诩",
  ["#jiaxu"] = "冷酷的毒士",
  ["illustrator:jiaxu"] = "KayaK",
  ["designer:jiaxu"] = "KayaK",

  ["~jiaxu"] = "我的时辰……也到了……",
}

return extension
