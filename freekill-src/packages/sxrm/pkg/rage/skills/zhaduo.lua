
local zhaduo = fk.CreateSkill {
  name = "zhaduo",
}

Fk:loadTranslationTable{
  ["zhaduo"] = "诈夺",
  [":zhaduo"] = "结束阶段，你可以获得两名其他角色各一张牌，视为对其中一名角色使用一张【杀】，然后另一名角色视为对你使用一张【决斗】；"..
  "在和其中一名角色的结算过程中，你视为拥有另一名角色的所有技能。",

  ["#zhaduo-choose"] = "诈夺：获得两名其他角色各一张牌，视为对其中之一使用【杀】、另一视为对你使用【决斗】！",
  ["#zhaduo-slash"] = "诈夺：请视为对其中之一使用【杀】，另一角色视为对你使用【决斗】！",
}

zhaduo:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhaduo.name) and player.phase == Player.Finish and
      #table.filter(player.room:getOtherPlayers(player, false), function(p)
        return not p:isNude()
      end) > 1
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return not p:isNude()
    end)
    local tos = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 2,
      max_num = 2,
      prompt = "#zhaduo-choose",
      skill_name = zhaduo.name,
    })
    if #tos > 0 then
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
      if not p.dead and not p:isNude() then
        local id = room:askToChooseCard(player, {
          target = p,
          flag = "he",
          skill_name = zhaduo.name,
        })
        room:moveCardTo(id, Card.PlayerHand, player, fk.ReasonPrey, zhaduo.name, nil, false, player)
      end
    end
    local targets = table.filter(tos, function (p)
      return not p.dead and not player:isProhibited(p, Fk:cloneCard("slash"))
    end)
    if #targets == 0 then return end
    local to1 = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#zhaduo-slash",
      skill_name = zhaduo.name,
      cancelable = false,
    })[1]
    table.removeOne(tos, to1)
    local to2 = tos[1]
    local skills1, skills2 = to1:getSkillNameList(), to2:getSkillNameList()
    room:handleAddLoseSkills(player, table.concat(skills2, "|"))
    room:useVirtualCard("slash", nil, player, to1, zhaduo.name, true)
    room:handleAddLoseSkills(player, "-"..table.concat(skills2, "|-"))
    if player.dead or to2.dead or to2:isProhibited(player, Fk:cloneCard("duel")) then return end
    room:handleAddLoseSkills(player, table.concat(skills1, "|"))
    room:useVirtualCard("duel", nil, to2, player, zhaduo.name, true)
    room:handleAddLoseSkills(player, "-"..table.concat(skills1, "|-"))
  end,
})

zhaduo:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 0,
      max_num = 2,
      skill_name = zhaduo.name,
      benefit_func = function (logic, p)
        local ret, _ = ai:askToChooseCards({
          cards = p:getCardIds("he"),
          skill_name = zhaduo.name,
          data = {
            to_place = Card.PlayerHand,
            target = ai.player,
            reason = fk.ReasonPrey,
            proposer = ai.player,
          }
        })
        logic:obtainCard(ai.player, ret, false, fk.ReasonPrey, ai.player, zhaduo.name)
      end,
    })
  end,
})

return zhaduo
