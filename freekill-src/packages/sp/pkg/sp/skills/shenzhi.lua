local shenzhi = fk.CreateSkill {
  name = "sp__shenzhi",
}

Fk:loadTranslationTable{
  ["sp__shenzhi"] = "神智",
  [":sp__shenzhi"] = "准备阶段，你可以弃置所有手牌，若你以此法弃置的手牌数不小于X，你回复1点体力（X为你当前的体力值）。",

  ["$sp__shenzhi1"] = "子龙将军，一切都托付给你了。",
  ["$sp__shenzhi2"] = "阿斗，相信妈妈，没事的。",
}

shenzhi:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shenzhi.name) and player.phase == Player.Start and
      table.find(player:getCardIds("h"), function(id)
        return not player:prohibitDiscard(id)
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = table.filter(player:getCardIds("h"), function(id)
      return not player:prohibitDiscard(id)
    end)
    room:throwCard(cards, shenzhi.name, player, player)
    if player:isWounded() and not player.dead and #cards >= player.hp then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = shenzhi.name,
      }
    end
  end,
})

return shenzhi
