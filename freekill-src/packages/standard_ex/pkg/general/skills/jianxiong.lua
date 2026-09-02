
Fk:loadTranslationTable{
  ["ex__jianxiong"] = "奸雄",
  [":ex__jianxiong"] = "当你受到伤害后，你可以获得对你造成伤害的牌并摸一张牌。",

  ["$ex__jianxiong1"] = "燕雀，安知鸿鹄之志！",
  ["$ex__jianxiong2"] = "夫英雄者，胸怀大志，腹有良谋！",
}

local jianxiong = fk.CreateSkill{
  name = "ex__jianxiong",
}

jianxiong:addEffect(fk.Damaged, {
  anim_type = "masochism",
  on_use = function(self, event, target, player, data)
    if data.card and player.room:getCardArea(data.card) == Card.Processing then
      player.room:obtainCard(player, data.card, true, fk.ReasonJustMove, player, jianxiong.name)
    end
    if not player.dead then
      player:drawCards(1, jianxiong.name)
    end
  end,
})

return jianxiong
