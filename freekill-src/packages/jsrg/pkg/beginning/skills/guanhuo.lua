local guanhuo = fk.CreateSkill {
  name = "guanhuo",
}

Fk:loadTranslationTable{
  ["guanhuo"] = "观火",
  [":guanhuo"] = "出牌阶段，你可以视为使用一张【火攻】。当你以此法使用的未造成伤害的【火攻】结算后，若此次为你于此阶段内第一次"..
  "发动本技能，则你令你此阶段内你使用【火攻】造成的伤害+1，否则你失去〖观火〗。",

  ["#guanhuo"] = "观火：你可以视为使用一张【火攻】",
  ["@@guanhuo-phase"] = "观火",
}

guanhuo:addEffect("viewas", {
  anim_type = "offensive",
  prompt = "#guanhuo",
  card_filter = Util.FalseFunc,
  view_as = function (self, player, cards)
    local card = Fk:cloneCard("fire_attack")
    card.skillName = guanhuo.name
    return card
  end,
  after_use = function (self, player, use)
    if not player.dead and not use.damageDealt then
      local room = player.room
      if player:usedSkillTimes(guanhuo.name, Player.HistoryPhase) == 1 then
        room:addPlayerMark(player, "@@guanhuo-phase", 1)
      else
        room:handleAddLoseSkills(player, "-guanhuo")
      end
    end
  end,
})

guanhuo:addEffect(fk.PreCardUse, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark("@@guanhuo-phase") > 0 and data.card.name == "fire_attack"
  end,
  on_refresh = function(self, event, target, player, data)
    data.additionalDamage = (data.additionalDamage or 0) + 1
  end,
})

return guanhuo
