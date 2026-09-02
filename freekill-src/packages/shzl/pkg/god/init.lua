local extension = Package:new("shzl_god")
extension.extensionName = "shzl"

extension:loadSkillSkelsByPath("./packages/shzl/pkg/god/skills")

Fk:loadTranslationTable{
  ["god"] = "神",
  ["shzl_god"] = "神话再临·神",
  ["nos"] = "旧",
}

General:new(extension, "godguanyu", "god", 5):addSkills { "wushen", "wuhun" }
Fk:loadTranslationTable{
  ["godguanyu"] = "神关羽",
  ["#godguanyu"] = "神鬼再临",
  ["illustrator:godguanyu"] = "KayaK",
}

General:new(extension, "godlvmeng", "god", 3):addSkills { "shelie", "gongxin" }
Fk:loadTranslationTable{
  ["godlvmeng"] = "神吕蒙",
  ["#godlvmeng"] = "圣光之国士",
  ["illustrator:godlvmeng"] = "KayaK",

  ["~godlvmeng"] = "劫数难逃，我们别无选择……",
}

General:new(extension, "godzhouyu", "god", 4):addSkills { "qinyin", "yeyan" }
Fk:loadTranslationTable{
  ["godzhouyu"] = "神周瑜",
  ["#godzhouyu"] = "赤壁的火神",
  ["illustrator:godzhouyu"] = "KayaK",

  ["~godzhouyu"] = "逝者不死，浴火重生。",
}

General:new(extension, "godzhugeliang", "god", 3):addSkills { "qixing", "kuangfeng", "dawu" }
Fk:loadTranslationTable{
  ["godzhugeliang"] = "神诸葛亮",
  ["#godzhugeliang"] = "赤壁的妖术师",
  ["illustrator:godzhugeliang"] = "KayaK",

  ["~godzhugeliang"] = "今当远离，临表涕零，不知所言……",
}

General:new(extension, "godlvbu", "god", 5):addSkills { "kuangbao", "wumou", "wuqian", "shenfen" }
Fk:loadTranslationTable{
  ["godlvbu"] = "神吕布",
  ["#godlvbu"] = "修罗之道",
  ["illustrator:godlvbu"] = "KayaK",

  ["$wushuang_godlvbu1"] = "燎原千里，凶名远扬！",
  ["$wushuang_godlvbu2"] = "铁蹄奋进，所向披靡！",
  ["~godlvbu"] = "我在修罗炼狱等着你们，呃哈哈哈哈哈！",
}

General:new(extension, "godcaocao", "god", 3):addSkills { "guixin", "feiying" }
Fk:loadTranslationTable{
  ["godcaocao"] = "神曹操",
  ["#godcaocao"] = "超世之英杰",
  ["illustrator:godcaocao"] = "KayaK",

  ["~godcaocao"] = "腾蛇乘雾，终为土灰。",
}

General:new(extension, "nos__godzhaoyun", "god", 2):addSkills { "nos__juejing", "nos__longhun" }
Fk:loadTranslationTable{
  ["nos__godzhaoyun"] = "神赵云",
  ["#nos__godzhaoyun"] = "神威如龙",
  ["illustrator:nos__godzhaoyun"] = "KayaK",

  ["~nos__godzhaoyun"] = "龙身虽死，魂魄不灭！",
}

General:new(extension, "godzhaoyun", "god", 2):addSkills { "juejing", "longhun" }
Fk:loadTranslationTable{
  ["godzhaoyun"] = "神赵云",
  ["#godzhaoyun"] = "神威如龙",
  ["illustrator:godzhaoyun"] = "铁杵文化",

  ["~godzhaoyun"] = "龙鳞崩损，坠于九天……",
}

General:new(extension, "gundam", "god", 1):addSkills { "gundam__juejing", "gundam__longhun", "zhanjiang" }
Fk:loadTranslationTable{
  ["gundam"] = "高达一号",
  ["#gundam"] = "神威如龙",
  ["illustrator:gundam"] = "巴萨小马",

  ["~gundam"] = "血染鳞甲，龙坠九天。",
}

General:new(extension, "godsimayi", "god", 4):addSkills { "renjie", "baiyin", "lianpo" }
Fk:loadTranslationTable{
  ["godsimayi"] = "神司马懿",
  ["#godsimayi"] = "晋国之祖",
  ["illustrator:godsimayi"] = "KayaK",

  ["~godsimayi"] = "鼎足三分已成梦，一切都结束了……",
}

General:new(extension, "godliubei", "god", 6):addSkills { "longnu", "jieying" }
Fk:loadTranslationTable{
  ["godliubei"] = "神刘备",
  ["#godliubei"] = "誓守桃园义",
  ["illustrator:godliubei"] = "zoo",

  ["~godliubei"] = "桃园依旧，来世再结……",
}

General:new(extension, "godluxun", "god", 4):addSkills { "junlue", "cuike", "zhanhuo" }
Fk:loadTranslationTable{
  ["godluxun"] = "神陆逊",
  ["#godluxun"] = "红莲业火",
  ["illustrator:godluxun"] = "Thinking",

  ["~godluxun"] = "东吴业火，终究熄灭……",
}

General:new(extension, "godzhangliao", "god", 4):addSkills { "duorui", "zhiti" }
Fk:loadTranslationTable{
  ["godzhangliao"] = "神张辽",
  ["#godzhangliao"] = "雁门之刑天",
  ["illustrator:godzhangliao"] = "Town",

  ["~godzhangliao"] = "我也有……被孙仲谋所伤之时？",
}

General:new(extension, "godganning", "god", 3, 6):addSkills { "poxi", "gn_jieying" }
Fk:loadTranslationTable{
  ["godganning"] = "神甘宁",
  ["#godganning"] = "江表之力牧",
  ["designer:godganning"] = "韩旭",
  ["illustrator:godganning"] = "depp",

  ["~godganning"] = "吾不能奉主，谁辅主基业？",
}

General:new(extension, "goddiaochan", "god", 3, 3, General.Female):addSkills { "meihun", "huoxin" }
Fk:loadTranslationTable{
  ["goddiaochan"] = "神貂蝉",
  ["#goddiaochan"] = "欲界非天",
  ["illustrator:goddiaochan"] = "KayaK",
  ["cv:goddiaochan"] = "桃妮儿",
  ["designer:goddiaochan"] = "KayaK",

  ["~goddiaochan"] = "也许，你们日后的所闻所望，都是我某天的所叹所想……",
}

return extension
