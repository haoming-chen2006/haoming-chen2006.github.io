local mouTiaoxin = fk.CreateSkill({
  name = "mou__tiaoxin",
  tags = { Skill.Charge },
})

Fk:loadTranslationTable{
  ["mou__tiaoxin"] = "挑衅",
  [":mou__tiaoxin"] = "蓄力技（4/4），出牌阶段限一次，你可以消耗任意蓄力点并选择等量的其他角色，令这些角色依次选择一项："..
  "1.对你使用一张无距离限制的【杀】；2.交给你一张牌。当你于弃牌阶段弃置牌后，你的蓄力点+X（X为你此次弃置的牌数）。",

  ["#mou__tiaoxin"] = "挑衅：消耗任意蓄力点，令等量角色选择对你使用【杀】或交给你一张牌",
  ["#mou__tiaoxin-slash"] = "挑衅：你须对 %src 使用【杀】，否则须交给其一张牌",
  ["#mou__tiaoxin-give"] = "挑衅：请交给 %src 一张牌",

  ["$mou__tiaoxin1"] = "汝等小儿，还不快跨马来战！",
  ["$mou__tiaoxin2"] = "哼！既匹夫不战，不如归耕陇亩！",
}

local U = require "packages.utility.utility"

mouTiaoxin:addEffect("active", {
  anim_type = "control",
  prompt = "#mou__tiaoxin",
  card_num = 0,
  min_target_num = 1,
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) == 0 and player:getMark("skill_charge") > 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return to_select ~= player and #selected < player:getMark("skill_charge")
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouTiaoxin.name
    local player = effect.from
    room:sortByAction(effect.tos)
    room:addPlayerMark(player, "mou__zhiji_count", #effect.tos)
    U.skillCharged(player, -#effect.tos)
    for _, to in ipairs(effect.tos) do
      if player.dead then break end
      local use = room:askToUseCard(
        to,
        {
          pattern = "slash",
          prompt = "#mou__tiaoxin-slash:" .. player.id,
          cancelable = true,
          skill_name = skillName,
          extra_data = { exclusive_targets = { player.id } , bypass_distances = true }
        }
      )
      if use then
        room:useCard(use)
      elseif not to:isNude() then
        local cards = room:askToCards(
          to,
          {
            min_num = 1,
            max_num = 1,
            include_equip = true,
            skill_name = skillName,
            cancelable = false,
            prompt = "#mou__tiaoxin-give:" .. player.id
          }
        )
        if #cards > 0 then
          room:obtainCard(player, cards[1], false, fk.ReasonGive)
        end
      end
    end
  end,
})

mouTiaoxin:addEffect(fk.AfterCardsMove, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if
      player:hasSkill(mouTiaoxin.name) and
      player.phase == Player.Discard and
      player:getMark("skill_charge") < player:getMark("skill_charge_max")
    then
      local n = 0
      for _, move in ipairs(data) do
        if move.from == player and move.moveReason == fk.ReasonDiscard then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
              n = n + 1
            end
          end
        end
      end
      if n > 0 then
        event:setCostData(self, n)
        return true
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    U.skillCharged(player, event:getCostData(self))
  end,
})

mouTiaoxin:addAcquireEffect(function (self, player)
  U.skillCharged(player, 4, 4)
end)

mouTiaoxin:addLoseEffect(function (self, player)
  U.skillCharged(player, -4, -4)
end)

return mouTiaoxin
