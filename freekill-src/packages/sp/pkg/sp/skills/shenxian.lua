
local shenxian = fk.CreateSkill {
  name = "shenxian",
}

Fk:loadTranslationTable{
  ["shenxian"] = "甚贤",
  [":shenxian"] = "你的回合外，当有其他角色因弃置而失去牌时，若其中有基本牌，你可以摸一张牌。",

  ["$shenxian1"] = "愿尽己力，为君分忧。",
  ["$shenxian2"] = "抚慰军心，以安国事。",
}

shenxian:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(shenxian.name) and player.room.current ~= player then
      for _, move in ipairs(data) do
        if move.moveReason == fk.ReasonDiscard and move.from ~= player then
          for _, info in ipairs(move.moveInfo) do
            if Fk:getCardById(info.cardId).type == Card.TypeBasic then
              return true
            end
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, shenxian.name)
  end,
})

return shenxian
