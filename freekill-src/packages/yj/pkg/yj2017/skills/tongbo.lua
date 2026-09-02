local tongbo = fk.CreateSkill {
  name = "tongbo",
}

Fk:loadTranslationTable{
  ["tongbo"] = "通博",
  [":tongbo"] = "摸牌阶段结束时，你可以用任意张牌替换等量的“书”，然后若你的“书”包含四种花色，你须将所有“书”分配给任意名其他角色。",

  ["#tongbo-give"] = "通博：将所有“书”分配给其他角色",

  ["$tongbo1"] = "读万卷书，行万里路。",
  ["$tongbo2"] = "博学而不穷，笃行而不倦。",
}

tongbo:addEffect(fk.EventPhaseEnd, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tongbo.name) and player.phase == Player.Draw and
      #player:getPile("caiyong_book") > 0 and not player:isNude()
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local piles = room:askToArrangeCards(player, {
      skill_name = tongbo.name,
      card_map = {"caiyong_book", player:getPile("caiyong_book"), player.general, player:getCardIds("he")},
    })
    if table.every(piles[1], function (id)
      return table.contains(player:getPile("caiyong_book"), id)
    end) then return false end
    room:swapCardsWithPile(player, piles[1], piles[2], tongbo.name, "caiyong_book")
    if player.dead or #player:getPile("caiyong_book") < 4 or #room:getOtherPlayers(player, false) == 0 then return end
    local suits = {1, 2, 3, 4}
    for _, id in ipairs(player:getPile("caiyong_book")) do
      table.removeOne(suits, Fk:getCardById(id).suit)
    end
    if #suits > 0 then return end
    room:askToYiji(player, {
      cards = player:getPile("caiyong_book"),
      targets = room:getOtherPlayers(player, false),
      skill_name = tongbo.name,
      min_num = #player:getPile("caiyong_book"),
      max_num = #player:getPile("caiyong_book"),
      prompt = "#tongbo-give",
      expand_pile = "caiyong_book",
    })
  end,
})

return tongbo
