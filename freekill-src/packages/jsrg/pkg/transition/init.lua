local extension = Package:new("transition")
extension.extensionName = "jsrg"

extension:loadSkillSkelsByPath("./packages/jsrg/pkg/transition/skills")

Fk:loadTranslationTable{
  ["transition"] = "江山如故·转",
}

local guojia = General:new(extension, "js__guojia", "wei", 3)
guojia:addSkills { "qingzi", "dingce", "zhenfeng" }
guojia:addRelatedSkill("ol_ex__shensu")
Fk:loadTranslationTable{
  ["js__guojia"] = "郭嘉",
  ["#js__guojia"] = "赤壁的先知",
  ["illustrator:js__guojia"] = "KayaK&DEEMO",
}

General:new(extension, "js__zhangfei", "shu", 5):addSkills { "baohe", "xushiz" }
Fk:loadTranslationTable{
  ["js__zhangfei"] = "张飞",
  ["#js__zhangfei"] = "长坂之威",
  ["illustrator:js__zhangfei"] = "鬼画府",
}

General:new(extension, "js__machao", "qun", 4):addSkills { "zhuiming", "mashu" }
Fk:loadTranslationTable{
  ["js__machao"] = "马超",
  ["#js__machao"] = "潼关之勇",
  ["illustrator:js__machao"] = "鬼画府",
}

General:new(extension, "lougui", "wei", 3):addSkills { "shacheng", "ninghan" }
Fk:loadTranslationTable{
  ["lougui"] = "娄圭",
  ["#lougui"] = "梦梅居士",
  ["illustrator:lougui"] = "鬼画府",
}

General:new(extension, "js__zhangren", "qun", 4):addSkills { "funi", "js__chuanxin" }
Fk:loadTranslationTable{
  ["js__zhangren"] = "张任",
  ["#js__zhangren"] = "索命神射",
  ["illustrator:js__zhangren"] = "鬼画府",
}

General:new(extension, "js__huangzhong", "shu", 4):addSkills { "cuifeng", "dengnan" }
Fk:loadTranslationTable{
  ["js__huangzhong"] = "黄忠",
  ["#js__huangzhong"] = "定军之英",
  ["illustrator:js__huangzhong"] = "鬼画府",
}

General:new(extension, "xiahourong", "wei", 4):addSkills { "fenjian" }
Fk:loadTranslationTable{
  ["xiahourong"] = "夏侯荣",
  ["#xiahourong"] = "擐甲执兵",
  ["illustrator:xiahourong"] = "鬼画府",
}

General:new(extension, "js__sunshangxiang", "wu", 3, 3, General.Female):addSkills { "guiji", "jiaohao" }
Fk:loadTranslationTable{
  ["js__sunshangxiang"] = "孙尚香",
  ["#js__sunshangxiang"] = "情断吴江",
  ["cv:js__sunshangxiang"] = "山风",
  ["illustrator:js__sunshangxiang"] = "鬼画府",

  ["~js__sunshangxiang"] = "手裁蜀锦君肩上，情断吴江帆影中……",
}

General:new(extension, "js__pangtong", "qun", 3):addSkills { "js__manjuan", "yangming" }
Fk:loadTranslationTable{
  ["js__pangtong"] = "庞统",
  ["#js__pangtong"] = "荊楚之高俊",
  ["illustrator:js__pangtong"] = "鬼画府",
}

General:new(extension, "js__hansui", "qun", 4):addSkills { "js__niluan", "huchou", "jiemeng" }
Fk:loadTranslationTable{
  ["js__hansui"] = "韩遂",
  ["#js__hansui"] = "雄踞北疆",
  ["illustrator:js__hansui"] = "鱼仔",
}

General:new(extension, "js__zhangchu", "qun", 3, 3, General.Female):addSkills { "huozhong", "js__rihui" }
Fk:loadTranslationTable{
  ["js__zhangchu"] = "张楚",
  ["#js__zhangchu"] = "大贤后裔",
  ["illustrator:js__zhangchu"] = "花弟",
}

General:new(extension, "js__xiahouen", "wei", 4):addSkills { "hujian", "shili" }
Fk:loadTranslationTable{
  ["js__xiahouen"] = "夏侯恩",
  ["#js__xiahouen"] = "背剑之将",
  ["illustrator:js__xiahouen"] = "蚂蚁君",
}

General:new(extension, "js__fanjiangzhangda", "wu", 5):addSkills { "fushan" }
Fk:loadTranslationTable{
  ["js__fanjiangzhangda"] = "范疆张达",
  ["#js__fanjiangzhangda"] = "你死我亡",
  ["illustrator:js__fanjiangzhangda"] = "alien",
}

return extension
