-- roomcompat.lua -- 手杀包用到、但本仓库这版 freekill-core 还没有的三个 Room 方法，
-- 外加一处「包按新版 API 写、这版核心读不出来」的请求参数转接。
--
-- 补的是 tableRandomPick、shuffleTable、prepareDeriveCards。第四个
-- （getUniversalCards）刻意不补，理由写在 lua/web/roster.lua 里：它决定合法性，
-- 补错了比不补更糟，所以改成把用到它的两名武将移出武将池。
--
-- WHY THIS EXISTS. packages/mobile 与 packages/utility 里有 95 处调用
-- room:tableRandomPick / room:shuffleTable：
--
--   90x  room:tableRandomPick(list[, n])
--    5x  room:shuffleTable(list)
--
-- 这两个方法在 /Users/haoming/FreeKill/lua 下压根不存在（全树 grep 无定义）。
-- 新版 freekill-core 把 table.random / table.shuffle 提升成了 Room 方法，而这份
-- 镜像还停在提升之前；手杀包是照新版写的。结果是任何一个「随机选人/随机选牌」的
-- 技能一发动就抛 attempt to call a nil value，例如：
--
--   packages/mobile/pkg/mobile_lxxh/skills/kuangli.lua:38  （狂戾）
--   packages/utility/aux_events/discussion.lua:95          （议事，整个共享事件）
--
-- 引擎会把技能里的错误吃掉，所以牌局不会崩 —— 技能只是静默地什么都不做，这比崩了
-- 更糟：玩家看不出自己的武将少了一个技能。
--
-- 语义就是引擎自己的 table.random / table.shuffle（lua/core/util.lua:564、411），
-- 一比一转发，不新增任何规则判断。随机源仍然是 math.random，也就是房间那颗被
-- lua/web/determinism.lua 钉死的种子，所以重放依旧逐帧可复现。
--
-- 上游补上这两个方法之后，下面的 if 会自动让路，这个文件就成了空操作。
--
-- packages/ 与 lua/ 是只读镜像，所以补丁只能打在这里。

local RoomBase = Fk.Base and Fk.Base.RoomBase

if RoomBase then
  --- 从 list 里随机取 n 个元素；不传 n 时返回单个元素（不是数组）。
  ---@generic T
  ---@param list T[]
  ---@param n? integer
  ---@return T|T[]
  if not RoomBase.tableRandomPick then
    function RoomBase:tableRandomPick(list, n)
      return table.random(list, n)
    end
  end

  --- 原地洗乱 list。
  ---@param list any[]
  if not RoomBase.shuffleTable then
    function RoomBase:shuffleTable(list)
      return table.shuffle(list)
    end
  end
end

