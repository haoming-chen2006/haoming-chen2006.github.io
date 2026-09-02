local zhuni = fk.CreateSkill {
  name = "zhuni",
}

Fk:loadTranslationTable{
  ["zhuni"] = "诛逆",
  [":zhuni"] = "出牌阶段限一次，你可以令所有角色同时选择一名除你外的角色，你本回合对此次被指定次数唯一最多的角色使用牌无距离次数限制。",

  ["#zhuni"] = "诛逆：所有角色同时选择一名角色，你对唯一指定次数最多的角色使用牌无距离次数限制",
  ["#zhuni-choose"] = "诛逆：选择一名角色，若被选择次数唯一最多，%src 对其使用牌无距离次数限制",
  ["#ZhuniChoice"] = "%from 选择了 %to",
  ["#ChangeZhuniChoice"] = "%from 选择的角色被改为了 %to",
  ["@@zhuni-turn"] = "被诛逆",
}

zhuni:addEffect("active", {
  anim_type = "offensive",
  prompt = "#zhuni",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(zhuni.name, Player.HistoryPhase) == 0 and #Fk:currentRoom().alive_players > 1
  end,
  card_filter = Util.FalseFunc,
  target_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    room:doIndicate(player, room.alive_players)

    local req = Request:new(room.alive_players, "AskForUseActiveSkill")
    req.focus_text = zhuni.name
    local extraData = {
      targets = table.map(room:getOtherPlayers(player, false), Util.IdMapper),
      num = 1,
      min_num = 1,
      pattern = "",
      skillName = zhuni.name,
    }
    local data = { "choose_players_skill", "#zhuni-choose:"..player.id, false, extraData, false }
    for _, p in ipairs(room.alive_players) do
      req:setData(p, data)
      req:setDefaultReply(p, player:getNextAlive().id)
    end
    req:ask()

    local yourTarget
    if player:hasSkill("hezhi") then
      if type(req:getResult(player)) == "table" then
        yourTarget = req:getResult(player).targets[1]
      else
        yourTarget = player:getNextAlive().id
      end
    end

    local targetsMap = {}
    for _, p in ipairs(room:getAlivePlayers()) do
      local to
      if type(req:getResult(p)) == "table" then
        to = req:getResult(p).targets[1]
      else
        to = player:getNextAlive().id
      end
      room:sendLog{
        type = "#ZhuniChoice",
        from = p.id,
        to = { to },
        toast = true,
      }
      room:doIndicate(p, { to })
      room:delay(500)

      if yourTarget and p.kingdom == "qun" and p ~= player and yourTarget ~= to then
        to = yourTarget
        player:broadcastSkillInvoke("hezhi")
        room:notifySkillInvoked(player, "hezhi", "control")
        room:sendLog{
          type = "#ChangeZhuniChoice",
          from = p.id,
          to = { to },
          toast = true,
        }
      end
      targetsMap[to] = (targetsMap[to] or 0) + 1
    end

    local target
    local maxNum = 0
    for id, num in pairs(targetsMap) do
      if num > maxNum then
        maxNum = num
        target = id
      elseif num == maxNum and target then
        target = nil
      end
    end

    if target then
      target = room:getPlayerById(target)
      room:addTableMark(target, "@@zhuni-turn", player.id)
    end
  end,
})

zhuni:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return card and to and table.contains(to:getTableMark("@@zhuni-turn"), player.id)
  end,
  bypass_distances = function(self, player, skill, card, to)
    return card and to and table.contains(to:getTableMark("@@zhuni-turn"), player.id)
  end,
})

return zhuni
