local songci = fk.CreateSkill {
  name = "songci",
}

Fk:loadTranslationTable{
  ["songci"] = "颂词",
  [":songci"] = "出牌阶段，你可以选择一项：令一名手牌数小于体力值的角色摸两张牌；或令一名手牌数大于体力值的角色弃置两张牌。"..
  "此技能对每名角色只能用一次。",

  ["#songci"] = "颂词：令一名手牌数小于体力值的角色摸两张牌，或令一名手牌数大于体力值的角色弃两张牌",
  ["$songci1"] = "将军德才兼备，大汉之栋梁也！",
  ["$songci2"] = "汝窃国奸贼，人人得而诛之！",
}

songci:addEffect("active", {
  anim_type = "control",
  prompt = "#songci",
  mute = true,
  card_num = 0,
  target_num = 1,
  can_use = Util.TrueFunc,
  card_filter = Util.FalseFunc,
  target_tip = function (self, player, to_select, selected, selected_cards, card, selectable, extra_data)
    if table.contains(player:getTableMark(songci.name), to_select.id) then
      return nil
    elseif to_select:getHandcardNum() < to_select.hp then
      return { {content = "draw" , type = "normal"} }
    elseif to_select:getHandcardNum() > to_select.hp then
      return { {content = "discard", type = "warning"} }
    end
  end,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and not table.contains(player:getTableMark(songci.name), to_select.id)
      and to_select:getHandcardNum() ~= to_select.hp
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:addTableMark(player, songci.name, target.id)
    if target:getHandcardNum() < target.hp then
      player:broadcastSkillInvoke(songci.name, 1)
      target:drawCards(2, songci.name)
    else
      player:broadcastSkillInvoke(songci.name, 2)
      room:askToDiscard(target, {
        min_num = 2,
        max_num = 2,
        include_equip = true,
        skill_name = songci.name,
        cancelable = false,
      })
    end
  end,
})

return songci
