local extension = Package:new("yj2017")
extension.extensionName = "yj"

extension:loadSkillSkelsByPath("./packages/yj/pkg/yj2017/skills")

Fk:loadTranslationTable{
  ["yj2017"] = "原创之魂2017",
}

General:new(extension, "xinxianying", "wei", 3, 3, General.Female):addSkills { "zhongjian", "caishi" }
Fk:loadTranslationTable{
  ["xinxianying"] = "辛宪英",
  ["#xinxianying"] = "名门智女",
  ["designer:xinxianying"] = "如释帆飞",
  ["cv:xinxianying"] = "小N",
  ["illustrator:xinxianying"] = "玫芍之言",

  ["~xinxianying"] = "吾一生明鉴，竟错看于你。",
}

local jikang = General:new(extension, "jikang", "wei", 3)
jikang:addSkills { "qingxian", "juexiang" }
jikang:addRelatedSkills { "jixiann", "liexian", "rouxian", "hexian" }
Fk:loadTranslationTable{
  ["jikang"] = "嵇康",
  ["#jikang"] = "峻峰孤松",
  ["cv:jikang"] = "曹毅",
  ["illustrator:jikang"] = "眉毛子",
  ["designer:jikang"] = "荼蘼",

  ["~jikang"] = "多少遗恨，俱随琴音去。",
}

General:new(extension, "wuxian", "shu", 3, 3, General.Female):addSkills { "fumian", "daiyan" }
Fk:loadTranslationTable{
  ["wuxian"] = "吴苋",
  ["#wuxian"] = "穆皇后",
  ["designer:wuxian"] = "wlf元首",
  ["cv:wuxian"] = "冯骏骅",
  ["illustrator:wuxian"] = "缨尧",

  ["~wuxian"] = "所幸伴君半生，善始终得善终。",
}

General:new(extension, "qinmi", "shu", 3):addSkills { "jianzhengq", "zhuandui", "tianbian" }
Fk:loadTranslationTable{
  ["qinmi"] = "秦宓",
  ["#qinmi"] = "彻天之舌",
  ["cv:qinmi"] = "曹真",
  ["designer:qinmi"] = "凌天翼",
  ["illustrator:qinmi"] = "Thinking",

  ["~qinmi"] = "我竟然，也百口莫辩了……",
}

General:new(extension, "xushi", "wu", 3, 3, General.Female):addSkills { "wengua", "fuzhu" }
Fk:loadTranslationTable{
  ["xushi"] = "徐氏",
  ["#xushi"] = "节义双全",
  ["designer:xushi"] = "追蛋格林",
  ["illustrator:xushi"] = "懿肆琬兮",

  ["~xushi"] = "莫问前程凶吉，但求落幕无悔。",
}

General:new(extension, "xuezong", "wu", 3):addSkills { "funan", "jiexun" }
Fk:loadTranslationTable{
  ["xuezong"] = "薛综",
  ["#xuezong"] = "彬彬之玊",
  ["designer:xuezong"] = "韩旭",
  ["illustrator:xuezong"] = "秋呆呆",

  ["~xuezong"] = "尔等，竟做如此有辱斯文之事。",
}

General:new(extension, "caojie", "qun", 3, 3, General.Female):addSkills { "shouxi", "huimin" }
Fk:loadTranslationTable{
  ["caojie"] = "曹节",
  ["#caojie"] = "献穆皇后",
  ["designer:caojie"] = "会智迟的沮授",
  ["cv:caojie"] = "醋醋", -- 文晓依
  ["illustrator:caojie"] = "小小鸡仔",

  ["~caojie"] = "皇天必不祚尔。",
}

General:new(extension, "caiyong", "qun", 3):addSkills { "pizhuan", "tongbo" }
Fk:loadTranslationTable{
  ["caiyong"] = "蔡邕",
  ["#caiyong"] = "大鸿儒",
  ["designer:caiyong"] = "千幻",
  ["illustrator:caiyong"] = "Town",

  ["~caiyong"] = "感叹世事，何罪之有？",
}

return extension
