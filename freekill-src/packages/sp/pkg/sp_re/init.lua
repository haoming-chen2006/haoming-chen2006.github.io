local extension = Package:new("sp_re")
extension.extensionName = "sp"

extension:loadSkillSkelsByPath("./packages/sp/pkg/sp_re/skills")

Fk:loadTranslationTable{
  ["sp_re"] = "RE.SP",
  ["re"] = "RE",
}

General:new(extension, "re__masu", "shu", 3):addSkills { "sanyao", "zhiman" }
Fk:loadTranslationTable{
  ["re__masu"] = "马谡",
  ["#re__masu"] = "傲才自负",
  ["illustrator:re__masu"] = "XXX",

  ["~re__masu"] = "败军之罪，万死难赎……",
}

General:new(extension, "re__yujin", "wei", 4):addSkills { "jieyue" }
Fk:loadTranslationTable{
  ["re__yujin"] = "于禁",
  ["#re__yujin"] = "讨暴坚垒",
  ["illustrator:re__yujin"] = "depp",

  ["~re__yujin"] = "我，无颜面对丞相了……",
}

General:new(extension, "re__liubiao", "qun", 3):addSkills { "re__zishou", "zongshi" }
Fk:loadTranslationTable{
  ["re__liubiao"] = "刘表",
  ["#re__liubiao"] = "跨蹈汉南",
  ["illustrator:re__liubiao"] = "歌路",

  ["~re__liubiao"] = "优柔寡断，要不得啊。",
}

General:new(extension, "re__madai", "shu", 4):addSkills { "mashu", "re__qianxi" }
Fk:loadTranslationTable{
  ["re__madai"] = "马岱",
  ["#re__madai"] = "临危受命",
  ["illustrator:re__madai"] = "歌路",

  ["~re__madai"] = "我怎么会死在这里……",
}

General:new(extension, "re__bulianshi", "wu", 3, 3, General.Female):addSkills { "re__anxu", "zhuiyi" }
Fk:loadTranslationTable{
  ["re__bulianshi"] = "步练师",
  ["#re__bulianshi"] = "无冕之后",
  ["illustrator:re__bulianshi"] = "depp",

  ["~re__bulianshi"] = "江之永矣，不可方思。",
}

General:new(extension, "re__xusheng", "wu", 4):addSkills { "re__pojun" }
Fk:loadTranslationTable{
  ["re__xusheng"] = "徐盛",
  ["#re__xusheng"] = "江东的铁壁",
  ["illustrator:re__xusheng"] = "L",

  ["~re__xusheng"] = "盛，不能奋身出命，不亦辱乎……",
}

return extension
