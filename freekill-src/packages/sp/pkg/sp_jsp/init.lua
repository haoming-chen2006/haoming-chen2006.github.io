local extension = Package:new("sp_jsp")
extension.extensionName = "sp"

extension:loadSkillSkelsByPath("./packages/sp/pkg/sp_jsp/skills")

Fk:loadTranslationTable{
  ["sp_jsp"] = "JSP",
  ["jsp"] = "JSP",
}

local sunshangxiang = General:new(extension, "jsp__sunshangxiang", "shu", 3, 3, General.Female)
sunshangxiang:addSkills { "liangzhu", "fanxiang" }
sunshangxiang:addRelatedSkill("xiaoji")
Fk:loadTranslationTable{
  ["jsp__sunshangxiang"] = "孙尚香",
  ["#jsp__sunshangxiang"] = "梦醉良缘",
  ["illustrator:jsp__sunshangxiang"] = "木美人",
  ["designer:jsp__sunshangxiang"] = "韩旭",

  ["$xiaoji_jsp__sunshangxiang1"] = "弓马何须忌红妆？",
  ["$xiaoji_jsp__sunshangxiang2"] = "双剑夸巧，不让须眉！",
  ["~jsp__sunshangxiang"] = "东途难归，初心难追。",
}

General:new(extension, "jsp__machao", "qun", 4):addSkills { "zhuiji", "cihuai" }
Fk:loadTranslationTable{
  ["jsp__machao"] = "马超",
  ["#jsp__machao"] = "西凉的猛狮",
  ["illustrator:jsp__machao"] = "depp",
  ["designer:jsp__machao"] = "伴剑一生",
}

local guanyu = General:new(extension, "jsp__guanyu", "wei", 4)
guanyu:addSkills { "danji", "wusheng" }
guanyu:addRelatedSkill("nuzhan")
Fk:loadTranslationTable{
  ["jsp__guanyu"] = "关羽",
  ["#jsp__guanyu"] = "汉寿亭侯",
  ["illustrator:jsp__guanyu"] = "Zero",

  ["$wusheng_jsp__guanyu1"] = "以义传魂，以武入圣！",
  ["$wusheng_jsp__guanyu2"] = "义击逆流，武安黎庶！",
  ["~jsp__guanyu"] = "樊城一去，死亦无惧！",
}

local jiangwei = General:new(extension, "jsp__jiangwei", "wei", 4)
jiangwei:addSkills { "kunfen", "fengliang" }
jiangwei:addRelatedSkill("tiaoxin")
Fk:loadTranslationTable{
  ["jsp__jiangwei"] = "姜维",
  ["#jsp__jiangwei"] = "幼麒",
  ["illustrator:jsp__jiangwei"] = "depp",
  ["cv:jsp__jiangwei"] = "绯川陵彦",
  ["designer:jsp__jiangwei"] = "梦三",

  ["$tiaoxin_jsp__jiangwei1"] = "今日天公作美，怎能不战而退？",
  ["$tiaoxin_jsp__jiangwei2"] = "贼将无胆，何不早降！",
  ["~jsp__jiangwei"] = "伯约已尽力而为，奈何大汉，国运衰微……",
}

General:new(extension, "jsp__zhaoyun", "qun", 3):addSkills { "yicong", "chixin", "suiren" }
Fk:loadTranslationTable{
  ["jsp__zhaoyun"] = "赵云",
  ["#jsp__zhaoyun"] = "常山的游龙",
  ["illustrator:jsp__zhaoyun"] = "天空之城",
}

local huangyueying = General:new(extension, "jsp__huangyueying", "qun", 3, 3, General.Female)
huangyueying:addSkills { "jiqiao", "linglong" }
huangyueying:addRelatedSkill("qicai")
Fk:loadTranslationTable{
  ["jsp__huangyueying"] = "黄月英",
  ["#jsp__huangyueying"] = "闺中璞玉",
  ["designer:jsp__huangyueying"] = "韩旭",
  ["illustrator:jsp__huangyueying"] = "木美人",

  ["~jsp__huangyueying"] = "只恨不能再助夫君了……",
}

return extension
