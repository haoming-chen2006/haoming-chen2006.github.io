local extension = Package:new("yjtw2013")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/tw2013/skills")

Fk:loadTranslationTable{
  ["yjtw2013"] = "台湾一将2013",
  ["tw"] = "台版",
}

General:new(extension, "tw__caoang", "wei", 4):addSkills { "tw__xiaolian" }
Fk:loadTranslationTable{
  ["tw__caoang"] = "曹昂",
  ["#tw__caoang"] = "捨身救父",
  ["illustrator:tw__caoang"] = "陈俊佐",
  ["designer:tw__caoang"] = "Aaron",
}

local xiahouba = General:new(extension, "tw__xiahouba", "shu", 4)
xiahouba.subkingdom = "wei"
xiahouba:addSkills { "tw__yinqin", "tw__baobian" }
Fk:loadTranslationTable{
  ["tw__xiahouba"] = "夏侯霸",
  ["#tw__xiahouba"] = "棄魏投蜀",
  ["illustrator:tw__xiahouba"] = "王翎",
  ["designer:tw__xiahouba"] = "阿呆",
}

General:new(extension, "tw__zumao", "wu", 4):addSkills { "tw__tijin" }
Fk:loadTranslationTable{
  ["tw__zumao"] = "祖茂",
  ["#tw__zumao"] = "赤幘映蒼天",
  ["designer:tw__zumao"] = "ㄎㄎ",
  ["illustrator:tw__zumao"] = "黃智隆",
}

return extension
