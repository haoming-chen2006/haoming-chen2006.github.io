local tiaoxin = fk.CreateSkill {
  name = "tiaoxin",
}

Fk:loadTranslationTable{
  ["tiaoxin"] = "挑衅",
  [":tiaoxin"] = "出牌阶段限一次，你可以指定一名你在其攻击范围内的角色，其需包括你在内的角色使用一张【杀】，否则你弃置其一张牌。",

  ["#tiaoxin"] = "挑衅：令一名角色对你使用一张【杀】，否则你弃置其一张牌",
  ["#tiaoxin-use"] = "挑衅：对 %src 使用一张【杀】，否则其弃置你一张牌",

  ["$tiaoxin1"] = "汝等小儿，可敢杀我？",
  ["$tiaoxin2"] = "贼将早降，可免一死。",
}

tiaoxin:addEffect("active", {
  anim_type = "control",
  max_phase_use_time = 1,
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(tiaoxin.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select:inMyAttackRange(player)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local use = room:askToUseCard(target, {
      skill_name = tiaoxin.name,
      pattern = "slash",
      prompt = "#tiaoxin-use:"..player.id,
      extra_data = {
        exclusive_targets = {player.id},
        bypass_times = true,
      }
    })
    if use then
      use.extraUse = true
      room:useCard(use)
    else
      if not target:isNude() then
        local card = room:askToChooseCard(player, {
          target = target,
          skill_name = tiaoxin.name,
          flag = "he",
        })
        room:throwCard(card, tiaoxin.name, target, player)
      end
    end
  end,
})

return tiaoxin
