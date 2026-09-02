local extension = Package:new("sp")
extension.extensionName = "sp"

extension:loadSkillSkelsByPath "./packages/sp/pkg/sp/skills"

Fk:loadTranslationTable{
  ["sp"] = "SP",
  ["hulao1"] = "虎牢关",
  ["hulao2"] = "虎牢关",
}

General(extension, "yangxiu", "wei", 3):addSkills { "danlao", "jilei" }
Fk:loadTranslationTable{
  ["yangxiu"] = "杨修",
  ["#yangxiu"] = "恃才放旷",
  ["cv:yangxiu"] = "彭尧",
  ["illustrator:yangxiu"] = "张可",

  ["~yangxiu"] = "我固自以死之晚也……",
}

local diaochan = General(extension, "sp__diaochan", "qun", 3, 3, General.Female)
diaochan:addSkills { "lijian", "biyue" }
diaochan.hidden = true
Fk:loadTranslationTable{
  ["sp__diaochan"] = "貂蝉",
  ["#sp__diaochan"] = "绝世的舞姬",
  ["illustrator:sp__diaochan"] = "巴萨小马",

  ["~sp__diaochan"] = "父亲大人，对不起……",
}

General(extension, "gongsunzan", "qun", 4):addSkills { "yicong" }
Fk:loadTranslationTable{
  ["gongsunzan"] = "公孙瓒",
  ["#gongsunzan"] = "白马将军",
  ["illustrator:gongsunzan"] = "Vincent",

  ["~gongsunzan"] = "我军将败，我已无颜苟活于世……",
}

General(extension, "yuanshu", "qun", 4):addSkills { "yongsi", "weidi" }
Fk:loadTranslationTable{
  ["yuanshu"] = "袁术",
  ["#yuanshu"] = "仲家帝",
  ["cv:yuanshu"] = "彭尧", -- or 马洋 ?
  ["designer:yuanshu"] = "韩旭",
  ["illustrator:yuanshu"] = "吴昊",

  ["~yuanshu"] = "可恶！就差……一步了……",
}

local sunshangxiang = General(extension, "sp__sunshangxiang", "shu", 3, 3, General.Female)
sunshangxiang:addSkills { "jieyin", "xiaoji" }
sunshangxiang.hidden = true
Fk:loadTranslationTable{
  ["sp__sunshangxiang"] = "孙尚香",
  ["#sp__sunshangxiang"] = "梦醉良缘",
  ["illustrator:sp__sunshangxiang"] = "木美人",

  ["~sp__sunshangxiang"] = "不，还不可以死……",
}

General(extension, "sp__pangde", "wei", 4):addSkills { "mashu", "juesi" }
Fk:loadTranslationTable{
  ["sp__pangde"] = "庞德",
  ["#sp__pangde"] = "抬榇之悟",
  ["illustrator:sp__pangde"] = "天空之城",

  ["~sp__pangde"] = "受魏王厚恩，唯以死报之。",
}

local guanyu = General(extension, "sp__guanyu", "wei", 4)
guanyu:addSkills { "wusheng", "sp__danji" }
guanyu:addRelatedSkill("mashu")
guanyu.hidden = true
Fk:loadTranslationTable{
  ["sp__guanyu"] = "关羽",
  ["#sp__guanyu"] = "汉寿亭侯",
  ["illustrator:sp__guanyu"] = "LiuHeng",
}

local lvbu = General(extension, "hulao1__godlvbu", "god", 8)
lvbu.hidden = true
lvbu.hulao_status = 1
lvbu:addSkills { "mashu", "wushuang", "hulao__jingjia", "hulao__aozhan" }
Fk:loadTranslationTable{
  ["hulao1__godlvbu"] = "神吕布",
  ["#hulao1__godlvbu"] = "最强神话",
  ["illustrator:hulao1__godlvbu"] = "LiuHeng",
}

local lvbu2 = General(extension, "hulao2__godlvbu", "god", 4)
lvbu2.hidden = true
lvbu2.hulao_status = 2
lvbu2:addSkills { "mashu", "wushuang", "xiuluo", "hulao__shenwei", "shenji" }
Fk:loadTranslationTable{
  ["hulao2__godlvbu"] = "神吕布",
  ["#hulao2__godlvbu"] = "暴怒的战神",
  ["illustrator:hulao2__godlvbu"] = "LiuHeng",

  ["~hulao2__godlvbu"] = "虎牢关……失守了……",
}

General(extension, "sp__caiwenji", "wei", 3, 3, General.Female):addSkills { "chenqing", "mozhi" }
Fk:loadTranslationTable{
  ["sp__caiwenji"] = "蔡文姬",
  ["#sp__caiwenji"] = "金璧之才",
  ["cv:sp__caiwenji"] = "小N",
  ["designer:sp__caiwenji"] = "韩旭",
  ["illustrator:sp__caiwenji"] = "木美人",

  ["~sp__caiwenji"] = "命运……弄人……",
}

