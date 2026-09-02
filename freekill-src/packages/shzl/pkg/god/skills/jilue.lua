local jilue = fk.CreateSkill {
  name = "jilue",
  related_skills = { "ex__guicai", "fangzhu", "ex__jizhi", "ex__zhiheng", "wansha" },
}

Fk:loadTranslationTable{
  ["jilue"] = "极略",
  [":jilue"] = "你可以弃置1枚“忍”，发动下列一项技能：〖鬼才〗、〖放逐〗、〖集智〗、〖制衡〗、〖完杀〗。",

  ["#jilue-zhiheng"] = "极略：你可以弃置1枚“忍”标记，发动〖制衡〗",
  ["#jilue-wansha"] = "极略：你可以弃置1枚“忍”标记，获得〖完杀〗直到回合结束",

  ["$ex__guicai_godsimayi"] = "老夫，即是天命！",
  ["$fangzhu_godsimayi"] = "赦你死罪，你去吧！",
  ["$ex__jizhi_godsimayi"] = "顺应天意，得道多助。",
  ["$ex__zhiheng_godsimayi"] = "天之道，轮回也。",
  ["$wansha_godsimayi"] = "天要亡你，谁人能救？",
}

jilue:addEffect("active", {
  mute = true,
  min_card_num = function(self)
    if self.interaction.data == "ex__zhiheng" then
      return 1
    end
    if self.interaction.data == "wansha" then
      return 0
    end
  end,
  max_card_num = function(self)
    if self.interaction.data == "ex__zhiheng" then
      return 999
    end
    if self.interaction.data == "wansha" then
      return 0
    end
  end,
  target_num = 0,
  prompt = function(self)
    if self.interaction.data == "ex__zhiheng" then
      return "#jilue-zhiheng"
    elseif self.interaction.data == "wansha" then
      return "#jilue-wansha"
    end
  end,
  interaction = function(self, player)
    local choices = {}
    if player:usedSkillTimes("ex__zhiheng", Player.HistoryPhase) == 0 then
      table.insert(choices, "ex__zhiheng")
    end
    if not player:hasSkill("wansha", true) then
      table.insert(choices, "wansha")
    end
    if #choices == 0 then return end
    return UI.ComboBox { choices = choices , all_choices = {"ex__zhiheng", "wansha"}}
  end,
  can_use = function(self, player)
    return player:getMark("@godsimayi_bear") > 0 and
      (player:usedSkillTimes("ex__zhiheng", Player.HistoryPhase) == 0 or not player:hasSkill("wansha", true))
  end,
  card_filter = function(self, player, to_select)
    if self.interaction.data == "ex__zhiheng" then
      return not player:prohibitDiscard(to_select)
    end
    if self.interaction.data == "wansha" then
      return false
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:removePlayerMark(player, "@godsimayi_bear", 1)
    if effect.interaction_data == "ex__zhiheng" then
      player:broadcastSkillInvoke("ex__zhiheng")
      room:notifySkillInvoked(player, "jilue", "drawcard")
      player:setSkillUseHistory("ex__zhiheng", player:usedSkillTimes("ex__zhiheng", Player.HistoryPhase) + 1, Player.HistoryPhase)
      local hand = player:getCardIds("h")
      local more = #hand > 0
      for _, id in ipairs(hand) do
        if not table.contains(effect.cards, id) then
          more = false
          break
        end
      end
      room:throwCard(effect.cards, "ex__zhiheng", player, player)
      if player.dead then return end
      room:drawCards(player, #effect.cards + (more and 1 or 0), "ex__zhiheng")
    elseif effect.interaction_data == "wansha" then
      player:broadcastSkillInvoke("wansha")
      room:notifySkillInvoked(player, "jilue", "offensive")
      room:handleAddLoseSkills(player, "wansha", nil, true, false)
      room.logic:getCurrentEvent():findParent(GameEvent.Turn):addCleaner(function()
        room:handleAddLoseSkills(player, "-wansha", nil, true, false)
      end)
    end
  end,
})
jilue:addEffect(fk.AskForRetrial, {
  mute = true,
  can_trigger = function (self, event, target, player, data)
    return player:hasSkill(jilue.name) and player:getMark("@godsimayi_bear") > 0 and
      not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local ids = table.filter(table.connect(player:getHandlyIds(), player:getCardIds("e")), function (id)
      return not player:prohibitResponse(Fk:getCardById(id))
    end)
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      skill_name = "ex__guicai",
      include_equip = true,
      pattern = tostring(Exppattern{ id = ids }),
      prompt = "#ex__guicai-ask::"..target.id..":"..data.reason,
      expand_pile = player:getHandlyIds(false),
      cancelable = true,
    })
    if #cards > 0 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:removePlayerMark(player, "@godsimayi_bear", 1)
    room:notifySkillInvoked(player, jilue.name, "control")
    player:broadcastSkillInvoke("ex__guicai")
    room:changeJudge{
      card = Fk:getCardById(event:getCostData(self).cards[1]),
      player = player,
      data = data,
      skillName = "ex__guicai",
      response = true,
    }
  end,
})
jilue:addEffect(fk.Damaged, {
  mute = true,
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(jilue.name) and player:getMark("@godsimayi_bear") > 0 and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      skill_name = "fangzhu",
      prompt = "#fangzhu-choose:::"..player:getLostHp(),
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:removePlayerMark(player, "@godsimayi_bear", 1)
    room:notifySkillInvoked(player, jilue.name, "masochism")
    player:broadcastSkillInvoke("fangzhu")
    local to = event:getCostData(self).tos[1]
    to:turnOver()
    if not to.dead and player:getLostHp() > 0 then
      to:drawCards(player:getLostHp(), "fangzhu")
    end
  end,
})
jilue:addEffect(fk.CardUsing, {
  mute = true,
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(jilue.name) and player:getMark("@godsimayi_bear") > 0 and
      data.card.type == Card.TypeTrick and not data.card:isConverted()
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = "ex__jizhi",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:removePlayerMark(player, "@godsimayi_bear", 1)
    room:notifySkillInvoked(player, jilue.name, "drawcard")
    player:broadcastSkillInvoke("ex__jizhi")
    local id = player:drawCards(1, "ex__jizhi")[1]
    if table.contains(player:getCardIds("h"), id) and Fk:getCardById(id).type == Card.TypeBasic and
      room.current == player and not player:prohibitDiscard(id) and
      room:askToSkillInvoke(player, {
        skill_name = "ex__jizhi",
        prompt = "#jizhi-invoke:::"..Fk:getCardById(id):toLogString(),
      }) then
      room:addPlayerMark(player, MarkEnum.AddMaxCardsInTurn, 1)
      room:throwCard(id, "ex__jizhi", player, player)
    end
  end,
})

return jilue
