local longhun = fk.CreateSkill {
  name = "gundam__longhun",
}

Fk:loadTranslationTable{
  ["gundam__longhun"] = "龙魂",
  [":gundam__longhun"] = "你可以将你的牌按以下规则使用或打出：<font color='red'>♥</font>当【桃】，"..
  "<font color='red'>♦</font>当火【杀】，♣当【闪】，♠当【无懈可击】。",

  ["#gundam__longhun"] = "龙魂：将一张牌按花色转化为对应的牌使用或打出",

  ["$gundam__longhun1"] = "金甲映日，驱邪祛秽。", --无懈
  ["$gundam__longhun2"] = "腾龙行云，首尾不见。", --闪
  ["$gundam__longhun3"] = "潜龙于渊，涉灵愈伤。", --桃
  ["$gundam__longhun4"] = "千里一怒，红莲灿世。", --火杀
}

longhun:addEffect("viewas", {
  mute = true,
  pattern = "peach,slash,jink,nullification",
  prompt = "#gundam__longhun",
  filter_pattern = function (self, player, card_name)
    local vs_pattern = {
      max_num = 1,
      min_num = 1,
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
    if #cards ~= 1 then return end
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
  before_use = function (self, player, use)
    local room = player.room
    if use.card.trueName == "nullification" then
      player:broadcastSkillInvoke(longhun.name, 1)
      room:notifySkillInvoked(player, longhun.name, "control")
    elseif use.card.trueName == "jink" then
      player:broadcastSkillInvoke(longhun.name, 2)
      room:notifySkillInvoked(player, longhun.name, "defensive")
    elseif use.card.trueName == "peach" then
      player:broadcastSkillInvoke(longhun.name, 3)
      room:notifySkillInvoked(player, longhun.name, "support")
    elseif use.card.trueName == "slash" then
      player:broadcastSkillInvoke(longhun.name, 4)
      room:notifySkillInvoked(player, longhun.name, "offensive")
    end
  end,
  enabled_at_nullification = function (self, player, data)
    return #player:getHandlyIds() > 0 or
      table.find(player:getCardIds("e"), function (id)
        return Fk:getCardById(id).suit == Card.Spade
      end) ~= nil
  end,
})

return longhun
