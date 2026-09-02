local mouLijian = fk.CreateSkill({
  name = "mou__lijian",
})

Fk:loadTranslationTable{
  ["mou__lijian"] = "离间",
  [":mou__lijian"] = "出牌阶段限一次，你可以选择至少两名其他角色并弃置X张牌（X为你选择的角色数-1），" ..
  "然后他们依次对逆时针最近座次的你选择的另一名角色视为使用一张【决斗】。",
  ["#mou__lijian"] = "离间：弃置%arg张牌，令%arg2名角色互相决斗！",

  ["$mou__lijian1"] = "太师若献妾于吕布，妾宁死不受此辱。",
  ["$mou__lijian2"] = "贱妾污浊之身，岂可复侍将军。",
}

mouLijian:addEffect("active", {
  anim_type = "offensive",
  min_card_num = 1,
  min_target_num = 2,
  prompt = function (self, player, selected_cards)
    return "#mou__lijian:::" .. #selected_cards .. ":".. (#selected_cards + 1)
  end,
  can_use = function(self, player)
    return player:usedSkillTimes(mouLijian.name) == 0
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected < #Fk:currentRoom().alive_players and not player:prohibitDiscard(to_select)
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected < #selected_cards + 1 and to_select ~= player
  end,
  feasible = function (self, player, selected, selected_cards)
    return #selected > 1 and #selected == #selected_cards + 1
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    room:throwCard(effect.cards, self.name, player, player)
    local tos = effect.tos
    local targets = table.simpleClone(tos)
    room:sortByAction(tos)
    for _, src in ipairs(tos) do
      if not src.dead then
        if table.contains(targets, src) then
          local dest = src:getNextAlive()
          while not table.contains(tos, dest) do
            dest = dest:getNextAlive()
          end
          if dest == src then break end
          table.removeOne(targets, src)
          room:useVirtualCard("duel", nil, src, dest, self.name)
        else
          break
        end
      end
    end
  end,
})

return mouLijian
