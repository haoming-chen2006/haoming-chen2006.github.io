local extension = Package:new("thunder")
extension.extensionName = "shzl"

extension:loadSkillSkelsByPath("./packages/shzl/pkg/thunder/skills")

Fk:loadTranslationTable{
  ["thunder"] = "神话再临·雷",
}

General:new(extension, "haozhao", "wei", 4):addSkills { "zhengu" }
Fk:loadTranslationTable{
  ["haozhao"] = "郝昭",
  ["#haozhao"] = "扣弦的豪将",
  ["cv:haozhao"] = "王宇航",
  ["illustrator:haozhao"] = "秋呆呆",

  ["~haozhao"] = "镇守陈仓，也有一失。",
}

General:new(extension, "guanqiujian", "wei", 4):addSkills { "zhengrong", "hongju" }
Fk:loadTranslationTable{
  ["guanqiujian"] = "毌丘俭",
  ["#guanqiujian"] = "镌功铭征荣",
  ["illustrator:guanqiujian"] = "凝聚永恒",

  ["~guanqiujian"] = "峥嵘一生，然被平民所击射！",
}

General:new(extension, "chendao", "shu", 4):addSkills { "wangliec" }
Fk:loadTranslationTable{
  ["chendao"] = "陈到",
  ["#chendao"] = "白毦督",
  ["cv:chendao"] = "漠桀",
  ["illustrator:chendao"] = "王立雄",

  ["~chendao"] = "我的白毦兵，再也不能为先帝出力了。",
}

General:new(extension, "nos__zhugezhan", "shu", 3):addSkills { "nos__zuilun", "nos__fuyin" }
Fk:loadTranslationTable{
  ["nos__zhugezhan"] = "诸葛瞻",
  ["#nos__zhugezhan"] = "临难死义",
  ["illustrator:nos__zhugezhan"] = "君桓文化",

  ["~nos__zhugezhan"] = "名过其实，当有此败。",
}

General:new(extension, "zhugezhan", "shu", 3):addSkills { "zuilun", "fuyin" }
Fk:loadTranslationTable{
  ["zhugezhan"] = "诸葛瞻",
  ["#zhugezhan"] = "临难死义",
  ["cv:zhugezhan"] = "漠桀",
  ["illustrator:zhugezhan"] = "zoo",

  ["~zhugezhan"] = "临难而死义，无愧先父。",
}

General:new(extension, "zhoufei", "wu", 3, 3, General.Female):addSkills { "liangyin", "kongsheng" }
Fk:loadTranslationTable{
  ["zhoufei"] = "周妃",
  ["#zhoufei"] = "软玉温香",
  ["illustrator:zhoufei"] = "眉毛子",

  ["~zhoufei"] = "夫君，妾身再也不能陪你看这江南翠绿了。",
}

General:new(extension, "lukang", "wu", 4):addSkills { "qianjie", "jueyan", "poshi" }
Fk:loadTranslationTable{
  ["lukang"] = "陆抗",
  ["#lukang"] = "社稷之瑰宝",
  ["illustrator:lukang"] = "zoo",

  ["$ex__jizhi_lukang"] = "智父安能有愚子乎？",
  ["~lukang"] = "吾即亡矣，吴又能存几时？",
}

General:new(extension, "thunder__yuanshu", "qun", 4):addSkills { "thunder__yongsi", "thunder__weidi" }
Fk:loadTranslationTable{
  ["thunder__yuanshu"] = "袁术",
  ["#thunder__yuanshu"] = "仲家帝",
  ["illustrator:thunder__yuanshu"] = "波子",

  ["~thunder__yuanshu"] = "仲朝国祚，本应千秋万代，薪传不息……",
}

General:new(extension, "zhangxiu", "qun", 4):addSkills { "xiongluan", "congjian" }
Fk:loadTranslationTable{
  ["zhangxiu"] = "张绣",
  ["#zhangxiu"] = "北地枪王",
  ["cv:zhangxiu"] = "Aaron", -- 秦宇
  ["illustrator:zhangxiu"] = "PCC",

  ["~zhangxiu"] = "若失文和……吾将何归……",
}

return extension
