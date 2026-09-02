local xiangjia = fk.CreateSkill {
  name = "xiangjia",
}

Fk:loadTranslationTable{
  ["xiangjia"] = "相假",
  [":xiangjia"] = "出牌阶段限一次，若你装备区有武器牌，你可以视为使用一张【借刀杀人】，然后目标角色可以视为对你使用一张【借刀杀人】。",

  ["#xiangjia"] = "相假：视为使用【借刀杀人】，然后目标角色可以视为对你使用【借刀杀人】",
  ["#xiangjia-use"] = "相假：你可以视为对 %dest 使用【借刀杀人】（选择被【杀】的目标）",
}

xiangjia:addEffect("viewas", {
  anim_type = "control",
  prompt = "#xiangjia",
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    if #cards ~= 0 then return end
    local c = Fk:cloneCard("collateral")
    c.skillName = xiangjia.name
    return c
  end,
  after_use = function(self, player, use)
    local room = player.room
    local collateral = Fk:cloneCard("collateral")
    collateral.skillName = xiangjia.name
    for _, p in ipairs(use.tos) do
      if not p.dead and p:canUseTo(collateral, player) then
        local targets = table.filter(room.alive_players, function(to)
          return to ~= player and collateral.skill:targetFilter(to, p, {player}, collateral)
        end)
        if #targets > 0 then
          local subTo = room:askToChoosePlayers(p, {
            targets = targets,
            min_num = 1,
            max_num = 1,
            prompt = "#xiangjia-use::" .. player.id,
            skill_name = xiangjia.name,
            no_indicate = true,
          })
          if #subTo > 0 then
            room:useCard{
              from = p,
              tos = {player},
              card = collateral,
              subTos = {subTo},
            }
          end
        end
      end
    end
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(xiangjia.name, Player.HistoryPhase) == 0 and #player:getEquipments(Card.SubtypeWeapon) > 0
  end,
})

return xiangjia
