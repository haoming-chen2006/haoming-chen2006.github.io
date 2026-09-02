local mouWansha = fk.CreateSkill({
  name = "mou__wansha",
})

Fk:loadTranslationTable{
  ["mou__wansha"] = "完杀",
  [":mou__wansha"] = "①你的回合内，若有角色处于濒死状态，则不处于濒死状态的其他角色不能使用【桃】。"..
  "<br>②每轮限一次，一名角色进入濒死状态时，你可以观看其手牌并秘密选择其中的0~2张牌，然后令其选择一项：1.由你将被选择的牌分配给除其以外的角色；2.弃置所有未被选择的牌。"..
  "<br><b>二级</b>：“选择其手牌”修改为“选择其区域内牌”。",
  ["@@mou__wansha_upgrade"] = "完杀二级",
  ["#mou__wansha-invoke"] = "完杀：你可以观看 %src 手牌并选牌，令其选择让你分配之或弃置其余牌",
  ["#mou__wansha_give"] = "令其将选择的牌分配",
  ["#mou__wansha_throw"] = "弃置其未选择的牌",
  ["#mou__wansha-choice"] = "完杀：%src 秘密选择了你的若干张牌，你须选一项",

  ["$mou__wansha1"] = "世人皆行殊途，与死亦有同归！",
  ["$mou__wansha2"] = "九幽泉下，是你最好的归宿。",
}

mouWansha:addEffect(fk.EnterDying, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouWansha.name) and player:usedSkillTimes(mouWansha.name, Player.HistoryRound) == 0 then
      if player:getMark("@@mou__wansha_upgrade") == 0 then
        return not target:isKongcheng()
      else
        return not target:isAllNude()
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(player, { skill_name = mouWansha.name, prompt = "#mou__wansha-invoke:" .. target.id })
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouWansha.name
    local room = player.room
    local card_data = {}
    local upgrade = player:getMark("@@mou__wansha_upgrade") > 0
    if upgrade then
      if #target:getCardIds("j") > 0 then
        table.insert(card_data, { "$Judge", target:getCardIds("j") })
      end
      if #target:getCardIds("e") > 0 then
        table.insert(card_data, { "$Equip", target:getCardIds("e") })
      end
    end
    if not target:isKongcheng() then
      table.insert(card_data, { "$Hand", target:getCardIds("h") })
    end
    if #card_data == 0 then return end
    local countLimit = 2
    local cardsChosen = room:askToChooseCards(
      player,
      {
        target = target,
        min = 0,
        max = countLimit,
        flag = { card_data = card_data },
        skill_name = skillName
      }
    )
    local choice = room:askToChoice(
      target,
      {
        choices = { "#mou__wansha_give", "#mou__wansha_throw" },
        skill_name = skillName,
        prompt = "#mou__wansha-choice:" .. player.id
      }
    )
    if choice == "#mou__wansha_give" then
      local targets = room:getOtherPlayers(target, false)
      if #cardsChosen == 0 or #targets == 0 then return end
      local expandPile = table.filter(cardsChosen, function(id) return not table.contains(player:getCardIds("he"), id) end)
      room:askToYiji(
        player,
        {
          cards = cardsChosen,
          targets = targets,
          skill_name = skillName,
          min_num = #cardsChosen,
          max_num = #cardsChosen,
          expand_pile = expandPile
        }
      )
    else
      local throw = table.filter(target:getCardIds(upgrade and "hej" or "h"), function (id)
        return not table.contains(cardsChosen, id) and not target:prohibitDiscard(id)
      end)
      if #throw > 0 then
        room:throwCard(throw, skillName, target, target)
      end
    end
  end,
})

mouWansha:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if card.name == "peach" then
      local from = table.find(Fk:currentRoom().alive_players, function (p)
        return p:hasSkill(mouWansha.name) and p.phase ~= Player.NotActive
      end)
      if from and from ~= player then
        local victims = table.filter(Fk:currentRoom().alive_players, function (p)
          return p.dying
        end)
        return #victims > 0 and not table.contains(victims, player)
      end
    end
  end,
})

mouWansha:addLoseEffect(function (self, player)
  if player:getMark("@@mou__wansha_upgrade") > 0 then
    player.room:setPlayerMark(player, "@@mou__wansha_upgrade", 0)
  end
end)

return mouWansha