General(extension, "sp__machao", "qun", 4):addSkills { "sp__zhuiji", "shichou" }
Fk:loadTranslationTable{
  ["sp__machao"] = "马超",
  ["#sp__machao"] = "西凉的猛狮",
  ["designer:sp__machao"] = "凌天翼",
  ["illustrator:sp__machao"] = "天空之城",

  ["~sp__machao"] = "西凉，回不去了……",
}

General(extension, "sp__jiaxu", "wei", 3):addSkills { "zhenlue", "jianshu", "yongdi" }
Fk:loadTranslationTable{
  ["sp__jiaxu"] = "贾诩",
  ["#sp__jiaxu"] = "算无遗策",
  ["designer:sp__jiaxu"] = "千幻",
  ["illustrator:sp__jiaxu"] = "雪君S",

  ["~sp__jiaxu"] = "立嫡之事，真是取祸之道！",
}

General(extension, "caohong", "wei", 4):addSkills { "yuanhu" }
Fk:loadTranslationTable{
  ["caohong"] = "曹洪",
  ["#caohong"] = "福将",
  ["designer:caohong"] = "韩旭",
  ["illustrator:caohong"] = "LiuHeng",

  ["~caohong"] = "福兮祸所伏……",
}

General(extension, "guanyinping", "shu", 3, 3, General.Female):addSkills { "xueji", "huxiao", "wuji" }
Fk:loadTranslationTable{
  ["guanyinping"] = "关银屏",
  ["#guanyinping"] = "武姬",
  ["designer:guanyinping"] = "韩旭",
  ["illustrator:guanyinping"] = "木美人",

  ["~guanyinping"] = "父亲，你来救我了吗……",
}

local zhenji = General(extension, "sp__zhenji", "wei", 3, 3, General.Female)
zhenji:addSkills { "qingguo", "luoshen" }
zhenji.hidden = true
Fk:loadTranslationTable{
  ["sp__zhenji"] = "甄姬",
  ["#sp__zhenji"] = "薄幸的美人",
  ["illustrator:sp__zhenji"] = "白姥姥",
}

General(extension, "liuxie", "qun", 3):addSkills { "tianming", "mizhao" }
Fk:loadTranslationTable{
  ["liuxie"] = "刘协",
  ["#liuxie"] = "受困天子",
  ["designer:liuxie"] = "韩旭",
  ["illustrator:liuxie"] = "LiuHeng",

  ["~liuxie"] = "为什么，不把复兴汉室的权力交给我……",
}

General(extension, "lingju", "qun", 3, 3, General.Female):addSkills { "jieyuan", "fenxin" }
Fk:loadTranslationTable{
  ["lingju"] = "灵雎",
  ["#lingju"] = "情随梦逝",
  ["designer:lingju"] = "韩旭",
  ["illustrator:lingju"] = "木美人",

  ["~lingju"] = "主上，对不起……",
}

General(extension, "fuwan", "qun", 4):addSkills { "moukui" }
Fk:loadTranslationTable{
  ["fuwan"] = "伏完",
  ["#fuwan"] = "沉毅的国丈",
  ["illustrator:fuwan"] = "LiuHeng",

  ["~fuwan"] = "后会有期……",
}

local xiahouba = General(extension, "xiahouba", "shu", 4)
xiahouba:addSkills { "baobian" }
xiahouba:addRelatedSkills {"ol_ex__tiaoxin", "ex__paoxiao", "ol_ex__shensu" }
Fk:loadTranslationTable{
  ["xiahouba"] = "夏侯霸",
  ["#xiahouba"] = "棘途壮志",
  ["illustrator:xiahouba"] = "熊猫探员",

  ["$ol_ex__tiaoxin_xiahouba1"] = "跪下受降，饶你不死！",
  ["$ol_ex__tiaoxin_xiahouba2"] = "黄口小儿，可听过将军名号？",
  ["$ex__paoxiao_xiahouba1"] = "喝！",
  ["$ex__paoxiao_xiahouba2"] = "受死吧！",
  ["$ol_ex__shensu_xiahouba1"] = "冲杀敌阵，来去如电！",
  ["$ol_ex__shensu_xiahouba2"] = "今日有恙在身，须得速战速决！",
  ["~xiahouba"] = "弃魏投蜀，死而无憾。",
}

General(extension, "chenlin", "wei", 3):addSkills { "bifa", "songci" }
Fk:loadTranslationTable{
  ["chenlin"] = "陈琳",
  ["#chenlin"] = "破竹之咒",
  ["designer:chenlin"] = "韩旭",
  ["illustrator:chenlin"] = "木美人",

  ["~chenlin"] = "来人……我的笔呢……",
}

