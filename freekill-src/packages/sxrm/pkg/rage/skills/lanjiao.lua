
local lanjiao = fk.CreateSkill {
  name = "lanjiao",
}

Fk:loadTranslationTable{
  ["lanjiao"] = "揽娇",
  [":lanjiao"] = "出牌阶段对每名角色限一次，你可以展示一名其他角色两张手牌，然后你获得展示的牌；其可以于展示时失去1点体力并摸一张牌，令你重新展示。"..
  "若你一回合内因此获得过<font color='red'>♥</font>和<font color='red'>♦</font>牌，此技能本回合失效。",

  ["#lanjiao"] = "揽娇：展示并获得一名其他角色两张手牌",
  ["#lanjiao-draw"] = "揽娇：是否失去1点体力并摸一张牌，令 %src 重新展示你的手牌？",
}

lanjiao:addEffect("active", {
  anim_type = "offensive",
  prompt = "#lanjiao",
  card_num = 0,
  target_num = 1,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and to_select ~= player and to_select:getHandcardNum() > 1 and
      not table.contains(player:getTableMark("lanjiao-phase"), to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMark(player, "lanjiao-phase", target)
    local cards = {}
    while true do
      if player.dead or target:getHandcardNum() < 2 then return end
      cards = room:askToChooseCards(player, {
        min = 2,
        max = 2,
        target = target,
        flag = "h",
        skill_name = lanjiao.name,
      })
      target:showCards(cards)
      if target.dead then return end
      if room:askToSkillInvoke(target, {
        skill_name = lanjiao.name,
        prompt = "#lanjiao-draw:"..player.id,
      }) then
        room:loseHp(target, 1, lanjiao.name)
        if target.dead then return end
        target:drawCards(1, lanjiao.name)
        cards = {}
      else
        break
      end
    end
    for _, id in ipairs(cards) do
      room:addTableMarkIfNeed(player, "lanjiao_suit-phase", Fk:getCardById(id).suit)
    end
    if table.contains(player:getTableMark("lanjiao_suit-phase"), Card.Heart) and
      table.contains(player:getTableMark("lanjiao_suit-phase"), Card.Diamond) then
      room:invalidateSkill(player, lanjiao.name, "-turn")
    end
    room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonPrey, lanjiao.name, nil, true, player)
  end,
})

return lanjiao
