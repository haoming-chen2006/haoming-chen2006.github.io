local zhiba = fk.CreateSkill {
  name = "zhiba",
  tags = { Skill.Lord },
  attached_skill_name = "zhiba_active&",
}

Fk:loadTranslationTable{
  ["zhiba"] = "制霸",
  [":zhiba"] = "主公技，其他吴势力角色的出牌阶段限一次，其可以与你拼点（若你发动过〖魂姿〗，你可以拒绝此拼点），若其没赢，你可以获得拼点的两张牌。",

  ["#zhiba-ask"] = "%src 发起“制霸”拼点，是否拒绝？",
  ["zhiba_yes"] = "进行“制霸”拼点",
  ["zhiba_no"] = "拒绝“制霸”拼点",

  ["$zhiba1"] = "是友是敌，一探便知。",
  ["$zhiba2"] = "我若怕你，非孙伯符也！",
}

zhiba:addAcquireEffect(function (self, player)
  local room = player.room
  for _, p in ipairs(room:getOtherPlayers(player, false)) do
    if p.kingdom == "wu" then
      room:handleAddLoseSkills(p, "zhiba_active&", nil, false, true)
    else
      room:handleAddLoseSkills(p, "-zhiba_active&", nil, false, true)
    end
  end
end)

zhiba:addEffect(fk.AfterPropertyChange, {
  can_refresh = function(self, event, target, player, data)
    return target == player
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    if player.kingdom == "wu" and table.find(room.alive_players, function (p)
      return p ~= player and p:hasSkill(zhiba.name, true)
    end) then
      room:handleAddLoseSkills(player, "zhiba_active&", nil, false, true)
    else
      room:handleAddLoseSkills(player, "-zhiba_active&", nil, false, true)
    end
  end,
})

return zhiba