local daqiaoxiaoqiao = General(extension, "daqiaoxiaoqiao", "wu", 3, 3, General.Female)
daqiaoxiaoqiao:addSkills { "xingwu", "luoyan" }
daqiaoxiaoqiao:addRelatedSkill("tianxiang")
daqiaoxiaoqiao:addRelatedSkill("liuli")
Fk:loadTranslationTable{
  ["daqiaoxiaoqiao"] = "大乔小乔",
  ["#daqiaoxiaoqiao"] = "江东之花",
  ["designer:daqiaoxiaoqiao"] = "韩旭",
  ["illustrator:daqiaoxiaoqiao"] = "木美人",

  ["$tianxiang_daqiaoxiaoqiao1"] = "替我挡着吧~",
  ["$tianxiang_daqiaoxiaoqiao2"] = "哼！我才不怕你呢~",
  ["$liuli_daqiaoxiaoqiao1"] = "呵呵，交给你啦~",
  ["$liuli_daqiaoxiaoqiao2"] = "不懂得怜香惜玉么~",
  ["~daqiaoxiaoqiao"] = "伯符，公瑾，请一定要守护住我们的江东啊！",
}

local godlvbu = General(extension, "sp__godlvbu", "god", 5)
godlvbu:addSkills { "kuangbao", "wumou", "wuqian", "shenfen" }
godlvbu:addRelatedSkill("wushuang")
godlvbu.hidden = true
Fk:loadTranslationTable{
  ["sp__godlvbu"] = "神吕布",
  ["#sp__godlvbu"] = "修罗之道",
  ["illustrator:sp__godlvbu"] = "干橘子",
}

General(extension, "sp__xiahoushi", "shu", 3, 3, General.Female):addSkills { "sp__yanyu", "xiaode" }
Fk:loadTranslationTable{
  ["sp__xiahoushi"] = "夏侯氏",
  ["#sp__xiahoushi"] = "疾冲之恋",
  ["illustrator:sp__xiahoushi"] = "牧童的短笛",
  ["designer:sp__xiahoushi"] = "桃花僧",
  ["cv:sp__xiahoushi"] = "橘枍shii吖",

  ["~sp__xiahoushi"] = "燕语叮嘱，愿君安康。",
}

General(extension, "yuejin", "wei", 4):addSkills { "sp__xiaoguo" }
Fk:loadTranslationTable{
  ["yuejin"] = "乐进",
  ["#yuejin"] = "奋强突固",
  ["illustrator:yuejin"] = "巴萨小马",

  ["~yuejin"] = "箭疮发作，吾命休矣。",
}

General(extension, "zhangbao", "qun", 3):addSkills { "zhoufu", "yingbing" }
Fk:loadTranslationTable{
  ["zhangbao"] = "张宝",
  ["#zhangbao"] = "地公将军",
  ["designer:zhangbao"] = "韩旭",
  ["illustrator:zhangbao"] = "大佬荣",

  ["~zhangbao"] = "黄天……为何？！",
}

General(extension, "caoang", "wei", 4):addSkills { "kangkai" }
Fk:loadTranslationTable{
  ["caoang"] = "曹昂",
  ["#caoang"] = "取义成仁",
  ["designer:caoang"] = "韩旭",
  ["illustrator:caoang"] = "Zero",

  ["~caoang"] = "典将军，还是你赢了……",
}

General(extension, "zhugejin", "wu", 3):addSkills { "huanshi", "hongyuan", "mingzhe" }
Fk:loadTranslationTable{
  ["zhugejin"] = "诸葛瑾",
  ["#zhugejin"] = "联盟的维系者",
  ["designer:zhugejin"] = "韩旭",
  ["illustrator:zhugejin"] = "G.G.G.",

  ["~zhugejin"] = "君臣不相负，来世复君臣。",
}

General(extension, "xingcai", "shu", 3, 3, General.Female):addSkills { "shenxian", "qiangwu" }
Fk:loadTranslationTable{
  ["xingcai"] = "星彩",
  ["#xingcai"] = "敬哀皇后",
  ["designer:xingcai"] = "韩旭",
  ["illustrator:xingcai"] = "depp",
  ["cv:xingcai"] = "shourei小N",

  ["~xingcai"] = "复兴汉室之路，臣妾再也不能陪伴左右了……",
}

General(extension, "panfeng", "qun", 4):addSkills { "sp__kuangfu" }
Fk:loadTranslationTable{
  ["panfeng"] = "潘凤",
  ["#panfeng"] = "联军上将",
  ["illustrator:panfeng"] = "G.G.G.",

  ["~panfeng"] = "来者……可是魔将……",
}

