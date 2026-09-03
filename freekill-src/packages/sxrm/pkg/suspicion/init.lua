-- SPDX-License-Identifier: GPL-3.0-or-later

local extension = Package:new("suspicion")
extension.extensionName = "sxrm"

extension:loadSkillSkelsByPath("./packages/sxrm/pkg/suspicion/skills")

Fk:loadTranslationTable{
  ["suspicion"] = "蚀心入魔·疑",
  ["sx"] = "蚀心",
  ["evil"] = "魔",
}

Fk:appendKingdomMap("evil", {"wei", "shu", "wu", "qun", "jin"})

General:new(extension, "sx__caocao", "evil", 3):addSkills { "kuxin", "sigu" }
Fk:loadTranslationTable{
  ["sx__caocao"] = "曹操",
  ["#sx__caocao"] = "一目窥九州",
  ["illustrator:sx__caocao"] = "鬼画府",
}

local lvboshe = General:new(extension, "sx__lvboshe", "qun", 4)
lvboshe:addSkills { "qingjun" }
lvboshe:addRelatedSkills { "sx__shefu&" }
Fk:loadTranslationTable{
  ["sx__lvboshe"] = "吕伯奢",
  ["#sx__lvboshe"] = "碧血东流",
  ["illustrator:sx__lvboshe"] = "鬼画府",
}

General:new(extension, "sx__huatuo", "qun", 4):addSkills { "miehai" }
Fk:loadTranslationTable{
  ["sx__huatuo"] = "华佗",
  ["#sx__huatuo"] = "上医医国",
  ["illustrator:sx__huatuo"] = "鬼画府",
}

General:new(extension, "sx__fuhuanghou", "qun", 3, 4, General.Female):addSkills { "mitu", "qianliu" }
Fk:loadTranslationTable{
  ["sx__fuhuanghou"] = "伏寿",
  ["#sx__fuhuanghou"] = "白绫蔽月",
  ["illustrator:sx__fuhuanghou"] = "鬼画府",
}

General:new(extension, "sx__liubei", "qun", 4):addSkills { "chengbian" }
Fk:loadTranslationTable{
  ["sx__liubei"] = "刘备",
  ["#sx__liubei"] = "潜隐波涛",
  ["illustrator:sx__liubei"] = "鬼画府",
}

General:new(extension, "sx__jianggan", "wei", 3):addSkills { "zongheng", "duibian" }
Fk:loadTranslationTable{
  ["sx__jianggan"] = "蒋干",
  ["#sx__jianggan"] = "舌锁千帆",
  ["illustrator:sx__jianggan"] = "鬼画府",
}

General:new(extension, "sx__caopi", "wei", 3):addSkills { "zhengsi", "sx__chengming" }
Fk:loadTranslationTable{
  ["sx__caopi"] = "曹丕",
  ["#sx__caopi"] = "兄友弟恭",
  ["illustrator:sx__caopi"] = "鬼画府",
}

General:new(extension, "wanghou", "wei", 4):addSkills { "juguw" }
Fk:loadTranslationTable{
  ["wanghou"] = "王垕",
  ["#wanghou"] = "一刀斩讫",
  ["illustrator:wanghou"] = "鬼画府",
}

General:new(extension, "sx__xunyu", "wei", 3):addSkills { "jiongce", "yihe", "sx__jizhi" }
Fk:loadTranslationTable{
  ["sx__xunyu"] = "荀彧",
  ["#sx__xunyu"] = "末路见疑",
  ["illustrator:sx__xunyu"] = "鬼画府",
}

return extension
