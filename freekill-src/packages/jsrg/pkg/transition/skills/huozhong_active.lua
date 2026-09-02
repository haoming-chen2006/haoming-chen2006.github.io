local huozhong_active = fk.CreateSkill {
  name = "huozhong&",
}

Fk:loadTranslationTable{
  ["huozhong&"] = "惑众",
  [":huozhong&"] = "出牌阶段限一次，你可以将一张黑色非锦囊牌当【兵粮寸断】置于判定区，令张楚摸两张牌。",

  ["#huozhong&-invoke"] = "惑众：你可以将一张黑色非锦囊牌当【兵粮寸断】置于判定区，令张楚摸两张牌",
  ["#huozhong-choose"] = "惑众：选择你要发动哪名角色的“惑众”，令其摸两张牌",
}

huozhong_active:addEffect("active", {
  mute = true,
  prompt = "#huozhong&-invoke",
  target_num = 0,
  card_num = 1,
  can_use = function(self, player)
    return not player:hasDelayedTrick("supply_shortage") and not table.contains(player.sealedSlots, Player.JudgeSlot) and
      table.find(Fk:currentRoom().alive_players, function (p)
        return p:hasSkill("huozhong") and not table.contains(player:getTableMark("huozhong-phase"), p.id)
      end)
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type ~= Card.TypeTrick and Fk:getCardById(to_select).color == Card.Black
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local src = table.filter(room.alive_players, function (p)
      return p:hasSkill("huozhong") and not table.contains(player:getTableMark("huozhong-phase"), p.id)
    end)
    if #src > 1 then
      src = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = src,
        skill_name = huozhong_active.name,
        prompt = "#huozhong-choose",
        cancelable = false,
      })
    end
    src = src[1]
    src:broadcastSkillInvoke("huozhong")
    room:notifySkillInvoked(src, "huozhong", "drawcard")
    room:doIndicate(player, {src})
    room:addTableMark(player, "huozhong-phase", src.id)
    local card = Fk:cloneCard("supply_shortage")
    card:addSubcards(effect.cards)
    player:addVirtualEquip(card)
    room:moveCardTo(card, Card.PlayerJudge, player, fk.ReasonPut, huozhong_active.name)
    if not src.dead then
      src:drawCards(2, huozhong_active.name)
    end
  end,
})

return huozhong_active
