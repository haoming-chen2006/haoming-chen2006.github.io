local extension = Package:new("mou_yu")
extension.extensionName = "mougong"

extension:loadSkillSkelsByPath("./packages/mougong/pkg/yu/skills")

Fk:loadTranslationTable{
  ["mou_yu"] = "谋攻篇-虞包",
}

General:new(extension, "mou__huanggai", "wu", 4):addSkills { "mou__kurou", "mou__zhaxiang" }
Fk:loadTranslationTable{
  ["mou__huanggai"] = "谋黄盖",
  ["#mou__huanggai"] = "轻身为国",
  ["illustrator:mou__huanggai"] = "错落宇宙",

  ["~mou__huanggai"] = "哈哈哈哈，公瑾计成，老夫死也无憾了……",
}

local mouCaoren = General:new(extension, "mou__caoren", "wei", 4)
mouCaoren.shield = 1
mouCaoren:addSkills { "mou__jushou", "mou__jiewei" }
Fk:loadTranslationTable{
  ["mou__caoren"] = "谋曹仁",
  ["#mou__caoren"] = "固若金汤",
  ["illustrator:mou__caoren"] = "铁杵",

  ["~mou__caoren"] = "吾身可殉，然襄樊之地万不可落于吴蜀之手……",
}

General:new(extension, "mou__yujin", "wei", 4):addSkills { "mou__xiayuan", "mou__jieyue" }
Fk:loadTranslationTable{
  ["mou__yujin"] = "谋于禁",
  ["#mou__yujin"] = "威严毅重",
  ["illustrator:mou__yujin"] = "君桓文化",

  ["~mou__yujin"] = "禁……愧于丞相……",
}

General:new(extension, "mou__huangzhong", "shu", 4):addSkills { "mou__liegong" }
Fk:loadTranslationTable{
  ["mou__huangzhong"] = "谋黄忠",
  ["#mou__huangzhong"] = "没金铩羽",
  ["cv:mou__huangzhong"] = "金垚",
  ["illustrator:mou__huangzhong"] = "漫想族",

  ["~mou__huangzhong"] = "弦断弓藏，将老孤亡…",
}

General:new(extension, "mou__lvmeng", "wu", 4):addSkills { "mou__keji", "dujiang" }
Fk:loadTranslationTable{
  ["mou__lvmeng"] = "谋吕蒙",
  ["#mou__lvmeng"] = "苍江一笠",
  ["cv:mou__lvmeng"] = "刘强",
  ["illustrator:mou__lvmeng"] = "君桓文化",

  ["~mou__lvmeng"] = "义封胆略过人，主公可任之……",
}

General:new(extension, "mou__huangyueying", "shu", 3, 3, General.Female):addSkills { "mou__jizhi", "mou__qicai" }
Fk:loadTranslationTable{
  ["mou__huangyueying"] = "谋黄月英",
  ["#mou__huangyueying"] = "足智多谋",
  ["illustrator:mou__huangyueying"] = "黯荧岛",

  ["~mou__huangyueying"] = "何日北平中原，夫君再返隆中……",
}

General:new(extension, "mou__luzhi", "qun", 3):addSkills { "mou__mingren", "mou__zhenliang" }
Fk:loadTranslationTable{
  ["mou__luzhi"] = "谋卢植",
  ["#mou__luzhi"] = "国之桢干",
  ["cv:mou__luzhi"] = "袁国庆",
  ["illustrator:mou__luzhi"] = "君桓文化",

  ["~mou__luzhi"] = "历数有尽，天命有归……",
}

General:new(extension, "mou__luxun", "wu", 3):addSkills { "mou__qianxun", "mou__lianying" }
Fk:loadTranslationTable{
  ["mou__luxun"] = "谋陆逊",
  ["#mou__luxun"] = "儒生雄才",
  ["illustrator:mou__luxun"] = "凝聚永恒",

  ["~mou__luxun"] = "清玉岂容有污，今唯以死自证！",
}

General:new(extension, "mou__guohuai", "wei", 4):addSkills { "mou__jingce" }
Fk:loadTranslationTable{
  ["mou__guohuai"] = "谋郭淮",
  ["#mou__guohuai"] = "垂问秦雍",
  ["illustrator:mou__guohuai"] = "铁杵",

  ["!mou__guohuai"] = "哈哈哈哈，此功当与众将共享。",
  ["~mou__guohuai"] = "五子哀母，不惜其身，淮又安能坐视。",
}

return extension
