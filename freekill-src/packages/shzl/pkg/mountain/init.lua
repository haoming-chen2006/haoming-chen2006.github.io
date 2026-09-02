local extension = Package:new("mountain")
extension.extensionName = "shzl"

extension:loadSkillSkelsByPath("./packages/shzl/pkg/mountain/skills")

Fk:loadTranslationTable{
  ["mountain"] = "神话再临·山",
}

General:new(extension, "zhanghe", "wei", 4):addSkills { "qiaobian" }
Fk:loadTranslationTable{
  ["zhanghe"] = "张郃",
  ["#zhanghe"] = "料敌机先",
  ["illustrator:zhanghe"] = "张帅",

  ["~zhanghe"] = "啊……膝盖……中箭了……",
}

General:new(extension, "dengai", "wei", 4):addSkills { "tuntian", "zaoxian" }
Fk:loadTranslationTable{
  ["dengai"] = "邓艾",
  ["#dengai"] = "矫然的壮士",
  ["illustrator:dengai"] = "KayaK",

  ["~dengai"] = "吾破蜀克敌，竟葬于奸贼之手！",
}

General:new(extension, "jiangwei", "shu", 4):addSkills { "tiaoxin", "zhiji" }
Fk:loadTranslationTable{
  ["jiangwei"] = "姜维",
  ["#jiangwei"] = "龙的衣钵",
  ["cv:jiangwei"] = "彭尧", -- 冷泉? 汤旸?
  ["illustrator:jiangwei"] = "KayaK",

  ["$guanxing_jiangwei1"] = "继丞相之遗志，讨篡汉之逆贼！",
  ["$guanxing_jiangwei2"] = "克复中原，指日可待！",
  ["~jiangwei"] = "我计不成，乃天命也……",
}

General:new(extension, "liushan", "shu", 3):addSkills { "xiangle", "fangquan", "ruoyu" }
Fk:loadTranslationTable{
  ["liushan"] = "刘禅",
  ["#liushan"] = "无为的真命主",
  ["cv:liushan"] = "绯川陵彦",
  ["illustrator:liushan"] = "LiuHeng",

  ["$jijiang_liushan1"] = "我蜀汉岂无人乎！",
  ["$jijiang_liushan2"] = "匡扶汉室，谁敢出战！",
  ["~liushan"] = "哎，别打脸，我投降还不行吗？",
}

General:new(extension, "sunce", "wu", 4):addSkills { "jiang", "hunzi", "zhiba" }
Fk:loadTranslationTable{
  ["sunce"] = "孙策",
  ["#sunce"] = "江东的小霸王",
  ["cv:sunce"] = "彭尧",
  ["illustrator:sunce"] = "KayaK",
  ["designer:sunce"] = "KayaK",

  ["$yingzi_sunce1"] = "公瑾，助我决一死战！",
  ["$yingzi_sunce2"] = "尔等看好了！",
  ["$yinghun_sunce1"] = "父亲，助我背水一战！",
  ["$yinghun_sunce2"] = "孙氏英烈，庇佑江东！",
  ["~sunce"] = "内事不决问张昭，外事不决问周瑜……",
}

General:new(extension, "zhangzhaozhanghong", "wu", 3):addSkills { "zhijian", "guzheng" }
Fk:loadTranslationTable{
  ["zhangzhaozhanghong"] = "张昭张纮",
  ["#zhangzhaozhanghong"] = "经天纬地",
  ["illustrator:zhangzhaozhanghong"] = "废柴男",

  ["~zhangzhaozhanghong"] = "竭力尽智，死而无憾……",
}

General:new(extension, "zuoci", "qun", 3):addSkills { "huashen", "xinsheng" }
Fk:loadTranslationTable{
  ["zuoci"] = "左慈",
  ["#zuoci"] = "迷之仙人",
  ["illustrator:zuoci"] = "废柴男",

  ["~zuoci"] = "腾云跨风，飞升太虚……",
}

General:new(extension, "caiwenji", "qun", 3, 3, General.Female):addSkills { "beige", "duanchang" }
Fk:loadTranslationTable{
  ["caiwenji"] = "蔡文姬",
  ["#caiwenji"] = "异乡的孤女",
  ["illustrator:caiwenji"] = "SoniaTang",
  ["cv:caiwenji"] = "shourei小N",

  ["~caiwenji"] = "人生几何时，怀忧终年岁。",
}

return extension
