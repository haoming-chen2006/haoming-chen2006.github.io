local pizhuan = fk.CreateSkill {
  name = "pizhuan",
  derived_piles = "caiyong_book",
  dynamic_desc = function (self, player, lang)
    return "pizhuan_inner:"..4 + player:getMark("pizhuan_extra")
  end,
}

Fk:loadTranslationTable{
  ["pizhuan"] = "辟撰",
  [":pizhuan"] = "当你使用♠牌时，或你成为其他角色使用♠牌的目标后，你可以将牌堆顶的一张牌置于武将牌上，称为“书”；你至多拥有四张“书”，"..
  "你的手牌上限+X（X为“书”的数量）。",

  [":pizhuan_inner"] = "当你使用♠牌时，或你成为其他角色使用♠牌的目标后，你可以将牌堆顶的一张牌置于武将牌上，称为“书”；你至多拥有{1}张“书”，"..
  "你的手牌上限+X（X为“书”的数量）。",

  ["caiyong_book"] = "书",

  ["$pizhuan1"] = "无墨不成书，无识不成才。",
  ["$pizhuan2"] = "笔可抒情，亦可诛心。",
}

local spec = {
  on_use = function(self, event, target, player, data)
    player:addToPile("caiyong_book", player.room:getNCards(1), true, pizhuan.name)
  end,
}

pizhuan:addEffect(fk.CardUsing, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(pizhuan.name) and data.card.suit == Card.Spade and
      #player:getPile("caiyong_book") < 4 + player:getMark("pizhuan_extra")
  end,
  on_use = spec.on_use,
})

pizhuan:addEffect(fk.TargetConfirmed, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(pizhuan.name) and
      data.card.suit == Card.Spade and data.from ~= player and
      #player:getPile("caiyong_book") < 4 + player:getMark("pizhuan_extra")
  end,
  on_use = spec.on_use,
})

pizhuan:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(pizhuan.name) then
      return #player:getPile("caiyong_book")
    end
  end,
})

return pizhuan
