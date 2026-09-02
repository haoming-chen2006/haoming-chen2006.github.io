local yizheng = fk.CreateSkill {
  name = "js__yizheng",
}

Fk:loadTranslationTable{
  ["js__yizheng"] = "义争",
  [":js__yizheng"] = "出牌阶段限一次，你可以与一名手牌数大于你的角色拼点：若你赢，其跳过下个摸牌阶段；没赢，其可以对你造成至多2点伤害。",

  ["#js__yizheng"] = "义争：与一名手牌数大于你的角色拼点，若赢，其跳过下个摸牌阶段；没赢，其可以对你造成至多2点伤害",
  ["@@js__yizheng"] = "义争",
  ["#js__yizheng-damage"] = "义争：你可以对 %src 造成至多2点伤害",

  ["$js__yizheng1"] = "前有劳顿之辛，今受相争之苦，此为卿之忠邪？",
  ["$js__yizheng2"] = "卿若怀忠，则奉天子还阙，何为此逆乱之举！",
}

yizheng:addEffect("active", {
  anim_type = "control",
  prompt = "#js__yizheng",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(yizheng.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select:getHandcardNum() > player:getHandcardNum() and player:canPindian(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local pindian = player:pindian({target}, yizheng.name)
    if target.dead then return end
    if pindian.results[target].winner == player then
      room:setPlayerMark(target, "@@js__yizheng", 1)
    else
      if player.dead or target.dead then return end
      local choice = room:askToChoice(target, {
        choices = {"0", "1", "2"},
        skill_name = yizheng.name,
        prompt = "#js__yizheng-damage:"..player.id,
      })
      if choice ~= "0" then
        room:doIndicate(target, {player})
        room:damage{
          from = target,
          to = player,
          damage = tonumber(choice),
          skillName = yizheng.name,
        }
      end
    end
  end,
})

yizheng:addEffect(fk.EventPhaseChanging, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark("@@js__yizheng") > 0 and data.phase == Player.Draw and
      not data.skipped
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@js__yizheng", 0)
    data.skipped = true
  end,
})

return yizheng
