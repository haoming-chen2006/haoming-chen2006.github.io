local extension = Package:new("mou_shi")
extension.extensionName = "mougong"

extension:loadSkillSkelsByPath("./packages/mougong/pkg/shi/skills")

Fk:loadTranslationTable{
  ["mou_shi"] = "谋攻篇-识包",
}

General:new(extension, "mou__machao", "shu", 4):addSkills { "mashu", "mou__tieji" }
Fk:loadTranslationTable{
  ["mou__machao"] = "谋马超",
  ["#mou__machao"] = "阻戎负勇",
  ["illustrator:mou__machao"] = "聚一工作室",

  ["~mou__machao"] = "父兄妻儿具丧，吾有何面目活于世间……",
}

General:new(extension, "mou__fazheng", "shu", 3):addSkills { "mou__xuanhuo", "mou__enyuan" }
Fk:loadTranslationTable{
  ["mou__fazheng"] = "谋法正",
  ["#mou__fazheng"] = "经学思谋",
  ["illustrator:mou__fazheng"] = "凝聚永恒",

  ["~mou__fazheng"] = "蜀翼双折，吾主王业，就靠孔明了……",
}

General:new(extension, "mou__diaochan", "qun", 3, 3, General.Female):addSkills { "mou__lijian", "mou__biyue" }
Fk:loadTranslationTable{
  ["mou__diaochan"] = "谋貂蝉",
  ["#mou__diaochan"] = "绝世的舞姬",
  ["illustrator:mou__diaochan"] = "匠人绘",

  ["~mou__diaochan"] = "终不负阿父之托……",
}

General:new(extension, "mou__chengong", "qun", 3):addSkills { "mou__mingce", "mou__zhichi" }
Fk:loadTranslationTable{
  ["mou__chengong"] = "谋陈宫",
  ["#mou__chengong"] = "刚直壮烈",
  ["illustrator:mou__chengong"] = "铁杵",

  ["~mou__chengong"] = "何必多言！宫唯求一死……",
}

General:new(extension, "mou__pangtong", "shu", 3):addSkills { "mou__lianhuan", "mou__niepan" }
Fk:loadTranslationTable{
  ["mou__pangtong"] = "谋庞统",
  ["#mou__pangtong"] = "铁索连舟",
	["illustrator:mou__pangtong"] = "铁杵",

  ["~mou__pangtong"] = "落凤坡，果真为我葬身之地……",
}

General:new(extension, "mou__xuhuang", "wei", 4):addSkills { "mou__duanliang", "mou__shipo" }
Fk:loadTranslationTable{
  ["mou__xuhuang"] = "谋徐晃",
  ["#mou__xuhuang"] = "径行截辎",
	["illustrator:mou__xuhuang"] = "颜柏",

  ["~mou__xuhuang"] = "为主效劳，何畏生死……",
}

General:new(extension, "mou__zhanghe", "wei", 4):addSkills { "mou__qiaobian", "mou__liaoshi" }
Fk:loadTranslationTable{
  ["mou__zhanghe"] = "谋张郃",
  ["#mou__zhanghe"] = "变数尽展",
	["illustrator:mou__zhanghe"] = "匠人绘",

  ["~mou__zhanghe"] = "未料竟中孔明之计……",
}

General:new(extension, "mou__ganning", "wu", 4):addSkills { "mou__qixi", "mou__fenwei" }
Fk:loadTranslationTable{
  ["mou__ganning"] = "谋甘宁",
  ["#mou__ganning"] = "兴王定霸",
	["illustrator:mou__ganning"] = "君桓文化",

  ["~mou__ganning"] = "蛮将休得猖狂！呃啊！",
}

General:new(extension, "mou__caopi", "wei", 3):addSkills { "mou__xingshang", "mou__fangzhu", "mou__songwei" }
Fk:loadTranslationTable{
  ["mou__caopi"] = "谋曹丕",
  ["#mou__caopi"] = "魏文帝",
  ["illustrator:mou__caopi"] = "铁杵",

  ["~mou__caopi"] = "大魏如何踏破吴蜀，就全看叡儿了……",
}

General:new(extension, "mou__handang", "wu", 4):addSkills { "mou__gongqi", "mou__jiefan" }
Fk:loadTranslationTable{
  ["mou__handang"] = "谋韩当",
  ["#mou__handang"] = "石城侯",
  ["illustrator:mou__handang"] = "铁杵",

  ["~mou__handang"] = "吾子难堪大用，主公勿以重任相托……",
}

General:new(extension, "mou__guojia", "wei", 3):addSkills { "mou__tiandu", "mou__yiji" }
Fk:loadTranslationTable{
  ["mou__guojia"] = "谋郭嘉",
  ["#mou__guojia"] = "奉己佐君",
  ["illustrator:mou__guojia"] = "铁杵",

  ["~mou__guojia"] = "蒙天所召，嘉先去矣，咳咳咳……",
}

return extension
