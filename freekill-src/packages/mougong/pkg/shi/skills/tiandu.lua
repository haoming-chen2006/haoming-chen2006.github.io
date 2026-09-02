
local tiandu = fk.CreateSkill({
  name = "mou__tiandu",
  tags = { Skill.Switch },
})

Fk:loadTranslationTable{
  ["mou__tiandu"] = "天妒",
  [":mou__tiandu"] = "转换技，出牌阶段开始时，阳：你可以弃置两张手牌并记录这些牌的花色，然后可以视为使用任意普通锦囊牌；"..
  "阴：你判定，若结果为你记录过的花色，你受到1点无来源伤害。当此次判定的结果确定后，你获得判定牌。",

  [":mou__tiandu_yang"] = "转换技，出牌阶段开始时，"..
  "<font color=\"#E0DB2F\">阳：你可以弃置两张手牌并记录这些牌的花色，然后可以视为使用任意普通锦囊牌；</font>"..
  "<font color=\"gray\">阴：你判定，若结果为你记录过的花色，你受到1点无来源伤害。当此次判定的结果确定后，你获得判定牌。</font>",
  [":mou__tiandu_yin"] = "转换技，出牌阶段开始时，"..
  "<font color=\"gray\">阳：你可以弃置两张手牌并记录这些牌的花色，然后可以视为使用任意普通锦囊牌；</font>"..
  "<font color=\"#E0DB2F\">阴：你判定，若结果为你记录过的花色，你受到1点无来源伤害。当此次判定的结果确定后，你获得判定牌。</font>",

  ["#mou__tiandu-invoke"] = "天妒：你可以弃置两张手牌，视为使用任意普通锦囊牌",
  ["@[suits]mou__tiandu"] = "天妒",

  ["$mou__tiandu1"] = "顺应天命，即为大道所归。",
  ["$mou__tiandu2"] = "计高于人，为天所妒。",
}

local U = require "packages.utility.utility"

tiandu:addEffect(fk.EventPhaseStart, {
  anim_type = "switch",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(tiandu.name) and
      player == target and
      player.phase == Player.Play and
      (player:getSwitchSkillState(tiandu.name, false) == fk.SwitchYin or player:getHandcardNum() > 1)
  end,
  on_cost = function(self, event, target, player, data)
    if player:getSwitchSkillState(tiandu.name, false) == fk.SwitchYang then
      local cards = player.room:askToDiscard(player, {
        min_num = 2,
        max_num = 2,
        include_equip = false,
        skill_name = tiandu.name,
        pattern = ".",
        prompt = "#mou__tiandu-invoke",
        cancelable = true,
        skip = true,
      })
      if #cards > 0 then
        event:setCostData(self, { cards = cards, audio_index = 1 })
        return true
      end
    else
      event:setCostData(self, { audio_index = 2 })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player:getSwitchSkillState(tiandu.name, true) == fk.SwitchYang then
      local cards = event:getCostData(self).cards or {}
      for _, id in ipairs(cards) do
        local suit = Fk:getCardById(id).suit
        if suit ~= Card.NoSuit then
          room:addTableMarkIfNeed(player, "@[suits]mou__tiandu", suit)
        end
      end
      room:throwCard(cards, tiandu.name, player, player)
      if player.dead then return end
      room:askToUseVirtualCard(player, {
        name = Fk:getAllCardNames("t"),
        skill_name = tiandu.name,
        prompt = "#mou__tiandu-use",
        cancelable = true,
      })
    else
      local suits = player:getTableMark("@[suits]mou__tiandu")
      local judge_pattern = table.concat(table.map(suits, function (suit)
        return U.ConvertSuit(suit, "int", "str")
      end), ",")
      local judge = {
        who = player,
        reason = tiandu.name,
        pattern = ".|.|".. judge_pattern,
      }
      room:judge(judge)
      if judge.card and table.contains(suits, judge.card.suit) and not player.dead then
        room:damage{
          to = player,
          damage = 1,
          skillName = tiandu.name,
        }
      end
    end
  end,
})

tiandu:addEffect(fk.FinishJudge, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and not player.dead and
      data.reason == tiandu.name and player.room:getCardArea(data.card) == Card.Processing
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, data.card, true)
  end,
})

tiandu:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@[suits]mou__tiandu", 0)
end)

return tiandu
