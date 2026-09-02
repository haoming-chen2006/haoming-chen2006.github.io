local shifei = fk.CreateSkill {
  name = "shifei",
}

Fk:loadTranslationTable{
  ["shifei"] = "饰非",
  [":shifei"] = "当你需要使用或打出【闪】时，你可以令当前回合角色摸一张牌，然后若其手牌数不是全场唯一最多的，你弃置一名手牌"..
  "全场最多的角色一张牌，视为你使用或打出一张【闪】。",

  ["#shifei"] = "饰非：令 %dest 摸一张牌，然后弃置手牌唯一最多角色的一张牌，视为使用或打出【闪】",
  ["#shifei-choose"] = "饰非：弃置全场手牌最多的一名角色的一张牌",
  ["$shifei1"] = "良谋失利，罪在先锋！",
  ["$shifei2"] = "计略周详，怎奈指挥不当。",
}

shifei:addEffect("viewas", {
  anim_type = "defensive",
  pattern = "jink",
  prompt = function(self, player)
    return "#shifei::"..Fk:currentRoom().current.id
  end,
  card_num = 0,
  filter_pattern = {
    min_num = 0,
    max_num = 0,
    pattern = "",
    subcards = {}
  },
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    local c = Fk:cloneCard("jink")
    c.skillName = shifei.name
    return c
  end,
  before_use = function(self, player)
    local room = player.room
    room.current:drawCards(1, shifei.name)
    if not player.dead then
      local targets = table.filter(room.alive_players, function (p)
        return table.every(room.alive_players, function (q)
          return p:getHandcardNum() >= q:getHandcardNum()
        end)
      end)
      if #targets == 1 and targets[1] == room.current then
        return shifei.name
      else
        if table.contains(targets, player) and
          not table.find(player:getCardIds("he"), function (id)
            return not player:prohibitDiscard(id)
          end) then
          table.removeOne(targets, player)
        end
        if #targets == 0 then
          return shifei.name
        end
        local to = room:askToChoosePlayers(player, {
          skill_name = shifei.name,
          min_num = 1,
          max_num = 1,
          prompt = "#shifei-choose",
          targets = targets,
          cancelable = false,
        })[1]
        if to == player then
          room:askToDiscard(player, {
            min_num = 1,
            max_num = 1,
            include_equip = true,
            skill_name = self.name,
            cancelable = false,
          })
        else
          local id = room:askToChooseCard(player, {
            target = to,
            flag = "he",
            skill_name = shifei.name,
          })
          room:throwCard(id, shifei.name, to, player)
        end
      end
    end
  end,
  enabled_at_response = function (self, player)
    return not Fk:currentRoom().current.dead
  end,
})

shifei:addAI(nil, "vs_skill")

return shifei
