local extension = Package:new("yj2016")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/yj2016/skills")

Fk:loadTranslationTable{
  ["yj2016"] = "原创之魂2016",
}

General:new(extension, "guohuanghou", "wei", 3, 3, General.Female):addSkills { "jiaozhao", "danxin" }
Fk:loadTranslationTable{
  ["guohuanghou"] = "郭皇后",
  ["#guohuanghou"] = "月华驱霾",
  ["designer:guohuanghou"] = "杰米Y",
  ["illustrator:guohuanghou"] = "樱花闪乱",

  ["~guohuanghou"] = "陛下，臣妾这就来见你。",
}

General:new(extension, "sunziliufang", "wei", 3):addSkills { "guizao", "jiyu" }
Fk:loadTranslationTable{
  ["sunziliufang"] = "孙资刘放",
  ["#sunziliufang"] = "服谗搜慝",
  ["designer:sunziliufang"] = "Rivers",
  ["illustrator:sunziliufang"] = "sinno",

  ["~sunziliufang"] = "唉，树倒猢狲散，鼓破众人捶呀。",
}

General:new(extension, "liyans", "shu", 3):addSkills { "duliang", "fulin" }
Fk:loadTranslationTable{
  ["liyans"] = "李严",
  ["#liyans"] = "矜风流务",
  ["designer:liyans"] = "RP集散中心",
  ["illustrator:liyans"] = "米SIR",

  ["~liyans"] = "孔明这一走，我算是没指望了。",
}

General:new(extension, "huanghao", "shu", 3):addSkills { "qinqing", "huisheng" }
Fk:loadTranslationTable{
  ["huanghao"] = "黄皓",
  ["#huanghao"] = "便辟佞慧",
  ["designer:huanghao"] = "凌天翼",
  ["illustrator:huanghao"] = "2B铅笔",

  ["~huanghao"] = "魏军竟然真杀来了！",
}

General:new(extension, "sundeng", "wu", 4):addSkills { "kuangbi" }
Fk:loadTranslationTable{
  ["sundeng"] = "孙登",
  ["#sundeng"] = "才高德茂",
  ["designer:sundeng"] = "过客",
  ["illustrator:sundeng"] = "DH",

  ["~sundeng"] = "愿陛下留意听采，儿臣虽死犹生。",
}

General:new(extension, "cenhun", "wu", 3):addSkills { "jishe", "lianhuo" }
Fk:loadTranslationTable{
  ["cenhun"] = "岑昏",
  ["#cenhun"] = "伐梁倾瓴",
  ["designer:cenhun"] = "韩旭",
  ["illustrator:cenhun"] = "心中一凛",

  ["~cenhun"] = "我为主上出过力！呃啊！",
}

General:new(extension, "liuyu", "qun", 2):addSkills { "zhige", "zongzuo" }
Fk:loadTranslationTable{
  ["liuyu"] = "刘虞",
  ["#liuyu"] = "甘棠永固",
  ["designer:liuyu"] = "冰眼",
  ["illustrator:liuyu"] = "尼乐小丑",

  ["~liuyu"] = "怀柔之计，终非良策。",
}

General:new(extension, "zhangrang", "qun", 3):addSkills { "taoluan" }
Fk:loadTranslationTable{
  ["zhangrang"] = "张让",
  ["#zhangrang"] = "窃幸绝禋",
  ["designer:zhangrang"] = "千幻",
  ["illustrator:zhangrang"] = "蚂蚁君",

  ["~zhangrang"] = "臣等殄灭，唯陛下自爱……（跳水声）",
}

return extension
