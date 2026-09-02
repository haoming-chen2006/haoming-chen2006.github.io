local xuanfeng = fk.CreateSkill {
  name = "nos__xuanfeng"
}

Fk:loadTranslationTable{
  ["nos__xuanfeng"] = "旋风",
  [":nos__xuanfeng"] = "当你失去装备区内的牌后，你可以选择一项：1.视为使用一张【杀】（无距离次数限制）；2.对距离1的一名其他角色造成1点伤害。",

  ["#nos__xuanfeng-invoke"] = "旋风：视为使用一张【杀】，或对距离1的一名角色造成1点伤害",
  ["nos__xuanfeng_slash"] = "视为使用【杀】",
  ["nos__xuanfeng_damage"] = "造成1点伤害",

  ["$nos__xuanfeng1"] = "伤敌于千里之外！",
  ["$nos__xuanfeng2"] = "索命于须臾之间！",
}

xuanfeng:addEffect(fk.AfterCardsMove, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(xuanfeng.name) then
      local yes = false
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerEquip then
              yes =  true
            end
          end
        end
      end
      return yes and table.find(player.room:getOtherPlayers(player, false), function (p)
        return player:distanceTo(p) == 1 or player:canUseTo(Fk:cloneCard("slash"), p, {bypass_distances = true, bypass_times = true})
      end)
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "nos__xuanfeng_active",
      prompt = "#nos__xuanfeng-invoke",
      cancelable = true,
    })
    if success and dat then
      event:setCostData(self, {tos = dat.targets, choice = dat.interaction})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos
    local choice = event:getCostData(self).choice
    if choice == "nos__xuanfeng_slash" then
      room:useVirtualCard("slash", nil, player, tos, xuanfeng.name, true)
    else
      room:damage{
        from = player,
        to = tos[1],
        damage = 1,
        skillName = xuanfeng.name,
      }
    end
  end,
})

return xuanfeng