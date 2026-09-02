local extension = Package:new("beginning")
extension.extensionName = "jsrg"

extension:loadSkillSkelsByPath("./packages/jsrg/pkg/beginning/skills")

Fk:loadTranslationTable{
  ["beginning"] = "江山如故·起",
  ["js"] = "江山",
  ["js_re"] = "江山RE",
}

local caocao = General:new(extension, "js__caocao", "qun", 4)
caocao:addSkills { "zhenglue", "huilie" }
caocao:addRelatedSkills { "pingrong", "feiying" }
Fk:loadTranslationTable{
  ["js__caocao"] = "曹操",
  ["#js__caocao"] = "汉征西将军",
  ["cv:js__caocao"] = "樰默（新月杀原创）",
  ["illustrator:js__caocao"] = "凡果",

  ["~js__caocao"] = "汉征西，归去兮，复汉土兮…挽汉旗…",
}

General:new(extension, "js__sunjian", "qun", 4):addSkills { "pingtao", "juelie" }
Fk:loadTranslationTable{
  ["js__sunjian"] = "孙坚",
  ["#js__sunjian"] = "拨定烈志",
  ["cv:js__sunjian"] = "樰默（新月杀原创）",
  ["illustrator:js__sunjian"] = "凡果",

  ["~js__sunjian"] = "我，竟会被暗箭所伤…",
}

General:new(extension, "js_re__sunjian", "qun", 4):addSkills { "pingtao", "re__juelie" }
Fk:loadTranslationTable{
  ["js_re__sunjian"] = "孙坚",
  ["#js_re__sunjian"] = "拨定烈志",
  --["illustrator:js_re__sunjian"] = "",
}

local liuhong = General:new(extension, "js__liuhong", "qun", 4)
liuhong:addSkills { "chaozheng", "shenchong", "julian" }
liuhong:addRelatedSkills { "m_feiyang", "m_bahu" }
Fk:loadTranslationTable{
  ["js__liuhong"] = "刘宏",
  ["#js__liuhong"] = "轧庭焚礼",
  ["illustrator:js__liuhong"] = "君桓文化",

  ["!js__liuhong"] = "西园仙游才方罢，鸿都门外皆欢声！",
  ["~js__liuhong"] = "中兴无望，唯将大志托于此剑……",
}

General:new(extension, "js__huangfusong", "qun", 4):addSkills { "guanhuo", "juxia" }
Fk:loadTranslationTable{
  ["js__huangfusong"] = "皇甫嵩",
  ["#js__huangfusong"] = "安危定倾",
  ["illustrator:js__huangfusong"] = "君桓文化",
}

General:new(extension, "js_re__huangfusong", "qun", 4):addSkills { "guanhuo", "re__juxia" }
Fk:loadTranslationTable{
  ["js_re__huangfusong"] = "皇甫嵩",
  ["#js_re__huangfusong"] = "安危定倾",
  ["illustrator:js_re__huangfusong"] = "佳儒",
}

General:new(extension, "qiaoxuan", "qun", 3):addSkills { "juezhiq", "jizhaoq" }
Fk:loadTranslationTable{
  ["qiaoxuan"] = "桥玄",
  ["#qiaoxuan"] = "泛爱博容",
  ["illustrator:qiaoxuan"] = "君桓文化",
}

General:new(extension, "js_re__qiaoxuan", "qun", 3):addSkills { "re__juezhiq", "re__jizhaoq" }
Fk:loadTranslationTable{
  ["js_re__qiaoxuan"] = "桥玄",
  ["#js_re__qiaoxuan"] = "泛爱博容",
  --["illustrator:js_re__qiaoxuan"] = "",
}

General:new(extension, "js__xushao", "qun", 3):addSkills { "yingmen", "js__pingjian" }
Fk:loadTranslationTable{
  ["js__xushao"] = "许劭",
  ["#js__xushao"] = "识人读心",
  ["cv:js__xushao"] = "樰默（新月杀原创）",
  ["illustrator:js__xushao"] = "凡果",

  ["~js__xushao"] = "运去朋友散，满屋余风雨……",
}

General:new(extension, "js_re__xushao", "qun", 3):addSkills { "re__yingmen", "re__pingjian" }
Fk:loadTranslationTable{
  ["js_re__xushao"] = "许劭",
  ["#js_re__xushao"] = "识人读心",
  ["illustrator:js_re__xushao"] = "凡果_Make",

  ["~js_re__xushao"] = "乱世评荐难再续，唯有荷香夜夜长。",
}

