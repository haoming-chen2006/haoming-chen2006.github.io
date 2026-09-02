local extension = Package:new("conclusion")
extension.extensionName = "jsrg"

extension:loadSkillSkelsByPath("./packages/jsrg/pkg/conclusion/skills")

Fk:loadTranslationTable{
  ["conclusion"] = "江山如故·合",
}

General:new(extension, "js__zhugeliang", "shu", 3):addSkills { "wentian", "chushi", "yinlue" }
Fk:loadTranslationTable{
  ["js__zhugeliang"] = "诸葛亮",
  ["#js__zhugeliang"] = "炎汉忠魂",
  ["illustrator:js__zhugeliang"] = "鬼画府",
}

General:new(extension, "js__jiangwei", "shu", 4):addSkills { "js__jinfa", "js__fumou", "xuanfengj" }
Fk:loadTranslationTable{
  ["js__jiangwei"] = "姜维",
  ["#js__jiangwei"] = "赤血化龙",
  ["illustrator:js__jiangwei"] = "鬼画府",
}

General:new(extension, "js__simayi", "wei", 4):addSkills { "js__yingshi", "tuigu" }
Fk:loadTranslationTable{
  ["js__simayi"] = "司马懿",
  ["#js__simayi"] = "危崖隐羽",
  ["cv:js__simayi"] = "寂镜",
  ["illustrator:js__simayi"] = "鬼画府",

  ["~js__simayi"] = "天下汹汹，我当何去何从……",
}

General:new(extension, "js__caofang", "wei", 3, 4):addSkills { "zhaotu", "jingju", "weizhui" }
Fk:loadTranslationTable{
  ["js__caofang"] = "曹芳",
  ["#js__caofang"] = "引狼入廟",
  ["cv:js__caofang"] = "甄弦",
  ["illustrator:js__caofang"] = "鬼画府",

  ["~js__caofang"] = "报应不爽，司马家亦有今日。",
}

General:new(extension, "sunjun", "wu", 4):addSkills { "yaoyan", "bazheng" }
Fk:loadTranslationTable{
  ["sunjun"] = "孙峻",
  ["#sunjun"] = "朋党执虎",
  ["illustrator:sunjun"] = "鬼画府",
}

General:new(extension, "js__luxun", "wu", 3):addSkills { "js__youjin", "js__dailao", "js__zhubei" }
Fk:loadTranslationTable{
  ["js__luxun"] = "陆逊",
  ["#js__luxun"] = "却敌安疆",
  ["illustrator:js__luxun"] = "鬼画府",
}

General:new(extension, "js__guoxiu", "wei", 4):addSkills { "eqian", "fusha" }
Fk:loadTranslationTable{
  ["js__guoxiu"] = "郭循",
  ["#js__guoxiu"] = "秉心不回",
  ["illustrator:js__guoxiu"] = "鬼画府",
}

General:new(extension, "sunlubansunluyu", "wu", 3, 3, General.Female):addSkills { "daimou", "fangjie" }
Fk:loadTranslationTable{
  ["sunlubansunluyu"] = "孙鲁班孙鲁育",
  ["#sunlubansunluyu"] = "恶紫夺朱",
  ["illustrator:sunlubansunluyu"] = "鬼画府",
}

General:new(extension, "js__zhaoyun", "shu", 4):addSkills { "longlin", "zhendan" }
Fk:loadTranslationTable{
  ["js__zhaoyun"] = "赵云",
  ["#js__zhaoyun"] = "北伐之柱",
  ["illustrator:js__zhaoyun"] = "鬼画府",

  ["~js__zhaoyun"] = "北伐！北伐…北伐……",
}

General:new(extension, "js__liuyong", "shu", 3):addSkills { "danxinl", "js__fengxiang" }
Fk:loadTranslationTable{
  ["js__liuyong"] = "刘永",
  ["#js__liuyong"] = "甘陵王",
  ["designer:js__liuyong"] = "山巅隐士",
  ["illustrator:js__liuyong"] = "君桓文化",

  ["~js__liuyong"] = "刘公嗣！你睁开眼看看这八百里蜀川吧！",
}

General:new(extension, "js_re__liuyong", "shu", 3):addSkills { "re__danxinl", "re__fengxiang" }
Fk:loadTranslationTable{
  ["js_re__liuyong"] = "刘永",
  ["#js_re__liuyong"] = "甘陵王",
  ["illustrator:js_re__liuyong"] = "凡果_PALE HOWL",

  ["~js_re__liuyong"] = "无长缨在手，徒拔剑四顾。",
}

General:new(extension, "js__gaoxiang", "shu", 4):addSkills { "js__chiying" }
Fk:loadTranslationTable{
  ["js__gaoxiang"] = "高翔",
  ["#js__gaoxiang"] = "玄乡侯",
  ["illustrator:js__gaoxiang"] = "大果",

  ["~js__gaoxiang"] = "将者无功，何颜顾后。",
}

General:new(extension, "js__weiwenzhugezhi", "wu", 4):addSkills { "js__fuhaiw" }
Fk:loadTranslationTable{
  ["js__weiwenzhugezhi"] = "卫温诸葛直",
  ["#js__weiwenzhugezhi"] = "帆至夷洲",
  ["illustrator:js__weiwenzhugezhi"] = "猎枭",
}

General:new(extension, "js__zhangxuan", "wu", 4, 4, General.Female):addSkills { "js__tongli", "js__shezang" }
Fk:loadTranslationTable{
  ["js__zhangxuan"] = "张嫙",
  ["#js__zhangxuan"] = "玉宇嫁蔷",
  ["illustrator:js__zhangxuan"] = "匠人绘",

  ["~js__zhangxuan"] = "魂归九泉，繁华不再。",
}

General:new(extension, "js__guozhao", "wei", 3, 3, General.Female):addSkills { "js__pianchong", "js__zunwei" }
Fk:loadTranslationTable{
  ["js__guozhao"] = "郭照",
  ["#js__guozhao"] = "碧海青天",
  ["illustrator:js__guozhao"] = "君桓文化",

  ["~js__guozhao"] = "曹元仲，你为何害我？",
}

General:new(extension, "js_re__guozhao", "wei", 3, 3, General.Female):addSkills { "re__pianchong", "js__zunwei" }
Fk:loadTranslationTable{
  ["js_re__guozhao"] = "郭照",
  ["#js_re__guozhao"] = "碧海青天",
  ["illustrator:js_re__guozhao"] = "凡果_喵叽",

  ["$js__zunwei_js_re__guozhao1"] = "皇后位尊，当居后宫之极。",
  ["$js__zunwei_js_re__guozhao2"] = "位尊着霞帔，名重戴凤冠。",
  ["~js_re__guozhao"] = "君恩易逝难再复……",
}

return extension
