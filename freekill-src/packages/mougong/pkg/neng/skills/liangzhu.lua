
local liangzhu = fk.CreateSkill({
  name = "mou__liangzhu",
  tags = { Skill.AttachedKingdom, Skill.Compulsory },
  attached_kingdom = { "shu" },
})

Fk:loadTranslationTable{
  ["mou__liangzhu"] = "良助",
  [":mou__liangzhu"] = "蜀势力技，锁定技，你或结姻角色回复体力后，对方摸一张牌。<br>"..
  "出牌阶段结束时，若你已受伤，你回复1点体力；否则你观看三张装备牌，然后选择一张交给结姻角色（若其对应装备栏空置则使用之）。",

  ["#mou__liangzhu-ask"] = "良助：选择一张装备交给 %dest",

  ["$mou__liangzhu1"] = "助君得胜战，跃马提缨枪！",
  ["$mou__liangzhu2"] = "平贼成君业，何惜上沙场！",
}

liangzhu:addEffect(fk.HpRecover, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(liangzhu.name) then
      if target == player then
        return player:getMark("@[chara]mou__jieyin") ~= 0 and
          not player.room:getPlayerById(player:getMark("@[chara]mou__jieyin")).dead
      else
        return player:getMark("@[chara]mou__jieyin") == target.id
      end
    end
  end,
  on_use = function (self, event, target, player, data)
    if target == player then
      player.room:getPlayerById(player:getMark("@[chara]mou__jieyin")):drawCards(1, liangzhu.name)
    else
      player:drawCards(1, liangzhu.name)
    end
  end,
})

liangzhu:addEffect(fk.EventPhaseEnd, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(liangzhu.name) and player.phase == Player.Play
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player:isWounded() then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = liangzhu.name,
      }
    else
      local to = room:getPlayerById(player:getMark("@[chara]mou__jieyin"))
      local cards = room:getCardsFromPileByRule(".|.|.|.|.|equip", 3)
      if #cards > 0 then
        local card = room:askToCards(player, {
          skill_name = liangzhu.name,
          min_num = 1,
          max_num = 1,
          include_equip = false,
          pattern = tostring(Exppattern{ id = cards }),
          prompt = "#mou__liangzhu-ask::"..to.id,
          expand_pile = cards,
          cancelable = false,
        })
        room:moveCardTo(card, Card.PlayerHand, to, fk.ReasonGive, liangzhu.name, nil, false, player)
        if table.contains(to:getCardIds("h"), card[1]) and to:canMoveCardIntoEquip(card[1], false) then
          card = Fk:getCardById(card[1])
          if to:canUseTo(card, to) then
            room:useCard({
              from = to,
              tos = { to },
              card = card,
            })
          end
        end
      end
    end
  end,
})

return liangzhu
