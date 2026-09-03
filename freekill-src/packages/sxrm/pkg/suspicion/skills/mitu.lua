local mitu = fk.CreateSkill {
  name = "mitu",
}

Fk:loadTranslationTable{
  ["mitu"] = "密图",
  [":mitu"] = "准备阶段，你可以令至多三名已受伤角色各摸一张牌并展示之，然后你指定另一名角色，这些角色依次可以与其拼点，赢的角色视为对没赢的角色"..
  "使用一张【杀】；这些角色中每有一名未用展示牌进行拼点的角色，你减1点体力上限。",

  ["#mitu-choose"] = "密图：令至多三名已受伤角色摸牌，然后这些角色可以与你指定的另一名角色拼点",
  ["#mitu2-choose"] = "密图：选择一名角色，这些角色可以与其拼点，赢者视为对对方使用【杀】",
  ["#mitu1-pindian"] = "密图：是否与 %dest 拼点，赢者视为对对方使用【杀】？（不用%arg拼点则 %src 减1点体力上限！）",
  ["#mitu2-pindian"] = "密图：是否与 %dest 拼点，赢者视为对对方使用【杀】？（%src 减1点体力上限！）",
  ["#mitu3-pindian"] = "密图：是否与 %dest 拼点，赢者视为对对方使用【杀】？",
}

mitu:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mitu.name) and player.phase == Player.Start and
      table.find(player.room.alive_players, function (p)
        return p:isWounded()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return p:isWounded()
    end)
    local tos = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 3,
      targets = targets,
      skill_name = mitu.name,
      prompt = "#mitu-choose",
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos
    local mapper = {}
    for _, p in ipairs(tos) do
      if not p.dead then
        local card = p:drawCards(1, mitu.name)
        if #card > 0 and table.contains(p:getCardIds("h"), card[1]) then
          mapper[p] = card[1]
          p:showCards({card[1]})
        end
      end
    end
    if player.dead then return end
    tos = table.filter(tos, function (p)
      return not p.dead
    end)
    if #tos == 0 then return end
    local targets = table.filter(room.alive_players, function (p)
      return p ~= player and not table.contains(tos, p) and
        table.find(tos, function (to)
          return to:canPindian(p)
        end)
    end)
    if #targets == 0 then return end
    local victim = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = mitu.name,
      prompt = "#mitu2-choose",
      cancelable = false,
    })[1]
    local n = 0
    for _, p in ipairs(tos) do
      if victim.dead then break end
      if not p.dead and p:canPindian(victim) then
        local prompt = "#mitu3-pindian::"..victim.id
        if not player.dead then
          if mapper[p] then
            prompt = "#mitu1-pindian:"..player.id..":"..victim.id..":"..Fk:getCardById(mapper[p]):toLogString()
          else
            prompt = "#mitu2-pindian:"..player.id..":"..victim.id
          end
        end
        if room:askToSkillInvoke(p, {
          skill_name = mitu.name,
          prompt = prompt,
        }) then
          room:doIndicate(p, {victim})
          local pindian = p:pindian({victim}, mitu.name)
          if pindian.fromCard and pindian.fromCard:getEffectiveId() ~= mapper[p] then
            n = n + 1
          end
          if pindian.results[victim].winner and not p.dead and not victim.dead then
            local from, to = p, victim
            if pindian.results[victim].winner == victim then
              from, to = victim, p
            end
            room:useVirtualCard("slash", nil, from, to, mitu.name, true)
          end
        else
          n = n + 1
        end
      end
    end
    if n > 0 and not player.dead then
      room:changeMaxHp(player, -n)
    end
  end,
})

return mitu
