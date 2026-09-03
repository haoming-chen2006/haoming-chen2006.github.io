local chanyu = fk.CreateSkill {
  name = "chanyu",
}

Fk:loadTranslationTable{
  ["chanyu"] = "谄谀",
  [":chanyu"] = "出牌阶段限一次，你可以令一名其他角色摸其体力值张牌并与你用各自点数最小的手牌拼点，然后双方展示手牌，" ..
  "赢的角色可交换双方一种颜色或类别的所有手牌。",

  ["#chanyu-choose"] = "谄谀：你可交换双方一种颜色或类别的所有手牌",
}

chanyu:addEffect("active", {
  prompt = "#chanyu",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(chanyu.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = chanyu.name
    local from = effect.from
    local to = effect.tos[1]

    to:drawCards(to.hp, skillName)
    if to:isAlive() and from:canPindian(to) then
      local fromNumber = 99
      local toNumber = 99
      table.forEach(from:getCardIds("h"), function(id)
        local cardNumber = Fk:getCardById(id).number
        if cardNumber < fromNumber then
          fromNumber = cardNumber
        end
      end)

      table.forEach(to:getCardIds("h"), function(id)
        local cardNumber = Fk:getCardById(id).number
        if cardNumber < toNumber then
          toNumber = cardNumber
        end
      end)

      local pindian = {
        from = from,
        tos = { to },
        reason = skillName,
        results = {},
        expandCards = {
          [from] = {
            num = 1,
            min_num = 1,
            include_equip = false,
            pattern = ".|" .. Card:getNumberStr(fromNumber),
            reason = skillName,
            defaultReply = table.find(from:getCardIds("h"), function(id) return Fk:getCardById(id).number == fromNumber end),
          },
          [to] = {
            num = 1,
            min_num = 1,
            include_equip = false,
            pattern = ".|" .. Card:getNumberStr(toNumber),
            reason = skillName,
            defaultReply = table.find(to:getCardIds("h"), function(id) return Fk:getCardById(id).number == toNumber end),
          }
        },
      }

      room:pindian(pindian)
      if from:isAlive() and not from:isKongcheng() then
        from:showCards(from:getCardIds("h"))
      end

      if to:isAlive() and not to:isKongcheng() then
        to:showCards(to:getCardIds("h"))
      end

      if pindian.results[to].winner and from:isAlive() and to:isAlive() and not (from:isKongcheng() and to:isKongcheng()) then
        local choices = {}
        local allHands = from:getCardIds("h")
        table.insertTable(allHands, to:getCardIds("h"))
        for _, id in ipairs(allHands) do
          local card = Fk:getCardById(id)
          if card.color ~= Card.NoColor then
            table.insertIfNeed(choices, card:getColorString())
          end

          table.insertIfNeed(choices, card:getTypeString())
        end

        if #choices == 0 then
          return false
        end
        table.insert(choices, "Cancel")

        local choice = room:askToChoice(
          pindian.results[to].winner,
          {
            choices = choices,
            skill_name = skillName,
            prompt = "#chanyu-choose",
          }
        )

        if choice == "Cancel" then
          return false
        end

        room:swapCards(
          pindian.results[to].winner,
          {
            {
              from,
              table.filter(from:getCardIds("h"), function(id)
                local card = Fk:getCardById(id)
                return card:getColorString() == choice or card:getTypeString() == choice
              end)
            },
            {
              to,
              table.filter(to:getCardIds("h"), function(id)
                local card = Fk:getCardById(id)
                return card:getColorString() == choice or card:getTypeString() == choice
              end)
            },
          },
          skillName
        )
      end
    end
  end,
})

return chanyu
