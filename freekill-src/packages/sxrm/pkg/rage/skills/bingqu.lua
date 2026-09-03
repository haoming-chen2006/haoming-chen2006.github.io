
local bingqu = fk.CreateSkill{
  name = "bingqu",
}

Fk:loadTranslationTable{
  ["bingqu"] = "并驱",
  [":bingqu"] = "准备阶段，你可以与一名其他角色各声明一种普通锦囊牌，然后双方依次将半数手牌（向上取整）当对方声明的牌使用。",

  ["#bingqu-choose"] = "并驱：与一名角色各声明一种普通锦囊牌，双方将一半手牌当对方声明的牌使用",
  ["#bingqu-choice"] = "并驱：声明一种普通锦囊牌，双方将一半手牌当对方声明的牌使用",
  ["#bingqu-use"] = "并驱：请将%arg张手牌当【%arg2】使用",
}

bingqu:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(bingqu.name) and player.phase == Player.Start and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      skill_name = bingqu.name,
      prompt = "#bingqu-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, { tos = to })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local result = room:askToJointChoice(player, {
      players = { player, to },
      choices = Fk:getAllCardNames("t"),
      skill_name = bingqu.name,
      prompt = "#bingqu-choice",
      send_log = true,
    })
    if not player:isKongcheng() then
      local n = (player:getHandcardNum() + 1) // 2
      room:askToUseVirtualCard(player, {
        name = result[to],
        skill_name = bingqu.name,
        prompt = "#bingqu-use:::"..n..":"..result[to],
        cancelable = false,
        card_filter = {
          n = n,
          cards = player:getHandlyIds(),
        },
      })
    end
    if not to:isKongcheng() then
      local n = (to:getHandcardNum() + 1) // 2
      room:askToUseVirtualCard(to, {
        name = result[player],
        skill_name = bingqu.name,
        prompt = "#bingqu-use:::"..n..":"..result[player],
        cancelable = false,
        card_filter = {
          n = n,
          cards = to:getHandlyIds(),
        },
      })
    end
  end,
})

return bingqu
