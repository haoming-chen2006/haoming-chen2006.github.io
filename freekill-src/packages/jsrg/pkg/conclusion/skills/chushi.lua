local chushi = fk.CreateSkill {
  name = "chushi",
}

Fk:loadTranslationTable{
  ["chushi"] = "出师",
  [":chushi"] = "出牌阶段限一次，你可以和主公议事，若结果为：红色，你与其各摸一张牌，重复此摸牌流程，直到你与其手牌之和不小于7；"..
  "黑色，当你于本轮内造成属性伤害时，此伤害+1。",

  ["#chushi"] = "出师：你可以和主公议事，红色你与其摸牌，黑色你本轮属性伤害增加",
  ["@chushi-round"] = "出师+",
}

local U = require "packages.utility.utility"

chushi:addEffect("active", {
  anim_type = "support",
  prompt = "#chushi",
  card_num = 0,
  target_num = function(self, player)
    return #table.filter(Fk:currentRoom().alive_players, function(p)
      return p.role == "lord" and p.role_shown and p ~= player
    end) > 1 and 1 or 0
  end,
  can_use = function(self, player)
    if player:usedSkillTimes(chushi.name, Player.HistoryPhase) == 0 then
      local lords = table.filter(Fk:currentRoom().alive_players, function(p)
        return p.role == "lord" and p.role_shown and p ~= player
      end)
      return #lords > 0 and not (player:isKongcheng() and table.every(lords, function (p)
        return p:isKongcheng()
      end))
    end
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    if #selected == 0 then
      if #table.filter(Fk:currentRoom().alive_players, function(p)
        return p.role == "lord" and p.role_shown and p ~= player
      end) < 2 then
        return false
      else
        return to_select.role == "lord" and to_select.role_shown and to_select ~= player and
          not (player:isKongcheng() and to_select:isKongcheng())
      end
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = #effect.tos > 0 and effect.tos[1] or
      table.find(room.alive_players, function(p)
        return p.role == "lord" and p.role_shown and p ~= player
      end)
    room:delay(1000)
    local targets = { player }
    if target ~= player then
      table.insert(targets, target)
    end
    room:doIndicate(player, targets)
    local discussion = U.Discussion(player, table.filter(targets, function(p) return not p:isKongcheng() end), chushi.name)
    if player.dead then return end
    if discussion.color == "red" then
      room:sortByAction(targets)
      for _, p in ipairs(targets) do
        if not p.dead then
          p:drawCards(1, chushi.name)
        end
      end
      local loopLock = 1
      repeat
        for _, p in ipairs(targets) do
          if not p.dead then
            p:drawCards(1, chushi.name)
          end
        end
        loopLock = loopLock + 1
      until player:getHandcardNum() + (target and player ~= target and target:getHandcardNum() or 0) >= 7 or loopLock == 20
    elseif discussion.color == "black" then
      room:addPlayerMark(player, "@chushi-round")
    end
  end,
})

chushi:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@chushi-round") > 0 and data.damageType ~= fk.NormalDamage
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(player:getMark("@chushi-round"))
  end,
})

return chushi
