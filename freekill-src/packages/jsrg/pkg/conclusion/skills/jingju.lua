local jingju = fk.CreateSkill {
  name = "jingju",
}

Fk:loadTranslationTable{
  ["jingju"] = "惊惧",
  [":jingju"] = "你可以将其他角色判定区里的一张牌移至你的判定区，视为使用一张基本牌。",

  ["#jingju"] = "惊惧：选择视为使用的基本牌和目标",
  ["#jingju-choose"] = "惊惧：选择一名角色，将其判定区一张牌移至你的判定区",

  ["$jingju1"] = "朕有罪…求大将军饶恕…",
  ["$jingju2"] = "朕本无此心、绝无此心！"
}

jingju:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  prompt = "#jingju",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames(jingju.name, all_names)
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = jingju.name
    return card
  end,
  before_use = function(self, player)
    local room = player.room
    local targets = table.filter(player.room:getOtherPlayers(player, false), function(p)
      return p:canMoveCardsInBoardTo(player, "j")
    end)
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#jingju-choose",
      skill_name = jingju.name,
      cancelable = false,
    })[1]
    room:askToMoveCardInBoard(player, {
      target_one = to,
      target_two = player,
      skill_name = jingju.name,
      flag = "j",
      move_from = to,
    })
  end,
  enabled_at_play = function(self, player)
    return table.find(Fk:currentRoom().alive_players, function(p)
      return p:canMoveCardsInBoardTo(player, "j")
    end)
  end,
  enabled_at_response = function(self, player, response)
    return not response and table.find(Fk:currentRoom().alive_players, function(p)
      return p:canMoveCardsInBoardTo(player, "j")
    end)
  end,
})

return jingju
