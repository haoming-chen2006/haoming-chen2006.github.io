local extension = Package:new("standard_ex")

Fk:loadTranslationTable{
  ["standard_ex"] = "界限突破·标准包",
  ["ex"] = "界",
  ["std"] = "标",
}

extension:loadSkillSkelsByPath("./packages/standard_ex/pkg/general/skills")

General:new(extension, "ex__caocao", "wei", 4):addSkills{ "ex__jianxiong", "hujia" }
Fk:loadTranslationTable{
  ["ex__caocao"] = "界曹操",
  ["#ex__caocao"] = "魏武帝",
  ["designer:ex__caocao"] = "韩旭",
  ["illustrator:ex__caocao"] = "青骑士",

  ["$hujia_ex__caocao1"] = "大胆逆贼，谁可擒之！",
  ["$hujia_ex__caocao2"] = "护卫何在！",
  ["~ex__caocao"] = "华佗何在？……",
}

General:new(extension, "ex__simayi", "wei", 3):addSkills{ "ex__fankui", "ex__guicai" }
Fk:loadTranslationTable{
  ["ex__simayi"] = "界司马懿",
  ["#ex__simayi"] = "狼顾之鬼",
  ["designer:ex__simayi"] = "韩旭",
  ["illustrator:ex__simayi"] = "木美人",

  ["~ex__simayi"] = "我的气数，就到这里了么？",
}

General:new(extension, "ex__xiahoudun", "wei", 4):addSkills{ "ex__ganglie", "ex__qingjian" }
Fk:loadTranslationTable{
  ["ex__xiahoudun"] = "界夏侯惇",
  ["#ex__xiahoudun"] = "独眼的罗刹",
  ["illustrator:ex__xiahoudun"] = "DH",

  ["~ex__xiahoudun"] = "诸多败绩，有负丞相重托。",
}

General:new(extension, "ex__zhangliao", "wei", 4):addSkills{ "ex__tuxi" }
Fk:loadTranslationTable{
  ["ex__zhangliao"] = "界张辽",
  ["#ex__zhangliao"] = "前将军",
  ["cv:ex__zhangliao"] = "金垚",
  ["illustrator:ex__zhangliao"] = "张帅",
  ["designer:ex__zhangliao"] = "韩旭",

  ["~ex__zhangliao"] = "被敌人占了先机，呃。",
}

General:new(extension, "ex__xuchu", "wei", 4):addSkills{ "ex__luoyi" }
Fk:loadTranslationTable{
  ["ex__xuchu"] = "界许褚",
  ["#ex__xuchu"] = "虎痴",
  ["illustrator:ex__xuchu"] = "巴萨小马",
  ["~ex__xuchu"] = "丞相，末将尽力了！",
}

General:new(extension, "ex__guojia", "wei", 3):addSkills{ "ex__yiji", "tiandu" }
Fk:loadTranslationTable{
  ["ex__guojia"] = "界郭嘉",
  ["#ex__guojia"] = "早终的先知",
  ["illustrator:ex__guojia"] = "木美人",

  ["$tiandu_ex__guojia1"] = "那，就这样吧。",
  ["$tiandu_ex__guojia2"] = "天意如此。",
  ["~ex__guojia"] = "咳，咳咳咳。",
}

General:new(extension, "ex__zhenji", "wei", 3, 3, General.Female):addSkills{ "ex__luoshen", "qingguo" }
Fk:loadTranslationTable{
  ["ex__zhenji"] = "界甄姬",
  ["#ex__zhenji"] = "薄幸的美人",
  ["illustrator:ex__zhenji"] = "Town",

  ["$qingguo_ex__zhenji1"] = "肩若削成，腰如约素。",
  ["$qingguo_ex__zhenji2"] = "延颈秀项，皓质呈露。",
  ["~ex__zhenji"] = "出亦复何苦，入亦复何愁。",
}

General:new(extension, "lidian", "wei", 3):addSkills{ "xunxun", "wangxi" }
Fk:loadTranslationTable{
  ["lidian"] = "李典",
  ["#lidian"] = "深明大义",
  ["illustrator:lidian"] = "张帅",

  ["~lidian"] = "报国杀敌，虽死犹荣……",
}

