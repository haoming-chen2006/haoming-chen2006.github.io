
local wuyan = fk.CreateSkill {
  name = "nos__wuyan",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["nos__wuyan"] = "无言",
  [":nos__wuyan"] = "锁定技，你使用的非延时类锦囊对其他角色无效；其他角色使用的非延时类锦囊对你无效。",

  ["$nos__wuyan1"] = "嘘，言多必失啊。",
  ["$nos__wuyan2"] = "唉，一切尽在不言中。",
}

wuyan:addEffect(fk.PreCardEffect, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(wuyan.name) and data.card:isCommonTrick() and data.card.name ~= "nullification" then
      if player == data.from then
        return player ~= data.to
      end
      if player == data.to then
        return player ~= data.from
      end
    end
  end,
  on_use = function (self, event, target, player, data)
    data.nullified = true
  end,
})

return wuyan
