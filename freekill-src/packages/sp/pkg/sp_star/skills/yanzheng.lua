
local yanzheng = fk.CreateSkill {
  name = "yanzheng",
}

Fk:loadTranslationTable{
  ["yanzheng"] = "严整",
  [":yanzheng"] = "若你的手牌数大于你的体力值，你可以将你装备区内的牌当【无懈可击】使用。",

  ["#yanzheng"] = "严整：你可以将装备区内的牌当【无懈可击】使用",

  ["$yanzheng1"] = "任你横行霸道，我自岿然不动。",
  ["$yanzheng2"] = "行伍严整，百战不殆！"
}

yanzheng:addEffect("viewas", {
  anim_type = "defensive",
  pattern = "nullification",
  prompt = "#yanzheng",
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|.|equip"
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("nullification")
    c.skillName = yanzheng.name
    c:addSubcard(cards[1])
    return c
  end,
  enabled_at_response = function (self, player)
    return player:getHandcardNum() > player.hp and #player:getCardIds("e") > 0
  end,
})

return yanzheng
