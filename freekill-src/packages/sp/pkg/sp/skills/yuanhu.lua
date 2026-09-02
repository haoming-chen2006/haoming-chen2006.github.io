local yuanhu = fk.CreateSkill {
  name = "yuanhu",
}

Fk:loadTranslationTable {
  ["yuanhu"] = "援护",
  [":yuanhu"] = "结束阶段，你可以将一张装备牌置于一名角色的装备区里，然后根据此装备牌的种类执行以下效果：<br>武器牌：弃置与该角色距离为1的"..
  "一名角色区域中的一张牌；<br>防具牌：该角色摸一张牌；<br>坐骑牌：该角色回复1点体力。",

  ["#yuanhu-invoke"] = "援护：你可以将一张装备牌置入一名角色的装备区",
  ["#yuanhu-choose"] = "援护：弃置 %dest 距离1的一名角色区域中的一张牌",

  ["$yuanhu1"] = "将军，这件兵器可还趁手？",
  ["$yuanhu2"] = "刀剑无眼，须得小心防护。",
  ["$yuanhu3"] = "宝马配英雄！哈哈哈哈……",
}

yuanhu:addEffect(fk.EventPhaseStart, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yuanhu.name) and player.phase == Player.Finish and
      not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "yuanhu_active",
      prompt = "#yuanhu-invoke",
      cancelable = true,
    })
    if success and dat then
      event:setCostData(self, { cards = dat.cards, tos = dat.targets })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:notifySkillInvoked(player, yuanhu.name, "support", event:getCostData(self).tos)
    local to = event:getCostData(self).tos[1]
    local card = Fk:getCardById(event:getCostData(self).cards[1])
    room:moveCardIntoEquip(to, event:getCostData(self).cards[1], yuanhu.name, false, player)
    if to.dead then return end
    if card.sub_type == Card.SubtypeWeapon then
      player:broadcastSkillInvoke(yuanhu.name, 1)
      local targets = table.filter(room.alive_players, function (p)
        return p:distanceTo(to) == 1 and not p:isAllNude()
      end)
      if table.contains(targets, player) then
        if not table.find(player:getCardIds("hej"), function (id)
          return player:prohibitDiscard(id)
        end) then
          table.removeOne(targets, player)
        end
      end
      if #targets == 0 or player.dead then return end
      local p = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#yuanhu-choose::" .. to.id,
        skill_name = yuanhu.name,
        cancelable = false,
      })[1]
      if p == player then
        local cards = table.filter(player:getCardIds("hej"), function (id)
          return not player:prohibitDiscard(id)
        end)
        cards = room:askToCards(player, {
          min_num = 1,
          max_num = 1,
          include_equip = true,
          skill_name = yuanhu.name,
          pattern = tostring(Exppattern{ id = cards }),
          expand_pile = player:getCardIds("j"),
          cancelable = false,
        })
        room:throwCard(cards, yuanhu.name, player, player)
      else
        local id = room:askToChooseCard(player, {
          target = p,
          flag = "hej",
          skill_name = yuanhu.name,
        })
        room:throwCard(id, yuanhu.name, p, player)
      end
    elseif card.sub_type == Card.SubtypeArmor then
      player:broadcastSkillInvoke("yuanhu", 2)
      to:drawCards(1, yuanhu.name)
    elseif card.sub_type == Card.SubtypeOffensiveRide or card.sub_type == Card.SubtypeDefensiveRide then
      player:broadcastSkillInvoke("yuanhu", 3)
      if to:isWounded() then
        room:recover{
          who = to,
          num = 1,
          recoverBy = player,
          skillName = yuanhu.name,
        }
      end
    end
  end,
})

return yuanhu
