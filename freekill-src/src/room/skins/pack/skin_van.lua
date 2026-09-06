local extension = Package:new("skin_van", Package.SkinPack)
extension.extensionName = "lunarltk_skins"
local U = require "packages.lunarltk_skins.utility.utility"

local urls = "https://cnb.cool/Vanshang-Org/pic/-/git/raw/main/skins/static/"
local urlv = "https://cnb.cool/Vanshang-Org/pic/-/git/raw/main/skins/video/"

---@param generals string[]
---@param skins string[]
local asev = function(generals, skins)
  extension:addSkinPackage {
    url = urlv,
    content = {
      {
        enabled_generals = generals,
        skins = table.map(skins, function(str)
          local subfix = U.split(str, "--")
          Fk:loadTranslationTable{ [str .. ".mp4"] = subfix[#subfix] }
          return str .. ".mp4"
        end)
      },
    }
  }
end

---@param generals string[]
---@param skins string[]
local ases = function(generals, skins)
  extension:addSkinPackage {
    url = urls,
    content = {
      {
        enabled_generals = generals,
        skins = table.map(skins, function(str)
          local subfix = U.split(str, "--")
          Fk:loadTranslationTable{ [str .. ".jpg"] = subfix[#subfix] }
          return str .. ".jpg"
        end)
      },
    }
  }
end

asev(
{ "sunshangxiang", "ex__sunshangxiang","v11__sunshangxiang",  "m_heg__sunshangxiang", "hs__sunshangxiang","js__sunshangxiang","mini_mou__sunshangxiang","mini__sunshangxiang","mou__sunshangxiang","ofl_mou__sunshangxiang", "ofl__sunshangxiang","mrss__sunshangxiang", "wzzz__sunshangxiang","qshm__sunshangxiang","sx__sunshangxiang","tystar__sunshangxiang", "ty_wei__sunshangxiang" },
{ "孙尚香--战场荣耀" })

asev({"zhupeilan"},
{"朱佩兰--兰亭暮雨"})

asev({ "ol__tengfanglan","ty__tengfanglan" },
{ "滕芳兰--拈花靛情" })

asev({ "pangfengyi" },
{ "庞凤衣--金蛟巧刻" })

asev({ "ol__dongguiren" },
{ "董予安--长信有灵" })

ases({ "huanshujun" },
{ "环淑君--游园戏蝶" })

asev({ "caojinyu", "sxfy__caojinyu", "ofl__caojinyu", "ol__caojinyu",},
{ "曹金玉--瓷语青花", "曹金玉--惊鸿倩影" })

asev({ "yanfuren", "os__yanfuren" }, { "严夫人--战场荣耀" })

asev({ "caiwenji", "hs__caiwenji", "mini__caiwenji", "m_ex__caiwenji",
        "ofl_ex__caiwenji", "wzzz__caiwenji", "sxfy__caiwenji", "ol_ex__caiwenji", "sp__caiwenji", },
{ "蔡文姬--寒月仙踪" })

asev({ "caoying", "mobile__caoying", },
{ "曹婴--魏武遗风", "曹婴--流绯惊澜", "曹婴--水清濯缨" })

asev({ "diaochan", "sp__diaochan", "cqym__diaochan", "hs__diaochan", "ex__diaochan", "mou__diaochan",
        "mini_mou__diaochan", "starsp__diaochan", "ty_m__diaochan", "wzzz__diaochan", "ofl__diaochan", "ofl2__diaochan",
        "v11__diaochan" },
{ "貂蝉--秋水伊人" })

asev({ "m_heg__ganfuren", "hs__ganfuren", "mobile__ganfuren", "sxfy__ganfuren", "ty__ganfuren", "ganfuren"},
{ "甘夫人--乞巧情" })

asev({ "ofl_heg__guanyinping", "mobile__guanyinping", "shzj_guansuo__guanyinping", "wzzz__guanyinping", "cqym__guanyinping", "ol__guanyinping", "guanyinping", "ty_wei__guanyinping"},
{ "关银屏--烈焰炽魂" })

asev({ "sxfy__guohuanghou", "ol_ex__guohuanghou", "ty_ex__guohuanghou", "guohuanghou" },
{ "郭皇后--情鹊纷飞" })

asev({ "mobile__huaman","sxfy__huaman","ty__huaman", },
{ "花鬘--沙场蛮花", "花鬘--依心缱绻" })

asev({ "m_shi__luyusheng", "os_shi__luyusheng" },
{ "陆郁生--素心傲雪" })

asev({ "es__sunluban", "m_ex__sunluban", "mini_ex__sunluban", "os_heg__sunluban",
        "sxfy__sunluban", "ol_ex__sunluban", "ty_ex__sunluban", "sunluban", },
{ "孙鲁班--敕幽明" })

asev({ "miniamb__xushi", "xushi", "mini__xushi", "ofl__xushi" },
{ "徐氏--妆成愿遂" })

asev({ "zhaoxiang", "os__zhaoxiang", "ty__zhaoxiang", "qshm__zhaoxiang" },
{ "赵襄--赤晖凌锋", "赵襄--龙跃凤鸣" })

asev({ "miniex__zhenji" },
{ "甄姬--皓月共此" })

asev({ "hs__zhurong", "ofl_ex__zhurong", "ol_ex__zhurong", "olmou__zhurong", "os_ex__zhurong", "zhurong", "mini_mou__zhurong", "miniex__zhurong" },
{ "祝融--火神之怒", "祝融--蛮疆同征", "祝融--浴火焚天", "祝融--浴火蛮神" })

asev({ "miniex__zhurong" },
{ "祝融--山海烬" })

asev({ "caojie", "miniamb__caojie", "fhyx__caojie", "ol_ex__caojie" },
{ "曹节--冰肌玉洁", "曹节--凰汉梦回", "曹节--龙年中秋", "曹节--瑞雪丰年", "曹节--派药治伤" })

asev({ "ol_heg__mayunlu", "os_heg__mayunlu", "ofl__mayunlu", "sxfy__mayunlu", "os__mayunlu", "ty__mayunlu", "mayunlu" },
{ "马云騄--舐伤伴君", "马云騄--新春吉云",})

ases({ "ol_heg__mayunlu", "os_heg__mayunlu", "ofl__mayunlu", "sxfy__mayunlu", "os__mayunlu", "ty__mayunlu", "mayunlu" },
{ "马云騄--花枪西凉", })

asev({ "os_heg__wuguotai", "ld__wuguotai", "m_ex__wuguotai", "ol_ex__wuguotai", "ty_ex__wuguotai", "wuguotai" },
{ "吴国太--金秋玉露", })

asev({ "ol__panshu", "ty__panshu", },
{ "潘淑--江东锦绣", "潘淑--嫣语锦淑", })

asev({ "zhoufei", "m_ex__zhoufei", "ol__zhoufei" },
{ "周妃--碧野箜声", "周妃--金枝玉叶", "周妃--笼中箜响", "周妃--鹊拾夕情", })

asev({ "xiaoqiao", "hs__xiaoqiao", "m_ex__xiaoqiao", "mou__xiaoqiao", "ofl_tx__xiaoqiao","ofl_mou__xiaoqiao", "ofl_ex__xiaoqiao", "ol_ex__xiaoqiao", "olmou__xiaoqiao", "ty_m__xiaoqiao", },
{ "小乔--桂梦弦歌", "小乔--花好月圆" })

asev({ "m_shi__heqi" },
{ "贺齐--长翎贯宇" })

asev({ "m_shi__sunchen" },
{ "孙綝--蚺影缚天" })

asev({ "ol__feiyi" },
{ "费祎--镂舆绘策" })

asev({ "os_heg__zhouchu", "mobile__zhouchu", "sxfy__zhouchu", "os__zhouchu" },
{ "周处--义除三害-吴", "周处--擒虎拿蛟" })

asev({ "ol__zhouchu", "n_jz__zhouchu" },
{ "周处--义除三害-晋" })

asev({ "n_jz__weiyan", "ofl_heg__weiyan", "hs__weiyan", "mini_star__weiyan", "mini_ex__weiyan",
"m_shi__weiyan", "mxing__weiyan", "m_ex__weiyan", "wzzz__weiyan", "ol_ex__weiyan", "os_xing__weiyan",
"weiyan", "ty_m__weiyan" },
{ "魏延--誓死卫汉" })

extension:addSkinPackage {
  url = U.vanshang_url,
  content = {
    {
      enabled_generals = { "mou__xiahoushi", "sp__xiahoushi", "ty_ex__xiahoushi", "xiahoushi", },
      skins = { "xiahoushi_fuguachenli.mp4" }
    },
    {
      enabled_generals = { "n_chicken" },
      skins = { "chick_dynamic.mp4" }
    },
    {
      enabled_generals = { "liutan" },
      skins = { "liutan_yangliuyiyi.mp4" }
    },
    {
      enabled_generals = { "baosanniang", "mobile__baosanniang", "os__baosanniang", "ty__baosanniang", "ol__baosanniang", "sxfy__baosanniang" },
      skins = { "baosanniang_yanranyixiao.mp4" }
    },
    {
      enabled_generals = { "ol__caojinyu" },
      skins = { "caojinyu_test.mp4" }
    },
    {
      enabled_generals = { "caoying", "mobile__caoying" },
      skins = { "caoying_jinzhiyuye.mp4" }
    },
    {
      enabled_generals = { "lingju", "mobile__lingju", "os__lingju", "ol__lingju" },
      skins = { "lingju_hunqiangmengying.mp4" }
    },
    {
      enabled_generals = { "zhangqiying", "ol__zhangqiying", "mobile__zhangqiying", },
      skins = { "zhangqiying_jiyufengnian.mp4" }
    },
    {
      enabled_generals = { "caoxiancaohua" },
      skins = { "caoxiancaohua_jinseliangyuan.mp4", "caoxiancaohua_jinseliangyuan2.mp4" }
    },
    {
      enabled_generals = { "ol_evil__diaochan" },
      skins = { "modiaochan_qunuofuxi.mp4" }
    },
    {
      enabled_generals = { "olz__xuncai" },
      skins = { "xuncai_yinhuamanwu.mp4" }
    },
    {
      enabled_generals = { "wangrongh", "ol_heg__wangrongh" },
      skins = { "wangrong_xiapeiyunmeng.mp4" }
    },
    {
      enabled_generals = { "olz__zhongyan", },
      skins = { "zhongyan_yuemanqianjie.mp4" }
    },
    {
      enabled_generals = { "ol__dingfuren" },
      skins = { "dingshangwan_yelanraomeng.mp4" }
    },
    {
      enabled_generals = { "olz__luyusheng" },
      skins = { "z__luyusheng_ligeyuezhu.jpg" }
    },
  }
}

return extension