local yansha = fk.CreateSkill {
  name = "yansha",
}

Fk:loadTranslationTable{
  ["yansha"] = "宴杀",
  [":yansha"] = "出牌阶段限一次，你可以视为使用一张以任意名角色为目标的【五谷丰登】，然后所有非目标角色依次可以将一张装备牌"..
  "当无距离限制的【杀】对其中一名目标角色使用。",

  ["#yansha"] = "宴杀：视为使用指定任意目标的【五谷丰登】，然后非目标角色可以将装备当【杀】对目标使用",
  ["#yansha-slash"] = "宴杀：你可以将一张装备牌当【杀】对其中一名角色使用",
}

yansha:addEffect("active", {
  anim_type = "control",
  prompt = "#yansha",
  card_num = 0,
  min_target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(yansha.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return player:canUseTo(Fk:cloneCard("amazing_grace"), to_select)
  end,
  on_use = function(self, room, effect)
    local use = room:useVirtualCard("amazing_grace", nil, effect.from, effect.tos, yansha.name)
    if use == nil then return end
    local targets = table.filter(use.tos, function (p)
      return not p.dead
    end)
    if #targets > 0 then
      for _, p in ipairs(room:getAlivePlayers()) do
        if not p.dead and not table.contains(targets, p) then
          room:askToUseVirtualCard(p, {
            name = "slash",
            skill_name = yansha.name,
            prompt = "#yansha-slash",
            cancelable = true,
            extra_data = {
              bypass_distances = true,
              bypass_times = true,
              extraUse = true,
              exclusive_targets = table.map(use.tos, Util.IdMapper),
            },
            card_filter = {
              n = 1,
              pattern = ".|.|.|.|.|equip",
            }
          })
        end
      end
    end
  end,
})

return yansha
