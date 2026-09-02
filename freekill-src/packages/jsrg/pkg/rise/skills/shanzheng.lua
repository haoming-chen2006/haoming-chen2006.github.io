local shanzheng = fk.CreateSkill {
  name = "shanzheng",
}

Fk:loadTranslationTable{
  ["shanzheng"] = "擅政",
  [":shanzheng"] = "出牌阶段限一次，你可以与任意名角色议事，若结果为：红色，你可以对一名未参与议事的角色造成1点伤害；黑色，你获得所有意见牌。",

  ["#shanzheng"] = "擅政：与任意名角色议事，红色：你可以对一名未参与议事的角色造成1点伤害；黑色：你获得所有意见牌",
  ["#shanzheng-damage"] = "擅政：你可以对一名未参与议事的角色造成1点伤害",

  ["$shanzheng1"] = "陛下于此道不明，本后且代为理政。",
  ["$shanzheng2"] = "诏命皆从我出，诸君当知谁为这一国之主。",
  ["$shanzheng3"] = "哼！再有犯者，皆有如此人。",
  ["$shanzheng4"] = "尔等罪证，可俱在本宫手中。",
}

local U = require "packages.utility.utility"

shanzheng:addEffect("active", {
  anim_type = "offensive",
  audio_index = { 1, 2 },
  prompt = "#shanzheng",
  card_num = 0,
  min_target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(shanzheng.name, Player.HistoryPhase) == 0 and not player:isKongcheng()
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local targets = table.simpleClone(effect.tos)
    table.insert(targets, player)
    room:sortByAction(targets)
    local discussion = U.Discussion(player, targets, shanzheng.name)
    if player.dead then return end
    if discussion.color == "red" then
      player:broadcastSkillInvoke(shanzheng.name, 3)
      targets = table.filter(room.alive_players, function (p)
        return not table.contains(targets, p)
      end)
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#shanzheng-damage",
        skill_name = shanzheng.name,
        cancelable = true,
      })
      if #to > 0 then
        room:damage{
          from = player,
          to = to[1],
          damage = 1,
          skillName = shanzheng.name,
        }
      end
    elseif discussion.color == "black" then
      player:broadcastSkillInvoke(shanzheng.name, 4)
      local cards = {}
      for _, p in ipairs(targets) do
        if not p.dead and p ~= player then
          local ids = table.filter(discussion.results[p].toCards, function (id)
            return table.contains(p:getCardIds("h"), id)
          end)
          if #ids > 0 then
            table.insertTableIfNeed(cards, ids)
          end
        end
      end
      if #cards > 0 then
        room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonPrey, shanzheng.name, nil, true, player)
      end
    end
  end,
})

return shanzheng
