local shenfen = fk.CreateSkill {
  name = "shenfen",
}

Fk:loadTranslationTable{
  ["shenfen"] = "神愤",
  [":shenfen"] = "出牌阶段限一次，你可以弃6枚“暴怒”，对所有其他角色各造成1点伤害，然后这些角色各弃置其装备区里的所有牌，"..
  "各弃置四张手牌，最后你翻面。",

  ["#shenfen"] = "神愤：弃6枚暴怒，对所有角色造成伤害并弃牌！",

  ["$shenfen1"] = "凡人们，颤抖吧！这是神之怒火！",
  ["$shenfen2"] = "这，才是活生生的地狱！",
}

shenfen:addEffect("active", {
  anim_type = "big",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(shenfen.name, Player.HistoryPhase) == 0 and player:getMark("@baonu") > 5 and
      #Fk:currentRoom().alive_players > 1
  end,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    room:removePlayerMark(player, "@baonu", 6)
    local tos = room:getOtherPlayers(player)
    room:doIndicate(effect.from.id, table.map(tos, Util.IdMapper))
    for _, p in ipairs(tos) do
      if not p.dead then
        room:damage{
          from = player,
          to = p,
          damage = 1,
          skillName = shenfen.name,
        }
      end
    end
    for _, p in ipairs(tos) do
      if not p.dead then
        p:throwAllCards("e")
      end
    end
    for _, p in ipairs(tos) do
      if not p.dead then
        room:askToDiscard(p, {
          min_num = 4,
          max_num = 4,
          include_equip = false,
          skill_name = shenfen.name,
          cancelable = false,
        })
      end
    end
    if not player.dead then
      player:turnOver()
    end
  end
})

return shenfen
