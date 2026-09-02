local mouKanpo = fk.CreateSkill({
  name = "mou__kanpo",
})

Fk:loadTranslationTable{
  ["mou__kanpo"] = "看破",
  [":mou__kanpo"] = "每轮开始时，你清除〖看破〗记录的牌名，然后你可以选择并记录任意个与你上次以此法记录过的牌名均不相同的"..
  "非装备牌的牌名（每局游戏至多记录四个牌名，若为斗地主或2V2模式则改为两个牌名）。"..
  "当其他角色使用与你记录牌名相同的牌时，你可以移除一个对应牌名的记录，然后令此牌无效并摸一张牌。",
  ["#mou__kanpo-choice"] = "看破：你可选择%arg次牌名，其他角色使用同名牌时，你可令其无效<br>",
  ["#mou__kanpo-invoke"] = "看破：是否令 %dest 使用的%arg无效？",
  ["@[private]$mou__kanpo"] = "看破",

  ["$mou__kanpo1"] = "知汝欲行此计，故已待之久矣。",
  ["$mou__kanpo2"] = "静思敌谋，以出应对之策。",
}

local U = require "packages.utility.utility"

mouKanpo:addEffect(fk.RoundStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouKanpo.name) then
      if player:getMark("@[private]$mou__kanpo") ~= 0 then return true end
      local max_limit = player.room:isGameMode("1v2_mode") and player.room:isGameMode("2v2_mode") and 2 or 4
      return player:getMark("mou__kanpo_times") < max_limit
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local all_names = player:getMark("mou__kanpo")
    if all_names == 0 then
      all_names = Fk:getAllCardNames("btd", true)
      room:setPlayerMark(player, "mou__kanpo", all_names)
    end
    local names = table.simpleClone(all_names)

    if player:getMark("@[private]$mou__kanpo") ~= 0 then
      room:setPlayerMark(player, "@[private]$mou__kanpo", 0)
    end

    for _, name in ipairs(player:getTableMark("mou__kanpo_last_chosen")) do
      table.removeOne(names, name)
    end

    local max_limit = (room:isGameMode("1v2_mode") or room:isGameMode("2v2_mode")) and 2 or 4
    max_limit = max_limit - player:getMark("mou__kanpo_times")
    if max_limit > 0 then
      local mark = U.askForChooseCardNames(room, player, names, 1, max_limit, mouKanpo.name, "#mou__kanpo-choice:::"..max_limit,
      all_names, true, true)
      if #mark > 0 then
        room:addPlayerMark(player, "mou__kanpo_times", #mark)
        U.setPrivateMark(player, "$mou__kanpo", mark)
        room:setPlayerMark(player, "mou__kanpo_last_chosen", table.simpleClone(mark))
      else
        room:setPlayerMark(player, "mou__kanpo_last_chosen", 0)
      end
    end
  end,
})

mouKanpo:addEffect(fk.CardUsing, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouKanpo.name) and
      target ~= player and
      table.contains(U.getPrivateMark(player, "$mou__kanpo"), data.card.trueName)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if
      room:askToSkillInvoke(
        player,
        {
          skill_name = mouKanpo.name,
          prompt = "#mou__kanpo-invoke::" .. target.id .. ":" .. data.card:toLogString()
        }
      )
    then
      room:doIndicate(player, { target })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local mark = U.getPrivateMark(player, "$mou__kanpo")
    table.removeOne(mark, data.card.trueName)
    if #mark > 0 then
      U.setPrivateMark(player, "$mou__kanpo", mark)
    else
      room:setPlayerMark(player, "@[private]$mou__kanpo", 0)
    end
    data.toCard = nil
    data:removeAllTargets()
    player:drawCards(1, mouKanpo.name)
  end,
})

mouKanpo:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@[private]$mou__kanpo", 0)
  player.room:setPlayerMark(player, "mou__kanpo_last_chosen", 0)
  player.room:setPlayerMark(player, "mou__kanpo_times", 0)
end)

return mouKanpo
