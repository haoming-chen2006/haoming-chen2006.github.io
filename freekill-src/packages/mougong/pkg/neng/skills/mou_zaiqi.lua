local mouZaiqi = fk.CreateSkill({
  name = "mou__zaiqi",
  tags = { Skill.Charge },
})

Fk:loadTranslationTable{
  ["mou__zaiqi"] = "再起",
  [":mou__zaiqi"] = "蓄力技（3/7），"..
  "弃牌阶段结束时，你可以消耗任意蓄力点并选择等量的角色，令这些角色依次选择一项：1.令你摸一张牌；2.弃置一张牌，然后你回复1点体力。"..
  "每回合一次，当你造成伤害后，获得1点蓄力点。",

  ["#mou__zaiqi-choose"] = "再起：选择至多%arg名角色，这些角色选择弃牌且你回复体力，或令你摸牌",
  ["#mou__zaiqi-discard"] = "再起：弃置一张牌且 %src 回复1点体力，点“取消”：令 %src 摸一张牌",

  ["$mou__zaiqi1"] = "且败且战，愈战愈勇！",
  ["$mou__zaiqi2"] = "若有来日，必将汝等拿下！",
}

local U = require "packages.utility.utility"

mouZaiqi:addEffect(fk.EventPhaseEnd, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouZaiqi.name) and player.phase == Player.Discard and player:getMark("skill_charge") > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local x = player:getMark("skill_charge")
    local tos = room:askToChoosePlayers(
      player,
      {
        targets = room:getAlivePlayers(false),
        min_num = 1,
        max_num = x,
        prompt = "#mou__zaiqi-choose:::" .. x,
        skill_name = mouZaiqi.name
      }
    )
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouZaiqi.name
    local room = player.room
    local tos = event:getCostData(self).tos
    U.skillCharged(player, -#tos)
    for _, p in ipairs(tos) do
      if player.dead then break end
      if not p.dead then
        if
          not p:isNude() and
          #room:askToDiscard(
            p,
            {
              min_num = 1,
              max_num = 1,
              include_equip = true,
              skill_name = skillName,
              prompt = "#mou__zaiqi-discard:" .. player.id
            }
          ) > 0
        then
          if player:isAlive() and player:isWounded() then
            room:recover({ who = player, num = 1, recoverBy = player, skillName = skillName })
          end
        else
          player:drawCards(1, skillName)
        end
      end
    end
  end,
})

mouZaiqi:addEffect(fk.Damage, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouZaiqi.name) and
      player:getMark("mou__zaiqi-turn") == 0 and
      player:getMark("skill_charge") < player:getMark("skill_charge_max")
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "mou__zaiqi-turn", 1)
    U.skillCharged(player, 1)
  end,
})

mouZaiqi:addAcquireEffect(function (self, player)
  U.skillCharged(player, 3, 7)
end)

mouZaiqi:addLoseEffect(function (self, player)
  U.skillCharged(player, -3, -7)
end)

return mouZaiqi
