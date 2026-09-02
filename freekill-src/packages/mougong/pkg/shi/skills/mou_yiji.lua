local mouYiji = fk.CreateSkill({
  name = "mou__yiji",
  dynamic_desc = function (self, player, lang)
    if Fk:currentRoom():isGameMode("1v2_mode") then
      return "mou__yiji_1v2"
    elseif Fk:currentRoom():isGameMode("2v2_mode") then
      return "mou__yiji_2v2"
    end
    return "mou__yiji_role"
  end,
})

Fk:loadTranslationTable{
  ["mou__yiji"] = "遗计",

  [":mou__yiji"] = "当你受到伤害后，你可以摸两张牌，然后你可将至多等量张手牌交给其他角色（若为身份模式，则改为仅可给出以此法摸的牌）；" ..
  "当你每轮首次进入濒死状态时，你可以摸一张牌，然后你可将此牌交给一名其他角色（若为团战模式，则改为摸两张牌且可将至多等量张手牌交给其他角色）。",

  --TODO:需选将框（至少在22及斗地主模式）查看技能支持动态描述方可实装此部分，详见Fk/Cheat/GeneralDetail.qml
  --[":mou__yiji"] = Fk:translate(":mou__yiji_role") ..
  --"<br><strong>●身份模式</strong>  <a href=':mou__yiji_2v2'>团战模式</a>  <a href=':mou__yiji_1v2'>斗地主模式</a>",

  [":mou__yiji_role"] = "当你受到伤害后，你可以摸两张牌，然后你可将其中任意张牌交给其他角色；" ..
  "当你每轮首次进入濒死状态时，你可以摸一张牌，然后你可将此牌交给一名其他角色。",
  [":mou__yiji_2v2"] = "当你受到伤害后，或当你每轮首次进入濒死状态时，你可以摸两张牌，然后你可将至多等量张手牌交给其他角色。",
  [":mou__yiji_1v2"] = "当你受到伤害后，你可以摸两张牌，然后你可将至多等量张手牌交给其他角色；" ..
  "当你每轮首次进入濒死状态时，你可以摸一张牌，然后你可将此牌交给一名其他角色。",

  ["$mou__yiji1"] = "身不能征伐，此计或可襄君太平！",
  ["$mou__yiji2"] = "此身赴黄泉，望明公见计如晤。",
}

mouYiji:addEffect(fk.Damaged, {
  anim_type = "masochism",
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouYiji.name
    local room = player.room

    local toGive = player:drawCards(2, skillName)
    if room:isGameMode("role_mode") then
      toGive = table.filter(toGive, function(id) return room:getCardArea(id) == Card.PlayerHand and room:getCardOwner(id) == player end)
    else
      toGive = player:getCardIds("h")
    end

    if player.dead or #toGive == 0 then return end
    room:askToYiji(player, { cards = toGive, targets = room:getOtherPlayers(player, false), skill_name = skillName, min_num = 0, max_num = 2 })
  end
})

mouYiji:addEffect(fk.EnterDying, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    if not player:hasSkill(self) or target ~= player then return false end
    local room = player.room
    local logic = room.logic
    local dying_event = logic:getCurrentEvent():findParent(GameEvent.Dying, true)
    if dying_event == nil then return false end
    local mark = player:getMark("mou__yiji-round")
    if mark == 0 then
      logic:getEventsOfScope(GameEvent.Dying, 1, function (e)
        local last_dying = e.data
        if last_dying.who == player then
          mark = e.id
          room:setPlayerMark(player, "mou__yiji-round", mark)
          return true
        end
        return false
      end, Player.HistoryRound)
    end
    return mark == dying_event.id
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouYiji.name
    local room = player.room
    local x = room:isGameMode("2v2_mode") and 2 or 1

    local toGive = player:drawCards(x, skillName)
    if not room:isGameMode("2v2_mode") then
      toGive = table.filter(toGive, function(id) return room:getCardArea(id) == Card.PlayerHand and room:getCardOwner(id) == player end)
    else
      toGive = player:getCardIds("h")
    end

    if player.dead or #toGive == 0 then return end
    room:askToYiji(player, { cards = toGive, targets = room:getOtherPlayers(player, false), skill_name = skillName, min_num = 0, max_num = x })
  end
})

return mouYiji
