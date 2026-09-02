local extension = Package:new("shadow")
extension.extensionName = "shzl"

extension:loadSkillSkelsByPath("./packages/shzl/pkg/shadow/skills")

Fk:loadTranslationTable{
  ["shadow"] = "神话再临·阴",
}

General:new(extension, "wangji", "wei", 3):addSkills { "qizhi", "jinqu" }
Fk:loadTranslationTable{
  ["wangji"] = "王基",
  ["#wangji"] = "经行合一",
  ["illustrator:wangji"] = "雪君S",
  ["designer:wangji"] = "韩旭",

  ["~wangji"] = "天下之势，必归大魏，可恨，未能得见呐！",
}

General:new(extension, "kuailiangkuaiyue", "wei", 3):addSkills { "jianxiang", "shenshi" }
Fk:loadTranslationTable{
  ["kuailiangkuaiyue"] = "蒯良蒯越",
  ["#kuailiangkuaiyue"] = "雍论臼谋",
  ["cv:kuailiangkuaiyue"] = "曹真",
  ["illustrator:kuailiangkuaiyue"] = "北辰菌",

  ["~kuailiangkuaiyue"] = "表不能善用，所憾也……",
}

General:new(extension, "yanyan", "shu", 4):addSkills { "juzhan" }
Fk:loadTranslationTable{
  ["yanyan"] = "严颜",
  ["#yanyan"] = "断头将军",
  ["illustrator:yanyan"] = "Town",

  ["~yanyan"] = "宁可断头死，安能屈膝降！",
}

General:new(extension, "wangping", "shu", 4):addSkills { "feijun", "binglue" }
Fk:loadTranslationTable{
  ["wangping"] = "王平",
  ["#wangping"] = "兵谋以致用",
  ["illustrator:wangping"] = "Yanbai",

  ["~wangping"] = "无当飞军，也有困于深林之时……",
}

General:new(extension, "luji", "wu", 3):addSkills { "huaiju", "yili", "zhenglun" }
Fk:loadTranslationTable{
  ["luji"] = "陆绩",
  ["#luji"] = "瑚琏之器",
  ["cv:luji"] = "曹真",
  ["illustrator:luji"] = "秋呆呆",

  ["~luji"] = "恨不能见，车同轨，书同文……",
}

General:new(extension, "sunliang", "wu", 3):addSkills { "kuizhu", "chezheng", "lijun" }
Fk:loadTranslationTable{
  ["sunliang"] = "孙亮",
  ["#sunliang"] = "寒江枯水",
  ["cv:sunliang"] = "徐刚",
  ["illustrator:sunliang"] = "眉毛子",
  ["designer:sunliang"] = "荼蘼",

  ["~sunliang"] = "今日欲诛逆臣而不得，方知机事不密则害成……",
}

General:new(extension, "xuyou", "qun", 3):addSkills { "chenglue", "shicai", "cunmu" }
Fk:loadTranslationTable{
  ["xuyou"] = "许攸",
  ["#xuyou"] = "朝秦暮楚",
  ["cv:xuyou"] = "曹毅",
  ["illustrator:xuyou"] = "兴游",

  ["~xuyou"] = "阿瞒，没有我你得不到冀州啊！",
}

General:new(extension, "luzhi", "qun", 3):addSkills { "mingren", "zhenliang" }
Fk:loadTranslationTable{
  ["luzhi"] = "卢植",
  ["#luzhi"] = "国之桢干",
  ["cv:luzhi"] = "袁国庆",
  ["illustrator:luzhi"] = "biou09",

  ["~luzhi"] = "泓泓眸子宿渊亭，不见蛾眉只见经。",
}

return extension
