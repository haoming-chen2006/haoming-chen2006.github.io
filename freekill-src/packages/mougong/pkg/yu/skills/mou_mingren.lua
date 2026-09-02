local mouMingren = fk.CreateSkill({
  name = "mou__mingren",
})

Fk:loadTranslationTable{
  ["mou__mingren"] = "明任",
  [":mou__mingren"] = "①游戏开始时，你摸两张牌，然后将一张手牌置于你的武将牌上，称为“任”；②结束阶段，你可以用任意一张手牌替换“任”。",

  ["mou__duty"] = "任",
  ["#mou__mingren-put"] = "明任：请将一张手牌置于武将牌上",
  ["#mou__mingren-exchange"] = "明任：你可用一张手牌替换“任”（%arg）",

  ["$mou__mingren1"] = "父不爱无益之子，君不蓄无用之臣！",
  ["$mou__mingren2"] = "老夫蒙国重恩，敢不捐躯以报！",
}

mouMingren:addEffect(fk.GameStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouMingren.name)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouMingren.name
    local room = player.room
    player:drawCards(2, skillName)
    if not player:isKongcheng() then
      local cids = room:askToCards(
        player,
        {
          min_num = 1,
          max_num = 1,
          skill_name = skillName,
          cancelable = false,
          prompt = "#mou__mingren-put"
        }
      )
      if #cids > 0 then
        player:addToPile("mou__duty", cids[1], true, skillName)
      end
    end
  end,
})

mouMingren:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouMingren.name) and
      target == player and
      player.phase == Player.Finish and
      not player:isKongcheng() and
      #player:getPile("mou__duty") > 0
  end,
  on_cost = function(self, event, target, player, data)
    local cids = player.room:askToCards(
      player,
      {
        min_num = 1,
        max_num = 1,
        skill_name = mouMingren.name,
        prompt = "#mou__mingren-exchange:::" .. Fk:getCardById(player:getPile("mou__duty")[1]):toLogString()
      }
    )

    if #cids > 0 then
      event:setCostData(self, cids)
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouMingren.name

    player.room:moveCards({
      ids = event:getCostData(self),
      from = player,
      to = player,
      toArea = Player.Special,
      moveReason = fk.ReasonExchange,
      specialName = "mou__duty",
      moveVisible = true,
      skillName = skillName,
      proposer = player,
    }, {
      ids = player:getPile("mou__duty"),
      from = player,
      to = player,
      toArea = Player.Hand,
      moveReason = fk.ReasonExchange,
      moveVisible = true,
      skillName = skillName,
      proposer = player,
    })
  end,
})

return mouMingren
