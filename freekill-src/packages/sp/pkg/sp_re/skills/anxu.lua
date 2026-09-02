local anxu = fk.CreateSkill {
  name = "re__anxu",
}

Fk:loadTranslationTable{
  ["re__anxu"] = "安恤",
  [":re__anxu"] = "出牌阶段限一次，你可以选择两名手牌数不同的其他角色，令其中手牌多的角色将一张手牌交给手牌少的角色，"..
  "然后若这两名角色手牌数相等，你摸一张牌或回复1点体力。",

  ["#re__anxu"] = "安恤：选择两名角色，手牌多的角色交给对方一张手牌，然后若手牌数相等，你摸牌或回复体力",
  ["#re__anxu-give"] = "安恤：你需将一张手牌交给 %dest",

  ["$re__anxu1"] = "和鸾雍雍，万福攸同。",
  ["$re__anxu2"] = "君子乐胥，万邦之屏。",
}

anxu:addEffect("active", {
  anim_type = "control",
  prompt = "#re__anxu",
  card_num = 0,
  target_num = 2,
  can_use = function(self, player)
    return player:usedSkillTimes(anxu.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    if #selected > 1 or to_select == player then return end
    if #selected == 0 then
      return true
    elseif #selected == 1 then
      return to_select:getHandcardNum() ~= selected[1]:getHandcardNum()
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local from, to = effect.tos[1], effect.tos[2]
    if from:getHandcardNum() > to:getHandcardNum() then
      from, to = to, from
    end
    local card = room:askToCards(to, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = anxu.name,
      cancelable = false,
      prompt = "#re__anxu-give::"..from.id
    })
    room:obtainCard(from, card, true, fk.ReasonGive, to, anxu.name)
    if from:getHandcardNum() == to:getHandcardNum() and not player.dead then
      if not player:isWounded() or
        room:askToChoice(player, {
          choices = {"draw1", "recover"},
          skill_name = anxu.name,
        }) == "draw1" then
        player:drawCards(1, anxu.name)
      else
        room:recover{
          who = player,
          num = 1,
          recoverBy = player,
          skillName = anxu.name,
        }
      end
    end
  end,
})

return anxu
