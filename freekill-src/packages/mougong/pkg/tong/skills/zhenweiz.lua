local zhenwei = fk.CreateSkill {
  name = "zhenweiz",
}

Fk:loadTranslationTable{
  ["zhenweiz"] = "镇围",
  [":zhenweiz"] = "出牌阶段限一次，你可以令一名其他角色与你同时选择是否弃置至少一张牌。然后你可执行至多X项" ..
  "（X为你弃置牌不小于其的条件数：1.牌数；2.花色数）：<br />" ..
  "1.对其造成1点伤害；<br />" ..
  "2.摸三张牌。",

  ["#zhenweiz-active"] = "镇围：你可令一名其他角色与你同时弃牌",
  ["#zhenweiz-discard"] = "镇围：你可弃置至少一张牌",
  ["zhenweiz_damage"] = "对%dest造成1点伤害",
  ["zhenweiz_draw"] = "摸三张牌",
  ["#zhenweiz-choose"] = "镇围：你可选择至多%arg项执行",
  ["@zhenweiz_effect-noclear"] = "镇围",
  ["zhenweiz_effect_dmg"] = "造成伤害",
  ["zhenweiz_effect_draw"] = "摸牌",

  ["$zhenweiz1"] = "吾刃未折，家国不堕！",
  ["$zhenweiz2"] = "纵魏军百万，难撼吾寸土！",
}

zhenwei:addEffect("active", {
  prompt = "#zhenweiz-active",
  card_num = 0,
  target_num = 1,
  can_use = function (self, player)
    return player:usedSkillTimes(zhenwei.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = zhenwei.name
    local from = effect.from
    local to = effect.tos[1]

    local targets = { from, to }
    table.forEach(room.alive_players, function(p)
      if table.contains(p:getTableMark("@@heyuan_owners-noclear"), from.id) then
        table.insertIfNeed(targets, p)
      end
    end)

    local result = room:askToJointCards(
      from,
      {
        min_num = 1,
        max_num = 999,
        players = targets,
        include_equip = true,
        will_throw = true,
        skill_name = skillName,
        prompt = "#zhenweiz-discard",
      }
    )

    local moveList, numRecord, suitRecord = {}, {}, {}
    for p, ids in pairs(result) do
      if #ids > 0 then
        table.insert(moveList, {
          ids = ids,
          from = p,
          toArea = Card.DiscardPile,
          moveReason = fk.ReasonDiscard,
          skillName = skillName,
          proposer = p,
        })
      end

      if p == from then
        room:setPlayerMark(from, "zhenweiz_discard-noclear", #ids == 0 and -1 or #ids)
      end

      local recorder = p == to and to or from
      numRecord[recorder] = numRecord[recorder] or 0
      numRecord[recorder] = numRecord[recorder] + #ids
      suitRecord[recorder] = suitRecord[recorder] or {}
      local suits = {}
      table.forEach(ids, function(id)
        local suit = Fk:getCardById(id).suit
        if suit ~= Card.NoSuit then
          table.insertIfNeed(suits, suit)
        end
      end)
      table.insertTableIfNeed(suitRecord[recorder], suits)
    end

    if #moveList > 0 then
      room:moveCards(table.unpack(moveList))
    end

    local maxNum = 0
    if numRecord[from] >= numRecord[to] then
      maxNum = maxNum + 1
    end

    if #suitRecord[from] >= #suitRecord[to] then
      maxNum = maxNum + 1
    end

    if not (maxNum > 0 and from:isAlive()) then
      return false
    end

    local choices = { "zhenweiz_damage::" .. to.id, "zhenweiz_draw" }
    if not to:isAlive() then
      table.remove(choices, 1)
    end

    local chosen = room:askToChoices(
      from,
      {
        min_num = 1,
        max_num = maxNum,
        choices = choices,
        all_choices = { "zhenweiz_damage::" .. to.id, "zhenweiz_draw" },
        skill_name = skillName,
        prompt = "#zhenweiz-choose:::" .. maxNum,
      }
    )

    if table.contains(chosen, "zhenweiz_damage::" .. to.id) then
      room:doIndicate(from, { to })
      room:setPlayerMark(from, "@zhenweiz_effect-noclear", "zhenweiz_effect_dmg")

      room:damage{
        from = from,
        to = to,
        damage = 1,
        skillName = skillName,
      }
    end

    if table.contains(chosen, "zhenweiz_draw") and from:isAlive() then
      room:setPlayerMark(from, "@zhenweiz_effect-noclear", "zhenweiz_effect_draw")
      from:drawCards(3, skillName)
    end
  end,
})

return zhenwei
