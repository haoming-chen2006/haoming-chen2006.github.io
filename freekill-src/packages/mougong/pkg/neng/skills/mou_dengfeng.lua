local mouDengfeng = fk.CreateSkill({
  name = "mou__dengfeng",
})

Fk:loadTranslationTable{
  ["mou__dengfeng"] = "登锋",
  [":mou__dengfeng"] = "准备阶段，你可以选择一名其他角色并选择一项：1.选择其装备区里至多两张牌，令其获得之；2.你从牌堆中获得一张【杀】。背水：失去1点体力。",
  ["#mou__dengfeng-choose"] = "登锋：选择一名其他角色，令其收回装备牌，或你摸一张【杀】",
  ["mou__dengfeng_equip"] = "选择其装备区里至多两张牌令其收回",
  ["mou__dengfeng_slash"] = "你从牌堆中获得一张【杀】",
  ["mou__dengfeng_beishui"] = "背水：失去1点体力。",

  ["$mou__dengfeng1"] = "擒权覆吴，今便得成所愿，众将且奋力一战！",
  ["$mou__dengfeng2"] = "甘、凌之流，何可阻我之攻势！",
}

mouDengfeng:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouDengfeng.name) and target == player and player.phase == Player.Start
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(
      player,
      {
        targets = room:getOtherPlayers(player, false),
        min_num = 1,
        max_num = 1,
        prompt = "#mou__dengfeng-choose",
        skill_name = mouDengfeng.name
      }
    )
    if #tos > 0 then
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouDengfeng.name
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local choices = { "mou__dengfeng_equip", "mou__dengfeng_slash", "mou__dengfeng_beishui" }
    local choice = choices[2]
    if #to:getCardIds("e") > 0 then
      choice = room:askToChoice(player, { choices = choices, skill_name = skillName })
    end
    if choice == "mou__dengfeng_beishui" then
      room:loseHp(player, 1, skillName)
    end
    if choice ~= "mou__dengfeng_slash" and #to:getCardIds("e") > 0 then
      local cards = room:askToChooseCards(player, { target = to, min = 1, max = 2, flag = "e", skill_name = skillName })
      room:obtainCard(to, cards, true, fk.ReasonPrey, to, skillName)
    end
    if choice ~= "mou__dengfeng_equip" and player:isAlive() then
      local ids = room:getCardsFromPileByRule("slash")
      if #ids > 0 then
        room:obtainCard(player, ids, true, fk.ReasonJustMove, player, skillName)
      end
    end
  end,
})

return mouDengfeng
