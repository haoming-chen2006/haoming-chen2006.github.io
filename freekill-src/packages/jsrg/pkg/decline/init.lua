local extension = Package:new("decline")
extension.extensionName = "jsrg"

extension:loadSkillSkelsByPath("./packages/jsrg/pkg/decline/skills")

Fk:loadTranslationTable{
  ["decline"] = "江山如故·衰",
}

General:new(extension, "js__yuanshao", "qun", 4):addSkills { "js__zhimeng", "js__tianyu", "zhuni", "hezhi" }
Fk:loadTranslationTable{
  ["js__yuanshao"] = "袁绍",
  ["#js__yuanshao"] = "号令天下",
  ["illustrator:js__yuanshao"] = "鬼画府",
}

General:new(extension, "js__liubiao", "qun", 3):addSkills { "yansha", "qingping" }
Fk:loadTranslationTable{
  ["js__liubiao"] = "刘表",
  ["#js__liubiao"] = "单骑入荆",
  ["illustrator:js__liubiao"] = "鬼画府",
}

local zhangjiao = General:new(extension, "js__zhangjiao", "qun", 4)
zhangjiao:addSkills { "js__xiangru", "js__wudao" }
zhangjiao:addRelatedSkill("js__jinglei")
Fk:loadTranslationTable{
  ["js__zhangjiao"] = "张角",
  ["#js__zhangjiao"] = "万蛾赴火",
  ["illustrator:js__zhangjiao"] = "鬼画府",
}

General:new(extension, "yangqiu", "qun", 4):addSkills { "saojian" }
Fk:loadTranslationTable{
  ["yangqiu"] = "阳球",
  ["#yangqiu"] = "身蹈水火",
  ["cv:yangqiu"] = "KEVIN（新月杀原创）",
  ["illustrator:yangqiu"] = "鬼画府",

  ["~yangqiu"] = "党人皆力锄奸宦而死，阳球之后，亦有志士。",
}

local zhanghuan = General:new(extension, "zhanghuan", "qun", 4)
zhanghuan:addSkills { "zhushou", "yangge" }
zhanghuan:addRelatedSkill("mizhao")
Fk:loadTranslationTable{
  ["zhanghuan"] = "张奂",
  ["#zhanghuan"] = "正身洁己",
  ["illustrator:zhanghuan"] = "峰雨同程",
}

General:new(extension, "caojiewangfu", "qun", 3):addSkills { "zonghai", "jueyin" }
Fk:loadTranslationTable{
  ["caojiewangfu"] = "曹节王甫",
  ["#caojiewangfu"] = "浊乱海内",
  ["illustrator:caojiewangfu"] = "鬼画府",
}

General:new(extension, "zhangju", "qun", 4):addSkills { "js__qiluan", "xiangjia" }
Fk:loadTranslationTable{
  ["zhangju"] = "张举",
  ["#zhangju"] = "草头天子",
  ["illustrator:zhangju"] = "峰雨同程",
}

General:new(extension, "chenfan", "qun", 3):addSkills { "gangfen", "dangren" }
Fk:loadTranslationTable{
  ["chenfan"] = "陈蕃",
  ["#chenfan"] = "不畏强御",
  ["illustrator:chenfan"] = "峰雨同程",
}

General:new(extension, "songhuanghou", "qun", 3, 3, General.Female):addSkills { "zhongzen", "xuchong" }
Fk:loadTranslationTable{
  ["songhuanghou"] = "宋皇后",
  ["#songhuanghou"] = "兰心蕙质",
  ["illustrator:songhuanghou"] = "峰雨同程",
}

local dongzhuo = General:new(extension, "js__dongzhuo", "qun", 4)
dongzhuo:addSkills { "guanshi", "cangxiong", "jiebingx" }
dongzhuo:addRelatedSkill("baowei")
Fk:loadTranslationTable{
  ["js__dongzhuo"] = "董卓",
  ["#js__dongzhuo"] = "华夏震栗",
  ["illustrator:js__dongzhuo"] = "鬼画府",
}

General:new(extension, "js__luzhi", "qun", 3):addSkills { "ruzong", "daoren" }
Fk:loadTranslationTable{
  ["js__luzhi"] = "卢植",
  ["#js__luzhi"] = "眸宿渊亭",
  ["illustrator:js__luzhi"] = "峰雨同程",
}

return extension
