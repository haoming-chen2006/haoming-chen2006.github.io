local fuzhen = fk.CreateSkill {
  name = "fuzhen",
}

Fk:loadTranslationTable{
  ["fuzhen"] = "覆阵",
  [":fuzhen"] = "准备阶段，你可以失去1点体力，视为使用一张无距离限制的雷【杀】，此【杀】可以额外指定至多两个目标，你秘密选择其中一名目标角色。"..
  "此【杀】结算后，你摸造成伤害值的牌；若未对你秘密选择的角色造成伤害，你再视为对这些角色使用一张雷【杀】。",

  ["#fuzhen-invoke"] = "覆阵：你可以失去1点体力，视为使用无距离限制的雷【杀】",
  ["#fuzhen-choose"] = "覆阵：你可以为此雷【杀】增加至多两个目标",
  ["#fuzhen-secret"] = "覆阵：秘密选择一名目标角色，若未对其造成伤害，再视为对这些角色使用雷【杀】！",
}

fuzhen:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fuzhen.name) and player.phase == Player.Start and #player.room.alive_players > 1
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local use = room:askToUseVirtualCard(player, {
      name = "thunder__slash",
      skill_name = fuzhen.name,
      prompt = "#fuzhen-invoke",
      cancelable = true,
      extra_data = {
        bypass_distances = true,
        bypass_times = true,
        extraUse = true,
      },
      skip = true,
    })
    if use then
      event:setCostData(self, {extra_data = use})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local use = event:getCostData(self).extra_data
    local targets = UseCardData:new(use):getExtraTargets({bypass_distances = true})
    if #targets > 0 then
      local tos = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 2,
        prompt = "#fuzhen-choose",
        skill_name = fuzhen.name,
        cancelable = true,
        no_indicate = true,
      })
      if #tos > 0 then
        for _, p in ipairs(tos) do
          table.insert(use.tos, p)
        end
      end
    end
    room:sortByAction(use.tos)
    local to = room:askToChoosePlayers(player, {
      targets = use.tos,
      min_num = 1,
      max_num = 1,
      prompt = "#fuzhen-secret",
      skill_name = fuzhen.name,
      cancelable = false,
      no_indicate = true,
    })[1]
    room:loseHp(player, 1, fuzhen.name)
    room:useCard(use)
    if player.dead then return end
    if use.damageDealt then
      local n = 0
      for _, p in ipairs(room.players) do
        if use.damageDealt[p] then
          n = n + use.damageDealt[p]
        end
      end
      player:drawCards(n, fuzhen.name)
    end
    if not use.damageDealt or not use.damageDealt[to] then
      targets = table.filter(use.tos, function (p)
        return not p.dead
      end)
      if #targets > 0 then
        room:useVirtualCard("thunder__slash", nil, player, targets, fuzhen.name, true)
      end
    end
  end,
})

return fuzhen
