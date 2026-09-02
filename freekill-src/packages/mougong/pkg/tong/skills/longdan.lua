
local longdan = fk.CreateSkill({
  name = "mou__longdan",
  tags = { Skill.Charge },
  dynamic_desc = function (self, player, lang)
    if player:getMark("@@mou__jizhu") > 0 then
      return "mou__longdan_inner"
    end
  end,
})

Fk:loadTranslationTable{
  ["mou__longdan"] = "龙胆",
  [":mou__longdan"] = "蓄力技（1/3），一名角色的回合结束时，你获得1点蓄力点。"..
  "你可以减少1点蓄力点，将一张【杀】当【闪】、【闪】当普通【杀】使用或打出。你以此法使用牌时，摸一张牌。",

  [":mou__longdan_inner"] = "蓄力技（1/3），一名角色的回合结束时，你获得1点蓄力点。"..
  "你可以减少1点蓄力点，将一张基本牌当任意基本牌使用或打出。你以此法使用牌时，摸一张牌。",

  ["#mou__longdan0"] = "龙胆：消耗1点蓄力点，将【杀】当【闪】、【闪】当【杀】使用或打出",
  ["#mou__longdan1"] = "龙胆：消耗1点蓄力点，将一张基本牌当任意基本牌使用或打出",

  ["$mou__longdan1"] = "长坂沥赤胆，佑主成忠名！",
  ["$mou__longdan2"] = "龙驹染碧血，银枪照丹心！",
}

local U = require "packages.utility.utility"

longdan:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  prompt = function (self, player)
    return "#mou__longdan" .. player:getMark("@@mou__jizhu")
  end,
  interaction = function(self, player)
    local all_names = player:getMark("@@mou__jizhu") == 0 and { "slash", "jink" } or Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames(longdan.name, all_names)
    if #names == 0 then return end
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  filter_pattern = function (self, player, card_name)
    if player:getMark("@@mou__jizhu") == 0 then
      local pat = {
        max_num = 1,
        min_num = 1,
        pattern = "slash,jink",
      }
      if card_name == "slash" then
        pat.pattern = "jink"
      elseif card_name == "jink" then
        pat.pattern = "slash"
      end
      return pat
    else
      return {
        max_num = 1,
        min_num = 1,
        pattern = ".|.|.|.|.|basic",
      }
    end
  end,
  card_filter = function(self, player, to_select, selected)
    if #selected ~= 0 or not self.interaction.data then return false end
    local card = Fk:getCardById(to_select)
    if player:getMark("@@mou__jizhu") == 0 then
      return card.trueName == (self.interaction.data == "jink" and "slash" or "jink")
    else
      return card.type == Card.TypeBasic
    end
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 or not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcard(cards[1])
    card.skillName = longdan.name
    return card
  end,
  before_use = function(self, player, use)
    U.skillCharged(player, -1)
  end,
  enabled_at_play = function(self, player)
    return player:getMark("skill_charge") > 0
  end,
  enabled_at_response = function (self, player, response)
    if player:getMark("skill_charge") > 0 and Fk.currentResponsePattern then
      local names = player:getMark("@@mou__jizhu") == 0 and { "slash", "jink" } or Fk:getAllCardNames("b")
      return #player:getViewAsCardNames(longdan.name, names) > 0
    end
  end,
})

longdan:addEffect(fk.CardUsing, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and not player.dead and
      table.contains(data.card.skillNames, longdan.name)
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, longdan.name)
  end,
})

longdan:addEffect(fk.TurnEnd, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(longdan.name) and
      player:getMark("skill_charge") < player:getMark("skill_charge_max")
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    U.skillCharged(player, 1)
  end,
})

longdan:addAcquireEffect(function (self, player)
  U.skillCharged(player, 1, 3)
end)

longdan:addLoseEffect(function (self, player)
  U.skillCharged(player, -1, -3)
end)

return longdan
