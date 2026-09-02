local xuanhuo = fk.CreateSkill {
  name = "nos__xuanhuo"
}

Fk:loadTranslationTable{
  ["nos__xuanhuo"] = "眩惑",
  [":nos__xuanhuo"] = "出牌阶段限一次，你可以将一张<font color='red'>♥</font>手牌交给一名其他角色，获得该角色的一张牌，"..
  "然后你可以将之交给除该角色外的其他角色。",

  ["#nos__xuanhuo"] = "眩惑：将一张<font color='red'>♥</font>手牌交给一名其他角色，获得其一张牌并交给任一角色",
  ["#nos__xuanhuo-give"] = "眩惑：你可以将这张牌交给另一名角色",

  ["$nos__xuanhuo1"] = "重用许靖，以眩远近。",
  ["$nos__xuanhuo2"] = "给你的，十倍奉还给我。",
}

xuanhuo:addEffect("active", {
  anim_type = "control",
  prompt = "#nos__xuanhuo",
  card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(xuanhuo.name, Player.HistoryPhase) == 0 and not player:isKongcheng()
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).suit == Card.Heart and
      table.contains(player:getCardIds("h"), to_select)
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:obtainCard(target, effect.cards, false, fk.ReasonGive, player, xuanhuo.name)
    if target:isNude() or player.dead or target.dead then return end
    local id = room:askToChooseCard(player, {
      target = target,
      flag = "he",
      skill_name = xuanhuo.name,
    })
    room:obtainCard(player, id, false, fk.ReasonPrey, player, xuanhuo.name)
    if player.dead then return end
    if table.contains(player:getCardIds("h"), id) then
      room:askToYiji(player, {
        cards = {id},
        targets = room:getOtherPlayers(target, false),
        skill_name = xuanhuo.name,
        min_num = 0,
        max_num = 1,
        prompt = "#nos__xuanhuo-give",
      })
    end
  end,
})

return xuanhuo