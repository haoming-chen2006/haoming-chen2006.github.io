local jijiang = fk.CreateSkill({
  name = "mou__jijiang",
  tags = { Skill.Lord },
})

Fk:loadTranslationTable{
  ["mou__jijiang"] = "激将",
  [":mou__jijiang"] = "主公技，出牌阶段结束时，你可以令一名体力值大于等于你的其他蜀势力角色选择一项："..
  "1.视为对你指定的其攻击范围内的一名角色使用一张普通【杀】：2.跳过下一个出牌阶段。",

  ["#mou__jijiang-choose"] = "激将：选择一名蜀势力角色，其需视为对你指定角色使用【杀】或跳过下个出牌阶段",
  ["mou__jijiang_slash"] = "视为对 %src 使用一张【杀】",
  ["mou__jijiang_skip"] = "跳过下一个出牌阶段",
  ["@@mou__jijiang_skip"] = "跳过出牌阶段",

  ["$mou__jijiang1"] = "匡扶汉室，岂能无诸将之助！",
  ["$mou__jijiang2"] = "大汉将士，何人敢战？",
}

jijiang:addAuxActiveSkill("#mou__jijiang_active", {
  card_num = 0,
  target_num = 2,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    if #selected > 1 or to_select == player then return false end
    if #selected == 0 then
      return to_select.kingdom == "shu" and to_select.hp >= player.hp
    else
      return selected[1]:inMyAttackRange(to_select)
    end
  end,
})

jijiang:addEffect(fk.EventPhaseEnd, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jijiang.name) and player.phase == Player.Play and
      #player.room.alive_players > 2 and
      table.find(player.room:getOtherPlayers(player, false), function (p)
        return p.kingdom == "shu" and p.hp >= player.hp
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "#mou__jijiang_active",
      prompt = "#mou__jijiang-choose",
    })
    if success and dat then
      event:setCostData(self, { tos = { dat.targets[1] }, extra_data = { dat.targets[2] } })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local from = event:getCostData(self).tos[1]
    local victim = event:getCostData(self).extra_data
    room:doIndicate(from, { victim })
    local choices = { "mou__jijiang_skip" }
    if not from:prohibitUse(Fk:cloneCard("slash")) and not from:isProhibited(victim, Fk:cloneCard("slash")) then
      table.insert(choices, 1, "mou__jijiang_slash:" .. victim.id)
    end
    if room:askToChoice(from, {
      choices = choices,
      skill_name = jijiang.name,
    }) == "mou__jijiang_skip" then
      room:setPlayerMark(from, "@@mou__jijiang_skip", 1)
    else
      room:useVirtualCard("slash", nil, from, victim, jijiang.name, true)
    end
  end,
})

jijiang:addEffect(fk.EventPhaseChanging, {
  priority = 10,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target:getMark("@@mou__jijiang_skip") > 0 and data.phase == Player.Play
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(target, "@@mou__jijiang_skip", 0)
    data.skipped = true
  end,
})

return jijiang
