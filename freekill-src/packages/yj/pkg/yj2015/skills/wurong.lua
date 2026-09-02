
local wurong = fk.CreateSkill {
  name = "wurong",
}

Fk:loadTranslationTable{
  ["wurong"] = "怃戎",
  [":wurong"] = "出牌阶段限一次，你可以和一名其他角色同时展示一张手牌：若你展示的是【杀】且该角色不是【闪】，你弃置此【杀】，"..
  "然后对其造成1点伤害；若你展示的不是【杀】且该角色是【闪】，你弃置此牌，然后获得其一张牌。",

  ["#wurong"] = "怃戎：与一名角色同时展示一张手牌，根据牌名执行效果",
  ["#wurong-show"] = "怃戎：选择一张展示的手牌",

  ["$wurong1"] = "兵不血刃，亦可先声夺人。",
  ["$wurong2"] = "从则安之，犯则诛之。",
}

wurong:addEffect("active", {
  anim_type = "offensive",
  prompt = "#wurong",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return not player:isKongcheng() and player:usedSkillTimes(wurong.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local result = room:askToJointCards(player, {
      players = {player, target},
      min_num = 1,
      max_num = 1,
      cancelable = false,
      skill_name = wurong.name,
      prompt = "#wurong-show",
    })
    local fromCard, toCard = result[player][1], result[target][1]
    player:showCards(result[player])
    target:showCards(result[target])
    if Fk:getCardById(fromCard).trueName == "slash" and Fk:getCardById(toCard).name ~= "jink" then
      if table.contains(player:getCardIds("h"), fromCard) and
        not player:prohibitDiscard(fromCard) then
        room:throwCard(fromCard, wurong.name, player, player)
      end
      if not target.dead then
        room:damage{
          from = player,
          to = target,
          damage = 1,
          skillName = wurong.name,
        }
      end
    end
    if Fk:getCardById(fromCard).trueName ~= "slash" and Fk:getCardById(toCard).name == "jink" then
      if table.contains(player:getCardIds("h"), fromCard) and
        not player:prohibitDiscard(fromCard) then
        room:throwCard(fromCard, wurong.name, player, player)
      end
      if not player.dead and not target.dead and not target:isNude() then
        local id = room:askToChooseCard(player, {
          target = target,
          flag = "he",
          skill_name = wurong.name,
        })
        room:obtainCard(player, id, false, fk.ReasonPrey, player, wurong.name)
      end
    end
  end,
})

return wurong
