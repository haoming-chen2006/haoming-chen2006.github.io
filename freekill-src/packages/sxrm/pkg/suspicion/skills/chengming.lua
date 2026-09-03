local chengming = fk.CreateSkill {
  name = "sx__chengming",
}

Fk:loadTranslationTable{
  ["sx__chengming"] = "承命",
  [":sx__chengming"] = "出牌阶段结束时，若你是本阶段“争嗣”角色中：手牌数最多的，你可以回复2点体力；体力值最大的，你可以获得“争嗣”角色各一张牌。",

  ["#sx__chengming-recover"] = "承命：是否回复2点体力？",
  ["#sx__chengming-prey"] = "承命：是否获得“争嗣”角色各一张牌？",
}

chengming:addEffect(fk.EventPhaseEnd, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(chengming.name) and player.phase == Player.Play and
      player:getMark("zhengsi-phase") ~= 0 then
      local targets = table.map(player:getTableMark("zhengsi-phase"), Util.Id2PlayerMapper)
      local choices = {}
      if player:isWounded() and
        table.every(targets, function (p)
          return player:getHandcardNum() >= p:getHandcardNum()
        end) then
        table.insert(choices, "recover")
      end
      if table.every(targets, function (p)
          return player.hp >= p.hp
        end) and
        table.find(targets, function (p)
          if p == player then
            return #player:getCardIds("e") > 0
          else
            return not p:isNude()
          end
        end) then
        table.insert(choices, "prey")
      end
      if #choices > 0 then
        event:setCostData(self, { choice = choices })
        return true
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local choices = event:getCostData(self).choice
    if table.contains(choices, "recover") then
      if room:askToSkillInvoke(player, {
        skill_name = chengming.name,
        prompt = "#sx__chengming-recover",
      }) then
        event:setCostData(self, {choice = "recover", choices = choices})
        return true
      end
    end
    if table.contains(choices, "prey") then
      if room:askToSkillInvoke(player, {
        skill_name = chengming.name,
        prompt = "#sx__chengming-prey",
      }) then
        local tos = table.map(player:getTableMark("zhengsi-phase"), Util.Id2PlayerMapper)
        tos = table.filter(tos, function (p)
          return not p.dead
        end)
        room:sortByAction(tos)
        event:setCostData(self, {tos = tos, choice = "prey", choices = choices})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    local tos = event:getCostData(self).tos
    if choice == "recover" then
      room:recover{
        who = player,
        num = 2,
        recoverBy = player,
        skillName = chengming.name,
      }
      if player.dead then return end
      local choices = event:getCostData(self).choices
      if #choices == 1 then return end
      tos = table.map(player:getTableMark("zhengsi-phase"), Util.Id2PlayerMapper)
      if table.find(tos, function (p)
        if p == player then
          return #player:getCardIds("e") > 0
        else
          return not p:isNude()
        end
      end) and
        room:askToSkillInvoke(player, {
          skill_name = chengming.name,
          prompt = "#sx__chengming-prey",
        }) then
        tos = table.filter(tos, function (p)
          return not p.dead
        end)
        room:sortByAction(tos)
        room:doIndicate(player, tos)
      else
        return
      end
    end
    for _, p in ipairs(tos) do
      if player.dead then return end
      if not p.dead and not p:isNude() then
        if p == player then
          if #player:getCardIds("e") > 0 then
            local id = room:askToChooseCard(player, {
              target = player,
              flag = "e",
              skill_name = chengming.name,
            })
            room:obtainCard(player, id, false, fk.ReasonPrey, player, chengming.name)
          end
        else
          local id = room:askToChooseCard(player, {
            target = p,
            flag = "he",
            skill_name = chengming.name,
          })
          room:obtainCard(player, id, false, fk.ReasonPrey, player, chengming.name)
        end
      end
    end
  end,
})

return chengming
