local mouWusheng = fk.CreateSkill({
  name = "mou__wusheng",
})

Fk:loadTranslationTable{
  ["mou__wusheng"] = "武圣",
  [":mou__wusheng"] = "你可以将一张手牌当任意【杀】使用或打出；出牌阶段开始时，你可以选择一名不为主公的其他角色，此阶段你拥有以下效果：" ..
  "你对其使用【杀】无距离和次数限制；当你使用【杀】指定其为目标后，你摸一张牌（若为身份模式则改为摸两张牌）；" ..
  "当你对其使用三张【杀】后，本阶段不可再使用【杀】指定其为目标。",
  ["#mou__wusheng_trigger"] = "武圣",
  ["#mou__wusheng"] = "武圣：你可以将一张手牌当任意【杀】使用或打出",
  ["@mou__wusheng-phase"] = "被武圣",
  ["#mou__wusheng-choose"] = "武圣：你可选择一名非主公角色，此阶段可对其出三张【杀】且对其用【杀】摸一张牌",

  ["$mou__wusheng1"] = "千军斩将而回，于某又有何难？",
  ["$mou__wusheng2"] = "对敌岂遵一招一式！",
  ["$mou__wusheng3"] = "关某既出，敌将定皆披靡。",
}

mouWusheng:addEffect("viewas", {
  pattern = "slash",
  card_num = 1,
  prompt = "#mou__wusheng",
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|.|^equip",
  },
  interaction = function(self, player)
    local allCardNames = {}
    for _, id in ipairs(Fk:getAllCardIds()) do
      local card = Fk:getCardById(id)
      if
        not table.contains(allCardNames, card.name) and
        card.trueName == "slash" and
        (
          (Fk.currentResponsePattern == nil and player:canUse(card)) or
          (Fk.currentResponsePattern and Exppattern:Parse(Fk.currentResponsePattern):match(card))
        ) and
        not player:prohibitUse(card) then
        table.insert(allCardNames, card.name)
      end
    end
    return UI.ComboBox { choices = allCardNames }
  end,
  view_as = function(self, player, cards)
    local choice = self.interaction.data
    if not choice or #cards ~= 1 then return end
    local c = Fk:cloneCard(choice)
    c:addSubcards(cards)
    c.skillName = mouWusheng.name
    return c
  end,
  enabled_at_play = function(self, player)
    return player:canUse(Fk:cloneCard("slash"))
  end,
  enabled_at_response = function(self, player)
    return Fk.currentResponsePattern and Exppattern:Parse(Fk.currentResponsePattern):match(Fk:cloneCard("slash"))
  end,
})

mouWusheng:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    local room = player.room

    return
      target == player and
      player:hasSkill(mouWusheng.name) and
      player.phase == Player.Play and
      table.find(room:getOtherPlayers(player, false), function(p)
        return p.role ~= "lord" or not p.role_shown or room:isGameMode("1v2_mode")
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p.role ~= "lord" or not p.role_shown or room:isGameMode("1v2_mode")
    end)

    if #targets > 0 then
      local tos = room:askToChoosePlayers(
        player,
        {
          targets = targets,
          min_num = 1,
          max_num = 1,
          prompt = "#mou__wusheng-choose",
          skill_name = mouWusheng.name
        }
      )
      if #tos > 0 then
        event:setCostData(self, { tos = tos })
        return true
      end
    end

    return false
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(event:getCostData(self).tos[1], "@mou__wusheng-phase", "")
    room:setPlayerMark(player, "mou__wusheng_from-phase", 1)
  end,
})

mouWusheng:addEffect("targetmod", {
  bypass_times = function(self, player, skill, scope, card, to)
    return card and card.trueName == "slash" and player:getMark("mou__wusheng_from-phase") > 0 and to and to:getMark("@mou__wusheng-phase") ~= 0
  end,
  bypass_distances = function(self, player, skill, card, to)
    return card and card.trueName == "slash" and player:getMark("mou__wusheng_from-phase") > 0 and to and to:getMark("@mou__wusheng-phase") ~= 0
  end,
})

mouWusheng:addEffect(fk.TargetSpecified, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.card.trueName == "slash" and
      player:getMark("mou__wusheng_from-phase") ~= 0 and
      data.to:getMark("@mou__wusheng-phase") ~= 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = data.to
    if to:isAlive() then
      local usedTimes = to:getMark("@mou__wusheng-phase")
      room:setPlayerMark(to, "@mou__wusheng-phase", type(usedTimes) == "string" and 1 or usedTimes + 1)
    end

    local drawNum = room:isGameMode("role_mode") and 2 or 1
    player:drawCards(drawNum, mouWusheng.name)
  end,
})

mouWusheng:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    local usedTimes = to:getMark("@mou__wusheng-phase")
    return
      from and from:getMark("mou__wusheng_from-phase") > 0 and
      card and
      card.trueName == "slash" and
      type(usedTimes) == "number" and
      usedTimes > 2
  end,
})

return mouWusheng
