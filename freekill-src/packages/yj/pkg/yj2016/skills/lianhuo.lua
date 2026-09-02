
local lianhuo = fk.CreateSkill {
  name = "lianhuo",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["lianhuo"] = "链祸",
  [":lianhuo"] = "锁定技，当你受到火焰伤害时，若你处于连环状态且你是传导伤害的起点，则此伤害+1。",

  ["$lianhuo1"] = "用那剩下的铁石，正好做些工事。",
  ["$lianhuo2"] = "筑下这铁链，江东天险牢不可破！",
}

lianhuo:addEffect(fk.DamageInflicted, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(lianhuo.name) and
      data.damageType == fk.FireDamage and player.chained and not data.chain
  end,
  on_use = function(self, event, target, player, data)
    player.room:setEmotion(player, "./packages/maneuvering/image/anim/vineburn")
    data:changeDamage(1)
  end,
})

return lianhuo
