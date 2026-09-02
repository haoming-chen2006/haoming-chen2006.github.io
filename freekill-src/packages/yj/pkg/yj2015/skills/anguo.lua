
local anguo = fk.CreateSkill {
  name = "anguo",
}

Fk:loadTranslationTable{
  ["anguo"] = "安国",
  [":anguo"] = "出牌阶段限一次，你可以选择一名其他角色，令其依次执行：若其手牌数为全场最少，其摸一张牌；体力值为全场最低，回复1点体力；"..
  "装备区内牌数为全场最少，随机使用牌堆中一张装备牌。然后若该角色有未执行的效果且你满足条件，你执行之。",

  ["#anguo"] = "安国：令一名其他角色执行效果",

  ["$anguo1"] = "止干戈，休战事。",
  ["$anguo2"] = "安邦定国，臣子分内之事。",
}

local function doAnguo(player, anguo_type, source)
  local room = player.room
  if anguo_type == "draw" then
    if table.every(room.alive_players, function (p)
        return p:getHandcardNum() >= player:getHandcardNum()
      end) then
      player:drawCards(1, anguo.name)
      return true
    end
  elseif anguo_type == "recover" then
    if player:isWounded() and table.every(room.alive_players, function (p)
        return p.hp >= player.hp
      end) then
      room:recover{
        who = player,
        num = 1,
        recoverBy = source,
        skillName = anguo.name,
      }
      return true
    end
  elseif anguo_type == "equip" then
    if table.every(room.alive_players, function (p)
        return #p:getCardIds("e") >= #player:getCardIds("e")
      end) then
      local cards = {}
      for _, id in ipairs(room.draw_pile) do
        local card = Fk:getCardById(id)
        if card.type == Card.TypeEquip and player:canUseTo(card, player) then
          table.insert(cards, card)
        end
      end
      if #cards > 0 then
        room:useCard({
          from = player,
          tos = {player},
          card = room:tableRandomPick(cards),
        })
        return true
      end
    end
  end
  return false
end

anguo:addEffect("active", {
  anim_type = "support",
  prompt = "#anguo",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
  return player:usedSkillTimes(anguo.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
  return #selected == 0 and to_select ~= player
  end,
  on_use = function(self, room, effect)
  local player = effect.from
  local target = effect.tos[1]
  local types = {"equip", "recover", "draw"}
  for i = 3, 1, -1 do
    if doAnguo(target, types[i], player) then
      table.removeOne(types, types[i])
      if target.dead then
        break
      end
    end
  end
  for i = #types, 1, -1 do
    if player.dead then break end
      doAnguo(player, types[i], player)
    end
  end,
})

return anguo
