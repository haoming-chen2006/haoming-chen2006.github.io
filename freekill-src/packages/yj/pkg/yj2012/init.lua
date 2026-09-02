local extension = Package:new("yj2012")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/yj2012/skills")

Fk:loadTranslationTable{
  ["yj2012"] = "一将成名2012",
}

General:new(extension, "xunyou", "wei", 3):addSkills { "qice", "zhiyu" }
Fk:loadTranslationTable{
  ["xunyou"] = "荀攸",
  ["#xunyou"] = "曹魏的谋主",
  ["designer:xunyou"] = "淬毒",
  ["illustrator:xunyou"] = "魔鬼鱼",

  ["~xunyou"] = "主公，臣下……先行告退……",
}

General:new(extension, "caozhang", "wei", 4):addSkills { "jiangchi" }
Fk:loadTranslationTable{
  ["caozhang"] = "曹彰",
  ["#caozhang"] = "黄须儿",
  ["designer:caozhang"] = "潜龙勿用",
  ["illustrator:caozhang"] = "Yi章",

  ["~caozhang"] = "子桓，你害我！",
}

General:new(extension, "nos__wangyi", "wei", 3, 3, General.Female):addSkills { "nos__zhenlie", "nos__miji" }
Fk:loadTranslationTable{
  ["nos__wangyi"] = "王异",
  ["#nos__wangyi"] = "决意的巾帼",
  ["designer:nos__wangyi"] = "罗森",
  ["illustrator:nos__wangyi"] = "木美人",

  ["~nos__wangyi"] = "忠义已尽，死又何妨？",
}

General:new(extension, "wangyi", "wei", 3, 3, General.Female):addSkills { "zhenlie", "miji" }
Fk:loadTranslationTable{
  ["wangyi"] = "王异",
  ["#wangyi"] = "决意的巾帼",
  ["illustrator:wangyi"] = "团扇子",

  ["~wangyi"] = "月儿，不要责怪你爹爹……",
}

General:new(extension, "nos__madai", "shu", 4):addSkills { "mashu", "nos__qianxi" }
Fk:loadTranslationTable{
  ["nos__madai"] = "马岱",
  ["#nos__madai"] = "临危受命",
  ["designer:nos__madai"] = "凌天翼",
  ["illustrator:nos__madai"] = "琛·美弟奇",

  ["~nos__madai"] = "反骨贼已除，丞相放心……",
}

General:new(extension, "madai", "shu", 4):addSkills { "mashu", "qianxi" }
Fk:loadTranslationTable{
  ["madai"] = "马岱",
  ["#madai"] = "临危受命",
  ["illustrator:madai"] = "大佬荣",

  ["~madai"] = "我怎么会死在这里……",
}

General:new(extension, "liaohua", "shu", 4):addSkills { "dangxian", "fuli" }
Fk:loadTranslationTable{
  ["liaohua"] = "廖化",
  ["#liaohua"] = "历尽沧桑",
  ["designer:liaohua"] = "桃花僧",
  ["illustrator:liaohua"] = "天空之城",

  ["~liaohua"] = "今后，就靠你们啦……",
}

local nos__guanxingzhangbao = General:new(extension, "nos__guanxingzhangbao", "shu", 4)
nos__guanxingzhangbao:addSkills { "nos__fuhun" }
nos__guanxingzhangbao:addRelatedSkills { "wusheng", "paoxiao" }
Fk:loadTranslationTable{
  ["nos__guanxingzhangbao"] = "关兴张苞",
  ["#nos__guanxingzhangbao"] = "将门虎子",
  ["designer:nos__guanxingzhangbao"] = "诺思冥羽",
  ["illustrator:nos__guanxingzhangbao"] = "HOOO",

  ["$wusheng_nos__guanxingzhangbao"] = "蜀汉重任，后继有人！",
  ["$paoxiao_nos__guanxingzhangbao"] = "哼！",
  ["~nos__guanxingzhangbao"] = "吾得父亲之遗志，未袭父亲之神勇。",
}

local guanxingzhangbao = General:new(extension, "guanxingzhangbao", "shu", 4)
guanxingzhangbao:addSkills { "fuhun" }
guanxingzhangbao:addRelatedSkills { "wusheng", "paoxiao" }
Fk:loadTranslationTable{
  ["guanxingzhangbao"] = "关兴张苞",
  ["#guanxingzhangbao"] = "将门虎子",
  ["illustrator:guanxingzhangbao"] = "HOOO",

  ["$wusheng_guanxingzhangbao"] = "一夫当关，万夫莫当！",
  ["$paoxiao_guanxingzhangbao"] = "嗬啊！",
  ["~guanxingzhangbao"] = "未能手刃仇敌，愧对先父……",
}

General:new(extension, "chengpu", "wu", 4):addSkills { "lihuo", "chunlao" }
Fk:loadTranslationTable{
  ["chengpu"] = "程普",
  ["#chengpu"] = "三朝虎臣",
  ["cv:chengpu"] = "符冲",
  ["designer:chengpu"] = "Michael_Lee",
  ["illustrator:chengpu"] = "G.G.G.",

  ["~chengpu"] = "没，没有酒了……",
}

General:new(extension, "bulianshi", "wu", 3, 3, General.Female):addSkills { "anxu", "zhuiyi" }
Fk:loadTranslationTable{
  ["bulianshi"] = "步练师",
  ["#bulianshi"] = "无冕之后",
  ["designer:bulianshi"] = "Anais&我是Kururu",
  ["illustrator:bulianshi"] = "勺子妞",

  ["~bulianshi"] = "江之永矣，不可方思。",
}

General:new(extension, "nos__handang", "wu", 4):addSkills { "nos__gongqi", "nos__jiefan" }
Fk:loadTranslationTable{
  ["nos__handang"] = "韩当",
  ["#nos__handang"] = "石城侯",
  ["designer:nos__handang"] = "ByArt",
  ["illustrator:nos__handang"] = "DH",

  ["~nos__handang"] = "今后，只能靠你了。",
}

General:new(extension, "handang", "wu", 4):addSkills { "gongqi", "jiefan" }
Fk:loadTranslationTable{
  ["handang"] = "韩当",
  ["#handang"] = "石城侯",
  ["illustrator:handang"] = "XXX",

  ["~handang"] = "臣将战死，难为君王解忧了。",
}

General:new(extension, "liubiao", "qun", 4):addSkills { "zishou", "zongshi" }
Fk:loadTranslationTable{
  ["liubiao"] = "刘表",
  ["#liubiao"] = "跨蹈汉南",
  ["illustrator:liubiao"] = "关东煮",
  ["designer:liubiao"] = "管乐",

  ["~liubiao"] = "优柔寡断，要不得啊。",
}

General:new(extension, "huaxiong", "qun", 6):addSkills { "shiyong" }
Fk:loadTranslationTable{
  ["huaxiong"] = "华雄",
  ["#huaxiong"] = "魔将",
  ["designer:huaxiong"] = "小立",
  ["illustrator:huaxiong"] = "地狱许",

  ["~huaxiong"] = "皮厚不挡刀啊……",
}

local zhonghui = General:new(extension, "zhonghui", "wei", 4)
zhonghui:addSkills { "quanji", "zili" }
zhonghui:addRelatedSkill("paiyi")
Fk:loadTranslationTable{
  ["zhonghui"] = "钟会",
  ["#zhonghui"] = "桀骜的野心家",
  ["illustrator:zhonghui"] = "雪君S",
  ["designer:zhonghui"] = "韩旭",

  ["~zhonghui"] = "伯约，让你失望了。",
}

return extension
