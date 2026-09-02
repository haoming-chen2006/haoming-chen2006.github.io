local zunwei = fk.CreateSkill {
  name = "js__zunwei",
  dynamic_desc = function (self, player)
    if #player:getTableMark(self.name) == 3 then
      return "dummyskill"
    else
      local choices = {}
      for i = 1, 3, 1 do
        if not table.contains(player:getTableMark(self.name), "js__zunwei"..i) then
          table.insert(choices, Fk:translate("js__zunwei"..i))
        else
          table.insert(choices, "<font color=\'gray\'>"..Fk:translate("js__zunwei"..i).."</font>")
        end
      end
      return "js__zunwei_inner:"..table.concat(choices, "；")
    end
  end,
}

Fk:loadTranslationTable{
  ["js__zunwei"] = "尊位",
  [":js__zunwei"] = "出牌阶段限一次，你可以选择一名其他角色，选择执行以下一项，然后移除该选项：1.将手牌数摸至与该角色相同（最多摸五张）；"..
  "2.将其装备区里的牌移至你的装备区，直到你装备区牌数不少于其；3.将体力回复至与该角色相同。",

  [":js__zunwei_inner"] = "出牌阶段限一次，你可以选择一名其他角色，选择执行以下一项，然后移除该选项：{1}。",

  ["#js__zunwei"] = "尊位：选择一名其他角色并执行一项效果",
  ["js__zunwei1"] = "将手牌摸至与其相同（最多摸五张）",
  ["js__zunwei2"] = "将其装备移动给你直到不少于其",
  ["js__zunwei3"] = "回复体力至与其相同",

  ["$js__zunwei1"] = "妾蒲柳之姿，幸蒙君恩方化从龙之凤。",
  ["$js__zunwei2"] = "尊位椒房、垂立九五，君之恩也、妾之幸也。",
}

zunwei:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, zunwei.name, 0)
end)

zunwei:addEffect("active", {
  anim_type = "control",
  prompt = "#js__zunwei",
  card_num = 0,
  target_num = 1,
  interaction = function(self, player)
    local choices, all_choices = {}, {}
    for i = 1, 3 do
      local choice = "js__zunwei"..i
      table.insert(all_choices, choice)
      if not table.contains(player:getTableMark(zunwei.name), choice) then
        table.insert(choices, choice)
      end
    end
    return UI.ComboBox {choices = choices, all_choices = all_choices}
  end,
  can_use = function(self, player)
    return player:usedSkillTimes(zunwei.name, Player.HistoryPhase) == 0 and
      table.find({1, 2, 3}, function (i)
        return not table.contains(player:getTableMark(zunwei.name), "js__zunwei"..i)
      end)
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return self.interaction.data and #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local choice = self.interaction.data
    room:addTableMark(player, zunwei.name, choice)
    if choice == "js__zunwei1" then
      local x = math.min(target:getHandcardNum() - player:getHandcardNum(), 5)
      if x > 0 then
        player:drawCards(x, zunwei.name)
      end
    elseif choice == "js__zunwei2" then
      while not (player.dead or target.dead) and
        #player:getCardIds("e") < #target:getCardIds("e") and
        target:canMoveCardsInBoardTo(player, "e") do
        room:askToMoveCardInBoard(player, {
          target_one = target,
          target_two = player,
          skill_name = zunwei.name,
          flag = "e",
          move_from = target,
        })
      end
    elseif choice == "js__zunwei3" and player:isWounded() then
      local x = target.hp - player.hp
      if x > 0 then
        room:recover{
          who = player,
          num = math.min(player.maxHp - player.hp, x),
          recoverBy = player,
          skillName = zunwei.name,
        }
      end
    end
  end,
})

return zunwei
