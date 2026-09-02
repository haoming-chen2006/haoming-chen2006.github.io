Fk:loadTranslationTable{
  ["ex__yijue"] = "义绝",
  [":ex__yijue"] = "出牌阶段限一次，你可以弃置一张牌，然后令一名其他角色展示一张手牌。若此牌为："..
    "黑色，其本回合非锁定技失效且不能使用或打出手牌，你本回合对其使用的<font color='red'>♥</font>【杀】伤害+1；"..
    "红色，你获得之，然后你可以令其回复1点体力。",
  ["#ex__yijue"] = "义绝：弃置一张牌，令一名角色展示一张手牌",
  ["@@ex__yijue-turn"] = "义绝",
  ["#ex__yijue-show"] = "义绝：请展示一张手牌",
  ["#ex__yijue-recover"] = "义绝：是否令%dest回复1点体力？",

  ["$ex__yijue1"] = "关某，向来恩怨分明！",
  ["$ex__yijue2"] = "恩已断，义当绝！",
}

local yijue = fk.CreateSkill{
  name = "ex__yijue",
}

yijue:addEffect("active", {
  anim_type = "offensive",
  card_num = 1,
  target_num = 1,
  prompt = "#ex__yijue",
  times = function (self, player)
    return 1 - player:usedEffectTimes(yijue.name, Player.HistoryPhase)
  end,
  can_use = function(self, player)
    return player:usedEffectTimes(yijue.name, Player.HistoryPhase) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select)
    return to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:throwCard(effect.cards, yijue.name, player, player)
    local to = effect.tos[1]

    if to:isKongcheng() then return end

    local card = room:askToCards(to, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = yijue.name,
      prompt = "#ex__yijue-show",
      cancelable = false,
    })[1]
    to:showCards(card)
    if to.dead then return end
    if Fk:getCardById(card).color == Card.Black then
      local yijueMap = to:getMark("@@ex__yijue-turn")
      yijueMap = type(yijueMap) == "table" and yijueMap or {}
      yijueMap[tostring(player.id)] = (yijueMap[tostring(player.id)] or 0) + 1
      room:setPlayerMark(to, "@@ex__yijue-turn", yijueMap)
      room:addPlayerMark(to, MarkEnum.UncompulsoryInvalidity .. "-turn")
    else
      room:obtainCard(player, card, true, fk.ReasonPrey, player, yijue.name)
      if not player.dead and not to.dead and to:isWounded() and
        room:askToSkillInvoke(player, {
          skill_name = yijue.name,
          prompt = "#ex__yijue-recover::"..to.id,
        }) then
        room:recover{
          who = to,
          num = 1,
          recoverBy = player,
          skillName = yijue.name,
        }
      end
    end
  end
})

yijue:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if player:getMark("@@ex__yijue-turn") ~= 0 then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
  prohibit_response = function(self, player, card)
    if player:getMark("@@ex__yijue-turn") ~= 0 then
      local subcards = card:isVirtual() and card.subcards or {card.id}
      return #subcards > 0 and
        table.every(subcards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
    end
  end,
})

yijue:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.card and
      data.card.trueName == "slash" and
      data.card.suit == Card.Heart and
      type(data.to:getMark("@@ex__yijue-turn")) == "table" and
      data.to:getMark("@@ex__yijue-turn")[tostring(player.id)] and
      player.room.logic:damageByCardEffect()
  end,
  on_use = function(self, event, target, player, data)
    data:changeDamage(data.to:getMark("@@ex__yijue-turn")[tostring(player.id)])
  end,
})

--[[
yijue:addAI({
  think = function(self, ai)
    local player = ai.player
    local cards = ai:getEnabledCards(".")
    local players = ai:getEnabledTargets()
    local event = ai.room.logic:getCurrentEvent()
    -- 询问展示牌
    if event.event == GameEvent.SkillEffect and event.data.skill.name == yijue.name then
      local id = table.find(player:getCardIds("h"), function(id) return Fk:getCardById(id).color == Card.Red end)
      or table.random(player:getCardIds("h"))
      return { cards = {id} }, 1
    end

    cards = ai:getChoiceCardsByKeepValue(cards, #cards, function(value) return value < 45 end)

    if #cards == 0 or #players == 0 then return {}, -1000 end

    local benefits = {}

    --- 遍历所有玩家，计算收益
    for _, target in ipairs(players) do
      local benefit = 0

      -- 透视，如果全是黑
      if table.every(target:getCardIds("h"), function(id) return Fk:getCardById(id).color == Card.Black end) then
        if ai:isEnemy(target) then
          benefit = benefit + 100 -- 简单加点好了
        end
      end
      -- 透视，如果有红
      if table.find(target:getCardIds("h"), function(id) return Fk:getCardById(id).color == Card.Red end) then
        -- 随机拿一张
        benefit = benefit + ai:getBenefitOfEvents(function(logic)
          local c = table.random(target:getCardIds("h"))
          logic:obtainCard(player, c, true, fk.ReasonGive)
        end)
        if ai:isFriend(target) and target:isWounded() then
          benefit = benefit + ai:getBenefitOfEvents(function(logic)
            logic:recover{
              who = target,
              num = 1,
              recoverBy = ai.player,
            }
          end)
        end
      end

      benefits[#benefits + 1] = { target, benefit }
    end

    table.sort(benefits, function(a, b) return a[2] < b[2] end)

    if #benefits == 0 then return {}, -1000 end

    return { targets = { benefits[1][1] }, cards = table.slice(cards, 1, 2) }, benefits[1][2]
  end,

  -- 是否令目标回血
  think_skill_invoke = function(self, ai, skill_name, prompt)
    local data = ai.room.logic:getCurrentEvent().data
    local to = ai.room:getPlayerById(data.skill_data.tos[1])
    return ai:getBenefitOfEvents(function(logic)
      logic:recover{
        who = to,
        num = 1,
        recoverBy = ai.player,
      }
    end) > 0
  end,
})
--]]

return yijue
