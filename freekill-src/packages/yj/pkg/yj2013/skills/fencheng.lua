local fencheng = fk.CreateSkill {
  name = "fencheng",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["fencheng"] = "焚城",
  [":fencheng"] = "限定技，出牌阶段，你可以令所有其他角色依次选择一项：1.弃置至少X+1张牌（X为该角色的上家以此法弃置牌的数量）；"..
  "2.受到你造成的2点火焰伤害。",

  ["#fencheng"] = "焚城：令所有其他角色选择弃牌或你对其造成2点火焰伤害！",
  ["#fencheng-discard"] = "焚城：弃置至少%arg张牌，否则受到2点火焰伤害",

  ["$fencheng1"] = "我得不到的，你们也别想得到！",
  ["$fencheng2"] = "让这一切都灰飞烟灭吧！哼哼哼哼……",
}

fencheng:addEffect("active", {
  anim_type = "offensive",
  prompt = "#fencheng",
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
    local n = 0
    for _, target in ipairs(targets) do
      if not target.dead then
        local cards = room:askToDiscard(target, {
          min_num = n + 1,
          max_num = 999,
          include_equip = true,
          skill_name = fencheng.name,
          cancelable = true,
          prompt = "#fencheng-discard:::"..(n + 1),
        })
        if #cards == 0 then
          room:damage{
            from = player,
            to = target,
            damage = 2,
            damageType = fk.FireDamage,
            skillName = fencheng.name,
          }
          n = 0
        else
          n = #cards
        end
      end
    end
  end,
})

return fencheng
