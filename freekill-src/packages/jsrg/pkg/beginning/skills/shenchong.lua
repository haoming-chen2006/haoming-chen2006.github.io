local shenchong = fk.CreateSkill {
  name = "shenchong",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["shenchong"] = "甚宠",
  [":shenchong"] = "限定技，出牌阶段，你可以令一名其他角色获得〖飞扬〗和〖跋扈〗，若如此做，当你死亡时，其失去所有技能，然后其弃置全部手牌。",

  ["#shenchong"] = "甚宠：令一名其他角色获得〖飞扬〗和〖跋扈〗！",

  ["$shenchong1"] = "天子近前，岂曰无人？赏！",
  ["$shenchong2"] = "诸臣皆为己利，唯汝独讨朕心！",
}

shenchong:addEffect("active", {
  anim_type = "support",
  prompt = "#shenchong",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(shenchong.name, Player.HistoryGame) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMarkIfNeed(player, shenchong.name, target.id)
    room:handleAddLoseSkills(target, "m_feiyang|m_bahu")
  end,
})

shenchong:addEffect(fk.Death, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark(shenchong.name) ~= 0 and
      table.find(player:getTableMark(shenchong.name), function (id)
        return not player.room:getPlayerById(id).dead
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local tos = table.map(player:getTableMark(shenchong.name), Util.Id2PlayerMapper)
    tos = table.filter(tos, function(p)
      return not p.dead
    end)
    room:sortByAction(tos)
    event:setCostData(self, {tos = tos})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos
    for _, p in ipairs(tos) do
      if not p.dead then
        local skills = p:getSkillNameList()
        table.insert(skills, "m_feiyang")
        table.insert(skills, "m_bahu")
        room:handleAddLoseSkills(p, "-"..table.concat(skills, "|-"))
        p:throwAllCards("h", shenchong.name)
      end
    end
  end,
})

return shenchong