-- ---------------------------------------------------------------- 衍生牌
--
-- room:prepareDeriveCards(cardDic, name) —— 按卡表印一套牌，存进 room.tag[name]，
-- 已经印过就直接读回来。契约抄自 packages/utility/utility.lua:486-494 那个
-- @deprecated 转发壳（它自己就只是 `return room:prepareDeriveCards(...)`）。
--
-- packages/mobile 里七个技能要它 —— miaolue、peidong、polu、quchong、tianshu、
-- tianzuo、xiaxing —— 其中四个（tianshu / tianzuo / xiaxing / polu）在 40 局
-- 全机器人对局里真的跑到了并且当场抛错。
--
-- 只装在服务端 Room 上，不装在 RoomBase 上，这是有意的。印牌会改牌池：
-- Room:printCard 会 doBroadcastNotify("PrintCard")，客户端靠 handlePrintCard
-- 重放，两边的 next_print_card_id 才会同步递减（room.lua:3289、client.lua:920）。
-- 要是客户端自己也印一次，就会凭空多出一张服务端不知道的牌，id 还会错位 ——
-- 那正是这套架构最不能出的错。所以客户端这边保持 nil：真有客户端路径调到它，
-- 会当场抛「attempt to call a nil value」被我们的错误普查抓到，
-- 这比悄悄不同步好得多。
local function installDeriveCards(room_klass)
  if type(room_klass) ~= "table" or room_klass.prepareDeriveCards then return end

  --- @param cardDic table[] @ { 牌名, 花色, 点数 } 的数组
  --- @param name string @ 存进 room.tag 的键
  --- @return integer[] @ 牌 id
  function room_klass:prepareDeriveCards(cardDic, name)
    self.tag = self.tag or {}
    local cached = self.tag[name]
    if type(cached) == "table" and #cached == #cardDic then return cached end

    local ids = {}
    for _, spec in ipairs(cardDic) do
      ids[#ids + 1] = self:printCard(spec[1], spec[2], spec[3]).id
    end
    self.tag[name] = ids
    return ids
  end
end

-- --------------------------------------------------- CustomDialog 的 component
--
-- 这条补的不是缺方法，是缺参数：包和核心对着同一个方法用了两代不同的写法，
-- 结果整个请求的数据在路上被丢干净了。
--
-- Room:askToCustomDialog 读的是 params.qml_path / params.extra_data，
-- 发出去的包就这两个字段（lua/lunarltk/server/room.lua:2832-2840）。而
-- packages/utility 与 packages/mobile 这一版全部改用新版的 params.component：
--
--   component = { url = "<qml>", prop = {...} }                    -- 三处手杀技能
--   component = { url = "<qml>", model = { url, prop = {...} } }   -- 五个 utility 助手
--
-- 两边都没写 qml_path，于是 `{ path = nil, data = nil }` —— 请求照发，载荷是
-- 一张空表。客户端收到的就是字面上的 `[]`：既不知道该画哪个框，也没有任何东西
-- 可画。玩家看到的是「这个请求没有实现」，然后技能静默地什么都没做。
--
-- 这不是假设。四人局里让曹髦坐下（〖潜龙〗开局给 60 点道心值，25 点就送出
-- 〖清正〗），一局之内 CustomDialog 发了 5 次，5 次的 data 都是 `[]`，
-- askToCustomDialog 收到的 component.url 全是
-- packages/utility/qml/ChooseCardListBox.qml。八个技能走这条路：
-- 清正、共损、星启、谋立、党锢、榻谟、五灵、盗书。
--
-- 补法是把 component 摊平回这版核心认识的那两个字段，不动其它任何东西：
-- url 就是要画的那个组件，prop（新版包了一层 model）就是它的属性表。
-- 上游哪天把 askToCustomDialog 改成自己认 component，下面的 if 因为
-- qml_path 已经不是 nil 而原样放行，这个包装就成了空操作。
--
-- 注意〖盗书〗不走这里：它自己 `Request:new(friends, "CustomDialog")`，
-- 载荷就是原封不动的 `{ component = ... }`。所以客户端两种形状都得认，
-- 见 src/room/dialogs/custom.ts。
local function installCustomDialogComponent(room_klass)
  if type(room_klass) ~= "table" or type(room_klass.askToCustomDialog) ~= "function" then return end
  if rawget(room_klass, "__web_custom_dialog_component") then return end
  rawset(room_klass, "__web_custom_dialog_component", true)

  local askToCustomDialog = room_klass.askToCustomDialog
  function room_klass:askToCustomDialog(player, params)
    local component = type(params) == "table" and params.component
    if type(component) == "table" and params.qml_path == nil then
      local model = type(component.model) == "table" and component.model or nil
      local flat = {}
      for k, v in pairs(params) do flat[k] = v end
      flat.qml_path = component.url
      flat.extra_data = params.extra_data
        or (model and model.prop)
        or component.prop
      params = flat
    end
    return askToCustomDialog(self, player, params)
  end
end

for _, game in pairs(Fk.boardgames or {}) do
  installDeriveCards(game.room_klass)
  installCustomDialogComponent(game.room_klass)
end

return RoomBase
