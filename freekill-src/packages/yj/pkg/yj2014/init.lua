local extension = Package:new("yj2014")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/yj2014/skills")

Fk:loadTranslationTable{
  ["yj2014"] = "一将成名2014",
}

General:new(extension, "caozhen", "wei", 4):addSkills { "sidi" }
Fk:loadTranslationTable{
  ["caozhen"] = "曹真",
  ["#caozhen"] = "荷国天督",
  ["designer:caozhen"] = "世外高v狼",
  ["illustrator:caozhen"] = "Thinking",

  ["~caozhen"] = "秋雨凄迷，军心已乱……",
}

General:new(extension, "chenqun", "wei", 3):addSkills { "pindi", "faen" }
Fk:loadTranslationTable{
  ["chenqun"] = "陈群",
  ["#chenqun"] = "万世臣表",
  ["illustrator:chenqun"] = "NOVART",

  ["~chenqun"] = "三朝如一日，弹指一挥间……",
}

General:new(extension, "nos__chenqun", "wei", 3):addSkills { "dingpin", "nos__faen" }
Fk:loadTranslationTable{
  ["nos__chenqun"] = "陈群",
  ["#nos__chenqun"] = "万世臣表",
  ["designer:nos__chenqun"] = "Michael_Lee",
  ["illustrator:nos__chenqun"] = "DH",

  ["~nos__chenqun"] = "吾身虽陨，典律昭昭。",
}

General:new(extension, "hanhaoshihuan", "wei", 4):addSkills { "shenduan", "yonglue" }
Fk:loadTranslationTable{
  ["hanhaoshihuan"] = "韩浩史涣",
  ["#hanhaoshihuan"] = "中军之主",
  ["designer:hanhaoshihuan"] = "浪人兵法家",
  ["illustrator:hanhaoshihuan"] = "lylylyang",

  ["~hanhaoshihuan"] = "那拈弓搭箭的将军，是何人？",
}

General:new(extension, "zhoucang", "shu", 4):addSkills { "zhongyong" }
Fk:loadTranslationTable{
  ["zhoucang"] = "周仓",
  ["#zhoucang"] = "披肝沥胆",
  ["designer:zhoucang"] = "WOLVES29",
  ["illustrator:zhoucang"] = "ocsky",

  ["~zhoucang"] = "为将军操刀牵马，此生无憾。",
}

General:new(extension, "wuyi", "shu", 4):addSkills { "benxi" }
Fk:loadTranslationTable{
  ["wuyi"] = "吴懿",
  ["#wuyi"] = "建兴鞍辔",
  ["designer:wuyi"] = "沸治克里夫",
  ["illustrator:wuyi"] = "蚂蚁君",

  ["~wuyi"] = "奔波已疲，难以，再战。",
}

General:new(extension, "zhangsong", "shu", 3):addSkills { "qiangzhi", "xiantu" }
Fk:loadTranslationTable{
  ["zhangsong"] = "张松",
  ["#zhangsong"] = "怀璧待凤仪",
  ["designer:zhangsong"] = "冷王无双",
  ["illustrator:zhangsong"] = "尼乐小丑",

  ["~zhangsong"] = "皇叔不听吾谏言，悔时晚矣！",
}

General:new(extension, "guyong", "wu", 3):addSkills { "shenxing", "bingyi" }
Fk:loadTranslationTable{
  ["guyong"] = "顾雍",
  ["#guyong"] = "庙堂的玉磐",
  ["designer:guyong"] = "睿笛终落",
  ["illustrator:guyong"] = "大佬荣",

  ["~guyong"] = "病躯渐重，国事难安……",
}

General:new(extension, "sunluban", "wu", 3, 3, General.Female):addSkills { "zenhui", "jiaojin" }
Fk:loadTranslationTable{
  ["sunluban"] = "孙鲁班",
  ["#sunluban"] = "为虎作伥",
  ["designer:sunluban"] = "CatCat44",
  ["illustrator:sunluban"] = "FOOLTOWN",

  ["~sunluban"] = "本公主，何罪之有？",
}

General:new(extension, "nos__zhuhuan", "wu", 4):addSkills { "youdi" }
Fk:loadTranslationTable{
  ["nos__zhuhuan"] = "朱桓",
  ["#nos__zhuhuan"] = "中洲拒天人",
  ["designer:nos__zhuhuan"] = "半缘修道",
  ["illustrator:nos__zhuhuan"] = "XXX",

  ["~nos__zhuhuan"] = "这巍巍巨城，吾竟无力撼动。",
}

General:new(extension, "zhuhuan", "wu", 4):addSkills { "fenli", "pingkou" }
Fk:loadTranslationTable{
  ["zhuhuan"] = "朱桓",
  ["#zhuhuan"] = "中洲拒天人",
  ["illustrator:zhuhuan"] = "木碗Rae",

  ["~zhuhuan"] = "我不要死在这病榻之上……",
}

General:new(extension, "caifuren", "qun", 3, 3, General.Female):addSkills { "qieting", "xianzhou" }
Fk:loadTranslationTable{
  ["caifuren"] = "蔡夫人",
  ["#caifuren"] = "襄江的蒲苇",
  ["designer:caifuren"] = "Dream彼端",
  ["illustrator:caifuren"] = "B_LEE",

  ["~caifuren"] = "孤儿寡母，何必赶尽杀绝呢……",
}

General:new(extension, "jvshou", "qun", 3):addSkills { "jianying", "shibei" }
Fk:loadTranslationTable{
  ["jvshou"] = "沮授",
  ["#jvshou"] = "监军谋国",
  ["designer:jvshou"] = "精精神神",
  ["illustrator:jvshou"] = "酱油之神",

  ["~jvshou"] = "智士凋亡，河北哀矣……",
}

return extension
