local mouShipo = fk.CreateSkill({
  name = "mou__shipo",
})

Fk:loadTranslationTable{
  ["mou__shipo"] = "势迫",
  [":mou__shipo"] = "结束阶段，你可以令一名体力值小于你的角色或所有判定区里有【兵粮寸断】的其他角色选择一项：1.交给你一张手牌，且你可以将此牌交给一名其他角色；2.受到1点伤害。",
  ["mou__shipo_choice1"] = "选择一名体力值小于你的角色",
  ["mou__shipo_choice2"] = "所有判定区里有【兵粮寸断】的其他角色",
  ["#mou__shipo-choose"] = "选择“势迫”的目标",
  ["#mou__shipo-give"] = "势迫：你须交给%dest一张手牌，否则受到1点伤害",
  ["#mou__shipo-present"] = "势迫：你可以将%arg交给一名其他角色",

  ["$mou__shipo1"] = "已向尔等陈明利害，奉劝尔等早日归降！",
  ["$mou__shipo2"] = "此时归降或可封赏，即至城破必斩无赦！",
}

mouShipo:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(mouShipo.name) and player.phase == Player.Finish then
      return table.find(player.room:getOtherPlayers(player, false), function (p) return p.hp < player.hp or p:hasDelayedTrick("supply_shortage") end)
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets1 = table.filter(player.room.alive_players, function (p) return p.hp < player.hp end)
    local targets2 = table.filter(player.room:getOtherPlayers(player), function (p) return p:hasDelayedTrick("supply_shortage") end)
    local choices = {}
    if #targets1 > 0 then table.insert(choices, "mou__shipo_choice1") end
    if #targets2 > 0 then table.insert(choices, "mou__shipo_choice2") end

    ---@type string
    local skillName = mouShipo.name
    local choice = room:askToChoice(player, { choices = choices, skill_name = skillName, prompt = "#mou__shipo-choose" })
    local targets = {}
    if choice == "mou__shipo_choice2" then
      targets = targets2
    else
      local tos = room:askToChoosePlayers(
        player,
        {
          targets = targets1,
          min_num = 1,
          max_num = 1,
          prompt = "#mou__shipo-choose",
          skill_name = skillName,
          cancelable = false,
        }
      )
      targets = { tos[1] }
    end
    for _, to in ipairs(targets) do
      if player.dead then break end
      local card = room:askToCards(
        to,
        {
          min_num = 1,
          max_num = 1,
          include_equip = false,
          skill_name = skillName,
          cancelable = true,
          pattern = ".",
          prompt = "#mou__shipo-give::" .. player.id
        }
      )
      if #card > 0 then
        local get = card[1]
        room:obtainCard(player, get, false, fk.ReasonGive)
        if room:getCardArea(get) == Card.PlayerHand and room:getCardOwner(get) == player then
          local tos = room:askToChoosePlayers(
            player,
            {
              targets = room:getOtherPlayers(player, false),
              min_num = 1,
              max_num = 1,
              prompt = "#mou__shipo-present:::" .. Fk:getCardById(get):toLogString(),
              skill_name = skillName,
              cancelable = true
            }
          )
          if #tos > 0 then
            room:obtainCard(tos[1], get, false, fk.ReasonGive)
          end
        end
      else
        room:damage { from = player, to = to, damage = 1, skillName = skillName }
      end
    end
  end,
})

return mouShipo
