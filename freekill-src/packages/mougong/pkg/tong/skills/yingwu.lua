local yingwu = fk.CreateSkill({
  name = "yingwu",
})

Fk:loadTranslationTable{
  ["yingwu"] = "莺舞",
  ["#yingwu_charge"] = "莺舞",
  [":yingwu"] = "你使用非伤害类普通锦囊结算结束后，若你拥有至少两个“椎”标记，则你移除两个“椎”标记，然后摸一张牌，"..
    "且可以选择一名角色视为对其使用一张【杀】（计入次数，无次数限制）。每阶段限两次，当你于出牌阶段内使用非伤害类普通锦囊指定一个目标后，"..
    "若你拥有技能〖掠影〗，则你获得一个“椎”标记。",

  ["#yingwu-slash"] = "莺舞：你可以视为使用一张无次数限制的【杀】",

  ["$yingwu1"] = "莺舞曼妙，杀机亦藏其中！",
  ["$yingwu2"] = "莺翼之羽，便是诛汝之锋！",
}

yingwu:addEffect(fk.TargetSpecified, {
  mute = true,
  times = function(self, player)
    return player.phase == Player.Play and 2 - player:usedEffectTimes(self.name, Player.HistoryPhase) or -1
  end,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.card:isCommonTrick() and
      not data.card.is_damage_card and
      player.phase == Player.Play and
      player:hasSkill(yingwu.name) and
      player:usedEffectTimes(self.name, Player.HistoryPhase) < 2
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "@lueying_hit")
  end,
})

yingwu:addEffect(fk.CardUseFinished, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(yingwu.name) and
      target == player and
      data.card:isCommonTrick() and
      not data.card.is_damage_card and
      player:getMark("@lueying_hit") > 1
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = yingwu.name
    local room = player.room
    room:removePlayerMark(player, "@lueying_hit", 2)
    room:drawCards(player, 1, skillName)
    room:askToUseVirtualCard(
      player,
      {
        name = "slash",
        skill_name = skillName,
        prompt = "#yingwu-slash",
        extra_data = {
          bypass_times = true,
          extraUse = false,
        }
      }
    )
  end,
})

return yingwu
