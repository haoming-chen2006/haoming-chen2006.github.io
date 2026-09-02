local huangtian = fk.CreateSkill({
  name = "huangtian",
  tags = { Skill.Lord },
  attached_skill_name = "huangtian_active&",
})

Fk:loadTranslationTable{
  ["huangtian"] = "黄天",
  [":huangtian"] = "主公技，其他群势力角色的出牌阶段限一次，其可将一张【闪】或【闪电】（正面朝上移动）交给你。",

  ["huangtian_other&"] = "黄天",
  [":huangtian_other&"] = "出牌阶段限一次，你可将一张【闪】或【闪电】（正面朝上移动）交给张角。",
  ["#huangtian-active"] = "发动黄天，选择一张【闪】或【闪电】交给一名拥有“黄天”的角色",

  ["$huangtian1"] = "苍天已死，黄天当立！",
  ["$huangtian2"] = "岁在甲子，天下大吉！",
}

huangtian:addAcquireEffect(function (self, player)
  local room = player.room
  for _, p in ipairs(room:getOtherPlayers(player, false)) do
    if p.kingdom == "qun" then
      room:handleAddLoseSkills(p, "huangtian_active&", nil, false, true)
    else
      room:handleAddLoseSkills(p, "-huangtian_active&", nil, false, true)
    end
  end
end)

huangtian:addEffect(fk.AfterPropertyChange, {
  can_refresh = function(self, event, target, player, data)
    return target == player
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    if player.kingdom == "qun" and table.find(room.alive_players, function (p)
      return p ~= player and p:hasSkill(huangtian.name, true)
    end) then
      room:handleAddLoseSkills(player, "huangtian_active&", nil, false, true)
    else
      room:handleAddLoseSkills(player, "-huangtian_active&", nil, false, true)
    end
  end,
})

return huangtian
