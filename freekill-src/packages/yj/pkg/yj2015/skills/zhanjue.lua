local zhanjue = fk.CreateSkill {
  name = "zhanjue",
}

Fk:loadTranslationTable{
  ["zhanjue"] = "战绝",
  [":zhanjue"] = "出牌阶段，你可以将所有手牌当【决斗】使用，然后你和受伤的角色各摸一张牌。若你此法摸过两张或更多的牌，则本阶段〖战绝〗失效。",

  ["#zhanjue"] = "战绝：将所有手牌当【决斗】使用，然后你和受伤的角色各摸一张牌",

  ["$zhanjue1"] = "成败在此一举，杀！",
  ["$zhanjue2"] = "此刻，唯有死战，安能言降！",
}

zhanjue:addEffect("viewas", {
  anim_type = "offensive",
  prompt = "#zhanjue",
  card_filter = Util.FalseFunc,
  filter_pattern = function (self, player, card_name)
    local cards = player:getCardIds("h")
    return {
      max_num = #cards,
      min_num = #cards,
      pattern = ".|.|.|hand",
      subcards = cards
    }
  end,
  view_as = function(self, player, cards)
    local card = Fk:cloneCard("duel")
    card:addSubcards(player:getCardIds("h"))
    return card
  end,
  after_use = function(self, player, use)
    local room = player.room
    if not player.dead then
      room:addPlayerMark(player, "zhanjue-phase", 1)
      player:drawCards(1, zhanjue.name)
    end
    if use.damageDealt then
      for _, p in ipairs(room:getAlivePlayers()) do
        if use.damageDealt[p] and not p.dead then
          if p == player then
            room:addPlayerMark(player, "zhanjue-phase", 1)
          end
          p:drawCards(1, zhanjue.name)
        end
      end
    end
    if player:getMark("zhanjue-phase") > 1 then
      room:invalidateSkill(player, zhanjue.name, "-phase")
    end
  end,
  enabled_at_play = function(self, player)
    return not player:isKongcheng()
  end
})

zhanjue:addAI(nil, "vs_skill")

return zhanjue
