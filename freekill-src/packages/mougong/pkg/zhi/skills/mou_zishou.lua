local mouZishou = fk.CreateSkill({
  name = "mou__zishou",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__zishou"] = "自守",
  [":mou__zishou"] = "锁定技，其他角色的结束阶段，若本局游戏你与其均未对另一方造成过伤害，其交给你一张牌。",
  ["#mou__zishou-give"] = "自守：你须交给 %dest 一张牌 ",

  ["$mou__zishou1"] = "荆襄通连天下，我有何惧？",
  ["$mou__zishou2"] = "据此人杰地灵之地，何必再行征战？",
}

mouZishou:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouZishou.name) and player ~= target and target.phase == Player.Finish and not target:isNude() then
      return #player.room.logic:getActualDamageEvents(1, function(e)
        local damage = e.data
        return (damage.from == player and damage.to == target) or (damage.from == target and damage.to == player)
      end, Player.HistoryGame) == 0
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToCards(
      target,
      {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = mouZishou.name,
        cancelable = false,
        prompt = "#mou__zishou-give::" .. player.id
      }
    )
    room:obtainCard(player, cards[1], false, fk.ReasonGive)
  end,
})

return mouZishou
