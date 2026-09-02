local saojian = fk.CreateSkill {
  name = "saojian",
}

Fk:loadTranslationTable {
  ["saojian"] = "埽奸",
  [":saojian"] = "出牌阶段限一次，你可以观看一名其他角色的手牌并选择其中一张令除其外的角色观看，然后其重复弃置一张手牌（至多五次），" ..
      "直至其弃置了你选择的牌。然后若其手牌数大于你，你失去1点体力。",

  ["#saojian"] = "埽奸：观看一名其他角色的手牌，令其弃置手牌直到弃到你所选的牌",
  ["#SaoJianReveal"] = "%from选择",
  ["#saojian-discard"] = "埽奸：请弃置一张手牌，直到你弃置到“埽奸”选择的牌（剩余%arg次）",

  ["$saojian1"] = "虎豹豺狼、蚊蝇鼠蟑，按律，皆斩。",
  ["$saojian2"] = "蒙鹰犬之任，埽朝廷奸鄙。",
  ["$saojian3"] = "陛下，请假臣一月之期！",
  ["$saojian4"] = "出生，你又藏了什么？",
}

saojian:addEffect("active", {
  anim_type = "control",
  prompt = "#saojian",
  card_num = 0,
  target_num = 1,
  mute = true,
  can_use = function(self, player)
    return player:usedSkillTimes(saojian.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:notifySkillInvoked(player, saojian.name)
    player:broadcastSkillInvoke(saojian.name, math.random(1, 2))
    local target = effect.tos[1]
    if target:isKongcheng() then return end

    local card = room:askToChooseCard(player, {
      target = target,
      flag = { card_data = { { target.general, target:getCardIds("h") } } },
      skill_name = saojian.name,
    })

    local toViewPlayers = table.filter(room.alive_players, function(p) return p ~= target end)
    if #toViewPlayers > 0 then
      local cards = Card:getIdList(card)
      local src = target.id
      local n = 0
      if room.logic:getCurrentEvent().event == GameEvent.SkillEffect then
        n = room.logic:getCurrentEvent().id
      end

      room:doBroadcastNotify("ShowCard", { cards, src, n }, toViewPlayers)

      room:sendFootnote({ card }, {
        type = "#SaoJianReveal",
        from = player.id,
      })
    end

    for i = 1, 5 do
      local ids = room:askToDiscard(target, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = saojian.name,
        cancelable = false,
        prompt = "#saojian-discard:::" .. 6 - i,
      })
      if #ids == 0 or ids[1] == card or target.dead then
        break
      end
      if i == 5 then player:broadcastSkillInvoke(saojian.name, 4) end
    end

    if player:isAlive() and target:getHandcardNum() > player:getHandcardNum() then
      player:broadcastSkillInvoke(saojian.name, 3)
      room:loseHp(player, 1, saojian.name)
    end
  end,
})

return saojian
