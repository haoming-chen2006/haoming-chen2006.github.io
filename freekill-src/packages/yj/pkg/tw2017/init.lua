local extension = Package:new("yjtw2017")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/tw2017/skills")

Fk:loadTranslationTable{
  ["yjtw2017"] = "台湾一将2017",
}

General:new(extension, "tw__caohong", "wei", 4):addSkills { "tw__huzhu", "tw__liancai" }
Fk:loadTranslationTable{
  ["tw__caohong"] = "曹洪",
  ["#tw__caohong"] = "驃騎將軍",
  ["illustrator:tw__caohong"] = "黃人尤",
  ["designer:tw__caohong"] = "二十四兆",
}

General:new(extension, "tw__maliang", "shu", 3):addSkills { "tw__rangyi", "tw__baimei" }
Fk:loadTranslationTable{
  ["tw__maliang"] = "马良",
  ["#tw__maliang"] = "白眉令士",
  ["illustrator:tw__maliang"] = "廖昌翊",
  ["designer:tw__maliang"] = "MC工读",
}

General:new(extension, "tw__dingfeng", "wu", 4):addSkills { "tw__qijia", "tw__zhuchen" }
Fk:loadTranslationTable{
  ["tw__dingfeng"] = "丁奉",
  ["#tw__dingfeng"] = "勇冠全軍",
  ["illustrator:tw__dingfeng"] = "柯郁萍",
  ["designer:tw__dingfeng"] = "ㄎㄎ",
}

return extension
