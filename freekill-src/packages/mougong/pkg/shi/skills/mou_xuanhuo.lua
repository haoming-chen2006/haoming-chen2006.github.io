local mouXuanhuo = fk.CreateSkill({
  name = "mou__xuanhuo",
})

Fk:loadTranslationTable{
  ["mou__xuanhuo"] = "眩惑",
  [":mou__xuanhuo"] = "出牌阶段限一次，你可以交给一名没有“眩”标记的其他角色一张牌并令其获得“眩”标记。" ..
  "有“眩”标记的角色于摸牌阶段外获得牌时，你随机获得其一张手牌（每个“眩”标记最多令你获得五张牌）。",
  ["@@mou__xuanhuo"] = "眩",
  ["#mou__xuanhuo-invoke"] = "眩惑：你可以随机获得%dest的一张手牌",

  ["$mou__xuanhuo1"] = "虚名虽然无用，可沽万人之心。",
  ["$mou__xuanhuo2"] = "效金台碣馆之事，布礼贤仁德之名。",
}

mouXuanhuo:addEffect("active", {
  anim_type = "control",
  can_use = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) < 1
  end,
  card_num = 1,
  card_filter = function (self, player, to_select, selected)
    return #selected == 0
  end,
  target_num = 1,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and to_select:getMark("@@mou__xuanhuo") == 0
  end,
  on_use = function(self, room, effect)
    local to = effect.tos[1]
    room:obtainCard(to, effect.cards[1], false, fk.ReasonGive)
    room:setPlayerMark(to, "@@mou__xuanhuo", 1)
  end,
})

mouXuanhuo:addEffect(fk.AfterCardsMove, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouXuanhuo.name) then
      local mark = player:getTableMark("mou__xuanhuo_count")
      local xuanhuoTargets = event:getSkillData(self, "mou__xuanhuo_" .. player.id)
      if xuanhuoTargets then
        return #xuanhuoTargets.unDone
      end

      for _, move in ipairs(data) do
        local to = move.to
        if
          to and
          move.toArea == Card.PlayerHand and
          to ~= player and
          to.phase ~= Player.Draw and
          not to:isKongcheng() and
          to:getMark("@@mou__xuanhuo") > 0 and
          (mark[tostring(to.id)] or 0) < 5
        then
          return true
        end
      end
    end
  end,
  trigger_times = function(self, event, target, player, data)
    if not player:hasSkill(mouXuanhuo.name) then
      return 0
    end

    local mark = player:getTableMark("mou__xuanhuo_count")

    local xuanhuoTargets = event:getSkillData(self, "mou__xuanhuo_" .. player.id)
    if xuanhuoTargets then
      local unDoneTargets = table.simpleClone(xuanhuoTargets.unDone)
      for _, to in ipairs(unDoneTargets) do
        if not to:isAlive() or to:isKongcheng() or (mark[tostring(to.id)] or 0) > 4 then
          table.remove(xuanhuoTargets.unDone, 1)
        else
          break
        end
      end

      return #xuanhuoTargets.unDone + #xuanhuoTargets.done
    end

    local xuanhuoTos = { done = {}, unDone = {} }
    for _, move in ipairs(data) do
      local to = move.to
      if
        to and
        move.toArea == Card.PlayerHand and
        to ~= player and
        to.phase ~= Player.Draw and
        not to:isKongcheng() and
        to:getMark("@@mou__xuanhuo") > 0 and
        (mark[tostring(to.id)] or 0) < 5
      then
        table.insert(xuanhuoTos.unDone, to)
      end
    end

    if #xuanhuoTos.unDone > 0 then
      player.room:sortByAction(xuanhuoTos.unDone)
      event:setSkillData(self, "mou__xuanhuo_" .. player.id, xuanhuoTos)
    end
    return #xuanhuoTos.unDone
  end,
  on_cost = function(self, event, target, player, data)
    local xuanhuoTargets = event:getSkillData(self, "mou__xuanhuo_" .. player.id)
    local to = table.remove(xuanhuoTargets.unDone, 1)
    table.insert(xuanhuoTargets.done, player)
    event:setSkillData(self, "mou__xuanhuo_" .. player.id, xuanhuoTargets)

    event:setCostData(self, to)
    return true
  end,
  on_trigger = function(self, event, target, player, data)
    event:setSkillData(self, "cancel_cost", false)
    self:doCost(event, target, player, data)
    event:setSkillData(self, "cancel_cost", false)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room

    if player.dead then return end
    local to = event:getCostData(self)
    local mark = player:getTableMark("mou__xuanhuo_count")
    local count = mark[tostring(to.id)] or 0
    if not to:isKongcheng() and count < 5 then
      mark[tostring(to.id)] = count + 1
      room:setPlayerMark(player, "mou__xuanhuo_count", mark)
      room:obtainCard(player, room:tableRandomPick(to:getCardIds("h")), false, fk.ReasonPrey)
    end
  end,
})

return mouXuanhuo
