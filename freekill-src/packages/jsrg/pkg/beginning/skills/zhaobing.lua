local zhaobing = fk.CreateSkill {
  name = "zhaobing",
}

Fk:loadTranslationTable{
  ["zhaobing"] = "诏兵",
  [":zhaobing"] = "结束阶段，你可以弃置全部手牌，然后令至多等量的其他角色各选择一项：1.展示并交给你一张【杀】；2.失去1点体力。",

  ["#zhaobing-invoke"] = "诏兵：你可以弃置全部手牌，令等量其他角色选择交给你一张【杀】或失去1点体力",
  ["#zhaobing-choose"] = "诏兵：选择至多%arg名其他角色，依次选择交给你一张【杀】或失去1点体力",
  ["#zhaobing-give"] = "诏兵：交给 %src 一张【杀】，否则失去1点体力",

  ["$zhaobing1"] = "此事，便依本初之言！",
  ["$zhaobing2"] = "诸侯兵马，皆听我调遣！",
}

zhaobing:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhaobing.name) and player.phase == Player.Finish and
      not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if table.find(player:getCardIds("h"), function (id)
      return not player:prohibitDiscard(id)
    end) then
      return room:askToSkillInvoke(player, {
        skill_name = zhaobing.name,
        prompt = "#zhaobing-invoke",
      })
    else
      room:askToCards(player, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = zhaobing.name,
        pattern = "false",
        prompt = "#zhaobing-invoke",
        cancelable = true,
      })
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = player:getHandcardNum()
    player:throwAllCards("h", zhaobing.name)
    if player.dead or #room:getOtherPlayers(player, false) == 0 then return end
    local targets = room:askToChoosePlayers(player, {
      targets = room:getOtherPlayers(player, false),
      min_num = 1,
      max_num = n,
      prompt = "#zhaobing-choose:::"..n,
      skill_name = zhaobing.name,
      cancelable = true,
    })
    if #targets == 0 then return end
    room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if not p.dead then
        if p:isKongcheng() or player.dead then
          room:loseHp(p, 1, zhaobing.name)
        else
          local card = room:askToCards(p, {
            min_num = 1,
            max_num = 1,
            pattern = "slash",
            prompt = "#zhaobing-give:"..player.id,
            skill_name = zhaobing.name,
            cancelable = true,
          })
          if #card > 0 then
            p:showCards(card)
            if not player.dead and table.contains(p:getCardIds("h"), card[1]) then
              room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonGive, zhaobing.name, nil, true, p)
            end
          else
            room:loseHp(p, 1, zhaobing.name)
          end
        end
      end
    end
  end,
})

return zhaobing
