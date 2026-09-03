-- SPDX-License-Identifier: GPL-3.0-or-later

local extension = Package:new("rage")
extension.extensionName = "sxrm"

extension:loadSkillSkelsByPath("./packages/sxrm/pkg/rage/skills")

Fk:loadTranslationTable{
  ["rage"] = "蚀心入魔·嗔",
  ["sx2"] = "蚀心",
  ["sxrm__contract"] = "#\"<b>契定技</b>\"：一种技能标签；发动一次后，此技能【契定技】的标签改为【锁定技】并删除技能描述中的“可以”。",
}

General:new(extension, "sx__zhouyu", "evil", 4):addSkills { "jiehuo", "xianger", "mieguo" }
Fk:loadTranslationTable{
  ["sx__zhouyu"] = "周瑜",
  ["#sx__zhouyu"] = "哀弦万可惊",
  ["illustrator:sx__zhouyu"] = "小罗没想好",
}

local zhugeliang = General:new(extension, "sx__zhugeliang", "shu", 3)
zhugeliang.subkingdom = "god"
zhugeliang:addSkills { "bingqu", "fanxin" }
zhugeliang:addRelatedSkills { "kuangbao", "wumou" }
Fk:loadTranslationTable{
  ["sx__zhugeliang"] = "诸葛亮",
  ["#sx__zhugeliang"] = "人也神也",
  ["illustrator:sx__zhugeliang"] = "城与橙与程",
}

General:new(extension, "sx__zhangzhao", "wu", 3):addSkills { "xiezhong", "qishiz" }
Fk:loadTranslationTable{
  ["sx__zhangzhao"] = "张昭",
  ["#sx__zhangzhao"] = "迂儒",
  ["illustrator:sx__zhangzhao"] = "曲夜雀",
}

General:new(extension, "sx__caoren", "wei", 4):addSkills { "yangbei", "yinfengc" }
Fk:loadTranslationTable{
  ["sx__caoren"] = "曹仁",
  ["#sx__caoren"] = "坚壳之蚌",
  ["illustrator:sx__caoren"] = "张油菜",
}

General:new(extension, "sx__zhaoyun", "shu", 4):addSkills { "zhaduo" }
Fk:loadTranslationTable{
  ["sx__zhaoyun"] = "赵云",
  ["#sx__zhaoyun"] = "坐收渔利",
  ["illustrator:sx__zhaoyun"] = "曲夜雀",
}

General:new(extension, "sx2__caocao", "wei", 4):addSkills { "lanjiao" }
Fk:loadTranslationTable{
  ["sx2__caocao"] = "曹操",
  ["#sx2__caocao"] = "铜雀囚凰",
  ["illustrator:sx2__caocao"] = "丝葱",
}

General:new(extension, "jiahua", "wu", 5):addSkills { "fubei", "dancui" }
Fk:loadTranslationTable{
  ["jiahua"] = "贾华",
  ["#jiahua"] = "拔剑四顾",
  ["illustrator:jiahua"] = "城与橙与程",
}

General:new(extension, "sx__sunshangxiang", "wu", 3, 3, General.Female):addSkills { "sx__jiaozong", "fusui" }
Fk:loadTranslationTable{
  ["sx__sunshangxiang"] = "孙尚香",
  ["#sx__sunshangxiang"] = "生死相随",
  ["illustrator:sx__sunshangxiang"] = "城与橙与程",
}

General:new(extension, "sx__lusu", "wu", 3):addSkills { "wanli", "lishui" }
Fk:loadTranslationTable{
  ["sx__lusu"] = "鲁肃",
  ["#sx__lusu"] = "养虺成蛇",
  ["illustrator:sx__lusu"] = "城与橙与程",
}

return extension
