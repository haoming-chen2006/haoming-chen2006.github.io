local nianen = fk.CreateSkill {
  name = "nianen",
}

Fk:loadTranslationTable{
  ["nianen"] = "念恩",
  [":nianen"] = "你可以将一张牌当任意基本牌使用或打出；若转化后的牌不为红色普【杀】，〖念恩〗失效且你获得〖马术〗直到回合结束。",

  ["#nianen"] = "念恩：将一张牌当任意基本牌使用或打出，若转化后的牌不为红色普【杀】，“念恩”失效且本回合获得“马术”",

  ["$nianen1"] = "丞相厚恩，今斩将以报。",
  ["$nianen2"] = "丈夫信义为先，恩信岂可负之？",
  ["$nianen3"] = "桃园之谊，殷殷在怀，不敢或忘。",
  ["$nianen4"] = "解印封金离许都，惟思恩义走长途。",
}

nianen:addEffect("viewas", {
  pattern = ".|.|.|.|.|basic",
  mute = true,
  prompt = "#nianen",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames(nianen.name, all_names)
    if #names > 0 then
      return UI.CardNameBox { choices = names, all_choices = all_names }
    end
  end,
  handly_pile = true,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 or not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addSubcard(cards[1])
    card.skillName = nianen.name
    return card
  end,
  before_use = function(self, player, use)
    local room = player.room
    room:notifySkillInvoked(player, nianen.name)
    if use.card.name ~= "slash" or use.card.color ~= Card.Red then
      player:broadcastSkillInvoke(nianen.name, math.random(3, 4))
      room:invalidateSkill(player, nianen.name, "-turn")
      local curTurn = room.logic:getCurrentEvent():findParent(GameEvent.Turn)
      if not player:hasSkill("mashu", true) and curTurn then
        room:handleAddLoseSkills(player, "mashu")
        curTurn:addCleaner(function()
          room:handleAddLoseSkills(player, "-mashu")
        end)
      end
    else
      player:broadcastSkillInvoke(nianen.name, math.random(1, 2))
    end
  end,
})

return nianen
