local cuibing = fk.CreateSkill {
  name = "cuibing",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["cuibing"] = "摧冰",
  [":cuibing"] = "锁定技，出牌阶段结束时，你将手牌调整至X张（X为你攻击范围内的角色数且至多为5）。若你因此弃置了牌，你弃置场上至多等量张牌；"..
  "否则你跳过弃牌阶段。",

  ["#cuibing-choose"] = "摧冰：你可以弃置一名角色场上的牌（还剩%arg张！）",
  ["#cuibing-discard"] = "摧冰：弃置 %dest 场上至多%arg张牌",
}

cuibing:addEffect(fk.EventPhaseEnd, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(cuibing.name) and player.phase == Player.Play
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(cuibing.name)
    local n = player:getHandcardNum() - math.min(#table.filter(player.room.alive_players, function (p)
      return player:inMyAttackRange(p)
    end), 5)
    if n > 0 then
      room:notifySkillInvoked(player, cuibing.name, "control")
      local cards = room:askToDiscard(player, {
        min_num = n,
        max_num = n,
        include_equip = false,
        skill_name = cuibing.name,
        cancelable = false,
      })
      if #cards > 0 and not player.dead then
        n = #cards
        if n > 0 then
          while n > 0 and not player.dead do
            local targets = table.filter(room.alive_players, function (p)
              return #p:getCardIds("ej") > 0
            end)
            if #targets == 0 then return end
            local to = room:askToChoosePlayers(player, {
              skill_name = cuibing.name,
              min_num = 1,
              max_num = 1,
              targets = targets,
              prompt = "#cuibing-choose:::"..n,
            })
            if #to > 0 then
              to = to[1]
              cards = room:askToChooseCards(player, {
                min = 1,
                max = n,
                target = to,
                flag = "ej",
                skill_name = cuibing.name,
                prompt = "#cuibing-discard::"..to.id..":"..n,
              })
              n = n - #cards
              room:throwCard(cards, cuibing.name, to, player)
            else
              return
            end
          end
        else
          player:skip(Player.Discard)
        end
      end
    else
      if n < 0 then
        room:notifySkillInvoked(player, cuibing.name, "drawcard")
        player:drawCards(-n, cuibing.name)
      elseif n == 0 then
        room:notifySkillInvoked(player, cuibing.name, "defensive")
      end
      player:skip(Player.Discard)
    end
  end,
})

return cuibing
