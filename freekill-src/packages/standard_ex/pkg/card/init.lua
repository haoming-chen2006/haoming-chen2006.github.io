local extension_card = Package:new("standard_ex_cards", Package.CardPack)
extension_card.extensionName = "standard_ex"
Fk:loadTranslationTable{
  ["standard_ex_cards"] = "界限突破卡牌",
}

extension_card:loadSkillSkels({ require("packages.standard_ex.pkg.card.skills.role__wooden_ox_skill") })

local role__wooden_ox = fk.CreateCard{
  name = "role__wooden_ox",
  type = Card.TypeEquip,
  sub_type = Card.SubtypeTreasure,
  equip_skill = "role__wooden_ox_skill&",

  on_uninstall = function(self, room, player)
    Treasure.onUninstall(self, room, player)
    player:clearSkillHistory("role__wooden_ox_skill&", Player.HistoryPhase)
  end,
}
extension_card:loadCardSkels{ role__wooden_ox }
extension_card:addCardSpec("role__wooden_ox", Card.Diamond, 5)
Fk:loadTranslationTable{
  ["role__wooden_ox"] = "木牛流马",
  [":role__wooden_ox"] = "装备牌·宝物<br/><b>宝物技能</b>：<br/>" ..
  "出牌阶段限一次，你可将一张手牌扣置于装备区里的【木牛流马】下（称为“辎”，“辎”至多有5张），然后你可以将【木牛流马】置入一名"..
  "其他角色的装备区。你可以如手牌般使用或打出“辎”。",
  ["wooden_ox"] = "木牛流马",
  ["role__wooden_ox_skill&"] = "木牛",
  [":role__wooden_ox_skill&"] = "出牌阶段限一次，你可将一张手牌扣置于装备区里的【木牛流马】下（称为“辎”，“辎”至多有5张），"..
  "然后你可以将【木牛流马】置入一名其他角色的装备区。你可以如手牌般使用或打出“辎”。",
  ["#role__wooden_ox-move"] = "你可以将【木牛流马】移动至一名其他角色的装备区",
  ["$role_carriage"] = "辎",
  ["#role__wooden_ox"] = "你可以将一张手牌扣置于【木牛流马】下",
}

return extension_card