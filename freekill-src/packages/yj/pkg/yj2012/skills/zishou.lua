local zishou = fk.CreateSkill {
  name = "zishou",
}

Fk:loadTranslationTable{
  ["zishou"] = "自守",
  [":zishou"] = "摸牌阶段，你可以额外摸X张牌（X为你已损失的体力值），然后跳过你的出牌阶段。",

  ["$zishou1"] = "荆襄之地，固若金汤。",
  ["$zishou2"] = "江河霸主，何惧之有？",
}

zishou:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zishou.name) and player.phase == Player.Draw and
      player:isWounded()
  end,
  on_use = function(self, event, target, player, data)
    data.n = data.n + player:getLostHp()
    player:skip(Player.Play)
  end,
})

return zishou
