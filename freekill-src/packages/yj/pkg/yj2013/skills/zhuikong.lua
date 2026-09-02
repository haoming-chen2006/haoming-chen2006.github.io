local zhuikong = fk.CreateSkill {
  name = "zhuikong",
}

Fk:loadTranslationTable{
  ["zhuikong"] = "惴恐",
  [":zhuikong"] = "一名角色回合开始时，若你已受伤，你可以与其拼点，若你赢，该角色本回合使用牌不能指定除其以外的角色为目标；"..
  "若你没赢，该角色与你距离视为1直到回合结束。",

  ["#zhuikong-invoke"] = "惴恐：你可以与 %dest 拼点，若赢则其本回合使用牌只能指定自己为目标",

  ["$zhuikong1"] = "诚惶诚恐，夜不能寐。",
  ["$zhuikong2"] = "嘘，隔墙有耳。",
}

zhuikong:addEffect(fk.TurnStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(zhuikong.name) and target ~= player and not target.dead and
      player:isWounded() and player:canPindian(target)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = zhuikong.name,
      prompt = "#zhuikong-invoke::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local pindian = player:pindian({target}, zhuikong.name)
    if target.dead then return end
    if pindian.results[target].winner == player then
      room:setPlayerMark(target, "zhuikong_prohibit-turn", 1)
    elseif not target.dead then
      room:addTableMark(target, "zhuikong-turn", player.id)
    end
  end,
})

zhuikong:addEffect("prohibit", {
  name = "#zhuikong_prohibit",
  is_prohibited = function(self, from, to, card)
    return from and from:getMark("zhuikong_prohibit-turn") > 0 and from ~= to
  end,
})

zhuikong:addEffect("distance", {
  fixed_func = function(self, from, to)
    if table.contains(from:getTableMark("zhuikong-turn"), to.id) then
      return 1
    end
  end,
})

return zhuikong
