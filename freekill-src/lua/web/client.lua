-- client.lua -- 客户端 VM 的 Lua 侧入口（跑在浏览器主线程）
--
-- 主线程 VM 之所以不进 Worker：现有 QML 客户端有 ~164 处同步 Lua.call
-- （GetCardData / CardFitPattern / RefreshStatusSkills），全在渲染路径上。
-- 放进 Worker 就全变异步了。这里保持同步，和 QML 今天的行为一致。

FKClient = {}

local canon, b64
-- sink 在下面的第 2 节赋值；这里先声明，好让 boot() 也能往里记错。
local sink
-- 战报双语的补丁，定义在下面第 2 节末尾；boot() 里要用，先声明。
local localizeRenderedText
-- 洗牌播报的补丁，同上。
local announceDrawPile

-- ============================================================ 1. 载入引擎（客户端半边）
function FKClient.boot()
  local vclock_us = 0
  FKClient.advanceUs = function(us) vclock_us = vclock_us + math.floor(us or 0) end
  __fk_now_us = function() return vclock_us end

  os.time = function() return 1700000000 + vclock_us // 1000000 end
  os.clock = function() return vclock_us / 1e6 end
  os.getms = function() return vclock_us end
  os.date = function() return "1970-01-01" end
  os.difftime = function(a, b) return a - b end

  package.path = "./?.lua;./?/init.lua;./lua/lib/?.lua;./lua/?.lua;./lua/?/init.lua"

  fk = dofile("lua/web/fkclient.lua")
  canon = dofile("lua/web/canon.lua")
  b64 = dofile("lua/web/b64.lua")
  FKClient.canon = canon
  FKClient.b64 = b64

  dofile("lua/freekill.lua")
  dofile("lua/client/i18n/init.lua")

  -- 手杀包依赖的两个 Room 方法，本镜像还没有。必须在包加载之后、开局之前。
  dofile("lua/web/roomcompat.lua")

  -- 和 host.lua 同一份代码、同一个位置：两边的武将池必须字节级一致。
  FKClient.hiddenGenerals = dofile("lua/web/roster.lua").hideIncomplete()

  fk.FK_VER = fk.FK_VER or "web"
  dofile("lua/client/client.lua")

  -- 补全 en_US。必须在这儿（包已经加载完）而不是更早：
  -- skill_skeleton.lua 派生的 #<技能>_<n>_<trig|active|…> 角标是按
  -- Config.language 注册的，所以上游 en_US 里根本没有；整张覆盖才补得齐。
  -- 这张表和 JS 侧 src/i18n/engine 是同一份数据，见 scripts/build-i18n-lua.mjs。
  -- 失败不该拖垮整个 VM —— 大不了战报回落成中文。
  local ok, tbl = pcall(dofile, "lua/web/i18n_en_US.lua")
  if ok and type(tbl) == "table" then
    Fk:loadTranslationTable(tbl, "en_US")
  else
    sink.errors[#sink.errors + 1] = "i18n_en_US: " .. tostring(tbl)
  end

  -- 打在类上，而且必须在 CreateLuaClient 之前。
  -- ClientBase:initialize 里是 self:addCallback("GameLog", self.appendLog)，
  -- 也就是在构造的那一刻就把函数值抄进了 self.callbacks；构造完再往实例上挂
  -- appendLog 是改不动那张表的（clientbase.lua:45、54）。
  --
  -- 而且不止一个类要打：全局 Client 是 CreateLuaClient 用的，但进房时
  -- ClientBase:enterRoom 会拿 Fk:getBoardGame(gameMode).client_klass 重建一遍
  -- ClientInstance（clientbase.lua:147）。那个类是 lunarltk/init.lua 里
  -- require 出来的，和 lua/client/client.lua 用 dofile 再求值一次得到的全局
  -- Client 并不是同一张表 —— 只打全局的话，一进房补丁就没了。
  localizeRenderedText(Client)
  announceDrawPile(Client)
  for _, game in pairs(Fk.boardgames or Util.DummyTable) do
    localizeRenderedText(game.client_klass)
    announceDrawPile(game.client_klass)
  end

  ---@diagnostic disable-next-line
  dbg = Util.DummyFunc
  debug.debug = Util.DummyFunc
  return true
end

-- ============================================================ 2. 接线
sink = {
  ui = {}, uiCursor = 0,
  out = {}, outCursor = 0,
  errors = {},
}
FKClient.sink = sink

local ClientMT = {}
ClientMT.__index = {
  sendSetupPacket = function() end,
  setupServerLag = function() end,
  installMyAESKey = function() end,
  saveRecord = function() end,
  saveGameData = function() end,

  notifyServer = function(self, command, data)
    sink.out[#sink.out + 1] = { kind = "notify", command = command, payload = b64.encode(tostring(data)) }
  end,
  replyToServer = function(self, command, data)
    sink.out[#sink.out + 1] = { kind = "reply", command = command, payload = b64.encode(tostring(data)) }
  end,

  addPlayer = function(self, id, name, avatar)
    self.players[id] = fk.newPlayer(id, name, avatar)
    return self.players[id]
  end,
  removePlayer = function(self, id) self.players[id] = nil end,
  getSelf = function(self) return self._self end,
  changeSelf = function(self, id) self._self = self.players[id] or self._self end,

  notifyUI = function(self, command, data)
    sink.ui[#sink.ui + 1] = { command = command, data = data }
    -- 场景式询问（出牌、响应、发动技能）不是自己把回复发出去的：
    -- RequestHandler:doOKButton 只 notifyUI("ReplyToServer", reply)，
    -- 真正回发是 QML 收到这条之后调 ClientInstance.replyToServer("", data)
    -- （Fk/Pages/LunarLTK/RoomLogic.js:141）。
    -- 浏览器里没有那层 QML，所以在这儿把环闭上 —— 否则点了确定也发不出回复，
    -- 而且这件事不该泄漏成每个 UI 实现都要记得做的一步。
    if command == "ReplyToServer" then
      self:replyToServer("", cbor.encode(data))
    end
  end,
}

-- ---------------------------------------------------------------- 战报双语
--
-- 战报、吐司、卡牌脚注这三样不是按 key 发上来的：Client:parseMsg 在 Lua 里就把
-- 整条 LogMessage 渲染成了 HTML —— 牌名带花色点数、角色名带座位号消歧、虚拟牌、
-- 每个 %arg 都在那儿翻好了。等 JS 拿到手，已经没有 key 可查了。
--
-- 与其在 TS 里把 parseMsg 重写一遍（那就是给牌名、花色、消歧规则立第二个真相源，
-- 正是这个代码库一直拒绝的事），不如让引擎自己按两种语言各渲染一遍，两份都发。
-- 房间侧把两份都留着、渲染时再挑，所以切语言连历史战报一起变。
--
-- 代价：每条 log 多一次 parseMsg。它是纯读操作，不动任何游戏状态。
local LANGS = { "zh_CN", "en_US" }

--- 用每种语言各跑一遍 render，返回 { zh_CN = ..., en_US = ... }。
---
--- 中文那一遍不吞异常：渲染不出来就是真的出问题了，照旧往上抛，让
--- FKClient.feed 的 pcall 记进 sink.errors —— 总比悄悄发一条空 log 强。
--- 其它语言炸了只回落到中文，不连累这条战报。
local function eachLanguage(render)
  local prev = Config.language
  Config.language = "zh_CN"
  local ok, zh = pcall(render)
  if not ok then
    Config.language = prev
    error(zh, 0)
  end

  local out = { zh_CN = zh }
  for _, lang in ipairs(LANGS) do
    if lang ~= "zh_CN" then
      Config.language = lang
      local okLang, text = pcall(render)
      out[lang] = okLang and text or zh
    end
  end
  Config.language = prev
  return out
end

--- 把三处「Lua 侧已渲染完」的出口改成发双语。
---
--- 参数是 Client 这个类本身，不是实例：三处出口都是 addCallback 注册的回调，
--- 而 addCallback 在构造时就把函数值抄进了 self.callbacks，所以只有在
--- CreateLuaClient 之前替换类方法才真的生效。
---@param client table @ 全局的 Client 类
localizeRenderedText = function(client)
  if type(client) ~= "table" or type(client.parseMsg) ~= "function" then return end

  client.appendLog = function(self, msg, visible_data)
    local text = eachLanguage(function() return self:parseMsg(msg, nil, visible_data) end)
    self:notifyUI("GameLog", text)
    if msg.toast then self:notifyUI("ShowToast", text) end
  end

  client.setCardNote = function(self, ids, msg, virtual)
    local text = eachLanguage(function() return self:parseMsg(msg, true) end)
    for _, id in ipairs(ids) do
      if id ~= -1 then self:notifyUI("SetCardFootnote", { id, text, virtual }) end
    end
  end

  client.showVirtualCard = function(self, data)
    local card, playerid, msg, event_id = table.unpack(data)
    local text = msg and eachLanguage(function() return self:parseMsg(msg, true) end) or nil
    if type(card) == "table" and card.class and card:isInstanceOf(Card) then
      card = { card }
    end
    self:notifyUI("ShowVirtualCard", { card, playerid, text, event_id })
  end
end

-- ---------------------------------------------------------------- 洗牌播报
--
-- 洗牌和强制同步是仅有的两条「不经 MoveCards 就把牌挪走」的消息。
-- Client:handleShuffleDrawPile 在 VM 里把每张牌重新 setCardArea 成 Card.DrawPile
-- （card_manager.lua:180），然后只 appendLog 一行战报 —— 一条 notifyUI 都不发
-- （lunarltk/client/client.lua:939）。
--
-- QML 客户端不吃亏：它自己不留牌位置的账，photo 和牌堆数都是现问 VM 要的，
-- 牌堆那个数还有 RefreshStatusSkills 每 200ms 一条 UpdateDrawPile 兜着
-- （client_util.lua:1257）。可 RoomStore 在 JS 侧留了一份 cardArea，它只认 notify。
-- 洗完牌不告诉它，那份账就永远停在洗牌前：145 张牌一直挂着 DiscardPile，
-- countDiscarded 再也不会降，而 drawPileCount 又被 UpdateDrawPile 拉回了真值，
-- 于是屏幕上出现「牌堆 137 | 弃牌堆 141」—— 160 张牌的牌堆里数出 278 张。
--
-- 发的是洗完之后 VM 自己的 draw_pile，也就是这条消息在 VM 里造成的全部后果；
-- 房间照着把这些 id 标回抽牌堆就行，不必猜洗牌是怎么组成的。
--
-- 必须拷贝：notifyUI 只是把引用塞进 sink.ui，而同一批里紧跟着的摸牌会原地
-- table.remove 这张表，等 drainUI 时读到的就不是洗牌那一刻的牌堆了。
--
-- 补的是类方法，理由和 localizeRenderedText 一样：addCallback 在构造时就把
-- 函数值抄进了 self.callbacks，构造完再改实例是改不动那张表的。
---@param client table @ 全局的 Client 类
announceDrawPile = function(client)
  if type(client) ~= "table" then return end

  local function announce(self)
    local pile = {}
    for i, id in ipairs(self.draw_pile or Util.DummyTable) do pile[i] = id end
    self:notifyUI("SyncDrawPile", pile)
  end

  local shuffle = client.handleShuffleDrawPile
  if type(shuffle) == "function" then
    client.handleShuffleDrawPile = function(self, data)
      shuffle(self, data)
      announce(self)
    end
  end

  local sync = client.syncDrawPile
  if type(sync) == "function" then
    client.syncDrawPile = function(self, data)
      sync(self, data)
      announce(self)
    end
  end
end

--- 切换这个 VM 的渲染语言。
---
--- 房间里绝大多数文案是按 key 取的，走 JS 侧的覆盖表（withLanguage 拦掉
--- Translate），不经过这儿。但有几处询问的提示语是 Lua 自己拼好再返回的
--- —— 比如选将框的提示，packages/standard/aux_choose_general.lua 的
--- prompt() 直接 Fk:translate 完拼成整句 —— JS 拿到的已经是成品，没有 key
--- 可查。让 VM 跟着切语言，这些地方就自然跟上了。
---
--- 之所以敢切：完整的 en_US 表已经在 boot 里灌进来了（含 skill_skeleton
--- 派生的角标），所以 en_US 不会掉回原文 key。Config.language 只影响翻译，
--- 不参与任何规则判定，权威房间那个 VM 也完全不受影响。
---@param lang string
function FkWebSetLanguage(lang)
  if type(lang) == "string" and lang ~= "" then Config.language = lang end
  return Config.language
end

--- 把这个 VM 绑到某个座位上。
---@param specJson string { id, name, avatar, observing?, replaying? }
function FKClient.attach(specJson)
  local spec = json.decode(specJson)
  local me = fk.newPlayer(spec.id, spec.name, spec.avatar, fk.Player_Online)
  local cClient = setmetatable({ _self = me, players = { [spec.id] = me } }, ClientMT)
  FKClient.cClient = cClient

  CreateLuaClient(cClient)
  Self = ClientPlayer:new(cClient:getSelf())
  ClientSelf = Self

  if spec.observing then SetObserving(true) end
  if spec.replaying then SetReplaying(true) end
  return true
end

-- ============================================================ 3. 入站
--- 喂一条来自权威房间的消息。payload 是 base64 后的原始 CBOR。
---@param command string
---@param payload_b64 string
---@param isRequest boolean?
function FKClient.feed(command, payload_b64, isRequest)
  local ok, err = pcall(ClientCallback, FKClient.cClient, command,
    b64.decode(payload_b64), isRequest and true or false)
  if not ok then
    sink.errors[#sink.errors + 1] = command .. ": " .. tostring(err)
    return false
  end
  return true
end

--- 批量喂：一次过边界喂一整个 flush 批次。
---
--- 优先走 payload（原始 CBOR 的 base64）—— 那就是权威 VM 自己编出来的字节，
--- 一路不重编码，保真度问题根本不存在。
--- value 是给 fixtures 驱动的调试面板兜底的：普通数据要重新 cbor.encode，
--- 而 canon JSON 会把整型浮点压成整数、把非字符串键字符串化，是有损的。
---@param batchJson string [{command, payload?, value?, isRequest}]
function FKClient.feedBatch(batchJson)
  local list = json.decode(batchJson)
  local n = 0
  for _, m in ipairs(list) do
    local encoded
    if m.payload then
      encoded = b64.decode(m.payload)
    else
      encoded = cbor.encode(canon.revive(m.value))
    end
    local ok, err = pcall(ClientCallback, FKClient.cClient, m.command, encoded,
      m.isRequest and true or false)
    if ok then
      n = n + 1
    else
      sink.errors[#sink.errors + 1] = m.command .. ": " .. tostring(err)
    end
  end
  return n
end

-- ============================================================ 4. 出站 / UI
function FKClient.drainUI()
  local from = sink.uiCursor + 1
  local out = {}
  for i = from, #sink.ui do
    local e = sink.ui[i]
    out[#out + 1] = { seq = i, command = e.command, data = e.data }
    sink.ui[i] = { command = e.command } -- 放掉数据，长局不涨堆
  end
  sink.uiCursor = #sink.ui
  return canon.encode(out)
end

function FKClient.drainOutbound()
  local from = sink.outCursor + 1
  local out = {}
  for i = from, #sink.out do
    local e = sink.out[i]
    out[#out + 1] = { seq = i, kind = e.kind, command = e.command, payload = e.payload }
  end
  sink.outCursor = #sink.out
  return canon.encode(out)
end

--- 没人订阅 UI 事件时把它们丢掉，长局才不会一直涨堆。
function FKClient.dropUI()
  for i = sink.uiCursor + 1, #sink.ui do sink.ui[i] = { command = sink.ui[i].command } end
  sink.uiCursor = #sink.ui
  return sink.uiCursor
end

--- 把一条出站回复的原始 CBOR 解回普通数据（给 onReply 用）。
---@param payload_b64 string
function FKClient.decodeReply(payload_b64)
  local ok, v = pcall(cbor.decode, b64.decode(payload_b64))
  if not ok then return "null" end
  return canon.encode(v)
end

function FKClient.errors()
  return canon.encode(sink.errors)
end

function FKClient.counts()
  return json.encode { ui = #sink.ui, out = #sink.out, errors = #sink.errors }
end

--- 回答弹窗式询问（选将、观星、拆牌、破奇、五谷）。
---
--- 这些询问不走 ui_emu 的场景模型：它们各有各的命令和负载，
--- QML 客户端也是直接调 ClientInstance:replyToServer 回的
--- （Fk/Pages/LunarLTK/RoomLogic.js:141）。
--- 回复由这个 VM 自己的 cbor 编码，所以到达权威房间的字节
--- 和 QML 客户端发的完全一致。
---@param command string
---@param valueJson string canon JSON
function FKClient.replyToServer(command, valueJson)
  local v = canon.revive(json.decode(valueJson))
  -- QML 走的是 ClientInstance.replyToServer("", data)，也就是 C++ Client 那一层，
  -- command 一律空串（RoomLogic.js:142），数据从 0.5.12 起直接给值不再 json.encode。
  FKClient.cClient:replyToServer(command or "", cbor.encode(v))
  return true
end

-- ============================================================ 5. Lua.call 面
--- 调用 client_util.lua 里的任意全局函数，这就是 QML 那 164 处 Lua.call 的等价物。
---@param name string
---@param argsJson string { "n": <整数>, "a": [...] }
---@return string canon JSON
function FKClient.call(name, argsJson)
  local fn = _G[name]
  if type(fn) ~= "function" then
    return canon.encode { __error = "no such lua function: " .. tostring(name) }
  end
  local spec = argsJson and argsJson ~= "" and json.decode(argsJson) or { n = 0, a = {} }
  local ok, res = pcall(fn, table.unpack(spec.a or {}, 1, spec.n or 0))
  if not ok then
    return canon.encode { __error = tostring(res) }
  end
  return canon.encode(res)
end

--- 客户端自身的房间快照，供测试断言用（不上线路）。
function FKClient.stateJson()
  if not ClientInstance then return "null" end
  local ok, o = pcall(function() return ClientInstance:serialize() end)
  if not ok then return canon.encode { __error = tostring(o) } end
  local st = dofile("lua/web/state.lua")
  o.banners = st.decodeBlob(o.banners)
  if type(o.card_manager) == "table" then
    o.card_manager.card_marks = st.decodeBlob(o.card_manager.card_marks)
  end
  for _, p in pairs(o.players or {}) do
    if type(p) == "table" then p.mark = st.decodeBlob(p.mark) end
  end
  return canon.encode(o)
end

return FKClient
