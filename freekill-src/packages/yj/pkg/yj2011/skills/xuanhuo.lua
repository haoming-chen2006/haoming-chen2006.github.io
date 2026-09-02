local xuanhuo = fk.CreateSkill {
  name = "xuanhuo"
}

Fk:loadTranslationTable{
  ["xuanhuo"] = "眩惑",
  [":xuanhuo"] = "摸牌阶段，你可以放弃摸牌，改为令另一名角色摸两张牌，然后令其对其攻击范围内你指定的一名角色使用一张【杀】，若该角色未如此做，"..
  "你获得其两张牌。",

  ["#xuanhuo-target"] = "眩惑：你可以放弃摸牌，令另一名角色摸两张牌并使用【杀】",
  ["#xuanhuo-choose"] = "眩惑：选择令 %dest 使用【杀】的目标",
  ["#xuanhuo-slash"] = "眩惑：你需对 %dest 使用【杀】，否则 %src 获得你两张牌",

  ["$xuanhuo1"] = "收人钱财，替人消灾。",
  ["$xuanhuo2"] = "哼，叫你十倍奉还！",
}

xuanhuo:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xuanhuo.name) and player.phase == Player.Draw and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#xuanhuo-target",
      skill_name = xuanhuo.name,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data.phase_end = true
    local to = event:getCostData(self).tos[1]
    to:drawCards(2, xuanhuo.name)
    if player.dead or to.dead then return end
    local targets = table.filter(room.alive_players, function(p)
      return to:inMyAttackRange(p)
    end)
    if #targets == 0 then
      if to:isNude() then return end
      local cards = room:askToChooseCards(player, {
        min = 2,
        max = 2,
        target = to,
        flag = "he",
        skill_name = xuanhuo.name,
      })
      room:obtainCard(player, cards, false, fk.ReasonPrey, player, xuanhuo.name)
    else
      local victim = room:askToChoosePlayers(player, {
        skill_name = xuanhuo.name,
        min_num = 1,
        max_num = 1,
        targets = targets,
        prompt = "#xuanhuo-choose::"..to.id,
        cancelable = false,
        no_indicate = true,
      })[1]
      room:doIndicate(to, {victim})
      local use = room:askToUseCard(to, {
        skill_name = xuanhuo.name,
        pattern = "slash",
        prompt = "#xuanhuo-slash:"..player.id..":"..victim.id,
        cancelable = true,
        extra_data = {
          bypass_times = true,
          must_targets = {victim.id},
        }
      })
      if use then
        use.extraUse = true
        room:useCard(use)
      else
        if to:isNude() then return end
        local cards = room:askToChooseCards(player, {
          min = 2,
          max = 2,
          target = to,
          flag = "he",
          skill_name = xuanhuo.name,
        })
        room:obtainCard(player, cards, false, fk.ReasonPrey, player, xuanhuo.name)
      end
    end
  end,
})

return xuanhuo