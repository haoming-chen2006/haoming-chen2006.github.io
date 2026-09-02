local extension = Package:new("wind")
extension.extensionName = "shzl"

extension:loadSkillSkelsByPath("./packages/shzl/pkg/wind/skills")

Fk:loadTranslationTable{
  ["wind"] = "神话再临·风",
}

General:new(extension, "xiahouyuan", "wei", 4):addSkills { "shensu" }
Fk:loadTranslationTable{
  ["xiahouyuan"] = "夏侯渊",
  ["#xiahouyuan"] = "疾行的猎豹",
  ["illustrator:xiahouyuan"] = "KayaK",
  ["designer:xiahouyuan"] = "韩旭",

  ["~xiahouyuan"] = "竟然……比我还……快……",
}

General:new(extension, "caoren", "wei", 4):addSkills { "jushou" }
Fk:loadTranslationTable{
  ["caoren"] = "曹仁",
  ["#caoren"] = "大将军",
  ["illustrator:caoren"] = "KayaK",

  ["~caoren"] = "实在是守不住了……",
}

General:new(extension, "y13__caoren", "wei", 4):addSkills { "y13__jushou", "y13__jiewei" }
Fk:loadTranslationTable{
  ["y13"] = "2013",
  ["y13__caoren"] = "曹仁",
  ["#y13__caoren"] = "大将军",
  ["illustrator:y13__caoren"] = "Ccat",

  ["~y13__caoren"] = "有负丞相厚托，子孝愧矣。",
}

General:new(extension, "huangzhong", "shu", 4):addSkills { "liegong" }
Fk:loadTranslationTable{
  ["huangzhong"] = "黄忠",
  ["#huangzhong"] = "老当益壮",
  ["illustrator:huangzhong"] = "KayaK",

  ["~huangzhong"] = "不得不服老啦。",
}

General:new(extension, "weiyan", "shu", 4):addSkills { "kuanggu" }
Fk:loadTranslationTable{
  ["weiyan"] = "魏延",
  ["#weiyan"] = "嗜血的独狼",
  ["illustrator:weiyan"] = "SoniaTang",

  ["~weiyan"] = "谁敢杀我！呃啊！",
}

General:new(extension, "xiaoqiao", "wu", 3, 3, General.Female):addSkills { "tianxiang", "hongyan" }
Fk:loadTranslationTable{
  ["xiaoqiao"] = "小乔",
  ["#xiaoqiao"] = "矫情之花",
  ["cv:xiaoqiao"] = "侯小菲",
  ["illustrator:xiaoqiao"] = "KayaK",

  ["~xiaoqiao"] = "公瑾，我先走一步……",
}

General:new(extension, "zhoutai", "wu", 4):addSkills { "buqu" }
Fk:loadTranslationTable{
  ["zhoutai"] = "周泰",
  ["#zhoutai"] = "历战之躯",
  ["illustrator:zhoutai"] = "KayaK",
  ["cv:zhoutai"] = "李扬",

  ["~zhoutai"] = "已经……尽力了……",
}

General:new(extension, "zhangjiao", "qun", 3):addSkills { "leiji", "guidao", "huangtian" }
Fk:loadTranslationTable{
  ["zhangjiao"] = "张角",
  ["#zhangjiao"] = "天公将军",
  ["illustrator:zhangjiao"] = "LiuHeng",

  ["~zhangjiao"] = "黄天，也死了……",
}

General:new(extension, "yuji", "qun", 3):addSkills { "guhuo" }
Fk:loadTranslationTable{
  ["yuji"] = "于吉",
  ["#yuji"] = "太平道人",
  ["illustrator:yuji"] = "LiuHeng",
  ["cv:yuji"] = "金锡云",

  ["~yuji"] = "竟然……被猜到了……",
}

return extension
