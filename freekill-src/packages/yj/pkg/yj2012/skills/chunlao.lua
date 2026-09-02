local chunlao = fk.CreateSkill {
  name = "chunlao",
  derived_piles = "chengpu_chun",
}

Fk:loadTranslationTable{
  ["chunlao"] = "醇醪",
  [":chunlao"] = "结束阶段，若你的武将牌上没有牌，你可以将任意数量的【杀】置于你的武将牌上，称为“醇”；当一名角色处于濒死状态时，"..
  "你可以将一张“醇”置入弃牌堆，视为其使用一张【酒】。",

  ["chengpu_chun"] = "醇",
  ["#chunlao-ask"] = "醇醪：你可以将任意张【杀】置为“醇”",
  ["#chunlao-invoke"] = "醇醪：你可以将一张“醇”置入弃牌堆，视为 %dest 使用一张【酒】",

  ["$chunlao1"] = "唉，帐中不可无酒啊！",
  ["$chunlao2"] = "无碍，且饮一杯！",
}

chunlao:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(chunlao.name) and player.phase == Player.Finish and
      #player:getPile("chengpu_chun") == 0 and not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToCards(player, {
      skill_name = chunlao.name,
      min_num = 1,
      max_num = player:getHandcardNum(),
      pattern = "slash",
      prompt = "#chunlao-ask",
    })
    if #cards > 0 then
      event:setCostData(self, {cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local cards = event:getCostData(self).cards
    player:addToPile("chengpu_chun", cards, true, chunlao.name)
  end,
})

chunlao:addEffect(fk.AskForPeaches, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(chunlao.name) and #player:getPile("chengpu_chun") > 0 and
      target.dying and target:canUseTo(Fk:cloneCard("analeptic"), target)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToCards(player, {
      skill_name = chunlao.name,
      min_num = 1,
      max_num = 1,
      pattern = ".|.|.|chengpu_chun",
      prompt = "#chunlao-invoke::"..target.id,
      expand_pile = "chengpu_chun",
    })
    if #cards > 0 then
      event:setCostData(self, {tos = {target}, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = event:getCostData(self).cards
    room:moveCardTo(cards, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, chunlao.name, nil, true, player)
    if not target.dead then
      local analeptic = Fk:cloneCard("analeptic")
      analeptic.skillName = chunlao.name
      if target:canUseTo(analeptic, target) then
        room:useCard({
          from = target,
          tos = {target},
          card = analeptic,
          extra_data = {
            analepticRecover = true,
          },
        })
      end
    end
  end,
})

return chunlao
