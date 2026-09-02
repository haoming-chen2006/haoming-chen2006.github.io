local mingxuan = fk.CreateSkill({
  name = "mingxuan",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mingxuan"] = "暝眩",
  [":mingxuan"] = "锁定技，出牌阶段开始时，若你有牌且有未被本技能记录的其他角色，你须选择X张花色各不相同的手牌，"..
    "交给这些角色中随机X名角色各一张牌（X最大为这些角色数且至少为1)。然后依次令交给牌角色选择："..
    "1. 对你使用一张【杀】，然后你记录该角色；2. 交给你一张牌，然后你摸一张牌。",

  ["#mingxuan_tip"] = "未记录",
  ["#mingxuan-select"] = "暝眩：选择花色各不相同的手牌，随机交给没有被暝眩记录的角色",
  ["#mingxuan-slash"] = "暝眩：你可以对%src使用一张【杀】，或点取消则必须将一张一张牌交给该角色",
  ["#mingxuan-give"] = "暝眩：选择一张牌交给%src",
  ["@[player]mingxuan"] = "暝眩",

  ["$mingxuan1"] = "闻汝节行俱佳，今特设宴相请。",
  ["$mingxuan2"] = "百闻不如一见，夫人果真非凡。",
}

mingxuan:addAuxActiveSkill("#mingxuan_active", {
  can_use = Util.FalseFunc,
  target_num = 0,
  min_card_num = 1,
  max_card_num = function (self, player)
    local room = Fk:currentRoom()
    local targetRecorded = player:getTableMark("@[player]mingxuan")
    return #table.filter(room.alive_players, function (p)
      return p ~= player and not table.contains(targetRecorded, p.id)
    end)
  end,
  card_filter = function(self, player, to_select, selected)
    if #selected >= self:max_card_num(player) then return false end
    local card = Fk:getCardById(to_select)
    return table.every(selected, function (id)
      return card.suit ~= Fk:getCardById(id).suit
    end)
  end,
  target_tip = function(self, player, to_select)
    if to_select ~= player and not table.contains(player:getTableMark("@[player]mingxuan"), to_select.id) then
      return "#mingxuan_tip"
    end
  end,
})

mingxuan:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(mingxuan.name) and player.phase == Player.Play and not player:isKongcheng() then
      local targetRecorded = player:getTableMark("@[player]mingxuan")
      return table.find(player.room.alive_players, function(p)
        return p ~= player and not table.contains(targetRecorded, p.id)
      end)
    end
  end,
  on_use = function(self, event, target, player, data)
    if player:isKongcheng() then return false end
    ---@type string
    local skillName = mingxuan.name
    local room = player.room
    local targetRecorded = player:getTableMark("@[player]mingxuan")
    local targets = table.filter(room.alive_players, function (p)
      return p ~= player and not table.contains(targetRecorded, p.id)
    end)
    if #targets == 0 then return false end
    local to_give = room:tableRandomPick(player.player_cards[Player.Hand] , 1)
    local _, ret = room:askToUseActiveSkill(player, { skill_name = "#mingxuan_active", prompt = "#mingxuan-select", cancelable = false })
    if ret then
      to_give = ret.cards
    end
    local tos = room:tableRandomPick(targets, #to_give)
    local moveInfos = {}
    for i = 1, #to_give, 1 do
      table.insert(moveInfos, {
        from = player.id,
        ids = {to_give[i]},
        to = tos[i],
        toArea = Card.PlayerHand,
        moveReason = fk.ReasonGive,
        proposer = player.id,
        skillName = skillName,
        moveVisible = false
      })
    end
    room:moveCards(table.unpack(moveInfos))
    room:sortByAction(tos)
    local mark_change = false
    for _, to in ipairs(tos) do
      if player.dead then break end
      if not to.dead then
        local use = room:askToUseCard(to, {
          pattern = "slash",
          skill_name = skillName,
          prompt = "#mingxuan-slash:" .. player.id,
          cancelable = true,
          extra_data = {
            include_targets = { player.id },
            bypass_distances = true,
            bypass_times = true,
          }
        })
        if use then
          use.extraUse = true
          room:useCard(use)
          table.insertIfNeed(targetRecorded, to.id)
          mark_change = true
        else
          local card = room:askToCards(
            to,
            {
              min_num = 1,
              max_num = 1,
              include_equip = true,
              skill_name = skillName,
              cancelable = false,
              pattern = ".",
              prompt = "#mingxuan-give:" .. player.id
            }
          )
          room:obtainCard(player, card, false, fk.ReasonGive)
          if not player.dead then
            room:drawCards(player, 1, skillName)
          end
        end
      end
    end
    if not player.dead and mark_change then
      room:setPlayerMark(player, "@[player]mingxuan", targetRecorded)
    end
  end,
})

mingxuan:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "@[player]mingxuan", 0)
end)

return mingxuan
