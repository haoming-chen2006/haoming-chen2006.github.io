local extension = Package:new("skin_other", Package.SkinPack)
extension.extensionName = "lunarltk_skins"
local U = require "packages.lunarltk_skins.utility.utility"

local rem_url = "https://cdn.jsdelivr.net/gh/Aated/pic@master/"
local rem_skelurl = "https://cdn.jsdelivr.net/gh/Aated/pic@master/skel/"


local old_all_skin = {
  -- 赵姬
  {
    enabled_generals = { "zhaoji" },
    skins = { "zhaoji_mjs.mp4" }
  },
  -- 蕾姆
  {
    enabled_generals = { "fk_dev__rem", },
    skins = { "fk_dev__rem_bride.mp4" }
  },
  -- 乐曹植
  {
    enabled_generals = { "mu__caozhi", },
    skins = { "mu__caozhi_mozongxunyan.jpg" }
  },
  -- 孙寒华
  {
    enabled_generals = { "ol__sunhanhua", "sunhanhua", "ty__sunhanhua", "ofl__sunhanhua", },
    skins = { "sunhanhua_weilingjinxian.mp4", "sunhanhua_xinyutongyi.mp4", "sunhanhua_xinyutongyi2.jpg",
      "sunhanhua_lianyiqinghe.mp4", "sunhanhua_sheniankuanghuan.mp4" }
  },
  -- 清河公主
  {
    enabled_generals = { "qinghegongzhu", "ol__qinghegongzhu", "os__qinghegongzhu",
      "ty__qinghegongzhu", "sxfy__qinghegongzhu", "mobile__qinghegongzhu", },
    skins = { "qinghegongzhu_xinxiangqinghuan.jpg", "qinghegongzhu_meiyingyingxin.mp4",
      "qinghegongzhu_yufeiqionghua.mp4",
      "qinghegongzhu_qingyaqudou.mp4", "qinghegongzhu_wuyinliyan.mp4" }
  },
  -- 钟会
  {
    enabled_generals = { "zhonghui", "ld__zhonghui", "ol_heg__zhonghui", "m_ex__zhonghui", "ofl_wenxin__zhonghui",
      "ofl2__zhonghui", "shzj_juedai__zhonghui", "sxfy__zhonghui", "wzzz__zhonghui", "ol_ex__zhonghui",
      "ty_ex__zhonghui", "tymou__zhonghui", },
    skins = { "zhonghui_zhongxiangguipu.mp4", "zhonghui_longshenjiuzi.jpg" }
  },
  -- 神钟会
  {
    enabled_generals = { "godzhonghui" },
    skins = { "godzhonghui_danghuifeichi.mp4", "godzhonghui_baishuangjishi.jpg" }
  },
  -- 文钦
  {
    enabled_generals = { "wenqin", "ty__wenqin", "ld__wenqin", },
    skins = { "wenqin_jingdian.jpg" }
  },
  -- 族钟会
  {
    enabled_generals = { "olz__zhonghui", },
    skins = { "olz__zhonghui_jinlangongzhan.mp4", "olz__zhonghui_dengtaibaijiang.jpg", "olz__zhonghui_yijianggongcheng.mp4" }
  },
  -- 谋姜维
  {
    enabled_generals = { "mou__jiangwei", "ofl_mou__jiangwei", "olmou__jiangwei", "tymou__jiangwei", },
    skins = { "mou__jiangwei_jinlangongzhan.jpg", "mou__jiangwei_shouyiwujiang.mp4" }
  },
  -- 大乔
  {
    enabled_generals = { "daqiao", "ex__daqiao", "mou__daqiao", "ty_m__daqiao", },
    skins = { "daqiao_huizhilanxin.jpg", "daqiao_chunhuaifuqing.jpg" }
  },
  -- 孙尚香
  {
    enabled_generals = { "sunshangxiang", "ex__sunshangxiang", "v11__sunshangxiang", "m_heg__sunshangxiang",
      "hs__sunshangxiang", "js__sunshangxiang", "mini_mou__sunshangxiang", "mini__sunshangxiang", "mou__sunshangxiang",
      "ofl_mou__sunshangxiang",
      "ofl__sunshangxiang", "mrss__sunshangxiang", "wzzz__sunshangxiang", "qshm__sunshangxiang", "sx__sunshangxiang",
      "tystar__sunshangxiang",
      "ty_wei__sunshangxiang" },
    skins = { "sunshangxiang_niaoyuhuaxiang.jpg", "sunshangxiang_qianhouliangnan.jpg",
      "sunshangxiang_jiaozoongsanjiang.mp4",
      "sunshangxiang_jinguoqianying.mp4" }
  },
  -- 关羽
  {
    enabled_generals = { "guanyu", "ex__guanyu", "ofl_mou__guanyu", "ofl__guanyu", "olmou__guanyu", "tymou__guanyu" },
    skins = { "guanyu_yuzhuobushi.jpg", "guanyu_dandaofuhui.jpg", "guanyu_longshengjiuzi.jpg", "guanyu_shengchuiqiangu2.jpg" }
  },
  -- 势于吉
  {
    enabled_generals = { "m_shi__yuji", },
    skins = { "m_shi__yuji_xingquanjingfu.jpg" }
  },
  -- 势钟会
  {
    enabled_generals = { "m_shi__zhonghui", },
    skins = { "m_shi__zhonghui_qianjiaojitian.mp4", "m_shi__zhonghui_qianjiaojitian2.mp4" }
  },
  -- 貂蝉
  {
    enabled_generals = { "diaochan", "sp__diaochan", "cqym__diaochan", "hs__diaochan", "ex__diaochan", "mou__diaochan",
      "mini_mou__diaochan", "starsp__diaochan", "ty_m__diaochan", "wzzz__diaochan", "ofl__diaochan", "ofl2__diaochan",
      "v11__diaochan" },
    skins = { "diaochan_taotaolejin.jpg", "diaochan_wuhuoqunxin.mp4", "sp__diaochan_huandieyinghun.mp4",
      "diaochan_qiushuiyiren.mp4" }
  },
  -- 神姜维 手杀
  {
    enabled_generals = { "mobile__godjiangwei", },
    skins = { "mobile__godjiangwei_jianyintianlin.mp4" }
  },
  -- 神姜维 十周年
  {
    enabled_generals = { "godjiangwei", "sxfy__godjiangwei", "ofl__godjiangwei", "ofl_le__godjiangwei", },
    skins = { "godjiangwei_zhijianbutian.mp4", "godjiangwei_shujianfubo.mp4", "godjiangwei_weipanliuyi.mp4" }
  },
  -- 柏灵筠
  {
    enabled_generals = { "bailingyun" },
    skins = { "bailingyun_fangyuanluodai.mp4", "bailingyun_zaishuiyifang.jpg", "bailingyun_dieyiwandu.mp4" }
  },
  -- 滕芳兰
  {
    enabled_generals = { "ol__tengfanglan", "ty__tengfanglan" },
    skins = { "tengfanglan_haoluqinlan.mp4" }
  },
  -- 蔡文姬
  {
    enabled_generals = { "caiwenji", "hs__caiwenji", "mini__caiwenji", "m_ex__caiwenji",
      "ofl_ex__caiwenji", "wzzz__caiwenji", "sxfy__caiwenji", "ol_ex__caiwenji", "sp__caiwenji", },
    skins = { "caiwenji_yishenzhengdao.mp4", "caiwenji_qiushuiyiren.mp4" }
  },
  -- SP蔡文姬
  {
    enabled_generals = { "mini_sp__caiwenji", "sp__caiwenji", },
    skins = { "sp__caiwenji_jinxiudaimei.mp4", }
  },
  -- 乐蔡文姬
  {
    enabled_generals = { "mu__caiwenji" },
    skins = { "mu__caiwenji_ruixueyinyun.mp4", "mu__caiwenji_shulifenghua.mp4" }
  },
  -- 杨彪
  {
    enabled_generals = { "yangbiao", "js__yangbiao", "sxfy__yangbiao", "ty__yangbiao", },
    skins = { "yangbiao_guozhizhushi.mp4" }
  },
  -- 小乔
  {
    enabled_generals = { "xiaoqiao", "hs__xiaoqiao", "m_ex__xiaoqiao", "mou__xiaoqiao", "ofl_tx__xiaoqiao",
      "ofl_mou__xiaoqiao", "ofl_ex__xiaoqiao", "ol_ex__xiaoqiao", "olmou__xiaoqiao", "ty_m__xiaoqiao", },
    skins = { "xiaoqiao_lizhitiancheng.mp4" }
  },

  -- 陆郁生
  {
    enabled_generals = { "ty_heg__luyusheng", "luyusheng", "ol__luyusheng" },
    skins = { "luyusheng_zhanchangjueban.mp4", "luyusheng_yuguiyueman.mp4" }
  },
  -- 势陆郁生（已替换）
  -- {
  --   enabled_generals = { "m_shi__luyusheng", "os_shi__luyusheng" },
  --   skins = { "m_shi__luyusheng_suxinaoxue.mp4" }
  -- },
  -- 曹髦
  {
    enabled_generals = { "mobile__caomao", "ofl__caomao", "caomao" },
    skins = { "mobile__caomao_xiaolongpoyuan.mp4", "caomao_longxuexuanhuang.mp4" }
  },
  -- 曹髦2 变身
  {
    enabled_generals = { "mobile2__caomao" },
    skins = { "mobile2__caomao_xiaolongpoyuan.mp4", }
  },
  -- 司马昭
  {
    enabled_generals = { "heg__simazhao", "ld__simazhao", "ol_heg__simazhao", "js__simazhao", "mobile__simazhao"
    , "m_sp__simazhao", "bgm__simazhao", "ofl__simazhao", "sxfy__simazhao", "ol__simazhao", },
    skins = { "simazhao_zhaoweihuainan.mp4", "simazhao_denglujiemian.mp4", "simazhao_longxuexuanhuang.mp4",
      "simazhao_zhaosuyuanxin.jpg", "simazhao_yongduokuishou.jpg", "simazhao_wenqingliangyuan.jpg" }
  },
  -- 文鸯
  {
    enabled_generals = { "heg__wenyang", "js__wenyang", "mobile__wenyang", "ofl__wenyang", "sxfy__wenyang"
    , "wenyang" },
    skins = { "wenyang_wu_poyukaitian.mp4", "wenyang_wei_poyukaitian.mp4", "wenyang_shiruowanjun.mp4" }
  },
  -- 戏志才
  {
    enabled_generals = { "xizhicai", "olmou__xizhicai", },
    skins = { "xizhicai_chanazhanhua.mp4", "xizhicai_renyongyiqie.jpg" }
  },
  -- 步练师
  {
    enabled_generals = { "bulianshi", "ty_ex__bulianshi", "re__bulianshi", "ol_ex__bulianshi", "wzzz__bulianshi"
    , "m_ex__bulianshi", "os_heg__bulianshi" },
    skins = { "bulianshi_bieheguluan.mp4", "bulianshi_qiushuiyiren.mp4", }
  },
  -- 神庞统
  {
    enabled_generals = { "godpangtong", },
    skins = { "godpangtong_zhenhuafutian.mp4" }
  },
  -- 刘焉
  {
    enabled_generals = { "ofl_heg__liuyan", "js__liuyan", "liuyan", },
    skins = { "liuyan_jiuxiwending.mp4", "liuyan_xiongjuyizhou.mp4", "liuyan_longxingshuchuan.mp4",
      "liuyan_zhanchangrongyao.mp4",
      "liuyan_qiushuangjinfeng.mp4" }
  },
  -- 郭嘉
  {
    enabled_generals = { "hs__guojia", "js__guojia", "mini_mou__guojia", "mou__guojia", "ofl3__guojia", "ofl2__guojia",
      "ofl__guojia", "wzzz__guojia", "olmou__guojia", "guojia", "ex__guojia", },
    skins = { "guojia_yishenzhengdao.mp4", "guojia_modianjiangshan.mp4" }
  },
  -- 神郭嘉
  {
    enabled_generals = { "godguojia", "sxfy__godguojia", "ofl_shiji__godguojia", },
    skins = { "godguojia_yixinzheyue.mp4", "godguojia_yixinzheyue2.mp4" }
  },
  -- 谋郭嘉 阳 十周年
  {
    enabled_generals = { "tymou__guojia" },
    skins = { "tymou__guojia_moxuechuqing.jpg" }
  },
  -- 谋郭嘉 阴 十周年
  {
    enabled_generals = { "tymou2__guojia" },
    skins = { "tymou2__guojia_moxuechuqing.jpg" }
  },
  -- 曹芳
  {
    enabled_generals = { "js__caofang", "caofang", },
    skins = { "caofang_langjihupo.jpg", }
  },
  -- 周宣
  {
    enabled_generals = { "zhouxuan" },
    skins = { "zhouxuan_zhenmengnanke.jpg" }
  },
  -- SP赵云
  {
    enabled_generals = { "ty_m_sp__zhaoyun", "jsp__zhaoyun", "starsp__zhaoyun", "wzzz__zhaoyun", },
    skins = { "sp__zhaoyun_weimingjinxian.mp4" }
  },
  -- 孙鲁育
  {
    enabled_generals = { "ty__sunluyu", "sunluyu", "ol__sunluyu", "sxfy__sunluyu", "mobile__sunluyu"
    , "mini__sunluyu", },
    skins = { "sunluyu_huweibobing.jpg" }
  },
  -- 贾诩
  {
    enabled_generals = { "mou__jiaxu", "chaos__jiaxu", "hs__jiaxu", "mini__jiaxu", "ofl_mou__jiaxu"
    , "ofl_ex__jiaxu", "ofl3__jiaxu", "ofl_ex2__jiaxu", "ofl2__jiaxu", "ofl__jiaxu", "wzzz__jiaxu",
      "ol_ex__jiaxu", "olmou__jiaxu", "ol_sp__jiaxu", "jiaxu", "sp__jiaxu", "ty__jiaxu", "tymou__jiaxu", "ty_m__jiaxu", },
    skins = { "jiaxu_mouluanchangan.mp4", "jiaxu_dangranyouxin.mp4" }
  },
  -- 谋张让
  {
    enabled_generals = { "olmou__zhangrang", },
    skins = { "olmou__zhangrang_niejinsilong.mp4", "olmou__zhangrang_niejinsilong2.jpg" }
  },
  -- 杨艳
  {
    enabled_generals = { "yangyan", "var__yangyan" },
    skins = { "yangyan_suyanxiufang.jpg" }
  },
  -- 威孙权
  {
    enabled_generals = { "ty_wei__sunquan", },
    skins = { "ty_wei__sunquan_huilingjueding.mp4" }
  },
  -- 许靖
  {
    enabled_generals = { "ofl_shiji__xujing", "ol__xujing", "os__xujing", "ty__xujing", },
    skins = { "xujing_danfengyingtong.jpg" }
  },
  -- 诸葛亮
  {
    enabled_generals = { "zhugeliang", "hs__zhugeliang", "js__zhugeliang", "mou__zhugeliang", "ofl_mou__zhugeliang",
      "ofl__zhugeliang", "wzzz__zhugeliang", "olmou__zhugeliang", "ex__zhugeliang", "wm__zhugeliang",
      "ty_m__zhugeliang", },
    skins = { "zhugeliang_yizhenqingmeng.mp4", "zhugeliang_shanhewuyang.jpg", "zhugeliang_guozhizhushi.mp4" }
  },
  -- 乐貂蝉
  {
    enabled_generals = { "mu__diaochan", },
    skins = { "diaochan_yuexiapianqian.mp4" }
  },
  -- 诸葛果
  {
    enabled_generals = { "zhugeguo", "mini__zhugeguo", "ofl__zhugeguo", "sxfy__zhugeguo",
      "ol__zhugeguo", "os__zhugeguo", "ty__zhugeguo", },
    skins = { "zhugeguo_jinzhiyuye.jpg", "zhugeguo_qiushuiyiren.mp4" }
  },
  -- 乐诸葛果
  {
    enabled_generals = { "mu__zhugeguo", },
    skins = { "mu__zhugeguo_qingyiyingyue.mp4" }
  },
  -- 乐祢衡
  -- {
  --   enabled_generals = { "mu__miheng", },
  --   skins = {  }
  -- },
  -- 张嫙
  {
    enabled_generals = { "zhangxuan", "sxfy__zhangxuan", "js__zhangxuan", },
    skins = { "zhangxuan_meituchunjiao.mp4", "zhangxuan_zhanchangyongyao.mp4", "zhangxuan_qingluannihuang.mp4",
    }
  },
  -- 夏侯玄
  {
    enabled_generals = { "xiahouxuan", "ofl__xiahouxuan", "ty__xiahouxuan", },
    skins = { "xiahouxuan_zhuangzhoumengdie.jpg" }
  },
  -- 孙策
  -- {
  --   enabled_generals = { "ld__sunce", "js__sunce", "m_ex__sunce", "mou__sunce", "ofl_tx__sunce", "ofl_ex__sunce",
  --     "ofl__sunce", "wzzz__sunce", "ol_ex__sunce", "sunce", "ty_m__sunce", "ty_wei__sunce", "tycl__sunce", },
  --   skins = {}
  -- },
  -- 许劭
  {
    enabled_generals = { "ty__xushao", "sxfy__xushao", "js__xushao", "js_re__xushao", },
    skins = { "xushao_pingshidiaolong.mp4", "xushao_fenghuoliantian.jpg" }
  },
  -- 杨芷
  {
    enabled_generals = { "yangzhi", "var__yangzhi", },
    skins = { "yangzhi_yanzhiyanzhi.mp4", "yangzhi_huanhuazhijin.mp4" }
  },
  -- 徐妏
  {
    enabled_generals = { "xuwen", },
    skins = { "xuwen_jinsefanghua.mp4" }
  },
  -- 乐小乔
  {
    enabled_generals = { "mu__xiaoqiao", },
    skins = { "mu__xiaoqiao_nuanfenglianxin.mp4", }
  },
  -- 乐大乔
  {
    enabled_generals = { "mu__daqiao", },
    skins = { "mu__daqiao_nuanfenglianxin.mp4", "mu__daqiao_ruanyuwenxiang.mp4" }
  },
  -- 辛宪英
  {
    enabled_generals = { "xinxianying", "ty__xinxianying", "ol__xinxianying", "ol_ex__xinxianying", "ofl__xinxianying",
      "ofl_heg__xinxianying", "m_shi__xinxianying", },
    skins = { "xinxianying_fengzhuluanhui.mp4", "xinxianying_jinxiudaimei.mp4" }
  },
  -- 族吴苋
  {
    enabled_generals = { "olz__wuxian", },
    skins = { "olz__wuxian_fengxianjinlv.mp4", "olz__wuxian_jinhuxiangle.jpg" }
  },
  -- 鲍三娘
  {
    enabled_generals = { "ol__baosanniang", "ty__baosanniang", "os__baosanniang", "sxfy__baosanniang",
      "mobile__baosanniang",
      "mini__baosanniang", },
    skins = { "baosanniang_tujiaochunnong.mp4", "baosanniang_satafeishuang.mp4", "baosanniang_shenqinggujian.mp4" }
  },
  -- 威马超
  {
    enabled_generals = { "ty_wei__machao", },
    skins = { "ty_wei__machao_lizhanzhuozheng.mp4" }
  },
  -- 董絮
  {
    enabled_generals = { "dongxu", },
    skins = { "dongxu_renmiantaohua.jpg", "dongxu_jilangliuying.jpg", "dongxu_guyinglingding.jpg" }
  },
  -- 芮姬
  {
    enabled_generals = { "ruiji", },
    skins = { "ruiji_chunjiaolanman.jpg", "ruiji_lianliduanyang.jpg" }
  },
  -- 黄舞蝶
  {
    enabled_generals = { "huangwudie", "sxfy__huangwudie", },
    skins = { "huangwudie_jianshoujiaotu.jpg", "huangwudie_yuelandieying.mp4" }
  },
  -- 任婉
  {
    enabled_generals = { "renwan", },
    skins = { "renwan_chunxiaocaiyi.jpg" }
  },
  -- 崔令仪
  {
    enabled_generals = { "cuilingyi", },
    skins = { "cuilingyi_xiaoshandiezong.jpg", "cuilingyi_queduxianyuan.jpg" }
  },
  -- 威刘备
  {
    enabled_generals = { "ty_wei__liubei", },
    skins = { "ty_wei__liubei_zhenmengtaoyuan.jpg" }
  },
  -- 刘璿
  {
    enabled_generals = { "liuxuan", "ty__liuxuan", },
    skins = { "liuxuan_daojiesiyi.jpg" }
  },
  -- 凌烈
  {
    enabled_generals = { "linglie", },
    skins = { "linglie_talangquhu.jpg" }
  },
  -- 蒋济
  -- {
  --   enabled_generals = { "jiangji", },
  --   skins = {  }
  -- },
  -- 邹氏
  {
    enabled_generals = { "hs__zoushi", "js__zoushi", "sxfy__zoushi", "ty__zoushi", },
    skins = { "js__zoushi_zhengmianduijue.jpg" }
  },
  -- 乐邹氏
  {
    enabled_generals = { "mu__zoushi", },
    skins = { "mu__zoushi_shulifenghua.mp4" }
  },
  -- 侯昭宁
  {
    enabled_generals = { "houzhaoning", },
    skins = { "houzhaoning_liuyingxiying.jpg" }
  },
  -- 李昭仪
  {
    enabled_generals = { "lizhaoyi", },
    skins = { "lizhaoyi_huijianguxin.jpg" }
  },
  -- 张昌蒲
  {
    enabled_generals = { "mini__zhangchangpu", "ty__zhangchangpu", "mobile__zhangchangpu", "os_heg__zhangchangpu", },
    skins = { "zhangchangpu_zhanchangrongyao.jpg" }
  },
  -- 丁尚涴
  {
    enabled_generals = { "dingfuren", "ol__dingfuren", },
    skins = { "dingfuren_yizhucanghai.jpg", "dingfuren_zhengmianduijue.jpg" }
  },
  -- 莫琼树
  {
    enabled_generals = { "moqiongshu", },
    skins = { "moqiongshu_shengjuanyouchong.jpg", "moqiongshu_shulifenghua.mp4" }
  },
  -- 曹宪
  {
    enabled_generals = { "caoxian", },
    skins = { "caoxian_yuanchunchengxiang.mp4", "caoxian_jushuixihe.mp4", "caoxian_jinshushijuan.mp4" }
  },
  -- 族荀彧
  {
    enabled_generals = { "olz__xunyu", },
    skins = { "olz__xunyu_guzhaoqianzai.mp4" }
  },
  -- 威张星彩
  {
    enabled_generals = { "ty_wei__xingcai", },
    skins = { "ty_wei__xingcai_wuxingtai.mp4" }
  },
  -- 神甘宁
  {
    enabled_generals = { "godganning", },
    skins = { "godganning_zhanpowujian.mp4", "godganning_shenweirumang.mp4", "godganning_wanrenbiyi.mp4",
      "godganning_zhanchangrongyao.mp4" }
  },
  -- 威董卓
  {
    enabled_generals = { "ty_wei__dongzhuo", },
    skins = { "ty_wei__dongzhuo_jingdian.mp4", "ty_wei__dongzhuo_taishanbengshi.mp4" }
  },
  -- 陈珪
  {
    enabled_generals = { "chengui", "mobile__chengui", },
    skins = { "chengui_zhanchangrongyao.mp4" }
  },
  -- 曹丕
  {
    enabled_generals = { "m_ex__caopi", "ofl_wenxin__caopi", "caopi", "ty_m__caopi", "ofl__caopi", "ty_wei__caopi",
      "sx__caopi", "ol_le__caopi", "ofl3__caopi", "ofl2__caopi", },
    skins = { "caopi_dangranyouxin.mp4", "caopi_longnianzhongqiu.mp4", "caopi_weiwangchengdi.mp4", "caopi_jiuzuiyeqing.jpg" }
  },
  -- 谋曹丕
  {
    enabled_generals = { "mou__caopi", "ofl_mou__caopi", "os_mou__caopi", },
    skins = { "mou__caopi_qidangshanhe.mp4" }
  },
  -- 神曹丕
  {
    enabled_generals = { "godcaopi", "ty__godcaopi", },
    skins = { "godcaopi_jingdian.mp4" }
  },
  -- 神太史慈
  {
    enabled_generals = { "godtaishici", "sxfy__godtaishici", },
    skins = { "godtaishici_yonghanriyue.jpg", "godtaishici_wanmodangchu.jpg" }
  },
  -- 武陆逊
  {
    enabled_generals = { "wm__luxun", },
    skins = { "wm__luxun_shiwuhuairu.mp4", "wm__luxun_shenxiuzhengrong.jpg" }
  },
  -- 武诸葛亮
  {
    enabled_generals = { "wm__zhugeliang", },
    skins = { "wm__zhugeliang_jingdian.mp4", "wm__zhugeliang_qianguyixiang.jpg" }
  },
  -- 王异
  {
    enabled_generals = { "wangyi", "nos__wangyi", "ty_ex__wangyi", "ol_ex__wangyi", },
    skins = { "wangyi_qingtianxieyu.mp4", "wangyi_zhanchangrongyao.mp4", "wangyi_jinguozhanye.mp4" }
  },
  -- 神鲁肃
  {
    enabled_generals = { "godlusu", },
    skins = { "godlusu_jiuzhouweiju.jpg" }
  },
  -- 神吕布
  {
    enabled_generals = { "mobile__godlvbu", "ofl_tx__godlvbu", "ofl__godlvbu", "godlvbu", },
    skins = { "godlvbu_guanjuefeijiang.mp4" }
  },
  -- 神邓艾
  {
    enabled_generals = { "goddengai", },
    skins = { "goddengai_julinghanyu.mp4" }
  },
  -- 董绾
  {
    enabled_generals = { "dongwan", },
    skins = { "dongwan_changleweiyang.mp4" }
  },
  -- 何太后
  {
    enabled_generals = { "hetaihou", "ol__hetaihou", "ofl__hetaihou", "ld__hetaihou", },
    skins = { "hetaihou_zhanchangrongyao.mp4" }
  },
  -- 曹婴
  {
    enabled_generals = { "caoying", "mobile__caoying", },
    skins = { "caoying_changyelinxi.mp4", "caoying_baiquemingchen.mp4", "caoying_shuiqingzhuoying.mp4",
      "caoying_weiyingfengming.jpg" }
  },
  -- 张瑾云
  {
    enabled_generals = { "zhangjinyun", },
    skins = { "zhangjinyun_nuanfengniaoniao.mp4", "zhangjinyun_yaoyinghuanyue.jpg" }
  },
  -- 王元姬
  {
    enabled_generals = { "ty__wangyuanji", "ol__wangyuanji", "sxfy__wangyuanji", "bgm__wangyuanji",
      "mobile__wangyuanji",
      "mini__wangyuanji", "ol_heg__wangyuanji", "heg__wangyuanji", },
    skins = { "wangyuanji_dieyingpianqian.mp4", "wangyuanji_wenqingliangyuan.jpg", "wangyuanji_caiyimanwu.mp4",
      "wangyuanji_posuoqiwu.mp4" }
  },
  -- 势太史慈
  {
    enabled_generals = { "m_shi__taishici", },
    skins = { "m_shi__taishici_yilingwanxiang.mp4" }
  },
  -- 势魏延
  {
    enabled_generals = { "m_shi__weiyan", },
    skins = { "m_shi__weiyan_kuangzhituntian.mp4" }
  },
  -- 势魏延2
  {
    enabled_generals = { "m_shi2__weiyan", },
    skins = { "m_shi2__weiyan_kuangzhituntian.mp4" }
  },
  -- 势魏延3
  {
    enabled_generals = { "m_shi3__weiyan", },
    skins = { "m_shi3__weiyan_kuangzhituntian.mp4" }
  },
  -- 周瑜
  {
    enabled_generals = { "zhouyu", "hs__zhouyu", "mini_mou__zhouyu", "mou__zhouyu", "ofl_tx__zhouyu", "ofl__zhouyu",
      "ofl4__zhouyu", "ofl2__zhouyu", "ofl3__zhouyu", "ofl5__zhouyu", "wzzz__zhouyu", "olmou__zhouyu", "ex__zhouyu"
    , "ty_m__zhouyu", },
    skins = { "zhouyu_yaxiangzhenzhu.jpg" }
  },
  -- 谋周瑜（阳）
  {
    enabled_generals = { "tymou__zhouyu", },
    skins = { "tymou__zhouyu_jiangshanruhua.mp4" }
  },
  -- 谋周瑜（阴）
  {
    enabled_generals = { "tymou2__zhouyu", },
    skins = { "tymou2__zhouyu_jiangshanruhua.mp4" }
  },
  -- 司马师
  {
    enabled_generals = { "heg__simashi", "ol_heg__simashi", "os_heg__simashi", "mini__simashi", "sxfy__simashi",
      "qshm__simashi", "ol__simashi", "os__simashi", "tymou__simashi", },
    skins = { "simashi_dushidinghuai.jpg", "simashi_cuidizheku.mp4", }
  },
  -- 徐荣
  {
    enabled_generals = { "ofl_heg__xurong", "mobile__xurong", "xurong", },
    skins = { "xurong_nuliaohengkong.mp4", "xurong_nuliaohengkong2.mp4", "xurong_lieyanzhihun.jpg",
      "xurong_zhanhuotianjue.mp4" }
  },
  -- 界徐盛
  {
    enabled_generals = { "ty_ex__xusheng", "ol_ex__xusheng", "m_ex__xusheng", "ol_ex_heg__xusheng", },
    skins = { "ol_ex__xusheng_pojunshajiang.mp4" }
  },
  -- 徐盛
  {
    enabled_generals = { "ty_ex__xusheng", "ol_ex__xusheng", "m_ex__xusheng", "ol_ex_heg__xusheng",
      "mouxusheng", "v33__xusheng", "ld__xusheng", "shzj_guansuo__xusheng", "wzzz__xusheng", "re__xusheng",
      "tymou__xusheng", "xusheng", },
    skins = { "xusheng_caodaobige.mp4" }
  },
  -- 极蔡文姬
  {
    enabled_generals = { "miniex__caiwenji", },
    skins = { "miniex__caiwenji_hanyuexianzong.mp4" }
  },
  -- 郭女王
  {
    enabled_generals = { "mobile__guozhao", "sxfy__guozhao", "os__guozhao", },
    skins = { "mobile__guozhao_quehanjingfeng.mp4" }
  },
  -- 董翓
  {
    enabled_generals = { "ol__dongxie", "dongxie", },
    skins = { "dongxie_jinchengyinyan.mp4", "dongxie_yuehuiyingtu.jpg" }
  },
  -- 管宁
  {
    enabled_generals = { "guanning", },
    skins = { "guanning_moyunhexiang.mp4", "guanning_danhefuyun.mp4" }
  },
  -- 谋司马懿
  {
    enabled_generals = { "tymou__simayi", },
    skins = { "tymou__simayi_yinlongruhui.mp4" }
  },
  -- 张辽 魏
  {
    enabled_generals = { "zhangliao", "hs__zhangliao", "mini_mou__zhangliao", "m_thoroughbred__zhangliao",
      "mou__zhangliao",
      "ofl__zhangliao", "wzzz__zhangliao", "os_thoroughbred__zhangliao", "ex__zhangliao", },
    skins = { "zhangliao_longshengjiuzi.mp4", "zhangliao_benleipozhen.jpg" }
  },
  -- 神荀彧
  {
    enabled_generals = { "godxunyu", "sxfy__godxunyu", "ofl_shiji__godxunyu", },
    skins = { "godxunyu_kuanghanyanzuo.mp4", "godxunyu_weihanjianan.mp4" }
  },
  -- 卢氏
  {
    enabled_generals = { "lushi", },
    skins = { "lushi_dielianqingman.mp4" }
  },
  -- 神赵云
  {
    enabled_generals = { "godzhaoyun", "ty_m__godzhaoyun", "nos__godzhaoyun", "ofl__godzhaoyun", },
    skins = { "godzhaoyun_linzhenjiuxiao.mp4", "godzhaoyun_zhanlongzaiye.mp4", "godzhaoyun_longtenghuyue.mp4",
      "godzhaoyun_baizhanjinjia.mp4" }
  },
  -- 诸葛瑾
  {
    enabled_generals = { "ol__zhugejin", "v33__zhugejin", "os_heg__zhugejin", "mou__zhugejin", "wzzz__zhugejin",
      "os_mou__zhugejin", "zhugejin", "tymou__zhugejin", "tystar__zhugejin", },
    skins = { "zhugejin_zuolonganlan.jpg" }
  },
  -- 马忠
  {
    enabled_generals = { "ol__mazhong", "ty_ex__mazhong", "mazhong", },
    skins = { "mazhong_gangfengzhuokou.jpg" }
  },
  -- 族王浑
  {
    enabled_generals = { "olz__wanghun", },
    skins = { "olz__wanghun_yuemanqianjie.jpg" }
  },
  -- 羊徽瑜
  {
    enabled_generals = { "ty__yanghuiyu", "mobile__yanghuiyu", "os_heg__yanghuiyu", "heg__yanghuiyu",
      "ol__yanghuiyu", "ol_heg__yanghuiyu", },
    skins = { "yanghuiyu_sheniankuanghuan.mp4", "yanghuiyu_jingyuhehui.mp4", "yanghuiyu_yueyaohuashang.mp4" }
  },
  -- 赵嫣
  {
    enabled_generals = { "sxfy__zhaoyanw", "zhaoyanw", },
    skins = { "zhaoyanw_yuemanyujing.mp4" }
  },
  -- 张媱
  {
    enabled_generals = { "zhangyao", "os__zhangyao", },
    skins = { "zhangyao_shuangshuchuoyue.jpg" }
  },
  -- 张琪瑛
  {
    enabled_generals = { "mobile__zhangqiying", "ol__zhangqiying", "zhangqiying", },
    skins = { "zhangqiying_lianyanqingfang.jpg", "zhangqiying_suirennianfeng.jpg" }
  },
  -- 族陆绩
  {
    enabled_generals = { "olz__luji", "ofl__luji", },
    skins = { "olz__luji_zhuxingshixiang.jpg" }
  },
  -- 诸葛梦雪
  {
    enabled_generals = { "zhugemengxue", },
    skins = { "zhugemengxue_shulifenghua.jpg" }
  },
  -- 张奋
  {
    enabled_generals = { "mobile__zhangfen", "sxfy__zhangfen", "zhangfen", },
    skins = { "zhangfen_bihaihanshan.jpg" }
  },
  -- 友诸葛亮
  {
    enabled_generals = { "m_friend__zhugeliang", "cqym__zhugeliang", },
    skins = { "m_friend__zhugeliang_mengzhenqianqiu.jpg" }
  },
  -- 友徐庶
  {
    enabled_generals = { "m_friend__xushu", "os_friend__xushu", },
    skins = { "m_friend__xushu_zuilikanjian.jpg" }
  },
  -- 杨婉
  {
    enabled_generals = { "ol__yangwan", "mou__yangwan", "ty_heg__yangwan", "ty__yangwan", },
    skins = { "ol__yangwan_huacuhuairou.jpg" }
  },
  -- 徐晃
  {
    enabled_generals = { "hs__xuhuang", "m_ex__xuhuang", "mou__xuhuang", "ofl_ex__xuhuang", "ofl__xuhuang",
      "wzzz__xuhuang",
      "ol_ex__xuhuang", "xuhuang", "ty_m__xuhuang", },
    skins = { "xuhuang_dangkouzhuojun.jpg" }
  },
  -- 徐氏
  {
    enabled_generals = { "miniamb__xushi", "xushi", "mini__xushi", "ofl__xushi" },
    skins = { "xushi_sijunshanggan.jpg", "xushi_hongdouxiangsi.mp4" }
  },
  -- 荀攸
  {
    enabled_generals = { "ld__xunyou", "xunyou", "ty_ex__xunyou", },
    skins = { "xunyou_yizhanshaochang.jpg" }
  },
  -- 袁绍
  {
    enabled_generals = { "m_heg__lordyuanshao", "hs__yuanshao", "js__yuanshao", "mini_ex__yuanshao",
      "mou__yuanshao", "ofl_tx__yuanshao", "ofl_mou__yuanshao", "ofl2__yuanshao", "ofl__yuanshao",
      "wzzz__yuanshao", "ol_ex__yuanshao", "olmou__yuanshao", "yuanshao", "tystar__yuanshao", "ty_m__yuanshao", },
    skins = { "yuanshao_zhanchangrongyao.jpg", "yuanshao_wojianjichu1.jpg", "yuanshao_wojianjichu2.jpg" }
  },
  -- 羊祜
  {
    enabled_generals = { "heg__yanghu", "ty_heg__yanghu", "mobile__yanghu", "sxfy__yanghu",
      "ofl_shiji__yanghu", "ol__yanghu", "ty__yanghu", },
    skins = { "ol__yanghu_qingshangyimeng.jpg" }
  },
  -- 袁姬
  {
    enabled_generals = { "ol__yuanji", "yuanji", },
    skins = { "yuanji_yintongbinfen.jpg", "yuanji_yueyingchengbi.mp4" }
  },
  -- 阎柔
  {
    enabled_generals = { "yanrou", "os_heg__yanrou", },
    skins = { "yanrou_fushenshubei.jpg" }
  },
  -- 蒋琬
  {
    enabled_generals = { "ty__jiangwan", "tystar__jiangwan", "qw__jiangwan", "sxfy__jiangwan", "ol__jiangwan", "jiangwan", },
    skins = { "jiangwan_chengjiyufeng.jpg", "jiangwan_huguoanmin.jpg" }
  },
  -- 曹休
  {
    enabled_generals = { "caoxiu", "nos__caoxiu", "ty_ex__caoxiu", "os_ex__caoxiu", "ol_ex__caoxiu", "mini__caoxiu", },
    skins = { "caoxiu_qingfengxilie.jpg" }
  },
  -- 胡金定
  {
    enabled_generals = { "ty__hujinding", "ol__hujinding", "sxfy__hujinding", "wzzz__hujinding", "hujinding", },
    skins = { "hujinding_qingjitaoyao.jpg", "hujinding_diejianchunfeng.mp4" }
  },
  -- 孔淑
  {
    enabled_generals = { "kongshu", "ofl__kongshu", },
    skins = { "kongshu_jinshuangyingxiu.jpg" }
  },
  -- 邓艾
  {
    enabled_generals = { "ld__dengai", "js__dengai", "m_shi__dengai", "m_ex__dengai", "ofl__dengai",
      "wzzz__dengai", "ol_ex__dengai", "olmou__dengai", "ol__dengai", "dengai", "tymou__dengai", "tycl__dengai",
      "ty_m__dengai", },
    skins = { "dengai_bingxiamianzhu.jpg", "dengai_jizhanbenxian.mp4" }
  },
  -- 法正
  {
    enabled_generals = { "ld__fazheng", "mxing__fazheng", "mou__fazheng", "ol_ex__fazheng", "os_ex__fazheng",
      "os_xing__fazheng", "ty_ex__fazheng", "tymou__fazheng", "tystar__fazheng", "nos__fazheng", "fazheng", },
    skins = { "fazheng_fengguqingyu.jpg", "fazheng_weijiguangsha.jpg" }
  },
  -- 吴苋
  {
    enabled_generals = { "ty_m__wuxian", "wuxian", },
    skins = { "wuxian_jinyunfumian.jpg" }
  },
  -- 卧龙诸葛
  {
    enabled_generals = { "hs__wolong", "mini_mou__wolong", "mini_ex__wolong", "m_ex__wolong", "mou__wolong",
      "ofl_tx__wolong", "ofl_mou__wolong", "ofl__wolong", "ofl2__wolong", "wzzz__wolong", "ol_ex__wolong",
      "wolong", "ty_m__wolong", },
    skins = { "wolong_qiruojinlan.jpg", "wolong_lieyanzhihun.mp4", "wolong_huichishanhe.jpg" }
  },
  -- 文鸳
  {
    enabled_generals = { "wenyuan", "sxfy__wenyuan", },
    skins = { "wenyuan_yinshuangsaying.jpg", "wenyuan_qiufengsashuang.mp4" }
  },
  -- 魏延
  {
    enabled_generals = { "n_jz__weiyan", "ofl_heg__weiyan", "hs__weiyan", "mini_star__weiyan", "mini_ex__weiyan",
      "m_shi__weiyan", "mxing__weiyan", "m_ex__weiyan", "wzzz__weiyan", "ol_ex__weiyan", "os_xing__weiyan",
      "weiyan", "ty_m__weiyan", },
    skins = { "weiyan_yanlongkaijia.jpg", "wenyuan_shuofengduzhi.jpg" }
  },
  -- 威张辽
  {
    enabled_generals = { "ty_wei__zhangliao", },
    skins = { "ty_wei__zhangliao_rongmadanxin.jpg" }
  },
  -- 王荣
  {
    enabled_generals = { "ty__wangrongh", "wangrongh", "sxfy__wangrongh", "ol_heg__wangrongh", },
    skins = { "wangrongh_zhanchangjueban.jpg", "wangrongh_yuyantouhuai.jpg", "wangrongh_xuerongzhongqing.jpg" }
  },
  -- 滕公主
  {
    enabled_generals = { "tenggongzhu", },
    skins = { "tenggongzhu_lianxinshuying.jpg" }
  },
  -- 孙鲁班
  {
    enabled_generals = { "es__sunluban", "m_ex__sunluban", "mini_ex__sunluban", "os_heg__sunluban",
      "sxfy__sunluban", "ol_ex__sunluban", "ty_ex__sunluban", "sunluban", },
    skins = { "sunluban_jinzhiyuye.jpg", "sunluban_yuanchaixianglan.mp4" }
  },
  -- 神许褚
  {
    enabled_generals = { "godxuchu", "sxfy__godxuchu", "ofl__godxuchu", },
    skins = { "godxuchu_shizhanxiongpi.jpg" }
  },
  -- 神孙策
  {
    enabled_generals = { "godsunce", "os__godsunce", "sxfy__godsunce", },
    skins = { "godsunce_fuhaifanjiang.jpg", "godsunce_bawangzaishi.mp4" }
  },
  -- 神陆逊
  {
    enabled_generals = { "godluxun", },
    skins = { "godluxun_zhanhuofengwei.jpg" }
  },
  -- 神黄忠
  {
    enabled_generals = { "godhuangzhong", "ol__godhuangzhong", },
    skins = { "godhuangzhong_jinwuluori.mp4", "godhuangzhong_madaogongcheng.mp4", "godhuangzhong_jushiduzun.mp4",
      "ol__godhuangzhong_jingdianxingxiang.mp4" }
  },
  -- 阮瑀
  {
    enabled_generals = { "ruanyu", },
    skins = { "ruanyu_duzuoyouhuang.jpg" }
  },
  -- 秦宜禄
  {
    enabled_generals = { "qinyilu", },
    skins = { "qinyilu_lewuqingping.jpg" }
  },
  -- 南华老仙
  {
    enabled_generals = { "ty_heg__nanhualaoxian", "js__nanhualaoxian",
      "sgsh__nanhualaoxian",
      "nanhualaoxian", "ol__nanhualaoxian", "ty__nanhualaoxian", },
    skins = { "nanhualaoxian_zhuomoshanhe.jpg" }
  },
  -- 谋鲁肃阳
  {
    enabled_generals = { "tymou__lusu" },
    skins = { "tymou__lusu_jingetiema.jpg" }
  },
  -- 谋鲁肃阴
  {
    enabled_generals = { "tymou2__lusu" },
    skins = { "tymou2__lusu_jingetiema.jpg" }
  },
  -- 谋贾诩阳
  {
    enabled_generals = { "tymou__jiaxu" },
    skins = { "tymou__jiaxu_quanqinglongting.jpg" }
  },
  -- 谋贾诩阴
  {
    enabled_generals = { "tymou2__jiaxu" },
    skins = { "tymou__jiaxu_quanqinglongting.jpg" }
  },
  -- 黄盖
  {
    enabled_generals = { "huanggai", "hs__huanggai", "mou__huanggai", "ofl__huanggai", "ex__huanggai", },
    skins = { "huanggai_hubenguanyong.jpg" }
  },
  -- 魔吕布
  {
    enabled_generals = { "ofl6__lvbu", "ol_evil__lvbu", },
    skins = { "ol_evil__lvbu_yuanyuzhisha.jpg" }
  },
  -- 鲁肃
  {
    enabled_generals = { "ofl_ex2__lusu", "ofl__lusu", "wzzz__lusu", "ol_ex__lusu", "olmou__lusu", "ofl_ex__lusu",
      "m_shi__lusu",
      "lusu", "sx__lusu", },
    skins = { "lusu_dangranyouxin.jpg" }
  },
  -- 柳婒
  {
    enabled_generals = { "liutan" },
    skins = { "liutan_yilianyoumeng.jpg" }
  },
  -- 刘永
  {
    enabled_generals = { "liuyong", "js__liuyong", "js_re__liuyong" },
    skins = { "liuyong_lijiankaichou.jpg" }
  },
  -- 极荀彧
  {
    enabled_generals = { "miniex__xunyu" },
    skins = { "miniex__xunyu_shanhaijin.jpg" }
  },
  -- 刘表
  {
    enabled_generals = { "js__liubiao", "mini_ex__liubiao", "m_ex__liubiao", "mou__liubiao", "ofl_tx__liubiao",
      "sxfy__liubiao", "ol_ex__liubiao", "re__liubiao", "ty_ex__liubiao", "liubiao", },
    skins = { "liubiao_jingxianggushou.jpg" }
  },
  -- 李儒
  {
    enabled_generals = { "m_ex__liru", "es__liru", "ofl_tx__liru", "sxfy__liru", "wzzz__liru", "ol_ex__liru",
      "ol__liru",
      "os_ex__liru", "ty_ex__liru", "nos__liru", "liru", },
    skins = { "liru_lieyanzhihun.jpg" }
  },
  -- 李采薇
  {
    enabled_generals = { "licaiwei" },
    skins = { "licaiwei_qiongruiqingjian.jpg" }
  },
  -- 乐周瑜
  {
    enabled_generals = { "mu__zhouyu", "m_liuyi__zhouyu" },
    skins = { "mu__zhouyu_lehewanzhao.jpg" }
  },
  -- 极张春华
  {
    enabled_generals = { "miniex__zhangchunhua" },
    skins = { "miniex__zhangchunhua_yueyingcanhua.jpg" }
  },
  -- 黄月英
  {
    enabled_generals = { "nd_story__huangyueying", "huangyueying", "v11__huangyueying", "hs__huangyueying",
      "mini_sp__huangyueying", "wzzz__huangyueying", "ty_m__huangyueying",
      "mini_mou__huangyueying", "mini_ex__huangyueying", "mou__huangyueying", "ofl_mou__huangyueying",
      "olmou__huangyueying", "ol_sp__huangyueying", "jsp__huangyueying", "ex__huangyueying", "ty_ex__huangyueying", },
    skins = { "huangyueying_zhifeiqiaohui.jpg", "huangyueying_zhengmianduijue.jpg", "huangyueying_miaoxiangshenji.mp4",
      "huangyueying_muniuliuma.mp4" }
  },
  -- 极陆逊
  {
    enabled_generals = { "miniex__luxun" },
    skins = { "miniex__luxun_liehuozhangtian.jpg" }
  },
  -- 极刘备
  {
    enabled_generals = { "miniex__liubei" },
    skins = { "miniex__liubei_shaochanglongming.jpg" }
  },
  -- 极郭嘉
  {
    enabled_generals = { "miniex__guojia" },
    skins = { "miniex__guojia_qushuiliushang.jpg" }
  },
  -- 极典韦
  {
    enabled_generals = { "miniex__dianwei" },
    skins = { "miniex__dianwei_elaixianshi.jpg" }
  },
  -- 极曹植
  {
    enabled_generals = { "miniex__caozhi" },
    skins = { "miniex__caozhi_yaozhangyingxue.jpg" }
  },
  -- 黄忠
  {
    enabled_generals = { "js__huangzhong", "hs__huangzhong", "mini_star__huangzhong", "mini_mou__huangzhong",
      "mini__huangzhong",
      "mini_ex__huangzhong", "mxing__huangzhong", "mou__huangzhong", "shzj_yiling__huangzhong", "ol_ex__huangzhong",
      "huangzhong", },
    skins = { "huangzhong_liejianguanyun.jpg" }
  },
  -- 高顺
  {
    enabled_generals = { "m_ex__gaoshun", "mou__gaoshun", "ofl_tx2__gaoshun", "ofl_tx__gaoshun", "ol_ex__gaoshun",
      "m_yuan__gaoshun",
      "ol__gaoshun", "ty_ex__gaoshun", "gaoshun", },
    skins = { "gaoshun_cuifengdangyu.jpg" }
  },
  -- 典韦
  {
    enabled_generals = { "hs__dianwei", "m_ex__dianwei", "ofl_ex__dianwei", "wzzz__dianwei", "ol_ex__dianwei",
      "ol__dianwei",
      "os__xia__dianwei", "dianwei", "tymou__dianwei", "ty_m__dianwei", },
    skins = { "dianwei_zhihuoshuojin.jpg" }
  },
  -- 冯妤
  {
    enabled_generals = { "ty__fengfangnv" },
    skins = { "ty__fengfangnv_chuangyingjinghua.jpg" }
  },
  -- 曹纯
  {
    enabled_generals = { "mini__caochun", "ofl_heg__caochun", "caochun", "sxfy__caochun", "ol__caochun", "ty__caochun", },
    skins = { "caochun_zhuiwangzhubei.jpg", "caochun_shuohuxianfeng.jpg", "caochun_huxiaolongyuan.mp4" }
  },
  -- 曹操
  {
    enabled_generals = { "m_heg__lordcaocao", "ofl_heg__caocao", "ld__lordcaocao", "hs__caocao", "n_jz__caocao",
      "caocao",
      "js__caocao", "mini__caocao", "m_sp__caocao", "mou__caocao", "ofl_mou__caocao", "vd__caocao",
      "ofl_wenxin__caocao",
      "es__caocao", "ofl3__caocao", "ofl2__caocao", "ofl__caocao", "ofl4__caocao", "wzzz__caocao", "ol_ex__caocao",
      "ol__caocao",
      "ol_sp__caocao", "os_sp__caocao", "ex__caocao", "sx2__caocao", "sx__caocao", "tycl__caocao", "ty_wei__caocao",
      "ty_m__caocao", },
    skins = { "caocao_dihuangkaijia.jpg" }
  },
  -- 卞玥
  {
    enabled_generals = { "bianyue" },
    skins = { "bianyue_queyueqixi.jpg", "bianyue_lanmeiyingyue.mp4" }
  },
  -- 曹仁
  {
    enabled_generals = { "hs__caoren", "mini__caoren", "mou__caoren", "ofl2__caoren", "ofl__caoren",
      "shzj_xiangfan__caoren",
      "ol__caoren", "ol_sp__caoren", "caoren", "y13__caoren", "starsp__caoren", "sx__caoren", "tystar__caoren", },
    skins = { "caoren_shusijushou.jpg", "caoren_duoshuai.jpg" }
  },
  -- 神马超
  {
    enabled_generals = { "mobile__godmachao", "ofl__godmachao", "ofl3__godmachao", "ofl4__godmachao", "ofl5__godmachao",
      "ofl6__godmachao", "ofl2__godmachao", "sxfy__godmachao", "os__godmachao", "godmachao", },
    skins = { "godmachao_xunwujinglei.mp4", "godmachao_madaogongcheng.mp4", "godmachao_leizhuafucang.mp4" }
  },
  -- 神张飞
  {
    enabled_generals = { "godzhangfei" },
    skins = { "godzhangfei_aonishanhe.mp4" }
  },
  -- 神张角
  {
    enabled_generals = { "ofl2__godzhangjiao", "ofl__godzhangjiao", "qshm__godzhangjiao", "ol__godzhangjiao",
      "godzhangjiao", },
    skins = { "godzhangjiao_yudaozhenze.mp4" }
  },
  -- 吕玲绮
  {
    enabled_generals = { "ty_heg__lvlingqi", "mhsj__lvlingqi", "sxfy__lvlingqi", "ol__lvlingqi", "lvlingqi", },
    skins = { "lvlingqi_zhiyanliujin.mp4", "lvlingqi_zhanchangjueban.mp4", "lvlingqi_bingpoyingxue.mp4" }
  },
  -- 蒲元
  {
    enabled_generals = { "ol__puyuan", "ty__puyuan", "ty_sp__puyuan", },
    skins = { "ol__puyuan_bailianshenqi.mp4", "ol__puyuan_zhanchangjueban.mp4" }
  },
  -- 麴义
  {
    enabled_generals = { "ofl_heg__quyi", "ofl_tx__quyi", "sxfy__quyi", "wzzz__quyi", "quyi", "ty__quyi", },
    skins = { "quyi_hubenguanyong.mp4", "quyi_yangdaoliwei.mp4" }
  },
  -- 曹植
  {
    enabled_generals = { "ol_heg__caozhi", "mini__caozhi", "m_ex__caozhi", "ofl_wenxin__caozhi", "ofl__caozhi",
      "ol_ex__caozhi", "ty_ex__caozhi", "caozhi", },
    skins = { "caozhi_qibujuezhang.mp4", "caozhi_longnianzhongqiu.mp4" }
  },
  -- 威马腾
  {
    enabled_generals = { "ty_wei__mateng", },
    skins = { "ty_wei__mateng_jingdianxingxiang.mp4" }
  },
  -- 徐馨
  {
    enabled_generals = { "xuxin", },
    skins = { "xuxin_luyefangzong.mp4", "xuxin_yongyixianqu.mp4" }
  },
  -- 甄姬
  {
    enabled_generals = { "zhenji", "ex__zhenji", "hs__zhenji", "mini_mou__zhenji", "mini_ex__zhenji", "mou__zhenji",
      "ofl__zhenji", "es__zhenji", "ty_m__zhenji", },
    skins = { "zhenji_xunitiantuan.mp4", "zhenji_zhanchangjueban.mp4", "zhenji_qingluoyuelong.mp4",
      "zhenji_niunianqingming.mp4", "zhenji_mingzhuyaoqu.mp4", "zhenji_luoshuishenyun.mp4", "zhenji_duanruiluoshui.mp4" }
  },
  -- 夏侯氏
  {
    enabled_generals = { "mou__xiahoushi", "sp__xiahoushi", "ty_ex__xiahoushi", "xiahoushi", },
    skins = { "xiahoushi_liandengyingyue.jpg", "xiahoushi_chunyanzhihua.mp4" }
  },
  -- 杜预
  {
    enabled_generals = { "heg__duyu", "m_heg__duyu", "ol_heg__duyu", "mobile__duyu", "mrss__duyu", "mrss2__duyu",
      "wzzz__duyu", "sxfy__duyu", "ofl_shiji__duyu", "ol__duyu", "ty__duyu", },
    skins = { "duyu_yulinbilang.jpg", }
  },
  -- 赵襄
  {
    enabled_generals = { "zhaoxiang", "os__zhaoxiang", "ty__zhaoxiang", "qshm__zhaoxiang" },
    skins = { "zhaoxiang_yuehenfangying.mp4", "zhaoxiang_yuehenfangying2.mp4", "zhaoxiang_shachangfanghun.mp4" }
  },
  -- 鲍信
  {
    enabled_generals = { "mobile__baoxin", "sxfy__baoxin", "baoxin", },
    skins = { "baoxin_guanjuetianxia.mp4" }
  },
  -- 曹华
  {
    enabled_generals = { "os__caohua", "caohua", },
    skins = { "caohua_caidielianhua.mp4" }
  },
  -- 曹媛
  {
    enabled_generals = { "caoyuan", },
    skins = { "caoyuan_qiyanyaoyao.mp4" }
  },
  -- 尹夫人
  {
    enabled_generals = { "yinfuren" },
    skins = { "yinfuren_zhanchangrongyao.jpg" }
  },
  -- 庞统
  {
    enabled_generals = { "hs__pangtong", "js__pangtong", "mini__pangtong", "m_ex__pangtong", "mou__pangtong",
      "ofl_mou__pangtong", "ofl_ex__pangtong", "ofl__pangtong", "wzzz__pangtong", "wzzz2__pangtong", "qshm__pangtong",
      "ol_ex__pangtong", "olmou__pangtong", "pangtong", "ty_m__pangtong", },
    skins = { "pangtong_duoshuai.jpg" }
  },
  -- 孙权
  {
    enabled_generals = { "sunquan", "m_heg__lordsunquan", "hs__sunquan", "ld__lordsunquan", "miniamb__sunquan",
      "mini_mou__sunquan", "m_yuan__sunquan", "mou__sunquan", "ofl_mou__sunquan", "var__sunquan", "ofl__sunquan",
      "wzzz__sunquan", "ol_ex__sunquan", "ex__sunquan", "tycl__sunquan", "ty_wei__sunquan", },
    skins = { "sunquan_songcuichangqing.jpg" }
  },
  -- 张星彩
  {
    enabled_generals = { "ofl_heg__xingcai", "mini__xingcai", "cqym__xingcai", "ol__xingcai", "os_heg__xingcai",
      "ty_wei__xingcai", "ty_m__xingcai", },
    skins = { "xingcai_tianxiazhiqiu.jpg", "xingcai_tianxiazhiqiu2.jpg" }
  },
  -- 袁胤
  {
    enabled_generals = { "yuanyin" },
    skins = { "yuanyin_zhongshiguzhong.jpg" }
  },
  -- 薛灵芸
  {
    enabled_generals = { "ol__xuelingyun", "xuelingyun", },
    skins = { "xuelingyun_baixiuchaofeng.mp4", "xuelingyun_jinjiaoqiaoke.jpg" }
  },
  -- 孙翎鸾
  {
    enabled_generals = { "ol__sunlingluan", "sunlingluan", },
    skins = { "sunlingluan_qinglingheming.jpg" }
  },
  -- 张任
  {
    enabled_generals = { "ld__zhangren", "js__zhangren", "ty__zhangren", "tymou__zhangren", },
    skins = { "tymou__zhangren_xiangfengfuhu.jpg" }
  },
  -- 曹轶
  {
    enabled_generals = { "caoyi" },
    skins = { "caoyi_jinlanhesui.jpg" }
  },
  -- 族荀攸
  {
    enabled_generals = { "olz__xunyou" },
    skins = { "olz__xunyou_huizhiqianjun.jpg" }
  },
  -- 张华
  {
    enabled_generals = { "zhanghua" },
    skins = { "zhanghua_longquanjianxiao.jpg" }
  },
  -- 卧龙凤雏
  {
    enabled_generals = { "wolongfengchu" },
    skins = { "wolongfengchu_chibilianhuo.jpg" }
  },
  -- 神孙权
  {
    enabled_generals = { "ofl_le__godsunquan", "godsunquan", "ty__godsunquan", },
    skins = { "godsunquan_tonghuiriyue.jpg", "godsunquan_bihaichaosheng.jpg" }
  },
  -- 司马懿
  {
    enabled_generals = { "simayi", "heg__lordsimayi", "heg__simayi", "ol_heg__simayi", "hs__simayi", "js__simayi",
      "ofl3__simayi",
      "ofl4__simayi", "ofl2__simayi", "ofl__simayi", "wzzz__simayi", "ol__simayi", "ex__simayi", "ty_m__simayi", },
    skins = { "simayi_moudingtianxia.jpg" }
  },
  -- 花鬘
  {
    enabled_generals = { "ty__huaman", "mobile__huaman", "sxfy__huaman" },
    skins = { "mobile__huaman_lingxiufeiyin.jpg", }
  },
  -- 卢弈
  {
    enabled_generals = { "luyi" },
    skins = { "luyi_shulifenghua.mp4" }
  },
  -- 董贵人
  {
    enabled_generals = { "dongguiren" },
    skins = { "dongguiren_chundiantashui.mp4" }
  },
  -- 杜夫人
  {
    enabled_generals = { "dufuren" },
    skins = { "dufuren_yindaizhuangmei.mp4" }
  },
  -- 卞夫人
  {
    enabled_generals = { "ol__bianfuren", "os__bianfuren", "ofl_shiji__bianfuren", "mobile__bianfuren",
      "mini__bianfuren",
      "ld__bianfuren", },
    skins = { "ol__bianfuren_yindaizhuangmei.mp4" }
  },
  -- 樊玉凤
  {
    enabled_generals = { "sxfy__fanyufeng", "fanyufeng" },
    skins = { "fanyufeng_chunxiaofangfei.mp4" }
  },
  -- 甘夫人糜夫人
  {
    enabled_generals = { "ganfurenmifuren" },
    skins = { "ganfurenmifuren_shuangshushiqiong.mp4" }
  },
  -- 郭槐
  {
    enabled_generals = { "heg__guohuaij", "guohuaij" },
    skins = { "guohuaij_furuohuaixiang.mp4", "guohuaij_rougonglinwei.mp4" }
  },
  -- 郭缇萦
  {
    enabled_generals = { "guotiying" },
    skins = { "guotiying_jinsefanghua.mp4" }
  },
  -- 郭照
  {
    enabled_generals = { "guozhao", "ol__guozhao", "ofl__guozhao", "js__guozhao", "js_re__guozhao", },
    skins = { "guozhao_ciyuqinghua.mp4" }
  },
  -- 极小乔
  {
    enabled_generals = { "miniex__xiaoqiao", },
    skins = { "miniex__xiaoqiao_qingcilianyi.mp4", }
  },
  -- 极大乔
  {
    enabled_generals = { "miniex__daqiao", },
    skins = { "miniex__daqiao_qingbaiyuan.mp4", "miniex__daqiao_qiushuiyiren.mp4" }
  },
  -- 极周瑜
  {
    enabled_generals = { "miniex__zhouyu", },
    skins = { "miniex__zhouyu_lieyanzhihun.mp4" }
  },
  -- 沮授
  {
    enabled_generals = { "mini__jvshou", "m_ex__jvshou", "ofl_tx__jvshou", "sxfy__jushou", "olmou__jvshou",
      "os_ex__jvshou", "ty_ex__jvshou", "tymou__jvshou", "jvshou", },
    skins = { "jvshou_luodingtianyuan.mp4" }
  },
  -- 乐周妃
  {
    enabled_generals = { "mu__zhoufei", },
    skins = { "mu__zhoufei_shulifenghua.mp4" }
  },
  -- 灵雎
  {
    enabled_generals = { "lingju", "ty__lingju", "os__lingju", "ol__lingju", "mobile__lingju", },
    skins = { "lingju_xueyingposuo.mp4" }
  },
  -- 刘备
  {
    enabled_generals = { "liubei", "v11__liubei", "ld__lordliubei", "m_heg__lordliubei", "os_heg__liubei", "hs__liubei",
      "js__liubei", "js_re__liubei", "mou__liubei", "ofl_tx__liubei", "ofl_mou__liubei", "es__liubei", "ofl__liubei",
      "ofl2__liubei", "shzj_yiling__liubei", "wzzz__liubei", "ol_ex__liubei", "os__xia__liubei", "starsp__liubei",
      "ex__liubei", "tycl__liubei", "ty_wei__liubei", "ty_m__liubei", },
    skins = { "liubei_manianxianding.mp4" }
  },
  -- 刘晔
  {
    enabled_generals = { "mobile__liuye", "sxfy__liuye", "ol__liuye", "ty__liuye", },
    skins = { "ol__liuye_fenyantianzheng.mp4" }
  },
  -- 陆抗
  {
    enabled_generals = { "ld__lukang", "js__lukang", "mini__lukang", "shzj_juedai__lukang", "qyt__lukang", "lukang", "wm__lukang", },
    skins = { "lukang_guozhizhushi.mp4" }
  },
  -- 马良
  {
    enabled_generals = { "mobile__maliang", "sxfy__maliang", "wzzz__maliang", "ol__maliang", "maliang", "tw__maliang", },
    skins = { "maliang_dangranyouxin.mp4" }
  },
  -- 马云禄
  -- {
  --   enabled_generals = { "mayunlu", },
  --   skins = { "mayunlu_huahaiqiangwu.mp4" }
  -- },
  -- 张绣
  {
    enabled_generals = { "os_heg__zhangxiu", "ld__zhangxiu", "ofl_tx__zhangxiu", "wzzz__zhangxiu", "olmou__zhangxiu",
      "os__zhangxiu", "zhangxiu", "tymou__zhangxiu", },
    skins = { "zhangxiu_hubenguanyong.mp4", "zhangxiu_nucongxinqi.mp4" }
  },
  -- 庞凤衣
  {
    enabled_generals = { "pangfengyi", },
    skins = { "pangfengyi_doujiujiaogong.mp4" }
  },
  -- 秦宓
  {
    enabled_generals = { "os_heg__qinmi", "miniex__qinmi", "qinmi", },
    skins = { "qinmi_aoyuluntian.mp4" }
  },
  -- 神司马懿
  {
    enabled_generals = { "mobile__godsimayi", "ofl__godsimayi", "ofl2__godsimayi", "godsimayi", },
    skins = { "godsimayi_jianwangzhilai.mp4" }
  },
  -- 孙茹
  {
    enabled_generals = { "sunru", "wzzz__sunru", "ol__sunru", "ty__sunru", },
    skins = { "sunru_mulanhanfang.mp4", "sunru_shenianqingming.mp4" }
  },
  -- 田尚衣
  {
    enabled_generals = { "tianshangyi", },
    skins = { "tianshangyi_shulifenghua.mp4" }
  },
  -- 威孙尚香
  {
    enabled_generals = { "ty_wei__sunshangxiang", },
    skins = { "ty_wei__sunshangxiang_wu.mp4" }
  },
  -- 宣公主
  {
    enabled_generals = { "xuangongzhu", "ty__xuangongzhu", },
    skins = { "xuangongzhu_qiangyingfangzi.mp4" }
  },
  -- 张怀
  {
    enabled_generals = { "zhanghuai", },
    skins = { "zhanghuai_luyoqingping.mp4" }
  },
  -- 朱佩兰
  {
    enabled_generals = { "zhupeilan", },
    skins = { "zhupeilan_qingluoxiashu.mp4", }
  },
  -- 朱然
  {
    enabled_generals = { "zhuran", "tymou__zhuran", "ty_ex__zhuran", "os_mou__zhuran", "ol_ex__zhuran", "wzzz__zhuran",
      "nos__zhuran",
      "mou__zhuran", "m_ex__zhuran", "os_heg__zhuran", },
    skins = { "zhuran_bingranwuju.mp4" }
  },
  -- 诸葛诞
  {
    enabled_generals = { "ofl_heg__zhugedan", "js__zhugedan", "wzzz__zhugedan", "olz__zhugedan", "ol__zhugedan",
      "zhugedan",
      "ty_ex__zhugedan", "ty_m__zhugedan", },
    skins = { "zhugedan_chouchunjuyi.mp4" }
  },
  -- 诸葛若雪
  {
    enabled_generals = { "zhugeruoxue", },
    skins = { "zhugeruoxue_shulifenghua.mp4" }
  },
  -- 钟琰
  {
    enabled_generals = { "olz__zhongyan", "zhongyan", },
    skins = { "zhongyan_feihongjingxue.mp4", "zhongyan_xiasidaiyuan.mp4" }
  },
  -- 钟毓
  {
    enabled_generals = { "zhongyu", "olz__zhongyu", },
    skins = { "zhongyu_zongbinongchao.jpg" }
  },
  -- 威曹操
  {
    enabled_generals = { "ty_wei__caocao", },
    skins = { "ty_wei__caocao_yijianggongcheng.jpg" }
  },
  -- 庞宏
  {
    enabled_generals = { "panghong", },
    skins = { "panghong_mengwaixirang.jpg" }
  },
  -- 刘懿君
  {
    enabled_generals = { "ty__liufuren", },
    skins = { "ty__liufuren_yelanwanfeng.jpg" }
  },
  -- 左棻
  {
    enabled_generals = { "zuofen", },
    skins = { "zuofen_zhaoshuihongqu.jpg" }
  },
  -- 荀谌
  {
    enabled_generals = { "ty_heg__xunchen", "nos__xunchen", "ofl_shiji__xunchen", "olz__xunchen", "ol__xunchen",
      "os__xunchen",
      "ty__xunchen", },
    skins = { "xunchen_ximuzhize.jpg" }
  },
  -- 荀采
  {
    enabled_generals = { "olz__xuncai", },
    skins = { "xuncai_yarouyingcai.jpg" }
  },
  -- 黄承彦
  {
    enabled_generals = { "ol__huangchengyan", "ty__huangchengyan", },
    skins = { "ol__huangchengyan_yezhanjixiong.jpg" }
  },
  -- 曹嵩
  {
    enabled_generals = { "mobile__caosong", "ofl__caosong", "ty__caosong", },
    skins = { "mobile__caosong_yanyinggaopeng.jpg" }
  },
  -- 诸葛瞻
  {
    enabled_generals = { "os_heg__zhugezhan", "shzj_juedai__zhugezhan", "nos__zhugezhan", "zhugezhan", },
    skins = { "zhugezhan_fulinchiguo.jpg" }
  },
  -- 蔡夫人
  {
    enabled_generals = { "mini_ex__caifuren", "m_ex__caifuren", "ofl_tx__caifuren", "ol_ex__caifuren",
      "ty_ex__caifuren",
      "caifuren", },
    skins = { "caifuren_jinyuxunxin.jpg" }
  },
}

