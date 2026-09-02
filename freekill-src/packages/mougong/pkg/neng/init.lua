local extension = Package:new("mou_neng")
extension.extensionName = "mougong"

extension:loadSkillSkelsByPath("./packages/mougong/pkg/neng/skills")

Fk:loadTranslationTable{
  ["mou_neng"] = "谋攻篇-能包",
}

General:new(extension, "mou__sunshangxiang", "shu", 4, 4, General.Female):addSkills {
  "mou__jieyin",
  "mou__liangzhu",
  "mou__xiaoji",
}
Fk:loadTranslationTable{
  ["mou__sunshangxiang"] = "谋孙尚香",
  ["#mou__sunshangxiang"] = "骄豪明俏",
  ["illustrator:mou__sunshangxiang"] = "暗金",

  ["~mou__sunshangxiang"] = "此去一别，竟无再见之日……",
}

General:new(extension, "mou__yuanshao", "qun", 4):addSkills { "mou__luanji", "mou__xueyi" }
Fk:loadTranslationTable{
  ["mou__yuanshao"] = "谋袁绍",
  ["#mou__yuanshao"] = "高贵的名门",
  ["illustrator:mou__yuanshao"] = "铁杵",

  ["~mou__yuanshao"] = "我不可能输给曹阿瞒，不可能！",
}

local mouHuaxiong = General:new(extension, "mou__huaxiong", "qun", 3, 4)
mouHuaxiong.shield = 1
mouHuaxiong:addSkills { "mou__yaowu", "mou__yangwei" }
Fk:loadTranslationTable{
  ["mou__huaxiong"] = "谋华雄",
  ["#mou__huaxiong"] = "跋扈雄狮",
  ["illustrator:mou__huaxiong"] = "三道纹",

  ["~mou__huaxiong"] = "小小马弓手，竟然……啊……",
}

General:new(extension, "mou__menghuo", "shu", 4):addSkills { "mou__huoshou", "mou__zaiqi" }
Fk:loadTranslationTable{
  ["mou__menghuo"] = "谋孟获",
  ["#mou__menghuo"] = "南蛮王",
  ["illustrator:mou__menghuo"] = "刘小狼Syaoran",

  ["~mou__menghuo"] = "吾等谨遵丞相教诲，永不复叛……",
}

local mouJiangwei = General:new(extension, "mou__jiangwei", "shu", 4)
mouJiangwei.shield = 1
mouJiangwei:addSkills { "mou__tiaoxin", "mou__zhiji" }
Fk:loadTranslationTable{
  ["mou__jiangwei"] = "谋姜维",
  ["#mou__jiangwei"] = "见危授命",
  ["cv:mou__jiangwei"] = "杨超然",
  ["illustrator:mou__jiangwei"] = "君桓文化",

  ["~mou__jiangwei"] = "市井鱼龙易一统，护国麒麟难擎天……",
}

General:new(extension, "mou__guanyu", "shu", 4):addSkills { "mou__wusheng", "mou__yijue" }
Fk:loadTranslationTable{
  ["mou__guanyu"] = "谋关羽",
  ["#mou__guanyu"] = "关圣帝君",
  ["illustrator:mou__guanyu"] = "错落宇宙",

  ["~mou__guanyu"] = "大哥，翼德，来生再于桃园，论豪情壮志……",
}

General:new(extension, "mou__gaoshun", "qun", 4):addSkills { "mou__xianzhen", "mou__jinjiu" }
Fk:loadTranslationTable{
  ["mou__gaoshun"] = "谋高顺",
  ["#mou__gaoshun"] = "攻无不克",
  ["illustrator:mou__gaoshun"] = "铁杵",

  ["~mou__gaoshun"] = "宁为断头鬼，不当受降虏……",
}

General:new(extension, "mou__gongsunzan", "qun", 4):addSkills { "mou__yicong", "mou__qiaomeng" }
Fk:loadTranslationTable{
  ["mou__gongsunzan"] = "谋公孙瓒",
  ["#mou__gongsunzan"] = "劲震幽土",
  ["illustrator:mou__gongsunzan"] = "铁杵",

  ["~mou__gongsunzan"] = "称雄半生，岂可为他人俘虏，啊啊啊……",
}

General:new(extension, "mou__zhugejin", "wu", 3):addSkills { "mou__huanshi", "mou__hongyuan", "mou__mingzhe" }
Fk:loadTranslationTable{
  ["mou__zhugejin"] = "谋诸葛瑾",
  ["#mou__zhugejin"] = "才猷蕴借",
  ["illustrator:mou__zhugejin"] = "铁杵",

  ["~mou__zhugejin"] = "君臣相托，生死不渝……",
}

General:new(extension, "mou__zhangliao", "wei", 4):addSkills { "mou__tuxi", "mou__dengfeng" }
Fk:loadTranslationTable{
  ["mou__zhangliao"] = "谋张辽",
  ["#mou__zhangliao"] = "古之召虎",
  ["illustrator:mou__zhangliao"] = "MUMU",

  ["~mou__zhangliao"] = "陛下亲临问疾，臣诚惶诚恐……",
}

General:new(extension, "mou__lvbu", "qun", 5):addSkills { "mou__wushuang", "mou__liyu" }
Fk:loadTranslationTable{
  ["mou__lvbu"] = "谋吕布",
  ["#mou__lvbu"] = "宇内无双",
  ["illustrator:mou__lvbu"] = "凝聚永恒",

  ["~mou__lvbu"] = "布为阶下囚，兄为殿上客，何不一言相救？",
  ["!mou__lvbu"] = "哈哈哈哈，貂蝉、天下皆我所有。",
}

return extension
