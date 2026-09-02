local mouLiuli = fk.CreateSkill({
  name = "mou__liuli",
})

Fk:loadTranslationTable{
  ["mou__liuli"] = "流离",
  ["#mou__liuli_dangxian"] = "流离",
  [":mou__liuli"] = "每当你成为【杀】的目标时，你可以弃置一张牌并选择你攻击范围内为此【杀】合法目标（无距离限制）的一名角色：若如此做，"..
  "该角色代替你成为此【杀】的目标。若你以此法弃置了<font color='red'>♥</font>牌，则你可以令一名不为此【杀】使用者的其他角色获得“流离”标记，"..
  "且移去场上所有其他的“流离”（每回合限一次）。有“流离”的角色回合开始时，其移去其“流离”并执行一个额外的出牌阶段。",
  ["#mou__liuli-target"] = "流离：你可以弃置一张牌，将【杀】的目标转移给一名其他角色",
  ["#mou__liuli-choose"] = "流离：你可以令一名除此【杀】使用者的其他角色获得“流离”标记并清除场上的其他流离标记。",
  ["@@liuli_dangxian"] = "流离",

  ["$mou__liuli1"] = "无论何时何地，我都在你身边。",
  ["$mou__liuli2"] = "辗转流离，只为此刻与君相遇。",
}

mouLiuli:addEffect(fk.TargetConfirming, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    local ret = target == player and player:hasSkill(mouLiuli.name) and data.card.trueName == "slash" and not data.cancelled
    if ret then
      for _, p in ipairs(player.room.alive_players) do
        if p ~= player and p ~= data.from and player:inMyAttackRange(p) and not data.from:isProhibited(p, data.card) then
          return true
        end
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    ---@type string
    local skillName = mouLiuli.name
    local room = player.room
    local prompt = "#mou__liuli-target"
    local targets = {}
    local from = data.from
    for _, p in ipairs(room.alive_players) do
      if p ~= player and p ~= data.from and player:inMyAttackRange(p) and not from:isProhibited(p, data.card) then
        table.insert(targets, p)
      end
    end
    if #targets == 0 then return false end
    local plist, cid = room:askToChooseCardsAndPlayers(
      player,
      {
        targets = targets,
        min_num = 1,
        max_num = 1,
        min_card_num = 1,
        max_card_num = 1,
        prompt = prompt,
        skill_name = skillName,
        will_throw = true,
      }
    )
    if #plist > 0 and #cid > 0 then
      event:setCostData(self, { plist[1], cid[1] })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouLiuli.name
    local room = player.room
    local costData = event:getCostData(self)
    local to = costData[1]
    room:doIndicate(player.id, { to })
    room:throwCard(costData[2], skillName, player, player)

    if data:cancelCurrentTarget() then
      data:addTarget(to)
    end

    if Fk:getCardById(costData[2]).suit == Card.Heart and player:getMark("mou__liuli-turn") == 0 then
      local targets = {}
      for _, p in ipairs(room.alive_players) do
        if p ~= player and p ~= data.from and p:getMark("@@liuli_dangxian") == 0 then
           table.insert(targets, p)
        end
      end
      local tar = room:askToChoosePlayers(
        player,
        {
          targets = targets,
          min_num = 1,
          max_num = 1,
          prompt = "#mou__liuli-choose",
          skill_name = skillName
        }
      )
      if #tar > 0 then
         room:removePlayerMark(player, "mou__liuli-turn", 1)
          for _, p in ipairs(room.alive_players) do
            if p:getMark("@@liuli_dangxian") ~= 0 then
                room:removePlayerMark(p, "@@liuli_dangxian", 1)
            end
          end
         room:addPlayerMark(tar[1], "@@liuli_dangxian", 1)
      end
    end
    return true
  end,
})

mouLiuli:addEffect(fk.TurnStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@@liuli_dangxian") ~= 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:removePlayerMark(player, "@@liuli_dangxian", 1)
    player:gainAnExtraPhase(Player.Play, mouLiuli.name)
  end,
})

return mouLiuli
