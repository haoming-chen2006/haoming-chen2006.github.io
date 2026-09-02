local qiaobian = fk.CreateSkill {
  name = "qiaobian",
}

Fk:loadTranslationTable{
  ["qiaobian"] = "巧变",
  [":qiaobian"] = "你的阶段开始前（准备阶段和结束阶段除外），你可以弃置一张手牌跳过该阶段。若以此法跳过摸牌阶段，"..
  "你可以获得至多两名其他角色的各一张手牌；若以此法跳过出牌阶段，你可以将场上的一张牌移动至另一名角色相应的区域内。",

  ["#qiaobian-invoke"] = "巧变：你可以弃一张手牌，跳过 %arg",
  ["#qiaobian-choose"] = "巧变：你可以获得至多两名角色各一张手牌",
  ["#qiaobian-move"] = "巧变：请选择两名角色，移动场上的一张牌",

  ["$qiaobian1"] = "兵无常势，水无常形。",
  ["$qiaobian2"] = "用兵之道，变化万千。",
}

qiaobian:addEffect(fk.EventPhaseChanging, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiaobian.name) and not player:isKongcheng() and not data.skipped and
      data.phase > Player.Start and data.phase < Player.Finish
  end,
  on_cost = function(self, event, target, player, data)
    local card =  player.room:askToDiscard(player, {
      skill_name = qiaobian.name,
      cancelable = true,
      min_num = 1,
      max_num = 1,
      include_equip = false,
      prompt = "#qiaobian-invoke:::"..Util.PhaseStrMapper(data.phase),
      skip = true
    })
    if #card > 0 then
      event:setCostData(self, {cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data.skipped = true
    room:throwCard(event:getCostData(self).cards, qiaobian.name, player, player)
    if player.dead then return end
    if data.phase == Player.Draw then
      local targets = table.filter(room:getOtherPlayers(player, false), function(p)
        return not p:isKongcheng()
      end)
      if #targets > 0 then
        local tos = room:askToChoosePlayers(player, {
          min_num = 1,
          max_num = 2,
          targets = targets,
          skill_name = qiaobian.name,
          prompt = "#qiaobian-choose",
          cancelable = true,
        })
        if #tos > 0 then
          room:sortByAction(tos)
          for _, p in ipairs(tos) do
            if player.dead then return end
            if not p:isKongcheng() then
              local card_id = room:askToChooseCard(player, {
                skill_name = qiaobian.name,
                target = p,
                flag = "h",
              })
              room:obtainCard(player, card_id, false, fk.ReasonPrey, player, qiaobian.name)
            end
          end
        end
      end
    elseif data.phase == Player.Play then
      local targets = room:askToChooseToMoveCardInBoard(player, {
        prompt = "#qiaobian-move",
        skill_name = qiaobian.name,
        cancelable = true,
      })
      if #targets == 2 then
        room:askToMoveCardInBoard(player, {
          target_one = targets[1],
          target_two = targets[2],
          skill_name = qiaobian.name,
        })
      end
    end
  end,
})

return qiaobian
