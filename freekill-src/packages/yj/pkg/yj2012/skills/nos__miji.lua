local miji = fk.CreateSkill {
  name = "nos__miji",
}

Fk:loadTranslationTable{
  ["nos__miji"] = "秘计",
  [":nos__miji"] = "准备阶段或结束阶段开始时，若你已受伤，你可以进行一次判定：若结果为黑色，你观看牌堆顶的X张牌（X为你已损失的体力值），"..
  "然后将这些牌交给一名角色。",

  ["#nos__miji-choose"] = "秘计：选择一名角色获得“秘计”牌",

  ["$nos__miji1"] = "奇谋，只在绝境中诞生！",
  ["$nos__miji2"] = "我将尽我所能！",
}

local U = require "packages.utility.utility"

miji:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(miji.name) and player:isWounded() and
      (player.phase == Player.Start or player.phase == Player.Finish)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = {
      who = player,
      reason = miji.name,
      pattern = ".|.|spade,club",
    }
    room:judge(judge)
    if judge:matchPattern() and not player.dead then
      local cards = room:getNCards(player:getLostHp())
      room:viewCards(player, {
        cards = cards,
        skill_name = miji.name
      })
      local to = room:askToChoosePlayers(player, {
        skill_name = miji.name,
        min_num = 1,
        max_num = 1,
        targets = room.alive_players,
        prompt = "#nos__miji-choose",
        cancelable = false,
      })
      room:obtainCard(to[1], cards, true, fk.ReasonGive, player, miji.name)
    end
  end,
})

return miji
