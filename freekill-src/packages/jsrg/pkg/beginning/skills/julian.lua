local julian = fk.CreateSkill {
  name = "julian",
  tags = { Skill.Lord },
}

Fk:loadTranslationTable{
  ["julian"] = "聚敛",
  [":julian"] = "主公技，其他群势力角色每回合限两次，当其于其摸牌阶段外不因此技能而摸牌后，其可以摸一张牌；<br>"..
  "结束阶段，你可以获得所有其他群势力角色各一张手牌。",

  ["#julian-draw"] = "聚敛：你可以摸一张牌",
  ["#julian-invoke"] = "聚敛：你可以获得所有其他群势力角色各一张手牌",

  ["$julian1"] = "天下既无贤才，不知民有闲财否？哈哈哈哈！",
  ["$julian2"] = "府仓国库，皆归朕有！",
  ["$julian3"] = "朕聚天下之财，岂不为天下之事乎？",
  ["$julian4"] = "若为汉家中兴，朕又何惜此金银之物？",
}

julian:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  audio_index = { 3, 4 },
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(julian.name) then
      for _, move in ipairs(data) do
        if move.to and move.to ~= player and move.to.kingdom == "qun" and move.moveReason == fk.ReasonDraw and
          move.skillName ~= julian.name and move.to.phase ~= Player.Draw and
          move.to:getMark("julian-turn") < 2 and not move.to.dead then
          return true
        end
      end
    end
  end,
  on_trigger = function(self, event, target, player, data)
    local targets = {}
    for _, move in ipairs(data) do
      if move.to and move.to ~= player and move.to.kingdom == "qun" and move.moveReason == fk.ReasonDraw and
        move.skillName ~= julian.name and move.to.phase ~= Player.Draw and
        move.to:getMark("julian-turn") < 2 and not move.to.dead then
        table.insertIfNeed(targets, move.to)
      end
    end
    player.room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if not player:hasSkill(julian.name) then return end
      if p:getMark("julian-turn") < 2 and not p.dead then
        event:setCostData(self, {tos = {p}})
        self:doCost(event, target, player, data)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    if room:askToSkillInvoke(to, {
      skill_name = julian.name,
      prompt = "#julian-draw",
    }) then
      room:doIndicate(to, {player})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    room:addPlayerMark(to, "julian-turn", 1)
    to:drawCards(1, julian.name)
  end,
})

julian:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  audio_index = { 1, 2 },
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(julian.name) and player.phase == Player.Finish and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p.kingdom == "qun" and not p:isKongcheng()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = julian.name,
      prompt = "#julian-invoke",
    }) then
      local tos = table.filter(room:getOtherPlayers(player, false), function(p)
        return p.kingdom == "qun" and not p:isKongcheng()
      end)
      room:sortByAction(tos)
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos or {}
    for _, p in ipairs(tos) do
      if player.dead then return end
      if not p:isKongcheng() and not p.dead then
        local id = room:askToChooseCard(player, {
          target = p,
          flag = "h",
          skill_name = julian.name,
        })
        room:obtainCard(player, id, false, fk.ReasonPrey, player, julian.name)
      end
    end
  end,
})

return julian
