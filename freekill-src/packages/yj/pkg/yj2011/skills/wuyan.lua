
local wuyan = fk.CreateSkill {
  name = "wuyan",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["wuyan"] = "无言",
  [":wuyan"] = "锁定技，你防止你造成或受到的任何锦囊牌的伤害。",

  ["$wuyan1"] = "吾，誓不为汉贼献一策！",
  ["$wuyan2"] = "汝有良策，何必问我！",
}

local spec = {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wuyan.name) and
      data.card and data.card.type == Card.TypeTrick
  end,
  on_use = function (self, event, target, player, data)
    data:preventDamage()
  end,
}

wuyan:addEffect(fk.DetermineDamageCaused, spec)
wuyan:addEffect(fk.DetermineDamageInflicted, spec)

return wuyan
