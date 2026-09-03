-- SPDX-License-Identifier: GPL-3.0-or-later

local extension = Package:new("pride")
extension.extensionName = "sxrm"

extension:loadSkillSkelsByPath("./packages/sxrm/pkg/pride/skills")

Fk:loadTranslationTable {
  ["pride"] = "蚀心入魔·慢",
}

local moguanyu = General:new(extension, "sx__guanyu", "evil", 5)
moguanyu:addSkills { "hanguo", "weiwo" }
moguanyu:addRelatedSkill("wushen")
Fk:loadTranslationTable {
  ["sx__guanyu"] = "关羽",
  ["#sx__guanyu"] = "四海仰鼻息",
  ["illustrator:sx__guanyu"] = "小罗没想好",
}

General:new(extension, "sx__guanyinping", "shu", 4, 4, General.Female):addSkills { "yinmou", "quchi" }
Fk:loadTranslationTable{
  ["sx__guanyinping"] = "关银屏",
  ["#sx__guanyinping"] = "天骄虎女",
  ["illustrator:sx__guanyinping"] = "小罗没想好",
}

General:new(extension, "sx__liufeng", "shu", 4):addSkills { "huaibing" }
Fk:loadTranslationTable {
  ["sx__liufeng"] = "寇封",
  ["#sx__liufeng"] = "不动如山",
  ["illustrator:sx__liufeng"] = "城与橙与程",
}

General:new(extension, "mifang", "shu", 3):addSkills { "huoe", "tanduo" }
Fk:loadTranslationTable {
  ["mifang"] = "糜芳",
  ["#mifang"] = "负荆之臣",
  ["illustrator:mifang"] = "城与橙与程",
}

General:new(extension, "sx__yujin", "shu", 4):addSkills { "suwu", "sx__renwang" }
Fk:loadTranslationTable{
  ["sx__yujin"] = "于禁",
  ["#sx__yujin"] = "立地成佛",
  ["illustrator:sx__yujin"] = "城与橙与程",
}

General:new(extension, "sx__pangde", "wei", 4):addSkill("nuozhan")
Fk:loadTranslationTable {
  ["sx__pangde"] = "庞德",
  ["#sx__pangde"] = "狂徒",
  ["illustrator:sx__pangde"] = "城与橙与程",
}

General:new(extension, "sx__lvmeng", "wu", 3, 4):addSkills { "kongzhi", "bizha" }
Fk:loadTranslationTable {
  ["sx__lvmeng"] = "吕蒙",
  ["#sx__lvmeng"] = "病入膏肓",
  ["illustrator:sx__lvmeng"] = "小罗没想好",
}

General:new(extension, "sx__luxun", "wu", 3):addSkills { "chanyu", "congfeng" }
Fk:loadTranslationTable {
  ["sx__luxun"] = "陆逊",
  ["#sx__luxun"] = "孺子为将",
  ["illustrator:sx__luxun"] = "小罗没想好",
}

General:new(extension, "sx__yanliangwenchou", "qun", 5):addSkills { "haibian", "qiewang" }
Fk:loadTranslationTable {
  ["sx__yanliangwenchou"] = "颜良文丑",
  ["#sx__yanliangwenchou"] = "土鸡瓦犬",
  ["illustrator:sx__yanliangwenchou"] = "城与橙与程",
}

return extension
