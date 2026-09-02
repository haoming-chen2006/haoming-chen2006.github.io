local mouXieji = fk.CreateSkill({
  name = "mou__xieji",
})

Fk:loadTranslationTable{
  ["mou__xieji"] = "协击",
  [":mou__xieji"] = "准备阶段，你可以选择一名其他角色，与其进行一次“协力”。<br>该角色的回合结束时，若你与其“协力”成功，你可以视为对至多三名角色使用一张【杀】，此【杀】造成伤害后，你摸等同于此【杀】造成伤害数的牌。",
  ["#mou__xieji-choose"] = "协击：选择一名其他角色，与其进行“协力”",
  ["#mou__xieji-choice"] = "协击：选择“协力”的任务",
  ["#mou__xieji_delay"] = "协击",
  ["#mou__xieji-slash"] = "协击：你可以视为对至多三名角色使用一张【杀】",

  ["$mou__xieji1"] = "兄弟三人协力，破敌只在须臾！",
  ["$mou__xieji2"] = "吴贼害我手足，此仇今日当报！",
  ["$mou__xieji3"] = "二哥，俺来助你！",
}

local U = require "packages.utility.utility"

mouXieji:addEffect(fk.EventPhaseStart, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouXieji.name) and
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
        prompt = "#mou__xieji-choose",
        skill_name = mouXieji.name,
        cancelable = true
      }
    )
    if #tos > 0 then
      event:setCostData(self, tos[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouXieji.name
    local room = player.room
    player:broadcastSkillInvoke(skillName, math.random(2))
    room:notifySkillInvoked(player, skillName, "support")
    local to = event:getCostData(self)
    local choices = { "xieli_tongchou", "xieli_bingjin", "xieli_shucai", "xieli_luli" }
    local choice = room:askToChoice(player, { choices = choices, skill_name = skillName, prompt = "#mou__xieji-choice", detailed = true })
    room:setPlayerMark(player, "@[mou__xieli]", { to.id, choice, room.logic:getCurrentEvent().id })
  end,
})

local removeXieLiCanRefresh = function (self, event, target, player, data)
  local mark = player:getTableMark("@[mou__xieli]")
  return #mark > 0 and mark[1] == target.id
end

local removeXieLiOnRefresh = function (self, event, target, player, data)
  player.room:setPlayerMark(player, "@[mou__xieli]", 0)
end

mouXieji:addEffect(fk.Death, {
  can_refresh = removeXieLiCanRefresh,
  on_refresh = removeXieLiOnRefresh,
})

mouXieji:addEffect(fk.TurnEnd, {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player:isAlive() and target ~= player and not player:prohibitUse(Fk:cloneCard("slash")) and U.checkXieli(player, target)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouXieji.name
    local room = player.room
    player:broadcastSkillInvoke(skillName, 3)
    room:notifySkillInvoked(player, skillName, "offensive")
    local slash = Fk:cloneCard("slash")
    slash.skillName = skillName
    local targets = table.filter(room:getOtherPlayers(player, false), function (p) return player:canUseTo(slash, p, { bypass_times = true }) end)
    if #targets == 0 then return false end
    local tos = player.room:askToChoosePlayers(
      player,
      {
        targets = targets,
        min_num = 1,
        max_num = 3,
        prompt = "#mou__xieji-slash",
        skill_name = skillName,
        cancelable = true
      }
    )
    if #tos > 0 then
      room:useVirtualCard("slash", nil, player, tos, "mou__xieji", true)
    end
  end,

  late_refresh = true,
  can_refresh = removeXieLiCanRefresh,
  on_refresh = removeXieLiOnRefresh,
})

mouXieji:addEffect(fk.Damage, {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:isAlive() and data.card and table.contains(data.card.skillNames, mouXieji.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player:drawCards(data.damage, mouXieji.name)
  end,
})

return mouXieji
