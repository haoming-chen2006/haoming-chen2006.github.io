local miji = fk.CreateSkill {
  name = "miji",
}

Fk:loadTranslationTable{
  ["miji"] = "秘计",
  [":miji"] = "结束阶段，你可以摸X张牌（X为你已损失体力值），然后你可以将等量手牌分配给其他角色。",

  ["#miji-give"] = "秘计：是否将%arg张手牌分配给其他角色？",

  ["$miji1"] = "此计，可歼敌精锐！",
  ["$miji2"] = "此举，可破敌之围！"
}

miji:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(miji.name) and player.phase == Player.Finish and
      player:isWounded()
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = player:getLostHp()
    player:drawCards(n, miji.name)
    if player.dead then return end
    local handCards = player:getCardIds("h")
    if #handCards >= n then
      room:askToYiji(player, {
        skill_name = miji.name,
        min_num = n,
        max_num = n,
        cards = handCards,
        targets = room:getOtherPlayers(player, false),
        cancelable = true,
      })
    end
  end,
})

return miji
