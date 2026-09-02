local weizhui = fk.CreateSkill {
  name = "weizhui",
  tags = { Skill.Lord },
}

Fk:loadTranslationTable{
  ["weizhui"] = "危坠",
  [":weizhui"] = "主公技，其他魏势力角色的结束阶段，其可以将一张黑色牌当【过河拆桥】对你使用。",

  ["#weizhui-use"] = "危坠：你可以将一张黑色牌当【过河拆桥】对 %src 使用",

  ["$weizhui1"] = "大魏高楼百尺，竟无一栋梁。",
  ["$weizhui2"] = "高飞入危云，簌簌兮如坠。",
}

weizhui:addEffect(fk.EventPhaseStart, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return player ~= target and player:hasSkill(weizhui.name) and target.phase == Player.Finish and not target.dead and
      target.kingdom == "wei" and not player:isAllNude() and not (target:isNude() and #target:getHandlyIds() == 0)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local use = room:askToUseVirtualCard(target, {
      name = "dismantlement",
      skill_name = weizhui.name,
      prompt = "#weizhui-use:"..player.id,
      cancelable = true,
      extra_data = {
        exclusive_targets = {player.id},
      },
      card_filter = {
        n = 1,
        pattern = ".|.|spade,club",
      },
      skip = true,
    })
    if use then
      event:setCostData(self, {extra_data = use})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:useCard(event:getCostData(self).extra_data)
  end,
})

return weizhui
