local zuilun = fk.CreateSkill {
  name = "nos__zuilun",
}

Fk:loadTranslationTable{
  ["nos__zuilun"] = "罪论",
  [":nos__zuilun"] = "出牌阶段，你可以获得一名其他角色的一张牌（手牌、装备区各限一次），然后该角色摸一张牌。",

  ["#nos__zuilun"] = "罪论：获得一名其他角色一张牌，然后其摸一张牌",
  ["#nos__zuilun-prey"] = "罪论：获得 %dest 一张牌",

  ["$nos__zuilun1"] = "吾有三罪，何颜可见先父？",
  ["$nos__zuilun2"] = "坐失兵机，其罪在我。",
}

zuilun:addEffect("active", {
  anim_type = "control",
  prompt = "#nos__zuilun",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:getMark("nos__zuilun1-phase") == 0 or player:getMark("nos__zuilun2-phase") == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function (self, player, to_select, selected)
    if #selected == 0 and to_select ~= player then
      if player:getMark("nos__zuilun1-phase") == 0 then
        if not to_select:isKongcheng() then
          return true
        end
      end
      if player:getMark("nos__zuilun2-phase") == 0 then
        if #to_select:getCardIds("e") > 0 then
          return true
        end
      end
    end
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local flag = "he"
    if player:getMark("nos__zuilun1-phase") > 0 then
      flag = "e"
    end
    if player:getMark("nos__zuilun2-phase") > 0 then
      flag = "h"
    end
    local card = room:askToChooseCard(player, {
      target = target,
      flag = flag,
      skill_name = zuilun.name,
      prompt = "#nos__zuilun-prey::"..target.id
    })
    if table.contains(target:getCardIds("h"), card) then
      room:setPlayerMark(player, "nos__zuilun1-phase", 1)
    else
      room:setPlayerMark(player, "nos__zuilun2-phase", 1)
    end
    room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonPrey, zuilun.name, nil, flag == "e")
    if target:isAlive() then
      target:drawCards(1, zuilun.name)
    end
  end,
})

return zuilun
