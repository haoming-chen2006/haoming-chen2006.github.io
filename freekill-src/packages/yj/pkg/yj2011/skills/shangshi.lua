
local shangshi = fk.CreateSkill {
  name = "shangshi",
}

Fk:loadTranslationTable{
  ["shangshi"] = "伤逝",
  [":shangshi"] = "当你的手牌数小于你已损失的体力值时，你可以将手牌补至已损失体力值。",

  ["$shangshi1"] = "无情者伤人，有情者自伤。",
  ["$shangshi2"] = "自损八百，可伤敌一千。",
}

local spec = {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shangshi.name) and player:getHandcardNum() < player:getLostHp()
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(player:getLostHp() - player:getHandcardNum(), shangshi.name)
  end,
}

shangshi:addEffect(fk.HpChanged, spec)
shangshi:addEffect(fk.MaxHpChanged, spec)
shangshi:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function (self, event, target, player, data)
    if player:hasSkill(shangshi.name) and player:getHandcardNum() < player:getLostHp() then
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand then
              return true
            end
          end
        end
      end
    end
  end,
  on_use = spec.on_use,
})

return shangshi
