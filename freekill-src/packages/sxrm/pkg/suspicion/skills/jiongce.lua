local jiongce = fk.CreateSkill({
  name = "jiongce",
})

Fk:loadTranslationTable{
  ["jiongce"] = "迥策",
  [":jiongce"] = "出牌阶段限一次，你可以依次进行两次拼点（目标不能为同一名角色），然后赢的角色各对另一次拼点中没赢的角色造成1点伤害。",

  ["#jiongce"] = "迥策：依次进行两次拼点，赢的角色对另一次拼点没赢的角色造成伤害！",
  ["#jiongce-choose"] = "迥策：再选择一名角色进行拼点",
}

jiongce:addEffect("active", {
  anim_type = "offensive",
  prompt = "#jiongce",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return not player:isKongcheng() and player:usedSkillTimes(jiongce.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and player:canPindian(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target1 = effect.tos[1]
    local pindian1 = player:pindian({target1}, jiongce.name)
    if player.dead then return end

    local targets = table.filter(room:getOtherPlayers(target1, false), function(p)
      return player:canPindian(p)
    end)
    if #targets == 0 then return end

    local target2 = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = jiongce.name,
      prompt = "#jiongce-choose",
      cancelable = false,
    })[1]
    local pindian2 = player:pindian({target2}, jiongce.name)

    local function handle_pindian_result(pindianA, targetA, pindianB, targetB)
      local winner = pindianA.results[targetA].winner
      if not winner then return end
      local loser = {player, targetB}
      table.removeOne(loser, pindianB.results[targetB].winner)
      room:sortByAction(loser)
      for _, p in ipairs(loser) do
        if not p.dead then
          room:damage{
            from = winner,
            to = p,
            damage = 1,
            skillName = jiongce.name,
          }
        end
      end
    end

    handle_pindian_result(pindian1, target1, pindian2, target2)
    handle_pindian_result(pindian2, target2, pindian1, target1)
  end,
})

return jiongce
