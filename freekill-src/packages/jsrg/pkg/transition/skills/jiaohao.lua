local jiaohao = fk.CreateSkill {
  name = "jiaohao",
  attached_skill_name = "jiaohao&",
}

Fk:loadTranslationTable{
  ["jiaohao"] = "骄豪",
  [":jiaohao"] = "其他角色出牌阶段限一次，其可以将手牌中的一张装备牌置于你的装备区中；准备阶段，你获得X张【影】（X为你空置的装备栏数的一半，向上取整）。",

  ["$jiaohao1"] = "桃花马、请长缨，将军何必是丈夫。",
  ["$jiaohao2"] = "本夫人处事，何须犬马置喙？",
}

local U = require "packages.utility.utility"

jiaohao:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jiaohao.name) and player.phase == Player.Start and
      #player:getCardIds("e") < #player:getAvailableEquipSlots()
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local num = (#player:getAvailableEquipSlots() - #player:getCardIds("e") + 1) // 2
    room:moveCards({
      ids = U.getShade(room, num),
      to = player,
      toArea = Card.PlayerHand,
      moveReason = fk.ReasonJustMove,
      proposer = player,
      skill_name = jiaohao.name,
      moveVisible = true,
    })
  end
})

return jiaohao
