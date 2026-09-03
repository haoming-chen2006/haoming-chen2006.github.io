local chengbian = fk.CreateSkill {
  name = "chengbian",
}

Fk:loadTranslationTable{
  ["chengbian"] = "乘变",
  [":chengbian"] = "准备阶段和结束阶段，你可以与一名角色<a href='delayedPindian'>延时拼点</a>并视为对其使用一张【决斗】，"..
  "结算中双方可以将至少一半手牌当一张【杀】打出。结算后公开拼点结果，拼点赢的角色将手牌摸至体力上限。",

  ["delayedPindian"] = "<b>延时拼点：</b><br>拼点牌亮出前，不立刻公布结果，将拼点牌扣置并移出游戏。此回合结束后，若仍未满足公开结果条件，"..
  "将这些拼点牌置入弃牌堆，且不执行后续拼点流程和时机。",

  ["#chengbian-choose"] = "乘变：你可以与一名角色延时拼点，视为对其使用【决斗】，拼点赢的角色摸牌至体力上限",
}

local U = require "packages.utility.utility"

chengbian:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player == target and player:hasSkill(chengbian.name) and
      (player.phase == Player.Start or player.phase == Player.Finish) and
      table.find(player.room.alive_players, function (p)
        return player:canPindian(p)
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return player:canPindian(p)
    end)
    local to = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = 1,
      prompt = "#chengbian-choose",
      skill_name = chengbian.name,
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local pindian = U.delayedPindian(player, {to}, chengbian.name)
    if player.dead or to.dead then
      room.logic:getCurrentEvent():findParent(GameEvent.Turn):addCleaner(function()
        U.delayedPindianCleaner(pindian)
      end)
      return
    end
    room:handleAddLoseSkills(player, "chengbian_viewas&", nil, false)
    room:handleAddLoseSkills(to, "chengbian_viewas&", nil, false)
    local use = room:useVirtualCard("duel", nil, player, to, chengbian.name)
    room:handleAddLoseSkills(player, "-chengbian_viewas&", nil, false)
    room:handleAddLoseSkills(to, "-chengbian_viewas&", nil, false)
    if use == nil then
      room.logic:getCurrentEvent():findParent(GameEvent.Turn):addCleaner(function()
        U.delayedPindianCleaner(pindian)
      end)
      return
    end
    pindian = U.delayedPindianDisplay(pindian)
    U.delayedPindianCleaner(pindian)
    local winner = pindian.results[to].winner
    if winner and not winner.dead and winner:getHandcardNum() < winner.maxHp then
      winner:drawCards(winner.maxHp - winner:getHandcardNum(), chengbian.name)
    end
  end,
})

return chengbian
