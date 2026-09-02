local mouJingce = fk.CreateSkill {
  name = "mou__jingce",
  tags = { Skill.Compulsory },
  derived_piles = "$mou__jingce",
}

Fk:loadTranslationTable{
  ["mou__jingce"] = "精策",
  [":mou__jingce"] = "锁定技，回合开始时，若你没有“精策”牌，则你清除未验证的预测记录，然后将牌堆顶三张牌置于你的武将牌上，称为“精策”牌；" ..
  "回合结束时，你预测将获得这些“精策”牌的角色或不被任何角色获得，然后根据预测顺序将这些牌分别置为牌堆顶的第三、六、九张牌" ..
  "（无法置入该位置的牌改为置于牌堆底）。若你预测正确，则你分别摸一、二、三张牌。",

  ["$mou__jingce"] = "精策",
  ["@[mou__jingce_cards]"] = "精策猜测",
  ["#mou__jingce-predict"] = "精策：请选择放置于牌堆顶第%arg张的牌，以及获得此牌的角色",
  ["@predict_to"] = "预测<br>",
  ["#nobody"] = "无人获得",

  ["$mou__jingce1"] = "料敌取胜，于吾不过易事。",
  ["$mou__jingce2"] = "思我之薄弱，知敌之计谋。",
  ["$mou__jingce3"] = "此地必受强攻，当再加以防御。",
  ["$mou__jingce4"] = "幸吾早有防备，不致此战有失。",
  ["$mou__jingce5"] = "诸葛亮神机妙算，吾不及也。",
  ["$mou__jingce6"] = "大局未定，何困于一时胜负。",
  ["$mou__jingce7"] = "哼，蜀军惯用此计，吾等安座则已。",
  ["$mou__jingce8"] = "哈哈哈，若长此以往，蜀贼可平。",
  ["$mou__jingce9"] = "可恶，老贼坏我大事。	",
}

Fk:addQmlMark{
  name = "mou__jingce_cards",
  qml = function(name, value, p)
    if Self ~= p then return end -- 别人不可见
    local input = table.map(value, function (v)
      local toGain = Fk:currentRoom():getPlayerById(v.owner)
      local pname = toGain and toGain:toLogString() or "#nobody" -- 考虑同名武将
      local general = toGain and toGain.general or ""
      return { cardId = v.card, name = pname, general = general }
    end)
    return {
      url = "packages/mougong/qml/JingceMark.qml",
      prop = {
        name = name,
        value = input,
      },
    }
  end,
  how_to_show = function(name, value, p)
    if type(value) ~= "table" then return " " end
    if Self ~= p then return " " end -- 别人不可见
    return tostring(#value)
  end,
}

mouJingce:addEffect(fk.TurnStart, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouJingce.name) and
      #player:getPile("$mou__jingce") == 0
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJingce.name
    local room = player.room
    player:broadcastSkillInvoke(skillName, math.random(1, 2))
    room:notifySkillInvoked(player, skillName, "control")

    room:setPlayerMark(player, "@[mou__jingce_cards]", 0)
    player:addToPile("$mou__jingce", room:getNCards(3), false, skillName)
  end,
})

