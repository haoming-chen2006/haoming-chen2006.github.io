local zhanhuo = fk.CreateSkill {
  name = "zhanhuo",
  tags = {Skill.Limited},
}

Fk:loadTranslationTable{
  ["zhanhuo"] = "绽火",
  [":zhanhuo"] = "限定技，出牌阶段，你可以弃全部“军略”，令至多等量的处于连环状态的角色弃置所有装备区里的牌，然后对其中一名角色造成1点火焰伤害。",

  ["#zhanhuo"] = "绽火：弃置全部“军略”，选择至多等量连环状态的角色弃置所有装备，然后对其中一名角色造成1点火焰伤害",
  ["#zhanhuo-damage"] = "绽火：对其中一名角色造成1点火焰伤害",

  ["$zhanhuo1"] = "业火映东水，吴志绽敌营！",
  ["$zhanhuo2"] = "绽东吴业火，烧敌军数千！",
}

zhanhuo:addEffect("active", {
  anim_type = "offensive",
  prompt = "#zhanhuo",
  min_target_num = 1,
  max_target_num = function(self, player)
    return player:getMark("@junlue")
  end,
  card_num = 0,
  card_filter = Util.FalseFunc,
  can_use = function(self, player)
    return player:usedSkillTimes(zhanhuo.name, Player.HistoryGame) == 0 and player:getMark("@junlue") > 0
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected < player:getMark("@junlue") and to_select.chained
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:setPlayerMark(player, "@junlue", 0)
    room:sortByAction(effect.tos)
    for _, p in ipairs(effect.tos) do
      if not p.dead then
        p:throwAllCards("e")
      end
    end
    if player.dead then return end
    local targets = table.filter(effect.tos, function (p)
      return not p.dead
    end)
    if #targets > 0 then
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = zhanhuo.name,
        prompt = "#zhanhuo-damage",
        cancelable = false,
      })
      room:damage {
        from = player,
        to = to[1],
        damage = 1,
        damageType = fk.FireDamage,
        skillName = zhanhuo.name,
      }
    end
  end,
})

return zhanhuo
