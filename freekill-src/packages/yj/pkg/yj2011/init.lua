local extension = Package:new("yj2011")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/yj2011/skills")

Fk:loadTranslationTable{
  ["yj2011"] = "一将成名2011",
  ["nos"] = "旧",
}

General:new(extension, "caozhi", "wei", 3):addSkills { "luoying", "jiushi" }
Fk:loadTranslationTable{
  ["caozhi"] = "曹植",
  ["#caozhi"] = "八斗之才",
  ["designer:caozhi"] = "Foxear",
  ["illustrator:caozhi"] = "木美人",

  ["~caozhi"] = "本是同根生，相煎何太急。",
}

General:new(extension, "yujin", "wei", 4):addSkills { "yizhong" }
Fk:loadTranslationTable{
  ["yujin"] = "于禁",
  ["#yujin"] = "魏武之刚",
  ["designer:yujin"] = "许坦",
  ["illustrator:yujin"] = "Yi章",

  ["~yujin"] = "我，无颜面对丞相了……",
}

General:new(extension, "zhangchunhua", "wei", 3, 3, General.Female):addSkills { "jueqing", "shangshi" }
Fk:loadTranslationTable{
  ["zhangchunhua"] = "张春华",
  ["#zhangchunhua"] = "冷血皇后",
  ["designer:zhangchunhua"] = "JZHIEI",
  ["illustrator:zhangchunhua"] = "樱花闪乱",

  ["~zhangchunhua"] = "怎能如此对我！",
}

General:new(extension, "nos__fazheng", "shu", 3):addSkills { "nos__enyuan", "nos__xuanhuo" }
Fk:loadTranslationTable{
  ["nos__fazheng"] = "法正",
  ["#nos__fazheng"] = "蜀汉的辅翼",
  ["designer:nos__fazheng"] = "Michael_Lee",
  ["illustrator:nos__fazheng"] = "雷没才",

  ["~nos__fazheng"] = "辅翼既折，蜀汉衰矣……",
}

General:new(extension, "fazheng", "shu", 3):addSkills { "enyuan", "xuanhuo" }
Fk:loadTranslationTable{
  ["fazheng"] = "法正",
  ["#fazheng"] = "蜀汉的辅翼",
  ["designer:fazheng"] = "韩旭",
  ["illustrator:fazheng"] = "L",

  ["~fazheng"] = "汉室复兴，我，是看不到了……",
}

General:new(extension, "masu", "shu", 3):addSkills { "xinzhan", "huilei" }
Fk:loadTranslationTable{
  ["masu"] = "马谡",
  ["#masu"] = "怀才自负",
  ["designer:masu"] = "点点",
  ["illustrator:masu"] = "张帅",

  ["$huilei2"] = "谡愿以死安大局。",
}

General:new(extension, "nos__xushu", "shu", 3):addSkills { "nos__wuyan", "nos__jujian" }
Fk:loadTranslationTable{
  ["nos__xushu"] = "徐庶",
  ["#nos__xushu"] = "忠孝的侠士",
  ["designer:nos__xushu"] = "双叶松",
  ["illustrator:nos__xushu"] = "XINA",

  ["~nos__xushu"] = "娘……孩儿不孝……向您……请罪……",
}

General:new(extension, "xushu", "shu", 3):addSkills { "wuyan", "jujian" }
Fk:loadTranslationTable{
  ["xushu"] = "徐庶",
  ["#xushu"] = "忠孝的侠士",
  ["illustrator:xushu"] = "L",

  ["~xushu"] = "忠孝不能两全，孩儿……",
}

General:new(extension, "nos__lingtong", "wu", 4):addSkills { "nos__xuanfeng" }
Fk:loadTranslationTable{
  ["nos__lingtong"] = "凌统",
  ["#nos__lingtong"] = "豪情烈胆",
  ["cv:nos__lingtong"] = "冷泉夜月",
  ["designer:nos__lingtong"] = "ShadowLee",
  ["illustrator:nos__lingtong"] = "绵Myan",

  ["~nos__lingtong"] = "大丈夫不惧死亡……",
}

General:new(extension, "lingtong", "wu", 4):addSkills { "xuanfeng" }
Fk:loadTranslationTable{
  ["lingtong"] = "凌统",
  ["#lingtong"] = "豪情烈胆",
  ["cv:lingtong"] = "冷泉夜月",
  ["illustrator:lingtong"] = "DH",

  ["~lingtong"] = "大丈夫不惧死亡……",
}

General:new(extension, "wuguotai", "wu", 3, 3, General.Female):addSkills { "ganlu", "buyi" }
Fk:loadTranslationTable{
  ["wuguotai"] = "吴国太",
  ["#wuguotai"] = "武烈皇后",
  ["designer:wuguotai"] = "章鱼",
  ["illustrator:wuguotai"] = "zoo",

  ["~wuguotai"] = "卿等，务必用心辅佐仲谋……",
}

General:new(extension, "xusheng", "wu", 4):addSkills { "pojun" }
Fk:loadTranslationTable{
  ["xusheng"] = "徐盛",
  ["#xusheng"] = "江东的铁壁",
  ["designer:xusheng"] = "阿江",
  ["illustrator:xusheng"] = "刘周",

  ["~xusheng"] = "盛，不能奋身出命，不亦辱乎……",
}

General:new(extension, "gaoshun", "qun", 4):addSkills { "xianzhen", "jinjiu" }
Fk:loadTranslationTable{
  ["gaoshun"] = "高顺",
  ["#gaoshun"] = "攻无不克",
  ["designer:gaoshun"] = "羽柴文理",
  ["illustrator:gaoshun"] = "鄧Sir",

  ["~gaoshun"] = "生死有命……",
}

General:new(extension, "chengong", "qun", 3):addSkills { "mingce", "zhichi" }
Fk:loadTranslationTable{
  ["chengong"] = "陈宫",
  ["#chengong"] = "刚直壮烈",
  ["designer:chengong"] = "Kaycent",
  ["cv:chengong"] = "金垚",
  ["illustrator:chengong"] = "黑月乱",

  ["~chengong"] = "请出就戮！",
}

return extension
