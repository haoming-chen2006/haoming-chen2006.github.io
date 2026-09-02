local huangtian_active = fk.CreateSkill({
  name = "huangtian_active&",
})

Fk:loadTranslationTable{
  ["huangtian_active&"] = "黄天",
  [":huangtian_active&"] = "出牌阶段限一次，你可将一张【闪】或【闪电】（正面朝上移动）交给张角。",

  ["#huangtian"] = "黄天：将一张【闪】或【闪电】交给张角",
}

huangtian_active:addEffect("active", {
  anim_type = "support",
  prompt = "#huangtian",
  mute = true,
  card_num = 1,
  target_num = 0,
  can_use = function(self, player)
    if player:usedSkillTimes(huangtian_active.name, Player.HistoryPhase) < 1 and player.kingdom == "qun" then
      return table.find(Fk:currentRoom().alive_players, function(p) return p:hasSkill("huangtian") and p ~= player end)
    end
    return false
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected < 1 and (Fk:getCardById(to_select).name == "jink" or Fk:getCardById(to_select).name == "lightning")
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local targets = table.filter(room.alive_players, function(p)
      return p:hasSkill("huangtian") and p ~= player
    end)
    local target
    if #targets == 1 then
      target = targets[1]
    else
      target = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = "huangtian",
        prompt = "#huangtian",
        cancelable = false,
      })[1]
    end
    if not target then return end
    room:notifySkillInvoked(target, "huangtian")
    target:broadcastSkillInvoke("huangtian")
    room:doIndicate(player.id, { target.id })
    room:moveCardTo(effect.cards, Player.Hand, target, fk.ReasonGive, "huangtian", nil, true, player)
  end,
})

return huangtian_active
