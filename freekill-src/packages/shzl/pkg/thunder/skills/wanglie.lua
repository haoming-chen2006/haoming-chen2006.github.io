local wanglie = fk.CreateSkill {
  name = "wangliec",
}

Fk:loadTranslationTable{
  ["wangliec"] = "往烈",
  [":wangliec"] = "出牌阶段，你使用的第一张牌无距离限制。你于出牌阶段使用【杀】或普通锦囊牌时，你可以令此牌无法响应，然后本阶段你不能再使用牌。",

  ["#wangliec-invoke"] = "往烈：你可以令%arg无法响应，然后你本阶段不能再使用牌",
  ["@@wangliec-phase"] = "往烈",

  ["$wangliec1"] = "猛将之烈，统帅之所往。",
  ["$wangliec2"] = "与子龙忠勇相往，猛烈相合。",
}

wanglie:addEffect(fk.CardUsing, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wanglie.name) and player.phase == Player.Play and
      (data.card:isCommonTrick() or data.card.trueName == "slash")
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = wanglie.name,
      prompt = "#wangliec-invoke:::"..data.card:toLogString(),
    })
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@wangliec-phase", 1)
    data.disresponsiveList = data.disresponsiveList or {}
    for _, p in ipairs(player.room.alive_players) do
      table.insertIfNeed(data.disresponsiveList, p)
    end
  end,
})
wanglie:addEffect(fk.AfterCardUseDeclared, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player.phase == Player.Play
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:addPlayerMark(player, "wanglie-phase", 1)
  end,
})
wanglie:addEffect("targetmod", {
  bypass_distances =  function(self, player, skill, card, to)
    return card and player:hasSkill(wanglie.name) and player.phase == Player.Play and player:getMark("wanglie-phase") == 0
  end,
})
wanglie:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    return player:getMark("@@wangliec-phase") > 0
  end,
})

return wanglie
