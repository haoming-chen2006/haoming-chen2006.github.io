local cihuai = fk.CreateSkill {
  name = "cihuai",
}

Fk:loadTranslationTable{
  ["cihuai"] = "刺槐",
  [":cihuai"] = "出牌阶段开始时，你可以展示你的手牌，若其中没有【杀】，则你使用或打出【杀】时不需要手牌，直到你的手牌数变化或有角色死亡。",

  ["#cihuai-invoke"] = "刺槐：展示手牌，若没有【杀】，你使用或打出【杀】时不需要手牌直到手牌数变化或有角色死亡！",
  ["#cihuai"] = "刺槐：你可以视为使用或打出【杀】！",
}

cihuai:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "slash",
  prompt = "#cihuai",
  card_filter = Util.FalseFunc,
  filter_pattern = {
    min_num = 0,
    max_num = 0,
    pattern = "",
    subcards = {}
  },
  view_as = function(self, player, cards)
    local c = Fk:cloneCard("slash")
    c.skillName = cihuai.name
    return c
  end,
  enabled_at_play = function (self, player)
    return player:getMark(cihuai.name) > 0
  end,
  enabled_at_response = function (self, player)
    return player:getMark(cihuai.name) > 0
  end,
})

cihuai:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(cihuai.name) and player.phase == Player.Play and
      not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = cihuai.name,
      prompt = "#cihuai-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    local yes = table.find(player:getCardIds("h"), function (id)
      return Fk:getCardById(id).trueName == "slash"
    end)
    player:showCards(player:getCardIds("h"))
    if not yes and not player.dead and player:hasSkill(cihuai.name, true) then
      player.room:addPlayerMark(player, cihuai.name, 1)
    end
  end,
})
cihuai:addEffect(fk.AfterCardsMove, {
  can_refresh = function(self, event, target, player, data)
    if player:getMark(cihuai.name) > 0 then
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand then
              return true
            end
          end
        end
        if move.to == player and move.toArea == Card.PlayerHand then
          return true
        end
      end
    end
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:setPlayerMark(player, cihuai.name, 0)
  end,
})

cihuai:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, cihuai.name, 0)
end)

return cihuai