General:new(extension, "ex__liubei", "shu", 4):addSkills{ "ex__rende", "jijiang" }
Fk:loadTranslationTable{
  ["ex__liubei"] = "界刘备",
  ["#ex__liubei"] = "乱世的枭雄",
  ["illustrator:ex__liubei"] = "木美人",

  ["$jijiang_ex__liubei1"] = "哪位将军，替我拿下此贼！",
  ["$jijiang_ex__liubei2"] = "欺我军无人乎！",
  ["~ex__liubei"] = "汉室未兴，祖宗未耀，朕实不忍此时西去……",
}

General:new(extension, "ex__guanyu", "shu", 4):addSkills{ "ex__wusheng", "ex__yijue" }
Fk:loadTranslationTable{
  ["ex__guanyu"] = "界关羽",
  ["#ex__guanyu"] = "美髯公",
  ["cv:ex__guanyu"] = "扬羽Miro",-- 丁翔威
  ["illustrator:ex__guanyu"] = "俊西JUNC",

  ["~ex__guanyu"] = "桃园一拜，恩义常在……",
}

General:new(extension, "ex__zhangfei", "shu", 4):addSkills{ "ex__paoxiao", "ex__tishen" }
Fk:loadTranslationTable{
  ["ex__zhangfei"] = "界张飞",
  ["#ex__zhangfei"] = "万夫不当",
  ["cv:ex__zhangfei"] = "冷泉夜月",
  ["illustrator:ex__zhangfei"] = "SONGQIJIN",

  ["~ex__zhangfei"] = "桃园一拜，此生…无憾……",
}

General:new(extension, "ex__zhugeliang", "shu", 3):addSkills{ "ex__guanxing", "kongcheng" }
Fk:loadTranslationTable{
  ["ex__zhugeliang"] = "界诸葛亮",
  ["#ex__zhugeliang"] = "迟暮的丞相",
	["illustrator:ex__zhugeliang"] = "黑桃J&Thinking",

  ["$kongcheng_ex__zhugeliang1"] = "淡然相对，转危为安。",
  ["$kongcheng_ex__zhugeliang2"] = "绝处逢生，此招慎用。",
  ["~ex__zhugeliang"] = "穷尽毕生，有憾无悔。",
}

General:new(extension, "ex__zhaoyun", "shu", 4):addSkills{ "longdan", "yajiao" }
Fk:loadTranslationTable{
  ["ex__zhaoyun"] = "界赵云",
  ["#ex__zhaoyun"] = "虎威将军",
	["illustrator:ex__zhaoyun"] = "DH",

  ["$longdan_ex__zhaoyun1"] = "龙威虎胆，斩敌破阵！",
  ["$longdan_ex__zhaoyun2"] = "进退自如，游刃有余！",
  ["~ex__zhaoyun"] = "你们谁…还敢再上……",
}

local machao = General:new(extension, "ex__machao", "shu", 4)
machao:addSkills{ "mashu", "ex__tieji" }
machao.subkingdom = "god"
Fk:loadTranslationTable{
  ["ex__machao"] = "界马超",
  ["#ex__machao"] = "一骑当千",
	["illustrator:ex__machao"] = "木美人&张帅&KayaK",

  ["~ex__machao"] = "请将我，葬在西凉……",
}

General:new(extension, "ex__huangyueying", "shu", 3, 3, General.Female):addSkills{ "ex__jizhi", "ex__qicai" }
Fk:loadTranslationTable{
  ["ex__huangyueying"] = "界黄月英",
  ["#ex__huangyueying"] = "归隐的杰女",
  ["cv:ex__huangyueying"] = "水原", -- 卓思源
  ["illustrator:ex__huangyueying"] = "ASK",

  ["~ex__huangyueying"] = "我的面容，有吓到你吗？",
}

local std__xushu = General:new(extension, "std__xushu", "shu", 4)
std__xushu:addSkills{ "zhuhai", "qianxin" }
std__xushu:addRelatedSkill("jianyan")
Fk:loadTranslationTable{
  ["std__xushu"] = "徐庶",
  ["#std__xushu"] = "化剑为犁",
	["illustrator:std__xushu"] = "Zero",

  ["~std__xushu"] = "母亲……孩儿……尽孝来了。",
}

