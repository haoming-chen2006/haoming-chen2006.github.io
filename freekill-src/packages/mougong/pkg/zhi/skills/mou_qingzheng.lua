local mouQingzheng = fk.CreateSkill({
  name = "mou__qingzheng",
})

Fk:loadTranslationTable{
  ["mou__qingzheng"] = "清正",
  [":mou__qingzheng"] = "出牌阶段开始时，你可以选择一名有手牌的其他角色，你弃置3-X（X为你的“治世”标记数）种花色的所有手牌，然后观看其手牌并弃置其中一种花色的所有牌，若其被弃置的牌数小于你弃置的牌数，你对其造成1点伤害。然后若你拥有〖奸雄〗且“治世”标记数小于2，你可以"..
  "获得1枚“治世”。",

  ["#mou__qingzheng-addmark"] = "清正：你可获得1枚“治世”，增强“清正”，削弱“奸雄”",
  ["#mou__qingzheng-card"] = "清正：你可弃置 %arg 种花色的手牌，观看1名角色手牌，弃其1种花色的手牌",
  ["#mou__qingzheng-choose"] = "清正：选择一名其他角色，观看其手牌并弃置其中一种花色",
  ["#mou__qingzheng-throw"] = "清正：弃置 %dest 一种花色的手牌，若弃置张数小于 %arg，对其造成伤害",

  ["$mou__qingzheng1"] = "立威行严法，肃佞正国纲！",
  ["$mou__qingzheng2"] = "悬杖分五色，治法扬清名。",
}

local U = require "packages.utility.utility"

mouQingzheng:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouQingzheng.name) and
      player.phase == Player.Play and
      not player:isKongcheng() and
      table.find(player.room:getOtherPlayers(player, false), function(p) return not p:isKongcheng() end)
  end,
  on_cost = function(self, event, target, player, data)
    ---@type string
    local skillName = mouQingzheng.name
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p) return not p:isKongcheng() end)
    local num = 3 - player:getMark("@mou__jianxiong")
    local listNames = { "log_spade", "log_club", "log_heart", "log_diamond" }
    local listCards = { {}, {}, {}, {} }
    for _, id in ipairs(player:getCardIds("h")) do
      local suit = Fk:getCardById(id).suit
      if suit ~= Card.NoSuit and not player:prohibitDiscard(id) then
        table.insertIfNeed(listCards[suit], id)
      end
    end
    local choices = U.askForChooseCardList(room, player, listNames, listCards, num, num, skillName, "#mou__qingzheng-card:::" .. num)
    if #choices == num then
      local to = room:askToChoosePlayers(
        player,
        {
          targets = targets,
          min_num = 1,
          max_num = 1,
          prompt = "#mou__qingzheng-choose",
          skill_name = skillName
        }
      )
      if #to > 0 then
        event:setCostData(self, { choices, to[1] })
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouQingzheng.name
    local room = player.room
    local costData = event:getCostData(self)
    local choices = costData[1]
    local to = costData[2]

    local my_throw = table.filter(player:getCardIds("h"), function (id)
      return not player:prohibitDiscard(Fk:getCardById(id)) and table.contains(choices, Fk:getCardById(id):getSuitString(true))
    end)
    room:throwCard(my_throw, skillName, player, player)
    if player.dead then return end
    local to_throw = {}
    local listNames = { "log_spade", "log_club", "log_heart", "log_diamond" }
    local listCards = { {}, {}, {}, {} }
    local can_throw
    for _, id in ipairs(to:getCardIds("h")) do
      local suit = Fk:getCardById(id).suit
      if suit ~= Card.NoSuit then
        table.insertIfNeed(listCards[suit], id)
        can_throw = true
      end
    end
    if can_throw then
      local choice = U.askForChooseCardList(
        room,
        player,
        listNames,
        listCards,
        1,
        1,
        skillName,
        "#mou__qingzheng-throw::" .. to.id .. ":" .. #my_throw,
        false,
        false
      )
      if #choice == 1 then
        to_throw = table.filter(to:getCardIds("h"), function(id) return Fk:getCardById(id):getSuitString(true) == choice[1] end)
      end
    end
    room:throwCard(to_throw, skillName, to, player)
    if #my_throw > #to_throw then
      if not to.dead then
        room:doIndicate(player.id, { to.id })
        room:damage{ from = player, to = to, damage = 1, skillName = skillName }
      end
    end
    if player:hasSkill(skillName) and player:getMark("@mou__jianxiong") < 2 then
      if room:askToSkillInvoke(player, { skill_name = skillName, prompt = "#mou__qingzheng-addmark" }) then
        room:addPlayerMark(player, "@mou__jianxiong", 1)
      end
    end
  end,
})

return mouQingzheng
