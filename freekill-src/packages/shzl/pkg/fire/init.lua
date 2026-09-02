local extension = Package:new("fire")
extension.extensionName = "shzl"

extension:loadSkillSkelsByPath("./packages/shzl/pkg/fire/skills")

Fk:loadTranslationTable{
  ["fire"] = "神话再临·火",
}

General:new(extension, "dianwei", "wei", 4):addSkills { "qiangxi" }
Fk:loadTranslationTable{
  ["dianwei"] = "典韦",
  ["#dianwei"] = "古之恶来",
  ["cv:dianwei"] = "冷泉月夜",
  ["illustrator:dianwei"] = "小冷",

  ["~dianwei"] = "主公，快走……！",
}

General:new(extension, "xunyu", "wei", 3):addSkills { "quhu", "jieming" }
Fk:loadTranslationTable{
  ["xunyu"] = "荀彧",
  ["#xunyu"] = "王佐之才",
  ["illustrator:xunyu"] = "LiuHeng",
  ["designer:xunyu"] = "韩旭",

  ["~xunyu"] = "主公要臣死，臣不得不死。",
}

General:new(extension, "wolong", "shu", 3):addSkills { "bazhen", "huoji", "kanpo" }
Fk:loadTranslationTable{
  ["wolong"] = "卧龙诸葛亮",
  ["#wolong"] = "卧龙",
  ["cv:wolong"] = "彭尧",
  ["illustrator:wolong"] = "北",

  ["~wolong"] = "我的计谋竟被……",
}

General:new(extension, "pangtong", "shu", 3):addSkills { "lianhuan", "niepan" }
Fk:loadTranslationTable{
  ["pangtong"] = "庞统",
  ["#pangtong"] = "凤雏",
  ["illustrator:pangtong"] = "KayaK",

  ["~pangtong"] = "看来我命中注定将丧命于此……",
}

General:new(extension, "taishici", "wu", 4):addSkills { "tianyi" }
Fk:loadTranslationTable{
  ["taishici"] = "太史慈",
  ["#taishici"] = "笃烈之士",
  ["illustrator:taishici"] = "Tuu.",

  ["~taishici"] = "大丈夫，当带三尺之剑，立不世之功！",
}

General:new(extension, "pangde", "qun", 4):addSkills { "mengjin", "mashu" }
Fk:loadTranslationTable{
  ["pangde"] = "庞德",
  ["#pangde"] = "人马一体",
  ["illustrator:pangde"] = "LiuHeng",

  ["~pangde"] = "四面都是水，我命休矣……",
}

General:new(extension, "yanliangwenchou", "qun", 4):addSkills { "shuangxiong" }
Fk:loadTranslationTable{
  ["yanliangwenchou"] = "颜良文丑",
  ["#yanliangwenchou"] = "虎狼兄弟",
  ["cv:yanliangwenchou"] = "彭尧",
  ["illustrator:yanliangwenchou"] = "KayaK",

  ["~yanliangwenchou"] = "这红脸长须大将是……",
}

General:new(extension, "yuanshao", "qun", 4):addSkills { "luanji", "xueyi" }
Fk:loadTranslationTable{
  ["yuanshao"] = "袁绍",
  ["#yuanshao"] = "高贵的名门",
  ["cv:yuanshao"] = "彭尧", -- 北村?
  ["illustrator:yuanshao"] = "SoniaTang",

  ["~yuanshao"] = "老天不助我袁家啊！……",
}

return extension
