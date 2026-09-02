local fuyin = fk.CreateSkill {
  name = "nos__fuyin",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["nos__fuyin"] = "父荫",
  [":nos__fuyin"] = "锁定技，若你的装备区里没有防具牌，手牌数不小于你的其他角色不能使用【杀】、【决斗】或【火攻】指定你为目标。",

  ["$nos__fuyin1"] = "承先父之名，破敌锐气。",
  ["$nos__fuyin2"] = "效先父行险，阻敌先锋。",
}

fuyin:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    return from and to:hasSkill(fuyin.name) and #to:getEquipments(Card.SubtypeArmor) == 0 and
      from ~= to and from:getHandcardNum() >= to:getHandcardNum() and
      card and table.contains({"slash", "duel", "fire_attack"}, card.trueName)
  end,
})

return fuyin