General:new(extension, "yijik", "shu", 3):addSkills{ "jijie", "jiyuan" }
Fk:loadTranslationTable{
  ["yijik"] = "伊籍",
  ["#yijik"] = "礼仁同渡",
	["illustrator:yijik"] = "alien",

  ["~yijik"] = "未能，救得刘公脱险……",
}

General:new(extension, "ex__sunquan", "wu", 4):addSkills{ "ex__zhiheng", "ex__jiuyuan" }
Fk:loadTranslationTable{
  ["ex__sunquan"] = "界孙权",
  ["#ex__sunquan"] = "年轻的贤君",
	["illustrator:ex__sunquan"] = "凝聚永恒",

  ["~ex__sunquan"] = "锦绣江东，岂能失于我手……",
}

General:new(extension, "ex__ganning", "wu", 4):addSkills{ "qixi", "fenwei" }
Fk:loadTranslationTable{
  ["ex__ganning"] = "界甘宁",
  ["#ex__ganning"] = "锦帆游侠",
	["illustrator:ex__ganning"] = "巴萨小马",

  ["$qixi_ex__ganning1"] = "弟兄们，准备动手！",
  ["$qixi_ex__ganning2"] = "你用不了这么多了！",
  ["~ex__ganning"] = "别管我，继续上！",
}

local lvmeng = General:new(extension, "ex__lvmeng", "wu", 4)
lvmeng:addSkills{ "keji", "qinxue" }
lvmeng:addRelatedSkill("gongxin")
Fk:loadTranslationTable{
  ["ex__lvmeng"] = "界吕蒙",
  ["#ex__lvmeng"] = "士别三日",
	["illustrator:ex__lvmeng"] = "樱花闪乱",

  ["$keji_ex__lvmeng1"] = "蓄力待时，不争首功。",
  ["$keji_ex__lvmeng2"] = "最好的机会，还在等着我。",
  ["$gongxin_ex__lvmeng1"] = "洞若观火，运筹帷幄。",
  ["$gongxin_ex__lvmeng2"] = "哼，早知如此。",
  ["~ex__lvmeng"] = "你，给我等着！",
}

General:new(extension, "ex__huanggai", "wu", 4):addSkills{ "ex__kurou", "zhaxiang" }
Fk:loadTranslationTable{
  ["ex__huanggai"] = "界黄盖",
  ["#ex__huanggai"] = "轻身为国",
	["illustrator:ex__huanggai"] = "G.G.G.",

  ["~ex__huanggai"] = "盖，有负公瑾重托……",
}

General:new(extension, "ex__zhouyu", "wu", 3):addSkills{ "ex__yingzi", "ex__fanjian" }
Fk:loadTranslationTable{
  ["ex__zhouyu"] = "界周瑜",
  ["#ex__zhouyu"] = "大都督",
	["illustrator:ex__zhouyu"] = "KayaK",

  ["~ex__zhouyu"] = "既生瑜，何生亮！……既生瑜，何生亮……！",
}

General:new(extension, "ex__daqiao", "wu", 3, 3, General.Female):addSkills{ "ex__guose", "liuli" }
Fk:loadTranslationTable{
  ["ex__daqiao"] = "界大乔",
  ["#ex__daqiao"] = "矜持之花",
  ["designer:ex__daqiao"] = "韩旭",
	["illustrator:ex__daqiao"] = "DH",

  ["$liuli_ex__daqiao1"] = "帮帮人家嘛~",
  ["$liuli_ex__daqiao2"] = "伯符不在身边，我要自己保重！",
  ["~ex__daqiao"] = "伯符，再也没人能欺负我了……",
}

General:new(extension, "ex__luxun", "wu", 3):addSkills{ "ex__qianxun", "ex__lianying" }
Fk:loadTranslationTable{
  ["ex__luxun"] = "界陆逊",
  ["#ex__luxun"] = "儒生雄才",
  ["designer:ex__luxun"] = "韩旭",
	["illustrator:ex__luxun"] = "depp",

  ["~ex__luxun"] = "我的未竟之业……",
}

