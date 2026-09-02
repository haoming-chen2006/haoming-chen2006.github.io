local zhuhuanh = fk.CreateSkill {
  name = "zhuhuanh",
}

Fk:loadTranslationTable{
  ["zhuhuanh"] = "诛宦",
  [":zhuhuanh"] = "准备阶段，你可以展示所有手牌并弃置所有【杀】，然后令一名其他角色选择一项：1.受到1点伤害，然后弃置等量的牌；"..
  "2.你回复1点体力，然后摸等量的牌。",

  ["#zhuhuanh-invoke"] = "诛宦：你可以展示手牌并弃置所有【杀】，令一名角色选择受到伤害并弃牌/你回复体力并摸牌",
  ["#zhuhuanh-choose"] = "诛宦：令一名角色选择：受到1点伤害并弃置%arg张牌 / 你回复1点体力并摸%arg张牌",
  ["zhuhuanh_damage"] = "受到1点伤害并弃置%arg牌",
  ["zhuhuanh_recover"] = "%dest回复1点体力并摸%arg牌",

  ["$zhuhuanh1"] = "杀了你们，天下都是我说了算！",
  ["$zhuhuanh2"] = "整顿天下，为国除害！",
}

zhuhuanh:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhuhuanh.name) and player.phase == Player.Start and
      not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = zhuhuanh.name,
      prompt = "#zhuhuanh-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = player:getCardIds("h")
    player:showCards(cards)
    if player.dead then return end

    cards = table.filter(cards, function (id)
      return table.contains(player:getCardIds("h"), id) and Fk:getCardById(id).trueName == "slash" and not player:prohibitDiscard(id)
    end)
    local n = #cards
    if n > 0 then
      room:throwCard(cards, zhuhuanh.name, player, player)
    end
    if player.dead or #room:getOtherPlayers(player, false) == 0 then return end

    local to = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = 1,
      prompt = "#zhuhuanh-choose:::"..n,
      skill_name = zhuhuanh.name,
      cancelable = false,
    })[1]

    local choice = room:askToChoice(to, {
      choices = {"zhuhuanh_damage:::"..n, "zhuhuanh_recover::"..player.id..":"..n},
      skill_name = zhuhuanh.name,
    })
    if choice:startsWith("zhuhuanh_damage") then
      room:damage{
        from = player,
        to = to,
        damage = 1,
        skillName = zhuhuanh.name,
      }
      if not to.dead then
        room:askToDiscard(to, {
          min_num = n,
          max_num = n,
          include_equip = true,
          skill_name = zhuhuanh.name,
          cancelable = false,
        })
      end
    else
      if player:isWounded() then
        room:recover{
          who = player,
          num = 1,
          recoverBy = player,
          skillName = zhuhuanh.name,
        }
      end
      if not player.dead and n > 0 then
        player:drawCards(n, zhuhuanh.name)
      end
    end
  end,
})

return zhuhuanh