General:new(extension, "js__hejin", "qun", 4):addSkills { "zhaobing", "zhuhuanh", "ty__yanhuo" }
Fk:loadTranslationTable{
  ["js__hejin"] = "何进",
  ["#js__hejin"] = "独意误国谋",
  ["illustrator:js__hejin"] = "凡果_棉鞋",

  ["$ty__yanhuo_js__hejin1"] = "附肉之蛆，也想弑主？",
  ["$ty__yanhuo_js__hejin2"] = "陛下在哪儿？陛下在哪儿！",
  ["~js__hejin"] = "太后召我入宫，汝等这是何意！",
}

General:new(extension, "js__dongbai", "qun", 3, 3, General.Female):addSkills { "shichong", "js__lianzhu" }
Fk:loadTranslationTable{
  ["js__dongbai"] = "董白",
  ["#js__dongbai"] = "魔姬",
  ["illustrator:js__dongbai"] = "alien",
}

General:new(extension, "js_re__dongbai", "qun", 3, 3, General.Female):addSkills { "shichong", "re__lianzhu" }
Fk:loadTranslationTable{
  ["js_re__dongbai"] = "董白",
  ["#js_re__dongbai"] = "魔姬",
  ["illustrator:js__dongbai"] = "铁杵",
}

General:new(extension, "js__nanhualaoxian", "qun", 3):addSkills { "shoushu", "xundao", "xuanhua" }
Fk:loadTranslationTable{
  ["js__nanhualaoxian"] = "南华老仙",
  ["#js__nanhualaoxian"] = "冯虚御风",
  ["illustrator:js__nanhualaoxian"] = "君桓文化",
}

General:new(extension, "js__yangbiao", "qun", 3, 4):addSkills { "js__zhaohan", "js__rangjie", "js__yizheng" }
Fk:loadTranslationTable{
  ["js__yangbiao"] = "杨彪",
  ["#js__yangbiao"] = "德彰海内",
  ["illustrator:js__yangbiao"] = "DH",
  ["cv:js__yangbiao"] = "袁国庆",

  ["~js__yangbiao"] = "脚挛不复行，请辞归家养病……",
}

General:new(extension, "js__kongrong", "qun", 3):addSkills { "js__lirang", "zhengyi" }
Fk:loadTranslationTable{
  ["js__kongrong"] = "孔融",
  ["#js__kongrong"] = "北海太守",
  ["illustrator:js__kongrong"] = "JanusLausDeo",
}

General:new(extension, "js_re__kongrong", "qun", 3):addSkills { "re__lirang", "re__zhengyi" }
Fk:loadTranslationTable{
  ["js_re__kongrong"] = "孔融",
  ["#js_re__kongrong"] = "北海太守",
  ["illustrator:js_re__kongrong"] = "zoo",
}

General:new(extension, "js__duanwei", "qun", 4):addSkills { "langmie" }
Fk:loadTranslationTable{
  ["js__duanwei"] = "段煨",
  ["#js__duanwei"] = "凉国之英",
  ["illustrator:js__duanwei"] = "匠人绘",

  ["~js__duanwei"] = "狼伴其侧，终不胜防。",
}

General:new(extension, "js__zhujun", "qun", 4):addSkills { "fendi", "jvxiang" }
Fk:loadTranslationTable{
  ["js__zhujun"] = "朱儁",
  ["#js__zhujun"] = "征无遗虑",
  ["illustrator:js__zhujun"] = "沉睡千年",
}

General:new(extension, "js__liuyan", "qun", 3):addSkills { "js__tushe", "limu", "tongjue" }
Fk:loadTranslationTable{
  ["js__liuyan"] = "刘焉",
  ["#js__liuyan"] = "裂土之宗",
  ["illustrator:js__liuyan"] = "心中一凛",

  ["$limu_js__liuyan1"] = "米贼作乱，吾必为益州自保。",
  ["$limu_js__liuyan2"] = "废史立牧，可得一方安定。",
  ["~js__liuyan"] = "背疮难治，世子难继。",
}

General:new(extension, "js__liubei", "qun", 4):addSkills { "jishan", "zhenqiao" }
Fk:loadTranslationTable{
  ["js__liubei"] = "刘备",
  ["#js__liubei"] = "负戎荷戈",
  ["cv:js__liubei"] = "玖心粽子（新月杀原创）",
  ["illustrator:js__liubei"] = "君桓文化",

  ["~js__liubei"] = "大义未信，唯念黎庶之苦……",
}

General:new(extension, "js_re__liubei", "qun", 4):addSkills { "re__jishan", "zhenqiao" }
Fk:loadTranslationTable{
  ["js_re__liubei"] = "刘备",
  ["#js_re__liubei"] = "负戎荷戈",
  ["illustrator:js_re__liubei"] = "秋呆呆",
}

General:new(extension, "js__wangyun", "qun", 3):addSkills { "shelun", "fayi" }
Fk:loadTranslationTable{
  ["js__wangyun"] = "王允",
  ["#js__wangyun"] = "居功自矜",
  ["illustrator:js__wangyun"] = "凡果",
}

return extension
