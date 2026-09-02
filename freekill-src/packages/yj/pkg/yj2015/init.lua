local extension = Package:new("yj2015")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/yj2015/skills")

Fk:loadTranslationTable{
  ["yj2015"] = "一将成名2015",
}

General:new(extension, "caorui", "wei", 3):addSkills { "huituo", "mingjian", "xingshuai" }
Fk:loadTranslationTable{
  ["caorui"] = "曹叡",
  ["#caorui"] = "天姿的明君",
  ["designer:caorui"] = "Ptolemy_M7",
  ["illustrator:caorui"] = "Thinking",

  ["~caorui"] = "悔不该耽于逸乐，至有今日……",
}

General:new(extension, "nos__caoxiu", "wei", 4):addSkills { "nos__taoxi" }
Fk:loadTranslationTable{
  ["nos__caoxiu"] = "曹休",
  ["#nos__caoxiu"] = "千里骐骥",
  ["designer:nos__caoxiu"] = "蹩脚狐小三",
  ["illustrator:nos__caoxiu"] = "eshao111",

  ["~nos__caoxiu"] = "兵行险招，终有一失。",
}

General:new(extension, "caoxiu", "wei", 4):addSkills { "qianju", "qingxi" }
Fk:loadTranslationTable{
  ["caoxiu"] = "曹休",
  ["#caoxiu"] = "千里骐骥",
  ["illustrator:caoxiu"] = "NOVAR",
  ["designer:caoxiu"] = "Roc",

  ["~caoxiu"] = "兵行险招，终有一失。",
}

General:new(extension, "zhongyao", "wei", 3):addSkills { "huomo", "zuoding" }
Fk:loadTranslationTable{
  ["zhongyao"] = "钟繇",
  ["#zhongyao"] = "正楷萧曹",
  ["designer:zhongyao"] = "怀默",
  ["illustrator:zhongyao"] = "eshao111",

  ["~zhongyao"] = "墨尽，岁终。",
}

General:new(extension, "liuchen", "shu", 4):addSkills { "zhanjue", "qinwang" }
Fk:loadTranslationTable{
  ["liuchen"] = "刘谌",
  ["#liuchen"] = "血荐轩辕",
  ["designer:liuchen"] = "列缺霹雳",
  ["illustrator:liuchen"] = "凌天翼&depp",

  ["~liuchen"] = "无言对百姓，有愧，见先祖……",
}

General:new(extension, "xiahoushi", "shu", 3, 3, General.Female):addSkills { "qiaoshi", "yanyu" }
Fk:loadTranslationTable{
  ["xiahoushi"] = "夏侯氏",
  ["#xiahoushi"] = "采缘撷睦",
  ["designer:xiahoushi"] = "淬毒",
  ["illustrator:xiahoushi"] = "2B铅笔",

  ["~xiahoushi"] = "愿有来世，不负前缘……",
}

General:new(extension, "zhangyi", "shu", 4):addSkills { "wurong", "shizhi" }
Fk:loadTranslationTable{
  ["zhangyi"] = "张嶷",
  ["#zhangyi"] = "通壮逾古",
  ["designer:zhangyi"] = "XYZ",
  ["illustrator:zhangyi"] = "livsinno",

  ["~zhangyi"] = "大丈夫当战死沙场，马革裹尸而还。",
}

General:new(extension, "quancong", "wu", 4):addSkills { "zhenshan" }
Fk:loadTranslationTable{
  ["quancong"] = "全琮",
  ["#quancong"] = "慕势耀族",
  ["illustrator:quancong"] = "小小鸡仔",
  ["designer:quancong"] = "凌风自舞",

  ["~quancong"] = "儿啊，好好报答吴王知遇之恩……",
}

General:new(extension, "sunxiu", "wu", 3):addSkills { "yanzhu", "xingxue", "zhaofu" }
Fk:loadTranslationTable{
  ["sunxiu"] = "孙休",
  ["#sunxiu"] = "弥殇的景君",
  ["designer:sunxiu"] = "顶尖对决&剑",
  ["illustrator:sunxiu"] = "XXX",

  ["~sunxiu"] = "崇文抑武，朕错了吗？",
}

General:new(extension, "nos__zhuzhi", "wu", 4):addSkills { "nos__anguo" }
Fk:loadTranslationTable{
  ["nos__zhuzhi"] = "朱治",
  ["#nos__zhuzhi"] = "王事靡盬",
  ["designer:nos__zhuzhi"] = "May&Roy",
  ["illustrator:nos__zhuzhi"] = "心中一凛",

  ["~nos__zhuzhi"] = "集毕生之力，保国泰民安。",
}

General:new(extension, "zhuzhi", "wu", 4):addSkills { "anguo" }
Fk:loadTranslationTable{
  ["zhuzhi"] = "朱治",
  ["#zhuzhi"] = "王事靡盬",
  ["illustrator:zhuzhi"] = "折原",

  ["~zhuzhi"] = "集毕生之力，保国泰民安。",
}

General:new(extension, "gongsunyuan", "qun", 4):addSkills { "huaiyi" }
Fk:loadTranslationTable{
  ["gongsunyuan"] = "公孙渊",
  ["#gongsunyuan"] = "狡徒悬海",
  ["designer:gongsunyuan"] = "死水微澜",
  ["illustrator:gongsunyuan"] = "尼乐小丑",

  ["~gongsunyuan"] = "天不容我公孙家……",
}

General:new(extension, "guotupangji", "qun", 3):addSkills { "jigong", "shifei" }
Fk:loadTranslationTable{
  ["guotupangji"] = "郭图逄纪",
  ["#guotupangji"] = "凶蛇两端",
  ["designer:guotupangji"] = "辰木",
  ["illustrator:guotupangji"] = "Aimer&Vwolf",

  ["~guotupangji"] = "大势已去，无力回天……",
}

return extension
