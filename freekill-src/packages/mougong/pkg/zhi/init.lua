local extension = Package:new("mou_zhi")
extension.extensionName = "mougong"

extension:loadSkillSkelsByPath("./packages/mougong/pkg/zhi/skills")

Fk:loadTranslationTable{
  ["mou_zhi"] = "谋攻篇-知包",
}

General:new(extension, "mou__daqiao", "wu", 3, 3, General.Female):addSkills { "mou__guose", "mou__liuli" }
Fk:loadTranslationTable{
  ["mou__daqiao"] = "谋大乔",
  ["#mou__daqiao"] = "矜持之花",
	["illustrator:mou__daqiao"] = "鬼画府",

  ["~mou__daqiao"] = "此心无可依，惟有泣别离……",
}

General:new(extension, "mou__caocao", "wei", 4):addSkills { "mou__jianxiong", "mou__qingzheng", "mou__hujia" }
Fk:loadTranslationTable{
  ["mou__caocao"] = "谋曹操",
  ["#mou__caocao"] = "魏武大帝",
	["illustrator:mou__caocao"] = "鬼画府",

  ["~mou__caocao"] = "狐死归首丘，故乡安可忘……",
}

General:new(extension, "mou__sunquan", "wu", 4):addSkills { "mou__zhiheng", "mou__tongye", "mou__jiuyuan" }
Fk:loadTranslationTable{
  ["mou__sunquan"] = "谋孙权",
  ["#mou__sunquan"] = "江东大帝",
	["illustrator:mou__sunquan"] = "鬼画府",

  ["~mou__sunquan"] = "风急举发，命不久矣……",
}

General:new(extension, "mou__zhouyu", "wu", 3):addSkills { "mou__yingzi", "mou__fanjian" }
Fk:loadTranslationTable{
  ["mou__zhouyu"] = "谋周瑜",
  ["#mou__zhouyu"] = "江淮之杰",
	["illustrator:mou__zhouyu"] = "鬼画府",

  ["~mou__zhouyu"] = "瑜虽不惧曹军，但惧白驹过隙……",
}

General:new(extension, "mou__zhenji", "wei", 3, 3, General.Female):addSkills { "mou__luoshen", "qingguo" }
Fk:loadTranslationTable{
  ["mou__zhenji"] = "谋甄姬",
  ["#mou__zhenji"] = "薄幸幽兰",
	["illustrator:mou__zhenji"] = "匠人绘",

  ["$qingguo_mou__zhenji1"] = "凌波荡兮微步，香罗袜兮生尘。",
  ["$qingguo_mou__zhenji2"] = "辛夷展兮修裙，紫藤舒兮绣裳。",

  ["~mou__zhenji"] = "秀目回兮难得，徒逍遥兮莫离……",
}

General:new(extension, "mou__liubei", "shu", 4):addSkills { "mou__rende", "mou__zhangwu", "mou__jijiang" }
Fk:loadTranslationTable{
  ["mou__liubei"] = "谋刘备",
  ["#mou__liubei"] = "雄才盖世",
	["illustrator:mou__liubei"] = "君桓文化",

  ["~mou__liubei"] = "汉室之兴，皆仰望丞相了……",
}

General:new(extension, "mou__wolong", "shu", 3):addSkills { "mou__huoji", "mou__kanpo" }
Fk:loadTranslationTable{
  ["mou__wolong"] = "谋卧龙诸葛亮",
  ["#mou__wolong"] = "忠武侯",
	["illustrator:mou__wolong"] = "鬼画府",

  ["~mou__wolong"] = "纵具地利，不得天时亦难胜也……",
}

local mouZhugeliang = General:new(extension, "mou__zhugeliang", "shu", 3)
mouZhugeliang.hidden = true
mouZhugeliang:addSkills { "mou__guanxing", "mou__kongcheng" }
Fk:loadTranslationTable{
  ["mou__zhugeliang"] = "谋诸葛亮",
  ["illustrator:mou__zhugeliang"] = "MUMU",

  ["~mou__zhugeliang"] = "琴焚身陨，功败垂成啊……",
}

General:new(extension, "mou__xunyu", "wei", 3):addSkills { "mou__quhu", "mou__jieming" }
Fk:loadTranslationTable{
  ["mou__xunyu"] = "谋荀彧",
  ["#mou__xunyu"] = "王佐之才",
	["illustrator:mou__xunyu"] = "君桓文化",

  ["~mou__xunyu"] = "北风化王境，空萦荀令香……",
}

General:new(extension, "mou__zhangjiao", "qun", 3):addSkills { "mou__leiji", "mou__guidao", "mou__huangtian" }
Fk:loadTranslationTable{
  ["mou__zhangjiao"] = "谋张角",
  ["#mou__zhangjiao"] = "驱雷掣电",
	["illustrator:mou__zhangjiao"] = "西国红云",

  ["~mou__zhangjiao"] = "只叹未能覆汉，徒失天时……",
}

General:new(extension, "mou__liubiao", "qun", 3):addSkills { "mou__zishou", "mou__zongshi" }
Fk:loadTranslationTable{
  ["mou__liubiao"] = "谋刘表",
  ["#mou__liubiao"] = "跨蹈汉南",

  ["~mou__liubiao"] = "我死之后，只望荆州仍然安定。",
}

General:new(extension, "mou__jiaxu", "qun", 3):addSkills { "mou__wansha", "mou__weimu", "mou__luanwu" }
Fk:loadTranslationTable{
  ["mou__jiaxu"] = "谋贾诩",
  ["#mou__jiaxu"] = "计深似海",
  ["illustrator:mou__jiaxu"] = "凝聚永恒",

  ["~mou__jiaxu"] = "踽踽黄泉，与吾行事又有何异？",
}

return extension