General(extension, "zumao", "wu", 4):addSkills { "yinbing", "juedi" }
Fk:loadTranslationTable{
  ["zumao"] = "祖茂",
  ["#zumao"] = "碧血染赤帻",
  ["designer:zumao"] = "韩旭",
  ["illustrator:zumao"] = "DH",

  ["~zumao"] = "孙将军，已经，安全了吧……",
}

General:new(extension, "dingfeng", "wu", 4):addSkills{"sp__duanbing", "sp__fenxun"}
Fk:loadTranslationTable{
  ["dingfeng"] = "丁奉",
  ["#dingfeng"] = "清侧重臣",
  ["illustrator:dingfeng"] = "G.G.G.",
  ["~dingfeng"] = "这风，太冷了。",
}

local zhugedan = General(extension, "zhugedan", "wei", 4)
zhugedan:addSkills { "gongao", "juyi" }
zhugedan:addRelatedSkills{ "benghuai", "weizhong" }
Fk:loadTranslationTable{
  ["zhugedan"] = "诸葛诞",
  ["#zhugedan"] = "薤露蒿里",
  ["designer:zhugedan"] = "韩旭",
  ["illustrator:zhugedan"] = "雪君S",

  ["$benghuai_zhugedan"] = "咳……咳咳……",
  ["~zhugedan"] = "诸葛一氏定会为我复仇！",
}

General:new(extension, "hetaihou", "qun", 3, 3, General.Female):addSkills{ "zhendu", "qiluan" }
Fk:loadTranslationTable{
  ["hetaihou"] = "何太后",
  ["#hetaihou"] = "弄权之蛇蝎",
  ["cv:hetaihou"] = "水原",
  ["designer:hetaihou"] = "淬毒",
  ["illustrator:hetaihou"] = "琛·美弟奇",

  ["~hetaihou"] = "你们男人造的孽，非要说什么红颜祸水……",
}

General:new(extension, "sunluyu", "wu", 3, 3, General.Female):addSkills{ "meibu", "mumu" }
Fk:loadTranslationTable{
  ["sunluyu"] = "孙鲁育",
  ["#sunluyu"] = "舍身饲虎",
  ["cv:sunluyu"] = "sakula小舞",
  ["designer:sunluyu"] = "桃花僧",
  ["illustrator:sunluyu"] = "depp",

  ["~sunluyu"] = "姐姐，你且好自为之……",
}

General:new(extension, "maliang", "shu", 3):addSkills{ "xiemu", "naman" }
Fk:loadTranslationTable{
  ["maliang"] = "马良",
  ["#maliang"] = "白眉智士",
  ["illustrator:maliang"] = "LiuHeng",

  ["~maliang"] = "皇叔为何不听我之言？",
}

General:new(extension, "sp__zhangliang", "qun", 4):addSkills{ "sp__jijun", "sp__fangtong" }
Fk:loadTranslationTable{
  ["sp__zhangliang"] = "张梁",
  ["#sp__zhangliang"] = "黄昏的斗蛾",
  ["illustrator:sp__zhangliang"] = "LiuHeng",
}

General:new(extension, "ganfuren", "shu", 3, 3, General.Female):addSkills{ "sp__shushen", "sp__shenzhi" }
Fk:loadTranslationTable{
  ["ganfuren"] = "甘夫人",
  ["#ganfuren"] = "昭烈皇后",
  ["illustrator:ganfuren"] = "琛·美弟奇",

  ["~ganfuren"] = "请替我照顾好阿斗。",
}

General:new(extension, "huangjinleishi", "qun", 3, 3, General.Female):addSkills{ "fulu", "zhuji" }
Fk:loadTranslationTable{
  ["huangjinleishi"] = "黄巾雷使",
  ["#huangjinleishi"] = "雷祭之姝",
  ["cv:huangjinleishi"] = "穆小橘v（新月杀原创）",
  ["designer:huangjinleishi"] = "韩旭",
  ["illustrator:huangjinleishi"] = "depp",

  ["~huangjinleishi"] = "速报大贤良师……大事已泄……",
}

General:new(extension, "wenpin", "wei", 4):addSkills{ "zhenwei" }
Fk:loadTranslationTable{
  ["wenpin"] = "文聘",
  ["#wenpin"] = "坚城宿将",
  ["illustrator:wenpin"] = "G.G.G.",

  ["~wenpin"] = "终于……也守不住了……",
}

General:new(extension, "simalang", "wei", 3):addSkills{ "junbing", "quji" }
Fk:loadTranslationTable{
  ["simalang"] = "司马朗",
  ["#simalang"] = "再世神农",
  ["designer:simalang"] = "韩旭",
  ["illustrator:simalang"] = "Sky",

  ["~simalang"] = "微功未效，有辱国恩……",
}

return extension
