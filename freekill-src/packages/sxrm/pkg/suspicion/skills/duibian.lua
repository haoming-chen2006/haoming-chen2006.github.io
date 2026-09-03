local duibian = fk.CreateSkill {
  name = "duibian",
}

Fk:loadTranslationTable{
  ["duibian"] = "对辩",
  [":duibian"] = "当你每回合首次受到伤害时，你可以与伤害来源<a href='delayedPindian'>延时拼点</a>并防止此伤害，然后其可以令你弃置其一张牌"..
  "并公开拼点结果：若其赢，你失去1点体力。",

  ["#duibian-invoke"] = "对辩：与 %dest 延时拼点并防止你受到的伤害，其可以令你弃置其一张牌公开结果，若其赢则你失去体力",
  ["#duibian-show"] = "对辩：是否令 %src 弃置你一张牌并公开拼点结果？若你赢则其失去体力",
  ["#duibian-discard"] = "对辩：弃置 %dest 一张牌",
}

local U = require "packages.utility.utility"

duibian:addEffect(fk.DamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(duibian.name) and
      #player.room.logic:getActualDamageEvents(1, function (e)
        return e.data.to == player
      end, Player.HistoryTurn) == 0 and
      player:usedSkillTimes(duibian.name, Player.HistoryTurn) == 0 and
      data.from and player:canPindian(data.from)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = duibian.name,
      prompt = "#duibian-invoke::"..data.from.id,
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data:preventDamage()
    local to = data.from
    local pindian = U.delayedPindian(player, {to}, duibian.name)
    if player.dead or to == nil or to.dead or to:isNude() then
      room.logic:getCurrentEvent():findParent(GameEvent.Turn):addCleaner(function()
        U.delayedPindianCleaner(pindian)
      end)
      return
    end
    if room:askToSkillInvoke(to, {
      skill_name = duibian.name,
      prompt = "#duibian-show:"..player.id,
    }) then
      local card = room:askToChooseCard(player, {
        target = to,
        flag = "he",
        skill_name = duibian.name,
        prompt = "#duibian-discard::"..to.id,
      })
      room:throwCard(card, duibian.name, to, player)
      pindian = U.delayedPindianDisplay(pindian)
      U.delayedPindianCleaner(pindian)
      if pindian.results[to].winner == to and not player.dead then
        room:loseHp(player, 1, duibian.name)
      end
    else
      room.logic:getCurrentEvent():findParent(GameEvent.Turn):addCleaner(function()
        U.delayedPindianCleaner(pindian)
      end)
    end
  end,
})

return duibian
