local mizhao = fk.CreateSkill {
  name = "mizhao",
}

Fk:loadTranslationTable {
  ["mizhao"] = "密诏",
  [":mizhao"] = "出牌阶段限一次，你可以将所有手牌（至少一张）交给一名其他角色。若如此做，你令该角色与你指定的另一名有手牌的其他角色拼点，"..
  "视为拼点赢的角色对没赢的角色使用一张【杀】。",

  ["#mizhao"] = "密诏：将所有手牌交给一名角色，令其与另一名角色拼点",
  ["#mizhao-choose"] = "密诏：选择与 %dest 拼点的角色，赢者视为对没赢者使用【杀】",

  ["$mizhao1"] = "爱卿世受皇恩，堪此重任。",
  ["$mizhao2"] = "此诏事关重大，切记小心行事。",
}

mizhao:addEffect("active", {
  anim_type = "control",
  prompt = "#mizhao",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return not player:isKongcheng() and player:usedSkillTimes(mizhao.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:obtainCard(target, player:getCardIds("h"), false, fk.ReasonGive, player)
    if player.dead or target.dead or target:isKongcheng() then return end
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return target:canPindian(p) and p ~= target
    end)
    if #targets == 0 then return end
    local to = room:askToChoosePlayers(player, {
      skill_name = mizhao.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#mizhao-choose::"..target.id,
      cancelable = false,
    })[1]
    local pindian = target:pindian({to}, mizhao.name)
    if pindian.results[to].winner then
      local winner, loser
      if pindian.results[to].winner == target then
        winner = target
        loser = to
      else
        winner = to
        loser = target
      end
      if loser.dead then return end
      room:useVirtualCard("slash", nil, winner, loser, mizhao.name)
    end
  end
})

return mizhao
