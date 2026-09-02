local mouLieren = fk.CreateSkill({
  name = "mou__lieren",
})

Fk:loadTranslationTable{
  ["mou__lieren"] = "烈刃",
  [":mou__lieren"] = "当你使用【杀】指定一名其他角色为唯一目标后，你可以与其拼点。"..
  "若你赢，此【杀】结算结束后，你可对另一名其他角色造成1点伤害。",

  ["#mou__lieren-invoke"] = "烈刃：你可与%dest拼点",
  ["#mou__lieren_delay"] = "烈刃",
  ["#mou__lieren-choose"] = "烈刃：可选择一名角色，对其造成1点伤害",

  ["$mou__lieren1"] = "哼！可知本夫人厉害？",
  ["$mou__lieren2"] = "我的飞刀，谁敢小瞧？",
}

mouLieren:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouLieren.name) and
      data.card.trueName == "slash" and
      data.to ~= player and
      data:isOnlyTarget(data.to) and
      data.to:isAlive() and
      player:canPindian(data.to)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, { skill_name = mouLieren.name, prompt = "#mou__lieren-invoke::" .. data.to.id })
  end,
  on_use = function(self, event, _, player, data)
    ---@type string
    local skillName = mouLieren.name
    local target = data.to
    if not (player:isAlive() and target:isAlive() and player:canPindian(data.to)) then
      return false
    end

    local pindian = player:pindian({ target }, skillName)
    if pindian.results[data.to].winner == player then
      data.extra_data = data.extra_data or {}
      local mou__lieren_record = data.extra_data.mou__lieren_record or {}
      table.insert(mou__lieren_record, player.id)
      data.extra_data.mou__lieren_record = mou__lieren_record
    end
  end,
})

mouLieren:addEffect(fk.CardUseFinished, {
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return
      not player.dead and
      data.extra_data and
      data.extra_data.mou__lieren_record and
      table.contains(data.extra_data.mou__lieren_record, player.id)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouLieren.name
    local room = player.room
    local tos = data.tos
    local targets = table.filter(room.alive_players, function(p)
      return p ~= player and not table.contains(tos, p)
    end)
    targets = room:askToChoosePlayers(
      player,
      {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#mou__lieren-choose",
        skill_name = skillName,
        cancelable = true
      }
    )
    if #targets > 0 then
      room:damage{
        from = player,
        to = targets[1],
        damage = 1,
        skillName = skillName,
      }
    end
  end,
})

return mouLieren
