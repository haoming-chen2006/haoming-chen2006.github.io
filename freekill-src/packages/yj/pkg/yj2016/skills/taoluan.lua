
local taoluan = fk.CreateSkill {
  name = "taoluan",
}

Fk:loadTranslationTable{
  ["taoluan"] = "滔乱",
  [":taoluan"] = "每种牌名限一次，当你需要使用基本牌或普通锦囊牌时，若没有角色处于濒死状态，你可以将一张牌当此牌使用，然后你令一名其他角色"..
  "选择一项：1.交给你一张类别不同的牌；2.令你失去1点体力，此技能本回合失效。",

  ["#taoluan"] = "滔乱：将一张牌当任意基本牌或普通锦囊牌使用",
  ["@$taoluan"] = "滔乱",
  ["#taoluan-choose"] = "滔乱：令一名其他角色交给你一张非%arg，或你失去1点体力且本回合“滔乱”失效",
  ["#taoluan-ask"] = "滔乱：你需交给 %src 一张非%arg，否则其失去1点体力且本回合“滔乱”失效",

  ["$taoluan1"] = "国家承平，神器稳固，陛下勿忧。",
  ["$taoluan2"] = "睁开你的眼睛看看，现在是谁说了算？"
}

taoluan:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, "@$taoluan", 0)
end)

taoluan:addEffect("viewas", {
  pattern = ".",
  prompt = "#taoluan",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("bt")
    local names = player:getViewAsCardNames(taoluan.name, all_names, nil, player:getTableMark("@$taoluan"))
    if #names == 0 then return end
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  handly_pile = true,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 or Fk.all_card_types[self.interaction.data] == nil then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcard(cards[1])
    card.skillName = taoluan.name
    return card
  end,
  before_use = function(self, player, use)
    player.room:addTableMark(player, "@$taoluan", use.card.trueName)
  end,
  after_use = function(self, player, use)
    if player.dead or #player.room:getOtherPlayers(player, false) == 0 then return end
    local room = player.room
    local type = use.card:getTypeString()
    local to = room:askToChoosePlayers(player, {
      skill_name = taoluan.name,
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      prompt = "#taoluan-choose:::"..type,
      cancelable = false,
    })[1]
    local card = room:askToCards(to, {
      skill_name = taoluan.name,
      include_equip = true,
      min_num = 1,
      max_num = 1,
      pattern = ".|.|.|.|.|^"..type,
      prompt = "#taoluan-ask:"..player.id.."::"..type,
      cancelable = true,
    })
    if #card > 0 then
      room:obtainCard(player, card, false, fk.ReasonGive, to, taoluan.name)
    else
      room:invalidateSkill(player, taoluan.name, "-turn")
      room:loseHp(player, 1, taoluan.name)
    end
  end,
  enabled_at_play = function(self, player)
    return table.every(Fk:currentRoom().alive_players, function(p)
      return not p.dying
    end)
  end,
  enabled_at_response = function(self, player, response)
    return not response and
       table.every(Fk:currentRoom().alive_players, function(p)
        return not p.dying
      end) and
      #player:getViewAsCardNames(taoluan.name, Fk:getAllCardNames("bt"), nil, player:getTableMark("@$taoluan")) > 0
  end,
  enabled_at_nullification = function (self, player, data)
    return #player:getHandlyIds() > 0 and not table.contains(player:getTableMark("@$taoluan"), "nullification")
  end,
})

taoluan:addAI(nil, "vs_skill")

return taoluan
