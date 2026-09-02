local funi = fk.CreateSkill {
  name = "funi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["funi"] = "伏匿",
  [":funi"] = "锁定技，你的攻击范围始终为0；每轮开始时，你令任意名角色获得共计X张【影】（X为存活角色数的一半，向上取整）；"..
  "当一张【影】进入弃牌堆时，你本回合使用牌无距离限制且不能被响应。",

  ["@@funi-turn"] = "伏匿",
  ["#funi-give"] = "伏匿：令任意名角色获得【影】",
}

local U = require "packages.utility.utility"

funi:addEffect(fk.RoundStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(funi.name)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = (#room.alive_players + 1) // 2
    local ids = U.getShade(room, n)
    room:askToYiji(player, {
      cards = ids,
      targets = room.alive_players,
      skill_name = funi.name,
      min_num = #ids,
      max_num = #ids,
      prompt = "#funi-give",
      expand_pile = ids,
    })
  end,
})

funi:addEffect(fk.AfterCardsMove, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(funi.name) and player:getMark("@@funi-turn") == 0 then
      for _, move in ipairs(data) do
        if move.toArea == Card.Void then
          for _, info in ipairs(move.moveInfo) do
            if Fk:getCardById(info.cardId, true).trueName == "shade" then
              return true
            end
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@funi-turn", 1)
  end,
})

funi:addEffect(fk.CardUsing, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:getMark("@@funi-turn") > 0 and
      (data.card.trueName == "slash" or data.card:isCommonTrick())
  end,
  on_use = function(self, event, target, player, data)
    data.disresponsiveList = table.simpleClone(player.room.players)
  end,
})

funi:addEffect("atkrange", {
  final_func = function (self, player)
    if player:hasSkill(funi.name) then
      return 0
    end
  end
})

funi:addEffect("targetmod", {
  bypass_distances = function(self, player, skillName, card, to)
    return card and player:getMark("@@funi-turn") > 0
  end,
})

return funi
