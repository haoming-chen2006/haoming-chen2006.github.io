local qingxian = fk.CreateSkill{
  name = "qingxian",
}

Fk:loadTranslationTable{
  ["qingxian"] = "清弦",
  [":qingxian"] = "当你受到伤害/回复体力后，你可以选择一项令伤害来源/一名其他角色执行：1.失去1点体力并"..
  "随机使用牌堆一张装备牌；2.回复1点体力并弃置一张装备牌。若其使用或弃置的牌花色为♣，你回复1点体力。",

  ["#qingxian-invoke"] = "清弦：你可以令 %dest 执行一项",
  ["#qingxian-choose"] = "清弦：你可以令一名角色执行一项",
  ["qingxian_losehp"] = "失去1点体力，使用随机装备",
  ["qingxian_recover"] = "回复1点体力，弃置一张装备",

  ["$qingxian1"] = "抚琴拨弦，悠然自得。",
  ["$qingxian2"] = "寄情于琴，合于天地。",
}

local spec = {
  on_use = function (self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local choice = event:getCostData(self).choice
    local yes = false
    if choice == "qingxian_losehp" then
      room:loseHp(to, 1, qingxian.name)
      if to.dead then return end
      local cards = table.filter(room.draw_pile, function (id)
        local card = Fk:getCardById(id)
        return card.type == Card.TypeEquip and to:canUseTo(card, to)
      end)
      if #cards > 0 then
        local card = Fk:getCardById(room:tableRandomPick(cards))
        yes = card.suit == Card.Club
        room:useCard{
          from = to,
          tos = {to},
          card = card,
        }
      end
    else
      if to:isWounded() then
        room:recover{
          who = to,
          num = 1,
          recoverBy = player,
          skillName = qingxian.name,
        }
      end
      if not to.dead and not to:isNude() then
        local card = room:askToDiscard(to, {
          min_num = 1,
          max_num = 1,
          include_equip = true,
          skill_name = qingxian.name,
          cancelable = false,
          pattern = ".|.|.|.|.|equip",
          skip = true,
        })
        if #card > 0 then
          yes = Fk:getCardById(card[1]).suit == Card.Club
          room:throwCard(card, qingxian.name, to, to)
        end
      end
    end
    if yes and not player.dead and player:isWounded() then
      room:recover{
        who = player,
        num = 1,
        recoverBy = player,
        skillName = qingxian.name,
      }
    end
  end,
}

qingxian:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(qingxian.name) and
      data.from and not data.from.dead 
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "qingxian_active",
      prompt = "#qingxian-invoke::"..data.from.id,
      cancelable = true,
      extra_data = {
        qingxian = true,
      }
    })
    if success and dat then
      event:setCostData(self, {tos = {data.from}, choice = dat.interaction})
      return true
    end
  end,
  on_use = spec.on_use,
})
qingxian:addEffect(fk.HpRecover, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qingxian.name) and
      #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "qingxian_active",
      prompt = "#qingxian-choose",
      cancelable = true,
    })
    if success and dat then
      event:setCostData(self, {tos = dat.targets, choice = dat.interaction})
      return true
    end
  end,
  on_use = spec.on_use,
})

return qingxian
