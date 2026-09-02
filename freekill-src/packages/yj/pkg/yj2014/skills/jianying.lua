
local jianying = fk.CreateSkill {
  name = "jianying",
}

Fk:loadTranslationTable{
  ["jianying"] = "渐营",
  [":jianying"] = "当你于出牌阶段内使用牌时，若此牌与本阶段你使用的上一张牌点数或花色相同，你可以摸一张牌。",

  ["@jianying-phase"] = "渐营",

  ["$jianying1"] = "由缓至急，循循而进。",
  ["$jianying2"] = "事需缓图，欲速不达也。",
}

jianying:addEffect(fk.CardUsing, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jianying.name) and
      player.phase == Player.Play and data.extra_data and data.extra_data.jianying
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, jianying.name)
  end,

  can_refresh = function(self, event, target, player, data)
    return target == player and player:hasSkill(jianying.name, true) and player.phase == Player.Play
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local suit, number = data.card:getSuitString(true), data.card.number
    if suit == player:getTableMark("@jianying-phase")[1] or number == player:getTableMark("@jianying-phase")[2] then
      data.extra_data = data.extra_data or {}
      data.extra_data.jianying = true
    end
    room:setPlayerMark(player, "@jianying-phase", { suit, number })
  end,
})

jianying:addLoseEffect(function(self, player)
  player.room:setPlayerMark(player, "@jianying-phase", 0)
end)

local AI = Fk.Ltk.AI
jianying:addAI(AI.reuse("biyue", AI.InvokeStrategy))

return jianying
