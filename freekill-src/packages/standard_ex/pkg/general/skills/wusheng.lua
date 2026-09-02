Fk:loadTranslationTable{
  ["ex__wusheng"] = "武圣",
  [":ex__wusheng"] = "你可以将一张红色牌当【杀】使用或打出。你使用<font color='red'>♦</font>【杀】无距离限制。",

  ["#ex__wusheng"] = "武圣：你可以将红色牌当【杀】使用或打出",

  ["$ex__wusheng1"] = "刀锋所向，战无不克！",
  ["$ex__wusheng2"] = "逆贼，哪里走！",
}

local wusheng = fk.CreateSkill{
  name = "ex__wusheng",
}

wusheng:addEffect("viewas", {
  anim_type = "offensive",
  mute_card = true,
  pattern = "slash",
  prompt = "#ex__wusheng",
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|red",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("slash")
    c.skillName = wusheng.name
    c:addSubcard(cards[1])
    return c
  end,
})

wusheng:addEffect("targetmod", {
  bypass_distances = function (self, player, skill, card)
    return player:hasSkill(wusheng.name) and card and card:matchVSPattern("slash|.|diamond")
  end
})

return wusheng
