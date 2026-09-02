local mouQicai = fk.CreateSkill({
  name = "mou__qicai",
})

Fk:loadTranslationTable{
  ["mou__qicai"] = "奇才",
  [":mou__qicai"] = "你使用锦囊牌无距离限制。出牌阶段限一次，你可以选择一名其他角色，"..
  "将手牌或弃牌堆中一张装备牌置入其装备区（若为斗地主模式，则改为防具牌且每种牌名限一次），"..
  "然后其获得“奇”标记。有“奇”标记的角色接下来获得的三张普通锦囊牌须交给你。",

  ["#mou__qicai"] = "奇才：选择一名角色，将装备置入其装备区，然后其获得的锦囊牌须交给你",
  ["#mou__qicai-choose"] = "奇才：令 %dest 装备你手牌或弃牌堆里的一张装备牌",
  ["mou__qicai_select"] = "奇才",
  ["mou__qicai_discardpile"] = "弃牌堆",
  ["@mou__qicai_target"] = "奇",
  ["@$mou__qicai"] = "奇才",
  ["#mou__qicai_trigger"] = "奇才",

  ["$mou__qicai1"] = "依我此计，便可破之。",
  ["$mou__qicai2"] = "以此无用之物，换得锦囊妙计。",
}

mouQicai:addEffect("active", {
  prompt = "#mou__qicai",
  anim_type = "support",
  can_use = function(self, player)
    return player:usedSkillTimes(mouQicai.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player
  end,
  target_num = 1,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "mou__qicai_select",
      prompt = "#mou__qicai-choose::" .. target.id,
      extra_data = {
        mou__qicai_target = target.id,
      }
    })

    if success and dat then
      if room:isGameMode("1v2_mode") then
        room:addTableMark(player, mouQicai.name, Fk:getCardById(dat.cards[1]).trueName)
      end
      room:moveCardIntoEquip(target, dat.cards, mouQicai.name)
      room:setPlayerMark(target, "@mou__qicai_target", 3)
      room:setPlayerMark(target, "mou__qicai_source", effect.from.id)
    end
  end,
})

mouQicai:addEffect("targetmod", {
  bypass_distances = function(self, player, skill, card)
    return player:hasSkill(mouQicai.name) and card and card.type == Card.TypeTrick
  end,
})

mouQicai:addEffect(fk.AfterCardsMove, {
  anim_type = "control",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if not player:hasSkill(mouQicai.name) then return false end
    local room = player.room
    local qicai_pairs = {}
    for _, p in ipairs(room.alive_players) do
      if p:getMark("@mou__qicai_target") > 0 and p:getMark("mou__qicai_source") == player.id then
        qicai_pairs[p.id] = {}
      end
    end
    for _, move in ipairs(data) do
      if move.to ~= nil and qicai_pairs[move.to.id] ~= nil and move.toArea == Card.PlayerHand then
        local to = move.to
        for _, info in ipairs(move.moveInfo) do
          local id = info.cardId
          if room:getCardArea(id) == Card.PlayerHand and room:getCardOwner(id) == to and
          Fk:getCardById(id):isCommonTrick() then
            table.insert(qicai_pairs[move.to.id], id)
          end
        end
      end
    end
    for _, ids in pairs(qicai_pairs) do
      if #ids > 0 then
        event:setCostData(self, qicai_pairs)
        return true
      end
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to_get = {}
    for pid, ids in pairs(event:getCostData(self)) do
      if #ids > 0 then
        room:doIndicate(player.id, { pid })
        local to = room:getPlayerById(pid)
        local x = to:getMark("@mou__qicai_target")
        if x < #ids then
          ids = room:tableRandomPick(ids, x)
        end
        if #ids == x then
          room:setPlayerMark(to, "@mou__qicai_target", 0)
          room:setPlayerMark(to, "mou__qicai_source", 0)
        else
          room:removePlayerMark(to, "@mou__qicai_target", #ids)
        end
        table.insertTable(to_get, ids)
      end
    end
    room:moveCardTo(to_get, Card.PlayerHand, player, fk.ReasonGive, mouQicai.name, nil, false, player)
  end,
})

mouQicai:addLoseEffect(function (self, player)
  local room = player.room
    room:setPlayerMark(player, mouQicai.name, 0)
    for _, p in ipairs(room.alive_players) do
      if p:getMark("mou__qicai_source") == player.id then
        room:setPlayerMark(p, "@mou__qicai_target", 0)
        room:setPlayerMark(p, "mou__qicai_source", 0)
      end
    end
end)

return mouQicai
