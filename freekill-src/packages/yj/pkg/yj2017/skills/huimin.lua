local huimin = fk.CreateSkill {
  name = "huimin",
}

Fk:loadTranslationTable{
  ["huimin"] = "惠民",
  [":huimin"] = "结束阶段，你可以摸X张牌（X为手牌数小于体力值的角色数），然后展示等量的手牌，从你指定的一名角色开始，这些角色依次获得其中一张。",

  ["#huimin-invoke"] = "惠民：摸%arg张牌并展示等量手牌，令手牌数小于体力值的角色获得",
  ["#huimin-show"] = "惠民：请展示%arg张手牌，从你指定的角色开始，手牌数小于体力值的角色依次获得其中一张",
  ["#huimin-choose"] = "惠民：指定第一个选牌的角色",

  ["$huimin1"] = "悬壶济世，施医救民。",
  ["$huimin2"] = "心系百姓，惠布山阳。",
}

huimin:addEffect(fk.EventPhaseStart, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(huimin.name) and player.phase == Player.Finish and
      table.find(player.room.alive_players, function(p)
        return p:getHandcardNum() < p.hp
      end)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local n = #table.filter(room.alive_players, function(p)
      return p:getHandcardNum() < p.hp
    end)
    return room:askToSkillInvoke(player, {
      skill_name = huimin.name,
      prompt = "#huimin-invoke:::" .. n,
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return p:getHandcardNum() < p.hp
    end)
    player:drawCards(#targets, huimin.name)
    if player.dead or player:isKongcheng() then return end
    local cards = room:askToCards(player, {
      skill_name = huimin.name,
      include_equip = false,
      min_num = #targets,
      max_num = #targets,
      prompt = "#huimin-show:::" .. #targets,
      cancelable = false,
    })
    player:showCards(cards)
    if player.dead or player:isKongcheng() then return end
    targets = table.filter(targets, function (p)
      return not p.dead
    end)
    if #targets == 0 then return end
    local temp = room:askToChoosePlayers(player, {
      skill_name = huimin.name,
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#huimin-choose",
      cancelable = false,
    })[1]
    while #cards > 0 and #targets > 0 and not player.dead do
      if table.contains(targets, temp) then
        table.removeOne(targets, temp)
        local card = room:askToChooseCard(temp, {
          target = player,
          flag = { card_data = {{ huimin.name, cards }} },
          skill_name = huimin.name,
        })
        table.removeOne(cards, card)
        room:obtainCard(temp, card, true, fk.ReasonPrey, temp, huimin.name)
        cards = table.filter(cards, function(id)
          return table.contains(player:getCardIds("h"), id)
        end)
      end
      temp = temp:getNextAlive()
    end
  end,
})

return huimin
