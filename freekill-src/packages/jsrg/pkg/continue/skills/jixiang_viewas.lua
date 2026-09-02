local jixiang_viewas = fk.CreateSkill{
  name = "jixiang&",
}

Fk:loadTranslationTable{
  ["jixiang&"] = "济乡",
  [":jixiang&"] = "每回合每种牌名限一次，当你于甄宓的回合内需要使用或打出基本牌时，其可以弃置一张牌允许你视为使用或打出之，"..
  "然后其摸一张牌并令〖称贤〗此阶段可发动次数+1。",

  ["#jixiang&"] = "济乡：声明你要视为使用或打出的基本牌，甄宓可以弃一张牌允许你使用或打出之",
  ["#jixiang-discard"] = "济乡：是否弃置一张牌，允许 %dest 视为使用或打出【%arg】？",
}

jixiang_viewas:addEffect("viewas", {
  mute = true,
  pattern = ".|.|.|.|.|basic",
  prompt = "#jixiang&",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("b")
    local names = player:getViewAsCardNames("jixiang", all_names, nil, Fk:currentRoom().current:getTableMark("jixiang-turn"))
    if #names > 0 then
      return UI.CardNameBox { choices = names, all_choices = all_names }
    end
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    if not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card.skillName = "jixiang"
    return card
  end,
  before_use = function(self, player, use)
    local room = player.room
    local src = room.current
    src:broadcastSkillInvoke("chengxian")
    room:notifySkillInvoked(src, "chengxian", "special")
    room:playCardEmotionAndSound(player, use.card)
    if #use.tos > 0 and not use.noIndicate then
      room:doIndicate(player, use.tos)
    end
    if #room:askToDiscard(src, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = "jixiang",
      prompt = "#jixiang-discard::"..player.id..":"..use.card.name,
      cancelable = true,
    }) == 0 then
      return jixiang_viewas.name
    end
    if not src.dead then
      room:addTableMark(src, "jixiang-turn", use.card.trueName)
    end
  end,
  after_use = function (self, player, use)
    local room = player.room
    if not room.current.dead then
      if room.current:hasSkill("chengxian") then
        room:addPlayerMark(room.current, "chengxian_extratimes-phase", 1)
      end
      room.current:drawCards(1, "jixiang")
    end
  end,
  enabled_at_play = Util.FalseFunc,
  enabled_at_response = function(self, player, response)
    return Fk:currentRoom().current:hasSkill("jixiang") and
      #player:getViewAsCardNames("jixiang", Fk:getAllCardNames("b"), nil, Fk:currentRoom().current:getTableMark("jixiang-turn")) > 0
  end,
})

return jixiang_viewas
