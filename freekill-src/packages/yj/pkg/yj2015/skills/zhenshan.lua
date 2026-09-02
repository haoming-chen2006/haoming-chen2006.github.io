
local zhenshan = fk.CreateSkill {
  name = "zhenshan",
}

Fk:loadTranslationTable{
  ["zhenshan"] = "振赡",
  [":zhenshan"] = "每回合限一次，当你需要使用或打出一张基本牌时，你可以与一名手牌数少于你的角色交换手牌，若如此做，视为你使用或打出此牌。",

  ["#zhenshan"] = "振赡：与一名手牌数少于你的角色交换手牌，视为使用或打出基本牌（先选择使用的牌名和目标）",
  ["#zhenshan-choose"] = "振赡：与一名手牌数少于你的角色交换手牌",

  ["$zhenshan1"] = "看我如何以无用之力换己所需，哈哈哈！",
  ["$zhenshan2"] = "民不足食，何以养军？",
}

zhenshan:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  prompt = "#zhenshan",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames(zhenshan.name, all_names)
    if #names == 0 then return end
    return UI.CardNameBox {choices = names, all_names = all_names}
  end,
  card_filter = Util.FalseFunc,
  filter_pattern = {
    min_num = 0,
    max_num = 0,
    pattern = "",
    subcards = {}
  },
  view_as = function(self, player, cards)
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = zhenshan.name
    return card
  end,
  before_use = function(self, player)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return p:getHandcardNum() < player:getHandcardNum()
    end)
    if #targets == 0 then return "" end
    local to = room:askToChoosePlayers(player, {
      skill_name = zhenshan.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#zhenshan-choose",
      cancelable = false,
    })[1]
    room:swapAllCards(player, {player, to}, zhenshan.name, "h")
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(zhenshan.name, Player.HistoryTurn) == 0 and
      table.find(Fk:currentRoom().alive_players, function(p)
        return p:getHandcardNum() < player:getHandcardNum()
      end)
  end,
  enabled_at_response = function(self, player)
    return player:usedSkillTimes(zhenshan.name, Player.HistoryTurn) == 0 and
      table.find(Fk:currentRoom().alive_players, function(p)
        return p:getHandcardNum() < player:getHandcardNum()
      end)
  end,
})

zhenshan:addAI(nil, "vs_skill")

return zhenshan