mouJingce:addEffect(fk.TurnEnd, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(mouJingce.name) and
      #player:getPile("$mou__jingce") > 0
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJingce.name
    local room = player.room
    local jingceCards = player:getPile("$mou__jingce")

    player:broadcastSkillInvoke(skillName, math.random(1, 2))
    room:notifySkillInvoked(player, skillName, "control")

    local jingcePredict = {}
    local jingceCardsNum = #jingceCards
    for i = 1, jingceCardsNum do
      local putPosition = math.min((#jingcePredict + 1) * 3, #room.draw_pile + 1)
      local success, dat = room:askToUseActiveSkill(
        player,
        {
          skill_name = "mou__jingce_select",
          prompt = "#mou__jingce-predict:::" .. putPosition,
          cancelable = false,
          extra_data = { cards = jingceCards, targets = table.map(room.alive_players, Util.IdMapper) },
        }
      )

      if not dat then
        dat = { cards = { jingceCards[1] } }
      end

      table.insert(jingcePredict, {
        move = {
          ids = dat.cards,
          from = player,
          toArea = Card.DrawPile,
          moveReason = fk.ReasonPut,
          skillName = skillName,
          moveVisible = false,
          drawPilePosition = putPosition,
        },
        owner = (dat.targets and #dat.targets > 0) and dat.targets[1].id or nil
      })
      table.removeOne(jingceCards, dat.cards[1])

      local toGain = dat.targets and dat.targets[1] or nil
      toGain = toGain and
        Fk:translate(toGain.general == "anjiang" and "seat#" .. tostring(toGain.seat) or toGain.general) or
        Fk:translate("#nobody")
      room:setCardMark(Fk:getCardById(dat.cards[1]), "@predict_to", toGain)
    end

    if #jingcePredict > 0 then
      local cards = table.map(jingcePredict, function(predict) return predict.move.ids[1] end)
      for _, id in ipairs(cards) do
        room:setCardMark(Fk:getCardById(id), "@predict_to", 0)
      end
      room:moveCards(table.unpack(table.map(jingcePredict, function(predict) return predict.move end)))
      room:setPlayerMark(
        player,
        "@[mou__jingce_cards]",
        table.map(jingcePredict, function(predict, index) return { card = predict.move.ids[1], owner = predict.owner, i = index } end)
      )
    end
  end,
})

mouJingce:addEffect(fk.AfterCardsMove, {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    local jingceCards = player:getMark("@[mou__jingce_cards]")
    if jingceCards == 0 then
      return false
    end

    jingceCards = table.map(jingceCards, function(predict) return predict.card end)
    return table.find(data, function(move)
      return move.toArea ~= Card.Processing and not not table.find(move.moveInfo, function(info)
        return
          (info.fromArea == Card.DrawPile or info.fromArea == Card.Processing) and
          table.contains(jingceCards, info.cardId)
      end)
    end)
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouJingce.name
    local room = player.room
    for _, move in ipairs(data) do
      if move.toArea ~= Card.Processing then
        for _, info in ipairs(move.moveInfo) do
          local jingceCards = player:getMark("@[mou__jingce_cards]")
          if jingceCards == 0 then
            return false
          end

          if info.fromArea == Card.DrawPile or info.fromArea == Card.Processing then
            local cards, owners, drawList = {}, {}, {}
            for i, predict in ipairs(jingceCards) do
              table.insert(cards, predict.card)
              owners[i] = predict.owner and room:getPlayerById(predict.owner) or nil
              table.insert(drawList, predict.i)
            end
            local index = table.indexOf(cards, info.cardId)

            if index > -1 then
              local drawNum = drawList[index]
              table.remove(jingceCards, index)
              room:setPlayerMark(player, "@[mou__jingce_cards]", next(jingceCards) ~= nil and jingceCards or 0)

              local moveToFixed = move.to
              if moveToFixed and not table.contains({ Card.PlayerHand, Card.PlayerHand }, move.toArea) then
                moveToFixed = nil
              end

              if owners[index] == moveToFixed then
                room:addPlayerMark(player, "mou__jingce_successed")
                player:broadcastSkillInvoke(skillName, player:getMark("mou__jingce_successed") >= 6 and math.random(7, 8) or math.random(3, 4))
                room:notifySkillInvoked(player, skillName, "drawcard")
                player:drawCards(drawNum, skillName)
              else
                player:broadcastSkillInvoke(skillName, player:getMark("mou__jingce_successed") >= 7 and 9 or math.random(5, 6))
                room:notifySkillInvoked(player, skillName, "negative")
                room:setPlayerMark(player, "mou__jingce_successed", 0)
              end
            end
          end
        end
      end
    end
  end,
})

return mouJingce
