local fencheng = fk.CreateSkill {
  name = "nos__fencheng",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["nos__fencheng"] = "焚城",
  [":nos__fencheng"] = "限定技，出牌阶段，你可以令所有其他角色依次选择一项：弃置X张牌，或受到1点火焰伤害。（X为该角色装备区里牌的数量且至少为1）",

  ["#nos__fencheng"] = "焚城：令所有其他角色选择弃牌或你对其造成火焰伤害！",
  ["#nos__fencheng-discard"] = "焚城：你需弃置%arg张牌，否则受到1点火焰伤害",

  ["$nos__fencheng1"] = "我要这满城的人都来给你陪葬。",
  ["$nos__fencheng2"] = "一把火烧他个精光吧！诶啊哈哈哈哈哈~",
}

fencheng:addEffect("active", {
  anim_type = "offensive",
  prompt = "#nos__fencheng",
  card_num = 0,
  target_num = 0,
  card_filter = Util.FalseFunc,
  can_use = function(self, player)
    return player:usedSkillTimes(fencheng.name, Player.HistoryGame) == 0
  end,
  on_cost = function(self, player, data)
    return { tos = player.room:getOtherPlayers(player) }
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local targets = room:getOtherPlayers(player)
    for _, target in ipairs(targets) do
      if not target.dead then
        local n = math.max(1, #target:getCardIds("e"))
        local cards = room:askToDiscard(target, {
          min_num = n,
          max_num = n,
          include_equip = true,
          skill_name = fencheng.name,
          cancelable = true,
          prompt = "#nos__fencheng-discard:::"..n,
        })
        if #cards == 0 then
          room:damage{
            from = player,
            to = target,
            damage = 1,
            damageType = fk.FireDamage,
            skillName = fencheng.name,
          }
        end
      end
    end
  end,
})

return fencheng
