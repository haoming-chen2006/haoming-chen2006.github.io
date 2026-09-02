local jizhu = fk.CreateSkill({
  name = "mou__jizhu",
})

Fk:loadTranslationTable{
  ["mou__jizhu"] = "积著",
  [":mou__jizhu"] = "准备阶段，你可以选择一名其他角色，与其进行一次“协力”。<br>"..
  "其回合结束时，若你与其“协力”成功，则直到你的下个回合结束后，你修改〖龙胆〗：将“【杀】当【闪】、【闪】当【杀】”改为“基本牌当任意基本牌”。",

  ["#mou__jizhu-choose"] = "积著：选择一名其他角色，与其进行“协力”",
  ["#mou__jizhu-choice"] = "积著：选择“协力”的任务",
  ["@@mou__jizhu"] = "积著成功",

  ["$mou__jizhu1"] = "义贯金石，忠以卫上！",
  ["$mou__jizhu2"] = "兴汉伟功，从今始成！",
  ["$mou__jizhu3"] = "遵奉法度，功效可书！",
}

local U = require "packages.utility.utility"

jizhu:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(jizhu.name) and
      target == player and
      player.phase == Player.Start and
      player:getMark("@[mou__xieli]") == 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(
      player,
      {
        targets = room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__jizhu-choose", 
        skill_name = jizhu.name,
        cancelable = true
      }
    )
    if #tos > 0 then
      event:setCostData(self, tos[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self)
    local choices = { "xieli_tongchou", "xieli_bingjin", "xieli_shucai", "xieli_luli" }
    local choice = room:askToChoice(player, { choices = choices, skill_name = jizhu.name, prompt = "#mou__jizhu-choice", detailed = true })
    room:setPlayerMark(player, "@[mou__xieli]", { to.id, choice, room.logic:getCurrentEvent().id })
  end,
})

local spec = {
  can_refresh = function (self, event, target, player, data)
    local mark = player:getTableMark("@[mou__xieli]")
    return #mark > 0 and mark[1] == target.id
  end,
  on_refresh = function (self, event, target, player, data)
    player.room:setPlayerMark(player, "@[mou__xieli]", 0)
  end,
}

jizhu:addEffect(fk.TurnEnd, {
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return player:isAlive() and target ~= player and U.checkXieli(player, target)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@mou__jizhu", 1)
  end,

  late_refresh = true,
  can_refresh = spec.can_refresh,
  on_refresh = spec.on_refresh,
})

jizhu:addEffect(fk.Death, {
  can_refresh = spec.can_refresh,
  on_refresh = spec.on_refresh,
})

jizhu:addEffect(fk.TurnEnd, {
  can_refresh = function (self, event, target, player, data)
    return target == player and player:getMark("@@mou__jizhu") > 0
  end,
  on_refresh = function (self, event, target, player, data)
    player.room:setPlayerMark(player, "@@mou__jizhu", 0)
  end,
})

return jizhu