extension:addSkinPackage({
  url = rem_url,
  content = old_all_skin
})
Fk:loadTranslationTable {
  ["fk_dev__rem_bride.mp4"] = "纯白花嫁",
  ["zhaoji_mjs.mp4"] = "名将杀",
  ["mu__caozhi_mozongxunyan.jpg"] = "墨踪寻燕",
  ["qinghegongzhu_xinxiangqinghuan.jpg"] = "馨香清欢",
  ["wenqin_jingdian.jpg"] = "经典形象",
  ["olz__zhonghui_jinlangongzhan.mp4"] = "金兰共战",
  ["mou__jiangwei_jinlangongzhan.jpg"] = "金兰共战",
  ["daqiao_huizhilanxin.jpg"] = "蕙质兰心",
  ["sunshangxiang_niaoyuhuaxiang.jpg"] = "鸟语花香",
  ["sunshangxiang_qianhouliangnan.jpg"] = "前后两难",
  ["guanyu_yuzhuobushi.jpg"] = "玉琢不饰",
  ["guanyu_dandaofuhui.jpg"] = "单刀赴会",
  ["guanyu_longshengjiuzi.jpg"] = "龙生九子",
  ["m_shi__zhonghui_qianjiaojitian.mp4"] = "潜蛟觊天",
  ["diaochan_taotaolejin.jpg"] = "陶陶乐尽",
  ["mobile__godjiangwei_jianyintianlin.mp4"] = "剑引天霖",
  ["bailingyun_fangyuanluodai.mp4"] = "芳原罗黛",
  ["tengfanglan_haoluqinlan.mp4"] = "皓露沁兰",
  ["mu__caiwenji_ruixueyinyun.mp4"] = "瑞雪氤氲",
  ["yangbiao_guozhizhushi.mp4"] = "国之柱石",
  ["xiaoqiao_lizhitiancheng.mp4"] = "丽质天成",
  ["qinghegongzhu_meiyingyingxin.mp4"] = "魅影萦心",
  ["m_shi__luyusheng_suxinaoxue.mp4"] = "素心傲雪",
  ["wenyang_wu_poyukaitian.mp4"] = "破宇开天(吴)",
  ["wenyang_wei_poyukaitian.mp4"] = "破宇开天(魏)",
  ["xizhicai_chanazhanhua.mp4"] = "刹那绽华",
  ["liuyan_jiuxiwending.mp4"] = "九锡问鼎",
  ["xiaoqiao_guimengxiange.mp4"] = "桂梦弦歌",
  ["wenyang_shiruowanjun.mp4"] = "势若万钧",
  ["mobile__caomao_xiaolongpoyuan.mp4"] = "枭龙破渊",
  ["mobile2__caomao_xiaolongpoyuan.mp4"] = "枭龙破渊2",
  ["sp__zhaoyun_weimingjinxian.mp4"] = "威名尽显",
  ["sunluyu_huweibobing.jpg"] = "虎尾薄冰",
  ["jiaxu_mouluanchangan.mp4"] = "谋乱长安",
  ["olmou__zhangrang_niejinsilong.mp4"] = "啮金饲龙",
  ["yangyan_suyanxiufang.jpg"] = "苏烟秀芳",
  ["ty_wei__sunquan_huilingjueding.mp4"] = "会凌绝顶",
  ["sp__diaochan_huandieyinghun.mp4"] = "幻蝶萦魂",
  ["xujing_danfengyingtong.jpg"] = "丹枫盈瞳",
  ["zhugeliang_yizhenqingmeng.mp4"] = "一枕清梦",
  ["zhonghui_zhongxiangguipu.mp4"] = "钟香桂蒲",
  ["mu__zhugeguo_qingyiyingyue.mp4"] = "清漪映月",
  ["sunce_aolingjueding.mp4"] = "傲凌绝顶",
  ["mou__jiangwei_shouyiwujiang.mp4"] = "守毅无疆",
  ["godzhonghui_danghuifeichi.mp4"] = "荡徊蜚螭",
  ["xushao_pingshidiaolong.mp4"] = "评世雕龙",
  ["guojia_yishenzhengdao.mp4"] = "以身证道",
  ["xuwen_jinsefanghua.mp4"] = "锦色芳华",
  ["mu__daqiao_nuanfenglianxin.mp4"] = "暖风恋心",
  ["mu__xiaoqiao_nuanfenglianxin.mp4"] = "暖风恋心",
  ["liuyan_xiongjuyizhou.mp4"] = "雄踞益州",
  ["olz__wuxian_fengxianjinlv.mp4"] = "凤衔金缕",
  ["olz__zhonghui_dengtaibaijiang.jpg"] = "登台拜将",
  ["baosanniang_tujiaochunnong.mp4"] = "兔娇春浓",
  ["zhangxuan_meituchunjiao.mp4"] = "媚兔春娇",
  ["ty_wei__machao_lizhanzhuozheng.mp4"] = "戾战灼征",
  ["dongxu_renmiantaohua.jpg"] = "人面桃花",
  ["ruiji_chunjiaolanman.jpg"] = "春娇烂漫",
  ["huangwudie_jianshoujiaotu.jpg"] = "箭狩狡兔",
  ["dongxu_jilangliuying.jpg"] = "寂廊流萤",
  ["renwan_chunxiaocaiyi.jpg"] = "春宵彩翼",
  ["cuilingyi_xiaoshandiezong.jpg"] = "小扇蝶踪",
  ["ty_wei__liubei_zhenmengtaoyuan.jpg"] = "枕梦桃园",
  ["liuxuan_daojiesiyi.jpg"] = "蹈节死义",
  ["linglie_talangquhu.jpg"] = "踏浪驱虎",
  ["mu__caiwenji_shulifenghua.mp4"] = "姝丽风华",
  ["godzhonghui_baishuangjishi.jpg"] = "白霜寂世",
  ["mu__zoushi_shulifenghua.mp4"] = "姝丽风华",
  ["cuilingyi_queduxianyuan.jpg"] = "鹊渡仙缘",
  ["houzhaoning_liuyingxiying.jpg"] = "流萤栖影",
  ["lizhaoyi_huijianguxin.jpg"] = "慧剑孤心",
  ["zhangxuan_zhanchangyongyao.mp4"] = "战场荣耀",
  ["ruiji_lianliduanyang.jpg"] = "莲鲤端阳",
  ["dongxu_guyinglingding.jpg"] = "孤影伶仃",
  ["dingfuren_yizhucanghai.jpg"] = "遗珠沧海",
  ["moqiongshu_shengjuanyouchong.jpg"] = "圣眷优宠",
  ["caoxian_yuanchunchengxiang.mp4"] = "元春呈祥",
  ["olz__xunyu_guzhaoqianzai.mp4"] = "孤照千载",
  ["ty_wei__xingcai_wuxingtai.mp4"] = "武",
  ["ty_wei__dongzhuo_jingdian.mp4"] = "经典形象",
  ["chengui_zhanchangrongyao.mp4"] = "战场荣耀",
  ["godcaopi_jingdian.mp4"] = "经典形象",
  ["wm__luxun_shiwuhuairu.mp4"] = "释武怀儒",
  ["wm__zhugeliang_jingdian.mp4"] = "经典形象",
  ["wangyi_qingtianxieyu.mp4"] = "倾天泻雨",
  ["sunhanhua_weilingjinxian.mp4"] = "威灵尽显",
  ["wangyi_zhanchangrongyao.mp4"] = "战场荣耀",
  ["godtaishici_wanmodangchu.jpg"] = "万魔荡除",
  ["godlusu_jiuzhouweiju.jpg"] = "九州为局",
  ["godjiangwei_zhijianbutian.mp4"] = "炽剑补天",
  ["godlvbu_guanjuefeijiang.mp4"] = "冠绝飞将",
  ["dongwan_changleweiyang.mp4"] = "长乐未央",
  ["hetaihou_zhanchangrongyao.mp4"] = "战场荣耀",
  ["jiaxu_dangranyouxin.mp4"] = "荡然由心",
  ["zhugeguo_jinzhiyuye.jpg"] = "金枝玉叶",
  ["godguojia_yixinzheyue.mp4"] = "倚星折月",
  ["godguojia_yixinzheyue2.mp4"] = "倚星折月2",
  ["caoying_changyelinxi.mp4"] = "长夜临曦",
  ["simazhao_zhaoweihuainan.mp4"] = "昭威淮南",
  ["zhangjinyun_nuanfengniaoniao.mp4"] = "暖枫袅袅",
  ["simazhao_denglujiemian.mp4"] = "登录界面",
  ["wangyuanji_dieyingpianqian.mp4"] = "蝶影翩跹",
  ["m_shi__taishici_yilingwanxiang.mp4"] = "义凌万象",
  ["m_shi__weiyan_kuangzhituntian.mp4"] = "狂志吞天",
  ["m_shi2__weiyan_kuangzhituntian.mp4"] = "狂志吞天",
  ["m_shi3__weiyan_kuangzhituntian.mp4"] = "狂志吞天",
  ["zhouyu_yaxiangzhenzhu.jpg"] = "鸭香珍珠",
  ["simashi_cuidizheku.mp4"] = "摧敌折枯",
  ["yanghuiyu_sheniankuanghuan.mp4"] = "蛇年狂欢",
  ["sunhanhua_xinyutongyi.mp4"] = "心宇同一",
  ["godganning_zhanpowujian.mp4"] = "战破无间",
  ["m_shi__zhonghui_qianjiaojitian2.mp4"] = "潜蛟觊天2",
  ["tymou__zhouyu_jiangshanruhua.mp4"] = "江山如画",
  ["tymou2__zhouyu_jiangshanruhua.mp4"] = "江山如画",
  ["xurong_nuliaohengkong.mp4"] = "怒燎横空",
  ["xurong_nuliaohengkong2.mp4"] = "怒燎横空2",
  ["caomao_longxuexuanhuang.mp4"] = "龙血玄黄",
  ["simazhao_longxuexuanhuang.mp4"] = "龙血玄黄",
  ["bailingyun_zaishuiyifang.jpg"] = "在水一方",
  ["xushao_fenghuoliantian.jpg"] = "烽火连天",
  ["moqiongshu_shulifenghua.mp4"] = "姝丽风华",
  ["diaochan_yuexiapianqian.mp4"] = "月下翩跹",
  ["ol_ex__xusheng_pojunshajiang.mp4"] = "破军杀将",
  ["miniex__caiwenji_hanyuexianzong.mp4"] = "寒月仙踪",
  ["miniex__zhenji_haoyuegongci.mp4"] = "皓月共此",
  ["mobile__guozhao_quehanjingfeng.mp4"] = "阙寒惊凤",
  ["dongxie_jinchengyinyan.mp4"] = "金城银焰",
  ["bulianshi_bieheguluan.mp4"] = "别鹤孤鸾",
  ["tymou__simayi_yinlongruhui.mp4"] = "隐龙如晦",
  ["diaochan_wuhuoqunxin.mp4"] = "舞惑群心",
  ["zhangliao_longshengjiuzi.mp4"] = "龙生九子",
  ["godxunyu_kuanghanyanzuo.mp4"] = "匡汉延祚",
  ["lushi_dielianqingman.mp4"] = "蝶恋清幔",
  ["goddengai_julinghanyu.mp4"] = "巨灵撼宇",
  ["godzhaoyun_linzhenjiuxiao.mp4"] = "鳞振九霄",
  ["godzhaoyun_zhanlongzaiye.mp4"] = "战龙在野",
  ["zhugejin_zuolonganlan.jpg"] = "佐龙安澜",
  ["zhonghui_longshenjiuzi.jpg"] = "龙生九子",
  ["dingfuren_zhengmianduijue.jpg"] = "正面对决",
  ["mazhong_gangfengzhuokou.jpg"] = "罡风灼寇",
  ["js__zoushi_zhengmianduijue.jpg"] = "正面对决",
  ["yangzhi_yanzhiyanzhi.mp4"] = "妍芷艳质",
  ["olz__wanghun_yuemanqianjie.jpg"] = "月满千街",
  ["zhongyan_yuemanqianjie.mp4"] = "月满千街",
  ["lingju_hunqiangmengying.mp4"] = "魂牵梦萦",
  ["zhangqiying_jiyufengnian.mp4"] = "寄语丰年",
  ["caoxiancaohua_jinseliangyuan.mp4"] = "锦瑟良缘",
  ["caoxiancaohua_jinseliangyuan2.mp4"] = "锦瑟良缘",
  ["modiaochan_qunuofuxi.mp4"] = "驱傩祓禊",
  ["xuncai_yinhuamanwu.mp4"] = "银花漫舞",
  ["caojinyu_test.mp4"] = "水殿香来",
  ["caoying_jinzhiyuye.mp4"] = "金枝玉叶",
  ["xiahoushi_fuguachenli.mp4"] = "浮瓜沉李",
  ["chick_dynamic.mp4"] = "鸡 [动态]",
  ["liutan_yangliuyiyi.mp4"] = "杨柳依依",
  ["baosanniang_yanranyixiao.mp4"] = "嫣然一笑",
  ["zhaoxiang_yuehenfangying.mp4"] = "月痕芳影",
  ["zhaoyanw_yuemanyujing.mp4"] = "月满玉京",
  ["zhangyao_shuangshuchuoyue.jpg"] = "双姝绰约",
  ["zhangqiying_lianyanqingfang.jpg"] = "潋滟晴方",
  ["olz__luji_zhuxingshixiang.jpg"] = "诸星示相",
  ["zhangliao_benleipozhen.jpg"] = "奔雷破阵",
  ["zhangjinyun_yaoyinghuanyue.jpg"] = "瑶影浣月",
  ["zhugemengxue_shulifenghua.jpg"] = "姝丽风华",
  ["zhangfen_bihaihanshan.jpg"] = "辟山撼海",
  ["zhangchangpu_zhanchangrongyao.jpg"] = "战场荣耀",
  ["m_friend__zhugeliang_mengzhenqianqiu.jpg"] = "梦枕千秋",
  ["m_friend__xushu_zuilikanjian.jpg"] = "醉里看剑",
  ["ol__yangwan_huacuhuairou.jpg"] = "花簇怀柔",
  ["xuhuang_dangkouzhuojun.jpg"] = "荡寇斫军",
  ["xiahouxuan_zhuangzhoumengdie.jpg"] = "庄周梦蝶",
  ["xurong_lieyanzhihun.jpg"] = "烈焰炽魂",
  ["xushi_sijunshanggan.jpg"] = "思君感伤",
  ["xunyou_yizhanshaochang.jpg"] = "弈战沙场",
  ["yuanshao_zhanchangrongyao.jpg"] = "战场荣耀",
  ["ol__yanghu_qingshangyimeng.jpg"] = "清觞倚梦",
  ["yuanji_yintongbinfen.jpg"] = "银曈缤纷",
  ["yanrou_fushenshubei.jpg"] = "缚身戍北",
  ["jiangwan_chengjiyufeng.jpg"] = "乘骥御风",
  ["simashi_dushidinghuai.jpg"] = "督师定淮",
  ["caoxiu_qingfengxilie.jpg"] = "倾锋袭猎",
  ["hujinding_qingjitaoyao.jpg"] = "情寄桃夭",
  ["kongshu_jinshuangyingxiu.jpg"] = "金霜盈袖",
  ["dengai_bingxiamianzhu.jpg"] = "兵下绵竹",
  ["fazheng_fengguqingyu.jpg"] = "丰谷庆余",
  ["wuxian_jinyunfumian.jpg"] = "锦运福绵",
  ["wolong_qiruojinlan.jpg"] = "契若金兰",
  ["wolong_lieyanzhihun.mp4"] = "烈焰炽魂",
  ["wolong_huichishanhe.jpg"] = "挥斥山河",
  ["wenyuan_yinshuangsaying.jpg"] = "银霜飒影",
  ["weiyan_yanlongkaijia.jpg"] = "炎龙铠甲",
  ["wenyuan_shuofengduzhi.jpg"] = "朔风独峙",
  ["ty_wei__zhangliao_rongmadanxin.jpg"] = "戎马丹心",
  ["wangrongh_zhanchangjueban.jpg"] = "战场绝版",
  ["wangrongh_yuyantouhuai.jpg"] = "玉燕投怀",
  ["wangrongh_xuerongzhongqing.jpg"] = "雪荣钟情",
  ["wangrong_xiapeiyunmeng.mp4"] = "霞帔云裳",
  ["dingshangwan_yelanraomeng.mp4"] = "夜阑扰梦",
  ["z__luyusheng_ligeyuezhu.jpg"] = "黎歌跃竹",
  ["tenggongzhu_lianxinshuying.jpg"] = "莲心姝影",
  ["sunluban_chiyouming.jpg"] = "敕幽明",
  ["sunhanhua_xinyutongyi2.jpg"] = "心宇同一2",
  ["m_shi__yuji_xingquanjingfu.jpg"] = "形全精复",
  ["godzhaoyun_longtenghuyue.mp4"] = "龙腾虎跃",
  ["godxuchu_shizhanxiongpi.jpg"] = "嗜战熊罴",
  ["godsunce_fuhaifanjiang.jpg"] = "覆海翻江",
  ["godluxun_zhanhuofengwei.jpg"] = "绽火烽威",
  ["godhuangzhong_jinwuluori.mp4"] = "金乌落日",
  ["godganning_shenweirumang.mp4"] = "神威如芒",
  ["ruanyu_duzuoyouhuang.jpg"] = "独坐幽篁",
  ["qinyilu_lewuqingping.jpg"] = "乐武清平",
  ["nanhualaoxian_zhuomoshanhe.jpg"] = "着墨山河",
  ["zhugeliang_shanhewuyang.jpg"] = "山河无恙",
  ["olmou__zhangrang_niejinsilong2.jpg"] = "啮金饲龙2",
  ["yuanshao_wojianjichu2.jpg"] = "我剑既出2",
  ["yuanshao_wojianjichu1.jpg"] = "我剑既出1",
  ["tymou2__lusu_jingetiema.jpg"] = "金戈铁马-阴",
  ["tymou__lusu_jingetiema.jpg"] = "金戈铁马-阳",
  ["tymou2__jiaxu_quanqinglongting.jpg"] = "权倾龙廷-阴",
  ["tymou__jiaxu_quanqinglongting.jpg"] = "权倾龙廷-阳",
  ["huanggai_hubenguanyong.jpg"] = "虎贲冠勇",
  ["tymou__guojia_moxuechuqing.jpg"] = "陌雪初晴-阳",
  ["tymou2__guojia_moxuechuqing.jpg"] = "陌雪初晴-阴",
  ["ol_evil__lvbu_yuanyuzhisha.jpg"] = "渊狱之煞",
  ["lusu_dangranyouxin.jpg"] = "荡然由心",
  ["liutan_yilianyoumeng.jpg"] = "一帘幽梦",
  ["liuyong_lijiankaichou.jpg"] = "砺剑忾仇",
  ["miniex__xunyu_shanhaijin.jpg"] = "山海烬",
  ["liubiao_jingxianggushou.jpg"] = "荆襄孤守",
  ["liru_lieyanzhihun.jpg"] = "烈焰炽魂",
  ["licaiwei_qiongruiqingjian.jpg"] = "琼蕊清涧",
  ["mu__zhouyu_lehewanzhao.jpg"] = "乐荷晚照",
  ["jiangwan_huguoanmin.jpg"] = "护国安民",
  ["miniex__zhangchunhua_yueyingcanhua.jpg"] = "月影残华",
  ["huangyueying_zhifeiqiaohui.jpg"] = "智飞巧慧",
  ["miniex__luxun_liehuozhangtian.jpg"] = "烈火张天",
  ["miniex__liubei_shaochanglongming.jpg"] = "沙场龙鸣",
  ["miniex__guojia_qushuiliushang.jpg"] = "曲水流觞",
  ["miniex__dianwei_elaixianshi.jpg"] = "恶来现世",
  ["miniex__caozhi_yaozhangyingxue.jpg"] = "瑶章映雪",
  ["huangzhong_liejianguanyun.jpg"] = "烈箭贯云",
  ["guanyu_shengchuiqiangu2.jpg"] = "圣垂千古2",
  ["gaoshun_cuifengdangyu.jpg"] = "摧锋荡宇",
  ["fazheng_weijiguangsha.jpg"] = "济危广厦",
  ["dongxie_yuehuiyingtu.jpg"] = "月辉映荼",
  ["dianwei_zhihuoshuojin.jpg"] = "执火烁金",
  ["daqiao_chunhuaifuqing.jpg"] = "春还复青",
  ["ty__fengfangnv_chuangyingjinghua.jpg"] = "窗影镜花",
  ["caoxian_jushuixihe.mp4"] = "掬水戏荷",
  ["caofang_langjihupo.jpg"] = "狼觊虎迫",
  ["caochun_zhuiwangzhubei.jpg"] = "追亡逐北",
  ["caochun_shuohuxianfeng.jpg"] = "朔虎衔锋",
  ["caocao_dihuangkaijia.jpg"] = "帝皇铠甲",
  ["bianyue_queyueqixi.jpg"] = "鹊悦七夕",
  ["caoren_shusijushou.jpg"] = "殊死据守",
  ["caiwenji_yishenzhengdao.mp4"] = "以身证道",
  ["mou__caopi_qidangshanhe.mp4"] = "气荡山河",
  ["caopi_dangranyouxin.mp4"] = "荡然由心",
  ["caoxian_jinshushijuan.mp4"] = "锦书释卷",
  ["caopi_longnianzhongqiu.mp4"] = "龙年中秋",
  ["caopi_weiwangchengdi.mp4"] = "魏王称帝",
  ["caozhi_qibujuezhang.mp4"] = "七步绝章",
  ["caozhi_longnianzhongqiu.mp4"] = "龙年中秋",
  ["godganning_wanrenbiyi.mp4"] = "万人辟易",
  ["godganning_zhanchangrongyao.mp4"] = "战场荣耀",
  ["godhuangzhong_madaogongcheng.mp4"] = "马到功成",
  ["godhuangzhong_jushiduzun.mp4"] = "举世独尊",
  ["godjiangwei_shujianfubo.mp4"] = "敕剑伏波",
  ["godjiangwei_weipanliuyi.mp4"] = "维畔柳依",
  ["godmachao_xunwujinglei.mp4"] = "迅骛惊雷",
  ["godmachao_madaogongcheng.mp4"] = "马到功成",
  ["godmachao_leizhuafucang.mp4"] = "雷挝缚苍",
  ["godpangtong_zhenhuafutian.mp4"] = "臻华福天",
  ["godsunce_bawangzaishi.mp4"] = "霸王再世",
  ["godzhangfei_aonishanhe.mp4"] = "傲睨山河",
  ["godzhangjiao_yudaozhenze.mp4"] = "驭道震泽",
  ["godzhaoyun_baizhanjinjia.mp4"] = "百战金甲",
  ["godzhaoyun_baizhanjinjia2.mp4"] = "百战金甲2",
  ["guanning_moyunhexiang.mp4"] = "墨韵荷香",
  ["guanning_danhefuyun.mp4"] = "丹鹤馥韵",
  ["liuyan_longxingshuchuan.mp4"] = "龙兴蜀川",
  ["liuyan_zhanchangrongyao.mp4"] = "战场荣耀",
  ["liuyan_qiushuangjinfeng.mp4"] = "秋霜金枫",
  ["luyusheng_zhanchangjueban.mp4"] = "战场绝版",
  ["luyusheng_yuguiyueman.mp4"] = "玉桂月满",
  ["lvlingqi_zhiyanliujin.mp4"] = "炽焱流金",
  ["lvlingqi_zhanchangjueban.mp4"] = "战场绝版",
  ["ol__godhuangzhong_jingdianxingxiang.mp4"] = "OL经典形象",
  ["olz__zhonghui_yijianggongcheng.mp4"] = "一将功成",
  ["ol__puyuan_bailianshenqi.mp4"] = "百炼神器",
  ["ol__puyuan_zhanchangjueban.mp4"] = "战场绝版",
  ["quyi_hubenguanyong.mp4"] = "虎贲冠勇",
  ["quyi_yangdaoliwei.mp4"] = "扬刀立威",
  ["ty_wei__mateng_jingdianxingxiang.mp4"] = "经典形象",
  ["xuxin_luyefangzong.mp4"] = "渌野芳粽",
  ["zhaoxiang_yuehenfangying2.mp4"] = "月痕芳影2",
  ["zhaoxiang_shachangfanghun.mp4"] = "沙场芳魂",
  ["zhaoxiang_wanjunyangxiang.mp4"] = "万军扬襄",
  ["zhenji_xunitiantuan.mp4"] = "虚拟天团",
  ["zhenji_zhanchangjueban.mp4"] = "战场绝版",
  ["zhenji_qingluoyuelong.mp4"] = "清洛月泷",
  ["zhenji_niunianqingming.mp4"] = "牛年清明",
  ["zhenji_mingzhuyaoqu.mp4"] = "明珠耀躯",
  ["zhenji_luoshuishenyun.mp4"] = "洛水神韵",
  ["zhenji_duanruiluoshui.mp4"] = "端瑞洛水",
  ["caopi_jiuzuiyeqing.jpg"] = "酒醉夜清",
  ["xiahoushi_liandengyingyue.jpg"] = "莲灯映月",
  ["xizhicai_renyongyiqie.jpg"] = "人慵意惬",
  ["bianyue_lanmeiyingyue.mp4"] = "蓝玫映月",
  ["huangyueying_zhengmianduijue.jpg"] = "正面对决",
  ["duyu_yulinbilang.jpg"] = "驭麟辟浪",
  ["xinxianying_fengzhuluanhui.mp4"] = "凤翥鸾回",
  ["sp__caiwenji_jinxiudaimei.mp4"] = "锦绣黛眉",
  ["diaochan_qiushuiyiren.mp4"] = "秋水伊人",
  ["bailingyun_dieyiwandu.mp4"] = "蝶翼婉渡",
  ["baosanniang_satafeishuang.mp4"] = "飒沓绯霜",
  ["baosanniang_shenqinggujian.mp4"] = "深情故剑",
  ["baoxin_guanjuetianxia.mp4"] = "冠绝天下",
  ["bulianshi_qiushuiyiren.mp4"] = "秋水伊人",
  ["caiwenji_qiushuiyiren.mp4"] = "秋水伊人",
  ["caochun_huxiaolongyuan.mp4"] = "虎啸龙渊",
  ["caochun_huxiaolongyuan2.mp4"] = "虎啸龙渊2",
  ["caohua_caidielianhua.mp4"] = "彩蝶恋花",
  ["caoying_baiquemingchen.mp4"] = "白雀鸣尘",
  ["caoying_shuiqingzhuoying.mp4"] = "水清濯缨",
  ["caoyuan_qiyanyaoyao.mp4"] = "憩颜夭夭",
  ["dengai_jizhanbenxian.mp4"] = "急战奔先",
  ["sunluban_jinzhiyuye.jpg"] = "金枝玉叶",
  ["yinfuren_zhanchangrongyao.jpg"] = "战场荣耀",
  ["pangtong_duoshuai.jpg"] = "夺帅",
  ["sunquan_songcuichangqing.jpg"] = "松翠常青",
  ["caoren_duoshuai.jpg"] = "夺帅",
  ["xingcai_tianxiazhiqiu.jpg"] = "天下知秋",
  ["xingcai_tianxiazhiqiu2.jpg"] = "天下知秋2",
  ["zhouxuan_zhenmengnanke.jpg"] = "枕梦南柯",
  ["yuanyin_zhongshiguzhong.jpg"] = "仲氏孤忠",
  ["sunlingluan_qinglingheming.jpg"] = "青翎和鸣",
  ["tymou__zhangren_xiangfengfuhu.jpg"] = "降凤伏鹄",
  ["caoyi_jinlanhesui.jpg"] = "锦阑贺岁",
  ["olz__xunyou_huizhiqianjun.jpg"] = "挥智千军",
  ["olz__wuxian_jinhuxiangle.jpg"] = "锦虎骧乐",
  ["zhanghua_longquanjianxiao.jpg"] = "龙泉剑啸",
  ["wolongfengchu_chibilianhuo.jpg"] = "赤壁链火",
  ["godsunquan_tonghuiriyue.jpg"] = "同辉日月",
  ["caoying_weiyingfengming.jpg"] = "魏璎凤鸣",
  ["simayi_moudingtianxia.jpg"] = "谋定天下",
  ["mobile__huaman_lingxiufeiyin.jpg"] = "灵袖飞音",
  ["wangyuanji_wenqingliangyuan.jpg"] = "温情良缘",
  ["simazhao_zhaosuyuanxin.jpg"] = "昭苏元心",
  ["simazhao_yongduokuishou.jpg"] = "勇夺魁首",
  ["simazhao_wenqingliangyuan.jpg"] = "温情良缘",
  ["qinghegongzhu_yufeiqionghua.mp4"] = "玉妃琼华",
  ["luyi_shulifenghua.mp4"] = "姝丽风华",
  ["dongguiren_chundiantashui.mp4"] = "春殿踏水",
  ["dufuren_yindaizhuangmei.mp4"] = "银黛妆梅",
  ["fanyufeng_chunxiaofangfei.mp4"] = "春晓芳菲",
  ["ol__bianfuren_yindaizhuangmei.mp4"] = "银黛妆梅",
  ["ganfurenmifuren_shuangshushiqiong.mp4"] = "双姝拾琼",
  ["guohuaij_furuohuaixiang.mp4"] = "芙若槐香",
  ["guohuaij_rougonglinwei.mp4"] = "蹂宫躏闱",
  ["guojia_modianjiangshan.mp4"] = "墨点江山",
  ["guotiying_jinsefanghua.mp4"] = "锦色芳华",
  ["guozhao_ciyuqinghua.mp4"] = "瓷语青花",
  ["huangwudie_yuelandieying.mp4"] = "月澜蝶影",
  ["huangyueying_miaoxiangshenji.mp4"] = "妙想神机",
  ["huangyueying_muniuliuma.mp4"] = "木牛流马",
  ["miniex__xiaoqiao_qingcilianyi.mp4"] = "青瓷涟漪",
  ["godtaishici_yonghanriyue.jpg"] = "勇撼日月",
  ["miniex__daqiao_qingbaiyuan.mp4"] = "青白缘",
  ["miniex__daqiao_qiushuiyiren.mp4"] = "秋水伊人",
  ["miniex__xiaoqiao_qiushuiyiren.mp4"] = "秋水伊人",
  ["miniex__zhouyu_lieyanzhihun.mp4"] = "烈焰炽魂",
  ["wangyuanji_caiyimanwu.mp4"] = "彩翼曼舞",
  ["yanghuiyu_jingyuhehui.mp4"] = "璟瑜荷徽",
  ["jvshou_luodingtianyuan.mp4"] = "落定天元",
  ["mu__daqiao_ruanyuwenxiang.mp4"] = "软玉温香",
  ["mu__zhoufei_shulifenghua.mp4"] = "姝丽风华",
  ["sunhanhua_lianyiqinghe.mp4"] = "莲漪清荷",
  ["lingju_xueyingposuo.mp4"] = "血影婆娑",
  ["liubei_manianxianding.mp4"] = "马年限定",
  ["ol__liuye_fenyantianzheng.mp4"] = "焚焰天征",
  ["lukang_guozhizhushi.mp4"] = "国之柱石",
  ["lvlingqi_bingpoyingxue.mp4"] = "冰魄映雪",
  ["maliang_dangranyouxin.mp4"] = "荡然由心",
  ["mayunlu_huahaiqiangwu.mp4"] = "花海枪舞",
  ["zhangxiu_hubenguanyong.mp4"] = "虎贲冠勇",
  ["pangfengyi_doujiujiaogong.mp4"] = "斗酒交觥",
  ["qinmi_aoyuluntian.mp4"] = "翱宇论天",
  ["qinghegongzhu_qingyaqudou.mp4"] = "清雅趣逗",
  ["qinghegongzhu_wuyinliyan.mp4"] = "雾隐狸颜",
  ["godsimayi_jianwangzhilai.mp4"] = "鉴往知来",
  ["sunru_mulanhanfang.mp4"] = "沐兰含芳",
  ["godxunyu_weihanjianan.mp4"] = "为汉建安",
  ["sunhanhua_sheniankuanghuan.mp4"] = "蛇年狂欢",
  ["sunluban_yuanchaixianglan.mp4"] = "沅茝香兰",
  ["sunru_shenianqingming.mp4"] = "蛇年清明",
  ["sunshangxiang_jiaozoongsanjiang.mp4"] = "骄纵三江",
  ["tianshangyi_shulifenghua.mp4"] = "姝丽风华",
  ["wangyi_jinguozhanye.mp4"] = "巾帼战野",
  ["wangyuanji_posuoqiwu.mp4"] = "婆娑起舞",
  ["ty_wei__dongzhuo_taishanbengshi.mp4"] = "泰山崩石",
  ["ty_wei__sunshangxiang_wu.mp4"] = "武",
  ["wenyuan_qiufengsashuang.mp4"] = "秋风飒爽",
  ["xiahoushi_chunyanzhihua.mp4"] = "春燕之华",
  ["xinxianying_jinxiudaimei.mp4"] = "锦绣黛眉",
  ["sunshangxiang_jinguoqianying.mp4"] = "巾帼倩影",
  ["xurong_zhanhuotianjue.mp4"] = "战祸殄绝",
  ["xusheng_caodaobige.mp4"] = "操刀必割",
  ["xushi_hongdouxiangsi.mp4"] = "红豆相思",
  ["xuxin_yongyixianqu.mp4"] = "慵仪闲趣",
  ["xuangongzhu_qiangyingfangzi.mp4"] = "倩影芳姿",
  ["xuelingyun_baixiuchaofeng.mp4"] = "百绣朝凤",
  ["xuelingyun_jinjiaoqiaoke.jpg"] = "金蛟巧刻",
  ["yanghuiyu_yueyaohuashang.mp4"] = "月耀华裳",
  ["yangzhi_huanhuazhijin.mp4"] = "浣花织锦",
  ["yuanji_yueyingchengbi.mp4"] = "月影澄碧",
  ["zhanghuai_luyoqingping.mp4"] = "鹿呦青苹",
  ["zhangxiu_nucongxinqi.mp4"] = "怒从心起",
  ["zhangxuan_qingluannihuang.mp4"] = "青鸾霓凰",
  ["zhupeilan_qingluoxiashu.mp4"] = "轻罗夏暑",
  ["zhuran_bingranwuju.mp4"] = "禀然无惧",
  ["zhugedan_chouchunjuyi.mp4"] = "寿春举义",
  ["zhugeguo_qiushuiyiren.mp4"] = "秋水伊人",
  ["zhugeliang_guozhizhushi.mp4"] = "国之柱石",
  ["zhugeruoxue_shulifenghua.mp4"] = "姝丽风华",
  ["zhongyan_feihongjingxue.mp4"] = "飞鸿惊雪",
  ["zhongyan_xiasidaiyuan.mp4"] = "遐思黛远",
  ["zhongyu_zongbinongchao.jpg"] = "纵笔弄潮",
  ["wm__zhugeliang_qianguyixiang.jpg"] = "千古一相",
  ["wm__luxun_shenxiuzhengrong.jpg"] = "神秀峥嵘",
  ["ty_wei__caocao_yijianggongcheng.jpg"] = "一将功成",
  ["godsunquan_bihaichaosheng.jpg"] = "碧海潮生",
  ["panghong_mengwaixirang.jpg"] = "梦外熙攘",
  ["ty__liufuren_yelanwanfeng.jpg"] = "夜阑晚风",
  ["zuofen_zhaoshuihongqu.jpg"] = "照水红蕖",
  ["xunchen_ximuzhize.jpg"] = "栖木之择",
  ["xuncai_yarouyingcai.jpg"] = "雅柔映采",
  ["ol__huangchengyan_yezhanjixiong.jpg"] = "夜占吉凶",
  ["mobile__caosong_yanyinggaopeng.jpg"] = "宴迎高朋",
  ["zhangqiying_suirennianfeng.jpg"] = "岁稔年丰",
  ["zhugezhan_fulinchiguo.jpg"] = "缚麟持国",
  ["caifuren_jinyuxunxin.jpg"] = "金玉熏心",
}
-- 武将中文名 → 对应英文武将名列表（源数据取自 old_all_skin）
local skin_general_names = {
  ["赵姬"] = { "zhaoji" },
  ["蕾姆"] = { "fk_dev__rem" },
  ["乐曹植"] = { "mu__caozhi" },
  ["孙寒华"] = { "ol__sunhanhua", "sunhanhua", "ty__sunhanhua", "ofl__sunhanhua", },
  ["清河公主"] = { "qinghegongzhu", "ol__qinghegongzhu", "os__qinghegongzhu", "ty__qinghegongzhu", "sxfy__qinghegongzhu", "mobile__qinghegongzhu" },
  ["钟会"] = { "zhonghui", "ld__zhonghui", "ol_heg__zhonghui", "m_ex__zhonghui", "ofl_wenxin__zhonghui", "ofl2__zhonghui", "shzj_juedai__zhonghui", "sxfy__zhonghui", "wzzz__zhonghui", "ol_ex__zhonghui", "ty_ex__zhonghui", "tymou__zhonghui" },
  ["神钟会"] = { "godzhonghui" },
  ["文钦"] = { "wenqin", "ty__wenqin", "ld__wenqin" },
  ["族钟会"] = { "olz__zhonghui", },
  ["姜维"] = { "ld__jiangwei", "js__jiangwei", "mou__jiangwei", "ofl_mou__jiangwei", "olmou__jiangwei", "tymou__jiangwei",
    "mini_sp__jiangwei",
    "m_ex__jiangwei", "shzj_juedai__jiangwei", "ol_ex__jiangwei", "qw__jiangwei", "jiangwei", "jsp__jiangwei",
    "tycl__jiangwei", "ty_m__jiangwei", },
  ["谋姜维"] = { "mou__jiangwei", "ofl_mou__jiangwei", "olmou__jiangwei", "tymou__jiangwei" },
  ["大乔"] = { "daqiao", "ex__daqiao", "mou__daqiao", "ty_m__daqiao" },
  ["孙尚香"] = { "sunshangxiang", "ex__sunshangxiang", "v11__sunshangxiang", "m_heg__sunshangxiang", "hs__sunshangxiang", "js__sunshangxiang", "mini_mou__sunshangxiang", "mini__sunshangxiang", "mou__sunshangxiang", "ofl_mou__sunshangxiang", "ofl__sunshangxiang", "mrss__sunshangxiang", "wzzz__sunshangxiang", "qshm__sunshangxiang", "sx__sunshangxiang", "tystar__sunshangxiang", "ty_wei__sunshangxiang" },
  ["关羽"] = { "guanyu", "ex__guanyu", "ofl_mou__guanyu", "ofl__guanyu", "olmou__guanyu", "tymou__guanyu" },
  ["势于吉"] = { "m_shi__yuji" },
  ["势钟会"] = { "m_shi__zhonghui" },
  ["貂蝉"] = { "diaochan", "sp__diaochan", "cqym__diaochan", "hs__diaochan", "ex__diaochan", "mou__diaochan", "mini_mou__diaochan", "starsp__diaochan", "ty_m__diaochan", "wzzz__diaochan", "ofl__diaochan", "ofl2__diaochan", "v11__diaochan" },
  ["手杀神姜维"] = { "mobile__godjiangwei", },
  ["十周年神姜维"] = { "godjiangwei", "sxfy__godjiangwei", "ofl__godjiangwei", "ofl_le__godjiangwei" },
  ["柏灵筠"] = { "bailingyun" },
  ["滕芳兰"] = { "ol__tengfanglan", "ty__tengfanglan" },
  ["蔡文姬"] = { "caiwenji", "hs__caiwenji", "mini__caiwenji", "m_ex__caiwenji", "ofl_ex__caiwenji", "wzzz__caiwenji", "sxfy__caiwenji", "ol_ex__caiwenji", "sp__caiwenji" },
  ["SP蔡文姬"] = { "mini_sp__caiwenji", "sp__caiwenji" },
  ["乐蔡文姬"] = { "mu__caiwenji" },
  ["杨彪"] = { "yangbiao", "js__yangbiao", "sxfy__yangbiao", "ty__yangbiao" },
  ["小乔"] = { "xiaoqiao", "hs__xiaoqiao", "m_ex__xiaoqiao", "mou__xiaoqiao", "ofl_tx__xiaoqiao", "ofl_mou__xiaoqiao", "ofl_ex__xiaoqiao", "ol_ex__xiaoqiao", "olmou__xiaoqiao", "ty_m__xiaoqiao" },
  ["陆郁生"] = { "ty_heg__luyusheng", "luyusheng", "ol__luyusheng" },
  ["曹髦"] = { "mobile__caomao", "ofl__caomao", "caomao" },
  ["曹髦2 变身"] = { "mobile2__caomao" },
  ["司马昭"] = { "heg__simazhao", "ld__simazhao", "ol_heg__simazhao", "js__simazhao", "mobile__simazhao", "m_sp__simazhao", "bgm__simazhao", "ofl__simazhao", "sxfy__simazhao", "ol__simazhao" },
  ["文鸯"] = { "heg__wenyang", "js__wenyang", "mobile__wenyang", "ofl__wenyang", "sxfy__wenyang", "wenyang" },
  ["戏志才"] = { "xizhicai", "olmou__xizhicai" },
  ["步练师"] = { "bulianshi", "ty_ex__bulianshi", "re__bulianshi", "ol_ex__bulianshi", "wzzz__bulianshi", "m_ex__bulianshi", "os_heg__bulianshi" },
  ["神庞统"] = { "godpangtong" },
  ["刘焉"] = { "ofl_heg__liuyan", "js__liuyan", "liuyan" },
  ["郭嘉"] = { "hs__guojia", "js__guojia", "mini_mou__guojia", "mou__guojia", "ofl3__guojia", "ofl2__guojia", "ofl__guojia", "wzzz__guojia", "olmou__guojia", "guojia", "ex__guojia" },
  ["神郭嘉"] = { "godguojia", "sxfy__godguojia", "ofl_shiji__godguojia" },
  ["阳谋郭嘉"] = { "tymou__guojia" },
  ["阴谋郭嘉"] = { "tymou2__guojia" },
  ["曹芳"] = { "js__caofang", "caofang" },
  ["周宣"] = { "zhouxuan" },
  ["SP赵云"] = { "ty_m_sp__zhaoyun", "jsp__zhaoyun", "starsp__zhaoyun", "wzzz__zhaoyun" },
  ["孙鲁育"] = { "ty__sunluyu", "sunluyu", "ol__sunluyu", "sxfy__sunluyu", "mobile__sunluyu", "mini__sunluyu" },
  ["贾诩"] = { "mou__jiaxu", "chaos__jiaxu", "hs__jiaxu", "mini__jiaxu", "ofl_mou__jiaxu", "ofl_ex__jiaxu", "ofl3__jiaxu", "ofl_ex2__jiaxu", "ofl2__jiaxu", "ofl__jiaxu", "wzzz__jiaxu", "ol_ex__jiaxu", "olmou__jiaxu", "ol_sp__jiaxu", "jiaxu", "sp__jiaxu", "ty__jiaxu", "tymou__jiaxu", "ty_m__jiaxu" },
  ["谋张让"] = { "olmou__zhangrang" },
  ["杨艳"] = { "yangyan", "var__yangyan" },
  ["威孙权"] = { "ty_wei__sunquan" },
  ["诸葛京"] = { "zhugejing" },
  ["许靖"] = { "ofl_shiji__xujing", "ol__xujing", "os__xujing", "ty__xujing" },
  ["诸葛亮"] = { "zhugeliang", "hs__zhugeliang", "js__zhugeliang", "mou__zhugeliang", "ofl_mou__zhugeliang", "ofl__zhugeliang", "wzzz__zhugeliang", "olmou__zhugeliang", "ex__zhugeliang", "wm__zhugeliang", "ty_m__zhugeliang" },
  ["乐貂蝉"] = { "mu__diaochan" },
  ["诸葛果"] = { "zhugeguo", "mini__zhugeguo", "ofl__zhugeguo", "sxfy__zhugeguo", "ol__zhugeguo", "os__zhugeguo", "ty__zhugeguo" },
  ["乐诸葛果"] = { "mu__zhugeguo" },
  ["张嫙"] = { "zhangxuan", "sxfy__zhangxuan", "js__zhangxuan" },
  ["夏侯玄"] = { "xiahouxuan", "ofl__xiahouxuan", "ty__xiahouxuan" },
  ["许劭"] = { "ty__xushao", "sxfy__xushao", "js__xushao", "js_re__xushao" },
  ["杨芷"] = { "yangzhi", "var__yangzhi" },
  ["徐妏"] = { "xuwen" },
  ["乐小乔"] = { "mu__xiaoqiao" },
  ["乐大乔"] = { "mu__daqiao" },
  ["辛宪英"] = { "xinxianying", "ty__xinxianying", "ol__xinxianying", "ol_ex__xinxianying", "ofl__xinxianying", "ofl_heg__xinxianying", "m_shi__xinxianying", },
  ["族吴苋"] = { "olz__wuxian" },
  ["曹金玉"] = { "caojinyu", "ol__caojinyu", "sxfy__caojinyu", "ofl__caojinyu" },
  ["鲍三娘"] = { "ol__baosanniang", "ty__baosanniang", "os__baosanniang", "sxfy__baosanniang", "mobile__baosanniang", "mini__baosanniang" },
  ["冯方女"] = { "ol__fengfangnv" },
  ["威马超"] = { "ty_wei__machao" },
  ["董絮"] = { "dongxu" },
  ["芮姬"] = { "ruiji" },
  ["黄舞蝶"] = { "huangwudie", "sxfy__huangwudie" },
  ["任婉"] = { "renwan" },
  ["崔令仪"] = { "cuilingyi" },
  ["威刘备"] = { "ty_wei__liubei" },
  ["刘璿"] = { "liuxuan", "ty__liuxuan" },
  ["凌烈"] = { "linglie" },
  ["邹氏"] = { "hs__zoushi", "js__zoushi", "sxfy__zoushi", "ty__zoushi" },
  ["乐邹氏"] = { "mu__zoushi" },
  ["侯昭宁"] = { "houzhaoning" },
  ["李昭仪"] = { "lizhaoyi" },
  ["张昌蒲"] = { "mini__zhangchangpu", "ty__zhangchangpu", "mobile__zhangchangpu", "os_heg__zhangchangpu" },
  ["丁尚涴"] = { "dingfuren", "ol__dingfuren" },
  ["莫琼树"] = { "moqiongshu" },
  ["曹宪"] = { "caoxian" },
  ["族荀彧"] = { "olz__xunyu" },
  ["威张星彩"] = { "ty_wei__xingcai" },
  ["神甘宁"] = { "godganning", },
  ["威董卓"] = { "ty_wei__dongzhuo" },
  ["陈珪"] = { "chengui", "mobile__chengui", },
  ["曹丕"] = { "m_ex__caopi", "ofl_wenxin__caopi", "caopi", "ty_m__caopi", "ofl__caopi", "ty_wei__caopi", "sx__caopi", "ol_le__caopi", "ofl3__caopi", "ofl2__caopi" },
  ["谋曹丕"] = { "mou__caopi", "ofl_mou__caopi", "os_mou__caopi" },
  ["神曹丕"] = { "godcaopi", "ty__godcaopi" },
  ["神太史慈"] = { "godtaishici", "sxfy__godtaishici" },
  ["武陆逊"] = { "wm__luxun" },
  ["武诸葛亮"] = { "wm__zhugeliang" },
  ["王异"] = { "wangyi", "nos__wangyi", "ty_ex__wangyi", "ol_ex__wangyi" },
  ["神鲁肃"] = { "godlusu" },
  ["神吕布"] = { "mobile__godlvbu", "ofl_tx__godlvbu", "ofl__godlvbu", "godlvbu" },
  ["神邓艾"] = { "goddengai" },
  ["董绾"] = { "dongwan" },
  ["何太后"] = { "hetaihou", "ol__hetaihou", "ofl__hetaihou", "ld__hetaihou" },
  ["魏张春华"] = { "os_heg__zhangchunhua", "fd__zhangchunhua", "wzzz__zhangchunhua", "ol_ex__zhangchunhua", "ty_ex__zhangchunhua", "zhangchunhua", "tystar__zhangchunhua" },
  ["晋张春华"] = { "heg__zhangchunhua", "ol_heg__zhangchunhua", "ol__zhangchunhua", },
  ["曹婴"] = { "caoying", "mobile__caoying" },
  ["张瑾云"] = { "zhangjinyun" },
  ["王元姬"] = { "ty__wangyuanji", "ol__wangyuanji", "sxfy__wangyuanji", "bgm__wangyuanji", "mobile__wangyuanji", "mini__wangyuanji", "ol_heg__wangyuanji", "heg__wangyuanji" },
  ["势太史慈"] = { "m_shi__taishici" },
  ["势魏延"] = { "m_shi__weiyan" },
  ["势魏延2"] = { "m_shi2__weiyan" },
  ["势魏延3"] = { "m_shi3__weiyan" },
  ["周瑜"] = { "zhouyu", "hs__zhouyu", "mini_mou__zhouyu", "mou__zhouyu", "ofl_tx__zhouyu", "ofl__zhouyu", "ofl4__zhouyu", "ofl2__zhouyu", "ofl3__zhouyu", "ofl5__zhouyu", "wzzz__zhouyu", "olmou__zhouyu", "ex__zhouyu", "ty_m__zhouyu" },
  ["谋周瑜（阳）"] = { "tymou__zhouyu" },
  ["谋周瑜（阴）"] = { "tymou2__zhouyu" },
  ["司马师"] = { "heg__simashi", "ol_heg__simashi", "os_heg__simashi", "mini__simashi", "sxfy__simashi", "qshm__simashi", "ol__simashi", "os__simashi", "tymou__simashi" },
  ["徐荣"] = { "ofl_heg__xurong", "mobile__xurong", "xurong" },
  ["界徐盛"] = { "ty_ex__xusheng", "ol_ex__xusheng", "m_ex__xusheng", "ol_ex_heg__xusheng", },
  ["徐盛"] = { "ty_ex__xusheng", "ol_ex__xusheng", "m_ex__xusheng", "ol_ex_heg__xusheng", "mouxusheng", "v33__xusheng", "ld__xusheng", "shzj_guansuo__xusheng", "wzzz__xusheng", "re__xusheng", "tymou__xusheng", "xusheng" },
  ["极蔡文姬"] = { "miniex__caiwenji" },
  ["郭女王"] = { "mobile__guozhao", "sxfy__guozhao", "os__guozhao" },
  ["董翓"] = { "ol__dongxie", "dongxie" },
  ["管宁"] = { "guanning" },
  ["谋司马懿"] = { "tymou__simayi" },
  ["魏张辽"] = { "zhangliao", "hs__zhangliao", "mini_mou__zhangliao", "m_thoroughbred__zhangliao", "mou__zhangliao", "ofl__zhangliao", "wzzz__zhangliao", "os_thoroughbred__zhangliao", "ex__zhangliao" },
  ["神荀彧"] = { "godxunyu", "sxfy__godxunyu", "ofl_shiji__godxunyu" },
  ["卢氏"] = { "lushi" },
  ["神赵云"] = { "godzhaoyun", "ty_m__godzhaoyun", "nos__godzhaoyun", "ofl__godzhaoyun" },
  ["诸葛瑾"] = { "ol__zhugejin", "v33__zhugejin", "os_heg__zhugejin", "mou__zhugejin", "wzzz__zhugejin", "os_mou__zhugejin", "zhugejin", "tymou__zhugejin", "tystar__zhugejin" },
  ["马忠"] = { "ol__mazhong", "ty_ex__mazhong", "mazhong" },
  ["族王浑"] = { "olz__wanghun" },
  ["羊徽瑜"] = { "ty__yanghuiyu", "mobile__yanghuiyu", "os_heg__yanghuiyu", "heg__yanghuiyu", "ol__yanghuiyu", "ol_heg__yanghuiyu" },
  ["赵嫣"] = { "sxfy__zhaoyanw", "zhaoyanw" },
  ["张媱"] = { "zhangyao", "os__zhangyao" },
  ["张琪瑛"] = { "mobile__zhangqiying", "ol__zhangqiying", "zhangqiying" },
  ["族陆绩"] = { "olz__luji", "ofl__luji" },
  ["诸葛梦雪"] = { "zhugemengxue" },
  ["张奋"] = { "mobile__zhangfen", "sxfy__zhangfen", "zhangfen" },
  ["周处"] = { "n_jz__zhouchu", "os_heg__zhouchu", "mobile__zhouchu", "sxfy__zhouchu", "ol__zhouchu", "os__zhouchu" },
  ["友诸葛亮"] = { "m_friend__zhugeliang", "cqym__zhugeliang" },
  ["友徐庶"] = { "m_friend__xushu", "os_friend__xushu" },
  ["杨婉"] = { "ol__yangwan", "mou__yangwan", "ty_heg__yangwan", "ty__yangwan" },
  ["徐晃"] = { "hs__xuhuang", "m_ex__xuhuang", "mou__xuhuang", "ofl_ex__xuhuang", "ofl__xuhuang", "wzzz__xuhuang", "ol_ex__xuhuang", "xuhuang", "ty_m__xuhuang" },
  ["徐氏"] = { "miniamb__xushi", "xushi", "mini__xushi", "ofl__xushi" },
  ["荀攸"] = { "ld__xunyou", "xunyou", "ty_ex__xunyou" },
  ["袁绍"] = { "m_heg__lordyuanshao", "hs__yuanshao", "js__yuanshao", "mini_ex__yuanshao", "mou__yuanshao", "ofl_tx__yuanshao", "ofl_mou__yuanshao", "ofl2__yuanshao", "ofl__yuanshao", "wzzz__yuanshao", "ol_ex__yuanshao", "olmou__yuanshao", "yuanshao", "tystar__yuanshao", "ty_m__yuanshao" },
  ["羊祜"] = { "heg__yanghu", "ty_heg__yanghu", "mobile__yanghu", "sxfy__yanghu", "ofl_shiji__yanghu", "ol__yanghu", "ty__yanghu" },
  ["袁姬"] = { "ol__yuanji", "yuanji" },
  ["阎柔"] = { "yanrou", "os_heg__yanrou" },
  ["蒋琬"] = { "ty__jiangwan", "tystar__jiangwan", "qw__jiangwan", "sxfy__jiangwan", "ol__jiangwan", "jiangwan" },
  ["曹休"] = { "caoxiu", "nos__caoxiu", "ty_ex__caoxiu", "os_ex__caoxiu", "ol_ex__caoxiu", "mini__caoxiu" },
  ["胡金定"] = { "ty__hujinding", "ol__hujinding", "sxfy__hujinding", "wzzz__hujinding", "hujinding" },
  ["孔淑"] = { "kongshu", "ofl__kongshu" },
  ["邓艾"] = { "ld__dengai", "js__dengai", "m_shi__dengai", "m_ex__dengai", "ofl__dengai", "wzzz__dengai", "ol_ex__dengai", "olmou__dengai", "ol__dengai", "dengai", "tymou__dengai", "tycl__dengai", "ty_m__dengai" },
  ["法正"] = { "ld__fazheng", "mxing__fazheng", "mou__fazheng", "ol_ex__fazheng", "os_ex__fazheng", "os_xing__fazheng", "ty_ex__fazheng", "tymou__fazheng", "tystar__fazheng", "nos__fazheng", "fazheng" },
  ["吴苋"] = { "ty_m__wuxian", "wuxian" },
  ["卧龙诸葛"] = { "hs__wolong", "mini_mou__wolong", "mini_ex__wolong", "m_ex__wolong", "mou__wolong", "ofl_tx__wolong", "ofl_mou__wolong", "ofl__wolong", "ofl2__wolong", "wzzz__wolong", "ol_ex__wolong", "wolong", "ty_m__wolong" },
  ["文鸳"] = { "wenyuan", "sxfy__wenyuan" },
  ["魏延"] = { "n_jz__weiyan", "ofl_heg__weiyan", "hs__weiyan", "mini_star__weiyan", "mini_ex__weiyan", "m_shi__weiyan", "mxing__weiyan", "m_ex__weiyan", "wzzz__weiyan", "ol_ex__weiyan", "os_xing__weiyan", "weiyan", "ty_m__weiyan" },
  ["威张辽"] = { "ty_wei__zhangliao" },
  ["王荣"] = { "ty__wangrongh", "wangrongh", "sxfy__wangrongh", "ol_heg__wangrongh" },
  ["滕公主"] = { "tenggongzhu" },
  ["孙鲁班"] = { "es__sunluban", "m_ex__sunluban", "mini_ex__sunluban", "os_heg__sunluban", "sxfy__sunluban", "ol_ex__sunluban", "ty_ex__sunluban", "sunluban" },
  ["神许褚"] = { "godxuchu", "sxfy__godxuchu", "ofl__godxuchu" },
  ["神孙策"] = { "godsunce", "os__godsunce", "sxfy__godsunce" },
  ["神陆逊"] = { "godluxun" },
  ["神黄忠"] = { "godhuangzhong", "ol__godhuangzhong" },
  ["阮瑀"] = { "ruanyu" },
  ["秦宜禄"] = { "qinyilu" },
  ["南华老仙"] = { "ty_heg__nanhualaoxian", "js__nanhualaoxian", "sgsh__nanhualaoxian", "nanhualaoxian", "ol__nanhualaoxian", "ty__nanhualaoxian" },
  ["谋鲁肃阳"] = { "tymou__lusu" },
  ["谋鲁肃阴"] = { "tymou2__lusu" },
  ["谋贾诩阳"] = { "tymou__jiaxu" },
  ["谋贾诩阴"] = { "tymou2__jiaxu" },
  ["黄盖"] = { "huanggai", "hs__huanggai", "mou__huanggai", "ofl__huanggai", "ex__huanggai" },
  ["魔吕布"] = { "ofl6__lvbu", "ol_evil__lvbu" },
  ["鲁肃"] = { "ofl_ex2__lusu", "ofl__lusu", "wzzz__lusu", "ol_ex__lusu", "olmou__lusu", "ofl_ex__lusu", "m_shi__lusu", "lusu", "sx__lusu" },
  ["柳婒"] = { "liutan" },
  ["刘永"] = { "liuyong", "js__liuyong", "js_re__liuyong" },
  ["极荀彧"] = { "miniex__xunyu" },
  ["刘表"] = { "js__liubiao", "mini_ex__liubiao", "m_ex__liubiao", "mou__liubiao", "ofl_tx__liubiao", "sxfy__liubiao", "ol_ex__liubiao", "re__liubiao", "ty_ex__liubiao", "liubiao" },
  ["李儒"] = { "m_ex__liru", "es__liru", "ofl_tx__liru", "sxfy__liru", "wzzz__liru", "ol_ex__liru", "ol__liru", "os_ex__liru", "ty_ex__liru", "nos__liru", "liru" },
  ["李采薇"] = { "licaiwei" },
  ["乐周瑜"] = { "mu__zhouyu", "m_liuyi__zhouyu" },
  ["极张春华"] = { "miniex__zhangchunhua" },
  ["黄月英"] = { "nd_story__huangyueying", "huangyueying", "v11__huangyueying", "hs__huangyueying", "mini_sp__huangyueying", "wzzz__huangyueying", "ty_m__huangyueying", "mini_mou__huangyueying", "mini_ex__huangyueying", "mou__huangyueying", "ofl_mou__huangyueying", "olmou__huangyueying", "ol_sp__huangyueying", "jsp__huangyueying", "ex__huangyueying", "ty_ex__huangyueying" },
  ["极陆逊"] = { "miniex__luxun" },
  ["极刘备"] = { "miniex__liubei" },
  ["极郭嘉"] = { "miniex__guojia" },
  ["极典韦"] = { "miniex__dianwei" },
  ["极曹植"] = { "miniex__caozhi" },
  ["黄忠"] = { "js__huangzhong", "hs__huangzhong", "mini_star__huangzhong", "mini_mou__huangzhong", "mini__huangzhong", "mini_ex__huangzhong", "mxing__huangzhong", "mou__huangzhong", "shzj_yiling__huangzhong", "ol_ex__huangzhong", "huangzhong" },
  ["高顺"] = { "m_ex__gaoshun", "mou__gaoshun", "ofl_tx2__gaoshun", "ofl_tx__gaoshun", "ol_ex__gaoshun", "m_yuan__gaoshun", "ol__gaoshun", "ty_ex__gaoshun", "gaoshun" },
  ["典韦"] = { "hs__dianwei", "m_ex__dianwei", "ofl_ex__dianwei", "wzzz__dianwei", "ol_ex__dianwei", "ol__dianwei", "os__xia__dianwei", "dianwei", "tymou__dianwei", "ty_m__dianwei" },
  ["冯妤"] = { "ty__fengfangnv" },
  ["曹纯"] = { "mini__caochun", "ofl_heg__caochun", "caochun", "sxfy__caochun", "ol__caochun", "ty__caochun" },
  ["曹操"] = { "m_heg__lordcaocao", "ofl_heg__caocao", "ld__lordcaocao", "hs__caocao", "n_jz__caocao", "caocao", "js__caocao", "mini__caocao", "m_sp__caocao", "mou__caocao", "ofl_mou__caocao", "vd__caocao", "ofl_wenxin__caocao", "es__caocao", "ofl3__caocao", "ofl2__caocao", "ofl__caocao", "ofl4__caocao", "wzzz__caocao", "ol_ex__caocao", "ol__caocao", "ol_sp__caocao", "os_sp__caocao", "ex__caocao", "sx2__caocao", "sx__caocao", "tycl__caocao", "ty_wei__caocao", "ty_m__caocao" },
  ["卞玥"] = { "bianyue" },
  ["曹仁"] = { "hs__caoren", "mini__caoren", "mou__caoren", "ofl2__caoren", "ofl__caoren", "shzj_xiangfan__caoren", "ol__caoren", "ol_sp__caoren", "caoren", "y13__caoren", "starsp__caoren", "sx__caoren", "tystar__caoren" },
  ["神马超"] = { "mobile__godmachao", "ofl__godmachao", "ofl3__godmachao", "ofl4__godmachao", "ofl5__godmachao", "ofl6__godmachao", "ofl2__godmachao", "sxfy__godmachao", "os__godmachao", "godmachao" },
  ["神张飞"] = { "godzhangfei" },
  ["神张角"] = { "ofl2__godzhangjiao", "ofl__godzhangjiao", "qshm__godzhangjiao", "ol__godzhangjiao", "godzhangjiao" },
  ["吕玲绮"] = { "ty_heg__lvlingqi", "mhsj__lvlingqi", "sxfy__lvlingqi", "ol__lvlingqi", "lvlingqi" },
  ["蒲元"] = { "ol__puyuan", "ty__puyuan", "ty_sp__puyuan" },
  ["麴义"] = { "ofl_heg__quyi", "ofl_tx__quyi", "sxfy__quyi", "wzzz__quyi", "quyi", "ty__quyi" },
  ["曹植"] = { "ol_heg__caozhi", "mini__caozhi", "m_ex__caozhi", "ofl_wenxin__caozhi", "ofl__caozhi", "ol_ex__caozhi", "ty_ex__caozhi", "caozhi" },
  ["威马腾"] = { "ty_wei__mateng" },
  ["徐馨"] = { "xuxin" },
  ["甄姬"] = { "zhenji", "ex__zhenji", "hs__zhenji", "mini_mou__zhenji", "mini_ex__zhenji", "mou__zhenji", "ofl__zhenji", "es__zhenji", "ty_m__zhenji" },
  ["夏侯氏"] = { "mou__xiahoushi", "sp__xiahoushi", "ty_ex__xiahoushi", "xiahoushi" },
  ["杜预"] = { "heg__duyu", "m_heg__duyu", "ol_heg__duyu", "mobile__duyu", "mrss__duyu", "mrss2__duyu", "wzzz__duyu", "sxfy__duyu", "ofl_shiji__duyu", "ol__duyu", "ty__duyu" },
  ["赵襄"] = { "zhaoxiang", "os__zhaoxiang", "ty__zhaoxiang", "qshm__zhaoxiang" },
  ["鲍信"] = { "mobile__baoxin", "sxfy__baoxin", "baoxin" },
  ["曹华"] = { "os__caohua", "caohua" },
  ["曹媛"] = { "caoyuan" },
  ["尹夫人"] = { "yinfuren" },
  ["庞统"] = { "hs__pangtong", "js__pangtong", "mini__pangtong", "m_ex__pangtong", "mou__pangtong", "ofl_mou__pangtong", "ofl_ex__pangtong", "ofl__pangtong", "wzzz__pangtong", "wzzz2__pangtong", "qshm__pangtong", "ol_ex__pangtong", "olmou__pangtong", "pangtong", "ty_m__pangtong" },
  ["孙权"] = { "sunquan", "m_heg__lordsunquan", "hs__sunquan", "ld__lordsunquan", "miniamb__sunquan", "mini_mou__sunquan", "m_yuan__sunquan", "mou__sunquan", "ofl_mou__sunquan", "var__sunquan", "ofl__sunquan", "wzzz__sunquan", "ol_ex__sunquan", "ex__sunquan", "tycl__sunquan", "ty_wei__sunquan" },
  ["张星彩"] = { "ofl_heg__xingcai", "mini__xingcai", "cqym__xingcai", "ol__xingcai", "os_heg__xingcai", "ty_wei__xingcai", "ty_m__xingcai" },
  ["袁胤"] = { "yuanyin" },
  ["薛灵芸"] = { "ol__xuelingyun", "xuelingyun" },
  ["孙翎鸾"] = { "ol__sunlingluan", "sunlingluan" },
  ["张任"] = { "ld__zhangren", "js__zhangren", "ty__zhangren", "tymou__zhangren" },
  ["曹轶"] = { "caoyi" },
  ["族荀攸"] = { "olz__xunyou" },
  ["张华"] = { "zhanghua" },
  ["卧龙凤雏"] = { "wolongfengchu" },
  ["神孙权"] = { "ofl_le__godsunquan", "godsunquan", "ty__godsunquan" },
  ["司马懿"] = { "simayi", "heg__lordsimayi", "heg__simayi", "ol_heg__simayi", "hs__simayi", "js__simayi", "ofl3__simayi", "ofl4__simayi", "ofl2__simayi", "ofl__simayi", "wzzz__simayi", "ol__simayi", "ex__simayi", "ty_m__simayi" },
  ["花鬘"] = { "ty__huaman", "mobile__huaman", "sxfy__huaman" },
  ["卢弈"] = { "luyi" },
  ["董贵人"] = { "dongguiren" },
  ["杜夫人"] = { "dufuren" },
  ["卞夫人"] = { "ol__bianfuren", "os__bianfuren", "ofl_shiji__bianfuren", "mobile__bianfuren", "mini__bianfuren", "ld__bianfuren" },
  ["樊玉凤"] = { "sxfy__fanyufeng", "fanyufeng" },
  ["甘夫人糜夫人"] = { "ganfurenmifuren" },
  ["甘夫人"] = { "m_heg__ganfuren", "hs__ganfuren", "mobile__ganfuren", "sxfy__ganfuren", "ganfuren", "ty__ganfuren", },
  ["郭槐"] = { "heg__guohuaij", "guohuaij" },
  ["郭缇萦"] = { "guotiying" },
  ["郭照"] = { "guozhao", "ol__guozhao", "ofl__guozhao", "js__guozhao", "js_re__guozhao" },
  ["极小乔"] = { "miniex__xiaoqiao" },
  ["极大乔"] = { "miniex__daqiao" },
  ["极周瑜"] = { "miniex__zhouyu" },
  ["沮授"] = { "mini__jvshou", "m_ex__jvshou", "ofl_tx__jvshou", "sxfy__jushou", "olmou__jvshou", "os_ex__jvshou", "ty_ex__jvshou", "tymou__jvshou", "jvshou" },
  ["周妃"] = { "mu__zhoufei", "m_ex__zhoufei", "ol__zhoufei", "zhoufei", "ty_m__zhoufei", },
  ["灵雎"] = { "lingju", "ty__lingju", "os__lingju", "ol__lingju", "mobile__lingju", },
  ["刘备"] = { "liubei", "v11__liubei", "ld__lordliubei", "m_heg__lordliubei", "os_heg__liubei", "hs__liubei", "js__liubei", "js_re__liubei", "mou__liubei", "ofl_tx__liubei", "ofl_mou__liubei", "es__liubei", "ofl__liubei", "ofl2__liubei", "shzj_yiling__liubei", "wzzz__liubei", "ol_ex__liubei", "os__xia__liubei", "starsp__liubei", "ex__liubei", "tycl__liubei", "ty_wei__liubei", "ty_m__liubei" },
  ["刘晔"] = { "mobile__liuye", "sxfy__liuye", "ol__liuye", "ty__liuye" },
  ["陆抗"] = { "ld__lukang", "js__lukang", "mini__lukang", "shzj_juedai__lukang", "qyt__lukang", "lukang", "wm__lukang" },
  ["马良"] = { "mobile__maliang", "sxfy__maliang", "wzzz__maliang", "ol__maliang", "maliang", "tw__maliang" },
  ["张绣"] = { "os_heg__zhangxiu", "ld__zhangxiu", "ofl_tx__zhangxiu", "wzzz__zhangxiu", "olmou__zhangxiu", "os__zhangxiu", "zhangxiu", "tymou__zhangxiu" },
  ["庞凤衣"] = { "pangfengyi" },
  ["秦宓"] = { "os_heg__qinmi", "miniex__qinmi", "qinmi" },
  ["神司马懿"] = { "mobile__godsimayi", "ofl__godsimayi", "ofl2__godsimayi", "godsimayi" },
  ["孙茹"] = { "sunru", "wzzz__sunru", "ol__sunru", "ty__sunru" },
  ["田尚衣"] = { "tianshangyi" },
  ["威孙尚香"] = { "ty_wei__sunshangxiang" },
  ["宣公主"] = { "xuangongzhu", "ty__xuangongzhu" },
  ["张怀"] = { "zhanghuai" },
  ["朱佩兰"] = { "zhupeilan" },
  ["朱然"] = { "zhuran", "tymou__zhuran", "ty_ex__zhuran", "os_mou__zhuran", "ol_ex__zhuran", "wzzz__zhuran", "nos__zhuran", "mou__zhuran", "m_ex__zhuran", "os_heg__zhuran" },
  ["诸葛诞"] = { "ofl_heg__zhugedan", "js__zhugedan", "wzzz__zhugedan", "olz__zhugedan", "ol__zhugedan", "zhugedan", "ty_ex__zhugedan", "ty_m__zhugedan" },
  ["诸葛若雪"] = { "zhugeruoxue" },
  ["钟琰"] = { "olz__zhongyan", "zhongyan" },
  ["潘淑"] = { "ol__panshu", "ty__panshu" },
  ["钟毓"] = { "zhongyu", "olz__zhongyu", },
  ["威曹操"] = { "ty_wei__caocao" },
  ["庞宏"] = { "panghong" },
  ["刘懿君"] = { "ty__liufuren" },
  ["左棻"] = { "zuofen" },
  ["荀谌"] = { "ty_heg__xunchen", "nos__xunchen", "ofl_shiji__xunchen", "olz__xunchen", "ol__xunchen", "os__xunchen", "ty__xunchen" },
  ["荀采"] = { "olz__xuncai" },
  ["黄承彦"] = { "ol__huangchengyan", "ty__huangchengyan" },
  ["曹嵩"] = { "mobile__caosong", "ofl__caosong", "ty__caosong" },
  ["诸葛瞻"] = { "os_heg__zhugezhan", "shzj_juedai__zhugezhan", "nos__zhugezhan", "zhugezhan" },
  ["蔡夫人"] = { "mini_ex__caifuren", "m_ex__caifuren", "ofl_tx__caifuren", "ol_ex__caifuren", "ty_ex__caifuren", "caifuren" },
  ["势陆郁生"] = { "m_shi__luyusheng", "os_shi__luyusheng" },
  ["孙綝"] = { "m_shi__sunchen", "ld__sunchen", "ofl__sunchen", "sxfy__sunchen", "sunchen", },
  ["乐祢衡"] = { "mu__miheng" },
  ["祢衡"] = { "ty_heg__miheng", "miheng", "ofl__miheng", "sxfy__miheng", "ol__miheng", "ty__miheng", },
  ["孙策"] = { "ld__sunce", "js__sunce", "m_ex__sunce", "mou__sunce", "ofl_tx__sunce", "ofl_ex__sunce", "ofl__sunce", "wzzz__sunce", "ol_ex__sunce", "sunce", "ty_m__sunce", "ty_wei__sunce", "tycl__sunce" },
  ["蒋济"] = { "jiangji" },
  ["马云騄"] = { "ol_heg__mayunlu", "os_heg__mayunlu", "ofl__mayunlu", "sxfy__mayunlu", "mayunlu", "os__mayunlu", "ty__mayunlu" },
  ["极马云騄"] = { "miniex__mayunlu" },
  ["势桓阶"] = { "m_shi__huanjie", "os_shi__huanjie", },
  ["周夷"] = { "ty_heg__zhouyi", "zhouyi", },
  ["张宁"] = { "sxfy__zhangning", "os__zhangning", "ty__zhangning", },
  ["郝昭"] = { "haozhao", },
  ["马伶俐"] = { "malingli", },
  ["荀彧"] = { "hs__xunyu", "m_ex__xunyu", "mou__xunyu", "ofl_mou__xunyu", "ofl__xunyu", "wzzz__xunyu", "olz__xunyu",
    "ol_ex__xunyu", "xunyu", "sx__xunyu", "tystar__xunyu", },
  ["李婉"] = { "ol__liwan", "liwan", },
  ["夏侯徽"] = { "miniamb__xiahouhui", "xiahouhui", "ty__xiahouhui", "ol_heg__xiahouhui", },
  ["诸葛均"] = { "zhugejun", "ty__zhugejun", },
  ["关索"] = { "ofl_heg__guansuo", "mini__guansuo", "guansuo", "shzj_guansuo__guansuo", "sxfy__guansuo", "ol__guansuo", "ty__guansuo", },
  ["来莺儿"] = { "laiyinger" },
  ["赵云"] = { "zhaoyun", "v33__zhaoyun", "hs__zhaoyun", "js__zhaoyun", "mini_mou__zhaoyun", "mini__zhaoyun",
    "mini_ex__zhaoyun", "mou__zhaoyun", "ofl_tx__zhaoyun", "ofl_mou__zhaoyun", "wzzz__zhaoyun", "ol_js__zhaoyun",
    "ol_ex__zhaoyun", "olmou__zhaoyun", "ex__zhaoyun", "sx__zhaoyun", "ty_m__zhaoyun", },
  ["神华佗"] = { "godhuatuo", "sxfy__godhuatuo", "ty__godhuatuo", },
  ["郭皇后"] = { "sxfy__guohuanghou", "ol_ex__guohuanghou", "ty_ex__guohuanghou", "guohuanghou", },
  ["极郭皇后"] = { "miniex__guohuanghou", },
  ["吴国太"] = { "os_heg__wuguotai", "ld__wuguotai", "mini__wuguotai", "m_ex__wuguotai", "ol_ex__wuguotai", "ty_ex__wuguotai", "wuguotai", },
  ["贺齐"] = { "m_shi__heqi", "mobile__heqi", "heqi", },
  ["费祎"] = { "os_heg__feiyi", "mobile__feiyi", "sxfy__feiyi", "ol__feiyi", "os__feiyi", "ty__feiyi", },
  ["曹节"] = { "miniamb__caojie", "fhyx__caojie", "ol_ex__caojie", "caojie", },
  ["环淑君"] = { "huanshujun", },
  ["董予安"] = { "ol__dongguiren", },
  ["孙鸢"] = { "sunyuan" },
  ["刘辩"] = { "liubian", "wzzz__liubian", },
  ["黄皓"] = { "huanghao", "ty__huanghao", "wzzz__huanghao", },
  ["郭淮"] = { "ofl_heg__guohuai", "os_heg__guohuai", "mini_ex__guohuai", "mou__guohuai", "ol_ex__guohuai", "ol__guohuai",
    "os_ex__guohuai", "ty_ex__guohuai", "guohuai", },
  ["孙坚"] = { "hs__sunjian", "js__sunjian", "js_re__sunjian", "m_js__sunjian", "m_ex__sunjian", "wzzz__sunjian",
    "ol_js__sunjian",
    "ol_ex__sunjian", "olmou__sunjian", "ol_fd__sunjian", "os_ex__sunjian", "sunjian", "tystar__sunjian", "ty_m__sunjian", },
  ["王朗"] = { "mxing__wanglang", "wanglang", "sxfy__wanglang", "ol__wanglang", "ty__wanglang", },
  ["张松"] = { "os_heg__zhangsong", "wzzz__zhangsong", "ol_ex__zhangsong", "ty_ex__zhangsong", "tystar__zhangsong", "zhangsong", },
  ["关银屏"] = { "ofl_heg__guanyinping", "mini__guanyinping", "mobile__guanyinping", "ofl__guanyinping",
    "shzj_guansuo__guanyinping",
    "wzzz__guanyinping", "cqym__guanyinping", "ol__guanyinping", "guanyinping", "sx__guanyinping", "ty_wei__guanyinping", },
  ["武皇甫嵩"] = { "wm__huangfusong" },
  ["桓范"] = { "huanfan" },
  ["祝融"] = { "hs__zhurong", "mini_mou__zhurong", "mou__zhurong", "ofl_ex__zhurong", "ol_ex__zhurong", "olmou__zhurong",
    "os_ex__zhurong",
    "zhurong", "ty_sp__zhurong", "ty_m__zhurong", },
  ["丁原"] = { "os_heg__dingyuan", "dingyuan", "ty__dingyuan", },
  ["袁术"] = { "ld__yuanshu", "mini__yuanshu", "m_sp_lord__yuanshu", "mobile__yuanshu", "m_ex__yuanshu", "ofl_tx__yuanshu",
    "wzzz__yuanshu", "olmou__yuanshu", "thunder__yuanshu", "yuanshu", "std__yuanshu", "tystar__yuanshu", "ty_m__yuanshu", },
  ["孟获"] = { "hs__menghuo", "mini_mou__menghuo", "mini__menghuo", "mou__menghuo", "ofl_mou__menghuo", "wzzz__menghuo",
    "ol_ex__menghuo", "ol_le__menghuo", "ol__menghuo", "ol_sp__menghuo", "os_ex__menghuo", "menghuo", "ty_sp__menghuo",
    "ty_m__menghuo", },
  ["骥张辽"]={"m_thoroughbred__zhangliao"},
  ["郭汜"]={"chaos__guosi","ofl_tx__guosi","ofl__guosi","ol_fd__guosi","guosi",},
  ["张宝"]={"nd_story__zhangbao","mobile__zhangbao","ofl_tx__zhangbao","ol__zhangbao","zhangbao","ty__zhangbao"},
  ["张梁"]={ "nd_story__zhangliang","ofl_tx__zhangliang","sp__zhangliang","zhangliang",},
  ["魔貂蝉"]={"ofl__diaochan","ol_evil__diaochan",},
}
-- 核心批量处理函数：提取通用逻辑
local function add_skins_batch(skins_array, extension_name)
  local content_map = {}
  local trans_table = {}

  -- 1. 遍历字符串数组，进行拆分和分类
  for _, str in ipairs(skins_array) do
    local parts = U.split(str, "、")
    if #parts >= 2 then
      local general_zh = parts[1]
      -- 兼容 "武将、皮肤系列、皮肤名" 的多段情况，取最后一段作为实际显示的翻译名称
      local skin_desc = parts[#parts]
      local file_name = str .. extension_name

      -- 将需要加载的翻译存入表中
      trans_table[file_name] = skin_desc

      -- 将属于同一个武将的皮肤合并在一起，避免重复生成 content 块
      if skin_general_names[general_zh] then
        if not content_map[general_zh] then
          content_map[general_zh] = {}
        end
        table.insert(content_map[general_zh], file_name)
      else
        p("未注册的武将名称：" .. general_zh)
      end
    end
  end

  -- 2. 组装最终供 addSkinPackage 使用的数据体
  local final_content = {}
  for gen_zh, skin_list in pairs(content_map) do
    -- 通过表直接检索英文 ID。如果未查找到该武将，则默认退回中文名（防止报错并起到提示作用）
    local gen_ids = skin_general_names[gen_zh]
    if gen_ids then
      table.insert(final_content, {
        enabled_generals = gen_ids,
        skins = skin_list
      })
    end
  end


  -- 3. 批量加载翻译表
  if next(trans_table) then
    Fk:loadTranslationTable(trans_table)
  end

  -- 4. 批量添加皮肤拓展包
  if #final_content > 0 then
    extension:addSkinPackage {
      url = rem_url,
      content = final_content
    }
  end
end

-- 专门处理 mp4 动态皮肤的函数
local asev = function(skins_array)
  add_skins_batch(skins_array, ".mp4")
end

-- 专门处理 jpg 静态皮肤的函数
local asej = function(skins_array)
  add_skins_batch(skins_array, ".jpg")
end
asev {
  "马云騄、花海舞枪",
  "步练师、绘鸢黛情",
  "关索、兔娇春浓",
  "来莺儿、飞花舞斓",
  "乐祢衡、鼓乐幽篁",
  "马云騄、蛇年七夕",
  "孙鲁班、玉颜双娇",
  "孙权、绘鸢黛情",
  "夏侯徽、情澜拾珠",
  "张星彩、凯旋星花",
  "赵云、蛇年七夕",
  "诸葛京、冰翎寒天",
  "诸葛京、铁马入梦",
  "诸葛均、山海遨宇",
  "黄皓、蛇蝎蛊心",
  "李儒、鸩杀少帝",
  "张松、沃鲤泽汉",
  "刘辩、彼岸幽霜",
  "关银屏、凤屏银月",
  "刘备、六星耀帝",
  "戏志才、忠魏河山",
  "丁原、龙腾寰宇",
  "袁术、登极至尊",
  "魏张春华、名将杀",
  "魏张春华、宣穆夜袭",
  "魏张春华、伊人绮梦",
  "魏张春华、玉鸾翩跹",
  "魏张春华、月下瑶情",
  "胡金定、云梦涟漪",
  "孟获、斧过城摧",
  "张嫙、涟漪夏梦",
  "诸葛果、兰荷艾莲",
  "曹媛、祥瑞迎春",
  "大乔、清萧清丽",
  "貂蝉、出水如月",
  "冯方女、丹唇点绛",
  "冯方女、轻舟月岚",
  "花鬘、锋丽鬘影",
  "花鬘、蛮帼英飒",
  "华雄、势吞海岳",  
  "黄月英、智心巧手",
  "麴义、扬刀立威",
  "魔貂蝉、幻惑欲影",
  "神黄忠、赤血丹心",  
  "孙鲁班、牛年端午",
  "孙鲁育、牛年端午",
  "孙权、吴王六剑",
  "滕芳兰、脂车香姝",  
  "吴苋、金玉满堂",
  "徐氏、为夫弑敌",
  "杨婉、星光淑婉",
  "杨艳、妍芷艳质",  
  "张昌蒲、静谧轻舟",
  "张昌蒲、蒲月念兔",
  "张琪瑛、定心锁意",
  "张星彩、临军对阵",
  "钟琰、雪荣钟情",
  "左棻、凝脂铅华",
}
asej {
  "邓艾、神兵天降",
  "郝昭、战场荣耀",
  "乐诸葛果、兰舟谒荷",
  "势桓阶、定计谋国",
  "张宁、烽火连天",
  "周夷、金甲破阵",
  "神华佗、长夜启明",
  "马伶俐、星语灵犀",
  "张昌蒲、山河万朵",
  "荀彧、松韵龙翔",
  "晋张春华、蓦首千度",
  "李婉、绘毫靛蓝",
  "魏张辽、阵斩蹋顿",
  "荀彧、夺帅",
  "王朗、处尊居显",
  "孙尚香、夺帅",
  "孙坚、武烈开疆",
  "郭淮、紫电霆击",
  "曹植、龙生九子",
  "孙鸢、御海扬鹰",
  "诸葛果、蛇年限定",
  "大乔、花倚轻涟",
  "武皇甫嵩、灼焰靖世",
  "张昌蒲、夜阑涴墨",
  "阎柔、枕戈忾敌",
  "小乔、采莲江南",
  "莫琼树、红梅绛唇",
  "郝昭、守土卫疆",
  "蔡文姬、岁终年庆",
  "桓范、墨染山河",
  "祝融、盛夏繁茂",
  "辛宪英、挥彩辨心",
  "姜维、星河麒麟",
  "环淑君、昨霄良梦",
  "何太后、夺帅",
  "关羽、圣仁武义",
  "曹丕、威御九霄",
  "乐曹植、鹊渡仙缘",
  "乐诸葛果、锦色芳华",
  "神钟会、冥狱弑魂",
  "黄月英、明良千古",
  "骥张辽、点墨惊龙",
  "郭汜、夺帅",
  "小乔、夺帅",
  "张宝、夺帅",
  "张梁、夺帅",

}


return extension
