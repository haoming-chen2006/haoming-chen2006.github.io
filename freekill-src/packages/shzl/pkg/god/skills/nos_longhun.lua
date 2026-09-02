local longhun = fk.CreateSkill {
  name = "nos__longhun",
}

Fk:loadTranslationTable{
  ["nos__longhun"] = "龙魂",
  [":nos__longhun"] = "你可以将X张你的同花色的牌按以下规则使用或打出：<font color='red'>♥</font>当【桃】，"..
  "<font color='red'>♦</font>当火【杀】，♣当【闪】，♠当【无懈可击】（X为你的体力值且至少为1）。",

  ["#nos__longhun"] = "龙魂：将%arg张相同花色的牌当对应的牌使用或打出",

  ["$nos__longhun1"] = "常山赵子龙在此！",
  ["$nos__longhun2"] = "能屈能伸，才是大丈夫！",
}

longhun:addEffect("viewas", {
  pattern = "peach,slash,jink,nullification",
  prompt = function (self, player, selected_cards, selected)
    return "#nos__longhun:::"..math.max(player.hp, 1)
  end,
  handly_pile = true,
    filter_pattern = function (self, player, card_name)
    local vs_pattern = {
      max_num = math.max(player.hp, 1),
      min_num = math.max(player.hp, 1),
      pattern = ".",
    }
    if card_name == "peach" then
      vs_pattern.pattern = ".|.|heart"
    elseif card_name == "fire__slash" or card_name == "slash" then
      vs_pattern.pattern = ".|.|diamond"
    elseif card_name == "jink" then
      vs_pattern.pattern = ".|.|club"
    elseif card_name == "nullification" then
      vs_pattern.pattern = ".|.|spade"
    end
    return vs_pattern
  end,
  view_as = function(self, player, cards)
    if #cards ~= math.max(player.hp, 1) then return end
    local suit = Fk:getCardById(cards[1]).suit
    local c
    if suit == Card.Heart then
      c = Fk:cloneCard("peach")
    elseif suit == Card.Diamond then
      c = Fk:cloneCard("fire__slash")
    elseif suit == Card.Club then
      c = Fk:cloneCard("jink")
    elseif suit == Card.Spade then
      c = Fk:cloneCard("nullification")
    else
      return nil
    end
    c.skillName = longhun.name
    c:addSubcards(cards)
    return c
  end,
  enabled_at_nullification = function (self, player, data)
    return #player:getHandlyIds() > 0 or
      table.find(player:getCardIds("e"), function (id)
        return Fk:getCardById(id).suit == Card.Spade
      end) ~= nil
  end,
})

longhun:addAI(nil, "vs_skill")

return longhun
