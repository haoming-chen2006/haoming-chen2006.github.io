
local xiaoji = fk.CreateSkill({
  name = "mou__xiaoji",
  dynamic_desc = function (self, player, lang)
    return "mou__xiaoji_"..player:getMark(self.name)
  end,
})

Fk:loadTranslationTable{
  ["mou__xiaoji"] = "枭姬",
  [":mou__xiaoji"] = "你失去装备区里的一张牌时，你摸两张牌。<br>"..
  "⬤　二级：你失去装备区里的一张牌时，你摸两张牌，然后可以弃置场上一张牌。<br>"..
  "⬤　三级：你或结姻角色失去装备区里的一张牌时，你摸两张牌，若为每轮首次发动，你获得1点护甲。<br>"..
  "⬤　四级：你或结姻角色失去装备区里的一张牌时，你摸两张牌，然后本回合使用【杀】次数+1。",

  [":mou__xiaoji_0"] = "你失去装备区里的一张牌时，你摸两张牌。",
  [":mou__xiaoji_2"] = "你失去装备区里的一张牌时，你摸两张牌，然后可以弃置场上一张牌。",
  [":mou__xiaoji_3"] = "你或结姻角色失去装备区里的一张牌时，你摸两张牌，若为每轮首次发动，你获得1点护甲。",
  [":mou__xiaoji_4"] = "你或结姻角色失去装备区里的一张牌时，你摸两张牌，然后本回合使用【杀】次数+1。",

  ["#mou__xiaoji-discard"] = "枭姬：选择一名角色，弃置其场上一张牌",

  ["$mou__xiaoji1"] = "吾之所通，何止十八般兵刃！",
  ["$mou__xiaoji2"] = "既如此，就让尔等见识一番！",
}

xiaoji:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  trigger_times = function (self, event, target, player, data)
    local i = 0
    for _, move in ipairs(data) do
      if move.from == player or
        (player:getMark(xiaoji.name) > 2 and move.from and player:getMark("@[chara]mou__jieyin") == move.from.id) then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerEquip then
            i = i + 1
          end
        end
      end
    end

    return i
  end,
  can_trigger = function(self, event, target, player, data)
    if not player:hasSkill(xiaoji.name) then return end
    for _, move in ipairs(data) do
      if move.from == player or
        (player:getMark(xiaoji.name) > 2 and move.from and player:getMark("@[chara]mou__jieyin") == move.from.id) then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerEquip then
            return true
          end
        end
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:drawCards(2, xiaoji.name)
    if player.dead then return end
    if player:getMark(xiaoji.name) == 2 then
      local targets = table.filter(room.alive_players, function (p)
        return #p:getCardIds("ej") > 0
      end)
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#mou__xiaoji-discard",
        skill_name = xiaoji.name,
        cancelable = true,
      })
      if #to == 0 then return false end
      to = to[1]
      local card = room:askToChooseCard(player, {
        target = to,
        flag = "ej",
        skill_name = xiaoji.name,
      })
      room:throwCard(card, xiaoji.name, to, player)
    elseif player:getMark(xiaoji.name) == 3 then
      if player:usedSkillTimes(xiaoji.name, Player.HistoryRound) == 1 then
        room:changeShield(player, 1)
      end
    elseif player:getMark(xiaoji.name) == 4 then
      room:addPlayerMark(player, MarkEnum.SlashResidue.."-turn", 2)
    end
  end,
})

return xiaoji
