local ruzong = fk.CreateSkill {
  name = "ruzong",
}

Fk:loadTranslationTable{
  ["ruzong"] = "儒宗",
  [":ruzong"] = "回合结束时，若你本回合使用牌指定过的目标角色均为同一角色，则你可以将手牌数摸至与其相同（至多摸五张），若该目标为你，"..
  "则改为你可以令任意名其他角色将手牌数摸至与你相同。",

  ["#ruzong-invoke"] = "儒宗：你可以将手牌数摸至与 %dest 相同",
  ["#ruzong-choose"] = "儒宗：你可以令任意名其他角色将手牌数摸至与你相同",
}

ruzong:addEffect(fk.TurnEnd, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(ruzong.name) then
      local to
      if #player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        if use.from == player then
          if #use.tos > 1 then
            return true
          elseif #use.tos == 1 then
            if to ~= nil then
              if to ~= use.tos[1] then
                return true
              end
            else
              to = use.tos[1]
            end
          end
        end
      end, Player.HistoryTurn) > 0 then
        return
      end
      if to and not to.dead then
        if to == player then
          event:setCostData(self, {tos = {player}})
          return table.find(player.room:getOtherPlayers(player, false), function (p)
            return p:getHandcardNum() < player:getHandcardNum()
          end)
        elseif to:getHandcardNum() > player:getHandcardNum() then
          event:setCostData(self, {tos = {to}})
          return true
        end
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    if to ~= player then
      if room:askToSkillInvoke(player, {
          skill_name = ruzong.name,
          prompt = "#ruzong-invoke::"..to.id
        })
      then
        event:setCostData(self, {tos = {to}, choice = "draw"})
        return true
      end
    else
      local targets = table.filter(room:getOtherPlayers(player, false), function (p)
        return p:getHandcardNum() < player:getHandcardNum()
      end)
      local tos = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = #targets,
        prompt = "#ruzong-choose",
        skill_name = ruzong.name,
      })
      if #tos > 0 then
        room:sortByAction(tos)
        event:setCostData(self, {tos = tos, choice = "give"})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    if event:getCostData(self).choice == "draw" then
      local to = event:getCostData(self).tos[1]
      if to:getHandcardNum() > player:getHandcardNum() then
        player:drawCards(math.min(to:getHandcardNum() - player:getHandcardNum(), 5), ruzong.name)
      end
    else
      for _, p in ipairs(event:getCostData(self).tos) do
        if player:getHandcardNum() > p:getHandcardNum() and not p.dead then
          p:drawCards(player:getHandcardNum() - p:getHandcardNum(), ruzong.name)
        end
      end
    end
  end,
})

return ruzong
