local zhuikong = fk.CreateSkill {
  name = "nos__zhuikong",
}

Fk:loadTranslationTable{
  ["nos__zhuikong"] = "惴恐",
  [":nos__zhuikong"] = "一名角色回合开始时，若你已受伤，你可以与其一次拼点。若你赢，该角色跳过本回合的出牌阶段；若你没赢，"..
  "该角色与你距离视为1直到回合结束。",

  ["#nos__zhuikong-invoke"] = "惴恐：你可以与 %dest 拼点，若赢则其本回合跳过出牌阶段",

  ["$nos__zhuikong1"] = "此密信，切勿落入曹贼手中。",
  ["$nos__zhuikong2"] = "此密诏一出，安知是福是祸？",
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
      prompt = "#nos__zhuikong-invoke::"..target.id,
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local pindian = player:pindian({target}, zhuikong.name)
    if pindian.results[target].winner == player then
      target:skip(Player.Play)
    elseif not target.dead then
      room:addTableMark(target, "nos__zhuikong-turn", player.id)
    end
  end,
})

zhuikong:addEffect("distance", {
  fixed_func = function(self, from, to)
    if table.contains(from:getTableMark("nos__zhuikong-turn"), to.id) then
      return 1
    end
  end,
})

return zhuikong
