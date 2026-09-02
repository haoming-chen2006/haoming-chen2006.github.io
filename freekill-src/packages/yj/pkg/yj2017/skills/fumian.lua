
local fumian = fk.CreateSkill {
  name = "fumian",
}

Fk:loadTranslationTable{
  ["fumian"] = "福绵",
  [":fumian"] = "准备阶段，你可以选择一项：1.本回合下个摸牌阶段摸牌数+1；2.本回合限一次，当你使用红色牌时，可以令此牌目标数+1。"..
  "若你选择的选项与你上回合选择的选项不同，则本回合该选项数值+1。",

  ["fumian1"] = "摸牌阶段摸牌数+%arg",
  ["fumian2"] = "使用红色牌目标数+%arg",
  ["@fumian1-turn"] = "福绵 摸牌数+",
  ["@fumian2-turn"] = "福绵 目标数+",
  ["#fumian-choose"] = "福绵：你可以为%arg额外指定%arg2个目标",

  ["$fumian1"] = "人言吾吉人天相，福寿绵绵。",
  ["$fumian2"] = "永理二子，当保大汉血脉长存。",
}

fumian:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fumian.name) and player.phase == Player.Start
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choices = { "fumian1:::"..(player:getMark("fumian2-turn") + 1), "fumian2:::"..(player:getMark("fumian1-turn") + 1), "Cancel" }
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = fumian.name
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice[7]
    if choice == "1" then
      room:setPlayerMark(player, "@fumian1-turn", player:getMark("fumian2-turn") + 1)
    else
      room:setPlayerMark(player, "@fumian2-turn", player:getMark("fumian1-turn") + 1)
    end
    room:setPlayerMark(player, "fumian"..choice.."_record", 1)
  end,
})

fumian:addEffect(fk.TurnStart, {
  can_refresh = function (self, event, target, player, data)
    return target == player and player:getMark("fumian1_record") + player:getMark("fumian2_record") > 0
  end,
  on_refresh = function (self, event, target, player, data)
    local room = player.room
    for i = 1, 2 do
      if player:getMark("fumian"..i.."_record") > 0 then
        room:setPlayerMark(player, "fumian"..i.."_record", 0)
        room:setPlayerMark(player, "fumian"..i.."-turn", 1)
      end
    end
  end,
})

fumian:addEffect(fk.DrawNCards, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@fumian1-turn") > 0
  end,
  on_use = function(self, event, target, player, data)
    data.n = data.n + player:getMark("@fumian1-turn")
    player.room:setPlayerMark(player, "@fumian1-turn", 0)
  end,
})

fumian:addEffect(fk.AfterCardTargetDeclared, {
  anim_type = "control",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@fumian2-turn") > 0 and data.card.color == Card.Red and
      #data:getExtraTargets() > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(player, {
      skill_name = fumian.name,
      min_num = 1,
      max_num = player:getMark("@fumian2-turn"),
      targets = data:getExtraTargets(),
      prompt = "#fumian-choose:::"..data.card:toLogString()..":"..player:getMark("@fumian2-turn"),
      cancelable = true,
    })
    if #tos > 0 then
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@fumian2-turn", 0)
    for _, p in ipairs(event:getCostData(self).tos) do
      data:addTarget(p)
    end
  end,
})

return fumian
