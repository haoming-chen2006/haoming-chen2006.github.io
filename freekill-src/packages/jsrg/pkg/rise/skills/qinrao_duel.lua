local duel = fk.CreateSkill {
  name = "qinrao__duel_skill",
}

Fk:loadTranslationTable{
  ["qinrao__duel_skill"] = "决斗",
  ["#qinrao-duel"] = "侵扰：你必须打出一张【杀】！点“取消”则随机打出一张【杀】，若没有则展示手牌",
  ["#qinrao_multi-duel"] = "侵扰：你必须打出一张【杀】！点“取消”则随机打出一张【杀】，若没有则展示手牌（第 %arg 张，共需 %arg2 张）",
}

duel:addEffect("cardskill", {
  mute = true,
  prompt = "#duel_skill",
  mod_target_filter = function(self, player, to_select, selected, card)
    return to_select ~= player
  end,
  target_filter = Util.CardTargetFilter,
  target_num = 1,
  on_effect = function(self, room, effect)
    local to = effect.to
    local from = effect.from
    local responsers = { to, from }
    local currentTurn = 1
    local currentResponser = to

    while currentResponser:isAlive() do
      local loopTimes = effect:getResponseTimes(currentResponser)

      local respond
      for i = 1, loopTimes do
        if currentResponser == to then
          respond = room:askToResponse(currentResponser, {
            skill_name = "slash",
            pattern = "slash",
            cancelable = true,
            event_data = effect,
            prompt = loopTimes == 1 and "#qinrao-duel" or "#qinrao_multi-duel:::"..i..":"..loopTimes,
          })
        else
          respond = room:askToResponse(currentResponser, {
            skill_name = "slash",
            pattern = "slash",
            cancelable = true,
            event_data = effect,
            prompt = loopTimes == 1 and nil or "#AskForResponseMultiCard:::slash:"..i..":"..loopTimes,
          })
        end
        if respond then
          room:responseCard(respond)
        else
          if currentResponser == to then
            local cards = table.filter(to:getCardIds("h"), function (id)
              local card = Fk:getCardById(id)
              return card.trueName == "slash" and not to:prohibitResponse(card)
            end)
            if #cards > 0 then
              respond = {
                from = to,
                card = Fk:getCardById(room:tableRandomPick(cards)),
                responseToEvent = effect,
              }
              room:responseCard(respond)
            else
              if not to:isKongcheng() then
                to:showCards(to:getCardIds("h"))
              end
              break
            end
          else
            break
          end
        end
      end

      if not respond then
        break
      end

      currentTurn = currentTurn % 2 + 1
      currentResponser = responsers[currentTurn]
    end

    if currentResponser:isAlive() then
      room:damage({
        from = responsers[currentTurn % 2 + 1],
        to = currentResponser,
        card = effect.card,
        damage = 1,
        skillName = "duel_skill",
      })
    end
  end,
})

return duel
