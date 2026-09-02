local qixing = fk.CreateSkill {
  name = "qixing",
  derived_piles = "$star",
}

Fk:loadTranslationTable{
  ["qixing"] = "七星",
  [":qixing"] = "游戏开始时，你将牌堆顶的七张牌扣置于武将牌上，称为“星”，然后你可以用任意张手牌替换等量的“星”；摸牌阶段结束时，"..
  "你可以用任意张手牌替换等量的“星”。",

  ["$star"] = "星",
  ["#qixing-exchange"] = "七星：你可以用任意张手牌替换等量的“星”",

  ["$qixing1"] = "祈星辰之力，佑我蜀汉！",
  ["$qixing2"] = "伏望天恩，誓讨汉贼！",
}

local function QixingArrange(player)
  local room = player.room
  local cids = room:askToArrangeCards(player, {
    skill_name = qixing.name,
    card_map = {
      player:getPile("$star"), player:getCardIds("h"),
      "$star", "$Hand"
    },
    prompt = "#qixing-exchange",
    free_arrange = true,
  })
  room:swapCardsWithPile(player, cids[1], cids[2], qixing.name, "$star")
end

qixing:addEffect(fk.GameStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(qixing.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:addToPile("$star", room:getNCards(7), false, qixing.name)
    if player.dead or player:isKongcheng() or #player:getPile("$star") == 0 then return end
    QixingArrange(player)
  end,
})
qixing:addEffect(fk.AfterDrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qixing.name) and
      not player:isKongcheng() and #player:getPile("$star") > 0
  end,
  on_use = function(self, event, target, player, data)
    QixingArrange(player)
  end,
})

return qixing
