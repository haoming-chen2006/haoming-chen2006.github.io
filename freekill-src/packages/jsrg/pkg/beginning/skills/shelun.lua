local shelun = fk.CreateSkill {
  name = "shelun",
}

Fk:loadTranslationTable{
  ["shelun"] = "赦论",
  [":shelun"] = "出牌阶段限一次，你可以选择一名攻击范围内的其他角色，然后你令除其外所有手牌数不大于你的角色议事，结果为："..
  "红色，你弃置其两张牌；黑色，你对其造成2点伤害。",

  ["#shelun"] = "赦论：指定一名角色，除其外所有手牌数不大于你的角色议事<br>红色：你弃置目标两张牌；黑色，你对目标造成2点伤害",
}

local U = require "packages.utility.utility"

shelun:addEffect("active", {
  anim_type = "offensive",
  prompt = "#shelun",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(shelun.name, Player.HistoryPhase) == 0 and not player:isKongcheng()
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and player:inMyAttackRange(to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local targets = table.filter(room:getOtherPlayers(target, false), function(p)
      return not p:isKongcheng() and p:getHandcardNum() <= player:getHandcardNum()
    end)
    room:delay(1500)
    room:doIndicate(player, targets)
    local discussion = U.Discussion(player, targets, shelun.name)
    if discussion.color == "red" then
      if not target.dead and not target:isNude() and not player.dead then
        local cards = room:askToChooseCards(player, {
          target = target,
          min = 2,
          max = 2,
          flag = "he",
          skill_name = shelun.name,
        })
        room:throwCard(cards, shelun.name, target, player)
      end
    elseif discussion.color == "black" then
      room:damage{
        from = player,
        to = target,
        damage = 2,
        skillName = shelun.name,
      }
    end
  end,
})

return shelun
