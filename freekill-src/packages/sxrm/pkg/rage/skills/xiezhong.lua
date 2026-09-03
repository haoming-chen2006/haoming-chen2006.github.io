
local xiezhong = fk.CreateSkill {
  name = "xiezhong",
}

Fk:loadTranslationTable{
  ["xiezhong"] = "挟众",
  [":xiezhong"] = "准备阶段，你可以令场上半数角色（向上取整）依次选择并执行一项：1.摸两张牌，失去1点体力；2.将两张牌当【杀】使用；"..
  "然后你可以令另一名角色执行两次被选择较多的一项。",

  ["#xiezhong-choose"] = "挟众：你可以令%arg名角色依次选择一项",
  ["#xiezhong-choice"] = "挟众：将两张牌当【杀】使用，或点“取消”摸两张牌，失去1点体力",
  ["#xiezhong-ask"] = "挟众：你可以令一名角色执行两次 %arg",
  ["xiezhong_draw"] = "摸两张牌，失去1点体力",
  ["xiezhong_slash"] = "将两张牌当【杀】使用",
  ["#xiezhong-slash"] = "挟众：请将两张牌当【杀】使用",
}

xiezhong:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xiezhong.name) and player.phase == Player.Start
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local n = (#room.alive_players + 1) // 2
    local tos = room:askToChoosePlayers(player, {
      targets = room.alive_players,
      min_num = n,
      max_num = n,
      prompt = "#xiezhong-choose:::"..n,
      skill_name = xiezhong.name,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local tos = event:getCostData(self).tos or {}
    local n1, n2 = 0, 0
    for _, p in ipairs(tos) do
      if not p.dead then
        if room:askToUseVirtualCard(p, {
          name = "slash",
          skill_name = xiezhong.name,
          prompt = "#xiezhong-choice",
          cancelable = true,
          card_filter = {
            n = 2,
          },
        }) then
          n2 = n2 + 1
        else
          n1 = n1 + 1
          p:drawCards(2, xiezhong.name)
          if not p.dead then
            room:loseHp(p, 1, xiezhong.name)
          end
        end
      end
    end
    if n1 ~= n2 and not player.dead then
      local targets = table.filter(room.alive_players, function (p)
        return not table.contains(tos, p)
      end)
      if #targets == 0 then return end
      local to = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#xiezhong-ask:::"..(n1 > n2 and "xiezhong_draw" or "xiezhong_slash" ),
        skill_name = xiezhong.name,
        cancelable = true,
      })
      if #to > 0 then
        to = to[1]
        for _ = 1, 2 do
          if to.dead then return end
          if n1 > n2 then
            to:drawCards(2, xiezhong.name)
            if not to.dead then
              room:loseHp(to, 1, xiezhong.name)
            end
          else
            room:askToUseVirtualCard(to, {
              name = "slash",
              skill_name = xiezhong.name,
              prompt = "#xiezhong-slash",
              cancelable = false,
              card_filter = {
                n = 2,
              },
            })
          end
        end
      end
    end
  end,
})

return xiezhong
