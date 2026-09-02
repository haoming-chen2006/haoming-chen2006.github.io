local zhiyu = fk.CreateSkill {
  name = "zhiyu",
}

Fk:loadTranslationTable{
  ["zhiyu"] = "智愚",
  [":zhiyu"] = "当你受到伤害后，你可以摸一张牌，然后展示所有手牌，若颜色均相同，来源弃置一张手牌。",

  ["$zhiyu1"] = "大勇若怯，大智如愚。",
  ["$zhiyu2"] = "愚者既出，智者何存？",
}

zhiyu:addEffect(fk.Damaged, {
  anim_type = "masochism",
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:drawCards(1, zhiyu.name)
    if player.dead then return end
    local cards = player:getCardIds("h")
    if #cards > 0 then
      player:showCards(cards)
    end
    if data.from and not data.from.dead and not data.from:isKongcheng() and
      (#cards == 0 or
      table.every(cards, function(id)
        return Fk:getCardById(id).color == Fk:getCardById(cards[1]).color
      end)) then
      room:askToDiscard(data.from, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = zhiyu.name,
        cancelable = false,
      })
    end
  end,
})

local AI = Fk.Ltk.AI
zhiyu:addAI(AI.reuse("biyue", AI.InvokeStrategy))

return zhiyu
