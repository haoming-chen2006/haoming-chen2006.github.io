local fennan = fk.CreateSkill {
  name = "fennan",
}

Fk:loadTranslationTable{
  ["fennan"] = "奋难",
  [":fennan"] = "出牌阶段限两次，你可以令一名角色选择一项：1.令你翻面，然后你移动其场上一张本回合未移动过的牌；2.你观看并重铸其至多三张手牌。",

  ["#fennan"] = "奋难：令一名角色选择：你翻面，然后移动其场上一张牌；你观看并重铸其手牌",
  ["fennan1"] = "%src翻面，然后其移动场上一张牌",
  ["fennan2"] = "%src观看并重铸你的手牌",
  ["#fennan-move"] = "奋难：请将 %dest 场上一张牌移动给另一名角色",
  ["#fennan-recast"] = "奋难：选择 %dest 至多三张手牌令其重铸",

  ["$fennan1"] = "幸得陛下厚任，吾当亡命战场，以报所受。",
  ["$fennan2"] = "敌虽万众之数，以吾之谋，易为平之。",
}

fennan:addEffect("active", {
  anim_type = "control",
  prompt = "#fennan",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(fennan.name, Player.HistoryPhase) < 2
  end,
  card_filter = Util.FalseFunc,
  target_filter = function (self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local choices = {"fennan1:"..player.id}
    if not target:isKongcheng() then
      table.insert(choices, "fennan2:"..player.id)
    end
    local choice = room:askToChoice(target, {
      choices = choices,
      skill_name = fennan.name,
    })
    if choice:startsWith("fennan1") then
      player:turnOver()
      if player.dead then return end
      local cards = {}
      room.logic:getEventsOfScope(GameEvent.MoveCards, 1, function(e)
        for _, move in ipairs(e.data) do
          if move.toArea == Card.PlayerEquip or move.toArea == Card.PlayerJudge then
            for _, info in ipairs(move.moveInfo) do
              table.insertIfNeed(cards, info.cardId)
            end
          end
        end
      end, Player.HistoryTurn)
      local targets = table.filter(room:getOtherPlayers(target, false), function (p)
        return table.find(target:getCardIds("ej"), function (id)
          return not table.contains(cards, id) and target:canMoveCardInBoardTo(p, id)
        end) ~= nil
      end)
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#fennan-move::"..target.id,
        skill_name = fennan.name,
        cancelable = false,
      })[1]
      room:askToMoveCardInBoard(player, {
        target_one = target,
        target_two = to,
        skill_name = fennan.name,
        move_from = target,
        exclude_ids = cards,
      })
    else
      local cards = room:askToChooseCards(player, {
        target = target,
        min = 0,
        max = 3,
        flag = { card_data = {{ target.general, target:getCardIds("h") }} },
        skill_name = fennan.name,
        prompt = "#fennan-recast::"..target.id,
      })
      if #cards > 0 then
        room:recastCard(cards, target, fennan.name)
      end
    end
  end,
})

return fennan
