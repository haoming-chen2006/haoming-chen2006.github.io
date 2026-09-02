local jiefan = fk.CreateSkill {
  name = "nos__jiefan",
}

Fk:loadTranslationTable{
  ["nos__jiefan"] = "解烦",
  [":nos__jiefan"] = "你的回合外，当一名角色处于濒死状态时，你可以对当前回合角色使用一张【杀】，此【杀】造成伤害时，你防止此伤害，"..
  "视为对该濒死角色使用了一张【桃】。",

  ["#nos__jiefan-slash"] = "解烦：你可以对 %dest 使用【杀】，若造成伤害，防止此伤害并视为对 %src 使用【桃】",

  ["$nos__jiefan1"] = "休想趁人之危！",
  ["$nos__jiefan2"] = "退后，这里交给我！",
}

jiefan:addEffect(fk.AskForPeaches, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jiefan.name) and target.dying and player.room.current ~= player and not player.room.current.dead
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local use = room:askToUseCard(player, {
      skill_name = jiefan.name,
      pattern = "slash",
      prompt = "#nos__jiefan-slash:"..target.id..":"..room.current.id,
      extra_data = {
        bypass_times = true,
        must_targets = {room.current.id},
      },
    })
    if use then
      player:broadcastSkillInvoke(jiefan.name)
      room:notifySkillInvoked(player, jiefan.name, "support")
      use.extra_data = use.extra_data or {}
      use.extra_data.jiefan = {player.id, target.id}
      room:useCard(use)
    end
  end,
})

jiefan:addEffect(fk.DetermineDamageCaused, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and data.card then
      local e = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if e then
        local use = e.data
        return use.extra_data and use.extra_data.jiefan and use.extra_data.jiefan[1] == player.id
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data:preventDamage()
    local e = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    if e then
      local use = e.data
      local to = room:getPlayerById(use.extra_data.jiefan[2])
      if not to.dead then
        room:useVirtualCard("peach", nil, player, to, jiefan.name)
      end
    end
  end,
})

return jiefan
