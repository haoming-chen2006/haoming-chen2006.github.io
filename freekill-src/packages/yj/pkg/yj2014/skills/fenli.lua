local fenli = fk.CreateSkill {
  name = "fenli"
}

Fk:loadTranslationTable{
  ["fenli"] = "奋励",
  [":fenli"] = "若你的手牌数为全场最多，你可以跳过摸牌阶段；若你的体力值为全场最多，你可以跳过出牌阶段；若你的装备区里有牌且数量为全场最多，"..
  "你可以跳过弃牌阶段。",

  ["#fenli-invoke"] = "奋励：你可以跳过%arg",

  ["$fenli1"] = "以逸待劳，坐收渔利。",
  ["$fenli2"] = "以主制客，占尽优势。",
}

fenli:addEffect(fk.EventPhaseChanging, {
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(fenli.name) and not data.skipped then
      if data.phase == Player.Draw then
        return table.every(player.room:getOtherPlayers(player), function (p)
          return p:getHandcardNum() <= player:getHandcardNum()
        end)
      elseif data.phase == Player.Play then
        return table.every(player.room:getOtherPlayers(player), function (p)
          return p.hp <= player.hp
        end)
      elseif data.phase == Player.Discard and #player:getCardIds("e") > 0 then
        return table.every(player.room:getOtherPlayers(player), function (p)
          return #p:getCardIds("e") <= #player:getCardIds("e")
        end)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = fenli.name,
      prompt = "#fenli-invoke:::"..Util.PhaseStrMapper(data.phase),
    })
  end,
  on_use = function(self, event, target, player, data)
    player:skip(data.phase)
    data.skipped = true
  end,
})

return fenli
