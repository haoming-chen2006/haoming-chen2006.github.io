local liegong = fk.CreateSkill({
  name = "liegong",
})

Fk:loadTranslationTable{
  ["liegong"] = "烈弓",
  [":liegong"] = "当你于出牌阶段内使用【杀】指定一个目标后，若其手牌数不小于你的体力值或不大于你的攻击范围，则你可以令其不能使用【闪】响应此【杀】。",

  ["$liegong1"] = "百步穿杨！",
  ["$liegong2"] = "中！",
}

liegong:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(liegong.name) and
      data.card.trueName == "slash" and player.phase == Player.Play and
      (data.to:getHandcardNum() <= player:getAttackRange() or data.to:getHandcardNum() >= player.hp)
  end,
  on_use = function(self, event, target, player, data)
    data.disresponsive = true
  end,
})

return liegong
