local extension = Package:new("rise")
extension.extensionName = "jsrg"

extension:loadSkillSkelsByPath("./packages/jsrg/pkg/rise/skills")

Fk:loadTranslationTable{
  ["rise"] = "江山如故·兴",
  ["js2"] = "江山",
}

General:new(extension, "js__simazhao", "wei", 4):addSkills { "qiantun", "xiezheng", "zhaoxiong" }
Fk:loadTranslationTable{
  ["js__simazhao"] = "司马昭",
  ["#js__simazhao"] = "堕节肇业",
  ["illustrator:js__simazhao"] = "云涯",

  ["~js__simazhao"] = "曹髦小儿竟有如此肝胆……我实不甘。",
  ["!js__simazhao"] = "明日正为吉日，当举禅位之典。",
}

local simazhao2 = General:new(extension, "js2__simazhao", "jin", 4)
simazhao2:addSkills { "weisi", "xiezheng", "dangyi" }
simazhao2.hidden = true
Fk:loadTranslationTable{
  ["js2__simazhao"] = "司马昭",
  ["#js2__simazhao"] = "独祆吞天",
  ["illustrator:js2__simazhao"] = "腥鱼仔",

  ["$xiezheng_js2__simazhao1"] = "既得众将之力，何愁贼不得平？",
  ["$xiezheng_js2__simazhao2"] = "逆贼起兵作乱，诸位无心报国乎？",
  ["~js2__simazhao"] = "愿我晋祚，万世不易，国运永昌。",
  ["!js2__simazhao"] = "哈哈哈哈哈哈！万里山河，终至我司马一家！",
}

General:new(extension, "js__lukang", "wu", 4):addSkills { "js__zhuwei", "kuangjian" }
Fk:loadTranslationTable{
  ["js__lukang"] = "陆抗",
  ["#js__lukang"] = "架海金梁",
  ["illustrator:js__lukang"] = "小罗没想好",
}

General:new(extension, "malong", "jin", 4):addSkills { "fennan", "xunjim" }
Fk:loadTranslationTable{
  ["malong"] = "马隆",
  ["#malong"] = "困局诡阵",
  ["illustrator:malong"] = "荆芥",

  ["~malong"] = "惟愿长守边境，不使百姓为虏所扰。",
}

General:new(extension, "js__wangjun", "jin", 4):addSkills { "chengliu", "jianlou" }
Fk:loadTranslationTable{
  ["js__wangjun"] = "王濬",
  ["#js__wangjun"] = "顺流长驱",
  ["illustrator:js__wangjun"] = "荆芥",
}

General:new(extension, "limi", "shu", 3):addSkills { "ciying", "chendu" }
Fk:loadTranslationTable{
  ["limi"] = "李密",
  ["#limi"] = "情切哺乌",
  ["illustrator:limi"] = "小罗没想好",
}

General:new(extension, "simaliang", "jin", 3, 4):addSkills { "shejus", "zuwang" }
Fk:loadTranslationTable{
  ["simaliang"] = "司马亮",
  ["#simaliang"] = "冲粹的蒲牢",
  ["illustrator:simaliang"] = "小罗没想好",
}

General:new(extension, "js__wenyang", "wei", 4):addSkills { "fuzhen" }
Fk:loadTranslationTable{
  ["js__wenyang"] = "文鸯",
  ["#js__wenyang"] = "貔貅若拒",
  ["illustrator:js__wenyang"] = "town",
}

General:new(extension, "jiananfeng", "jin", 3, 3, General.Female):addSkills { "shanzheng", "xiongbao", "liedu" }
Fk:loadTranslationTable{
  ["jiananfeng"] = "贾南风",
  ["#jiananfeng"] = "凤啸峻旹",
  ["illustrator:jiananfeng"] = "小罗没想好",

  ["~jiananfeng"] = "只恨未早下杀手，致有今日险境。",
}

General:new(extension, "tufashujineng", "qun", 4):addSkills { "qinrao", "furan" }
Fk:loadTranslationTable{
  ["tufashujineng"] = "秃发树机能",
  ["#tufashujineng"] = "朔西扰攘",
  ["illustrator:tufashujineng"] = "荆芥",
}

General:new(extension, "js__dengai", "wei", 4):addSkills { "piqi", "zhoulind" }
Fk:loadTranslationTable{
  ["js__dengai"] = "邓艾",
  ["#js__dengai"] = "策袭鼎迁",
  ["illustrator:js__dengai"] = "小罗没想好",
}

General:new(extension, "js__zhugedan", "wei", 4):addSkills { "zuozhan", "cuibing", "langan" }
Fk:loadTranslationTable{
  ["js__zhugedan"] = "诸葛诞",
  ["#js__zhugedan"] = "护国孤獒",
  ["illustrator:js__zhugedan"] = "特特肉",
}

return extension
