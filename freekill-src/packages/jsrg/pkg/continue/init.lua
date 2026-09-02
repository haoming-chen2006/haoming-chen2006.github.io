local extension = Package:new("continue")
extension.extensionName = "jsrg"

extension:loadSkillSkelsByPath("./packages/jsrg/pkg/continue/skills")

Fk:loadTranslationTable{
  ["continue"] = "江山如故·承",
}

local sunce = General:new(extension, "js__sunce", "wu", 4)
sunce:addSkills { "duxing", "zhihengs", "zhasi", "bashi" }
sunce:addRelatedSkill("ex__zhiheng")
Fk:loadTranslationTable{
  ["js__sunce"] = "孙策",
  ["#js__sunce"] = "问鼎的霸王",
  ["illustrator:js__sunce"] = "君桓文化",
  ["cv:js__sunce"] = "凉水汐月（新月杀原创）",

  ["$ex__zhiheng_js__sunce1"] = "省身以严，用权以慎，方能上使下力。",
  ["$ex__zhiheng_js__sunce2"] = "惩前毖后，宽严相济，士人自念吾恩。",
  ["~js__sunce"] = "天不假年……天不假年！",
}

local re_sunce = General:new(extension, "js_re__sunce", "wu", 4)
re_sunce:addSkills { "re__duxing", "zhihengs", "zhasi", "re__bashi" }
re_sunce:addRelatedSkill("ex__zhiheng")
Fk:loadTranslationTable{
  ["js_re__sunce"] = "孙策",
  ["#js_re__sunce"] = "问鼎的霸王",
  ["illustrator:js_re__sunce"] = "KayaK&小罗没想好",
}

local xugong = General:new(extension, "js__xugong", "wu", 3)
xugong.subkingdom = "qun"
xugong:addSkills { "js__biaozhao", "js__yechou" }
Fk:loadTranslationTable{
  ["js__xugong"] = "许贡",
  ["#js__xugong"] = "独计击流",
  ["illustrator:js__xugong"] = "鬼画府",
}

local xugong2 = General:new(extension, "js_re__xugong", "wu", 3)
xugong2.subkingdom = "qun"
xugong2:addSkills { "re__biaozhao", "js__yechou" }
Fk:loadTranslationTable{
  ["js_re__xugong"] = "许贡",
  ["#js_re__xugong"] = "独计击流",
  ["illustrator:js_re__xugong"] = "zoo",
}

General:new(extension, "js__chunyuqiong", "qun", 4):addSkills { "js__cangchu", "js__shishou" }
Fk:loadTranslationTable{
  ["js__chunyuqiong"] = "淳于琼",
  ["#js__chunyuqiong"] = "乌巢酒仙",
  ["illustrator:js__chunyuqiong"] = "君桓文化",
}

local xuyou = General:new(extension, "js__xuyou", "qun", 3)
xuyou.subkingdom = "wei"
xuyou:addSkills { "lipan", "qingxix", "jinmie" }
Fk:loadTranslationTable{
  ["js__xuyou"] = "许攸",
  ["#js__xuyou"] = "毕方骄翼",
  ["illustrator:js__xuyou"] = "鬼画府",
}

local lvbu = General:new(extension, "js__lvbu", "qun", 5)
lvbu.subkingdom = "shu"
lvbu:addSkills { "wuchang", "qingjiaol", "chengxu" }
Fk:loadTranslationTable{
  ["js__lvbu"] = "吕布",
  ["#js__lvbu"] = "虎视中原",
  ["illustrator:js__lvbu"] = "鬼画府",
}

local zhanghe = General:new(extension, "js__zhanghe", "qun", 4)
zhanghe.subkingdom = "wei"
zhanghe:addSkills { "qiongtu", "js__xianzhu" }
Fk:loadTranslationTable{
  ["js__zhanghe"] = "张郃",
  ["#js__zhanghe"] = "微子去殷",
  ["illustrator:js__zhanghe"] = "君桓文化",
}

General:new(extension, "js__zoushi", "qun", 3, 3, General.Female):addSkills { "guyin", "zhangdeng" }
Fk:loadTranslationTable{
  ["js__zoushi"] = "邹氏",
  ["#js__zoushi"] = "淯水香魂",
  ["illustrator:js__zoushi"] = "君桓文化",
}

General:new(extension, "js__guanyu", "shu", 5):addSkills { "guanjue", "nianen" }
Fk:loadTranslationTable{
  ["js__guanyu"] = "关羽",
  ["#js__guanyu"] = "羊左之义",
  ["cv:js__guanyu"] = "雨叁大魔王（新月杀原创）",
  ["illustrator:js__guanyu"] = "鬼画府",

  ["~js__guanyu"] = "皇叔厚恩，来世再报了……",
}

General:new(extension, "js__chendeng", "qun", 3):addSkills { "lunshi", "guitu" }
Fk:loadTranslationTable{
  ["js__chendeng"] = "陈登",
  ["#js__chendeng"] = "惊涛弄潮",
  ["illustrator:js__chendeng"] = "鬼画府",
}

General:new(extension, "js_re__chendeng", "qun", 3):addSkills { "lunshi", "re__guitu" }
Fk:loadTranslationTable{
  ["js_re__chendeng"] = "陈登",
  ["#js_re__chendeng"] = "惊涛弄潮",
  ["illustrator:js_re__chendeng"] = "鬼画府",
}

General:new(extension, "js__zhenji", "qun", 3, 3, General.Female):addSkills { "jixiang", "chengxian" }
Fk:loadTranslationTable{
  ["js__zhenji"] = "甄宓",
  ["#js__zhenji"] = "一顾倾国",
  ["illustrator:js__zhenji"] = "君桓文化",
  ["cv:js__zhenji"] = "离瞳鸭",

  ["~js__zhenji"] = "乱世人如苇，随波雨打浮……",
}

local zhangliao = General:new(extension, "js__zhangliao", "qun", 4)
zhangliao.subkingdom = "wei"
zhangliao:addSkills { "zhengbing", "tuwei" }
Fk:loadTranslationTable{
  ["js__zhangliao"] = "张辽",
  ["#js__zhangliao"] = "利刃风骑",
  ["illustrator:js__zhangliao"] = "君桓文化",
}

return extension
