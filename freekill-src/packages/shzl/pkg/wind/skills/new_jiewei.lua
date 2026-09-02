local jiewei = fk.CreateSkill({
  name = "y13__jiewei",
})

Fk:loadTranslationTable{
  ["y13__jiewei"] = "解围",
  [":y13__jiewei"] = "当你翻面后，你可以摸一张牌，然后你可以使用一张锦囊牌或者装备牌，若如此做，你可以弃置场上一张同类别的牌。",
  ["#y13__jiewei-use"] = "解围：你可以使用一张锦囊牌或者装备牌",
  ["#y13__jiewei-discard"] = "解围：你可以弃置场上一张%arg",

  ["$y13__jiewei1"] = "以守为攻，伺机而动！",
  ["$y13__jiewei2"] = "援军已到，转守为攻！",
}

jiewei:addEffect(fk.TurnedOver, {
  anim_type = "drawcard",
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:drawCards(player, 1, jiewei.name)
    local use = room:askToUseRealCard(player, {
      skill_name = jiewei.name,
      prompt = "#y13__jiewei-use",
      pattern = ".|.|.|.|.|trick,equip",
      cancelable = true,
    })
    if use and not player.dead then
      local flag = use.card.type == Card.TypeTrick and "j" or "e"
      local targets = table.filter(room.alive_players, function(p)
        return #p:getCardIds(flag) > 0
      end)
      if #targets > 0 then
        local to = room:askToChoosePlayers(player, {
          targets = targets,
          min_num = 1,
          max_num = 1,
          skill_name = jiewei.name,
          prompt = "#y13__jiewei-discard:::" .. use.card:getTypeString(),
          cancelable = true,
        })
        if #to > 0 then
          to = to[1]
          local card = room:askToChooseCard(player, {
            target = to,
            flag = flag,
            skill_name = jiewei.name,
          })
          room:throwCard(card, jiewei.name, to, player)
        end
      end
    end
  end,
})

return jiewei