General:new(extension, "ex__sunshangxiang", "wu", 3, 3, General.Female):addSkills{ "ex__jieyin", "xiaoji" }
Fk:loadTranslationTable{
  ["ex__sunshangxiang"] = "界孙尚香",
  ["#ex__sunshangxiang"] = "弓腰姬",
  ["cv:ex__sunshangxiang"] = "虫虫", -- 张甄妮
  ["illustrator:ex__sunshangxiang"] = "Thinking",

  ["$xiaoji_ex__sunshangxiang1"] = "剑利弓急，你可打不过我的。",
  ["$xiaoji_ex__sunshangxiang2"] = "我会的武器，可多着呢。",
  ["~ex__sunshangxiang"] = "哎呀，这次弓箭射歪了。",
}

General:new(extension, "ex__huatuo", "qun", 3):addSkills{ "jijiu", "ex__chuli" }
Fk:loadTranslationTable{
  ["ex__huatuo"] = "界华佗",
  ["designer:ex__huatuo"] = "韩旭",
  ["#ex__huatuo"] = "神医",
  ["illustrator:ex__huatuo"] = "琛·美第奇",

  ["$jijiu_ex__huatuo1"] = "救死扶伤，悬壶济世。",
  ["$jijiu_ex__huatuo2"] = "妙手仁心，药到病除。",
  ["~ex__huatuo"] = "生老病死，命不可违。",
}

General:new(extension, "ex__lvbu", "qun", 5):addSkills{ "wushuang", "liyu" }
Fk:loadTranslationTable{
  ["ex__lvbu"] = "界吕布",
  ["#ex__lvbu"] = "武的化身",
  ["cv:ex__lvbu"] = "金垚",
  ["illustrator:ex__lvbu"] = "张帅",

  ["$wushuang_ex__lvbu1"] = "还有哪个敢挑战我！？",
  ["$wushuang_ex__lvbu2"] = "三个齐上，也不是我的对手！",
  ["~ex__lvbu"] = "我竟然输了……不可能！",
}

General:new(extension, "ex__diaochan", "qun", 3, 3, General.Female):addSkills{ "lijian", "ex__biyue" }
Fk:loadTranslationTable{
  ["ex__diaochan"] = "界貂蝉",
  ["#ex__diaochan"] = "绝世的舞姬",
  ["cv:ex__diaochan"] = "虫虫",
  ["illustrator:ex__diaochan"] = "木美人",

  ["$lijian_ex__diaochan1"] = "赢家，才能得到我~",
  ["$lijian_ex__diaochan2"] = "这场比赛，将军可要赢哦~",
  ["~ex__diaochan"] = "我的任务，终于完成了……",
}

General:new(extension, "std__huaxiong", "qun", 6):addSkills{ "yaowu" }
Fk:loadTranslationTable{
  ["std__huaxiong"] = "华雄",
  ["#std__huaxiong"] = "飞扬跋扈",
  ["illustrator:std__huaxiong"] = "地狱许",

  ["~std__huaxiong"] = "这，怎么可能……",
}

General:new(extension, "std__yuanshu", "qun", 4):addSkills{ "wangzun", "tongji" }

Fk:loadTranslationTable{
  ["std__yuanshu"] = "袁术",
  ["#std__yuanshu"] = "野心渐增",
  ["illustrator:std__yuanshu"] = "LiuHeng",

  ["~std__yuanshu"] = "把玉玺，还给我。",
}

General:new(extension, "std__gongsunzan", "qun", 4):addSkills{ "yicong", "qiaomeng" }
Fk:loadTranslationTable{
  ["std__gongsunzan"] = "公孙瓒",
  ["#std__gongsunzan"] = "白马将军",
  ["illustrator:std__gongsunzan"] = "Vincent",

  ["$yicong_std__gongsunzan1"] = "列阵锋矢，直取要害。",
  ["$yicong_std__gongsunzan2"] = "变阵冲轭，以守代攻。",
  ["~std__gongsunzan"] = "皇图霸业梦，付之，一炬中……",
}

General:new(extension, "std__panfeng", "qun", 4):addSkills{ "std__kuangfu" }
Fk:loadTranslationTable{
  ["std__panfeng"] = "潘凤",
  ["#std__panfeng"] = "联军上将",

  ["~std__panfeng"] = "潘凤又被华雄斩了……",
}

General:new(extension, "kongrong", "qun", 3):addSkills{ "cirang", "liaoliao" }
Fk:loadTranslationTable{
  ["kongrong"] = "孔融",
  ["#kongrong"] = "年少怀德",
  ["illustrator:kongrong"] = "丝葱",
}

return extension
