local jieyin = fk.CreateSkill({
  name = "mou__jieyin",
  tags = { Skill.Quest },
})

Fk:loadTranslationTable {
  ["mou__jieyin"] = "结姻",
  [":mou__jieyin"] = "使命技，你的登场势力为“蜀”，游戏开始时，你将一名其他角色选择为结姻角色。<br>" ..
      "结姻角色死亡后，你减1点体力上限；结姻角色出牌阶段开始时，你选择一项：<br>" ..
      "1.令其获得1点护甲；2.你将势力变更为吴，然后获得其X张牌（X为游戏轮数且至多为3）。<br>" ..
      "⬤　成功：若结姻角色护甲值为5，你升级〖枭姬〗至三级。<br>" ..
      "⬤　成功：若结姻角色装备区里的牌数为4，你升级〖枭姬〗至四级。<br>" ..
      "⬤　失败：若结姻角色死亡，或你势力为吴，你清除结姻角色记录，重铸所有<font color='red'>♥</font>手牌，然后摸两张牌，升级〖枭姬〗至二级。",

  ["#mou__jieyin-choose"] = "结姻：选择一名角色为结姻角色",
  ["@[chara]mou__jieyin"] = "结姻",
  ["mou__jieyin_shield"] = "%dest 获得1点护甲",
  ["mou__jieyin_prey"] = "变更为吴势力，获得 %dest %arg张牌",

  ["$mou__jieyin1"] = "君若不负吾心，妾自随君千里。",
  ["$mou__jieyin2"] = "夫妻之情既断，何必再问归期！",
  ["$mou__jieyin3"] = "今日良姻既结，你我永为夫妇。",
  ["$mou__jieyin4"] = "此生得遇夫君，实乃妾身幸事。",
}

local spec = {
  on_use = function(self, event, target, player, data)
    local room = player.room
    if data.who ~= nil then
      room:changeMaxHp(player, -1)
    end
    if not player:hasSkill(jieyin.name) then return end
    room:updateQuestSkillState(player, jieyin.name, true)
    room:invalidateSkill(player, jieyin.name)
    room:setPlayerMark(player, "mou__xiaoji", 2)
    room:setPlayerMark(player, "@[chara]mou__jieyin", 0)
    local cards = table.filter(player:getCardIds("h"), function(id)
      return Fk:getCardById(id).suit == Card.Heart
    end)
    if #cards > 0 then
      room:recastCard(cards, player, jieyin.name)
      if player.dead then return end
    end
    player:drawCards(2, jieyin.name)
  end,
}

jieyin:addEffect(fk.GameStart, {
  anim_type = "support",
  audio_index = { 3, 4 },
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jieyin.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player.kingdom ~= "shu" then
      room:changeKingdom(player, "shu")
    end
    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      skill_name = jieyin.name,
      prompt = "#mou__jieyin-choose",
      cancelable = false,
    })
    if #to > 0 then
      room:setPlayerMark(player, "@[chara]mou__jieyin", to[1].id)
    end
  end,
})

jieyin:addEffect(fk.Deathed, {
  anim_type = "negative",
  audio_index = 2,
  late_refresh = true,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jieyin.name) and not player:getQuestSkillState(jieyin.name) and
        player:getMark("@[chara]mou__jieyin") == target.id
  end,
  on_cost = Util.TrueFunc,
  on_use = spec.on_use,

  can_refresh = function(self, event, target, player, data)
    return player:getMark("@[chara]mou__jieyin") == target.id
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@[chara]mou__jieyin", 0)
  end,
})

jieyin:addEffect(fk.AfterPropertyChange, {
  anim_type = "negative",
  audio_index = 2,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jieyin.name) and not player:getQuestSkillState(jieyin.name) and
        data.kingdom and player.kingdom == "wu"
  end,
  on_cost = Util.TrueFunc,
  on_use = spec.on_use,
})

jieyin:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  audio_index = { 3, 4 },
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jieyin.name) and not player:getQuestSkillState(jieyin.name) and target.phase == Player.Play and
        player:getMark("@[chara]mou__jieyin") == target.id
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = math.min(3, room:getBanner("RoundCount"))
    local choice = room:askToChoice(player, {
      skill_name = jieyin.name,
      choices = { "mou__jieyin_shield::" .. target.id, "mou__jieyin_prey::" .. target.id .. ":" .. n },
    })
    if choice:startsWith("mou__jieyin_shield") then
      room:changeShield(target, 1)
      if target.shield == 5 and player:hasSkill(jieyin.name) then
        player:broadcastSkillInvoke(jieyin.name, 1)
        room:notifySkillInvoked(player, jieyin.name, "support")
        room:updateQuestSkillState(player, jieyin.name, false)
        room:invalidateSkill(player, jieyin.name)
        room:setPlayerMark(player, "mou__xiaoji", 3)
      end
    else
      room:changeKingdom(player, "wu")
      if player.dead or target:isNude() then return end
      local cards = room:askToChooseCards(player, {
        target = target,
        min = n,
        max = n,
        flag = "he",
        skill_name = jieyin.name,
      })
      room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonPrey, jieyin.name, nil, false, player)
    end
  end,
})

jieyin:addEffect(fk.AfterCardsMove, {
  anim_type = "support",
  audio_index = 1,
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(jieyin.name) and not player:getQuestSkillState(jieyin.name) then
      for _, move in ipairs(data) do
        if move.to and player:getMark("@[chara]mou__jieyin") == move.to.id and
            #move.to:getCardIds("e") == 4 then
          return true
        end
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:updateQuestSkillState(player, jieyin.name, false)
    room:invalidateSkill(player, jieyin.name)
    room:setPlayerMark(player, "mou__xiaoji", 4)
  end,
})

return jieyin
